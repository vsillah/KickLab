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

(()=>{
  if(typeof document==='undefined'||typeof window==='undefined')return;
  const query=window.location&&window.location.search||'',systemReduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let requested=KICKLAB_CHARACTER_CORE.modeFromSearch(query,false),mode=KICKLAB_CHARACTER_CORE.modeFromSearch(query,systemReduced),lastClip='',clipStarted=performance.now(),events=[];
  const pocVisible=new URLSearchParams(query).has('kicklabPoc');
  const audit={requested,effective:mode,systemReduced,defaultOff:!new URLSearchParams(query).has('kicklabCharacter'),clips:[...KICKLAB_CHARACTER_CORE.clipOrder],events,maxContactErrorM:0,maxPlantDriftM:0,maxGroundPenetrationM:0,externalRequests:0,assetBytes:0,textureBytes:0,rig:'shared-local-procedural'};
  window.__KICKLAB_CHARACTER_POC__=audit;
  const setMode=next=>{requested=KICKLAB_CHARACTER_CORE.MODES.includes(next)?next:'canvas';mode=systemReduced&&requested==='full'?'reduced':requested;audit.requested=requested;audit.effective=mode;document.querySelectorAll('[data-character-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.characterMode===requested)));const status=document.querySelector('#characterPocStatus');if(status)status.textContent=mode==='canvas'?'Current Canvas athlete':`${mode==='reduced'?'Reduced-motion':'Full-motion'} local character`;};
  if(pocVisible){
    const style=document.createElement('style');style.textContent='.character-poc{position:absolute;z-index:7;top:10px;right:10px;display:flex;align-items:center;gap:4px;padding:5px;border:1px solid rgba(127,220,255,.55);border-radius:10px;background:rgba(6,11,24,.88);font:700 10px '+MONO+'}.character-poc span{color:#e8eef9;margin:0 4px}.character-poc button{min-height:32px;padding:4px 8px;border:1px solid #425579;border-radius:7px;background:#10192d;color:#e8eef9;font:inherit}.character-poc button[aria-pressed=true]{border-color:#7fdcff;color:#7fdcff;background:#162b40}@media(max-width:700px){.character-poc{position:relative;top:auto;right:auto;justify-content:center;flex-wrap:wrap;border-radius:0}.character-poc span{flex-basis:100%;text-align:center}}';document.head.appendChild(style);
    const panel=document.createElement('div');panel.className='character-poc';panel.setAttribute('role','group');panel.setAttribute('aria-label','Character renderer proof of concept');panel.innerHTML='<span id="characterPocStatus" role="status" aria-live="polite"></span><button type="button" data-character-mode="canvas">Canvas</button><button type="button" data-character-mode="reduced">Reduced</button><button type="button" data-character-mode="full">Full</button>';document.querySelector('.stage').appendChild(panel);panel.addEventListener('click',event=>{const button=event.target.closest('[data-character-mode]');if(button)setMode(button.dataset.characterMode);});
  }
  const originalDrawPerson=Kick.drawPerson.bind(Kick),originalReset=Kick.reset.bind(Kick),originalUpdate=Kick.update.bind(Kick),originalSnap=Kick.snap.bind(Kick),originalApplySnap=Kick.applySnap.bind(Kick);
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
    const look=playerLook(),equipment=kitLook();this._J=J;RIG.side(c,J,{u:this.S*1.18,skin:look.skin,hair:look.hair,hairStyle:look.hairStyle,eye:look.eye,brow:look.brow,mouth:model.clip==='celebration'?'smile':look.mouth,kit:look.kit,accent:look.accent,shorts:look.shorts,sock:look.socks,boot:equipment.boot,olw:1.35,chest:.17*this.S*(look.shoulders||1),headR:.15*this.S,sleeve:true,num:look.number||'10',shadow:true});
    return J;
  };
  setMode(requested);syncClip();
  setTimeout(()=>{if(typeof V3!=='undefined'){const originalWant=V3.want.bind(V3);V3.want=()=>mode!=='canvas'&&M===Kick&&Kick.opt.shot==='free'?false:originalWant();}},0);
})();
