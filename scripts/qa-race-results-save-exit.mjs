import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5887/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-results-save-exit');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
const report={head,base,checks:[],errors:[],external:[]};
for(const [viewport,activation] of [[{width:390,height:844},'touch'],[{width:768,height:1024},'keyboard'],[{width:1113,height:834},'pointer'],[{width:1440,height:900},'pointer']]){
  const context=await browser.newContext({viewport,hasTouch:activation==='touch',reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'})));
  const page=await context.newPage(),label=`${viewport.width}x${viewport.height}/${activation}`,url=new URL(base);
  for(const flag of ['raceExpansion','raceCompetition','raceTelemetry','raceChampionship'])url.searchParams.set(flag,'prototype');
  url.searchParams.set('raceResultsQA','1');url.searchParams.set('rev',head);
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(target);route.abort();}});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');await page.locator('#game-cockpit').waitFor({state:'visible',timeout:20000});await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});if(await page.locator('#racePreflightClose').isVisible())await page.click('#racePreflightClose');
    for(const sample of [{outcome:'fail',achievement:'none',replay:'both',context:'standalone'},{outcome:'pass',achievement:'collectible',replay:'both',context:'standalone'}]){
      const fixture=await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario(value),sample);
      const before=await page.evaluate(id=>({progress:JSON.stringify(JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.find(profile=>profile.id===id).progress),record:window.__KICKLAB_RACE_RESULTS_QA__.state()}),fixture.profileId);
      const summary=await page.evaluate(()=>({sub:document.querySelector('#rSub').textContent,hint:document.querySelector('#rHint').textContent,save:document.querySelector('#rRaceGarage').textContent.trim(),primary:document.querySelector('#rNext').hidden?null:document.querySelector('#rNext').textContent.trim(),sole:document.querySelector('#results .rgo').classList.contains('sole-action'),overflow:document.documentElement.scrollWidth>innerWidth+1}));
      if(summary.sub||summary.hint||summary.save!=='Save & Exit'||summary.primary!==(sample.outcome==='fail'?'Retry':null)||summary.sole!==(sample.outcome==='pass')||summary.overflow)report.errors.push(`${label}: summary ${JSON.stringify({sample,summary})}`);
      if(activation==='touch')await page.locator('#rRaceGarage').tap();
      else if(activation==='keyboard'){await page.locator('#rRaceGarage').focus();await page.keyboard.press(sample.outcome==='pass'?'Space':'Enter');}
      else await page.click('#rRaceGarage');
      const after=await page.evaluate(id=>({home:!document.querySelector('#modeHome').hidden,results:!document.querySelector('#results').hidden,drawer:!document.querySelector('#settingsDrawer').hidden,progress:JSON.stringify(JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.find(profile=>profile.id===id).progress),record:window.__KICKLAB_RACE_RESULTS_QA__.state()}),fixture.profileId);
      const oldProgress=JSON.parse(before.progress),newProgress=JSON.parse(after.progress);
      const sameAwards=JSON.stringify(newProgress.raceCompetition?.awards||{})===JSON.stringify(oldProgress.raceCompetition?.awards||{});
      const sameBadges=JSON.stringify(newProgress.badges||{})===JSON.stringify(oldProgress.badges||{});
      const sameScore=(newProgress.xp||0)===(oldProgress.xp||0)&&(newProgress.stats?.plays?.race||0)===(oldProgress.stats?.plays?.race||0)&&(newProgress.stats?.wins?.race||0)===(oldProgress.stats?.wins?.race||0);
      if(!after.home||after.results||after.drawer||!sameAwards||!sameBadges||!sameScore||after.record.recordId!==before.record.recordId||after.record.recordMoves!==before.record.recordMoves||after.record.recordFrames!==before.record.recordFrames)report.errors.push(`${label}: exit changed saved state or discarded recording ${JSON.stringify({sample,before,after})}`);
      report.checks.push({label,sample,summary,home:after.home,recordMoves:after.record.recordMoves,recordFrames:after.record.recordFrames,persisted:sameAwards&&sameBadges&&sameScore});
      await page.click('#lab-tab-race');await page.locator('#game-cockpit').waitFor({state:'visible',timeout:20000});await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});if(await page.locator('#racePreflightClose').isVisible())await page.click('#racePreflightClose');
      const reopened=await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.state());
      if(reopened.recordId!==before.record.recordId||reopened.recordMoves!==before.record.recordMoves||reopened.recordFrames!==before.record.recordFrames)report.errors.push(`${label}: reopening Race lost the recorded run ${JSON.stringify(reopened)}`);
    }
    if(viewport.width===390){
      await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.scenario({outcome:'fail',replay:'both'}));
      await page.evaluate(()=>{const original=Storage.prototype.getItem;window.__qaGetItem=original;Storage.prototype.getItem=function(key){if(key==='kicklab.profiles.v1')throw Error('simulated unavailable storage');return original.call(this,key);};});
      await page.locator('#rRaceGarage').tap();
      const blocked=await page.evaluate(()=>({result:!document.querySelector('#results').hidden,home:!document.querySelector('#modeHome').hidden,hint:document.querySelector('#rHint').textContent}));
      if(!blocked.result||blocked.home||!blocked.hint.includes('Could not save'))report.errors.push(`${label}: unavailable storage failed closed ${JSON.stringify(blocked)}`);
      await page.evaluate(()=>{Storage.prototype.getItem=window.__qaGetItem;delete window.__qaGetItem;});
      await page.locator('#rRaceGarage').tap();
      if(!await page.locator('#modeHome').isVisible())report.errors.push(`${label}: storage recovery did not exit`);
      report.checks.push({label,storageFailure:blocked,recovered:await page.locator('#modeHome').isVisible()});
    }
  }catch(error){report.errors.push(`${label}: ${error.stack||String(error)}`);}
  await context.close();
}
await browser.close();
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,checks:report.checks.length,errors:report.errors,external:report.external,out},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
