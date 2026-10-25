import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const out=resolve(process.argv[2]||'qa-artifacts/race-results-contextual');mkdirSync(out,{recursive:true});
const head=process.env.KICKLAB_QA_HEAD||'working';
const base='http://127.0.0.1:5887/kicklab.html?raceExpansion=prototype&raceCompetition=prototype&raceTelemetry=prototype&raceChampionship=prototype&raceResultsQA=1&rev='+head;
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
const report={head,base,states:[],errors:[],external:[]};
const cases=[
  {outcome:'pass',achievement:'collectible',replay:'both',context:'standalone',progress:'Finish run'},
  {outcome:'pass',achievement:'none',replay:'both',context:'standalone',progress:'Finish run'},
  {outcome:'pass',achievement:'none',replay:'none',context:'standalone',progress:'Finish run'},
  {outcome:'fail',achievement:'none',replay:'both',context:'standalone',progress:'Retry'},
  {outcome:'pass',achievement:'season',replay:'both',context:'mid',progress:'Continue to next'},
  {outcome:'pass',achievement:'season',replay:'both',context:'final',progress:'View season results'},
  {outcome:'fail',achievement:'none',replay:'none',context:'mid',progress:'Retry'},
  {outcome:'pass',achievement:'none',replay:'both',context:'standalone',coach:'error-heavy',progress:'Finish run'},
  {outcome:'fail',achievement:'none',replay:'both',context:'standalone',coach:'error-heavy',progress:'Retry'}
];
for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:900}].filter(v=>!process.env.KICKLAB_QA_WIDTH||v.width===Number(process.env.KICKLAB_QA_WIDTH))){
  const label=`${viewport.width}x${viewport.height}`,context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:process.env.KICKLAB_QA_MOTION||'reduce'});await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'})));
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.external.push(url);route.abort();}});
  try{
    await page.goto(base,{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    for(const sample of cases){
      const fixture=await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario(value),sample);
      await page.waitForTimeout(500);
      const state=await page.evaluate(()=>{const visible=id=>!document.querySelector(id).hidden;const rc=document.querySelector('#rc'),award=document.querySelector('#raceResultAwards'),coach=document.querySelector('#raceResultCoach');return{summary:visible('#results'),coachEnabled:!coach.disabled,coachRows:coach.querySelectorAll('p').length,positive:document.querySelector('#raceResultCoachPositive').textContent.trim(),focus:document.querySelector('#raceResultCoachFocus').textContent.trim(),coachText:coach.textContent.trim(),awards:award.querySelectorAll('[data-award-kind]').length,replay:visible('#raceReplayBlock'),progress:document.querySelector('#rNext').textContent.trim(),garage:visible('#rRaceGarage'),footerActions:visible('#racts')||visible('#rRaceNext'),notices:document.querySelectorAll('#toasts .toast,.stage .race-award-toast').length,overflow:rc.scrollWidth>rc.clientWidth+2,scrollWidth:rc.scrollWidth,clientWidth:rc.clientWidth};});
      report.states.push({label,sample,fixture,state});
      const expectedAward=sample.achievement==='none'?0:1,expectedReplay=sample.replay==='frames'||sample.replay==='both',expectedCoach=sample.replay==='moves'||sample.replay==='both';
      if(!fixture||!state.summary||state.coachEnabled!==expectedCoach||state.awards!==expectedAward||state.replay!==expectedReplay||state.progress!==sample.progress||state.garage!==(sample.outcome==='fail')||state.footerActions||state.notices||state.overflow)report.errors.push(`${label} ${JSON.stringify(sample)}: ${JSON.stringify(state)}`);
      if(state.coachRows!==2||!/^What worked\s/i.test(state.coachText.replace('COACH NIA · RUN ASSESSMENT','').trim())||!state.positive||!state.focus||[state.positive,state.focus].some(line=>!/^[^.!?]+[.!?]$/.test(line))||/run messages|Lift now: power is reduced|Brake before the switchback/.test(state.coachText))report.errors.push(`${label}: Coach summary hierarchy ${JSON.stringify({sample,state})}`);
      if(sample.coach==='error-heavy'&&(!state.focus.includes('Brake earlier')||state.positive.includes('braking was on target')))report.errors.push(`${label}: error-heavy run did not prioritize actual entry error ${JSON.stringify({sample,state})}`);
      if(sample.outcome==='fail'&&state.positive.includes('finish'))report.errors.push(`${label}: failed run claimed a finish ${JSON.stringify({sample,state})}`);
      if(sample.outcome==='pass'&&sample.achievement==='collectible'&&sample.replay==='both'){
        const before=await page.locator('#raceReplayCanvas').evaluate(canvas=>canvas.toDataURL());await page.waitForTimeout(1600);
        const after=await page.locator('#raceReplayCanvas').evaluate(canvas=>canvas.toDataURL());
        if((before!==after)!==((process.env.KICKLAB_QA_MOTION||'reduce')==='no-preference'))report.errors.push(`${label}: recorded preview motion does not match preference`);
      }
      if(viewport.width===390)await page.locator('#results').screenshot({path:join(out,`${sample.outcome}-${sample.achievement}-${sample.replay}-${sample.context}-${sample.coach||'clean'}.png`)});
      if(sample.achievement!=='none'){
        await page.locator('#raceResultAwards [data-award-kind]').first().click();
        if(sample.achievement==='season'){
          if(!await page.locator('#orientationDetail').isVisible()||await page.locator('#results').isVisible())report.errors.push(`${label}: season award did not open season details`);
          await page.locator('#orientationDetail [data-close-detail]').first().click();
        }else{
          if(!await page.locator('#fboard').isVisible())report.errors.push(`${label}: collectible did not open award journey`);
          await page.click('#fbClose');
        }
      }
      if(sample.outcome==='pass'&&sample.context==='standalone'&&sample.replay==='both'&&sample.achievement==='none'){
        await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario(value),sample);
        await page.click('#raceResultCoach');if(!await page.locator('#rvBack').isVisible())report.errors.push(`${label}: Coach card did not open review`);await page.click('#rvClose');
        await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario(value),sample);
        await page.click('#raceReplayPreview');if(!await page.locator('#rbar').isVisible())report.errors.push(`${label}: replay preview did not open replay`);
        await page.locator('#rbScrub').fill('500');if(await page.locator('#rbScrub').inputValue()!=='500')report.errors.push(`${label}: replay scrub failed`);
        await page.click('#rbExit');if(await page.locator('#rbar').isVisible())report.errors.push(`${label}: replay exit failed`);
      }
      if(sample.context==='mid'&&sample.outcome==='pass'){
        await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario(value),sample);
        await page.click('#rNext');const next=await page.evaluate(()=>window.__KICKLAB_RACE_CHAMPIONSHIP_QA__.state().event);
        if(next!=='drift')report.errors.push(`${label}: Continue did not select next event, got ${next}`);
      }
      if(sample.context==='final'&&sample.outcome==='pass'){
        await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario(value),sample);await page.click('#rNext');
        const closed=await page.evaluate(()=>({result:!document.querySelector('#results').hidden,season:document.querySelector('#raceChampionshipTitle').textContent,selected:window.__KICKLAB_RACE_RESULTS_QA__.state().selected}));
        if(closed.result||!closed.season.includes('Season complete')||closed.selected!=='endurance')report.errors.push(`${label}: final completion did not return to season ${JSON.stringify(closed)}`);
      }
      if(sample.context==='standalone'&&sample.outcome==='pass'&&sample.achievement==='none'&&sample.replay==='none'||sample.outcome==='fail'&&sample.replay==='none'){
        await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario(value),sample);await page.click('#rNext');
        const after=await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.state());
        if(after.resultsOpen||after.raceState!=='grid')report.errors.push(`${label}: completion/retry did not prepare next run ${JSON.stringify(after)}`);
      }
      if(sample.outcome==='fail'&&sample.replay==='both'){
        await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario(value),sample);await page.click('#rRaceGarage');
        if(!await page.locator('#settingsDrawer').isVisible())report.errors.push(`${label}: failed-run Garage did not open`);
        await page.click('#settingsClose');const recovered=await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.state());
        if(recovered.resultsOpen||recovered.raceState!=='grid')report.errors.push(`${label}: Garage close did not prepare Retry ${JSON.stringify(recovered)}`);
      }
    }
  }catch(error){report.errors.push(`${label}: ${error.stack||String(error)}`);}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({head,states:report.states.length,errors:report.errors,external:report.external,out},null,2));if(report.errors.length||report.external.length)process.exitCode=1;
