import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const base='http://127.0.0.1:4173/kicklab.html?raceExpansion=prototype&raceTelemetry=prototype';
const results=[];
async function enter(context,url){const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(url,{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});return{page,errors};}
try{
  {
    const context=await browser.newContext({viewport:{width:390,height:844}}),{page,errors}=await enter(context,base);
    if(await page.locator('#racePreflight').isVisible()||await page.evaluate(()=>!!globalThis.__KICKLAB_RACE_PREFLIGHT_QA__))throw Error('Default-off route exposed preflight');
    await page.click('#raceCoachSetupStart');
    await page.waitForFunction(()=>['count','run'].includes(globalThis.__KICKLAB_RACE_MODES_QA__?.state().phase),{timeout:10000});
    if(errors.length)throw Error(`Default path errors: ${errors.join('; ')}`);
    results.push({case:'default-off',pass:true});await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),{page,errors}=await enter(context,base+'&racePreflight=prototype&raceChampionship=prototype');
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:10000});
    if(await page.locator('#racePreflight video').count())throw Error('Reduced-motion route started video');
    const before=await page.evaluate(()=>({saved:globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().saved,storage:localStorage.getItem('kicklab.profiles.v1')}));
    await page.locator('[data-preflight-mode="hill"]').click();
    await page.waitForFunction(()=>document.activeElement?.dataset.preflightMode==='hill',{timeout:1500}).catch(()=>{});
    const focused=await page.evaluate(()=>document.activeElement?.outerHTML);
    if(!focused?.includes('data-preflight-mode="hill"'))throw Error(`Focus lost after mode selection: ${focused}`);
    await page.click('#racePreflightNext');await page.locator('[data-preflight-vehicle="kestrel"]').click();await page.click('#racePreflightNext');await page.locator('[data-preflight-part="brakes"][data-preflight-value="sport"]').click();
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().inspection.loaded,undefined,{timeout:15000});
    const reducedInspection=await page.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().inspection);
    if(reducedInspection.vehicle!=='kestrel'||reducedInspection.part!=='brakes'||reducedInspection.frames>8)throw Error(`Reduced-motion inspection did not snap and settle: ${JSON.stringify(reducedInspection)}`);
    await page.keyboard.press('Escape');
    const after=await page.evaluate(()=>({saved:globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().saved,storage:localStorage.getItem('kicklab.profiles.v1'),open:globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().open,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}));
    if(after.open||!after.reduced||JSON.stringify(after.saved)!==JSON.stringify(before.saved)||after.storage!==before.storage||errors.length||(await page.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().inspection.mounted)))throw Error(`Cancellation changed state: ${JSON.stringify({before,after,errors}).slice(0,1500)}`);
    await page.click('#raceCoachSetupStart');await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:5000});
    if((await page.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().draft.vehicle))!=='cobalt')throw Error('Cancelled draft restored instead of saved profile');
    await page.click('#racePreflightClose');
    await page.setViewportSize({width:1440,height:900});
    await page.click('#raceChampionshipToggle');
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:5000});
    const season=await page.evaluate(()=>({draft:globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().draft,disabled:[...document.querySelectorAll('[data-preflight-mode]')].filter(b=>b.disabled).length}));
    if(season.disabled!==4||season.draft.mode!=='drag')throw Error(`Championship route not fixed: ${JSON.stringify(season)}`);
    results.push({case:'cancel-focus-reduced-championship',pass:true});await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl'||kind==='webgl2'?null:original.call(this,kind,...args);};});
    const {page,errors}=await enter(context,base+'&racePreflight=prototype');
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:5000});
    if(await page.locator('#racePreflight video').count())throw Error('Canvas fallback route started video');
    const fallback=await page.evaluate(()=>({status:globalThis.__KICKLAB_RACE_3D__?.status,canvas:getComputedStyle(document.querySelector('#cv')).display}));
    if(fallback.status!=='canvas-fallback'||fallback.canvas!=='block'||errors.length)throw Error(`Canvas fallback failed: ${JSON.stringify({fallback,errors})}`);
    await page.click('#racePreflightNext');await page.click('#racePreflightNext');
    await page.locator('[data-preflight-part="tires"][data-preflight-value="wide"]').click();
    const inspectionFallback=await page.evaluate(()=>({state:globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().inspection,still:document.querySelector('#raceInspectionStage img')?.getAttribute('src'),label:document.querySelector('.race-inspection-fallback')?.textContent,delta:document.querySelector('.race-preflight-deltas')?.textContent}));
    if(!inspectionFallback.state.mounted||inspectionFallback.state.loaded||inspectionFallback.state.part!=='tires'||!inspectionFallback.still?.includes('cobalt')||!inspectionFallback.label?.includes('Canvas')||!inspectionFallback.delta?.includes('Corner limit'))throw Error(`Canvas inspection fallback failed: ${JSON.stringify(inspectionFallback)}`);
    results.push({case:'canvas-fallback',pass:true});await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/media/race-preflight/*.mp4',route=>route.abort());
    await page.goto(base+'&racePreflight=prototype',{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');
    if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:20000});
    await page.locator('[data-preflight-mode="drag"] .race-preflight-media-fallback').waitFor({state:'visible',timeout:10000});
    for(let phase=0;phase<3;phase++)await page.click('#racePreflightNext');
    await page.locator('.race-preflight-grid-car .race-preflight-media-fallback').waitFor({state:'visible',timeout:10000});
    await page.click('#racePreflightNext');
    await page.waitForFunction(()=>!globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:10000});
    if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
    await page.waitForFunction(()=>['count','run'].includes(globalThis.__KICKLAB_RACE_MODES_QA__?.state().phase),{timeout:20000});
    if(errors.length)throw Error(`Local clip fallback errors: ${errors.join('; ')}`);
    results.push({case:'local-video-unavailable',pass:true});await context.close();
  }
  console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
