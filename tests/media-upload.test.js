/* Behavioural test for uploadFileToBackend() in firebase-config.js, run in a vm
 * with stubbed browser globals. Guards the "photo / voice note takes ~10s to
 * reach the other phone" bug: when the Storage bucket is unusable the app must
 * remember it and stop retrying before every send. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('firebase-config.js', 'utf8');
const start = src.indexOf('const STORAGE_UNAVAILABLE_KEY');
const end = src.indexOf('// PAYSTACK PAYMENT INTEGRATION');
assert.ok(start > 0 && end > start, 'upload section not found in firebase-config.js');
const section = src.slice(start, end);

function makeEnv({ putBehaviour, backendReply, stored = {} }) {
  const calls = { put: 0, fetch: 0 };
  const storage = { ...stored };
  const ctx = {
    window: {},
    localStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); } },
    FileReader: class { readAsDataURL(f) { this.result = `data:${f.type || 'application/octet-stream'};base64,${Buffer.from(f.bytes || 'x').toString('base64')}`; setImmediate(() => this.onloadend()); } },
    fbStorage: { ref: () => ({ put: () => { calls.put++; return putBehaviour(); } }) },
    fbAuth: { currentUser: { uid: 'u1', getIdToken: async () => 'tok' } },
    BACKEND_URL: 'https://backend.test',
    fetch: async () => { calls.fetch++; return { ok: true, json: async () => backendReply }; },
    JSON, Date, Promise, Set, String, Number, Error, console, setTimeout, clearTimeout,
  };
  ctx.window = ctx; // window.X === global X inside the vm
  vm.createContext(ctx);
  vm.runInContext(section, ctx);
  return { ctx, calls, storage };
}

const file = (type, size = 1000, name = '') => ({ type, size, name, bytes: 'a'.repeat(8) });
const failingPut = () => Promise.reject(Object.assign(new Error('nope'), { code: 'storage/unknown' }));

test('first send with an unusable bucket falls back to the backend, then remembers it', async () => {
  const { ctx, calls, storage } = makeEnv({
    putBehaviour: failingPut,
    backendReply: { success: true, url: 'data:audio/webm;base64,AAAA' },
  });
  const first = await ctx.uploadFileToBackend(file('audio/webm'), 'chat_media/u1_u2', false, 'audio/webm');
  assert.match(first, /^data:audio\/webm/);
  assert.equal(calls.put, 1);
  assert.equal(calls.fetch, 1);
  assert.equal(ctx.window._firebaseStorageDisabled, true, 'inline reply from backend means no bucket');
  assert.ok(Number(storage.hm_storage_unavailable_until) > Date.now(), 'remembered on this device');

  // Second send: no put, no backend round trip, still delivered inline.
  const second = await ctx.uploadFileToBackend(file('audio/webm'), 'chat_media/u1_u2', false, 'audio/webm');
  assert.match(second, /^data:audio\/webm/);
  assert.equal(calls.put, 1, 'must not retry the doomed Storage upload');
  assert.equal(calls.fetch, 1, 'must not call the backend again either');
});

test('a remembered failure survives a page reload (stored flag is honoured at load)', async () => {
  const { ctx, calls } = makeEnv({
    putBehaviour: failingPut,
    backendReply: { success: true, url: 'data:x' },
    stored: { hm_storage_unavailable_until: String(Date.now() + 60_000) },
  });
  const out = await ctx.uploadFileToBackend(file('image/jpeg'), 'stories', false, 'image/jpeg');
  assert.match(out, /^data:image\/jpeg/);
  assert.equal(calls.put + calls.fetch, 0);
});

test('an expired remembered failure is retried', async () => {
  const { ctx, calls } = makeEnv({
    putBehaviour: () => Promise.resolve({ ref: { getDownloadURL: async () => 'https://firebasestorage.googleapis.com/ok', fullPath: 'p' } }),
    backendReply: {},
    stored: { hm_storage_unavailable_until: String(Date.now() - 1) },
  });
  const out = await ctx.uploadFileToBackend(file('image/jpeg'), 'chat_media/u1_u2', false, 'image/jpeg');
  assert.equal(out, 'https://firebasestorage.googleapis.com/ok');
  assert.equal(calls.put, 1);
});

test('videos and oversized files are never inlined when Storage is unavailable', async () => {
  const flagged = { hm_storage_unavailable_until: String(Date.now() + 60_000) };
  const { ctx } = makeEnv({ putBehaviour: failingPut, backendReply: {}, stored: flagged });
  assert.equal(await ctx.uploadFileToBackend(file('video/mp4', 1000, 'a.mp4'), 'stories', false, 'video/mp4'), null);
  assert.equal(await ctx.uploadFileToBackend(file('image/jpeg', 5 * 1024 * 1024), 'stories', false, 'image/jpeg'), null);
  assert.match(ctx.window._lastMediaUploadError, /not provisioned/);
});

test('when Storage works the real download URL is returned and nothing is flagged', async () => {
  const { ctx, storage } = makeEnv({
    putBehaviour: () => Promise.resolve({ ref: { getDownloadURL: async () => 'https://firebasestorage.googleapis.com/ok', fullPath: 'chat_media/x' } }),
    backendReply: {},
  });
  const out = await ctx.uploadFileToBackend(file('image/jpeg'), 'chat_media/u1_u2', false, 'image/jpeg');
  assert.equal(out, 'https://firebasestorage.googleapis.com/ok');
  assert.equal(ctx.window._firebaseStorageDisabled, undefined);
  assert.equal(storage.hm_storage_unavailable_until, undefined);
});

test('a stalled direct upload is abandoned after 8s for photos / voice (25s for video)', () => {
  assert.match(section, /const putTimeoutMs = isVid \? 25000 : 8000;/);
});
