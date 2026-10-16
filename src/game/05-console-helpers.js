/* ---------- math console helpers ---------- */
function T(M,id){const v=M.COL[id];return`<span style="color:${v[1]}">${v[0]}</span>`;}
function N(M,id,s){return`<span style="color:${M.COL[id][1]}">${s}</span>`;}
function eqLine(label,f,s){return`<div class="eqline"><span class="el">${label}</span><div class="ef">${f}</div><div class="es">${s}</div></div>`;}
function plotFrame(c,w,h,o){const L=44,R=10,Tp=12,B=28;const X=v=>L+(v-o.x0)/(o.x1-o.x0)*(w-L-R),Y=v=>h-B-(v-o.y0)/(o.y1-o.y0)*(h-B-Tp);
  c.strokeStyle='rgba(147,164,195,0.15)';c.lineWidth=1;c.font='500 10px '+MONO;c.fillStyle=C.muted;
  o.xt.forEach(t=>{line(c,X(t),Tp,X(t),h-B);c.textAlign='center';c.fillText(String(t),X(t),h-B+13);});
  o.yt.forEach(t=>{line(c,L,Y(t),w-R,Y(t));c.textAlign='right';c.fillText(o.yf?o.yf(t):String(t),L-5,Y(t)+3);});
  c.textAlign='center';c.fillText(o.xl,L+(w-L-R)/2,h-3);c.save();c.translate(10,Tp+(h-B-Tp)/2);c.rotate(-Math.PI/2);c.fillText(o.yl,0,0);c.restore();
  return{X,Y,L,R,Tp,B};}
function niceTicks(a,b,n=4){const span=b-a,raw=span/n,p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p,step=(m<1.5?1:m<3?2:m<7?5:10)*p;const out=[];for(let v=Math.ceil(a/step)*step;v<=b+1e-9;v+=step)out.push(+v.toFixed(6));return out;}

/* =====================================================================
   FIGHT LAB
   ===================================================================== */
