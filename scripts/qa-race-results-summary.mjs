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
  for(const state of ['success-new-award','success-no-new-award','failed']){
    const fixture=await page.evaluate(state=>window.__KICKLAB_RACE_RESULTS_QA__.fixture(state),state);
    if(!fixture.awards.core||fixture.profileId===undefined)report.errors.push(`${viewport.width} ${state}: award did not persist to active profile`);
    await page.waitForTimeout(viewport.width===390?2200:950);
    const measured=await page.evaluate(()=>{
      const panel=document.querySelector('#rc'),box=panel.getBoundingClientRect();
      const coachBox=document.querySelector('#raceResultCoachText').getBoundingClientRect(),top=document.elementFromPoint(coachBox.left+coachBox.width/2,coachBox.top+coachBox.height/2);
      return{visible:!document.querySelector('#results').hidden,coach:document.querySelector('#raceResultCoachText').textContent,coachTop:top?.id||top?.className,awardCount:document.querySelector('#raceResultAwards').children.length,duplicateCoach:!document.querySelector('#raceCoachResult').hidden,notices:document.querySelectorAll('#toasts .toast,.stage .race-award-toast').length,overflowX:Math.max(document.documentElement.scrollWidth-innerWidth,box.right-innerWidth,-box.left),overflowY:box.height-innerHeight,garage:!document.querySelector('#rRaceGarage').hidden,retry:document.querySelector('#rNext').textContent};
    });
    report.states.push({viewport,state,...measured});
    if(!measured.visible||!measured.coach||measured.coachTop!=='raceResultCoachText'||measured.duplicateCoach||measured.notices||measured.overflowX>1||measured.overflowY>1||!measured.garage||!measured.retry)report.errors.push(`${viewport.width} ${state}: ${JSON.stringify(measured)}`);
    if(state==='success-new-award'&&measured.awardCount!==2||state!=='success-new-award'&&measured.awardCount!==0)report.errors.push(`${viewport.width} ${state}: awards ${measured.awardCount}`);
    if(viewport.width===390)await page.locator('#results').screenshot({path:join(output,`${state}.png`)});
    if(state==='success-new-award'){
      await page.click('#rRaceBoard');
      if(!await page.locator('#fboard').isVisible())report.errors.push(`${viewport.width}: awards board action did not open`);
      await page.click('#fbClose');
      await page.click('#rRaceGarage');
      if(!await page.locator('#settingsDrawer').isVisible())report.errors.push(`${viewport.width}: Garage action did not open`);
      await page.click('#settingsClose');
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
