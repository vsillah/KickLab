(function installRaceModes(root){
  'use strict';
  const MODES=Object.freeze({
    drag:Object.freeze({id:'drag',name:'Drag Sprint',venue:'highland',course:'straight',distance:240,description:'Launch cleanly, shift through four gears, manage NOS and heat, then cross the 240 m trap.',target:'Finish within 19 s and reach 95 km/h at the trap.',garage:'Body and tires change launch. Narrow tires lower rolling loss; wide tires add traction.',recommend:'Kestrel favors launch; Aegis carries speed but starts heavier.',preferred:'body'}),
    drift:Object.freeze({id:'drift',name:'Drift Trial',venue:'highland',course:'drift',description:'Accelerate along the straight, drift the left curve, recover, then set up the right curve.',target:'Score at least 150 points with 50 in each curve and no spin or wall contact.',garage:'Soft suspension helps recovery between curves; wide tires add grip but make a slide harder to hold.',recommend:'Aim for 35–38 km/h. Lift through each curve; brake on the recovery straight if needed.',preferred:'suspension'}),
    circuit:Object.freeze({id:'circuit',name:'Circuit Laps',venue:'highland',course:'oval',laps:2,description:'Complete two genuine laps across the start and finish line.',target:'Finish two laps within 90 s with less than 2 s sliding.',garage:'Endurance brakes keep repeated stops consistent; tires trade grip for heat and drag.',recommend:'Cobalt is steady; Aegis rewards a precise line.',preferred:'brakes'}),
    hill:Object.freeze({id:'hill',name:'Time Attack / Hill Climb',venue:'highland',course:'bend',description:'Climb the switchback with a clean line and a setup that holds speed.',target:'Finish within 20 s with less than 0.5 s sliding.',garage:'Mass, grip, brakes and suspension affect acceleration, stopping and the climb.',recommend:'Kestrel climbs light; Cobalt and Aegis carry speed.',preferred:'tires'})
  });
  const NEXT=Object.freeze({id:'endurance',name:'Endurance / Heat Management',available:false});
  const DEFAULT=Object.freeze({version:1,selected:'drag',best:{}});
  const ACTIVE=typeof location!=='undefined'&&root.KickLabRaceOrigin.trusted()&&new URLSearchParams(location.search).get('raceExpansion')==='prototype';
  function enabled(){return ACTIVE;}
  function normalize(raw){if(!raw||typeof raw!=='object'||raw.version!==1)return{version:1,selected:'drag',best:{}};const best={};for(const id of Object.keys(MODES)){const n=Number(raw.best?.[id]);if(Number.isFinite(n)&&n>=0)best[id]=n;}return{version:1,selected:MODES[raw.selected]?raw.selected:'drag',best};}
  function config(id){return MODES[id]||MODES.drag;}
  function initial(id){return{mode:id,phase:'grid',elapsed:0,distance:0,trapKmh:0,launchSpin:0,nosUsed:0,peakHeat:0,gear:1,shifts:0,badShifts:0,shiftCooldown:0,driftPoints:0,driftCurvePoints:[0,0],driftSeconds:0,spinCount:0,offLineSeconds:0,laps:0,lapTimes:[],lastLapAt:0,routeArmed:false,lastAngle:null,lastX:null,lastY:null};}
  const DRIFT_ROUTE=Object.freeze({leadEnd:90,radius:28,recoveryStart:28,recoveryEnd:92,exitX:146,exitY:120,finishX:215,roadEndX:440});
  function lightPhase(seconds){return seconds<=0?'go':seconds>1.6?'red':seconds>.8?'yellow':'green';}
  function crossedFinish(mode,before,s){if(mode.id==='drag')return before.x<mode.distance&&s.x>=mode.distance&&Math.abs(s.e)<=7;if(mode.id==='drift')return before.x<DRIFT_ROUTE.finishX&&s.x>=DRIFT_ROUTE.finishX&&s.zone===4&&Math.abs(s.e)<=7;return false;}
  function speedTreatment(speed,top,reduced){const intensity=clamp((speed-10)/Math.max(20,top-10),0,1);return Object.freeze({intensity,fieldOfView:reduced?55:55+intensity*5,cameraVibration:reduced?0:intensity*.035,streakOpacity:reduced?0:intensity*.28});}
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  function driftPath(x,y){const r=DRIFT_ROUTE.radius,candidates=[];
    function add(px,py,tx,ty,kp,zone){const dx=x-px,dy=y-py;candidates.push({distance:dx*dx+dy*dy,e:-(tx*dy-ty*dx),phi:Math.atan2(ty,tx),kp,zone});}
    add(clamp(x,-35,90),0,1,0,0,0);
    const a=clamp(Math.atan2(x-90,28-y),0,Math.PI/2);add(90+r*Math.sin(a),28-r*Math.cos(a),Math.cos(a),Math.sin(a),1/r,1);
    add(118,clamp(y,28,92),0,1,0,2);
    const b=clamp(Math.atan2(y-92,146-x),0,Math.PI/2);add(146-r*Math.cos(b),92+r*Math.sin(b),Math.sin(b),Math.cos(b),-1/r,3);
    add(clamp(x,146,DRIFT_ROUTE.roadEndX),120,1,0,0,4);
    const nearest=candidates.reduce((best,candidate)=>candidate.distance<best.distance?candidate:best);return{e:nearest.e,phi:nearest.phi,kp:nearest.kp,zone:nearest.zone};}
  function driftPoints(){const pts=[];const add=(x,z,tx,tz)=>pts.push({x,z,tx,tz});for(let x=-35;x<=90;x+=3)add(x,0,1,0);for(let i=1;i<=28;i++){const a=i*Math.PI/56;add(90+28*Math.sin(a),28-28*Math.cos(a),Math.cos(a),Math.sin(a));}for(let z=31;z<=92;z+=3)add(118,z,0,1);for(let i=1;i<=28;i++){const a=i*Math.PI/56;add(146-28*Math.cos(a),92+28*Math.sin(a),Math.sin(a),Math.cos(a));}for(let x=149;x<=DRIFT_ROUTE.roadEndX;x+=3)add(x,120,1,0);return pts;}
  function coast(a,s,dt){if(a.mode!=='drag'&&a.mode!=='drift')return false;const center=a.mode==='drag'?0:DRIFT_ROUTE.exitY,end=a.mode==='drag'?MODES.drag.distance+150:DRIFT_ROUTE.roadEndX-6;s.x=Math.min(end,s.x+s.v*dt);s.y+=(center-s.y)*Math.min(1,dt*2);s.e=center-s.y;return true;}
  const GEAR_BANDS=Object.freeze([[0,.27],[.14,.49],[.36,.73],[.57,1.1]]);
  function gearEfficiency(a,speed,top){if(a.mode!=='drag')return 1;if(a.shiftCooldown>0)return 0;const [low,high]=GEAR_BANDS[a.gear-1],ratio=speed/Math.max(top,1),distance=Math.max(low-ratio,ratio-high,0);return Math.max(.44,1-distance*3);}
  function shift(a,speed,top){if(a.mode!=='drag'||a.phase!=='run'||a.gear>=4||a.shiftCooldown>0)return false;const ratio=speed/Math.max(top,1),ideal=GEAR_BANDS[a.gear-1][1],early=ratio<ideal-.1;a.badShifts+=early?1:0;a.gear++;a.shifts++;a.shiftCooldown=.18;return true;}
  function observe(a,s,previous,dt,inputs,P){if(a.phase!=='run')return a;a.elapsed+=dt;a.shiftCooldown=Math.max(0,a.shiftCooldown-dt);a.distance+=Math.hypot(s.x-previous.x,s.y-previous.y);a.trapKmh=s.v*3.6;a.peakHeat=Math.max(a.peakHeat,s.garageBrakeHeat||0,s.garageTireHeat||0,inputs.heat||0);if(s.nitroActive)a.nosUsed+=dt;if(s.v<8&&inputs.gas>.6&&s.launchSlip>0)a.launchSpin+=dt*Math.min(1,s.launchSlip);
    const off=Math.abs(s.e)>3.5;if(off)a.offLineSeconds+=dt;
    if(a.mode==='drift'){const angle=Math.abs(s.slipAngle||0)*180/Math.PI,curve=s.zone===1?0:s.zone===3?1:-1,controlled=curve>=0&&s.driftMode==='drift'&&angle>=7&&angle<=32&&s.v>=8&&!off;if(controlled){const points=dt*(s.v*3.6)*Math.min(angle,24)/24*6;a.driftSeconds+=dt;a.driftPoints+=points;a.driftCurvePoints[curve]+=points;}if(s.driftMode==='skid'&&previous.mode!=='skid')a.spinCount++;}
    if(a.mode==='circuit'){
      const theta=Math.atan2((s.y||0)/38,(s.x-80)/70),prev=previous.angle??theta;
      let delta=theta-prev;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;
      a.lastAngle=theta;
      if(delta>0&&Math.abs(s.e)<7){a.routeArmed=a.routeArmed||theta>-.4&&theta<.4;
        if(a.routeArmed&&prev<Math.PI-.12&&theta>=Math.PI-.12&&a.elapsed-a.lastLapAt>8){a.laps++;a.lapTimes.push(a.elapsed-a.lastLapAt);a.lastLapAt=a.elapsed;a.routeArmed=false;}}
    }
    return a;}
  function result(a,ok,slideSeconds){const score=a.mode==='drift'?Math.max(0,Math.round(a.driftPoints-a.spinCount*100-a.offLineSeconds*50)):a.mode==='drag'?Math.max(0,Math.round(1500-a.elapsed*40+a.trapKmh*2-a.launchSpin*80-a.peakHeat*120-a.badShifts*30)):a.mode==='circuit'?Math.max(0,Math.round(1800-a.elapsed*15-Math.abs((a.lapTimes[0]||0)-(a.lapTimes[1]||0))*25-slideSeconds*80)):Math.max(0,Math.round(1200-a.elapsed*30-slideSeconds*120-a.offLineSeconds*60));const pass=!!ok&&(a.mode==='drag'?a.elapsed<=19&&a.trapKmh>=95:a.mode==='drift'?score>=150&&a.driftCurvePoints[0]>=50&&a.driftCurvePoints[1]>=50&&a.spinCount===0:a.mode==='circuit'?a.laps>=2&&a.elapsed<=90&&slideSeconds<2:a.elapsed<=20&&slideSeconds<.5);return{pass,score,measure:a.mode==='drag'?`${a.elapsed.toFixed(2)} s · trap ${Math.round(a.trapKmh)} km/h · gear ${a.gear} · shifts ${a.shifts} (${a.badShifts} early) · NOS ${a.nosUsed.toFixed(1)} s · launch slip ${a.launchSpin.toFixed(1)} s · heat ${Math.round(a.peakHeat*100)}%`:a.mode==='drift'?`${score} points · left ${Math.round(a.driftCurvePoints[0])} / right ${Math.round(a.driftCurvePoints[1])} · controlled ${a.driftSeconds.toFixed(1)} s · spins ${a.spinCount} · off line ${a.offLineSeconds.toFixed(1)} s`:a.mode==='circuit'?`${a.laps}/2 laps · ${a.elapsed.toFixed(2)} s · laps ${a.lapTimes.map(x=>x.toFixed(1)).join(' / ')} s · slide ${slideSeconds.toFixed(1)} s`:`${a.elapsed.toFixed(2)} s · slide ${slideSeconds.toFixed(1)} s · off line ${a.offLineSeconds.toFixed(1)} s`};}
  function live(a,s){if(a.mode==='drag')return`G${a.gear} · ${a.elapsed.toFixed(1)}s · ${Math.round(s.v*3.6)} km/h · tap Shift near the top of each band`;if(a.mode==='drift')return`${Math.round(a.driftPoints)} pts · ${s.zone<2?'left curve · target 38 km/h':s.zone===2?'recover · set up right curve':'right curve · target 38 km/h'}`;if(a.mode==='circuit')return`${a.laps}/2 laps · ${a.elapsed.toFixed(1)}s · brake for bends`;return`${a.elapsed.toFixed(1)}s · climb cleanly`;}
  root.KickLabRaceModes=Object.freeze({MODES,NEXT,DEFAULT,DRIFT_ROUTE,driftPath,driftPoints,coast,lightPhase,crossedFinish,speedTreatment,enabled,normalize,config,initial,observe,result,live,gearEfficiency,shift});
})(typeof globalThis!=='undefined'?globalThis:window);
