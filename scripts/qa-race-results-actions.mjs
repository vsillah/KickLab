import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5887/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-results-actions');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,base,states:[],errors:[],external:[]};
for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'})));
  const page=await context.newPage(),label=`${viewport.width}x${viewport.height}`,url=new URL(base);
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  for(const flag of ['raceExpansion','raceCompetition','raceTelemetry'])url.searchParams.set(flag,'prototype');
  url.searchParams.set('raceResultsQA','1');url.searchParams.set('rev',head);
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin)||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(target);route.abort();}});
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  for(const [availability,review,replay] of [['none',false,false],['frames',false,true],['moves',true,false],['both',true,true]]){
    const record=await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.recorded(value),availability);
    const state=await page.evaluate(()=>({review:!document.querySelector('#raceResultCoach').disabled,replay:!document.querySelector('#raceReplayBlock').hidden,footerActions:!document.querySelector('#racts').hidden,summary:!document.querySelector('#results').hidden,controllerReview:!document.querySelector('#raceCoachResult').hidden,canvasPointerEvents:getComputedStyle(document.querySelector('#cv')).pointerEvents,notices:document.querySelectorAll('#toasts .toast,.stage .race-award-toast').length}));
    report.states.push({label,availability,record,...state});
    if(!record||state.review!==review||state.replay!==replay||state.footerActions||!state.summary||state.controllerReview||state.canvasPointerEvents!=='auto'||state.notices)report.errors.push(`${label} ${availability}: ${JSON.stringify(state)}`);
  }
  await page.locator('#results').screenshot({path:join(output,`${label}-eligible.png`)});
  await page.click('#raceResultCoach');
  if(!await page.locator('#rvBack').isVisible()||await page.locator('#results').isVisible()||!await page.locator('#rvBody').getByText('What worked').isVisible()||await page.locator('#raceCoachResult').isVisible())report.errors.push(`${label}: Coach review did not open cleanly`);
  await page.click('#rvClose');
  if(await page.locator('#rvBack').isVisible()||await page.locator('#results').isVisible())report.errors.push(`${label}: Coach review did not return cleanly`);
  await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.recorded('both'));
  await page.click('#raceReplayFallback');
  if(!await page.locator('#rbar').isVisible()||await page.locator('#results').isVisible()||await page.locator('#raceCoachResult').isVisible())report.errors.push(`${label}: Replay did not open cleanly`);
  await page.locator('#rbScrub').fill('500');
  const scrub=await page.locator('#rbScrub').inputValue();
  if(scrub!=='500')report.errors.push(`${label}: Replay scrub did not respond`);
  const exitHit=await page.locator('#rbExit').evaluate(button=>{const box=button.getBoundingClientRect();return document.elementFromPoint(box.left+box.width/2,box.top+box.height/2)?.id;});
  if(exitHit!=='rbExit')report.errors.push(`${label}: Exit replay pointer target is ${exitHit||'none'}`);
  await page.click('#rbExit');
  const closed=await page.evaluate(()=>({bar:!document.querySelector('#rbar').hidden,summary:!document.querySelector('#results').hidden,controllerReview:!document.querySelector('#raceCoachResult').hidden,notices:document.querySelectorAll('#toasts .toast,.stage .race-award-toast').length}));
  if(closed.bar||closed.summary||closed.controllerReview||closed.notices)report.errors.push(`${label}: Replay did not return cleanly ${JSON.stringify(closed)}`);
  report.states.push({label,action:'review-and-replay',scrub,exitHit,closed});
  await context.close();
}
await browser.close();
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,states:report.states,errors:report.errors,external:report.external,output},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
