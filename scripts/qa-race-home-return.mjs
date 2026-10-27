import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:63336/pages/index.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-home-return');
const revision=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const report={revision,base,cases:[],errors:[],external:[]};
const sizes=[{width:390,height:844,input:'touch',motion:'reduce',gfx:'2d'},{width:768,height:1024,input:'keyboard',motion:'reduce',gfx:'3d'},{width:1113,height:834,input:'pointer',motion:'no-preference',gfx:'3d'},{width:1440,height:900,input:'pointer',motion:'no-preference',gfx:'3d'}];
const fail=(message,data)=>{throw Error(`${message}: ${JSON.stringify(data)}`);};
const state=page=>page.evaluate(()=>{const preflight=window.__KICKLAB_RACE_PREFLIGHT_QA__?.state(),next=document.querySelector('#racePreflightNext'),box=next?.getBoundingClientRect(),top=box&&document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);return{preflight,home:!document.querySelector('#modeHome').hidden,results:!document.querySelector('#results').hidden,pace:!document.querySelector('#gamePacingOverlay').hidden,modalTop:!!top?.closest('#racePreflight'),nextHit:!!top?.closest('#racePreflightNext'),overflow:document.documentElement.scrollWidth-innerWidth,profile:JSON.parse(localStorage.getItem('kicklab.profiles.v1'))?.activeId,flags:new URLSearchParams(location.search).get('racePreflight'),renderer:window.__KICKLAB_RACE_3D__?.status}});
async function enter(page,input='pointer'){
  const card=page.locator('#lab-tab-race');
  if(input==='touch')await card.tap();else if(input==='keyboard'){await card.focus();await page.keyboard.press('Enter');}else await card.click();
  await page.waitForFunction(()=>window.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open&&window.__KICKLAB_RACE_PREFLIGHT_QA__.state().phase===0,{timeout:25000});
  const current=await state(page);
  if(current.flags!=='prototype'||current.home||current.results||current.pace||current.preflight.raceState!=='grid'||current.preflight.arriving||current.preflight.pendingStart||!current.modalTop||current.overflow>1)fail('Race card did not enter a clean venue stage',current);
  return current;
}
for(const size of sizes.filter(size=>!process.env.KICKLAB_QA_WIDTH||String(size.width)===process.env.KICKLAB_QA_WIDTH)){
  const label=`${size.width}x${size.height}/${size.input}/${size.motion}/${size.gfx}`;
  console.log(`Starting ${label}`);
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,hasTouch:size.input==='touch',reducedMotion:size.motion});
  await context.addInitScript(gfx=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx})),size.gfx);
  const page=await context.newPage(),url=new URL(base);page.setDefaultTimeout(10000);url.searchParams.set('raceResultsQA','1');url.searchParams.set('rev',revision);
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${label}: ${target}`);route.abort();}});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    const first=await enter(page,size.input),original=first.profile;console.log(`${label}: venue`);
    if(size.width===390||size.width===1440)await page.locator('#racePreflight').screenshot({path:join(out,`${size.width}-venue.png`)});
    await page.locator('[data-preflight-mode="hill"]').click();await page.click('#racePreflightNext');
    await page.locator('[data-preflight-vehicle="kestrel"]').click();await page.click('#racePreflightNext');
    await page.locator('[data-preflight-part="brakes"][data-preflight-value="sport"]').click();
    await page.click('#racePreflightBack');
    let current=await state(page);
    if(current.preflight.phase!==1||current.preflight.draft.vehicle!=='kestrel'||current.preflight.draft.garage.brakes!=='sport')fail('Back lost vehicle or Garage draft',current);
    await page.click('#racePreflightNext');await page.click('#racePreflightNext');
    current=await state(page);
    if(current.preflight.phase!==3||current.preflight.draft.mode!=='hill'||current.preflight.draft.vehicle!=='kestrel'||current.preflight.draft.garage.brakes!=='sport'||current.preflight.saved.mode==='hill'||!current.nextHit)fail('Starting grid or draft is wrong',current);
    if(size.width===390||size.width===1440)await page.locator('#racePreflight').screenshot({path:join(out,`${size.width}-grid.png`)});
    await page.click('#racePreflightNext');console.log(`${label}: starting run`);
    await page.locator('#racePreflight').waitFor({state:'hidden',timeout:12000});
    const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().phase==='run',{timeout:30000});
    current=await state(page);
    if(current.preflight.saved.mode!=='hill'||current.preflight.active.vehicle!=='kestrel'||current.preflight.active.garage.brakes!=='sport'||current.preflight.raceState!=='run'||size.gfx==='3d'&&current.renderer==='canvas-fallback')fail('Starting line did not enter the selected run',current);
    if(!await page.evaluate(()=>window.__KICKLAB_RACE_PREFLIGHT_QA__.finishForQA()))fail('Failed-run fixture refused',current);
    await page.locator('#results').waitFor({state:'visible',timeout:12000});
    const beforeSave=await page.evaluate(id=>JSON.stringify(JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.find(profile=>profile.id===id).progress),original);
    await page.click('#rRaceGarage');console.log(`${label}: saved failed result`);
    if(!await page.locator('#modeHome').isVisible())fail('Save & Exit did not reach home',await state(page));
    const afterSave=await page.evaluate(id=>JSON.stringify(JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.find(profile=>profile.id===id).progress),original);
    if(beforeSave!==afterSave)fail('Save & Exit mutated progression twice',{beforeSave,afterSave});
    current=await enter(page,size.input);console.log(`${label}: returned to venue`);
    if(current.preflight.draft.mode!=='hill'||current.preflight.draft.vehicle!=='kestrel'||current.preflight.draft.garage.brakes!=='sport'||!await page.locator('[data-preflight-mode="hill"]').getAttribute('aria-pressed').then(value=>value==='true'))fail('Return did not preserve selected defaults',current);
    await page.click('#racePreflightClose');
    await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.scenario({outcome:'pass',achievement:'none',replay:'both',context:'standalone'}));
    await page.click('#rRaceGarage');current=await enter(page,size.input);
    if(current.preflight.phase!==0||current.preflight.draft.mode!=='hill'||current.results)fail('Passed-run return bypassed venue stage',current);
    report.cases.push({label,profile:original,mode:current.preflight.draft.mode,vehicle:current.preflight.draft.vehicle,brakes:current.preflight.draft.garage.brakes,failedAndPassed:true,egress:0});
    if(size.width===390){
      await page.click('#racePreflightClose');await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.scenario({outcome:'pass',achievement:'season',replay:'both',context:'final'}));await page.click('#rRaceGarage');
      current=await enter(page,'touch');if(current.preflight.phase!==0||current.preflight.draft.mode!=='hill'||current.preflight.raceState!=='grid')fail('Final championship exit bypassed venue stage',current);
      await page.click('#racePreflightClose');if(await page.locator('#racePhoneToolsToggle').isVisible())await page.click('#racePhoneToolsToggle');await page.click('#orientationDetailToggle');await page.click('#modeHomeButton');
      await page.click('#homeProfileButton');await page.click('#profileCreate');await page.fill('#profileNickname','QA Second');await page.click('#profileFormSave');await page.click('#profileClose');
      const second=await enter(page,'touch');if(second.profile===original||second.preflight.draft.mode==='hill'||second.preflight.draft.vehicle==='kestrel'||second.preflight.draft.garage.brakes==='sport')fail('Profile switch leaked first player selections',second);
      await page.click('#racePreflightClose');
      await page.reload({waitUntil:'domcontentloaded'});if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
      await page.click('#homeProfileButton');await page.locator(`#profileList [data-profile-id="${original}"]`).click();await page.click('#profileClose');
      const restored=await enter(page,'touch');if(restored.profile!==original||restored.preflight.draft.mode!=='hill'||restored.preflight.draft.vehicle!=='kestrel'||restored.preflight.draft.garage.brakes!=='sport')fail('Reload/profile restore lost original defaults',restored);
      report.cases.push({label,championshipExit:true,profileIsolation:true,reload:true,egress:0});
      await page.click('#racePreflightClose');
      if(await page.locator('#racePhoneToolsToggle').isVisible())await page.click('#racePhoneToolsToggle');
      await page.click('#orientationDetailToggle');
      await page.selectOption('#raceMultiplayerOpponent',second.profile);
      await page.click('#raceMultiplayerStart');
      if(!await page.evaluate(()=>window.__KICKLAB_RACE_MULTIPLAYER_QA__.start()))fail('Local match could not start',await state(page));
      if(!await page.evaluate(()=>window.__KICKLAB_RACE_MULTIPLAYER_QA__.finish(false)))fail('Local match could not finish',await state(page));
      await page.locator('#results').waitFor({state:'visible'});
      await page.click('#rRaceGarage');
      const matchReturn=await enter(page,'touch'),match=await page.evaluate(()=>window.__KICKLAB_RACE_MULTIPLAYER_QA__.state());
      if(matchReturn.preflight.phase!==0||match.phase!=='setup'||matchReturn.preflight.draft.mode!=='hill')fail('Local match exit did not restore solo venue choice',{matchReturn,match});
      report.cases.push({label,localMatchExit:true,egress:0});
    }
  }catch(error){report.errors.push(`${label}: ${error.stack||String(error)}`);}
  await context.close();
}
await browser.close();
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({revision,cases:report.cases,errors:report.errors,external:report.external,out},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
