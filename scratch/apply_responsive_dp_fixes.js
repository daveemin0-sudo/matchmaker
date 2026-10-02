const fs = require('fs');

console.log('--- Applying Responsive DP & Font Scaling Fixes ---');

// 1. Update style.css
let styleCss = fs.readFileSync('style.css', 'utf8');

// Replace .app-shell mobile query margin
styleCss = styleCss.replace(
  /\.app-shell\s*\{\s*width:\s*100%\s*!important;\s*max-width:\s*100%\s*!important;[\s\S]*?margin:\s*0\s*!important;[\s\S]*?\}/,
  `.app-shell {
    width: 100% !important;
    max-width: 520px !important;
    height: 100% !important;
    height: 100vh !important;
    height: 100dvh !important;
    min-height: 100dvh !important;
    max-height: 100dvh !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.45) !important;
    margin: 0 auto !important;
    padding: 0 !important;
  }`
);

// Append comprehensive DP / Font scaling responsive block to style.css
const responsiveBlock = `
/* ==========================================================================
   RESPONSIVE DP WIDTH & ACCESSIBILITY FONT-SCALING REINFORCEMENTS
   Ensures cards never spill objects, profile is always centered, and all
   elements fit fluidly across all Android "Smallest width" (DP) settings.
   ========================================================================== */

/* Universal centering of App Shell & Core Layout */
body {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  background: var(--bg) !important;
  overflow: hidden !important;
}

.app-shell {
  width: 100% !important;
  max-width: 520px !important;
  margin: 0 auto !important;
}

.app-shell > .app-header,
.app-header {
  width: 100% !important;
  max-width: 520px !important;
  margin: 0 auto !important;
  box-sizing: border-box !important;
}

.app-shell > .bottom-nav,
.bottom-nav {
  width: 100% !important;
  max-width: 520px !important;
  margin: 0 auto !important;
  box-sizing: border-box !important;
}

.screens-container {
  width: 100% !important;
  max-width: 520px !important;
  margin: 0 auto !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}

.screen {
  width: 100% !important;
  max-width: 520px !important;
  margin: 0 auto !important;
  box-sizing: border-box !important;
}

/* ── PROFILE SCREEN: Perfect Center & Elastic Card Fit ── */
#profileScreen {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

#profileScreen .profile-workspace,
.hk-profile-workspace {
  width: 100% !important;
  max-width: 520px !important;
  margin: 0 auto !important;
  padding: 16px clamp(12px, 3.5vw, 20px) 96px !important;
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 16px !important;
}

.hk-profile-workspace > * {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  flex-shrink: 0 !important;
}

/* Profile Vault Cards (Super Likes, Boost, Rewinds): Never spill text/pills */
.hk-vault-wrapper {
  width: 100% !important;
  box-sizing: border-box !important;
}

.hk-vault-cards {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: clamp(6px, 2vw, 10px) !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.hk-v-card {
  min-width: 0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  padding: 12px 6px 10px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  text-align: center !important;
}

.hk-v-icon {
  font-size: clamp(1.1rem, 3.5vw, 1.35rem) !important;
  margin-bottom: 2px !important;
}

.hk-v-metric {
  font-size: clamp(0.72rem, 2.2vw, 0.88rem) !important;
  font-weight: 800 !important;
  color: var(--txt-primary, #FFFFFF) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 100% !important;
}

.hk-v-title {
  font-size: clamp(0.6rem, 1.8vw, 0.7rem) !important;
  color: #8C869A !important;
  margin-top: 2px !important;
  font-weight: 600 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 100% !important;
}

.hk-v-btn-pill {
  margin-top: 6px !important;
  padding: 4px 8px !important;
  border-radius: 999px !important;
  font-size: clamp(0.58rem, 1.8vw, 0.68rem) !important;
  font-weight: 700 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* Profile Stats Strip (Matches, Likes, Super Likes) */
.hk-stats-strip {
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 12px 8px !important;
  border-radius: 20px !important;
}

.hk-stat-cell {
  flex: 1 1 0% !important;
  min-width: 0 !important;
  text-align: center !important;
  overflow: hidden !important;
  padding: 0 4px !important;
}

.hk-stat-val {
  font-size: clamp(1.1rem, 3.5vw, 1.45rem) !important;
  font-weight: 800 !important;
  line-height: 1.1 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.hk-stat-sub {
  font-size: clamp(0.62rem, 1.9vw, 0.74rem) !important;
  font-weight: 600 !important;
  color: #8C869A !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 100% !important;
}

/* Profile Action Buttons Grid (Edit Profile, Preview Card) */
.hk-hero-actions-grid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: clamp(8px, 2vw, 12px) !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.hk-hero-btn {
  padding: 10px 12px !important;
  min-width: 0 !important;
  font-size: clamp(0.72rem, 2.2vw, 0.84rem) !important;
  overflow: hidden !important;
}

.hk-hero-btn span {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* Membership Gold Promo Card */
.hk-gold-promo-card {
  width: 100% !important;
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  padding: 14px 16px !important;
}

.hk-gpc-left {
  flex: 1 !important;
  min-width: 0 !important;
}

.hk-gpc-title {
  font-size: clamp(0.82rem, 2.4vw, 0.94rem) !important;
  line-height: 1.3 !important;
}

.hk-gpc-desc {
  font-size: clamp(0.68rem, 2vw, 0.76rem) !important;
  line-height: 1.35 !important;
}

.hk-gpc-action-btn {
  flex-shrink: 0 !important;
  font-size: clamp(0.72rem, 2vw, 0.8rem) !important;
  padding: 8px 14px !important;
}

/* Verification Prompt Card */
.hk-verify-prompt-card {
  width: 100% !important;
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 12px 14px !important;
}

.hk-vpc-info {
  flex: 1 !important;
  min-width: 0 !important;
}

.hk-vpc-desc {
  font-size: clamp(0.7rem, 2vw, 0.76rem) !important;
  line-height: 1.35 !important;
}

.hk-vpc-btn {
  flex-shrink: 0 !important;
}

/* ── DISCOVERY SCREEN: Fluid Proportions & Protected Card Bounds ── */
#discoveryScreen {
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
  overflow: hidden !important;
}

.discovery-workspace {
  width: 100% !important;
  max-width: 500px !important;
  margin: 0 auto !important;
  padding: 8px 12px 0 !important;
  box-sizing: border-box !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  position: relative !important;
}

.card-stack {
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  flex: 1 1 auto !important;
  position: relative !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

.profile-card {
  width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  position: absolute !important;
  inset: 0 !important;
  border-radius: var(--r-xl) !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

/* Card Content: Text & elements NEVER come outside the card */
.card-info {
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  padding: clamp(12px, 2.5vh, 22px) clamp(12px, 3.5vw, 18px) !important;
  z-index: 4 !important;
  max-height: 65% !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-end !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  pointer-events: none !important;
}

.card-info > * {
  pointer-events: auto !important;
}

.card-name-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  margin-bottom: 4px !important;
  min-width: 0 !important;
  flex-wrap: wrap !important;
}

.card-name-row h2 {
  font-size: clamp(1.3rem, 4.2vw, 1.85rem) !important;
  font-weight: 800 !important;
  line-height: 1.15 !important;
  margin: 0 !important;
  word-break: break-word !important;
}

.card-tags {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 5px !important;
  margin-bottom: 6px !important;
  max-height: 48px !important;
  overflow: hidden !important;
}

.tag-chip {
  font-size: clamp(0.65rem, 1.8vw, 0.74rem) !important;
  padding: 3px 9px !important;
  border-radius: 999px !important;
  white-space: nowrap !important;
}

.card-bio {
  font-size: clamp(0.74rem, 2vw, 0.86rem) !important;
  line-height: 1.35 !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  margin: 0 !important;
}

.card-distance-badge {
  position: absolute !important;
  top: clamp(10px, 2vh, 16px) !important;
  right: clamp(10px, 2.5vw, 16px) !important;
  padding: 4px 10px !important;
  font-size: clamp(0.65rem, 1.8vw, 0.74rem) !important;
  max-width: 55% !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  box-sizing: border-box !important;
}

/* Action Controls (Like, Super Like, Pass, Rewind, Boost) */
.action-row {
  width: 100% !important;
  max-width: 500px !important;
  margin: 0 auto clamp(6px, 1.5vh, 12px) auto !important;
  padding: 4px 10px !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
}

.action-row-inner {
  display: flex !important;
  justify-content: space-evenly !important;
  align-items: center !important;
  gap: clamp(5px, 1.8vw, 12px) !important;
  width: 100% !important;
  max-width: 440px !important;
  padding: clamp(6px, 1vh, 10px) clamp(8px, 2vw, 14px) !important;
  box-sizing: border-box !important;
}

.action-row-inner .circ-btn.btn-rewind {
  width: clamp(38px, 9.5vw, 46px) !important;
  height: clamp(38px, 9.5vw, 46px) !important;
}
.action-row-inner .circ-btn.btn-pass {
  width: clamp(44px, 11vw, 54px) !important;
  height: clamp(44px, 11vw, 54px) !important;
}
.action-row-inner .circ-btn.btn-like {
  width: clamp(54px, 13.5vw, 66px) !important;
  height: clamp(54px, 13.5vw, 66px) !important;
}
.action-row-inner .circ-btn.btn-super {
  width: clamp(38px, 9.5vw, 46px) !important;
  height: clamp(38px, 9.5vw, 46px) !important;
}
.action-row-inner .circ-btn.btn-boost {
  width: clamp(38px, 9.5vw, 46px) !important;
  height: clamp(38px, 9.5vw, 46px) !important;
}

/* Other Workspaces Centering */
.matches-workspace,
.settings-workspace,
.chat-workspace,
.convo-messages-wrap {
  width: 100% !important;
  max-width: 520px !important;
  margin: 0 auto !important;
  box-sizing: border-box !important;
}
`;

styleCss += '\n' + responsiveBlock;
fs.writeFileSync('style.css', styleCss, 'utf8');
console.log('Appended responsive block to style.css');

// 2. Also update premium.css to reinforce the responsive action row and discovery card
let premCss = fs.readFileSync('premium.css', 'utf8');
premCss = premCss.replace(
  /\.action-row\s*\{\s*padding:\s*6px 10px !important;\s*margin:\s*0 12px 16px 12px !important;[\s\S]*?\}/,
  `.action-row {
  padding: 4px 10px !important;
  margin: 0 auto clamp(6px, 1.5vh, 12px) auto !important;
  width: 100% !important;
  max-width: 500px !important;
  gap: 0 !important;
  justify-content: center !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-sizing: border-box !important;
}`
);

premCss += '\n' + responsiveBlock;
fs.writeFileSync('premium.css', premCss, 'utf8');
console.log('Reinforced responsive rules in premium.css');

// 3. Bump version to v45 in index.html and sw.js
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/style\.css\?v=\d+/g, 'style.css?v=45');
html = html.replace(/premium\.css\?v=\d+/g, 'premium.css?v=45');
html = html.replace(/script\.js\?v=\d+/g, 'script.js?v=45');
fs.writeFileSync('index.html', html, 'utf8');
console.log('Bumped index.html to v45');

let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const SW_VERSION = "v\d+";/, 'const SW_VERSION = "v45";');
sw = sw.replace(/\/\* hookmebysam Service Worker v\d+/, '/* hookmebysam Service Worker v45');
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('Bumped sw.js to v45');
