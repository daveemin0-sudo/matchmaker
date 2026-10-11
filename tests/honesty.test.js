// The UI must not present invented facts as real, and user text must not be able to break out of markup.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const js = fs.readFileSync('script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function load() {
  const a = js.indexOf('const INTENT_LABELS');
  const b = js.indexOf('window.calculateCompatibility = calculateCompatibility;');
  const c = js.indexOf('function escHtml(str)');
  const d = js.indexOf('}\n', c) + 2;
  assert.ok(a > 0 && b > a && c > 0, 'functions not found');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(js.slice(a, b) + js.slice(c, d) + '\nthis.calculateCompatibility = calculateCompatibility; this.escHtml = escHtml;', ctx);
  return ctx;
}

test('compatibility reports only facts: no percentage, no filler reasons', () => {
  const { calculateCompatibility } = load();
  const none = calculateCompatibility({ interests: ['Music 🎵'], intent: 'relationship' }, { name: 'Ada', tags: ['Gaming 🎮'], intent: 'friendship' });
  assert.equal('score' in none, false, 'a made-up match percentage must not exist');
  assert.deepEqual(Array.from(none.reasons), [], 'nothing in common means nothing claimed');
  assert.equal(none.sharedTags.length, 0);

  const some = calculateCompatibility({ interests: ['Music 🎵', 'Travel ✈️'], intent: 'relationship' },
    { name: 'Ada', tags: ['Travel ✈️', 'Music 🎵', 'Yoga 🧘'], intent: 'relationship', isVerified: true });
  assert.equal(some.sharedTags.length, 2);
  assert.match(some.reasons[0], /^You both like Travel and Music$/);
  assert.ok(some.reasons.some((r) => /looking for a serious relationship/.test(r)));
  assert.ok(some.reasons.includes('Photo verified'));
});

test('compatibility does not assume interests for a user who has none', () => {
  const { calculateCompatibility } = load();
  const r = calculateCompatibility({}, { name: 'Ada', tags: ['Music 🎵', 'Travel ✈️', 'Food 🍕'] });
  assert.equal(r.sharedTags.length, 0);
  assert.deepEqual(Array.from(r.reasons), []);
});

test('escHtml is safe inside quoted attributes', () => {
  const { escHtml } = load();
  assert.equal(escHtml('" onerror="alert(1)'), '&quot; onerror=&quot;alert(1)');
  assert.equal(escHtml("a'b"), 'a&#39;b');
  assert.equal(escHtml('<b>&'), '&lt;b&gt;&amp;');
  assert.equal(escHtml(null), '');
  assert.equal(escHtml(0), '0');
});

test('profile sheet never invents attributes for people who left them blank', () => {
  const a = js.indexOf('function openProfileDetailSheet');
  const b = js.indexOf('window.openProfileDetailSheet', a);
  const body = js.slice(a, b);
  for (const invented of ['Creative Professional', 'University Graduate', "5\\'8", 'Star Sign', 'Socially', 'Non-smoker', 'Active lifestyle', 'simple pleasures', 'cinnamon']) {
    assert.ok(!body.includes(invented), `fabricated default "${invented}" is back in the profile sheet`);
  }
});

test('no invented statistics or social proof in the markup or templates', () => {
  const banned = [/\b95% MATCH\b/i, /98% Match/i, /Active Users/i, /Match Rate/i, /4\.9★/, /500\+/, /might already like your profile/i];
  for (const re of banned) {
    assert.doesNotMatch(html, re, `index.html contains ${re}`);
    assert.doesNotMatch(js, re, `script.js contains ${re}`);
  }
});
