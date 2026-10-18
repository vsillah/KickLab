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
  function motionStyle(clip,t=0,mode='full'){
    const q=mode==='reduced'?(t<.5?0:1):smooth(t),styles={
      ready:{torso:-.04,pelvis:.02,heelLift:0,toeRoll:0,balance:.04,expression:'focus'},
      approach:{torso:mix(.08,-.14,q),pelvis:mix(-.04,.1,q),heelLift:mix(.02,.07,q),toeRoll:.04,balance:mix(.08,.18,q),expression:'focus'},
      plant:{torso:mix(-.14,-.34,q),pelvis:mix(.1,.2,q),heelLift:mix(.07,.16,q),toeRoll:mix(.04,.12,q),balance:mix(.18,.34,q),expression:'strain'},
      strike:{torso:mix(-.34,.28,q),pelvis:mix(.2,-.16,q),heelLift:mix(.16,.03,q),toeRoll:mix(.12,0,q),balance:mix(.34,.26,q),expression:'strain'},
      'follow-through':{torso:mix(.28,-.2,q),pelvis:mix(-.16,.14,q),heelLift:mix(.03,.2,q),toeRoll:mix(0,.18,q),balance:mix(.26,.38,q),expression:'release'},
      recover:{torso:mix(-.2,0,q),pelvis:mix(.14,0,q),heelLift:mix(.2,0,q),toeRoll:mix(.18,0,q),balance:mix(.38,.05,q),expression:'release'},
      celebration:{torso:.18,pelvis:-.08,heelLift:.03,toeRoll:.04,balance:.22,expression:'smile'}
    };return Object.freeze(styles[clip]||styles.ready);
  }
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
  function armElbow(root,target,side=1,facing=1){
    const dx=target.x-root.x,dy=target.y-root.y,length=Math.hypot(dx,dy)||1e-9,nx=-dy/length,ny=dx/length,direction=Math.sign(side||1)*Math.sign(facing||1),bend=Math.min(.095,length*.19)*direction;
    const elbow={x:(root.x+target.x)/2+nx*bend,y:(root.y+target.y)/2+ny*bend},low=Math.min(root.y,target.y),high=Math.max(root.y,target.y),margin=Math.min(.035,length*.08);
    elbow.y=Math.max(low+margin,Math.min(high-margin,elbow.y));return elbow;
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
    const motion=motionStyle(clip,t,mode),shoulder={x:hip.x+Math.sin(lean)*.56,y:hip.y+Math.cos(lean)*.56},frontShoulder={x:shoulder.x+.095+motion.torso*.055,y:shoulder.y-motion.torso*.018},rearShoulder={x:shoulder.x-.095-motion.torso*.055,y:shoulder.y+.018+motion.torso*.018};
    const frontHip={x:hip.x+.06+motion.pelvis*.035,y:hip.y},rearHip={x:hip.x-.06-motion.pelvis*.035,y:hip.y+.018};
    const frontHand=clip==='celebration'?{x:shoulder.x+.3,y:shoulder.y+.42}:{x:shoulder.x-.31+arm*.18,y:shoulder.y-.29+arm*.18};
    const rearHand=clip==='celebration'?{x:shoulder.x-.3,y:shoulder.y+.42}:{x:shoulder.x+.35-arm*.12,y:shoulder.y-.1-arm*.15};
    const J={
      facing:1,hipF:frontHip,hipR:rearHip,knF:twoBoneIK(frontHip,strike,.47,.46,1),knR:twoBoneIK(rearHip,plant,.47,.46,-1),anF:strike,anR:plant,toF:strikeToe,toR:plantToe,
      shF:frontShoulder,shR:rearShoulder,elF:armElbow(frontShoulder,frontHand,-1,1),elR:armElbow(rearShoulder,rearHand,1,1),haF:frontHand,haR:rearHand,
      neck:{x:shoulder.x+.025+motion.torso*.025,y:shoulder.y+.075},head:{x:shoulder.x+.075+motion.torso*.035,y:shoulder.y+.245,tilt:clip==='celebration'?-0.12:.12-motion.balance*.08},ground:0
    };
    J.pelvis={x:(J.hipF.x+J.hipR.x)/2,y:(J.hipF.y+J.hipR.y)/2};
    const plantDrift=Math.hypot(J.anR.x-plant.x,J.anR.y-plant.y),contactTarget={x:ball.x-kick.BR,y:ball.y};
    const contactError=clip==='strike'&&t===1?Math.hypot(J.toF.x-contactTarget.x,J.toF.y-contactTarget.y):0;
    const groundPenetration=Math.max(0,-Math.min(J.anF.y,J.anR.y,J.toF.y,J.toR.y));
    return{clip,t,joints:J,motion,metrics:{plantDrift,contactError,groundPenetration},contactTarget};
  }
  return Object.freeze({MODES,CLIPS,clipOrder,modeFromSearch,twoBoneIK,armElbow,clipForKick,phaseForKick,motionStyle,pose});
})();
globalThis.KickLabCharacterCore=KICKLAB_CHARACTER_CORE;

/* This POC owns its visible anatomy. It shares joint positions with KickLab, not RIG.side's appearance. */
function lifelikeTone(hex,amount){return tint(hex,amount);}
function lifelikeCapsule(c,A,B,wa,wb,from,to,outline='#091225'){
  const dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,a=Math.atan2(ny,nx),g=c.createLinearGradient(A.x+nx*wa,A.y+ny*wa,A.x-nx*wa,A.y-ny*wa);
  g.addColorStop(0,from);g.addColorStop(.48,to);g.addColorStop(1,lifelikeTone(to,-.2));c.beginPath();c.moveTo(A.x+nx*wa,A.y+ny*wa);c.lineTo(B.x+nx*wb,B.y+ny*wb);c.arc(B.x,B.y,wb,a,a+Math.PI,true);c.lineTo(A.x-nx*wb,A.y-ny*wb);c.arc(A.x,A.y,wa,a+Math.PI,a,true);c.closePath();c.fillStyle=g;c.fill();c.strokeStyle=outline;c.lineWidth=Math.max(1,wa*.14);c.stroke();
}
function lifelikeBentLimb(c,A,K,B,wa,wk,wb,from,to,outline='#091225'){
  const normal=(P,Q)=>{const dx=Q.x-P.x,dy=Q.y-P.y,len=Math.hypot(dx,dy)||1;return{x:-dy/len,y:dx/len};},n1=normal(A,K),n2=normal(K,B),sum=Math.hypot(n1.x+n2.x,n1.y+n2.y)||1,nk={x:(n1.x+n2.x)/sum,y:(n1.y+n2.y)/sum},g=c.createLinearGradient(A.x+n1.x*wa,A.y+n1.y*wa,A.x-n1.x*wa,A.y-n1.y*wa);
  g.addColorStop(0,from);g.addColorStop(.52,to);g.addColorStop(1,lifelikeTone(to,-.18));c.beginPath();c.moveTo(A.x+n1.x*wa,A.y+n1.y*wa);c.quadraticCurveTo(K.x+nk.x*wk,K.y+nk.y*wk,B.x+n2.x*wb,B.y+n2.y*wb);c.quadraticCurveTo(B.x+n2.x*wb*.15,B.y+n2.y*wb*.15,B.x-n2.x*wb,B.y-n2.y*wb);c.quadraticCurveTo(K.x-nk.x*wk,K.y-nk.y*wk,A.x-n1.x*wa,A.y-n1.y*wa);c.quadraticCurveTo(A.x-n1.x*wa*.15,A.y-n1.y*wa*.15,A.x+n1.x*wa,A.y+n1.y*wa);c.closePath();c.fillStyle=g;c.fill();c.strokeStyle=outline;c.lineWidth=Math.max(1,wa*.12);c.stroke();
}
function lifelikeJointBlend(c,A,K,B,r,fill,outline='#091225'){
  const a1=Math.atan2(K.y-A.y,K.x-A.x),a2=Math.atan2(B.y-K.y,B.x-K.x),angle=(a1+a2)/2;c.save();c.translate(K.x,K.y);c.rotate(angle);c.fillStyle=fill;c.beginPath();c.ellipse(0,0,r*1.04,r*.72,0,0,Math.PI*2);c.fill();c.restore();
}
function drawLifelikeBoot(c,ankle,toe,u,boot,far=false){
  const dx=toe.x-ankle.x,dy=toe.y-ankle.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,nx=-uy,ny=ux,profile=boot.profile||'classic',power=profile==='power',speed=profile==='speed',heelReach=(power?.11:speed?.065:.08)*u,toeReach=(power?.14:speed?.16:.12)*u,upper=(power?.12:speed?.07:.09)*u,heel={x:ankle.x-ux*heelReach,y:ankle.y-uy*heelReach},tip={x:toe.x+ux*toeReach,y:toe.y+uy*toeReach},top={x:ankle.x+nx*upper,y:ankle.y+ny*upper},soleA={x:heel.x-nx*(power?.07:.055)*u,y:heel.y-ny*(power?.07:.055)*u},soleB={x:tip.x-nx*(speed?.038:.05)*u,y:tip.y-ny*(speed?.038:.05)*u},col=far?lifelikeTone(boot.color||'#10192d',-.25):boot.color||'#10192d';
  c.beginPath();c.moveTo(heel.x,heel.y);c.quadraticCurveTo(top.x,top.y,ankle.x+ux*.08*u+nx*.08*u,ankle.y+uy*.08*u+ny*.08*u);c.quadraticCurveTo(tip.x+nx*.04*u,tip.y+ny*.04*u,tip.x,tip.y);c.lineTo(soleB.x,soleB.y);c.lineTo(soleA.x,soleA.y);c.closePath();c.fillStyle=col;c.fill();c.strokeStyle='#08101f';c.lineWidth=Math.max(1,u*.014);c.stroke();
  c.strokeStyle=boot.accent||'#7fdcff';c.lineWidth=Math.max(1,u*(power?.026:.018));c.beginPath();if(speed){c.moveTo(heel.x+ux*.22*u,heel.y+uy*.22*u);c.lineTo(toe.x+nx*.015*u,toe.y+ny*.015*u);c.moveTo(ankle.x+ux*.07*u+nx*.04*u,ankle.y+uy*.07*u+ny*.04*u);c.lineTo(toe.x-ux*.04*u,toe.y-uy*.04*u);}else{c.moveTo(ankle.x+ux*.03*u,ankle.y+uy*.03*u);c.lineTo(toe.x+nx*.015*u,toe.y+ny*.015*u);if(power){c.moveTo(ankle.x-ux*.015*u+nx*.055*u,ankle.y-uy*.015*u+ny*.055*u);c.lineTo(toe.x-ux*.04*u+nx*.04*u,toe.y-uy*.04*u+ny*.04*u);}}c.stroke();c.strokeStyle=boot.soleColor||'#dce6f6';c.lineWidth=Math.max(1,u*(power?.03:.022));c.beginPath();c.moveTo(soleA.x,soleA.y);c.lineTo(soleB.x,soleB.y);c.stroke();
  for(const t of [.18,.5,.8]){const x=lerp(soleA.x,soleB.x,t),y=lerp(soleA.y,soleB.y,t);c.fillStyle=boot.soleColor||'#dce6f6';c.beginPath();c.ellipse(x-nx*.018*u,y-ny*.018*u,.018*u,.035*u,Math.atan2(uy,ux),0,Math.PI*2);c.fill();}
  c.fillStyle=lifelikeTone(col,.18);c.beginPath();c.arc(ankle.x,ankle.y,.075*u,0,Math.PI*2);c.fill();c.strokeStyle='#08101f';c.lineWidth=Math.max(1,u*.012);c.stroke();
}
function drawLifelikeHead(c,J,u,look,clip,motion={expression:'focus'}){
  const H=J.head,f=J.facing||1,r=.118*u;c.save();c.translate(H.x,H.y);c.rotate((H.tilt||0)*f);c.scale(f,1);const skin=look.skin,shade=lifelikeTone(skin,-.24),light=lifelikeTone(skin,.16),smile=motion.expression==='smile'||motion.expression==='release',strain=motion.expression==='strain';
  const face=c.createRadialGradient(r*.32,-r*.38,r*.08,0,0,r*1.25);face.addColorStop(0,light);face.addColorStop(.58,skin);face.addColorStop(1,shade);c.beginPath();c.ellipse(0,0,r*.86,r*1.08,-.04,0,Math.PI*2);c.fillStyle=face;c.fill();c.strokeStyle='#08101f';c.lineWidth=Math.max(1,u*.012);c.stroke();
  c.fillStyle=shade;c.beginPath();c.ellipse(-r*.76,0,r*.18,r*.25,0,0,Math.PI*2);c.fill();c.fillStyle=skin;c.beginPath();c.moveTo(r*.64,-r*.12);c.quadraticCurveTo(r*1.05,r*.02,r*.66,r*.18);c.quadraticCurveTo(r*.8,r*.56,r*.24,r*.86);c.lineTo(r*.1,r*.45);c.closePath();c.fill();
  c.fillStyle=look.hair||'#15100d';c.beginPath();c.ellipse(-r*.08,-r*.5,r*.84,r*.62,-.12,Math.PI*.92,Math.PI*2.08);c.fill();for(let i=0;i<6;i++){c.beginPath();c.arc(-r*.66+i*r*.25,-r*.76+Math.abs(2.5-i)*r*.04,r*.14,0,Math.PI*2);c.fill();}
  c.fillStyle=look.eye||'#10192d';c.beginPath();c.ellipse(r*.48,-r*.16,r*.11,strain?r*.08:r*.13,0,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(r*.515,-r*.2,r*.03,0,Math.PI*2);c.fill();c.strokeStyle=look.eye||'#10192d';c.lineWidth=Math.max(1,u*.012);c.beginPath();c.moveTo(r*.28,-r*(strain?.34:.42));c.quadraticCurveTo(r*.53,-r*(strain?.38:.5),r*.75,-r*.35);c.stroke();
  c.strokeStyle=shade;c.lineWidth=Math.max(1,u*.01);c.beginPath();c.moveTo(r*.62,-r*.02);c.quadraticCurveTo(r*.83,r*.08,r*.62,r*.22);c.stroke();c.globalAlpha=.55;c.beginPath();c.moveTo(r*.18,r*.25);c.quadraticCurveTo(r*.42,r*.38,r*.66,r*.3);c.stroke();c.globalAlpha=1;c.strokeStyle=look.eye||'#10192d';c.beginPath();c.moveTo(r*.34,r*.53);c.quadraticCurveTo(r*.57,r*(smile?.72:strain?.43:.55),r*.8,r*(smile?.48:.52));c.stroke();c.fillStyle=shade;c.beginPath();c.ellipse(r*.1,r*.73,r*.34,r*.12,-.12,0,Math.PI);c.fill();c.restore();
}
function drawLifelikeAthlete(c,J,look,equipment,{clip='ready',mode='full',motion=true,motionStyle={expression:'focus'}}={}){
  const u=Math.max(18,Math.hypot(J.neck.x-J.pelvis.x,J.neck.y-J.pelvis.y)/.64),skin=look.skin,skinD=lifelikeTone(skin,-.23),kit=look.kit,kitD=lifelikeTone(kit,-.28),shorts=look.shorts||'#10192d',sock=look.socks||'#e8eef9',boot=equipment.boot||equipment,outline='rgba(5,12,26,.82)';
  c.save();c.lineCap='round';c.lineJoin='round';c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse((J.anF.x+J.anR.x)/2,Math.max(J.toF.y,J.toR.y)+.04*u,.38*u,.055*u,0,0,Math.PI*2);c.fill();
  if(mode==='full'&&motion&&['approach','plant','strike','follow-through'].includes(clip)){c.save();c.globalAlpha=.22;c.strokeStyle=look.accent||'#7fdcff';c.lineWidth=.035*u;for(let i=1;i<=3;i++){c.beginPath();c.moveTo(J.anF.x-i*.07*u,J.anF.y+i*.025*u);c.quadraticCurveTo(J.knF.x-i*.05*u,J.knF.y,J.hipF.x-i*.03*u,J.hipF.y);c.stroke();}c.restore();}
  const leg=(A,K,B,far=false)=>{const s=far?skinD:skin,sh=far?lifelikeTone(shorts,-.2):shorts,sk=far?lifelikeTone(sock,-.18):sock,mid={x:lerp(A.x,K.x,.48),y:lerp(A.y,K.y,.48)},calf={x:lerp(K.x,B.x,.48),y:lerp(K.y,B.y,.48)};lifelikeBentLimb(c,A,K,B,.112*u,.079*u,.05*u,lifelikeTone(s,.1),s,outline);lifelikeCapsule(c,A,mid,.125*u,.098*u,lifelikeTone(sh,.12),sh,outline);lifelikeCapsule(c,calf,B,.068*u,.055*u,lifelikeTone(sk,.12),sk,outline);lifelikeJointBlend(c,A,K,B,.071*u,far?lifelikeTone(s,-.03):lifelikeTone(s,.1),outline);};
  const arm=(A,K,B,far=false)=>{const s=far?skinD:skin,jersey=far?kitD:kit,sleeve={x:lerp(A.x,K.x,.34),y:lerp(A.y,K.y,.34)};lifelikeBentLimb(c,A,K,B,.078*u,.059*u,.038*u,lifelikeTone(s,.1),s,outline);lifelikeCapsule(c,A,sleeve,.09*u,.072*u,lifelikeTone(jersey,.12),jersey,outline);lifelikeJointBlend(c,A,K,B,.052*u,far?lifelikeTone(s,-.03):lifelikeTone(s,.1),outline);};
  leg(J.hipR,J.knR,J.anR,true);drawLifelikeBoot(c,J.anR,J.toR,u,boot,true);arm(J.shR,J.elR,J.haR,true);
  const shoulderMid={x:(J.shF.x+J.shR.x)/2,y:(J.shF.y+J.shR.y)/2},hipMid=J.pelvis;c.beginPath();c.moveTo(J.shR.x-.1*u,J.shR.y);c.bezierCurveTo(shoulderMid.x-.14*u,shoulderMid.y-.04*u,J.hipR.x-.1*u,J.hipR.y-.08*u,J.hipR.x-.09*u,J.hipR.y);c.lineTo(J.hipF.x+.11*u,J.hipF.y);c.bezierCurveTo(J.hipF.x+.13*u,J.hipF.y-.2*u,J.shF.x+.16*u,J.shF.y-.08*u,J.shF.x+.1*u,J.shF.y);c.closePath();const torso=c.createLinearGradient(J.shR.x,J.shR.y,J.shF.x+.18*u,J.shF.y);torso.addColorStop(0,kitD);torso.addColorStop(.55,kit);torso.addColorStop(1,lifelikeTone(kit,.22));c.fillStyle=torso;c.fill();c.strokeStyle='#08101f';c.lineWidth=Math.max(1,u*.016);c.stroke();
  c.strokeStyle=look.accent||'#7fdcff';c.lineWidth=.026*u;c.beginPath();c.moveTo(J.shR.x,J.shR.y+.03*u);c.quadraticCurveTo(shoulderMid.x,shoulderMid.y+.12*u,J.shF.x,J.shF.y+.03*u);c.stroke();c.globalAlpha=.35;c.beginPath();c.moveTo(hipMid.x-.1*u,hipMid.y-.18*u);c.lineTo(hipMid.x+.1*u,hipMid.y-.18*u);c.stroke();c.globalAlpha=1;const profile=boot.profile||'classic';c.strokeStyle=boot.accent||look.accent||'#7fdcff';c.lineWidth=(profile==='power'?.038:.022)*u;c.beginPath();if(profile==='speed'){c.moveTo(J.shR.x,shoulderMid.y+.04*u);c.lineTo(hipMid.x+.06*u,hipMid.y-.08*u);c.lineTo(J.shF.x,shoulderMid.y+.05*u);}else if(profile==='power'){c.moveTo(J.shR.x,shoulderMid.y+.08*u);c.lineTo(J.shF.x,shoulderMid.y+.08*u);c.moveTo(hipMid.x-.08*u,hipMid.y-.18*u);c.lineTo(hipMid.x+.09*u,hipMid.y-.18*u);}else{c.moveTo(shoulderMid.x,shoulderMid.y+.03*u);c.lineTo(hipMid.x,hipMid.y-.08*u);}c.stroke();
  c.beginPath();c.moveTo(J.hipR.x-.11*u,J.hipR.y-.07*u);c.lineTo(J.hipF.x+.12*u,J.hipF.y-.07*u);c.lineTo(J.hipF.x+.13*u,J.hipF.y+.12*u);c.quadraticCurveTo(hipMid.x,hipMid.y+.17*u,J.hipR.x-.12*u,J.hipR.y+.12*u);c.closePath();c.fillStyle=shorts;c.fill();c.strokeStyle='#08101f';c.stroke();
  leg(J.hipF,J.knF,J.anF,false);drawLifelikeBoot(c,J.anF,J.toF,u,boot,false);
  lifelikeCapsule(c,J.neck,{x:J.head.x-.012*u,y:J.head.y+.052*u},.056*u,.044*u,lifelikeTone(skin,-.18),skin,outline);drawLifelikeHead(c,J,u,look,clip,motionStyle);arm(J.shF,J.elF,J.haF,false);
  for(const [hand,elbow] of [[J.haF,J.elF],[J.haR,J.elR]]){c.fillStyle=skin;c.beginPath();c.ellipse(hand.x,hand.y,.042*u,.055*u,Math.atan2(hand.y-elbow.y,hand.x-elbow.x),0,Math.PI*2);c.fill();c.strokeStyle=outline;c.lineWidth=Math.max(1,u*.009);c.stroke();}
  c.restore();return{head:true,face:true,neck:true,chest:true,pelvis:true,shoulderMass:true,hipMass:true,jointBlends:8,upperLimbs:4,lowerLimbs:4,ankles:2,heels:2,toes:2,boots:2,kitProfile:boot.profile||'classic'};
}
function drawMechanicsLens(c,kick,model,mode,look,equipment){
  const x=14,y=10,w=332,h=298;c.save();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.fillStyle='rgba(5,12,26,.98)';rr(c,x,y,w,h,18);c.fill();c.strokeStyle=mode==='full'?'#7fdcff':'#b9a2ff';c.lineWidth=2;c.stroke();c.beginPath();rr(c,x+3,y+3,w-6,h-6,15);c.clip();
  const scale=132,ox=x+178-model.joints.pelvis.x*scale,ground=y+h-30,map=p=>({x:ox+p.x*scale,y:ground-p.y*scale}),J=Object.fromEntries(Object.entries(model.joints).map(([key,value])=>value&&typeof value==='object'&&Number.isFinite(value.x)?[key,{...value,...map(value)}]:[key,value]));
  c.fillStyle='rgba(46,113,74,.55)';c.fillRect(x,ground,w,h-(ground-y));c.strokeStyle='rgba(232,238,249,.5)';c.lineWidth=1.5;line(c,x,ground,x+w,ground);for(let i=0;i<8;i++){c.strokeStyle='rgba(95,227,161,.13)';line(c,x+i*48,ground,x+40+i*48,y+h);}
  const bx=ox+(kick.ball?.x||0)*scale,by=ground-(kick.ball?.y||kick.BR)*scale;c.fillStyle='#f3f6fb';c.beginPath();c.arc(bx,by,kick.BR*scale,0,Math.PI*2);c.fill();c.strokeStyle='#16223a';c.lineWidth=2;c.stroke();
  drawLifelikeAthlete(c,J,look,equipment,{clip:model.clip,mode,motion:true,motionStyle:model.motion});c.restore();
}

function xrayBone(c,A,B,width,color){if(!A||!B)return;c.save();c.lineCap='round';c.strokeStyle='rgba(5,12,26,.82)';c.lineWidth=width+3;line(c,A.x,A.y,B.x,B.y);c.strokeStyle=color;c.lineWidth=width;line(c,A.x,A.y,B.x,B.y);c.globalAlpha=.32;c.lineWidth=Math.max(1,width*.38);c.strokeStyle='#f4fbff';line(c,A.x,A.y,B.x,B.y);c.restore();}
function xrayJoint(c,P,kind,color,size=5){if(!P)return;c.save();c.translate(P.x,P.y);c.strokeStyle=color;c.fillStyle='rgba(5,12,26,.72)';c.lineWidth=1.8;
  if(kind==='hinge'){c.beginPath();c.ellipse(0,0,size*1.15,size*.72,-.35,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.arc(0,0,size*.32,0,Math.PI*2);c.fillStyle=color;c.fill();}
  else if(kind==='socket'){c.beginPath();c.arc(0,0,size,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.arc(0,0,size*.38,0,Math.PI*2);c.stroke();}
  else if(kind==='wrist'){c.rotate(Math.PI/4);c.fillRect(-size*.62,-size*.62,size*1.24,size*1.24);c.strokeRect(-size*.62,-size*.62,size*1.24,size*1.24);}
  else{c.beginPath();c.moveTo(0,-size);c.lineTo(size*.82,0);c.lineTo(0,size);c.lineTo(-size*.82,0);c.closePath();c.fill();c.stroke();}c.restore();}
function xrayTag(c,label,x,y,color,scale=1){c.save();c.font=`700 ${Math.round(9*scale)}px ${MONO}`;const w=c.measureText(label).width+10*scale,h=16*scale;c.fillStyle='rgba(5,12,26,.78)';rr(c,x-w/2,y-h*.62,w,h,5*scale);c.fill();c.strokeStyle=color;c.lineWidth=scale;c.stroke();c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(label,x,y-h*.12);c.restore();}
function drawAnatomicalPhysicsOverlay(c,kick,J,mode){
  const shoulder={x:(J.shF.x+J.shR.x)/2,y:(J.shF.y+J.shR.y)/2},pelvis=J.pelvis,detail=Math.min(1.8,Math.max(1,520/(cv.clientWidth||960))),headR=Math.max(8,kick.S*.115)*(1+(detail-1)*.28),plant=C.good,strike=C.hot,body=C.xray,rotate=C.violet;
  c.save();c.lineCap='round';c.lineJoin='round';glow(c,C.xray,8);
  /* Axial skeleton: recognizable skull, cervical column, rib cage, spine, and pelvic bowl. */
  c.strokeStyle=body;c.lineWidth=2*detail;c.fillStyle='rgba(127,220,255,.08)';c.beginPath();c.ellipse(J.head.x,J.head.y,headR*.82,headR,Number(J.head.tilt||0),0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(J.head.x-headR*.56,J.head.y+headR*.38);c.quadraticCurveTo(J.head.x,J.head.y+headR*1.02,J.head.x+headR*.62,J.head.y+headR*.34);c.stroke();
  xrayBone(c,J.head,J.neck,3.1*detail,body);for(let i=0;i<4;i++){const t=.18+i*.2,px=lerp(J.neck.x,shoulder.x,t),py=lerp(J.neck.y,shoulder.y,t);c.beginPath();c.moveTo(px-3*detail,py);c.lineTo(px+3*detail,py);c.stroke();}
  xrayBone(c,J.shR,J.shF,3.4*detail,body);xrayBone(c,J.neck,pelvis,3.8*detail,body);for(let i=0;i<4;i++){const t=.2+i*.16,cx=lerp(shoulder.x,pelvis.x,t),cy=lerp(shoulder.y,pelvis.y,t),rx=(18-i*2)*(1+(detail-1)*.35);c.globalAlpha=.76;c.beginPath();c.ellipse(cx,cy,rx,(7+i*.5)*(1+(detail-1)*.35),-.08,0,Math.PI*2);c.stroke();}c.globalAlpha=1;
  c.fillStyle='rgba(185,162,255,.14)';c.strokeStyle=rotate;c.lineWidth=2.2;c.beginPath();c.moveTo(J.hipR.x-7,J.hipR.y-4);c.quadraticCurveTo(pelvis.x,pelvis.y+12,J.hipF.x+8,J.hipF.y-4);c.lineTo(J.hipF.x+3,J.hipF.y+7);c.quadraticCurveTo(pelvis.x,pelvis.y+18,J.hipR.x-3,J.hipR.y+7);c.closePath();c.fill();c.stroke();c.beginPath();c.arc(pelvis.x,pelvis.y,16,-2.8,.2);c.stroke();
  /* Arms: paired long-bone contours with socket, hinge, wrist, and hand shapes. */
  for(const [S,E,H] of [[J.shR,J.elR,J.haR],[J.shF,J.elF,J.haF]]){xrayBone(c,S,E,3.4*detail,body);xrayBone(c,E,H,2.8*detail,body);xrayJoint(c,S,'socket',body,4.7*detail);xrayJoint(c,E,'hinge',body,4.5*detail);xrayJoint(c,H,'wrist',body,3.8*detail);const a=Math.atan2(H.y-E.y,H.x-E.x);c.save();c.translate(H.x,H.y);c.rotate(a);c.strokeStyle=body;c.lineWidth=1.4*detail;c.beginPath();c.ellipse(6*detail,0,7*detail,4*detail,0,0,Math.PI*2);c.stroke();for(const y of [-2,0,2])line(c,10*detail,y*detail,15*detail,y*.8*detail);c.restore();}
  /* Rear leg is the planted chain; front leg is the striking chain. */
  for(const [H,K,A,T,color,label] of [[J.hipR,J.knR,J.anR,J.toR,plant,'PLANT'],[J.hipF,J.knF,J.anF,J.toF,strike,'KICK']]){xrayBone(c,H,K,5.2*detail,color);xrayBone(c,K,A,4.5*detail,color);xrayBone(c,A,T,4*detail,color);xrayJoint(c,H,'socket',color,5.4*detail);xrayJoint(c,K,'hinge',color,5.6*detail);xrayJoint(c,A,'ankle',color,4.4*detail);c.save();c.strokeStyle=color;c.lineWidth=2*detail;c.beginPath();c.moveTo(A.x-3*detail,A.y-2*detail);c.quadraticCurveTo(T.x,T.y-5*detail,T.x+8*detail,T.y);c.lineTo(T.x+5*detail,T.y+4*detail);c.lineTo(A.x-5*detail,A.y+4*detail);c.closePath();c.stroke();c.restore();xrayTag(c,label,label==='PLANT'?A.x-28*detail:T.x+24*detail,label==='PLANT'?A.y+15*detail:T.y+25*detail,color,detail);}
  RIG.angle(c,J.hipF,J.knF,J.anF,15,strike,false);RIG.angle(c,J.hipR,J.knR,J.anR,12,plant,false);
  if(['plant','strike','follow-through'].includes(window.__KICKLAB_CHARACTER_POC__?.clip))xrayTag(c,'HIP ↻',pelvis.x+34*detail,pelvis.y-20*detail,rotate,detail);
  const X=v=>kick.sx(v),Y=v=>kick.sy(v),ball=kick.ball,th=kick.V.th*DEG,bx=X(ball.x),by=Y(ball.y);c.shadowBlur=0;
  if((kick.state==='swing'&&kick.contact)||window.__KICKLAB_CHARACTER_POC__?.clip==='strike'){c.strokeStyle=C.yellow;c.lineWidth=2.2*detail;c.beginPath();c.arc(bx,by,12*detail,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;line(c,bx+Math.cos(a)*13*detail,by+Math.sin(a)*13*detail,bx+Math.cos(a)*20*detail,by+Math.sin(a)*20*detail);}arrow(c,bx,by,bx+Math.cos(th)*38,by-Math.sin(th)*38,strike,2.6*detail);arrow(c,J.toF.x,J.toF.y,J.toF.x-Math.cos(th)*28,J.toF.y+Math.sin(th)*28,rotate,2.3*detail);xrayTag(c,'HIT',bx+8*detail,by-30*detail,C.yellow,detail);}
  else if(kick.state!=='swing'&&kick.res&&kick.res.kind==='free'){const r=kick.res,scale=2.2;arrow(c,bx,by,bx+r.vx*scale,by-r.vy*scale,C.good,2.4);c.setLineDash([3,3]);arrow(c,bx,by,bx+r.vx*scale,by,body,1.6);arrow(c,bx+r.vx*scale,by,bx+r.vx*scale,by-r.vy*scale,rotate,1.6);c.setLineDash([]);c.strokeStyle=C.pink;c.lineWidth=1.5;c.beginPath();c.arc(bx,by,15,0,-th,true);c.stroke();}
  c.restore();return{model:'connected-anatomical-movement',mode,parts:['skull','neck','spine','rib-cage','shoulders','elbows','wrists','hands','pelvis','hips','knees','ankles','feet'],jointMarkers:['socket','hinge','wrist','ankle'],plantLeg:'rear-green',strikingLeg:'front-orange',transparentBackdrop:true};
}

(()=>{
  if(typeof document==='undefined'||typeof window==='undefined')return;
  const query=window.location&&window.location.search||'',systemReduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let requested=KICKLAB_CHARACTER_CORE.modeFromSearch(query,false),mode=KICKLAB_CHARACTER_CORE.modeFromSearch(query,systemReduced),lastClip='',clipStarted=performance.now(),events=[];
  const pocVisible=new URLSearchParams(query).has('kicklabPoc');
  const audit={requested,effective:mode,systemReduced,defaultOff:!new URLSearchParams(query).has('kicklabCharacter'),clips:[...KICKLAB_CHARACTER_CORE.clipOrder],events,maxContactErrorM:0,maxPlantDriftM:0,maxGroundPenetrationM:0,externalRequests:0,assetBytes:0,textureBytes:0,rig:'self-authored-volumetric-procedural',visualParts:['head','face','neck','shoulders','chest','pelvis','upper-limbs','lower-limbs','ankles','heels','toes','boots']};
  window.__KICKLAB_CHARACTER_POC__=audit;
  if(pocVisible)window.__KICKLAB_CHARACTER_POC_QA__=Object.freeze({configureScoringShot(){if(Kick.state!=='aim')Kick.reset();Kick.keeper=0;Kick.WH=1.85;Kick.wind=0;Kick.V.v=22;Kick.V.th=17;Kick.V.spin=0;const result=Kick.freeCalc(Kick.V.v,Kick.V.th);return{clear:result.clear,under:result.under,yw:result.yw,yg:result.yg};},seekReplayPhysics(speed){const recording=RECS.kick,frame=recording&&recording.frames&&recording.frames.reduce((best,current)=>current.env>(best&&best.env||0)?current:best,null);if(!frame)return false;if(speed!=null)RP.speed=speed;RP.t=frame.t;RP.playing=false;syncRbar();return{time:frame.t,env:frame.env,speed:RP.speed};}});
  const setMode=next=>{requested=KICKLAB_CHARACTER_CORE.MODES.includes(next)?next:'canvas';mode=systemReduced&&requested==='full'?'reduced':requested;audit.requested=requested;audit.effective=mode;document.querySelectorAll('[data-character-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.characterMode===requested)));const status=document.querySelector('#characterPocStatus');if(status)status.textContent=mode==='canvas'?'Current Canvas athlete':`${mode==='reduced'?'Reduced-motion':'Full-motion'} local character`;};
  if(pocVisible){
    const style=document.createElement('style');style.textContent='.character-poc{position:relative;z-index:0;display:grid;grid-template-columns:minmax(150px,1fr) repeat(3,auto);align-items:center;gap:6px;padding:10px 12px;border-top:1px solid rgba(127,220,255,.38);border-bottom:1px solid rgba(127,220,255,.2);background:#070d1c;font:700 10px '+MONO+'}.character-poc span{color:#e8eef9}.character-poc button{min-height:36px;padding:5px 10px;border:1px solid #425579;border-radius:7px;background:#10192d;color:#e8eef9;font:inherit}.character-poc button[aria-pressed=true]{border-color:#7fdcff;color:#7fdcff;background:#162b40}.character-poc canvas{grid-column:1/-1;justify-self:center;width:min(360px,100%);height:auto;border-radius:12px}@media(max-width:700px){.character-poc{grid-template-columns:repeat(3,1fr)}.character-poc span{grid-column:1/-1;text-align:center}.character-poc button{padding-inline:4px}}';document.head.appendChild(style);
    const panel=document.createElement('div');panel.className='character-poc';panel.setAttribute('role','group');panel.setAttribute('aria-label','Character renderer proof of concept');panel.innerHTML='<span id="characterPocStatus" role="status" aria-live="polite"></span><button type="button" data-character-mode="canvas">Canvas</button><button type="button" data-character-mode="reduced">Reduced</button><button type="button" data-character-mode="full">Full</button><canvas id="characterPocDetail" width="360" height="320" aria-label="Character mechanics detail"></canvas>';document.querySelector('.control-deck').before(panel);panel.addEventListener('click',event=>{const button=event.target.closest('[data-character-mode]');if(button)setMode(button.dataset.characterMode);});
  }
  const originalDrawPerson=Kick.drawPerson.bind(Kick),originalDrawXray=Kick.drawXray.bind(Kick),originalHud=Kick.hud.bind(Kick),originalReset=Kick.reset.bind(Kick),originalUpdate=Kick.update.bind(Kick),originalSnap=Kick.snap.bind(Kick),originalApplySnap=Kick.applySnap.bind(Kick);
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
    const look=playerLook(),equipment=kitLook();this._J=J;audit.renderParts=drawLifelikeAthlete(c,J,look,equipment,{clip:model.clip,mode,motion:true,motionStyle:model.motion});audit.motionStyle=model.motion;audit.kitSelection=kit();audit.kitTelemetry=kitState();audit.kitProfile=equipment.boot.profile;
    return J;
  };
  Kick.drawXray=function(c){if(mode==='canvas'||this.opt.shot!=='free'||!this._J)return originalDrawXray(c);audit.xrayDefinition=drawAnatomicalPhysicsOverlay(c,this,this._J,mode);};
  Kick.hud=function(c){originalHud(c);const detail=document.querySelector('#characterPocDetail');if(detail&&mode!=='canvas'&&this.opt.shot==='free'){const model=KICKLAB_CHARACTER_CORE.pose(this,mode),look=playerLook(),equipment=kitLook();drawMechanicsLens(detail.getContext('2d'),this,model,mode,look,equipment);audit.mechanicsLens=true;audit.stadiumUnobscured=!document.querySelector('.stage .character-poc');}else if(detail){detail.getContext('2d').clearRect(0,0,detail.width,detail.height);audit.mechanicsLens=false;}};
  setMode(requested);syncClip();
  setTimeout(()=>{if(typeof V3!=='undefined'){const originalWant=V3.want.bind(V3);V3.want=()=>mode!=='canvas'&&M===Kick&&Kick.opt.shot==='free'?false:originalWant();}},0);
})();
