import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const productCommit='17ebe450d4bcbb7f178f1fd1c645bbe8a5da8811';
const origin='https://vsillah.github.io/KickLab/';
const out=resolve(process.argv[2]||'qa-artifacts/race-live-track-hud-public');
const hash=value=>createHash('sha256').update(value).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const changed=new Set([...git('diff','--name-only',productCommit,'HEAD').split('\n'),...git('diff','--name-only').split('\n')].filter(Boolean));
if([...changed].some(file=>file!=='scripts/qa-race-live-track-hud.mjs'))throw Error(`Scope expanded: ${[...changed].join(', ')}`);
if(!existsSync('dist/pages/index.html'))throw Error('Run npm run check at the exact product commit before public smoke.');
const response=await fetch(`${origin}?rev=${productCommit}`,{cache:'no-store'});
if(!response.ok)throw Error(`Public Pages HTML: ${response.status}`);
const binding={productCommit,local:hash(readFileSync('dist/pages/index.html')),public:hash(Buffer.from(await response.arrayBuffer()))};
if(binding.local!==binding.public)throw Error(`Incorrect deployed product binding: ${JSON.stringify(binding)}`);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const report={scriptHead:git('rev-parse','HEAD'),binding,cases:[],errors:[],egress:[]};
const assert=(ok,message,detail)=>{if(!ok)throw Error(`${message}: ${JSON.stringify(detail)}`);};
async function sample(page){return page.evaluate(()=>{
  const $=id=>document.querySelector(id),rect=id=>$(id)?.getBoundingClientRect().toJSON(),nav=$('#raceNavigation');
  return{visible:!!nav&&!nav.hidden,stage:nav?.dataset.stage||'',turn:nav?.dataset.turn||'',label:nav?.getAttribute('aria-label')||'',mapLabel:$('#raceNavigationMap')?.getAttribute('aria-label')||'',progress:$('#raceNavigationProgress')?.textContent||'',lap:$('#raceNavigationProgressLabel')?.textContent||'',car:$('#raceNavigationCar')?.getAttribute('transform')||'',paths:Object.fromEntries(['Road','Travel','Brake','Turn','Apex','Exit','Finish'].map(name=>[name,{d:$(`#raceNavigation${name}`)?.getAttribute('d')||'',hidden:!!$(`#raceNavigation${name}`)?.hidden}])),navRect:rect('#raceNavigation'),mapRect:rect('#raceNavigationMap'),stageRect:rect('.stage'),progressRect:rect('#racePhoneProgress'),noticeRect:$('#raceCoachNotice')?.hidden?null:rect('#raceCoachNotice'),historyCount:Number($('#raceCoachHistoryCount')?.textContent)||0,history:$('#raceCoachHistoryList')?.textContent||'',vehicle:$('#raceCoachSetupVehicleName')?.textContent||'',control:$('#analogControlsButton')?.getAttribute('aria-pressed')==='true'?'analog':$('#simulatorControlsButton')?.getAttribute('aria-pressed')==='true'?'simulator':'classic',webgl:!!$('#race3')&&!$('#race3').hidden,canvas:$('.stage canvas')?.getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth-innerWidth,storage:Object.keys(localStorage).sort(),qaHook:typeof window.__KICKLAB_RACE_ENGINE_QA__};
});}
function check(state,mode){
  assert(state.visible&&state.paths.Road.d.startsWith('M')&&state.paths.Finish.d.startsWith('M'),'Route absent',state);
  assert(state.overflow<=1&&state.navRect.right<=state.stageRect.right+1&&state.navRect.top>=state.progressRect.bottom+4&&state.navRect.width<=160&&state.navRect.height<=110,'Map layout',state);
  assert(state.mapRect.width>=70&&state.mapRect.height>=40&&/translate\([\d.-]+ [\d.-]+\) rotate\([\d.-]+\)/.test(state.car),'Car position or heading',state);
  assert(/\d+%/.test(state.progress)&&state.mapLabel.includes('live vehicle heading')&&state.historyCount>=1,'Map semantics or Coach',state);
  for(const name of ['Brake','Turn','Apex','Exit'])assert(mode==='drag'?state.paths[name].hidden:!state.paths[name].hidden&&state.paths[name].d.startsWith('M'),`${name} marker`,state);
  assert(state.qaHook==='undefined'&&state.storage.every(key=>['impactlab.v1','impactlab.nick','kicklab.profiles.v1'].includes(key)),'Public hook or storage',state);
}
async function runCase({width,height,flag=true,mode='hill',vehicle='cobalt',control='classic',canvas=false,reduced=false,drive=false}){
  const name=`${flag?'flag':'default'}-${mode}-${vehicle}-${control}-${width}${canvas?'-canvas':''}${reduced?'-reduced':''}`;
  const started=Date.now();
  console.log(`START ${name}`);
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
  await context.addInitScript(({gfx,mastery})=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx,raceMastery:{version:1,cleared:mastery?['drag','drift','circuit']:[]}}));localStorage.setItem('impactlab.nick','Smoke Driver');},{gfx:canvas?'2d':'3d',mastery:['vesper','sable'].includes(vehicle)});
  const page=await context.newPage();let requests=0;
  page.on('pageerror',error=>report.errors.push(`${name}: page error: ${error.message}`));
  page.on('requestfailed',request=>{if(request.failure()?.errorText!=='net::ERR_ABORTED')report.errors.push(`${name}: request failed: ${request.url()} ${request.failure()?.errorText}`);});
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin)||url.startsWith('data:')||url.startsWith('blob:')){requests++;return route.continue();}report.egress.push(`${name}: ${url}`);return route.abort();});
  try{
    const url=new URL(origin);url.searchParams.set('rev',productCommit);
    if(flag)for(const key of ['raceExpansion','raceCornerTrace','raceTelemetry','racePreflight','raceSimulator'])url.searchParams.set(key,'prototype');
    await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:30000});
    assert(new URL(page.url()).origin==='https://vsillah.github.io','Origin changed',page.url());
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-race').click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    if(!flag){const state=await sample(page);assert(!state.visible&&!await page.locator('#racePreflight').isVisible()&&state.qaHook==='undefined'&&state.overflow<=1,'Default-off state',state);report.cases.push({name,url:url.toString(),requests});return;}
    await page.locator('#racePreflight').waitFor({state:'visible',timeout:15000});
    await page.locator(`[data-preflight-mode="${mode}"]`).click();
    assert(await page.locator(`[data-preflight-mode="${mode}"]`).getAttribute('aria-pressed')==='true','Mode selection',mode);
    await page.locator('#racePreflightNext').click();
    const car=page.locator(`[data-preflight-vehicle="${vehicle}"]`);
    assert(await car.getAttribute('aria-disabled')==='false','Vehicle locked',vehicle);
    await car.click();assert(await car.getAttribute('aria-pressed')==='true','Vehicle selection',vehicle);
    await page.locator('#racePreflightNext').click();await page.locator('#racePreflightNext').click();
    if(control!=='classic')await page.locator(`[data-preflight-control="${control}"]`).click();
    if((await page.locator('#racePreflightSteer').textContent())?.trim()==='You steer')await page.locator('#racePreflightSteer').click();
    await page.locator('#racePreflightNext').click();
    await page.locator('#racePreflight').waitFor({state:'hidden',timeout:12000});
    if(!canvas){await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:15000});await page.locator('.race-orbit-panel button').click();}
    // Start heat commits the preflight and runs the real orbit and lights.
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:15000});
    await page.locator('#raceNavigation').waitFor({state:'visible',timeout:15000});
    const first=await sample(page);check(first,mode);
    assert(first.control===control,'Controller selection',first.control);
    assert(first.vehicle.toLowerCase().includes(vehicle==='vesper'?'vesper':vehicle==='sable'?'sable':vehicle),'Vehicle selection in cockpit',first.vehicle);
    assert(canvas?!first.webgl:first.webgl,'Canvas or WebGL setting',first.webgl);
    if(['circuit','endurance'].includes(mode)){
      const points=[...first.paths.Road.d.matchAll(/[-\d.]+ [-\d.]+/g)].map(match=>match[0].split(' ').map(Number));
      assert(points.length>30&&Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<12,'Closed route wrapping',points.slice(0,2).concat(points.slice(-2)));
    }
    const imageA=hash(await page.locator('.stage').screenshot({path:join(out,`${name}-start.png`)}));
    const observations=[];
    if(drive){await page.locator('.stage').focus();await page.keyboard.down('Space');for(let i=0;i<14;i++){await page.waitForTimeout(1200);const state=await sample(page);if(!state.visible)break;observations.push({stage:state.stage,turn:state.turn,progress:state.progress,lap:state.lap,car:state.car,historyCount:state.historyCount,label:state.label});}await page.keyboard.up('Space');assert(observations.some(state=>state.car!==first.car&&state.progress!==first.progress),'Real input did not move car and progress',observations);assert(observations.some(state=>state.historyCount>first.historyCount),'Coach did not transition with route',observations);if(mode==='hill')assert(new Set(observations.map(state=>state.stage)).size>=2,'Corner timing did not transition',observations);if(mode==='circuit')assert(observations.some(state=>state.lap.startsWith('LAP')),'Lap label absent',observations);}
    const last=await sample(page),imageB=hash(await page.locator('.stage').screenshot({path:join(out,`${name}-end.png`)}));
    if(drive)assert(imageA!==imageB,'Rendered stage static',name);if(last.visible)check(last,mode);
    if(name==='flag-hill-cobalt-classic-390'){await page.locator('.stage').focus();await page.keyboard.press('p');assert(await page.locator('#gamePacingOverlay').isVisible(),'Pause absent');await page.locator('#gamePacingResume').click();assert(!await page.locator('#gamePacingOverlay').isVisible(),'Pause recovery');const beforeHide=(await sample(page)).progress;await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForTimeout(600);assert((await sample(page)).progress===beforeHide,'Lifecycle retained route motion');}
    const durationMs=Date.now()-started;assert(durationMs<45000,'Performance budget exceeded',durationMs);
    report.cases.push({name,url:url.toString(),first:{stage:first.stage,progress:first.progress,car:first.car,historyCount:first.historyCount,canvas:first.canvas},last:{stage:last.stage,progress:last.progress,car:last.car,historyCount:last.historyCount},observations,imageA,imageB,requests,durationMs});
  }catch(error){const debug=await page.evaluate(()=>({preflight:document.querySelector('#racePreflight')?.hidden,orbit:document.querySelector('.race-orbit-panel')?.hidden,start:document.querySelector('#raceCoachSetupStart')?.hidden,nav:document.querySelector('#raceNavigation')?.hidden,overlay:document.querySelector('#gamePacingOverlay')?.hidden,stage:document.querySelector('.stage')?.className,body:document.body.innerText.slice(-800)})).catch(()=>null);report.errors.push(`${name}: ${error.stack||error}; debug=${JSON.stringify(debug)}`);console.error(`FAIL ${name}: ${error.message}; debug=${JSON.stringify(debug)}`);}finally{await context.close();console.log(`END ${name}`);}
}
try{
  if(process.argv.includes('--one'))await runCase({width:390,height:844,drive:true,mode:process.argv.includes('--circuit')?'circuit':'hill'});
  else for(const [width,height] of [[360,780],[390,844],[768,1024],[1113,988],[1440,900]]){await runCase({width,height,flag:false});await runCase({width,height,drive:width===390});}
  if(!process.argv.includes('--one'))for(const mode of ['drag','drift','circuit','endurance'])await runCase({width:390,height:844,mode,drive:mode==='circuit'});
  if(!process.argv.includes('--one'))for(const vehicle of ['kestrel','aegis','vesper','sable'])await runCase({width:390,height:844,vehicle});
  if(!process.argv.includes('--one'))for(const control of ['analog','simulator'])await runCase({width:390,height:844,control});
  if(!process.argv.includes('--one')){await runCase({width:390,height:844,canvas:true});await runCase({width:390,height:844,reduced:true});}
}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({binding,cases:report.cases.map(item=>item.name),errors:report.errors,egress:report.egress}));
if(report.errors.length||report.egress.length)process.exitCode=1;
