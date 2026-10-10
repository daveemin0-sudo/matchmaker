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

// IMPORTANT: webhook-server/index.js is the real, deployed backend — it's
// what BACKEND_URL in firebase-config.js points to (matchmaker-viwb.onrender.com),
// what webhook-server/package.json's "main"/"start" run, and what
// .github/workflows/production-ops.yml health-checks. The root-level
// The old root-level Server.js was never referenced by any script, deploy config, or workflow in
// this repo, so asserting against it tells you nothing about what users
// actually hit in production — assert against webhook-server/index.js.
test('swipe endpoint is authenticated and rate limited', () => {
  const server = read('webhook-server/index.js');
  assert.match(server, /app\.post\('\/swipes\/record', requireAuth/);
  assert.match(server, /rateLimit\(`swipe-rate:\$\{req\.user\.uid\}`, 60, 60 \* 1000\)/);
});

test('profile publication requires adult age', () => {
  const server = read('webhook-server/index.js');
  assert.match(server, /age < 18/);
  assert.match(server, /age > 100/);
});

test('no route path is registered twice in the deployed backend (Express keeps only the first, silently shadowing the rest)', () => {
  const server = read('webhook-server/index.js');
  const matches = [...server.matchAll(/app\.(?:get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g)];
  const seen = new Map();
  for (const [, routePath] of matches) {
    seen.set(routePath, (seen.get(routePath) || 0) + 1);
  }
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([routePath]) => routePath);
  assert.deepEqual(duplicates, []);
});

test('reporting a user accepts every reason the in-app report sheet can send, and records who filed it', () => {
  const app = read('script.js');
  const uiReasons = [...app.matchAll(/name="reportReason" value="([a-z]+)"/g)].map(m => m[1]);
  assert.ok(uiReasons.length > 0, 'expected to find reportReason radio options in script.js');

  const server = read('webhook-server/index.js');
  // Capture any reason allow-list declared just above the route too (e.g. a
  // `REPORT_REASONS` constant), not only the handler body itself.
  const reportsRouteMatch = server.match(/(?:const REPORT_REASONS[\s\S]*?\n\n)?app\.post\('\/reports'[\s\S]*?\n\}\);/);
  assert.ok(reportsRouteMatch, 'expected exactly one POST /reports handler');
  const handlerSource = reportsRouteMatch[0];

  for (const reason of uiReasons) {
    assert.match(
      handlerSource,
      new RegExp(`'${reason}'`),
      `POST /reports must accept reason "${reason}" since the report sheet can send it`
    );
  }
  // GET /admin/reports reads back `report.reportedBy` — the write path must
  // set that same field or every report shows a blank reporter to admins.
  assert.match(handlerSource, /reportedBy:\s*reporterId/);
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
  assert.ok(app.includes('chat_media/${matchId}'));
});

// Static checks only — these catch the protections being deleted again (the
// rules file has regressed before). They do NOT prove the rules evaluate
// correctly; that needs the Firestore emulator (`firebase emulators:exec`).
test('firestore rules: blocks are enforced on match creation, messages and call signalling', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /function notBlocked\(matchId\)/);
  assert.match(rules, /match \/matches\/\{matchId\}[\s\S]*?allow create:[\s\S]*?notBlocked\(matchId\)/);
  assert.match(rules, /match \/messages\/\{messageId\}[\s\S]*?allow create:[\s\S]*?notBlocked\(matchId\)/);
  assert.match(rules, /match \/calls\/\{callId\}[\s\S]*?allow write: if notBlocked\(matchId\)/);
});

test('firestore rules: a match document id must agree with its users and participants cannot be rewritten', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /request\.resource\.data\.users\.hasAll\(matchId\.split\('_'\)\)/);
  assert.match(rules, /request\.resource\.data\.users\.hasAll\(resource\.data\.users\)/);
});
