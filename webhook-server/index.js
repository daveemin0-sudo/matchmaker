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
const METERED_DOMAIN = (process.env.METERED_DOMAIN || '').trim().replace(/[\r\n\t]/g, '');
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

app.use(express.json({
  limit: '15mb',
  verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); }
}));
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isLocalOrigin = origin && (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('0.0.0.0')
  );
  const isVercelOrigin = origin && (
    origin.endsWith('.vercel.app') ||
    origin.includes('vercel.app')
  );
  const originAllowed = !origin || !ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes(origin) || isLocalOrigin || isVercelOrigin;

  if (origin && originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Cleanup-Secret');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (origin && !originAllowed) {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }
  next();
});

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
    const paidEmail = String(payment.customer?.email || '').trim().toLowerCase();
    const userRecord = await admin.auth().getUser(String(userId));
    const accountEmail = String(userRecord.email || '').trim().toLowerCase();
    if (!paidEmail || !accountEmail || paidEmail !== accountEmail) {
      console.warn('Paystack webhook ignored because payment customer does not match Firebase account:', reference);
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
app.get('/profiles/me', requireAuth, async (req, res) => {
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
    await admin.auth().updateUser(target.uid, {
      emailVerified: true,
      providerToLink: { providerId: 'google.com', uid: googleInfo.uid }
    });

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
    if (!snap.exists) return res.status(404).json({ success:false, error:'Profile not found.' });
    const d = snap.data() || {};
    const age = Number(d.age);
    if (!Number.isFinite(age) || age < 18 || age > 100) return res.status(400).json({ success:false, error:'An adult profile age (18+) is required.' });
    const city = String(d.city || '').trim().slice(0,80);
    await db.collection('public_profiles').doc(uid).set({
      id: uid, displayName: String(d.displayName || d.name || 'User').slice(0,80),
      age: Math.floor(age), gender: String(d.gender || '').slice(0,40),
      bio: String(d.bio || '').slice(0,1000),
      interests: Array.isArray(d.interests) ? d.interests.slice(0,30).map(v => String(v).slice(0,40)) : [],
      image: String(d.image || d.avatar || ''), ...(city ? {city} : {}),
      active: d.accountStatus !== 'suspended' && !d.deletedAt,
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
app.post('/media/upload', requireAuth, async (req, res) => {
  try {
    const { dataBase64, contentType, path, fileName } = req.body || {};
    if (!dataBase64) {
      return res.status(400).json({ success: false, error: 'dataBase64 is required.' });
    }
    const uid = req.user.uid;
    const safePath = String(path || 'chat_media').replace(/[^a-zA-Z0-9_\-\/]/g, '');
    const cleanContentType = String(contentType || 'audio/webm').split(';')[0];

    // Verify user is authorized for chat_media path
    if (safePath.startsWith('chat_media/')) {
      const matchId = safePath.split('/')[1] || '';
      const participants = matchId.split('_');
      if (!participants.includes(uid)) {
        return res.status(403).json({ success: false, error: 'Unauthorized path.' });
      }
    }

    // Strip data URL prefix if present
    const rawBase64 = dataBase64.includes(';base64,') ? dataBase64.split(';base64,')[1] : dataBase64;
    const buffer = Buffer.from(rawBase64, 'base64');

    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File size exceeds 15MB limit.' });
    }

    let downloadUrl = null;
    try {
      const bucketName = FIREBASE_STORAGE_BUCKET || admin.storage().bucket().name || `${process.env.FIREBASE_PROJECT_ID || 'hookmebysam'}.firebasestorage.app`;
      const bucket = admin.storage().bucket(bucketName);
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

app.get('/discovery', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    if (!(await persistentRateLimit('discovery:' + uid, 30, 60 * 1000))) return res.status(429).json({success:false,error:'Too many discovery requests. Please slow down.'});
    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 60);
    const [outgoing, incoming, swipes, profiles] = await Promise.all([
      db.collection('blocks').where('blockedBy','==',uid).get(),
      db.collection('blocks').where('blockedUserId','==',uid).get(),
      db.collection('swipes').where('fromUserId','==',uid).get(),
      db.collection('public_profiles').where('active','==',true).limit(200).get()
    ]);
    const excluded = new Set([uid]);
    outgoing.forEach(s => { const d=s.data()||{}; if(d.blockedUserId) excluded.add(String(d.blockedUserId)); });
    incoming.forEach(s => { const d=s.data()||{}; if(d.blockedBy) excluded.add(String(d.blockedBy)); });
    swipes.forEach(s => { const d=s.data()||{}; if(d.toUserId) excluded.add(String(d.toUserId)); });
    const users=[];
    profiles.forEach(doc => {
      if(users.length>=limit || excluded.has(doc.id)) return;
      const d=doc.data()||{}, age=Number(d.age);
      if(!d.image || !Number.isFinite(age) || age<18 || d.active!==true) return;
      const userPhotos = Array.isArray(d.photos) && d.photos.length > 0 ? d.photos : (d.image ? [d.image] : []);
      users.push({id:doc.id,name:d.displayName||'User',age:Math.floor(age),bio:d.bio||'',gender:d.gender||'',image:d.image,photos:userPhotos,tags:Array.isArray(d.interests)?d.interests:[],city:d.city||'',isRealUser:true});
    });
    res.json({success:true,users});
  } catch (err) {
    console.error('discovery error:', err.message);
    res.status(500).json({success:false,error:'Could not load discovery.'});
  }
});

app.post('/reports', requireAuth, async (req, res) => {
  const reporterId=req.user.uid, reportedUserId=String(req.body.reportedUserId||'').trim();
  const reason=String(req.body.reason||'other').trim().toLowerCase(), details=String(req.body.details||'').trim().slice(0,2000);
  if(!reportedUserId || reportedUserId===reporterId || !new Set(['fake','harassment','scam','sexual','underage','violence','other']).has(reason)) return res.status(400).json({success:false,error:'Invalid report.'});
  if(!(await persistentRateLimit('reports:'+reporterId,10,60*60*1000))) return res.status(429).json({success:false,error:'Too many reports. Please try again later.'});
  try {
    const target=await db.collection('users').doc(reportedUserId).get();
    if(!target.exists) return res.status(404).json({success:false,error:'User not found.'});
    const reportRef=db.collection('reports').doc(), blockRef=db.collection('blocks').doc(reporterId+'_'+reportedUserId), now=admin.firestore.FieldValue.serverTimestamp();
    await db.runTransaction(async tx => {
      tx.set(reportRef,{reporterId,reportedUserId,reason,...(details?{details}:{}),status:'open',createdAt:now});
      tx.set(blockRef,{blockedBy:reporterId,blockedUserId:reportedUserId,createdAt:now},{merge:true});
    });
    res.json({success:true,reportId:reportRef.id,blocked:true});
  } catch(err) {
    console.error('report error:',err.message);
    res.status(500).json({success:false,error:'Could not submit the report.'});
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
  if (req.headers['x-cleanup-secret'] !== CLEANUP_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection('stories').where('expiresAt', '<=', now).limit(100).get();
    if (snap.empty) return res.json({ success: true, deleted: 0 });
    const bucket = admin.storage().bucket();
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
    res.json(await response.json());
  } catch (err) {
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
  const bucket = admin.storage().bucket();
  for (const prefix of prefixes) {
    const [files] = await bucket.getFiles({ prefix });
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
      deleteStoragePrefixes([`stories/${uid}/`, `voicenotes/${uid}/`, ...matchMediaPrefixes])
    ]);

    // Delete the Auth account last so a partial cleanup can be retried safely.
    await admin.auth().deleteUser(uid);

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
        age: Number(d.age || 24),
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

    return res.json({ success: true, migrated });
  } catch (err) {
    console.error('Public profile migration error:', err.message);
    return res.status(500).json({ error: 'Could not migrate public profiles.' });
  }
});

/* User reports */
app.post('/reports', requireAuth, async (req, res) => {
  const reportedUserId = String(req.body?.reportedUserId || '');
  const reason = String(req.body?.reason || '');
  if (!reportedUserId || reportedUserId === req.user.uid || !['inappropriate','spam','fake','harassment','other'].includes(reason)) {
    return res.status(400).json({ success: false, error: 'Invalid report.' });
  }
  if (!rateLimit(`report:${req.user.uid}`, 10, 10 * 60 * 1000) ||
      !(await persistentRateLimit(`report:${req.user.uid}`, 10, 10 * 60 * 1000))) {
    return res.status(429).json({ success: false, error: 'Too many reports. Please try again later.' });
  }

  try {
    const targetRef = db.collection('users').doc(reportedUserId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) return res.status(404).json({ success: false, error: 'Reported user was not found.' });

    const target = targetSnap.data() || {};
    const reportRef = await db.collection('reports').add({
      reportedBy: req.user.uid,
      reportedUserId,
      reportedUserName: String(target.displayName || target.name || 'User').slice(0, 120),
      reason,
      status: 'open',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return res.json({ success: true, reportId: reportRef.id });
  } catch (err) {
    console.error('Report creation error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not submit the report.' });
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
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin report update error:', err.message);
    return res.status(500).json({ error: 'Could not update report.' });
  }
});

app.post('/admin/users/suspend', requireAuth, requireAdmin, async (req, res) => {
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
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin suspension error:', err.message);
    return res.status(500).json({ error: 'Could not suspend user.' });
  }
});

app.post('/admin/users/unsuspend', requireAuth, requireAdmin, async (req, res) => {
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
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin unsuspension error:', err.message);
    return res.status(500).json({ error: 'Could not restore user.' });
  }
});

app.post('/admin/migrate-public-profiles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('users').get();
    let count = 0;
    const batch = db.batch();
    snap.forEach(doc => {
      const u = doc.data();
      const pRef = db.collection('public_profiles').doc(doc.id);
      batch.set(pRef, {
        id: doc.id,
        name: u.displayName || u.name || 'User',
        displayName: u.displayName || u.name || 'User',
        age: u.age || 24,
        bio: u.bio || '',
        gender: u.gender || '',
        interests: u.interests || [],
        city: u.city || '',
        image: u.image || u.avatar || '',
        avatar: u.avatar || u.image || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      count++;
    });
    await batch.commit();
    return res.json({ success: true, migrated: count });
  } catch (err) {
    console.error('Migrate public profiles error:', err.message);
    return res.status(500).json({ error: 'Migration failed: ' + err.message });
  }
});

app.get('/health', async (_req, res) => {
  try {
    await db.collection('users').limit(1).get();
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

app.listen(PORT, () => console.log(`hookmebysam backend listening on port ${PORT}`));
