(function installRaceDriverNavigation(root){
  'use strict';
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const mod=(n,m)=>((n%m)+m)%m;
  function route(raw,closed){
    const points=raw.map(p=>({x:p.x,y:p.z??p.y,tx:p.tx,ty:p.tz??p.ty}));
    const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
    const total=lengths.at(-1)||1;
    function at(distance){const d=closed?mod(distance,total):clamp(distance,0,total);let lo=0,hi=lengths.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(lengths[mid]<d)lo=mid;else hi=mid;}const span=Math.max(.001,lengths[hi]-lengths[lo]),f=clamp((d-lengths[lo])/span,0,1),a=points[lo],b=points[hi];return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,tx:a.tx+(b.tx-a.tx)*f,ty:a.ty+(b.ty-a.ty)*f};}
    function nearest(x,y){let best={distance:Infinity,progress:0};for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy||1,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/den,0,1),px=a.x+t*dx,py=a.y+t*dy,distance=(px-x)**2+(py-y)**2;if(distance<best.distance)best={distance,progress:lengths[i]+t*(lengths[i+1]-lengths[i]),x:px,y:py};}return best;}
    function curvature(distance){const a=at(distance-4),b=at(distance+4),cross=a.tx*b.ty-a.ty*b.tx,dot=a.tx*b.tx+a.ty*b.ty;return Math.atan2(cross,dot)/8;}
    return{points,lengths,total,closed,at,nearest,curvature};
  }
  function plan({route:r,state:s,parameters:P,mode,grip,heat=0,brakeFactor=1,telemetry,input={},attempt,previousStage}){
    const here=r.nearest(s.x,s.y),progress=here.progress,speed=Math.max(0,s.v||0),isDrag=mode==='drag',isDrift=mode==='drift',origin=r.closed?0:r.nearest(4,0).progress,routeFraction=clamp((progress-origin)/Math.max(1,r.total-origin),0,1);
    if(isDrag){const finish=Math.max(0,(attempt?.distance||240)-s.x),shift=root.KickLabRaceModes?.shiftDisplay(attempt?.gear||1,speed,P.top),stage=finish<Math.max(20,speed*2)?'finish':shift?.timing==='optimal'?'shift':'prepare';return{stage,detail:stage==='finish'?`Finish in ${Math.round(finish)} metres.`:stage==='shift'?`Gear ${attempt?.gear||1}: shift in the bright band.`:'Build speed and watch the shift band.',progress:clamp(s.x/Math.max(1,attempt?.distance||240),0,1),lap:1,laps:1,heading:s.th||0,car:{x:s.x,y:s.y},markers:{},turn:'none',severity:'none',targetSpeed:0,brakeDistance:0,distance:finish,route:r};}
    const lookahead=mode==='circuit'?115:160,step=3;
    let apex=null,segment=null,segments=[];
    for(let d=-220;d<=lookahead+210;d+=step){if(!r.closed&&(progress+d<4||progress+d>r.total-4))continue;const k=r.curvature(progress+d),strength=Math.abs(k),curved=strength>.004;
      if(curved){if(!segment)segment={start:progress+d,end:progress+d,k,strength};else{segment.end=progress+d;if(strength>segment.strength+.0005){segment.k=k;segment.strength=strength;}}}
      else if(segment){segments.push(segment);segment=null;}}
    if(segment)segments.push(segment);
    const selected=segments.find(item=>item.end>=progress-30&&item.start<=progress+lookahead);
    if(selected&&mode!=='circuit'){const constant=selected.end-selected.start>14;const apexDistance=constant?(selected.start+selected.end)/2:selected.start;
      apex={distance:apexDistance,entry:Math.max(0,selected.start),offset:apexDistance-progress,entryOffset:Math.max(0,selected.start-progress),strength:selected.strength,k:selected.k};}
    if(!apex&&mode==='circuit')for(let d=0;d<=lookahead;d+=step){const k=r.curvature(progress+d),strength=Math.abs(k);if(!apex||strength>apex.strength+.0005)apex={distance:progress+d,entry:progress+d-22,offset:d,entryOffset:d-22,strength,k};}
    if(!apex){const remaining=Math.max(0,r.total-progress);return{stage:'accelerate',detail:`${Math.round(remaining)} metres to the finish.`,progress:routeFraction,routeProgress:progress,lap:1,laps:1,heading:s.th||0,car:{x:s.x,y:s.y},markers:{},turn:'none',severity:'none',targetSpeed:P.top,brakeDistance:0,distance:remaining,route:r};}
    // Use the live tire surface grip and current Garage brake fade. Heat also reduces the
    // margin for a repeated stop, without changing any simulation parameter.
    const effectiveGrip=clamp(Number(grip)||P.mu,.15,2),radius=1/Math.max(.001,apex.strength),limit=Math.sqrt(effectiveGrip*9.81*radius),targetSpeed=Math.min(P.top,limit*(isDrift?.72:mode==='hill'?.8:.83));
    const thermalMargin=1+Math.max(0,heat-.58)*.25,slip=Math.abs(s.slipAngle||0),understeer=Math.abs(s.kc||0)-Math.abs(s.k||0)>.007&&Math.abs(s.e||0)>2.5&&speed>targetSpeed*1.05,oversteer=slip>.2||s.driftMode==='skid',recovery=understeer||oversteer||Math.abs(s.e||0)>6;
    const decel=Math.max(.7,.95*effectiveGrip*9.81*clamp(brakeFactor,.5,1.5));
    const brakeDistance=Math.max(0,(speed*speed-targetSpeed*targetSpeed)/(2*decel))*thermalMargin;
    const turnIn=Math.max(5,Math.min(22,speed*(.32/(P.response*P.stability*P.turnIn||1))));
    const distance=apex.offset,entryDistance=apex.entryOffset,brakeAt=apex.entry-brakeDistance-turnIn-3,turnAt=apex.entry-turnIn,exitAt=apex.distance+Math.max(12,speed*.55);
    const angleError=Math.atan2(Math.sin(Math.atan2(r.at(progress+3).ty,r.at(progress+3).tx)-(s.th||0)),Math.cos(Math.atan2(r.at(progress+3).ty,r.at(progress+3).tx)-(s.th||0)));
    const missed=distance<8&&speed>targetSpeed*1.15||Math.abs(s.e||0)>5.5;
    const needsBrake=speed>targetSpeed*(previousStage==='brake'?.99:1.06),brakeWindow=brakeDistance+turnIn+3+(previousStage==='brake'?12:0);
    let stage='prepare';if(recovery)stage='recover';else if(distance<-8)stage=Math.abs(angleError)<.2&&slip<.13&&speed<=targetSpeed*1.08?'accelerate':'turn';else if(Math.abs(distance)<=8)stage=missed?'brake':'apex';else if(entryDistance<=turnIn+3)stage=needsBrake?'brake':'turn';else if(entryDistance<=brakeWindow&&needsBrake)stage='brake';
    // Hold the apex cue through its short window. Acceleration is offered only after
    // the apex, when heading, slip, and speed agree with the route.
    const turn=apex.k>=0?'left':'right',severity=radius<35?'sharp':radius<75?'medium':'gentle';
    const details={prepare:`${severity} ${turn} turn in ${Math.round(distance)} metres. Target ${Math.round(targetSpeed*3.6)} kilometres per hour.`,brake:`Brake for the ${turn} turn. ${Math.round(distance)} metres to apex; target ${Math.round(targetSpeed*3.6)} kilometres per hour.`,turn:`Turn ${turn} toward the apex. Keep below ${Math.round(targetSpeed*3.6)} kilometres per hour.`,apex:missed?'Apex missed. Settle the car before accelerating.':`At the ${turn} apex. Unwind the wheel before accelerating.`,accelerate:'Exit aligned. Feed in power as grip returns.',recover:oversteer?'Rear sliding. Lift and countersteer gently until grip returns.':understeer?'Front pushing wide. Ease steering and speed to recover grip.':'Off line. Ease steering and throttle until the car settles.'};
    return{stage,detail:details[stage],progress:routeFraction,routeProgress:progress,lap:Math.min((attempt?.laps||0)+1,mode==='endurance'?3:mode==='circuit'?2:1),laps:mode==='endurance'?3:mode==='circuit'?2:1,heading:s.th||0,car:{x:s.x,y:s.y},markers:{brake:r.at(brakeAt),turn:r.at(turnAt),apex:r.at(apex.distance),exit:r.at(exitAt)},turn,severity,targetSpeed,brakeDistance,distance,radius,grip:effectiveGrip,slip,route:r};
  }
  root.KickLabRaceDriverNavigation=Object.freeze({route,plan});
})(typeof globalThis!=='undefined'?globalThis:window);
