const assert = require('assert');
const fs = require('fs');

console.log('🧪 Starting Discovery Filters & Dynamic Algorithmic Matching Test Suite...\n');

// 1. Verify HTML elements
const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes('id="discoveryFilterBtn"'), 'discoveryFilterBtn must exist in HTML');
assert(html.includes('id="discoveryFilterModal"'), 'discoveryFilterModal must exist in HTML');
assert(html.includes('id="filterDistanceSlider"'), 'filterDistanceSlider must exist');
assert(html.includes('id="filterMinAgeSlider"'), 'filterMinAgeSlider must exist');
assert(html.includes('id="filterMaxAgeSlider"'), 'filterMaxAgeSlider must exist');
assert(html.includes('id="filterVerifiedOnly"'), 'filterVerifiedOnly must exist');
assert(html.includes('id="filterIntentChips"'), 'filterIntentChips must exist');
assert(html.includes('id="settingsVerifiedOnlyToggle"'), 'settingsVerifiedOnlyToggle must exist in Settings');
console.log('✔ HTML checks passed: Header button, filter sheet modal, and settings toggle exist.');

// 2. Verify CSS rules
const css = fs.readFileSync('style.css', 'utf8');
assert(css.includes('#discoveryFilterBtn'), 'CSS for #discoveryFilterBtn must exist');
assert(css.includes('.filter-active-dot'), 'CSS for .filter-active-dot must exist');
assert(css.includes('.discovery-filter-sheet'), 'CSS for .discovery-filter-sheet must exist');
assert(css.includes('.filter-chip.active'), 'CSS for .filter-chip.active must exist');
console.log('✔ CSS checks passed: Bottom sheet, active dot badge, and chip styling present.');

// 3. Test Algorithmic Filtering in Script
// Create simulated browser environment
global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.document = {
  documentElement: { classList: { add: () => {}, remove: () => {} }, setAttribute: () => {}, removeAttribute: () => {} },
  body: { classList: { add: () => {}, remove: () => {} }, removeAttribute: () => {} },
  querySelector: () => ({ setAttribute: () => {}, removeAttribute: () => {}, classList: { add: () => {}, remove: () => {} } }),
  getElementById: (id) => {
    return {
      id,
      value: '50',
      checked: false,
      style: { setProperty: () => {}, display: '' },
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      textContent: '',
      setAttribute: () => {},
      removeAttribute: () => {},
      pause: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      appendChild: () => {},
      querySelector: () => ({ textContent: '' })
    };
  },
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tag,
    id: '',
    style: { setProperty: () => {} },
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    setAttribute: () => {},
    removeAttribute: () => {},
    querySelector: () => ({ style: {}, addEventListener: () => {} }),
    querySelectorAll: () => [],
    appendChild: () => {},
    addEventListener: () => {}
  }),
  createTextNode: (t) => ({ text: t }),
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};
global.settings = {
  maxDistance: 50,
  minAge: 20,
  maxAge: 35,
  verifiedOnly: false,
  intent: 'all'
};
global.saveToStorage = () => {};
global.renderCardStack = () => {};
global.isRealUserLoggedIn = () => false;
global.showToast = () => {};
global.haptic = () => {};
global.escHtml = (s) => s;
global.safeCssUrl = (s) => s;

// Load script.js functions
const code = fs.readFileSync('script.js', 'utf8');
// Evaluate relevant parts
eval(code);

// Test 1: Master pool initialization and default filters
applyDiscoveryFilters();
assert(Array.isArray(window._masterDiscoveryPool) && window._masterDiscoveryPool.length >= 8, 'Master discovery pool should contain 8 profiles');
console.log(`✔ Master pool initialized with ${window._masterDiscoveryPool.length} mock profiles.`);

// Test 2: Verified Only Filter
settings.verifiedOnly = true;
applyDiscoveryFilters();
assert(window.profileStack.length > 0, 'Verified profiles should not be empty');
assert(window.profileStack.every(p => p.isVerified || p.verified), 'All returned profiles must be verified');
console.log(`✔ Verified Only filter works: returned ${window.profileStack.length} verified profiles (${window.profileStack.map(p => p.name).join(', ')}).`);

// Test 3: Maximum Distance Filter (e.g. 5 km)
settings.verifiedOnly = false;
settings.maxDistance = 5;
applyDiscoveryFilters();
assert(window.profileStack.every(p => parseInt(String(p.distance).replace(/[^0-9]/g, ''), 10) <= 5), 'All profiles must be <= 5 km');
console.log(`✔ Max Distance filter (5 km) works: returned ${window.profileStack.length} profiles (${window.profileStack.map(p => `${p.name} (${p.distance})`).join(', ')}).`);

// Test 4: Age Range Filter (e.g. 21 - 23)
settings.maxDistance = 100;
settings.minAge = 21;
settings.maxAge = 23;
applyDiscoveryFilters();
assert(window.profileStack.every(p => p.age >= 21 && p.age <= 23), 'All profiles must be aged 21 to 23');
console.log(`✔ Age Range filter (21-23) works: returned ${window.profileStack.length} profiles (${window.profileStack.map(p => `${p.name} (${p.age})`).join(', ')}).`);

// Test 5: Empty filter result and reset
settings.maxDistance = 1; // Impossible distance
applyDiscoveryFilters();
assert.strictEqual(window.profileStack.length, 0, 'Profile stack should be 0 when no match');
console.log('✔ Impossible filter properly results in empty stack for empty state handling.');

resetDiscoveryFilters();
assert(window.profileStack.length >= 8, 'Reset filters should restore all profiles');
assert.strictEqual(settings.maxDistance, 100, 'Settings max distance reset to 100');
assert.strictEqual(settings.verifiedOnly, false, 'Settings verified reset to false');
console.log(`✔ Reset filters works: restored all ${window.profileStack.length} profiles.`);

// Test 6: Header button visibility logic
const filterBtnMock = { style: { setProperty: (p, v) => { filterBtnMock.display = v; } }, classList: { add: () => {}, remove: () => {} }, display: '' };
global.document.getElementById = (id) => {
  if (id === 'discoveryFilterBtn') return filterBtnMock;
  if (id === 'appHeader') return { classList: { add: () => {}, remove: () => {} }, style: { setProperty: () => {} } };
  if (id === 'headerRight') return { style: {} };
  return { style: { setProperty: () => {} }, classList: { add: () => {}, remove: () => {} } };
};
global.AUTH_SCREENS = ['login', 'signup', 'forgot-pw'];

window.updateHeader('discovery');
assert(filterBtnMock.display.includes('flex'), 'discoveryFilterBtn must be visible on discovery screen');

window.updateHeader('matches');
assert(filterBtnMock.display.includes('none'), 'discoveryFilterBtn must be hidden on matches screen');

window.updateHeader('settings');
assert(filterBtnMock.display.includes('none'), 'discoveryFilterBtn must be hidden on settings screen');
console.log('✔ Header icon scoping works: filter button only appears on Discovery tab.');

console.log('\n🎉 ALL 6/6 DISCOVERY FILTER TESTS PASSED SUCCESSFULLY!');
process.exit(0);
