import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5289/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/cockpit-parity');mkdirSync(out,{recursive:true});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,base,cases:[],errors:[],externalRequests:[]};
const sizes=[[360,780],[390,844],[768,1024],[1113,988],[1440,900],[1980,1310]];
for(const [width,height] of sizes){
 const label=`${width}x${height}`,context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',hasTouch:width<=768});
 await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
 await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.externalRequests.push(`${label}: ${url}`);route.abort();}});
 try{
  const url=new URL(base);for(const key of ['raceExpansion','raceCompetition','raceChampionship','raceMultiplayer','raceSimulator','raceCornerTrace','raceTelemetry'])url.searchParams.set(key,'prototype');url.searchParams.set('rev',head);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();await page.locator('#raceStageStart').waitFor({state:'visible',timeout:20000});await page.locator('.stage').scrollIntoViewIfNeeded();
  const setup=await page.evaluate(()=>{const rect=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();return{stage:rect('.stage'),start:rect('#raceStageStart'),map:rect('#racePhoneProgress'),wrench:rect('#racePhoneToolsToggle'),rail:rect('#gameGuidanceHud'),champParent:document.querySelector('#raceChampionship').parentElement.id,overflow:document.documentElement.scrollWidth-innerWidth};});
  if(!setup.map?.width||!setup.wrench?.width||setup.rail?.width||setup.champParent!=='racePhoneStatusContent'||setup.overflow>1)throw Error(`setup layout ${JSON.stringify(setup)}`);
  await page.locator('.stage').screenshot({path:join(out,`${label}-setup.png`)});
  await page.click('#racePhoneProgress');if(!await page.locator('#orientationDetail').isVisible()||!await page.locator('#raceChampionshipToggle').isVisible())throw Error('event map did not open progress controls');
  await page.click('#raceChampionshipToggle');if((await page.locator('#racePhoneProgressNodes .race-phone-progress-node').count())!==5)throw Error('season map node count');
  await page.click('[data-close-detail="orientation"]');
  await page.click('#racePhoneToolsToggle');if(!await page.locator('#gameGuidanceHud').isVisible())throw Error('tools did not expand');
  const tools=await page.evaluate(()=>({tiles:[...document.querySelectorAll('#gameGuidanceHud>.contextual-summary')].map(el=>({label:el.getAttribute('aria-label'),rect:el.getBoundingClientRect().toJSON()})),overflow:document.documentElement.scrollWidth-innerWidth}));
  if(tools.tiles.length!==6||tools.tiles.some(tile=>tile.rect.width<44)||tools.overflow>1)throw Error(`tools layout ${JSON.stringify(tools)}`);
  await page.locator('.stage').screenshot({path:join(out,`${label}-tools.png`)});
  await page.click('#racePhoneToolsToggle');
  await page.click('#raceCoachSetupStart');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:25000});
  if(width>480){for(const id of ['classicControlsButton','analogControlsButton','simulatorControlsButton']){await page.locator(`#${id}`).click();if(await page.locator(`#${id}`).getAttribute('aria-pressed')!=='true')throw Error(`${id} inactive`);}await page.locator('#classicControlsButton').click();}
  const live=await page.evaluate(()=>{const box=id=>document.querySelector(id)?.getBoundingClientRect().toJSON();return{dash:box('#raceNavigation'),toast:box('.toast'),head:box('.floating-control-head'),car:window.__KICKLAB_RACE_3D__?.composition,canvas:box('#race3'),overflow:document.documentElement.scrollWidth-innerWidth,railVisible:!!document.querySelector('#gameGuidanceHud').getClientRects().length};});
  if(live.overflow>1||live.railVisible)throw Error(`live layout ${JSON.stringify(live)}`);
  if(width>480&&live.toast&&live.dash&&live.toast.top<live.dash.bottom+4)throw Error(`Coach notice overlaps dashboard ${JSON.stringify(live)}`);
  await page.locator('.stage').screenshot({path:join(out,`${label}-live.png`)});
  await page.click('#racePhoneToolsToggle');await page.click('#orientationDetailToggle');if(!await page.locator('#orientationDetail').isVisible())throw Error('lab tile inactive');await page.click('[data-close-detail="orientation"]');
  await page.click('#racePhoneToolsToggle');
  if(width>480){await page.locator('#controllerCollapseButton').click();if(!await page.locator('.control-deck').evaluate(el=>el.classList.contains('controller-collapsed')))throw Error('controller did not collapse');await page.locator('#controllerCollapseButton').click();}
  report.cases.push({label,setup,tools,live});
 }catch(error){report.errors.push(`${label}: ${error.message}`);break;}finally{await context.close();}
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({cases:report.cases.map(item=>item.label),errors:report.errors,externalRequests:report.externalRequests}));
if(report.errors.length||report.externalRequests.length)process.exitCode=1;
