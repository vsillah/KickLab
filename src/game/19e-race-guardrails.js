/* Bounded, deterministic contact response for the canonical Race centerline. */
const RACE_GUARDRAILS=(()=>{
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const initial=()=>({events:[],broken:new Map(),dents:new Map(),contact:false,breached:false,breach:null,lastCue:-10,problemTime:0,recovering:0,recoveries:0,contacts:0,serial:0,last:null});
  function emit(q,event){q.events.push({id:++q.serial,...event});if(q.events.length>24)q.events.shift();return q.events.at(-1);}
  function center(s,P,venue){const p=RACE_SYSTEMS.path(s.x,s.y,P,venue),nx=-Math.sin(p.phi),ny=Math.cos(p.phi);return{p,x:s.x+p.e*nx,y:s.y+p.e*ny,nx,ny};}
  function segment(c,side){return `${Math.round(c.x/3)},${Math.round(c.y/3)},${side}`;}
  function step(q,s,previous,P,venue,halfWidth,dt){
    if(q.recovering)return null;
    const c=center(s,P,venue),side=Math.sign(c.p.e)||1,rail=halfWidth+2.4,clearance=1.15,bound=rail-clearance,offset=Math.abs(c.p.e),key=segment(c,side);
    if(offset<bound-.38)q.contact=false;
    const offCourse=q.breached&&offset>rail+.2||offset>rail+2.2||Math.abs(angle(s.th,c.p.phi))>2.25&&offset>halfWidth||s.v<.65&&offset>halfWidth+.3;
    q.problemTime=offCourse?Math.min(1.2,q.problemTime+dt):Math.max(0,q.problemTime-dt*2);
    if(q.problemTime>=1){q.recovering=.32;q.problemTime=0;q.contact=false;q.recoveries++;return emit(q,{type:'recovery-start',x:s.x,y:s.y});}
    if(q.breached){
      const nearGap=Math.hypot(s.x-q.breach.x,s.y-q.breach.y)<4.5,oldOffset=Math.abs(RACE_SYSTEMS.path(previous.x,previous.y,P,venue).e);
      if(!nearGap&&oldOffset>=rail&&offset<rail+clearance){const correction=rail+clearance-offset;s.x-=c.nx*side*correction;s.y-=c.ny*side*correction;s.e=RACE_SYSTEMS.path(s.x,s.y,P,venue).e;s.v*=.55;s.latV=0;return null;}
      if(offset<bound-.38){q.breached=false;q.breach=null;}else return null;
    }
    if(offset<bound||[...q.broken.values()].some(b=>Math.hypot(s.x-b.x,s.y-b.y)<4.5))return null;
    const old=RACE_SYSTEMS.path(previous.x,previous.y,P,venue),normalSpeed=Math.min(Math.hypot(s.v,s.latV||0),Math.max(0,(Math.abs(c.p.e)-Math.abs(old.e))/Math.max(dt,.001)));
    const tangentSpeed=Math.max(0,Math.sqrt(Math.max(0,s.v*s.v-normalSpeed*normalSpeed)));
    const energy=.5*P.m*normalSpeed*normalSpeed;
    const breaking=normalSpeed>=12&&energy>=85000;
    const scrape=normalSpeed<3.5&&tangentSpeed>4;
    const type=breaking?'break':scrape?'scrape':'dent';
    if(breaking){const point={x:c.x-c.nx*side*rail,y:c.y-c.ny*side*rail};q.broken.set(key,point);q.breached=true;q.breach=point;}
    else{
      const penetration=Math.min(offset-bound,Math.max(.1,s.v*dt+1));
      s.x+=c.nx*side*penetration;s.y+=c.ny*side*penetration;
      s.e=RACE_SYSTEMS.path(s.x,s.y,P,venue).e;
      s.v=Math.max(0,s.v*(scrape?.985:clamp(1-normalSpeed/22,.36,.92)));
      s.latV=clamp(s.latV,-Math.max(1,s.v*.16),Math.max(1,s.v*.16));
      s.yawRate=clamp(s.yawRate,-.35,.35);
      s.th-=angle(s.th,c.p.phi)*(scrape?.012:.09);
      if(!scrape&&normalSpeed>=1.2)q.dents.set(key,Math.max(q.dents.get(key)||0,clamp(normalSpeed/10,.08,.55)));
    }
    if(q.contact||normalSpeed<1.2&&tangentSpeed<=4)return null;
    q.contact=!breaking;q.lastCue=s.t;q.contacts++;
    const event=emit(q,{type,key,x:c.x-c.nx*side*rail,y:c.y-c.ny*side*rail,side,speed:s.v,normalSpeed,energy,depth:q.dents.get(key)||0});
    q.last=event;return event;
  }
  function tickRecovery(q,s,P,venue,dt){if(!q.recovering)return false;q.recovering=Math.max(0,q.recovering-dt);if(q.recovering)return false;
    const c=center(s,P,venue);s.x=c.x;s.y=c.y;s.th=c.p.phi;s.v=2;s.latV=0;s.yawRate=0;s.slipAngle=0;s.axleActive=false;s.handbrakeCommitted=false;s.driftMode='none';s.slide=false;s.drift=false;s.skidTime=0;s.e=0;s.zone=c.p.zone;s.nitroActive=false;s.nitroDelivered=false;q.problemTime=0;q.contact=false;q.breached=false;q.breach=null;emit(q,{type:'recovery-end',x:s.x,y:s.y});return true;}
  return Object.freeze({initial,step,tickRecovery,center});
})();
