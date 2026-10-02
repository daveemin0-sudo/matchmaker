const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const screenIds = [...html.matchAll(/id="([^"]*)"/g)]
  .map(m => m[1])
  .filter(id => id.toLowerCase().includes('screen') || id.toLowerCase().includes('setting') || id.toLowerCase().includes('profile') || id.toLowerCase().includes('discover') || id.toLowerCase().includes('match'));
console.log('Relevant IDs in index.html:', screenIds);

const screens = [...html.matchAll(/class="[^"]*screen[^"]*"/g)].map(m => m[0]);
console.log('Classes with screen:', screens.slice(0, 10));

const script = fs.readFileSync('script.js', 'utf8');
const showScreenMatches = [...script.matchAll(/function\s+showScreen\s*\([^)]*\)\s*\{[\s\S]*?\}/g)].map(m => m[0]);
console.log('showScreen in script.js:\n', showScreenMatches[0] || 'not found');

const navItems = [...html.matchAll(/data-screen="([^"]*)"/g)].map(m => m[1]);
console.log('data-screen in index.html:', navItems);
