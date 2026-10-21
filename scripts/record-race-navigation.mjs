import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://127.0.0.1:5864/kicklab.html';
const out = resolve(process.argv[3] || 'qa-artifacts/race-navigation/walkthrough');
const head = process.env.KICKLAB_QA_HEAD || 'qa';
mkdirSync(out, { recursive: true });
const report = { head, views: [], errors: [], external: [], video: null };
const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ headless: true, executablePath });
const cockpitState = page => page.evaluate(() => ({ state: window.__KICKLAB_RACE_3D__?.dynamics?.state, orbit: window.__KICKLAB_RACE_3D__?.orbit?.phase, cockpitVisible: !!document.querySelector('#raceCockpit')?.getClientRects().length, navigationVisible: !!document.querySelector('#raceNavigation')?.getClientRects().length }));

async function record(label, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, recordVideo: { dir: out, size: { width, height } } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => report.errors.push(`${label}: ${error.message}`));
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(new URL(base).origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    report.external.push(url);
    route.abort();
  });
  const url = new URL(base);
  url.searchParams.set('raceCornerTrace', 'prototype');
  url.searchParams.set('rev', head);
  try {
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    if (await page.locator('#profileFormSave').isVisible()) await page.click('#profileFormSave');
    if (await page.locator('#profileClose').isVisible()) await page.click('#profileClose');
    await page.click('#lab-tab-race');
    await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 20000 });
    const initialToast = page.locator('.toast-close:visible').first();
    if (await initialToast.count()) await initialToast.evaluate(button => button.click());
    const orbit = page.locator('.race-orbit-panel button');
    await orbit.waitFor({ state: 'visible', timeout: 5000 });
    const orbitState = await cockpitState(page);
    if (orbitState.cockpitVisible || orbitState.navigationVisible) throw new Error('Cockpit appeared during the vehicle orbit');
    await page.screenshot({ path: join(out, `${label}-orbit.png`) });
    await orbit.click();
    await page.locator('#gamePacingOverlay').waitFor({ state: 'visible', timeout: 10000 });
    const countdownState = await cockpitState(page);
    if (countdownState.cockpitVisible || countdownState.navigationVisible) throw new Error('Cockpit appeared during the countdown');
    await page.screenshot({ path: join(out, `${label}-countdown.png`) });
    await page.keyboard.down('Space');
    await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 20000 });
    await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.dynamics?.state === 'run', null, { timeout: 25000 });
    await page.locator('#raceNavigation').waitFor({ state: 'visible', timeout: 5000 });
    const runState = await cockpitState(page);
    await page.keyboard.up('Space');
    if (width <= 480) await page.click('#controllerCollapseButton');
    const toast = page.locator('.toast-close:visible').first();
    if (await toast.count()) await toast.evaluate(button => button.click());
    await page.locator('.stage').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, `${label}-start.png`) });
    const start = await page.evaluate(() => window.__KICKLAB_RACE_NAVIGATION__);
    if (!start?.visible) throw new Error('Unified steering/navigation instrument is hidden');
    await page.keyboard.down('Space');
    await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.dynamics?.x >= 55, null, { timeout: 15000 });
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.dynamics?.x >= 75, null, { timeout: 10000 });
    await page.keyboard.up('Space');
    await page.keyboard.down('b');
    await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.dynamics?.v <= 15, null, { timeout: 7000 });
    await page.keyboard.up('b');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(430);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(out, `${label}-steering.png`) });
    const steering = await page.evaluate(() => window.__KICKLAB_RACE_NAVIGATION__);
    if (!steering?.visible || Math.abs(steering.current) < 10 || !Number.isFinite(steering.error)) throw new Error('Steering/navigation did not update');
    await page.click('#analogControlsButton');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, `${label}-analog.png`) });
    report.views.push({ label, url: url.toString(), orbitState, countdownState, runState, start, steering, raw: null });
  } catch (error) {
    report.errors.push(`${label}: ${error.stack || error}`);
  } finally {
    await context.close();
    report.views.find(view => view.label === label) && (report.views.find(view => view.label === label).raw = await page.video().path());
  }
}

try {
  await record('phone390', 390, 844);
  await record('mid942', 942, 958);
  await record('desktop1440', 1440, 900);
} finally {
  await browser.close();
}

if (report.views.length === 3 && !report.errors.length) {
  const video = join(out, 'race-navigation-phone-mid-desktop.mp4');
  const encode = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', report.views[0].raw, '-i', report.views[1].raw, '-i', report.views[2].raw, '-filter_complex', '[0:v]scale=414:900:flags=lanczos,setsar=1[phone];[1:v]scale=1200:900:force_original_aspect_ratio=decrease,pad=1200:900:(ow-iw)/2:(oh-ih)/2:color=0x071526,setsar=1[mid];[2:v]scale=1280:900:force_original_aspect_ratio=decrease,pad=1280:900:(ow-iw)/2:(oh-ih)/2:color=0x071526,setsar=1[desktop];[phone][mid][desktop]hstack=inputs=3:shortest=1[out]', '-map', '[out]', '-an', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video], { encoding: 'utf8' });
  if (encode.status !== 0) report.errors.push(`ffmpeg: ${encode.stderr}`);
  else {
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,width,height', '-of', 'json', video], { encoding: 'utf8' });
    if (probe.status !== 0) report.errors.push(`ffprobe: ${probe.stderr}`);
    else { report.video = video; report.probe = JSON.parse(probe.stdout); }
  }
}
if (report.external.length) report.errors.push(`External requests: ${report.external.join(', ')}`);
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ video: report.video, probe: report.probe, views: report.views.map(({ label, url, steering }) => ({ label, url, steering })), errors: report.errors }, null, 2));
if (report.errors.length) process.exitCode = 1;
