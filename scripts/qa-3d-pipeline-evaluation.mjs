import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4176/evaluation/3d-pipeline/harness/';
const outputDir = resolve(process.argv[3] || 'evaluation/3d-pipeline/evidence');
const revision = process.argv[4] || 'working-tree';
const videoDir = join(outputDir, '.video-source');
rmSync(videoDir, { force: true, recursive: true });
mkdirSync(videoDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
if (!executablePath) throw new Error('No local Chromium executable found.');
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } },
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
const errors = [];
const requests = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('request', request => requests.push(request.url()));

const url = `${baseUrl}?rev=${encodeURIComponent(revision)}&clip=kick`;
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__KICKLAB_3D_EVAL__?.ready === true, null, { timeout: 12_000 });
await page.waitForTimeout(1700);

const take = name => page.screenshot({ path: join(outputDir, name), fullPage: true });
await take('desktop-1440-full.png');
await page.getByRole('button', { name: 'Play kick' }).click();
await page.waitForTimeout(900);
await page.getByRole('button', { name: 'Anatomy off' }).click();
await page.waitForTimeout(900);
await take('desktop-1440-anatomy.png');
await page.getByRole('button', { name: 'Reduced off' }).click();
await page.waitForTimeout(750);
await take('desktop-1440-reduced.png');
await page.getByRole('button', { name: '2D fallback off' }).click();
await page.waitForTimeout(750);
await take('desktop-1440-fallback.png');
await page.getByRole('button', { name: '2D fallback on' }).click();
await page.getByRole('button', { name: 'Reduced on' }).click();
await page.getByRole('button', { name: 'Anatomy on' }).click();
await page.waitForTimeout(500);

const responsive = [];
for (const [width, height] of [[768, 1024], [390, 844]]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
  if (state.documentWidth > width || state.bodyWidth > width) throw new Error(`${width}px viewport has horizontal overflow`);
  responsive.push(state);
  await take(`${width}x${height}-full.png`);
}
await page.setViewportSize({ width: 1440, height: 1000 });
await page.waitForTimeout(600);
const metrics = await page.evaluate(() => ({ ...window.__KICKLAB_3D_EVAL__, frameSamples: undefined }));
if (metrics.contactDriftMeters > 0.001) throw new Error(`Contact drift ${metrics.contactDriftMeters}m exceeds 1mm`);
if (!metrics.animations?.includes('Idle') || !metrics.animations?.includes('KickContact')) throw new Error('Expected Idle and KickContact clips');
if (metrics.remoteRequests !== 0) throw new Error(`Harness observed ${metrics.remoteRequests} remote requests`);
if (metrics.lodLevels !== 2 || metrics.crowdInstances !== 480) throw new Error('LOD or instanced crowd invariant failed');
const offOrigin = requests.filter(value => new URL(value).origin !== new URL(baseUrl).origin);
if (offOrigin.length) throw new Error(`Browser observed off-origin requests: ${offOrigin.join(', ')}`);

await context.close();
await browser.close();
const webm = readdirSync(videoDir).find(file => file.endsWith('.webm'));
if (!webm) throw new Error('Playwright did not emit a source video');
const sourceVideo = join(videoDir, webm);
const finalVideo = join(outputDir, 'kicklab-3d-pipeline-walkthrough.mp4');
const ffmpeg = spawnSync('ffmpeg', ['-y', '-i', sourceVideo, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', finalVideo], { encoding: 'utf8' });
if (ffmpeg.status !== 0) throw new Error(`ffmpeg failed: ${ffmpeg.stderr}`);
rmSync(videoDir, { force: true, recursive: true });
const report = {
  capturedAt: new Date().toISOString(),
  revision,
  url,
  errors,
  responsive,
  requestCount: requests.length,
  offOriginRequests: offOrigin,
  metrics,
  video: { file: 'kicklab-3d-pipeline-walkthrough.mp4', bytes: statSync(finalVideo).size },
};
writeFileSync(join(outputDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
console.log(JSON.stringify(report, null, 2));
