
(()=>{
'use strict';
const GAME_CORE=globalThis.KickLabGameCore;
const PROFILE_CORE=globalThis.KickLabProfiles;
const $=s=>document.querySelector(s);
const cv=$('#cv'),ctx=cv.getContext('2d'),ch=$('#chart'),cctx=ch.getContext('2d');
const W=960;let H=540,G0=9.81;
const C={bg:'#0a1020',panel:'#10192d',panel2:'#16223a',line:'#26365a',ink:'#e8eef9',muted:'#93a4c3',xray:'#7fdcff',hot:'#ffb04a',good:'#5fe3a1',bad:'#ff6b73',violet:'#b9a2ff',pink:'#ff8fc7',yellow:'#f3e36b'};
const MONO='"JetBrains Mono",ui-monospace,Menlo,monospace',BODY='Lexend,system-ui,sans-serif',DISP='Bungee,"Arial Black",Impact,sans-serif';
const MOTION_QUERY=window.matchMedia?.('(prefers-reduced-motion: reduce)');
let nativeReducedMotion=null;
let reduce=!!MOTION_QUERY?.matches;
function syncReducedMotion(){
  const next=nativeReducedMotion===null?!!MOTION_QUERY?.matches:nativeReducedMotion;
  if(reduce===next)return;
  reduce=next;
  if(typeof syncHomePreviews==='function')syncHomePreviews();
  if(typeof racePreflightRender==='function'&&!$('#racePreflight').hidden)racePreflightRender();
  if(typeof RACE_REPLAY_PREVIEW!=='undefined'&&RACE_REPLAY_PREVIEW.frames?.length){
    const frames=RACE_REPLAY_PREVIEW.frames;
    stopRaceReplayPreview();
    startRaceReplayPreview({preview3d:frames});
  }
}
window.KickLabMotion={setNativeReducedMotion(value){nativeReducedMotion=typeof value==='boolean'?value:null;syncReducedMotion();}};
MOTION_QUERY?.addEventListener?.('change',syncReducedMotion);
let dpr=1,sc=1;
function resize(){const w=cv.clientWidth||W,h=cv.clientHeight||w*9/16;dpr=Math.min(2,window.devicePixelRatio||1);sc=w/W;H=h/sc;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);window.__KICKLAB_VIEWPORT__={width:W,height:H,cssWidth:w,cssHeight:h,scale:sc,aspect:w/h};
  const cw=ch.clientWidth||300;ch.width=Math.round(cw*dpr);ch.height=Math.round(160*dpr);}
window.addEventListener('resize',resize);
const fmt=(n,d=1)=>isFinite(n)?Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'∞';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const DEG=Math.PI/180;

