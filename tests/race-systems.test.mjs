import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {local,pages,raceContext} from './helpers/race-origin.mjs';

const source=readFileSync(new URL('../src/game/19-race-systems.js',import.meta.url),'utf8');
function load(location=local('?raceSystems=proxy')){return vm.runInNewContext(source+'\nRACE_SYSTEMS',raceContext(location));}
const api=load(),P={L:120,R:32,m:1400,F:8500,top:55,mu:.9,Lwb:2.7,ratio:15};
const state=(extra={})=>({x:95,y:0,th:0,v:18,t:0,...api.initial(),...extra});
const drive=(s,input,seconds,v=api.venue('highland'))=>{for(let n=0;n<seconds/.004;n++)api.step(s,P,input,.004,v);return s;};

test('the systems flag is default-off and trusted-location only',()=>{
  assert.equal(load(local()).enabled(),false);
  assert.equal(load({...local('?raceSystems=proxy'),hostname:'127.0.0.1'}).enabled(),true);
  assert.equal(load(pages()).enabled(),false);
  assert.equal(load(pages('?raceSystems=proxy')).enabled(),true);
  assert.equal(load({...pages('?raceSystems=proxy'),pathname:'/Other/'}).enabled(),false);
  assert.equal(load({...pages('?raceSystems=proxy'),hostname:'kicklab.example'}).enabled(),false);
});

test('vehicle contract has four independently positioned wheel pivots and required swap fields',()=>{
  const c=api.CONTRACT;assert.equal(c.root,'VehicleRoot');assert.equal(c.body,'Body');assert.equal(Object.keys(c.wheels).length,4);
  assert.equal(new Set(Object.values(c.wheels).map(w=>w.pivot.join(','))).size,4);
  assert.equal(c.collider.kind,'box');assert.equal(c.cameraTarget.length,3);assert.ok(c.materialSlots.includes('wheels'));assert.ok(c.lod.canvas);
  const bytes=readFileSync(new URL('../src/assets/3d/kicklab-race-vehicle/v1/kicklab-race-vehicle.glb',import.meta.url));
  const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
  const names=gltf.nodes.map(node=>node.name||'');assert.equal(api.validateVehicle(names,{proxy:true}).ok,true);
  assert.equal(api.validateVehicle(names,{proxy:false}).ok,false);
  assert.equal(api.validateVehicle([c.root,c.body,...Object.values(c.wheels).map(w=>w.node)],{proxy:false}).ok,true);
});

test('the three venue configurations have distinct path and grip decisions',()=>{
  const [high,marine,forest]=['highland','marine','forest'].map(api.venue);
  assert.equal(new Set([high.id,marine.id,forest.id]).size,3);
  assert.deepEqual([high.turn,marine.turn,forest.turn],[1,1,-1]);
  assert.ok(api.grip({x:125,y:0},P,marine)<api.grip({x:125,y:0},P,high));
  assert.ok(api.grip({x:125,y:6},P,forest)<api.grip({x:125,y:0},P,forest));
  assert.equal(api.path(150,-25,P,forest).zone,1);assert.equal(api.path(150,-50,P,forest).zone,2);assert.ok(api.path(156,-50,P,forest).e<0);assert.ok(api.path(148,-50,P,forest).e>0);
  for(const v of [high,marine,forest]){assert.ok(v.runoffWidth>0);assert.ok(v.elevation.length>=2);assert.ok(v.landmarks.length>=2);}
});

test('equal inputs produce deterministic steering and braking outcomes',()=>{
  const inputs=[{gas:1,brake:0,wheel:0},{gas:.5,brake:0,wheel:25},{gas:0,brake:.8,wheel:25}];
  const run=()=>{const s=state();for(const input of inputs)drive(s,input,.8);return JSON.stringify(s);};assert.equal(run(),run());
  const coast=drive(state(),{gas:0,brake:0,wheel:0},1),braked=drive(state(),{gas:0,brake:1,wheel:0},1);
  assert.ok(braked.v<coast.v);const steer=drive(state(),{gas:.4,brake:0,wheel:26},1);assert.ok(steer.th>0&&steer.y>0);
});

test('controlled drift enters, holds and exits without becoming a skid',()=>{
  const s=state();drive(s,{gas:.45,brake:0,wheel:28,drift:true},1.1);
  assert.equal(s.driftMode,'drift');assert.ok(s.driftHold>1);assert.ok(Math.abs(s.slipAngle)>.05);assert.equal(s.slide,false);
  drive(s,{gas:0,brake:.2,wheel:0,drift:false},1.2);assert.equal(s.driftMode,'none');assert.ok(Math.abs(s.slipAngle)<.02);
});

test('handbrake changes axle grip and yaw only with enough speed and steering',()=>{
  const run=(extra,input)=>drive(state({x:0,...extra}),{gas:.3,brake:0,wheel:42,drift:false,...input},.48);
  const free=run({},{}),held=run({},{handbrake:true});
  assert.ok(held.rearGrip<.5&&free.rearGrip===1);
  assert.ok(held.yawRate>free.yawRate+.05);
  assert.ok(held.slipAngle>.08);
  for(const [extra,input] of [[{v:6},{wheel:42}],[{}, {wheel:0}],[{}, {brake:.5}]]){
    const off=run(extra,input),on=run(extra,{...input,handbrake:true});
    assert.equal(on.th,off.th);assert.equal(on.slipAngle,off.slipAngle);assert.equal(on.yawRate,off.yawRate);
  }
});

test('short handbrake rotation holds a readable angle and countersteer recovers',()=>{
  const s=state({x:0}),physics={...P,expansionCourse:'straight',stability:1,recovery:1};
  const advance=(input,seconds)=>{for(let i=0;i<seconds/.004;i++)api.step(s,physics,input,.004);};
  advance({gas:.3,wheel:55,handbrake:true},.72);
  assert.ok(s.slipAngle>=15*Math.PI/180&&s.slipAngle<=35*Math.PI/180,`controlled slip ${s.slipAngle}`);
  const peak=s.slipAngle;advance({gas:.3,wheel:-35,handbrake:false},.55);
  assert.ok(Math.abs(s.slipAngle)<peak*.5,`countersteer reduced slip ${s.slipAngle}`);
  assert.ok(Math.abs(s.yawRate)<.4,`yaw rate settled ${s.yawRate}`);
  advance({gas:0,wheel:0,handbrake:false},.55);
  assert.ok(Math.abs(s.slipAngle)<.06);
});

test('prolonged handbrake misuse can spin without unbounded per-step yaw',()=>{
  const s=state({x:0}),physics={...P,expansionCourse:'straight'};let previous=s.th,maxStep=0;
  for(let i=0;i<800;i++){api.step(s,physics,{gas:.3,wheel:90,handbrake:true},.004);maxStep=Math.max(maxStep,Math.abs(s.th-previous));previous=s.th;}
  assert.ok(s.th>Math.PI,`spin heading ${s.th}`);
  assert.equal(s.driftMode,'skid');assert.ok(maxStep<.006&&Number.isFinite(s.slipAngle));
});

test('vehicle stability and recovery tune rear axle response without breaking ordinary cornering',()=>{
  const cars=[['kestrel',.94,1.14,.82],['cobalt',1,1,1],['aegis',1.1,.96,1.16]];
  const results=cars.map(([id,grip,stability,recovery])=>{const s=state({x:0});const car={...P,tireMu:P.mu*grip,stability,recovery,expansionCourse:'straight'};for(let i=0;i<150;i++)api.step(s,car,{gas:.3,wheel:50,handbrake:true},.004);return{id,slip:s.slipAngle,yaw:s.yawRate};});
  assert.ok(new Set(results.map(row=>row.slip.toFixed(3))).size===3);
  assert.ok(results.every(row=>row.slip>0&&row.slip<.7&&row.yaw>0));
  const normal=state({x:0});drive(normal,{gas:.3,wheel:30},.6);assert.equal(normal.axleActive,false);assert.ok(normal.slipAngle<.2);
});

test('chase camera follows the velocity vector enough to expose car rotation',()=>{
  const s=state({x:0,th:.4,slipAngle:.35,axleActive:true});
  for(const width of [390,768,1113,1440]){const normal=api.camera({...s,axleActive:false},width),sliding=api.camera(s,width,{reduced:true});assert.ok(Math.abs(sliding.position[2]-normal.position[2])>.5);assert.equal(sliding.instant,true);}
});

test('excess corner demand becomes a skid and recovers after wheel release',()=>{
  const s=state({v:32});drive(s,{gas:.4,brake:0,wheel:180},.3);assert.equal(s.driftMode,'skid');assert.equal(s.slide,true);
  drive(s,{gas:0,brake:.4,wheel:0},1.5);assert.equal(s.driftMode,'none');assert.equal(s.slide,false);
});

test('nitro has finite activation, depletion, cooldown and later recharge',()=>{
  const s=state({v:12});drive(s,{gas:1,brake:0,wheel:0,nitro:true},.4);assert.equal(s.nitroActive,true);assert.equal(s.nitroDelivered,true);assert.ok(s.nitro<1);
  drive(s,{gas:1,brake:0,wheel:0,nitro:true},2.2);assert.equal(s.nitro,0);assert.equal(s.nitroActive,false);assert.ok(s.nitroCooldown>0);
  drive(s,{gas:0,brake:0,wheel:0,nitro:false},4);assert.equal(s.nitroCooldown,0);
  drive(s,{gas:0,brake:0,wheel:0,nitro:false},3);assert.ok(s.nitro>0);
});

test('visual boost signal stays off when traction leaves no delivered force',()=>{
  const s=state({v:12});api.step(s,{...P,F:20000},{gas:1,brake:0,wheel:0,nitro:true},.01);
  assert.equal(s.nitroActive,true);assert.equal(s.nitroDelivered,false);
});

test('camera framing stays bounded at target widths and reduced motion is instant',()=>{
  for(const width of [1440,1113,768,390]){const camera=api.camera(state({v:30}),width,{reduced:width===390});assert.ok(camera.back>=7&&camera.back<=16);assert.ok(camera.height>=4&&camera.height<=7);assert.ok(camera.lookAhead>=3&&camera.lookAhead<=6);assert.ok(camera.position.every(Number.isFinite));assert.ok(camera.look.every(Number.isFinite));}
  assert.equal(api.camera(state(),390,{reduced:true}).instant,true);
});

test('background cancellation releases every held systems input',()=>{
  const input={gas:true,brake:true,left:true,right:true,drift:true,nitro:true};api.cancelInput(input);
  assert.deepEqual(Object.values(input),[false,false,false,false,false,false]);
});
