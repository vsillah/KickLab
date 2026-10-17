import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4217/dist/kicklab.html';
const outputDir = resolve(process.argv[3] || 'qa-artifacts/player-profiles');
const revision = process.argv[4] || 'working-tree';
const videoDir = join(outputDir, 'video-source');
mkdirSync(videoDir, { recursive: true });
const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path));
if (!executablePath) throw new Error('No local Chrome or Chromium executable found.');
const browser = await chromium.launch({ headless: true, executablePath });
const checks = [];
const errors = [];
const externalRequests = [];
const url = label => `${baseUrl}?qa=player-profiles&rev=${encodeURIComponent(revision)}&view=${label}`;

async function protect(context) {
  await context.route('**/*', async route => {
    const request = route.request();
    if (request.url().startsWith(new URL(baseUrl).origin)) return route.continue();
    externalRequests.push({ method: request.method(), url: request.url() });
    return route.abort();
  });
}

function listen(page) {
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('ERR_FAILED')) errors.push(message.text()); });
}

async function seedProfiles(page) {
  await page.addInitScript(() => {
    const now = 1792234800000;
    const profiles = [
      { id: 'nova', nickname: 'Nova Comet', avatar: 'tower', color: 'mint', needsSetup: false, createdAt: now - 2000, updatedAt: now, progress: { xp: 880, punch: 3420, lap: 12.48, goals: 14, mWins: 3, badges: { f_3k: now - 5000, k_goal: now - 3000 }, ch: { fight: 2, race: 1, kick: 3 }, style: { fight: 'gold', race: 'pink', kick: 'gold' }, stats: { plays: { fight: 8, race: 4, kick: 11 }, wins: { fight: 5, race: 3, kick: 7 } } } },
      { id: 'pixel', nickname: 'Pixel Striker', avatar: 'trick', color: 'coral', needsSetup: false, createdAt: now - 1000, updatedAt: now - 1000, progress: { xp: 240, punch: 2200, goals: 3, badges: {}, ch: { fight: 0, race: 0, kick: 1 }, stats: { plays: { fight: 2, race: 0, kick: 3 }, wins: { fight: 1, race: 0, kick: 1 } } } }
    ];
    localStorage.setItem('kicklab.profiles.v1', JSON.stringify({ version: 1, activeId: 'nova', legacyProfileId: 'nova', profiles }));
    localStorage.setItem('impactlab.v1', JSON.stringify(profiles[0].progress));
    localStorage.setItem('impactlab.nick', profiles[0].nickname);
  });
}

async function assertNoOverflow(page, label) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  if (sizes.scrollWidth > sizes.clientWidth + 1) throw new Error(`${label}: horizontal overflow ${sizes.scrollWidth}px > ${sizes.clientWidth}px`);
  checks.push({ label, kind: 'overflow', ...sizes });
}

async function assertLegacyMigration() {
  const context = await browser.newContext({ viewport: { width: 900, height: 800 } });
  await protect(context);
  const page = await context.newPage();
  listen(page);
  await page.addInitScript(() => {
    localStorage.setItem('impactlab.v1', JSON.stringify({ xp: 725, punch: 3015, badges: { f_3k: 10 } }));
    localStorage.setItem('impactlab.nick', 'Legacy Lynx');
  });
  await page.goto(url('legacy-migration'), { waitUntil: 'domcontentloaded' });
  const state = await page.evaluate(() => ({ envelope: JSON.parse(localStorage.getItem('kicklab.profiles.v1')), progress: JSON.parse(localStorage.getItem('impactlab.v1')), nick: localStorage.getItem('impactlab.nick') }));
  const active = state.envelope.profiles.find(profile => profile.id === state.envelope.activeId);
  if (active.nickname !== 'Legacy Lynx' || active.progress.xp !== 725 || state.progress.xp !== 725 || state.nick !== 'Legacy Lynx') throw new Error(`Legacy migration mismatch: ${JSON.stringify(state)}`);
  checks.push({ label: 'legacy-migration', kind: 'storage', nickname: active.nickname, xp: active.progress.xp, originalKeysPreserved: true });
  await context.close();
}

await assertLegacyMigration();

for (const [label, width, height] of [['desktop-1440x1000', 1440, 1000], ['tablet-820x1180', 820, 1180], ['mobile-390x844', 390, 844]]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await protect(context);
  const page = await context.newPage();
  await seedProfiles(page);
  listen(page);
  await page.goto(url(label), { waitUntil: 'domcontentloaded' });
  await page.locator('#homeProfileButton').click();
  await page.screenshot({ path: join(outputDir, `${label}-profile.png`), fullPage: false });
  await assertNoOverflow(page, `${label}-profile`);
  await page.getByRole('button', { name: 'View boards', exact: true }).click();
  await page.getByRole('button', { name: 'Total XP', exact: true }).click();
  const rows = await page.locator('#fbList li').allInnerTexts();
  if (!rows[0]?.includes('Nova Comet') || !rows[1]?.includes('Pixel Striker')) throw new Error(`${label}: local XP ordering failed (${JSON.stringify(rows)})`);
  await page.screenshot({ path: join(outputDir, `${label}-leaderboard.png`), fullPage: false });
  await assertNoOverflow(page, `${label}-leaderboard`);
  checks.push({ label, kind: 'responsive', width, height, rows: rows.map(text => text.replace(/\s+/g, ' ').trim()) });
  await context.close();
}

const videoContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', recordVideo: { dir: videoDir, size: { width: 1280, height: 900 } } });
await protect(videoContext);
const page = await videoContext.newPage();
listen(page);
await page.goto(url('walkthrough'), { waitUntil: 'domcontentloaded' });
if (!(await page.locator('#profileForm').isVisible())) throw new Error('First-run setup did not open.');
await page.waitForTimeout(700);
await page.getByLabel('Made-up nickname', { exact: true }).fill('Nova Comet');
await page.getByRole('button', { name: 'Guardian', exact: true }).click();
await page.getByRole('button', { name: 'mint color', exact: true }).click();
await page.getByRole('button', { name: 'Save player', exact: true }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Close profiles', exact: true }).click();
await page.getByRole('button', { name: /Enter Fight/ }).click();
await page.getByRole('button', { name: /Open Mode settings/ }).click();
await page.getByRole('button', { name: /Free lab/ }).click();
await page.getByRole('button', { name: 'Close settings', exact: true }).click();
let earnedXp = 0;
for (let attempt = 0; attempt < 3 && !earnedXp; attempt += 1) {
  await page.getByRole('button', { name: /^Cross/ }).click();
  await page.waitForTimeout(4400);
  earnedXp = Number((await page.locator('#xpTxt').innerText()).split(' ')[0].replace(/,/g, ''));
}
if (!(earnedXp > 0)) throw new Error(`Walkthrough did not earn XP (${earnedXp}).`);
await page.getByRole('button', { name: 'Labs', exact: true }).click();
await page.locator('#homeProfileButton').click();
await page.getByRole('button', { name: 'New player', exact: true }).click();
await page.getByLabel('Made-up nickname', { exact: true }).fill('Pixel Striker');
await page.getByRole('button', { name: 'Trickster', exact: true }).click();
await page.getByRole('button', { name: 'coral color', exact: true }).click();
await page.getByRole('button', { name: 'Create player', exact: true }).click();
const secondXp = await page.locator('#profileSummary .profile-stat').filter({ hasText: 'Level' }).innerText();
if (!secondXp.includes('0 XP')) throw new Error(`Second profile inherited progress: ${secondXp}`);
await page.waitForTimeout(700);
await page.getByRole('button', { name: /^Nova Comet/ }).click();
const firstXp = await page.locator('#profileSummary .profile-stat').filter({ hasText: 'Level' }).innerText();
const restoredXp = Number((firstXp.match(/([\d,]+) XP/)?.[1] || '0').replace(/,/g, ''));
if (!(restoredXp > 0)) throw new Error(`First profile lost progress: ${firstXp}`);
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'View boards', exact: true }).click();
await page.getByRole('button', { name: 'Total XP', exact: true }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'Close ✕', exact: true }).click();
await page.getByRole('button', { name: /Enter Fight/ }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: join(outputDir, 'walkthrough-final.png') });
checks.push({ label: 'walkthrough', kind: 'real-ui', firstProfileXp: restoredXp, secondProfileXp: 0, switchedWithoutReload: true, returnedToGameplay: await page.locator('#game-cockpit').isVisible() });
const recordedVideo = page.video();
await page.close();
await videoContext.close();
const rawVideo = await recordedVideo.path();

await browser.close();
const mp4 = join(outputDir, 'player-profiles-walkthrough.mp4');
const transcode = spawnSync('ffmpeg', ['-y', '-i', rawVideo, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4], { encoding: 'utf8' });
if (transcode.status !== 0) throw new Error(`ffmpeg failed: ${transcode.stderr}`);
const unexpectedWrites = externalRequests.filter(request => !['GET', 'HEAD'].includes(request.method));
if (unexpectedWrites.length) throw new Error(`Unexpected external writes: ${JSON.stringify(unexpectedWrites)}`);
if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
if (statSync(mp4).size < 50_000) throw new Error(`Walkthrough MP4 is unexpectedly small: ${statSync(mp4).size} bytes`);
const report = { revision, baseUrl, checks, externalRequests, unexpectedWrites, errors, video: { path: mp4, bytes: statSync(mp4).size, source: rawVideo }, files: readdirSync(outputDir).sort() };
writeFileSync(join(outputDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
