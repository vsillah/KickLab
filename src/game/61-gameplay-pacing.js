/* ---------- canonical pause ownership + between-game pacing ---------- */
const PAUSE_OWNERS=KickLabGameplayPacing.createPauseOwnership();
const PACE={pending:null,activeMeta:null,replacing:false};
const pacingOverlay=$('#gamePacingOverlay'),pacingPhase=$('#gamePacingPhase'),pacingActivity=$('#gamePacingActivity'),pacingResume=$('#gamePacingResume'),pacingA11y=$('#gamePacingA11y');

function pauseReason(snapshot){if(snapshot.manual)return'manual';return snapshot.owners[0]||'';}
function renderPausedOverlay(){
  const snapshot=PAUSE_OWNERS.snapshot(),manual=snapshot.manual&&!PACE_SEQUENCE.state().active,lifecycle=snapshot.owners.some(owner=>owner==='mobile-lifecycle'||owner==='document-hidden');
  if(!manual&&!lifecycle){if(!PACE_SEQUENCE.state().active)pacingOverlay.hidden=true;return;}
  pacingOverlay.hidden=false;pacingOverlay.dataset.state='paused';pacingOverlay.dataset.presentation='card';$('#gamePacingKicker').textContent=lifecycle?'Paused while away':'Game paused';pacingPhase.textContent='PAUSED';pacingActivity.textContent=lifecycle?'Resume when you are ready':'Tap the stage or press P to continue';$('#gameControlPreview').innerHTML='';pacingResume.hidden=false;pacingA11y.textContent=lifecycle?'Gameplay paused while the app was in the background. Activate Resume game, tap the stage, or press P to continue.':'Game paused. Activate Resume game, tap the stage, or press P to continue.';
}
function applyPauseSnapshot(snapshot,{notify=true}={}){
  const was=PAUSE.on;PAUSE.on=snapshot.paused;PAUSE.why=pauseReason(snapshot);PAUSE.resumeT=0;
  if(PAUSE.on){ENGINE.off();if(M&&M.inp){M.inp.gas=false;M.inp.brake=false;M.inp.left=false;M.inp.right=false;}if(M&&M.key==='fight'){Fight.blocking=false;Fight.ducking=false;Fight.queued=null;}document.querySelectorAll('#pad .on').forEach(button=>button.classList.remove('on'));}
  else if(was&&M&&M.onResume)M.onResume();
  if(notify)renderPausedOverlay();return snapshot;
}
function resetPauseOwnership(){PAUSE_OWNERS.reset();return applyPauseSnapshot(PAUSE_OWNERS.snapshot());}
function claimPauseOwner(owner){
  if(owner!=='transition'&&PACE_SEQUENCE.state().active)cancelGameTransition(`pause:${owner}`,{retain:true});
  return applyPauseSnapshot(PAUSE_OWNERS.claim(owner));
}
function releasePauseOwner(owner,{restart=true}={}){const snapshot=applyPauseSnapshot(PAUSE_OWNERS.release(owner));if(restart)maybeRestartGameTransition();return snapshot;}
function setManualPause(on){if(on&&!pausable())return PAUSE_OWNERS.snapshot();const snapshot=applyPauseSnapshot(PAUSE_OWNERS.setManual(on));if(!on)maybeRestartGameTransition();return snapshot;}
function resumePlayerPause(){
  let snapshot=PAUSE_OWNERS.snapshot();
  if(snapshot.manual)snapshot=setManualPause(false);
  else if(!document.hidden&&(snapshot.owners.includes('document-hidden')||snapshot.owners.includes('mobile-lifecycle'))){
    if(snapshot.owners.includes('mobile-lifecycle')&&typeof MOBILE_SHELL!=='undefined'&&MOBILE_SHELL.state().active){MOBILE_SHELL.resume('player-resume');snapshot=PAUSE_OWNERS.snapshot();}
    if(snapshot.owners.includes('document-hidden'))snapshot=releasePauseOwner('document-hidden',{restart:false});
    maybeRestartGameTransition();
  }
  return snapshot;
}

function pacingContext(meta={}){
  if(meta.controlContext)return meta.controlContext;
  return{mode:M.key,shot:M===Kick?Kick.opt.shot:null,pso:M===Kick?Kick.opt.pso:null,state:M===Kick&&Kick.opt.shot==='dribble'?Drib.state:M.state,pass:M===Kick&&!!Drib.ps,keeper:M===Kick&&!!Drib.gs,combo:M===Kick&&!!Drib.cb};
}
function pacingActivityName(meta={}){if(meta.activity)return meta.activity;if(M===Fight)return'Fight round';if(M===Race)return'Race run';if(M===Kick){const game=typeof GAMES!=='undefined'&&GAMES.find(item=>item.k===curGame());return game?game.n:Kick.opt.shot==='header'?'Header duel':'Free kick';}return'Next game';}
function renderControlPreview(mapping){
  const cell=(icon,title,copy,klass='')=>`<span class="${klass}"><i aria-hidden="true">${icon}</i><b>${title}</b><small>${copy}</small></span>`;
  const html=cell('↔',mapping.x.join(' / '),'side to side')+cell('●',mapping.action[0],mapping.action[1],'control-action')+cell('↕',mapping.y.join(' / '),'down / up');
  const preview=$('#gameControlPreview');preview.style.setProperty('--control-accent',mapping.color);preview.innerHTML=html;preview.setAttribute('aria-label',`${mapping.title}. ${mapping.x.join(' and ')}. ${mapping.y.join(' and ')}. ${mapping.action.join('. ')}.`);
}
function isMatchPresentation(meta={}){return meta.presentation==='match'&&M===Kick&&MATCH.on;}
function renderMatchPacing(phase,meta,mapping){const detail=meta.matchTransition||{};if(!MATCH.tr||!MATCH.tr.pacing)MATCH.tr={pacing:true,t:matchMedia('(prefers-reduced-motion: reduce)').matches ? .3 : 0};Object.assign(MATCH.tr,{pacing:true,phase:phase.label,minute:detail.minute,title:detail.title||pacingActivityName(meta),sub:detail.sub||'',score:detail.score||'',mapping});pacingOverlay.hidden=true;pacingOverlay.dataset.presentation='match';pacingOverlay.dataset.phase=phase.label;pacingOverlay.dataset.activity=`${detail.minute}' · ${detail.title}`;pacingOverlay.dataset.mapping=mapping.id;}
function clearMatchPacing(meta={}){if(meta.presentation==='match'&&MATCH.tr&&MATCH.tr.pacing)MATCH.tr=null;if(meta.presentation==='match'){delete pacingOverlay.dataset.presentation;delete pacingOverlay.dataset.phase;delete pacingOverlay.dataset.activity;delete pacingOverlay.dataset.mapping;}}
function cuePacingPhase(phase){if(best.mute)return;if(phase.key==='go')SND.total();else if(['3','2','1'].includes(phase.key))SND.tick();}
const PACE_SEQUENCE=KickLabGameplayPacing.createTransitionSequence({
  onPhase(phase,meta){
    const mapping=GAME_CORE.resolveControlMapping(pacingContext(meta));if(isMatchPresentation(meta))renderMatchPacing(phase,meta,mapping);else{pacingOverlay.hidden=false;pacingOverlay.dataset.state='countdown';pacingOverlay.dataset.presentation='card';pacingResume.hidden=true;$('#gamePacingKicker').textContent=phase.key==='ready'?'Next activity':'Get set';pacingPhase.textContent=phase.label;pacingActivity.textContent=pacingActivityName(meta);renderControlPreview(mapping);}cuePacingPhase(phase);
    if(phase.key==='ready')pacingA11y.textContent=`${pacingActivityName(meta)} is next. Countdown starting. ${mapping.title}. ${mapping.x.join(' and ')}. ${mapping.y.join(' and ')}. ${mapping.action.join('. ')}.`;else if(phase.key==='go')pacingA11y.textContent='Go. Gameplay started.';
  },
  onComplete(meta){PACE.activeMeta=null;clearMatchPacing(meta);pacingOverlay.hidden=true;releasePauseOwner('transition',{restart:false});if(meta&&typeof meta.onGo==='function')meta.onGo();},
  onCancel(reason,meta){PACE.activeMeta=null;clearMatchPacing(meta);releasePauseOwner('transition',{restart:false});}
});
function startGameTransition(meta={}){const snapshot=PAUSE_OWNERS.snapshot();if(snapshot.manual||snapshot.owners.some(owner=>owner!=='transition')){PACE.pending=meta;return PACE_SEQUENCE.state();}PACE.pending=null;if(PACE_SEQUENCE.state().active)PACE_SEQUENCE.cancel('replaced');PACE.activeMeta=meta;claimPauseOwner('transition');PACE_SEQUENCE.start(meta);return PACE_SEQUENCE.state();}
function cancelGameTransition(reason='cancelled',{retain=false}={}){const active=PACE_SEQUENCE.state();if(!active.active)return active;if(retain)PACE.pending=active.meta;PACE_SEQUENCE.cancel(reason);return PACE_SEQUENCE.state();}
function maybeRestartGameTransition(){const snapshot=PAUSE_OWNERS.snapshot();if(!PACE.pending||snapshot.manual||snapshot.owners.length)return false;const pending=PACE.pending;PACE.pending=null;startGameTransition(pending);return true;}
function stopGamePacing(reason='stopped'){PACE.pending=null;if(PACE_SEQUENCE.state().active)PACE_SEQUENCE.cancel(reason);pacingOverlay.hidden=true;}

pacingOverlay.addEventListener('pointerdown',event=>{event.stopPropagation();const snapshot=PAUSE_OWNERS.snapshot();if(event.target===pacingOverlay&&(snapshot.manual||snapshot.owners.includes('mobile-lifecycle')||snapshot.owners.includes('document-hidden'))){unlock();resumePlayerPause();}});
pacingResume.addEventListener('click',event=>{event.stopPropagation();unlock();resumePlayerPause();});
