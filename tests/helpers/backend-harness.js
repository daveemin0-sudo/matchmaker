/* Loads the REAL webhook-server/index.js with firebase-admin, node-fetch and
 * dotenv stubbed, so routes can be exercised over HTTP with no network and no
 * credentials. Each test file runs in its own process, so each picks its own
 * port.
 */
const http = require('node:http');
const Module = require('node:module');
const path = require('node:path');

const SERVER_FILE = path.resolve(__dirname, '../../webhook-server/index.js');

function createHarness({ port, env = {} }) {
  const store = new Map(); // "collection/doc" -> data
  const state = {
    paystackVerifyResponse: null,
    authUsers: {},   // uid -> user record
    idTokens: {},    // bearer token -> decoded token ({ uid, email, ... })
    authCalls: [],   // [{ fn, args }]
    storageSaves: [],
    defaultBucketConfigured: false,
    bucketMissing: false,
  };

  function docRef(col, id) {
    const key = `${col}/${id}`;
    return {
      _key: key,
      id,
      get: async () => ({ id, exists: store.has(key), data: () => store.get(key), ref: docRef(col, id) }),
      set: async (data, opts) => {
        const prev = opts && opts.merge ? (store.get(key) || {}) : {};
        store.set(key, { ...prev, ...data });
      },
      create: async (data) => {
        if (store.has(key)) { const e = new Error('exists'); e.code = 6; throw e; }
        store.set(key, data);
      },
      delete: async () => { store.delete(key); },
      collection: (name) => query(`${key}/${name}`, []),
      listCollections: async () => [],
    };
  }

  function query(col, filters) {
    const run = () => {
      const docs = [];
      for (const [key, data] of store) {
        if (!key.startsWith(col + '/')) continue;
        const ok = filters.every(([field, op, value]) => {
          if (op === '==') return data[field] === value;
          if (op === 'in') return value.includes(data[field]);
          if (op === 'array-contains') return Array.isArray(data[field]) && data[field].includes(value);
          return true;
        });
        if (ok) { const id = key.slice(col.length + 1); docs.push({ id, data: () => data, ref: docRef(col, id) }); }
      }
      return docs;
    };
    const q = {
      where: (f, o, v) => query(col, [...filters, [f, o, v]]),
      limit: () => q,
      get: async () => { const docs = run(); return { docs, empty: docs.length === 0, size: docs.length, forEach: (fn) => docs.forEach(fn) }; },
    };
    return q;
  }

  const db = {
    collection: (col) => ({
      doc: (id) => docRef(col, id === undefined ? 'auto_' + Math.random().toString(36).slice(2, 12) : id),
      where: (f, o, v) => query(col, [[f, o, v]]),
    }),
    batch: () => { const ops = []; return { delete: (ref) => ops.push(ref), commit: async () => { for (const ref of ops) await ref.delete(); } }; },
    runTransaction: async (fn) => fn({
      get: async (ref) => ref.get(),
      set: (ref, data, opts) => {
        const prev = opts && opts.merge ? (store.get(ref._key) || {}) : {};
        store.set(ref._key, { ...prev, ...data });
      },
    }),
  };

  const auth = {
    verifyIdToken: async (token) => { if (!state.idTokens[token]) throw new Error('bad token'); return state.idTokens[token]; },
    getUser: async (uid) => { if (!state.authUsers[uid]) { const e = new Error('no user'); e.code = 'auth/user-not-found'; throw e; } return state.authUsers[uid]; },
    getUserByEmail: async (email) => {
      const found = Object.values(state.authUsers).find((u) => String(u.email || '').toLowerCase() === email);
      if (!found) { const e = new Error('no user'); e.code = 'auth/user-not-found'; throw e; }
      return found;
    },
    deleteUser: async (uid) => { state.authCalls.push({ fn: 'deleteUser', args: [uid] }); delete state.authUsers[uid]; },
    updateUser: async (uid, patch) => { state.authCalls.push({ fn: 'updateUser', args: [uid, patch] }); },
    revokeRefreshTokens: async (uid) => { state.authCalls.push({ fn: 'revokeRefreshTokens', args: [uid] }); },
  };

  const adminStub = (() => {
    const firestoreFn = () => db;
    firestoreFn.FieldValue = { serverTimestamp: () => '__SERVER_TS__' };
    firestoreFn.Timestamp = { fromDate: (d) => ({ _date: d }), now: () => ({}) };
    return {
      initializeApp: () => {},
      credential: { cert: () => ({}) },
      firestore: firestoreFn,
      auth: () => auth,
      messaging: () => ({}),
      // Mirrors real firebase-admin: bucket() with no name THROWS when no default
      // bucket is configured, and a bucket that was never provisioned answers 404.
      storage: () => ({
        bucket: (name) => {
          if (!name && !state.defaultBucketConfigured) {
            throw new Error('Bucket name not specified or invalid. Specify a valid bucket name via the storageBucket option when initializing the app, or specify the bucket name explicitly when calling the getBucket() method.');
          }
          const missing = () => { const e = new Error('The specified bucket does not exist.'); e.code = 404; throw e; };
          return {
            name: name || 'demo-bucket',
            file: (dest) => ({
              save: async (buf, opts) => {
                if (state.bucketMissing) missing();
                state.storageSaves.push({ bucket: name || 'demo-bucket', dest, size: buf.length, contentType: opts.metadata.contentType });
              },
              delete: async () => { if (state.bucketMissing) missing(); },
            }),
            getFiles: async () => { if (state.bucketMissing) missing(); return [[]]; },
          };
        },
      }),
    };
  })();

  function start() {
    const realLoad = Module._load;
    Module._load = function (request) {
      if (request === 'firebase-admin') return adminStub;
      if (request === 'node-fetch') return async () => ({ ok: true, json: async () => state.paystackVerifyResponse });
      if (request === 'dotenv') return { config: () => {} };
      return realLoad.apply(this, arguments);
    };
    // Make sure nothing from the developer's shell leaks into the server.
    for (const k of ['CLEANUP_SECRET', 'TERMII_API_KEY', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'FIREBASE_SERVICE_ACCOUNT_BASE64', 'FIREBASE_SERVICE_ACCOUNT']) delete process.env[k];
    Object.assign(process.env, { PORT: String(port), FIREBASE_PROJECT_ID: 'demo-test', PAYSTACK_SECRET_KEY: 'sk_test_unit_secret' }, env);
    try { require(SERVER_FILE); } finally { Module._load = realLoad; }
    return new Promise((r) => setTimeout(r, 300)); // let app.listen bind
  }

  function request(method, pathname, bodyObj, headers = {}) {
    return new Promise((resolve, reject) => {
      const body = bodyObj === undefined ? null : Buffer.from(JSON.stringify(bodyObj));
      const req = http.request({
        host: '127.0.0.1', port, path: pathname, method,
        headers: { ...(body ? { 'Content-Type': 'application/json', 'Content-Length': body.length } : {}), ...headers },
      }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => { let json = null; try { json = JSON.parse(data); } catch (_) {} resolve({ status: res.statusCode, body: data, json }); });
      });
      req.on('error', reject);
      req.end(body || undefined);
    });
  }

  const reset = () => { store.clear(); state.paystackVerifyResponse = null; state.authUsers = {}; state.idTokens = {}; state.authCalls = []; state.storageSaves = []; state.defaultBucketConfigured = false; state.bucketMissing = false; };
  const stop = () => setTimeout(() => process.exit(0), 50).unref();

  return { store, state, start, request, reset, stop };
}

module.exports = { createHarness };
