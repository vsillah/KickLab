/* ---------- sound ---------- */
let AC=null;
function unlock(){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){}}
function sfx(power=1,pitch=1){if(!AC||best.mute)return;try{const t=AC.currentTime,p=clamp(power,0.15,1);
  const len=0.25,buf=AC.createBuffer(1,Math.floor(AC.sampleRate*len),AC.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
  const src=AC.createBufferSource();src.buffer=buf;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=700*pitch;const g=AC.createGain();g.gain.value=0.45*p;
  src.connect(f).connect(g).connect(AC.destination);src.start(t);
  const o=AC.createOscillator();o.type='sine';o.frequency.setValueAtTime(130*pitch,t);o.frequency.exponentialRampToValueAtTime(38,t+0.22);
  const og=AC.createGain();og.gain.setValueAtTime(0.55*p,t);og.gain.exponentialRampToValueAtTime(0.001,t+0.26);o.connect(og).connect(AC.destination);o.start(t);o.stop(t+0.3);}catch(e){}}

function tone(f,dur,type='sine',vol=0.15,f2,delay=0){if(!AC||best.mute)return;try{const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+dur+0.05);}catch(e){}}
function noise(dur,freq,vol,delay=0,q=1,type='lowpass',attack=0.01){if(!AC||best.mute)return;try{const t=AC.currentTime+delay,n=Math.floor(AC.sampleRate*dur),buf=AC.createBuffer(1,n,AC.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
  const src=AC.createBufferSource();src.buffer=buf;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=AC.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.connect(f).connect(g).connect(AC.destination);src.start(t);src.stop(t+dur+0.05);}catch(e){}}
const SND={
  click(){tone(1100,0.035,'square',0.03);},
  whoosh(){noise(0.22,1500,0.22,0,0.8,'bandpass',0.06);},
  tick(){tone(1500+Math.random()*200,0.03,'square',0.025);},
  total(){tone(988,0.09,'triangle',0.12);tone(1319,0.16,'triangle',0.12,null,0.08);},
  grade(g){const m={S:[523,659,784,1047],A:[523,659,784],B:[523,659],C:[392,330],D:[330,262]}[g]||[523];m.forEach((f,i)=>tone(f,0.16,'triangle',0.1,null,i*0.07));},
  badge(){[1047,1319,1568,2093].forEach((f,i)=>tone(f,0.22,'triangle',0.09,null,i*0.07));},
  fanfare(){[523,659,784,1047].forEach((f,i)=>tone(f,0.14,'sawtooth',0.06,null,i*0.1));tone(1319,0.7,'sawtooth',0.07,null,0.42);tone(262,0.9,'triangle',0.12,null,0.42);tone(392,0.9,'triangle',0.08,null,0.42);noise(1.2,3000,0.05,0.4,0.6,'highpass',0.05);},
  goal(){const played=!!AC&&!best.mute;window.__KICKLAB_GOAL_SOUND_AUDIT__={requested:true,played,muted:!!best.mute,reduced:reduce};if(!played)return false;const notes=reduce?[523,784]:[392,523,659,784];notes.forEach((f,i)=>tone(f,reduce?0.12:0.18,'triangle',reduce?0.045:0.075,null,i*0.055));if(!reduce)noise(0.65,1350,0.08,0.05,0.7,'bandpass',0.12);return true;},
  cheer(){noise(1.8,1100,0.2,0,0.6,'bandpass',0.35);noise(1.4,2400,0.07,0.1,0.8,'bandpass',0.3);},
  skid(){noise(0.25,2600,0.05,0,3,'bandpass',0.02);}};
const ENGINE={o:null,g:null,on(){if(!AC||best.mute||this.o)return;try{this.o=AC.createOscillator();this.o.type='sawtooth';const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=700;this.g=AC.createGain();this.g.gain.value=0.0001;this.o.connect(f).connect(this.g).connect(AC.destination);this.o.start();}catch(e){this.o=null;}},
  set(freq,vol){if(!this.o)return;const t=AC.currentTime;this.o.frequency.setTargetAtTime(freq,t,0.06);this.g.gain.setTargetAtTime(vol,t,0.08);},
  off(){if(!this.o)return;const o=this.o,g=this.g;this.o=null;try{g.gain.setTargetAtTime(0.0001,AC.currentTime,0.05);setTimeout(()=>{try{o.stop();}catch(e){}},400);}catch(e){}}};

/* ---------- particles ---------- */
const PARTS=[],SPARTS=[];
function burst(arr,x,y,n,o){for(let i=0;i<n;i++){const a=(o.dir||0)+(Math.random()-0.5)*(o.spread===undefined?6.28:o.spread),sp=o.sp[0]+Math.random()*(o.sp[1]-o.sp[0]);
  arr.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0,max:o.life*(0.6+Math.random()*0.7),size:o.size*(0.6+Math.random()*0.8),col:Array.isArray(o.col)?o.col[i%o.col.length]:o.col,g:o.g||0,kind:o.kind||'spark',rot:Math.random()*6,vr:(Math.random()-0.5)*12,drag:o.drag||0});}}
function stepParts(arr,dt){for(let i=arr.length-1;i>=0;i--){const p=arr[i];p.life+=dt;if(p.life>p.max){arr.splice(i,1);continue;}const k=Math.max(0,1-p.drag*dt);p.vx*=k;p.vy*=k;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;}}
function drawParts(c,arr){c.save();arr.forEach(p=>{const a=1-p.life/p.max;c.globalAlpha=a;
  if(p.kind==='spark'){c.strokeStyle=p.col;c.lineWidth=p.size;c.lineCap='round';line(c,p.x,p.y,p.x-p.vx*0.03,p.y-p.vy*0.03);}
  else if(p.kind==='smoke'){c.globalAlpha=a*0.35;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.size*(1+p.life*3),0,Math.PI*2);c.fill();}
  else if(p.kind==='confetti'){c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.fillStyle=p.col;c.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);c.restore();}
  else{c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.size,0,Math.PI*2);c.fill();}});c.restore();}
const PLAYER_ENERGY={active:false,t:0,duration:1.4,reason:'',serial:0};
function energizeControlledPlayer(reason='success',durationMs=1400){PLAYER_ENERGY.active=true;PLAYER_ENERGY.t=0;PLAYER_ENERGY.duration=Math.max(.35,Number(durationMs)/1000||1.4);PLAYER_ENERGY.reason=String(reason);PLAYER_ENERGY.serial++;window.__KICKLAB_PLAYER_ENERGY_AUDIT__={active:true,reason:PLAYER_ENERGY.reason,serial:PLAYER_ENERGY.serial,reducedMotion:reduce,attachment:'controlled-body-contour',markerClear:true,detachedParticles:0};return PLAYER_ENERGY.serial;}
function controlledPlayerEnergyLevel(){if(!PLAYER_ENERGY.active)return 0;const q=clamp(PLAYER_ENERGY.t/PLAYER_ENERGY.duration,0,1),fade=q<.12?q/.12:1-q;return clamp(fade,0,1)*(reduce?.72:.78+.22*Math.sin(PLAYER_ENERGY.t*22));}
function stepControlledPlayerEnergy(rdt){if(!PLAYER_ENERGY.active)return;PLAYER_ENERGY.t+=Math.max(0,rdt);if(PLAYER_ENERGY.t>=PLAYER_ENERGY.duration){PLAYER_ENERGY.active=false;window.__KICKLAB_PLAYER_ENERGY_AUDIT__={active:false,reason:PLAYER_ENERGY.reason,serial:PLAYER_ENERGY.serial,reducedMotion:reduce,attachment:'controlled-body-contour',markerClear:true,detachedParticles:0};}}
function controlledPlayerEnergyAnchor(){
  if(typeof M==='undefined'||!M)return null;
  if(M===Fight){const J=Fight.rig().J,dx=Fight.meX,segments=RIG.pairsSide(J).map(([a,b])=>[{x:a.x+dx,y:a.y},{x:b.x+dx,y:b.y}]);return{x:(J.head.x+J.pelvis.x)/2+dx,y:(J.head.y+J.pelvis.y)/2,rx:62,ry:126,segments,head:{x:J.head.x+dx,y:J.head.y,r:23},kind:'fighter'};}
  if(M===Race&&Race.st){const car=Race.CARS[Race.opt.car],scale=1.8*Race.S;return{x:Race.sx(Race.st.x),y:Race.sy(Race.st.y),rx:Math.max(34,car.len*scale*.58),ry:Math.max(25,car.wid*scale*.72),angle:-Race.st.th-Race.spin,kind:'driver-car'};}
  if(M===Kick&&Kick.opt.shot!=='dribble'&&Kick._J){const J=Kick._J,segments=RIG.pairsSide(J);return{x:(J.head.x+J.pelvis.x)/2,y:(J.head.y+J.pelvis.y)/2,rx:Math.max(30,Math.abs(J.shF.x-J.shR.x)*1.8),ry:Math.max(65,Math.abs(J.head.y-J.ground)*.58),segments,head:{x:J.head.x,y:J.head.y,r:Math.max(12,Kick.S*.15)},kind:'athlete'};}
  if(M===Kick&&typeof Drib!=='undefined'&&Drib.att&&Drib.P){const p=Drib.P(Drib.att.x,Drib.att.y,1);if(p){const r=clamp(p.s*.72,30,82);return{x:p.x,y:p.y-r*.72,rx:r*.62,ry:r,kind:'athlete'};}}
  return null;
}
function drawControlledPlayerEnergy(c){const level=controlledPlayerEnergyLevel(),anchor=level&&controlledPlayerEnergyAnchor();if(!anchor)return;const pulse=reduce?0:Math.sin(PLAYER_ENERGY.t*18)*3;c.save();c.globalCompositeOperation='screen';c.lineCap='round';if(anchor.segments){const passes=reduce?1:2;for(let pass=passes-1;pass>=0;pass--){c.globalAlpha=level*(pass?.24:.68);c.strokeStyle=pass?C.xray:C.good;c.lineWidth=pass?9:2.4;c.shadowColor=pass?C.xray:C.good;c.shadowBlur=pass?18:10;c.beginPath();anchor.segments.forEach(([a,b])=>{c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);});c.stroke();}c.globalAlpha=level*.58;c.strokeStyle=C.good;c.lineWidth=2.4;c.shadowColor=C.good;c.shadowBlur=12;c.beginPath();c.arc(anchor.head.x,anchor.head.y,anchor.head.r+(reduce?0:pulse*.35),0,Math.PI*2);c.stroke();}else{c.translate(anchor.x,anchor.y);if(anchor.angle)c.rotate(anchor.angle);const rings=reduce?1:3;for(let i=rings-1;i>=0;i--){const spread=i*7+pulse*(i+1)/rings;c.globalAlpha=level*(.62-i*.12);c.strokeStyle=i%2?C.xray:C.good;c.lineWidth=2.2+i*.8;c.shadowColor=i%2?C.xray:C.good;c.shadowBlur=10+i*5;c.beginPath();c.ellipse(0,0,anchor.rx+spread,anchor.ry+spread,0,0,Math.PI*2);c.stroke();}}c.restore();window.__KICKLAB_PLAYER_ENERGY_AUDIT__={active:true,reason:PLAYER_ENERGY.reason,serial:PLAYER_ENERGY.serial,reducedMotion:reduce,attachment:anchor.kind==='driver-car'?'controlled-driver-and-car':anchor.segments?'articulated-body-segments':'controlled-body-contour',markerClear:true,detachedParticles:0,renderer:'canvas'};}

/* ---------- engine: time, slow motion, camera ---------- */
const E={slow:null,env:0,ts:1,shake:0,flash:0,title:null,cam:{x:W/2,y:H/2,z:1}};
function startSlow(o){if(reduce)o.zoom=Math.min(o.zoom||2,1.6);const kickAction=typeof M!=='undefined'&&typeof Kick!=='undefined'&&M===Kick;E.slow=Object.assign({t:0,dur:2.2,zoom:2.2,min:0.06,annotations:!kickAction,physicsVision:true},o);}
function physicsVisionVisible(){return!!(RP.on||(E.slow&&E.slow.physicsVision!==false));}
function camNow(){if(!E.slow||E.env<=0)return{x:W/2,y:H/2,z:1};const s=E.slow,f=typeof s.focus==='function'?s.focus():s.focus;const e=E.env;return{x:lerp(W/2,f.x,e),y:lerp(H/2,f.y,e),z:lerp(1,s.zoom,e)};}
function toS(x,y){const k=E.cam;return{x:(x-k.x)*k.z+W/2,y:(y-k.y)*k.z+H/2};}

/* ---------- drawing helpers ---------- */
function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);}
function arrow(c,x1,y1,x2,y2,col,w=3,dash){const a=Math.atan2(y2-y1,x2-x1),L=Math.hypot(x2-x1,y2-y1);if(L<3)return;const hs=Math.min(L*0.6,4+w*2.4);
  c.save();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=w;c.lineCap='round';if(dash)c.setLineDash(dash);
  c.beginPath();c.moveTo(x1,y1);c.lineTo(x2-Math.cos(a)*hs*0.8,y2-Math.sin(a)*hs*0.8);c.stroke();c.setLineDash([]);
  c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-Math.cos(a-0.42)*hs,y2-Math.sin(a-0.42)*hs);c.lineTo(x2-Math.cos(a+0.42)*hs,y2-Math.sin(a+0.42)*hs);c.closePath();c.fill();c.restore();}
function glow(c,col,b){c.shadowColor=col;c.shadowBlur=b;}
function line(c,x1,y1,x2,y2){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function text(c,s,x,y,font,col,align='left',base='alphabetic'){c.font=font;c.fillStyle=col;c.textAlign=align;c.textBaseline=base;c.fillText(s,x,y);}
function ik(sx,sy,fx,fy,L1,L2,bend){const dx=fx-sx,dy=fy-sy;let d=Math.hypot(dx,dy);d=clamp(d,Math.abs(L1-L2)+1,L1+L2-0.01);const a=Math.atan2(dy,dx);const A=Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1));return{x:sx+Math.cos(a+bend*A)*L1,y:sy+Math.sin(a+bend*A)*L1};}
