const fs = require('fs');
const s = fs.readFileSync('script.js', 'utf8');
const idx = s.indexOf('const PROFILES_DATA = [');
const end = s.indexOf('];\n', idx);
const dataStr = s.substring(idx + 'const PROFILES_DATA = '.length, end + 1);
const profiles = eval(dataStr);
console.log('Total profiles:', profiles.length);
profiles.forEach(p => {
  console.log(`${p.name}: photos=${Array.isArray(p.photos) ? p.photos.length : 'none'}, image=${Boolean(p.image)}`);
});
