/* GET /discovery applies preferences on the server and pages past the first 200 profiles. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./helpers/backend-harness');

const h = createHarness({ port: 3199 });
const { store, state } = h;

function asUser(uid) {
  state.idTokens['tok_' + uid] = { uid, email: `${uid}@example.com` };
  state.authUsers[uid] = { uid, email: `${uid}@example.com`, disabled: false };
  return { Authorization: 'Bearer tok_' + uid };
}
const pad = (n) => String(n).padStart(4, '0');
function profile(id, extra = {}) {
  store.set('public_profiles/' + id, { id, displayName: id, age: 27, gender: 'Female', image: 'https://e/p.jpg', active: true, ...extra });
}
const discover = (uid, qs = '') => h.request('GET', '/discovery?' + qs, undefined, asUser(uid));

test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

test('people beyond the first 200 profiles are still reachable once those are swiped', async () => {
  for (let i = 0; i < 260; i++) profile('u' + pad(i));
  for (let i = 0; i < 230; i++) store.set(`swipes/s${i}`, { fromUserId: 'me', toUserId: 'u' + pad(i), action: 'pass' });
  const r = await discover('me', 'limit=60');
  assert.equal(r.status, 200);
  assert.equal(r.json.users.length, 30, 'the 30 unswiped people after the first 200');
  assert.ok(r.json.users.every(u => Number(u.id.slice(1)) >= 230));
});

test('gender preference is applied on the server (from the query or the saved profile)', async () => {
  for (let i = 0; i < 5; i++) profile('w' + i, { gender: 'Female' });
  for (let i = 0; i < 5; i++) profile('m' + i, { gender: 'Male' });
  profile('n0', { gender: '' }); // no gender stated: shown to everyone, as before
  const men = await discover('me', 'interestedIn=Men');
  assert.deepEqual(men.json.users.map(u => u.id).sort(), ['m0', 'm1', 'm2', 'm3', 'm4', 'n0']);
  store.set('users/me2', { interestedIn: 'Women' });
  const women = await discover('me2');
  assert.deepEqual(women.json.users.map(u => u.id).sort(), ['n0', 'w0', 'w1', 'w2', 'w3', 'w4']);
  const all = await discover('me3', 'interestedIn=Everyone');
  assert.equal(all.json.users.length, 11);
});

test('age range is applied on the server and clamped to adults', async () => {
  for (const a of [18, 22, 30, 45, 61]) profile('a' + a, { age: a });
  const r = await discover('me', 'minAge=21&maxAge=45');
  assert.deepEqual(r.json.users.map(u => u.age).sort((x, y) => x - y), [22, 30, 45]);
  const bad = await discover('me', 'minAge=5&maxAge=3');
  assert.ok(bad.json.users.every(u => u.age >= 18), 'never below 18');
});

test('reads are bounded: at most 5 pages of profiles per request', async () => {
  for (let i = 0; i < 1400; i++) profile('x' + pad(i), { gender: 'Male' });
  state.queryReads = 0;
  const r = await discover('me', 'interestedIn=Women');
  assert.deepEqual(r.json.users, []);
  assert.ok(state.queryReads <= 3 + 5, `profile queries bounded (got ${state.queryReads} queries)`);
});

test('the client sends preferences and refetches when they change', () => {
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'firebase-config.js'), 'utf8');
  assert.match(cfg, /params\.set\('interestedIn'/);
  assert.match(cfg, /params\.set\('minAge'/);
  const app = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
  const apply = app.slice(app.indexOf('function applyDiscoveryFiltersAndClose'), app.indexOf('window.applyDiscoveryFiltersAndClose'));
  assert.match(apply, /loadProfilesForDiscovery\(\)/);
  const reset = app.slice(app.indexOf('function resetDiscoveryFilters'), app.indexOf('window.resetDiscoveryFilters'));
  assert.match(reset, /loadProfilesForDiscovery\(\)/);
});
