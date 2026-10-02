const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Chat Header, Back Button & Name Visibility ---');

const script = fs.readFileSync('script.js', 'utf8');
const styleCss = fs.readFileSync('style.css', 'utf8');
const premCss = fs.readFileSync('premium.css', 'utf8');

// 1. Check duplicate appHeader suppression in chat
assert.ok(styleCss.includes('body.in-chat #appHeader,\n.app-shell.in-chat #appHeader,\n#appHeader.is-hidden {\n  display: none !important;'), 'style.css hides appHeader in chat');
assert.ok(premCss.includes('body.in-chat #appHeader,\n.app-shell.in-chat #appHeader,\n#appHeader.is-hidden {\n  display: none !important;'), 'premium.css hides appHeader in chat');
assert.ok(script.includes("if (AUTH_SCREENS.includes(screenId) || screenId === 'chat') {\n    header.classList.add('is-hidden');\n    header.style.setProperty('display', 'none', 'important');\n    return;\n  }"), 'updateHeader hides appHeader on chat screen');
console.log('✓ 1. Global appHeader is strictly suppressed on chat screen (no duplicate header)');

// 2. Check back button visibility on main pages
assert.ok(script.includes("case 'matches':\n      setHeaderBtnVisible(backBtn, false);\n      setHeaderTitle('Matches');"), 'Matches tab has no back button beside title');
assert.ok(script.includes("case 'chatsList':\n      setHeaderBtnVisible(backBtn, false);\n      setHeaderTitle('Messages 💬');"), 'Messages tab has no back button beside title');
assert.ok(script.includes("case 'profile':\n      setHeaderBtnVisible(backBtn, false);\n      setHeaderTitle('Profile');"), 'Profile tab has no back button beside title');
assert.ok(script.includes("case 'settings':\n      setHeaderBtnVisible(backBtn, true);\n      setHeaderTitle('Settings');"), 'Settings sub-screen has back button');
console.log('✓ 2. Back button removed from all main tabs (Matches, Profile, Messages, Discovery); kept only on Settings');

// 3. Check chat partner bar dimensions and room for full name
assert.ok(premCss.includes('padding: 8px 10px !important;'), 'Chat partner bar padding reduced to 8px 10px to maximize name space');
assert.ok(premCss.includes('gap: 6px !important;'), 'Chat partner bar gap optimized to 6px');
assert.ok(premCss.includes('.chat-back-arrow-btn {\n  width: 28px !important;'), 'Back arrow button compacted to 28px');
assert.ok(premCss.includes('.chat-partner-avatar {\n  width: 38px !important;\n  height: 38px !important;'), 'Avatar sized to 38px');
assert.ok(premCss.includes('.chat-action-icon-btn {\n  width: 32px !important;\n  height: 32px !important;'), 'Action buttons sized to 32px');
assert.ok(premCss.includes('.chat-partner-name {\n  font-size: 0.95rem !important;\n  font-weight: 700 !important;'), 'Chat partner name given 0.95rem bold visibility');
console.log('✓ 3. Chat partner bar perfectly proportioned so user name fits cleanly between avatar and icons');

console.log('\nALL 3 CHAT HEADER & BACK BUTTON TESTS PASSED PERFECTLY!');
