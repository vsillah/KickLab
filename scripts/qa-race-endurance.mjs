import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5887/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-endurance');
const [width,height]=(process.argv[4]||'390x844').split('x').map(Number);
const gfx=process.argv.includes('--canvas')?'2d':'3d';
const reduced=process.argv.includes('--reduced');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:out,size:{width,height}}});
await context.addInitScript(mode=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:mode,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})),gfx);
const page=await context.newPage(),errors=[],external=[],samples=[],shots=[];
page.on('pageerror',error=>errors.push(String(error)));
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();external.push(url);route.abort();});
const state=()=>page.evaluate(()=>({...globalThis.__KICKLAB_RACE_MODES_QA__.state(),renderer:globalThis.__KICKLAB_RACE_3D__?.status||'canvas',overflow:document.documentElement.scrollWidth-innerWidth,simulator:globalThis.__KICKLAB_RACE_SIMULATOR_QA__?.state().active}));
const shot=async name=>{await page.evaluate(()=>document.activeElement?.blur());const path=join(out,`${name}.png`);await page.screenshot({path});shots.push(path);};
const url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceSimulator','prototype');url.searchParams.set('raceTelemetry','prototype');url.searchParams.set('rev',process.env.KICKLAB_QA_HEAD||'endurance-working');
await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:20000});
await page.evaluate(()=>{if(!globalThis.__KICKLAB_RACE_SIMULATOR_QA__.selectMode('endurance'))throw new Error('Endurance unavailable');});
await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:10000});
await page.locator('#raceCoachSetupSteering').click();
await page.locator('#raceCoachSetupSimulator').click();
await page.locator('#raceSimulator').scrollIntoViewIfNeeded();
await shot('setup');
const setup=await state();if(setup.mode!=='endurance'||!setup.simulator||setup.overflow>1)errors.push('Endurance setup or layout failed');
await page.locator('#simStart').click();
for(const [name,wait] of [['red',100],['yellow',900],['green',850],['go',750]]){await page.waitForTimeout(wait);samples.push({name,...await state()});await shot(name);}
if(samples.some(sample=>sample.name!==sample.lightPhase))errors.push('Start lights did not advance red, yellow, green, go');
await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_MODES_QA__?.state().phase==='run',null,{timeout:5000});
let gas=false,brake=false,stress='pending',firstLapShot=false,secondLapShot=false,hotShot=false,criticalShot=false,coolShot=false,finishShot=false;
const set=async(nextGas,nextBrake)=>{if(nextGas!==gas){await page.evaluate(value=>globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('gas',value),nextGas);gas=nextGas;}if(nextBrake!==brake){await page.evaluate(value=>globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('brake',value),nextBrake);brake=nextBrake;}};
for(let i=0;i<1000;i++){
  const current=await state();if(i%10===0)samples.push({name:'drive',...current});
  if(current.overflow>1||Math.abs(current.lineError)>7.01){errors.push(`layout or off-road at ${current.elapsed.toFixed(1)} s`);break;}
  if(current.phase==='done'||current.phase==='crashed'){await set(false,false);if(current.phase==='done'){await shot('crossing');finishShot=true;}else errors.push(`Endurance crashed at ${current.elapsed.toFixed(1)} s`);break;}
  if(stress==='pending'&&current.elapsed>31&&current.laps===1){stress='heating';await set(true,true);await page.evaluate(()=>{const timer=setInterval(()=>{const state=globalThis.__KICKLAB_RACE_MODES_QA__.state();if(state.heat>=.93){globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('gas',false);globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('brake',false);clearInterval(timer);}},10);});}
  if(stress==='heating'){
    await set(true,true);
    if(current.heat>=.76&&!hotShot){await shot('hot');hotShot=true;}
    if(current.heat>=.91){stress='cooling';await shot('critical');criticalShot=true;}
  }else if(stress==='cooling'){
    await set(false,false);
    if(current.heat<=.47&&current.thermalStage==='cooling'){stress='complete';await shot('cooled');coolShot=true;}
  }else{const speed=current.speedKmh/3.6,tooHot=current.heat>=.78;await set(speed<11.8&&!tooHot,speed>12.7);}
  if(current.laps===1&&!firstLapShot){await shot('lap-1');firstLapShot=true;}
  if(current.laps===2&&!secondLapShot){await shot('lap-2');secondLapShot=true;}
  await page.waitForTimeout(stress==='heating'?60:150);
}
await page.waitForTimeout(2900);
const result=await state();await shot('result');
const review=await page.locator('#simResult').isVisible(),text=await page.locator('#simResultMeasurements').textContent();
if(!finishShot||!firstLapShot||!secondLapShot||!hotShot||!criticalShot||!coolShot||result.phase!=='done'||!result.result?.pass||!review||result.laps!==3||!text?.includes('critical'))errors.push('Required Endurance progression, heat recovery, passing result, or review missing');
await page.locator('#simResultGarage').click();
const garage=await page.locator('#settingsDrawer').isVisible();
if(!garage)errors.push('Result Garage action did not open settings');
await shot('garage');
await page.locator('#settingsClose').click();
const returned=await state();
if(returned.phase!=='grid')errors.push('Closing Garage did not return to Endurance setup');
await shot('retry-setup');
if(external.length)errors.push('External runtime request');
const video=page.video();await context.close();await browser.close();
const webm=await video.path(),mp4=join(out,`endurance-${width}x${height}.mp4`),encode=spawnSync('ffmpeg',['-y','-loglevel','error','-i',webm,'-c:v','libx264','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});
if(encode.status!==0)errors.push(`H.264 encode: ${encode.stderr}`);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});
if(probe.status!==0)errors.push(`MP4 probe: ${probe.stderr}`);
const report={url:url.toString(),width,height,gfx,reduced,result,review,text,garage,returned,samples,shots,mp4,probe:probe.status===0?JSON.parse(probe.stdout):null,errors,external};
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({url:report.url,mp4,result,review,shots:shots.length,errors,external,probe:report.probe},null,2));
if(errors.length)process.exitCode=1;
