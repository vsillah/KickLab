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
    const hud=document.querySelector('#gameGuidanceHud'),stage=document.querySelector('.stage'),nav=document.querySelector('.game-shell-nav'),profile=document.querySelector('#profileBtn').getBoundingClientRect(),settings=document.querySelector('#settingsToggle').getBoundingClientRect();
    const cards=[...hud.children].filter(node=>node.classList.contains('contextual-summary')).map(node=>node.getBoundingClientRect().toJSON()),mobileLabels=[...hud.querySelectorAll('.mobile-hud-label')].filter(node=>getComputedStyle(node).display!=='none').map(node=>node.textContent.trim());
    return{overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,progressHidden:document.querySelector('#progressHud').hidden,hud:hud.getBoundingClientRect().toJSON(),stage:stage.getBoundingClientRect().toJSON(),nav:nav.getBoundingClientRect().toJSON(),profile,settings,cards,mobileLabels,cardBackground:getComputedStyle(cards.length&&hud.querySelector('.contextual-summary')).backgroundImage};
  });
  if(state.overflow>1||!state.progressHidden||state.cards.length!==4||state.mobileLabels.join(',')!=='Goal,Coach,Log,Math'||state.profile.width<44||state.profile.height<44||state.settings.width<44||state.settings.height<44||!state.cardBackground.includes('0.64')||!state.cardBackground.includes('0.5'))throw new Error(`${label}: compact shell contract failed (${JSON.stringify(state)})`);
  if(label.startsWith('mobile')&&(new Set(state.cards.map(card=>card.top)).size!==1||state.hud.height>56||state.nav.right>state.stage.right||state.settings.right>state.nav.right))throw new Error(`${label}: narrow top bar and labels must remain in bounds (${JSON.stringify(state)})`);
  checks.push({label,kind:'active-shell',...state});return state;
}
async function exerciseSummary(page,label,item,{screenshotPath=null}={}){
  await page.evaluate(()=>document.querySelector('#pad button:not(:disabled)')?.classList.add('on'));
  await page.locator(item.trigger).click();await page.waitForTimeout(180);
  const panel=page.locator(item.panel),state=await page.evaluate(()=>({backdrop:!document.querySelector('#gameOverlayBackdrop').hidden,controls:getComputedStyle(document.querySelector('.control-deck')).pointerEvents,focus:document.activeElement?.getAttribute('aria-label'),open:[...document.querySelectorAll('.context-detail')].filter(node=>!node.hidden).map(node=>node.id),held:document.querySelectorAll('#pad .on').length,settings:!document.querySelector('#settingsDrawer').hidden,profile:!document.querySelector('#profileDialog').hidden}));
  if(!(await panel.isVisible())||!state.backdrop||state.controls!=='none'||state.focus!==item.closeLabel||state.open.join(',')!==item.panel.slice(1)||state.held||state.settings||state.profile)throw new Error(`${label}-${item.name}: overlay contract failed (${JSON.stringify(state)})`);
  await page.keyboard.press('Shift+Tab');const trapped=await page.evaluate(selector=>document.querySelector(selector).contains(document.activeElement),item.panel);if(!trapped)throw new Error(`${label}-${item.name}: focus escaped its overlay`);
  if(screenshotPath)await page.screenshot({path:screenshotPath});
  await page.locator(`${item.panel} [data-close-detail]`).click();await page.waitForTimeout(1050);
  const closed=await page.evaluate(selector=>({open:!document.querySelector(selector).hidden,backdrop:!document.querySelector('#gameOverlayBackdrop').hidden,focus:document.activeElement?.getAttribute('aria-label'),controls:getComputedStyle(document.querySelector('.control-deck')).pointerEvents}),item.panel);
  if(closed.open||closed.backdrop||closed.focus!==item.openLabel||closed.controls==='none')throw new Error(`${label}-${item.name}: close/resume failed (${JSON.stringify(closed)})`);
  checks.push({label,kind:`${item.name}-overlay`,...state,focusTrapped:trapped,closed});
}

const summaries=[
  {name:'goal',trigger:'#goalsDetailToggle',panel:'#goalsDetail',openLabel:'Open goal details',closeLabel:'Close goals'},
  {name:'coach',trigger:'#learnDetailToggle',panel:'#learnDetail',openLabel:'Open coach notebook',closeLabel:'Close coach notebook'},
  {name:'log',trigger:'#reviewDetailToggle',panel:'#reviewDetail',openLabel:'Open move history',closeLabel:'Close move history'},
  {name:'math',trigger:'#physicsDetailsHud',panel:'#physicsDetail',openLabel:'Open physics details',closeLabel:'Close physics details'}
];
async function exercisePlayerOverlays(page,label){
  await page.locator('#profileBtn').click();await page.waitForTimeout(180);let state=await page.evaluate(()=>({profile:!document.querySelector('#profileDialog').hidden,parent:document.querySelector('#profileDialog').parentElement.classList.contains('stage'),backdrop:!document.querySelector('#gameOverlayBackdrop').hidden,settings:!document.querySelector('#settingsDrawer').hidden,contexts:[...document.querySelectorAll('.context-detail')].filter(node=>!node.hidden).length,focus:document.activeElement?.getAttribute('aria-label'),controls:getComputedStyle(document.querySelector('.control-deck')).pointerEvents}));if(!state.profile||!state.parent||!state.backdrop||state.settings||state.contexts||state.focus!=='Close profiles'||state.controls!=='none')throw new Error(`${label}: profile overlay contract failed (${JSON.stringify(state)})`);
  await page.keyboard.press('Escape');await page.waitForTimeout(1050);if(await page.locator('#profileDialog').isVisible())throw new Error(`${label}: Escape did not close profile`);
  await page.locator('#settingsToggle').click();await page.waitForTimeout(180);state=await page.evaluate(()=>({profile:!document.querySelector('#profileDialog').hidden,settings:!document.querySelector('#settingsDrawer').hidden,contexts:[...document.querySelectorAll('.context-detail')].filter(node=>!node.hidden).length,backdrop:!document.querySelector('#gameOverlayBackdrop').hidden,focus:document.activeElement?.closest('#settingsDrawer')!=null}));if(state.profile||!state.settings||state.contexts||!state.backdrop||!state.focus)throw new Error(`${label}: settings overlay contract failed (${JSON.stringify(state)})`);
  await page.evaluate(()=>document.querySelector('#profileBtn').click());await page.waitForTimeout(180);state=await page.evaluate(()=>({profile:!document.querySelector('#profileDialog').hidden,settings:!document.querySelector('#settingsDrawer').hidden,contexts:[...document.querySelectorAll('.context-detail')].filter(node=>!node.hidden).length}));if(!state.profile||state.settings||state.contexts)throw new Error(`${label}: profile did not replace Settings exclusively (${JSON.stringify(state)})`);await page.getByRole('button',{name:'Close profiles'}).click();await page.waitForTimeout(1050);
  checks.push({label,kind:'player-settings-overlays',profileAndSettingsExclusive:true,escape:true,topBarFocusReturn:await page.evaluate(()=>document.activeElement===document.querySelector('#profileBtn'))});
}

const viewports=[['desktop',1440,1000,'Fight'],['tablet',768,1024,'Race'],['mobile-390x844',390,844,'Fight']];
for(const [label,width,height,mode] of viewports){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await context.newPage();listen(page);await page.goto(urlFor(label),{waitUntil:'networkidle'});await enterLab(page,mode);await shellState(page,label);await page.screenshot({path:join(outputDir,`${label}-${mode.toLowerCase()}-hud.png`)});for(const item of(label==='desktop'?summaries:[summaries[0]]))await exerciseSummary(page,label,item,{screenshotPath:item.name==='goal'?join(outputDir,`${label}-goals-overlay.png`):null});await exercisePlayerOverlays(page,label);if(label==='mobile-390x844'){await page.locator('#profileBtn').click();await page.waitForTimeout(150);await page.screenshot({path:join(outputDir,'mobile-profile-overlay.png')});await page.getByRole('button',{name:'Close profiles'}).click();await page.waitForTimeout(1050);}
  if(label==='tablet'){
    await page.locator('#settingsToggle').click();await page.waitForTimeout(180);const drawer=page.locator('#settingsDrawer'),box=await drawer.boundingBox();if(!(await drawer.isVisible())||!box||box.width<500||box.height<200)throw new Error(`tablet: settings drawer collapsed (${JSON.stringify(box)})`);await page.screenshot({path:join(outputDir,'tablet-settings-overlay.png')});await page.keyboard.press('Escape');await page.waitForTimeout(1050);if(await drawer.isVisible())throw new Error('tablet: Escape did not close Settings');checks.push({label:'tablet',kind:'settings-overlay',box,escape:true});
  }
  await context.close();
}

const kickContext=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});const kickPage=await kickContext.newPage();listen(kickPage);await kickPage.goto(urlFor('kick'),{waitUntil:'networkidle'});await enterLab(kickPage,'Kick');await shellState(kickPage,'kick');await kickPage.screenshot({path:join(outputDir,'kick-3d-hud.png')});checks.push({label:'kick',kind:'representative-mode',experience:(await kickPage.locator('#experienceSelector').innerText()).trim()});await kickContext.close();

const reducedContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const reducedPage=await reducedContext.newPage();await reducedPage.goto(urlFor('reduced-motion'),{waitUntil:'networkidle'});await enterLab(reducedPage,'Fight');const transitions=await reducedPage.evaluate(()=>({backdrop:getComputedStyle(document.querySelector('#gameOverlayBackdrop')).transitionDuration,disclosure:getComputedStyle(document.querySelector('#goalsDetailToggle span')).transitionDuration}));if(transitions.backdrop!=='0s'||transitions.disclosure!=='0s')throw new Error(`Reduced motion overrides missing (${JSON.stringify(transitions)})`);checks.push({label:'reduced-motion',kind:'accessibility',transitions});await reducedContext.close();

const videoContext=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,recordVideo:{dir:videoDir,size:{width:1280,height:900}}});const page=await videoContext.newPage();listen(page);await page.goto(urlFor('walkthrough'),{waitUntil:'networkidle'});await page.waitForTimeout(700);await enterLab(page,'Fight');await page.waitForTimeout(800);for(const item of summaries){await page.locator(item.trigger).click();await page.waitForTimeout(900);await page.locator(`${item.panel} [data-close-detail]`).click();await page.waitForTimeout(950);}await page.locator('#profileBtn').click();await page.waitForTimeout(1000);await page.getByRole('button',{name:'Close profiles'}).click();await page.waitForTimeout(950);await page.locator('#settingsToggle').click();await page.waitForTimeout(1000);await page.getByRole('button',{name:'Close settings'}).click();await page.waitForTimeout(950);await page.getByRole('button',{name:'Labs'}).click();await page.waitForTimeout(500);await enterLab(page,'Race');await page.waitForTimeout(1100);await page.getByRole('button',{name:'Labs'}).click();await page.waitForTimeout(500);await enterLab(page,'Kick');await page.waitForTimeout(1200);await page.screenshot({path:join(outputDir,'walkthrough-final.png')});const recorded=page.video();await page.close();await videoContext.close();const rawVideo=await recorded.path();await browser.close();

const mp4=join(outputDir,'game-hud-walkthrough.mp4');const transcode=spawnSync('ffmpeg',['-y','-i',rawVideo,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);const video=JSON.parse(probe.stdout);if(statSync(mp4).size<50_000||Number(video.format?.duration||0)<5)throw new Error(`Walkthrough MP4 failed size/duration validation (${statSync(mp4).size} bytes, ${video.format?.duration}s)`);
const report={revision,baseUrl,errors,checks,video:{path:mp4,bytes:statSync(mp4).size,...video},files:readdirSync(outputDir).sort()};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);console.log(JSON.stringify(report,null,2));
