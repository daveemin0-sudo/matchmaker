/* ==========================================================
   hookmebysam — Firebase & Paystack Backend Module
   ========================================================== */

// 1. YOUR FIREBASE CONFIG KEYS
// Replace the placeholder values below with your keys from https://console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyCCjBefT39USp6JslywXA-ZCUOK_t9gmUk",
  authDomain: "hookmebysam.firebaseapp.com",
  databaseURL: "https://hookmebysam-default-rtdb.firebaseio.com",
  projectId: "hookmebysam",
  storageBucket: "hookmebysam.firebasestorage.app",
  messagingSenderId: "512221711818",
  appId: "1:512221711818:web:d0c40fcb9f934c4e249333",
  measurementId: "G-XYWLF7VS28"
};

// 2. YOUR PAYSTACK PUBLIC KEY
// Replace with your key from https://dashboard.paystack.com (e.g. pk_test_xxxx or pk_live_xxxx)
const PAYSTACK_PUBLIC_KEY = "pk_test_64c0226b47c23fcdf84f6354d3cc1868e699e62b";

// 3. YOUR WEBHOOK SERVER URL
// Defaults to the deployed Render backend so local Live Server (port 5500) and production
// both work out of the box without requiring a local Node process on port 3001.
// To explicitly test against a local backend server on port 3001, pass ?localBackend=1
// or run localStorage.setItem('localBackend', '1') in the browser console.
const BACKEND_URL = (
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('localBackend') === '1' ||
   (typeof window.localStorage !== 'undefined' && window.localStorage?.getItem('localBackend') === '1') ||
   window.__USE_LOCAL_BACKEND__ === true)
)
  ? `http://${window.location.hostname || '127.0.0.1'}:3001`
  : 'https://matchmaker-viwb.onrender.com';

async function getBackendAuthHeaders() {
  if (!fbAuth?.currentUser) throw new Error('Sign in required.');
  const token = await fbAuth.currentUser.getIdToken();
  return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
}

/* ==========================================================
   FIREBASE ADAPTER FUNCTIONS
   ========================================================== */

let fbApp = null;
let fbAuth = null;
let fbDb = null;
let fbStorage = null;

// Initialize Firebase if keys are configured
function initBackend() {
  const isPlaceholder = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("YOUR_");
  if (typeof firebase !== "undefined" && !isPlaceholder) {
    try {
      // Prevent double-initialization on hot reload
      if (firebase.apps && firebase.apps.length > 0) {
        fbApp = firebase.apps[0];
      } else {
        fbApp = firebase.initializeApp(firebaseConfig);
      }
      fbAuth = firebase.auth();
      fbDb = firebase.firestore();
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
      console.log("🔥 Firebase initialized — project:", firebaseConfig.projectId);
      listenToAuthChanges();

      // Check for Google redirect result (crucial for mobile browsers)
      if (fbAuth && typeof fbAuth.getRedirectResult === 'function') {
        fbAuth.getRedirectResult().then((result) => {
          if (result && result.user) {
            console.log("🔥 Google redirect sign-in success:", result.user.email);
            window.resolveGoogleSignIn(result).then((user) => {
              if (typeof handleGoogleLoginSuccess === 'function') {
                handleGoogleLoginSuccess(user);
              } else if (typeof window.handleGoogleLoginSuccess === 'function') {
                window.handleGoogleLoginSuccess(user);
              }
            });
          }
        }).catch((err) => {
          console.warn("Google redirect auth error:", err);
          if (typeof handleGoogleAuthError === 'function') {
            handleGoogleAuthError(err);
          } else if (typeof window.handleGoogleAuthError === 'function') {
            window.handleGoogleAuthError(err);
          }
        });
      }

      // Sync VIP status shortly after auth resolves
      setTimeout(() => checkAndSyncVipStatus(), 3000);
    } catch (e) {
      console.warn("Firebase init warning:", e.message);
    }
  } else {
    console.log("ℹ️ Running in Local Mode. Firebase keys detected — starting live backend.");
    // Keys are present — try again once Firebase SDK loads
    if (typeof firebase === "undefined") {
      window.addEventListener("load", () => initBackend(), { once: true });
    }
  }
}

// Auto-run if Firebase SDK is already loaded synchronously
if (typeof firebase !== "undefined") {
  initBackend();
}

// Sync only the safe, discoverable subset of the authenticated user's profile.
// The server reads the private user document with Admin SDK and publishes a
// sanitized copy to public_profiles.
async function syncPublicProfileToBackend() {
  if (!fbAuth?.currentUser) return false;
  try {
    const token = await fbAuth.currentUser.getIdToken();
    const res = await fetch(BACKEND_URL + '/profiles/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
    });
    return res.ok;
  } catch (err) {
    console.warn('Public profile sync failed:', err.message);
    return false;
  }
}

// Retrieve authenticated user's profile from trusted backend
async function fetchUserProfileFromBackend() {
  if (!fbAuth?.currentUser) return null;
  try {
    const token = await fbAuth.currentUser.getIdToken();
    const res = await fetch(BACKEND_URL + '/profiles/me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.exists && data.profile) {
        return data.profile;
      }
    }
  } catch (err) {
    console.warn('Backend /profiles/me check failed:', err.message);
  }
  return null;
}
window.fetchUserProfileFromBackend = fetchUserProfileFromBackend;
window.BACKEND_URL = BACKEND_URL;

// Account linking for Google sign-in. If the Google identity produced a new
// uid but the same verified email already belongs to an existing account, the
// backend links Google to that existing account; we then sign in again with the
// Google credential so the ORIGINAL uid (profile, chats, matches) is used.
async function resolveGoogleSignIn(result) {
  const user = result && result.user;
  if (!user) return user;
  try {
    const token = await user.getIdToken(true);
    const res = await fetch(BACKEND_URL + '/auth/link-google', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) return user;
    const data = await res.json();
    if (data && data.linked && result.credential) {
      await fbAuth.signOut();
      const relinked = await fbAuth.signInWithCredential(result.credential);
      return relinked.user;
    }
  } catch (err) {
    console.warn('Google account linking check failed:', err.message);
  }
  return fbAuth.currentUser || user;
}
window.resolveGoogleSignIn = resolveGoogleSignIn;

// ----------------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------------

async function backendSignUp(email, password, userData) {
  if (!fbAuth) return { success: false, mode: 'local' };
  const age = Number(userData?.age);
  if (!Number.isFinite(age) || age < 18 || age > 100) {
    return { success: false, error: 'You must be 18 or older to join.' };
  }
  try {
    const userCredential = await fbAuth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Save profile to Firestore
    await fbDb.collection('users').doc(user.uid).set({
      id: user.uid,
      email: email,
      name: userData.name || 'User',
      username: (userData.username || userData.name || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user',
      age: userData.age || 24,
      bio: userData.bio || '',
      gender: userData.gender || 'Male',
      interests: userData.interests || [],
      location: userData.location || 'Lagos, Nigeria',
      image: userData.image || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
      isVip: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, user };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function backendLogIn(email, password) {
  if (!fbAuth) return { success: false, mode: 'local' };
  try {
    const userCredential = await fbAuth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const doc = await fbDb.collection('users').doc(user.uid).get();
    return { success: true, user, profile: doc.data() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function loadBlockedUsersFromFirestore() {
  if (!fbDb || !fbAuth?.currentUser) return;
  const uid = fbAuth.currentUser.uid;
  try {
    const snap = await fbDb.collection('blocks').where('blockedBy', '==', uid).get();
    const existing = new Map(
      (typeof blockedUsers !== 'undefined' && Array.isArray(blockedUsers) ? blockedUsers : [])
        .map(item => [item.id, item])
    );
    const ids = [];
    snap.forEach(doc => {
      const data = doc.data() || {};
      if (data.blockedUserId && data.blockedUserId !== uid) ids.push(data.blockedUserId);
    });
    window.__blockedUserIds = new Set(ids);
    if (typeof blockedUsers !== 'undefined') {
      blockedUsers = ids.map(id => existing.get(id) || {
        id,
        name: 'Blocked contact',
        image: '',
        blockedAt: Date.now()
      });
    }
  } catch (err) {
    console.warn('Could not load blocked contacts:', err.message);
  }
}

function listenToAuthChanges() {
  if (!fbAuth) return;
  fbAuth.onAuthStateChanged(async (user) => {
    if (user) {
      // Isolate caches strictly per user ID: purge previous user's data if user switched
      if (typeof window.ensureCacheOwner === 'function') {
        await window.ensureCacheOwner(user.uid);
      } else if (typeof ensureCacheOwner === 'function') {
        await ensureCacheOwner(user.uid);
      }
      window.__currentAuthUid = user.uid;

      // Safely access or create currentUser object
      let targetUser = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (window.currentUser || {});
       // The server/Firestore account record is the source of truth for VIP.
       if (typeof appState !== 'undefined') appState.isVip = false;
       if (window.appState) window.appState.isVip = false;

       try {
         if (fbDb) {
           let doc = await fbDb.collection('users').doc(user.uid).get();
           let docData = null;

           if (doc && doc.exists) {
             const d = doc.data();
             if (d && d.name && !d.name.includes('@')) {
               docData = d;
             }
           }

           // 1. If not found in Firestore doc, query trusted backend /profiles/me (Admin SDK checks email and migrates)
           if (!docData) {
             try {
               const backendProfile = await fetchUserProfileFromBackend();
               if (backendProfile && backendProfile.name && !backendProfile.name.includes('@')) {
                 docData = backendProfile;
                 console.log('✅ Found user profile via backend /profiles/me:', docData.name, docData.username);
               }
             } catch (e) {
               console.warn('Could not query /profiles/me in listenToAuthChanges:', e.message);
             }
           }

           // 2. If still not found, check localStorage profile cache
           if (!docData && user.email) {
             try {
               const cache = JSON.parse(localStorage.getItem('hmbs_profile_cache') || '{}');
               const cached = cache[user.email.toLowerCase()];
               if (cached && cached.name && !cached.name.includes('@')) {
                 docData = cached;
                 console.log('✅ Restored user profile from local profile cache:', docData.name);
               }
             } catch (_) {}
           }

           // 3. Fallback to localStorage registered users or hmbs_user
           if (!docData && user.email) {
             try {
               const savedUser = JSON.parse(localStorage.getItem('hmbs_user') || 'null');
               if (savedUser && savedUser.email && savedUser.email.toLowerCase() === user.email.toLowerCase() && savedUser.name && !savedUser.name.includes('@')) {
                 docData = savedUser;
               } else {
                 const regUsers = typeof getRegisteredUsers === 'function' ? getRegisteredUsers() : [];
                 const localMatch = regUsers.find(u => u.email && u.email.toLowerCase() === user.email.toLowerCase() && u.name && !u.name.includes('@'));
                 if (localMatch) docData = localMatch;
               }
             } catch (_) {}
           }

           if (docData) {
             if (docData.suspended === true || docData.accountStatus === 'suspended') {
               targetUser.suspended = true;
               if (typeof showToast === 'function') showToast('Your account has been suspended by an administrator.', 'error');
               if (typeof fbAuth.signOut === 'function') fbAuth.signOut();
               if (typeof handleLogout === 'function') handleLogout();
               return;
             }
             targetUser = Object.assign({}, targetUser, docData);
             targetUser.id = user.uid;
             targetUser.email = (user.email || targetUser.email || '').toLowerCase();
             targetUser.name = docData.name || docData.displayName || targetUser.name || 'User';
             targetUser.displayName = targetUser.name;
             // Guarantee username is never undefined!
             targetUser.username = (docData.username || targetUser.username || targetUser.name || 'user')
               .toLowerCase()
               .replace(/[^a-z0-9_]/g, '') || 'user';

             const expiryMs = docData.vipExpiry?.toMillis ? docData.vipExpiry.toMillis() : (docData.vipExpiry || 0);
             const vipActive = Boolean(docData.isVip && (!expiryMs || expiryMs > Date.now()));
             if (typeof appState !== 'undefined') {
               appState.isVip = vipActive;
               appState.isLoggedIn = true;
             }
             if (window.appState) {
               window.appState.isVip = vipActive;
               window.appState.isLoggedIn = true;
             }

             // Keep local cache updated
             try {
               const cache = JSON.parse(localStorage.getItem('hmbs_profile_cache') || '{}');
               cache[targetUser.email.toLowerCase()] = { ...targetUser };
               localStorage.setItem('hmbs_profile_cache', JSON.stringify(cache));
             } catch (_) {}

             // Only write to Firestore if document does not exist yet (avoid redundant overwrites)
             if (!doc || !doc.exists) {
               const cleanPayload = {};
               for (const [k, v] of Object.entries(targetUser)) {
                 if (v !== undefined && typeof v !== 'function') {
                   cleanPayload[k] = v;
                 }
               }
               cleanPayload.username = targetUser.username || 'user';
               try {
                 await fbDb.collection('users').doc(user.uid).set(cleanPayload, { merge: true });
               } catch (e) {
                 console.warn('Profile sync notice:', e.message);
               }
             }
           } else {
             // Brand new user without any existing account:
             // Preserve Google display name if valid, but NEVER use email prefix as name or username!
             const gName = (user.displayName || '').trim();
             const cleanName = (gName && !gName.includes('@')) ? gName : '';

             targetUser.id = user.uid;
             targetUser.email = (user.email || '').toLowerCase();
             targetUser.name = cleanName;
             targetUser.displayName = cleanName;
             targetUser.image = user.photoURL || '';
             targetUser.avatar = user.photoURL || '';
             targetUser.photos = user.photoURL ? [user.photoURL] : [];
             targetUser.authProvider = 'google';
             // Do NOT write dummy profile with email prefix to Firestore!
           }

           if (!window.__userSuspensionListenerAttached) {
             window.__userSuspensionListenerAttached = true;
             fbDb.collection('users').doc(user.uid).onSnapshot(s => {
               if (s && s.exists) {
                 const d = s.data();
                 if (d.suspended === true || d.accountStatus === 'suspended') {
                   window.alert('Your account has been suspended by an administrator for violating community guidelines.');
                   if (typeof fbAuth.signOut === 'function') fbAuth.signOut();
                   if (typeof handleLogout === 'function') handleLogout();
                   window.location.reload();
                 }
               }
             }, err => console.warn('Suspension listener error:', err.message));
           }
         }
       } catch (err) {
         // Fail closed when the authoritative profile cannot be read.
         console.warn("Firestore profile read fallback:", err.message);
       }
      
      // Ensure targetUser has at least auth email and uid
      if (user.email) targetUser.email = user.email;
      if (user.uid) targetUser.id = user.uid;
      if (Array.isArray(targetUser.photos) && targetUser.photos.length > 0) {
        targetUser.photos = targetUser.photos.filter(Boolean);
        if (!targetUser.image) targetUser.image = targetUser.photos[0];
        if (!targetUser.avatar) targetUser.avatar = targetUser.photos[0];
      }
      if (targetUser.image || targetUser.avatar) {
        targetUser.image = targetUser.image || targetUser.avatar;
        targetUser.avatar = targetUser.image;
      }
      
      if (typeof currentUser !== 'undefined') {
        Object.assign(currentUser, targetUser);
      }
      window.currentUser = targetUser;
      if (typeof saveToStorage === 'function') saveToStorage();
       await syncPublicProfileToBackend();
            await loadBlockedUsersFromFirestore();
       if (typeof appState !== 'undefined') appState.isLoggedIn = true;
      const currentHash = window.location.hash || '';
      const isChatHash = currentHash.startsWith('#chat/');
      const chatPartnerId = isChatHash ? currentHash.replace('#chat/', '').trim() : (window.appState?.currentChatId || null);

      if (isChatHash && chatPartnerId && typeof openChat === 'function') {
        openChat(chatPartnerId);
      } else if (typeof showScreen === 'function' && window.appState?.currentScreen !== 'chat') {
        const cur = (typeof appState !== 'undefined' ? appState.currentScreen : null) || window.appState?.currentScreen;
        const targetScreen = (!cur || cur === 'login' || cur === 'signup') ? 'discovery' : cur;
        showScreen(targetScreen);
      }
      if (typeof initMainApp === 'function') initMainApp();
          if (typeof updateUserPresence === 'function') updateUserPresence(true);
      if (typeof listenForIncomingCalls === 'function') listenForIncomingCalls();
      if (typeof initPushNotifications === 'function') initPushNotifications();
      if (typeof initCommunityStoriesListener === 'function') initCommunityStoriesListener();
      
      // Wire up live real-time matches & messages listener immediately upon auth
      if (typeof listenToUserMatches === 'function' && typeof applyMatchesUpdate === 'function') {
        if (window._activeMatchesListener) {
          try { window._activeMatchesListener(); } catch (_) {}
        }
        window._activeMatchesListener = listenToUserMatches(applyMatchesUpdate);
      }
    } else {
      if (window._activeMatchesListener) {
        try { window._activeMatchesListener(); } catch (_) {}
        window._activeMatchesListener = null;
      }
      if (typeof window.purgeUserScopedData === 'function') {
        window.purgeUserScopedData();
      } else if (typeof purgeUserScopedData === 'function') {
        purgeUserScopedData();
      }
      window.__currentAuthUid = null;
       if (typeof appState !== 'undefined') {
         appState.isLoggedIn = false;
         appState.isVip = false;
       }
       if (window.appState) {
         window.appState.isLoggedIn = false;
         window.appState.isVip = false;
       }
      if (typeof showScreen === 'function') showScreen('login');
      if (typeof updateHeader === 'function') updateHeader('login');
    }
  });
}

// ----------------------------------------------------------
// SWIPES & MATCHING
// ----------------------------------------------------------

async function recordSwipeInBackend(targetUserId, action) {
  if (!fbAuth?.currentUser) return { success: false, matched: false, error: 'Sign in required.' };

  try {
    const token = await fbAuth.currentUser.getIdToken();
    const res = await fetch(BACKEND_URL + '/swipes/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ targetUserId, action })
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.success) {
      return { success: true, matched: Boolean(data.matched), matchId: data.matchId || null, swipesRemaining: data.swipesRemaining };
    }

    if (res.status === 429) {
      if (data.error) showToast(data.error, 'gold');
      return { success: false, matched: false, limited: true, error: data.error, swipesRemaining: 0 };
    }

    if (res.status === 401) {
      showToast('Your session expired. Please sign in again.', 'error');
      try { await fbAuth.signOut(); } catch (_) {}
      return { success: false, matched: false, error: 'Authentication required.' };
    }

    showToast(data.error || 'Could not save your swipe. Please try again.', 'error');
    return { success: false, matched: false, error: data.error || 'Swipe failed.' };
  } catch (err) {
    console.warn('Backend swipe request failed:', err.message);
    showToast('Connection problem. Please try again.', 'error');
    return { success: false, matched: false, error: 'Backend unavailable.' };
  }
}

// Fetch all registered users from Firestore for the swipe card stack
async function fetchRealUsersFromFirestore() {
  if (!fbAuth?.currentUser) return [];
  try {
    const headers = await getBackendAuthHeaders();
    const res = await fetch(BACKEND_URL + '/discovery?limit=60', { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Discovery request failed.');
    }
    if (typeof data.isVip === 'boolean' && typeof appState !== 'undefined') {
      appState.isVip = data.isVip;
      if (typeof updateLimitBadges === 'function') updateLimitBadges();
    }
    if (typeof data.swipesRemaining === 'number' && typeof updateSwipeCounter === 'function') {
      updateSwipeCounter(data.swipesRemaining);
    }
    return Array.isArray(data.users) ? data.users.map(u => ({
      ...u,
      photos: Array.isArray(u.photos) && u.photos.length > 0 ? u.photos : (u.image ? [u.image] : [])
    })) : [];
  } catch (err) {
    console.warn('Error fetching discovery feed:', err.message);
    return [];
  }
}
// Search registered Firestore users by name, email, or bio
async function searchUsersInFirestore(queryText) {
  if (!fbDb || !fbAuth?.currentUser) return [];
  const currentUserId = fbAuth.currentUser.uid;
  const q = queryText.toLowerCase().trim();
  if (!q) return [];

  try {
    const snapshot = await fbDb.collection('public_profiles').get().catch(() => null);
    if (!snapshot) return [];

    const results = [];
    snapshot.forEach(doc => {
      if (doc.id !== currentUserId && !(window.__blockedUserIds || new Set()).has(doc.id)) {
        const data = doc.data();
        const name = (data.displayName || data.name || '').toLowerCase();
        const bio = (data.bio || '').toLowerCase();

        if (name.includes(q) || bio.includes(q)) {
          const userPhoto = data.image || data.avatar || '';
          results.push({
            id: doc.id,
            name: data.displayName || data.name || 'User',
            age: data.age || 24,
            bio: data.bio || 'Registered user on hookmebysam.',
            gender: data.gender || 'Female',
            image: userPhoto,
            tags: data.interests || ['Music 🎵', 'Vibes ✨'],
            isRealUser: true
          });
        }
      }
    });
    return results;
  } catch (err) {
    console.warn("Error searching Firestore users:", err.message);
    return [];
  }
}

// Cache of fetched public profiles to eliminate redundant N+1 queries across realtime snapshot updates
const _publicProfilesCache = new Map();

// Helper to resolve partner profile fast from memory cache, local matchedUsers, or Firestore in parallel
async function resolvePartnerProfile(partnerId) {
  if (!partnerId) return null;
  if (_publicProfilesCache.has(partnerId)) {
    return _publicProfilesCache.get(partnerId);
  }
  // Check memory
  if (typeof matchedUsers !== 'undefined' && Array.isArray(matchedUsers)) {
    const existing = matchedUsers.find(u => u.id === partnerId);
    if (existing && existing.name && existing.image) {
      _publicProfilesCache.set(partnerId, existing);
      return existing;
    }
  }
  try {
    const userDoc = await fbDb.collection('public_profiles').doc(partnerId).get().catch(() => null);
    if (userDoc && userDoc.exists) {
      const data = userDoc.data();
      const profile = {
        name: data.displayName || data.name || 'Match',
        age: data.age || 24,
        bio: data.bio || '',
        image: data.image || data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
        interests: data.interests || []
      };
      _publicProfilesCache.set(partnerId, profile);
      return profile;
    }
  } catch (_) {}
  return null;
}

// Real-time listener for user's matches (Parallelized, cached, non-blocking)
function listenToUserMatches(callback) {
  if (!fbDb || !fbAuth?.currentUser) return null;
  const currentUserId = fbAuth.currentUser.uid;

  try {
    return fbDb.collection('matches')
      .where('users', 'array-contains', currentUserId)
      .onSnapshot(async (snapshot) => {
        const validMatchDocs = snapshot.docs.filter(doc => {
          const matchData = doc.data();
          if (matchData.blocked === true) return false;
          const partnerId = matchData.users?.find(id => id !== currentUserId);
          if (!partnerId) return false;
          const isBlocked = (window.__blockedUserIds && window.__blockedUserIds.has(partnerId)) ||
            (typeof blockedUsers !== 'undefined' && Array.isArray(blockedUsers) && blockedUsers.some(b => b.id === partnerId));
          return !isBlocked;
        });

        // Parallel resolve of all partner profiles simultaneously
        const profilePromises = validMatchDocs.map(async (doc) => {
          const matchData = doc.data();
          const partnerId = matchData.users?.find(id => id !== currentUserId);
          const data = await resolvePartnerProfile(partnerId);
          if (!data) return null;

          // Cached presence if known
          const presCached = typeof _presenceCache !== 'undefined' ? _presenceCache[partnerId] : null;

          return {
            id: partnerId,
            name: data.displayName || data.name || 'Match',
            age: data.age || 24,
            bio: data.bio || '',
            image: data.image || data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
            tags: data.interests || [],
            distance: '2 km',
            lastMessage: matchData.lastMessage || '',
            lastSender: matchData.lastSender || '',
            lastUpdated: matchData.lastUpdated?.toMillis ? matchData.lastUpdated.toMillis() : (matchData.createdAt?.toMillis ? matchData.createdAt.toMillis() : Date.now()),
            isOnline: Boolean(presCached?.isOnline),
            lastSeen: presCached?.lastSeen || 0,
            isRealUser: true
          };
        });

        const results = await Promise.all(profilePromises);
        const matchedProfiles = results.filter(Boolean);

        // Sort matches by latest updated descending so new messages immediately go to the top
        matchedProfiles.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

        // Immediately invoke callback with ready matches!
        callback(matchedProfiles);

        // Non-blocking background presence refresh (does not stall conversation list)
        (async () => {
          try {
            const presChecks = matchedProfiles.slice(0, 10).map(async (p) => {
              const presDoc = await fbDb.collection('presence').doc(p.id).get().catch(() => null);
              if (presDoc && presDoc.exists) {
                const pd = presDoc.data();
                let lastSeenMs = 0;
                if (typeof pd.lastSeen === 'number') lastSeenMs = pd.lastSeen;
                else if (pd.lastSeen?.toMillis) lastSeenMs = pd.lastSeen.toMillis();
                else if (pd.lastSeen?.seconds) lastSeenMs = pd.lastSeen.seconds * 1000;
                else if (pd.updatedAt) lastSeenMs = pd.updatedAt;
                const isOnline = Boolean(pd.isOnline && lastSeenMs && (Date.now() - lastSeenMs < 4 * 60 * 1000));
                if (typeof _presenceCache !== 'undefined') {
                  _presenceCache[p.id] = { isOnline, lastSeen: lastSeenMs };
                }
                p.isOnline = isOnline;
                p.lastSeen = lastSeenMs;
              }
            });
            await Promise.all(presChecks);
          } catch (_) {}
        })();

      }, (error) => {
        console.warn("Firestore matches listener offline/disabled:", error.message);
      });
  } catch (err) {
    console.warn("listenToUserMatches failed:", err.message);
    return null;
  }
}

// One-shot direct fetch of user matches (Parallelized & fast for pull-to-refresh & app resume)
async function fetchUserMatchesDirectly() {
  if (!fbDb || !fbAuth?.currentUser) return [];
  const currentUserId = fbAuth.currentUser.uid;
  try {
    const snapshot = await fbDb.collection('matches')
      .where('users', 'array-contains', currentUserId)
      .get();

    const validMatchDocs = snapshot.docs.filter(doc => {
      const matchData = doc.data();
      if (matchData.blocked === true) return false;
      const partnerId = matchData.users?.find(id => id !== currentUserId);
      if (!partnerId) return false;
      const isBlocked = (window.__blockedUserIds && window.__blockedUserIds.has(partnerId)) ||
        (typeof blockedUsers !== 'undefined' && Array.isArray(blockedUsers) && blockedUsers.some(b => b.id === partnerId));
      return !isBlocked;
    });

    const profilePromises = validMatchDocs.map(async (doc) => {
      const matchData = doc.data();
      const partnerId = matchData.users?.find(id => id !== currentUserId);
      const data = await resolvePartnerProfile(partnerId);
      if (!data) return null;
      return {
        id: partnerId,
        name: data.displayName || data.name || 'Match',
        age: data.age || 24,
        bio: data.bio || '',
        image: data.image || data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
        tags: data.interests || [],
        distance: '2 km',
        lastMessage: matchData.lastMessage || '',
        lastSender: matchData.lastSender || '',
        lastUpdated: matchData.lastUpdated?.toMillis ? matchData.lastUpdated.toMillis() : (matchData.createdAt?.toMillis ? matchData.createdAt.toMillis() : Date.now()),
        isRealUser: true
      };
    });

    const results = await Promise.all(profilePromises);
    const matchedProfiles = results.filter(Boolean);
    matchedProfiles.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
    return matchedProfiles;
  } catch (err) {
    console.warn("fetchUserMatchesDirectly failed:", err.message);
    return [];
  }
}

// ----------------------------------------------------------
// REALTIME MESSAGING
// ----------------------------------------------------------

function listenToRealtimeMessages(matchId, callback) {
  if (!fbDb) return null;
  try {
    return fbDb.collection('matches').doc(matchId).collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot({ includeMetadataChanges: true }, snapshot => {
        const msgs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(m => !m.deleted);
        callback(msgs);
      }, (error) => {
        console.warn("Firestore messages listener offline/disabled:", error.message);
      });
  } catch (err) {
    console.warn("listenToRealtimeMessages failed:", err.message);
    return null;
  }
}

async function sendRealtimeMessage(matchId, text, isVoice = false, audioUrl = "", imageUrl = "", replyTo = null, videoUrl = "", isVideo = false, localId = "", duration = "") {
  if (!fbDb || !fbAuth?.currentUser || !matchId) return false;
  if (window.currentUser?.suspended === true || (typeof currentUser !== 'undefined' && currentUser?.suspended)) {
    if (typeof showToast === 'function') showToast('Your account is suspended. Messaging is disabled.', 'error');
    return false;
  }
  const currentUserId = fbAuth.currentUser.uid;

  try {
    const matchRef = fbDb.collection('matches').doc(matchId);
    let matchSnap = await matchRef.get().catch(() => null);
    let users = (matchSnap && matchSnap.exists) ? matchSnap.data()?.users : null;

    // Auto-resolve users from matchId if match document is not yet initialized
    if (!Array.isArray(users) || users.length !== 2 || !users.includes(currentUserId)) {
      const parts = matchId.split('_');
      if (parts.length === 2 && parts.includes(currentUserId)) {
        users = parts;
      }
    }

    if (!Array.isArray(users) || !users.includes(currentUserId)) {
      console.warn('sendRealtimeMessage: active match not found or access denied');
      return false;
    }

    if (matchSnap && matchSnap.exists && matchSnap.data()?.blocked === true) {
      if (typeof showToast === 'function') showToast('Cannot send message: Match has ended.', 'error');
      return false;
    }

    const partnerId = users.find(id => id !== currentUserId);
    if (partnerId && (
      (window.__blockedUserIds && window.__blockedUserIds.has(partnerId)) ||
      (typeof blockedUsers !== 'undefined' && Array.isArray(blockedUsers) && blockedUsers.some(b => b.id === partnerId))
    )) {
      if (typeof showToast === 'function') showToast('Cannot send message: This user is blocked.', 'error');
      return false;
    }

    const isVideoMsg = Boolean(isVideo || videoUrl);
    const msgData = {
      sender: currentUserId,
      text: text || "",
      isVoice: isVoice,
      audioUrl: audioUrl,
      imageUrl: isVideoMsg ? '' : (imageUrl || ''),
      videoUrl: isVideoMsg ? (videoUrl || imageUrl || '') : '',
      isVideo: isVideoMsg,
      duration: duration || (isVoice ? '0:05' : ''),
      read: false,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (replyTo) msgData.replyTo = replyTo;
    if (localId) msgData.localId = localId;

    // Ensure parent match doc exists with proper participants & latest message
    const previewText = text || (isVoice ? '🎤 Voice note' : (isVideoMsg ? '📹 Video' : (imageUrl ? '📷 Photo' : 'New message')));
    await matchRef.set({
      users,
      lastMessage: previewText,
      lastSender: currentUserId,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(e => console.warn("matchRef merge warning:", e));

    await fbDb.collection('matches').doc(matchId).collection('messages').add(msgData);
    return true;
  } catch (err) {
    console.error("sendRealtimeMessage failed:", err);
    return false;
  }
}

async function deleteRealtimeMessage(matchId, messageId) {
  if (!fbDb || !matchId || !messageId) return false;
  try {
    const docRef = fbDb.collection('matches').doc(matchId).collection('messages').doc(messageId);
    await docRef.delete().catch(async () => {
      await docRef.set({ deleted: true, text: 'This message was deleted' }, { merge: true }).catch(() => {});
    });
    return true;
  } catch (err) {
    console.warn('deleteRealtimeMessage failed:', err);
    return false;
  }
}
window.deleteRealtimeMessage = deleteRealtimeMessage;

async function clearChatMessagesInFirestore(matchId) {
  if (!fbDb || !matchId) return;
  try {
    const msgsRef = fbDb.collection('matches').doc(matchId).collection('messages');
    const snapshot = await msgsRef.limit(200).get();
    if (!snapshot.empty) {
      const batch = fbDb.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
    await fbDb.collection('matches').doc(matchId).set({
      lastMessage: '',
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("clearChatMessagesInFirestore error:", err.message);
    return false;
  }
}

async function deleteRealtimeMessage(matchId, messageId) {
  if (!fbDb || !matchId || !messageId) return;
  try {
    const msgRef = fbDb.collection('matches').doc(matchId).collection('messages').doc(messageId);
    await msgRef.delete();
  } catch (err) {
    console.warn("deleteRealtimeMessage delete failed, attempting soft-delete:", err.message);
    try {
      await fbDb.collection('matches').doc(matchId).collection('messages').doc(messageId).update({
        deleted: true
      });
    } catch (e2) {
      console.warn("deleteRealtimeMessage soft-delete failed:", e2.message);
    }
  }
}

async function editRealtimeMessage(matchId, messageId, newText) {
  if (!fbDb || !matchId || !messageId) return;
  try {
    await fbDb.collection('matches').doc(matchId).collection('messages').doc(messageId).update({
      text: newText,
      edited: true,
      editedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.warn("editRealtimeMessage error:", err.message);
  }
}

async function reactRealtimeMessage(matchId, messageId, emoji, fallbackLocalId) {
  if (!fbDb || !fbAuth?.currentUser || !matchId || !emoji) return;
  
  let resolvedId = messageId;
  
  // If no direct Firestore doc ID, try to find by localId field
  if (!resolvedId && fallbackLocalId) {
    try {
      const snap = await fbDb.collection('matches').doc(matchId).collection('messages')
        .where('localId', '==', fallbackLocalId).limit(1).get();
      if (!snap.empty) {
        resolvedId = snap.docs[0].id;
      }
    } catch (e) {
      console.warn("reactRealtimeMessage localId lookup failed:", e.message);
    }
  }
  
  if (!resolvedId) {
    console.warn("reactRealtimeMessage: no valid messageId to react to", { matchId, messageId, fallbackLocalId });
    return;
  }
  
  const uid = fbAuth.currentUser.uid;
  const msgRef = fbDb.collection('matches').doc(matchId).collection('messages').doc(resolvedId);
  try {
    await fbDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(msgRef);
      if (!doc.exists) {
        console.warn("reactRealtimeMessage: doc not found", resolvedId);
        return;
      }
      const data = doc.data() || {};
      const reactions = data.reactions || {};
      const currentList = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
      let updatedList;
      if (currentList.includes(uid)) {
        updatedList = currentList.filter(id => id !== uid);
      } else {
        updatedList = [...currentList, uid];
      }
      reactions[emoji] = updatedList;
      transaction.update(msgRef, { reactions: reactions });
      console.log("reactRealtimeMessage: updated reaction", { resolvedId, emoji, count: updatedList.length });
    });
  } catch (err) {
    console.warn("reactRealtimeMessage error:", err.message);
  }
}

// ----------------------------------------------------------
// CLOUD FILE UPLOADS (Profile Photo, Voice Note, Chat Media)
// ----------------------------------------------------------

// When the project's Cloud Storage bucket does not exist (e.g. Spark plan, Storage
// never set up) every upload attempt is doomed. Trying it first used to delay each
// photo / voice note by ~10s before the inline fallback delivered it. Remember the
// failure (30 min, per device) so later sends skip straight to the inline path.
const STORAGE_UNAVAILABLE_KEY = 'hm_storage_unavailable_until';
const STORAGE_UNAVAILABLE_TTL_MS = 30 * 60 * 1000;
// Largest file we will inline as a data URL (base64 is ~4/3 the size and a Firestore
// document is capped at 1 MiB).
const INLINE_MEDIA_MAX_BYTES = 600 * 1024;

function markCloudStorageUnavailable() {
  window._firebaseStorageDisabled = true;
  try { localStorage.setItem(STORAGE_UNAVAILABLE_KEY, String(Date.now() + STORAGE_UNAVAILABLE_TTL_MS)); } catch (_) {}
}
try {
  if (Number(localStorage.getItem(STORAGE_UNAVAILABLE_KEY) || 0) > Date.now()) window._firebaseStorageDisabled = true;
} catch (_) {}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function uploadFileToBackend(file, path, returnMetadata = false, customContentType = '') {
  window._lastMediaUploadError = null;
  if (!fbStorage || !fbAuth?.currentUser) {
    window._lastMediaUploadError = !fbStorage ? 'Firebase Storage is not initialized.' : 'Sign in before uploading.';
    return null;
  }
  if (window._firebaseStorageDisabled) {
    // Known-unprovisioned bucket: no network round trip. Small non-video files are
    // inlined (same result the backend fallback produced, minus the ~10s wait).
    const contentType = customContentType || file.type || '';
    const looksVideo = contentType.startsWith('video/') || /\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(file.name || '');
    const isAudioType = contentType.startsWith('audio/');
    if ((!looksVideo || isAudioType) && file.size <= INLINE_MEDIA_MAX_BYTES) {
      const inline = await readFileAsDataUrl(file);
      if (inline) return returnMetadata ? { url: inline, storagePath: '' } : inline;
    }
    window._lastMediaUploadError = 'Firebase Storage is not provisioned on this plan.';
    return null;
  }
  try {
    const uid = fbAuth.currentUser.uid;
    const pathParts = String(path).split('/').filter(Boolean);
    const root = pathParts[0];
    const matchId = root === 'chat_media' && pathParts.length > 1 ? pathParts[1] : '';
    const allowedRoots = new Set(['stories', 'voicenotes', 'chat_media', 'chat_images', 'chat_videos']);
    if (!allowedRoots.has(root) || !fbAuth?.currentUser) return null;
    if (root === 'chat_media' && !matchId) {
      window._lastMediaUploadError = 'Chat media requires a match scope.';
      return null;
    }
    const isVid = Boolean(
      (file.type && file.type.startsWith('video/')) ||
      (file.name && file.name.match(/\.(mp4|mov|webm|m4v|3gp|mkv)$/i)) ||
      (customContentType && customContentType.startsWith('video/')) ||
      path === 'chat_videos'
    );
    const isAud = Boolean(
      (file.type && file.type.startsWith('audio/')) ||
      (file.name && file.name.match(/\.(webm|mp3|m4a|wav|ogg|aac)$/i)) ||
      (customContentType && customContentType.startsWith('audio/')) ||
      path === 'voicenotes'
    );
    const defaultExt = isAud ? '.webm' : (isVid ? '.mp4' : '.jpg');
    const safeName = String(file.name || ('file' + defaultExt)).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const storagePath = (root === 'chat_images' || root === 'chat_videos' || (root === 'chat_media' && matchId))
      ? `chat_media/${matchId}`
      : root;
    const storageRef = fbStorage.ref(`${storagePath}/${uid}/${Date.now()}_${safeName}`);
    const metadata = {
      contentType: customContentType || file.type || (isAud ? 'audio/webm' : (isVid ? 'video/mp4' : 'image/jpeg'))
    };

    let snapshot;
    try {
      const putPromise = storageRef.put(file, metadata);
      // Small files (photos, voice notes) should upload in a couple of seconds; a long
      // wait here just delays delivery. Videos legitimately need longer.
      const putTimeoutMs = isVid ? 25000 : 8000;
      const putTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Storage put timeout')), putTimeoutMs));
      snapshot = await Promise.race([putPromise, putTimeout]);
      const downloadUrl = await snapshot.ref.getDownloadURL();
      return returnMetadata ? { url: downloadUrl, storagePath: snapshot.ref.fullPath } : downloadUrl;
    } catch (putErr) {
      if (putErr?.code === 'storage/bucket-not-found' || putErr?.code === 'storage/project-not-found') {
        markCloudStorageUnavailable();
      }
      window._lastMediaUploadError = `Storage upload failed: ${putErr?.code || 'unknown'} — ${putErr?.message || 'unknown error'}`;
      console.warn('Direct Firebase Storage put failed/timed out, attempting backend upload fallback:', putErr?.message);

      // Attempt backend proxy upload to bypass browser CORS / client storage restrictions
      try {
        const token = await fbAuth.currentUser.getIdToken();
        const base64 = await readFileAsDataUrl(file);
        if (base64) {
          const res = await fetch(BACKEND_URL + '/media/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({
              dataBase64: base64,
              contentType: metadata.contentType,
              path: storagePath,
              fileName: safeName
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.success && data?.url) {
              // The backend only answers with an inline data: URL when it could not
              // save to a bucket, so Cloud Storage is unusable: stop retrying it.
              if (String(data.url).startsWith('data:')) markCloudStorageUnavailable();
              return returnMetadata ? { url: data.url, storagePath: `${storagePath}/${uid}/${safeName}` } : data.url;
            }
          }
        }
      } catch (backendErr) {
        console.warn('Backend upload proxy error:', backendErr.message);
      }
      return null;
    }
  } catch (err) {
    if (err?.code === 'storage/bucket-not-found' || err?.code === 'storage/project-not-found') {
      markCloudStorageUnavailable();
    }
    window._lastMediaUploadError = window._lastMediaUploadError || `Storage error: ${err?.code || 'unknown'} — ${err?.message || 'unknown error'}`;
    return null;
  }
}

// ----------------------------------------------------------
// PAYSTACK PAYMENT INTEGRATION
// ----------------------------------------------------------

function triggerPaystackPayment(planName, amountInNaira, onSuccessCallback) {
  if (!fbAuth?.currentUser) {
    showToast("Please sign in before purchasing VIP.", "error");
    return;
  }
  if (!PAYSTACK_PUBLIC_KEY || PAYSTACK_PUBLIC_KEY.includes("REPLACE_WITH_YOUR_LIVE_PAYSTACK_PUBLIC_KEY")) {
    showToast("VIP payments are not configured for production yet.", "error");
    return;
  }
  const customerEmail = fbAuth.currentUser.email || window.currentUser?.email || (fbAuth.currentUser.phoneNumber ? `${fbAuth.currentUser.phoneNumber.replace(/[^0-9]/g, '')}@hookmebysam.com` : 'user@hookmebysam.com');
  if (!customerEmail) {
    showToast("Add an email address to your account before purchasing VIP.", "error");
    return;
  }
  if (typeof PaystackPop === "undefined") {
    showToast("Paystack SDK loading...", "info");
    return;
  }

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: customerEmail,
    amount: amountInNaira * 100,
    currency: "NGN",
    ref: 'HMBS_' + Math.floor((Math.random() * 1000000000) + 1),
    metadata: {
      custom_fields: [
        { display_name: "Plan Name", variable_name: "plan_name", value: planName },
        { display_name: "User ID", variable_name: "user_id", value: fbAuth.currentUser.uid }
      ]
    },
    callback: function(response) {
      showToast(`🎉 Payment Successful! Reference: ${response.reference}`, "gold");
      if (onSuccessCallback) onSuccessCallback(response);
    },
    onClose: function() {
      showToast("Payment window closed.", "info");
    }
  });

  handler.openIframe();
}

// Asks the backend to confirm — server-to-server, with Paystack's secret
// key — that this reference really was paid, for the right amount, and
// hasn't been redeemed before. The client-side "success" callback above
// proves nothing on its own; this is the step that actually matters.
async function verifyPaymentOnBackend(reference, tier) {
  try {
    const headers = await getBackendAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/payment/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reference, tier }),
    });
    const data = await res.json();
    if (data.success) return { success: true };
    showToast(data.error || 'Could not confirm payment.', 'error');
    return { success: false };
  } catch (err) {
    console.error('Backend payment verification failed:', err);
    showToast('Payment could not be confirmed. Please try again.', 'error');
    return { success: false };
  }
}

// ----------------------------------------------------------
// TERMII OTP — Nigerian Phone Number SMS Verification
// (Calls your webhook-server which talks to Termii API)
// ----------------------------------------------------------

function ensureRecaptchaVerifier() {
  if (typeof firebase === 'undefined' || !fbAuth) return null;
  if (window.recaptchaVerifier) return window.recaptchaVerifier;

  let container = document.getElementById('recaptcha-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'recaptcha-container';
    container.style.display = 'none';
    document.body.appendChild(container);
  }

  try {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        try {
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          }
        } catch (_) {}
      }
    });
    return window.recaptchaVerifier;
  } catch (e) {
    console.warn('Could not initialize Firebase RecaptchaVerifier:', e);
    return null;
  }
}

async function sendOtpToPhone(phoneNumber) {
  window._devPhoneOtp = null;
  window._devPhoneOtpMessage = null;
  window._phoneConfirmationResult = null;

  // 1. Attempt backend webhook (Termii SMS) with a quick 3-second timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${BACKEND_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        showToast('📱 OTP sent! Check your SMS.', 'info');
        return true;
      }
    }
  } catch (err) {
    console.warn('Backend send-otp not reachable:', err?.message || err);
  }

  // 2. Attempt Firebase client-side Phone Auth (Google SMS)
  if (typeof firebase !== 'undefined' && fbAuth) {
    try {
      const verifier = ensureRecaptchaVerifier();
      if (verifier) {
        const confirmationResult = await fbAuth.signInWithPhoneNumber(phoneNumber, verifier);
        window._phoneConfirmationResult = confirmationResult;
        showToast('📱 SMS code sent via Firebase! Check your phone.', 'info');
        return true;
      }
    } catch (fbErr) {
      console.warn('Firebase signInWithPhoneNumber notice:', fbErr.code, fbErr.message);
      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      } catch (_) {}
    }
  }

  // 3. Resilient test fallback: generate 6-digit verification code
  // Prevents the user from being blocked by "Offline" error during testing or before SMS billing is funded
  const testOtp = String(Math.floor(100000 + Math.random() * 900000));
  window._devPhoneOtp = testOtp;
  window._devPhoneOtpTarget = phoneNumber;
  window._devPhoneOtpMessage = `ℹ️ <strong>Offline / Test Mode:</strong> SMS gateway server is offline. Use verification code: <strong style="color:#FFF;letter-spacing:3px;font-size:1.1rem;background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:6px">${testOtp}</strong>`;

  showToast(`📱 Verification code: ${testOtp}`, 'info', 8000);
  return true;
}

async function verifyOtp(phoneNumber, otpCode) {
  const cleanOtp = String(otpCode || '').trim();

  // A. Check dev/test code
  if (window._devPhoneOtp && cleanOtp === window._devPhoneOtp) {
    window._devPhoneOtp = null;
    window._devPhoneOtpMessage = null;
    showToast('✅ Phone verified!', 'gold');
    return { success: true, uid: fbAuth?.currentUser?.uid || 'phone_' + phoneNumber.replace(/\D/g, '') };
  }

  // B. Check Firebase confirmationResult
  if (window._phoneConfirmationResult) {
    try {
      const userCredential = await window._phoneConfirmationResult.confirm(cleanOtp);
      window._phoneConfirmationResult = null;
      showToast('✅ Phone verified! Welcome to hookmebysam.', 'gold');
      return { success: true, uid: userCredential.user.uid };
    } catch (fbErr) {
      console.warn('Firebase confirmationResult confirm failed:', fbErr.message);
      showToast(fbErr.message || 'Wrong code. Try again.', 'error');
      return { success: false, error: fbErr.message };
    }
  }

  // C. Check Backend server
  try {
    const res = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber, otp: cleanOtp })
    });
    const data = await res.json();
    if (data.success && data.token) {
      // Sign in to Firebase with the custom token from the server
      if (fbAuth) {
        await fbAuth.signInWithCustomToken(data.token);
      }
      showToast('✅ Phone verified! Welcome to hookmebysam.', 'gold');
      return { success: true, uid: data.uid };
    } else {
      showToast(data.error || 'Wrong OTP. Try again.', 'error');
      return { success: false };
    }
  } catch (err) {
    showToast('Verification failed. Please check the code.', 'error');
    return { success: false };
  }
}

// Same backend endpoint as verifyOtp(), but for an ALREADY-signed-in user
// re-verifying/adding a phone number in Settings. Deliberately does NOT
// sign in with the returned custom token — that token belongs to a
// phone-identified user record, and blindly signing in with it would
// swap the active session away from the user's real (email-based)
// account. This just confirms code ownership; the caller decides what
// to do with that confirmation (here: save the number to their profile).
async function verifyPhoneOwnershipOnly(phoneNumber, otpCode) {
  const cleanOtp = String(otpCode || '').trim();

  // A. Check dev/test OTP
  if (window._devPhoneOtp && cleanOtp === window._devPhoneOtp) {
    window._devPhoneOtp = null;
    window._devPhoneOtpMessage = null;
    if (fbDb && fbAuth?.currentUser) {
      try {
        await fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
          phone: phoneNumber,
          phoneVerified: true,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore phone update notice:', e.message);
      }
    }
    return { success: true };
  }

  // B. Check Firebase confirmationResult
  if (window._phoneConfirmationResult) {
    try {
      await window._phoneConfirmationResult.confirm(cleanOtp);
      window._phoneConfirmationResult = null;
      if (fbDb && fbAuth?.currentUser) {
        try {
          await fbDb.collection('users').doc(fbAuth.currentUser.uid).set({
            phone: phoneNumber,
            phoneVerified: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.warn('Firestore phone update notice:', e.message);
        }
      }
      return { success: true };
    } catch (fbErr) {
      console.warn('Firebase confirmationResult confirm failed:', fbErr.message);
    }
  }

  // C. Check Backend server
  try {
    const headers = await getBackendAuthHeaders();
    const res = await fetch(BACKEND_URL + '/auth/verify-phone', {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: phoneNumber, otp: cleanOtp })
    });
    const data = await res.json();
    if (data.success) {
      return { success: true };
    }
    showToast(data.error || 'Wrong OTP. Try again.', 'error');
    return { success: false, error: data.error };
  } catch (err) {
    console.warn('Backend verify-phone unreachable:', err.message);
  }

  showToast('Invalid verification code. Please try again.', 'error');
  return { success: false };
}

// ----------------------------------------------------------
// VIP STATUS VERIFIER — Re-check from Firestore on app load
// Prevents VIP expiry bypass via localStorage manipulation
// ----------------------------------------------------------
async function checkAndSyncVipStatus() {
  if (!fbDb || !fbAuth?.currentUser) return;
  if (typeof appState !== 'undefined') appState.isVip = false;
  if (window.appState) window.appState.isVip = false;

  try {
    const doc = await fbDb.collection('users').doc(fbAuth.currentUser.uid).get();
    if (!doc.exists) return;
    const data = doc.data();
    const expiryMs = data.vipExpiry?.toMillis ? data.vipExpiry.toMillis() : 0;
    const isVip = Boolean(data.isVip && (!expiryMs || expiryMs > Date.now()));
    if (typeof appState !== 'undefined') appState.isVip = isVip;
    if (window.appState) window.appState.isVip = isVip;
    if (typeof renderSettingsScreen === 'function') renderSettingsScreen();
    console.log(`👑 VIP Status: ${isVip ? 'ACTIVE' : 'INACTIVE'} | Expires: ${data.vipExpiry?.toDate?.()?.toDateString?.() || 'N/A'}`);
  } catch (e) {
    console.warn('Could not sync VIP status:', e);
  }
}

// Initialize when page loads
window.addEventListener("load", () => {
  initBackend();
});

/* ==========================================================
   PUSH NOTIFICATIONS — Firebase Cloud Messaging (FCM)
   ========================================================== */

let _fcmMessaging = null;

// Call this once after login to register the device for push
async function initPushNotifications() {
  if (!fbApp || typeof firebase === 'undefined' || !firebase.messaging || typeof Notification === 'undefined') return;

  try {
    _fcmMessaging = firebase.messaging();

    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (_) {}
    }
    if (permission !== 'granted') {
      console.info('Push notification permission:', permission);
      return;
    }

    const VAPID_KEY = 'BLp3qjWUxvFZkjtXaP7Xs4o4Oidsgz2segUhkRBeJWCWnYS283ds9P0c2Ao86eqxSjSZvGphASeN5Y6Ty7bC3h8';

    let serviceWorkerRegistration = null;
    if ('serviceWorker' in navigator) {
      try {
        // Ensure sw.js is registered first if not present
        if (!navigator.serviceWorker.controller) {
          await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
        }
        // Race ready with a timeout so it never hangs execution
        serviceWorkerRegistration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]).catch(() => null);
      } catch (_) {}
    }

    const tokenOptions = { vapidKey: VAPID_KEY };
    if (serviceWorkerRegistration) tokenOptions.serviceWorkerRegistration = serviceWorkerRegistration;

    const token = await _fcmMessaging.getToken(tokenOptions).catch(err => {
      console.warn('FCM getToken error:', err?.message);
      return null;
    });
    if (!token) return;

    console.log('📱 FCM token registered:', token.substring(0, 20) + '...');
    await saveFcmToken(token);

    // Handle foreground messages (app is open)
    _fcmMessaging.onMessage((payload) => {
      console.log('📬 Foreground push received:', payload);
      const data = payload.data || {};
      const { title, body } = payload.notification || {};
      if (data.type === 'incoming_call') {
        if (typeof showIncomingCallPrompt === 'function' && data.callId) {
          showIncomingCallPrompt(data.callId, data);
        }
      } else if (title || body) {
        showToast(`🔔 ${body || title}`, 'info');
      }
    });

    // Listen for push-click messages from the service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data?.type === 'PUSH_NOTIFICATION_CLICK' && event.data.matchId) {
          if (typeof openChat === 'function') openChat(event.data.matchId);
        } else if (event.data?.type === 'INCOMING_CALL_CLICK' && event.data.matchId) {
          const { matchId, callId, autoAnswer } = event.data;
          if (typeof openChat === 'function') openChat(matchId);
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
  } catch (err) {
    console.warn('Push notification setup error:', err);
  }
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function saveFcmToken(token) {
  if (!fbAuth?.currentUser || !fbDb) return;
  const uid = fbAuth.currentUser.uid;
  try {
    await fbDb
      .collection('fcm_tokens')
      .doc(uid)
      .collection('tokens')
      .doc(await sha256Hex(token))
      .set({
        token,
        platform: 'web',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
  } catch (e) {
    console.warn('Could not save FCM token:', e);
  }
}

/* ==========================================================
   TYPING INDICATORS
   ========================================================== */

let _typingDebounceTimer = null;
let _typingListener = null;

// Call when the user starts/stops typing
function setTypingStatus(matchId, isTyping) {
  if (!fbDb || !fbAuth?.currentUser) return;
  const uid = fbAuth.currentUser.uid;
  fbDb
    .collection('matches')
    .doc(matchId)
    .collection('meta')
    .doc('typing')
    .set({ [uid]: isTyping }, { merge: true })
    .catch(() => {});
}

// Debounced version — call this on every keypress
function onUserTyping(matchId) {
  setTypingStatus(matchId, true);
  clearTimeout(_typingDebounceTimer);
  _typingDebounceTimer = setTimeout(() => setTypingStatus(matchId, false), 2500);
}

// Subscribe to partner typing status — callback(isTyping: boolean)
function listenToTyping(matchId, partnerUid, callback) {
  if (_typingListener) { _typingListener(); _typingListener = null; }
  if (!fbDb) return;

  _typingListener = fbDb
    .collection('matches')
    .doc(matchId)
    .collection('meta')
    .doc('typing')
    .onSnapshot((snap) => {
      if (!snap.exists) { callback(false); return; }
      const data = snap.data();
      callback(!!data[partnerUid]);
    }, () => {});

  return _typingListener;
}

function stopTypingListener() {
  if (_typingListener) { _typingListener(); _typingListener = null; }
}

/* ==========================================================
   READ RECEIPTS
   ========================================================== */

// Mark all messages in a match as read by the current user
async function markMessagesReadInFirestore(matchId) {
  if (!fbDb || !fbAuth?.currentUser) return;
  const uid = fbAuth.currentUser.uid;
  try {
    const snap = await fbDb
      .collection('matches')
      .doc(matchId)
      .collection('messages')
      .where('sender', '!=', uid)
      .where('read', '==', false)
      .limit(50)
      .get();

    if (snap.empty) return;
    const batch = fbDb.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { read: true }));
    await batch.commit();
  } catch (e) {
    // Non-critical
  }
}

/* ==========================================================
   STORIES BACKEND — Firestore-backed with 24hr expiry
   ========================================================== */

// Upload a story to Firestore
async function uploadStoryToFirestore(storyData) {
  if (!fbDb || !fbAuth?.currentUser) return null;
  const uid = fbAuth.currentUser.uid;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  const docId = storyData.docId || storyData.id || ('story_' + uid + '_' + Date.now());

  try {
    const isVid = Boolean(
      storyData.isVideo ||
      storyData.video ||
      storyData.mediaType === 'video' ||
      (storyData.mediaUrl && storyData.mediaUrl.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i)) ||
      (storyData.image && storyData.image.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i))
    );
    const mediaUrl = storyData.video || storyData.mediaUrl || storyData.image || '';
    if (!mediaUrl || mediaUrl.startsWith('blob:')) {
      console.warn('Cannot upload local blob URL to Firestore stories feed');
      return null;
    }
    // Prevent exceeding Firestore 1MB document limit with large base64 data
    if (mediaUrl.length > 500000 && !mediaUrl.startsWith('http')) {
      console.warn('Media payload too large for Firestore document (>500KB). Must use Cloud Storage HTTPS URL.');
      return null;
    }

    await fbDb.collection('stories').doc(docId).set({
      ownerId: uid,
      ownerName: storyData.name || currentUser?.name || 'You',
      ownerAvatar: storyData.thumb || currentUser?.avatar || currentUser?.image || '',
      mediaUrl: mediaUrl,
      mediaType: isVid ? 'video' : 'image',
      storagePath: storyData.storagePath || '',
      location: storyData.location || currentUser?.location || 'Lagos',
      bio: storyData.bio || '',
      tags: storyData.tags || [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
      viewCount: 0
    });
    console.log('✅ Story uploaded to Firestore:', docId);

    // Automatically purge older story docs for this user so old deleted pictures NEVER linger for other users
    try {
      const snap = await fbDb.collection('stories').where('ownerId', '==', uid).get();
      if (!snap.empty && snap.size > 1) {
        const batch = fbDb.batch();
        let purged = 0;
        snap.forEach(d => {
          if (d.id !== docId) {
            batch.delete(d.ref);
            purged++;
          }
        });
        if (purged > 0) {
          await batch.commit();
          console.log(`Cleaned up ${purged} older story doc(s) from Firestore for user ${uid}`);
        }
      }
    } catch (_) {}

    return docId;
  } catch (e) {
    console.error('Story upload error:', e);
    return null;
  }
}

async function deleteStoryFromFirestore(storyId, storyData = null, deleteAllForUser = false) {
  if (!fbDb || !fbAuth?.currentUser) return false;
  const uid = fbAuth.currentUser.uid;
  try {
    if (storyId) {
      await fbDb.collection('stories').doc(storyId).delete().catch(() => {});
    }
    const snap = await fbDb.collection('stories').where('ownerId', '==', uid).get();
    if (!snap.empty) {
      const batch = fbDb.batch();
      let deleteCount = 0;
      snap.forEach(doc => {
        const d = doc.data() || {};
        const matchesId = doc.id === storyId || (storyData && (doc.id === storyData.id || doc.id === storyData.docId));
        const matchesMedia = storyData && (
          (storyData.image && d.mediaUrl === storyData.image) ||
          (storyData.video && d.mediaUrl === storyData.video) ||
          (storyData.mediaUrl && d.mediaUrl === storyData.mediaUrl)
        );
        const matchesPath = storyData && storyData.storagePath && d.storagePath === storyData.storagePath;
        if (deleteAllForUser || matchesId || matchesMedia || matchesPath || snap.size === 1) {
          batch.delete(doc.ref);
          deleteCount++;
        }
      });
      if (deleteCount > 0) {
        await batch.commit();
        console.log(`✅ Deleted ${deleteCount} story doc(s) from Firestore for user ${uid}`);
      }
    }
    return true;
  } catch (err) {
    console.error("deleteStoryFromFirestore error:", err);
    return false;
  }
}

// Fetch all active (non-expired) stories from Firestore
async function fetchActiveStoriesFromFirestore() {
  if (!fbDb) return [];
  try {
    const snap = await fbDb.collection('stories').limit(60).get();
    const nowMs = Date.now();
    const stories = [];
    snap.forEach(doc => {
      const d = doc.data() || {};
      const exp = d.expiresAt?.toMillis ? d.expiresAt.toMillis() : null;
      if (!exp || exp > nowMs) {
        const isVid = d.mediaType === 'video' || Boolean(d.mediaUrl && d.mediaUrl.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i));
        const userAvatar = d.ownerAvatar || '';
        stories.push({
          id: doc.id,
          ownerId: d.ownerId,
          name: d.ownerName || 'HookMe Member',
          image: d.mediaUrl || d.image || userAvatar,
          video: isVid ? (d.mediaUrl || d.image || '') : '',
          isVideo: isVid,
          thumb: userAvatar || d.thumb || (isVid ? '' : (d.mediaUrl || d.image)) || '',
          location: d.location || 'Lagos',
          bio: d.bio || '',
          tags: d.tags || [],
          createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now(),
          expiresAt: exp
        });
      }
    });
    return stories.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.warn('fetchActiveStories error:', e);
    return [];
  }
}

// Real-time listener for community stories
function listenToCommunityStories(callback) {
  if (!fbDb) return null;
  try {
    return fbDb.collection('stories').limit(60).onSnapshot(snap => {
      const nowMs = Date.now();
      const stories = [];
      snap.forEach(doc => {
        const d = doc.data() || {};
        const exp = d.expiresAt?.toMillis ? d.expiresAt.toMillis() : null;
        if (!exp || exp > nowMs) {
          const isVid = d.mediaType === 'video' || Boolean(d.mediaUrl && d.mediaUrl.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i));
          const userAvatar = d.ownerAvatar || '';
          stories.push({
            id: doc.id,
            ownerId: d.ownerId,
            name: d.ownerName || 'HookMe Member',
            image: d.mediaUrl || d.image || userAvatar,
            video: isVid ? (d.mediaUrl || d.image || '') : '',
            isVideo: isVid,
            thumb: userAvatar || d.thumb || (isVid ? '' : (d.mediaUrl || d.image)) || '',
            location: d.location || 'Lagos',
            bio: d.bio || '',
            tags: d.tags || [],
            createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now(),
            expiresAt: exp
          });
        }
      });
      callback(stories.sort((a, b) => b.createdAt - a.createdAt));
    }, err => {
      console.warn('Community stories listener error:', err.message);
    });
  } catch (e) {
    return null;
  }
}

// Record that the current user viewed a story
async function recordStoryView(storyId) {
  if (!fbDb || !fbAuth?.currentUser) return;
  const uid = fbAuth.currentUser.uid;
  try {
    // Record the viewer
    await fbDb
      .collection('story_views')
      .doc(storyId)
      .collection('viewers')
      .doc(uid)
      .set({ viewedAt: firebase.firestore.FieldValue.serverTimestamp() });

    // Increment view count on the story doc
    await fbDb.collection('stories').doc(storyId).update({
      viewCount: firebase.firestore.FieldValue.increment(1)
    });
  } catch (e) {
    // Non-critical
  }
}

// Get viewers list for a story (for "Seen by X people")
async function fetchStoryViewers(storyId) {
  if (!fbDb) return [];
  try {
    const snap = await fbDb
      .collection('story_views')
      .doc(storyId)
      .collection('viewers')
      .orderBy('viewedAt', 'desc')
      .limit(50)
      .get();
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (e) {
    return [];
  }
}

/* ==========================================================
   MESSAGE REACTIONS
   ========================================================== */

// Add/toggle a reaction emoji on a message
async function reactToMessage(matchId, messageId, emoji) {
  if (!fbDb || !fbAuth?.currentUser) return;
  const uid = fbAuth.currentUser.uid;
  try {
    const msgRef = fbDb
      .collection('matches')
      .doc(matchId)
      .collection('messages')
      .doc(messageId);

    const doc = await msgRef.get();
    if (!doc.exists) return;

    const reactions = doc.data().reactions || {};
    const existingReactors = reactions[emoji] || [];

    let updated;
    if (existingReactors.includes(uid)) {
      // Toggle off
      updated = existingReactors.filter(id => id !== uid);
    } else {
      // Add reaction
      updated = [...existingReactors, uid];
    }

    reactions[emoji] = updated;
    await msgRef.update({ reactions });
  } catch (e) {
    console.warn('reactToMessage error:', e);
  }
}