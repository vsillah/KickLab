import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173/kicklab.html';
const outputDir = resolve(process.argv[3] || 'qa-artifacts/3d-restoration');
const videoDir = join(outputDir, 'video');
mkdirSync(videoDir, { recursive: true });

const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((path) => path && existsSync(path));
if (!executablePath) throw new Error('No Chromium executable found.');
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } },
  reducedMotion: 'no-preference'
});
const page = await context.newPage();
const errors = [];
const rendererAudits = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

const pause = (ms = 650) => page.waitForTimeout(ms);
const snap = async (name, fullPage = false) => page.screenshot({ path: join(outputDir, `${name}.png`), fullPage });
const stageSnap = async (name) => page.locator('.stage').screenshot({ path: join(outputDir, `${name}-stage.png`) });
const blur = () => page.evaluate(() => document.activeElement?.blur());
const dismissToasts = async () => {
  for (const close of await page.locator('.toast-close').all()) if (await close.isVisible()) await close.click();
  await pause(250);
};
const openActivity = async (name) => {
  await page.getByRole('button', { name: /Freestyle/ }).click();
  for (;;) {
    const selected = page.getByRole('checkbox', { name: /, selected$/ });
    if (await selected.count() === 0) break;
    const aria = await selected.first().getAttribute('aria-label');
    if (aria?.toLowerCase().startsWith(name.toLowerCase())) break;
    await selected.first().click();
    await page.getByRole('button', { name: /Freestyle/ }).click();
  }
  const target = page.getByRole('checkbox', { name: new RegExp(`^${name}`, 'i') });
  const aria = await target.getAttribute('aria-label');
  if (!aria || !/, selected$/.test(aria)) await target.click();
  await page.getByRole('button', { name: 'Play activity', exact: true }).click();
  await blur();
  await pause(700);
};
const rendererState = () => page.evaluate(() => {
  const canvas = document.querySelector('#cv3');
  const fallback = window.__KICKLAB_SIDE_STADIUM__ || null;
  return canvas ? { present: true, display: getComputedStyle(canvas).display, width: canvas.width, height: canvas.height, fallback } : { present: false, display: 'missing', width: 0, height: 0, fallback };
});
const assert3D = async (label) => {
  await page.locator('#cv3').waitFor({ state: 'attached', timeout: 8000 });
  await pause(350);
  const state = await rendererState();
  if (!state.present || state.display === 'none' || !state.width || !state.height) throw new Error(`${label}: 3D canvas is not active`);
  if (state.fallback) throw new Error(`${label}: Classic backdrop is covering the 3D renderer`);
  rendererAudits.push({ label, expected: '3d', ...state });
};
const assertClassic = async (label) => {
  await pause(350);
  const state = await rendererState();
  if (!state.present || state.display !== 'none') throw new Error(`${label}: 3D canvas did not turn off`);
  if (!state.fallback || !state.fallback.layers?.includes('perspective-pitch')) throw new Error(`${label}: improved Classic stadium is not active`);
  rendererAudits.push({ label, expected: 'classic', ...state });
};
const setGraphics = async (mode) => {
  await openActivity('1v1 Dribble');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Graphics/ }).click();
  await page.getByRole('button', { name: mode === '2d' ? /Classic/ : /3D stadium/ }).click();
  await page.getByRole('button', { name: /Close settings/ }).click();
  await blur();
  await pause(700);
};

await page.goto(`${baseUrl}?qa=3d-restoration`, { waitUntil: 'networkidle' });
await page.getByRole('tab', { name: /^Kick/ }).click();
await assert3D('Free kick');
await snap('1440-free-kick-3d');
await stageSnap('1440-free-kick-3d');
await page.keyboard.press('Space');
await pause(160);
await stageSnap('1440-free-kick-3d-strike');
await pause(850);
await dismissToasts();

await openActivity('Header duel');
await assert3D('Header duel');
await page.keyboard.press('Space');
await pause(950);
await snap('1440-header-duel-3d-action');
await stageSnap('1440-header-duel-3d-action');

for (const activity of ['1v1 Dribble', 'Passing', 'Combo attack', 'Goalkeeper', 'Penalty shootout', 'Crossbar']) {
  await openActivity(activity);
  await assert3D(activity);
}

await openActivity('Goalkeeper');
await page.keyboard.press('Space');
await pause(1800);
await page.keyboard.down('ArrowRight');
await pause(180);
await snap('1440-goalkeeper-3d');
await stageSnap('1440-goalkeeper-3d-airborne');
await page.keyboard.up('ArrowRight');
await assert3D('Goalkeeper active');
await dismissToasts();

await setGraphics('2d');
await openActivity('Free kick');
await assertClassic('Free kick Classic');
await snap('1440-free-kick-classic');
await stageSnap('1440-free-kick-classic');
await page.keyboard.press('Space');
await pause(220);
await stageSnap('1440-free-kick-classic-strike');

await page.setViewportSize({ width: 390, height: 844 });
await pause(500);
const responsive = await page.evaluate(() => ({ innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth }));
await snap('390x844-free-kick-classic', true);
await stageSnap('390x844-free-kick-classic');

await page.setViewportSize({ width: 1440, height: 1000 });
await setGraphics('3d');
await openActivity('Goalkeeper');
await page.keyboard.press('Space');
await pause(1750);
await page.keyboard.down('ArrowLeft');
await pause(180);
await stageSnap('1440-goalkeeper-3d-restored-after-classic');
await page.keyboard.up('ArrowLeft');
await assert3D('Goalkeeper restored after Classic');

writeFileSync(join(outputDir, 'qa-report.json'), `${JSON.stringify({ baseUrl, errors, rendererAudits, responsive }, null, 2)}\n`);
await context.close();
await browser.close();
const videos = readdirSync(videoDir).filter((file) => file.endsWith('.webm')).map((file) => ({ file, bytes: statSync(join(videoDir, file)).size }));
writeFileSync(join(outputDir, 'video-files.json'), `${JSON.stringify(videos, null, 2)}\n`);
console.log(JSON.stringify({ outputDir, errors, rendererAudits, responsive, videos }, null, 2));
