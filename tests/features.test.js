const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('premium.css', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');

test('in-chat AI assistant and tap-to-retry message failure states exist', () => {
  assert.ok(html.includes('id="chatAiSuggestionsPanel"'), 'Missing chatAiSuggestionsPanel');
  assert.ok(html.includes('id="chatAiAssistBtn"'), 'Missing chatAiAssistBtn');
  assert.ok(css.includes('.msg-failed-retry-bar'), 'Missing .msg-failed-retry-bar CSS');
  assert.ok(css.includes('.chat-ai-suggestions-panel'), 'Missing .chat-ai-suggestions-panel CSS');
  assert.ok(js.includes('function retryFailedMessage'), 'Missing retryFailedMessage');
  assert.ok(js.includes('function toggleChatAiAssistant'), 'Missing toggleChatAiAssistant');
});

test('5-step conversational onboarding and relationship intent exist', () => {
  assert.ok(html.includes('id="obStep3"'), 'Missing obStep3');
  assert.ok(html.includes('id="obIntentGrid"'), 'Missing obIntentGrid');
  assert.ok(html.includes('id="signupIntentGrid"'), 'Missing signupIntentGrid');
  assert.ok(css.includes('.ob-intent-card'), 'Missing .ob-intent-card CSS');
  assert.ok(js.includes('selectObIntent'), 'Missing selectObIntent');
  assert.ok(js.includes('selectSignupIntent'), 'Missing selectSignupIntent');
});

test("Today's Top Pick daily curated recommendation card exists", () => {
  assert.ok(html.includes('id="todayTopPickCard"'), 'Missing todayTopPickCard');
  assert.ok(html.includes('id="topPickCompatPill"'), 'Missing topPickCompatPill');
  assert.ok(css.includes('.today-top-pick-card'), 'Missing .today-top-pick-card CSS');
  assert.ok(js.includes('function renderTodayTopPick'), 'Missing renderTodayTopPick');
  assert.ok(js.includes('function openTopPickDetail'), 'Missing openTopPickDetail');
});

test('live network connectivity banner exists with auto-reconnect handling', () => {
  assert.ok(html.includes('id="networkStatusBanner"'), 'Missing networkStatusBanner');
  assert.ok(css.includes('.network-status-banner.offline'), 'Missing .network-status-banner.offline CSS');
  assert.ok(css.includes('.network-status-banner.online'), 'Missing .network-status-banner.online CSS');
  assert.ok(js.includes('function updateNetworkStatus'), 'Missing updateNetworkStatus');
  assert.ok(js.includes('function retryNetworkConnection'), 'Missing retryNetworkConnection');
});
