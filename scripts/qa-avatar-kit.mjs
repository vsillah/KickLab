import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { seedQaProfile } from './lib/qa-profile-bootstrap.mjs';

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
// A complete device-local player, so lab tabs open the live stage and not first-run profile setup.
await context.addInitScript(seedQaProfile);
const page = await context.newPage();
const errors = [];
const rigAudits = [];
const environmentAudits = [];
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
const homeUrl = `${baseUrl}?qa=avatar-kit-final&renderer=procedural`;
// The Home chooser shows each lab as a full-card button (#lab-tab-fight, #lab-tab-race, #lab-tab-kick) with aria-pressed.
// The cards are hidden inside a lab, so a switch between labs reloads the Home chooser first.
const selectLab = async (name) => {
  const mode = name.toLowerCase();
  const card = page.locator(`#lab-tab-${mode}`);
  if (!(await card.isVisible())) {
    await page.goto(homeUrl, { waitUntil: 'networkidle' });
    await card.waitFor({ state: 'visible' });
  }
  await card.click();
  await page.waitForFunction((expected) => document.documentElement.dataset.kicklabMode === expected, mode);
  if (await card.getAttribute('aria-pressed') !== 'true') throw new Error(`${name} lab did not become selected`);
  await page.locator('.stage').waitFor({ state: 'visible' });
  await blurControls();
};
// Kick activities are chosen through #experienceSelector → #experienceFreestyle, which opens the Freestyle picker. Each
// activity is a role=checkbox button with a stable id; with exactly one selected, #freestyleStart reads "Play activity".
const activityIds = { 'Free kick': 'game-free', 'Header duel': 'game-header', '1v1 Dribble': 'game-run', Goalkeeper: 'game-gk' };
const openActivity = async (name) => {
  const id = activityIds[name];
  if (!id) throw new Error(`No activity id is mapped for ${name}`);
  const target = page.locator(`#${id}`);
  if (!(await target.isVisible())) {
    const freestyle = page.locator('#experienceFreestyle');
    if (!(await freestyle.isVisible())) await page.locator('#experienceSelector').click();
    await freestyle.click();
    await target.waitFor({ state: 'visible' });
  }
  for (;;) {
    const others = page.locator(`#gameBar [role="checkbox"][aria-checked="true"]:not(#${id})`);
    if (await others.count() === 0) break;
    await others.first().click();
  }
  if (await target.getAttribute('aria-checked') !== 'true') await target.click();
  const start = page.locator('#freestyleStart');
  if ((await start.textContent())?.trim() !== 'Play activity') throw new Error(`${name} is not the only selected activity`);
  await start.click();
  await blurControls();
  await pause();
};
// Settings are reached through the lab-controls rail: #orientationDetailToggle ("Open lab controls") reveals #settingsToggle
// ("Open game settings"), which opens the drawer on its category list. The former quick-setting shortcuts ("Open Kit
// settings", "Open Player settings", "Open Environment settings") are still rendered, hidden, with the category each one
// opened, so a named shortcut resolves its category there and opens the same category from the list.
const openSettings = async (shortcut) => {
  const settingsToggle = page.locator('#settingsToggle');
  if (!(await settingsToggle.isVisible())) await page.locator('#orientationDetailToggle').click();
  await settingsToggle.click();
  await page.locator('#settingsDrawer').waitFor({ state: 'visible' });
  if (!shortcut) return;
  const category = await page
    .locator(`#quickSettings .quick-setting[aria-label^="Open ${shortcut} settings"]`)
    .getAttribute('data-category');
  if (!category) throw new Error(`${shortcut}: settings category was not exposed`);
  await page.locator(`#settingsCategories [data-category="${category}"]`).click();
};
const setEnvironment = async (name, id) => {
  await openSettings('Environment');
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await page.getByRole('button', { name: /Close settings/ }).click();
  await blurControls();
  await pause(500);
  const scene = await page.evaluate(() => window.__KICKLAB_FALLBACK_ENV__ || null);
  if (!scene || scene.id !== id) throw new Error(`${name}: fallback environment audit did not update`);
  environmentAudits.push(scene);
};

// The rig audit below reads the procedural rig's joints. The GLB athlete is the default Kick player now and leaves that audit
// empty, so this suite opts into the procedural rig, which remains the fallback on constrained devices.
await page.goto(homeUrl, { waitUntil: 'networkidle' });
// The app opens on the Home chooser. Enter Fight and wait for the live stage before the first input and capture.
await selectLab('Fight');
await page.locator('.stage').waitFor({ state: 'visible' });
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

await openSettings('Kit');
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
await openSettings('Player');
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

await openSettings('Player');
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

await openSettings();
await page.getByRole('button', { name: /Graphics 3D stadium/ }).click();
await page.getByRole('button', { name: /Classic lighter/ }).click();
await page.getByRole('button', { name: /Close settings/ }).click();
await pause(700);
await snap('1440-classic-fallback');

await openActivity('1v1 Dribble');
await setEnvironment('Home ground', 'home');
await page.keyboard.down('Space');
await page.keyboard.down('ArrowRight');
await pause(800);
await snap('1440-fallback-home-gameplay');
await stageSnap('1440-fallback-home-gameplay');
await page.keyboard.up('ArrowRight');
await page.keyboard.up('Space');
for (const [name, id] of [['High altitude', 'alt'], ['Mars dome', 'mars'], ['Moon', 'moon']]) {
  await setEnvironment(name, id);
  await snap(`1440-fallback-${id}`);
  await stageSnap(`1440-fallback-${id}`);
}
await setEnvironment('Home ground', 'home');
await openActivity('Free kick');
await page.keyboard.press('Space');
await pause(220);
await snap('1440-fallback-free-kick-gameplay');
await stageSnap('1440-fallback-free-kick-gameplay');
await openActivity('1v1 Dribble');
await setEnvironment('Home ground', 'home');

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
  rigAudits,
  environmentAudits
};
writeFileSync(join(outputDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);

await context.close();
await browser.close();
const videos = readdirSync(videoDir).filter((file) => file.endsWith('.webm')).map((file) => ({ file, bytes: statSync(join(videoDir, file)).size }));
writeFileSync(join(outputDir, 'video-files.json'), `${JSON.stringify(videos, null, 2)}\n`);
console.log(JSON.stringify({ outputDir, ...report, videos }, null, 2));
