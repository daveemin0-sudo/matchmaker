const fs = require('fs');

const script = fs.readFileSync('script.js', 'utf8');

const bootIdx = script.indexOf('function bootApplication');
console.log('bootApplication in script.js:\n', script.substring(bootIdx, bootIdx + 1500));
