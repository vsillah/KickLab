import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5879/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-coach-phone');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,base,cases:[],errors:[],external:[]};
for(const [width,height] of [[360,780],[390,844]])for(const analog of [false,true]){
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
    const preview=await page.evaluate(()=>{const rendered=el=>{if(!el||!el.getClientRects().length||el.closest('[hidden], [inert]'))return false;for(let node=el;node;node=node.parentElement){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;}const box=el.getBoundingClientRect();return box.width>0&&box.height>0&&box.right>0&&box.bottom>0&&box.left<innerWidth&&box.top<innerHeight;};return{text:document.querySelector('#raceCoachSetup').textContent.trim(),controlsHidden:[...document.querySelectorAll('#padL,#padR,#touchController')].every(el=>!rendered(el)),deckHeight:document.querySelector('.control-deck').getBoundingClientRect().height};});
    if(!preview.text.includes('Coach Nia')||!preview.controlsHidden)throw new Error(`setup preview ${JSON.stringify(preview)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-preview-${head.slice(0,12)}.png`)});
    await page.evaluate(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.setAutopilot());
    await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='run',null,{timeout:10000});
    await page.evaluate(()=>{window.__coachDrive=setInterval(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.demoPedals(),16);});
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().x>35,null,{timeout:25000});
    const live=await page.evaluate(()=>{const box=selector=>{const el=document.querySelector(selector),r=el?.getBoundingClientRect();return r&&{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};const rendered=el=>{if(!el||!el.getClientRects().length||el.closest('[hidden], [inert]'))return false;for(let node=el;node;node=node.parentElement){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;}const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight;};const cue=document.querySelector('#raceTelemetryCue'),controls=['#padL','#padR','#touchController'].filter(selector=>rendered(document.querySelector(selector)));return{cue:box('#raceTelemetryCue'),cueText:cue.textContent,cueScrollHeight:cue.scrollHeight,cueClientHeight:cue.clientHeight,cueScrollWidth:cue.scrollWidth,cueClientWidth:cue.clientWidth,actions:box('.race-telemetry-actions'),trace:box('#raceTraceControls'),telemetry:box('#raceTelemetry'),controls:controls.map(selector=>({selector,box:box(selector)})),deck:box('.control-deck'),stage:box('.stage'),state:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state(),scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,liveClass:document.querySelector('.control-deck').classList.contains('race-coach-live')};});
    const baselineDeckLimit=analog?361.5:335;
    if(!live.liveClass||!live.controls.length||!live.cueText.startsWith('Nia:')||live.cueScrollHeight>live.cueClientHeight+1||live.cueScrollWidth>live.cueClientWidth+1||live.cue.bottom>live.actions.top+1||live.actions.bottom>live.trace.top+1||live.trace.bottom>Math.min(...live.controls.map(item=>item.box.top))+2||live.deck.height>baselineDeckLimit||live.deck.top<live.stage.top-1||live.deck.bottom>live.stage.bottom+1||live.scrollWidth>live.viewport+1)throw new Error(`live geometry ${JSON.stringify(live)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-live-${head.slice(0,12)}.png`)});
    await page.waitForFunction(()=>['done','crashed'].includes(globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState),null,{timeout:45000});await page.evaluate(()=>clearInterval(window.__coachDrive));
    const result=await page.evaluate(()=>{const rendered=el=>{if(!el||!el.getClientRects().length||el.closest('[hidden], [inert]'))return false;for(let node=el;node;node=node.parentElement){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;}const box=el.getBoundingClientRect();return box.width>0&&box.height>0&&box.right>0&&box.bottom>0&&box.left<innerWidth&&box.top<innerHeight;};return{resultVisible:rendered(document.querySelector('#raceCoachResult')),resultText:document.querySelector('#raceCoachResult').textContent.trim(),controlsHidden:[...document.querySelectorAll('#padL,#padR,#touchController')].every(el=>!rendered(el)),liveClass:document.querySelector('.control-deck').classList.contains('race-coach-live'),state:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state()};});
    if(!result.resultVisible||!result.controlsHidden||result.liveClass||!result.resultText.includes('brakes'))throw new Error(`result review ${JSON.stringify(result)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-result-${head.slice(0,12)}.png`)});
    report.cases.push({name,preview,live,result});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
}
await browser.close();writeFileSync(join(out,`report-${head.slice(0,12)}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:report.cases.map(item=>item.name),errors:report.errors,external:report.external,report:join(out,`report-${head.slice(0,12)}.json`)}));
if(report.errors.length||report.external.length||report.cases.length!==4)process.exitCode=1;
