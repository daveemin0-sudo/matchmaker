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
    (appState.isLoggedIn && currentUser.email && !currentUser.email.includes('guest') && !currentUser.email.includes('demo') && currentUser.id && !currentUser.id.startsWith('demo'))
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
// INIT
// ==========================================================

window.addEventListener('load', () => {
  loadFromStorage();
  setTheme(localStorage.getItem('hookmebysam_theme') || 'dark');

  if (appState.isLoggedIn) {
    showScreen('discovery');
    initMainApp();
  } else {
    showScreen('login');
    updateHeaderForAuth();
  }
});

function initMainApp() {
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

  // Register service worker for PWA
  const isLocalDev = ['localhost', '127.0.0.1', '', '::1'].includes(location.hostname);
  if ('serviceWorker' in navigator && !isLocalDev) {
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

// Reusable handler to process matches & messages payload from Firestore
function applyMatchesUpdate(realMatches) {
  if (!realMatches || realMatches.length === 0) return;
  let hasNewIncomingMessage = false;
  realMatches.forEach(m => {
    if (!DUMMY_USER_IDS.includes(m.id)) {
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
      // If match doc has latest message from partner, sync it
      if (m.lastMessage && m.lastSender && fbAuth?.currentUser && m.lastSender !== fbAuth.currentUser.uid) {
        const msgs = conversations[m.id].messages;
        const lastLocal = msgs[msgs.length - 1];
        if (!lastLocal || lastLocal.text !== m.lastMessage) {
          const isViewing = (appState.currentScreen === 'chat' && appState.currentChatId === m.id);
          msgs.push({
            sender: 'them',
            text: m.lastMessage,
            read: isViewing,
            timestamp: m.lastUpdated || Date.now()
          });
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
  const text = document.getElementById('ptrText');
  if (!indicator) return;

  if (window._ptrBound) return;
  window._ptrBound = true;

  let startY = 0;
  let startX = 0;
  let isPulling = false;
  let isRefreshing = false;
  const PULL_THRESHOLD = 50;
  const MAX_PULL = 82;

  function getScrollTop() {
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return window.scrollY || document.documentElement.scrollTop || 0;
    const scrollContainer = activeScreen.querySelector('.settings-workspace, .matches-workspace, .chats-inbox-wrap, .auth-screen, .profile-screen-workspace, .discovery-workspace, .chat-messages-wrap');
    if (scrollContainer && scrollContainer.scrollTop !== undefined) {
      return scrollContainer.scrollTop;
    }
    return activeScreen.scrollTop || window.scrollY || document.documentElement.scrollTop || 0;
  }

  document.addEventListener('touchstart', (e) => {
    if (isRefreshing || !e.touches || e.touches.length === 0) return;
    if (getScrollTop() <= 4) {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isPulling = false;
    } else {
      startY = 0;
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!startY || isRefreshing || !e.touches || e.touches.length === 0) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = currentY - startY;
    const diffX = currentX - startX;

    // Ignore horizontal swipes (card swiping in discovery)
    if (Math.abs(diffX) > Math.abs(diffY) * 0.85) {
      startY = 0;
      return;
    }

    if (diffY > 8 && getScrollTop() <= 4) {
      isPulling = true;
      const pullDistance = Math.min(MAX_PULL, (diffY - 8) * 0.45);
      indicator.classList.add('ptr-pulling');
      indicator.style.transform = `translate3d(-50%, ${pullDistance}px, 0)`;

      const rotation = Math.min(360, (pullDistance / PULL_THRESHOLD) * 360);
      if (icon) icon.style.transform = `rotate(${rotation}deg)`;

      if (pullDistance >= PULL_THRESHOLD) {
        if (text) text.textContent = 'Release to refresh';
        indicator.style.borderColor = 'var(--gold-1, #F4C550)';
      } else {
        if (text) text.textContent = 'Pull down to refresh';
        indicator.style.borderColor = 'rgba(244, 197, 80, 0.45)';
      }
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
      if (text) text.textContent = 'Updating...';
      if (navigator.vibrate) {
        try { navigator.vibrate(12); } catch (_) {}
      }

      const startTime = Date.now();
      await refreshAppData({ manual: true });
      const elapsed = Date.now() - startTime;
      if (elapsed < 450) {
        await new Promise(r => setTimeout(r, 450 - elapsed));
      }

      if (text) text.textContent = 'Updated ✨';
      setTimeout(() => {
        indicator.classList.remove('ptr-refreshing');
        indicator.style.transform = 'translate3d(-50%, -90px, 0)';
        if (icon) icon.style.transform = 'rotate(0deg)';
        isRefreshing = false;
        isPulling = false;
        startY = 0;
      }, 350);
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
    sortMatchedUsersByLatest();
    updateMatchesNotificationBadge();
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
      trimmedConvos[chatId] = { ...conversations[chatId], messages: Array.isArray(msgs) ? msgs.slice(-MAX_MSGS) : [] };
    }
    localStorage.setItem('hmbs_convos', JSON.stringify(trimmedConvos));
    localStorage.setItem('hmbs_blocked', JSON.stringify(blockedUsers));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      try { localStorage.removeItem('hmbs_convos'); } catch (_) {}
    } else { console.warn('Storage save error', e); }
  }
}


// ==========================================================
// SCREEN NAVIGATION
// ==========================================================

const AUTH_SCREENS = ['login', 'signup', 'signupSuccess'];
const MAIN_SCREENS = ['discovery', 'matches', 'chatsList', 'chat', 'profile', 'settings'];

function showScreen(screenId, { fromHistory = false } = {}) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  const target = document.getElementById(`${screenId}Screen`);
  if (target) target.classList.add('active');

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

function updateHeader(screenId) {
  const backBtn = document.getElementById('backBtn');
  const headerTitle = document.getElementById('headerTitle');
  const headerRight = document.getElementById('headerRight');
  const header = document.getElementById('appHeader');

  if (!header) return;

  // Hide global appHeader on auth screens and on chat screen (chat screen has its own WhatsApp-style header)
  header.style.display = (AUTH_SCREENS.includes(screenId) || screenId === 'chat') ? 'none' : 'flex';

  if (!backBtn || !headerTitle) return;

  // Ensure headerRight is visible on all main screens
  if (headerRight) headerRight.style.display = 'flex';

  const searchBtn = document.getElementById('headerSearchBtn');
  const reportBtn = document.getElementById('chatReportBtn');
  const upgradeBtn = document.getElementById('upgradeHeaderBtn');
  const matchBtn  = document.getElementById('matchesQuickBtn');

  if (searchBtn)  searchBtn.style.display  = (screenId === 'chat' || screenId === 'chatsList') ? 'none' : 'flex';
  if (reportBtn)  reportBtn.style.display  = screenId === 'chat' ? 'flex' : 'none';
  if (upgradeBtn) upgradeBtn.style.display = (screenId === 'chat' || screenId === 'chatsList') ? 'none' : 'flex';
  if (matchBtn)   matchBtn.style.display   = (screenId === 'chat' || screenId === 'chatsList') ? 'none' : 'flex';

  switch (screenId) {
    case 'discovery':
      backBtn.style.display = 'none';
      headerTitle.className = 'main-header-logo';
      headerTitle.innerHTML = '<span class="header-flame-icon">🔥</span><span class="brand-hook">hookme</span><span class="brand-by">by</span><span class="brand-sam">sam</span>';
      headerTitle.style.background = '';
      headerTitle.style.webkitBackgroundClip = '';
      headerTitle.style.webkitTextFillColor = '';
      break;
    case 'matches':
      backBtn.style.display = 'flex';
      setHeaderTitle('Matches');
      break;
    case 'chatsList':
      backBtn.style.display = 'none';
      setHeaderTitle('Messages 💬');
      break;
    case 'chat': {
      backBtn.style.display = 'flex';
      const partner = matchedUsers.find(u => u.id === appState.currentChatId);
      setHeaderTitle(partner ? `${escHtml(partner.name)} <span style="color:var(--green-match);font-size:0.7rem;margin-left:6px">●</span>` : 'Chat');
      break;
    }
    case 'profile':
      backBtn.style.display = 'flex';
      setHeaderTitle('Profile');
      break;
    case 'settings':
      backBtn.style.display = 'flex';
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

  const targets = [document.body, document.querySelector('.app-shell')].filter(Boolean);
  targets.forEach(el => {
    if (theme === 'light') el.setAttribute('data-theme', 'light');
    else el.removeAttribute('data-theme');
  });

  const darkBtn = document.getElementById('themeBtnDark');
  const lightBtn = document.getElementById('themeBtnLight');
  const themeLabel = document.getElementById('themeLabel');

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
    } else if (appState.currentScreen && appState.currentScreen !== 'discovery' && isRealUserLoggedIn()) {
      showScreen('discovery', { fromHistory: true });
    } else {
      handleAppExitAttempt();
    }
  });

  // Handle deep-link hash on page load if applicable
  try {
    const hash = window.location.hash.replace('#', '');
    if (hash && isRealUserLoggedIn()) {
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
  }
  showScreen(tabId);
}

// ==========================================================
// AUTH — LOGIN
// ==========================================================

function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  errorEl.textContent = '';

  if (!email || !password) { errorEl.textContent = 'Please fill in all fields.'; return; }
  if (!email.includes('@')) { errorEl.textContent = 'Please enter a valid email address.'; return; }
  if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; return; }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Signing in...</span>';

  // ---- FIREBASE LIVE MODE ----
  if (typeof fbAuth !== 'undefined' && fbAuth) {
    fbAuth.signInWithEmailAndPassword(email, password)
      .then(async (userCredential) => {
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
              if (uData.image || uData.avatar) {
                currentUser.image = uData.image || uData.avatar;
                currentUser.avatar = currentUser.image;
              }
              if (uData.isVip) {
                appState.isVip = true;
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
      })
      .catch((err) => {
        console.warn("Firebase sign-in error code:", err.code, "message:", err.message);
        const msgs = {
          'auth/user-not-found': 'No account found with this email. Click "Sign Up Free" below to create one!',
          'auth/wrong-password': 'Wrong password. Please check your password and try again.',
          'auth/invalid-credential': 'Incorrect email or password. Click "Sign Up Free" below to register!',
          'auth/invalid-login-credentials': 'Incorrect email or password. Click "Sign Up Free" below to register!',
          'auth/invalid-email': 'Please enter a valid email address.',
          'auth/user-disabled': 'This account has been disabled.',
          'auth/too-many-requests': 'Too many attempts. Please wait a moment or reset your password.'
        };
        errorEl.textContent = msgs[err.code] || 'Incorrect email or password. Click "Sign Up Free" below to register.';
      })
      .finally(() => { btn.disabled = false; btn.innerHTML = 'Sign In'; });
    return;
  }

  // ---- LOCAL FALLBACK (no Firebase yet) ----
  setTimeout(() => {
    currentUser.email = email;
    appState.isLoggedIn = true;
    saveToStorage();
    showScreen('discovery');
    initMainApp();
    btn.disabled = false;
    btn.innerHTML = 'Sign In';
  }, 900);
}

function handleGoogleLogin() {
  const btn = document.getElementById('googleLoginBtn');
  btn.disabled = true;
  const googleIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 4.5C13.8 4.5 15.4 5.2 16.6 6.3L19.9 3C17.9 1.1 15.1 0 12 0C7.4 0 3.4 2.6 1.4 6.4L5.2 9.3C6.2 6.5 8.8 4.5 12 4.5Z" fill="#EA4335"/><path d="M23.5 12.3C23.5 11.4 23.4 10.6 23.3 9.8H12V14.5H18.5C18.2 16 17.4 17.2 16.2 18L19.9 20.8C22.1 18.8 23.5 15.8 23.5 12.3Z" fill="#4285F4"/><path d="M5.2 14.7C4.9 13.9 4.8 13 4.8 12C4.8 11 5 10.1 5.2 9.3L1.4 6.4C0.5 8.1 0 10 0 12C0 14 0.5 15.9 1.4 17.6L5.2 14.7Z" fill="#FBBC05"/><path d="M12 24C15.1 24 17.8 23 19.9 20.8L16.2 18C15.1 18.7 13.7 19.2 12 19.2C8.8 19.2 6.2 17.2 5.2 14.4L1.4 17.3C3.4 21.4 7.4 24 12 24Z" fill="#34A853"/></svg>`;
  btn.innerHTML = `${googleIconSvg} Signing in...`;

  // ---- FIREBASE GOOGLE LOGIN ----
  if (typeof fbAuth !== 'undefined' && fbAuth && typeof firebase !== 'undefined') {
    const provider = new firebase.auth.GoogleAuthProvider();
    fbAuth.signInWithPopup(provider)
      .then((result) => {
        currentUser.email = result.user.email;
        currentUser.id = result.user.uid;
        currentUser.displayName = result.user.displayName;
        if (result.user.photoURL) currentUser.avatar = result.user.photoURL;
        appState.isLoggedIn = true;
        saveToStorage();
        showScreen('discovery');
        initMainApp();
      })
      .catch((err) => {
        showToast(err.code === 'auth/popup-closed-by-user' ? 'Google sign-in cancelled.' : 'Google sign-in failed. Try again.', 'error');
      })
      .finally(() => { btn.disabled = false; btn.innerHTML = `${googleIconSvg} Continue with Google`; });
    return;
  }

  // ---- LOCAL FALLBACK ----
  setTimeout(() => {
    appState.isLoggedIn = true;
    currentUser.email = 'google@user.com';
    saveToStorage();
    showScreen('discovery');
    initMainApp();
    btn.disabled = false;
    btn.innerHTML = `${googleIconSvg} Continue with Google`;
  }, 1100);
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

function completeSignup() {
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const errorEl = document.getElementById('signupError4');

  if (!email || !email.includes('@')) {
    if (errorEl) errorEl.textContent = 'Please enter a valid email.';
    return;
  }
  if (password.length < 6) {
    if (errorEl) errorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }

  const userPhoto = currentUser.image || currentUser.avatar;
  if (!userPhoto) {
    if (errorEl) errorEl.textContent = 'Profile picture missing. Please go back to Step 3 and upload your photo.';
    return;
  }

  const btn = document.getElementById('signupCompleteBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = 'Creating account...'; }

  // ---- FIREBASE LIVE SIGNUP ----
  if (typeof fbAuth !== 'undefined' && fbAuth) {
    fbAuth.createUserWithEmailAndPassword(email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        currentUser.email = email;
        currentUser.id = user.uid;
        appState.isLoggedIn = true;
        saveToStorage();

        // Save complete profile to Firestore with their real uploaded photo
        if (typeof fbDb !== 'undefined' && fbDb) {
          const userName = currentUser.name || currentUser.displayName || email.split('@')[0];
          await fbDb.collection('users').doc(user.uid).set({
            id: user.uid,
            email: email,
            name: userName,
            displayName: userName,
            age: currentUser.age || 24,
            bio: currentUser.bio || 'Looking for real connections on hookmebysam!',
            gender: currentUser.gender || 'Female',
            interests: currentUser.interests || ['Music 🎵', 'Vibes ✨'],
            image: userPhoto,
            avatar: userPhoto,
            isVip: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account'; }
        showScreen('signupSuccess');
        initMainApp();
      })
      .catch((err) => {
        const msgs = {
          'auth/email-already-in-use': 'An account with this email already exists.',
          'auth/weak-password': 'Password must be at least 6 characters.',
          'auth/invalid-email': 'Please enter a valid email address.'
        };
        if (errorEl) errorEl.textContent = msgs[err.code] || 'Signup failed. Try again.';
        if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account'; }
      });
    return;
  }

  // ---- LOCAL FALLBACK ----
  currentUser.email = email;
  appState.isLoggedIn = true;
  saveToStorage();
  setTimeout(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account'; }
    showScreen('signupSuccess');
    initMainApp();
  }, 900);
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

  const tagsHTML = p.tags.map(t => `<span class="tag-chip">${t}</span>`).join('');

  card.innerHTML = `
    <div class="card-photo-area" style="background-image: url('${p.image}')">
      <div class="card-photo-dots">
        <div class="photo-dot active"></div>
        <div class="photo-dot"></div>
        <div class="photo-dot"></div>
      </div>
      <div class="card-distance-badge">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        ${p.distance}
      </div>
      <div class="stamp stamp-like">LIKE</div>
      <div class="stamp stamp-nope">NOPE</div>
    </div>
    <div class="card-info">
      <div class="card-name-row">
        <h2>${p.name}, ${p.age}</h2>
        <span class="verified-icon" title="Verified">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DA1F2"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </span>
      </div>
      <div class="card-tags">${tagsHTML}</div>
      <p class="card-bio">${p.bio}</p>
    </div>
  `;

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
  profileStack.shift();
  renderCardStack();

  // Record swipe in Firestore if logged in with Firebase
  if (typeof recordSwipeInBackend === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const isMutual = await recordSwipeInBackend(profile.id, dir === 'right' ? 'like' : 'pass');
    if (isMutual && dir === 'right') {
      triggerMatchPopup(profile);
    }
  } else {
    // Local prototype mode
    if (dir === 'right' && profile.mutualChance) {
      setTimeout(() => triggerMatchPopup(profile), 400);
    }
  }
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

function movePartnerToTop(partnerId) {
  if (!partnerId) return;
  const index = matchedUsers.findIndex(u => u.id === partnerId);
  if (index > 0) {
    const [partner] = matchedUsers.splice(index, 1);
    matchedUsers.unshift(partner);
  } else if (index === -1) {
    const p = PROFILES_DATA.find(u => u.id === partnerId);
    if (p) {
      matchedUsers.unshift({ ...p });
    }
  }
}

function sortMatchedUsersByLatest() {
  matchedUsers.sort((a, b) => {
    const aHist = conversations[a.id]?.messages || [];
    const bHist = conversations[b.id]?.messages || [];
    const aLast = aHist[aHist.length - 1];
    const bLast = bHist[bHist.length - 1];
    const aTime = aLast?.timestamp || (a.lastUpdated || a.matchedAt || 0);
    const bTime = bLast?.timestamp || (b.lastUpdated || b.matchedAt || 0);
    return bTime - aTime;
  });
}

function markConversationAsRead(partnerId) {
  if (conversations[partnerId]?.messages) {
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
      messages: [{ sender: 'them', text: `It's a match! Say something 👋`, read: false, timestamp: Date.now() }]
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

function _buildConvoItemHtml(u, filterQuery) {
  const hist = conversations[u.id]?.messages || [];
  const last = hist[hist.length - 1];
  const lastMsgRaw = last
    ? (last.isVoice ? '🎤 Voice note' : (last.imageUrl ? '📷 Photo' : (last.text || '')))
    : 'Say hi! 👋';
  const lastText = last?.sender === 'me' ? `You: ${lastMsgRaw}` : lastMsgRaw;

  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    if (!u.name.toLowerCase().includes(q) && !lastText.toLowerCase().includes(q)) return '';
  }

  const unreadCount = getUnreadMessagesCount(u.id);
  const isUnread = unreadCount > 0;
  const isOnline = Math.random() > 0.5;

  let timeDisplay = '';
  if (last?.timestamp) {
    const diffSec = Math.floor((Date.now() - last.timestamp) / 1000);
    if (diffSec < 60) timeDisplay = 'Just now';
    else if (diffSec < 3600) timeDisplay = `${Math.floor(diffSec / 60)}m`;
    else if (diffSec < 86400) timeDisplay = `${Math.floor(diffSec / 3600)}h`;
    else timeDisplay = `${Math.floor(diffSec / 86400)}d`;
  } else if (hist.length > 0) {
    timeDisplay = 'Just now';
  }

  return `
    <div class="convo-item ${isUnread ? 'convo-unread' : ''}" onclick="openChat('${u.id}')">
      <div class="convo-avatar-wrap">
        <div class="convo-avatar" style="background-image:url('${u.image}')"></div>
        ${isOnline ? '<div class="convo-online-dot"></div>' : ''}
      </div>
      <div class="convo-body">
        <div class="convo-name ${isUnread ? 'convo-name-unread' : ''}">${escHtml(u.name)}</div>
        <div class="convo-preview ${isUnread ? 'convo-preview-unread' : ''}">${escHtml(lastText).substring(0, 46)}${lastText.length > 46 ? '…' : ''}</div>
      </div>
      <div class="convo-meta">
        <span class="convo-time ${isUnread ? 'convo-time-unread' : ''}">${timeDisplay}</span>
        ${isUnread ? `<span class="convo-unread-pill">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
      </div>
    </div>`;
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

  col.innerHTML = matchedUsers.map(u => _buildConvoItemHtml(u, '')).join('');
}

// ==========================================================
// CHAT INBOX (chatsListScreen)
// ==========================================================

function renderChatsInbox(filterQuery) {
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

  const rows = matchedUsers.map(u => _buildConvoItemHtml(u, filterQuery || '')).filter(Boolean);
  if (rows.length === 0) {
    col.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--txt-muted);font-size:0.88rem;">No conversations match your search.</div>`;
  } else {
    col.innerHTML = rows.join('');
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
    '😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨',
    '😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕',
    '🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟',
    '🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣',
    '😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👻'
  ],
  gestures: [
    '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉',
    '👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲',
    '🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁',
    '👀','👁️','👅','👄','🫦'
  ],
  love: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
    '💘','💝','💟','💌','🫀','💋','🫂','👩‍❤️‍👨','👩‍❤️‍👩','👨‍❤️‍👨','👩‍❤️‍💋‍👨','💏','💑',
    '💍','💎','💐','🌹','🥀','🌺','🌷','🌸','💮','🪷','🕯️','✨','💫','⭐','🌟','🔥'
  ],
  party: [
    '🎉','🎊','🥳','🍾','🥂','🍻','🍺','🍷','🍸','🍹','🥃','🎂','🍰','🧁','🎈','🎁',
    '🎀','🪅','🎇','🎆','🧨','✨','🪄','💃','🕺','👯','🎶','🎵','🎤','🎧','📻','🎷',
    '🎸','🎹','🎺','🎻','🪘','🥁','🪩','🎪','🎭','🎨','🎬','🎟️'
  ],
  food: [
    '🍕','🍔','🍟','🌭','🍿','🥓','🥞','🧇','🥐','🥖','🥨','🥯','🧀','🥗','🥙','🥪',
    '🌮','🌯','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🥠',
    '🍢','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍩','🍪','🌰','🥜',
    '🍯','🥛','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉'
  ],
  activities: [
    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍',
    '🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌',
    '🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','🤺','⛹️','🤾','🧗','🧘','🏄','🏊','🤽','🚣',
    '🚴','🚵','🏆','🥇','🥈','🥉','🎯','🎮','🎲','🎳','🚗','🚕','✈️','🚀','🏖️','🏝️'
  ]
};

let currentEmojiCategory = 'smileys';

// ==========================================================
// SMART CHAT AUTO-SUGGESTIONS (Real-time while typing)
// ==========================================================
const CHAT_AUTO_SUGGESTIONS = [
  { trigger: ['h', 'he', 'hey', 'hi', 'hel', 'hello'], suggestions: ['Hey! How are you doing today? 😊', 'Hello! So great to connect with you ✨', 'Hey there, how was your weekend?'] },
  { trigger: ['yo', 'sup', 'whatsup', 'whats up'], suggestions: ['What\'s up! Having a good day so far?', 'Hey! Just chilling, what about you?'] },
  { trigger: ['gm', 'good m', 'morning'], suggestions: ['Good morning! Hope you have an awesome day ☀️', 'Good morning! Up early today? ☕'] },
  { trigger: ['ge', 'good e', 'evening'], suggestions: ['Good evening! How was your day? 🌙', 'Good evening! Any fun plans tonight?'] },
  { trigger: ['are', 'are y', 'are you', 'free', 'weekend'], suggestions: ['Are you free for coffee sometime this week? ☕', 'Are you doing anything fun this weekend?', 'Are you more of an indoor or outdoor person?'] },
  { trigger: ['would', 'would y', 'wanna', 'want to'], suggestions: ['Would you like to grab drinks or dinner? 🥂', 'Wanna go check out a live music spot together? 🎵', 'Would love to get to know you more!'] },
  { trigger: ['let', 'lets', 'let\'s'], suggestions: ['Let\'s plan something fun together soon! ✨', 'Let\'s exchange playlists 🎶', 'Let\'s grab lunch this Saturday 🍕'] },
  { trigger: ['lag', 'lagos', 'where', 'spot', 'place'], suggestions: ['What\'s your favorite spot in Lagos? 🌴', 'Where do you usually like to hang out?', 'Have you been to any nice beach houses lately?'] },
  { trigger: ['food', 'eat', 'dinner', 'lunch', 'brunch'], suggestions: ['What\'s your absolute favorite food spot? 🌮', 'I know an amazing brunch place we should try 🥞'] },
  { trigger: ['music', 'song', 'listen', 'playlist', 'track'], suggestions: ['What playlist are you listening to right now? 🎵', 'Are you into Amapiano or Afrobeats? 💫'] },
  { trigger: ['ha', 'haha', 'lol', 'lmao'], suggestions: ['Haha that\'s hilarious! 😂', 'Haha you have such a great sense of humor! 💫', 'Haha right?! I knew it!'] },
  { trigger: ['sound', 'sounds'], suggestions: ['Sounds like a plan! 🙌', 'Sounds amazing, let\'s make it happen!', 'Sounds super fun! 😊'] },
  { trigger: ['love', 'i love', 'like'], suggestions: ['I love that so much! ❤️', 'Love your style in your pictures! ✨', 'I\'d love that! When are you free?'] },
  { trigger: ['cool', 'nice', 'awesome', 'sweet'], suggestions: ['That\'s so cool! Tell me more about it 🤩', 'That sounds really awesome!', 'Super nice!'] },
  { trigger: ['thank', 'thanks', 'thx'], suggestions: ['Thank you! You\'re very sweet 😊', 'Thanks a lot! Hope your day is going well'] }
];

function getSmartChatSuggestions(text) {
  const clean = text.trim().toLowerCase();
  if (!clean) return [];

  const matched = [];
  for (const item of CHAT_AUTO_SUGGESTIONS) {
    const hits = item.trigger.some(trig => clean.startsWith(trig) || clean.includes(trig) || trig.startsWith(clean));
    if (hits) {
      for (const s of item.suggestions) {
        if (!matched.includes(s) && matched.length < 3) {
          matched.push(s);
        }
      }
    }
  }

  if (matched.length === 0 && clean.length > 0) {
    if (clean.endsWith('?')) {
      matched.push('Haha let me think about that! 🤔', 'Definitely! What about you?', 'That\'s a great question! 😊');
    } else {
      matched.push('I totally agree! ✨', 'Tell me more about it! 😊', 'That\'s so interesting! 🙌');
    }
  }

  return matched.slice(0, 3);
}

function applyChatSuggestion(suggestionText) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  input.value = suggestionText;
  onChatInputChange();
  input.focus();
}

// ==========================================================
// CHAT NAVIGATION & HEADER (WhatsApp Style)
// ==========================================================
function openChat(profileId, { fromHistory = false } = {}) {
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
    statusEl.innerHTML = '<span class="status-online-dot">●</span> Active now';
  }

  // Clear typing suggestions and emoji panel
  const suggestBox = document.getElementById('chatAutoSuggestBox');
  if (suggestBox) { suggestBox.style.display = 'none'; suggestBox.innerHTML = ''; }
  const emojiPanel = document.getElementById('emojiPickerPanel');
  if (emojiPanel) emojiPanel.style.display = 'none';
  const chatInput = document.getElementById('chatInput');
  if (chatInput) chatInput.value = '';
  onChatInputChange();

  renderChatThread();

  // Unsubscribe from any previous Firestore chat listener
  if (typeof activeRealtimeListener === 'function') {
    activeRealtimeListener();
    activeRealtimeListener = null;
  }

  // Subscribe to real-time Firebase chat if logged in
  if (typeof listenToRealtimeMessages === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const matchId = [fbAuth.currentUser.uid, profileId].sort().join('_');
    activeRealtimeListener = listenToRealtimeMessages(matchId, (msgs) => {
      if (msgs && msgs.length > 0) {
        conversations[profileId] = {
          messages: msgs.map(m => {
            const isMe = m.sender === fbAuth.currentUser.uid;
            return {
              sender: isMe ? 'me' : 'them',
              text: m.text || '',
              isVoice: m.isVoice || false,
              audioUrl: m.audioUrl || '',
              imageUrl: m.imageUrl || '',
              duration: m.duration || '0:05',
              read: true,
              timestamp: m.timestamp?.toMillis ? m.timestamp.toMillis() : (typeof m.timestamp === 'number' ? m.timestamp : Date.now()),
              reactions: m.reactions || {},
              firestoreId: m.id || null
            };
          })
        };
        // Mark newly received messages as read
        if (typeof markMessagesReadInFirestore === 'function') {
          markMessagesReadInFirestore(matchId);
        }
        movePartnerToTop(profileId);
        renderChatThread();
        renderConversationList();
        renderChatsInbox();
        updateMatchesNotificationBadge();
        saveToStorage();
      }
    });
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

  const photo = partner.image || partner.photoUrl || '';
  const tagsHtml = (partner.tags || ['Positive vibes ✨', 'Music 🎵', 'Foodie 🍕']).map(t => `<span class="wa-interest-pill">${escHtml(t)}</span>`).join('');
  const partnerName = escHtml(partner.name || 'User');
  const partnerAge = partner.age || 24;
  const partnerDistance = partner.distance || '3 km away';
  const partnerBio = escHtml(partner.bio || 'Living life with good energy, positive vibes only! ✨');

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
            <span class="wa-status-text">Active now • Lekki, Lagos</span>
          </div>
        </div>

        <!-- WhatsApp Quick Action Icons -->
        <div class="wa-quick-actions">
          <button class="wa-action-btn" onclick="closeWhatsAppProfile()" title="Message">
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
              <div class="wa-info-main">Lagos, Nigeria</div>
              <div class="wa-info-sub">${partnerDistance}</div>
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
    if (conversations[appState.currentChatId]) {
      conversations[appState.currentChatId].messages = [];
    }
    renderChatThread();
    renderConversationList();
    saveToStorage();
    showToast('Chat cleared', 'info');
  }
}

function renderChatThread() {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const hist = conversations[appState.currentChatId]?.messages || [];
  const partnerId = appState.currentChatId;
  const matchId = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser && partnerId)
    ? [fbAuth.currentUser.uid, partnerId].sort().join('_')
    : null;

  if (hist.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--text-muted);font-size:0.88rem">Start the conversation! 👋</div>`;
    return;
  }

  container.innerHTML = hist.map((msg, idx) => {
    const isLast = idx === hist.length - 1;
    const isSent = msg.sender === 'me';
    const msgId = msg.firestoreId || `local_${idx}`;

    // Build reaction bar
    const reactions = msg.reactions || {};
    const reactionKeys = Object.keys(reactions).filter(k => reactions[k]?.length > 0);
    const reactionBar = reactionKeys.length > 0
      ? `<div class="msg-reaction-bar">${reactionKeys.map(emoji =>
          `<span class="msg-reaction-pill" onclick="toggleMsgReaction('${matchId}','${msgId}','${emoji}')">${emoji} <span>${reactions[emoji].length}</span></span>`
        ).join('')}</div>`
      : '';

    const pressEvents = `onmousedown="startLongPress(event,'${matchId}','${msgId}')" onmouseup="cancelLongPress()" onmouseleave="cancelLongPress()" ontouchstart="startLongPress(event,'${matchId}','${msgId}')" ontouchend="cancelLongPress()" oncontextmenu="event.preventDefault();showReactionPicker(event,'${matchId}','${msgId}')"`;

    let bubbleHtml = '';
    const receiptHtml = isSent ? `<span class="msg-receipt ${isLast ? 'read' : ''}">✓✓</span>` : '';
    const editedHtml = msg.edited ? `<span class="msg-edited">(edited)</span>` : '';
    const forwardedHtml = msg.forwarded
      ? `<div class="msg-forwarded-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg> Forwarded</div>`
      : '';

    if (msg.imageUrl) {
      bubbleHtml = `
        <div class="msg-bubble ${isSent ? 'sent' : 'received'}" style="padding:4px;max-width:240px;overflow:hidden;cursor:pointer" ${pressEvents}>
          <img src="${msg.imageUrl}" style="width:100%;border-radius:14px;display:block">
          ${receiptHtml}
        </div>`;
    } else if (msg.isVoice) {
      bubbleHtml = `
        <div class="msg-bubble audio-bubble ${isSent ? 'sent' : 'received'}" style="cursor:pointer" ${pressEvents}>
          <div style="display:flex;align-items:center;gap:10px;width:170px">
            <span style="cursor:pointer;font-size:14px">▶️</span>
            <div style="flex:1;height:4px;background:rgba(255,255,255,0.3);border-radius:2px;position:relative">
              <div style="width:55%;height:100%;background:#fff;border-radius:2px"></div>
            </div>
            <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.9)">${msg.duration || '0:05'}</span>
          </div>
          ${receiptHtml}
        </div>`;
    } else {
      bubbleHtml = `
        <div class="msg-bubble ${isSent ? 'sent' : 'received'}" style="cursor:pointer" ${pressEvents}>
          ${escHtml(msg.text)}${editedHtml}${receiptHtml}
        </div>`;
    }

    return `
      <div class="msg-row ${isSent ? 'sent' : 'received'}" style="display:flex;flex-direction:column;align-self:${isSent ? 'flex-end' : 'flex-start'};align-items:${isSent ? 'flex-end' : 'flex-start'};max-width:78%;gap:3px">
        ${forwardedHtml}
        ${bubbleHtml}
        ${reactionBar}
      </div>`;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function onChatInputChange() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const micBtn = document.getElementById('micBtn');
  const suggestBox = document.getElementById('chatAutoSuggestBox');
  if (!input) return;

  const text = input.value;
  const hasText = text.trim().length > 0;
  if (sendBtn) sendBtn.style.display = hasText ? 'flex' : 'none';
  if (micBtn) micBtn.style.display = hasText ? 'none' : 'flex';

  if (!suggestBox) return;

  if (!hasText) {
    suggestBox.style.display = 'none';
    suggestBox.innerHTML = '';
    return;
  }

  // Dynamic auto-suggestions while typing
  const suggestions = getSmartChatSuggestions(text);
  if (suggestions.length > 0) {
    suggestBox.innerHTML = suggestions.map(s => {
      const safeText = s.replace(/'/g, "\\'");
      return `<button type="button" class="chat-suggest-chip" onclick="applyChatSuggestion('${safeText}')"><span class="suggest-sparkle">✨</span> ${escHtml(s)}</button>`;
    }).join('');
    suggestBox.style.display = 'flex';
  } else {
    suggestBox.style.display = 'none';
    suggestBox.innerHTML = '';
  }
}

function toggleEmojiPicker() {
  const panel = document.getElementById('emojiPickerPanel');
  const toggleBtn = document.getElementById('emojiToggleBtn');
  if (!panel) return;
  const isOpen = panel.style.display === 'flex';
  panel.style.display = isOpen ? 'none' : 'flex';

  if (toggleBtn) {
    if (!isOpen) toggleBtn.classList.add('active-emoji');
    else toggleBtn.classList.remove('active-emoji');
  }

  if (!isOpen) {
    renderEmojiCategory(currentEmojiCategory);
  }
}

function switchEmojiCategory(cat, btn) {
  currentEmojiCategory = cat;
  document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderEmojiCategory(cat);
}

function renderEmojiCategory(cat) {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  const emojis = CATEGORIZED_EMOJIS[cat] || CATEGORIZED_EMOJIS.smileys;
  grid.innerHTML = emojis.map(e => `
    <button type="button" class="emoji-cell" onclick="insertEmoji('${e}')" title="${e}">${e}</button>
  `).join('');
}

function insertEmoji(emoji) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  input.value += emoji;
  onChatInputChange();
  input.focus();
}

function sendImageMessage(event) {
  const file = event.target.files?.[0];
  if (!file || !appState.currentChatId) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const imageUrl = e.target.result;
    if (!conversations[appState.currentChatId]) {
      conversations[appState.currentChatId] = { messages: [] };
    }
    conversations[appState.currentChatId].messages.push({
      sender: 'me',
      imageUrl: imageUrl,
      read: true,
      timestamp: Date.now()
    });
    movePartnerToTop(appState.currentChatId);
    renderChatThread();
    renderConversationList();
    renderChatsInbox();
    updateMatchesNotificationBadge();
    saveToStorage();
    showToast('📷 Image sent!', 'gold');

    if (typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      const matchId = [fbAuth.currentUser.uid, appState.currentChatId].sort().join('_');
      sendRealtimeMessage(matchId, '', false, '', imageUrl);
    }
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// ==========================================================
// REAL LIVE VOICE & VIDEO CALLING (WebRTC + Metered TURN/STUN)
// ==========================================================
const METERED_ICE_SERVERS = [
  { urls: "stun:stun.relay.metered.ca:80" },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "73728b7e530599273f071f39",
    credential: "P2/M1eJj54opo4/R"
  },
  {
    urls: "turn:global.relay.metered.ca:80?transport=tcp",
    username: "73728b7e530599273f071f39",
    credential: "P2/M1eJj54opo4/R"
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "73728b7e530599273f071f39",
    credential: "P2/M1eJj54opo4/R"
  },
  {
    urls: "turns:global.relay.metered.ca:443?transport=tcp",
    username: "73728b7e530599273f071f39",
    credential: "P2/M1eJj54opo4/R"
  }
];

let peerConnectionConfig = {
  iceServers: METERED_ICE_SERVERS
};

// Asynchronously refresh dynamic TURN credentials from Metered if available
async function refreshTurnCredentials() {
  try {
    const token = await fbAuth?.currentUser?.getIdToken();
    if (!token) return;
    const res = await fetch(`${BACKEND_URL}/turn/credentials`, { headers: { Authorization: 'Bearer ' + token } });
    if (res.ok) {
      const liveServers = await res.json();
      if (Array.isArray(liveServers) && liveServers.length > 0) {
        peerConnectionConfig.iceServers = liveServers;
        console.log("✅ Live Metered TURN servers loaded:", liveServers.length, "relays active");
      }
    }
  } catch (e) {
    console.log("Using static Metered TURN credentials fallback.");
  }
}
refreshTurnCredentials();

let activeMediaStream = null;
let activePeerConnection = null;
let activeCallTimerInterval = null;
let activeCallSeconds = 0;
let isAudioMuted = false;
let isVideoMuted = false;

async function startVoiceCall() {
  const partner = matchedUsers.find(u => u.id === appState.currentChatId) || PROFILES_DATA.find(u => u.id === appState.currentChatId);
  const name = partner ? partner.name : 'Match';
  const photo = partner?.image || partner?.photoUrl || '';

  const overlay = document.getElementById('voiceCallOverlay');
  const avatarImg = document.getElementById('callAvatarImg');
  const nameEl = document.getElementById('callName');
  const statusEl = document.getElementById('callStatusText');
  const timerEl = document.getElementById('callLiveTimer');

  if (avatarImg) {
    if (photo) avatarImg.style.backgroundImage = `url('${photo}')`;
    else avatarImg.style.backgroundImage = 'none';
  }
  if (nameEl) nameEl.textContent = name;
  if (statusEl) statusEl.textContent = 'Calling... 📞';
  if (timerEl) { timerEl.textContent = '0:00'; timerEl.style.display = 'none'; }
  if (overlay) overlay.style.display = 'flex';

  activeCallSeconds = 0;
  clearInterval(activeCallTimerInterval);

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      activeMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  } catch (err) {
    console.warn('Microphone permission not granted or device not available:', err);
  }

  setTimeout(() => {
    if (overlay && overlay.style.display === 'flex') {
      if (statusEl) statusEl.textContent = 'Connected';
      if (timerEl) timerEl.style.display = 'block';
      activeCallTimerInterval = setInterval(() => {
        activeCallSeconds++;
        const mins = Math.floor(activeCallSeconds / 60);
        const secs = activeCallSeconds % 60;
        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        if (timerEl) timerEl.textContent = timeStr;
      }, 1000);
    }
  }, 1600);

  showToast(`Calling ${name}... 📞`, 'info');
}

async function startVideoCall() {
  const partner = matchedUsers.find(u => u.id === appState.currentChatId) || PROFILES_DATA.find(u => u.id === appState.currentChatId);
  const name = partner ? partner.name : 'Match';
  const photo = partner?.image || partner?.photoUrl || '';

  const overlay = document.getElementById('videoCallOverlay');
  const remoteBg = document.getElementById('videoRemoteBg');
  const nameEl = document.getElementById('videoCallName');
  const timerEl = document.getElementById('videoCallTimer');
  const videoEl = document.getElementById('myVideoStream');

  if (remoteBg) {
    if (photo) {
      remoteBg.style.backgroundImage = `url('${photo}')`;
      remoteBg.style.backgroundSize = 'cover';
      remoteBg.style.backgroundPosition = 'center';
    } else {
      remoteBg.style.background = 'radial-gradient(circle at center, #2e1026 0%, #0A0710 100%)';
    }
  }
  if (nameEl) nameEl.textContent = name;
  if (timerEl) timerEl.textContent = 'Connecting...';
  if (overlay) overlay.style.display = 'flex';

  activeCallSeconds = 0;
  clearInterval(activeCallTimerInterval);

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      activeMediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });
      if (videoEl) {
        videoEl.srcObject = activeMediaStream;
        videoEl.play().catch(e => console.log('Video play caught:', e));
      }
    }
  } catch (err) {
    console.warn('Camera/Mic permission not granted or device not available:', err);
  }

  setTimeout(() => {
    if (overlay && overlay.style.display === 'flex') {
      activeCallTimerInterval = setInterval(() => {
        activeCallSeconds++;
        const mins = Math.floor(activeCallSeconds / 60);
        const secs = activeCallSeconds % 60;
        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        if (timerEl) timerEl.textContent = timeStr;
      }, 1000);
    }
  }, 1200);

  showToast(`Starting video call with ${name}... 📹`, 'info');
}

function endCall() {
  if (activeMediaStream) {
    activeMediaStream.getTracks().forEach(track => track.stop());
    activeMediaStream = null;
  }
  clearInterval(activeCallTimerInterval);
  activeCallTimerInterval = null;

  const voice = document.getElementById('voiceCallOverlay');
  const video = document.getElementById('videoCallOverlay');
  if (voice) voice.style.display = 'none';
  if (video) video.style.display = 'none';

  const videoEl = document.getElementById('myVideoStream');
  if (videoEl) videoEl.srcObject = null;

  showToast(activeCallSeconds > 0 ? `Call ended (${Math.floor(activeCallSeconds/60)}m ${activeCallSeconds%60}s)` : 'Call ended', 'info');
  activeCallSeconds = 0;
}

function endVideoCall() {
  endCall();
}

function toggleCallMute() {
  isAudioMuted = !isAudioMuted;
  if (activeMediaStream) {
    activeMediaStream.getAudioTracks().forEach(track => {
      track.enabled = !isAudioMuted;
    });
  }
  const muteBtn = document.getElementById('callMuteBtn');
  if (muteBtn) {
    muteBtn.style.background = isAudioMuted ? 'rgba(255, 61, 0, 0.25)' : '';
    muteBtn.style.color = isAudioMuted ? '#FF3D00' : '';
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
  const pipCamOff = document.getElementById('pipCamOff');
  if (pipCamOff) {
    pipCamOff.style.display = isVideoMuted ? 'flex' : 'none';
  }
  const camBtn = document.getElementById('videoCamBtn');
  if (camBtn) {
    camBtn.style.background = isVideoMuted ? 'rgba(255, 61, 0, 0.25)' : '';
    camBtn.style.color = isVideoMuted ? '#FF3D00' : '';
  }
  showToast(isVideoMuted ? 'Camera paused' : 'Camera active', 'info');
}

function toggleSpeaker() {
  showToast('Speaker output toggled 🔊', 'info');
}

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

  conversations[appState.currentChatId].messages.push({
    sender: 'me',
    text,
    read: true,
    timestamp: Date.now()
  });
  input.value = '';
  movePartnerToTop(appState.currentChatId);
  renderChatThread();
  renderConversationList();
  renderChatsInbox();
  updateMatchesNotificationBadge();
  saveToStorage();

  // Send via real-time Firebase if logged in, otherwise handle local demo mode
  if (typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const matchId = [fbAuth.currentUser.uid, appState.currentChatId].sort().join('_');
    sendRealtimeMessage(matchId, text);

    // Trigger push notification to partner (fire-and-forget)
    const myName = currentUser.name || 'Your match';
    fbAuth.currentUser.getIdToken().then(token => fetch(`${BACKEND_URL}/fcm/new-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        toUserId: appState.currentChatId,
        fromUserName: myName,
        messageText: text,
        matchId: fbAuth.currentUser.uid
      })
    }).catch(() => {}); // Non-blocking, never fail the send
  } else {
    triggerAutoReply();
  }
}

function handleChatKeydown(e) {
  if (e.key === 'Enter') sendMessage();
}

function sendIcebreaker(text) {
  if (!appState.currentChatId) return;
  if (!conversations[appState.currentChatId]) {
    conversations[appState.currentChatId] = { messages: [] };
  }
  conversations[appState.currentChatId].messages.push({
    sender: 'me',
    text,
    read: true,
    timestamp: Date.now()
  });

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
    sendRealtimeMessage(matchId, text);
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

async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.start();

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
      // Max 3 min recording
      if (voiceRecSeconds >= 180) sendVoiceNote();
    }, 1000);

  } catch (err) {
    showToast('Microphone access denied. Please allow mic access.', 'error');
  }
}

async function sendVoiceNote() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  clearInterval(voiceRecTimerInterval);

  return new Promise(resolve => {
    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      const duration = voiceRecSeconds;
      const durationStr = `${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')}`;

      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach(t => t.stop());

      appState.isRecording = false;

      // Restore input bar
      const inputBar = document.querySelector('.chat-input-bar');
      const recordBar = document.getElementById('voiceRecordBar');
      if (inputBar) inputBar.style.display = 'flex';
      if (recordBar) recordBar.style.display = 'none';

      if (!appState.currentChatId) { resolve(); return; }
      if (!conversations[appState.currentChatId]) conversations[appState.currentChatId] = { messages: [] };
      conversations[appState.currentChatId].messages.push({
        sender: 'me',
        isVoice: true,
        duration: durationStr,
        audioUrl,
        read: true,
        timestamp: Date.now()
      });
      movePartnerToTop(appState.currentChatId);
      renderChatThread();
      renderConversationList();
      renderChatsInbox();
      updateMatchesNotificationBadge();
      saveToStorage();

      if (typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
        const matchId = [fbAuth.currentUser.uid, appState.currentChatId].sort().join('_');
        if (typeof uploadFileToBackend === 'function') {
          uploadFileToBackend(audioBlob, 'voicenotes').then(uploadedUrl => {
            sendRealtimeMessage(matchId, '', true, uploadedUrl || audioUrl);
          }).catch(() => {
            sendRealtimeMessage(matchId, '', true, audioUrl);
          });
        } else {
          sendRealtimeMessage(matchId, '', true, audioUrl);
        }
      } else {
        triggerAutoReply();
      }
      resolve();
    };
    mediaRecorder.stop();
  });
}

function cancelVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    mediaRecorder.stop();
  }
  clearInterval(voiceRecTimerInterval);
  appState.isRecording = false;

  const inputBar = document.querySelector('.chat-input-bar');
  const recordBar = document.getElementById('voiceRecordBar');
  if (inputBar) inputBar.style.display = 'flex';
  if (recordBar) recordBar.style.display = 'none';
}

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

  const displayName = currentUser.name || currentUser.displayName || 'Dave';
  const displayAge = currentUser.age || 24;
  const displayLoc = currentUser.location || 'Lagos, Nigeria';
  const displayBio = currentUser.bio || 'Software engineer and builder. Love beach hangouts in Lekki and good vibes.';
  const displayInterests = (currentUser.interests && currentUser.interests.length > 0)
    ? currentUser.interests
    : ['Tech 💻', 'Fitness 💪', 'Music 🎵'];

  const photo = currentUser.image || currentUser.avatar || '';
  if (avatar) {
    if (photo) {
      avatar.style.backgroundImage = `url('${photo}')`;
      if (initialEl) initialEl.style.display = 'none';
    } else {
      avatar.style.backgroundImage = 'none';
      if (initialEl) {
        initialEl.textContent = displayName.charAt(0).toUpperCase() || 'D';
        initialEl.style.display = 'block';
      }
    }
    if (appState.isVip) avatar.classList.add('vip');
  }

  if (nameEl) {
    nameEl.innerHTML = `${displayName}, ${displayAge} <span class="header-vip-badge" id="profileVipBadge" style="display:${appState.isVip ? 'inline-flex' : 'none'};margin-left:6px">VIP</span>`;
  }
  if (locEl) locEl.textContent = displayLoc;
  if (bioEl) bioEl.textContent = displayBio;
  if (interestsEl) {
    interestsEl.innerHTML = displayInterests.map(tag => `<span class="simple-interest-pill">${tag}</span>`).join('');
  }

  // Pre-fill form inputs in edit modal
  if (nameInput) nameInput.value = displayName;
  if (ageInput) ageInput.value = displayAge;
  if (bioInput) bioInput.value = displayBio;
  if (locInput) locInput.value = displayLoc;
  if (interestsInput) interestsInput.value = displayInterests.join(', ');

  // Stat numbers (12 Matches, 48 Likes, 3 Super from user mockup)
  const matchesCount = document.getElementById('statMatches');
  if (matchesCount) matchesCount.textContent = matchedUsers.length > 0 ? matchedUsers.length : 12;

  const likesCount = document.getElementById('statLikes');
  if (likesCount) likesCount.textContent = 48;

  const superCount = document.getElementById('statSuper');
  if (superCount) superCount.textContent = 3;
}

function openEditProfileModal() {
  const modal = document.getElementById('editProfileModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeEditProfileModal() {
  const modal = document.getElementById('editProfileModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
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

    // Sync to Firestore if authenticated
    if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
        image: dataUrl,
        avatar: dataUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(err => console.warn('Could not sync photo to Firestore:', err));
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
    }

    showToast('✓ Real profile photo updated! ✨', 'success');
  } catch (err) {
    console.error('Photo upload error:', err);
    showToast('Could not process this image. Try another photo.', 'error');
  }
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
    const dataUrl = await compressImage(file, 600, 0.82);
    currentUser.image = dataUrl;
    currentUser.avatar = dataUrl;

    const preview = document.getElementById('signupPhotoPreview');
    if (preview) {
      preview.style.backgroundImage = `url('${dataUrl}')`;
      preview.textContent = '';
      preview.style.borderColor = 'var(--flame-1)';
    }
    const errEl = document.getElementById('signupError3');
    if (errEl) errEl.textContent = '';
    showToast('✓ Photo ready! Looks great! ✨', 'success');
  } catch (err) {
    console.error('Signup photo upload error:', err);
    showToast('Could not process this image. Try another photo.', 'error');
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
    fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
      name: currentUser.name,
      displayName: currentUser.name,
      age: currentUser.age,
      bio: currentUser.bio,
      location: currentUser.location,
      interests: currentUser.interests || [],
      image: currentUser.image || currentUser.avatar || '',
      avatar: currentUser.image || currentUser.avatar || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => console.warn('Could not sync profile to Firestore:', err));
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

  // User email
  const emailRow = document.getElementById('settingsEmailValue');
  if (emailRow) emailRow.textContent = currentUser.email;

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
}

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

  showToast('Deleting account & data...', 'info');

  if (typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const user = fbAuth.currentUser;
    const uid = user.uid;

    if (typeof fbDb !== 'undefined' && fbDb) {
      try {
        // 1. Delete user stories
        const storiesSnap = await fbDb.collection('stories').where('ownerId', '==', uid).get();
        const batch = fbDb.batch();
        storiesSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      } catch (e) {
        console.warn('Stories cleanup error on delete:', e);
      }

      try {
        // 2. Delete user profile document
        await fbDb.collection('users').doc(uid).delete();
      } catch (e) {
        console.warn('User doc cleanup error on delete:', e);
      }
    }

    try {
      // 3. Delete Firebase Auth record
      await user.delete();
    } catch (e) {
      console.warn('Firebase delete auth error:', e);
      if (e.code === 'auth/requires-recent-login') {
        alert('For your security, please sign out and sign in again before deleting your account.');
        return;
      }
    }
  }

  // 4. Wipe local storage and cache
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
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
    default: 'Unlock all VIP features and match instantly.'
  };
  if (reasonEl) reasonEl.textContent = reasons[context] || reasons.default;

  modal.classList.add('open');
  selectPricingTier(appState.selectedPricingTier);
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
}

function selectPricingTier(n) {
  appState.selectedPricingTier = n;
  document.querySelectorAll('.pricing-card').forEach((card, i) => {
    card.classList.toggle('selected', i + 1 === n);
  });

  // Update renewal terms text dynamically — California ARL compliance
  const tierPrices = { 1: '\u20a62,500', 2: '\u20a67,500', 3: '\u20a625,000' };
  const tierNames  = { 1: '1 Week VIP Gold', 2: '1 Month VIP Gold', 3: 'Lifetime VIP Gold' };
  const nameEl  = document.getElementById('renewalPlanName');
  const priceEl = document.getElementById('renewalPrice');
  const ctaEl   = document.getElementById('paywallCtaLabel');
  if (nameEl)  nameEl.textContent  = tierNames[n]  || '1 Month VIP Gold';
  if (priceEl) priceEl.textContent = tierPrices[n] || '\u20a67,500';
  if (ctaEl)   ctaEl.textContent   = `Subscribe Now \u2014 ${tierNames[n] || 'VIP Gold'}`;
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

  // Persistent VIP state is granted by the backend after Paystack verification.
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

  // 1. Stories from real users fetched via Firestore
  (communityStories || []).forEach(s => {
    if (s && s.id && !seenIds.has(s.id)) {
      if (!s.expiresAt || s.expiresAt > nowMs) {
        seenIds.add(s.id);
        combined.push(s);
      }
    }
  });

  // 2. Preset community stories
  (STORY_DATA || []).forEach(s => {
    if (s && s.id && !seenIds.has(s.id)) {
      seenIds.add(s.id);
      combined.push(s);
    }
  });

  return combined;
}

function initCommunityStoriesListener() {
  if (typeof listenToCommunityStories === 'function') {
    listenToCommunityStories((stories) => {
      if (stories && stories.length > 0) {
        communityStories = stories.filter(s => {
          if (typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
            return s.ownerId !== fbAuth.currentUser.uid;
          }
          return true;
        });
        renderStoriesRow();
      }
    });
  }
}

function renderStoriesRow() {
  const scroll = document.getElementById('storiesScroll');
  if (!scroll) return;

  const hasStory = (typeof userStories !== 'undefined' && Array.isArray(userStories) && userStories.length > 0);
  const userAvatar = currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  let html = `
    <div class="story-bubble your-story" onclick="${hasStory ? 'viewYourStory(0)' : 'openYourStoryUpload()'}">
      <div class="story-avatar-ring ${hasStory ? 'your-story-active-ring' : 'your-story-ring'}">
        <div class="story-avatar-img" style="background-image:url('${userAvatar}')"></div>
        <span class="story-add-badge" onclick="event.stopPropagation();openYourStoryUpload(event);" title="${hasStory ? 'Add photo' : 'Upload story'}">+</span>
      </div>
      <span class="story-name">${hasStory ? (userStories.length > 1 ? `You (${userStories.length})` : 'Your Story') : 'Add Story'}</span>
    </div>`;

  const list = getAllCommunityStories();
  html += list.map((s) => {
    const seen = seenStories.has(s.id);
    return `
      <div class="story-bubble ${seen ? 'seen' : ''}" onclick="viewStory('${s.id}')">
        <div class="story-avatar-ring">
          <div class="story-avatar-img" style="background-image:url('${s.thumb || s.image}')"></div>
        </div>
        <span class="story-name">${escHtml(s.name)}</span>
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

function showStoryAtIndex(idx) {
  const isOwn = _viewingUserStory;
  const activeList = isOwn ? userStories : getAllCommunityStories();

  if (!activeList || activeList.length === 0 || idx < 0 || idx >= activeList.length) {
    closeStoryViewer();
    return;
  }

  currentStoryIndex = idx;
  const story = activeList[currentStoryIndex];
  if (!isOwn) seenStories.add(story.id);
  renderStoriesRow();

  const overlay = document.getElementById('storyViewerOverlay');
  const bgImg = document.getElementById('storyBgImg');
  const avatar = document.getElementById('storyUserAvatar');
  const nameEl = document.getElementById('storyUserName');
  const ageEl = document.getElementById('storyUserAge');
  const locEl = document.getElementById('storyUserLoc');
  const bioEl = document.getElementById('storyBioText');
  const tagsRow = document.getElementById('storyTagsRow');
  const inputEl = document.getElementById('storyMsgInput');
  const topPickBadge = document.querySelector('.story-top-pick-badge');
  const deleteBtn = document.getElementById('storyDeleteBtn');
  const addMoreBtn = document.getElementById('storyAddMoreBtn');
  const ownActionBar = document.getElementById('storyOwnActionBar');
  const commActionRow = document.getElementById('storyCommunityActionRow');

  if (bgImg) bgImg.style.backgroundImage = `url('${story.image}')`;
  if (avatar) avatar.style.backgroundImage = `url('${isOwn ? (currentUser.avatar || story.thumb || story.image) : (story.thumb || story.image)}')`;
  if (nameEl) nameEl.textContent = isOwn ? (userStories.length > 1 ? `Your Story (${currentStoryIndex + 1}/${userStories.length})` : 'Your Story') : story.name;
  if (ageEl) ageEl.textContent = isOwn ? '' : (story.age ? `, ${story.age}` : '');
  if (locEl) locEl.textContent = `📍 ${story.location || 'Lagos'}${isOwn ? ' • Active for 24h' : ''}`;
  if (bioEl) bioEl.textContent = story.bio || (isOwn ? 'My latest story ✨' : '');

  if (topPickBadge) topPickBadge.style.display = isOwn ? 'none' : 'inline';
  if (deleteBtn) deleteBtn.style.display = isOwn ? 'flex' : 'none';
  if (addMoreBtn) addMoreBtn.style.display = isOwn ? 'flex' : 'none';
  if (ownActionBar) ownActionBar.style.display = isOwn ? 'flex' : 'none';
  if (commActionRow) commActionRow.style.display = isOwn ? 'none' : 'flex';

  if (inputEl) inputEl.placeholder = `Send a compliment to ${story.name}...`;

  if (tagsRow) {
    tagsRow.innerHTML = (story.tags || []).map(t => `<span class="story-tag-chip">${t}</span>`).join('');
  }

  // Render Story Progress Indicators
  const progressBars = document.getElementById('storyProgressBars');
  if (progressBars) {
    progressBars.innerHTML = activeList.map((_, i) => {
      let cls = 'story-progress-bar';
      if (i < currentStoryIndex) cls += ' completed';
      else if (i === currentStoryIndex) cls += ' active';
      return `<div class="${cls}"><div class="story-progress-fill"></div></div>`;
    }).join('');
  }

  if (overlay) {
    overlay.style.display = 'flex';
  }

  // Auto advance after 6s
  clearTimeout(storyTimer);
  storyTimer = setTimeout(() => {
    nextStory();
  }, 6000);
}

function nextStory(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  clearTimeout(storyTimer);
  const activeList = _viewingUserStory ? userStories : getAllCommunityStories();
  if (currentStoryIndex < activeList.length - 1) {
    showStoryAtIndex(currentStoryIndex + 1);
  } else {
    // If finished own stories, seamlessly advance to community stories
    if (_viewingUserStory && getAllCommunityStories().length > 0) {
      _viewingUserStory = false;
      currentStoryIndex = 0;
      showStoryAtIndex(0);
    } else {
      closeStoryViewer();
    }
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
  if (overlay) overlay.style.display = 'none';
  _viewingUserStory = false;
}

function deleteCurrentUserStory() {
  if (!confirm('Are you sure you want to delete this story?')) return;
  if (!userStories || userStories.length === 0) return;

  const removed = userStories.splice(currentStoryIndex, 1)[0];
  localStorage.setItem('hmbs_user_stories', JSON.stringify(userStories));

  if (removed && removed.id && typeof fbDb !== 'undefined' && fbDb) {
    fbDb.collection('stories').doc(removed.id).delete().catch(() => {});
  }

  showToast('Story deleted 🗑️', 'info');
  renderStoriesRow();

  if (userStories.length > 0) {
    currentStoryIndex = Math.min(currentStoryIndex, userStories.length - 1);
    showStoryAtIndex(currentStoryIndex);
  } else {
    closeStoryViewer();
  }
}

function likeStoryProfile() {
  const list = _viewingUserStory ? userStories : getAllCommunityStories();
  const story = list[currentStoryIndex];
  if (!story) return;

  // Add to matches if not already
  const existing = matchedUsers.find(u => u.name === story.name);
  if (!existing) {
    matchedUsers.unshift({
      id: 'm_' + (story.id || Date.now()),
      name: story.name,
      age: story.age,
      bio: story.bio,
      image: story.image,
      tags: story.tags,
      distance: story.location,
      isRealUser: false
    });
    renderNewMatchesRow();
    renderConversationList();
  }

  showToast(`💖 You liked ${story.name}! It's a match!`, 'pink');
  closeStoryViewer();
  triggerConfetti();
}

function sendStoryReply() {
  const input = document.getElementById('storyMsgInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;

  const story = STORY_DATA[currentStoryIndex];
  showToast(`💬 Compliment sent to ${story?.name || 'User'}!`, 'pink');
  input.value = '';

  // Create match / conversation
  if (story) {
    const matchId = 'm_' + story.id;
    if (!matchedUsers.find(u => u.name === story.name)) {
      matchedUsers.unshift({
        id: matchId,
        name: story.name,
        age: story.age,
        bio: story.bio,
        image: story.image,
        tags: story.tags,
        distance: story.location,
        isRealUser: false
      });
      renderNewMatchesRow();
      renderConversationList();
    }
    if (!conversations[matchId]) {
      conversations[matchId] = { messages: [] };
    }
    conversations[matchId].messages.push({
      sender: 'me',
      text: val,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

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
  const partner = matchedUsers.find(u => u.id === appState.currentChatId) || PROFILES_DATA.find(u => u.id === appState.currentChatId);
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
  if (!fbDb || !fbAuth?.currentUser || !userId) return true;
  const uid = fbAuth.currentUser.uid;
  if (uid === userId) return false;
  await fbDb.collection('blocks').doc(uid + '_' + userId).set({
    blockedBy: uid,
    blockedUserId: userId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return true;
}

async function deleteBlockFromFirestore(userId) {
  if (!fbDb || !fbAuth?.currentUser || !userId) return true;
  const uid = fbAuth.currentUser.uid;
  await fbDb.collection('blocks').doc(uid + '_' + userId).delete();
  return true;
}

async function blockUser(userId, name) {
  closeReportModal();
  if (!userId) return;

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
  showScreen('matches');
}

async function executeReportAndBlock(userId, name) {
  const reason = document.querySelector('input[name="reportReason"]:checked')?.value || 'other';
  closeReportModal();
  if (!userId || !fbDb || !fbAuth?.currentUser) {
    showToast('Please sign in to report an account.', 'error');
    return;
  }

  const reporterId = fbAuth.currentUser.uid;

  try {
    await fbDb.collection('reports').add({
      reportedBy: reporterId,
      reportedUserId: userId,
      reportedUserName: String(name || 'User').slice(0, 120),
      reason,
      status: 'open',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

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
        <div class="blocked-empty-text" style="font-weight:600;color:var(--txt-primary);">No Blocked Contacts</div>
        <div class="blocked-empty-text" style="font-size:0.8rem;margin-top:4px;">You haven't blocked any contacts. Profiles you block will appear here.</div>
        <button class="unblock-action-btn" onclick="restoreDefaultDemoContacts()" style="margin-top:16px;background:rgba(255,46,112,0.12);border-color:#FF2E70;padding:8px 18px;font-size:0.82rem;">
          🔄 Restore All Demo Matches
        </button>
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

  const restoredProfile = userObj || PROFILES_DATA.find(u => u.id === userId) || PREMIUM_MATCHES.find(u => u.id === userId);
  if (restoredProfile) {
    if (!matchedUsers.some(u => u.id === userId)) {
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
  }

  saveToStorage();
  renderMatchesView();
  renderSettingsScreen();
  updateMatchesNotificationBadge();
  showToast(`✨ ${userName} has been unblocked!`, 'gold');
  renderBlockedUsersListInModal();
}

function restoreDefaultDemoContacts() {
  PROFILES_DATA.slice(0, 3).forEach(p => {
    if (!matchedUsers.some(u => u.id === p.id)) {
      matchedUsers.push(p);
      if (!conversations[p.id]) {
        conversations[p.id] = {
          messages: [{ sender: 'them', text: 'Hey there! Let\'s chat 😊', read: true, timestamp: Date.now() }]
        };
      }
    }
  });
  blockedUsers = [];
  saveToStorage();
  renderMatchesView();
  renderSettingsScreen();
  updateMatchesNotificationBadge();
  closeBlockedUsersModal();
  showToast('✨ Contacts restored successfully!', 'gold');
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
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'PUSH_NOTIFICATION_CLICK' && event.data.matchId) {
      if (typeof openChat === 'function') {
        openChat(event.data.matchId);
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

  // Create match in Firestore if connected
  if (typeof recordSwipeInBackend === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    await recordSwipeInBackend(userId, 'like');
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
  if (msgId.startsWith('local_')) {
    const idx = parseInt(msgId.replace('local_', ''), 10);
    return { msg: hist[idx] || null, idx, hist };
  }
  const idx = hist.findIndex(m => m.firestoreId === msgId);
  return { msg: idx !== -1 ? hist[idx] : null, idx, hist };
}

function startLongPress(event, matchId, msgId) {
  clearTimeout(_longPressTimer);
  _longPressTimer = setTimeout(() => {
    showReactionPicker(event, matchId, msgId);
  }, 480);
}

function cancelLongPress() {
  clearTimeout(_longPressTimer);
}

function showReactionPicker(event, matchId, msgId) {
  clearTimeout(_longPressTimer);
  closeReactionPicker();

  const msgInfo = getMessageInfo(msgId);
  const msg = msgInfo.msg;
  const isSent = msg ? (msg.sender === 'me') : false;
  const isText = msg ? (!msg.imageUrl && !msg.isVoice && msg.text) : true;

  // 1. Full-screen backdrop for outside click/tap dismissal
  const backdrop = document.createElement('div');
  backdrop.id = 'reactionPickerBackdrop';
  backdrop.className = 'msg-action-backdrop';
  backdrop.onclick = (e) => {
    e.stopPropagation();
    closeReactionPicker();
  };
  backdrop.ontouchstart = (e) => {
    e.stopPropagation();
    closeReactionPicker();
  };
  document.body.appendChild(backdrop);

  // 2. Action sheet popup
  const picker = document.createElement('div');
  picker.id = 'reactionPickerPopup';
  // Prevent any event from bubbling to the backdrop
  picker.onclick = (e) => e.stopPropagation();
  picker.ontouchstart = (e) => e.stopPropagation();
  picker.ontouchend = (e) => e.stopPropagation();
  picker.style.cssText = `
    position:fixed;z-index:99999;
    background:#1E1530;border:1px solid rgba(255,255,255,0.18);
    border-radius:20px;padding:8px;
    display:flex;flex-direction:column;gap:6px;
    box-shadow:0 18px 50px rgba(0,0,0,0.85);
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
    width:240px;max-width:85vw;
    animation:reactionPickerIn 0.18s cubic-bezier(0.175,0.885,0.32,1.275);
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

  let actionsHtml = '';

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

  const x = event.touches?.[0]?.clientX ?? event.clientX ?? (window.innerWidth / 2);
  const y = event.touches?.[0]?.clientY ?? event.clientY ?? (window.innerHeight / 2);
  const pickerW = 240;
  const left = Math.min(Math.max(x - pickerW / 2, 10), window.innerWidth - pickerW - 10);
  const top = Math.min(Math.max(y - 120, 20), window.innerHeight - 260);
  picker.style.left = left + 'px';
  picker.style.top = top + 'px';

  document.body.appendChild(picker);
  _reactionPickerOpen = true;
}

function closeReactionPicker() {
  document.getElementById('reactionPickerPopup')?.remove();
  document.getElementById('reactionPickerBackdrop')?.remove();
  _reactionPickerOpen = false;
}

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
  const myId = (typeof fbAuth !== 'undefined' && fbAuth?.currentUser) ? fbAuth.currentUser.uid : 'local_me';

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

  // Update in Firestore
  if (!msgId.startsWith('local_') && matchId && matchId !== 'null') {
    if (typeof reactRealtimeMessage === 'function') {
      reactRealtimeMessage(matchId, msgId, emoji);
    }
  }
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

  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    if (errEl) errEl.textContent = 'Please enter a valid email address.';
    return;
  }

  if (errEl) errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Sending...';

  if (typeof fbAuth !== 'undefined' && fbAuth) {
    try {
      await fbAuth.sendPasswordResetEmail(email);
      showToast('\u2709\uFE0F Reset email sent! Check your inbox.', 'info');
      closeForgotPasswordModal();
    } catch (err) {
      let msg = 'Could not send reset email. Try again.';
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
      if (err.code === 'auth/invalid-email') msg = 'Invalid email address.';
      if (errEl) errEl.textContent = msg;
    }
  } else {
    setTimeout(() => {
      showToast('\u2709\uFE0F Password reset link sent to ' + email, 'info');
      closeForgotPasswordModal();
    }, 1000);
  }

  btn.disabled = false;
  btn.textContent = 'Send Reset Email';
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
    if (helper) helper.style.display = 'none';

    const otpInp = document.getElementById('otpInput');
    if (otpInp) {
      otpInp.value = '';
      setTimeout(() => otpInp.focus(), 150);
    }
  }
}

async function verifyPhoneOtp() {
  const otpEl = document.getElementById('otpInput');
  const errEl = document.getElementById('phoneStep2Error');
  const btn = document.getElementById('phoneVerifyOtpBtn');
  const otp = otpEl ? otpEl.value.trim() : '';

  if (!/^\d{6}$/.test(otp)) {
    if (errEl) errEl.textContent = 'Enter the 6-digit code.';
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
    if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth && fbAuth.currentUser) {
      try {
        await fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
          phone: _pendingPhoneNumber,
          phoneVerified: true
        }, { merge: true });
      } catch (e) { console.warn('Firestore phone update notice:', e); }
    }
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
  { code: 'en-UK', label: 'English (UK)',        flag: '\uD83C\uDDEC\uD83C\uDDE7' }, // 🇬🇧
  { code: 'en-NG', label: 'English (Nigerian)',  flag: '\uD83C\uDDF3\uD83C\uDDEC' }, // 🇳🇬
  { code: 'pcm',   label: 'Nigerian Pidgin',     flag: '\uD83C\uDDF3\uD83C\uDDEC' }, // 🇳🇬
  { code: 'yo',    label: 'Yoruba',              flag: '\uD83C\uDF0D' },               // 🌍
  { code: 'ig',    label: 'Igbo',                flag: '\uD83C\uDF0D' },               // 🌍
  { code: 'ha',    label: 'Hausa',               flag: '\uD83C\uDF0D' },               // 🌍
  { code: 'fr',    label: 'Fran\u00E7ais',      flag: '\uD83C\uDDEB\uD83C\uDDF7' }, // 🇫🇷
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
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleStoryPhotoSelected);
    document.body.appendChild(fileInput);
  }
  fileInput.value = '';
  fileInput.click();
}

async function handleStoryPhotoSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file.', 'error');
    return;
  }

  showToast('Compressing & posting story... 📸', 'info');

  try {
    // 1. Fast canvas compression (< 150ms)
    const compressedDataUrl = await compressStoryImage(file, 1080, 0.78);
    let finalUrl = compressedDataUrl;

    // 2. Upload lightweight file if storage is active
    if (typeof uploadFileToBackend === 'function' && typeof fbStorage !== 'undefined' && fbStorage) {
      try {
        const blob = await (await fetch(compressedDataUrl)).blob();
        blob.name = `story_${Date.now()}.jpg`;
        const uploaded = await uploadFileToBackend(blob, 'stories');
        if (uploaded) finalUrl = uploaded;
      } catch (err) {
        // Fallback to compressed DataURL
      }
    }

    const story = {
      id: 'user_story_' + Date.now(),
      name: currentUser.name || 'You',
      image: finalUrl,
      thumb: finalUrl,
      location: currentUser.location || 'Lagos',
      bio: 'My latest story ✨',
      tags: currentUser.interests || [],
      isUserStory: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };

    // 3. Save to Firestore
    if (typeof uploadStoryToFirestore === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
      uploadStoryToFirestore(story).catch(() => {});
    }

    // 4. Save to local multi-story array
    if (!Array.isArray(userStories)) userStories = [];
    userStories.push(story);
    if (userStories.length > 10) userStories = userStories.slice(userStories.length - 10);
    localStorage.setItem('hmbs_user_stories', JSON.stringify(userStories));

    renderStoriesRow();
    showToast('Story posted! Your status is now live. ✨', 'gold');

    // 5. Instantly open newly posted story slice
    setTimeout(() => {
      viewYourStory(userStories.length - 1);
    }, 200);
  } catch (err) {
    console.error('Story upload failed:', err);
    showToast('Could not process photo. Please try again.', 'error');
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