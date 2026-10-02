const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Step 2: Deep Profile Details Expansion Sheet Verification...\n');

// 1. Check PROFILES_DATA enrichment in script.js
const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const cssPath = path.join(__dirname, '..', 'style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

let passedTests = 0;
let totalTests = 0;

function check(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✕ FAILED: ${message}`);
    process.exitCode = 1;
  }
}

// TEST 1: PROFILES_DATA has rich lifestyle & prompt fields
console.log('Test Group 1: PROFILES_DATA Schema Enrichment');
check(scriptContent.includes("occupation: 'Product Designer @ Paystack'"), 'p1 Zainab has occupation');
check(scriptContent.includes("education: 'University of Lagos (Unilag)'"), 'p1 Zainab has education');
check(scriptContent.includes("location: 'Lekki Phase 1, Lagos'"), 'p1 Zainab has location');
check(scriptContent.includes("height: '5\\'7\" (170 cm)'"), 'p1 Zainab has height');
check(scriptContent.includes("zodiac: 'Scorpio ♏'"), 'p1 Zainab has zodiac');
check(scriptContent.includes("drinking: 'Socially 🍷'"), 'p1 Zainab has drinking habit');
check(scriptContent.includes("smoking: 'Non-smoker 🚭'"), 'p1 Zainab has smoking habit');
check(scriptContent.includes("workout: 'Active (Pilates & Gym) 🧘'"), 'p1 Zainab has workout');
check(scriptContent.includes('prompts: ['), 'PROFILES_DATA has prompts array');
check(scriptContent.includes("question: 'My simple pleasures...'"), 'PROFILES_DATA includes Hinge-style prompt questions');

// TEST 2: HTML Structure for #profileDetailModal
console.log('\nTest Group 2: HTML Modal Structure');
check(htmlContent.includes('id="profileDetailModal"'), 'index.html contains #profileDetailModal');
check(htmlContent.includes('class="profile-detail-sheet"'), 'index.html contains .profile-detail-sheet');
check(htmlContent.includes('id="detailSheetContent"'), 'index.html contains #detailSheetContent');
check(htmlContent.includes('id="detailSheetActionsBar"'), 'index.html contains #detailSheetActionsBar');
check(htmlContent.includes('class="detail-act-btn detail-pass-btn"'), 'index.html contains pass action button');
check(htmlContent.includes('class="detail-act-btn detail-super-btn"'), 'index.html contains super like action button');
check(htmlContent.includes('class="detail-act-btn detail-like-btn"'), 'index.html contains like action button');

// TEST 3: CSS Styles for Sheet & Triggers
console.log('\nTest Group 3: CSS Styling Integration');
check(cssContent.includes('.card-info-btn'), 'style.css defines .card-info-btn');
check(cssContent.includes('.profile-detail-overlay'), 'style.css defines .profile-detail-overlay');
check(cssContent.includes('.profile-detail-sheet'), 'style.css defines .profile-detail-sheet');
check(cssContent.includes('.detail-hero-photo-wrap'), 'style.css defines .detail-hero-photo-wrap');
check(cssContent.includes('.detail-prompt-card'), 'style.css defines .detail-prompt-card');
check(cssContent.includes('.detail-basics-grid'), 'style.css defines .detail-basics-grid');
check(cssContent.includes('.profile-detail-actions-bar'), 'style.css defines .profile-detail-actions-bar');
check(cssContent.includes('[data-theme="light"] .profile-detail-sheet'), 'style.css supports light theme for profile sheet');

// TEST 4: Function Definitions in Script
console.log('\nTest Group 4: Function Declarations & Card Triggers');
check(scriptContent.includes('function openProfileDetailSheet('), 'openProfileDetailSheet is defined');
check(scriptContent.includes('function closeProfileDetailSheet('), 'closeProfileDetailSheet is defined');
check(scriptContent.includes('function actionFromDetailSheet('), 'actionFromDetailSheet is defined');
check(scriptContent.includes('window.openProfileDetailSheet = openProfileDetailSheet'), 'openProfileDetailSheet exported to window');
check(scriptContent.includes('window.closeProfileDetailSheet = closeProfileDetailSheet'), 'closeProfileDetailSheet exported to window');
check(scriptContent.includes('window.actionFromDetailSheet = actionFromDetailSheet'), 'actionFromDetailSheet exported to window');
check(scriptContent.includes('class="card-info-btn"'), 'buildProfileCard includes .card-info-btn');
check(scriptContent.includes('openProfileDetailSheet(p.id, e)'), 'card-info click listener triggers openProfileDetailSheet');

// TEST 5: Simulated DOM Execution
console.log('\nTest Group 5: Execution Simulation');
const mockElements = {
  profileDetailModal: {
    style: { display: 'none' },
    classList: {
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); },
      _classes: new Set()
    },
    querySelector: function(sel) {
      if (sel === '.profile-detail-sheet') return mockElements.sheet;
      return null;
    }
  },
  sheet: {
    classList: {
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); },
      _classes: new Set()
    }
  },
  detailSheetContent: {
    innerHTML: '',
    scrollTop: 0
  }
};

global.window = global;
global.document = {
  getElementById: (id) => mockElements[id] || null,
  body: { style: { overflow: '' } }
};
global.appState = { activeDetailProfileId: null };
global.requestAnimationFrame = (cb) => cb();
global.haptic = () => {};
global.showToast = () => {};
global.escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
global.getDynamicProfileDistance = (p) => p.distance || '2 km away';

// Run simulated openProfileDetailSheet with a sample profile
const sampleProfile = {
  id: 'test_p1',
  name: 'Zainab',
  age: 22,
  occupation: 'Product Designer @ Paystack',
  education: 'University of Lagos (Unilag)',
  location: 'Lekki Phase 1, Lagos',
  height: '5\'7" (170 cm)',
  zodiac: 'Scorpio ♏',
  drinking: 'Socially 🍷',
  smoking: 'Non-smoker 🚭',
  workout: 'Active (Pilates & Gym) 🧘',
  tags: ['Amapiano 🎵', 'Travel ✈️', 'Coffee ☕'],
  bio: 'Tech lover, massive music head.',
  image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04'],
  prompts: [
    { question: 'My simple pleasures...', answer: 'Warm cinnamon rolls and rain on Sunday morning.' }
  ],
  isVerified: true,
  intent: 'dating'
};

global.profileStack = [sampleProfile];
global.PROFILES_DATA = [sampleProfile];

// Extract and evaluate the sheet functions from scriptContent
const openFnMatch = scriptContent.match(/function openProfileDetailSheet\([\s\S]*?^window\.openProfileDetailSheet = openProfileDetailSheet;/m);
const closeFnMatch = scriptContent.match(/function closeProfileDetailSheet\([\s\S]*?^window\.closeProfileDetailSheet = closeProfileDetailSheet;/m);
const actionFnMatch = scriptContent.match(/function actionFromDetailSheet\([\s\S]*?^window\.actionFromDetailSheet = actionFromDetailSheet;/m);

check(!!openFnMatch, 'Extracted openProfileDetailSheet successfully');
check(!!closeFnMatch, 'Extracted closeProfileDetailSheet successfully');
check(!!actionFnMatch, 'Extracted actionFromDetailSheet successfully');

eval(openFnMatch[0]);
eval(closeFnMatch[0]);
eval(actionFnMatch[0]);

openProfileDetailSheet('test_p1');
check(mockElements.profileDetailModal.style.display === 'flex', 'Modal display is set to flex');
check(mockElements.profileDetailModal.classList.contains('open'), 'Modal gets open class');
check(mockElements.sheet.classList.contains('open'), 'Sheet gets open class');
check(mockElements.detailSheetContent.innerHTML.includes('Zainab'), 'Content contains Zainab');
check(mockElements.detailSheetContent.innerHTML.includes('Product Designer @ Paystack'), 'Content contains occupation');
check(mockElements.detailSheetContent.innerHTML.includes('University of Lagos (Unilag)'), 'Content contains education');
check(mockElements.detailSheetContent.innerHTML.includes('Scorpio ♏'), 'Content contains zodiac');
check(mockElements.detailSheetContent.innerHTML.includes('My simple pleasures...'), 'Content contains prompt question');
check(mockElements.detailSheetContent.innerHTML.includes('Warm cinnamon rolls'), 'Content contains prompt answer');
check(global.appState.activeDetailProfileId === 'test_p1', 'Active detail profile ID is set');

closeProfileDetailSheet();
check(!mockElements.sheet.classList.contains('open'), 'Sheet open class removed on close');
check(!mockElements.profileDetailModal.classList.contains('open'), 'Modal open class removed on close');

console.log(`\n========================================`);
console.log(`Verification Summary: ${passedTests}/${totalTests} tests passed`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  console.log('🎉 ALL TESTS PASSED! Step 2 Implementation Verified!');
} else {
  process.exitCode = 1;
}
