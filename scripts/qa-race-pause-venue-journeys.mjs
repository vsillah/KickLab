// Local exact-head check of pause Save & Exit within the Marine and Forest journeys.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the exact commit.');
const base=new URL(process.argv[2]||'http://127.0.0.1:63339/pages/index.html');
if(base.protocol!=='http:'||!['127.0.0.1','localhost'].includes(base.hostname)||base.pathname!=='/pages/index.html')throw Error('Use the trusted localhost Pages build.');
const out=resolve(process.argv[3]||'qa-artifacts/race-pause-venue-journeys');mkdirSync(out,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const url=new URL(base);for(const flag of ['raceExpansion','raceTelemetry','raceProgression','racePreflight'])url.searchParams.set(flag,'prototype');url.searchParams.set('rev',head);
const response=await fetch(url);if(!response.ok||sha(Buffer.from(await response.arrayBuffer()))!==sha(readFileSync('dist/pages/index.html')))throw Error('Served Pages HTML does not match this build.');
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const report={head,artifactSha256:sha(readFileSync('dist/pages/index.html')),cases:[],errors:[],external:[],httpErrors:[]};
const snapshot=page=>page.evaluate(()=>{const store=JSON.parse(localStorage.getItem('kicklab.profiles.v1')),active=store.profiles.find(profile=>profile.id===store.activeId),progress=active.progress;return{home:!document.querySelector('#modeHome').hidden,preflight:!document.querySelector('#racePreflight').hidden,paused:!document.querySelector('#gamePacingOverlay').hidden&&document.querySelector('#gamePacingOverlay').dataset.state==='paused',results:!document.querySelector('#results').hidden,progress,venue:window.__KICKLAB_RACE_PROGRESSION_QA__.state().venue,raceState:window.__KICKLAB_RACE_PREFLIGHT_QA__.state().raceState};});
const score=progress=>JSON.stringify({xp:progress.xp,stats:progress.stats,badges:progress.badges,raceProgression:progress.raceProgression,raceChampionship:progress.raceChampionship,raceCompetition:progress.raceCompetition,raceMastery:progress.raceMastery,raceProfileRecords:progress.raceProfileRecords});
for(const item of [{width:1113,height:834,venue:'marine',events:['Damp Entry','Brake Consistency'],video:true},{width:390,height:844,venue:'forest',events:['Descent Entry','Clean Left','Heat Control'],video:false}]){
  const label=`${item.width}/${item.venue}`,context=await browser.newContext({viewport:{width:item.width,height:item.height},hasTouch:item.width===390,reducedMotion:'reduce',...(item.video?{recordVideo:{dir:out,size:{width:item.width,height:item.height}}}:{})});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));page.on('response',response=>{if(response.status()>=400)report.httpErrors.push(`${label}: ${response.status()} ${response.url()}`);});
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(base.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${label}: ${target}`);route.abort();}});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.evaluate(()=>window.__KICKLAB_RACE_PROGRESSION_QA__.unlockForQA(2));
    await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:30000});
    await page.click(`[data-preflight-venue="${item.venue}"]`);
    const events=await page.locator('.race-preflight-event-list li').allInnerTexts();
    if(events.length!==item.events.length||item.events.some((name,index)=>!events[index].includes(name))||new Set(events).size!==events.length)throw Error(`Missing or repeated venue events: ${JSON.stringify(events)}`);
    for(let step=0;step<4;step++)await page.click('#racePreflightNext');
    const arrival=await page.evaluate(()=>({back:document.querySelector('#racePreflightBack').disabled,next:document.querySelector('#racePreflightNext').disabled}));
    if(!arrival.back||!arrival.next)throw Error('Arrival navigation remained enabled');
    await page.locator('#racePreflight').waitFor({state:'hidden',timeout:16000});
    const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_PREFLIGHT_QA__?.state().raceState==='run',null,{timeout:30000});
    const before=await snapshot(page);if(before.venue!==item.venue)throw Error(`Active venue changed: ${before.venue}`);
    await page.locator('#cv').click();await page.locator('#gamePacingSaveExit').waitFor({state:'visible'});
    const paused=await snapshot(page);if(!paused.paused||paused.results)throw Error('Race did not enter manual pause');
    if(item.video)await page.screenshot({path:join(out,`marine-pause-${head.slice(0,8)}.png`)});
    await page.click('#gamePacingSaveExit');const exited=await snapshot(page);
    if(!exited.home||exited.results||score(exited.progress)!==score(before.progress)||exited.progress.raceVenue!==item.venue)throw Error('Safe exit changed score or lost venue');
    await page.reload({waitUntil:'domcontentloaded'});if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:30000});
    if(await page.locator(`[data-preflight-venue="${item.venue}"]`).getAttribute('aria-pressed')!=='true')throw Error('Re-entry lost saved venue');
    await page.click(`[data-preflight-venue="${item.venue}"]`);
    const returned=await page.locator('.race-preflight-event-list li').allInnerTexts();
    if(returned.length!==item.events.length||item.events.some((name,index)=>!returned[index].includes(name))||new Set(returned).size!==returned.length)throw Error('Re-entry lost or repeated venue events');
    if(item.video)await page.screenshot({path:join(out,`marine-return-${head.slice(0,8)}.png`)});
    report.cases.push({label,eventCount:events.length,scoreUnchanged:true,savedVenue:true,reentryEvents:true});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);}
  const video=page.video();await context.close();
  if(video&&item.video&&!report.errors.some(error=>error.startsWith(label))){const mp4=join(out,`marine-pause-save-exit-${head.slice(0,8)}.mp4`),encode=spawnSync('ffmpeg',['-y','-i',await video.path(),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'}),decode=encode.status===0?spawnSync('ffmpeg',['-v','error','-i',mp4,'-f','null','-'],{encoding:'utf8'}):null;if(encode.status!==0||decode?.status!==0||statSync(mp4).size<50000)report.errors.push(`${label}: MP4 encode or decode failed`);else report.video={mp4,bytes:statSync(mp4).size};}
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length||report.external.length||report.httpErrors.length)process.exitCode=1;
