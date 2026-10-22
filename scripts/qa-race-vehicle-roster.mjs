import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:4357/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-roster/browser');
const origin=new URL(base).origin;
mkdirSync(out,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({headless:true,executablePath});
const cars=['cobalt','kestrel','aegis'],rows=[],errors=[],external=[];

async function start(page,flag=true){
  const url=new URL(base);if(flag)url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',process.env.KICKLAB_QA_HEAD||'roster');
  await page.goto(url.toString(),{waitUntil:'networkidle'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:15000});
  if(flag)await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering',null,{timeout:12000});
}
async function pick(page,id){
  if(id==='cobalt')return;
  await page.locator('#orientationDetailToggle').click();
  await page.locator('#settingsToggle').click();
  await page.locator('[data-category="vehicle"]').click();
  await page.locator(`[data-setting="vehicle"][data-value="${id}"]`).click();
  await page.waitForFunction(id=>window.__KICKLAB_RACE_3D__?.assetUrl?.includes(`race-${id}/`)&&window.__KICKLAB_RACE_3D__?.status==='rendering',id,{timeout:12000});
  await page.locator('#settingsClose').click();
  if(await page.locator('[data-close-detail="orientation"]').isVisible())await page.locator('[data-close-detail="orientation"]').click();
}
async function frameP95(page){
  const values=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let last=performance.now();function next(now){frames.push(now-last);last=now;frames.length>=90?resolve(frames):requestAnimationFrame(next);}requestAnimationFrame(next);}));
  return +values.slice(5).sort((a,b)=>a-b)[Math.floor((values.length-5)*.95)].toFixed(2);
}
for(const [view,width,height] of [['desktop',1440,1000],['phone',390,844]])for(const id of cars){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(`${view}/${id}: ${e.message}`));
  page.on('request',request=>{if(!request.url().startsWith(origin)&&!request.url().startsWith('blob:')&&!request.url().startsWith('data:'))external.push(`${view}/${id}: ${request.url()}`);});
  await start(page);await pick(page,id);
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.phase==='orbit'&&window.__KICKLAB_RACE_3D__.orbit.elapsed>=1.5,null,{timeout:12000});
  const orbit=join(out,`${id}-${view}-orbit.png`);await page.locator('.stage:visible').first().screenshot({path:orbit});
  await page.locator('.race-orbit-panel button').click();
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done===true,null,{timeout:12000});
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:15000});
  if(await page.locator('.toast-close:visible').count())await page.locator('.toast-close:visible').first().click();
  const chase=join(out,`${id}-${view}-chase.png`);await page.locator('.stage:visible').first().screenshot({path:chase});
  const audit=await page.evaluate(()=>window.__KICKLAB_RACE_3D__);
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
  const p95Ms=await frameP95(page);
  rows.push({id,view,width,height,orbit,chase,audit,overflow,p95Ms});
  await context.close();
}

const videoContext=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:1440,height:1000}}});
const videoPage=await videoContext.newPage(),video=videoPage.video();
videoPage.on('pageerror',e=>errors.push(`video: ${e.message}`));
videoPage.on('request',request=>{if(!request.url().startsWith(origin)&&!request.url().startsWith('blob:')&&!request.url().startsWith('data:'))external.push(`video: ${request.url()}`);});
await start(videoPage);
for(const id of cars){
  await pick(videoPage,id);
  await videoPage.waitForTimeout(1800);
  if(await videoPage.locator('.race-orbit-panel button').isVisible())await videoPage.locator('.race-orbit-panel button').click();
  await videoPage.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:15000});
  await videoPage.waitForTimeout(1000);
}
await videoContext.close();
const webm=await video.path(),mp4=join(out,'race-vehicle-roster-walkthrough.mp4');
execFileSync('ffmpeg',['-y','-i',webm,'-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{stdio:'ignore'});
execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1',mp4]);

const noFlag=await browser.newPage();await start(noFlag,false);const defaultAudit=await noFlag.evaluate(()=>({systems:document.documentElement.dataset.raceSystems||null,roster:!!document.querySelector('[data-category="vehicle"]'),scene:window.__KICKLAB_RACE_3D__||null}));await noFlag.close();
const fallbackPage=await browser.newPage({viewport:{width:1440,height:1000}});
await fallbackPage.route('**/kicklab-race-kestrel/v1/kestrel-original.glb',route=>route.abort());
await start(fallbackPage);await fallbackPage.locator('#orientationDetailToggle').click();await fallbackPage.locator('#settingsToggle').click();await fallbackPage.locator('[data-category="vehicle"]').click();await fallbackPage.locator('[data-setting="vehicle"][data-value="kestrel"]').click();
await fallbackPage.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='canvas-fallback',null,{timeout:12000});
const fallbackAudit=await fallbackPage.evaluate(()=>({race:window.__KICKLAB_RACE_3D__,canvasVisible:document.querySelector('#race3')?.style.display==='none'}));
await fallbackPage.screenshot({path:join(out,'kestrel-asset-fallback.png')});await fallbackPage.close();
await browser.close();
const payload=cars.map(id=>({id,bytes:readFileSync(id==='cobalt'?'src/assets/3d/kicklab-race-direction-a/v1/direction-a-atlas.glb':`src/assets/3d/kicklab-race-${id}/v1/${id}-original.glb`).length}));
const failures=[];
for(const row of rows){
  if(row.audit.status!=='rendering'||row.audit.vehicleId!==row.id||!row.audit.vehicleAudit?.ok)failures.push(`${row.id}/${row.view}: vehicle render or topology`);
  if(row.audit.wheelPivots?.length!==4)failures.push(`${row.id}/${row.view}: wheel count`);
  if(row.overflow)failures.push(`${row.id}/${row.view}: overflow ${row.overflow}`);
  if(row.p95Ms>=33.3)failures.push(`${row.id}/${row.view}: p95 ${row.p95Ms}ms`);
}
if(defaultAudit.systems||defaultAudit.roster||defaultAudit.scene)failures.push('default behavior changed');
if(fallbackAudit.race?.status!=='canvas-fallback'||!fallbackAudit.canvasVisible)failures.push('canvas fallback failed');
if(errors.length||external.length)failures.push('browser errors or runtime egress');
if(payload.some(p=>p.bytes>1_200_000)||payload.reduce((n,p)=>n+p.bytes,0)>3_500_000)failures.push('payload budget');
const report={base,rows,defaultAudit,fallbackAudit,payload,errors,external,failures,video:mp4};
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({rows:rows.map(({id,view,audit,p95Ms,overflow})=>({id,view,status:audit.status,assetUrl:audit.assetUrl,p95Ms,overflow})),defaultAudit,fallback:{status:fallbackAudit.race?.status,canvasVisible:fallbackAudit.canvasVisible},payload,errors,external,failures,video:mp4},null,2));
if(failures.length)process.exitCode=1;
