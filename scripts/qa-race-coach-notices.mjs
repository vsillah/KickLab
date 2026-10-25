import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
const root=process.env.KICKLAB_QA_OUTPUT||'qa-artifacts/race-coach-notices';mkdirSync(root,{recursive:true});
const report={states:[],errors:[],external:[]};
for(const viewport of [{width:320,height:720},{width:390,height:844},{width:768,height:900},{width:1024,height:768},{width:1440,height:900}])for(const motion of ['no-preference','reduce']){
  const label=`${viewport.width}-${motion}`,context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:motion});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'})));
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${label}: ${e.message}`));
  const url=process.env.KICKLAB_QA_URL||'http://127.0.0.1:5887/kicklab.html?raceExpansion=prototype&raceCompetition=prototype&raceTelemetry=prototype&raceResultsQA=1&raceCoachQA=1&rev=working';
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(new URL(url).origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(target);route.abort();}});
  try{
    await page.goto(url,{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    await page.evaluate(()=>{window.__KICKLAB_RACE_COACH_QA__.start();window.__KICKLAB_RACE_COACH_QA__.emit('Brake before the switchback.','warn');});
    await page.waitForTimeout(350);
    const state=await page.evaluate(()=>{const rect=id=>{const b=document.querySelector(id).getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};const card=document.querySelector('#raceCoachNotice');return{progress:rect('#racePhoneProgress'),wrench:rect('#racePhoneToolsToggle'),notice:rect('#raceCoachNotice'),canvas:rect('#cv'),visible:!card.hidden,animation:getComputedStyle(card).animationName,entries:window.__KICKLAB_RACE_COACH_QA__.state().entries,toastCount:document.querySelectorAll('#toasts .toast').length};});
    report.states.push({label,initial:state});
    if(!state.visible||state.entries.filter(item=>item.text==='Brake before the switchback.').length!==1||state.toastCount||state.notice.x<state.progress.right-1||state.notice.right>state.wrench.x+1||Math.abs(state.notice.y-state.progress.y)>1)report.errors.push(`${label}: overlap/initial ${JSON.stringify(state)}`);
    if(viewport.width===390||viewport.width===320||viewport.width===1440)await page.screenshot({path:`${root}/${label}-collapsed.png`});
    await page.click('#raceCoachNoticeDismiss');await page.waitForTimeout(350);
    if(await page.locator('#raceCoachNotice').isVisible())report.errors.push(`${label}: dismiss failed`);
    await page.evaluate(()=>window.__KICKLAB_RACE_COACH_QA__.emit('Lift now; power is reduced.','warn'));await page.waitForTimeout(350);
    await page.click('#racePhoneToolsToggle');await page.locator('#raceCoachHistory summary').click();
    const history=await page.evaluate(()=>({entries:window.__KICKLAB_RACE_COACH_QA__.state().entries,list:[...document.querySelectorAll('#raceCoachHistoryList li')].map(e=>e.innerText),empty:document.querySelector('#raceCoachHistoryEmpty').hidden,notice:document.querySelector('#raceCoachNotice').hidden,expanded:document.querySelector('#racePhoneToolsToggle').getAttribute('aria-expanded')}));
    report.states.at(-1).history=history;
    if(history.entries.filter(item=>item.text==='Lift now; power is reduced.').length!==1||history.list.length!==history.entries.length||!history.list[0].includes('Lift now')||!history.notice||history.expanded!=='true')report.errors.push(`${label}: history ${JSON.stringify(history)}`);
    if(viewport.width===390||viewport.width===1440)await page.screenshot({path:`${root}/${label}-expanded.png`});
    await page.evaluate(()=>window.__KICKLAB_RACE_COACH_QA__.finish());
    if(!(await page.evaluate(()=>window.__KICKLAB_RACE_COACH_QA__.state().entries.some(item=>item.text==='Brake before the switchback.'))))report.errors.push(`${label}: post-race history lost`);
    await page.evaluate(()=>window.__KICKLAB_RACE_COACH_QA__.start());
    const fresh=await page.evaluate(()=>window.__KICKLAB_RACE_COACH_QA__.state());
    if(fresh.entries.some(item=>item.text==='Brake before the switchback.'||item.text==='Lift now; power is reduced.')||fresh.sequence>1)report.errors.push(`${label}: old-run history survived reset ${JSON.stringify(fresh)}`);
  }catch(e){report.errors.push(`${label}: ${e.stack||e}`);}
  await context.close();
}
await browser.close();writeFileSync(`${root}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({states:report.states.length,errors:report.errors,external:report.external},null,2));if(report.errors.length||report.external.length)process.exitCode=1;
