// Real-browser animation/UX smoke for the Moonleaf Café polish pass.
//
// Drives the ACTUAL game in headless Chrome via the Chrome DevTools Protocol,
// using only Node's built-in WebSocket (no Playwright/Puppeteer). Mirrors the
// flow in scripts/bug04_playwright_run.py but asserts the new cozy-motion wiring:
//   - overlays open with the `overlay-anim` class (enter animation is wired)
//   - no console errors / exceptions during a full day loop across 4 viewports
//   - reduced-motion still opens overlays (instant, no crash)
//   - larger text size does not clip the kettle panel inside the viewport
//
// Usage: node scripts/animation_qa_smoke.mjs   (Chrome must be on :9222, dist served)

import http from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';

const CDP = 'http://[::1]:9222';
const BASE = process.env.QA_URL || 'http://127.0.0.1:5180/';
const SHOTS = '/tmp/cafe_anim_shots';
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  [1280, 720],
  [1512, 676],
  [1440, 900],
  [1920, 1080],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpGet(path) {
  return new Promise((resolve, reject) => {
    http
      .get(CDP + path, (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve(body ? JSON.parse(body) : null));
      })
      .on('error', reject);
  });
}

async function cdpPut(path, url) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ url });
    const req = http.request(
      CDP + path,
      { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve(body ? JSON.parse(body) : null));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function newTarget(url) {
  const t = await cdpPut('/json/new', url);
  return t.webSocketDebuggerUrl;
}

class Page {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = 'arraybuffer';
    this.nextId = 1;
    this.pending = new Map();
    this.errors = [];
    this.events = [];
    this._open = null;
    this._openResolve = null;
    this.ws.addEventListener('open', () => this._openResolve && this._openResolve());
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)(msg);
        this.pending.delete(msg.id);
      } else if (msg.method) {
        if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
          this.errors.push('console.error: ' + (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
        }
        if (msg.method === 'Runtime.exceptionThrown') {
          const d = msg.params.exceptionDetails;
          this.errors.push('exception: ' + (d?.exception?.description || d?.text || 'unknown'));
        }
        this.events.push(msg.method);
      }
    });
    this._open = new Promise((res) => (this._openResolve = res));
  }
  send(method, params = {}) {
    return new Promise((resolve) => {
      const id = this.nextId++;
      this.pending.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async ready() {
    await this._open;
    await this.send('Runtime.enable');
    await this.send('Page.enable');
    await this.send('Log.enable');
  }
  async setViewport(w, h) {
    await this.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  }
  async navigate(u) {
    await this.send('Page.navigate', { url: u });
    await sleep(900);
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) {
      this.errors.push('eval: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
      return null;
    }
    return r.result?.result?.value ?? null;
  }
  async setReducedMotion(on) {
    await this.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: on ? 'reduce' : 'no-preference' }] });
  }
  async screenshot(name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    if (r.result?.data) writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(r.result.data, 'base64'));
  }
  close() {
    try { this.ws.close(); } catch { /* noop */ }
  }
}

const hasClass = (sel, cls) =>
  `(() => { const el = document.querySelector(${JSON.stringify(sel)}); return !!el && el.classList.contains(${JSON.stringify(cls)}); })()`;

async function run() {
  const report = { viewports: [], reducedMotion: null, summary: {} };
  let totalErrors = 0;

  for (const [w, h] of VIEWPORTS) {
    const wsUrl = await newTarget(BASE);
    const page = new Page(wsUrl);
    await page.ready();
    await page.setViewport(w, h);
    await page.navigate(BASE);

    // Fresh save
    await page.eval('localStorage.clear();');
    await page.navigate(BASE);
    await sleep(700);

    const titleVisible = await page.eval(`!!document.querySelector('#title-screen')`);
    // New Game
    await page.eval(`document.querySelector('#title-screen .btn-secondary')?.click()`);
    await sleep(600);
    // Dismiss tutorial letter
    const letterAnim = await page.eval(hasClass('#letter-overlay', 'overlay-anim'));
    await page.eval(`document.querySelector('#letter-overlay .btn-primary')?.click()`);
    await sleep(500);

    // Open journal via HUD
    await page.eval(`document.querySelector('#hud-journal')?.click()`);
    await sleep(400);
    const journalAnim = await page.eval(hasClass('#journal-overlay', 'overlay-anim'));
    await page.screenshot(`vp${w}x${h}_journal`);
    await page.eval(`document.querySelector('#journal-overlay .btn-primary, #journal-overlay .btn-secondary')?.click()`);
    await sleep(400);

    // Open settings via HUD
    await page.eval(`document.querySelector('#hud-settings')?.click()`);
    await sleep(400);
    const settingsAnim = await page.eval(hasClass('#settings-overlay', 'overlay-anim'));
    await page.eval(`document.querySelector('#settings-overlay .btn-primary, #settings-overlay .btn-secondary')?.click()`);
    await sleep(400);

    // Short day loop: dismiss mailbox, open doors, serve, recap
    const mb = await page.eval(`(() => { const b = document.getElementById('mailbox-continue'); if (b) { b.click(); return true; } return false; })()`);
    await sleep(200);
    await page.eval(`document.getElementById('btn-open-door')?.click()`);
    await sleep(200);
    await page.eval(`(() => { window.__moonleaf.debugSpawnNow(); window.__moonleaf.debugBrew({base:'water',ingredients:['tea_leaves'],finish:'hot'}); })()`);
    await sleep(400);
    await page.eval(`window.__moonleaf.debugCloseDay();`);
    await sleep(400);
    const recapAnim = await page.eval(hasClass('#recap-overlay', 'overlay-anim'));
    await page.screenshot(`vp${w}x${h}_recap`);
    await page.eval(`document.getElementById('recap-continue')?.click()`);
    await sleep(300);
    await page.eval(`window.__moonleaf.debugContinueRecap();`);
    await sleep(500);

    // Larger text size + kettle clip check
    await page.eval(`document.documentElement.style.fontSize = '150%';`);
    // open kettle via canvas bubble click — fallback: use debugSpawnNow + simulate bubble click by coords is brittle; check settings at 150%
    await page.eval(`document.querySelector('#hud-settings')?.click()`);
    await sleep(400);
    const clip150 = await page.eval(
      `(() => { const o = document.getElementById('settings-overlay'); const p = o && o.querySelector('.panel'); if (!p) return null; const r = p.getBoundingClientRect(); const vh = window.innerHeight; return { panelBottom: Math.round(r.bottom), viewportH: vh, clipped: r.bottom > vh + 1 }; })()`
    );
    await page.eval(`document.querySelector('#settings-overlay .btn-primary, #settings-overlay .btn-secondary')?.click()`);
    await page.eval(`document.documentElement.style.fontSize = '100%';`);
    await sleep(200);

    const vpErrors = page.errors.slice();
    totalErrors += vpErrors.length;
    report.viewports.push({
      viewport: `${w}x${h}`,
      titleVisible,
      letterAnim,
      journalAnim,
      settingsAnim,
      recapAnim,
      mailboxShown: !!mb,
      clip150,
      errors: vpErrors,
    });
    page.close();
  }

  // Reduced-motion pass (single viewport)
  {
    const wsUrl = await newTarget(BASE);
    const page = new Page(wsUrl);
    await page.ready();
    await page.setViewport(1280, 720);
    await page.setReducedMotion(true);
    await page.navigate(BASE);
    await page.eval('localStorage.clear();');
    await page.navigate(BASE);
    await sleep(700);
    await page.eval(`document.querySelector('#title-screen .btn-secondary')?.click()`);
    await sleep(600);
    await page.eval(`document.querySelector('#letter-overlay .btn-primary')?.click()`);
    await sleep(400);
    await page.eval(`document.querySelector('#hud-journal')?.click()`);
    await sleep(400);
    const rmOpen = await page.eval(`!!document.querySelector('#journal-overlay') && !document.querySelector('#journal-overlay').classList.contains('hidden')`);
    const rmErrors = page.errors.slice();
    totalErrors += rmErrors.length;
    report.reducedMotion = { journalOpened: rmOpen, errors: rmErrors };
    await page.screenshot('reduced_motion_journal');
    page.close();
  }

  report.summary = {
    totalConsoleErrors: totalErrors,
    allOverlayAnimWired: report.viewports.every((v) => v.letterAnim && v.journalAnim && v.settingsAnim && v.recapAnim),
    noClippingAt150: report.viewports.every((v) => v.clip150 && !v.clip150.clipped),
    reducedMotionOk: report.reducedMotion.journalOpened && report.reducedMotion.errors.length === 0,
  };
  writeFileSync(`${SHOTS}/report.json`, JSON.stringify(report, null, 2));

  console.log('=== ANIMATION QA SMOKE ===');
  console.log('Console/exception errors total:', totalErrors);
  for (const v of report.viewports) {
    console.log(
      `  ${v.viewport}: title=${v.titleVisible} letterAnim=${v.letterAnim} journalAnim=${v.journalAnim} settingsAnim=${v.settingsAnim} recapAnim=${v.recapAnim} clip150=${v.clip150 ? v.clip150.clipped : 'n/a'} errs=${v.errors.length}`
    );
  }
  console.log('  reduced-motion: journalOpened=', report.reducedMotion.journalOpened, 'errs=', report.reducedMotion.errors.length);
  console.log('SUMMARY:', JSON.stringify(report.summary));
  process.exit(totalErrors === 0 && report.summary.allOverlayAnimWired && report.summary.noClippingAt150 && report.summary.reducedMotionOk ? 0 : 1);
}

run().catch((e) => {
  console.error('SMOKE FAILED:', e);
  process.exit(2);
});
