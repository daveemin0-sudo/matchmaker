// Headless verification: viewports, overflow, console errors, XSS, load metrics.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = process.argv[2] || '/home/claude/matchmaker';
const out = process.argv[3] || '/tmp/claude-0/verify';
const types = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.woff2':'font/woff2' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  const body = fs.readFileSync(f);
  const gz = /\.(js|css|html|svg|json)$/.test(f) && /gzip/.test(req.headers['accept-encoding'] || '');
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', ...(gz ? { 'Content-Encoding': 'gzip' } : {}) });
  res.end(gz ? zlib.gzipSync(body) : body);
});
const XSS = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
async function check0(page, name) { await page.screenshot({ path: `${out}/shots/${page.viewportSize().width}x${page.viewportSize().height}-${name}.png` }); }
const results = { viewports: {}, xss: null, metrics: null, errors: [] };

srv.listen(5601, async () => {
  const browser = await chromium.launch();
  const viewports = [[360, 740], [390, 844], [768, 1024], [1280, 800]];
  for (const [w, h] of viewports) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await page.goto('http://localhost:5601/', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const vr = { screens: {} };
    vr.ageGateShown = await page.isVisible('#ageGateConfirmBtn');
    if (vr.ageGateShown) { await check0(page, 'agegate'); await page.click('#ageGateConfirmBtn'); await page.waitForTimeout(400); }
    const check = async (name) => {
      await page.waitForTimeout(500);
      const o = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const wide = [...document.querySelectorAll('body *')].filter(el => {
          const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          return r.width > 0 && r.right > vw + 1 && cs.position !== 'fixed' && el.offsetParent !== null;
        }).slice(0, 3).map(el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''));
        return { scrollW: document.documentElement.scrollWidth, vw, overflow: document.documentElement.scrollWidth > vw + 1, wide };
      });
      vr.screens[name] = o;
      await page.screenshot({ path: `${out}/shots/${w}x${h}-${name}.png` });
    };
    await check('login');
    await page.evaluate(() => handleGuestLogin());
    await check('discovery');
    for (const sc of ['matches', 'chatsList', 'profile', 'settings']) {
      await page.evaluate((sc) => showScreen(sc), sc);
      await check(sc);
    }
    vr.errors = errs;
    results.viewports[`${w}x${h}`] = vr;
    await ctx.close();
  }

  // XSS: hostile names, bios, messages and search hits rendered through every main view.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('dialog', d => d.dismiss());
    await page.goto('http://localhost:5601/', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    results.xss = await page.evaluate(async (X) => {
      handleGuestLogin();
      const evil = { id: 'evil1', name: 'Eve' + X, age: 25, bio: 'bio' + X, image: 'https://e/x.jpg', photos: ['https://e/x.jpg'], tags: ['tag' + X], city: 'Lagos' + X, isRealUser: false };
      matchedUsers.unshift({ ...evil });
      conversations['evil1'] = { messages: [
        { id: 'a', sender: 'them', text: 'hi' + X, timestamp: Date.now() - 1000 },
        { id: 'b', sender: 'me', text: X, timestamp: Date.now(), replyTo: { text: X, sender: 'them' } },
      ] };
      profileStack.unshift({ ...evil });
      const steps = [];
      const run = (n, f) => { try { f(); steps.push(n + ':ok'); } catch (e) { steps.push(n + ':ERR ' + e.message); } };
      run('cards', () => renderCardStack());
      run('matches', () => { showScreen('matches'); renderMatchesView(); });
      run('inbox', () => { renderConversationList(); if (typeof renderChatsInbox === 'function') renderChatsInbox(); });
      run('chat', () => openChat('evil1'));
      run('profileSheet', () => openProfileDetailSheet('evil1'));
      run('searchRow', () => { const d = document.createElement('div'); d.innerHTML = userSearchRowHtml(evil, false); document.body.appendChild(d); });
      await new Promise(r => setTimeout(r, 1200));
      return { executed: window.__xss || 0, injectedImgs: document.querySelectorAll('img[src="x"]').length, steps };
    }, XSS);
    await ctx.close();
  }

  // Load metrics: fresh load, mobile viewport, CPU 4x slowdown, "Fast 3G"-like network.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const sizes = {};
    page.on('response', async (r) => { const u = new URL(r.url()); if (u.host.startsWith('localhost')) { try { const h = await r.allHeaders(); sizes[u.pathname] = { encoded: Number(h['content-length'] || 0) }; } catch (_) {} } });
    await page.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    const t0 = Date.now();
    await page.goto('http://localhost:5601/', { waitUntil: 'load', timeout: 120000 });
    const wall = Date.now() - t0;
    await page.waitForTimeout(3000);
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const res = performance.getEntriesByType('resource').filter(r => r.name.includes('localhost'));
      return { domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), lcp: Math.round(window.__lcp), cls: Number(window.__cls.toFixed(3)),
        transferredKB: Math.round(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024), requests: res.length,
        longTasksNote: 'n/a' };
    });
    const raw = {};
    for (const f of ['script.js', 'index.html', 'firebase-config.js', 'style.css', 'premium.css']) {
      const b = fs.readFileSync(path.join(root, f)); raw[f] = { rawKB: Math.round(b.length / 1024), gzipKB: Math.round(zlib.gzipSync(b).length / 1024) };
    }
    results.metrics = { ...m, wallLoadMs: wall, raw, conditions: '390x844, CPU 4x slowdown, 150 ms RTT, 1.6 Mbps down, local server with gzip, Firebase CDN unreachable from sandbox' };
    await ctx.close();
  }

  await browser.close(); srv.close();
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 1));
});
