/* Offline (no-Firebase) accounts: salted PBKDF2 instead of a decodable btoa(password),
   and Firebase accounts can no longer be signed into offline with any password. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const start = src.indexOf('function getRegisteredUsers()');
const end = src.indexOf('try { migrateLegacyLocalPasswords()', start);
const helpers = src.slice(start, end);

function sandbox(initialUsers) {
  const mem = new Map();
  if (initialUsers) mem.set('hookme_registered_users', JSON.stringify(initialUsers));
  const ctx = {
    localStorage: { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) },
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    TextEncoder, Uint8Array, crypto: globalThis.crypto,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(helpers, ctx);
  ctx.stored = () => JSON.parse(mem.get('hookme_registered_users') || '[]');
  return ctx;
}

test('hashes are salted and verify only the right password', async () => {
  const ctx = sandbox();
  const a = await ctx.hashLocalPassword('Secret#123');
  const b = await ctx.hashLocalPassword('Secret#123');
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
  assert.equal(a.iterations, 150000);
  assert.equal(await ctx.verifyLocalPassword({ passwordKdf: a }, 'Secret#123'), true);
  assert.equal(await ctx.verifyLocalPassword({ passwordKdf: a }, 'secret#123'), false);
  assert.equal(await ctx.verifyLocalPassword({}, 'anything'), false, 'no hash never verifies');
});

test('legacy base64 passwords are migrated and the decodable copy removed', async () => {
  const ctx = sandbox([{ email: 'old@example.com', passwordHash: Buffer.from('Legacy#1').toString('base64') }, { email: 'fb@example.com', uid: 'abc' }]);
  await ctx.migrateLegacyLocalPasswords();
  const [old, fb] = ctx.stored();
  assert.equal(old.passwordHash, undefined);
  assert.ok(old.passwordKdf && old.passwordKdf.hash);
  assert.equal(await ctx.verifyLocalPassword(old, 'Legacy#1'), true);
  assert.deepEqual(fb, { email: 'fb@example.com', uid: 'abc' }, 'Firebase accounts untouched');
  assert.doesNotMatch(JSON.stringify(ctx.stored()), /Legacy#1|TGVnYWN5IzE=/);
});

test('no code path stores or compares btoa(password) any more', () => {
  assert.doesNotMatch(src, /btoa\(password\)/);
  assert.doesNotMatch(src, /passwordHash:\s*btoa/);
});

test('offline sign-in refuses accounts that have no local password', () => {
  const login = src.slice(src.indexOf('async function handleLogin()'), src.indexOf('// PHONE NUMBER SIGN-IN HANDLER'));
  assert.doesNotMatch(login, /!matchedUser\.passwordHash \|\|/, 'the old "no hash means any password" check is gone');
  assert.match(login, /matchedUser && !matchedUser\.passwordKdf && !matchedUser\.passwordHash\) \{[\s\S]{0,200}Check your internet connection[\s\S]{0,200}return;/);
  assert.match(login, /if \(matchedUser && passwordOk\)/);
});
