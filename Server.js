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
app.use(express.json());
app.use(cors({
  // In dev, if ALLOWED_ORIGINS isn't set, allow any origin so Live Server
  // (which changes ports) isn't a hassle. In production, ALWAYS set
  // ALLOWED_ORIGINS to your real domain(s) — see README.md.
  origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : true,
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

// ---------- Verify Payment (Paystack) ----------
// The client already got a "success" callback from the Paystack popup —
// that alone proves nothing, since it's just JS running in the user's own
// browser. This is the step that actually matters: ask Paystack directly,
// server-to-server with the secret key, whether that reference really was
// paid, for how much, and make sure it hasn't been redeemed before.
app.post('/payment/verify', async (req, res) => {
  const { reference, uid, tier } = req.body;

  if (!reference || !uid || !VIP_TIER_PRICES_NGN[tier]) {
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