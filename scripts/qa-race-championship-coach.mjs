import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const output=resolve(process.argv[3]||'qa-artifacts/race-championship/coach');
const url=new URL(process.argv[2]||'http://127.0.0.1:5879/kicklab.html');
for(const key of ['raceExpansion','raceCompetition','raceChampionship','raceSimulator'])url.searchParams.set(key,'prototype');
url.searchParams.set('rev',head);
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const errors=[],external=[],checks=[];
const events=['drag','drift','hill','circuit','endurance'];

for(const [width,height] of [[360,780],[390,844],[768,1024],[1113,900],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<=768});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(`${width}: ${error.message}`));
  page.on('request',request=>{if(!request.url().startsWith(url.origin)&&!request.url().startsWith('data:')&&!request.url().startsWith('blob:'))external.push(request.url());});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
    await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:20000});
    await page.click('#raceChampionshipToggle');
    for(const [index,event] of events.entries()){
      const selected=await page.evaluate(()=>globalThis.__KICKLAB_RACE_CHAMPIONSHIP_QA__.state().event);
      if(selected!==event)throw new Error(`selected ${selected}, expected ${event}`);
      const setup=await page.evaluate(()=>{
        const ids=['raceChampionshipCoach','raceCoachSetup'];
        const cards=ids.map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return{id,visible:!el.hidden,height:r.height,width:r.width,left:r.left,right:r.right,chips:el.querySelectorAll('.champ-coach-chips li').length,text:el.innerText};});
        return{cards,overflow:document.documentElement.scrollWidth-innerWidth,notebook:document.getElementById('raceChampionshipNotebook').hidden};
      });
      if(setup.overflow>2||setup.cards.some(card=>!card.visible||card.right>width+2||card.left<0||card.chips!==3||card.height>360||card.text.length>270))errors.push(`${width} ${event}: setup layout ${JSON.stringify(setup)}`);
      const liveCue=await page.evaluate(()=>globalThis.__KICKLAB_RACE_CHAMPIONSHIP_QA__.liveCue());
      if(!liveCue||liveCue.length>70)errors.push(`${width} ${event}: live cue ${liveCue}`);
      await page.click('#raceCoachSetupSeasonDetails');
      const notebook=await page.evaluate(()=>({open:!document.getElementById('learnDetail').hidden,visible:!document.getElementById('raceChampionshipNotebook').hidden,text:document.getElementById('raceChampionshipNotebook').innerText}));
      if(!notebook.open||!notebook.visible||!notebook.text.includes('Pass rule:')||!notebook.text.includes('Garage'))errors.push(`${width} ${event}: notebook failed`);
      await page.click('[data-close-detail="learn"]');
      if(width===390)await page.screenshot({path:join(output,`${event}-setup-390.png`)});
      await page.evaluate(()=>globalThis.__KICKLAB_RACE_CHAMPIONSHIP_QA__.finish(false));
      const failed=await page.evaluate(()=>({visible:!document.getElementById('raceCoachResult').hidden,retry:!document.getElementById('raceCoachResultRetry').hidden,headline:document.getElementById('raceCoachResultTitle').textContent,overflow:document.documentElement.scrollWidth-innerWidth}));
      if(!failed.visible||!failed.retry||!failed.headline.includes('Retry')||failed.overflow>2)errors.push(`${width} ${event}: failed result ${JSON.stringify(failed)}`);
      if(width===390)await page.screenshot({path:join(output,`${event}-retry-390.png`)});
      await page.click('#raceCoachResultRetry');
      if(width===390&&event==='endurance'){
        await page.click('#raceCoachSetupSimulator');
        if(!(await page.locator('#raceSimulator').isVisible()))errors.push('390 endurance: Simulator setup did not open');
      }
      await page.evaluate(()=>globalThis.__KICKLAB_RACE_CHAMPIONSHIP_QA__.finish(true));
      const passed=await page.evaluate(()=>({visible:!document.getElementById('raceCoachResult').hidden,retry:!document.getElementById('raceCoachResultRetry').hidden,headline:document.getElementById('raceCoachResultTitle').textContent,chips:document.querySelectorAll('#raceCoachResultSeasonChips li').length,next:!document.getElementById('raceChampionshipNext').hidden,overflow:document.documentElement.scrollWidth-innerWidth}));
      if(!passed.visible||passed.retry||passed.chips!==3||passed.overflow>2||(index<4&&!passed.next))errors.push(`${width} ${event}: passed result ${JSON.stringify(passed)}`);
      if(width===390&&event==='endurance'){
        const simulator=await page.evaluate(()=>({visible:!document.getElementById('simResult').hidden,summary:!document.getElementById('simResultSeason').hidden,chips:document.querySelectorAll('#simResultSeasonChips li').length,detailHidden:document.getElementById('simResultRecommendation').hidden}));
        if(!simulator.visible||!simulator.summary||simulator.chips!==3||!simulator.detailHidden)errors.push(`390 endurance: Simulator result ${JSON.stringify(simulator)}`);
      }
      if(width===390)await page.screenshot({path:join(output,`${event}-pass-390.png`)});
      checks.push({width,event,setupHeight:setup.cards.map(card=>Math.round(card.height)),failed,passed});
      if(index<4)await page.click('#raceChampionshipNext');
    }
  }catch(error){errors.push(`${width}: ${error.stack||error}`);}
  await context.close();
}
await browser.close();
const report={head,url:url.toString(),checks,errors,external};
writeFileSync(join(output,`coach-qa-${head.slice(0,12)}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,checked:checks.length,errors,external},null,2));
if(errors.length||external.length)process.exitCode=1;
