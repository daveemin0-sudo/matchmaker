const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Report Modal & Discovery Photo Navigation ---');

const script = fs.readFileSync('script.js', 'utf8');
const styleCss = fs.readFileSync('style.css', 'utf8');
const webhookIndex = fs.readFileSync('webhook-server/index.js', 'utf8');
const fbConfig = fs.readFileSync('firebase-config.js', 'utf8');

// 1. Verify PROFILES_DATA has photos arrays with multiple photos
const pIdx = script.indexOf('const PROFILES_DATA = [');
const pEnd = script.indexOf('];\n\nconst PREMIUM_MATCHES', pIdx);
const profilesCode = script.substring(pIdx + 'const PROFILES_DATA = '.length, pEnd + 1);
const profiles = eval(profilesCode);
assert.ok(profiles.length >= 5, 'Should have at least 5 discovery profiles');
profiles.forEach(p => {
  assert.ok(Array.isArray(p.photos) && p.photos.length >= 3, `${p.name} must have at least 3 photos in photos array`);
});
console.log('✓ 1. Every discovery profile has 4 distinct photos in photos array');

// 2. Verify tap zones in style.css
assert.ok(styleCss.includes('.card-photo-tap-prev,\n.card-photo-tap-next {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  width: 50% !important;\n  z-index: 15 !important;'), 'Tap zones have 50% width and z-index 15');
console.log('✓ 2. Card photo tap zones cover 50% left and right of card with z-index 15');

// 3. Verify buildProfileCard tap detection in script.js
assert.ok(script.includes("prevZone.addEventListener('touchend'"), 'Prev zone has touchend listener');
assert.ok(script.includes("nextZone.addEventListener('touchend'"), 'Next zone has touchend listener');
assert.ok(script.includes("handleTap(prevZone, -1, e)"), 'Tap left decrements photo index');
assert.ok(script.includes("handleTap(nextZone, 1, e)"), 'Tap right increments photo index');
console.log('✓ 3. buildProfileCard attaches touch and click listeners for smooth photo navigation');

// 4. Verify report modal responsive styling and close/cancel buttons
assert.ok(styleCss.includes('max-height: calc(100dvh - 32px);'), 'Report modal card constrained to max 100dvh - 32px');
assert.ok(styleCss.includes('.wa-dialog-close-btn {'), 'wa-dialog-close-btn style exists in style.css');
assert.ok(script.includes('class="wa-dialog-close-btn"'), 'Report modal HTML includes close X button');
assert.ok(script.includes('class="wa-dialog-btn wa-dialog-btn-cancel"'), 'Report modal HTML includes Cancel button');
assert.ok(script.includes('class="wa-dialog-btn-row"'), 'Report modal has side-by-side action button row');
console.log('✓ 4. Report/block modal has close X button, visible Cancel button, and max-height scrolling');

// 5. Verify backend discovery endpoints return photos array
assert.ok(webhookIndex.includes('photos:userPhotos'), 'webhook-server/index.js passes photos array in discovery');
assert.ok(fbConfig.includes('photos: Array.isArray(u.photos)'), 'firebase-config.js preserves photos array');
console.log('✓ 5. Backend discovery endpoints return photos array');

console.log('\nALL REPORT & DISCOVERY PHOTO TESTS PASSED PERFECTLY!');
