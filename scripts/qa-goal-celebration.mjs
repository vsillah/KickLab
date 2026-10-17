import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4317/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/goal-celebration');
const revision=process.argv[4]||'working-tree';
const videoDir=join(outputDir,'video-source');
mkdirSync(videoDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath});
const errors=[];const checks=[];
const listen=page=>{page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});};
const urlFor=label=>`${baseUrl}?qa=goal-celebration&rev=${encodeURIComponent(revision)}&view=${label}`;

async function setup(page,label,{gfx='3d'}={}){
  listen(page);await page.goto(urlFor(label),{waitUntil:'networkidle'});
  if(await page.locator('#profileForm').isVisible()){await page.locator('#profileFormSave').click();await page.locator('#profileClose').click();}
  if(gfx==='2d'){
    await page.evaluate(()=>{const key='kicklab.profiles.v1',doc=JSON.parse(localStorage.getItem(key));const active=doc.profiles.find(profile=>profile.id===doc.activeId);active.progress=Object.assign({},active.progress,{gfx:'2d'});localStorage.setItem(key,JSON.stringify(doc));localStorage.setItem('impactlab.v1',JSON.stringify(active.progress));});
    await page.reload({waitUntil:'networkidle'});
  }
  if(await page.locator('#profileDialog').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-kick').click();await page.waitForTimeout(300);
}
async function setShot(page,speed=22,angle=17){await page.getByRole('slider',{name:'Speed'}).fill(String(speed));await page.getByRole('slider',{name:'Angle'}).fill(String(angle));}
async function progress(page){return page.evaluate(()=>{const doc=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));const active=doc.profiles.find(profile=>profile.id===doc.activeId);return{goals:active.progress.goals||0,xp:active.progress.xp||0,results:!document.querySelector('#results').hidden};});}
async function kick(page){await page.getByRole('button',{name:'Kick (Space)'}).click();}
async function waitCelebration(page){await page.locator('#goalCelebrationControls').waitFor({state:'visible',timeout:14000});return page.evaluate(()=>window.__KICKLAB_CELEBRATION_AUDIT__);}
async function waitCrowd(page){await page.waitForFunction(()=>window.__KICKLAB_CELEBRATION_AUDIT__?.phase==='crowd',{timeout:5000});return page.evaluate(()=>window.__KICKLAB_CELEBRATION_AUDIT__);}

const mainContext=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,recordVideo:{dir:videoDir,size:{width:1280,height:900}}});
const page=await mainContext.newPage();await setup(page,'desktop-3d');await setShot(page);const before=await progress(page);await kick(page);let audit=await waitCelebration(page);const during=await progress(page);await page.locator('.stage').screenshot({path:join(outputDir,'desktop-3d-jumbotron.png')});if(!audit.active||audit.phase!=='replay'||audit.reduced||audit.scoreWrites||audit.xpWrites)throw new Error(`3D replay audit failed: ${JSON.stringify(audit)}`);audit=await waitCrowd(page);await page.locator('.stage').screenshot({path:join(outputDir,'desktop-3d-crowd-camera.png')});await page.locator('#goalCelebrationControls').waitFor({state:'hidden',timeout:4000});const after=await progress(page);if(during.goals!==after.goals||during.xp!==after.xp||before.goals===after.goals)throw new Error(`Replay changed committed progress: ${JSON.stringify({before,during,after})}`);if(audit.frameCount<20||audit.maxStepMs>50)throw new Error(`Celebration frame budget failed: ${JSON.stringify(audit)}`);checks.push({label:'desktop-3d',before,during,after,audit});

await page.locator('#rNext').click();await page.waitForTimeout(1200);await page.evaluate(()=>{window.__qaCelebrationShows=0;const el=document.querySelector('#goalCelebrationControls');new MutationObserver(()=>{if(!el.hidden)window.__qaCelebrationShows++;}).observe(el,{attributes:true,attributeFilter:['hidden']});});await kick(page);await page.locator('#results').waitFor({state:'visible',timeout:14000});const failed=await page.evaluate(()=>({shows:window.__qaCelebrationShows,outcome:document.querySelector('#rTitle').textContent,hidden:document.querySelector('#goalCelebrationControls').hidden}));if(failed.shows||!failed.hidden||/GOAL/.test(failed.outcome))throw new Error(`Failed shot celebrated: ${JSON.stringify(failed)}`);checks.push({label:'failure-bypass',...failed});await page.waitForTimeout(500);const recorded=page.video();await page.close();await mainContext.close();const rawVideo=await recorded.path();

const lifecycleContext=await browser.newContext({viewport:{width:1024,height:768},deviceScaleFactor:1});const lifecyclePage=await lifecycleContext.newPage();await setup(lifecyclePage,'tablet-lifecycle',{gfx:'2d'});await kick(lifecyclePage);await waitCelebration(lifecyclePage);await lifecyclePage.evaluate(()=>window.KickLabMobileLifecycle.suspend('qa-background'));const frozenA=await lifecyclePage.evaluate(()=>window.__KICKLAB_CELEBRATION_AUDIT__.elapsed);await lifecyclePage.waitForTimeout(650);const frozenB=await lifecyclePage.evaluate(()=>window.__KICKLAB_CELEBRATION_AUDIT__.elapsed);if(Math.abs(frozenA-frozenB)>.02)throw new Error(`Lifecycle did not freeze replay: ${frozenA} -> ${frozenB}`);await lifecyclePage.screenshot({path:join(outputDir,'tablet-lifecycle-paused.png')});await lifecyclePage.evaluate(()=>window.KickLabMobileLifecycle.foreground('qa-foreground'));await lifecyclePage.locator('#goalCelebrationSkip').click();checks.push({label:'tablet-lifecycle',frozenA,frozenB,state:await lifecyclePage.evaluate(()=>window.KickLabMobileLifecycle.state())});await lifecycleContext.close();

const muteContext=await browser.newContext({viewport:{width:1024,height:768},deviceScaleFactor:1});const mutePage=await muteContext.newPage();await setup(mutePage,'tablet-muted',{gfx:'2d'});await mutePage.locator('#modeHomeButton').click();await mutePage.locator('#mute').click();await mutePage.locator('#lab-tab-kick').click();await kick(mutePage);audit=await waitCelebration(mutePage);const soundAudit=await mutePage.evaluate(()=>window.__KICKLAB_GOAL_SOUND_AUDIT__);if(!audit.muted||!soundAudit?.requested||soundAudit.played||!soundAudit.muted)throw new Error(`Mute contract failed: ${JSON.stringify({audit,soundAudit})}`);await mutePage.screenshot({path:join(outputDir,'tablet-muted-jumbotron.png')});await mutePage.locator('#goalCelebrationSkip').click();await mutePage.locator('#results').waitFor({state:'visible',timeout:3000});checks.push({label:'muted-skip',audit,soundAudit,ended:await mutePage.evaluate(()=>window.__KICKLAB_CELEBRATION_AUDIT__)});await muteContext.close();

for(const [label,width,height] of [['tablet-2d',768,1024],['mobile-2d',390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const p=await context.newPage();await setup(p,label,{gfx:'2d'});await kick(p);const start=await waitCelebration(p);const canvas3d=await p.locator('#cv3').isVisible().catch(()=>false);await p.screenshot({path:join(outputDir,`${label}-jumbotron.png`)});const crowd=await waitCrowd(p);await p.screenshot({path:join(outputDir,`${label}-crowd-camera.png`)});if(canvas3d||start.phase!=='replay'||crowd.phase!=='crowd')throw new Error(`${label} fallback contract failed: ${JSON.stringify({canvas3d,start,crowd})}`);checks.push({label,canvas3d,start,crowd});await context.close();
}

const reducedContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});const reducedPage=await reducedContext.newPage();await setup(reducedPage,'mobile-reduced',{gfx:'2d'});await kick(reducedPage);audit=await waitCelebration(reducedPage);await reducedPage.screenshot({path:join(outputDir,'mobile-reduced-static-celebration.png')});const reducedSound=await reducedPage.evaluate(()=>window.__KICKLAB_GOAL_SOUND_AUDIT__);if(!audit.reduced||audit.phase!=='crowd'||!reducedSound?.reduced)throw new Error(`Reduced-motion contract failed: ${JSON.stringify({audit,reducedSound})}`);checks.push({label:'mobile-reduced',audit,reducedSound});await reducedContext.close();

await browser.close();
const mp4=join(outputDir,'goal-celebration-walkthrough.mp4');const transcode=spawnSync('ffmpeg',['-y','-i',rawVideo,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name,r_frame_rate,nb_frames','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);const video=JSON.parse(probe.stdout);if(statSync(mp4).size<80_000||Number(video.format?.duration||0)<8)throw new Error(`Walkthrough MP4 failed size/duration validation (${statSync(mp4).size} bytes, ${video.format?.duration}s)`);
const report={revision,baseUrl,errors,checks,video:{path:mp4,bytes:statSync(mp4).size,...video},files:readdirSync(outputDir).sort()};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);console.log(JSON.stringify(report,null,2));
