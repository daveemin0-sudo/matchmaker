const fs = require('fs');

const script = fs.readFileSync('script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

console.log('=== 1. PROFILE STRENGTH IN SCRIPT.JS ===');
const strengthFuncs = [...script.matchAll(/function\s+[A-Za-z0-9_]*[Ss]trength[A-Za-z0-9_]*\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g)].map(m => m[0]);
console.log('Strength functions:\n', strengthFuncs.join('\n---\n'));

// Search where strength is calculated or rendered
const strengthCalls = [...script.matchAll(/[^\n]{0,60}[Ss]trength[^\n]{0,60}/g)].map(m => m[0]);
console.log('\nStrength occurrences in script.js:\n', strengthCalls.slice(0, 20));

console.log('\n=== 2. PHOTO / SELFIE VERIFICATION IN SCRIPT.JS ===');
const selfieFuncs = [...script.matchAll(/function\s+[A-Za-z0-9_]*(?:[Ss]elfie|[Vv]erif)[A-Za-z0-9_]*\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g)].map(m => m[0]);
console.log('Selfie / Verification functions:\n', selfieFuncs.join('\n---\n'));

console.log('\n=== 3. HTML ELEMENTS FOR STRENGTH AND VERIFICATION ===');
const htmlElements = [...html.matchAll(/<[^>]+(?:strength|selfie|verify|verified)[^>]*>/gi)].map(m => m[0]);
console.log('HTML Elements:\n', htmlElements);
