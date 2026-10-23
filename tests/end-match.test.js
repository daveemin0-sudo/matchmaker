/* POST /matches/end: clear chat, delete chat and unmatch actually happen on the server. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./helpers/backend-harness');

const h = createHarness({ port: 3198 });
const { store, state } = h;
const M = 'alice_bob';

function asUser(uid) {
  state.idTokens['tok_' + uid] = { uid, email: `${uid}@example.com` };
  state.authUsers[uid] = { uid, email: `${uid}@example.com`, disabled: false };
  return { Authorization: 'Bearer tok_' + uid };
}
function seedConversation() {
  store.set(`matches/${M}`, { users: ['alice', 'bob'], lastMessage: 'hey' });
  store.set(`matches/${M}/messages/m1`, { sender: 'alice', text: 'hi' });
  store.set(`matches/${M}/messages/m2`, { sender: 'bob', text: 'hello' });
  store.set(`matches/${M}/calls/c1`, { callerId: 'alice', calleeId: 'bob' });
  store.set(`matches/${M}/calls/c1/candidates/x`, { candidate: {} });
  store.set('matches/alice_carol', { users: ['alice', 'carol'] });
  store.set('matches/alice_carol/messages/k', { sender: 'carol', text: 'other chat' });
}
const end = (uid, body) => h.request('POST', '/matches/end', body, asUser(uid));
const keys = (prefix) => [...store.keys()].filter(k => k.startsWith(prefix));

test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

test('clear removes both people\'s messages and keeps the match', async () => {
  seedConversation();
  const r = await end('bob', { partnerId: 'alice', action: 'clear' });
  assert.equal(r.status, 200);
  assert.deepEqual(keys(`matches/${M}/messages/`), []);
  assert.ok(store.has(`matches/${M}`));
  assert.equal(store.get(`matches/${M}`).lastMessage, '');
  assert.ok(store.has('matches/alice_carol/messages/k'), 'other conversations untouched');
});

test('delete removes the match and everything under it, for both people', async () => {
  seedConversation();
  assert.equal((await end('alice', { partnerId: 'bob', action: 'delete' })).status, 200);
  assert.deepEqual(keys(`matches/${M}`), []);
  assert.equal(store.has('blocks/alice_bob'), false, 'deleting a chat is not a block');
  assert.ok(store.has('matches/alice_carol'));
});

test('unmatch deletes the conversation and records an unmatch block', async () => {
  seedConversation();
  assert.equal((await end('alice', { partnerId: 'bob', action: 'unmatch' })).status, 200);
  assert.deepEqual(keys(`matches/${M}`), []);
  assert.deepEqual({ ...store.get('blocks/alice_bob'), createdAt: undefined }, { blockedBy: 'alice', blockedUserId: 'bob', kind: 'unmatch', createdAt: undefined });
  assert.equal(store.get('swipes/alice_bob').action, 'pass');
});

test('an unmatched person disappears from Discovery and search, both ways', async () => {
  for (const u of ['alice', 'bob']) store.set('public_profiles/' + u, { id: u, displayName: u === 'alice' ? 'Alice A' : 'Bob B', searchKeys: [u.slice(0, 2), u], age: 25, image: 'https://e/p.jpg', active: true });
  await end('alice', { partnerId: 'bob', action: 'unmatch' });
  const disc = await h.request('GET', '/discovery', undefined, asUser('bob'));
  assert.ok(!disc.json.users.some(u => u.id === 'alice'));
  const search = await h.request('GET', '/profiles/search?q=bob', undefined, asUser('alice'));
  assert.deepEqual(search.json.users, []);
});

test('rejects bad input and requires sign-in', async () => {
  assert.equal((await end('alice', { partnerId: 'alice', action: 'delete' })).status, 400);
  assert.equal((await end('alice', { partnerId: 'bob', action: 'nuke' })).status, 400);
  assert.equal((await end('alice', { partnerId: 'bob/../x', action: 'clear' })).status, 400);
  assert.equal((await end('alice', { partnerId: 'bob_carol', action: 'clear' })).status, 400);
  assert.equal((await h.request('POST', '/matches/end', { partnerId: 'bob', action: 'clear' }, {})).status, 401);
});

test('a user can only end their own conversations (match id is derived from the caller)', async () => {
  seedConversation();
  await end('mallory', { partnerId: 'alice', action: 'delete' });
  assert.ok(store.has(`matches/${M}/messages/m1`), 'alice_bob untouched by a third party');
});

test('client: unmatch waits for the server and the client no longer deletes the match itself', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
  const fn = app.slice(app.indexOf('async function confirmUnmatch()'), app.indexOf('window.confirmUnmatch'));
  assert.match(fn, /await endMatchOnServer\(partnerId, 'unmatch'\)/);
  assert.match(fn, /if \(!ok\) \{[\s\S]{0,160}return;/);
  assert.doesNotMatch(fn, /collection\('matches'\)\.doc\(matchId\)\.delete/);
  const del = app.slice(app.indexOf('async function deleteConversation('), app.indexOf('async function deleteConversation(') + 1500);
  assert.match(del, /endMatchOnServer\(partnerId, 'delete'\)/);
});
