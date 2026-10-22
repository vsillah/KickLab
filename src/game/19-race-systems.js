/* Race Lab systems prototype. Enabled only by explicit flags at trusted locations. */
const RACE_SYSTEMS=(()=>{
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  const VENUES=Object.freeze({
    highland:Object.freeze({id:'highland',name:'Highland Switchback',turn:1,baseGrip:1,shoulderGrip:.78,runoffGrip:.48,roadHalfWidth:7,runoffWidth:5,gripZones:Object.freeze([{from:0,to:92,multiplier:1},{from:92,to:220,multiplier:.94}]),elevation:Object.freeze([{at:0,height:0},{at:95,height:7},{at:170,height:14}]),landmarks:Object.freeze(['terraced seating','stone service pavilion','distant switchback'])}),
    marine:Object.freeze({id:'marine',name:'Marine Terrace',turn:1,baseGrip:.88,shoulderGrip:.58,runoffGrip:.4,roadHalfWidth:7,runoffWidth:6,gripZones:Object.freeze([{from:0,to:88,multiplier:1},{from:88,to:220,multiplier:.84}]),elevation:Object.freeze([{at:0,height:0},{at:95,height:1},{at:170,height:2}]),landmarks:Object.freeze(['sea wall','columned service bay','estuary horizon'])}),
    forest:Object.freeze({id:'forest',name:'Forest Lantern Descent',turn:-1,baseGrip:.82,shoulderGrip:.52,runoffGrip:.35,roadHalfWidth:7,runoffWidth:5,gripZones:Object.freeze([{from:0,to:85,multiplier:1},{from:85,to:220,multiplier:.8}]),elevation:Object.freeze([{at:0,height:9},{at:95,height:3},{at:170,height:0}]),landmarks:Object.freeze(['supported timber pavilion','service cluster','distant bridge'])})
  });
  const CONTRACT=Object.freeze({version:1,units:'metres',forward:'+X',up:'+Y',right:'+Z',root:'VehicleRoot',body:'Body',dimensions:Object.freeze({length:4.9,width:1.95,height:1.45,wheelbase:2.9}),wheels:Object.freeze({frontLeft:Object.freeze({node:'WheelFrontLeft',pivot:[1.28,.43,-1.04]}),frontRight:Object.freeze({node:'WheelFrontRight',pivot:[1.28,.43,1.04]}),rearLeft:Object.freeze({node:'WheelRearLeft',pivot:[-1.28,.43,-1.04]}),rearRight:Object.freeze({node:'WheelRearRight',pivot:[-1.28,.43,1.04]})}),cameraTarget:Object.freeze([-.3,1.02,0]),collider:Object.freeze({kind:'box',center:[0,.72,0],halfExtents:[2.45,.72,.98]}),lights:Object.freeze(['BrakeLeft','BrakeRight','HeadlightLeft','HeadlightRight']),effects:Object.freeze(['ExhaustLeft','ExhaustRight','RearTireLeft','RearTireRight']),materialSlots:Object.freeze(['body','glass','aero','wheels','lights']),lod:Object.freeze({high:'VehicleRoot',low:'VehicleLow',canvas:'Race Canvas fallback'})});
  const params=typeof location!=='undefined'?new URLSearchParams(location.search):null;
  const ACTIVE=!!params&&globalThis.KickLabRaceOrigin.trusted()&&(params.get('raceSystems')==='proxy'||params.get('raceTelemetry')==='prototype'||params.get('raceCornerTrace')==='prototype'||params.get('raceProgression')==='prototype'||params.get('raceExpansion')==='prototype');
  if(ACTIVE&&typeof document!=='undefined')document.documentElement.dataset.raceSystems='proxy';
  function enabled(){return ACTIVE;}
  function venue(id){return VENUES[id]||VENUES.highland;}
  function path(x,y,P,v=VENUES.highland){if(P.expansionCourse==='straight')return{e:-y,phi:0,kp:0,zone:0};if(P.expansionCourse==='drift')return globalThis.KickLabRaceModes.driftPath(x,y);if(P.expansionCourse==='oval'){const theta=Math.atan2(y/38,(x-80)/70),px=80+70*Math.cos(theta),py=38*Math.sin(theta),phi=Math.atan2(38*Math.cos(theta),-70*Math.sin(theta)),normal=Math.hypot(x-px,y-py),cross=(-38*Math.cos(theta)*(x-px)-70*Math.sin(theta)*(y-py));return{e:-Math.sign(cross)*normal,phi,kp:70*38/Math.pow(70*70*Math.sin(theta)**2+38*38*Math.cos(theta)**2,1.5),zone:1};}const sign=v.turn;if(x<P.L)return{e:-y,phi:0,kp:0,zone:0};const yy=sign*y;if(yy<P.R){const rx=x-P.L,ry=yy-P.R,r=Math.hypot(rx,ry);return{e:sign*(r-P.R),phi:sign*(Math.atan2(ry,rx)+Math.PI/2),kp:sign/P.R,zone:1};}return{e:sign*(x-(P.L+P.R)),phi:sign*Math.PI/2,kp:0,zone:2};}
  function grip(s,P,v){const p=path(s.x,s.y,P,v),offset=Math.abs(p.e),zone=v.gripZones.find(z=>s.x>=z.from&&s.x<z.to)||v.gripZones.at(-1),edge=offset>v.roadHalfWidth?v.runoffGrip:offset>v.roadHalfWidth*.72?v.shoulderGrip:1;return clamp((P.tireMu??P.mu)*(1+(P.downforce||0)*Math.min(1,(Number(s.v)||0)/Math.max(P.top||1,1))**2)*v.baseGrip*(P.expansionCourse==='oval'||P.expansionCourse==='straight'?1:zone.multiplier)*edge,.15,2);}
  function initial(){return{latV:0,slipAngle:0,driftMode:'none',driftHold:0,skidTime:0,nitro:1,nitroCooldown:0,nitroActive:false};}
  function cancelInput(input){input.gas=false;input.brake=false;input.left=false;input.right=false;input.drift=false;input.nitro=false;return input;}
  function autoWheel(s,P,v){const p=path(s.x,s.y,P,v),look=Math.max(8,.7*s.v);let error=p.phi-s.th;while(error>Math.PI)error-=2*Math.PI;while(error<-Math.PI)error+=2*Math.PI;const curvature=p.kp+2*Math.sin(error+Math.atan(p.e/look))/look;return clamp(P.ratio*Math.atan(curvature*P.Lwb)*180/Math.PI,-180,180);}
  function step(s,P,input,dt,v=VENUES.highland){
    const h=clamp(dt,0,.02),gas=clamp(Number(input.gas)||0,0,1),brake=clamp(Number(input.brake)||0,0,1),g=9.81;
    const rawWheel=input.auto?autoWheel(s,P,v):clamp(Number(input.wheel)||0,-180,180),garage=globalThis.KickLabRaceGarage,tune=garage?garage.response(s,P,rawWheel,brake,h):{wheel:rawWheel,muFactor:1,brakeFactor:1},mu=grip(s,P,v)*tune.muFactor,wheel=tune.wheel,steer=wheel/P.ratio*Math.PI/180,requested=Math.tan(steer)/P.Lwb;
    const requestedLat=s.v*s.v*Math.abs(requested),was=s.driftMode||'none';
    const canDrift=!!input.drift&&s.v>=9&&Math.abs(wheel)>=9&&brake<.3&&Math.abs(s.slipAngle||0)<.48;
    let mode=was==='skid'&&s.skidTime>0?'skid':canDrift?'drift':'none';
    if(mode==='drift')s.driftHold=Math.min(5,(s.driftHold||0)+h);else s.driftHold=0;
    const cap=mu*g,launchSlip=P.expansionCourse==='straight'&&s.v<8&&gas>.6?Math.max(0,P.F/P.m-cap)/Math.max(cap,.1):0,tractionEfficiency=Math.max(.78,1-launchSlip*.3),longDesired=brake?-.95*cap*brake*tune.brakeFactor:gas?Math.min(P.F/P.m,cap)*gas*tractionEfficiency:Math.max(-.5*(P.rolling??1),-s.v*1.4*(P.rolling??1));
    const boostAllowed=!!input.nitro&&gas>.1&&brake<.1&&(s.nitroCooldown||0)<=0&&(s.nitro||0)>0&&mode!=='skid';
    const boost=boostAllowed?Math.min(3.8,Math.max(0,cap-Math.max(0,longDesired))):0;
    const longitudinal=clamp(longDesired+boost,-cap,cap),lateralBudget=Math.sqrt(Math.max(0,cap*cap-longitudinal*longitudinal))*(mode==='drift'?.78:1);
    if((requestedLat>lateralBudget*(mode==='drift'?1.5:1.18)&&s.v>5)||Math.abs(s.slipAngle||0)>.55){mode='skid';s.skidTime=Math.max(s.skidTime||0,.55);}
    if(mode==='skid')s.skidTime=Math.max(0,(s.skidTime||0)-h);else s.skidTime=0;
    const yawCap=(mode==='skid'?.62:1)*lateralBudget*(P.stability??1)/Math.max(s.v*s.v,.01),yawCurvature=clamp(requested,-yawCap,yawCap);
    const slipGoal=mode==='drift'?Math.sign(wheel)*clamp(.08+requestedLat/Math.max(cap,1)*.14,.08,.3):mode==='skid'?Math.sign(wheel||s.slipAngle||1)*.42:0;
    s.slipAngle=(s.slipAngle||0)+(slipGoal-(s.slipAngle||0))*Math.min(1,h*(mode==='skid'?2.5:4.5*(P.recovery??1)));
    s.latV=s.v*Math.sin(s.slipAngle);
    const slope=P.progressionGrade?globalThis.KickLabRaceProgression.grade(v,s.x)*Math.cos(s.th):0;
    const drag=(P.F/P.m)/(P.top*P.top)*(P.rolling??1),accel=longitudinal-drag*s.v*s.v-g*slope/Math.sqrt(1+slope*slope);
    s.v=Math.max(0,s.v+accel*h);s.th+=s.v*yawCurvature*h;s.x+=(s.v*Math.cos(s.th)-s.latV*Math.sin(s.th))*h;s.y+=(s.v*Math.sin(s.th)+s.latV*Math.cos(s.th))*h;s.t+=h;
    s.nitroActive=boostAllowed;if(boostAllowed){s.nitro=Math.max(0,(s.nitro||0)-h/2.2);if(s.nitro===0)s.nitroCooldown=3.5;}else if((s.nitroCooldown||0)>0)s.nitroCooldown=Math.max(0,s.nitroCooldown-h);else s.nitro=Math.min(1,(s.nitro||0)+h/9);
    s.driftMode=mode;s.slide=mode==='skid';s.drift=mode==='drift';s.launchSlip=launchSlip;s.wheel=wheel;s.k=yawCurvature;s.kc=requested;s.alat=s.v*s.v*Math.abs(yawCurvature);s.need=requestedLat;s.muEffective=mu;
    const p=path(s.x,s.y,P,v);s.e=p.e;s.zone=p.zone;if(garage)garage.afterStep(s,P);return s;
  }
  function camera(s,width,{reduced=false}={}){const h=s.th||0,fx=Math.cos(h),fz=Math.sin(h),speed=clamp((s.v||0)/30,0,1),phone=width<500,back=(phone?13.6:width<850?12.6:width<1150?9.1:7.7)+speed,height=(phone?5.1:width<850?5.5:4.7)+speed*.35,ahead=(phone?3.8:3)+speed*2;return{position:[s.x-fx*back-fz*.6,height,s.y-fz*back+fx*.6],look:[s.x+fx*ahead,1.05,s.y+fz*ahead],back,height,lookAhead:ahead,instant:!!reduced};}
  function validateVehicle(names,{proxy=false}={}){const set=new Set(names.map(name=>String(name).replace(/\s+/g,'_'))),missing=[];if(proxy){for(const key of ['front tire -1','front tire 1','rear tire -1','rear tire 1','sculpted blue body shell'])if(!set.has(key.replace(/\s+/g,'_')))missing.push(key);}else for(const key of [CONTRACT.root,CONTRACT.body,...Object.values(CONTRACT.wheels).map(w=>w.node)])if(!set.has(key))missing.push(key);return{ok:missing.length===0,missing,proxy,contractVersion:CONTRACT.version};}
  return Object.freeze({CONTRACT,VENUES,enabled,venue,path,grip,initial,cancelInput,autoWheel,step,camera,validateVehicle});
})();
