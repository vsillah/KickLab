/* ---------- narrow Capacitor lifecycle + haptic contract ---------- */
const MOBILE_STATE={active:true,ownsPause:false,lastReason:'startup'};
const MOBILE_HAPTIC_STYLES=Object.freeze({target:'LIGHT',perfect:'MEDIUM',overcharge:'HEAVY'});
function reflectMobileState(){document.documentElement.dataset.kicklabMobileLifecycle=MOBILE_STATE.active?'active':'suspended';}

function releaseMobileHeldInputs(reason='App interrupted'){
  document.querySelectorAll('#pad button.on').forEach(button=>button.dispatchEvent(new Event('pointercancel')));
  document.querySelectorAll('#raceAnalogActions [data-held="true"]').forEach(button=>{button.dispatchEvent(new Event('pointercancel'));button.dataset.held='false';button.classList.remove('on');});
  Object.entries(held).forEach(([code,id])=>{if(id){M.press(id,false);held[code]=false;padEls(id).forEach(button=>button.classList.remove('on'));}});
  if(canvasHeld){canvasHeld=false;M.press(primary(),false);}drag=null;
  if(typeof ANALOG_CONTROL!=='undefined')ANALOG_CONTROL.keys.clear();
  if(typeof releaseAnalog==='function')releaseAnalog(reason);else if(typeof cancelAnalog==='function')cancelAnalog(reason);
  if(typeof cancelGesture==='function')cancelGesture(reason);
  if(typeof RACE_SYSTEMS!=='undefined'&&RACE_SYSTEMS.enabled()&&M===Race){RACE_SYSTEMS.cancelInput(Race.inp);if(RACE_TELEMETRY.enabled)RACE_TELEMETRY.cancel(Race.telemetry);Race.gas=false;Race.brake=false;}
}
function suspendMobileAudio(){ENGINE.off();if(AC&&AC.state==='running'){try{const pending=AC.suspend();if(pending&&typeof pending.catch==='function')pending.catch(()=>{});}catch(_){}}}
function suspendMobileSession(reason='background'){
  releaseMobileHeldInputs(reason);suspendMobileAudio();MOBILE_STATE.active=false;MOBILE_STATE.lastReason=reason;
  claimPauseOwner('mobile-lifecycle');MOBILE_STATE.ownsPause=true;
  reflectMobileState();return Object.freeze({...MOBILE_STATE});
}
function foregroundMobileSession(reason='foreground'){
  MOBILE_STATE.active=true;MOBILE_STATE.lastReason=reason;
  // A foreground transition never resumes play or audio. The next player gesture owns both.
  reflectMobileState();return Object.freeze({...MOBILE_STATE});
}
function requestMobileHaptic(name){
  const style=MOBILE_HAPTIC_STYLES[name];if(!style)return false;
  const plugin=globalThis.Capacitor&&globalThis.Capacitor.Plugins&&globalThis.Capacitor.Plugins.Haptics;
  if(plugin&&typeof plugin.impact==='function'){try{const pending=plugin.impact({style});if(pending&&typeof pending.catch==='function')pending.catch(()=>{});return true;}catch(_){}}
  try{return!!(navigator.vibrate&&navigator.vibrate(GAME_CORE.hapticCueFor(name)));}catch(_){return false;}
}
function nativeMobileRuntime(){try{return!!(globalThis.Capacitor&&globalThis.Capacitor.isNativePlatform&&globalThis.Capacitor.isNativePlatform());}catch(_){return false;}}
function installMobileLifecycle(){
  const app=globalThis.Capacitor&&globalThis.Capacitor.Plugins&&globalThis.Capacitor.Plugins.App;
  if(app&&typeof app.addListener==='function')app.addListener('appStateChange',({isActive})=>isActive?foregroundMobileSession('app-active'):suspendMobileSession('app-background'));
  document.addEventListener('visibilitychange',()=>{if(!nativeMobileRuntime())return;document.hidden?suspendMobileSession('document-hidden'):foregroundMobileSession('document-visible');});
  window.addEventListener('pagehide',()=>{if(nativeMobileRuntime())suspendMobileSession('page-hidden');});
  window.addEventListener('pageshow',()=>{if(nativeMobileRuntime())foregroundMobileSession('page-visible');});
}

const MOBILE_SHELL=Object.freeze({
  apiVersion:'1.0.0',
  suspend:suspendMobileSession,
  foreground:foregroundMobileSession,
  haptic:requestMobileHaptic,
  state:()=>Object.freeze({...MOBILE_STATE})
});
globalThis.KickLabMobileLifecycle=MOBILE_SHELL;
reflectMobileState();
installMobileLifecycle();
