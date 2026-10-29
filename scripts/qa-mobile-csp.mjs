import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const mobileBase = process.argv[2] || 'http://127.0.0.1:4173/';
const webBase = process.argv[3] || 'http://127.0.0.1:4174/kicklab.html';
const out = resolve(process.argv[4] || 'qa-artifacts/mobile-csp');
const revision = process.env.KICKLAB_QA_HEAD || 'working';
mkdirSync(out, { recursive: true });
const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ headless: true, executablePath, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [], failures = [], interceptedExternal = [];
const sizes = [['phone', 390, 844], ['tablet', 768, 1024], ['laptop', 1280, 800], ['desktop', 1440, 1000]];
const localOrigins = new Set([new URL(mobileBase).origin, new URL(webBase).origin]);

async function open(page, base, label) {
  const url = new URL(base);
  url.searchParams.set('raceExpansion', 'prototype');
  url.searchParams.set('renderer', 'direction-c');
  url.searchParams.set('rev', revision);
  url.searchParams.set('qa', label);
  await page.goto(url.href, { waitUntil: 'networkidle' });
  if (await page.locator('#profileFormSave').isVisible()) await page.locator('#profileFormSave').click();
  if (await page.locator('#profileClose').isVisible()) await page.locator('#profileClose').click();
}
async function tab(page, id) {
  await page.locator(`#lab-tab-${id}`).evaluate(node => node.click());
  await page.waitForTimeout(650);
}
async function inspect(page) {
  return page.evaluate(() => ({
    race: { status: window.__KICKLAB_RACE_3D__?.status, asset: window.__KICKLAB_RACE_3D__?.assetUrl, vehicleOk: window.__KICKLAB_RACE_3D__?.vehicleAudit?.ok, canvasVisible: !!document.querySelector('#race3') && getComputedStyle(document.querySelector('#race3')).display !== 'none' },
    fight: { stageVisible: !!document.querySelector('#fight')?.getClientRects().length, composition: !!window.__KICKLAB_FIGHT_COMPOSITION__ },
    kick: { status: window.__KICKLAB_DIRECTION_C__?.status, canvasVisible: !!document.querySelector('#cv3')?.getClientRects().length },
    overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth)
  }));
}
function guard(page, label, errors) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.route('**/*', route => {
    const url = route.request().url();
    if (/^(?:https?|wss?):/.test(url) && !localOrigins.has(new URL(url).origin)) {
      interceptedExternal.push({ label, url });
      return route.abort();
    }
    return route.continue();
  });
}

try {
  for (const [artifact, base] of [['mobile', mobileBase], ['web', webBase]]) {
    for (const [view, width, height] of sizes) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
      const page = await context.newPage(), errors = [];
      guard(page, `${artifact}/${view}`, errors);
      await open(page, base, `${artifact}-${view}`);
      await tab(page, 'race');
      await page.waitForFunction(() => ['rendering', 'canvas-fallback'].includes(window.__KICKLAB_RACE_3D__?.status), null, { timeout: 15000 });
      if (await page.locator('#racePreflightClose').isVisible()) await page.locator('#racePreflightClose').click();
      await page.locator('#race3').scrollIntoViewIfNeeded();
      const race = (await inspect(page)).race;
      await page.screenshot({ path: join(out, `${artifact}-${view}-race.png`) });
      await page.close();
      const fightPage = await context.newPage();
      guard(fightPage, `${artifact}/${view}/fight`, errors);
      await open(fightPage, base, `${artifact}-${view}-fight`);
      await tab(fightPage, 'fight');
      const fight = (await inspect(fightPage)).fight;
      await fightPage.close();
      const kickPage = await context.newPage();
      guard(kickPage, `${artifact}/${view}/kick`, errors);
      await open(kickPage, base, `${artifact}-${view}-kick`);
      await tab(kickPage, 'kick');
      await kickPage.waitForFunction(() => /^ready/.test(window.__KICKLAB_DIRECTION_C__?.status || ''), null, { timeout: 30000 });
      const kick = (await inspect(kickPage)).kick;
      const overflow = (await inspect(kickPage)).overflow;
      rows.push({ artifact, view, width, height, race, fight, kick, overflow, errors });
      if (race.status !== 'rendering' || !race.vehicleOk || !race.canvasVisible) failures.push(`${artifact}/${view}: Race 3D failed`);
      if (!kick.canvasVisible || !/^ready/.test(kick.status || '')) failures.push(`${artifact}/${view}: Kick 3D failed`);
      if (!fight.composition) failures.push(`${artifact}/${view}: Fight failed`);
      if (overflow > 1) failures.push(`${artifact}/${view}: ${overflow}px horizontal overflow`);
      if (errors.length) failures.push(`${artifact}/${view}: console or page errors`);
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: out, size: { width: 390, height: 844 } } });
  const page = await context.newPage(), video = page.video(), videoErrors = [];
  guard(page, 'mobile/video', videoErrors);
  await open(page, mobileBase, 'mobile-video');
  await tab(page, 'race');
  await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.status === 'rendering', null, { timeout: 15000 });
  if (await page.locator('#racePreflightClose').isVisible()) await page.locator('#racePreflightClose').click();
  await page.locator('.stage:visible').first().evaluate(node => node.scrollIntoView());
  await page.waitForTimeout(1800);
  const success = (await inspect(page)).race;
  await page.screenshot({ path: join(out, 'mobile-phone-race-success.png') });
  await page.route('**/kicklab-race-direction-a/v1/direction-a-atlas.glb', route => route.abort());
  await open(page, mobileBase, 'mobile-forced-fallback');
  await tab(page, 'race');
  await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.status === 'canvas-fallback', null, { timeout: 15000 });
  if (await page.locator('#racePreflightClose').isVisible()) await page.locator('#racePreflightClose').click();
  await page.locator('.stage:visible').first().evaluate(node => node.scrollIntoView());
  await page.waitForTimeout(1800);
  const fallback = (await inspect(page)).race;
  await page.screenshot({ path: join(out, 'mobile-phone-race-fallback.png') });
  await context.close();
  const webm = await video.path(), mp4 = join(out, 'mobile-race-3d-and-forced-fallback.mp4');
  execFileSync('ffmpeg', ['-y', '-i', webm, '-an', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'ignore' });
  const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', mp4], { encoding: 'utf8' }).trim());
  if (!success.vehicleOk || fallback.status !== 'canvas-fallback' || fallback.canvasVisible || duration < 4 || videoErrors.some(error => !error.includes('Failed to load resource: net::ERR_FAILED'))) failures.push('success/fallback walkthrough failed');

  const probeContext = await browser.newContext(), probe = await probeContext.newPage();
  guard(probe, 'mobile/probes', []);
  await probe.addInitScript(() => {
    window.__mobileCspViolations = [];
    document.addEventListener('securitypolicyviolation', event => window.__mobileCspViolations.push({ directive: event.effectiveDirective, blockedURI: event.blockedURI }));
  });
  await open(probe, mobileBase, 'mobile-probes');
  const connections = await probe.evaluate(async () => {
    const url = 'https://example.invalid/kicklab-csp-probe';
    const results = {};
    const bounded = promise => Promise.race([promise, new Promise(resolve => setTimeout(() => resolve('timeout'), 5000))]);
    results.localGlb = (await fetch('assets/3d/kicklab-race-direction-a/v1/direction-a-atlas.glb')).ok;
    try { await fetch(url); results.fetch = 'allowed'; } catch { results.fetch = 'blocked'; }
    results.beaconQueued = navigator.sendBeacon(url, 'probe');
    results.xhr = await new Promise(resolve => { const xhr = new XMLHttpRequest(); xhr.onerror = () => resolve('blocked'); xhr.onload = () => resolve('allowed'); xhr.open('GET', url); try { xhr.send(); } catch { resolve('blocked'); } });
    results.websocket = await bounded(new Promise(resolve => { try { const socket = new WebSocket(url.replace('https:', 'wss:')); socket.onerror = () => resolve('blocked'); socket.onopen = () => { socket.close(); resolve('allowed'); }; } catch { resolve('blocked'); } }));
    results.eventSource = await bounded(new Promise(resolve => { try { const stream = new EventSource(url); stream.onerror = () => { stream.close(); resolve('blocked'); }; stream.onopen = () => { stream.close(); resolve('allowed'); }; } catch { resolve('blocked'); } }));
    results.image = await bounded(new Promise(resolve => { const image = new Image(); image.onerror = () => resolve('blocked'); image.onload = () => resolve('allowed'); image.src = url; }));
    results.media = await bounded(new Promise(resolve => { const media = document.createElement('video'); media.onerror = () => resolve('blocked'); media.onloadeddata = () => resolve('allowed'); media.src = url; media.load(); }));
    results.worker = (() => { try { const worker = new Worker(url); worker.terminate(); return 'allowed'; } catch { return 'blocked'; } })();
    return results;
  });
  await probe.waitForTimeout(300);
  const violations = await probe.evaluate(() => window.__mobileCspViolations);
  await probeContext.close();
  if (!connections.localGlb || ['fetch', 'xhr', 'websocket', 'eventSource', 'image', 'media', 'worker'].some(key => connections[key] !== 'blocked')) failures.push('connection CSP probe failed');
  if (!violations.some(item => item.directive === 'connect-src' && item.blockedURI.includes('example.invalid'))) failures.push('external connect CSP violation not observed');
  if (interceptedExternal.length) failures.push('external request escaped CSP');
  const report = { revision, mobileBase, webBase, rows, success, fallback, connections, violations, interceptedExternal, videoErrors, duration, mp4, failures };
  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ rows: rows.map(({ artifact, view, race, fight, kick, overflow, errors }) => ({ artifact, view, race: race.status, vehicleOk: race.vehicleOk, fight: fight.composition, kick: kick.status, overflow, errors: errors.length })), success, fallback, connections, violations, interceptedExternal, duration, mp4, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
