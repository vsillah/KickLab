import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD||'working';
const base=process.env.KICKLAB_QA_URL||'http://127.0.0.1:5887/kicklab.html';
const out=resolve(process.env.KICKLAB_QA_OUT||'qa-artifacts/race-result-action-hotfix');
mkdirSync(out,{recursive:true});
const cases=[
  {width:390,height:844,style:'classic',activation:'touch'},
  {width:768,height:1024,style:'classic',activation:'keyboard',motion:'reduce'},
  {width:1113,height:834,style:'analog',activation:'pointer'},
  {width:1440,height:900,style:'simulator',activation:'pointer'},
];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl']});
const report={head,base,cases:[],errors:[],external:[]};
const rect=element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
for(const testCase of cases){
  const {width,height,style,activation}=testCase,label=`${width}x${height}-${style}`;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:activation==='touch',reducedMotion:testCase.motion||'no-preference'});
  const page=await context.newPage(),requests=[];
  const url=new URL(base);for(const key of ['raceExpansion','raceCompetition','raceTelemetry','raceInstruments','racePreflight'])url.searchParams.set(key,'prototype');url.searchParams.set('raceResultsQA','1');url.searchParams.set('rev',head);
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  await page.route('**/*',route=>{const target=route.request().url();requests.push(target);if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${label}: ${target}`);route.abort();}});
  const entry={label,activation,motion:testCase.motion||'no-preference',states:[],requests:0};
  try{
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:15000});
    await page.click('#racePreflightNext');await page.click('[data-preflight-mode="drag"]');
    for(let i=0;i<3;i++)await page.click('#racePreflightNext');
    if(style!=='classic')await page.click(`[data-preflight-control="${style}"]`);
    await page.click('#racePreflightNext');await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:25000});
    const live=await page.evaluate(()=>({renderer:window.__KICKLAB_RACE_3D__?.status,vehicle:window.__KICKLAB_RACE_3D__?.vehicle,fallback:window.__KICKLAB_RACE_MODES_QA__?.state()?.canvasFallback,instruments:document.querySelector('.control-deck')?.classList.contains('race-instruments-live'),dial:!!document.querySelector('#raceActionDial')?.getClientRects().length,legacyGas:!!document.querySelector('#padR [data-id="gas"]')?.getClientRects().length}));
    if(live.renderer!=='rendering'||!live.vehicle||live.fallback||!live.instruments||!live.dial||live.legacyGas)report.errors.push(`${label}: live ${JSON.stringify(live)}`);
    const performance=await page.evaluate(async()=>{const intervals=await new Promise(resolve=>{let previous=window.performance.now(),values=[];function sample(now){values.push(now-previous);previous=now;if(values.length===105)resolve(values.slice(5));else requestAnimationFrame(sample)}requestAnimationFrame(sample)});intervals.sort((a,b)=>a-b);return{p95:intervals[95],resourceCount:window.performance.getEntriesByType('resource').length,storage:Object.keys(localStorage).sort(),mediaStorage:Object.keys(localStorage).filter(key=>/preview|frame|clip|replay/i.test(key)),gpu:window.__KICKLAB_RACE_3D__?.gpuMemory}});
    if(performance.p95>(width<=480?42:35)||performance.mediaStorage.length)report.errors.push(`${label}: performance/privacy ${JSON.stringify(performance)}`);
    await page.screenshot({path:join(out,`${label}-live.png`)});entry.states.push({phase:'live',...live,performance});
    for(const outcome of ['fail','pass']){
      await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario({outcome:value,coach:'clean',replay:'both'}),outcome);
      await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.threePreview());
      await page.locator('#raceReplayPreview').scrollIntoViewIfNeeded();
      const state=await page.evaluate(()=>{const save=document.querySelector('#rRaceGarage'),primary=document.querySelector('#rNext'),row=document.querySelector('#results .rgo'),preview=document.querySelector('#raceReplayPreview'),r=element=>{const b=element.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom}},s=r(save),p=r(preview),action=r(row),point=document.elementFromPoint(s.x+s.w/2,s.y+s.h/2);return{title:document.querySelector('#rTitle').textContent,primary:primary.hidden?null:primary.textContent.trim(),primaryFirst:!!(primary.compareDocumentPosition(save)&Node.DOCUMENT_POSITION_FOLLOWING),saveName:save.getAttribute('aria-label'),saveTitle:save.getAttribute('title'),saveText:save.textContent.trim(),iconParts:save.querySelectorAll('svg path,svg circle').length,save:s,action,preview:p,saveHit:point?.closest('button')?.id||null,overflow:document.documentElement.scrollWidth>innerWidth+1,renderer:window.__KICKLAB_RACE_3D__?.status,vehicle:window.__KICKLAB_RACE_3D__?.vehicle}});
      entry.states.push({phase:`result-${outcome}`,...state});
      if(state.saveName!=='Save & Exit'||state.saveTitle!=='Save & Exit'||state.saveText||state.iconParts<3||state.save.w<44||state.save.h<44||state.saveHit!=='rRaceGarage'||state.save.right>width+1||state.save.bottom>height+1||Math.abs(state.action.x-state.preview.x)>.5||Math.abs(state.action.w-state.preview.w)>.5||Math.abs(state.save.right-state.preview.right)>.5||state.primary!==(outcome==='fail'?'Retry':'Keep racing')||!state.primaryFirst||state.overflow||state.renderer!=='rendering'||!state.vehicle)report.errors.push(`${label}/${outcome}: ${JSON.stringify(state)}`);
      if(activation==='keyboard'){
        await page.locator('#rNext').focus();await page.keyboard.press('Tab');
        const focus=await page.evaluate(()=>{const button=document.querySelector('#rRaceGarage');return{active:document.activeElement===button,visible:button.matches(':focus-visible'),outline:getComputedStyle(button).outlineWidth}});
        entry.states.push({phase:`focus-${outcome}`,...focus});if(!focus.active||!focus.visible||parseFloat(focus.outline)<2)report.errors.push(`${label}/${outcome}: focus ${JSON.stringify(focus)}`);
      }
      await page.screenshot({path:join(out,`${label}-${outcome}-result.png`)});
      await page.click('#raceReplayPreview');
      const replay=await page.evaluate(()=>{const exit=document.querySelector('#rbExit'),b=exit.getBoundingClientRect();return{bar:!document.querySelector('#rbar').hidden,exitHit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')?.id,controls:['#pad','#raceActionDial','#raceAnalogActions','.sim-controls'].filter(s=>{const e=document.querySelector(s);return e&&!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'})}});
      entry.states.push({phase:`replay-${outcome}`,...replay});if(!replay.bar||replay.exitHit!=='rbExit'||replay.controls.length)report.errors.push(`${label}/${outcome}: replay ${JSON.stringify(replay)}`);
      await page.screenshot({path:join(out,`${label}-${outcome}-replay.png`)});
      if(activation==='touch')await page.locator('#rbExit').tap();else if(activation==='keyboard'){await page.locator('#rbExit').focus();await page.keyboard.press('Enter')}else await page.click('#rbExit');
      if(await page.locator('#rbar').isVisible())report.errors.push(`${label}/${outcome}: Replay Exit failed`);
      if(outcome==='pass'){
        await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.scenario({outcome:'pass',coach:'clean',replay:'both'}));
        const before=await page.evaluate(()=>({profile:JSON.parse(localStorage.getItem('kicklab.profiles.v1')),setup:window.__KICKLAB_RACE_PREFLIGHT_QA__.state().active,record:window.__KICKLAB_RACE_RESULTS_QA__.state()}));
        if(width===390){
          await page.evaluate(()=>{const original=Storage.prototype.getItem;window.__qaGetItem=original;Storage.prototype.getItem=function(key){if(key==='kicklab.profiles.v1')throw Error('simulated unavailable storage');return original.call(this,key)}});
          await page.locator('#rNext').tap();
          const blocked=await page.evaluate(()=>({result:!document.querySelector('#results').hidden,home:!document.querySelector('#modeHome').hidden,preflight:!document.querySelector('#racePreflight').hidden,hint:document.querySelector('#rHint').textContent}));
          entry.states.push({phase:'keep-racing-storage-blocked',...blocked});
          if(!blocked.result||blocked.home||blocked.preflight||!blocked.hint.includes('Could not save'))report.errors.push(`${label}: Keep racing storage failure ${JSON.stringify(blocked)}`);
          await page.evaluate(()=>{Storage.prototype.getItem=window.__qaGetItem;delete window.__qaGetItem});
        }
        if(activation==='touch')await page.locator('#rNext').tap();else if(activation==='keyboard'){await page.locator('#rNext').focus();await page.keyboard.press('Enter')}else await page.click('#rNext');
        await page.locator('#racePreflight').waitFor({state:'visible',timeout:15000});
        const continued=await page.evaluate(()=>({home:!document.querySelector('#modeHome').hidden,results:!document.querySelector('#results').hidden,preflight:window.__KICKLAB_RACE_PREFLIGHT_QA__.state(),record:window.__KICKLAB_RACE_RESULTS_QA__.state(),profile:JSON.parse(localStorage.getItem('kicklab.profiles.v1'))}));
        const previous=before.profile.profiles.find(profile=>profile.id===before.profile.activeId)?.progress,current=continued.profile.profiles.find(profile=>profile.id===continued.profile.activeId)?.progress;
        const sameSetup=continued.preflight.draft?.vehicle===before.setup.vehicle&&continued.preflight.draft?.mode===before.setup.mode&&JSON.stringify(continued.preflight.draft?.garage)===JSON.stringify(before.setup.garage)&&continued.preflight.draft?.control===style&&continued.preflight.draft?.venue==='highland';
        const keep={phase:'keep-racing',home:continued.home,results:continued.results,preflight:continued.preflight.open,raceState:continued.preflight.raceState,sameProfile:before.profile.activeId===continued.profile.activeId,progressSame:JSON.stringify(previous)===JSON.stringify(current),sameSetup,recordSame:before.record.recordId===continued.record.recordId&&before.record.recordFrames===continued.record.recordFrames};
        entry.states.push(keep);if(keep.home||keep.results||!keep.preflight||keep.raceState!=='grid'||!keep.sameProfile||!keep.progressSame||!keep.sameSetup||!keep.recordSame)report.errors.push(`${label}: Keep racing ${JSON.stringify(keep)}`);
        await page.screenshot({path:join(out,`${label}-keep-racing-preflight.png`)});
        await page.click('#racePreflightClose');
      }
      await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario({outcome:value,coach:'clean',replay:'both'}),outcome);
      const before=await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return JSON.stringify(p.profiles.find(x=>x.id===p.activeId).progress)});
      if(activation==='touch')await page.locator('#rRaceGarage').tap();else if(activation==='keyboard'){await page.locator('#rRaceGarage').focus();await page.keyboard.press('Space')}else await page.click('#rRaceGarage');
      const after=await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return{home:!document.querySelector('#modeHome').hidden,result:!document.querySelector('#results').hidden,progress:JSON.stringify(p.profiles.find(x=>x.id===p.activeId).progress)}});
      entry.states.push({phase:`save-${outcome}`,home:after.home,result:after.result,persisted:before===after.progress});if(!after.home||after.result||before!==after.progress)report.errors.push(`${label}/${outcome}: save ${JSON.stringify(after)}`);
      if(outcome==='fail'){await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:15000});await page.click('#racePreflightClose');}
    }
    await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:15000});await page.click('#racePreflightClose');
    const match=await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.matchAction());
    if(match?.primary!=='Match controls'||!match.primaryVisible||match.save!=='Save & Exit'||!match.saveVisible)report.errors.push(`${label}: contextual match ${JSON.stringify(match)}`);
    entry.states.push({phase:'match',match});
  }catch(error){report.errors.push(`${label}: ${error.stack||String(error)}`)}
  entry.requests=requests.length;report.cases.push(entry);await context.close();console.log(label,report.errors.filter(error=>error.startsWith(label)).length?'FAIL':'PASS');
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({head,cases:report.cases.length,errors:report.errors,external:report.external,out},null,2));if(report.errors.length||report.external.length)process.exitCode=1;
