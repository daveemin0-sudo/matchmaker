const fs = require('fs');

console.log('--- Applying Photo Verification & Profile Strength Enhancements ---');

// 1. Update script.js
let script = fs.readFileSync('script.js', 'utf8');

// A. Enhance profile strength calculation in renderProfileScreen to include verification
const oldStrengthCalc = `  // Dynamic Profile Strength Calculation
  let strength = 20; // baseline
  if (photos.length >= 1) strength += 25;
  if (photos.length >= 3) strength += 15;
  if (photos.length >= 4) strength += 10;
  if (displayBio && displayBio.length > 15) strength += 15;
  if (displayInterests.length >= 2) strength += 15;
  strength = Math.min(100, Math.max(25, strength));

  const strengthVal = document.getElementById('hkStrengthPercent');
  const strengthBar = document.getElementById('hkStrengthBar');
  const strengthHint = document.getElementById('hkStrengthHint');

  if (strengthVal) strengthVal.textContent = strength + '%';
  if (strengthBar) strengthBar.style.width = strength + '%';
  if (strengthHint) {
    if (photos.length <= 1) {
      strengthHint.textContent = '📸 Add remaining photos to boost discovery visibility by 3.5×';
    } else if (strength < 90) {
      strengthHint.textContent = '✨ Add your passions and personal bio to reach 100% Superstar status!';
    } else {
      strengthHint.textContent = '🌟 Superstar Profile Active! Your profile gets maximum priority matching.';
    }
  }`;

const newStrengthCalc = `  // Dynamic Profile Strength Calculation
  // Baseline (Name, Age, Location): 15%
  let strength = 15;
  if (photos.length >= 1) strength += 20; // Main photo
  if (photos.length >= 2) strength += 15; // Additional photos
  if (photos.length >= 3) strength += 10; // 3+ photos gallery
  if (displayBio && displayBio.length > 15) strength += 15; // Engaging bio
  if (displayInterests && displayInterests.length >= 2) strength += 10; // Passions
  if (isVerified) strength += 15; // Photo verification blue badge bonus!
  strength = Math.min(100, Math.max(15, strength));

  const strengthVal = document.getElementById('hkStrengthPercent');
  const strengthBar = document.getElementById('hkStrengthBar');
  const strengthHint = document.getElementById('hkStrengthHint');
  const strengthLink = document.querySelector('.hk-strength-link');

  if (strengthVal) strengthVal.textContent = strength + '%';
  if (strengthBar) strengthBar.style.width = strength + '%';
  if (strengthLink) {
    if (strength === 100) {
      strengthLink.innerHTML = 'Superstar ⭐';
      strengthLink.style.color = '#F4C550';
    } else {
      strengthLink.innerHTML = 'Complete Profile &rarr;';
      strengthLink.style.color = '';
    }
  }

  if (strengthHint) {
    if (photos.length === 0) {
      strengthHint.textContent = '📸 Add your first profile photo to start getting matches!';
    } else if (photos.length < 2) {
      strengthHint.textContent = '📸 Add at least 1 more photo to boost discovery visibility by 3.5×';
    } else if (!isVerified) {
      strengthHint.textContent = '🛡️ Complete selfie photo verification below to earn the Blue Badge & +15% boost!';
    } else if (!displayBio || displayBio.length < 15) {
      strengthHint.textContent = '✍️ Add an engaging personal bio to reach 100% Superstar status!';
    } else if (displayInterests.length < 2) {
      strengthHint.textContent = '🎵 Add passions and interests to get matched with like-minded people!';
    } else {
      strengthHint.textContent = '🌟 100% Superstar Profile Active! Your profile gets maximum priority matching.';
    }
  }`;

if (script.includes(oldStrengthCalc)) {
  script = script.replace(oldStrengthCalc, newStrengthCalc);
  console.log('Updated Profile Strength calculation with verification bonus');
} else {
  console.log('WARNING: oldStrengthCalc not matched');
}

// B. Sync isVerified in completeSelfieVerification to Cloud Firestore
const oldCompleteSelfie = `function completeSelfieVerification() {
  currentUser.isVerified = true;
  try {
    localStorage.setItem('hmbs_verified', 'true');
    const savedUserStr = localStorage.getItem('hmbs_user');
    if (savedUserStr) {
      const u = JSON.parse(savedUserStr);
      u.isVerified = true;
      localStorage.setItem('hmbs_user', JSON.stringify(u));
    }
  } catch (_) {}

  haptic('success');
  if (typeof launchMatchConfetti === 'function') {
    launchMatchConfetti();
  }
  showToast('🛡️ Verified! You earned the official Blue Badge!', 'gold');

  setTimeout(() => {
    closeSelfieVerifyModal();
    renderProfileScreen();
  }, 1400);
}`;

const newCompleteSelfie = `function completeSelfieVerification() {
  currentUser.isVerified = true;
  try {
    localStorage.setItem('hmbs_verified', 'true');
    const savedUserStr = localStorage.getItem('hmbs_user');
    if (savedUserStr) {
      const u = JSON.parse(savedUserStr);
      u.isVerified = true;
      localStorage.setItem('hmbs_user', JSON.stringify(u));
    }
  } catch (_) {}

  // Sync verified state to Cloud Firestore (both user doc and public profile for matches to see)
  if (typeof fbDb !== 'undefined' && fbDb && typeof fbAuth !== 'undefined' && fbAuth?.currentUser) {
    try {
      const uid = fbAuth.currentUser.uid;
      fbDb.collection('users').doc(uid).set({
        isVerified: true,
        verifiedAt: Date.now()
      }, { merge: true }).catch(() => {});

      fbDb.collection('public_profiles').doc(uid).set({
        isVerified: true
      }, { merge: true }).catch(() => {});
    } catch (e) {
      console.warn('Firestore verification sync notice:', e);
    }
  }

  saveToStorage();
  haptic('success');
  if (typeof launchMatchConfetti === 'function') {
    launchMatchConfetti();
  }
  showToast('🛡️ Verified! You earned the official Blue Badge!', 'gold');

  setTimeout(() => {
    closeSelfieVerifyModal();
    renderProfileScreen();
  }, 1400);
}`;

if (script.includes(oldCompleteSelfie)) {
  script = script.replace(oldCompleteSelfie, newCompleteSelfie);
  console.log('Updated completeSelfieVerification with Firestore sync');
} else {
  console.log('WARNING: oldCompleteSelfie not matched');
}

// C. In openSelfieVerifyModal: reset statusPill color
const oldStatusReset = `if (statusPill) statusPill.textContent = 'Align your face inside the oval';`;
const newStatusReset = `if (statusPill) {
    statusPill.textContent = 'Align your face inside the oval';
    statusPill.style.color = '#3897F0';
  }`;

if (script.includes(oldStatusReset)) {
  script = script.replace(oldStatusReset, newStatusReset);
  console.log('Updated openSelfieVerifyModal status pill color reset');
}

// D. In openProfileCardPreview: render verified badge if verified
const oldPreviewCard = `  if (tagsEl) {
    tagsEl.innerHTML = displayInterests.map(t => \`<span class="hk-preview-tag">\${escHtml(t)}</span>\`).join('');
  }

  _renderPreviewCardPhoto();
  modal.style.display = 'flex';`;

const newPreviewCard = `  if (tagsEl) {
    tagsEl.innerHTML = displayInterests.map(t => \`<span class="hk-preview-tag">\${escHtml(t)}</span>\`).join('');
  }

  const previewBadge = document.getElementById('hkPreviewVerifiedBadge');
  const isVerifiedUser = currentUser.isVerified === true || localStorage.getItem('hmbs_verified') === 'true';
  if (previewBadge) {
    previewBadge.style.display = isVerifiedUser ? 'inline-flex' : 'none';
  }

  _renderPreviewCardPhoto();
  modal.style.display = 'flex';`;

if (script.includes(oldPreviewCard)) {
  script = script.replace(oldPreviewCard, newPreviewCard);
  console.log('Updated openProfileCardPreview to display verified badge');
} else {
  console.log('WARNING: oldPreviewCard not matched');
}

// E. In login hydration: restore isVerified from Firestore user doc
const oldLoginHydrate = `const vipExpiryMs = uData.vipExpiry?.toMillis ? uData.vipExpiry.toMillis() : 0;\n            appState.isVip = Boolean(uData.isVip && (!vipExpiryMs || vipExpiryMs > Date.now()));`;
const newLoginHydrate = `const vipExpiryMs = uData.vipExpiry?.toMillis ? uData.vipExpiry.toMillis() : 0;
            appState.isVip = Boolean(uData.isVip && (!vipExpiryMs || vipExpiryMs > Date.now()));
            if (uData.isVerified !== undefined) {
              currentUser.isVerified = Boolean(uData.isVerified);
              if (currentUser.isVerified) localStorage.setItem('hmbs_verified', 'true');
            }`;

if (script.includes(oldLoginHydrate)) {
  script = script.replace(oldLoginHydrate, newLoginHydrate);
  console.log('Updated login hydration with isVerified');
}

fs.writeFileSync('script.js', script, 'utf8');
console.log('script.js written successfully.');

// 2. Update index.html to add verified badge to profile preview modal
let html = fs.readFileSync('index.html', 'utf8');

const oldPreviewNameRow = `<div class="hk-preview-name-row">
              <span class="hk-preview-name" id="hkPreviewName">Dave, 24</span>
            </div>`;

const newPreviewNameRow = `<div class="hk-preview-name-row" style="display:flex;align-items:center;gap:6px">
              <span class="hk-preview-name" id="hkPreviewName">Dave, 24</span>
              <span class="hk-verified-badge" id="hkPreviewVerifiedBadge" title="Verified Profile" style="display:none">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#3897F0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </span>
            </div>`;

if (html.includes(oldPreviewNameRow)) {
  html = html.replace(oldPreviewNameRow, newPreviewNameRow);
  console.log('Added hkPreviewVerifiedBadge to index.html');
} else {
  console.log('Notice: oldPreviewNameRow not matched, checking alternate formatting');
  html = html.replace(
    /<span class="hk-preview-name" id="hkPreviewName">Dave, 24<\/span>/,
    `<span class="hk-preview-name" id="hkPreviewName">Dave, 24</span>
              <span class="hk-verified-badge" id="hkPreviewVerifiedBadge" title="Verified Profile" style="display:none">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#3897F0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </span>`
  );
}

// Version bump to v48
html = html.replace(/style\.css\?v=\d+/g, 'style.css?v=48');
html = html.replace(/premium\.css\?v=\d+/g, 'premium.css?v=48');
html = html.replace(/script\.js\?v=\d+/g, 'script.js?v=48');
html = html.replace(/firebase-config\.js\?v=[\d.]+/g, 'firebase-config.js?v=48.0');
fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html updated to v48');

let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const SW_VERSION = "v\d+";/, 'const SW_VERSION = "v48";');
sw = sw.replace(/\/\* hookmebysam Service Worker v\d+/, '/* hookmebysam Service Worker v48');
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('sw.js bumped to v48');
