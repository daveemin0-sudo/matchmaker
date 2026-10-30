/* GET /profiles/search: server-side name search instead of downloading every public profile. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./helpers/backend-harness');

const h = createHarness({ port: 3194 });
const { store, state } = h;

function asUser(uid) {
  state.idTokens['tok_' + uid] = { uid, email: `${uid}@example.com` };
  state.authUsers[uid] = { uid, email: `${uid}@example.com`, disabled: false };
  return { Authorization: 'Bearer tok_' + uid };
}

async function publish(uid, displayName, extra = {}) {
  store.set('users/' + uid, {
    id: uid, name: displayName, displayName, age: 27, gender: 'Female', bio: 'Loves jollof',
    image: 'https://example.com/p.jpg', photos: ['https://example.com/p.jpg'], accountStatus: 'active', ...extra,
  });
  const r = await h.request('POST', '/profiles/sync', {}, asUser(uid));
  assert.equal(r.status, 200);
}

const search = (q, auth) => h.request('GET', '/profiles/search?q=' + encodeURIComponent(q), undefined, auth);

test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

test('profile sync publishes name-prefix search keys', async () => {
  await publish('ada', 'Adaeze Okafor');
  const keys = store.get('public_profiles/ada').searchKeys;
  for (const k of ['ad', 'adaeze', 'ok', 'okafor']) assert.ok(keys.includes(k), k);
  assert.ok(!keys.includes('a'), 'single letters are not keys');
});

test('finds people by the start of any name word, case- and accent-insensitive', async () => {
  await publish('ada', 'Adaeze Okafor');
  await publish('ifeoma', 'Ifeoma Nwosu');
  const me = asUser('me');
  for (const q of ['ada', 'OKA', 'adaeze ok', 'Adaézé']) {
    const r = await search(q, me);
    assert.equal(r.status, 200, q);
    assert.deepEqual(r.json.users.map(u => u.id), ['ada'], q);
  }
  const none = await search('ada nw', me);
  assert.deepEqual(none.json.users, [], 'every word must match the same person');
});

test('excludes the searcher, blocked people in both directions, inactive and live_ test profiles', async () => {
  await publish('me', 'Chidi Me');
  await publish('blockedByMe', 'Chidi Two');
  await publish('blockedMe', 'Chidi Three');
  await publish('gone', 'Chidi Four', { accountStatus: 'suspended' });
  await publish('live_test1', 'Chidi Test');
  await publish('ok', 'Chidi Five');
  store.set('blocks/me_blockedByMe', { blockedBy: 'me', blockedUserId: 'blockedByMe' });
  store.set('blocks/blockedMe_me', { blockedBy: 'blockedMe', blockedUserId: 'me' });
  const r = await search('chidi', asUser('me'));
  assert.deepEqual(r.json.users.map(u => u.id), ['ok']);
});

test('returns only public fields, at most 20 results', async () => {
  for (let i = 0; i < 25; i++) await publish('u' + i, 'Tunde ' + i, { email: 'secret@example.com', phone: '+2348000000000' });
  const r = await search('tunde', asUser('me'));
  assert.equal(r.json.users.length, 20);
  const u = r.json.users[0];
  assert.deepEqual(Object.keys(u).sort(), ['age', 'bio', 'city', 'gender', 'id', 'image', 'isRealUser', 'name', 'tags']);
  assert.doesNotMatch(JSON.stringify(r.json), /secret@example\.com|\+234/);
});

test('one-letter queries return nothing and sign-in is required', async () => {
  await publish('ada', 'Ada');
  assert.deepEqual((await search('a', asUser('me'))).json.users, []);
  assert.equal((await search('ada', {})).status, 401);
});

test('the client asks the backend instead of reading the whole collection', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'firebase-config.js'), 'utf8');
  const fn = src.slice(src.indexOf('async function searchUsersInFirestore'), src.indexOf('// Cache of fetched public profiles'));
  assert.match(fn, /\/profiles\/search\?q=/);
  assert.doesNotMatch(fn, /collection\('public_profiles'\)\.get\(\)/);
});
