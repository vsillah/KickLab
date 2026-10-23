import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5917/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-speed-sustained');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.KICKLAB_CHROMIUM_PATH||chromium.executablePath()});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:390,height:844}}});
await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
const page=await context.newPage(),recordingStart=Date.now(),samples=[],errors=[],external=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();external.push(url);route.abort();});
let clipStart=0,source;
try{
  const url=new URL(base);for(const [key,value] of [['raceExpansion','prototype'],['raceSimulator','prototype'],['raceTelemetry','prototype'],['rev',head]])url.searchParams.set(key,value);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
  await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:20000});
  if(!await page.evaluate(()=>globalThis.__KICKLAB_RACE_SIMULATOR_QA__.selectMode('endurance')))throw new Error('Endurance unavailable');
  await page.locator('#raceCoachSetupSteering').click();await page.locator('#raceCoachSetupSimulator').click();
  await page.locator('#simStart').click();await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_MODES_QA__.state().phase==='run',null,{timeout:10000});
  await page.evaluate(()=>{const stage=document.querySelector('.stage');window.scrollTo(0,stage.getBoundingClientRect().top+window.scrollY);});
  clipStart=(Date.now()-recordingStart)/1000;
  await page.evaluate(()=>globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('gas',true));
  const started=Date.now();let gas=true,brake=false;
  while(Date.now()-started<15900){
    const current=await page.evaluate(()=>{const state=globalThis.__KICKLAB_RACE_MODES_QA__.state();return {phase:state.phase,elapsed:state.elapsed,speedKmh:state.speedKmh,lineError:state.lineError,heat:state.heat,cinematic:state.cinematic,composition:globalThis.__KICKLAB_RACE_3D__?.composition};});
    const t=(Date.now()-started)/1000;samples.push({t,...current});
    if(current.phase!=='run')throw new Error(`run interrupted at ${t.toFixed(2)}s: ${current.phase}`);
    if(t>3){const nextGas=current.speedKmh<46,nextBrake=current.speedKmh>53;if(nextGas!==gas){gas=nextGas;await page.evaluate(value=>globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('gas',value),gas);}if(nextBrake!==brake){brake=nextBrake;await page.evaluate(value=>globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('brake',value),brake);}}
    if([0,3,8,14].some(mark=>Math.abs(t-mark)<.06))await page.locator('.stage').screenshot({path:join(out,`endurance-${Math.round(t)}s.png`)});
    await page.waitForTimeout(110);
  }
  await page.evaluate(()=>{globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('gas',false);globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('brake',false);});
}catch(error){errors.push(error.stack||String(error));}
const recording=page.video();await context.close();source=recording?await recording.path():null;await browser.close();
let longest=0,run=0,last=null;for(const sample of samples){if(sample.speedKmh>=40&&sample.phase==='run'){run+=last===null?0:sample.t-last;longest=Math.max(longest,run);}else run=0;last=sample.t;}
if(longest<10)errors.push(`sustained speed below 10s: ${longest.toFixed(2)}s`);
if(samples.length&&samples.at(-1).t<15)errors.push('recording shorter than 15s');
const output=join(out,'endurance-sustained-15s.mp4');let probe=null;
if(source&&clipStart){const result=spawnSync('ffmpeg',['-y','-loglevel','error','-ss',clipStart.toFixed(2),'-i',source,'-t','15.3','-vf','crop=390:660:0:130,fps=30','-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',output],{encoding:'utf8'});if(result.status)errors.push(result.stderr);else{const result=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',output],{encoding:'utf8'});if(result.status)errors.push(result.stderr);else probe=JSON.parse(result.stdout);}}
const report={head,base,output,probe,longestSustainedSeconds:longest,samples,errors,external};writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,output,probe,longestSustainedSeconds:longest,sampleCount:samples.length,minSpeedAfter5:Math.min(...samples.filter(x=>x.t>=5).map(x=>x.speedKmh)),maxSpeed:Math.max(...samples.map(x=>x.speedKmh)),errors,external},null,2));
if(errors.length||external.length)process.exitCode=1;
