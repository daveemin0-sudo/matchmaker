const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

test('public profiles are backend-authoritative', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /match \/public_profiles\/{userId}/);
  assert.match(rules, /allow create, update, delete: if false;/);
});

test('new chat media is scoped to a match participant', () => {
  const rules = read('storage.rules');
  assert.match(rules, /match \/chat_media\/{matchId}\/{userId}\/{fileName}/);
  assert.match(rules, /request\.auth\.uid in get\(\/databases\/\$\(database\)\/documents\/matches\/\$\(matchId\)\)\.data\.users/);

  const client = read('firebase-config.js');
  assert.match(client, /Chat media requires a match scope/);
  assert.match(client, /chat_media\/\$\{matchId\}/);
});

test('swipe endpoint is authenticated and rate limited', () => {
  const server = read('Server.js');
  assert.match(server, /app\.post\('\/swipes\/record', requireAuth/);
  assert.match(server, /isRateLimited\(swipeAttempts, uid, 180/);
});

test('profile publication requires adult age', () => {
  const server = read('Server.js');
  assert.match(server, /age < 18/);
  assert.match(server, /age > 100/);
});
