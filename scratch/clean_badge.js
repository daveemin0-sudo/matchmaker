const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const regex = /<span class="hk-verified-badge" title="Verified Member">[\s\S]*?<\/span>\s*/;
if (regex.test(html)) {
  html = html.replace(regex, '');
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('Successfully removed duplicate static badge');
} else {
  console.log('Badge not found or already removed');
}
