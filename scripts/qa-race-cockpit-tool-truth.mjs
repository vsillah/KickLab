import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5289/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/cockpit-tool-truth');mkdirSync(out,{recursive:true});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,cases:[],errors:[],externalRequests:[]};
const flags=['raceExpansion','raceCompetition','raceChampionship','raceMultiplayer','raceSimulator','raceCornerTrace','raceTelemetry'];

async function enterRace(page){
 if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
 if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
 await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
 const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
 await page.locator('#raceStageStart').waitFor({state:'visible',timeout:20000});
}
async function openTools(page){if(await page.locator('#racePhoneToolsToggle').getAttribute('aria-expanded')!=='true')await page.click('#racePhoneToolsToggle');await page.locator('#gameGuidanceHud').waitFor({state:'visible'});}
async function assertTruth(page,label){
 await page.waitForFunction(()=>document.querySelector('#raceControlStyleCurrent')?.textContent?.includes('selected'));
 const state=await page.evaluate(()=>{
  const $=selector=>document.querySelector(selector),text=selector=>$(selector)?.textContent.trim()||'',attr=(selector,name)=>$(selector)?.getAttribute(name)||'';
  const raw=window.__KICKLAB_RACE_TOOL_TRUTH_QA__.state(),cue=raw.coach.replace(/^Coach Nia(?: here| on the radio)?[.:]?\s*/i,'').trim();
  const style=raw.simulator?'Simulator':raw.analog?'Analog':'Classic';
  const math=raw.variable?`${raw.variable.name} ${Number(raw.variable.value).toFixed(raw.variable.decimals)}${raw.variable.unit?raw.variable.unit==='°'?'°':` ${raw.variable.unit}`:''}`:'';
  const sections=['#orientationHud','#challengeHud','#coach','#historyHud','#liveMathHud','#profileHud'].map(selector=>({selector,rect:$(selector).getBoundingClientRect().toJSON(),title:$(selector).title}));
  const rail=$('#gameGuidanceHud').getBoundingClientRect();
  return{expected:{mode:raw.mode,target:raw.target,cue,log:raw.latest||'No Race events yet',math,player:raw.profile,style,car:raw.car,tire:raw.tire||'',steer:raw.steer==='auto'?'Autopilot':'You steer'},actual:{lab:text('#orientationHud .orientation-summary small'),goal:text('#challengeHudSummary .hud-summary-cue'),coach:text('#raceToolCoachValue'),log:text('#historyTitle'),math:text('#liveMathHudValues span'),player:text('#hudProfileName'),style:text('#raceControlStyleCurrent'),garage:text('#raceToolsGarageValue'),steer:text('#raceToolsSteeringValue'),goalTitle:attr('#challengeHud','aria-label'),coachTitle:attr('#coach','aria-label'),styleTitle:attr('#controlStyleOptions','aria-label'),garageTitle:attr('#raceToolsGarage','aria-label'),mathTitle:attr('#liveMathHud','aria-label'),profileTitle:attr('#profileHud','aria-label'),logTitle:attr('#historyHud','aria-label')},sections,rail:{left:rail.left,right:rail.right,top:rail.top,bottom:rail.bottom},overflow:document.documentElement.scrollWidth-innerWidth,storage:Object.keys(localStorage).sort()};
 });
 const {expected:e,actual:a}=state,checks=[a.lab===e.mode,a.goal===e.mode,a.coach&&a.coach===e.cue.slice(0,45).trimEnd()+(e.cue.length>48?'…':'')||a.coach===e.cue,a.log===e.log,a.math===e.math,a.player===e.player,a.style===`${e.style} selected`,a.garage.includes(e.car)&&(!e.tire||a.garage.includes(e.tire)),a.steer===e.steer,a.goalTitle.includes(e.target),a.coachTitle.includes(e.cue),a.styleTitle.includes(e.style),a.garageTitle.includes(e.car),a.mathTitle.includes(e.math),a.profileTitle.includes(e.player),a.logTitle.includes(e.log),state.overflow<=1,state.sections.every(item=>item.rect.width>=44&&item.rect.left>=state.rail.left-1&&item.rect.right<=state.rail.right+1),state.storage.every(key=>['impactlab.v1','impactlab.nick','kicklab.profiles.v1'].includes(key))];
 if(checks.some(ok=>!ok))throw Error(`${label}: tool truth ${JSON.stringify({checks,state})}`);
 report.cases.push({label,expected:e,actual:a});
}

async function run(width,height,{fallback=false}={}){
 const name=`${width}x${height}${fallback?'-canvas':''}`,context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:width===390?'reduce':'no-preference'});
 await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
 await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.externalRequests.push(`${name}: ${url}`);route.abort();}});
 try{
  const url=new URL(base);for(const flag of flags)url.searchParams.set(flag,'prototype');if(fallback)url.searchParams.set('fallback','canvas');url.searchParams.set('rev',head);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});await enterRace(page);await openTools(page);await assertTruth(page,`${name}-initial`);
  await page.locator('.stage').screenshot({path:join(out,`${name}-initial.png`)});
  for(const [button,panel,close] of [['#orientationDetailToggle','#orientationDetail','[data-close-detail="orientation"]'],['#goalsDetailToggle','#goalsDetail','[data-close-detail="goals"]'],['#learnDetailToggle','#learnDetail','[data-close-detail="learn"]'],['#reviewDetailToggle','#reviewDetail','[data-close-detail="review"]'],['#physicsDetailsHud','#physicsDetail','[data-close-detail="math"]']]){await page.click(button);if(!await page.locator(panel).isVisible())throw Error(`${name}: ${button} did not open`);await page.click(close);await assertTruth(page,`${name}-${button.slice(1)}-return`);}
  for(const [button,style] of [['#analogControlsButton','Analog'],['#simulatorControlsButton','Simulator'],['#classicControlsButton','Classic']]){await page.click(button);await page.waitForFunction(expected=>document.querySelector('#raceControlStyleCurrent')?.textContent===`${expected} selected`,style);await assertTruth(page,`${name}-${style}`);}
  if(!fallback){await page.click('#raceToolsSteering');await assertTruth(page,`${name}-steering-changed`);}
  const beforeGarage=await page.evaluate(()=>window.__KICKLAB_RACE_TOOL_TRUTH_QA__.state());
  await page.click('#raceToolsGarage');await page.locator('#settingsDrawer').waitFor({state:'visible'});
  const tireSection=page.locator('#raceGarage [data-garage-section="tires"]');if(await tireSection.getAttribute('aria-expanded')!=='true')await tireSection.click();
  await page.locator('#raceGarage [data-garage-part="tires"]:not([aria-pressed="true"]):not(:disabled)').first().click();
  await page.locator('#raceGarage [data-race-mode]:not([aria-pressed="true"]):not(:disabled)').first().click();
  await page.click('#settingsClose');await openTools(page);await assertTruth(page,`${name}-garage-return`);
  const afterGarage=await page.evaluate(()=>window.__KICKLAB_RACE_TOOL_TRUTH_QA__.state());
  if(beforeGarage.tire===afterGarage.tire||beforeGarage.mode===afterGarage.mode)throw Error(`${name}: Garage tire or mode did not change`);
  await page.click('#racePhoneToolsToggle');await openTools(page);await assertTruth(page,`${name}-reopen`);
  if(!fallback){
   await page.click('#profileBtn');await page.locator('#profileDialog').waitFor({state:'visible'});await page.click('#profileCreate');await page.fill('#profileNickname',`Tile Pilot ${width}`);await page.click('#profileFormSave');await page.click('#profileClose');await openTools(page);await assertTruth(page,`${name}-profile-changed`);
   await page.reload({waitUntil:'domcontentloaded'});await enterRace(page);await openTools(page);await assertTruth(page,`${name}-restored`);
   await page.click('#racePhoneToolsToggle');await page.click('#raceCoachSetupStart');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:25000});await page.keyboard.press('p');await page.locator('#gamePacingOverlay').waitFor({state:'visible'});await page.keyboard.press('p');await page.locator('#gamePacingOverlay').waitFor({state:'hidden'});await openTools(page);await assertTruth(page,`${name}-resumed`);
   await page.locator('.stage').screenshot({path:join(out,`${name}-resumed.png`)});
   const p95=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let last=performance.now();function tick(now){frames.push(now-last);last=now;if(frames.length<90)requestAnimationFrame(tick);else{const values=frames.slice(5).sort((a,b)=>a-b);resolve(values[Math.floor(values.length*.95)]);}}requestAnimationFrame(tick);}));
   report.cases.push({label:`${name}-performance`,p95Ms:+p95.toFixed(2),budgetMs:width<=480?42:35});if(p95>(width<=480?42:35))throw Error(`${name}: frame p95 ${p95}`);
  }
 }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
}
try{await run(390,844);await run(1440,900);await run(390,844,{fallback:true});}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({cases:report.cases.map(item=>item.label),errors:report.errors,externalRequests:report.externalRequests}));if(report.errors.length||report.externalRequests.length)process.exitCode=1;
