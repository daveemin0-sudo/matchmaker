const fs = require('fs');

const s = fs.readFileSync('script.js', 'utf8');

const userDefIdx = s.indexOf('let currentUser');
console.log('currentUser definition:\n', s.substring(userDefIdx, userDefIdx + 500));

const authStateIdx = s.indexOf('fbAuth.onAuthStateChanged');
console.log('onAuthStateChanged:\n', s.substring(authStateIdx, authStateIdx + 1000));
