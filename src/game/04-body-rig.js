/* ---------- articulated body rig (shared by all labs) ---------- */
function tint(hex,k){if(!hex||hex[0]!=='#')return hex;let h=hex.slice(1);if(h.length===3)h=h.split('').map(x=>x+x).join('');const n=parseInt(h,16);let r=n>>16&255,g=n>>8&255,b=n&255;
  if(k<0){r*=1+k;g*=1+k;b*=1+k;}else{r+=(255-r)*k;g+=(255-g)*k;b+=(255-b)*k;}return`rgb(${r|0},${g|0},${b|0})`;}
const RIG={
  /* tapered capsule path from A (half-width wa) to B (half-width wb) */
  cap(c,A,B,wa,wb){const dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy)||1e-6,nx=-dy/L,ny=dx/L,a=Math.atan2(ny,nx);
    c.beginPath();c.moveTo(A.x+nx*wa,A.y+ny*wa);c.lineTo(B.x+nx*wb,B.y+ny*wb);c.arc(B.x,B.y,wb,a,a+Math.PI,true);c.lineTo(A.x-nx*wa,A.y-ny*wa);c.arc(A.x,A.y,wa,a+Math.PI,a,true);c.closePath();},
  seg(c,A,B,wa,wb,fill,ol,olw,sheen){this.cap(c,A,B,wa,wb);if(olw){c.lineWidth=olw;c.strokeStyle=ol;c.stroke();}c.fillStyle=fill;c.fill();
    if(sheen){const dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy)||1e-6;let nx=-dy/L,ny=dx/L;if(nx*-0.5+ny*-0.85<0){nx=-nx;ny=-ny;}
      c.save();c.globalAlpha=0.22;this.cap(c,{x:A.x+nx*wa*0.45,y:A.y+ny*wa*0.45},{x:B.x+nx*wb*0.45,y:B.y+ny*wb*0.45},wa*0.28,wb*0.28);c.fillStyle='#fff';c.fill();c.restore();}},
  /* two-bone limb with a visible joint cap so the bend reads clearly */
  limb(c,A,K,F,w1,w2,w3,fill,ol,olw,o={}){this.seg(c,A,K,w1,w2,o.fill1||fill,ol,olw,true);this.seg(c,K,F,w2,w3,fill,ol,olw,true);
    c.fillStyle=o.joint||tint(fill[0]==='#'?fill:'#888888',0.12);c.beginPath();c.arc(K.x,K.y,w2*0.78,0,Math.PI*2);c.fill();
    if(o.cap1){this.seg(c,A,{x:lerp(A.x,K.x,o.capL||0.55),y:lerp(A.y,K.y,o.capL||0.55)},w1*1.12,w2*1.05,o.cap1,ol,olw,true);}},
  blob(c,pts,fill,ol,olw){const n=pts.length;c.beginPath();for(let i=0;i<=n;i++){const p=pts[i%n],q=pts[(i+1)%n],m={x:(p.x+q.x)/2,y:(p.y+q.y)/2};if(i===0)c.moveTo(m.x,m.y);else c.quadraticCurveTo(p.x,p.y,m.x,m.y);}c.closePath();
    if(olw){c.lineWidth=olw;c.strokeStyle=ol;c.stroke();}c.fillStyle=fill;c.fill();},
  shoe(c,An,dir,len,h,rot,col,ol,olw){c.save();c.translate(An.x,An.y);c.rotate(rot||0);c.scale(dir,1);
    c.beginPath();c.moveTo(-len*0.32,-h*0.9);c.lineTo(len*0.25,-h*0.75);c.quadraticCurveTo(len*0.78,-h*0.55,len*0.8,h*0.15);c.lineTo(len*0.8,h*0.5);c.lineTo(-len*0.36,h*0.5);c.quadraticCurveTo(-len*0.45,-h*0.2,-len*0.32,-h*0.9);c.closePath();
    if(olw){c.lineWidth=olw;c.strokeStyle=ol;c.stroke();}c.fillStyle=col;c.fill();c.fillStyle='rgba(255,255,255,0.75)';c.fillRect(-len*0.36,h*0.22,len*1.16,h*0.28);c.restore();},
  glove(c,W,F,r,col,ol,olw,cuff){const a=Math.atan2(F.y-W.y,F.x-W.x);c.save();c.translate(F.x,F.y);c.rotate(a);
    c.fillStyle=cuff||'#e8eef9';c.beginPath();c.ellipse(-r*0.95,0,r*0.42,r*0.72,0,0,Math.PI*2);if(olw){c.lineWidth=olw;c.strokeStyle=ol;c.stroke();}c.fill();
    c.beginPath();c.ellipse(0,0,r*1.08,r*0.92,0,0,Math.PI*2);if(olw){c.stroke();}c.fillStyle=col;c.fill();
    c.beginPath();c.ellipse(-r*0.15,r*0.62,r*0.42,r*0.26,-0.4,0,Math.PI*2);c.fillStyle=tint(col[0]==='#'?col:'#c03040',-0.18);c.fill();
    c.fillStyle='rgba(255,255,255,0.32)';c.beginPath();c.ellipse(r*0.2,-r*0.38,r*0.45,r*0.22,0,0,Math.PI*2);c.fill();c.restore();},
  /* x-ray skeleton: bones plus joint rings, so the hinge points stand out */
  bones(c,pairs,joints,w,col){c.save();c.strokeStyle=col||C.xray;c.lineWidth=w;c.lineCap='round';glow(c,col||C.xray,8);pairs.forEach(([a,b])=>{if(a&&b)line(c,a.x,a.y,b.x,b.y);});c.shadowBlur=0;
    joints.forEach(j=>{if(!j)return;c.fillStyle='#08101f';c.beginPath();c.arc(j.x,j.y,w*2.1,0,Math.PI*2);c.fill();c.lineWidth=w*0.9;c.stroke();});c.restore();},
  /* angle at joint B between BA and BC, drawn as an arc with its value in degrees */
  angle(c,A,B,Cc,r,col,label,font){const a1=Math.atan2(A.y-B.y,A.x-B.x),a2=Math.atan2(Cc.y-B.y,Cc.x-B.x);let d=a2-a1;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
    c.save();c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.arc(B.x,B.y,r,a1,a1+d,d<0);c.stroke();const m=a1+d/2,deg=Math.round(Math.abs(d)*180/Math.PI);
    if(label!==false)text(c,(label?label+' ':'')+deg+'°',B.x+Math.cos(m)*(r+14),B.y+Math.sin(m)*(r+14)+4,font||'700 12px '+MONO,col,'center');c.restore();return deg;},
  /* full side-view athlete. J: joints in screen px; facing +1 right / -1 left; u: px per meter */
  side(c,J,st){const u=st.u,ol=st.ol||'#0a1122',olw=st.olw!=null?st.olw:Math.max(1,u*0.018),f=J.facing||1,skin=st.skin,skinD=tint(skin,-0.22),kit=st.kit,kitD=tint(kit,-0.3),sh=st.shorts||'#10192d',shD=tint(sh,-0.25),sock=st.sock||'#e8eef9',boot=st.boot||'#10192d';
    const W={th:0.085*u,kn:0.058*u,an:0.042*u,ua:0.058*u,el:0.046*u,wr:0.036*u};
    const leg=(H,K,A,far)=>{const s=far?skinD:skin,sk=far?tint(sock,-0.25):sock;this.limb(c,H,K,A,W.th,W.kn,W.an,st.pants?(far?kitD:kit):s,ol,olw,{cap1:st.pants?null:(far?shD:sh),capL:0.5});
      if(!st.pants)this.seg(c,{x:lerp(K.x,A.x,0.7),y:lerp(K.y,A.y,0.7)},A,W.an*1.12,W.an*1.06,sk,ol,olw*0.6);};
    const foot=(A,T,far)=>{const rot=Math.atan2(T.y-A.y,(T.x-A.x)*f);this.shoe(c,A,f,0.27*u,0.075*u,rot*f,far?tint(boot,-0.2):boot,ol,olw*0.8);};
    const arm=(S,E,Hh,far)=>{const s=far?skinD:skin;this.limb(c,S,E,Hh,W.ua,W.el,W.wr,s,ol,olw,{cap1:st.sleeve?(far?kitD:kit):null,capL:0.45});
      if(st.glove)this.glove(c,E,Hh,st.glove,far?tint(st.gloveCol,-0.2):st.gloveCol,ol,olw);else if(!st.noHands){c.fillStyle=s;c.beginPath();c.arc(Hh.x,Hh.y,W.wr*1.45,0,Math.PI*2);if(olw){c.lineWidth=olw;c.strokeStyle=ol;c.stroke();}c.fill();}};
    c.save();c.lineCap='round';c.lineJoin='round';
    if(st.shadow!==false){c.fillStyle='rgba(0,0,0,0.28)';c.beginPath();c.ellipse((J.anF.x+J.anR.x)/2,J.ground||Math.max(J.anF.y,J.anR.y)+0.05*u,Math.abs(J.anF.x-J.anR.x)/2+0.22*u,0.05*u,0,0,Math.PI*2);c.fill();}
    /* far side first */
    leg(J.hipR,J.knR,J.anR,true);foot(J.anR,J.toR,true);
    if(!st.armFront)arm(J.shR,J.elR,J.haR,true);
    /* torso */
    const nk=J.neck,hc={x:(J.hipF.x+J.hipR.x)/2,y:(J.hipF.y+J.hipR.y)/2},sc={x:(J.shF.x+J.shR.x)/2,y:(J.shF.y+J.shR.y)/2};
    const tv={x:sc.x-hc.x,y:sc.y-hc.y},tl=Math.hypot(tv.x,tv.y)||1,tn={x:-tv.y/tl*f,y:tv.x/tl*f};/* tn points toward chest (front) */
    const chestW=st.chest||0.13*u,waistW=0.1*u,back={x:-tn.x,y:-tn.y};
    const pts=[{x:J.shR.x+back.x*chestW*0.55,y:J.shR.y-0.03*u},{x:J.shF.x+tn.x*chestW*0.5,y:J.shF.y-0.035*u},{x:sc.x+tn.x*chestW*1.05+tv.x*-0.18,y:sc.y+tn.y*chestW*1.05+tv.y*-0.18},
      {x:hc.x+tn.x*waistW+tv.x*0.25,y:hc.y+tn.y*waistW+tv.y*0.25},{x:J.hipF.x+tn.x*waistW*0.9,y:J.hipF.y+tn.y*waistW*0.9+0.03*u},{x:J.hipR.x+back.x*waistW,y:J.hipR.y+0.03*u},
      {x:hc.x+back.x*waistW*1.05+tv.x*0.4,y:hc.y+back.y*waistW*1.05+tv.y*0.4},{x:sc.x+back.x*chestW*1.0,y:sc.y+back.y*chestW+tv.y*-0.1}];
    if(!st.bare)this.blob(c,pts,kit,ol,olw);else{this.blob(c,pts,skin,ol,olw);c.strokeStyle=skinD;c.lineWidth=Math.max(1,olw*0.7);c.beginPath();c.moveTo(sc.x+tn.x*chestW*0.6,sc.y+tn.y*chestW*0.6+0.04*u);c.quadraticCurveTo(sc.x+tn.x*chestW*0.2,sc.y+0.12*u,sc.x+tv.x*-0.2,sc.y+tv.y*-0.2+0.05*u);c.stroke();
      for(let i=0;i<3;i++){const t=0.35+i*0.15,p={x:lerp(sc.x,hc.x,t)+tn.x*waistW*0.45,y:lerp(sc.y,hc.y,t)+tn.y*waistW*0.45};line(c,p.x-0.03*u,p.y,p.x+0.03*u,p.y);}}
    if(st.num){c.save();c.font=`${Math.round(0.14*u)}px ${DISP}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='rgba(255,255,255,0.85)';c.fillText(st.num,lerp(sc.x,hc.x,0.42)+back.x*chestW*0.35,lerp(sc.y,hc.y,0.42));c.restore();}
    /* shorts / waistband */
    this.blob(c,[{x:J.hipR.x+back.x*waistW*1.05,y:J.hipR.y-0.06*u},{x:J.hipF.x+tn.x*waistW,y:J.hipF.y-0.06*u},{x:J.hipF.x+tn.x*waistW*1.1,y:J.hipF.y+0.06*u},{x:J.hipR.x+back.x*waistW*1.1,y:J.hipR.y+0.07*u}],st.pants?kitD:sh,ol,olw);
    if(st.belt){c.fillStyle=st.belt;c.beginPath();c.moveTo(J.hipR.x+back.x*waistW,J.hipR.y-0.07*u);c.lineTo(J.hipF.x+tn.x*waistW,J.hipF.y-0.07*u);c.lineTo(J.hipF.x+tn.x*waistW,J.hipF.y-0.03*u);c.lineTo(J.hipR.x+back.x*waistW,J.hipR.y-0.03*u);c.closePath();c.fill();}
    /* near leg */
    leg(J.hipF,J.knF,J.anF,false);foot(J.anF,J.toF,false);
    /* neck + head */
    this.seg(c,nk,{x:J.head.x-f*0.02*u,y:J.head.y+0.05*u},0.045*u,0.045*u,skinD,ol,olw);
    this.head(c,J.head,st.headR||0.115*u,f,st,ol,olw);
    if(st.armFront)arm(J.shR,J.elR,J.haR,true);
    arm(J.shF,J.elF,J.haF,false);
    c.restore();},
  head(c,H,r,f,st,ol,olw){const skin=st.skin,tilt=H.tilt||0;c.save();c.translate(H.x,H.y);c.rotate(tilt*f);c.scale(f,1);
    c.beginPath();c.ellipse(0,0,r*0.95,r*1.08,0,0,Math.PI*2);if(olw){c.lineWidth=olw;c.strokeStyle=ol;c.stroke();}c.fillStyle=skin;c.fill();
    /* jaw + nose */
    c.beginPath();c.moveTo(r*0.6,r*0.25);c.quadraticCurveTo(r*1.12,r*0.12,r*0.98,-r*0.05);c.lineTo(r*0.9,r*0.3);c.quadraticCurveTo(r*0.7,r*0.95,r*0.05,r*1.0);c.lineTo(r*0.2,r*0.5);c.closePath();c.fillStyle=skin;c.fill();
    c.fillStyle=tint(skin,-0.3);c.beginPath();c.ellipse(-r*0.12,r*0.08,r*0.17,r*0.24,0,0,Math.PI*2);c.fill();/* ear */
    c.fillStyle=st.hair||'#14100c';c.beginPath();c.ellipse(-r*0.08,-r*0.42,r*0.95,r*0.68,-0.15,Math.PI*0.95,Math.PI*2.06);c.fill();
    c.fillStyle='#10192d';c.beginPath();c.ellipse(r*0.55,-r*0.12,r*0.1,r*0.13,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#10192d';c.lineWidth=Math.max(1,r*0.09);line(c,r*0.38,-r*0.34,r*0.78,-r*0.28);
    c.lineWidth=Math.max(1,r*0.07);line(c,r*0.55,r*0.55,r*0.78,r*0.5);
    if(st.band){c.fillStyle=st.band;c.beginPath();c.moveTo(-r*0.95,-r*0.35);c.lineTo(r*0.9,-r*0.48);c.lineTo(r*0.92,-r*0.28);c.lineTo(-r*0.97,-r*0.12);c.closePath();c.fill();c.beginPath();c.moveTo(-r*0.9,-r*0.22);c.quadraticCurveTo(-r*1.5,-r*0.1,-r*1.65,r*0.3);c.lineTo(-r*1.45,r*0.32);c.quadraticCurveTo(-r*1.35,-r*0.02,-r*0.9,-r*0.08);c.fill();}
    c.restore();},
  pairsSide(J){return[[J.head,J.neck],[J.neck,J.shF],[J.neck,J.shR],[J.neck,J.pelvis],[J.pelvis,J.hipF],[J.pelvis,J.hipR],[J.shF,J.elF],[J.elF,J.haF],[J.shR,J.elR],[J.elR,J.haR],[J.hipF,J.knF],[J.knF,J.anF],[J.hipR,J.knR],[J.knR,J.anR],[J.anF,J.toF],[J.anR,J.toR]];},
  jointsSide(J){return[J.shF,J.elF,J.haF,J.shR,J.elR,J.haR,J.hipF,J.knF,J.anF,J.hipR,J.knR,J.anR];}
};
function callout(c,anchor,bx,by,lines,col){
  c.save();c.font='600 13px '+MONO;const pad=10,lh=18;let w=0;lines.forEach(l=>w=Math.max(w,c.measureText(l).width));w+=pad*2;const h=lines.length*lh+pad*1.4;
  bx=clamp(bx,12,W-w-12);by=clamp(by,70,H-h-12);
  const cx=clamp(anchor.x,bx,bx+w),cy=clamp(anchor.y,by,by+h);
  c.strokeStyle=col;c.globalAlpha*=0.85;c.lineWidth=1.5;c.setLineDash([4,4]);line(c,anchor.x,anchor.y,cx,cy);c.setLineDash([]);c.globalAlpha/=0.85;
  c.fillStyle=col;c.beginPath();c.arc(anchor.x,anchor.y,4,0,Math.PI*2);c.fill();
  c.fillStyle='rgba(6,11,24,0.92)';rr(c,bx,by,w,h,8);c.fill();c.strokeStyle=col;c.lineWidth=1.5;c.stroke();
  lines.forEach((l,i)=>{c.font=(i===0?'700 11px ':'600 13px ')+MONO;c.fillStyle=i===0?col:C.ink;c.textAlign='left';c.textBaseline='alphabetic';c.fillText(l,bx+pad,by+pad+12+i*lh);});
  c.restore();}
function xrayFrame(c,env){
  c.save();c.globalAlpha=env;
  c.fillStyle='rgba(127,220,255,0.04)';for(let y=0;y<H;y+=4)c.fillRect(0,y,W,1);
  c.strokeStyle=C.xray;c.lineWidth=2.5;const m=14,l=28;
  [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([x,y,sx,sy])=>{c.beginPath();c.moveTo(x,y+sy*l);c.lineTo(x,y);c.lineTo(x+sx*l,y);c.stroke();});
  text(c,'PHYSICS VISION  ·  TIME × '+E.ts.toFixed(2),W/2,H-24,'700 12px '+MONO,C.xray,'center');
  c.restore();}
function banner(c,title,sub,col){c.save();c.fillStyle='rgba(6,11,24,0.8)';rr(c,W/2-240,H/2+4,480,104,14);c.fill();c.strokeStyle=col;c.lineWidth=2;c.stroke();
  glow(c,col,14);text(c,title,W/2,H/2+56,'32px '+DISP,col,'center');c.shadowBlur=0;text(c,sub,W/2,H/2+88,'500 14px '+BODY,C.ink,'center');c.restore();}

