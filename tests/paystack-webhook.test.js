/* Behavioural test for POST /webhook/paystack in webhook-server/index.js
 * (real server file, firebase-admin / node-fetch stubbed — see helpers). */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createHarness } = require('./helpers/backend-harness');

const SECRET = 'sk_test_unit_secret';
const h = createHarness({ port: 3187 });
const { store, state } = h;

const sign = (obj) => crypto.createHmac('sha512', SECRET).update(JSON.stringify(obj)).digest('hex');
const webhook = (event, signature) => h.request('POST', '/webhook/paystack', event, { 'x-paystack-signature': signature });

function chargeEvent({ reference, userId, planName }) {
  return { event: 'charge.success', data: { reference, metadata: { custom_fields: [
    { variable_name: 'user_id', value: userId },
    { variable_name: 'plan_name', value: planName },
  ] } } };
}

function verified({ reference, amountKobo, email, userId, currency = 'NGN' }) {
  return { status: true, data: {
    status: 'success', reference, amount: amountKobo, currency, customer: { email },
    metadata: { custom_fields: [{ variable_name: 'user_id', value: userId }] },
  } };
}

test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

test('webhook rejects a bad signature and grants nothing', async () => {
  const res = await webhook(chargeEvent({ reference: 'R1', userId: 'u1', planName: '1 Month VIP Gold' }), 'deadbeef');
  assert.equal(res.status, 401);
  assert.equal(store.has('users/u1'), false);
});

test('webhook grants VIP to an email/password account when the payer email matches', async () => {
  store.set('users/u1', { displayName: 'A' });
  state.authUsers.u1 = { email: 'a@example.com' };
  state.paystackVerifyResponse = verified({ reference: 'R2', amountKobo: 750000, email: 'a@example.com', userId: 'u1' });
  const event = chargeEvent({ reference: 'R2', userId: 'u1', planName: '1 Month VIP Gold' });
  const res = await webhook(event, sign(event));
  assert.equal(res.status, 200);
  assert.equal(store.get('users/u1').isVip, true);
  assert.equal(store.get('users/u1').vipTier, 2);
});

test('webhook grants VIP to a PHONE-ONLY account (no email on the Firebase user)', async () => {
  store.set('users/p1', { phone: '+2348012345678' });
  state.authUsers.p1 = { email: undefined, phoneNumber: '+2348012345678' };
  state.paystackVerifyResponse = verified({ reference: 'R3', amountKobo: 250000, email: '2348012345678@hookmebysam.com', userId: 'p1' });
  const event = chargeEvent({ reference: 'R3', userId: 'p1', planName: '1 Week VIP Gold' });
  const res = await webhook(event, sign(event));
  assert.equal(res.status, 200);
  assert.equal(store.get('users/p1')?.isVip, true, 'phone-only payer must receive VIP from the webhook');
  assert.equal(store.get('users/p1').vipTier, 1);
});

test('webhook refuses to grant when the amount paid does not match the plan', async () => {
  store.set('users/u2', {});
  state.authUsers.u2 = { email: 'b@example.com' };
  // paid the 1-week price (2500) but claims the lifetime plan (25000)
  state.paystackVerifyResponse = verified({ reference: 'R4', amountKobo: 250000, email: 'b@example.com', userId: 'u2' });
  const event = chargeEvent({ reference: 'R4', userId: 'u2', planName: 'Lifetime VIP Gold' });
  await webhook(event, sign(event));
  assert.notEqual(store.get('users/u2')?.isVip, true);
});

test('webhook is idempotent: the same reference is only redeemed once', async () => {
  store.set('users/u3', {});
  state.authUsers.u3 = { email: 'c@example.com' };
  state.paystackVerifyResponse = verified({ reference: 'R5', amountKobo: 750000, email: 'c@example.com', userId: 'u3' });
  const event = chargeEvent({ reference: 'R5', userId: 'u3', planName: '1 Month VIP Gold' });
  await webhook(event, sign(event));
  const firstActivated = store.get('users/u3').vipActivatedAt;
  store.get('users/u3').marker = 'kept';
  await webhook(event, sign(event));
  assert.equal(store.get('users/u3').marker, 'kept');
  assert.equal(store.get('users/u3').vipActivatedAt, firstActivated);
  assert.equal(store.has('paystack_transactions/R5'), true);
});
