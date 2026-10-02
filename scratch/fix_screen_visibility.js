const fs = require('fs');

console.log('--- Fixing Screen Visibility & Inactive Screen Leak ---');

// 1. Process style.css
let styleCss = fs.readFileSync('style.css', 'utf8');

// Replace #profileScreen block in responsive section
const oldProfileBlock = `/* ── PROFILE SCREEN: Perfect Center & Elastic Card Fit ── */
#profileScreen {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}`;

const newProfileBlock = `/* ── PROFILE SCREEN: Perfect Center & Elastic Card Fit ── */
#profileScreen {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
  width: 100% !important;
}

#profileScreen.active {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}`;

if (styleCss.includes(oldProfileBlock)) {
  styleCss = styleCss.replace(oldProfileBlock, newProfileBlock);
  console.log('Updated #profileScreen in style.css');
} else {
  console.log('WARNING: oldProfileBlock not matched in style.css');
}

// Replace #discoveryScreen block in responsive section
const oldDiscoveryBlock = `/* ── DISCOVERY SCREEN: Fluid Proportions & Protected Card Bounds ── */
#discoveryScreen {
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
  overflow: hidden !important;
}`;

const newDiscoveryBlock = `/* ── DISCOVERY SCREEN: Fluid Proportions & Protected Card Bounds ── */
#discoveryScreen {
  width: 100% !important;
  overflow: hidden !important;
}

#discoveryScreen.active {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
}`;

if (styleCss.includes(oldDiscoveryBlock)) {
  styleCss = styleCss.replace(oldDiscoveryBlock, newDiscoveryBlock);
  console.log('Updated #discoveryScreen in style.css');
} else {
  console.log('WARNING: oldDiscoveryBlock not matched in style.css');
}

// Add universal screen suppression at the end of style.css
const universalScreenBlock = `
/* ==========================================================================
   UNIVERSAL SCREEN VISIBILITY INTEGRITY
   Guarantees that inactive screens are 100% suppressed and never leak or overlap.
   ========================================================================== */
.screen:not(.active) {
  display: none !important;
}
.screen.active {
  display: flex !important;
}
`;

styleCss += universalScreenBlock;
fs.writeFileSync('style.css', styleCss, 'utf8');
console.log('style.css written successfully.');

// 2. Process premium.css
let premCss = fs.readFileSync('premium.css', 'utf8');

if (premCss.includes(oldProfileBlock)) {
  premCss = premCss.replace(oldProfileBlock, newProfileBlock);
  console.log('Updated #profileScreen in premium.css');
} else {
  console.log('WARNING: oldProfileBlock not matched in premium.css');
}

if (premCss.includes(oldDiscoveryBlock)) {
  premCss = premCss.replace(oldDiscoveryBlock, newDiscoveryBlock);
  console.log('Updated #discoveryScreen in premium.css');
} else {
  console.log('WARNING: oldDiscoveryBlock not matched in premium.css');
}

premCss += universalScreenBlock;
fs.writeFileSync('premium.css', premCss, 'utf8');
console.log('premium.css written successfully.');

// 3. Version bump to v46 in index.html & sw.js
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/style\.css\?v=\d+/g, 'style.css?v=46');
html = html.replace(/premium\.css\?v=\d+/g, 'premium.css?v=46');
html = html.replace(/script\.js\?v=\d+/g, 'script.js?v=46');
fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html bumped to v46');

let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const SW_VERSION = "v\d+";/, 'const SW_VERSION = "v46";');
sw = sw.replace(/\/\* hookmebysam Service Worker v\d+/, '/* hookmebysam Service Worker v46');
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('sw.js bumped to v46');
