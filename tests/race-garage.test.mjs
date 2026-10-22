import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {local,raceContext} from './helpers/race-origin.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const garage=vm.runInNewContext(read('../src/shared/race-garage.js')+'\nKickLabRaceGarage');
const systems=vm.runInNewContext(read('../src/game/19-race-systems.js')+'\nRACE_SYSTEMS',raceContext(local('?raceSystems=proxy'),{globalThis:{KickLabRaceGarage:garage}}));
const source=read('../src/game/10-fight.js'),classic=vm.runInNewContext(source.slice(source.indexOf('//<raceStep>'),source.indexOf('//</raceStep>'))+'\nraceStep',{globalThis:{KickLabRaceGarage:garage}});
const base={L:120,R:32,m:1400,F:8500,top:55,mu:.9,Lwb:2.7,ratio:15};
const build=(field,value)=>({...garage.DEFAULT,[field]:value});
const P=selection=>garage.parameters(base,selection);
const state=()=>({x:80,y:0,th:0,v:18,t:0,...systems.initial()});
function drive(step,selection,input,seconds=1){const s=state(),params=P(selection);for(let i=0;i<seconds/.004;i++)step(s,params,input,.004);return s;}

test('garage schema is versioned and malformed or stale builds fall back entirely to stock',()=>{
  assert.equal(JSON.stringify(garage.normalize(null)),JSON.stringify(garage.DEFAULT));
  for(const invalid of [{version:2,body:'race',suspension:'firm',tires:'wide',brakes:'sport'},{...garage.DEFAULT,tires:'unknown'},{...garage.DEFAULT,brakes:null},['race']])assert.equal(JSON.stringify(garage.normalize(invalid)),JSON.stringify(garage.DEFAULT));
  assert.equal(JSON.stringify(garage.normalize(build('tires','wide'))),JSON.stringify(build('tires','wide')));
});

test('four part families alter canonical parameters with costs as well as benefits',()=>{
  const stock=P(garage.DEFAULT),wide=P(build('tires','wide')),narrow=P(build('tires','narrow')),sport=P(build('brakes','sport')),endurance=P(build('brakes','endurance'));
  assert.ok(wide.mu>stock.mu&&wide.rolling>stock.rolling&&wide.tireHeat>stock.tireHeat);
  assert.ok(narrow.mu<stock.mu&&narrow.rolling<stock.rolling);
  assert.ok(sport.brakePower>endurance.brakePower&&sport.brakeHeat>endurance.brakeHeat&&sport.m>stock.m);
  assert.ok(garage.summary(wide).corner>garage.summary(narrow).corner);
  assert.ok(garage.summary(sport).stop<garage.summary(endurance).stop);
  assert.ok(P(build('suspension','firm')).response>P(build('suspension','soft')).response);
  assert.ok(P(build('suspension','firm')).recovery<P(build('suspension','soft')).recovery);
  const kart=garage.parameters({...base,m:160,F:2200,top:30,Lwb:1.05},build('body','kart'));
  const race=garage.parameters({...base,m:760,F:11000,top:80,Lwb:2.9},build('body','race'));
  assert.ok(kart.m<stock.m&&kart.stability<stock.stability);
  assert.ok(race.F/race.m>stock.F/stock.m&&race.stability<stock.stability);
});

test('suspension choices produce distinct comparison rates while stock stays at 100 percent',()=>{
  const stock=garage.summary(P(garage.DEFAULT));
  const soft=garage.summary(P(build('suspension','soft')));
  const balanced=garage.summary(P(build('suspension','balanced')));
  const firm=garage.summary(P(build('suspension','firm')));
  assert.equal(stock.steeringResponse,1);
  assert.equal(stock.slideRecovery,1);
  assert.ok(soft.steeringResponse<balanced.steeringResponse&&balanced.steeringResponse<firm.steeringResponse);
  assert.ok(soft.slideRecovery>balanced.slideRecovery&&balanced.slideRecovery>firm.slideRecovery);
  assert.equal(soft.steeringResponse,.78);
  assert.equal(soft.slideRecovery,1.2);
  assert.equal(firm.steeringResponse,1.18);
  assert.equal(firm.slideRecovery,.78);
  assert.deepEqual(garage.summary(P(garage.DEFAULT)),stock);
});

test('every Garage lesson teaches the selected canonical effect with units and a tradeoff',()=>{
  assert.equal(garage.lesson('unknown',garage.DEFAULT,P(garage.DEFAULT)),null);
  const bodies={kart:{m:160,F:2200,top:30,Lwb:1.05},street:{m:1400,F:8500,top:55,Lwb:2.7},race:{m:760,F:11000,top:80,Lwb:2.9}};
  for(const field of garage.fields)for(const choice of garage.PARTS[field].choices){
    const selection=build(field,choice.id),params=garage.parameters({...base,...(field==='body'?bodies[choice.id]:{})},selection),sum=garage.summary(params),lesson=garage.lesson(field,selection,params);
    assert.equal(JSON.stringify(garage.lesson(field,selection,params)),JSON.stringify(lesson));
    assert.ok(lesson.formula.length&&lesson.formula.every(line=>line.includes('=')));
    for(const key of ['reading','how','when','tradeoff','coach'])assert.ok(lesson[key].length>20,`${field}/${choice.id}: ${key}`);
    if(field==='body')assert.ok(lesson.reading.includes(`${params.F.toFixed(0)} N`)&&lesson.reading.includes(`${params.m.toFixed(0)} kg`)&&lesson.reading.includes(`${sum.launch.toFixed(1)} m/s²`));
    if(field==='suspension')assert.ok(lesson.reading.includes(`${(sum.steeringResponse*100).toFixed(0)}%`)&&lesson.reading.includes(`${(sum.slideRecovery*100).toFixed(0)}%`));
    if(field==='tires')assert.ok(lesson.reading.includes(`μ ${params.mu.toFixed(2)}`)&&lesson.reading.includes(`${sum.corner.toFixed(0)} km/h`));
    if(field==='brakes')assert.ok(lesson.reading.includes(`${(params.brakePower*100).toFixed(0)}%`)&&lesson.reading.includes(`${sum.stop.toFixed(1)} m`));
  }
  const soft=garage.lesson('suspension',build('suspension','soft'),P(build('suspension','soft'))),firm=garage.lesson('suspension',build('suspension','firm'),P(build('suspension','firm')));
  assert.match(soft.tradeoff,/78%/);assert.match(firm.tradeoff,/78%/);assert.match(firm.coach,/Unwind sooner/);
  const wide=garage.lesson('tires',build('tires','wide'),P(build('tires','wide'))),narrow=garage.lesson('tires',build('tires','narrow'),P(build('tires','narrow')));
  assert.match(wide.tradeoff,/120%.*128%/);assert.match(narrow.tradeoff,/92%/);
  const sport=garage.lesson('brakes',build('brakes','sport'),P(build('brakes','sport'))),endurance=garage.lesson('brakes',build('brakes','endurance'),P(build('brakes','endurance')));
  assert.match(sport.tradeoff,/135%.*130%.*12 kg/);assert.match(endurance.tradeoff,/94%.*16 kg/);
});

test('suspension recovery and brake fade evolve deterministically',()=>{
  const evolve=(params,seconds)=>{const s={v:20,garageRecovery:.45};let response;for(let i=0;i<seconds/.01;i++)response=garage.response(s,params,60,1,.01);return{s,response};};
  const soft=evolve(P(build('suspension','soft')),.3),firm=evolve(P(build('suspension','firm')),.3);
  assert.ok(soft.s.garageRecovery<firm.s.garageRecovery);
  assert.ok(firm.s.garageSteer>soft.s.garageSteer);
  const sport=evolve(P(build('brakes','sport')),5),endurance=evolve(P(build('brakes','endurance')),5);
  assert.ok(sport.s.garageBrakeHeat>endurance.s.garageBrakeHeat);
  assert.ok(sport.response.brakeFactor<endurance.response.brakeFactor);
  assert.equal(JSON.stringify(evolve(P(build('brakes','sport')),5)),JSON.stringify(sport));
});

test('the same build changes both Race steppers without a separate control model',()=>{
  const input={gas:.35,brake:0,wheel:32,auto:false,drift:false,nitro:false};
  for(const step of [(s,p,i,h)=>systems.step(s,p,i,h,systems.venue('highland')),(s,p,i,h)=>classic(s,p,i,h)]){
    const stock=drive(step,garage.DEFAULT,input),firm=drive(step,build('suspension','firm'),input),wide=drive(step,build('tires','wide'),input);
    assert.ok(Number.isFinite(stock.y)&&Number.isFinite(firm.y)&&Number.isFinite(wide.y));
    assert.notEqual(firm.th,stock.th);assert.notEqual(wide.th,stock.th);
    assert.equal(JSON.stringify(drive(step,build('tires','wide'),input)),JSON.stringify(wide));
    const coast=drive(step,build('tires','narrow'),{...input,gas:0,wheel:0}),drag=drive(step,build('tires','wide'),{...input,gas:0,wheel:0});assert.ok(coast.v>drag.v);
    const sport=drive(step,build('brakes','sport'),{...input,gas:0,brake:1,wheel:0},.5),endurance=drive(step,build('brakes','endurance'),{...input,gas:0,brake:1,wheel:0},.5);assert.ok(sport.v<endurance.v);
  }
});

test('garage progress stays with the active local profile',()=>{
  const context={globalThis:{}},profiles=vm.runInNewContext(read('../src/shared/profile-store.js')+'\nglobalThis.KickLabProfiles',context),memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
  const manager=profiles.createManager(storage,{now:()=>123,makeId:(()=>{let n=0;return()=>`player-${++n}`;})()});
  const first=manager.active().id;manager.saveActiveProgress({raceGarage:build('tires','wide')});manager.create({nickname:'Second'});assert.equal(garage.normalize(manager.active().progress.raceGarage).tires,'balanced');
  manager.switchTo(first);assert.equal(garage.normalize(manager.active().progress.raceGarage).tires,'wide');
});
