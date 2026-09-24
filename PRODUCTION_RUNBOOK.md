# hookmebysam Production Runbook

## Code hardening completed on `production-hardening`

The branch now contains server-authoritative payment verification, persistent OTP state, backend swipe limits, Firestore-enforced blocks, authenticated report intake, real WebRTC signaling, Firebase Messaging service-worker registration, media ownership rules, expired story media cleanup, and an authenticated moderation dashboard.

## Required production configuration

### Render backend

Set these environment variables on the backend service:

- `PORT`
- `FRONTEND_URL`
- `ALLOWED_ORIGINS` — exact Vercel production origin(s)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_SERVICE_ACCOUNT_JSON` or the equivalent supported service-account variable
- `PAYSTACK_SECRET_KEY` — live secret key
- `TERMII_API_KEY`
- `TERMII_SENDER_ID`
- `CLEANUP_SECRET`
- `METERED_API_KEY`
- `METERED_DOMAIN`
- `DAILY_FREE_SWIPES` — default is 100

Do not put any of the secret values into GitHub source files.

### Frontend

Replace the placeholder `PAYSTACK_PUBLIC_KEY` in `firebase-config.js` with the real live Paystack public key before accepting production VIP payments.

### Firebase

Deploy and verify both:
- `firestore.rules`
- `storage.rules`

Create one trusted admin account and set its private Firestore user document field `role` to `admin` from an administrative path. The normal client cannot change this field.

Before opening matchmaking to existing users, sign in to `admin.html` and run **Migrate existing profiles** once. Matchmaking reads only `public_profiles`; private `users` documents are no longer publicly readable.

### GitHub Actions

Create repository secrets:
- `CLEANUP_URL` = the deployed backend `/stories/cleanup` endpoint
- `CLEANUP_SECRET` = the same secret configured on Render
- `BACKEND_HEALTH_URL` = the deployed backend `/health` endpoint

The workflow runs story cleanup every 30 minutes and checks backend health. High-risk abuse limits (OTP/report) are also persisted in Firestore so they survive backend restarts.

## Required smoke tests

Use two real test accounts on real devices and verify:

1. Sign-up / login and OTP delivery.
2. Profile creation and Storage upload.
3. Like/pass/superlike and the server-side free swipe limit.
4. Mutual match creation and push notification.
5. Messaging, read state, delete/edit, and block enforcement.
6. Report submission and appearance in `/admin.html`.
7. Admin review, resolve/dismiss, suspend, and unsuspend.
8. Voice call over Wi-Fi and cellular data.
9. Video call over Wi-Fi and cellular data.
10. Background notification after closing the PWA.
11. Paystack live payment with a small real transaction, followed by server verification.
12. Expired story cleanup removes both the Firestore story record and stored media.
13. Account deletion completes backend cleanup of profile, matches/messages, swipes, blocks, stories, tokens, storage media, and the Firebase Auth account.

## Credential rotation

The repository previously contained credentials that should be treated as exposed. Rotate at minimum the previously committed Termii and Metered credentials before launch, even though the current runtime code no longer contains those values.

## Launch gate

The repository changes do not prove that the live Render service has the required environment variables, that Firebase rules have been deployed, or that live Paystack/Termii/Metered services work from real devices. Those are deployment and end-to-end verification steps and must be completed before announcing the app as production-ready.
