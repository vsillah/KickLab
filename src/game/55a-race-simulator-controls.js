/* Trusted-origin, explicit opt-in Race simulator controller. No sensor samples are stored. */
const RACE_SIMULATOR={active:false,sensorReady:false,permission:'idle',steer:0,center:null,lastAngle:null,brake:false,gas:false,revTaps:0,releaseAt:0,launchQueued:false,pointers:new Map(),lastPaint:0};
const SIM_MATH=globalThis.KickLabRaceSimulatorMath;
const simFlag=RACE_MODES.enabled()&&new URLSearchParams(location.search).get('raceSimulator')==='prototype';
const simButton=$('#simulatorControlsButton'),simPanel=$('#raceSimulator'),simStatus=$('#simStatus');
simButton.hidden=!simFlag;
function simAllowed(){return simFlag&&M===Race&&!PAUSE.on&&!RP.on&&!CINE.on&&!document.hidden&&!$('#game-cockpit').hidden;}
function simMessage(message){simStatus.textContent=message;}
function simPaint(){
  if(!simFlag)return;
  const now=performance.now();if(now-RACE_SIMULATOR.lastPaint<125)return;RACE_SIMULATOR.lastPaint=now;
  $('#simWheel').style.setProperty('--sim-turn',`${Math.round(RACE_SIMULATOR.steer*70)}deg`);
  const a=Race.modeAttempt,drag=Race.expansionActive()&&Race.mode().id==='drag',ratio=a?Race.st.v/Math.max(1,Race.P().top):0;
  const band=a&&a.gear<4?[.27,.49,.73][a.gear-1]:1;
  $('#simGear').textContent=drag&&a?`Gear ${a.gear} · ${Math.round(ratio*100)}% RPM · ${ratio<band-.1?'wait':ratio>band+.07?'late':'shift band'}`:'Paddles · Drag mode';
  $('#simLaunch').textContent=RACE_SIMULATOR.revTaps>=3?'Launch armed · release brake while holding throttle at green':`Launch: hold brake, tap throttle ${Math.max(0,3-RACE_SIMULATOR.revTaps)} more times, then hold it and release brake at green.`;
}
function simCancel(reason='Input cancelled',stopSensor=false){
  if(!simFlag)return;
  for(const id of ['gas','brake','drift','nitro'])gameInput(id,false,'simulator');
  RACE_SIMULATOR.pointers.clear();RACE_SIMULATOR.brake=false;RACE_SIMULATOR.gas=false;RACE_SIMULATOR.revTaps=0;RACE_SIMULATOR.launchQueued=false;RACE_SIMULATOR.releaseAt=0;RACE_SIMULATOR.steer=0;
  simPanel.querySelectorAll('.on').forEach(node=>node.classList.remove('on'));
  if(stopSensor){window.removeEventListener('deviceorientation',simOrientation);RACE_SIMULATOR.sensorReady=false;RACE_SIMULATOR.center=null;RACE_SIMULATOR.lastAngle=null;}
  simMessage(reason);simPaint();
}
function simSelect(on){
  if(!simFlag)return;
  simCancel('Controls changed',true);cancelAnalog('Controls changed');cancelGesture('Controls changed');
  if(on){setPrototypeControls(false);RACE_SIMULATOR.active=true;floatingControlDeck.classList.add('simulator-active');simPanel.hidden=false;simButton.setAttribute('aria-pressed','true');classicControlsButton.setAttribute('aria-pressed','false');simMessage('Enable tilt from this button. Only steering angles are read in memory.');}
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
  if(id==='nitro'&&down&&RACE_TELEMETRY.enabled){const fired=RACE_TELEMETRY.activateNos(Race.telemetry);if(fired){renderRaceTelemetry();requestMobileHaptic('tick');}else simMessage('NOS unavailable · build pressure, cool the engine, or wait for the pulse.');return fired;}
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
    if(s.launchQueued&&performance.now()-s.releaseAt<650&&s.gas&&!s.brake){gameInput('gas',true,'simulator-launch');s.launchQueued=false;COACH.say('Clean launch. Tires hold better when throttle follows brake release.','tip',3);requestMobileHaptic('perfect');}
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
$('#simFallbackClassic').addEventListener('click',()=>simSelect(false));
$('#simFallbackAnalog').addEventListener('click',()=>{simSelect(false);setPrototypeControls(true);});
$('#simRecenter').addEventListener('click',()=>{RACE_SIMULATOR.center=RACE_SIMULATOR.lastAngle;RACE_SIMULATOR.steer=0;simMessage(RACE_SIMULATOR.center===null?'Enable tilt first.':'Steering recentered.');simPaint();});
for(const [id,suffix] of [['simDeadZone','°'],['simSensitivity','×']])$('#'+id).addEventListener('input',event=>{$('#'+id+'Value').textContent=event.target.value+suffix;});
$('#simStart').addEventListener('click',()=>{if(!simAllowed()||Race.state!=='grid')return;Race.coachStartRequested=true;Race.press('gas',true);Race.press('gas',false);simMessage('Lights running. Hold brake, tap throttle three times, then hold throttle.');});
$('#simResume').addEventListener('click',()=>{if(resumeGame())simMessage('Play resumed. Enable tilt and recenter.');else simMessage('Close the active panel, then resume play.');});
for(const [element,id] of [['simBrake','brake'],['simGas','gas']]){
  const button=$('#'+element),up=event=>{if(!RACE_SIMULATOR.pointers.has(element))return;event?.preventDefault();RACE_SIMULATOR.pointers.delete(element);button.classList.remove('on');simInput(id,false);};
  button.addEventListener('pointerdown',event=>{if(RACE_SIMULATOR.pointers.has(element)||!simAllowed())return;event.preventDefault();event.stopPropagation();unlock();RACE_SIMULATOR.pointers.set(element,event.pointerId);button.classList.add('on');button.setPointerCapture(event.pointerId);simInput(id,true);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,up));
  button.addEventListener('keydown',event=>{if((event.key===' '||event.key==='Enter')&&!event.repeat){event.preventDefault();RACE_SIMULATOR.pointers.set(element,'keyboard');button.classList.add('on');simInput(id,true);}});
  button.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter')up(event);});button.addEventListener('blur',up);
}
for(const [element,kind,id] of [['simHandbrake','handbrake','drift'],['simNos','nos','nitro']]){
  const button=$('#'+element);
  button.addEventListener('pointerdown',event=>{if(!simAllowed())return;event.preventDefault();event.stopPropagation();RACE_SIMULATOR.pointers.set(element,{id:event.pointerId,y:event.clientY,t:performance.now()});button.setPointerCapture(event.pointerId);});
  button.addEventListener('pointerup',event=>{const start=RACE_SIMULATOR.pointers.get(element);if(!start||start.id!==event.pointerId)return;event.preventDefault();RACE_SIMULATOR.pointers.delete(element);if(id==='drift'&&button.classList.contains('on')&&Math.abs(event.clientY-start.y)<20){simInput('drift',false);button.classList.remove('on');simMessage('Handbrake released.');return;}if(SIM_MATH.gesture(start.y,event.clientY,performance.now()-start.t,kind)){if(id==='drift'){simInput('drift',true);button.classList.add('on');simMessage('Handbrake pulled · drift engaged. Tap to release.');requestMobileHaptic('tick');}else if(simInput('nitro',true)){setTimeout(()=>simInput('nitro',false),500);simMessage('NOS fired.');}}});
  ['pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,()=>{if(!RACE_SIMULATOR.pointers.has(element))return;RACE_SIMULATOR.pointers.delete(element);if(id==='drift'&&button.classList.contains('on')){simInput('drift',false);button.classList.remove('on');}}));
  button.addEventListener('click',event=>{if(event.detail!==0||!simAllowed())return;if(id==='drift'){const on=!button.classList.contains('on');simInput(id,on);button.classList.toggle('on',on);}else{const fired=simInput(id,true);if(fired)simMessage('NOS fired.');setTimeout(()=>simInput(id,false),500);}});
}
for(const [element,direction] of [['simShiftDown',-1],['simShiftUp',1]])$('#'+element).addEventListener('click',()=>{if(!simAllowed()||!RACE_SIMULATOR.active)return;const changed=direction>0?Race.shiftGear():Race.downshiftGear();if(changed){requestMobileHaptic('tick');simPaint();}else simMessage(direction>0?'Shift unavailable until the gearbox recovers or the next run.':'Downshift unavailable in first gear or during gearbox recovery.');});
window.addEventListener('keydown',event=>{if(!RACE_SIMULATOR.active||!simAllowed()||event.repeat||!['Comma','Period'].includes(event.code))return;event.preventDefault();if(event.code==='Period')$('#simShiftUp').click();else $('#simShiftDown').click();});
window.addEventListener('resize',()=>{if(RACE_SIMULATOR.active)simCancel('Orientation changed. Recenter to steer.',true);});
window.addEventListener('orientationchange',()=>{if(RACE_SIMULATOR.active)simCancel('Orientation changed. Enable tilt and recenter.',true);});
window.addEventListener('blur',()=>simCancel('Focus lost',true));window.addEventListener('pagehide',()=>simCancel('Page hidden',true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)simCancel('Page hidden',true);});
new MutationObserver(()=>{if(RACE_SIMULATOR.active&&M!==Race)simSelect(false);}).observe(document.documentElement,{attributes:true,attributeFilter:['data-kicklab-mode']});
globalThis.__KICKLAB_RACE_SIMULATOR_QA__=simFlag?Object.freeze({state:()=>({active:RACE_SIMULATOR.active,permission:RACE_SIMULATOR.permission,sensorReady:RACE_SIMULATOR.sensorReady,steer:RACE_SIMULATOR.steer,revTaps:RACE_SIMULATOR.revTaps,inputs:{...Race.inp},gear:Race.modeAttempt?.gear,nosPulse:Race.telemetry?.nosPulse,selectedGauge:Race.telemetry?.selected,driftMode:Race.st?.driftMode}),orientation:(beta,gamma,angle=0)=>simOrientation({beta,gamma,angle}),input:simInput,selectGauge:id=>{if(!RACE_TELEMETRY.GAUGES.some(g=>g.id===id)||!Race.telemetry)return false;Race.telemetry.selected=id;Race.telemetry.manualUntil=Race.telemetry.clock+7;renderRaceTelemetry();return true;},reset:()=>{Race.reset();RACE_3D.orbit.phase='done';RACE_3D.orbit.done=true;renderRaceTelemetry();},selectMode:id=>Race.selectMode(id),pause:()=>pauseGame('stage'),cancel:simCancel}):undefined;
