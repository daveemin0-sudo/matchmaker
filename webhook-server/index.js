/* ==========================================================
   hookmebysam — Production Webhook Server
   Stack: Node.js + Express + Firebase Admin SDK
   Handles: Paystack payment webhooks + Termii OTP
   ==========================================================
   SETUP:
     1. cd webhook-server
     2. npm install
     3. Add your keys to .env (see .env.example)
     4. node index.js
   ========================================================== */

require('dotenv').config();
const express  = require('express');
const crypto   = require('crypto');
const admin    = require('firebase-admin');
const fetch    = require('node-fetch');

const app = express();

/* ----------------------------------------------------------
   Firebase Admin SDK — initialize with service account
   Supports:
   1. FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON in env)
   2. FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 string in env)
   3. Local ./serviceAccountKey.json file
   ---------------------------------------------------------- */
let serviceAccount = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const raw = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(raw);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    try {
      serviceAccount = require('./serviceAccountKey.json');
    } catch (_) {
      // file not present
    }
  }
} catch (e) {
  console.warn('⚠️  Could not parse Firebase service account credentials:', e.message);
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_PROJECT_ID ? `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com` : undefined
  });
} else {
  try {
    admin.initializeApp();
    console.log('ℹ️  Firebase Admin initialized with default application credentials.');
  } catch (e) {
    console.warn('⚠️  Firebase Admin initialized without credentials (database write operations will require service credentials).');
  }
}
const db = admin.firestore();

/* ----------------------------------------------------------
   Middleware
   ---------------------------------------------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for your frontend domain
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

/* ==========================================================
   PAYSTACK WEBHOOK — Auto-unlock VIP on payment confirmation
   ========================================================== */
app.post('/webhook/paystack', async (req, res) => {
  // 1. Verify webhook signature (security: only accept from Paystack)
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.warn('⚠️  Invalid Paystack signature — rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  console.log('📦 Paystack event:', event.event, event.data?.reference);

  // 2. Handle successful charge
  if (event.event === 'charge.success') {
    const { reference, customer, metadata, amount } = event.data;

    const userId  = metadata?.custom_fields?.find(f => f.variable_name === 'user_id')?.value;
    const planName = metadata?.custom_fields?.find(f => f.variable_name === 'plan_name')?.value || '1 Month VIP Gold';

    if (!userId) {
      console.warn('⚠️  No userId in metadata, skipping VIP unlock');
      return res.status(200).json({ received: true });
    }

    // 3. Calculate VIP expiry date
    const expiryDate = getVipExpiry(planName);

    // 4. Update Firestore — unlock VIP for the user
    await db.collection('users').doc(userId).update({
      isVip: true,
      vipPlan: planName,
      vipExpiry: expiryDate,
      vipActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paystackReference: reference,
      paystackEmail: customer.email,
      paystackAmount: amount / 100, // Convert from kobo to Naira
    });

    console.log(`✅ VIP unlocked for user: ${userId} | Plan: ${planName} | Expires: ${expiryDate.toDateString()}`);
  }

  // 5. Handle subscription creation (for recurring plans)
  if (event.event === 'subscription.create') {
    console.log('🔄 Subscription created:', event.data?.subscription_code);
    // Store subscription code for future cancellations
  }

  res.status(200).json({ received: true });
});

function getVipExpiry(planName) {
  const now = new Date();
  if (planName.includes('Week')) {
    return new Date(now.setDate(now.getDate() + 7));
  } else if (planName.includes('Month') && planName.includes('3')) {
    return new Date(now.setMonth(now.getMonth() + 3));
  } else if (planName.includes('Lifetime')) {
    return new Date('2099-12-31'); // Effectively permanent
  } else {
    // Default: 1 Month
    return new Date(now.setMonth(now.getMonth() + 1));
  }
}

/* ==========================================================
   PAYSTACK DIRECT VERIFICATION — Server-side transaction check
   ========================================================== */
app.post('/paystack/verify', async (req, res) => {
  const { reference, planName, userId } = req.body;

  if (!reference || !userId) {
    return res.status(400).json({ success: false, error: 'Reference and userId are required.' });
  }

  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      // In dev mode without secret key, log warning and allow fallback if needed
      console.warn('⚠️  PAYSTACK_SECRET_KEY not set in .env — skipping remote API call');
    }

    let verified = false;
    let customerEmail = '';
    let paidAmount = 0;

    if (paystackSecret) {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok && data.status && data.data?.status === 'success') {
        verified = true;
        customerEmail = data.data.customer?.email || '';
        paidAmount = (data.data.amount || 0) / 100;
      } else {
        console.error('Paystack verification returned failure:', data);
        return res.status(400).json({ success: false, error: data.message || 'Transaction not verified.' });
      }
    } else {
      // Dev mode fallback
      verified = true;
    }

    if (verified) {
      const plan = planName || 'VIP Gold';
      const expiryDate = getVipExpiry(plan);

      await db.collection('users').doc(userId).update({
        isVip: true,
        vipPlan: plan,
        vipExpiry: expiryDate,
        vipActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        paystackReference: reference,
        paystackEmail: customerEmail,
        paystackAmount: paidAmount
      });

      console.log(`✅ VIP unlocked via backend verification for user ${userId} | Ref: ${reference}`);
      return res.json({
        success: true,
        isVip: true,
        vipPlan: plan,
        vipExpiry: expiryDate.toISOString(),
        reference
      });
    }
  } catch (err) {
    console.error('Paystack verify endpoint error:', err);
    return res.status(500).json({ success: false, error: 'Server verification error.' });
  }
});

/* ==========================================================
   TERMII OTP — Nigerian Phone Number SMS Verification
   ========================================================== */

// Send OTP to phone number
app.post('/auth/send-otp', async (req, res) => {
  const { phone } = req.body;

  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  // Normalize Nigerian phone numbers (080... → +234...)
  const normalizedPhone = normalizeNigerianPhone(phone);

  try {
    const response = await fetch('https://api.ng.termii.com/api/sms/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TERMII_API_KEY,
        message_type: 'NUMERIC',
        to: normalizedPhone,
        from: 'hookmebysam', // Your registered Sender ID on Termii
        channel: 'generic',
        pin_attempts: 3,
        pin_time_to_live: 5,    // OTP expires in 5 minutes
        pin_length: 6,
        pin_placeholder: '< 1234 >',
        message_text: 'Your hookmebysam verification code is < 1234 >. Valid for 5 minutes.',
        pin_type: 'NUMERIC'
      })
    });

    const data = await response.json();

    if (data.pinId) {
      // Store pinId in Firestore (needed to verify later)
      await db.collection('otp_requests').doc(normalizedPhone).set({
        pinId: data.pinId,
        phone: normalizedPhone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        verified: false
      });

      console.log(`📱 OTP sent to ${normalizedPhone}`);
      res.json({ success: true, message: 'OTP sent successfully' });
    } else {
      console.error('Termii error:', data);
      res.status(500).json({ error: 'Failed to send OTP. Try again.' });
    }
  } catch (err) {
    console.error('Termii network error:', err);
    res.status(500).json({ error: 'Network error sending OTP' });
  }
});

// Verify OTP
app.post('/auth/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  const normalizedPhone = normalizeNigerianPhone(phone);

  // Get the pinId from Firestore
  const otpDoc = await db.collection('otp_requests').doc(normalizedPhone).get();
  if (!otpDoc.exists) return res.status(404).json({ error: 'OTP request not found. Request a new code.' });

  const { pinId } = otpDoc.data();

  try {
    const response = await fetch('https://api.ng.termii.com/api/sms/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TERMII_API_KEY,
        pin_id: pinId,
        pin: otp
      })
    });

    const data = await response.json();

    if (data.verified === 'True') {
      // Mark as verified in Firestore
      await db.collection('otp_requests').doc(normalizedPhone).update({ verified: true });

      // Create or sign in user with Firebase Custom Token
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByPhoneNumber(normalizedPhone);
      } catch (_) {
        // User doesn't exist yet — create them
        userRecord = await admin.auth().createUser({ phoneNumber: normalizedPhone });
        await db.collection('users').doc(userRecord.uid).set({
          id: userRecord.uid,
          phone: normalizedPhone,
          isVip: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      const customToken = await admin.auth().createCustomToken(userRecord.uid);
      console.log(`✅ OTP verified for ${normalizedPhone}`);
      res.json({ success: true, token: customToken, uid: userRecord.uid });
    } else {
      res.status(400).json({ error: 'Incorrect OTP. Please try again.' });
    }
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Verification failed. Try again.' });
  }
});

// Normalize Nigerian phone numbers to E.164 format (+234...)
function normalizeNigerianPhone(phone) {
  let p = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (p.startsWith('0')) p = '+234' + p.slice(1);
  if (p.startsWith('234')) p = '+' + p;
  if (!p.startsWith('+')) p = '+234' + p;
  return p;
}

/* ==========================================================
   FCM PUSH NOTIFICATIONS — Send push via Firebase Admin
   ========================================================== */

// Internal helper — send a push to a single user
async function sendPushToUser(userId, { title, body, data = {} }) {
  if (!userId) return;
  try {
    // Get all FCM tokens for this user
    const tokensSnap = await db
      .collection('fcm_tokens')
      .doc(userId)
      .collection('tokens')
      .get();

    if (tokensSnap.empty) return;

    const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
    if (tokens.length === 0) return;

    const message = {
      notification: { title, body },
      data: { ...data },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`🔔 Push sent to ${userId}: ${response.successCount} success, ${response.failureCount} fail`);

    // Clean up stale/invalid tokens
    const staleTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        staleTokens.push(tokens[idx]);
      }
    });
    for (const stale of staleTokens) {
      const tokenDocs = await db
        .collection('fcm_tokens')
        .doc(userId)
        .collection('tokens')
        .where('token', '==', stale)
        .get();
      tokenDocs.docs.forEach(d => d.ref.delete());
    }
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
}

// Endpoint — send a push notification (called internally or from a Cloud Function trigger)
// Body: { toUserId, title, body, data }
app.post('/fcm/send', async (req, res) => {
  const { toUserId, title, body, data } = req.body;
  if (!toUserId || !title) {
    return res.status(400).json({ error: 'toUserId and title are required.' });
  }
  await sendPushToUser(toUserId, { title, body: body || '', data: data || {} });
  res.json({ success: true });
});

// Trigger: new match — called from client after mutual like detected
// Body: { userId, matchedUserId, matchedUserName }
app.post('/fcm/new-match', async (req, res) => {
  const { userId, matchedUserId, matchedUserName } = req.body;
  if (!userId || !matchedUserId) {
    return res.status(400).json({ error: 'userId and matchedUserId required.' });
  }
  // Notify BOTH users
  await Promise.all([
    sendPushToUser(userId, {
      title: '💕 New Match!',
      body: `You matched with ${matchedUserName || 'someone'}! Say hello.`,
      data: { type: 'new_match', matchId: matchedUserId }
    }),
    sendPushToUser(matchedUserId, {
      title: '💕 New Match!',
      body: 'Someone liked you back! You have a new match.',
      data: { type: 'new_match', matchId: userId }
    })
  ]);
  res.json({ success: true });
});

// Trigger: new chat message — call this from your realtime message listener
// Body: { toUserId, fromUserName, messageText, matchId }
app.post('/fcm/new-message', async (req, res) => {
  const { toUserId, fromUserName, messageText, matchId } = req.body;
  if (!toUserId) return res.status(400).json({ error: 'toUserId required.' });

  const preview = messageText
    ? messageText.substring(0, 60) + (messageText.length > 60 ? '…' : '')
    : '📷 Photo';

  await sendPushToUser(toUserId, {
    title: `💬 ${fromUserName || 'Your match'}`,
    body: preview,
    data: { type: 'new_message', matchId: matchId || '' }
  });
  res.json({ success: true });
});

/* ==========================================================
   STORIES CLEANUP — Delete expired stories (run via cron)
   ========================================================== */

app.post('/stories/cleanup', async (req, res) => {
  // Simple auth guard — only accept calls with the server secret
  const secret = req.headers['x-cleanup-secret'];
  if (secret !== process.env.CLEANUP_SECRET && process.env.CLEANUP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = admin.firestore.Timestamp.now();
    const snap = await db
      .collection('stories')
      .where('expiresAt', '<', now)
      .limit(100)
      .get();

    if (snap.empty) {
      return res.json({ success: true, deleted: 0 });
    }

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`🗑️  Cleaned up ${snap.size} expired stories`);
    res.json({ success: true, deleted: snap.size });
  } catch (err) {
    console.error('Story cleanup error:', err);
    res.status(500).json({ error: 'Cleanup failed.' });
  }
});

/* ==========================================================
   TURN CREDENTIALS (WebRTC Calling Relay)
   ========================================================== */
app.get('/turn/credentials', async (req, res) => {
  try {
    const apiKey = process.env.METERED_API_KEY || '06edf4b6db269eaf1cad2bf8ed0fd268ad9f';
    const domain = process.env.METERED_DOMAIN || 'hookmebysam.metered.live';
    const response = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Metered API returned ${response.status}`);
    }
    const iceServers = await response.json();
    res.json(iceServers);
  } catch (err) {
    console.error('TURN credentials fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch TURN credentials' });
  }
});

/* ==========================================================
   HEALTH CHECK
   ========================================================== */

app.get('/', (req, res) => {
  res.json({
    service: 'hookmebysam Backend',
    status: 'online',
    endpoints: [
      '/webhook/paystack',
      '/paystack/verify',
      '/auth/send-otp',
      '/auth/verify-otp',
      '/fcm/send',
      '/fcm/new-match',
      '/fcm/new-message',
      '/stories/cleanup'
    ]
  });
});


/* ==========================================================
   START SERVER
   ========================================================== */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 hookmebysam backend running on port ${PORT}`);
  console.log(`📌 Paystack webhook:   POST http://localhost:${PORT}/webhook/paystack`);
  console.log(`📌 Paystack verify:    POST http://localhost:${PORT}/paystack/verify`);
  console.log(`📌 Send OTP:           POST http://localhost:${PORT}/auth/send-otp`);
  console.log(`📌 Verify OTP:         POST http://localhost:${PORT}/auth/verify-otp`);
  console.log(`📌 FCM send:           POST http://localhost:${PORT}/fcm/send`);
  console.log(`📌 FCM new match:      POST http://localhost:${PORT}/fcm/new-match`);
  console.log(`📌 FCM new message:    POST http://localhost:${PORT}/fcm/new-message`);
  console.log(`📌 Stories cleanup:    POST http://localhost:${PORT}/stories/cleanup\n`);
});

