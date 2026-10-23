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
    const header = rect('.floating-control-head'), guidanceRail = rect('#gameGuidanceHud');
    const audit = window.__KICKLAB_RACE_3D__;
    const car = audit?.composition?.carCenter;
    const carPoint = car ? { x: canvas.x + car[0] * canvas.width, y: canvas.y + car[1] * canvas.height } : null;
    const composition = audit?.composition;
    const projectedCarBox = composition ? { left: canvas.left + (composition.carCenter[0] - composition.carWidth / 2) * canvas.width, right: canvas.left + (composition.carCenter[0] + composition.carWidth / 2) * canvas.width, top: canvas.top + (composition.carCenter[1] - composition.carHeight / 2) * canvas.height, bottom: canvas.top + (composition.carCenter[1] + composition.carHeight / 2) * canvas.height } : null;
    const controller = document.querySelector('.control-deck');
    return { stage, deck, canvas, header, guidanceRail, carPoint, projectedCarBox, car: composition, renderer: audit?.status, raceCanvas: !!document.querySelector('#race3'), canvasDisplay: getComputedStyle(document.querySelector('#cv')).display, collapsed: document.querySelector('#controllerCollapseButton').getAttribute('aria-expanded') === 'false', analog: document.querySelector('#analogControlsButton').getAttribute('aria-pressed') === 'true', deckBackground: getComputedStyle(controller).backgroundImage, telemetryBackground: getComputedStyle(document.querySelector('.race-telemetry')).backgroundImage, traceVisible: !document.querySelector('.race-trace-controls')?.hidden, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, viewport: { width: innerWidth, height: innerHeight }, storageKeys: Object.keys(localStorage).sort() };
  });
  const label = `${width}x${height}-${style.toLowerCase()}-${collapsed ? 'collapsed' : 'expanded'}${options.fallback ? '-canvas' : ''}${options.reducedMotion ? '-reduce' : ''}`;
  const screenshot = await page.screenshot({ path: join(out, `${label}.png`) });
  if (!options.fallback && state.carPoint) {
    // The fixture uses the blue Cobalt. Segment its visible body near the projected
    // center, then pad for the dark bumper/spoiler before checking header clearance.
    const visible = await page.evaluate(async ({ encoded, carPoint, canvas }) => {
      const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
      const bitmap = document.createElement('canvas'); bitmap.width = image.width; bitmap.height = image.height;
      const context = bitmap.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, image.height).data, width = image.width;
      const radius = Math.max(85, canvas.width * .22), left = Math.max(0, Math.floor(carPoint.x - radius)), right = Math.min(width, Math.ceil(carPoint.x + radius));
      const top = Math.max(0, Math.floor(carPoint.y - radius)), bottom = Math.min(image.height, Math.ceil(carPoint.y + radius));
      const mask = new Uint8Array(width * image.height);
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const index = (y * width + x) * 4, red = pixels[index], green = pixels[index + 1], blue = pixels[index + 2];
        if (blue > 75 && blue > red * 1.35 && blue > green * 1.08 && blue - red > 35) mask[y * width + x] = 1;
      }
      const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }; let carPixels = 0;
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const start = y * width + x; if (!mask[start]) continue;
        const queue = [start], component = { left: x, right: x, top: y, bottom: y }; mask[start] = 0;
        for (let cursor = 0; cursor < queue.length; cursor++) {
          const index = queue[cursor], px = index % width, py = Math.floor(index / width);
          component.left = Math.min(component.left, px); component.right = Math.max(component.right, px);
          component.top = Math.min(component.top, py); component.bottom = Math.max(component.bottom, py);
          for (const next of [index - 1, index + 1, index - width, index + width]) if (next >= 0 && next < mask.length && mask[next]) { mask[next] = 0; queue.push(next); }
        }
        const centerX = (component.left + component.right) / 2, centerY = (component.top + component.bottom) / 2;
        if (queue.length < 30 || Math.hypot(centerX - carPoint.x, centerY - carPoint.y) > radius) continue;
        carPixels += queue.length;
        bounds.left = Math.min(bounds.left, component.left); bounds.right = Math.max(bounds.right, component.right);
        bounds.top = Math.min(bounds.top, component.top); bounds.bottom = Math.max(bounds.bottom, component.bottom);
      }
      if (!carPixels) return { box: null, pixels: 0 };
      const pad = Math.max(20, Math.round(canvas.width * .04));
      return { box: { left: bounds.left - pad, right: bounds.right + pad, top: bounds.top - pad, bottom: bounds.bottom + pad }, pixels: carPixels };
    }, { encoded: screenshot.toString('base64'), carPoint: state.carPoint, canvas: state.canvas });
    state.carBox = visible.box; state.carPixels = visible.pixels;
  }
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
  const margin = 16;
  const touchesWithMargin = (a, b) => a.left < b.right + margin && a.right > b.left - margin && a.top < b.bottom + margin && a.bottom > b.top - margin;
  if (row.overflow !== 0) problems.push(`${row.label}: horizontal overflow ${row.overflow}`);
  if (!row.label.includes('-canvas') && (row.renderer !== 'rendering' || !row.car)) problems.push(`${row.label}: Race renderer unavailable`);
  if (!row.label.includes('-canvas') && (!row.carBox || row.carPixels < 100)) problems.push(`${row.label}: visible car pixels unavailable`);
  if (row.label.includes('-canvas') && (row.raceCanvas || row.canvasDisplay !== 'block')) problems.push(`${row.label}: Canvas fallback unavailable`);
  if (row.canvas.height < row.stage.height * .95 || row.stage.height < 700) problems.push(`${row.label}: chase canvas does not fill tall stage`);
  if (row.label.includes('-expanded') && !row.deckBackground.includes('rgba(6, 20, 39, 0.16)')) problems.push(`${row.label}: floating controller transparency missing`);
  if (row.collapsed !== row.label.includes('-collapsed')) problems.push(`${row.label}: collapse state mismatch`);
  if (row.analog !== row.label.includes('-analog-')) problems.push(`${row.label}: control style mismatch`);
  if (!row.traceVisible) problems.push(`${row.label}: corner trace unavailable`);
  if (row.collapsed && row.carBox) {
    if (touchesWithMargin(row.header, row.carBox)) problems.push(`${row.label}: header lacks ${margin}px car clearance`);
    if (touchesWithMargin(row.header, row.guidanceRail)) problems.push(`${row.label}: header lacks ${margin}px guidance rail clearance`);
    if (row.header.left < 8 || row.header.right > row.viewport.width - 8 || row.header.top < 8 || row.header.bottom > row.viewport.height - 8) problems.push(`${row.label}: header touches viewport edge`);
  }
  return problems;
});
const report = { revision, reports, errors, externalRequests, failed };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (errors.length || externalRequests.length || failed.length) process.exitCode = 1;
