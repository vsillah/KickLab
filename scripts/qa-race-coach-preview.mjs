import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5879/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-coach-preview');
const head=process.env.KICKLAB_QA_HEAD||'working';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,base,cases:[],errors:[],external:[]};
for(const [width,height] of [[390,844],[360,780]])for(const analog of [false,true]){
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
    if(analog)await page.click('#analogControlsButton');
    await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:20000});await page.click('.race-orbit-panel button');
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done,null,{timeout:20000});await page.locator('#raceCoachSetup').waitFor({state:'visible'});
    const state=await page.evaluate(()=>{const rect=id=>{const box=document.querySelector(id)?.getBoundingClientRect();return box&&{left:box.left,top:box.top,right:box.right,bottom:box.bottom,width:box.width,height:box.height};},setup=document.querySelector('#raceCoachSetup'),stage=document.querySelector('.stage'),canvas=document.querySelector('#race3'),deck=document.querySelector('.control-deck');return{stage:rect('.stage'),canvas:rect('#race3'),setup:rect('#raceCoachSetup'),deck:rect('.control-deck'),title:document.querySelector('#raceCoachSetupTitle').textContent,targets:document.querySelector('#raceCoachSetupTargets').textContent,recommendation:document.querySelector('#raceCoachSetupRecommendation').textContent,garage:!!document.querySelector('#raceCoachSetupGarage').getClientRects().length,start:!!document.querySelector('#raceCoachSetupStart').getClientRects().length,drivingVisible:[...deck.querySelectorAll('#padL,#padR,#touchController')].some(el=>getComputedStyle(el).visibility==='visible'&&el.getClientRects().length),telemetryVisible:!!document.querySelector('#raceTelemetry').getClientRects().length,collapsed:deck.classList.contains('controller-collapsed'),scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,phase:window.__KICKLAB_RACE_3D__?.orbit?.phase,sceneStatus:window.__KICKLAB_RACE_3D__?.status};});
    if(!state.title.includes('Coach Nia')||!state.targets.includes('entry')||!state.recommendation.includes('endurance brakes')||!state.garage||!state.start||state.drivingVisible||state.telemetryVisible||state.collapsed||state.phase!=='done'||state.scrollWidth>state.viewport+1)throw new Error(`setup ${JSON.stringify(state)}`);
    if(state.setup.left<state.stage.left-1||state.setup.right>state.stage.right+1||state.setup.bottom>state.stage.bottom+1||state.setup.width<state.deck.width-2||state.deck.height>state.setup.height+3||state.setup.top-state.stage.top<300)throw new Error(`geometry ${JSON.stringify(state)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-${head.slice(0,12)}.png`)});
    await page.click('#raceCoachSetupStart');await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='run',null,{timeout:10000});
    const driving=await page.evaluate(()=>({setupVisible:!!document.querySelector('#raceCoachSetup').getClientRects().length,telemetryVisible:!!document.querySelector('#raceTelemetry').getClientRects().length,controlsVisible:[...document.querySelectorAll('#padL,#padR,#touchController')].some(el=>getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility==='visible'&&el.getClientRects().length),gaugeCount:document.querySelector('#raceTelemetryIndex').textContent,phase:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState}));
    if(driving.setupVisible||!driving.telemetryVisible||!driving.controlsVisible||driving.gaugeCount!=='1 / 7'||driving.phase!=='run')throw new Error(`driving ${JSON.stringify(driving)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-live-${head.slice(0,12)}.png`)});
    report.cases.push({name,state,driving});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
}
await browser.close();writeFileSync(join(out,`report-${head.slice(0,12)}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,external:report.external,report:join(out,`report-${head.slice(0,12)}.json`)}));
if(report.errors.length||report.external.length||report.cases.length!==4)process.exitCode=1;
