/* The same telemetry surface lives inside the shared Classic/Analog controller. */
const raceTelemetryEl=$('#raceTelemetry');
function renderRaceTelemetry(){
  const active=RACE_TELEMETRY.enabled&&M===Race&&!!Race.telemetry;
  raceTelemetryEl.hidden=!active;if(!active)return;
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
