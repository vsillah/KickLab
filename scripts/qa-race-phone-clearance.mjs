import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://127.0.0.1:5879/kicklab.html';
const out = resolve(process.argv[3] || 'qa-artifacts/race-phone-clearance');
const revision = process.argv[4] || 'baseline';
mkdirSync(out, { recursive: true });
const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ headless: true, executablePath });
const reports = [], errors = [], requests = [];

async function capture(width, height, style, collapsed, options = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference' });
  await context.addInitScript(gfx => {
    localStorage.setItem('impactlab.v1', JSON.stringify({ gfx, ch: { fight: 0, race: 0, kick: 0 }, play: { fight: 'ch', race: 'ch', kick: 'ch' } }));
    localStorage.setItem('impactlab.nick', 'QA Player');
  }, options.fallback ? '2d' : '3d');
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => requests.push(request.url()));
  const url = new URL(base);
  url.searchParams.set('raceCornerTrace', 'prototype');
  url.searchParams.set('rev', revision);
  if (options.fallback) url.searchParams.set('fallback', 'canvas');
  await page.goto(url.toString(), { waitUntil: 'networkidle' });
  if (await page.locator('#profileClose').isVisible()) await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();
  if (!options.fallback) {
    const orbit = page.locator('.race-orbit-panel button');
    await orbit.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await orbit.isVisible()) await orbit.click();
  }
  await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 20000 });
  if (!options.fallback) await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.status === 'rendering', null, { timeout: 20000 });
  if (!options.fallback) await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.dynamics?.state === 'run', null, { timeout: 25000 });
  await page.locator('.stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  if (style === 'Analog') await page.locator('#analogControlsButton').click();
  const collapse = page.locator('#controllerCollapseButton');
  if ((await collapse.getAttribute('aria-expanded')) === String(collapsed)) await collapse.press('Enter');
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON() || null;
    const stage = rect('.stage'), deck = rect('.control-deck'), canvas = rect('#race3') || rect('#cv');
    const audit = window.__KICKLAB_RACE_3D__;
    const car = audit?.composition?.carCenter;
    const carPoint = car ? { x: canvas.x + car[0] * canvas.width, y: canvas.y + car[1] * canvas.height } : null;
    const controller = document.querySelector('.control-deck');
    return { stage, deck, canvas, carPoint, car: audit?.composition, renderer: audit?.status, raceCanvas: !!document.querySelector('#race3'), canvasDisplay: getComputedStyle(document.querySelector('#cv')).display, collapsed: document.querySelector('#controllerCollapseButton').getAttribute('aria-expanded') === 'false', analog: document.querySelector('#analogControlsButton').getAttribute('aria-pressed') === 'true', deckBackground: getComputedStyle(controller).backgroundImage, telemetryBackground: getComputedStyle(document.querySelector('.race-telemetry')).backgroundImage, traceVisible: !document.querySelector('.race-trace-controls')?.hidden, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, storageKeys: Object.keys(localStorage).sort() };
  });
  const label = `${width}x${height}-${style.toLowerCase()}-${collapsed ? 'collapsed' : 'expanded'}${options.fallback ? '-canvas' : ''}${options.reducedMotion ? '-reduce' : ''}`;
  await page.screenshot({ path: join(out, `${label}.png`) });
  reports.push({ label, url: url.toString(), ...state });
  await context.close();
}

const sizes = process.argv[5] === 'baseline' ? [[390, 844]] : process.argv[5] === 'fallback' ? [] : [[360, 780], [390, 844], [768, 1024], [1113, 988], [1440, 1000]];
for (const [width, height] of sizes) {
  for (const style of ['Classic', 'Analog']) for (const collapsed of [false, true]) await capture(width, height, style, collapsed);
}
if (process.argv[5] !== 'baseline') {
  await capture(390, 844, 'Classic', false, { fallback: true });
  if (process.argv[5] !== 'fallback') await capture(390, 844, 'Analog', false, { reducedMotion: true });
}
await browser.close();
const externalRequests = [...new Set(requests.filter(request => new URL(request).origin !== new URL(base).origin))];
const failed = reports.flatMap(row => {
  const problems = [];
  if (row.overflow !== 0) problems.push(`${row.label}: horizontal overflow ${row.overflow}`);
  if (!row.label.includes('-canvas') && (row.renderer !== 'rendering' || !row.car)) problems.push(`${row.label}: Race renderer unavailable`);
  if (row.label.includes('-canvas') && (row.raceCanvas || row.canvasDisplay !== 'block')) problems.push(`${row.label}: Canvas fallback unavailable`);
  if (row.canvas.height < row.stage.height * .95 || row.stage.height < 700) problems.push(`${row.label}: chase canvas does not fill tall stage`);
  if (row.label.includes('-expanded') && !row.deckBackground.includes('rgba(6, 20, 39, 0.16)')) problems.push(`${row.label}: floating controller transparency missing`);
  if (row.collapsed !== row.label.includes('-collapsed')) problems.push(`${row.label}: collapse state mismatch`);
  if (row.analog !== row.label.includes('-analog-')) problems.push(`${row.label}: control style mismatch`);
  if (!row.traceVisible) problems.push(`${row.label}: corner trace unavailable`);
  return problems;
});
const report = { revision, reports, errors, externalRequests, failed };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (errors.length || externalRequests.length || failed.length) process.exitCode = 1;
