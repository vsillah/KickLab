import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173/kicklab.html';
const outputDir = resolve(process.argv[3] || 'qa-artifacts/sideview-stadium');
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
const goalAudits = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

const pause = (ms = 650) => page.waitForTimeout(ms);
const snap = async (name, fullPage = false) => page.screenshot({ path: join(outputDir, `${name}.png`), fullPage });
const stageSnap = async (name) => page.locator('.stage').screenshot({ path: join(outputDir, `${name}-stage.png`) });
const leftStageSnap = async (name) => {
  const box = await page.locator('.stage').boundingBox();
  if (!box) throw new Error(`${name}: stage has no bounding box`);
  await page.screenshot({ path: join(outputDir, `${name}-left-half.png`), clip: { x: box.x, y: box.y, width: box.width / 2, height: box.height } });
};
const blur = () => page.evaluate(() => document.activeElement?.blur());
const dismissToasts = async () => {
  for (const close of await page.locator('.toast-close').all()) if (await close.isVisible()) await close.click();
  await pause(300);
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
  const target = page.getByRole('checkbox', { name: new RegExp(`^${name}`, 'i') });
  const aria = await target.getAttribute('aria-label');
  if (!aria || !/, selected$/.test(aria)) await target.click();
  await page.getByRole('button', { name: 'Play activity', exact: true }).click();
  await blur();
  await pause();
};
const audit = async (label, mode, id) => {
  const scene = await page.evaluate(() => window.__KICKLAB_SIDE_STADIUM__ || null);
  const goal = await page.evaluate(() => window.__KICKLAB_SIDE_GOAL__ || null);
  const required = ['atmosphere', 'roof-truss', 'upper-stands', 'lower-stands', 'crowd', 'side-returns', 'animated-boards', 'perspective-pitch'];
  const goalRequired = ['frontFrame', 'rearFrame', 'sideNet', 'backNet', 'perspectiveGrid'];
  if (!scene || scene.mode !== mode || scene.id !== id) throw new Error(`${label}: wrong side-view stadium audit`);
  for (const layer of required) if (!scene.layers.includes(layer)) throw new Error(`${label}: missing ${layer}`);
  if (!goal) throw new Error(`${label}: no dimensional goal audit`);
  for (const primitive of goalRequired) if (!goal[primitive]) throw new Error(`${label}: missing goal primitive ${primitive}`);
  audits.push({ label, ...scene });
  goalAudits.push({ label, ...goal });
};
const setEnvironment = async (name, id, mode) => {
  await page.getByRole('button', { name: /Open Environment settings/ }).click();
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await page.getByRole('button', { name: /Close settings/ }).click();
  await blur();
  await pause();
  await audit(`${mode}-${id}`, mode, id);
};

await page.goto(`${baseUrl}?qa=sideview-stadium`, { waitUntil: 'networkidle' });
await page.getByRole('tab', { name: /^Kick/ }).click();
await pause(800);
await audit('free-home-aim', 'free', 'home');
await snap('1440-free-kick-home');
await stageSnap('1440-free-kick-home');
await leftStageSnap('1440-free-kick-home');
const boardStart = await page.evaluate(() => window.__KICKLAB_SIDE_STADIUM__.boardPhase);
await pause(900);
const boardEnd = await page.evaluate(() => window.__KICKLAB_SIDE_STADIUM__.boardPhase);
const boardTravel = (boardEnd - boardStart + 152) % 152;
if (boardTravel < 20) throw new Error(`animated board moved only ${boardTravel.toFixed(1)} px`);
await stageSnap('1440-free-kick-board-moved');
await page.keyboard.press('Space');
await pause(210);
await stageSnap('1440-free-kick-strike');
await pause(900);
await dismissToasts();

await openActivity('Header duel');
await audit('header-home-aim', 'header', 'home');
await snap('1440-header-duel-home');
await stageSnap('1440-header-duel-home');
await page.keyboard.press('Space');
await pause(980);
await stageSnap('1440-header-duel-incoming');
await leftStageSnap('1440-header-duel-incoming');
await page.keyboard.press('Space');
await pause(450);
await stageSnap('1440-header-duel-contact');
await dismissToasts();

for (const [name, id] of [['High altitude', 'alt'], ['Mars dome', 'mars'], ['Moon', 'moon']]) {
  await setEnvironment(name, id, 'header');
  await snap(`1440-header-${id}`);
  await stageSnap(`1440-header-${id}`);
}
await setEnvironment('Home ground', 'home', 'header');

await page.setViewportSize({ width: 390, height: 844 });
await pause(500);
const responsive = await page.evaluate(() => ({ innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth }));
await snap('390x844-header-home', true);
await stageSnap('390x844-header-home');

writeFileSync(join(outputDir, 'qa-report.json'), `${JSON.stringify({ baseUrl, errors, audits, goalAudits, boardMotion: { start: boardStart, end: boardEnd, travelPx: boardTravel }, responsive }, null, 2)}\n`);
await context.close();
await browser.close();
const videos = readdirSync(videoDir).filter((file) => file.endsWith('.webm')).map((file) => ({ file, bytes: statSync(join(videoDir, file)).size }));
writeFileSync(join(outputDir, 'video-files.json'), `${JSON.stringify(videos, null, 2)}\n`);
console.log(JSON.stringify({ outputDir, errors, audits, goalAudits, boardMotion: { start: boardStart, end: boardEnd, travelPx: boardTravel }, responsive, videos }, null, 2));
