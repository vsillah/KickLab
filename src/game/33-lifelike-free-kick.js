/* ---------- local lifelike free-kick proof of concept ---------- */
const KICKLAB_CHARACTER_CORE=(()=>{
  const MODES=Object.freeze(['canvas','reduced','full']);
  const CLIPS=Object.freeze({
    ready:{duration:0.8,events:['ready']},
    approach:{duration:0.7,events:['approach-start']},
    plant:{duration:0.34,events:['plant-foot-lock']},
    strike:{duration:0.18,events:['strike-window']},
    'follow-through':{duration:0.5,events:['follow-through']},
    recover:{duration:0.65,events:['recover']},
    celebration:{duration:1.2,events:['celebration']}
  });
  const clipOrder=Object.freeze(Object.keys(CLIPS));
  const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
  const mix=(a,b,t)=>a+(b-a)*clamp01(t);
  const smooth=t=>{t=clamp01(t);return t*t*(3-2*t);};
  function modeFromSearch(search='',prefersReduced=false){
    const params=new URLSearchParams(String(search).replace(/^\?/,'')),requested=params.get('kicklabCharacter');
    if(!params.has('kicklabPoc')&&!requested)return'canvas';
    if(!MODES.includes(requested))return'canvas';
    return prefersReduced&&requested==='full'?'reduced':requested;
  }
  function twoBoneIK(root,target,upper,lower,bend=1){
    const dx=target.x-root.x,dy=target.y-root.y,d0=Math.hypot(dx,dy)||1e-9,d=Math.max(1e-6,Math.min(d0,upper+lower-1e-6));
    const a=Math.atan2(dy,dx),offset=Math.acos(Math.max(-1,Math.min(1,(upper*upper+d*d-lower*lower)/(2*upper*d))))*Math.sign(bend||1);
    return{x:root.x+Math.cos(a+offset)*upper,y:root.y+Math.sin(a+offset)*upper};
  }
  function clipForKick(kick){
    if(kick.outcome==='goal'&&(kick.cheerT>0||kick.state==='done'))return'celebration';
    if(kick.state==='aim')return'ready';
    if(kick.state==='swing'){
      if(kick.contact)return'strike';
      if(kick.phi<-.6)return'approach';
      if(kick.phi<-.12)return'plant';
      return'strike';
    }
    if(kick.state==='flight'&&Number(kick.flightT||0)<.5)return'follow-through';
    return'recover';
  }
  function phaseForKick(kick,clip){
    if(clip==='ready')return .5;
    if(clip==='approach')return smooth((Number(kick.phi)+1)/.4);
    if(clip==='plant')return smooth((Number(kick.phi)+.6)/.48);
    if(clip==='strike')return kick.contact?1:smooth((Number(kick.phi)+.12)/.45);
    if(clip==='follow-through')return smooth(Number(kick.flightT||0)/.5);
    if(clip==='celebration')return 1-clamp01(Number(kick.cheerT||0)/2.5);
    return smooth(Math.min(1,Number(kick.flightT||0)/1.2));
  }
  function pose(kick,mode='full'){
    const clip=clipForKick(kick),raw=phaseForKick(kick,clip),t=mode==='reduced'?(raw<.5?0:1):raw,ball=kick.ball||{x:0,y:.11};
    const plant={x:-.48,y:.055},plantToe={x:-.24,y:.028};
    let hip={x:-.58,y:.95},strike={x:-.7,y:.09},strikeToe={x:-.43,y:.06},lean=-.04,arm=.08;
    if(clip==='approach'){hip.x=mix(-.82,-.67,t);strike.x=mix(-.94,-.72,t);strikeToe.x=mix(-.7,-.52,t);lean=mix(.05,-.08,t);arm=mix(.18,.38,t);}
    if(clip==='plant'){hip.x=mix(-.67,-.56,t);strike.x=mix(-.72,-.45,t);strike.y=mix(.09,.28,t);strikeToe.x=mix(-.52,-.25,t);strikeToe.y=mix(.06,.3,t);lean=mix(-.08,-.22,t);arm=mix(.38,.5,t);}
    if(clip==='strike'){
      hip.x=mix(-.56,-.46,t);strike.x=mix(-.45,ball.x-.2,t);strike.y=mix(.28,ball.y,t);strikeToe.x=mix(-.25,ball.x-kick.BR,t);strikeToe.y=mix(.3,ball.y,t);lean=mix(-.22,-.31,t);arm=mix(.5,.28,t);
    }
    if(clip==='follow-through'){hip.x=mix(-.46,-.28,t);hip.y=mix(.95,1.02,t);strike.x=mix(ball.x-.2,.2,t);strike.y=mix(ball.y,.78,t);strikeToe.x=mix(ball.x-kick.BR,.43,t);strikeToe.y=mix(ball.y,.78,t);lean=mix(-.31,-.18,t);arm=mix(.28,-.12,t);}
    if(clip==='recover'){hip.x=mix(-.28,-.16,t);hip.y=mix(1.02,.95,t);strike.x=mix(.2,-.02,t);strike.y=mix(.78,.08,t);strikeToe.x=mix(.43,.22,t);strikeToe.y=mix(.78,.04,t);lean=mix(-.18,0,t);arm=mix(-.12,.05,t);}
    if(clip==='celebration'){const lift=mode==='reduced'?0:.05*Math.sin(t*Math.PI);hip={x:-.16,y:.98+lift};strike={x:.05,y:.08};strikeToe={x:.28,y:.04};lean=-.05;arm=.72;}
    const shoulder={x:hip.x+Math.sin(lean)*.54,y:hip.y+Math.cos(lean)*.54},frontShoulder={x:shoulder.x+.035,y:shoulder.y},rearShoulder={x:shoulder.x-.035,y:shoulder.y+.012};
    const frontHip={x:hip.x+.035,y:hip.y},rearHip={x:hip.x-.035,y:hip.y+.012};
    const frontHand=clip==='celebration'?{x:shoulder.x+.3,y:shoulder.y+.42}:{x:shoulder.x-.31+arm*.18,y:shoulder.y-.29+arm*.18};
    const rearHand=clip==='celebration'?{x:shoulder.x-.3,y:shoulder.y+.42}:{x:shoulder.x+.35-arm*.12,y:shoulder.y-.1-arm*.15};
    const J={
      facing:1,hipF:frontHip,hipR:rearHip,knF:twoBoneIK(frontHip,strike,.47,.46,1),knR:twoBoneIK(rearHip,plant,.47,.46,-1),anF:strike,anR:plant,toF:strikeToe,toR:plantToe,
      shF:frontShoulder,shR:rearShoulder,elF:twoBoneIK(frontShoulder,frontHand,.3,.29,1),elR:twoBoneIK(rearShoulder,rearHand,.3,.29,-1),haF:frontHand,haR:rearHand,
      neck:{x:shoulder.x+.012,y:shoulder.y+.075},head:{x:shoulder.x+.055,y:shoulder.y+.25,tilt:clip==='celebration'?-0.12:.17},ground:0
    };
    J.pelvis={x:(J.hipF.x+J.hipR.x)/2,y:(J.hipF.y+J.hipR.y)/2};
    const plantDrift=Math.hypot(J.anR.x-plant.x,J.anR.y-plant.y),contactTarget={x:ball.x-kick.BR,y:ball.y};
    const contactError=clip==='strike'&&t===1?Math.hypot(J.toF.x-contactTarget.x,J.toF.y-contactTarget.y):0;
    const groundPenetration=Math.max(0,-Math.min(J.anF.y,J.anR.y,J.toF.y,J.toR.y));
    return{clip,t,joints:J,metrics:{plantDrift,contactError,groundPenetration},contactTarget};
  }
  return Object.freeze({MODES,CLIPS,clipOrder,modeFromSearch,twoBoneIK,clipForKick,phaseForKick,pose});
})();
globalThis.KickLabCharacterCore=KICKLAB_CHARACTER_CORE;

/* This POC owns its visible anatomy. It shares joint positions with KickLab, not RIG.side's appearance. */
function lifelikeTone(hex,amount){return tint(hex,amount);}
function lifelikeCapsule(c,A,B,wa,wb,from,to,outline='#091225'){
  const dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,a=Math.atan2(ny,nx),g=c.createLinearGradient(A.x+nx*wa,A.y+ny*wa,A.x-nx*wa,A.y-ny*wa);
  g.addColorStop(0,from);g.addColorStop(.48,to);g.addColorStop(1,lifelikeTone(to,-.2));c.beginPath();c.moveTo(A.x+nx*wa,A.y+ny*wa);c.lineTo(B.x+nx*wb,B.y+ny*wb);c.arc(B.x,B.y,wb,a,a+Math.PI,true);c.lineTo(A.x-nx*wb,A.y-ny*wb);c.arc(A.x,A.y,wa,a+Math.PI,a,true);c.closePath();c.fillStyle=g;c.fill();c.strokeStyle=outline;c.lineWidth=Math.max(1,wa*.14);c.stroke();
}
function drawLifelikeBoot(c,ankle,toe,u,boot,far=false){
  const dx=toe.x-ankle.x,dy=toe.y-ankle.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,nx=-uy,ny=ux,heel={x:ankle.x-ux*.08*u,y:ankle.y-uy*.08*u},tip={x:toe.x+ux*.12*u,y:toe.y+uy*.12*u},top={x:ankle.x+nx*.09*u,y:ankle.y+ny*.09*u},soleA={x:heel.x-nx*.055*u,y:heel.y-ny*.055*u},soleB={x:tip.x-nx*.05*u,y:tip.y-ny*.05*u},col=far?lifelikeTone(boot.color||'#10192d',-.25):boot.color||'#10192d';
  c.beginPath();c.moveTo(heel.x,heel.y);c.quadraticCurveTo(top.x,top.y,ankle.x+ux*.08*u+nx*.08*u,ankle.y+uy*.08*u+ny*.08*u);c.quadraticCurveTo(tip.x+nx*.04*u,tip.y+ny*.04*u,tip.x,tip.y);c.lineTo(soleB.x,soleB.y);c.lineTo(soleA.x,soleA.y);c.closePath();c.fillStyle=col;c.fill();c.strokeStyle='#08101f';c.lineWidth=Math.max(1,u*.014);c.stroke();
  c.strokeStyle=boot.accent||'#7fdcff';c.lineWidth=Math.max(1,u*.018);c.beginPath();c.moveTo(ankle.x+ux*.03*u,ankle.y+uy*.03*u);c.lineTo(toe.x+nx*.015*u,toe.y+ny*.015*u);c.stroke();c.strokeStyle=boot.soleColor||'#dce6f6';c.lineWidth=Math.max(1,u*.022);c.beginPath();c.moveTo(soleA.x,soleA.y);c.lineTo(soleB.x,soleB.y);c.stroke();
  for(const t of [.18,.5,.8]){const x=lerp(soleA.x,soleB.x,t),y=lerp(soleA.y,soleB.y,t);c.fillStyle=boot.soleColor||'#dce6f6';c.beginPath();c.ellipse(x-nx*.018*u,y-ny*.018*u,.018*u,.035*u,Math.atan2(uy,ux),0,Math.PI*2);c.fill();}
  c.fillStyle=lifelikeTone(col,.18);c.beginPath();c.arc(ankle.x,ankle.y,.075*u,0,Math.PI*2);c.fill();c.strokeStyle='#08101f';c.lineWidth=Math.max(1,u*.012);c.stroke();
}
function drawLifelikeHead(c,J,u,look,clip){
  const H=J.head,f=J.facing||1,r=.14*u;c.save();c.translate(H.x,H.y);c.rotate((H.tilt||0)*f);c.scale(f,1);const skin=look.skin,shade=lifelikeTone(skin,-.24),light=lifelikeTone(skin,.16);
  const face=c.createRadialGradient(r*.32,-r*.38,r*.08,0,0,r*1.25);face.addColorStop(0,light);face.addColorStop(.58,skin);face.addColorStop(1,shade);c.beginPath();c.ellipse(0,0,r*.86,r*1.08,-.04,0,Math.PI*2);c.fillStyle=face;c.fill();c.strokeStyle='#08101f';c.lineWidth=Math.max(1,u*.012);c.stroke();
  c.fillStyle=shade;c.beginPath();c.ellipse(-r*.76,0,r*.18,r*.25,0,0,Math.PI*2);c.fill();c.fillStyle=skin;c.beginPath();c.moveTo(r*.64,-r*.12);c.quadraticCurveTo(r*1.05,r*.02,r*.66,r*.18);c.quadraticCurveTo(r*.8,r*.56,r*.24,r*.86);c.lineTo(r*.1,r*.45);c.closePath();c.fill();
  c.fillStyle=look.hair||'#15100d';c.beginPath();c.ellipse(-r*.08,-r*.5,r*.84,r*.62,-.12,Math.PI*.92,Math.PI*2.08);c.fill();for(let i=0;i<6;i++){c.beginPath();c.arc(-r*.66+i*r*.25,-r*.76+Math.abs(2.5-i)*r*.04,r*.14,0,Math.PI*2);c.fill();}
  c.fillStyle=look.eye||'#10192d';c.beginPath();c.ellipse(r*.48,-r*.16,r*.105,r*.13,0,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(r*.515,-r*.2,r*.03,0,Math.PI*2);c.fill();c.strokeStyle=look.eye||'#10192d';c.lineWidth=Math.max(1,u*.015);c.beginPath();c.moveTo(r*.3,-r*.42);c.quadraticCurveTo(r*.53,-r*.5,r*.72,-r*.36);c.stroke();
  c.strokeStyle=shade;c.lineWidth=Math.max(1,u*.012);c.beginPath();c.moveTo(r*.62,-r*.02);c.quadraticCurveTo(r*.83,r*.08,r*.62,r*.22);c.stroke();c.strokeStyle=look.eye||'#10192d';c.beginPath();c.moveTo(r*.38,r*.53);c.quadraticCurveTo(r*.58,r*(clip==='celebration'?.7:.55),r*.76,r*.5);c.stroke();c.restore();
}
function drawLifelikeAthlete(c,J,look,equipment,{clip='ready',mode='full',motion=true}={}){
  const u=Math.max(18,Math.hypot(J.neck.x-J.pelvis.x,J.neck.y-J.pelvis.y)/.62),skin=look.skin,skinD=lifelikeTone(skin,-.23),kit=look.kit,kitD=lifelikeTone(kit,-.28),shorts=look.shorts||'#10192d',sock=look.socks||'#e8eef9',boot=equipment.boot||equipment;
  c.save();c.lineCap='round';c.lineJoin='round';c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse((J.anF.x+J.anR.x)/2,Math.max(J.toF.y,J.toR.y)+.04*u,.38*u,.055*u,0,0,Math.PI*2);c.fill();
  if(mode==='full'&&motion&&['approach','plant','strike','follow-through'].includes(clip)){c.save();c.globalAlpha=.22;c.strokeStyle=look.accent||'#7fdcff';c.lineWidth=.035*u;for(let i=1;i<=3;i++){c.beginPath();c.moveTo(J.anF.x-i*.07*u,J.anF.y+i*.025*u);c.quadraticCurveTo(J.knF.x-i*.05*u,J.knF.y,J.hipF.x-i*.03*u,J.hipF.y);c.stroke();}c.restore();}
  const limb=(A,K,B,far=false)=>{const s=far?skinD:skin;lifelikeCapsule(c,A,K,.092*u,.073*u,far?lifelikeTone(s,-.08):lifelikeTone(s,.12),s);lifelikeCapsule(c,K,B,.07*u,.052*u,lifelikeTone(s,.1),s);c.fillStyle=far?lifelikeTone(s,-.08):lifelikeTone(s,.12);c.beginPath();c.ellipse(K.x,K.y,.075*u,.068*u,0,0,Math.PI*2);c.fill();c.strokeStyle='#08101f';c.lineWidth=Math.max(1,u*.01);c.stroke();};
  limb(J.hipR,J.knR,J.anR,true);drawLifelikeBoot(c,J.anR,J.toR,u,boot,true);limb(J.shR,J.elR,J.haR,true);
  const shoulderMid={x:(J.shF.x+J.shR.x)/2,y:(J.shF.y+J.shR.y)/2},hipMid=J.pelvis;c.beginPath();c.moveTo(J.shR.x-.1*u,J.shR.y);c.bezierCurveTo(shoulderMid.x-.14*u,shoulderMid.y-.04*u,J.hipR.x-.1*u,J.hipR.y-.08*u,J.hipR.x-.09*u,J.hipR.y);c.lineTo(J.hipF.x+.11*u,J.hipF.y);c.bezierCurveTo(J.hipF.x+.13*u,J.hipF.y-.2*u,J.shF.x+.16*u,J.shF.y-.08*u,J.shF.x+.1*u,J.shF.y);c.closePath();const torso=c.createLinearGradient(J.shR.x,J.shR.y,J.shF.x+.18*u,J.shF.y);torso.addColorStop(0,kitD);torso.addColorStop(.55,kit);torso.addColorStop(1,lifelikeTone(kit,.22));c.fillStyle=torso;c.fill();c.strokeStyle='#08101f';c.lineWidth=Math.max(1,u*.016);c.stroke();
  c.strokeStyle=look.accent||'#7fdcff';c.lineWidth=.026*u;c.beginPath();c.moveTo(J.shR.x,J.shR.y+.03*u);c.quadraticCurveTo(shoulderMid.x,shoulderMid.y+.12*u,J.shF.x,J.shF.y+.03*u);c.stroke();c.globalAlpha=.35;c.beginPath();c.moveTo(hipMid.x-.1*u,hipMid.y-.18*u);c.lineTo(hipMid.x+.1*u,hipMid.y-.18*u);c.stroke();c.globalAlpha=1;
  c.beginPath();c.moveTo(J.hipR.x-.11*u,J.hipR.y-.07*u);c.lineTo(J.hipF.x+.12*u,J.hipF.y-.07*u);c.lineTo(J.hipF.x+.13*u,J.hipF.y+.12*u);c.quadraticCurveTo(hipMid.x,hipMid.y+.17*u,J.hipR.x-.12*u,J.hipR.y+.12*u);c.closePath();c.fillStyle=shorts;c.fill();c.strokeStyle='#08101f';c.stroke();
  limb(J.hipF,J.knF,J.anF,false);c.strokeStyle=sock;c.lineWidth=.1*u;c.beginPath();c.moveTo(J.knF.x,J.knF.y);c.lineTo(J.anF.x,J.anF.y);c.stroke();drawLifelikeBoot(c,J.anF,J.toF,u,boot,false);
  lifelikeCapsule(c,J.neck,{x:J.head.x-.015*u,y:J.head.y+.06*u},.052*u,.045*u,lifelikeTone(skin,-.18),skin);drawLifelikeHead(c,J,u,look,clip);limb(J.shF,J.elF,J.haF,false);
  for(const hand of [J.haF,J.haR]){c.fillStyle=skin;c.beginPath();c.ellipse(hand.x,hand.y,.055*u,.07*u,0,0,Math.PI*2);c.fill();}
  c.restore();return{head:true,face:true,neck:true,chest:true,pelvis:true,upperLimbs:4,lowerLimbs:4,ankles:2,heels:2,toes:2,boots:2};
}
function drawMechanicsLens(c,kick,model,mode,look,equipment){
  const x=18,y=218,w=330,h=298;c.save();c.fillStyle='rgba(5,12,26,.9)';rr(c,x,y,w,h,18);c.fill();c.strokeStyle=mode==='full'?'#7fdcff':'#b9a2ff';c.lineWidth=2;c.stroke();c.beginPath();rr(c,x+3,y+3,w-6,h-6,15);c.clip();
  const scale=132,ox=x+178-model.joints.pelvis.x*scale,ground=y+h-30,map=p=>({x:ox+p.x*scale,y:ground-p.y*scale}),J=Object.fromEntries(Object.entries(model.joints).map(([key,value])=>value&&typeof value==='object'&&Number.isFinite(value.x)?[key,{...value,...map(value)}]:[key,value]));
  c.fillStyle='rgba(46,113,74,.55)';c.fillRect(x,ground,w,h-(ground-y));c.strokeStyle='rgba(232,238,249,.5)';c.lineWidth=1.5;line(c,x,ground,x+w,ground);for(let i=0;i<8;i++){c.strokeStyle='rgba(95,227,161,.13)';line(c,x+i*48,ground,x+40+i*48,y+h);}
  const bx=ox+(kick.ball?.x||0)*scale,by=ground-(kick.ball?.y||kick.BR)*scale;c.fillStyle='#f3f6fb';c.beginPath();c.arc(bx,by,kick.BR*scale,0,Math.PI*2);c.fill();c.strokeStyle='#16223a';c.lineWidth=2;c.stroke();
  drawLifelikeAthlete(c,J,look,equipment,{clip:model.clip,mode,motion:true});c.restore();
}

(()=>{
  if(typeof document==='undefined'||typeof window==='undefined')return;
  const query=window.location&&window.location.search||'',systemReduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let requested=KICKLAB_CHARACTER_CORE.modeFromSearch(query,false),mode=KICKLAB_CHARACTER_CORE.modeFromSearch(query,systemReduced),lastClip='',clipStarted=performance.now(),events=[];
  const pocVisible=new URLSearchParams(query).has('kicklabPoc');
  const audit={requested,effective:mode,systemReduced,defaultOff:!new URLSearchParams(query).has('kicklabCharacter'),clips:[...KICKLAB_CHARACTER_CORE.clipOrder],events,maxContactErrorM:0,maxPlantDriftM:0,maxGroundPenetrationM:0,externalRequests:0,assetBytes:0,textureBytes:0,rig:'self-authored-volumetric-procedural',visualParts:['head','face','neck','shoulders','chest','pelvis','upper-limbs','lower-limbs','ankles','heels','toes','boots']};
  window.__KICKLAB_CHARACTER_POC__=audit;
  const setMode=next=>{requested=KICKLAB_CHARACTER_CORE.MODES.includes(next)?next:'canvas';mode=systemReduced&&requested==='full'?'reduced':requested;audit.requested=requested;audit.effective=mode;document.querySelectorAll('[data-character-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.characterMode===requested)));const status=document.querySelector('#characterPocStatus');if(status)status.textContent=mode==='canvas'?'Current Canvas athlete':`${mode==='reduced'?'Reduced-motion':'Full-motion'} local character`;};
  if(pocVisible){
    const style=document.createElement('style');style.textContent='.character-poc{position:absolute;z-index:7;top:10px;right:10px;display:flex;align-items:center;gap:4px;padding:5px;border:1px solid rgba(127,220,255,.55);border-radius:10px;background:rgba(6,11,24,.88);font:700 10px '+MONO+'}.character-poc span{color:#e8eef9;margin:0 4px}.character-poc button{min-height:32px;padding:4px 8px;border:1px solid #425579;border-radius:7px;background:#10192d;color:#e8eef9;font:inherit}.character-poc button[aria-pressed=true]{border-color:#7fdcff;color:#7fdcff;background:#162b40}@media(max-width:700px){.character-poc{position:relative;top:auto;right:auto;justify-content:center;flex-wrap:wrap;border-radius:0}.character-poc span{flex-basis:100%;text-align:center}}';document.head.appendChild(style);
    const panel=document.createElement('div');panel.className='character-poc';panel.setAttribute('role','group');panel.setAttribute('aria-label','Character renderer proof of concept');panel.innerHTML='<span id="characterPocStatus" role="status" aria-live="polite"></span><button type="button" data-character-mode="canvas">Canvas</button><button type="button" data-character-mode="reduced">Reduced</button><button type="button" data-character-mode="full">Full</button>';document.querySelector('.stage').appendChild(panel);panel.addEventListener('click',event=>{const button=event.target.closest('[data-character-mode]');if(button)setMode(button.dataset.characterMode);});
  }
  const originalDrawPerson=Kick.drawPerson.bind(Kick),originalHud=Kick.hud.bind(Kick),originalReset=Kick.reset.bind(Kick),originalUpdate=Kick.update.bind(Kick),originalSnap=Kick.snap.bind(Kick),originalApplySnap=Kick.applySnap.bind(Kick);
  const semantic=(name,clip)=>{const entry={name,clip,atMs:Math.round(performance.now()-clipStarted),frame:Math.round((performance.now()-clipStarted)/(1000/60))};events.push(entry);if(events.length>120)events.shift();};
  const syncClip=()=>{const next=KICKLAB_CHARACTER_CORE.clipForKick(Kick);if(next!==lastClip){lastClip=next;clipStarted=performance.now();semantic('clip-enter',next);for(const event of KICKLAB_CHARACTER_CORE.CLIPS[next].events)semantic(event,next);}audit.clip=next;};
  Kick.reset=function(){const result=originalReset();lastClip='';syncClip();return result;};
  Kick.update=function(dt,rdt){const hadContact=!!this.contact,result=originalUpdate(dt,rdt);syncClip();if(!hadContact&&this.contact){semantic('boot-ball-contact',lastClip);semantic('physics-contact',lastClip);}return result;};
  Kick.snap=function(){const snapshot=originalSnap();snapshot.characterClip=lastClip;snapshot.characterMode=mode;return snapshot;};
  Kick.applySnap=function(snapshot,recording){const result=originalApplySnap(snapshot,recording);syncClip();return result;};
  Kick.drawPerson=function(c,x,opts={}){
    if(mode==='canvas'||this.opt.shot!=='free'||!opts.kicker)return originalDrawPerson(c,x,opts);
    syncClip();const model=KICKLAB_CHARACTER_CORE.pose(this,mode),J=Object.fromEntries(Object.entries(model.joints).map(([key,value])=>value&&typeof value==='object'&&Number.isFinite(value.x)?[key,{...value,x:this.sx(value.x+x),y:this.sy(value.y)}]:[key,value]));
    audit.maxContactErrorM=Math.max(audit.maxContactErrorM,model.metrics.contactError);audit.maxPlantDriftM=Math.max(audit.maxPlantDriftM,model.metrics.plantDrift);audit.maxGroundPenetrationM=Math.max(audit.maxGroundPenetrationM,model.metrics.groundPenetration);audit.metrics=model.metrics;const bootEvent=[...events].reverse().find(event=>event.name==='boot-ball-contact'),physicsEvent=[...events].reverse().find(event=>event.name==='physics-contact');audit.contactFrameDelta=bootEvent&&physicsEvent?Math.abs(bootEvent.frame-physicsEvent.frame):null;audit.contactFrameAligned=this.contact?audit.contactFrameDelta<=1:true;
    const look=playerLook(),equipment=kitLook();this._J=J;audit.renderParts=drawLifelikeAthlete(c,J,look,equipment,{clip:model.clip,mode,motion:true});
    return J;
  };
  Kick.hud=function(c){originalHud(c);if(mode!=='canvas'&&this.opt.shot==='free'){const model=KICKLAB_CHARACTER_CORE.pose(this,mode),look=playerLook(),equipment=kitLook();drawMechanicsLens(c,this,model,mode,look,equipment);audit.mechanicsLens=true;}};
  setMode(requested);syncClip();
  setTimeout(()=>{if(typeof V3!=='undefined'){const originalWant=V3.want.bind(V3);V3.want=()=>mode!=='canvas'&&M===Kick&&Kick.opt.shot==='free'?false:originalWant();}},0);
})();
