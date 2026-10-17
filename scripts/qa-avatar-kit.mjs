import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173/kicklab.html';
const outputDir = resolve(process.argv[3] || 'qa-artifacts/avatar-kit-telemetry');
const videoDir = join(outputDir, 'video');
mkdirSync(videoDir, { recursive: true });

const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((path) => path && existsSync(path));
if (!executablePath) throw new Error('No Chromium executable found. Set KICKLAB_CHROMIUM_PATH to a local Chrome or Chromium binary.');
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } },
  reducedMotion: 'no-preference'
});
const page = await context.newPage();
const errors = [];
const rigAudits = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

const snap = async (name, fullPage = false) => {
  await page.screenshot({ path: join(outputDir, `${name}.png`), fullPage });
};
const stageSnap = async (name) => {
  await page.locator('.stage').screenshot({ path: join(outputDir, `${name}-stage.png`) });
};
const pause = (ms = 700) => page.waitForTimeout(ms);
const auditRig = async (label) => {
  const joints = await page.evaluate(() => window.__KICKLAB_RIG_AUDIT__ || []);
  if (!joints.length) throw new Error(`${label}: no live 3D rig audit was exposed`);
  const maxGap = Math.max(...joints.map((joint) => Number(joint.headNeckGap) || 0));
  if (maxGap > 0.0065) throw new Error(`${label}: head-to-neck gap ${maxGap.toFixed(4)} exceeds invariant`);
  rigAudits.push({ label, count: joints.length, maxHeadNeckGap: maxGap, joints });
};
const blurControls = () => page.evaluate(() => document.activeElement?.blur());
const dismissToasts = async () => {
  for (const close of await page.locator('.toast-close').all()) {
    if (await close.isVisible()) await close.click();
  }
  await pause(500);
};
const selectLab = async (name) => {
  const tab = page.getByRole('tab', { name: new RegExp(`^${name}`) });
  await tab.click();
  if (await tab.getAttribute('aria-selected') !== 'true') throw new Error(`${name} lab did not become selected`);
  await blurControls();
};
const openActivity = async (name) => {
  await page.getByRole('button', { name: /Freestyle/ }).click();
  for (;;) {
    const selected = page.getByRole('checkbox', { name: /, selected$/ });
    if (await selected.count() === 0) break;
    const aria = await selected.first().getAttribute('aria-label');
    if (aria?.startsWith(name)) break;
    await selected.first().click();
    await page.getByRole('button', { name: /Freestyle/ }).click();
  }
  const target = page.getByRole('checkbox', { name: new RegExp(`^${name}`) });
  const aria = await target.getAttribute('aria-label');
  if (!aria || !/, selected$/.test(aria)) await target.click();
  await page.getByRole('button', { name: 'Play activity', exact: true }).click();
  await blurControls();
  await pause();
};

await page.goto(`${baseUrl}?qa=avatar-kit-final`, { waitUntil: 'networkidle' });
await pause(900);
await page.keyboard.press('Space');
await pause(170);
await stageSnap('1440-fight-impact');
await pause(630);
await snap('1440-fight');
await stageSnap('1440-fight');
await dismissToasts();

await selectLab('Race');
await page.keyboard.down('Space');
await pause(3600);
await page.keyboard.down('ArrowRight');
await pause(450);
await snap('1440-race');
await stageSnap('1440-race');
await pause(250);
await page.keyboard.up('ArrowRight');
await page.keyboard.up('Space');
await dismissToasts();

await selectLab('Kick');
await pause(900);
await page.keyboard.press('Space');
await pause(150);
await stageSnap('1440-free-kick-strike');
await auditRig('free-kick-strike');
await pause(1150);
await dismissToasts();
await snap('1440-free-kick');
await stageSnap('1440-free-kick');

await page.getByRole('button', { name: /Open Kit settings/ }).click();
await page.getByRole('button', { name: /Customize equipment/ }).click();
for (const choice of [/Rock hard/, /Size 4/, /Smooth/, /Soft-ground studs/, /Light.*quick feet/]) {
  await page.getByRole('button', { name: choice }).click();
  await pause(260);
}
await page.locator('#kitSum').evaluate((element) => element.scrollIntoView({ block: 'start' }));
await snap('1440-kit-telemetry');
await page.getByRole('button', { name: /Close settings/ }).click();
await blurControls();
await pause(3300);
await dismissToasts();

await openActivity('1v1 Dribble');
await page.getByRole('button', { name: /Open Player settings/ }).click();
await page.getByRole('button', { name: /The Tower/ }).click();
await page.getByRole('button', { name: /Close settings/ }).click();
await page.keyboard.down('Space');
await page.keyboard.down('ArrowRight');
await pause(650);
await stageSnap('1440-dribble-tower-run-attached');
await auditRig('tower-run');
await pause(850);
await page.keyboard.up('ArrowRight');
await page.keyboard.press('KeyX');
await pause(800);
await page.keyboard.up('Space');
await dismissToasts();
await snap('1440-dribble-tower');
await stageSnap('1440-dribble-tower');
await auditRig('tower-cut');

await page.getByRole('button', { name: /Open Player settings/ }).click();
await page.getByRole('button', { name: /The Trickster/ }).click();
await page.getByRole('button', { name: /Close settings/ }).click();
await blurControls();
await pause(500);
await snap('1440-dribble-trickster');
await stageSnap('1440-dribble-trickster');
await auditRig('trickster-idle');

await openActivity('Goalkeeper');
await page.keyboard.press('Space');
await pause(1800);
await page.keyboard.down('ArrowRight');
await pause(160);
await stageSnap('1440-goalkeeper-airborne-attached');
await auditRig('goalkeeper-airborne');
await pause(260);
await dismissToasts();
await snap('1440-goalkeeper');
await stageSnap('1440-goalkeeper-dive');
await page.keyboard.up('ArrowRight');

const frameTimes = await page.evaluate(() => new Promise((resolve) => {
  const samples = [];
  let prior = performance.now();
  const tick = (now) => {
    samples.push(now - prior);
    prior = now;
    if (samples.length >= 120) resolve(samples.slice(5));
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));

await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByRole('button', { name: /Graphics 3D stadium/ }).click();
await page.getByRole('button', { name: /Classic lighter/ }).click();
await page.getByRole('button', { name: /Close settings/ }).click();
await pause(700);
await snap('1440-classic-fallback');

const viewports = [[768, 1024], [390, 844]];
const responsive = [];
for (const [width, height] of viewports) {
  await page.setViewportSize({ width, height });
  await pause(500);
  const metrics = await page.evaluate(() => ({
    innerWidth,
    innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));
  responsive.push({ width, height, ...metrics });
  await snap(`${width}x${height}-fallback`);
}

const sorted = frameTimes.slice().sort((a, b) => a - b);
const report = {
  baseUrl,
  errors,
  frameSample: {
    count: frameTimes.length,
    medianMs: sorted[Math.floor(sorted.length * 0.5)],
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    maxMs: sorted[sorted.length - 1]
  },
  responsive,
  rigAudits
};
writeFileSync(join(outputDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);

await context.close();
await browser.close();
const videos = readdirSync(videoDir).filter((file) => file.endsWith('.webm')).map((file) => ({ file, bytes: statSync(join(videoDir, file)).size }));
writeFileSync(join(outputDir, 'video-files.json'), `${JSON.stringify(videos, null, 2)}\n`);
console.log(JSON.stringify({ outputDir, ...report, videos }, null, 2));
