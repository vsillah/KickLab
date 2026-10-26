import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {raceContext,local} from './helpers/race-origin.mjs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const context=raceContext(local('?raceExpansion=prototype'));
for(const path of ['src/shared/race-origin.js','src/shared/race-garage.js','src/shared/race-vehicle-catalog.js','src/shared/race-modes.js','src/game/19-race-systems.js','src/game/19a-race-telemetry.js'])vm.runInNewContext(read(path),context);
const garage=context.KickLabRaceGarage,vehicles=context.KickLabRaceVehicleCatalog,modes=context.KickLabRaceModes;
const systems=vm.runInNewContext('RACE_SYSTEMS',context),telemetry=vm.runInNewContext('RACE_TELEMETRY',context);

function run({carId,coach=false,timing='optimal',nos=false,hot=false}){
  const car=vehicles.get(carId),build=coach?{...garage.DEFAULT,body:car.legacyBodyId,tires:'wide',suspension:carId==='kestrel'?'firm':'balanced'}:{...garage.DEFAULT,body:car.legacyBodyId};
  const P=garage.parameters({L:120,R:32,m:car.massKg,F:car.driveForceN,top:car.topMps,mu:.9*car.grip,tireMu:.9*car.grip,Lwb:car.wheels.wheelbaseM,ratio:15},build);
  Object.assign(P,{expansionCourse:'straight',garageStock:false,progressionHeat:true,rolling:P.rolling*car.rollingLoss,stability:P.stability*car.steeringResponse,response:P.response*car.steeringResponse,recovery:P.recovery*car.slideRecovery,brakeHeat:P.brakeHeat*car.brakeHeat,brakeRecovery:car.brakeRecovery,downforce:car.downforce});
  const s={x:4,y:0,th:0,v:0,t:0,...systems.initial()},a=modes.initial('drag'),t=telemetry.initial(),events=[];
  a.phase='run';if(hot)t.heat=.72;
  let usedNos=false,blockedFinisher=false,readyFinisher=false;
  for(let i=0;i<1800&&s.x<240;i++){
    const before={x:s.x,y:s.y,mode:s.driftMode},window=modes.shiftWindow(a.gear),ratio=s.v/P.top;
    if(window&&a.shiftCooldown<=0&&ratio>=(timing==='early'?window.low-.012:timing==='late'?window.high+.008:window.ideal)){
      assert.equal(modes.shift(a,s.v,P.top,true),true);
      events.push({gear:a.gear,timing:a.lastShift,x:s.x,v:s.v,heat:t.heat});
    }
    if(nos&&!usedNos&&s.x>=55){usedNos=telemetry.activateNos(t,.25);}
    if(a.gear===3&&ratio<=modes.shiftWindow(3).high)blockedFinisher ||= !modes.finisherReady(a,s.v,P.top);
    if(a.gear===4)readyFinisher ||= modes.finisherReady(a,s.v,P.top);
    const gas=1,driveGas=gas*telemetry.powerFactor(t)*modes.gearEfficiency(a,s.v,P.top),boost=t.nosPulse>0&&!t.overheat;
    systems.step(s,P,{gas:driveGas,brake:0,wheel:0,auto:true,nitro:boost},.02,systems.venue('highland'));
    telemetry.step(t,s,{gas,brake:0,nitro:boost},P,.02);
    modes.observe(a,s,before,.02,{gas,heat:t.heat},P);
  }
  return{P,s,a,t,events,usedNos,blockedFinisher,readyFinisher};
}

test('stock and Coach Drag builds traverse LOW, OPT and RED in each gear before the 240 m trap',()=>{
  for(const carId of ['kestrel','cobalt','aegis'])for(const coach of [false,true])for(const timing of ['early','optimal','late']){
    const result=run({carId,coach,timing}),label=`${carId} ${coach?'Coach':'stock'} ${timing}`;
    assert.equal(result.events.length,3,`${label}: missing shift at ${result.s.x.toFixed(1)} m`);
    assert.deepEqual(result.events.map(event=>event.timing),[timing,timing,timing],label);
    assert.ok(result.events[2].x<210,`${label}: final shift needs approach room`);
    assert.ok(result.blockedFinisher&&result.readyFinisher,`${label}: finisher handoff`);
    assert.ok(result.s.x>=240,`${label}: finish`);
    assert.ok(result.a.trapKmh>0&&Number.isFinite(modes.result(result.a,true,0).score),`${label}: result remains measurable`);
  }
});

test('NOS and thermal power loss keep all three shifts attainable without automatic shifting',()=>{
  for(const carId of ['kestrel','cobalt','aegis'])for(const coach of [false,true])for(const condition of [{nos:true,hot:false},{nos:false,hot:true},{nos:true,hot:true}]){
    const result=run({carId,coach,...condition}),label=`${carId} ${coach?'Coach':'stock'} ${JSON.stringify(condition)}`;
    assert.equal(result.events.length,3,label);
    assert.deepEqual(result.events.map(event=>event.timing),['optimal','optimal','optimal'],label);
    assert.ok(result.events[2].x<210,`${label}: final shift needs approach room`);
    assert.ok(result.t.heat>=.91,`${label}: thermal power loss exercised`);
    if(condition.nos&&!condition.hot)assert.ok(result.usedNos&&result.a.nosUsed>0,`${label}: NOS delivered`);
    if(condition.nos&&condition.hot)assert.equal(result.usedNos,false,`${label}: overheated NOS blocked`);
  }
});

test('finisher remains secondary until the final shift is completed or its RED band passes',()=>{
  const top=55,window=modes.shiftWindow(3),a=modes.initial('drag');a.phase='run';
  for(const gear of [1,2]){a.gear=gear;assert.equal(modes.finisherReady(a,window.high*top+2,top),false);}
  a.gear=3;assert.equal(modes.finisherReady(a,window.high*top,top),false);
  assert.equal(modes.finisherReady(a,(window.high+.001)*top,top),true);
  a.gear=4;assert.equal(modes.finisherReady(a,window.low*top,top),true);
  assert.equal(modes.finisherReady(modes.initial('hill'),0,top),true);
});
