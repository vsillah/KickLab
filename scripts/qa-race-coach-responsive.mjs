import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5879/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-coach-responsive');
const head=process.env.KICKLAB_QA_HEAD||'working';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const sizes=[[360,780],[390,844],[768,1024],[942,958],[1113,988],[1440,900]];
const report={head,base,cases:[],errors:[],external:[]};
cases: for(const [width,height] of sizes)for(const analog of [false,true]){
  const name=`${width}x${height}-${analog?'analog':'classic'}`;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  try{
    const url=new URL(base);for(const [key,value] of [['raceProgression','prototype'],['raceTelemetry','prototype'],['raceCornerTrace','prototype'],['rev',head]])url.searchParams.set(key,value);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});if(analog)await page.click('#analogControlsButton');
    await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:20000});await page.click('.race-orbit-panel button');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done,null,{timeout:20000});await page.locator('#raceCoachSetup').waitFor({state:'visible'});
    const setup=await page.evaluate(()=>{const rect=selector=>document.querySelector(selector)?.getBoundingClientRect().toJSON();return{card:rect('#raceCoachSetup'),stage:rect('.stage'),deck:rect('.control-deck'),text:document.querySelector('#raceCoachSetup').textContent.trim(),controlsHidden:!document.querySelector('#controlLeftSlot').getClientRects().length&&!document.querySelector('#padR').getClientRects().length&&!document.querySelector('#touchController').getClientRects().length,telemetryHidden:!document.querySelector('#raceTelemetry').getClientRects().length};});
    if(!setup.text.includes('Coach Nia')||!setup.text.includes('entry')||!setup.controlsHidden||!setup.telemetryHidden||setup.card.width<100||setup.card.top<setup.stage.top-1||setup.card.bottom>setup.stage.bottom+1||setup.deck.height>setup.card.height+3)throw new Error(`setup ${JSON.stringify(setup)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-setup-${head.slice(0,12)}.png`)});
    await page.evaluate(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.setAutopilot());await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='run',null,{timeout:10000});
    await page.evaluate(()=>{window.__coachDrive=setInterval(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.demoPedals(),16);});await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().x>35,null,{timeout:25000});
    const expanded=await page.evaluate(()=>{const rect=selector=>{const box=document.querySelector(selector)?.getBoundingClientRect();return box&&{left:box.left,top:box.top,right:box.right,bottom:box.bottom,width:box.width,height:box.height};},cue=document.querySelector('#raceTelemetryCue'),control=document.querySelector('.control-deck');return{cue:rect('#raceTelemetryCue'),cueText:cue.textContent,cueScrollHeight:cue.scrollHeight,cueClientHeight:cue.clientHeight,cueScrollWidth:cue.scrollWidth,cueClientWidth:cue.clientWidth,telemetry:rect('#raceTelemetry'),deck:rect('.control-deck'),stage:rect('.stage'),padL:rect('#padL'),padR:rect('#padR'),touch:rect('#touchController'),collapsed:control.classList.contains('controller-collapsed'),state:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state(),overflow:document.documentElement.scrollWidth-innerWidth};});
    const control=analog?expanded.touch:expanded.padL;
    const intersects=(a,b)=>a&&b&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
    if(expanded.collapsed||!expanded.cueText.startsWith('Nia:')||expanded.cueScrollHeight>expanded.cueClientHeight+1||expanded.cueScrollWidth>expanded.cueClientWidth+1||intersects(expanded.cue,control)||intersects(expanded.cue,expanded.padR)&&!analog||expanded.deck.bottom>expanded.stage.bottom+2||expanded.overflow>1)throw new Error(`expanded ${JSON.stringify(expanded)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-expanded-${head.slice(0,12)}.png`)});
    await page.click('#controllerCollapseButton');const collapsed=await page.evaluate(()=>({deck:document.querySelector('.control-deck').getBoundingClientRect().toJSON(),collapsed:document.querySelector('.control-deck').classList.contains('controller-collapsed'),telemetryVisible:!!document.querySelector('#raceTelemetry').getClientRects().length,overflow:document.documentElement.scrollWidth-innerWidth}));
    if(!collapsed.collapsed||collapsed.telemetryVisible||collapsed.deck.height>=expanded.deck.height||collapsed.overflow>1)throw new Error(`collapsed ${JSON.stringify(collapsed)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-collapsed-${head.slice(0,12)}.png`)});
    await page.waitForFunction(()=>['done','crashed'].includes(globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState),null,{timeout:45000});await page.evaluate(()=>clearInterval(window.__coachDrive));
    const result=await page.evaluate(()=>{const rect=selector=>document.querySelector(selector)?.getBoundingClientRect().toJSON();return{card:rect('#raceCoachResult'),stage:rect('.stage'),text:document.querySelector('#raceCoachResult').textContent.trim(),visible:!!document.querySelector('#raceCoachResult').getClientRects().length,collapsed:document.querySelector('.control-deck').classList.contains('controller-collapsed'),controlsHidden:!document.querySelector('#controlLeftSlot').getClientRects().length&&!document.querySelector('#padR').getClientRects().length&&!document.querySelector('#touchController').getClientRects().length,telemetryHidden:!document.querySelector('#raceTelemetry').getClientRects().length,overflow:document.documentElement.scrollWidth-innerWidth};});
    if(!result.visible||result.collapsed||!result.controlsHidden||!result.telemetryHidden||!result.text.includes('brakes')||result.card.top<result.stage.top-1||result.card.bottom>result.stage.bottom+1||result.overflow>1)throw new Error(`result ${JSON.stringify(result)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-result-${head.slice(0,12)}.png`)});
    report.cases.push({name,setup,expanded,collapsed,result});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
  if(report.errors.length||report.external.length)break cases;
}
await browser.close();writeFileSync(join(out,`report-${head.slice(0,12)}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:report.cases.map(item=>item.name),errors:report.errors,external:report.external,report:join(out,`report-${head.slice(0,12)}.json`)}));
if(report.errors.length||report.external.length||report.cases.length!==sizes.length*2)process.exitCode=1;
