import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5879/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-coach-resilience');
const head=process.env.KICKLAB_QA_HEAD||'working';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,base,steps:[],errors:[],external:[]};
function check(name,ok,detail){report.steps.push({name,pass:!!ok,detail});if(!ok)throw new Error(`${name}: ${JSON.stringify(detail)}`);}
async function open({width=390,height=844,reduced=false,assetFailure=false}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.route('**/*',route=>{const url=route.request().url();if(assetFailure&&/\.(glb|gltf)(\?|$)/.test(url))return route.abort();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(url);route.abort();});
  const url=new URL(base);for(const [key,value] of [['raceProgression','prototype'],['raceTelemetry','prototype'],['raceCornerTrace','prototype'],['rev',head]])url.searchParams.set(key,value);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});return{context,page,url:url.toString()};
}
async function begin(page,{fallback=false}={}){
  if(!fallback){await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:20000});await page.click('.race-orbit-panel button');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done,null,{timeout:20000});}
  await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:20000});check('setup before live',await page.locator('#raceCoachSetupStart').isVisible(),null);
  await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='run',null,{timeout:10000});
}
try{
  const reduced=await open({reduced:true}),page=reduced.page;
  const keysBefore=await page.evaluate(()=>Object.keys(localStorage).sort());await begin(page);
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.reducedMotion===true,null,{timeout:10000});
  const rm=await page.evaluate(()=>({scene:window.__KICKLAB_RACE_3D__,coach:document.querySelector('#raceTelemetryCue').textContent,telemetryVisible:!!document.querySelector('#raceTelemetry').getClientRects().length}));
  check('reduced motion live coach and static chase',rm.telemetryVisible&&rm.coach.startsWith('Nia:')&&rm.scene.reducedMotion&&rm.scene.effects?.streak===0,{coach:rm.coach,reducedMotion:rm.scene.reducedMotion,effects:rm.scene.effects});
  await page.locator('.stage').screenshot({path:join(out,`390-reduced-live-${head.slice(0,12)}.png`)});
  await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('Space');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===true,null,{timeout:5000});
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false,null,{timeout:5000});await page.keyboard.up('Space');
  const cancelled=await page.evaluate(()=>({inputs:window.__KICKLAB_RACE_3D__?.dynamics?.inputs,telemetry:window.__KICKLAB_RACE_TELEMETRY__}));
  check('focus loss cancels held drive',!cancelled.inputs.gas&&!cancelled.inputs.brake&&!cancelled.inputs.nitro&&cancelled.telemetry?.nosPulse===0,cancelled);
  await page.click('#orientationDetailToggle');await page.locator('#orientationDetail').waitFor({state:'visible'});await page.click('#settingsToggle');
  const paused=await page.evaluate(()=>({drawer:!document.querySelector('#settingsDrawer').hidden,paused:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().paused,inputs:window.__KICKLAB_RACE_3D__?.dynamics?.inputs,telemetry:window.__KICKLAB_RACE_TELEMETRY__}));
  check('settings pause cancels held systems',paused.drawer&&paused.paused&&!paused.inputs.gas&&!paused.inputs.brake&&paused.telemetry?.nosPulse===0,paused);
  await page.click('#settingsClose');await page.waitForFunction(()=>!globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().paused,null,{timeout:5000});
  const resumed=await page.evaluate(()=>({state:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state(),drawerHidden:document.querySelector('#settingsDrawer').hidden,coachVisible:!!document.querySelector('#raceTelemetryCue').getClientRects().length}));
  check('settings close resumes live Race without stale overlay',resumed.state.raceState==='run'&&resumed.drawerHidden&&resumed.coachVisible,resumed);
  const samples=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let last=performance.now();function sample(now){frames.push(now-last);last=now;if(frames.length>=100)resolve(frames.slice(5));else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));samples.sort((a,b)=>a-b);const p95=samples[Math.floor(samples.length*.95)];check('phone frame p95 within existing 42ms gate',p95<=42,{p95});
  const storage=await page.evaluate(()=>Object.keys(localStorage).sort());check('no new storage keys',storage.every(key=>keysBefore.includes(key)),{before:keysBefore,after:storage});
  await reduced.context.close();
  const fallback=await open({width:768,height:1024,assetFailure:true}),canvas=fallback.page;
  await canvas.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='canvas-fallback',null,{timeout:20000});await begin(canvas,{fallback:true});
  const fb=await canvas.evaluate(()=>({state:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state(),scene:window.__KICKLAB_RACE_3D__,canvasVisible:getComputedStyle(document.querySelector('#cv')).display!=='none',cue:document.querySelector('#raceTelemetryCue').textContent,telemetryVisible:!!document.querySelector('#raceTelemetry').getClientRects().length}));
  check('Canvas fallback keeps Coach and playable controls',fb.state.renderer==='canvas'&&fb.state.raceState==='run'&&fb.canvasVisible&&fb.telemetryVisible&&fb.cue.startsWith('Nia:'),{state:fb.state,status:fb.scene.status,canvasVisible:fb.canvasVisible,cue:fb.cue});
  await canvas.locator('.stage').screenshot({path:join(out,`768-canvas-live-${head.slice(0,12)}.png`)});await fallback.context.close();
  check('no page errors',report.errors.length===0,report.errors);check('zero external requests',report.external.length===0,report.external);
}catch(error){report.errors.push(error.stack||String(error));}finally{await browser.close();}
writeFileSync(join(out,`report-${head.slice(0,12)}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({steps:report.steps.map(step=>step.name),errors:report.errors,external:report.external,report:join(out,`report-${head.slice(0,12)}.json`)}));if(report.errors.length||report.external.length)process.exitCode=1;
