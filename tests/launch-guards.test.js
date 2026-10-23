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
