const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

function getElementSnippet(id) {
  const idx = html.indexOf(`id="${id}"`);
  if (idx === -1) return `${id} not found`;
  return html.substring(idx - 20, idx + 400);
}

console.log('--- discoveryScreen snippet ---');
console.log(getElementSnippet('discoveryScreen'));

console.log('--- matchesScreen snippet ---');
console.log(getElementSnippet('matchesScreen'));

console.log('--- profileScreen snippet ---');
console.log(getElementSnippet('profileScreen'));

console.log('--- settingsScreen snippet ---');
console.log(getElementSnippet('settingsScreen'));

const bottomNavIdx = html.indexOf('id="bottomNav"');
console.log('--- bottomNav snippet ---');
console.log(html.substring(bottomNavIdx, bottomNavIdx + 1500));
