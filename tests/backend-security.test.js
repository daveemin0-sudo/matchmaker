/* Behavioural security tests for webhook-server/index.js (real server file,
 * firebase-admin / node-fetch stubbed — see helpers/backend-harness.js). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./helpers/backend-harness');

const h = createHarness({ port: 3188 });
const { store, state } = h;
const bearer = (t) => ({ Authorization: 'Bearer ' + t });

test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

// ---------- /stories/cleanup ----------
test('stories cleanup fails closed when CLEANUP_SECRET is not configured', async () => {
  // Server runs with no CLEANUP_SECRET. An empty header used to equal ''.
  const noHeader = await h.request('POST', '/stories/cleanup', {});
  const emptyHeader = await h.request('POST', '/stories/cleanup', {}, { 'x-cleanup-secret': '' });
  const guessed = await h.request('POST', '/stories/cleanup', {}, { 'x-cleanup-secret': 'anything' });
  assert.equal(noHeader.status, 401);
  assert.equal(emptyHeader.status, 401, 'empty secret header must not authenticate');
  assert.equal(guessed.status, 401);
});

// ---------- /media/upload ----------
const b64 = Buffer.from('hello').toString('base64');

function asUser(uid) {
  state.idTokens['tok_' + uid] = { uid, email: uid + '@example.com' };
  state.authUsers[uid] = { uid, email: uid + '@example.com', disabled: false };
  return bearer('tok_' + uid);
}

test('media upload rejects unknown storage roots and non-media content types', async () => {
  const auth = asUser('alice');
  const badRoot = await h.request('POST', '/media/upload', { dataBase64: b64, contentType: 'image/jpeg', path: 'users/bob' }, auth);
  const badType = await h.request('POST', '/media/upload', { dataBase64: b64, contentType: 'text/html', path: 'stories' }, auth);
  assert.equal(badRoot.status, 400);
  assert.equal(badType.status, 400);
  assert.equal(state.storageSaves.length, 0);
});

test('media upload to chat_media requires a live match the caller belongs to', async () => {
  const auth = asUser('alice');
  const body = { dataBase64: b64, contentType: 'image/jpeg', path: 'chat_media/alice_bob' };

  const noMatch = await h.request('POST', '/media/upload', body, auth);
  assert.equal(noMatch.status, 403, 'no match document => forbidden');

  store.set('matches/alice_bob', { users: ['alice', 'bob'] });
  const ok = await h.request('POST', '/media/upload', body, auth);
  assert.equal(ok.status, 200);
  assert.equal(state.storageSaves.length, 1);
  assert.match(state.storageSaves[0].dest, /^chat_media\/alice_bob\/alice\//);

  const stranger = asUser('mallory');
  const notMine = await h.request('POST', '/media/upload', body, stranger);
  assert.equal(notMine.status, 403, 'non-participant cannot upload into someone else\'s match');

  store.set('blocks/bob_alice', { blockedBy: 'bob', blockedUserId: 'alice' });
  const blocked = await h.request('POST', '/media/upload', body, auth);
  assert.equal(blocked.status, 403, 'blocked pair cannot upload chat media');
});

test('media upload still accepts story uploads and voice-note audio types', async () => {
  const auth = asUser('alice');
  const story = await h.request('POST', '/media/upload', { dataBase64: b64, contentType: 'video/mp4', path: 'stories', fileName: 's.mp4' }, auth);
  assert.equal(story.status, 200);
  store.set('matches/alice_bob', { users: ['alice', 'bob'] });
  const voice = await h.request('POST', '/media/upload', { dataBase64: b64, contentType: 'audio/webm;codecs=opus', path: 'chat_media/alice_bob' }, auth);
  assert.equal(voice.status, 200);
});

// ---------- /auth/link-google (pre-hijacking guard) ----------
function setupGoogleLink({ targetEmailVerified }) {
  const email = 'victim@gmail.com';
  // The brand-new Google-only auth user created when the victim clicked "Sign in with Google".
  state.idTokens.google_tok = { uid: 'g_new', email, email_verified: true, firebase: { sign_in_provider: 'google.com' } };
  state.authUsers.g_new = { uid: 'g_new', email, disabled: false, providerData: [{ providerId: 'google.com', uid: 'google-123' }] };
  // The pre-existing email/password account that owns the same address.
  state.authUsers.old_uid = { uid: 'old_uid', email, emailVerified: targetEmailVerified, disabled: false, providerData: [{ providerId: 'password', uid: email }] };
  store.set('users/old_uid', { email, displayName: 'Existing' });
}

test('google linking into an UNVERIFIED email/password account drops its password and sessions', async () => {
  setupGoogleLink({ targetEmailVerified: false });
  const res = await h.request('POST', '/auth/link-google', {}, bearer('google_tok'));
  assert.equal(res.json?.linked, true);
  const updates = state.authCalls.filter((c) => c.fn === 'updateUser' && c.args[0] === 'old_uid').map((c) => c.args[1]);
  assert.ok(updates.some((u) => u.providerToLink?.providerId === 'google.com'), 'google provider is linked');
  assert.ok(updates.some((u) => (u.providersToUnlink || []).includes('password')), 'attacker-known password must be unlinked');
  assert.ok(state.authCalls.some((c) => c.fn === 'revokeRefreshTokens' && c.args[0] === 'old_uid'), 'existing sessions revoked');
});

test('google linking into a VERIFIED email/password account keeps the password sign-in', async () => {
  setupGoogleLink({ targetEmailVerified: true });
  const res = await h.request('POST', '/auth/link-google', {}, bearer('google_tok'));
  assert.equal(res.json?.linked, true);
  const updates = state.authCalls.filter((c) => c.fn === 'updateUser' && c.args[0] === 'old_uid').map((c) => c.args[1]);
  assert.ok(updates.some((u) => u.providerToLink?.providerId === 'google.com'));
  assert.ok(!updates.some((u) => (u.providersToUnlink || []).length), 'verified owners keep their password');
});

// ---------- Cloud Storage bucket handling (production had NO bucket configured) ----------
// Render logs showed "Bucket name not specified or invalid" on every upload: the
// no-argument admin.storage().bucket() throws, which skipped the hard-coded fallback.
test('media upload uses the project bucket even when no default bucket is configured', async () => {
  const auth = asUser('alice');
  store.set('matches/alice_bob', { users: ['alice', 'bob'] });
  const res = await h.request('POST', '/media/upload', { dataBase64: b64, contentType: 'image/jpeg', path: 'chat_media/alice_bob' }, auth);
  assert.equal(res.status, 200);
  assert.equal(state.storageSaves.length, 1, 'file must be saved to Cloud Storage, not silently inlined');
  assert.equal(state.storageSaves[0].bucket, 'demo-test.firebasestorage.app', 'falls back to <FIREBASE_PROJECT_ID>.firebasestorage.app');
  assert.match(res.json.url, /^https:\/\/firebasestorage\.googleapis\.com\//);
});

test('media upload falls back to an inline data URL (not a 500) when the bucket does not exist', async () => {
  const auth = asUser('alice');
  state.bucketMissing = true;
  const res = await h.request('POST', '/media/upload', { dataBase64: b64, contentType: 'audio/webm', path: 'voicenotes' }, auth);
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);
  assert.match(res.json.url, /^data:audio\/webm;base64,/);
});

test('account deletion still completes when Cloud Storage was never provisioned', async () => {
  const auth = asUser('carol');
  store.set('users/carol', { displayName: 'Carol' });
  store.set('matches/carol_dave', { users: ['carol', 'dave'] });
  state.bucketMissing = true;
  const res = await h.request('POST', '/account/delete', {}, auth);
  assert.equal(res.status, 200, 'a missing bucket means there is no media to delete, not a failed deletion');
  assert.equal(store.has('users/carol'), false);
  assert.ok(state.authCalls.some((c) => c.fn === 'deleteUser' && c.args[0] === 'carol'));
});

test('no code path calls the throwing no-argument bucket() outside the resolver', () => {
  const src = require('node:fs').readFileSync('webhook-server/index.js', 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const calls = [...code.matchAll(/storage\(\)\.bucket\(\)/g)];
  assert.equal(calls.length, 1, 'only resolveStorageBucketName() may probe the default bucket (inside try/catch)');
});
