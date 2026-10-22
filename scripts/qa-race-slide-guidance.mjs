import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5865/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-slide-guidance');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,cases:[],errors:[],external:[]};

async function inspect(label,{canvas=false,reduced=false}={}){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${label}: ${url}`);route.abort();});
  try{
    const url=new URL(base);url.searchParams.set('raceCornerTrace','prototype');url.searchParams.set('rev',head);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    if(canvas)await page.evaluate(()=>window.__KICKLAB_RACE_START_FINISH_QA__.useCanvas());
    await page.click('#lab-tab-race');
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const toast=page.locator('.toast-close:visible').first();if(await toast.count())await toast.evaluate(button=>button.click());
    if(canvas){await page.keyboard.down('Space');await page.keyboard.up('Space');}
    else {await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:10000});await page.click('.race-orbit-panel button');}
    await page.waitForFunction(()=>window.__KICKLAB_RACE_GARAGE_QA__.read().state==='run',null,{timeout:20000});
    const normal=await page.evaluate(()=>({read:window.__KICKLAB_RACE_GARAGE_QA__.read(),hud:window.__KICKLAB_RACE_GARAGE_QA__.auditSlideHud()}));
    if(normal.hud.some(phase=>phase.forbidden.length))throw new Error(`Normal/sliding HUD call drew sky guidance: ${JSON.stringify(normal.hud)}`);
    if(!await page.evaluate(()=>window.__KICKLAB_RACE_GARAGE_QA__.beginSlideFixture()))throw new Error('Slide fixture refused');
    await page.waitForFunction(()=>window.__KICKLAB_RACE_GARAGE_QA__.read().slideTime>.2,null,{timeout:5000});
    const slide=await page.evaluate(()=>({read:window.__KICKLAB_RACE_GARAGE_QA__.read(),hud:window.__KICKLAB_RACE_GARAGE_QA__.auditSlideHud(),telemetry:window.__KICKLAB_RACE_TELEMETRY__,coach:document.querySelector('#coachMsg')?.textContent||'',telemetryTitle:document.querySelector('#raceTelemetryTitle')?.textContent||'',telemetryVisible:!document.querySelector('#raceTelemetry')?.hidden,navigation:window.__KICKLAB_RACE_NAVIGATION__}));
    if(slide.hud.some(phase=>phase.forbidden.length)||slide.read.slideTime<=.2||!slide.telemetry?.enabled||!slide.read.coachWarned||!(slide.coach.includes('sliding')||slide.telemetry.selected==='grip'&&slide.telemetryVisible))throw new Error(`Slide feedback regression: ${JSON.stringify(slide)}`);
    await page.locator('.stage').screenshot({path:join(out,`${label}-slide.png`)});
    report.cases.push({label,canvas,reduced,url:url.toString(),normal,slide});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);}finally{await context.close();}
}
try{await inspect('3d');await inspect('canvas',{canvas:true});await inspect('3d-reduced',{reduced:true});}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.map(item=>({label:item.label,slideTime:item.slide.read.slideTime,coach:item.slide.coach,telemetry:item.slide.telemetryTitle})),errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
