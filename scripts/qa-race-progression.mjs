import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5875/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-progression');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const sizes=[[360,780],[390,844],[768,1024],[942,958],[1113,988],[1440,900]].filter(([width])=>!process.env.KICKLAB_QA_WIDTHS||process.env.KICKLAB_QA_WIDTHS.split(',').includes(String(width)));
const report={head,base,cases:[],errors:[],external:[]};

async function inspect(width,height,analog){
  const name=`${width}x${height}-${analog?'analog':'classic'}`;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'no-preference'});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  try{
    const url=new URL(base);url.searchParams.set('raceProgression','prototype');url.searchParams.set('rev',head);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    if(analog)await page.click('#analogControlsButton');
    const initial=await page.evaluate(()=>({...globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state(),overflow:document.documentElement.scrollWidth-innerWidth}));
    if(initial.level!=='highland'||initial.venue!=='highland'||initial.analog!==analog||initial.overflow>1)throw new Error(`initial ${JSON.stringify(initial)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-highland-stage.png`)});
    await page.click('#goalsDetailToggle');await page.locator('#goalsDetail').waitFor({state:'visible'});
    const goals=await page.evaluate(()=>({locked:[...document.querySelectorAll('#chal [data-race-level]')].map(x=>x.disabled),strategies:document.querySelectorAll('#chal .race-level-coach li').length,math:document.querySelector('.race-progression-math')?.textContent,paused:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().paused,overflow:document.documentElement.scrollWidth-innerWidth}));
    if(JSON.stringify(goals.locked)!=='[false,true,true]'||goals.strategies!==3||!goals.math.includes('km/h')||!goals.paused||goals.overflow>1)throw new Error(`goals ${JSON.stringify(goals)}`);
    await page.locator('#goalsDetail').screenshot({path:join(out,`${name}-goals.png`)});
    await page.click('#chal [data-race-level-garage]');await page.locator('#raceGarage').waitFor({state:'visible'});
    await page.click('#raceGarage [data-garage-section="tires"]');
    await page.click('#raceGarage [data-garage-part="tires"][data-garage-value="wide"]');
    await page.waitForFunction(()=>document.activeElement?.dataset.garageValue==='wide');
    const tuned=await page.evaluate(()=>({tires:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().build.tires,mu:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().mu,focus:document.activeElement?.dataset.garageValue}));
    if(tuned.tires!=='wide'||tuned.focus!=='wide')throw new Error(`garage ${JSON.stringify(tuned)}`);
    await page.locator('#settingsDrawer').screenshot({path:join(out,`${name}-garage.png`)});
    await page.click('#settingsClose');await page.locator('#goalsDetail').waitFor({state:'visible'});
    await page.waitForFunction(()=>document.activeElement?.dataset.raceLevel==='0');
    const returned=await page.evaluate(()=>({focus:document.activeElement?.dataset.raceLevel,selected:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().progress.selected,paused:globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().paused}));
    if(returned.focus!=='0'||returned.selected!==0||!returned.paused)throw new Error(`return ${JSON.stringify(returned)}`);
    await page.click('#goalsDetail [data-close-detail]');
    await page.click('#learnDetailToggle');await page.locator('#raceProgressionCoach').waitFor({state:'visible'});
    if(await page.locator('#raceProgressionCoachStrategies li').count()!==3)throw new Error('Coach strategies missing');
    await page.click('#learnDetail [data-close-detail]');
    const fixture=await page.evaluate(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.unlockForQA(2));
    if(fixture!==2)throw new Error('fixture unlock failed');
    await page.click('#goalsDetailToggle');
    for(const [index,venue] of [[1,'marine'],[2,'forest']]){await page.click(`#chal [data-race-level="${index}"]`);const state=await page.evaluate(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state());if(state.progress.selected!==index||state.venue!==venue||!Number.isFinite(state.grade))throw new Error(`${venue} ${JSON.stringify(state)}`);await page.locator('#goalsDetail').screenshot({path:join(out,`${name}-${venue}-goals.png`)});await page.click('#goalsDetail [data-close-detail]');await page.waitForTimeout(180);await page.locator('.stage').screenshot({path:join(out,`${name}-${venue}-stage.png`)});if(index===1)await page.click('#goalsDetailToggle');}
    report.cases.push({name,initial,goals,tuned,returned});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
}

for(const [width,height] of sizes)for(const analog of [false,true])await inspect(width,height,analog);
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,external:report.external,report:join(out,'report.json')}));
if(report.errors.length||report.external.length||report.cases.length!==sizes.length*2)process.exitCode=1;
