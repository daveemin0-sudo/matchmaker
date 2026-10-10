/* Behavioural test for POST /webhook/paystack in webhook-server/index.js.
 *
 * Loads the REAL server file with firebase-admin and node-fetch stubbed (no
 * network, no credentials), then sends signed webhook requests over HTTP.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const Module = require('node:module');
const path = require('node:path');

const SECRET = 'sk_test_unit_secret';
const PORT = 3187;
const SERVER_FILE = path.resolve(__dirname, '../webhook-server/index.js');

const store = new Map(); // "collection/doc" -> data
let paystackVerifyResponse = null;
let authUsers = {};

function makeDb() {
  const docRef = (col, id) => ({
    _key: `${col}/${id}`,
    get: async () => ({ exists: store.has(`${col}/${id}`), data: () => store.get(`${col}/${id}`) }),
    set: async (data, opts) => {
      const prev = opts?.merge ? (store.get(`${col}/${id}`) || {}) : {};
      store.set(`${col}/${id}`, { ...prev, ...data });
    },
  });
  const db = {
    collection: (col) => ({ doc: (id) => docRef(col, id) }),
    runTransaction: async (fn) => fn({
      get: async (ref) => ref.get(),
      set: (ref, data, opts) => {
        const prev = opts?.merge ? (store.get(ref._key) || {}) : {};
        store.set(ref._key, { ...prev, ...data });
      },
    }),
  };
  return db;
}

function loadServer() {
  const realLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'firebase-admin') {
      const firestoreFn = () => makeDb();
      firestoreFn.FieldValue = { serverTimestamp: () => '__SERVER_TS__' };
      firestoreFn.Timestamp = { fromDate: (d) => ({ _date: d }), now: () => ({}) };
      return {
        initializeApp: () => {},
        credential: { cert: () => ({}) },
        firestore: firestoreFn,
        auth: () => ({ getUser: async (uid) => { if (!authUsers[uid]) throw new Error('no user'); return authUsers[uid]; } }),
        messaging: () => ({}),
        storage: () => ({}),
      };
    }
    if (request === 'node-fetch') {
      return async () => ({ ok: true, json: async () => paystackVerifyResponse });
    }
    if (request === 'dotenv') return { config: () => {} };
    return realLoad.apply(this, arguments);
  };
  process.env.PAYSTACK_SECRET_KEY = SECRET;
  process.env.PORT = String(PORT);
  process.env.FIREBASE_PROJECT_ID = 'demo-test';
  try {
    require(SERVER_FILE);
  } finally {
    Module._load = realLoad;
  }
}

function post(pathname, bodyObj, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(bodyObj));
    const req = http.request({ host: '127.0.0.1', port: PORT, path: pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length, ...headers } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

const sign = (obj) => crypto.createHmac('sha512', SECRET).update(JSON.stringify(obj)).digest('hex');

function chargeEvent({ reference, userId, planName }) {
  return {
    event: 'charge.success',
    data: {
      reference,
      metadata: { custom_fields: [
        { variable_name: 'user_id', value: userId },
        { variable_name: 'plan_name', value: planName },
      ] },
    },
  };
}

function verified({ reference, amountKobo, email, userId, currency = 'NGN' }) {
  return { status: true, data: {
    status: 'success', reference, amount: amountKobo, currency,
    customer: { email },
    metadata: { custom_fields: [{ variable_name: 'user_id', value: userId }] },
  } };
}

test.before(async () => {
  loadServer();
  await new Promise((r) => setTimeout(r, 300)); // let app.listen bind
});

test.beforeEach(() => { store.clear(); authUsers = {}; paystackVerifyResponse = null; });

test('webhook rejects a bad signature and grants nothing', async () => {
  const event = chargeEvent({ reference: 'R1', userId: 'u1', planName: '1 Month VIP Gold' });
  const res = await post('/webhook/paystack', event, { 'x-paystack-signature': 'deadbeef' });
  assert.equal(res.status, 401);
  assert.equal(store.has('users/u1'), false);
});

test('webhook grants VIP to an email/password account when the payer email matches', async () => {
  store.set('users/u1', { displayName: 'A' });
  authUsers.u1 = { email: 'a@example.com' };
  paystackVerifyResponse = verified({ reference: 'R2', amountKobo: 750000, email: 'a@example.com', userId: 'u1' });
  const event = chargeEvent({ reference: 'R2', userId: 'u1', planName: '1 Month VIP Gold' });
  const res = await post('/webhook/paystack', event, { 'x-paystack-signature': sign(event) });
  assert.equal(res.status, 200);
  assert.equal(store.get('users/u1').isVip, true);
  assert.equal(store.get('users/u1').vipTier, 2);
});

test('webhook grants VIP to a PHONE-ONLY account (no email on the Firebase user)', async () => {
  store.set('users/p1', { phone: '+2348012345678' });
  authUsers.p1 = { email: undefined, phoneNumber: '+2348012345678' };
  paystackVerifyResponse = verified({ reference: 'R3', amountKobo: 250000, email: '2348012345678@hookmebysam.com', userId: 'p1' });
  const event = chargeEvent({ reference: 'R3', userId: 'p1', planName: '1 Week VIP Gold' });
  const res = await post('/webhook/paystack', event, { 'x-paystack-signature': sign(event) });
  assert.equal(res.status, 200);
  assert.equal(store.get('users/p1')?.isVip, true, 'phone-only payer must receive VIP from the webhook');
  assert.equal(store.get('users/p1').vipTier, 1);
});

test('webhook refuses to grant when the amount paid does not match the plan', async () => {
  store.set('users/u2', {});
  authUsers.u2 = { email: 'b@example.com' };
  // paid the 1-week price (2500) but claims the lifetime plan (25000)
  paystackVerifyResponse = verified({ reference: 'R4', amountKobo: 250000, email: 'b@example.com', userId: 'u2' });
  const event = chargeEvent({ reference: 'R4', userId: 'u2', planName: 'Lifetime VIP Gold' });
  const res = await post('/webhook/paystack', event, { 'x-paystack-signature': sign(event) });
  assert.notEqual(store.get('users/u2')?.isVip, true);
  assert.ok([200, 500].includes(res.status));
});

test('webhook is idempotent: the same reference is only redeemed once', async () => {
  store.set('users/u3', {});
  authUsers.u3 = { email: 'c@example.com' };
  paystackVerifyResponse = verified({ reference: 'R5', amountKobo: 750000, email: 'c@example.com', userId: 'u3' });
  const event = chargeEvent({ reference: 'R5', userId: 'u3', planName: '1 Month VIP Gold' });
  await post('/webhook/paystack', event, { 'x-paystack-signature': sign(event) });
  const firstActivated = store.get('users/u3').vipActivatedAt;
  store.get('users/u3').marker = 'kept';
  await post('/webhook/paystack', event, { 'x-paystack-signature': sign(event) });
  assert.equal(store.get('users/u3').marker, 'kept');
  assert.equal(store.get('users/u3').vipActivatedAt, firstActivated);
  assert.equal(store.has('paystack_transactions/R5'), true);
});

test.after(() => { setTimeout(() => process.exit(0), 50).unref(); });
