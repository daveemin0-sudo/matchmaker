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
const PAYSTACK_PUBLIC_KEY = "pk_live_REPLACE_WITH_YOUR_LIVE_PAYSTACK_PUBLIC_KEY";

// 3. YOUR WEBHOOK SERVER URL (Live Render Production Backend)
const BACKEND_URL = "https://matchmaker-viwb.onrender.com";

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
      fbStorage = firebase.storage();
      console.log("🔥 Firebase initialized — project:", firebaseConfig.projectId);
      listenToAuthChanges();
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

// ----------------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------------

async function backendSignUp(email, password, userData) {
  if (!fbAuth) return { success: false, mode: 'local' };
  try {
    const userCredential = await fbAuth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Save profile to Firestore
    await fbDb.collection('users').doc(user.uid).set({
      id: user.uid,
      email: email,
      name: userData.name || 'User',
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
      // Safely access or create currentUser object
      let targetUser = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (window.currentUser || {});
       // The server/Firestore account record is the source of truth for VIP.
       if (typeof appState !== 'undefined') appState.isVip = false;
       if (window.appState) window.appState.isVip = false;

       try {
         if (fbDb) {
           const doc = await fbDb.collection('users').doc(user.uid).get();
           if (doc && doc.exists) {
             const docData = doc.data();
             targetUser = Object.assign({}, targetUser, docData);
             const expiryMs = docData.vipExpiry?.toMillis ? docData.vipExpiry.toMillis() : 0;
             const vipActive = Boolean(docData.isVip && (!expiryMs || expiryMs > Date.now()));
             if (typeof appState !== 'undefined') appState.isVip = vipActive;
             if (window.appState) window.appState.isVip = vipActive;
           }
         }
       } catch (err) {
         // Fail closed when the authoritative profile cannot be read.
         console.warn("Firestore profile read fallback:", err.message);
       }
      
      // Ensure targetUser has at least auth email and uid
      if (user.email) targetUser.email = user.email;
      if (user.uid) targetUser.id = user.uid;
      if (targetUser.image || targetUser.avatar) {
        targetUser.image = targetUser.image || targetUser.avatar;
        targetUser.avatar = targetUser.image;
      }
      
      if (typeof currentUser !== 'undefined') {
        Object.assign(currentUser, targetUser);
      }
      window.currentUser = targetUser;
      if (typeof saveToStorage === 'function') saveToStorage();
       await loadBlockedUsersFromFirestore();
       if (typeof appState !== 'undefined') appState.isLoggedIn = true;
      if (window.appState) window.appState.isLoggedIn = true;
      if (typeof showScreen === 'function') showScreen('discovery');
      if (typeof initMainApp === 'function') initMainApp();
       if (typeof listenForIncomingCalls === 'function') listenForIncomingCalls();
      
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
    const data = await res.json();
    if (!res.ok || !data.success) {
      if (data?.error) showToast(data.error, data.limited ? 'gold' : 'error');
      return { success: false, matched: false, limited: Boolean(data?.limited), error: data?.error || 'Could not record swipe.' };
    }
    return { success: true, matched: Boolean(data.matched), matchId: data.matchId || null };
  } catch (err) {
    console.warn("recordSwipeInBackend warning:", err.message);
    showToast('Could not save your swipe. Please try again.', 'error');
    return { success: false, matched: false, error: 'Network error.' };
  }
}

// Fetch all registered users from Firestore for the swipe card stack
async function fetchRealUsersFromFirestore() {
  if (!fbDb || !fbAuth?.currentUser) return [];
  const currentUserId = fbAuth.currentUser.uid;

  try {
    let snapshot = await fbDb.collection('users').get().catch(() => null);
    if (!snapshot || snapshot.empty) {
      snapshot = await fbDb.collection('public_profiles').get().catch(() => null);
    }
    if (!snapshot) return [];

    const users = [];
    snapshot.forEach(doc => {
      if (doc.id !== currentUserId && !(window.__blockedUserIds || new Set()).has(doc.id)) {
        const data = doc.data();
        const userPhoto = data.image || data.avatar || '';
        // Only show users who have uploaded their own real profile picture
        if (!userPhoto) return;

        users.push({
          id: doc.id,
          name: data.displayName || data.name || 'User',
          age: data.age || 24,
          bio: data.bio || 'New on hookmebysam! Swipe right to chat.',
          gender: data.gender || 'Female',
          image: userPhoto,
          tags: data.interests || ['Music 🎵', 'Vibes ✨'],
          distance: '2 km',
          mutualChance: true,
          isRealUser: true
        });
      }
    });
    return users;
  } catch (err) {
    console.warn("Error fetching Firestore users:", err.message);
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
    let snapshot = await fbDb.collection('users').get().catch(() => null);
    if (!snapshot || snapshot.empty) {
      snapshot = await fbDb.collection('public_profiles').get().catch(() => null);
    }
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

// Real-time listener for user's matches
function listenToUserMatches(callback) {
  if (!fbDb || !fbAuth?.currentUser) return null;
  const currentUserId = fbAuth.currentUser.uid;

  try {
    return fbDb.collection('matches')
      .where('users', 'array-contains', currentUserId)
      .onSnapshot(async (snapshot) => {
        const matchedProfiles = [];
        for (const doc of snapshot.docs) {
          const matchData = doc.data();
          const partnerId = matchData.users.find(id => id !== currentUserId);
          if (partnerId && !(window.__blockedUserIds || new Set()).has(partnerId)) {
            try {
              let userDoc = await fbDb.collection('users').doc(partnerId).get().catch(() => null);
              if (!userDoc || !userDoc.exists) {
                userDoc = await fbDb.collection('public_profiles').doc(partnerId).get().catch(() => null);
              }
              if (userDoc && userDoc.exists) {
                const data = userDoc.data();
                matchedProfiles.push({
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
                });
              }
            } catch (e) {
              console.warn("Error loading match profile:", e);
            }
          }
        }
        // Sort matches by latest updated descending so new messages immediately go to the top
        matchedProfiles.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
        callback(matchedProfiles);
      }, (error) => {
        console.warn("Firestore matches listener offline/disabled:", error.message);
      });
  } catch (err) {
    console.warn("listenToUserMatches failed:", err.message);
    return null;
  }
}

// One-shot direct fetch of user matches (ideal for pull-to-refresh & app resume)
async function fetchUserMatchesDirectly() {
  if (!fbDb || !fbAuth?.currentUser) return [];
  const currentUserId = fbAuth.currentUser.uid;
  try {
    const snapshot = await fbDb.collection('matches')
      .where('users', 'array-contains', currentUserId)
      .get();
    const matchedProfiles = [];
    for (const doc of snapshot.docs) {
      const matchData = doc.data();
      const partnerId = matchData.users.find(id => id !== currentUserId);
      if (partnerId) {
        try {
          let userDoc = await fbDb.collection('users').doc(partnerId).get().catch(() => null);
          if (!userDoc || !userDoc.exists) {
            userDoc = await fbDb.collection('public_profiles').doc(partnerId).get().catch(() => null);
          }
          if (userDoc && userDoc.exists) {
            const data = userDoc.data();
            matchedProfiles.push({
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
            });
          }
        } catch (e) {
          console.warn("Error loading match profile directly:", e);
        }
      }
    }
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
      .onSnapshot(snapshot => {
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

async function sendRealtimeMessage(matchId, text, isVoice = false, audioUrl = "", imageUrl = "") {
  if (!fbDb || !fbAuth?.currentUser) return;
  const currentUserId = fbAuth.currentUser.uid;

  try {
    await fbDb.collection('matches').doc(matchId).collection('messages').add({
      sender: currentUserId,
      text: text || "",
      isVoice: isVoice,
      audioUrl: audioUrl,
      imageUrl: imageUrl,
      read: false,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update parent match doc so partner gets instant real-time notification & re-ordering to top
    const previewText = text || (isVoice ? '🎤 Voice note' : (imageUrl ? '📷 Photo' : 'New message'));
    await fbDb.collection('matches').doc(matchId).set({
      lastMessage: previewText,
      lastSender: currentUserId,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("sendRealtimeMessage fallback:", err.message);
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

async function reactRealtimeMessage(matchId, messageId, emoji) {
  if (!fbDb || !fbAuth?.currentUser || !matchId || !messageId || !emoji) return;
  const uid = fbAuth.currentUser.uid;
  const msgRef = fbDb.collection('matches').doc(matchId).collection('messages').doc(messageId);
  try {
    await fbDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(msgRef);
      if (!doc.exists) return;
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
    });
  } catch (err) {
    console.warn("reactRealtimeMessage error:", err.message);
  }
}

// ----------------------------------------------------------
// CLOUD FILE UPLOADS (Profile Photo, Voice Note, Chat Image)
// ----------------------------------------------------------

async function uploadFileToBackend(file, path, returnMetadata = false) {
  if (!fbStorage) return null;
  try {
    const allowedRoots = new Set(['stories', 'voicenotes']);
    if (!allowedRoots.has(path) || !fbAuth?.currentUser) return null;
    const uid = fbAuth.currentUser.uid;
    const safeName = String(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const storageRef = fbStorage.ref(`${path}/${uid}/${Date.now()}_${safeName}`);
    const snapshot = await storageRef.put(file);
    const downloadUrl = await snapshot.ref.getDownloadURL();
    return returnMetadata ? { url: downloadUrl, storagePath: snapshot.ref.fullPath } : downloadUrl;
  } catch (err) {
    console.warn("uploadFileToBackend warning:", err.message);
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
  const customerEmail = fbAuth.currentUser.email || window.currentUser?.email || '';
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

async function sendOtpToPhone(phoneNumber) {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber })
    });
    const data = await res.json();
    if (data.success) {
      showToast('📱 OTP sent! Check your SMS.', 'info');
      return true;
    } else {
      showToast(data.error || 'Failed to send OTP.', 'error');
      return false;
    }
  } catch (err) {
    showToast('Offline — cannot send OTP right now.', 'error');
    return false;
  }
}

async function verifyOtp(phoneNumber, otpCode) {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber, otp: otpCode })
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
    showToast('Offline — cannot verify right now.', 'error');
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
  try {
    const headers = await getBackendAuthHeaders();
    const res = await fetch(BACKEND_URL + '/auth/verify-phone', {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: phoneNumber, otp: otpCode })
    });
    const data = await res.json();
    if (data.success) {
      return { success: true };
    }
    showToast(data.error || 'Wrong OTP. Try again.', 'error');
    return { success: false, error: data.error };
  } catch (err) {
    showToast('Offline — cannot verify right now.', 'error');
    return { success: false };
  }
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
  // Only works in production (HTTPS) or with a real Firebase project
  if (!fbApp || typeof firebase === 'undefined' || !firebase.messaging) return;

  try {
    _fcmMessaging = firebase.messaging();

    // Request permission (browser will show the OS permission dialog)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('Push notification permission denied.');
      return;
    }

    // Your VAPID key — Firebase Console → Project Settings → Cloud Messaging → Web configuration
    const VAPID_KEY = 'BLp3qjWUxvFZkjtXaP7Xs4o4Oidsgz2segUhkRBeJWCWnYS283ds9P0c2Ao86eqxSjSZvGphASeN5Y6Ty7bC3h8';

    let serviceWorkerRegistration;
    if ('serviceWorker' in navigator) {
      serviceWorkerRegistration = await navigator.serviceWorker.ready;
    }
    const token = await _fcmMessaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration
    });
    if (!token) return;

    console.log('📱 FCM token registered:', token.substring(0, 20) + '...');
    await saveFcmToken(token);

    // Handle foreground messages (app is open)
    _fcmMessaging.onMessage((payload) => {
      console.log('📬 Foreground push received:', payload);
      const { title, body } = payload.notification || {};
      if (title || body) {
        showToast(`🔔 ${body || title}`, 'info');
      }
    });

    // Listen for push-click messages from the service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PUSH_NOTIFICATION_CLICK' && event.data.matchId) {
          if (typeof openChat === 'function') openChat(event.data.matchId);
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

  try {
    const docRef = await fbDb.collection('stories').add({
      ownerId: uid,
      ownerName: storyData.name || currentUser?.name || 'You',
      ownerAvatar: storyData.thumb || currentUser?.avatar || '',
      mediaUrl: storyData.image,
      mediaType: 'image',
       storagePath: storyData.storagePath || '',
      location: storyData.location || currentUser?.location || 'Lagos',
      bio: storyData.bio || '',
      tags: storyData.tags || [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
      viewCount: 0
    });
    console.log('✅ Story uploaded to Firestore:', docRef.id);
    return docRef.id;
  } catch (e) {
    console.warn('Story upload error:', e);
    return null;
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
        stories.push({
          id: doc.id,
          ownerId: d.ownerId,
          name: d.ownerName || 'HookMe Member',
          image: d.mediaUrl || d.image,
          thumb: d.ownerAvatar || d.thumb || d.mediaUrl || d.image,
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
          stories.push({
            id: doc.id,
            ownerId: d.ownerId,
            name: d.ownerName || 'HookMe Member',
            image: d.mediaUrl || d.image,
            thumb: d.ownerAvatar || d.thumb || d.mediaUrl || d.image,
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