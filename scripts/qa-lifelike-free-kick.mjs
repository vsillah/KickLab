import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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
async function stageSnap(page,name){await page.locator('.stage').screenshot({path:join(outputDir,`${name}.png`)});}
async function heap(page){return page.evaluate(()=>performance.memory?performance.memory.usedJSHeapSize:null);}
async function audit(page){return page.evaluate(()=>structuredClone(window.__KICKLAB_CHARACTER_POC__));}
async function clickMode(page,mode){await page.locator(`[data-character-mode="${mode}"]`).click();await page.waitForTimeout(250);const current=await audit(page);if(current.requested!==mode)throw new Error(`renderer did not select ${mode}`);return current;}
async function kick(page){const next=page.getByRole('button',{name:'Next shot (Space)'});if(await next.isVisible().catch(()=>false)){await next.click();await page.waitForTimeout(180);}const prior=await page.evaluate(()=>window.__KICKLAB_CHARACTER_POC__?.events?.filter(event=>event.name==='physics-contact').length||0);await page.getByRole('button',{name:'Kick (Space)'}).click();await page.waitForFunction(count=>(window.__KICKLAB_CHARACTER_POC__?.events?.filter(event=>event.name==='physics-contact').length||0)>count,prior,{timeout:10000});}
async function finishRound(page){
  const celebration=page.locator('#goalCelebrationControls');
  await Promise.race([celebration.waitFor({state:'visible',timeout:15000}).catch(()=>null),page.locator('#results').waitFor({state:'visible',timeout:15000}).catch(()=>null)]);
  if(await celebration.isVisible())await page.locator('#goalCelebrationSkip').click();
  await page.locator('#results').waitFor({state:'visible',timeout:7000});
}

const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,recordVideo:{dir:videoDir,size:{width:1440,height:1000}},reducedMotion:'no-preference'});
const page=await context.newPage();await setup(page);const baselineLegacy=await page.evaluate(()=>({progress:localStorage.getItem('impactlab.v1'),nickname:localStorage.getItem('impactlab.nick')}));
let current=await audit(page);if(current.effective!=='canvas'||!current.defaultOff)throw new Error(`default-off contract failed: ${JSON.stringify(current)}`);
const canvasHeap=await heap(page);await stageSnap(page,'01-desktop-default-canvas');checks.push({label:'default-canvas',audit:current});

current=await clickMode(page,'full');await stageSnap(page,'02-desktop-full-ready');const fullHeap=await heap(page);await kick(page);await stageSnap(page,'03-desktop-full-contact');current=await audit(page);
if(current.maxContactErrorM>.03||current.maxPlantDriftM>.02||current.maxGroundPenetrationM>.01||!current.contactFrameAligned||current.contactFrameDelta>1)throw new Error(`geometry/contact threshold failed: ${JSON.stringify(current)}`);
checks.push({label:'full-contact',audit:current});await finishRound(page);

await page.locator('#rReplay').click();await page.locator('.rb-sp button[data-sp="0.25"]').click();await page.waitForTimeout(800);const replaySpeed=await page.locator('.rb-sp button[data-sp="0.25"]').getAttribute('aria-pressed');if(replaySpeed!=='true')throw new Error('quarter-speed replay did not activate');await stageSnap(page,'04-desktop-quarter-speed-replay');checks.push({label:'quarter-speed-replay',speed:.25});await page.locator('#rbExit').click();
if(await page.locator('#results').isVisible())await page.locator('#rNext').click();await page.waitForTimeout(350);

current=await clickMode(page,'reduced');await stageSnap(page,'05-desktop-reduced-ready');await kick(page);await stageSnap(page,'06-desktop-reduced-contact');checks.push({label:'reduced-contact',audit:await audit(page)});await finishRound(page);if(await page.locator('#rNext').isVisible())await page.locator('#rNext').click();await page.waitForTimeout(250);

await clickMode(page,'canvas');await stageSnap(page,'07-desktop-canvas-fallback');checks.push({label:'explicit-canvas-fallback',audit:await audit(page)});
for(const [label,width,height] of [['tablet',768,1024],['mobile',390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(350);await clickMode(page,'full');await stageSnap(page,`08-${label}-full`);const responsive=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth}));if(responsive.scrollWidth>width||responsive.bodyScrollWidth>width)throw new Error(`${label} horizontal overflow: ${JSON.stringify(responsive)}`);checks.push({label:`${label}-responsive`,responsive});}

const afterLegacy=await page.evaluate(()=>({progress:localStorage.getItem('impactlab.v1'),nickname:localStorage.getItem('impactlab.nick')})),beforeProgress=JSON.parse(baselineLegacy.progress),afterProgress=JSON.parse(afterLegacy.progress),beforeXp=Number(beforeProgress.xp||0),beforeGoals=Number(beforeProgress.goals||0),afterXp=Number(afterProgress.xp||0),afterGoals=Number(afterProgress.goals||0);if(!afterLegacy.progress||!afterLegacy.nickname||afterLegacy.nickname!==baselineLegacy.nickname||afterXp<beforeXp||afterGoals<beforeGoals)throw new Error(`legacy storage continuity failed: ${JSON.stringify({baselineLegacy,afterLegacy})}`);
const memoryDelta=canvasHeap!=null&&fullHeap!=null?Math.max(0,fullHeap-canvasHeap):null;if(memoryDelta!=null&&memoryDelta>120*1024*1024)throw new Error(`runtime memory delta ${memoryDelta} exceeds 120 MiB`);
checks.push({label:'storage-and-memory',legacyPreserved:true,baseline:{nickname:baselineLegacy.nickname,xp:beforeXp,goals:beforeGoals},after:{nickname:afterLegacy.nickname,xp:afterXp,goals:afterGoals},canvasHeap,fullHeap,memoryDelta});
const recorded=page.video();await page.close();await context.close();const rawVideo=await recorded.path();

const reducedContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});const reducedPage=await reducedContext.newPage();await setup(reducedPage,'full');const reducedAudit=await audit(reducedPage);if(reducedAudit.effective!=='reduced'||!reducedAudit.systemReduced)throw new Error(`system reduced-motion fallback failed: ${JSON.stringify(reducedAudit)}`);await stageSnap(reducedPage,'09-mobile-system-reduced');checks.push({label:'system-reduced-motion',audit:reducedAudit});await reducedContext.close();
await browser.close();

if(requests.length)throw new Error(`external requests observed: ${requests.join(', ')}`);
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
const mp4=join(outputDir,'lifelike-free-kick-walkthrough.mp4');const transcode=spawnSync('ffmpeg',['-y','-i',rawVideo,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name,r_frame_rate,nb_frames','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);const video=JSON.parse(probe.stdout);if(statSync(mp4).size<80_000||Number(video.format?.duration||0)<8)throw new Error(`MP4 failed validation (${statSync(mp4).size} bytes, ${video.format?.duration}s)`);
const characterSource=join(resolve(import.meta.dirname,'..'),'src/game/33-lifelike-free-kick.js'),sourceBytes=statSync(characterSource).size,gzip=spawnSync('gzip',['-c','-9',characterSource],{encoding:null});if(gzip.status!==0)throw new Error('gzip measurement failed');const compressedBytes=gzip.stdout.length;if(compressedBytes>6*1024*1024)throw new Error(`compressed character payload ${compressedBytes} exceeds 6 MiB`);
const files=readdirSync(outputDir).sort();const evidence=files.filter(file=>/\.(png|mp4|json)$/.test(file)).map(file=>{const data=require('node:fs').readFileSync(join(outputDir,file));return{file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};});
const report={revision,baseUrl,errors,externalRequests:requests,measurements:{sourceBytes,compressedBytes,binaryAssetBytes:0,textureBytes:0,canvasHeap,fullHeap,memoryDelta},thresholds:{contactM:.03,plantDriftM:.02,groundPenetrationM:.01,compressedBytes:6*1024*1024,memoryBytes:120*1024*1024},checks,video:{path:mp4,bytes:statSync(mp4).size,...video},evidence};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));
