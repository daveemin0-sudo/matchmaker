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
  assert.match(rules, /request\.auth\.uid in firestore\.get\(\/databases\/\(default\)\/documents\/matches\/\$\(matchId\)\)\.data\.users/);

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


test('swipes are not client-writable', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /match \/swipes\/{swipeId}[\s\S]*?allow create, update, delete: if false;/);
});


test('production backend binds payment currency and match notification access', () => {
  const server = read('webhook-server/index.js');
  assert.match(server, /payment\.currency.*NGN/);
  assert.match(server, /async function assertActiveMatchAccess/);
  assert.match(server, /await assertActiveMatchAccess\(req\.user\.uid, partnerId, matchId\)/);
});

test('account deletion removes reverse privacy relationships and match media', () => {
  const server = read('webhook-server/index.js');
  assert.match(server, /blocks.*where\('blockedUserId', '==', uid\)/);
  assert.match(server, /reports.*where\('reportedUserId', '==', uid\)/);
  assert.match(server, /chat_media\/\$\{match\.id\}\//);
});


test('chat media never falls back to public story storage or local-only delivery', () => {
  const client = read('firebase-config.js');
  const app = read('script.js');
  assert.doesNotMatch(client, /fallbackRef = fbStorage/);
  assert.match(client, /active match not found or access denied/);
  assert.match(app, /Private chat media must be stored in Cloud Storage before it is sent/);
  assert.match(app, /Only send the stable Cloud Storage URL to the recipient/);
  assert.match(app, /chat_media\\/\\$\\{matchId\\}/);
});
