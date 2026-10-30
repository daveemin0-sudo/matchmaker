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

const TERMII_API_KEY = (process.env.TERMII_API_KEY || '').trim().replace(/[\r\n\t]/g, '');
const TERMII_SENDER_ID = (process.env.TERMII_SENDER_ID || 'N-Alert').trim().replace(/[\r\n\t]/g, '');
const PAYSTACK_SECRET_KEY = (process.env.PAYSTACK_SECRET_KEY || '').trim().replace(/[\r\n\t]/g, '');
const CLEANUP_SECRET = (process.env.CLEANUP_SECRET || '').trim().replace(/[\r\n\t]/g, '');
const METERED_API_KEY = (process.env.METERED_API_KEY || '').trim().replace(/[\r\n\t]/g, '');
// Accept "name.metered.live" as well as a pasted "https://name.metered.live/".
const METERED_DOMAIN = (process.env.METERED_DOMAIN || '').trim().replace(/[\r\n\t]/g, '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
const DAILY_FREE_SWIPES = Math.max(1, Number(process.env.DAILY_FREE_SWIPES || 100));

function nigeriaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

if (!process.env.PAYSTACK_SECRET_KEY) {
  console.warn('⚠️  PAYSTACK_SECRET_KEY not set in environment. Webhook verification requires PAYSTACK_SECRET_KEY.');
}
if (!process.env.TERMII_API_KEY) {
  console.warn('⚠️  TERMII_API_KEY is not configured. OTP endpoints will be unavailable until it is set.');
}
if (!process.env.CLEANUP_SECRET) {
  console.warn('⚠️  CLEANUP_SECRET is not configured. Scheduled story cleanup will be unavailable until it is set.');
}
if (!process.env.METERED_API_KEY || !process.env.METERED_DOMAIN) {
  console.warn('⚠️  Metered TURN credentials are not configured. Calls will need STUN only until configured.');
}

// One clear configuration report at startup: what is set, what is missing and what stops
// working without it. Values are never printed.
const CONFIG_CHECKS = [
  ['FIREBASE_SERVICE_ACCOUNT_JSON / _BASE64', Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT), 'required: nothing works without it'],
  ['PAYSTACK_SECRET_KEY', Boolean(PAYSTACK_SECRET_KEY), 'payments and webhook refused'],
  ['TERMII_API_KEY', Boolean(TERMII_API_KEY), 'phone sign-in unavailable'],
  ['METERED_API_KEY + METERED_DOMAIN', Boolean(METERED_API_KEY && METERED_DOMAIN), 'calls across networks may carry no audio'],
  ['CLEANUP_SECRET', Boolean(CLEANUP_SECRET), 'story cleanup job refused'],
  ['SECURITY_LOG_SALT', Boolean(process.env.SECURITY_LOG_SALT), 'log hashes fall back to another secret'],
  ['ALLOWED_ORIGINS', ALLOWED_ORIGINS.length > 0, 'only hookmebysam.com, this project on Vercel and localhost are allowed'],
];
if (PAYSTACK_SECRET_KEY.startsWith('sk_test_')) {
  console.warn('⚠️  PAYSTACK_SECRET_KEY is a TEST key: no real money is collected.');
}
console.log('Configuration: ' + CONFIG_CHECKS.map(([name, ok]) => `${name}=${ok ? 'set' : 'MISSING'}`).join(', '));
for (const [name, ok, effect] of CONFIG_CHECKS) if (!ok) console.warn(`⚠️  ${name} is not set: ${effect}.`);

let serviceAccount = null;
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
  console.warn('⚠️  Could not parse Firebase service account credentials:', err.message);
}

const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || serviceAccount?.storage_bucket || '';

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_PROJECT_ID
      ? `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      : undefined,
    ...(FIREBASE_STORAGE_BUCKET ? { storageBucket: FIREBASE_STORAGE_BUCKET } : {})
  });
  console.log('✅ Firebase Admin initialized with service account.');
} else {
  try {
    admin.initializeApp();
    console.log('ℹ️  Firebase Admin initialized with default application credentials.');
  } catch (e) {
    console.warn('⚠️  Firebase Admin initialized in fallback mode. Add FIREBASE_SERVICE_ACCOUNT_JSON in Render.');
  }
}

let db;
try {
  db = admin.firestore();
} catch (e) {
  console.warn('⚠️  Firestore client pending credentials initialization.');
}

// Every 401/403/429/5xx response is recorded, so probing and brute force show up on the
// admin page even on routes that have no explicit event. Handlers that record a more
// specific event set res.locals.securityLogged to avoid counting it twice.
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.locals.securityLogged) return;
    const code = res.statusCode;
    const p = String(req.originalUrl || req.url || '');
    if (code === 401) securityEvent('unauthenticated', { req });
    else if (code === 403) securityEvent(p.startsWith('/admin') ? 'admin_denied' : 'forbidden', { req });
    else if (code === 429) securityEvent('rate_limited', { req });
    else if (code >= 500) securityEvent('server_error', { req, detail: { status: code } });
  });
  next();
});

app.use(express.json({
  limit: '15mb',
  verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); }
}));
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
// CORS. Origins are compared exactly (or by a strict pattern), never by substring:
// "includes('vercel.app')" also matched https://vercel.app.attacker.com and every other
// site anyone has deployed on Vercel. Sign-in uses bearer tokens, not cookies, so CORS is
// defence in depth here rather than the main protection.
const DEFAULT_ORIGINS = ['https://hookmebysam.com', 'https://www.hookmebysam.com'];
const ORIGIN_ALLOWLIST = new Set([...DEFAULT_ORIGINS, ...ALLOWED_ORIGINS]);
// This project's own Vercel deployments (production and previews) only.
const VERCEL_PROJECT_ORIGIN = /^https:\/\/(?:daveemin0-sudo-)?matchmaker(?:-[a-z0-9-]+)?\.vercel\.app$/;

function isAllowedOrigin(origin) {
  if (ORIGIN_ALLOWLIST.has(origin)) return true;
  let url;
  try { url = new URL(origin); } catch (_) { return false; }
  if (url.origin !== origin && !(url.protocol === 'capacitor:' && origin.startsWith('capacitor://localhost'))) return false;
  // The Android app (Capacitor, androidScheme https) runs at https://localhost; local dev
  // uses http://localhost:5500 and 127.0.0.1. Hostname must match exactly.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
  return VERCEL_PROJECT_ORIGIN.test(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const originAllowed = !origin || isAllowedOrigin(origin);

  if (origin && originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Cleanup-Secret');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (origin && !originAllowed) {
    res.locals.securityLogged = true;
    securityEvent('origin_blocked', { req, detail: { origin: String(origin).slice(0, 120) } });
    return res.status(403).json({ error: 'Origin not allowed.' });
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Security headers. This server only returns JSON, so it can be locked down completely.
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

/*
 * Security monitoring. Suspicious activity is written to security_events (server-only),
 * and bursts that cross a threshold raise one security_alerts document per key and window,
 * shown on the admin page and logged with a [SECURITY_ALERT] prefix for the Render logs.
 * IP addresses are stored only as a salted hash (enough to correlate, not to identify), and
 * every document carries expiresAt so a Firestore TTL policy can delete it after 30 days.
 * Writes are capped per key and window so an attacker cannot inflate Firestore costs.
 * Email/password sign-in goes straight from the app to Firebase Auth, which throttles
 * it itself; this server never sees those attempts.
 */
const SECURITY_SALT = (process.env.SECURITY_LOG_SALT || CLEANUP_SECRET || PAYSTACK_SECRET_KEY || 'hmbs-security').trim();
const SECURITY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const SECURITY_EVENT_WRITES_PER_KEY = 5; // per window, after which only the counter grows

// type -> { severity, threshold (events per key in window that raise an alert), windowMs, by }
// `by` picks the key the burst is counted on: 'ip', 'uid', 'target' or 'global'.
const SECURITY_RULES = {
  unauthenticated:      { severity: 'low',      threshold: 30, windowMs: 5 * 60 * 1000,  by: 'ip' },
  forbidden:            { severity: 'low',      threshold: 20, windowMs: 10 * 60 * 1000, by: 'ip' },
  rate_limited:         { severity: 'medium',   threshold: 10, windowMs: 10 * 60 * 1000, by: 'ip' },
  admin_denied:         { severity: 'high',     threshold: 1,  windowMs: 60 * 60 * 1000, by: 'uid' },
  admin_action:         { severity: 'info',     threshold: 0,  windowMs: 60 * 60 * 1000, by: 'uid', audit: true },
  otp_sent:             { severity: 'info',     threshold: 15, windowMs: 60 * 60 * 1000, by: 'ip' },
  otp_send_burst:       { severity: 'high',     threshold: 60, windowMs: 60 * 60 * 1000, by: 'global' },
  otp_verify_failed:    { severity: 'medium',   threshold: 5,  windowMs: 10 * 60 * 1000, by: 'target' },
  webhook_bad_signature:{ severity: 'high',     threshold: 3,  windowMs: 10 * 60 * 1000, by: 'ip' },
  payment_mismatch:     { severity: 'high',     threshold: 1,  windowMs: 60 * 60 * 1000, by: 'uid' },
  upload_rejected:      { severity: 'medium',   threshold: 10, windowMs: 10 * 60 * 1000, by: 'uid' },
  origin_blocked:       { severity: 'low',      threshold: 50, windowMs: 10 * 60 * 1000, by: 'ip' },
  user_reported:        { severity: 'medium',   threshold: 3,  windowMs: 24 * 60 * 60 * 1000, by: 'target' },
  suspended_access:     { severity: 'medium',   threshold: 5,  windowMs: 60 * 60 * 1000, by: 'uid' },
  account_deleted:      { severity: 'info',     threshold: 0,  windowMs: 60 * 60 * 1000, by: 'uid', audit: true },
  server_error:         { severity: 'medium',   threshold: 20, windowMs: 10 * 60 * 1000, by: 'global' },
};

const securityCounters = new Map(); // `${type}|${key}` -> { start, count, written, alerted }

function hashForLog(value) {
  if (!value) return null;
  return crypto.createHmac('sha256', SECURITY_SALT).update(String(value)).digest('hex').slice(0, 16);
}

function securityEvent(type, { req = null, uid = null, target = null, detail = {} } = {}) {
  const rule = SECURITY_RULES[type];
  if (!rule) return;
  try {
    const ipHash = hashForLog(req ? req.ip : null);
    const actor = uid || (req && req.user && req.user.uid) || null;
    const targetHash = target ? hashForLog(target) : null;
    const key = rule.by === 'global' ? 'all' : rule.by === 'uid' ? (actor || ipHash || 'anon') : rule.by === 'target' ? (targetHash || ipHash || 'anon') : (ipHash || actor || 'anon');
    const counterKey = type + '|' + key;
    const now = Date.now();
    let c = securityCounters.get(counterKey);
    if (!c || now - c.start > rule.windowMs) c = { start: now, count: 0, written: 0, alerted: false };
    c.count += 1;
    securityCounters.set(counterKey, c);

    const safeDetail = {};
    for (const [k, v] of Object.entries(detail || {})) {
      if (v === undefined || v === null) continue;
      safeDetail[k] = typeof v === 'number' || typeof v === 'boolean' ? v : String(v).slice(0, 200);
    }
    const base = {
      type, severity: rule.severity,
      uid: actor, ipHash, targetHash,
      path: req ? String(req.originalUrl || req.url || '').split('?')[0].slice(0, 120) : null,
      method: req ? req.method : null,
      detail: safeDetail,
    };
    if (!db) return;
    const now_ts = admin.firestore.FieldValue.serverTimestamp();
    const expiresAt = admin.firestore.Timestamp.fromMillis(now + SECURITY_RETENTION_MS);
    // Audit events (admin actions, deletions) are always kept; they can't be triggered by outsiders.
    if (rule.audit || c.written < SECURITY_EVENT_WRITES_PER_KEY) {
      c.written += 1;
      db.collection('security_events').doc().set({ ...base, createdAt: now_ts, expiresAt }).catch(err => console.warn('security_events write failed:', err.message));
    }
    if (rule.threshold > 0 && !c.alerted && c.count >= rule.threshold) {
      c.alerted = true;
      const alertId = crypto.createHash('sha256').update(counterKey + '|' + c.start).digest('hex').slice(0, 32);
      const summary = `${c.count} × ${type} in ${Math.round((now - c.start) / 1000)} s` + (rule.by !== 'global' ? ` (same ${rule.by})` : '');
      console.error(`[SECURITY_ALERT] ${rule.severity.toUpperCase()} ${summary} path=${base.path || '-'} uid=${actor || '-'} ip=${ipHash || '-'}`);
      db.collection('security_alerts').doc(alertId).set({
        ...base, count: c.count, windowSeconds: Math.round(rule.windowMs / 1000), summary,
        status: 'open', firstSeenAt: admin.firestore.Timestamp.fromMillis(c.start), lastSeenAt: now_ts, expiresAt
      }, { merge: true }).catch(err => console.warn('security_alerts write failed:', err.message));
    }
  } catch (err) {
    console.warn('securityEvent failed:', err.message);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [k, c] of securityCounters) {
    const rule = SECURITY_RULES[k.split('|')[0]];
    if (!rule || now - c.start > rule.windowMs) securityCounters.delete(k);
  }
  // Hard cap so a flood of distinct IPs cannot grow memory without bound.
  if (securityCounters.size > 50000) securityCounters.clear();
}, 60 * 1000).unref();

const rateBuckets = new Map();

async function persistentRateLimit(key, max, windowMs) {
  try {
    const id = crypto.createHash('sha256').update(String(key)).digest('hex');
    const ref = db.collection('rate_limits').doc(id);
    const now = Date.now();
    let allowed = false;

    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const previous = snap.exists && Array.isArray(snap.data()?.hits) ? snap.data().hits : [];
      const hits = previous
        .map(value => typeof value === 'number' ? value : value?.toMillis?.())
        .filter(value => Number.isFinite(value) && now - value < windowMs);

      allowed = hits.length < max;
      if (allowed) hits.push(now);

      tx.set(ref, {
        hits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    return allowed;
  } catch (err) {
    console.error('Persistent rate-limit error:', err.message);
    return false;
  }
}

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

async function requireAdmin(req, res, next) {
  try {
    const doc = await db.collection('users').doc(req.user.uid).get();
    if (!doc.exists || doc.data()?.role !== 'admin') {
      res.locals.securityLogged = true;
      securityEvent('admin_denied', { req });
      return res.status(403).json({ error: 'Admin access required.' });
    }
    req.adminProfile = doc.data();
    next();
  } catch (err) {
    console.error('Admin authorization error:', err.message);
    return res.status(500).json({ error: 'Could not verify admin access.' });
  }
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const decoded = await admin.auth().verifyIdToken(header.slice(7));
    const userRecord = await admin.auth().getUser(decoded.uid);
    if (userRecord.disabled) {
      res.locals.securityLogged = true;
      securityEvent('suspended_access', { req, uid: decoded.uid });
      return res.status(403).json({ error: 'This account has been suspended.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    if (err?.code === 'auth/user-disabled') {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }
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
  const secretKey = (PAYSTACK_SECRET_KEY || '').trim().replace(/[\r\n\t]/g, '');
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
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
  if (Number(payment.amount) !== plan.amount * 100 || String(payment.currency || '').toUpperCase() !== 'NGN') {
    throw new Error('Payment amount or currency does not match the selected VIP plan.');
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
    // Fail closed: an HMAC with an empty key is something anyone can compute.
    if (!PAYSTACK_SECRET_KEY) return res.status(503).json({ error: 'Payments are not configured.' });
    const signature = String(req.headers['x-paystack-signature'] || '');
    const expected = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(req.rawBody || Buffer.from(''))
      .digest('hex');
    if (!signature || signature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      res.locals.securityLogged = true;
      securityEvent('webhook_bad_signature', { req, detail: { hasSignature: Boolean(signature) } });
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
    const paidEmail = String(payment.customer?.email || '').trim().toLowerCase();
    const userRecord = await admin.auth().getUser(String(userId));
    const accountEmail = String(userRecord.email || '').trim().toLowerCase();
    // Same ownership rule as POST /payment/verify. Phone-only accounts have no
    // email (checkout uses a synthetic <digits>@hookmebysam.com address), so
    // requiring an email match meant the webhook — the safety net for when the
    // browser closes before /payment/verify runs — never granted them VIP.
    // The metadata comes from the transaction Paystack just confirmed with our
    // secret key, and grantVip still pins amount + currency to the plan price.
    const verifiedMetadataUserId = (payment.metadata?.custom_fields || [])
      .find(f => f.variable_name === 'user_id')?.value;
    const ownerByEmail = Boolean(paidEmail && accountEmail && paidEmail === accountEmail);
    const ownerByMetadata = Boolean(verifiedMetadataUserId && String(verifiedMetadataUserId) === String(userId));
    if (!ownerByEmail && !ownerByMetadata) {
      console.warn('Paystack webhook ignored because payment does not belong to this Firebase account:', reference);
      return res.status(200).json({ received: true });
    }
    await grantVip({ reference, uid: String(userId), tier: Number(tier), payment });
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Paystack webhook error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

/* Retrieve authenticated user's own profile. Read-only: it never clones a profile to another uid. */
/*
 * People search. Firestore cannot search inside text, so each published profile carries
 * searchKeys: the 2-20 character prefixes of every word of its display name. A search asks
 * Firestore for one key and checks the remaining words here, so a phone never downloads the
 * whole public_profiles collection.
 */
function searchWords(text) {
  return String(text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/).filter(Boolean);
}

function profileSearchKeys(name) {
  const keys = new Set();
  for (const w of searchWords(name).slice(0, 6)) {
    for (let i = 2; i <= Math.min(w.length, 20); i++) keys.add(w.slice(0, i));
  }
  return [...keys].slice(0, 120);
}

app.get('/profiles/me', requireAuth, async (req, res) => {
  if (!rateLimit('profiles-me:' + req.user.uid, 60, 60 * 1000)) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  try {
    const snap = await db.collection('users').doc(req.user.uid).get();
    if (!snap.exists) {
      return res.json({ success: true, exists: false, profile: null });
    }
    return res.json({ success: true, exists: true, profile: snap.data() });
  } catch (err) {
    console.error('profiles/me error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not fetch profile.' });
  }
});

/*
 * Google account linking.
 * If a Google sign-in produced a brand-new Firebase uid while an account with the
 * same verified email already exists (e.g. email/password), link the Google
 * provider to the EXISTING uid and discard the redundant Google-only auth user.
 * The client then re-signs in with the Google credential and lands on the
 * original uid, so profile, chats, matches and followers are all preserved.
 */
app.post('/auth/link-google', requireAuth, async (req, res) => {
  try {
    const newUid = req.user.uid;
    const email = String(req.user.email || '').trim().toLowerCase();
    if (req.user.firebase?.sign_in_provider !== 'google.com' || !email || req.user.email_verified !== true) {
      return res.json({ success: true, linked: false, reason: 'not-applicable' });
    }
    if (!(await persistentRateLimit('link-google:' + newUid, 10, 10 * 60 * 1000))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }

    const googleRec = await admin.auth().getUser(newUid);
    const googleInfo = googleRec.providerData.find(p => p.providerId === 'google.com');
    // Only ever merge a pure Google-only auth user
    if (!googleInfo || googleRec.providerData.length !== 1) {
      return res.json({ success: true, linked: false, reason: 'already-linked' });
    }

    // Collect other accounts that own this email
    const candidateUids = new Set();
    try {
      const byEmail = await admin.auth().getUserByEmail(email);
      if (byEmail.uid !== newUid) candidateUids.add(byEmail.uid);
    } catch (_) {}
    const fsSnap = await db.collection('users').where('email', 'in', [email, String(req.user.email)]).get();
    fsSnap.forEach(d => { if (d.id !== newUid) candidateUids.add(d.id); });

    let target = null;
    for (const cUid of candidateUids) {
      try {
        const rec = await admin.auth().getUser(cUid);
        if (rec.disabled) continue;
        if (String(rec.email || '').toLowerCase() !== email) continue;
        if (rec.providerData.some(p => p.providerId === 'google.com')) continue;
        if (!target || rec.providerData.some(p => p.providerId === 'password')) target = rec;
      } catch (_) {}
    }
    if (!target) return res.json({ success: true, linked: false, reason: 'no-existing-account' });

    // Retire the redundant Google-only auth user (frees the Google identity), then link it
    await admin.auth().deleteUser(newUid);
    // Pre-hijacking guard: nothing proves the person who registered the
    // existing email/password account actually owns that inbox. If it was
    // never verified, an attacker could have pre-registered the victim's email
    // with a password they know, then wait for the victim to sign in with
    // Google and be merged into it. For unverified targets, drop the password
    // credential and kill existing sessions as part of the merge; the Google
    // sign-in (which Google verified) becomes the only way in.
    const targetWasVerified = target.emailVerified === true;
    await admin.auth().updateUser(target.uid, {
      emailVerified: true,
      providerToLink: { providerId: 'google.com', uid: googleInfo.uid }
    });
    if (!targetWasVerified) {
      // Separate call: link first so the account is never left with no way in.
      await admin.auth().updateUser(target.uid, { providersToUnlink: ['password'] });
      await admin.auth().revokeRefreshTokens(target.uid).catch(() => {});
    }

    // Hide the duplicate profile and flag the real one; existing profile fields are NOT overwritten
    await db.collection('public_profiles').doc(newUid).set({ active: false, mergedInto: target.uid }, { merge: true }).catch(() => {});
    await db.collection('users').doc(newUid).set({ mergedInto: target.uid, accountStatus: 'merged' }, { merge: true }).catch(() => {});
    await db.collection('users').doc(target.uid).set({
      googleLinked: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`Linked Google identity to existing account ${target.uid}; removed duplicate ${newUid}`);
    return res.json({ success: true, linked: true, uid: target.uid });
  } catch (err) {
    console.error('link-google error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not link Google account.' });
  }
});

/* Authenticated direct payment verification. Never trusts uid/amount from the browser. */
app.post('/profiles/sync', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await persistentRateLimit('profile-sync:' + uid, 20, 10 * 60 * 1000))) return res.status(429).json({ success:false, error:'Too many profile sync requests.' });
    const snap = await db.collection('users').doc(uid).get();
    let d = snap.exists ? (snap.data() || {}) : {};
    const body = (req.body && typeof req.body === 'object') ? req.body : {};

    // If user document is missing in Firestore, check if client supplied valid profile fields
    if (!snap.exists && (body.age === undefined || body.age === null)) {
      return res.status(404).json({ success:false, error:'Profile not found.' });
    }

    const docAge = (d.age !== undefined && d.age !== null) ? Number(d.age) : NaN;
    const bodyAge = (body.age !== undefined && body.age !== null) ? Number(body.age) : NaN;
    const age = (Number.isFinite(docAge) && docAge >= 18 && docAge <= 100) ? docAge : bodyAge;
    if (!Number.isFinite(age) || age < 18 || age > 100) return res.status(400).json({ success:false, error:'An adult profile age (18+) is required.' });

    // Synchronize client-supplied fields if document was missing or lacked age/photo/name
    const updates = {};
    if (!snap.exists || d.age !== Math.floor(age)) updates.age = Math.floor(age);
    if (!d.id) updates.id = uid;
    if (body.displayName && !d.displayName && !d.name) updates.displayName = String(body.displayName).slice(0, 80);
    if (body.name && !d.name) updates.name = String(body.name).slice(0, 80);
    if (body.bio && (!d.bio || d.bio !== body.bio)) updates.bio = String(body.bio).slice(0, 1000);
    if (body.gender && (!d.gender || d.gender !== body.gender)) updates.gender = String(body.gender).slice(0, 40);
    if (body.city && (!d.city || d.city !== body.city)) updates.city = String(body.city).slice(0, 80);
    if (Array.isArray(body.interests) && (!d.interests || !d.interests.length)) {
      updates.interests = body.interests.slice(0, 30).map(v => String(v).slice(0, 40));
    }
    const bodyImage = String(body.image || body.avatar || (Array.isArray(body.photos) && body.photos[0]) || '');
    if (bodyImage && !d.image && !d.avatar) {
      updates.image = bodyImage;
      updates.avatar = bodyImage;
    }
    if (Array.isArray(body.photos) && body.photos.length > 0 && (!d.photos || !d.photos.length)) {
      updates.photos = body.photos.slice(0, 6);
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await db.collection('users').doc(uid).set(updates, { merge: true });
      d = Object.assign({}, d, updates);
    }

    const city = String(d.city || body.city || '').trim().slice(0,80);
    const finalImage = String(d.image || d.avatar || (Array.isArray(d.photos) && d.photos[0]) || bodyImage || '');
    const finalPhotos = Array.isArray(d.photos) && d.photos.length > 0
      ? d.photos.slice(0, 6)
      : (Array.isArray(body.photos) && body.photos.length > 0
        ? body.photos.slice(0, 6)
        : (finalImage ? [finalImage] : []));

    const publicName = String(d.displayName || d.name || body.displayName || body.name || 'User').slice(0,80);
    await db.collection('public_profiles').doc(uid).set({
      id: uid, displayName: publicName, searchKeys: profileSearchKeys(publicName),
      age: Math.floor(age), gender: String(d.gender || body.gender || '').slice(0,40),
      bio: String(d.bio || body.bio || '').slice(0,1000),
      interests: Array.isArray(d.interests) ? d.interests.slice(0,30).map(v => String(v).slice(0,40)) : (Array.isArray(body.interests) ? body.interests.slice(0,30).map(v => String(v).slice(0,40)) : []),
      image: finalImage,
      photos: finalPhotos,
      ...(city ? {city} : {}),
      active: d.accountStatus !== 'suspended' && d.accountStatus !== 'merged' && d.suspended !== true && !d.deletedAt && !d.mergedInto,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, {merge:true});
    res.json({success:true, profile: d});
  } catch (err) {
    console.error('profile sync error:', err.message);
    res.status(500).json({success:false,error:'Could not sync profile.'});
  }
});

/*
 * Authenticated media upload proxy (bypasses browser CORS restrictions for storage)
 */
// admin.storage().bucket() THROWS (it does not return undefined) when no default
// bucket was configured, so it cannot be used inside an `a || b || c` chain: the
// throw skipped the hard-coded fallback and every upload fell back to inline data.
function resolveStorageBucketName() {
  if (FIREBASE_STORAGE_BUCKET) return FIREBASE_STORAGE_BUCKET;
  try {
    const defaultName = admin.storage().bucket().name;
    if (defaultName) return defaultName;
  } catch (_) { /* no default bucket configured */ }
  return `${process.env.FIREBASE_PROJECT_ID || 'hookmebysam'}.firebasestorage.app`;
}

function getStorageBucket() {
  return admin.storage().bucket(resolveStorageBucketName());
}

const MEDIA_UPLOAD_ROOTS = new Set(['stories', 'voicenotes', 'chat_media', 'chat_images', 'chat_videos']);

// What a file really is, from its first bytes. Uploads must match the type they claim:
// a browser-supplied Content-Type is just a label, and SVG (which can carry script) is
// never accepted. Returns the set of top-level kinds the bytes are valid for.
function sniffMediaKinds(buf) {
  if (!buf || buf.length < 12) return new Set();
  const hex = buf.subarray(0, 16).toString('hex');
  const ascii = (a, b) => buf.subarray(a, b).toString('latin1');
  if (hex.startsWith('ffd8ff')) return new Set(['image']);                      // JPEG
  if (hex.startsWith('89504e470d0a1a0a')) return new Set(['image']);            // PNG
  if (ascii(0, 4) === 'GIF8') return new Set(['image']);                        // GIF
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return new Set(['image']);
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return new Set(['audio']);
  if (ascii(4, 8) === 'ftyp') {                                                 // ISO BMFF
    const brand = ascii(8, 12).toLowerCase();
    if (['heic', 'heix', 'heif', 'mif1', 'msf1', 'avif'].includes(brand)) return new Set(['image']);
    return new Set(['video', 'audio']);                                         // mp4, m4a, mov, 3gp
  }
  if (hex.startsWith('1a45dfa3')) return new Set(['video', 'audio']);           // WebM / Matroska
  if (ascii(0, 4) === 'OggS') return new Set(['audio', 'video']);
  if (ascii(0, 3) === 'ID3' || /^fff[23ab]/.test(hex) || /^fff[19]/.test(hex)) return new Set(['audio']); // MP3, AAC ADTS
  if (ascii(0, 4) === 'fLaC' || ascii(0, 5) === '#!AMR') return new Set(['audio']);
  return new Set();
}

function mediaMatchesClaim(buf, contentType) {
  const kind = String(contentType || '').split('/')[0];
  if (/svg|xml|html/i.test(String(contentType || ''))) return false;
  return sniffMediaKinds(buf).has(kind);
}

app.post('/media/upload', requireAuth, async (req, res) => {
  try {
    const { dataBase64, contentType, path, fileName } = req.body || {};
    if (!dataBase64) {
      return res.status(400).json({ success: false, error: 'dataBase64 is required.' });
    }
    const uid = req.user.uid;
    if (!(await persistentRateLimit('media-upload:' + uid, 60, 60 * 60 * 1000))) {
      return res.status(429).json({ success: false, error: 'Too many uploads. Please try again later.' });
    }
    const reject = (reason, message) => {
      res.locals.securityLogged = true;
      securityEvent('upload_rejected', { req, detail: { reason, contentType: String(contentType || '').slice(0, 60) } });
      return res.status(400).json({ success: false, error: message });
    };
    const safePath = String(path || 'chat_media').replace(/[^a-zA-Z0-9_\-\/]/g, '');
    const cleanContentType = String(contentType || 'audio/webm').split(';')[0].trim().toLowerCase();

    // This proxy is the fallback for direct Storage uploads, so it must not be
    // weaker than storage.rules / uploadFileToBackend(): known roots only,
    // media content types only, and chat media only inside a live, unblocked
    // match the caller belongs to.
    const pathParts = safePath.split('/').filter(Boolean);
    if (!MEDIA_UPLOAD_ROOTS.has(pathParts[0])) {
      return reject('path', 'Unsupported upload path.');
    }
    if (!/^(image|video|audio)\/[a-z0-9.+-]+$/.test(cleanContentType)) {
      return reject('type', 'Only image, video and audio uploads are allowed.');
    }
    if (pathParts[0] === 'chat_media') {
      const matchId = pathParts[1] || '';
      const participants = matchId.split('_');
      if (participants.length !== 2 || !participants.includes(uid)) {
        return res.status(403).json({ success: false, error: 'Unauthorized path.' });
      }
      const partnerId = participants.find(p => p !== uid) || uid;
      try {
        await assertActiveMatchAccess(uid, partnerId, matchId);
      } catch (accessErr) {
        if (accessErr.code === 'MATCH_ACCESS_DENIED') {
          return res.status(403).json({ success: false, error: 'Unauthorized path.' });
        }
        throw accessErr;
      }
    }

    // Strip data URL prefix if present
    const rawBase64 = dataBase64.includes(';base64,') ? dataBase64.split(';base64,')[1] : dataBase64;
    const buffer = Buffer.from(rawBase64, 'base64');

    if (buffer.length > 15 * 1024 * 1024) {
      return reject('size', 'File size exceeds 15MB limit.');
    }
    if (!mediaMatchesClaim(buffer, cleanContentType)) {
      return reject('content', "That file isn't a supported photo, video or audio file.");
    }

    let downloadUrl = null;
    try {
      const bucket = getStorageBucket();
      const safeName = String(fileName || `file_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const destination = `${safePath}/${uid}/${Date.now()}_${safeName}`;
      const fileRef = bucket.file(destination);

      const downloadToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
      await fileRef.save(buffer, {
        metadata: {
          contentType: cleanContentType,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken
          }
        },
        resumable: false
      });

      downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${downloadToken}`;
    } catch (storageErr) {
      console.warn('Backend storage upload fallback notice:', storageErr.message);
    }

    // If storage bucket isn't configured, return the clean inline data URL (guaranteed fallback)
    if (!downloadUrl) {
      downloadUrl = dataBase64.startsWith('data:') ? dataBase64 : `data:${cleanContentType};base64,${rawBase64}`;
    }

    return res.json({ success: true, url: downloadUrl });
  } catch (err) {
    console.error('media/upload error:', err.message);
    return res.status(500).json({ success: false, error: 'Media upload failed.' });
  }
});

app.get('/profiles/search', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await persistentRateLimit('search:' + uid, 60, 60 * 1000))) {
      return res.status(429).json({ success: false, error: 'Too many searches. Please slow down.' });
    }
    const words = searchWords(String(req.query.q || '').slice(0, 80)).slice(0, 5);
    if (!words.length || words.every(w => w.length < 2)) return res.json({ success: true, users: [] });
    // Query on the longest word (most selective); check every word against the name below.
    const key = words.reduce((a, b) => (b.length > a.length ? b : a)).slice(0, 20);
    const [outgoing, incoming, profiles] = await Promise.all([
      db.collection('blocks').where('blockedBy', '==', uid).get(),
      db.collection('blocks').where('blockedUserId', '==', uid).get(),
      db.collection('public_profiles').where('searchKeys', 'array-contains', key).limit(60).get()
    ]);
    const excluded = new Set([uid]);
    outgoing.forEach(s => { const d = s.data() || {}; if (d.blockedUserId) excluded.add(String(d.blockedUserId)); });
    incoming.forEach(s => { const d = s.data() || {}; if (d.blockedBy) excluded.add(String(d.blockedBy)); });
    const users = [];
    profiles.forEach(doc => {
      if (users.length >= 20 || excluded.has(doc.id) || doc.id.startsWith('live_')) return;
      const d = doc.data() || {};
      if (d.active !== true) return;
      const nameWords = searchWords(d.displayName || d.name);
      if (!words.every(w => nameWords.some(nw => nw.startsWith(w)))) return;
      const age = Number(d.age);
      users.push({
        id: doc.id,
        name: d.displayName || d.name || 'User',
        age: Number.isFinite(age) && age >= 18 ? Math.floor(age) : null,
        bio: String(d.bio || '').slice(0, 200),
        gender: d.gender || '',
        image: String(d.image || d.avatar || (Array.isArray(d.photos) && d.photos[0]) || ''),
        tags: Array.isArray(d.interests) ? d.interests : [],
        city: d.city || '',
        isRealUser: true
      });
    });
    res.json({ success: true, users });
  } catch (err) {
    console.error('profile search error:', err.message);
    res.status(500).json({ success: false, error: 'Search failed.' });
  }
});

/*
 * Voice introductions (max 20 s). Stored in Cloud Storage when it is provisioned, otherwise
 * in a server-only voice_intros/{uid} document (clients have no Firestore access to it).
 * public_profiles only carries { durationSeconds, duration, url? } so Discovery stays light,
 * and the audio is fetched when someone actually presses play.
 */
const VOICE_INTRO_MAX_BYTES = 600 * 1024;
const VOICE_INTRO_MAX_SECONDS = 20;

function voiceIntroDuration(seconds) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

app.put('/profiles/voice-intro', requireAuth, async (req, res) => {
  const uid = req.user.uid;
  try {
    if (!(await persistentRateLimit('voice-intro:' + uid, 10, 60 * 60 * 1000))) {
      return res.status(429).json({ success: false, error: 'Too many uploads. Please try again later.' });
    }
    const { dataBase64, contentType } = req.body || {};
    const seconds = Math.round(Number((req.body || {}).durationSeconds));
    const type = String(contentType || '').split(';')[0].trim().toLowerCase();
    if (!/^audio\/[a-z0-9.+-]+$/.test(type)) return res.status(400).json({ success: false, error: 'A voice intro must be audio.' });
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > VOICE_INTRO_MAX_SECONDS) {
      return res.status(400).json({ success: false, error: `A voice intro must be 1 to ${VOICE_INTRO_MAX_SECONDS} seconds.` });
    }
    const raw = String(dataBase64 || '').includes(';base64,') ? String(dataBase64).split(';base64,')[1] : String(dataBase64 || '');
    const buffer = Buffer.from(raw, 'base64');
    if (!buffer.length) return res.status(400).json({ success: false, error: 'The recording is empty.' });
    if (buffer.length > VOICE_INTRO_MAX_BYTES) return res.status(400).json({ success: false, error: 'The recording is too large.' });
    if (!mediaMatchesClaim(buffer, type)) {
      res.locals.securityLogged = true;
      securityEvent('upload_rejected', { req, detail: { reason: 'content', contentType: type } });
      return res.status(400).json({ success: false, error: "That recording isn't a supported audio file." });
    }

    let url = null;
    try {
      const bucket = getStorageBucket();
      const destination = `voice_intros/${uid}/${Date.now()}.${(type.split('/')[1] || 'webm').replace(/[^a-z0-9]/g, '')}`;
      const token = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
      await bucket.file(destination).save(buffer, { metadata: { contentType: type, metadata: { firebaseStorageDownloadTokens: token } }, resumable: false });
      url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
    } catch (storageErr) {
      console.warn('Voice intro: Storage unavailable, keeping audio in Firestore:', storageErr.message);
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const meta = { durationSeconds: seconds, duration: voiceIntroDuration(seconds), ...(url ? { url } : {}), updatedAt: now };
    if (url) {
      await db.collection('voice_intros').doc(uid).delete().catch(err => { if (err.code !== 5) throw err; });
    } else {
      await db.collection('voice_intros').doc(uid).set({ ownerId: uid, contentType: type, dataBase64: buffer.toString('base64'), durationSeconds: seconds, updatedAt: now });
    }
    await db.collection('public_profiles').doc(uid).set({ voiceIntro: meta }, { merge: true });
    await db.collection('users').doc(uid).set({ voiceIntro: meta }, { merge: true });
    const { updatedAt, ...publicMeta } = meta;
    return res.json({ success: true, voiceIntro: publicMeta });
  } catch (err) {
    console.error('voice intro upload error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not save your voice intro.' });
  }
});

app.delete('/profiles/voice-intro', requireAuth, async (req, res) => {
  if (!rateLimit('voice-intro-del:' + req.user.uid, 20, 60 * 60 * 1000)) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  const uid = req.user.uid;
  try {
    const remove = admin.firestore.FieldValue.delete ? admin.firestore.FieldValue.delete() : null;
    await Promise.all([
      db.collection('voice_intros').doc(uid).delete().catch(err => { if (err.code !== 5) throw err; }),
      db.collection('public_profiles').doc(uid).set({ voiceIntro: remove }, { merge: true }),
      db.collection('users').doc(uid).set({ voiceIntro: remove }, { merge: true }),
      deleteStoragePrefixes([`voice_intros/${uid}/`]).catch(() => {})
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error('voice intro delete error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not remove your voice intro.' });
  }
});

// Audio for one person's intro. Anyone signed in may listen, except across a block, and only
// to an active profile (or their own).
app.get('/profiles/:uid/voice-intro', requireAuth, async (req, res) => {
  const viewer = req.user.uid;
  const owner = String(req.params.uid || '');
  try {
    if (!(await persistentRateLimit('voice-intro-play:' + viewer, 120, 60 * 1000))) {
      return res.status(429).json({ success: false, error: 'Too many requests.' });
    }
    if (owner !== viewer) {
      const [a, b, pub] = await Promise.all([
        db.collection('blocks').doc(viewer + '_' + owner).get(),
        db.collection('blocks').doc(owner + '_' + viewer).get(),
        db.collection('public_profiles').doc(owner).get()
      ]);
      if (a.exists || b.exists || !pub.exists || (pub.data() || {}).active !== true) {
        return res.status(404).json({ success: false, error: 'Voice intro not found.' });
      }
    }
    const pub = await db.collection('public_profiles').doc(owner).get();
    const meta = (pub.exists && (pub.data() || {}).voiceIntro) || null;
    if (meta && meta.url) return res.json({ success: true, url: meta.url, duration: meta.duration });
    const doc = await db.collection('voice_intros').doc(owner).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Voice intro not found.' });
    const d = doc.data() || {};
    return res.json({ success: true, contentType: d.contentType, dataBase64: d.dataBase64, duration: meta ? meta.duration : voiceIntroDuration(Number(d.durationSeconds) || 0) });
  } catch (err) {
    console.error('voice intro fetch error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not load the voice intro.' });
  }
});

// Discovery applies the viewer's preferences here and pages through every active profile.
// It used to take the first 200 active profiles only and leave filtering to the phone, so
// once someone had swiped through those 200, Discovery stayed empty however many people joined.
const DISCOVERY_PAGE = 200;
const DISCOVERY_MAX_PAGES = 5;
const GENDERS_FOR = { men: ['male', 'man'], women: ['female', 'woman'] };

app.get('/discovery', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await persistentRateLimit('discovery:' + uid, 30, 60 * 1000))) return res.status(429).json({success:false,error:'Too many discovery requests. Please slow down.'});
    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 60);
    const minAge = Math.min(Math.max(Math.floor(Number(req.query.minAge)) || 18, 18), 100);
    const maxAge = Math.max(Math.min(Math.floor(Number(req.query.maxAge)) || 100, 100), minAge);
    let interestedIn = String(req.query.interestedIn || '').trim().toLowerCase();
    if (!['men', 'women', 'everyone'].includes(interestedIn)) {
      const me = await db.collection('users').doc(uid).get();
      interestedIn = String((me.exists && (me.data() || {}).interestedIn) || 'everyone').toLowerCase();
    }
    const wantGenders = GENDERS_FOR[interestedIn] || null;

    const [outgoing, incoming, swipes] = await Promise.all([
      db.collection('blocks').where('blockedBy','==',uid).get(),
      db.collection('blocks').where('blockedUserId','==',uid).get(),
      db.collection('swipes').where('fromUserId','==',uid).get()
    ]);
    const excluded = new Set([uid]);
    outgoing.forEach(s => { const d=s.data()||{}; if(d.blockedUserId) excluded.add(String(d.blockedUserId)); });
    incoming.forEach(s => { const d=s.data()||{}; if(d.blockedBy) excluded.add(String(d.blockedBy)); });
    swipes.forEach(s => { const d=s.data()||{}; if(d.toUserId) excluded.add(String(d.toUserId)); });

    const users = [];
    let cursor = null;
    for (let page = 0; page < DISCOVERY_MAX_PAGES && users.length < limit; page++) {
      let q = db.collection('public_profiles').where('active','==',true)
        .orderBy(admin.firestore.FieldPath.documentId()).limit(DISCOVERY_PAGE);
      if (cursor) q = q.startAfter(cursor);
      const snap = await q.get();
      snap.forEach(doc => {
        if (users.length >= limit || excluded.has(doc.id) || doc.id.startsWith('live_')) return;
        const d = doc.data() || {}, age = Number(d.age);
        const userImage = String(d.image || d.avatar || (Array.isArray(d.photos) && d.photos[0]) || '');
        if (!userImage || !Number.isFinite(age) || age < minAge || age > maxAge || d.active !== true) return;
        const gender = String(d.gender || '').toLowerCase();
        if (wantGenders && gender && !wantGenders.includes(gender)) return;
        const userPhotos = Array.isArray(d.photos) && d.photos.length > 0 ? d.photos : (userImage ? [userImage] : []);
        users.push({id:doc.id,name:d.displayName||'User',age:Math.floor(age),bio:d.bio||'',gender:d.gender||'',image:userImage,photos:userPhotos,tags:Array.isArray(d.interests)?d.interests:[],city:d.city||'',...(d.voiceIntro&&d.voiceIntro.durationSeconds?{voiceIntro:{duration:d.voiceIntro.duration,hasAudio:true}}:{}),isRealUser:true});
      });
      if (snap.size < DISCOVERY_PAGE) break;
      cursor = snap.docs[snap.docs.length - 1];
    }
    res.json({success:true,users});
  } catch (err) {
    console.error('discovery error:', err.message);
    res.status(500).json({success:false,error:'Could not load discovery.'});
  }
});

// Accepts both the reasons the in-app report sheet actually sends
// ('inappropriate', 'spam', 'fake', 'harassment', 'other' — see script.js's
// reportUser()/submitReport()) and the extra categories the admin tooling
// supports, so the default pre-checked radio option never 400s.
const REPORT_REASONS = new Set(['inappropriate','spam','fake','harassment','scam','sexual','underage','violence','other']);

app.post('/reports', requireAuth, async (req, res) => {
  const reporterId=req.user.uid, reportedUserId=String(req.body.reportedUserId||'').trim();
  const reason=String(req.body.reason||'other').trim().toLowerCase(), details=String(req.body.details||'').trim().slice(0,2000);
  if(!reportedUserId || reportedUserId===reporterId || !REPORT_REASONS.has(reason)) return res.status(400).json({success:false,error:'Invalid report.'});
  if(!(await persistentRateLimit('reports:'+reporterId,10,60*60*1000))) return res.status(429).json({success:false,error:'Too many reports. Please try again later.'});
  try {
    const target=await db.collection('users').doc(reportedUserId).get();
    if(!target.exists) return res.status(404).json({success:false,error:'User not found.'});
    const targetData = target.data() || {};
    // reportedBy (not reporterId) is what GET /admin/reports reads back — keep
    // both in sync so the admin dashboard can actually show who filed it.
    const reportRef=db.collection('reports').doc(), blockRef=db.collection('blocks').doc(reporterId+'_'+reportedUserId), now=admin.firestore.FieldValue.serverTimestamp();
    await db.runTransaction(async tx => {
      tx.set(reportRef,{
        reportedBy: reporterId,
        reporterId,
        reportedUserId,
        reportedUserName: String(targetData.displayName || targetData.name || 'User').slice(0,120),
        reason,
        ...(details?{details}:{}),
        status:'open',
        createdAt:now
      });
      tx.set(blockRef,{blockedBy:reporterId,blockedUserId:reportedUserId,createdAt:now},{merge:true});
    });
    // Several reports against one person in a day is a moderation signal worth surfacing.
    securityEvent('user_reported', { req, target: reportedUserId, detail: { reason, reportedUserId } });
    res.json({success:true,reportId:reportRef.id,blocked:true});
  } catch(err) {
    console.error('report error:',err.message);
    res.status(500).json({success:false,error:'Could not submit the report.'});
  }
});

/*
 * Ending a conversation. Clients cannot delete the match or the other person's messages
 * (Firestore rules), so the in-app actions that promise this are done here:
 *   clear   - delete every message for both people; the match stays
 *   delete  - delete the match and everything in it for both people
 *   unmatch - delete, and record a block (kind 'unmatch') so neither side can message,
 *             call or re-match, and neither appears in the other's Discovery or search
 */
const END_MATCH_ACTIONS = new Set(['clear', 'delete', 'unmatch']);

app.post('/matches/end', requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const partnerId = String((req.body || {}).partnerId || '').trim();
  const action = String((req.body || {}).action || '').trim();
  if (!partnerId || partnerId === uid || partnerId.includes('/') || partnerId.includes('_') || !END_MATCH_ACTIONS.has(action)) {
    return res.status(400).json({ success: false, error: 'Invalid request.' });
  }
  if (!(await persistentRateLimit('end-match:' + uid, 30, 10 * 60 * 1000))) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  }
  try {
    const matchRef = db.collection('matches').doc([uid, partnerId].sort().join('_'));
    const now = admin.firestore.FieldValue.serverTimestamp();
    if (action === 'clear') {
      await deleteQueryDocs(matchRef.collection('messages'));
      const snap = await matchRef.get();
      if (snap.exists) await matchRef.set({ lastMessage: '', lastSender: '', clearedAt: now, lastUpdated: now }, { merge: true });
      return res.json({ success: true });
    }
    if (action === 'unmatch') {
      await db.collection('blocks').doc(uid + '_' + partnerId).set({ blockedBy: uid, blockedUserId: partnerId, kind: 'unmatch', createdAt: now }, { merge: true });
      await db.collection('swipes').doc(uid + '_' + partnerId).set({ fromUserId: uid, toUserId: partnerId, action: 'pass', unmatched: true, createdAt: now }, { merge: true }).catch(() => {});
    }
    await deleteDocumentTree(matchRef);
    return res.json({ success: true });
  } catch (err) {
    console.error('end match error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not update this conversation.' });
  }
});

app.post('/blocks', requireAuth, async (req, res) => {
  const uid=req.user.uid, blockedUserId=String(req.body.blockedUserId||'').trim();
  if(!blockedUserId || blockedUserId===uid) return res.status(400).json({success:false,error:'Invalid block.'});
  if(!(await persistentRateLimit('blocks:'+uid,30,10*60*1000))) return res.status(429).json({success:false,error:'Too many block requests.'});
  try {
    const target=await db.collection('users').doc(blockedUserId).get();
    if(!target.exists) return res.status(404).json({success:false,error:'User not found.'});
    await db.collection('blocks').doc(uid+'_'+blockedUserId).set({blockedBy:uid,blockedUserId,createdAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    const matchId = [uid, blockedUserId].sort().join('_');
    await db.collection('matches').doc(matchId).delete().catch(() => {});
    await db.collection('swipes').doc(uid + '_' + blockedUserId).set({
      fromUserId: uid,
      toUserId: blockedUserId,
      action: 'pass',
      blocked: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
    res.json({success:true});
  } catch(err) {
    console.error('block error:',err.message);
    res.status(500).json({success:false,error:'Could not block this user.'});
  }
});

app.delete('/blocks/:blockedUserId', requireAuth, async (req, res) => {
  if (!rateLimit('unblock:' + req.user.uid, 30, 10 * 60 * 1000)) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  const uid=req.user.uid, blockedUserId=String(req.params.blockedUserId||'').trim();
  if(!blockedUserId || blockedUserId===uid) return res.status(400).json({success:false,error:'Invalid unblock.'});
  try {
    await db.collection('blocks').doc(uid+'_'+blockedUserId).delete();
    res.json({success:true});
  } catch(err) {
    console.error('unblock error:',err.message);
    res.status(500).json({success:false,error:'Could not unblock this user.'});
  }
});

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
    const authenticatedEmail = String(req.user.email || '').trim().toLowerCase();
    const paidEmail = String(payment.customer?.email || '').trim().toLowerCase();
    const metadataFields = payment.metadata?.custom_fields || [];
    const metadataUserId = metadataFields.find(f => f.variable_name === 'user_id')?.value;
    const isOwnerByMetadata = Boolean(metadataUserId && metadataUserId === req.user.uid);
    const isOwnerByEmail = Boolean(authenticatedEmail && paidEmail && authenticatedEmail === paidEmail);
    if (!isOwnerByEmail && !isOwnerByMetadata) {
      res.locals.securityLogged = true;
      securityEvent('payment_mismatch', { req, detail: { reason: 'customer', reference: String(reference).slice(0, 60) } });
      return res.status(403).json({ success: false, error: 'Payment customer does not match the signed-in account.' });
    }
    const granted = await grantVip({
      reference,
      uid: req.user.uid,
      tier: Number(tier),
      payment
    });
    return res.json({ success: true, alreadyProcessed: !granted });
  } catch (err) {
    console.error('Payment verification error:', err.message);
    if (/amount or currency/i.test(err.message || '')) {
      securityEvent('payment_mismatch', { req, detail: { reason: 'amount', reference: String(reference).slice(0, 60), tier: Number(tier) } });
    }
    const safeError = err.message && !err.message.includes('sk_') && !err.message.includes('Bearer') && !err.message.includes('header')
      ? err.message
      : 'Payment could not be verified.';
    return res.status(400).json({ success: false, error: safeError });
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

  if (!rateLimit(`otp-send:${phone}`, 3, 10 * 60 * 1000) ||
      !rateLimit(`otp-send-ip:${req.ip}`, 10, 10 * 60 * 1000) ||
      !(await persistentRateLimit(`otp-send:${phone}`, 3, 10 * 60 * 1000)) ||
      !(await persistentRateLimit(`otp-send-ip:${req.ip}`, 10, 10 * 60 * 1000))) {
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
    securityEvent('otp_sent', { req, target: phone });
    securityEvent('otp_send_burst', { req });
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
  if (!rateLimit(`otp-verify:${phone}`, 5, 10 * 60 * 1000) ||
      !rateLimit(`otp-verify-ip:${req.ip}`, 20, 10 * 60 * 1000) ||
      !(await persistentRateLimit(`otp-verify:${phone}`, 5, 10 * 60 * 1000)) ||
      !(await persistentRateLimit(`otp-verify-ip:${req.ip}`, 20, 10 * 60 * 1000))) {
    return res.status(429).json({ success: false, error: 'Too many verification attempts.' });
  }

  try {
    const result = await verifyTermiiOtp(phone, otp);
    if (!result.ok) {
      securityEvent('otp_verify_failed', { req, target: phone });
      return res.status(400).json({ success: false, error: result.error });
    }

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
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      phone,
      phoneVerified: true
    }, { merge: true });

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
    if (!result.ok) {
      securityEvent('otp_verify_failed', { req, target: phone });
      return res.status(400).json({ success: false, error: result.error });
    }

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

/* Swipe writes are server-authoritative. This applies abuse limits and block checks. */
app.post('/swipes/record', requireAuth, async (req, res) => {
  const targetUserId = String(req.body?.targetUserId || '');
  const action = String(req.body?.action || '');
  if (!targetUserId || targetUserId === req.user.uid || !['like','pass','superlike'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Invalid swipe.' });
  }

  if (!rateLimit(`swipe-rate:${req.user.uid}`, 60, 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many swipes. Slow down and try again.' });
  }

  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const targetRef = db.collection('users').doc(targetUserId);
    const blockARef = db.collection('blocks').doc(req.user.uid + '_' + targetUserId);
    const blockBRef = db.collection('blocks').doc(targetUserId + '_' + req.user.uid);

    const todayKey = nigeriaDateKey();
    const counterRef = db.collection('swipe_daily').doc(req.user.uid + '_' + todayKey);

    const result = await db.runTransaction(async tx => {
      const [userSnap, targetSnap, blockASnap, blockBSnap, counterSnap] = await Promise.all([
        tx.get(userRef), tx.get(targetRef), tx.get(blockARef), tx.get(blockBRef), tx.get(counterRef)
      ]);

      if (!userSnap.exists || !targetSnap.exists) throw Object.assign(new Error('User not found.'), { code: 'USER_NOT_FOUND' });
      if (blockASnap.exists || blockBSnap.exists) throw Object.assign(new Error('Blocked user.'), { code: 'BLOCKED' });

      const userData = userSnap.data() || {};
      const vipActive = Boolean(
        userData.isVip &&
        userData.vipExpiry?.toDate &&
        userData.vipExpiry.toDate() > new Date()
      );

      const currentCount = counterSnap.exists ? Number(counterSnap.data().count || 0) : 0;
      if (!vipActive && currentCount >= DAILY_FREE_SWIPES) {
        return { limited: true };
      }

      const swipeRef = db.collection('swipes').doc();
      tx.set(swipeRef, {
        fromUserId: req.user.uid,
        toUserId: targetUserId,
        action,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      tx.set(counterRef, {
        uid: req.user.uid,
        day: todayKey,
        count: currentCount + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return { limited: false };
    });

    if (result.limited) {
      return res.status(429).json({
        success: false,
        limited: true,
        error: `Daily swipe limit reached. Free accounts can send up to ${DAILY_FREE_SWIPES} swipes per day.`
      });
    }

    let matched = false;
    let matchId = null;
    if (action === 'like' || action === 'superlike') {
      const reciprocal = await db.collection('swipes')
        .where('fromUserId', '==', targetUserId)
        .where('toUserId', '==', req.user.uid)
        .where('action', 'in', ['like', 'superlike'])
        .limit(1).get();

      if (!reciprocal.empty) {
        const blockA = await blockARef.get();
        const blockB = await blockBRef.get();
        if (blockA.exists || blockB.exists) {
          return res.json({ success: true, matched: false, blocked: true });
        }
        matchId = [req.user.uid, targetUserId].sort().join('_');
        try {
          await db.collection('matches').doc(matchId).create({
            users: [req.user.uid, targetUserId],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (err) {
          if (err.code !== 6) throw err;
        }
        matched = true;
      }
    }

    return res.json({ success: true, matched, matchId });
  } catch (err) {
    if (err.code === 'BLOCKED') return res.status(403).json({ success: false, error: 'You cannot interact with this user.' });
    if (err.code === 'USER_NOT_FOUND') return res.status(404).json({ success: false, error: 'User not found.' });
    console.error('Swipe recording error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not record swipe.' });
  }
});

/* FCM: all public trigger endpoints require a Firebase ID token. */
async function assertActiveMatchAccess(uid, partnerId, matchId) {
  const matchRef = db.collection('matches').doc(String(matchId));
  const [matchSnap, blockAB, blockBA] = await Promise.all([
    matchRef.get(),
    db.collection('blocks').doc(`${uid}_${partnerId}`).get(),
    db.collection('blocks').doc(`${partnerId}_${uid}`).get()
  ]);
  const users = matchSnap.data()?.users;
  if (!matchSnap.exists || !Array.isArray(users) || !users.includes(uid) || !users.includes(partnerId) || blockAB.exists || blockBA.exists) {
    const error = new Error('Match access denied.');
    error.code = 'MATCH_ACCESS_DENIED';
    throw error;
  }
  return matchSnap;
}

async function sendPushToUser(userId, { title, body, data = {} }) {
  const snap = await db.collection('fcm_tokens').doc(userId).collection('tokens').get();
  const tokenEntries = snap.docs
    .map(d => ({ docId: d.id, token: d.data().token }))
    .filter(item => item.token);
  if (!tokenEntries.length) return;

  const isIncomingCall = data?.type === 'incoming_call';
  const isCallEnded = data?.type === 'call_ended';

  const payload = {
    tokens: tokenEntries.map(item => item.token),
    data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [String(k), String(v)])),
    webpush: {
      headers: {
        Urgency: isIncomingCall ? 'high' : 'normal'
      },
      notification: isCallEnded ? undefined : {
        title: String(title).slice(0, 120),
        body: String(body || '').slice(0, 500),
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: isIncomingCall ? `call_${data.callId}` : (data?.matchId || 'hmbs-notif'),
        renotify: true,
        requireInteraction: isIncomingCall,
        vibrate: isIncomingCall ? [600, 300, 600, 300, 600, 300, 600] : [200, 100, 200],
        actions: isIncomingCall ? [
          { action: 'answer', title: 'Answer 📞' },
          { action: 'decline', title: 'Decline ✕' }
        ] : [
          { action: 'open', title: 'Open 💬' }
        ]
      },
      fcmOptions: {
        link: isIncomingCall ? `/#chat/${data.callerId || data.matchId}` : (data?.matchId ? `/#chat/${data.matchId}` : '/')
      }
    },
    android: {
      priority: isIncomingCall ? 'high' : 'normal',
      notification: isCallEnded ? undefined : {
        channelId: isIncomingCall ? 'calls' : 'messages',
        priority: isIncomingCall ? 'max' : 'default',
        defaultVibrateTimings: !isIncomingCall,
        vibrateTimingsMillis: isIncomingCall ? [0, 600, 300, 600, 300, 600] : undefined
      }
    }
  };

  if (!isCallEnded && title) {
    payload.notification = {
      title: String(title).slice(0, 120),
      body: String(body || '').slice(0, 500)
    };
  }

  const response = await admin.messaging().sendEachForMulticast(payload);

  for (let i = 0; i < response.responses.length; i++) {
    const err = response.responses[i].error;
    if (err?.code === 'messaging/registration-token-not-registered' ||
        err?.code === 'messaging/invalid-registration-token') {
      await db.collection('fcm_tokens').doc(userId).collection('tokens').doc(tokenEntries[i].docId).delete().catch(() => {});
    }
  }
}

app.post('/fcm/new-match', requireAuth, async (req, res) => {
  const matchedUserId = String(req.body?.matchedUserId || '');
  if (!matchedUserId || matchedUserId === req.user.uid) {
    return res.status(400).json({ error: 'A valid matchedUserId is required.' });
  }
  if (!rateLimit(`fcm-match:${req.user.uid}`, 20, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many notification requests.' });
  }

  try {
    const matchId = [req.user.uid, matchedUserId].sort().join('_');
    const [matchDoc, matchedUserDoc] = await Promise.all([
      db.collection('matches').doc(matchId).get(),
      db.collection('users').doc(matchedUserId).get()
    ]);
    const users = matchDoc.data()?.users;
    if (!matchDoc.exists || !Array.isArray(users) || !users.includes(req.user.uid) || !users.includes(matchedUserId)) {
      return res.status(403).json({ error: 'You are not part of this match.' });
    }

    const matchedUserName = matchedUserDoc.data()?.displayName || matchedUserDoc.data()?.name || 'someone';
    await Promise.all([
      sendPushToUser(req.user.uid, {
        title: '💕 New Match!',
        body: `You matched with ${String(matchedUserName).slice(0, 80)}! Say hello.`,
        data: { type: 'new_match', matchId: matchedUserId }
      }),
      sendPushToUser(matchedUserId, {
        title: '💕 New Match!',
        body: 'Someone liked you back! You have a new match.',
        data: { type: 'new_match', matchId: req.user.uid }
      })
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error('New-match push error:', err.message);
    res.status(500).json({ error: 'Could not send match notification.' });
  }
});

app.post('/fcm/new-message', requireAuth, async (req, res) => {
  const { toUserId, fromUserName, messageText, matchId } = req.body || {};
  if (!toUserId || !matchId) return res.status(400).json({ error: 'toUserId and matchId are required.' });
  if (!rateLimit(`fcm-message:${req.user.uid}`, 60, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many notification requests.' });
  }
  try {
    const partnerId = String(toUserId);
    await assertActiveMatchAccess(req.user.uid, partnerId, matchId);
    const senderDoc = await db.collection('users').doc(req.user.uid).get();
    const senderName = senderDoc.data()?.displayName || senderDoc.data()?.name || 'Your match';
    const preview = req.body?.messageText ? String(messageText).slice(0, 60) : '📷 Photo';
    await sendPushToUser(partnerId, {
      title: `💬 ${String(senderName).slice(0, 80)}`,
      body: preview,
      data: { type: 'new_message', matchId: String(matchId) }
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Message push error:', err.message);
    return res.status(500).json({ error: 'Could not send message notification.' });
  }
});

app.post('/fcm/incoming-call', requireAuth, async (req, res) => {
  if (!(await persistentRateLimit('call-push:' + req.user.uid, 20, 10 * 60 * 1000))) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  const { toUserId, callType, callId, matchId } = req.body || {};
  if (!toUserId || !matchId) return res.status(400).json({ error: 'toUserId and matchId are required.' });
  try {
    const partnerId = String(toUserId);
    await assertActiveMatchAccess(req.user.uid, partnerId, matchId);
    const callerDoc = await db.collection('users').doc(req.user.uid).get();
    const callerName = callerDoc.data()?.displayName || callerDoc.data()?.name || 'Your match';
    const isVideo = callType === 'video';
    const title = `${isVideo ? '📹 Incoming Video Call' : '📞 Incoming Voice Call'}`;
    const body = `${callerName} is calling you... Tap to answer!`;

    await sendPushToUser(partnerId, {
      title,
      body,
      data: {
        type: 'incoming_call',
        callType: String(callType || 'audio'),
        callId: String(callId || ''),
        matchId: String(matchId),
        callerId: req.user.uid,
        callerName: String(callerName)
      }
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Call push error:', err.message);
    return res.status(500).json({ error: 'Could not send call notification.' });
  }
});

app.post('/fcm/call-ended', requireAuth, async (req, res) => {
  if (!rateLimit('call-ended:' + req.user.uid, 40, 10 * 60 * 1000)) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  const { toUserId, callId } = req.body || {};
  if (!toUserId) return res.status(400).json({ error: 'toUserId is required.' });
  try {
    const partnerId = String(toUserId);
    if (!callId) return res.status(400).json({ error: 'callId is required.' });
    const callSnap = await db.collection('matches').where('users', 'array-contains', req.user.uid).limit(50).get();
    const match = callSnap.docs.find(doc => doc.data()?.users?.includes(partnerId));
    if (!match) return res.status(403).json({ error: 'You are not in an active match with this user.' });
    await assertActiveMatchAccess(req.user.uid, partnerId, match.id);
    await sendPushToUser(partnerId, {
      title: 'Call Ended',
      body: 'The call was ended or missed.',
      data: {
        type: 'call_ended',
        callId: String(callId || '')
      }
    });
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false });
  }
});

app.post('/stories/cleanup', async (req, res) => {
  if (!rateLimit('cleanup:' + req.ip, 10, 60 * 1000)) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  // Fail closed: with CLEANUP_SECRET unset, an empty header must not match.
  const providedSecret = Buffer.from(String(req.headers['x-cleanup-secret'] || ''));
  const expectedSecret = Buffer.from(CLEANUP_SECRET);
  if (!CLEANUP_SECRET || providedSecret.length !== expectedSecret.length ||
      !crypto.timingSafeEqual(providedSecret, expectedSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection('stories').where('expiresAt', '<=', now).limit(100).get();
    if (snap.empty) return res.json({ success: true, deleted: 0 });
    const bucket = getStorageBucket();
    await Promise.all(snap.docs.map(async doc => {
      const storagePath = String(doc.data()?.storagePath || '');
      if (storagePath) {
        await bucket.file(storagePath).delete({ ignoreNotFound: true }).catch(err => {
          console.warn('Story media cleanup warning:', err.message);
        });
      }
    }));

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
  if (!(await persistentRateLimit('turn:' + _req.user.uid, 30, 10 * 60 * 1000))) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  const fallbackServers = [
    { urls: "stun:stun.relay.metered.ca:80" },
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ];
  if (!METERED_API_KEY || !METERED_DOMAIN) {
    return res.json(fallbackServers);
  }
  try {
    const response = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${encodeURIComponent(METERED_API_KEY)}`);
    if (!response.ok) throw new Error(`Metered returned ${response.status}`);
    const servers = await response.json();
    if (!Array.isArray(servers) || !servers.some(sv => [].concat(sv.urls || sv.url || []).some(u => /^turns?:/i.test(u)))) {
      throw new Error('Metered response contained no TURN relay servers');
    }
    res.json(servers);
  } catch (err) {
    // Without a relay, calls between different networks connect but carry no audio or video.
    console.error('TURN credentials unavailable, serving STUN only:', err.message);
    return res.json(fallbackServers);
  }
});

async function deleteQueryDocs(query) {
  while (true) {
    const snap = await query.limit(450).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < 450) return;
  }
}

async function deleteDocumentTree(ref) {
  const collections = await ref.listCollections();
  for (const collection of collections) {
    const docs = await collection.get();
    for (const doc of docs.docs) {
      await deleteDocumentTree(doc.ref);
    }
  }
  await ref.delete().catch(err => {
    if (err.code !== 5) throw err;
  });
}

async function deleteStoragePrefixes(prefixes) {
  const bucket = getStorageBucket();
  for (const prefix of prefixes) {
    let files;
    try {
      [files] = await bucket.getFiles({ prefix });
    } catch (err) {
      // 404 = the bucket itself does not exist (Storage never provisioned), so there
      // is no media to delete. Anything else is a real failure and must surface.
      if (err && err.code === 404) continue;
      throw err;
    }
    await Promise.all(files.map(file => file.delete({ ignoreNotFound: true })));
  }
}

app.post('/account/delete', requireAuth, async (req, res) => {
  const uid = req.user.uid;
  if (!rateLimit(`account-delete:${uid}`, 1, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Account deletion already requested. Please wait.' });
  }

  try {
    // Remove user-owned collections and personal match trees.
    await deleteQueryDocs(db.collection('stories').where('ownerId', '==', uid));
    await deleteQueryDocs(db.collection('swipes').where('fromUserId', '==', uid));
    await deleteQueryDocs(db.collection('swipes').where('toUserId', '==', uid));
    await deleteQueryDocs(db.collection('blocks').where('blockedBy', '==', uid));
    await deleteQueryDocs(db.collection('blocks').where('blockedUserId', '==', uid));
    await deleteQueryDocs(db.collection('reports').where('reportedBy', '==', uid));
    await deleteQueryDocs(db.collection('reports').where('reportedUserId', '==', uid));
    await deleteQueryDocs(db.collection('fcm_tokens').doc(uid).collection('tokens'));

    const matches = await db.collection('matches').where('users', 'array-contains', uid).get();
    const matchMediaPrefixes = matches.docs.map(match => `chat_media/${match.id}/`);
    for (const match of matches.docs) {
      await deleteDocumentTree(match.ref);
    }

    await Promise.all([
      db.collection('users').doc(uid).delete().catch(err => { if (err.code !== 5) throw err; }),
      db.collection('public_profiles').doc(uid).delete().catch(err => { if (err.code !== 5) throw err; }),
      db.collection('voice_intros').doc(uid).delete().catch(err => { if (err.code !== 5) throw err; }),
      deleteStoragePrefixes([`stories/${uid}/`, `voicenotes/${uid}/`, `voice_intros/${uid}/`, ...matchMediaPrefixes])
    ]);

    // Delete the Auth account last so a partial cleanup can be retried safely.
    await admin.auth().deleteUser(uid);
    securityEvent('account_deleted', { req, uid });

    return res.json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err.message);
    return res.status(500).json({ error: 'Could not completely delete the account. Please contact support.' });
  }
});

/* Public profile migration — safe fields only */
app.post('/admin/migrate-public-profiles', requireAuth, requireAdmin, async (req, res) => {
  if (!rateLimit(`admin-migrate-profiles:${req.user.uid}`, 2, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Migration already requested recently.' });
  }

  try {
    const snap = await db.collection('users').get();
    let batch = db.batch();
    let writes = 0;
    let migrated = 0;

    const commit = async () => {
      if (writes) {
        await batch.commit();
        batch = db.batch();
        writes = 0;
      }
    };

    for (const doc of snap.docs) {
      const d = doc.data() || {};
      if (!d.name && !d.displayName) continue;

      const publicRef = db.collection('public_profiles').doc(doc.id);
      batch.set(publicRef, {
        id: doc.id,
        name: d.name || d.displayName || 'User',
        displayName: d.displayName || d.name || 'User',
        searchKeys: profileSearchKeys(d.displayName || d.name),
        // Never invent an age: Discovery and search drop profiles without a real adult age.
        ...(Number.isFinite(Number(d.age)) && Number(d.age) >= 18 ? { age: Math.floor(Number(d.age)) } : {}),
        bio: String(d.bio || '').slice(0, 2000),
        gender: d.gender || '',
        interests: Array.isArray(d.interests) ? d.interests.slice(0, 30) : [],
        city: String(d.city || '').slice(0, 120),
        image: d.image || d.avatar || '',
        avatar: d.avatar || d.image || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      writes++;
      migrated++;
      if (writes >= 450) await commit();
    }
    await commit();

    securityEvent('admin_action', { req, detail: { action: 'migrate_public_profiles' } });
    return res.json({ success: true, migrated });
  } catch (err) {
    console.error('Public profile migration error:', err.message);
    return res.status(500).json({ error: 'Could not migrate public profiles.' });
  }
});

/* Admin moderation */
app.get('/admin/reports', requireAuth, requireAdmin, async (req, res) => {
  if (!rateLimit(`admin-reports:${req.user.uid}`, 30, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many admin requests.' });
  }
  try {
    const snap = await db.collection('reports').limit(100).get();
    const statusFilter = req.query?.status ? String(req.query.status) : '';
    const reports = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(report => !statusFilter || report.status === statusFilter)
      .sort((a, b) => {
        const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      })
      .map(report => ({
        id: report.id,
        reportedBy: report.reportedBy || '',
        reportedUserId: report.reportedUserId || '',
        reportedUserName: report.reportedUserName || 'User',
        reason: report.reason || 'other',
        status: report.status || 'open',
        createdAt: report.createdAt?.toDate ? report.createdAt.toDate().toISOString() : null,
        reviewedAt: report.reviewedAt?.toDate ? report.reviewedAt.toDate().toISOString() : null,
        adminNote: report.adminNote || ''
      }));
    return res.json({ success: true, reports });
  } catch (err) {
    console.error('Admin report list error:', err.message);
    return res.status(500).json({ error: 'Could not load reports.' });
  }
});

app.post('/admin/reports/update', requireAuth, requireAdmin, async (req, res) => {
  const reportId = String(req.body?.reportId || '');
  const status = String(req.body?.status || '');
  const adminNote = String(req.body?.adminNote || '').slice(0, 1000);
  if (!reportId || !['open','reviewing','resolved','dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid report update.' });
  }
  if (!rateLimit(`admin-update:${req.user.uid}`, 60, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many admin updates.' });
  }
  try {
    await db.collection('reports').doc(reportId).update({
      status,
      adminNote,
      reviewedBy: req.user.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    securityEvent('admin_action', { req, detail: { action: 'report_update', reportId: String(req.body?.reportId || ''), status: String(req.body?.status || '') } });
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin report update error:', err.message);
    return res.status(500).json({ error: 'Could not update report.' });
  }
});

app.post('/admin/users/suspend', requireAuth, requireAdmin, async (req, res) => {
  if (!rateLimit('admin-suspend:' + req.user.uid, 60, 10 * 60 * 1000)) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  const targetUid = String(req.body?.userId || '');
  const reason = String(req.body?.reason || 'Policy violation').slice(0, 500);
  if (!targetUid || targetUid === req.user.uid) {
    return res.status(400).json({ error: 'Invalid target user.' });
  }
  try {
    await admin.auth().updateUser(targetUid, { disabled: true });
    await admin.auth().revokeRefreshTokens(targetUid).catch(() => {});
    await db.collection('users').doc(targetUid).set({
      suspended: true,
      accountStatus: 'suspended',
      suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      suspensionReason: reason
    }, { merge: true });
    await db.collection('public_profiles').doc(targetUid).set({ active: false }, { merge: true }).catch(() => {});
    securityEvent('admin_action', { req, target: targetUid, detail: { action: 'suspend_user', targetUid } });
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin suspension error:', err.message);
    return res.status(500).json({ error: 'Could not suspend user.' });
  }
});

app.post('/admin/users/unsuspend', requireAuth, requireAdmin, async (req, res) => {
  if (!rateLimit('admin-unsuspend:' + req.user.uid, 60, 10 * 60 * 1000)) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  const targetUid = String(req.body?.userId || '');
  if (!targetUid) return res.status(400).json({ error: 'Invalid target user.' });
  try {
    await admin.auth().updateUser(targetUid, { disabled: false });
    await db.collection('users').doc(targetUid).set({
      suspended: false,
      accountStatus: 'active',
      unsuspendedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await db.collection('public_profiles').doc(targetUid).set({ active: true }, { merge: true }).catch(() => {});
    securityEvent('admin_action', { req, target: targetUid, detail: { action: 'unsuspend_user', targetUid } });
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin unsuspension error:', err.message);
    return res.status(500).json({ error: 'Could not restore user.' });
  }
});

/* Security monitoring for admins: open alerts and the recent event log. */
const SECURITY_SEVERITIES = ['info', 'low', 'medium', 'high'];

function securityDocOut(doc) {
  const d = doc.data() || {};
  const ts = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : (typeof v === 'number' ? v : null));
  return {
    id: doc.id, type: d.type, severity: d.severity, uid: d.uid || null, ipHash: d.ipHash || null,
    targetHash: d.targetHash || null, path: d.path || null, method: d.method || null, detail: d.detail || {},
    count: d.count || null, summary: d.summary || null, status: d.status || null,
    createdAt: ts(d.createdAt), firstSeenAt: ts(d.firstSeenAt), lastSeenAt: ts(d.lastSeenAt),
    acknowledgedBy: d.acknowledgedBy || null,
  };
}

app.get('/admin/security', requireAuth, requireAdmin, async (req, res) => {
  if (!rateLimit(`admin-security:${req.user.uid}`, 60, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests.' });
  }
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
    const minSeverity = SECURITY_SEVERITIES.includes(String(req.query.minSeverity)) ? String(req.query.minSeverity) : 'low';
    const keep = (x) => SECURITY_SEVERITIES.indexOf(x.severity) >= SECURITY_SEVERITIES.indexOf(minSeverity);
    const [alerts, events] = await Promise.all([
      db.collection('security_alerts').where('status', '==', 'open').limit(200).get(),
      db.collection('security_events').orderBy('createdAt', 'desc').limit(limit).get(),
    ]);
    const byTime = (a, b) => (b.lastSeenAt || b.createdAt || 0) - (a.lastSeenAt || a.createdAt || 0);
    return res.json({
      alerts: alerts.docs.map(securityDocOut).sort(byTime),
      events: events.docs.map(securityDocOut).filter(e => keep(e) || e.type === 'admin_action'),
    });
  } catch (err) {
    console.error('Admin security fetch error:', err.message);
    return res.status(500).json({ error: 'Could not load security activity.' });
  }
});

app.post('/admin/security/alerts/ack', requireAuth, requireAdmin, async (req, res) => {
  const alertId = String(req.body?.alertId || '');
  if (!/^[a-f0-9]{32}$/.test(alertId)) return res.status(400).json({ error: 'Invalid alert.' });
  try {
    const ref = db.collection('security_alerts').doc(alertId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Alert not found.' });
    await ref.set({ status: 'acknowledged', acknowledgedBy: req.user.uid, acknowledgedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    securityEvent('admin_action', { req, detail: { action: 'acknowledge_alert', alertId } });
    return res.json({ success: true });
  } catch (err) {
    console.error('Alert acknowledge error:', err.message);
    return res.status(500).json({ error: 'Could not update the alert.' });
  }
});

let _healthProbeAt = 0;
app.get('/health', async (req, res) => {
  if (!rateLimit('health:' + req.ip, 30, 60 * 1000)) return res.status(429).json({ ok: false, error: 'Too many requests.' });
  try {
    // Public endpoint: probe Firestore at most every 30 s.
    if (Date.now() - _healthProbeAt > 30 * 1000) {
      await db.collection('users').limit(1).get();
      _healthProbeAt = Date.now();
    }
    return res.json({
      ok: true,
      service: 'hookmebysam-backend',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        firebase: true,
        paystack: Boolean(PAYSTACK_SECRET_KEY),
        termii: Boolean(TERMII_API_KEY),
        storage: Boolean(FIREBASE_STORAGE_BUCKET),
        turn: Boolean(METERED_API_KEY && METERED_DOMAIN)
      }
    });
  } catch (err) {
    console.error('Health check failed:', err.message);
    return res.status(503).json({
      ok: false,
      service: 'hookmebysam-backend',
      timestamp: new Date().toISOString()
    });
  }
});
app.get('/', (_req, res) => res.json({ service: 'hookmebysam backend', status: 'online' }));

// Unknown routes and errors return plain JSON. Express's default handler would send an
// HTML page with the stack trace whenever NODE_ENV isn't "production" (it isn't set here),
// e.g. for a request with malformed JSON.
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    return res.status(400).json({ error: 'Malformed request body.' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large.' });
  }
  console.error('Unhandled error:', err && err.message);
  return res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => console.log(`hookmebysam backend listening on port ${PORT}`));
