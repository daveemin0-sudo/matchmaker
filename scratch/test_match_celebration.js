const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Step 3: Match Celebration Screen & Smart Icebreakers Verification...\n');

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

// TEST GROUP 1: HTML Markup for Match Celebration Modal
console.log('Test Group 1: HTML Celebration Modal Structure');
check(htmlContent.includes('id="matchPopup"'), 'index.html contains #matchPopup');
check(htmlContent.includes('class="match-popup-scroll"'), 'index.html contains .match-popup-scroll for responsive mobile scrolling');
check(htmlContent.includes('id="matchPopupTitle"'), 'index.html contains #matchPopupTitle');
check(htmlContent.includes('id="matchCompatBadge"'), 'index.html contains #matchCompatBadge');
check(htmlContent.includes('class="match-avatars-wrap"'), 'index.html contains .match-avatars-wrap');
check(htmlContent.includes('class="match-pulse-ring me-ring"'), 'index.html contains .match-pulse-ring.me-ring');
check(htmlContent.includes('class="match-pulse-ring them-ring"'), 'index.html contains .match-pulse-ring.them-ring');
check(htmlContent.includes('id="matchMePhoto"'), 'index.html contains #matchMePhoto');
check(htmlContent.includes('id="matchThemPhoto"'), 'index.html contains #matchThemPhoto');
check(htmlContent.includes('class="match-heart"'), 'index.html contains .match-heart');
check(htmlContent.includes('id="matchPopupName"'), 'index.html contains #matchPopupName');
check(htmlContent.includes('id="matchIcebreakerContainer"'), 'index.html contains #matchIcebreakerContainer');
check(htmlContent.includes('id="matchIcebreakerChips"'), 'index.html contains #matchIcebreakerChips');
check(htmlContent.includes('id="matchQuickComposer"'), 'index.html contains #matchQuickComposer');
check(htmlContent.includes('id="matchQuickInput"'), 'index.html contains #matchQuickInput');
check(htmlContent.includes('id="matchQuickSendBtn"'), 'index.html contains #matchQuickSendBtn');
check(htmlContent.includes('id="matchChatBtn"'), 'index.html contains #matchChatBtn');
check(htmlContent.includes('class="outline-btn match-keep-swiping-btn"'), 'index.html contains .match-keep-swiping-btn');

// TEST GROUP 2: CSS Styles & Animations
console.log('\nTest Group 2: CSS Styling & Responsive Animations');
check(cssContent.includes('.match-popup {'), 'style.css defines .match-popup');
check(cssContent.includes('z-index: 100000 !important;'), '.match-popup has top z-index');
check(cssContent.includes('backdrop-filter: blur(18px)'), '.match-popup has luxury frosted backdrop-filter');
check(cssContent.includes('.match-popup-scroll {'), 'style.css defines .match-popup-scroll');
check(cssContent.includes('max-height: 94vh;'), '.match-popup-scroll prevents off-screen overflow on 320px+ viewports');
check(cssContent.includes('.match-compat-badge {'), 'style.css defines .match-compat-badge');
check(cssContent.includes('.match-pulse-ring {'), 'style.css defines .match-pulse-ring');
check(cssContent.includes('@keyframes ringPulse {'), 'style.css defines keyframes ringPulse');
check(cssContent.includes('.match-icebreaker-chip {'), 'style.css defines .match-icebreaker-chip');
check(cssContent.includes('.match-quick-composer {'), 'style.css defines .match-quick-composer');
check(cssContent.includes('.match-quick-send-btn {'), 'style.css defines .match-quick-send-btn');
check(cssContent.includes('.match-chat-btn {'), 'style.css defines .match-chat-btn');
check(cssContent.includes('.match-keep-swiping-btn {'), 'style.css defines .match-keep-swiping-btn');

// TEST GROUP 3: Core JavaScript Methods
console.log('\nTest Group 3: JavaScript Methods & Functions');
check(scriptContent.includes('function triggerMatchPopup('), 'triggerMatchPopup function is defined');
check(scriptContent.includes('window.triggerMatchPopup = triggerMatchPopup'), 'triggerMatchPopup exported to window');
check(scriptContent.includes('function closeMatchPopup('), 'closeMatchPopup function is defined');
check(scriptContent.includes('window.closeMatchPopup = closeMatchPopup'), 'closeMatchPopup exported to window');
check(scriptContent.includes('function goToChatFromMatch('), 'goToChatFromMatch function is defined');
check(scriptContent.includes('window.goToChatFromMatch = goToChatFromMatch'), 'goToChatFromMatch exported to window');
check(scriptContent.includes('function selectIcebreakerInMatch('), 'selectIcebreakerInMatch function is defined');
check(scriptContent.includes('window.selectIcebreakerInMatch = selectIcebreakerInMatch'), 'selectIcebreakerInMatch exported to window');
check(scriptContent.includes('function sendQuickMessageFromMatch('), 'sendQuickMessageFromMatch function is defined');
check(scriptContent.includes('window.sendQuickMessageFromMatch = sendQuickMessageFromMatch'), 'sendQuickMessageFromMatch exported to window');
check(scriptContent.includes("p.shape === 'heart'"), 'launchMatchConfetti supports floating heart particles');

// TEST GROUP 4: Functional Execution with Mock DOM
console.log('\nTest Group 4: Runtime Mock Execution');
const mockElements = {
  matchPopup: { style: {}, classList: { classes: new Set(), add(c){this.classes.add(c)}, remove(c){this.classes.delete(c)}, contains(c){return this.classes.has(c)} } },
  matchMePhoto: { style: {} },
  matchThemPhoto: { style: {} },
  matchPopupName: { textContent: '' },
  matchPopupDesc: { textContent: '' },
  matchCompatBadge: { textContent: '' },
  matchChatBtn: { textContent: '' },
  matchQuickInput: { value: '', placeholder: '', style: {}, focus() {} },
  matchIcebreakerChips: { innerHTML: '' }
};

global.document = {
  getElementById: (id) => mockElements[id] || null
};
global.window = {};
global.requestAnimationFrame = (fn) => fn();
global.escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
global.safeCssUrl = (u) => String(u || '').replace(/["'()]/g, '');

let savedStorage = false;
let updatedBadge = false;
let chatOpenedId = null;
let toastMsg = null;

global.appState = { activeMatchProfile: null };
global.currentUser = { name: 'Amina', image: 'https://example.com/me.jpg' };
global.matchedUsers = [];
global.conversations = {};
global.saveToStorage = () => { savedStorage = true; };
global.updateMatchesNotificationBadge = () => { updatedBadge = true; };
global.renderMatchesView = () => {};
global.openChat = (id) => { chatOpenedId = id; };
global.showToast = (msg) => { toastMsg = msg; };
global.haptic = () => {};
global.launchMatchConfetti = () => {};

// Evaluate triggerMatchPopup logic
eval(`
${scriptContent.slice(
  scriptContent.indexOf('function triggerMatchPopup(profile) {'),
  scriptContent.indexOf('// MATCHES & CONVERSATIONS')
)}
`);

const testProfile = {
  id: 'user_test_99',
  name: 'Amara K.',
  image: 'https://example.com/amara.jpg',
  tags: ['Tech & Design', 'Foodie']
};

triggerMatchPopup(testProfile);

check(mockElements.matchPopup.style.display === 'flex', 'triggerMatchPopup sets popup display to flex');
check(mockElements.matchPopup.classList.contains('open'), 'triggerMatchPopup adds .open class');
check(mockElements.matchMePhoto.style.backgroundImage.includes('https://example.com/me.jpg'), 'User photo is set');
check(mockElements.matchThemPhoto.style.backgroundImage.includes('https://example.com/amara.jpg'), 'Partner photo is set');
check(mockElements.matchPopupName.textContent === 'Amara K.', 'Partner name is set');
check(mockElements.matchCompatBadge.textContent.includes('Tech & Design'), 'Shared tag is reflected in compatibility badge');
check(mockElements.matchChatBtn.textContent === '💬 Chat with Amara K.', 'Chat button text reflects partner name');
check(mockElements.matchIcebreakerChips.innerHTML.includes('match-icebreaker-chip'), 'Icebreaker chips are rendered');
check(appState.activeMatchProfile.id === 'user_test_99', 'Active match profile is tracked in appState');
check(matchedUsers.some(u => u.id === 'user_test_99'), 'Partner added to matchedUsers list');

// Test selecting an icebreaker
selectIcebreakerInMatch("What's your favorite spot in town?");
check(mockElements.matchQuickInput.value === "What's your favorite spot in town?", 'selectIcebreakerInMatch populates quick input');

// Test sending the quick message
sendQuickMessageFromMatch();
check(conversations['user_test_99'] && conversations['user_test_99'].messages.length === 1, 'Quick message written to conversation history');
check(conversations['user_test_99'].messages[0].text === "What's your favorite spot in town?", 'Sent message content matches icebreaker input');
check(savedStorage === true, 'saveToStorage called when message is sent');

console.log(`\n🎉 Verification Completed: ${passedTests}/${totalTests} tests passed!`);
if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
