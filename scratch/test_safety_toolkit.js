const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Step 5: Safety Toolkit, Gentle Unmatch & Privacy Controls Verification...\n');

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

// TEST GROUP 1: HTML Structure for Safety Toolkit, Stealth Mode, and Gentle Unmatch
console.log('Test Group 1: HTML Structure & Modals');
check(htmlContent.includes('id="stealthModeHeaderBadge"'), 'index.html contains #stealthModeHeaderBadge in discovery header');
check(htmlContent.includes('class="stealth-pill-badge"'), 'index.html contains .stealth-pill-badge');
check(htmlContent.includes('id="chatSafetyShieldBtn"'), 'index.html contains #chatSafetyShieldBtn in chat header');
check(htmlContent.includes('onclick="openSafetyToolkit()"'), 'chatSafetyShieldBtn triggers openSafetyToolkit()');
check(htmlContent.includes('id="settingsStealthToggle"'), 'index.html contains #settingsStealthToggle in Settings screen');
check(htmlContent.includes('id="safetyToolkitModal"'), 'index.html contains #safetyToolkitModal');
check(htmlContent.includes('id="safetyToolkitTitle"'), 'index.html contains #safetyToolkitTitle');
check(htmlContent.includes('id="safetyToolkitContext"'), 'index.html contains #safetyToolkitContext');
check(htmlContent.includes('id="safetyQuickActionCards"'), 'index.html contains #safetyQuickActionCards');
check(htmlContent.includes('id="safetyStealthToggle"'), 'index.html contains #safetyStealthToggle');
check(htmlContent.includes('openGentleUnmatchModal'), 'index.html triggers openGentleUnmatchModal()');
check(htmlContent.includes('promptBlockActiveUser'), 'index.html triggers promptBlockActiveUser()');
check(htmlContent.includes('openEmergencyHelp'), 'index.html triggers openEmergencyHelp()');
check(htmlContent.includes('id="unmatchReasonModal"'), 'index.html contains #unmatchReasonModal');
check(htmlContent.includes('id="unmatchModalTitle"'), 'index.html contains #unmatchModalTitle');
check(htmlContent.includes('class="unmatch-reason-options"'), 'index.html contains .unmatch-reason-options');
check(htmlContent.includes('name="unmatchReason" value="no_spark"'), 'index.html contains no_spark reason chip');
check(htmlContent.includes('onclick="confirmUnmatch()"'), 'index.html contains confirmUnmatch() trigger');

// TEST GROUP 2: CSS Styles for Safety & Privacy
console.log('\nTest Group 2: CSS Styling & Animations');
check(cssContent.includes('.chat-shield-btn'), 'style.css defines .chat-shield-btn');
check(cssContent.includes('.stealth-pill-badge'), 'style.css defines .stealth-pill-badge');
check(cssContent.includes('@keyframes stealthPulse'), 'style.css defines @keyframes stealthPulse');
check(cssContent.includes('.safety-modal-overlay'), 'style.css defines .safety-modal-overlay');
check(cssContent.includes('.safety-modal-sheet'), 'style.css defines .safety-modal-sheet');
check(cssContent.includes('.safety-action-card'), 'style.css defines .safety-action-card');
check(cssContent.includes('.safety-privacy-card'), 'style.css defines .safety-privacy-card');
check(cssContent.includes('.safety-tips-list'), 'style.css defines .safety-tips-list');
check(cssContent.includes('.safety-emergency-btn'), 'style.css defines .safety-emergency-btn');
check(cssContent.includes('.unmatch-card'), 'style.css defines .unmatch-card');
check(cssContent.includes('.unmatch-reason-chip'), 'style.css defines .unmatch-reason-chip');
check(cssContent.includes('.unmatch-confirm-btn'), 'style.css defines .unmatch-confirm-btn');
check(cssContent.includes('[data-theme="light"] .chat-shield-btn'), 'style.css provides light theme overrides for chat-shield-btn');
check(cssContent.includes('[data-theme="light"] .safety-modal-sheet'), 'style.css provides light theme overrides for safety-modal-sheet');
check(cssContent.includes('[data-theme="light"] .unmatch-card'), 'style.css provides light theme overrides for unmatch-card');

// TEST GROUP 3: Script Function Declarations & Exports
console.log('\nTest Group 3: JavaScript Function Definitions & Window Exports');
check(scriptContent.includes('function toggleStealthMode(enabled)'), 'script.js defines toggleStealthMode');
check(scriptContent.includes('window.toggleStealthMode = toggleStealthMode'), 'script.js exports toggleStealthMode to window');
check(scriptContent.includes('function openSafetyToolkit(targetProfileId)'), 'script.js defines openSafetyToolkit');
check(scriptContent.includes('window.openSafetyToolkit = openSafetyToolkit'), 'script.js exports openSafetyToolkit to window');
check(scriptContent.includes('function closeSafetyToolkit()'), 'script.js defines closeSafetyToolkit');
check(scriptContent.includes('window.closeSafetyToolkit = closeSafetyToolkit'), 'script.js exports closeSafetyToolkit to window');
check(scriptContent.includes('function openGentleUnmatchModal(targetProfileId)'), 'script.js defines openGentleUnmatchModal');
check(scriptContent.includes('window.openGentleUnmatchModal = openGentleUnmatchModal'), 'script.js exports openGentleUnmatchModal to window');
check(scriptContent.includes('function closeGentleUnmatchModal()'), 'script.js defines closeGentleUnmatchModal');
check(scriptContent.includes('window.closeGentleUnmatchModal = closeGentleUnmatchModal'), 'script.js exports closeGentleUnmatchModal to window');
check(scriptContent.includes('function selectUnmatchReason(el)'), 'script.js defines selectUnmatchReason');
check(scriptContent.includes('window.selectUnmatchReason = selectUnmatchReason'), 'script.js exports selectUnmatchReason to window');
check(scriptContent.includes('function confirmUnmatch()'), 'script.js defines confirmUnmatch');
check(scriptContent.includes('window.confirmUnmatch = confirmUnmatch'), 'script.js exports confirmUnmatch to window');
check(scriptContent.includes('function promptBlockActiveUser()'), 'script.js defines promptBlockActiveUser');
check(scriptContent.includes('window.promptBlockActiveUser = promptBlockActiveUser'), 'script.js exports promptBlockActiveUser to window');
check(scriptContent.includes('function openEmergencyHelp()'), 'script.js defines openEmergencyHelp');
check(scriptContent.includes('window.openEmergencyHelp = openEmergencyHelp'), 'script.js exports openEmergencyHelp to window');

// TEST GROUP 4: Functional Runtime Execution Simulation
console.log('\nTest Group 4: Functional Mock Execution');

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (k) => (k in mockStorage ? mockStorage[k] : null),
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};

// Mock DOM elements
function createMockEl() {
  return {
    style: {},
    classList: {
      _classes: new Set(),
      add(c){ this._classes.add(c); },
      remove(c){ this._classes.delete(c); },
      contains(c){ return this._classes.has(c); }
    },
    textContent: '',
    checked: false,
    querySelector: () => ({ checked: false }),
    querySelectorAll: () => []
  };
}

const mockDom = {
  settingsStealthToggle: createMockEl(),
  safetyStealthToggle: createMockEl(),
  stealthModeHeaderBadge: createMockEl(),
  safetyToolkitModal: createMockEl(),
  safetyToolkitTitle: createMockEl(),
  safetyToolkitContext: createMockEl(),
  safetyQuickActionCards: createMockEl(),
  unmatchReasonModal: createMockEl(),
  unmatchModalTitle: createMockEl()
};

global.document = {
  getElementById: (id) => mockDom[id] || null,
  querySelectorAll: () => [],
  querySelector: () => null
};
global.window = {};
global.requestAnimationFrame = (fn) => fn();

let savedToStorageCount = 0;
let badgesUpdated = 0;
let matchesRendered = 0;
let screenShown = null;
let toastReceived = null;

global.saveToStorage = () => { savedToStorageCount++; };
global.updateMatchesNotificationBadge = () => { badgesUpdated++; };
global.renderMatchesView = () => { matchesRendered++; };
global.showScreen = (s) => { screenShown = s; };
global.showToast = (msg) => { toastReceived = msg; };
global.haptic = () => {};
global.escHtml = (s) => String(s || '');
global.hideChatDropdown = () => {};
global.closeProfileDetailSheet = () => {};
global.closeWhatsAppProfile = () => {};

global.appState = {
  isStealthMode: false,
  activeSafetyPartner: null,
  currentChatId: null,
  currentScreen: 'discovery'
};

global.matchedUsers = [
  { id: 'user_1', name: 'Zainab' },
  { id: 'user_2', name: 'Tunde' }
];

global.conversations = {
  user_1: { messages: [{ text: 'Hello!' }] },
  user_2: { messages: [{ text: 'Hey there' }] }
};

global.PROFILES_DATA = [
  { id: 'user_1', name: 'Zainab' },
  { id: 'user_2', name: 'Tunde' }
];

// Extract functions from scriptContent
eval(`
${scriptContent.slice(
  scriptContent.indexOf('function toggleStealthMode(enabled) {'),
  scriptContent.indexOf('// UNBLOCK & BLOCKED CONTACTS MANAGEMENT')
)}
`);

// Test 1: toggleStealthMode ON
toggleStealthMode(true);
check(appState.isStealthMode === true, 'toggleStealthMode(true) sets appState.isStealthMode to true');
check(mockStorage['hmbs_stealth_mode'] === 'true', 'Stealth mode persisted to localStorage as true');
check(mockDom.settingsStealthToggle.checked === true, 'settingsStealthToggle checked state synced');
check(mockDom.safetyStealthToggle.checked === true, 'safetyStealthToggle checked state synced');
check(mockDom.stealthModeHeaderBadge.style.display === 'inline-flex', 'stealthModeHeaderBadge displayed when on discovery screen');

// Test 2: toggleStealthMode OFF
toggleStealthMode(false);
check(appState.isStealthMode === false, 'toggleStealthMode(false) sets appState.isStealthMode to false');
check(mockStorage['hmbs_stealth_mode'] === 'false', 'Stealth mode persisted to localStorage as false');
check(mockDom.stealthModeHeaderBadge.style.display === 'none', 'stealthModeHeaderBadge hidden when mode disabled');

// Test 3: openSafetyToolkit with specific user
openSafetyToolkit('user_1');
check(appState.activeSafetyPartner && appState.activeSafetyPartner.name === 'Zainab', 'openSafetyToolkit sets activeSafetyPartner');
check(mockDom.safetyToolkitTitle.textContent.includes('Safety'), 'Toolkit title updated');
check(mockDom.safetyToolkitContext.textContent.includes('Zainab'), 'Toolkit context indicates partner name');
check(mockDom.safetyToolkitModal.style.display === 'flex', 'safetyToolkitModal display set to flex');
check(mockDom.safetyToolkitModal.classList.contains('active'), 'safetyToolkitModal given active class');

// Test 4: openGentleUnmatchModal
openGentleUnmatchModal('user_1');
check(mockDom.unmatchModalTitle.textContent.includes('Zainab'), 'Unmatch title confirms partner name');
check(mockDom.unmatchReasonModal.style.display === 'flex', 'unmatchReasonModal display set to flex');
check(mockDom.unmatchReasonModal.classList.contains('active'), 'unmatchReasonModal given active class');

// Test 5: confirmUnmatch
appState.currentScreen = 'chat';
appState.currentChatId = 'user_1';

confirmUnmatch();
check(!matchedUsers.some(u => u.id === 'user_1'), 'Partner user_1 cleanly removed from matchedUsers');
check(conversations['user_1'] === undefined, 'Conversation with user_1 deleted');
check(savedToStorageCount > 0, 'saveToStorage called on unmatch');
check(badgesUpdated > 0, 'updateMatchesNotificationBadge called on unmatch');
check(matchesRendered > 0, 'renderMatchesView called on unmatch');
check(screenShown === 'matches', 'Navigated back to matches screen after unmatching active chat');
check(toastReceived.includes('Zainab'), 'Toast notification informs user of unmatch');

console.log(`\n🎉 Verification Completed: ${passedTests}/${totalTests} tests passed!`);
if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
