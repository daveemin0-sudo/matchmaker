const fs = require('fs');

const s = fs.readFileSync('script.js', 'utf8');
const keys = [...s.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(['"]([^'"]+)['"]/g)].map(m => m[1]);
console.log('Unique localStorage keys in script.js:\n', [...new Set(keys)]);
