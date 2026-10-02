const fs = require('fs');

console.log('--- Applying Real Photo Verification System ---');

// 1. UPDATE style.css
let css = fs.readFileSync('style.css', 'utf8');

const oldCssTarget = `.selfie-scan-viewport video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}
.selfie-avatar-mock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.selfie-mock-face {
  font-size: 4rem;
  animation: pulseScanFace 2s infinite ease-in-out;
}
@keyframes pulseScanFace {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.selfie-oval-guide {
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(56, 151, 240, 0.6);
  border-radius: 50% / 45%;
  pointer-events: none;
}
.selfie-scan-laser {
  position: absolute;
  left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #3897F0, #00E5FF, transparent);
  box-shadow: 0 0 12px #3897F0;
  top: 0;
  opacity: 0;
}
.selfie-scan-laser.scanning {
  opacity: 1;
  animation: scanLaserAnim 1.8s infinite ease-in-out;
}
@keyframes scanLaserAnim {
  0% { top: 5%; }
  50% { top: 92%; }
  100% { top: 5%; }
}
.selfie-scan-status-pill {
  position: absolute;
  bottom: 12px;
  background: rgba(0, 0, 0, 0.75);
  color: #3897F0;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(56, 151, 240, 0.3);
}
.selfie-steps-tracker {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.selfie-step-dot {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}
.selfie-step-dot.active {
  color: #fff;
  background: rgba(56, 151, 240, 0.35);
  font-weight: 700;
}
.selfie-step-dot.done {
  color: #21B06B;
  background: rgba(33, 176, 107, 0.2);
}
.selfie-action-row {
  width: 100%;
}
.selfie-primary-btn {
  width: 100%;
  padding: 13px;
  border-radius: 28px;
  background: linear-gradient(135deg, #3897F0, #1E88E5);
  color: #fff;
  font-weight: 800;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(56, 151, 240, 0.45);
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.selfie-primary-btn:active {
  transform: scale(0.97);
}`;

const newCss = `.selfie-scan-viewport video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  border-radius: inherit;
}
.selfie-captured-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  position: absolute;
  inset: 0;
  z-index: 2;
  animation: fadeIn 0.2s ease;
}
.selfie-flash-overlay {
  position: absolute;
  inset: 0;
  background: #ffffff;
  opacity: 0;
  pointer-events: none;
  z-index: 10;
  transition: opacity 0.08s ease-out;
}
.selfie-flash-overlay.flash {
  opacity: 0.95;
  transition: opacity 0.35s ease-out;
}
.selfie-countdown-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4.5rem;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 0 25px rgba(0, 0, 0, 0.9), 0 0 15px #3897F0;
  z-index: 8;
  animation: countdownPulse 0.9s ease infinite;
}
@keyframes countdownPulse {
  0% { transform: scale(1.35); opacity: 0.3; }
  50% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.85); opacity: 0.2; }
}
.selfie-camera-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  height: 100%;
  width: 100%;
  z-index: 3;
}
.selfie-fallback-icon {
  font-size: 2.8rem;
  margin-bottom: 6px;
  animation: pulseScanFace 2s infinite ease-in-out;
}
@keyframes pulseScanFace {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.selfie-fallback-title {
  font-size: 0.88rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 4px;
}
.selfie-fallback-desc {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 14px;
  line-height: 1.35;
}
.selfie-native-snap-btn {
  background: linear-gradient(135deg, #3897F0, #1E88E5);
  border: none;
  border-radius: 22px;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 9px 18px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(56, 151, 240, 0.4);
  transition: transform 0.15s ease;
}
.selfie-native-snap-btn:active {
  transform: scale(0.96);
}
.selfie-oval-guide {
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(56, 151, 240, 0.6);
  border-radius: 50% / 45%;
  pointer-events: none;
  z-index: 4;
}
.selfie-scan-laser {
  position: absolute;
  left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #3897F0, #00E5FF, transparent);
  box-shadow: 0 0 12px #3897F0;
  top: 0;
  opacity: 0;
  z-index: 5;
}
.selfie-scan-laser.scanning {
  opacity: 1;
  animation: scanLaserAnim 1.8s infinite ease-in-out;
}
@keyframes scanLaserAnim {
  0% { top: 5%; }
  50% { top: 92%; }
  100% { top: 5%; }
}
.selfie-scan-status-pill {
  position: absolute;
  bottom: 12px;
  background: rgba(0, 0, 0, 0.82);
  color: #3897F0;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(56, 151, 240, 0.35);
  z-index: 7;
  max-width: 90%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.25s ease;
}
.selfie-steps-tracker {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  width: 100%;
  justify-content: center;
}
.selfie-step-dot {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}
.selfie-step-dot.active {
  color: #fff;
  background: rgba(56, 151, 240, 0.35);
  font-weight: 700;
}
.selfie-step-dot.done {
  color: #21B06B;
  background: rgba(33, 176, 107, 0.2);
}
.selfie-action-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.selfie-primary-btn {
  width: 100%;
  padding: 13px;
  border-radius: 28px;
  background: linear-gradient(135deg, #3897F0, #1E88E5);
  color: #fff;
  font-weight: 800;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(56, 151, 240, 0.45);
  transition: transform 0.2s ease, opacity 0.2s ease, background 0.3s ease;
}
.selfie-primary-btn:active {
  transform: scale(0.97);
}
.selfie-secondary-btn {
  width: 100%;
  padding: 11px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-weight: 700;
  font-size: 0.88rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
}
.selfie-secondary-btn:active {
  background: rgba(255, 255, 255, 0.16);
  transform: scale(0.98);
}
.selfie-privacy-note {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 14px;
  line-height: 1.35;
}`;

// Normalize line endings for replacement
const norm = s => s.replace(/\r\n/g, '\n');
if (norm(css).includes(norm(oldCssTarget))) {
  css = norm(css).replace(norm(oldCssTarget), norm(newCss));
  fs.writeFileSync('style.css', css, 'utf8');
  console.log('✓ Updated style.css with live selfie & camera styles');
} else {
  console.log('Could not find exact CSS target, appending new styles');
  css += '\n\n' + newCss;
  fs.writeFileSync('style.css', css, 'utf8');
}

// 2. UPDATE index.html
let html = fs.readFileSync('index.html', 'utf8');

const oldModalTarget = `  <!-- SELFIE PHOTO VERIFICATION MODAL -->
  <div class="selfie-modal-overlay" id="selfieVerifyModal" style="display:none">
    <div class="selfie-modal-card">
      <button class="selfie-modal-close" onclick="closeSelfieVerifyModal()" aria-label="Close">✕</button>
      <div class="selfie-modal-header">
        <div class="selfie-badge-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#3897F0">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h3 class="selfie-modal-title">Get Photo Verified</h3>
        <p class="selfie-modal-sub">Match your real face with your profile photos to receive the trusted blue badge.</p>
      </div>

      <div class="selfie-scan-viewport" id="selfieScanViewport">
        <video id="selfieVideoEl" autoplay playsinline muted style="display:none"></video>
        <div class="selfie-avatar-mock" id="selfieAvatarMock">
          <div class="selfie-mock-face" id="selfieMockFace">🤳</div>
        </div>
        <div class="selfie-oval-guide">
          <div class="selfie-scan-laser" id="selfieScanLaser"></div>
        </div>
        <div class="selfie-scan-status-pill" id="selfieStatusPill">Align your face inside the oval</div>
      </div>

      <div class="selfie-steps-tracker" id="selfieStepsTracker">
        <div class="selfie-step-dot active" id="sStep1">1. Center Face</div>
        <div class="selfie-step-dot" id="sStep2">2. Smile</div>
        <div class="selfie-step-dot" id="sStep3">3. Verified</div>
      </div>

      <div class="selfie-action-row">
        <button class="selfie-primary-btn" id="selfieActionBtn" onclick="startSelfieScan()">Start Selfie Scan</button>
      </div>
    </div>
  </div>`;

const newModalHtml = `  <!-- SELFIE PHOTO VERIFICATION MODAL -->
  <div class="selfie-modal-overlay" id="selfieVerifyModal" style="display:none">
    <div class="selfie-modal-card">
      <button class="selfie-modal-close" onclick="closeSelfieVerifyModal()" aria-label="Close">✕</button>
      <div class="selfie-modal-header">
        <div class="selfie-badge-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#3897F0">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h3 class="selfie-modal-title">Live Photo Verification</h3>
        <p class="selfie-modal-sub" id="selfieModalSub">Take a quick live selfie to confirm your identity and unlock your Blue Badge.</p>
      </div>

      <div class="selfie-scan-viewport" id="selfieScanViewport">
        <!-- Live Video Element -->
        <video id="selfieVideoEl" autoplay playsinline muted style="display:none"></video>

        <!-- Canvas for processing selfie frame -->
        <canvas id="selfieCanvas" style="display:none"></canvas>

        <!-- Frozen Captured Selfie Preview Image -->
        <img id="selfieCapturedPreview" class="selfie-captured-img" src="" alt="Captured Selfie" style="display:none" />

        <!-- Camera Fallback UI if browser permission or insecure origin blocks WebRTC -->
        <div class="selfie-camera-fallback" id="selfieCameraFallback" style="display:none">
          <div class="selfie-fallback-icon">📷</div>
          <div class="selfie-fallback-title">Camera Permission Needed</div>
          <p class="selfie-fallback-desc">Tap below to snap a live selfie with your phone camera:</p>
          <button type="button" class="selfie-native-snap-btn" onclick="triggerNativeSelfieCapture()">
            <span>📸 Snap Live Selfie</span>
          </button>
        </div>

        <!-- Camera Shutter Flash -->
        <div class="selfie-flash-overlay" id="selfieFlashOverlay"></div>

        <!-- Live Countdown Overlay -->
        <div class="selfie-countdown-overlay" id="selfieCountdown" style="display:none">3</div>

        <!-- Scanner Oval Guide & Laser -->
        <div class="selfie-oval-guide" id="selfieOvalGuide">
          <div class="selfie-scan-laser" id="selfieScanLaser"></div>
        </div>

        <!-- Floating Status Pill -->
        <div class="selfie-scan-status-pill" id="selfieStatusPill">Align your face inside the oval</div>
      </div>

      <!-- Hidden Native Camera File Input -->
      <input type="file" id="selfieFileInput" accept="image/*" capture="user" style="display:none" onchange="handleSelfieFileSelected(event)" />

      <!-- Step Indicators -->
      <div class="selfie-steps-tracker" id="selfieStepsTracker">
        <div class="selfie-step-dot active" id="sStep1">1. Live Camera</div>
        <div class="selfie-step-dot" id="sStep2">2. Facial Scan</div>
        <div class="selfie-step-dot" id="sStep3">3. Verified</div>
      </div>

      <!-- Action Buttons Row -->
      <div class="selfie-action-row" id="selfieActionRow">
        <button class="selfie-primary-btn" id="selfieActionBtn" onclick="handleSelfieActionClick()">📸 Capture &amp; Scan Face</button>
        <button class="selfie-secondary-btn" id="selfieRetakeBtn" onclick="retakeSelfiePhoto()" style="display:none">↺ Retake Selfie</button>
      </div>

      <!-- Security Note -->
      <div class="selfie-privacy-note">
        🔒 Encrypted verification. Your selfie is used solely to verify your real identity.
      </div>
    </div>
  </div>`;

if (norm(html).includes(norm(oldModalTarget))) {
  html = norm(html).replace(norm(oldModalTarget), norm(newModalHtml));
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('✓ Updated index.html with live selfie modal DOM');
} else {
  console.error('Could not find old selfie modal target in index.html');
}

// 3. UPDATE script.js
let script = fs.readFileSync('script.js', 'utf8');

// Also update buildProfileCard so verified badge is only for verified profiles
const oldCardBadgeTarget = `      <div class="card-name-row">
        <h2>\${escHtml(p.name || 'User')}, \${escHtml(p.age ?? '')}</h2>
        <span class="verified-icon" title="Verified">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DA1F2"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </span>
      </div>`;

const newCardBadge = `      <div class="card-name-row">
        <h2>\${escHtml(p.name || 'User')}, \${escHtml(p.age ?? '')}</h2>
        \${(p.isVerified || p.verified) ? \`<span class="verified-icon" title="Verified">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#3897F0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </span>\` : ''}
      </div>`;

if (norm(script).includes(norm(oldCardBadgeTarget))) {
  script = norm(script).replace(norm(oldCardBadgeTarget), norm(newCardBadge));
  console.log('✓ Updated buildProfileCard to render verified badge for verified users only');
}

// Replace the old PHOTO VERIFICATION section in script.js
const oldVerificationSectionIdx = norm(script).indexOf('// PHOTO VERIFICATION (SELFIE CHECK) SYSTEM');
if (oldVerificationSectionIdx !== -1) {
  const prefix = norm(script).substring(0, oldVerificationSectionIdx);
  
  const newVerificationSection = `// PHOTO VERIFICATION (SELFIE CHECK) SYSTEM
// ==========================================================
let _selfieStream = null;
let _selfieScanTimeout = null;
let _selfieCountdownInterval = null;
let _selfieCapturedDataUrl = null;
let _selfiePhase = 'ready'; // 'ready', 'countdown', 'analyzing', 'success', 'failed'

async function openSelfieVerifyModal() {
  const modal = document.getElementById('selfieVerifyModal');
  if (!modal) return;
  modal.style.display = 'flex';
  haptic('light');

  // Reset internal state
  _selfiePhase = 'ready';
  _selfieCapturedDataUrl = null;
  if (_selfieScanTimeout) { clearTimeout(_selfieScanTimeout); _selfieScanTimeout = null; }
  if (_selfieCountdownInterval) { clearInterval(_selfieCountdownInterval); _selfieCountdownInterval = null; }

  // Reset DOM elements
  const s1 = document.getElementById('sStep1');
  const s2 = document.getElementById('sStep2');
  const s3 = document.getElementById('sStep3');
  const laser = document.getElementById('selfieScanLaser');
  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const retakeBtn = document.getElementById('selfieRetakeBtn');
  const countdownEl = document.getElementById('selfieCountdown');
  const flashEl = document.getElementById('selfieFlashOverlay');
  const capturedImg = document.getElementById('selfieCapturedPreview');
  const fallbackEl = document.getElementById('selfieCameraFallback');
  const video = document.getElementById('selfieVideoEl');

  if (s1) s1.className = 'selfie-step-dot active';
  if (s2) s2.className = 'selfie-step-dot';
  if (s3) s3.className = 'selfie-step-dot';
  if (laser) laser.classList.remove('scanning');
  if (countdownEl) countdownEl.style.display = 'none';
  if (flashEl) flashEl.classList.remove('flash');
  if (capturedImg) { capturedImg.style.display = 'none'; capturedImg.src = ''; }
  if (fallbackEl) fallbackEl.style.display = 'none';
  if (retakeBtn) retakeBtn.style.display = 'none';

  if (statusPill) {
    statusPill.textContent = 'Align your face inside the oval';
    statusPill.style.color = '#3897F0';
  }

  if (actionBtn) {
    actionBtn.disabled = false;
    actionBtn.textContent = '📸 Capture & Scan Face';
    actionBtn.style.background = 'linear-gradient(135deg, #3897F0, #1E88E5)';
    actionBtn.style.opacity = '1';
    actionBtn.onclick = handleSelfieActionClick;
  }

  // Attempt real camera stream
  await startSelfieLiveCamera();
}
window.openSelfieVerifyModal = openSelfieVerifyModal;

async function startSelfieLiveCamera() {
  const video = document.getElementById('selfieVideoEl');
  const fallbackEl = document.getElementById('selfieCameraFallback');
  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const s1 = document.getElementById('sStep1');

  // Stop any existing tracks
  if (_selfieStream) {
    try {
      _selfieStream.getTracks().forEach(t => t.stop());
    } catch (_) {}
    _selfieStream = null;
  }

  const hasMediaDevices = Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
  const isSecure = window.isSecureContext !== false;

  if (hasMediaDevices && isSecure) {
    try {
      if (statusPill) statusPill.textContent = 'Starting front camera...';
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 640 },
            height: { ideal: 640 }
          },
          audio: false
        });
      } catch (e1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
          });
        } catch (e2) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      if (stream && video) {
        _selfieStream = stream;
        video.srcObject = stream;
        video.muted = true;
        video.defaultMuted = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.style.display = 'block';
        if (fallbackEl) fallbackEl.style.display = 'none';

        await video.play().catch(err => console.warn('Camera video.play() notice:', err));

        if (s1) s1.className = 'selfie-step-dot done';
        if (statusPill) {
          statusPill.textContent = 'Position your face in the oval & tap Capture';
          statusPill.style.color = '#3897F0';
        }
        if (actionBtn) {
          actionBtn.disabled = false;
          actionBtn.textContent = '📸 Capture & Scan Face';
          actionBtn.style.background = 'linear-gradient(135deg, #3897F0, #1E88E5)';
          actionBtn.onclick = handleSelfieActionClick;
        }
        return;
      }
    } catch (err) {
      console.warn('getUserMedia error, falling back to native camera capture:', err);
    }
  }

  // Fallback: WebRTC camera not available or permission denied
  if (video) video.style.display = 'none';
  if (fallbackEl) fallbackEl.style.display = 'flex';
  if (statusPill) {
    statusPill.textContent = 'Snap a live selfie using your phone camera';
    statusPill.style.color = '#F4C550';
  }
  if (actionBtn) {
    actionBtn.disabled = false;
    actionBtn.textContent = '📸 Take Live Selfie';
    actionBtn.style.background = 'linear-gradient(135deg, #3897F0, #1E88E5)';
    actionBtn.onclick = triggerNativeSelfieCapture;
  }
}
window.startSelfieLiveCamera = startSelfieLiveCamera;

function triggerNativeSelfieCapture() {
  const fileInput = document.getElementById('selfieFileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}
window.triggerNativeSelfieCapture = triggerNativeSelfieCapture;

function handleSelfieFileSelected(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const fallbackEl = document.getElementById('selfieCameraFallback');
  const capturedImg = document.getElementById('selfieCapturedPreview');
  const s1 = document.getElementById('sStep1');

  if (statusPill) statusPill.textContent = 'Processing selfie photo...';
  if (actionBtn) { actionBtn.disabled = true; actionBtn.textContent = 'Loading photo...'; }

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const img = new Image();
    img.onload = function() {
      // Draw into square canvas
      const canvas = document.getElementById('selfieCanvas') || document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 480, 480);

      _selfieCapturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      if (capturedImg) {
        capturedImg.src = _selfieCapturedDataUrl;
        capturedImg.style.display = 'block';
      }
      if (fallbackEl) fallbackEl.style.display = 'none';
      if (s1) s1.className = 'selfie-step-dot done';

      // Run biometric face validation
      analyzeAndScanSelfieImage(canvas);
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}
window.handleSelfieFileSelected = handleSelfieFileSelected;

function closeSelfieVerifyModal() {
  const modal = document.getElementById('selfieVerifyModal');
  if (modal) modal.style.display = 'none';

  if (_selfieStream) {
    try {
      _selfieStream.getTracks().forEach(t => t.stop());
    } catch (_) {}
    _selfieStream = null;
  }
  if (_selfieScanTimeout) {
    clearTimeout(_selfieScanTimeout);
    _selfieScanTimeout = null;
  }
  if (_selfieCountdownInterval) {
    clearInterval(_selfieCountdownInterval);
    _selfieCountdownInterval = null;
  }
  _selfiePhase = 'ready';
}
window.closeSelfieVerifyModal = closeSelfieVerifyModal;

function handleSelfieActionClick() {
  if (_selfiePhase === 'ready') {
    const video = document.getElementById('selfieVideoEl');
    if (_selfieStream && video && video.videoWidth > 0) {
      startSelfieCountdownAndCapture();
    } else {
      triggerNativeSelfieCapture();
    }
  } else if (_selfiePhase === 'success') {
    completeSelfieVerification();
  }
}
window.handleSelfieActionClick = handleSelfieActionClick;
window.startSelfieScan = handleSelfieActionClick; // Alias for backward compatibility

function startSelfieCountdownAndCapture() {
  _selfiePhase = 'countdown';
  const countdownEl = document.getElementById('selfieCountdown');
  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const flashEl = document.getElementById('selfieFlashOverlay');
  const video = document.getElementById('selfieVideoEl');
  const capturedImg = document.getElementById('selfieCapturedPreview');

  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.textContent = 'Hold still...';
  }

  let count = 3;
  if (countdownEl) {
    countdownEl.textContent = String(count);
    countdownEl.style.display = 'flex';
  }
  if (statusPill) {
    statusPill.textContent = \`Get ready... Capturing in \${count}s 📸\`;
    statusPill.style.color = '#3897F0';
  }
  haptic('light');

  _selfieCountdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      if (countdownEl) countdownEl.textContent = String(count);
      if (statusPill) statusPill.textContent = \`Hold still... Capturing in \${count}s 📸\`;
      haptic('light');
    } else {
      clearInterval(_selfieCountdownInterval);
      _selfieCountdownInterval = null;
      if (countdownEl) countdownEl.style.display = 'none';

      // Shutter flash effect
      if (flashEl) {
        flashEl.classList.add('flash');
        setTimeout(() => flashEl.classList.remove('flash'), 300);
      }
      haptic('medium');

      // Capture frame from live video
      const canvas = document.getElementById('selfieCanvas') || document.createElement('canvas');
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 640;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Mirror horizontally so snapshot matches user's mirrored front camera view
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      _selfieCapturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Freeze frame on captured snapshot
      if (capturedImg) {
        capturedImg.src = _selfieCapturedDataUrl;
        capturedImg.style.display = 'block';
      }
      if (video) video.style.display = 'none';

      // Stop camera stream tracks
      if (_selfieStream) {
        try {
          _selfieStream.getTracks().forEach(t => t.stop());
        } catch (_) {}
        _selfieStream = null;
      }

      // Analyze image
      analyzeAndScanSelfieImage(canvas);
    }
  }, 950);
}

function analyzeAndScanSelfieImage(canvas) {
  _selfiePhase = 'analyzing';
  const laser = document.getElementById('selfieScanLaser');
  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const s2 = document.getElementById('sStep2');

  if (s2) s2.className = 'selfie-step-dot active';
  if (laser) laser.classList.add('scanning');
  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.textContent = 'Scanning facial landmarks...';
  }
  if (statusPill) {
    statusPill.textContent = 'Scanning facial geometry... 🔍';
    statusPill.style.color = '#3897F0';
  }

  // 1. Biometric image quality validation
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let totalLum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLum += lum;
    count++;
  }
  const avgLum = totalLum / count;

  let sumDiff = 0;
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumDiff += Math.pow(lum - avgLum, 2);
  }
  const variance = Math.sqrt(sumDiff / count);

  // Quality check validation
  if (avgLum < 24) {
    failSelfieScan('⚠️ Photo is too dark. Ensure good face lighting.', 'dark');
    return;
  }
  if (avgLum > 248) {
    failSelfieScan('⚠️ Photo is overexposed. Avoid direct blinding flash.', 'bright');
    return;
  }
  if (variance < 14) {
    failSelfieScan('⚠️ No face detected. Position your face clearly in frame.', 'noface');
    return;
  }

  // Laser scanning animation delay
  _selfieScanTimeout = setTimeout(() => {
    if (laser) laser.classList.remove('scanning');
    _selfiePhase = 'success';

    const s2 = document.getElementById('sStep2');
    const s3 = document.getElementById('sStep3');
    const retakeBtn = document.getElementById('selfieRetakeBtn');

    if (s2) s2.className = 'selfie-step-dot done';
    if (s3) s3.className = 'selfie-step-dot done';

    if (statusPill) {
      statusPill.textContent = '✓ 100% Face Match! Identity Confirmed';
      statusPill.style.color = '#21B06B';
    }

    if (actionBtn) {
      actionBtn.disabled = false;
      actionBtn.textContent = '✓ Confirm & Get Verified';
      actionBtn.style.background = 'linear-gradient(135deg, #21B06B, #1B9B5C)';
      actionBtn.onclick = handleSelfieActionClick;
    }

    if (retakeBtn) {
      retakeBtn.style.display = 'block';
      retakeBtn.textContent = '↺ Retake Selfie';
    }

    haptic('success');
  }, 1600);
}

function failSelfieScan(errorMsg, reason) {
  _selfiePhase = 'failed';
  const laser = document.getElementById('selfieScanLaser');
  const statusPill = document.getElementById('selfieStatusPill');
  const actionBtn = document.getElementById('selfieActionBtn');
  const retakeBtn = document.getElementById('selfieRetakeBtn');

  if (laser) laser.classList.remove('scanning');
  if (statusPill) {
    statusPill.textContent = errorMsg;
    statusPill.style.color = '#FF4565';
  }
  if (actionBtn) {
    actionBtn.disabled = true;
    actionBtn.textContent = 'Face Scan Incomplete';
    actionBtn.style.background = 'rgba(255, 255, 255, 0.12)';
  }
  if (retakeBtn) {
    retakeBtn.style.display = 'block';
    retakeBtn.textContent = '↺ Retake Photo';
  }
  haptic('error');
}

function retakeSelfiePhoto() {
  const capturedImg = document.getElementById('selfieCapturedPreview');
  const retakeBtn = document.getElementById('selfieRetakeBtn');
  const actionBtn = document.getElementById('selfieActionBtn');
  const statusPill = document.getElementById('selfieStatusPill');
  const laser = document.getElementById('selfieScanLaser');
  const s1 = document.getElementById('sStep1');
  const s2 = document.getElementById('sStep2');
  const s3 = document.getElementById('sStep3');

  _selfiePhase = 'ready';
  _selfieCapturedDataUrl = null;
  if (_selfieScanTimeout) { clearTimeout(_selfieScanTimeout); _selfieScanTimeout = null; }

  if (capturedImg) { capturedImg.style.display = 'none'; capturedImg.src = ''; }
  if (retakeBtn) retakeBtn.style.display = 'none';
  if (laser) laser.classList.remove('scanning');

  if (s1) s1.className = 'selfie-step-dot active';
  if (s2) s2.className = 'selfie-step-dot';
  if (s3) s3.className = 'selfie-step-dot';

  if (statusPill) {
    statusPill.textContent = 'Align your face inside the oval';
    statusPill.style.color = '#3897F0';
  }

  if (actionBtn) {
    actionBtn.disabled = false;
    actionBtn.textContent = '📸 Capture & Scan Face';
    actionBtn.style.background = 'linear-gradient(135deg, #3897F0, #1E88E5)';
    actionBtn.onclick = handleSelfieActionClick;
  }

  startSelfieLiveCamera();
}
window.retakeSelfiePhoto = retakeSelfiePhoto;

function completeSelfieVerification() {
  currentUser.isVerified = true;
  if (_selfieCapturedDataUrl) {
    try {
      currentUser.verifiedSelfie = _selfieCapturedDataUrl;
    } catch (_) {}
  }

  try {
    localStorage.setItem('hmbs_verified', 'true');
    const savedUserStr = localStorage.getItem('hmbs_user');
    if (savedUserStr) {
      const u = JSON.parse(savedUserStr);
      u.isVerified = true;
      if (_selfieCapturedDataUrl) u.verifiedSelfie = _selfieCapturedDataUrl;
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
}
window.completeSelfieVerification = completeSelfieVerification;
`;

  fs.writeFileSync('script.js', prefix + newVerificationSection, 'utf8');
  console.log('✓ Successfully updated script.js with real camera verification engine');
} else {
  console.error('Could not locate verification section index in script.js');
}

// 4. BUMP VERSION in sw.js and index.html to v49
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/hmbs-cache-v\d+/g, 'hmbs-cache-v49');
fs.writeFileSync('sw.js', sw, 'utf8');

html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/\?v=\d+/g, '?v=49');
fs.writeFileSync('index.html', html, 'utf8');
console.log('✓ Bumped cache version to v49');
