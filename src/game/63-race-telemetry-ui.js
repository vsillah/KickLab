/* The same telemetry surface lives inside the shared Classic/Analog controller. */
const raceTelemetryEl=$('#raceTelemetry');
$('.stage').tabIndex=-1;
const RACE_SETUP_RECOMMENDATIONS={
  drag:'narrow tires for speed, wide tires for grip',
  drift:'soft suspension for recovery',
  circuit:'endurance brakes for repeated stops',
  hill:'lighter body and grippy tires for the climb',
  endurance:'balanced tires and cooling brakes'
};
let raceStartKeyboardFocus=false;
let raceStartFocusAttempts=0;
function focusRaceControllerAfterStart(){
  if(!raceStartKeyboardFocus||M!==Race||Race.state!=='run'||PAUSE.on)return;
  const target=RACE_SIMULATOR.active?$('#simBrake'):$('#analogControlsButton').getAttribute('aria-pressed')==='true'?$('#analogStick'):$('#padR [data-id="gas"]');
  if(target&&target.getClientRects().length&&getComputedStyle(target).visibility==='visible'){raceStartKeyboardFocus=false;raceStartFocusAttempts=0;target.focus({preventScroll:true});return;}
  if(++raceStartFocusAttempts<20){requestAnimationFrame(focusRaceControllerAfterStart);return;}
  raceStartKeyboardFocus=false;raceStartFocusAttempts=0;$('.stage').focus({preventScroll:true});
}
function racePhoneLiveCue(mode,level,thermal,fallback){
  if(['hot','critical','power-loss','cooling'].includes(thermal))return fallback;
  if(!mode)return level?RACE_PROGRESSION.live(level,{slide:Race.st.slide,zone:Race.st.zone,distance:Race.P().L-Race.st.x}):fallback;
  if(mode.id==='drag')return `Gear ${Race.modeAttempt?.gear||1}: shift in the bright band.`;
  if(mode.id==='drift')return'Hold a controlled slide through each curve.';
  if(mode.id==='hill')return'Brake before the switchback.';
  if(mode.id==='circuit')return`Lap ${Math.min(2,(Race.modeAttempt?.laps||0)+1)}/2: repeat your braking point.`;
  return'Hold steady speed; brake before each bend.';
}
function renderRaceTemperature(t){
  const stage=RACE_TELEMETRY.thermalStage(t),celsius=Math.round(65+t.heat*90),color={normal:'#70eac0',warming:'#f0cc72',hot:'#ffab63',critical:'#ff7478','power-loss':'#ff9b75',cooling:'#8ed9ec'}[stage];
  for(const id of ['raceTelemetryTemp','simTemp']){const arc=$('#'+id);arc.style.setProperty('--temp-angle',`${Math.round(t.heat*240)}deg`);arc.style.setProperty('--temp-color',color);arc.dataset.stage=stage;arc.querySelector('b').textContent=`${celsius}°`;arc.setAttribute('aria-label',`Engine temperature ${celsius} degrees Celsius, ${stage.replace('-',' ')}${t.overheat?', reduced power':''}`);}
}
function renderRaceTelemetry(){
  if(typeof racePreflightMaybeOpen==='function')racePreflightMaybeOpen();
  const recorded=RP.on&&RECS.race?.meta?.garage?RECS.race.meta:null;
  const preflightSetup=typeof RACE_PREFLIGHT_ON!=='undefined'&&RACE_PREFLIGHT_ON&&M===Race?racePreflightSetupIdentity(recorded?.garage||Race.garage,recorded?.vehicle||Race.vehicle().id):'';
  $('#raceTelemetrySetup').hidden=!preflightSetup;$('#raceTelemetrySetup').textContent=preflightSetup;
  const active=RACE_TELEMETRY.enabled&&M===Race&&!!Race.telemetry;
  const variableSelection=$('#raceTraceWrenchSelection');variableSelection.hidden=!(active&&RACE_CORNER_TRACE.enabled);
  const coachActive=Race.progressionActive()||Race.expansionActive();
  const orbitView=active&&coachActive&&Race.state==='grid'&&RACE_3D.on&&!RACE_3D.failed&&!RACE_3D.orbit.done;
  const setupPreview=active&&coachActive&&Race.state==='grid'&&(!RACE_3D.on||RACE_3D.orbit.done);
  const resultReview=false; // The primary Race summary owns the completed-run lifecycle.
  const stageStart=$('#raceStageStart'),simulatorStart=setupPreview&&typeof RACE_SIMULATOR!=='undefined'&&RACE_SIMULATOR.active;
  stageStart.hidden=!setupPreview||PAUSE.on||$('#racePhoneToolsToggle').getAttribute('aria-expanded')==='true'||$('.stage').classList.contains('has-game-overlay');
  $('#raceCoachSetupStart').hidden=!setupPreview||simulatorStart;
  $('#simStart').hidden=!simulatorStart;
  floatingControlDeck.classList.toggle('race-setup-preview',setupPreview);
  floatingControlDeck.classList.toggle('race-orbit-view',orbitView);
  floatingControlDeck.classList.toggle('race-awaiting-coach',active&&coachActive&&Race.state==='grid'&&!setupPreview);
  floatingControlDeck.classList.toggle('race-result-review',resultReview);
  floatingControlDeck.classList.toggle('race-coach-live',active&&coachActive&&Race.state==='run');
  floatingControlDeck.classList.toggle('race-endurance-card',(setupPreview||resultReview)&&Race.expansionActive()&&Race.mode().id==='endurance');
  if(typeof renderRaceInstruments==='function')renderRaceInstruments();
  if(setupPreview&&!Race.coachPreviewShown){Race.coachPreviewShown=true;setFloatingControllerCollapsed(false);}
  if(resultReview&&!Race.coachResultShown){Race.coachResultShown=true;setFloatingControllerCollapsed(false);}
  $('#raceCoachSetupRecommendation').hidden=false;$('#raceCoachResultRecommendation').hidden=false;$('#raceCoachResultRetry').hidden=false;$('#simResultRecommendation').hidden=false;$('#raceCoachSetupSeason').hidden=true;$('#raceCoachResultSeason').hidden=true;$('#simResultSeason').hidden=true;
  const setup=$('#raceCoachSetup');setup.hidden=!setupPreview;const vehicleButton=$('#raceCoachSetupVehicle');vehicleButton.hidden=!setupPreview||!Race.expansionActive();if(setupPreview&&Race.expansionActive()){const car=Race.vehicle();$('#raceCoachSetupVehicleImage').src=car.thumbnailUrl;$('#raceCoachSetupVehicleName').textContent=car.name;$('#raceCoachSetupVehicleRole').textContent=`${car.role} · ${car.modeSuitability[Race.mode().id]}`;vehicleButton.setAttribute('aria-label',`Current car ${car.name}, ${car.role}. Choose car in Garage.`);}
  for(const id of ['raceCoachSetupClassic','raceCoachSetupControls'])$('#'+id).hidden=!Race.expansionActive();
  if(Race.expansionActive()){
    const analog=$('#analogControlsButton').getAttribute('aria-pressed')==='true',simulator=$('#simulatorControlsButton').getAttribute('aria-pressed')==='true';
    $('#raceCoachSetupClassic').setAttribute('aria-pressed',String(!analog&&!simulator));
    $('#raceCoachSetupControls').setAttribute('aria-pressed',String(analog));
    $('#raceCoachSetupSimulator').setAttribute('aria-pressed',String(simulator));
  }
  $('#raceCoachSetupSteering').hidden=!Race.expansionActive();if(Race.expansionActive())$('#raceCoachSetupSteering').textContent=Race.opt.steer==='auto'?'You steer':'Autopilot steering';
  $('#raceToolsGarage').hidden=M!==Race;
  $('#raceSetupSteeringShortcut').hidden=!setupPreview||!Race.expansionActive();
  $('#raceToolsSteering').hidden=M!==Race||!Race.expansionActive();$('#raceToolsSteering').disabled=Race.state!=='grid';
  for(const id of ['raceSetupSteeringShortcut','raceToolsSteering']){const button=$('#'+id);button.setAttribute('aria-pressed',String(Race.opt.steer==='auto'));button.setAttribute('aria-label',Race.opt.steer==='auto'?'Disable autopilot steering':'Enable autopilot steering');button.title=button.getAttribute('aria-label');}
  $('#raceSetupToolShortcuts').hidden=M!==Race;
  renderRaceToolTruth();
  if(setupPreview){if(Race.expansionActive()){const mode=Race.mode(),car=Race.vehicle();$('#raceCoachSetupTitle').textContent=mode.name;$('#raceCoachSetupTargets').textContent=mode.target;$('#raceCoachSetupRecommendation').textContent=preflightSetup?`Current setup: ${preflightSetup}.`:`Suggested: ${car.name} · ${RACE_SETUP_RECOMMENDATIONS[mode.id]}.`;$('#raceCoachSetupStart').textContent='Start heat';$('#simStart span').textContent='Start heat';}else{const level=Race.progressionLevel();$('#raceCoachSetupTitle').textContent=level.name;$('#raceCoachSetupTargets').textContent=`Pass: ≤${level.time} s · slide ≤${level.slide} s · entry ≥${level.entry} km/h`;$('#raceCoachSetupRecommendation').textContent=`Suggested: ${RACE_PROGRESSION.setup(level)}.`;$('#raceCoachSetupStart').textContent='Start heat';$('#simStart span').textContent='Start heat';}}
  if(setupPreview&&typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active)raceChampionshipApplySetup();
  if(setupPreview&&RACE_COACH_PERSONAS.enabled&&!$('#raceCoachSetupRecommendation').hidden){const node=$('#raceCoachSetupRecommendation');node.textContent=RACE_COACH_PERSONAS.frame(node.textContent,raceCoachPersona().id);}
  if(setupPreview&&$('#raceCoachSetupTitle').textContent.startsWith('Coach Nia · '))$('#raceCoachSetupTitle').textContent=$('#raceCoachSetupTitle').textContent.slice(12);
  if(resultReview)clearRacePhoneNotices();
  $('#raceCoachResult').hidden=!resultReview;
  if(resultReview){$('#raceCoachResultTitle').textContent=`Coach Nia · ${Race.expansionActive()?Race.mode().name:Race.progressionLevel().name} review`;$('#raceCoachResultMeasurements').textContent=Race.progressionComparison;$('#raceCoachResultRecommendation').textContent=preflightSetup?`${Race.progressionReviewNote} Setup: ${preflightSetup}.`:Race.progressionReviewNote;const category=Race.expansionActive()?Race.mode().preferred:RACE_PROGRESSION.category(Race.progressionOutcome.failed);$('#raceCoachResultGarage').textContent=category?`Garage · ${category}`:'Garage & tuning';$('#raceCoachResultRetry').textContent=Race.expansionActive()?'Retry run':'Retry heat';}
  if(resultReview&&typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active)raceChampionshipApplyResult();
  const simResult=$('#simResult'),showSimResult=resultReview&&typeof RACE_SIMULATOR!=='undefined'&&RACE_SIMULATOR.active&&Race.mode().id==='endurance';simResult.hidden=!showSimResult;if(showSimResult){$('#simResultTitle').textContent=`Coach Nia · ${Race.mode().name} review`;$('#simResultMeasurements').textContent=Race.progressionComparison;$('#simResultRecommendation').textContent=preflightSetup?`${Race.progressionReviewNote} Setup: ${preflightSetup}.`:Race.progressionReviewNote;}
  if(showSimResult&&typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active){const brief=raceChampionshipCoachState(RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected]);$('#simResultTitle').textContent=`Coach Nia · ${brief.headline}`;$('#simResultMeasurements').textContent=brief.instruction;$('#simResultRecommendation').hidden=true;$('#simResultSeason').hidden=false;raceChampionshipChipList('simResultSeasonChips',brief.chips);}
  raceTelemetryEl.hidden=!active||setupPreview||resultReview;if(!active){$('#raceNavigation').hidden=true;if(globalThis.__KICKLAB_RACE_NAVIGATION__)globalThis.__KICKLAB_RACE_NAVIGATION__.visible=false;return;}
  const t=Race.telemetry,g=RACE_TELEMETRY.GAUGES.find(item=>item.id===t.selected),index=RACE_TELEMETRY.GAUGES.indexOf(g),thermal=RACE_TELEMETRY.thermalStage(t);renderRaceTemperature(t);
  if(RACE_CORNER_TRACE.enabled){const selector=$('#raceTelemetryGaugeSelect');if(!selector.options.length)selector.innerHTML=RACE_TELEMETRY.GAUGES.map(item=>`<option value="${item.id}">${item.name}</option>`).join('');selector.value=t.selected;}
  const values={rpm:[Math.round(t.rpm*8500),'rpm',t.rpm],torque:[Math.round(t.torque*100),'%',t.torque],nos:[Math.round(t.pressure*100),'%',t.pressure],temperature:[Math.round(65+t.heat*90),'°C',t.heat],braking:[Math.round(t.braking*100),'%',t.braking],drift:[Math.round(t.angle*38),'°',t.angle],grip:[Math.round(t.grip*100),'%',t.grip]};
  const [value,unit,fraction]=values[g.id],phase={warming:'ENGINE WARMING',hot:'HOT · POWER FADING',critical:'CRITICAL · LIFT','power-loss':'POWER LOW · COOLING',cooling:t.phase==='recovered'?'COOLED · POWER BACK':'COOLING'}[thermal]|| (t.lock===g.id?'BAND LOCKED':t.manualUntil>t.clock?'MANUAL VIEW':'COACH RECOMMENDS');
  if(RACE_CORNER_TRACE.enabled){const readout=$('#raceTelemetryGaugeReadout');readout.textContent=`${g.name}: ${value} ${unit}`;readout.setAttribute('aria-label',readout.textContent);}
  raceTelemetryEl.dataset.phase=t.overheat?'overheat':t.phase;raceTelemetryEl.dataset.lock=String(t.lock===g.id);raceTelemetryEl.dataset.cue=String(t.clock<t.cueUntil);
  const compact=matchMedia('(max-width:980px)').matches,shortName={rpm:'RPM',torque:'Torque',nos:'NOS',temperature:'Engine heat',braking:'Brakes',drift:'Drift angle',grip:'Grip recovery'}[g.id];
  $('#raceTelemetryTitle').textContent=compact?shortName:g.name;$('#raceTelemetryTitle').title=g.name;$('#raceTelemetryPhase').textContent=phase;$('#raceTelemetryValue').textContent=`${value} ${unit}`;$('#raceTelemetryValue').setAttribute('aria-label',g.id==='nos'?`NOS pressure ${value} percent, capacity ${Math.round(t.capacity*100)} percent`:g.id==='braking'?`Braking force ${value} percent, stopping distance ${Math.round(t.brakeDistance)} metres`:`${g.name} ${value} ${unit}`);$('#raceTelemetryFill').style.width=`${Math.round(fraction*100)}%`;
  $('#raceTelemetryIndex').textContent=`${index+1} / ${RACE_TELEMETRY.GAUGES.length}`;
  const dragShift=Race.expansionActive()&&Race.mode().id==='drag'&&!!Race.modeAttempt;
  $('#raceTelemetryShift').hidden=!dragShift||RACE_INSTRUMENTS_ON;if(dragShift){$('#raceTelemetryShift').textContent=Race.modeAttempt.gear<4?`Shift ${Race.modeAttempt.gear+1}`:'Gear 4';$('#raceTelemetryShift').disabled=Race.state!=='run'||Race.modeAttempt.gear>=4||Race.modeAttempt.shiftCooldown>0;}
  $('#raceTelemetryApply').hidden=RACE_INSTRUMENTS_ON&&g.id==='nos'||dragShift&&g.id!=='nos';$('#raceTelemetryApply').textContent=g.id==='nos'?'Release NOS':'Lock band';$('#raceTelemetryApply').disabled=!RACE_TELEMETRY.canLock(t)||Race.state!=='run';
  const shortCue={rpm:'Hold the bright RPM band.',torque:'Feed throttle into the band.',nos:`Tank ${Math.round(t.capacity*100)}%. Release a pulse.`,temperature:'Lift; airflow cools the engine.',braking:`Need ${Math.round(t.brakeDistance)} m to stop. Brake early.`,drift:'Hold a modest angle.',grip:'Unwind to regain grip.'}[g.id];
  const cue={warming:'Watch the temperature arc.',hot:'Lift; power is fading.',critical:'Lift now; power is reduced.','power-loss':'Keep lifting until power returns.',cooling:t.phase==='recovered'?'Cooled. Power is back.':'Airflow is cooling the engine.'}[thermal]||shortCue;
  const level=Race.progressionActive()?Race.progressionLevel():null,mode=Race.expansionActive()?Race.mode():null,coachCue=mode?(typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active?raceChampionshipLiveCue():Race.state==='run'?RACE_MODES.live(Race.modeAttempt,Race.st,Race.telemetry):Race.progressionComparison||mode.description):level?(Race.progressionComparison&&['done','crashed'].includes(Race.state)?Race.progressionComparison:Race.state==='run'?RACE_PROGRESSION.live(level,{slide:Race.st.slide,zone:Race.st.zone,distance:Race.P().L-Race.st.x}):RACE_PROGRESSION.preview(level)):cue;
  const thermalCue=mode?.id==='endurance'?coachCue:['hot','critical','power-loss','cooling'].includes(thermal)?cue:coachCue;
  const visibleCue=matchMedia('(max-width:480px)').matches?cue:thermalCue;
  const coachText=`${RACE_COACH_PERSONAS.enabled?raceCoachName().split(' ')[1]:'Nia'}: ${visibleCue}`,coachButton=$('#raceTelemetryCue');
  if(Race.state==='run')racePhoneNotice(racePhoneLiveCue(mode,level,thermal,cue),['hot','critical','power-loss'].includes(thermal)?'warn':'tip');
  if(coachButton.textContent!==coachText)coachButton.textContent=coachText;
  coachButton.title=thermalCue;
  coachButton.setAttribute('aria-label',`Coach Nia. ${thermalCue}${level||mode?' Activate for the full mode plan and Garage link.':''}`);
  if(RACE_CORNER_TRACE.enabled){const selector=$('#raceTraceVariableSelect');if(!selector.options.length)selector.innerHTML=RACE_CORNER_TRACE.VARIABLES.map(id=>{const def=Race.vars().find(item=>item.id===id);return`<option value="${id}">${def.name.split(' (')[0]}</option>`;}).join('');selector.value=RACE_CORNER_TRACE.variable().id;const def=RACE_CORNER_TRACE.variable(),value=Race.V[def.id],selected=`${def.name.split(' (')[0]} ${def.sym} ${fmt(value,def.d)}${def.unit?' '+def.unit:''}`;$('#raceTraceSelectedValue').textContent=selected;$('#raceTraceSelectedValue').setAttribute('aria-label',selected);}
  renderRaceNavigation({gauge:shortName,value,unit,fraction,phase,cue:thermalCue});
  globalThis.__KICKLAB_RACE_TELEMETRY__={enabled:true,selected:t.selected,recommended:t.recommended,manual:t.manualUntil>t.clock,phase:t.phase,thermalStage:thermal,powerFactor:RACE_TELEMETRY.powerFactor(t),overheat:t.overheat,heat:t.heat,pressure:t.pressure,nosPulse:t.nosPulse,lock:t.lock,clock:t.clock,collapsed:FLOATING_CONTROLLER.collapsed};
}
function raceTelemetryAction(action){if(!RACE_TELEMETRY.enabled||M!==Race||!Race.telemetry||PAUSE.on||RP.on)return;const changed=RACE_TELEMETRY.tune(Race.telemetry,action);if(changed){renderRaceTelemetry();if(action==='apply'){requestMobileHaptic('tick');}else SND.click();}}
$('#raceCoachSetupStart').addEventListener('click',event=>{if(typeof RACE_PREFLIGHT_ON!=='undefined'&&RACE_PREFLIGHT_ON&&!RACE_PREFLIGHT.committed&&!(typeof raceMultiplayerLocked==='function'&&raceMultiplayerLocked())){racePreflightOpen(event.currentTarget);return;}if(M!==Race||!(Race.progressionActive()||Race.expansionActive())||Race.state!=='grid'||RACE_3D.shouldBlockInput()||PAUSE.on)return;if(RACE_SUPERCAR_AUDIO.enabled)unlock();raceStartKeyboardFocus=event.detail===0;Race.coachStartRequested=true;Race.press('gas',true);Race.press('gas',false);renderRaceTelemetry();$('#gamePacingA11y').textContent='Race lights started. Wait for green.';if(raceStartKeyboardFocus)($('#gamePacingOverlay').hidden?$('.stage'):$('#gamePacingOverlay')).focus({preventScroll:true});});
$('#raceCoachSetupClassic').addEventListener('click',()=>{if(M!==Race||!Race.expansionActive()||Race.state!=='grid')return;if(RACE_SIMULATOR.active)simSelect(false);setPrototypeControls(false);renderRaceTelemetry();});
$('#raceCoachSetupControls').addEventListener('click',()=>{if(M!==Race||!Race.expansionActive()||Race.state!=='grid')return;if(RACE_SIMULATOR.active)simSelect(false);setPrototypeControls(true);renderRaceTelemetry();});
$('#raceCoachSetupSteering').addEventListener('click',()=>{if(typeof raceMultiplayerLocked==='function'&&raceMultiplayerLocked()){COACH.say('Coach Nia: Steering assist is frozen for both seats. Abandon to change it.','tip',5);return;}if(M!==Race||!Race.expansionActive()||Race.state!=='grid')return;Race.opt.steer=Race.opt.steer==='auto'?'you':'auto';renderRaceTelemetry();});
$('#raceCoachSetupVehicle').addEventListener('click',event=>{if(M!==Race||!Race.expansionActive()||Race.state!=='grid')return;GARAGE_UI.active='body';openSettings('garage',event.currentTarget);});
$('#raceCoachSetupGarage').addEventListener('click',event=>{if(M!==Race||!(Race.progressionActive()||Race.expansionActive())||Race.state!=='grid')return;GARAGE_UI.active=typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active?RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected].category:Race.expansionActive()?Race.mode().preferred:'tires';openSettings('garage',event.currentTarget);});
$('#raceToolsGarage').addEventListener('click',event=>{if(M!==Race||!(Race.progressionActive()||Race.expansionActive()))return;GARAGE_UI.active=typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active?RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected].category:Race.expansionActive()?Race.mode().preferred:'tires';openSettings('garage',event.currentTarget);});
for(const id of ['raceSetupSteeringShortcut','raceToolsSteering'])$('#'+id).addEventListener('click',()=>$('#raceCoachSetupSteering').click());
function prepareRaceCoachRetry(){if(M!==Race||!(Race.progressionActive()||Race.expansionActive())||!['done','crashed'].includes(Race.state))return;hideResults();Race.reset();if(RACE_3D.ready&&!RACE_3D.failed){RACE_3D.orbit.phase='done';RACE_3D.orbit.done=true;}renderActions();renderRaceTelemetry();requestAnimationFrame(() => (RACE_SIMULATOR.active?$('#simStart'):$('#raceCoachSetupStart')).focus());}
$('#raceCoachResultGarage').addEventListener('click',event=>{if(M!==Race||!(Race.progressionActive()||Race.expansionActive())||!Race.progressionOutcome)return;GARAGE_UI.active=typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active?RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected].category:Race.expansionActive()?Race.mode().preferred:RACE_PROGRESSION.category(Race.progressionOutcome.failed)||'body';GARAGE_UI.returnToRaceRetry=true;openSettings('garage',event.currentTarget);});
$('#raceCoachResultRetry').addEventListener('click',prepareRaceCoachRetry);
$('#simResultGarage').addEventListener('click',()=>$('#raceCoachResultGarage').click());
$('#simResultRetry').addEventListener('click',prepareRaceCoachRetry);
$('#raceTelemetryPrev').addEventListener('click',()=>raceTelemetryAction('prev'));
$('#raceTelemetryNext').addEventListener('click',()=>raceTelemetryAction('next'));
$('#raceTelemetryApply').addEventListener('click',()=>raceTelemetryAction('apply'));
$('#raceTelemetryShift').addEventListener('click',()=>{if(M!==Race||PAUSE.on||RP.on)return;if(Race.shiftGear()){renderRaceTelemetry();requestMobileHaptic('tick');}});
$('#raceTelemetryGaugeSelect').addEventListener('change',event=>{if(!RACE_CORNER_TRACE.enabled||M!==Race||!Race.telemetry)return;for(let index=0;index<RACE_TELEMETRY.GAUGES.length&&Race.telemetry.selected!==event.currentTarget.value;index++)RACE_TELEMETRY.tune(Race.telemetry,'next');renderRaceTelemetry();SND.click();});
$('#raceTraceVariableSelect').addEventListener('change',event=>{if(!RACE_CORNER_TRACE.enabled||M!==Race)return;for(let index=0;index<RACE_CORNER_TRACE.VARIABLES.length&&RACE_CORNER_TRACE.variable().id!==event.currentTarget.value;index++)RACE_CORNER_TRACE.select(1);renderRaceTelemetry();renderRaceToolTruth();SND.click();});
raceTelemetryEl.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();raceTelemetryAction(event.key==='ArrowLeft'?'prev':'next');}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setFloatingControllerCollapsed(true);}});
raceTelemetryEl.addEventListener('pointerdown',event=>event.stopPropagation());
function raceCoachCueAction(trigger){
  if(M!==Race||!(Race.progressionActive()||Race.expansionActive()))return;
  if(typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active){raceChampionshipOpenNotebook(trigger);return;}
  if(racePhoneToolsActive()){setContextDetail('learn',{trigger,focus:true});return;}
  const level=Race.progressionActive()?Race.progressionLevel():null;
  const message=Race.expansionActive()?Race.progressionComparison||`${Race.mode().description} ${Race.mode().target} ${Race.mode().id==='endurance'?RACE_MODES.endurancePlan():Race.mode().garage}`:Race.progressionComparison||RACE_PROGRESSION.preview(level);
  document.querySelectorAll('#toasts .toast[aria-label="Coach Nia"]').forEach(note=>note.remove());
  toast('Coach Nia',message,{action:'Garage & tuning',hold:30000,onAction:()=>{GARAGE_UI.active=Race.expansionActive()?Race.mode().preferred:RACE_PROGRESSION.category(Race.progressionOutcome?.failed||[])||'tires';GARAGE_UI.returnToRaceRetry=['done','crashed'].includes(Race.state);openSettings('garage',trigger);}});
}
$('#raceTelemetryCue').addEventListener('click',event=>raceCoachCueAction(event.currentTarget));
let raceNavigationAt=0,raceNavigationGauge='',raceNavigationRouteKey='',raceNavigationRoute=null,raceNavigationLastStage='';
function renderRaceNavigation({gauge,value,unit,fraction,phase,cue}){
  const panel=$('#raceNavigation'),cockpit=$('#raceCockpit');panel.hidden=!(RACE_CORNER_TRACE.enabled&&Race.state==='run'&&!RP.on&&!RACE_3D.shouldBlockInput());cockpit.hidden=panel.hidden;if(panel.hidden){raceNavigationLastStage='';if(globalThis.__KICKLAB_RACE_NAVIGATION__)globalThis.__KICKLAB_RACE_NAVIGATION__.visible=false;return;}
  const now=performance.now();if(now-raceNavigationAt<90&&gauge===raceNavigationGauge)return;raceNavigationAt=now;raceNavigationGauge=gauge;
  const progress=$('#racePhoneProgress').getBoundingClientRect(),stage=$('.stage').getBoundingClientRect();
  cockpit.style.left='0px';cockpit.style.top='0px';
  panel.style.left='8px';panel.style.top=`${Math.ceil(progress.bottom-stage.top+6)}px`;
  const P=Race.P(),car=Race.st,mode=Race.expansionActive()?Race.mode().id:'hill',closed=P.expansionCourse==='oval',finish=Race.finishPoint();
  const routeKey=[mode,Race.opt.venue,P.L,P.R,finish.x,finish.y].join(':');
  if(routeKey!==raceNavigationRouteKey){const full=KickLabRaceDriverNavigation.route(RACE_3D.trackPoints(P),closed);if(closed)raceNavigationRoute=full;else{const startProgress=full.nearest(4,0).progress,finishProgress=full.nearest(finish.x,finish.y).progress,trimmed=[full.at(startProgress),...full.points.filter((_,i)=>full.lengths[i]>startProgress&&full.lengths[i]<finishProgress),full.at(finishProgress)];raceNavigationRoute=KickLabRaceDriverNavigation.route(trimmed,false);}raceNavigationRouteKey=routeKey;raceNavigationLastStage='';}
  const route=raceNavigationRoute;
  const venue=RACE_SYSTEMS.venue(Race.opt.venue),grip=RACE_SYSTEMS.grip(car,P,venue),brakeFactor=car.garageBrakeFactor||P.brakePower||1;
  const previousStage=raceNavigationLastStage,nav=KickLabRaceDriverNavigation.plan({route,state:car,parameters:P,mode,grip,heat:Race.telemetry.heat,brakeFactor,telemetry:Race.telemetry,input:Race.inp,attempt:Race.modeAttempt,previousStage});raceNavigationLastStage=nav.stage;
  if(nav.stage!==previousStage)racePhoneNotice(nav.detail.replace(/ kilometres per hour/g,' km/h').replace(/ metres/g,' m').replace(/\. (?=[A-Z])/g,'; '),nav.stage==='brake'||nav.stage==='recover'?'warn':'tip');
  const bounds=route.points.reduce((b,p)=>({minX:Math.min(b.minX,p.x),maxX:Math.max(b.maxX,p.x),minY:Math.min(b.minY,p.y),maxY:Math.max(b.maxY,p.y)}),{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});
  const scale=Math.min(145/Math.max(1,bounds.maxX-bounds.minX),68/Math.max(1,bounds.maxY-bounds.minY));
  const ox=80-(bounds.minX+bounds.maxX)*scale/2,oy=43+(bounds.minY+bounds.maxY)*scale/2;
  const xy=p=>[ox+p.x*scale,oy-p.y*scale];
  const point=p=>xy(p).map(n=>n.toFixed(1)).join(' ');
  $('#raceNavigationRoad').setAttribute('d',route.points.map((p,i)=>`${i?'L':'M'} ${point(p)}`).join(' '));
  const traveled=route.points.filter((_,i)=>route.lengths[i]<=(nav.routeProgress??nav.progress*route.total));traveled.push(route.at(nav.routeProgress??nav.progress*route.total));
  $('#raceNavigationTravel').setAttribute('d',traveled.map((p,i)=>`${i?'L':'M'} ${point(p)}`).join(' '));
  const finishLine=$('#raceNavigationFinish'),finishPoint=route.at(route.total),normal={x:-finishPoint.ty,y:finishPoint.tx};
  finishLine.setAttribute('d',`M ${point({x:finish.x+normal.x*Race.HW*.65,y:finish.y+normal.y*Race.HW*.65})} L ${point({x:finish.x-normal.x*Race.HW*.65,y:finish.y-normal.y*Race.HW*.65})}`);
  for(const [name,id] of [['brake','raceNavigationBrake'],['turn','raceNavigationTurn'],['apex','raceNavigationApex'],['exit','raceNavigationExit']]){const node=$('#'+id),marker=nav.markers[name];node.hidden=!marker;if(marker){const center=route.nearest(marker.x,marker.y).progress;node.setAttribute('d',[-5,0,5].map((offset,i)=>`${i?'L':'M'} ${point(route.at(center+offset))}`).join(' '));}}
  const [cx,cy]=xy(nav.car);$('#raceNavigationCar').setAttribute('transform',`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${(90-nav.heading*180/Math.PI).toFixed(1)})`);
  $('#raceNavigationProgressLabel').textContent=nav.laps>1?`LAP ${nav.lap}/${nav.laps}`:'ROUTE';$('#raceNavigationProgress').textContent=`${Math.round(nav.progress*100)}%`;
  panel.dataset.stage=nav.stage;panel.dataset.turn=nav.turn;panel.setAttribute('aria-label',`Race course map. ${nav.laps>1?`Lap ${nav.lap} of ${nav.laps}`:'Route'} ${Math.round(nav.progress*100)} percent. ${nav.detail} Current speed ${Math.round(car.v*3.6)} kilometres per hour.`);
  $('#raceNavigationMap').setAttribute('aria-label',`Full course with live vehicle heading, finish, and corner zones. ${nav.detail}`);
  globalThis.__KICKLAB_RACE_NAVIGATION__={stage:nav.stage,turn:nav.turn,severity:nav.severity,distance:nav.distance,targetSpeed:nav.targetSpeed,brakeDistance:nav.brakeDistance,progress:nav.progress,lap:nav.lap,laps:nav.laps,grip:nav.grip,detail:nav.detail,finish,finishVisible:true,gauge,value,unit,visible:true};
}
if(RACE_CORNER_TRACE.enabled)globalThis.__KICKLAB_RACE_START_FINISH_QA__={
  useCanvas(){best.gfx='2d';},
  approach(){if(M!==Race||Race.state!=='run')return false;const finish=Race.finishPoint(),sign=Math.sign(finish.y);Object.assign(Race.st,{x:finish.x,y:finish.y-sign*25,th:sign*Math.PI/2,zone:2,v:0});Race.cornerTracePrediction=null;RACE_3D.cameraPose=null;renderRaceTelemetry();return true;},
  cross(){if(M!==Race||Race.state!=='run')return false;const finish=Race.finishPoint();Race.st.y=finish.y+Math.sign(finish.y)*.2;return true;}
};
if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('raceEngineQA')==='1')globalThis.__KICKLAB_RACE_ENGINE_QA__=Object.freeze({
  select(mode,vehicle){Race.selectMode(mode);Race.selectVehicle(vehicle);},
  controls(analog){setPrototypeControls(!!analog);},
  run(){RACE_3D.orbit.phase='done';RACE_3D.orbit.done=true;RACE_3D.awaitingPacing=false;RACE_3D.cameraPose=null;if(RACE_3D.orbitPanel)RACE_3D.orbitPanel.hidden=true;RACE_3D.setStartLights('go');Race.state='run';E.title=null;if(Race.mode().id==='drag')Race.st.x=45;Race.st.v=18;Race.st.t=4;Race.telemetry.selected='temperature';Race.telemetry.manualUntil=1000;renderRaceTelemetry();},
  thermal(heat,overheat,phase){Race.telemetry.heat=heat;Race.telemetry.overheat=overheat;Race.telemetry.phase=phase;Race.telemetry.recoveryUntil=phase==='recovered'?Race.telemetry.clock+1.5:0;Race.telemetry.selected='temperature';Race.telemetry.manualUntil=1000;Race.inp.gas=overheat&&heat>=.91;Race.st.t+=.2;renderRaceTelemetry();},
  state(){return{phase:Race.state,inputs:{...Race.inp},paused:PAUSE.on,steer:Race.opt.steer,wheel:Race.wheel,heat:Race.telemetry?.heat,thermal:Race.telemetry?RACE_TELEMETRY.thermalStage(Race.telemetry):null};},
  effect(fixture){const t=Race.telemetry,s=Race.st;let launchSetup=null;Race.__qaNosDrain=false;RACE_CINEMATIC_FX.clear(RACE_3D);Race.state='run';if(Race.mode().id==='drag')Object.assign(s,{x:45,y:0,th:0});Race.inp.gas=false;Race.inp.brake=false;t.nosPulse=0;t.brakeHeat=0;t.braking=0;t.grip=1;t.gripRecoveryUntil=0;s.nitroActive=false;s.nitroDelivered=false;s.launchSlip=0;s.driftMode='none';s.slipAngle=0;s.skidTime=0;s.slide=false;s.wheel=0;t.heat=.35;t.overheat=false;t.phase='drive';
    if(fixture==='exhaust'){t.heat=.82;t.torque=.75;}
    if(fixture==='normal-exhaust'){t.heat=.35;t.torque=.75;}
    if(fixture==='nos'||fixture==='nos-ignition'){t.nosPulse=1.2;s.nitroActive=true;s.nitroDelivered=true;t.torque=.8;Race.inp.gas=true;s.nitro=.9;Race.__qaNosDrain=true;}
    if(fixture==='nos-no-drain'||fixture==='nos-no-traction'||fixture==='nos-released'||fixture==='nos-depleted'){t.nosPulse=1.2;s.nitroActive=fixture!=='nos-released';s.nitroDelivered=fixture!=='nos-no-traction'&&fixture!=='nos-released';Race.inp.gas=true;if(fixture==='nos-depleted')s.nitro=0;else if(fixture==='nos-no-traction')s.nitro=Math.max(0,s.nitro-.1);}
    if(fixture==='launch'){s.v=0;Race.inp.brake=true;Race.inp.gas=true;RACE_CINEMATIC_FX.step(RACE_3D,.05);launchSetup={...RACE_3D.cinematicFx?.launch};Race.inp.brake=false;s.launchSlip=.28;s.v=2.8;s.t+=.03;}
    if(fixture==='launch-ordinary'){s.launchSlip=.28;s.v=3;Race.inp.gas=true;}
    if(fixture==='launch-expired'){s.v=0;Race.inp.brake=true;Race.inp.gas=true;RACE_CINEMATIC_FX.step(RACE_3D,.05);Race.inp.brake=false;s.launchSlip=.28;s.v=3;s.t+=.5;}
    if(fixture.startsWith('shift-')){Race.modeAttempt.phase='run';Race.modeAttempt.gear=1;Race.modeAttempt.shiftCooldown=0;s.v=Race.P().top*(RACE_MODES.shiftTarget(1)+(fixture==='shift-early'?-.12:fixture==='shift-ordinary'?-.06:0));Race.shiftGear();}
    if(fixture==='drift'){s.driftMode='drift';s.slipAngle=.2;s.v=18;}
    if(fixture==='brake'||fixture==='brake-hot'||fixture==='brake-lock'){s.driftMode='skid';s.slide=true;s.slipAngle=.26;t.braking=fixture==='brake-hot'?.86:.7;t.brakeHeat=fixture==='brake-hot'?.91:0;s.v=18;}
    if(fixture==='spinout'){s.driftMode='skid';s.slide=true;s.skidTime=.8;s.slipAngle=.44;s.wheel=-42;s.v=16;t.grip=.48;}
    if(fixture.startsWith('cutaway')){Race.state='done';RACE_CINEMATIC_FX.success(RACE_3D,fixture==='cutaway'?'drivetrain':fixture.slice('cutaway-'.length));}
    if(RACE_3D.cinematicFx)for(let i=0;i<(fixture.startsWith('cutaway')?(reduce?1:26):fixture==='nos-ignition'?1:fixture==='shift-perfect'?2:35);i++){
      if(['launch','drift','brake','brake-hot','brake-lock','spinout'].includes(fixture)){
        const distance=s.v*.05;s.x+=Math.cos(s.th)*distance;s.y+=Math.sin(s.th)*distance;
        if(fixture==='drift')s.th+=.0025;if(fixture==='spinout')s.th+=.006;
        RACE_3D.car.position.set(s.x,.025,s.y);RACE_3D.car.rotation.y=-s.th-Race.spin;RACE_3D.car.updateMatrixWorld(true);
      }
      if(fixture==='nos'||fixture==='nos-ignition')s.nitro=Math.max(.01,s.nitro-.003);
      RACE_CINEMATIC_FX.step(RACE_3D,.05);
    }
    if(RACE_3D.ready){RACE_3D.car.updateMatrixWorld(true);RACE_3D.cameraPose=null;if(fixture==='spinout')for(let i=0;i<12;i++)RACE_3D.render(.05);if(fixture==='nos'||fixture==='nos-ignition')s.nitro=Math.max(.01,s.nitro-.003);RACE_3D.render(.016);}
    return{fx:globalThis.__KICKLAB_RACE_FX__||null,launchSetup,launchState:RACE_3D.cinematicFx?.launch||null,spin:globalThis.__KICKLAB_RACE_SPIN__||null,vehicle:Race.vehicle().id,mode:Race.mode().id,phase:Race.state,paused:PAUSE.on,nitroActive:s.nitroActive,nosPulse:t.nosPulse,overheat:t.overheat,captionShown:!RACE_3D.cutawayCaption?.hidden,flamesVisible:RACE_3D.cinematicFx?.flames.some(item=>item.sprite.visible)||false,storage:Object.keys(localStorage).sort(),gpu:globalThis.__KICKLAB_RACE_3D__?.gpuMemory,renderer:globalThis.__KICKLAB_RACE_3D__?.status};},
  effectsLifecycle(action){if(action==='fade'){Race.state='done';Race.st.launchSlip=0;for(let i=0;i<115;i++)RACE_CINEMATIC_FX.step(RACE_3D,.05);}if(action==='reset')Race.reset();if(action==='pagehide'){window.dispatchEvent(new Event('pagehide'));RACE_CINEMATIC_FX.step(RACE_3D,.05);}return{fx:globalThis.__KICKLAB_RACE_FX__||null,captionShown:!RACE_3D.cutawayCaption?.hidden,paused:PAUSE.on,inputs:{...Race.inp}};},
  advanceEffects(seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)RACE_CINEMATIC_FX.step(RACE_3D,.05);return globalThis.__KICKLAB_RACE_FX__||null;},
  holdPresentation(on){if(on){if(!Race.__cinematicQaUpdate)Race.__cinematicQaUpdate=Race.update;Race.update=()=>{if(Race.__qaNosDrain)Race.st.nitro=Math.max(.01,Race.st.nitro-.001);};}else if(Race.__cinematicQaUpdate){Race.__qaNosDrain=false;Race.update=Race.__cinematicQaUpdate;delete Race.__cinematicQaUpdate;}return !!Race.__cinematicQaUpdate;},
  nudgePresentation(meters){Race.st.x+=Number(meters)||0;return Race.st.x;},
  tireAudit(){const state=RACE_CINEMATIC_FX.canvasTires;return{renderer:RACE_3D.on?'rendering':'canvas',canvasTires:state?{event:state.event,clock:state.clock,lastSample:state.lastSample,lastRaceTime:state.lastRaceTime,raceTime:Race.st.t,raceState:Race.state,paused:PAUSE.on,marks:state.marks.length,puffs:state.puffs.length,position:[Race.st.x,Race.st.y],pathError:RACE_SYSTEMS.path(Race.st.x,Race.st.y,Race.P(),RACE_SYSTEMS.venue(Race.opt.venue)).e}:null,storage:Object.keys(localStorage).sort()};},
  canvasLaunch(valid){const s=Race.st,c=cv.getContext('2d');PAUSE.on=false;RACE_CINEMATIC_FX.canvasTires=null;Race.state='run';Object.assign(s,{x:45,y:0,th:0,v:0,t:4,launchSlip:0,driftMode:'none',slipAngle:0});Race.inp.gas=true;Race.inp.brake=!!valid;if(valid)RACE_CINEMATIC_FX.drawCanvasTires(c,Race);Race.inp.brake=false;s.v=2.8;s.launchSlip=.28;s.t+=.03;for(let i=0;i<12;i++){s.x+=.38;s.t+=.05;if(RACE_CINEMATIC_FX.canvasTires)RACE_CINEMATIC_FX.canvasTires.lastNow-=100;RACE_CINEMATIC_FX.drawCanvasTires(c,Race);}return this.tireAudit();},
  spinPauseResume(){PAUSE.on=true;RACE_3D.render(.05);const paused={...globalThis.__KICKLAB_RACE_SPIN__};PAUSE.on=false;RACE_3D.render(.05);return{paused,resumed:{...globalThis.__KICKLAB_RACE_SPIN__}};},
  endBoostPresentation(){Race.__qaNosDrain=false;Race.telemetry.nosPulse=0;Race.st.nitroActive=false;Race.st.nitroDelivered=false;return true;},
  stopSlipPresentation(){Race.st.launchSlip=0;Race.st.driftMode='none';Race.st.slipAngle=0;Race.telemetry.braking=0;return true;},
  recoverSpinPresentation(){const s=Race.st,t=Race.telemetry;s.driftMode='none';s.slide=false;s.skidTime=0;s.slipAngle=0;s.wheel=0;t.braking=0;t.grip=.86;t.gripRecoveryUntil=t.clock+.8;for(let i=0;i<24;i++)RACE_3D.render(.05);return{fx:globalThis.__KICKLAB_RACE_FX__,spin:globalThis.__KICKLAB_RACE_SPIN__,grip:t.grip,vehicle:Race.vehicle().id};}
});

$('#simResultSeasonDetails').addEventListener('click',event=>raceChampionshipOpenNotebook(event.currentTarget));
