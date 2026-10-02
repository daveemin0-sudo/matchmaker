const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const screens = [...html.matchAll(/<div[^>]*class="[^"]*screen[^"]*"[^>]*>/g)].map(m => m[0]);
console.log('Screens in index.html and their initial classes/ids:');
screens.forEach(s => console.log(s));
