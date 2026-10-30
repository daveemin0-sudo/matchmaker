/* Voice-note-independent fixes from 30 Oct: repeat notifications, sample-profile detection,
   and push delivery reporting (test notification, incoming-call result). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHarness } = require('./helpers/backend-harness');

const app = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const slice = (from, to) => { const a = app.indexOf(from); const b = app.indexOf(to, a); assert.ok(a >= 0 && b > a, from); return app.slice(a, b); };

function sandbox(extra = '') {
  const mem = new Map();
  const ctx = { localStorage: { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) }, JSON, Math, Number, String, Object };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(extra, ctx);
  return { ctx, mem };
}

test('a message already announced is not announced again after the app restarts', () => {
  const code = slice("const NOTIFIED_KEY = 'hmbs_notified_v1';", 'function triggerSystemNotification(');
  const { ctx, mem } = sandbox(code);
  assert.equal(ctx.wasAlreadyNotified('chat1', 1000, 'Hey'), false, 'first time: announce');
  ctx.markNotified('chat1', 1000, 'Hey');
  // "Restart": fresh code, same stored ledger.
  const again = sandbox(code); again.mem.set('hmbs_notified_v1', mem.get('hmbs_notified_v1'));
  assert.equal(again.ctx.wasAlreadyNotified('chat1', 1000, 'Hey'), true, 'same message after restart: silent');
  assert.equal(again.ctx.wasAlreadyNotified('chat1', 2000, 'New one'), false, 'a newer message is announced');
  assert.equal(again.ctx.wasAlreadyNotified('chat2', 1000, 'Hey'), false, 'other chats unaffected');
  assert.equal(again.ctx.wasAlreadyNotified('chat1', 0, 'Hey'), true, 'no timestamp: matched by text');
});

test('the matches listener only announces messages it has not announced before', () => {
  const block = slice('if (m.lastMessage && m.lastSender && fbAuth?.currentUser', 'window._initialMatchesLoaded = true;');
  assert.match(block, /if \(!isViewing && !wasAlreadyNotified\(m\.id, /);
  assert.match(block, /markNotified\(m\.id, /);
});

test('only the built-in sample profiles count as samples; real ids starting with "p" are real', () => {
  const code = slice('const DUMMY_USER_IDS', 'window.isSampleProfileId');
  const { ctx } = sandbox(code + '\nvar PROFILES_DATA = [{ id: "p1" }, { id: "realOne", isRealUser: true }];');
  for (const id of ['p1', 'p5', 'pm2', 's3', 'samantha', 'demo_guest_1', '', null]) assert.equal(ctx.isSampleProfileId(id), true, String(id));
  for (const id of ['pQ7xZk2LmN9aBcDeFgHiJkLmNo12', 'plain28charFirebaseUidXYZ12', 'abc', 'realOne']) assert.equal(ctx.isSampleProfileId(id), false, id);
  assert.doesNotMatch(app, /startsWith\('p'\)/, 'the old first-letter guess is gone everywhere');
});

const h = createHarness({ port: 3202 });
const { store, state } = h;
function asUser(uid) {
  state.idTokens['tok_' + uid] = { uid, email: `${uid}@example.com` };
  state.authUsers[uid] = { uid, email: `${uid}@example.com`, disabled: false };
  return { Authorization: 'Bearer tok_' + uid };
}
test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

test('"Send test notification" reports a phone that never registered', async () => {
  const r = await h.request('POST', '/fcm/test', {}, asUser('ada'));
  assert.equal(r.status, 200);
  assert.deepEqual({ devices: r.json.devices, sent: r.json.sent }, { devices: 0, sent: 0 });
  assert.equal(state.pushes.length, 0);
});

test('"Send test notification" pushes to the caller\'s own devices and reports success or the error', async () => {
  store.set('fcm_tokens/ada/tokens/t1', { token: 'tok-device-1' });
  const ok = await h.request('POST', '/fcm/test', {}, asUser('ada'));
  assert.deepEqual({ devices: ok.json.devices, sent: ok.json.sent, failed: ok.json.failed }, { devices: 1, sent: 1, failed: 0 });
  assert.deepEqual(state.pushes[0].tokens, ['tok-device-1']);
  state.pushFail = 'messaging/registration-token-not-registered';
  const bad = await h.request('POST', '/fcm/test', {}, asUser('ada'));
  assert.equal(bad.json.sent, 0);
  assert.deepEqual(bad.json.errors, ['messaging/registration-token-not-registered']);
  assert.equal(store.has('fcm_tokens/ada/tokens/t1'), false, 'dead device token removed');
});

test('an incoming-call push tells the caller whether the other person has a device registered', async () => {
  store.set('matches/ada_ben', { users: ['ada', 'ben'] });
  store.set('users/ada', { name: 'Ada' });
  const none = await h.request('POST', '/fcm/incoming-call', { toUserId: 'ben', matchId: 'ada_ben', callId: 'c1', callType: 'video' }, asUser('ada'));
  assert.equal(none.status, 200);
  assert.deepEqual({ devices: none.json.devices, delivered: none.json.delivered }, { devices: 0, delivered: false });
  store.set('fcm_tokens/ben/tokens/t1', { token: 'ben-phone' });
  const yes = await h.request('POST', '/fcm/incoming-call', { toUserId: 'ben', matchId: 'ada_ben', callId: 'c2', callType: 'video' }, asUser('ada'));
  assert.deepEqual({ devices: yes.json.devices, delivered: yes.json.delivered }, { devices: 1, delivered: true });
  const push = state.pushes.at(-1);
  assert.equal(push.data.type, 'incoming_call');
  assert.equal(push.data.callType, 'video');
  assert.equal(push.webpush.headers.Urgency, 'high');
  assert.equal(push.webpush.notification.requireInteraction, true, 'stays on screen until answered');
});
