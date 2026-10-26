/* Flagged, local presentation coach. Canonical Race and finisher logic own every action. */
const RACE_CONTEXTUAL_COACH=(()=>{
  const core=globalThis.KickLabRaceContextualCoach;
  let state=core.create(best.raceControlCoach),profileId=profileManager.active().id,runKey='',shown='',until=0,missedShift='',suspended=false;
  const ghost=document.createElement('span'),ghostIcon=document.createElement('b'),ghostVerb=document.createElement('small');ghost.className='race-control-ghost';ghost.setAttribute('aria-hidden','true');ghost.hidden=true;ghost.append(ghostIcon,ghostVerb);$('#raceActionDial').append(ghost);
  function history(event){if(!event)return;const labels={shift:'Shift',nos:'NOS',drift:'Drift',launch:'Launch control',finisher:'Finisher'},names={success:'confirmed',early:'early',late:'late',miss:'missed'};
    RACE_PHONE_NOTICE.entries.push({text:`${labels[event.id]} ${names[event.kind]}. ${event.detail} ${event.to==='retired'?'Gesture mastered; cue retired.':event.from==='retired'?'Cue returned after repeated misses.':''}`.trim(),mood:event.kind==='success'?'tip':'warn',sequence:++RACE_PHONE_NOTICE.sequence});
    if(RACE_PHONE_NOTICE.entries.length>12)RACE_PHONE_NOTICE.entries.shift();renderRaceCoachHistory();
  }
  function sync(){const active=profileManager.active().id;if(profileId!==active){profileId=active;state=core.create(best.raceControlCoach);runKey='';shown='';ghost.hidden=true;}const key=`${active}:${Race.preflightEpoch||0}`;if(runKey!==key){runKey=key;core.resetRun(state);shown='';missedShift='';ghost.hidden=true;}}
  function result(id,kind,detail=''){if(!core.enabled)return;sync();const event=core.observe(state,id,kind,detail);if(!event)return;best.raceControlCoach=core.normalize(state.progress);saveBest();history(event);if(kind==='success'){if(id!=='shift'&&id!=='nos')requestMobileHaptic('tick');if(!best.mute)SND.click();}shown='';}
  function cancel(){ghost.hidden=true;shown='';until=0;}
  function suspend(){suspended=true;cancel();}
  function render({dial,action,gas,current,g,brakeArmed,finishApproach}){
    if(!core.enabled){ghost.hidden=true;return;}sync();if(suspended||Race.state!=='run'||PAUSE.on||RP.on||CINE.on||document.hidden||!RACE_3D.ready){cancel();return;}
    const gear=Race.modeAttempt?.gear||1,ratio=Race.st.v/Math.max(1,Race.P().top),target=RACE_MODES.shiftTarget(gear),shiftKey=`${runKey}:${gear}`;
    if(Race.mode().id==='drag'&&gear<4&&ratio>target+.12&&missedShift!==shiftKey){missedShift=shiftKey;result('shift','miss','The useful RPM band passed before the shift.');}
    const id=finishApproach?'finisher':brakeArmed?'launch':current?.id==='shift'?'shift':current?.id==='nos'?'nos':current?.id?.includes('handbrake')?'drift':null;
    if(id==='finisher'||id==='launch')$('#raceDialMetricIcon').textContent=id==='finisher'?'⚑':'◉';
    const phase=id&&core.status(state,id),urgent=id==='shift'&&ratio>=target-.08||id==='finisher'||id==='launch'||id==='nos'&&g.state==='OPT';
    if(!id||phase==='retired'||!urgent){ghost.hidden=true;shown='';return;}
    const content={shift:['⇧','TAP','Tap at the bright RPM band'],nos:['⚡','TAP','Tap for a short NOS pulse'],drift:['↶','HOLD','Hold for a controlled slide'],launch:['◉','RELEASE','Release brake to launch'],finisher:['⚑','STEER + HOLD','Steer and hold handbrake beside the finish marker']}[id];
    const key=`${id}:${phase}:${gear}`;if(key!==shown){shown=key;until=performance.now()+2500;}if(performance.now()>until){ghost.hidden=true;return;}
    ghostIcon.textContent=content[0];ghostVerb.textContent=content[1];ghost.title=content[2];ghost.dataset.anchor=id==='launch'?'brake':id==='finisher'?'finish':'action';ghost.dataset.phase=phase;ghost.hidden=false;
    action.dataset.coachPhase=id==='shift'||id==='nos'||id==='drift'?phase:'';dial.dataset.coachCue=id;
  }
  if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('raceCoachQA')==='1')globalThis.__KICKLAB_RACE_CONTEXTUAL_QA__=Object.freeze({state:()=>({enabled:core.enabled,profileId,progress:core.normalize(state.progress),run:{...state.run},history:[...state.history],ghost:!ghost.hidden?ghost.dataset.anchor:null}),result,cameraFixture:phase=>{if(!core.enabled||!['success','missed'].includes(phase))return false;Race.state='done';Race.st.x=Race.finishPoint().x-22;Race.st.y=Race.finishPoint().y;Race.st.v=0;Object.assign(Race.signatureFinish,{phase:phase==='success'?'cinematic':'complete',used:phase==='success',shown:false,reason:phase==='success'?'earned':'brake-missed',kind:phase==='success'?'precision-hero':'power-stop',anchor:{mode:Race.mode().id,vehicle:Race.vehicle().id,venue:Race.opt.venue}});return true;},reset:()=>{state=core.create(null);best.raceControlCoach=core.normalize(state.progress);saveBest();runKey='';sync();}});
  window.addEventListener('focus',()=>{suspended=false;});
  return Object.freeze({render,result,cancel,suspend});
})();
