import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[a-f0-9]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the exact product commit');
const base=new URL(process.argv[2]||'http://127.0.0.1:4173/kicklab.html');
if(!['127.0.0.1','localhost'].includes(base.hostname)||base.pathname!=='/kicklab.html')throw Error('Use the local exact build');
base.searchParams.set('rev',head);
for(const flag of ['raceExpansion','raceCompetition','raceChampionship','raceMultiplayer','raceSimulator','raceCornerTrace','raceTelemetry','racePreflight'])base.searchParams.set(flag,'prototype');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const artifactSha256=sha(readFileSync('dist/kicklab.html'));
if(sha(Buffer.from(await(await fetch(base)).arrayBuffer()))!==artifactSha256)throw Error('Served HTML differs from the exact local product build');
const out=resolve(process.argv[3]||'qa-artifacts/race-preflight-cancel-focus');mkdirSync(out,{recursive:true});
const report={head,artifactSha256,url:base.href,cases:[],pageErrors:[],external:[],httpErrors:[]};
const browser=await chromium.launch({headless:true});
for(const {name,width,height,close} of [
  {name:'390-close-button',width:390,height:844,close:'button'},
  {name:'390-escape',width:390,height:844,close:'escape'},
  {name:'1440-close-button',width:1440,height:900,close:'button'}
]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',hasTouch:width<500});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d'})));
  const page=await context.newPage();
  page.on('pageerror',error=>report.pageErrors.push(`${name}: ${error.message}`));
  page.on('response',response=>{if(response.status()>=400)report.httpErrors.push(`${name}: ${response.status()} ${new URL(response.url()).pathname}`)});
  page.on('request',request=>{const target=request.url();if(!target.startsWith(base.origin+'/')&&!target.startsWith('data:')&&!target.startsWith('blob:'))report.external.push(`${name}: ${target}`)});
  try{
    await page.goto(base.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-race').click();
    await page.locator('#racePreflight').waitFor({state:'visible',timeout:30000});
    await page.locator('[data-preflight-venue="highland"]').click();
    await page.locator('[data-preflight-mode="circuit"]').click();
    const savedBefore=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));
    if(close==='button')await page.locator('#racePreflightClose').click();else await page.keyboard.press('Escape');
    await page.locator('#racePreflight').waitFor({state:'hidden',timeout:10000});
    await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:30000});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done===true,null,{timeout:30000});
    await page.screenshot({path:join(out,`${name}.png`)});
    const state=await page.evaluate(()=>({focusId:document.activeElement?.id||null,focusTag:document.activeElement?.tagName||null,startVisible:!!document.querySelector('#raceCoachSetupStart')?.getClientRects().length,phase:window.__KICKLAB_RACE_MODES_QA__?.state().phase,preflightOpen:window.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,renderer:window.__KICKLAB_RACE_3D__?.status,overflow:document.documentElement.scrollWidth-innerWidth}));
    state.savedUnchanged=await page.evaluate(before=>localStorage.getItem('kicklab.profiles.v1')===before,savedBefore);
    report.cases.push({name,...state,pass:state.focusId==='raceCoachSetupStart'&&state.startVisible&&state.phase==='grid'&&!state.preflightOpen&&state.savedUnchanged&&state.overflow===0});
  }catch(error){report.pageErrors.push(`${name}: ${error.stack||error}`)}
  await context.close();
}
await browser.close();
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,artifactSha256,cases:report.cases,pageErrors:report.pageErrors,external:report.external,httpErrors:report.httpErrors},null,2));
if(report.pageErrors.length||report.external.length||report.httpErrors.length||report.cases.length!==3||report.cases.some(item=>!item.pass))process.exitCode=1;
