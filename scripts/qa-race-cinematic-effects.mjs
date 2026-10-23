import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5971/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-cinematic-effects');
const revision=process.argv[4]||'unbound';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const report={revision,base,states:[],lifecycle:[],pacing:[],errors:[],external:[]};
async function open(width,height,{analog=false,reduced=false,canvas=false,mode='drag',vehicle='cobalt'}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
  await context.addInitScript(gfx=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})),canvas?'2d':'3d');
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).origin!==new URL(base).origin)report.external.push(request.url());});
  const url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceEngineQA','1');url.searchParams.set('rev',revision);
  await page.goto(url.toString(),{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();await page.locator('#lab-tab-race').click();
  if(!canvas){const skip=page.locator('.race-orbit-panel button');await skip.waitFor({state:'visible',timeout:5000}).catch(()=>{});if(await skip.isVisible())await skip.click();}
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  await page.evaluate(({mode,vehicle})=>window.__KICKLAB_RACE_ENGINE_QA__.select(mode,vehicle),{mode,vehicle});
  if(!canvas)await page.waitForFunction(vehicle=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.vehicleId===vehicle&&window.__KICKLAB_RACE_FX__?.vehicle===vehicle,vehicle,{timeout:15000});
  await page.evaluate(()=>{window.__KICKLAB_RACE_ENGINE_QA__.holdPresentation(true);window.__KICKLAB_RACE_ENGINE_QA__.run();});if(analog)await page.locator('#analogControlsButton').click();
  return{context,page};
}
async function stage(page,label,fixture,{capture=false}={}){
  const result=await page.evaluate(fixture=>{const data=window.__KICKLAB_RACE_ENGINE_QA__.effect(fixture),rect=document.querySelector('.stage:not([hidden])')?.getBoundingClientRect();return{...data,stage:rect&&{width:rect.width,height:rect.height},overflow:document.documentElement.scrollWidth-innerWidth};},fixture);
  if(capture){const path=join(out,label+'.png');await page.locator('.stage').screenshot({path});result.screenshot=path;}
  report.states.push({label,fixture,...result});return result;
}
try{
  for(const [width,height] of [[360,780],[390,844],[768,1024],[1113,988],[1440,1000]])for(const analog of [false,true]){
    const label=`${width}-${analog?'analog':'classic'}`,run=await open(width,height,{analog});
    for(const fixture of ['normal-exhaust','exhaust','nos-ignition','nos','launch','brake','brake-hot','drift','cutaway-chassis','cutaway-drivetrain','cutaway-suspension','cutaway-brakes','cutaway-cooling'])await stage(run.page,`${label}-${fixture}`,fixture,{capture:width===390||width===1440});
    const p95=await run.page.evaluate(()=>new Promise(resolve=>{let last=performance.now();const frames=[];function tick(now){if(last)frames.push(now-last);last=now;if(frames.length<80)requestAnimationFrame(tick);else{frames.sort((a,b)=>a-b);resolve(frames[Math.floor(frames.length*.95)]);}}requestAnimationFrame(tick);}));report.pacing.push({label,p95Ms:+p95.toFixed(2),budgetMs:width<=480?40:33.3,pass:p95<=(width<=480?40:33.3)});
    if(width===390&&!analog){await stage(run.page,'lifecycle-launch','launch');const faded=await run.page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.effectsLifecycle('fade'));report.lifecycle.push({name:'marks-fade',pass:faded.fx?.visibleMarks===0,detail:faded});await stage(run.page,'lifecycle-nos','nos');const hidden=await run.page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.effectsLifecycle('pagehide'));report.lifecycle.push({name:'pagehide-cancels-boost',pass:hidden.paused&&hidden.fx?.flameEnergy===0&&!hidden.inputs.gas,detail:hidden});const reset=await run.page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.effectsLifecycle('reset'));report.lifecycle.push({name:'reset-clears-pools',pass:!reset.fx&&!reset.captionShown,detail:reset});}
    await run.context.close();
  }
  for(const vehicle of ['kestrel','cobalt','aegis'])for(const mode of ['drag','drift','circuit','hill']){
    const run=await open(390,844,{vehicle,mode});await stage(run.page,`${mode}-${vehicle}-nos`,'nos');await run.context.close();
  }
  const reduced=await open(390,844,{reduced:true});for(const fixture of ['nos','drift','cutaway'])await stage(reduced.page,`reduced-${fixture}`,fixture,{capture:true});await reduced.context.close();
  const fallback=await open(390,844,{canvas:true});await stage(fallback.page,'canvas-fallback','exhaust',{capture:true});await fallback.context.close();
}catch(error){report.errors.push(error.stack||String(error));}finally{await browser.close();}
report.failed=report.states.filter(row=>{
  if(row.overflow>0||row.storage.some(key=>!['impactlab.v1','impactlab.nick','kicklab.profiles.v1'].includes(key)))return true;
  if(row.renderer!=='rendering')return false;
  if(row.fixture==='exhaust'||row.fixture==='normal-exhaust')return row.fx?.vapor<1;
  if(row.fixture==='nos'||row.fixture==='nos-ignition')return !row.fx?.boost||row.fx.flameEnergy<.1||(!row.fx.reducedMotion&&!row.flamesVisible)||row.fx.reducedMotion&&row.flamesVisible;
  if(['launch','brake','brake-hot','drift'].includes(row.fixture))return row.fx?.markCount<2||(!row.fx.reducedMotion&&row.fx.tireSmoke<1);
  if(row.fixture.startsWith('cutaway'))return !row.fx?.cutaway||!row.captionShown||row.fixture!=='cutaway'&&row.fx.cutaway.system!==row.fixture.slice('cutaway-'.length);
  return false;
}).map(row=>row.label).concat(report.lifecycle.filter(row=>!row.pass).map(row=>row.name),report.pacing.filter(row=>!row.pass).map(row=>row.label+'-pacing'));
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({states:report.states.length,failed:report.failed,errors:report.errors,external:[...new Set(report.external)]},null,2));if(report.failed.length||report.errors.length||report.external.length)process.exitCode=1;
