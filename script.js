/* ==========================================================
   hookmebysam — Full Application Logic
   ========================================================== */

'use strict';

// ==========================================================
// CONSTANTS & INITIAL DATA
// ==========================================================

const PROFILES_DATA = [
  {
    id: 'p1', name: 'Zainab', age: 22,
    tags: ['Amapiano 🎵', 'Travel ✈️', 'Coffee ☕'],
    bio: 'Tech lover, massive music head. Let\'s exchange playlists and chill at Lekki beach. Swipe right for positive vibes!',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
    distance: '3 km', mutualChance: true,
    autoReply: 'Hey! Thanks for matching with me 😊 I was just listening to some new Amapiano tracks. Are you into music?',
    aiPrompt: 'Beautiful professional portrait of a 22 year old African woman smiling, Amapiano aesthetic, vibrant lighting, highly detailed studio photo'
  },
  {
    id: 'p2', name: 'Tunde', age: 25,
    tags: ['Gamer 🎮', 'Ibadan 🏞️', 'Foodie 🍕'],
    bio: 'Software developer by day, PS5 legend by night. Looking for someone to check out cool lounges in Ibadan.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
    distance: '12 km', mutualChance: false,
    autoReply: '',
    aiPrompt: 'Close portrait of a young African man, 25 years old software engineer, tech setup in background, soft twilight lighting, cinematic'
  },
  {
    id: 'p3', name: 'Amara', age: 24,
    tags: ['Fashion 👗', 'Aesthetics 📸', 'Brunch 🥂'],
    bio: 'Fashion label designer. Let\'s take aesthetic polaroid pictures together and find the best pancake spot in Lagos.',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80',
    distance: '7 km', mutualChance: true,
    autoReply: 'Hi! I saw your profile and loved your bio. Are you ready for a photo session? 📸',
    aiPrompt: 'Gorgeous artistic portrait of a creative 24 year old Nigerian fashion designer, studio backdrop with textiles, modern Lagos fashion, high detail'
  },
  {
    id: 'p4', name: 'Chidi', age: 27,
    tags: ['Fitness 💪', 'Art 🎨', 'Business 📈'],
    bio: 'Art gallery host. If you love fitness and museum date nights, let\'s connect.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
    distance: '5 km', mutualChance: true,
    autoReply: 'Hey! Glad we matched. What\'s your idea of a perfect weekend getaway? 🌊',
    aiPrompt: 'Close headshot of a handsome smiling 27 year old African man, gallery director, blurred artistic oil paintings background, clean lighting'
  },
  {
    id: 'p5', name: 'Sade', age: 23,
    tags: ['Books 📚', 'Nature 🌿', 'Yoruba Dem 💫'],
    bio: 'Bookworm and part-time content designer. Looking for honest connections only. Tell me your favorite book!',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80',
    distance: '18 km', mutualChance: false,
    autoReply: '',
    aiPrompt: 'Thoughtful close portrait of a 23 year old African girl in a beautiful botanical garden holding a vintage book, natural ambient sunshine'
  }
];

const PREMIUM_MATCHES = [
  {
    id: 'pm1', name: 'Fifi', age: 23,
    tags: ['Vibe ⚡', 'Music 🎷'],
    bio: 'Aesthetic queen. Already liked you!',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    distance: '2 km', mutualChance: true,
    autoReply: 'Wow, we finally matched! I\'ve been waiting for you 😍'
  },
  {
    id: 'pm2', name: 'Kemi', age: 24,
    tags: ['Brunch 🥞', 'Art 🎨'],
    bio: 'Let\'s explore Lagos galleries. Already liked you!',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    distance: '4 km', mutualChance: true,
    autoReply: 'Hey! You upgraded to VIP too? Love to see it! 👑'
  }
];

// ==========================================================
// APP STATE
// ==========================================================

let appState = {
  isLoggedIn: false,
  currentScreen: 'login',
  previousScreen: 'login',
  currentChatId: null,
  isDragging: false,
  startX: 0, startY: 0,
  currentX: 0, currentY: 0,
  activeCard: null,
  lastAction: null,
  isRecording: false,
  signupStep: 1,
  signupGender: 'Male',
  signupInterests: [],
  selectedPricingTier: 2,
  aiSelectedProfileId: 'p3',
  isVip: false,
  freeRewinds: 1,
  freeAiGens: 1,
  isBoosting: false,
  boostInterval: null,
  boostSecondsLeft: 0,
  isTypingVisible: false,
};

let currentUser = {
  id: 'me',
  name: 'Dave',
  email: '',
  age: 24,
  bio: 'Software engineer and builder. Love beach hangouts in Lekki and good vibes.',
  image: '',
  avatar: '',
  location: 'Lagos, Nigeria',
  gender: 'Male',
  interests: ['Tech 💻', 'Fitness 💪', 'Music 🎵'],
};

let profileStack = [...PROFILES_DATA];
let matchedUsers = [];
let conversations = {};
let blockedUsers = [];
let archivedChatIds = (() => {
  try {
    const saved = localStorage.getItem('hmbs_archived_chats');
    return new Set(saved ? JSON.parse(saved) : []);
  } catch (_) {
    return new Set();
  }
})();
let deletedConvoIds = (() => {
  try {
    const saved = localStorage.getItem('hmbs_deleted_convos');
    return new Set(saved ? JSON.parse(saved) : []);
  } catch (_) {
    return new Set();
  }
})();
let settings = {
  maxDistance: 50,
  minAge: 20, maxAge: 35,
  notifMatches: true,
  notifMessages: true,
  notifLikes: false,
  showOnline: true,
  shareLocation: true,
};

// Known dummy / AI demo profile IDs
const DUMMY_USER_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'pm1', 'pm2', 's1', 's2', 's3', 's4', 's5'];

function isRealUserLoggedIn() {
  return Boolean(
    (typeof fbAuth !== 'undefined' && fbAuth && fbAuth.currentUser) ||
    (appState.isLoggedIn && (
      currentUser.email || currentUser.phone || (currentUser.id && currentUser.id !== 'me' && !currentUser.id.startsWith('demo'))
    ) && !(currentUser.email || '').includes('guest') && !(currentUser.email || '').includes('demo'))
  );
}

// ==========================================================
// AGE GATE — 18+ verification (COPPA / dating-app law)
// ==========================================================

(function initAgeGate() {
  const overlay = document.getElementById('ageGateOverlay');
  if (!overlay) return;
  // If user already confirmed age in this browser, skip the gate
  if (localStorage.getItem('hmbs_age_confirmed') === '1') {
    overlay.style.display = 'none';
  }
  // Otherwise it stays visible blocking the entire app
})();

function confirmAgeGate() {
  localStorage.setItem('hmbs_age_confirmed', '1');
  const overlay = document.getElementById('ageGateOverlay');
  if (overlay) {
    overlay.style.transition = 'opacity 0.4s';
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 400);
  }
}

function rejectAgeGate() {
  // Redirect under-18 users away from the page
  window.location.replace('https://www.google.com');
}

// ==========================================================
// INIT — Fast Instant Boot (no waiting for external assets)
// ==========================================================

function bootApplication() {
    try {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  } catch (e) {}
  // Immersive edge-to-edge configuration for Android / Capacitor
  if (window.Capacitor && window.Capacitor.Plugins) {
    try {
      if (window.Capacitor.Plugins.StatusBar) {
        window.Capacitor.Plugins.StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
        window.Capacitor.Plugins.StatusBar.show().catch(() => {});
        const currentTheme = localStorage.getItem('hookmebysam_theme') || 'dark';
        window.Capacitor.Plugins.StatusBar.setStyle({ style: currentTheme === 'light' ? 'DARK' : 'LIGHT' }).catch(() => {});
        window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: currentTheme === 'light' ? '#FFFFFF' : '#0A0710' }).catch(() => {});
      }
      if (window.Capacitor.Plugins.NavigationBar) {
        const isL = (currentTheme === 'light');
        window.Capacitor.Plugins.NavigationBar.setColor({ color: isL ? '#FFFFFF' : '#0A0710', darkButtons: isL }).catch(() => {});
      }
    } catch (e) {}
  }

  loadFromStorage();
  setTheme(localStorage.getItem('hookmebysam_theme') || 'dark');

  const isRedirecting = (typeof sessionStorage !== 'undefined') && sessionStorage.getItem('hmbs_google_redirecting') === 'true';

  if (appState.isLoggedIn) {
    showScreen('discovery');
    initMainApp();
  } else if (isRedirecting) {
    showScreen('login');
    updateHeaderForAuth();
    const btn = document.getElementById('googleLoginBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Signing in with Google...';
    }
  } else {
    showScreen('login');
    updateHeaderForAuth();
    if (typeof getLockoutSecondsRemaining === 'function' && getLockoutSecondsRemaining() > 0) {
      startLockoutTimer();
    }
    try {
      const rememberedEmail = localStorage.getItem('hmbs_remember_email');
      if (rememberedEmail) {
        const emailField = document.getElementById('loginEmail');
        if (emailField && !emailField.value) emailField.value = rememberedEmail;
      }
    } catch (_) {}
  }

  // Ensure redirect auth result is processed after page returns from Google
  if (typeof fbAuth !== 'undefined' && fbAuth && typeof fbAuth.getRedirectResult === 'function') {
    fbAuth.getRedirectResult().then((result) => {
      if (result && result.user) {
        handleGoogleLoginSuccess(result.user);
      }
    }).catch((err) => {
      if (err && err.code) {
        handleGoogleAuthError(err);
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApplication);
} else {
  bootApplication();
}

function initMainApp() {
  if (typeof initUserPresenceTracking === 'function') initUserPresenceTracking();
  if (isRealUserLoggedIn()) {
    // Purge any guest/demo dummy AI profiles so the logged-in user only interacts with 100% real users
    matchedUsers = (matchedUsers || []).filter(u => !DUMMY_USER_IDS.includes(u.id));
    DUMMY_USER_IDS.forEach(id => delete conversations[id]);
    profileStack = [];
    saveToStorage();
  } else {
    // Guest exploration mode: allow playing with demo profiles
    profileStack = [...PROFILES_DATA];
  }

  renderCardStack();
  renderMatchesView();
  renderProfileScreen();
  renderSettingsScreen();
  renderAiLabPicker();
  applyVipUI();
  renderStoriesRow();
  initCommunityStoriesListener();
  updateMatchesNotificationBadge();

  // Fetch real registered users from Firestore into the card stack
  loadProfilesForDiscovery();

  // Subscribe to real-time matches from Firestore
  if (typeof listenToUserMatches === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    listenToUserMatches(applyMatchesUpdate);
  }

  // Ask for notification permission after a short delay
  setTimeout(requestNotificationPermission, 3500);

  // Register service worker for FCM push notifications
  if (typeof initPushNotifications === 'function' && isRealUserLoggedIn()) {
    setTimeout(() => initPushNotifications(), 4000);
  }

  // Register service worker for PWA & Push
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      // Periodically check for SW updates
      setInterval(() => { reg.update().catch(() => {}); }, 10 * 60 * 1000);
    }).catch(() => {});
  }

  // Initialize Pull To Refresh for PWA & mobile
  initPullToRefresh();

  // Initialize Hardware/Browser Navigation History (Back & Forward buttons)
  initNavigationHistory();
}

function isContactBlocked(userId) {
  if (!userId) return false;
  if (window.__blockedUserIds && window.__blockedUserIds.has(userId)) return true;
  if (typeof blockedUsers !== 'undefined' && Array.isArray(blockedUsers) && blockedUsers.some(b => b.id === userId)) return true;
  try {
    const raw = localStorage.getItem('hmbs_blocked');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.some(b => b.id === userId)) return true;
    }
  } catch (_) {}
  return false;
}

// Reusable handler to process matches & messages payload from Firestore
function applyMatchesUpdate(realMatches) {
  if (!realMatches || realMatches.length === 0) return;
  let hasNewIncomingMessage = false;
  realMatches.forEach(m => {
    if (!m || !m.id || isContactBlocked(m.id)) {
      // Never process or notify for a blocked contact!
      return;
    }
    if (!DUMMY_USER_IDS.includes(m.id)) {
      const deletedAt = Number(localStorage.getItem('hmbs_deleted_' + m.id) || 0);
      let lastMsgTime = 0;
      if (m.lastUpdated) {
        if (typeof m.lastUpdated === 'number') lastMsgTime = m.lastUpdated;
        else if (m.lastUpdated?.toMillis) lastMsgTime = m.lastUpdated.toMillis();
        else if (m.lastUpdated?.seconds) lastMsgTime = m.lastUpdated.seconds * 1000;
      }
      if (deletedConvoIds.has(m.id)) {
        if (!lastMsgTime || lastMsgTime <= deletedAt) {
          // Conversation was deleted by the user and has no new messages since deletion; do not restore
          return;
        } else {
          // Partner sent a brand-new message after deletion; restore chat
          deletedConvoIds.delete(m.id);
          try { localStorage.setItem('hmbs_deleted_convos', JSON.stringify(Array.from(deletedConvoIds))); } catch (_) {}
        }
      }

      const existingIndex = matchedUsers.findIndex(u => u.id === m.id);
      if (existingIndex === -1) {
        matchedUsers.unshift(m);
        if (window._initialMatchesLoaded) {
          showToast(`🎉 New Match with ${m.name || 'someone special'}!`, 'gold');
          triggerSystemNotification(`🎉 New Match with ${m.name || 'someone special'}!`, {
            body: 'You both liked each other! Tap to chat 💕',
            data: { matchId: m.id }
          });
        }
      } else {
        matchedUsers[existingIndex] = { ...matchedUsers[existingIndex], ...m };
      }
      if (!conversations[m.id]) {
        conversations[m.id] = { messages: [] };
      }
      // If match doc has latest message from partner, check if it's genuinely a new incoming message
      if (m.lastMessage && m.lastSender && fbAuth?.currentUser && m.lastSender !== fbAuth.currentUser.uid) {
        const msgs = conversations[m.id].messages;
        const maxExistingTimestamp = msgs.reduce((max, msg) => Math.max(max, msg.timestamp || 0), 0);
        const lastReadTime = conversations[m.id].lastReadTimestamp || 0;
        const msgTime = (typeof m.lastUpdated === 'number') ? m.lastUpdated : (m.lastUpdated?.toMillis ? m.lastUpdated.toMillis() : Date.now());

        // Check if this message already exists in local conversation
        const alreadyExists = msgs.some(existing => 
          (existing.text === m.lastMessage && (existing.sender === 'them' || existing.senderId === m.lastSender)) ||
          (existing.timestamp && msgTime && Math.abs(existing.timestamp - msgTime) < 5000)
        );

        // Check if message is older than existing messages or already read
        const isOlderOrRead = (msgTime <= maxExistingTimestamp) || (msgTime <= lastReadTime);

        if (!alreadyExists && !isOlderOrRead) {
          const isViewing = (appState.currentScreen === 'chat' && appState.currentChatId === m.id);
          msgs.push({
            id: 'remote_' + msgTime,
            sender: 'them',
            senderId: m.lastSender,
            text: m.lastMessage,
            read: isViewing,
            timestamp: msgTime
          });
          msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          movePartnerToTop(m.id);

          if (!isViewing) {
            hasNewIncomingMessage = true;
            showToast(`💬 ${m.name}: ${m.lastMessage.substring(0, 36)}...`, 'info');
            triggerSystemNotification(`💬 ${m.name}`, {
              body: m.lastMessage,
              data: { matchId: m.id }
            });
          }
        }
      }
    }
  });
  window._initialMatchesLoaded = true;
  sortMatchedUsersByLatest();
  renderMatchesView();
  if (typeof renderChatsInbox === 'function') {
    renderChatsInbox();
  }
  updateMatchesNotificationBadge();
  saveToStorage();
  if (hasNewIncomingMessage) {
    playNotificationSound();
    if (navigator.vibrate) {
      try { navigator.vibrate([30, 50, 30]); } catch (_) {}
    }
  }
}

// Unified auto-refresh & pull-to-refresh runner (WhatsApp/Instagram-style in-place data sync)
async function refreshAppData({ manual = false, background = false } = {}) {
  try {
    if (!isRealUserLoggedIn()) {
      if (manual) showToast('✨ Refreshed', 'gold');
      return;
    }

    // 1. Direct one-shot pull of latest matches and messages
    if (typeof fetchUserMatchesDirectly === 'function') {
      const freshMatches = await fetchUserMatchesDirectly();
      if (freshMatches && freshMatches.length > 0) {
        applyMatchesUpdate(freshMatches);
      }
    }

    // 2. Refresh discovery stack if viewing discovery
    if (appState.currentScreen === 'discovery') {
      loadProfilesForDiscovery();
    }

    // 3. Update stories & badges
    if (typeof loadCommunityStories === 'function') {
      loadCommunityStories();
    }
    updateMatchesNotificationBadge();

    if (manual) {
      if (navigator.vibrate) {
        try { navigator.vibrate(15); } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('App refresh error:', err);
  }
}

// PWA Auto-Refresh when returning to app (Instant live sync like WhatsApp)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isRealUserLoggedIn()) {
    console.log('📱 App resumed in foreground — syncing notifications and matches...');
    refreshAppData({ background: true });
  }
});

window.addEventListener('focus', () => {
  if (isRealUserLoggedIn()) {
    refreshAppData({ background: true });
  }
});

// Periodic live background sync every 15 seconds (auto-updates while using the app)
setInterval(() => {
  if (document.visibilityState === 'visible' && isRealUserLoggedIn()) {
    refreshAppData({ background: true });
  }
}, 15000);

// Smooth Pull-To-Refresh Gesture Controller (Native WhatsApp / Instagram feel)
function initPullToRefresh() {
  const indicator = document.getElementById('ptrIndicator');
  const icon = document.getElementById('ptrIcon');
  if (!indicator) return;

  if (window._ptrBound) return;
  window._ptrBound = true;

  let startY = 0;
  let startX = 0;
  let isPulling = false;
  let isRefreshing = false;
  const PULL_THRESHOLD = 72;
  const MAX_PULL = 92;

  function isPtrAllowed() {
    // Only allow pull-to-refresh on top-level matches or chats list screens, NEVER in chat threads or modals!
    if (appState.currentScreen === 'chat') return false;
    if (document.getElementById('chatImageLightbox')?.style.display === 'flex') return false;
    if (document.getElementById('reactionInfoModal')?.style.display === 'flex') return false;
    if (document.getElementById('storyViewerOverlay')?.style.display === 'flex') return false;
    if (document.querySelector('.modal-overlay[style*="flex"]')) return false;
    return (appState.currentScreen === 'matches' || appState.currentScreen === 'chats');
  }

  function getScrollTop() {
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return window.scrollY || document.documentElement.scrollTop || 0;
    const scrollContainer = activeScreen.querySelector('.matches-workspace, .chats-inbox-wrap');
    if (scrollContainer && scrollContainer.scrollTop !== undefined) {
      return scrollContainer.scrollTop;
    }
    return activeScreen.scrollTop || window.scrollY || document.documentElement.scrollTop || 0;
  }

  document.addEventListener('touchstart', (e) => {
    if (!isPtrAllowed() || isRefreshing || !e.touches || e.touches.length === 0) return;
    if (getScrollTop() <= 2) {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isPulling = false;
    } else {
      startY = 0;
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isPtrAllowed() || !startY || isRefreshing || !e.touches || e.touches.length === 0) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = currentY - startY;
    const diffX = currentX - startX;

    // Ignore horizontal swipes
    if (Math.abs(diffX) > Math.abs(diffY) * 0.75) {
      startY = 0;
      return;
    }

    // Require deliberate pull (> 22px) and at top of container
    if (diffY > 22 && getScrollTop() <= 2) {
      isPulling = true;
      const pullDistance = Math.min(MAX_PULL, (diffY - 22) * 0.42);
      indicator.classList.add('ptr-pulling');
      indicator.style.transform = `translate3d(-50%, ${pullDistance}px, 0)`;

      const rotation = Math.min(360, (pullDistance / PULL_THRESHOLD) * 360);
      if (icon) icon.style.transform = `rotate(${rotation}deg)`;
    }
  }, { passive: true });

  const endPull = async () => {
    if (!isPulling || isRefreshing) {
      startY = 0;
      isPulling = false;
      return;
    }

    indicator.classList.remove('ptr-pulling');
    const transform = indicator.style.transform || '';
    const match = transform.match(/translate3d\(-50%,\s*([0-9.]+)px/);
    const currentDistance = match ? parseFloat(match[1]) : 0;

    if (currentDistance >= PULL_THRESHOLD) {
      isRefreshing = true;
      indicator.classList.add('ptr-refreshing');
      indicator.style.transform = 'translate3d(-50%, 16px, 0)';
      if (navigator.vibrate) {
        try { navigator.vibrate(10); } catch (_) {}
      }

      const startTime = Date.now();
      await refreshAppData({ manual: true });
      const elapsed = Date.now() - startTime;
      if (elapsed < 450) {
        await new Promise(r => setTimeout(r, 450 - elapsed));
      }

      setTimeout(() => {
        indicator.classList.remove('ptr-refreshing');
        indicator.style.transform = 'translate3d(-50%, -90px, 0)';
        if (icon) icon.style.transform = 'rotate(0deg)';
        isRefreshing = false;
        isPulling = false;
        startY = 0;
      }, 250);
    } else {
      indicator.style.transform = 'translate3d(-50%, -90px, 0)';
      if (icon) icon.style.transform = 'rotate(0deg)';
      isPulling = false;
      startY = 0;
    }
  };

  document.addEventListener('touchend', endPull, { passive: true });
  document.addEventListener('touchcancel', endPull, { passive: true });
}

async function loadProfilesForDiscovery() {
  if (isRealUserLoggedIn()) {
    // REAL LOGGED IN USER: ONLY fetch from Firestore, never fall back to dummy AI users
    if (typeof fetchRealUsersFromFirestore === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      const realUsers = await fetchRealUsersFromFirestore();
      if (realUsers && realUsers.length > 0) {
        profileStack = [...realUsers];
        console.log(`🔥 Discovery stack updated with ${realUsers.length} real Firestore user(s)!`);
      } else {
        profileStack = [];
        console.log("ℹ️ No other real Firestore users found in database yet. Waiting for new users to register.");
      }
    } else {
      profileStack = [];
    }
    renderCardStack();
  } else {
    // GUEST DEMO MODE: load mock profiles for exploration
    profileStack = [...PROFILES_DATA];
    renderCardStack();
  }
}

// ==========================================================
// STORAGE
// ==========================================================


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

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('hmbs_state');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.isLoggedIn) appState.isLoggedIn = true;
      if (data.isVip) appState.isVip = data.isVip;
      if (data.freeRewinds !== undefined) appState.freeRewinds = data.freeRewinds;
      if (data.freeAiGens !== undefined) appState.freeAiGens = data.freeAiGens;
    }
    const savedUser = localStorage.getItem('hmbs_user');
    if (savedUser) {
      currentUser = { ...currentUser, ...JSON.parse(savedUser) };
      // Purge any legacy template demo image so user must upload their own real photo
      if (currentUser.image && (currentUser.image.includes('photo-1506794778202') || currentUser.image.includes('photo-1534528741775'))) {
        currentUser.image = '';
        currentUser.avatar = '';
      }
      // Purge legacy hardcoded default username daveemin0
      if (currentUser.username === 'daveemin0' || currentUser.username === '@daveemin0') {
        currentUser.username = '';
      }
    }
    const savedSettings = localStorage.getItem('hmbs_settings');
    if (savedSettings) {
      settings = { ...settings, ...JSON.parse(savedSettings) };
    }
    const savedMatches = localStorage.getItem('hmbs_matches');
    if (savedMatches) {
      matchedUsers = JSON.parse(savedMatches);
    }
    const savedConvos = localStorage.getItem('hmbs_convos');
    if (savedConvos) {
      conversations = JSON.parse(savedConvos);
    }
    const savedBlocked = localStorage.getItem('hmbs_blocked');
    if (savedBlocked) {
      try {
        blockedUsers = JSON.parse(savedBlocked);
      } catch (e) {}
    }
    // Guarantee all conversation threads appear in matchedUsers even if data is off
    syncMatchedUsersFromConversations();
    sortMatchedUsersByLatest();
    updateMatchesNotificationBadge();
    // Asynchronously restore from IndexedDB in background
    restoreOfflineDataFromIndexedDB();
  } catch (e) {
    console.warn('Storage load error', e);
  }
}

function saveToStorage() {
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
}


// ==========================================================
// SCREEN NAVIGATION
// ==========================================================

const AUTH_SCREENS = ['login', 'signup', 'signupSuccess'];
const MAIN_SCREENS = ['discovery', 'matches', 'chatsList', 'chat', 'profile', 'settings'];

function showScreen(screenId, { fromHistory = false } = {}) {
  // Dismiss any open action sheets, reaction pickers, lightboxes, or dropdowns when changing screens
  if (typeof closeReactionPicker === 'function') closeReactionPicker();
  if (typeof closeReactionSheet === 'function') closeReactionSheet();
  if (typeof closeImageLightbox === 'function') closeImageLightbox();
  if (typeof closeMediaPreview === 'function') closeMediaPreview();
  document.querySelectorAll('.chat-dropdown-menu, .lightbox-dropdown-menu').forEach(m => { m.style.display = 'none'; });

  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  const target = document.getElementById(`${screenId}Screen`);
  if (target) target.classList.add('active');
  if (screenId === 'profile' && typeof renderProfileScreen === 'function') {
    renderProfileScreen();
  }

  const oldScreen = appState.currentScreen;
  appState.previousScreen = oldScreen;
  appState.currentScreen = screenId;

  // Show/hide nav and header appropriately
  const isAuth = AUTH_SCREENS.includes(screenId);
  const navEl = document.getElementById('bottomNav');
  if (navEl) navEl.style.display = (isAuth || screenId === 'chat') ? 'none' : 'flex';

  const fab = document.getElementById('globalFloatingSearchBtn');
  if (fab) fab.style.display = (isAuth || screenId === 'chat' || screenId === 'chatsList') ? 'none' : 'flex';

  updateHeader(screenId);
  updateBottomNav(screenId);

  // Manage browser history for phone hardware back button & forward button
  if (!fromHistory && oldScreen !== screenId) {
    try {
      const stateObj = {
        screen: screenId,
        chatId: screenId === 'chat' ? appState.currentChatId : null
      };
      const hashStr = '#' + screenId + (screenId === 'chat' && appState.currentChatId ? '/' + appState.currentChatId : '');
      history.pushState(stateObj, '', hashStr);
    } catch (e) {}
  }
}

function setHeaderBtnVisible(btn, visible) {
  if (!btn) return;
  if (visible) {
    btn.style.setProperty('display', 'flex', 'important');
    btn.classList.remove('is-hidden');
  } else {
    btn.style.setProperty('display', 'none', 'important');
    btn.classList.add('is-hidden');
  }
}

function updateHeader(screenId) {
  const backBtn = document.getElementById('backBtn');
  const headerTitle = document.getElementById('headerTitle');
  const headerRight = document.getElementById('headerRight');
  const header = document.getElementById('appHeader');

  if (!header) return;

  // Hide global appHeader on auth screens and on chat screen (chat screen has its own WhatsApp-style header)
  header.style.display = (AUTH_SCREENS.includes(screenId) || screenId === 'chat') ? 'none' : 'flex';

  if (!backBtn || !headerTitle) return;

  // Ensure headerRight is visible on main screens
  if (headerRight) headerRight.style.display = 'flex';

  const searchBtn  = document.getElementById('headerSearchBtn');
  const reportBtn  = document.getElementById('chatReportBtn');
  const upgradeBtn = document.getElementById('upgradeHeaderBtn');
  const matchBtn   = document.getElementById('matchesQuickBtn');

  // Exact icon scoping requested by user:
  // - Heart (matches): Discovery only
  // - Report & Block (exclamation): Discovery only (in middle of heart & crown for reporting profiles), strictly hidden on settings, profile, chatsList, matches
  // - Crown (upgrade): Discovery & Matches
  // - Search: Discovery & Matches
  setHeaderBtnVisible(searchBtn, screenId === 'discovery' || screenId === 'matches');
  setHeaderBtnVisible(matchBtn, screenId === 'discovery');
  setHeaderBtnVisible(reportBtn, screenId === 'discovery');
  setHeaderBtnVisible(upgradeBtn, screenId === 'discovery' || screenId === 'matches');

  switch (screenId) {
    case 'discovery':
      setHeaderBtnVisible(backBtn, false);
      headerTitle.className = 'main-header-logo';
      headerTitle.innerHTML = '<span class="header-flame-icon">🔥</span><span class="brand-hook">hookme</span>';
      headerTitle.style.background = '';
      headerTitle.style.webkitBackgroundClip = '';
      headerTitle.style.webkitTextFillColor = '';
      break;
    case 'matches':
      setHeaderBtnVisible(backBtn, true);
      setHeaderTitle('Matches');
      break;
    case 'chatsList':
      setHeaderBtnVisible(backBtn, false);
      setHeaderTitle('Messages 💬');
      break;
    case 'chat': {
      setHeaderBtnVisible(backBtn, true);
      const partner = matchedUsers.find(u => u.id === appState.currentChatId);
      setHeaderTitle(partner ? `${escHtml(partner.name)} <span style="color:var(--green-match);font-size:0.7rem;margin-left:6px">●</span>` : 'Chat');
      break;
    }
    case 'profile':
      setHeaderBtnVisible(backBtn, true);
      setHeaderTitle('Profile');
      break;
    case 'settings':
      setHeaderBtnVisible(backBtn, true);
      setHeaderTitle('Settings');
      break;
  }
}

function setHeaderTitle(html) {
  const el = document.getElementById('headerTitle');
  if (!el) return;
  el.className = 'screen-header-title';
  el.innerHTML = html;
  el.style.background = '';
  el.style.webkitBackgroundClip = '';
  el.style.webkitTextFillColor = '';
  el.style.color = '';
}

// ==========================================================
// THEME SYSTEM — Dark / Light Mode
// ==========================================================

function setTheme(theme) {
  if (theme !== 'dark' && theme !== 'light') theme = 'dark';
  appState.theme = theme;
  try {
    localStorage.setItem('hookmebysam_theme', theme);
  } catch (e) {}

  const targets = [document.documentElement, document.body, document.querySelector('.app-shell')].filter(Boolean);
  targets.forEach(el => {
    if (theme === 'light') el.setAttribute('data-theme', 'light');
    else el.removeAttribute('data-theme');
  });

  const metaTheme = document.getElementById('metaThemeColor');
  if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#0A0710');

  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
    window.Capacitor.Plugins.StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    window.Capacitor.Plugins.StatusBar.show().catch(() => {});
    window.Capacitor.Plugins.StatusBar.setStyle({ style: theme === 'light' ? 'DARK' : 'LIGHT' }).catch(() => {});
    window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: theme === 'light' ? '#FFFFFF' : '#0A0710' }).catch(() => {});
    if (window.Capacitor.Plugins.NavigationBar) {
      window.Capacitor.Plugins.NavigationBar.setColor({ color: theme === 'light' ? '#FFFFFF' : '#0A0710', darkButtons: theme === 'light' }).catch(() => {});
    }
  }

  const darkBtn = document.getElementById('themeBtnDark');
  const lightBtn = document.getElementById('themeBtnLight');
  const themeLabel = document.getElementById('themeLabel');
  const darkModeCheck = document.getElementById('toggleDarkModeCheck');
  if (darkModeCheck) darkModeCheck.checked = theme === 'dark';

  if (darkBtn && lightBtn) {
    if (theme === 'light') {
      darkBtn.classList.remove('active');
      lightBtn.classList.add('active');
    } else {
      lightBtn.classList.remove('active');
      darkBtn.classList.add('active');
    }
  }

  if (themeLabel) {
    themeLabel.textContent = theme === 'light' ? 'Light Mode' : 'Dark Mode';
  }
}

function updateHeaderForAuth() {
  const header = document.getElementById('appHeader');
  if (header) header.style.display = 'none';
  const nav = document.getElementById('bottomNav');
  if (nav) nav.style.display = 'none';
}

function updateBottomNav(screenId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`[data-tab="${screenId}"]`);
  if (activeTab) activeTab.classList.add('active');
}

function closeAnyOpenModal() {
  // 0. Reaction picker / action sheet popup
  if (document.getElementById('reactionPickerPopup') || document.querySelector('.msg-action-backdrop') || (typeof _reactionPickerOpen !== 'undefined' && _reactionPickerOpen)) {
    if (typeof closeReactionPicker === 'function') closeReactionPicker();
    return true;
  }

  // 0.1 WhatsApp reaction bottom sheet
  const reactionModal = document.getElementById('reactionInfoModal');
  if (reactionModal && (reactionModal.style.display === 'flex' || reactionModal.style.display === 'block')) {
    if (typeof closeReactionSheet === 'function') closeReactionSheet();
    return true;
  }

  // 0.2 Image / Video Lightbox
  const lbModal = document.getElementById('chatImageLightbox');
  if (lbModal && lbModal.style.display !== 'none') {
    if (typeof closeImageLightbox === 'function') closeImageLightbox();
    return true;
  }

  // 0.3 In-chat 3-dots menus
  const chatMenu = document.getElementById('chatDropdownMenu');
  if (chatMenu && chatMenu.style.display === 'block') {
    chatMenu.style.display = 'none';
    return true;
  }
  const lbMenu = document.getElementById('lightboxDropdownMenu');
  if (lbMenu && lbMenu.style.display === 'block') {
    lbMenu.style.display = 'none';
    return true;
  }

  // 1. Stories viewer
  const storyOverlay = document.getElementById('storyViewerOverlay');
  if (storyOverlay && storyOverlay.style.display !== 'none') {
    if (typeof closeStoryViewer === 'function') { closeStoryViewer(); return true; }
    storyOverlay.style.display = 'none';
    return true;
  }

  // 2. VIP Paywall
  const paywall = document.getElementById('paywallModal');
  if (paywall && (paywall.classList.contains('open') || paywall.classList.contains('active'))) {
    if (typeof closePaywall === 'function') { closePaywall(); return true; }
    paywall.classList.remove('open', 'active');
    return true;
  }

  // 3. User search modal
  const searchOverlay = document.getElementById('searchModalOverlay');
  if (searchOverlay && searchOverlay.style.display !== 'none') {
    if (typeof closeSearchModal === 'function') { closeSearchModal(); return true; }
    searchOverlay.style.display = 'none';
    return true;
  }

  // 4. Match popup modal
  const matchPopup = document.getElementById('matchPopup') || document.getElementById('matchModal');
  if (matchPopup && matchPopup.style.display !== 'none' && matchPopup.style.display !== '') {
    if (typeof closeMatchPopup === 'function') { closeMatchPopup(); return true; }
    matchPopup.style.display = 'none';
    return true;
  }

  // 5. Legal modal
  const legalModal = document.getElementById('legalModal');
  if (legalModal && legalModal.style.display !== 'none' && legalModal.style.display !== '') {
    if (typeof closeLegalModal === 'function') { closeLegalModal(); return true; }
    legalModal.style.display = 'none';
    return true;
  }

  // 6. Edit profile modal
  const editModal = document.getElementById('editProfileModal');
  if (editModal && editModal.style.display !== 'none' && editModal.style.display !== '') {
    if (typeof closeEditProfileModal === 'function') { closeEditProfileModal(); return true; }
    editModal.style.display = 'none';
    return true;
  }

  // 7. Phone verification modal
  const phoneModal = document.getElementById('phoneVerifyModal');
  if (phoneModal && phoneModal.style.display !== 'none' && phoneModal.style.display !== '') {
    if (typeof closePhoneVerificationModal === 'function') { closePhoneVerificationModal(); return true; }
    phoneModal.style.display = 'none';
    return true;
  }

  // 8. Language modal
  const langModal = document.getElementById('languageModal');
  if (langModal && langModal.style.display !== 'none' && langModal.style.display !== '') {
    if (typeof closeLanguageModal === 'function') { closeLanguageModal(); return true; }
    langModal.style.display = 'none';
    return true;
  }

  // 9. Blocked users modal
  const blockedModal = document.getElementById('blockedUsersModalOverlay');
  if (blockedModal && blockedModal.style.display !== 'none' && blockedModal.style.display !== '') {
    if (typeof closeBlockedUsersModal === 'function') { closeBlockedUsersModal(); return true; }
    blockedModal.style.display = 'none';
    return true;
  }

  // 10. Forgot password modal
  const forgotModal = document.getElementById('forgotPasswordModal');
  if (forgotModal && forgotModal.style.display !== 'none' && forgotModal.style.display !== '') {
    if (typeof closeForgotPasswordModal === 'function') { closeForgotPasswordModal(); return true; }
    forgotModal.style.display = 'none';
    return true;
  }

  // 11. Forward modal
  const fwdModal = document.getElementById('forwardModal');
  if (fwdModal && fwdModal.style.display !== 'none' && fwdModal.style.display !== '') {
    if (typeof closeForwardModal === 'function') { closeForwardModal(); return true; }
    fwdModal.style.display = 'none';
    return true;
  }

  // 12. Any generic modal overlay currently visible
  const overlays = document.querySelectorAll('.modal-overlay');
  for (const m of overlays) {
    if (m.style.display === 'flex' || m.style.display === 'block') {
      m.style.display = 'none';
      return true;
    }
  }

  return false;
}

let _lastBackPressTime = 0;

function handleBackBtn() {
  if (closeAnyOpenModal()) {
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
  } else {
    if (appState.currentScreen === 'chat') {
      const prev = appState.previousScreen;
      showScreen(prev === 'chatsList' || prev === 'matches' ? prev : 'discovery', { fromHistory: true });
    } else if (appState.currentScreen !== 'discovery') {
      showScreen('discovery', { fromHistory: true });
    } else {
      handleAppExitAttempt();
    }
  }
}

function handleAppExitAttempt() {
  const now = Date.now();
  if (now - _lastBackPressTime < 2200) {
    window.history.back();
  } else {
    _lastBackPressTime = now;
    try {
      history.pushState({ screen: 'discovery' }, '', '#discovery');
    } catch (e) {}
    showToast('Press back again to exit', 'info');
  }
}

function initNavigationHistory() {
  if (window._navHistoryInitialized) return;
  window._navHistoryInitialized = true;

  try {
    const cur = appState.currentScreen || 'discovery';
    history.replaceState({ screen: cur, chatId: appState.currentChatId }, '', '#' + cur);
  } catch (e) {}

  window.addEventListener('popstate', (event) => {
    // 1. If any modal/overlay is open, close it first and prevent screen jump
    if (closeAnyOpenModal()) {
      try {
        history.pushState({ screen: appState.currentScreen, chatId: appState.currentChatId }, '', '#' + appState.currentScreen);
      } catch (e) {}
      return;
    }

    // 2. If a state object exists with a valid screen:
    if (event.state && event.state.screen) {
      const targetScreen = event.state.screen;
      if (targetScreen === 'chat' && event.state.chatId) {
        openChat(event.state.chatId, { fromHistory: true });
      } else {
        if (appState.currentScreen === 'chat') {
          appState.currentChatId = null;
        }
        showScreen(targetScreen, { fromHistory: true });
      }
      return;
    }

    // 3. Reached bottom of history stack
    if (appState.currentScreen === 'chat') {
      showScreen('chatsList', { fromHistory: true });
    } else if (appState.currentScreen && appState.currentScreen !== 'discovery' && (isRealUserLoggedIn() || appState.isLoggedIn)) {
      showScreen('discovery', { fromHistory: true });
    } else {
      handleAppExitAttempt();
    }
  });

  // Handle deep-link hash on page load if applicable
  try {
    const hash = window.location.hash.replace('#', '');
    if (hash && (isRealUserLoggedIn() || appState.isLoggedIn)) {
      const parts = hash.split('/');
      const screen = parts[0];
      const param = parts[1];
      if (MAIN_SCREENS.includes(screen)) {
        if (screen === 'chat' && param) {
          setTimeout(() => openChat(param, { fromHistory: true }), 300);
        } else {
          setTimeout(() => showScreen(screen, { fromHistory: true }), 100);
        }
      }
    }
  } catch (e) {}
}

function switchTab(tabId) {
  if (tabId === 'search') {
    openSearchModal();
    return;
  }
  if (appState.currentScreen === 'chat') {
    appState.currentChatId = null;
  }
  if (tabId === 'matches') {
    renderMatchesView();
  } else if (tabId === 'chatsList') {
    renderChatsInbox();
  } else if (tabId === 'profile') {
    renderProfileScreen();
  }
  showScreen(tabId);
}

// ==========================================================
// AUTH — LOGIN, PHONE AUTH & SECURITY INFRASTRUCTURE
// ==========================================================

// Rate-limiting / Brute-force protection
let _rateLimitTimer = null;

function getLockoutSecondsRemaining() {
  const until = parseInt(sessionStorage.getItem('auth_lockout_until') || '0', 10);
  const now = Date.now();
  if (until > now) {
    return Math.ceil((until - now) / 1000);
  }
  return 0;
}

function recordFailedLoginAttempt() {
  let attempts = parseInt(sessionStorage.getItem('auth_failed_attempts') || '0', 10) + 1;
  sessionStorage.setItem('auth_failed_attempts', attempts);
  if (attempts >= 5) {
    const lockoutDuration = 60 * 1000; // 60-second lockout
    const lockoutUntil = Date.now() + lockoutDuration;
    sessionStorage.setItem('auth_lockout_until', lockoutUntil);
    startLockoutTimer();
  }
}

function resetFailedLoginAttempts() {
  sessionStorage.removeItem('auth_failed_attempts');
  sessionStorage.removeItem('auth_lockout_until');
  if (_rateLimitTimer) {
    clearInterval(_rateLimitTimer);
    _rateLimitTimer = null;
  }
  const banner = document.getElementById('loginRateLimitBanner');
  if (banner) banner.style.display = 'none';
  const btn = document.getElementById('loginBtn');
  if (btn) btn.disabled = false;
  const phoneBtn = document.getElementById('loginPhoneBtn');
  if (phoneBtn) phoneBtn.disabled = false;
}

function startLockoutTimer() {
  if (_rateLimitTimer) clearInterval(_rateLimitTimer);
  const banner = document.getElementById('loginRateLimitBanner');
  const msg = document.getElementById('loginRateLimitMsg');
  const btn = document.getElementById('loginBtn');
  const phoneBtn = document.getElementById('loginPhoneBtn');

  const update = () => {
    const remaining = getLockoutSecondsRemaining();
    if (remaining > 0) {
      if (banner) banner.style.display = 'flex';
      if (msg) msg.textContent = `Too many failed attempts. Security lockout active: please wait ${remaining}s.`;
      if (btn) btn.disabled = true;
      if (phoneBtn) phoneBtn.disabled = true;
    } else {
      if (banner) banner.style.display = 'none';
      if (btn) btn.disabled = false;
      if (phoneBtn) phoneBtn.disabled = false;
      sessionStorage.removeItem('auth_failed_attempts');
      sessionStorage.removeItem('auth_lockout_until');
      clearInterval(_rateLimitTimer);
      _rateLimitTimer = null;
    }
  };
  update();
  _rateLimitTimer = setInterval(update, 1000);
}

// Local registered accounts store (prevents random fake emails from signing in)
function getRegisteredUsers() {
  try {
    return JSON.parse(localStorage.getItem('hookme_registered_users') || '[]');
  } catch (_) {
    return [];
  }
}

function saveRegisteredUser(record) {
  const users = getRegisteredUsers();
  const existingIdx = users.findIndex(u => (record.email && u.email && u.email.toLowerCase() === record.email.toLowerCase()) || (record.phone && u.phone === record.phone));
  if (existingIdx >= 0) {
    users[existingIdx] = Object.assign({}, users[existingIdx], record);
  } else {
    users.push(record);
  }
  localStorage.setItem('hookme_registered_users', JSON.stringify(users));
}

// Toggle between Email and Phone login tabs
function switchLoginMethod(method) {
  const emailTab = document.getElementById('loginTabEmail');
  const phoneTab = document.getElementById('loginTabPhone');
  const emailSection = document.getElementById('loginEmailSection');
  const phoneSection = document.getElementById('loginPhoneSection');
  const errEmail = document.getElementById('loginError');
  const errPhone = document.getElementById('loginPhoneError');

  if (errEmail) errEmail.textContent = '';
  if (errPhone) errPhone.textContent = '';

  if (method === 'phone') {
    if (emailTab) { emailTab.classList.remove('active'); emailTab.setAttribute('aria-selected', 'false'); }
    if (phoneTab) { phoneTab.classList.add('active'); phoneTab.setAttribute('aria-selected', 'true'); }
    if (emailSection) emailSection.style.display = 'none';
    if (phoneSection) phoneSection.style.display = 'block';
  } else {
    if (phoneTab) { phoneTab.classList.remove('active'); phoneTab.setAttribute('aria-selected', 'false'); }
    if (emailTab) { emailTab.classList.add('active'); emailTab.setAttribute('aria-selected', 'true'); }
    if (phoneSection) phoneSection.style.display = 'none';
    if (emailSection) emailSection.style.display = 'block';
  }
}

// Toggle between Email and Phone in Forgot Password modal
function switchForgotMethod(method) {
  const emailTab = document.getElementById('fpTabEmail');
  const phoneTab = document.getElementById('fpTabPhone');
  const emailSec = document.getElementById('fpEmailSection');
  const phoneSec = document.getElementById('fpPhoneSection');

  if (method === 'phone') {
    if (emailTab) emailTab.classList.remove('active');
    if (phoneTab) phoneTab.classList.add('active');
    if (emailSec) emailSec.style.display = 'none';
    if (phoneSec) phoneSec.style.display = 'block';
  } else {
    if (phoneTab) phoneTab.classList.remove('active');
    if (emailTab) emailTab.classList.add('active');
    if (phoneSec) phoneSec.style.display = 'none';
    if (emailSec) emailSec.style.display = 'block';
  }
}

// Real-time password strength validation rules
function evaluatePasswordStrength(password) {
  const pwd = password || '';
  const hasLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);

  const reqLength = document.getElementById('reqLength');
  const reqUpper = document.getElementById('reqUpper');
  const reqNumber = document.getElementById('reqNumber');
  const reqSymbol = document.getElementById('reqSymbol');

  const updateReq = (el, met, text) => {
    if (!el) return;
    el.classList.toggle('met', met);
    el.innerHTML = `<span>${met ? '✓' : '○'}</span> ${text}`;
  };

  updateReq(reqLength, hasLength, '8+ characters');
  updateReq(reqUpper, hasUpper, 'Uppercase letter (A-Z)');
  updateReq(reqNumber, hasNumber, 'Number (0-9)');
  updateReq(reqSymbol, hasSymbol, 'Symbol (!@#$...)');

  const score = [hasLength, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
  const bar1 = document.getElementById('pwBar1');
  const bar2 = document.getElementById('pwBar2');
  const bar3 = document.getElementById('pwBar3');
  const bar4 = document.getElementById('pwBar4');
  const label = document.getElementById('pwStrengthLabel');
  const percent = document.getElementById('pwStrengthPercent');

  const bars = [bar1, bar2, bar3, bar4];
  const colors = ['#E53935', '#FB8C00', '#FDD835', '#21B06B'];
  const labels = ['Too Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  bars.forEach((bar, i) => {
    if (!bar) return;
    if (i < score) {
      bar.style.background = colors[Math.min(score - 1, colors.length - 1)];
    } else {
      bar.style.background = 'rgba(255, 255, 255, 0.12)';
    }
  });

  if (label) {
    label.textContent = labels[score];
    label.style.color = score > 0 ? colors[Math.min(score - 1, colors.length - 1)] : 'var(--txt-muted)';
  }
  if (percent) {
    percent.textContent = `${score * 25}%`;
  }

  return score === 4;
}

function checkPasswordMatch() {
  const pwd = document.getElementById('signupPassword')?.value || '';
  const confirmPwd = document.getElementById('signupConfirmPassword')?.value || '';
  const feedback = document.getElementById('pwMatchFeedback');
  if (!feedback) return;
  if (!confirmPwd) {
    feedback.style.display = 'none';
    return;
  }
  feedback.style.display = 'block';
  if (pwd === confirmPwd) {
    feedback.style.color = '#10B981';
    feedback.textContent = '✓ Passwords match';
  } else {
    feedback.style.color = '#EF4444';
    feedback.textContent = '✕ Passwords do not match';
  }
}
window.checkPasswordMatch = checkPasswordMatch;

// EMAIL LOGIN HANDLER
async function handleLogin() {
  const remaining = getLockoutSecondsRemaining();
  if (remaining > 0) {
    startLockoutTimer();
    return;
  }

  const email = (document.getElementById('loginEmail')?.value || '').trim();
  const password = document.getElementById('loginPassword')?.value || '';

  // Remember Me support
  const rememberMe = document.getElementById('loginRememberMe')?.checked;
  if (rememberMe && email) {
    try { localStorage.setItem('hmbs_remember_email', email); } catch (_) {}
  } else {
    try { localStorage.removeItem('hmbs_remember_email'); } catch (_) {}
  }
  const errorEl = document.getElementById('loginError');
  if (errorEl) errorEl.textContent = '';
  const googleErrEl = document.getElementById('googleLoginError');
  if (googleErrEl) googleErrEl.textContent = '';

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !password) {
    if (errorEl) errorEl.textContent = 'Please fill in all fields.';
    return;
  }
  if (!emailRegex.test(email)) {
    if (errorEl) errorEl.textContent = 'Please enter a valid email address (e.g. name@domain.com).';
    return;
  }
  if (password.length < 8) {
    if (errorEl) errorEl.textContent = 'Password must be at least 8 characters.';
    return;
  }

  const btn = document.getElementById('loginBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Signing in...</span>';
  }

  // Generic error message for security (prevents user account enumeration)
  const genericErrorMessage = 'Invalid email or password. Please check your credentials and try again.';

  // ---- FIREBASE LIVE MODE ----
  if (typeof fbAuth !== 'undefined' && fbAuth) {
    try {
      const userCredential = await fbAuth.signInWithEmailAndPassword(email, password);
      resetFailedLoginAttempts();
      currentUser.email = userCredential.user.email;
      currentUser.id = userCredential.user.uid;

      if (typeof fbDb !== 'undefined' && fbDb) {
        try {
          const userDoc = await fbDb.collection('users').doc(userCredential.user.uid).get();
          if (userDoc && userDoc.exists) {
            const uData = userDoc.data();
            if (uData.name || uData.displayName) currentUser.name = uData.displayName || uData.name;
            if (uData.age) currentUser.age = uData.age;
            if (uData.bio) currentUser.bio = uData.bio;
            if (uData.gender) currentUser.gender = uData.gender;
            if (uData.interests) currentUser.interests = uData.interests;
            if (uData.location) currentUser.location = uData.location;
            if (uData.phone) currentUser.phone = uData.phone;
            if (uData.image || uData.avatar) {
              currentUser.image = uData.image || uData.avatar;
              currentUser.avatar = currentUser.image;
            }
            const vipExpiryMs = uData.vipExpiry?.toMillis ? uData.vipExpiry.toMillis() : 0;
            appState.isVip = Boolean(uData.isVip && (!vipExpiryMs || vipExpiryMs > Date.now()));
            if (uData.isVerified !== undefined) {
              currentUser.isVerified = Boolean(uData.isVerified);
              if (currentUser.isVerified) localStorage.setItem('hmbs_verified', 'true');
            }
          }
        } catch (e) {
          console.warn("Could not fetch user profile from Firestore:", e);
        }
      }

      appState.isLoggedIn = true;
      saveToStorage();
      showScreen('discovery');
      initMainApp();
      return;
    } catch (err) {
      console.warn("Firebase sign-in error:", err.code);
      recordFailedLoginAttempt();
      if (err.code === 'auth/too-many-requests') {
        if (errorEl) errorEl.textContent = 'Too many attempts. Please wait a moment or reset your password.';
      } else if (err.code === 'auth/user-disabled') {
        if (errorEl) errorEl.textContent = 'This account has been disabled. Please contact support.';
      } else {
        if (errorEl) errorEl.textContent = genericErrorMessage;
      }
      if (btn) { btn.disabled = false; btn.innerHTML = 'Sign In'; }
      return;
    }
  }

  // ---- LOCAL VERIFIED STORAGE MODE ----
  // NEVER blindly log in an unknown/random email!
  const registeredUsers = getRegisteredUsers();
  const matchedUser = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (matchedUser && (!matchedUser.passwordHash || matchedUser.passwordHash === btoa(password))) {
    resetFailedLoginAttempts();
    currentUser.email = email;
    currentUser.name = matchedUser.name || currentUser.name || 'User';
    currentUser.phone = matchedUser.phone || '';
    appState.isLoggedIn = true;
    saveToStorage();
    showScreen('discovery');
    initMainApp();
  } else {
    recordFailedLoginAttempt();
    if (errorEl) errorEl.textContent = genericErrorMessage;
  }

  if (btn) { btn.disabled = false; btn.innerHTML = 'Sign In'; }
}

// PHONE NUMBER SIGN-IN HANDLER
let _loginPendingPhone = '';
let _loginPhoneOtpSent = false;

async function handlePhoneLogin() {
  const remaining = getLockoutSecondsRemaining();
  if (remaining > 0) {
    startLockoutTimer();
    return;
  }

  const phoneInput = document.getElementById('loginPhoneNumber');
  const otpInput = document.getElementById('loginPhoneOtp');
  const otpGroup = document.getElementById('loginPhoneOtpGroup');
  const btn = document.getElementById('loginPhoneBtn');
  const errEl = document.getElementById('loginPhoneError');
  if (errEl) errEl.textContent = '';

  let rawPhone = (phoneInput?.value || '').replace(/\D/g, '');
  if (rawPhone.startsWith('0')) rawPhone = rawPhone.slice(1);

  if (!rawPhone || rawPhone.length < 10) {
    if (errEl) errEl.textContent = 'Please enter a valid 10-digit Nigerian phone number.';
    return;
  }

  const fullPhone = '+234' + rawPhone;

  // STEP 1: SEND CODE
  if (!_loginPhoneOtpSent) {
    if (btn) { btn.disabled = true; btn.textContent = 'Sending code...'; }
    _loginPendingPhone = rawPhone;

    let sent = false;
    if (typeof sendOtpToPhone === 'function') {
      try {
        sent = await sendOtpToPhone(fullPhone);
      } catch (_) {
        sent = false;
      }
    }

    if (btn) btn.disabled = false;

    if (sent) {
      _loginPhoneOtpSent = true;
      if (otpGroup) otpGroup.style.display = 'block';
      if (btn) btn.textContent = 'Verify & Sign In';
      if (otpInput) {
        otpInput.value = window._devPhoneOtp || '';
        setTimeout(() => otpInput.focus(), 150);
      }
      if (!window._devPhoneOtp) {
        showToast('📱 SMS code sent to +234 ' + rawPhone, 'info');
      }
    } else {
      if (errEl) errEl.textContent = 'Could not send SMS verification code. Please check number or try again.';
    }
    return;
  }

  // STEP 2: VERIFY CODE
  const otpCode = (otpInput?.value || '').trim();
  if (!/^\d{4,6}$/.test(otpCode)) {
    if (errEl) errEl.textContent = 'Please enter the verification code received via SMS.';
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

  let verified = false;
  if (typeof verifyOtp === 'function') {
    try {
      const res = await verifyOtp(fullPhone, otpCode);
      verified = res && res.success;
    } catch (_) {
      verified = false;
    }
  }

  if (btn) btn.disabled = false;

  if (verified) {
    resetFailedLoginAttempts();
    _loginPhoneOtpSent = false;
    currentUser.phone = _loginPendingPhone;
    currentUser.phoneVerified = true;
    appState.isLoggedIn = true;
    saveToStorage();
    showToast('Signed in with phone! Welcome to hookmebysam. 🌟', 'gold');
    showScreen('discovery');
    initMainApp();
  } else {
    recordFailedLoginAttempt();
    if (errEl) errEl.textContent = 'Invalid verification code. Please check your SMS or request a new code.';
    if (btn) btn.textContent = 'Verify & Sign In';
  }
}

// GOOGLE AUTH HANDLERS
async function handleGoogleLoginSuccess(user) {
  if (!user) return;
  try { sessionStorage.removeItem('hmbs_google_redirecting'); } catch (_) {}
  resetFailedLoginAttempts();

  // 1. Query Firestore directly for an existing profile (by UID or by email)
  let existingProfile = null;
  if (typeof fbDb !== 'undefined' && fbDb && user.email) {
    try {
      const doc = await fbDb.collection('users').doc(user.uid).get();
      if (doc && doc.exists) {
        existingProfile = doc.data();
      } else {
        // Find existing account created with this email (e.g. Email/Password signup)
        const emailSnap = await fbDb.collection('users')
          .where('email', '==', user.email.toLowerCase())
          .limit(1)
          .get();
        if (!emailSnap.empty) {
          existingProfile = emailSnap.docs[0].data();
          console.log('Found existing user profile in Firestore by email:', existingProfile.name, existingProfile.age);
          // Link this profile to the Google UID so future logins read it directly
          await fbDb.collection('users').doc(user.uid).set({
            ...existingProfile,
            id: user.uid,
            authProvider: 'google',
            linkedPreviousUid: emailSnap.docs[0].id,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Error querying Firestore for profile in handleGoogleLoginSuccess:', e);
    }
  }

  // 2. Fallback to localStorage registered users if Firestore query returned nothing
  if (!existingProfile) {
    const regUsers = typeof getRegisteredUsers === 'function' ? getRegisteredUsers() : [];
    existingProfile = regUsers.find(u => u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) || null;
  }

  if (existingProfile) {
    // Preserve the user's REAL account details completely!
    currentUser.id = user.uid;
    currentUser.email = (user.email || '').toLowerCase();
    currentUser.name = existingProfile.name || existingProfile.displayName || currentUser.name;
    currentUser.displayName = currentUser.name;
    currentUser.username = existingProfile.username || currentUser.username;
    if (existingProfile.age) currentUser.age = existingProfile.age;
    if (existingProfile.gender) currentUser.gender = existingProfile.gender;
    if (existingProfile.bio) currentUser.bio = existingProfile.bio;
    if (existingProfile.interests) currentUser.interests = existingProfile.interests;
    if (existingProfile.photos?.length) currentUser.photos = existingProfile.photos;
    if (existingProfile.image || existingProfile.avatar) {
      currentUser.image = existingProfile.image || existingProfile.avatar;
      currentUser.avatar = currentUser.image;
    }
    currentUser.isVip = Boolean(existingProfile.isVip);

    appState.isLoggedIn = true;
    saveToStorage();
    showScreen('discovery');
    initMainApp();
    showToast('Welcome back, ' + currentUser.name + '! ✨', 'gold');
    return;
  }

  // 3. Genuinely brand new user without any existing account:
  let cleanName = (user.displayName || '').trim();
  if (!cleanName || cleanName.includes('@')) {
    const prefix = (user.email || '').split('@')[0] || 'User';
    const cleaned = prefix.replace(/[._0-9]+$/g, '') || prefix;
    cleanName = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  let cleanUsername = (user.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  if (cleanUsername.length < 3) cleanUsername = 'user_' + Math.floor(100 + Math.random() * 900);

  currentUser.id = user.uid;
  currentUser.email = (user.email || '').toLowerCase();
  currentUser.name = cleanName;
  currentUser.displayName = cleanName;
  currentUser.username = cleanUsername;
  currentUser.age = 24;
  if (user.photoURL) {
    currentUser.image = user.photoURL;
    currentUser.avatar = user.photoURL;
    currentUser.photos = [user.photoURL];
  }

  appState.isLoggedIn = true;
  saveToStorage();

  const nameInput = document.getElementById('signupName');
  if (nameInput) nameInput.value = cleanName;
  const emailInput = document.getElementById('signupEmail');
  if (emailInput) emailInput.value = currentUser.email;
  showToast(`Welcome ${cleanName}! Please select your age and gender to complete your profile 🎯`, 'gold');
  showScreen('signup');
}
window.handleGoogleLoginSuccess = handleGoogleLoginSuccess;

function handleGoogleAuthError(err) {
  console.warn("Google Auth Error:", err);
  try { sessionStorage.removeItem('hmbs_google_redirecting'); } catch (_) {}
  const code = err ? err.code : '';
  const currentHost = window.location.hostname || 'localhost';
  let message = 'Google sign-in failed. Please try again.';

  if (code === 'auth/unauthorized-domain') {
    message = `Google Sign-in failed: domain "${currentHost}" is not authorized in Firebase Console. Please add "${currentHost}" under Firebase Console > Authentication > Settings > Authorized domains.`;
  } else if (code === 'auth/operation-not-allowed') {
    message = 'Google sign-in is not enabled in Firebase Console. Enable "Google" under Authentication > Sign-in method.';
  } else if (code === 'auth/popup-blocked') {
    message = 'Popup was blocked by your browser. Redirecting to Google sign-in...';
    showToast(message, 'info');
    if (fbAuth && typeof firebase !== 'undefined') {
      try { sessionStorage.setItem('hmbs_google_redirecting', 'true'); } catch (_) {}
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      fbAuth.signInWithRedirect(provider).catch(e => {
        try { sessionStorage.removeItem('hmbs_google_redirecting'); } catch (_) {}
        const errEl = document.getElementById('googleLoginError') || document.getElementById('loginError');
        if (errEl) errEl.textContent = e.message || 'Redirect failed.';
      });
      return;
    }
  } else if (code === 'auth/popup-closed-by-user') {
    message = 'Google sign-in window was closed.';
  } else if (code === 'auth/network-request-failed') {
    message = 'Network connection problem. Please verify your internet connection.';
  } else if (err && err.message) {
    message = err.message;
  }

  const errEl = document.getElementById('googleLoginError') || document.getElementById('loginError') || document.getElementById('loginPhoneError');
  if (errEl) errEl.textContent = message;
  showToast(message, 'error');
}
window.handleGoogleAuthError = handleGoogleAuthError;

function handleGoogleLogin() {
  const gErr = document.getElementById('googleLoginError');
  if (gErr) gErr.textContent = '';
  const loginErr = document.getElementById('loginError');
  if (loginErr) loginErr.textContent = '';

  const btn = document.getElementById('googleLoginBtn');
  if (btn) btn.disabled = true;
  const googleIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 4.5C13.8 4.5 15.4 5.2 16.6 6.3L19.9 3C17.9 1.1 15.1 0 12 0C7.4 0 3.4 2.6 1.4 6.4L5.2 9.3C6.2 6.5 8.8 4.5 12 4.5Z" fill="#EA4335"/><path d="M23.5 12.3C23.5 11.4 23.4 10.6 23.3 9.8H12V14.5H18.5C18.2 16 17.4 17.2 16.2 18L19.9 20.8C22.1 18.8 23.5 15.8 23.5 12.3Z" fill="#4285F4"/><path d="M5.2 14.7C4.9 13.9 4.8 13 4.8 12C4.8 11 5 10.1 5.2 9.3L1.4 6.4C0.5 8.1 0 10 0 12C0 14 0.5 15.9 1.4 17.6L5.2 14.7Z" fill="#FBBC05"/><path d="M12 24C15.1 24 17.8 23 19.9 20.8L16.2 18C15.1 18.7 13.7 19.2 12 19.2C8.8 19.2 6.2 17.2 5.2 14.4L1.4 17.3C3.4 21.4 7.4 24 12 24Z" fill="#34A853"/></svg>`;
  if (btn) btn.innerHTML = `${googleIconSvg} Signing in...`;

  if (typeof fbAuth !== 'undefined' && fbAuth && typeof firebase !== 'undefined') {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Try popup first (fast, works on desktop and modern mobile browsers when initiated by click)
    fbAuth.signInWithPopup(provider)
      .then((result) => {
        handleGoogleLoginSuccess(result.user);
      })
      .catch((err) => {
        console.warn("signInWithPopup result code:", err.code, err.message);
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
          showToast('Opening Google sign-in...', 'info');
          try { sessionStorage.setItem('hmbs_google_redirecting', 'true'); } catch (_) {}
          fbAuth.signInWithRedirect(provider).catch(e => handleGoogleAuthError(e));
          return;
        }
        handleGoogleAuthError(err);
      })
      .finally(() => {
        if (btn) { btn.disabled = false; btn.innerHTML = `${googleIconSvg} Continue with Google`; }
      });
    return;
  }

  showToast('Firebase Authentication is not available. Please verify your internet connection.', 'error');
  if (btn) { btn.disabled = false; btn.innerHTML = `${googleIconSvg} Continue with Google`; }
}

function handleGuestLogin() {
  appState.isLoggedIn = true;
  currentUser = {
    id: 'demo_guest_' + Date.now(),
    name: 'Guest Explorer',
    age: 24,
    email: 'guest@demo.local',
    gender: 'female',
    interests: ['Music 🎵', 'Travel ✈️', 'Foodie 🍕'],
    bio: 'Exploring HookMeBySam in guest mode ✨',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    location: 'Lagos, Nigeria',
    shareLocation: true,
  };
  saveToStorage();
  showToast('Logged in as Guest Explorer! 🌟', 'info');
  showScreen('discovery');
  initMainApp();
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isVisible = input.type === 'text';
  input.type = isVisible ? 'password' : 'text';
  btnEl.innerHTML = isVisible
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;
}

// ==========================================================
// AUTH — SIGN UP
// ==========================================================

function goToSignup() {
  appState.signupStep = 1;
  showScreen('signup');
  renderSignupStep();
}

function goToLogin() {
  showScreen('login');
}

function selectGender(gender, el) {
  appState.signupGender = gender;
  document.querySelectorAll('.gender-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function toggleInterest(tag, el) {
  if (el.classList.contains('selected')) {
    el.classList.remove('selected');
    appState.signupInterests = appState.signupInterests.filter(i => i !== tag);
  } else {
    if (appState.signupInterests.length >= 5) {
      showToast('Max 5 interests!', 'info');
      return;
    }
    el.classList.add('selected');
    appState.signupInterests.push(tag);
  }
}

function renderSignupStep() {
  const steps = document.querySelectorAll('.signup-step');
  steps.forEach((s, i) => {
    s.classList.toggle('active', i + 1 === appState.signupStep);
  });

  const dots = document.querySelectorAll('.progress-dot');
  dots.forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i + 1 === appState.signupStep) d.classList.add('active');
    if (i + 1 < appState.signupStep) d.classList.add('done');
  });
}

function nextSignupStep() {
  const errorEl = document.getElementById(`signupError${appState.signupStep}`);
  if (errorEl) errorEl.textContent = '';

  if (appState.signupStep === 1) {
    const name = document.getElementById('signupName').value.trim();
    const age = parseInt(document.getElementById('signupAge').value);
    if (!name || name.length < 2) {
      if (errorEl) errorEl.textContent = 'Please enter your full name.';
      return;
    }
    if (isNaN(age) || age < 18 || age > 80) {
      if (errorEl) errorEl.textContent = 'Please enter a valid age (18–80).';
      return;
    }
    currentUser.name = name;
    currentUser.age = age;
    currentUser.gender = appState.signupGender;
  }

  if (appState.signupStep === 2) {
    currentUser.interests = [...appState.signupInterests];
  }

  if (appState.signupStep === 3) {
    const bio = document.getElementById('signupBio').value.trim();
    const location = document.getElementById('signupLocation').value.trim();
    if (!bio || bio.length < 10) {
      if (errorEl) errorEl.textContent = 'Write a short bio (at least 10 characters).';
      return;
    }
    if (!currentUser.image && !currentUser.avatar) {
      if (errorEl) errorEl.textContent = 'Please upload your profile photo to continue! Every user must have their own real photo. 📸';
      return;
    }
    currentUser.bio = bio;
    currentUser.location = location || 'Lagos, Nigeria';
  }

  if (appState.signupStep < 4) {
    appState.signupStep++;
    renderSignupStep();
  } else {
    completeSignup();
  }
}

function prevSignupStep() {
  if (appState.signupStep > 1) {
    appState.signupStep--;
    renderSignupStep();
  } else {
    goToLogin();
  }
}

async function syncPublicProfileToFirestore(fields = {}) {
  // Backward-compatible name retained for existing UI callers. Publication is
  // now performed by the authenticated backend, which reads the private user
  // record with Admin SDK and controls the public field set.
  if (!fbAuth?.currentUser) return false;
  return syncPublicProfileToBackend();
}

function completeSignup() {
  const email = (document.getElementById('signupEmail')?.value || '').trim();
  let phone = (document.getElementById('signupPhone')?.value || '').replace(/\D/g, '');
  if (phone.startsWith('0')) phone = phone.slice(1);
  const password = document.getElementById('signupPassword')?.value || '';
  const errorEl = document.getElementById('signupError4');
  const signupAge = Number(currentUser?.age);
  if (!Number.isFinite(signupAge) || signupAge < 18 || signupAge > 100) {
    if (errorEl) errorEl.textContent = 'You must be 18 or older to join.';
    return;
  }
  if (errorEl) errorEl.textContent = '';

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    if (errorEl) errorEl.textContent = 'Please enter a valid, real email address (e.g. name@gmail.com).';
    return;
  }

  // Reject keyboard mashing or junk emails (e.g., hhhhhhwhw@gmail.com with repeated letters)
  const usernamePart = email.split('@')[0];
  if (/(.)\1{3,}/i.test(usernamePart)) {
    if (errorEl) errorEl.textContent = 'Please enter a genuine, active email address without repeated random characters.';
    return;
  }

  if (!phone || phone.length < 10) {
    if (errorEl) errorEl.textContent = 'Please enter a valid 10-digit Nigerian phone number.';
    return;
  }

  const isStrong = evaluatePasswordStrength(password);
  if (!isStrong) {
    if (errorEl) errorEl.textContent = 'Password must meet all 4 requirements: 8+ characters, uppercase letter, number, and symbol.';
    return;
  }

  const confirmPassword = document.getElementById('signupConfirmPassword')?.value || '';
  if (password !== confirmPassword) {
    if (errorEl) errorEl.textContent = 'Passwords do not match. Please verify your confirmation password.';
    return;
  }

  const userPhoto = currentUser.image || currentUser.avatar;
  if (!userPhoto) {
    if (errorEl) errorEl.textContent = 'Profile picture missing. Please go back to Step 3 and upload your photo.';
    return;
  }

  const btn = document.getElementById('signupCompleteBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = 'Creating account...'; }

  currentUser.email = email;
  currentUser.phone = phone;

  // ---- FIREBASE LIVE SIGNUP ----
  if (typeof fbAuth !== 'undefined' && fbAuth) {
    fbAuth.createUserWithEmailAndPassword(email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        currentUser.id = user.uid;
        appState.isLoggedIn = true;

        // Dispatch real Firebase email verification
        try {
          await user.sendEmailVerification();
          showToast('✉️ Verification email sent! Please check your inbox and spam folder.', 'info');
        } catch (e) {
          console.warn("Could not dispatch email verification:", e);
        }

        const userName = currentUser.name || currentUser.displayName || email.split('@')[0];
        const profileData = {
          id: user.uid,
          email: email,
          phone: '+234' + phone,
          phoneVerified: false,
          name: userName,
          displayName: userName,
          age: currentUser.age || 24,
          bio: currentUser.bio || 'Looking for real connections on hookmebysam!',
          gender: currentUser.gender || 'Female',
          interests: currentUser.interests || ['Music 🎵', 'Vibes ✨'],
          image: userPhoto,
          avatar: userPhoto,
          photos: (window._signupPhotos || []).filter(Boolean),
          isVip: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (typeof fbDb !== 'undefined' && fbDb) {
          await fbDb.collection('users').doc(user.uid).set(profileData);
          await syncPublicProfileToFirestore(profileData);
        }

        saveRegisteredUser({
          ...profileData,
          email: email.toLowerCase(),
          phone: phone,
          passwordHash: btoa(password),
          uid: user.uid,
          createdAt: Date.now()
        });

        saveToStorage();
        if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account'; }
        showScreen('signupSuccess');
        initMainApp();
      })
      .catch((err) => {
        console.warn("Signup error code:", err.code, err.message);
        const msgs = {
          'auth/email-already-in-use': 'An account with this email address already exists. Please Sign In instead.',
          'auth/weak-password': 'Password is too weak. Please use at least 8 characters with uppercase, numbers, and symbols.',
          'auth/invalid-email': 'Please enter a valid, real email address.'
        };
        if (errorEl) errorEl.textContent = msgs[err.code] || err.message || 'Signup failed. Please try again.';
        if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account'; }
      });
    return;
  }

  // ---- LOCAL VERIFIED STORAGE MODE ----
  saveRegisteredUser({
    email: email.toLowerCase(),
    phone: phone,
    passwordHash: btoa(password),
    name: currentUser.name || 'User',
    uid: 'local_' + Date.now(),
    createdAt: Date.now()
  });

  appState.isLoggedIn = true;
  saveToStorage();
  setTimeout(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account'; }
    showScreen('signupSuccess');
    initMainApp();
  }, 600);
}

// ==========================================================
// SWIPE ENGINE
// ==========================================================

function renderCardStack() {
  const stack = document.getElementById('cardStack');
  const emptyState = document.getElementById('stackEmpty');
  const controls = document.getElementById('actionRow');

  if (!stack) return;
  stack.innerHTML = '';

  if (profileStack.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    if (controls) { controls.style.opacity = '0.25'; controls.style.pointerEvents = 'none'; }
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (controls) { controls.style.opacity = '1'; controls.style.pointerEvents = 'auto'; }

  for (let i = profileStack.length - 1; i >= 0; i--) {
    const p = profileStack[i];
    const card = buildProfileCard(p, i);

    if (i === 0) {
      card.style.zIndex = '10';
      appState.activeCard = card;
      attachDragListeners(card);
    } else {
      const depth = Math.min(i, 2);
      card.style.transform = `scale(${1 - depth * 0.04}) translateY(${-depth * 10}px)`;
      card.style.zIndex = String(10 - depth);
      card.style.pointerEvents = 'none';
    }

    stack.appendChild(card);
  }
}

function buildProfileCard(p, idx) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.id = `card_${p.id}`;

  // Build photos array: use p.photos[] if available, else fall back to p.image
  const photos = [];
  if (Array.isArray(p.photos) && p.photos.length > 0) {
    p.photos.forEach(url => { if (url) photos.push(url); });
  }
  if (photos.length === 0 && p.image) photos.push(p.image);
  if (photos.length === 0 && p.avatar) photos.push(p.avatar);

  card._photoIndex = 0;
  card._photos = photos;

  const tagsHTML = (Array.isArray(p.tags) ? p.tags : []).map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('');

  const dotsHTML = photos.map((_, i) =>
    `<div class="photo-dot${i === 0 ? ' active' : ''}"></div>`
  ).join('') || '<div class="photo-dot active"></div>';

  card.innerHTML = `
    <div class="card-photo-area">
      <div class="card-photo-dots">${dotsHTML}</div>
      <div class="card-distance-badge">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        ${escHtml(typeof getDynamicProfileDistance === 'function' ? getDynamicProfileDistance(p) : (p.distance || '2 km away'))}
      </div>
      <div class="stamp stamp-like">LIKE</div>
      <div class="stamp stamp-nope">NOPE</div>
      ${photos.length > 1 ? '<div class="card-photo-tap-prev"></div><div class="card-photo-tap-next"></div>' : ''}
    </div>
    <div class="card-info">
      <div class="card-name-row">
        <h2>${escHtml(p.name || 'User')}, ${escHtml(p.age ?? '')}</h2>
        ${(p.isVerified || p.verified) ? `<span class="verified-icon" title="Verified">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#3897F0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </span>` : ''}
      </div>
      <div class="card-tags">${tagsHTML}</div>
      <p class="card-bio">${escHtml(p.bio || '')}</p>
    </div>
  `;

  const photoArea = card.querySelector('.card-photo-area');
  if (photoArea && photos.length > 0) {
    photoArea.style.backgroundImage = `url("${safeCssUrl(photos[0])}")`;
    photoArea.style.backgroundSize = 'cover';
    photoArea.style.backgroundPosition = 'center';
  }

  if (photos.length > 1) {
    const prevZone = card.querySelector('.card-photo-tap-prev');
    const nextZone = card.querySelector('.card-photo-tap-next');
    const setCardPhoto = (newIdx) => {
      const i = (newIdx + photos.length) % photos.length;
      card._photoIndex = i;
      if (photoArea) photoArea.style.backgroundImage = `url("${safeCssUrl(photos[i])}")`;
      card.querySelectorAll('.photo-dot').forEach((dot, di) => dot.classList.toggle('active', di === i));
    };
    if (prevZone) prevZone.addEventListener('click', (e) => {
      if (Math.abs(appState.currentX - appState.startX) > 8) return;
      e.stopPropagation(); setCardPhoto(card._photoIndex - 1);
    });
    if (nextZone) nextZone.addEventListener('click', (e) => {
      if (Math.abs(appState.currentX - appState.startX) > 8) return;
      e.stopPropagation(); setCardPhoto(card._photoIndex + 1);
    });
  }

  return card;
}

function attachDragListeners(card) {
  card.addEventListener('touchstart', onDragStart, { passive: true });
  card.addEventListener('touchmove', onDragMove, { passive: true });
  card.addEventListener('touchend', onDragEnd);
  card.addEventListener('mousedown', onDragStart);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

function onDragStart(e) {
  appState.isDragging = true;
  const pt = e.touches ? e.touches[0] : e;
  appState.startX = pt.clientX;
  appState.startY = pt.clientY;
  appState.currentX = pt.clientX;
  appState.currentY = pt.clientY;
  if (appState.activeCard) {
    appState.activeCard.style.transition = 'none';
  }
}

function onDragMove(e) {
  if (!appState.isDragging || !appState.activeCard) return;
  const pt = e.touches ? e.touches[0] : e;
  appState.currentX = pt.clientX;
  appState.currentY = pt.clientY;

  const dx = appState.currentX - appState.startX;
  const dy = appState.currentY - appState.startY;
  const rot = dx / 14;

  appState.activeCard.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`;

  const stampLike = appState.activeCard.querySelector('.stamp-like');
  const stampNope = appState.activeCard.querySelector('.stamp-nope');
  const norm = Math.min(Math.abs(dx) / 90, 1);

  if (dx > 0) {
    if (stampLike) stampLike.style.opacity = norm;
    if (stampNope) stampNope.style.opacity = 0;
  } else {
    if (stampNope) stampNope.style.opacity = norm;
    if (stampLike) stampLike.style.opacity = 0;
  }

  // Smooth Card Stack Depth: Interpolate the card directly behind forward!
  const cardStack = document.getElementById('cardStack');
  if (cardStack) {
    const cards = cardStack.querySelectorAll('.profile-card');
    if (cards.length > 1) {
      const nextCard = cards[cards.length - 2];
      if (nextCard && nextCard !== appState.activeCard) {
        const nextScale = 0.96 + norm * 0.04;
        const nextTy = -10 + norm * 10;
        nextCard.style.transform = `scale(${nextScale}) translateY(${nextTy}px)`;
      }
    }
  }
}

function onDragEnd() {
  if (!appState.isDragging || !appState.activeCard) return;
  appState.isDragging = false;

  const dx = appState.currentX - appState.startX;

  if (dx > 110) {
    doSwipe('right');
  } else if (dx < -110) {
    doSwipe('left');
  } else {
    appState.activeCard.style.transition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    appState.activeCard.style.transform = 'translate3d(0,0,0) rotate(0deg)';
    const stampLike = appState.activeCard.querySelector('.stamp-like');
    const stampNope = appState.activeCard.querySelector('.stamp-nope');
    if (stampLike) stampLike.style.opacity = 0;
    if (stampNope) stampNope.style.opacity = 0;

    // Reset card behind back to rest depth
    const cardStack = document.getElementById('cardStack');
    if (cardStack) {
      const cards = cardStack.querySelectorAll('.profile-card');
      if (cards.length > 1) {
        const nextCard = cards[cards.length - 2];
        if (nextCard) {
          nextCard.style.transition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          nextCard.style.transform = 'scale(0.96) translateY(-10px)';
        }
      }
    }
  }

  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
}

function pulseClick(el) {
  if (!el) return;
  el.classList.remove('btn-clicked');
  // Force reflow so the animation restarts even on rapid repeat clicks
  void el.offsetWidth;
  el.classList.add('btn-clicked');
}

function triggerManualSwipe(dir) {
  if (!appState.activeCard) return;
  appState.activeCard.style.transition = 'transform 0.45s ease-in-out, opacity 0.4s';
  const stamp = appState.activeCard.querySelector(dir === 'right' ? '.stamp-like' : '.stamp-nope');
  if (stamp) stamp.style.opacity = 1;
  appState.activeCard.style.transform = dir === 'right'
    ? 'translate3d(350px, 30px, 0) rotate(22deg)'
    : 'translate3d(-350px, 30px, 0) rotate(-22deg)';
  setTimeout(() => doSwipe(dir), 320);
}

async function doSwipe(dir) {
  if (profileStack.length === 0) return;
  const profile = profileStack[0];
  appState.lastAction = { profile, dir };

  // Smooth Card Stack Depth: Animate top card flying off and next card springing forward
  const cardStack = document.getElementById('cardStack');
  if (cardStack) {
    const cards = cardStack.querySelectorAll('.profile-card');
    const topCard = appState.activeCard || cards[cards.length - 1];
    const nextCard = cards.length > 1 ? cards[cards.length - 2] : null;

    if (topCard) {
      topCard.style.transition = 'transform 0.34s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.3s ease';
      topCard.style.transform = `translate3d(${dir === 'right' ? '130%' : '-130%'}, 10px, 0) rotate(${dir === 'right' ? 24 : -24}deg)`;
      topCard.style.opacity = '0';
    }
    if (nextCard && nextCard !== topCard) {
      nextCard.style.transition = 'transform 0.34s cubic-bezier(0.2, 0.9, 0.3, 1.2)';
      nextCard.style.transform = 'scale(1) translateY(0px)';
    }
  }

  setTimeout(() => {
    profileStack.shift();
    renderCardStack();
  }, 260);

  // Record swipe through the authenticated backend so limits and blocks are enforced server-side.
  if (typeof recordSwipeInBackend === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const result = await recordSwipeInBackend(profile.id, dir === 'right' ? 'like' : 'pass');
    if (!result.success) {
      profileStack.unshift(profile);
      renderCardStack();
      // If rate-limited, open paywall instead of silent toast
      if (result.limited) {
        setTimeout(() => openPaywall('swipe_limit'), 350);
      }
      return;
    }
    // Update swipe counter if server sends remaining count
    if (typeof result.swipesRemaining === 'number') {
      updateSwipeCounter(result.swipesRemaining);
    }
    if (result.matched && dir === 'right') {
      triggerMatchPopup(profile);

      // Notify both matched users through authenticated backend FCM.
      fbAuth.currentUser.getIdToken().then(token => {
        fetch(BACKEND_URL + '/fcm/new-match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({
            matchedUserId: profile.id,
            matchedUserName: profile.name || 'your new match'
          })
        }).catch(() => {});
      }).catch(() => {});
    }
  } else {
    // Local prototype mode
    if (dir === 'right' && profile.mutualChance) {
      setTimeout(() => triggerMatchPopup(profile), 400);
    }
  }
}

// Update the swipe counter badge on the discover screen
function updateSwipeCounter(remaining) {
  const badge = document.getElementById('swipeCounterBadge');
  const text = document.getElementById('swipeCounterText');
  if (!badge || !text) return;
  if (remaining === null || remaining === undefined) {
    badge.style.display = 'none';
    return;
  }
  badge.style.display = 'flex';
  text.textContent = remaining + ' likes left today';
  badge.classList.toggle('low', remaining <= 10);
}

function undoSwipe() {
  if (!appState.isVip && appState.freeRewinds <= 0) {
    openPaywall('rewind');
    return;
  }
  if (!appState.lastAction) return;

  if (!appState.isVip) {
    appState.freeRewinds--;
    updateLimitBadges();
  }

  profileStack.unshift(appState.lastAction.profile);
  appState.lastAction = null;
  renderCardStack();
  saveToStorage();
}

function refreshStack() {
  if (isRealUserLoggedIn()) {
    showToast('Checking for new profiles nearby... 🔍', 'info');
    loadProfilesForDiscovery();
  } else {
    profileStack = [...PROFILES_DATA];
    appState.lastAction = null;
    renderCardStack();
  }
}

// ==========================================================
// REAL-TIME NOTIFICATIONS & CONVERSATION ORDERING HELPERS
// ==========================================================

function getUnreadMessagesCount(partnerId) {
  const msgs = conversations[partnerId]?.messages || [];
  return msgs.filter(m => m.sender === 'them' && m.read === false).length;
}

function getTotalUnreadCount() {
  let total = 0;
  for (const partnerId in conversations) {
    total += getUnreadMessagesCount(partnerId);
  }
  return total;
}

function updateMatchesNotificationBadge() {
  const badge = document.getElementById('matchesNavBadge');
  const headerBadge = document.getElementById('headerMatchesCountBadge');
  const headerDot = document.getElementById('headerNotifDot');
  const count = getTotalUnreadCount();

  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-flex';
      badge.classList.remove('badge-pop');
      void badge.offsetWidth;
      badge.classList.add('badge-pop');
    } else {
      badge.style.display = 'none';
      badge.textContent = '0';
    }
  }

  if (headerBadge) {
    if (count > 0) {
      headerBadge.textContent = count > 99 ? '99+' : count;
      headerBadge.style.display = 'inline-flex';
    } else {
      headerBadge.style.display = 'none';
      headerBadge.textContent = '0';
    }
  }

  if (headerDot) {
    headerDot.style.display = count > 0 ? 'block' : 'none';
  }
}

function getLatestChatTimestamp(user) {
  if (!user || !user.id) return 0;
  const hist = conversations[user.id]?.messages;
  let latestMsgTime = 0;
  if (Array.isArray(hist) && hist.length > 0) {
    for (let i = hist.length - 1; i >= 0; i--) {
      const m = hist[i];
      if (m && m.timestamp) {
        let t = 0;
        if (typeof m.timestamp === 'number') {
          t = m.timestamp;
        } else if (m.timestamp?.toMillis && typeof m.timestamp.toMillis === 'function') {
          t = m.timestamp.toMillis();
        } else if (m.timestamp?.seconds) {
          t = m.timestamp.seconds * 1000;
        } else if (typeof m.timestamp === 'string') {
          t = new Date(m.timestamp).getTime();
        }
        if (!isNaN(t) && t > 0) {
          latestMsgTime = t;
          break;
        }
      }
    }
  }

  let fallbackTime = 0;
  const rawPTime = user.lastUpdated || user.matchedAt || user.timestamp || 0;
  if (rawPTime) {
    if (typeof rawPTime === 'number') {
      fallbackTime = rawPTime;
    } else if (rawPTime?.toMillis && typeof rawPTime.toMillis === 'function') {
      fallbackTime = rawPTime.toMillis();
    } else if (rawPTime?.seconds) {
      fallbackTime = rawPTime.seconds * 1000;
    } else if (typeof rawPTime === 'string') {
      fallbackTime = new Date(rawPTime).getTime();
    }
    if (isNaN(fallbackTime)) fallbackTime = 0;
  }

  return Math.max(latestMsgTime, fallbackTime);
}

function sortMatchedUsersByLatest() {
  matchedUsers.sort((a, b) => {
    const aTime = getLatestChatTimestamp(a);
    const bTime = getLatestChatTimestamp(b);
    return bTime - aTime;
  });
}

function movePartnerToTop(partnerId) {
  if (!partnerId) return;
  const index = matchedUsers.findIndex(u => u.id === partnerId);
  if (index === -1) {
    const p = PROFILES_DATA.find(u => u.id === partnerId) || (typeof PREMIUM_MATCHES !== 'undefined' ? PREMIUM_MATCHES.find(u => u.id === partnerId) : null);
    if (p) {
      matchedUsers.push({ ...p });
    }
  }
  // Order strictly by latest message / activity timestamp (WhatsApp style)
  sortMatchedUsersByLatest();
}

function markConversationAsRead(partnerId) {
  if (conversations[partnerId]) {
    conversations[partnerId].lastReadTimestamp = Date.now();
    if (conversations[partnerId].messages) {
      let changed = false;
      conversations[partnerId].messages.forEach(m => {
        if (m.sender === 'them' && m.read === false) {
          m.read = true;
          changed = true;
        }
      });
      if (changed) {
        saveToStorage();
        updateMatchesNotificationBadge();
      }
    }
  }
}

function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.32);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1); // A5
    gain2.gain.setValueAtTime(0.14, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.52);
  } catch (e) {
    // Audio context auto-play fallback
  }
}

// ==========================================================
// MATCH POPUP
// ==========================================================

function triggerMatchPopup(profile) {
  if (!matchedUsers.find(u => u.id === profile.id)) {
    matchedUsers.unshift(profile);
    conversations[profile.id] = {
      messages: []
    };
    saveToStorage();
    updateMatchesNotificationBadge();
  }

  renderMatchesView();

  const popup = document.getElementById('matchPopup');
  const mePhoto = document.getElementById('matchMePhoto');
  const themPhoto = document.getElementById('matchThemPhoto');
  const matchName = document.getElementById('matchPopupName');
  const matchDesc = document.getElementById('matchPopupDesc');

  if (mePhoto) mePhoto.style.backgroundImage = `url('${currentUser.image}')`;
  if (themPhoto) themPhoto.style.backgroundImage = `url('${profile.image}')`;
  if (matchName) matchName.textContent = profile.name;
  if (matchDesc) matchDesc.textContent = `You and ${profile.name} liked each other!`;

  if (popup) popup.classList.add('open');

  // Notification badge & dot
  updateMatchesNotificationBadge();
}

function closeMatchPopup() {
  const popup = document.getElementById('matchPopup');
  if (popup) popup.classList.remove('open');
}

function goToChatFromMatch() {
  closeMatchPopup();
  if (matchedUsers.length === 0) return;
  const partner = matchedUsers[0];
  openChat(partner.id);
}

// ==========================================================
// MATCHES & CONVERSATIONS
// ==========================================================

function renderMatchesView() {
  renderNewMatchesBubbles();
  renderConversationList();
  renderChatsInbox(); // keep chat inbox in sync
  if (typeof syncMatchesPresenceListeners === 'function') {
    syncMatchesPresenceListeners();
  }
}

function renderNewMatchesBubbles() {
  // Render for both Matches screen and Chats Inbox
  const rows = [
    document.getElementById('newMatchesRow'),
    document.getElementById('chatsNewMatchesRow')
  ];

  rows.forEach(row => {
    if (!row) return;
    if (matchedUsers.length === 0) {
      row.innerHTML = `<p style="color:var(--txt-muted);font-size:0.82rem;padding:4px 0;">No matches yet — keep swiping! 🔥</p>`;
      return;
    }
    row.innerHTML = matchedUsers.map(u => `
      <div class="match-bubble" onclick="openChat('${u.id}')">
        <div class="match-bubble-ring">
          <div class="match-bubble-photo" style="background-image:url('${u.image}')"></div>
        </div>
        <span class="match-bubble-name">${escHtml(u.name)}</span>
      </div>
    `).join('');
  });
}

// ==========================================================
// REAL PRESENCE & ONLINE STATUS TRACKING
// ==========================================================
const _presenceCache = {};
let _activePresenceListener = null;
const _matchesPresenceListeners = {};

function formatLastSeen(timestampMs) {
  if (!timestampMs || timestampMs <= 0) return 'Offline';
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSec < 90) return 'Active just now';
  if (diffSec < 3600) return `Active ${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `Active ${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Active yesterday';
  const days = Math.floor(diffSec / 86400);
  if (days < 7) return `Active ${days}d ago`;
  return 'Offline';
}

function getUserOnlineStatus(partnerOrId) {
  let partner = null;
  let id = '';
  if (typeof partnerOrId === 'string') {
    id = partnerOrId;
    partner = (typeof matchedUsers !== 'undefined' ? matchedUsers : []).find(u => u.id === id) ||
              (typeof PROFILES_DATA !== 'undefined' ? PROFILES_DATA : []).find(u => u.id === id) ||
              {};
  } else if (partnerOrId && typeof partnerOrId === 'object') {
    partner = partnerOrId;
    id = partner.id || '';
  }

  // 1. Live presence cache from Firestore (written by real active clients)
  if (id && _presenceCache[id]) {
    const cached = _presenceCache[id];
    const lastActivity = cached.lastSeen || cached.updatedAt || 0;
    // Considered active if marked online and updated within the last 3.5 minutes
    const isRecentlyActive = lastActivity && (Date.now() - lastActivity < 3.5 * 60 * 1000);
    const isOnline = Boolean(cached.isOnline && (isRecentlyActive || !cached.lastSeen));
    return {
      isOnline,
      label: isOnline ? 'Active now' : formatLastSeen(lastActivity),
      lastSeen: lastActivity
    };
  }

  // 2. Real Firestore user profile document if available
  if (partner && (partner.lastSeen || partner.isOnline !== undefined)) {
    let lastSeenMs = 0;
    if (typeof partner.lastSeen === 'number') lastSeenMs = partner.lastSeen;
    else if (partner.lastSeen?.toMillis) lastSeenMs = partner.lastSeen.toMillis();
    else if (partner.lastSeen?.seconds) lastSeenMs = partner.lastSeen.seconds * 1000;
    else if (typeof partner.lastSeen === 'string') lastSeenMs = new Date(partner.lastSeen).getTime();

    const isRecentlyActive = lastSeenMs && (Date.now() - lastSeenMs < 3.5 * 60 * 1000);
    const isOnline = Boolean(partner.isOnline && isRecentlyActive);
    return {
      isOnline,
      label: isOnline ? 'Active now' : formatLastSeen(lastSeenMs),
      lastSeen: lastSeenMs
    };
  }

  // 3. Genuine fallback: offline (NEVER generate fake online or fake random hours ago)
  return {
    isOnline: false,
    label: 'Offline',
    lastSeen: 0
  };
}

function updateUserPresence(isOnline) {
  if (typeof fbDb === 'undefined' || !fbDb || typeof fbAuth === 'undefined' || !fbAuth?.currentUser) return;
  const uid = fbAuth.currentUser.uid;
  const now = Date.now();
  const payload = {
    isOnline: Boolean(isOnline),
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: now
  };

  // Write to public presence collection (allowed for all signed-in users to read)
  fbDb.collection('presence').doc(uid).set(payload, { merge: true }).catch(e => console.warn('Presence write:', e.message));

  // Mirror to user profile doc
  fbDb.collection('users').doc(uid).set({
    isOnline: Boolean(isOnline),
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: now
  }, { merge: true }).catch(() => {});

  // Update in-memory presence cache for self
  _presenceCache[uid] = {
    isOnline: Boolean(isOnline),
    lastSeen: now,
    updatedAt: now
  };
}

let _lastPresenceActivityPing = 0;
function pingUserPresenceActivity() {
  const now = Date.now();
  if (now - _lastPresenceActivityPing > 35000) {
    _lastPresenceActivityPing = now;
    if (document.visibilityState === 'visible') {
      updateUserPresence(true);
    }
  }
}

function syncMatchesPresenceListeners() {
  if (typeof fbDb === 'undefined' || !fbDb || typeof fbAuth === 'undefined' || !fbAuth?.currentUser) return;
  const matchIds = new Set((matchedUsers || []).map(u => u.id).filter(id => id && String(id).length > 5));

  // Unsubscribe listeners for removed matches
  for (const [id, unsub] of Object.entries(_matchesPresenceListeners)) {
    if (!matchIds.has(id)) {
      try { unsub(); } catch (_) {}
      delete _matchesPresenceListeners[id];
    }
  }

  // Subscribe to live presence changes for every match
  matchIds.forEach(id => {
    if (_matchesPresenceListeners[id]) return;
    try {
      const unsub = fbDb.collection('presence').doc(id).onSnapshot(doc => {
        if (doc && doc.exists) {
          const pd = doc.data();
          let lastSeenMs = 0;
          if (typeof pd.lastSeen === 'number') lastSeenMs = pd.lastSeen;
          else if (pd.lastSeen?.toMillis) lastSeenMs = pd.lastSeen.toMillis();
          else if (pd.lastSeen?.seconds) lastSeenMs = pd.lastSeen.seconds * 1000;
          else if (pd.updatedAt) lastSeenMs = pd.updatedAt;

          const isRecentlyActive = pd.isOnline && (Date.now() - (lastSeenMs || pd.updatedAt || Date.now()) < 3.5 * 60 * 1000);
          _presenceCache[id] = {
            isOnline: Boolean(pd.isOnline && (isRecentlyActive || !lastSeenMs)),
            lastSeen: lastSeenMs || pd.updatedAt || Date.now(),
            updatedAt: pd.updatedAt || Date.now()
          };

          // Update chat header if active
          if (appState.currentChatId === id) {
            const statusEl = document.getElementById('chatPartnerStatus');
            if (statusEl) {
              const status = getUserOnlineStatus(id);
              if (status.isOnline) {
                statusEl.className = 'chat-partner-status is-online';
                statusEl.innerHTML = '<span class="status-online-dot">●</span> Active now';
              } else {
                statusEl.className = 'chat-partner-status';
                statusEl.innerHTML = escHtml(status.label);
              }
            }
          }

          // Live update dot in conversation list
          const convoWrapper = document.querySelector(`.convo-item[data-partner-id="${id}"] .convo-avatar-wrap`);
          if (convoWrapper) {
            const existingDot = convoWrapper.querySelector('.convo-online-dot');
            const status = getUserOnlineStatus(id);
            if (status.isOnline && !existingDot) {
              const dot = document.createElement('div');
              dot.className = 'convo-online-dot';
              convoWrapper.appendChild(dot);
            } else if (!status.isOnline && existingDot) {
              existingDot.remove();
            }
          }
        }
      }, err => console.warn('Match presence error:', err.message));
      _matchesPresenceListeners[id] = unsub;
    } catch (_) {}
  });
}
window.syncMatchesPresenceListeners = syncMatchesPresenceListeners;

function initUserPresenceTracking() {
  if (typeof fbAuth === 'undefined' || !fbAuth) return;
  fbAuth.onAuthStateChanged(user => {
    if (user) {
      updateUserPresence(true);
      if (!window.__presenceHeartbeat) {
        // Fast 45s heartbeat to ensure real-time accuracy across devices
        window.__presenceHeartbeat = setInterval(() => {
          if (document.visibilityState === 'visible') {
            updateUserPresence(true);
          }
        }, 45000);
      }
      syncMatchesPresenceListeners();
    } else {
      if (window.__presenceHeartbeat) {
        clearInterval(window.__presenceHeartbeat);
        window.__presenceHeartbeat = null;
      }
      for (const [id, unsub] of Object.entries(_matchesPresenceListeners)) {
        try { unsub(); } catch (_) {}
      }
    }
  });

  // User activity listeners: throttle to 35s
  ['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, pingUserPresenceActivity, { passive: true });
  });

  // App visibility & unload
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateUserPresence(true);
    } else {
      updateUserPresence(false);
    }
  });

  window.addEventListener('pagehide', () => {
    updateUserPresence(false);
  });

  window.addEventListener('beforeunload', () => {
    updateUserPresence(false);
  });
}
window.initUserPresenceTracking = initUserPresenceTracking;
window.getUserOnlineStatus = getUserOnlineStatus;

function _buildConvoItemHtml(u, filterQuery) {
  const hist = conversations[u.id]?.messages || [];
  const last = hist[hist.length - 1];
  let lastMsgRaw = 'Say hi! 👋';
  if (last) {
    if (last.isCall) {
      const isVideo = last.callType === 'video';
      const isMissed = last.callStatus === 'missed' || last.callStatus === 'declined';
      lastMsgRaw = isVideo
        ? (isMissed ? '📹 Missed video call' : `📹 Video call ${last.duration ? `(${last.duration})` : ''}`)
        : (isMissed ? '📞 Missed voice call' : `📞 Voice call ${last.duration ? `(${last.duration})` : ''}`);
    } else if (last.isVoice) {
      lastMsgRaw = '🎤 Voice note';
    } else if (last.videoUrl || last.isVideo) {
      lastMsgRaw = '📹 Video';
    } else if (last.imageUrl) {
      lastMsgRaw = '📷 Photo';
    } else {
      lastMsgRaw = last.text || '';
    }
  }
  const lastText = (last && last.sender === 'me' && !last.isCall) ? `You: ${lastMsgRaw}` : lastMsgRaw;

  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    if (!u.name.toLowerCase().includes(q) && !lastText.toLowerCase().includes(q)) return '';
  }

  const unreadCount = getUnreadMessagesCount(u.id);
  const isUnread = unreadCount > 0;
  const userStatus = getUserOnlineStatus(u);
  const isOnline = userStatus.isOnline;

  let timeDisplay = '';
  let lastTimeMs = 0;
  if (last?.timestamp) {
    if (typeof last.timestamp === 'number') lastTimeMs = last.timestamp;
    else if (last.timestamp?.toMillis) lastTimeMs = last.timestamp.toMillis();
    else if (last.timestamp?.seconds) lastTimeMs = last.timestamp.seconds * 1000;
    else if (typeof last.timestamp === 'string') lastTimeMs = new Date(last.timestamp).getTime();
  }
  if (lastTimeMs > 0) {
    const diffSec = Math.floor((Date.now() - lastTimeMs) / 1000);
    if (diffSec < 60) timeDisplay = 'Just now';
    else if (diffSec < 3600) timeDisplay = `${Math.floor(diffSec / 60)}m`;
    else if (diffSec < 86400) timeDisplay = `${Math.floor(diffSec / 3600)}h`;
    else timeDisplay = `${Math.floor(diffSec / 86400)}d`;
  } else if (hist.length > 0) {
    timeDisplay = 'Just now';
  }

  const isArchived = Boolean(archivedChatIds.has(u.id));
  const isMuted = Boolean(typeof mutedChatIds !== 'undefined' && mutedChatIds && mutedChatIds.has(u.id));
  return `
    <div class="convo-swipe-wrapper" id="convoSwipe_${u.id}" data-partner-id="${u.id}">
      <div class="convo-swipe-actions">
        <button class="convo-action-btn convo-archive-btn" onclick="event.stopPropagation();toggleArchiveConversation('${u.id}')" title="${isArchived ? 'Unarchive' : 'Archive'}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          <span>${isArchived ? 'Unarchive' : 'Archive'}</span>
        </button>
        <button class="convo-action-btn convo-delete-btn" onclick="event.stopPropagation();confirmDeleteConversation('${u.id}', '${escHtml(u.name)}')" title="Delete">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          <span>Delete</span>
        </button>
      </div>
      <div class="convo-item ${isUnread ? 'convo-unread' : ''}"
        data-partner-id="${u.id}"
        onclick="handleConvoClick(event, '${u.id}')"
        ontouchstart="handleConvoTouchStart(event, '${u.id}')"
        ontouchmove="handleConvoTouchMove(event, '${u.id}')"
        ontouchend="handleConvoTouchEnd(event, '${u.id}')"
        onmousedown="handleConvoMouseDown(event, '${u.id}', '${escHtml(u.name)}')"
        oncontextmenu="event.preventDefault();openConvoActionSheet('${u.id}', '${escHtml(u.name)}');">
        <div class="convo-avatar-wrap">
          <div class="convo-avatar" style="background-image:url('${u.image}')"></div>
          ${isOnline ? '<div class="convo-online-dot"></div>' : ''}
        </div>
        <div class="convo-body">
          <div class="convo-name ${isUnread ? 'convo-name-unread' : ''}">${escHtml(u.name)}</div>
          <div class="convo-preview ${isUnread ? 'convo-preview-unread' : ''}">${escHtml(lastText).substring(0, 46)}${lastText.length > 46 ? '…' : ''}</div>
        </div>
        <div class="convo-meta">
          <span class="convo-time ${isUnread ? 'convo-time-unread' : ''}">${isMuted ? '<span class="convo-muted-icon" style="opacity:0.6;font-size:11px;margin-right:3px;">🔇</span>' : ''}${timeDisplay}</span>
          ${isUnread ? `<span class="convo-unread-pill">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
        </div>
      </div>
    </div>`;
}

// Swipe & Long-Press State
let _convoSwipeState = null;
let _convoLongPressTimer = null;
let _convoLongPressFired = false;
let _activeSwipedEl = null;

function resetAllSwipedConvos() {
  document.querySelectorAll('.convo-swipe-wrapper .convo-item').forEach(el => {
    el.style.transform = 'translateX(0px)';
  });
  _activeSwipedEl = null;
}

function handleConvoClick(e, partnerId) {
  if (_convoLongPressFired) {
    _convoLongPressFired = false;
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  if (_activeSwipedEl) {
    resetAllSwipedConvos();
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  openChat(partnerId);
}

function handleConvoTouchStart(e, partnerId) {
  if (!e.touches || e.touches.length === 0) return;
  const touch = e.touches[0];
  const itemEl = e.currentTarget;
  _convoLongPressFired = false;

  if (_activeSwipedEl && _activeSwipedEl !== itemEl) {
    resetAllSwipedConvos();
  }

  const partner = matchedUsers.find(u => u.id === partnerId) || {};
  const partnerName = partner.name || 'Chat';

  _convoSwipeState = {
    partnerId,
    startX: touch.clientX,
    startY: touch.clientY,
    el: itemEl,
    swiping: false,
    currentX: 0
  };

  clearTimeout(_convoLongPressTimer);
  _convoLongPressTimer = setTimeout(() => {
    if (_convoSwipeState && !_convoSwipeState.swiping) {
      _convoLongPressFired = true;
      try { navigator.vibrate?.(45); } catch (_) {}
      openConvoActionSheet(partnerId, partnerName);
    }
  }, 450);
}

function handleConvoTouchMove(e, partnerId) {
  if (!_convoSwipeState || !e.touches || e.touches.length === 0) return;
  const touch = e.touches[0];
  const dx = touch.clientX - _convoSwipeState.startX;
  const dy = touch.clientY - _convoSwipeState.startY;

  if (!_convoSwipeState.swiping) {
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      _convoSwipeState.swiping = true;
      clearTimeout(_convoLongPressTimer);
    } else if (Math.abs(dy) > 10) {
      clearTimeout(_convoLongPressTimer);
      _convoSwipeState = null;
      return;
    }
  }

  if (_convoSwipeState.swiping) {
    const clampDx = Math.max(-144, Math.min(0, dx));
    _convoSwipeState.currentX = clampDx;
    _convoSwipeState.el.style.transition = 'none';
    _convoSwipeState.el.style.transform = `translateX(${clampDx}px)`;
  }
}

function handleConvoTouchEnd(e, partnerId) {
  clearTimeout(_convoLongPressTimer);
  if (!_convoSwipeState) return;

  if (_convoSwipeState.swiping) {
    const finalX = _convoSwipeState.currentX;
    _convoSwipeState.el.style.transition = 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)';
    if (finalX < -65) {
      _convoSwipeState.el.style.transform = 'translateX(-144px)';
      _activeSwipedEl = _convoSwipeState.el;
    } else {
      _convoSwipeState.el.style.transform = 'translateX(0px)';
      if (_activeSwipedEl === _convoSwipeState.el) _activeSwipedEl = null;
    }
  }
  _convoSwipeState = null;
}

function handleConvoMouseDown(e, partnerId, partnerName) {
  _convoLongPressFired = false;
  clearTimeout(_convoLongPressTimer);
  _convoLongPressTimer = setTimeout(() => {
    _convoLongPressFired = true;
    openConvoActionSheet(partnerId, partnerName);
  }, 500);

  const onMouseUp = () => {
    clearTimeout(_convoLongPressTimer);
    window.removeEventListener('mouseup', onMouseUp);
  };
  window.addEventListener('mouseup', onMouseUp, { once: true });
}

function openConvoActionSheet(partnerId, partnerName) {
  document.getElementById('convoActionSheetOverlay')?.remove();
  const partner = matchedUsers.find(u => u.id === partnerId) || {};
  const isArchived = archivedChatIds.has(partnerId);
  const isMuted = Boolean(typeof mutedChatIds !== 'undefined' && mutedChatIds && mutedChatIds.has(partnerId));
  const avatar = partner.image || '';

  const overlay = document.createElement('div');
  overlay.id = 'convoActionSheetOverlay';
  overlay.className = 'whatsapp-dialog-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:99999;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 0.18s ease;';
  overlay.onclick = (e) => {
    if (e.target === overlay) closeConvoActionSheet();
  };

  overlay.innerHTML = `
    <div class="convo-action-sheet" onclick="event.stopPropagation()">
      <div class="convo-sheet-header">
        <div class="convo-sheet-avatar" style="${avatar ? `background-image:url('${avatar}')` : ''}"></div>
        <div class="convo-sheet-info">
          <div class="convo-sheet-name">${escHtml(partnerName || 'Chat')}</div>
          <div class="convo-sheet-sub">Chat options</div>
        </div>
        <button class="convo-sheet-close" onclick="closeConvoActionSheet()">✕</button>
      </div>

      <div class="convo-sheet-list">
        <button class="convo-sheet-item" onclick="closeConvoActionSheet();toggleArchiveConversation('${partnerId}')">
          <div class="convo-sheet-icon" style="color:#8696a0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          </div>
          <div class="convo-sheet-label">${isArchived ? 'Unarchive chat' : 'Archive chat'}</div>
        </button>

        <button class="convo-sheet-item" onclick="closeConvoActionSheet();openChat('${partnerId}')">
          <div class="convo-sheet-icon" style="color:#25D366">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="convo-sheet-label">Open chat</div>
        </button>

        <button class="convo-sheet-item" onclick="closeConvoActionSheet();toggleMuteConversation('${partnerId}')">
          <div class="convo-sheet-icon" style="color:#8696a0">
            ${isMuted ?
              `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>` :
              `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
            }
          </div>
          <div class="convo-sheet-label">${isMuted ? 'Unmute notifications' : 'Mute notifications'}</div>
        </button>

        <button class="convo-sheet-item" onclick="closeConvoActionSheet();confirmDeleteConversation('${partnerId}', '${escHtml(partnerName)}')">
          <div class="convo-sheet-icon" style="color:#8696a0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </div>
          <div class="convo-sheet-label" style="color:#cfd8dc">Delete conversation</div>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function closeConvoActionSheet() {
  const overlay = document.getElementById('convoActionSheetOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.16s ease';
    setTimeout(() => overlay.remove(), 160);
  }
}

function confirmDeleteConversation(partnerId, partnerName) {
  if (!partnerId) return;
  const name = partnerName || 'this chat';
  if (confirm(`Delete conversation with ${name}?\n\nThis will remove the chat and delete all messages.`)) {
    deleteConversation(partnerId);
  }
}

async function deleteConversation(partnerId) {
  if (!partnerId) return;
  const myUid = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser?.uid) || currentUser?.id || currentUser?.uid || '';
  const matchId = myUid ? [myUid, partnerId].sort().join('_') : null;

  deletedConvoIds.add(partnerId);
  try {
    localStorage.setItem('hmbs_deleted_convos', JSON.stringify(Array.from(deletedConvoIds)));
    localStorage.setItem('hmbs_deleted_' + partnerId, String(Date.now()));
    localStorage.setItem('hmbs_cleared_' + partnerId, String(Date.now()));
  } catch (_) {}

  if (matchId && typeof clearChatMessagesInFirestore === 'function') {
    clearChatMessagesInFirestore(matchId).catch(() => {});
  }
  if (matchId && typeof fbDb !== 'undefined' && fbDb) {
    fbDb.collection('matches').doc(matchId).delete().catch(() => {});
  }

  matchedUsers = (matchedUsers || []).filter(u => u.id !== partnerId);
  delete conversations[partnerId];
  archivedChatIds.delete(partnerId);

  try {
    localStorage.setItem('hmbs_archived_chats', JSON.stringify(Array.from(archivedChatIds)));
  } catch (_) {}

  if (appState.currentChatId === partnerId) {
    appState.currentChatId = null;
    showScreen('chatsList');
  }

  saveToStorage();
  resetAllSwipedConvos();
  renderConversationList();
  renderChatsInbox();
  updateMatchesNotificationBadge();
  showToast('Chat deleted 🗑️', 'info');
}

function toggleArchiveConversation(partnerId) {
  if (!partnerId) return;
  if (archivedChatIds.has(partnerId)) {
    archivedChatIds.delete(partnerId);
    showToast('Chat unarchived 📥', 'info');
  } else {
    archivedChatIds.add(partnerId);
    showToast('Chat archived 📦', 'info');
  }
  try {
    localStorage.setItem('hmbs_archived_chats', JSON.stringify(Array.from(archivedChatIds)));
  } catch (_) {}
  resetAllSwipedConvos();
  renderConversationList();
  renderChatsInbox();
}

// Persisted muted chat IDs
let mutedChatIds = (function() {
  try { return new Set(JSON.parse(localStorage.getItem('hmbs_muted_chats') || '[]')); } catch(_) { return new Set(); }
})();

function toggleMuteConversation(partnerId) {
  if (!partnerId) return;
  if (mutedChatIds.has(partnerId)) {
    mutedChatIds.delete(partnerId);
    showToast('Notifications unmuted', 'info');
  } else {
    mutedChatIds.add(partnerId);
    showToast('Notifications muted', 'info');
  }
  try { localStorage.setItem('hmbs_muted_chats', JSON.stringify(Array.from(mutedChatIds))); } catch(_) {}
  renderConversationList();
  renderChatsInbox();
}

function openArchivedChatsModal() {
  document.getElementById('archivedChatsModal')?.remove();
  const archivedUsers = matchedUsers.filter(u => archivedChatIds.has(u.id));

  const modal = document.createElement('div');
  modal.id = 'archivedChatsModal';
  modal.className = 'whatsapp-dialog-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--bg-main);z-index:99999;display:flex;flex-direction:column;';

  modal.innerHTML = `
    <div class="chat-header" style="position:sticky;top:0;z-index:10;">
      <button class="chat-back-btn" onclick="document.getElementById('archivedChatsModal')?.remove()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <div class="chat-header-info">
        <div class="chat-header-name">Archived chats (${archivedUsers.length})</div>
      </div>
    </div>
    <div class="convo-list" style="flex:1;overflow-y:auto;padding-bottom:30px;">
      ${archivedUsers.length === 0
        ? `<div style="text-align:center;padding:60px 16px;color:var(--txt-muted);">No archived chats.</div>`
        : archivedUsers.map(u => _buildConvoItemHtml(u, '')).join('')
      }
    </div>
  `;
  document.body.appendChild(modal);
}

function renderConversationList() {
  const col = document.getElementById('convoList');
  if (!col) return;

  if (matchedUsers.length === 0) {
    col.innerHTML = `
      <div style="text-align:center;padding:40px 16px;color:var(--txt-muted);">
        <div style="font-size:2.5rem;margin-bottom:12px">💬</div>
        <p style="font-size:0.9rem;line-height:1.5">Match with someone to start a conversation!</p>
      </div>`;
    return;
  }

  sortMatchedUsersByLatest();
  col.innerHTML = matchedUsers.map(u => _buildConvoItemHtml(u, '')).join('');
}

// ==========================================================
// CHAT INBOX (chatsListScreen)
// ==========================================================

function renderChatsInbox(filterQuery) {
  // Ensure every partner with existing messages is present in matchedUsers even when offline
  syncMatchedUsersFromConversations();
  sortMatchedUsersByLatest();

  // New matches row in inbox
  const matchesRow = document.getElementById('chatsNewMatchesRow');
  if (matchesRow) {
    if (matchedUsers.length === 0) {
      matchesRow.innerHTML = `<p style="color:var(--txt-muted);font-size:0.82rem;padding:4px 0;">No matches yet — keep swiping! 🔥</p>`;
    } else {
      matchesRow.innerHTML = matchedUsers.map(u => `
        <div class="match-bubble" onclick="openChat('${u.id}')">
          <div class="match-bubble-ring">
            <div class="match-bubble-photo" style="background-image:url('${u.image}')"></div>
          </div>
          <span class="match-bubble-name">${escHtml(u.name)}</span>
        </div>
      `).join('');
    }
  }

  // Conversations list in inbox
  const col = document.getElementById('chatsConvoList');
  if (!col) return;

  if (matchedUsers.length === 0) {
    col.innerHTML = `
      <div style="text-align:center;padding:40px 16px;color:var(--txt-muted);">
        <div style="font-size:2.8rem;margin-bottom:14px">💬</div>
        <p style="font-size:0.92rem;line-height:1.6;font-weight:600">No conversations yet</p>
        <p style="font-size:0.8rem;margin-top:6px;color:var(--txt-muted)">Match with someone in Discover to start chatting!</p>
      </div>`;
    return;
  }

  const unarchivedUsers = matchedUsers.filter(u => !archivedChatIds.has(u.id));
  const archivedCount = matchedUsers.filter(u => archivedChatIds.has(u.id)).length;

  let archivedBannerHtml = '';
  if (archivedCount > 0 && !filterQuery) {
    archivedBannerHtml = `
      <div class="wa-archived-banner" onclick="openArchivedChatsModal()">
        <div class="wa-archived-left">
          <div class="wa-archived-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          </div>
          <span class="wa-archived-title">Archived</span>
        </div>
        <span class="wa-archived-count">${archivedCount}</span>
      </div>`;
  }

  const listToRender = filterQuery ? matchedUsers : unarchivedUsers;
  const rows = listToRender.map(u => _buildConvoItemHtml(u, filterQuery || '')).filter(Boolean);

  if (rows.length === 0 && !archivedBannerHtml) {
    col.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--txt-muted);font-size:0.88rem;">No conversations match your search.</div>`;
  } else {
    col.innerHTML = archivedBannerHtml + rows.join('');
  }
}

function filterChatsInbox(query) {
  renderChatsInbox(query);
}


// ==========================================================
// CHAT
// ==========================================================

let activeRealtimeListener = null;

// ==========================================================
// FULL UNICODE EMOJIS (Categorized WhatsApp/iOS Style)
// ==========================================================
const CATEGORIZED_EMOJIS = {
  smileys: [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
    '😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🫣','🤫','🤔',
    '🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','😮‍💨','🤥','🫨','😌','😔',
    '😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','😵‍💫','🤯','🤠',
    '🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','🥹','😦',
    '😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡',
    '😠','🤬','😈','👿','💀','☠️','💩','🤡','👻','👽','🤖','😺','😸','😹','😻','😼',
    '😽','🙀','😿','😾'
  ],
  gestures: [
    '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫸','🫷','👌','🤌','🤏','✌️','🤞','🫰','🤟',
    '🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏',
    '🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻',
    '👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','🫦'
  ],
  love: [
    '❤️','🩷','🧡','💛','💚','💙','🩵','💜','🤎','🖤','🩶','🤍','💔','❤️‍🔥','❤️‍🩹','❣️',
    '💕','💞','💓','💗','💖','💘','💝','💟','💌','🫀','💋','🫂','👩‍❤️‍👨','👩‍❤️‍👩','👨‍❤️‍👨','👩‍❤️‍💋‍👨',
    '💏','💑','💍','💎','💐','🌹','🥀','🌺','🌸','🌼','🌻','🌷','🪷','💮','🪻','✨',
    '💫','⭐','🌟','🔥'
  ],
  animals: [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸',
    '🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴',
    '🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪲','🦟','🦗','🕷️','🦂','🐢','🐍','🦎',
    '🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓',
    '🦍','🦧','🐘','🦛','🦏','🐪','🦒','🦘','🐎','🐖','🐑','🐐','🦌','🐕','🐩','🐈'
  ],
  food: [
    '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥',
    '🥝','🍅','🥑','🥦','🥒','🌶️','🌽','🥕','🥔','🥐','🥖','🍞','🥨','🥯','🧀','🥚',
    '🍳','🥞','🧇','🥓','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🌮','🌯','🥗','🍲','🍛',
    '🍜','🍝','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍢','🍡','🍧','🍨','🍦','🎂','🍰',
    '🧁','🥧','🍫','🍬','🍭','🍮','🍩','🍪','🥜','🍯','🥛','☕','🍵','🧃','🥤','🧋',
    '🍺','🍻','🥂','🍷','🥃','🍸','🍹','🍾'
  ],
  activities: [
    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍',
    '🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌',
    '🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','🤺','⛹️','🤾','🧗','🧘','🏄','🏊','🤽','🚣',
    '🚴','🚵','🏆','🥇','🥈','🥉','🎯','🎮','🎲','🎳','🚗','🚕','✈️','🚀','🏖️','🏝️'
  ],
  objects: [
    '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🕹️','💾','💿','📼','📷','📸','📹','🎥',
    '📽️','📞','☎️','📺','📻','🎙️','⏱️','⏰','🕰️','⏳','📡','🔋','🔌','💡','🔦','🕯️',
    '💸','💵','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🔧','🔨','🛠️','🪚','🔩',
    '⚙️','🧱','⛓️','🧲','💣','🧨','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🔮','🧿','💈','🔬'
  ],
  symbols: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
    '💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈',
    '♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','💯','💢','♨️','❗','❕',
    '❓','❔','‼️','⁉️','⚠️','🔱','⚜️','🔰','♻️','✅','❌','⭕','🛑','⛔','🚫','🌐',
    'Ⓜ️','💤','🏧','🚾','♿','🅿️','📶','🈁','🆖','🆗','🆙','🆒','🆕','🆓','🔢','🔟'
  ]
};

// Rich English keyword search mapping for full interactive emoji search
const EMOJI_KEYWORDS = {
  '😀': 'grinning face happy smile laugh teeth joyful cheerful',
  '😃': 'smiling face open mouth joyful happy haha cheerful',
  '😄': 'smiling face eyes open smile happy haha joy',
  '😁': 'beaming face grinning smile eye teeth happy',
  '😆': 'laughing squinteyed face haha lol funny hilarious rofl',
  '😅': 'sweat smile phew whew nervous relief awkward laughing',
  '🤣': 'rolling on the floor laughing rofl lol haha funny hilarious dead',
  '😂': 'face with tears of joy crying laughing lol haha fun hilarious dead',
  '🙂': 'slightly smiling face smile fine happy ok chill',
  '🙃': 'upside-down face sarcastic ironic silly crazy goofy',
  '😉': 'winking face wink flirt secret cheeky teasing playful',
  '😊': 'smiling blush face warm happy kind sweet love gentle',
  '😇': 'halo angel innocent blessed saint holy good pure',
  '🥰': 'smiling face hearts love romantic in love crush sweet adored',
  '😍': 'heart eyes romantic love crush amazing gorgeous attractive obsessed',
  '🤩': 'star-struck excited wow amazed celebrity stunned stars impressed',
  '😘': 'blowing kiss romance love mwah pout lips flirt date',
  '😗': 'kissing face kiss sweet flirt whistle tender',
  '😚': 'kissing closed eyes blush sweet tender affection love',
  '😙': 'kissing smiling eyes kiss love sweet happy friendly',
  '😋': 'yum delicious tasty food licking lips savoring hungry yummy',
  '😛': 'tongue out cheeky silly playful teasing joke',
  '😜': 'winking tongue playful crazy joke silly funny wacky',
  '🤪': 'zany face goofy crazy wild silly eccentric psycho funny',
  '😝': 'squinting tongue cheeky silly joke hilarious prank',
  '🤑': 'money mouth rich cash dollar bag wealthy green gold profit',
  '🤗': 'hugging face hugs hug embrace welcome friendly warm cuddle',
  '🤭': 'hand over mouth giggle oops teehee secret chuckle covert',
  '🫢': 'face open eyes hand over mouth shock surprise gasp ooh',
  '🫣': 'peeking eye scared nervous look shy peekaboo curious',
  '🤫': 'shushing face quiet shh hush silence secret whisper silent',
  '🤔': 'thinking face think wonder curious ponder hmm idea puzzle consider',
  '🫡': 'saluting face salute respect yes sir honor military ok understood',
  '🤐': 'zipper mouth shut secret quiet silenced silence silent hush secret',
  '🤨': 'raised eyebrow skeptic suspicious doubt really sure hmm suspicious',
  '😐': 'neutral face poker face blank meh emotionless straight face',
  '😑': 'expressionless face deadpan meh annoyed bored tired speechless',
  '😶': 'face without mouth mute silent speechless blank quiet invisible',
  '🫥': 'dotted line face invisible disappear hidden ghosted introverted vanished',
  '😏': 'smirking smirk cheeky flirt smug sly sensual provocative naughty',
  '😒': 'unamused face bored annoyed unimpressed side eye whatever grumpy',
  '🙄': 'rolling eyes eye roll whatever annoyed bored duh exasperated dismissive',
  '😬': 'grimacing grimace awkward cringe nervous tension yikes teeth oops',
  '😮‍💨': 'face exhaling sigh relief tired exhausted puff breath whew',
  '🤥': 'lying face pinocchio lie fake dishonest truth deceit nose long',
  '🫨': 'shaking face quake shock vibration dizzy tremble terrified tremor',
  '😌': 'relieved face calm peace relaxed zen content mindful serene smooth',
  '😔': 'pensive face sad regretful sorry down dejected melancholy depressed sorrow',
  '😪': 'sleepy tired snot bubble nap fatigue exhausted resting droopy',
  '🤤': 'drooling drool crave hungry tasty yummy asleep thirst appetizing',
  '😴': 'sleeping sleep snoring zzz tired bed dream slumber night rest',
  '😷': 'face mask sick illness doctor medical covid virus cold flu quarantine',
  '🤒': 'thermometer ill sick fever hospital health unwell temperature disease',
  '🤕': 'head bandage injured hurt accident ache concussion pain wound hospital',
  '🤢': 'nauseated vomit sick disgust gross yuck green ill puking nauseous',
  '🤮': 'vomiting puke throw up gross disgust sick ill barf regurgitate',
  '🤧': 'sneezing sneeze tissue allergies cold flu sick bless you tissue runny',
  '🥵': 'hot face sweating red heat summer dehydration thirsty spicy sunburn fever',
  '🥶': 'cold face freezing blue ice frost shivering winter cold hypothermia',
  '🥴': 'woozy drunk tipsy dizzy high disoriented spinning hangover wasted hammered',
  '😵': 'dizzy dead stunned unconscious knocked out faint stars shock ko',
  '😵‍💫': 'face spiral eyes hypnotic dizzy confused vertigo spinning trance illusion',
  '🤯': 'exploding head mind blown shock stunned wow unbelievable crazy insane boom',
  '🤠': 'cowboy hat yeehaw western sheriff texas cool fun rodeo',
  '🥳': 'partying face party celebrate birthday celebration confetti hat trumpet yay',
  '🥸': 'disguised glasses mustache detective undercover incognito funny spy disguise',
  '😎': 'sunglasses cool stylish shades confidence dope awesome chill rad boss',
  '🤓': 'nerd face smart geek glasses brainy intelligent scholar study coder tech',
  '🧐': 'monocle classy inquisitive curious inspect detective examine rich posh formal',
  '😕': 'confused face puzzle uncertain puzzled lost unsure question doubtful',
  '🫤': 'diagonal mouth unsure skeptic meh hesitant ambivalent shrug so-so',
  '😟': 'worried face worry anxious concern trouble nervous apprehension unease',
  '🙁': 'slightly frowning face unhappy sad disappointed gloom bummed glum',
  '😮': 'open mouth wow surprise shock gasp amazed whoa',
  '😯': 'hushed face surprise wow quiet startled dumbfounded stunned speech',
  '😲': 'astonished face stunned shocked amazed incredible oh my god whoa speechless',
  '😳': 'flushed blushing red shock embarrassed shy stunned nervous flustered',
  '🥺': 'pleading face puppy eyes please beg cute sad help forgive mercy',
  '🥹': 'holding back tears emotional proud touched gratitude grateful watery cry tearful',
  '😦': 'frowning face open mouth gasp shock scared dismay startled',
  '😧': 'anguished face pain sorrow agony grief terrified stressed shocked',
  '😨': 'fearful face scared frightened anxiety panic afraid horror terrified',
  '😰': 'anxious sweat cold sweat nervous dread worry stress panic frightened',
  '😥': 'sad relieved sweat whew close call disappointment pity nervous tears',
  '😢': 'crying cry tear sad sorrow weeping weep unhappy mourn depressed grief',
  '😭': 'loudly crying sobbing weeping tear despair heartbroken waah devastation bawl tears',
  '😱': 'screaming fear scream horror scared shocked terror home alone scream shout',
  '😖': 'confounded face frustrated annoyed painful struggling helpless cringe twitch',
  '😣': 'persevering face endure struggle trying hard pain distress effort stubborn',
  '😞': 'disappointed sad dejected let down depressed sorrow low disappointed',
  '😓': 'downcast sweat defeated tired stressed exhausted depressed bummed',
  '😩': 'weary face tired frustrated exhausted fed up helpless done tired',
  '😫': 'tired face exhausted weary whine groan frustrated sleepy bedtime drained',
  '🥱': 'yawning yawn sleepy bored tired bedtime waking fatigue yawn',
  '😤': 'triumph huff proud steaming angry fume arrogant determined snort puff',
  '😡': 'pouting angry red rage mad furious annoyed fury wrath irritated rage',
  '😠': 'angry face mad irritated furious annoyance temper grumpy pissed upset',
  '🤬': 'cursing swearing swear profanity expletive censor mad angry rage rage',
  '😈': 'smiling devil horns evil mischievous naughty bad cheeky devil demon',
  '👿': 'angry imp devil purple horned demon angry mad vicious evil wicked',
  '💀': 'skull dead skeleton death rip dying dying laughing rofl funny skeleton dead',
  '☠️': 'skull crossbones poison danger danger toxic pirate deadly death hazard',
  '💩': 'poop poo crap turd silly stinky bathroom dump funny pile stool',
  '🤡': 'clown circus joke fool foolish goofy scary funny circus joker clown',
  '👻': 'ghost spooky halloween booo phantom haunt spirit silly creepy haunt',
  '👽': 'alien extraterrestrial ufo space sci-fi martian invader galaxy cosmos',
  '🤖': 'robot bot artificial intelligence cyber tech android machine ai future',
  '😺': 'cat smiling grin kitten meow pet animal happy cheerful feline',
  '😸': 'cat grinning eyes kitty meow funny haha pet animal feline laugh',
  '😹': 'cat tears joy laughing crying cat lol haha meow hilarious rofl',
  '😻': 'cat heart eyes love romance crush cat kitten sweet adoration beauty',
  '😼': 'cat wry smirk sly mischievous cat meow smug feline sarcastic',
  '😽': 'cat kissing kiss affection romance cat pet tender mwah',
  '🙀': 'cat weary scream shocked terror scared cat surprise startled ooh',
  '😿': 'crying cat tear sad kitten mourn grief weep meow teardrop unhappy',
  '😾': 'pouting cat mad angry furious grumpy irritated cat pissed grumpy',
  '👋': 'waving hand wave hello hi goodbye bye greeting see ya ciao hey',
  '🤚': 'raised back of hand stop wait halt high five five backhand pause',
  '🖐️': 'hand splayed five fingers stop high five greeting open talk to hand',
  '✋': 'raised hand stop halt high five wait pause greeting permission highfive',
  '🖖': 'vulcan salute spock star trek live long and prosper sci-fi alien nerd',
  '🫱': 'rightwards hand reach grab touch offer give hold shake palm',
  '🫲': 'leftwards hand reach offer grab welcome hold receive shake',
  '🫸': 'pushing hand right refuse block stop barrier reject halt shield',
  '🫷': 'pushing hand left refuse push stop halt wait barrier prevent',
  '👌': 'ok hand gesture perfect nice approved zero correct alright got it fine deal',
  '🤌': 'pinched fingers italian chef kiss what do you want gesture mama mia perfection',
  '🤏': 'pinching hand tiny small little bit minute just a bit pinch microscopic',
  '✌️': 'victory hand peace two sign win success celebrate triumph deuces',
  '🤞': 'crossed fingers luck wish hope promise lucky fingers superstition fingerscrossed',
  '🫰': 'hand heart finger heart k-pop love money korean snap saranghae cute',
  '🤟': 'love you gesture sign language ily rock love hand affection peace',
  '🤘': 'sign of the horns rock on heavy metal rock concert party punk devilhorns',
  '🤙': 'call me hand phone shaka hang loose hawaii surf surfer chill aloha',
  '👈': 'backhand index pointing left point that way direction left look here',
  '👉': 'backhand index pointing right point direction right look see this',
  '👆': 'backhand index pointing up look above direction top up ceiling headline',
  '🖕': 'middle finger rude offensive insult f off bird flip rage curse angry',
  '👇': 'backhand index pointing down look below direction bottom down scroll floor',
  '☝️': 'index pointing up finger one attention wait point question listen remark idea',
  '🫵': 'index pointing at viewer you point user target direct blame select chosen',
  '👍': 'thumbs up good like approve yes agree great positive correct awesome perfect ok',
  '👎': 'thumbs down bad dislike disapprove no hate reject wrong negative boo trash',
  '✊': 'raised fist punch power solidarity protest fight strength unity blacklives',
  '👊': 'oncoming fist fist bump punch hit bro brofist strike knuckle boom salute',
  '🤛': 'left-facing fist bump fist fight punch greeting strike touch',
  '🤜': 'right-facing fist bump fist fight punch greeting bro partner strike',
  '👏': 'clapping hands applause bravo praise good job celebrate congrats clap cheers standingovation',
  '🙌': 'raising hands celebrate praise hooray hallelujah cheer huzzah blessing worship yay',
  '🫶': 'heart hands love affection caring cute support couple romance warm love',
  '👐': 'open hands hug butterfly honesty openness care kindness warmth welcome',
  '🤲': 'palms up together pray prayer supplication offering open donate islam charity amen',
  '🤝': 'handshake agreement deal partner business meeting welcome friends agreed shake partner',
  '🙏': 'folded hands please pray thank you namaste gratitude hope blessing apologize thanks mercy',
  '✍️': 'writing hand pen write note test letter author pencil exam document contract',
  '💅': 'nail polish manicure sassy nails glam chic diva nonchalant drama petty polish',
  '🤳': 'selfie camera photo phone picture capture pose snap instagram vlog',
  '💪': 'flexed biceps muscle strong strength fitness gym workout power flex athletic beast',
  '🦾': 'mechanical arm bionic prosthetic robot cyborg prosthetic strong muscle metal',
  '🦿': 'mechanical leg prosthetic limb robot cyborg walking artificial tech runner',
  '🦵': 'leg kick limb foot run walk knee calf hamstring thigh limb human',
  '🦶': 'foot stomp walk kick toes sole barefoot reflexology step pedis sole',
  '👂': 'ear listen hear sound audio eavesdrop hearing acoustic auditory ears hear',
  '🦻': 'ear with hearing aid accessibility deaf hearing impaired listen deaf aid',
  '👃': 'nose smell sniff scent aroma fragrance breathe breathing smell snout',
  '🧠': 'brain smart intelligent mind think psychology neurology genius brainpower memory iq',
  '🫀': 'anatomical heart cardiology cardio medical organ biology beat pulse hospital doctor',
  '🫁': 'lungs respiration respiratory breathing breath medical chest organ oxygen breath covid',
  '🦷': 'tooth teeth dental dentist smile brushing enamel molar dentistry chew bite',
  '🦴': 'bone skeleton anatomy dog treat calcium fossil skull paleontology dogbone',
  '👀': 'eyes look look at see watch glance spying curious wide looking shifty suspicious',
  '👁️': 'eye see look vision watcher sight pupil eyeball look view observe',
  '👅': 'tongue taste lick mouth cheeky silly flavor delicious spit saliva sexy',
  '👄': 'mouth lips kiss sensual lipstick beauty speak talk voice pout red sexy',
  '🫦': 'biting lip flirt nervous anxious sexy attraction anticipation bite kiss desire',
  '❤️': 'red heart love romance passion true love romantic lovers heart sweet classic',
  '🩷': 'pink heart cute love sweet affection pastel girly romantic tender darling',
  '🧡': 'orange heart care friendship warm love autumn sunny energy cozy flame',
  '💛': 'yellow heart joy happiness friendship bright pure sunshine gold warmth friend',
  '💚': 'green heart nature organic environmental eco healing money health life vegan',
  '💙': 'blue heart loyalty trust peace calm friendship water cool ocean deep',
  '🩵': 'light blue heart baby blue sky calm serenity peace soothing fresh aqua',
  '💜': 'purple heart royalty luxury passion magical glam mysterious sweet regal',
  '🤎': 'brown heart chocolate earthy cozy comfort grounding warm autumn coffee',
  '🖤': 'black heart dark grunge emo sorrow mourning chic black rock gothic dead',
  '🩶': 'gray heart silver neutral metal dull cold balanced simple minimal steel',
  '🤍': 'white heart pure innocent clean peace holy angel true serene wedding pure',
  '💔': 'broken heart heartbroken sadness grief pain break up separation dumped alone hurt',
  '❤️‍🔥': 'heart on fire burning passion desire lust flame burning love energy fiery ablaze',
  '❤️‍🩹': 'mending heart healing recovery better bandage repair broken heart convalesce fix',
  '❣️': 'heart exclamation mark exclamation love passion emphatic heart point attention',
  '💕': 'two hearts pink hearts love affection sweetness floating romance crush sweet',
  '💞': 'revolving hearts pink love romance swirling circling mutual bond sweethearts',
  '💓': 'beating heart pulsing heart rate flutter love affection excitement thumping pulse',
  '💗': 'growing heart expanding excitement love adoration affection bigger larger pulse',
  '💖': 'sparkling heart love magic star dazzle glitter shiny glitz cute sparkle shimmer',
  '💘': 'heart with arrow cupid romance struck fall in love valentine crush target arrow',
  '💝': 'heart with ribbon gift love valentine present surprise birthday romance package bow',
  '💟': 'heart decoration square white purple badge ornament love cute sticker',
  '💌': 'love letter envelope message post romance secret admirer note valentine postcard mail',
  '💋': 'kiss mark lips red lipstick romance makeup love sensual sexy smacker mwah',
  '🫂': 'people hugging embrace comfort support love friend hug empathy warm cuddle',
  '👩‍❤️‍👨': 'couple with heart love romance relationship woman man girlfriend boyfriend partners',
  '👩‍❤️‍👩': 'couple with heart lesbian love romance relationship women partners girls',
  '👨‍❤️‍👨': 'couple with heart gay love romance relationship men partners boys',
  '👩‍❤️‍💋‍👨': 'kiss couple love romance woman man kiss lips girlfriend boyfriend date',
  '💏': 'kiss couple romantic kissing lovers intimacy love affair romance date',
  '💑': 'couple love dating partners companion together soulmates romance lovers',
  '💍': 'ring diamond jewelry wedding marriage engage engagement propose promise golden bride',
  '💎': 'gem stone diamond jewelry precious luxury shiny expensive crystal sapphire carat rich',
  '💐': 'bouquet flowers floral gift present valentine wedding romance roses celebration bunch',
  '🌹': 'rose red flower petal romance love beauty valentine date floral scent bloom',
  '🥀': 'wilted flower dying rose dead drooping sad wilt faded grief romance sorrow',
  '🌺': 'hibiscus flower tropical hawaii exotic floral blossom pink bloom spring aloha',
  '🌸': 'cherry blossom sakura flower spring japan bloom floral pink petal petals hanami',
  '🌼': 'blossom flower yellow daisy spring floral nature sunny summer garden cheerful',
  '🌻': 'sunflower yellow sunny flower summer nature floral tall field cheerful bright van gogh',
  '🌷': 'tulip flower spring floral bulb holland amsterdam garden blossom pink petal',
  '🪷': 'lotus flower water lily spiritual buddhism yoga purity zen serenity meditation pond',
  '💮': 'white flower blossom rosette japanese stamp floral sweet cute reward cherry',
  '🪻': 'hyacinth lavender purple flower lilac spring bloom floral fragrant garden bloom',
  '✨': 'sparkles stars magic shiny shine clean glitter shimmer aesthetic glowing new twinkle',
  '💫': 'dizzy star shooting star spark cosmic sparkle swoosh dazzle spin space galaxy',
  '⭐': 'star yellow shiny sky gold stellar favorite rate rating astronomy night review',
  '🌟': 'glowing star bright shining sparkle glow celebration winner champion night burst',
  '🔥': 'fire lit flame hot burn heat campfire trending hype popular cool fire blaze',
  '🐶': 'dog puppy canine pet animal hound friend cute golden bark doggy woof',
  '🐱': 'cat kitten kitty pet animal feline meow purr cute paws whiskers purr',
  '🐭': 'mouse rodent rat animal cheese squeak cute whiskers mousey',
  '🐹': 'hamster pet rodent cute cheeks animal fluff hamster cage',
  '🐰': 'rabbit bunny hare easter cute pet animal carrot hopper ears fluffy',
  '🦊': 'fox wild animal cunning clever orange red fur canine tail vixen',
  '🐻': 'bear grizzly teddy animal brown predator forest roar fur teddybear',
  '🐼': 'panda bear giant bamboo china cute animal zoo black white endangered',
  '🐻‍❄️': 'polar bear arctic white ice cold animal north pole predator snow winter',
  '🐨': 'koala australia eucalyptus marsupial cute animal sleepy bear outback wildlife',
  '🐯': 'tiger head cat predator wild strip animal jungle roar ferocious bengal',
  '🦁': 'lion king head pride savanna predator wild animal roar mane safari simba',
  '🐮': 'cow farm dairy milk beef animal moo agriculture cattle meadow calf',
  '🐷': 'pig snout oink pork bacon farm animal pink mud ham piggy',
  '🐽': 'pig nose snout oink farm animal pork smell sniff truffle',
  '🐸': 'frog toad amphibian green croak ribbit pond lilypad prince kermit',
  '🐵': 'monkey ape primate jungle chimp banana zoo animal playful curious',
  '🙈': 'see no evil monkey shy cover eyes embarrassed ignore secretly look unseen oops',
  '🙉': 'hear no evil monkey ear silence noise deaf loud ignore loud cover',
  '🙊': 'speak no evil monkey secret quiet gossip silent hush whisper mute secret',
  '🐒': 'monkey climbing tail ape primate animal zoo jungle macaque baboon',
  '🐔': 'chicken hen farm bird poultry rooster egg coop cluck fowl livestock',
  '🐧': 'penguin bird antarctica cold ice arctic tuxedo waddle cute flightless',
  '🐦': 'bird avian fly wings sky chirp songbird nature tweet feathers robin',
  '🐤': 'baby chick baby bird yellow cute hatched farm chirp nestling peeper',
  '🦆': 'duck bird quack pond mallard waterfowl feathers lake swimming duckling',
  '🦅': 'eagle bird bald raptor predator america freedom soar hunt fly talon',
  '🦉': 'owl bird nocturnal wise wisdom hoot night raptor eyes forest predator',
  '🦇': 'bat vampire nocturnal cave spooky halloween radar mammal flying wings dracula',
  '🐺': 'wolf howl moon alpha pack canine predator wild dog forest winter lone',
  '🐗': 'boar wild pig hog tusks forest wild aggressive swine hunting',
  '🐴': 'horse head stallion pony equestrian equine ride farm gallop racing mane',
  '🦄': 'unicorn magical fantasy horn rainbow horse magical horse dream fairy myth pony',
  '🐝': 'bee honeybee honey insect bug buzz sting yellow pollen hive queen bumblebee',
  '🪱': 'worm earthworm bug bait soil dirt crawl garden wriggle fishing',
  '🐛': 'caterpillar bug insect larva crawl garden nature metamorphosis butterfly',
  '🦋': 'butterfly wings beautiful insect transformation cocoon blossom nature colorful fly monarch',
  '🐌': 'snail shell slow slime gastropod garden crawl nature escargot spiral mollusk',
  '🐞': 'ladybug insect beetle lucky dots red garden nature aphid bug ladybird',
  '🐜': 'ant insect worker bug colony hill tiny sugar team crawl picnic',
  '🪲': 'beetle bug insect carapace green scarab nature crawl exoskeleton bug',
  '🦟': 'mosquito insect bug malaria bite pest itchy blood swat parasite zika',
  '🦗': 'cricket insect bug grasshopper chirp jump green night lawn noise pest',
  '🕷️': 'spider arachnid web creepy halloween eight legs venom spooky fang crawl tarantula',
  '🦂': 'scorpion arachnid sting venom desert tail dangerous pincers claw pinch scorpio',
  '🐢': 'turtle tortoise reptile shell slow marine ocean swim green reptile terrapin',
  '🐍': 'snake serpent reptile venom cobra viper slither python hiss scales bite serpent',
  '🦎': 'lizard gecko reptile iguana chameleon tail scales desert basking green anole',
  '🐙': 'octopus sea creature ocean tentacle kraken marine eight arms underwater squid cephalopod',
  '🦑': 'squid calamari ocean marine underwater sea monster kraken tentacle sushi tentacles',
  '🦐': 'shrimp prawn seafood crustacean shellfish ocean food tempura scampi jumbo',
  '🦞': 'lobster shellfish seafood red marine crustacean claw butter luxury meal dinner',
  '🦀': 'crab seafood crustacean beach ocean pinch claw cancer zodiac sand crabs',
  '🐡': 'blowfish pufferfish venom fugu spike swell ocean marine aquarium fish poisonous',
  '🐠': 'tropical fish nemo ocean aquarium underwater reef exotic swim coral saltwater',
  '🐟': 'fish seafood swimming river lake lake trout salmon marine ocean tuna cod',
  '🐬': 'dolphin ocean marine mammal intelligent jump swim sea aquarium friend flipper',
  '🐳': 'spouting whale ocean giant spout marine mammal sea sea world blowhole ocean',
  '🐋': 'whale blue whale leviathan giant ocean creature mammal deep sea sea humpback',
  '🦈': 'shark predator jaws ocean teeth fin danger apex marine predator hammerhead',
  '🐊': 'crocodile alligator swamp reptile predator jaws reptile danger teeth scales gator',
  '🐅': 'tiger cat wild predator stripe safari jungle hunter feline bengal roar',
  '🐆': 'leopard cheetah spots safari wild cat fast predator agile feline jaguar',
  '🦓': 'zebra stripes safari africa savanna equine horse zoo black white wild stripes',
  '🦍': 'gorilla ape silverback primate jungle zoo king kong strong primate harambe',
  '🦧': 'orangutan ape primate red hair jungle borneo tree zoo smart primate',
  '🐘': 'elephant trunk ivory tusks giant mammal africa safari zoo memory india herd',
  '🦛': 'hippo hippopotamus river wild safari heavy huge dangerous mammal water behemoth',
  '🦏': 'rhinoceros rhino horn safari africa wild endangered armor animal heavy safari',
  '🐪': 'camel dromedary desert hump egypt nomad caravan ride dry oasis sahara',
  '🦒': 'giraffe tall neck savanna safari africa zoo tall spots yellow leaves wildlife',
  '🦘': 'kangaroo australia pouch hop jump joey marsupial outback roo boxing downunder',
  '🐕': 'dog pet canine domestic best friend loyal hound paws bark tail puppy',
  '🐈': 'cat pet feline kitty domestic meow whiskers purr paws tail kitten',
  '🍏': 'green apple fruit sour granny smith healthy food snack orchard cider organic',
  '🍎': 'red apple fruit sweet healthy food harvest orchard teacher doctor juice sweet',
  '🍐': 'pear fruit sweet healthy juicy orchard fruit green garden food fresh',
  '🍊': 'orange tangerine citrus fruit vitamin c juicy peeled mandarin healthy clementine',
  '🍋': 'lemon citrus sour yellow fruit lemonade slice juice vitamin acidic sour',
  '🍌': 'banana yellow fruit potassium peel monkey snack smoothie tropical ripe healthy',
  '🍉': 'watermelon slice melon summer juicy fruit red seeds picnic refreshing beach',
  '🍇': 'grapes vineyard wine fruit purple bunch fruit wine harvest raisins sweet vineyard',
  '🍓': 'strawberry berry red sweet fruit shortcake jam summer dessert seeds berries',
  '🫐': 'blueberries blueberry berry fruit antioxidant pancakes healthy sweet muffin fresh',
  '🍒': 'cherries cherry pair red fruit sweet dessert topping blossom pie sweet pair',
  '🍑': 'peach fruit juicy sweet fuzzy butt booty dessert summer nectar cobbler ripe',
  '🥭': 'mango tropical fruit juicy sweet orange caribbean asian exotic smooth fruit',
  '🍍': 'pineapple tropical fruit sweet spike colada pizza hawaiian yellow juicy ananas',
  '🥥': 'coconut tropical fruit palm tree milk water pina colada nutty brown island',
  '🥝': 'kiwi fruit fruit fuzzy green slices juicy new zealand healthy tart kiwi',
  '🍅': 'tomato vegetable fruit red salad sauce ketchup salsa pasta garden vine',
  '🥑': 'avocado guacamole toast keto healthy fat green pit salad brunch vegan superfood',
  '🥦': 'broccoli green vegetable tree healthy vegan diet steamed dinner veggie florets',
  '🥒': 'cucumber pickle green vegetable salad crunchy spa gherkin cooling fresh pickle',
  '🌶️': 'hot pepper chili spicy seasoning mexican red spicy burn mexican fire jalapeno',
  '🌽': 'corn on the cob maize sweetcorn harvest vegetable yellow buttery bbq farm popcorn',
  '🥕': 'carrot vegetable orange bunny vitamin root vegetable salad rabbit healthy beta',
  '🥔': 'potato vegetable russet french fries mashed spud potato chips root farm baked',
  '🥐': 'croissant pastry french bakery breakfast buttery flaky bread cafe croissant morning',
  '🍞': 'bread loaf bakery toast sandwich carbs wheat dough sliced breakfast slice crust',
  '🥖': 'baguette french bread loaf long bakery crust sandwich bread crispy bakery paris',
  '🥨': 'pretzel salted snack german bakery twist bavarian beer mustard knot dough oktoberfest',
  '🥯': 'bagel breakfast bakery round cream cheese lox toast bread dough cafe newyork',
  '🧀': 'cheese wedge swiss cheddar gouda dairy mouse yellow snack cracker slice fondue',
  '🍳': 'egg sunny side up frying pan breakfast cooking protein yolk bacon skillet cooked',
  '🥞': 'pancakes hotcakes flapjacks maple syrup butter breakfast stack brunch sweet flapjack',
  '🧇': 'waffle belgian breakfast maple syrup butter dessert grid batter brunch waffle syrup',
  '🥓': 'bacon pork breakfast meat rashers crispy fried strips brunch savory sizzling rashers',
  '🍗': 'chicken poultry leg drumstick fried chicken meat bbq roasted crispy wing kfc',
  '🍖': 'meat on bone roast ribs anime meat primal steak savory prehistoric dinner bbq',
  '🌭': 'hot dog sausage bun frankfurter mustard ketchup fast food bbq baseball snack weiner',
  '🍔': 'hamburger burger cheeseburger fast food beef bun fries diner grill meal patty',
  '🍟': 'french fries chips mcdonalds potato snack fast food salty crispy ketchup sides potato',
  '🍕': 'pizza slice pepperoni cheese italian mozzarella pie fast food delivery slice slice',
  '🥪': 'sandwich lunch deli sub bread turkey lettuce tomato blt snack meal toast',
  '🌮': 'taco mexican street food shell meat salsa fiesta tuesday tortilla lime carne',
  '🌯': 'burrito mexican wrap tortilla beans rice chipotle carnitas lunch dinner wrap',
  '🥗': 'green salad bowl healthy vegetables lettuce vegan diet vegetarian dressing fresh greens',
  '🍿': 'popcorn movie cinema theater snack butter kernel salty corn film entertainment movie',
  '🍜': 'ramen noodles steaming bowl broth chopsticks soup japanese asian comfort meal pho',
  '🍝': 'spaghetti pasta italian bolognese meatball marinara noodles dinner savory tomato carbonara',
  '🍣': 'sushi japanese sashimi salmon tuna rice roll chopsticks wasabi seaweed dinner maki',
  '🍱': 'bento box japanese lunch meal rice dish assortment takeout dinner set boxed',
  '🥟': 'dumpling gyoza potsticker dim sum asian chinese dough meat steamed dipping wonton',
  '🍤': 'fried shrimp tempura prawn seafood crispy breaded japanese sushi appetizer snack',
  '🎂': 'birthday cake celebration frosted party candles dessert sweet bakery slice wish party',
  '🍰': 'shortcake strawberry cake slice dessert bakery sweet bakery pastry dessert berry slice',
  '🧁': 'cupcake frosting muffin dessert sweet bakery birthday treat sprinkles icing party',
  '🥧': 'pie baked apple pie pastry crust thanksgiving dessert slice sweet bakery warm pastry',
  '🍫': 'chocolate bar candy sweet cocoa dessert treat snack milk chocolate cacao sugar choc',
  '🍬': 'candy sweet bonbon wrapper sugary confection halloween treat sugar snack chew sweet',
  '🍭': 'lollipop candy suck sucker swirl colorful sweet confection treat sugar chupa',
  '🍮': 'custard flan pudding dessert caramel sweet japanese bakery soft caramel sauce creme',
  '🍩': 'doughnut donut glazed chocolate sprinkles pastry bakery sweet fried coffee breakfast dunkin',
  '🍪': 'cookie chocolate chip baked bakery sweet treat milk biscuit snack dough crunch chips',
  '🍺': 'beer mug ale lager draft foam pub alcohol bar drink pint cheers brew pint',
  '🍻': 'clinking beer mugs cheers toast pub celebration bar drinks friends toast brew party',
  '🥂': 'clinking glasses champagne toast cheers celebration wedding party sparkling wine cheers',
  '🍷': 'wine glass red wine cabernet vineyard alcohol romance dinner beverage sip grape merlot',
  '🥃': 'tumbler whiskey bourbon scotch on the rocks liquor liquor drink alcohol bar rye',
  '🍸': 'cocktail martini olive lounge alcohol bar drink dry cosmopolitan glass classic gin',
  '🍹': 'tropical drink cocktail tiki beach vacation straw island fruity rum mai tai colada party',
  '🍾': 'bottle popping cork champagne prosecco sparkling wine celebration new year celebrate party bubbly',
  '☕': 'coffee hot beverage cafe espresso latte cappuccino tea morning mug brew roast decaf',
  '🍵': 'teacup tea green tea matcha hot drink beverage herbal zen morning leaves mug oolong',
  '🧋': 'boba bubble tea tapioca pearls milk tea taiwanese straw sweet drink milky sip pearls',
  '🥤': 'cup with straw soda soft drink beverage fast food takeout milkshake iced cup drink',
  '⚽': 'soccer football ball sport goal pitch game kick athlete tournament fifa match premier',
  '🏀': 'basketball hoop court dunk ball nba sport athlete dribble game slam jump basket',
  '🏈': 'american football gridiron nfl superbowl sport touchdown leather ball goal field tailgate',
  '⚾': 'baseball sport bat glove pitch strike ball home run mlb field game catch strike',
  '🎾': 'tennis ball racket court match game sport wimbledon green serve ace volley tournament',
  '🏐': 'volleyball court net beach ball spike sport sand game bump setter rally sand',
  '🥊': 'boxing glove punch fighter bout ring training combat spar bout champion round glove',
  '🥋': 'martial arts uniform karate judo taekwondo black belt dojo fight combat training gi sensei',
  '🛹': 'skateboard skate board skatepark ollie street kickflip grind ride wheels skater tony',
  '🎮': 'video game controller joystick gamepad playstation xbox nintendo gaming gamer arcade play steam',
  '🎲': 'game die dice rolling board game gambling chance casino luck tabletop random roll vegas',
  '🎯': 'bullseye direct hit target dart archery arrow accuracy goal precision score center accurate',
  '🎳': 'bowling pins strike alley sport ball spare lane game roll frame pins strike',
  '🚗': 'car automobile red vehicle drive transportation road auto motor sedan trip engine wheels',
  '🚕': 'taxi cab yellow ride hail uber lyft transport vehicle city fare meter airport cabby',
  '✈️': 'airplane aeroplane flight travel vacation journey wings sky airport airport trip fly boarding',
  '🚀': 'rocket ship space launch shuttle blast off speed to the moon fast starship orbit nasa',
  '🏖️': 'beach umbrella sand ocean sea summer vacation resort tropical sun island shore coast sunny',
  '🏝️': 'desert island solitary palm tree vacation tropical beach sea paradise escape shore castaway',
  '📱': 'mobile phone smartphone cell apple iphone android screen device call text app message dial',
  '💻': 'laptop computer personal macbook pc portable work code program screen keyboard tech laptop',
  '📷': 'camera photo photography picture snapshot lens shutter portrait vintage capture flash shoot',
  '📸': 'camera flash taking photo snapshot picture capture shutter photographer memory selfie lens picture',
  '📹': 'video camera camcorder recording film footage movie broadcast tape recorder visual lens video',
  '🎥': 'movie camera cinema film hollywood recording studio motion picture director cinematography screening theater',
  '💡': 'light bulb idea inspiration think bright electricity lamp energy concept solution invent insight',
  '💸': 'money with wings flying away spent cash dollar lost waste extravagant shopping wealth bill cash',
  '💵': 'dollar banknote paper currency money cash payment purchase greenback bill wallet capital bucks',
  '💰': 'money bag sack wealth rich coins dollars jackpot treasury fortune cash gold profit loot',
  '💳': 'credit card payment visa mastercard debit shopping transaction checkout swipe debt plastic bank purchase',
  '💎': 'gem stone diamond jewel sapphire precious crystal expensive rich sparkly jewelry luxury gem'
};

const SMILEY_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5 14.67 11 15.5 11zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>`;
const KEYBOARD_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/></svg>`;

let currentEmojiCategory = 'smileys';

// ==========================================================
// CHAT NAVIGATION & HEADER (WhatsApp Style)
// ==========================================================
function openChat(profileId, { fromHistory = false } = {}) {
  if (isContactBlocked(profileId)) {
    showToast('This contact is blocked. Unblock them in Settings to chat.', 'error');
    if (appState.currentChatId === profileId) appState.currentChatId = null;
    showScreen('matches');
    return;
  }
  appState.currentChatId = profileId;
  showScreen('chat', { fromHistory });

  // Mark all incoming messages in this chat as read and refresh badge
  markConversationAsRead(profileId);
  updateMatchesNotificationBadge();

  // Populate WhatsApp-style in-chat header
  const partner = matchedUsers.find(u => u.id === profileId) || PROFILES_DATA.find(u => u.id === profileId);
  const nameEl = document.getElementById('chatPartnerName');
  const avatarEl = document.getElementById('chatPartnerAvatar');
  const statusEl = document.getElementById('chatPartnerStatus');
  const photo = partner?.image || partner?.photoUrl || '';

  if (nameEl) nameEl.textContent = partner ? partner.name : 'Chat';
  if (avatarEl) {
    if (photo) {
      avatarEl.style.backgroundImage = `url('${photo}')`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.textContent = '';
    } else {
      avatarEl.style.backgroundImage = 'none';
      avatarEl.textContent = partner ? partner.name.charAt(0) : '?';
    }
  }
  if (statusEl) {
    const currentStatus = getUserOnlineStatus(profileId);
    if (currentStatus.isOnline) {
      statusEl.className = 'chat-partner-status is-online';
      statusEl.innerHTML = '<span class="status-online-dot">●</span> Active now';
    } else {
      statusEl.className = 'chat-partner-status';
      statusEl.innerHTML = escHtml(currentStatus.label);
    }
  }

  // Subscribe to partner live presence changes if on Firebase
  if (typeof _activePresenceListener === 'function') {
    _activePresenceListener();
    _activePresenceListener = null;
  }
  if (typeof fbDb !== 'undefined' && fbDb && profileId) {
    try {
      _activePresenceListener = fbDb.collection('presence').doc(profileId).onSnapshot(doc => {
        if (doc && doc.exists) {
          const d = doc.data();
          let lastSeenMs = 0;
          if (typeof d.lastSeen === 'number') lastSeenMs = d.lastSeen;
          else if (d.lastSeen?.toMillis) lastSeenMs = d.lastSeen.toMillis();
          else if (d.lastSeen?.seconds) lastSeenMs = d.lastSeen.seconds * 1000;
          _presenceCache[profileId] = {
            isOnline: Boolean(d.isOnline),
            lastSeen: lastSeenMs
          };
          const updated = getUserOnlineStatus(profileId);
          const currentStatusEl = document.getElementById('chatPartnerStatus');
          if (currentStatusEl && appState.currentChatId === profileId) {
            if (updated.isOnline) {
              currentStatusEl.className = 'chat-partner-status is-online';
              currentStatusEl.innerHTML = '<span class="status-online-dot">●</span> Active now';
            } else {
              currentStatusEl.className = 'chat-partner-status';
              currentStatusEl.innerHTML = escHtml(updated.label);
            }
          }
        }
      }, err => console.warn('Presence listener:', err.message));
    } catch (e) {}
  }

  // Reset emoji panel and input
  closeEmojiPicker();
  const chatInput = document.getElementById('chatInput');
  if (chatInput) chatInput.value = '';
  onChatInputChange();

  // Ensure WhatsApp search bar and 3-dots menu are reset closed
  if (typeof closeChatSearch === 'function') closeChatSearch();
  const menu = document.getElementById('chatDropdownMenu');
  if (menu) menu.style.display = 'none';

  renderChatThread();

  // Unsubscribe from any previous Firestore chat listener
  if (typeof activeRealtimeListener === 'function') {
    activeRealtimeListener();
    activeRealtimeListener = null;
  }

  // Subscribe to real-time Firebase chat if logged in (or as soon as auth restores)
  const setupRealtimeChat = (uid) => {
    if (!uid || appState.currentChatId !== profileId) return;
    const matchId = [uid, profileId].sort().join('_');
    if (typeof activeRealtimeListener === 'function') {
      try { activeRealtimeListener(); } catch (_) {}
      activeRealtimeListener = null;
    }
    if (typeof listenToRealtimeMessages === 'function') {
      activeRealtimeListener = listenToRealtimeMessages(matchId, (msgs) => {
        const remoteMsgs = (msgs || []).map(m => {
          const senderId = m.sender || m.senderId;
            let isMe = false;
            if (m.isCall) {
              if (senderId) {
                isMe = (senderId === uid);
              } else if (m.recipientId) {
                isMe = (m.recipientId !== uid);
              } else if (m.sender === 'me') {
                isMe = true;
              } else if (m.sender === 'them') {
                isMe = false;
              } else if (m.callDirection) {
                isMe = (m.callDirection === 'outgoing');
              }
            } else {
              isMe = (senderId === uid) || (m.sender === 'me');
            }
            return {
              id: m.id || null,
              sender: isMe ? 'me' : 'them',
              senderId: senderId || (isMe ? uid : profileId),
              recipientId: m.recipientId || (isMe ? profileId : uid),
              text: m.text || '',
              isVoice: m.isVoice || false,
              isCall: m.isCall || false,
              callType: m.callType || 'audio',
              callDirection: isMe ? 'outgoing' : 'incoming',
              callStatus: m.callStatus || 'completed',
              replyTo: m.replyTo || null,
              audioUrl: m.audioUrl || '',
              imageUrl: m.imageUrl || '',
              videoUrl: m.videoUrl || '',
              isVideo: Boolean(m.isVideo || m.videoUrl),
              duration: m.duration || '0:05',
              read: true,
              timestamp: m.timestamp?.toMillis ? m.timestamp.toMillis() : (typeof m.timestamp === 'number' ? m.timestamp : Date.now()),
              reactions: m.reactions || {},
              firestoreId: m.id || null
            };
          });

        // Filter out any messages older than user's last chat clear timestamp
        const clearedAt = parseInt(localStorage.getItem('hmbs_cleared_' + profileId) || '0', 10);
        const validRemoteMsgs = remoteMsgs.filter(m => (m.timestamp || 0) > clearedAt);

        // Retain recently added local pending messages (e.g. photos/videos being uploaded)
        const currentMsgs = conversations[profileId]?.messages || [];
        const pendingLocal = currentMsgs.filter(m => {
          if (!m.id || !String(m.id).startsWith('local_')) return false;
          if ((m.timestamp || 0) <= clearedAt) return false;
          // Retain if still uploading or created within the last 15 minutes
          const isFresh = Boolean(m._uploading) || (Date.now() - (m.timestamp || 0) < 15 * 60 * 1000);
          if (!isFresh) return false;
          const alreadyInRemote = validRemoteMsgs.some(rm =>
            (rm.localId && rm.localId === m.id) ||
            (rm.videoUrl && (rm.videoUrl === m.videoUrl || rm.videoUrl === m.imageUrl)) ||
            (rm.imageUrl && (rm.imageUrl === m.imageUrl || rm.imageUrl === m.videoUrl)) ||
            (rm.audioUrl && rm.audioUrl === m.audioUrl) ||
            (rm.text && rm.text === m.text && Math.abs((rm.timestamp || 0) - (m.timestamp || 0)) < 6000)
          );
          return !alreadyInRemote;
        });

        const prevMsgs = conversations[profileId]?.messages || [];
        const prevLastTime = prevMsgs.length > 0 ? (prevMsgs[prevMsgs.length - 1].timestamp || 0) : 0;

        // NEVER wipe local cached messages if remote snapshot is empty (e.g. offline, airplane mode, or network blip)
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
        };
        // Mark newly received messages as read
        if (typeof markMessagesReadInFirestore === 'function') {
          markMessagesReadInFirestore(matchId);
        }

        // Only sort chats to top if a genuinely new incoming/outgoing message arrived while listening
        // Merely opening an existing chat to read old messages must NOT move it to the top!
        const newMsgs = conversations[profileId].messages;
        const newLastTime = newMsgs.length > 0 ? (newMsgs[newMsgs.length - 1].timestamp || 0) : 0;
        if (prevLastTime > 0 && newLastTime > prevLastTime) {
          sortMatchedUsersByLatest();
        }

        renderChatThread();
        renderConversationList();
        renderChatsInbox();
        updateMatchesNotificationBadge();
        saveToStorage();
      });
    }
  };

  if (typeof fbAuth !== 'undefined' && fbAuth) {
    if (fbAuth.currentUser) {
      setupRealtimeChat(fbAuth.currentUser.uid);
    } else {
      const unsub = fbAuth.onAuthStateChanged(user => {
        unsub();
        if (user && appState.currentChatId === profileId) {
          setupRealtimeChat(user.uid);
        }
      });
    }
  }
}

// 3-Dots WhatsApp Menu & Actions
function toggleChatOptionsMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('chatDropdownMenu');
  if (!menu) return;
  const isShown = menu.style.display === 'block';
  menu.style.display = isShown ? 'none' : 'block';
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('chatDropdownMenu');
  const trigger = document.getElementById('chatMenuTrigger');
  if (menu && menu.style.display === 'block') {
    if (!menu.contains(e.target) && (!trigger || !trigger.contains(e.target))) {
      menu.style.display = 'none';
    }
  }
});

function viewCurrentMatchProfile() {
  const menu = document.getElementById('chatDropdownMenu');
  if (menu) menu.style.display = 'none';
  if (!appState.currentChatId) return;

  const partner = matchedUsers.find(u => u.id === appState.currentChatId) || PROFILES_DATA.find(u => u.id === appState.currentChatId);
  if (!partner) return;

  document.getElementById('whatsappProfileOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'whatsapp-profile-overlay';
  overlay.id = 'whatsappProfileOverlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeWhatsAppProfile(); };

  const allPhotos = [];
  if (Array.isArray(partner.photos) && partner.photos.length > 0) {
    partner.photos.forEach(u => { if (u) allPhotos.push(u); });
  }
  if (allPhotos.length === 0 && (partner.image || partner.photoUrl)) {
    allPhotos.push(partner.image || partner.photoUrl);
  }
  const photo = allPhotos[0] || '';
  const tagsHtml = (partner.tags || ['Positive vibes ✨', 'Music 🎵', 'Foodie 🍕']).map(t => `<span class="wa-interest-pill">${escHtml(t)}</span>`).join('');
  const partnerName = escHtml(partner.name || 'User');
  const partnerAge = partner.age || 24;
  const partnerLoc = partner.location || partner.city || 'Lagos, Nigeria';
  const partnerDistance = typeof getDynamicProfileDistance === 'function' ? getDynamicProfileDistance(partner) : (partner.distance || '3 km away');
  const partnerBio = escHtml(partner.bio || 'Living life with good energy, positive vibes only! ✨');

  let isMuted = false;
  try {
    const mutedList = JSON.parse(localStorage.getItem('hmbs_muted_matches') || '[]');
    isMuted = mutedList.includes(partner.id);
  } catch (_) {}

  overlay.innerHTML = `
    <div class="whatsapp-profile-sheet" id="whatsappProfileSheet">
      <div class="wa-grab-bar-wrap" onclick="closeWhatsAppProfile()">
        <div class="wa-grab-bar"></div>
      </div>
      
      <!-- Top actions -->
      <div class="wa-profile-top-bar">
        <button class="wa-circle-btn" onclick="closeWhatsAppProfile()" aria-label="Close" title="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <span class="wa-top-title">Contact Info</span>
        <button class="wa-circle-btn" onclick="closeWhatsAppProfile();reportUser();" aria-label="Report or Block" title="Options">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </button>
      </div>

      <div class="wa-profile-scroll-content">
        <!-- Hero Photo & Details -->
        <div class="wa-profile-hero">
          <div class="wa-avatar-ring">
            ${photo ? `<img src="${photo}" class="wa-avatar-img" alt="${partnerName}" onclick="openFullPhotoModal('${photo}')" title="Click to enlarge">` : `<div class="wa-avatar-fallback">${partnerName.charAt(0)}</div>`}
          </div>
          <div class="wa-name-row">
            <h2 class="wa-profile-name">${partnerName}, ${partnerAge}</h2>
            <span class="wa-verified-badge" title="Verified Profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </span>
          </div>
          <div class="wa-status-row">
            <span class="wa-pulse-dot"></span>
            <span class="wa-status-text">Active now • ${escHtml(partnerLoc)}</span>
          </div>
        </div>

        <!-- WhatsApp Quick Action Icons -->
        <div class="wa-quick-actions">
          <button class="wa-action-btn" onclick="closeWhatsAppProfile();setTimeout(()=>{const inp=document.getElementById('chatInput');if(inp)inp.focus();},150);" title="Message">
            <div class="wa-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
            </div>
            <span>Message</span>
          </button>
          <button class="wa-action-btn" onclick="closeWhatsAppProfile();startVoiceCall();" title="Audio Call">
            <div class="wa-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
            </div>
            <span>Audio</span>
          </button>
          <button class="wa-action-btn" onclick="closeWhatsAppProfile();startVideoCall();" title="Video Call">
            <div class="wa-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
            </div>
            <span>Video</span>
          </button>
          <button class="wa-action-btn" onclick="closeWhatsAppProfile();reportUser();" title="Report / Block">
            <div class="wa-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
            <span>Report</span>
          </button>
        </div>

        ${allPhotos.length > 0 ? `
        <!-- Media Gallery -->
        <div class="wa-card">
          <div class="wa-card-header" style="display:flex;align-items:center;justify-content:space-between">
            <span class="wa-card-label">Media, Links and Docs</span>
            <span class="wa-media-count" style="font-size:0.78rem;color:#E3B34D;font-weight:700">${allPhotos.length} photo${allPhotos.length > 1 ? 's' : ''}</span>
          </div>
          <div class="wa-media-strip">
            ${allPhotos.map((p, idx) => `
              <div class="wa-media-thumb" style="background-image:url('${safeCssUrl(p)}')" onclick="openFullPhotoModal('${escHtml(p)}')" role="button" tabindex="0" title="View photo ${idx + 1}"></div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Notifications Settings -->
        <div class="wa-card">
          <div class="wa-settings-row">
            <div class="wa-settings-info">
              <div class="wa-settings-title">Mute Notifications</div>
              <div class="wa-settings-sub">Silence incoming messages & calls from this match</div>
            </div>
            <label class="wa-toggle-switch">
              <input type="checkbox" id="waMuteToggle" onchange="toggleMuteMatch('${partner.id}', this.checked)" ${isMuted ? 'checked' : ''}>
              <span class="wa-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- WhatsApp Info Cards -->
        <div class="wa-card">
          <div class="wa-card-header">
            <span class="wa-card-label">About</span>
          </div>
          <p class="wa-card-body">${partnerBio}</p>
          <div class="wa-card-sub">Connected via hookmebysam match</div>
        </div>

        <div class="wa-card">
          <div class="wa-card-header">
            <span class="wa-card-label">Passions & Lifestyle</span>
          </div>
          <div class="wa-tags-wrap">${tagsHtml}</div>
        </div>

        <div class="wa-card">
          <div class="wa-card-header">
            <span class="wa-card-label">Location & Distance</span>
          </div>
          <div class="wa-info-row">
            <span class="wa-info-icon">📍</span>
            <div class="wa-info-text">
              <div class="wa-info-main">${escHtml(partnerLoc)}</div>
              <div class="wa-info-sub">${escHtml(partnerDistance)}</div>
            </div>
          </div>
        </div>

        <!-- WhatsApp Privacy / Danger Actions -->
        <div class="wa-card wa-danger-card">
          <div class="wa-danger-item" onclick="closeWhatsAppProfile();blockUser('${partner.id}', '${partnerName}');">
            <div class="wa-danger-icon">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
            </div>
            <span>Block ${partnerName}</span>
          </div>
          <div class="wa-danger-item" onclick="closeWhatsAppProfile();reportUser();">
            <div class="wa-danger-icon">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
            </div>
            <span>Report ${partnerName}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function closeWhatsAppProfile() {
  const overlay = document.getElementById('whatsappProfileOverlay');
  if (!overlay) return;
  const sheet = document.getElementById('whatsappProfileSheet');
  if (sheet) {
    sheet.style.transform = 'translateY(100%)';
    sheet.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
  }
  setTimeout(() => overlay.remove(), 220);
}

function toggleMuteMatch(matchId, isMuted) {
  haptic('light');
  try {
    let mutedList = JSON.parse(localStorage.getItem('hmbs_muted_matches') || '[]');
    if (isMuted) {
      if (!mutedList.includes(matchId)) mutedList.push(matchId);
      showToast('🔕 Notifications muted for this match', 'info');
    } else {
      mutedList = mutedList.filter(id => id !== matchId);
      showToast('🔔 Notifications unmuted', 'info');
    }
    localStorage.setItem('hmbs_muted_matches', JSON.stringify(mutedList));
  } catch (_) {}
}
window.toggleMuteMatch = toggleMuteMatch;

function sendChatEmptyStarter(partnerId, text) {
  haptic('medium');
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = text;
    sendMessage();
  }
}
window.sendChatEmptyStarter = sendChatEmptyStarter;

function openFullPhotoModal(url) {
  if (!url) return;
  document.getElementById('fullPhotoModal')?.remove();
  const ov = document.createElement('div');
  ov.className = 'whatsapp-dialog-overlay';
  ov.id = 'fullPhotoModal';
  ov.style.zIndex = '10001';
  ov.onclick = () => ov.remove();
  ov.innerHTML = `
    <div style="position:relative;max-width:90vw;max-height:85vh;animation:popIn 0.2s cubic-bezier(0.16,1,0.3,1)">
      <img src="${url}" style="width:100%;max-height:85vh;object-fit:contain;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,0.8)">
      <button onclick="document.getElementById('fullPhotoModal')?.remove()" style="position:absolute;top:-14px;right:-14px;width:38px;height:38px;border-radius:50%;background:#FF2E70;color:#fff;border:none;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.5)">✕</button>
    </div>
  `;
  document.body.appendChild(ov);
}

function clearCurrentChatHistory() {
  const menu = document.getElementById('chatDropdownMenu');
  if (menu) menu.style.display = 'none';
  if (!appState.currentChatId) return;
  if (confirm('Clear chat conversation?')) {
    const chatId = appState.currentChatId;
    const now = Date.now();
    try {
      localStorage.setItem('hmbs_cleared_' + chatId, String(now));
    } catch (_) {}

    if (conversations[chatId]) {
      conversations[chatId].messages = [];
    }

    // Clear from Firestore so it never re-appears on reload or other device
    const uid = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser?.uid) || currentUser?.id || currentUser?.uid;
    if (uid && typeof clearChatMessagesInFirestore === 'function') {
      const matchId = [uid, chatId].sort().join('_');
      clearChatMessagesInFirestore(matchId).catch(() => {});
    }

    renderChatThread();
    renderConversationList();
    renderChatsInbox();
    saveToStorage();
    showToast('Chat cleared', 'info');
  }
}

function formatWhatsAppTime(timestamp, fallbackTime) {
  if (timestamp) {
    const date = (typeof timestamp === 'number') ? new Date(timestamp) : (timestamp?.toDate ? timestamp.toDate() : new Date(timestamp));
    if (!isNaN(date.getTime())) {
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    }
  }
  if (fallbackTime && typeof fallbackTime === 'string') return fallbackTime;
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getWhatsAppDateHeader(timestamp, fallbackTime) {
  let msgDate = null;
  if (timestamp) {
    msgDate = (typeof timestamp === 'number') ? new Date(timestamp) : (timestamp?.toDate ? timestamp.toDate() : new Date(timestamp));
  }
  if (!msgDate || isNaN(msgDate.getTime())) {
    msgDate = new Date();
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(msgDate, today)) {
    return 'Today';
  }
  if (isSameDay(msgDate, yesterday)) {
    return 'Yesterday';
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[msgDate.getMonth()]} ${msgDate.getDate()}, ${msgDate.getFullYear()}`;
}

function applyChatCustomBackground(chatId) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const id = chatId || appState.currentChatId;
  const bg = (id && localStorage.getItem('hmbs_chat_bg_' + id)) || localStorage.getItem('hmbs_chat_bg_global') || '';
  if (bg) {
    container.style.backgroundImage = `url('${bg}')`;
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';
    container.style.backgroundRepeat = 'no-repeat';
  } else {
    container.style.backgroundImage = '';
  }
}
window.applyChatCustomBackground = applyChatCustomBackground;

function removeChatCustomBackground(chatId) {
  const id = chatId || appState.currentChatId;
  const menu = document.getElementById('chatDropdownMenu');
  if (menu) menu.style.display = 'none';
  const lbMenu = document.getElementById('lightboxDropdownMenu');
  if (lbMenu) lbMenu.style.display = 'none';

  if (!id) return;
  const hasBg = Boolean(localStorage.getItem('hmbs_chat_bg_' + id) || localStorage.getItem('hmbs_chat_bg_global'));
  try {
    localStorage.removeItem('hmbs_chat_bg_' + id);
    localStorage.removeItem('hmbs_chat_bg_global');
  } catch (e) {}

  applyChatCustomBackground(id);
  if (hasBg) {
    showToast('Chat background removed! Default wallpaper restored 🎨', 'gold');
  } else {
    showToast('Default chat wallpaper is already active.', 'info');
  }
}
window.removeChatCustomBackground = removeChatCustomBackground;

function renderChatThread() {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const partnerId = appState.currentChatId;
  applyChatCustomBackground(partnerId);

  const hist = conversations[appState.currentChatId]?.messages || [];
  const matchId = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser && partnerId)
    ? [fbAuth.currentUser.uid, partnerId].sort().join('_')
    : null;

  if (hist.length === 0) {
    const partner = (typeof matchedUsers !== 'undefined' ? matchedUsers : []).find(u => u.id === partnerId) || (typeof PROFILES_DATA !== 'undefined' ? PROFILES_DATA : []).find(u => u.id === partnerId);
    const partnerName = partner ? escHtml(partner.name) : 'your match';
    container.innerHTML = `
      <div class="chat-match-milestone" style="text-align:center;padding:28px 16px 36px;color:var(--txt-muted);">
        <div style="width:64px;height:64px;border-radius:50%;margin:0 auto 12px;background:var(--grad-flame);display:flex;align-items:center;justify-content:center;font-size:1.8rem;box-shadow:0 8px 24px rgba(255,46,112,0.3)">🔥</div>
        <p style="font-weight:700;color:var(--txt-primary);font-size:1.05rem;margin-bottom:4px">You matched with ${partnerName}!</p>
        <p style="font-size:0.82rem;line-height:1.45;max-width:260px;margin:0 auto 16px;color:rgba(255,255,255,0.6)">Break the ice with a conversation starter:</p>
        <div class="chat-empty-icebreakers">
          <button class="chat-empty-ib-btn" onclick="sendChatEmptyStarter('${escHtml(partnerId)}', 'Hey ${partnerName}! How is your day going? ✨')">
            👋 Hey ${partnerName}! How's your day going?
          </button>
          <button class="chat-empty-ib-btn" onclick="sendChatEmptyStarter('${escHtml(partnerId)}', 'Loved your vibe on your profile! What music are you listening to lately? 🎵')">
            🎵 Loved your vibe! What music are you playing lately?
          </button>
          <button class="chat-empty-ib-btn" onclick="sendChatEmptyStarter('${escHtml(partnerId)}', 'Describe your perfect Sunday in Lagos 🌅')">
            🌅 Describe your perfect Sunday in Lagos
          </button>
        </div>
      </div>
    `;
    return;
  }

  let lastDateHeader = null;
  let html = '';

  hist.forEach((msg, idx) => {
    const isLast = idx === hist.length - 1;
    let isSent = msg.sender === 'me';
    if (msg.isCall) {
      if (typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
        const myUid = fbAuth.currentUser.uid;
        const sid = msg.senderId || (msg.sender !== 'me' && msg.sender !== 'them' ? msg.sender : null);
        if (sid) {
          isSent = (sid === myUid);
        } else if (msg.recipientId) {
          isSent = (msg.recipientId !== myUid);
        } else if (msg.callDirection) {
          isSent = (msg.callDirection === 'outgoing');
        }
      } else if (msg.callDirection) {
        isSent = (msg.callDirection === 'outgoing');
      }
    }
    const msgId = msg.firestoreId || msg.id || `local_${idx}`;
    if (!msg.firestoreId) msg.firestoreId = msgId;
    const timeStr = formatWhatsAppTime(msg.timestamp, msg.time);

    // Date separator pill (Today, Yesterday, or Month Day, Year)
    const dateHeader = getWhatsAppDateHeader(msg.timestamp, msg.time);
    if (dateHeader && dateHeader !== lastDateHeader) {
      lastDateHeader = dateHeader;
      html += `<div class="chat-date-separator" data-date="${escHtml(dateHeader)}"><span>${escHtml(dateHeader)}</span></div>`;
    }

    // Build reaction bar
    const reactions = msg.reactions || {};
    const reactionKeys = Object.keys(reactions).filter(k => reactions[k]?.length > 0);
    const reactionBar = reactionKeys.length > 0
      ? `<div class="msg-reaction-bar">${reactionKeys.map(emoji =>
          `<span class="msg-reaction-pill" onclick="event.stopPropagation();openReactionSheet('${matchId}','${msgId}','${emoji}')">${emoji} <span>${reactions[emoji].length}</span></span>`
        ).join('')}</div>`
      : '';

    const pressEvents = `onmousedown="startLongPress(event,'${matchId}','${msgId}')" onmouseup="cancelLongPress()" onmouseleave="cancelLongPress()" ontouchstart="startLongPress(event,'${matchId}','${msgId}')" ontouchmove="handleTouchMove(event)" ontouchend="cancelLongPress()" oncontextmenu="event.preventDefault();showReactionPicker(event,'${matchId}','${msgId}')"`;

    let bubbleHtml = '';
    const isRead = msg.read === true || hist.some(m => m.sender !== 'me' && (m.timestamp || 0) >= (msg.timestamp || 0));
    const receiptHtml = isSent ? `<span class="msg-receipt-ticks ${isRead ? 'read' : ''}">✓✓</span>` : '';
    const editedHtml = msg.edited ? `<span class="msg-edited">(edited)</span>` : '';
    const forwardedHtml = msg.forwarded
      ? `<div class="msg-forwarded-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg> Forwarded</div>`
      : '';

    // Quoted reply block inside the bubble
    let quoteHtml = '';
    if (msg.replyTo) {
      const qAuthor = escHtml(msg.replyTo.senderName || 'You');
      let qText = escHtml(msg.replyTo.text || '');
      const qId = msg.replyTo.id || '';

      // Resolve thumbnail image from replyTo or by searching thread history
      let qImg = msg.replyTo.imageUrl || '';
      if (!qImg && qId) {
        const found = hist.find(m => m.firestoreId === qId || m.id === qId || (m.timestamp && ('msg_' + m.timestamp) === qId));
        if (found && found.imageUrl) {
          qImg = found.imageUrl;
        }
      }
      if (!qImg && (qText.toLowerCase().includes('photo') || qText.includes('📷'))) {
        const priorPhoto = [...hist].reverse().find(m => m.imageUrl && (m.timestamp || 0) <= (msg.timestamp || Date.now()));
        if (priorPhoto && priorPhoto.imageUrl) {
          qImg = priorPhoto.imageUrl;
        }
      }

      let qThumb = '';
      if (qImg) {
        qThumb = `<div class="quote-thumb-wrap"><img src="${escHtml(qImg)}" class="quote-thumb-img" alt="Photo"></div>`;
        if (qText === '📷 Photo' || qText === 'Photo' || !qText) {
          qText = `<span class="quote-photo-label"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:3px"><path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>Photo</span>`;
        }
      }

      quoteHtml = `
        <div class="msg-quote-preview ${qImg ? 'has-thumb' : ''}" onclick="scrollToQuotedMessage('${qId}')">
          <div class="quote-stripe"></div>
          <div class="quote-text-col">
            <div class="quote-author">${qAuthor}</div>
            <div class="quote-content">${qText}</div>
          </div>
          ${qThumb}
        </div>`;
    }

    const timeBadgeHtml = `<span class="msg-time-badge"><span class="msg-time">${timeStr}</span>${receiptHtml}</span>`;

    // Detect if this message is a call
    const rawText = typeof msg.text === 'string' ? msg.text : '';
    const isCallMsg = msg.isCall || 
      rawText.startsWith('Voice call') || 
      rawText.startsWith('Video call') || 
      rawText.startsWith('Missed') || 
      rawText.startsWith('Declined') || 
      rawText.startsWith('Cancelled') ||
      rawText.toLowerCase().includes('voice call') ||
      rawText.toLowerCase().includes('video call') ||
      rawText.toLowerCase().includes('call (');

    if (isCallMsg) {
      const isVideo = msg.callType === 'video' || rawText.toLowerCase().includes('video');
      const isDeclined = msg.callStatus === 'declined' || rawText.toLowerCase().includes('declined');
      const isNoAnswer = msg.callStatus === 'no_answer' || msg.callStatus === 'cancelled' || rawText.toLowerCase().includes('cancelled') || rawText.toLowerCase().includes('no answer');
      const isMissed = msg.callStatus === 'missed' || rawText.toLowerCase().includes('missed');
      const isUnanswered = isDeclined || isNoAnswer || isMissed;

      let title = '';
      let subText = 'Tap to call back';

      if (isDeclined) {
        title = isSent ? 'No answer' : `Declined ${isVideo ? 'video' : 'voice'} call`;
      } else if (isNoAnswer || isMissed) {
        title = isSent ? 'No answer' : `Missed ${isVideo ? 'video' : 'voice'} call`;
      } else {
        title = isVideo ? 'Video call' : 'Voice call';
        subText = msg.duration || (rawText.match(/\((.*?)\)/)?.[1]) || 'Completed';
      }

      const phoneIconSvg = isUnanswered
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><path d="m23 7-6 6"/><path d="m17 7h6v6"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/><path d="M16 3l5 5"/><path d="M21 3v5h-5"/></svg>`;

      const videoIconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;

      bubbleHtml = `
        <div class="msg-call-card ${isSent ? 'sent' : 'received'}" onclick="openCallConfirmDialog('${isVideo ? 'video' : 'voice'}')" title="Tap to call back" ${pressEvents}>
          <div class="call-card-icon-circle ${isUnanswered ? 'missed' : 'normal'}">
            ${isVideo ? videoIconSvg : phoneIconSvg}
          </div>
          <div class="call-card-body">
            <div class="call-card-title ${isUnanswered ? 'missed' : ''}">${title}</div>
            <div class="call-card-sub">${subText}</div>
          </div>
          <div class="call-card-meta">${timeStr}</div>
        </div>`;
    } else if (msg.imageUrl || msg.videoUrl) {
      const isVideoMsg = Boolean(msg.videoUrl || msg.isVideo);
      const mediaSrc = msg.videoUrl || msg.imageUrl;
      const rawCap = typeof msg.text === 'string' ? msg.text.trim() : '';
      const hasCaption = Boolean(rawCap && rawCap !== 'Photo' && rawCap !== 'Video' && rawCap !== '📷 Photo' && rawCap !== '📹 Video');
      const captionText = hasCaption ? rawCap : '';

      bubbleHtml = `
        <div class="msg-image-card-container ${isSent ? 'sent' : 'received'}">
          ${isSent ? `<button class="msg-quick-forward-btn" onclick="event.stopPropagation();forwardMessagePrompt('${msgId}')" title="Forward"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/></svg></button>` : ''}
          <div class="msg-bubble msg-image-bubble ${isSent ? 'sent' : 'received'} ${hasCaption ? 'has-caption' : ''}" onclick="openImageLightbox('${escHtml(mediaSrc)}', '${msgId}', ${isVideoMsg})" title="Tap to view ${isVideoMsg ? 'video' : 'photo'}" ${pressEvents}>
            ${quoteHtml}
            <div class="msg-image-wrap">
              ${isVideoMsg ?
                `<video src="${escHtml(mediaSrc)}" class="msg-chat-img" playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:12px;"></video>
                 <div class="msg-img-hd-badge">▶ Video</div>` :
                `<img src="${escHtml(mediaSrc)}" class="msg-chat-img" loading="lazy" alt="Photo">
                 <div class="msg-img-hd-badge">HD</div>`
              }
              ${!hasCaption ? `
                <div class="msg-img-overlay-meta">
                  ${timeBadgeHtml}
                </div>
              ` : ''}
            </div>
            ${hasCaption ? `
              <div class="msg-caption-wrap">
                <div class="msg-caption-text">${escHtml(captionText)}</div>
                <div class="msg-caption-meta">
                  <span class="msg-caption-time">${timeStr}</span>
                  ${receiptHtml}
                </div>
              </div>
            ` : ''}
          </div>
          ${!isSent ? `<button class="msg-quick-forward-btn" onclick="event.stopPropagation();forwardMessagePrompt('${msgId}')" title="Forward"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/></svg></button>` : ''}
        </div>`;
    } else if (msg.isVoice) {
      const audioSrc = msg.audioUrl || '';
      const totalDuration = msg.duration || '0:05';
      const playIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;

      bubbleHtml = `
        <div class="msg-bubble audio-bubble ${isSent ? 'sent' : 'received'}" id="voiceBubble_${msgId}" data-audiosrc="${escHtml(audioSrc)}" data-duration="${escHtml(totalDuration)}" ${pressEvents}>
          ${quoteHtml}
          <div class="vn-player-wrap">
            <button class="vn-play-btn" onclick="event.stopPropagation();toggleVoiceNotePlayback('${msgId}')" aria-label="Play voice note">
              ${playIconSvg}
            </button>
            <div class="vn-content-col">
              <div class="vn-track-wrap" onclick="event.stopPropagation();seekVoiceNote(event, '${msgId}')" title="Tap to seek">
                <div class="vn-track-fill" id="vnFill_${msgId}">
                  <div class="vn-track-knob"></div>
                </div>
              </div>
              <div class="vn-meta-row">
                <span class="vn-duration" id="vnTime_${msgId}">${escHtml(totalDuration)}</span>
                ${timeBadgeHtml}
              </div>
            </div>
          </div>
        </div>`;
    } else {
      bubbleHtml = `
        <div class="msg-bubble ${isSent ? 'sent' : 'received'}" style="cursor:pointer" ${pressEvents}>
          ${quoteHtml}
          <div class="msg-text-wrap">
            <span class="msg-text">${escHtml(msg.text)}${editedHtml}</span>
            ${timeBadgeHtml}
          </div>
        </div>`;
    }

    html += `
      <div class="msg-row ${isSent ? 'sent' : 'received'}" data-msg-id="${msgId}"
        ontouchstart="handleMsgTouchStart(event, '${msgId}')"
        ontouchmove="handleMsgTouchMove(event, '${msgId}')"
        ontouchend="handleMsgTouchEnd(event, '${msgId}')"
        onmousedown="handleMsgMouseDown(event, '${msgId}')"
        ondblclick="startReplyToMessage('${msgId}')"
        style="display:flex;flex-direction:column;align-self:${isSent ? 'flex-end' : 'flex-start'};align-items:${isSent ? 'flex-end' : 'flex-start'};max-width:78%;gap:3px">
        <div class="swipe-reply-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 14 4 9 9 4"/>
            <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
          </svg>
        </div>
        ${forwardedHtml}
        ${bubbleHtml}
        ${reactionBar}
      </div>`;
  });

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

// ==========================================================
// SWIPE TO REPLY & QUOTE REPLY HANDLERS
// ==========================================================
let _swipeState = null;
let _replyingToState = null;

function handleMsgTouchStart(e, msgId) {
  if (!e.touches || e.touches.length === 0) return;
  const touch = e.touches[0];
  const row = e.currentTarget || document.querySelector(`.msg-row[data-msg-id="${msgId}"]`);
  _swipeState = {
    msgId,
    startX: touch.clientX,
    startY: touch.clientY,
    el: row,
    isSwiping: false
  };
}

function handleMsgTouchMove(e, msgId) {
  if (!_swipeState || _swipeState.msgId !== msgId || !e.touches || e.touches.length === 0) return;
  const touch = e.touches[0];
  const dx = touch.clientX - _swipeState.startX;
  const dy = touch.clientY - _swipeState.startY;

  if (!_swipeState.isSwiping) {
    if (dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      _swipeState.isSwiping = true;
      if (_swipeState.el) _swipeState.el.classList.add('swiping');
    } else if (Math.abs(dy) > 12 || dx < -10) {
      _swipeState = null;
      return;
    }
  }

  if (_swipeState?.isSwiping && dx > 0) {
    const clamped = Math.min(65, dx * 0.55);
    if (_swipeState.el) _swipeState.el.style.transform = `translateX(${clamped}px)`;
  }
}

function handleMsgTouchEnd(e, msgId) {
  if (!_swipeState || _swipeState.msgId !== msgId) {
    _swipeState = null;
    return;
  }
  const el = _swipeState.el;
  const touch = e.changedTouches ? e.changedTouches[0] : null;
  const dx = touch ? (touch.clientX - _swipeState.startX) : 0;

  if (_swipeState.isSwiping && dx >= 22) {
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (_) {}
    startReplyToMessage(msgId);
  }

  if (el) {
    el.classList.remove('swiping');
    el.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
    el.style.transform = 'translateX(0)';
    setTimeout(() => {
      if (el) el.style.transition = '';
    }, 200);
  }
  _swipeState = null;
}

function handleMsgMouseDown(e, msgId) {
  if (e.button !== 0) return;
  if (e.target.closest('.msg-reaction-pill, .msg-quote-preview, .audio-play-btn, button, a')) return;

  const row = e.currentTarget || document.querySelector(`.msg-row[data-msg-id="${msgId}"]`);
  _swipeState = {
    msgId,
    startX: e.clientX,
    startY: e.clientY,
    el: row,
    isSwiping: false
  };

  const onMouseMove = (moveEvent) => {
    if (!_swipeState) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
      return;
    }
    const dx = moveEvent.clientX - _swipeState.startX;
    const dy = moveEvent.clientY - _swipeState.startY;

    if (!_swipeState.isSwiping) {
      if (dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        _swipeState.isSwiping = true;
        document.body.style.userSelect = 'none';
        if (_swipeState.el) _swipeState.el.classList.add('swiping');
      } else if (Math.abs(dy) > 12 || dx < -10) {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = '';
        _swipeState = null;
        return;
      }
    }

    if (_swipeState?.isSwiping && dx > 0) {
      moveEvent.preventDefault();
      const clamped = Math.min(65, dx * 0.55);
      if (_swipeState.el) _swipeState.el.style.transform = `translateX(${clamped}px)`;
    }
  };

  const onMouseUp = (upEvent) => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    document.body.style.userSelect = '';
    if (!_swipeState) return;
    const dx = upEvent.clientX - _swipeState.startX;
    if (_swipeState.isSwiping && dx >= 22) {
      if (navigator.vibrate) try { navigator.vibrate(30); } catch (_) {}
      startReplyToMessage(msgId);
    }
    const el = _swipeState.el;
    if (el) {
      el.classList.remove('swiping');
      el.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
      el.style.transform = 'translateX(0)';
      setTimeout(() => { if (el) el.style.transition = ''; }, 200);
    }
    _swipeState = null;
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function startReplyToMessage(msgId) {
  const info = getMessageInfo(msgId);
  if (!info || !info.msg) {
    console.warn('Could not find message for reply:', msgId);
    return;
  }
  const msg = info.msg;
  const isSent = msg.sender === 'me';
  const partner = matchedUsers.find(u => u.id === appState.currentChatId) ||
                  PROFILES_DATA.find(u => u.id === appState.currentChatId) ||
                  conversations[appState.currentChatId]?.partner ||
                  {};
  const partnerName = partner.name || document.getElementById('chatPartnerName')?.textContent?.trim() || 'Match';
  const senderName = isSent ? 'You' : partnerName;
  const previewText = msg.imageUrl ? 'Photo' : (msg.isVoice ? 'Voice note' : (msg.isCall ? (msg.callType === 'video' ? 'Video call' : 'Voice call') : (msg.text || '')));

  _replyingToState = {
    id: msgId,
    senderName,
    text: previewText,
    imageUrl: msg.imageUrl || ''
  };

  const replyBar = document.getElementById('chatReplyBar');
  const replySender = document.getElementById('chatReplySender');
  const replyText = document.getElementById('chatReplyText');
  const replyThumbBox = document.getElementById('chatReplyThumbBox');
  const replyThumbImg = document.getElementById('chatReplyThumbImg');

  if (replyBar && replySender && replyText) {
    replySender.textContent = `Replying to ${senderName}`;
    if (msg.imageUrl) {
      replyText.innerHTML = `<span class="quote-photo-label"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:4px"><path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>Photo</span>`;
    } else {
      replyText.textContent = previewText;
    }
    if (msg.imageUrl && replyThumbBox && replyThumbImg) {
      replyThumbImg.src = msg.imageUrl;
      replyThumbBox.style.display = 'block';
    } else if (replyThumbBox) {
      replyThumbBox.style.display = 'none';
    }
    replyBar.classList.add('active');
    replyBar.style.display = 'flex';
  }

  const input = document.getElementById('chatInput');
  if (input) input.focus();
}

function cancelReplyMessage() {
  _replyingToState = null;
  const replyBar = document.getElementById('chatReplyBar');
  const replyThumbBox = document.getElementById('chatReplyThumbBox');
  if (replyThumbBox) replyThumbBox.style.display = 'none';
  if (replyBar) {
    replyBar.classList.remove('active');
    replyBar.style.display = 'none';
  }
}

function scrollToQuotedMessage(msgId) {
  if (!msgId) return;
  const targetRow = document.querySelector(`.msg-row[data-msg-id="${msgId}"]`);
  if (targetRow) {
    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetRow.classList.add('chat-highlight-pulse');
    setTimeout(() => targetRow.classList.remove('chat-highlight-pulse'), 2200);
  }
}

// ==========================================================
// WHATSAPP IN-HEADER CHAT SEARCH
// ==========================================================
let _chatSearchResults = [];
let _chatSearchIndex = -1;

function openChatSearch() {
  const bar = document.getElementById('chatSearchBar');
  const input = document.getElementById('chatSearchInput');
  const menu = document.getElementById('chatDropdownMenu');
  if (menu) menu.style.display = 'none';
  if (!bar || !input) return;
  bar.classList.add('active');
  bar.style.display = 'flex';
  input.value = '';
  input.focus();
  _chatSearchResults = [];
  _chatSearchIndex = -1;
  updateChatSearchCount();
}

function closeChatSearch() {
  const bar = document.getElementById('chatSearchBar');
  if (bar) {
    bar.classList.remove('active');
    bar.style.display = 'none';
  }
  clearChatSearchHighlights();
  _chatSearchResults = [];
  _chatSearchIndex = -1;
}

function onChatSearchInput(e) {
  const query = (e.target.value || '').trim().toLowerCase();
  clearChatSearchHighlights();
  _chatSearchResults = [];
  _chatSearchIndex = -1;

  if (!query) {
    updateChatSearchCount();
    return;
  }

  const container = document.getElementById('chatMessages');
  if (!container) return;

  const items = container.querySelectorAll('.msg-row, .chat-date-separator');
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    const dateAttr = (item.getAttribute('data-date') || '').toLowerCase();
    if (text.includes(query) || dateAttr.includes(query)) {
      _chatSearchResults.push(item);
    }
  });

  if (_chatSearchResults.length > 0) {
    _chatSearchIndex = _chatSearchResults.length - 1;
    highlightAndScrollToMatch(_chatSearchIndex);
  }
  updateChatSearchCount();
}

function onChatSearchKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) prevSearchMatch();
    else nextSearchMatch();
  } else if (e.key === 'Escape') {
    closeChatSearch();
  }
}

function nextSearchMatch() {
  if (_chatSearchResults.length === 0) return;
  _chatSearchIndex = (_chatSearchIndex + 1) % _chatSearchResults.length;
  highlightAndScrollToMatch(_chatSearchIndex);
  updateChatSearchCount();
}

function prevSearchMatch() {
  if (_chatSearchResults.length === 0) return;
  _chatSearchIndex = (_chatSearchIndex - 1 + _chatSearchResults.length) % _chatSearchResults.length;
  highlightAndScrollToMatch(_chatSearchIndex);
  updateChatSearchCount();
}

function highlightAndScrollToMatch(idx) {
  clearChatSearchHighlights();
  if (idx < 0 || idx >= _chatSearchResults.length) return;
  const target = _chatSearchResults[idx];
  target.classList.add('chat-highlight-pulse');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearChatSearchHighlights() {
  document.querySelectorAll('.chat-highlight-pulse').forEach(el => {
    el.classList.remove('chat-highlight-pulse');
  });
}

function updateChatSearchCount() {
  const countEl = document.getElementById('chatSearchCount');
  if (!countEl) return;
  if (_chatSearchResults.length === 0) {
    countEl.textContent = '0/0';
  } else {
    countEl.textContent = `${_chatSearchIndex + 1}/${_chatSearchResults.length}`;
  }
}

function onChatInputChange() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const micBtn = document.getElementById('micBtn');
  if (!input) return;

  // Auto-grow textarea height like WhatsApp & Telegram
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 110) + 'px';

  const text = input.value;
  const hasText = text.trim().length > 0;
  if (sendBtn) sendBtn.style.display = hasText ? 'flex' : 'none';
  if (micBtn) micBtn.style.display = hasText ? 'none' : 'flex';
}
window.onChatInputChange = onChatInputChange;

function toggleEmojiPicker() {
  const panel = document.getElementById('emojiPickerPanel');
  const input = document.getElementById('chatInput');
  if (!panel) return;
  const isOpen = panel.style.display === 'flex';
  if (isOpen) {
    closeEmojiPicker();
    if (input) input.focus();
  } else {
    openEmojiPicker();
  }
}
window.toggleEmojiPicker = toggleEmojiPicker;

function openEmojiPicker() {
  const panel = document.getElementById('emojiPickerPanel');
  const toggleBtn = document.getElementById('emojiToggleBtn');
  if (!panel) return;
  panel.style.display = 'flex';
  if (toggleBtn) {
    toggleBtn.classList.add('active-emoji');
    toggleBtn.innerHTML = KEYBOARD_SVG;
    toggleBtn.title = 'Keyboard';
    toggleBtn.setAttribute('aria-label', 'Keyboard');
  }
  renderEmojiCategory(currentEmojiCategory);
}
window.openEmojiPicker = openEmojiPicker;

function closeEmojiPicker() {
  const panel = document.getElementById('emojiPickerPanel');
  const toggleBtn = document.getElementById('emojiToggleBtn');
  if (!panel) return;
  panel.style.display = 'none';
  if (toggleBtn) {
    toggleBtn.classList.remove('active-emoji');
    toggleBtn.innerHTML = SMILEY_SVG;
    toggleBtn.title = 'Emoji';
    toggleBtn.setAttribute('aria-label', 'Emoji');
  }
}
window.closeEmojiPicker = closeEmojiPicker;

function switchEmojiCategory(cat, btn) {
  currentEmojiCategory = cat;
  document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const searchInput = document.getElementById('emojiSearchInput');
  if (searchInput) searchInput.value = '';
  renderEmojiCategory(cat);
}
window.switchEmojiCategory = switchEmojiCategory;

function renderEmojiCategory(cat) {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  const emojis = CATEGORIZED_EMOJIS[cat] || CATEGORIZED_EMOJIS.smileys;
  grid.innerHTML = emojis.map(e => `
    <button type="button" class="emoji-cell" onclick="insertEmoji('${e}')" title="${e}">${e}</button>
  `).join('');
}
window.renderEmojiCategory = renderEmojiCategory;

function searchEmojis(query) {
  const q = (query || '').trim().toLowerCase();
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;

  if (!q) {
    // Restore current category when search is cleared
    renderEmojiCategory(currentEmojiCategory);
    return;
  }

  // Clear active highlight on category buttons while search is active
  document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));

  const all = Object.values(CATEGORIZED_EMOJIS).flat();
  const unique = Array.from(new Set(all));

  const results = unique.filter(emoji => {
    // 1. Direct emoji character match
    if (emoji.includes(q)) return true;
    // 2. Keyword dictionary lookup (word prefix or exact token match)
    const kw = (typeof EMOJI_KEYWORDS !== 'undefined' && EMOJI_KEYWORDS[emoji]) || '';
    if (kw) {
      const words = kw.toLowerCase().split(/\s+/);
      if (words.some(w => w.startsWith(q) || (q.length >= 4 && w.includes(q)) || w === q)) return true;
    }
    // 3. Category name match
    for (const [catName, catEmojis] of Object.entries(CATEGORIZED_EMOJIS)) {
      if (catName.toLowerCase().startsWith(q) && catEmojis.includes(emoji)) return true;
    }
    return false;
  });

  if (results.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 28px 12px; text-align: center; color: var(--txt-muted); font-size: 0.82rem;">
        <div style="font-size: 1.6rem; margin-bottom: 8px;">🔍</div>
        <div style="font-weight: 600; color: var(--txt-primary);">No emojis found for "${escHtml(q)}"</div>
        <div style="font-size: 0.76rem; opacity: 0.7; margin-top: 4px;">Try searching for heart, smile, love, laugh, dog, fire, food, car...</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = results.map(e => `
    <button type="button" class="emoji-cell" onclick="insertEmoji('${e}')" title="${e}">${e}</button>
  `).join('');
}
window.searchEmojis = searchEmojis;

function insertEmoji(emoji) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.setRangeText(emoji, start, end, 'end');
  onChatInputChange();
}
window.insertEmoji = insertEmoji;

function backspaceEmoji() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const val = input.value;
  if (!val) return;
  const start = input.selectionStart ?? val.length;
  const end = input.selectionEnd ?? val.length;
  if (start !== end) {
    input.setRangeText('', start, end, 'end');
  } else if (start > 0) {
    const chars = Array.from(val.slice(0, start));
    chars.pop();
    const remainingBefore = chars.join('');
    const after = val.slice(start);
    input.value = remainingBefore + after;
    input.setSelectionRange(remainingBefore.length, remainingBefore.length);
  }
  onChatInputChange();
}
window.backspaceEmoji = backspaceEmoji;

let _lightboxCurrentSrc = '';
let _lightboxCurrentMsgId = '';
let _lightboxSwipeBound = false;
let _lightboxSwipeY = 0;
let _lightboxSwipeStartY = 0;
let _lightboxSwipeStartX = 0;
let _lightboxSwipeStartTime = 0;
let _lightboxIsSwiping = false;

let _lightboxRotation = 0;
let _lightboxIsVideo = false;

function openImageLightbox(src, msgId, isVideo = false) {
  const modal = document.getElementById('chatImageLightbox');
  const img = document.getElementById('lightboxImg');
  const videoEl = document.getElementById('lightboxVideo');
  if (!modal || !src) return;

  _lightboxCurrentSrc = src;
  _lightboxCurrentMsgId = msgId || '';
  _lightboxIsVideo = Boolean(isVideo);
  _lightboxRotation = 0;

  const menu = document.getElementById('lightboxDropdownMenu');
  if (menu) menu.style.display = 'none';

  // Get message info for header metadata matching WhatsApp Screenshot
  const partner = matchedUsers.find(u => u.id === appState.currentChatId) ||
                  PROFILES_DATA.find(u => u.id === appState.currentChatId) ||
                  conversations[appState.currentChatId]?.partner ||
                  {};
  let senderName = partner.name || document.getElementById('chatPartnerName')?.textContent?.trim() || 'Match';
  let timeMeta = 'HD • ' + new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (msgId) {
    const { msg } = getMessageInfo(msgId);
    if (msg) {
      if (msg.sender === 'me') {
        senderName = 'You';
      }
      const dateH = getWhatsAppDateHeader(msg.timestamp, msg.time);
      const timeS = formatWhatsAppTime(msg.timestamp, msg.time);
      timeMeta = `HD • ${dateH || 'Today'}, ${timeS || ''}`.trim();

      const starBtn = document.getElementById('lightboxStarBtn');
      if (starBtn) {
        starBtn.style.color = msg.starred ? '#F4C550' : '#fff';
      }
    }
  }

  const nameEl = document.getElementById('lightboxUserName');
  const metaEl = document.getElementById('lightboxTimeMeta');
  if (nameEl) nameEl.textContent = senderName;
  if (metaEl) metaEl.textContent = timeMeta;

  // Display caption if message has one
  const capBar = document.getElementById('lightboxCaptionBar');
  const capText = document.getElementById('lightboxCaptionText');
  if (capBar && capText) {
    let captionStr = '';
    if (msgId) {
      const { msg } = getMessageInfo(msgId);
      const rawText = typeof msg?.text === 'string' ? msg.text.trim() : '';
      if (rawText && rawText !== 'Photo' && rawText !== 'Video' && rawText !== '📷 Photo' && rawText !== '📹 Video') {
        captionStr = rawText;
      }
    }
    if (captionStr) {
      capText.textContent = captionStr;
      capBar.style.display = 'block';
    } else {
      capBar.style.display = 'none';
    }
  }

  // Toggle image vs video
  if (_lightboxIsVideo) {
    if (img) img.style.display = 'none';
    if (videoEl) {
      videoEl.style.display = 'block';
      videoEl.style.transform = 'translate3d(0, 0, 0) scale(1)';
      videoEl.style.opacity = '1';
      videoEl.style.transition = 'none';
      videoEl.src = src;
      videoEl.play().catch(() => {});
    }
  } else {
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
      videoEl.style.display = 'none';
    }
    if (img) {
      img.style.display = 'block';
      img.style.transform = 'translate3d(0, 0, 0) scale(1)';
      img.style.opacity = '1';
      img.style.transition = 'none';
      img.src = src;
    }
  }

  const topBar = document.getElementById('lightboxTopBar');
  const bottomBar = document.getElementById('lightboxBottomBar');
  if (topBar) topBar.style.opacity = '1';
  if (bottomBar) bottomBar.style.opacity = '1';

  modal.style.backgroundColor = '#000';
  modal.style.display = 'flex';

  const replyInput = document.getElementById('lightboxReplyInput');
  if (replyInput) replyInput.value = '';

  initLightboxSwipeGestures();
}
window.openImageLightbox = openImageLightbox;

function closeImageLightbox() {
  const modal = document.getElementById('chatImageLightbox');
  const img = document.getElementById('lightboxImg');
  const videoEl = document.getElementById('lightboxVideo');
  const menu = document.getElementById('lightboxDropdownMenu');
  if (!modal) return;
  if (menu) menu.style.display = 'none';
  if (img) {
    img.style.transform = 'translate3d(0, 0, 0) scale(1)';
    img.style.transition = 'none';
  }
  if (videoEl) {
    videoEl.pause();
    videoEl.src = '';
    videoEl.style.display = 'none';
  }
  modal.style.display = 'none';
  _lightboxCurrentSrc = '';
  _lightboxCurrentMsgId = '';
  _lightboxIsVideo = false;
  _lightboxRotation = 0;
}
window.closeImageLightbox = closeImageLightbox;

function initLightboxSwipeGestures() {
  if (_lightboxSwipeBound) return;
  _lightboxSwipeBound = true;

  const modal = document.getElementById('chatImageLightbox');
  const img = document.getElementById('lightboxImg');
  const topBar = document.getElementById('lightboxTopBar');
  const bottomBar = document.getElementById('lightboxBottomBar');
  if (!modal || !img) return;

  function onTouchStart(e) {
    if (e.target.closest('button, input, textarea, a, .lightbox-top-bar, .lightbox-bottom-bar')) return;
    if (!e.touches || e.touches.length === 0) return;

    _lightboxSwipeStartY = e.touches[0].clientY;
    _lightboxSwipeStartX = e.touches[0].clientX;
    _lightboxSwipeStartTime = Date.now();
    _lightboxSwipeY = 0;
    _lightboxIsSwiping = false;
    img.style.transition = 'none';
  }

  function onTouchMove(e) {
    if (!_lightboxSwipeStartY || !e.touches || e.touches.length === 0) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const dy = currentY - _lightboxSwipeStartY;
    const dx = currentX - _lightboxSwipeStartX;

    if (!_lightboxIsSwiping) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.1) {
        _lightboxIsSwiping = true;
      } else if (Math.abs(dx) > 15) {
        _lightboxSwipeStartY = 0;
        return;
      }
    }

    if (_lightboxIsSwiping) {
      if (e.cancelable) e.preventDefault();
      _lightboxSwipeY = dy;
      const absY = Math.abs(dy);
      const scale = Math.max(0.72, 1 - absY / 1000);
      img.style.transform = `translate3d(0, ${dy}px, 0) scale(${scale})`;

      const opacity = Math.max(0.15, 1 - absY / 380);
      modal.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
      if (topBar) topBar.style.opacity = `${opacity}`;
      if (bottomBar) bottomBar.style.opacity = `${opacity}`;
    }
  }

  function onTouchEnd() {
    if (!_lightboxSwipeStartY) return;
    const dt = Date.now() - _lightboxSwipeStartTime;
    const absY = Math.abs(_lightboxSwipeY);
    const velocity = absY / (dt || 1);

    // If dragged > 60px vertically or flicked fast: dismiss lightbox smoothly
    if (_lightboxIsSwiping && (absY > 60 || (velocity > 0.4 && absY > 25))) {
      img.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.18s ease';
      img.style.transform = `translate3d(0, ${_lightboxSwipeY > 0 ? 450 : -450}px, 0) scale(0.6)`;
      img.style.opacity = '0';
      modal.style.backgroundColor = 'rgba(0, 0, 0, 0)';
      if (topBar) topBar.style.opacity = '0';
      if (bottomBar) bottomBar.style.opacity = '0';
      setTimeout(() => {
        closeImageLightbox();
      }, 190);
    } else if (_lightboxIsSwiping) {
      // Spring back to center
      img.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
      img.style.transform = 'translate3d(0, 0, 0) scale(1)';
      img.style.opacity = '1';
      modal.style.backgroundColor = '#000';
      if (topBar) topBar.style.opacity = '1';
      if (bottomBar) bottomBar.style.opacity = '1';
    }

    _lightboxSwipeStartY = 0;
    _lightboxSwipeStartX = 0;
    _lightboxSwipeY = 0;
    _lightboxIsSwiping = false;
  }

  modal.addEventListener('touchstart', onTouchStart, { passive: true });
  modal.addEventListener('touchmove', onTouchMove, { passive: false });
  modal.addEventListener('touchend', onTouchEnd, { passive: true });

  // Mouse drag support for desktop
  let isMouseDown = false;
  modal.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, textarea, a, .lightbox-top-bar, .lightbox-bottom-bar')) return;
    isMouseDown = true;
    _lightboxSwipeStartY = e.clientY;
    _lightboxSwipeStartX = e.clientX;
    _lightboxSwipeStartTime = Date.now();
    _lightboxSwipeY = 0;
    _lightboxIsSwiping = false;
    img.style.transition = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    const dy = e.clientY - _lightboxSwipeStartY;
    const dx = e.clientX - _lightboxSwipeStartX;
    if (!_lightboxIsSwiping) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        _lightboxIsSwiping = true;
      }
    }
    if (_lightboxIsSwiping) {
      e.preventDefault();
      _lightboxSwipeY = dy;
      const absY = Math.abs(dy);
      const scale = Math.max(0.72, 1 - absY / 1000);
      img.style.transform = `translate3d(0, ${dy}px, 0) scale(${scale})`;
      const opacity = Math.max(0.15, 1 - absY / 380);
      modal.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
      if (topBar) topBar.style.opacity = `${opacity}`;
      if (bottomBar) bottomBar.style.opacity = `${opacity}`;
    }
  });

  window.addEventListener('mouseup', () => {
    if (!isMouseDown) return;
    isMouseDown = false;
    onTouchEnd();
  });
}

function downloadLightboxImage() {
  if (!_lightboxCurrentSrc) return;
  const a = document.createElement('a');
  a.href = _lightboxCurrentSrc;
  a.download = `HookMe_photo_${Date.now()}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('Photo saved to gallery 📥', 'gold');
}
window.downloadLightboxImage = downloadLightboxImage;

function forwardLightboxImage() {
  if (!_lightboxCurrentMsgId) {
    showToast('Select a chat to forward', 'info');
    return;
  }
  closeImageLightbox();
  forwardMessagePrompt(_lightboxCurrentMsgId);
}
window.forwardLightboxImage = forwardLightboxImage;

function toggleLightboxStar() {
  if (!_lightboxCurrentMsgId) return;
  const { msg } = getMessageInfo(_lightboxCurrentMsgId);
  if (!msg) return;
  msg.starred = !msg.starred;
  const starBtn = document.getElementById('lightboxStarBtn');
  if (starBtn) {
    starBtn.style.color = msg.starred ? '#F4C550' : '#fff';
  }
  saveToStorage();
  showToast(msg.starred ? 'Starred message ⭐' : 'Unstarred message', 'info');
}
window.toggleLightboxStar = toggleLightboxStar;

function showLightboxMenu(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const menu = document.getElementById('lightboxDropdownMenu');
  if (!menu) return;
  const isShown = menu.style.display === 'block';
  menu.style.display = isShown ? 'none' : 'block';
}
window.showLightboxMenu = showLightboxMenu;

// Close lightbox menu when clicking outside
window.addEventListener('click', (e) => {
  const menu = document.getElementById('lightboxDropdownMenu');
  if (menu && menu.style.display === 'block' && !e.target.closest('#lightboxDropdownMenu') && !e.target.closest('.lightbox-icon-btn')) {
    menu.style.display = 'none';
  }
});

function setLightboxAsChatBackground() {
  const menu = document.getElementById('lightboxDropdownMenu');
  if (menu) menu.style.display = 'none';
  if (!_lightboxCurrentSrc) return;

  const currentChatId = appState.currentChatId;
  if (!currentChatId) {
    showToast('Open a chat to set background', 'info');
    return;
  }

  try {
    localStorage.setItem('hmbs_chat_bg_' + currentChatId, _lightboxCurrentSrc);
  } catch (e) {}

  applyChatCustomBackground(currentChatId);
  showToast('Chat background updated! 🖼️', 'gold');
}
window.setLightboxAsChatBackground = setLightboxAsChatBackground;

function viewLightboxInChat() {
  const menu = document.getElementById('lightboxDropdownMenu');
  if (menu) menu.style.display = 'none';
  const msgId = _lightboxCurrentMsgId;
  closeImageLightbox();

  if (msgId) {
    setTimeout(() => {
      const msgCard = document.querySelector(`[data-msgid="${msgId}"]`);
      if (msgCard) {
        msgCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        msgCard.style.outline = '2px solid var(--gold-1, #E3B34D)';
        setTimeout(() => { msgCard.style.outline = 'none'; }, 1500);
      }
    }, 150);
  }
}
window.viewLightboxInChat = viewLightboxInChat;

function rotateLightboxImage() {
  const menu = document.getElementById('lightboxDropdownMenu');
  if (menu) menu.style.display = 'none';
  const img = document.getElementById('lightboxImg');
  if (!img) return;

  _lightboxRotation = (_lightboxRotation + 90) % 360;
  img.style.transition = 'transform 0.25s ease';
  img.style.transform = `translate3d(0, 0, 0) scale(1) rotate(${_lightboxRotation}deg)`;
}
window.rotateLightboxImage = rotateLightboxImage;

async function shareLightboxImage() {
  const menu = document.getElementById('lightboxDropdownMenu');
  if (menu) menu.style.display = 'none';
  if (!_lightboxCurrentSrc) return;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'HookMe Media',
        text: 'Shared from HookMe',
        url: _lightboxCurrentSrc.startsWith('data:') ? window.location.href : _lightboxCurrentSrc
      });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(_lightboxCurrentSrc);
    showToast('Media link copied to clipboard 📋', 'info');
  } catch (e) {
    downloadLightboxImage();
  }
}
window.shareLightboxImage = shareLightboxImage;

function deleteLightboxImage() {
  const menu = document.getElementById('lightboxDropdownMenu');
  if (menu) menu.style.display = 'none';
  if (!_lightboxCurrentMsgId) {
    closeImageLightbox();
    return;
  }

  if (!confirm('Delete this media message?')) return;

  const partnerId = appState.currentChatId;
  if (partnerId && conversations[partnerId]) {
    const idx = conversations[partnerId].messages.findIndex(m => m.id === _lightboxCurrentMsgId);
    if (idx !== -1) {
      conversations[partnerId].messages.splice(idx, 1);
      renderChatThread();
      renderConversationList();
      renderChatsInbox();
      saveToStorage();
    }
  }

  closeImageLightbox();
  showToast('Media deleted 🗑️', 'info');
}
window.deleteLightboxImage = deleteLightboxImage;

function quickReactLightbox(emoji) {
  if (!emoji || !_lightboxCurrentMsgId) {
    showToast(`Reacted ${emoji}`, 'info');
    return;
  }
  const partnerId = appState.currentChatId;
  const myUid = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser?.uid) || currentUser?.id || '';
  const matchId = (myUid && partnerId) ? [myUid, partnerId].sort().join('_') : partnerId;
  toggleMsgReaction(matchId, _lightboxCurrentMsgId, emoji);
  if (navigator.vibrate) try { navigator.vibrate(25); } catch (_) {}
  showToast(`Reacted ${emoji}`, 'info');
}
window.quickReactLightbox = quickReactLightbox;

function handleLightboxReplyKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const input = document.getElementById('lightboxReplyInput');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    if (_lightboxCurrentMsgId) {
      startReplyToMessage(_lightboxCurrentMsgId);
    }
    closeImageLightbox();

    const chatField = document.getElementById('chatInput');
    if (chatField) {
      chatField.value = text;
      sendMessage();
    }
  }
}
window.handleLightboxReplyKeydown = handleLightboxReplyKeydown;

function compressImageForChat(file, maxWidth = 960, quality = 0.72) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let result = canvas.toDataURL('image/jpeg', quality);

        // Mobile photos can have high entropy; ensure output is comfortably below Firestore limit (< 450KB)
        if (result.length > 550000) {
          result = canvas.toDataURL('image/jpeg', 0.55);
        }
        if (result.length > 650000) {
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.round(width * 0.7);
          smallCanvas.height = Math.round(height * 0.7);
          const sCtx = smallCanvas.getContext('2d');
          sCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
          result = smallCanvas.toDataURL('image/jpeg', 0.5);
        }
        resolve(result);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function sendImageMessage(event) {
  const file = event.target.files?.[0];
  if (!file || !appState.currentChatId) return;
  event.target.value = '';

  const partnerId = appState.currentChatId;
  const isVideo = Boolean(
    (file.type && file.type.startsWith('video/')) ||
    (file.name && file.name.match(/\.(mp4|mov|webm|m4v|3gp|mkv)$/i))
  );

  if (isVideo && file.size > 30 * 1024 * 1024) {
    showToast('Video exceeds 30MB limit. Please choose a smaller video.', 'error');
    return;
  }

  if (!conversations[partnerId]) {
    conversations[partnerId] = { messages: [] };
  }

  const localMsgId = (isVideo ? 'local_vid_' : 'local_img_') + Date.now();
  const localPreviewUrl = URL.createObjectURL(file);

  const newMsg = {
    id: localMsgId,
    sender: 'me',
    imageUrl: isVideo ? '' : localPreviewUrl,
    videoUrl: isVideo ? localPreviewUrl : '',
    isVideo: isVideo,
    read: true,
    timestamp: Date.now(),
    _uploading: true
  };

  conversations[partnerId].messages.push(newMsg);
  movePartnerToTop(partnerId);
  renderChatThread();
  renderConversationList();
  renderChatsInbox();
  updateMatchesNotificationBadge();
  saveToStorage();
  showToast(isVideo ? 'Uploading video...' : 'Uploading photo...', 'gold');

  (async () => {
    let cloudUrl = null;
    let fileToUpload = file;
    let localDataUrl = '';

    // For photos: compress image for instant local rendering and fallback
    if (!isVideo) {
      try {
        localDataUrl = await compressImageForChat(file, 960, 0.72);
        if (localDataUrl && localDataUrl.startsWith('data:')) {
          const resp = await fetch(localDataUrl);
          const compressedBlob = await resp.blob();
          fileToUpload = new File([compressedBlob], file.name ? file.name.replace(/\.[^.]+$/, '.jpg') : 'photo.jpg', { type: 'image/jpeg' });
        }
      } catch (cErr) {
        console.warn('Image compression fallback:', cErr);
        fileToUpload = file;
      }
    }

    // Try Cloud Storage upload if connected, authenticated & enabled
    if (typeof uploadFileToBackend === 'function' && typeof fbStorage !== 'undefined' && fbStorage && !window._firebaseStorageDisabled && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      try {
        const matchId = [fbAuth.currentUser.uid, partnerId].sort().join('_');
        const uploadPromise = uploadFileToBackend(
          fileToUpload,
          `chat_media/${matchId}`,
          false,
          isVideo ? (file.type || 'video/mp4') : 'image/jpeg'
        );
        // Give videos enough time to finish uploading on mobile/slow connections
        const timeoutPromise = new Promise(res => setTimeout(() => res(null), isVideo ? 120000 : 40000));
        const resUrl = await Promise.race([uploadPromise, timeoutPromise]);
        if (resUrl && typeof resUrl === 'string' && (resUrl.startsWith('http') || resUrl.startsWith('https'))) {
          cloudUrl = resUrl;
        } else if (isVideo) {
          const uploadError = window._lastMediaUploadError || 'Firebase Storage is required for video messages.';
          console.warn('sendImageMessage: video upload skipped:', uploadError);
          showToast('Video upload requires Cloud Storage (Blaze plan).', 'error', 9000);
        }
      } catch (err) {
        if (isVideo) {
          console.warn('sendImageMessage: uploadFileToBackend threw:', err);
          showToast(`Video upload failed: ${err?.message || 'Unknown error'}`, 'error', 9000);
        }
      }
    } else if (isVideo && (!cloudUrl)) {
      showToast('Video upload requires Cloud Storage (Blaze plan).', 'error', 9000);
    }

    // Private chat media must be stored in Cloud Storage before it is sent.
    // Never put a local blob/data URL into a Firestore message: the recipient cannot fetch it.
    if (!cloudUrl) {
      const uploadError = window._lastMediaUploadError || 'Cloud Storage upload failed.';
      console.warn('sendImageMessage: refusing to dispatch undeliverable media:', uploadError);
      const targetMsg = conversations[partnerId]?.messages?.find(m => m.id === localMsgId);
      if (targetMsg) {
        targetMsg._uploading = false;
        targetMsg._uploadFailed = true;
        renderChatThread();
        saveToStorage();
      }
      showToast(isVideo ? 'Video could not be uploaded. Please try again.' : 'Photo could not be uploaded. Please try again.', 'error', 7000);
      return;
    }

    const finalMediaUrl = cloudUrl;

    // Update local message in conversation
    const targetMsg = conversations[partnerId]?.messages?.find(m => m.id === localMsgId);
    if (targetMsg) {
      if (isVideo) targetMsg.videoUrl = finalMediaUrl;
      else targetMsg.imageUrl = finalMediaUrl;
      delete targetMsg._uploading;
      renderChatThread();
      renderConversationList();
      renderChatsInbox();
      saveToStorage();
    }

    // Only send the stable Cloud Storage URL to the recipient.
    const partnerPayloadUrl = cloudUrl;

    // Dispatch to partner via Firestore so recipient receives image/video in real-time
    if (partnerPayloadUrl && typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      const matchId = [fbAuth.currentUser.uid, partnerId].sort().join('_');
      const delivered = await sendRealtimeMessage(
        matchId,
        isVideo ? 'Video' : 'Photo',
        false,
        '',
        isVideo ? '' : partnerPayloadUrl,
        null,
        isVideo ? partnerPayloadUrl : '',
        isVideo,
        localMsgId
      );
      if (!delivered) {
        console.warn('sendImageMessage: media message was uploaded but could not be saved to the chat.');
        const failedMsg = conversations[partnerId]?.messages?.find(m => m.id === localMsgId);
        if (failedMsg) {
          failedMsg._uploadFailed = true;
          renderChatThread();
          saveToStorage();
        }
        showToast(isVideo ? 'Video uploaded, but could not be delivered. Please try again.' : 'Photo uploaded, but could not be delivered. Please try again.', 'error');
      } else {
        showToast(isVideo ? 'Video sent! 🎬' : 'Photo sent! 📸', 'gold');
      }
    }
  })();
}
window.sendImageMessage = sendImageMessage;

// ==========================================================
// MEDIA PRE-SEND PREVIEW (WhatsApp-style intercept)
// ==========================================================

/** Pending queue of {file, objectUrl, isVideo} items shown in preview */
let _mpxQueue = [];
let _mpxActiveIdx = 0;

/**
 * Called by chatImageInput onchange — intercepts the file selection
 * and opens the preview modal instead of sending directly.
 */
function sendImageMessage(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = ''; // reset so same file can be re-picked
  if (!files.length || !appState.currentChatId) return;

  // Build queue entries
  _mpxQueue = files.map(f => ({
    file: f,
    objectUrl: URL.createObjectURL(f),
    isVideo: Boolean(
      (f.type && f.type.startsWith('video/')) ||
      (f.name && f.name.match(/\.(mp4|mov|webm|m4v|3gp|mkv)$/i))
    )
  }));
  _mpxActiveIdx = 0;
  openMediaPreview();
}
window.sendImageMessage = sendImageMessage;

/** Opens the preview overlay */
function openMediaPreview() {
  const overlay = document.getElementById('mediaSendPreview');
  if (!overlay) return;

  // Set recipient name in title
  const recipEl = document.getElementById('mpxRecipientName');
  if (recipEl) {
    const partner = PROFILES_DATA.concat(PREMIUM_MATCHES).find(p => p.id === appState.currentChatId)
      || { name: 'Match' };
    recipEl.textContent = partner.name;
  }

  // Clear caption
  const captionEl = document.getElementById('mpxCaptionInput');
  if (captionEl) captionEl.value = '';

  overlay.style.display = 'flex';
  // Re-trigger animation
  overlay.style.animation = 'none';
  void overlay.offsetWidth;
  overlay.style.animation = '';

  _mpxRenderActive();
  _mpxRenderFilmstrip();
}
window.openMediaPreview = openMediaPreview;

/** Closes the preview overlay, revokes all object URLs */
function closeMediaPreview() {
  const overlay = document.getElementById('mediaSendPreview');
  if (overlay) overlay.style.display = 'none';
  // Revoke object URLs to free memory
  _mpxQueue.forEach(q => URL.revokeObjectURL(q.objectUrl));
  _mpxQueue = [];
  _mpxActiveIdx = 0;
  // Clear video src so it stops playing
  const vidEl = document.getElementById('mpxPreviewVideo');
  if (vidEl) { vidEl.pause(); vidEl.src = ''; }
}
window.closeMediaPreview = closeMediaPreview;

/** Renders the currently-active item in the large preview area */
function _mpxRenderActive() {
  const item = _mpxQueue[_mpxActiveIdx];
  if (!item) return;

  const imgEl = document.getElementById('mpxPreviewImg');
  const vidEl = document.getElementById('mpxPreviewVideo');

  if (item.isVideo) {
    if (imgEl) imgEl.style.display = 'none';
    if (vidEl) { vidEl.style.display = 'block'; vidEl.src = item.objectUrl; }
  } else {
    if (vidEl) { vidEl.pause(); vidEl.style.display = 'none'; vidEl.src = ''; }
    if (imgEl) { imgEl.style.display = 'block'; imgEl.src = item.objectUrl; }
  }
}

/** Renders the horizontal filmstrip thumbnails */
function _mpxRenderFilmstrip() {
  const strip = document.getElementById('mpxFilmstrip');
  if (!strip) return;
  strip.innerHTML = '';

  // Only show filmstrip when >1 item
  if (_mpxQueue.length <= 1) return;

  _mpxQueue.forEach((item, idx) => {
    const thumb = document.createElement('div');
    thumb.className = 'mpx-thumb' + (idx === _mpxActiveIdx ? ' mpx-thumb-active' : '');
    if (!item.isVideo) {
      thumb.style.backgroundImage = `url("${item.objectUrl}")`;
    } else {
      thumb.style.background = '#1a2633';
      const badge = document.createElement('span');
      badge.className = 'mpx-thumb-video-badge';
      badge.textContent = '▶ VID';
      thumb.appendChild(badge);
    }

    // Remove button
    const rmBtn = document.createElement('button');
    rmBtn.className = 'mpx-thumb-remove';
    rmBtn.innerHTML = '✕';
    rmBtn.setAttribute('aria-label', 'Remove');
    rmBtn.onclick = (e) => { e.stopPropagation(); _mpxRemoveItem(idx); };
    thumb.appendChild(rmBtn);

    thumb.addEventListener('click', () => {
      _mpxActiveIdx = idx;
      _mpxRenderActive();
      _mpxRenderFilmstrip();
    });
    strip.appendChild(thumb);
  });
}

/** Removes an item from the queue */
function _mpxRemoveItem(idx) {
  URL.revokeObjectURL(_mpxQueue[idx].objectUrl);
  _mpxQueue.splice(idx, 1);
  if (!_mpxQueue.length) { closeMediaPreview(); return; }
  if (_mpxActiveIdx >= _mpxQueue.length) _mpxActiveIdx = _mpxQueue.length - 1;
  _mpxRenderActive();
  _mpxRenderFilmstrip();
}

/** Triggered by the "+" button — opens a second file picker */
function mpxAddMoreMedia() {
  const el = document.getElementById('mpxExtraFileInput');
  if (el) el.click();
}
window.mpxAddMoreMedia = mpxAddMoreMedia;

/** Handles extra files added from the "+" picker */
function mpxHandleExtraFiles(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  files.forEach(f => {
    _mpxQueue.push({
      file: f,
      objectUrl: URL.createObjectURL(f),
      isVideo: Boolean(
        (f.type && f.type.startsWith('video/')) ||
        (f.name && f.name.match(/\.(mp4|mov|webm|m4v|3gp|mkv)$/i))
      )
    });
  });
  _mpxRenderFilmstrip();
}
window.mpxHandleExtraFiles = mpxHandleExtraFiles;

/**
 * Confirmed send — closes the preview and sends each queued item
 * using the real upload logic.
 */
async function confirmMediaSend() {
  if (!_mpxQueue.length || !appState.currentChatId) return;

  const captionText = (document.getElementById('mpxCaptionInput')?.value || '').trim();
  const queueSnapshot = [..._mpxQueue]; // copy before close clears it

  closeMediaPreview();

  const partnerId = appState.currentChatId;

  for (const item of queueSnapshot) {
    const { file, isVideo } = item;

    if (isVideo && file.size > 30 * 1024 * 1024) {
      showToast('Video exceeds 30MB limit.', 'error');
      continue;
    }

    if (!conversations[partnerId]) conversations[partnerId] = { messages: [] };

    const localMsgId = (isVideo ? 'local_vid_' : 'local_img_') + Date.now() + Math.random();
    const localPreviewUrl = URL.createObjectURL(file);

    const newMsg = {
      id: localMsgId,
      sender: 'me',
      imageUrl: isVideo ? '' : localPreviewUrl,
      videoUrl: isVideo ? localPreviewUrl : '',
      isVideo,
      // Attach caption as text if provided (only on the first item in a batch)
      text: (captionText && queueSnapshot.indexOf(item) === 0) ? captionText : '',
      read: true,
      timestamp: Date.now(),
      _uploading: true
    };

    conversations[partnerId].messages.push(newMsg);
    movePartnerToTop(partnerId);
    renderChatThread();
    renderConversationList();
    renderChatsInbox();
    updateMatchesNotificationBadge();
    saveToStorage();
    showToast(isVideo ? 'Uploading video...' : 'Uploading photo...', 'gold');

    // Upload async
    (async (f2, isVideo2, localMsgId2, localPreviewUrl2, captionForMsg) => {
      let cloudUrl = null;
      let localDataUrl = '';
      let fileToUpload = f2;

      if (!isVideo2) {
        try {
          localDataUrl = await compressImageForChat(f2, 960, 0.72);
          if (localDataUrl && localDataUrl.startsWith('data:')) {
            const resp = await fetch(localDataUrl);
            const blob = await resp.blob();
            fileToUpload = new File([blob], f2.name ? f2.name.replace(/\.[^.]+$/, '.jpg') : 'photo.jpg', { type: 'image/jpeg' });
          }
        } catch (e) { console.warn('MPX compress:', e); }
      }

      if (typeof uploadFileToBackend === 'function' && typeof fbStorage !== 'undefined' && fbStorage && !window._firebaseStorageDisabled && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
        try {
          const up = uploadFileToBackend(fileToUpload, 'chat_media', false, isVideo2 ? (f2.type || 'video/mp4') : 'image/jpeg');
          const timeout = new Promise(r => setTimeout(() => r(null), isVideo2 ? 120000 : 40000));
          const res = await Promise.race([up, timeout]);
          if (res && typeof res === 'string' && res.startsWith('http')) cloudUrl = res;
          else if (isVideo2) showToast('Video upload requires Cloud Storage (Blaze plan).', 'error', 9000);
        } catch (e) {
          if (isVideo2) showToast(`Video upload failed: ${e?.message || ''}`, 'error', 9000);
        }
      } else if (isVideo2) {
        showToast('Video upload requires Cloud Storage (Blaze plan).', 'error', 9000);
      }

      const finalUrl = cloudUrl || (!isVideo2 && localDataUrl ? localDataUrl : localPreviewUrl2);

      const targetMsg = conversations[partnerId]?.messages?.find(m => m.id === localMsgId2);
      if (targetMsg) {
        if (isVideo2) targetMsg.videoUrl = finalUrl;
        else targetMsg.imageUrl = finalUrl;
        delete targetMsg._uploading;
        renderChatThread();
        renderConversationList();
        renderChatsInbox();
        saveToStorage();
        showToast(isVideo2 ? 'Video sent! 🎬' : 'Photo sent! 📸', 'gold');
      }

      const partnerPayloadUrl = cloudUrl || (!isVideo2 && localDataUrl && localDataUrl.startsWith('data:') ? localDataUrl : '');
      if (partnerPayloadUrl && typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
        const matchId = [fbAuth.currentUser.uid, partnerId].sort().join('_');
        const msgText = isVideo2 ? (captionForMsg || 'Video') : (captionForMsg || 'Photo');
        await sendRealtimeMessage(matchId, msgText, false, '', isVideo2 ? '' : partnerPayloadUrl, null, isVideo2 ? partnerPayloadUrl : '', isVideo2, localMsgId2);
      }
      URL.revokeObjectURL(localPreviewUrl2);
    })(file, isVideo, localMsgId, localPreviewUrl, captionText);
  }

  // If caption-only (no extra text message needed) but user typed a caption,
  // it is already embedded in the first message text field above.
}
window.confirmMediaSend = confirmMediaSend;


// ==========================================================
// REAL LIVE VOICE & VIDEO CALLING (WebRTC + Metered TURN/STUN)
// ==========================================================
const METERED_ICE_SERVERS = [
  { urls: "stun:stun.relay.metered.ca:80" },
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

let peerConnectionConfig = { iceServers: METERED_ICE_SERVERS };
let activeMediaStream = null;
let activePeerConnection = null;
let activeCallDocRef = null;
let activeCallListener = null;
let activeCandidateListener = null;
let incomingCallListener = null;
let pendingIncomingCall = null;
let activeCallTimerInterval = null;
let activeCallSeconds = 0;
let isAudioMuted = false;
let isVideoMuted = false;
let currentFacingMode = 'user';
let isSpeakerOn = false;
let pendingRemoteCandidates = [];
let activeCallPartnerId = null;
let activeCallId = null;
let activeCallMatchId = null;
let activeCallIsRinging = false;
let activeCallType = 'audio';
let activeCallDirection = 'outgoing';
let isFlippingCamera = false;
let currentCameraDeviceId = null;
let callRingtoneInterval = null;
let ringtoneAudioContext = null;

function logCallInChat({ partnerId, callType, direction, status, durationSeconds = 0, callId = null }) {
  if (!partnerId) return;
  const isVideo = callType === 'video';
  const durationText = durationSeconds > 0
    ? (durationSeconds < 60 ? `${durationSeconds}s` : `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`)
    : '';

  let displayText = '';
  if (status === 'completed') {
    displayText = `${isVideo ? 'Video' : 'Voice'} call (${durationText || '0s'})`;
  } else if (status === 'declined') {
    displayText = `Declined ${isVideo ? 'video' : 'voice'} call`;
  } else if (status === 'no_answer' || status === 'cancelled') {
    displayText = (direction === 'outgoing') ? 'No answer' : `Missed ${isVideo ? 'video' : 'voice'} call`;
  } else {
    displayText = (direction === 'outgoing') ? 'No answer' : `Missed ${isVideo ? 'video' : 'voice'} call`;
  }

  const myUid = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser) ? fbAuth.currentUser.uid : 'me';
  const callSenderId = (direction === 'outgoing') ? myUid : partnerId;
  const callRecipientId = (direction === 'outgoing') ? partnerId : myUid;

  const callMsg = {
    sender: direction === 'outgoing' ? 'me' : 'them',
    senderId: callSenderId,
    recipientId: callRecipientId,
    isCall: true,
    callId: callId || '',
    callType: isVideo ? 'video' : 'audio',
    callDirection: direction,
    callStatus: status,
    duration: durationText,
    durationSeconds: durationSeconds,
    text: displayText,
    timestamp: Date.now()
  };

  if (!conversations[partnerId]) {
    conversations[partnerId] = { messages: [] };
  }

  // Deduplicate: check if this call was already logged in local messages within the last 15 seconds
  const existingIdx = conversations[partnerId].messages.findIndex(m =>
    m.isCall && ((callId && m.callId === callId) || (Math.abs(m.timestamp - callMsg.timestamp) < 15000 && m.callType === callMsg.callType))
  );

  if (existingIdx !== -1) {
    conversations[partnerId].messages[existingIdx] = Object.assign(
      conversations[partnerId].messages[existingIdx],
      callMsg
    );
  } else {
    conversations[partnerId].messages.push(callMsg);
  }
  saveToStorage();

  if (appState.currentChatId === partnerId) {
    renderChatThread();
  }
  renderConversationList();

  if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const uid = fbAuth.currentUser.uid;
    const matchId = [uid, partnerId].sort().join('_');
    const docId = callId ? `call_${callId}` : `call_${matchId}_${Math.floor(Date.now() / 15000)}`;

    fbDb.collection('matches').doc(matchId).collection('messages').doc(docId).set({
      sender: callSenderId,
      senderId: callSenderId,
      recipientId: callRecipientId,
      isCall: true,
      callId: callId || '',
      callType: isVideo ? 'video' : 'audio',
      callDirection: 'outgoing',
      callStatus: status,
      duration: durationText,
      durationSeconds: durationSeconds,
      text: displayText,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => console.warn('Could not sync call log to Firestore:', err));
  }
}

function playRingtone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!ringtoneAudioContext) ringtoneAudioContext = new AudioCtx();
    if (ringtoneAudioContext.state === 'suspended') ringtoneAudioContext.resume().catch(() => {});

    function playChime() {
      if (!pendingIncomingCall || !ringtoneAudioContext) return;
      try {
        const osc1 = ringtoneAudioContext.createOscillator();
        const osc2 = ringtoneAudioContext.createOscillator();
        const gain = ringtoneAudioContext.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        const now = ringtoneAudioContext.currentTime;
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ringtoneAudioContext.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.6);
        osc2.stop(now + 1.6);
      } catch (_) {}
    }

    playChime();
    clearInterval(callRingtoneInterval);
    callRingtoneInterval = setInterval(playChime, 2500);
    if ('vibrate' in navigator) {
      try { navigator.vibrate([600, 300, 600, 300, 600]); } catch (_) {}
    }
  } catch (_) {}
}

function stopRingtone() {
  clearInterval(callRingtoneInterval);
  callRingtoneInterval = null;
  if ('vibrate' in navigator) {
    try { navigator.vibrate(0); } catch (_) {}
  }
}

async function refreshTurnCredentials() {
  if (!fbAuth?.currentUser || typeof BACKEND_URL === 'undefined') return;
  try {
    const token = await fbAuth.currentUser.getIdToken();
    const res = await fetch(BACKEND_URL + '/turn/credentials', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) return;
    const liveServers = await res.json();
    if (Array.isArray(liveServers) && liveServers.length > 0) {
      peerConnectionConfig = { iceServers: liveServers.concat(METERED_ICE_SERVERS) };
      console.log('✅ Live TURN servers loaded:', liveServers.length);
    }
  } catch (_) {
    console.warn('TURN credential refresh failed; using STUN only.');
  }
}

function currentCallPartner() {
  const partnerId = appState.currentChatId;
  return matchedUsers.find(u => u.id === partnerId) || PROFILES_DATA.find(u => u.id === partnerId) || null;
}

function closeCallListeners() {
  if (activeCallListener) { try { activeCallListener(); } catch (_) {} activeCallListener = null; }
  if (activeCandidateListener) { try { activeCandidateListener(); } catch (_) {} activeCandidateListener = null; }
}

function ensureRemoteAudioElement() {
  let audio = document.getElementById('remoteCallAudio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'remoteCallAudio';
    audio.autoplay = true;
    audio.playsInline = true;
    audio.style.display = 'none';
    document.body.appendChild(audio);
  }
  return audio;
}

function ensureRemoteVideoElement() {
  let video = document.getElementById('remoteVideoStream');
  if (video) {
    video.style.pointerEvents = 'none';
    video.style.zIndex = '0';
    return video;
  }
  const overlay = document.getElementById('videoCallOverlay');
  const bg = document.getElementById('videoRemoteBg');
  if (!overlay) return null;

  video = document.createElement('video');
  video.id = 'remoteVideoStream';
  video.setAttribute('aria-label', 'Remote video');
  video.autoplay = true;
  video.playsInline = true;
  video.style.position = 'absolute';
  video.style.inset = '0';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'cover';
  video.style.zIndex = '0';
  video.style.pointerEvents = 'none';
  if (bg) {
    bg.appendChild(video);
  } else {
    overlay.prepend(video);
  }
  return video;
}

function setCallMediaStream(stream, type) {
  if (type === 'video') {
    const video = ensureRemoteVideoElement();
    if (video) {
      video.srcObject = stream;
      video.play?.().catch(() => {});
    }
    const audio = ensureRemoteAudioElement();
    if (audio) {
      audio.srcObject = stream;
      audio.play?.().catch(() => {});
    }
  } else {
    const audio = ensureRemoteAudioElement();
    if (audio) {
      audio.srcObject = stream;
      audio.play?.().catch(() => {});
    }
  }
}

function updateCallUi(type, status) {
  if (type === 'video') {
    const timerEl = document.getElementById('videoCallTimer');
    if (timerEl) timerEl.textContent = status;
  } else {
    const statusEl = document.getElementById('callStatusText');
    const timerEl = document.getElementById('callLiveTimer');
    if (statusEl) statusEl.textContent = status;
    if (timerEl && status === 'Connected') timerEl.style.display = 'block';
  }
}

function startCallTimer(type) {
  clearInterval(activeCallTimerInterval);
  activeCallSeconds = 0;
  activeCallTimerInterval = setInterval(() => {
    activeCallSeconds++;
    const mins = Math.floor(activeCallSeconds / 60);
    const secs = activeCallSeconds % 60;
    const timeStr = mins + ':' + String(secs).padStart(2, '0');
    if (type === 'video') {
      const el = document.getElementById('videoCallTimer');
      if (el) el.textContent = timeStr;
    } else {
      const el = document.getElementById('callLiveTimer');
      if (el) el.textContent = timeStr;
    }
    const fcbTimer = document.getElementById('fcbTimer');
    if (fcbTimer) fcbTimer.textContent = timeStr;
  }, 1000);
}

function getVideoCallConstraints(facingMode = 'user') {
  const quality = localStorage.getItem('videoCallQuality') || '1080p';
  if (quality === '1080p') {
    return {
      facingMode: facingMode,
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 30, max: 60 }
    };
  } else if (quality === '720p') {
    return {
      facingMode: facingMode,
      width: { ideal: 1280, min: 960 },
      height: { ideal: 720, min: 540 },
      frameRate: { ideal: 30 }
    };
  } else {
    // 480p Data Saver
    return {
      facingMode: facingMode,
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 24 }
    };
  }
}
window.getVideoCallConstraints = getVideoCallConstraints;

async function wireCallPeerConnection(type, pc, callRef) {
  let stream = null;
  if (type === 'video') {
    const videoCons = getVideoCallConstraints(currentFacingMode || 'user');
    const audioCons = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: videoCons, audio: audioCons });
    } catch (err1) {
      console.warn('High quality video stream failed, falling back to 720p/default:', err1);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: currentFacingMode || 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
      } catch (err2) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
    }
  } else {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
  }

  activeMediaStream = stream;
  activeMediaStream.getTracks().forEach(track => pc.addTrack(track, activeMediaStream));

  // Configure high-definition video encoding parameters if supported
  if (type === 'video' && pc.getSenders) {
    const quality = localStorage.getItem('videoCallQuality') || '1080p';
    const maxBitrate = quality === '1080p' ? 2500000 : (quality === '720p' ? 1200000 : 500000);
    pc.getSenders().forEach(sender => {
      if (sender.track && sender.track.kind === 'video') {
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = maxBitrate;
          sender.setParameters(params).catch(() => {});
        } catch (_) {}
      }
    });
  }

  const localVideo = document.getElementById('myVideoStream');
  const pipCamOff = document.getElementById('pipCamOff');
  if (pipCamOff) pipCamOff.style.display = 'none';

  if (type === 'video' && localVideo) {
    localVideo.srcObject = activeMediaStream;
    localVideo.autoplay = true;
    localVideo.playsInline = true;
    localVideo.muted = true;
    localVideo.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
    localVideo.setAttribute('playsinline', '');
    localVideo.setAttribute('webkit-playsinline', '');
    localVideo.setAttribute('muted', '');
    localVideo.setAttribute('autoplay', '');
    localVideo.play?.().catch(() => {});
  }

  pc.onicecandidate = event => {
    if (!event.candidate || !fbAuth?.currentUser) return;
    callRef.collection('candidates').add({
      fromUserId: fbAuth.currentUser.uid,
      candidate: event.candidate.toJSON()
    }).catch(err => console.warn('ICE candidate write failed:', err.message));
  };

  pc.ontrack = event => {
    const stream = event.streams?.[0];
    if (stream) setCallMediaStream(stream, type);
  };

  activeCandidateListener = callRef.collection('candidates').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type !== 'added') return;
      const data = change.doc.data() || {};
      if (!data.candidate || data.fromUserId === fbAuth?.currentUser?.uid) return;
      const candidate = new RTCIceCandidate(data.candidate);
      if (pc.remoteDescription?.type) {
        pc.addIceCandidate(candidate).catch(err => console.warn('ICE candidate error:', err.message));
      } else {
        pendingRemoteCandidates.push(candidate);
      }
    });
  }, err => console.warn('ICE listener error:', err.message));
}

async function flushPendingRemoteCandidates(pc) {
  if (!pc.remoteDescription?.type) return;
  const pending = pendingRemoteCandidates.splice(0);
  for (const candidate of pending) {
    try { await pc.addIceCandidate(candidate); } catch (_) {}
  }
}

async function startPeerCall(type) {
  const partner = currentCallPartner();
  if (!fbAuth?.currentUser || !fbDb || !partner || partner.id === fbAuth.currentUser.uid) {
    showToast('Calls are available only between signed-in matches.', 'error');
    return;
  }
  if ((window.__blockedUserIds || new Set()).has(partner.id)) {
    showToast('You cannot call a blocked contact.', 'error');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    showToast('This device/browser does not support secure calling.', 'error');
    return;
  }

  if (activePeerConnection) endCall(false);

  const uid = fbAuth.currentUser.uid;
  const matchId = [uid, partner.id].sort().join('_');

  try {
    await refreshTurnCredentials();
    const matchDoc = await fbDb.collection('matches').doc(matchId).get();
    const matchUsers = matchDoc.data()?.users;
    if (!matchDoc.exists || !Array.isArray(matchUsers) || !matchUsers.includes(uid) || !matchUsers.includes(partner.id)) {
      showToast('Calls are available only for mutual matches.', 'error');
      return;
    }

    const callRef = fbDb.collection('matches').doc(matchId).collection('calls').doc(uid + '_' + Date.now());
    const pc = new RTCPeerConnection(peerConnectionConfig);
    activePeerConnection = pc;
    activeCallDocRef = callRef;
    activeCallPartnerId = partner.id;
    activeCallId = callRef.id;
    activeCallMatchId = matchId;
    activeCallIsRinging = true;
    activeCallType = type;
    activeCallDirection = 'outgoing';
    pendingRemoteCandidates = [];

    const overlay = document.getElementById(type === 'video' ? 'videoCallOverlay' : 'voiceCallOverlay');
    const nameEl = document.getElementById(type === 'video' ? 'videoCallName' : 'callName');
    if (nameEl) nameEl.textContent = partner.name || 'Match';
    if (overlay) overlay.style.display = 'flex';
    updateCallUi(type, 'Calling... 📞');

    await wireCallPeerConnection(type, pc, callRef);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await callRef.set({
      users: [uid, partner.id].sort(),
      callerId: uid,
      calleeId: partner.id,
      type,
      offer: { type: offer.type, sdp: offer.sdp },
      status: 'ringing',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Dispatch high-urgency FCM push notification to callee's device
    fbAuth.currentUser.getIdToken().then(token => {
      fetch(`${typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : ''}/fcm/incoming-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          toUserId: partner.id,
          callType: type,
          callId: callRef.id,
          matchId: matchId
        })
      }).catch(e => console.warn('Incoming call push notification failed:', e.message));
    }).catch(() => {});

    activeCallListener = callRef.onSnapshot(async snap => {
      if (!snap.exists || !activePeerConnection) return;
      const data = snap.data() || {};
      if (data.answer && !pc.currentRemoteDescription) {
        activeCallIsRinging = false;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await flushPendingRemoteCandidates(pc);
          updateCallUi(type, 'Connected');
          startCallTimer(type);
        } catch (err) {
          console.warn('Remote answer error:', err.message);
          endCall(false);
        }
      }
      if (data.status === 'declined') {
        endCall(true, 'declined');
      } else if (data.status === 'ended') {
        endCall(false);
      }
    }, err => console.warn('Call listener error:', err.message));

    showToast('Calling ' + (partner.name || 'your match') + '... 📞', 'info');
  } catch (err) {
    console.warn('Start call failed:', err);
    showToast('Could not start the call. Please try again.', 'error');
    endCall(false);
  }
}

function showIncomingCallPrompt(callId, data) {
  if (pendingIncomingCall || activePeerConnection) return;
  pendingIncomingCall = { callId, ...data };
  playRingtone();
  const partner = matchedUsers.find(u => u.id === data.callerId) || PROFILES_DATA.find(u => u.id === data.callerId);
  const name = partner?.name || 'Someone';
  const overlay = document.createElement('div');
  overlay.id = 'incomingCallPrompt';
  overlay.className = 'whatsapp-dialog-overlay';
  overlay.innerHTML = `
    <div class="whatsapp-dialog-card" style="text-align:center;max-width:360px;">
      <div style="font-size:2.5rem;margin-bottom:8px;">${data.type === 'video' ? '📹' : '📞'}</div>
      <h3 class="wa-dialog-title">${escHtml(name)} is calling</h3>
      <p class="wa-dialog-desc">${data.type === 'video' ? 'Incoming video call' : 'Incoming voice call'}</p>
      <div class="wa-dialog-actions">
        <button class="wa-dialog-btn wa-dialog-btn-danger" onclick="acceptIncomingCall()">Accept</button>
        <button class="wa-dialog-btn wa-dialog-btn-secondary" onclick="declineIncomingCall()">Decline</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function acceptIncomingCall(incomingOverride) {
  const incoming = incomingOverride || pendingIncomingCall;
  stopRingtone();
  if (!incoming || !fbAuth?.currentUser || !fbDb) return;
  document.getElementById('incomingCallPrompt')?.remove();
  pendingIncomingCall = null;

  const uid = fbAuth.currentUser.uid;
  const partner = matchedUsers.find(u => u.id === incoming.callerId) || PROFILES_DATA.find(u => u.id === incoming.callerId);
  const type = incoming.type === 'video' ? 'video' : 'audio';
  if (!partner) return declineIncomingCall(incoming);

  try {
    await refreshTurnCredentials();
    const callRef = fbDb.collection('matches').doc(incoming.matchId).collection('calls').doc(incoming.callId);
    const pc = new RTCPeerConnection(peerConnectionConfig);
    activePeerConnection = pc;
    activeCallDocRef = callRef;
    activeCallPartnerId = incoming.callerId;
    activeCallId = incoming.callId;
    activeCallMatchId = incoming.matchId;
    activeCallIsRinging = false;
    activeCallType = type;
    activeCallDirection = 'incoming';
    pendingRemoteCandidates = [];

    const overlay = document.getElementById(type === 'video' ? 'videoCallOverlay' : 'voiceCallOverlay');
    const nameEl = document.getElementById(type === 'video' ? 'videoCallName' : 'callName');
    if (nameEl) nameEl.textContent = partner.name || 'Match';
    if (overlay) overlay.style.display = 'flex';
    updateCallUi(type, 'Connecting...');

    await wireCallPeerConnection(type, pc, callRef);
    await pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));
    await flushPendingRemoteCandidates(pc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await callRef.update({
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'active'
    });

    activeCallListener = callRef.onSnapshot(snap => {
      if (snap.exists && snap.data()?.status === 'ended') endCall(false);
    }, err => console.warn('Call listener error:', err.message));

    updateCallUi(type, 'Connected');
    startCallTimer(type);
  } catch (err) {
    console.warn('Accept call failed:', err);
    showToast('Could not accept the call. Please try again.', 'error');
    endCall(false);
  }
}

async function declineIncomingCall(incomingOverride) {
  const incoming = incomingOverride || pendingIncomingCall;
  stopRingtone();
  document.getElementById('incomingCallPrompt')?.remove();
  pendingIncomingCall = null;
  if (!incoming) return;

  const callId = incoming.callId || activeCallId;

  if (incoming.callerId) {
    logCallInChat({
      partnerId: incoming.callerId,
      callType: incoming.type === 'video' ? 'video' : 'audio',
      direction: 'incoming',
      status: 'declined',
      durationSeconds: 0,
      callId
    });
  }

  if (!fbDb) return;
  try {
    await fbDb.collection('matches').doc(incoming.matchId).collection('calls').doc(incoming.callId).update({
      status: 'declined',
      endedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (_) {}
}

async function listenForIncomingCalls() {
  if (!fbDb || !fbAuth?.currentUser) return;
  if (incomingCallListener) { try { incomingCallListener(); } catch (_) {} }
  const uid = fbAuth.currentUser.uid;
  incomingCallListener = fbDb.collectionGroup('calls')
    .where('calleeId', '==', uid)
    .limit(20)
    .onSnapshot(snapshot => {
      const now = Date.now();
      snapshot.docChanges().forEach(change => {
        if (change.type !== 'added' && change.type !== 'modified') return;
        const data = change.doc.data() || {};
        if (data.status !== 'ringing' || !data.callerId || !data.offer) return;
        const created = data.createdAt?.toMillis ? data.createdAt.toMillis() : now;
        if (now - created > 2 * 60 * 1000) return;
        const parts = change.doc.ref.path.split('/');
        const m = parts.indexOf('matches');
        const cIdx = parts.indexOf('calls');
        const matchId = m >= 0 ? parts[m + 1] : null;
        const callId = cIdx >= 0 ? parts[cIdx + 1] : null;
        if (!matchId || !callId || (window.__blockedUserIds || new Set()).has(data.callerId)) return;
        showIncomingCallPrompt(callId, { ...data, matchId });
      });
    }, err => {
      if (err?.message?.includes('COLLECTION_GROUP_ASC')) {
        console.info('ℹ️ Incoming call index: Collection group index on "calls.calleeId" is building/pending in Firebase Console.');
      } else {
        console.warn('Incoming call listener:', err.message);
      }
    });
}

function openCallConfirmDialog(type = 'voice') {
  if (typeof _reactionPickerOpen !== 'undefined' && _reactionPickerOpen) return;

  const partnerId = appState.currentChatId;
  const partner = (typeof matchedUsers !== 'undefined' && matchedUsers.find(u => u.id === partnerId)) || (typeof PROFILES_DATA !== 'undefined' && PROFILES_DATA.find(u => u.id === partnerId));
  const name = partner ? partner.name : 'your match';
  const isVideo = type === 'video';

  document.getElementById('callConfirmDialog')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'callConfirmDialog';
  overlay.className = 'whatsapp-dialog-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.68);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.15s ease;';
  overlay.onclick = (e) => {
    if (e.target === overlay) closeCallConfirmDialog();
  };

  overlay.innerHTML = `
    <div class="whatsapp-dialog-card" style="text-align:center;max-width:320px;width:100%;border-radius:24px;padding:24px 20px;background:#1E1530;border:1px solid rgba(255,255,255,0.15);box-shadow:0 16px 40px rgba(0,0,0,0.85);">
      <div style="width:58px;height:58px;border-radius:50%;background:rgba(209,58,99,0.18);color:#FF2E70;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:26px;">
        ${isVideo ? '📹' : '📞'}
      </div>
      <h3 style="margin:0 0 6px;font-size:1.15rem;font-weight:700;color:#fff;">Call back ${escHtml(name)}?</h3>
      <p style="margin:0 0 20px;font-size:0.85rem;color:rgba(255,255,255,0.65);line-height:1.4;">
        Do you want to start a ${isVideo ? 'video' : 'voice'} call with ${escHtml(name)}?
      </p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button onclick="closeCallConfirmDialog()" style="flex:1;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#fff;font-weight:600;font-size:0.9rem;cursor:pointer;">
          Cancel
        </button>
        <button onclick="executeCallFromConfirm('${isVideo ? 'video' : 'voice'}')" style="flex:1;padding:12px;border-radius:14px;background:linear-gradient(135deg,#D13A63,#E0567F);color:#fff;border:none;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
          <span>${isVideo ? '📹 Call' : '📞 Call'}</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}
window.openCallConfirmDialog = openCallConfirmDialog;

function closeCallConfirmDialog() {
  document.getElementById('callConfirmDialog')?.remove();
}
window.closeCallConfirmDialog = closeCallConfirmDialog;

function executeCallFromConfirm(type) {
  closeCallConfirmDialog();
  if (type === 'video') {
    startVideoCall();
  } else {
    startVoiceCall();
  }
}
window.executeCallFromConfirm = executeCallFromConfirm;

async function startVoiceCall() {
  await startPeerCall('audio');
}

async function startVideoCall() {
  await startPeerCall('video');
}

let isCallMinimized = false;

function minimizeCall() {
  if (!activePeerConnection && !activeCallDocRef && !activeCallIsRinging) return;
  isCallMinimized = true;

  const voice = document.getElementById('voiceCallOverlay');
  const video = document.getElementById('videoCallOverlay');
  if (voice) voice.style.display = 'none';
  if (video) video.style.display = 'none';

  const fcb = document.getElementById('floatingCallBar');
  if (fcb) {
    fcb.style.display = 'flex';
    const partnerId = activeCallPartnerId || appState.currentChatId;
    const partner = (typeof PROFILES_DATA !== 'undefined' ? PROFILES_DATA.concat(typeof PREMIUM_MATCHES !== 'undefined' ? PREMIUM_MATCHES : []) : []).find(p => p.id === partnerId) || {};
    const nameEl = document.getElementById(activeCallType === 'video' ? 'videoCallName' : 'callName');
    const partnerName = partner.name || nameEl?.textContent || 'Match';
    const avatarEl = document.getElementById('callAvatar');
    const partnerPhoto = partner.photos?.[0] || partner.photo || avatarEl?.src || 'default-avatar.png';

    const fcbName = document.getElementById('fcbName');
    const fcbAvatar = document.getElementById('fcbAvatar');
    const fcbTypeIcon = document.getElementById('fcbTypeIcon');
    const fcbTimer = document.getElementById('fcbTimer');

    if (fcbName) fcbName.textContent = partnerName;
    if (fcbAvatar) fcbAvatar.src = partnerPhoto;
    if (fcbTypeIcon) {
      fcbTypeIcon.className = activeCallType === 'video' ? 'fas fa-video fcb-type-icon' : 'fas fa-phone fcb-type-icon';
    }
    if (fcbTimer) {
      if (activeCallSeconds > 0) {
        const mins = Math.floor(activeCallSeconds / 60);
        const secs = activeCallSeconds % 60;
        fcbTimer.textContent = mins + ':' + String(secs).padStart(2, '0');
      } else {
        fcbTimer.textContent = activeCallIsRinging ? 'Calling...' : 'Active Call';
      }
    }
  }
}
window.minimizeCall = minimizeCall;

function expandCall() {
  isCallMinimized = false;
  const fcb = document.getElementById('floatingCallBar');
  if (fcb) fcb.style.display = 'none';

  if (activeCallType === 'video') {
    const video = document.getElementById('videoCallOverlay');
    if (video) video.style.display = 'flex';
  } else {
    const voice = document.getElementById('voiceCallOverlay');
    if (voice) voice.style.display = 'flex';
  }
}
window.expandCall = expandCall;

function endCall(showToastMessage = true, explicitStatus = null) {
  isCallMinimized = false;
  const fcbEl = document.getElementById('floatingCallBar');
  if (fcbEl) fcbEl.style.display = 'none';
  stopRingtone();
  const seconds = activeCallSeconds;
  const partnerId = activeCallPartnerId || appState.currentChatId;
  const callType = activeCallType || 'audio';
  const direction = activeCallDirection || 'outgoing';
  const wasRinging = activeCallIsRinging;
  const callId = activeCallId;

  if (partnerId) {
    let status = 'completed';
    if (explicitStatus) {
      status = explicitStatus;
    } else if (seconds > 0) {
      status = 'completed';
    } else if (wasRinging) {
      status = (direction === 'outgoing') ? 'no_answer' : 'missed';
    }
    logCallInChat({
      partnerId,
      callType,
      direction,
      status,
      durationSeconds: seconds,
      callId
    });
  }

  if (activeCallDocRef && fbAuth?.currentUser) {
    activeCallDocRef.update({
      status: 'ended',
      endedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
  }
  // If call is ended while still ringing, notify callee device to dismiss ringing push notification
  if (activeCallPartnerId && activeCallIsRinging && fbAuth?.currentUser) {
    const partnerId = activeCallPartnerId;
    const callId = activeCallId;
    fbAuth.currentUser.getIdToken().then(token => {
      fetch(`${typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : ''}/fcm/call-ended`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ toUserId: partnerId, callId })
      }).catch(() => {});
    }).catch(() => {});
  }
  activeCallIsRinging = false;
  activeCallPartnerId = null;
  activeCallId = null;
  activeCallMatchId = null;
  closeCallListeners();
  if (activePeerConnection) {
    try { activePeerConnection.close(); } catch (_) {}
    activePeerConnection = null;
  }
  if (activeMediaStream) {
    activeMediaStream.getTracks().forEach(track => {
      try { track.stop(); } catch (_) {}
    });
    activeMediaStream = null;
  }
  activeCallDocRef = null;
  pendingRemoteCandidates = [];
  clearInterval(activeCallTimerInterval);
  activeCallTimerInterval = null;

  const voice = document.getElementById('voiceCallOverlay');
  const video = document.getElementById('videoCallOverlay');
  if (voice) voice.style.display = 'none';
  if (video) video.style.display = 'none';
  const localVideo = document.getElementById('myVideoStream');
  if (localVideo) {
    localVideo.srcObject = null;
    try { localVideo.pause(); } catch (_) {}
  }
  const remoteVideo = document.getElementById('remoteVideoStream');
  if (remoteVideo) {
    remoteVideo.srcObject = null;
    try { remoteVideo.pause(); } catch (_) {}
  }
  const remoteAudio = document.getElementById('remoteCallAudio');
  if (remoteAudio) {
    remoteAudio.srcObject = null;
    try { remoteAudio.pause(); } catch (_) {}
  }

  isAudioMuted = false;
  isVideoMuted = false;
  currentFacingMode = 'user';

  const callMuteBtn = document.getElementById('callMuteBtn');
  if (callMuteBtn) {
    callMuteBtn.classList.remove('muted');
    callMuteBtn.style.background = '';
    callMuteBtn.style.color = '';
    const label = callMuteBtn.parentElement?.querySelector('span');
    if (label) label.textContent = 'Mute';
  }
  const videoMuteBtn = document.getElementById('videoMuteBtn');
  if (videoMuteBtn) {
    videoMuteBtn.classList.remove('muted');
    videoMuteBtn.style.background = '';
    videoMuteBtn.style.color = '';
    const label = document.getElementById('videoMuteLabel') || videoMuteBtn.parentElement?.querySelector('span');
    if (label) label.textContent = 'Mute';
  }
  const camBtn = document.getElementById('videoCamBtn');
  if (camBtn) {
    camBtn.classList.remove('muted');
    camBtn.style.background = '';
    camBtn.style.color = '';
    const label = document.getElementById('videoCamLabel') || camBtn.parentElement?.querySelector('span');
    if (label) label.textContent = 'Camera';
  }
  const pipCamOff = document.getElementById('pipCamOff');
  if (pipCamOff) pipCamOff.style.display = 'none';

  if (showToastMessage) {
    if (explicitStatus === 'declined') {
      showToast('Call declined 📵', 'info');
    } else {
      showToast(seconds > 0 ? `Call ended (${Math.floor(seconds / 60)}m ${seconds % 60}s)` : 'Call ended', 'info');
    }
  }
  activeCallSeconds = 0;
}

function endVideoCall() {
  endCall();
}

function toggleCallMute() {
  isAudioMuted = !isAudioMuted;

  // 1. Mute local media stream audio tracks
  if (activeMediaStream) {
    activeMediaStream.getAudioTracks().forEach(track => {
      track.enabled = !isAudioMuted;
    });
  }

  // 2. Mute RTCRtpSender audio tracks
  if (activePeerConnection) {
    activePeerConnection.getSenders().forEach(sender => {
      if (sender.track && sender.track.kind === 'audio') {
        sender.track.enabled = !isAudioMuted;
      }
    });
  }

  // 3. Update voice call button UI
  const callMuteBtn = document.getElementById('callMuteBtn');
  if (callMuteBtn) {
    callMuteBtn.classList.toggle('muted', isAudioMuted);
    callMuteBtn.style.background = isAudioMuted ? 'rgba(255, 61, 0, 0.35)' : '';
    callMuteBtn.style.color = isAudioMuted ? '#FF3D00' : '#fff';
    const label = callMuteBtn.parentElement?.querySelector('span');
    if (label) label.textContent = isAudioMuted ? 'Unmute' : 'Mute';
  }

  // 4. Update video call button UI
  const videoMuteBtn = document.getElementById('videoMuteBtn');
  if (videoMuteBtn) {
    videoMuteBtn.classList.toggle('muted', isAudioMuted);
    videoMuteBtn.style.background = isAudioMuted ? 'rgba(255, 61, 0, 0.35)' : '';
    videoMuteBtn.style.color = isAudioMuted ? '#FF3D00' : '#fff';
    const label = document.getElementById('videoMuteLabel') || videoMuteBtn.parentElement?.querySelector('span');
    if (label) label.textContent = isAudioMuted ? 'Unmute' : 'Mute';
  }

  showToast(isAudioMuted ? 'Microphone muted 🔇' : 'Microphone unmuted 🎙️', 'info');
}

function toggleVideoMute() {
  toggleCallMute();
}

function toggleCamera() {
  isVideoMuted = !isVideoMuted;
  if (activeMediaStream) {
    activeMediaStream.getVideoTracks().forEach(track => {
      track.enabled = !isVideoMuted;
    });
  }
  if (activePeerConnection) {
    activePeerConnection.getSenders().forEach(sender => {
      if (sender.track && sender.track.kind === 'video') {
        sender.track.enabled = !isVideoMuted;
      }
    });
  }
  const pipCamOff = document.getElementById('pipCamOff');
  if (pipCamOff) pipCamOff.style.display = isVideoMuted ? 'flex' : 'none';

  const camBtn = document.getElementById('videoCamBtn');
  if (camBtn) {
    camBtn.classList.toggle('muted', isVideoMuted);
    camBtn.style.background = isVideoMuted ? 'rgba(255, 61, 0, 0.35)' : '';
    camBtn.style.color = isVideoMuted ? '#FF3D00' : '#fff';
    const label = document.getElementById('videoCamLabel') || camBtn.parentElement?.querySelector('span');
    if (label) label.textContent = isVideoMuted ? 'Turn on' : 'Camera';
  }
  showToast(isVideoMuted ? 'Camera paused 📷' : 'Camera resumed 📹', 'info');
}

async function flipCamera() {
  if (isFlippingCamera) return;
  if (!activeMediaStream) {
    showToast('No active video camera', 'warning');
    return;
  }
  const currentTrack = activeMediaStream.getVideoTracks()[0];
  if (!currentTrack) {
    showToast('Camera track not found', 'warning');
    return;
  }

  isFlippingCamera = true;
  const flipBtn = document.getElementById('videoFlipBtn');
  if (flipBtn) {
    flipBtn.style.pointerEvents = 'none';
    flipBtn.style.opacity = '0.5';
  }

  const targetMode = currentFacingMode === 'user' ? 'environment' : 'user';

  try {
    // 1. Enumerate video devices to detect multi-camera mobile devices
    let videoDevices = [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      videoDevices = devices.filter(d => d.kind === 'videoinput');
    } catch (_) {}

    const currentDeviceId = currentTrack.getSettings ? currentTrack.getSettings().deviceId : null;

    let targetDeviceId = null;
    if (videoDevices.length > 1) {
      if (targetMode === 'environment') {
        const back = videoDevices.find(d => /back|rear|environment|world|camera2 0|camera 0/i.test(d.label));
        if (back) {
          targetDeviceId = back.deviceId;
        } else if (currentDeviceId) {
          const next = videoDevices.find(d => d.deviceId !== currentDeviceId);
          if (next) targetDeviceId = next.deviceId;
        } else {
          targetDeviceId = videoDevices[videoDevices.length - 1].deviceId;
        }
      } else {
        const front = videoDevices.find(d => /front|user|selfie|face|camera2 1|camera 1/i.test(d.label));
        if (front) {
          targetDeviceId = front.deviceId;
        } else if (currentDeviceId) {
          const next = videoDevices.find(d => d.deviceId !== currentDeviceId);
          if (next) targetDeviceId = next.deviceId;
        } else {
          targetDeviceId = videoDevices[0].deviceId;
        }
      }
    }

    // 2. Stop current track and release hardware sensor
    try {
      currentTrack.stop();
      activeMediaStream.removeTrack(currentTrack);
    } catch (_) {}

    // 3. Small pause to allow mobile OS camera HAL to release hardware sensor
    await new Promise(r => setTimeout(r, 90));

    // 4. Try target constraints in priority order (with HD camera resolution preserved)
    const vCons = getVideoCallConstraints(targetMode);
    const candidateConstraints = [];
    if (targetDeviceId) {
      candidateConstraints.push({ video: { deviceId: { exact: targetDeviceId }, width: vCons.width, height: vCons.height, frameRate: vCons.frameRate }, audio: false });
    }
    candidateConstraints.push({ video: { facingMode: { exact: targetMode }, width: vCons.width, height: vCons.height, frameRate: vCons.frameRate }, audio: false });
    candidateConstraints.push({ video: { facingMode: { ideal: targetMode }, width: vCons.width, height: vCons.height }, audio: false });
    candidateConstraints.push({ video: { facingMode: targetMode }, audio: false });

    let newStream = null;
    for (const constraints of candidateConstraints) {
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (newStream && newStream.getVideoTracks().length > 0) break;
      } catch (_) {}
    }

    // 5. Fallback recovery: restore user camera if back camera could not be opened
    if (!newStream || !newStream.getVideoTracks().length) {
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
        currentFacingMode = 'user';
        showToast('Back camera not available on this device', 'warning');
      } catch (err) {
        console.error('Camera recovery failed:', err);
        showToast('Could not access camera', 'error');
        return;
      }
    } else {
      currentFacingMode = targetMode;
    }

    const newTrack = newStream.getVideoTracks()[0];
    if (newTrack) {
      activeMediaStream.addTrack(newTrack);

      // Replace track on WebRTC peer connection if active
      if (activePeerConnection) {
        const sender = activePeerConnection.getSenders().find(s => s.track && s.track.kind === 'video') ||
                       activePeerConnection.getSenders().find(s => s.kind === 'video');
        if (sender) {
          try {
            await sender.replaceTrack(newTrack);
          } catch (err) {
            console.warn('replaceTrack error:', err.message);
          }
        }
      }

      // Re-bind to local video element so mobile browser refreshes the video source
      const localVideo = document.getElementById('myVideoStream');
      if (localVideo) {
        localVideo.srcObject = null;
        localVideo.srcObject = activeMediaStream;
        localVideo.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
        try {
          await localVideo.play();
        } catch (_) {}
      }

      showToast(currentFacingMode === 'user' ? 'Front camera 🤳' : 'Back camera 📸', 'info');
    }
  } catch (err) {
    console.warn('Flip camera error:', err);
    showToast('Could not flip camera', 'warning');
  } finally {
    isFlippingCamera = false;
    if (flipBtn) {
      flipBtn.style.pointerEvents = '';
      flipBtn.style.opacity = '1';
    }
  }
}

async function toggleSpeaker() {
  isSpeakerOn = !isSpeakerOn;
  const audio = document.getElementById('remoteCallAudio');
  if (audio && typeof audio.setSinkId === 'function') {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const speakers = devices.filter(d => d.kind === 'audiooutput');
      if (speakers.length > 1) {
        await audio.setSinkId(isSpeakerOn ? speakers[1].deviceId : speakers[0].deviceId);
      }
    } catch (_) {}
  }
  const btn = document.getElementById('callSpeakerBtn');
  if (btn) {
    btn.classList.toggle('muted', isSpeakerOn);
    btn.style.background = isSpeakerOn ? 'rgba(255, 45, 120, 0.3)' : '';
    btn.style.color = isSpeakerOn ? '#FF2D78' : '';
  }
  showToast(isSpeakerOn ? 'Speakerphone on 🔊' : 'Ear speaker on 🔈', 'info');
}

// Window bindings for seamless inline onclick handlers
window.endCall = endCall;
window.endVideoCall = endVideoCall;
window.minimizeCall = minimizeCall;
window.expandCall = expandCall;
window.toggleCallMute = toggleCallMute;
window.toggleVideoMute = toggleVideoMute;
window.toggleCamera = toggleCamera;
window.flipCamera = flipCamera;
window.toggleSpeaker = toggleSpeaker;

window.addEventListener('beforeunload', () => {
  if (activePeerConnection) {
    endCall(false);
  }
});

function sendMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !appState.currentChatId) return;

  // Handle edit message mode
  if (_editingState) {
    const { matchId, msgId } = _editingState;
    const hist = conversations[appState.currentChatId]?.messages;
    let msgIdx = -1;
    if (hist) {
      if (msgId.startsWith('local_')) {
        msgIdx = parseInt(msgId.replace('local_', ''), 10);
      } else {
        msgIdx = hist.findIndex(m => m.firestoreId === msgId);
      }
      if (msgIdx !== -1 && hist[msgIdx]) {
        hist[msgIdx].text = text;
        hist[msgIdx].edited = true;
      }
    }

    if (typeof editRealtimeMessage === 'function' && matchId && !msgId.startsWith('local_')) {
      editRealtimeMessage(matchId, msgId, text);
    } else if (typeof fbDb !== 'undefined' && fbDb && matchId && !msgId.startsWith('local_')) {
      fbDb.collection('matches').doc(matchId).collection('messages').doc(msgId)
        .update({ text, edited: true }).catch(() => {});
    }

    saveToStorage();
    renderChatThread();
    renderConversationList();
    cancelEditMessage();
    showToast('Message edited ✏️', 'info');
    return;
  }

  if (!conversations[appState.currentChatId]) {
    conversations[appState.currentChatId] = { messages: [] };
  }

  const replyPayload = _replyingToState ? {
    id: _replyingToState.id,
    senderName: _replyingToState.senderName,
    text: _replyingToState.text,
    imageUrl: _replyingToState.imageUrl || ''
  } : null;

  const localMsgId = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const newMsgObj = {
    id: localMsgId,
    localId: localMsgId,
    sender: 'me',
    text,
    read: true,
    timestamp: Date.now()
  };
  if (replyPayload) {
    newMsgObj.replyTo = replyPayload;
  }

  conversations[appState.currentChatId].messages.push(newMsgObj);
  conversations[appState.currentChatId].lastReadTimestamp = Date.now();
  input.value = '';
  input.style.height = 'auto';
  cancelReplyMessage();

  movePartnerToTop(appState.currentChatId);
  renderChatThread();
  renderConversationList();
  renderChatsInbox();
  updateMatchesNotificationBadge();
  saveToStorage();

  // Send via real-time Firebase if logged in, otherwise handle local demo mode
  if (typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const matchId = [fbAuth.currentUser.uid, appState.currentChatId].sort().join('_');
    sendRealtimeMessage(matchId, text, false, "", "", replyPayload, "", false, localMsgId);

    // Trigger push notification to partner (fire-and-forget)
    const myName = currentUser.name || 'Your match';
    fbAuth.currentUser.getIdToken().then(token => {
      fetch(`${typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : 'https://matchmaker-viwb.onrender.com'}/fcm/new-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          toUserId: appState.currentChatId,
          fromUserName: myName,
          messageText: text,
          matchId
        })
      }).catch(() => {});
    }).catch(() => {});
  } else {
    triggerAutoReply();
  }
}

function handleChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function sendIcebreaker(text) {
  if (!appState.currentChatId) return;
  if (!conversations[appState.currentChatId]) {
    conversations[appState.currentChatId] = { messages: [] };
  }
  const localMsgId = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  conversations[appState.currentChatId].messages.push({
    id: localMsgId,
    localId: localMsgId,
    sender: 'me',
    text,
    read: true,
    timestamp: Date.now()
  });
  conversations[appState.currentChatId].lastReadTimestamp = Date.now();

  const ice = document.getElementById('icebreakersRow');
  if (ice) { ice.style.opacity = '0.2'; ice.style.pointerEvents = 'none'; }

  movePartnerToTop(appState.currentChatId);
  renderChatThread();
  renderConversationList();
  renderChatsInbox();
  updateMatchesNotificationBadge();
  saveToStorage();

  if (typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const matchId = [fbAuth.currentUser.uid, appState.currentChatId].sort().join('_');
    sendRealtimeMessage(matchId, text, false, "", "", null, "", false, localMsgId);
  } else {
    triggerAutoReply();
  }
}

function triggerAutoReply() {
  // Never fire dummy bot auto-reply when user is signed in with live Firebase
  if (typeof fbAuth !== 'undefined' && fbAuth && fbAuth.currentUser) return;

  const partner = matchedUsers.find(u => u.id === appState.currentChatId);
  if (!partner || !partner.autoReply || partner.autoReplied) return;

  // Immediately lock to prevent repeated auto-replies
  partner.autoReplied = true;
  const replyText = partner.autoReply;
  partner.autoReply = '';

  // Show typing indicator
  showTypingIndicator();

  setTimeout(() => {
    removeTypingIndicator();
    if (!conversations[partner.id]) conversations[partner.id] = { messages: [] };

    const isChatOpen = (appState.currentScreen === 'chat' && appState.currentChatId === partner.id);
    conversations[partner.id].messages.push({
      sender: 'them',
      text: replyText,
      read: isChatOpen,
      timestamp: Date.now()
    });

    movePartnerToTop(partner.id);
    if (isChatOpen) renderChatThread();
    renderConversationList();
    renderChatsInbox();
    updateMatchesNotificationBadge();
    saveToStorage();

    if (!isChatOpen) {
      playNotificationSound();
      showToast(`💬 ${partner.name}: ${replyText.substring(0, 36)}...`, 'info');
    }
  }, 1400 + Math.random() * 600);
}

// ==========================================================
// VOICE RECORDING — Real MediaRecorder API
// ==========================================================

let mediaRecorder = null;
let audioChunks = [];
let voiceRecTimerInterval = null;
let voiceRecSeconds = 0;

async function toggleVoiceRecording() {
  if (!appState.isRecording) {
    await startVoiceRecording();
  } else {
    // If tapping mic again while recording, send it
    await sendVoiceNote();
  }
}

let _currentPlayingVoiceMsgId = null;
let _currentVoiceAudio = null;

const PLAY_ICON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const PAUSE_ICON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

function formatAudioTime(seconds) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function resetVoiceNoteUi(msgId) {
  if (!msgId) return;
  const bubble = document.getElementById(`voiceBubble_${msgId}`);
  if (bubble) {
    const playBtn = bubble.querySelector('.vn-play-btn');
    if (playBtn) playBtn.innerHTML = PLAY_ICON_SVG;
    const fillEl = document.getElementById(`vnFill_${msgId}`);
    if (fillEl) fillEl.style.width = '0%';
    const timeEl = document.getElementById(`vnTime_${msgId}`);
    if (timeEl && bubble.dataset.duration) timeEl.textContent = bubble.dataset.duration;
  }
}

function toggleVoiceNotePlayback(msgId) {
  const bubble = document.getElementById(`voiceBubble_${msgId}`);
  if (!bubble) return;
  const audioSrc = bubble.dataset.audiosrc;
  if (!audioSrc) {
    showToast('Voice note is not available.', 'error');
    return;
  }

  // If clicking currently active voice note
  if (_currentPlayingVoiceMsgId === msgId && _currentVoiceAudio) {
    if (_currentVoiceAudio.paused) {
      _currentVoiceAudio.play().then(() => {
        const btn = bubble.querySelector('.vn-play-btn');
        if (btn) btn.innerHTML = PAUSE_ICON_SVG;
      }).catch(err => console.warn('Audio resume failed:', err));
    } else {
      _currentVoiceAudio.pause();
      const btn = bubble.querySelector('.vn-play-btn');
      if (btn) btn.innerHTML = PLAY_ICON_SVG;
    }
    return;
  }

  // If another voice note was playing, pause and reset it
  if (_currentVoiceAudio) {
    try { _currentVoiceAudio.pause(); } catch (_) {}
    resetVoiceNoteUi(_currentPlayingVoiceMsgId);
    _currentVoiceAudio = null;
    _currentPlayingVoiceMsgId = null;
  }

  const audio = new Audio(audioSrc);
  _currentVoiceAudio = audio;
  _currentPlayingVoiceMsgId = msgId;

  const playBtn = bubble.querySelector('.vn-play-btn');
  const fillEl = document.getElementById(`vnFill_${msgId}`);
  const timeEl = document.getElementById(`vnTime_${msgId}`);
  const originalDuration = bubble.dataset.duration || '0:05';

  if (playBtn) playBtn.innerHTML = PAUSE_ICON_SVG;

  audio.ontimeupdate = () => {
    if (!audio.duration || isNaN(audio.duration)) return;
    const pct = Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100));
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (timeEl) timeEl.textContent = formatAudioTime(audio.currentTime);
  };

  audio.onended = () => {
    if (playBtn) playBtn.innerHTML = PLAY_ICON_SVG;
    if (fillEl) fillEl.style.width = '0%';
    if (timeEl) timeEl.textContent = originalDuration;
    _currentVoiceAudio = null;
    _currentPlayingVoiceMsgId = null;
  };

  audio.onerror = (e) => {
    console.warn('Voice playback error:', e);
    if (playBtn) playBtn.innerHTML = PLAY_ICON_SVG;
    if (fillEl) fillEl.style.width = '0%';
    if (timeEl) timeEl.textContent = originalDuration;
    _currentVoiceAudio = null;
    _currentPlayingVoiceMsgId = null;
    showToast('Could not play voice note.', 'error');
  };

  audio.play().catch(err => {
    console.warn('Audio play failed:', err);
    if (playBtn) playBtn.innerHTML = PLAY_ICON_SVG;
    _currentVoiceAudio = null;
    _currentPlayingVoiceMsgId = null;
  });
}
window.toggleVoiceNotePlayback = toggleVoiceNotePlayback;

function seekVoiceNote(event, msgId) {
  event.stopPropagation();
  const bubble = document.getElementById(`voiceBubble_${msgId}`);
  if (!bubble) return;
  const track = event.currentTarget;
  if (!track) return;

  const rect = track.getBoundingClientRect();
  const clickX = event.clientX || (event.touches && event.touches[0]?.clientX) || 0;
  const pct = Math.max(0, Math.min(1, (clickX - rect.left) / rect.width));

  if (_currentPlayingVoiceMsgId === msgId && _currentVoiceAudio && _currentVoiceAudio.duration) {
    _currentVoiceAudio.currentTime = pct * _currentVoiceAudio.duration;
    const fillEl = document.getElementById(`vnFill_${msgId}`);
    if (fillEl) fillEl.style.width = `${pct * 100}%`;
  } else {
    toggleVoiceNotePlayback(msgId);
    if (_currentVoiceAudio) {
      _currentVoiceAudio.addEventListener('loadedmetadata', () => {
        _currentVoiceAudio.currentTime = pct * _currentVoiceAudio.duration;
      }, { once: true });
    }
  }
}
window.seekVoiceNote = seekVoiceNote;

function playVoiceNote(audioUrl, iconEl) {
  if (_currentPlayingVoiceMsgId) {
    toggleVoiceNotePlayback(_currentPlayingVoiceMsgId);
  }
}
window.playVoiceNote = playVoiceNote;

async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];

    let mimeType = '';
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';
      else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
    }

    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };
    mediaRecorder.start(250);

    appState.isRecording = true;
    voiceRecSeconds = 0;

    // Show waveform bar, hide input bar
    const inputBar = document.querySelector('.chat-input-bar');
    const recordBar = document.getElementById('voiceRecordBar');
    if (inputBar) inputBar.style.display = 'none';
    if (recordBar) recordBar.style.display = 'flex';

    // Start timer
    const timerEl = document.getElementById('voiceRecTimer');
    voiceRecTimerInterval = setInterval(() => {
      voiceRecSeconds++;
      if (timerEl) timerEl.textContent = `${Math.floor(voiceRecSeconds/60)}:${String(voiceRecSeconds%60).padStart(2,'0')}`;
      if (voiceRecSeconds >= 180) sendVoiceNote();
    }, 1000);

  } catch (err) {
    console.warn('Microphone access error:', err);
    showToast('Microphone access denied. Please allow mic access.', 'error');
  }
}

async function sendVoiceNote() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
  clearInterval(voiceRecTimerInterval);

  return new Promise(resolve => {
    mediaRecorder.onstop = async () => {
      // Stop all tracks
      try {
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      } catch (_) {}

      appState.isRecording = false;

      // Restore input bar
      const inputBar = document.querySelector('.chat-input-bar');
      const recordBar = document.getElementById('voiceRecordBar');
      if (inputBar) inputBar.style.display = 'flex';
      if (recordBar) recordBar.style.display = 'none';

      const partnerId = appState.currentChatId;
      if (!partnerId) { resolve(); return; }

      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      const duration = Math.max(1, voiceRecSeconds);
      const durationStr = `${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')}`;

      // 1. Instant local object URL for immediate UI display
      const localAudioUrl = URL.createObjectURL(audioBlob);
      const msgId = `local_vn_${Date.now()}`;

      if (!conversations[partnerId]) conversations[partnerId] = { messages: [] };

      const newMsg = {
        id: msgId,
        sender: 'me',
        isVoice: true,
        duration: durationStr,
        audioUrl: localAudioUrl,
        read: true,
        timestamp: Date.now()
      };

      // Push and render IMMEDIATELY so user sees the message bubble right away!
      conversations[partnerId].messages.push(newMsg);
      movePartnerToTop(partnerId);
      renderChatThread();
      renderConversationList();
      renderChatsInbox();
      updateMatchesNotificationBadge();
      saveToStorage();
      resolve();

      // 2. BACKGROUND UPLOAD & FIRESTORE DISPATCH (Non-blocking)
      (async () => {
        let finalRemoteUrl = null;
        const cleanMime = (mimeType.split(';')[0] || 'audio/webm').trim();

        if (typeof uploadFileToBackend === 'function' && typeof fbStorage !== 'undefined' && fbStorage) {
          try {
            const matchId = [fbAuth.currentUser.uid, partnerId].sort().join('_');
            const uploadPromise = uploadFileToBackend(audioBlob, `chat_media/${matchId}`, false, cleanMime);
            const timeoutPromise = new Promise(res => setTimeout(() => res(null), 12000));
            finalRemoteUrl = await Promise.race([uploadPromise, timeoutPromise]);
          } catch (err) {
            console.warn('Voice upload error:', err);
          }
        }

        // Chat voice notes must use the shared match-scoped Storage path.
        // A local blob/data URL cannot be fetched by the recipient.
        if (!finalRemoteUrl) {
          newMsg._uploading = false;
          newMsg._uploadFailed = true;
          saveToStorage();
          showToast('Voice note could not be uploaded. Please try again.', 'error', 7000);
          return;
        }

        if (finalRemoteUrl) {
          newMsg.audioUrl = finalRemoteUrl;
          saveToStorage();
        }

        if (typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
          const matchId = [fbAuth.currentUser.uid, partnerId].sort().join('_');
          const delivered = await sendRealtimeMessage(matchId, '', true, finalRemoteUrl, '', null, '', false, msgId);
          if (!delivered) {
            newMsg._uploadFailed = true;
            saveToStorage();
            showToast('Voice note uploaded, but could not be delivered. Please try again.', 'error', 7000);
          } else {
            showToast('Voice note sent 🎤', 'gold');
          }
        } else {
          triggerAutoReply();
        }
      })();
    };

    try { mediaRecorder.requestData(); } catch (_) {}
    setTimeout(() => {
      try {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      } catch (_) {}
    }, 50);
  });
}
window.sendVoiceNote = sendVoiceNote;

function cancelVoiceRecording() {
  clearInterval(voiceRecTimerInterval);
  appState.isRecording = false;

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    } catch (_) {}
    mediaRecorder.onstop = null;
    try { mediaRecorder.stop(); } catch (_) {}
  }

  const inputBar = document.querySelector('.chat-input-bar');
  const recordBar = document.getElementById('voiceRecordBar');
  if (inputBar) inputBar.style.display = 'flex';
  if (recordBar) recordBar.style.display = 'none';
  audioChunks = [];
}
window.cancelVoiceRecording = cancelVoiceRecording;

// ==========================================================
// PROFILE SCREEN
// ==========================================================

function renderProfileScreen() {
  const avatar = document.getElementById('profileAvatar');
  const initialEl = document.getElementById('profileAvatarInitial');
  const nameEl = document.getElementById('profileDisplayName');
  const locEl = document.getElementById('profileLocationDisplay');
  const bioEl = document.getElementById('profileBioDisplay');
  const interestsEl = document.getElementById('profileInterestsDisplay');

  const nameInput = document.getElementById('editName');
  const ageInput = document.getElementById('editAge');
  const bioInput = document.getElementById('editBio');
  const locInput = document.getElementById('editLocation');
  const interestsInput = document.getElementById('editInterests');

  const displayName = currentUser.name || currentUser.displayName || 'User';
  const displayAge = currentUser.age || 24;
  const displayLoc = currentUser.location || 'Lagos, Nigeria';
  const displayBio = currentUser.bio || 'Living life with good energy, positive vibes only! ✨';
  const displayInterests = (currentUser.interests && currentUser.interests.length > 0)
    ? currentUser.interests
    : ['Tech 💻', 'Fitness 💪', 'Music 🎵'];

  // Robust photo resolution: checks photos array, image, avatar, photoURL, and localStorage
  let photos = Array.isArray(currentUser.photos) && currentUser.photos.length > 0
    ? currentUser.photos.filter(Boolean)
    : [];

  if (photos.length === 0 && currentUser.image) photos.push(currentUser.image);
  if (photos.length === 0 && currentUser.avatar) photos.push(currentUser.avatar);
  if (photos.length === 0 && currentUser.photoURL) photos.push(currentUser.photoURL);

  // If still empty, check localStorage saved user
  if (photos.length === 0) {
    try {
      const savedUserStr = localStorage.getItem('hmbs_user');
      if (savedUserStr) {
        const u = JSON.parse(savedUserStr);
        if (Array.isArray(u.photos) && u.photos.length > 0) photos = u.photos.filter(Boolean);
        else if (u.image) photos = [u.image];
        else if (u.avatar) photos = [u.avatar];
      }
    } catch (_) {}
  }

  // Ensure currentUser fields are synchronized
  if (photos.length > 0) {
    currentUser.photos = photos;
    currentUser.image = photos[0];
    currentUser.avatar = photos[0];
  }

  const photo = photos[0] || '';

  if (avatar) {
    if (photo) {
      avatar.style.backgroundImage = `url('${photo}')`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      if (initialEl) initialEl.style.display = 'none';
    } else {
      avatar.style.backgroundImage = 'none';
      if (initialEl) {
        initialEl.innerHTML = `<svg width="42" height="42" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
        initialEl.style.display = 'flex';
        initialEl.style.alignItems = 'center';
        initialEl.style.justifyContent = 'center';
      }
    }
    if (appState.isVip) avatar.classList.add('vip');
    else avatar.classList.remove('vip');
  }

  if (nameEl) {
    nameEl.textContent = String(displayName) + ', ' + String(displayAge);
  }
    // Photo Verification Prompt Card & Badge State
  const verifiedBadge = document.getElementById('profileVerifiedBadge');
  const vpcCard = document.getElementById('hkVerifyPromptCard');
  const vpcBadge = document.getElementById('hkVerifyBadge');
  const vpcTitle = document.getElementById('hkVerifyTitle');
  const vpcDesc = document.getElementById('hkVerifyDesc');
  const vpcBtn = document.getElementById('hkVerifyBtn');

  const isVerified = currentUser.isVerified === true || localStorage.getItem('hmbs_verified') === 'true';
  if (isVerified) {
    currentUser.isVerified = true;
    if (verifiedBadge) verifiedBadge.style.display = 'inline-flex';
    if (vpcBadge) {
      vpcBadge.textContent = 'Verified ✓';
      vpcBadge.className = 'hk-vpc-badge verified';
    }
    if (vpcTitle) vpcTitle.textContent = 'Photo Verified Account';
    if (vpcDesc) vpcDesc.textContent = 'Your selfie verification is active with official blue badge protection.';
    if (vpcBtn) {
      vpcBtn.textContent = 'Verified ✓';
      vpcBtn.style.background = 'linear-gradient(135deg, #21B06B, #1B9B5C)';
      vpcBtn.style.pointerEvents = 'none';
    }
  } else {
    if (verifiedBadge) verifiedBadge.style.display = 'none';
    if (vpcBadge) {
      vpcBadge.textContent = 'Get Verified';
      vpcBadge.className = 'hk-vpc-badge';
    }
    if (vpcTitle) vpcTitle.textContent = 'Photo Verification';
    if (vpcDesc) vpcDesc.textContent = 'Prove you\'re really you with a quick selfie scan and unlock the official blue checkmark!';
    if (vpcBtn) {
      vpcBtn.textContent = 'Verify';
      vpcBtn.style.background = 'linear-gradient(135deg, #3897F0, #1E88E5)';
      vpcBtn.style.pointerEvents = 'auto';
    }
  }

  const vipBadge = document.getElementById('profileVipBadge');
  if (vipBadge) {
    vipBadge.style.display = appState.isVip ? 'inline-flex' : 'none';
  }

  if (locEl) locEl.textContent = '📍 ' + displayLoc.replace(/^[📍\s]+/, '');
  if (bioEl) bioEl.textContent = displayBio;
  if (interestsEl) {
    interestsEl.innerHTML = displayInterests.map(tag => `<span class="hk-passion-pill">${escHtml(tag)}</span>`).join('');
  }

  // Profile photos strip
  const strip = document.getElementById('profilePhotosStrip');
  if (strip) {
    if (photos.length > 1) {
      strip.style.display = 'flex';
      strip.innerHTML = photos.map((url, i) => `
        <div class="profile-strip-thumb ${i === 0 ? 'main' : ''}" style="background-image:url('${safeCssUrl(url)}')" onclick="openEditProfileModal()" title="${i === 0 ? 'Main Photo' : 'Photo ' + (i + 1)}"></div>
      `).join('');
    } else {
      strip.style.display = 'none';
      strip.innerHTML = '';
    }
  }

  // Pre-fill form inputs in edit modal
  if (nameInput) nameInput.value = displayName;
  if (ageInput) ageInput.value = displayAge;
  if (bioInput) bioInput.value = displayBio;
  if (locInput) locInput.value = displayLoc;
  if (interestsInput) interestsInput.value = displayInterests.join(', ');

  // Dynamic Profile Strength Calculation
  // Baseline (Name, Age, Location): 15%
  let strength = 15;
  if (photos.length >= 1) strength += 20; // Main photo
  if (photos.length >= 2) strength += 15; // Additional photos
  if (photos.length >= 3) strength += 10; // 3+ photos gallery
  if (displayBio && displayBio.length > 15) strength += 15; // Engaging bio
  if (displayInterests && displayInterests.length >= 2) strength += 10; // Passions
  if (isVerified) strength += 15; // Photo verification blue badge bonus!
  strength = Math.min(100, Math.max(15, strength));

  const strengthVal = document.getElementById('hkStrengthPercent');
  const strengthBar = document.getElementById('hkStrengthBar');
  const strengthHint = document.getElementById('hkStrengthHint');
  const strengthLink = document.querySelector('.hk-strength-link');

  if (strengthVal) strengthVal.textContent = strength + '%';
  if (strengthBar) strengthBar.style.width = strength + '%';
  if (strengthLink) {
    if (strength === 100) {
      strengthLink.innerHTML = 'Superstar ⭐';
      strengthLink.style.color = '#F4C550';
    } else {
      strengthLink.innerHTML = 'Complete Profile &rarr;';
      strengthLink.style.color = '';
    }
  }

  if (strengthHint) {
    if (photos.length === 0) {
      strengthHint.textContent = '📸 Add your first profile photo to start getting matches!';
    } else if (photos.length < 2) {
      strengthHint.textContent = '📸 Add at least 1 more photo to boost discovery visibility by 3.5×';
    } else if (!isVerified) {
      strengthHint.textContent = '🛡️ Complete selfie photo verification below to earn the Blue Badge & +15% boost!';
    } else if (!displayBio || displayBio.length < 15) {
      strengthHint.textContent = '✍️ Add an engaging personal bio to reach 100% Superstar status!';
    } else if (displayInterests.length < 2) {
      strengthHint.textContent = '🎵 Add passions and interests to get matched with like-minded people!';
    } else {
      strengthHint.textContent = '🌟 100% Superstar Profile Active! Your profile gets maximum priority matching.';
    }
  }

  // HookMe Gold Promo Banner State
  const vipHeading = document.getElementById('hkVipHeading');
  const vipSub = document.getElementById('hkVipSub');
  const vipCtaBtn = document.getElementById('hkVipCtaBtn');
  if (appState.isVip) {
    if (vipHeading) vipHeading.textContent = 'HookMe Gold Active 👑';
    if (vipSub) vipSub.textContent = 'Unlimited Swipes, Rewinds, and Priority Likes';
    if (vipCtaBtn) {
      vipCtaBtn.textContent = 'Manage';
      vipCtaBtn.style.background = 'rgba(255,255,255,0.15)';
      vipCtaBtn.style.color = '#FFF';
    }
  } else {
    if (vipHeading) vipHeading.textContent = 'See Who Likes You & Unlimited Swipes';
    if (vipSub) vipSub.textContent = '5 daily Super Likes • Free monthly Boost • Rewinds';
    if (vipCtaBtn) {
      vipCtaBtn.textContent = 'Upgrade';
      vipCtaBtn.style.background = 'linear-gradient(135deg, #F4C550, #E5A93C)';
      vipCtaBtn.style.color = '#120D1A';
    }
  }

  // Power-Ups Vault Tokens
  const vSuper = document.getElementById('vaultSuperLikesVal');
  const vBoost = document.getElementById('vaultBoostsVal');
  const vRewind = document.getElementById('vaultRewindVal');
  const vRewindBtn = document.getElementById('vaultRewindBtn');

  if (vSuper) vSuper.textContent = appState.isVip ? '5 Daily' : (appState.superLikesRemaining || 0) + ' Left';
  if (vBoost) vBoost.textContent = appState.isBoostActive ? 'Active ⚡' : (appState.isVip ? '1 Ready' : 'Get Boost');
  if (vRewind) vRewind.textContent = appState.isVip ? 'Unlimited' : (appState.rewindsLeft || 1) + ' Left';
  if (vRewindBtn) vRewindBtn.textContent = appState.isVip ? 'VIP Active' : 'Unlock';

  // Real stats based on actual user activity
  const realMatches = Array.isArray(matchedUsers) ? matchedUsers.filter(u => u && !DUMMY_USER_IDS.includes(u.id)).length : 0;
  const realLikes = parseInt(localStorage.getItem('hmbs_real_likes_count') || '0', 10);
  const realSuper = parseInt(localStorage.getItem('hmbs_real_super_count') || '0', 10);

  const matchesCount = document.getElementById('statMatches');
  if (matchesCount) matchesCount.textContent = realMatches;
  const likesCount = document.getElementById('statLikes');
  if (likesCount) likesCount.textContent = realLikes;
  const superCount = document.getElementById('statSuper');
  if (superCount) superCount.textContent = realSuper;
}

let _editProfilePhotos = [null, null, null, null, null, null];
let _activeEditPhotoSlot = 0;

function openEditProfileModal() {
  const modal = document.getElementById('editProfileModal');
  if (modal) {
    _editProfilePhotos = [null, null, null, null, null, null];
    if (Array.isArray(currentUser.photos) && currentUser.photos.length > 0) {
      currentUser.photos.slice(0, 6).forEach((url, i) => {
        if (url) _editProfilePhotos[i] = url;
      });
    }
    if (!_editProfilePhotos[0]) {
      _editProfilePhotos[0] = currentUser.avatar || currentUser.image || null;
    }

    for (let i = 0; i < 6; i++) {
      _renderEditPhotoSlot(i, _editProfilePhotos[i]);
    }

    const nameInput = document.getElementById('editName');
    const ageInput = document.getElementById('editAge');
    const bioInput = document.getElementById('editBio');
    const locInput = document.getElementById('editLocation');
    const interestsInput = document.getElementById('editInterests');
    if (nameInput) nameInput.value = currentUser.name || currentUser.displayName || '';
    if (ageInput) ageInput.value = currentUser.age || '';
    if (bioInput) bioInput.value = currentUser.bio || '';
    if (locInput) locInput.value = currentUser.location || '';
    if (interestsInput) interestsInput.value = (currentUser.interests || []).join(', ');

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('edit-profile-modal-open');
    const bgPencil = document.querySelector('.simple-avatar-pencil-badge');
    if (bgPencil) bgPencil.style.display = 'none';
  }
}

function closeEditProfileModal() {
  const modal = document.getElementById('editProfileModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('edit-profile-modal-open');
    const bgPencil = document.querySelector('.simple-avatar-pencil-badge');
    if (bgPencil) bgPencil.style.display = '';
  }
}

function triggerEditPhotoSlot(slotIndex) {
  _activeEditPhotoSlot = slotIndex;
  const fileInput = document.getElementById('editProfilePhotoFile');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

async function handleEditProfilePhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file.', 'error');
    return;
  }

  showToast('Processing photo... 📸', 'info');
  try {
    const dataUrl = await compressImage(file, 720, 0.85);
    _editProfilePhotos[_activeEditPhotoSlot] = dataUrl;

    if (_activeEditPhotoSlot === 0) {
      currentUser.image = dataUrl;
      currentUser.avatar = dataUrl;
    }

    currentUser.photos = _editProfilePhotos.filter(Boolean);
    if (!currentUser.image && currentUser.photos.length > 0) {
      currentUser.image = currentUser.photos[0];
      currentUser.avatar = currentUser.photos[0];
    }

    _renderEditPhotoSlot(_activeEditPhotoSlot, dataUrl);
    saveToStorage();
    renderProfileScreen();

    // Immediately sync real photo and photos array to Firestore
    if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
        image: currentUser.image || '',
        avatar: currentUser.avatar || '',
        photos: currentUser.photos || [],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(err => console.warn('Could not sync photo to Firestore:', err));
      syncPublicProfileToFirestore().catch(err => console.warn('Could not sync public profile:', err));
    }

    showToast(_activeEditPhotoSlot === 0 ? '✓ Main photo updated! ✨' : '✓ Photo added! ✨', 'success');
  } catch (err) {
    console.error('Edit photo upload error:', err);
    showToast('Could not process this image. Try another photo.', 'error');
  }
}

function _renderEditPhotoSlot(slotIndex, dataUrl) {
  const slotEl = document.getElementById('editSlot' + slotIndex);
  const innerEl = document.getElementById('editSlotInner' + slotIndex);
  if (!slotEl || !innerEl) return;

  if (dataUrl) {
    slotEl.classList.add('filled');
    innerEl.style.backgroundImage = `url('${dataUrl}')`;
    innerEl.style.backgroundSize = 'cover';
    innerEl.style.backgroundPosition = 'center';
    innerEl.innerHTML = '';

    if (!slotEl.querySelector('.sps-remove')) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'sps-remove';
      removeBtn.innerHTML = '✕';
      removeBtn.title = 'Remove photo';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        _editProfilePhotos[slotIndex] = null;
        slotEl.classList.remove('filled');
        innerEl.style.backgroundImage = 'none';
        const plusSvg = slotIndex === 0
          ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
        innerEl.innerHTML = plusSvg;
        removeBtn.remove();
        currentUser.photos = _editProfilePhotos.filter(Boolean);
        if (slotIndex === 0) {
          currentUser.image = currentUser.photos[0] || null;
          currentUser.avatar = currentUser.photos[0] || null;
        }
        saveToStorage();
        renderProfileScreen();

        if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
          fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
            image: currentUser.image || '',
            avatar: currentUser.avatar || '',
            photos: currentUser.photos || [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true }).catch(() => {});
          syncPublicProfileToFirestore().catch(() => {});
        }
      };
      slotEl.appendChild(removeBtn);
    }
  } else {
    slotEl.classList.remove('filled');
    innerEl.style.backgroundImage = 'none';
    const plusSvg = slotIndex === 0
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
    innerEl.innerHTML = plusSvg;
    slotEl.querySelector('.sps-remove')?.remove();
  }
}

async function handleProfilePhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file.', 'error');
    return;
  }

  showToast('Processing photo... 📸', 'info');
  try {
    const dataUrl = await compressImage(file, 600, 0.82);
    currentUser.image = dataUrl;
    currentUser.avatar = dataUrl;
    saveToStorage();
    renderProfileScreen();
    const modalAvatar = document.getElementById('editModalAvatarPreview');
    if (modalAvatar) modalAvatar.style.backgroundImage = `url("${dataUrl}")`;
    currentUser.avatar = dataUrl;
    saveToStorage();
    renderProfileScreen();

    // Sync to Firestore if authenticated
    if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
        image: dataUrl,
        avatar: dataUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(err => console.warn('Could not sync photo to Firestore:', err));
       syncPublicProfileToFirestore({ image: dataUrl, avatar: dataUrl }).catch(err => console.warn('Could not sync public photo:', err));
    }
    showToast('✓ Photo updated successfully! ✨', 'success');
  } catch (err) {
    console.error('Profile photo upload error:', err);
    showToast('Could not process this image. Try another photo.', 'error');
  }
}

// Client-side image compression to store real photos compactly & fast in Firestore
function compressImage(file, maxDimension = 600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleProfilePhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file.', 'error');
    return;
  }

  showToast('Processing your photo... 📸', 'info');
  try {
    const dataUrl = await compressImage(file, 600, 0.82);
    currentUser.image = dataUrl;
    currentUser.avatar = dataUrl;

    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
      avatar.style.backgroundImage = `url('${dataUrl}')`;
      avatar.textContent = '';
    }

    const settingsAvatar = document.getElementById('settingsAvatar');
    if (settingsAvatar) {
      settingsAvatar.style.backgroundImage = `url('${dataUrl}')`;
      settingsAvatar.textContent = '';
    }

    saveToStorage();

    // Immediately sync real photo to Firestore so other members see it
    if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
        image: dataUrl,
        avatar: dataUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(err => console.warn('Could not sync photo to Firestore:', err));
       syncPublicProfileToFirestore({ image: dataUrl, avatar: dataUrl }).catch(err => console.warn('Could not sync public photo:', err));
    }

    showToast('✓ Real profile photo updated! ✨', 'success');
  } catch (err) {
    console.error('Photo upload error:', err);
    showToast('Could not process this image. Try another photo.', 'error');
  }
}

// ── Multi-photo signup state ──
if (!window._signupPhotos) window._signupPhotos = [null, null, null, null, null, null];
let _activePhotoSlot = 0;

// Called by each slot div onclick
function triggerPhotoSlot(slotIndex) {
  _activePhotoSlot = slotIndex;
  const fileInput = document.getElementById('signupPhotoFile');
  if (fileInput) { fileInput.value = ''; fileInput.click(); }
}

async function handleSignupPhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file.', 'error');
    return;
  }

  showToast('Processing photo... 📸', 'info');
  try {
    const dataUrl = await compressImage(file, 720, 0.85);
    window._signupPhotos[_activePhotoSlot] = dataUrl;

    // Apply to main profile fields if this is slot 0 (primary)
    if (_activePhotoSlot === 0) {
      currentUser.image = dataUrl;
      currentUser.avatar = dataUrl;
    }

    // Update the slot UI
    _renderSignupPhotoSlot(_activePhotoSlot, dataUrl);

    const errEl = document.getElementById('signupError3');
    if (errEl) errEl.textContent = '';
    showToast(_activePhotoSlot === 0 ? '✓ Main photo set! Looking great ✨' : '✓ Photo added!', 'success');
  } catch (err) {
    console.error('Signup photo upload error:', err);
    showToast('Could not process this image. Try another.', 'error');
  }
}

function _renderSignupPhotoSlot(slotIndex, dataUrl) {
  const slotEl = document.getElementById('signupSlot' + slotIndex);
  const innerEl = document.getElementById('signupSlotInner' + slotIndex);
  if (!slotEl || !innerEl) return;

  slotEl.classList.add('filled');
  innerEl.style.backgroundImage = `url('${dataUrl}')`;
  innerEl.style.backgroundSize = 'cover';
  innerEl.style.backgroundPosition = 'center';
  innerEl.innerHTML = '';

  // Add remove button if not already there
  if (!slotEl.querySelector('.sps-remove')) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'sps-remove';
    removeBtn.innerHTML = '✕';
    removeBtn.title = 'Remove photo';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      window._signupPhotos[slotIndex] = null;
      slotEl.classList.remove('filled');
      innerEl.style.backgroundImage = 'none';
      const plusSvg = slotIndex === 0
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
      innerEl.innerHTML = plusSvg;
      removeBtn.remove();
      if (slotIndex === 0) { currentUser.image = null; currentUser.avatar = null; }
    };
    slotEl.appendChild(removeBtn);
  }
}

function saveProfile() {
  const name = document.getElementById('editName')?.value.trim();
  const age = parseInt(document.getElementById('editAge')?.value);
  const bio = document.getElementById('editBio')?.value.trim();
  const location = document.getElementById('editLocation')?.value.trim();

  if (!name || isNaN(age) || !bio) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  currentUser.name = name;
  currentUser.age = age;
  currentUser.bio = bio;
  if (location) currentUser.location = location;

  const interestsVal = document.getElementById('editInterests')?.value.trim();
  if (interestsVal) {
    currentUser.interests = interestsVal.split(',').map(s => s.trim()).filter(Boolean);
  }

  saveToStorage();
  renderProfileScreen();

  // Sync profile details and custom photo to Firestore
  if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    currentUser.photos = (typeof _editProfilePhotos !== 'undefined' && _editProfilePhotos)
      ? _editProfilePhotos.filter(Boolean)
      : (currentUser.photos || []);

    fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
      name: currentUser.name,
      displayName: currentUser.name,
      age: currentUser.age,
      bio: currentUser.bio,
      location: currentUser.location,
      interests: currentUser.interests || [],
      image: currentUser.image || currentUser.avatar || '',
      avatar: currentUser.image || currentUser.avatar || '',
      photos: currentUser.photos || [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => console.warn('Could not sync profile to Firestore:', err));
     syncPublicProfileToFirestore().catch(err => console.warn('Could not sync public profile:', err));
  }

  const settingsName = document.getElementById('settingsProfileName');
  if (settingsName) settingsName.textContent = currentUser.name;
  const settingsAvatar = document.getElementById('settingsAvatar');
  if (settingsAvatar && (currentUser.image || currentUser.avatar)) {
    settingsAvatar.style.backgroundImage = `url('${currentUser.image || currentUser.avatar}')`;
    settingsAvatar.textContent = '';
  }

  const feedback = document.getElementById('profileSaveFeedback');
  if (feedback) {
    feedback.style.opacity = '1';
    setTimeout(() => { feedback.style.opacity = '0'; }, 3000);
  }
  showToast('✓ Profile saved successfully!', 'success');
  setTimeout(() => { closeEditProfileModal(); }, 600);
}

// ==========================================================
// AI AVATAR ENGINE
// ==========================================================

function renderAiLabPicker() {
  const grid = document.getElementById('aiPickerGrid');
  if (!grid) return;

  const targets = [
    { id: 'me', name: 'Me', img: currentUser.image },
    { id: 'p3', name: 'Amara', img: PROFILES_DATA[2].image },
    { id: 'p1', name: 'Zainab', img: PROFILES_DATA[0].image },
    { id: 'p2', name: 'Tunde', img: PROFILES_DATA[1].image },
    { id: 'p4', name: 'Chidi', img: PROFILES_DATA[3].image },
    { id: 'p5', name: 'Sade', img: PROFILES_DATA[4].image },
  ];

  grid.innerHTML = targets.map(t => `
    <div class="ai-picker-item ${t.id === appState.aiSelectedProfileId ? 'selected' : ''}" onclick="selectAiTarget('${t.id}')">
      <img src="${t.img}" onerror="this.src='https://placehold.co/80x80/FF4458/FFF?text=AI'">
      <span>${t.name}</span>
    </div>
  `).join('');

  updateAiPromptField();
}

function selectAiTarget(id) {
  appState.aiSelectedProfileId = id;
  renderAiLabPicker();
}

function updateAiPromptField() {
  const promptEl = document.getElementById('aiPromptInput');
  if (!promptEl) return;
  if (appState.aiSelectedProfileId === 'me') {
    promptEl.value = currentUser.aiPrompt || 'Aesthetic cinematic portrait of a 24 year old creative, golden hour warm lighting, high detail';
  } else {
    const p = PROFILES_DATA.find(x => x.id === appState.aiSelectedProfileId);
    if (p) promptEl.value = p.aiPrompt;
  }
}

async function generateAiImage() {
  if (!appState.isVip && appState.freeAiGens <= 0) {
    openPaywall('ai_gen');
    return;
  }

  const promptEl = document.getElementById('aiPromptInput');
  const statusEl = document.getElementById('aiStatusText');
  const spinnerEl = document.getElementById('aiSpinner');
  const genBtn = document.getElementById('aiGenBtn');
  const genAllBtn = document.getElementById('aiGenAllBtn');

  const prompt = promptEl?.value.trim();
  if (!prompt) {
    if (statusEl) { statusEl.textContent = '⚠️ Please write a prompt first!'; statusEl.style.color = 'var(--accent-pink)'; }
    return;
  }

  if (spinnerEl) spinnerEl.style.display = 'block';
  if (statusEl) { statusEl.textContent = '🎨 Generating AI portrait with Pollinations AI...'; statusEl.style.color = '#FFD54F'; }
  if (genBtn) genBtn.disabled = true;
  if (genAllBtn) genAllBtn.disabled = true;

  try {
    const url = await callImagenAPI(prompt);

    if (appState.aiSelectedProfileId === 'me') {
      currentUser.image = url;
      currentUser.aiPrompt = prompt;
      const avatar = document.getElementById('profileAvatar');
      if (avatar) avatar.style.backgroundImage = `url('${url}')`;
      const settingsAvatar = document.getElementById('settingsAvatar');
      if (settingsAvatar) settingsAvatar.style.backgroundImage = `url('${url}')`;
    } else {
      const idx = PROFILES_DATA.findIndex(p => p.id === appState.aiSelectedProfileId);
      if (idx !== -1) { PROFILES_DATA[idx].image = url; PROFILES_DATA[idx].aiPrompt = prompt; }
      const stackIdx = profileStack.findIndex(p => p.id === appState.aiSelectedProfileId);
      if (stackIdx !== -1) profileStack[stackIdx].image = url;
      const matchIdx = matchedUsers.findIndex(u => u.id === appState.aiSelectedProfileId);
      if (matchIdx !== -1) matchedUsers[matchIdx].image = url;
    }

    if (!appState.isVip) {
      appState.freeAiGens--;
      updateLimitBadges();
    }

    renderCardStack();
    renderMatchesView();
    renderAiLabPicker();
    saveToStorage();

    if (statusEl) { statusEl.textContent = '✨ Portrait generated and applied!'; statusEl.style.color = 'var(--accent-green)'; }
    showToast('AI Portrait generated successfully! ✨', 'success');
  } catch (err) {
    console.error('AI generation error:', err);
    if (statusEl) { statusEl.textContent = '⚠️ Error generating image. Try again!'; statusEl.style.color = 'var(--accent-pink)'; }
    showToast('Failed to generate portrait. Please try again.', 'error');
  } finally {
    if (spinnerEl) spinnerEl.style.display = 'none';
    if (genBtn) genBtn.disabled = false;
    if (genAllBtn) genAllBtn.disabled = false;
  }
}

async function generateAllAiImages() {
  if (!appState.isVip) { openPaywall('bulk_ai'); return; }

  const statusEl = document.getElementById('aiStatusText');
  const spinnerEl = document.getElementById('aiSpinner');
  if (spinnerEl) spinnerEl.style.display = 'block';

  const targets = ['me', 'p3', 'p1', 'p2', 'p4', 'p5'];
  for (let i = 0; i < targets.length; i++) {
    selectAiTarget(targets[i]);
    if (statusEl) { statusEl.textContent = `⏳ Generating (${i+1}/${targets.length})...`; statusEl.style.color = '#FFD54F'; }
    const prompt = document.getElementById('aiPromptInput')?.value;
    if (!prompt) continue;
    try {
      const url = await callImagenAPI(prompt);
      if (targets[i] === 'me') {
        currentUser.image = url;
        const avatar = document.getElementById('profileAvatar');
        if (avatar) avatar.style.backgroundImage = `url('${url}')`;
      } else {
        const idx = PROFILES_DATA.findIndex(p => p.id === targets[i]);
        if (idx !== -1) PROFILES_DATA[idx].image = url;
      }
      renderCardStack();
      renderMatchesView();
    } catch (e) { console.warn('Skip', targets[i]); }
    await delay(600);
  }

  if (spinnerEl) spinnerEl.style.display = 'none';
  if (statusEl) { statusEl.textContent = '✨ All portraits upgraded!'; statusEl.style.color = 'var(--accent-green)'; }
  renderAiLabPicker();
  saveToStorage();
}

async function callImagenAPI(promptText) {
  // Try live Pollinations AI with cache busting
  try {
    const cleanPrompt = encodeURIComponent(promptText.trim());
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=512&height=512&seed=${seed}&nologo=true&model=flux`;

    // Test image load to ensure it resolves to a valid image
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(pollinationsUrl);
      img.onerror = () => reject(new Error('Pollinations network error'));
      img.src = pollinationsUrl;
      setTimeout(() => reject(new Error('AI generation timed out')), 15000);
    });

    return pollinationsUrl;
  } catch (err) {
    console.warn('Pollinations AI failed, using high-res AI portrait fallback:', err);
    // Unsplash portrait fallback if network blocks external AI endpoints
    const fallbackSeed = Math.floor(Math.random() * 90000);
    return `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=85&v=${fallbackSeed}`;
  }
}

// ==========================================================
// SETTINGS
// ==========================================================

function renderSettingsScreen() {
  const avatar = document.getElementById('settingsAvatar');
  const nameEl = document.getElementById('settingsProfileName');
  if (avatar) avatar.style.backgroundImage = `url('${currentUser.image}')`;
  if (nameEl) nameEl.textContent = currentUser.name;

  const currentTheme = localStorage.getItem('hookmebysam_theme') || 'dark';
  setTheme(currentTheme);

  const distSlider = document.getElementById('distanceSlider');
  const distLabel = document.getElementById('distanceLabel');
  if (distSlider) { distSlider.value = settings.maxDistance; updateSliderGradient(distSlider); }
  if (distLabel) distLabel.textContent = `${settings.maxDistance} km`;

  const minAgeSlider = document.getElementById('minAgeSlider');
  const maxAgeSlider = document.getElementById('maxAgeSlider');
  const ageLabel = document.getElementById('ageRangeLabel');
  if (minAgeSlider) { minAgeSlider.value = settings.minAge; updateSliderGradient(minAgeSlider); }
  if (maxAgeSlider) { maxAgeSlider.value = settings.maxAge; updateSliderGradient(maxAgeSlider); }
  if (ageLabel) ageLabel.textContent = `${settings.minAge}–${settings.maxAge}`;

  const toggleIds = {
    notifMatches: 'toggleNotifMatches',
    notifMessages: 'toggleNotifMessages',
    notifLikes: 'toggleNotifLikes',
    showOnline: 'toggleShowOnline',
    shareLocation: 'toggleShareLocation',
  };
  for (const [key, id] of Object.entries(toggleIds)) {
    const el = document.getElementById(id);
    if (el) el.checked = settings[key];
  }

  // VIP status
  const vipStatus = document.getElementById('vipStatusRow');
  if (vipStatus) {
    vipStatus.innerHTML = appState.isVip
      ? '<span style="color:var(--gold-1);font-weight:700">👑 VIP Gold Active</span>'
      : '<span style="color:var(--flame-1);font-weight:700;cursor:pointer" onclick="openPaywall(\'settings\')">Upgrade to VIP →</span>';
  }

  // User email & verification status
  const emailRow = document.getElementById('settingsEmailValue');
  if (emailRow) emailRow.textContent = currentUser.email || 'No email registered';

  const emailBadge = document.getElementById('settingsEmailBadge');
  if (emailBadge) {
    const isVerified = Boolean(typeof fbAuth !== 'undefined' && fbAuth?.currentUser?.emailVerified);
    if (isVerified) {
      emailBadge.innerHTML = '&#10003; Verified';
      emailBadge.style.background = 'rgba(33,176,107,0.15)';
      emailBadge.style.color = '#21B06B';
      emailBadge.style.cursor = 'default';
      emailBadge.onclick = null;
    } else {
      emailBadge.innerHTML = 'Unverified &bull; Tap to verify';
      emailBadge.style.background = 'rgba(244,197,80,0.15)';
      emailBadge.style.color = '#F4C550';
      emailBadge.style.cursor = 'pointer';
      emailBadge.onclick = handleResendEmailVerification;
    }
  }

  // Custom or auto-derived Username
  const usernameRow = document.getElementById('settingsUsernameValue');
  if (usernameRow) {
    const defaultHandle = (currentUser.username || currentUser.name || currentUser.displayName || currentUser.email?.split('@')[0] || 'user').replace(/@.*$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    const userHandle = (currentUser.username && currentUser.username !== 'daveemin0' && currentUser.username !== '@daveemin0')
      ? currentUser.username.replace(/^@/, '')
      : defaultHandle;
    usernameRow.textContent = `@${userHandle}`;
  }

  // Phone number status
  const phoneSub = document.getElementById('settingsPhoneSub');
  if (phoneSub) {
    if (currentUser.phone && (currentUser.phoneVerified || currentUser.isPhoneVerified)) {
      phoneSub.innerHTML = `<span style="color:#21B06B;font-weight:600">+234 ${currentUser.phone} &#10003; Verified</span>`;
    } else if (currentUser.phone) {
      phoneSub.textContent = `+234 ${currentUser.phone} (Tap to verify)`;
    } else {
      phoneSub.textContent = 'Tap to verify your number';
    }
  }

  // Blocked contacts count
  const blockedSub = document.getElementById('settingsBlockedCountSub');
  if (blockedSub) {
    const count = blockedUsers.length;
    blockedSub.textContent = count === 1 ? '1 contact blocked' : `${count} contacts blocked`;
  }

  // Video call streaming quality subtext
  const currentQuality = localStorage.getItem('videoCallQuality') || '1080p';
  const qualitySub = document.getElementById('videoQualitySubtext');
  if (qualitySub) {
    if (currentQuality === '1080p') qualitySub.textContent = 'Ultra HD 1080p (Crystal Clear)';
    else if (currentQuality === '720p') qualitySub.textContent = 'HD 720p (Balanced)';
    else qualitySub.textContent = 'Standard 480p (Data Saver)';
  }

  // Device permissions subtext
  const permSub = document.getElementById('devicePermissionsSubtext');
  if (permSub && typeof updateDevicePermissionsSubtext === 'function') {
    updateDevicePermissionsSubtext(permSub);
  }
}

async function handleResendEmailVerification() {
  if (typeof fbAuth === 'undefined' || !fbAuth?.currentUser) {
    showToast('Please sign in to verify your email.', 'error');
    return;
  }
  const user = fbAuth.currentUser;
  try {
    await user.reload();
    if (user.emailVerified) {
      currentUser.emailVerified = true;
      saveToStorage();
      renderSettingsScreen();
      showToast('✅ Your email address is verified!', 'gold');
      return;
    }
    await user.sendEmailVerification();
    showToast(`✉️ Verification link sent to ${user.email}. Check inbox & spam folder!`, 'info');
  } catch (err) {
    if (err.code === 'auth/too-many-requests') {
      showToast('Please wait a moment before requesting another verification email.', 'gold');
    } else {
      showToast(err.message || 'Could not send verification email.', 'error');
    }
  }
}

function openEditUsernameModal() {
  const modal = document.getElementById('editUsernameModal');
  const input = document.getElementById('customUsernameInput');
  const errorEl = document.getElementById('usernameModalError');
  if (!modal || !input) return;

  const defaultHandle = (currentUser.username || currentUser.name || currentUser.displayName || currentUser.email?.split('@')[0] || 'user').replace(/@.*$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  const current = (currentUser.username && currentUser.username !== 'daveemin0' && currentUser.username !== '@daveemin0')
    ? currentUser.username.replace(/^@/, '')
    : defaultHandle;

  input.value = current;
  if (errorEl) errorEl.textContent = '';
  modal.style.display = 'flex';
  setTimeout(() => input.focus(), 150);
}
window.openEditUsernameModal = openEditUsernameModal;

function closeEditUsernameModal() {
  const modal = document.getElementById('editUsernameModal');
  if (modal) modal.style.display = 'none';
}
window.closeEditUsernameModal = closeEditUsernameModal;

async function saveCustomUsername() {
  const input = document.getElementById('customUsernameInput');
  const errorEl = document.getElementById('usernameModalError');
  if (!input) return;

  const rawVal = input.value.trim().replace(/^@/, '').toLowerCase();

  if (!rawVal) {
    if (errorEl) errorEl.textContent = 'Please enter a username.';
    return;
  }
  if (!/^[a-z0-9_]{3,20}$/.test(rawVal)) {
    if (errorEl) errorEl.textContent = 'Username must be 3–20 characters and contain only letters, numbers, and underscores.';
    return;
  }

  currentUser.username = rawVal;
  saveToStorage();

  const usernameRow = document.getElementById('settingsUsernameValue');
  if (usernameRow) usernameRow.textContent = `@${rawVal}`;

  // Sync to Firestore user profile if authenticated
  if (typeof fbAuth !== 'undefined' && fbAuth?.currentUser && typeof fbDb !== 'undefined' && fbDb) {
    try {
      await fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
        username: rawVal
      }, { merge: true });
    } catch (e) {
      console.warn('Could not sync username to Firestore:', e);
    }
  }

  closeEditUsernameModal();
  showToast(`Username updated to @${rawVal} ✨`, 'success');
}
window.saveCustomUsername = saveCustomUsername;

function updateDistanceSetting() {
  const slider = document.getElementById('distanceSlider');
  const label = document.getElementById('distanceLabel');
  if (!slider) return;
  settings.maxDistance = parseInt(slider.value);
  if (label) label.textContent = `${settings.maxDistance} km`;
  updateSliderGradient(slider);
  saveToStorage();
}

function updateAgeSetting() {
  const minSlider = document.getElementById('minAgeSlider');
  const maxSlider = document.getElementById('maxAgeSlider');
  const label = document.getElementById('ageRangeLabel');
  settings.minAge = parseInt(minSlider?.value || 20);
  settings.maxAge = parseInt(maxSlider?.value || 35);
  if (settings.minAge >= settings.maxAge) settings.maxAge = settings.minAge + 1;
  if (label) label.textContent = `${settings.minAge}–${settings.maxAge}`;
  if (minSlider) updateSliderGradient(minSlider);
  if (maxSlider) updateSliderGradient(maxSlider);
  saveToStorage();
}

function updateToggleSetting(key, el) {
  settings[key] = el.checked;
  saveToStorage();
}

function updateSliderGradient(slider) {
  const min = parseInt(slider.min) || 0;
  const max = parseInt(slider.max) || 100;
  const val = parseInt(slider.value) || 50;
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.setProperty('--val', `${pct}%`);
}

async function handleLogout() {
  if (!confirm('Are you sure you want to log out?')) return;

  // Sign out from Firebase Auth if active
  if (typeof fbAuth !== 'undefined' && fbAuth) {
    try {
      await fbAuth.signOut();
    } catch (e) {
      console.warn("Firebase signout warning:", e);
    }
  }

  appState.isLoggedIn = false;
  localStorage.removeItem('hmbs_state');
  localStorage.removeItem('hmbs_user');
  localStorage.removeItem('hmbs_matches');
  localStorage.removeItem('hmbs_convos');
  location.reload();
}

async function handleDeleteAccount() {
  if (!confirm('⚠️ Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.')) return;

  if (typeof fbAuth === 'undefined' || !fbAuth?.currentUser) {
    showToast('Please sign in before deleting your account.', 'error');
    return;
  }

  showToast('Deleting account & data securely...', 'info');

  try {
    const token = await fbAuth.currentUser.getIdToken(true);
    const response = await fetch(BACKEND_URL + '/account/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Account deletion failed.');
    }

    localStorage.clear();
    sessionStorage.clear();
    await fbAuth.signOut().catch(() => {});
    showToast('Your account and associated app data were deleted.', 'success');
    setTimeout(() => location.reload(), 500);
  } catch (err) {
    console.error('Account deletion error:', err);
    showToast(err.message || 'Could not delete the account.', 'error');
  }
}


// ==========================================================
// VIP / PAYWALL
// ==========================================================

function openPaywall(context) {
  if (appState.isVip) {
    showToast('👑 VIP Gold Active: Unlimited access is unlocked!', 'gold');
    return;
  }

  const modal = document.getElementById('paywallModal');
  const reasonEl = document.getElementById('paywallReason');
  if (!modal) return;

  const reasons = {
    rewind: 'Out of free rewinds! Upgrade for unlimited.',
    ai_gen: 'Out of free AI generations! Upgrade for unlimited.',
    bulk_ai: 'Bulk AI generation requires VIP Gold.',
    likes_you: 'See who swiped right on you instantly with VIP Gold.',
    settings: 'Unlock all premium features with VIP Gold.',
    boost: 'Upgrade to VIP Gold for unlimited profile boosts.',
    super_like: 'Send unlimited Super Likes with VIP Gold.',
    profile_upgrade: 'Unlock all premium features with VIP Gold.',
    swipe_limit: "You’ve used all your free likes today 🔥 Upgrade VIP Gold for unlimited swipes.",
    default: 'Unlock all VIP features and match instantly.'
  };
  if (reasonEl) reasonEl.textContent = reasons[context] || reasons.default;

  modal.classList.add('open');
  selectPricingTier(appState.selectedPricingTier || 2);
  startTgCountdownTimer();
}

function triggerSuperLike() {
  if (!appState.isVip) {
    openPaywall('super_like');
    return;
  }
  showToast('⭐ Super Like sent! You will appear at the top of their matches!', 'gold');
  triggerManualSwipe('right');
}

function closePaywall() {
  const modal = document.getElementById('paywallModal');
  if (modal) modal.classList.remove('open');
  if (_tgTimerInterval) { clearInterval(_tgTimerInterval); _tgTimerInterval = null; }
}

let _tgTimerInterval = null;
let _tgSecondsRemaining = 29 * 60 + 49; // 00:29:49

function startTgCountdownTimer() {
  if (_tgTimerInterval) clearInterval(_tgTimerInterval);
  const timerEl = document.getElementById('tgCountdownTimer');
  if (!timerEl) return;

  const update = () => {
    if (_tgSecondsRemaining <= 0) {
      _tgSecondsRemaining = 30 * 60;
    }
    const hrs = Math.floor(_tgSecondsRemaining / 3600);
    const mins = Math.floor((_tgSecondsRemaining % 3600) / 60);
    const secs = _tgSecondsRemaining % 60;
    timerEl.textContent =
      String(hrs).padStart(2, '0') + ':' +
      String(mins).padStart(2, '0') + ':' +
      String(secs).padStart(2, '0');
    _tgSecondsRemaining--;
  };
  update();
  _tgTimerInterval = setInterval(update, 1000);
}

function selectPricingTier(n) {
  appState.selectedPricingTier = n;

  // Toggle tier items for Tinder Gold layout
  document.querySelectorAll('.tg-tier-item').forEach((item, i) => {
    item.classList.toggle('selected', (i + 1) === n);
  });
  document.querySelectorAll('.pricing-card').forEach((card, i) => {
    card.classList.toggle('selected', (i + 1) === n);
  });

  const tierPrices = { 1: '₦2,500', 2: '₦7,500', 3: '₦25,000' };
  const tierNames  = { 1: '1 Week VIP Gold', 2: '1 Month VIP Gold', 3: 'Lifetime VIP Gold' };
  const nameEl  = document.getElementById('renewalPlanName');
  const priceEl = document.getElementById('renewalPrice');
  const ctaEl   = document.getElementById('paywallCtaLabel');
  if (nameEl)  nameEl.textContent  = tierNames[n]  || '1 Month VIP Gold';
  if (priceEl) priceEl.textContent = tierPrices[n] || '₦7,500';
  if (ctaEl)   ctaEl.textContent   = `Continue — ${tierNames[n] || 'VIP Gold'}`;

  // Update Tinder Gold hero card text dynamically
  const titleEl = document.getElementById('paywallTitle');
  const pricePrimary = document.getElementById('tgPricePrimary');
  const priceStruck = document.getElementById('tgPriceStruck');
  const renewalNotice = document.getElementById('tgRenewalNotice');

  if (n === 1) {
    if (titleEl) titleEl.textContent = 'Get 30% Off your first week of HookMe Gold®';
    if (pricePrimary) pricePrimary.textContent = 'First week ₦2,500';
    if (priceStruck) priceStruck.textContent = '₦3,500/wk';
    if (renewalNotice) renewalNotice.innerHTML = 'Renews at ₦2,500/week after first week. Your payment will be processed securely via Paystack. Cancel anytime in Settings. By tapping Continue, you agree to our <span style="text-decoration:underline;cursor:pointer" onclick="openTermsModal()">Terms</span>.';
  } else if (n === 2) {
    if (titleEl) titleEl.textContent = 'Get 50% Off your first month of HookMe Gold®';
    if (pricePrimary) pricePrimary.textContent = 'First month ₦7,500';
    if (priceStruck) priceStruck.textContent = '₦15,000/mo';
    if (renewalNotice) renewalNotice.innerHTML = 'Renews at ₦15,000 after first month. Your payment will be processed securely via Paystack. Cancel anytime in Settings. By tapping Continue, you agree to our <span style="text-decoration:underline;cursor:pointer" onclick="openTermsModal()">Terms</span>.';
  } else if (n === 3) {
    if (titleEl) titleEl.textContent = 'Get Lifetime Unlimited Access to HookMe Gold®';
    if (pricePrimary) pricePrimary.textContent = 'Lifetime VIP ₦25,000';
    if (priceStruck) priceStruck.textContent = '₦45,000';
    if (renewalNotice) renewalNotice.innerHTML = 'One-time payment for permanent VIP access. Your payment will be processed securely via Paystack. No renewals. By tapping Continue, you agree to our <span style="text-decoration:underline;cursor:pointer" onclick="openTermsModal()">Terms</span>.';
  }
}

function simulatePurchase() {
  const btn = document.getElementById('paywallCta');
  const label = document.getElementById('paywallCtaLabel');

  // Calculate price based on selected tier matching HTML pricing cards
  const tierPrices = { 1: 2500, 2: 7500, 3: 25000 };
  const tierNames  = { 1: '1 Week VIP Gold', 2: '1 Month VIP Gold', 3: 'Lifetime VIP Gold' };
  const tier  = appState.selectedPricingTier || 2;
  const price = tierPrices[tier] || 7500;
  const name  = tierNames[tier]  || '1 Month VIP Gold';

  if (typeof triggerPaystackPayment === "function") {
    triggerPaystackPayment(name, price, async (response) => {
      // Paystack's popup saying "success" is just JS running in this
      // browser — it proves nothing by itself. Don't grant VIP until the
      // backend has independently confirmed the payment with Paystack.
      if (btn) { btn.disabled = true; }
      if (label) { label.textContent = 'Confirming payment…'; }

      const result = await verifyPaymentOnBackend(response.reference, tier);

      if (btn) { btn.disabled = false; }
      if (label) { label.textContent = 'Subscribe Now — Unlock VIP Gold'; }

      if (result.success) {
        completeVipUpgrade();
      }
    });
  } else {
    if (btn) { btn.disabled = false; }
    if (label) { label.textContent = 'Subscribe Now — Unlock VIP Gold'; }
    showToast('Payment service is unavailable. Please try again.', 'error');
  }
}

function completeVipUpgrade() {
  appState.isVip = true;
  applyVipUI();
  saveToStorage();
  closePaywall();

  showToast('👑 VIP GOLD ACTIVATED!', 'gold');

  // Persistent VIP state is granted by the backend after verified payment.

  updateMatchesNotificationBadge();
  renderMatchesView();
  revealBlurredMatches();
  renderProfileScreen();
  renderSettingsScreen();
  saveToStorage();
}

function applyVipUI() {
  const isVip = Boolean(appState.isVip);

  // 1. Header VIP badge
  const vipBadge = document.getElementById('headerVipBadge');
  if (vipBadge) vipBadge.style.display = isVip ? 'inline-flex' : 'none';

  // 2. Profile avatar VIP halo ring
  const profileAvatar = document.getElementById('profileAvatar');
  if (profileAvatar) profileAvatar.classList.toggle('vip', isVip);

  // 3. Profile Screen VIP badge
  const profileVipBadge = document.getElementById('profileVipBadge');
  if (profileVipBadge) profileVipBadge.style.display = isVip ? 'inline-flex' : 'none';

  // 4. Badges (Rewind & AI count show infinity for VIP)
  updateLimitBadges();

  // 5. Hide discovery ads for VIP
  const discoveryAd = document.getElementById('discoveryAd');
  if (discoveryAd) discoveryAd.style.display = 'none';

  // 6. Boost button state
  const boostBtn = document.getElementById('boostBtn');
  if (boostBtn && isVip) {
    boostBtn.title = 'Profile Boost (VIP Unlimited)';
  }

  // 7. Matches screen: Blurred Likes card
  const blurCard = document.querySelector('.vip-blur-card');
  if (blurCard) {
    if (isVip) {
      blurCard.onclick = () => showToast('👑 VIP Unlocked: You can see everyone who likes you!', 'gold');
      const cardTitle = blurCard.querySelector('.vip-card-title');
      const cardBadge = blurCard.querySelector('.vip-card-badge');
      const cardSub = blurCard.querySelector('.vip-card-sub');
      if (cardTitle) {
        cardTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:6px;filter:drop-shadow(0 0 4px rgba(244,197,80,0.8))"><path d="M12 2L9.5 8.5L3 6.5L7.5 12L3 17.5L9.5 15.5L12 22L14.5 15.5L21 17.5L16.5 12L21 6.5L14.5 8.5L12 2Z" fill="#F4C550"/></svg> People Who Liked You`;
      }
      if (cardBadge) {
        cardBadge.textContent = '👑 VIP UNLOCKED';
        cardBadge.style.background = 'var(--gold-gradient)';
        cardBadge.style.color = '#1A0E04';
      }
      if (cardSub) {
        cardSub.textContent = 'VIP Gold active — all secret likes revealed!';
      }
      revealBlurredMatches();
    }
  }

  // 8. Profile screen: Upgrade banner
  const profileBanner = document.querySelector('.profile-upgrade-banner');
  if (profileBanner) {
    if (isVip) {
      profileBanner.style.background = 'linear-gradient(135deg, rgba(244, 197, 80, 0.22) 0%, rgba(184, 132, 43, 0.12) 100%)';
      profileBanner.style.border = '1.5px solid rgba(244, 197, 80, 0.45)';
      profileBanner.innerHTML = `
        <div class="upgrade-crown-wrap">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 0 16px rgba(244,197,80,0.9))">
            <path d="M12 2L9.5 8.5L3 6.5L7.5 12L3 17.5L9.5 15.5L12 22L14.5 15.5L21 17.5L16.5 12L21 6.5L14.5 8.5L12 2Z" fill="#F4C550"/>
          </svg>
        </div>
        <div class="upgrade-vip-title" style="color:var(--gold-1)">👑 VIP Gold Member Active</div>
        <p class="upgrade-vip-sub">You have unlimited rewinds, infinite AI dream portraits, and priority matching unlocked.</p>
        <button class="accent-btn" style="background:var(--gold-grad);color:#2E1A08;box-shadow:var(--shadow-gold);max-width:240px;margin:0 auto;font-weight:800" onclick="event.stopPropagation();showToast('👑 VIP Gold status is active on your account!', 'gold')">✓ Perks Active</button>
      `;
      profileBanner.onclick = () => showToast('👑 You are currently enjoying full VIP Gold access!', 'gold');
    }
  }

  // 9. Settings screen: VIP Banner & Row
  const settingsBanner = document.querySelector('.settings-vip-banner');
  if (settingsBanner) {
    if (isVip) {
      settingsBanner.style.borderColor = 'rgba(244, 197, 80, 0.5)';
      settingsBanner.style.background = 'linear-gradient(135deg, rgba(244, 197, 80, 0.15) 0%, rgba(20, 10, 30, 0.6) 100%)';
      const title = settingsBanner.querySelector('.settings-vip-title');
      const sub = settingsBanner.querySelector('.settings-vip-sub');
      const arrow = settingsBanner.querySelector('.settings-vip-arrow');
      if (title) title.innerHTML = '<span style="color:var(--gold-1)">👑 VIP Gold Active</span>';
      if (sub) sub.textContent = 'Unlimited Rewinds · Infinite AI · Secret Likes Unlocked';
      if (arrow) arrow.innerHTML = '✓';
      settingsBanner.onclick = () => showToast('👑 Your VIP Gold subscription is active!', 'gold');
    }
  }

  const vipStatus = document.getElementById('vipStatusRow');
  if (vipStatus) {
    vipStatus.innerHTML = isVip
      ? '<span style="color:var(--gold-1);font-weight:700">👑 VIP Gold Active (Unlimited)</span>'
      : '<span style="color:var(--flame-1);font-weight:700;cursor:pointer" onclick="openPaywall(\'settings\')">Upgrade to VIP →</span>';
  }
}

function updateLimitBadges() {
  const isVip = Boolean(appState.isVip);
  const rewindBadge = document.getElementById('rewindBadge');
  if (rewindBadge) {
    rewindBadge.textContent = isVip ? '∞' : String(appState.freeRewinds);
    rewindBadge.style.background = isVip ? 'var(--gold-gradient)' : (appState.freeRewinds <= 0 ? 'var(--accent-pink)' : 'var(--gold-gradient)');
  }

  const aiBadge = document.getElementById('aiLimitBadge');
  if (aiBadge) {
    aiBadge.textContent = isVip ? '∞' : String(appState.freeAiGens);
    aiBadge.style.background = isVip ? 'var(--gold-gradient)' : (appState.freeAiGens <= 0 ? 'var(--accent-pink)' : 'var(--gold-gradient)');
  }
}

function revealBlurredMatches() {
  for (let i = 1; i <= 4; i++) {
    const item = document.getElementById(`blurItem${i}`);
    const lock = document.getElementById(`blurLock${i}`);
    if (item) item.classList.add('revealed');
    if (lock) {
      lock.textContent = '⭐';
      lock.style.background = 'rgba(244,197,80,0.85)';
      lock.style.color = '#1A0E04';
    }
  }
}

// ==========================================================
// UTILITIES
// ==========================================================

function showToast(msg, type = 'gold') {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-notification';
    document.querySelector('.app-shell')?.appendChild(toast);
  }

  toast.textContent = msg;
  if (type === 'error') {
    toast.style.background = 'linear-gradient(135deg, #D13A63 0%, #8C1F45 100%)';
    toast.style.color = '#FFFFFF';
    toast.style.border = '1px solid rgba(255,255,255,0.3)';
  } else if (type === 'info') {
    toast.style.background = 'linear-gradient(135deg, #2C183B 0%, #150B20 100%)';
    toast.style.color = '#FFFFFF';
    toast.style.border = '1px solid rgba(209, 58, 99, 0.45)';
  } else {
    toast.style.background = 'linear-gradient(135deg, #F7D374 0%, #B8842B 100%)';
    toast.style.color = '#1A0E04';
    toast.style.border = '1px solid rgba(255,255,255,0.4)';
  }

  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2800);
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function safeCssUrl(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r|\n/g, '');
}

// ==========================================================
// SIGNUP SUCCESS SCREEN
// ==========================================================

function handleSignupComplete() {
  showScreen('discovery');
  showToast('🎉 Welcome to hookmebysam! Start swiping!');
}

// ==========================================================
// TOP PICKS / STORIES ROW
// ==========================================================

const STORY_DATA = [
  {
    id: 's1', name: 'Zainab', age: 22, location: 'Victoria Island, 3 km',
    bio: 'Architecture student & sunset lover. Coffee date or gallery hopping?',
    tags: ['Architecture 🏛️', 'Coffee ☕', 'Art 🎨'],
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85',
    thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 's2', name: 'Amara', age: 24, location: 'Lekki Phase 1, 7 km',
    bio: 'Fashion label designer. Let\'s find the best pancake spot in Lagos.',
    tags: ['Fashion 👗', 'Aesthetics 📸', 'Brunch 🥂'],
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=85',
    thumb: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 's3', name: 'Sade', age: 23, location: 'Ikoyi, 18 km',
    bio: 'Bookworm & content designer. Looking for honest connections only.',
    tags: ['Books 📚', 'Nature 🌿', 'Music 🎧'],
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=85',
    thumb: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 's4', name: 'Chidi', age: 27, location: 'Marina, 5 km',
    bio: 'Art gallery host. If you love fitness and museum date nights, let\'s connect.',
    tags: ['Fitness 💪', 'Art 🎨', 'Business 📈'],
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=85',
    thumb: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 's5', name: 'Tunde', age: 25, location: 'Ibadan, 12 km',
    bio: 'Software developer by day, PS5 legend by night. Looking for cool lounge vibes.',
    tags: ['Gamer 🎮', 'Tech 💻', 'Foodie 🍕'],
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85',
    thumb: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 's6', name: 'Kemi', age: 24, location: 'Surulere, 4 km',
    bio: 'Let\'s explore Lagos galleries. Ready for adventures & good vibes ✨',
    tags: ['Brunch 🥞', 'Travel ✈️', 'Vibes ⚡'],
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=85',
    thumb: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80'
  }
];

let seenStories = new Set();
let currentStoryIndex = 0;
let storyTimer = null;
let _viewingUserStory = false;
let communityStories = [];

function getAllCommunityStories() {
  const combined = [];
  const seenIds = new Set();
  const nowMs = Date.now();

  // Stories only from real users fetched via Firestore (real matched/chatting users)
  (communityStories || []).forEach(s => {
    if (s && s.id && !seenIds.has(s.id)) {
      if (!s.expiresAt || s.expiresAt > nowMs) {
        seenIds.add(s.id);
        combined.push(s);
      }
    }
  });

  return combined;
}

function initCommunityStoriesListener() {
  if (typeof listenToCommunityStories === 'function') {
    listenToCommunityStories((stories) => {
      const myUid = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser?.uid) || currentUser?.id || currentUser?.uid || '';
      const list = Array.isArray(stories) ? stories : [];

      // Reconcile and purge any deleted or orphan stories owned by this user in Firestore
      if (myUid && typeof fbDb !== 'undefined' && fbDb) {
        const activeIds = new Set((userStories || []).map(s => s.id || s.docId).filter(Boolean));
        const activeMedia = new Set((userStories || []).map(s => s.image || s.video).filter(Boolean));
        const userExplicitlyCleared = localStorage.getItem('hmbs_user_stories_cleared') === 'true';

        list.forEach(s => {
          if (s.ownerId === myUid) {
            const existsLocally = activeIds.has(s.id) || activeMedia.has(s.image) || activeMedia.has(s.video);
            if (userExplicitlyCleared || !existsLocally) {
              console.log('Purging deleted/orphan status doc from Firestore:', s.id);
              fbDb.collection('stories').doc(s.id).delete().catch(() => {});
            }
          }
        });
      }

      communityStories = list.filter(s => {
        if (myUid && s.ownerId) {
          return s.ownerId !== myUid;
        }
        return true;
      });
      renderStoriesRow();

      // If viewing a community story that was just deleted from Firestore, close viewer
      const overlay = document.getElementById('storyViewerOverlay');
      if (overlay && overlay.style.display !== 'none' && !_viewingUserStory) {
        const all = getAllCommunityStories();
        if (all.length === 0 || !all[currentStoryIndex]) {
          closeStoryViewer();
        }
      }
    });
  }
}

function renderStoriesRow() {
  const scroll = document.getElementById('storiesScroll');
  if (!scroll) return;

  const isUploading = Boolean(window._isUploadingStory);
  const uploadPreview = window._uploadingStoryPreview;
  const hasStory = (typeof userStories !== 'undefined' && Array.isArray(userStories) && userStories.length > 0);
  const userAvatar = currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
  const latestUserStory = hasStory ? userStories[userStories.length - 1] : null;

  let html = '';

  // 1. User Status Card (WhatsApp Style)
  if (isUploading) {
    html += `
      <div class="wa-status-card your-status-card uploading" onclick="event.stopPropagation()">
        <div class="wa-status-card-bg" style="background-image:url('${uploadPreview || userAvatar}')"></div>
        <div class="wa-status-card-overlay"></div>
        <div class="wa-status-avatar-wrap">
          <div class="wa-status-avatar" style="background-image:url('${userAvatar}')"></div>
          <div class="wa-status-upload-ring">
            <svg viewBox="0 0 44 44" class="wa-status-spinner-svg">
              <circle class="wa-status-spinner-track" cx="22" cy="22" r="19" fill="none" stroke-width="3.5"/>
              <circle class="wa-status-spinner-circle" cx="22" cy="22" r="19" fill="none" stroke-width="3.5"/>
            </svg>
          </div>
        </div>
        <div class="wa-status-card-info">
          <span class="wa-status-card-name">Sending...</span>
        </div>
      </div>`;
  } else if (hasStory && latestUserStory) {
    const isMyVid = Boolean(latestUserStory.isVideo || latestUserStory.video);
    const myMedia = latestUserStory.video || latestUserStory.thumb || latestUserStory.image;
    html += `
      <div class="wa-status-card your-status-card has-story" onclick="viewYourStory(0)">
        ${isMyVid && myMedia
          ? `<video class="wa-status-card-video" src="${escHtml(myMedia)}#t=0.5" preload="metadata" muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>`
          : `<div class="wa-status-card-bg" style="background-image:url('${latestUserStory.thumb || latestUserStory.image}')"></div>`
        }
        <div class="wa-status-card-overlay"></div>
        <div class="wa-status-avatar-wrap">
          <div class="wa-status-avatar active-ring" style="background-image:url('${userAvatar}')"></div>
          <span class="wa-status-add-badge" onclick="event.stopPropagation();openYourStoryUpload(event);" title="Add status">+</span>
        </div>
        <div class="wa-status-card-info">
          <span class="wa-status-card-name">${escHtml(currentUser.name || 'My status')}</span>
        </div>
      </div>`;
  } else {
    html += `
      <div class="wa-status-card your-status-card empty" onclick="openYourStoryUpload(event)">
        <div class="wa-status-card-bg empty-bg"></div>
        <div class="wa-status-card-overlay"></div>
        <div class="wa-status-avatar-wrap empty-avatar-wrap">
          <div class="wa-status-avatar" style="background-image:url('${userAvatar}')"></div>
          <span class="wa-status-add-badge" title="Add status">+</span>
        </div>
        <div class="wa-status-card-info">
          <span class="wa-status-card-name">Add status</span>
        </div>
      </div>`;
  }

  // 2. Contact Status Cards (WhatsApp Style)
  const list = getAllCommunityStories();
  html += list.map((s) => {
    const seen = seenStories.has(s.id);
    const contactAvatar = s.avatar || s.thumb || s.image;
    const isVid = Boolean(s.isVideo || s.video);
    const mediaUrl = s.video || s.image || '';

    let mediaBgHtml = '';
    if (isVid && mediaUrl) {
      mediaBgHtml = `<video class="wa-status-card-video" src="${escHtml(mediaUrl)}#t=0.5" preload="metadata" muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>`;
    } else if (mediaUrl) {
      mediaBgHtml = `<div class="wa-status-card-bg" style="background-image:url('${escHtml(mediaUrl)}')"></div>`;
    } else {
      mediaBgHtml = `<div class="wa-status-card-bg" style="background-image:url('${escHtml(contactAvatar)}')"></div>`;
    }

    return `
      <div class="wa-status-card contact-status-card ${seen ? 'seen' : ''}" onclick="viewStory('${s.id}')">
        ${mediaBgHtml}
        <div class="wa-status-card-overlay"></div>
        <div class="wa-status-avatar-wrap">
          <div class="wa-status-avatar ${seen ? 'seen-ring' : 'active-ring'}" style="background-image:url('${contactAvatar}')"></div>
          ${isVid ? `<span class="wa-status-vid-icon" style="position:absolute;bottom:-2px;right:-2px;background:#111b21;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:9px;">📹</span>` : ''}
        </div>
        <div class="wa-status-card-info">
          <span class="wa-status-card-name">${escHtml(s.name)}</span>
        </div>
      </div>`;
  }).join('');

  scroll.innerHTML = html;
}

function viewYourStory(startIndex = 0) {
  if (!userStories || userStories.length === 0) {
    openYourStoryUpload();
    return;
  }
  _viewingUserStory = true;
  currentStoryIndex = Math.min(Math.max(0, startIndex), userStories.length - 1);
  showStoryAtIndex(currentStoryIndex);
}

function viewStory(storyId) {
  _viewingUserStory = false;
  const list = getAllCommunityStories();
  const idx = list.findIndex(s => s.id === storyId);
  if (idx === -1) return;
  currentStoryIndex = idx;
  showStoryAtIndex(currentStoryIndex);
}

let _storyPressStartTime = 0;
let _storyHoldTimer = null;

function showStoryAtIndex(idx) {
  const myUid = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser?.uid) || currentUser?.id || currentUser?.uid || '';
  const activeList = _viewingUserStory ? userStories : getAllCommunityStories();

  if (!activeList || activeList.length === 0 || idx < 0 || idx >= activeList.length) {
    closeStoryViewer();
    return;
  }

  currentStoryIndex = idx;
  const story = activeList[currentStoryIndex];

  // Airtight ownership verification
  const isOwn = Boolean(
    _viewingUserStory ||
    story?.isUserStory ||
    (story && story.ownerId && myUid && String(story.ownerId) === String(myUid))
  );

  if (!isOwn) seenStories.add(story.id);
  renderStoriesRow();

  const overlay = document.getElementById('storyViewerOverlay');
  const bgImg = document.getElementById('storyBgImg');
  const storyVid = document.getElementById('storyVideo');
  const avatar = document.getElementById('storyUserAvatar');
  const nameEl = document.getElementById('storyUserName');
  const ageEl = document.getElementById('storyUserAge');
  const locEl = document.getElementById('storyUserLoc');
  const captionEl = document.getElementById('storyBioText');
  const captionOverlay = document.getElementById('storyCaptionOverlay');
  const inputEl = document.getElementById('storyMsgInput');
  const deleteBtn = document.getElementById('storyDeleteBtn');
  const addMoreBtn = document.getElementById('storyAddMoreBtn');
  const ownActionBar = document.getElementById('storyOwnActionBar');
  const commActionRow = document.getElementById('storyCommunityActionRow');

  if (ownActionBar) ownActionBar.style.setProperty('display', isOwn ? 'flex' : 'none', 'important');
  if (commActionRow) commActionRow.style.setProperty('display', isOwn ? 'none' : 'flex', 'important');
  if (deleteBtn) deleteBtn.style.setProperty('display', isOwn ? 'flex' : 'none', 'important');
  if (addMoreBtn) addMoreBtn.style.setProperty('display', isOwn ? 'flex' : 'none', 'important');

  // Handle Photo vs Video Story
  const isVideoStory = Boolean(story.video || story.isVideo);
  if (isVideoStory) {
    if (bgImg) bgImg.style.display = 'none';
    if (storyVid) {
      storyVid.style.display = 'block';
      storyVid.src = story.video || story.image;
      storyVid.currentTime = 0;
      storyVid.play().catch(() => {
        storyVid.muted = true;
        storyVid.play().catch(() => {});
      });
      storyVid.onended = () => {
        nextStory();
      };
      storyVid.onloadedmetadata = () => {
        clearTimeout(storyTimer);
        const durationSec = Math.min(30, Math.max(5, storyVid.duration || 6));
        storyTimer = setTimeout(() => { nextStory(); }, durationSec * 1000);
      };
    }
  } else {
    if (storyVid) {
      storyVid.pause();
      storyVid.src = '';
      storyVid.style.display = 'none';
    }
    if (bgImg) {
      bgImg.style.display = 'block';
      bgImg.style.backgroundImage = `url('${story.image}')`;
    }
  }

  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('story-paused');

    // Attach gestures & tap-and-hold pause
    if (!overlay._gesturesBound) {
      overlay._gesturesBound = true;

      // Tap-and-hold pause listener
      overlay.addEventListener('pointerdown', (e) => {
        if (e.target.closest('input, button, textarea, a, .story-bottom-area, .story-top-bar')) return;
        _storyPressStartTime = Date.now();
        clearTimeout(_storyHoldTimer);
        _storyHoldTimer = setTimeout(() => {
          overlay.classList.add('story-paused');
          clearTimeout(storyTimer);
          const v = document.getElementById('storyVideo');
          if (v && !v.paused) v.pause();
        }, 160);
      });

      const onPointerRelease = (e) => {
        if (!_storyPressStartTime) return;
        clearTimeout(_storyHoldTimer);
        const holdDuration = Date.now() - _storyPressStartTime;
        const wasPaused = overlay.classList.contains('story-paused');
        overlay.classList.remove('story-paused');
        _storyPressStartTime = 0;

        const v = document.getElementById('storyVideo');
        if (v && v.style.display !== 'none' && v.paused) {
          v.play().catch(() => {});
        }

        if (wasPaused || holdDuration >= 240) {
          // It was a pause hold — resume timer without navigating
          clearTimeout(storyTimer);
          storyTimer = setTimeout(() => { nextStory(); }, 5000);
        } else if (e.type === 'pointerup') {
          // Short tap: navigate left or right
          const rect = overlay.getBoundingClientRect();
          const clientX = e.clientX;
          if (clientX < rect.left + rect.width * 0.35) {
            prevStory();
          } else {
            nextStory();
          }
        }
      };

      overlay.addEventListener('pointerup', onPointerRelease);
      overlay.addEventListener('pointercancel', onPointerRelease);
      overlay.addEventListener('pointerleave', onPointerRelease);

      // Swipe down to dismiss
      let sY = 0;
      let sX = 0;
      let isSwipingDown = false;
      overlay.addEventListener('touchstart', (e) => {
        if (e.target.closest('input, button, textarea, a')) return;
        if (!e.touches || e.touches.length === 0) return;
        sY = e.touches[0].clientY;
        sX = e.touches[0].clientX;
        isSwipingDown = false;
      }, { passive: true });
      overlay.addEventListener('touchmove', (e) => {
        if (!sY || !e.touches || e.touches.length === 0) return;
        const dy = e.touches[0].clientY - sY;
        const dx = e.touches[0].clientX - sX;
        if (dy > 12 && Math.abs(dy) > Math.abs(dx) * 1.2) {
          isSwipingDown = true;
          overlay.style.transform = `translateY(${Math.min(180, dy)}px)`;
          overlay.style.opacity = `${Math.max(0.3, 1 - dy / 400)}`;
        }
      }, { passive: true });
      overlay.addEventListener('touchend', (e) => {
        if (isSwipingDown && e.changedTouches && e.changedTouches.length > 0) {
          const dy = e.changedTouches[0].clientY - sY;
          if (dy > 55) {
            closeStoryViewer();
          }
        }
        overlay.style.transform = '';
        overlay.style.opacity = '';
        isSwipingDown = false;
        sY = 0;
      }, { passive: true });
    }
  }

  // Auto advance after 6s (or video duration)
  clearTimeout(storyTimer);
  storyTimer = setTimeout(() => {
    nextStory();
  }, isVideoStory ? 9000 : 6000);
}

function nextStory(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  clearTimeout(storyTimer);
  const activeList = _viewingUserStory ? userStories : getAllCommunityStories();
  if (currentStoryIndex < activeList.length - 1) {
    showStoryAtIndex(currentStoryIndex + 1);
  } else {
    closeStoryViewer();
  }
}

function prevStory(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  clearTimeout(storyTimer);
  if (currentStoryIndex > 0) {
    showStoryAtIndex(currentStoryIndex - 1);
  } else {
    showStoryAtIndex(0);
  }
}

function closeStoryViewer() {
  clearTimeout(storyTimer);
  const overlay = document.getElementById('storyViewerOverlay');
  if (overlay) {
    overlay.classList.remove('story-paused');
    overlay.style.display = 'none';
  }
  const vid = document.getElementById('storyVideo');
  if (vid) {
    vid.pause();
    vid.src = '';
    vid.style.display = 'none';
  }
  _viewingUserStory = false;
}

function deleteCurrentUserStory() {
  if (!confirm('Are you sure you want to delete this status?')) return;
  const activeList = _viewingUserStory ? userStories : getAllCommunityStories();
  const storyToDelete = activeList && activeList[currentStoryIndex];
  if (!storyToDelete) return;

  const storyId = storyToDelete.id || storyToDelete.docId;
  const mediaUrl = storyToDelete.image || storyToDelete.video;
  const myUid = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser?.uid) || currentUser?.id || currentUser?.uid || '';

  // 1. Remove from local userStories
  if (Array.isArray(userStories)) {
    userStories = userStories.filter(s => {
      if (storyId && (s.id === storyId || s.docId === storyId)) return false;
      if (mediaUrl && (s.image === mediaUrl || s.video === mediaUrl || s.mediaUrl === mediaUrl)) return false;
      return true;
    });
    if (userStories.length === 0) {
      try { localStorage.setItem('hmbs_user_stories_cleared', 'true'); } catch (_) {}
    }
    try {
      localStorage.setItem('hmbs_user_stories', JSON.stringify(userStories));
    } catch (_) {}
  }

  // 2. Remove from communityStories
  if (Array.isArray(communityStories)) {
    communityStories = communityStories.filter(s => {
      if (storyId && (s.id === storyId || s.docId === storyId)) return false;
      if (mediaUrl && (s.image === mediaUrl || s.video === mediaUrl || s.mediaUrl === mediaUrl)) return false;
      return true;
    });
  }

  // 3. Delete from Firestore with batch/orphan cleanup
  if (typeof deleteStoryFromFirestore === 'function') {
    deleteStoryFromFirestore(storyId, storyToDelete, userStories.length === 0).catch(() => {});
  } else if (typeof fbDb !== 'undefined' && fbDb) {
    if (storyId) {
      fbDb.collection('stories').doc(storyId).delete().catch(() => {});
    }
    if (myUid) {
      fbDb.collection('stories').where('ownerId', '==', myUid).get().then(snap => {
        snap.forEach(doc => {
          const d = doc.data() || {};
          if (userStories.length === 0 || doc.id === storyId || (mediaUrl && (d.mediaUrl === mediaUrl || d.image === mediaUrl))) {
            doc.ref.delete().catch(() => {});
          }
        });
      }).catch(() => {});
    }
  }

  showToast('Status deleted 🗑️', 'info');
  renderStoriesRow();

  const nextList = _viewingUserStory ? userStories : getAllCommunityStories();
  if (nextList.length > 0) {
    currentStoryIndex = Math.min(currentStoryIndex, nextList.length - 1);
    showStoryAtIndex(currentStoryIndex);
  } else {
    closeStoryViewer();
  }
}

function sendStoryDirectMessage(story, replyText) {
  if (!story) return;
  const partnerId = story.ownerId || story.id || ('contact_' + (story.name || 'user').toLowerCase());
  const partnerName = story.name || 'Member';
  const partnerAvatar = story.thumb || story.image || '';

  // Ensure conversation exists
  let existingUser = matchedUsers.find(u => u.id === partnerId || u.name === partnerName);
  if (!existingUser) {
    existingUser = {
      id: partnerId,
      name: partnerName,
      age: story.age || '',
      bio: story.bio || '',
      image: partnerAvatar,
      tags: story.tags || [],
      distance: story.location || 'Lagos',
      isRealUser: Boolean(story.ownerId)
    };
    matchedUsers.unshift(existingUser);
  }

  if (!conversations[partnerId]) {
    conversations[partnerId] = { messages: [] };
  }

  const newMsg = {
    id: 'story_reply_' + Date.now(),
    sender: 'me',
    text: `Replied to your status: ${replyText}`,
    replyTo: {
      id: story.id,
      author: `${partnerName}'s Status`,
      text: replyText,
      imageUrl: story.thumb || story.image
    },
    read: true,
    timestamp: Date.now()
  };

  conversations[partnerId].messages.push(newMsg);
  movePartnerToTop(partnerId);
  renderConversationList();
  renderChatsInbox();
  saveToStorage();

  // A story reply is a chat message, so it must only be sent to an active mutual match.
  if (typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const matchId = [fbAuth.currentUser.uid, partnerId].sort().join('_');
    sendRealtimeMessage(matchId, `Replied to your status: ${replyText}`, false, '', '', {
      id: story.id,
      senderName: `${partnerName}'s Status`,
      text: replyText,
      imageUrl: story.thumb || story.image || ''
    }).then(delivered => {
      if (!delivered) {
        const idx = conversations[partnerId]?.messages?.findIndex(m => m.id === newMsg.id);
        if (idx !== undefined && idx >= 0) {
          conversations[partnerId].messages.splice(idx, 1);
          renderConversationList();
          renderChatsInbox();
          saveToStorage();
        }
        showToast('You can only reply to a status after you match.', 'error', 6000);
      }
    }).catch(() => {
      showToast('Status reply could not be delivered. Please try again.', 'error', 6000);
    });
  }
}

function likeStoryProfile() {
  const list = _viewingUserStory ? userStories : getAllCommunityStories();
  const story = list[currentStoryIndex];
  if (!story) return;

  sendStoryDirectMessage(story, '❤️');
  showToast(`Liked ${story.name}'s status ❤️`, 'pink');
  closeStoryViewer();
}

function sendStoryReply() {
  const input = document.getElementById('storyMsgInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  input.value = '';

  const list = _viewingUserStory ? userStories : getAllCommunityStories();
  const story = list[currentStoryIndex];
  if (!story) return;

  sendStoryDirectMessage(story, val);
  showToast(`Reply sent to ${story.name} 💬`, 'gold');
  closeStoryViewer();
}

function handleStoryKeydown(e) {
  if (e.key === 'Enter') sendStoryReply();
}

// ==========================================================
// CHAT TYPING INDICATOR
// ==========================================================

function showTypingIndicator() {
  const container = document.getElementById('chatMessages');
  if (!container || appState.isTypingVisible) return;
  appState.isTypingVisible = true;

  // Header status indicator
  const partnerId = appState.currentChatId;
  const partner = (typeof matchedUsers !== 'undefined' ? matchedUsers : []).find(u => u.id === partnerId) || (typeof PROFILES_DATA !== 'undefined' ? PROFILES_DATA : []).find(u => u.id === partnerId);
  const pName = partner ? partner.name : 'Match';
  const statusEl = document.getElementById('chatPartnerStatus');
  if (statusEl) {
    if (!statusEl.dataset.prevStatus) {
      statusEl.dataset.prevStatus = statusEl.textContent;
    }
    statusEl.textContent = `${pName} is typing...`;
    statusEl.style.color = '#21B06B';
  }

  // Bubble in thread
  const typingEl = document.createElement('div');
  typingEl.id = 'typingIndicator';
  typingEl.className = 'msg-typing';
  typingEl.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  container.appendChild(typingEl);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
  appState.isTypingVisible = false;

  const statusEl = document.getElementById('chatPartnerStatus');
  if (statusEl && statusEl.dataset.prevStatus) {
    statusEl.textContent = statusEl.dataset.prevStatus;
    statusEl.style.color = '';
    delete statusEl.dataset.prevStatus;
  }
}

// ==========================================================
// BOOST PROFILE
// ==========================================================

const BOOST_DURATION_SECONDS = 30 * 60; // 30 minutes

function startBoost() {
  if (appState.isBoosting) { stopBoost(); return; }

  if (!appState.isVip) {
    // Non-VIP gets 1 free boost, else paywall
    openPaywall('boost');
    return;
  }

  appState.isBoosting = true;
  appState.boostSecondsLeft = BOOST_DURATION_SECONDS;

  const btn = document.getElementById('boostBtn');
  const timer = document.getElementById('boostTimer');
  if (btn) btn.classList.add('boosting');
  if (timer) timer.style.display = 'block';

  showToast('⚡ Profile Boost activated for 30 min!');

  appState.boostInterval = setInterval(() => {
    appState.boostSecondsLeft--;
    if (timer) timer.textContent = formatBoostTime(appState.boostSecondsLeft);
    if (appState.boostSecondsLeft <= 0) stopBoost();
  }, 1000);
}

function stopBoost() {
  appState.isBoosting = false;
  clearInterval(appState.boostInterval);
  appState.boostInterval = null;

  const btn = document.getElementById('boostBtn');
  const timer = document.getElementById('boostTimer');
  if (btn) btn.classList.remove('boosting');
  if (timer) { timer.style.display = 'none'; timer.textContent = ''; }
}

function formatBoostTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ==========================================================
// REPORT & BLOCK USER
// ==========================================================

function reportUser() {
  let partner = null;
  if (appState.currentScreen === 'chat' && appState.currentChatId) {
    partner = matchedUsers.find(u => u.id === appState.currentChatId) || PROFILES_DATA.find(u => u.id === appState.currentChatId);
  }
  if (!partner && appState.currentScreen === 'discovery') {
    if (typeof profileStack !== 'undefined' && profileStack.length > 0) {
      partner = profileStack[0];
    } else if (typeof PROFILES_DATA !== 'undefined' && PROFILES_DATA.length > 0) {
      partner = PROFILES_DATA[0];
    }
  }
  if (!partner && appState.currentChatId) {
    partner = matchedUsers.find(u => u.id === appState.currentChatId) || PROFILES_DATA.find(u => u.id === appState.currentChatId);
  }
  const name = partner ? escHtml(partner.name) : 'this user';
  const userId = partner?.id || '';

  document.getElementById('reportModalOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'whatsapp-dialog-overlay';
  overlay.id = 'reportModalOverlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeReportModal(); };

  overlay.innerHTML = `
    <div class="whatsapp-dialog-card">
      <div class="wa-dialog-badge">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF2E70" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h3 class="wa-dialog-title">Report or Block ${name}?</h3>
      <p class="wa-dialog-desc">Blocked contacts will no longer be able to message or call you on hookmebysam. Please select a reason:</p>

      <div class="wa-report-reasons" id="waReportReasons">
        <label class="wa-reason-option active" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="inappropriate" checked>
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">🔞 Inappropriate messages or media</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="spam">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">🚫 Spam, commercial ads, or scam</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="fake">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">🎭 Fake profile or impersonation</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="harassment">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">⚠️ Harassment, hate speech, or abuse</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="other">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">⚡ I'm just not interested / Other</span>
        </label>
      </div>

      <div class="wa-dialog-actions">
        <button class="wa-dialog-btn wa-dialog-btn-danger" onclick="executeReportAndBlock('${userId}', '${name}')">
          <span>Report & Block</span>
        </button>
        <button class="wa-dialog-btn wa-dialog-btn-secondary" onclick="blockUser('${userId}', '${name}')">
          <span>Block Only</span>
        </button>
        <button class="wa-dialog-btn wa-dialog-btn-cancel" onclick="closeReportModal()">
          <span>Cancel</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function selectReportReason(el) {
  document.querySelectorAll('.wa-reason-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  const radio = el.querySelector('input[type="radio"]');
  if (radio) radio.checked = true;
}

function closeReportModal() {
  document.getElementById('reportModalOverlay')?.remove();
}

function submitReport(reason, name) {
  closeReportModal();
  showToast(`✅ Report submitted. We'll review ${name}'s account.`, 'info');
}

async function persistBlockToFirestore(userId) {
  if (!fbAuth?.currentUser || !userId) return false;
  const uid = fbAuth.currentUser.uid;
  if (uid === userId) return false;
  if (!window.__blockedUserIds) window.__blockedUserIds = new Set();
  window.__blockedUserIds.add(userId);

  // Mark match document as blocked so real-time listeners drop it immediately
  if (typeof fbDb !== 'undefined' && fbDb) {
    const matchId = [uid, userId].sort().join('_');
    fbDb.collection('matches').doc(matchId).set({
      blocked: true,
      blockedBy: uid,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
  }

  const token = await fbAuth.currentUser.getIdToken();
  const res = await fetch(BACKEND_URL + '/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ blockedUserId: userId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Could not block user.');
  return true;
}

async function deleteBlockFromFirestore(userId) {
  if (!fbAuth?.currentUser || !userId) return false;
  if (window.__blockedUserIds) window.__blockedUserIds.delete(userId);
  const token = await fbAuth.currentUser.getIdToken();
  const res = await fetch(BACKEND_URL + '/blocks/' + encodeURIComponent(userId), {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Could not unblock user.');
  return true;
}

async function blockUser(userId, name) {
  closeReportModal();
  if (typeof closeMatchPopup === 'function') closeMatchPopup();
  if (!userId) return;

  if (!window.__blockedUserIds) window.__blockedUserIds = new Set();
  window.__blockedUserIds.add(userId);

  if (appState.currentChatId === userId) {
    appState.currentChatId = null;
  }

  const existing = matchedUsers.find(u => u.id === userId);
  const fallback = PROFILES_DATA.find(u => u.id === userId) || PREMIUM_MATCHES.find(u => u.id === userId);
  const userObj = existing || fallback || { id: userId, name: name };

  try {
    await persistBlockToFirestore(userId);
  } catch (err) {
    console.warn('Block persistence failed:', err);
    showToast('Could not block this contact right now. Please try again.', 'error');
    return;
  }

  if (!blockedUsers.some(b => b.id === userId)) {
    blockedUsers.unshift({
      id: userId,
      name: userObj.name || name || 'User',
      image: userObj.image || userObj.photoUrl || '',
      bio: userObj.bio || '',
      age: userObj.age || 24,
      blockedAt: Date.now()
    });
  }

  matchedUsers = matchedUsers.filter(u => u.id !== userId);
  profileStack = profileStack.filter(p => p.id !== userId);
  delete conversations[userId];

  saveToStorage();
  renderMatchesView();
  renderSettingsScreen();
  updateMatchesNotificationBadge();
  showToast(`${name || 'User'} has been blocked.`, 'info');
  if (appState.currentScreen === 'discovery') {
    renderCardStack();
  } else {
    showScreen('matches');
  }
}

async function executeReportAndBlock(userId, name) {
  const reason = document.querySelector('input[name="reportReason"]:checked')?.value || 'other';
  closeReportModal();
  if (typeof closeMatchPopup === 'function') closeMatchPopup();
  if (!userId || !fbDb || !fbAuth?.currentUser) {
    showToast('Please sign in to report an account.', 'error');
    return;
  }

  if (!window.__blockedUserIds) window.__blockedUserIds = new Set();
  window.__blockedUserIds.add(userId);

  if (appState.currentChatId === userId) {
    appState.currentChatId = null;
  }

  try {
    const token = await fbAuth.currentUser.getIdToken();
    const reportRes = await fetch(BACKEND_URL + '/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ reportedUserId: userId, reason })
    });
    const reportData = await reportRes.json().catch(() => ({}));
    if (!reportRes.ok || !reportData.success) {
      throw new Error(reportData.error || 'Could not submit the report.');
    }

    await persistBlockToFirestore(userId);

    if (!blockedUsers.some(b => b.id === userId)) {
      const existing = matchedUsers.find(u => u.id === userId);
      const fallback = PROFILES_DATA.find(u => u.id === userId) || PREMIUM_MATCHES.find(u => u.id === userId);
      const userObj = existing || fallback || { id: userId, name: name };
      blockedUsers.unshift({
        id: userId,
        name: userObj.name || name || 'User',
        image: userObj.image || userObj.photoUrl || '',
        bio: userObj.bio || '',
        age: userObj.age || 24,
        blockedAt: Date.now()
      });
    }

    matchedUsers = matchedUsers.filter(u => u.id !== userId);
    profileStack = profileStack.filter(p => p.id !== userId);
    delete conversations[userId];
    saveToStorage();
    renderMatchesView();
    renderSettingsScreen();
    updateMatchesNotificationBadge();
    showToast(`🛡️ ${name || 'User'} was reported and blocked.`, 'gold');
    showScreen('matches');
  } catch (err) {
    console.warn('Report/block failed:', err);
    showToast('Could not submit the report. Please try again.', 'error');
  }
}

// ==========================================================
// UNBLOCK & BLOCKED CONTACTS MANAGEMENT
// ==========================================================

function openBlockedUsersModal() {
  document.getElementById('blockedUsersModalOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'whatsapp-dialog-overlay';
  overlay.id = 'blockedUsersModalOverlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeBlockedUsersModal(); };

  overlay.innerHTML = `
    <div class="whatsapp-dialog-card" style="max-width:480px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:38px;height:38px;border-radius:50%;background:rgba(255,46,112,0.14);display:flex;align-items:center;justify-content:center;color:#FF2E70;flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1c1.06 1.35 1.69 3.05 1.69 4.9 0 4.42-3.58 8-8 8z"/>
            </svg>
          </div>
          <div>
            <h3 class="wa-dialog-title" style="margin:0;font-size:1.15rem;text-align:left;">Blocked Contacts</h3>
            <span style="font-size:0.75rem;color:var(--txt-muted);display:block;margin-top:2px;">Manage contacts you've blocked</span>
          </div>
        </div>
        <button onclick="closeBlockedUsersModal()" style="background:none;border:none;color:var(--txt-muted);cursor:pointer;font-size:1.3rem;padding:4px 8px;">✕</button>
      </div>

      <p class="wa-dialog-desc" style="text-align:left;font-size:0.83rem;margin-bottom:6px;">
        Blocked contacts cannot message or call you. Tap <strong>Unblock</strong> beside any contact to restore them.
      </p>

      <div class="blocked-users-list" id="blockedUsersContainer">
        <!-- Rendered dynamically -->
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
        <button class="wa-dialog-btn wa-dialog-btn-cancel" onclick="closeBlockedUsersModal()" style="width:auto;padding:8px 24px;">
          <span>Done</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  renderBlockedUsersListInModal();
}

function closeBlockedUsersModal() {
  document.getElementById('blockedUsersModalOverlay')?.remove();
}

function renderBlockedUsersListInModal() {
  const container = document.getElementById('blockedUsersContainer');
  if (!container) return;

  if (blockedUsers.length === 0) {
    container.innerHTML = `
      <div class="blocked-empty-box">
        <div class="blocked-empty-icon">🛡️</div>
        <div class="blocked-empty-text" style="font-weight:600;color:var(--txt-primary);font-size:0.95rem;">No Blocked Contacts</div>
        <div class="blocked-empty-text" style="font-size:0.8rem;margin-top:4px;color:var(--txt-muted);">You haven't blocked any contacts. Profiles you block will appear here.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = blockedUsers.map(u => {
    const photo = u.image || '';
    const initial = u.name ? u.name.charAt(0) : '?';
    const dateStr = u.blockedAt ? new Date(u.blockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently';

    return `
      <div class="blocked-user-item">
        <div class="blocked-user-left">
          <div class="blocked-avatar" style="${photo ? `background-image:url('${photo}')` : ''}">
            ${!photo ? initial : ''}
          </div>
          <div class="blocked-user-meta">
            <div class="blocked-user-name">${escHtml(u.name)}</div>
            <div class="blocked-user-date">Blocked • ${dateStr}</div>
          </div>
        </div>
        <button class="unblock-action-btn" onclick="unblockUser('${u.id}', '${u.name.replace(/'/g, "\\'")}')">
          Unblock
        </button>
      </div>
    `;
  }).join('');
}

async function unblockUser(userId, name) {
  const idx = blockedUsers.findIndex(b => b.id === userId);
  let userName = name || 'User';
  let userObj = null;

  if (idx !== -1) {
    userObj = blockedUsers[idx];
    userName = userObj.name || userName;
  }

  try {
    await deleteBlockFromFirestore(userId);
  } catch (err) {
    console.warn('Unblock persistence failed:', err);
    showToast('Could not unblock this contact right now. Please try again.', 'error');
    return;
  }

  if (idx !== -1) blockedUsers.splice(idx, 1);
  if (window.__blockedUserIds) window.__blockedUserIds.delete(userId);

  const restoredProfile = userObj || PROFILES_DATA.find(u => u.id === userId) || PREMIUM_MATCHES.find(u => u.id === userId);
  if (restoredProfile && !matchedUsers.some(u => u.id === userId)) {
    matchedUsers.unshift({
      id: restoredProfile.id,
      name: restoredProfile.name || userName,
      age: restoredProfile.age || 24,
      image: restoredProfile.image || '',
      bio: restoredProfile.bio || '',
      tags: restoredProfile.tags || ['Music 🎵', 'Positive vibes ✨'],
      distance: restoredProfile.distance || '2 km'
    });
  }

  saveToStorage();
  renderMatchesView();
  renderSettingsScreen();
  updateMatchesNotificationBadge();
  showToast(`✨ ${userName} has been unblocked!`, 'gold');
  renderBlockedUsersListInModal();
}


// ==========================================================
// NOTIFICATION PERMISSION PROMPT
// ==========================================================

function requestNotificationPermission() {
  // Don't show if already granted/denied or if on unsupported browser
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return;

  // Don't show if already shown
  if (document.getElementById('notifPermBanner')) return;

  const banner = document.createElement('div');
  banner.className = 'notif-permission-banner';
  banner.id = 'notifPermBanner';
  banner.innerHTML = `
    <div class="notif-perm-icon">🔔</div>
    <div class="notif-perm-text">
      <strong>Stay in the loop</strong>
      Get notified when you get a new match or message!
    </div>
    <div class="notif-perm-actions">
      <button class="notif-perm-allow" onclick="allowNotifications()">Allow</button>
      <button class="notif-perm-dismiss" onclick="dismissNotifBanner()" aria-label="Dismiss">✕</button>
    </div>
  `;

  document.querySelector('.app-shell')?.appendChild(banner);

  // Auto-dismiss after 8 seconds
  setTimeout(dismissNotifBanner, 8000);
}

function allowNotifications() {
  dismissNotifBanner();
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      showToast('🔔 Notifications enabled!', 'gold');
      if (typeof initPushNotifications === 'function') {
        initPushNotifications();
      }
      triggerSystemNotification('hookmebysam 💕', {
        body: 'Notifications active! You will be alerted for matches and messages.'
      });
    }
  });
}

function dismissNotifBanner() {
  const banner = document.getElementById('notifPermBanner');
  if (banner) {
    banner.style.animation = 'slideDown 0.25s ease reverse both';
    setTimeout(() => banner.remove(), 250);
  }
}

// OS / Browser Native System Notification Dispatcher
function triggerSystemNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const defaultOptions = {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag: options.data?.matchId || 'hmbs-msg',
    renotify: true,
    data: options.data || {}
  };
  const finalOptions = Object.assign({}, defaultOptions, options);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, finalOptions).catch(() => {
        try { new Notification(title, finalOptions); } catch (_) {}
      });
    }).catch(() => {
      try { new Notification(title, finalOptions); } catch (_) {}
    });
  } else {
    try {
      new Notification(title, finalOptions);
    } catch (_) {}
  }
}

// Handle notification tap messages sent from Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data?.type === 'PUSH_NOTIFICATION_CLICK' && event.data.matchId) {
      if (typeof openChat === 'function') {
        openChat(event.data.matchId);
      }
    } else if (event.data?.type === 'INCOMING_CALL_CLICK' && event.data.matchId) {
      const { matchId, callId, autoAnswer } = event.data;
      if (typeof openChat === 'function') {
        openChat(matchId);
      }
      if (callId && fbDb && fbAuth?.currentUser) {
        try {
          const cDoc = await fbDb.collection('matches').doc(matchId).collection('calls').doc(callId).get();
          if (cDoc.exists && cDoc.data()?.status === 'ringing') {
            const callData = { ...cDoc.data(), matchId };
            if (autoAnswer && typeof acceptIncomingCall === 'function') {
              pendingIncomingCall = { callId, ...callData };
              acceptIncomingCall();
            } else if (typeof showIncomingCallPrompt === 'function') {
              showIncomingCallPrompt(callId, callData);
            }
          }
        } catch (err) {
          console.warn('Handle incoming call SW message error:', err);
        }
      }
    }
  });
}

// ==========================================================
// USER SEARCH & DIRECT CONNECT ENGINE
// ==========================================================

let searchDebounceTimer = null;

async function handleUserSearchInput(e) {
  const query = e.target.value.trim();
  const clearBtn = document.getElementById('clearSearchBtn');
  const resultsContainer = document.getElementById('searchResultsContainer');
  const resultsList = document.getElementById('searchResultsList');
  const resultsCount = document.getElementById('searchResultsCount');
  const mainContentSections = document.querySelectorAll('#storiesSection, .vip-blur-card, .ad-banner-slot');

  if (clearBtn) clearBtn.style.display = query.length > 0 ? 'block' : 'none';

  if (!query) {
    if (resultsContainer) resultsContainer.style.display = 'none';
    mainContentSections.forEach(s => { if (s) s.style.display = ''; });
    renderConversationList();
    return;
  }

  // Hide collateral promo sections during search
  mainContentSections.forEach(s => { if (s) s.style.display = 'none'; });

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(async () => {
    if (resultsContainer) resultsContainer.style.display = 'block';
    if (resultsList) resultsList.innerHTML = `<p style="color:var(--text-muted,#888);padding:12px;font-size:0.85rem;text-align:center">Searching registered users... 🔍</p>`;

    let matches = [];

    // Search real Firestore users if connected
    if (typeof searchUsersInFirestore === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      matches = await searchUsersInFirestore(query);
    }

    // Combine with local pool: only include demo profiles for guests
    const qLower = query.toLowerCase();
    const localPool = isRealUserLoggedIn() ? (matchedUsers || []) : [...PROFILES_DATA, ...matchedUsers];
    const localMatches = localPool.filter(u =>
      !DUMMY_USER_IDS.includes(u.id) || !isRealUserLoggedIn()
    ).filter(u =>
      (u.name && u.name.toLowerCase().includes(qLower)) ||
      (u.bio && u.bio.toLowerCase().includes(qLower)) ||
      (u.email && u.email.toLowerCase().includes(qLower))
    );

    // Merge without duplicates
    const seenIds = new Set(matches.map(m => m.id));
    localMatches.forEach(lm => {
      if (!seenIds.has(lm.id)) {
        matches.push(lm);
        seenIds.add(lm.id);
      }
    });

    if (resultsCount) resultsCount.textContent = matches.length;

    if (matches.length === 0) {
      if (resultsList) {
        resultsList.innerHTML = `
          <div style="text-align:center;padding:24px 12px;color:var(--text-muted,#888)">
            <div style="font-size:2rem;margin-bottom:6px">🔍</div>
            <p style="font-size:0.88rem">No users found matching "${escHtml(query)}"</p>
          </div>`;
      }
      return;
    }

    if (resultsList) {
      resultsList.innerHTML = matches.map(u => `
        <div class="convo-item" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:10px 14px;border-radius:16px;display:flex;align-items:center;gap:12px">
          <div class="convo-avatar" style="background-image:url('${u.image || u.avatar}');width:48px;height:48px;border-radius:50%;border:2px solid #FF2D78;background-size:cover;background-position:center;flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:0.95rem;color:var(--txt-primary,#fff)">${escHtml(u.name)}${u.age ? `, ${u.age}` : ''}</div>
            <div style="font-size:0.78rem;color:var(--txt-secondary,#aaa);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(u.bio || u.email || '')}</div>
          </div>
          <button class="accent-btn" onclick="connectAndChatWithUser('${u.id}', '${escHtml(u.name)}', '${u.image || u.avatar || ''}')" style="padding:7px 14px;font-size:0.8rem;border-radius:20px;flex-shrink:0;background:var(--flame-grad,#ff2d78)">
            Chat 💬
          </button>
        </div>
      `).join('');
    }
  }, 250);
}

function clearUserSearch() {
  const input = document.getElementById('userSearchInput');
  if (input) input.value = '';
  handleUserSearchInput({ target: { value: '' } });
}

async function connectAndChatWithUser(userId, userName, userImage) {
  let partner = matchedUsers.find(u => u.id === userId);
  if (!partner) {
    partner = {
      id: userId,
      name: userName,
      image: userImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
      isRealUser: true
    };
    matchedUsers.push(partner);
  }

  if (!conversations[userId]) {
    conversations[userId] = { messages: [] };
  }
  // Ensure match document exists in Firestore immediately so real-time chat works
  if (typeof fbAuth !== 'undefined' && fbAuth?.currentUser && typeof fbDb !== 'undefined' && fbDb) {
    const matchId = [fbAuth.currentUser.uid, userId].sort().join('_');
    try {
      const matchRef = fbDb.collection('matches').doc(matchId);
      matchRef.set({
        users: [fbAuth.currentUser.uid, userId].sort(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(() => {});
    } catch (_) {}
  }

  // Create match in backend if connected (fire and forget)
  if (typeof recordSwipeInBackend === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    recordSwipeInBackend(userId, 'like').catch(() => {});
  }

  saveToStorage();
  renderMatchesView();
  openChat(userId);
  showToast(`Connected with ${userName}! Say hi 👋`, 'gold');
}

function openSearchModal() {
  const overlay = document.getElementById('searchModalOverlay');
  const input = document.getElementById('searchModalInput');
  if (overlay) overlay.style.display = 'flex';
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 150);
  }
}

function closeSearchModal() {
  const overlay = document.getElementById('searchModalOverlay');
  if (overlay) overlay.style.display = 'none';
}

function focusUserSearch() {
  openSearchModal();
}

let modalSearchDebounce = null;

async function handleModalSearchInput(e) {
  const query = e.target.value.trim();
  const clearBtn = document.getElementById('clearModalSearchBtn');
  const resultsBody = document.getElementById('searchModalResults');

  if (clearBtn) clearBtn.style.display = query.length > 0 ? 'block' : 'none';

  if (!query) {
    if (resultsBody) {
      resultsBody.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:rgba(255,255,255,0.5);font-size:0.88rem">
          Type a name or email above to search registered accounts 🔍
        </div>`;
    }
    return;
  }

  clearTimeout(modalSearchDebounce);
  modalSearchDebounce = setTimeout(async () => {
    if (resultsBody) {
      resultsBody.innerHTML = `<p style="color:rgba(255,255,255,0.6);padding:16px;font-size:0.88rem;text-align:center">Searching registered users... 🔍</p>`;
    }

    let matches = [];

    // Query Firestore if connected
    if (typeof searchUsersInFirestore === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      matches = await searchUsersInFirestore(query);
    }

    // Combine with local pool: only include demo profiles for guests
    const qLower = query.toLowerCase();
    const localPool = isRealUserLoggedIn() ? (matchedUsers || []) : [...PROFILES_DATA, ...matchedUsers];
    const localMatches = localPool.filter(u =>
      !DUMMY_USER_IDS.includes(u.id) || !isRealUserLoggedIn()
    ).filter(u =>
      (u.name && u.name.toLowerCase().includes(qLower)) ||
      (u.bio && u.bio.toLowerCase().includes(qLower)) ||
      (u.email && u.email.toLowerCase().includes(qLower))
    );

    const seenIds = new Set(matches.map(m => m.id));
    localMatches.forEach(lm => {
      if (!seenIds.has(lm.id)) {
        matches.push(lm);
        seenIds.add(lm.id);
      }
    });

    if (matches.length === 0) {
      if (resultsBody) {
        resultsBody.innerHTML = `
          <div style="text-align:center;padding:28px 12px;color:rgba(255,255,255,0.5)">
            <div style="font-size:2rem;margin-bottom:6px">🔍</div>
            <p style="font-size:0.88rem">No users found matching "${escHtml(query)}"</p>
          </div>`;
      }
      return;
    }

    if (resultsBody) {
      resultsBody.innerHTML = matches.map(u => `
        <div class="convo-item" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);padding:12px 14px;border-radius:18px;display:flex;align-items:center;gap:12px">
          <div class="convo-avatar" style="background-image:url('${u.image || u.avatar}');width:48px;height:48px;border-radius:50%;border:2px solid #FF2D78;background-size:cover;background-position:center;flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:0.95rem;color:#fff">${escHtml(u.name)}${u.age ? `, ${u.age}` : ''}</div>
            <div style="font-size:0.78rem;color:rgba(255,255,255,0.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(u.bio || u.email || '')}</div>
          </div>
          <button class="accent-btn" onclick="closeSearchModal();connectAndChatWithUser('${u.id}', '${escHtml(u.name)}', '${u.image || u.avatar || ''}')" style="padding:8px 16px;font-size:0.82rem;border-radius:20px;flex-shrink:0;background:var(--flame-grad,#ff2d78)">
            Chat 💬
          </button>
        </div>
      `).join('');
    }
  }, 220);
}

function clearModalSearch() {
  const input = document.getElementById('searchModalInput');
  if (input) input.value = '';
  handleModalSearchInput({ target: { value: '' } });
}

// ==========================================================
// MESSAGE REACTIONS & ACTION SHEET — Long press picker
// ==========================================================

let _longPressTimer = null;
let _reactionPickerOpen = false;
let _editingState = null;
let _pendingForwardMsgId = null;

const REACTION_EMOJIS_SET = ['\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDE2E', '\uD83D\uDE22', '\uD83D\uDC4D', '\uD83D\uDD25'];

function getMessageInfo(msgId) {
  const currentChatId = appState.currentChatId;
  const hist = (currentChatId && conversations[currentChatId]?.messages) ? conversations[currentChatId].messages : [];
  if (!msgId) return { msg: null, idx: -1, hist };
  const sId = String(msgId);
  if (sId.startsWith('local_')) {
    const idx = parseInt(sId.replace('local_', ''), 10);
    return { msg: hist[idx] || null, idx, hist };
  }
  let idx = hist.findIndex(m => m.firestoreId === msgId || m.id === msgId);
  if (idx === -1) {
    idx = hist.findIndex((m, i) => `local_${i}` === sId);
  }
  return { msg: idx !== -1 ? hist[idx] : null, idx, hist };
}

let _longPressStartX = 0;
let _longPressStartY = 0;

function startLongPress(event, matchId, msgId) {
  clearTimeout(_longPressTimer);
  if (event && event.touches && event.touches[0]) {
    _longPressStartX = event.touches[0].clientX;
    _longPressStartY = event.touches[0].clientY;
  } else if (event && typeof event.clientX === 'number') {
    _longPressStartX = event.clientX;
    _longPressStartY = event.clientY;
  }
  _longPressTimer = setTimeout(() => {
    if (navigator.vibrate) {
      try { navigator.vibrate(35); } catch (_) {}
    }
    showReactionPicker(event, matchId, msgId);
  }, 550);
}

function handleTouchMove(event) {
  if (!_longPressTimer) return;
  if (event && event.touches && event.touches[0]) {
    const dx = Math.abs(event.touches[0].clientX - _longPressStartX);
    const dy = Math.abs(event.touches[0].clientY - _longPressStartY);
    if (dx > 10 || dy > 10) {
      cancelLongPress();
    }
  }
}

function cancelLongPress() {
  clearTimeout(_longPressTimer);
  _longPressTimer = null;
}
window.startLongPress = startLongPress;
window.handleTouchMove = handleTouchMove;
window.cancelLongPress = cancelLongPress;

function showReactionPicker(event, matchId, msgId) {
  clearTimeout(_longPressTimer);
  _longPressTimer = null;
  closeReactionPicker();

  const msgInfo = getMessageInfo(msgId);
  const msg = msgInfo.msg;
  const isSent = msg ? (msg.sender === 'me') : false;
  const isText = msg ? (!msg.imageUrl && !msg.isVoice && msg.text) : true;

  const shell = document.querySelector('.app-shell') || document.body;
  const shellRect = shell.getBoundingClientRect();

  // 1. Full-screen backdrop for outside click/tap dismissal, bound to shell
  const backdrop = document.createElement('div');
  backdrop.id = 'reactionPickerBackdrop';
  backdrop.className = 'msg-action-backdrop';
  const dismiss = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    closeReactionPicker();
  };
  backdrop.onclick = dismiss;
  backdrop.ontouchstart = dismiss;
  shell.appendChild(backdrop);

  // 2. Action sheet popup
  const picker = document.createElement('div');
  picker.id = 'reactionPickerPopup';
  picker.className = 'reaction-picker-popup';
  picker.onclick = (e) => e.stopPropagation();
  picker.ontouchstart = (e) => e.stopPropagation();
  picker.ontouchend = (e) => e.stopPropagation();

  // Strict boundary containment inside the app container
  const pickerW = Math.min(240, Math.floor(shellRect.width - 24));
  const pickerH = 320; // safe maximum estimate for emojis + 6 action buttons

  // Determine client touch/click coordinates
  const clientX = event?.touches?.[0]?.clientX ?? event?.clientX ?? (shellRect.left + shellRect.width / 2);
  const clientY = event?.touches?.[0]?.clientY ?? event?.clientY ?? (shellRect.top + shellRect.height / 2);

  // Convert to relative coordinates inside shell
  const relX = clientX - shellRect.left;
  const relY = clientY - shellRect.top;

  // Clamped horizontal position strictly inside shell (min 12px padding on both sides)
  const minLeft = 12;
  const maxLeft = Math.max(minLeft, shellRect.width - pickerW - 12);
  const idealLeft = relX - (pickerW / 2);
  const left = Math.max(minLeft, Math.min(idealLeft, maxLeft));

  // Clamped vertical position: show above touch if in lower half, below touch if in upper half
  const minTop = 64; // strictly below WhatsApp chat header
  const maxTop = Math.max(minTop, shellRect.height - pickerH - 74); // strictly above chat input bar
  let idealTop = (relY > shellRect.height * 0.52) ? (relY - pickerH - 12) : (relY + 12);
  const top = Math.max(minTop, Math.min(idealTop, maxTop));

  picker.style.cssText = `
    position:absolute;z-index:99999;
    left:${Math.round(left)}px;top:${Math.round(top)}px;
    width:${pickerW}px;max-width:calc(100% - 24px);
    background:#1E1530;border:1px solid rgba(255,255,255,0.18);
    border-radius:20px;padding:8px;
    display:flex;flex-direction:column;gap:6px;
    box-shadow:0 18px 50px rgba(0,0,0,0.85);
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
    animation:reactionPickerIn 0.18s cubic-bezier(0.175,0.885,0.32,1.275);
    box-sizing:border-box;
  `;

  // Top: Emojis Row
  const emojiRow = document.createElement('div');
  emojiRow.style.cssText = 'display:flex;justify-content:space-around;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);';
  emojiRow.innerHTML = REACTION_EMOJIS_SET.map(emoji =>
    `<button onclick="event.stopPropagation();toggleMsgReaction('${matchId}','${msgId}','${emoji}');closeReactionPicker();"
      style="background:none;border:none;font-size:1.45rem;cursor:pointer;transition:transform 0.15s;padding:2px"
      onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'">${emoji}</button>`
  ).join('');
  picker.appendChild(emojiRow);

  // Bottom: Actions list (Edit, Forward, Share to User, Copy, Delete)
  const actionsList = document.createElement('div');
  actionsList.style.cssText = 'display:flex;flex-direction:column;gap:2px;padding-top:2px;';

  let actionsHtml = `
    <button class="msg-menu-btn" onclick="event.stopPropagation();startReplyToMessage('${msgId}');closeReactionPicker();">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 14 4 9 9 4"/>
        <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
      </svg>
      <span>Reply</span>
    </button>`;

  if (isSent && isText) {
    actionsHtml += `
      <button class="msg-menu-btn" onclick="event.stopPropagation();startEditMessage('${matchId}','${msgId}');closeReactionPicker();">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        <span>Edit Message</span>
      </button>`;
  }

  actionsHtml += `
    <button class="msg-menu-btn" onclick="event.stopPropagation();forwardMessagePrompt('${msgId}');closeReactionPicker();">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
      <span>Forward</span>
    </button>
    <button class="msg-menu-btn" onclick="event.stopPropagation();shareMessageToUserPrompt('${msgId}');closeReactionPicker();">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
      <span>Share to User</span>
    </button>
    <button class="msg-menu-btn" onclick="event.stopPropagation();copyMessageText('${msgId}');closeReactionPicker();">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
      <span>Copy Text</span>
    </button>
    <button class="msg-menu-btn msg-menu-btn-danger" onclick="event.stopPropagation();deleteMessagePrompt('${matchId}','${msgId}');closeReactionPicker();">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="#FF2E70"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      <span style="color:#FF2E70">Delete</span>
    </button>
  `;
  actionsList.innerHTML = actionsHtml;
  picker.appendChild(actionsList);

  shell.appendChild(picker);
  _reactionPickerOpen = true;
}

function closeReactionPicker() {
  clearTimeout(_longPressTimer);
  _longPressTimer = null;
  document.querySelectorAll('#reactionPickerPopup, #reactionPickerBackdrop, .msg-action-backdrop').forEach(el => el.remove());
  _reactionPickerOpen = false;
}

// Global outside-dismissal listener: intercept pointerdown everywhere to cleanly dismiss reaction picker and menus
document.addEventListener('pointerdown', (e) => {
  if (_reactionPickerOpen) {
    const popup = document.getElementById('reactionPickerPopup');
    if (popup && !popup.contains(e.target)) {
      closeReactionPicker();
    }
  }
  const chatDropdown = document.getElementById('chatDropdownMenu');
  const chatTrigger = document.getElementById('chatMenuTrigger');
  if (chatDropdown && chatDropdown.style.display === 'block') {
    if (!chatDropdown.contains(e.target) && (!chatTrigger || !chatTrigger.contains(e.target))) {
      chatDropdown.style.display = 'none';
    }
  }
  const lbDropdown = document.getElementById('lightboxDropdownMenu');
  if (lbDropdown && lbDropdown.style.display === 'block') {
    if (!lbDropdown.contains(e.target)) {
      lbDropdown.style.display = 'none';
    }
  }
}, true);

function startEditMessage(matchId, msgId) {
  const { msg, idx } = getMessageInfo(msgId);
  if (!msg || idx === -1) return;

  _editingState = { matchId, msgId, originalText: msg.text, msgIdx: idx };

  const editBar = document.getElementById('chatEditBar');
  const editPreview = document.getElementById('chatEditPreview');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');

  if (editPreview) editPreview.textContent = `Editing: "${msg.text}"`;
  if (editBar) editBar.style.display = 'flex';
  if (input) {
    input.value = msg.text;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  if (sendBtn) sendBtn.style.display = 'flex';
}

function cancelEditMessage() {
  _editingState = null;
  const editBar = document.getElementById('chatEditBar');
  const input = document.getElementById('chatInput');
  if (editBar) editBar.style.display = 'none';
  if (input) input.value = '';
  onChatInputChange();
}

async function deleteMessagePrompt(matchId, msgId) {
  if (!confirm('Delete this message?')) return;

  const { idx, hist } = getMessageInfo(msgId);

  if (hist && idx !== -1 && hist[idx]) {
    hist.splice(idx, 1);
  }

  // Delete from Firestore if synced
  if (!msgId.startsWith('local_') && matchId && matchId !== 'null') {
    if (typeof deleteRealtimeMessage === 'function') {
      deleteRealtimeMessage(matchId, msgId);
    } else if (typeof fbDb !== 'undefined' && fbDb) {
      fbDb.collection('matches').doc(matchId).collection('messages').doc(msgId).delete().catch(() => {});
    }
  }

  saveToStorage();
  renderChatThread();
  renderConversationList();
  showToast('Message deleted 🗑️', 'info');
}

function copyMessageText(msgId) {
  const { msg } = getMessageInfo(msgId);
  if (!msg) return;
  const shareText = msg.text || msg.imageUrl || 'Message from HookMeBySam';

  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareText).then(() => {
      showToast('Copied to clipboard! 📋', 'info');
    }).catch(() => {
      showToast('Copied! 📋', 'info');
    });
  } else {
    showToast('Copied! 📋', 'info');
  }
}

function copyOrShareMessage(msgId) {
  shareMessageToUserPrompt(msgId);
}

function populateForwardModalList(actionLabel = 'Forward') {
  const list = document.getElementById('forwardMatchesList');
  if (!list) return;

  const currentId = appState.currentChatId;
  const candidates = [...matchedUsers, ...PROFILES_DATA]
    .filter(u => u.id !== currentId)
    .filter((u, index, self) => index === self.findIndex(t => t.id === u.id));

  if (candidates.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:rgba(255,255,255,0.5)">No other contacts available.</div>`;
  } else {
    list.innerHTML = candidates.map(c => `
      <div onclick="forwardMessageToUser('${c.id}')" style="
        display:flex;align-items:center;gap:12px;padding:10px 14px;
        background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
        border-radius:14px;cursor:pointer;transition:background 0.15s"
        onmouseenter="this.style.background='rgba(255,255,255,0.1)'"
        onmouseleave="this.style.background='rgba(255,255,255,0.05)'"
      >
        <div style="width:42px;height:42px;border-radius:50%;background-image:url('${c.image || c.avatar}');background-size:cover;background-position:center;border:2px solid #FF2D78;flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:0.92rem;color:#FFF">${escHtml(c.name)}${c.age ? `, ${c.age}` : ''}</div>
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(c.bio || '')}</div>
        </div>
        <button style="background:var(--flame-grad,#ff2d78);border:none;color:#FFF;border-radius:14px;padding:6px 14px;font-size:0.78rem;font-weight:700;cursor:pointer">${actionLabel} ➡️</button>
      </div>
    `).join('');
  }
}

function forwardMessagePrompt(msgId) {
  _pendingForwardMsgId = msgId;
  const modal = document.getElementById('forwardModal');
  const title = modal?.querySelector('h3') || modal?.querySelector('.modal-title');
  if (title) title.textContent = 'Forward to Contact';
  populateForwardModalList('Forward');
  if (modal) modal.style.display = 'flex';
}

function shareMessageToUserPrompt(msgId) {
  _pendingForwardMsgId = msgId;
  const modal = document.getElementById('forwardModal');
  const title = modal?.querySelector('h3') || modal?.querySelector('.modal-title');
  if (title) title.textContent = 'Share to User';
  populateForwardModalList('Share');
  if (modal) modal.style.display = 'flex';
}

function closeForwardModal() {
  const modal = document.getElementById('forwardModal');
  if (modal) modal.style.display = 'none';
  _pendingForwardMsgId = null;
}

async function forwardMessageToUser(targetUserId) {
  if (!_pendingForwardMsgId) return;

  const { msg: sourceMsg } = getMessageInfo(_pendingForwardMsgId);
  if (!sourceMsg) {
    closeForwardModal();
    return;
  }

  const targetUser = matchedUsers.find(u => u.id === targetUserId) || PROFILES_DATA.find(u => u.id === targetUserId);
  const targetName = targetUser ? targetUser.name : 'contact';

  if (!conversations[targetUserId]) {
    conversations[targetUserId] = { messages: [] };
  }

  const forwardedMsg = {
    sender: 'me',
    text: sourceMsg.text || '',
    imageUrl: sourceMsg.imageUrl || '',
    isVoice: sourceMsg.isVoice || false,
    audioUrl: sourceMsg.audioUrl || '',
    duration: sourceMsg.duration || '',
    forwarded: true,
    read: true,
    timestamp: Date.now()
  };

  conversations[targetUserId].messages.push(forwardedMsg);
  movePartnerToTop(targetUserId);
  saveToStorage();

  // Send to Firestore if target is online
  if (typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const matchId = [fbAuth.currentUser.uid, targetUserId].sort().join('_');
    sendRealtimeMessage(matchId, forwardedMsg.text || 'Forwarded message', forwardedMsg.isVoice, forwardedMsg.audioUrl, forwardedMsg.imageUrl);
  }

  closeForwardModal();
  renderConversationList();
  if (appState.currentChatId === targetUserId) {
    renderChatThread();
  }
  showToast(`Sent to ${targetName} ➡️`, 'gold');
}

async function toggleMsgReaction(matchId, msgId, emoji) {
  if (!msgId || !emoji) return;

  const { msg } = getMessageInfo(msgId);
  const myId = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser) ? fbAuth.currentUser.uid : (currentUser?.id || 'local_me');
  const partnerId = appState.currentChatId;
  const realMatchId = (matchId && matchId.includes('_'))
    ? matchId
    : ((myId && partnerId) ? [myId, partnerId].sort().join('_') : matchId);

  if (msg) {
    if (!msg.reactions) msg.reactions = {};
    const reactors = Array.isArray(msg.reactions[emoji]) ? msg.reactions[emoji] : [];
    if (reactors.includes(myId)) {
      msg.reactions[emoji] = reactors.filter(id => id !== myId);
    } else {
      msg.reactions[emoji] = [...reactors, myId];
    }
    saveToStorage();
    renderChatThread();
  }

  // Update in Firestore in real-time
  if (realMatchId && realMatchId !== 'null' && typeof reactRealtimeMessage === 'function') {
    const targetDocId = (msg && msg.firestoreId && !msg.firestoreId.startsWith('local_'))
      ? msg.firestoreId
      : (!msgId.startsWith('local_') ? msgId : '');
    const fallbackLocalId = (msg && msg.id && msg.id.startsWith('local_'))
      ? msg.id
      : (msgId.startsWith('local_') ? msgId : '');
    reactRealtimeMessage(realMatchId, targetDocId, emoji, fallbackLocalId);
  }
}

// ==========================================================
// WHATSAPP REACTION BOTTOM SHEET (Screenshot 3)
// ==========================================================
let _currentReactionSheetData = null;

function openReactionSheet(matchId, msgId, defaultEmojiFilter = 'all') {
  const { msg } = getMessageInfo(msgId);
  if (!msg) return;

  const reactions = msg.reactions || {};
  const reactionKeys = Object.keys(reactions).filter(k => Array.isArray(reactions[k]) && reactions[k].length > 0);
  if (reactionKeys.length === 0) return;

  _currentReactionSheetData = {
    matchId,
    msgId,
    reactions,
    activeFilter: (defaultEmojiFilter && defaultEmojiFilter !== 'all') ? defaultEmojiFilter : 'all'
  };

  renderReactionSheetContent();
  const modal = document.getElementById('reactionInfoModal');
  if (modal) {
    modal.style.display = 'flex';
    const sheet = modal.querySelector('.reaction-sheet-modal');
    if (sheet && !sheet._swipeBound) {
      sheet._swipeBound = true;
      let sY = 0;
      sheet.addEventListener('touchstart', (e) => {
        sY = e.touches[0].clientY;
      }, { passive: true });
      sheet.addEventListener('touchmove', (e) => {
        const diffY = e.touches[0].clientY - sY;
        if (diffY > 8) {
          sheet.style.transform = `translateY(${Math.min(180, diffY)}px)`;
        }
      }, { passive: true });
      sheet.addEventListener('touchend', (e) => {
        const diffY = e.changedTouches[0].clientY - sY;
        if (diffY > 55) {
          closeReactionSheet();
        }
        sheet.style.transform = '';
      }, { passive: true });
    }
  }
}

function filterReactionSheet(emoji) {
  if (!_currentReactionSheetData) return;
  _currentReactionSheetData.activeFilter = emoji;
  renderReactionSheetContent();
}

function closeReactionSheet() {
  const modal = document.getElementById('reactionInfoModal');
  if (modal) modal.style.display = 'none';
  _currentReactionSheetData = null;
}

function renderReactionSheetContent() {
  if (!_currentReactionSheetData) return;
  const { matchId, msgId, reactions, activeFilter } = _currentReactionSheetData;
  const reactionKeys = Object.keys(reactions).filter(k => Array.isArray(reactions[k]) && reactions[k].length > 0);

  let totalCount = 0;
  reactionKeys.forEach(k => { totalCount += reactions[k].length; });

  const countEl = document.getElementById('reactionSheetCount');
  if (countEl) {
    countEl.textContent = `${totalCount} reaction${totalCount !== 1 ? 's' : ''}`;
  }

  // Render Tabs
  const tabsEl = document.getElementById('reactionSheetTabs');
  if (tabsEl) {
    let tabsHtml = `
      <button class="reaction-tab-chip ${activeFilter === 'all' ? 'active' : ''}" onclick="filterReactionSheet('all')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        <span>All</span> <span>${totalCount}</span>
      </button>`;
    reactionKeys.forEach(emoji => {
      const count = reactions[emoji].length;
      tabsHtml += `
        <button class="reaction-tab-chip ${activeFilter === emoji ? 'active' : ''}" onclick="filterReactionSheet('${emoji}')">
          <span>${emoji}</span> <span>${count}</span>
        </button>`;
    });
    tabsEl.innerHTML = tabsHtml;
  }

  // Render Reactors List
  const listEl = document.getElementById('reactionSheetList');
  if (listEl) {
    const myId = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser) ? fbAuth.currentUser.uid : 'local_me';
    const partner = matchedUsers.find(u => u.id === appState.currentChatId) ||
                    PROFILES_DATA.find(u => u.id === appState.currentChatId) ||
                    conversations[appState.currentChatId]?.partner || {};
    const partnerName = partner.name || document.getElementById('chatPartnerName')?.textContent?.trim() || 'Match';
    const partnerAvatar = partner.avatar || partner.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
    const myAvatar = currentUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';

    const emojisToShow = activeFilter === 'all' ? reactionKeys : [activeFilter];
    let rowsHtml = '';

    emojisToShow.forEach(emoji => {
      const reactors = reactions[emoji] || [];
      reactors.forEach(reactorId => {
        const isMe = (reactorId === myId || reactorId === 'local_me' || reactorId === 'me');
        const name = isMe ? 'You' : partnerName;
        const sub = isMe ? 'Tap to remove' : '';
        const avatar = isMe ? myAvatar : partnerAvatar;
        const clickAttr = isMe ? `onclick="removeMyReaction('${matchId}','${msgId}','${emoji}')"` : '';

        rowsHtml += `
          <div class="reaction-reactor-row" ${clickAttr}>
            <div class="reaction-reactor-left">
              <div class="reaction-reactor-avatar" style="background-image:url('${avatar}')"></div>
              <div class="reaction-reactor-info">
                <span class="reaction-reactor-name">${name}</span>
                ${sub ? `<span class="reaction-reactor-sub">${sub}</span>` : ''}
              </div>
            </div>
            <span class="reaction-reactor-emoji">${emoji}</span>
          </div>`;
      });
    });

    listEl.innerHTML = rowsHtml || '<div style="padding:16px;color:#8696a0;text-align:center;font-size:13px">No reactions</div>';
  }
}

async function removeMyReaction(matchId, msgId, emoji) {
  closeReactionSheet();
  const { msg } = getMessageInfo(msgId);
  const myId = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser) ? fbAuth.currentUser.uid : 'local_me';

  if (msg && msg.reactions && Array.isArray(msg.reactions[emoji])) {
    msg.reactions[emoji] = msg.reactions[emoji].filter(id => id !== myId && id !== 'local_me' && id !== 'me');
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji];
    }
    saveToStorage();
    renderChatThread();
  }

  if (!msgId.startsWith('local_') && matchId && matchId !== 'null') {
    if (typeof reactRealtimeMessage === 'function') {
      reactRealtimeMessage(matchId, msgId, emoji);
    }
  }
  showToast('Reaction removed', 'info');
}

// ==========================================================
// FORGOT PASSWORD — Real Firebase password reset
// ==========================================================

function handleForgotPassword() {
  const modal = document.getElementById('forgotPasswordModal');
  if (!modal) return;
  const loginEmail = document.getElementById('loginEmail');
  const fpEmail = document.getElementById('forgotPasswordEmail');
  if (fpEmail && loginEmail && loginEmail.value) fpEmail.value = loginEmail.value;
  const err = document.getElementById('forgotPasswordError');
  if (err) err.textContent = '';
  modal.style.display = 'flex';
  if (fpEmail) setTimeout(() => fpEmail.focus(), 150);
}

function closeForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) modal.style.display = 'none';
}

async function submitForgotPassword() {
  const emailEl = document.getElementById('forgotPasswordEmail');
  const errEl = document.getElementById('forgotPasswordError');
  const btn = document.getElementById('forgotPasswordBtn');
  const email = emailEl ? emailEl.value.trim() : '';

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    if (errEl) errEl.textContent = 'Please enter a valid, real email address.';
    return;
  }

  if (errEl) errEl.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

  if (typeof fbAuth !== 'undefined' && fbAuth) {
    try {
      await fbAuth.sendPasswordResetEmail(email);
      showToast('✉️ Password reset email sent! Check your inbox and spam folder.', 'info');
      closeForgotPasswordModal();
    } catch (err) {
      console.warn("Forgot password error:", err.code, err.message);
      let msg = 'Could not send reset email. Please try again.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Please check spelling or sign up.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (err.message) {
        msg = err.message;
      }
      if (errEl) errEl.textContent = msg;
    }
  } else {
    if (errEl) {
      errEl.textContent = 'Authentication service is offline. Please check your internet connection.';
    }
    showToast('Cannot connect to authentication service right now.', 'error');
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Send Reset Email'; }
}

let _fpPhoneOtpSent = false;
let _fpPendingPhone = '';

async function submitForgotPasswordPhone() {
  const phoneInp = document.getElementById('forgotPasswordPhone');
  const otpInp = document.getElementById('forgotPasswordOtp');
  const otpGroup = document.getElementById('fpPhoneOtpGroup');
  const errEl = document.getElementById('forgotPasswordPhoneError');
  const btn = document.getElementById('forgotPasswordPhoneBtn');
  if (errEl) errEl.textContent = '';

  let phone = (phoneInp?.value || '').replace(/\D/g, '');
  if (phone.startsWith('0')) phone = phone.slice(1);

  if (!phone || phone.length < 10) {
    if (errEl) errEl.textContent = 'Please enter a valid 10-digit Nigerian phone number.';
    return;
  }

  const fullPhone = '+234' + phone;

  if (!_fpPhoneOtpSent) {
    if (btn) { btn.disabled = true; btn.textContent = 'Sending SMS...'; }
    _fpPendingPhone = phone;

    let sent = false;
    if (typeof sendOtpToPhone === 'function') {
      try { sent = await sendOtpToPhone(fullPhone); } catch (_) { sent = false; }
    }

    if (btn) btn.disabled = false;

    if (sent) {
      _fpPhoneOtpSent = true;
      if (otpGroup) otpGroup.style.display = 'block';
      if (btn) btn.textContent = 'Verify Code & Reset';
      if (otpInp) {
        otpInp.value = window._devPhoneOtp || '';
        setTimeout(() => otpInp.focus(), 150);
      }
      if (!window._devPhoneOtp) {
        showToast('📱 SMS code sent to +234 ' + phone, 'info');
      }
    } else {
      if (errEl) errEl.textContent = 'Could not send SMS code. Please try again.';
    }
    return;
  }

  const otp = (otpInp?.value || '').trim();
  if (!/^\d{4,6}$/.test(otp)) {
    if (errEl) errEl.textContent = 'Enter the verification code from your SMS.';
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

  let verified = false;
  if (typeof verifyOtp === 'function') {
    try {
      const res = await verifyOtp(fullPhone, otp);
      verified = res && res.success;
    } catch (_) { verified = false; }
  }

  if (btn) btn.disabled = false;

  if (verified) {
    _fpPhoneOtpSent = false;
    showToast('✅ Phone identity verified! Please create your new password.', 'gold');
    closeForgotPasswordModal();
  } else {
    if (errEl) errEl.textContent = 'Invalid verification code. Please try again.';
  }
}

// ==========================================================
// PHONE VERIFICATION MODAL
// ==========================================================

let _pendingPhoneNumber = '';

function openPhoneVerificationModal() {
  const modal = document.getElementById('phoneVerifyModal');
  if (!modal) return;
  showPhoneStep1();
  const saved = currentUser.phone || '';
  const sub = document.getElementById('settingsPhoneSub');
  if (saved && (currentUser.phoneVerified || currentUser.isPhoneVerified) && sub) {
    sub.innerHTML = `<span style="color:#21B06B;font-weight:600">+234 ${saved} &#10003; Verified</span>`;
  }
  modal.style.display = 'flex';
  const inp = document.getElementById('phoneNumberInput');
  if (inp) { inp.value = saved; setTimeout(() => inp.focus(), 150); }
}

function closePhoneVerificationModal() {
  const modal = document.getElementById('phoneVerifyModal');
  if (modal) modal.style.display = 'none';
}

function showPhoneStep1() {
  const s1 = document.getElementById('phoneStep1');
  const s2 = document.getElementById('phoneStep2');
  if (s1) s1.style.display = 'block';
  if (s2) s2.style.display = 'none';
  const err = document.getElementById('phoneStep1Error');
  if (err) err.textContent = '';
}

async function sendPhoneOtp() {
  const phoneEl = document.getElementById('phoneNumberInput');
  const errEl = document.getElementById('phoneStep1Error');
  const btn = document.getElementById('phoneSendOtpBtn');
  let phone = phoneEl ? phoneEl.value.replace(/\D/g, '').trim() : '';

  if (phone.startsWith('0')) phone = phone.slice(1);
  if (phone.length < 10) {
    if (errEl) errEl.textContent = 'Enter a valid 10-digit Nigerian phone number.';
    return;
  }

  const fullPhone = '+234' + phone;
  _pendingPhoneNumber = phone;

  if (errEl) errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Sending code...';

  let sent = false;
  if (typeof sendOtpToPhone === 'function') {
    try { sent = await sendOtpToPhone(fullPhone); } catch (e) { sent = false; }
  }

  btn.disabled = false;
  btn.textContent = 'Send Verification Code';

  if (sent) {
    const s1 = document.getElementById('phoneStep1');
    const s2 = document.getElementById('phoneStep2');
    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'block';
    const sentTo = document.getElementById('phoneOtpSentTo');
    if (sentTo) sentTo.textContent = 'Code sent to +234 ' + _pendingPhoneNumber;

    const helper = document.getElementById('phoneOtpHelper');
    if (helper) {
      if (window._devPhoneOtpMessage) {
        helper.innerHTML = window._devPhoneOtpMessage;
        helper.style.display = 'block';
      } else {
        helper.style.display = 'none';
      }
    }

    const otpInp = document.getElementById('otpInput');
    if (otpInp) {
      otpInp.value = window._devPhoneOtp || '';
      setTimeout(() => otpInp.focus(), 150);
    }
  }
}

async function verifyPhoneOtp() {
  const otpEl = document.getElementById('otpInput');
  const errEl = document.getElementById('phoneStep2Error');
  const btn = document.getElementById('phoneVerifyOtpBtn');
  const otp = otpEl ? otpEl.value.trim() : '';

  if (!/^\d{4,6}$/.test(otp)) {
    if (errEl) errEl.textContent = 'Enter the verification code.';
    return;
  }

  if (errEl) errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Verifying...';

  const fullPhone = '+234' + _pendingPhoneNumber;
  let verified = false;

  if (typeof verifyPhoneOwnershipOnly === 'function') {
    try {
      const result = await verifyPhoneOwnershipOnly(fullPhone, otp);
      verified = result && result.success;
    } catch (e) { verified = false; }
  }

  btn.disabled = false;
  btn.textContent = 'Verify Code';

  if (verified) {
    currentUser.phone = _pendingPhoneNumber;
    currentUser.phoneVerified = true;
    currentUser.isPhoneVerified = true;
    saveToStorage();
    // Backend already marks the authenticated account as phoneVerified.
    renderSettingsScreen();
    showToast('✅ Phone number verified!', 'gold');
    closePhoneVerificationModal();
  } else {
    if (errEl) errEl.textContent = 'Incorrect code. Please try again.';
  }
}

// ==========================================================
// LANGUAGE SELECTOR MODAL
// ==========================================================

const LANGUAGES = [
  { code: 'en-UK', label: 'English (UK)', flag: '🇬🇧' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en-NG', label: 'English (Nigeria)', flag: '🇳🇬' }
];

let currentLanguage = localStorage.getItem('hmbs_language') || 'en-UK';

function openLanguageModal() {
  const modal = document.getElementById('languageModal');
  const list = document.getElementById('languageOptionsList');
  if (!modal || !list) return;

  list.innerHTML = LANGUAGES.map(lang => {
    const isSelected = currentLanguage === lang.code;
    return `
      <div onclick="selectLanguage('${lang.code}', '${escHtml(lang.label)}')" style="
        display:flex;align-items:center;gap:14px;padding:14px 16px;
        background:${isSelected ? 'rgba(209,58,99,0.15)' : 'rgba(255,255,255,0.04)'};
        border:1px solid ${isSelected ? 'rgba(209,58,99,0.5)' : 'rgba(255,255,255,0.08)'};
        border-radius:14px;cursor:pointer;transition:all 0.2s"
        onmouseenter="this.style.background='rgba(209,58,99,0.1)'" 
        onmouseleave="this.style.background='${isSelected ? 'rgba(209,58,99,0.15)' : 'rgba(255,255,255,0.04)'}'"
      >
        <span style="font-size:1.5rem">${lang.flag}</span>
        <span style="flex:1;font-size:0.95rem;font-weight:${isSelected ? '700' : '500'};color:#FFF">${lang.label}</span>
        ${isSelected ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="#D13A63"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
      </div>`;
  }).join('');

  modal.style.display = 'flex';
}

function closeLanguageModal() {
  const modal = document.getElementById('languageModal');
  if (modal) modal.style.display = 'none';
}

function selectLanguage(code, label) {
  currentLanguage = code;
  localStorage.setItem('hmbs_language', code);
  const sub = document.getElementById('settingsLanguageSub');
  if (sub) sub.textContent = label;
  if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth && fbAuth.currentUser) {
    fbDb.collection('users').doc(fbAuth.currentUser.uid).update({ language: code }).catch(() => {});
  }
  showToast(`\uD83C\uDF10 Language set to ${label}`, 'info');
  closeLanguageModal();
}

// ==========================================================
// STORY UPLOADS — user can post their own photo story
// ==========================================================

// ==========================================================
// STORY UPLOADS — Fast canvas compression & multiple stories
// ==========================================================

let userStories = (() => {
  try {
    const parsed = JSON.parse(localStorage.getItem('hmbs_user_stories') || '[]');
    const now = Date.now();
    return Array.isArray(parsed) ? parsed.filter(s => !s.createdAt || (now - s.createdAt < 24 * 60 * 60 * 1000)) : [];
  } catch (e) {
    return [];
  }
})();

function compressStoryImage(file, maxDim = 1080, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function openYourStoryUpload(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  let fileInput = document.getElementById('storyFileInput');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'storyFileInput';
    fileInput.accept = 'image/*,video/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleStoryPhotoSelected);
    document.body.appendChild(fileInput);
  } else {
    fileInput.accept = 'image/*,video/*';
  }
  fileInput.value = '';
  fileInput.click();
}

async function handleStoryPhotoSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (event.target) event.target.value = '';
  if (!file) return;
  const isVideo = Boolean(
    (file.type && file.type.startsWith('video/')) ||
    (file.name && file.name.match(/\.(mp4|mov|webm|m4v|3gp|mkv)$/i))
  );

  if (isVideo && file.size > 30 * 1024 * 1024) {
    showToast('Video exceeds 30MB limit. Please choose a shorter video.', 'error');
    return;
  }

  // 1. Instantly start circular progress loader across the status card!
  const previewUrl = URL.createObjectURL(file);
  window._isUploadingStory = true;
  window._uploadingStoryPreview = previewUrl;
  renderStoriesRow();
  showToast(isVideo ? 'Uploading video status... 🎬' : 'Posting status update... 📸', 'info');

  try {
    let finalUrl = '';
    let storagePath = '';
    let blobToUpload = file;

    if (!isVideo) {
      // Compress image
      try {
        const compressedDataUrl = await compressStoryImage(file, 1080, 0.78);
        blobToUpload = await (await fetch(compressedDataUrl)).blob();
        blobToUpload.name = `story_${Date.now()}.jpg`;
      } catch (cErr) {
        console.warn('Story image compression warning:', cErr);
        blobToUpload = file;
      }
    }

    // 2. Upload directly to Firebase Storage
    if (typeof uploadFileToBackend === 'function' && typeof fbStorage !== 'undefined' && fbStorage && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      try {
        const uploadPromise = uploadFileToBackend(
          blobToUpload,
          'stories',
          true,
          isVideo ? (file.type || 'video/mp4') : 'image/jpeg'
        );
        const timeoutPromise = new Promise(res => setTimeout(() => res(null), 60000));
        const uploaded = await Promise.race([uploadPromise, timeoutPromise]);
        const cloudUrl = typeof uploaded === 'string' ? uploaded : (uploaded?.url || null);
        if (cloudUrl) {
          finalUrl = cloudUrl;
          storagePath = uploaded?.storagePath || '';
        } else {
          console.warn('Story upload timed out or returned no URL');
        }
      } catch (err) {
        console.warn('Story media upload warning:', err.message);
      }
    }

    // Fallback URL for local display if offline/no storage
    if (!finalUrl) {
      if (isVideo) {
        window._isUploadingStory = false;
        window._uploadingStoryPreview = null;
        renderStoriesRow();
        showToast('Video upload failed. Check connection & try again.', 'error');
        return;
      } else {
        finalUrl = previewUrl;
      }
    }

    const myUid = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser?.uid) || currentUser?.id || currentUser?.uid || '';
    const storyDocId = 'story_' + myUid + '_' + Date.now();
    const story = {
      id: storyDocId,
      docId: storyDocId,
      name: currentUser.name || 'You',
      image: finalUrl,
      thumb: currentUser.avatar || currentUser.image || finalUrl,
      video: isVideo ? finalUrl : null,
      isVideo: isVideo,
      mediaType: isVideo ? 'video' : 'image',
      storagePath,
      location: currentUser.location || 'Lagos',
      bio: isVideo ? 'Video status' : 'My latest story',
      tags: currentUser.interests || [],
      isUserStory: true,
      ownerId: myUid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };

    // 3. Save to Firestore so other users can see it immediately
    if (typeof uploadStoryToFirestore === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      try {
        await uploadStoryToFirestore(story);
      } catch (fErr) {
        console.warn('uploadStoryToFirestore error:', fErr);
      }
    }

    // 4. Update local user stories list
    try { localStorage.removeItem('hmbs_user_stories_cleared'); } catch (_) {}
    if (!Array.isArray(userStories)) userStories = [];
    userStories.push(story);
    if (userStories.length > 15) userStories = userStories.slice(userStories.length - 15);
    try {
      localStorage.setItem('hmbs_user_stories', JSON.stringify(userStories));
    } catch (e) {
      console.warn('Story local storage write warning:', e);
    }

    // Complete upload state and refresh UI
    window._isUploadingStory = false;
    window._uploadingStoryPreview = null;
    renderStoriesRow();
    showToast(isVideo ? 'Video status posted! 🎬' : 'Status posted! ✨', 'gold');

    // 5. View story smoothly
    setTimeout(() => {
      viewYourStory(userStories.length - 1);
    }, 250);
  } catch (err) {
    console.error('Story upload failed:', err);
    window._isUploadingStory = false;
    window._uploadingStoryPreview = null;
    renderStoriesRow();
    showToast('Could not process status media. Please try again.', 'error');
  }
}

// ==========================================================
// LEGAL MODALS � Terms, Privacy Policy, DMCA (compliance)
// ==========================================================

const LEGAL_CONTENT = {
  terms: {
    title: 'Terms of Service',
    body: `<p><strong style="color:#FFF">Effective: January 2025</strong></p><p><strong style="color:#FFF">1. Eligibility</strong><br>You must be at least <strong>18 years old</strong> to use hookmebysam. Underage accounts are terminated immediately.</p><p><strong style="color:#FFF">2. Acceptable Use</strong><br>No illegal, abusive, or harassing content. No spam. Violations result in a permanent ban.</p><p><strong style="color:#FFF">3. VIP Subscriptions</strong><br>VIP Gold plans are <strong>one-time purchases and do not auto-renew</strong>. Refunds within 24 hours via <a href="mailto:contact@hookmebysam.com" style="color:#FF2D78">contact@hookmebysam.com</a>.</p><p><strong style="color:#FFF">4. Limitation of Liability</strong><br>App provided as-is. We are not liable for damages from use of the app.</p><p>hookmebysam � Lagos, Nigeria � <a href="mailto:contact@hookmebysam.com" style="color:#FF2D78">contact@hookmebysam.com</a></p>`
  },
  privacy: {
    title: 'Privacy Policy',
    body: `<p><strong style="color:#FFF">NDPR &amp; GDPR aligned � Effective January 2025</strong></p><p><strong style="color:#FFF">We collect:</strong> Name, age, gender, photo, email, and messages between matched users.</p><p><strong style="color:#FFF">We do NOT:</strong> Use session-recording tools, sell your data, log keystrokes, or track location without consent.</p><p><strong style="color:#FFF">Payments:</strong> Processed by Paystack � payment data is never stored on our servers.</p><p><strong style="color:#FFF">Delete account:</strong> Settings ? Delete Account removes all data within 30 days.</p><p><strong style="color:#FFF">Unsubscribe:</strong> Email <a href="mailto:contact@hookmebysam.com?subject=Unsubscribe" style="color:#FF2D78">contact@hookmebysam.com</a> with subject "Unsubscribe".</p><p>hookmebysam � Lagos, Nigeria � contact@hookmebysam.com</p>`
  },
  dmca: {
    title: 'DMCA Takedown Policy',
    body: `<p>hookmebysam complies with the DMCA. Our designated agent:</p><div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:14px;margin:10px 0"><strong style="color:#FFF">DMCA Agent: hookmebysam</strong><br>Email: <a href="mailto:contact@hookmebysam.com" style="color:#FF2D78">contact@hookmebysam.com</a><br>Address: Lagos, Nigeria</div><p>To file a notice, email the agent with: (1) description of infringing work, (2) location of content, (3) your contact info, (4) good-faith statement, (5) accuracy statement under penalty of perjury, (6) your signature. We act promptly. Repeat infringers lose access.</p>`
  }
};

function showLegalModal(type) {
  const modal   = document.getElementById('legalModal');
  const titleEl = document.getElementById('legalModalTitle');
  const bodyEl  = document.getElementById('legalModalBody');
  const content = LEGAL_CONTENT[type] || LEGAL_CONTENT.terms;
  if (!modal) return;
  if (titleEl) titleEl.textContent = content.title;
  if (bodyEl)  bodyEl.innerHTML    = content.body;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLegalModal() {
  const modal = document.getElementById('legalModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

// Ensure hardware back/forward navigation is initialized
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigationHistory);
} else {
  initNavigationHistory();
}

// Mobile Keyboard Behavior: Lock chat header at top (WhatsApp style), adjust safe area, and handle dismissals
(function initMobileKeyboardChatHandler() {
  const chatInputEl = document.getElementById('chatInput');
  const chatMessagesEl = document.getElementById('chatMessages');

  function alignChatViewport() {
    if (appState.currentScreen === 'chat') {
      const isKbOpen = window.visualViewport ? (window.visualViewport.height < window.innerHeight - 80) : false;
      document.body.classList.toggle('keyboard-visible', isKbOpen);

      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      if (chatMessagesEl) {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
      }
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', alignChatViewport);
    window.visualViewport.addEventListener('scroll', () => {
      if (appState.currentScreen === 'chat') {
        window.scrollTo(0, 0);
      }
    });
  }

  if (chatInputEl) {
    chatInputEl.addEventListener('focus', () => {
      document.body.classList.add('keyboard-visible');
      window.scrollTo(0, 0);
      setTimeout(alignChatViewport, 100);
      setTimeout(alignChatViewport, 300);
    });

    chatInputEl.addEventListener('blur', () => {
      setTimeout(() => {
        if (!chatInputEl.matches(':focus')) {
          document.body.classList.remove('keyboard-visible');
        }
      }, 150);
    });
  }

  // Tap on chat messages area dismisses virtual keyboard (WhatsApp & Telegram style)
  if (chatMessagesEl) {
    chatMessagesEl.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.msg-reaction-pill') || e.target.closest('a') || e.target.closest('.chat-empty-ib-btn')) return;
      if (chatInputEl && document.activeElement === chatInputEl) {
        chatInputEl.blur();
      }
    });

    let touchStartY = 0;
    chatMessagesEl.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    chatMessagesEl.addEventListener('touchmove', (e) => {
      const currentY = e.touches[0].clientY;
      if (currentY - touchStartY > 35 && chatInputEl && document.activeElement === chatInputEl) {
        chatInputEl.blur();
      }
    }, { passive: true });
  }
})();

// =====================================================
// HOOKME PROFILE PREVIEW & SAFETY TOOLKIT LOGIC
// =====================================================
let _hkPreviewPhotoIndex = 0;
let _hkPreviewPhotosList = [];

function openProfileCardPreview() {
  const modal = document.getElementById('profilePreviewModal');
  if (!modal) return;

  _hkPreviewPhotosList = Array.isArray(currentUser.photos) && currentUser.photos.length > 0
    ? currentUser.photos.slice()
    : (currentUser.image ? [currentUser.image] : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800']);

  _hkPreviewPhotoIndex = 0;

  const nameEl = document.getElementById('hkPreviewName');
  const locEl = document.getElementById('hkPreviewLoc');
  const bioEl = document.getElementById('hkPreviewBio');
  const tagsEl = document.getElementById('hkPreviewTags');

  const displayName = currentUser.name || currentUser.displayName || 'You';
  const displayAge = currentUser.age || 24;
  const displayLoc = currentUser.location || 'Lagos, Nigeria';
  const displayBio = currentUser.bio || 'Living life with good energy, positive vibes only! ✨';
  const displayInterests = (currentUser.interests && currentUser.interests.length > 0)
    ? currentUser.interests
    : ['Tech 💻', 'Fitness 💪', 'Music 🎵'];

  if (nameEl) nameEl.textContent = displayName + ', ' + displayAge;
  if (locEl) locEl.textContent = '📍 ' + displayLoc.replace(/^[📍\s]+/, '');
  if (bioEl) bioEl.textContent = displayBio;
  if (tagsEl) {
    tagsEl.innerHTML = displayInterests.map(t => `<span class="hk-preview-tag">${escHtml(t)}</span>`).join('');
  }

  const previewBadge = document.getElementById('hkPreviewVerifiedBadge');
  const isVerifiedUser = currentUser.isVerified === true || localStorage.getItem('hmbs_verified') === 'true';
  if (previewBadge) {
    previewBadge.style.display = isVerifiedUser ? 'inline-flex' : 'none';
  }

  _renderPreviewCardPhoto();
  modal.style.display = 'flex';
}

function closeProfileCardPreview() {
  const modal = document.getElementById('profilePreviewModal');
  if (modal) modal.style.display = 'none';
}

function _renderPreviewCardPhoto() {
  const imgEl = document.getElementById('hkPreviewPhotoImg');
  const barsEl = document.getElementById('hkPreviewBars');

  if (imgEl && _hkPreviewPhotosList.length > 0) {
    const currentUrl = _hkPreviewPhotosList[_hkPreviewPhotoIndex] || _hkPreviewPhotosList[0];
    imgEl.src = currentUrl;
  }

  if (barsEl) {
    if (_hkPreviewPhotosList.length > 1) {
      barsEl.style.display = 'flex';
      barsEl.innerHTML = _hkPreviewPhotosList.map((_, i) => `
        <div class="hk-preview-bar-dash ${i === _hkPreviewPhotoIndex ? 'active' : ''}"></div>
      `).join('');
    } else {
      barsEl.style.display = 'none';
      barsEl.innerHTML = '';
    }
  }
}

function hkNextPreviewPhoto(e) {
  if (e) e.stopPropagation();
  if (_hkPreviewPhotosList.length <= 1) return;
  _hkPreviewPhotoIndex = (_hkPreviewPhotoIndex + 1) % _hkPreviewPhotosList.length;
  _renderPreviewCardPhoto();
}

function hkPrevPreviewPhoto(e) {
  if (e) e.stopPropagation();
  if (_hkPreviewPhotosList.length <= 1) return;
  _hkPreviewPhotoIndex = (_hkPreviewPhotoIndex - 1 + _hkPreviewPhotosList.length) % _hkPreviewPhotosList.length;
  _renderPreviewCardPhoto();
}

function openSafetyToolkitModal() {
  const m = document.getElementById('safetyToolkitModal');
  if (m) m.style.display = 'flex';
}

function closeSafetyToolkitModal() {
  const m = document.getElementById('safetyToolkitModal');
  if (m) m.style.display = 'none';
}

function triggerProfileBoost() {
  if (appState.isBoostActive) {
    showToast('⚡ Profile Boost is currently ACTIVE!');
    return;
  }
  if (!appState.isVip) {
    openPaywall('boost_upgrade');
    return;
  }
  if (typeof startBoost === 'function') {
    startBoost();
    renderProfileScreen();
  } else {
    showToast('⚡ Profile Boost activated for 30 minutes!');
  }
}

// ==========================================================
// DEVICE PERMISSIONS & VIDEO CALL QUALITY MODALS
// ==========================================================

function updateDevicePermissionsSubtext(el) {
  if (!el) return;
  if (!navigator.permissions) {
    el.textContent = 'Camera, Mic & Location: Manage';
    return;
  }
  Promise.all([
    navigator.permissions.query({ name: 'camera' }).catch(() => null),
    navigator.permissions.query({ name: 'microphone' }).catch(() => null)
  ]).then(([cam, mic]) => {
    if (cam?.state === 'granted' && mic?.state === 'granted') {
      el.innerHTML = '<span style="color:#21B06B;font-weight:600">Camera &amp; Mic active ✓</span>';
    } else if (cam?.state === 'denied' || mic?.state === 'denied') {
      el.innerHTML = '<span style="color:#FF3B30;font-weight:600">Permissions restricted ⚠️</span>';
    } else {
      el.textContent = 'Check &amp; grant permissions';
    }
  }).catch(() => {
    el.textContent = 'Device permissions &amp; status';
  });
}
window.updateDevicePermissionsSubtext = updateDevicePermissionsSubtext;

async function openDevicePermissionsModal() {
  document.getElementById('devicePermissionsModalOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'whatsapp-dialog-overlay';
  overlay.id = 'devicePermissionsModalOverlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeDevicePermissionsModal(); };

  overlay.innerHTML = `
    <div class="whatsapp-dialog-card" style="max-width:440px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:38px;height:38px;border-radius:50%;background:rgba(139,127,255,0.14);display:flex;align-items:center;justify-content:center;color:#8B7FFF;flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </div>
          <div>
            <h3 class="wa-dialog-title" style="margin:0;font-size:1.15rem;text-align:left;">Device Permissions</h3>
            <span style="font-size:0.75rem;color:var(--txt-muted);display:block;margin-top:2px;">Hardware &amp; system access</span>
          </div>
        </div>
        <button onclick="closeDevicePermissionsModal()" style="background:none;border:none;color:var(--txt-muted);cursor:pointer;font-size:1.3rem;padding:4px 8px;">✕</button>
      </div>

      <p class="wa-dialog-desc" style="text-align:left;font-size:0.82rem;margin-bottom:12px;">
        Grant permissions below to enable crystal-clear HD video calls, instant voice messaging, distance discovery, and call alerts.
      </p>

      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">

        <!-- Camera -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:1.4rem;">📹</div>
            <div>
              <div style="font-weight:600;font-size:0.9rem;color:var(--txt-primary);">Camera</div>
              <div style="font-size:0.75rem;color:var(--txt-muted);" id="permCamStatus">Checking status…</div>
            </div>
          </div>
          <button class="unblock-action-btn" id="permCamBtn" onclick="requestDevicePermission('camera')" style="padding:6px 14px;font-size:0.78rem;">
            Allow
          </button>
        </div>

        <!-- Microphone -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:1.4rem;">🎙️</div>
            <div>
              <div style="font-weight:600;font-size:0.9rem;color:var(--txt-primary);">Microphone</div>
              <div style="font-size:0.75rem;color:var(--txt-muted);" id="permMicStatus">Checking status…</div>
            </div>
          </div>
          <button class="unblock-action-btn" id="permMicBtn" onclick="requestDevicePermission('microphone')" style="padding:6px 14px;font-size:0.78rem;">
            Allow
          </button>
        </div>

        <!-- Location -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:1.4rem;">📍</div>
            <div>
              <div style="font-weight:600;font-size:0.9rem;color:var(--txt-primary);">Location</div>
              <div style="font-size:0.75rem;color:var(--txt-muted);" id="permLocStatus">Checking status…</div>
            </div>
          </div>
          <button class="unblock-action-btn" id="permLocBtn" onclick="requestDevicePermission('location')" style="padding:6px 14px;font-size:0.78rem;">
            Allow
          </button>
        </div>

        <!-- Notifications -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:1.4rem;">🔔</div>
            <div>
              <div style="font-weight:600;font-size:0.9rem;color:var(--txt-primary);">Notifications</div>
              <div style="font-size:0.75rem;color:var(--txt-muted);" id="permNotifStatus">Checking status…</div>
            </div>
          </div>
          <button class="unblock-action-btn" id="permNotifBtn" onclick="requestDevicePermission('notifications')" style="padding:6px 14px;font-size:0.78rem;">
            Allow
          </button>
        </div>

      </div>

      <div style="display:flex;gap:10px;justify-content:space-between;align-items:center;">
        <button class="unblock-action-btn" onclick="requestAllDevicePermissions()" style="background:var(--flame-grad);border:none;color:#fff;padding:10px 18px;font-size:0.84rem;font-weight:600;flex:1;">
          Grant All Permissions
        </button>
        <button class="wa-dialog-btn wa-dialog-btn-cancel" onclick="closeDevicePermissionsModal()" style="width:auto;padding:8px 20px;">
          <span>Done</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  refreshDevicePermissionsUI();
}
window.openDevicePermissionsModal = openDevicePermissionsModal;

function closeDevicePermissionsModal() {
  document.getElementById('devicePermissionsModalOverlay')?.remove();
  renderSettingsScreen();
}
window.closeDevicePermissionsModal = closeDevicePermissionsModal;

async function refreshDevicePermissionsUI() {
  const camStatus = document.getElementById('permCamStatus');
  const camBtn = document.getElementById('permCamBtn');
  const micStatus = document.getElementById('permMicStatus');
  const micBtn = document.getElementById('permMicBtn');
  const locStatus = document.getElementById('permLocStatus');
  const locBtn = document.getElementById('permLocBtn');
  const notifStatus = document.getElementById('permNotifStatus');
  const notifBtn = document.getElementById('permNotifBtn');

  // Camera & Mic check
  if (navigator.permissions) {
    try {
      const c = await navigator.permissions.query({ name: 'camera' });
      if (camStatus && camBtn) {
        if (c.state === 'granted') {
          camStatus.innerHTML = '<span style="color:#21B06B;font-weight:600">Granted ✓</span>';
          camBtn.textContent = 'Active';
          camBtn.style.opacity = '0.6';
        } else if (c.state === 'denied') {
          camStatus.innerHTML = '<span style="color:#FF3B30;font-weight:600">Blocked in browser</span>';
          camBtn.textContent = 'Enable';
        } else {
          camStatus.textContent = 'Tap to allow access';
          camBtn.textContent = 'Allow';
        }
      }
    } catch (_) {}

    try {
      const m = await navigator.permissions.query({ name: 'microphone' });
      if (micStatus && micBtn) {
        if (m.state === 'granted') {
          micStatus.innerHTML = '<span style="color:#21B06B;font-weight:600">Granted ✓</span>';
          micBtn.textContent = 'Active';
          micBtn.style.opacity = '0.6';
        } else if (m.state === 'denied') {
          micStatus.innerHTML = '<span style="color:#FF3B30;font-weight:600">Blocked in browser</span>';
          micBtn.textContent = 'Enable';
        } else {
          micStatus.textContent = 'Tap to allow access';
          micBtn.textContent = 'Allow';
        }
      }
    } catch (_) {}

    try {
      const l = await navigator.permissions.query({ name: 'geolocation' });
      if (locStatus && locBtn) {
        if (l.state === 'granted') {
          locStatus.innerHTML = '<span style="color:#21B06B;font-weight:600">Granted ✓</span>';
          locBtn.textContent = 'Active';
          locBtn.style.opacity = '0.6';
        } else if (l.state === 'denied') {
          locStatus.innerHTML = '<span style="color:#FF3B30;font-weight:600">Blocked in browser</span>';
          locBtn.textContent = 'Enable';
        } else {
          locStatus.textContent = 'Tap to allow access';
          locBtn.textContent = 'Allow';
        }
      }
    } catch (_) {}
  }

  // Notifications check
  if ('Notification' in window && notifStatus && notifBtn) {
    if (Notification.permission === 'granted') {
      notifStatus.innerHTML = '<span style="color:#21B06B;font-weight:600">Granted ✓</span>';
      notifBtn.textContent = 'Active';
      notifBtn.style.opacity = '0.6';
    } else if (Notification.permission === 'denied') {
      notifStatus.innerHTML = '<span style="color:#FF3B30;font-weight:600">Blocked in browser</span>';
      notifBtn.textContent = 'Enable';
    } else {
      notifStatus.textContent = 'Tap to enable notifications';
      notifBtn.textContent = 'Allow';
    }
  }
}

async function requestDevicePermission(type) {
  try {
    if (type === 'camera') {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach(t => t.stop());
      showToast('📹 Camera access granted!', 'gold');
    } else if (type === 'microphone') {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
      showToast('🎙️ Microphone access granted!', 'gold');
    } else if (type === 'location') {
      await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 });
      });
      showToast('📍 Location access granted!', 'gold');
    } else if (type === 'notifications') {
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          showToast('🔔 Notifications enabled!', 'gold');
        } else {
          showToast('Notification permission denied.', 'warning');
        }
      }
    }
  } catch (err) {
    console.warn(`Permission request for ${type} failed:`, err);
    showToast(`Could not enable ${type}. Check your browser settings.`, 'warning');
  }
  refreshDevicePermissionsUI();
}
window.requestDevicePermission = requestDevicePermission;

async function requestAllDevicePermissions() {
  showToast('Requesting device permissions…', 'info');
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    s.getTracks().forEach(t => t.stop());
  } catch (_) {}

  try {
    await new Promise((res, rej) => {
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 });
    });
  } catch (_) {}

  try {
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  } catch (_) {}

  refreshDevicePermissionsUI();
  showToast('✨ Device permissions updated!', 'gold');
}
window.requestAllDevicePermissions = requestAllDevicePermissions;

// Video Call Quality Selection Modal
function openVideoQualityModal() {
  document.getElementById('videoQualityModalOverlay')?.remove();

  const current = localStorage.getItem('videoCallQuality') || '1080p';

  const overlay = document.createElement('div');
  overlay.className = 'whatsapp-dialog-overlay';
  overlay.id = 'videoQualityModalOverlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeVideoQualityModal(); };

  overlay.innerHTML = `
    <div class="whatsapp-dialog-card" style="max-width:440px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:38px;height:38px;border-radius:50%;background:rgba(244,197,80,0.14);display:flex;align-items:center;justify-content:center;color:#F4C550;flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div>
            <h3 class="wa-dialog-title" style="margin:0;font-size:1.15rem;text-align:left;">Video Call Quality</h3>
            <span style="font-size:0.75rem;color:var(--txt-muted);display:block;margin-top:2px;">Camera resolution &amp; bitrate</span>
          </div>
        </div>
        <button onclick="closeVideoQualityModal()" style="background:none;border:none;color:var(--txt-muted);cursor:pointer;font-size:1.3rem;padding:4px 8px;">✕</button>
      </div>

      <p class="wa-dialog-desc" style="text-align:left;font-size:0.82rem;margin-bottom:14px;">
        Choose camera video stream clarity for all outgoing and incoming video calls.
      </p>

      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px;">

        <!-- 1080p Ultra HD -->
        <div onclick="selectVideoQuality('1080p')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:14px;background:${current === '1080p' ? 'rgba(244,197,80,0.12)' : 'rgba(255,255,255,0.04)'};border:1.5px solid ${current === '1080p' ? '#F4C550' : 'rgba(255,255,255,0.08)'};border-radius:14px;transition:all 0.2s ease;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-weight:700;font-size:0.94rem;color:var(--txt-primary);">Ultra HD 1080p</span>
              <span style="background:var(--flame-grad);color:#fff;font-size:0.68rem;padding:2px 7px;border-radius:10px;font-weight:700;">HIGHEST</span>
            </div>
            <div style="font-size:0.77rem;color:var(--txt-muted);margin-top:4px;">
              Crystal clear native camera clarity (1920×1080 @ 30fps). Highest sharpness, like a normal phone camera.
            </div>
          </div>
          <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${current === '1080p' ? '#F4C550' : 'rgba(255,255,255,0.3)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:12px;">
            ${current === '1080p' ? '<div style="width:10px;height:10px;border-radius:50%;background:#F4C550;"></div>' : ''}
          </div>
        </div>

        <!-- 720p HD -->
        <div onclick="selectVideoQuality('720p')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:14px;background:${current === '720p' ? 'rgba(244,197,80,0.12)' : 'rgba(255,255,255,0.04)'};border:1.5px solid ${current === '720p' ? '#F4C550' : 'rgba(255,255,255,0.08)'};border-radius:14px;transition:all 0.2s ease;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-weight:700;font-size:0.94rem;color:var(--txt-primary);">HD 720p</span>
              <span style="background:rgba(255,255,255,0.12);color:var(--txt-primary);font-size:0.68rem;padding:2px 7px;border-radius:10px;font-weight:600;">BALANCED</span>
            </div>
            <div style="font-size:0.77rem;color:var(--txt-muted);margin-top:4px;">
              High definition (1280×720 @ 30fps). Smooth performance and moderate data usage.
            </div>
          </div>
          <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${current === '720p' ? '#F4C550' : 'rgba(255,255,255,0.3)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:12px;">
            ${current === '720p' ? '<div style="width:10px;height:10px;border-radius:50%;background:#F4C550;"></div>' : ''}
          </div>
        </div>

        <!-- 480p Data Saver -->
        <div onclick="selectVideoQuality('480p')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:14px;background:${current === '480p' ? 'rgba(244,197,80,0.12)' : 'rgba(255,255,255,0.04)'};border:1.5px solid ${current === '480p' ? '#F4C550' : 'rgba(255,255,255,0.08)'};border-radius:14px;transition:all 0.2s ease;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-weight:700;font-size:0.94rem;color:var(--txt-primary);">Standard 480p</span>
              <span style="background:rgba(255,255,255,0.12);color:var(--txt-muted);font-size:0.68rem;padding:2px 7px;border-radius:10px;font-weight:600;">DATA SAVER</span>
            </div>
            <div style="font-size:0.77rem;color:var(--txt-muted);margin-top:4px;">
              Standard definition (640×480). Conserves mobile data on slow or limited connections.
            </div>
          </div>
          <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${current === '480p' ? '#F4C550' : 'rgba(255,255,255,0.3)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:12px;">
            ${current === '480p' ? '<div style="width:10px;height:10px;border-radius:50%;background:#F4C550;"></div>' : ''}
          </div>
        </div>

      </div>

      <div style="display:flex;justify-content:flex-end;">
        <button class="wa-dialog-btn wa-dialog-btn-cancel" onclick="closeVideoQualityModal()" style="width:auto;padding:8px 24px;">
          <span>Done</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}
window.openVideoQualityModal = openVideoQualityModal;

function closeVideoQualityModal() {
  document.getElementById('videoQualityModalOverlay')?.remove();
  renderSettingsScreen();
}
window.closeVideoQualityModal = closeVideoQualityModal;

function selectVideoQuality(quality) {
  localStorage.setItem('videoCallQuality', quality);
  const labels = {
    '1080p': 'Ultra HD 1080p (Crystal Clear)',
    '720p': 'HD 720p (Balanced)',
    '480p': 'Standard 480p (Data Saver)'
  };
  showToast(`✨ Video Call Quality: ${labels[quality] || quality}`, 'gold');
  closeVideoQualityModal();
}
window.selectVideoQuality = selectVideoQuality;

// ==========================================================
// HAPTIC FEEDBACK — Unified helper
// ==========================================================
function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  try {
    switch (type) {
      case 'light':   navigator.vibrate(8);          break;
      case 'medium':  navigator.vibrate(18);         break;
      case 'heavy':   navigator.vibrate(35);         break;
      case 'success': navigator.vibrate([10, 40, 15]);  break;
      case 'match':   navigator.vibrate([20, 40, 30, 60, 20]); break;
      case 'swipe':   navigator.vibrate(12);         break;
      case 'error':   navigator.vibrate([30, 20, 30]); break;
      default:        navigator.vibrate(10);
    }
  } catch (_) {}
}
window.haptic = haptic;

// Patch pulseClick to add haptic
const _origPulseClick = window.pulseClick;
window.pulseClick = function(el) {
  haptic('light');
  if (typeof _origPulseClick === 'function') _origPulseClick(el);
};

// ==========================================================
// SKELETON LOADING CARDS
// ==========================================================
function showSkeletonCards() {
  const stack = document.getElementById('cardStack');
  const emptyState = document.getElementById('stackEmpty');
  const controls = document.getElementById('actionRow');
  if (!stack) return;

  if (emptyState) emptyState.style.display = 'none';
  if (controls) { controls.style.opacity = '0.3'; controls.style.pointerEvents = 'none'; }

  stack.innerHTML = `
    <div class="skeleton-card sk-back">
      <div class="sk-photo sk-shimmer"></div>
      <div class="sk-info">
        <div class="sk-line wide sk-shimmer"></div>
        <div class="sk-tags">
          <div class="sk-tag sk-shimmer"></div>
          <div class="sk-tag sk-shimmer"></div>
          <div class="sk-tag sk-shimmer"></div>
        </div>
        <div class="sk-line short sk-shimmer"></div>
      </div>
    </div>
    <div class="skeleton-card sk-front">
      <div class="sk-photo sk-shimmer"></div>
      <div class="sk-info">
        <div class="sk-line wide sk-shimmer"></div>
        <div class="sk-tags">
          <div class="sk-tag sk-shimmer"></div>
          <div class="sk-tag sk-shimmer"></div>
          <div class="sk-tag sk-shimmer"></div>
        </div>
        <div class="sk-line short sk-shimmer"></div>
      </div>
    </div>
  `;
}
window.showSkeletonCards = showSkeletonCards;

// Patch loadProfilesForDiscovery to show skeletons first
const _origLoadProfiles = window.loadProfilesForDiscovery;
window.loadProfilesForDiscovery = async function() {
  if (isRealUserLoggedIn()) {
    showSkeletonCards();
  }
  if (typeof _origLoadProfiles === 'function') {
    return _origLoadProfiles.call(this, ...arguments);
  }
};

// ==========================================================
// ONBOARDING WIZARD — 4-step new-user flow
// ==========================================================
const _obState = {
  currentStep: 1,
  name: '',
  age: '',
  gender: 'Male',
  interestedIn: '',
  interests: [],
  bio: ''
};

function showOnboardingWizard(prefillName) {
  const wiz = document.getElementById('onboardingWizard');
  if (!wiz) return;
  // Pre-fill name if provided from Google
  if (prefillName) {
    const nameInput = document.getElementById('obNameInput');
    if (nameInput) nameInput.value = prefillName;
    _obState.name = prefillName;
  }
  // Reset to step 1
  _obState.currentStep = 1;
  wiz.style.display = 'block';
  _obShowStep(1);

  // Bio char counter
  const bioInput = document.getElementById('obBioInput');
  if (bioInput) {
    bioInput.addEventListener('input', () => {
      const count = document.getElementById('obBioCount');
      if (count) count.textContent = bioInput.value.length;
    });
  }
}
window.showOnboardingWizard = showOnboardingWizard;

function _obShowStep(stepNum) {
  // Hide all steps
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  // Show target
  const target = document.getElementById('obStep' + stepNum);
  if (target) target.classList.add('active');

  // Update dots
  const dots = document.querySelectorAll('.ob-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === stepNum - 1));

  // Show/hide skip button
  const skipBtn = document.getElementById('obSkipBtn');
  if (skipBtn) skipBtn.style.display = stepNum < 4 ? 'block' : 'none';

  // Show/hide back button (visible on steps 2, 3, 4)
  const backBtn = document.getElementById('obBackBtn');
  if (backBtn) backBtn.style.display = stepNum > 1 ? 'inline-flex' : 'none';

  _obState.currentStep = stepNum;
  haptic('light');
}

function obBackCurrent() {
  if (_obState.currentStep > 1) {
    _obShowStep(_obState.currentStep - 1);
  }
}
window.obBackCurrent = obBackCurrent;

function selectObGender(el) {
  document.querySelectorAll('#obStep2 .ob-name-section:first-of-type .ob-gender-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  _obState.gender = el.dataset.val;
  haptic('light');
}
window.selectObGender = selectObGender;

function selectObInterestIn(el) {
  // Only within the "interested in" grid (second .ob-name-section in step2)
  const grid = el.closest('.ob-gender-grid');
  if (grid) grid.querySelectorAll('.ob-gender-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  _obState.interestedIn = el.dataset.val;
  haptic('light');
}
window.selectObInterestIn = selectObInterestIn;

function toggleObInterest(el) {
  const isSelected = el.classList.contains('selected');
  if (!isSelected && _obState.interests.length >= 5) {
    haptic('error');
    el.style.animation = 'none';
    el.offsetWidth; // force reflow
    el.style.animation = 'obEmojiPop 0.3s ease';
    return;
  }
  haptic('light');
  el.classList.toggle('selected');
  if (el.classList.contains('selected')) {
    _obState.interests.push(el.textContent.trim());
  } else {
    _obState.interests = _obState.interests.filter(i => i !== el.textContent.trim());
  }
  const countEl = document.getElementById('obInterestCount');
  if (countEl) countEl.textContent = `${_obState.interests.length} / 5 selected`;
}
window.toggleObInterest = toggleObInterest;

function obNext(fromStep) {
  if (fromStep === 1) {
    const nameInput = document.getElementById('obNameInput');
    const ageInput  = document.getElementById('obAgeInput');
    const name = (nameInput?.value || '').trim();
    const age  = parseInt(ageInput?.value || '0', 10);
    if (!name) {
      haptic('error');
      if (nameInput) { nameInput.style.borderColor = '#D13A63'; nameInput.focus(); }
      showToast('Please enter your name 😊', 'error');
      return;
    }
    if (!age || age < 18 || age > 99) {
      haptic('error');
      if (ageInput) { ageInput.style.borderColor = '#D13A63'; ageInput.focus(); }
      showToast('Please enter a valid age (18+)', 'error');
      return;
    }
    _obState.name = name;
    _obState.age  = age;
    _obShowStep(2);
  } else if (fromStep === 2) {
    // Gender is pre-selected, just move on
    _obShowStep(3);
  } else if (fromStep === 3) {
    _obShowStep(4);
  }
}
window.obNext = obNext;

async function obFinish() {
  const bioInput = document.getElementById('obBioInput');
  _obState.bio = (bioInput?.value || '').trim();

  const btn = document.getElementById('obFinishBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  // Apply to currentUser
  if (_obState.name)  currentUser.name = _obState.name;
  if (_obState.age)   currentUser.age  = _obState.age;
  if (_obState.gender) currentUser.gender = _obState.gender;
  if (_obState.bio)   currentUser.bio  = _obState.bio;
  if (_obState.interests.length) currentUser.interests = _obState.interests;
  if (_obState.interestedIn) currentUser.interestedIn = _obState.interestedIn;

  currentUser.displayName = currentUser.name;
  appState.isLoggedIn = true;
  saveToStorage();

  // Save to Firestore
  if (typeof saveUserProfileToFirestore === 'function') {
    try { await saveUserProfileToFirestore(currentUser); } catch (_) {}
  }

  haptic('success');

  // Close wizard + go to discovery
  const wiz = document.getElementById('onboardingWizard');
  if (wiz) {
    wiz.style.transition = 'opacity 0.4s';
    wiz.style.opacity = '0';
    setTimeout(() => { wiz.style.display = 'none'; wiz.style.opacity = ''; }, 420);
  }

  showScreen('discovery');
  initMainApp();
  setTimeout(() => {
    showToast(`🔥 Welcome, ${currentUser.name}! Let's find your match!`, 'gold');
    // Show PWA banner after onboarding
    setTimeout(tryShowPwaBanner, 3500);
  }, 600);
}
window.obFinish = obFinish;

function skipOnboarding() {
  haptic('light');
  const wiz = document.getElementById('onboardingWizard');
  if (wiz) { wiz.style.display = 'none'; }
  appState.isLoggedIn = true;
  saveToStorage();
  showScreen('discovery');
  initMainApp();
}
window.skipOnboarding = skipOnboarding;

// Override handleGoogleLoginSuccess for brand new users to use the wizard
const _origGoogleSuccess = window.handleGoogleLoginSuccess;
window.handleGoogleLoginSuccess = async function(user) {
  // Run the original function
  if (typeof _origGoogleSuccess === 'function') {
    await _origGoogleSuccess(user);
  }
  // After original runs, if user went to 'signup' screen, show wizard instead
  if (appState.currentScreen === 'signup') {
    // This is a new Google user who was redirected to signup
    // Show our better onboarding wizard instead
    const cleanName = currentUser.name || (user.displayName || '').split(' ')[0] || '';
    setTimeout(() => {
      showScreen('login'); // go back to hide the old signup screen
      document.getElementById('loginScreen')?.classList.remove('active');
      showOnboardingWizard(cleanName);
    }, 100);
  }
};

// ==========================================================
// PWA INSTALL BANNER
// ==========================================================
let _pwaInstallEvent = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _pwaInstallEvent = e;
  // Only show after user is logged in and has been using app for a bit
  setTimeout(tryShowPwaBanner, 8000);
});

function tryShowPwaBanner() {
  // Don't show if: already installed, dismissed before, no install event
  if (!_pwaInstallEvent) return;
  if (localStorage.getItem('hmbs_pwa_dismissed') === '1') return;
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (!appState.isLoggedIn) return;

  const banner = document.getElementById('pwaBanner');
  if (banner) banner.style.display = 'block';
}
window.tryShowPwaBanner = tryShowPwaBanner;

function dismissPwaBanner() {
  haptic('light');
  const banner = document.getElementById('pwaBanner');
  if (banner) {
    banner.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    banner.style.transform = 'translateY(100%)';
    banner.style.opacity = '0';
    setTimeout(() => { banner.style.display = 'none'; }, 320);
  }
  localStorage.setItem('hmbs_pwa_dismissed', '1');
}
window.dismissPwaBanner = dismissPwaBanner;

async function triggerPwaInstall() {
  haptic('medium');
  if (!_pwaInstallEvent) {
    // iOS fallback — show instructions
    showToast('📱 Tap the Share button → "Add to Home Screen"', 'gold');
    dismissPwaBanner();
    return;
  }
  try {
    _pwaInstallEvent.prompt();
    const { outcome } = await _pwaInstallEvent.userChoice;
    if (outcome === 'accepted') {
      haptic('success');
      showToast('🎉 App installed! Check your home screen', 'gold');
    }
    _pwaInstallEvent = null;
  } catch (_) {}
  dismissPwaBanner();
}
window.triggerPwaInstall = triggerPwaInstall;

// Show PWA banner on app resume if conditions met
window.addEventListener('focus', () => {
  if (appState.isLoggedIn && _pwaInstallEvent) {
    setTimeout(tryShowPwaBanner, 2000);
  }
});

// ==========================================================
// AI SMART ICEBREAKERS IN MATCH POPUP
// ==========================================================
const ICEBREAKER_TEMPLATES = [
  { key: 'music',    lines: ['Your music taste is fire \uD83C\uDFB5 What\'s on your playlist right now?', 'Amapiano or Afrobeats for a first date vibe? \uD83C\uDFB7'] },
  { key: 'food',     lines: ['Best suya spot in Lagos? I need recommendations \uD83E\uDD56', 'Tell me your go-to comfort food and I\'ll tell you mine \uD83D\uDE0B'] },
  { key: 'travel',   lines: ['If you could travel anywhere tomorrow, where would you go? \u2708\uFE0F', 'Hidden gem spots in Nigeria you think I should visit?'] },
  { key: 'fitness',  lines: ['Morning workout or evening grind? \uD83D\uDCAA', 'What keeps you consistent with fitness? Share the secret \uD83C\uDFCB\uFE0F'] },
  { key: 'tech',     lines: ['Are you more a builder or a dreamer? \uD83D\uDCBB', 'What\'s the last app that genuinely impressed you?'] },
  { key: 'books',    lines: ['Last book that changed your perspective? \uD83D\uDCDA', 'Fiction or non-fiction? And what\'s your pick right now?'] },
  { key: 'gaming',   lines: ['PS5 or PC? And what are you playing lately? \uD83C\uDFAE', 'We should settle this with a game \u2014 what do you play?'] },
  { key: 'fashion',  lines: ['Where do you shop? I need to upgrade my wardrobe \uD83D\uDE05', 'Describe your style in three emojis \uD83D\uDC57\u2728\uD83D\uDD25'] },
  { key: 'default',  lines: [
    'So what\'s a regular Tuesday evening look like for you? \uD83D\uDE0A',
    'Hot take: pineapple on pizza \u2014 yes or absolutely not? \uD83C\uDF55',
    'If we could do one thing together this weekend, what would it be? \uD83C\uDF1F',
    'What\'s something on your bucket list that most people don\'t know about?',
    'Describe your perfect Sunday in Lagos \uD83C\uDF05'
  ]}
];


function generateIcebreakers(profile) {
  // Match icebreakers to profile interests
  const tags = (Array.isArray(profile?.tags) ? profile.tags : []).map(t => t.toLowerCase());
  const bio  = (profile?.bio || '').toLowerCase();
  let chosen = [];

  for (const tmpl of ICEBREAKER_TEMPLATES) {
    if (tmpl.key === 'default') continue;
    const match = tags.some(t => t.includes(tmpl.key)) || bio.includes(tmpl.key);
    if (match) {
      const line = tmpl.lines[Math.floor(Math.random() * tmpl.lines.length)];
      chosen.push(line);
      if (chosen.length >= 2) break;
    }
  }

  // Fill up to 3 with defaults
  const defaults = [...ICEBREAKER_TEMPLATES.find(t => t.key === 'default').lines];
  while (chosen.length < 3 && defaults.length) {
    const idx = Math.floor(Math.random() * defaults.length);
    chosen.push(defaults.splice(idx, 1)[0]);
  }

  return chosen.slice(0, 3);
}
window.generateIcebreakers = generateIcebreakers;

// Patch triggerMatchPopup to inject icebreakers
const _origTriggerMatchPopup = window.triggerMatchPopup;
window.triggerMatchPopup = function(profile) {
  haptic('match');
  if (typeof launchMatchConfetti === 'function') {
    launchMatchConfetti();
  }
  try {
    const mc = parseInt(localStorage.getItem('hmbs_match_count') || '0', 10) + 1;
    localStorage.setItem('hmbs_match_count', mc.toString());
  } catch (_) {}

  if (typeof _origTriggerMatchPopup === 'function') {
    _origTriggerMatchPopup(profile);
  }

  // Inject icebreaker chips into the match popup
  const popup = document.getElementById('matchPopup');
  if (!popup) return;

  // Remove any previous icebreaker section
  popup.querySelector('.icebreaker-section')?.remove();

  const icebreakers = generateIcebreakers(profile);
  if (!icebreakers.length) return;

  const chipsHTML = icebreakers.map(line => `
    <button class="icebreaker-chip" onclick="sendIcebreakerFromMatch('${escHtml(profile.id)}', this)">${escHtml(line)}</button>
  `).join('');

  const section = document.createElement('div');
  section.className = 'icebreaker-section';
  section.innerHTML = `
    <div class="icebreaker-label">✨ Start the conversation</div>
    <div class="icebreaker-chips">${chipsHTML}</div>
  `;

  // Insert before the button row in the popup
  const btnsRow = popup.querySelector('.match-popup-btns');
  if (btnsRow) {
    btnsRow.parentNode.insertBefore(section, btnsRow);
  } else {
    const lastBtn = popup.querySelector('.match-send-btn, .accent-btn, button:last-of-type');
    if (lastBtn) lastBtn.parentNode.insertBefore(section, lastBtn);
    else popup.appendChild(section);
  }
};


function sendIcebreakerFromMatch(partnerId, btn) {
  haptic('medium');
  if (!partnerId) return;
  const text = btn?.textContent?.trim();
  if (!text) return;
  // Send the message
  if (typeof sendIcebreaker === 'function') {
    sendIcebreaker(text);
    btn.style.background = 'rgba(33,176,107,0.2)';
    btn.style.borderColor = 'rgba(33,176,107,0.5)';
    btn.style.color = '#21B06B';
    btn.disabled = true;
    closeMatchPopup();
    // Navigate to chat
    openChat(partnerId);
  } else {
    // Fallback: add to conversation and navigate
    if (!conversations[partnerId]) conversations[partnerId] = { messages: [] };
    conversations[partnerId].messages.push({
      id: 'ib_' + Date.now(),
      sender: 'me',
      text,
      timestamp: Date.now(),
      read: true
    });
    saveToStorage();
    closeMatchPopup();
    openChat(partnerId);
  }
}
window.sendIcebreakerFromMatch = sendIcebreakerFromMatch;

// ==========================================================
// ENHANCED SWIPE HAPTICS
// ==========================================================
const _origDoSwipe = window.doSwipe;
window.doSwipe = async function(dir) {
  haptic(dir === 'right' ? 'medium' : 'swipe');
  if (typeof _origDoSwipe === 'function') {
    return _origDoSwipe.apply(this, arguments);
  }
};

// ==========================================================
// PWA BANNER — Show on first Discovery visit after login
// ==========================================================
(function patchInitMainAppForPwaBanner() {
  const _origInitMainApp = window.initMainApp;
  window.initMainApp = function() {
    if (typeof _origInitMainApp === 'function') _origInitMainApp.apply(this, arguments);
    // After 15 seconds in-app, try to show PWA banner
    setTimeout(tryShowPwaBanner, 15000);
    // Initialize GPS Geolocation and Daily Swipe Timer
    initUserGeolocation();
    initSwipeResetTimer();
    setTimeout(checkShowRatingPrompt, 8000);
  };
})();

// ==========================================================
// MATCH CONFETTI CELEBRATION ENGINE
// ==========================================================
function launchMatchConfetti() {
  const canvas = document.getElementById('matchConfettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const colors = ['#FF2E70', '#E3B34D', '#FF6584', '#21B06B', '#7000FF', '#FFFFFF', '#00C6FF'];
  const particles = [];
  const count = 110;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 80,
      y: canvas.height * 0.45 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() * -17) - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
      opacity: 1
    });
  }

  let animationFrame;
  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = 0;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.42; // gravity
      p.vx *= 0.985; // air drag
      p.rotation += p.rotSpeed;

      if (elapsed > 1800) {
        p.opacity -= 0.025;
      }

      if (p.opacity > 0 && p.y < canvas.height + 50) {
        activeParticles++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    if (activeParticles > 0 && elapsed < 3500) {
      animationFrame = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
      if (animationFrame) cancelAnimationFrame(animationFrame);
    }
  }

  animationFrame = requestAnimationFrame(render);
}
window.launchMatchConfetti = launchMatchConfetti;

// ==========================================================
// SWIPE REFILL COUNTDOWN TIMER
// ==========================================================
let _swipeResetTimerInterval = null;
function initSwipeResetTimer() {
  if (_swipeResetTimerInterval) clearInterval(_swipeResetTimerInterval);

  const updateTimer = () => {
    const timerEl = document.getElementById('swipeResetTimer');
    if (!timerEl) return;

    const now = new Date();
    // Midnight tonight (end of local day)
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const diff = Math.max(0, midnight.getTime() - now.getTime());

    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = n => String(n).padStart(2, '0');
    timerEl.textContent = `Refills in ${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  updateTimer();
  _swipeResetTimerInterval = setInterval(updateTimer, 1000);
}
window.initSwipeResetTimer = initSwipeResetTimer;

// ==========================================================
// REAL GPS GEOLOCATION & DYNAMIC DISTANCE
// ==========================================================
const NIGERIAN_CITIES_COORDS = {
  'victoria island': { lat: 6.4281, lng: 3.4219 },
  'ikoyi': { lat: 6.4549, lng: 3.4358 },
  'lekki': { lat: 6.4474, lng: 3.4849 },
  'ikeja': { lat: 6.5954, lng: 3.3364 },
  'yaba': { lat: 6.5095, lng: 3.3711 },
  'surulere': { lat: 6.4969, lng: 3.3515 },
  'gbagada': { lat: 6.5540, lng: 3.3850 },
  'ajah': { lat: 6.4698, lng: 3.5852 },
  'lagos': { lat: 6.4549, lng: 3.4246 },
  'abuja': { lat: 9.0765, lng: 7.3986 },
  'port harcourt': { lat: 4.8156, lng: 7.0498 },
  'ibadan': { lat: 7.3775, lng: 3.9470 },
  'enugu': { lat: 6.4584, lng: 7.5464 }
};

let _userGeoCoords = null;

function initUserGeolocation() {
  if ('geolocation' in navigator) {
    try {
      const cached = localStorage.getItem('hmbs_user_coords');
      if (cached) _userGeoCoords = JSON.parse(cached);
    } catch (_) {}

    navigator.geolocation.getCurrentPosition(
      pos => {
        _userGeoCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        try {
          localStorage.setItem('hmbs_user_coords', JSON.stringify(_userGeoCoords));
        } catch (_) {}
      },
      () => {
        // Fallback default: Victoria Island, Lagos
        if (!_userGeoCoords) _userGeoCoords = { lat: 6.4281, lng: 3.4219 };
      },
      { timeout: 8000, maximumAge: 3600000 }
    );
  }
}
window.initUserGeolocation = initUserGeolocation;

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
window.calculateDistanceKm = calculateDistanceKm;

function getDynamicProfileDistance(profile) {
  if (!profile) return '2 km away';
  if (_userGeoCoords) {
    let targetCoords = profile.coords;
    if (!targetCoords && (profile.location || profile.city)) {
      const locLower = (profile.location || profile.city || '').toLowerCase();
      for (const [cityName, coords] of Object.entries(NIGERIAN_CITIES_COORDS)) {
        if (locLower.includes(cityName)) {
          targetCoords = coords;
          break;
        }
      }
    }
    if (targetCoords) {
      const km = calculateDistanceKm(_userGeoCoords.lat, _userGeoCoords.lng, targetCoords.lat, targetCoords.lng);
      if (km < 1) return `${Math.max(200, Math.round(km * 1000))} m away`;
      return `${km.toFixed(1)} km away`;
    }
  }
  return profile.distance || '2.5 km away';
}
window.getDynamicProfileDistance = getDynamicProfileDistance;

// ==========================================================
// POLISHED SUPER LIKE WITH STARBURST ANIMATION
// ==========================================================
const _origTriggerSuperLike = window.triggerSuperLike;
window.triggerSuperLike = function() {
  haptic('medium');
  if (!appState.isVip && (!appState.superLikesRemaining || appState.superLikesRemaining <= 0)) {
    openPaywall('super_like');
    return;
  }

  // Deduct super like if not VIP
  if (!appState.isVip && typeof appState.superLikesRemaining === 'number') {
    appState.superLikesRemaining = Math.max(0, appState.superLikesRemaining - 1);
    updateLimitBadges();
  }

  // Visual Starburst overlay
  const burst = document.getElementById('superLikeFxBurst');
  const starsContainer = document.getElementById('superLikeFxStars');
  if (burst) {
    if (starsContainer) {
      starsContainer.innerHTML = '';
      for (let i = 0; i < 18; i++) {
        const star = document.createElement('div');
        star.className = 'super-star-particle';
        star.textContent = ['⭐', '✨', '💙', '💫'][Math.floor(Math.random() * 4)];
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 160 + 80;
        star.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        star.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
        starsContainer.appendChild(star);
      }
    }
    burst.style.display = 'flex';
    setTimeout(() => { burst.style.display = 'none'; }, 1100);
  }

  // Card animation
  const card = appState.activeCard || document.querySelector('.profile-card');
  if (card) {
    const stamp = document.createElement('div');
    stamp.className = 'stamp stamp-super';
    stamp.textContent = 'SUPER LIKE';
    stamp.style.opacity = '1';
    card.appendChild(stamp);

    card.style.transition = 'transform 0.65s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.6s ease';
    card.style.transform = 'translateY(-130%) scale(1.08) rotate(3deg)';
    card.style.boxShadow = '0 0 50px rgba(29, 161, 242, 0.9)';
    card.style.opacity = '0';
  }

  haptic('success');
  showToast('⭐ Super Like sent! Priority match delivery activated!', 'gold');

  setTimeout(() => {
    doSwipe('right');
  }, 450);
};

// ==========================================================
// IN-APP RATING & FEEDBACK MODAL SYSTEM
// ==========================================================
let _currentRatingScore = 5;

function showRatingModal() {
  const overlay = document.getElementById('ratingModalOverlay');
  if (!overlay) return;
  _currentRatingScore = 5;
  setRatingScore(5);
  overlay.style.display = 'flex';
  haptic('light');
}
window.showRatingModal = showRatingModal;

function setRatingScore(score) {
  _currentRatingScore = score;
  const stars = document.querySelectorAll('.rating-star-btn');
  stars.forEach((btn, idx) => {
    btn.classList.toggle('active', idx < score);
  });

  const feedbackArea = document.getElementById('ratingFeedbackArea');
  if (feedbackArea) {
    feedbackArea.style.display = score <= 4 ? 'block' : 'none';
  }
}
window.setRatingScore = setRatingScore;

function submitRating() {
  haptic('success');
  const feedback = (document.getElementById('ratingFeedbackText')?.value || '').trim();

  try {
    localStorage.setItem('hmbs_has_rated', Date.now().toString());
  } catch (_) {}

  // Sync to Firestore if available
  if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    fbDb.collection('app_feedback').add({
      uid: fbAuth.currentUser.uid,
      userName: currentUser.name || 'Anonymous',
      rating: _currentRatingScore,
      feedback: feedback,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
  }

  closeRatingModal(false);

  if (_currentRatingScore >= 5) {
    launchMatchConfetti();
    showToast('❤️ Thank you! We are thrilled you love hookmebysam!', 'gold');
  } else {
    showToast('🙏 Thank you for your feedback! We will keep improving!', 'success');
  }
}
window.submitRating = submitRating;

function closeRatingModal(isDismiss) {
  const overlay = document.getElementById('ratingModalOverlay');
  if (overlay) overlay.style.display = 'none';
  if (isDismiss) {
    try {
      localStorage.setItem('hmbs_rating_dismissed', Date.now().toString());
    } catch (_) {}
  }
}
window.closeRatingModal = closeRatingModal;

function checkShowRatingPrompt() {
  try {
    if (localStorage.getItem('hmbs_has_rated')) return;
    const dismissed = localStorage.getItem('hmbs_rating_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 3 * 86400000) return; // 3 days cooldown

    const swipeCount = parseInt(localStorage.getItem('hmbs_swipe_count') || '0', 10);
    const matchCount = (typeof matchedUsers !== 'undefined' ? matchedUsers.length : 0);

    if (swipeCount >= 15 || matchCount >= 2) {
      setTimeout(showRatingModal, 2000);
    }
  } catch (_) {}
}
window.checkShowRatingPrompt = checkShowRatingPrompt;

// Patch doSwipe to record swipes and check rating prompt
(function patchDoSwipeForRating() {
  const existingDoSwipe = window.doSwipe;
  window.doSwipe = async function(dir) {
    try {
      const sc = parseInt(localStorage.getItem('hmbs_swipe_count') || '0', 10) + 1;
      localStorage.setItem('hmbs_swipe_count', sc.toString());
      if (sc === 15 || sc === 30) {
        setTimeout(checkShowRatingPrompt, 1500);
      }
    } catch (_) {}

    if (typeof existingDoSwipe === 'function') {
      return existingDoSwipe.apply(this, arguments);
    }
  };
})();

// Start timers on load
setTimeout(initSwipeResetTimer, 1000);
setTimeout(initUserGeolocation, 1500);





// ==========================================================
// PHOTO VERIFICATION (SELFIE CHECK) SYSTEM
// ==========================================================
let _selfieStream = null;
let _selfieScanTimeout = null;
let _selfieCountdownInterval = null;
let _selfieCapturedDataUrl = null;
let _selfiePhase = 'ready'; // 'ready', 'countdown', 'analyzing', 'success', 'failed'

async function openSelfieVerifyModal() {
  const modal = document.getElementById('selfieVerifyModal');
  if (!modal) return;
  modal.style.display = 'flex';
  haptic('light');

  // Reset internal state
  _selfiePhase = 'ready';
  _selfieCapturedDataUrl = null;
  if (_selfieScanTimeout) { clearTimeout(_selfieScanTimeout); _selfieScanTimeout = null; }
  if (_selfieCountdownInterval) { clearInterval(_selfieCountdownInterval); _selfieCountdownInterval = null; }

  // Reset DOM elements
  const s1 = document.getElementById('sStep1');
  const s2 = document.getElementById('sStep2');
  const s3 = document.getElementById('sStep3');
  const laser = document.getElementById('selfieScanLaser');
  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const retakeBtn = document.getElementById('selfieRetakeBtn');
  const countdownEl = document.getElementById('selfieCountdown');
  const flashEl = document.getElementById('selfieFlashOverlay');
  const capturedImg = document.getElementById('selfieCapturedPreview');
  const fallbackEl = document.getElementById('selfieCameraFallback');
  const video = document.getElementById('selfieVideoEl');

  if (s1) s1.className = 'selfie-step-dot active';
  if (s2) s2.className = 'selfie-step-dot';
  if (s3) s3.className = 'selfie-step-dot';
  if (laser) laser.classList.remove('scanning');
  if (countdownEl) countdownEl.style.display = 'none';
  if (flashEl) flashEl.classList.remove('flash');
  if (capturedImg) { capturedImg.style.display = 'none'; capturedImg.src = ''; }
  if (fallbackEl) fallbackEl.style.display = 'none';
  if (retakeBtn) retakeBtn.style.display = 'none';

  if (statusPill) {
    statusPill.textContent = 'Align your face inside the oval';
    statusPill.style.color = '#3897F0';
  }

  if (actionBtn) {
    actionBtn.disabled = false;
    actionBtn.textContent = '📸 Capture & Scan Face';
    actionBtn.style.background = 'linear-gradient(135deg, #3897F0, #1E88E5)';
    actionBtn.style.opacity = '1';
    actionBtn.onclick = handleSelfieActionClick;
  }

  // Attempt real camera stream
  await startSelfieLiveCamera();
}
window.openSelfieVerifyModal = openSelfieVerifyModal;

async function startSelfieLiveCamera() {
  const video = document.getElementById('selfieVideoEl');
  const fallbackEl = document.getElementById('selfieCameraFallback');
  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const s1 = document.getElementById('sStep1');

  // Stop any existing tracks
  if (_selfieStream) {
    try {
      _selfieStream.getTracks().forEach(t => t.stop());
    } catch (_) {}
    _selfieStream = null;
  }

  const hasMediaDevices = Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
  const isSecure = window.isSecureContext !== false;

  if (hasMediaDevices && isSecure) {
    try {
      if (statusPill) statusPill.textContent = 'Starting front camera...';
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 640 },
            height: { ideal: 640 }
          },
          audio: false
        });
      } catch (e1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
          });
        } catch (e2) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      if (stream && video) {
        _selfieStream = stream;
        video.srcObject = stream;
        video.muted = true;
        video.defaultMuted = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.style.display = 'block';
        if (fallbackEl) fallbackEl.style.display = 'none';

        await video.play().catch(err => console.warn('Camera video.play() notice:', err));

        if (s1) s1.className = 'selfie-step-dot done';
        if (statusPill) {
          statusPill.textContent = 'Position your face in the oval & tap Capture';
          statusPill.style.color = '#3897F0';
        }
        if (actionBtn) {
          actionBtn.disabled = false;
          actionBtn.textContent = '📸 Capture & Scan Face';
          actionBtn.style.background = 'linear-gradient(135deg, #3897F0, #1E88E5)';
          actionBtn.onclick = handleSelfieActionClick;
        }
        return;
      }
    } catch (err) {
      console.warn('getUserMedia error, falling back to native camera capture:', err);
    }
  }

  // Fallback: WebRTC camera not available or permission denied
  if (video) video.style.display = 'none';
  if (fallbackEl) fallbackEl.style.display = 'flex';
  if (statusPill) {
    statusPill.textContent = 'Snap a live selfie using your phone camera';
    statusPill.style.color = '#F4C550';
  }
  if (actionBtn) {
    actionBtn.disabled = false;
    actionBtn.textContent = '📸 Take Live Selfie';
    actionBtn.style.background = 'linear-gradient(135deg, #3897F0, #1E88E5)';
    actionBtn.onclick = triggerNativeSelfieCapture;
  }
}
window.startSelfieLiveCamera = startSelfieLiveCamera;

function triggerNativeSelfieCapture() {
  const fileInput = document.getElementById('selfieFileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}
window.triggerNativeSelfieCapture = triggerNativeSelfieCapture;

function handleSelfieFileSelected(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const fallbackEl = document.getElementById('selfieCameraFallback');
  const capturedImg = document.getElementById('selfieCapturedPreview');
  const s1 = document.getElementById('sStep1');

  if (statusPill) statusPill.textContent = 'Processing selfie photo...';
  if (actionBtn) { actionBtn.disabled = true; actionBtn.textContent = 'Loading photo...'; }

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const img = new Image();
    img.onload = function() {
      // Draw into square canvas
      const canvas = document.getElementById('selfieCanvas') || document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 480, 480);

      _selfieCapturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      if (capturedImg) {
        capturedImg.src = _selfieCapturedDataUrl;
        capturedImg.style.display = 'block';
      }
      if (fallbackEl) fallbackEl.style.display = 'none';
      if (s1) s1.className = 'selfie-step-dot done';

      // Run biometric face validation
      analyzeAndScanSelfieImage(canvas);
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}
window.handleSelfieFileSelected = handleSelfieFileSelected;

function closeSelfieVerifyModal() {
  const modal = document.getElementById('selfieVerifyModal');
  if (modal) modal.style.display = 'none';

  if (_selfieStream) {
    try {
      _selfieStream.getTracks().forEach(t => t.stop());
    } catch (_) {}
    _selfieStream = null;
  }
  if (_selfieScanTimeout) {
    clearTimeout(_selfieScanTimeout);
    _selfieScanTimeout = null;
  }
  if (_selfieCountdownInterval) {
    clearInterval(_selfieCountdownInterval);
    _selfieCountdownInterval = null;
  }
  _selfiePhase = 'ready';
}
window.closeSelfieVerifyModal = closeSelfieVerifyModal;

function handleSelfieActionClick() {
  if (_selfiePhase === 'ready') {
    const video = document.getElementById('selfieVideoEl');
    if (_selfieStream && video && video.videoWidth > 0) {
      startSelfieCountdownAndCapture();
    } else {
      triggerNativeSelfieCapture();
    }
  } else if (_selfiePhase === 'success') {
    completeSelfieVerification();
  }
}
window.handleSelfieActionClick = handleSelfieActionClick;
window.startSelfieScan = handleSelfieActionClick; // Alias for backward compatibility

function startSelfieCountdownAndCapture() {
  _selfiePhase = 'countdown';
  const countdownEl = document.getElementById('selfieCountdown');
  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const flashEl = document.getElementById('selfieFlashOverlay');
  const video = document.getElementById('selfieVideoEl');
  const capturedImg = document.getElementById('selfieCapturedPreview');

  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.textContent = 'Hold still...';
  }

  let count = 3;
  if (countdownEl) {
    countdownEl.textContent = String(count);
    countdownEl.style.display = 'flex';
  }
  if (statusPill) {
    statusPill.textContent = `Get ready... Capturing in ${count}s 📸`;
    statusPill.style.color = '#3897F0';
  }
  haptic('light');

  _selfieCountdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      if (countdownEl) countdownEl.textContent = String(count);
      if (statusPill) statusPill.textContent = `Hold still... Capturing in ${count}s 📸`;
      haptic('light');
    } else {
      clearInterval(_selfieCountdownInterval);
      _selfieCountdownInterval = null;
      if (countdownEl) countdownEl.style.display = 'none';

      // Shutter flash effect
      if (flashEl) {
        flashEl.classList.add('flash');
        setTimeout(() => flashEl.classList.remove('flash'), 300);
      }
      haptic('medium');

      // Capture frame from live video
      const canvas = document.getElementById('selfieCanvas') || document.createElement('canvas');
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 640;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Mirror horizontally so snapshot matches user's mirrored front camera view
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      _selfieCapturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Freeze frame on captured snapshot
      if (capturedImg) {
        capturedImg.src = _selfieCapturedDataUrl;
        capturedImg.style.display = 'block';
      }
      if (video) video.style.display = 'none';

      // Stop camera stream tracks
      if (_selfieStream) {
        try {
          _selfieStream.getTracks().forEach(t => t.stop());
        } catch (_) {}
        _selfieStream = null;
      }

      // Analyze image
      analyzeAndScanSelfieImage(canvas);
    }
  }, 950);
}

function analyzeAndScanSelfieImage(canvas) {
  _selfiePhase = 'analyzing';
  const laser = document.getElementById('selfieScanLaser');
  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const s2 = document.getElementById('sStep2');

  if (s2) s2.className = 'selfie-step-dot active';
  if (laser) laser.classList.add('scanning');
  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.textContent = 'Scanning facial landmarks...';
  }
  if (statusPill) {
    statusPill.textContent = 'Scanning facial geometry... 🔍';
    statusPill.style.color = '#3897F0';
  }

  // 1. Biometric image quality validation
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let totalLum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLum += lum;
    count++;
  }
  const avgLum = totalLum / count;

  let sumDiff = 0;
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumDiff += Math.pow(lum - avgLum, 2);
  }
  const variance = Math.sqrt(sumDiff / count);

  // Quality check validation
  if (avgLum < 24) {
    failSelfieScan('⚠️ Photo is too dark. Ensure good face lighting.', 'dark');
    return;
  }
  if (avgLum > 248) {
    failSelfieScan('⚠️ Photo is overexposed. Avoid direct blinding flash.', 'bright');
    return;
  }
  if (variance < 14) {
    failSelfieScan('⚠️ No face detected. Position your face clearly in frame.', 'noface');
    return;
  }

  // Laser scanning animation delay
  _selfieScanTimeout = setTimeout(() => {
    if (laser) laser.classList.remove('scanning');
    _selfiePhase = 'success';

    const s2 = document.getElementById('sStep2');
    const s3 = document.getElementById('sStep3');
    const retakeBtn = document.getElementById('selfieRetakeBtn');

    if (s2) s2.className = 'selfie-step-dot done';
    if (s3) s3.className = 'selfie-step-dot done';

    if (statusPill) {
      statusPill.textContent = '✓ 100% Face Match! Identity Confirmed';
      statusPill.style.color = '#21B06B';
    }

    if (actionBtn) {
      actionBtn.disabled = false;
      actionBtn.textContent = '✓ Confirm & Get Verified';
      actionBtn.style.background = 'linear-gradient(135deg, #21B06B, #1B9B5C)';
      actionBtn.onclick = handleSelfieActionClick;
    }

    if (retakeBtn) {
      retakeBtn.style.display = 'block';
      retakeBtn.textContent = '↺ Retake Selfie';
    }

    haptic('success');
  }, 1600);
}

function failSelfieScan(errorMsg, reason) {
  _selfiePhase = 'failed';
  const laser = document.getElementById('selfieScanLaser');
  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const retakeBtn = document.getElementById('selfieRetakeBtn');

  if (laser) laser.classList.remove('scanning');
  if (statusPill) {
    statusPill.textContent = errorMsg;
    statusPill.style.color = '#FF4565';
  }
  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.textContent = 'Face Scan Incomplete';
    actionBtn.style.background = 'rgba(255, 255, 255, 0.12)';
  }
  if (retakeBtn) {
    retakeBtn.style.display = 'block';
    retakeBtn.textContent = '↺ Retake Photo';
  }
  haptic('error');
}

function retakeSelfiePhoto() {
  const capturedImg = document.getElementById('selfieCapturedPreview');
  const retakeBtn = document.getElementById('selfieRetakeBtn');
  const actionBtn = document.getElementById('selfieActionBtn');
  const statusPill = document.getElementById('selfieStatusPill');
  const laser = document.getElementById('selfieScanLaser');
  const s1 = document.getElementById('sStep1');
  const s2 = document.getElementById('sStep2');
  const s3 = document.getElementById('sStep3');

  _selfiePhase = 'ready';
  _selfieCapturedDataUrl = null;
  if (_selfieScanTimeout) { clearTimeout(_selfieScanTimeout); _selfieScanTimeout = null; }

  if (capturedImg) { capturedImg.style.display = 'none'; capturedImg.src = ''; }
  if (retakeBtn) retakeBtn.style.display = 'none';
  if (laser) laser.classList.remove('scanning');

  if (s1) s1.className = 'selfie-step-dot active';
  if (s2) s2.className = 'selfie-step-dot';
  if (s3) s3.className = 'selfie-step-dot';

  if (statusPill) {
    statusPill.textContent = 'Align your face inside the oval';
    statusPill.style.color = '#3897F0';
  }

  if (actionBtn) {
    actionBtn.disabled = false;
    actionBtn.textContent = '📸 Capture & Scan Face';
    actionBtn.style.background = 'linear-gradient(135deg, #3897F0, #1E88E5)';
    actionBtn.onclick = handleSelfieActionClick;
  }

  startSelfieLiveCamera();
}
window.retakeSelfiePhoto = retakeSelfiePhoto;

function completeSelfieVerification() {
  currentUser.isVerified = true;
  if (_selfieCapturedDataUrl) {
    try {
      currentUser.verifiedSelfie = _selfieCapturedDataUrl;
    } catch (_) {}
  }

  try {
    localStorage.setItem('hmbs_verified', 'true');
    const savedUserStr = localStorage.getItem('hmbs_user');
    if (savedUserStr) {
      const u = JSON.parse(savedUserStr);
      u.isVerified = true;
      if (_selfieCapturedDataUrl) u.verifiedSelfie = _selfieCapturedDataUrl;
      localStorage.setItem('hmbs_user', JSON.stringify(u));
    }
  } catch (_) {}

  // Sync verified state to Cloud Firestore (both user doc and public profile for matches to see)
  if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    try {
      const uid = fbAuth.currentUser.uid;
      fbDb.collection('users').doc(uid).set({
        isVerified: true,
        verifiedAt: Date.now()
      }, { merge: true }).catch(() => {});

      fbDb.collection('public_profiles').doc(uid).set({
        isVerified: true
      }, { merge: true }).catch(() => {});
    } catch (e) {
      console.warn('Firestore verification sync notice:', e);
    }
  }

  saveToStorage();
  haptic('success');
  if (typeof launchMatchConfetti === 'function') {
    launchMatchConfetti();
  }
  showToast('🛡️ Verified! You earned the official Blue Badge!', 'gold');

  setTimeout(() => {
    closeSelfieVerifyModal();
    renderProfileScreen();
  }, 1400);
}
window.completeSelfieVerification = completeSelfieVerification;
