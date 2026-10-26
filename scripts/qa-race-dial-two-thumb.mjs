import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dirty=!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();
const origin=process.env.KICKLAB_QA_ORIGIN||'http://127.0.0.1:5177';
const out=resolve('qa-artifacts/race-dial-two-thumb',head.slice(0,7));mkdirSync(out,{recursive:true});
const report={head,dirty,checks:[],errors:[],external:[]};
function check(name,pass,detail){report.checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(`${name}: ${JSON.stringify(detail)}`);}
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.errors.push(error.message));
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(`${origin}/`)||url.startsWith(`blob:${origin}/`)||url.startsWith('data:'))return route.continue();report.external.push(url);return route.abort();});
const params=new URLSearchParams({raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',rev:`dial-pointer-${head.slice(0,7)}`});
const state=()=>page.evaluate(()=>({inputs:window.__KICKLAB_RACE_3D__?.dynamics?.inputs,arm:document.querySelector('#raceActionDial')?.dataset.brakeArmed,launch:window.__KICKLAB_RACE_FX__?.audit?.launch}));
try{
  await page.goto(`${origin}/?${params}`,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.orbit?.done&&document.querySelector('#raceCoachSetupStart')?.getBoundingClientRect().width>0);
  await page.locator('#racePhoneToolsToggle').click();await page.locator('#raceToolsGarage').click();
  await page.locator('[data-garage-section="body"]').click();await page.locator('[data-garage-part="body"][data-garage-value="kart"]').click();
  await page.locator('[data-garage-section="tires"]').click();await page.locator('[data-garage-part="tires"][data-garage-value="narrow"]').click();
  await page.locator('#settingsClose').click();if(await page.locator('#racePhoneToolsToggle').getAttribute('aria-expanded')==='true')await page.locator('#racePhoneToolsToggle').click();
  if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done&&document.querySelector('#raceCoachSetupStart')?.getBoundingClientRect().width>0);
  await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run');await page.locator('#raceActionDial').waitFor({state:'visible'});
  await page.locator('#raceDialGas').scrollIntoViewIfNeeded();const brake=await page.locator('#padR [data-id="brake"]').boundingBox(),gas=await page.locator('#raceDialGas').boundingBox();
  check('Brake and dial Gas are reachable at phone width',!!brake&&!!gas&&brake.width>=44&&gas.width>=44&&brake.x>=0&&gas.x+gas.width<=390&&brake.y+brake.height<=844&&gas.y+gas.height<=844,{brake,gas});
  const cdp=await context.newCDPSession(page),point=(x,y,id)=>({x,y,id,radiusX:4,radiusY:4,force:1});
  const touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  const bp=point(brake.x+brake.width/2,brake.y+brake.height/2,1),gpLow=point(gas.x+gas.width/2,gas.y+gas.height*.85,2),gpHigh=point(gas.x+gas.width/2,gas.y+5,2);
  await touch('touchStart',[bp]);await page.waitForTimeout(650);const held=await state();check('long Brake press arms while canonical brake remains held',held.arm==='true'&&held.inputs.brake===true,held);
  await touch('touchEnd',[]);const armed=await state();check('Brake remains armed after first thumb lifts',armed.arm==='true'&&armed.inputs.brake===true,armed);
  await touch('touchStart',[gpLow]);await page.waitForFunction(()=>{const value=window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas;return value>0&&value<.3});const low=await state();check('second thumb begins a low throttle slide with Brake armed',low.inputs.gas>0&&low.inputs.gas<.3&&low.inputs.brake&&low.arm==='true',low);
  for(let step=1;step<=7;step++)await touch('touchMove',[point(gpLow.x,gpLow.y+(gpHigh.y-gpLow.y)*step/7,2)]);
  await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.launch?.reason==='brake-held-rev-band',null,{timeout:3000});const rev=await state();check('same thumb reaches canonical rev band while Brake stays armed',rev.inputs.gas>=.72&&rev.inputs.brake&&rev.arm==='true',rev);
  const bpTap=point(bp.x,bp.y,3);await touch('touchStart',[gpHigh,bpTap]);await touch('touchEnd',[bpTap]);
  await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.launch?.starts>=1,null,{timeout:2000});const launch=await state();check('ending only Brake touch launches without releasing Gas',launch.launch.starts>=1&&launch.inputs.gas>=.7&&!launch.inputs.brake&&launch.arm==='false',launch);
  await touch('touchEnd',[gpHigh]);await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);check('Gas releases on its own pointerup',!(await state()).inputs.gas,await state());
}catch(error){report.errors.push(error.stack||String(error));}
finally{await context.close();await browser.close();}
report.checks.push({name:'zero external requests',pass:report.external.length===0,detail:report.external});
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,dirty,checks:report.checks.length,failed:report.checks.filter(item=>!item.pass),errors:report.errors,external:report.external,out},null,2));
if(report.checks.some(item=>!item.pass)||report.errors.length)process.exitCode=1;
