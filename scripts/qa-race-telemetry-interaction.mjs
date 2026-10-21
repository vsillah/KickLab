import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:5856/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-telemetry/interaction');
mkdirSync(out,{recursive:true});
const report={base,head:process.env.KICKLAB_QA_HEAD||null,checks:[],errors:[],external:[],samples:{}};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});

async function open({width=390,height=844,reduced=false,assetFailure=false,flag=true,record=false}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',recordVideo:record?{dir:out,size:{width,height}}:undefined});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.route('**/*',route=>{const url=route.request().url();if(assetFailure&&url.endsWith('kicklab-race-vehicle.glb'))return route.abort();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(url);route.abort();});
  const url=new URL(base);if(flag)url.searchParams.set('raceTelemetry','prototype');url.searchParams.set('rev',report.head||'qa');
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const toast=page.locator('.toast-close:visible').first();if(await toast.count())await toast.click();
  if(width<=480)await page.click('#controllerCollapseButton');
  await page.locator('.stage:visible').first().scrollIntoViewIfNeeded();
  return{context,page,url:url.toString()};
}
const audit=page=>page.evaluate(()=>({t:window.__KICKLAB_RACE_TELEMETRY__,scene:window.__KICKLAB_RACE_3D__,storage:Object.keys(localStorage).sort(),pause:document.querySelector('#gamePacingOverlay')?.hidden,applyDisabled:document.querySelector('#raceTelemetryApply')?.disabled}));

try{
  const {context,page,url}=await open({record:true});report.url=url;
  const initial=await audit(page);report.samples.initial=initial;
  check('prototype starts with Coach recommendation',initial.t?.enabled&&initial.t.selected==='rpm'&&!initial.t.manual,initial.t);
  await page.click('#raceTelemetryNext');let next=await audit(page);
  check('pointer paging selects torque and holds manual view',next.t?.selected==='torque'&&next.t.manual,next.t);
  await page.locator('#raceTelemetryNext').focus();await page.keyboard.press('ArrowRight');next=await audit(page);
  check('keyboard paging selects NOS',next.t?.selected==='nos'&&next.t.manual,next.t);
  await page.keyboard.press('Shift');await page.keyboard.press('n');next=await audit(page);
  check('legacy Drift and Nitro keys cannot bypass gauge',!next.scene?.dynamics.inputs.drift&&!next.scene?.dynamics.inputs.nitro,next.scene?.dynamics.inputs);
  await page.locator('#raceTelemetry').screenshot({path:join(out,'manual-nos.png')});
  await page.locator('#raceTelemetryApply').waitFor({state:'visible'});
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics.state==='run',{timeout:8000});
  await page.waitForFunction(()=>!document.querySelector('#raceTelemetryApply').disabled,{timeout:8000});
  const beforePulse=await audit(page);await page.click('#raceTelemetryApply');
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.effects?.exhaust>.5,null,{timeout:2000});
  const pulse=await audit(page);report.samples.pulse=pulse;
  check('in-band NOS lock creates a finite pulse',pulse.t?.lock==='nos'&&pulse.t.nosPulse>0&&pulse.t.pressure<beforePulse.t.pressure,{before:beforePulse.t,after:pulse.t});
  check('NOS pulse drives the vehicle and visual beat',pulse.scene?.dynamics.boost&&pulse.scene.effects?.exhaust>.5&&pulse.scene.effects?.streak>.1,pulse.scene);
  await page.locator('.stage:visible').first().screenshot({path:join(out,'nos-pulse.png')});
  await page.locator('#settingsToggle').evaluate(button=>button.click());
  await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.nosPulse===0);
  const paused=await audit(page);report.samples.paused=paused;
  check('settings pause cancels pulse and held gas',paused.t?.nosPulse===0&&paused.t.lock===''&&await page.locator('#settingsDrawer').isVisible(),paused);
  await page.click('#settingsClose');await page.waitForTimeout(1300);const expired=await audit(page);
  check('pulse stays cancelled after resume',expired.t?.nosPulse===0&&expired.t.lock==='',expired.t);
  await page.keyboard.up('Space');
  await page.click('#raceTelemetryPrev');await page.click('#raceTelemetryPrev');await page.click('#raceTelemetryPrev');
  await page.locator('#raceTelemetry').screenshot({path:join(out,'coach-after-pause.png')});
  const memory0=expired.scene?.gpuMemory;
  await page.waitForTimeout(2400);const afterWait=await audit(page),memory1=afterWait.scene?.gpuMemory;
  check('bounded smoke pool and stable GPU resources',expired.scene?.effects?.pool===8&&memory0&&memory1&&memory1.geometries<=memory0.geometries+2&&memory1.textures<=memory0.textures+1,{memory0,memory1,effects:expired.scene?.effects});
  check('prototype creates no new storage key',afterWait.storage.every(key=>initial.storage.includes(key)),{initial:initial.storage,after:afterWait.storage});
  await context.close();
  const video=await page.video().path();report.video=video;

  const fallback=await open({width:768,height:1024,assetFailure:true});
  await fallback.page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='canvas-fallback');
  const fb=await audit(fallback.page);check('asset failure keeps telemetry and Canvas playable',fb.scene?.status==='canvas-fallback'&&fb.t?.enabled,fb);await fallback.page.evaluate(()=>document.activeElement?.blur());await fallback.page.keyboard.down('Space');await fallback.page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.clock>.1,null,{timeout:8000});await fallback.page.keyboard.up('Space');await fallback.page.locator('.stage:visible').first().screenshot({path:join(out,'canvas-play.png')});await fallback.context.close();

  const reduced=await open({reduced:true});await reduced.page.click('#raceTelemetryNext');await reduced.page.click('#raceTelemetryNext');await reduced.page.evaluate(()=>document.activeElement?.blur());await reduced.page.keyboard.down('Space');await reduced.page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics.state==='run',null,{timeout:8000});await reduced.page.waitForFunction(()=>!document.querySelector('#raceTelemetryApply').disabled,null,{timeout:8000});await reduced.page.click('#raceTelemetryApply');await reduced.page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.effects?.exhaust>.5,null,{timeout:2000});const rm=await audit(reduced.page);check('reduced motion preserves NOS but suppresses camera streak',rm.scene?.reducedMotion&&rm.t?.nosPulse>0&&rm.scene.effects?.streak===0,rm);await reduced.page.keyboard.up('Space');await reduced.context.close();

  const off=await open({flag:false});const defaultOff=await audit(off.page);check('default off keeps telemetry absent',!defaultOff.t&&defaultOff.scene===undefined,defaultOff);await off.context.close();
}catch(error){report.errors.push(error.stack||String(error));}
finally{await browser.close();}
check('no browser errors',report.errors.length===0,report.errors);
check('zero external requests',report.external.length===0,report.external);
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head:report.head,checks:report.checks.length,failed:report.checks.filter(x=>!x.pass),errors:report.errors,external:report.external,video:report.video},null,2));
if(report.checks.some(x=>!x.pass))process.exitCode=1;
