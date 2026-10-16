
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const cv=$('#cv'),ctx=cv.getContext('2d'),ch=$('#chart'),cctx=ch.getContext('2d');
const W=960,H=540;let G0=9.81;
const C={bg:'#0a1020',panel:'#10192d',panel2:'#16223a',line:'#26365a',ink:'#e8eef9',muted:'#93a4c3',xray:'#7fdcff',hot:'#ffb04a',good:'#5fe3a1',bad:'#ff6b73',violet:'#b9a2ff',pink:'#ff8fc7',yellow:'#f3e36b'};
const MONO='"JetBrains Mono",ui-monospace,Menlo,monospace',BODY='Lexend,system-ui,sans-serif',DISP='Bungee,"Arial Black",Impact,sans-serif';
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
let dpr=1,sc=1;
function resize(){const w=cv.clientWidth||W;dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(w*dpr);cv.height=Math.round(w*9/16*dpr);sc=w/W;
  const cw=ch.clientWidth||300;ch.width=Math.round(cw*dpr);ch.height=Math.round(160*dpr);}
window.addEventListener('resize',resize);
const fmt=(n,d=1)=>isFinite(n)?Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'∞';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const DEG=Math.PI/180;

