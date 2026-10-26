(function installRaceModes(root){
  'use strict';
  const MODES=Object.freeze({
    drag:Object.freeze({id:'drag',name:'Drag Sprint',venue:'highland',course:'straight',distance:240,description:'Launch cleanly, shift through four gears, manage NOS and heat, then cross the 240 m trap.',target:'Finish within 19 s and reach 95 km/h at the trap.',garage:'Body and tires change launch. Narrow tires lower rolling loss; wide tires add traction.',recommend:'Kestrel favors launch; Aegis carries speed but starts heavier.',preferred:'body'}),
    drift:Object.freeze({id:'drift',name:'Drift Trial',venue:'highland',course:'drift',description:'Accelerate along the straight, drift the left curve, recover, then set up the right curve.',target:'Score at least 150 points with 50 in each curve and no spin or wall contact.',garage:'Soft suspension helps recovery between curves; wide tires add grip but make a slide harder to hold.',recommend:'Aim for 35–38 km/h. Lift through each curve; brake on the recovery straight if needed.',preferred:'suspension'}),
    circuit:Object.freeze({id:'circuit',name:'Circuit Laps',venue:'highland',course:'oval',laps:2,description:'Complete two genuine laps across the start and finish line.',target:'Finish two laps within 90 s with less than 2 s sliding.',garage:'Endurance brakes keep repeated stops consistent; tires trade grip for heat and drag.',recommend:'Cobalt is steady; Aegis rewards a precise line.',preferred:'brakes'}),
    hill:Object.freeze({id:'hill',name:'Time Attack / Hill Climb',venue:'highland',course:'bend',description:'Climb the switchback with a clean line and a setup that holds speed.',target:'Finish within 20 s with less than 0.5 s sliding.',garage:'Mass, grip, brakes and suspension affect acceleration, stopping and the climb.',recommend:'Kestrel climbs light; Cobalt and Aegis carry speed.',preferred:'tires'}),
    endurance:Object.freeze({id:'endurance',name:'Endurance / Heat Management',venue:'highland',course:'oval',laps:3,description:'Three 1.07 km laps with 220 m straights and 100 m bends; engine heat carries across the line.',target:'≤145 s · ≥12 s at 90–120 km/h on straights · lap spread ≤8 s · slide <2 s · peak heat <95% · critical ≤3 s.',garage:'Tires set the 100 m bend limit; brakes trade stopping force for heat recovery before each turn.',recommend:'Reach 90–120 km/h on the straights, then brake toward the grip limit before the 100 m bend.',preferred:'tires'})
  });
  const NEXT=Object.freeze({id:'endurance',name:'Endurance / Heat Management',available:true});
  const DEFAULT=Object.freeze({version:1,selected:'drag',best:{}});
  const ACTIVE=typeof location!=='undefined'&&root.KickLabRaceOrigin.trusted()&&new URLSearchParams(location.search).get('raceExpansion')==='prototype';
  function enabled(){return ACTIVE;}
  function normalize(raw){if(!raw||typeof raw!=='object'||raw.version!==1)return{version:1,selected:'drag',best:{}};const best={};for(const id of Object.keys(MODES)){const n=Number(raw.best?.[id]);if(Number.isFinite(n)&&n>=0)best[id]=n;}return{version:1,selected:MODES[raw.selected]?raw.selected:'drag',best};}
  function config(id){return MODES[id]||MODES.drag;}
  function initial(id){return{mode:id,phase:'grid',elapsed:0,distance:0,trapKmh:0,launchSpin:0,nosUsed:0,peakHeat:0,peakEngineHeat:0,criticalSeconds:0,peakStraightKmh:0,straightPaceSeconds:0,gear:1,shifts:0,badShifts:0,shiftCooldown:0,driftPoints:0,driftCurvePoints:[0,0],driftSeconds:0,spinCount:0,offLineSeconds:0,laps:0,lapTimes:[],lastLapAt:0,routeArmed:false,lastAngle:null,lastProgress:null,lastX:null,lastY:null};}
  const ENDURANCE_TRACK=Object.freeze({left:10,right:210,centerX:110,halfStraight:110,radius:100,straight:220,lapLength:440+200*Math.PI});
  function endurancePoint(distance){const q=ENDURANCE_TRACK,r=q.radius,half=q.halfStraight,arc=Math.PI*r,lap=q.lapLength;let d=((distance%lap)+lap)%lap;
    if(d<half)return{x:q.left,y:-d,tx:0,ty:-1};d-=half;
    if(d<arc){const a=Math.PI+d/r;return{x:q.centerX+r*Math.cos(a),y:-half+r*Math.sin(a),tx:-Math.sin(a),ty:Math.cos(a)};}d-=arc;
    if(d<q.straight)return{x:q.right,y:-half+d,tx:0,ty:1};d-=q.straight;
    if(d<arc){const a=d/r;return{x:q.centerX+r*Math.cos(a),y:half+r*Math.sin(a),tx:-Math.sin(a),ty:Math.cos(a)};}d-=arc;
    return{x:q.left,y:half-d,tx:0,ty:-1};}
  function endurancePath(x,y){const q=ENDURANCE_TRACK,r=q.radius,half=q.halfStraight,arc=Math.PI*r,lap=q.lapLength,candidates=[];
    const add=(px,py,tx,ty,kp,progress,zone)=>{const dx=x-px,dy=y-py;candidates.push({distance:dx*dx+dy*dy,e:-(tx*dy-ty*dx),phi:Math.atan2(ty,tx),kp,progress,zone});};
    const bottomY=Math.min(0,Math.max(-half,y)),topY=Math.min(half,Math.max(0,y));add(q.left,bottomY,0,-1,0,-bottomY,'straight');add(q.left,topY,0,-1,0,lap-topY,'straight');
    let a=Math.atan2(y+half,x-q.centerX);if(a<0)a+=Math.PI*2;a=Math.min(Math.PI*2,Math.max(Math.PI,a));add(q.centerX+r*Math.cos(a),-half+r*Math.sin(a),-Math.sin(a),Math.cos(a),1/r,half+(a-Math.PI)*r,'bend');
    const rightY=Math.min(half,Math.max(-half,y));add(q.right,rightY,0,1,0,half+arc+rightY+half,'straight');
    a=Math.min(Math.PI,Math.max(0,Math.atan2(y-half,x-q.centerX)));add(q.centerX+r*Math.cos(a),half+r*Math.sin(a),-Math.sin(a),Math.cos(a),1/r,half+arc+q.straight+a*r,'bend');
    const best=candidates.reduce((best,item)=>item.distance<best.distance?item:best);return{e:best.e,phi:best.phi,kp:best.kp,zone:best.zone,progress:best.progress};}
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
  function coast(a,s,dt){if(a.mode==='endurance'){const current=endurancePath(s.x,s.y),next=endurancePoint(current.progress+s.v*dt);s.x=next.x;s.y=next.y;s.th=Math.atan2(next.ty,next.tx);s.e=0;return true;}if(a.mode!=='drag'&&a.mode!=='drift')return false;const center=a.mode==='drag'?0:DRIFT_ROUTE.exitY,end=a.mode==='drag'?MODES.drag.distance+150:DRIFT_ROUTE.roadEndX-6;s.x=Math.min(end,s.x+s.v*dt);s.y+=(center-s.y)*Math.min(1,dt*2);s.e=center-s.y;return true;}
  // Ratios use each vehicle's top speed. The short 240 m sprint, thermal power loss,
  // and shift cooldown leave less acceleration room than a top-speed gear ladder.
  const GEAR_BANDS=Object.freeze([[0,.18],[.11,.31],[.24,.42],[.35,1.1]]);
  function shiftWindow(gear){const ideal=GEAR_BANDS[gear-1]?.[1];return gear>=1&&gear<4&&Number.isFinite(ideal)?Object.freeze({gear,ideal,low:ideal-.035,high:ideal+.025}):null;}
  function shiftTiming(gear,speed,top,strict=true){const window=shiftWindow(gear);if(!window)return null;const ratio=speed/Math.max(top,1);return ratio<window.low?'early':strict&&ratio>window.high?'late':'optimal';}
  function shiftDisplay(gear,speed,top){const window=shiftWindow(gear);if(!window)return null;const ratio=speed/Math.max(top,1),scale=window.ideal+.17,fraction=clamp(ratio/scale,0,1);return Object.freeze({gear,ratio,window,timing:shiftTiming(gear,speed,top,true),fraction,target:[window.low/scale,window.high/scale],rpm:Math.round(fraction*8500)});}
  function finisherReady(a,speed,top){if(a?.mode!=='drag')return true;if(a.gear>=4)return true;const finalWindow=shiftWindow(3);return a.gear===3&&speed/Math.max(top,1)>finalWindow.high;}
  function gearEfficiency(a,speed,top){if(a.mode!=='drag')return 1;if(a.shiftCooldown>0)return 0;const [low,high]=GEAR_BANDS[a.gear-1],ratio=speed/Math.max(top,1),distance=Math.max(low-ratio,ratio-high,0);return Math.max(.44,1-distance*3);}
  function shift(a,speed,top,strict=false){if(a.mode!=='drag'||a.phase!=='run'||a.gear>=4||a.shiftCooldown>0)return false;const timing=shiftTiming(a.gear,speed,top,strict),early=timing==='early',late=timing==='late';a.badShifts+=early||late?1:0;a.lastShift=timing;a.gear++;a.shifts++;a.shiftCooldown=strict&&(early||late)?.32:.18;return true;}
  function downshift(a,speed,top){if(a.mode!=='drag'||a.phase!=='run'||a.gear<=1||a.shiftCooldown>0)return false;const ratio=speed/Math.max(top,1),high=GEAR_BANDS[a.gear-2][1];a.gear--;a.shifts++;a.lastShift=ratio>high?'missed':'downshift';a.badShifts+=ratio>high?1:0;a.shiftCooldown=ratio>high?.4:.22;return true;}
  function observe(a,s,previous,dt,inputs,P){if(a.phase!=='run')return a;a.elapsed+=dt;a.shiftCooldown=Math.max(0,a.shiftCooldown-dt);a.distance+=Math.hypot(s.x-previous.x,s.y-previous.y);a.trapKmh=s.v*3.6;a.peakHeat=Math.max(a.peakHeat,s.garageBrakeHeat||0,s.garageTireHeat||0,inputs.heat||0);if(s.nitroActive)a.nosUsed+=dt;if(s.v<8&&inputs.gas>.6&&s.launchSlip>0)a.launchSpin+=dt*Math.min(1,s.launchSlip);
    const off=Math.abs(s.e)>3.5;if(off)a.offLineSeconds+=dt;
    if(a.mode==='drift'){const angle=Math.abs(s.slipAngle||0)*180/Math.PI,curve=s.zone===1?0:s.zone===3?1:-1,controlled=curve>=0&&s.driftMode==='drift'&&angle>=7&&angle<=32&&s.v>=8&&!off;if(controlled){const points=dt*(s.v*3.6)*Math.min(angle,24)/24*6;a.driftSeconds+=dt;a.driftPoints+=points;a.driftCurvePoints[curve]+=points;}if(s.driftMode==='skid'&&previous.mode!=='skid')a.spinCount++;}
    if(a.mode==='endurance'){const heat=clamp(Number(inputs.heat)||0,0,1),path=endurancePath(s.x,s.y),prev=a.lastProgress??endurancePath(previous.x,previous.y).progress,speedKmh=s.v*3.6; a.peakEngineHeat=Math.max(a.peakEngineHeat,heat);if(heat>=.91)a.criticalSeconds+=dt;
      if(path.zone==='straight'&&Math.abs(path.e)<7){a.peakStraightKmh=Math.max(a.peakStraightKmh,speedKmh);if(speedKmh>=90&&speedKmh<=120)a.straightPaceSeconds+=dt;}
      const forward=s.v>1&&Math.cos(s.th-path.phi)>.5;a.routeArmed=a.routeArmed||path.progress>ENDURANCE_TRACK.lapLength*.7;
      if(a.routeArmed&&prev>ENDURANCE_TRACK.lapLength-6&&path.progress<6&&forward&&Math.abs(path.e)<7&&a.elapsed-a.lastLapAt>20){a.laps++;a.lapTimes.push(a.elapsed-a.lastLapAt);a.lastLapAt=a.elapsed;a.routeArmed=false;}a.lastProgress=path.progress;}
    if(a.mode==='circuit'){
      const theta=Math.atan2((s.y||0)/38,(s.x-80)/70),prev=previous.angle??theta;
      let delta=theta-prev;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;
      a.lastAngle=theta;
      const forward=s.v>1&&Math.cos(s.th)*(-70*Math.sin(theta))+Math.sin(s.th)*(38*Math.cos(theta))>0;
      if(delta>0&&forward&&Math.abs(s.e)<7){a.routeArmed=a.routeArmed||theta>-.4&&theta<.4;
        if(a.routeArmed&&prev<Math.PI-.12&&theta>=Math.PI-.12&&a.elapsed-a.lastLapAt>8){a.laps++;a.lapTimes.push(a.elapsed-a.lastLapAt);a.lastLapAt=a.elapsed;a.routeArmed=false;}}
    }
    return a;}

  function lapSpread(a){return a.lapTimes.length?Math.max(...a.lapTimes)-Math.min(...a.lapTimes):0;}
  function result(a,ok,slideSeconds){
    if(a.mode==='endurance'){
      const spread=lapSpread(a),score=Math.max(0,Math.round(4200-a.elapsed*14-spread*30-a.peakEngineHeat*300-a.criticalSeconds*100-slideSeconds*40-a.offLineSeconds*50+a.straightPaceSeconds*6));
      const pass=!!ok&&a.laps>=3&&a.lapTimes.length>=3&&a.elapsed<=145&&spread<=8&&slideSeconds<2&&a.straightPaceSeconds>=12&&a.peakEngineHeat<.95&&a.criticalSeconds<=3;
      return{pass,score,measure:`${a.laps}/3 laps · ${a.elapsed.toFixed(2)} s · laps ${a.lapTimes.map(x=>x.toFixed(1)).join(' / ')} s · spread ${spread.toFixed(1)} s · straight 90–120 ${a.straightPaceSeconds.toFixed(1)} s · peak ${Math.round(a.peakEngineHeat*100)}% · critical ${a.criticalSeconds.toFixed(1)} s · slide ${slideSeconds.toFixed(1)} s`};
    }
    const score=a.mode==='drift'?Math.max(0,Math.round(a.driftPoints-a.spinCount*100-a.offLineSeconds*50)):a.mode==='drag'?Math.max(0,Math.round(1500-a.elapsed*40+a.trapKmh*2-a.launchSpin*80-a.peakHeat*120-a.badShifts*30)):a.mode==='circuit'?Math.max(0,Math.round(1800-a.elapsed*15-Math.abs((a.lapTimes[0]||0)-(a.lapTimes[1]||0))*25-slideSeconds*80)):Math.max(0,Math.round(1200-a.elapsed*30-slideSeconds*120-a.offLineSeconds*60));
    const pass=!!ok&&(a.mode==='drag'?a.elapsed<=19&&a.trapKmh>=95:a.mode==='drift'?score>=150&&a.driftCurvePoints[0]>=50&&a.driftCurvePoints[1]>=50&&a.spinCount===0:a.mode==='circuit'?a.laps>=2&&a.elapsed<=90&&slideSeconds<2:a.elapsed<=20&&slideSeconds<.5);
    return{pass,score,measure:a.mode==='drag'?`${a.elapsed.toFixed(2)} s · trap ${Math.round(a.trapKmh)} km/h · gear ${a.gear} · shifts ${a.shifts} (${a.badShifts} early) · NOS ${a.nosUsed.toFixed(1)} s · launch slip ${a.launchSpin.toFixed(1)} s · heat ${Math.round(a.peakHeat*100)}%`:a.mode==='drift'?`${score} points · left ${Math.round(a.driftCurvePoints[0])} / right ${Math.round(a.driftCurvePoints[1])} · controlled ${a.driftSeconds.toFixed(1)} s · spins ${a.spinCount} · off line ${a.offLineSeconds.toFixed(1)} s`:a.mode==='circuit'?`${a.laps}/2 laps · ${a.elapsed.toFixed(2)} s · laps ${a.lapTimes.map(x=>x.toFixed(1)).join(' / ')} s · slide ${slideSeconds.toFixed(1)} s`:`${a.elapsed.toFixed(2)} s · slide ${slideSeconds.toFixed(1)} s · off line ${a.offLineSeconds.toFixed(1)} s`};
  }
  function live(a,s,telemetry){if(a.mode==='endurance'){const heat=telemetry?.heat||0,spread=lapSpread(a),pace=a.lapTimes.at(-1);return`${a.laps}/3 laps · ${a.elapsed.toFixed(1)}s · heat ${Math.round(heat*100)}% · ${heat>=.91?'critical: lift until power returns':telemetry?.overheat?'power low: keep cooling':heat>=.76?'hot: ease throttle, save NOS':heat>=.58?'warming: shorten throttle bursts':spread>6?'lap spread '+spread.toFixed(1)+'s: settle your pace':a.straightPaceSeconds<12?'hold 90–120 km/h on the straights; brake before the 100 m bend':pace?'last lap '+pace.toFixed(1)+'s: keep a steady line':'build pace, leave cooling room'}`;}if(a.mode==='drag')return`G${a.gear} · ${a.elapsed.toFixed(1)}s · ${Math.round(s.v*3.6)} km/h · tap Shift near the top of each band`;if(a.mode==='drift')return`${Math.round(a.driftPoints)} pts · ${s.zone<2?'left curve · target 38 km/h':s.zone===2?'recover · set up right curve':'right curve · target 38 km/h'}`;if(a.mode==='circuit')return`${a.laps}/2 laps · ${a.elapsed.toFixed(1)}s · brake for bends`;return`${a.elapsed.toFixed(1)}s · climb cleanly`;}
  function endurancePlan(){return'Kestrel + wide: light with extra tire grip. Cobalt + standard: steady. Aegis + endurance brakes: more bend grip, softer first bite. Build 90–120 km/h on each 220 m straight. Brake before the 100 m bend, then feed in throttle as you unwind the wheel. Lift when heat rises.';}
  root.KickLabRaceModes=Object.freeze({MODES,NEXT,DEFAULT,DRIFT_ROUTE,ENDURANCE_TRACK,endurancePoint,endurancePath,driftPath,driftPoints,coast,lightPhase,crossedFinish,speedTreatment,enabled,normalize,config,initial,observe,result,live,lapSpread,endurancePlan,gearEfficiency,shift,downshift,shiftWindow,shiftTiming,shiftDisplay,finisherReady,shiftTarget:gear=>GEAR_BANDS[gear-1]?.[1]??null});
})(typeof globalThis!=='undefined'?globalThis:window);
