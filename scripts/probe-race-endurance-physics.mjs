import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {raceContext,local} from '../tests/helpers/race-origin.mjs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const context=raceContext(local('?raceExpansion=prototype'));
for(const path of ['src/shared/race-origin.js','src/shared/race-garage.js','src/shared/race-vehicle-catalog.js','src/shared/race-modes.js','src/game/19-race-systems.js','src/game/19a-race-telemetry.js'])vm.runInNewContext(read(path),context);
const systems=vm.runInNewContext('RACE_SYSTEMS',context),telemetry=vm.runInNewContext('RACE_TELEMETRY',context),garage=context.KickLabRaceGarage,vehicles=context.KickLabRaceVehicleCatalog,modes=context.KickLabRaceModes,track=modes.ENDURANCE_TRACK;
const straightSpeed=Number(process.env.STRAIGHT_MPS||32),bendSpeed=Number(process.env.BEND_MPS||27),brakeDistance=Number(process.env.BRAKE_METERS||55);
const rows=[];
for(const [id,tires] of [['kestrel','wide'],['cobalt','balanced'],['aegis','balanced']]){
  const car=vehicles.get(id),build={...garage.DEFAULT,body:car.legacyBodyId,tires},P=garage.parameters({L:120,R:track.radius,m:car.massKg,F:car.driveForceN,top:car.topMps,mu:.9*car.grip,tireMu:.9*car.grip,Lwb:car.wheels.wheelbaseM,ratio:15,expansionCourse:'oval',enduranceCourse:true,progressionHeat:true},build);
  Object.assign(P,{garageStock:false,rolling:P.rolling*car.rollingLoss,stability:P.stability*car.steeringResponse,response:P.response*car.steeringResponse,recovery:P.recovery*car.slideRecovery,brakeHeat:P.brakeHeat*car.brakeHeat,brakeRecovery:car.brakeRecovery,downforce:car.downforce,engineHeatLoad:1.05});
  const s={x:track.left,y:0,th:-Math.PI/2,v:0,t:0,...systems.initial()},attempt=modes.initial('endurance'),engine=telemetry.initial();attempt.phase='run';let maxError=0,slides=0,maxSpeed=0,bendMin=Infinity,bendMax=0,firstSlide=null;
  for(let i=0;i<10000&&attempt.laps<3;i++){
    const p=modes.endurancePath(s.x,s.y),arc=Math.PI*track.radius,boundary=p.progress<track.halfStraight?track.halfStraight:p.progress<track.halfStraight+arc+track.straight?track.halfStraight+arc+track.straight:track.lapLength+track.halfStraight,distance=boundary-p.progress;
    const arcStart=track.halfStraight+arc,topExit=arcStart+track.straight+arc,exitDistance=p.progress>=arcStart&&p.progress<arcStart+track.straight?p.progress-arcStart:p.progress>=topExit?p.progress-topExit:Infinity,cornering=p.zone==='bend'||distance<brakeDistance||exitDistance<35,target=cornering?bendSpeed:straightSpeed,gas=s.v<target-.2&&engine.heat<.8?(cornering?.42:1):0,brake=s.v>target+.3?1:0,before={x:s.x,y:s.y,mode:s.driftMode};
    systems.step(s,P,{gas:gas*telemetry.powerFactor(engine),brake,auto:true},.02,systems.venue('highland'));
    telemetry.step(engine,s,{gas,brake,nitro:false},P,.02);modes.observe(attempt,s,before,.02,{gas,heat:engine.heat},P);
    maxError=Math.max(maxError,Math.abs(s.e));maxSpeed=Math.max(maxSpeed,s.v*3.6);if(s.slide){slides+=.02;if(!firstSlide)firstSlide={time:s.t,speed:s.v*3.6,progress:p.progress,zone:p.zone,error:s.e,need:s.need,muEffective:s.muEffective,wheel:s.wheel,gas,brake};}if(p.zone==='bend'){bendMin=Math.min(bendMin,s.v*3.6);bendMax=Math.max(bendMax,s.v*3.6);}
    if(maxError>8)break;
  }
  rows.push({id,tires,elapsed:attempt.elapsed,laps:attempt.laps,lapTimes:attempt.lapTimes,straightPaceSeconds:attempt.straightPaceSeconds,peakStraightKmh:attempt.peakStraightKmh,peakHeat:attempt.peakEngineHeat,criticalSeconds:attempt.criticalSeconds,maxError,maxSpeed,bendMin,bendMax,slides,firstSlide,pass:modes.result(attempt,maxError<=7,slides).pass});
}
console.log(JSON.stringify({track,strategy:{straightSpeed,bendSpeed,brakeDistance},rows},null,2));
if(rows.some(row=>!row.pass))process.exitCode=1;
