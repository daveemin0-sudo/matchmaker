const fs = require('fs');

const script = fs.readFileSync('script.js', 'utf8');

const initMatches = [...script.matchAll(/function\s+init[A-Za-z0-9_]*\s*\([^)]*\)\s*\{/g)].map(m => m[0]);
console.log('init functions:', initMatches);

const loadMatches = [...script.matchAll(/addEventListener\(['"]DOMContentLoaded['"][\s\S]*?\n\}/g)].map(m => m[0]);
console.log('DOMContentLoaded:\n', loadMatches);

// Also look at the bottom of script.js
console.log('Bottom of script.js:\n', script.slice(-1500));
