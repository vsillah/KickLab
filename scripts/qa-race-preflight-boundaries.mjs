import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[a-f0-9]{40}$/.test(head||'')||execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim()!==head)throw Error('Bind to exact product main');
const root=new URL(process.argv[2]||'http://127.0.0.1:4173/kicklab.html');
if(!['127.0.0.1','localhost'].includes(root.hostname)||root.pathname!=='/kicklab.html')throw Error('Use trusted loopback Pages artifact');
const hash=value=>createHash('sha256').update(value).digest('hex'),artifactSha256=hash(readFileSync('dist/kicklab.html'));
if(hash(Buffer.from(await(await fetch(root)).arrayBuffer()))!==artifactSha256)throw Error('Served artifact differs from exact build');
const base=`${root.href}?raceExpansion=prototype&raceTelemetry=prototype&racePreflight=prototype&raceProgression=prototype&rev=${head}`;
const out=resolve(process.argv[3]||'qa-artifacts/race-preflight-boundaries');mkdirSync(out,{recursive:true});
const results=[],errors=[],external=[];
async function enter(context,url){const page=await context.newPage(),pageErrors=[];page.on('pageerror',error=>{pageErrors.push(error.message);errors.push(error.message)});await page.route('**/*',route=>{const target=new URL(route.request().url());if(target.origin===root.origin||['data:','blob:'].includes(target.protocol))return route.continue();external.push(target.origin);return route.abort()});await page.goto(url,{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});return{page,errors:pageErrors};}
try{
  {
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
    await page.goto(`${root.href}?rev=${head}`,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    if(await page.locator('#racePreflight').isVisible()||await page.evaluate(()=>document.documentElement.dataset.racePreflight==='prototype'))throw Error('Default direct route exposed preflight before Home entry');
    await page.click('#lab-tab-race');
    if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
    await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
    if(!await page.locator('[data-preflight-venue="highland"]').isVisible())throw Error('Trusted Home entry did not open venue-first preflight');
    results.push({case:'default-off-before-Home; trusted-Home venue entry',pass:true});await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),{page,errors}=await enter(context,base+'&racePreflight=prototype&raceChampionship=prototype');
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:10000});
    if(await page.locator('#racePreflight video').count())throw Error('Reduced-motion route started video');
    const before=await page.evaluate(()=>({saved:globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().saved,storage:localStorage.getItem('kicklab.profiles.v1')}));
    await page.locator('[data-preflight-venue="highland"]').click();
    if(!(await page.locator('#racePreflightTitle').innerText()).includes('Choose your route'))throw Error('Highland did not show its supported routes');
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
    await page.locator('#racePhoneProgress').click();
    await page.click('#raceChampionshipToggle');
    const detailClose=page.locator('[data-close-detail="orientation"]');if(await detailClose.isVisible())await detailClose.click();
    await page.locator('#racePreflight').waitFor({state:'visible',timeout:5000}).catch(async()=>{await page.locator('#raceCoachSetupStart').click()});
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:5000});
    await page.locator('[data-preflight-venue="highland"]').click();
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
    await page.locator('[data-preflight-venue="highland"]').click();
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
    await page.locator('[data-preflight-venue="highland"]').click();
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
  for(const [width,height] of [[360,800],[390,844],[768,1024],[1113,834],[1440,900]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:width===390?'reduce':'no-preference'}),{page,errors:pageErrors}=await enter(context,base);
    const locked=await page.locator('[data-preflight-venue]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.preflightVenue,disabled:node.disabled,requirement:node.querySelector('.kl-unlock-requirement')?.textContent?.trim(),name:node.getAttribute('aria-label')||node.textContent.trim()})));
    if(locked.length!==3||locked[0].id!=='highland'||locked[0].disabled||locked[1].id!=='marine'||locked[2].id!=='forest'||locked.slice(1).some(item=>!item.disabled||!/unlock/i.test(item.requirement||'')||!/unlock/i.test(item.name)))throw Error(`Venue lock contract ${width}: ${JSON.stringify(locked)}`);
    await page.locator('[data-preflight-venue="highland"]').click();
    const routes=await page.locator('[data-preflight-mode]').evaluateAll(nodes=>nodes.map(node=>node.dataset.preflightMode));
    if(JSON.stringify(routes)!==JSON.stringify(['drag','drift','circuit','hill','endurance']))throw Error(`Highland route contract ${width}: ${routes}`);
    await page.locator('#racePreflightBack').click();
    await page.locator('#racePreflightClose').click();
    if(await page.evaluate(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.unlockForQA(1))!==1)throw Error(`Marine unlock fixture ${width}`);
    await page.locator('#raceCoachSetupStart').click();
    if(!await page.locator('[data-preflight-venue="marine"]').isEnabled()||await page.locator('[data-preflight-venue="forest"]').isEnabled())throw Error(`Marine/Forest unlock order ${width}`);
    await page.locator('[data-preflight-venue="marine"]').click();
    const marine=await page.evaluate(()=>({venue:globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().draft.venue,journey:document.querySelector('.race-preflight-event-list')?.children.length,overflow:document.documentElement.scrollWidth-innerWidth}));
    if(marine.venue!=='marine'||marine.journey!==2||marine.overflow>1)throw Error(`Marine journey ${width}: ${JSON.stringify(marine)}`);
    await page.locator('#racePreflightClose').click();
    if(await page.evaluate(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.unlockForQA(2))!==2)throw Error(`Forest unlock fixture ${width}`);
    await page.locator('#raceCoachSetupStart').click();
    if(!await page.locator('[data-preflight-venue="forest"]').isEnabled())throw Error(`Forest still locked ${width}`);
    await page.locator('[data-preflight-venue="forest"]').click();
    const forest=await page.evaluate(()=>({venue:globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().draft.venue,journey:document.querySelector('.race-preflight-event-list')?.children.length,overflow:document.documentElement.scrollWidth-innerWidth}));
    if(forest.venue!=='forest'||forest.journey!==3||forest.overflow>1||pageErrors.length)throw Error(`Forest journey ${width}: ${JSON.stringify({forest,pageErrors})}`);
    if(width===390)await page.screenshot({path:join(out,'390-forest-journey.png')});
    results.push({case:`venue-unlock-${width}`,pass:true,locked,highlandRoutes:routes,marine,forest});await context.close();
  }
  console.log(JSON.stringify(results,null,2));
}finally{await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify({head,artifactSha256,cases:results,errors,external},null,2)+'\n');}
if(errors.length||external.length)process.exitCode=1;
