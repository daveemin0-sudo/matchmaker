/* ==========================================================
   hookmebysam — webhook-server
   Bridges phone OTP (Termii) to Firebase Auth.
   The frontend already expects exactly these two endpoints —
   see firebase-config.js's sendOtpToPhone() / verifyOtp().
   ========================================================== */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// ---------- Config ----------
const PORT = process.env.PORT || 3001;
const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'N-Alert';
const TERMII_BASE_URL = 'https://api.ng.termii.com/api';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

if (!TERMII_API_KEY) {
  console.error('❌ TERMII_API_KEY is missing. Get one from https://app.termii.com and add it to .env — see README.md.');
  process.exit(1);
}
if (!PAYSTACK_SECRET_KEY) {
  console.error('❌ PAYSTACK_SECRET_KEY is missing. Get it from https://dashboard.paystack.com/#/settings/developer and add it to .env — see README.md.');
  process.exit(1);
}

// ---------- Firebase Admin init ----------
// This needs a SERVICE ACCOUNT key (server secret), not the public web
// apiKey from firebase-config.js. Firebase Console → ⚙️ Project Settings
// → Service accounts → Generate new private key. See README.md.
let serviceAccount;
try {
  const raw = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '', 'base64').toString('utf8');
  serviceAccount = JSON.parse(raw);
  if (!serviceAccount.project_id) throw new Error('missing project_id');
} catch (e) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_BASE64 is missing or invalid. See README.md for how to generate it.');
  process.exit(1);
}
try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  console.error('❌ Could not initialize Firebase Admin — the service account key looks malformed:', e.message);
  console.error('   Re-download the key from Firebase Console and re-encode it (see README.md, step 2).');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!ALLOWED_ORIGINS.length) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app') || origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
    return callback(null, true);
  },
  credentials: true
}));

// ---------- In-memory stores ----------
// Fine for a single server instance (Render/Railway free tier is one
// instance). If you ever scale to multiple instances, move these to
// Redis or Firestore so all instances share the same state.
const pendingOtps = new Map();     // phone -> { pinId, expiresAt }
const sendAttempts = new Map();    // phone -> [timestamps]
const verifyAttempts = new Map();  // phone -> [timestamps]
const usedPaymentRefs = new Set(); // paystack reference -> already redeemed
const paymentAttempts = new Map(); // uid -> [timestamps]
const discoveryAttempts = new Map(); // uid -> [timestamps]
const profileSyncAttempts = new Map();
const reportAttempts = new Map();
const blockAttempts = new Map(); // uid -> [timestamps]

// Mirrors the tierPrices map in script.js's simulatePurchase(). Kept here
// too so a tampered "amount paid" can never be trusted from the client —
// the server checks what Paystack actually confirms was charged against
// this fixed list, not against anything the browser sends.
const VIP_TIER_PRICES_NGN = { 1: 2500, 2: 7500, 3: 25000 };

function normalizePhone(phone) {
  // Normalizes common Nigerian formats (080..., 0801234567, 234801...,
  // +234801...) to Termii's expected "234XXXXXXXXXX" format (no +).
  let p = String(phone || '').replace(/[^\d]/g, '');
  if (p.startsWith('0')) p = '234' + p.slice(1);
  if (!p.startsWith('234')) p = '234' + p;
  return p;
}

function isRateLimited(store, key, maxAttempts, windowMs) {
  const now = Date.now();
  const attempts = (store.get(key) || []).filter((t) => now - t < windowMs);
  attempts.push(now);
  store.set(key, attempts);
  return attempts.length > maxAttempts;
}

// Clear out anything that's simply expired, every 5 min, so the Maps
// above don't grow forever on a long-running instance.
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of pendingOtps) {
    if (now > entry.expiresAt) pendingOtps.delete(phone);
  }
}, 5 * 60 * 1000);

// ---------- Health check (Render/Railway ping this to know you're alive) ----------
app.get('/health', (req, res) => res.json({ ok: true }));

// ---------- Send OTP ----------
app.post('/auth/send-otp', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phone || phone.length < 12) {
    return res.status(400).json({ success: false, error: 'Enter a valid phone number.' });
  }

  if (isRateLimited(sendAttempts, phone, 3, 10 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many attempts. Try again in a few minutes.' });
  }

  try {
    const termiiRes = await fetch(`${TERMII_BASE_URL}/sms/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TERMII_API_KEY,
        message_type: 'NUMERIC',
        to: phone,
        from: TERMII_SENDER_ID,
        channel: 'generic',
        pin_attempts: 3,
        pin_time_to_live: 10,
        pin_length: 4,
        pin_placeholder: '< 1234 >',
        message_text: 'Your hookmebysam verification code is < 1234 >. It expires in 10 minutes.',
        pin_type: 'NUMERIC',
      }),
    });
    const data = await termiiRes.json();

    if (!termiiRes.ok || !data.pinId) {
      console.error('Termii send-otp error:', data);
      return res.status(502).json({ success: false, error: 'Could not send SMS right now. Try again shortly.' });
    }

    pendingOtps.set(phone, { pinId: data.pinId, expiresAt: Date.now() + 10 * 60 * 1000 });
    return res.json({ success: true });
  } catch (err) {
    console.error('send-otp error:', err);
    return res.status(500).json({ success: false, error: 'Server error sending OTP.' });
  }
});

// ---------- Verify OTP ----------
app.post('/auth/verify-otp', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const otp = String(req.body.otp || '').trim();

  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: 'Phone and code are required.' });
  }

  if (isRateLimited(verifyAttempts, phone, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many attempts. Request a new code.' });
  }

  const pending = pendingOtps.get(phone);
  if (!pending || Date.now() > pending.expiresAt) {
    return res.status(400).json({ success: false, error: 'Code expired. Request a new one.' });
  }

  try {
    const termiiRes = await fetch(`${TERMII_BASE_URL}/sms/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TERMII_API_KEY,
        pin_id: pending.pinId,
        pin: otp,
      }),
    });
    const data = await termiiRes.json();

    if (!termiiRes.ok || String(data.verified) !== 'true') {
      return res.status(400).json({ success: false, error: 'Wrong code. Try again.' });
    }

    pendingOtps.delete(phone);

    // Find (or create) the Firebase user tied to this phone number, then
    // mint a custom token — this is what the client signs in with via
    // fbAuth.signInWithCustomToken(data.token).
    const e164Phone = '+' + phone;
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByPhoneNumber(e164Phone);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({ phoneNumber: e164Phone });
      } else {
        throw e;
      }
    }

    const token = await admin.auth().createCustomToken(userRecord.uid);
    return res.json({ success: true, token, uid: userRecord.uid });
  } catch (err) {
    console.error('verify-otp error:', err);
    return res.status(500).json({ success: false, error: 'Server error verifying code.' });
  }
});

// ---------- Auth middleware ----------
async function requireAuth(req, res, next) {
  try {
    const header = String(req.headers.authorization || '');
    if (!header.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Authentication required.' });
    const token = header.slice(7).trim();
    req.user = await admin.auth().verifyIdToken(token);
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
  }
}

// ---------- Sync safe public profile ----------
app.post('/profiles/sync', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const ref = admin.firestore().collection('users').doc(uid);
    let snap = await ref.get();
    if (!snap.exists) {
      // Check if user previously registered under another UID with the same verified email
      const userEmail = req.user.email ? req.user.email.toLowerCase() : '';
      if (userEmail) {
        const querySnap = await admin.firestore().collection('users')
          .where('email', '==', userEmail)
          .limit(1)
          .get();
        if (!querySnap.empty && querySnap.docs[0].id !== uid) {
          const oldData = querySnap.docs[0].data();
          const migratedData = {
            ...oldData,
            id: uid,
            email: userEmail,
            authProvider: 'google',
            linkedPreviousUid: querySnap.docs[0].id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          await ref.set(migratedData, { merge: true });
          snap = await ref.get();
          console.log(`Migrated user profile for ${userEmail} from ${querySnap.docs[0].id} to ${uid}`);
        }
      }
    }
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Profile not found.' });
    const d = snap.data() || {};
    const age = Number(d.age);
    if (!Number.isFinite(age) || age < 18 || age > 100) {
      return res.status(400).json({ success: false, error: 'An adult profile age (18+) is required.' });
    }
    const city = String(d.city || '').trim().slice(0, 80);
    const publicProfile = {
      id: uid,
      displayName: String(d.displayName || d.name || 'User').slice(0, 80),
      age: Math.floor(age),
      gender: String(d.gender || '').slice(0, 40),
      bio: String(d.bio || '').slice(0, 1000),
      interests: Array.isArray(d.interests) ? d.interests.slice(0, 30).map(v => String(v).slice(0, 40)) : [],
      image: String(d.image || d.avatar || ''),
      photos: Array.isArray(d.photos) && d.photos.length > 0 ? d.photos.slice(0, 6) : (d.image ? [d.image] : []),
      ...(city ? { city } : {}),
      active: d.accountStatus !== 'suspended' && !d.deletedAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await admin.firestore().collection('public_profiles').doc(uid).set(publicProfile, { merge: true });
    return res.json({ success: true });
  } catch (err) {
    console.error('profile sync error:', err);
    return res.status(500).json({ success: false, error: 'Could not sync profile.' });
  }
});

// Lightweight abuse protection. Production deployments should back this with a shared store.
const swipeAttempts = new Map();

// ---------- Discovery feed ----------
app.get('/discovery', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (isRateLimited(discoveryAttempts, uid, 30, 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'Too many discovery requests. Please slow down.' });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 60);
    const db = admin.firestore();

    const [blockedSnap, swipesSnap, profilesSnap, userDoc] = await Promise.all([
      db.collection('blocks').where('blockedBy', '==', uid).get(),
      db.collection('swipes').where('fromUserId', '==', uid).get(),
      db.collection('public_profiles').where('active', '==', true).limit(200).get(),
      db.collection('users').doc(uid).get()
    ]);

    const excluded = new Set([uid]);
    blockedSnap.forEach(d => {
      const data = d.data() || {};
      if (data.blockedUserId) excluded.add(String(data.blockedUserId));
    });
    swipesSnap.forEach(d => {
      const data = d.data() || {};
      if (data.toUserId) excluded.add(String(data.toUserId));
    });

    const users = [];
    profilesSnap.forEach(doc => {
      if (users.length >= limit || excluded.has(doc.id)) return;
      const d = doc.data() || {};
      if (!d.image || Number(d.age) < 18) return;
      const userPhotos = Array.isArray(d.photos) && d.photos.length > 0 ? d.photos : (d.image ? [d.image] : []);
      users.push({
        id: doc.id,
        name: d.displayName || 'User',
        age: Number(d.age),
        bio: d.bio || '',
        gender: d.gender || '',
        image: d.image,
        photos: userPhotos,
        tags: Array.isArray(d.interests) ? d.interests : [],
        city: d.city || '',
        isRealUser: true
      });
    });

    const userData = userDoc.exists ? (userDoc.data() || {}) : {};
    const isVip = !!userData.isVip;
    const today = new Date().toISOString().slice(0, 10);
    const DAILY_LIMIT = 50;
    let swipesRemaining = 999;
    if (!isVip) {
      const usedToday = (userData.lastSwipeDate === today) ? Number(userData.swipesToday || 0) : 0;
      swipesRemaining = Math.max(0, DAILY_LIMIT - usedToday);
    }

    return res.json({ success: true, users, isVip, swipesRemaining });
  } catch (err) {
    console.error('discovery error:', err);
    return res.status(500).json({ success: false, error: 'Could not load discovery.' });
  }
});

// ---------- Record swipe + atomically create match ----------
app.post('/swipes/record', requireAuth, async (req, res) => {
  const uid = req.user.uid;
  if (isRateLimited(swipeAttempts, uid, 180, 10 * 60 * 1000)) {
    return res.status(429).json({ success: false, limited: true, error: 'Too many swipes. Please slow down and try again shortly.' });
  }
  const targetUserId = String(req.body.targetUserId || '').trim();
  const action = String(req.body.action || '').trim().toLowerCase();
  const allowed = new Set(['like', 'pass', 'superlike']);
  if (!targetUserId || targetUserId === uid || !allowed.has(action)) {
    return res.status(400).json({ success: false, error: 'Invalid swipe.' });
  }

  const DAILY_FREE_SWIPES = 50;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const targetRef = db.collection('users').doc(targetUserId);
    const swipeRef = db.collection('swipes').doc(uid + '_' + targetUserId);
    const reverseRef = db.collection('swipes').doc(targetUserId + '_' + uid);
    const matchRef = db.collection('matches').doc([uid, targetUserId].sort().join('_'));

    const result = await db.runTransaction(async tx => {
      const [userSnap, targetSnap, reverseSnap, matchSnap] = await Promise.all([
        tx.get(userRef), tx.get(targetRef), tx.get(reverseRef), tx.get(matchRef)
      ]);
      if (!targetSnap.exists) throw Object.assign(new Error('User not found.'), { code: 'TARGET_NOT_FOUND' });
      const target = targetSnap.data() || {};
      if (target.accountStatus === 'suspended' || target.deletedAt) {
        throw Object.assign(new Error('User unavailable.'), { code: 'TARGET_UNAVAILABLE' });
      }

      const userData = userSnap.exists ? (userSnap.data() || {}) : {};
      const isVip = !!userData.isVip;
      let swipesRemaining = 999;

      if (!isVip) {
        const usedToday = (userData.lastSwipeDate === today) ? Number(userData.swipesToday || 0) : 0;
        if (usedToday >= DAILY_FREE_SWIPES) {
          throw Object.assign(
            new Error("You've reached your daily free swipe limit! Upgrade to VIP for unlimited swipes."),
            { code: 'SWIPE_LIMIT_REACHED' }
          );
        }
        const newUsed = usedToday + 1;
        swipesRemaining = Math.max(0, DAILY_FREE_SWIPES - newUsed);
        tx.set(userRef, { lastSwipeDate: today, swipesToday: newUsed }, { merge: true });
      }

      tx.set(swipeRef, {
        fromUserId: uid,
        toUserId: targetUserId,
        action,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      let matched = false;
      let matchId = matchRef.id;
      if ((action === 'like' || action === 'superlike') && reverseSnap.exists) {
        const reverse = reverseSnap.data() || {};
        matched = reverse.fromUserId === targetUserId && ['like', 'superlike'].includes(reverse.action);
        if (matched && !matchSnap.exists) {
          tx.create(matchRef, {
            users: [uid, targetUserId].sort(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
          });
        }
      }
      return { matched, matchId: matched ? matchId : null, swipesRemaining };
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    if (err.code === 'SWIPE_LIMIT_REACHED') {
      return res.status(429).json({ success: false, limited: true, error: err.message, swipesRemaining: 0 });
    }
    if (err.code === 'TARGET_NOT_FOUND' || err.code === 'TARGET_UNAVAILABLE') {
      return res.status(404).json({ success: false, error: err.message });
    }
    console.error('swipe record error:', err);
    return res.status(500).json({ success: false, error: 'Could not save your swipe.' });
  }
});

// ---------- Trust & safety: reports / blocks ----------
const REPORT_REASONS = new Set(['fake','harassment','scam','sexual','underage','violence','other']);

app.post('/reports', requireAuth, async (req, res) => {
  const reporterId = req.user.uid;
  const reportedUserId = String(req.body.reportedUserId || '').trim();
  const reason = String(req.body.reason || 'other').trim().toLowerCase();
  const details = String(req.body.details || '').trim().slice(0, 2000);
  if (!reportedUserId || reportedUserId === reporterId || !REPORT_REASONS.has(reason)) {
    return res.status(400).json({ success: false, error: 'Invalid report.' });
  }
  if (isRateLimited(reportAttempts, reporterId, 10, 60 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many reports. Please try again later.' });
  }
  try {
    const db = admin.firestore();
    const target = await db.collection('users').doc(reportedUserId).get();
    if (!target.exists) return res.status(404).json({ success: false, error: 'User not found.' });
    const reportRef = db.collection('reports').doc();
    await reportRef.set({ reporterId, reportedUserId, reason, ...(details ? { details } : {}), status: 'open', createdAt: admin.firestore.FieldValue.serverTimestamp() });
    const blockRef = db.collection('blocks').doc(reporterId + '_' + reportedUserId);
    await blockRef.set({ blockedBy: reporterId, blockedUserId: reportedUserId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.json({ success: true, reportId: reportRef.id, blocked: true });
  } catch (err) {
    console.error('report error:', err);
    return res.status(500).json({ success: false, error: 'Could not submit the report.' });
  }
});

app.post('/blocks', requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const blockedUserId = String(req.body.blockedUserId || '').trim();
  if (!blockedUserId || blockedUserId === uid) return res.status(400).json({ success: false, error: 'Invalid block.' });
  if (isRateLimited(blockAttempts, uid, 30, 10 * 60 * 1000)) return res.status(429).json({ success: false, error: 'Too many block requests.' });
  try {
    const db = admin.firestore();
    const target = await db.collection('users').doc(blockedUserId).get();
    if (!target.exists) return res.status(404).json({ success: false, error: 'User not found.' });
    await db.collection('blocks').doc(uid + '_' + blockedUserId).set({ blockedBy: uid, blockedUserId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    const matchId = [uid, blockedUserId].sort().join('_');
    await db.collection('matches').doc(matchId).delete().catch(() => {});
    await db.collection('swipes').doc(uid + '_' + blockedUserId).set({
      fromUserId: uid,
      toUserId: blockedUserId,
      action: 'pass',
      blocked: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
    return res.json({ success: true });
  } catch (err) {
    console.error('block error:', err);
    return res.status(500).json({ success: false, error: 'Could not block this user.' });
  }
});

app.delete('/blocks/:blockedUserId', requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const blockedUserId = String(req.params.blockedUserId || '').trim();
  if (!blockedUserId || blockedUserId === uid) return res.status(400).json({ success: false, error: 'Invalid unblock.' });
  try {
    await admin.firestore().collection('blocks').doc(uid + '_' + blockedUserId).delete();
    return res.json({ success: true });
  } catch (err) {
    console.error('unblock error:', err);
    return res.status(500).json({ success: false, error: 'Could not unblock this user.' });
  }
});

// ---------- Verify Payment (Paystack) ----------
// The client already got a "success" callback from the Paystack popup —
// that alone proves nothing, since it's just JS running in the user's own
// browser. This is the step that actually matters: ask Paystack directly,
// server-to-server with the secret key, whether that reference really was
// paid, for how much, and make sure it hasn't been redeemed before.
app.post('/payment/verify', requireAuth, async (req, res) => {
  const { reference, tier } = req.body;
  const uid = req.user.uid;

  if (!reference || !VIP_TIER_PRICES_NGN[tier]) {
    return res.status(400).json({ success: false, error: 'Missing or invalid reference, uid, or tier.' });
  }

  if (isRateLimited(paymentAttempts, uid, 10, 10 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many attempts. Try again shortly.' });
  }

  if (usedPaymentRefs.has(reference)) {
    return res.status(409).json({ success: false, error: 'This payment has already been redeemed.' });
  }

  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const data = await verifyRes.json();

    if (!verifyRes.ok || !data.status || data.data?.status !== 'success') {
      return res.status(400).json({ success: false, error: 'Payment was not successful.' });
    }

    const expectedKobo = VIP_TIER_PRICES_NGN[tier] * 100;
    if (data.data.amount !== expectedKobo) {
      // Amount paid doesn't match the plan's real price — reject rather
      // than trust it. Could be a stale reference reused against a
      // different (cheaper) plan.
      console.error(`Amount mismatch for ${reference}: expected ${expectedKobo}, got ${data.data.amount}`);
      return res.status(400).json({ success: false, error: 'Payment amount does not match the selected plan.' });
    }

    usedPaymentRefs.add(reference);

    // Grant VIP via the Admin SDK, which bypasses Firestore security rules.
    // The client's own write access is deliberately NOT allowed to touch
    // isVip (see the updated Firestore rules) — this endpoint is the only
    // path that can grant it, and only after a verified payment.
    await admin.firestore().collection('users').doc(uid).set({
      isVip: true,
      vipTier: Number(tier),
      vipActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({ success: true });
  } catch (err) {
    console.error('payment verify error:', err);
    return res.status(500).json({ success: false, error: 'Server error verifying payment.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ hookmebysam webhook-server listening on port ${PORT}`);
});