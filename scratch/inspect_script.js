const fs = require('fs');

const script = fs.readFileSync('script.js', 'utf8');
const switchTabIdx = script.indexOf('function switchTab');
console.log('switchTab in script.js:\n', script.substring(switchTabIdx, switchTabIdx + 1200));

// Also search all occurrences of settingsScreen in script.js
const settingsMatches = [...script.matchAll(/.{0,50}settingsScreen.{0,50}/g)].map(m => m[0]);
console.log('\nsettingsScreen in script.js:\n', settingsMatches);

// Also search all occurrences of showScreen in script.js
const showScreenCalls = [...script.matchAll(/showScreen\([^)]*\)/g)].map(m => m[0]);
console.log('\nSome showScreen calls in script.js:\n', showScreenCalls.slice(0, 20));
