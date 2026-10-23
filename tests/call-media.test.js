/* Call media failure detection: runs the real wireCallPeerConnection / failCallMedia from
   script.js in a sandbox with a fake RTCPeerConnection and a controllable clock. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync(require('node:path').join(__dirname, '..', 'script.js'), 'utf8');

function extract(startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  const b = src.indexOf(endMarker, a + startMarker.length);
  assert.ok(a !== -1 && b !== -1, `could not find ${startMarker}`);
  return src.slice(a, b);
}

const failSrc = extract('function failCallMedia(', 'async function refreshTurnCredentials');
const wireSrc = extract('async function wireCallPeerConnection(', '\nasync function ');

function sandbox({ relay = false } = {}) {
  const timers = [];
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    toasts: [], uiStates: [], endCalls: [],
    setTimeout: (fn, ms) => { const t = { fn, ms, cleared: false }; timers.push(t); return t; },
    clearTimeout: (t) => { if (t) t.cleared = true; },
    localStorage: { getItem: () => null },
    document: { getElementById: () => null },
    navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) } },
    fbAuth: { currentUser: { uid: 'me' } },
    currentFacingMode: 'user',
    activePeerConnection: null,
    activeMediaStream: null,
    activeCandidateListener: null,
    pendingRemoteCandidates: [],
    _turnRelayLoaded: relay,
    getVideoCallConstraints: () => ({}),
    setCallMediaStream() {},
  };
  ctx.updateCallUi = (type, st) => ctx.uiStates.push(st);
  ctx.showToast = (msg, kind) => ctx.toasts.push({ msg, kind });
  ctx.endCall = (toast, status) => { ctx.endCalls.push(status || null); ctx.activePeerConnection = null; };
  vm.createContext(ctx);
  vm.runInContext(`${failSrc}\n${wireSrc}`, ctx);
  // Fire every pending, uncleared timer whose delay is at most ms.
  ctx.advance = (ms) => {
    let ran = true;
    while (ran) {
      ran = false;
      for (const t of timers) {
        if (!t.cleared && !t.done && t.ms <= ms) { t.done = true; ran = true; t.fn(); }
      }
    }
  };
  return ctx;
}

async function wiredCall(ctx) {
  const pc = {
    iceConnectionState: 'new',
    addTrack() {}, getSenders: () => [],
    addIceCandidate: async () => {},
  };
  const callRef = { collection: () => ({ add: async () => {}, onSnapshot: () => () => {} }) };
  ctx.activePeerConnection = pc;
  await ctx.wireCallPeerConnection('audio', pc, callRef);
  pc.set = (st) => { pc.iceConnectionState = st; pc.oniceconnectionstatechange(); };
  return pc;
}

test('media that never connects ends the call as failed after the timeout, once', async () => {
  const ctx = sandbox();
  const pc = await wiredCall(ctx);
  pc.set('checking');
  ctx.advance(20000);
  pc.set('failed'); // ICE gives up after the timeout already reported it
  ctx.advance(20000);
  assert.equal(ctx.toasts.length, 1, 'only one error toast');
  assert.match(ctx.toasts[0].msg, /different networks/);
  assert.deepEqual(ctx.endCalls, ['failed']);
});

test('the message says a relay was present when one was loaded', async () => {
  const ctx = sandbox({ relay: true });
  const pc = await wiredCall(ctx);
  pc.set('checking');
  pc.set('failed');
  ctx.advance(20000);
  assert.equal(ctx.toasts.length, 1);
  assert.match(ctx.toasts[0].msg, /no audio or video could pass/);
  assert.deepEqual(ctx.endCalls, ['failed']);
});

test('a call whose media connects is not ended by the timer', async () => {
  const ctx = sandbox();
  const pc = await wiredCall(ctx);
  pc.set('checking');
  pc.set('connected');
  ctx.advance(60000);
  assert.equal(ctx.toasts.length, 0);
  assert.deepEqual(ctx.endCalls, []);
});

test('a connected call that later drops keeps its duration (not logged as failed)', async () => {
  const ctx = sandbox();
  const pc = await wiredCall(ctx);
  pc.set('checking');
  pc.set('connected');
  pc.set('disconnected');
  pc.set('failed');
  ctx.advance(20000);
  assert.equal(ctx.uiStates.at(-1), 'Connection lost');
  assert.deepEqual(ctx.endCalls, [null]);
});

test('a call already ended by the user is not reported as a failure', async () => {
  const ctx = sandbox();
  const pc = await wiredCall(ctx);
  pc.set('checking');
  ctx.activePeerConnection = null; // user hung up
  ctx.advance(20000);
  assert.equal(ctx.toasts.length, 0);
  assert.deepEqual(ctx.endCalls, []);
});

test('failed calls are logged and rendered as "didn\'t connect", with no duration', () => {
  assert.match(src, /durationSeconds: status === 'failed' \? 0 : seconds/);
  assert.match(src, /status === 'failed'\) \{\s*displayText = `\$\{isVideo \? 'Video' : 'Voice'\} call didn't connect`/);
  assert.match(src, /const isFailed = msg\.callStatus === 'failed';/);
  assert.match(src, /last\.callStatus === 'failed'/);
});
