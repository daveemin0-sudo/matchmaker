const fs = require('fs');

const script = fs.readFileSync('script.js', 'utf8');
const showScreenIdx = script.indexOf('function showScreen');
console.log(script.substring(showScreenIdx, showScreenIdx + 2000));

const styleCss = fs.readFileSync('style.css', 'utf8');
const premCss = fs.readFileSync('premium.css', 'utf8');

console.log('--- Checking CSS rules for screens ---');
function findRules(css, name) {
  const matches = [...css.matchAll(new RegExp(`[^}]*${name}[^{]*\\{[^}]*\\}`, 'g'))].map(m => m[0]);
  return matches;
}

console.log('settingsScreen rules in style.css:', findRules(styleCss, '#settingsScreen'));
console.log('settingsScreen rules in premium.css:', findRules(premCss, '#settingsScreen'));

console.log('.screen rules in style.css:', findRules(styleCss, '\\.screen'));
console.log('.screen rules in premium.css:', findRules(premCss, '\\.screen'));
