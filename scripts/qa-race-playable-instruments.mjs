import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const origin=process.env.KICKLAB_QA_ORIGIN||'http://127.0.0.1:5177';
const out=resolve(process.argv[2]||`qa-artifacts/race-playable-instruments/${head.slice(0,7)}`);
mkdirSync(out,{recursive:true});
const report={head,origin,checks:[],errors:[],external:[],samples:{}};
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const flags={raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',rev:head.slice(0,7)};
function gate(name,condition,detail){report.checks.push({name,pass:!!condition,detail});if(!condition)throw new Error(`FAIL ${name}: ${JSON.stringify(detail)}`);}
async function open({flag=true,width=390,height=844,reduced=false,assetFailure=false,record=false}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference',recordVideo:record?{dir:out,size:{width,height}}:undefined});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.route('**/*',route=>{const url=route.request().url();if(assetFailure&&url.endsWith('.glb'))return route.abort();if(url.startsWith(`${origin}/`)||url.startsWith(`blob:${origin}/`)||url.startsWith('data:'))return route.continue();report.external.push(url);return route.abort();});
  const params=new URLSearchParams({...flags,...(!flag?{raceInstruments:''}:{})});if(!flag)params.delete('raceInstruments');
  const url=`${origin}/?${params}`;await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  if(assetFailure)await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='canvas-fallback',null,{timeout:15000});
  else{await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.orbit?.done===true&&window.__KICKLAB_RACE_3D__?.dynamics?.state==='grid'&&document.querySelector('#raceCoachSetupStart')?.getBoundingClientRect().width>0,null,{timeout:15000});await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:15000});}
  return{context,page,url};
}
const snapshot=page=>page.evaluate(()=>({dynamics:window.__KICKLAB_RACE_3D__?.dynamics,renderer:window.__KICKLAB_RACE_3D__?.status,vehicle:window.__KICKLAB_RACE_3D__?.vehicle,telemetry:window.__KICKLAB_RACE_TELEMETRY__,gas:document.querySelector('#padR [data-id="gas"]')?.getAttribute('aria-label'),nosBadge:document.querySelector('#padR [data-id="gas"] .race-instrument-nos')?.textContent,shift:document.querySelector('#padR [data-id="instrument-shift"]')?.getAttribute('aria-label'),nos:document.querySelector('#padR [data-id="instrument-nos"]')?.getAttribute('aria-label'),rack:document.querySelector('#raceSpecialRack')?.hidden?null:{selected:document.querySelector('#raceSpecialRack')?.dataset.selected,available:document.querySelector('#raceSpecialRack')?.dataset.available,label:document.querySelector('#raceSpecialAction')?.getAttribute('aria-label')},drift:document.querySelector('#padR [data-id="drift"]')?.getAttribute('aria-label'),storage:Object.keys(localStorage).sort()}));
const waitInput=(page,predicate)=>page.waitForFunction(predicate,null,{timeout:5000});
async function shiftCase(name,targetKmh,expected){
  const run=await open();try{
    const {page}=run;await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:20000});
    const shift=page.locator('#padR [data-id="instrument-shift"]');await shift.waitFor({state:'visible'});
    if(targetKmh>0){await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('Space');await page.waitForFunction(kmh=>window.__KICKLAB_RACE_3D__?.dynamics?.v*3.6>=kmh,targetKmh,{timeout:20000});await page.keyboard.up('Space');}
    const before=await snapshot(page);await shift.click();if(name==='early')await page.keyboard.press('Enter');const after=await snapshot(page);report.samples[`shift-${name}`]={before,after};
    gate(`${name} Shift uses canonical speed band`,after.shift?.includes('Shift to gear 3')&&after.shift?.includes(`Last shift ${expected}`)&&before.shift?.includes('Shift to gear 2'),{before:before.shift,after:after.shift,speedKmh:Math.round((before.dynamics?.v||0)*3.6)});
    if(name==='early')gate('shift cooldown blocks immediate repeated input',after.shift?.includes('Shift to gear 3')&&after.shift?.includes('Last shift early'),after.shift);
  }finally{await run.context.close();}
}
async function nosCase(){
  const run=await open();try{
    const {page}=run;await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:20000});
    const nos=page.locator('#raceSpecialAction');await nos.waitFor({state:'visible'});
    const ready=await snapshot(page);gate('NOS begins ready from canonical pressure and tank',ready.rack?.selected==='nos'&&ready.telemetry.pressure>=.25&&ready.dynamics.nitro>.1,ready);
    await nos.click();await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.nosPulse>0);
    const active=await snapshot(page);gate('NOS action activates a real timed pulse',active.telemetry.nosPulse>0&&active.telemetry.pressure<ready.telemetry.pressure,{ready,active});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.nosPulse===0,null,{timeout:5000});
    const afterPulse=await snapshot(page);report.samples.nos={ready,active,afterPulse};
    gate('NOS pulse returns to charge state',afterPulse.telemetry.nosPulse===0&&afterPulse.telemetry.pressure>active.telemetry.pressure,afterPulse);
    await nos.click();await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.nosPulse>0);await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.nosPulse===0,null,{timeout:5000});
    const undercharged=await snapshot(page);gate('undercharged NOS is visible as BUILD and removed from action rack',undercharged.telemetry.pressure<.25&&undercharged.rack===null&&undercharged.nosBadge?.includes('BUILD')&&undercharged.dynamics.nitro>.1,undercharged);report.samples.nos.undercharged=undercharged;
    await page.waitForFunction(()=>document.querySelector('#raceSpecialRack')?.dataset.selected==='nos'&&!document.querySelector('#raceSpecialRack')?.hidden,null,{timeout:5000});
    const recovered=await snapshot(page);gate('NOS returns when real pressure recovers',recovered.telemetry.pressure>=.25&&recovered.rack?.selected==='nos',recovered);report.samples.nos.recovered=recovered;
  }finally{await run.context.close();}
}
async function nosDrainCase(){
  const run=await open();try{
    const {page}=run;await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run');const samples=[];let empty=null;
    for(let pulse=1;pulse<=4;pulse++){
      await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('Space');await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===true);
      await page.locator('#raceSpecialAction').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.nosPulse>0&&window.__KICKLAB_RACE_3D__?.dynamics?.boost===true);
      const active=await snapshot(page);samples.push({pulse,phase:'active',state:active});gate(`NOS pulse ${pulse} delivers canonical boost`,active.telemetry.nosPulse>0&&active.dynamics.boost&&active.dynamics.inputs.gas===true,active);
      await page.waitForFunction(()=>window.__KICKLAB_RACE_TELEMETRY__?.nosPulse===0,null,{timeout:5000});const ended=await snapshot(page);samples.push({pulse,phase:'ended',state:ended});await page.keyboard.up('Space');
      if(ended.dynamics.nitro<=.1){empty=ended;break;}
      await page.keyboard.down('b');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.v<=1,null,{timeout:6000});await page.keyboard.up('b');
      await page.waitForFunction(()=>{const t=window.__KICKLAB_RACE_TELEMETRY__,r=document.querySelector('#raceSpecialRack');return t&&!t.overheat&&t.pressure>=.25&&r&&!r.hidden&&r.dataset.selected==='nos'},null,{timeout:8000});const ready=await snapshot(page);samples.push({pulse,phase:'cooled-ready',state:ready});
      gate(`NOS pulse ${pulse} cools and recharges through real gameplay`,ready.telemetry.pressure>=.25&&!ready.telemetry.overheat&&ready.rack?.selected==='nos',ready);
    }
    gate('repeated delivered NOS exhausts the canonical tank',empty?.dynamics.nitro<=.1&&empty?.rack===null&&empty?.nosBadge?.includes('EMPTY'),empty);
    await page.keyboard.down('b');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.v<=1,null,{timeout:6000});await page.keyboard.up('b');
    await page.waitForFunction(()=>{const t=window.__KICKLAB_RACE_TELEMETRY__,d=window.__KICKLAB_RACE_3D__?.dynamics,r=document.querySelector('#raceSpecialRack');return t&&!t.overheat&&t.pressure>=.25&&d?.nitro>.1&&r&&!r.hidden&&r.dataset.selected==='nos'},null,{timeout:12000});const recovered=await snapshot(page);samples.push({phase:'recovered',state:recovered});
    gate('cooling and tank recovery restore NOS availability',recovered.telemetry.heat<=.48&&!recovered.telemetry.overheat&&recovered.dynamics.nitro>.1&&recovered.rack?.selected==='nos'&&recovered.nosBadge?.includes('COOLED'),recovered);report.samples.nosDrain=samples;
  }finally{await run.context.close();}
}
async function launchCase(){
  const run=await open();try{
    const {page}=run;
    await page.locator('#racePhoneToolsToggle').click();await page.locator('#raceToolsGarage').click();
    await page.locator('[data-garage-section="body"]').click();await page.locator('[data-garage-part="body"][data-garage-value="kart"]').click();
    await page.locator('[data-garage-section="tires"]').click();await page.locator('[data-garage-part="tires"][data-garage-value="narrow"]').click();
    await page.locator('#settingsClose').click();if(await page.locator('#racePhoneToolsToggle').getAttribute('aria-expanded')==='true')await page.locator('#racePhoneToolsToggle').click();
    const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done===true&&document.querySelector('#raceCoachSetupStart')?.getBoundingClientRect().width>0);
    await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='count');
    const countdown=await snapshot(page);gate('launch controls remain input-gated before green',!countdown.dynamics.inputs.gas&&!countdown.dynamics.inputs.brake,countdown);
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run');
    const gas=page.locator('#padR [data-id="gas"]'),brake=page.locator('#padR [data-id="brake"]');await gas.scrollIntoViewIfNeeded();
    const gasBox=await gas.boundingBox(),brakeBox=await brake.boundingBox();gate('Gas and Brake are simultaneously visible for launch',!!gasBox&&!!brakeBox&&gasBox.y>=0&&brakeBox.y>=0&&gasBox.y+gasBox.height<=844&&brakeBox.y+brakeBox.height<=844,{gasBox,brakeBox});
    await page.keyboard.down('b');await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.brake===true);
    await page.mouse.move(gasBox.x+gasBox.width/2,gasBox.y+5);await page.mouse.down();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.72);
    await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.launch?.reason==='brake-held-rev-band');const rev=await page.evaluate(()=>({race:window.__KICKLAB_RACE_3D__?.dynamics,fx:window.__KICKLAB_RACE_FX__}));gate('real brake-held rev reaches canonical launch band',rev.race?.inputs?.brake===true&&rev.race?.inputs?.gas>=.72&&rev.fx?.audit?.launch?.reason==='brake-held-rev-band',rev);
    await page.keyboard.up('b');await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.launch?.starts>=1&&window.__KICKLAB_RACE_FX__?.tireEvent==='launch',null,{timeout:3000});
    const committed=await page.evaluate(()=>({race:window.__KICKLAB_RACE_3D__?.dynamics,fx:window.__KICKLAB_RACE_FX__}));report.samples.launch={rev,committed};
    gate('brake release with held throttle commits canonical launch smoke',committed.fx.audit.launch.starts===1&&committed.fx.tireEvent==='launch'&&committed.race.inputs.brake===false&&committed.race.inputs.gas>=.7,committed);
    await page.mouse.up();
  }finally{await run.context.close();}
}
async function launchNegativeCase(kind){
  const run=await open();try{
    const {page}=run;await page.locator('#racePhoneToolsToggle').click();await page.locator('#raceToolsGarage').click();
    await page.locator('[data-garage-section="body"]').click();await page.locator('[data-garage-part="body"][data-garage-value="kart"]').click();
    await page.locator('[data-garage-section="tires"]').click();await page.locator('[data-garage-part="tires"][data-garage-value="narrow"]').click();
    await page.locator('#settingsClose').click();if(await page.locator('#racePhoneToolsToggle').getAttribute('aria-expanded')==='true')await page.locator('#racePhoneToolsToggle').click();
    const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done===true&&document.querySelector('#raceCoachSetupStart')?.getBoundingClientRect().width>0);
    await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run');
    const gas=page.locator('#padR [data-id="gas"]');await gas.scrollIntoViewIfNeeded();const box=await gas.boundingBox();await page.keyboard.down('b');await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.brake===true);
    await page.mouse.move(box.x+box.width/2,box.y+box.height*(kind==='low'?.45:.06));await page.mouse.down();
    if(kind==='low'){
      await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.45&&window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas<.72);await page.keyboard.up('b');await page.waitForTimeout(450);
      const state=await page.evaluate(()=>({d:window.__KICKLAB_RACE_3D__?.dynamics,fx:window.__KICKLAB_RACE_FX__}));gate('below-band launch stays ordinary acceleration',state.d.v>0&&state.fx.audit.launch.starts===0&&state.fx.tireEvent!=='launch',state);report.samples.lowLaunch=state;
    }else{
      await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.launch?.reason==='brake-held-rev-band');await page.mouse.move(box.x+box.width/2,box.y+box.height*.92,{steps:5});await page.waitForTimeout(500);await page.keyboard.up('b');
      await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.launch?.reason==='launch-window-expired');await page.mouse.move(box.x+box.width/2,box.y+box.height*.06,{steps:5});await page.waitForTimeout(450);
      const state=await page.evaluate(()=>({d:window.__KICKLAB_RACE_3D__?.dynamics,fx:window.__KICKLAB_RACE_FX__}));gate('late release cannot trigger launch smoke',state.d.v>0&&state.fx.audit.launch.starts===0&&state.fx.tireEvent!=='launch',state);report.samples.lateLaunch=state;
    }
    await page.mouse.up();
  }finally{await run.context.close();}
}
async function rackCase(){
  const run=await open();try{
    const {page}=run;await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run');
    const start=await snapshot(page);gate('finish handbrake absent outside final approach',start.rack?.available==='nos'&&!start.rack.available.includes('handbrake'),start);
    const gas=page.locator('#padR [data-id="gas"]');await gas.scrollIntoViewIfNeeded();const box=await gas.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height*.3);await page.mouse.down();
    await page.waitForFunction(()=>document.querySelector('#raceSpecialRack')?.dataset.available==='handbrake,nos',null,{timeout:30000});
    const approach=await snapshot(page);gate('final approach automatically prioritizes eligible handbrake',approach.rack?.selected==='handbrake'&&approach.dynamics.v>=13&&approach.dynamics.x<240,approach);
    await page.mouse.up();await page.locator('#raceSpecialNext').click();const next=await snapshot(page);gate('rack Next cycles to eligible NOS',next.rack?.selected==='nos'&&next.rack?.available==='handbrake,nos',next);
    await page.keyboard.press('ArrowLeft');const keyboard=await snapshot(page);gate('rack keyboard arrow restores handbrake and focus',keyboard.rack?.selected==='handbrake'&&await page.locator('#raceSpecialAction').evaluate(button=>button===document.activeElement),keyboard);
    const rackBox=await page.locator('#raceSpecialAction').boundingBox();await page.mouse.move(rackBox.x+rackBox.width*.75,rackBox.y+rackBox.height/2);await page.mouse.down();await page.mouse.move(rackBox.x+rackBox.width*.2,rackBox.y+rackBox.height/2,{steps:3});await page.mouse.up();
    const swipe=await snapshot(page);gate('horizontal swipe cycles without triggering hidden special input',swipe.rack?.selected==='nos'&&!swipe.dynamics.inputs.drift&&swipe.telemetry.nosPulse===0,swipe);
    await page.locator('#raceSpecialPrevious').click();const handbrake=page.locator('#raceSpecialAction');const holdBox=await handbrake.boundingBox();await page.mouse.move(holdBox.x+holdBox.width/2,holdBox.y+holdBox.height/2);await page.mouse.down();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.drift===true);const held=await snapshot(page);await page.mouse.up();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.drift===false);gate('rack handbrake holds and releases canonical input',held.dynamics.inputs.drift===true&&!(await snapshot(page)).dynamics.inputs.drift,held);
    report.samples.rack={start,approach,next,keyboard,swipe,held};
  }finally{await run.context.close();}
}
async function powerStopCase(){
  const run=await open();try{
    const {page}=run;await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run');
    await page.keyboard.down('Space');const shift=page.locator('#padR [data-id="instrument-shift"]');await shift.waitFor({state:'visible'});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.v*3.6>=50,null,{timeout:20000});await shift.click();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.v*3.6>=95,null,{timeout:20000});await shift.click();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='done',null,{timeout:25000});const crossed=await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.signatureFinish);gate('real full-throttle finish enters canonical power-stop brake window',crossed?.kind==='power-stop'&&crossed?.phase==='await-brake',crossed);
    await page.keyboard.up('Space');await page.keyboard.down('b');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.signatureFinish?.phase==='cinematic',null,{timeout:500});const stopped=await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.signatureFinish);await page.keyboard.up('b');
    gate('Brake commits earned power-stop cinematic',stopped?.kind==='power-stop'&&stopped?.phase==='cinematic'&&stopped?.reason==='earned',stopped);const post=await snapshot(page);gate('special rack disappears after finish',post.rack===null,post);report.samples.powerStop={crossed,stopped,post};
  }finally{await run.context.close();}
}
async function driftCase(){
  const run=await open();try{
    const {page}=run;await page.locator('#racePhoneToolsToggle').click();await page.locator('#raceToolsGarage').click();await page.locator('[data-race-mode="drift"]').click();await page.locator('#settingsClose').click();
    if(await page.locator('#racePhoneToolsToggle').getAttribute('aria-expanded')==='true')await page.locator('#racePhoneToolsToggle').click();
    const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done===true&&document.querySelector('#raceCoachSetupStart')?.getBoundingClientRect().width>0);
    await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run');const initial=await snapshot(page);
    gate('Drift mode anchors handbrake and removes Drag Shift',initial.drift?.includes('Handbrake')&&!initial.shift&&initial.rack?.available==='nos',initial);
    await page.waitForFunction(()=>window.__KICKLAB_RACE_FX__?.audit?.launch?.reason==='wrong-mode');gate('Drag-only launch contract rejects Drift mode',await page.evaluate(()=>window.__KICKLAB_RACE_FX__?.audit?.launch?.starts===0),await page.evaluate(()=>window.__KICKLAB_RACE_FX__?.audit?.launch));
    await page.keyboard.down('Space');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.x>=60,null,{timeout:15000});await page.keyboard.up('Space');
    await page.keyboard.down('b');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.v<=12,null,{timeout:5000});await page.keyboard.up('b');
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.x>=90,null,{timeout:5000});await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');
    const drift=page.locator('#padR [data-id="drift"]');await drift.scrollIntoViewIfNeeded();const box=await drift.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.mode==='drift'&&document.querySelector('#padR [data-id="drift"]')?.getAttribute('aria-label')?.includes('controlled drift'),null,{timeout:2500});const controlled=await snapshot(page);
    gate('real handbrake and steering produce controlled slip angle',controlled.dynamics.mode==='drift'&&controlled.dynamics.inputs.drift===true&&controlled.drift?.match(/drift angle ([7-9]|[12][0-9]|3[0-2]) degrees/),controlled);
    await page.mouse.up();await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.mode==='none'&&document.querySelector('#padR [data-id="drift"]')?.getAttribute('aria-label')?.includes('drift angle 0 degrees'),null,{timeout:2500});const recovered=await snapshot(page);
    gate('release and steering unwind recover grip without spin',recovered.dynamics.mode==='none'&&!recovered.dynamics.inputs.drift&&recovered.drift?.includes('drift angle 0 degrees'),recovered);report.samples.drift={initial,controlled,recovered};
  }finally{await run.context.close();}
}
async function resilienceCase(){
  const run=await open({reduced:true});try{
    const {page}=run;await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run');
    const reduced=await snapshot(page);gate('reduced motion preserves live 3D instruments',reduced.renderer==='rendering'&&reduced.vehicle&&reduced.rack?.selected==='nos'&&await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.reducedMotion===true),reduced);
    const choose=async selector=>{await page.locator('#racePhoneToolsToggle').click();await page.locator(selector).click();await page.locator('#racePhoneToolsToggle').click();await page.waitForFunction(()=>document.querySelector('#raceSpecialRack')?.hidden===false);};
    await choose('#analogControlsButton');const analog=await page.evaluate(()=>({analog:document.querySelector('#analogControlsButton')?.getAttribute('aria-pressed'),rack:document.querySelector('#raceSpecialRack')?.hidden,gas:window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas}));
    gate('Analog switch keeps canonical special rack available',analog.analog==='true'&&analog.rack===false&&!analog.gas,analog);
    await choose('#simulatorControlsButton');const simulator=await page.evaluate(()=>({pressed:document.querySelector('#simulatorControlsButton')?.getAttribute('aria-pressed'),rackHidden:document.querySelector('#raceSpecialRack')?.hidden,gas:window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas}));
    gate('Simulator switch keeps canonical special rack available',simulator.pressed==='true'&&simulator.rackHidden===false&&!simulator.gas,simulator);
    await choose('#classicControlsButton');const classic=await page.evaluate(()=>({pressed:document.querySelector('#classicControlsButton')?.getAttribute('aria-pressed'),rackHidden:document.querySelector('#raceSpecialRack')?.hidden,gas:window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas}));
    gate('Classic return restores anchored controls without stuck Gas',classic.pressed==='true'&&classic.rackHidden===false&&!classic.gas&&await page.locator('#padR [data-id="gas"]').isVisible(),classic);
    await page.keyboard.press('p');await page.waitForFunction(()=>document.querySelector('#raceSpecialRack')?.hidden===true);const paused=await snapshot(page);gate('manual pause removes live special controls',paused.rack===null,paused);
    await page.keyboard.press('p');await page.waitForFunction(()=>document.querySelector('#raceSpecialRack')?.hidden===false);gate('resume restores canonical special controls',(await snapshot(page)).rack?.selected==='nos',await snapshot(page));
    report.samples.resilience={reduced,analog,simulator,classic,paused};
  }finally{await run.context.close();}
  const fallback=await open({assetFailure:true});try{
    const {page}=fallback,state=await snapshot(page),decorated=await page.locator('#padR [data-instrument]').count();gate('asset failure keeps Canvas fallback and hides 3D instruments',state.renderer==='canvas-fallback'&&state.rack===null&&decorated===0,{state,decorated});report.samples.fallback=state;
  }finally{await fallback.context.close();}
}
let active;
try{
  const off=await open({flag:false});await off.page.locator('#raceCoachSetupStart').click();try{await off.page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:20000});}catch(error){report.samples.offStart=await snapshot(off.page);await off.page.screenshot({path:join(out,'off-start-failure.png')});throw error;}
  const offState=await snapshot(off.page);gate('explicit flag keeps instruments off',!offState.shift&&!offState.nos&&!offState.rack&&!off.page.url().includes('raceInstruments='),offState);await off.context.close();
  await resilienceCase();

  active=await open({record:true});report.url=active.url;const {page}=active;
  await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run'&&window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.vehicle===true,null,{timeout:20000});
  await page.locator('#padR [data-id="instrument-shift"]').waitFor({state:'visible'});
  const start=await snapshot(page);report.samples.start=start;
  gate('live 3D Drag instruments read canonical state',start.gas?.includes('RPM')&&start.shift?.includes('Shift to gear 2')&&start.rack?.selected==='nos'&&start.rack?.label?.includes('NOS')&&start.renderer==='rendering'&&start.vehicle,start);
  const gas=page.locator('#padR [data-id="gas"]');await gas.scrollIntoViewIfNeeded();const box=await gas.boundingBox();gate('Gas touch target is visible and at least 44 px',box.width>=44&&box.height>=44&&box.y>=0&&box.y+box.height<=844,box);
  await page.mouse.move(box.x+box.width/2,box.y+5);await page.mouse.down();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.8);const high=await snapshot(page);report.samples.high=high;
  await page.mouse.move(box.x+box.width/2,box.y+box.height-5,{steps:6});await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas<=.2);const low=await snapshot(page);report.samples.low=low;
  gate('vertical Gas pointer changes real throttle up and down',high.dynamics.inputs.gas>=.8&&low.dynamics.inputs.gas<=.2&&high.dynamics.inputs.gas>low.dynamics.inputs.gas,{high:high.dynamics,low:low.dynamics});
  await page.mouse.up();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);gate('pointerup releases Gas',!(await snapshot(page)).dynamics.inputs.gas,await snapshot(page));
  const cdp=await active.context.newCDPSession(page),touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1,radiusX:4,radiusY:4,force:1}]});
  await touch('touchStart',box.x+box.width/2,box.y+5);await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.8);await touch('touchCancel',box.x+box.width/2,box.y+5);await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);gate('pointercancel releases Gas',!(await snapshot(page)).dynamics.inputs.gas,await snapshot(page));
  await gas.focus();await page.keyboard.press('ArrowUp');await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>0);await page.locator('#racePhoneToolsToggle').focus();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);gate('keyboard focus loss releases Gas',!(await snapshot(page)).dynamics.inputs.gas,await snapshot(page));
  await page.mouse.move(box.x+box.width/2,box.y+5);await page.mouse.down();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.8);
  const captured=await gas.evaluate(button=>button.hasPointerCapture(1));gate('Gas captures its active pointer',captured,{captured});
  await gas.evaluate(button=>button.releasePointerCapture(1));await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);await page.mouse.up();gate('lost pointer capture releases Gas',!(await snapshot(page)).dynamics.inputs.gas,await snapshot(page));
  await page.mouse.move(box.x+box.width/2,box.y+5);await page.mouse.down();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>=.8);await page.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);await page.mouse.up();gate('orientation change releases Gas',!(await snapshot(page)).dynamics.inputs.gas,await snapshot(page));
  await gas.focus();await page.keyboard.press('ArrowUp');await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas>0);await page.locator('#racePhoneToolsToggle').click();await waitInput(page,()=>window.__KICKLAB_RACE_3D__?.dynamics?.inputs?.gas===false);gate('wrench expansion releases Gas and hides play instruments',!(await snapshot(page)).dynamics.inputs.gas&&!(await page.locator('#padR [data-id="instrument-shift"]').isVisible()),await snapshot(page));
  await page.locator('#racePhoneToolsToggle').click();await page.locator('#padR [data-id="instrument-shift"]').waitFor({state:'visible'});gate('closing wrench restores Shift',await page.locator('#padR [data-id="instrument-shift"]').isVisible(),await snapshot(page));
  const layout=[];for(const width of [360,390,768,1113,1440]){await page.setViewportSize({width,height:width<=390?844:width===768?1024:900});await gas.scrollIntoViewIfNeeded();layout.push(await page.evaluate(()=>{const stage=document.querySelector('.stage'),rect=stage.getBoundingClientRect(),buttons=[...document.querySelectorAll('#padR .abtn:not([hidden])')].filter(button=>getComputedStyle(button).display!=='none').map(button=>{const r=button.getBoundingClientRect();return{id:button.dataset.id,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}),rack=document.querySelector('#raceSpecialAction').getBoundingClientRect();return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,stage:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},buttons,rack:{left:rack.left,right:rack.right,top:rack.top,bottom:rack.bottom,width:rack.width,height:rack.height}};}));}
  report.samples.layout=layout;gate('Classic anchored targets and rack fit at phone through desktop widths',layout.every(({width,scrollWidth,stage,buttons,rack})=>scrollWidth<=width+1&&buttons.length>=3&&buttons.every(button=>button.width>=44&&button.height>=44&&button.x>=stage.left-1&&button.right<=stage.right+1&&button.y>=stage.top-1&&button.bottom<=stage.bottom+1)&&rack.width>=44&&rack.height>=44&&rack.left>=stage.left-1&&rack.right<=stage.right+1&&rack.top>=stage.top-1&&rack.bottom<=Math.min(...buttons.map(button=>button.y))-1),layout);
  await page.locator('.stage:visible').first().screenshot({path:join(out,'classic-live.png')});
  await active.context.close();active=null;
  await shiftCase('early',0,'early');
  await shiftCase('optimal',50,'optimal');
  await shiftCase('late',78,'late');
  await nosCase();
  await nosDrainCase();
  await launchCase();
  await launchNegativeCase('low');
  await launchNegativeCase('late');
  await rackCase();
  await powerStopCase();
  await driftCase();
}catch(error){report.errors.push(error.stack||String(error));}
finally{if(active)await active.context.close();await browser.close();}
report.checks.push({name:'zero external requests',pass:report.external.length===0,detail:report.external});
report.checks.push({name:'no browser errors',pass:report.errors.length===0,detail:report.errors});
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,checks:report.checks.length,failed:report.checks.filter(check=>!check.pass),errors:report.errors,external:report.external,out},null,2));
if(report.checks.some(check=>!check.pass))process.exitCode=1;
