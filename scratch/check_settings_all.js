const fs = require('fs');

const files = ['style.css', 'premium.css', 'script.js', 'index.html'];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = [...content.matchAll(/(?:^|[^\w])(#?settingsScreen[^{;\n]*)/g)].map(m => m[1]);
  console.log(`Matches in ${file}:`, matches);
}
