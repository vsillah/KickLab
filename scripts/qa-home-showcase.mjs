import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4202/kicklab.html';
const outputDir = resolve(process.argv[3] || 'qa-artifacts/home-showcase');
const revision = process.argv[4] || 'working-tree';
const videoSourceDir = join(outputDir, 'video-source');
mkdirSync(videoSourceDir, { recursive: true });

const executablePath = [
  process.env.KICKLAB_CHROMIUM_PATH,
  chromium.executablePath(),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(path => path && existsSync(path));
if (!executablePath) throw new Error('No local Chrome or Chromium executable found.');

const browser = await chromium.launch({ headless: true, executablePath });
const errors = [];
const checks = [];
const externalRequests = new Set();
const localOrigin = new URL(baseUrl).origin;

function watch(page) {
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', request => {
    const url = request.url();
    if (/^https?:/.test(url) && new URL(url).origin !== localOrigin) externalRequests.add(url);
  });
}

async function seed(page) {
  await page.addInitScript(() => {
    localStorage.setItem('impactlab.nick', 'QA Player');
    localStorage.setItem('impactlab.v1', JSON.stringify({ xp: 1840, rounds: 12, badges: ['first_win'] }));
  });
}

function urlFor(label) {
  return `${baseUrl}?qa=home-showcase&rev=${encodeURIComponent(revision)}&view=${label}`;
}

async function loadHome(page, label) {
  const response = await page.goto(urlFor(label), { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`${label}: home returned ${response?.status()}`);
  await page.locator('#modeHome').waitFor({ state: 'visible' });
  await page.waitForTimeout(900);
}

async function homeAudit(page, label) {
  const audit = await page.evaluate(() => {
    const box = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
    const overlap = (a, b) => a.left < b.right - .5 && a.right > b.left + .5 && a.top < b.bottom - .5 && a.bottom > b.top + .5;
    const inside = (child, parent) => child.left >= parent.left - 1 && child.right <= parent.right + 1 && child.top >= parent.top - 1 && child.bottom <= parent.bottom + 1;
    const cards = [...document.querySelectorAll('.lab-showcase')];
    const cardBoxes = cards.map(card => card.getBoundingClientRect().toJSON());
    const hero = box('.home-hero'), brand = box('.home-hero .brand'), wordmark = box('.kicklab-wordmark'), heroCopy = box('.hero-copy');
    const heroText = [...document.querySelectorAll('.kicklab-name,.hero-copy>strong,.hero-copy>p,.hero-badges')].map(node => ({
      selector: node.className || node.tagName,
      box: node.getBoundingClientRect().toJSON(),
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
      clipped: node.scrollWidth > node.clientWidth + 1,
    }));
    const progressChildren = [...document.querySelector('#progressHud').children].filter(node => getComputedStyle(node).display !== 'none').map(node => ({ selector: node.id || node.className, box: node.getBoundingClientRect().toJSON() }));
    const cardText = [...document.querySelectorAll('.lab-card-copy .n,.lab-card-copy .d,.lab-card-copy .mode-enter')].filter(node => getComputedStyle(node).display !== 'none').map(node => ({ text: node.textContent.trim(), clipped: node.scrollWidth > node.clientWidth + 1 }));
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      wordmark: document.querySelector('.kicklab-name')?.textContent.trim(),
      hero,
      heroGeometry: {
        brand,
        wordmark,
        heroCopy,
        collision: overlap(wordmark, heroCopy),
        contained: inside(wordmark, hero) && inside(heroCopy, hero) && inside(wordmark, brand) && inside(heroCopy, brand),
        text: heroText,
      },
      cards: cardBoxes,
      cardsOverlap: cardBoxes.some((card, index) => cardBoxes.slice(index + 1).some(other => overlap(card, other))),
      cardText,
      progress: box('#progressHud'),
      progressChildren,
      progressOverlap: progressChildren.some((item, index) => progressChildren.slice(index + 1).some(other => overlap(item.box, other.box))),
      progressLabel: document.querySelector('#progressHud')?.getAttribute('aria-label'),
      labsBeforeProgress: cardBoxes.every(card => card.bottom <= box('#progressHud').top + 1),
      actions: cards.map(card => ({
        label: card.textContent.replace(/\s+/g, ' ').trim(),
        describedBy: card.getAttribute('aria-describedby'),
        state: card.dataset.previewState,
        source: card.querySelector('source')?.getAttribute('src'),
        poster: card.querySelector('video')?.getAttribute('poster'),
        muted: card.querySelector('video')?.muted,
        loop: card.querySelector('video')?.loop,
        playsInline: card.querySelector('video')?.playsInline,
        controls: card.querySelector('video')?.controls,
        currentTime: Number(card.querySelector('video')?.currentTime.toFixed(2)),
        imageVisible: getComputedStyle(card.querySelector('img')).display !== 'none',
      })),
    };
  });
  if (audit.overflow > 1 || audit.wordmark !== 'KICKLAB' || audit.actions.length !== 3 || audit.heroGeometry.collision || !audit.heroGeometry.contained || audit.heroGeometry.text.some(item => item.clipped) || audit.cardsOverlap || audit.cardText.some(item => item.clipped) || audit.progressOverlap || !audit.labsBeforeProgress) {
    throw new Error(`${label}: layout contract failed (${JSON.stringify(audit)})`);
  }
  if (audit.progressLabel !== 'Overall player progress across Fight, Race, and Kick. Saved on this device.') {
    throw new Error(`${label}: progress semantics failed (${JSON.stringify(audit)})`);
  }
  if (audit.actions.some(action => !action.label || !action.describedBy || !action.source?.startsWith('media/') || !action.poster?.startsWith('media/') || !action.muted || !action.loop || !action.playsInline || action.controls || action.currentTime <= 0)) {
    throw new Error(`${label}: preview semantics failed (${JSON.stringify(audit.actions)})`);
  }
  checks.push({ label, kind: 'home-layout-and-semantics', ...audit });
}

async function testDialogs(page, label) {
  await page.locator('#homeProfileButton').click();
  await page.locator('#profileDialog').waitFor({ state: 'visible' });
  const profileText = (await page.locator('#profileDialog').innerText()).replace(/\s+/g, ' ');
  if (!/Profile & stats/i.test(profileText) || !/device/i.test(profileText)) throw new Error(`${label}: profile did not explain device-local scope`);
  await page.getByRole('button', { name: /Close profiles/i }).click();

  await page.locator('#boardBtn').click();
  await page.locator('#fboard').waitFor({ state: 'visible' });
  const boardText = (await page.locator('#fboard').innerText()).replace(/\s+/g, ' ');
  if (!/Device-local rankings/i.test(boardText) || !/Ranks players saved in this browser\. Nothing is uploaded\./i.test(boardText)) {
    throw new Error(`${label}: board scope was unclear (${boardText})`);
  }
  await page.locator('#fbClose').click();
  await page.waitForTimeout(50);
  if (await page.evaluate(() => document.activeElement?.id) !== 'boardBtn') throw new Error(`${label}: board did not restore focus to its trigger`);
  const sound = page.locator('#mute');
  const initialSound = await sound.getAttribute('aria-pressed');
  await sound.click();
  if (await sound.getAttribute('aria-pressed') === initialSound) throw new Error(`${label}: sound action did not change state`);
  await sound.click();
  checks.push({ label, kind: 'profile-and-local-board-actions', profileScope: true, boardScope: true });
}

async function clickLabs(page, label) {
  for (const lab of ['Fight', 'Race', 'Kick']) {
    await page.getByRole('button', { name: new RegExp(`^${lab} .*Enter ${lab}$`) }).click();
    await page.locator('#game-cockpit').waitFor({ state: 'visible' });
    await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 10000 });
    await page.locator('#orientationDetailToggle').click();
    await page.locator('#orientationDetail').waitFor({ state: 'visible' });
    await page.locator('#modeHomeButton').click();
    await page.locator('#modeHome').waitFor({ state: 'visible' });
  }
  checks.push({ label, kind: 'all-lab-actions', labs: ['Fight', 'Race', 'Kick'] });
}

const viewports = [
  ['w1440', { width: 1440, height: 1000 }],
  ['w1280', { width: 1280, height: 900 }],
  ['w1113', { width: 1113, height: 988 }],
  ['w1024', { width: 1024, height: 900 }],
  ['w900', { width: 900, height: 900 }],
  ['w768', { width: 768, height: 1024 }],
  ['w520', { width: 520, height: 900 }],
  ['w390', { width: 390, height: 844 }],
  ['w320', { width: 320, height: 800 }],
];

for (const [label, viewport] of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  watch(page);
  await seed(page);
  await loadHome(page, label);
  await homeAudit(page, label);
  const screenshotPath = join(outputDir, `${label}-home.png`);
  await page.addStyleTag({ content: '.skip-link{display:none!important}' });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  checks.push({ label, kind: 'screenshot', screenshotPath });
  if (label === 'w1440' || label === 'w390') await testDialogs(page, label);
  if (label === 'w1440') await clickLabs(page, label);
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  watch(page);
  await seed(page);
  await loadHome(page, 'reduced-motion');
  const state = await page.evaluate(() => [...document.querySelectorAll('.lab-showcase')].map(card => {
    const video = card.querySelector('video');
    return { state: card.dataset.previewState, paused: video.paused, videoDisplay: getComputedStyle(video).display, imageDisplay: getComputedStyle(card.querySelector('img')).display };
  }));
  if (state.some(item => item.state !== 'poster' || !item.paused || item.videoDisplay !== 'none' || item.imageDisplay === 'none')) throw new Error(`reduced-motion fallback failed (${JSON.stringify(state)})`);
  await page.locator('.lab-showcase').first().locator('video').dispatchEvent('error');
  const fallback = await page.locator('.lab-showcase').first().getAttribute('data-preview-state');
  if (fallback !== 'fallback') throw new Error(`media error fallback failed (${fallback})`);
  const screenshotPath = join(outputDir, 'mobile-reduced-motion.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  checks.push({ label: 'mobile', kind: 'reduced-motion-and-error-fallback', screenshotPath, state, fallback });
  await context.close();
}

let walkthroughPath;
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir: videoSourceDir, size: { width: 1280, height: 900 } } });
  const page = await context.newPage();
  watch(page);
  await seed(page);
  await loadHome(page, 'walkthrough');
  const rawVideo = page.video();
  await page.locator('#homeProfileButton').click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /Close profiles/i }).click();
  await page.locator('#boardBtn').click();
  await page.waitForTimeout(900);
  await page.locator('#fbClose').click();
  for (const lab of ['Fight', 'Race', 'Kick']) {
    await page.getByRole('button', { name: new RegExp(`^${lab} .*Enter ${lab}$`) }).click();
    await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(900);
    await page.locator('#orientationDetailToggle').click();
    await page.locator('#orientationDetail').waitFor({ state: 'visible' });
    await page.locator('#modeHomeButton').click();
    await page.locator('#modeHome').waitFor({ state: 'visible' });
    await page.waitForTimeout(650);
  }
  await context.close();
  const rawPath = await rawVideo.path();
  walkthroughPath = join(outputDir, `kicklab-home-showcase-${revision}.mp4`);
  const encoded = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', rawPath, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', walkthroughPath], { encoding: 'utf8' });
  if (encoded.status !== 0) throw new Error(`walkthrough encoding failed: ${encoded.stderr}`);
  rmSync(videoSourceDir, { recursive: true, force: true });
  checks.push({ label: 'walkthrough', kind: 'playable-mp4', path: walkthroughPath });
}

await browser.close();
if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
if (externalRequests.size) throw new Error(`External requests: ${JSON.stringify([...externalRequests])}`);

const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', walkthroughPath], { encoding: 'utf8' });
if (probe.status !== 0) throw new Error(`walkthrough probe failed: ${probe.stderr}`);
const media = JSON.parse(probe.stdout).format;
if (Number(media.duration) < 5 || Number(media.size) < 10000) throw new Error(`walkthrough media invalid: ${JSON.stringify(media)}`);

const report = { revision, baseUrl, generatedAt: new Date().toISOString(), externalRequests: [], browserErrors: [], media, checks };
writeFileSync(join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, outputDir, walkthroughPath, checks: checks.length, media }, null, 2));
