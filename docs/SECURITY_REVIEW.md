# Security review — 30 Oct 2026

Branch `security/checklist-2026-10`, on top of `launch/readiness-2026-10` (PR #15). Every claim below is backed by a test in `npm test` (164 passing), the Firestore emulator suite (`npm run test:rules`, CI), or a command shown here.

## Action needed from the owner first

**Two API keys are public.** The repository is public. Commits `1d69e41` / `9ef6fc4` (23 Sep 2026) hard-coded a **Termii** key (`tlv_Zf…`) and a **Metered** key (`06edf4…`) as fallbacks in `webhook-server/index.js`. They were removed from `main` on 24 Sep (`b1f1b74`), but they remain in history and in the current tree of the stale `production` branch. Removing history does not help once a key has been public:

1. Regenerate the key in the Termii dashboard, and in the Metered dashboard.
2. Set the new values as `TERMII_API_KEY` / `METERED_API_KEY` on Render, then redeploy.
3. Then delete the `production` branch, or say so and it will be deleted.

How this was found: every file version in all 371 commits on all 17 branches was extracted and scanned with `detect-secrets` 1.5.0 plus provider-specific patterns (Paystack, Google, Termii, private keys, service accounts, GitHub/FCM tokens). No other secret was found. The remaining hits are public by design: the Firebase web API key, the web-push public key and the Paystack **test** public key. No `.env`, service-account, keystore or `.pem` file was ever committed.

## Checklist

| # | Item | Status | What was found / done | Evidence |
|---|---|---|---|---|
| 1 | Proper authentication | ✅ Verified | Firebase Auth. Every backend route except webhooks, `/health` and OTP verifies the ID token and rejects disabled accounts. The fake on-screen OTP sign-in was removed in PR #15. | `backend-security`, `launch-guards` |
| 2 | Hide API keys | ⚠️ Owner action | Server secrets come only from env vars; none are in the current code. **Two leaked keys must be rotated** (above). The Firebase web key is public by design; restricting it to your domains in Google Cloud Console is still recommended. | `hardening`: no hard-coded keys |
| 3 | Secure the database | ✅ Verified | Rules tightened in PR #15. New `security_events` / `security_alerts` collections are server-only. | Emulator: 10/10 |
| 4 | Enforce HTTPS | ✅ Done | HSTS on the site (Vercel and Firebase Hosting) and the API. `upgrade-insecure-requests`. Android `allowMixedContent` off (the app loads nothing over HTTP). | `hardening` |
| 5 | Hash passwords | ✅ Verified | Firebase handles account passwords. Offline-only accounts use salted PBKDF2-SHA256 (PR #14). | `local-password` |
| 6 | Validate forms server-side | ✅ Fixed | Profile sync already checked age and lengths, but **published any string as a photo URL** (tracking pixels, other schemes, huge strings). Photos are now restricted to the formats the app produces. | `hardening`: photo URLs |
| 7 | XSS | ✅ Verified | Every main view was checked with hostile payloads (0 executions, PR #15). The admin page escapes all output. **SVG/HTML uploads are now refused.** | `security-monitoring`: uploads |
| 8 | Log and monitor suspicious activity | ✅ Built | Was missing entirely. See [Monitoring](#monitoring). | `security-monitoring` (10 tests) |
| 9 | Lock down admin routes | ✅ Verified | Every admin route requires sign-in plus `role: admin`, a field users can't write (rules). Non-admin attempts now raise a high alert. Admin page is `noindex`. | Emulator, `security-monitoring` |
| 10 | Parameterized queries | ✅ N/A | No SQL. Firestore queries take values as parameters, and document ids are derived on the server. | — |
| 11 | Environment variables | ✅ Done | Startup report lists each variable as set or MISSING (never the value), warns on a Paystack **test** key, and documents `SECURITY_LOG_SALT`. | `hardening` |
| 12 | Rate limiting | ✅ Fixed | 11 routes had none: uploads, call push, call-ended, TURN, unblock, voice-intro delete, profiles/me, admin suspend, admin unsuspend, cleanup, health. All limited now. | `hardening` |
| 13 | Restrict CORS | ✅ Fixed | Matched by substring: `https://localhost.attacker.com` and **any** `*.vercel.app` site were allowed. Now an exact allowlist, exact localhost (the Android app), and this project's Vercel URLs only. **`PUT` was missing, which would have blocked voice-intro uploads.** | `hardening` (fails on old server) |
| 14 | Security headers | ✅ Fixed | API: nosniff, DENY, CSP `default-src 'none'`, HSTS, no-store, no `X-Powered-By`. Site: HSTS, DENY framing, CSP (framing, plugins, base, forms), Permissions-Policy. | `hardening` |
| 15 | Secure session cookies | ✅ N/A | No cookies. Firebase ID tokens are sent as `Authorization: Bearer`. | — |
| 16 | CSRF | ✅ N/A | Bearer tokens can't be attached by another site. The only unauthenticated POSTs are the signed Paystack webhook and secret-protected cleanup. | — |
| 17 | Password reset links expire | ✅ Firebase | Reset links are issued by Firebase Auth (expire after 1 hour, single use). The phone reset uses Termii codes (10 minutes). | — |
| 18 | Upload types and sizes | ✅ Fixed | Sizes were capped, but the type was **whatever the browser claimed**. The file's real signature must now match (JPEG/PNG/GIF/WebP/HEIC, MP4/MOV/WebM, MP3/AAC/Ogg/WAV/FLAC/AMR). SVG and HTML are refused. | `security-monitoring` |
| 19 | Verify prices and payments | ✅ Verified | Amount and currency are checked against the server's plan prices; each Paystack reference is used once; webhook HMAC is checked in constant time. **Now fails closed when the secret is unset** (an empty-key HMAC can be forged). | `paystack-webhook`, `security-monitoring` |
| 20 | Production debug mode | ✅ Fixed | A malformed request returned an **HTML stack trace with server paths and library versions**. JSON errors only now. No debug flags or token logging in the client. | `hardening` (fails on old server) |
| 21 | Vulnerable dependencies | ✅ Improved | Backend: 0 critical, **0 high** (node-forge 1.4.2), 8 moderate, all in firebase-admin 12's Google Cloud chain. Root: 3 moderate (Capacitor CLI tooling, build-time only). | `npm audit --omit=dev` |
| 22 | Unused packages | ✅ Done | Removed `open` from the backend. Everything else is in use. | `hardening` |
| 23 | Exposed files | ✅ Fixed | `.vercelignore` (PR #15); Firebase Hosting now ignores tests, docs and markdown too. `.gitignore` covers Android signing keys. | `launch-guards`, `hardening` |
| 24 | Git history for leaked secrets | ⚠️ Found 2 | See top. | Scan above |
| 25 | Revoke and replace keys | ⚠️ Owner action | Only you can do this from the Termii and Metered dashboards. | — |
| 26 | Review, test, report | ✅ | This file. | — |

## Monitoring

`webhook-server/index.js`, `securityEvent()`:

- **Recorded:**
  - every 401, 403, 429 and 5xx (one response hook)
  - suspended accounts trying the app; non-admins on admin routes
  - SMS codes sent (per IP, plus a global burst detector for SMS-pumping fraud) and wrong codes per number
  - forged Paystack webhooks; payments that don't match the account or the price
  - rejected uploads; blocked origins
  - three or more reports against one person in a day
  - account deletions; every admin action (uncapped audit trail)
- **Alerts:** when a burst crosses its threshold, one `security_alerts` document is written per key and window. It appears on the admin page under **Suspicious activity**, where an admin can acknowledge it, and in the Render log as `[SECURITY_ALERT] …`.
- **Privacy:** IPs and phone numbers are stored only as salted HMACs (`SECURITY_LOG_SALT`). Every document has `expiresAt` 30 days out.
- **Cost:** at most 5 event writes per key and window; floods only increase a counter.
- **Not visible to the server:** email/password sign-in attempts go straight to Firebase Auth, which throttles them itself (and reports them in the Firebase console).

**Owner setup:** set `SECURITY_LOG_SALT` on Render, then add a Firestore **TTL policy** on the `expiresAt` field for `security_events` and `security_alerts` (Firestore → TTL). Without the policy the records are never deleted.

## Remaining (not blockers)

- firebase-admin 12 → 14 (clears the 8 moderate advisories; needs the modular API and Node 22).
- A full script CSP (`script-src`) needs the app's inline event handlers (320 in `index.html`, 48 more in templates in `script.js`) moved into script first.
- Alerts are only seen when someone opens the admin page. Push or email alerts need an email/SMS provider choice.
