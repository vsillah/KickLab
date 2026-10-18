import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173/kicklab.html';
const outputDir = resolve(process.argv[3] || 'qa-artifacts/header-duel-xray');
const revision = process.argv[4] || 'local';
const videoDir = join(outputDir, 'video');
mkdirSync(videoDir, { recursive: true });

const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((path) => path && existsSync(path));
if (!executablePath) throw new Error('No Chromium executable found.');

const browser = await chromium.launch({ headless: true, executablePath });
const viewports = [
  { label: 'desktop-1440x1000', width: 1440, height: 1000, video: true },
  { label: 'tablet-768x1024', width: 768, height: 1024 },
  { label: 'mobile-390x844', width: 390, height: 844 }
];
const report = { schemaVersion: '1.0.0', baseUrl, revision, cadence: ['Space', 1180, 'Space'], viewports: [], externalRequests: [], errors: [] };

const seedProfile = () => {
  const progress = { gfx: '3d', mute: true, xp: 0 };
  localStorage.setItem('impactlab.v1', JSON.stringify(progress));
  localStorage.setItem('impactlab.nick', 'QA Striker');
  localStorage.setItem('kicklab.profiles.v1', JSON.stringify({ version: 1, activeId: 'qa-player', legacyProfileId: 'qa-player', profiles: [{ id: 'qa-player', nickname: 'QA Striker', avatar: 'rocket', color: 'sky', progress, needsSetup: false, createdAt: 1, updatedAt: 1 }] }));
};

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    recordVideo: viewport.video ? { dir: videoDir, size: { width: viewport.width, height: viewport.height } } : undefined
  });
  await context.addInitScript(seedProfile);
  const page = await context.newPage();
  const external = new Set();
  const errors = [];
  page.on('request', (request) => {
    const value = request.url();
    if (/^https?:/.test(value) && new URL(value).origin !== new URL(baseUrl).origin) external.add(value);
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  const url = new URL(baseUrl);
  Object.entries({ renderer: 'direction-c', quality: 'full', qa: 'header-duel-xray', revision, viewport: viewport.label }).forEach(([key, value]) => url.searchParams.set(key, value));
  await page.goto(url.href, { waitUntil: 'networkidle', timeout: 30000 });
  if (!(await page.locator('#profileDialog').evaluate((node) => node.hidden))) throw new Error(`${viewport.label}: profile setup obscured gameplay`);
  await page.locator('#lab-tab-kick').click();
  await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 10000 });
  await page.locator('#experienceSelector').click();
  await page.locator('#experienceFreestyle').click();
  for (;;) {
    const selected = page.locator('[role="checkbox"][aria-checked="true"]');
    if (!(await selected.count()) || await selected.first().getAttribute('id') === 'game-header') break;
    await selected.first().click();
  }
  const header = page.locator('#game-header');
  if (await header.getAttribute('aria-checked') !== 'true') await header.click();
  await page.locator('#freestyleStart').click();
  await page.evaluate(() => document.activeElement?.blur());
  await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForFunction(() => window.__KICKLAB_DIRECTION_C__?.profile === 'header' && window.__KICKLAB_PHYSICS_VISION__?.active === false, null, { timeout: 5000 });

  const before = await page.evaluate(() => ({ athlete: window.__KICKLAB_DIRECTION_C__, xray: window.__KICKLAB_PHYSICS_VISION__, overflow: document.documentElement.scrollWidth - innerWidth }));
  await page.screenshot({ path: join(outputDir, `${viewport.label}-header-ready.png`), fullPage: true });
  await page.keyboard.press('Space');
  await page.waitForTimeout(1180);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__KICKLAB_PHYSICS_VISION__?.active === true, null, { timeout: 1500, polling: 20 });
  const active = await page.evaluate(() => ({ athlete: window.__KICKLAB_DIRECTION_C__, xray: window.__KICKLAB_PHYSICS_VISION__, overflow: document.documentElement.scrollWidth - innerWidth }));
  await page.screenshot({ path: join(outputDir, `${viewport.label}-header-xray.png`), fullPage: true });
  await page.waitForFunction(() => window.__KICKLAB_PHYSICS_VISION__?.active === false, null, { timeout: 5000, polling: 20 });
  await page.waitForFunction(() => window.__KICKLAB_DIRECTION_C__?.phase === 'Recovery', null, { timeout: 5000 });
  const after = await page.evaluate(() => ({ athlete: window.__KICKLAB_DIRECTION_C__, xray: window.__KICKLAB_PHYSICS_VISION__, overflow: document.documentElement.scrollWidth - innerWidth }));
  await page.screenshot({ path: join(outputDir, `${viewport.label}-header-recovery.png`), fullPage: true });

  if (before.athlete?.profile !== 'header' || before.xray?.active) throw new Error(`${viewport.label}: invalid ready state`);
  if (!active.xray?.active || active.xray.annotations !== false || active.xray.persistentMath !== false) throw new Error(`${viewport.label}: invalid live X-ray state (${JSON.stringify(active.xray)})`);
  if (after.xray?.active || after.athlete?.phase !== 'Recovery') throw new Error(`${viewport.label}: X-ray did not exit into recovery`);
  if ([before, active, after].some((state) => state.overflow > 1)) throw new Error(`${viewport.label}: horizontal overflow`);
  if (external.size) throw new Error(`${viewport.label}: external requests observed (${JSON.stringify([...external])})`);
  if (errors.length) throw new Error(`${viewport.label}: page errors observed (${JSON.stringify(errors)})`);

  report.viewports.push({ label: viewport.label, width: viewport.width, height: viewport.height, before, active, after, externalRequests: [...external], errors });
  report.externalRequests.push(...external);
  report.errors.push(...errors);
  await context.close();
}

report.videoFiles = readdirSync(videoDir).filter((file) => file.endsWith('.webm')).map((file) => ({ file, bytes: statSync(join(videoDir, file)).size }));
writeFileSync(join(outputDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outputDir, revision, cadence: report.cadence, viewports: report.viewports.map(({ label, active, after }) => ({ label, active: active.xray.active, annotations: active.xray.annotations, persistentMath: active.xray.persistentMath, after: after.athlete.phase })), externalRequests: report.externalRequests, errors: report.errors, videoFiles: report.videoFiles }, null, 2));
await browser.close();
