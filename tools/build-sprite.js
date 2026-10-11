#!/usr/bin/env node
/* Builds icons/sprite.svg from a list of Lucide icons (https://lucide.dev, ISC)
 * and inlines it into index.html between the sprite markers.
 *
 *   npm i --prefix /tmp/lucide lucide-static
 *   LUCIDE_DIR=/tmp/lucide/node_modules/lucide-static/icons node tools/build-sprite.js
 *
 * Without LUCIDE_DIR it only re-inlines the committed icons/sprite.svg, so the
 * build never needs network access. Add a name to ICONS and re-run to add an icon.
 * Use in markup:  <svg class="i" aria-hidden="true"><use href="#i-heart"/></svg>
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const spritePath = path.join(root, 'icons/sprite.svg');
const htmlPath = path.join(root, 'index.html');

const ICONS = `arrow-left arrow-right chevron-left chevron-right chevron-down chevron-up x check check-check plus minus
ellipsis ellipsis-vertical search sliders-horizontal settings bell bell-off info circle-help circle-alert triangle-alert
circle-check loader-circle refresh-cw rotate-ccw undo-2 external-link heart heart-handshake star zap crown sparkles flame
gem badge-check shield-check shield-alert shield eye eye-off lock lock-open ban flag user users user-plus user-x handshake
gift rocket thumbs-up map-pin compass house message-circle message-square send paperclip image image-plus camera video
video-off mic mic-off phone phone-off phone-call play pause volume-2 smile languages globe moon sun mail key-round trash-2
pencil share-2 forward reply copy download upload log-out clock calendar cake briefcase graduation-cap ruler wine
cigarette dumbbell baby coffee plane utensils music scan-face fingerprint wifi-off bookmark layers keyboard delete rotate-cw archive archive-restore file square-pen circle circle-x circle-user user-round message-circle-heart heart-off bell-ring images file-text film inbox lightbulb at-sign bot wand-sparkles rewind arrow-up arrow-down square refresh-ccw volume-x list-filter hourglass`.split(/\s+/).filter(Boolean);

const LOGO = '<symbol id="i-logo" viewBox="0 0 64 64"><path d="M31 47 C19 40 14 33 14 26 a8.5 8.5 0 0 1 17 -3 a8.5 8.5 0 0 1 17 3 c0 6 -4 10 -9 15 c-3 3 -4.5 4.5 -4.5 7 a4.5 4.5 0 0 0 9 0" stroke-width="4.5"/></symbol>';

let sprite;
if (process.env.LUCIDE_DIR) {
  const missing = [];
  const symbols = ICONS.map((name) => {
    const file = path.join(process.env.LUCIDE_DIR, `${name}.svg`);
    if (!fs.existsSync(file)) { missing.push(name); return ''; }
    const inner = fs.readFileSync(file, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '');
    return `<symbol id="i-${name}" viewBox="0 0 24 24">${inner}</symbol>`;
  }).filter(Boolean);
  if (missing.length) { console.error('Missing Lucide icons:', missing.join(', ')); process.exit(1); }
  sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${symbols.join('')}${LOGO}</svg>`;
  fs.writeFileSync(spritePath, sprite + '\n');
} else {
  sprite = fs.readFileSync(spritePath, 'utf8').trim();
}

const html = fs.readFileSync(htmlPath, 'utf8');
const re = /<!-- sprite:start -->[\s\S]*?<!-- sprite:end -->/;
if (!re.test(html)) { console.error('sprite markers missing in index.html'); process.exit(1); }
fs.writeFileSync(htmlPath, html.replace(re, `<!-- sprite:start -->${sprite}<!-- sprite:end -->`));
console.log('sprite inlined:', (sprite.match(/<symbol/g) || []).length, 'symbols,', sprite.length, 'bytes');
