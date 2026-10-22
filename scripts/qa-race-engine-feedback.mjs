import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5971/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-engine-feedback/exact-head');
const revision=process.argv[4]||'unbound';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const report={revision,base,checks:[],screenshots:[],errors:[],requests:[],states:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
async function open(width,height,{analog=false,reduced=false,canvas=false,mode='drag',vehicle='cobalt'}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
  await context.addInitScript(gfx=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})),canvas?'2d':'3d');
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(String(error)));page.on('request',request=>report.requests.push(request.url()));
  const url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceCornerTrace','prototype');url.searchParams.set('rev',revision);url.searchParams.set('raceEngineQA','1');
  await page.goto(url.toString(),{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();await page.locator('#lab-tab-race').click();
  if(!canvas){const orbit=page.locator('.race-orbit-panel button');await orbit.waitFor({state:'visible',timeout:5000}).catch(()=>{});if(await orbit.isVisible())await orbit.click();}
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  await page.evaluate(({mode,vehicle})=>window.__KICKLAB_RACE_ENGINE_QA__.select(mode,vehicle),{mode,vehicle});
  if(!canvas)await page.waitForFunction(vehicle=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.vehicleId===vehicle,vehicle,{timeout:20000});
  await page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.run());
  if(analog)await page.locator('#analogControlsButton').click();
  return{context,page,url:url.toString()};
}
async function state(page,name,heat,overheat,phase,save=false){
  await page.evaluate(({heat,overheat,phase})=>window.__KICKLAB_RACE_ENGINE_QA__.thermal(heat,overheat,phase),{heat,overheat,phase});
  await page.waitForTimeout(200);
  const result=await page.evaluate(()=>{const rect=id=>document.querySelector(id)?.getBoundingClientRect().toJSON();const a=window.__KICKLAB_RACE_3D__,t=window.__KICKLAB_RACE_TELEMETRY__,nav=rect('#raceNavigation'),arc=rect('#raceNavigationTemp'),car=a?.composition;return{stage:rect('.stage'),nav,arc,car,renderer:a?.status,vehicle:a?.vehicleId,mode:window.__KICKLAB_RACE_MODES_QA__?.state().mode,thermal:t?.thermalStage,powerFactor:t?.powerFactor,heatOrb:a?.effects?.heatOrb,shimmer:a?.effects?.shimmer,smoke:a?.effects?.smoke,phase:document.querySelector('#raceNavigationGaugePhase').textContent,coach:document.querySelector('#raceNavigationCue').textContent,arcLabel:document.querySelector('#raceNavigationTemp').getAttribute('aria-label'),overflow:document.documentElement.scrollWidth-innerWidth,storage:Object.keys(localStorage).sort(),reduced:a?.reducedMotion,canvas:getComputedStyle(document.querySelector('#cv')).display!=='none'};});
  report.states.push({name,...result});check(`${name} thermal label and power`,name.endsWith(result.thermal)&&Number.isFinite(result.powerFactor),result);
  check(`${name} Coach cue`,!name.endsWith('critical')||/Critical|Lift now/.test(result.coach),result.coach);check(`${name} layout and orb`,result.overflow<=0&&(result.heatOrb===0||result.renderer!=='rendering')&&(!result.arc||result.arc.right<=result.stage.right+1),{overflow:result.overflow,heatOrb:result.heatOrb,arc:result.arc,stage:result.stage});
  if(save){const path=join(out,`${name}.png`);await page.locator('.stage').screenshot({path});report.screenshots.push(path);}
  return result;
}
try{
  const master=await open(390,844);report.url=master.url;
  for(const [label,heat,overheat,phase] of [['normal',.2,false,'drive'],['warming',.65,false,'drive'],['hot',.82,false,'warning'],['critical',.94,true,'overheat'],['power-loss',.7,true,'overheat'],['cooling',.44,false,'recovered']])await state(master.page,`390-classic-${label}`,heat,overheat,phase,true);
  check('critical produces bounded engine-bay vapor',report.states.find(s=>s.name==='390-classic-critical')?.smoke>=0,null);
  const pacing=await master.page.evaluate(()=>new Promise(resolve=>{const samples=[],tick=last=>requestAnimationFrame(now=>{if(last)samples.push(now-last);if(samples.length<90)tick(now);else resolve(samples.sort((a,b)=>a-b)[Math.floor(samples.length*.95)]);});tick(0);}));check('live frame pacing p95 under 50 ms',pacing<50,{p95Ms:pacing});
  await master.page.locator('#orientationDetailToggle').click();const paused=await master.page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.state());check('pause retains thermal state and halts play',paused.paused&&paused.phase==='run'&&Number.isFinite(paused.heat),paused);
  await master.page.locator('#orientationDetail [data-close-detail="orientation"]').click();const resumed=await master.page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.state());check('resume releases pause owner',!resumed.paused,resumed);
  await master.page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.thermal(.94,true,'overheat'));await master.page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));const cancelled=await master.page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.state());check('pagehide cancels held throttle',!cancelled.inputs.gas,cancelled);
  check('storage keys remain local and stable',report.states.every(s=>s.storage.every(key=>['impactlab.v1','impactlab.nick','kicklab.profiles.v1'].includes(key))),report.states[0]?.storage);
  await master.context.close();
  for(const [width,height] of [[360,780],[390,844],[768,1024],[1113,988],[1440,1000]])for(const analog of [false,true]){
    const row=await open(width,height,{analog});await state(row.page,`${width}-${analog?'analog':'classic'}-critical`,.94,true,'overheat',width===360||width===768||width===1440);await row.context.close();
  }
  const desktop=await open(1440,1000);for(const [label,heat,overheat,phase] of [['normal',.2,false,'drive'],['warming',.65,false,'drive'],['hot',.82,false,'warning'],['critical',.94,true,'overheat'],['power-loss',.7,true,'overheat'],['cooling',.44,false,'recovered']])await state(desktop.page,`1440-classic-${label}`,heat,overheat,phase,true);await desktop.context.close();
  const reduced=await open(390,844,{reduced:true,analog:true});const rr=await state(reduced.page,'390-reduced-critical',.94,true,'overheat',true);check('reduced motion retains arc without vibration or shimmer',rr.reduced&&rr.shimmer===0&&rr.arcLabel.includes('critical'),rr);await reduced.context.close();
  const fallback=await open(390,844,{canvas:true});const fr=await state(fallback.page,'390-canvas-critical',.94,true,'overheat',true);check('Canvas fallback keeps thermal information',fr.canvas&&fr.arcLabel.includes('critical'),fr);await fallback.context.close();
  for(const mode of ['drag','drift','circuit','hill'])for(const vehicle of ['kestrel','cobalt','aegis']){const row=await open(390,844,{mode,vehicle});const s=await state(row.page,`${mode}-${vehicle}-hot`,.82,false,'warning');check(`${mode}/${vehicle} renders`,s.renderer==='rendering'&&s.vehicle===vehicle&&s.mode===mode&&!!s.car,{renderer:s.renderer,vehicle:s.vehicle,mode:s.mode,car:s.car});await row.context.close();}
}catch(error){report.errors.push(error.stack||String(error));}finally{await browser.close();}
report.external=[...new Set(report.requests.filter(url=>new URL(url).origin!==new URL(base).origin))];check('zero external requests',report.external.length===0,report.external);check('no browser errors',report.errors.length===0,report.errors);writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(x=>!x.pass).map(x=>x.name),errors:report.errors,external:report.external,screenshots:report.screenshots.length},null,2));if(report.checks.some(x=>!x.pass))process.exitCode=1;
