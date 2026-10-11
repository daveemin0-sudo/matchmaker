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

test('paywall and matches show no invented offers, countdowns, ads, or people', () => {
  const banned = [
    /Offer ends/i, /Expires soon/i, /% off/i, /Renews at/i, /First (month|week)/i,
    /Dress to Impress/i, /Sponsored/i, /premium users have already/i, /unsplash\.com/i,
    /3\.5\s*[x×]/i, /\b8\s*[x×] more/i, /\b3\s*[x×] more/i
  ];
  const start = html.indexOf('id="matchesScreen"');
  const end = html.indexOf('SCREEN: CHATS INBOX');
  const matchesHtml = html.slice(start, end);
  const pw = html.slice(html.indexOf('id="paywallModal"'), html.indexOf('MODAL: DISCOVERY FILTERS'));
  for (const re of banned) {
    assert.doesNotMatch(matchesHtml, re, `matches screen contains ${re}`);
    assert.doesNotMatch(pw, re, `paywall contains ${re}`);
  }
  assert.doesNotMatch(js, /_tgSecondsRemaining|startTgCountdownTimer|revealBlurredMatches/);
});

test('paywall only lists benefits the product delivers, at the prices the server charges', () => {
  const server = fs.readFileSync('webhook-server/index.js', 'utf8');
  const plans = [...server.matchAll(/amount:\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.deepEqual(plans.slice(0, 3), [2500, 7500, 25000]);
  const m = js.match(/const PAYWALL_PLANS = \{([\s\S]*?)\n\};/);
  assert.ok(m, 'PAYWALL_PLANS missing');
  const clientPrices = [...m[1].matchAll(/price:\s*(\d+)/g)].map((x) => Number(x[1]));
  assert.deepEqual(clientPrices, plans.slice(0, 3));
  const pw = html.slice(html.indexOf('id="paywallModal"'), html.indexOf('MODAL: DISCOVERY FILTERS'));
  assert.match(pw, /does not renew automatically/i);
  // Features with no implementation behind them must not be sold.
  for (const re of [/Boost/i, /Passport/i, /Super Like/i, /See Who Likes You/i, /Message Before Matching/i, /Zero Advertisements/i, /Top Picks/i]) {
    assert.doesNotMatch(pw, re, `paywall promises ${re}`);
  }
});

test('profile and settings never show a profile the user did not write', () => {
  const start = js.indexOf('function renderProfileScreen()');
  const end = js.indexOf('let _editProfilePhotos');
  const fn = js.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.doesNotMatch(fn, /Lagos, Nigeria|Living life with|Tech 💻|\|\| 24/, 'no invented age, place, bio or interests');
  assert.doesNotMatch(js.slice(js.indexOf('let currentUser = {'), js.indexOf('let profileStack')), /Dave|Lagos|24|Lekki/, 'the blank default user must not read as a real person');
  assert.doesNotMatch(html, /\d(\.\d)?\s*[x×]\s*more matches/i, 'no unproven multiplier claims');
  assert.doesNotMatch(js, /\d(\.\d)?\s*[x×]\s*more (meaningful )?(matches|mutual likes)/i);
  assert.doesNotMatch(html + js, /Ultra HD|Crystal Clear/);
});

test('settings only lists controls that do something', () => {
  const settings = html.slice(html.indexOf('id="settingsScreen"'), html.indexOf('end .screens-container'));
  assert.doesNotMatch(settings, /Stealth|Incognito/i, 'stealth mode is not enforced anywhere, so it is not offered');
  assert.doesNotMatch(settings, /showToast\('Location updated'\)/);
  assert.match(settings, /handleNotifRowClick\(\)/, 'notifications row reflects and requests the real permission');
});

test('no stealth/incognito promise exists anywhere in the app', () => {
  assert.doesNotMatch(html, /stealth|incognito/i, 'nothing enforces it, so nothing may promise it');
  assert.doesNotMatch(js, /stealth/i);
  assert.doesNotMatch(js.replace(/mustache detective undercover incognito/, ''), /incognito/i);
});

test('nothing lets a user grant themselves a verification badge', () => {
  // The backend never publishes a verified flag, so a client-side "face scan" would be a fake trust signal.
  assert.doesNotMatch(js, /completeSelfieVerification|openSelfieVerifyModal|hmbs_verified/, 'self-service verification flow must not exist');
  assert.doesNotMatch(html, /selfieVerifyModal|Face Match|Identity Confirmed|Blue Badge/i);
  assert.doesNotMatch(js, /Face Match|Identity Confirmed|Blue Badge/i);
  assert.doesNotMatch(html + js, /verifiedOnly|filterVerifiedOnly/, 'a "verified only" filter would hide everyone');
  // Sample profiles must not claim a verification the app cannot perform.
  const demo = js.slice(js.indexOf('const PROFILES_DATA'), js.indexOf('const PROFILES_DATA') + 12000);
  assert.doesNotMatch(demo, /isVerified:\s*true/);
});

test('report/block dialog never interpolates names into inline JavaScript', () => {
  const fn = js.slice(js.indexOf('function reportUser()'), js.indexOf('async function persistBlockToFirestore'));
  assert.doesNotMatch(fn, /onclick=/, 'names with quotes would break or inject into inline handlers');
});

test('onboarding saves only what the person chose', () => {
  const start = js.indexOf('const OB_STEPS');
  const end = js.indexOf('// Override handleGoogleLoginSuccess');
  const wiz = js.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.doesNotMatch(wiz, /nightVibe|greenFlag|currentUser\.prompts|currentUser\.lifestyle|'Male'|'night_out'/, 'no invented lifestyle, prompts or gender defaults');
  assert.doesNotMatch(html.slice(html.indexOf('id="onboardingWizard"'), html.indexOf('id="matchConfettiCanvas"')), /selected"|aria-checked="true"/, 'no option is pre-selected');
});

test('signup never invents a profile and toasts carry no decoration or false promises', () => {
  const emo = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;
  const bad = js.split('\n').filter((l) => /showToast\(/.test(l) && emo.test(l));
  assert.deepEqual(bad, [], 'toast copy should be plain text');
  assert.doesNotMatch(js, /Priority match delivery|appear at the top of their matches/);
  assert.doesNotMatch(js, /gender: currentUser\.gender \|\| 'Female'|Looking for real connections on hookmebysam|age: [^,\n]*\|\| 24,/);
});
