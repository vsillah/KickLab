import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5865/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-garage'),head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,cases:[],errors:[],external:[]};
const sizes=[[360,780],[390,844],[768,1024],[942,958],[1113,988],[1440,900]].filter(([width])=>!process.env.KICKLAB_QA_WIDTHS||process.env.KICKLAB_QA_WIDTHS.split(',').includes(String(width)));

async function inspect(width,height,{reduced=false,canvas=false,analog=false}={}){
  const name=`${width}${reduced?'-reduced':''}${canvas?'-canvas':''}${analog?'-analog':''}`;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  try{
    const url=new URL(base);url.searchParams.set('raceCornerTrace','prototype');url.searchParams.set('rev',head);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    if(canvas)await page.evaluate(()=>window.__KICKLAB_RACE_START_FINISH_QA__.useCanvas());
    await page.click('#lab-tab-race');
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const toast=page.locator('.toast-close:visible').first();if(await toast.count())await toast.evaluate(button=>button.click());
    if(analog)await page.click('#analogControlsButton');
    if(!await page.locator('#settingsToggle').isVisible())await page.click('#orientationDetailToggle');
    await page.click('#settingsToggle');
    const direct=await page.locator('#settingsCategories [data-category="garage"]').isVisible();if(!direct)throw new Error('Garage missing from first settings screen');
    await page.click('#settingsCategories [data-category="garage"]');
    const initial=await page.evaluate(()=>({level:document.querySelector('#settingsTitle').textContent,build:window.__KICKLAB_RACE_GARAGE__?.build,summary:!document.querySelector('#raceGarageSummary').hidden,scrollWidth:document.documentElement.scrollWidth,innerWidth,focus:document.activeElement?.dataset.garagePart||''}));
    if(initial.level!=='Garage & tuning'||!initial.summary||initial.scrollWidth>initial.innerWidth+1)throw new Error(`Garage entry: ${JSON.stringify(initial)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-stock.png`)});
    const suspension=[];
    for(const value of ['soft','balanced','firm']){
      await page.click(`#raceGarage [data-garage-part="suspension"][data-garage-value="${value}"]`);
      suspension.push(await page.evaluate(()=>({choice:window.__KICKLAB_RACE_GARAGE__.build.suspension,stock:window.__KICKLAB_RACE_GARAGE__.stock,current:window.__KICKLAB_RACE_GARAGE__.current,summary:document.querySelector('#raceGarageSummary').innerText,visible:document.querySelector('#raceGarageSummary').getBoundingClientRect().bottom<=innerHeight+1})));
    }
    if(suspension.some(item=>!item.visible||item.stock.steeringResponse!==1||item.stock.slideRecovery!==1)||!(suspension[0].current.steeringResponse<suspension[1].current.steeringResponse&&suspension[1].current.steeringResponse<suspension[2].current.steeringResponse)||!(suspension[0].current.slideRecovery>suspension[1].current.slideRecovery&&suspension[1].current.slideRecovery>suspension[2].current.slideRecovery)||!suspension[2].summary.includes('118%')||!suspension[2].summary.includes('78%'))throw new Error(`Suspension comparison: ${JSON.stringify(suspension)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-suspension-firm.png`)});
    await page.click('#raceGarage [data-garage-part="suspension"][data-garage-value="balanced"]');
    for(const [field,value] of [['body','race'],['suspension','firm'],['tires','wide'],['brakes','sport']]){
      await page.click(`#raceGarage [data-garage-part="${field}"][data-garage-value="${value}"]`);
      const applied=await page.evaluate(({field,value})=>({selected:window.__KICKLAB_RACE_GARAGE__?.build?.[field],pressed:document.querySelector(`#raceGarage [data-garage-part="${field}"][data-garage-value="${value}"]`)?.getAttribute('aria-pressed'),focus:document.activeElement?.dataset.garagePart,summary:document.querySelector('#raceGarageSummary').getBoundingClientRect().bottom<=innerHeight+1}),{field,value});
      if(applied.selected!==value||applied.pressed!=='true'||!applied.summary)throw new Error(`${field}: ${JSON.stringify(applied)}`);
    }
    const tuned=await page.evaluate(()=>({build:window.__KICKLAB_RACE_GARAGE__.build,current:window.__KICKLAB_RACE_GARAGE__.current,stock:window.__KICKLAB_RACE_GARAGE__.stock,summary:document.querySelector('#raceGarageSummary').innerText,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)}));
    if(tuned.current.launch<=tuned.stock.launch||tuned.current.corner<=tuned.stock.corner||tuned.overflow)throw new Error(`No tuned physics or overflow: ${JSON.stringify(tuned)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-tuned.png`)});
    await page.keyboard.press('Escape');if(await page.locator('#settingsDrawer').isVisible())throw new Error('Escape did not close settings');
    if(!canvas){await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:8000});await page.click('.race-orbit-panel button');}
    else {await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('Space');await page.keyboard.up('Space');}
    await page.waitForFunction(()=>window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_READ__().race.state==='run',null,{timeout:15000});
    if(analog)await page.click('#controllerCollapseButton');
    const live=await page.evaluate(()=>({state:window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_READ__().race.state,params:window.__KICKLAB_RACE_GARAGE_QA__.read().parameters,style:document.querySelector('#analogControlsButton').getAttribute('aria-pressed'),collapsed:document.querySelector('#controllerCollapseButton').getAttribute('aria-expanded'),telemetry:window.__KICKLAB_RACE_TELEMETRY__?.enabled===true}));
    if(live.state!=='run'||live.params.brakePower<=1||live.params.mu<=.9||(!canvas&&!live.telemetry))throw new Error(`Live Race parameters: ${JSON.stringify(live)}`);
    report.cases.push({name,width,height,reduced,canvas,analog,initial,suspension,tuned,live});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
}
try{if(process.env.KICKLAB_QA_ONLY==='canvas')await inspect(390,844,{canvas:true});else{for(const [width,height] of sizes)await inspect(width,height);if(!process.env.KICKLAB_QA_WIDTHS){await inspect(390,844,{reduced:true});await inspect(390,844,{canvas:true});await inspect(390,844,{analog:true});}}}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.map(x=>x.name),errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
