/* Guards the design system: every text/background pair in css/tokens.css meets
 * WCAG AA in BOTH themes, and the inline SVG sprite stays in sync with markup. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('css/tokens.css', 'utf8');

function block(selectorStart) {
  const i = css.indexOf(selectorStart);
  assert.ok(i >= 0, `${selectorStart} block not found`);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('\n}', i));
  const vars = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}
const dark = block(':root {');
const light = { ...dark, ...block('html[data-theme="light"],') };

function parse(c) {
  c = c.trim();
  let m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
  m = c.match(/^rgba?\(([^)]+)\)$/);
  assert.ok(m, `cannot parse colour "${c}"`);
  const [r, g, b, a = 1] = m[1].split(',').map(Number);
  return { r, g, b, a };
}
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

for (const [name, t] of [['dark', dark], ['light', light]]) {
  const c = (k) => parse(t[k]);
  const surfaces = ['bg', 'surface', 'surface-raised'];
  const text = (fg, bgKey, min, label) => {
    const bg = over(c(bgKey), c('bg'));
    const r = ratio(over(c(fg), bg), bg);
    assert.ok(r >= min, `${name}: ${fg} on ${bgKey} is ${r.toFixed(2)}:1, needs ${min}:1 ${label || ''}`);
  };

  test(`${name}: body and secondary text pass AA on every surface`, () => {
    for (const s of surfaces) for (const fg of ['text', 'text-2', 'text-3', 'primary-text']) text(fg, s, 4.5);
  });
  test(`${name}: status colours pass AA as text on every surface`, () => {
    for (const s of surfaces) for (const fg of ['success', 'warning', 'danger', 'gold-text']) text(fg, s, 4.5);
  });
  test(`${name}: filled buttons keep AA label contrast (default, hover, pressed)`, () => {
    for (const bgKey of ['primary', 'primary-hover', 'primary-pressed']) text('on-primary', bgKey, 4.5);
    text('on-gold', 'gold', 4.5);
  });
  test(`${name}: tinted badges pass AA over the surface they sit on`, () => {
    const pairs = [['primary-text', 'primary-soft'], ['gold-text', 'gold-soft'], ['success', 'success-soft'], ['warning', 'warning-soft'], ['danger', 'danger-soft']];
    for (const s of surfaces) for (const [fg, soft] of pairs) {
      const bg = over(c(soft), c(s));
      const r = ratio(c(fg), bg);
      assert.ok(r >= 4.5, `${name}: ${fg} on ${soft}/${s} is ${r.toFixed(2)}:1`);
    }
  });
  test(`${name}: focus ring and control borders meet 3:1 non-text contrast`, () => {
    for (const s of surfaces) {
      assert.ok(ratio(c('focus'), c(s)) >= 3, `${name}: focus on ${s}`);
    }
    // --border-strong is what input/button outlines use
    const strong = over(c('border-strong'), c('surface'));
    assert.ok(ratio(strong, c('surface')) >= 1.4, `${name}: border-strong barely visible`);
  });
}

test('every icon referenced in index.html or script.js exists in the sprite', () => {
  const sprite = fs.readFileSync('icons/sprite.svg', 'utf8');
  const defined = new Set([...sprite.matchAll(/<symbol id="(i-[a-z0-9-]+)"/g)].map((m) => m[1]));
  const used = new Set();
  for (const f of ['index.html', 'script.js', 'firebase-config.js']) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/href="#(i-[a-z0-9-]+)"/g)) used.add(m[1]);
  }
  const missing = [...used].filter((id) => !defined.has(id));
  assert.deepEqual(missing, [], `icons used but not in sprite: ${missing.join(', ')}`);
});

test('the inline sprite in index.html is identical to icons/sprite.svg', () => {
  const sprite = fs.readFileSync('icons/sprite.svg', 'utf8').trim();
  const html = fs.readFileSync('index.html', 'utf8');
  const m = html.match(/<!-- sprite:start -->([\s\S]*?)<!-- sprite:end -->/);
  assert.ok(m, 'sprite markers missing');
  assert.equal(m[1], sprite, 'run: node tools/build-sprite.js');
});
