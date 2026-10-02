const fs = require('fs');

// 1. Revert index.html
let html = fs.readFileSync('index.html', 'utf8');

// Age gate logo -> 🔞
html = html.replace(
  /<div style="display:flex;justify-content:center;margin-bottom:16px">\s*<img src="logo\.png"[\s\S]*?<\/div>/,
  '<div style="font-size:3.5rem;margin-bottom:16px">🔞</div>'
);

// Header logo -> remove img
html = html.replace(
  /\s*<img src="logo\.png" alt="hookmebysam" class="header-logo-badge" width="28" height="28">/,
  ''
);

// Onboarding Step 1 logo -> ✨
html = html.replace(
  /<div class="ob-hero-logo"[\s\S]*?<img src="logo\.png"[\s\S]*?<\/div>/,
  '<div class="ob-hero-emoji">✨</div>'
);

// Bump version to v44 for sw and cache busting
html = html.replace(/style\.css\?v=\d+/g, 'style.css?v=44');
html = html.replace(/premium\.css\?v=\d+/g, 'premium.css?v=44');
html = html.replace(/script\.js\?v=\d+/g, 'script.js?v=44');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Updated index.html: reverted in-page logos & bumped to v44');

// 2. Clean up style.css header-logo-badge
let css = fs.readFileSync('style.css', 'utf8');
css = css.replace(/\/\* ── HookMe Luxury Logo Header Badge ── \*\/[\s\S]*?\[data-theme="light"\] \.header-logo-badge \{[\s\S]*?\}/, '');
fs.writeFileSync('style.css', css, 'utf8');
console.log('Cleaned up style.css');

// 3. Update sw.js to v44
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const SW_VERSION = "v\d+";/, 'const SW_VERSION = "v44";');
sw = sw.replace(/\/\* hookmebysam Service Worker v\d+/, '/* hookmebysam Service Worker v44');
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('Updated sw.js to v44');
