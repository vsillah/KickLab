import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base=process.argv[2]||'http://127.0.0.1:5271/kicklab.html',out=resolve(process.argv[3]||`qa-artifacts/race-coach-personas/${head.slice(0,12)}`);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:390,height:844}}});
await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
const page=await context.newPage(),video=page.video(),url=new URL(base),report={head,errors:[],external:[],events:[]};
for(const [key,value] of Object.entries({raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',raceCoaching:'prototype',raceCoachPersonas:'prototype',raceCoachQA:'1',rev:head.slice(0,12)}))url.searchParams.set(key,value);
page.on('pageerror',error=>report.errors.push(error.message));
await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))return route.continue();report.external.push(target);return route.abort();});
try{
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  await page.locator('#racePreflightCoach').waitFor({state:'visible',timeout:20000});await page.waitForTimeout(700);
  await page.click('#racePreflightCoach');await page.locator('#raceCoachRoster').waitFor({state:'visible'});await page.waitForTimeout(800);
  await page.locator('[data-coach-id="imani"]').click();await page.waitForTimeout(900);await page.click('#raceCoachRosterClose');report.events.push('selected Coach Imani from Race preflight');
  await page.locator('[data-preflight-mode="drag"]').click();for(let i=0;i<3;i++)await page.click('#racePreflightNext');
  await page.waitForTimeout(700);await page.click('#racePreflightNext');await page.locator('#racePreflight').waitFor({state:'hidden',timeout:12000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:20000});
  report.events.push('real Drag run started');await page.waitForTimeout(700);
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.v>=12.7,null,{timeout:14000});
  let actionName=await page.locator('#raceDialActionName').textContent();
  if(!actionName?.includes('Shift')&&await page.locator('#raceDialPrevious').isVisible()){await page.click('#raceDialPrevious');actionName=await page.locator('#raceDialActionName').textContent();}
  if(actionName?.includes('Shift')){await page.click('#raceDialAction');report.events.push('real shift action at the speed band');}
  else if(actionName?.includes('NOS')){await page.click('#raceDialAction');report.events.push('real NOS action during the run');}
  else report.events.push(`available Race action: ${actionName||'none'}`);
  await page.waitForTimeout(1000);await page.keyboard.up('Space');
  await page.click('#racePhoneToolsToggle');await page.locator('#raceCoachHistory summary').click();await page.waitForTimeout(950);
  const historyCount=await page.locator('#raceCoachHistoryList li').count(),history=await page.locator('#raceCoachHistoryList').textContent();if(!historyCount)throw Error('real Race Coach history remained empty');
  report.events.push(`${historyCount} real-gameplay Coach history cues: ${history?.slice(0,120)}`);
  await page.locator('#raceCoachHistory summary').click();await page.click('#racePhoneToolsToggle');await page.keyboard.down('Space');
  await page.waitForFunction(()=>['done','crashed'].includes(window.__KICKLAB_RACE_3D__?.dynamics?.state),null,{timeout:40000});await page.keyboard.up('Space');
  await page.locator('#results').waitFor({state:'visible',timeout:12000});await page.waitForTimeout(1400);report.events.push('real run result and Coach assessment');
  await page.locator('#raceResultCoach').click();await page.locator('#rvBack').waitFor({state:'visible'});await page.waitForTimeout(1000);report.events.push('deeper Coach review');
  await page.click('#rvClose');await page.waitForTimeout(500);
  if(await page.locator('#rRaceGarage').isVisible()){await page.click('#rRaceGarage');await page.locator('#modeHome').waitFor({state:'visible'});report.events.push('Save & Exit returned home');}
  const saved=await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return data.profiles.find(profile=>profile.id===data.activeId)?.progress.raceCoachId;});if(saved!=='imani')throw Error(`Save & Exit lost Coach: ${saved}`);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#raceCoachChoose')?.textContent.includes('Imani'));report.events.push('Coach Imani restored after reload');await page.waitForTimeout(900);
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});if(await page.locator('#racePreflight').isVisible())await page.click('#racePreflightClose');
  const returnOrbit=page.locator('.race-orbit-panel button');
  if(await returnOrbit.isVisible())await returnOrbit.click();
  await page.locator('.race-orbit-panel').waitFor({state:'hidden',timeout:12000}).catch(()=>{});
  const collapse=page.locator('#controllerCollapseButton');
  if(await collapse.isVisible()&&await collapse.getAttribute('aria-expanded')==='true')await collapse.click();
  if(await collapse.getAttribute('aria-expanded')!=='false')throw Error('expression showcase did not collapse inactive controls');
  report.events.push('non-gameplay Coach expression showcase keeps controls collapsed');
  for(const [coach,select] of [['Imani',false],['Mateo',true]]){
    if(select){if(await page.locator('#racePreflight').isVisible())await page.click('#racePreflightClose');await page.click('#racePhoneToolsToggle');await page.click('#raceCoachChoose');await page.locator('[data-coach-id="mateo"]').click();await page.click('#raceCoachRosterClose');await page.click('#racePhoneToolsToggle');}
    for(const [outcome,expected] of [['success','celebrating'],['miss','supportive concern']]){
      await page.evaluate(value=>window.__KICKLAB_RACE_CONTEXTUAL_QA__.result('shift',value,value==='success'?'Optimal timing.':'Timing missed.'),outcome);
      await page.waitForTimeout(900);
      const label=await page.locator('#coachAv').getAttribute('aria-label');
      if(!label?.includes(expected))throw Error(`${coach} ${outcome} expression: ${label}`);
      report.events.push(`${coach} Race shift ${outcome}: ${label}`);
    }
  }
  if(await page.locator('#racePreflight').isVisible())await page.click('#racePreflightClose');await page.click('#racePhoneToolsToggle');await page.click('#raceCoachChoose');await page.locator('[data-coach-id="imani"]').click();await page.click('#raceCoachRosterClose');await page.click('#racePhoneToolsToggle');
  if(await collapse.isVisible()&&await collapse.getAttribute('aria-expanded')==='true')await collapse.click();
  await page.evaluate(()=>{window.__KICKLAB_RACE_COACH_QA__.clear();window.__KICKLAB_RACE_COACH_QA__.start();window.__KICKLAB_RACE_COACH_QA__.preview('Shift in the bright band.','hype');window.__KICKLAB_RACE_COACH_QA__.hold();});await page.waitForTimeout(1000);
  const imaniCue=await page.locator('#raceCoachNoticeText').textContent(),imaniExpression=await page.locator('#raceCoachNoticeIcon').getAttribute('aria-label');
  await page.click('#racePhoneToolsToggle');await page.locator('#raceCoachHistory summary').click();await page.waitForTimeout(1000);const imaniHistory=await page.locator('#raceCoachHistoryList').textContent();
  await page.locator('#raceCoachHistory summary').click();await page.click('#raceCoachChoose');await page.locator('[data-coach-id="mateo"]').click();await page.waitForTimeout(700);
  const mateoHistory=await page.locator('#raceCoachHistoryList').textContent();await page.click('#raceCoachRosterClose');await page.click('#racePhoneToolsToggle');
  if(await collapse.isVisible()&&await collapse.getAttribute('aria-expanded')==='true')await collapse.click();
  await page.evaluate(()=>{window.__KICKLAB_RACE_COACH_QA__.clear();window.__KICKLAB_RACE_COACH_QA__.start();window.__KICKLAB_RACE_COACH_QA__.preview('Shift in the bright band.','hype');window.__KICKLAB_RACE_COACH_QA__.hold();});await page.waitForTimeout(1000);
  const mateoCue=await page.locator('#raceCoachNoticeText').textContent(),mateoExpression=await page.locator('#raceCoachNoticeIcon').getAttribute('aria-label');
  if(imaniCue===mateoCue||!imaniHistory.includes('You’ve got this:')||!mateoHistory.includes('Timing:')||!imaniExpression.includes('celebrating')||!mateoExpression.includes('celebrating'))throw Error(`controlled parity evidence failed: ${JSON.stringify({imaniCue,mateoCue,imaniHistory,mateoHistory,imaniExpression,mateoExpression})}`);
  report.events.push({controlledSameCanonicalCue:'Shift in the bright band.',imaniCue,mateoCue,imaniHistory,mateoHistory,imaniExpression,mateoExpression});
}catch(error){report.errors.push(error.stack||String(error));}
await context.close();await browser.close();
const source=await video.path(),target=join(out,`race-coach-personas-${head.slice(0,12)}.mp4`);
const encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-i',source,'-vf','scale=780:1688','-r','30','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',target],{encoding:'utf8'});
if(encoded.status!==0)report.errors.push(encoded.stderr);
else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',target],{encoding:'utf8'});if(probe.status!==0)report.errors.push(probe.stderr);else{report.media={path:target,bytes:statSync(target).size,probe:JSON.parse(probe.stdout)};if(report.media.bytes<100000||Number(report.media.probe.format.duration)<12)report.errors.push('MP4 failed duration or size gate');}}
report.url=url.toString();writeFileSync(join(out,'walkthrough-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length||report.external.length)process.exitCode=1;
