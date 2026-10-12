const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./helpers/backend-harness');

const h = createHarness({ port: 3189 });
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

// ---------- POST /profiles/sync ----------

test('POST /profiles/sync succeeds for age 20 and publishes sanitized record to public_profiles', async () => {
  const auth = asUser('user20');
  store.set('users/user20', {
    id: 'user20',
    email: 'user20@example.com',
    name: 'Young Adult',
    displayName: 'Young Adult',
    age: 20,
    gender: 'Male',
    bio: 'Software engineer living in Lagos',
    interests: ['Tech 💻', 'Music 🎵'],
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
    photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d'],
    city: 'Lagos',
    accountStatus: 'active'
  });

  const res = await h.request('POST', '/profiles/sync', {}, auth);
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);

  const pub = store.get('public_profiles/user20');
  assert.ok(pub, 'public_profiles document must be created');
  assert.equal(pub.id, 'user20');
  assert.equal(pub.displayName, 'Young Adult');
  assert.equal(pub.age, 20);
  assert.equal(pub.gender, 'Male');
  assert.equal(pub.bio, 'Software engineer living in Lagos');
  assert.deepEqual(pub.interests, ['Tech 💻', 'Music 🎵']);
  assert.equal(pub.image, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d');
  assert.deepEqual(pub.photos, ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d']);
  assert.equal(pub.city, 'Lagos');
  assert.equal(pub.active, true);
});

test('POST /profiles/sync accepts valid age and fields from request body if Firestore doc had missing/null age', async () => {
  const auth = asUser('freshUser');
  store.set('users/freshUser', {
    id: 'freshUser',
    email: 'fresh@example.com',
    age: null
  });

  const body = {
    displayName: 'New Member',
    age: 20,
    gender: 'Female',
    bio: 'Hello world',
    interests: ['Art 🎨'],
    photos: ['https://example.com/photo.jpg']
  };

  const res = await h.request('POST', '/profiles/sync', body, auth);
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);

  // Firestore user document must be updated with the adult age
  const userDoc = store.get('users/freshUser');
  assert.equal(userDoc.age, 20);
  assert.equal(userDoc.displayName, 'New Member');

  // public_profiles must be published with valid image from photos array
  const pub = store.get('public_profiles/freshUser');
  assert.ok(pub);
  assert.equal(pub.age, 20);
  assert.equal(pub.image, 'https://example.com/photo.jpg');
  assert.equal(pub.active, true);
});

test('POST /profiles/sync rejects underage users (<18) with HTTP 400', async () => {
  const auth = asUser('underageDoc');
  store.set('users/underageDoc', {
    displayName: 'Teenager',
    age: 17,
    image: 'https://example.com/teen.jpg'
  });

  const res = await h.request('POST', '/profiles/sync', {}, auth);
  assert.equal(res.status, 400);
  assert.equal(res.json.success, false);
  assert.equal(res.json.error, 'An adult profile age (18+) is required.');
  assert.equal(store.has('public_profiles/underageDoc'), false, 'underage profile must never be published');
});

test('POST /profiles/sync rejects underage age passed in request body', async () => {
  const auth = asUser('underageBody');
  store.set('users/underageBody', {
    displayName: 'Underage User'
  });

  const res = await h.request('POST', '/profiles/sync', { age: 16 }, auth);
  assert.equal(res.status, 400);
  assert.equal(res.json.error, 'An adult profile age (18+) is required.');
  assert.equal(store.has('public_profiles/underageBody'), false);
});

test('POST /profiles/sync rejects missing, null, or invalid age (NaN / >100)', async () => {
  const auth = asUser('invalidAge');
  store.set('users/invalidAge', {
    displayName: 'Invalid Age User',
    age: null
  });

  const nullRes = await h.request('POST', '/profiles/sync', {}, auth);
  assert.equal(nullRes.status, 400);
  assert.equal(nullRes.json.error, 'An adult profile age (18+) is required.');

  const nanRes = await h.request('POST', '/profiles/sync', { age: 'not-a-number' }, auth);
  assert.equal(nanRes.status, 400);

  const oldRes = await h.request('POST', '/profiles/sync', { age: 105 }, auth);
  assert.equal(oldRes.status, 400);
});

test('POST /profiles/sync returns 404 when user document is missing and no body age provided', async () => {
  const auth = asUser('missingDoc');
  const res = await h.request('POST', '/profiles/sync', {}, auth);
  assert.equal(res.status, 404);
  assert.equal(res.json.success, false);
  assert.equal(res.json.error, 'Profile not found.');
});

// ---------- GET /discovery ----------

test('GET /discovery returns eligible synchronized adult profiles and respects exclusions', async () => {
  const me = asUser('currentUser');

  // Set up profiles in public_profiles
  store.set('public_profiles/currentUser', {
    displayName: 'Me Myself',
    age: 22,
    image: 'https://example.com/me.jpg',
    active: true
  });
  store.set('public_profiles/adult1', {
    displayName: 'Folake',
    age: 20,
    image: 'https://example.com/folake.jpg',
    bio: 'Fashion designer',
    interests: ['Fashion 👗'],
    active: true
  });
  store.set('public_profiles/adult2', {
    displayName: 'Tunde',
    age: 25,
    photos: ['https://example.com/tunde.jpg'], // image resolved from photos[0]
    active: true
  });
  store.set('public_profiles/underage', {
    displayName: 'Junior',
    age: 17,
    image: 'https://example.com/junior.jpg',
    active: true
  });
  store.set('public_profiles/inactive', {
    displayName: 'Suspended',
    age: 28,
    image: 'https://example.com/inactive.jpg',
    active: false
  });
  store.set('public_profiles/swipedAlready', {
    displayName: 'Swiped User',
    age: 23,
    image: 'https://example.com/swiped.jpg',
    active: true
  });
  store.set('public_profiles/blockedUser', {
    displayName: 'Blocked Person',
    age: 24,
    image: 'https://example.com/blocked.jpg',
    active: true
  });

  // Exclusions: already swiped and blocked
  store.set('swipes/currentUser_swipedAlready', {
    fromUserId: 'currentUser',
    toUserId: 'swipedAlready',
    direction: 'like'
  });
  store.set('blocks/currentUser_blockedUser', {
    blockedBy: 'currentUser',
    blockedUserId: 'blockedUser'
  });

  const res = await h.request('GET', '/discovery', undefined, me);
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);

  const returnedIds = res.json.users.map((u) => u.id);
  assert.ok(returnedIds.includes('adult1'), 'Adult 20 Folake should be visible in discovery');
  assert.ok(returnedIds.includes('adult2'), 'Adult 25 Tunde with photo fallback should be visible in discovery');
  assert.equal(returnedIds.includes('currentUser'), false, 'Caller must not appear in own discovery');
  assert.equal(returnedIds.includes('underage'), false, 'Underage must never appear in discovery');
  assert.equal(returnedIds.includes('inactive'), false, 'Inactive/suspended profiles must not appear');
  assert.equal(returnedIds.includes('swipedAlready'), false, 'Swiped profiles must not reappear');
  assert.equal(returnedIds.includes('blockedUser'), false, 'Blocked profiles must not appear');

  const adult1Data = res.json.users.find((u) => u.id === 'adult1');
  assert.equal(adult1Data.age, 20);
  assert.equal(adult1Data.name, 'Folake');
  assert.equal(adult1Data.image, 'https://example.com/folake.jpg');

  const adult2Data = res.json.users.find((u) => u.id === 'adult2');
  assert.equal(adult2Data.image, 'https://example.com/tunde.jpg');
});
