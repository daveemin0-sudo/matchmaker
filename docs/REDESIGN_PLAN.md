# hookmebysam UI/UX redesign — audit and plan

Branch: `redesign/ui-system-v1` (never merged to `main` without review).
Production entry points (verified, not assumed): `index.html` + `style.css` + `premium.css` + `script.js` + `firebase-config.js`, served statically (Vercel / Firebase Hosting); backend `webhook-server/index.js` on Render. `admin.html` is a separate admin page.

## 1. Audit (baseline, before the redesign)

### Size and structure
| File | Lines | Notes |
|---|---|---|
| `index.html` | 3,258 | 9 screens, ~35 modals/sheets/overlays, heavy inline `style=""` |
| `style.css` | 14,471 | ~1,100 classes, ~1,200 `!important` |
| `premium.css` | 7,003 | ~510 classes, ~2,800 `!important`; overrides `style.css` |
| `script.js` | 17,357 | UI is largely built from JS template strings |

Two stylesheets fight each other with `!important`; ~20% of the classes in them are not referenced by any HTML/JS (dead). Light theme is a pile of `[data-theme="light"]` patches (~970 selectors) instead of tokens.

### Screens (ids in `index.html`)
`loginScreen`, `signupScreen` (4 steps), `signupSuccessScreen`, `discoveryScreen`, `matchesScreen` (likes + connections), `chatsListScreen`, `chatScreen`, `profileScreen`, `settingsScreen`.

### Modals / sheets / overlays
ageGateOverlay, editProfileModal, legalModal, paywallModal, discoveryFilterModal, profileDetailModal, safetyToolkitModal, unmatchReasonModal, storyViewerOverlay, storyCaptionOverlay, forgotPasswordModal, forwardModal, phoneVerifyModal, languageModal, editUsernameModal, reactionInfoModal, profilePreviewModal, searchModalOverlay, ratingModalOverlay, selfieVerifyModal, voiceCallOverlay, videoCallOverlay, emojiPickerPanel, chatAiSuggestionsPanel (+ report sheet, media preview, notification banner, toasts, all JS-created).

### Findings
Brand / identity
- No logo on the login screen (a heart emoji in a box); header wordmark is plain pink text; favicon is a 🔥 emoji (the app is not a fire-themed brand).
- Icons are a mix of emoji and ad-hoc SVGs; some are wrong (age field shows a coffee cup).

Hierarchy / layout
- A "Stay in the loop" notification card is injected at the top of every tab and overlaps content (on desktop it floats over the search field).
- Discovery top bar has five unlabeled icon buttons; a "Today's top pick" card sits above the swipe card and steals ~90px of the most valuable screen.
- Everything is a card with glow, gradient and large radius; buttons use glowing gradients; many headings carry emoji.
- Settings/profile are long stacks of bordered cards.

Honesty (fabricated content presented as real) — these will be removed or made truthful, not just restyled
- Likes teaser hard-codes "4 premium users have already swiped right on you" with stock photos.
- A hard-coded fake "Sponsored: Dress to Impress" ad is shown on the Matches screen.
- `calculateCompatibility()` clamps every pairing to 84–98 % and the UI shows "95 % MATCH" / "98 % Match" badges: a made-up statistic. It will be replaced by the real shared interests.
- Demo profiles exist only in guest mode (verified: real users get `profileStack = []` / Firestore pool) — keep, but label the mode clearly.

Accessibility / responsive
- `maximum-scale=1.0, user-scalable=no` blocks zoom (WCAG 1.4.4).
- Many icon-only buttons have no accessible name; focus states are inconsistent; ~970 light-theme patch selectors mean some text/icon combos are unreadable.
- Desktop shows the phone column in the middle with no adapted layout.

## 2. Direction

Name: keep **hookmebysam** (header wordmark "hookme"). New symbol: a single-stroke heart whose right edge continues into a fishing-hook tail ("hook me"), flat ember on ink, works at 16 px. Replaces the 🔥 favicon and the heart-emoji login badge; PWA icons regenerated from the same SVG.

Principles: flat surfaces and 1 px borders over glow; one solid primary colour; gradients only where they carry information (photo scrims for legible text, VIP gold); fewer cards, open layouts with dividers; real type scale; consistent icon set; every control labelled.

Tokens (all colour pairs checked for contrast by a script in `tests/`):
- Dark (default): ink `#0F0C11` / surface `#17131A` / raised `#211B25`; text `#F6F1EE`; primary ember `#D6335A`; VIP gold only for VIP.
- Light: paper `#FAF6F3` / white surfaces; text `#1E1519`; primary `#C42A50`.
- Type: **Plus Jakarta Sans** variable (self-hosted, OFL, 27 KB) for UI; **Fraunces Italic** (self-hosted, OFL, 45 KB) for a few brand moments only. Scale 12 / 13 / 15 / 17 / 20 / 26 / 34.
- Space: 4 px scale. Radii: 6 (chips) · 10 (controls) · 16 (cards, sheets) · 24 (swipe card) · full (avatars, pills). Elevation: border-first, two shadows.
- Icons: Lucide (ISC) subset as one inline SVG sprite; stroke 1.75; sizes 16 / 20 / 24.
- Motion: 120 / 200 / 320 ms, `prefers-reduced-motion` honoured.

## 3. Method (so nothing breaks)

1. New layered stylesheets in `css/` (`tokens`, `base`, `components`, then per-screen). No new framework, no build step.
2. Screen by screen: write the new styles, then **prune the legacy rules for the classes that screen owns** from `style.css`/`premium.css` (tool-assisted, only classes confirmed unused elsewhere). The legacy files shrink until deleted.
3. Preserve every `id`, `onclick`, `data-*` and JS hook; templates change markup only where the redesign needs it, with the handler kept.
4. After each screen: headless-Chromium screenshots (390×844, 360×740, 768×1024, 1280×800; dark + light), console-error check, click-through of the screen's actions, `npm test`.

## 4. Status (stages A–G)

| Stage | State |
|---|---|
| A audit | done (section 1) |
| B direction + tokens | done: `css/tokens.css`, dark default + light theme, Plus Jakarta Sans, Fraunces italic accent, flat/border-first surfaces |
| C shared components | done: `css/components.css` (buttons, fields, switch, segmented, chips, badges, avatar, list rows, sheets, confirm, menu, viewer, notices, empty states) and an inline SVG icon sprite (`tools/build-sprite.js`) |
| D every screen | done: auth, onboarding wizard, discovery, matches, inbox, chat (composer, media, voice, calls), profile, edit profile, settings, paywall, and every dialog/sheet |
| E responsive + a11y | checked at 390x844, 360x740, 768x1024, 1280x800 in dark and light; focus trap/Escape/restore on all dialogs, reduced-motion, contrast tests, tap targets |
| F regression | `npm test` (79 tests) plus Playwright click-through scripts (account/settings, match popup, onboarding wizard, call controls, dialogs) |
| G polish + PR | PR opened, not merged |

### Decisions taken during the redesign
- **Verification removed.** The self-service "face scan" verification and the "verified only" filter were removed: the backend never publishes a verified flag, so they were fake trust signals. Sample profiles no longer claim verification.
- **Onboarding** collects only what the person chooses; nothing is pre-selected, and nothing invented is saved (no default gender, lifestyle, prompts, bio, age or interests).
- **Dialogs** all share one sheet/confirm pattern with a common focus trap (`dialogOpened`, `openSheetDialog`, `watchStaticDialogs`).
- **Calls** have their own `css/call.css`; mute/camera/speaker state is exposed through `aria-pressed` and matching labels.
- **Honesty:** no invented statistics, countdowns, discounts, social proof or premium benefits that are not implemented. Paywall prices are asserted equal to the server's.
- **Feedback** now actually saves (`app_feedback`, create-only rule in `firestore.rules`).
- **Legacy CSS** reduced by pruning only selectors confirmed unused (`tools/css-prune.js`).

### Not verified in this sandbox / open items
- Firestore rules are in the repo only; the owner must publish them (including `app_feedback`).
- Firebase Storage is not provisioned (Blaze billing), so Status/stories are disabled. The story viewer overlay is still legacy-styled and unreachable.
- Real photos, two-device chat, voice/video calls, push notifications, Paystack and Termii flows were not exercised live; screenshots use placeholders and a sample-profile fixture.
- Fixed after the redesign (Oct 23): people search now runs on the server (`GET /profiles/search`, name prefixes, 20 results) instead of downloading every public profile; the no-Firebase fallback hashes local passwords with PBKDF2 and no longer signs Firebase accounts in with any password; voice intros are saved on the server (Storage, or a server-only `voice_intros` doc until Storage is provisioned) so other people actually hear them. Existing profiles become searchable on their next sign-in, or all at once via `POST /admin/migrate-public-profiles`. The `voice_intros` rule must be published with the rest of `firestore.rules`.
- Legal copy (refund window, NDPR/GDPR wording) is owner-authored and not reviewed.
