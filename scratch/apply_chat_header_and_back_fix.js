const fs = require('fs');

console.log('--- Applying Chat Header & Back Button Fixes ---');

// 1. UPDATE style.css
let styleCss = fs.readFileSync('style.css', 'utf8');

// A. Fix html.user-logged-in #appHeader display rule
styleCss = styleCss.replace(
  `html.user-logged-in #appHeader,\nhtml.user-logged-in #bottomNav {\n  display: flex !important;\n}`,
  `html.user-logged-in #appHeader:not(.is-hidden),\nhtml.user-logged-in #bottomNav:not(.is-hidden) {\n  display: flex;\n}\n\nbody.in-chat #appHeader,\n.app-shell.in-chat #appHeader,\n#appHeader.is-hidden {\n  display: none !important;\n}\n\nbody.in-chat #bottomNav,\n.app-shell.in-chat #bottomNav,\n#bottomNav.is-hidden {\n  display: none !important;\n}`
);

// B. Update chat-partner-bar & children in style.css
styleCss = styleCss.replace(
  /\.chat-partner-bar\s*\{[\s\S]*?min-height:[^;]+;\s*\}/,
  `.chat-partner-bar {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding-top: calc(env(safe-area-inset-top, 0px) + 6px) !important;
  padding-bottom: 6px !important;
  padding-left: 10px !important;
  padding-right: 10px !important;
  background: var(--bg-elevated) !important;
  border-bottom: 1px solid var(--border-color) !important;
  flex-shrink: 0 !important;
  position: sticky !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  z-index: 100 !important;
  box-sizing: border-box !important;
  min-height: calc(52px + env(safe-area-inset-top, 0px)) !important;
}`
);

styleCss = styleCss.replace(
  /\.chat-back-arrow-btn\s*\{[\s\S]*?flex-shrink:\s*0;\s*transition:[^;]+;\s*\}/,
  `.chat-back-arrow-btn {
  width: 28px !important;
  height: 36px !important;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0 !important;
  margin: 0 !important;
  flex-shrink: 0 !important;
  transition: background var(--t-fast), transform var(--t-fast);
}`
);

styleCss = styleCss.replace(
  /\.chat-partner-avatar\s*\{[\s\S]*?color:\s*#fff;\s*\}/,
  `.chat-partner-avatar {
  width: 38px !important;
  height: 38px !important;
  min-width: 38px !important;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  background-color: var(--card-dark);
  flex-shrink: 0 !important;
  border: 2px solid var(--accent-pink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.05rem;
  color: #fff;
  margin-right: 2px !important;
}`
);

styleCss = styleCss.replace(
  /\.chat-partner-name\s*\{[\s\S]*?line-height:\s*1\.25;\s*\}/,
  `.chat-partner-name {
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  color: var(--text-primary);
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  line-height: 1.2 !important;
}`
);

styleCss = styleCss.replace(
  /\.chat-action-icon-btn\s*\{[\s\S]*?transition:[^;]+;\s*\}/,
  `.chat-action-icon-btn {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 !important;
  flex-shrink: 0 !important;
  transition: background var(--t-fast), color var(--t-fast), transform var(--t-fast);
}`
);

fs.writeFileSync('style.css', styleCss, 'utf8');
console.log('✓ Updated style.css with hidden chat appHeader and responsive chat partner bar');

// 2. UPDATE premium.css
let premCss = fs.readFileSync('premium.css', 'utf8');

premCss = premCss.replace(
  /\/\* Partner Info Header Bar: STRICTLY STATIC AT TOP \(WhatsApp-style\) \*\/[\s\S]*?\.chat-partner-avatar\s*\{[\s\S]*?flex-shrink:\s*0\s*!important;\s*\}/,
  `/* Partner Info Header Bar: STRICTLY STATIC AT TOP (WhatsApp-style) */
body.in-chat #appHeader,
.app-shell.in-chat #appHeader,
#appHeader.is-hidden {
  display: none !important;
}

body.in-chat #bottomNav,
.app-shell.in-chat #bottomNav,
#bottomNav.is-hidden {
  display: none !important;
}

.chat-partner-bar {
  background: rgba(18, 11, 26, 0.95) !important;
  backdrop-filter: blur(28px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(28px) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  padding: 8px 10px !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  position: sticky !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
  z-index: 100 !important;
  flex-shrink: 0 !important;
}

[data-theme="light"] .chat-partner-bar {
  background: rgba(255, 255, 255, 0.96) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.chat-back-arrow-btn {
  width: 28px !important;
  height: 36px !important;
  border-radius: 50% !important;
  border: none !important;
  background: transparent !important;
  color: var(--text-primary) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  padding: 0 !important;
  margin: 0 !important;
  flex-shrink: 0 !important;
}

.chat-partner-avatar {
  width: 38px !important;
  height: 38px !important;
  min-width: 38px !important;
  border-radius: 50% !important;
  background-size: cover !important;
  background-position: center !important;
  border: 2px solid #FF2E70 !important;
  box-shadow: 0 0 10px rgba(255, 46, 112, 0.35) !important;
  flex-shrink: 0 !important;
  margin: 0 2px 0 0 !important;
}

.chat-partner-info {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  cursor: pointer !important;
}

.chat-partner-name {
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  color: var(--text-primary) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  line-height: 1.2 !important;
}

.chat-call-btns {
  display: flex !important;
  align-items: center !important;
  gap: 2px !important;
  flex-shrink: 0 !important;
  margin-left: auto !important;
}

.chat-action-icon-btn {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  border-radius: 50% !important;
  border: none !important;
  background: transparent !important;
  color: var(--text-primary) !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  flex-shrink: 0 !important;
}

.chat-action-icon-btn svg {
  width: 18px !important;
  height: 18px !important;
}`
);

fs.writeFileSync('premium.css', premCss, 'utf8');
console.log('✓ Updated premium.css with responsive chat partner bar rules');

// 3. UPDATE script.js
let script = fs.readFileSync('script.js', 'utf8');

// Update showScreen to toggle 'in-chat' class on body and app-shell, and hide appHeader
script = script.replace(
  `  const oldScreen = appState.currentScreen;\n  appState.previousScreen = oldScreen;\n  appState.currentScreen = screenId;\n\n  // Show/hide nav and header appropriately\n  const isAuth = AUTH_SCREENS.includes(screenId);\n  const navEl = document.getElementById('bottomNav');\n  if (navEl) navEl.style.display = (isAuth || screenId === 'chat') ? 'none' : 'flex';`,
  `  const oldScreen = appState.currentScreen;\n  appState.previousScreen = oldScreen;\n  appState.currentScreen = screenId;\n\n  // Show/hide nav and header appropriately\n  const isAuth = AUTH_SCREENS.includes(screenId);\n  const isChat = screenId === 'chat';\n\n  if (isChat) {\n    document.body.classList.add('in-chat');\n    const shell = document.querySelector('.app-shell');\n    if (shell) shell.classList.add('in-chat');\n  } else {\n    document.body.classList.remove('in-chat');\n    const shell = document.querySelector('.app-shell');\n    if (shell) shell.classList.remove('in-chat');\n  }\n\n  const navEl = document.getElementById('bottomNav');\n  if (navEl) {\n    if (isAuth || isChat) {\n      navEl.classList.add('is-hidden');\n      navEl.style.setProperty('display', 'none', 'important');\n    } else {\n      navEl.classList.remove('is-hidden');\n      navEl.style.display = 'flex';\n    }\n  }\n\n  const headerEl = document.getElementById('appHeader');\n  if (headerEl) {\n    if (isAuth || isChat) {\n      headerEl.classList.add('is-hidden');\n      headerEl.style.setProperty('display', 'none', 'important');\n    } else {\n      headerEl.classList.remove('is-hidden');\n      headerEl.style.display = 'flex';\n    }\n  }`
);

// Update updateHeader function
const oldUpdateHeaderTarget = `function updateHeader(screenId) {
  const backBtn = document.getElementById('backBtn');
  const headerTitle = document.getElementById('headerTitle');
  const headerRight = document.getElementById('headerRight');
  const header = document.getElementById('appHeader');

  if (!header) return;

  // Hide global appHeader on auth screens and on chat screen (chat screen has its own WhatsApp-style header)
  header.style.display = (AUTH_SCREENS.includes(screenId) || screenId === 'chat') ? 'none' : 'flex';

  if (!backBtn || !headerTitle) return;

  // Ensure headerRight is visible on main screens
  if (headerRight) headerRight.style.display = 'flex';

  const searchBtn  = document.getElementById('headerSearchBtn');
  const reportBtn  = document.getElementById('chatReportBtn');
  const upgradeBtn = document.getElementById('upgradeHeaderBtn');
  const matchBtn   = document.getElementById('matchesQuickBtn');

  // Exact icon scoping requested by user:
  // - Heart (matches): Discovery only
  // - Report & Block (exclamation): Discovery only (in middle of heart & crown for reporting profiles), strictly hidden on settings, profile, chatsList, matches
  // - Crown (upgrade): Discovery & Matches
  // - Search: Discovery & Matches
  setHeaderBtnVisible(searchBtn, screenId === 'discovery' || screenId === 'matches');
  setHeaderBtnVisible(matchBtn, screenId === 'discovery');
  setHeaderBtnVisible(reportBtn, screenId === 'discovery');
  setHeaderBtnVisible(upgradeBtn, screenId === 'discovery' || screenId === 'matches');

  switch (screenId) {
    case 'discovery':
      setHeaderBtnVisible(backBtn, false);
      headerTitle.className = 'main-header-logo';
      headerTitle.innerHTML = '<span class="header-flame-icon">🔥</span><span class="brand-hook">hookme</span>';
      headerTitle.style.background = '';
      headerTitle.style.webkitBackgroundClip = '';
      headerTitle.style.webkitTextFillColor = '';
      break;
    case 'matches':
      setHeaderBtnVisible(backBtn, true);
      setHeaderTitle('Matches');
      break;
    case 'chatsList':
      setHeaderBtnVisible(backBtn, false);
      setHeaderTitle('Messages 💬');
      break;
    case 'chat': {
      setHeaderBtnVisible(backBtn, true);
      const partner = matchedUsers.find(u => u.id === appState.currentChatId);
      setHeaderTitle(partner ? \`\${escHtml(partner.name)} <span style="color:var(--green-match);font-size:0.7rem;margin-left:6px">●</span>\` : 'Chat');
      break;
    }
    case 'profile':
      setHeaderBtnVisible(backBtn, true);
      setHeaderTitle('Profile');
      break;
    case 'settings':
      setHeaderBtnVisible(backBtn, true);
      setHeaderTitle('Settings');
      break;
  }
}`;

const newUpdateHeader = `function updateHeader(screenId) {
  const backBtn = document.getElementById('backBtn');
  const headerTitle = document.getElementById('headerTitle');
  const headerRight = document.getElementById('headerRight');
  const header = document.getElementById('appHeader');

  if (!header) return;

  // STRICTLY HIDE global appHeader on auth screens and on chat screen (chat has its own WhatsApp-style partner bar)
  if (AUTH_SCREENS.includes(screenId) || screenId === 'chat') {
    header.classList.add('is-hidden');
    header.style.setProperty('display', 'none', 'important');
    return;
  } else {
    header.classList.remove('is-hidden');
    header.style.display = 'flex';
  }

  if (!backBtn || !headerTitle) return;

  // Ensure headerRight is visible on main screens
  if (headerRight) headerRight.style.display = 'flex';

  const searchBtn  = document.getElementById('headerSearchBtn');
  const reportBtn  = document.getElementById('chatReportBtn');
  const upgradeBtn = document.getElementById('upgradeHeaderBtn');
  const matchBtn   = document.getElementById('matchesQuickBtn');

  // Exact icon scoping:
  setHeaderBtnVisible(searchBtn, screenId === 'discovery' || screenId === 'matches');
  setHeaderBtnVisible(matchBtn, screenId === 'discovery');
  setHeaderBtnVisible(reportBtn, screenId === 'discovery');
  setHeaderBtnVisible(upgradeBtn, screenId === 'discovery' || screenId === 'matches');

  // Back button visibility:
  // Main bottom navigation tabs (Discovery, Matches, Messages, Profile) DO NOT have back button beside page name.
  // Only sub-screens (e.g., Settings) have a back button!
  switch (screenId) {
    case 'discovery':
      setHeaderBtnVisible(backBtn, false);
      headerTitle.className = 'main-header-logo';
      headerTitle.innerHTML = '<span class="header-flame-icon">🔥</span><span class="brand-hook">hookme</span>';
      headerTitle.style.background = '';
      headerTitle.style.webkitBackgroundClip = '';
      headerTitle.style.webkitTextFillColor = '';
      break;
    case 'matches':
      setHeaderBtnVisible(backBtn, false);
      setHeaderTitle('Matches');
      break;
    case 'chatsList':
      setHeaderBtnVisible(backBtn, false);
      setHeaderTitle('Messages 💬');
      break;
    case 'profile':
      setHeaderBtnVisible(backBtn, false);
      setHeaderTitle('Profile');
      break;
    case 'settings':
      setHeaderBtnVisible(backBtn, true);
      setHeaderTitle('Settings');
      break;
    case 'chat':
      setHeaderBtnVisible(backBtn, false);
      break;
  }
}`;

const norm = s => s.replace(/\r\n/g, '\n');
if (norm(script).includes(norm(oldUpdateHeaderTarget))) {
  script = norm(script).replace(norm(oldUpdateHeaderTarget), norm(newUpdateHeader));
  console.log('✓ Successfully updated updateHeader logic');
} else {
  console.error('Could not find oldUpdateHeaderTarget');
}

fs.writeFileSync('script.js', script, 'utf8');

// 4. BUMP VERSION in sw.js and index.html to v50
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/hmbs-cache-v\d+/g, 'hmbs-cache-v50');
fs.writeFileSync('sw.js', sw, 'utf8');

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/\?v=\d+/g, '?v=50');
fs.writeFileSync('index.html', html, 'utf8');
console.log('✓ Bumped cache version to v50');
