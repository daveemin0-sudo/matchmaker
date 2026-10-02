const fs = require('fs');

const s1 = fs.readFileSync('Server.js', 'utf8');
const idx1 = s1.indexOf("'/discovery'");
console.log('--- Server.js /discovery ---');
console.log(s1.substring(idx1 - 10, idx1 + 1000));

const s2 = fs.readFileSync('webhook-server/index.js', 'utf8');
const idx2 = s2.indexOf("'/discovery'");
console.log('--- webhook-server /discovery ---');
console.log(s2.substring(idx2 - 10, idx2 + 1000));
