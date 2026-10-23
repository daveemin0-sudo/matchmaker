# Launch readiness — 23 Oct 2026

Branch `launch/readiness-2026-10`, built on open PRs #9 (call media failures) and #14 (search, offline passwords, voice intros). This file supersedes the claims in `PRODUCTION_AUDIT.md`, whose "VERIFIED" rows were not backed by runnable evidence.

**Bottom line:** not ready for a public launch yet. The code-side launch blockers found in this audit are fixed and tested. What remains needs owner access (Firebase, Render, Paystack) or two real devices; see [Blockers](#blockers).

## 1. Starting point

Static PWA (`index.html` + `script.js`, ~650 KB), Firebase Auth/Firestore on the client, Express backend `webhook-server/` on Render (Paystack, Termii OTP, Metered TURN, admin, uploads), Vercel for the frontend. `main` was at PR #13, with 99 passing tests.

## 2. Findings and fixes (priority order)

| # | Severity | Finding | Fix | Evidence |
|---|---|---|---|---|
| 1 | Critical | When no SMS could be sent (incl. a 3 s backend timeout), the app **invented an OTP, displayed and auto-filled it, then said "Signed in"** with no Firebase session, showing the phone's cached profile. | Fallback and acceptance removed; 20 s timeout; user told to retry. Backend OTP (Termii, rate-limited) unchanged. | `tests/launch-guards.test.js` |
| 2 | Critical | Offline sign-in accepted **any password** for Firebase accounts used on the device. | Refused offline; local accounts use PBKDF2. (PR #14) | Headless: `main` signs in, branch refuses |
| 3 | High | Firestore: an unverified token with someone's email could **read their private user doc**. | Clause removed (no client used it). | `tests/rules/` (emulator, CI) |
| 4 | High | Firestore: either participant could **rewrite any message or its sender**. | Sender edits own; other side may only mark read/react. | `tests/rules/` |
| 5 | High | **Unmatch / Delete chat / Clear chat did nothing server-side** (rules forbid the client's deletes). Unmatched people could keep messaging; chats returned on reload. | `POST /matches/end`; unmatch records a block (`kind: 'unmatch'`) so existing block enforcement applies. | `tests/end-match.test.js` |
| 6 | High | Discovery read only the **first 200 profiles**; once swiped, Discovery was empty forever. Preferences applied only on the phone. | Server applies age/gender, pages by doc id (≤5×200 reads). | `tests/discovery-paging.test.js` (4/5 fail on old server) |
| 7 | High | Backend deps: critical `proxy-addr`, high `grpc-js`, Express advisories. | `npm audit fix` (non-breaking). | `npm audit`: 0 critical |
| 8 | Medium | Users could self-edit `suspended`, `mergedInto`, `deletedAt`. | Server-only in rules. | `tests/rules/` |
| 9 | Medium | Read receipts query needed an undefined composite index, so it **always failed silently**. | Index-free query. | `tests/launch-guards.test.js` |
| 10 | Medium | Email sign-up **pre-selected "Man"**. | No default; choice required. | `tests/launch-guards.test.js` |
| 11 | Medium | Gold advertised **"AI portraits"**, a feature with no entry point. | Copy lists likes and rewinds only. | `tests/launch-guards.test.js` |
| 12 | Medium | Vercel serves the repo root: backend source, tests, internal docs, Firebase config were public URLs (not confirmed: previews are access-protected). | `.vercelignore`. | `tests/launch-guards.test.js` |
| 13 | Medium | Distance filter ignored real profiles (no stored distance). | Uses the city-based distance the cards show. | Code review |
| 14 | Low | Two test files shared port 3189. | Separate ports. | — |

Plus PR #14 (server-side search, voice intros that others can hear) and PR #9 (honest call-failure reporting).

## 3. Verification

| Area | Status | Exact verification | Evidence / measurement | Remaining blocker |
|---|---|---|---|---|
| Unit/integration (backend + frontend logic) | Verified | `npm test` (repo root) | 143 pass, 0 fail, exit 0 | — |
| Firestore rules | Implemented, not verified locally | `npm run test:rules` needs the emulator; download blocked in sandbox | Runs in CI job `firestore-rules` | See CI result on the PR |
| Responsive layout | Verified (headless) | `node tools/headless-verify.js <repo> <outdir>` | 4 viewports × 6 screens: 0 overflow, 0 script errors; `docs/evidence/` | Real devices not tested |
| XSS in names, bios, messages, search | Verified (headless) | same script, payload in every main view | 0 executions, 0 injected nodes | — |
| Load performance | Measured | same script; 390×844, CPU 4×, 150 ms RTT, 1.6 Mbps, gzip | DCL 1978 ms, load 2406 ms, LCP 972 ms, CLS 0, 322 KB / 20 requests; `script.js` 648 KB raw / 162 KB gzip | Firebase CDN unreachable in sandbox, so real-world numbers will be higher |
| Offline sign-in | Verified (headless) | Seeded accounts, three attempts | Firebase account refused; wrong password refused; right password accepted | — |
| Two-account flows (match, chat, calls, push, payments) | Not tested | Needs live Firebase + 2 devices | — | Owner test session |
| Dependency audit | Verified | `npm audit --omit=dev` | backend: 0 critical, 2 high (firebase-admin v12 → node-forge); root: 3 moderate | firebase-admin v14 migration |

## 4. Blockers

1. **Paystack is in test mode.** `firebase-config.js` line 20 has `pk_test_…`. Owner: set the live public key there and `PAYSTACK_SECRET_KEY=sk_live_…` on Render, then make one real payment and refund it.
2. **Firestore rules not published.** Owner: after merging, `firebase deploy --only firestore:rules` (or paste in the console). Includes the `voice_intros`, `app_feedback`, message and user-field rules.
3. **Backend not redeployed.** Owner: redeploy Render from `main`; confirm `https://matchmaker-viwb.onrender.com/health` responds (the Production Ops workflow checks it every 30 min).
4. **TURN relay.** Calls across networks need valid `METERED_API_KEY` / `METERED_DOMAIN` on Render.
5. **No live two-device test.** Owner: run the 20 end-to-end scenarios with two test accounts on two phones (sign up, onboarding, photos, like/match, chat both ways, unread counts, block/report, unmatch, delete account).
6. **Firebase Storage not provisioned** (Blaze billing). Stories stay disabled; uploads use fallbacks.
7. **Legal copy** (refund window, NDPR wording) not reviewed by counsel.

## 5. Decisions for the owner

- **Anyone can message anyone from search.** Rules allow a chat between any two unblocked users, without a mutual like. This looks deliberate ("direct connect"), but for a dating app it is a spam/harassment risk. Recommend requiring a mutual match, or a daily cap on new conversations.
- **"Delete/Clear chat for both of you"** lets one person remove the other's copy, including evidence of abuse. Consider keeping messages that are part of an open report.

## 6. Follow-ups (not blockers)

- `firebase-admin` 12 → 14: v14 removes the namespaced API (`admin.credential`, `admin.firestore.FieldValue`) and needs Node 22; migrate to the modular imports, then upgrade.
- Chat history loads the whole conversation on open; add "load earlier" pagination.
- `script.js` is 648 KB in one file; splitting the call, stories and admin code would cut first-load parse time.
- Dead code: the AI portrait engine (unreachable) and `backendSignUp` (unused, invents defaults).
- Storage rule `voicenotes/{uid}` is readable by any signed-in user (only matters once Storage is on).

## 7. Rollback

Every change is in normal commits on this branch. To roll back: revert the merge commit on `main` and redeploy Render and Vercel. Firestore rules: republish the previous `firestore.rules` from git history.
