import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://127.0.0.1:5879/kicklab.html';
const out = resolve(process.argv[3] || 'qa-artifacts/race-phone-video');
const revision = process.argv[4] || 'working-tree';
mkdirSync(out, { recursive: true });
const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ headless: true, executablePath });
const errors = [], externalRequests = [], clips = [], states = [];

for (const [name, width, height] of [['phone', 390, 844], ['desktop', 1440, 1000]]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, recordVideo: { dir: out, size: { width, height } } });
  await context.addInitScript(() => {
    localStorage.setItem('impactlab.v1', JSON.stringify({ gfx: '3d', ch: { fight: 0, race: 0, kick: 0 }, play: { fight: 'ch', race: 'ch', kick: 'ch' } }));
    localStorage.setItem('impactlab.nick', 'QA Player');
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(base).origin) externalRequests.push(request.url()); });
  const url = new URL(base); url.searchParams.set('raceCornerTrace', 'prototype'); url.searchParams.set('rev', revision);
  await page.goto(url.toString(), { waitUntil: 'networkidle' });
  if (await page.locator('#profileClose').isVisible()) await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();
  await page.locator('.stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  if (await page.locator('.race-orbit-panel button').isVisible()) await page.locator('.race-orbit-panel button').click();
  await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 20000 });
  await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.status === 'rendering', null, { timeout: 20000 });
  await page.locator('.stage').scrollIntoViewIfNeeded();
  const collapse = page.locator('#controllerCollapseButton');
  async function show(style, collapsed) {
    await page.locator(style === 'Analog' ? '#analogControlsButton' : '#classicControlsButton').click();
    if ((await collapse.getAttribute('aria-expanded')) === String(collapsed)) await collapse.click();
    await page.waitForTimeout(1100);
    const state = { viewport: name, style, collapsed, expanded: await collapse.getAttribute('aria-expanded'), renderer: await page.evaluate(() => window.__KICKLAB_RACE_3D__?.status) };
    states.push(state);
    await page.screenshot({ path: join(out, `${name}-${style.toLowerCase()}-${collapsed ? 'collapsed' : 'expanded'}.png`) });
  }
  await show('Classic', false);
  await show('Classic', true);
  await show('Analog', false);
  await show('Analog', true);
  const recording = page.video();
  await context.close();
  clips.push(await recording.path());
}
await browser.close();

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command}: ${result.stderr.slice(-1600)}`);
  return result.stdout;
}
const phone = join(out, 'phone.mp4'), desktop = join(out, 'desktop.mp4'), mp4 = join(out, 'race-floating-controls-walkthrough.mp4');
run('ffmpeg', ['-y', '-i', clips[0], '-vf', 'fps=30,scale=462:1000:flags=lanczos,pad=1440:1000:(ow-iw)/2:0:color=#081423', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', phone]);
run('ffmpeg', ['-y', '-i', clips[1], '-vf', 'fps=30,scale=1440:1000:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', desktop]);
const list = join(out, 'concat.txt');
writeFileSync(list, `file '${phone}'\nfile '${desktop}'\n`);
run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', mp4]);
const video = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height,codec_name', '-of', 'json', mp4]));
const report = { revision, states, errors, externalRequests, video: { path: mp4, bytes: statSync(mp4).size, ...video } };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (errors.length || externalRequests.length || states.some(s => s.renderer !== 'rendering' || (s.expanded === 'true') === s.collapsed) || statSync(mp4).size < 100_000 || Number(video.format?.duration || 0) < 10 || video.streams?.[0]?.codec_name !== 'h264') process.exitCode = 1;
