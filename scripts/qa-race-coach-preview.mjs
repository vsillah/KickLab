import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5879/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-coach-preview');
const head=process.env.KICKLAB_QA_HEAD||'working';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,base,cases:[],errors:[],external:[]};
for(const [width,height] of (process.env.QA_ONE?[[1280,800]]:[[360,780],[390,844],[768,1024],[1280,800]]))for(const analog of [false,true]){
  const name=`${width}x${height}-${analog?'analog':'classic'}`;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  try{
    const url=new URL(base);for(const [key,value] of [['raceProgression','prototype'],['raceTelemetry','prototype'],['raceCornerTrace','prototype'],['rev',head]])url.searchParams.set(key,value);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});
    await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:20000});await page.click('.race-orbit-panel button');
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done,null,{timeout:20000});await page.locator('#raceCoachSetup').waitFor({state:'visible'});
    if(analog)await page.click('#raceCoachSetupControls');
    const state=await page.evaluate(()=>{const rect=id=>{const box=document.querySelector(id)?.getBoundingClientRect();return box&&{left:box.left,top:box.top,right:box.right,width:box.width,height:box.height};},stage=rect('.stage'),canvas=rect('#race3'),deck=document.querySelector('.control-deck'),composition=window.__KICKLAB_RACE_3D__?.composition;return{stage,canvas,deckClass:deck.className,setup:rect('#raceCoachSetup'),prompt:rect('#raceStageStart'),startBox:rect('#raceCoachSetupStart'),deck:rect('.control-deck'),carTop:composition&&canvas?canvas.top+(composition.carCenter[1]-composition.carHeight/2)*canvas.height:null,title:document.querySelector('#raceCoachSetupTitle').textContent,targets:document.querySelector('#raceCoachSetupTargets').textContent,recommendation:document.querySelector('#raceCoachSetupRecommendation').textContent,garage:!!document.querySelector('#raceCoachSetupGarage').getClientRects().length,start:!!document.querySelector('#raceCoachSetupStart').getClientRects().length,drivingVisible:[...deck.querySelectorAll('#padL,#padR,#touchController')].some(el=>getComputedStyle(el).visibility==='visible'&&el.getClientRects().length),telemetryVisible:!!document.querySelector('#raceTelemetry').getClientRects().length,collapsed:deck.classList.contains('controller-collapsed'),scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,phase:window.__KICKLAB_RACE_3D__?.orbit?.phase,sceneStatus:window.__KICKLAB_RACE_3D__?.status};});
    if(!state.title||!state.targets||!state.recommendation.startsWith('Suggested:')||!state.garage||!state.start||state.drivingVisible||state.telemetryVisible||state.collapsed||state.phase!=='done'||state.scrollWidth>state.viewport+1)throw new Error(`setup ${JSON.stringify(state)}`);
    if(!state.prompt||state.prompt.left<state.stage.left-1||state.prompt.right>state.stage.right+1||state.startBox.top<state.prompt.top||state.startBox.bottom>state.prompt.bottom||state.startBox.height<44||state.carTop===null||state.prompt.bottom>state.carTop-8||state.setup.left<state.stage.left-1||state.setup.right>state.stage.right+1||state.setup.bottom>state.stage.bottom+1||state.setup.width<state.deck.width-2||state.deck.height>state.setup.height+3)throw new Error(`geometry ${JSON.stringify(state)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-${head.slice(0,12)}.png`)});
    if(analog)await page.locator('#raceCoachSetupStart').press('Enter');else await page.click('#raceCoachSetupStart');await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='run',null,{timeout:10000});if(analog)await page.waitForFunction(()=>document.activeElement?.id==='analogStick',null,{timeout:1500});
    const driving=await page.evaluate(()=>({promptVisible:!!document.querySelector('#raceStageStart').getClientRects().length,setupVisible:!!document.querySelector('#raceCoachSetup').getClientRects().length,telemetryVisible:!!document.querySelector('#raceTelemetry').getClientRects().length,controlsVisible:[...document.querySelectorAll('#padL,#padR,#touchController')].some(el=>getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility==='visible'&&el.getClientRects().length),gaugeCount:document.querySelector('#raceTelemetryIndex').textContent,phase:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState,focus:document.activeElement?.id||document.activeElement?.className,analogVisible:!!document.querySelector('#analogStick').getClientRects().length&&getComputedStyle(document.querySelector('#analogStick')).visibility!=='hidden'}));
    if(driving.promptVisible||driving.setupVisible||!driving.telemetryVisible||!driving.controlsVisible||!/^[1-7] \/ 7$/.test(driving.gaugeCount)||driving.phase!=='run'||analog&&driving.focus!==(driving.analogVisible?'analogStick':'stage'))throw new Error(`driving ${JSON.stringify(driving)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-live-${head.slice(0,12)}.png`)});
    report.cases.push({name,state,driving});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
}
await browser.close();writeFileSync(join(out,`report-${head.slice(0,12)}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,external:report.external,report:join(out,`report-${head.slice(0,12)}.json`)}));
if(report.errors.length||report.external.length!==0||report.cases.length!==(process.env.QA_ONE?2:8))process.exitCode=1;
