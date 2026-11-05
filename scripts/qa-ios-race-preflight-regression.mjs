import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:4173/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/ios-race-preflight-regression');
const sha=v=>createHash('sha256').update(v).digest('hex');
if(sha(Buffer.from(await(await fetch(base)).arrayBuffer()))!==sha(readFileSync('dist/kicklab.html')))throw Error('Served HTML differs from this build');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report={cases:[],errors:[],external:[]};
try{
  for(const [width,height] of [[812,375],[844,390],[932,430],[390,844],[768,1024],[1440,900]]){
    if(process.env.KICKLAB_QA_WIDTH&&Number(process.env.KICKLAB_QA_WIDTH)!==width)continue;
    const label=`${width}x${height}`;console.log(`Preflight ${label}`);
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d'}));localStorage.setItem('impactlab.nick','QA Player');});
    const page=await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
    await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${label}: ${url}`);route.abort();});
    try{
      const url=new URL(base);for(const key of ['raceTelemetry','raceCornerTrace','raceProgression','raceExpansion','raceCompetition','raceChampionship','raceMultiplayer','raceSimulator','racePreflight','raceInstruments'])url.searchParams.set(key,'prototype');url.searchParams.set('raceSystems','proxy');url.searchParams.set('rev','ios-race-landscape');
      await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
      if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
      if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
      await page.locator('#lab-tab-race').click();
      await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
      const state=[];
      for(const [name,action] of [['route',async()=>{await page.locator('[data-preflight-venue="highland"]').click();await page.locator('[data-preflight-mode="drag"]').click();}],['vehicle',async()=>{await page.locator('#racePreflightNext').click();await page.locator('[data-preflight-vehicle="kestrel"]').click();}],['tuning',async()=>{await page.locator('#racePreflightNext').click();await page.locator('[data-preflight-part="brakes"][data-preflight-value="sport"]').click();}],['grid',async()=>{await page.locator('#racePreflightNext').click();}]]){
        await action();
        const view=await page.evaluate(()=>{const e=document.querySelector('#racePreflight'),f=document.querySelector('.race-preflight-footer'),r=e.getBoundingClientRect(),b=f.getBoundingClientRect();return{dialog:{top:r.top,bottom:r.bottom},footer:{top:b.top,bottom:b.bottom},draft:window.__KICKLAB_RACE_PREFLIGHT_QA__?.state().draft,overflow:document.documentElement.scrollWidth-innerWidth};});
        if(view.dialog.top<0||view.dialog.bottom>height+1||view.footer.top<0||view.footer.bottom>height+1||view.overflow>1)throw Error(`${name} clipped: ${JSON.stringify(view)}`);
        await page.screenshot({path:join(out,`${label}-${name}.png`)});state.push({name,...view});
      }
      if(state.at(-1).draft.vehicle!=='kestrel'||state.at(-1).draft.garage.brakes!=='sport')throw Error(`Selection did not reach grid: ${JSON.stringify(state.at(-1))}`);
      if(width===812){
        await page.locator('#racePreflightNext').click();
        await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
        const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
        await page.waitForFunction(()=>document.documentElement.dataset.racePhase==='run',null,{timeout:25000});
        for(const [mode,button,selectors,gasCandidates] of [['analog','#analogControlsButton',['.analog-zone','#raceAnalogActions [data-race-assist="brake"]'],['#raceDialGas','#gestureAction']],['simulator','#simulatorControlsButton',['#simBrake'],['#raceDialGas','#simGas']]]){
          await page.locator(button).click();
          await page.waitForTimeout(150);
          const controls=await page.evaluate(selectors=>selectors.map(selector=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();return{selector,visible:!!e?.getClientRects().length,x:r?.x,y:r?.y,right:r?.right,bottom:r?.bottom};}),[...selectors,...gasCandidates]);
          const fits=c=>c.visible&&c.x>=0&&c.y>=0&&c.right<=width&&c.bottom<=height;
          if(mode==='simulator')console.log('Simulator geometry',JSON.stringify(await page.evaluate(()=>Object.fromEntries(['.game-frame .stage','.control-deck','#raceSimulator','.sim-live-top','.sim-controls','.sim-live-foot','#simBrake','#simShiftDown','#simShiftUp','#simLiveEnable'].map(s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return[s,r&&{top:r.top,bottom:r.bottom,height:r.height}]})))));
          if(controls.slice(0,selectors.length).some(c=>!fits(c))||!controls.slice(selectors.length).some(fits))throw Error(`${mode} control clipped: ${JSON.stringify(controls)}`);
          await page.screenshot({path:join(out,`${label}-${mode}-live.png`)});state.push({name:mode,controls});
        }
      }
      report.cases.push({label,state});
    }catch(error){report.errors.push(`${label}: ${error.message}`);}finally{await context.close();}
  }
}finally{await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:report.cases.map(c=>c.label),errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
