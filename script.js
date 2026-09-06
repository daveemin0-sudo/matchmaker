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
  name: 'Dave Bigdave',
  email: 'dave@example.com',
  age: 24,
  bio: 'Software engineer and builder. Love beach hangouts in Lekki and good vibes!',
  image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
  location: 'Lagos, Nigeria',
  gender: 'Male',
  interests: ['Tech 💻', 'Fitness 💪', 'Music 🎵'],
  aiPrompt: 'Handsome 24 year old male software engineer, warm friendly expression, workspace background, realistic portrait'
};

let profileStack = [...PROFILES_DATA];
let matchedUsers = [];
let conversations = {};
let settings = {
  maxDistance: 50,
  minAge: 20, maxAge: 35,
  notifMatches: true,
  notifMessages: true,
  notifLikes: false,
  showOnline: true,
  shareLocation: true,
};

// ==========================================================
// INIT
// ==========================================================

window.addEventListener('load', () => {
  loadFromStorage();
  setTheme(localStorage.getItem('hookmebysam_theme') || 'dark');
  updateStatusBarTime();
  setInterval(updateStatusBarTime, 30000);

  if (appState.isLoggedIn) {
    showScreen('discovery');
    initMainApp();
  } else {
    showScreen('login');
    updateHeaderForAuth();
  }
});

function initMainApp() {
  renderCardStack();
  renderMatchesView();
  renderProfileScreen();
  renderSettingsScreen();
  renderAiLabPicker();
  applyVipUI();
  renderStoriesRow();

  // Fetch real registered users from Firestore into the card stack
  loadProfilesForDiscovery();

  // Subscribe to real-time matches from Firestore
  if (typeof listenToUserMatches === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    listenToUserMatches((realMatches) => {
      if (realMatches && realMatches.length > 0) {
        realMatches.forEach(m => {
          if (!matchedUsers.find(u => u.id === m.id)) {
            matchedUsers.push(m);
            if (!conversations[m.id]) {
              conversations[m.id] = { messages: [] };
            }
          }
        });
        renderMatchesView();
        saveToStorage();
      }
    });
  }

  // Ask for notification permission after a short delay
  setTimeout(requestNotificationPermission, 3500);
  // Register service worker for PWA — but never on localhost/local dev
  // servers. The SW exists to help real users go offline and get fast
  // repeat loads; while you're actively editing and reloading via Live
  // Server (127.0.0.1) it only gets in the way. It still registers
  // normally once this is deployed to a real domain.
  const isLocalDev = ['localhost', '127.0.0.1', '', '::1'].includes(location.hostname);
  if ('serviceWorker' in navigator && !isLocalDev) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
}

async function loadProfilesForDiscovery() {
  if (typeof fetchRealUsersFromFirestore === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const realUsers = await fetchRealUsersFromFirestore();
    if (realUsers && realUsers.length > 0) {
      profileStack = [...realUsers];
      renderCardStack();
      console.log(`🔥 Discovery stack updated with ${realUsers.length} real Firestore user(s)!`);
    } else {
      console.log("ℹ️ No other real Firestore users found in database yet. Register a 2nd user to see them here.");
    }
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
    localStorage.setItem('hmbs_convos', JSON.stringify(conversations));
  } catch (e) {
    console.warn('Storage save error', e);
  }
}

// ==========================================================
// CLOCK
// ==========================================================

function updateStatusBarTime() {
  const el = document.getElementById('statusTime');
  if (!el) return;
  const now = new Date();
  el.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}

// ==========================================================
// SCREEN NAVIGATION
// ==========================================================

const AUTH_SCREENS = ['login', 'signup', 'signupSuccess'];
const MAIN_SCREENS = ['discovery', 'matches', 'chat', 'profile', 'settings'];

function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  const target = document.getElementById(`${screenId}Screen`);
  if (target) target.classList.add('active');

  appState.previousScreen = appState.currentScreen;
  appState.currentScreen = screenId;

  // Show/hide nav and header appropriately
  const isAuth = AUTH_SCREENS.includes(screenId);
  const navEl = document.getElementById('bottomNav');
  if (navEl) navEl.style.display = isAuth ? 'none' : 'flex';

  const fab = document.getElementById('globalFloatingSearchBtn');
  if (fab) fab.style.display = (isAuth || screenId === 'chat') ? 'none' : 'flex';

  updateHeader(screenId);
  updateBottomNav(screenId);
}

function updateHeader(screenId) {
  const backBtn = document.getElementById('backBtn');
  const headerTitle = document.getElementById('headerTitle');
  const headerRight = document.getElementById('headerRight');
  const header = document.getElementById('appHeader');

  if (!header) return;

  // Hide header on auth screens
  header.style.display = AUTH_SCREENS.includes(screenId) ? 'none' : 'flex';

  if (!backBtn || !headerTitle) return;

  // Ensure headerRight is visible on all main screens
  if (headerRight) headerRight.style.display = 'flex';

  const searchBtn = document.getElementById('headerSearchBtn');
  const reportBtn = document.getElementById('chatReportBtn');
  const upgradeBtn = document.getElementById('upgradeHeaderBtn');
  const matchBtn  = document.getElementById('matchesQuickBtn');

  if (searchBtn)  searchBtn.style.display  = screenId === 'chat' ? 'none' : 'flex';
  if (reportBtn)  reportBtn.style.display  = screenId === 'chat' ? 'flex' : 'none';
  if (upgradeBtn) upgradeBtn.style.display = screenId === 'chat' ? 'none' : 'flex';
  if (matchBtn)   matchBtn.style.display   = screenId === 'chat' ? 'none' : 'flex';

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
      setHeaderTitle('My Matches');
      break;
    case 'chat': {
      backBtn.style.display = 'flex';
      const partner = matchedUsers.find(u => u.id === appState.currentChatId);
      setHeaderTitle(partner ? `${escHtml(partner.name)} <span style="color:var(--green-match);font-size:0.7rem;margin-left:6px">●</span>` : 'Chat');
      break;
    }
    case 'profile':
      backBtn.style.display = 'flex';
      setHeaderTitle('My Profile');
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

function handleBackBtn() {
  if (appState.currentScreen === 'chat') {
    showScreen(appState.previousScreen === 'matches' ? 'matches' : 'discovery');
  } else {
    showScreen('discovery');
  }
}

function switchTab(tabId) {
  if (tabId === 'search') {
    openSearchModal();
    return;
  }
  if (appState.currentScreen === 'chat') {
    appState.currentChatId = null;
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
      .then((userCredential) => {
        currentUser.email = userCredential.user.email;
        currentUser.id = userCredential.user.uid;
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

        // Save complete profile to Firestore
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
            image: currentUser.image || currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
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
  profileStack = [...PROFILES_DATA];
  appState.lastAction = null;
  renderCardStack();
}

// ==========================================================
// MATCH POPUP
// ==========================================================

function triggerMatchPopup(profile) {
  if (!matchedUsers.find(u => u.id === profile.id)) {
    matchedUsers.push(profile);
    conversations[profile.id] = {
      messages: [{ sender: 'them', text: `It's a match! Say something 👋` }]
    };
    saveToStorage();
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

  // Notification dot
  const dot = document.getElementById('headerNotifDot');
  if (dot) dot.style.display = 'block';
}

function closeMatchPopup() {
  const popup = document.getElementById('matchPopup');
  if (popup) popup.classList.remove('open');
}

function goToChatFromMatch() {
  closeMatchPopup();
  if (matchedUsers.length === 0) return;
  const partner = matchedUsers[matchedUsers.length - 1];
  openChat(partner.id);
}

// ==========================================================
// MATCHES & CONVERSATIONS
// ==========================================================

function renderMatchesView() {
  renderNewMatchesBubbles();
  renderConversationList();
}

function renderNewMatchesBubbles() {
  const row = document.getElementById('newMatchesRow');
  if (!row) return;

  if (matchedUsers.length === 0) {
    row.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">No matches yet — keep swiping! 🔥</p>`;
    return;
  }

  row.innerHTML = matchedUsers.map(u => `
    <div class="match-bubble" onclick="openChat('${u.id}')">
      <div class="match-bubble-ring">
        <div class="match-bubble-photo" style="background-image:url('${u.image}')"></div>
      </div>
      <span class="match-bubble-name">${u.name}</span>
    </div>
  `).join('');
}

function renderConversationList() {
  const col = document.getElementById('convoList');
  if (!col) return;

  if (matchedUsers.length === 0) {
    col.innerHTML = `
      <div style="text-align:center;padding:40px 16px;color:var(--text-muted);">
        <div style="font-size:2.5rem;margin-bottom:12px">💬</div>
        <p style="font-size:0.9rem;line-height:1.5">Match with someone to start a conversation!</p>
      </div>`;
    return;
  }

  col.innerHTML = matchedUsers.map(u => {
    const hist = conversations[u.id]?.messages || [];
    const last = hist[hist.length - 1];
    const lastText = last ? (last.sender === 'me' ? `You: ${last.text}` : last.text) : 'Say hi!';
    const isOnline = Math.random() > 0.5;
    return `
      <div class="convo-item" onclick="openChat('${u.id}')">
        <div class="convo-avatar-wrap">
          <div class="convo-avatar" style="background-image:url('${u.image}')"></div>
          ${isOnline ? '<div class="convo-online-dot"></div>' : ''}
        </div>
        <div class="convo-body">
          <div class="convo-name">${u.name}</div>
          <div class="convo-preview">${lastText.substring(0, 45)}${lastText.length > 45 ? '…' : ''}</div>
        </div>
        <div class="convo-meta">
          <span class="convo-time">Just now</span>
        </div>
      </div>`;
  }).join('');
}

// ==========================================================
// CHAT
// ==========================================================

let activeRealtimeListener = null;

function openChat(profileId) {
  appState.currentChatId = profileId;
  showScreen('chat');
  renderChatThread();

  // Reset icebreakers
  const ice = document.getElementById('icebreakersRow');
  if (ice) { ice.style.opacity = '1'; ice.style.pointerEvents = 'auto'; }

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
          messages: msgs.map(m => ({
            sender: m.sender === fbAuth.currentUser.uid ? 'me' : 'them',
            text: m.text || '',
            isVoice: m.isVoice || false,
            audioUrl: m.audioUrl || '',
            imageUrl: m.imageUrl || '',
            duration: m.duration || '0:05'
          }))
        };
        renderChatThread();
        renderConversationList();
      }
    });
  }
}

function renderChatThread() {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const hist = conversations[appState.currentChatId]?.messages || [];

  if (hist.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--text-muted);font-size:0.88rem">Start the conversation! 👋</div>`;
    return;
  }

  container.innerHTML = hist.map((msg, idx) => {
    const isLast = idx === hist.length - 1;
    if (msg.imageUrl) {
      const receiptHtml = msg.sender === 'me' ? `<span class="msg-receipt ${isLast ? 'read' : ''}">✓✓</span>` : '';
      return `
        <div class="msg-bubble ${msg.sender === 'me' ? 'sent' : 'received'}" style="padding:4px;max-width:220px;overflow:hidden">
          <img src="${msg.imageUrl}" style="width:100%;border-radius:14px;display:block">
          ${receiptHtml}
        </div>`;
    }
    if (msg.isVoice) {
      const receiptHtml = msg.sender === 'me'
        ? `<span class="msg-receipt ${isLast ? 'read' : ''}">✓✓</span>` : '';
      return `
        <div class="msg-bubble audio-bubble ${msg.sender === 'me' ? 'sent' : 'received'}">
          <div style="display:flex;align-items:center;gap:10px;width:170px">
            <span style="cursor:pointer;font-size:14px">▶️</span>
            <div style="flex:1;height:4px;background:rgba(255,255,255,0.3);border-radius:2px;position:relative">
              <div style="width:55%;height:100%;background:#fff;border-radius:2px"></div>
            </div>
            <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.9)">${msg.duration || '0:05'}</span>
          </div>
          ${receiptHtml}
        </div>`;
    }
    const receiptHtml = msg.sender === 'me'
      ? `<span class="msg-receipt ${isLast ? 'read' : ''}">✓✓</span>` : '';
    return `<div class="msg-bubble ${msg.sender === 'me' ? 'sent' : 'received'}">${escHtml(msg.text)}${receiptHtml}</div>`;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function onChatInputChange() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const micBtn = document.getElementById('micBtn');
  if (!input) return;
  const hasText = input.value.trim().length > 0;
  if (sendBtn) sendBtn.style.display = hasText ? 'flex' : 'none';
  if (micBtn) micBtn.style.display = hasText ? 'none' : 'flex';
}

function toggleEmojiPicker() {
  const panel = document.getElementById('emojiPickerPanel');
  if (!panel) return;
  const isOpen = panel.style.display === 'flex';
  panel.style.display = isOpen ? 'none' : 'flex';

  if (!isOpen) {
    const grid = document.getElementById('emojiGrid');
    if (grid && !grid.children.length) {
      const popularEmojis = ['❤️', '🔥', '😍', '✨', '😂', '🥂', '🥳', '🙌', '🎵', '✈️', '☕', '🌮', '👍', '💬', '🤩', '💖', '👑', '🌸', '💃', '🎉'];
      grid.innerHTML = popularEmojis.map(e => `
        <span onclick="insertEmoji('${e}')" style="font-size:1.4rem;cursor:pointer;padding:6px;text-align:center;border-radius:8px;transition:background 0.15s">${e}</span>
      `).join('');
    }
  }
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
      imageUrl: imageUrl
    });
    renderChatThread();
    renderConversationList();
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

function startVoiceCall() {
  const partner = matchedUsers.find(u => u.id === appState.currentChatId);
  const name = partner ? partner.name : 'User';
  const overlay = document.getElementById('voiceCallOverlay');
  if (overlay) overlay.style.display = 'flex';
  showToast(`Calling ${name}... 📞`, 'info');
}

function startVideoCall() {
  const partner = matchedUsers.find(u => u.id === appState.currentChatId);
  const name = partner ? partner.name : 'User';
  const overlay = document.getElementById('videoCallOverlay');
  if (overlay) overlay.style.display = 'flex';
  showToast(`Starting video call with ${name}... 📹`, 'info');
}

function endCall() {
  const voice = document.getElementById('voiceCallOverlay');
  const video = document.getElementById('videoCallOverlay');
  if (voice) voice.style.display = 'none';
  if (video) video.style.display = 'none';
  showToast('Call ended', 'info');
}

function toggleMute() {
  showToast('Microphone toggled', 'info');
}

function toggleVideo() {
  showToast('Camera toggled', 'info');
}

function switchCamera() {
  showToast('Camera switched', 'info');
}

function toggleCallMute() { toggleMute(); }
function toggleVideoMute() { toggleMute(); }
function toggleCamera() { toggleVideo(); }
function endVideoCall() { endCall(); }
function toggleSpeaker() { showToast('Speaker toggled 🔊', 'info'); }

function sendMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !appState.currentChatId) return;

  if (!conversations[appState.currentChatId]) {
    conversations[appState.currentChatId] = { messages: [] };
  }

  conversations[appState.currentChatId].messages.push({ sender: 'me', text });
  input.value = '';
  renderChatThread();
  renderConversationList();
  saveToStorage();

  // Send via real-time Firebase if logged in, otherwise handle local demo mode
  if (typeof sendRealtimeMessage === 'function' && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    const matchId = [fbAuth.currentUser.uid, appState.currentChatId].sort().join('_');
    sendRealtimeMessage(matchId, text);
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
  conversations[appState.currentChatId].messages.push({ sender: 'me', text });

  const ice = document.getElementById('icebreakersRow');
  if (ice) { ice.style.opacity = '0.2'; ice.style.pointerEvents = 'none'; }

  renderChatThread();
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
    if (appState.currentChatId !== partner.id) { removeTypingIndicator(); return; }
    removeTypingIndicator();
    if (!conversations[partner.id]) conversations[partner.id] = { messages: [] };
    conversations[partner.id].messages.push({ sender: 'them', text: replyText });
    renderChatThread();
    renderConversationList();
    saveToStorage();
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
        sender: 'me', isVoice: true, duration: durationStr, audioUrl
      });
      renderChatThread();
      renderConversationList();
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
  const nameEl = document.getElementById('profileDisplayName');
  const nameInput = document.getElementById('editName');
  const ageInput = document.getElementById('editAge');
  const bioInput = document.getElementById('editBio');
  const locInput = document.getElementById('editLocation');

  if (avatar) {
    avatar.style.backgroundImage = `url('${currentUser.image || currentUser.avatar || ''}')`;
    if (appState.isVip) avatar.classList.add('vip');
  }
  if (nameEl) nameEl.textContent = `${currentUser.name || currentUser.displayName || 'User'}${currentUser.age ? `, ${currentUser.age}` : ''}`;
  if (nameInput) nameInput.value = currentUser.name || currentUser.displayName || '';
  if (ageInput) ageInput.value = currentUser.age || 24;
  if (bioInput) bioInput.value = currentUser.bio || '';
  if (locInput) locInput.value = currentUser.location || 'Lagos, Nigeria';

  const matchesCount = document.getElementById('statMatches');
  if (matchesCount) matchesCount.textContent = matchedUsers.length;

  if (appState.isVip) {
    const badge = document.getElementById('profileVipBadge');
    if (badge) badge.style.display = 'inline-flex';
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

  saveToStorage();
  renderProfileScreen();

  const feedback = document.getElementById('profileSaveFeedback');
  if (feedback) {
    feedback.style.opacity = '1';
    setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
  }
}

// ==========================================================
// AI AVATAR ENGINE
// ==========================================================

function renderAiLabPicker() {
  const grid = document.getElementById('aiPickerGrid');
  if (!grid) return;

  const targets = [
    { id: 'p3', name: 'Amara', img: PROFILES_DATA[2].image },
    { id: 'p1', name: 'Zainab', img: PROFILES_DATA[0].image },
    { id: 'p2', name: 'Tunde', img: PROFILES_DATA[1].image },
    { id: 'p4', name: 'Chidi', img: PROFILES_DATA[3].image },
    { id: 'p5', name: 'Sade', img: PROFILES_DATA[4].image },
    { id: 'me', name: 'Me', img: currentUser.image },
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
    promptEl.value = currentUser.aiPrompt;
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
  if (statusEl) { statusEl.textContent = 'Dreaming up your portrait...'; statusEl.style.color = '#FFD54F'; }
  if (genBtn) genBtn.disabled = true;
  if (genAllBtn) genAllBtn.disabled = true;

  try {
    const url = await callImagenAPI(prompt);

    if (appState.aiSelectedProfileId === 'me') {
      currentUser.image = url;
      currentUser.aiPrompt = prompt;
      const avatar = document.getElementById('profileAvatar');
      if (avatar) avatar.style.backgroundImage = `url('${url}')`;
      const photoInput = document.getElementById('editPhotoUrl');
      if (photoInput) photoInput.value = url;
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

    if (statusEl) { statusEl.textContent = '✨ Portrait generated!'; statusEl.style.color = 'var(--accent-green)'; }
  } catch (err) {
    console.error(err);
    if (statusEl) { statusEl.textContent = '⚠️ Error — try again in a moment.'; statusEl.style.color = 'var(--accent-pink)'; }
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

  const targets = ['p3','p1','p2','p4','p5','me'];
  for (let i = 0; i < targets.length; i++) {
    selectAiTarget(targets[i]);
    if (statusEl) { statusEl.textContent = `⏳ Generating (${i+1}/${targets.length})...`; statusEl.style.color = '#FFD54F'; }
    const prompt = document.getElementById('aiPromptInput')?.value;
    if (!prompt) continue;
    try {
      const url = await callImagenAPI(prompt);
      if (targets[i] === 'me') { currentUser.image = url; }
      else {
        const idx = PROFILES_DATA.findIndex(p => p.id === targets[i]);
        if (idx !== -1) PROFILES_DATA[idx].image = url;
      }
      renderCardStack(); renderMatchesView();
    } catch (e) { console.warn('Skip', targets[i]); }
    await delay(800);
  }

  if (spinnerEl) spinnerEl.style.display = 'none';
  if (statusEl) { statusEl.textContent = '✨ All portraits upgraded!'; statusEl.style.color = 'var(--accent-green)'; }
  renderAiLabPicker();
}

async function callImagenAPI(promptText) {
  const apiKey = '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
  const payload = { instances: [{ prompt: promptText }], parameters: { sampleCount: 1 } };

  let backoff = 1000;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status === 429) { await delay(backoff); backoff *= 2; continue; }
    const data = await res.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (b64) return `data:image/png;base64,${b64}`;
    throw new Error('Invalid Imagen response');
  }
  throw new Error('Max retries exceeded');
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
  if (!confirm('⚠️ Delete your account? This cannot be undone.')) return;

  if (typeof fbAuth !== 'undefined' && fbAuth && fbAuth.currentUser) {
    try {
      const uid = fbAuth.currentUser.uid;
      if (typeof fbDb !== 'undefined' && fbDb) {
        await fbDb.collection('users').doc(uid).delete();
      }
      await fbAuth.currentUser.delete();
    } catch (e) {
      console.warn("Firebase delete account warning:", e);
    }
  }

  localStorage.clear();
  location.reload();
}

// ==========================================================
// VIP / PAYWALL
// ==========================================================

function openPaywall(context) {
  const modal = document.getElementById('paywallModal');
  const reasonEl = document.getElementById('paywallReason');
  if (!modal) return;

  const reasons = {
    rewind: 'Out of free rewinds! Upgrade for unlimited.',
    ai_gen: 'Out of free AI generations! Upgrade for unlimited.',
    bulk_ai: 'Bulk AI generation requires VIP Gold.',
    likes_you: 'See who swiped right on you instantly with VIP Gold.',
    settings: 'Unlock all premium features with VIP Gold.',
    default: 'Unlock all VIP features and match instantly.'
  };
  if (reasonEl) reasonEl.textContent = reasons[context] || reasons.default;

  modal.classList.add('open');
  selectPricingTier(appState.selectedPricingTier);
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
    if (btn) { btn.disabled = true; }
    if (label) { label.textContent = 'Processing...'; }
    setTimeout(() => {
      completeVipUpgrade();
      if (btn) { btn.disabled = false; }
      if (label) { label.textContent = 'Subscribe Now — Unlock VIP Gold'; }
    }, 1200);
  }
}

function completeVipUpgrade() {
  appState.isVip = true;
  applyVipUI();
  saveToStorage();
  closePaywall();

  showToast('👑 VIP GOLD ACTIVATED!');

  // Reveal premium matches
  PREMIUM_MATCHES.forEach(pm => {
    if (!matchedUsers.find(u => u.id === pm.id)) {
      matchedUsers.push(pm);
      conversations[pm.id] = { messages: [{ sender: 'them', text: 'You unlocked matching with me! Say hi 💛' }] };
    }
  });

  renderMatchesView();
  revealBlurredMatches();
  saveToStorage();
}

function applyVipUI() {
  // Header VIP badge
  const vipBadge = document.getElementById('headerVipBadge');
  if (vipBadge) vipBadge.style.display = appState.isVip ? 'inline-flex' : 'none';

  // Profile avatar VIP ring
  const profileAvatar = document.getElementById('profileAvatar');
  if (profileAvatar) profileAvatar.classList.toggle('vip', appState.isVip);

  updateLimitBadges();
}

function updateLimitBadges() {
  const rewindBadge = document.getElementById('rewindBadge');
  if (rewindBadge) {
    rewindBadge.textContent = appState.isVip ? '∞' : String(appState.freeRewinds);
    rewindBadge.style.background = appState.isVip ? 'var(--gold-gradient)' : (appState.freeRewinds <= 0 ? 'var(--accent-pink)' : 'var(--gold-gradient)');
  }

  const aiBadge = document.getElementById('aiLimitBadge');
  if (aiBadge) {
    aiBadge.textContent = appState.isVip ? '∞' : String(appState.freeAiGens);
    aiBadge.style.background = appState.isVip ? 'var(--gold-gradient)' : (appState.freeAiGens <= 0 ? 'var(--accent-pink)' : 'var(--gold-gradient)');
  }
}

function revealBlurredMatches() {
  for (let i = 1; i <= 4; i++) {
    const item = document.getElementById(`blurItem${i}`);
    const lock = document.getElementById(`blurLock${i}`);
    if (item) item.classList.add('revealed');
    if (lock) lock.style.display = 'none';
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

function renderStoriesRow() {
  const scroll = document.getElementById('storiesScroll');
  if (!scroll) return;

  scroll.innerHTML = STORY_DATA.map((s, idx) => {
    const seen = seenStories.has(s.id);
    return `
      <div class="story-bubble ${seen ? 'seen' : ''}" onclick="viewStory('${s.id}')">
        <div class="story-avatar-ring">
          <div class="story-avatar-img" style="background-image:url('${s.thumb || s.image}')"></div>
        </div>
        <span class="story-name">${s.name}</span>
      </div>`;
  }).join('');
}

function viewStory(storyId) {
  const idx = STORY_DATA.findIndex(s => s.id === storyId);
  if (idx === -1) return;
  currentStoryIndex = idx;
  showStoryAtIndex(currentStoryIndex);
}

function showStoryAtIndex(idx) {
  if (idx < 0 || idx >= STORY_DATA.length) {
    closeStoryViewer();
    return;
  }

  currentStoryIndex = idx;
  const story = STORY_DATA[currentStoryIndex];
  seenStories.add(story.id);
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

  if (bgImg) bgImg.style.backgroundImage = `url('${story.image}')`;
  if (avatar) avatar.style.backgroundImage = `url('${story.thumb || story.image}')`;
  if (nameEl) nameEl.textContent = story.name;
  if (ageEl) ageEl.textContent = `, ${story.age}`;
  if (locEl) locEl.textContent = `📍 ${story.location}`;
  if (bioEl) bioEl.textContent = story.bio;
  if (inputEl) inputEl.placeholder = `Send a compliment to ${story.name}...`;

  if (tagsRow) {
    tagsRow.innerHTML = story.tags.map(t => `<span class="story-tag-chip">${t}</span>`).join('');
  }

  // Render Story Progress Indicators
  const progressBars = document.getElementById('storyProgressBars');
  if (progressBars) {
    progressBars.innerHTML = STORY_DATA.map((_, i) => {
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
  if (e) e.stopPropagation();
  clearTimeout(storyTimer);
  if (currentStoryIndex < STORY_DATA.length - 1) {
    showStoryAtIndex(currentStoryIndex + 1);
  } else {
    closeStoryViewer();
  }
}

function prevStory(e) {
  if (e) e.stopPropagation();
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
}

function likeStoryProfile() {
  const story = STORY_DATA[currentStoryIndex];
  if (!story) return;

  // Add to matches if not already
  const existing = matchedUsers.find(u => u.name === story.name);
  if (!existing) {
    matchedUsers.unshift({
      id: 'm_' + story.id,
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
  const partner = matchedUsers.find(u => u.id === appState.currentChatId);
  const name = partner ? escHtml(partner.name) : 'this user';

  // Remove existing modal if any
  document.getElementById('reportModalOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'report-modal-overlay';
  overlay.id = 'reportModalOverlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeReportModal(); };

  overlay.innerHTML = `
    <div class="report-modal-sheet">
      <div class="report-modal-title">Report ${name}</div>

      <div class="report-option" onclick="submitReport('inappropriate', '${name}')">
        <div class="report-option-icon">🚫</div>
        Inappropriate content or behavior
      </div>
      <div class="report-option" onclick="submitReport('spam', '${name}')">
        <div class="report-option-icon">📧</div>
        Spam or scam
      </div>
      <div class="report-option" onclick="submitReport('fake', '${name}')">
        <div class="report-option-icon">🎭</div>
        Fake profile
      </div>
      <div class="report-option" onclick="submitReport('harassment', '${name}')">
        <div class="report-option-icon">⚠️</div>
        Harassment or abuse
      </div>
      <div class="report-option danger" onclick="blockUser('${partner?.id || ''}', '${name}')">
        <div class="report-option-icon">🚷</div>
        Block ${name}
      </div>

      <button class="report-cancel-btn" onclick="closeReportModal()">Cancel</button>
    </div>
  `;

  document.querySelector('.app-shell')?.appendChild(overlay);
}

function closeReportModal() {
  document.getElementById('reportModalOverlay')?.remove();
}

function submitReport(reason, name) {
  closeReportModal();
  showToast(`✅ Report submitted. We'll review ${name}'s account.`, 'info');
}

function blockUser(userId, name) {
  closeReportModal();
  if (userId) {
    matchedUsers = matchedUsers.filter(u => u.id !== userId);
    delete conversations[userId];
    saveToStorage();
    renderConversationList();
  }
  showToast(`${name} has been blocked.`, 'info');
  // Go back to matches
  showScreen('matches');
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
    if (perm === 'granted') showToast('🔔 Notifications enabled!');
  });
}

function dismissNotifBanner() {
  const banner = document.getElementById('notifPermBanner');
  if (banner) {
    banner.style.animation = 'slideDown 0.25s ease reverse both';
    setTimeout(() => banner.remove(), 250);
  }
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

    // Combine with local demo profiles
    const qLower = query.toLowerCase();
    const localMatches = [...PROFILES_DATA, ...matchedUsers].filter(u =>
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

    // Combine with local demo profiles
    const qLower = query.toLowerCase();
    const localMatches = [...PROFILES_DATA, ...matchedUsers].filter(u =>
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