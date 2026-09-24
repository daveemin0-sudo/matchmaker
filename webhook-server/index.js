/* hookmebysam production backend: Paystack, Termii OTP, FCM and TURN. */
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URL = process.env.FRONTEND_URL || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || FRONTEND_URL)
  .split(',').map(v => v.trim()).filter(Boolean);

const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'N-Alert';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const CLEANUP_SECRET = process.env.CLEANUP_SECRET;
const METERED_API_KEY = process.env.METERED_API_KEY;
const METERED_DOMAIN = process.env.METERED_DOMAIN || 'hookmebysam.metered.live';

if (!TERMII_API_KEY || !PAYSTACK_SECRET_KEY || !CLEANUP_SECRET) {
  throw new Error('Missing required production secrets: TERMII_API_KEY, PAYSTACK_SECRET_KEY and CLEANUP_SECRET');
}
if (!METERED_API_KEY || !METERED_DOMAIN) {
  console.warn('METERED_API_KEY/METERED_DOMAIN not configured; /turn/credentials will return 503.');
}

let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    try { serviceAccount = require('./serviceAccountKey.json'); } catch (_) {}
  }
} catch (err) {
  throw new Error('Invalid Firebase service account credentials: ' + err.message);
}
if (!serviceAccount) {
  throw new Error('Firebase Admin credentials are required in production.');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_PROJECT_ID
    ? `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    : undefined
});
const db = admin.firestore();

app.disable('x-powered-by');
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); }
}));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Cleanup-Secret');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const rateBuckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const old = (rateBuckets.get(key) || []).filter(t => now - t < windowMs);
  old.push(now);
  rateBuckets.set(key, old);
  return old.length <= max;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, values] of rateBuckets) {
    const kept = values.filter(t => now - t < 15 * 60 * 1000);
    if (kept.length) rateBuckets.set(key, kept); else rateBuckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.user = await admin.auth().verifyIdToken(header.slice(7));
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

function normalizeNigerianPhone(phone) {
  let p = String(phone || '').trim().replace(/[\s()-]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('0')) p = '+234' + p.slice(1);
  else if (p.startsWith('234')) p = '+' + p;
  else if (!p.startsWith('+')) p = '+234' + p;
  if (!/^\+234\d{10}$/.test(p)) throw new Error('Invalid Nigerian phone number.');
  return p;
}

const VIP_PLANS = {
  1: { name: '1 Week VIP Gold', amount: 2500, days: 7 },
  2: { name: '1 Month VIP Gold', amount: 7500, months: 1 },
  3: { name: 'Lifetime VIP Gold', amount: 25000, lifetime: true }
};

function expiryForTier(tier) {
  const plan = VIP_PLANS[Number(tier)];
  if (!plan) throw new Error('Invalid VIP tier.');
  if (plan.lifetime) return new Date('2099-12-31T23:59:59.999Z');
  const date = new Date();
  if (plan.days) date.setUTCDate(date.getUTCDate() + plan.days);
  if (plan.months) date.setUTCMonth(date.getUTCMonth() + plan.months);
  return date;
}

async function verifyPaystackReference(reference) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
  });
  const data = await response.json();
  if (!response.ok || !data.status || data.data?.status !== 'success') {
    throw new Error(data.message || 'Payment not verified.');
  }
  return data.data;
}

async function grantVip({ reference, uid, tier, payment }) {
  const plan = VIP_PLANS[Number(tier)];
  if (!plan) throw new Error('Invalid VIP tier.');
  if (Number(payment.amount) !== plan.amount * 100) {
    throw new Error('Payment amount does not match the selected VIP plan.');
  }

  const ref = db.collection('paystack_transactions').doc(String(reference));
  const result = await db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists) return false;
    const userRef = db.collection('users').doc(uid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error('User account not found.');
    tx.set(ref, {
      reference: String(reference),
      uid,
      tier: Number(tier),
      amount: Number(payment.amount),
      currency: payment.currency || 'NGN',
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    tx.set(userRef, {
      isVip: true,
      vipTier: Number(tier),
      vipPlan: plan.name,
      vipExpiry: admin.firestore.Timestamp.fromDate(expiryForTier(tier)),
      vipActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paystackReference: String(reference),
      paystackEmail: payment.customer?.email || ''
    }, { merge: true });
    return true;
  });
  return result;
}

/* Paystack webhook: verify raw signature, then verify transaction server-to-server. */
app.post('/webhook/paystack', async (req, res) => {
  try {
    const signature = String(req.headers['x-paystack-signature'] || '');
    const expected = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(req.rawBody || Buffer.from(''))
      .digest('hex');
    if (!signature || signature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (req.body?.event !== 'charge.success') return res.status(200).json({ received: true });

    const reference = req.body.data?.reference;
    const metadata = req.body.data?.metadata?.custom_fields || [];
    const userId = metadata.find(f => f.variable_name === 'user_id')?.value;
    const planName = metadata.find(f => f.variable_name === 'plan_name')?.value;
    const tier = Object.entries(VIP_PLANS).find(([, p]) => p.name === planName)?.[0];

    if (!reference || !userId || !tier) return res.status(200).json({ received: true });

    const payment = await verifyPaystackReference(reference);
    await grantVip({ reference, uid: String(userId), tier: Number(tier), payment });
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Paystack webhook error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

/* Authenticated direct payment verification. Never trusts uid/amount from the browser. */
app.post('/payment/verify', requireAuth, async (req, res) => {
  const { reference, tier } = req.body || {};
  if (!reference || !VIP_PLANS[Number(tier)]) {
    return res.status(400).json({ success: false, error: 'Reference and valid tier are required.' });
  }
  if (!rateLimit(`payment:${req.user.uid}`, 10, 10 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many payment verification attempts.' });
  }
  try {
    const payment = await verifyPaystackReference(reference);
    const granted = await grantVip({
      reference,
      uid: req.user.uid,
      tier: Number(tier),
      payment
    });
    return res.json({ success: true, alreadyProcessed: !granted });
  } catch (err) {
    console.error('Payment verification error:', err.message);
    return res.status(400).json({ success: false, error: err.message || 'Payment could not be verified.' });
  }
});

/* Termii OTP — Firestore-backed pending state so verification survives restarts. */
const otpMemoryCache = new Map();

function otpDocId(phone) {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

async function savePendingOtp(phone, pinId, expiresAtMs) {
  const ref = db.collection('otp_requests').doc(otpDocId(phone));
  await ref.set({
    pinId: String(pinId),
    phoneHash: otpDocId(phone),
    expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMs),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  otpMemoryCache.set(phone, { pinId: String(pinId), expiresAt: expiresAtMs });
}

async function loadPendingOtp(phone) {
  const memory = otpMemoryCache.get(phone);
  if (memory && Date.now() <= memory.expiresAt) return { ref: null, ...memory };

  const ref = db.collection('otp_requests').doc(otpDocId(phone));
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data();
  const expiresAt = data.expiresAt?.toMillis?.() || 0;
  if (!data.pinId || Date.now() > expiresAt) {
    await ref.delete().catch(() => {});
    otpMemoryCache.delete(phone);
    return null;
  }
  const pending = { ref, pinId: String(data.pinId), expiresAt };
  otpMemoryCache.set(phone, { pinId: pending.pinId, expiresAt });
  return pending;
}

async function verifyTermiiOtp(phone, otp) {
  const pending = await loadPendingOtp(phone);
  if (!pending) return { ok: false, error: 'Code expired. Request a new one.' };

  const response = await fetch('https://api.ng.termii.com/api/sms/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: TERMII_API_KEY, pin_id: pending.pinId, pin: otp })
  });
  const data = await response.json();
  const verified = response.ok &&
    (data.verified === true || data.verified === 'True' || data.verified === 'true');

  if (!verified) return { ok: false, error: 'Incorrect verification code.' };

  if (pending.ref) await pending.ref.delete().catch(() => {});
  else await db.collection('otp_requests').doc(otpDocId(phone)).delete().catch(() => {});
  otpMemoryCache.delete(phone);
  return { ok: true };
}

app.post('/auth/send-otp', async (req, res) => {
  let phone;
  try { phone = normalizeNigerianPhone(req.body?.phone); }
  catch (_) { return res.status(400).json({ success: false, error: 'Enter a valid Nigerian phone number.' }); }

  if (!rateLimit(`otp-send:${phone}`, 3, 10 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many OTP requests. Try again later.' });
  }

  try {
    const response = await fetch('https://api.ng.termii.com/api/sms/otp/send', {
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
        pin_length: 6,
        pin_placeholder: '< 123456 >',
        message_text: 'Your hookmebysam verification code is < 123456 >. It expires in 10 minutes. Do not share it.',
        pin_type: 'NUMERIC'
      })
    });
    const data = await response.json();
    if (!response.ok || !data.pinId) {
      return res.status(502).json({ success: false, error: 'Could not send SMS right now. Try again shortly.' });
    }
    await savePendingOtp(phone, data.pinId, Date.now() + 10 * 60 * 1000);
    return res.json({ success: true, message: 'OTP sent. Check your SMS.' });
  } catch (err) {
    console.error('OTP send error:', err.message);
    return res.status(502).json({ success: false, error: 'SMS service is temporarily unavailable.' });
  }
});

app.post('/auth/verify-otp', async (req, res) => {
  let phone;
  try { phone = normalizeNigerianPhone(req.body?.phone); }
  catch (_) { return res.status(400).json({ success: false, error: 'Invalid phone number.' }); }
  const otp = String(req.body?.otp || '').trim();
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, error: 'Enter the 6-digit code.' });
  if (!rateLimit(`otp-verify:${phone}`, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many verification attempts.' });
  }

  try {
    const result = await verifyTermiiOtp(phone, otp);
    if (!result.ok) return res.status(400).json({ success: false, error: result.error });

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByPhoneNumber(phone);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
      userRecord = await admin.auth().createUser({ phoneNumber: phone });
      await db.collection('users').doc(userRecord.uid).set({
        id: userRecord.uid,
        phone,
        phoneVerified: true,
        isVip: false,
        role: 'user',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    const token = await admin.auth().createCustomToken(userRecord.uid);
    return res.json({ success: true, token, uid: userRecord.uid });
  } catch (err) {
    console.error('OTP verify error:', err.message);
    return res.status(502).json({ success: false, error: 'Verification service is temporarily unavailable.' });
  }
});

app.post('/auth/verify-phone', requireAuth, async (req, res) => {
  let phone;
  try { phone = normalizeNigerianPhone(req.body?.phone); }
  catch (_) { return res.status(400).json({ success: false, error: 'Invalid phone number.' }); }
  const otp = String(req.body?.otp || '').trim();
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, error: 'Enter the 6-digit code.' });
  if (!rateLimit(`otp-phone-verify:${req.user.uid}`, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many verification attempts.' });
  }

  try {
    const result = await verifyTermiiOtp(phone, otp);
    if (!result.ok) return res.status(400).json({ success: false, error: result.error });

    let updated;
    try {
      updated = await admin.auth().updateUser(req.user.uid, { phoneNumber: phone });
    } catch (err) {
      if (err.code === 'auth/phone-number-already-exists') {
        return res.status(409).json({ success: false, error: 'That phone number is already linked to another account.' });
      }
      throw err;
    }

    await db.collection('users').doc(req.user.uid).set({
      phone,
      phoneVerified: true
    }, { merge: true });

    return res.json({ success: true, uid: updated.uid });
  } catch (err) {
    console.error('Phone verification error:', err.message);
    return res.status(502).json({ success: false, error: 'Verification service is temporarily unavailable.' });
  }
});

/* Match creation is server-verified so clients cannot forge matches. */
app.post('/matches/create', requireAuth, async (req, res) => {
  const targetUserId = String(req.body?.targetUserId || '');
  if (!targetUserId || targetUserId === req.user.uid) return res.status(400).json({ success: false, error: 'Valid target user is required.' });
  try {
    const reciprocal = await db.collection('swipes')
      .where('fromUserId', '==', targetUserId)
      .where('toUserId', '==', req.user.uid)
      .where('action', 'in', ['like', 'superlike']).limit(1).get();
    if (reciprocal.empty) return res.status(403).json({ success: false, error: 'No mutual like exists.' });
    const matchId = [req.user.uid, targetUserId].sort().join('_');
    await db.collection('matches').doc(matchId).create({ users: [req.user.uid, targetUserId], createdAt: admin.firestore.FieldValue.serverTimestamp() }).catch(err => {
      if (err.code !== 6) throw err;
    });
    return res.json({ success: true, matchId });
  } catch (err) {
    console.error('Match creation error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not create match.' });
  }
});

/* FCM: all public trigger endpoints require a Firebase ID token. */
async function sendPushToUser(userId, { title, body, data = {} }) {
  const snap = await db.collection('fcm_tokens').doc(userId).collection('tokens').get();
  const tokens = snap.docs.map(d => d.data().token).filter(Boolean);
  if (!tokens.length) return;
  const response = await admin.messaging().sendEachForMulticast({
    notification: { title: String(title).slice(0, 120), body: String(body || '').slice(0, 500) },
    data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [String(k), String(v)])),
    tokens
  });
  for (let i = 0; i < response.responses.length; i++) {
    const err = response.responses[i].error;
    if (err?.code === 'messaging/registration-token-not-registered' ||
        err?.code === 'messaging/invalid-registration-token') {
      await db.collection('fcm_tokens').doc(userId).collection('tokens').doc(tokens[i]).delete().catch(() => {});
    }
  }
}

app.post('/fcm/new-match', requireAuth, async (req, res) => {
  const { matchedUserId, matchedUserName } = req.body || {};
  if (!matchedUserId) return res.status(400).json({ error: 'matchedUserId is required.' });
  await Promise.all([
    sendPushToUser(req.user.uid, { title: '💕 New Match!', body: `You matched with ${String(matchedUserName || 'someone').slice(0, 80)}! Say hello.`, data: { type: 'new_match', matchId: String(matchedUserId) } }),
    sendPushToUser(String(matchedUserId), { title: '💕 New Match!', body: 'Someone liked you back! You have a new match.', data: { type: 'new_match', matchId: req.user.uid } })
  ]);
  res.json({ success: true });
});

app.post('/fcm/new-message', requireAuth, async (req, res) => {
  const { toUserId, fromUserName, messageText, matchId } = req.body || {};
  if (!toUserId || !matchId) return res.status(400).json({ error: 'toUserId and matchId are required.' });
  const partnerId = String(toUserId);
  const matchDoc = await db.collection('matches').doc(String(matchId)).get();
  if (!matchDoc.exists || !Array.isArray(matchDoc.data().users) || !matchDoc.data().users.includes(req.user.uid) || !matchDoc.data().users.includes(partnerId)) {
    return res.status(403).json({ error: 'You are not a participant in this match.' });
  }
  const preview = req.body?.messageText ? String(messageText).slice(0, 60) : '📷 Photo';
  await sendPushToUser(partnerId, {
    title: `💬 ${String(fromUserName || 'Your match').slice(0, 80)}`,
    body: preview,
    data: { type: 'new_message', matchId: String(matchId) }
  });
  res.json({ success: true });
});

app.post('/stories/cleanup', async (req, res) => {
  if (req.headers['x-cleanup-secret'] !== CLEANUP_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection('stories').where('expiresAt', '<=', now).limit(100).get();
    if (snap.empty) return res.json({ success: true, deleted: 0 });
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return res.json({ success: true, deleted: snap.size });
  } catch (err) {
    console.error('Story cleanup error:', err.message);
    return res.status(500).json({ error: 'Cleanup failed.' });
  }
});

app.get('/turn/credentials', requireAuth, async (_req, res) => {
  if (!METERED_API_KEY) return res.status(503).json({ error: 'TURN service is not configured.' });
  try {
    const response = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${encodeURIComponent(METERED_API_KEY)}`);
    if (!response.ok) throw new Error(`Metered returned ${response.status}`);
    res.json(await response.json());
  } catch (err) {
    console.error('TURN credentials error:', err.message);
    res.status(502).json({ error: 'Failed to obtain TURN credentials.' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.json({ service: 'hookmebysam backend', status: 'online' }));

app.listen(PORT, () => console.log(`hookmebysam backend listening on port ${PORT}`));
