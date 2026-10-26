import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5887/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-results-summary');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,base,states:[],errors:[],external:[]};
for(const viewport of [{width:360,height:780},{width:390,height:844},{width:768,height:1024},{width:1113,height:834},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:viewport.width===390?{dir:output,size:viewport}:undefined});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'})));
  const page=await context.newPage(),video=page.video();
  page.on('pageerror',error=>report.errors.push(`${viewport.width}: ${error.message}`));
  const url=new URL(base);for(const flag of ['raceExpansion','raceCompetition','raceTelemetry'])url.searchParams.set(flag,'prototype');url.searchParams.set('raceResultsQA','1');url.searchParams.set('rev',head);
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin)||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(target);route.abort();}});
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  for(const state of ['success-new-award','success-distinct-award','success-no-new-award','failed']){
    const fixture=await page.evaluate(state=>window.__KICKLAB_RACE_RESULTS_QA__.fixture(state),state);
    if(!fixture.awards.core||!fixture.badges.r_finish||fixture.profileId===undefined||state==='success-distinct-award'&&(!fixture.awards.drag||!fixture.badges.r_clean))report.errors.push(`${viewport.width} ${state}: rewards did not persist to active profile`);
    await page.waitForTimeout(viewport.width===390?2200:950);
    const measured=await page.evaluate(()=>{
      const panel=document.querySelector('#rc'),box=panel.getBoundingClientRect();
      const coachCard=document.querySelector('#raceResultCoach'),coachBox=coachCard.getBoundingClientRect(),top=document.elementFromPoint(coachBox.left+coachBox.width/2,coachBox.top+coachBox.height/2);
      const rewards=document.querySelector('#raceResultAwards');
      return{visible:!document.querySelector('#results').hidden,coach:coachCard.querySelectorAll('.race-result-coach-theme').length===2?coachCard.textContent:'',coachTop:top?.closest('#raceResultCoach')?.id,awardCount:rewards.children.length,rewardNames:[...rewards.querySelectorAll('b')].map(node=>node.textContent),rewardMetadata:[...rewards.querySelectorAll('small')].map(node=>node.textContent),rewardImagesReady:[...rewards.querySelectorAll('img')].every(img=>img.complete&&img.naturalWidth>0),duplicateCoach:!document.querySelector('#raceCoachResult').hidden,notices:document.querySelectorAll('#toasts .toast,.stage .race-award-toast').length,overflowX:Math.max(document.documentElement.scrollWidth-innerWidth,box.right-innerWidth,-box.left),overflowY:box.height-innerHeight,saveExit:!document.querySelector('#rRaceGarage').hidden&&document.querySelector('#rRaceGarage').textContent.trim()==='Save & Exit',sub:document.querySelector('#rSub').textContent,hint:document.querySelector('#rHint').textContent,nextVisible:!document.querySelector('#rNext').hidden,next:document.querySelector('#rNext').hidden?null:document.querySelector('#rNext').textContent};
    });
    report.states.push({viewport,state,...measured});
    if(!measured.visible||!measured.coach||measured.coachTop!=='raceResultCoach'||measured.duplicateCoach||measured.notices||measured.overflowX>1||measured.overflowY>1||!measured.saveExit||measured.sub||measured.hint||measured.nextVisible!==(state==='failed')||measured.next!==(state==='failed'?'Retry':null))report.errors.push(`${viewport.width} ${state}: ${JSON.stringify(measured)}`);
    if(!measured.rewardImagesReady)report.errors.push(`${viewport.width} ${state}: award art did not load`);
    if(state==='success-new-award'&&(measured.awardCount!==1||measured.rewardNames[0]!=='Checkered Flag'||!measured.rewardMetadata[0]?.includes('Badge unlocked · +200 XP')))report.errors.push(`${viewport.width}: same-name rewards were not coalesced ${JSON.stringify(measured)}`);
    if(state==='success-distinct-award'&&(measured.awardCount!==2||JSON.stringify(measured.rewardNames)!==JSON.stringify(['Launch Ace','Clean Line'])))report.errors.push(`${viewport.width}: distinct rewards were not preserved ${JSON.stringify(measured)}`);
    if(['success-no-new-award','failed'].includes(state)&&measured.awardCount!==0)report.errors.push(`${viewport.width} ${state}: unexpected rewards ${measured.awardCount}`);
    if(viewport.width===390)await page.locator('#results').screenshot({path:join(output,`${state}.png`)});
    if(state==='success-new-award'){
      await page.locator('#raceResultAwards [data-award-kind]').first().click();
      if(!await page.locator('#fboard').isVisible())report.errors.push(`${viewport.width}: awards board action did not open`);
      await page.click('#fbClose');
    }
    if(state==='failed'){
      const progressBefore=await page.evaluate(id=>JSON.stringify(JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.find(profile=>profile.id===id).progress),fixture.profileId);
      await page.click('#rRaceGarage');
      const exit=await page.evaluate(()=>({home:!document.querySelector('#modeHome').hidden,results:!document.querySelector('#results').hidden,drawer:!document.querySelector('#settingsDrawer').hidden,profiles:JSON.parse(localStorage.getItem('kicklab.profiles.v1'))}));
      if(!exit.home||exit.results||exit.drawer||JSON.stringify(exit.profiles?.profiles?.find(profile=>profile.id===fixture.profileId)?.progress)!==progressBefore||!exit.profiles?.profiles?.find(profile=>profile.id===fixture.profileId)?.progress?.raceCompetition?.awards?.core)report.errors.push(`${viewport.width}: Save & Exit did not persist and return home`);
      await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
      await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.fixture('failed'));
    }
  }
  await page.click('#rNext');
  if(await page.locator('#results').isVisible())report.errors.push(`${viewport.width}: retry did not dismiss result`);
  await context.close();
  if(video&&viewport.width===390)renameSync(await video.path(),join(output,'race-results-walkthrough.webm'));
}
await browser.close();
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,states:report.states,errors:report.errors,external:report.external,output},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
