import {createRequire} from 'node:module';
import {existsSync,mkdirSync,renameSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5887/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-results-save-exit');
const head=process.env.KICKLAB_QA_HEAD;
if(!head)throw Error('Set KICKLAB_QA_HEAD to the exact commit under review.');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync),args:['--enable-webgl']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'no-preference',recordVideo:{dir:out,size:{width:390,height:844}}});
const page=await context.newPage(),video=page.video(),url=new URL(base),external=[];
for(const flag of ['raceExpansion','raceCompetition','raceTelemetry','raceChampionship'])url.searchParams.set(flag,'prototype');
url.searchParams.set('raceResultsQA','1');url.searchParams.set('rev',head);
await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{external.push(target);route.abort();}});
await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering',null,{timeout:20000});
const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
const states=[];
for(const sample of [{outcome:'fail',achievement:'none',replay:'both',context:'standalone',coach:'error-heavy'},{outcome:'pass',achievement:'collectible',replay:'both',context:'standalone',coach:'clean'}]){
  await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario(value),sample);
  const preview=await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.threePreview());
  const state=await page.evaluate(()=>{const save=document.querySelector('#rRaceGarage'),primary=document.querySelector('#rNext'),saveBox=save.getBoundingClientRect(),primaryBox=primary.getBoundingClientRect();return{title:document.querySelector('#rTitle').textContent,save:save.textContent,primary:primary.hidden?null:primary.textContent,visual:!document.querySelector('#raceReplayPreview').hidden,saveVisible:saveBox.top>=0&&saveBox.bottom<=innerHeight,primaryVisible:!primary.hidden&&primaryBox.top>=0&&primaryBox.bottom<=innerHeight,record:window.__KICKLAB_RACE_RESULTS_QA__.state()};});
  if(!preview.ready||preview.count<1||!state.visual||!state.saveVisible||state.primaryVisible!==(sample.outcome==='fail')||state.primary!==(sample.outcome==='fail'?'Retry':null)||state.save!=='Save & Exit'||external.length)throw Error(`3D result preview or actions missing: ${JSON.stringify({sample,preview,state,external})}`);
  await page.waitForTimeout(1100);
  await page.locator('#results').screenshot({path:join(out,`${sample.outcome}-${head.slice(0,10)}.png`)});
  states.push({sample,preview,state});await page.waitForTimeout(1700);
}
await page.click('#rRaceGarage');
if(!await page.locator('#modeHome').isVisible())throw Error('Save & Exit did not reach the home chooser.');
await page.waitForTimeout(1000);
await context.close();await browser.close();
const webm=join(out,`race-results-${head.slice(0,10)}.webm`);renameSync(await video.path(),webm);
writeFileSync(join(out,'walkthrough-report.json'),JSON.stringify({head,url:url.toString(),states,external,webm},null,2)+'\n');
console.log(JSON.stringify({head,url:url.toString(),states:states.map(({sample,preview})=>({outcome:sample.outcome,preview:preview.count})),external,webm},null,2));
