import { createRequire } from 'node:module';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2], revision = process.argv[3], out = resolve(process.argv[4] || join(root, 'qa-artifacts', 'home-preview-refresh'));
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
if (!base || !revision || head.stdout.trim() !== revision) throw new Error('Pass exact-head localhost URL and matching HEAD.');
mkdirSync(out, { recursive: true });
const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ headless: true, executablePath });
const raw = [], checks = [], external = [], errors = [];
const origin = new URL(base).origin;
try {
  for (const [label, width, height] of [['phone', 390, 844], ['desktop', 1440, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'no-preference', recordVideo: { dir: out, size: { width, height } } });
    await context.addInitScript(() => { localStorage.setItem('impactlab.nick', 'Preview Player'); localStorage.setItem('impactlab.v1', '{}'); });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${label}: ${error}`));
    page.on('request', request => { if (new URL(request.url()).origin !== origin) external.push(`${label}: ${request.url()}`); });
    const url = new URL(base); url.searchParams.set('rev', revision); url.searchParams.set('walkthrough', label);
    const response = await page.goto(url.href, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error(`${label}: home returned ${response?.status()}`);
    await page.locator('#modeHome').waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    for (const lab of ['fight', 'race', 'kick']) {
      const card = page.locator(`#lab-tab-${lab}`), video = card.locator('video');
      if (label === 'phone') await card.scrollIntoViewIfNeeded();
      await page.waitForFunction(id => { const v = document.querySelector(`#lab-tab-${id} video`); return v && !v.paused && v.currentTime > 0 && v.readyState >= 2; }, lab, { timeout: 10000 });
      const before = await video.evaluate(v => ({ time: v.currentTime, duration: v.duration }));
      await page.waitForTimeout(label === 'phone' ? 1800 : 1500);
      const after = await video.evaluate(v => v.currentTime);
      const advance = (after - before.time + before.duration) % before.duration;
      if (advance <= 0.4) throw new Error(`${label} ${lab}: video did not advance`);
      checks.push({ label, lab, before: before.time, after, advance, previewState: await card.getAttribute('data-preview-state') });
    }
    if (label === 'desktop') await page.waitForTimeout(900);
    const video = page.video();
    await page.close(); await context.close();
    raw.push(await video.path());
  }
} finally { await browser.close(); }
if (external.length || errors.length) throw new Error(JSON.stringify({ external, errors }));
const mp4 = join(out, `kicklab-welcome-previews-${revision}.mp4`);
const filter = '[0:v]fps=30,scale=1280:900:force_original_aspect_ratio=decrease,pad=1280:900:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];[1:v]fps=30,scale=1280:900:force_original_aspect_ratio=decrease,pad=1280:900:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];[v0][v1]concat=n=2:v=1:a=0[v]';
const encode = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', raw[0], '-i', raw[1], '-filter_complex', filter, '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '25', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { encoding: 'utf8' });
if (encode.status !== 0) throw new Error(encode.stderr);
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height', '-of', 'json', mp4], { encoding: 'utf8' });
if (probe.status !== 0) throw new Error(probe.stderr);
const media = JSON.parse(probe.stdout);
if (statSync(mp4).size < 100_000 || Number(media.format?.duration) < 9 || media.streams?.[0]?.codec_name !== 'h264') throw new Error(`Invalid walkthrough ${JSON.stringify(media)}`);
writeFileSync(join(out, 'report.json'), JSON.stringify({ revision, base, mp4, media, checks, external, errors }, null, 2) + '\n');
console.log(JSON.stringify({ mp4, media, checks }, null, 2));
