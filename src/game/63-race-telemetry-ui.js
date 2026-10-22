/* The same telemetry surface lives inside the shared Classic/Analog controller. */
const raceTelemetryEl=$('#raceTelemetry');
function renderRaceTelemetry(){
  const active=RACE_TELEMETRY.enabled&&M===Race&&!!Race.telemetry;
  const setupPreview=active&&Race.progressionActive()&&Race.state==='grid'&&(!RACE_3D.on||RACE_3D.orbit.done);
  const resultReview=active&&Race.progressionActive()&&!!Race.progressionComparison&&['done','crashed'].includes(Race.state);
  floatingControlDeck.classList.toggle('race-setup-preview',setupPreview);
  floatingControlDeck.classList.toggle('race-result-review',resultReview);
  floatingControlDeck.classList.toggle('race-coach-live',active&&Race.progressionActive()&&Race.state==='run');
  if(setupPreview&&!Race.coachPreviewShown){Race.coachPreviewShown=true;setFloatingControllerCollapsed(false);}
  if(resultReview&&!Race.coachResultShown){Race.coachResultShown=true;setFloatingControllerCollapsed(false);}
  const setup=$('#raceCoachSetup');setup.hidden=!setupPreview;
  if(setupPreview){const level=Race.progressionLevel();$('#raceCoachSetupTitle').textContent=`Coach Nia · ${level.name}`;$('#raceCoachSetupTargets').textContent=`Pass: ≤${level.time} s · slide ≤${level.slide} s · entry ≥${level.entry} km/h · brakes ≥${Math.round(level.brakeFactor*100)}%`;$('#raceCoachSetupRecommendation').textContent=`Try: ${RACE_PROGRESSION.setup(level)}.`;}
  $('#raceCoachResult').hidden=!resultReview;
  if(resultReview){$('#raceCoachResultTitle').textContent=`Coach Nia · ${Race.progressionLevel().name} review`;$('#raceCoachResultMeasurements').textContent=Race.progressionComparison;$('#raceCoachResultRecommendation').textContent=Race.progressionReviewNote;const category=RACE_PROGRESSION.category(Race.progressionOutcome.failed);$('#raceCoachResultGarage').textContent=category?`Garage · ${category}`:'Garage & tuning';}
  raceTelemetryEl.hidden=!active||setupPreview||resultReview;if(!active){$('#raceNavigation').hidden=true;if(globalThis.__KICKLAB_RACE_NAVIGATION__)globalThis.__KICKLAB_RACE_NAVIGATION__.visible=false;return;}
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
  const level=Race.progressionActive()?Race.progressionLevel():null,coachCue=level?(Race.progressionComparison&&['done','crashed'].includes(Race.state)?Race.progressionComparison:Race.state==='run'?RACE_PROGRESSION.live(level,{slide:Race.st.slide,zone:Race.st.zone,distance:Race.P().L-Race.st.x}):RACE_PROGRESSION.preview(level)):cue;
  const coachText=`Nia: ${coachCue}`,coachButton=$('#raceTelemetryCue');
  if(coachButton.textContent!==coachText)coachButton.textContent=coachText;
  coachButton.title=level?coachCue:t.overheat?'Ease off the gas. Airflow will cool the engine and restore power.':g.coach;
  coachButton.setAttribute('aria-label',level?`Coach Nia. ${coachCue} Activate for the full level plan and Garage link.`:`Coach Nia. ${coachCue}`);
  const traceControls=$('#raceTraceControls');traceControls.hidden=!RACE_CORNER_TRACE.enabled;
  if(RACE_CORNER_TRACE.enabled){const def=RACE_CORNER_TRACE.variable(),value=Race.V[def.id],band=Race.suggest()[def.id],P=Race.P(),state=globalThis.__KICKLAB_RACE_CORNER_TRACE__?.state||'safe';$('#raceTraceVariable').textContent=def.name.split(' (')[0];$('#raceTraceValue').textContent=`${def.sym} ${fmt(value,def.d)}${def.unit?' '+def.unit:''}`;$('#raceTraceBand').textContent=`Nia: ${fmt(band.lo,def.d)}–${fmt(band.hi,def.d)}${def.unit?' '+def.unit:''}`;$('#raceTraceEquation').textContent=def.id==='mu'||def.id==='R'?`√(μgR) → ${fmt(Math.sqrt(P.mu*G0*P.R)*3.6,0)} km/h`:`F ÷ m → ${fmt(P.F/P.m,1)} m/s²`;$('#raceTraceState').textContent={safe:'SAFE LINE',understeer:'UNDERSTEER · LIFT OR BRAKE',oversteer:'OVERSTEER · UNWIND'}[state];traceControls.dataset.state=state;}
  renderRaceNavigation({gauge:shortName,value,unit,fraction,phase,cue});
  globalThis.__KICKLAB_RACE_TELEMETRY__={enabled:true,selected:t.selected,recommended:t.recommended,manual:t.manualUntil>t.clock,phase:t.phase,overheat:t.overheat,heat:t.heat,pressure:t.pressure,nosPulse:t.nosPulse,lock:t.lock,clock:t.clock,collapsed:FLOATING_CONTROLLER.collapsed};
}
function raceTelemetryAction(action){if(!RACE_TELEMETRY.enabled||M!==Race||!Race.telemetry||PAUSE.on||RP.on)return;const changed=RACE_TELEMETRY.tune(Race.telemetry,action);if(changed){renderRaceTelemetry();if(action==='apply'){requestMobileHaptic('tick');}else SND.click();}}
$('#raceCoachSetupStart').addEventListener('click',()=>{if(M!==Race||!Race.progressionActive()||Race.state!=='grid'||RACE_3D.shouldBlockInput()||PAUSE.on)return;Race.coachStartRequested=true;Race.press('gas',true);Race.press('gas',false);renderRaceTelemetry();});
$('#raceCoachSetupGarage').addEventListener('click',event=>{if(M!==Race||!Race.progressionActive()||Race.state!=='grid')return;GARAGE_UI.active='tires';openSettings('garage',event.currentTarget);});
function prepareRaceCoachRetry(){if(M!==Race||!Race.progressionActive()||!['done','crashed'].includes(Race.state))return;hideResults();Race.reset();if(RACE_3D.ready&&!RACE_3D.failed){RACE_3D.orbit.phase='done';RACE_3D.orbit.done=true;}renderActions();renderRaceTelemetry();requestAnimationFrame(() => $('#raceCoachSetupStart').focus());}
$('#raceCoachResultGarage').addEventListener('click',event=>{if(M!==Race||!Race.progressionActive()||!Race.progressionOutcome)return;GARAGE_UI.active=RACE_PROGRESSION.category(Race.progressionOutcome.failed)||'body';GARAGE_UI.returnToRaceRetry=true;openSettings('garage',event.currentTarget);});
$('#raceCoachResultRetry').addEventListener('click',prepareRaceCoachRetry);
$('#raceTelemetryPrev').addEventListener('click',()=>raceTelemetryAction('prev'));
$('#raceTelemetryNext').addEventListener('click',()=>raceTelemetryAction('next'));
$('#raceTelemetryApply').addEventListener('click',()=>raceTelemetryAction('apply'));
for(const [id,direction] of [['raceTracePrev',-1],['raceTraceNext',1]])$('#'+id).addEventListener('click',()=>{if(!RACE_CORNER_TRACE.enabled||M!==Race||PAUSE.on)return;RACE_CORNER_TRACE.select(direction);renderRaceTelemetry();SND.click();});
raceTelemetryEl.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();raceTelemetryAction(event.key==='ArrowLeft'?'prev':'next');}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setFloatingControllerCollapsed(true);}});
raceTelemetryEl.addEventListener('pointerdown',event=>event.stopPropagation());
$('#raceTelemetryCue').addEventListener('click',()=>{if(M!==Race||!Race.progressionActive())return;const level=Race.progressionLevel(),message=Race.progressionComparison||RACE_PROGRESSION.preview(level);document.querySelectorAll('#toasts .toast[aria-label="Coach Nia"]').forEach(note=>note.remove());toast('Coach Nia',message,{action:'Garage & tuning',hold:30000,onAction:()=>{GARAGE_UI.active=RACE_PROGRESSION.category(Race.progressionOutcome?.failed||[])||'tires';GARAGE_UI.returnToRaceRetry=['done','crashed'].includes(Race.state);openSettings('garage',$('#raceTelemetryCue'));}});});

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
  const compactCue={RPM:'Hold RPM band.',Torque:'Feed throttle.',NOS:'Release a pulse.','Engine heat':'Lift to cool.',Brakes:'Brake early.','Drift angle':'Hold modest angle.','Grip recovery':'Unwind to recover.'};
  $('#raceNavigationCue').textContent=`Nia: ${matchMedia('(max-width:980px)').matches?(compactCue[gauge]||cue):cue}`;
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
