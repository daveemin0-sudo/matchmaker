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
   Firebase Admin SDK — initialize with your service account
   Download from: Firebase Console → Project Settings → Service Accounts
   ---------------------------------------------------------- */
const serviceAccount = require('./serviceAccountKey.json'); // download from Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});
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
   HEALTH CHECK
   ========================================================== */
app.get('/', (req, res) => {
  res.json({
    service: 'hookmebysam Backend',
    status: 'online',
    endpoints: ['/webhook/paystack', '/auth/send-otp', '/auth/verify-otp']
  });
});

/* ==========================================================
   START SERVER
   ========================================================== */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 hookmebysam backend running on port ${PORT}`);
  console.log(`📌 Paystack webhook: POST http://localhost:${PORT}/webhook/paystack`);
  console.log(`📌 Send OTP:         POST http://localhost:${PORT}/auth/send-otp`);
  console.log(`📌 Verify OTP:       POST http://localhost:${PORT}/auth/verify-otp\n`);
});
