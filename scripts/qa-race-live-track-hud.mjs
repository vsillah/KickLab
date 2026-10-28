import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5289/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-live-track-hud');mkdirSync(out,{recursive:true});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const report={head,base,cases:[],errors:[],external:[]};
async function inspect(width,height,mode,control='classic',canvas=false,reduced=false){
  const name=`${mode}-${control}-${width}${canvas?'-canvas':''}${reduced?'-reduced':''}`,context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
  await context.addInitScript(gfx=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})),canvas?'2d':'3d');
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));
  await page.route('**/*',route=>{const u=route.request().url();if(u.startsWith(new URL(base).origin)||u.startsWith('data:')||u.startsWith('blob:'))route.continue();else{report.external.push(`${name}: ${u}`);route.abort();}});
  try{
    const url=new URL(base);for(const key of ['raceExpansion','raceCornerTrace','raceTelemetry'])url.searchParams.set(key,'prototype');url.searchParams.set('raceEngineQA','1');url.searchParams.set('rev',head);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-race').click();if(await page.locator('#racePreflight').isVisible())await page.locator('#racePreflightClose').click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    await page.evaluate(({mode})=>window.__KICKLAB_RACE_ENGINE_QA__.select(mode,'cobalt'),{mode});
    await page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.run());if(await page.locator('#racePreflight').isVisible())await page.locator('#racePreflightClose').click();
    if(control!=='classic'){await page.locator('#racePhoneToolsToggle').click({timeout:5000});await page.locator(control==='analog'?'#analogControlsButton':'#simulatorControlsButton').click({timeout:5000});await page.locator('#racePhoneToolsToggle').click({timeout:5000});}
    await page.locator('#raceNavigation').waitFor({state:'visible',timeout:5000});await page.waitForTimeout(180);
    const state=await page.evaluate(()=>{const rect=id=>document.querySelector(id)?.getBoundingClientRect().toJSON(),nav=window.__KICKLAB_RACE_NAVIGATION__,stage=rect('.stage'),dash=rect('#raceNavigation'),map=rect('#raceNavigationMap'),wheel=rect('#raceWheelCanvas'),car=window.__KICKLAB_RACE_3D__?.composition;return{nav,stage,dash,map,wheel,car,overflow:document.documentElement.scrollWidth-innerWidth,road:document.querySelector('#raceNavigationRoad').getAttribute('d'),markers:['Brake','Turn','Apex','Exit'].map(id=>!document.querySelector(`#raceNavigation${id}`).hidden),controller:document.querySelector('#analogControlsButton').getAttribute('aria-pressed')==='true'?'analog':document.querySelector('#simulatorControlsButton').getAttribute('aria-pressed')==='true'?'simulator':'classic'};});
    if(!state.nav?.visible||!state.road.startsWith('M')||state.overflow>1||state.dash.right>state.stage.right+1||state.map.width<70||state.map.height<40)throw Error(`navigation layout: ${JSON.stringify(state)}`);
    if(mode==='drag'&&state.markers.some(Boolean))throw Error('Drag shows corner markers');
    if(mode!=='drag'&&!state.markers.every(Boolean))throw Error('Missing corner zones');
    await page.locator('.stage').screenshot({path:join(out,`${name}.png`)});report.cases.push({name,url:url.toString(),...state});
  }catch(e){report.errors.push(`${name}: ${e.stack||e}`);}finally{await context.close();}
}
try{if(process.argv.includes('--one'))await inspect(390,844,'hill');else{for(const [w,h] of [[360,780],[390,844],[768,1024],[1113,988],[1440,900]])await inspect(w,h,'hill');for(const mode of ['drag','drift','circuit','endurance'])await inspect(390,844,mode);for(const control of ['analog','simulator'])await inspect(390,844,'hill',control);await inspect(390,844,'hill','classic',true);await inspect(390,844,'hill','classic',false,true);}}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({cases:report.cases.map(x=>x.name),errors:report.errors,external:report.external}));if(report.errors.length||report.external.length)process.exitCode=1;
