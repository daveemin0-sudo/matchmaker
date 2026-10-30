const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./helpers/backend-harness');

const h = createHarness({ port: 3191 });
const { store, state } = h;
const bearer = (t) => ({ Authorization: 'Bearer ' + t });

function asUser(uid, email) {
  const userEmail = email || `${uid}@example.com`;
  state.idTokens['tok_' + uid] = { uid, email: userEmail };
  state.authUsers[uid] = { uid, email: userEmail, disabled: false };
  return bearer('tok_' + uid);
}

test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

// ============================================================================
// Case A: Existing Google User with Completed Onboarding
// ============================================================================
test('Case A: Existing Google user signs in and preserves existing complete profile and UID', async () => {
  const googleUid = 'google_user_completed_123';
  const googleEmail = 'ada@example.com';
  const auth = asUser(googleUid, googleEmail);

  // Completed profile already in Firestore
  store.set(`users/${googleUid}`, {
    id: googleUid,
    email: googleEmail,
    name: 'Ada Lovelace',
    displayName: 'Ada Lovelace',
    username: 'adalovelace',
    age: 26,
    gender: 'Female',
    bio: 'Pioneer of computing',
    interests: ['Tech 💻', 'Math 📐'],
    photos: ['https://firebasestorage.googleapis.com/v0/b/hookmebysam.appspot.com/o/ada.jpg'],
    image: 'https://firebasestorage.googleapis.com/v0/b/hookmebysam.appspot.com/o/ada.jpg',
    avatar: 'https://firebasestorage.googleapis.com/v0/b/hookmebysam.appspot.com/o/ada.jpg',
    city: 'London',
    accountStatus: 'active',
    onboardingComplete: true,
    authProvider: 'google'
  });

  // Syncing completed profile succeeds and publishes to public_profiles
  const res = await h.request('POST', '/profiles/sync', {}, auth);
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);

  const pub = store.get(`public_profiles/${googleUid}`);
  assert.ok(pub, 'Public profile must exist');
  assert.equal(pub.id, googleUid);
  assert.equal(pub.displayName, 'Ada Lovelace');
  assert.equal(pub.age, 26);
  assert.equal(pub.gender, 'Female');
  assert.equal(pub.active, true);

  // Re-syncing does not overwrite with email prefix or default username
  const resRepeat = await h.request('POST', '/profiles/sync', {}, auth);
  assert.equal(resRepeat.status, 200);
  const userDoc = store.get(`users/${googleUid}`);
  assert.equal(userDoc.username, 'adalovelace', 'Username must never be replaced with email prefix');
  assert.equal(userDoc.name, 'Ada Lovelace');
});

// ============================================================================
// Case B: New Google User & Incomplete State
// ============================================================================
test('Case B: New Google user in pending-onboarding state cannot sync or appear in Discovery', async () => {
  const newUid = 'google_new_user_456';
  const newEmail = 'newcomer@example.com';
  const auth = asUser(newUid, newEmail);
  const viewerAuth = asUser('viewer_user_999');

  // New Google user created in pending-onboarding state
  store.set(`users/${newUid}`, {
    id: newUid,
    email: newEmail,
    name: 'Newcomer',
    displayName: 'Newcomer',
    username: '', // no username yet
    age: null,   // real age not collected yet
    gender: '',  // gender not collected yet
    accountStatus: 'pending_onboarding',
    onboardingComplete: false,
    authProvider: 'google'
  });

  // Attempting to sync without completing onboarding fails closed (HTTP 400)
  const syncRes = await h.request('POST', '/profiles/sync', {}, auth);
  assert.equal(syncRes.status, 400);
  assert.equal(syncRes.json.success, false);
  assert.equal(syncRes.json.error, 'An adult profile age (18+) is required.');
  assert.equal(store.has(`public_profiles/${newUid}`), false, 'Pending user must NOT be published');

  // Discovery does not return the pending user
  const discRes = await h.request('GET', '/discovery', undefined, viewerAuth);
  assert.equal(discRes.status, 200);
  const found = (discRes.json.users || []).some(u => u.id === newUid);
  assert.equal(found, false, 'Pending Google user must not appear in Discovery');
});

test('Case B: New Google user completes onboarding with valid 18+ age, username and gender', async () => {
  const newUid = 'google_new_user_789';
  const newEmail = 'grace@example.com';
  const auth = asUser(newUid, newEmail);
  const viewerAuth = asUser('viewer_user_888');

  store.set(`users/${newUid}`, {
    id: newUid,
    email: newEmail,
    name: 'Grace Hopper',
    displayName: 'Grace Hopper',
    username: '',
    age: null,
    gender: '',
    accountStatus: 'pending_onboarding',
    onboardingComplete: false,
    authProvider: 'google'
  });

  // User completes onboarding wizard with valid inputs
  const onboardingPayload = {
    displayName: 'Grace Hopper',
    username: 'gracehopper',
    age: 28,
    gender: 'Female',
    bio: 'Compiler pioneer',
    interests: ['Tech 💻', 'Navy ⚓'],
    photos: ['https://firebasestorage.googleapis.com/v0/b/hookmebysam.appspot.com/o/grace.jpg'],
    accountStatus: 'active',
    onboardingComplete: true
  };

  const syncRes = await h.request('POST', '/profiles/sync', onboardingPayload, auth);
  assert.equal(syncRes.status, 200);
  assert.equal(syncRes.json.success, true);

  // Firestore user is updated
  const userDoc = store.get(`users/${newUid}`);
  assert.equal(userDoc.age, 28);
  assert.equal(userDoc.gender, 'Female');
  assert.equal(userDoc.displayName, 'Grace Hopper');

  // public_profiles is published
  const pubDoc = store.get(`public_profiles/${newUid}`);
  assert.ok(pubDoc, 'Public profile must be created after onboarding');
  assert.equal(pubDoc.age, 28);
  assert.equal(pubDoc.gender, 'Female');
  assert.equal(pubDoc.active, true);

  // Eligible viewer can discover Grace
  const discRes = await h.request('GET', '/discovery', undefined, viewerAuth);
  assert.equal(discRes.status, 200);
  const found = (discRes.json.users || []).find(u => u.id === newUid);
  assert.ok(found, 'Grace must appear in Discovery for other users');
  assert.equal(found.name, 'Grace Hopper');

  // Grace querying Discovery is excluded from her own results
  const selfDisc = await h.request('GET', '/discovery', undefined, auth);
  assert.equal(selfDisc.status, 200);
  const selfFound = (selfDisc.json.users || []).some(u => u.id === newUid);
  assert.equal(selfFound, false, 'User must be excluded from their own Discovery');
});

test('Case B: Underage onboarding submission is rejected and user remains unpublished', async () => {
  const underageUid = 'google_underage_101';
  const auth = asUser(underageUid, 'teen@example.com');

  store.set(`users/${underageUid}`, {
    id: underageUid,
    email: 'teen@example.com',
    name: 'Teen User',
    age: null,
    accountStatus: 'pending_onboarding',
    onboardingComplete: false
  });

  const underagePayload = {
    displayName: 'Teen User',
    age: 16,
    gender: 'Male',
    photos: ['https://firebasestorage.googleapis.com/v0/b/hookmebysam.appspot.com/o/teen.jpg']
  };

  const syncRes = await h.request('POST', '/profiles/sync', underagePayload, auth);
  assert.equal(syncRes.status, 400);
  assert.equal(syncRes.json.success, false);
  assert.equal(store.has(`public_profiles/${underageUid}`), false, 'Underage profile must NOT be published');
});

// ============================================================================
// Case C: Existing Email/Password Account Links Google
// ============================================================================
test('Case C: Existing email/password user linking Google preserves original UID, data, and matches', async () => {
  const originalUid = 'email_user_orig_555';
  const userEmail = 'sam@example.com';
  const auth = asUser(originalUid, userEmail);

  // Original email/password account in Firestore
  store.set(`users/${originalUid}`, {
    id: originalUid,
    email: userEmail,
    name: 'Sam Original',
    displayName: 'Sam Original',
    username: 'samoriginal',
    age: 25,
    gender: 'Male',
    bio: 'Original bio and preferences',
    interests: ['Coffee ☕', 'Hiking 🥾'],
    photos: ['https://firebasestorage.googleapis.com/v0/b/hookmebysam.appspot.com/o/sam.jpg'],
    accountStatus: 'active',
    onboardingComplete: true,
    authProvider: 'password'
  });

  // Original user has an existing match
  store.set('matches/match_sam_partner', {
    id: 'match_sam_partner',
    users: [originalUid, 'partner_uid_777'],
    participants: [originalUid, 'partner_uid_777'],
    createdAt: Date.now()
  });

  // When Google credential is linked to originalUid, sync preserves original data
  const syncRes = await h.request('POST', '/profiles/sync', {}, auth);
  assert.equal(syncRes.status, 200);

  // Original profile document is intact under originalUid
  const userDoc = store.get(`users/${originalUid}`);
  assert.equal(userDoc.id, originalUid);
  assert.equal(userDoc.username, 'samoriginal');
  assert.equal(userDoc.bio, 'Original bio and preferences');
  assert.equal(userDoc.age, 25);

  // Match document still references originalUid
  const matchDoc = store.get('matches/match_sam_partner');
  assert.ok(matchDoc.users.includes(originalUid), 'Match must remain attached to original UID');
});

// ============================================================================
// Suspended Account Protection
// ============================================================================
test('Suspended Google account cannot publish profile or enter Discovery', async () => {
  const suspendedUid = 'google_suspended_666';
  const auth = asUser(suspendedUid, 'banned@example.com');
  const viewerAuth = asUser('viewer_777');

  store.set(`users/${suspendedUid}`, {
    id: suspendedUid,
    email: 'banned@example.com',
    name: 'Suspended User',
    age: 23,
    gender: 'Male',
    accountStatus: 'suspended',
    suspended: true,
    onboardingComplete: true
  });

  // Pre-existing public_profile will be marked inactive
  store.set(`public_profiles/${suspendedUid}`, {
    id: suspendedUid,
    name: 'Suspended User',
    age: 23,
    active: true
  });

  const syncRes = await h.request('POST', '/profiles/sync', {}, auth);
  assert.equal(syncRes.status, 200);

  const pubDoc = store.get(`public_profiles/${suspendedUid}`);
  assert.equal(pubDoc.active, false, 'Suspended user public profile must be deactivated');

  const discRes = await h.request('GET', '/discovery', undefined, viewerAuth);
  assert.equal(discRes.status, 200);
  const found = (discRes.json.users || []).some(u => u.id === suspendedUid);
  assert.equal(found, false, 'Suspended user must not appear in Discovery');
});

// ============================================================================
// Frontend Client Source Integrity & Regression Tests
// ============================================================================
test('Client onboarding wizard includes username field and validates age and username', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const script = fs.readFileSync(path.resolve(__dirname, '../script.js'), 'utf8');
  const firebaseConfig = fs.readFileSync(path.resolve(__dirname, '../firebase-config.js'), 'utf8');

  // Verify username input exists in onboarding wizard step 1
  assert.ok(html.includes('id="obUsernameInput"'), 'index.html must have #obUsernameInput in onboarding wizard');

  // Verify account linking modal exists for Case C
  assert.ok(html.includes('id="accountLinkModalOverlay"'), 'index.html must have #accountLinkModalOverlay');
  assert.ok(html.includes('id="accountLinkPassword"'), 'index.html must have #accountLinkPassword');
  assert.ok(html.includes('id="accountLinkSubmitBtn"'), 'index.html must have #accountLinkSubmitBtn');

  // Verify script.js handles account-exists-with-different-credential
  assert.ok(script.includes('auth/account-exists-with-different-credential'), 'script.js must handle account-exists-with-different-credential');
  assert.ok(script.includes('handleAccountExistsWithDifferentCredential'), 'script.js must define handleAccountExistsWithDifferentCredential');
  assert.ok(script.includes('confirmAccountLink'), 'script.js must define confirmAccountLink');

  // Verify script.js validates username format in onboarding step 1
  assert.ok(script.includes('obUsernameInput'), 'script.js must inspect obUsernameInput');
  assert.ok(script.includes('/^[a-z0-9_]{3,30}$/i'), 'script.js must validate username 3-30 chars');

  // Verify firebase-config.js gates Discovery on isProfileComplete
  assert.ok(firebaseConfig.includes('isProfileComplete'), 'firebase-config.js must compute isProfileComplete');
  assert.ok(firebaseConfig.includes('pending_onboarding'), 'firebase-config.js must check pending_onboarding status');
});
