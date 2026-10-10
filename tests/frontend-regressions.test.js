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

test('login hero is not allowed to shrink below its content (it has overflow:hidden inside a flex column)', () => {
  const css = read('premium.css');
  const rule = css.match(/\.auth-hero \{\s*padding: 36px 20px 20px !important;[\s\S]*?\}/);
  assert.ok(rule, '.auth-hero base rule in premium.css not found');
  assert.match(rule[0], /flex-shrink:\s*0\s*!important/);
});
