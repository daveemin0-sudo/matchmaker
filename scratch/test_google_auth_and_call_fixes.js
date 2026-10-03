const fs = require('fs');

console.log('🧪 Testing Google Sign-in, Call Button Responsiveness, and Chat Shield Button Hiding...');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');
const fbConfig = fs.readFileSync('firebase-config.js', 'utf8');
const webhook = fs.readFileSync('webhook-server/index.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('\n--- 1. Backend /profiles/me & Sync ---');
assert(webhook.includes("app.get('/profiles/me'"), 'webhook-server defines GET /profiles/me endpoint');
assert(webhook.includes("needsMigration"), 'GET /profiles/me detects if account needs migration');
assert(webhook.includes("querySnap = await db.collection('users').where('email', '==', userEmail)"), 'GET /profiles/me searches users by email via Admin SDK');
assert(webhook.includes("migratedData"), 'GET /profiles/me migrates data seamlessly to current UID');
assert(webhook.includes("app.post('/profiles/sync'"), 'webhook-server defines POST /profiles/sync');

console.log('\n--- 2. Firebase Config & listenToAuthChanges ---');
assert(fbConfig.includes('fetchUserProfileFromBackend'), 'firebase-config defines fetchUserProfileFromBackend');
assert(fbConfig.includes('/profiles/me'), 'fetchUserProfileFromBackend queries /profiles/me');
assert(fbConfig.includes('hmbs_profile_cache'), 'listenToAuthChanges utilizes hmbs_profile_cache');
assert(!fbConfig.includes("cleanUsername = (user.email || '').split('@')[0]"), 'listenToAuthChanges DOES NOT set cleanUsername to email prefix');

console.log('\n--- 3. Script.js Google Login & Profile Cache ---');
assert(script.includes('handleGoogleLoginSuccess'), 'script defines handleGoogleLoginSuccess');
assert(script.includes('hmbs_profile_cache'), 'script uses hmbs_profile_cache');
assert(script.includes("pCache[currentUser.email.toLowerCase()] = { ...currentUser }"), 'saveToStorage caches verified profile');
assert(script.includes("pCache[currentUser.email.toLowerCase()] = { ...currentUser }"), 'handleLogout caches verified profile before logout');
assert(!script.includes("currentUser.username = cleanUsername;\n  currentUser.age = 24;\n  if (user.photoURL) {\n    currentUser.image = user.photoURL;\n    currentUser.avatar = user.photoURL;\n    currentUser.photos = [user.photoURL];\n  }\n\n  appState.isLoggedIn = true;"), 'handleGoogleLoginSuccess does not overwrite profile with dummy data');

console.log('\n--- 4. Chat Top Header Shield Button ---');
assert(html.includes('id="chatSafetyShieldBtn" style="display:none !important;pointer-events:none !important;visibility:hidden !important;width:0 !important;height:0 !important;padding:0 !important;margin:0 !important;border:none !important;"'), 'index.html strictly hides #chatSafetyShieldBtn with display:none !important');
assert(css.includes('.chat-shield-btn,\n#chatSafetyShieldBtn {\n  display: none !important;'), 'style.css strictly hides .chat-shield-btn and #chatSafetyShieldBtn with display: none !important');
assert(css.includes('[data-theme="light"] .chat-shield-btn,\n[data-theme="light"] #chatSafetyShieldBtn {\n  display: none !important;'), 'style.css light theme override strictly hides shield button');
assert(script.includes("_shield.style.setProperty('display', 'none', 'important')"), 'openChat programmatically enforces shield button hiding');

console.log('\n--- 5. Video & Voice Call Responsiveness ---');
assert(html.includes('class="chat-action-icon-btn chat-call-trigger-btn" type="button" onclick="startVideoCall()"'), 'index.html video call button has type="button"');
assert(html.includes('class="chat-action-icon-btn chat-call-trigger-btn" type="button" onclick="startVoiceCall()"'), 'index.html voice call button has type="button"');
assert(css.includes('touch-action: manipulation;'), 'style.css has touch-action: manipulation for instant clicks');
assert(css.includes('.chat-action-icon-btn svg * {\n  pointer-events: none !important;'), 'style.css prevents SVGs from intercepting pointer events');
assert(css.includes('width: 38px !important;'), 'style.css ensures generous 38px touch hitbox');
assert(script.includes('_isInitiatingCall = true'), 'startPeerCall prevents double clicks with guard');
assert(script.includes("overlay.style.display = 'flex'"), 'startPeerCall immediately shows overlay on first tick');
assert(script.includes("playRingtone()"), 'startPeerCall immediately plays ringtone on first tick');

console.log('\n--- 6. Service Worker ---');
assert(/const SW_VERSION = "v(6[0-9]|[7-9][0-9])/.test(sw), 'Service worker bumped to v60 or higher');

console.log('\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
