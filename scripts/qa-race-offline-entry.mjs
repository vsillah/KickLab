// Exact-head, synthetic-profile browser proof for the loaded-home offline entry.
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Exact-head capture requires a clean worktree.');
const origin=process.env.KICKLAB_QA_ORIGIN||'http://127.0.0.1:47777';
const out=resolve('qa-artifacts/race-offline-entry',head.slice(0,12));
const raw=join(out,'raw');mkdirSync(raw,{recursive:true});
const executable=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({headless:true,executablePath:executable});
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,recordVideo:{dir:raw,size:{width:1280,height:720}}});
await context.addInitScript(()=>{
  const attempts=[];Object.defineProperty(window,'__KICKLAB_PERMISSION_ATTEMPTS__',{value:attempts});
  const permissions=navigator.permissions;if(permissions?.query){const query=permissions.query.bind(permissions);permissions.query=descriptor=>{attempts.push(`permissions:${descriptor?.name||'unknown'}`);return query(descriptor);};}
  for(const method of ['getCurrentPosition','watchPosition'])if(navigator.geolocation?.[method]){const original=navigator.geolocation[method].bind(navigator.geolocation);navigator.geolocation[method]=(...args)=>{attempts.push(`geolocation:${method}`);return original(...args);};}
  if(navigator.mediaDevices?.getUserMedia){const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=(...args)=>{attempts.push('media:getUserMedia');return original(...args);};}
});
const page=await context.newPage();
const errors=[],external=[],documents=[],downloads=[],popups=[];
let offline=false;
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{const url=request.url();if(offline&&request.isNavigationRequest())documents.push(url);if(!url.startsWith(origin+'/')&&!url.startsWith('data:')&&!url.startsWith('blob:'))external.push(url);});
page.on('download',download=>downloads.push(download.suggestedFilename()));
page.on('popup',popup=>popups.push(popup.url()));
context.on('page',opened=>{if(opened!==page)popups.push(opened.url());});
try{
  const url=new URL('/kicklab.html',origin);url.searchParams.set('qa','offline-entry');url.searchParams.set('rev',head);
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#modeHome').waitFor({state:'visible'});
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D_PREP__?.status==='ready',null,{timeout:10000});
  const prepared=await page.evaluate(()=>window.__KICKLAB_RACE_3D_PREP__);
  if(!prepared.bytes||prepared.bytes>2_000_000)throw Error('Selected vehicle preparation invalid');
  await page.evaluate(()=>{const note=document.createElement('div');note.id='raceOfflineProof';note.style.cssText='position:fixed;z-index:99999;pointer-events:none;right:16px;top:16px;background:#fff;color:#153044;padding:12px 16px;border:3px solid #16836b;border-radius:8px;font:700 18px system-ui;box-shadow:0 3px 12px #0005';note.textContent='Selected Race 3D asset ready in memory';document.body.append(note);});
  await page.waitForTimeout(650);
  offline=true;await context.setOffline(true);
  await page.locator('#lab-tab-race').click();
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:8000});
  await page.waitForTimeout(1100);
  const flagged=new URL(page.url());
  for(const [key,value] of Object.entries(await page.evaluate(()=>globalThis.KickLabRaceOrigin.HOME_FLAGS)))if(flagged.searchParams.get(key)!==value)throw Error(`Missing ${key} in in-place URL`);
  if(documents.length)throw Error(`Document request after network loss: ${documents.join(', ')}`);
  await page.locator('#racePreflightClose').click();
  await page.locator('#game-cockpit').waitFor({state:'visible'});
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering',null,{timeout:15000});
  const race3d=await page.evaluate(()=>window.__KICKLAB_RACE_3D__);
  if(race3d.assetUrl!==prepared.url||!race3d.vehicleAudit?.ok||!(await page.locator('#race3').isVisible()))throw Error('Selected 3D vehicle did not render');
  await page.evaluate(()=>{document.querySelector('#raceOfflineProof').textContent='Offline · selected Race 3D rendering';});
  await page.waitForTimeout(800);
  const mode=await page.evaluate(()=>document.documentElement.dataset.kicklabMode);
  if(mode!=='race')throw Error(`Expected Race cockpit, got ${mode}`);
  const deltas=await page.evaluate(()=>new Promise(resolve=>{const values=[];let last=null;function tick(now){if(last!==null)values.push(now-last);last=now;if(values.length<100)requestAnimationFrame(tick);else resolve(values);}requestAnimationFrame(tick);}));
  const sorted=deltas.slice(5).sort((a,b)=>a-b),p95Ms=sorted[Math.floor(sorted.length*.95)];
  if(p95Ms>50)throw Error(`Visible-browser p95 ${p95Ms.toFixed(1)} ms exceeds 50 ms`);
  const permissions=await page.evaluate(()=>window.__KICKLAB_PERMISSION_ATTEMPTS__||[]);
  if(errors.length||external.length||permissions.length||downloads.length||popups.length)throw Error(JSON.stringify({errors,external,permissions,downloads,popups}));
  const report={head,origin,loadedUrl:url.href,offlineRaceUrl:page.url(),prepared,race3d:{status:race3d.status,assetUrl:race3d.assetUrl,vehicleId:race3d.vehicleId,vehicleAudit:race3d.vehicleAudit},documentRequestsAfterOffline:documents,p95Ms,errors,external,permissions,downloads,popups};
  writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{
  const video=page.video();await page.close();await context.close();await browser.close();
  const source=await video.path(),target=join(out,`kicklab-offline-race-entry-${head.slice(0,12)}.mp4`);
  const encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-i',source,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',target],{encoding:'utf8'});
  if(encoded.status!==0)throw Error(`MP4 encoding failed: ${encoded.stderr}`);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',target],{encoding:'utf8'});
  if(probe.status!==0)throw Error(`MP4 probe failed: ${probe.stderr}`);
  console.log(JSON.stringify({mp4:target,probe:JSON.parse(probe.stdout)},null,2));
}
