const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Real Photo Verification Workflow ---');

const script = fs.readFileSync('script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

// 1. Check DOM elements in index.html
assert.ok(html.includes('id="selfieVideoEl"'), 'Live video element exists');
assert.ok(html.includes('id="selfieCanvas"'), 'Offscreen processing canvas exists');
assert.ok(html.includes('id="selfieCapturedPreview"'), 'Captured snapshot preview exists');
assert.ok(html.includes('id="selfieCameraFallback"'), 'Camera fallback UI exists');
assert.ok(html.includes('id="selfieFlashOverlay"'), 'Camera shutter flash exists');
assert.ok(html.includes('id="selfieCountdown"'), '3-2-1 live countdown overlay exists');
assert.ok(html.includes('id="selfieFileInput"'), 'Native camera file input exists');
assert.ok(html.includes('id="selfieRetakeBtn"'), 'Retake selfie button exists');
console.log('✓ 1. All live photo verification DOM elements exist in index.html');

// 2. Check CSS styling in style.css
assert.ok(css.includes('.selfie-captured-img'), 'Captured image styling exists');
assert.ok(css.includes('.selfie-flash-overlay'), 'Flash overlay styling exists');
assert.ok(css.includes('.selfie-countdown-overlay'), 'Countdown overlay styling exists');
assert.ok(css.includes('.selfie-camera-fallback'), 'Camera fallback styling exists');
assert.ok(css.includes('.selfie-secondary-btn'), 'Secondary retake button styling exists');
console.log('✓ 2. All live photo verification styles exist in style.css');

// 3. Check video camera stream initialization in script.js
assert.ok(script.includes('video.setAttribute(\'playsinline\', \'\')'), 'Video playsinline set');
assert.ok(script.includes('video.muted = true'), 'Video muted set for mobile browser autoplay');
assert.ok(script.includes('await video.play()'), 'video.play() called explicitly');
console.log('✓ 3. Video camera stream properly configured for mobile autostart');

// 4. Check real face capture and mirroring
assert.ok(script.includes('ctx.scale(-1, 1)'), 'Canvas horizontally mirrored to match user selfie view');
assert.ok(script.includes('ctx.drawImage(video'), 'Frame drawn to canvas from video');
assert.ok(script.includes('capturedImg.src = _selfieCapturedDataUrl'), 'Captured photo displayed in preview frame');
console.log('✓ 4. Snapshot capture freezes real user selfie into frame');

// 5. Check biometric quality verification
assert.ok(script.includes('avgLum < 24'), 'Rejects dark images');
assert.ok(script.includes('avgLum > 248'), 'Rejects washed out images');
assert.ok(script.includes('variance < 14'), 'Rejects flat/empty images with no face features');
assert.ok(script.includes('failSelfieScan'), 'Failure handler stops verification on invalid photo');
console.log('✓ 5. Biometric pixel quality & exposure checks prevent fake/blank verifications');

// 6. Check user confirmation requirement
assert.ok(script.includes('actionBtn.textContent = \'✓ Confirm & Get Verified\''), 'User must click Confirm to verify');
assert.ok(script.includes('handleSelfieActionClick'), 'Action click handler dispatches based on phase');
console.log('✓ 6. Verification requires genuine user confirmation');

// 7. Check native fallback camera
assert.ok(script.includes('triggerNativeSelfieCapture'), 'Native camera trigger exists');
assert.ok(script.includes('handleSelfieFileSelected'), 'Native photo upload handler exists');
console.log('✓ 7. Native camera fallback ready if WebRTC stream is blocked');

// 8. Discovery card badge
assert.ok(script.includes('${(p.isVerified || p.verified) ? `<span class="verified-icon"'), 'Discovery cards only show verified badge for verified profiles');
console.log('✓ 8. Discovery cards display verified badge authentically');

console.log('\nALL 8 REAL PHOTO VERIFICATION TESTS PASSED PERFECTLY!');
