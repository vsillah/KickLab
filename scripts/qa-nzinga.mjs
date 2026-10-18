import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173/kicklab.html';
const outputDir = resolve(process.argv[3] || 'qa-artifacts/nzinga');
const videoDir = join(outputDir, 'video');
mkdirSync(videoDir, { recursive: true });
const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((path) => path && existsSync(path));
if (!executablePath) throw new Error('No Chromium executable found.');

const browser = await chromium.launch({ headless: true, executablePath });
const errors = [], externalRequests = [], results = [];
const query = (url, value) => `${url}${url.includes('?') ? '&' : '?'}${value}`;

async function prepare(page, url) {
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => { try { if (new URL(request.url()).origin !== new URL(url).origin) externalRequests.push(request.url()); } catch (_) {} });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  if (await cancel.isVisible().catch(() => false)) await cancel.click();
  const closeProfiles = page.getByRole('button', { name: /Close profiles/ });
  if (await closeProfiles.isVisible().catch(() => false)) await closeProfiles.click();
  await page.locator('#lab-tab-kick').click();
  await page.waitForTimeout(500);
  await page.locator('#orientationDetailToggle').click();
  await page.locator('#settingsToggle').click();
  await page.getByRole('button', { name: /^Mode/ }).click();
  await page.getByRole('button', { name: /Free (lab|play)/ }).click();
  await page.getByRole('button', { name: /Close settings/ }).click();
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForFunction(() => document.querySelector('#gamePacingOverlay')?.hidden, null, { timeout: 7000 });
  await page.waitForTimeout(300);
}

async function setGraphics(page, classic) {
  await page.locator('#orientationDetailToggle').click();
  await page.locator('#settingsToggle').click();
  await page.getByRole('button', { name: /Graphics/ }).click();
  await page.locator(`button[data-setting="gfx"][data-value="${classic ? '2d' : '3d'}"]`).click();
  await page.getByRole('button', { name: /Close settings/ }).click();
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(700);
}

async function openActivity(page, name) {
  await page.locator('#experienceSelector').click();
  const freestyle = page.locator('#experienceFreestyle');
  if (await freestyle.isVisible().catch(() => false)) await freestyle.click();
  const selected = page.getByRole('checkbox', { name: /, selected(?: \d+ of \d+)?$/ });
  for (const item of await selected.all()) {
    const aria = await item.getAttribute('aria-label');
    if (!aria?.toLowerCase().startsWith(name.toLowerCase())) await item.click();
  }
  const target = page.getByRole('checkbox', { name: new RegExp(`^${name}`, 'i') });
  const aria = await target.getAttribute('aria-label');
  if (!aria || !/, selected$/.test(aria)) await target.click();
  await page.getByRole('button', { name: 'Play activity', exact: true }).click();
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForFunction(() => document.querySelector('#gamePacingOverlay')?.hidden, null, { timeout: 7000 });
  await page.waitForTimeout(300);
}

async function waitForContact(page) {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__KICKLAB_NZINGA__?.active && window.__KICKLAB_PHYSICS_VISION__?.active && window.__KICKLAB_PHYSICS_VISION__.env > .72, null, { timeout: 7000 });
  return page.evaluate(() => ({ nzinga: window.__KICKLAB_NZINGA__, physics: window.__KICKLAB_PHYSICS_VISION__, rig: window.__KICKLAB_RIG_AUDIT__ }));
}

async function responsiveAudit(page, label, viewport) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(300);
  const layout = await page.evaluate(() => {
    const box = (selector) => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null; };
    const stage = box('.stage'), controls = box('.control-deck');
    const buttons = [...document.querySelectorAll('.control-deck button')].filter((node) => {
      const style = getComputedStyle(node), r = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    }).map((node) => { const r = node.getBoundingClientRect(); return { label: node.getAttribute('aria-label') || node.textContent.trim().slice(0, 30), left: r.left, right: r.right, width: r.width, height: r.height }; });
    return { innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, stage, controls, stageControlOverlap: !!(stage && controls && controls.top < stage.bottom - 1), buttons, minButton: Math.min(...buttons.map((b) => Math.min(b.width, b.height))) };
  });
  if (layout.scrollWidth > viewport.width + 1) throw new Error(`${label}: horizontal overflow ${layout.scrollWidth} > ${viewport.width}`);
  if (layout.stageControlOverlap) throw new Error(`${label}: stage and controls overlap`);
  if (layout.buttons.some((b) => b.left < -1 || b.right > viewport.width + 1)) throw new Error(`${label}: control escaped viewport`);
  await page.screenshot({ path: join(outputDir, `${label}.png`), fullPage: true });
  results.push({ label, viewport, layout });
}

const defaultContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const defaultPage = await defaultContext.newPage();
await defaultPage.goto(query(baseUrl, 'qa=nzinga-default'), { waitUntil: 'networkidle' });
await defaultPage.waitForTimeout(900);
const defaultAudit = await defaultPage.evaluate(() => window.__KICKLAB_NZINGA__);
if (defaultAudit?.enabled !== false || defaultAudit?.tier !== 'off') throw new Error(`default-off failed: ${JSON.stringify(defaultAudit)}`);
await defaultContext.close();

const fullContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } } });
const fullPage = await fullContext.newPage();
const fullUrl = query(baseUrl, 'nzinga=1&qa=nzinga-full');
await prepare(fullPage, fullUrl);
const storageBefore = await fullPage.evaluate(() => ({ progress: localStorage.getItem('impactlab.v1'), nickname: localStorage.getItem('impactlab.nick'), keys: Object.keys(localStorage).sort() }));
const fullContact = await waitForContact(fullPage);
if (fullContact.nzinga.tier !== 'full') throw new Error(`full tier unavailable: ${JSON.stringify(fullContact.nzinga)}`);
if (!fullContact.rig?.some((rig) => rig.nzingaSameRig && rig.nzingaSignature)) throw new Error('full tier did not expose the shared rig signature');
await fullPage.locator('.stage').screenshot({ path: join(outputDir, '1440x1000-full-contact-stage.png') });
await responsiveAudit(fullPage, '1440x1000-full', { width: 1440, height: 1000 });
await responsiveAudit(fullPage, '768x1024-full', { width: 768, height: 1024 });
await responsiveAudit(fullPage, '390x844-full', { width: 390, height: 844 });
const storageAfter = await fullPage.evaluate(() => ({ progress: localStorage.getItem('impactlab.v1'), nickname: localStorage.getItem('impactlab.nick'), keys: Object.keys(localStorage).sort() }));
await fullContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
await prepare(reducedPage, query(baseUrl, 'nzinga=1&qa=nzinga-reduced'));
const reducedContact = await waitForContact(reducedPage);
if (reducedContact.nzinga.tier !== 'reduced' || !reducedContact.nzinga.reducedMotion) throw new Error(`reduced tier failed: ${JSON.stringify(reducedContact.nzinga)}`);
await reducedPage.locator('.stage').screenshot({ path: join(outputDir, '390x844-reduced-contact-stage.png') });
await reducedContext.close();

const canvasContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
const canvasPage = await canvasContext.newPage();
await prepare(canvasPage, query(baseUrl, 'nzinga=1&qa=nzinga-canvas'));
await openActivity(canvasPage, '1v1 Dribble');
await setGraphics(canvasPage, true);
await openActivity(canvasPage, 'Free kick');
const canvasContact = await waitForContact(canvasPage);
if (canvasContact.nzinga.tier !== 'canvas') throw new Error(`Canvas tier failed: ${JSON.stringify(canvasContact.nzinga)}`);
await canvasPage.locator('.stage').screenshot({ path: join(outputDir, '390x844-canvas-contact-stage.png') });
await canvasContext.close();

await browser.close();
const report = { baseUrl, defaultAudit, fullContact, reducedContact, canvasContact, storageBefore, storageAfter, externalRequests: [...new Set(externalRequests)], errors, results };
writeFileSync(join(outputDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
if (externalRequests.length) throw new Error(`external requests observed: ${[...new Set(externalRequests)].join(', ')}`);
if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
if (JSON.stringify(storageBefore.keys) !== JSON.stringify(storageAfter.keys)) throw new Error('Nzinga introduced a new localStorage key');
console.log(JSON.stringify({ outputDir, defaultAudit, tiers: [fullContact.nzinga.tier, reducedContact.nzinga.tier, canvasContact.nzinga.tier], externalRequests: 0, errors: 0, responsive: results.map(({ label, layout }) => ({ label, overflow: layout.scrollWidth - layout.innerWidth, stageControlOverlap: layout.stageControlOverlap, minButton: layout.minButton })), render: fullContact.nzinga.render, memory: fullContact.nzinga.memory }, null, 2));
