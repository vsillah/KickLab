import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import vm from 'node:vm';
import {local,pages,raceContext} from './helpers/race-origin.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFileSync(join(root,file),'utf8');
const garage=vm.runInNewContext(read('src/shared/race-garage.js')+'\nglobalThis.KickLabRaceGarage');
const progression=vm.runInNewContext(read('src/shared/race-progression.js')+'\nglobalThis.KickLabRaceProgression',raceContext(local('?raceProgression=prototype')));
const systems=vm.runInNewContext(read('src/game/19-race-systems.js')+'\nRACE_SYSTEMS',raceContext(local('?raceProgression=prototype'),{KickLabRaceGarage:garage,KickLabRaceProgression:progression}));
const cars={kart:{m:160,F:2200,top:30,Lwb:1.05},street:{m:1400,F:8500,top:55,Lwb:2.7},race:{m:760,F:11000,top:80,Lwb:2.9}};
const build=(body='street',suspension='balanced',tires='balanced',brakes='standard')=>({version:1,body,suspension,tires,brakes});

// This driver holds full throttle on the straight, brakes to 80% of the computed
// corner limit, then coasts through the bend. Forest keeps coasting to the line.
function heat(level,selection,carry={brakeHeat:0,tireHeat:0}){
  const car=cars[selection.body],venue=systems.venue(level.venue),P=garage.parameters({L:120,R:level.radius,m:car.m,F:car.F,top:car.top,mu:level.grip*venue.baseGrip*venue.gripZones[1].multiplier,tireMu:level.grip,Lwb:car.Lwb,ratio:15},selection);
  P.garageStock=false;P.progressionGrade=true;P.progressionHeat=true;
  const state={x:4,y:0,th:0,v:0,t:0,garageBrakeHeat:carry.brakeHeat,garageTireHeat:carry.tireHeat,...systems.initial()};
  let entryKmh=0,slideT=0,brakeFactor=Infinity,brakeHeat=0,tireHeat=0,ok=false;
  for(let i=0;i<10000;i++){
    const path=systems.path(state.x,state.y,P,venue),limit=Math.sqrt(P.mu*9.81*P.R),distance=P.L-state.x,need=Math.max(0,(state.v*state.v-(limit*.8)**2)/(2*.95*P.mu*9.81));
    const brake=path.zone===0&&state.v>limit*.8&&distance<need+8?1:0;
    const gas=brake?0:path.zone===0?1:path.zone===2&&level.id!=='forest'?1:0;
    systems.step(state,P,{gas,brake,auto:true,wheel:0},.004,venue);
    if(brake)brakeFactor=Math.min(brakeFactor,state.garageBrakeFactor??1);
    brakeHeat=Math.max(brakeHeat,state.garageBrakeHeat||0);tireHeat=Math.max(tireHeat,state.garageTireHeat||0);
    if(state.zone===1&&!entryKmh)entryKmh=state.v*3.6;
    if(state.slide)slideT+=.004;
    if(Math.abs(state.e)>7)break;
    if(state.zone===2&&state.y*venue.turn>=P.R+40){ok=true;break;}
  }
  return{ok,t:state.t,slideT,entryKmh,brakeFactor,brakeHeat,tireHeat};
}

test('progression is trusted-location only, finite, and distinct in grip, radius, grade and heat count',()=>{
  const inactive=vm.runInNewContext(read('src/shared/race-progression.js')+'\nglobalThis.KickLabRaceProgression.enabled()',raceContext({...pages('?raceProgression=prototype'),pathname:'/Other/'}));
  assert.equal(inactive,false);
  assert.equal(vm.runInNewContext(read('src/shared/race-progression.js')+'\nglobalThis.KickLabRaceProgression.enabled()',raceContext(pages())),false);
  assert.equal(vm.runInNewContext(read('src/shared/race-progression.js')+'\nglobalThis.KickLabRaceProgression.enabled()',raceContext(pages('?raceProgression=prototype'))),true);
  assert.equal(progression.LEVELS.length,3);
  assert.deepEqual([...progression.LEVELS].map(x=>x.venue),['highland','marine','forest']);
  assert.ok(progression.LEVELS[0].radius>progression.LEVELS[1].radius&&progression.LEVELS[1].radius>progression.LEVELS[2].radius);
  assert.ok(progression.LEVELS[0].grip>progression.LEVELS[1].grip&&progression.LEVELS[1].grip>progression.LEVELS[2].grip);
  assert.deepEqual([...progression.LEVELS].map(x=>x.heats),[1,2,3]);
  assert.ok(progression.grade(systems.venue('highland'),4)>0&&progression.grade(systems.venue('forest'),4)<0);
  const s={x:4,y:0,th:0,v:15,t:0,...systems.initial()},a={...s},b={...s};
  const P=garage.parameters({L:120,R:42,m:1400,F:8500,top:55,mu:.9,tireMu:.9,Lwb:2.7,ratio:15},garage.DEFAULT);P.garageStock=false;P.progressionGrade=true;
  systems.step(a,P,{gas:0,brake:0,auto:false,wheel:0},.02,systems.venue('highland'));
  systems.step(b,{...P,progressionGrade:false},{gas:0,brake:0,auto:false,wheel:0},.02,systems.venue('highland'));
  assert.ok(a.v<b.v,'uphill grade slows the canonical step');
});

test('profile progress rejects stale or invalid unlocks and stays independent',()=>{
  const first=progression.normalize(null),second=progression.normalize(null);first.unlocked=2;
  assert.equal(second.unlocked,0);
  assert.equal(progression.normalize({version:2,unlocked:99}).unlocked,0);
  const bounded=progression.normalize({version:1,unlocked:99,selected:99,heats:99,brakeHeat:99,tireHeat:-1});
  assert.equal(bounded.unlocked,3);assert.equal(bounded.selected,2);assert.equal(bounded.heats,2);assert.equal(bounded.brakeHeat,1);assert.equal(bounded.tireHeat,0);
});

test('Coach Nia previews the selected level, guides live play, and compares every pass criterion',()=>{
  const level=progression.LEVELS[0],preview=progression.preview(level);
  assert.match(preview,/Highland Switchback/);assert.match(preview,/≤17s/);assert.match(preview,/entry ≥34 km\/h/);
  assert.match(preview,/street body, soft suspension, wide tires and endurance brakes/);
  assert.match(progression.live(level,{slide:false,zone:0,distance:31}),/Brake for entry/);
  assert.match(progression.live(level,{slide:true,zone:1,distance:0}),/Ease the wheel/);
  const run={ok:false,t:19.2,slideT:.8,entryKmh:29,brakeFactor:.6},result=progression.evaluate(level,run),summary=progression.comparison(level,run,result);
  for(const marker of ['finish no','time 19.2/17s','slide 0.80/0.55s','entry 29/34 km/h','brakes 60/70%'])assert.ok(summary.includes(marker),marker);
  assert.equal(progression.category(result.failed),'tires');
  assert.equal(progression.category(['brakes']),'brakes');assert.equal(progression.category(['time']),'body');
});

test('each venue has an observed failing and succeeding Garage setup in the canonical simulation',()=>{
  const scenarios=[
    {level:progression.LEVELS[0],failing:build('race','soft','wide','endurance'),succeeding:build('street','soft','wide','endurance')},
    {level:progression.LEVELS[1],failing:build(),succeeding:build('street','soft','wide','endurance')},
    {level:progression.LEVELS[2],failing:build('kart','firm','narrow','sport'),succeeding:build('street','soft','narrow','endurance')}
  ];
  for(const {level,failing,succeeding} of scenarios){const bad=heat(level,failing),good=heat(level,succeeding);assert.equal(progression.evaluate(level,bad).pass,false,level.id+' should fail');assert.equal(progression.evaluate(level,good).pass,true,level.id+' should pass');assert.ok(good.ok&&good.entryKmh>=level.entry&&good.t<=level.time&&good.slideT<=level.slide,level.id+' observed metrics');assert.ok(Number.isFinite(good.brakeFactor));}
});

test('repeated heats carry measured brake heat and make brake selection consequential',()=>{
  for(const index of [1,2]){const level=progression.LEVELS[index],selection=index===1?build('street','soft','wide','endurance'):build('street','soft','narrow','endurance');let progress={...progression.DEFAULT,selected:index,unlocked:index};for(let i=0;i<level.heats;i++){const run=heat(level,selection,progress);const next=progression.advance(progress,run);assert.equal(next.result.pass,true,`${level.id} heat ${i+1}`);progress=next.state;if(i<level.heats-1){assert.equal(progress.heats,i+1);assert.ok(progress.brakeHeat>0);}}assert.equal(progress.unlocked,index+1);assert.equal(progress.heats,0);}
  const level=progression.LEVELS[2],sport=build('street','soft','narrow','sport'),first=heat(level,sport),carry=progression.advance({...progression.DEFAULT,selected:2,unlocked:2},first).state,second=heat(level,sport,carry);
  assert.equal(progression.evaluate(level,first).pass,true);
  assert.equal(progression.evaluate(level,second).pass,false);
  assert.ok(second.brakeFactor<first.brakeFactor,'sport brakes fade across heats');
});
