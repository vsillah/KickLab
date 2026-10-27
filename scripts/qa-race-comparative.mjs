import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5886/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-comparative');
const head=process.env.KICKLAB_QA_HEAD||'working';
const video=process.argv.includes('--video');
const quick=process.argv.includes('--quick');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={head,base,video,cases:[],namingChecks:[],errors:[],external:[]};
const profiles={version:1,activeId:'seat-a',legacyProfileId:'seat-a',profiles:[{id:'seat-a',nickname:'Racer A',avatar:'rocket',color:'sky',progress:{xp:240,lap:17,stats:{plays:{race:2}},badges:{}}},{id:'seat-b',nickname:'Racer B',avatar:'wiz',color:'mint',progress:{xp:125,lap:21,stats:{plays:{race:1}},badges:{}}}]};
const assert=(condition,label)=>{if(!condition)throw Error(label)};
const state=page=>page.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.state());
const storage=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.map(({id,progress})=>({id,progress})));
async function assertRacerCopy(page,kind,caseName,stage,expected){
  const visible=await page.locator('body').innerText();
  const accessible=caseName.endsWith('-1280')?await page.locator('body').ariaSnapshot():'';
  const copy=visible+'\n'+accessible;
  assert(!/\bSeat\s+[AB]\b/i.test(copy),`${caseName} ${stage}: legacy seat label in visible or accessible copy`);
  assert(kind!=='computer'||!/\bRacer\s+2\b/i.test(copy),`${caseName} ${stage}: Computer was called Racer 2`);
  if(expected)assert(visible.toLowerCase().includes(expected.toLowerCase()),`${caseName} ${stage}: expected ${expected}`);
  if(accessible)report.namingChecks.push({caseName,stage,visible:true,accessible:true,computerWithoutRacer2:kind==='computer'});
}
async function ready(page){
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  if(await page.locator('.race-orbit-panel button').isVisible())await page.click('.race-orbit-panel button');
  await page.waitForTimeout(350);
  if(await page.locator('#racePreflight').isVisible())await page.click('#racePreflightClose');
  await page.click('#racePhoneProgress');
}
async function assertPreflightClearance(page,label,caseName){
  if(page.video())await page.waitForTimeout(900);
  const geometry=await page.evaluate(()=>{
    const content=document.querySelector('#racePreflightContent'),footer=document.querySelector('.race-preflight-footer');
    const cards=content.querySelectorAll('.race-preflight-route'),card=cards[3]||cards[cards.length-1]||content.querySelector('.race-preflight-footnote');
    const box=node=>node.getBoundingClientRect();
    const reachable=node=>{const r=box(node),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===node||node.contains(hit)};
    const initial={contentBottom:box(content).bottom,footerTop:box(footer).top,scrollable:content.scrollHeight>content.clientHeight,cancel:reachable(document.querySelector('#racePreflightBack')),continue:reachable(document.querySelector('#racePreflightNext'))};
    content.scrollTop=content.scrollHeight;
    const cardBox=box(card),contentBox=box(content);
    const bottom={cardTop:cardBox.top,cardBottom:cardBox.bottom,contentTop:contentBox.top,contentBottom:contentBox.bottom,cardReachable:reachable(card),cancel:reachable(document.querySelector('#racePreflightBack')),continue:reachable(document.querySelector('#racePreflightNext'))};
    return{title:document.querySelector('#racePreflightTitle').textContent,initial,bottom};
  });
  assert(geometry.title.includes(label),`${label}: preflight title ${geometry.title}`);
  assert(geometry.initial.contentBottom<=geometry.initial.footerTop&&(label!=='Racer 1'||geometry.initial.scrollable)&&geometry.initial.cancel&&geometry.initial.continue,`${label}: initial footer clearance ${JSON.stringify(geometry)}`);
  assert(geometry.bottom.cardTop>=geometry.bottom.contentTop-1&&geometry.bottom.cardBottom<=geometry.bottom.contentBottom+1&&geometry.bottom.cardReachable&&geometry.bottom.cancel&&geometry.bottom.continue,`${label}: route or actions clipped ${JSON.stringify(geometry)}`);
  await page.screenshot({path:join(output,`${caseName}-${label.toLowerCase().replaceAll(' ','-')}-preflight-1280x720.png`)});
  if(page.video())await page.waitForTimeout(1300);
}
async function preflight(page,{mode,car,part,value,control,first=false,layoutLabel,caseName}){
  if(layoutLabel)await assertPreflightClearance(page,layoutLabel,caseName);
  await assertRacerCopy(page,caseName.startsWith('computer')?'computer':'couch',caseName,`preflight-${first?'racer-1':'opponent'}`,layoutLabel);
  if(first&&mode!=='drag')await page.click(`[data-preflight-mode="${mode}"]`);
  if(first)await page.click('#racePreflightNext');
  if(layoutLabel==='Racer 1')assert(await page.evaluate(()=>document.querySelector('#racePreflightContent').scrollTop===0),`${caseName}: vehicle step starts at top`);
  await page.click(`[data-preflight-vehicle="${car}"]`);await page.click('#racePreflightNext');
  await page.click(`[data-preflight-part="${part}"][data-preflight-value="${value}"]`);
  await page.click('#racePreflightNext');if(control)await page.click(`[data-preflight-control="${control}"]`);await page.click('#racePreflightNext');
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:12000});
}
async function switchProfile(page,id,button){
  await page.click(button);await page.click(`[data-profile-id="${id}"]`);await page.click('#profileClose');await page.click('#racePhoneProgress');
}
async function run({kind,mode,width,height,canvas=false,record=false,realComputer=false,aControl}){
  const name=`${kind}-${mode}-${width}${canvas?'-canvas':''}`,dir=join(output,name);
  if(record)mkdirSync(dir,{recursive:true});
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:record?'no-preference':'reduce',...(record?{recordVideo:{dir,size:{width,height}}}:{})});
  await context.addInitScript(seed=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify(seed)),profiles);
  if(canvas)await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'||type==='webgl2'?null:original.call(this,type,...args)}});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.external.push(`${name}: ${url}`);route.abort();}});
  try{
    const url=new URL(base);for(const [key,value] of Object.entries({raceExpansion:'prototype',raceMultiplayer:'prototype',racePreflight:'prototype',raceSimulator:'prototype',rev:head}))url.searchParams.set(key,value);
    await page.goto(url.toString());await ready(page);
    const before=await storage(page),soloSteer=(await state(page)).activeSteer;
    if(kind==='computer')await page.click('#raceMultiComputer');else await page.selectOption('#raceMultiplayerOpponent','seat-b');
    await page.click('#raceMultiplayerStart');
    await preflight(page,{mode,car:kind==='computer'?'cobalt':'kestrel',part:'tires',value:'wide',control:aControl,first:true,layoutLabel:width===1280&&height===720?'Racer 1':undefined,caseName:name});
    let q=await state(page);assert(q.setup?.stage===(kind==='computer'?'opponent':'handoff'),`${name}: Racer 1 setup`);await assertRacerCopy(page,kind,name,'handoff-or-computer-choice','Racer 1');
    if(kind==='couch')await switchProfile(page,'seat-b','#raceComparativeProfiles');
    await page.click('#raceComparativeContinue');
    await preflight(page,{mode,car:kind==='computer'?'kestrel':'aegis',part:'brakes',value:'sport',control:aControl&&kind==='couch'?'classic':undefined,layoutLabel:width===1280&&height===720?kind==='computer'?'Computer':'Racer 2':undefined,caseName:name});
    q=await state(page);assert(q.setup?.stage==='confirm'&&q.setup.a.garage.body!==q.setup.b.garage.body,`${name}: distinct builds`);await assertRacerCopy(page,kind,name,'matchup',kind==='computer'?'Computer':'Racer 2');
    if(kind==='couch')await switchProfile(page,'seat-a','#raceComparativeProfiles');
    await page.screenshot({path:join(output,`${name}-overview.png`)});
    await page.evaluate(()=>{const pane=document.querySelector('#orientationDetail'),summary=document.querySelector('#raceComparativeSummary');pane.scrollTop+=summary.getBoundingClientRect().top-pane.getBoundingClientRect().top-10;});
    if(record)await page.waitForTimeout(1300);
    await page.screenshot({path:join(output,`${name}-matchup.png`)});
    await page.click('#raceComparativeConfirm');q=await state(page);
    assert(q.phase==='readyA'&&q.seats.A.garage.body!==q.seats.B.garage.body&&q.mode===mode&&q.activeControl===q.seats.A.control,`${name}: immutable matchup and Racer 1 control`);await assertRacerCopy(page,kind,name,'racer-1-ready','Racer 1');
    assert(await page.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.start()),`${name}: start A`);
    await page.waitForTimeout(record?800:100);
    assert(await page.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.finish(true)),`${name}: finish A`);
    q=await state(page);assert(q.phase==='handoff'&&q.hasA&&!q.hasB,`${name}: A result`);await assertRacerCopy(page,kind,name,'racer-1-result','Racer 1');
    await page.click('#rNext');
    if(kind==='couch'){
      await page.click('#racePhoneProgress');await switchProfile(page,'seat-b','#raceMultiplayerSwitch');
      q=await state(page);assert(q.phase==='readyB'&&!q.replay&&!q.logEntries&&q.activeControl===q.seats.B.control,`${name}: privacy handoff and Racer 2 control`);await assertRacerCopy(page,kind,name,'racer-2-ready','Racer 2');
      assert(await page.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.start()),`${name}: start B`);
      if(!canvas)assert(await page.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.ghostAt(5)),`${name}: 3D ghost`);await assertRacerCopy(page,kind,name,'racer-2-running','Racer 1 ghost');
      await page.waitForTimeout(record?800:100);
      assert(await page.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.finish(true)),`${name}: finish B`);
    }else{
      if(!await page.locator('#raceMultiplayerComputerRun').isVisible())await page.click('#racePhoneProgress');
      await page.click('#raceMultiplayerComputerRun');
      q=await state(page);assert(q.seats.B.control==='classic'&&q.activeControl==='classic',`${name}: computer local control style`);await assertRacerCopy(page,kind,name,'computer-running','Computer');
      if(realComputer){await page.waitForFunction(()=>['result','retryB','blocked'].includes(__KICKLAB_RACE_MULTIPLAYER_QA__.state().phase),null,{timeout:120000});}
      else{await page.waitForFunction(()=>{const state=__KICKLAB_RACE_MULTIPLAYER_QA__.state();return state.phase==='runningB'&&state.runState==='run';},null,{timeout:30000});await page.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.finish(true));}
    }
    q=await state(page);assert(q.phase==='result'&&q.hasA&&q.hasB&&q.result,`${name}: result ${JSON.stringify({phase:q.phase,runState:q.runState,runTime:q.runTime})}`);await assertRacerCopy(page,kind,name,'match-result',kind==='computer'?'Computer':'Racer 2');
    assert(JSON.stringify(before)===JSON.stringify(await storage(page)),`${name}: solo storage changed`);
    assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1,`${name}: horizontal overflow`);
    await page.screenshot({path:join(output,`${name}-result.png`)});
    await page.click('#rNext');if(!await page.locator('#raceMultiplayerRematch').isVisible())await page.click('#racePhoneProgress');
    await page.click('#raceMultiplayerRematch');q=await state(page);assert(q.phase==='setup'&&!q.hasA&&!q.hasB&&q.activeSteer===soloSteer,`${name}: rematch cleanup`);await assertRacerCopy(page,kind,name,'rematch');
    report.cases.push({name,kind,mode,width,height,canvas,realComputer,storageUnchanged:true,result:q.phase==='setup'});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{if(record)report.cases.push({videoSource:await page.video()?.path()});await context.close();console.log(`${name}: ${report.errors.findLast(item=>item.startsWith(name+':'))||'pass'}`);}
}
const cases=quick?[{kind:'couch',mode:'drag',width:390,height:844},{kind:'computer',mode:'drag',width:1113,height:900,realComputer:true}]:[
  {kind:'couch',mode:'drag',width:360,height:780},
  {kind:'couch',mode:'circuit',width:390,height:844,aControl:'analog'},
  {kind:'couch',mode:'hill',width:768,height:1024,canvas:true},
  {kind:'couch',mode:'endurance',width:1113,height:900},
  {kind:'couch',mode:'drag',width:1280,height:720},
  {kind:'computer',mode:'drag',width:1440,height:900,realComputer:true},
  {kind:'computer',mode:'drag',width:1280,height:720},
  {kind:'computer',mode:'circuit',width:390,height:844,canvas:true}
];
const only=process.argv.find(arg=>arg.startsWith('--case='))?.slice('--case='.length);
for(const entry of cases)if(!only||`${entry.kind}-${entry.mode}-${entry.width}${entry.canvas?'-canvas':''}`===only)await run({...entry,record:video&&(entry.kind==='couch'&&entry.mode==='drag'||entry.kind==='computer'&&entry.mode==='drag')});
{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.addInitScript(seed=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify(seed)),profiles);
  const page=await context.newPage();const url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceMultiplayer','prototype');url.searchParams.set('racePreflight','prototype');url.searchParams.set('rev',head);
  try{await page.goto(url.toString());await ready(page);assert(await page.locator('#raceMultiLive').isDisabled(),'Live Room must remain unavailable');await page.click('#raceMultiQuick');await page.click('#raceQuickCreate');assert(await page.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.start()),'Quick start');assert(await page.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.finish(true)),'Quick finish');assert((await page.locator('#raceQuickCode').inputValue()).startsWith('KLQ1.'),'Quick code remains available');report.cases.push({name:'quick-challenge-smoke',pass:true});}
  catch(error){report.errors.push(`quick-challenge-smoke: ${error.stack||error}`);}finally{await context.close();}
}
{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  try{await page.goto(base);assert(!await page.evaluate(()=>!!globalThis.__KICKLAB_RACE_MULTIPLAYER_QA__),'multiplayer must default off');report.cases.push({name:'default-off',pass:true});}
  catch(error){report.errors.push(`default-off: ${error.stack||error}`);}finally{await context.close();}
}
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,external:report.external,output},null,2));if(report.errors.length||report.external.length)process.exitCode=1;
