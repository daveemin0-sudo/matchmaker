const fs = require('fs');

const styleCss = fs.readFileSync('style.css', 'utf8');
const premCss = fs.readFileSync('premium.css', 'utf8');

const allCss = styleCss + '\n' + premCss;

const screens = [
  'loginScreen',
  'signupScreen',
  'signupSuccessScreen',
  'discoveryScreen',
  'matchesScreen',
  'chatsListScreen',
  'chatScreen',
  'profileScreen',
  'settingsScreen'
];

console.log('--- Checking for display rules on each screen ID in CSS ---');
screens.forEach(s => {
  const regex = new RegExp(`#[\\w-]*${s}[^{]*\\{[^}]*\\}`, 'g');
  const matches = [...allCss.matchAll(regex)].map(m => m[0]);
  const displayMatches = matches.filter(m => /display\s*:/i.test(m));
  if (displayMatches.length > 0) {
    console.log(`\nScreen #${s} has display rules:`);
    displayMatches.forEach(m => console.log(m.trim()));
  }
});
