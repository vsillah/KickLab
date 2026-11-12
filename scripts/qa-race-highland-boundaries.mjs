import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.QA_BASE||'http://127.0.0.1:4973/kicklab.html';
const origin=new URL(base).origin;
const flags={raceSystems:'proxy',raceTelemetry:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceExpansion:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',racePreflight:'prototype',raceHighlandFidelity:'prototype'};
const url=new URL(base);for(const [name,value] of Object.entries(flags))url.searchParams.set(name,value);
const out=resolve('qa-artifacts/race-highland-fidelity/boundaries');mkdirSync(out,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({headless:true,executablePath});
const rows=[],errors=[];
async function scenario(name,{gfx='3d',offline=false,webglFailure=false,lifecycle=false,reload=false}={}){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  await context.addInitScript(({gfx,webglFailure})=>{
    localStorage.setItem('impactlab.v1',JSON.stringify({gfx,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));
    if(webglFailure){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl'||kind==='webgl2'||kind==='experimental-webgl')return null;return original.call(this,kind,...args);};}
  },{gfx,webglFailure});
  const page=await context.newPage(),external=[],offlineDocuments=[],pageErrors=[];let networkOff=false;
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('request',request=>{const target=new URL(request.url());if(target.origin!==origin&&!['data:','blob:'].includes(target.protocol))external.push(target.href);if(networkOff&&request.isNavigationRequest())offlineDocuments.push(target.href);});
  try{
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    if(offline){await page.waitForFunction(()=>window.__KICKLAB_RACE_3D_PREP__?.status==='ready',null,{timeout:12000});networkOff=true;await context.setOffline(true);}
    await page.locator('#lab-tab-race').click();
    if(await page.locator('#racePreflight').isVisible())await page.locator('#racePreflightClose').click();
    await page.locator('#game-cockpit').waitFor({state:'visible',timeout:12000});
    if(gfx==='3d'&&!webglFailure)await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering',null,{timeout:15000});
    if(webglFailure)await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='canvas-fallback',null,{timeout:15000});
    if(lifecycle){await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering');}
    const beforeReload=reload?await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1')):null;
    if(reload){await page.reload({waitUntil:'domcontentloaded'});if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.locator('#lab-tab-race').click();if(await page.locator('#racePreflight').isVisible())await page.locator('#racePreflightClose').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering',null,{timeout:15000});const after=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));if(beforeReload!==after)errors.push(`${name}: profile storage changed on reload`);}
    const audit=await page.evaluate(()=>({race3d:window.__KICKLAB_RACE_3D__||null,canvasVisible:!!document.querySelector('#cv')&&getComputedStyle(document.querySelector('#cv')).display!=='none',storedKeys:Object.keys(localStorage).sort(),url:location.href}));
    if(!audit.canvasVisible&&gfx==='2d')errors.push(`${name}: Canvas unavailable`);
    if(gfx==='3d'&&!webglFailure&&audit.race3d?.status!=='rendering')errors.push(`${name}: WebGL unavailable`);
    if(webglFailure&&audit.race3d?.status!=='canvas-fallback')errors.push(`${name}: fallback unavailable`);
    if(external.length||offlineDocuments.length||pageErrors.length)errors.push(`${name}: ${JSON.stringify({external,offlineDocuments,pageErrors})}`);
    rows.push({name,offline,webglFailure,gfx,audit:{status:audit.race3d?.status||null,canvasVisible:audit.canvasVisible,storedKeys:audit.storedKeys,url:audit.url},external,offlineDocuments,pageErrors});
  }catch(error){errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
}
try{await scenario('canvas',{gfx:'2d'});await scenario('webgl-failure',{webglFailure:true});await scenario('offline-webgl',{offline:true});await scenario('visibility-recovery',{lifecycle:true});await scenario('storage-recovery',{reload:true});}finally{await browser.close();}
const report={url:url.href,rows,errors};writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
