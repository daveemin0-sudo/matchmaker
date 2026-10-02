const fs = require('fs');

const script = fs.readFileSync('script.js', 'utf8');

const idx = script.indexOf('function renderProfileScreen');
console.log('--- renderProfileScreen ---');
console.log(script.substring(idx, idx + 3500));
