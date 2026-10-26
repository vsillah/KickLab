import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const base=process.argv[2]||'http://127.0.0.1:5271/kicklab.html';
const out=resolve(process.argv[3]||`qa-artifacts/race-contextual-coach/${head.slice(0,12)}`);
mkdirSync(out,{recursive:true});
const report={head,base,cases:[],errors:[],external:[]};
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});

async function run(name,width,height,reduced){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:out,size:{width,height}}});
  await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
  const page=await context.newPage(),video=page.video(),url=new URL(base);
  for(const key of ['raceExpansion','raceInstruments','raceSystems','raceTelemetry','raceFinishes','raceCoaching'])url.searchParams.set(key,key==='raceSystems'?'proxy':'prototype');
  url.searchParams.set('raceCoachQA','1');url.searchParams.set('rev',head.slice(0,12));
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${target}`);return route.abort();});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
    const start=page.locator('#raceCoachSetupStart');await start.waitFor({state:'visible',timeout:20000});
    const deadline=Date.now()+45000;while(Date.now()<deadline){if(await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.dynamics?.state==='run'))break;if(await start.isVisible()&&await start.isEnabled())await start.click();await page.waitForTimeout(500);}
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:1000});
    await page.locator('.stage').scrollIntoViewIfNeeded();await page.waitForTimeout(700);
    let state=await page.evaluate(()=>({coach:window.__KICKLAB_RACE_CONTEXTUAL_QA__?.state(),dial:document.querySelector('#raceActionDial')?.getAttribute('aria-label'),metric:document.querySelector('#raceDialMetric')?.getAttribute('aria-label'),camera:window.__KICKLAB_RACE_3D__?.finishCameraCue,storage:Object.keys(localStorage).sort()}));
    if(!state.coach?.enabled||!state.metric?.includes('RPM')||!state.camera?.outsideRoad)throw new Error(`initial presentation ${JSON.stringify(state)}`);
    if(!state.storage.every(key=>['impactlab.nick','impactlab.v1','kicklab.profiles.v1'].includes(key)))throw new Error(`unexpected storage ${state.storage}`);
    await page.evaluate(()=>{const qa=window.__KICKLAB_RACE_CONTEXTUAL_QA__;qa.result('shift','early','Early shift fixture.');qa.result('shift','late','Late shift fixture.');qa.result('shift','success','Optimal shift fixture.');qa.result('shift','success','Second optimal shift fixture.');});
    state=await page.evaluate(()=>window.__KICKLAB_RACE_CONTEXTUAL_QA__.state());if(!state.progress.actions.shift.mastered)throw new Error('mastery failed');
    await page.evaluate(()=>{const qa=window.__KICKLAB_RACE_CONTEXTUAL_QA__;qa.result('shift','miss','First missed band.');qa.result('shift','miss','Second missed band.');});
    state=await page.evaluate(()=>window.__KICKLAB_RACE_CONTEXTUAL_QA__.state());if(state.progress.actions.shift.mastered||state.progress.actions.shift.misses!==2)throw new Error('contextual return failed');
    await page.keyboard.down('Space');await page.waitForFunction(()=>window.__KICKLAB_RACE_CONTEXTUAL_QA__?.state()?.ghost==='action',null,{timeout:20000});
    await page.screenshot({path:join(out,`${name}-coaching.png`)});
    await page.waitForFunction(()=>['approach','ready','success','missed'].includes(window.__KICKLAB_RACE_3D__?.finishCameraCue?.state),null,{timeout:35000});
    const approach=await page.evaluate(()=>({camera:window.__KICKLAB_RACE_3D__?.finishCameraCue,dial:document.querySelector('#raceActionDial')?.dataset.coachCue,ghost:window.__KICKLAB_RACE_CONTEXTUAL_QA__?.state()?.ghost}));
    await page.screenshot({path:join(out,`${name}-finish-camera.png`)});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.finishCameraCue?.state==='ready',null,{timeout:20000});await page.screenshot({path:join(out,`${name}-ready-camera.png`)});await page.waitForTimeout(500);
    await page.keyboard.up('Space');
    await page.evaluate(()=>window.__KICKLAB_RACE_CONTEXTUAL_QA__.cameraFixture('success'));
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.finishCameraCue?.state==='success');await page.waitForTimeout(500);await page.screenshot({path:join(out,`${name}-success-camera-fixture.png`)});
    await page.evaluate(()=>window.__KICKLAB_RACE_CONTEXTUAL_QA__.cameraFixture('missed'));
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.finishCameraCue?.state==='missed');await page.screenshot({path:join(out,`${name}-missed-camera-fixture.png`)});await page.waitForTimeout(500);
    if(reduced){const animation=await page.locator('.race-control-ghost').evaluate(node=>getComputedStyle(node).animationName);if(animation!=='none')throw new Error(`reduced motion ${animation}`);}
    await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));});await page.waitForTimeout(250);
    const cancelled=await page.evaluate(()=>window.__KICKLAB_RACE_CONTEXTUAL_QA__.state());if(cancelled.ghost)throw new Error('ghost survived blur');
    await page.locator('#racePhoneToolsToggle').click();await page.locator('#raceCoachHistory summary').click();await page.locator('#raceCoachHistory').scrollIntoViewIfNeeded();await page.screenshot({path:join(out,`${name}-history.png`)});await page.waitForTimeout(900);
    const history=await page.locator('#raceCoachHistoryList').textContent();if(!history.includes('Gesture mastered')||!history.includes('Cue returned'))throw new Error('Coach history missing mastery lifecycle');
    await page.evaluate(()=>window.__KICKLAB_RACE_CONTEXTUAL_QA__.reset());const reset=await page.evaluate(()=>window.__KICKLAB_RACE_CONTEXTUAL_QA__.state());if(reset.progress.actions.shift.mastered||reset.progress.actions.shift.misses)throw new Error('profile reset failed');
    report.cases.push({name,width,height,reduced,url:url.toString(),initial:state,approach,cameraSuccessAndMissed:'controlled canonical state fixtures',cancelled:cancelled.ghost});
    await context.close();return await video.path();
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);await context.close().catch(()=>{});return null;}
}
const clips=[];for(const [name,width,height,reduced] of [['phone',390,844,false],['tablet-reduced',768,1024,true],['desktop',1440,900,false]]){const source=await run(name,width,height,reduced);if(source)clips.push(source);}
await browser.close();
if(clips.length===3&&!report.errors.length&&!report.external.length){
  const parts=[];for(let i=0;i<clips.length;i++){const target=join(out,`${i+1}.mp4`),encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-i',clips[i],'-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2','-r','30','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',target],{encoding:'utf8'});if(encoded.status!==0){report.errors.push(encoded.stderr);break;}parts.push(target);}
  if(!report.errors.length){const list=join(out,'concat.txt');writeFileSync(list,parts.map(path=>`file '${path}'`).join('\n')+'\n');const target=join(out,`race-contextual-coach-${head.slice(0,12)}.mp4`),encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',target],{encoding:'utf8'});if(encoded.status!==0)report.errors.push(encoded.stderr);else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',target],{encoding:'utf8'});report.media={path:target,bytes:statSync(target).size,probe:JSON.parse(probe.stdout)};if(report.media.bytes<100000||Number(report.media.probe.format.duration)<10)report.errors.push('MP4 failed size or duration gate');}}
}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({head,cases:report.cases.map(({name,approach})=>({name,approach})),media:report.media,errors:report.errors,external:report.external},null,2));if(report.errors.length||report.external.length||!report.media)process.exitCode=1;
