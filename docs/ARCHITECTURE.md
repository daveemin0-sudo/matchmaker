# Matchmaker — Production Architecture

## Current foundation
The existing application is a vanilla JavaScript PWA using Firebase Authentication, Cloud Firestore, Firebase Storage, Firebase Cloud Messaging, Capacitor, and a Node/Express service for privileged integrations such as Termii and Paystack.

We will evolve this architecture incrementally. A framework migration is not a prerequisite for making the current product production-grade.

## System boundaries

```
Web / PWA / Capacitor
        |
        +--> Firebase Auth
        |
        +--> Firestore  <---- privileged backend/Admin SDK
        |
        +--> Firebase Storage
        |
        +--> FCM
        |
        +--> Node/Express API
                  |
                  +--> Termii
                  +--> Paystack
                  +--> privileged Firebase operations
```

## Trust model

### Client-trusted only for presentation
- UI state
- optimistic rendering
- local cache
- non-authoritative preferences

### Server/database authoritative
- identity
- authorization
- ownership
- matches
- message participant access
- reports
- moderation actions
- VIP/subscription entitlements
- payment verification
- account deletion operations
- security-sensitive timestamps/status

## Data model direction

### users/{uid}
Identity and public-safe profile summary. Sensitive/private fields should be separated where practical.

### profiles/{uid}
Public profile data: display name, age-derived display value, bio, interests, photos, coarse location.

### preferences/{uid}
Age range, distance range, discovery preferences, and other matching preferences.

### swipes/{swipeId}
actorId, targetId, action, createdAt. Enforce actor ownership and prevent duplicate/invalid mutations.

### matches/{matchId}
participantIds, createdAt, lastActivityAt, status.

### conversations/{conversationId}
participantIds, matchId, lastMessageAt, status.

### conversations/{conversationId}/messages/{messageId}
senderId, type, text/media metadata, createdAt, editedAt, deletedAt, moderation state.

### blocks/{blockId}
blockedBy, blockedUserId, createdAt.

### reports/{reportId}
reporterId, targetType, targetId, reason, evidence, createdAt, status. Reports are never publicly readable by normal users.

### subscriptions/{uid}
Provider-neutral entitlement state. Client cannot grant itself entitlement.

### payments/{paymentId}
Provider reference, uid, amount, currency, status, verifiedAt, createdAt. Idempotency is required.

### audit_logs/{eventId}
Privileged/admin/security events only; access is restricted.

## Media architecture

Profile and chat media must use Firebase Storage/object storage. Firestore stores metadata and references, not binary payloads.

For private chat media:
1. authenticate user;
2. authorize conversation membership;
3. validate type/size;
4. upload to controlled storage path;
5. persist metadata;
6. serve through access-controlled URLs/rules.

Never accept arbitrary storage paths from the client as proof of authorization.

## Matching architecture

Start with deterministic filtering:
1. active/eligible account;
2. 18+;
3. reciprocal preference compatibility;
4. blocked/excluded users removed;
5. already-seen/acted-on users removed;
6. coarse distance filter;
7. ranking by compatibility and freshness.

Recommendation scoring can become a separate service later. Do not introduce ML before the basic funnel is measurable.

## Reliability

Critical mutations should be idempotent where possible. Payment verification, match creation, notification dispatch, and media/message operations must tolerate retries.

Use structured logs with:
- request/event ID
- authenticated UID where appropriate
- operation
- result
- latency
- error class

Do not log passwords, OTP values, access tokens, payment secrets, or private message contents.

## Environments

At minimum:
- local/development
- staging
- production

Each environment should have separate credentials/configuration and explicit deployment targets.

## Migration principle

Do not rewrite the existing 300k+ line client blindly. First stabilize the production boundary and core data contracts. Then extract high-risk domains into tested modules/services. A later Next.js/React migration can happen behind stable backend contracts rather than becoming a giant rewrite.
