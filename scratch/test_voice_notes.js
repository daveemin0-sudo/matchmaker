const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Step 4: WhatsApp-Style Voice Notes Verification...\n');

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

// TEST GROUP 1: HTML Markup for Voice Notes & Gestures
console.log('Test Group 1: HTML Elements & Gestures');
check(htmlContent.includes('id="voiceFloatingLock"'), 'index.html contains #voiceFloatingLock');
check(htmlContent.includes('class="voice-lock-icon"'), 'index.html contains .voice-lock-icon');
check(htmlContent.includes('class="voice-lock-arrow"'), 'index.html contains .voice-lock-arrow');
check(htmlContent.includes('onpointerdown="handleMicPointerDown(event)"'), '#micBtn has handleMicPointerDown');
check(htmlContent.includes('onpointermove="handleMicPointerMove(event)"'), '#micBtn has handleMicPointerMove');
check(htmlContent.includes('onpointerup="handleMicPointerUp(event)"'), '#micBtn has handleMicPointerUp');
check(htmlContent.includes('onpointercancel="handleMicPointerCancel(event)"'), '#micBtn has handleMicPointerCancel');
check(htmlContent.includes('onclick="handleMicClick(event)"'), '#micBtn has handleMicClick');
check(htmlContent.includes('id="voiceRecordBar"'), 'index.html contains #voiceRecordBar');
check(htmlContent.includes('class="voice-rec-indicator"'), 'index.html contains .voice-rec-indicator');
check(htmlContent.includes('class="voice-rec-dot"'), 'index.html contains .voice-rec-dot');
check(htmlContent.includes('id="voiceRecTimer"'), 'index.html contains #voiceRecTimer');
check(htmlContent.includes('id="voiceLiveWaveform"'), 'index.html contains #voiceLiveWaveform');
check(htmlContent.includes('id="voiceSlideHint"'), 'index.html contains #voiceSlideHint');
check(htmlContent.includes('id="voiceLockedStatus"'), 'index.html contains #voiceLockedStatus');
check(htmlContent.includes('class="voice-send-btn"'), 'index.html contains .voice-send-btn');
check(htmlContent.includes('class="voice-cancel-btn"'), 'index.html contains .voice-cancel-btn');

// TEST GROUP 2: CSS Styling
console.log('\nTest Group 2: CSS Styling & Animations');
check(cssContent.includes('.voice-floating-lock'), 'style.css defines .voice-floating-lock');
check(cssContent.includes('.voice-rec-indicator'), 'style.css defines .voice-rec-indicator');
check(cssContent.includes('.voice-rec-dot'), 'style.css defines .voice-rec-dot');
check(cssContent.includes('@keyframes recBlink'), 'style.css defines recBlink animation');
check(cssContent.includes('.voice-slide-hint'), 'style.css defines .voice-slide-hint');
check(cssContent.includes('.voice-locked-status'), 'style.css defines .voice-locked-status');
check(cssContent.includes('.msg-bubble.audio-bubble'), 'style.css defines .msg-bubble.audio-bubble');
check(cssContent.includes('.vn-waveform-wrap'), 'style.css defines .vn-waveform-wrap');
check(cssContent.includes('.vn-bar'), 'style.css defines .vn-bar');
check(cssContent.includes('.vn-bar.played'), 'style.css defines .vn-bar.played for progress fill');
check(cssContent.includes('.vn-speed-btn'), 'style.css defines .vn-speed-btn');
check(cssContent.includes('.vn-speed-btn.boosted'), 'style.css defines .vn-speed-btn.boosted');
check(cssContent.includes('.vn-avatar-badge'), 'style.css defines .vn-avatar-badge');
check(cssContent.includes('[data-theme="light"] .vn-speed-btn'), 'style.css defines light theme support for speed button');

// TEST GROUP 3: JavaScript Engine & Exports
console.log('\nTest Group 3: JavaScript Engine & Functions');
check(scriptContent.includes('function renderVoiceWaveformHtml('), 'renderVoiceWaveformHtml is defined');
check(scriptContent.includes('window.renderVoiceWaveformHtml = renderVoiceWaveformHtml'), 'renderVoiceWaveformHtml exported to window');
check(scriptContent.includes('function updateWaveformBars('), 'updateWaveformBars is defined');
check(scriptContent.includes('window.updateWaveformBars = updateWaveformBars'), 'updateWaveformBars exported to window');
check(scriptContent.includes('function toggleVoicePlaybackSpeed('), 'toggleVoicePlaybackSpeed is defined');
check(scriptContent.includes('window.toggleVoicePlaybackSpeed = toggleVoicePlaybackSpeed'), 'toggleVoicePlaybackSpeed exported to window');
check(scriptContent.includes('function seekVoiceNoteWave('), 'seekVoiceNoteWave is defined');
check(scriptContent.includes('window.seekVoiceNoteWave = seekVoiceNoteWave'), 'seekVoiceNoteWave exported to window');
check(scriptContent.includes('function handleMicPointerDown('), 'handleMicPointerDown is defined');
check(scriptContent.includes('window.handleMicPointerDown = handleMicPointerDown'), 'handleMicPointerDown exported to window');
check(scriptContent.includes('function handleMicPointerMove('), 'handleMicPointerMove is defined');
check(scriptContent.includes('window.handleMicPointerMove = handleMicPointerMove'), 'handleMicPointerMove exported to window');
check(scriptContent.includes('function handleMicPointerUp('), 'handleMicPointerUp is defined');
check(scriptContent.includes('window.handleMicPointerUp = handleMicPointerUp'), 'handleMicPointerUp exported to window');
check(scriptContent.includes('function handleMicPointerCancel('), 'handleMicPointerCancel is defined');
check(scriptContent.includes('window.handleMicPointerCancel = handleMicPointerCancel'), 'handleMicPointerCancel exported to window');
check(scriptContent.includes('function handleMicClick('), 'handleMicClick is defined');
check(scriptContent.includes('window.handleMicClick = handleMicClick'), 'handleMicClick exported to window');
check(scriptContent.includes('function _startLiveAudioVisualizer('), '_startLiveAudioVisualizer is defined');
check(scriptContent.includes('function _stopLiveAudioVisualizer('), '_stopLiveAudioVisualizer is defined');

// TEST GROUP 4: Functional Execution & Simulation
console.log('\nTest Group 4: Runtime Waveform & Speed Simulation');

// Mock DOM & environment
const mockWaveWrap = {
  bars: [],
  querySelectorAll(sel) { return this.bars; }
};

for (let i = 0; i < 28; i++) {
  mockWaveWrap.bars.push({
    classList: {
      classes: new Set(),
      add(c){ this.classes.add(c); },
      remove(c){ this.classes.delete(c); },
      contains(c){ return this.classes.has(c); }
    },
    style: {}
  });
}

global.document = {
  getElementById: (id) => {
    if (id.startsWith('vnWave_')) return mockWaveWrap;
    if (id.startsWith('voiceBubble_')) {
      return {
        querySelector: (sel) => ({
          textContent: '1x',
          classList: { toggle: () => {} }
        })
      };
    }
    return null;
  }
};
global.window = {};
global.haptic = () => {};
global._currentVoiceAudio = null;
global._currentPlayingVoiceMsgId = null;
global._voicePlaybackRate = 1.0;

// Evaluate waveform and speed functions
eval(`
${scriptContent.slice(
  scriptContent.indexOf('function renderVoiceWaveformHtml('),
  scriptContent.indexOf('function resetVoiceNoteUi(')
)}
`);

const waveHtml = renderVoiceWaveformHtml('msg_audio_test_1', 999, 28);
check(waveHtml.includes('class="vn-waveform-wrap"'), 'renderVoiceWaveformHtml returns wrap container');
check(waveHtml.includes('id="vnWave_msg_audio_test_1"'), 'renderVoiceWaveformHtml has correct ID');
const barMatches = waveHtml.match(/class="vn-bar"/g) || [];
check(barMatches.length === 28, 'renderVoiceWaveformHtml generates exactly 28 vertical bars');
check(waveHtml.includes('style="height:'), 'Each bar has an individual vertical height');

// Test updateWaveformBars at 50%
updateWaveformBars('msg_audio_test_1', 0.5);
const playedCount = mockWaveWrap.bars.filter(b => b.classList.contains('played')).length;
check(playedCount >= 13 && playedCount <= 15, `50% playback lights up half the bars (actual: ${playedCount}/28)`);

// Test updateWaveformBars at 100%
updateWaveformBars('msg_audio_test_1', 1.0);
const allPlayedCount = mockWaveWrap.bars.filter(b => b.classList.contains('played')).length;
check(allPlayedCount === 28, '100% playback lights up all 28 bars');

// Test updateWaveformBars at 0%
updateWaveformBars('msg_audio_test_1', 0);
const zeroPlayedCount = mockWaveWrap.bars.filter(b => b.classList.contains('played')).length;
check(zeroPlayedCount === 0, '0% playback resets all bars');

// Test speed cycling
_voicePlaybackRate = 1.0;
toggleVoicePlaybackSpeed(null, 'msg_audio_test_1');
check(_voicePlaybackRate === 1.5, 'Speed cycles from 1.0x to 1.5x');
toggleVoicePlaybackSpeed(null, 'msg_audio_test_1');
check(_voicePlaybackRate === 2.0, 'Speed cycles from 1.5x to 2.0x');
toggleVoicePlaybackSpeed(null, 'msg_audio_test_1');
check(_voicePlaybackRate === 1.0, 'Speed cycles from 2.0x back to 1.0x');

console.log(`\n🎉 Verification Completed: ${passedTests}/${totalTests} tests passed!`);
if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
