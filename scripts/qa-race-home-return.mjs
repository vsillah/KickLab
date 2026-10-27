import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'https://vsillah.github.io/KickLab/';
const out=resolve(process.argv[3]||'qa-artifacts/race-home-return-public');
const revision=process.env.KICKLAB_QA_HEAD;
const origin=new URL(base);
if(!/^[0-9a-f]{40}$/.test(revision||''))throw Error('KICKLAB_QA_HEAD must be the full deployed product commit.');
const publicPages=origin.protocol==='https:'&&origin.hostname==='vsillah.github.io'&&/^\/KickLab\/(?:index\.html)?$/.test(origin.pathname);
const localPages=origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)&&/^\/pages\/index\.html$/.test(origin.pathname);
if(!publicPages&&!localPages)throw Error('Smoke requires GitHub Pages or its trusted localhost Pages artifact.');
mkdirSync(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const local=readFileSync('dist/pages/index.html'),response=await fetch(new URL(`?rev=${revision}`,base));
if(!response.ok)throw Error(`Public HTML returned ${response.status}`);
const deployed=Buffer.from(await response.arrayBuffer());
if(sha(local)!==sha(deployed))throw Error(`Incorrect deployed artifact binding: local ${sha(local)}, public ${sha(deployed)}`);
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const report={revision,origin:origin.origin+origin.pathname,artifactSha256:sha(deployed),cases:[],errors:[],external:[],httpErrors:[]};
const sizes=[{width:390,height:844,input:'touch',motion:'reduce',gfx:'2d'},{width:768,height:1024,input:'keyboard',motion:'reduce',gfx:'3d'},{width:1113,height:834,input:'pointer',motion:'no-preference',gfx:'3d'},{width:1440,height:900,input:'pointer',motion:'no-preference',gfx:'3d'}];
const fail=(message,data)=>{throw Error(`${message}: ${JSON.stringify(data)}`);};
const url=()=>{const target=new URL(base);target.searchParams.set('rev',revision);return target.toString();};
const read=page=>page.evaluate(()=>{
  const dialog=document.querySelector('#racePreflight'),next=document.querySelector('#racePreflightNext'),box=next.getBoundingClientRect(),top=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2),store=JSON.parse(localStorage.getItem('kicklab.profiles.v1')||'null'),active=store?.profiles?.find(profile=>profile.id===store.activeId),audit=window.__KICKLAB_RACE_3D__;
  return{url:location.href,home:!document.querySelector('#modeHome').hidden,results:!document.querySelector('#results').hidden,pace:!document.querySelector('#gamePacingOverlay').hidden,preflight:!dialog.hidden,phase:[...document.querySelectorAll('#racePreflightSteps button')].findIndex(button=>button.getAttribute('aria-current')==='step'),title:document.querySelector('#racePreflightTitle').textContent,mode:document.querySelector('[data-preflight-mode][aria-pressed="true"]')?.dataset.preflightMode||null,vehicle:document.querySelector('[data-preflight-vehicle][aria-pressed="true"]')?.dataset.preflightVehicle||null,brakes:document.querySelector('[data-preflight-part="brakes"][aria-pressed="true"]')?.dataset.preflightValue||null,grid:document.querySelector('.race-preflight-grid-brief')?.innerText||'',control:document.querySelector('[data-preflight-control][aria-pressed="true"]')?.dataset.preflightControl||null,steer:document.querySelector('#racePreflightSteer')?.textContent||'',nextDisabled:next.disabled,backDisabled:document.querySelector('#racePreflightBack').disabled,nextHit:!!top?.closest('#racePreflightNext'),overflow:document.documentElement.scrollWidth-innerWidth,flags:new URLSearchParams(location.search).get('racePreflight'),preflightFlag:document.documentElement.dataset.racePreflight||null,arriving:document.documentElement.dataset.racePreflightArriving||null,profileId:store?.activeId,progress:active?.progress||{},renderer:audit?{status:audit.status,vehicle:audit.vehicle,canvas:audit.canvas}:null,runReadout:document.querySelector('#challengeHudSummary .hud-summary-cue')?.textContent||'',storageKeys:Object.keys(localStorage).sort(),qaHook:typeof window.__KICKLAB_RACE_PREFLIGHT_QA__};
});
async function prepare(page,gfx){
  await page.addInitScript(value=>{if(!sessionStorage.getItem('kicklab.public.qa.init')){localStorage.setItem('impactlab.v1',JSON.stringify({gfx:value}));sessionStorage.setItem('kicklab.public.qa.init','1');}},gfx);
  page.on('pageerror',error=>report.errors.push(`browser: ${error.message}`));
  page.on('response',response=>{if(response.status()>=400)report.httpErrors.push(`${response.status()} ${response.url()}`);});
  await page.route('**/*',route=>{const requestUrl=route.request().url();if(requestUrl.startsWith(origin.origin+'/')||requestUrl.startsWith('data:')||requestUrl.startsWith('blob:'))route.continue();else{report.external.push(requestUrl);route.abort();}});
  page.setDefaultTimeout(12000);
  await page.goto(url(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  const initial=await read(page);
  if(!initial.home||initial.preflight||initial.preflightFlag||publicPages&&initial.qaHook!=='undefined'||initial.flags)fail('Unflagged load was not default off',initial);
}
async function enter(page,input='pointer'){
  const card=page.locator('#lab-tab-race');
  if(input==='touch')await card.tap();else if(input==='keyboard'){await card.focus();await page.keyboard.press('Enter');}else await card.click();
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:30000});
  const s=await read(page);
  if(s.flags!=='prototype'||s.preflightFlag!=='prototype'||s.home||s.results||s.pace||s.arriving==='true'||s.phase!==0||s.title!=='Choose your location'||s.nextDisabled||s.backDisabled||!s.nextHit||s.overflow>1||publicPages&&s.qaHook!=='undefined')fail('Race card did not open a clean venue stage with enabled navigation',s);
  return s;
}
async function setup(page,{mode='drag',vehicle='kestrel',brakes='sport'}={}){
  const before=(await read(page)).progress;
  await page.locator(`[data-preflight-mode="${mode}"]`).click();await page.click('#racePreflightNext');
  let s=await read(page);if(s.phase!==1||s.title!=='Choose your vehicle')fail('Vehicle phase missing',s);
  await page.locator(`[data-preflight-vehicle="${vehicle}"]`).click();await page.click('#racePreflightNext');
  s=await read(page);if(s.phase!==2||s.title!=='Tune in the Garage')fail('Garage phase missing',s);
  await page.locator(`[data-preflight-part="brakes"][data-preflight-value="${brakes}"]`).click();
  await page.click('#racePreflightBack');s=await read(page);
  if(s.phase!==1||s.vehicle!==vehicle)fail('Back navigation lost vehicle',s);
  await page.click('#racePreflightNext');s=await read(page);
  if(s.brakes!==brakes)fail('Back navigation lost Garage draft',s);
  await page.click('#racePreflightNext');s=await read(page);
  if(s.phase!==3||s.title!=='Take your place on the grid'||!s.grid.includes('Kestrel')||!s.grid.includes('Sport')||JSON.stringify(s.progress)!==JSON.stringify(before))fail('Grid summary or pre-commit storage failed',s);
  return s;
}
async function start(page,gfx){
  await page.click('#racePreflightNext');
  const arriving=await read(page);
  if(!arriving.preflight||arriving.arriving!=='true'||!arriving.nextDisabled||!arriving.backDisabled)fail('Starting-grid arrival controls were enabled prematurely',arriving);
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:15000});
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  await page.waitForFunction(()=>/\d+ km\/h/.test(document.querySelector('#challengeHudSummary .hud-summary-cue')?.textContent||''),null,{timeout:35000});
  const s=await read(page);
  if(s.preflight||s.results||s.progress.raceModes?.selected!=='drag'||s.progress.raceGarage?.brakes!=='sport')fail('Starting line did not commit selected setup',s);
  if(gfx==='3d'&&!(s.renderer?.status==='rendering'&&s.renderer.vehicle&&s.renderer.canvas))fail('3D car and track did not render',s);
  if(gfx==='2d'&&s.renderer?.canvas)fail('Canvas fallback did not stay active',s);
  return s;
}
async function waitSpeed(page,minimum){await page.waitForFunction(limit=>{const text=document.querySelector('#challengeHudSummary .hud-summary-cue')?.textContent||'',match=text.match(/(\d+) km\/h/);return match&&Number(match[1])>=limit;},minimum,{timeout:15000});}
async function driveDrag(page,pass,expectedTitle=pass?'DRAG SPRINT COMPLETE':'RETRY DRAG SPRINT'){
  await page.keyboard.down('KeyW');
  try{if(pass)for(const limit of [55,85,93]){await waitSpeed(page,limit);await page.locator('#raceTelemetryShift').click();}await page.locator('#results').waitFor({state:'visible',timeout:35000});}
  finally{await page.keyboard.up('KeyW');}
  const title=await page.locator('#rTitle').innerText();
  if(!title.includes(expectedTitle))fail('Real driving produced the wrong result',{title,expectedTitle,s:await read(page)});
  if(!await page.locator('#rRaceGarage').isVisible())fail('Save & Exit was unavailable',{title});
  return title;
}
async function saveAndReturn(page,input){
  const before=(await read(page)).progress;
  await page.click('#rRaceGarage');
  if(!await page.locator('#modeHome').isVisible())fail('Save & Exit did not reach home',await read(page));
  const after=(await read(page)).progress;
  if(JSON.stringify(before)!==JSON.stringify(after))fail('Save & Exit changed earned progress a second time',{before,after});
  const s=await enter(page,input);if(s.mode!=='drag')fail('Return lost saved route',s);
  await page.click('#racePreflightNext');const car=await read(page);
  await page.click('#racePreflightNext');const garage=await read(page);
  await page.click('#racePreflightNext');const grid=await read(page);
  await page.click('#racePreflightBack');await page.click('#racePreflightBack');await page.click('#racePreflightBack');
  if(car.vehicle!=='kestrel'||garage.brakes!=='sport'||grid.phase!==3||grid.control!=='classic'||grid.steer!=='You steer'||!grid.grid.includes('Kestrel')||!grid.grid.includes('Sport'))fail('Return lost saved car, Garage or controls',{car,garage,grid});
  return s;
}
async function phoneExtras(page,original){
  await page.click('#racePreflightClose');
  if(await page.locator('#racePhoneToolsToggle').isVisible())await page.click('#racePhoneToolsToggle');
  await page.click('#orientationDetailToggle');await page.click('#modeHomeButton');
  await page.click('#homeProfileButton');await page.click('#profileCreate');await page.fill('#profileNickname','QA Second');await page.click('#profileFormSave');await page.click('#profileClose');
  const second=await enter(page,'touch');
  if(second.profileId===original||second.progress.raceGarage?.brakes==='sport')fail('Profile switch leaked saved Garage',second);
  await page.click('#racePreflightClose');await page.reload({waitUntil:'domcontentloaded'});
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#homeProfileButton');await page.locator(`#profileList [data-profile-id="${original}"]`).click();await page.click('#profileClose');
  const restored=await enter(page,'touch');if(restored.profileId!==original||restored.mode!=='drag'||restored.progress.raceGarage?.brakes!=='sport')fail('Reload/profile restore lost saved setup',restored);
  await page.click('#racePreflightClose');
  if(await page.locator('#racePhoneToolsToggle').isVisible())await page.click('#racePhoneToolsToggle');
  await page.click('#orientationDetailToggle');
  await page.selectOption('#raceMultiplayerOpponent',second.profileId);
  const soloBefore=(await read(page)).progress;
  await page.click('#raceMultiplayerStart');
  await page.locator('#racePreflight').waitFor({state:'visible'});
  const matchTitle=await page.locator('#racePreflightTitle').innerText();
  if(!matchTitle.includes('Racer 1 · Choose your location'))fail('Local match did not reach Racer 1 preparation',{matchTitle});
  await page.click('#racePreflightClose');
  if(await page.locator('[data-close-detail="orientation"]').isVisible())await page.locator('[data-close-detail="orientation"]').click();
  const matchReturn=await read(page),soloAfter=matchReturn.progress;
  if(!await page.locator('#raceMultiplayerTitle').innerText().then(text=>text.includes('setup'))||matchReturn.profileId!==original||JSON.stringify(soloBefore.raceModes?.best)!==JSON.stringify(soloAfter.raceModes?.best)||soloBefore.xp!==soloAfter.xp)fail('Local match abandon retained match or changed solo rewards',{matchReturn,soloBefore,matchTitle});
  return{secondPlayer:second.profileId,matchTitle};
}
for(const size of sizes.filter(item=>!process.env.KICKLAB_QA_SEASON_ONLY&&(!process.env.KICKLAB_QA_WIDTH||String(item.width)===process.env.KICKLAB_QA_WIDTH))){
  const label=`${size.width}x${size.height}/${size.input}/${size.motion}/${size.gfx}`;
  console.log(`Starting ${label}`);
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,hasTouch:size.input==='touch',reducedMotion:size.motion});
  const page=await context.newPage();
  try{
    await prepare(page,size.gfx);
    const initial=await enter(page,size.input),original=initial.profileId;
    if(size.width===390||size.width===1440)await page.locator('#racePreflight').screenshot({path:join(out,`${size.width}-venue.png`)});
    await setup(page);if(size.width===390||size.width===1440)await page.locator('#racePreflight').screenshot({path:join(out,`${size.width}-grid.png`)});
    await start(page,size.gfx);await driveDrag(page,true);await saveAndReturn(page,size.input);
    await page.click('#racePreflightNext');await page.click('#racePreflightNext');await page.click('#racePreflightNext');
    await start(page,size.gfx);await driveDrag(page,false);await saveAndReturn(page,size.input);
    report.cases.push({label,passedAndFailed:true,saveAndExit:true,preservedRouteCarGarage:true,defaultOff:true,renderer:size.gfx,profile:original});
    if(size.width===390){const extra=await phoneExtras(page,original);report.cases.push({label,profileIsolation:true,reload:true,localMatchExit:true,...extra});}
  }catch(error){report.errors.push(`${label}: ${error.stack||String(error)}`);}
  await context.close();
}
if(!process.env.KICKLAB_QA_WIDTH||process.env.KICKLAB_QA_SEASON_ONLY){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
  try{
    await prepare(page,'2d');await enter(page,'touch');await page.click('#racePreflightClose');
    await page.click('#racePhoneToolsToggle');await page.click('#orientationDetailToggle');await page.click('#raceChampionshipToggle');
    await page.locator('[data-close-detail="orientation"]').click();
    await page.locator('#racePreflight').waitFor({state:'visible'});
    const season=await read(page);if(season.mode!=='drag'||season.nextDisabled||season.backDisabled)fail('Championship opening event blocked preflight',season);
    await page.click('#racePreflightNext');
    const vehicle=await read(page);if(vehicle.phase!==1||vehicle.nextDisabled||vehicle.backDisabled)fail('Championship Vehicle navigation failed',vehicle);
    await page.click('#racePreflightBack');await page.click('#racePreflightClose');
    const closed=await read(page);if(closed.preflight)fail('Championship preflight did not close',closed);
    report.cases.push({label:'championship-opening-event/390x844',preflightNavigation:true,close:true});
  }catch(error){report.errors.push(`championship: ${error.stack||String(error)}`);}
  await context.close();
}
await browser.close();
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({revision,cases:report.cases,errors:report.errors,external:report.external,httpErrors:report.httpErrors,out},null,2));
if(report.errors.length||report.external.length||report.httpErrors.length)process.exitCode=1;
