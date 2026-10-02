const fs = require('fs');

const styleCss = fs.readFileSync('style.css', 'utf8');
const premCss = fs.readFileSync('premium.css', 'utf8');

function findOccurrences(css, term, filename) {
  const lines = css.split('\n');
  lines.forEach((line, i) => {
    if (line.includes(term)) {
      console.log(`${filename}:${i+1}: ${line.trim()}`);
    }
  });
}

console.log('--- settingsScreen in style.css ---');
findOccurrences(styleCss, 'settingsScreen', 'style.css');

console.log('--- settingsScreen in premium.css ---');
findOccurrences(premCss, 'settingsScreen', 'premium.css');

console.log('--- profileScreen in style.css ---');
findOccurrences(styleCss, 'profileScreen', 'style.css');

console.log('--- profileScreen in premium.css ---');
findOccurrences(premCss, 'profileScreen', 'premium.css');
