// QA for the Kick stadium fidelity experiment (?kickFidelity=dusk|night).
// Usage: node scripts/qa-kick-fidelity.mjs http://127.0.0.1:4173/kicklab.html [outDir] [--time=dusk|night] [--software-gl] [--only=states|parity|outcome]
// Checks: flag off never activates; six review states capture with the flag on and off; the look follows a dusk/night
// switch; leaving for day restores the exact scene state; a seeded free kick gives the same outcome with the flag on and off; no external requests.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2), base = args.find(a => /^http/.test(a)), out = resolve(args.find(a => !/^(http|--)/.test(a)) || 'qa-artifacts/kick-fidelity');
if (!base || !/^http:\/\/127\.0\.0\.1:\d+\/kicklab\.html$/.test(base)) throw new Error('Pass localhost kicklab.html URL.');
const software = args.includes('--software-gl'), only = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const time = (args.find(a => a.startsWith('--time=')) || '--time=dusk').slice(7), other = time === 'dusk' ? 'night' : 'dusk';
if (!['dusk', 'night'].includes(time)) throw new Error('--time must be dusk or night.');
mkdirSync(out, { recursive: true });
const executablePath = [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(path => path && existsSync(path));
const browser = await chromium.launch({ headless: true, executablePath, args: software ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
const origin = new URL(base).origin, report = { base, time, software, checks: [], errors: [], external: [] };
const FLAG = `kickFidelity=${time}&kickFidelityLadder=off`;
const STATES = { K1: ['free', 1280, 720], K2: ['dribble', 1280, 720], K3: ['dribble', 1280, 720], K4: ['dribble', 1280, 720], K5: ['dribble', 1280, 720], K6: ['dribble', 390, 844] };

async function open(label, query, { width = 1280, height = 720, time: startTime = time, reducedMotion = 'no-preference', seedRandom = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion });
  await context.addInitScript(({ time, seedRandom }) => {
    if (seedRandom) { let a = 12345; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    localStorage.setItem('impactlab.nick', 'Fidelity QA');
    localStorage.setItem('impactlab.v1', JSON.stringify({ kickTime: time, gfx: '3d', ch: { fight: 0, race: 0, kick: 0 }, play: { fight: 'ch', race: 'ch', kick: 'ch' } }));
  }, { time: startTime, seedRandom });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(`${label}: ${e}`));
  page.on('console', m => { if (m.type() === 'error') report.errors.push(`${label}: ${m.text()}`); });
  page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('blob:' + origin) && !u.startsWith('data:')) report.external.push(`${label}: ${u}`); });
  const response = await page.goto(base + (query ? '?' + query : ''), { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`${label}: HTTP ${response?.status()}`);
  if (await page.locator('#profileClose').isVisible()) await page.locator('#profileClose').click();
  await page.getByRole('button', { name: /^Kick .*Enter Kick$/ }).click();
  await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 90000 });
  return { context, page };
}
async function choose(page, category, value) {
  await page.locator('#orientationDetailToggle').click();
  await page.locator('#settingsToggle').click();
  await page.locator(`#settingsCategories [data-category="${category}"]`).click();
  await page.locator(`#settingsChoices [data-setting="${category}"][data-value="${value}"]`).click();
  await page.locator('#settingsClose').click();
}
const audit = page => page.evaluate(() => window.__KICKLAB_KICK_FIDELITY_AUDIT__ || null);
const digest = page => page.evaluate(() => window.__KICKLAB_KICK_REVIEW__?.digest() || null);
async function capture(page, file) {
  const data = await page.evaluate(() => window.__KICKLAB_KICK_REVIEW__?.capture() || null);
  if (!data) throw new Error(`${file}: review capture unavailable`);
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
}

try {
  if (!only || only === 'states') for (const [state, [shot, width, height]] of Object.entries(STATES)) for (const on of [false, true]) {
    const label = `${state}-${on ? 'on' : 'off'}`, { context, page } = await open(label, `${on ? FLAG + '&' : ''}kickReview=${state}`, { width, height });
    if (shot !== 'free') await choose(page, 'shot', shot);
    await page.waitForTimeout(software ? 3000 : 800);
    const a = await audit(page);
    if (on && !(a?.active && a.time === time && a.passes?.length)) throw new Error(`${label}: experiment did not activate (${JSON.stringify(a)})`);
    if (!on && (a?.active || a?.flag)) throw new Error(`${label}: experiment active with the flag off`);
    await capture(page, join(out, `${label}.png`));
    if (state === 'K1' || state === 'K6') await page.screenshot({ path: join(out, `${label}-page.png`), animations: 'disabled', timeout: 120000 });
    report.checks.push({ label, audit: a });
    await context.close();
  }
  if (!only || only === 'parity') {
    const never = await open('parity-never', 'kickReview=K3', { time: 'day', reducedMotion: 'reduce' });
    await choose(never.page, 'shot', 'dribble'); await never.page.waitForTimeout(1000);
    const a = await digest(never.page); await never.context.close();
    const used = await open('parity-disposed', `kickFidelity=dusk,night&kickFidelityLadder=off&kickReview=K3`, { reducedMotion: 'reduce' });
    await choose(used.page, 'shot', 'dribble'); await used.page.waitForTimeout(1000);
    let state = await audit(used.page);
    if (!(state?.active && state.time === time)) throw new Error(`parity: experiment did not activate at ${time} (${JSON.stringify(state)})`);
    await choose(used.page, 'time', other); await used.page.waitForTimeout(1500);
    state = await audit(used.page);
    if (!(state?.active && state.time === other)) throw new Error(`parity: look did not follow the switch to ${other} (${JSON.stringify(state)})`);
    await choose(used.page, 'time', 'day'); await used.page.waitForTimeout(1500);
    const b = await digest(used.page), after = await audit(used.page); await used.context.close();
    if (after?.active) throw new Error('parity: experiment still active after leaving for day');
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`parity: scene state differs after dispose\n${JSON.stringify(a)}\n${JSON.stringify(b)}`);
    report.checks.push({ label: 'dispose-parity', digest: a });
  }
  if (!only || only === 'outcome') {
    const results = [];
    for (const on of [false, true]) {
      const { context, page } = await open(`outcome-${on ? 'on' : 'off'}`, on ? FLAG : '', { seedRandom: true });
      await page.waitForTimeout(software ? 3000 : 1000);
      await page.keyboard.press('Space');
      let card = '', previous = null;   // the XP total counts up, so wait until two reads agree
      for (let i = 0; i < 150; i++) { await page.waitForTimeout(2000); const now = await page.evaluate(() => (document.body.innerText.match(/[\d.]+ m\/s at [\d.]+° · [^\n]*[\s\S]{0,120}XP EARNED\s*\+?\d+/) || [''])[0].replace(/\s+/g, ' ')); if (now && now === previous) { card = now; break; } previous = now; }
      if (!card) throw new Error(`outcome-${on ? 'on' : 'off'}: no result card`);
      results.push(card); await context.close();
    }
    if (results[0] !== results[1]) throw new Error(`outcome: free kick differs with the flag on\noff: ${results[0]}\non:  ${results[1]}`);
    report.checks.push({ label: 'free-kick-outcome', result: results[0] });
  }
} finally { await browser.close(); }
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
if (report.errors.length || report.external.length) throw new Error(JSON.stringify({ errors: report.errors, external: report.external }));
console.log(JSON.stringify({ checks: report.checks.map(c => c.label), errors: 0, external: 0, report: join(out, 'report.json') }, null, 2));
