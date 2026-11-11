/* Guards for launch fixes that are easiest to check in source. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('email signup does not pre-select a gender and requires a choice', () => {
  const html = read('index.html');
  const genders = html.match(/<button[^>]*class="choice gender-option[^"]*"[^>]*>/g) || [];
  assert.equal(genders.length, 4);
  assert.ok(genders.every(b => !/\bselected\b/.test(b.match(/class="([^"]*)"/)[1]) && /aria-checked="false"/.test(b)));
  const app = read('script.js');
  assert.match(app, /signupGender: '',/);
  assert.match(app, /if \(!appState\.signupGender\) \{[\s\S]{0,120}Please choose how you identify/);
});

test('phone verification never invents, shows or auto-fills a code', () => {
  const cfg = read('firebase-config.js');
  const app = read('script.js');
  assert.doesNotMatch(cfg, /Math\.random\(\) \* 900000/);
  assert.doesNotMatch(cfg, /cleanOtp === window\._devPhoneOtp/);
  assert.doesNotMatch(app, /value = window\._devPhoneOtp/);
  assert.doesNotMatch(app, /innerHTML = window\._devPhoneOtpMessage/);
});

test('read receipts use a query that needs no undefined composite index', () => {
  const cfg = read('firebase-config.js');
  const fn = cfg.slice(cfg.indexOf('async function markMessagesReadInFirestore'), cfg.indexOf('async function markMessagesReadInFirestore') + 1200);
  assert.doesNotMatch(fn, /where\('sender', '!='/);
  assert.match(fn, /where\('read', '==', false\)/);
});

test('the deployed site does not publish backend source, tests, docs or Firebase config', () => {
  const ignore = read('.vercelignore').split('\n').map(l => l.trim());
  for (const p of ['webhook-server/', 'tests/', 'docs/', '*.md', 'firestore.rules', '.env', '.env.*']) assert.ok(ignore.includes(p), p);
  for (const needed of ['index.html', 'script.js', 'firebase-config.js', 'sw.js', 'css/', 'fonts/', 'icons/', 'manifest.json']) {
    assert.ok(!ignore.includes(needed), `${needed} must stay deployable`);
  }
});

test('firebase-admin stays on v12: v14 removes the namespaced API this server uses', () => {
  const pkg = JSON.parse(read('webhook-server/package.json'));
  assert.match(pkg.dependencies['firebase-admin'], /^\^12\./);
  assert.match(read('webhook-server/index.js'), /admin\.credential\.cert/);
});

test('Gold does not advertise AI portraits (the feature has no entry point in the app)', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /AI portraits/);
  assert.doesNotMatch(html, /id="aiPickerGrid"/, 'if the AI feature is ever wired up, revisit this guard');
  assert.doesNotMatch(read('script.js'), /textContent = 'Unlimited likes, rewinds and AI portraits'/);
});

test('calls announced by push are loaded before ringing, show the right kind, and can be answered', () => {
  const cfg = read('firebase-config.js');
  const push = cfg.slice(cfg.indexOf("if (data.type === 'incoming_call')"), cfg.indexOf("if (data.type === 'incoming_call')") + 700);
  assert.match(push, /collection\('calls'\)\.doc\(data\.callId\)\.get\(\)/, 'push handler loads the call document');
  assert.doesNotMatch(push, /showIncomingCallPrompt\(data\.callId, data\)/, 'never rings with the bare push payload');
  const app = read('script.js');
  const prompt = app.slice(app.indexOf('function showIncomingCallPrompt'), app.indexOf('function showIncomingCallPrompt') + 900);
  assert.match(prompt, /data\.type === 'video' \|\| data\.callType === 'video'/);
  const accept = app.slice(app.indexOf('async function acceptIncomingCall'), app.indexOf('async function acceptIncomingCall') + 1500);
  assert.match(accept, /if \(!incoming\.offer && incoming\.matchId && incoming\.callId\)/, 'answering fetches a missing offer');
});

test('the h logo is in every place the app shows its icon, and every referenced file exists', () => {
  const exists = (f) => fs.existsSync(path.join(__dirname, '..', f));
  const manifest = JSON.parse(read('manifest.json'));
  for (const icon of manifest.icons) assert.ok(exists(icon.src), icon.src);
  assert.ok(manifest.icons.some(i => i.purpose === 'maskable') && manifest.icons.some(i => i.purpose === 'any'));
  for (const f of ['logo.svg', 'logo.png', 'favicon.png', 'apple-touch-icon.png', 'icons/mark.svg', 'icons/badge-96.png']) assert.ok(exists(f), f);
  // One mark everywhere: the in-app symbol, the sprite file, its build tool and the standalone SVGs.
  const stem = 'M16.6 12.8 V49.9';
  for (const f of ['index.html', 'icons/sprite.svg', 'tools/build-sprite.js', 'logo.svg', 'icons/mark.svg']) assert.ok(read(f).includes(stem), f);
  // Notification badges use the white-on-transparent shape, not the full-colour square.
  for (const f of ['sw.js', 'firebase-messaging-sw.js', 'script.js', 'webhook-server/index.js']) {
    assert.match(read(f), /\/icons\/badge-96\.png/, f);
    assert.doesNotMatch(read(f), /badge: ['"]\/icons\/icon-72\.png/, f);
  }
});
