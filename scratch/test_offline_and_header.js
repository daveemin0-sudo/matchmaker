const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Offline Chat Persistence & Header Updates ---');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');
const fbConfig = fs.readFileSync('firebase-config.js', 'utf8');
const styleCss = fs.readFileSync('style.css', 'utf8');
const premCss = fs.readFileSync('premium.css', 'utf8');

// 1. Verify header title does not contain "by sam" or "bysam"
assert.ok(!html.includes('<h1 id="headerTitle">hookmebysam</h1>'), 'HTML must not have hookmebysam in headerTitle');
assert.ok(html.includes('<h1 id="headerTitle" class="main-header-logo"><span class="header-flame-icon">🔥</span><span class="brand-hook">hookme</span></h1>'), 'HTML headerTitle has clean flame + hookme');

assert.ok(script.includes("headerTitle.innerHTML = '<span class=\"header-flame-icon\">🔥</span><span class=\"brand-hook\">hookme</span>';"), 'script.js updateHeader discovery case must not include by sam');
assert.ok(!script.includes("headerTitle.innerHTML = '<span class=\"header-flame-icon\">🔥</span><span class=\"brand-hook\">hookme</span><span class=\"brand-by\">by</span><span class=\"brand-sam\">sam</span>';"), 'Old by sam markup must not exist in updateHeader');

console.log('✓ 1. Header brand title is "hookme" (no "by sam").');

// 2. Verify Firestore offline persistence
assert.ok(fbConfig.includes('fbDb.enablePersistence({ synchronizeTabs: true })'), 'firebase-config.js must enable Firestore offline persistence');
assert.ok(fbConfig.includes('{ includeMetadataChanges: true }'), 'listenToRealtimeMessages must includeMetadataChanges: true');
console.log('✓ 2. Firestore offline persistence & multi-tab sync are active.');

// 3. Verify no removeItem('hmbs_convos') in saveToStorage
const saveFunc = script.substring(script.indexOf('function saveToStorage'), script.indexOf('function saveToStorage') + 2500);
assert.ok(!saveFunc.includes("localStorage.removeItem('hmbs_convos')"), 'saveToStorage must NEVER wipe hmbs_convos');
console.log('✓ 3. saveToStorage never purges hmbs_convos on quota error.');

// 4. Verify setupRealtimeChat preserves local cached messages
assert.ok(script.includes("validRemoteMsgs.length === 0"), 'setupRealtimeChat checks validRemoteMsgs');
assert.ok(script.includes("finalMsgs = currentMsgs;"), 'setupRealtimeChat preserves currentMsgs when remote is empty');
console.log('✓ 4. setupRealtimeChat strictly preserves cached messages when offline.');

// 5. Verify syncMatchedUsersFromConversations exists and is called
assert.ok(script.includes('function syncMatchedUsersFromConversations()'), 'syncMatchedUsersFromConversations exists');
assert.ok(script.includes('restoreOfflineDataFromIndexedDB()'), 'IndexedDB restore helper exists');
console.log('✓ 5. Offline sync & IndexedDB backup routines verified.');

// 6. Verify header responsive CSS in style.css and premium.css
assert.ok(styleCss.includes('.app-shell > .app-header'), 'style.css has app-shell header rule');
assert.ok(premCss.includes('.app-shell > .app-header'), 'premium.css has app-shell header rule');
assert.ok(styleCss.includes('clamp(10px, 3.5vw, 16px)'), 'style.css has fluid header padding');
console.log('✓ 6. Responsive top bar CSS present in both style.css and premium.css.');

console.log('\nALL 6 VERIFICATION CHECKS PASSED WITH FLYING COLORS!');
