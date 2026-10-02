const fs = require('fs');

const script = fs.readFileSync('script.js', 'utf8');

// Look for where messages are stored
const varMatches = [...script.matchAll(/(?:let|var|const)\s+([A-Za-z0-9_]*(?:chat|message|convo)[A-Za-z0-9_]*)\s*=[^;\n]+/gi)].map(m => m[0]);
console.log('Variables:', varMatches);

// Look for loadFromStorage and saveToStorage
function printFunc(name) {
  const idx = script.indexOf(`function ${name}`);
  if (idx !== -1) {
    console.log(`\n--- function ${name} ---`);
    console.log(script.substring(idx, idx + 1200));
  } else {
    console.log(`function ${name} not found`);
  }
}

printFunc('loadFromStorage');
printFunc('saveToStorage');
printFunc('openChat');
printFunc('renderChatThread');
printFunc('renderChatsInbox');
