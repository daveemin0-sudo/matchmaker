/* Voice intros: saved on the server (Storage, or a server-only Firestore doc when Storage is not
   provisioned), shared as metadata on the public profile, fetched on play, never kept as a
   data URL on the phone. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./helpers/backend-harness');

const h = createHarness({ port: 3195 });
const { store, state } = h;

function asUser(uid) {
  state.idTokens['tok_' + uid] = { uid, email: `${uid}@example.com` };
  state.authUsers[uid] = { uid, email: `${uid}@example.com`, disabled: false };
  return { Authorization: 'Bearer tok_' + uid };
}
function activeProfile(uid) {
  store.set('public_profiles/' + uid, { id: uid, displayName: uid, age: 25, image: 'https://example.com/p.jpg', active: true });
}
// A WebM header (EBML magic) followed by a marker the tests can search for.
const AUDIO = Buffer.concat([Buffer.from('1a45dfa3', 'hex'), Buffer.alloc(28), Buffer.from('fake-opus-audio-bytes')]).toString('base64');
const upload = (auth, body) => h.request('PUT', '/profiles/voice-intro', { dataBase64: 'data:audio/webm;base64,' + AUDIO, contentType: 'audio/webm;codecs=opus', durationSeconds: 12, ...body }, auth);

test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

test('without Storage, audio goes to a server-only doc and the profile gets only metadata', async () => {
  state.bucketMissing = true;
  activeProfile('ada');
  const r = await upload(asUser('ada'));
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.voiceIntro, { durationSeconds: 12, duration: '0:12' });
  assert.equal(store.get('voice_intros/ada').dataBase64, AUDIO);
  assert.equal(store.get('voice_intros/ada').contentType, 'audio/webm');
  const pub = JSON.stringify(store.get('public_profiles/ada'));
  assert.doesNotMatch(pub, /base64|fake-opus/);
  assert.equal(store.get('public_profiles/ada').voiceIntro.duration, '0:12');
});

test('with Storage, the file is uploaded and no audio is kept in Firestore', async () => {
  state.defaultBucketConfigured = true;
  activeProfile('ada');
  const r = await upload(asUser('ada'));
  assert.equal(r.status, 200);
  assert.match(r.json.voiceIntro.url, /^https:\/\/firebasestorage\.googleapis\.com\/.*voice_intros%2Fada%2F/);
  assert.equal(state.storageSaves[0].contentType, 'audio/webm');
  assert.equal(store.has('voice_intros/ada'), false);
});

test('rejects non-audio, over-long and oversized recordings', async () => {
  const me = asUser('ada');
  assert.equal((await upload(me, { contentType: 'image/png' })).status, 400);
  assert.equal((await upload(me, { durationSeconds: 21 })).status, 400);
  assert.equal((await upload(me, { durationSeconds: 0 })).status, 400);
  assert.equal((await upload(me, { dataBase64: Buffer.alloc(700 * 1024).toString('base64') })).status, 400);
  assert.equal((await h.request('PUT', '/profiles/voice-intro', { dataBase64: AUDIO, contentType: 'audio/webm', durationSeconds: 5 }, {})).status, 401);
});

test('another person can play it, but not across a block or for an inactive profile', async () => {
  state.bucketMissing = true;
  activeProfile('ada');
  await upload(asUser('ada'));
  const play = (uid) => h.request('GET', '/profiles/ada/voice-intro', undefined, asUser(uid));
  const ok = await play('ben');
  assert.equal(ok.status, 200);
  assert.equal(ok.json.dataBase64, AUDIO);
  assert.equal(ok.json.duration, '0:12');

  store.set('blocks/ada_ben', { blockedBy: 'ada', blockedUserId: 'ben' });
  assert.equal((await play('ben')).status, 404);
  store.set('blocks/chi_ada', { blockedBy: 'chi', blockedUserId: 'ada' });
  assert.equal((await play('chi')).status, 404);

  store.set('public_profiles/ada', { ...store.get('public_profiles/ada'), active: false });
  assert.equal((await play('dee')).status, 404);
  assert.equal((await play('ada')).status, 200, 'the owner can still play their own');
});

test('Discovery shows the intro duration but never the audio', async () => {
  state.bucketMissing = true;
  activeProfile('ada');
  await upload(asUser('ada'));
  const r = await h.request('GET', '/discovery', undefined, asUser('ben'));
  const ada = r.json.users.find(u => u.id === 'ada');
  assert.deepEqual(ada.voiceIntro, { duration: '0:12', hasAudio: true });
  assert.doesNotMatch(JSON.stringify(r.json), /fake-opus|dataBase64/);
});

test('deleting removes the audio and the profile metadata; account deletion covers it too', async () => {
  state.bucketMissing = true;
  activeProfile('ada');
  const me = asUser('ada');
  await upload(me);
  const r = await h.request('DELETE', '/profiles/voice-intro', undefined, me);
  assert.equal(r.status, 200);
  assert.equal(store.has('voice_intros/ada'), false);
  assert.ok(!store.get('public_profiles/ada').voiceIntro);
  const server = fs.readFileSync(path.join(__dirname, '..', 'webhook-server', 'index.js'), 'utf8');
  assert.match(server, /collection\('voice_intros'\)\.doc\(uid\)\.delete\(\)[\s\S]{0,200}`voice_intros\/\$\{uid\}\/`/);
});

test('the client uploads recordings and never stores them as data URLs; rules keep the doc server-only', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
  const recorder = app.slice(app.indexOf('_editVoiceRecorder.onstop'), app.indexOf('_editVoiceRecorder.start()'));
  assert.match(recorder, /uploadVoiceIntro\(blob, seconds\)/);
  assert.doesNotMatch(recorder, /readAsDataURL|audioUrl:/);
  assert.match(app, /BACKEND_URL \+ '\/profiles\/voice-intro', \{\s*method: 'PUT'/);
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/voice_intros\/\{userId\} \{\s*allow read, write: if false;/);
});
