import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4319/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/lifelike-free-kick');
const revision=process.argv[4]||'working-tree';
const videoDir=join(outputDir,'video-source');
mkdirSync(videoDir,{recursive:true});
const beforeDir=resolve(import.meta.dirname,'..','qa-artifacts','lifelike-free-kick-6691ec5');
for(const [source,target] of [['02-desktop-full-ready.png','before-desktop-ready.png'],['04-desktop-full-contact.png','before-desktop-contact.png'],['11-mobile-full.png','before-mobile-full.png']])if(existsSync(join(beforeDir,source)))copyFileSync(join(beforeDir,source),join(outputDir,target));
const rejectedDir=resolve(import.meta.dirname,'..','qa-artifacts','character-fidelity-v2-f458b7e');
for(const [source,target] of [['02-desktop-full-ready.png','before-human-qa-desktop-ready.png'],['04-desktop-full-contact.png','before-human-qa-desktop-contact.png'],['15-mobile-full.png','before-human-qa-mobile.png']])if(existsSync(join(rejectedDir,source)))copyFileSync(join(rejectedDir,source),join(outputDir,target));
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath,args:['--enable-precise-memory-info']});
const errors=[],requests=[],checks=[];
const listen=page=>{page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('request',request=>{const url=new URL(request.url());if(!['127.0.0.1','localhost'].includes(url.hostname)&&url.protocol!=='data:')requests.push(url.href);});};
const urlFor=mode=>`${baseUrl}?kicklabPoc=1${mode?`&kicklabCharacter=${mode}`:''}&rev=${encodeURIComponent(revision)}`;
const legacy={progress:JSON.stringify({xp:321,goals:7,badges:{qa:true}}),nickname:'Local QA'};
async function setup(page,mode=''){
  listen(page);await page.goto(urlFor(mode),{waitUntil:'networkidle'});
  await page.evaluate(legacy=>{localStorage.setItem('impactlab.v1',legacy.progress);localStorage.setItem('impactlab.nick',legacy.nickname);},legacy);
  await page.reload({waitUntil:'networkidle'});
  if(await page.locator('#profileForm').isVisible()){await page.locator('#profileFormSave').click();await page.locator('#profileClose').click();}
  if(await page.locator('#profileDialog').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-kick').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:7000});await page.waitForTimeout(250);
}
async function stageSnap(page,name){await page.locator('.toast').evaluateAll(nodes=>nodes.forEach(node=>node.remove()));await page.locator('.stage').screenshot({path:join(outputDir,`${name}.png`)});}
async function detailSnap(page,name){await page.locator('#characterPocDetail').screenshot({path:join(outputDir,`${name}.png`)});}
async function stateSnap(page,name){await stageSnap(page,name);await detailSnap(page,`${name}-character`);}
async function showDetail(page,ms=650){await page.locator('#characterPocDetail').evaluate(node=>node.scrollIntoView({block:'center'}));await page.waitForTimeout(ms);await page.locator('.stage').evaluate(node=>node.scrollIntoView({block:'center'}));await page.waitForTimeout(120);}
async function dismissToasts(page){for(const close of await page.locator('.toast-close').all())if(await close.isVisible().catch(()=>false))await close.click({force:true}).catch(()=>{});await page.waitForTimeout(100);}
async function closeQaOverlays(page){
  if(await page.locator('#settingsDrawer').isVisible().catch(()=>false))await page.locator('#settingsClose').click();
  if(await page.locator('#orientationDetail').isVisible().catch(()=>false))await page.locator('[data-close-detail="orientation"]').click();
  if(await page.locator('#profileDialog').isVisible().catch(()=>false))await page.locator('#profileClose').click();
  await page.waitForTimeout(100);
}
async function heap(page){return page.evaluate(()=>performance.memory?performance.memory.usedJSHeapSize:null);}
async function audit(page){return page.evaluate(()=>structuredClone(window.__KICKLAB_CHARACTER_POC__));}
async function stadiumAudit(page){
  const required=['atmosphere','roof-truss','upper-stands','lower-stands','crowd','side-returns','animated-boards','perspective-pitch'],goalRequired=['frontFrame','rearFrame','sideNet','backNet','perspectiveGrid'];
  const first=await page.evaluate(()=>({scene:structuredClone(window.__KICKLAB_SIDE_STADIUM__),goal:structuredClone(window.__KICKLAB_SIDE_GOAL__),stagePanel:!!document.querySelector('.stage .character-poc'),outsidePanel:!!document.querySelector('.game-frame>.character-poc')}));
  await page.waitForTimeout(700);const second=await page.evaluate(()=>structuredClone(window.__KICKLAB_SIDE_STADIUM__));
  if(!first.scene||first.scene.id!=='home'||first.scene.mode!=='free'||JSON.stringify(first.scene.layers)!==JSON.stringify(required))throw new Error(`stadium composition mismatch: ${JSON.stringify(first)}`);
  if(!first.goal||goalRequired.some(key=>!first.goal[key]))throw new Error(`stadium goal/net mismatch: ${JSON.stringify(first.goal)}`);
  if(first.stagePanel||!first.outsidePanel)throw new Error(`character POC obscures stadium: ${JSON.stringify(first)}`);
  const boardTravel=(second.boardPhase-first.scene.boardPhase+152)%152;if(boardTravel<15)throw new Error(`moving boards stalled at ${boardTravel}px`);
  checks.push({label:'approved-stadium-composition',layers:first.scene.layers,goal:first.goal,boardTravel,stagePanel:first.stagePanel,outsidePanel:first.outsidePanel});
}
async function clickMode(page,mode){await closeQaOverlays(page);await page.locator(`[data-character-mode="${mode}"]`).click();await closeQaOverlays(page);await page.waitForTimeout(250);const current=await audit(page);if(current.requested!==mode)throw new Error(`renderer did not select ${mode}`);return current;}
async function kick(page,{approachName,plantName,contactName,followName,recoveryName,celebrationName}={}){const next=page.getByRole('button',{name:'Next shot (Space)'});if(await next.isVisible().catch(()=>false)){await next.click();await page.waitForTimeout(180);}const counts=await page.evaluate(()=>({plant:window.__KICKLAB_CHARACTER_POC__?.events?.filter(event=>event.name==='plant-foot-lock').length||0,contact:window.__KICKLAB_CHARACTER_POC__?.events?.filter(event=>event.name==='physics-contact').length||0}));await page.getByRole('button',{name:'Kick (Space)'}).click();if(approachName){await page.waitForFunction(()=>window.__KICKLAB_CHARACTER_POC__?.clip==='approach',{timeout:5000});await stateSnap(page,approachName);}await page.waitForFunction(count=>(window.__KICKLAB_CHARACTER_POC__?.events?.filter(event=>event.name==='plant-foot-lock').length||0)>count,counts.plant,{timeout:10000});if(plantName)await stateSnap(page,plantName);await page.waitForFunction(count=>(window.__KICKLAB_CHARACTER_POC__?.events?.filter(event=>event.name==='physics-contact').length||0)>count,counts.contact,{timeout:10000});if(contactName)await stateSnap(page,contactName);await page.waitForFunction(()=>window.__KICKLAB_CHARACTER_POC__?.clip==='follow-through',{timeout:5000});if(followName)await stateSnap(page,followName);if(recoveryName){await page.waitForFunction(()=>window.__KICKLAB_CHARACTER_POC__?.clip==='recover',{timeout:7000});await stateSnap(page,recoveryName);}if(celebrationName){await page.waitForFunction(()=>window.__KICKLAB_CHARACTER_POC__?.clip==='celebration',{timeout:10000});await stateSnap(page,celebrationName);}}
async function finishRound(page,{celebrationName,requireCelebration=false}={}){
  const celebration=page.locator('#goalCelebrationControls');
  await Promise.race([celebration.waitFor({state:'visible',timeout:15000}).catch(()=>null),page.locator('#results').waitFor({state:'visible',timeout:15000}).catch(()=>null)]);
  if(await celebration.isVisible()){if(celebrationName){await page.waitForFunction(()=>window.__KICKLAB_CHARACTER_POC__?.clip==='celebration',{timeout:5000});await stageSnap(page,celebrationName);}await page.locator('#goalCelebrationSkip').click();}else if(requireCelebration)throw new Error('celebration state was not rendered');
  await page.locator('#results').waitFor({state:'visible',timeout:7000});
}
async function chooseBoot(page,value,screenshot){
  await page.locator('#orientationDetailToggle').click();await page.locator('#settingsToggle').click();await page.locator('#settingsCategories [data-category="kit"]').click();await page.locator('#kitRoomToggle').click();await page.locator(`[data-k="boot"][data-v="${value}"]`).click();await page.locator('#settingsClose').click();await page.evaluate(()=>{window.__KICKLAB_CHARACTER_POC_QA__.configureScoringShot();document.querySelector('#lvlup').hidden=true;});await dismissToasts(page);await page.waitForTimeout(250);if(screenshot)await stateSnap(page,screenshot);const state=await audit(page),profiles={light:'speed',std:'classic',heavy:'power'},timings={light:.9,std:1,heavy:1.12};if(state.kitSelection?.boot!==value||state.kitProfile!==profiles[value]||Math.abs(state.kitTelemetry?.skillTimingMultiplier-timings[value])>1e-9)throw new Error(`kit renderer/telemetry mismatch for ${value}: ${JSON.stringify(state)}`);checks.push({label:`kit-${value}`,selection:state.kitSelection,profile:state.kitProfile,skillTimingMultiplier:state.kitTelemetry.skillTimingMultiplier,shotMultiplier:state.kitTelemetry.shotMultiplier});
}

const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,recordVideo:{dir:videoDir,size:{width:1440,height:1000}},reducedMotion:'no-preference'});
const page=await context.newPage();await setup(page);await dismissToasts(page);const baselineLegacy=await page.evaluate(()=>({progress:localStorage.getItem('impactlab.v1'),nickname:localStorage.getItem('impactlab.nick')}));
let current=await audit(page);if(current.effective!=='canvas'||!current.defaultOff)throw new Error(`default-off contract failed: ${JSON.stringify(current)}`);
const canvasHeap=await heap(page);await stageSnap(page,'01-desktop-default-canvas');checks.push({label:'default-canvas',audit:current});

current=await clickMode(page,'full');await stadiumAudit(page);const deterministicShot=await page.evaluate(()=>window.__KICKLAB_CHARACTER_POC_QA__.configureScoringShot());if(!deterministicShot.clear||!deterministicShot.under)throw new Error(`deterministic celebration shot is not scoring: ${JSON.stringify(deterministicShot)}`);await stateSnap(page,'02-desktop-full-ready');await page.screenshot({path:join(outputDir,'02-desktop-full-page.png'),fullPage:true});await showDetail(page);const fullHeap=await heap(page);await kick(page,{approachName:'03-desktop-full-approach',plantName:'04-desktop-full-plant',contactName:'05-desktop-full-contact',followName:'06-desktop-full-follow-through',recoveryName:'07-desktop-full-recovery',celebrationName:'08-desktop-full-celebration'});current=await audit(page);
if(current.maxContactErrorM>.03||current.maxPlantDriftM>.02||current.maxGroundPenetrationM>.01||!current.contactFrameAligned||current.contactFrameDelta>1)throw new Error(`geometry/contact threshold failed: ${JSON.stringify(current)}`);
checks.push({label:'full-contact',audit:current});await finishRound(page);

await page.locator('#rReplay').click();await page.waitForTimeout(500);await stateSnap(page,'09-desktop-normal-replay');checks.push({label:'normal-replay',speed:1});await page.locator('.rb-sp button[data-sp="0.25"]').click();await page.waitForTimeout(800);const replaySpeed=await page.locator('.rb-sp button[data-sp="0.25"]').getAttribute('aria-pressed');if(replaySpeed!=='true')throw new Error('quarter-speed replay did not activate');await stateSnap(page,'10-desktop-quarter-speed-replay');await showDetail(page,900);checks.push({label:'quarter-speed-replay',speed:.25});await page.locator('#rbExit').click();
if(await page.locator('#results').isVisible())await page.locator('#rNext').click();await page.waitForTimeout(350);

await chooseBoot(page,'light','11-desktop-kit-light');await chooseBoot(page,'heavy','12-desktop-kit-heavy');await chooseBoot(page,'std');

current=await clickMode(page,'reduced');await stateSnap(page,'13-desktop-reduced-ready');await kick(page,{plantName:'14-desktop-reduced-plant',contactName:'15-desktop-reduced-contact'});checks.push({label:'reduced-contact',audit:await audit(page)});await finishRound(page);if(await page.locator('#rNext').isVisible())await page.locator('#rNext').click();await page.waitForTimeout(250);

await clickMode(page,'canvas');await stageSnap(page,'16-desktop-canvas-fallback');checks.push({label:'explicit-canvas-fallback',audit:await audit(page)});
for(const [label,width,height] of [['tablet',768,1024],['mobile',390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(350);await clickMode(page,'full');await closeQaOverlays(page);await page.waitForTimeout(2100);await dismissToasts(page);await closeQaOverlays(page);await stateSnap(page,`17-${label}-full`);await page.screenshot({path:join(outputDir,`17-${label}-full-page.png`),fullPage:true});await showDetail(page,700);const responsive=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,stagePanel:!!document.querySelector('.stage .character-poc'),outsidePanel:!!document.querySelector('.game-frame>.character-poc')}));if(responsive.scrollWidth>width||responsive.bodyScrollWidth>width||responsive.stagePanel||!responsive.outsidePanel)throw new Error(`${label} responsive/stadium obstruction failed: ${JSON.stringify(responsive)}`);checks.push({label:`${label}-responsive`,responsive});}

const afterLegacy=await page.evaluate(()=>({progress:localStorage.getItem('impactlab.v1'),nickname:localStorage.getItem('impactlab.nick')})),beforeProgress=JSON.parse(baselineLegacy.progress),afterProgress=JSON.parse(afterLegacy.progress),beforeXp=Number(beforeProgress.xp||0),beforeGoals=Number(beforeProgress.goals||0),afterXp=Number(afterProgress.xp||0),afterGoals=Number(afterProgress.goals||0);if(!afterLegacy.progress||!afterLegacy.nickname||afterLegacy.nickname!==baselineLegacy.nickname||afterXp<beforeXp||afterGoals<beforeGoals)throw new Error(`legacy storage continuity failed: ${JSON.stringify({baselineLegacy,afterLegacy})}`);
const memoryDelta=canvasHeap!=null&&fullHeap!=null?Math.max(0,fullHeap-canvasHeap):null;if(memoryDelta!=null&&memoryDelta>120*1024*1024)throw new Error(`runtime memory delta ${memoryDelta} exceeds 120 MiB`);
checks.push({label:'storage-and-memory',legacyPreserved:true,baseline:{nickname:baselineLegacy.nickname,xp:beforeXp,goals:beforeGoals},after:{nickname:afterLegacy.nickname,xp:afterXp,goals:afterGoals},canvasHeap,fullHeap,memoryDelta});
const recorded=page.video();await page.close();await context.close();const rawVideo=await recorded.path();

const reducedContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});const reducedPage=await reducedContext.newPage();await setup(reducedPage,'full');const reducedAudit=await audit(reducedPage);if(reducedAudit.effective!=='reduced'||!reducedAudit.systemReduced)throw new Error(`system reduced-motion fallback failed: ${JSON.stringify(reducedAudit)}`);await stateSnap(reducedPage,'18-mobile-system-reduced');checks.push({label:'system-reduced-motion',audit:reducedAudit});await reducedContext.close();
await browser.close();

if(requests.length)throw new Error(`external requests observed: ${requests.join(', ')}`);
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
const mp4=join(outputDir,'lifelike-free-kick-walkthrough.mp4');const transcode=spawnSync('ffmpeg',['-y','-i',rawVideo,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name,r_frame_rate,nb_frames','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);const video=JSON.parse(probe.stdout);if(statSync(mp4).size<80_000||Number(video.format?.duration||0)<8)throw new Error(`MP4 failed validation (${statSync(mp4).size} bytes, ${video.format?.duration}s)`);
const characterSource=join(resolve(import.meta.dirname,'..'),'src/game/33-lifelike-free-kick.js'),sourceBytes=statSync(characterSource).size,gzip=spawnSync('gzip',['-c','-9',characterSource],{encoding:null});if(gzip.status!==0)throw new Error('gzip measurement failed');const compressedBytes=gzip.stdout.length;if(compressedBytes>6*1024*1024)throw new Error(`compressed character payload ${compressedBytes} exceeds 6 MiB`);
for(const [before,after,name] of [['before-desktop-ready.png','02-desktop-full-ready.png','comparison-desktop-ready.png'],['before-desktop-contact.png','05-desktop-full-contact.png','comparison-desktop-contact.png'],['before-mobile-full.png','17-mobile-full.png','comparison-mobile-full.png'],['before-human-qa-desktop-ready.png','02-desktop-full-ready.png','comparison-human-qa-stadium-desktop.png'],['before-human-qa-mobile.png','17-mobile-full.png','comparison-human-qa-stadium-mobile.png'],['before-human-qa-desktop-ready.png','02-desktop-full-ready-character.png','comparison-human-qa-arm-ready.png'],['before-human-qa-desktop-contact.png','05-desktop-full-contact-character.png','comparison-human-qa-arm-contact.png']])if(existsSync(join(outputDir,before))&&existsSync(join(outputDir,after))){const compare=spawnSync('ffmpeg',['-y','-i',join(outputDir,before),'-i',join(outputDir,after),'-filter_complex','[0:v]scale=-1:360[a];[1:v]scale=-1:360[b];[a][b]hstack=inputs=2','-frames:v','1',join(outputDir,name)],{encoding:'utf8'});if(compare.status!==0)throw new Error(`before/after comparison failed: ${compare.stderr}`);}
const files=readdirSync(outputDir).sort();const evidence=files.filter(file=>/\.(png|mp4|json)$/.test(file)).map(file=>{const data=require('node:fs').readFileSync(join(outputDir,file));return{file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};});
const report={revision,baseUrl,errors,externalRequests:requests,measurements:{sourceBytes,compressedBytes,binaryAssetBytes:0,textureBytes:0,canvasHeap,fullHeap,memoryDelta},thresholds:{contactM:.03,plantDriftM:.02,groundPenetrationM:.01,compressedBytes:6*1024*1024,memoryBytes:120*1024*1024},checks,video:{path:mp4,bytes:statSync(mp4).size,...video},evidence};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));
