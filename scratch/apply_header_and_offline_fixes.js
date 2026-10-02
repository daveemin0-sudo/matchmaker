const fs = require('fs');

console.log('--- Applying Top Bar & Offline Chat Persistence Fixes ---');

// ========================================================
// 1. UPDATE firebase-config.js
// ========================================================
let fbConfig = fs.readFileSync('firebase-config.js', 'utf8');

// Enable persistence in initBackend
const oldInitTarget = `fbDb = firebase.firestore();\n      fbStorage = firebase.storage();\n      console.log("🔥 Firebase initialized — project:", firebaseConfig.projectId);`;
const newInitTarget = `fbDb = firebase.firestore();
      // Enable Firestore offline persistence so conversations & matches are cached locally in IndexedDB
      if (fbDb && typeof fbDb.enablePersistence === 'function') {
        fbDb.enablePersistence({ synchronizeTabs: true }).then(() => {
          console.log("🔥 Firestore offline persistence enabled (multi-tab sync)");
        }).catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn("Firestore persistence notice: multiple tabs open");
          } else if (err.code === 'unimplemented') {
            console.warn("Firestore persistence not supported in this browser");
          } else {
            console.warn("Firestore persistence warning:", err.message);
          }
        });
      }
      fbStorage = firebase.storage();
      console.log("🔥 Firebase initialized — project:", firebaseConfig.projectId);`;

if (fbConfig.includes(oldInitTarget)) {
  fbConfig = fbConfig.replace(oldInitTarget, newInitTarget);
  console.log('Added Firestore offline persistence to firebase-config.js');
} else {
  console.log('Notice: oldInitTarget not matched, checking alternate match');
  fbConfig = fbConfig.replace(
    /fbDb\s*=\s*firebase\.firestore\(\);/,
    `fbDb = firebase.firestore();
      if (fbDb && typeof fbDb.enablePersistence === 'function') {
        fbDb.enablePersistence({ synchronizeTabs: true }).then(() => {
          console.log("🔥 Firestore offline persistence enabled");
        }).catch((err) => {
          console.warn("Firestore persistence notice:", err.code || err.message);
        });
      }`
  );
  console.log('Applied fallback persistence to firebase-config.js');
}

// In listenToRealtimeMessages: use { includeMetadataChanges: true } so cached docs are returned immediately when offline
const oldListenTarget = `return fbDb.collection('matches').doc(matchId).collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {`;

const newListenTarget = `return fbDb.collection('matches').doc(matchId).collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot({ includeMetadataChanges: true }, snapshot => {`;

if (fbConfig.includes(oldListenTarget)) {
  fbConfig = fbConfig.replace(oldListenTarget, newListenTarget);
  console.log('Updated listenToRealtimeMessages with includeMetadataChanges: true');
} else {
  fbConfig = fbConfig.replace(
    /\.onSnapshot\(snapshot\s*=>\s*\{/,
    `.onSnapshot({ includeMetadataChanges: true }, snapshot => {`
  );
  console.log('Applied regex replacement for includeMetadataChanges in listenToRealtimeMessages');
}

// In listenToUserMatches: resilient fallback when public profile get() fails offline
const oldUserDocCheck = `if (userDoc && userDoc.exists) {
                const data = userDoc.data();`;

const newUserDocCheck = `let data = (userDoc && userDoc.exists) ? userDoc.data() : null;
                // Offline fallback: if profile get() returned null while offline, check memory
                if (!data && typeof matchedUsers !== 'undefined' && Array.isArray(matchedUsers)) {
                  data = matchedUsers.find(u => u.id === partnerId);
                }
                if (data) {`;

if (fbConfig.includes(oldUserDocCheck)) {
  fbConfig = fbConfig.replace(oldUserDocCheck, newUserDocCheck);
  console.log('Updated listenToUserMatches with offline profile fallback');
}

fs.writeFileSync('firebase-config.js', fbConfig, 'utf8');
console.log('firebase-config.js updated successfully.');

// ========================================================
// 2. UPDATE script.js
// ========================================================
let script = fs.readFileSync('script.js', 'utf8');

// A. Update updateHeader discovery case to remove "by sam"
const oldHeaderLogo = `case 'discovery':
      setHeaderBtnVisible(backBtn, false);
      headerTitle.className = 'main-header-logo';
      headerTitle.innerHTML = '<span class="header-flame-icon">🔥</span><span class="brand-hook">hookme</span><span class="brand-by">by</span><span class="brand-sam">sam</span>';
      headerTitle.style.background = '';
      headerTitle.style.webkitBackgroundClip = '';
      headerTitle.style.webkitTextFillColor = '';
      break;`;

const newHeaderLogo = `case 'discovery':
      setHeaderBtnVisible(backBtn, false);
      headerTitle.className = 'main-header-logo';
      headerTitle.innerHTML = '<span class="header-flame-icon">🔥</span><span class="brand-hook">hookme</span>';
      headerTitle.style.background = '';
      headerTitle.style.webkitBackgroundClip = '';
      headerTitle.style.webkitTextFillColor = '';
      break;`;

if (script.includes(oldHeaderLogo)) {
  script = script.replace(oldHeaderLogo, newHeaderLogo);
  console.log('Updated updateHeader to remove "by sam"');
} else {
  console.log('WARNING: oldHeaderLogo not matched');
}

// B. Update isRealUserLoggedIn to not fail when offline
const oldIsRealUser = `function isRealUserLoggedIn() {
  return Boolean(
    (typeof fbAuth !== 'undefined' && fbAuth && fbAuth.currentUser) ||
    (appState.isLoggedIn && currentUser.email && !currentUser.email.includes('guest') && !currentUser.email.includes('demo') && currentUser.id && !currentUser.id.startsWith('demo'))
  );
}`;

const newIsRealUser = `function isRealUserLoggedIn() {
  return Boolean(
    (typeof fbAuth !== 'undefined' && fbAuth && fbAuth.currentUser) ||
    (appState.isLoggedIn && (
      currentUser.email || currentUser.phone || (currentUser.id && currentUser.id !== 'me' && !currentUser.id.startsWith('demo'))
    ) && !(currentUser.email || '').includes('guest') && !(currentUser.email || '').includes('demo'))
  );
}`;

if (script.includes(oldIsRealUser)) {
  script = script.replace(oldIsRealUser, newIsRealUser);
  console.log('Updated isRealUserLoggedIn for robust offline recognition');
}

// C. Add IndexedDB offline helpers and syncMatchedUsersFromConversations before loadFromStorage
const idbHelperCode = `
// ==========================================================
// UNBREAKABLE OFFLINE STORAGE (IndexedDB Cache)
// Guarantees conversation chats and matches survive offline,
// airplane mode, data-off, or device reboots.
// ==========================================================
const HMBS_IDB_NAME = 'hmbs_offline_v2';
const HMBS_IDB_STORE = 'app_data';

function openOfflineIdb() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) return resolve(null);
    try {
      const req = indexedDB.open(HMBS_IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(HMBS_IDB_STORE)) {
          db.createObjectStore(HMBS_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function persistToIndexedDB(key, val) {
  try {
    const db = await openOfflineIdb();
    if (!db) return;
    const tx = db.transaction(HMBS_IDB_STORE, 'readwrite');
    tx.objectStore(HMBS_IDB_STORE).put(val, key);
  } catch (_) {}
}

async function getFromIndexedDB(key) {
  try {
    const db = await openOfflineIdb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(HMBS_IDB_STORE, 'readonly');
      const req = tx.objectStore(HMBS_IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}

function syncMatchedUsersFromConversations() {
  if (!conversations || typeof conversations !== 'object') return;
  for (const [partnerId, convo] of Object.entries(conversations)) {
    if (!partnerId || !Array.isArray(convo?.messages) || convo.messages.length === 0) continue;
    if (isContactBlocked(partnerId) || DUMMY_USER_IDS.includes(partnerId)) continue;
    const exists = matchedUsers.some(u => u.id === partnerId);
    if (!exists) {
      const knownProfile = (typeof PROFILES_DATA !== 'undefined' ? PROFILES_DATA : []).find(p => p.id === partnerId);
      const lastMsg = convo.messages[convo.messages.length - 1];
      matchedUsers.push({
        id: partnerId,
        name: convo.partnerName || convo.partner?.name || knownProfile?.name || 'Match',
        image: convo.partnerImage || convo.partner?.image || knownProfile?.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
        age: convo.partner?.age || knownProfile?.age || 24,
        bio: convo.partner?.bio || knownProfile?.bio || '',
        lastMessage: lastMsg?.text || (lastMsg?.imageUrl ? '📷 Photo' : (lastMsg?.videoUrl ? '🎥 Video' : (lastMsg?.audioUrl ? '🎵 Voice note' : ''))),
        lastSender: lastMsg?.senderId || lastMsg?.sender || '',
        lastUpdated: lastMsg?.timestamp || Date.now()
      });
    }
  }
}

async function restoreOfflineDataFromIndexedDB() {
  try {
    const [cachedConvos, cachedMatches] = await Promise.all([
      getFromIndexedDB('conversations'),
      getFromIndexedDB('matchedUsers')
    ]);

    let changed = false;
    if (cachedConvos && typeof cachedConvos === 'object') {
      for (const [id, c] of Object.entries(cachedConvos)) {
        if (!conversations[id] || !Array.isArray(conversations[id].messages) || conversations[id].messages.length < (c.messages?.length || 0)) {
          conversations[id] = c;
          changed = true;
        }
      }
    }

    if (Array.isArray(cachedMatches) && cachedMatches.length > 0) {
      cachedMatches.forEach(m => {
        if (!matchedUsers.some(u => u.id === m.id)) {
          matchedUsers.push(m);
          changed = true;
        }
      });
    }

    if (changed) {
      syncMatchedUsersFromConversations();
      sortMatchedUsersByLatest();
      if (appState.currentScreen === 'chat' && appState.currentChatId) {
        renderChatThread();
      } else if (appState.currentScreen === 'chatsList') {
        renderChatsInbox();
      } else if (appState.currentScreen === 'matches') {
        renderMatchesView();
      }
      updateMatchesNotificationBadge();
    }
  } catch (err) {
    console.warn('[OfflineDB] restore error:', err);
  }
}
`;

// Insert idbHelperCode right before function loadFromStorage
script = script.replace('function loadFromStorage()', idbHelperCode + '\nfunction loadFromStorage()');
console.log('Inserted IndexedDB offline helpers before loadFromStorage');

// D. Update loadFromStorage to call syncMatchedUsersFromConversations and restoreOfflineDataFromIndexedDB
const oldLoadEnd = `    sortMatchedUsersByLatest();\n    updateMatchesNotificationBadge();\n  } catch (e) {`;
const newLoadEnd = `    // Guarantee all conversation threads appear in matchedUsers even if data is off
    syncMatchedUsersFromConversations();
    sortMatchedUsersByLatest();
    updateMatchesNotificationBadge();
    // Asynchronously restore from IndexedDB in background
    restoreOfflineDataFromIndexedDB();
  } catch (e) {`;

if (script.includes(oldLoadEnd)) {
  script = script.replace(oldLoadEnd, newLoadEnd);
  console.log('Updated loadFromStorage with syncMatchedUsersFromConversations');
}

// E. Update saveToStorage to:
// 1. Strip large data URLs
// 2. Persist to IndexedDB
// 3. NEVER delete hmbs_convos on QuotaExceededError!
const oldSaveFunc = `function saveToStorage() {
  try {
    localStorage.setItem('hmbs_state', JSON.stringify({
      isLoggedIn: appState.isLoggedIn,
      isVip: appState.isVip,
      freeRewinds: appState.freeRewinds,
      freeAiGens: appState.freeAiGens,
    }));
    localStorage.setItem('hmbs_user', JSON.stringify(currentUser));
    localStorage.setItem('hmbs_settings', JSON.stringify(settings));
    localStorage.setItem('hmbs_matches', JSON.stringify(matchedUsers));
    const MAX_MSGS = 60;
    const trimmedConvos = {};
    for (const chatId in conversations) {
      const msgs = conversations[chatId]?.messages;
      trimmedConvos[chatId] = { ...conversations[chatId], messages: Array.isArray(msgs) ? msgs.slice(-MAX_MSGS) : [] };
    }
    localStorage.setItem('hmbs_convos', JSON.stringify(trimmedConvos));
    localStorage.setItem('hmbs_blocked', JSON.stringify(blockedUsers));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      try { localStorage.removeItem('hmbs_convos'); } catch (_) {}
    } else { console.warn('Storage save error', e); }
  }
}`;

const newSaveFunc = `function saveToStorage() {
  try {
    localStorage.setItem('hmbs_state', JSON.stringify({
      isLoggedIn: appState.isLoggedIn,
      isVip: appState.isVip,
      freeRewinds: appState.freeRewinds,
      freeAiGens: appState.freeAiGens,
    }));
    localStorage.setItem('hmbs_user', JSON.stringify(currentUser));
    localStorage.setItem('hmbs_settings', JSON.stringify(settings));
    localStorage.setItem('hmbs_matches', JSON.stringify(matchedUsers));

    const MAX_MSGS = 60;
    const trimmedConvos = {};
    for (const chatId in conversations) {
      const msgs = conversations[chatId]?.messages;
      if (Array.isArray(msgs)) {
        // Strip large data/blob URLs to protect localStorage quota
        const safeMsgs = msgs.slice(-MAX_MSGS).map(m => {
          if (m.imageUrl && m.imageUrl.length > 500 && m.imageUrl.startsWith('data:')) {
            return { ...m, imageUrl: '' };
          }
          if (m.audioUrl && m.audioUrl.length > 500 && m.audioUrl.startsWith('data:')) {
            return { ...m, audioUrl: '' };
          }
          return m;
        });
        trimmedConvos[chatId] = { ...conversations[chatId], messages: safeMsgs };
      }
    }
    localStorage.setItem('hmbs_convos', JSON.stringify(trimmedConvos));
    localStorage.setItem('hmbs_blocked', JSON.stringify(blockedUsers));

    // Persist full conversations and matches to IndexedDB as permanent offline backup
    persistToIndexedDB('conversations', conversations);
    persistToIndexedDB('matchedUsers', matchedUsers);
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn('Storage quota exceeded; applying emergency trim without wiping conversations');
      try {
        const emergencyConvos = {};
        for (const chatId in conversations) {
          const msgs = conversations[chatId]?.messages;
          emergencyConvos[chatId] = {
            ...conversations[chatId],
            messages: Array.isArray(msgs) ? msgs.slice(-20).map(m => ({
              id: m.id,
              sender: m.sender,
              text: m.text || '',
              timestamp: m.timestamp,
              read: m.read
            })) : []
          };
        }
        localStorage.setItem('hmbs_convos', JSON.stringify(emergencyConvos));
      } catch (innerErr) {
        console.warn('Emergency convos trim save error:', innerErr);
      }
    } else {
      console.warn('Storage save error', e);
    }
  }
}`;

if (script.includes(oldSaveFunc)) {
  script = script.replace(oldSaveFunc, newSaveFunc);
  console.log('Updated saveToStorage with safe quota management and IndexedDB backup');
} else {
  console.log('WARNING: oldSaveFunc not matched');
}

// F. In setupRealtimeChat: NEVER wipe local cached messages when remote returns empty!
const oldRealtimeUpdate = `conversations[profileId] = {
          messages: [...validRemoteMsgs, ...pendingLocal].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        };`;

const newRealtimeUpdate = `// NEVER wipe local cached messages if remote snapshot is empty (e.g. offline, airplane mode, or network blip)
        let finalMsgs = [];
        if (validRemoteMsgs.length === 0) {
          if (currentMsgs.length > 0) {
            console.log('[Chat] Remote returned 0 messages for ' + profileId + '; preserving ' + currentMsgs.length + ' cached messages.');
            finalMsgs = currentMsgs;
          } else {
            finalMsgs = pendingLocal;
          }
        } else {
          // Merge remote messages with local messages (deduplicating by id / firestoreId / timestamp)
          const msgMap = new Map();
          currentMsgs.forEach(m => {
            const key = m.firestoreId || m.id || (m.sender + '_' + m.timestamp + '_' + (m.text || '').substring(0, 20));
            msgMap.set(key, m);
          });
          validRemoteMsgs.forEach(m => {
            const key = m.firestoreId || m.id || (m.sender + '_' + m.timestamp + '_' + (m.text || '').substring(0, 20));
            msgMap.set(key, m);
          });
          pendingLocal.forEach(m => {
            const key = m.id || (m.sender + '_' + m.timestamp);
            msgMap.set(key, m);
          });
          finalMsgs = Array.from(msgMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        }

        conversations[profileId] = {
          messages: finalMsgs,
          lastReadTimestamp: conversations[profileId]?.lastReadTimestamp || Date.now()
        };`;

if (script.includes(oldRealtimeUpdate)) {
  script = script.replace(oldRealtimeUpdate, newRealtimeUpdate);
  console.log('Protected setupRealtimeChat against offline chat wiping');
} else {
  console.log('WARNING: oldRealtimeUpdate not matched');
}

// G. In renderChatsInbox: ensure conversation partners are included in matchedUsers
const oldRenderInboxStart = `function renderChatsInbox(filterQuery) {\n  sortMatchedUsersByLatest();`;
const newRenderInboxStart = `function renderChatsInbox(filterQuery) {
  // Ensure every partner with existing messages is present in matchedUsers even when offline
  syncMatchedUsersFromConversations();
  sortMatchedUsersByLatest();`;

if (script.includes(oldRenderInboxStart)) {
  script = script.replace(oldRenderInboxStart, newRenderInboxStart);
  console.log('Updated renderChatsInbox to sync conversation partners when offline');
}

fs.writeFileSync('script.js', script, 'utf8');
console.log('script.js updated successfully.');

// ========================================================
// 3. UPDATE index.html
// ========================================================
let html = fs.readFileSync('index.html', 'utf8');

// Replace headerTitle content
html = html.replace(
  /<h1 id="headerTitle">hookmebysam<\/h1>/,
  '<h1 id="headerTitle" class="main-header-logo"><span class="header-flame-icon">🔥</span><span class="brand-hook">hookme</span></h1>'
);

// Version bump to v47
html = html.replace(/style\.css\?v=\d+/g, 'style.css?v=47');
html = html.replace(/premium\.css\?v=\d+/g, 'premium.css?v=47');
html = html.replace(/script\.js\?v=\d+/g, 'script.js?v=47');
html = html.replace(/firebase-config\.js\?v=[\d.]+/g, 'firebase-config.js?v=47.0');
fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html updated to v47');

// ========================================================
// 4. UPDATE sw.js
// ========================================================
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const SW_VERSION = "v\d+";/, 'const SW_VERSION = "v47";');
sw = sw.replace(/\/\* hookmebysam Service Worker v\d+/, '/* hookmebysam Service Worker v47');
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('sw.js bumped to v47');

// ========================================================
// 5. UPDATE style.css & premium.css FOR PERFECT TOP BAR FIT
// ========================================================
const headerResponsiveCSS = `
/* ==========================================================================
   RESPONSIVE TOP BAR: FLUID FIT ACROSS ALL PHONE WIDTHS & DP SETTINGS
   ========================================================================== */
.app-shell > .app-header,
.app-header {
  width: 100% !important;
  max-width: 520px !important;
  margin: 0 auto !important;
  padding: env(safe-area-inset-top, 0px) clamp(10px, 3.5vw, 16px) 0 clamp(10px, 3.5vw, 16px) !important;
  height: calc(56px + env(safe-area-inset-top, 0px)) !important;
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  position: relative !important;
  overflow: hidden !important;
  flex-shrink: 0 !important;
}

.header-left {
  display: flex !important;
  align-items: center !important;
  gap: clamp(4px, 1.8vw, 8px) !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
  overflow: hidden !important;
}

.header-title-wrap {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  min-width: 0 !important;
  overflow: hidden !important;
}

.main-header-logo {
  font-family: var(--font-display) !important;
  font-size: clamp(1.15rem, 4.4vw, 1.48rem) !important;
  font-weight: 900 !important;
  display: flex !important;
  align-items: center !important;
  gap: clamp(4px, 1.5vw, 6px) !important;
  letter-spacing: -0.6px !important;
  white-space: nowrap !important;
  user-select: none !important;
  cursor: pointer !important;
  min-width: 0 !important;
}

.brand-hook {
  background: linear-gradient(135deg, #D13A63 0%, #E0567F 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  font-weight: 900 !important;
  letter-spacing: -0.5px !important;
}

.header-flame-icon {
  font-size: clamp(1.1rem, 3.8vw, 1.35rem) !important;
  display: inline-block !important;
}

.header-right {
  display: flex !important;
  align-items: center !important;
  gap: clamp(2px, 1.5vw, 6px) !important;
  flex-shrink: 0 !important;
  justify-content: flex-end !important;
  min-width: 0 !important;
}

.header-btn {
  width: clamp(34px, 8.5vw, 42px) !important;
  height: clamp(34px, 8.5vw, 42px) !important;
  padding: 0 !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
}

.header-btn svg {
  width: clamp(18px, 4.8vw, 22px) !important;
  height: clamp(18px, 4.8vw, 22px) !important;
}

.global-back-btn {
  width: clamp(34px, 8.5vw, 40px) !important;
  height: clamp(34px, 8.5vw, 40px) !important;
  flex-shrink: 0 !important;
}

.global-back-btn svg {
  width: clamp(18px, 4.8vw, 22px) !important;
  height: clamp(18px, 4.8vw, 22px) !important;
}
`;

let styleCss = fs.readFileSync('style.css', 'utf8');
styleCss += '\n' + headerResponsiveCSS;
fs.writeFileSync('style.css', styleCss, 'utf8');
console.log('Appended responsive header CSS to style.css');

let premCss = fs.readFileSync('premium.css', 'utf8');
premCss += '\n' + headerResponsiveCSS;
fs.writeFileSync('premium.css', premCss, 'utf8');
console.log('Appended responsive header CSS to premium.css');
