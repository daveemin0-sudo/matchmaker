/* /turn/credentials: a relay is what lets calls work between different networks. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./helpers/backend-harness');

const h = createHarness({ port: 3191, env: { METERED_API_KEY: 'key123', METERED_DOMAIN: 'https://hookmebysam.metered.live/' } });
const { state } = h;
test.before(() => h.start());
test.beforeEach(() => h.reset());
test.after(() => h.stop());

function signedIn() {
  state.idTokens.tok_a = { uid: 'a', email: 'a@example.com' };
  state.authUsers.a = { uid: 'a', email: 'a@example.com', disabled: false };
  return { Authorization: 'Bearer tok_a' };
}

test('a domain pasted with https:// and a trailing slash still reaches Metered', async () => {
  state.paystackVerifyResponse = [{ urls: 'turn:global.relay.metered.ca:443', username: 'u', credential: 'c' }];
  const r = await h.request('GET', '/turn/credentials', undefined, signedIn());
  assert.equal(r.status, 200);
  assert.equal(state.fetchUrls[0], 'https://hookmebysam.metered.live/api/v1/turn/credentials?apiKey=key123');
  assert.match(JSON.stringify(r.body), /turn:global\.relay\.metered\.ca/);
});

test('a Metered reply with no relay servers falls back to STUN only instead of passing it on', async () => {
  state.paystackVerifyResponse = { message: 'invalid api key' };
  const r = await h.request('GET', '/turn/credentials', undefined, signedIn());
  assert.equal(r.status, 200);
  const body = typeof r.body === 'string' ? JSON.parse(r.body) : r.body;
  assert.ok(Array.isArray(body) && body.every((sv) => /^stun:/.test(sv.urls)));
});

test('credentials require sign-in', async () => {
  const r = await h.request('GET', '/turn/credentials', undefined, {});
  assert.equal(r.status, 401);
});
