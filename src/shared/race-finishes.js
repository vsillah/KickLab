(function installRaceFinishes(root){
  'use strict';
  const params=typeof location==='undefined'?null:new URLSearchParams(location.search);
  const enabled=!!(params?.get('raceFinishes')==='prototype'&&params.get('raceExpansion')==='prototype'&&root.KickLabRaceOrigin?.trusted());
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function create(){return{phase:'run',kind:null,elapsed:0,used:false,throttleTime:0,nosTime:0,steerTime:0,handbrakeTime:0,handbrakeArmed:false,shiftAt:-Infinity,driftRecoveredAt:-Infinity,lastDrift:false,lastHandbrake:false,finishTime:0,anchor:null,reason:'waiting'};}
  function distance(mode,s){if(mode==='drag')return 240-s.x;if(mode==='drift')return 215-s.x;if(mode==='hill')return Math.max(0,72-s.y);return Infinity;}
  function observe(q,input,dt){if(!enabled||q.phase!=='run')return q;const {mode,speed,remaining,throttle,brake,nos,steer,handbrake,slip,stable,time,driftMode,steerOwned}=input,window=remaining>=0&&remaining<=Math.max(22,speed*2.1),clean=stable&&Math.abs(slip)<.14;
    q.throttleTime=throttle>=.9&&brake<.1?Math.min(3,q.throttleTime+dt):0;
    q.nosTime=nos&&throttle>.1&&brake<.1?Math.min(3,q.nosTime+dt):0;
    q.steerTime=window&&speed>=13&&Math.abs(steer)>=35?Math.min(2,q.steerTime+dt):0;
    if(window&&speed>=13&&q.steerTime>=.16&&handbrake&&!q.lastHandbrake)q.handbrakeArmed=true;
    q.handbrakeTime=q.handbrakeArmed&&handbrake?Math.min(2,q.handbrakeTime+dt):q.handbrakeTime;
    q.lastHandbrake=!!handbrake;
    if(mode==='drift'&&steerOwned&&q.lastDrift&&driftMode!=='drift'&&clean&&speed>=8)q.driftRecoveredAt=time;
    q.lastDrift=driftMode==='drift';
    if(remaining<0)q.reason='past-finish';return q;
  }
  function shift(q,{quality,gear,time,remaining}){if(enabled&&q.phase==='run'&&gear>=3){q.shiftAt=quality==='optimal'&&remaining>=0&&remaining<=180?time:-Infinity;q.shiftGear=gear;}}
  function cross(q,input){if(!enabled||q.phase!=='run'||q.used||!input.passed||!input.legitimate||!input.render3d){q.reason='ineligible-finish';return null;}const {mode,speed,remaining,stable,slip,time,throttle,nos}=input;if(!['drag','drift','hill'].includes(mode)||remaining>2||speed<8){q.reason='unsafe-crossing';return null;}const handbrakeEligible=q.handbrakeArmed&&q.handbrakeTime>=.16&&speed>=13&&Math.abs(input.steer)>=22&&Math.abs(slip)<.9;if(!handbrakeEligible&&(!stable||Math.abs(slip)>.4)){q.reason='unsafe-crossing';return null;}
    q.anchor={x:input.x,y:input.y,heading:input.heading,speed,vehicle:input.vehicle,venue:input.venue,mode};q.finishTime=time;
    if(handbrakeEligible){q.kind='handbrake-360';q.phase='cinematic';q.shown=true;}
    else if(((q.throttleTime>=1.1&&throttle>=.9)||(q.nosTime>=.6&&nos&&throttle>.1))&&speed>=16){q.phase='await-brake';q.kind='power-stop';q.nos=!!nos;}
    else if((mode==='drag'&&time-q.shiftAt<=7&&time-q.shiftAt>=0)||(mode==='drift'&&time-q.driftRecoveredAt<=4&&time-q.driftRecoveredAt>=0)){q.kind='precision-hero';q.phase='cinematic';q.shown=true;}
    else{q.phase='complete';q.reason='no-earned-contract';return null;}
    q.used=true;q.elapsed=0;q.reason='earned';return q.kind;
  }
  function tick(q,dt,{brake,throttle,paused,hidden,mode,vehicle,venue,reduced}){if(!enabled||!q||q.phase==='run'||q.phase==='complete'||q.phase==='cancelled')return q?.phase||'complete';if(paused||hidden||mode!==q.anchor?.mode||vehicle!==q.anchor?.vehicle||venue!==q.anchor?.venue){q.phase='cancelled';q.reason='lifecycle';return q.phase;}
    q.elapsed+=clamp(dt,0,.06);
    if(q.phase==='await-brake'){if(brake>=.85&&throttle<=.2&&q.elapsed<=.5){q.phase='cinematic';q.elapsed=0;q.shown=true;}else if(q.elapsed>.5){q.phase='complete';q.reason='brake-missed';}}
    else if(q.phase==='cinematic'&&q.elapsed>=(reduced?.9:q.kind==='handbrake-360'?2.25:q.kind==='power-stop'?2.05:3.1))q.phase='complete';return q.phase;
  }
  function cancel(q,reason){if(q&&['await-brake','cinematic'].includes(q.phase)){q.phase='cancelled';q.reason=reason;}return q?.phase;}
  function pose(q,reduced){if(!q?.shown||!['cinematic','complete'].includes(q.phase))return null;const a=q.anchor,t=q.elapsed,d=reduced?.9:q.kind==='handbrake-360'?2.25:q.kind==='power-stop'?2.05:3.1,p=clamp(t/d,0,1),ease=p*p*(3-2*p),stopT=Math.min(t,1.15),forward=Math.max(0,a.speed)*(q.kind==='power-stop'?stopT-stopT*stopT/2.3:q.kind==='handbrake-360'?.22*p:.7*p),rotation=reduced?0:q.kind==='handbrake-360'?Math.PI*2*ease:0,lateral=q.kind==='handbrake-360'?-a.y*.45*ease:0;return{x:a.x+Math.cos(a.heading)*forward-Math.sin(a.heading)*lateral,y:a.y+Math.sin(a.heading)*forward+Math.cos(a.heading)*lateral,heading:a.heading+rotation,pitch:reduced?0:q.kind==='power-stop'?-.065*Math.sin(Math.PI*p):0,progress:p,kind:q.kind,done:p>=1};}
  root.KickLabRaceFinishes=Object.freeze({enabled,create,distance,observe,shift,cross,tick,cancel,pose});
})(typeof globalThis!=='undefined'?globalThis:window);
