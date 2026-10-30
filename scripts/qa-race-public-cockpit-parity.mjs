import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {enterHighlandRace} from './qa-race-public-journey.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=new URL(process.argv[2]||'https://vsillah.github.io/KickLab/');
const out=resolve(process.argv[3]||'qa-artifacts/cockpit-parity');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the exact product commit');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=sha(readFileSync('dist/pages/index.html'));
const response=await fetch(new URL(`?rev=${head}`,base));
if(!response.ok||sha(Buffer.from(await response.arrayBuffer()))!==expected)throw Error('Served Pages HTML does not match the exact build');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
const report={head,artifactSha256:expected,cases:[],errors:[],external:[],httpErrors:[]};
const sizes=[[360,780],[390,844],[768,1024],[1113,834],[1440,900],[1980,1310]];
for(const [width,height] of sizes){
  const label=`${width}x${height}`,context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('response',res=>{if(res.status()>=400)report.httpErrors.push(`${label}: ${res.status()} ${res.url()}`)});
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base.origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.external.push(`${label}: ${url}`);route.abort()}});
  try{
    const url=new URL(base);url.searchParams.set('rev',head);for(const flag of ['raceExpansion','raceCompetition','raceChampionship','raceMultiplayer','raceSimulator','raceCornerTrace','raceTelemetry','racePreflight'])url.searchParams.set(flag,'prototype');
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    await enterHighlandRace(page);
    await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().phase==='run',null,{timeout:10000});
    const live=await page.evaluate(()=>{const box=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();return{map:box('#racePhoneProgress'),wrench:box('#racePhoneToolsToggle'),head:box('.stage>.floating-control-head'),dash:box('#raceNavigation'),rail:box('#gameGuidanceHud'),overflow:document.documentElement.scrollWidth-innerWidth,preflight:!document.querySelector('#racePreflight').hidden,stageStart:!document.querySelector('#raceStageStart').hidden,controllerIds:[...document.querySelectorAll('.stage>.floating-control-head button')].filter(el=>el.getClientRects().length).map(el=>el.id)}});
    if(!live.map?.width||!live.wrench?.width||!live.dash?.width||live.rail?.width||live.preflight||live.stageStart||live.overflow>1||live.controllerIds.some(id=>!['classicControlsButton','analogControlsButton','simulatorControlsButton','raceSetupSteeringShortcut','controllerCollapseButton'].includes(id)))throw Error(`Live cockpit hierarchy: ${JSON.stringify(live)}`);
    const p95=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let previous=performance.now();function sample(now){frames.push(now-previous);previous=now;if(frames.length<105)requestAnimationFrame(sample);else{const values=frames.slice(5).sort((a,b)=>a-b);resolve(values[Math.floor(values.length*.95)])}}requestAnimationFrame(sample)}));
    if(p95>(width<=480?42:35))throw Error(`Live cockpit frame p95 ${p95.toFixed(1)} ms`);
    await page.locator('.stage').screenshot({path:join(out,`${label}-live.png`)});
    await page.click('#racePhoneProgress');
    if(!await page.locator('#orientationDetail').isVisible()||!await page.locator('#raceChampionshipToggle').isVisible())throw Error('Event map did not open progress controls');
    await page.click('#raceChampionshipToggle');
    if((await page.locator('#racePhoneProgressNodes .race-phone-progress-node').count())!==5)throw Error('Season map has wrong event count');
    await page.click('[data-close-detail="orientation"]');
    await page.click('#racePhoneToolsToggle');
    if(!await page.locator('#gameGuidanceHud').isVisible())throw Error('Wrench did not open tools');
    const tools=await page.evaluate(()=>{const rail=document.querySelector('#gameGuidanceHud').getBoundingClientRect();return{tiles:[...document.querySelectorAll('#gameGuidanceHud>.contextual-summary')].map(el=>({name:el.getAttribute('aria-label'),box:el.getBoundingClientRect().toJSON()})),rail:rail.toJSON(),overflow:document.documentElement.scrollWidth-innerWidth}});
    if(tools.tiles.length!==6||tools.tiles.some(tile=>!tile.name||tile.box.width<44||tile.box.left<tools.rail.left-1||tile.box.right>tools.rail.right+1)||tools.overflow>1)throw Error(`Tools layout: ${JSON.stringify(tools)}`);
    await page.locator('.stage').screenshot({path:join(out,`${label}-tools.png`)});
    await page.click('#raceToolsGarage');
    if(!await page.locator('#settingsDrawer').isVisible()||!await page.locator('#raceGarage').isVisible())throw Error('Garage path did not open');
    await page.click('#settingsClose');
    if(await page.evaluate(()=>document.activeElement?.id)!=='raceToolsGarage')throw Error('Focus did not return to Garage tool');
    for(const id of ['analogControlsButton','simulatorControlsButton','classicControlsButton']){
      await page.click(`#${id}`);
      if(await page.locator(`#${id}`).getAttribute('aria-pressed')!=='true')throw Error(`${id} did not select`);
    }
    await page.click('#racePhoneToolsToggle');
    if(width>480){await page.click('#controllerCollapseButton');if(!await page.locator('.control-deck').evaluate(el=>el.classList.contains('controller-collapsed')))throw Error('Controller did not collapse');await page.click('#controllerCollapseButton');}
    report.cases.push({label,live,tools,p95Ms:+p95.toFixed(1)});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.map(({label})=>label),errors:report.errors,external:report.external,httpErrors:report.httpErrors},null,2));
if(report.errors.length||report.external.length||report.httpErrors.length||report.cases.length!==sizes.length)process.exitCode=1;
