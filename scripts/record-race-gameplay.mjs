import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5972/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-gameplay'),revision=process.argv[4]||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const report={revision,base,runs:[],errors:[],external:[]};
const sample=page=>page.evaluate(()=>({dynamics:window.__KICKLAB_RACE_3D__?.dynamics,modes:window.__KICKLAB_RACE_MODES_QA__?.state?.(),fx:window.__KICKLAB_RACE_FX__,visual:window.__KICKLAB_RACE_LOAD_DRIFT__,milestones:window.__KICKLAB_RACE_FX__?.milestones}));
async function open(width,height){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:{dir:out,size:{width,height}}});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
  const page=await context.newPage(),video=page.video(),url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',revision);
  page.on('pageerror',error=>report.errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).origin!==url.origin)report.external.push(request.url());});
  await page.goto(url.toString(),{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();const orbit=page.locator('.race-orbit-panel button');await orbit.waitFor({state:'visible',timeout:5000}).catch(()=>{});if(await orbit.isVisible())await orbit.click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:20000});
  return{context,page,video,url};
}
async function encode(run,context,video,startedAt,width,height){
  const endedAt=Date.now();await context.close();const source=await video.path(),path=join(out,`race-${run}-${revision.slice(0,12)}-${width}.mp4`);
  const sourceProbe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',source],{encoding:'utf8'});if(sourceProbe.status!==0)throw Error(sourceProbe.stderr);
  const sourceSeconds=Number(JSON.parse(sourceProbe.stdout).format.duration),desiredSeconds=(endedAt-startedAt)/1000+.35,trim=Math.max(0,sourceSeconds-desiredSeconds);
  const encodeResult=spawnSync('ffmpeg',['-y','-ss',trim.toFixed(3),'-i',source,'-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',path],{encoding:'utf8'});if(encodeResult.status!==0)throw Error(encodeResult.stderr.slice(-1200));
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames','-of','json',path],{encoding:'utf8'});if(probe.status!==0)throw Error(probe.stderr);const details=JSON.parse(probe.stdout),stream=details.streams.find(s=>s.codec_name==='h264');if(!stream||stream.width!==width||stream.height!==height||Number(details.format.duration)<8||statSync(path).size<100000)throw Error(`Invalid ${run} MP4`);
  return{path,duration:Number(details.format.duration),width,height,frames:Number(stream.nb_frames),bytes:statSync(path).size,trimmedSetupSeconds:trim};
}
async function drag(width,height){
  const {context,page,video,url}=await open(width,height);
  await page.locator('#raceCoachSetupGarage').click();await page.locator('#raceGarage [data-garage-part="body"][data-garage-value="kart"]').click();await page.locator('#raceGarage [data-garage-section="tires"]').click();await page.locator('#raceGarage [data-garage-part="tires"][data-garage-value="narrow"]').click();await page.locator('#settingsClose').click();
  await page.locator('.stage').scrollIntoViewIfNeeded();const startedAt=Date.now();await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:12000});if(width<500)await page.evaluate(()=>window.scrollTo(0,210));
  await page.keyboard.down('b');await page.keyboard.down('Space');await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.pressure>=.63,null,{timeout:7000});await page.keyboard.up('b');
  for(let i=0;i<7&&!(await page.locator('#raceTelemetryTitle').textContent()).includes('NOS');i++)await page.locator('#raceTelemetryNext').click();
  await page.waitForFunction(()=>{const b=document.querySelector('#raceTelemetryApply');return b&&!b.disabled&&!b.hidden;},null,{timeout:2000});
  const nosBefore=await page.evaluate(()=>({telemetry:window.__KICKLAB_RACE_TELEMETRY__,button:{disabled:document.querySelector('#raceTelemetryApply').disabled,hidden:document.querySelector('#raceTelemetryApply').hidden}}));
  await page.locator('#raceTelemetryApply').click();if(width<500)await page.evaluate(()=>window.scrollTo(0,210));
  let peakLoad=0,shifted=false;for(let i=0;i<65;i++){await page.waitForTimeout(70);const state=await sample(page);peakLoad=Math.max(peakLoad,state.fx?.loadTransfer||0);if(!shifted&&state.dynamics?.v>=12.7){await page.locator('#raceTelemetryShift').click();shifted=true;if(width<500)await page.evaluate(()=>window.scrollTo(0,210));}if(shifted&&state.fx?.audit?.boost?.ends>=1)break;}
  await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.cutaway?.ends>=1,null,{timeout:12000});
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='done',null,{timeout:20000});await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.cutaway?.system==='chassis',null,{timeout:6000});await page.waitForTimeout(3100);
  const end=await sample(page),storage=await page.evaluate(()=>Object.keys(localStorage).sort()),mp4=await encode('drag',context,video,startedAt,width,height);const row={run:'drag',url:url.toString(),...mp4,nosBefore,launchStarts:end.fx?.audit.launch.starts,shiftStarts:end.fx?.audit.shift.starts,boostStarts:end.fx?.audit.boost.starts,peakLoadSample:peakLoad,chassis:end.fx?.audit.cutaway.system,renderer:end.dynamics?.state,storage};
  if(row.launchStarts<1||row.shiftStarts<1||row.boostStarts<1||row.peakLoadSample<=.15||row.chassis!=='chassis')report.errors.push(`${width}: real Drag evidence incomplete`);report.runs.push(row);
}
async function drift(width,height){
  const {context,page,video,url}=await open(width,height);
  await page.locator('#raceCoachSetupGarage').click();await page.locator('#raceGarage [data-race-mode="drift"]').click();await page.locator('#settingsClose').click();await page.locator('#raceCoachSetupSimulator').click();await page.locator('#simStart').waitFor({state:'visible',timeout:10000});
  await page.locator('.stage').scrollIntoViewIfNeeded();const startedAt=Date.now();await page.locator('#simStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:12000});if(width<500)await page.evaluate(()=>window.scrollTo(0,210));
  const gas=await page.locator('#simGas').boundingBox();await page.mouse.move(gas.x+gas.width/2,gas.y+gas.height/2);await page.mouse.down();
  let stage='accelerate',peakEnergy=0,peakSmoke=0,peakMarks=0,countersteered=false,recovered=false,peakDriftTime=0,everDriftArmed=false;
  for(let i=0;i<150;i++){
    await page.waitForTimeout(140);const row=await sample(page),d=row.dynamics;peakEnergy=Math.max(peakEnergy,row.fx?.driftEnergy||0);peakSmoke=Math.max(peakSmoke,row.fx?.tireSmoke||0);peakMarks=Math.max(peakMarks,row.fx?.markEmissions||0);peakDriftTime=Math.max(peakDriftTime,row.milestones?.driftTime||0);everDriftArmed ||= !!row.milestones?.driftArmed;
    if(stage==='accelerate'&&d.x>40){await page.mouse.up();const brake=await page.locator('#simBrake').boundingBox();await page.mouse.move(brake.x+brake.width/2,brake.y+brake.height/2);await page.mouse.down();stage='brake';}
    if(stage==='brake'&&d.v<14){await page.mouse.up();stage='coast';}
    if(stage==='coast'&&d.x>86){await page.keyboard.down('ArrowRight');await page.waitForTimeout(550);await page.keyboard.up('ArrowRight');stage='steer';}
    if(stage==='steer'&&d.x>90){await page.locator('#simHandbrake').focus();await page.keyboard.press('Space');stage='drift';}
    if(stage==='drift'&&d.y>17){await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.wheel< -5,null,{timeout:1500});await page.keyboard.up('ArrowLeft');countersteered=true;stage='counter';}
    if(stage==='counter'&&d.y>24){await page.locator('#simHandbrake').focus();await page.keyboard.press('Space');stage='recover';}
    if(stage==='recover'&&row.modes?.zone===2&&d.x>117){await page.keyboard.down('ArrowRight');await page.waitForTimeout(550);await page.keyboard.up('ArrowRight');stage='follow';}
    if(stage==='follow'&&d.y>55&&d.state==='run'&&d.mode==='none'&&!d.inputs.drift){recovered=true;break;}
    if(['crashed','done'].includes(d.state))break;
  }
  const end=await sample(page),mp4=await encode('drift',context,video,startedAt,width,height);const row={run:'drift',url:url.toString(),...mp4,peakEnergy,peakSmoke,peakMarks,peakDriftTime,everDriftArmed,countersteered,recovered,cutaway:end.fx?.audit.cutaway,finalMilestones:end.milestones,finalState:end.dynamics?.state,finalZone:end.modes?.zone,finalX:end.dynamics?.x,finalY:end.dynamics?.y};if(peakEnergy<.25||peakSmoke<8||peakMarks<20||!countersteered||!recovered||row.cutaway?.system!=='suspension')report.errors.push(`${width}: real Drift evidence incomplete`);report.runs.push(row);
}
async function brakes(width,height){
  const {context,page,video,url}=await open(width,height);await page.locator('#raceCoachSetupGarage').click();await page.locator('#raceGarage [data-race-mode="hill"]').click();await page.locator('#settingsClose').click();
  const startedAt=Date.now();await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:12000});if(width<500)await page.evaluate(()=>window.scrollTo(0,210));
  await page.keyboard.down('Space');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.v>13.5,null,{timeout:12000});await page.keyboard.up('Space');await page.keyboard.down('b');await page.waitForTimeout(600);await page.keyboard.up('b');
  await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.cutaway?.system==='brakes',null,{timeout:6000});await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.cutaway?.ends>=1,null,{timeout:6000});await page.waitForTimeout(450);const end=await sample(page),mp4=await encode('brakes',context,video,startedAt,width,height),row={run:'brakes',url:url.toString(),...mp4,cutaway:end.fx?.audit.cutaway,finalState:end.dynamics?.state,finalSpeed:end.dynamics?.v};if(row.cutaway?.system!=='brakes'||row.cutaway?.ends<1)report.errors.push(`${width}: real Brakes evidence incomplete`);report.runs.push(row);
}
async function cooling(width,height){
  const {context,page,video,url}=await open(width,height);await page.locator('#raceCoachSetupGarage').click();await page.locator('#raceGarage [data-race-mode="endurance"]').click();await page.locator('#settingsClose').click();
  const startedAt=Date.now();await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:12000});if(width<500)await page.evaluate(()=>window.scrollTo(0,210));
  await page.keyboard.down('Space');await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state()?.heat>=.76,null,{timeout:18000});const hot=await sample(page);await page.keyboard.up('Space');await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.cutaway?.system==='cooling',null,{timeout:10000});await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.cutaway?.ends>=1,null,{timeout:6000});await page.waitForTimeout(450);const end=await sample(page),mp4=await encode('cooling',context,video,startedAt,width,height),row={run:'cooling',url:url.toString(),...mp4,hotHeat:hot.modes?.heat,cutaway:end.fx?.audit.cutaway,finalState:end.dynamics?.state,finalSpeed:end.dynamics?.v,finalHeat:end.modes?.heat};if(row.cutaway?.system!=='cooling'||row.cutaway?.ends<1)report.errors.push(`${width}: real Cooling evidence incomplete`);report.runs.push(row);
}
try{const selected=(process.env.QA_MODES||'drag,drift').split(',');for(const [width,height] of (process.env.QA_ONE?[[390,844]]:[[390,844],[1440,1000]])){for(const mode of selected){if(mode==='drag')await drag(width,height);else if(mode==='drift')await drift(width,height);else if(mode==='brakes')await brakes(width,height);else if(mode==='cooling')await cooling(width,height);else throw Error(`Unknown QA mode ${mode}`);}}}catch(error){report.errors.push(error.stack||String(error));}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length||report.external.length)process.exitCode=1;
