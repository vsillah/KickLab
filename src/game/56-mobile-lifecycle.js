/* ---------- narrow Capacitor lifecycle + haptic contract ---------- */
const MOBILE_HAPTIC_STYLES=Object.freeze({target:'LIGHT',perfect:'MEDIUM',overcharge:'HEAVY'});
const MOBILE_AUDIT={lastInputCancellation:null,lastAudioCancellation:null};
function mobileState(){const state=MOBILE_SESSION.state(),runtime=Object.freeze({gestureActive:typeof GESTURE_CONTROL!=='undefined'&&GESTURE_CONTROL.pointer!=null,engineActive:!!ENGINE.o,crowdActive:typeof CROWD!=='undefined'&&!!CROWD.src,audioContextState:AC?AC.state:'uninitialized'});return Object.freeze({...state,ownsPause:state.awaitingPlayerResume,runtime,...MOBILE_AUDIT});}
function reflectMobileState(){const state=MOBILE_SESSION.state();document.documentElement.dataset.kicklabMobileLifecycle=state.active?(state.awaitingPlayerResume?'awaiting-resume':'active'):'suspended';}

function releaseMobileHeldInputs(reason='App interrupted'){
  const summary={reason,padButtons:document.querySelectorAll('#pad button.on').length,keyboard:0,canvas:!!canvasHeld,drag:!!drag,analog:typeof ANALOG_CONTROL!=='undefined'&&(ANALOG_CONTROL.pointer!=null||ANALOG_CONTROL.pressed.size>0||ANALOG_CONTROL.keys.size>0),gesture:typeof GESTURE_CONTROL!=='undefined'&&GESTURE_CONTROL.pointer!=null};
  document.querySelectorAll('#pad button.on').forEach(button=>button.dispatchEvent(new Event('pointercancel')));
  Object.entries(held).forEach(([code,id])=>{if(id){summary.keyboard+=1;M.press(id,false);held[code]=false;padEls(id).forEach(button=>button.classList.remove('on'));}});
  if(canvasHeld){canvasHeld=false;M.press(primary(),false);}drag=null;
  if(typeof ANALOG_CONTROL!=='undefined')ANALOG_CONTROL.keys.clear();
  if(typeof releaseAnalog==='function')releaseAnalog(reason);else if(typeof cancelAnalog==='function')cancelAnalog(reason);
  if(typeof cancelGesture==='function')cancelGesture(reason);
  MOBILE_AUDIT.lastInputCancellation=Object.freeze(summary);return summary;
}
function suspendMobileAudio(){const summary={engine:!!ENGINE.o,context:AC?AC.state:'uninitialized',crowd:typeof CROWD!=='undefined'&&!!CROWD.src};ENGINE.off();if(typeof CROWD!=='undefined')CROWD.off();if(AC&&AC.state==='running'){try{const pending=AC.suspend();if(pending&&typeof pending.catch==='function')pending.catch(()=>{});}catch(_){}}MOBILE_AUDIT.lastAudioCancellation=Object.freeze(summary);return summary;}
const MOBILE_SESSION=KickLabGameplayPacing.createLifecycleSession({
  onSuspend(reason){releaseMobileHeldInputs(reason);suspendMobileAudio();claimPauseOwner('mobile-lifecycle');},
  onForeground(){/* Foregrounding never resumes play or audio. */},
  onResume(){releasePauseOwner('mobile-lifecycle',{restart:false});maybeRestartGameTransition();}
});
function suspendMobileSession(reason='background'){MOBILE_SESSION.suspend(reason);reflectMobileState();return mobileState();}
function foregroundMobileSession(reason='foreground'){MOBILE_SESSION.foreground(reason);reflectMobileState();return mobileState();}
function resumeMobileSession(reason='player-resume'){if(document.hidden)return mobileState();MOBILE_SESSION.resume(reason);reflectMobileState();return mobileState();}
function requestMobileHaptic(name){
  const style=MOBILE_HAPTIC_STYLES[name];if(!style)return false;
  const plugin=globalThis.Capacitor&&globalThis.Capacitor.Plugins&&globalThis.Capacitor.Plugins.Haptics;
  if(plugin&&typeof plugin.impact==='function'){try{const pending=plugin.impact({style});if(pending&&typeof pending.catch==='function')pending.catch(()=>{});return true;}catch(_){}}
  try{return!!(navigator.vibrate&&navigator.vibrate(GAME_CORE.hapticCueFor(name)));}catch(_){return false;}
}
function installMobileLifecycle(){
  const app=globalThis.Capacitor&&globalThis.Capacitor.Plugins&&globalThis.Capacitor.Plugins.App;
  if(app&&typeof app.addListener==='function')app.addListener('appStateChange',({isActive})=>isActive?foregroundMobileSession('app-active'):suspendMobileSession('app-background'));
  document.addEventListener('visibilitychange',()=>document.hidden?suspendMobileSession('document-hidden'):foregroundMobileSession('document-visible'));
  window.addEventListener('pagehide',()=>suspendMobileSession('page-hidden'));
  window.addEventListener('pageshow',()=>foregroundMobileSession('page-visible'));
}

const MOBILE_SHELL=Object.freeze({
  apiVersion:'1.1.0',
  suspend:suspendMobileSession,
  foreground:foregroundMobileSession,
  resume:resumeMobileSession,
  haptic:requestMobileHaptic,
  state:mobileState
});
globalThis.KickLabMobileLifecycle=MOBILE_SHELL;
reflectMobileState();
installMobileLifecycle();
