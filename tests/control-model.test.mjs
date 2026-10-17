import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

await import('../src/shared/game-core.js');
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const {
  normalizeAnalogStick,powerFromGesture,classifyPower,gestureToSpin,
  hapticCapability,hapticCueFor,resolveControlMapping,CONTROL_MAPPINGS,sliderRangeModel
}=globalThis.KickLabGameCore;

test('normalizes radial magnitude with a dead zone and center return',()=>{
  assert.deepEqual(normalizeAnalogStick(0,0,100,{deadZone:.16,curve:1}),{x:0,y:0,magnitude:0,rawMagnitude:0,angle:0,deadZone:.16,curve:1});
  assert.equal(normalizeAnalogStick(12,0,100,{deadZone:.16}).magnitude,0);
  const half=normalizeAnalogStick(58,0,100,{deadZone:.16,curve:1});
  assert.ok(Math.abs(half.magnitude-.5)<1e-12);
  assert.ok(Math.abs(half.x-.5)<1e-12);
  assert.equal(normalizeAnalogStick(0,-150,100,{deadZone:.16,curve:1}).magnitude,1);
  assert.equal(normalizeAnalogStick(0,-150,100,{deadZone:.16,curve:1}).y,-1);
});

test('applies a sensitivity curve after dead-zone removal',()=>{
  const linear=normalizeAnalogStick(58,0,100,{deadZone:.16,curve:1});
  const precise=normalizeAnalogStick(58,0,100,{deadZone:.16,curve:2});
  assert.ok(precise.magnitude<linear.magnitude);
  assert.ok(Math.abs(precise.magnitude-.25)<1e-12);
});

test('moves through early, target, perfect, and overcharge on hold then release',()=>{
  const early=powerFromGesture({elapsedMs:400,displacement:0});
  const target=powerFromGesture({elapsedMs:1100,displacement:0});
  const perfect=powerFromGesture({elapsedMs:1290,displacement:0});
  const overcharge=powerFromGesture({elapsedMs:1900,displacement:0});
  assert.deepEqual([early,target,perfect,overcharge].map(value=>classifyPower(value)),['early','target','perfect','overcharge']);
  assert.ok(powerFromGesture({elapsedMs:1100,displacement:1})>target,'thumb displacement must add power without acting like pressure');
});

test('maps swipe direction, curvature, and velocity into signed spin',()=>{
  const right=gestureToSpin([{x:0,y:0,t:0},{x:60,y:0,t:100}]);
  const left=gestureToSpin([{x:60,y:0,t:0},{x:0,y:0,t:120}]);
  const curve=gestureToSpin([{x:0,y:0,t:0},{x:30,y:-24,t:40},{x:68,y:0,t:80}]);
  const nudge=gestureToSpin([{x:0,y:0,t:0},{x:5,y:0,t:240}]);
  assert.equal(right.direction,'right');assert.ok(right.spin>0);assert.ok(right.velocity>.5);
  assert.equal(left.direction,'left');assert.ok(left.spin<0);
  assert.notEqual(curve.curvature,0);assert.ok(curve.velocity>right.velocity);
  assert.ok(Math.abs(nudge.spin)<.05,'a slow short nudge must not claim meaningful spin');
});

test('reports haptic support without requiring it and defines distinct cues',()=>{
  assert.deepEqual(hapticCapability({}),{supported:false,label:'Visual cues only'});
  assert.deepEqual(hapticCapability({vibrate(){}}),{supported:true,label:'Haptics ready'});
  assert.notDeepEqual(hapticCueFor('target'),hapticCueFor('perfect'));
  assert.deepEqual(hapticCueFor('unknown'),[]);
});

test('resolves data-driven mappings for Fight, Race, and every Kick activity family',()=>{
  const cases=[
    [{mode:'fight'},'fight'],[{mode:'race'},'race'],[{mode:'kick',shot:'free'},'kick-free'],[{mode:'kick',shot:'header'},'kick-header'],
    [{mode:'kick',shot:'dribble',state:'run'},'kick-run'],[{mode:'kick',shot:'dribble',state:'pass',pass:true},'kick-pass'],
    [{mode:'kick',shot:'dribble',state:'keep',keeper:true},'kick-keeper'],[{mode:'kick',shot:'dribble',state:'cret',combo:true},'kick-combo']
  ];
  for(const [context,id] of cases){const mapping=resolveControlMapping(context);assert.equal(mapping.id,id);assert.equal(mapping.x.length,2);assert.equal(mapping.y.length,2);assert.equal(mapping.action.length,2);assert.ok(mapping.color);}
  assert.equal(Object.isFrozen(CONTROL_MAPPINGS),true);
});

test('derives ordered low, target, perfect, and high slider segments from coach ranges',()=>{
  const model=sliderRangeModel({min:0,max:100,step:1,value:45,suggestion:{lo:40,hi:80},name:'Speed',unit:'m/s'});
  assert.equal(model.hasBand,true);assert.equal(model.state,'target');
  assert.deepEqual(model.segments.map(segment=>segment.state),['low','target','perfect','target','high']);
  for(let i=1;i<model.segments.length;i++)assert.equal(model.segments[i-1].end,model.segments[i].start,'segments must remain contiguous and ordered');
  assert.equal(model.segments[0].start,0);assert.equal(model.segments.at(-1).end,1);
});

test('clamps the current slider marker without changing the declared mechanics range',()=>{
  const below=sliderRangeModel({min:10,max:20,value:-4,suggestion:{lo:12,hi:18}}),above=sliderRangeModel({min:10,max:20,value:44,suggestion:{lo:12,hi:18}});
  assert.equal(below.position,0);assert.equal(below.value,10);assert.equal(above.position,1);assert.equal(above.value,20);
  assert.deepEqual([below.min,below.max,above.min,above.max],[10,20,10,20]);
});

test('describes challenge locks and accessible current, range, and coach-band context',()=>{
  const locked=sliderRangeModel({min:8,max:35,value:18,suggestion:{lo:17,hi:21},locked:true,lockReason:'Soft touch fixes Speed at 18 m/s.',name:'Speed',unit:'m/s'});
  assert.equal(locked.state,'locked');assert.match(locked.label,/Speed\. Current 18 m\/s\./);assert.equal(locked.description,'Soft touch fixes Speed at 18 m/s.');
  const free=sliderRangeModel({min:3,max:45,value:25,suggestion:{lo:22,hi:29},name:'Angle',unit:'°'});
  assert.match(free.description,/Angle range 3 to 45 degrees/);assert.match(free.description,/Coach target 22 to 29 degrees/);
});

test('keeps pointer lifecycle, cancellation, multi-touch rejection, resize safety, and scroll prevention explicit',()=>{
  const js=readFileSync(join(root,'src','game','55-analog-gesture-controls.js'),'utf8');
  const css=readFileSync(join(root,'src','styles.css'),'utf8');
  for(const event of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','blur','visibilitychange','orientationchange','resize'])assert.ok(js.includes(event),`${event} must remain handled`);
  assert.match(js,/One thumb at a time/);
  assert.match(js,/setPointerCapture/);
  assert.match(css,/\.analog-stick\{[^}]*touch-action:none/);
  assert.match(css,/\.gesture-action\{[^}]*touch-action:none/);
  assert.doesNotMatch(js,/webkitForce|force|pressure|touchforce/i);
});
