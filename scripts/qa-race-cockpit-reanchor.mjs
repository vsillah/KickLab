import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://127.0.0.1:18763/kicklab.html';
const out = resolve(process.argv[3] || 'qa-artifacts/race-cockpit-reanchor');
const revision = process.argv[4] || 'working-tree';
const allSizes = [[360, 780], [390, 844], [768, 1024], [1113, 988], [1440, 900]];
const sizes = process.env.KICKLAB_QA_WIDTHS ? allSizes.filter(([width]) => process.env.KICKLAB_QA_WIDTHS.split(',').map(Number).includes(width)) : allSizes;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path)) });
const report = { base, revision, states: [], videos: [], errors: [], external: [] };

for (const [width, height] of sizes) {
  const record = width === 360 || width === 1113;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce', recordVideo: record ? { dir: out, size: { width, height } } : undefined });
  await context.addInitScript(() => {
    localStorage.setItem('impactlab.v1', JSON.stringify({ gfx: '3d', ch: { fight: 0, race: 0, kick: 0 }, play: { fight: 'ch', race: 'ch', kick: 'ch' } }));
    localStorage.setItem('impactlab.nick', 'QA Player');
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(`${width}: ${error.message}`));
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(new URL(base).origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    report.external.push(`${width}: ${url}`);
    route.abort();
  });
  try {
    const url = new URL(base);
    for (const flag of ['raceCornerTrace', 'raceTelemetry', 'raceExpansion', 'raceSimulator']) url.searchParams.set(flag, 'prototype');
    url.searchParams.set('raceEngineQA', '1');
    url.searchParams.set('rev', revision);
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    if (await page.locator('#profileClose').isVisible()) await page.locator('#profileClose').click();
    await page.locator('#lab-tab-race').click();
    await page.locator('#gamePacingOverlay').waitFor({ state: 'hidden', timeout: 20000 });
    const orbit = page.locator('.race-orbit-panel button');
    if (await orbit.isVisible()) await orbit.click();
    await page.locator('#raceCoachSetupStart').waitFor({ state: 'visible', timeout: 20000 });
    await page.evaluate(() => window.__KICKLAB_RACE_ENGINE_QA__.run());
    await page.waitForFunction(() => window.__KICKLAB_RACE_3D__?.dynamics?.state === 'run', null, { timeout: 5000 });
    await page.locator('#raceNavigation').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.toast-close:visible').evaluateAll(buttons => buttons.forEach(button => button.click()));
    await page.locator('.stage').scrollIntoViewIfNeeded();

    async function capture(mode, collapsed) {
      await page.waitForTimeout(250);
      const state = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        const canvas = rect('#cv'), stage = rect('.stage'), panel = rect('#raceNavigation'), cockpit = rect('#raceCockpit'), wheel = rect('#raceWheelCanvas'), deck = rect('.control-deck'), head = rect('.floating-control-head'), wrench = rect('#racePhoneToolsToggle'), rail = rect('#gameGuidanceHud'), progress = rect('#racePhoneProgress');
        const scale = canvas.width / 960, phone = canvas.width <= 480, center = { x: canvas.left + 112 * scale, y: canvas.top + (178 + (phone ? 104 : 0)) * scale };
        const style = getComputedStyle(document.querySelector('#raceNavigation'));
        const cut = { x: panel.left + parseFloat(style.getPropertyValue('--race-wheel-x')), y: panel.top + parseFloat(style.getPropertyValue('--race-wheel-y')) };
        const composition = window.__KICKLAB_RACE_3D__?.composition;
        const car = composition ? { left: canvas.left + (composition.carCenter[0] - composition.carWidth / 2) * canvas.width, right: canvas.left + (composition.carCenter[0] + composition.carWidth / 2) * canvas.width, top: canvas.top + (composition.carCenter[1] - composition.carHeight / 2) * canvas.height, bottom: canvas.top + (composition.carCenter[1] + composition.carHeight / 2) * canvas.height } : null;
        const touchesCar = box => !!car && box.left < car.right + 8 && box.right > car.left - 8 && box.top < car.bottom + 8 && box.bottom > car.top - 8;
        return {
          visible: !!document.querySelector('#raceNavigation').getClientRects().length,
          renderer: window.__KICKLAB_RACE_3D__?.status,
          mode: document.querySelector('.control-deck').classList.contains('simulator-active') ? 'simulator' : document.querySelector('#analogControlsButton').getAttribute('aria-pressed') === 'true' ? 'analog' : 'classic',
          collapsed: document.querySelector('#controllerCollapseButton').getAttribute('aria-expanded') === 'false',
          anchorError: Math.hypot(cockpit.left - center.x, cockpit.top - center.y),
          cutoutError: Math.hypot(cut.x - center.x, cut.y - center.y),
          wheelCanvasAligned: Math.abs(wheel.left - canvas.left) < 1 && Math.abs(wheel.top - canvas.top) < 1,
          holeRadius: parseFloat(style.getPropertyValue('--race-wheel-radius')),
          wheelRadius: 60 * scale * (phone ? 1.5 : 1),
          panel: { left: panel.left, right: panel.right, bottom: panel.bottom },
          stageRight: stage.right,
          progress: { top: progress.top, bottom: progress.bottom, width: progress.width },
          progressGap: panel.top - progress.bottom,
          roadHorizon: canvas.top + (composition?.horizonY || 0) * canvas.height,
          railLeft: rail.left,
          headWithinStage: head.left >= stage.left - 1 && head.right <= rail.left - 4 && head.top >= stage.top - 1 && head.bottom <= stage.bottom + 1,
          wrenchWithinStage: wrench.left >= stage.left - 1 && wrench.right <= stage.right + 1 && wrench.top >= stage.top - 1 && wrench.bottom <= stage.bottom + 1,
          car, panelTouchesCar: touchesCar(panel), deckTouchesCar: touchesCar(deck),
          overflow: document.documentElement.scrollWidth - innerWidth,
          visibleReadouts: [...document.querySelectorAll('[data-race-live-readout]')].filter(element => !!element.getClientRects().length).length,
        };
      });
      const label = `${width}x${height}-${mode}-${collapsed ? 'collapsed' : 'expanded'}`;
      if(mode==='classic'&&!collapsed){
        state.frameP95Ms=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let previous=performance.now();function sample(now){samples.push(now-previous);previous=now;if(samples.length<90)requestAnimationFrame(sample);else{const sorted=samples.slice(5).sort((a,b)=>a-b);resolve(sorted[Math.floor(sorted.length*.95)]);}}requestAnimationFrame(sample);}));
      }
      report.states.push({ label, ...state });
      if (!state.visible || state.renderer !== 'rendering' || state.mode !== mode || state.collapsed !== collapsed || state.anchorError > 1 || state.cutoutError > 1 || !state.wheelCanvasAligned || state.holeRadius - state.wheelRadius < 6 || state.progress.width < 100 || state.progressGap < 6 || (width <= 480 && state.panel.bottom > state.roadHorizon - 4) || state.panel.right > state.stageRight - 4 || !state.wrenchWithinStage || state.panelTouchesCar || state.overflow > 0 || state.visibleReadouts !== 1 || state.frameP95Ms>(width<=480?42:35)) throw new Error(`${label}: ${JSON.stringify(state)}`);
      await page.locator('.stage').screenshot({ path: join(out, `${label}.png`) });
      if (record) await page.waitForTimeout(1800);
    }
    async function pair(mode) {
      await capture(mode, false);
      const toggle = page.locator(width <= 480 ? '#racePhoneToolsToggle' : '#controllerCollapseButton');
      await toggle.click();
      await capture(mode, true);
      await toggle.click();
    }
    await pair('classic');
    if(width <= 480)await page.locator('#racePhoneToolsToggle').click();
    await page.locator('#analogControlsButton').click();
    if(width <= 480)await page.locator('#racePhoneToolsToggle').click();
    await pair('analog');
    if(width <= 480)await page.locator('#racePhoneToolsToggle').click();
    await page.locator('#simulatorControlsButton').click();
    if(width <= 480)await page.locator('#racePhoneToolsToggle').click();
    await pair('simulator');
    if(width<=480){
      await page.locator('#racePhoneToolsToggle').click();
      await page.locator('#classicControlsButton').click();
      await page.locator('#racePhoneToolsToggle').click();
      const before=await page.evaluate(()=>({state:__KICKLAB_RACE_ENGINE_QA__.state(),canvas:document.querySelector('#cv').getBoundingClientRect().toJSON()}));
      const x=before.canvas.left+112*before.canvas.width/960,y=before.canvas.top+282*before.canvas.width/960;
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+18,y-16,{steps:4});await page.mouse.up();
      const after=await page.evaluate(()=>__KICKLAB_RACE_ENGINE_QA__.state());
      if(before.state.steer!=='you'||Math.abs(after.wheel-before.state.wheel)<5||after.paused)throw new Error(`${width}: wheel pointer drag ${JSON.stringify({before:before.state,after})}`);
    }
  } catch (error) { report.errors.push(`${width}: ${error.stack || error}`); }
  const video = page.video();
  await context.close();
  if (video) {
    const mp4 = join(out, `race-cockpit-reanchor-${width}x${height}-${revision.slice(0, 12)}.mp4`);
    const encoded = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', await video.path(), '-an', '-c:v', 'libx264', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { encoding: 'utf8' });
    const probe = encoded.status === 0 && spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,width,height', '-of', 'json', mp4], { encoding: 'utf8' });
    if (encoded.status !== 0 || !probe || probe.status !== 0 || statSync(mp4).size < 100_000) report.errors.push(`${width}: MP4 failed ${encoded.stderr || probe?.stderr || ''}`);
    else report.videos.push({ path: mp4, bytes: statSync(mp4).size, ...JSON.parse(probe.stdout) });
  }
}
await browser.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ revision, states: report.states.length, videos: report.videos.map(video => video.path), errors: report.errors, external: report.external }, null, 2));
if (report.states.length !== sizes.length * 6 || report.errors.length || report.external.length) process.exitCode = 1;
