/* The same telemetry surface lives inside the shared Classic/Analog controller. */
const raceTelemetryEl=$('#raceTelemetry');
function renderRaceTelemetry(){
  const active=RACE_TELEMETRY.enabled&&M===Race&&!!Race.telemetry;
  raceTelemetryEl.hidden=!active;if(!active){$('#raceNavigation').hidden=true;if(globalThis.__KICKLAB_RACE_NAVIGATION__)globalThis.__KICKLAB_RACE_NAVIGATION__.visible=false;return;}
  renderRaceNavigation();
  const t=Race.telemetry,g=RACE_TELEMETRY.GAUGES.find(item=>item.id===t.selected),index=RACE_TELEMETRY.GAUGES.indexOf(g);
  const values={rpm:[Math.round(t.rpm*8500),'rpm',t.rpm],torque:[Math.round(t.torque*100),'%',t.torque],nos:[Math.round(t.pressure*100),'%',t.pressure],temperature:[Math.round(65+t.heat*90),'°C',t.heat],braking:[Math.round(t.braking*100),'%',t.braking],drift:[Math.round(t.angle*38),'°',t.angle],grip:[Math.round(t.grip*100),'%',t.grip]};
  const [value,unit,fraction]=values[g.id],phase=t.overheat?'POWER SAG · COOLING':t.phase==='recovered'?'COOLED · POWER BACK':t.lock===g.id?'BAND LOCKED':t.phase==='warning'?'HEAT RISING':t.manualUntil>t.clock?'MANUAL VIEW':'COACH RECOMMENDS';
  raceTelemetryEl.dataset.phase=t.overheat?'overheat':t.phase;raceTelemetryEl.dataset.lock=String(t.lock===g.id);raceTelemetryEl.dataset.cue=String(t.clock<t.cueUntil);
  const compact=matchMedia('(max-width:980px)').matches,shortName={rpm:'RPM',torque:'Torque',nos:'NOS',temperature:'Engine heat',braking:'Brakes',drift:'Drift angle',grip:'Grip recovery'}[g.id];
  $('#raceTelemetryTitle').textContent=compact?shortName:g.name;$('#raceTelemetryTitle').title=g.name;$('#raceTelemetryPhase').textContent=phase;$('#raceTelemetryValue').textContent=`${value} ${unit}`;$('#raceTelemetryValue').setAttribute('aria-label',g.id==='nos'?`NOS pressure ${value} percent, capacity ${Math.round(t.capacity*100)} percent`:g.id==='braking'?`Braking force ${value} percent, stopping distance ${Math.round(t.brakeDistance)} metres`:`${g.name} ${value} ${unit}`);$('#raceTelemetryFill').style.width=`${Math.round(fraction*100)}%`;
  $('#raceTelemetryIndex').textContent=`${index+1} / ${RACE_TELEMETRY.GAUGES.length}`;
  $('#raceTelemetryApply').hidden=false;$('#raceTelemetryApply').textContent=g.id==='nos'?'Release NOS':'Lock band';$('#raceTelemetryApply').disabled=!RACE_TELEMETRY.canLock(t)||Race.state!=='run';
  const shortCue={rpm:'Hold the bright RPM band.',torque:'Feed throttle into the band.',nos:`Tank ${Math.round(t.capacity*100)}%. Release a pulse.`,temperature:'Lift; airflow cools the engine.',braking:`Need ${Math.round(t.brakeDistance)} m to stop. Brake early.`,drift:'Hold a modest angle.',grip:'Unwind to regain grip.'}[g.id];
  const cue=t.overheat?'Lift. Cooling restores power.':t.phase==='recovered'?'Cooled. Power is back.':shortCue;
  if($('#raceTelemetryCue').textContent!==`Tomi: ${cue}`)$('#raceTelemetryCue').textContent=`Tomi: ${cue}`;
  $('#raceTelemetryCue').title=t.overheat?'Ease off the gas. Airflow will cool the engine and restore power.':g.coach;
  const traceControls=$('#raceTraceControls');traceControls.hidden=!RACE_CORNER_TRACE.enabled;
  if(RACE_CORNER_TRACE.enabled){const def=RACE_CORNER_TRACE.variable(),value=Race.V[def.id],band=Race.suggest()[def.id],P=Race.P(),state=globalThis.__KICKLAB_RACE_CORNER_TRACE__?.state||'safe';$('#raceTraceVariable').textContent=def.name.split(' (')[0];$('#raceTraceValue').textContent=`${def.sym} ${fmt(value,def.d)}${def.unit?' '+def.unit:''}`;$('#raceTraceBand').textContent=`Tomi: ${fmt(band.lo,def.d)}–${fmt(band.hi,def.d)}${def.unit?' '+def.unit:''}`;$('#raceTraceEquation').textContent=def.id==='mu'||def.id==='R'?`√(μgR) → ${fmt(Math.sqrt(P.mu*G0*P.R)*3.6,0)} km/h`:`F ÷ m → ${fmt(P.F/P.m,1)} m/s²`;$('#raceTraceState').textContent={safe:'SAFE LINE',understeer:'UNDERSTEER · LIFT OR BRAKE',oversteer:'OVERSTEER · UNWIND'}[state];traceControls.dataset.state=state;}
  globalThis.__KICKLAB_RACE_TELEMETRY__={enabled:true,selected:t.selected,recommended:t.recommended,manual:t.manualUntil>t.clock,phase:t.phase,overheat:t.overheat,heat:t.heat,pressure:t.pressure,nosPulse:t.nosPulse,lock:t.lock,clock:t.clock,collapsed:FLOATING_CONTROLLER.collapsed};
}
function raceTelemetryAction(action){if(!RACE_TELEMETRY.enabled||M!==Race||!Race.telemetry||PAUSE.on||RP.on)return;const changed=RACE_TELEMETRY.tune(Race.telemetry,action);if(changed){renderRaceTelemetry();if(action==='apply'){requestMobileHaptic('tick');}else SND.click();}}
$('#raceTelemetryPrev').addEventListener('click',()=>raceTelemetryAction('prev'));
$('#raceTelemetryNext').addEventListener('click',()=>raceTelemetryAction('next'));
$('#raceTelemetryApply').addEventListener('click',()=>raceTelemetryAction('apply'));
for(const [id,direction] of [['raceTracePrev',-1],['raceTraceNext',1]])$('#'+id).addEventListener('click',()=>{if(!RACE_CORNER_TRACE.enabled||M!==Race||PAUSE.on)return;RACE_CORNER_TRACE.select(direction);renderRaceTelemetry();SND.click();});
raceTelemetryEl.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();raceTelemetryAction(event.key==='ArrowLeft'?'prev':'next');}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setFloatingControllerCollapsed(true);}});
raceTelemetryEl.addEventListener('pointerdown',event=>event.stopPropagation());

let raceNavigationAt=0;
function renderRaceNavigation(){
  const panel=$('#raceNavigation');panel.hidden=!RACE_CORNER_TRACE.enabled;if(panel.hidden)return;
  const now=performance.now();if(now-raceNavigationAt<90)return;raceNavigationAt=now;
  const navScale=(cv.clientWidth||960)/960,diameter=(Race.WH.r+15)*2*navScale;
  panel.style.left=`${Math.round((Race.WH.x-Race.WH.r-19)*navScale)}px`;
  panel.style.top=`${Math.round((Race.WH.y+Race.WH.r+18)*navScale)}px`;
  panel.style.width=`${Math.round(Math.min(270,Math.max(180,262*navScale)))}px`;
  panel.style.setProperty('--race-wheel-diameter',`${diameter}px`);
  panel.style.setProperty('--race-wheel-left',`${Math.round((Race.WH.r+19)*navScale-diameter/2)}px`);
  const prediction=Race.cornerTracePrediction||RACE_CORNER_TRACE.predict();if(!prediction)return;
  const P=Race.P(),venue=RACE_SYSTEMS.venue(Race.opt.venue),car=Race.st,heading=car.th||0;
  const local=p=>{const dx=p.x-car.x,dy=p.y-car.y;return{forward:dx*Math.cos(heading)+dy*Math.sin(heading),side:-dx*Math.sin(heading)+dy*Math.cos(heading)};};
  const end=prediction.points.at(-1),target={x:P.L+P.R,y:venue.turn*P.R},targetLocal=local(target);
  const distance=Math.max(34,targetLocal.forward+8),mapScale=Math.min(64/distance,24/Math.max(8,Math.abs(targetLocal.side)));
  const xy=p=>{const q=local(p);return`${Math.max(4,Math.min(156,80+q.side*mapScale*2.4)).toFixed(1)} ${Math.max(7,Math.min(80,77-q.forward*mapScale)).toFixed(1)}`;};
  const sampled=prediction.points.filter((_,index)=>index%3===0||index===prediction.points.length-1);
  const road=RACE_3D.trackPoints(P).map(point=>({x:point.x,y:point.z})).filter(point=>{const ahead=local(point).forward;return ahead>=-2&&ahead<=distance+5;});
  $('#raceNavigationRoad').setAttribute('d',road.map((point,index)=>`${index?'L':'M'} ${xy(point)}`).join(' '));
  $('#raceNavigationTrace').setAttribute('d',sampled.map((point,index)=>`${index?'L':'M'} ${xy(point)}`).join(' '));
  const [tx,ty]=xy(target).split(' ');$('#raceNavigationTarget').setAttribute('cx',tx);$('#raceNavigationTarget').setAttribute('cy',ty);
  $('#raceNavigationCar').setAttribute('transform','translate(80 77)');
  const error=RACE_SYSTEMS.path(end.x,end.y,P,venue).e,current=Math.round(Race.curWheel()),needed=Math.round(Race.needW()*venue.turn),state=prediction.state;
  $('#raceNavigationError').textContent=`Δ ${error>=0?'+':''}${error.toFixed(1)} m`;
  $('#raceSteeringCurrent').textContent=`Current ${current}°`;
  $('#raceSteeringNeeded').textContent=`Needed ${needed}°`;
  $('#raceNavigationStatus').textContent=`${{safe:'Safe line',understeer:'Understeer',oversteer:'Oversteer'}[state]} · projected path`;
  panel.dataset.state=state;
  panel.setAttribute('aria-label',`Race navigation. Car, predicted path, and target exit corridor. Current steering ${current} degrees. Needed steering ${needed} degrees. Projected signed line error ${error>=0?'plus':'minus'} ${Math.abs(error).toFixed(1)} metres. ${state}.`);
  globalThis.__KICKLAB_RACE_NAVIGATION__={current,needed,error,state,target,endpoint:end,visible:true};
}
