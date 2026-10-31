// Earn the Forest journey through visible Race controls on the exact Pages build.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {enterHighlandRace,finishHighlandDrag} from './qa-race-public-journey.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[a-f0-9]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD');
if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==head)throw Error('HEAD mismatch');
const base=new URL(process.argv[2]||'http://127.0.0.1:4173/pages/index.html');
if(!['127.0.0.1','localhost'].includes(base.hostname)||base.pathname!=='/pages/index.html')throw Error('Use localhost Pages');
for(const flag of ['raceExpansion','raceCompetition','raceTelemetry','raceProgression','racePreflight'])base.searchParams.set(flag,'prototype');
base.searchParams.set('rev',head);
const sha=value=>createHash('sha256').update(value).digest('hex');
const built=sha(readFileSync('dist/pages/index.html'));
const served=sha(Buffer.from(await(await fetch(base)).arrayBuffer()));
if(built!==served)throw Error('Served artifact mismatch');
const out=resolve('qa-artifacts/race-public-earned-forest');mkdirSync(out,{recursive:true});
const earnedFile=join(out,'earned-marine-storage.json'),earnedMeta=join(out,'earned-marine-meta.json');
const resume=process.env.KICKLAB_QA_RESUME_EARNED==='1';
if(resume){const meta=JSON.parse(readFileSync(earnedMeta,'utf8'));if(meta.head!==head||meta.artifactSha256!==built||!existsSync(earnedFile))throw Error('Earned profile does not match this artifact');}
const report={head,artifactSha256:built,runs:[],errors:[],external:[],popups:0,downloads:0};
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1113,height:834},reducedMotion:'reduce',...(resume?{storageState:earnedFile}:{})});
const page=await context.newPage();
if(process.env.KICKLAB_QA_DIAG==='1')report.trace=[];
page.on('pageerror',e=>report.errors.push(e.message));page.on('popup',()=>report.popups++);page.on('download',()=>report.downloads++);
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base.origin+'/')||url.startsWith('blob:')||url.startsWith('data:'))route.continue();else{report.external.push(url);route.abort();}});
const state=()=>page.evaluate(()=>({mode:window.__KICKLAB_RACE_MODES_QA__.state(),progress:window.__KICKLAB_RACE_PROGRESSION_QA__.state()}));
const progress=()=>page.evaluate(()=>window.__KICKLAB_RACE_PROGRESSION_QA__.state());
async function home(){await page.click('#rRaceGarage');await page.locator('#modeHome').waitFor({state:'visible'});}
async function enter(venue){
  await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:25000});
  if(!await page.locator(`[data-preflight-venue="${venue}"]`).isEnabled())throw Error(`${venue} remains locked`);
  await page.click(`[data-preflight-venue="${venue}"]`);
  for(let step=0;step<4;step++){
    if(step===1&&venue==='forest')await page.click('[data-preflight-vehicle="aegis"]');
    if(step===2){for(const [part,value] of [['suspension','soft'],['tires','wide'],['brakes','endurance']])await page.click(`[data-preflight-part="${part}"][data-preflight-value="${value}"]`);}
    if(step===3&&await page.locator('#racePreflightSteer').innerText()==='You steer')await page.click('#racePreflightSteer');
    await page.click('#racePreflightNext');
  }
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__.state().phase==='run',null,{timeout:30000});
}
async function drive(venue,event,brakeX,target){
  let gas=false,brake=false,entry=null,peak=0,approachStarted=false,brakingDone=false,last=null,stalled=0;
  try{
    for(let i=0;i<240;i++){
      const {mode,progress:p}=await state();
      last={phase:mode.phase,x:p.x,zone:p.zone,speedKmh:mode.speedKmh,elapsed:mode.elapsed};
      if(report.trace&&i%5===0)report.trace.push({venue,event,i,x:p.x,y:p.y,zone:p.zone,speedKmh:mode.speedKmh,lineError:mode.lineError,gas,brake});
      if(['done','crashed'].includes(mode.phase)){
        const result={venue,event,entryKmh:entry,peakKmh:peak,time:p.result?.t,slide:p.result?.slideT,brakeFactor:p.result?.brakeFactor,finish:mode.phase==='done',pass:p.levelPass,progress:p.progress};
        report.runs.push(result);await page.locator('#results').waitFor({state:'visible',timeout:10000});return result;
      }
      peak=Math.max(peak,mode.speedKmh||0);
      if(p.zone===1&&entry===null)entry=mode.speedKmh;
      if(p.zone===1&&mode.speedKmh<1)stalled++;else stalled=0;
      if(stalled>15)throw Error(`${venue} stalled: ${JSON.stringify({last,gas,brake})}`);
      if(p.zone===0&&p.x>=brakeX)approachStarted=true;
      if(approachStarted&&mode.speedKmh<=target)brakingDone=true;
      const wantBrake=p.zone===0&&approachStarted&&!brakingDone;
      const wantGas=p.zone===0&&!approachStarted||p.zone===2&&(venue!=='forest'||mode.speedKmh<45&&Math.abs(mode.lineError)<.4);
      if(wantBrake!==brake){if(wantBrake)await page.keyboard.down('KeyB');else await page.keyboard.up('KeyB');brake=wantBrake;}
      if(wantGas!==gas){if(wantGas)await page.keyboard.down('Space');else await page.keyboard.up('Space');gas=wantGas;}
      await page.waitForTimeout(200);
    }
    throw Error(`${venue} event ${event} timed out: ${JSON.stringify(last)}`);
  }finally{if(gas)await page.keyboard.up('Space');if(brake)await page.keyboard.up('KeyB');}
}
try{
  await page.goto(base.toString(),{waitUntil:'domcontentloaded'});
  if(!resume){await enterHighlandRace(page);
  const highland=await finishHighlandDrag(page);report.runs.push({venue:'highland',event:'Drag',pass:highland.final.result.pass,progress:(await progress()).progress});
  await home();}else{report.resumedFrom='earned Marine profile on this exact artifact';if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');}
  for(const [venue,count] of resume?[['forest',3]]:[['marine',2],['forest',3]])for(let event=0;event<count;event++){
    const targets=venue==='marine'?[event===0?45:42]:report.trace?[40]:[40,38,36];
    let passed=false;
    for(let attempt=0;attempt<targets.length;attempt++){
      await enter(venue);
      const x=venue==='marine'?(event===0?77:73):40;
      const result=await drive(venue,event,x,targets[attempt]);
      if(result.pass){passed=true;await home();if(venue==='marine'&&event===1){await context.storageState({path:earnedFile});writeFileSync(earnedMeta,JSON.stringify({head,artifactSha256:built,earned:['highland','marine-0','marine-1']},null,2)+'\n');}break;}
      await home();
    }
    if(!passed)throw Error(`${venue} event ${event} did not pass after ${targets.length} visible attempts`);
  }
}catch(e){report.errors.push(e.stack||String(e));await page.screenshot({path:join(out,'failure.png')}).catch(()=>{});}
await context.close();await browser.close();writeFileSync(join(out,resume?'forest-diagnostic-report.json':'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.errors.length||report.external.length||report.popups||report.downloads)process.exitCode=1;
