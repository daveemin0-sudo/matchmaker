/* Static guards for frontend bugs that were reproduced in headless Chromium.
 * They only check the fix is still present in source; the real reproduction
 * (document-load counter across a fresh first login, hero vs card geometry at
 * 390x844 / 360x640 / 430x932) was done in a browser, see the commit messages. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (f) => fs.readFileSync(f, 'utf8');

test('service worker controllerchange only reloads for updates, not on first install', () => {
  const html = read('index.html');
  const block = html.match(/addEventListener\('controllerchange'[\s\S]*?\}\);/);
  assert.ok(block, 'controllerchange listener missing');
  assert.match(html, /var hadController = !!navigator\.serviceWorker\.controller/);
  assert.match(block[0], /if \(!hadController\)/);
  assert.match(block[0], /if \(reloading\) return/);
});

test('auth screens scroll inside the screen so the form is never clipped on short phones', () => {
  const css = read('css/auth.css');
  const rule = css.match(/\.auth-screen \{[\s\S]*?\}/);
  assert.ok(rule, '.auth-screen rule not found in css/auth.css');
  assert.match(rule[0], /overflow-y:\s*auto/);
});

test('sign-up: terms/privacy are real buttons that open the legal modals, and the last step says "Create account"', () => {
  const html = read('index.html');
  assert.match(html, /<button[^>]*onclick="openTermsModal\(\)"[^>]*>Terms of Service<\/button>/);
  assert.match(html, /<button[^>]*onclick="openPrivacyModal\(\)"[^>]*>Privacy Policy<\/button>/);
  assert.match(read('script.js'), /signupStep === 4 \? 'Create account' : 'Continue'/);
});

test('welcome screen carries no invented statistics', () => {
  const html = read('index.html');
  const screen = html.match(/id="signupSuccessScreen"[\s\S]*?<!-- =+\s*SCREEN: DISCOVERY/);
  assert.ok(screen, 'signupSuccessScreen block not found');
  assert.doesNotMatch(screen[0], /500\+|98%|4\.9|Match Rate|Active Users|might already like/i);
});

test('the browser never stores a recoverable copy of the password in the Firebase sign-up path', () => {
  const js = read('script.js');
  const start = js.indexOf('createUserWithEmailAndPassword');
  const end = js.indexOf('LOCAL VERIFIED STORAGE MODE', start);
  assert.ok(start > 0 && end > start);
  assert.doesNotMatch(js.slice(start, end), /passwordHash|btoa\(password\)/);
});

test('voice-intro pill is anchored to the top of the photo, not the bottom where the bio is drawn', () => {
  const css = read('premium.css');
  const rule = css.match(/\.card-voice-intro-btn \{[\s\S]*?\n\}/);
  assert.ok(rule, '.card-voice-intro-btn rule not found');
  assert.match(rule[0], /top:/);
  assert.doesNotMatch(rule[0], /bottom:/, 'bottom-anchored pill covers the end of .card-info .card-bio');
});
