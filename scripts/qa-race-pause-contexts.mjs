import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:63339/pages/index.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-pause-contexts');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the full reviewed commit.');
const origin=new URL(base);
if(origin.protocol!=='http:'||!['localhost','127.0.0.1'].includes(origin.hostname)||origin.pathname!=='/pages/index.html')throw Error('Use the trusted localhost Pages artifact.');
const url=new URL(base);for(const flag of ['raceExpansion','raceCompetition','raceChampionship','raceMultiplayer','racePreflight'])url.searchParams.set(flag,'prototype');url.searchParams.set('rev',head);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const report={head,cases:[],errors:[],external:[],httpErrors:[]};
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const state=page=>page.evaluate(()=>{const store=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));let race=null,multi=null;try{race=window.__KICKLAB_RACE_MODES_QA__.state().phase;multi=window.__KICKLAB_RACE_MULTIPLAYER_QA__.state();}catch(_){}return{home:!document.querySelector('#modeHome').hidden,preflight:!document.querySelector('#racePreflight').hidden,pause:!document.querySelector('#gamePacingOverlay').hidden&&document.querySelector('#gamePacingOverlay').dataset.state==='paused',race,champ:window.__KICKLAB_RACE_CHAMPIONSHIP_QA__.state(),multi,profiles:store.profiles.map(({id,progress})=>({id,progress})),activeId:store.activeId};});
async function createPage(label){
  const context=await browser.newContext({viewport:{width:1113,height:834},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'})));
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('response',response=>{if(response.status()>=400)report.httpErrors.push(`${label}: ${response.status()} ${response.url()}`);});
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(origin.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${label}: ${target}`);route.abort();}});
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  return{context,page};
}
async function openRace(page){await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:25000});await page.click('#racePreflightClose');await page.click('#racePhoneProgress');}
async function commitPreflight(page,{first=true}={}){
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
  for(let step=0;step<(first?4:3);step++)await page.click('#racePreflightNext');
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
}
async function switchProfile(page,button,id){await page.click(button);await page.click(`[data-profile-id="${id}"]`);await page.click('#profileClose');if(!await page.locator('#raceComparativeContinue').isVisible())await page.click('#racePhoneProgress');}
async function waitRun(page){
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().phase==='run',null,{timeout:30000});
}
async function exitPaused(page){await page.locator('#cv').click();await page.locator('#gamePacingSaveExit').waitFor({state:'visible'});assert((await state(page)).pause,'manual Race pause missing');await page.click('#gamePacingSaveExit');assert((await state(page)).home,'Save & Exit did not reach home');}

try{
  const {context,page}=await createPage('season');
  await openRace(page);await page.click('#raceChampionshipToggle');assert((await state(page)).champ.active,'season did not start');
  await page.click('[data-close-detail="orientation"]');await page.keyboard.press('KeyW');await commitPreflight(page);await waitRun(page);
  const before=await state(page);await exitPaused(page);const after=await state(page);
  assert(!after.champ.active&&Object.keys(after.champ.season.results).length===0,'incomplete season awarded a result');
  assert(JSON.stringify(after.champ.solo)===JSON.stringify(before.champ.solo),'season changed earned solo progress');
  await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});assert(!(await state(page)).champ.active,'season resumed after home re-entry');
  report.cases.push({name:'championship active run exits without award or stale season'});await context.close();
}catch(error){report.errors.push(`season: ${error.stack||error}`);}

try{
  const {context,page}=await createPage('local-match');
  const first=(await state(page)).activeId;
  await page.click('#homeProfileButton');await page.click('#profileCreate');await page.fill('#profileNickname','Racer Two');await page.click('#profileFormSave');const second=(await state(page)).activeId;
  await page.click(`[data-profile-id="${first}"]`);await page.click('#profileClose');
  await openRace(page);await page.selectOption('#raceMultiplayerOpponent',second);await page.click('#raceMultiplayerStart');
  await commitPreflight(page);
  assert((await state(page)).multi.setup?.stage==='handoff','Racer 1 setup did not reach handoff');
  await switchProfile(page,'#raceComparativeProfiles',second);await page.click('#raceComparativeContinue');
  await commitPreflight(page,{first:false});assert((await state(page)).multi.setup?.stage==='confirm','Racer 2 setup did not reach confirmation');
  await switchProfile(page,'#raceComparativeProfiles',first);await page.click('#raceComparativeConfirm');
  assert((await state(page)).multi.phase==='readyA','local match was not ready');
  assert(await page.evaluate(()=>window.__KICKLAB_RACE_MULTIPLAYER_QA__.start()),'local match QA run did not start');
  const before=await state(page);await exitPaused(page);const after=await state(page);
  assert(after.multi.phase==='retryA'&&!after.multi.hasA&&!after.multi.hasB,'incomplete match awarded a result or lost retry state');
  assert(JSON.stringify(after.multi.solo)===JSON.stringify(before.multi.solo),'local match changed earned solo progress');
  await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
  assert((await state(page)).multi.phase==='setup','local match resumed after home re-entry');
  report.cases.push({name:'local head-to-head active run exits without award and re-enters solo'});await context.close();
}catch(error){report.errors.push(`local-match: ${error.stack||error}`);}

await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length||report.external.length||report.httpErrors.length)process.exitCode=1;
