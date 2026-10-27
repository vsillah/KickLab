import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const base=process.argv[2]||'http://127.0.0.1:5271/kicklab.html';
const out=resolve(process.argv[3]||`qa-artifacts/race-coach-personas/${head.slice(0,12)}`);mkdirSync(out,{recursive:true});
const report={head,base,cases:[],errors:[],external:[]};
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const flags={raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',raceCoaching:'prototype',raceCoachPersonas:'prototype',raceCoachQA:'1',raceResultsQA:'1',rev:head.slice(0,12)};
async function caseRun(width,height,reduced=false,canvas=false){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',hasTouch:width===390});
  await context.addInitScript(forceCanvas=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:forceCanvas?'2d':'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');},canvas);
  const page=await context.newPage(),url=new URL(base);for(const [key,value] of Object.entries(flags))url.searchParams.set(key,value);
  page.on('pageerror',error=>report.errors.push(`${width}: ${error.message}`));
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))return route.continue();report.external.push(`${width}: ${target}`);return route.abort();});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
    await page.locator('#racePreflightCoach').waitFor({state:'visible',timeout:20000}).catch(()=>{});
    const button=await page.locator('#racePreflightCoach').isVisible()?'#racePreflightCoach':'#raceCoachChoose';
    if(button==='#raceCoachChoose'&&await page.locator('#racePhoneToolsToggle').isVisible())await page.click('#racePhoneToolsToggle');
    await page.click(button);await page.locator('#raceCoachRoster').waitFor({state:'visible'});
    if(await page.locator('.race-coach-roster-card').count()!==4)throw Error('roster count');
    if(width===390)await page.locator('[data-coach-id="imani"]').tap();else await page.locator('[data-coach-id="imani"]').click();
    const current=await page.locator('[data-coach-id="imani"]').getAttribute('aria-pressed');if(current!=='true')throw Error('selection did not update');
    if(width===360){await page.locator('[data-coach-id="mateo"]').focus();await page.keyboard.press('Enter');if(await page.locator('[data-coach-id="mateo"]').getAttribute('aria-pressed')!=='true')throw Error('keyboard selection failed');await page.locator('[data-coach-id="imani"]').click();}
    await page.screenshot({path:join(out,`roster-${width}${reduced?'-reduced':''}${canvas?'-canvas':''}.png`)});
    await page.click('#raceCoachRosterClose');
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.find(p=>p.id===JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId).progress.raceCoachId);
    if(stored!=='imani')throw Error(`selection not persisted: ${stored}`);
    if(width===390){
      const expressions=await page.evaluate(()=>{const qa=window.__KICKLAB_RACE_CONTEXTUAL_QA__;qa.result('shift','success','Optimal timing.');const positive=document.querySelector('#coachAv').getAttribute('aria-label');qa.result('shift','miss','Timing missed.');const negative=document.querySelector('#coachAv').getAttribute('aria-label');return{positive,negative,history:document.querySelector('#raceCoachHistoryList').textContent};});
      if(!expressions.positive?.includes('celebrating')||!expressions.negative?.includes('supportive concern')||!expressions.history.includes('Shift confirmed')||!expressions.history.includes('Shift missed'))throw Error(`event expression parity ${JSON.stringify(expressions)}`);
    }
    if(width===390&&!reduced&&!canvas){
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#raceCoachChoose')?.textContent.includes('Imani'));
      const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId);
      await page.click('#homeProfileButton');await page.click('#profileCreate');await page.fill('#profileNickname','Second Driver');await page.click('#profileFormSave');
      const fresh=await page.locator('#raceCoachChoose').textContent();
      await page.locator(`#profileList [data-profile-id="${first}"]`).click();
      const restored=await page.locator('#raceCoachChoose').textContent();
      if(!fresh.includes('Nia')||!restored.includes('Imani'))throw Error(`profile isolation ${JSON.stringify({fresh,restored})}`);
      await page.click('#profileClose');await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});if(await page.locator('#racePreflight').isVisible())await page.click('#racePreflightClose');
      await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.scenario({outcome:'pass',achievement:'none',replay:'both',context:'standalone',coach:'clean'}));
      await page.locator('#rRaceGarage').click();await page.locator('#modeHome').waitFor({state:'visible'});
      await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#raceCoachChoose')?.textContent.includes('Imani'));
    }
    const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));if(overflow)throw Error(`horizontal overflow ${overflow}`);
    report.cases.push({width,height,reduced,canvas,stored,overflow});
  }catch(error){report.errors.push(`${width}${reduced?'/reduced':''}${canvas?'/canvas':''}: ${error.stack||error}`);}finally{await context.close();}
}
for(const [width,height] of [[360,780],[390,844],[768,1024],[1113,834],[1440,900]])await caseRun(width,height);
await caseRun(390,844,true);await caseRun(390,844,false,true);
{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),url=new URL(base),assets=[];
  page.on('request',request=>{if(request.url().includes('/assets/coaches/'))assets.push(request.url());});
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');
  const hidden=await page.locator('#raceCoachChoose').isHidden();if(!hidden||assets.length)report.errors.push(`default-off leaked roster or assets: ${JSON.stringify({hidden,assets})}`);
  report.cases.push({defaultOff:true,hidden,coachAssetRequests:assets.length});await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.errors.length||report.external.length)process.exitCode=1;
