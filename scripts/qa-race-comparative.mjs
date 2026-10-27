import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'https://vsillah.github.io/KickLab/';
const output=resolve(process.argv[3]||'qa-artifacts/race-comparative');
const head=process.env.KICKLAB_QA_HEAD||'137fa83ada5a258f43ab39e99a9b1403adbfd1db';
const only=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
const quick=process.argv.includes('--quick');
const video=process.argv.includes('--video');
const origin=new URL(base);
if(origin.origin!=='https://vsillah.github.io'||origin.pathname!=='/KickLab/')throw Error('Comparative smoke requires the trusted public GitHub Pages origin');
mkdirSync(output,{recursive:true});
const report={head,base,artifactSha256:null,cases:[],errors:[],external:[],navigation:[]};
const profiles={version:1,activeId:'seat-a',legacyProfileId:'seat-a',profiles:[
  {id:'seat-a',nickname:'Racer A',avatar:'rocket',color:'sky',progress:{xp:240,lap:17,stats:{plays:{race:2}},badges:{}}},
  {id:'seat-b',nickname:'Racer B',avatar:'wiz',color:'mint',progress:{xp:125,lap:21,stats:{plays:{race:1}},badges:{}}}
]};
const assert=(condition,label)=>{if(!condition)throw Error(label)};
const visible=async(page,selector)=>page.locator(selector).first().isVisible();
const text=async(page,selector)=>(await page.locator(selector).innerText()).trim();
const storage=page=>page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.map(({id,progress})=>({id,progress})).sort((a,b)=>a.id.localeCompare(b.id))));
const publicUrl=(flags=true)=>{const url=new URL(base);url.searchParams.set('rev',head);if(flags)for(const key of ['raceExpansion','raceMultiplayer','racePreflight','raceSimulator'])url.searchParams.set(key,'prototype');return url.toString()};

// Bind the browser run to the exact deployed Pages artifact before testing behavior.
const localArtifact=readFileSync(resolve('dist/pages/index.html'));
const remoteResponse=await fetch(publicUrl(false),{cache:'no-store'});
assert(remoteResponse.ok,`Public Pages returned HTTP ${remoteResponse.status}`);
const remoteArtifact=Buffer.from(await remoteResponse.arrayBuffer());
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
report.artifactSha256=sha(localArtifact);
assert(sha(remoteArtifact)===report.artifactSha256,'Deployed Pages HTML differs from this exact-head dist/pages/index.html');
const browser=await chromium.launch({headless:true});

async function newPage(name,width,height,{canvas=false,reduced=true,record=false}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',...(record?{recordVideo:{dir:join(output,name),size:{width,height}}}:{})});
  await context.addInitScript(seed=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify(seed)),profiles);
  if(canvas)await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'||type==='webgl2'?null:original.call(this,type,...args)}});
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror',error=>report.errors.push(`${name}: page error: ${error.message}`));
  page.on('requestfailed',request=>{if(request.failure()?.errorText!=='net::ERR_ABORTED')report.errors.push(`${name}: request failed: ${request.url()} ${request.failure()?.errorText}`)});
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith('data:')||url.startsWith('blob:')||new URL(url).origin===origin.origin&&new URL(url).pathname.startsWith('/KickLab/'))route.continue();else{report.external.push(`${name}: ${url}`);route.abort()}});
  return{context,page};
}
async function enterRace(page,flags=true){
  await page.goto(publicUrl(flags),{waitUntil:'domcontentloaded'});
  assert(await page.evaluate(()=>globalThis.__KICKLAB_RACE_MULTIPLAYER_QA__===undefined),'Localhost QA hook leaked to public origin');
  if(await visible(page,'#profileFormSave'))await page.click('#profileFormSave');
  if(await visible(page,'#profileClose'))await page.click('#profileClose');
  await page.click('#lab-tab-race');
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});
  if(await visible(page,'.race-orbit-panel button'))await page.locator('.race-orbit-panel button').first().click({timeout:1500}).catch(()=>{});
  await page.waitForTimeout(900);
  if(await visible(page,'#racePreflight'))await page.click('#racePreflightClose');
  await page.click('#racePhoneProgress');
  const timing=await page.evaluate(()=>({domComplete:Math.round(performance.getEntriesByType('navigation')[0]?.domComplete||0),resourceCount:performance.getEntriesByType('resource').length}));
  assert(timing.domComplete>0&&timing.domComplete<30000,'Public page navigation exceeded 30 seconds');
  report.navigation.push(timing);
}
async function assertCopy(page,kind,name,stage,expected){
  const body=await page.locator('body').innerText();
  const accessible=stage==='matchup'&&name.includes('1280')?await page.locator('body').ariaSnapshot():'';
  assert(!/\bSeat\s+[AB]\b/i.test(body+'\n'+accessible),`${name} ${stage}: legacy Seat label`);
  if(kind==='computer')assert(!/\bRacer\s+2\b/i.test(body+'\n'+accessible),`${name} ${stage}: Computer called Racer 2`);
  if(expected)assert(body.toLowerCase().includes(expected.toLowerCase()),`${name} ${stage}: missing ${expected}`);
}
async function preflight(page,{mode,car,part,value,control,steer,first=false,name,kind}){
  await page.locator('#racePreflight').waitFor({state:'visible'});
  await assertCopy(page,kind,name,'preflight',first?'Racer 1':kind==='computer'?'Computer':'Racer 2');
  if(first&&mode!=='drag')await page.click(`[data-preflight-mode="${mode}"]`);
  if(first)await page.click('#racePreflightNext');
  await page.click(`[data-preflight-vehicle="${car}"]`);
  await page.click('#racePreflightNext');
  await page.click(`[data-preflight-part="${part}"][data-preflight-value="${value}"]`);
  await page.click('#racePreflightNext');
  if(control)await page.click(`[data-preflight-control="${control}"]`);
  if(steer&&await visible(page,'#racePreflightSteer')&&!(await text(page,'#racePreflightSteer')).toLowerCase().includes(steer==='auto'?'autopilot':'you steer'))await page.click('#racePreflightSteer');
  await page.click('#racePreflightNext');
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:15000});
}
async function switchProfile(page,id,button){
  await page.click(button);
  await page.click(`[data-profile-id="${id}"]`);
  await page.click('#profileClose');
  await page.click('#racePhoneProgress');
}
async function openControls(page){if(!await visible(page,'#raceMultiplayerTitle'))await page.click('#racePhoneProgress')}
async function closeResult(page){if(await visible(page,'#results'))await page.click('#rNext');await openControls(page)}
async function startHeat(page){
  if(await visible(page,'#orientationDetail'))await page.click('[data-close-detail="orientation"]');
  await page.waitForFunction(()=>['.race-orbit-panel button','#raceCoachSetupStart','#simStart'].some(selector=>{const e=document.querySelector(selector);return e&&!e.hidden&&e.getClientRects().length}),null,{timeout:20000});
  if(await visible(page,'.race-orbit-panel button'))await page.locator('.race-orbit-panel button').first().click({timeout:1500}).catch(()=>{});
  await page.waitForFunction(()=>['#raceCoachSetupStart','#simStart'].some(selector=>{const e=document.querySelector(selector);return e&&!e.hidden&&e.getClientRects().length}),null,{timeout:20000});
  await page.click(await visible(page,'#raceCoachSetupStart')?'#raceCoachSetupStart':'#simStart');
  await page.waitForFunction(()=>document.querySelector('#challengeHudSummary .hud-summary-cue')?.textContent?.includes('km/h')||!document.querySelector('#results')?.hidden,null,{timeout:20000});
}
async function driveToResult(page,mode,name){
  await startHeat(page);
  await page.keyboard.down('KeyW');
  let shifts=0,observed=0,ghost=false,nos=false;
  const deadline=Date.now()+(mode==='endurance'?175000:mode==='circuit'?115000:mode==='hill'?45000:45000);
  try{
    while(Date.now()<deadline){
      if(await visible(page,'#results'))break;
      const cue=await text(page,'#challengeHudSummary .hud-summary-cue');
      const speed=Number(cue.match(/(\d+) km\/h/)?.[1]||0);
      observed=Math.max(observed,speed);
      if(mode==='drag'&&shifts<3&&speed>=[35,57,77][shifts]&&await page.locator('#raceTelemetryShift').isEnabled()){await page.click('#raceTelemetryShift');shifts++}
      if(mode==='drag'&&!nos&&speed>=68){await page.keyboard.press('KeyN');nos=true}
      if(await visible(page,'#raceMultiplayerGhost'))ghost=true;
      await page.waitForTimeout(180);
    }
  }finally{await page.keyboard.up('KeyW')}
  assert(await visible(page,'#results'),`${name}: real ${mode} run did not reach a result within the mode deadline`);
  const title=await text(page,'#rTitle'),sub=await text(page,'#rSub'),hint=await text(page,'#rHint');
  assert(/COMPLETE|QUALIFY|WINS|TIED/.test(title),`${name}: unexpected real result ${title}`);
  return{title,sub,hint,peakKmh:observed,shifts,nos,ghost};
}
async function driveValidDrag(page,name,maxAttempts=4){
  const attempts=[];
  for(let i=0;i<maxAttempts;i++){
    const result=await driveToResult(page,'drag',name);
    attempts.push(result);
    await closeResult(page);
    if(result.title.includes('COMPLETE')||result.title.includes('WINS')||result.title.includes('TIED'))return attempts;
    assert(await visible(page,'#raceMultiplayerRetry'),`${name}: failed run has no visible retry`);
    await page.click('#raceMultiplayerRetry');
    assert((await text(page,'#raceMultiplayerContract')).includes('Frozen:'),`${name}: retry lost frozen contract`);
  }
  throw Error(`${name}: ${maxAttempts} real Drag attempts missed the target; ${JSON.stringify(attempts)}`);
}
async function probeRealRun(page,mode,name){
  await startHeat(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(6500);
  await page.keyboard.up('KeyW');
  const cue=await text(page,'#challengeHudSummary .hud-summary-cue');
  const canvas=await page.locator('#cv').evaluate(element=>({width:element.width,height:element.height,visible:element.getClientRects().length>0}));
  assert(canvas.visible&&canvas.width>0&&canvas.height>0,`${name}: no rendered Race canvas`);
  assert(await visible(page,'#results')||/racing/.test(await text(page,'#raceMultiplayerTitle')),`${name}: real ${mode} run never entered racing state`);
  return{cue,canvas,resultVisible:await visible(page,'#results')};
}
async function compareCase({kind,mode,width,height,canvas=false,control,full=false}){
  const name=`${kind}-${mode}-${width}${canvas?'-canvas':''}`,record=video&&full;
  if(record)mkdirSync(join(output,name),{recursive:true});
  const {context,page}=await newPage(name,width,height,{canvas,record});
  try{
    await enterRace(page);
    const before=await storage(page);
    assert(await visible(page,'#raceMultiplayerStart'),`${name}: no match setup action`);
    if(kind==='computer')await page.click('#raceMultiComputer');else await page.selectOption('#raceMultiplayerOpponent','seat-b');
    await page.click('#raceMultiplayerStart');
    await preflight(page,{mode,car:'kestrel',part:'tires',value:'wide',control,steer:'auto',first:true,name,kind});
    assert((await text(page,'#raceComparativeSummary')).includes(kind==='computer'?'Choose the Computer build':'Pass the device'),`${name}: missing handoff setup`);
    if(kind==='couch')await switchProfile(page,'seat-b','#raceComparativeProfiles');
    await page.click('#raceComparativeContinue');
    const secondCar=mode==='drag'?'cobalt':'aegis';
    const secondPart=mode==='drag'?'tires':'brakes',secondValue=mode==='drag'?'narrow':'sport';
    await preflight(page,{mode,car:secondCar,part:secondPart,value:secondValue,control:kind==='couch'?'classic':undefined,steer:'auto',name,kind});
    const summary=await text(page,'#raceComparativeSummary');
    assert(summary.includes('Kestrel')||summary.includes('Cobalt'),`${name}: first vehicle missing from matchup`);
    assert(summary.includes(kind==='computer'?'Computer':'Racer 2')&&summary.includes(secondCar==='kestrel'?'Kestrel':secondCar==='cobalt'?'Cobalt':'Aegis'),`${name}: second build missing from matchup`);
    assert(summary.includes('Wide')&&summary.includes(mode==='drag'?'Narrow':'Sport'),`${name}: distinct Garage choices missing from matchup`);
    if(control)assert(summary.includes('Analog'),`${name}: chosen control missing`);
    await assertCopy(page,kind,name,'matchup',kind==='computer'?'Computer':'Racer 2');
    await page.screenshot({path:join(output,`${name}-matchup.png`)});
    if(kind==='couch')await switchProfile(page,'seat-a','#raceComparativeProfiles');
    await page.click('#raceComparativeConfirm');
    const contract=await text(page,'#raceMultiplayerContract');
    assert(contract.includes('Frozen:')&&contract.includes('no solo rewards')&&contract.includes(' vs '),`${name}: frozen contract missing`);
    assert((await text(page,'#raceMultiplayerTitle')).includes('Racer 1 ready'),`${name}: Racer 1 not ready`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,`${name}: horizontal overflow`);
    const entry={name,kind,mode,width,height,canvas,control:control||'classic',contract,full};
    if(full){
      entry.aAttempts=await driveValidDrag(page,`${name}-racer-1`);
      assert((await text(page,'#raceMultiplayerStatus')).includes(kind==='computer'?'computer':'switch to Racer 2'),`${name}: real result did not lead to handoff`);
      if(kind==='couch'){
        await switchProfile(page,'seat-b','#raceMultiplayerSwitch');
        assert((await text(page,'#raceMultiplayerTitle')).includes('Racer 2 ready'),`${name}: profile handoff did not ready Racer 2`);
        assert(await visible(page,'#raceMultiplayerGhost'),`${name}: Racer 1 ghost missing`);
        entry.ghostReady=(await text(page,'#raceMultiplayerGhostText')).includes('Racer 1 ghost');
        assert(entry.ghostReady,`${name}: ghost has no Racer 1 reference text`);
        entry.bAttempts=await driveValidDrag(page,`${name}-racer-2`);
      }else{
        await page.click('#raceMultiplayerComputerRun');
        await page.waitForFunction(()=>/Computer racing|computer wins|you win|Computer retry/.test(document.querySelector('#raceMultiplayerTitle')?.textContent||''),null,{timeout:30000});
        await page.waitForFunction(()=>/computer wins|you win|Computer retry/.test(document.querySelector('#raceMultiplayerTitle')?.textContent||''),null,{timeout:70000});
        entry.computerTitle=await text(page,'#raceMultiplayerTitle');
        assert(!entry.computerTitle.includes('retry'),`${name}: real computer physics missed its target`);
      }
      await closeResult(page);
      assert(await visible(page,'#raceMultiplayerRematch'),`${name}: result has no rematch`);
      assert((await text(page,'#raceMultiplayerTitle')).match(/\bwin(?:s)?\b|tie/),`${name}: result title missing winner`);
      await page.screenshot({path:join(output,`${name}-result.png`)});
      await page.click('#raceMultiplayerRematch');
      assert(await visible(page,'#raceMultiplayerStart'),`${name}: rematch did not clean up`);
    }else{
      entry.realRun=await probeRealRun(page,mode,`${name}-racer-1`);
      if(entry.realRun.resultVisible)await closeResult(page);else await openControls(page);
      assert((await text(page,'#raceMultiplayerContract'))===contract,`${name}: contract changed during real physics run`);
      await page.screenshot({path:join(output,`${name}-run.png`)});
      if(await visible(page,'#raceMultiplayerRetry')){entry.retryAvailable=true;await page.click('#raceMultiplayerRetry');assert((await text(page,'#raceMultiplayerContract'))===contract,`${name}: retry changed contract`)}
      await page.click('#raceMultiplayerAbandon');
      assert(await visible(page,'#raceMultiplayerStart'),`${name}: abandon did not clean up`);
    }
    assert(await storage(page)===before,`${name}: profile progress or solo rewards changed`);
    assert(await page.evaluate(()=>Object.keys(localStorage).every(key=>!/multiplayer|quick.*challenge|race.*ghost/i.test(key))),`${name}: local match data persisted`);
    report.cases.push(entry);
  }catch(error){await page.screenshot({path:join(output,`${name}-failure.png`)}).catch(()=>{});report.errors.push(`${name}: ${error.stack||error}`)}
  finally{if(record)report.cases.push({name:`${name}-video`,source:await page.video()?.path()});await context.close();console.log(`${name}: ${report.errors.findLast(item=>item.startsWith(name+':'))?'FAIL':'pass'}`)}
}

const cases=quick?[
  {kind:'couch',mode:'drag',width:390,height:844,full:true},
  {kind:'computer',mode:'drag',width:1113,height:900,full:true}
]:[
  {kind:'couch',mode:'drag',width:360,height:780,full:true},
  {kind:'couch',mode:'circuit',width:390,height:844,control:'analog'},
  {kind:'couch',mode:'hill',width:768,height:1024,canvas:true},
  {kind:'couch',mode:'endurance',width:1113,height:900},
  {kind:'couch',mode:'drag',width:1280,height:720,full:true},
  {kind:'computer',mode:'drag',width:1440,height:900,full:true},
  {kind:'computer',mode:'drag',width:1280,height:720,full:true},
  {kind:'computer',mode:'circuit',width:390,height:844,canvas:true}
];
for(const entry of cases)if(!only||`${entry.kind}-${entry.mode}-${entry.width}${entry.canvas?'-canvas':''}`===only)await compareCase(entry);

if(!only||only==='quick-challenge-smoke'){
  const name='quick-challenge-smoke',{context,page}=await newPage(name,390,844);
  try{
    await enterRace(page);
    const before=await storage(page);
    assert(await page.locator('#raceMultiLive').isDisabled(),'Live Room unexpectedly available');
    await page.click('#raceMultiQuick');
    await page.click('#raceQuickCreate');
    const attempts=await driveValidDrag(page,name);
    const code=await page.locator('#raceQuickCode').inputValue();
    assert(code.startsWith('KLQ1.'),'Real Quick Challenge finish did not create a code');
    assert((await text(page,'#raceQuickStatus')).includes('Challenge ready'),'Quick Challenge status missing');
    await page.click('#raceQuickExit');
    await page.locator('#raceQuickInput').fill(code);
    await page.click('#raceQuickImport');
    assert(await visible(page,'#raceQuickPreview'),'Quick Challenge code did not import through the public UI');
    assert((await text(page,'#raceQuickPreview')).includes('Drag Sprint'),'Imported Quick Challenge lost its frozen mode');
    await page.click('#raceQuickAccept');
    assert(await visible(page,'#raceMultiplayerGhost'),'Imported Quick Challenge has no ghost reference');
    await page.click('#raceQuickExit');
    assert(await storage(page)===before,'Quick Challenge changed solo profile progress');
    report.cases.push({name,pass:true,attempts:attempts.length,codePrefix:'KLQ1',codeLength:code.length,imported:true});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`)}
  finally{await context.close()}
}
if(!only||only==='default-off'){
  const off=await newPage('default-off',390,844);
  try{
    await off.page.goto(publicUrl(false),{waitUntil:'domcontentloaded'});
    assert(!await visible(off.page,'#raceMultiplayer'),'Multiplayer visible without flag');
    assert(await off.page.evaluate(()=>document.documentElement.dataset.raceMultiplayer!=='prototype'),'Multiplayer flag set on clean landing');
    assert(await off.page.evaluate(()=>globalThis.__KICKLAB_RACE_MULTIPLAYER_QA__===undefined),'QA hook leaked with feature off');
    report.cases.push({name:'default-off',pass:true});
  }catch(error){report.errors.push(`default-off: ${error.stack||error}`)}
  finally{await off.context.close()}
}
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
await browser.close();
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,external:report.external,artifactSha256:report.artifactSha256,output},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
