import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173/kicklab.html';
const outputDir = resolve(process.argv[3] || 'qa-artifacts/action-xray');
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
const audits = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

const pause = (ms = 250) => page.waitForTimeout(ms);
const snap = (name, fullPage = false) => page.screenshot({ path: join(outputDir, `${name}.png`), fullPage });
const stageSnap = (name) => page.locator('.stage').screenshot({ path: join(outputDir, `${name}-stage.png`) });
const marker = () => page.evaluate(() => window.__KICKLAB_PHYSICS_VISION__ || null);
const blur = () => page.evaluate(() => document.activeElement?.blur());
const waitMarker = async (active, timeout = 6500) => {
  const start = Date.now();
  let state = null;
  while (Date.now() - start < timeout) {
    state = await marker();
    if (!!state?.active === active) return state;
    await pause(35);
  }
  throw new Error(`physics vision did not become ${active ? 'active' : 'clean'}; last state ${JSON.stringify(state)}`);
};
const dismissToasts = async () => {
  for (const close of await page.locator('.toast-close').all()) if (await close.isVisible()) await close.click();
  await pause(180);
};
const selectLab = async (name) => {
  await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
  await blur();
  await pause(350);
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
  await pause(500);
};
const setGraphics = async (mode) => {
  await openActivity('1v1 Dribble');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Graphics/ }).click();
  await page.getByRole('button', { name: mode === '2d' ? /Classic/ : /3D stadium/ }).click();
  await page.getByRole('button', { name: /Close settings/ }).click();
  await blur();
  await pause(600);
};
const audit = async (label, trigger, { capture = false, timeout = 6500, cleanup = null, kick = true } = {}) => {
  const before = await waitMarker(false, 1200);
  if (capture) await stageSnap(`${label}-pre`);
  await trigger();
  const during = await waitMarker(true, timeout);
  if (kick && (during.annotations !== false || during.persistentMath !== false)) throw new Error(`${label}: transient X-ray restored persistent math (${JSON.stringify(during)})`);
  if (capture) await stageSnap(`${label}-action-xray`);
  if (cleanup) await cleanup();
  const after = await waitMarker(false, 6500);
  if (capture) await stageSnap(`${label}-post`);
  audits.push({ label, before, during, after });
  await dismissToasts();
};
const auditCleanAction = async (label, trigger) => {
  const before = await waitMarker(false, 1200);
  await trigger();
  await pause(900);
  const during = await marker();
  if (during?.active || during?.persistentMath) throw new Error(`${label}: unexpected overlay state ${JSON.stringify(during)}`);
  audits.push({ label, before, during, after: during, expected: 'clean-action' });
  await dismissToasts();
};

await page.goto(`${baseUrl}?qa=action-xray`, { waitUntil: 'networkidle' });
await pause(1800);
await page.getByRole('button', { name: /Open Mode settings/ }).click();
await page.getByRole('button', { name: /Free lab/ }).click();
await page.getByRole('button', { name: /Close settings/ }).click();
await blur();
await pause(400);

await audit('1440-fight', async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.getByRole('button', { name: /Cross/ }).click();
    await pause(240);
    if ((await marker())?.active) return;
    await pause(360);
  }
}, { capture: true, kick: false });

await selectLab('Race');
await audit('1440-race', async () => page.keyboard.down('Space'), { capture: true, timeout: 9000, cleanup: async () => page.keyboard.up('Space'), kick: false });

await selectLab('Kick');
await audit('1440-free-kick-3d', async () => page.keyboard.press('Space'), { capture: true });

await openActivity('Header duel');
await audit('1440-header-duel-3d', async () => { await page.keyboard.press('Space'); await pause(1180); await page.keyboard.press('Space'); }, { capture: true });

await openActivity('1v1 Dribble');
await audit('1440-dribble-3d', async () => { await page.keyboard.press('Space'); await page.keyboard.down('ArrowRight'); }, { capture: false, timeout: 6500, cleanup: async () => page.keyboard.up('ArrowRight') });

await openActivity('Passing');
await audit('1440-passing-3d', async () => { await page.keyboard.press('Space'); await pause(280); await page.keyboard.press('Space'); }, { capture: false });

await openActivity('Combo attack');
await audit('1440-combo-3d', async () => { await page.keyboard.press('Space'); await pause(280); await page.keyboard.press('Space'); }, { capture: false });

await openActivity('Goalkeeper');
await audit('1440-goalkeeper-3d', async () => page.keyboard.press('Space'), { capture: true, timeout: 5000 });

await openActivity('Penalty shootout');
await audit('1440-penalty-3d', async () => { await page.keyboard.press('Space'); await pause(280); await page.keyboard.press('Space'); }, { capture: false });

await openActivity('Crossbar');
await auditCleanAction('1440-crossbar-3d', async () => { await page.keyboard.press('Space'); await pause(280); await page.keyboard.press('Space'); });

await setGraphics('2d');
await openActivity('Free kick');
await audit('1440-free-kick-classic', async () => page.keyboard.press('Space'), { capture: true });

await openActivity('Goalkeeper');
await audit('1440-goalkeeper-classic', async () => page.keyboard.press('Space'), { capture: true, timeout: 5000 });

await page.setViewportSize({ width: 390, height: 844 });
await openActivity('Free kick');
await audit('390x844-free-kick-classic', async () => page.keyboard.press('Space'), { capture: true });
const responsive = await page.evaluate(() => ({ innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth }));
await snap('390x844-free-kick-classic-full', true);

writeFileSync(join(outputDir, 'qa-report.json'), `${JSON.stringify({ baseUrl, errors, audits, responsive }, null, 2)}\n`);
await context.close();
await browser.close();
const videos = readdirSync(videoDir).filter((file) => file.endsWith('.webm')).map((file) => ({ file, bytes: statSync(join(videoDir, file)).size }));
writeFileSync(join(outputDir, 'video-files.json'), `${JSON.stringify(videos, null, 2)}\n`);
console.log(JSON.stringify({ outputDir, errors, audits: audits.map(({ label, during }) => ({ label, during })), responsive, videos }, null, 2));
