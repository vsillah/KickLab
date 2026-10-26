import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5305/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-dashboard-lifecycle');mkdirSync(out,{recursive:true});
const revision=process.argv[4]||'working-tree';
const sizes=[[360,780],[390,844],[768,1024],[1113,988],[1440,900]].filter(([width])=>!process.env.KICKLAB_QA_WIDTHS||process.env.KICKLAB_QA_WIDTHS.split(',').includes(String(width)));
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={revision,cases:[],errors:[],externalRequests:[]};

for(const [width,height] of sizes){
 const reduced=width===360||width===768||width===1440;
 const name=`${width}x${height}-${reduced?'reduced':'normal'}`;
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
 await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
 await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.externalRequests.push(`${name}: ${url}`);route.abort();}});
 try{
  const url=new URL(base);for(const flag of ['raceExpansion','raceSimulator','raceCornerTrace','raceTelemetry'])url.searchParams.set(flag,'prototype');url.searchParams.set('rev',revision);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:20000});
  await page.locator('.stage').scrollIntoViewIfNeeded();
  const inspect=()=>page.evaluate(()=>{const box=selector=>document.querySelector(selector)?.getBoundingClientRect().toJSON(),stage=box('.stage'),path=box('#racePhoneProgress'),wrench=box('#racePhoneToolsToggle'),dashboard=box('#raceNavigation');return{phase:window.__KICKLAB_RACE_3D__?.dynamics?.state,renderer:window.__KICKLAB_RACE_3D__?.status,stage,path,wrench,dashboard,dashboardVisible:!!document.querySelector('#raceNavigation')?.getClientRects().length,paused:!document.querySelector('#gamePacingOverlay').hidden,result:!document.querySelector('#results').hidden,overflow:document.documentElement.scrollWidth-innerWidth,storage:Object.keys(localStorage).sort()};});
  const setup=await inspect();if(setup.phase!=='grid'||setup.dashboardVisible||setup.path.width<100||setup.wrench.width<40||setup.path.right>setup.wrench.left-4)throw Error(`setup ${JSON.stringify(setup)}`);
  await page.locator('.stage').screenshot({path:join(out,`${name}-setup.png`)});
  await page.locator('#raceCoachSetupStart').click();
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='count',null,{timeout:5000});
  const count=await inspect();if(count.dashboardVisible||count.path.right>count.wrench.left-4)throw Error(`countdown ${JSON.stringify(count)}`);
  await page.locator('.stage').screenshot({path:join(out,`${name}-countdown.png`)});
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:12000});
  await page.locator('#raceNavigation').waitFor({state:'visible',timeout:5000});
  const live=await inspect();if(live.renderer!=='rendering'||live.dashboard.top-live.path.bottom<6||live.dashboard.right>live.stage.right-4||live.overflow>0)throw Error(`live ${JSON.stringify(live)}`);
  await page.locator('.stage').screenshot({path:join(out,`${name}-live.png`)});
  await page.keyboard.press('p');await page.locator('#gamePacingOverlay').waitFor({state:'visible',timeout:5000});
  const paused=await inspect();if(!paused.paused||paused.dashboardVisible&&paused.dashboard.top-paused.path.bottom<6)throw Error(`pause ${JSON.stringify(paused)}`);
  await page.keyboard.press('p');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:5000});
  await page.locator('#raceNavigation').waitFor({state:'visible',timeout:5000});
  const resumed=await inspect();if(resumed.phase!=='run'||!resumed.dashboardVisible||resumed.dashboard.top-resumed.path.bottom<6)throw Error(`resume ${JSON.stringify(resumed)}`);
  const resultUrl=new URL(url);resultUrl.searchParams.set('racePreflight','prototype');resultUrl.searchParams.set('raceEngineQA','1');
  await page.goto(resultUrl.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  await page.evaluate(()=>{window.__KICKLAB_RACE_PREFLIGHT_QA__.close();window.__KICKLAB_RACE_ENGINE_QA__.run();});
  await page.locator('#raceNavigation').waitFor({state:'visible',timeout:5000});
  if(!await page.evaluate(()=>window.__KICKLAB_RACE_PREFLIGHT_QA__.finishForQA()))throw Error('result fixture refused');
  await page.locator('#results').waitFor({state:'visible',timeout:8000});
  const result=await inspect();if(!result.result||result.dashboardVisible)throw Error(`result ${JSON.stringify(result)}`);
  await page.locator('.stage').screenshot({path:join(out,`${name}-result.png`)});
  if(!result.storage.every(key=>['impactlab.v1','impactlab.nick','kicklab.profiles.v1'].includes(key)))throw Error(`storage ${JSON.stringify(result.storage)}`);
  report.cases.push({name,setup:setup.phase,count:count.phase,live:live.phase,paused:paused.paused,resumed:resumed.phase,result:result.phase,overflow:result.overflow,storage:result.storage});
 }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:report.cases,errors:report.errors,externalRequests:report.externalRequests}));
if(report.cases.length!==sizes.length||report.errors.length||report.externalRequests.length)process.exitCode=1;
