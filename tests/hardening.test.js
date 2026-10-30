/* CORS, security headers, error handling and rate limits, checked over real HTTP requests. */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./helpers/backend-harness');

const PORT = 3201;
const h = createHarness({ port: PORT, env: { ALLOWED_ORIGINS: 'https://staging.example.org' } });
const { state } = h;
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function raw(method, pathname, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: pathname, method, headers }, (res) => {
      let data = ''; res.on('data', c => (data += c)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject); req.end(body);
  });
}
const preflight = (origin, method = 'PUT') => raw('OPTIONS', '/profiles/voice-intro', { headers: { Origin: origin, 'Access-Control-Request-Method': method } });
function asUser(uid) {
  state.idTokens['tok_' + uid] = { uid, email: `${uid}@example.com` };
  state.authUsers[uid] = { uid, email: `${uid}@example.com`, disabled: false };
  return { Authorization: 'Bearer tok_' + uid };
}

test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

test('CORS allows the real app origins, including the Android app and this project on Vercel', async () => {
  for (const o of ['https://hookmebysam.com', 'https://www.hookmebysam.com', 'https://localhost', 'http://localhost:5500', 'http://127.0.0.1:5500',
                   'https://matchmaker-git-fix-call-media-d-2bc310-daveemin0-sudos-projects.vercel.app',
                   'https://daveemin0-sudo-matchmaker-git-f-484115-daveemin0-sudos-projects.vercel.app',
                   'https://matchmaker-rcbdxss6j-daveemin0-sudos-projects.vercel.app', 'https://staging.example.org']) {
    const r = await preflight(o);
    assert.equal(r.status, 204, o);
    assert.equal(r.headers['access-control-allow-origin'], o, o);
  }
});

test('CORS rejects look-alike origins that the old substring checks let through', async () => {
  for (const o of ['https://localhost.attacker.com', 'https://evil-localhost.com', 'https://vercel.app.attacker.com',
                   'https://attacker.vercel.app', 'https://notmatchmaker.vercel.app', 'https://hookmebysam.com.attacker.com', 'null']) {
    const r = await preflight(o);
    assert.equal(r.status, 403, o);
    assert.equal(r.headers['access-control-allow-origin'], undefined, o);
  }
});

test('PUT is an allowed method, so browsers can upload voice intros', async () => {
  const r = await preflight('https://hookmebysam.com', 'PUT');
  assert.match(r.headers['access-control-allow-methods'], /\bPUT\b/);
});

test('every response carries security headers and no Express fingerprint', async () => {
  const r = await raw('GET', '/');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['x-frame-options'], 'DENY');
  assert.match(r.headers['content-security-policy'], /default-src 'none'/);
  assert.match(r.headers['strict-transport-security'], /max-age=31536000/);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.headers['x-powered-by'], undefined);
});

test('malformed JSON and unknown routes get JSON errors, never a stack trace', async () => {
  const bad = await raw('POST', '/reports', { headers: { 'Content-Type': 'application/json', ...asUser('ada') }, body: '{"reportedUserId": ' });
  assert.equal(bad.status, 400);
  assert.deepEqual(JSON.parse(bad.body), { error: 'Malformed request body.' });
  assert.doesNotMatch(bad.body, /at .*\.js:\d+|SyntaxError|node_modules/);
  const missing = await raw('GET', '/no-such-route');
  assert.equal(missing.status, 404);
  assert.match(missing.headers['content-type'], /application\/json/);
  assert.doesNotMatch(missing.body, /Cannot GET/);
});

test('routes that had no rate limit now stop abuse', async () => {
  const me = asUser('ada');
  let last;
  for (let i = 0; i < 31; i++) last = await h.request('DELETE', '/blocks/bob', undefined, me);
  assert.equal(last.status, 429, 'unblock');
  for (let i = 0; i < 61; i++) last = await h.request('GET', '/profiles/me', undefined, me);
  assert.equal(last.status, 429, 'profiles/me');
  for (let i = 0; i < 31; i++) last = await h.request('GET', '/health');
  assert.equal(last.status, 429, 'health');
});

test('the server reports its configuration at startup without printing any value', () => {
  const server = read('webhook-server/index.js');
  assert.match(server, /console\.log\('Configuration: ' \+ CONFIG_CHECKS\.map\(\(\[name, ok\]\) => `\$\{name\}=\$\{ok \? 'set' : 'MISSING'\}`\)/);
  assert.match(server, /PAYSTACK_SECRET_KEY is a TEST key/);
});

test('frontend hosting sends security headers on Vercel and Firebase Hosting', () => {
  for (const file of ['vercel.json', 'firebase.json']) {
    const text = read(file);
    for (const header of ['Strict-Transport-Security', 'X-Frame-Options', 'Content-Security-Policy', 'Permissions-Policy', 'X-Content-Type-Options']) {
      assert.match(text, new RegExp(header), `${file}: ${header}`);
    }
    assert.match(text, /frame-ancestors 'none'/);
    assert.match(text, /noindex/, `${file}: admin page not indexed`);
  }
  const fb = JSON.parse(read('firebase.json'));
  for (const p of ['webhook-server/**', 'tests/**', 'docs/**', '**/*.md']) assert.ok(fb.hosting.ignore.includes(p), p);
});

test('Android app refuses plain-HTTP content; signing keys and env files are git-ignored', () => {
  assert.equal(JSON.parse(read('capacitor.config.json')).android.allowMixedContent, false);
  const ignore = read('.gitignore').split('\n');
  for (const p of ['.env', '*.keystore', '*.jks', 'serviceAccountKey*.json']) assert.ok(ignore.includes(p), p);
  assert.ok(!ignore.includes('package-lock.json'), 'lockfiles must be committed');
});

test('no hard-coded API keys remain in the server code', () => {
  const server = read('webhook-server/index.js');
  assert.doesNotMatch(server, /process\.env\.[A-Z_]+ \|\| '[A-Za-z0-9_]{20,}'/);
  assert.doesNotMatch(server, /tlv_[A-Za-z0-9]{10,}/);
  assert.equal(JSON.parse(read('webhook-server/package.json')).dependencies.open, undefined, 'unused "open" package removed');
});

test('profile sync publishes only safe photo URLs (no tracking pixels, other schemes or oversized data)', async () => {
  const me = asUser('ada');
  const jpeg = 'data:image/jpeg;base64,' + Buffer.alloc(300).toString('base64');
  h.store.set('users/ada', {
    name: 'Ada', displayName: 'Ada', age: 26, gender: 'Female', accountStatus: 'active',
    image: 'https://tracker.attacker.com/pixel.gif',
    photos: ['javascript:alert(1)', 'http://firebasestorage.googleapis.com/insecure.jpg', 'data:image/svg+xml;base64,PHN2Zz4=',
             'data:image/jpeg;base64,' + 'A'.repeat(800 * 1024), jpeg,
             'https://firebasestorage.googleapis.com/v0/b/x/o/ok.jpg', 'https://lh3.googleusercontent.com/a/photo'],
  });
  const r = await h.request('POST', '/profiles/sync', {}, me);
  assert.equal(r.status, 200);
  const pub = h.store.get('public_profiles/ada');
  assert.deepEqual(pub.photos, [jpeg, 'https://firebasestorage.googleapis.com/v0/b/x/o/ok.jpg', 'https://lh3.googleusercontent.com/a/photo']);
  assert.equal(pub.image, jpeg, 'the unsafe main image is replaced by the first safe photo');
  assert.doesNotMatch(JSON.stringify(pub), /attacker|javascript:|svg\+xml|http:\/\//);
});
