/* Trusted-origin, explicit opt-in Race simulator controller. No sensor samples are stored. */
const RACE_SIMULATOR={active:false,sensorReady:false,permission:'idle',steer:0,center:null,lastAngle:null,brake:false,gas:false,revTaps:0,releaseAt:0,launchQueued:false,pointers:new Map(),lastPaint:0,lastPhase:'grid',nosHoldTimer:0,mastered:{launch:false,shift:false,drift:false,nos:false}};
const SIM_MATH=globalThis.KickLabRaceSimulatorMath;
const simFlag=RACE_MODES.enabled()&&new URLSearchParams(location.search).get('raceSimulator')==='prototype';
const simButton=$('#simulatorControlsButton'),simPanel=$('#raceSimulator'),simStatus=$('#simStatus');
simButton.hidden=!simFlag;
function simAllowed(){return simFlag&&M===Race&&!PAUSE.on&&!RP.on&&!CINE.on&&!document.hidden&&!$('#game-cockpit').hidden;}
function simMessage(message){$('#simStatusDetail').textContent=message;simStatus.textContent=/NOS fired/.test(message)?'NOS fired':/Handbrake pulled/.test(message)?'Drift on':/Handbrake released/.test(message)?'Drift off':/denied/.test(message)?'Tilt denied':/unavailable/.test(message)?'Tilt unavailable':/recenter|Recenter|Orientation changed/.test(message)?'Recenter':/Lights running/.test(message)?'Lights':/paused|Paused/.test(message)?'Paused':/resumed/.test(message)?'Resumed':/Tilt steering/.test(message)?`Tilt ${Math.round(RACE_SIMULATOR.steer*100)}%`:/Enable tilt/.test(message)?'Tilt off':message.split(/[.·]/)[0].trim().slice(0,20);}
function simGuide(){
  const s=RACE_SIMULATOR,mode=Race.mode().id,phase=Race.state;
  let key='',message='',detail='',icon='';
  if(phase==='count'&&!s.mastered.launch){key='launch';message='Hold · tap · release';detail='Hold brake, tap throttle three times, then release brake at green while holding throttle.';icon='brake';}
  else if(phase==='run'&&mode==='endurance'&&Race.modeAttempt){const heat=Race.telemetry?.heat||0;key='heat';message=heat>=.91?'Critical · lift':Race.telemetry?.overheat?'Power low · cool':heat>=.76?'Hot · ease off':heat>=.58?'Warm · pace':'Hold a steady lap';detail=`Lap ${Math.min(3,Race.modeAttempt.laps+1)} of 3. Heat ${Math.round(heat*100)} percent. ${Race.telemetry?.overheat||heat>=.76?'Lift to cool before NOS.':'Balance corner grip and throttle.'}`;icon='boost';}
  else if(phase==='run'&&mode==='drag'&&!s.mastered.shift&&Race.modeAttempt&&Race.st.v/Math.max(1,Race.P().top)>=[.27,.49,.73][Math.min(2,Race.modeAttempt.gear-1)]-.12){key='shift';message='Shift in band';detail='Tap a shift paddle when RPM reaches the shift band.';icon='paddle';}
  else if(phase==='run'&&mode==='drift'&&!s.mastered.drift&&Race.st.v>8){key='drift';message='Pull to drift';detail='Pull the handbrake lever down to begin a controlled drift.';icon='lever';}
  else if(phase==='run'&&!s.mastered.nos&&Race.st.v>8&&Race.telemetry?.pressure>=.25){key='nos';message='Flick up';detail='Flick upward from the throttle pedal to fire NOS.';icon='boost';}
  const coach=$('#simCoach');coach.hidden=!key;coach.dataset.guide=key;$('#simCoachText').textContent=message;$('#simCoachDetail').textContent=detail;coach.querySelector('.sim-coach-motion use').setAttribute('href',`#sim-ico-${icon||'boost'}`);
}
function simPaint(){
  if(!simFlag)return;
  const phase=Race.state==='grid'?'setup':Race.mode().id==='endurance'&&Race.progressionComparison&&['done','crashed'].includes(Race.state)?'result':'live';simPanel.dataset.phase=phase;simPanel.dataset.mode=Race.mode().id;$('#simTitle').textContent=phase==='setup'?'SIM · Setup':'SIM · '+Race.mode().name;
  if(RACE_SIMULATOR.active&&Race.state==='run'&&RACE_SIMULATOR.lastPhase!=='run')simMessage(RACE_SIMULATOR.sensorReady?'Tilt steering live.':'Tilt inactive · Controls offers Classic or Analog.');
  RACE_SIMULATOR.lastPhase=Race.state;
  simGuide();
  const now=performance.now();if(now-RACE_SIMULATOR.lastPaint<125)return;RACE_SIMULATOR.lastPaint=now;
  $('#simWheel').style.setProperty('--sim-turn',`${Math.round(RACE_SIMULATOR.steer*70)}deg`);
  const a=Race.modeAttempt,drag=Race.expansionActive()&&Race.mode().id==='drag',ratio=a?Race.st.v/Math.max(1,Race.P().top):0;
  const band=a&&a.gear<4?[.27,.49,.73][a.gear-1]:1;
  $('#simGear').textContent=drag&&a?`G${a.gear} · ${Math.round(ratio*100)}% · ${ratio<band-.1?'wait':ratio>band+.07?'late':'shift'}`:Race.mode().id==='endurance'&&a?`L${Math.min(3,a.laps+1)}/3`:`Tilt ${Math.round(RACE_SIMULATOR.steer*100)}%`;
  const launch=$('#simLaunch');launch.textContent=Race.state==='run'?(drag?'Shift · flick ↑':Race.mode().id==='drift'?'Steer · pull ↓':'Tilt · flick ↑'):RACE_SIMULATOR.revTaps>=3?'Release at green':`Brake · tap ×${Math.max(0,3-RACE_SIMULATOR.revTaps)} · release`;launch.setAttribute('aria-label',Race.state==='run'?(drag?'Hold throttle, shift in the band, flick up from throttle for NOS':Race.mode().id==='drift'?'Steer through the curve and pull the handbrake to drift':'Hold throttle, steer by tilt, flick up from throttle for NOS'):'Hold brake, tap throttle three times, then release brake at green while holding throttle');
}
function simCancel(reason='Input cancelled',stopSensor=false){
  if(!simFlag)return;
  clearTimeout(RACE_SIMULATOR.nosHoldTimer);RACE_SIMULATOR.nosHoldTimer=0;
  for(const id of ['gas','brake','drift','nitro'])gameInput(id,false,'simulator');
  RACE_SIMULATOR.pointers.clear();RACE_SIMULATOR.brake=false;RACE_SIMULATOR.gas=false;RACE_SIMULATOR.revTaps=0;RACE_SIMULATOR.launchQueued=false;RACE_SIMULATOR.releaseAt=0;RACE_SIMULATOR.steer=0;
  simPanel.querySelectorAll('.on').forEach(node=>node.classList.remove('on'));
  if(stopSensor){window.removeEventListener('deviceorientation',simOrientation);RACE_SIMULATOR.sensorReady=false;RACE_SIMULATOR.center=null;RACE_SIMULATOR.lastAngle=null;}
  simMessage(reason);simPaint();
}
function simSelect(on){
  if(!simFlag)return;
  simCancel('Controls changed',true);cancelAnalog('Controls changed');cancelGesture('Controls changed');
  $('#simAccess').open=false;
  if(on){setPrototypeControls(false);RACE_SIMULATOR.active=true;floatingControlDeck.classList.add('simulator-active');simPanel.hidden=false;simButton.setAttribute('aria-pressed','true');classicControlsButton.setAttribute('aria-pressed','false');simMessage('Enable tilt, then recenter at a comfortable hold.');}
  else{RACE_SIMULATOR.active=false;floatingControlDeck.classList.remove('simulator-active');simPanel.hidden=true;simButton.setAttribute('aria-pressed','false');classicControlsButton.setAttribute('aria-pressed','true');}
  simPaint();
}
function simOrientation(event){
  if(!simAllowed()||!RACE_SIMULATOR.active)return;
  const angle=SIM_MATH.axis(event.beta,event.gamma,event.angle??screen.orientation?.angle??window.orientation??0);
  if(angle===null)return;
  RACE_SIMULATOR.lastAngle=angle;
  if(RACE_SIMULATOR.center===null)RACE_SIMULATOR.center=angle;
  RACE_SIMULATOR.sensorReady=true;
  RACE_SIMULATOR.steer=SIM_MATH.steering(angle,RACE_SIMULATOR.center,Number($('#simDeadZone').value),Number($('#simSensitivity').value));
  if(performance.now()-RACE_SIMULATOR.lastPaint>125){simMessage(`Tilt steering ${Math.round(RACE_SIMULATOR.steer*100)}%. Recenter at your comfortable hold.`);simPaint();}
}
async function simEnable(){
  if(!simAllowed()||!RACE_SIMULATOR.active)return;
  if(typeof DeviceOrientationEvent==='undefined'){RACE_SIMULATOR.permission='unavailable';simMessage('Tilt unavailable. Use Classic or Analog controls.');return;}
  try{
    const permission=typeof DeviceOrientationEvent.requestPermission==='function'?await DeviceOrientationEvent.requestPermission():'granted';
    if(permission!=='granted'){RACE_SIMULATOR.permission='denied';simMessage('Tilt denied. Use Classic or Analog controls.');return;}
    RACE_SIMULATOR.permission='granted';window.removeEventListener('deviceorientation',simOrientation);window.addEventListener('deviceorientation',simOrientation,{passive:true});simMessage('Hold the device naturally; first reading sets center.');
  }catch(_){RACE_SIMULATOR.permission='denied';simMessage('Tilt permission unavailable. Use Classic or Analog controls.');}
}
function simInput(id,down){if(!simAllowed()||!RACE_SIMULATOR.active)return;
  const s=RACE_SIMULATOR,now=performance.now();
  if(id==='nitro'&&down&&RACE_TELEMETRY.enabled){if(Race.state!=='run'){simMessage('NOS is ready when the run begins.');return false;}const fired=RACE_TELEMETRY.activateNos(Race.telemetry);if(fired){s.mastered.nos=true;simGuide();renderRaceTelemetry();requestMobileHaptic('tick');simMessage('NOS fired.');}else simMessage('NOS unavailable · build pressure, cool the engine, or wait for the pulse.');return fired;}
  if(id==='brake'){
    s.brake=down;
    if(down){s.revTaps=0;s.launchQueued=false;}
    else if(s.revTaps>=3&&s.gas&&(Race.state==='run'||Race.state==='count')){s.releaseAt=now;s.launchQueued=true;}
  }
  if(id==='gas'){
    if(down&&s.brake&&(Race.state==='grid'||Race.state==='count'))s.revTaps=Math.min(3,s.revTaps+1);
    s.gas=down;
  }
  // Countdown inputs are held in controller state; Race starts its canonical run at green.
  if(Race.state==='count'&&Race.expansionActive()){simPaint();return;}
  if(id==='gas'&&Race.state==='grid')return;
  gameInput(id,down,'simulator');simPaint();
}
function simTick(){
  if(!RACE_SIMULATOR.active)return;
  $('#simResume').hidden=!PAUSE.on;
  if(!simAllowed()){if(RACE_SIMULATOR.sensorReady||RACE_SIMULATOR.brake||RACE_SIMULATOR.gas||RACE_SIMULATOR.pointers.size)simCancel('Simulator paused',true);return;}
  const s=RACE_SIMULATOR;
  if(Race.state==='run'){
    if(s.launchQueued&&performance.now()-s.releaseAt<650&&s.gas&&!s.brake){gameInput('gas',true,'simulator-launch');s.launchQueued=false;s.mastered.launch=true;simGuide();COACH.say('Clean launch. Tires hold better when throttle follows brake release.','tip',3);requestMobileHaptic('perfect');}
    if(s.brake&&!Race.inp.brake)gameInput('brake',true,'simulator');
    if(s.gas&&!s.brake&&!Race.inp.gas)gameInput('gas',true,'simulator');
  }
  simPaint();
}
simButton.addEventListener('click',()=>simSelect(!RACE_SIMULATOR.active));
$('#raceCoachSetupSimulator').hidden=!simFlag;
$('#raceCoachSetupSimulator').addEventListener('click',()=>simSelect(true));
classicControlsButton.addEventListener('click',()=>{if(RACE_SIMULATOR.active)simSelect(false);});
analogControlsButton.addEventListener('click',()=>{if(RACE_SIMULATOR.active)simSelect(false);});
$('#simEnable').addEventListener('click',simEnable);
$('#simLiveEnable').addEventListener('click',simEnable);
$('#simFallbackClassic').addEventListener('click',()=>simSelect(false));
$('#simFallbackAnalog').addEventListener('click',()=>{simSelect(false);setPrototypeControls(true);});
$('#simLiveClassic').addEventListener('click',()=>simSelect(false));
$('#simLiveAnalog').addEventListener('click',()=>{simSelect(false);setPrototypeControls(true);});
function simRecenter(){RACE_SIMULATOR.center=RACE_SIMULATOR.lastAngle;RACE_SIMULATOR.steer=0;simMessage(RACE_SIMULATOR.center===null?RACE_SIMULATOR.permission==='granted'?'Waiting for tilt reading; first reading sets center.':'Enable tilt first.':'Steering recentered.');simPaint();}
$('#simRecenter').addEventListener('click',simRecenter);
$('#simLiveRecenter').addEventListener('click',simRecenter);
for(const [id,suffix] of [['simDeadZone','°'],['simSensitivity','×']])$('#'+id).addEventListener('input',event=>{$('#'+id+'Value').textContent=event.target.value+suffix;});
$('#simStart').addEventListener('click',()=>{if(!simAllowed()||Race.state!=='grid')return;Race.coachStartRequested=true;Race.press('gas',true);Race.press('gas',false);simMessage('Lights running · hold brake, tap throttle 3×, release at green.');simPaint();});
$('#simResume').addEventListener('click',()=>{if(resumeGame())simMessage('Play resumed. Enable tilt and recenter.');else simMessage('Close the active panel, then resume play.');});
for(const [element,id] of [['simBrake','brake'],['simGas','gas']]){
  const button=$('#'+element),up=(event,cancelled=false)=>{
    const held=RACE_SIMULATOR.pointers.get(element);if(!held)return;
    event?.preventDefault();RACE_SIMULATOR.pointers.delete(element);button.classList.remove('on');
    if(id==='gas'&&!cancelled&&held!=='keyboard'&&Race.state==='run'&&SIM_MATH.gesture(held.y,event.clientY,performance.now()-held.t,'nos')){
      const fired=simInput('nitro',true);if(fired){RACE_SIMULATOR.nosHoldTimer=setTimeout(()=>{if(!RACE_SIMULATOR.pointers.has(element))simInput('gas',false);RACE_SIMULATOR.nosHoldTimer=0;},450);return;}
    }
    simInput(id,false);
  };
  button.addEventListener('pointerdown',event=>{if(RACE_SIMULATOR.pointers.has(element)||!simAllowed())return;event.preventDefault();event.stopPropagation();unlock();clearTimeout(RACE_SIMULATOR.nosHoldTimer);RACE_SIMULATOR.nosHoldTimer=0;RACE_SIMULATOR.pointers.set(element,{id:event.pointerId,y:event.clientY,t:performance.now()});button.classList.add('on');button.setPointerCapture(event.pointerId);simInput(id,true);});
  button.addEventListener('pointerup',event=>{const held=RACE_SIMULATOR.pointers.get(element);if(held?.id===event.pointerId)up(event);});
  for(const type of ['pointercancel','lostpointercapture'])button.addEventListener(type,event=>{const held=RACE_SIMULATOR.pointers.get(element);if(held?.id===event.pointerId)up(event,true);});
  button.addEventListener('keydown',event=>{if((event.key===' '||event.key==='Enter')&&!event.repeat){event.preventDefault();RACE_SIMULATOR.pointers.set(element,'keyboard');button.classList.add('on');simInput(id,true);}});
  button.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter')up(event);});button.addEventListener('blur',event=>up(event,true));
}
const handbrake=$('#simHandbrake');
handbrake.addEventListener('pointerdown',event=>{if(!simAllowed())return;event.preventDefault();event.stopPropagation();RACE_SIMULATOR.pointers.set('simHandbrake',{id:event.pointerId,y:event.clientY,t:performance.now()});handbrake.setPointerCapture(event.pointerId);});
handbrake.addEventListener('pointerup',event=>{const start=RACE_SIMULATOR.pointers.get('simHandbrake');if(!start||start.id!==event.pointerId)return;event.preventDefault();RACE_SIMULATOR.pointers.delete('simHandbrake');if(handbrake.classList.contains('on')&&Math.abs(event.clientY-start.y)<20){simInput('drift',false);handbrake.classList.remove('on');simMessage('Handbrake released.');return;}if(SIM_MATH.gesture(start.y,event.clientY,performance.now()-start.t,'handbrake')){simInput('drift',true);handbrake.classList.add('on');RACE_SIMULATOR.mastered.drift=true;simGuide();simMessage('Handbrake pulled · drift engaged. Tap to release.');requestMobileHaptic('tick');}});
for(const type of ['pointercancel','lostpointercapture'])handbrake.addEventListener(type,()=>{if(!RACE_SIMULATOR.pointers.has('simHandbrake'))return;RACE_SIMULATOR.pointers.delete('simHandbrake');if(handbrake.classList.contains('on')){simInput('drift',false);handbrake.classList.remove('on');}});
handbrake.addEventListener('click',event=>{if(event.detail!==0||!simAllowed())return;const on=!handbrake.classList.contains('on');simInput('drift',on);handbrake.classList.toggle('on',on);if(on){RACE_SIMULATOR.mastered.drift=true;simGuide();}});
handbrake.addEventListener('keydown',event=>{if(![' ','Enter'].includes(event.key)||event.repeat||!simAllowed())return;event.preventDefault();const on=!handbrake.classList.contains('on');simInput('drift',on);handbrake.classList.toggle('on',on);if(on){RACE_SIMULATOR.mastered.drift=true;simGuide();}});
$('#simNos').addEventListener('click',()=>simInput('nitro',true));
for(const [element,direction] of [['simShiftDown',-1],['simShiftUp',1]])$('#'+element).addEventListener('click',()=>{if(!simAllowed()||!RACE_SIMULATOR.active)return;const changed=direction>0?Race.shiftGear():Race.downshiftGear();if(changed){RACE_SIMULATOR.mastered.shift=true;simGuide();requestMobileHaptic('tick');simPaint();}else simMessage(direction>0?'Shift unavailable until the gearbox recovers or the next run.':'Downshift unavailable in first gear or during gearbox recovery.');});
window.addEventListener('keydown',event=>{if(!RACE_SIMULATOR.active||!simAllowed()||event.repeat||!['Comma','Period','KeyN'].includes(event.code)||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;event.preventDefault();if(event.code==='Period')$('#simShiftUp').click();else if(event.code==='Comma')$('#simShiftDown').click();else simInput('nitro',true);});
window.addEventListener('resize',()=>{if(RACE_SIMULATOR.active&&(RACE_SIMULATOR.permission==='granted'||RACE_SIMULATOR.sensorReady||RACE_SIMULATOR.pointers.size))simCancel('Orientation changed. Tap Tilt, then Center.',true);});
window.addEventListener('orientationchange',()=>{if(RACE_SIMULATOR.active)simCancel('Orientation changed. Enable tilt and recenter.',true);});
window.addEventListener('blur',()=>simCancel('Focus lost. Tap Tilt, then Center.',true));window.addEventListener('pagehide',()=>simCancel('Page hidden. Tap Tilt, then Center.',true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)simCancel('Page hidden. Tap Tilt, then Center.',true);});
new MutationObserver(()=>{if(RACE_SIMULATOR.active&&M!==Race)simSelect(false);}).observe(document.documentElement,{attributes:true,attributeFilter:['data-kicklab-mode']});
globalThis.__KICKLAB_RACE_SIMULATOR_QA__=simFlag?Object.freeze({state:()=>({active:RACE_SIMULATOR.active,permission:RACE_SIMULATOR.permission,sensorReady:RACE_SIMULATOR.sensorReady,steer:RACE_SIMULATOR.steer,revTaps:RACE_SIMULATOR.revTaps,inputs:{...Race.inp},gear:Race.modeAttempt?.gear,phase:simPanel.dataset.phase,guide:$('#simCoach').dataset.guide,mastered:{...RACE_SIMULATOR.mastered},nosPulse:Race.telemetry?.nosPulse,selectedGauge:Race.telemetry?.selected,driftMode:Race.st?.driftMode}),orientation:(beta,gamma,angle=0)=>simOrientation({beta,gamma,angle}),input:simInput,selectGauge:id=>{if(!RACE_TELEMETRY.GAUGES.some(g=>g.id===id)||!Race.telemetry)return false;Race.telemetry.selected=id;Race.telemetry.manualUntil=Race.telemetry.clock+7;renderRaceTelemetry();return true;},reset:()=>{hideResults();Race.reset();RACE_3D.orbit.phase='done';RACE_3D.orbit.done=true;renderActions();renderRaceTelemetry();},selectMode:id=>Race.selectMode(id),pause:()=>pauseGame('stage'),cancel:simCancel}):undefined;
