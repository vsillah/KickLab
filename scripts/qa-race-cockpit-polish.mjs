import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://127.0.0.1:4410/kicklab.html';
const output = resolve(process.argv[3] || 'qa-artifacts/race-cockpit-polish/walkthrough');
const revision = process.argv[4] || 'working-tree';
mkdirSync(output, { recursive: true });
const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ headless: true, executablePath });
const report = { revision, base, videos: [], errors: [], externalRequests: [] };

for (const [label, width, height] of [['phone', 390, 844], ['desktop', 1440, 1000]]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true, recordVideo: { dir: output, size: { width, height } } });
  await context.addInitScript(() => {
    localStorage.setItem('impactlab.v1', JSON.stringify({ gfx: '3d', ch: { fight: 0, race: 0, kick: 0 }, play: { fight: 'ch', race: 'ch', kick: 'ch' } }));
    localStorage.setItem('impactlab.nick', 'QA Player');
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(`${label}: ${String(error)}`));
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(base).origin) report.externalRequests.push(request.url()); });
  const url = new URL(base); url.searchParams.set('raceCornerTrace', 'prototype'); url.searchParams.set('rev', revision);
  await page.goto(url.toString(), { waitUntil: 'networkidle' });
  if (await page.locator('#profileClose').isVisible()) await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();
  const orbit = page.locator('.race-orbit-panel button');
  await orbit.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await orbit.isVisible()) await orbit.click();
  await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 20000 });
  await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.status === 'rendering' && window.__KICKLAB_RACE_3D__?.dynamics?.state === 'run', null, { timeout: 25000 });
  await page.locator('.stage').scrollIntoViewIfNeeded();
  const collapse = page.locator('#controllerCollapseButton');
  if (await collapse.getAttribute('aria-expanded') === 'false') await collapse.click();
  const wheel = () => page.evaluate(() => window.__KICKLAB_RACE_3D__?.dynamics?.wheel);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(280);
  const keyboardWheel = await wheel(); await page.keyboard.up('ArrowRight');
  if (!(keyboardWheel > 3)) throw new Error(`${label}: keyboard steering did not turn right (${keyboardWheel})`);
  await page.keyboard.press('KeyC');
  const left = page.locator('#pad button[aria-label="Steer left"]');
  await left.dispatchEvent('pointerdown', { pointerId: 22, pointerType: 'mouse', button: 0 }); await page.waitForTimeout(280);
  const pointerWheel = await wheel(); await left.dispatchEvent('pointercancel', { pointerId: 22, pointerType: 'mouse', button: 0 });
  if (!(pointerWheel < -3)) throw new Error(`${label}: Classic pointer steering did not turn left (${pointerWheel})`);
  await page.keyboard.press('KeyC');
  const right = await page.locator('#pad button[aria-label="Steer right"]').boundingBox();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x + right.width / 2, y: right.y + right.height / 2, id: 1 }] }); await page.waitForTimeout(280);
  const touchWheel = await wheel(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (!(touchWheel > 3)) throw new Error(`${label}: Classic touch steering did not turn right (${touchWheel})`);
  await page.keyboard.press('KeyC');
  let canvasWheel = null;
  if (label === 'desktop') {
    const canvas = await page.locator('#cv').boundingBox();
    const x = canvas.x + 112 / 960 * canvas.width, y = canvas.y + 178 / 540 * canvas.height, radius = 35 / 960 * canvas.width;
    await page.mouse.move(x + radius, y); await page.mouse.down(); await page.mouse.move(x, y + radius, { steps: 8 }); await page.waitForTimeout(120);
    canvasWheel = await wheel(); await page.mouse.up();
    if (!(canvasWheel > 20)) throw new Error(`${label}: canvas wheel drag did not turn (${canvasWheel})`);
    await page.mouse.dblclick(x, y);
  }
  await page.waitForTimeout(1000);
  await page.locator('#analogControlsButton').click();
  await page.waitForTimeout(1200);
  await collapse.click();
  const collapsed = await page.evaluate(() => {
    const head = document.querySelector('.floating-control-head').getBoundingClientRect();
    const canvas = document.querySelector('#race3').getBoundingClientRect();
    const car = window.__KICKLAB_RACE_3D__.composition;
    const carBox = { left: canvas.left + (car.carCenter[0] - car.carWidth / 2) * canvas.width, right: canvas.left + (car.carCenter[0] + car.carWidth / 2) * canvas.width, top: canvas.top + (car.carCenter[1] - car.carHeight / 2) * canvas.height, bottom: canvas.top + (car.carCenter[1] + car.carHeight / 2) * canvas.height };
    return { head: head.toJSON(), carBox, overlap: head.left < carBox.right && head.right > carBox.left && head.top < carBox.bottom && head.bottom > carBox.top };
  });
  if (collapsed.overlap) throw new Error(`${label}: collapsed header covers the car ${JSON.stringify(collapsed)}`);
  await page.waitForTimeout(1200);
  await collapse.focus(); await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  await page.locator('#classicControlsButton').click();
  await page.waitForTimeout(700);
  const geometry = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
    return { header: rect('.floating-control-head'), car: window.__KICKLAB_RACE_3D__?.composition, renderer: window.__KICKLAB_RACE_3D__?.status, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  if (geometry.renderer !== 'rendering' || geometry.overflow > 0 || geometry.header.width > 155) throw new Error(`${label}: ${JSON.stringify(geometry)}`);
  const raw = page.video(); await page.close(); await context.close();
  const path = join(output, `race-cockpit-${label}.mp4`);
  const transcode = spawnSync('ffmpeg', ['-y', '-i', await raw.path(), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path], { encoding: 'utf8' });
  if (transcode.status !== 0) throw new Error(transcode.stderr);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height,codec_name', '-of', 'json', path], { encoding: 'utf8' });
  if (probe.status !== 0) throw new Error(probe.stderr);
  const media = JSON.parse(probe.stdout);
  if (statSync(path).size < 100_000 || Number(media.format?.duration) < 4 || media.streams?.[0]?.codec_name !== 'h264') throw new Error(`${label}: invalid MP4 ${JSON.stringify(media)}`);
  report.videos.push({ label, path, bytes: statSync(path).size, media, geometry, collapsed, steering: { keyboardWheel, pointerWheel, touchWheel, canvasWheel } });
}
await browser.close();
report.externalRequests = [...new Set(report.externalRequests)];
if (report.errors.length || report.externalRequests.length) throw new Error(JSON.stringify({ errors: report.errors, externalRequests: report.externalRequests }));
writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ videos: report.videos.map(video => ({ label: video.label, path: video.path, bytes: video.bytes, duration: video.media.format.duration, headerWidth: video.geometry.header.width })), errors: report.errors, externalRequests: report.externalRequests }));
