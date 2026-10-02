const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const settingsIdx = html.indexOf('id="settingsScreen"');
console.log('--- settingsScreen HTML header ---');
console.log(html.substring(settingsIdx, settingsIdx + 1200));
