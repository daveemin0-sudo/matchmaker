/* Firestore security rules, run against the real Firestore emulator.
   Run with: npm run test:rules   (needs Java; CI runs it in .github/workflows/production-checks.yml) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc } = require('firebase/firestore');

let env;
const MATCH = 'alice_bob'; // sorted uids

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hookmebysam',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8') },
  });
});
test.after(async () => { if (env) await env.cleanup(); });
test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), { name: 'Alice', email: 'alice@example.com', phone: '+2348000000001', isVip: false, accountStatus: 'active' });
    await setDoc(doc(db, 'users/bob'), { name: 'Bob', email: 'bob@example.com' });
    await setDoc(doc(db, `matches/${MATCH}`), { users: ['alice', 'bob'] });
    await setDoc(doc(db, `matches/${MATCH}/messages/m1`), { sender: 'alice', text: 'hello', read: false });
  });
});

const as = (uid, token = {}) => env.authenticatedContext(uid, token).firestore();

test('a user reads only their own private document', async () => {
  await assertSucceeds(getDoc(doc(as('alice'), 'users/alice')));
  await assertFails(getDoc(doc(as('bob'), 'users/alice')));
});

test('an unverified token carrying someone else\'s email cannot read their private document', async () => {
  await assertFails(getDoc(doc(as('mallory', { email: 'alice@example.com', email_verified: false }), 'users/alice')));
});

test('users cannot grant themselves VIP, roles, verification or lift moderation state', async () => {
  const db = as('alice');
  for (const patch of [{ isVip: true }, { role: 'admin' }, { phoneVerified: true }, { suspended: false }, { mergedInto: 'x' }, { deletedAt: 1 }, { vipExpiry: 1 }]) {
    await assertFails(updateDoc(doc(db, 'users/alice'), patch), JSON.stringify(patch));
  }
  await assertSucceeds(updateDoc(doc(db, 'users/alice'), { bio: 'Hi', accountStatus: 'active' }));
});

test('sign-up may write only safe values for protected fields', async () => {
  await assertSucceeds(setDoc(doc(as('carol'), 'users/carol'), { name: 'Carol', isVip: false, phoneVerified: false, role: 'user' }));
  await assertFails(setDoc(doc(as('dave'), 'users/dave'), { name: 'Dave', isVip: true }));
  await assertFails(setDoc(doc(as('erin'), 'users/erin'), { name: 'Erin', phoneVerified: true }));
  await assertFails(setDoc(doc(as('fay'), 'users/fay'), { name: 'Fay', suspended: false }));
});

test('nobody can rewrite the other person\'s message or change its sender', async () => {
  const bob = as('bob');
  await assertFails(updateDoc(doc(bob, `matches/${MATCH}/messages/m1`), { text: 'I never said this' }));
  await assertFails(updateDoc(doc(bob, `matches/${MATCH}/messages/m1`), { sender: 'bob' }));
  await assertFails(updateDoc(doc(as('alice'), `matches/${MATCH}/messages/m1`), { sender: 'bob' }));
});

test('the sender edits their own message; either participant marks read or reacts', async () => {
  await assertSucceeds(updateDoc(doc(as('alice'), `matches/${MATCH}/messages/m1`), { text: 'hello!', edited: true }));
  await assertSucceeds(updateDoc(doc(as('bob'), `matches/${MATCH}/messages/m1`), { read: true }));
  await assertSucceeds(updateDoc(doc(as('bob'), `matches/${MATCH}/messages/m1`), { reactions: { '👍': ['bob'] } }));
  await assertFails(updateDoc(doc(as('carol'), `matches/${MATCH}/messages/m1`), { read: true }));
});

test('only the sender can delete a message', async () => {
  await assertFails(deleteDoc(doc(as('bob'), `matches/${MATCH}/messages/m1`)));
  await assertSucceeds(deleteDoc(doc(as('alice'), `matches/${MATCH}/messages/m1`)));
});

test('a block (including an unmatch) stops new messages and new matches', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'blocks/alice_bob'), { blockedBy: 'alice', blockedUserId: 'bob', kind: 'unmatch' });
    await deleteDoc(doc(ctx.firestore(), `matches/${MATCH}`)); // the unmatch endpoint removes the match
  });
  await assertFails(setDoc(doc(as('bob'), `matches/${MATCH}/messages/m2`), { sender: 'bob', text: 'still here?' }));
  await assertFails(setDoc(doc(as('bob'), `matches/${MATCH}`), { users: ['alice', 'bob'] }));
});

test('voice intro audio, reports and blocks are server-only', async () => {
  await assertFails(getDoc(doc(as('alice'), 'voice_intros/bob')));
  await assertFails(setDoc(doc(as('alice'), 'voice_intros/alice'), { dataBase64: 'x' }));
  await assertFails(setDoc(doc(as('alice'), 'blocks/alice_bob'), { blockedBy: 'alice', blockedUserId: 'bob' }));
  await assertFails(setDoc(doc(as('alice'), 'reports/r1'), { reportedBy: 'alice' }));
});

test('security events and alerts are invisible to every client, admins included', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/boss'), { role: 'admin' });
    await setDoc(doc(ctx.firestore(), 'security_alerts/a1'), { type: 'admin_denied' });
  });
  for (const uid of ['alice', 'boss']) {
    await assertFails(getDoc(doc(as(uid), 'security_alerts/a1')));
    await assertFails(setDoc(doc(as(uid), 'security_events/e1'), { type: 'fake' }));
    await assertFails(updateDoc(doc(as(uid), 'security_alerts/a1'), { status: 'acknowledged' }));
  }
});
