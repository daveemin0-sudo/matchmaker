const fs = require('fs');

console.log('--- Applying Report Modal & Discovery Photos Fixes ---');

// 1. UPDATE PROFILES_DATA with multiple high-quality photos for each profile
let script = fs.readFileSync('script.js', 'utf8');

const oldProfilesDataTarget = `const PROFILES_DATA = [
  {
    id: 'p1', name: 'Zainab', age: 22,
    tags: ['Amapiano 🎵', 'Travel ✈️', 'Coffee ☕'],
    bio: 'Tech lover, massive music head. Let\\'s exchange playlists and chill at Lekki beach. Swipe right for positive vibes!',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
    distance: '3 km', mutualChance: true,
    autoReply: 'Hey! Thanks for matching with me 😊 I was just listening to some new Amapiano tracks. Are you into music?',
    aiPrompt: 'Beautiful professional portrait of a 22 year old African woman smiling, Amapiano aesthetic, vibrant lighting, highly detailed studio photo'
  },
  {
    id: 'p2', name: 'Tunde', age: 25,
    tags: ['Gamer 🎮', 'Ibadan 🏞️', 'Foodie 🍕'],
    bio: 'Software developer by day, PS5 legend by night. Looking for someone to check out cool lounges in Ibadan.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
    distance: '12 km', mutualChance: false,
    autoReply: '',
    aiPrompt: 'Close portrait of a young African man, 25 years old software engineer, tech setup in background, soft twilight lighting, cinematic'
  },
  {
    id: 'p3', name: 'Amara', age: 24,
    tags: ['Fashion 👗', 'Aesthetics 📸', 'Brunch 🥂'],
    bio: 'Fashion label designer. Let\\'s take aesthetic polaroid pictures together and find the best pancake spot in Lagos.',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80',
    distance: '7 km', mutualChance: true,
    autoReply: 'Hi! I saw your profile and loved your bio. Are you ready for a photo session? 📸',
    aiPrompt: 'Gorgeous artistic portrait of a creative 24 year old Nigerian fashion designer, studio backdrop with textiles, modern Lagos fashion, high detail'
  },
  {
    id: 'p4', name: 'Chidi', age: 27,
    tags: ['Fitness 💪', 'Art 🎨', 'Business 📈'],
    bio: 'Art gallery host. If you love fitness and museum date nights, let\\'s connect.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
    distance: '5 km', mutualChance: true,
    autoReply: 'Hey! Glad we matched. What\\'s your idea of a perfect weekend getaway? 🌊',
    aiPrompt: 'Close headshot of a handsome smiling 27 year old African man, gallery director, blurred artistic oil paintings background, clean lighting'
  },
  {
    id: 'p5', name: 'Sade', age: 23,
    tags: ['Books 📚', 'Nature 🌿', 'Yoruba Dem 💫'],
    bio: 'Bookworm and part-time content designer. Looking for honest connections only. Tell me your favorite book!',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80',
    distance: '18 km', mutualChance: false,
    autoReply: '',
    aiPrompt: 'Thoughtful close portrait of a 23 year old African girl in a beautiful botanical garden holding a vintage book, natural ambient sunshine'
  }
];`;

const newProfilesData = `const PROFILES_DATA = [
  {
    id: 'p1', name: 'Zainab', age: 22,
    tags: ['Amapiano 🎵', 'Travel ✈️', 'Coffee ☕'],
    bio: 'Tech lover, massive music head. Let\\'s exchange playlists and chill at Lekki beach. Swipe right for positive vibes!',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=700&q=80'
    ],
    distance: '3 km', mutualChance: true,
    autoReply: 'Hey! Thanks for matching with me 😊 I was just listening to some new Amapiano tracks. Are you into music?',
    aiPrompt: 'Beautiful professional portrait of a 22 year old African woman smiling, Amapiano aesthetic, vibrant lighting, highly detailed studio photo'
  },
  {
    id: 'p2', name: 'Tunde', age: 25,
    tags: ['Gamer 🎮', 'Ibadan 🏞️', 'Foodie 🍕'],
    bio: 'Software developer by day, PS5 legend by night. Looking for someone to check out cool lounges in Ibadan.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=700&q=80'
    ],
    distance: '12 km', mutualChance: false,
    autoReply: '',
    aiPrompt: 'Close portrait of a young African man, 25 years old software engineer, tech setup in background, soft twilight lighting, cinematic'
  },
  {
    id: 'p3', name: 'Amara', age: 24,
    tags: ['Fashion 👗', 'Aesthetics 📸', 'Brunch 🥂'],
    bio: 'Fashion label designer. Let\\'s take aesthetic polaroid pictures together and find the best pancake spot in Lagos.',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80',
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=80'
    ],
    distance: '7 km', mutualChance: true,
    autoReply: 'Hi! I saw your profile and loved your bio. Are you ready for a photo session? 📸',
    aiPrompt: 'Gorgeous artistic portrait of a creative 24 year old Nigerian fashion designer, studio backdrop with textiles, modern Lagos fashion, high detail'
  },
  {
    id: 'p4', name: 'Chidi', age: 27,
    tags: ['Fitness 💪', 'Art 🎨', 'Business 📈'],
    bio: 'Art gallery host. If you love fitness and museum date nights, let\\'s connect.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1480429370139-e0132c086e2a?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1492447273231-0f8fecec1e3a?auto=format&fit=crop&w=700&q=80'
    ],
    distance: '5 km', mutualChance: true,
    autoReply: 'Hey! Glad we matched. What\\'s your idea of a perfect weekend getaway? 🌊',
    aiPrompt: 'Close headshot of a handsome smiling 27 year old African man, gallery director, blurred artistic oil paintings background, clean lighting'
  },
  {
    id: 'p5', name: 'Sade', age: 23,
    tags: ['Books 📚', 'Nature 🌿', 'Yoruba Dem 💫'],
    bio: 'Bookworm and part-time content designer. Looking for honest connections only. Tell me your favorite book!',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=80',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80'
    ],
    distance: '18 km', mutualChance: false,
    autoReply: '',
    aiPrompt: 'Thoughtful close portrait of a 23 year old African girl in a beautiful botanical garden holding a vintage book, natural ambient sunshine'
  }
];`;

const norm = s => s.replace(/\r\n/g, '\n');

if (norm(script).includes(norm(oldProfilesDataTarget))) {
  script = norm(script).replace(norm(oldProfilesDataTarget), norm(newProfilesData));
  console.log('✓ Updated PROFILES_DATA with 4 photos per profile');
} else {
  console.error('Could not find oldProfilesDataTarget');
}

// 2. UPDATE buildProfileCard in script.js to support robust tap zones & click navigation
const oldBuildCardTarget = `  if (photos.length > 1) {
    const prevZone = card.querySelector('.card-photo-tap-prev');
    const nextZone = card.querySelector('.card-photo-tap-next');
    const setCardPhoto = (newIdx) => {
      const i = (newIdx + photos.length) % photos.length;
      card._photoIndex = i;
      if (photoArea) photoArea.style.backgroundImage = \`url("\${safeCssUrl(photos[i])}")\`;
      card.querySelectorAll('.photo-dot').forEach((dot, di) => dot.classList.toggle('active', di === i));
    };
    if (prevZone) prevZone.addEventListener('click', (e) => {
      if (Math.abs(appState.currentX - appState.startX) > 8) return;
      e.stopPropagation(); setCardPhoto(card._photoIndex - 1);
    });
    if (nextZone) nextZone.addEventListener('click', (e) => {
      if (Math.abs(appState.currentX - appState.startX) > 8) return;
      e.stopPropagation(); setCardPhoto(card._photoIndex + 1);
    });
  }`;

const newBuildCardCode = `  if (photos.length > 1) {
    const prevZone = card.querySelector('.card-photo-tap-prev');
    const nextZone = card.querySelector('.card-photo-tap-next');
    const setCardPhoto = (newIdx) => {
      const i = (newIdx + photos.length) % photos.length;
      card._photoIndex = i;
      if (photoArea) photoArea.style.backgroundImage = \`url("\${safeCssUrl(photos[i])}")\`;
      card.querySelectorAll('.photo-dot').forEach((dot, di) => dot.classList.toggle('active', di === i));
      if (typeof haptic === 'function') haptic('light');
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTap = (zone, dir, e) => {
      if (e) e.stopPropagation();
      setCardPhoto(card._photoIndex + dir);
    };

    if (prevZone) {
      prevZone.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartTime = Date.now();
      }, { passive: true });

      prevZone.addEventListener('touchend', (e) => {
        const dt = Date.now() - touchStartTime;
        const t = e.changedTouches ? e.changedTouches[0] : null;
        if (t && dt < 450) {
          const dist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
          if (dist < 22) {
            handleTap(prevZone, -1, e);
          }
        }
      });

      prevZone.addEventListener('click', (e) => {
        if (Math.hypot(appState.currentX - appState.startX, appState.currentY - appState.startY) > 22) return;
        handleTap(prevZone, -1, e);
      });
    }

    if (nextZone) {
      nextZone.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartTime = Date.now();
      }, { passive: true });

      nextZone.addEventListener('touchend', (e) => {
        const dt = Date.now() - touchStartTime;
        const t = e.changedTouches ? e.changedTouches[0] : null;
        if (t && dt < 450) {
          const dist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
          if (dist < 22) {
            handleTap(nextZone, 1, e);
          }
        }
      });

      nextZone.addEventListener('click', (e) => {
        if (Math.hypot(appState.currentX - appState.startX, appState.currentY - appState.startY) > 22) return;
        handleTap(nextZone, 1, e);
      });
    }
  }`;

if (norm(script).includes(norm(oldBuildCardTarget))) {
  script = norm(script).replace(norm(oldBuildCardTarget), norm(newBuildCardCode));
  console.log('✓ Updated buildProfileCard with responsive left/right photo tap detection');
} else {
  console.error('Could not find oldBuildCardTarget');
}

// 3. UPDATE openReportModal in script.js to add close X button, compact layout, and visible Cancel button
const oldReportModalInner = `  overlay.innerHTML = \`
    <div class="whatsapp-dialog-card">
      <div class="wa-dialog-badge">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF2E70" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h3 class="wa-dialog-title">Report or Block \${name}?</h3>
      <p class="wa-dialog-desc">Blocked contacts will no longer be able to message or call you on hookmebysam. Please select a reason:</p>

      <div class="wa-report-reasons" id="waReportReasons">
        <label class="wa-reason-option active" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="inappropriate" checked>
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">🔞 Inappropriate messages or media</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="spam">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">🚫 Spam, commercial ads, or scam</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="fake">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">🎭 Fake profile or impersonation</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="harassment">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">⚠️ Harassment, hate speech, or abuse</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="other">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">⚡ I'm just not interested / Other</span>
        </label>
      </div>

      <div class="wa-dialog-actions">
        <button class="wa-dialog-btn wa-dialog-btn-danger" onclick="executeReportAndBlock('\${userId}', '\${name}')">
          <span>Report & Block</span>
        </button>
        <button class="wa-dialog-btn wa-dialog-btn-secondary" onclick="blockUser('\${userId}', '\${name}')">
          <span>Block Only</span>
        </button>
        <button class="wa-dialog-btn wa-dialog-btn-cancel" onclick="closeReportModal()">
          <span>Cancel</span>
        </button>
      </div>
    </div>
  \`;`;

const newReportModalInner = `  overlay.innerHTML = \`
    <div class="whatsapp-dialog-card">
      <button class="wa-dialog-close-btn" onclick="closeReportModal()" aria-label="Close" title="Close">✕</button>
      <div class="wa-dialog-badge">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF2E70" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h3 class="wa-dialog-title">Report or Block \${name}?</h3>
      <p class="wa-dialog-desc">Blocked contacts will no longer be able to message or call you on hookmebysam. Select a reason:</p>

      <div class="wa-report-reasons" id="waReportReasons">
        <label class="wa-reason-option active" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="inappropriate" checked>
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">🔞 Inappropriate messages or media</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="spam">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">🚫 Spam, commercial ads, or scam</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="fake">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">🎭 Fake profile or impersonation</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="harassment">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">⚠️ Harassment, hate speech, or abuse</span>
        </label>
        <label class="wa-reason-option" onclick="selectReportReason(this)">
          <input type="radio" name="reportReason" value="other">
          <span class="wa-reason-radio"></span>
          <span class="wa-reason-text">⚡ I'm just not interested / Other</span>
        </label>
      </div>

      <div class="wa-dialog-actions">
        <button class="wa-dialog-btn wa-dialog-btn-danger" onclick="executeReportAndBlock('\${userId}', '\${name}')">
          <span>Report &amp; Block</span>
        </button>
        <div class="wa-dialog-btn-row" style="display:flex;gap:8px;width:100%;">
          <button class="wa-dialog-btn wa-dialog-btn-secondary" style="flex:1;" onclick="blockUser('\${userId}', '\${name}')">
            <span>Block Only</span>
          </button>
          <button class="wa-dialog-btn wa-dialog-btn-cancel" style="flex:1;" onclick="closeReportModal()">
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  \`;`;

if (norm(script).includes(norm(oldReportModalInner))) {
  script = norm(script).replace(norm(oldReportModalInner), norm(newReportModalInner));
  console.log('✓ Updated openReportModal with close X button and side-by-side Block/Cancel buttons');
} else {
  console.error('Could not find oldReportModalInner');
}

fs.writeFileSync('script.js', script, 'utf8');

// 4. UPDATE style.css for Report Modal and Card Photo Tap Zones
let styleCss = fs.readFileSync('style.css', 'utf8');

// Tap zones update in style.css
styleCss = styleCss.replace(
  /\/\* ── Card Photo Tap Zones \(prev \/ next photo navigation\) ── \*\/[\s\S]*?\.card-photo-tap-next\s*\{\s*right:\s*0;\s*\}/,
  `/* ── Card Photo Tap Zones (prev / next photo navigation) ── */
.card-photo-tap-prev,
.card-photo-tap-next {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50% !important;
  z-index: 15 !important;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.card-photo-tap-prev { left: 0 !important; }
.card-photo-tap-next { right: 0 !important; }`
);

// Report modal update in style.css
styleCss = styleCss.replace(
  /\.whatsapp-dialog-overlay\s*\{[\s\S]*?animation:\s*fadeIn\s*0\.18s\s*ease;\s*\}/,
  `.whatsapp-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  animation: fadeIn 0.18s ease;
}`
);

styleCss = styleCss.replace(
  /\.whatsapp-dialog-card\s*\{[\s\S]*?animation:\s*popIn\s*0\.24s\s*cubic-bezier\(0\.175,\s*0\.885,\s*0\.32,\s*1\.2\)\s*both;\s*\}/,
  `.whatsapp-dialog-card {
  width: 100%;
  max-width: 400px;
  max-height: calc(100dvh - 32px);
  max-height: calc(100vh - 32px);
  background: #140C1D;
  background: radial-gradient(circle at 50% 0%, #2A1226 0%, #0E0716 100%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 22px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85);
  padding: 20px 18px 18px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  animation: popIn 0.24s cubic-bezier(0.175, 0.885, 0.32, 1.2) both;
}

.wa-dialog-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 5;
}
.wa-dialog-close-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}`
);

styleCss = styleCss.replace(
  /\.wa-dialog-badge\s*\{[\s\S]*?box-shadow:[^;]+;\s*\}/,
  `.wa-dialog-badge {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 51, 102, 0.14);
  border: 1px solid rgba(255, 51, 102, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  margin-bottom: 10px;
  box-shadow: 0 0 20px rgba(255, 51, 102, 0.25);
}`
);

styleCss = styleCss.replace(
  /\.wa-dialog-title\s*\{[\s\S]*?letter-spacing:\s*-0\.2px;\s*\}/,
  `.wa-dialog-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 800;
  color: #FFFFFF;
  text-align: center;
  margin: 0 0 6px 0;
  letter-spacing: -0.2px;
}`
);

styleCss = styleCss.replace(
  /\.wa-dialog-desc\s*\{[\s\S]*?margin:\s*0\s*0\s*18px\s*0;\s*\}/,
  `.wa-dialog-desc {
  font-size: 0.8rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.65);
  text-align: center;
  margin: 0 0 12px 0;
}`
);

styleCss = styleCss.replace(
  /\.wa-report-reasons\s*\{[\s\S]*?margin-bottom:\s*22px;\s*\}/,
  `.wa-report-reasons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}`
);

styleCss = styleCss.replace(
  /\.wa-reason-option\s*\{[\s\S]*?transition:\s*all\s*0\.15s\s*ease;\s*\}/,
  `.wa-reason-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.15s ease;
}`
);

styleCss = styleCss.replace(
  /\.wa-reason-text\s*\{[\s\S]*?color:\s*#FFFFFF;\s*\}/,
  `.wa-reason-text {
  font-size: 0.82rem;
  font-weight: 600;
  color: #FFFFFF;
}`
);

styleCss = styleCss.replace(
  /\.wa-dialog-btn\s*\{[\s\S]*?transition:\s*all\s*0\.18s\s*ease;\s*\}/,
  `.wa-dialog-btn {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}`
);

fs.writeFileSync('style.css', styleCss, 'utf8');
console.log('✓ Updated style.css for responsive report modal and 50% width tap zones');

// 5. UPDATE webhook-server/index.js to include photos array in discovery feed
let webhookIndex = fs.readFileSync('webhook-server/index.js', 'utf8');
const oldWebhookMap = `users.push({id:doc.id,name:d.displayName||'User',age:Math.floor(age),bio:d.bio||'',gender:d.gender||'',image:d.image,tags:Array.isArray(d.interests)?d.interests:[],city:d.city||'',isRealUser:true});`;
const newWebhookMap = `const userPhotos = Array.isArray(d.photos) && d.photos.length > 0 ? d.photos : (d.image ? [d.image] : []);
      users.push({id:doc.id,name:d.displayName||'User',age:Math.floor(age),bio:d.bio||'',gender:d.gender||'',image:d.image,photos:userPhotos,tags:Array.isArray(d.interests)?d.interests:[],city:d.city||'',isRealUser:true});`;

if (webhookIndex.includes(oldWebhookMap)) {
  webhookIndex = webhookIndex.replace(oldWebhookMap, newWebhookMap);
  fs.writeFileSync('webhook-server/index.js', webhookIndex, 'utf8');
  console.log('✓ Updated webhook-server/index.js to include photos array in discovery feed');
} else {
  console.log('webhook-server/index.js discovery mapping already contains photos or modified');
}

// 6. UPDATE firebase-config.js to ensure fetchRealUsersFromFirestore preserves photos array
let fbConfig = fs.readFileSync('firebase-config.js', 'utf8');
if (fbConfig.includes('return Array.isArray(data.users) ? data.users : [];')) {
  fbConfig = fbConfig.replace(
    'return Array.isArray(data.users) ? data.users : [];',
    `return Array.isArray(data.users) ? data.users.map(u => ({
      ...u,
      photos: Array.isArray(u.photos) && u.photos.length > 0 ? u.photos : (u.image ? [u.image] : [])
    })) : [];`
  );
  fs.writeFileSync('firebase-config.js', fbConfig, 'utf8');
  console.log('✓ Updated firebase-config.js to preserve photos array in discovery');
}

// 7. BUMP cache version to v51 in sw.js and index.html
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/hmbs-cache-v\d+/g, 'hmbs-cache-v51');
fs.writeFileSync('sw.js', sw, 'utf8');

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/\?v=\d+/g, '?v=51');
fs.writeFileSync('index.html', html, 'utf8');
console.log('✓ Bumped cache version to v51');
