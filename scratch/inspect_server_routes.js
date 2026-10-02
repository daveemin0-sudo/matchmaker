const fs = require('fs');

const s1 = fs.readFileSync('Server.js', 'utf8');
const m1 = [...s1.matchAll(/app\.(get|post)\(['"]([^'"]+)/g)].map(m => m[1].toUpperCase() + ' ' + m[2]);
console.log('Server.js routes:', m1);

const s2 = fs.readFileSync('webhook-server/index.js', 'utf8');
const m2 = [...s2.matchAll(/app\.(get|post)\(['"]([^'"]+)/g)].map(m => m[1].toUpperCase() + ' ' + m[2]);
console.log('webhook-server routes:', m2);
