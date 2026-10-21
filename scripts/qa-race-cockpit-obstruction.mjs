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
const allWidths = [[360, 780], [390, 844], [768, 1024], [942, 958], [1012, 760], [1113, 988], [1440, 900]];
const widths = process.env.KICKLAB_QA_WIDTHS ? allWidths.filter(([width]) => process.env.KICKLAB_QA_WIDTHS.split(',').map(Number).includes(width)) : allWidths;

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
    await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.dynamics?.state === 'run', null, { timeout: 25000 });
    const toast = page.locator('.toast-close:visible').first();
    if (await toast.count()) await toast.evaluate(button => button.click());
    await page.locator('#raceNavigation').waitFor({ state: 'visible' });
    await page.locator('.stage').scrollIntoViewIfNeeded();
    await page.locator('.stage').screenshot({ path: join(out, `${width}.png`) });
    const row = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      const stage = rect('.stage'), panel = rect('#raceNavigation'), wing = rect('.race-navigation-wing'), cockpit = rect('#raceCockpit'), overlay = rect('#raceWheelCanvas');
      const scale = document.querySelector('#cv').clientWidth / 960;
      const wheel = { x: stage.left + 112 * scale, y: stage.top + 178 * scale, radius: 60 * scale * (document.querySelector('#cv').clientWidth <= 480 ? 1.5 : 1) };
      const rightRail = rect('#gameGuidanceHud');
      const top = stage.top + stage.height * .12, bottom = stage.top + stage.height * .43;
      const left = wheel.x + wheel.radius, right = Math.min(stage.right, rightRail.left);
      const overlap = Math.max(0, Math.min(panel.right, right) - Math.max(panel.left, left)) * Math.max(0, Math.min(panel.bottom, bottom) - Math.max(panel.top, top));
      const nav = document.querySelector('#raceNavigation');
      const keyIds = ['raceNavigationGaugeTitle', 'raceNavigationGaugeValue', 'raceNavigationError', 'raceSteeringCurrent', 'raceSteeringNeeded'];
      const keyFit = keyIds.map(id => { const element = document.getElementById(id), box = element.getBoundingClientRect(); return { id, fits: element.scrollWidth <= element.clientWidth + 1 && box.left >= panel.left - 1 && box.right <= panel.right + 1 && box.top >= panel.top - 1 && box.bottom <= panel.bottom - 1 }; });
      const needed = rect('#raceSteeringNeeded'), cue = rect('#raceNavigationCue');
      const cueVisible = !!document.querySelector('#raceNavigationCue').getClientRects().length;
      const cueFit = !cueVisible || (document.querySelector('#raceNavigationCue').scrollWidth <= document.querySelector('#raceNavigationCue').clientWidth + 1 && cue.bottom <= panel.bottom + 1 && cue.top >= needed.bottom + 4);
      const style = getComputedStyle(nav), cutX = parseFloat(style.getPropertyValue('--race-wheel-x')), cutY = parseFloat(style.getPropertyValue('--race-wheel-y'));
      const holeRadius = parseFloat(style.getPropertyValue('--race-wheel-radius')), wingRight = parseFloat(style.getPropertyValue('--race-wing-right'));
      const contentHeight = parseFloat(style.getPropertyValue('--race-content-height'));
      const cutCenter = { x: panel.left + cutX, y: panel.top + cutY };
      const contentIds = ['raceNavigationGaugeTitle', 'raceNavigationGaugeValue', 'raceNavigationError', 'raceNavigationMap', 'raceSteeringCurrent', 'raceSteeringNeeded', 'raceNavigationStatus', 'raceNavigationCue'];
      const contentClearance = contentIds.filter(id => !!document.getElementById(id).getClientRects().length).map(id => {
        const box = rect(`#${id}`), dx = Math.max(box.left - wheel.x, 0, wheel.x - box.right), dy = Math.max(box.top - wheel.y, 0, wheel.y - box.bottom);
        return { id, px: Math.hypot(dx, dy) - wheel.radius };
      });
      let visibleArea = 0, upperChaseVisible = 0, roadCoreVisible = 0;
      for (let y = 2; y < panel.height; y += 4) for (let x = 2; x < panel.width; x += 4) {
        const limit = y < contentHeight - 5 ? panel.width : y < contentHeight ? panel.width + (wingRight - panel.width) * (y - contentHeight + 5) / 5 : wingRight;
        if (x > limit || Math.hypot(x - cutX, y - cutY) < holeRadius) continue;
        const px = panel.left + x, py = panel.top + y;
        visibleArea += 16;
        if (px >= left && px <= right && py >= top && py <= bottom) upperChaseVisible += 16;
        if (px >= stage.left + stage.width * .42 && px <= stage.left + stage.width * .58 && py >= stage.top + stage.height * .3 && py <= stage.top + stage.height * .55) roadCoreVisible += 16;
      }
      return {
        width: innerWidth, stage: { x: stage.x, y: stage.y, width: stage.width, height: stage.height },
        panel: { x: panel.x, y: panel.y, width: panel.width, height: panel.height, right: panel.right, bottom: panel.bottom },
        wing: { x: wing.x, y: wing.y, width: wing.width, height: wing.height }, wheel, rightRailLeft: rightRail.left,
        anchorErrorPx: Math.hypot(cockpit.left - wheel.x, cockpit.top - wheel.y), cutoutErrorPx: Math.hypot(cutCenter.x - wheel.x, cutCenter.y - wheel.y), wheelCanvasAligned: Math.abs(overlay.left - stage.left) <= 1 && Math.abs(overlay.top - stage.top) <= 1 && Math.abs(overlay.width - document.querySelector('#cv').clientWidth) <= 1,
        holeClearancePx: holeRadius - wheel.radius, contentClearance, wingRight: panel.left + wingRight, speedCardLeft: stage.left + 210 * scale,
        rightExtensionPx: Math.max(0, panel.right - left), panelAreaPx2: panel.width * panel.height,
        upperChaseIntrusionPx2: overlap, visibleAreaPx2: visibleArea, upperChaseVisiblePx2: upperChaseVisible, roadCoreVisiblePx2: roadCoreVisible,
        visibleReadouts: [...document.querySelectorAll('[data-race-live-readout]')].filter(element => !!element.getClientRects().length).length,
        keyFit, cueFit, cueVisible, neededBottom: needed.bottom, cueTop: cue.top, cueBottom: cue.bottom,
        background: getComputedStyle(nav, '::before').backgroundImage,
        backdropFilter: getComputedStyle(document.querySelector('.race-navigation-wing')).backdropFilter,
        maskImage: getComputedStyle(nav, '::before').maskImage,
      };
    });
    report.rows.push(row);
    if (baseline) {
      const old = baseline.rows.find(item => item.width === width);
      if (!old && width !== 942) throw new Error(`Missing baseline ${width}`);
      const reduction = old ? { rightExtension: +(1 - row.rightExtensionPx / old.rightExtensionPx).toFixed(3) } : null;
      const alphas = [...row.background.matchAll(/rgba\([^)]*,\s*([0-9.]+)\)/g)].map(match => Number(match[1]));
      const horizontalPass = !old || width === 1012 ? !old || row.rightExtensionPx <= old.rightExtensionPx + 1 : reduction.rightExtension >= .2;
      const shapePass = row.anchorErrorPx <= 1 && row.cutoutErrorPx <= 1 && row.wheelCanvasAligned && row.holeClearancePx >= 6 && row.contentClearance.every(item => item.px >= 3) && row.maskImage.includes('radial-gradient') && row.visibleAreaPx2 <= row.stage.width * row.stage.height * .09 && row.upperChaseVisiblePx2 <= row.stage.width * row.stage.height * .022 && row.roadCoreVisiblePx2 === 0 && (width <= 480 || row.wingRight <= row.speedCardLeft - 3);
      const pass = horizontalPass && shapePass && row.panel.right <= row.rightRailLeft - 4 && row.visibleReadouts === 1 && row.keyFit.every(item => item.fits) && row.cueFit && alphas.length >= 3 && Math.max(...alphas) <= .7 && row.backdropFilter === 'none';
      report.comparisons.push({ width, before: old ? { rightExtensionPx: old.rightExtensionPx } : null, after: { rightExtensionPx: row.rightExtensionPx, visibleAreaPx2: row.visibleAreaPx2, upperChaseVisiblePx2: row.upperChaseVisiblePx2, roadCoreVisiblePx2: row.roadCoreVisiblePx2 }, reduction, horizontalPass, shapePass, pass, keyFit: row.keyFit, cueFit: row.cueFit, contentClearance: row.contentClearance, anchorErrorPx: row.anchorErrorPx, cutoutErrorPx: row.cutoutErrorPx, holeClearancePx: row.holeClearancePx, speedCardClearancePx: row.speedCardLeft - row.wingRight, backgroundAlphas: alphas });
      report.checks.push({ width, pass });
    } else {
      report.checks.push({ width, pass: row.keyFit.every(item => item.fits) && row.cueFit });
    }
  } catch (error) { report.errors.push(`${width}: ${error.stack || error}`); }
  await context.close();
}
await browser.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ head, rows: report.rows.map(({ width, rightExtensionPx, panelAreaPx2, upperChaseIntrusionPx2 }) => ({ width, rightExtensionPx, panelAreaPx2, upperChaseIntrusionPx2 })), comparisons: report.comparisons, errors: report.errors, external: report.external }, null, 2));
if (report.errors.length || report.external.length || report.checks.some(item => !item.pass)) process.exitCode = 1;
