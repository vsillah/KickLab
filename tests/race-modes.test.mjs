import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {raceContext,local} from './helpers/race-origin.mjs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const origin=vm.runInNewContext(read('src/shared/race-origin.js')+'\nglobalThis.KickLabRaceOrigin',raceContext(local('?raceExpansion=prototype')));
const context=raceContext(local('?raceExpansion=prototype'),{KickLabRaceOrigin:origin});
const modes=vm.runInNewContext(read('src/shared/race-modes.js')+'\nglobalThis.KickLabRaceModes',context);
const catalog=vm.runInNewContext(read('src/shared/race-vehicle-catalog.js')+'\nglobalThis.KickLabRaceVehicleCatalog',context);

test('expansion remains trusted and its roster seam uses stable IDs',()=>{
  assert.equal(modes.enabled(),true);
  assert.deepEqual(Object.keys(catalog.vehicles).sort(),['aegis','cobalt','kestrel','sable','vesper']);
  assert.equal(catalog.forGarageBody('street').id,'cobalt');
  assert.equal(modes.NEXT.available,true);
  const off=vm.runInNewContext(read('src/shared/race-modes.js')+'\nglobalThis.KickLabRaceModes.enabled()',raceContext(local(''),{KickLabRaceOrigin:origin}));
  assert.equal(off,false);
});

test('all modes have different measured pass rules and safe profile migration',()=>{
  assert.equal(modes.normalize({version:99,selected:'circuit'}).selected,'drag');
  assert.equal(modes.normalize({version:1,selected:'hill',best:{hill:230,drag:-5}}).best.hill,230);
  const drag={...modes.initial('drag'),elapsed:18,trapKmh:100};
  assert.equal(modes.result(drag,true,0).pass,true);
  assert.equal(modes.result({...drag,launchSpin:2},true,0).score<modes.result(drag,true,0).score,true);
  const shifted=modes.initial('drag');shifted.phase='run';
  assert.equal(modes.shift(shifted,1,55),true);
  assert.equal(shifted.badShifts,1);
  assert.equal(modes.gearEfficiency(shifted,1,55),0);
  shifted.shiftCooldown=0;
  assert.ok(modes.gearEfficiency(shifted,1,55)<modes.gearEfficiency(shifted,15,55));
  const drift={...modes.initial('drift'),driftPoints:500,driftCurvePoints:[250,250]};
  assert.equal(modes.result(drift,true,0).pass,true);
  assert.equal(modes.result({...drift,driftCurvePoints:[500,0]},true,0).pass,false);
  assert.equal(modes.result({...drift,spinCount:1},true,0).pass,false);
  const circuit={...modes.initial('circuit'),laps:2,elapsed:70,lapTimes:[34,36]};
  assert.equal(modes.result(circuit,true,0).pass,true);
  assert.equal(modes.result({...circuit,laps:1},true,0).pass,false);
  const hill={...modes.initial('hill'),elapsed:18};
  assert.equal(modes.result(hill,true,.1).pass,true);
  assert.equal(modes.result(hill,true,.7).pass,false);
});

test('simulator Drag paddles distinguish early, optimal, late, and missed shifts',()=>{
  const early=modes.initial('drag');early.phase='run';
  assert.equal(modes.shift(early,1,55,true),true);
  assert.equal(early.lastShift,'early');assert.equal(early.badShifts,1);assert.equal(modes.gearEfficiency(early,1,55),0);
  const optimal=modes.initial('drag');optimal.phase='run';
  assert.equal(modes.shift(optimal,55*.18,55,true),true);
  assert.equal(optimal.lastShift,'optimal');assert.equal(optimal.badShifts,0);
  const late=modes.initial('drag');late.phase='run';
  assert.equal(modes.shift(late,55*.21,55,true),true);
  assert.equal(late.lastShift,'late');assert.equal(late.badShifts,1);
  late.shiftCooldown=0;
  assert.equal(modes.downshift(late,55*.5,55),true);
  assert.equal(late.lastShift,'missed');assert.equal(late.badShifts,2);
});

test('every Drag upshift shows LOW, OPT and RED at the canonical scoring boundaries',()=>{
  const top=55;
  for(const gear of [1,2,3]){
    const band=modes.shiftWindow(gear);
    assert.equal(band.ideal,modes.shiftTarget(gear));
    for(const [ratio,phase,timing,bad] of [[band.low-.001,'LOW','early',1],[band.low,'OPT','optimal',0],[band.ideal,'OPT','optimal',0],[band.high,'OPT','optimal',0],[band.high+.001,'RED','late',1]]){
      const display=modes.shiftDisplay(gear,ratio*top,top),attempt=modes.initial('drag');attempt.phase='run';attempt.gear=gear;
      assert.equal(({early:'LOW',optimal:'OPT',late:'RED'})[display.timing],phase,`gear ${gear} ratio ${ratio}`);
      assert.equal(modes.shift(attempt,ratio*top,top,true),true);
      assert.equal(attempt.lastShift,timing,`gear ${gear} ratio ${ratio}`);
      assert.equal(attempt.badShifts,bad,`gear ${gear} ratio ${ratio}`);
      assert.ok(display.fraction>=0&&display.fraction<=1);
      assert.ok(display.target[0]<display.target[1]);
    }
    const lateLegacy=modes.initial('drag');lateLegacy.phase='run';lateLegacy.gear=gear;
    assert.equal(modes.shift(lateLegacy,(band.high+.001)*top,top,false),true);
    assert.equal(lateLegacy.lastShift,'optimal','non-strict legacy scoring stays unchanged');
  }
  assert.equal(modes.shiftWindow(4),null);
  assert.equal(modes.shiftDisplay(4,top,top),null);
  const topGear=modes.initial('drag');topGear.phase='run';topGear.gear=4;
  assert.equal(modes.shift(topGear,top,top,true),false);
});

test('Drift route has an acceleration lead-in, two opposite curves, and recovery room',()=>{
  const route=modes.DRIFT_ROUTE,points=modes.driftPoints();
  assert.ok(route.leadEnd>=80);
  assert.ok(route.recoveryEnd-route.recoveryStart>=60);
  assert.ok(route.finishX>route.exitX+50);
  assert.ok(route.roadEndX-route.finishX>=180,'road continues visibly past scored finish');
  for(const [x,y,zone,curvature] of [[60,0,0,0],[110,8,1,1],[118,60,2,0],[126,112,3,-1],[200,120,4,0]]){
    const p=modes.driftPath(x,y);
    assert.equal(p.zone,zone,`zone at ${x},${y}`);
    assert.ok(Math.abs(p.e)<7,`on pavement at ${x},${y}`);
    assert.equal(Math.sign(p.kp),curvature);
  }
  assert.ok(points.length>100);
  assert.equal(points.at(-1).z,route.exitY);
});

test('start lights and finish crossings have deterministic order and direction',()=>{
  assert.deepEqual([2.4,1.6,1.5,.8,.7,0].map(modes.lightPhase),['red','yellow','yellow','green','green','go']);
  const drag=modes.config('drag'),drift=modes.config('drift');
  assert.equal(modes.crossedFinish(drag,{x:239},{x:240.1,e:0}),true);
  assert.equal(modes.crossedFinish(drag,{x:241},{x:242,e:0}),false);
  assert.equal(modes.crossedFinish(drift,{x:214},{x:215.1,e:0,zone:4}),true);
  assert.equal(modes.crossedFinish(drift,{x:214},{x:215.1,e:0,zone:3}),false);
  assert.equal(modes.crossedFinish(drift,{x:216},{x:217,e:0,zone:4}),false);
});

test('Drag speed treatment is bounded and honors reduced motion',()=>{
  const idle=modes.speedTreatment(0,55,false),fast=modes.speedTreatment(55,55,false),reduced=modes.speedTreatment(55,55,true);
  assert.equal(idle.intensity,0);
  assert.equal(fast.intensity,1);
  assert.ok(fast.fieldOfView>idle.fieldOfView&&fast.fieldOfView<=60);
  assert.ok(fast.cameraVibration>0&&fast.cameraVibration<=.035);
  assert.ok(fast.streakOpacity>0&&fast.streakOpacity<=.28);
  assert.equal(reduced.fieldOfView,55);
  assert.equal(reduced.cameraVibration,0);
  assert.equal(reduced.streakOpacity,0);
});

test('Drag trap and result coast remain on paved centerline',()=>{
  const a=modes.initial('drag'),s={x:240,y:0.3,v:35,e:-0.3};
  for(let i=0;i<500;i++){
    s.v=Math.max(0,s.v-6*.02);
    modes.coast(a,s,.02);
    assert.ok(s.x>=240&&s.x<=390);
    assert.ok(Math.abs(s.y)<7);
    assert.ok(Math.abs(s.e)<7);
  }
  assert.ok(Math.abs(s.y)<.01);
});

test('Endurance capsule has 100 m bends and counts only armed forward paved crossings',()=>{
  const track=modes.ENDURANCE_TRACK;assert.equal(track.radius,100);assert.ok(track.lapLength>1000);
  for(const d of [0,55,110,200,500,700,1000,track.lapLength-2]){const point=modes.endurancePoint(d),path=modes.endurancePath(point.x,point.y);assert.ok(Math.abs(path.e)<.01,`centerline at ${d}`);}
  const a=modes.initial('endurance');a.phase='run';a.elapsed=44;a.routeArmed=true;
  const point=(d,offset=0,reverse=false)=>{const p=modes.endurancePoint(d);return{x:p.x+p.ty*offset,y:p.y-p.tx*offset,e:offset,v:30,th:Math.atan2(p.ty,p.tx)+(reverse?Math.PI:0)};};
  const before=point(track.lapLength-2),after=point(2);
  modes.observe(a,point(2,8),before,.02,{gas:1,heat:.62},{});assert.equal(a.laps,0,'off-road crossing does not count');
  a.lastProgress=track.lapLength-2;a.routeArmed=true;modes.observe(a,point(2,0,true),before,.02,{gas:1,heat:.62},{});assert.equal(a.laps,0,'reverse crossing does not count');
  a.lastProgress=track.lapLength-2;a.routeArmed=true;modes.observe(a,after,before,.02,{gas:1,heat:.62},{});assert.equal(a.laps,1);
  const s=point(2);for(let i=0;i<120;i++){s.v=Math.max(0,s.v-.12);modes.coast(a,s,.02);assert.ok(Math.abs(modes.endurancePath(s.x,s.y).e)<.01);}
  assert.ok(s.y<0,'coast follows the first straight after the line');
});

test('Endurance score uses completed lap time, spread and actual heat exposure',()=>{
  const a={...modes.initial('endurance'),laps:3,elapsed:143,lapTimes:[49,47,47],straightPaceSeconds:25,peakStraightKmh:115,peakEngineHeat:.82,criticalSeconds:0};
  const clean=modes.result(a,true,0);
  assert.equal(clean.pass,true);
  for(const changed of [{laps:2},{elapsed:146},{lapTimes:[43,47,53]},{straightPaceSeconds:11},{peakEngineHeat:.96},{criticalSeconds:3.1}])assert.equal(modes.result({...a,...changed},true,0).pass,false);
  assert.equal(modes.result(a,true,2.1).pass,false);
  assert.equal(modes.result(a,false,0).pass,false);
  assert.ok(modes.result({...a,criticalSeconds:2},true,0).score<clean.score);
  assert.ok(modes.result({...a,lapTimes:[43,47,53]},true,0).score<clean.score);
});

test('canonical physics can finish each route without a vehicle lock',()=>{
  const physics=raceContext(local('?raceExpansion=prototype'));
  for(const path of ['src/shared/race-garage.js','src/shared/race-progression.js','src/shared/race-modes.js','src/game/19-race-systems.js'])vm.runInNewContext(read(path),physics);
  const systems=vm.runInNewContext('RACE_SYSTEMS',physics),garage=physics.KickLabRaceGarage,modeApi=physics.KickLabRaceModes;
  for(const id of ['drag','drift','circuit','hill']){
    const mode=modeApi.config(id),P=garage.parameters({L:120,R:32,m:1400,F:8500,top:55,mu:.9,tireMu:.9,Lwb:2.7,ratio:15,expansionCourse:mode.course,progressionGrade:id==='hill',progressionHeat:true},garage.DEFAULT),s={x:id==='circuit'?10:4,y:0,th:id==='circuit'?-Math.PI/2:0,v:0,t:0,...systems.initial()},a=modeApi.initial(id);a.phase='run';let finished=false;
    for(let i=0;i<6000;i++){
      const before={x:s.x,y:s.y,angle:a.lastAngle,mode:s.driftMode},limit=id==='drag'?50:id==='drift'?10.5:id==='hill'?15:12,input={gas:s.v<limit?1:0,brake:s.v>limit+1?1:0,auto:true,wheel:0,drift:id==='drift'&&(s.zone===1||s.zone===3)};
      if(id==='drag'){
        if(a.gear===1&&s.v>=P.top*.25||a.gear===2&&s.v>=P.top*.47||a.gear===3&&s.v>=P.top*.7)modeApi.shift(a,s.v,P.top);
        input.gas*=modeApi.gearEfficiency(a,s.v,P.top);
      }
      systems.step(s,P,input,.02,systems.venue('highland'));modeApi.observe(a,s,before,.02,input,P);
      assert.ok(Math.abs(s.e)<7,`${id} off course at ${s.t.toFixed(1)} s`);
      finished=id==='drag'?s.x>=mode.distance:id==='circuit'?a.laps>=2:id==='drift'?s.zone===4&&s.x>=modeApi.DRIFT_ROUTE.finishX:s.zone===2&&s.y>=72;
      if(finished)break;
    }
    assert.ok(finished,`${id} did not finish`);
    assert.ok(modeApi.result(a,true,0).pass,`${id} controlled run should pass: ${JSON.stringify({score:modeApi.result(a,true,0).score,curves:a.driftCurvePoints,spins:a.spinCount,elapsed:a.elapsed,zone:s.zone})}`);
  }
});

test('each roster car sustains 90–120 km/h straights and recovers through the 100 m bends',()=>{
  const physics=raceContext(local('?raceExpansion=prototype'));
  for(const path of ['src/shared/race-garage.js','src/shared/race-vehicle-catalog.js','src/shared/race-modes.js','src/game/19-race-systems.js','src/game/19a-race-telemetry.js'])vm.runInNewContext(read(path),physics);
  const systems=vm.runInNewContext('RACE_SYSTEMS',physics),telemetry=vm.runInNewContext('RACE_TELEMETRY',physics),garage=physics.KickLabRaceGarage,vehicles=physics.KickLabRaceVehicleCatalog,api=physics.KickLabRaceModes;
  for(const [id,tires] of [['kestrel','wide'],['cobalt','balanced'],['aegis','balanced'],['vesper','wide'],['sable','balanced']]){
    const car=vehicles.get(id),build={...garage.DEFAULT,body:car.legacyBodyId,tires},track=api.ENDURANCE_TRACK,P=garage.parameters({L:120,R:track.radius,m:car.massKg,F:car.driveForceN,top:car.topMps,mu:.9*car.grip,tireMu:.9*car.grip,Lwb:car.wheels.wheelbaseM,ratio:15,expansionCourse:'oval',enduranceCourse:true,progressionHeat:true},build);
    Object.assign(P,{garageStock:false,rolling:P.rolling*car.rollingLoss,stability:P.stability*car.steeringResponse,response:P.response*car.steeringResponse,recovery:P.recovery*car.slideRecovery,brakeHeat:P.brakeHeat*car.brakeHeat,brakeRecovery:car.brakeRecovery,tireHeat:P.tireHeat*(car.tireHeat||1),downforce:car.downforce,engineHeatLoad:1.05*(car.engineHeatLoad||1)});
    const s={x:10,y:0,th:-Math.PI/2,v:0,t:0,...systems.initial()},a=api.initial('endurance'),t=telemetry.initial(),crossingHeat=[];a.phase='run';let previousLaps=0,slideSeconds=0;
    for(let i=0;i<9000&&a.laps<3;i++){
      const path=api.endurancePath(s.x,s.y),arc=Math.PI*track.radius,boundary=path.progress<track.halfStraight?track.halfStraight:path.progress<track.halfStraight+arc+track.straight?track.halfStraight+arc+track.straight:track.lapLength+track.halfStraight,exit=path.progress>=track.halfStraight+arc&&path.progress<track.halfStraight+arc+track.straight?path.progress-(track.halfStraight+arc):path.progress>=track.halfStraight+arc+track.straight+arc?path.progress-(track.halfStraight+arc+track.straight+arc):Infinity,cornering=path.zone==='bend'||boundary-path.progress<55||exit<35,target=cornering?27:32;
      const before={x:s.x,y:s.y,mode:s.driftMode},heatBefore=t.heat,gas=s.v<target-.2&&t.heat<.8?(cornering?.42:1):0,brake=s.v>target+.3?1:0;
      systems.step(s,P,{gas:gas*telemetry.powerFactor(t),brake,auto:true},.02,systems.venue('highland'));
      telemetry.step(t,s,{gas,brake,nitro:false},P,.02);api.observe(a,s,before,.02,{gas,heat:t.heat},P);
      if(s.slide)slideSeconds+=.02;
      assert.ok(Math.abs(s.e)<7,`${id} left pavement at ${a.elapsed.toFixed(1)} s`);
      if(a.laps>previousLaps){crossingHeat.push(t.heat);assert.ok(Math.abs(t.heat-heatBefore)<.02,`${id} heat jumped at crossing`);previousLaps=a.laps;}
    }
    assert.equal(a.laps,3,`${id} did not finish`);
    assert.equal(a.lapTimes.length,3);
    assert.equal(api.result(a,true,slideSeconds).pass,true,`${id} controlled strategy did not pass`);
    assert.ok(a.peakStraightKmh>=108&&a.peakStraightKmh<=120&&a.straightPaceSeconds>=30,`${id} straight speed was not sustained`);
    assert.ok(slideSeconds<.1,`${id} did not recover cleanly from the bends`);
    assert.equal(crossingHeat.length,3);
    assert.ok(a.peakEngineHeat>=Math.max(...crossingHeat));
  }
});
