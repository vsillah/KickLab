import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5878/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-modes');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={base,commit:process.env.KICKLAB_QA_HEAD||'working',cases:[],errors:[],external:[]};
const requestedModes=process.argv.find(arg=>arg.startsWith('--modes='));
const modes=requestedModes?requestedModes.slice(8).split(','):['drag','drift','circuit','hill'];
async function prepare(page,mode,analog){
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  const dismiss=page.getByRole('button',{name:'Dismiss Profile saved'});
  await page.click('#lab-tab-race');
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
  await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:20000});
  await page.click('#raceCoachSetupGarage');
  await page.locator(`#raceGarage [data-race-mode="${mode}"]`).click();
  await page.click('#settingsClose');
  await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:20000});
  if(analog)await page.click('#raceCoachSetupControls');
  if(mode==='circuit'||mode==='drift'||mode==='hill')await page.click('#raceCoachSetupSteering');
  try{await dismiss.waitFor({state:'visible',timeout:1500});await dismiss.click();await page.locator('#toasts .toast[aria-label="Profile saved"]').waitFor({state:'hidden',timeout:5000});}catch{}
}
if(!process.argv.includes('--video-only'))for(const [width,height] of [[390,844],[768,1024],[1440,900]])for(const mode of modes){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();const name=`${mode}-${width}`;
  page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  try{const url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',report.commit);await page.goto(url.toString(),{waitUntil:'domcontentloaded'});await prepare(page,mode,false);const state=await page.evaluate(()=>({...globalThis.__KICKLAB_RACE_MODES_QA__.state(),setup:document.querySelector('#raceCoachSetupTitle')?.textContent,overflow:document.documentElement.scrollWidth-innerWidth,canvas:!!document.querySelector('#race3')}));await page.locator('.stage').screenshot({path:join(output,`${name}.png`)});report.cases.push({name,...state});}catch(e){report.errors.push(`${name}: ${e.stack||e}`);}finally{await context.close();}
}
if(!process.argv.includes('--screens-only'))for(const mode of modes)for(const analog of [false,true]){
  const name=`${mode}-${analog?'analog':'classic'}`,context=await browser.newContext({viewport:{width:analog?390:960,height:analog?844:720},deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:{dir:output,size:{width:analog?390:960,height:analog?844:720}}});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  try{const url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',report.commit);await page.goto(url.toString(),{waitUntil:'domcontentloaded'});await prepare(page,mode,analog);await page.locator('#raceCoachSetupStart').click();await page.locator('#raceTelemetry').waitFor({state:'visible',timeout:10000});await page.waitForTimeout(2500);
    let stick=null;const holdAnalog=async()=>{stick=await page.locator('#analogStick').boundingBox();if(!stick)throw new Error('Analog stick hidden');await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height*.08,{steps:8});};
    if(analog)await holdAnalog();else await page.keyboard.down('Space');
    if(mode==='drag'){
      const thresholds=[46,88,132];let shifted=0;
      for(let i=0;i<43;i++){
        await page.waitForTimeout(400);
        const state=await page.evaluate(()=>globalThis.__KICKLAB_RACE_MODES_QA__.state());
        if(state.phase==='done'||state.phase==='crashed')break;
        if(shifted<thresholds.length&&state.speedKmh>=thresholds[shifted]){
          if(analog)await page.mouse.up();
          await page.locator('#raceTelemetryShift').click({timeout:5000});shifted++;
          if(analog)await holdAnalog();
        }
      }
    }else await page.waitForTimeout(2500);
    if(analog)await page.mouse.up();else await page.keyboard.up('Space');
    await page.waitForTimeout(1500);const state=await page.evaluate(()=>({...globalThis.__KICKLAB_RACE_MODES_QA__.state(),overflow:document.documentElement.scrollWidth-innerWidth}));report.cases.push({name,...state});}catch(e){report.errors.push(`${name}: ${e.stack||e}`);}finally{const video=page.video();await context.close();if(video)report.cases.push({name,video:await video.path()});}
}
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,external:report.external,output},null,2));if(report.errors.length||report.external.length||report.cases.some(x=>x.overflow>1))process.exitCode=1;
