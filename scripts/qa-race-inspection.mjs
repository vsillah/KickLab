import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:process.env.KICKLAB_QA_HEADFUL!=='1',executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const out=resolve('qa-artifacts/race-inspection');mkdirSync(out,{recursive:true});
const cases=[['cobalt','drag',1440,900],['kestrel','drift',390,844],['aegis','endurance',768,1024],['cobalt','hill',390,844],['kestrel','circuit',768,1024],['aegis','drag',1440,900]];
const vehicleFactors={cobalt:{response:1,recovery:1,brakeHeat:1},kestrel:{response:1.14,recovery:.82,brakeHeat:1.08},aegis:{response:.96,recovery:1.16,brakeHeat:.90}};
const report=[];
async function state(page){return page.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state());}
try{
  for(const [vehicle,mode,width,height] of cases){
    const context=await browser.newContext({viewport:{width,height},hasTouch:width===390,isMobile:width===390}),page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:4173'||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
    const url=`http://127.0.0.1:4173/kicklab.html?raceExpansion=prototype&raceTelemetry=prototype&racePreflight=prototype&rev=${head}`;
    await page.goto(url,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');
    if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,undefined,{timeout:20000});
    await page.locator(`[data-preflight-mode="${mode}"]`).click();
    await page.click('#racePreflightNext');
    await page.locator(`[data-preflight-vehicle="${vehicle}"]`).click();
    await page.click('#racePreflightNext');
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().inspection.loaded,undefined,{timeout:20000});
    const baseline=await state(page),selected={suspension:'firm',tires:'wide',brakes:'sport'};
    for(const [part,options] of Object.entries({suspension:['soft','balanced','firm'],tires:['narrow','balanced','wide'],brakes:['standard','sport','endurance','sport']})){
      for(const option of options){
        await page.locator(`[data-preflight-part="${part}"][data-preflight-value="${option}"]`).click();
        const now=await state(page);
        if(now.draft.garage[part]!==option||now.inspection.part!==part||now.inspection.vehicle!==vehicle||JSON.stringify(now.saved)!==JSON.stringify(baseline.saved))throw Error(`${vehicle}/${mode} ${part}=${option}: draft, binding, or saved-state mismatch`);
      }
    }
    await page.click('#raceInspectionWhole');
    if((await state(page)).inspection.part!=='whole')throw Error(`${vehicle}/${mode}: whole-car view missing`);
    await page.locator('[data-preflight-part="tires"][data-preflight-value="wide"]').focus();
    if((await state(page)).inspection.part!=='tires')throw Error(`${vehicle}/${mode}: keyboard focus missing`);
    let p95FrameMs=null;
    if(vehicle==='cobalt'&&mode==='drag'){
      const frameTimes=await page.evaluate(()=>new Promise(resolve=>{const rows=[];let last=0;const tick=now=>{if(last)rows.push(now-last);last=now;if(rows.length<70)requestAnimationFrame(tick);else resolve(rows);};requestAnimationFrame(tick);}));
      const p95=[...frameTimes].sort((a,b)=>a-b)[Math.floor(frameTimes.length*.95)];
      p95FrameMs=Number(p95.toFixed(1));
      if(p95>75)throw Error(`Inspection frame pacing exceeded 75 ms p95: ${p95.toFixed(1)} ms`);
      await page.click('#racePreflightBack');
      if((await state(page)).inspection.mounted)throw Error('Inspection kept rendering after backing to vehicle');
      await page.click('#racePreflightNext');
      await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().inspection.loaded,undefined,{timeout:15000});
      if((await state(page)).inspection.vehicle!==vehicle)throw Error('Inspection failed to rebind after phase re-entry');
    }
    const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
    if(overflow)throw Error(`${vehicle}/${mode}: ${overflow}px horizontal overflow`);
    await page.click('#racePreflightNext');
    const grid=await state(page);
    if(grid.inspection.mounted||grid.inspection.memory||!await page.locator(`[data-preflight-media="${mode}-${vehicle}"][data-preflight-kind="arrival"]`).count())throw Error(`${vehicle}/${mode}: inspection not disposed or arrival mismatch`);
    await page.waitForTimeout(180);
    if((await state(page)).inspection.frames!==grid.inspection.frames)throw Error(`${vehicle}/${mode}: hidden inspection kept rendering`);
    await page.click('#racePreflightNext');
    const arriving=await state(page);
    if(!arriving.arriving||arriving.active.vehicle!==vehicle||arriving.active.mode!==mode||Object.entries(selected).some(([part,value])=>arriving.active.garage[part]!==value||arriving.saved.garage[part]!==value))throw Error(`${vehicle}/${mode}: commit mismatch`);
    const params=arriving.active.parameters,factors=vehicleFactors[vehicle],near=(a,b)=>Math.abs(a-b)<.001;
    if(!near(params.transfer,1.18)||!near(params.tireHeat,1.28)||!near(params.brakePower,1.16)||!near(params.brakeFade,1.3)||!near(params.response,1.18*factors.response)||!near(params.recovery,.78*factors.recovery)||!near(params.brakeHeat,1.35*factors.brakeHeat))throw Error(`${vehicle}/${mode}: committed physics does not match selected Garage options`);
    await page.waitForFunction(()=>!globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,undefined,{timeout:12000});
    const orbit=await state(page);
    if(orbit.active.vehicle!==vehicle||Object.entries(selected).some(([part,value])=>orbit.active.garage[part]!==value))throw Error(`${vehicle}/${mode}: orbit setup changed`);
    if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
    await page.waitForFunction(()=>['count','run'].includes(globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().raceState),undefined,{timeout:25000});
    const live=await state(page);
    if(live.active.vehicle!==vehicle||live.active.mode!==mode||live.active.record?.vehicle!==vehicle||!live.active.recordTitle?.includes('Firm / Wide / Sport')||Object.entries(selected).some(([part,value])=>live.active.record?.garage?.[part]!==value))throw Error(`${vehicle}/${mode}: live/replay metadata mismatch`);
    if(!await page.locator('#raceTelemetrySetup').textContent().then(text=>text?.includes(vehicle==='cobalt'?'Cobalt':vehicle==='kestrel'?'Kestrel':'Aegis')))throw Error(`${vehicle}/${mode}: live setup cue missing`);
    if(vehicle==='cobalt'&&mode==='drag'){
      await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().raceState==='run',undefined,{timeout:12000});
      if(!await page.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.finishForQA()))throw Error('Could not exercise result fixture');
      const resultText=await page.locator('#raceCoachResultRecommendation').textContent();
      if(!resultText?.includes('Cobalt · Firm / Wide / Sport')||!await page.locator('#raceCoachResultRetry').isVisible())throw Error(`Result lost committed setup: ${resultText}`);
      await page.locator('#raceCoachResultRetry').click();
      const uiRetry=await state(page);
      if(uiRetry.active.vehicle!==vehicle||Object.entries(selected).some(([part,value])=>uiRetry.active.garage[part]!==value))throw Error('Retry action lost committed setup');
    }
    const retry=await page.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.resetForQA());
    if(retry.vehicle!==vehicle||retry.mode!==mode||Object.entries(selected).some(([part,value])=>retry.garage[part]!==value))throw Error(`${vehicle}/${mode}: retry reset lost setup`);
    await page.reload({waitUntil:'domcontentloaded'});
    const restored=await state(page);
    if(restored.active.vehicle!==vehicle||restored.saved.mode!==mode||Object.entries(selected).some(([part,value])=>restored.active.garage[part]!==value||restored.saved.garage[part]!==value))throw Error(`${vehicle}/${mode}: profile reload lost setup`);
    if(errors.length||external.length)throw Error(`${vehicle}/${mode}: ${JSON.stringify({errors,external})}`);
    report.push({vehicle,mode,width,height,overflow,p95FrameMs,inspectionFrames:grid.inspection.frames,garage:live.active.garage,parameters:{mu:live.active.parameters.mu,transfer:live.active.parameters.transfer,tireHeat:live.active.parameters.tireHeat,brakePower:live.active.parameters.brakePower},record:live.active.record,retry,restored:restored.active.garage,errors,external});
    await context.close();
    console.log(`passed ${vehicle}/${mode} ${width}×${height}`);
  }
  writeFileSync(resolve(out,'report.json'),JSON.stringify({head,cases:report},null,2));
  console.log(JSON.stringify({head,cases:report.length,errors:0,external:0},null,2));
}finally{await browser.close();}
