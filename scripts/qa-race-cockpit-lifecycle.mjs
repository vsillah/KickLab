import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://127.0.0.1:5864/kicklab.html';
const out = resolve(process.argv[3] || 'qa-artifacts/race-navigation/lifecycle');
const head = process.env.KICKLAB_QA_HEAD || 'qa';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path)) });
const report = { head, cases: [], errors: [], external: [] };

async function snapshot(page, label, expected, state, screenshot = true) {
  const actual = await page.evaluate(() => ({
    state: window.__KICKLAB_RACE_3D__?.dynamics?.state,
    orbit: window.__KICKLAB_RACE_3D__?.orbit?.phase,
    cockpit: !!document.querySelector('#raceCockpit')?.getClientRects().length,
    navigation: !!document.querySelector('#raceNavigation')?.getClientRects().length,
    dashboardAudit: window.__KICKLAB_RACE_NAVIGATION__?.visible === true,
    pacing: !document.querySelector('#gamePacingOverlay').hidden,
  }));
  if (actual.cockpit !== expected || actual.navigation !== expected || (state && actual.state !== state)) throw new Error(`${label}: expected cockpit ${expected} and state ${state}; got ${JSON.stringify(actual)}`);
  if (screenshot) await page.locator('.stage').screenshot({ path: join(out, `${label}.png`) });
  report.cases.push({ label, ...actual });
}

async function enterRace(page) {
  await page.click('#lab-tab-race');
  await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 20000 });
  await page.locator('.race-orbit-panel button').waitFor({ state: 'visible', timeout: 8000 });
}

async function runCase(name, reduced) {
  const context = await browser.newContext({ viewport: { width: reduced ? 390 : 942, height: reduced ? 844 : 958 }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(new URL(base).origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    report.external.push(`${name}: ${url}`); route.abort();
  });
  try {
    const url = new URL(base); url.searchParams.set('raceCornerTrace', 'prototype'); url.searchParams.set('rev', head);
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    if (await page.locator('#profileFormSave').isVisible()) await page.click('#profileFormSave');
    if (await page.locator('#profileClose').isVisible()) await page.click('#profileClose');
    await enterRace(page);
    const toast = page.locator('.toast-close:visible').first();
    if (await toast.count()) await toast.evaluate(button => button.click());
    await snapshot(page, `${name}-orbit`, false, 'grid');
    await page.click('.race-orbit-panel button');
    await page.locator('#gamePacingOverlay').waitFor({ state: 'visible', timeout: 10000 });
    await snapshot(page, `${name}-countdown`, false, 'grid');
    await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 20000 });
    await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.dynamics?.state === 'run' && !!document.querySelector('#raceCockpit')?.getClientRects().length, null, { timeout: 10000 });
    await snapshot(page, `${name}-go`, true, 'run');
    await page.keyboard.press('p');
    await page.locator('#gamePacingOverlay').waitFor({ state: 'visible', timeout: 5000 });
    await snapshot(page, `${name}-paused`, true, 'run', false);
    await page.keyboard.press('p');
    await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 5000 });
    await snapshot(page, `${name}-resumed`, true, 'run', false);
    if (!reduced) {
      await page.click('#orientationDetailToggle');
      await page.click('#modeHomeButton');
      await enterRace(page);
      await snapshot(page, `${name}-restart-orbit`, false, 'grid');
      await page.click('#reviewDetailToggle');
      if (!(await page.locator('#mlReplay').isEnabled())) throw new Error('Recorded Race run did not expose replay after restart');
      await page.click('#mlReplay');
      await page.locator('#rbar').waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.dynamics?.state === 'run', null, { timeout: 5000 });
      await snapshot(page, `${name}-replay`, false, 'run', false);
    }
  } catch (error) { report.errors.push(`${name}: ${error.stack || error}`); }
  await context.close();
}

try { await runCase('mid942', false); await runCase('phone390-reduced', true); } finally { await browser.close(); }
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ head, cases: report.cases, errors: report.errors, external: report.external }, null, 2));
if (report.errors.length || report.external.length) process.exitCode = 1;
