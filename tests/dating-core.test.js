/* Behavioural tests for the core dating routes in webhook-server/index.js:
 * POST /swipes/record (matching, block + daily-limit enforcement) and
 * POST /reports (every reason the UI can send, reporter recorded, auto-block).
 * Real server file; firebase-admin / node-fetch stubbed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./helpers/backend-harness');

const h = createHarness({ port: 3189 });
const { store, state } = h;

function asUser(uid, extra = {}) {
  state.idTokens['tok_' + uid] = { uid, email: uid + '@example.com' };
  state.authUsers[uid] = { uid, email: uid + '@example.com', disabled: false };
  store.set('users/' + uid, { displayName: uid.toUpperCase(), ...extra });
  return { Authorization: 'Bearer tok_' + uid };
}
const swipe = (auth, targetUserId, action = 'like') => h.request('POST', '/swipes/record', { targetUserId, action }, auth);
const lagosDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const swipesBy = (uid) => [...store.entries()].filter(([k, v]) => k.startsWith('swipes/') && v.fromUserId === uid);

test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

test('swipe requires authentication and a valid action/target', async () => {
  assert.equal((await h.request('POST', '/swipes/record', { targetUserId: 'b', action: 'like' })).status, 401);
  const a = asUser('a'); asUser('b');
  assert.equal((await swipe(a, 'b', 'sideways')).status, 400);
  assert.equal((await swipe(a, 'a', 'like')).status, 400, 'cannot swipe yourself');
  assert.equal((await swipe(a, 'ghost', 'like')).status, 404, 'unknown target');
});

test('a one-sided like records the swipe but does not create a match', async () => {
  const a = asUser('a'); asUser('b');
  const res = await swipe(a, 'b', 'like');
  assert.equal(res.status, 200);
  assert.equal(res.json.matched, false);
  assert.equal(swipesBy('a').length, 1);
  assert.equal(store.has('matches/a_b'), false);
});

test('a mutual like creates exactly one match document with both users', async () => {
  const a = asUser('a'); const b = asUser('b');
  await swipe(a, 'b', 'like');
  const res = await swipe(b, 'a', 'superlike');
  assert.equal(res.json.matched, true);
  assert.equal(res.json.matchId, 'a_b');
  assert.deepEqual([...store.get('matches/a_b').users].sort(), ['a', 'b']);
  // liking again must not blow up on the existing match
  const again = await swipe(a, 'b', 'like');
  assert.equal(again.status, 200);
});

test('a pass never produces a match even if the other side liked', async () => {
  const a = asUser('a'); const b = asUser('b');
  await swipe(a, 'b', 'like');
  const res = await swipe(b, 'a', 'pass');
  assert.equal(res.json.matched, false);
  assert.equal(store.has('matches/a_b'), false);
});

test('blocked users cannot swipe on each other, in either direction', async () => {
  const a = asUser('a'); const b = asUser('b');
  store.set('blocks/a_b', { blockedBy: 'a', blockedUserId: 'b' });
  assert.equal((await swipe(a, 'b')).status, 403);
  assert.equal((await swipe(b, 'a')).status, 403);
  assert.equal(swipesBy('a').length + swipesBy('b').length, 0);
});

test('free accounts hit the daily swipe cap; active VIP accounts do not', async () => {
  const free = asUser('free'); asUser('t1');
  store.set(`swipe_daily/free_${lagosDay()}`, { uid: 'free', count: 100 });
  const limited = await swipe(free, 't1');
  assert.equal(limited.status, 429);
  assert.equal(limited.json.limited, true);

  const vip = asUser('vip', { isVip: true, vipExpiry: { toDate: () => new Date(Date.now() + 86400000) } });
  store.set(`swipe_daily/vip_${lagosDay()}`, { uid: 'vip', count: 5000 });
  assert.equal((await swipe(vip, 't1')).status, 200);

  const lapsed = asUser('lapsed', { isVip: true, vipExpiry: { toDate: () => new Date(Date.now() - 1000) } });
  store.set(`swipe_daily/lapsed_${lagosDay()}`, { uid: 'lapsed', count: 100 });
  assert.equal((await swipe(lapsed, 't1')).status, 429, 'an expired VIP is a free account again');
});

// ---------- reports ----------
test('every reason the report sheet can send is accepted, records the reporter, and blocks the reported user', async () => {
  const reasons = ['inappropriate', 'spam', 'fake', 'harassment', 'other'];
  for (const reason of reasons) {
    h.reset();
    const a = asUser('a'); asUser('b', { displayName: 'Bola' });
    const res = await h.request('POST', '/reports', { reportedUserId: 'b', reason }, a);
    assert.equal(res.status, 200, `reason "${reason}" must be accepted`);
    const report = [...store.entries()].find(([k]) => k.startsWith('reports/'))[1];
    assert.equal(report.reportedBy, 'a', 'admin dashboard reads reportedBy');
    assert.equal(report.reportedUserName, 'Bola');
    assert.equal(report.reason, reason);
    assert.equal(report.status, 'open');
    assert.ok(store.has('blocks/a_b'), 'reporting also blocks');
  }
});

test('invalid reports are rejected: unknown reason, self-report, missing or unknown target', async () => {
  const a = asUser('a'); asUser('b');
  assert.equal((await h.request('POST', '/reports', { reportedUserId: 'b', reason: 'because' }, a)).status, 400);
  assert.equal((await h.request('POST', '/reports', { reportedUserId: 'a', reason: 'spam' }, a)).status, 400);
  assert.equal((await h.request('POST', '/reports', { reason: 'spam' }, a)).status, 400);
  assert.equal((await h.request('POST', '/reports', { reportedUserId: 'nobody', reason: 'spam' }, a)).status, 404);
  assert.equal([...store.keys()].some((k) => k.startsWith('reports/')), false);
});
