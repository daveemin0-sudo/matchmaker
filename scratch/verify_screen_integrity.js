const fs = require('fs');

const styleCss = fs.readFileSync('style.css', 'utf8');
const premCss = fs.readFileSync('premium.css', 'utf8');

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

console.log('--- Verifying CSS rule integrity for all screens ---');

// Check that no rule gives #screenName { display: flex !important; } or display: block !important without .active
const combinedCss = styleCss + '\n' + premCss;

let hasLeak = false;

screens.forEach(s => {
  // Regex looking for `#screenName {` or `#screenName,` (not followed by .active or :not)
  const regex = new RegExp(`(^|\\s|,)#${s}\\s*\\{[^}]*\\}`, 'gm');
  const matches = [...combinedCss.matchAll(regex)].map(m => m[0]);
  matches.forEach(m => {
    if (/display\s*:\s*(flex|block|grid|inline)/i.test(m)) {
      console.error(`LEAK DETECTED on #${s}:`, m.trim());
      hasLeak = true;
    }
  });
});

if (!hasLeak) {
  console.log('SUCCESS: No screen ID has an un-scoped display rule.');
}

// Check universal suppression at end of style.css and premium.css
const hasUniversalStyle = styleCss.includes('.screen:not(.active)') && styleCss.includes('display: none !important;');
const hasUniversalPrem = premCss.includes('.screen:not(.active)') && premCss.includes('display: none !important;');

console.log('Universal suppression in style.css:', hasUniversalStyle);
console.log('Universal suppression in premium.css:', hasUniversalPrem);

if (hasLeak || !hasUniversalStyle || !hasUniversalPrem) {
  process.exit(1);
} else {
  console.log('ALL SCREEN VISIBILITY CHECKS PASSED PERFECTLY!');
}
