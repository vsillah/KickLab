import {createRequire} from 'node:module';
import {existsSync,mkdirSync,renameSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5887/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-result-continuation');
const head=process.env.KICKLAB_QA_HEAD;
if(!head)throw Error('Set KICKLAB_QA_HEAD to the exact commit under review.');
mkdirSync(out,{recursive:true});
const url=new URL(base);
for(const flag of ['raceExpansion','raceCompetition','raceTelemetry','raceInstruments','racePreflight','raceSimulator'])url.searchParams.set(flag,'prototype');
url.searchParams.set('raceResultsQA','1');
url.searchParams.set('rev',head);
const report={head,url:url.href,states:[],errors:[],external:[],requests:[]};
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync),args:['--enable-webgl']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await context.newPage(),video=page.video();
page.on('pageerror',error=>report.errors.push(error.message));
await page.route('**/*',route=>{const target=route.request().url();report.requests.push(target);if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(target);route.abort();}});

function assert(condition,message){if(!condition)throw Error(message);}
async function startAnalogHeat(){
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:15000});
  await page.click('#racePreflightNext');
  await page.click('[data-preflight-mode="drag"]');
  for(let i=0;i<3;i++)await page.click('#racePreflightNext');
  await page.click('[data-preflight-control="analog"]');
  await page.click('#racePreflightNext');
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:30000});
  const live=await page.evaluate(()=>{
    const dial=document.querySelector('#raceActionDial'),box=dial.getBoundingClientRect(),visible=selector=>{const el=document.querySelector(selector);return!!el?.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'};
    return{renderer:window.__KICKLAB_RACE_3D__?.status,vehicle:window.__KICKLAB_RACE_3D__?.vehicle,canvasFallback:window.__KICKLAB_RACE_MODES_QA__?.state()?.canvasFallback,instruments:document.querySelector('.control-deck')?.classList.contains('race-instruments-live'),dial:visible('#raceActionDial'),dialController:dial.dataset.controller,dialInBounds:box.x>=0&&box.y>=0&&box.right<=innerWidth&&box.bottom<=innerHeight,legacyDpad:visible('#padL'),legacyGas:visible('#padR [data-id="gas"]'),legacyBrake:visible('#padR [data-id="brake"]'),storage:Object.keys(localStorage).sort()};
  });
  report.states.push({phase:'released-live-controls',...live});
  assert(live.renderer==='rendering'&&live.vehicle&&!live.canvasFallback&&live.instruments&&live.dial&&live.dialController==='analog'&&live.dialInBounds&&!live.legacyDpad&&!live.legacyGas&&!live.legacyBrake,'Live recording would show stale or missing controls: '+JSON.stringify(live));
  await page.screenshot({path:join(out,'released-live-controls.png')});
  await page.waitForTimeout(1400);
}
async function finishRealDrag(){
  await page.keyboard.down('w');
  try{
    for(let gear=1;gear<=3;gear++){
      await page.waitForFunction(()=>{const dial=document.querySelector('#raceActionDial');return dial?.dataset.shiftTiming==='optimal'&&dial.dataset.selected==='shift'||!!document.querySelector('#results')?.getClientRects().length},null,{timeout:25000,polling:50});
      assert(!await page.locator('#results').isVisible(),'Run ended before gear '+gear+' shift');
      await page.locator('#raceDialAction').click();
    }
    await page.locator('#results').waitFor({state:'visible',timeout:115000});
  }finally{await page.keyboard.up('w')}
  await page.locator('#raceReplayPreview').scrollIntoViewIfNeeded();
  const result=await page.evaluate(()=>{const primary=document.querySelector('#rNext'),save=document.querySelector('#rRaceGarage');return{title:document.querySelector('#rTitle').textContent,primary:primary.textContent.trim(),primaryFirst:!!(primary.compareDocumentPosition(save)&Node.DOCUMENT_POSITION_FOLLOWING),saveName:save.getAttribute('aria-label'),saveTitle:save.title,saveText:save.textContent.trim(),renderer:window.__KICKLAB_RACE_3D__?.status,vehicle:window.__KICKLAB_RACE_3D__?.vehicle,record:window.__KICKLAB_RACE_RESULTS_QA__?.state()||null}});
  report.states.push({phase:'successful-standalone-result',...result});
  assert(/COMPLETE|FINISHED|MET/i.test(result.title)&&result.primary==='Keep racing'&&result.primaryFirst&&result.saveName==='Save & Exit'&&result.saveTitle==='Save & Exit'&&!result.saveText&&result.renderer==='rendering'&&result.vehicle,'Successful result actions incorrect: '+JSON.stringify(result));
  await page.locator('#results').evaluate(element=>{element.scrollTop=0});
  await page.waitForTimeout(650);
  await page.locator('#rNext').scrollIntoViewIfNeeded();
  await page.screenshot({path:join(out,'successful-standalone-result.png')});
  await page.waitForTimeout(1300);
}

try{
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');
  await startAnalogHeat();
  await finishRealDrag();
  const progressBefore=await page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return{activeId:value.activeId,progress:JSON.stringify(value.profiles.find(profile=>profile.id===value.activeId)?.progress),record:window.__KICKLAB_RACE_RESULTS_QA__?.state()||null}});
  await page.click('#rNext');
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:15000});
  const reentry=await page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('kicklab.profiles.v1')),draft=window.__KICKLAB_RACE_PREFLIGHT_QA__?.state()?.draft;return{home:!document.querySelector('#modeHome').hidden,results:!document.querySelector('#results').hidden,venueVisible:!!document.querySelector('#racePreflightContent [data-preflight-venue]')?.getClientRects().length,phase:window.__KICKLAB_RACE_PREFLIGHT_QA__?.state()?.phase,locationStage:window.__KICKLAB_RACE_PREFLIGHT_QA__?.state()?.draft?.venue,draft,activeId:value.activeId,progress:JSON.stringify(value.profiles.find(profile=>profile.id===value.activeId)?.progress),record:window.__KICKLAB_RACE_RESULTS_QA__?.state()||null}});
  report.states.push({...reentry,phase:'keep-racing-venue-reentry'});
  assert(!reentry.home&&!reentry.results&&reentry.venueVisible&&reentry.phase===0&&reentry.activeId===progressBefore.activeId&&reentry.progress===progressBefore.progress&&reentry.draft?.control==='analog'&&reentry.draft?.mode==='drag'&&reentry.record?.recordId===progressBefore.record?.recordId,'Keep racing lost progress, setup, recording, or venue choice: '+JSON.stringify(reentry));
  await page.screenshot({path:join(out,'keep-racing-venue-reentry.png')});
  await page.waitForTimeout(1300);
  await startAnalogHeat();
  await finishRealDrag();
  await page.click('#raceReplayPreview');
  await page.locator('#rbar').waitFor({state:'visible',timeout:15000});
  const replay=await page.evaluate(()=>{const exit=document.querySelector('#rbExit'),box=exit.getBoundingClientRect(),visible=selector=>{const el=document.querySelector(selector);return!!el?.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'};return{bar:visible('#rbar'),exitHit:document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)?.closest('button')?.id,gameplayControls:['#pad','#raceActionDial','#raceAnalogActions','.sim-controls'].filter(visible),renderer:window.__KICKLAB_RACE_3D__?.status,vehicle:window.__KICKLAB_RACE_3D__?.vehicle}});
  report.states.push({phase:'replay-transport',...replay});
  assert(replay.bar&&replay.exitHit==='rbExit'&&!replay.gameplayControls.length&&replay.renderer==='rendering'&&replay.vehicle,'Replay transport or control-free state failed: '+JSON.stringify(replay));
  await page.screenshot({path:join(out,'control-free-replay.png')});
  await page.waitForTimeout(1900);
  await page.click('#rbExit');
  assert(!await page.locator('#rbar').isVisible(),'Replay Exit did not close transport');
}catch(error){report.errors.push(error.stack||String(error))}
await context.close();await browser.close();
const webm=join(out,'race-result-continuation-'+head.slice(0,10)+'.webm');
renameSync(await video.path(),webm);
const mp4=join(out,'race-result-continuation-'+head.slice(0,10)+'.mp4');
const encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-i',webm,'-vf','scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});
if(encoded.status!==0)report.errors.push('MP4 encode failed: '+encoded.stderr);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-show_entries','stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});
if(probe.status!==0)report.errors.push('MP4 probe failed: '+probe.stderr);
else{report.mp4=mp4;report.media=JSON.parse(probe.stdout)}
report.webm=webm;
writeFileSync(join(out,'walkthrough-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,url:url.href,states:report.states.map(state=>state.phase),errors:report.errors,external:report.external,mp4:report.mp4,media:report.media},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
