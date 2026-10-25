import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5887/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-controller-fit');
mkdirSync(out,{recursive:true});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,cases:[],errors:[],externalRequests:[]};
for(const [width,height] of [[360,780],[390,844],[768,1024],[1440,900]]){
 const label=`${width}x${height}`;
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',hasTouch:width<=768,...(width===390?{recordVideo:{dir:out,size:{width,height}}}:{})});
 await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
 const page=await context.newPage();
 page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
 await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.externalRequests.push(`${label}: ${url}`);route.abort();}});
 try{
  const url=new URL(base);
  for(const key of ['raceExpansion','raceCompetition','raceChampionship','raceMultiplayer','raceSimulator','raceCornerTrace','raceTelemetry','raceFinishes'])url.searchParams.set(key,'prototype');
  url.searchParams.set('raceSystems','proxy');url.searchParams.set('race3d','checkpoint');url.searchParams.set('rev',head);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
  await page.locator('#raceStageStart').waitFor({state:'visible',timeout:20000});
  for(let attempt=0;attempt<3&&!(await page.locator('#raceTelemetry').isVisible());attempt++){
   if(await page.locator('#raceCoachSetupStart').isVisible())await page.click('#raceCoachSetupStart');
   await page.waitForTimeout(800);
  }
  await page.locator('#raceTelemetry').waitFor({state:'visible',timeout:25000});
  if(width>480)await page.locator('#classicControlsButton').click();
  const measure=()=>page.evaluate(()=>{
   const rect=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
   const ids=['#raceTelemetry','#raceTelemetryTitle','#raceTelemetryValue','#raceTraceControls','#raceTraceVariable','#raceTraceValue','#raceTraceBand','#raceTraceEquation','#raceTraceState','.control-left-slot','#padL','.dpad','.dpad .down','.control-deck .pad'];
   return {...Object.fromEntries(ids.map(id=>[id,rect(id)])),readoutVisible:!!document.querySelector('.race-trace-readout')?.getClientRects().length,cueVisible:!!document.querySelector('#raceTelemetryCue')?.getClientRects().length,previousName:document.querySelector('#raceTracePrev')?.getAttribute('aria-label'),nextName:document.querySelector('#raceTraceNext')?.getAttribute('aria-label'),cockpitValue:document.querySelector('#raceNavigationStatus')?.textContent,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  const expanded=await measure();
  if(expanded.readoutVisible||expanded.cueVisible||!expanded.previousName?.includes('Selected:')||!expanded.nextName?.includes('Selected:')||expanded.overflow>1)throw Error(`controller readout or semantics ${JSON.stringify(expanded)}`);
  if(width<=480&&expanded['.dpad .down'].bottom>expanded['.control-left-slot'].bottom-6)throw Error(`D-pad lacks bottom clearance ${JSON.stringify(expanded)}`);
  await page.locator('.stage').screenshot({path:join(out,`${label}-classic-expanded.png`)});
  if(width===390)await page.waitForTimeout(900);
  if(await page.locator('#raceTraceNext').isVisible()){
   await page.locator('#raceTraceNext').click();
   const selectedAfter=await page.locator('#raceTraceNext').getAttribute('aria-label');
   if(selectedAfter===expanded.nextName||!selectedAfter?.includes('Selected:'))throw Error('physics variable selection lost its accessible current value');
   if(await page.locator('#raceNavigation').isVisible()&&!selectedAfter.includes((await page.locator('#raceNavigationStatus').innerText()).trim()))throw Error('cockpit physics value is stale after selection');
  }
  await page.locator('#controllerCollapseButton').evaluate(button=>button.click());
  const collapsed=await measure();
  if(await page.locator('.control-deck .pad').isVisible())throw Error('collapsed controller retains visible controls');
  await page.locator('.stage').screenshot({path:join(out,`${label}-classic-collapsed.png`)});
  if(width===390)await page.waitForTimeout(900);
  report.cases.push({label,expanded,collapsed});
 }catch(error){report.errors.push(`${label}: ${error.message}`);}finally{await context.close();if(width===390&&page.video())await page.video().saveAs(join(out,'race-controller-390x844.webm'));}
}
await browser.close();
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({cases:report.cases.map(item=>item.label),errors:report.errors,externalRequests:report.externalRequests}));
if(report.errors.length||report.externalRequests.length)process.exitCode=1;
