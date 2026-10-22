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
  assert.deepEqual(Object.keys(catalog.vehicles),['kestrel','cobalt','aegis']);
  assert.equal(catalog.forGarageBody('street').id,'cobalt');
  assert.equal(modes.NEXT.available,false);
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
  const drift={...modes.initial('drift'),driftPoints:500};
  assert.equal(modes.result(drift,true,0).pass,true);
  assert.equal(modes.result({...drift,spinCount:1},true,0).pass,false);
  const circuit={...modes.initial('circuit'),laps:2,elapsed:70,lapTimes:[34,36]};
  assert.equal(modes.result(circuit,true,0).pass,true);
  assert.equal(modes.result({...circuit,laps:1},true,0).pass,false);
  const hill={...modes.initial('hill'),elapsed:18};
  assert.equal(modes.result(hill,true,.1).pass,true);
  assert.equal(modes.result(hill,true,.7).pass,false);
});

test('canonical physics can finish each route without a vehicle lock',()=>{
  const physics=raceContext(local('?raceExpansion=prototype'));
  for(const path of ['src/shared/race-garage.js','src/shared/race-progression.js','src/shared/race-modes.js','src/game/19-race-systems.js'])vm.runInNewContext(read(path),physics);
  const systems=vm.runInNewContext('RACE_SYSTEMS',physics),garage=physics.KickLabRaceGarage,modeApi=physics.KickLabRaceModes;
  for(const id of ['drag','drift','circuit','hill']){
    const mode=modeApi.config(id),P=garage.parameters({L:120,R:32,m:1400,F:8500,top:55,mu:.9,tireMu:.9,Lwb:2.7,ratio:15,expansionCourse:mode.course,progressionGrade:id==='hill',progressionHeat:true},garage.DEFAULT),s={x:id==='circuit'?10:4,y:0,th:id==='circuit'?-Math.PI/2:0,v:0,t:0,...systems.initial()},a=modeApi.initial(id);a.phase='run';let finished=false;
    for(let i=0;i<6000;i++){
      const before={x:s.x,y:s.y,angle:a.lastAngle,mode:s.driftMode},limit=id==='drag'?50:id==='drift'?13:id==='hill'?15:12,input={gas:s.v<limit?1:0,brake:s.v>limit+1?1:0,auto:true,wheel:0,drift:id==='drift'&&s.zone===1};
      if(id==='drag'){
        if(a.gear===1&&s.v>=P.top*.25||a.gear===2&&s.v>=P.top*.47||a.gear===3&&s.v>=P.top*.7)modeApi.shift(a,s.v,P.top);
        input.gas*=modeApi.gearEfficiency(a,s.v,P.top);
      }
      systems.step(s,P,input,.02,systems.venue('highland'));modeApi.observe(a,s,before,.02,input,P);
      assert.ok(Math.abs(s.e)<7,`${id} off course at ${s.t.toFixed(1)} s`);
      finished=id==='drag'?s.x>=mode.distance:id==='circuit'?a.laps>=2:s.zone===2&&s.y>=72;
      if(finished)break;
    }
    assert.ok(finished,`${id} did not finish`);
    assert.ok(modeApi.result(a,true,0).pass,`${id} controlled run should pass`);
  }
});
