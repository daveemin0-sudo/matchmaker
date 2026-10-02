const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find all screen elements and headers
const screens = html.match(/<div[^>]*class="[^"]*screen[^"]*"[^>]*>/g);
console.log('Screens:', screens);

// Find chat related containers
const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('chat') && (l.includes('id=') || l.includes('class='))) {
    if (l.includes('header') || l.includes('screen') || l.includes('view') || l.includes('top')) {
      console.log(`Line ${idx+1}: ${l.trim()}`);
    }
  }
});
