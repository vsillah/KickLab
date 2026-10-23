/* The same telemetry surface lives inside the shared Classic/Analog controller. */
const raceTelemetryEl=$('#raceTelemetry');
function renderRaceTemperature(t){
  const stage=RACE_TELEMETRY.thermalStage(t),celsius=Math.round(65+t.heat*90),color={normal:'#70eac0',warming:'#f0cc72',hot:'#ffab63',critical:'#ff7478','power-loss':'#ff9b75',cooling:'#8ed9ec'}[stage];
  for(const id of ['raceTelemetryTemp','raceNavigationTemp']){const arc=$('#'+id);arc.style.setProperty('--temp-angle',`${Math.round(t.heat*240)}deg`);arc.style.setProperty('--temp-color',color);arc.dataset.stage=stage;arc.querySelector('b').textContent=`${celsius}°`;arc.setAttribute('aria-label',`Engine temperature ${celsius} degrees Celsius, ${stage.replace('-',' ')}${t.overheat?', reduced power':''}`);}
}
function renderRaceTelemetry(){
  const active=RACE_TELEMETRY.enabled&&M===Race&&!!Race.telemetry;
  const coachActive=Race.progressionActive()||Race.expansionActive();
  const setupPreview=active&&coachActive&&Race.state==='grid'&&(!RACE_3D.on||RACE_3D.orbit.done);
  const resultReview=active&&coachActive&&!!Race.progressionComparison&&['done','crashed'].includes(Race.state);
  floatingControlDeck.classList.toggle('race-setup-preview',setupPreview);
  floatingControlDeck.classList.toggle('race-result-review',resultReview);
  floatingControlDeck.classList.toggle('race-coach-live',active&&coachActive&&Race.state==='run');
  if(setupPreview&&!Race.coachPreviewShown){Race.coachPreviewShown=true;setFloatingControllerCollapsed(false);}
  if(resultReview&&!Race.coachResultShown){Race.coachResultShown=true;setFloatingControllerCollapsed(false);}
  const setup=$('#raceCoachSetup');setup.hidden=!setupPreview;const vehicleButton=$('#raceCoachSetupVehicle');vehicleButton.hidden=!setupPreview||!Race.expansionActive();if(setupPreview&&Race.expansionActive()){const car=Race.vehicle();$('#raceCoachSetupVehicleImage').src=car.thumbnailUrl;$('#raceCoachSetupVehicleName').textContent=car.name;$('#raceCoachSetupVehicleRole').textContent=`${car.role} · ${car.modeSuitability[Race.mode().id]}`;vehicleButton.setAttribute('aria-label',`Current car ${car.name}, ${car.role}. Choose car in Garage.`);}
  $('#raceCoachSetupControls').hidden=!Race.expansionActive();if(Race.expansionActive())$('#raceCoachSetupControls').textContent=$('#analogControlsButton').getAttribute('aria-pressed')==='true'?'Classic controls':'Analog controls';
  $('#raceCoachSetupSteering').hidden=!Race.expansionActive();if(Race.expansionActive())$('#raceCoachSetupSteering').textContent=Race.opt.steer==='auto'?'You steer':'Autopilot steering';
  if(setupPreview){if(Race.expansionActive()){const mode=Race.mode(),car=Race.vehicle();$('#raceCoachSetupTitle').textContent=`Coach Nia · ${mode.name}`;$('#raceCoachSetupTargets').textContent=`${mode.description} ${mode.target}`;$('#raceCoachSetupRecommendation').textContent=`${car.name}: ${car.coach} ${car.modeSuitability[mode.id]} ${mode.garage}`;$('#raceCoachSetupStart').textContent='Start run';}else{const level=Race.progressionLevel();$('#raceCoachSetupTitle').textContent=`Coach Nia · ${level.name}`;$('#raceCoachSetupTargets').textContent=`Pass: ≤${level.time} s · slide ≤${level.slide} s · entry ≥${level.entry} km/h · brakes ≥${Math.round(level.brakeFactor*100)}%`;$('#raceCoachSetupRecommendation').textContent=`Try: ${RACE_PROGRESSION.setup(level)}.`;$('#raceCoachSetupStart').textContent='Start heat';}}
  $('#raceCoachResult').hidden=!resultReview;
  if(resultReview){$('#raceCoachResultTitle').textContent=`Coach Nia · ${Race.expansionActive()?Race.mode().name:Race.progressionLevel().name} review`;$('#raceCoachResultMeasurements').textContent=Race.progressionComparison;$('#raceCoachResultRecommendation').textContent=Race.progressionReviewNote;const category=Race.expansionActive()?Race.mode().preferred:RACE_PROGRESSION.category(Race.progressionOutcome.failed);$('#raceCoachResultGarage').textContent=category?`Garage · ${category}`:'Garage & tuning';$('#raceCoachResultRetry').textContent=Race.expansionActive()?'Retry run':'Retry heat';}
  raceTelemetryEl.hidden=!active||setupPreview||resultReview;if(!active){$('#raceNavigation').hidden=true;if(globalThis.__KICKLAB_RACE_NAVIGATION__)globalThis.__KICKLAB_RACE_NAVIGATION__.visible=false;return;}
  const t=Race.telemetry,g=RACE_TELEMETRY.GAUGES.find(item=>item.id===t.selected),index=RACE_TELEMETRY.GAUGES.indexOf(g),thermal=RACE_TELEMETRY.thermalStage(t);renderRaceTemperature(t);
  const values={rpm:[Math.round(t.rpm*8500),'rpm',t.rpm],torque:[Math.round(t.torque*100),'%',t.torque],nos:[Math.round(t.pressure*100),'%',t.pressure],temperature:[Math.round(65+t.heat*90),'°C',t.heat],braking:[Math.round(t.braking*100),'%',t.braking],drift:[Math.round(t.angle*38),'°',t.angle],grip:[Math.round(t.grip*100),'%',t.grip]};
  const [value,unit,fraction]=values[g.id],phase={warming:'ENGINE WARMING',hot:'HOT · POWER FADING',critical:'CRITICAL · LIFT','power-loss':'POWER LOW · COOLING',cooling:t.phase==='recovered'?'COOLED · POWER BACK':'COOLING'}[thermal]|| (t.lock===g.id?'BAND LOCKED':t.manualUntil>t.clock?'MANUAL VIEW':'COACH RECOMMENDS');
  raceTelemetryEl.dataset.phase=t.overheat?'overheat':t.phase;raceTelemetryEl.dataset.lock=String(t.lock===g.id);raceTelemetryEl.dataset.cue=String(t.clock<t.cueUntil);
  const compact=matchMedia('(max-width:980px)').matches,shortName={rpm:'RPM',torque:'Torque',nos:'NOS',temperature:'Engine heat',braking:'Brakes',drift:'Drift angle',grip:'Grip recovery'}[g.id];
  $('#raceTelemetryTitle').textContent=compact?shortName:g.name;$('#raceTelemetryTitle').title=g.name;$('#raceTelemetryPhase').textContent=phase;$('#raceTelemetryValue').textContent=`${value} ${unit}`;$('#raceTelemetryValue').setAttribute('aria-label',g.id==='nos'?`NOS pressure ${value} percent, capacity ${Math.round(t.capacity*100)} percent`:g.id==='braking'?`Braking force ${value} percent, stopping distance ${Math.round(t.brakeDistance)} metres`:`${g.name} ${value} ${unit}`);$('#raceTelemetryFill').style.width=`${Math.round(fraction*100)}%`;
  $('#raceTelemetryIndex').textContent=`${index+1} / ${RACE_TELEMETRY.GAUGES.length}`;
  const dragShift=Race.expansionActive()&&Race.mode().id==='drag'&&!!Race.modeAttempt;
  $('#raceTelemetryShift').hidden=!dragShift;if(dragShift){$('#raceTelemetryShift').textContent=Race.modeAttempt.gear<4?`Shift ${Race.modeAttempt.gear+1}`:'Gear 4';$('#raceTelemetryShift').disabled=Race.state!=='run'||Race.modeAttempt.gear>=4||Race.modeAttempt.shiftCooldown>0;}
  $('#raceTelemetryApply').hidden=dragShift&&g.id!=='nos';$('#raceTelemetryApply').textContent=g.id==='nos'?'Release NOS':'Lock band';$('#raceTelemetryApply').disabled=!RACE_TELEMETRY.canLock(t)||Race.state!=='run';
  const shortCue={rpm:'Hold the bright RPM band.',torque:'Feed throttle into the band.',nos:`Tank ${Math.round(t.capacity*100)}%. Release a pulse.`,temperature:'Lift; airflow cools the engine.',braking:`Need ${Math.round(t.brakeDistance)} m to stop. Brake early.`,drift:'Hold a modest angle.',grip:'Unwind to regain grip.'}[g.id];
  const cue={warming:'Watch the temperature arc.',hot:'Lift; power is fading.',critical:'Lift now; power is reduced.','power-loss':'Keep lifting until power returns.',cooling:t.phase==='recovered'?'Cooled. Power is back.':'Airflow is cooling the engine.'}[thermal]||shortCue;
  const level=Race.progressionActive()?Race.progressionLevel():null,mode=Race.expansionActive()?Race.mode():null,coachCue=mode?(Race.state==='run'?RACE_MODES.live(Race.modeAttempt,Race.st):Race.progressionComparison||mode.description):level?(Race.progressionComparison&&['done','crashed'].includes(Race.state)?Race.progressionComparison:Race.state==='run'?RACE_PROGRESSION.live(level,{slide:Race.st.slide,zone:Race.st.zone,distance:Race.P().L-Race.st.x}):RACE_PROGRESSION.preview(level)):cue;
  const thermalCue=['hot','critical','power-loss','cooling'].includes(thermal)?cue:coachCue,coachText=`Nia: ${thermalCue}`,coachButton=$('#raceTelemetryCue');
  if(coachButton.textContent!==coachText)coachButton.textContent=coachText;
  coachButton.title=thermalCue;
  coachButton.setAttribute('aria-label',`Coach Nia. ${thermalCue}${level||mode?' Activate for the full mode plan and Garage link.':''}`);
  const traceControls=$('#raceTraceControls');traceControls.hidden=!RACE_CORNER_TRACE.enabled;
  if(RACE_CORNER_TRACE.enabled){const def=RACE_CORNER_TRACE.variable(),value=Race.V[def.id],band=Race.suggest()[def.id],P=Race.P(),state=globalThis.__KICKLAB_RACE_CORNER_TRACE__?.state||'safe';$('#raceTraceVariable').textContent=def.name.split(' (')[0];$('#raceTraceValue').textContent=`${def.sym} ${fmt(value,def.d)}${def.unit?' '+def.unit:''}`;$('#raceTraceBand').textContent=`Nia: ${fmt(band.lo,def.d)}–${fmt(band.hi,def.d)}${def.unit?' '+def.unit:''}`;$('#raceTraceEquation').textContent=def.id==='mu'||def.id==='R'?`√(μgR) → ${fmt(Math.sqrt(P.mu*G0*P.R)*3.6,0)} km/h`:`F ÷ m → ${fmt(P.F/P.m,1)} m/s²`;$('#raceTraceState').textContent={safe:'SAFE LINE',understeer:'UNDERSTEER · LIFT OR BRAKE',oversteer:'OVERSTEER · UNWIND'}[state];traceControls.dataset.state=state;}
  renderRaceNavigation({gauge:shortName,value,unit,fraction,phase,cue:thermalCue});
  globalThis.__KICKLAB_RACE_TELEMETRY__={enabled:true,selected:t.selected,recommended:t.recommended,manual:t.manualUntil>t.clock,phase:t.phase,thermalStage:thermal,powerFactor:RACE_TELEMETRY.powerFactor(t),overheat:t.overheat,heat:t.heat,pressure:t.pressure,nosPulse:t.nosPulse,lock:t.lock,clock:t.clock,collapsed:FLOATING_CONTROLLER.collapsed};
}
function raceTelemetryAction(action){if(!RACE_TELEMETRY.enabled||M!==Race||!Race.telemetry||PAUSE.on||RP.on)return;const changed=RACE_TELEMETRY.tune(Race.telemetry,action);if(changed){renderRaceTelemetry();if(action==='apply'){requestMobileHaptic('tick');}else SND.click();}}
$('#raceCoachSetupStart').addEventListener('click',()=>{if(M!==Race||!(Race.progressionActive()||Race.expansionActive())||Race.state!=='grid'||RACE_3D.shouldBlockInput()||PAUSE.on)return;Race.coachStartRequested=true;Race.press('gas',true);Race.press('gas',false);renderRaceTelemetry();});
$('#raceCoachSetupControls').addEventListener('click',()=>{if(M!==Race||!Race.expansionActive()||Race.state!=='grid')return;setPrototypeControls($('#analogControlsButton').getAttribute('aria-pressed')!=='true');renderRaceTelemetry();});
$('#raceCoachSetupSteering').addEventListener('click',()=>{if(M!==Race||!Race.expansionActive()||Race.state!=='grid')return;Race.opt.steer=Race.opt.steer==='auto'?'you':'auto';renderRaceTelemetry();});
$('#raceCoachSetupVehicle').addEventListener('click',event=>{if(M!==Race||!Race.expansionActive()||Race.state!=='grid')return;GARAGE_UI.active='body';openSettings('garage',event.currentTarget);});
$('#raceCoachSetupGarage').addEventListener('click',event=>{if(M!==Race||!(Race.progressionActive()||Race.expansionActive())||Race.state!=='grid')return;GARAGE_UI.active=Race.expansionActive()?Race.mode().preferred:'tires';openSettings('garage',event.currentTarget);});
function prepareRaceCoachRetry(){if(M!==Race||!(Race.progressionActive()||Race.expansionActive())||!['done','crashed'].includes(Race.state))return;hideResults();Race.reset();if(RACE_3D.ready&&!RACE_3D.failed){RACE_3D.orbit.phase='done';RACE_3D.orbit.done=true;}renderActions();renderRaceTelemetry();requestAnimationFrame(() => $('#raceCoachSetupStart').focus());}
$('#raceCoachResultGarage').addEventListener('click',event=>{if(M!==Race||!(Race.progressionActive()||Race.expansionActive())||!Race.progressionOutcome)return;GARAGE_UI.active=Race.expansionActive()?Race.mode().preferred:RACE_PROGRESSION.category(Race.progressionOutcome.failed)||'body';GARAGE_UI.returnToRaceRetry=true;openSettings('garage',event.currentTarget);});
$('#raceCoachResultRetry').addEventListener('click',prepareRaceCoachRetry);
$('#raceTelemetryPrev').addEventListener('click',()=>raceTelemetryAction('prev'));
$('#raceTelemetryNext').addEventListener('click',()=>raceTelemetryAction('next'));
$('#raceTelemetryApply').addEventListener('click',()=>raceTelemetryAction('apply'));
$('#raceTelemetryShift').addEventListener('click',()=>{if(M!==Race||PAUSE.on||RP.on)return;if(Race.shiftGear()){renderRaceTelemetry();requestMobileHaptic('tick');}});
for(const [id,direction] of [['raceTracePrev',-1],['raceTraceNext',1]])$('#'+id).addEventListener('click',()=>{if(!RACE_CORNER_TRACE.enabled||M!==Race||PAUSE.on)return;RACE_CORNER_TRACE.select(direction);renderRaceTelemetry();SND.click();});
raceTelemetryEl.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();raceTelemetryAction(event.key==='ArrowLeft'?'prev':'next');}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setFloatingControllerCollapsed(true);}});
raceTelemetryEl.addEventListener('pointerdown',event=>event.stopPropagation());
$('#raceTelemetryCue').addEventListener('click',()=>{if(M!==Race||!(Race.progressionActive()||Race.expansionActive()))return;const level=Race.progressionActive()?Race.progressionLevel():null,message=Race.expansionActive()?Race.progressionComparison||`${Race.mode().description} ${Race.mode().target} ${Race.mode().garage}`:Race.progressionComparison||RACE_PROGRESSION.preview(level);document.querySelectorAll('#toasts .toast[aria-label="Coach Nia"]').forEach(note=>note.remove());toast('Coach Nia',message,{action:'Garage & tuning',hold:30000,onAction:()=>{GARAGE_UI.active=Race.expansionActive()?Race.mode().preferred:RACE_PROGRESSION.category(Race.progressionOutcome?.failed||[])||'tires';GARAGE_UI.returnToRaceRetry=['done','crashed'].includes(Race.state);openSettings('garage',$('#raceTelemetryCue'));}});});

let raceNavigationAt=0,raceNavigationGauge='';
function raceVisorPath(width,height,contentHeight,wingRight,phone){
  const w=width,h=height,r=14;
  if(phone)return `path("M 0 ${r} Q 0 0 ${r} 0 L ${w-r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h-r} Q ${w} ${h} ${w-r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h-r} Z")`;
  const shoulder=Math.min(contentHeight-5,h-36),tip=wingRight-15;
  return `path("M 0 ${r} Q 0 0 ${r} 0 L ${w-r} 0 Q ${w} 0 ${w} ${r} L ${w} ${shoulder} C ${w} ${shoulder+22}, ${wingRight+8} ${h-30}, ${wingRight+14} ${h-14} Q ${wingRight+3} ${h} ${tip} ${h} L ${r} ${h} Q 0 ${h} 0 ${h-r} Z")`;
}
function renderRaceNavigation({gauge,value,unit,fraction,phase,cue}){
  const panel=$('#raceNavigation'),cockpit=$('#raceCockpit');panel.hidden=!(RACE_CORNER_TRACE.enabled&&Race.state==='run'&&!RP.on&&!RACE_3D.shouldBlockInput());cockpit.hidden=panel.hidden;if(panel.hidden){if(globalThis.__KICKLAB_RACE_NAVIGATION__)globalThis.__KICKLAB_RACE_NAVIGATION__.visible=false;return;}
  const now=performance.now();if(now-raceNavigationAt<90&&gauge===raceNavigationGauge)return;raceNavigationAt=now;raceNavigationGauge=gauge;
  const navScale=(cv.clientWidth||960)/960,phone=cv.clientWidth<=480,left=8;
  const width=Math.round(Math.min(390,Math.max(205,215+(cv.clientWidth-356)*.18)));
  const contentHeight=phone?118:Math.max(88,Math.round((Race.WH.y-Race.WH.r)*navScale));
  const wheelX=Race.WH.x*navScale,wheelY=Race.WH.y*navScale,wheelRadius=Race.WH.r*(phone?1.5:1)*navScale;
  const height=Math.max(contentHeight,Math.round(wheelY+wheelRadius*.55-4));
  cockpit.style.left=`${wheelX}px`;cockpit.style.top=`${wheelY}px`;
  const overlay=$('#raceWheelCanvas');overlay.style.left=`${-wheelX}px`;overlay.style.top=`${-wheelY}px`;overlay.style.width=`${cv.clientWidth}px`;overlay.style.height=`${cv.clientHeight}px`;
  panel.style.left=`${left-wheelX}px`;
  panel.style.top=`${4-wheelY}px`;
  panel.style.width=`${width}px`;
  panel.style.height=`${height}px`;
  panel.style.setProperty('--race-content-height',`${contentHeight}px`);
  panel.style.setProperty('--race-wheel-x',`${wheelX-left}px`);
  panel.style.setProperty('--race-wheel-y',`${wheelY-4}px`);
  panel.style.setProperty('--race-wheel-radius',`${wheelRadius+7}px`);
  const wingRight=wheelX-left+wheelRadius+12;
  panel.style.setProperty('--race-wing-right',`${wingRight}px`);
  panel.style.setProperty('--race-visor-path',raceVisorPath(width,height,contentHeight,wingRight,phone));
  $('#raceNavigationGaugeTitle').textContent=gauge;
  $('#raceNavigationGaugeValue').textContent=`${value} ${unit}`;
  $('#raceNavigationGaugePhase').textContent=phase;
  $('#raceNavigationGaugeFill').style.width=`${Math.round(fraction*100)}%`;
  const compactCue={RPM:'Hold RPM band.',Torque:'Feed throttle.',NOS:'Release a pulse.','Engine heat':'Watch temperature.',Brakes:'Brake early.','Drift angle':'Hold modest angle.','Grip recovery':'Unwind to recover.'},thermal=RACE_TELEMETRY.thermalStage(Race.telemetry),thermalCue={warming:'Engine warming.',hot:'Hot. Ease off.',critical:'Critical. Lift now.','power-loss':'Power low. Keep lifting.',cooling:Race.telemetry.phase==='recovered'?'Cooled. Power back.':'Cooling. Keep airflow.'};
  $('#raceNavigationCue').textContent=`Nia: ${matchMedia('(max-width:980px)').matches?(thermalCue[thermal]||compactCue[gauge]||cue):cue}`;
  const prediction=Race.cornerTracePrediction||RACE_CORNER_TRACE.predict();if(!prediction)return;
  const P=Race.P(),venue=RACE_SYSTEMS.venue(Race.opt.venue),car=Race.st,heading=car.th||0;
  const local=p=>{const dx=p.x-car.x,dy=p.y-car.y;return{forward:dx*Math.cos(heading)+dy*Math.sin(heading),side:-dx*Math.sin(heading)+dy*Math.cos(heading)};};
  const end=prediction.points.at(-1),target={x:P.L+P.R,y:venue.turn*P.R},targetLocal=local(target);
  const distance=Math.max(34,targetLocal.forward+8),mapScale=Math.min(64/distance,24/Math.max(8,Math.abs(targetLocal.side)));
  const xy=p=>{const q=local(p);return`${Math.max(4,Math.min(156,80+q.side*mapScale*2.4)).toFixed(1)} ${Math.max(7,Math.min(80,77-q.forward*mapScale)).toFixed(1)}`;};
  const sampled=prediction.points.filter((_,index)=>index%3===0||index===prediction.points.length-1);
  const road=RACE_3D.trackPoints(P).map(point=>({x:point.x,y:point.z})).filter(point=>{const ahead=local(point).forward;return ahead>=-2&&ahead<=distance+5;});
  $('#raceNavigationRoad').setAttribute('d',road.map((point,index)=>`${index?'L':'M'} ${xy(point)}`).join(' '));
  const finish=Race.finishPoint(),finishAhead=local(finish).forward,finishLine=$('#raceNavigationFinish');
  const showFinish=finishAhead>=-2&&finishAhead<=distance+5;
  finishLine.setAttribute('d',showFinish?`M ${xy({x:finish.x+Race.HW*.82,y:finish.y})} L ${xy({x:finish.x-Race.HW*.82,y:finish.y})}`:'');
  $('#raceNavigationTrace').setAttribute('d',sampled.map((point,index)=>`${index?'L':'M'} ${xy(point)}`).join(' '));
  const [tx,ty]=xy(target).split(' ');$('#raceNavigationTarget').setAttribute('cx',tx);$('#raceNavigationTarget').setAttribute('cy',ty);
  $('#raceNavigationCar').setAttribute('transform','translate(80 77)');
  const error=RACE_SYSTEMS.path(end.x,end.y,P,venue).e,current=Math.round(Race.curWheel()),needed=Math.round(Race.needW()*venue.turn),state=prediction.state;
  $('#raceNavigationError').textContent=`Δ ${error>=0?'+':''}${error.toFixed(1)} m`;
  $('#raceSteeringCurrent').textContent=`Current ${current}°`;
  $('#raceSteeringNeeded').textContent=`Needed ${needed}°`;
  $('#raceSteeringCurrentTick').style.left=`${Math.max(7,Math.min(93,50+current*.46))}%`;
  $('#raceSteeringNeededTick').style.left=`${Math.max(7,Math.min(93,50+needed*.46))}%`;
  $('#raceNavigationStatus').textContent=`${{safe:'Safe line',understeer:'Understeer',oversteer:'Oversteer'}[state]}`;
  panel.dataset.state=state;
  panel.setAttribute('aria-label',`Race cockpit. ${gauge} ${value} ${unit}. ${phase}. Car, predicted path, ${showFinish?'finish line, ':''}and target exit corridor. Current steering ${current} degrees. Needed steering ${needed} degrees. Projected signed line error ${error>=0?'plus':'minus'} ${Math.abs(error).toFixed(1)} metres. ${state}. Coach Nia: ${cue}`);
  globalThis.__KICKLAB_RACE_NAVIGATION__={current,needed,error,state,target,endpoint:end,finish,finishVisible:showFinish,gauge,value,unit,visible:true};
}
if(RACE_CORNER_TRACE.enabled)globalThis.__KICKLAB_RACE_START_FINISH_QA__={
  useCanvas(){best.gfx='2d';},
  approach(){if(M!==Race||Race.state!=='run')return false;const finish=Race.finishPoint(),sign=Math.sign(finish.y);Object.assign(Race.st,{x:finish.x,y:finish.y-sign*25,th:sign*Math.PI/2,zone:2,v:0});Race.cornerTracePrediction=null;RACE_3D.cameraPose=null;renderRaceTelemetry();return true;},
  cross(){if(M!==Race||Race.state!=='run')return false;const finish=Race.finishPoint();Race.st.y=finish.y+Math.sign(finish.y)*.2;return true;}
};
if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('raceEngineQA')==='1')globalThis.__KICKLAB_RACE_ENGINE_QA__=Object.freeze({
  select(mode,vehicle){Race.selectMode(mode);Race.selectVehicle(vehicle);},
  run(){RACE_3D.orbit.phase='done';RACE_3D.orbit.done=true;RACE_3D.awaitingPacing=false;RACE_3D.cameraPose=null;if(RACE_3D.orbitPanel)RACE_3D.orbitPanel.hidden=true;RACE_3D.setStartLights('go');Race.state='run';E.title=null;if(Race.mode().id==='drag')Race.st.x=45;Race.st.v=18;Race.st.t=4;Race.telemetry.selected='temperature';Race.telemetry.manualUntil=1000;renderRaceTelemetry();},
  thermal(heat,overheat,phase){Race.telemetry.heat=heat;Race.telemetry.overheat=overheat;Race.telemetry.phase=phase;Race.telemetry.recoveryUntil=phase==='recovered'?Race.telemetry.clock+1.5:0;Race.telemetry.selected='temperature';Race.telemetry.manualUntil=1000;Race.inp.gas=overheat&&heat>=.91;Race.st.t+=.2;renderRaceTelemetry();},
  state(){return{phase:Race.state,inputs:{...Race.inp},paused:PAUSE.on,heat:Race.telemetry?.heat,thermal:Race.telemetry?RACE_TELEMETRY.thermalStage(Race.telemetry):null};},
  effect(fixture){const t=Race.telemetry,s=Race.st;RACE_CINEMATIC_FX.clear(RACE_3D);Race.state='run';Race.inp.gas=false;Race.inp.brake=false;t.nosPulse=0;s.nitroActive=false;s.nitroDelivered=false;s.launchSlip=0;s.driftMode='none';s.slipAngle=0;t.heat=.35;t.overheat=false;t.phase='drive';
    if(fixture==='exhaust'){t.heat=.82;t.torque=.75;}
    if(fixture==='nos'||fixture==='nos-ignition'){t.nosPulse=1.2;s.nitroActive=true;s.nitroDelivered=true;t.torque=.8;}
    if(fixture==='launch'){s.launchSlip=.28;s.v=3;}
    if(fixture==='drift'){s.driftMode='drift';s.slipAngle=.2;s.v=18;}
    if(fixture==='brake'){s.driftMode='skid';s.slipAngle=.26;t.braking=.7;s.v=18;}
    if(fixture==='cutaway'){Race.state='done';RACE_CINEMATIC_FX.success(RACE_3D,'drivetrain');}
    if(RACE_3D.cinematicFx)for(let i=0;i<(fixture==='cutaway'?(reduce?1:26):fixture==='nos-ignition'?1:35);i++)RACE_CINEMATIC_FX.step(RACE_3D,.05);
    if(RACE_3D.ready){RACE_3D.car.updateMatrixWorld(true);RACE_3D.render(.016);}
    return{fx:globalThis.__KICKLAB_RACE_FX__||null,vehicle:Race.vehicle().id,mode:Race.mode().id,phase:Race.state,paused:PAUSE.on,nitroActive:s.nitroActive,nosPulse:t.nosPulse,overheat:t.overheat,captionShown:!RACE_3D.cutawayCaption?.hidden,flamesVisible:RACE_3D.cinematicFx?.flames.some(item=>item.outer.visible)||false,storage:Object.keys(localStorage).sort(),gpu:globalThis.__KICKLAB_RACE_3D__?.gpuMemory,renderer:globalThis.__KICKLAB_RACE_3D__?.status};},
  effectsLifecycle(action){if(action==='fade'){Race.state='done';Race.st.launchSlip=0;for(let i=0;i<115;i++)RACE_CINEMATIC_FX.step(RACE_3D,.05);}if(action==='reset')Race.reset();if(action==='pagehide'){window.dispatchEvent(new Event('pagehide'));RACE_CINEMATIC_FX.step(RACE_3D,.05);}return{fx:globalThis.__KICKLAB_RACE_FX__||null,captionShown:!RACE_3D.cutawayCaption?.hidden,paused:PAUSE.on,inputs:{...Race.inp}};},
  holdPresentation(on){if(on){if(!Race.__cinematicQaUpdate)Race.__cinematicQaUpdate=Race.update;Race.update=()=>{};}else if(Race.__cinematicQaUpdate){Race.update=Race.__cinematicQaUpdate;delete Race.__cinematicQaUpdate;}return !!Race.__cinematicQaUpdate;},
  nudgePresentation(meters){Race.st.x+=Number(meters)||0;return Race.st.x;},
  endBoostPresentation(){Race.telemetry.nosPulse=0;Race.st.nitroActive=false;Race.st.nitroDelivered=false;return true;},
  stopSlipPresentation(){Race.st.launchSlip=0;Race.st.driftMode='none';Race.st.slipAngle=0;Race.telemetry.braking=0;return true;}
});
