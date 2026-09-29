# Matchmaker — Production Product Specification

## Product goal
Build a serious, production-grade dating and matchmaking platform for adults (18+) with a strong Nigerian launch market and an architecture that can expand internationally.

This is not a demo or a UI clone. Every core interaction must work with real accounts, persistent data, real-time messaging, abuse controls, observability, and recoverable production infrastructure.

## Launch principles
1. Mobile-first.
2. 18+ only.
3. Privacy and safety are first-class product requirements.
4. Server-authoritative security for anything valuable or sensitive.
5. No exact location exposure.
6. Payments are verified server-to-server.
7. Media is stored in object storage, not database documents.
8. Every important mutation is authenticated, authorized, validated, and rate-limited.
9. Build measurable foundations before adding growth features.
10. Ship in vertical slices that can be tested end-to-end.

## Release stages

### R0 — Production foundation
- Repository/branch strategy
- Environment separation
- CI checks
- Error handling and logging
- Security rules review
- Authentication hardening
- Backup/recovery plan
- Production configuration
- Smoke tests

### R1 — Core dating loop
- Registration/login
- 18+ onboarding
- Profile and photo management
- Dating preferences
- Discovery
- Like/pass/super-like
- Mutual matching
- Match list

### R2 — Communication
- Real-time conversations
- Text messages
- Image/video attachments
- Voice notes
- Read receipts
- Typing/online state
- Push notifications
- Message moderation
- Block/unmatch

### R3 — Trust and safety
- Profile reporting
- Message/media reporting
- Blocking
- Abuse/rate-limit controls
- Moderation queue
- Account suspension
- Appeal workflow
- Audit logging
- Privacy controls
- Account/data deletion

### R4 — Revenue
- Free tier
- Premium subscription
- Boosts
- Super likes
- Server-side payment verification
- Subscription lifecycle handling
- Receipts and entitlement reconciliation

### R5 — Operations
- Admin dashboard
- User/search tools
- Moderation tools
- Analytics
- Product metrics
- Feature flags
- Support workflows

### R6 — Mobile and scale
- Capacitor/native packaging
- Store release preparation
- CDN/media optimization
- Background jobs
- Caching
- Database/index optimization
- Load and abuse testing
- Internationalization

## Non-negotiable launch requirements
- No client-controlled VIP/admin privileges.
- No public access to private reports.
- No secrets committed to Git.
- No trusting payment success callbacks from the browser.
- No unrestricted media URLs for private content.
- No exact GPS coordinates shown to other users.
- No discovery of blocked users.
- No messaging users who are not authorized participants.
- Account deletion must have a documented data-retention policy.
- Production errors must be observable.

## Core entities
users, profiles, preferences, photos, swipes, matches, conversations, messages, media, notifications, blocks, reports, moderation_actions, subscriptions, payments, verification_events, audit_logs.

## Success metrics
Track these without collecting unnecessary personal data:
- signup completion
- onboarding completion
- profile completion
- discovery sessions
- likes/pass ratio
- mutual match rate
- first-message rate
- conversation reply rate
- 7/30-day retention
- report/block rate
- paid conversion
- subscription retention
- media upload failure rate
- message delivery failure rate

## Definition of done
A feature is not done because its UI exists. It is done only when:
- happy path works;
- failure states are handled;
- authorization is enforced server-side;
- mobile behavior is tested;
- data survives refresh/relogin;
- abuse/rate limits are considered;
- logs/errors are observable;
- production configuration is documented;
- automated tests cover critical logic.
