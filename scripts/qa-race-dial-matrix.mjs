import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const origin=process.env.KICKLAB_QA_ORIGIN||'http://127.0.0.1:5177';
const out=resolve('qa-artifacts/race-dial-matrix',head.slice(0,7));mkdirSync(out,{recursive:true});
const report={head,dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),checks:[],errors:[],external:[]};
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(`${name}: ${JSON.stringify(detail)}`);};
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.errors.push(error.message));
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(`${origin}/`)||url.startsWith(`blob:${origin}/`)||url.startsWith('data:'))return route.continue();report.external.push(url);return route.abort();});
const params=new URLSearchParams({raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',raceShiftQA:'1',rev:head.slice(0,7)});
try{
 await page.goto(`${origin}/?${params}`,{waitUntil:'domcontentloaded'});
 if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
 if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
 await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
 if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
 await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.orbit?.done&&document.querySelector('#raceCoachSetupStart')?.getBoundingClientRect().width>0);
 await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run');
 await page.locator('#raceActionDial').waitFor({state:'visible'});
 const frameTimes=await page.evaluate(()=>new Promise(resolve=>{const deltas=[];let last=null;const sample=time=>{if(last!==null)deltas.push(time-last);last=time;if(deltas.length>=120)resolve(deltas);else requestAnimationFrame(sample);};requestAnimationFrame(sample);}));const sorted=[...frameTimes].sort((a,b)=>a-b),performanceSample={medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],frames:frameTimes.length};check('live dial delivers frames without severe jank',performanceSample.medianMs<50&&performanceSample.p95Ms<120,performanceSample);
 for(const [width,height] of [[360,780],[390,844],[768,1024],[1113,834],[1440,900]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>{const stage=document.querySelector('.stage');window.scrollTo({top:window.scrollY+stage.getBoundingClientRect().top-8,behavior:'instant'});});await page.waitForTimeout(120);
  const item=await page.evaluate(()=>{const box=selector=>{const node=document.querySelector(selector),r=node?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,visible:!!r.width&&!!r.height}:null;};return{dial:box('#raceActionDial'),gas:box('#raceDialGas'),brake:box('#padR [data-id="brake"]'),pad:box('#padL'),stage:box('.stage'),selected:document.querySelector('#raceActionDial')?.dataset.selected,gauge:document.querySelector('#raceActionDial')?.dataset.gauge,storage:Object.keys(localStorage).sort()};});
  await page.screenshot({path:join(out,`classic-${width}.png`)});
  check(`Classic controls fit ${width}`,!!item.dial?.visible&&!!item.gas?.visible&&!!item.brake?.visible&&item.dial.x>=0&&item.dial.x+item.dial.width<=width&&item.dial.y+item.dial.height<=height&&item.brake.x>=0&&item.brake.y+item.brake.height<=height,item);
  check(`canonical storage ${width}`,item.storage.every(key=>['impactlab.nick','impactlab.v1','kicklab.profiles.v1'].includes(key)),item.storage);
 }
 await page.setViewportSize({width:390,height:844});
 for(const [mode,selector] of [['analog','#analogControlsButton'],['simulator','#simulatorControlsButton'],['classic','#classicControlsButton']]){
  await page.locator('#racePhoneToolsToggle').click();await page.locator(selector).click();if(await page.locator('#racePhoneToolsToggle').getAttribute('aria-expanded')==='true')await page.locator('#racePhoneToolsToggle').click();
  await page.locator('#raceActionDial').waitFor({state:'visible'});await page.evaluate(()=>{const stage=document.querySelector('.stage');window.scrollTo({top:window.scrollY+stage.getBoundingClientRect().top-8,behavior:'instant'});});const item=await page.evaluate(()=>{const r=document.querySelector('#raceActionDial')?.getBoundingClientRect();return{controller:document.querySelector('#raceActionDial')?.dataset.controller,box:r&&{x:r.x,y:r.y,width:r.width,height:r.height},gas:document.querySelector('#raceDialGas')?.getAttribute('aria-label'),action:document.querySelector('#raceDialAction')?.getAttribute('aria-label')};});
  await page.screenshot({path:join(out,`${mode}-390.png`)});check(`${mode} dial and labels`,item.controller===mode&&!!item.box&&item.box.x>=0&&item.box.x+item.box.width<=390&&item.box.y+item.box.height<=844&&!!item.gas&&!!item.action,item);
  const throttle=await page.locator('#raceDialGas').boundingBox();await page.mouse.move(throttle.x+throttle.width/2,throttle.y+5);await page.mouse.down();await page.waitForFunction(()=>window.__KICKLAB_RACE_SIMULATOR_QA__?.state?.()?.inputs?.gas>=.7);await page.mouse.up();await page.waitForFunction(()=>!window.__KICKLAB_RACE_SIMULATOR_QA__?.state?.()?.inputs?.gas);check(`${mode} Gas input releases canonically`,true,{});
  const brakeSelector=mode==='analog'?'#raceAnalogActions [data-race-assist="brake"]':mode==='simulator'?'#simBrake':'#padR [data-id="brake"]';await page.locator(brakeSelector).click();const afterBrake=await page.evaluate(()=>window.__KICKLAB_RACE_SIMULATOR_QA__?.state?.()?.inputs);check(`${mode} Brake input releases canonically`,afterBrake?.brake===false,afterBrake);
  for(const [width,height] of [[360,780],[768,1024],[1113,834],[1440,900]]){await page.setViewportSize({width,height});await page.evaluate(()=>{const stage=document.querySelector('.stage');window.scrollTo({top:window.scrollY+stage.getBoundingClientRect().top-8,behavior:'instant'});});const bounds=await page.evaluate(selector=>{const rect=node=>{const r=document.querySelector(node)?.getBoundingClientRect();return r&&{x:r.x,y:r.y,width:r.width,height:r.height};};return{dial:rect('#raceActionDial'),brake:rect(selector)};},brakeSelector);await page.screenshot({path:join(out,`${mode}-${width}.png`)});const d=bounds.dial,b=bounds.brake,overlap=d&&b&&d.x<b.x+b.width&&d.x+d.width>b.x&&d.y<b.y+b.height&&d.y+d.height>b.y;check(`${mode} dial and Brake fit ${width}`,!!d&&!!b&&!overlap&&d.x>=0&&d.x+d.width<=width&&d.y+d.height<=height&&b.x>=0&&b.x+b.width<=width&&b.y+b.height<=height,bounds);}
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const stage=document.querySelector('.stage');window.scrollTo({top:window.scrollY+stage.getBoundingClientRect().top-8,behavior:'instant'});});
 }
 const dial=page.locator('#raceActionDial');
 const before=await dial.evaluate(node=>({selected:node.dataset.selected,available:node.dataset.available,needle:node.style.getPropertyValue('--needle-angle')}));
 check('Drag exposes Shift and charged NOS in one dial',before.selected==='shift'&&before.available.includes('nos'),before);
 const shiftBox=await page.locator('#raceDialAction').boundingBox();const initialGear=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__?.state()?.gear);
 await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('Space');
 await page.waitForFunction(()=>{const s=window.__KICKLAB_RACE_SHIFT_QA__?.state();return s?.phase==='run'&&s.selected==='shift'&&s.gauge==='OPT'&&s.ratio>=s.window.low+.025;},null,{timeout:12000});
 const band=await page.evaluate(()=>({phase:window.__KICKLAB_RACE_MODES_QA__?.state?.()?.phase,speedKmh:window.__KICKLAB_RACE_MODES_QA__?.state?.()?.speedKmh,actionPhase:document.querySelector('#raceActionDial')?.dataset.actionPhase,needle:document.querySelector('#raceActionDial')?.style.getPropertyValue('--needle-angle')}));
 check('canonical driving reaches Shift action band',band.phase==='run'&&band.speedKmh>10&&band.actionPhase==='act'&&band.needle!==before.needle,band);
 await page.mouse.click(shiftBox.x+shiftBox.width/2,shiftBox.y+shiftBox.height/2);await page.keyboard.up('Space');
 const shifted=await page.evaluate(()=>({gear:window.__KICKLAB_RACE_SHIFT_QA__?.state()?.gear,lastShift:window.__KICKLAB_RACE_SHIFT_QA__?.state()?.lastShift,action:document.querySelector('#raceDialAction')?.getAttribute('aria-label'),coach:document.querySelector('#coachMsg')?.textContent}));check('outer Shift advances canonical gear in band',shifted.gear===initialGear+1&&shifted.lastShift==='optimal'&&shifted.coach?.includes('Good shift'),shifted);
 await page.locator('#raceDialNext').click();check('outer ring cycles to NOS',(await dial.getAttribute('data-selected'))==='nos',await dial.getAttribute('data-selected'));
 await page.locator('#raceDialAction').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.nosPulse>0);
 const fired=await dial.evaluate(node=>({gauge:node.dataset.gauge,state:node.dataset.gaugeState,available:node.dataset.available}));check('outer NOS triggers canonical pulse and pressure gauge',fired.gauge==='nos'&&!!fired.state,fired);
 check('active NOS pulse cannot be retriggered from the dial',fired.state==='ON'&&!fired.available.includes('nos'),fired);
 const gasBox=await page.locator('#raceDialGas').boundingBox();await page.mouse.move(gasBox.x+gasBox.width/2,gasBox.y+5);await page.mouse.down();
 await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.7);
 const throttle=await dial.evaluate(node=>({needle:node.style.getPropertyValue('--needle-angle'),throttle:document.querySelector('#raceDialThrottle')?.textContent}));check('Gas drives canonical throttle and live needle',throttle.throttle!=='0%'&&throttle.needle!==before.needle,throttle);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(()=>!window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas);check('focus loss cancels held throttle',true,{});await page.mouse.up();
 const finishCases=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.actionCases());
 const approach=await page.evaluate(()=>({selected:document.querySelector('#raceActionDial')?.dataset.selected,available:document.querySelector('#raceActionDial')?.dataset.available,signature:window.__KICKLAB_RACE_3D__?.signatureFinish,x:window.__KICKLAB_RACE_MODES_QA__?.state?.()?.x}));check('finish handbrake appears only in canonical approach and takes priority',!before.available.includes('finish-handbrake')&&finishCases.finish.available.includes('finish-handbrake')&&approach.selected==='finish-handbrake'&&approach.x<240,approach);
 const finishAction=await page.locator('#raceDialAction').boundingBox();await page.mouse.move(finishAction.x+finishAction.width/2,finishAction.y+finishAction.height/2);await page.mouse.down();await page.waitForFunction(()=>window.__KICKLAB_RACE_SIMULATOR_QA__?.state?.()?.inputs?.drift===true);const heldFinish=await page.evaluate(()=>window.__KICKLAB_RACE_SIMULATOR_QA__?.state?.()?.inputs);await page.mouse.up();await page.waitForFunction(()=>window.__KICKLAB_RACE_SIMULATOR_QA__?.state?.()?.inputs?.drift===false);check('finish handbrake releases canonical input',heldFinish.drift===true,heldFinish);
}catch(error){report.errors.push(error.stack||String(error));}
finally{await context.close();await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(item=>!item.pass),errors:report.errors,external:report.external,out},null,2));
if(report.errors.length||report.external.length||report.checks.some(item=>!item.pass))process.exitCode=1;
