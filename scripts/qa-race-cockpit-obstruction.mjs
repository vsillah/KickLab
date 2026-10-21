import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://127.0.0.1:5864/kicklab.html';
const out = resolve(process.argv[3] || 'qa-artifacts/race-navigation/geometry');
const baseline = process.argv[4] ? JSON.parse(readFileSync(process.argv[4], 'utf8')) : null;
const head = process.env.KICKLAB_QA_HEAD || 'qa';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path)) });
const report = { base, head, rows: [], errors: [], external: [], comparisons: [], checks: [] };
const widths = [[360, 780], [390, 844], [768, 1024], [1113, 988], [1440, 900]];

for (const [width, height] of widths) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(`${width}: ${error.message}`));
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(new URL(base).origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    report.external.push(`${width}: ${url}`);
    route.abort();
  });
  try {
    const url = new URL(base);
    url.searchParams.set('raceCornerTrace', 'prototype');
    url.searchParams.set('rev', head);
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    if (await page.locator('#profileFormSave').isVisible()) await page.click('#profileFormSave');
    if (await page.locator('#profileClose').isVisible()) await page.click('#profileClose');
    await page.click('#lab-tab-race');
    await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 20000 });
    const orbit = page.locator('.race-orbit-panel button');
    if (await orbit.isVisible()) await orbit.click();
    await page.locator('#raceNavigation').waitFor({ state: 'visible' });
    await page.locator('.stage').scrollIntoViewIfNeeded();
    await page.locator('.stage').screenshot({ path: join(out, `${width}.png`) });
    const row = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      const stage = rect('.stage'), panel = rect('#raceNavigation'), wing = rect('.race-navigation-wing');
      const scale = document.querySelector('#cv').clientWidth / 960;
      const wheel = { x: stage.left + 112 * scale, y: stage.top + 178 * scale, radius: 60 * scale * (document.querySelector('#cv').clientWidth <= 480 ? 1.5 : 1) };
      const rightRail = rect('#gameGuidanceHud');
      const top = stage.top + stage.height * .12, bottom = stage.top + stage.height * .43;
      const left = wheel.x + wheel.radius, right = Math.min(stage.right, rightRail.left);
      const overlap = Math.max(0, Math.min(panel.right, right) - Math.max(panel.left, left)) * Math.max(0, Math.min(panel.bottom, bottom) - Math.max(panel.top, top));
      const nav = document.querySelector('#raceNavigation');
      const keyIds = ['raceNavigationGaugeTitle', 'raceNavigationGaugeValue', 'raceNavigationError', 'raceSteeringCurrent', 'raceSteeringNeeded'];
      const keyFit = keyIds.map(id => { const element = document.getElementById(id), box = element.getBoundingClientRect(); return { id, fits: element.scrollWidth <= element.clientWidth + 1 && box.left >= panel.left - 1 && box.right <= panel.right + 1 }; });
      return {
        width: innerWidth, stage: { x: stage.x, y: stage.y, width: stage.width, height: stage.height },
        panel: { x: panel.x, y: panel.y, width: panel.width, height: panel.height, right: panel.right, bottom: panel.bottom },
        wing: { x: wing.x, y: wing.y, width: wing.width, height: wing.height }, wheel, rightRailLeft: rightRail.left,
        rightExtensionPx: Math.max(0, panel.right - left), panelAreaPx2: panel.width * panel.height,
        upperChaseIntrusionPx2: overlap,
        visibleReadouts: [...document.querySelectorAll('[data-race-live-readout]')].filter(element => !!element.getClientRects().length).length,
        keyFit,
        background: getComputedStyle(nav, '::before').backgroundImage,
        backdropFilter: getComputedStyle(document.querySelector('.race-navigation-wing')).backdropFilter,
      };
    });
    report.rows.push(row);
    if (baseline) {
      const old = baseline.rows.find(item => item.width === width);
      if (!old) throw new Error(`Missing baseline ${width}`);
      const reduction = { rightExtension: +(1 - row.rightExtensionPx / old.rightExtensionPx).toFixed(3), panelArea: +(1 - row.panelAreaPx2 / old.panelAreaPx2).toFixed(3), upperChaseIntrusion: +(1 - row.upperChaseIntrusionPx2 / old.upperChaseIntrusionPx2).toFixed(3) };
      const alphas = [...row.background.matchAll(/rgba\([^)]*,\s*([0-9.]+)\)/g)].map(match => Number(match[1]));
      const pass = reduction.rightExtension >= .2 && reduction.panelArea >= .2 && reduction.upperChaseIntrusion >= .7 && row.panel.right <= row.rightRailLeft - 4 && row.visibleReadouts === 1 && row.keyFit.every(item => item.fits) && alphas.length >= 3 && Math.max(...alphas) <= .7 && row.backdropFilter === 'none';
      report.comparisons.push({ width, before: { rightExtensionPx: old.rightExtensionPx, panelAreaPx2: old.panelAreaPx2, upperChaseIntrusionPx2: old.upperChaseIntrusionPx2 }, after: { rightExtensionPx: row.rightExtensionPx, panelAreaPx2: row.panelAreaPx2, upperChaseIntrusionPx2: row.upperChaseIntrusionPx2 }, reduction, pass, keyFit: row.keyFit, backgroundAlphas: alphas });
      report.checks.push({ width, pass });
    }
  } catch (error) { report.errors.push(`${width}: ${error.stack || error}`); }
  await context.close();
}
await browser.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ head, rows: report.rows.map(({ width, rightExtensionPx, panelAreaPx2, upperChaseIntrusionPx2 }) => ({ width, rightExtensionPx, panelAreaPx2, upperChaseIntrusionPx2 })), comparisons: report.comparisons, errors: report.errors, external: report.external }, null, 2));
if (report.errors.length || report.external.length || report.checks.some(item => !item.pass)) process.exitCode = 1;
