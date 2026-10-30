/* Suspicious-activity logging and alerting, exercised through the real routes. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./helpers/backend-harness');

const h = createHarness({ port: 3200, env: { PAYSTACK_SECRET_KEY: 'sk_test_monitoring', SECURITY_LOG_SALT: 'test-salt', CLEANUP_SECRET: 'cleanup-test-secret' } });
const { store, state } = h;
const settle = () => new Promise(r => setTimeout(r, 30)); // event writes are fire-and-forget

function asUser(uid, extra = {}) {
  state.idTokens['tok_' + uid] = { uid, email: `${uid}@example.com` };
  state.authUsers[uid] = { uid, email: `${uid}@example.com`, disabled: false, ...extra };
  return { Authorization: 'Bearer tok_' + uid };
}
const docs = (col, type) => [...store.entries()]
  .filter(([k]) => k.startsWith(col + '/') && !k.slice(col.length + 1).includes('/'))
  .map(([, v]) => v).filter(v => !type || v.type === type);

test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

test('a request with a bad sign-in token is logged, with the IP only as a salted hash', async () => {
  const r = await h.request('GET', '/profiles/me', undefined, { Authorization: 'Bearer not-a-token' });
  assert.equal(r.status, 401);
  await settle();
  const [e] = docs('security_events', 'unauthenticated');
  assert.ok(e, 'event recorded');
  assert.equal(e.path, '/profiles/me');
  assert.match(e.ipHash, /^[a-f0-9]{16}$/);
  assert.ok(e.expiresAt && e.expiresAt.toMillis() > Date.now() + 29 * 864e5, '30-day retention');
  assert.doesNotMatch(JSON.stringify([...store.values()]), /127\.0\.0\.1|::1|::ffff/, 'raw IP never stored');
});

test('a burst of bad tokens raises exactly one alert, and event writes are capped', async () => {
  for (let i = 0; i < 45; i++) await h.request('GET', '/profiles/me', undefined, { Authorization: 'Bearer bad' + i });
  await settle();
  const alerts = docs('security_alerts', 'unauthenticated');
  assert.equal(alerts.length, 1, 'one alert per burst, not one per request');
  assert.equal(alerts[0].status, 'open');
  assert.match(alerts[0].summary, /^30 × unauthenticated/);
  assert.ok(docs('security_events', 'unauthenticated').length <= 5, 'Firestore writes capped per key');
});

test('a non-admin calling an admin route raises a high alert immediately', async () => {
  store.set('users/mallory', { role: 'user' });
  const r = await h.request('GET', '/admin/reports?status=open', undefined, asUser('mallory'));
  assert.equal(r.status, 403);
  await settle();
  const [a] = docs('security_alerts', 'admin_denied');
  assert.equal(a.severity, 'high');
  assert.equal(a.uid, 'mallory');
  assert.equal(docs('security_events', 'forbidden').length, 0, 'not double-counted');
});

test('repeated wrong SMS codes for one number raise an alert', async () => {
  const phone = '+2348012345678';
  store.set('otp_requests/' + crypto.createHash('sha256').update(phone).digest('hex'), { pinId: 'pin1', expiresAt: { toMillis: () => Date.now() + 60000 } });
  state.paystackVerifyResponse = { verified: false }; // the harness's node-fetch stub answers Termii too
  for (let i = 0; i < 5; i++) {
    const r = await h.request('POST', '/auth/verify-otp', { phone, otp: '12345' + i });
    assert.equal(r.status, 400);
  }
  await settle();
  const [a] = docs('security_alerts', 'otp_verify_failed');
  assert.ok(a, 'alert raised');
  assert.match(a.targetHash, /^[a-f0-9]{16}$/);
  assert.doesNotMatch(JSON.stringify(a), /8012345678/, 'phone number not stored');
});

test('forged Paystack webhooks raise an alert; without a key the webhook refuses everything', async () => {
  for (let i = 0; i < 3; i++) {
    const r = await h.request('POST', '/webhook/paystack', { event: 'charge.success' }, { 'x-paystack-signature': 'f'.repeat(128) });
    assert.equal(r.status, 401);
  }
  await settle();
  assert.equal(docs('security_alerts', 'webhook_bad_signature')[0].severity, 'high');
  const server = fs.readFileSync(path.join(__dirname, '..', 'webhook-server', 'index.js'), 'utf8');
  assert.match(server, /if \(!PAYSTACK_SECRET_KEY\) return res\.status\(503\)/);
});

test('uploads must really be the type they claim: SVG and disguised HTML are rejected and logged', async () => {
  const me = asUser('ada');
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>').toString('base64');
  const html = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
  const jpeg = Buffer.concat([Buffer.from('ffd8ffe000104a464946000101', 'hex'), Buffer.alloc(32)]).toString('base64');
  const up = (data, type) => h.request('POST', '/media/upload', { dataBase64: data, contentType: type, path: 'stories' }, me);
  assert.equal((await up(svg, 'image/svg+xml')).status, 400);
  assert.equal((await up(html, 'image/jpeg')).status, 400);
  assert.equal((await up(jpeg, 'video/mp4')).status, 400, 'a JPEG is not a video');
  assert.equal((await up(jpeg, 'image/jpeg')).status, 200);
  await settle();
  const reasons = docs('security_events', 'upload_rejected').map(e => e.detail.reason);
  assert.deepEqual(reasons, ['content', 'content', 'content']);
});

test('three reports against the same person in a day raise a moderation alert', async () => {
  store.set('users/target', { name: 'Target' });
  for (const reporter of ['r1', 'r2', 'r3']) {
    const r = await h.request('POST', '/reports', { reportedUserId: 'target', reason: 'harassment' }, asUser(reporter));
    assert.equal(r.status, 200);
  }
  await settle();
  const [a] = docs('security_alerts', 'user_reported');
  assert.ok(a);
  assert.equal(a.detail.reportedUserId, 'target');
});

test('admins can read alerts and events, and acknowledge an alert; others cannot', async () => {
  store.set('users/boss', { role: 'admin' });
  // A user who hasn't triggered this alert yet: alerts are deduplicated per user and hour.
  store.set('users/eve', { role: 'user' });
  await h.request('GET', '/admin/reports', undefined, asUser('eve')); // raises an admin_denied alert
  await settle();
  const r = await h.request('GET', '/admin/security?minSeverity=low', undefined, asUser('boss'));
  assert.equal(r.status, 200);
  const alert = r.json.alerts.find(a => a.type === 'admin_denied');
  assert.ok(alert, 'alert listed');
  assert.ok(r.json.events.some(e => e.type === 'admin_denied'));
  const ack = await h.request('POST', '/admin/security/alerts/ack', { alertId: alert.id }, asUser('boss'));
  assert.equal(ack.status, 200);
  assert.equal(store.get('security_alerts/' + alert.id).status, 'acknowledged');
  assert.equal((await h.request('GET', '/admin/security', undefined, asUser('eve'))).status, 403);
  assert.equal((await h.request('POST', '/admin/security/alerts/ack', { alertId: 'x' }, asUser('boss'))).status, 400);
});

test('admin actions are an uncapped audit trail', async () => {
  store.set('users/boss', { role: 'admin' });
  const boss = asUser('boss');
  for (let i = 0; i < 7; i++) {
    store.set('users/u' + i, { name: 'U' + i });
    state.authUsers['u' + i] = { uid: 'u' + i, disabled: false };
    assert.equal((await h.request('POST', '/admin/users/suspend', { userId: 'u' + i, reason: 'spam' }, boss)).status, 200);
  }
  await settle();
  const actions = docs('security_events', 'admin_action').filter(e => e.detail.action === 'suspend_user');
  assert.equal(actions.length, 7);
  assert.deepEqual(actions.map(e => e.detail.targetUid).sort(), ['u0', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6']);
});

test('the admin page shows alerts and events, escaping everything it renders', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
  assert.match(html, /api\("\/admin\/security\?minSeverity="/);
  const renderer = html.slice(html.indexOf('async function loadSecurity'), html.indexOf('alertsBody.addEventListener'));
  const interpolations = renderer.match(/' \+ (?!escapeHtml|sevPill)[^']+ \+ '/g) || [];
  assert.deepEqual(interpolations, [], 'every value goes through escapeHtml');
});

test('the scheduled cleanup deletes security records older than 30 days and keeps newer ones', async () => {
  const ts = (ms) => ({ toMillis: () => ms });
  store.set('security_events/old', { type: 'unauthenticated', expiresAt: ts(Date.now() - 1000) });
  store.set('security_events/new', { type: 'unauthenticated', expiresAt: ts(Date.now() + 864e5) });
  store.set('security_alerts/old', { type: 'admin_denied', expiresAt: ts(Date.now() - 1000) });
  const denied = await h.request('POST', '/stories/cleanup', {}, { 'x-cleanup-secret': 'wrong' });
  assert.equal(denied.status, 401);
  const r = await h.request('POST', '/stories/cleanup', {}, { 'x-cleanup-secret': 'cleanup-test-secret' });
  assert.equal(r.status, 200);
  assert.equal(r.json.securityDeleted, 2);
  assert.ok(!store.has('security_events/old') && !store.has('security_alerts/old'));
  assert.ok(store.has('security_events/new'));
});

test('the scheduled workflow calls the real cleanup URL and waits for a sleeping server', () => {
  const wf = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'production-ops.yml'), 'utf8');
  assert.match(wf, /CLEANUP_URL: https:\/\/matchmaker-viwb\.onrender\.com\/stories\/cleanup/);
  assert.doesNotMatch(wf, /secrets\.CLEANUP_URL/);
  assert.match(wf, /--max-time 90 --retry 3/);
});
