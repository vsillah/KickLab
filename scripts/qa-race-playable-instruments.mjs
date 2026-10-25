import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const origin=process.env.KICKLAB_QA_ORIGIN||'http://127.0.0.1:5177';
const out=resolve(process.argv[2]||`qa-artifacts/race-playable-instruments/${head.slice(0,7)}`);
mkdirSync(out,{recursive:true});
const report={head,origin,checks:[],errors:[],external:[],samples:{}};
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const flags={raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',rev:head.slice(0,7)};
function gate(name,condition,detail){report.checks.push({name,pass:!!condition,detail});if(!condition)throw new Error(`FAIL ${name}: ${JSON.stringify(detail)}`);}
async function open({flag=true,width=390,height=844,reduced=false,assetFailure=false,record=false}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference',recordVideo:record?{dir:out,size:{width,height}}:undefined});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.route('**/*',route=>{const url=route.request().url();if(assetFailure&&url.endsWith('.glb'))return route.abort();if(url.startsWith(`${origin}/`)||url.startsWith(`blob:${origin}/`)||url.startsWith('data:'))return route.continue();report.external.push(url);return route.abort();});
  const params=new URLSearchParams({...flags,...(!flag?{raceInstruments:''}:{})});if(!flag)params.delete('raceInstruments');
  const url=`${origin}/?${params}`;await page.goto(url,{waitUntil:'networkidle'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:15000});
  return{context,page,url};
}
const snapshot=page=>page.evaluate(()=>({dynamics:window.__KICKLAB_RACE_3D__?.dynamics,renderer:window.__KICKLAB_RACE_3D__?.status,vehicle:window.__KICKLAB_RACE_3D__?.vehicle,telemetry:window.__KICKLAB_RACE_TELEMETRY__,gas:document.querySelector('#padR [data-id="gas"]')?.getAttribute('aria-label'),shift:document.querySelector('#padR [data-id="instrument-shift"]')?.getAttribute('aria-label'),nos:document.querySelector('#padR [data-id="instrument-nos"]')?.getAttribute('aria-label'),drift:document.querySelector('#padR [data-id="drift"]')?.getAttribute('aria-label'),storage:Object.keys(localStorage).sort()}));
const waitInput=(page,predicate)=>page.waitForFunction(predicate,null,{timeout:5000});
async function shiftCase(name,targetKmh,expected){
  const run=await open();try{
    const {page}=run;await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:20000});
    const shift=page.locator('#padR [data-id="instrument-shift"]');await shift.waitFor({state:'visible'});
    if(targetKmh>0){await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('Space');await page.waitForFunction(kmh=>window.__KICKLAB_RACE_3D__?.dynamics?.v*3.6>=kmh,targetKmh,{timeout:20000});await page.keyboard.up('Space');}
    const before=await snapshot(page);await shift.click();if(name==='early')await page.keyboard.press('Enter');const after=await snapshot(page);report.samples[`shift-${name}`]={before,after};
    gate(`${name} Shift uses canonical speed band`,after.shift?.includes('Shift to gear 3')&&after.shift?.includes(`Last shift ${expected}`)&&before.shift?.includes('Shift to gear 2'),{before:before.shift,after:after.shift,speedKmh:Math.round((before.dynamics?.v||0)*3.6)});
    if(name==='early')gate('shift cooldown blocks immediate repeated input',after.shift?.includes('Shift to gear 3')&&after.shift?.includes('Last shift early'),after.shift);
  }finally{await run.context.close();}
}
async function nosCase(){
  const run=await open();try{
    const {page}=run;await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:20000});
    const nos=page.locator('#padR [data-id="instrument-nos"]');await nos.waitFor({state:'visible'});
    const ready=await snapshot(page);gate('NOS begins ready from canonical pressure and tank',ready.nos?.includes('ready to activate')&&ready.telemetry.pressure>=.25&&ready.dynamics.nitro>.1,ready);
    await nos.click();await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.nosPulse>0);
    const active=await snapshot(page);gate('NOS action activates a real timed pulse',active.nos?.includes('active')&&active.telemetry.nosPulse>0&&active.telemetry.pressure<ready.telemetry.pressure,{ready,active});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.nosPulse===0,null,{timeout:5000});
    const afterPulse=await snapshot(page);report.samples.nos={ready,active,afterPulse};
    gate('NOS pulse returns to charge state',afterPulse.telemetry.nosPulse===0&&afterPulse.telemetry.pressure>active.telemetry.pressure,afterPulse);
  }finally{await run.context.close();}
}
let active;
try{
  const off=await open({flag:false});await off.page.locator('#raceCoachSetupStart').click();try{await off.page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:20000});}catch(error){report.samples.offStart=await snapshot(off.page);await off.page.screenshot({path:join(out,'off-start-failure.png')});throw error;}
  const offState=await snapshot(off.page);gate('explicit flag keeps instruments off',!offState.shift&&!offState.nos&&!off.page.url().includes('raceInstruments='),offState);await off.context.close();

  active=await open({record:true});report.url=active.url;const {page}=active;
  await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run'&&window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.vehicle===true,null,{timeout:20000});
  await page.locator('#padR [data-id="instrument-shift"]').waitFor({state:'visible'});
  const start=await snapshot(page);report.samples.start=start;
  gate('live 3D Drag instruments read canonical state',start.gas?.includes('RPM')&&start.shift?.includes('Shift to gear 2')&&start.nos?.includes('NOS charge')&&start.renderer==='rendering'&&start.vehicle,start);
  const gas=page.locator('#padR [data-id="gas"]');await gas.scrollIntoViewIfNeeded();const box=await gas.boundingBox();gate('Gas touch target is visible and at least 44 px',box.width>=44&&box.height>=44&&box.y>=0&&box.y+box.height<=844,box);
  await page.mouse.move(box.x+box.width/2,box.y+5);await page.mouse.down();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.8);const high=await snapshot(page);report.samples.high=high;
  await page.mouse.move(box.x+box.width/2,box.y+box.height-5,{steps:6});await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas<=.2);const low=await snapshot(page);report.samples.low=low;
  gate('vertical Gas pointer changes real throttle up and down',high.dynamics.inputs.gas>=.8&&low.dynamics.inputs.gas<=.2&&high.dynamics.inputs.gas>low.dynamics.inputs.gas,{high:high.dynamics,low:low.dynamics});
  await page.mouse.up();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);gate('pointerup releases Gas',!(await snapshot(page)).dynamics.inputs.gas,await snapshot(page));
  const cdp=await active.context.newCDPSession(page),touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1,radiusX:4,radiusY:4,force:1}]});
  await touch('touchStart',box.x+box.width/2,box.y+5);await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.8);await touch('touchCancel',box.x+box.width/2,box.y+5);await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);gate('pointercancel releases Gas',!(await snapshot(page)).dynamics.inputs.gas,await snapshot(page));
  await gas.focus();await page.keyboard.press('ArrowUp');await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>0);await page.locator('#racePhoneToolsToggle').focus();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);gate('keyboard focus loss releases Gas',!(await snapshot(page)).dynamics.inputs.gas,await snapshot(page));
  await page.mouse.move(box.x+box.width/2,box.y+5);await page.mouse.down();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.8);
  const captured=await gas.evaluate(button=>button.hasPointerCapture(1));gate('Gas captures its active pointer',captured,{captured});
  await gas.evaluate(button=>button.releasePointerCapture(1));await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);await page.mouse.up();gate('lost pointer capture releases Gas',!(await snapshot(page)).dynamics.inputs.gas,await snapshot(page));
  await page.mouse.move(box.x+box.width/2,box.y+5);await page.mouse.down();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.8);await page.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);await page.mouse.up();gate('orientation change releases Gas',!(await snapshot(page)).dynamics.inputs.gas,await snapshot(page));
  await gas.focus();await page.keyboard.press('ArrowUp');await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>0);await page.locator('#racePhoneToolsToggle').click();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);gate('wrench expansion releases Gas and hides play instruments',!(await snapshot(page)).dynamics.inputs.gas&&!(await page.locator('#padR [data-id="instrument-shift"]').isVisible()),await snapshot(page));
  await page.locator('#racePhoneToolsToggle').click();await page.locator('#padR [data-id="instrument-shift"]').waitFor({state:'visible'});gate('closing wrench restores Shift',await page.locator('#padR [data-id="instrument-shift"]').isVisible(),await snapshot(page));
  const layout=[];for(const width of [360,390,768,1113,1440]){await page.setViewportSize({width,height:width<=390?844:width===768?1024:900});await gas.scrollIntoViewIfNeeded();layout.push(await page.evaluate(()=>{const stage=document.querySelector('.stage'),rect=stage.getBoundingClientRect(),buttons=[...document.querySelectorAll('#padR .abtn:not([hidden])')].filter(button=>getComputedStyle(button).display!=='none').map(button=>{const r=button.getBoundingClientRect();return{id:button.dataset.id,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}});return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,stage:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},buttons};}));}
  report.samples.layout=layout;gate('Classic action targets fit at phone through desktop widths',layout.every(({width,scrollWidth,stage,buttons})=>scrollWidth<=width+1&&buttons.length>=4&&buttons.every(button=>button.width>=44&&button.height>=44&&button.x>=stage.left-1&&button.right<=stage.right+1&&button.y>=stage.top-1&&button.bottom<=stage.bottom+1)),layout);
  await page.locator('.stage:visible').first().screenshot({path:join(out,'classic-live.png')});
  await active.context.close();active=null;
  await shiftCase('early',0,'early');
  await shiftCase('optimal',50,'optimal');
  await shiftCase('late',78,'late');
  await nosCase();
}catch(error){report.errors.push(error.stack||String(error));}
finally{if(active)await active.context.close();await browser.close();}
report.checks.push({name:'zero external requests',pass:report.external.length===0,detail:report.external});
report.checks.push({name:'no browser errors',pass:report.errors.length===0,detail:report.errors});
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,checks:report.checks.length,failed:report.checks.filter(check=>!check.pass),errors:report.errors,external:report.external,out},null,2));
if(report.checks.some(check=>!check.pass))process.exitCode=1;
