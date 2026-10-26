import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const origin=process.env.KICKLAB_QA_ORIGIN||'http://127.0.0.1:5177';
const out=resolve('qa-artifacts/race-dial-presentation',head.slice(0,7));mkdirSync(out,{recursive:true});
const report={head,dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),checks:[],errors:[],external:[]};
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(`${name}: ${JSON.stringify(detail)}`);};
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const params=new URLSearchParams({raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',rev:head});
try{
 for(const [width,height] of [[360,780],[390,844],[768,1024],[1113,834],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.errors.push(error.message));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(`${origin}/`)||url.startsWith(`blob:${origin}/`)||url.startsWith('data:'))return route.continue();report.external.push(url);return route.abort();});
  try{
   await page.goto(`${origin}/?${params}`,{waitUntil:'domcontentloaded'});
   if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
   if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
   await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
   if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
   await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.orbit?.done&&document.querySelector('#raceCoachSetupStart')?.getBoundingClientRect().width>0);
   await page.evaluate(()=>{const stage=document.querySelector('.stage');window.scrollTo({top:window.scrollY+stage.getBoundingClientRect().top-8,behavior:'instant'});});
   const snapshot=()=>page.evaluate(()=>{const box=selector=>{const element=document.querySelector(selector),r=element?.getBoundingClientRect();return r&&{x:r.x,y:r.y,width:r.width,height:r.height};};const input=window.__KICKLAB_RACE_SIMULATOR_QA__?.state?.()?.inputs;return{phase:window.__KICKLAB_RACE_3D__?.dynamics?.state,preview:box('#raceSetupInstrument'),stagePreview:box('#raceStageInstrument'),card:box('#raceCoachSetup'),start:box('#raceStageStart'),dial:box('#raceActionDial'),gas:box('#raceDialGas'),previous:box('#raceDialPrevious'),next:box('#raceDialNext'),action:box('#raceDialAction'),brake:box('#padR [data-id="brake"]'),legacyGasDisplay:getComputedStyle(document.querySelector('#padR [data-id="gas"]')).display,disabled:[...document.querySelectorAll('#raceActionDial button')].every(button=>button.disabled),active:[...document.querySelectorAll('#raceActionDial button')].every(button=>!button.disabled),input,previewInteractive:document.querySelectorAll('#raceSetupInstrument button,#raceStageInstrument button').length,viewport:{width:innerWidth,height:innerHeight}};});
   const setup=await snapshot();await page.screenshot({path:join(out,`setup-${width}.png`)});
   const visiblePreview=setup.preview?.width?setup.preview:setup.stagePreview;
   check(`setup radial preview is safe and visible ${width}`,visiblePreview?.width>0&&setup.previewInteractive===0&&visiblePreview.x>=0&&visiblePreview.x+visiblePreview.width<=width&&visiblePreview.y>=0&&visiblePreview.y+visiblePreview.height<=height&&setup.phase==='grid',setup);
   await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='count');
   const count=await snapshot();await page.screenshot({path:join(out,`count-${width}.png`)});
   check(`countdown dial is visible and inert ${width}`,count.dial?.width>0&&count.disabled&&count.legacyGasDisplay==='none'&&count.input?.gas===false&&count.dial.x>=0&&count.dial.x+count.dial.width<=width&&count.dial.y+count.dial.height<=height,count);
   await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run');await page.locator('#raceActionDial').waitFor({state:'visible'});
   const live=await snapshot();await page.screenshot({path:join(out,`go-${width}.png`)});
   const overlaps=(a,b)=>a&&b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
   check(`GO dial has distinct touch targets ${width}`,live.active&&live.dial?.width>0&&!overlaps(live.gas,live.previous)&&!overlaps(live.gas,live.next)&&!overlaps(live.gas,live.action)&&!overlaps(live.dial,live.brake),live);
   const visual=await page.evaluate(()=>{const dial=document.querySelector('#raceActionDial'),outline=dial.querySelector('.race-dial-outline'),needle=dial.querySelector('.race-dial-pointer line'),hub=dial.querySelector('.race-dial-needle-hub');return{outlineLength:outline.getAttribute('d')?.length,outlineCount:dial.querySelectorAll('.race-dial-outline').length,satelliteBorder:getComputedStyle(dial.querySelector('.race-dial-cycle')).borderTopWidth,extraRing:getComputedStyle(dial,'::after').display,needleWidth:getComputedStyle(needle).strokeWidth,needleColor:getComputedStyle(needle).stroke,hubRadius:hub.getAttribute('r'),miniOutlines:[...document.querySelectorAll('.race-mini-dial .race-dial-outline')].map(path=>path.getAttribute('d')?.length)};});
   check(`one faceplate and warm needle ${width}`,visual.outlineLength>1000&&visual.outlineCount===1&&visual.satelliteBorder==='0px'&&visual.extraRing==='none'&&Number.parseFloat(visual.needleWidth)>=6&&Number(visual.hubRadius)>=5&&visual.miniOutlines.every(length=>length>1000),visual);
  }finally{await context.close();}
 }
}catch(error){report.errors.push(error.stack||String(error));}
finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(item=>!item.pass),errors:report.errors,external:report.external,out},null,2));
if(report.errors.length||report.external.length||report.checks.some(item=>!item.pass))process.exitCode=1;
