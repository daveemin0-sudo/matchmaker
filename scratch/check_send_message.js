const fs = require('fs');

const s = fs.readFileSync('script.js', 'utf8');
const idx = s.indexOf('function sendMessage');
console.log('sendMessage in script.js:\n', s.substring(idx, idx + 2500));
