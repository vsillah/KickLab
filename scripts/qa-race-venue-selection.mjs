// Exact-artifact, local-only venue journey smoke. No network request leaves localhost.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('KICKLAB_QA_HEAD must be the full exact commit');
if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==head||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Exact-head QA requires a clean checkout at KICKLAB_QA_HEAD');
const base='http://127.0.0.1:4173/pages/index.html',out=resolve('qa-artifacts/venue-selection');
mkdirSync(out,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const local=readFileSync('dist/pages/index.html'),remote=Buffer.from(await(await fetch(`${base}?rev=${head}`)).arrayBuffer());
if(sha(local)!==sha(remote))throw Error('Localhost does not serve the exact built Pages artifact');
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(Boolean),args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const report={head,artifactSha256:sha(local),cases:[],errors:[],external:[],httpErrors:[]};
const cases=[{width:390,height:844,input:'touch',venue:'marine',gfx:'2d',motion:'reduce',car:'kestrel'},{width:768,height:1024,input:'keyboard',venue:'forest',gfx:'3d',motion:'reduce',car:'cobalt'},{width:1113,height:834,input:'pointer',venue:'marine',gfx:'3d',motion:'no-preference',car:'aegis'},{width:1440,height:900,input:'pointer',venue:'forest',gfx:'3d',motion:'no-preference',car:'cobalt'}];
const fail=(what,state)=>{throw Error(`${what}: ${JSON.stringify(state)}`);};
for(const item of cases){
  const context=await browser.newContext({viewport:{width:item.width,height:item.height},hasTouch:item.input==='touch',reducedMotion:item.motion});
  const page=await context.newPage();
  try{
    await page.addInitScript(gfx=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx})),item.gfx);
    page.on('pageerror',error=>report.errors.push(`${item.width}: ${error.message}`));
    page.on('response',response=>{if(response.status()>=400)report.httpErrors.push(`${item.width}: ${response.status()} ${response.url()}`);});
    await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith('http://127.0.0.1:4173/')||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.external.push(url);route.abort();}});
    await page.goto(`${base}?raceExpansion=prototype&raceTelemetry=prototype&raceProgression=prototype&racePreflight=prototype&rev=${head}`,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.evaluate(()=>window.__KICKLAB_RACE_PROGRESSION_QA__.unlockForQA(2));
    const race=page.locator('#lab-tab-race');if(item.input==='touch')await race.tap();else if(item.input==='keyboard'){await race.focus();await page.keyboard.press('Enter');}else await race.click();
    await page.locator('#racePreflight').waitFor({state:'visible',timeout:30000});
    const names=await page.locator('[data-preflight-venue]').evaluateAll(nodes=>nodes.map(node=>node.dataset.preflightVenue));
    if(names.join(',')!=='highland,marine,forest')fail('Venue stage missing canonical locations',names);
    if(item.width===390||item.width===1440)await page.locator('#racePreflight').screenshot({path:join(out,`${item.width}-venue-exact.png`)});
    await page.click(`[data-preflight-venue="${item.venue}"]`);
    const routes=await page.locator('[data-preflight-mode]').evaluateAll(nodes=>nodes.map(node=>node.dataset.preflightMode));
    if(routes.length!==1||routes[0]!==item.venue)fail('Unsupported route offered',routes);
    if(!await page.locator(`[data-preflight-mode="${item.venue}"] img`).getAttribute('src').then(src=>src.includes(`venue-${item.venue}-`)))fail('Venue preview source is misleading',routes);
    await page.click('#racePreflightNext');await page.click(`[data-preflight-vehicle="${item.car}"]`);
    if(/switchback|climb/i.test(await page.locator('.race-preflight-showroom').innerText()))fail('Venue vehicle copy fell back to Highland');
    await page.click('#racePreflightNext');await page.click('[data-preflight-part="brakes"][data-preflight-value="endurance"]');
    await page.click('#racePreflightNext');
    const grid=await page.locator('.race-preflight-grid-brief').innerText();
    if(!grid.includes(item.car==='kestrel'?'Kestrel':item.car==='aegis'?'Aegis':'Cobalt')||!grid.includes('Endurance'))fail('Grid lost vehicle or tune',grid);
    const route=item.venue==='marine'?'Marine Terrace · Damp corner':'Forest Lantern Descent · Descending left turn';
    if(!grid.includes(route)||!grid.includes(item.venue==='marine'?'≤19s':'≤22s')||grid.includes('Switchback corner'))fail('Grid route or target does not match canonical venue',grid);
    await page.click('#racePreflightNext');await page.locator('#racePreflight').waitFor({state:'hidden',timeout:15000});
    const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='run',null,{timeout:25000});
    const state=await page.evaluate(()=>({progression:window.__KICKLAB_RACE_PROGRESSION_QA__.state(),preflight:window.__KICKLAB_RACE_PREFLIGHT_QA__.state(),renderer:window.__KICKLAB_RACE_3D__}));
    if(state.progression.venue!==item.venue||state.progression.level!==item.venue||state.preflight.active.vehicle!==item.car||state.preflight.saved.garage.brakes!=='endurance')fail('Committed state lost venue or build',state);
    if(item.gfx==='3d'&&!(state.renderer?.status==='rendering'&&state.renderer.vehicle&&!state.renderer.canvasFallback)||item.gfx==='2d'&&state.renderer?.canvas)fail('Renderer or fallback state wrong',state.renderer);
    const performanceSample=await page.evaluate(()=>new Promise(resolve=>{
      const frames=[];let last=0;
      const tick=now=>{if(last)frames.push(now-last);last=now;if(frames.length<80)requestAnimationFrame(tick);else{frames.sort((a,b)=>a-b);const media=performance.getEntriesByType('resource').filter(item=>item.name.includes('/media/race-preflight/'));resolve({p95Ms:+frames[Math.floor(frames.length*.95)].toFixed(2),mediaTransferBytes:media.reduce((sum,item)=>sum+(item.transferSize||0),0),mediaCount:media.length});}};
      requestAnimationFrame(tick);
    }));
    if(!await page.evaluate(()=>window.__KICKLAB_RACE_PREFLIGHT_QA__.finishForQA()))fail('Result fixture could not finish');
    await page.locator('#results').waitFor({state:'visible',timeout:15000});
    await page.click('#rRaceGarage');if(!await page.locator('#modeHome').isVisible())fail('Save & Exit missed home');
    if(item.input==='touch')await race.tap();else if(item.input==='keyboard'){await race.focus();await page.keyboard.press('Enter');}else await race.click();
    await page.locator('#racePreflight').waitFor({state:'visible',timeout:30000});
    if(await page.locator(`[data-preflight-venue="${item.venue}"]`).getAttribute('aria-pressed')!=='true')fail('Re-entry lost saved venue');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    if(overflow>1)fail('Viewport overflow',overflow);
    let profileIsolation=false,reload=false;
    if(item.width===390){
      const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId);
      await page.click('#racePreflightClose');
      // Closing setup returns to the grid overlay, which hides phone tools. Use the
      // existing Home action to set up a second profile for isolation checks.
      await page.evaluate(()=>document.querySelector('#modeHomeButton').click());
      await page.click('#homeProfileButton');await page.click('#profileCreate');await page.fill('#profileNickname','QA Second');await page.click('#profileFormSave');await page.click('#profileClose');
      await race.tap();await page.locator('#racePreflight').waitFor({state:'visible'});
      if(await page.locator('[data-preflight-venue="highland"]').getAttribute('aria-pressed')!=='true')fail('Venue leaked into new profile');
      await page.click('#racePreflightClose');
      await page.evaluate(()=>document.querySelector('#modeHomeButton').click());
      await page.click('#homeProfileButton');await page.locator(`#profileList [data-profile-id="${original}"]`).click();await page.click('#profileClose');
      await race.tap();await page.locator('#racePreflight').waitFor({state:'visible'});
      if(await page.locator(`[data-preflight-venue="${item.venue}"]`).getAttribute('aria-pressed')!=='true')fail('Original profile lost venue');
      profileIsolation=true;
      await page.reload({waitUntil:'domcontentloaded'});
      if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
      await race.tap();await page.locator('#racePreflight').waitFor({state:'visible'});
      if(await page.locator(`[data-preflight-venue="${item.venue}"]`).getAttribute('aria-pressed')!=='true')fail('Reload lost venue');
      reload=true;
    }
    report.cases.push({width:item.width,input:item.input,venue:item.venue,gfx:item.gfx,motion:item.motion,car:item.car,routeCount:1,saveExitReentry:true,profileIsolation,reload,overflow,performanceSample});
  }catch(error){report.errors.push(`${item.width}: ${error.stack||String(error)}`);}
  await context.close();
}
await browser.close();
writeFileSync(join(out,'exact-head-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases,errors:report.errors,external:report.external,httpErrors:report.httpErrors},null,2));
if(report.errors.length||report.external.length||report.httpErrors.length)process.exitCode=1;
