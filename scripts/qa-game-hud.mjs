import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url);
const { chromium }=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4201/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/game-hud');
const revision=process.argv[4]||'working-tree';
const videoDir=join(outputDir,'video-source');
mkdirSync(videoDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath});
const errors=[];const checks=[];
const listen=page=>{page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});};
const urlFor=label=>`${baseUrl}?qa=game-hud&rev=${encodeURIComponent(revision)}&view=${label}`;

async function enterLab(page,name){
  if(await page.locator('#profileDialog').isVisible())await page.getByRole('button',{name:'Close profiles'}).click();
  await page.getByRole('button',{name:new RegExp(`^${name} .*Enter ${name}$`)}).click();
  await page.waitForTimeout(350);
  if(!(await page.locator('#game-cockpit').isVisible())||await page.locator('#modeHome').isVisible())throw new Error(`${name}: active game did not replace mode home`);
}
async function shellState(page,label){
  const state=await page.evaluate(()=>{
    const hud=document.querySelector('#gameGuidanceHud'),stage=document.querySelector('.stage');
    const cards=[...hud.children].filter(node=>node.classList.contains('contextual-summary')).map(node=>node.getBoundingClientRect().toJSON()),mobileLabels=[...hud.querySelectorAll('.mobile-hud-label')].filter(node=>getComputedStyle(node).display!=='none').map(node=>node.textContent.trim());
    return{overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,progressHidden:document.querySelector('#progressHud').hidden,hud:hud.getBoundingClientRect().toJSON(),stage:stage.getBoundingClientRect().toJSON(),cards,mobileLabels};
  });
  if(state.overflow>1||!state.progressHidden||state.cards.length!==4)throw new Error(`${label}: compact shell contract failed (${JSON.stringify(state)})`);
  if(label.startsWith('mobile')&&(state.mobileLabels.join(',')!=='Goal,Coach,Log,Math'||new Set(state.cards.map(card=>card.top)).size!==1||state.hud.height>56))throw new Error(`${label}: narrow labels must remain visible in one compact row (${JSON.stringify(state)})`);
  checks.push({label,kind:'active-shell',...state});return state;
}
async function assertGoalOverlay(page,label){
  await page.getByRole('button',{name:'Open goal details'}).click();await page.waitForTimeout(180);
  const panel=page.locator('#goalsDetail'),state=await page.evaluate(()=>({backdrop:!document.querySelector('#gameOverlayBackdrop').hidden,controls:getComputedStyle(document.querySelector('.control-deck')).pointerEvents,focus:document.activeElement?.getAttribute('aria-label'),open:[...document.querySelectorAll('.context-detail')].filter(node=>!node.hidden).map(node=>node.id)}));
  if(!(await panel.isVisible())||!state.backdrop||state.controls!=='none'||state.focus!=='Close goals'||state.open.join(',')!=='goalsDetail')throw new Error(`${label}: goal overlay contract failed (${JSON.stringify(state)})`);
  await page.keyboard.press('Shift+Tab');const trapped=await page.evaluate(()=>document.querySelector('#goalsDetail').contains(document.activeElement));if(!trapped)throw new Error(`${label}: focus escaped the open goal overlay`);
  checks.push({label,kind:'goal-overlay',...state,focusTrapped:trapped});return panel;
}
async function closeAndResume(page,label){
  await page.getByRole('button',{name:'Close goals'}).click();await page.waitForTimeout(1250);
  const state=await page.evaluate(()=>({open:!document.querySelector('#goalsDetail').hidden,backdrop:!document.querySelector('#gameOverlayBackdrop').hidden,focus:document.activeElement?.getAttribute('aria-label'),controls:getComputedStyle(document.querySelector('.control-deck')).pointerEvents}));
  if(state.open||state.backdrop||state.focus!=='Open goal details'||state.controls==='none')throw new Error(`${label}: overlay close/resume contract failed (${JSON.stringify(state)})`);
  checks.push({label,kind:'close-resume',...state});
}

const viewports=[['desktop',1440,1000,'Fight'],['tablet',768,1024,'Race'],['mobile-390x844',390,844,'Fight']];
for(const [label,width,height,mode] of viewports){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await context.newPage();listen(page);await page.goto(urlFor(label),{waitUntil:'networkidle'});await enterLab(page,mode);await shellState(page,label);await page.screenshot({path:join(outputDir,`${label}-${mode.toLowerCase()}-hud.png`)});await assertGoalOverlay(page,label);await page.screenshot({path:join(outputDir,`${label}-goals-overlay.png`)});await closeAndResume(page,label);
  if(label==='tablet'){
    await page.getByRole('button',{name:'Settings'}).click();await page.waitForTimeout(180);const drawer=page.locator('#settingsDrawer'),box=await drawer.boundingBox();if(!(await drawer.isVisible())||!box||box.width<500||box.height<200)throw new Error(`tablet: settings drawer collapsed (${JSON.stringify(box)})`);await page.screenshot({path:join(outputDir,'tablet-settings-overlay.png')});await page.keyboard.press('Escape');await page.waitForTimeout(1250);if(await drawer.isVisible())throw new Error('tablet: Escape did not close Settings');checks.push({label:'tablet',kind:'settings-overlay',box,escape:true});
  }
  await context.close();
}

const kickContext=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});const kickPage=await kickContext.newPage();listen(kickPage);await kickPage.goto(urlFor('kick'),{waitUntil:'networkidle'});await enterLab(kickPage,'Kick');await shellState(kickPage,'kick');await kickPage.screenshot({path:join(outputDir,'kick-3d-hud.png')});checks.push({label:'kick',kind:'representative-mode',experience:(await kickPage.locator('#experienceSelector').innerText()).trim()});await kickContext.close();

const reducedContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const reducedPage=await reducedContext.newPage();await reducedPage.goto(urlFor('reduced-motion'),{waitUntil:'networkidle'});await enterLab(reducedPage,'Fight');const transitions=await reducedPage.evaluate(()=>({backdrop:getComputedStyle(document.querySelector('#gameOverlayBackdrop')).transitionDuration,disclosure:getComputedStyle(document.querySelector('#goalsDetailToggle span')).transitionDuration}));if(transitions.backdrop!=='0s'||transitions.disclosure!=='0s')throw new Error(`Reduced motion overrides missing (${JSON.stringify(transitions)})`);checks.push({label:'reduced-motion',kind:'accessibility',transitions});await reducedContext.close();

const videoContext=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,recordVideo:{dir:videoDir,size:{width:1280,height:900}}});const page=await videoContext.newPage();listen(page);await page.goto(urlFor('walkthrough'),{waitUntil:'networkidle'});await page.waitForTimeout(700);await enterLab(page,'Fight');await page.waitForTimeout(900);await page.getByRole('button',{name:'Open goal details'}).click();await page.waitForTimeout(1300);await page.getByRole('button',{name:'Close goals'}).click();await page.waitForTimeout(1300);await page.getByRole('button',{name:'Open coach notebook'}).click();await page.waitForTimeout(1300);await page.locator('#learnDetail [data-close-detail]').click();await page.waitForTimeout(1300);await page.getByRole('button',{name:'Settings'}).click();await page.waitForTimeout(1300);await page.getByRole('button',{name:'Close settings'}).click();await page.waitForTimeout(1300);await page.getByRole('button',{name:'Labs'}).click();await page.waitForTimeout(500);await enterLab(page,'Race');await page.waitForTimeout(1300);await page.getByRole('button',{name:'Labs'}).click();await page.waitForTimeout(500);await enterLab(page,'Kick');await page.waitForTimeout(1400);await page.screenshot({path:join(outputDir,'walkthrough-final.png')});const recorded=page.video();await page.close();await videoContext.close();const rawVideo=await recorded.path();await browser.close();

const mp4=join(outputDir,'game-hud-walkthrough.mp4');const transcode=spawnSync('ffmpeg',['-y','-i',rawVideo,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);const video=JSON.parse(probe.stdout);if(statSync(mp4).size<50_000||Number(video.format?.duration||0)<5)throw new Error(`Walkthrough MP4 failed size/duration validation (${statSync(mp4).size} bytes, ${video.format?.duration}s)`);
const report={revision,baseUrl,errors,checks,video:{path:mp4,bytes:statSync(mp4).size,...video},files:readdirSync(outputDir).sort()};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);console.log(JSON.stringify(report,null,2));
