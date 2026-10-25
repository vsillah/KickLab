import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../src/shared/race-effects-contracts.js',import.meta.url),'utf8'),context);
const {boost,shift,launch,loadTransfer,handbrakeDrift,cutawayMilestones,cutaway}=context.KickLabRaceEffectsContracts;

test('NOS flame needs delivered propulsion and active tank drain, and cancels immediately',()=>{
  const valid={running:true,paused:false,hidden:false,delivered:true,pulse:1,overheat:false,active:true,throttle:true,draining:true,traction:true};
  assert.equal(boost(valid),'delivered-draining');
  for(const [change,reason] of [[{active:false},'released'],[{throttle:false},'released'],[{pulse:0},'released'],[{delivered:false},'no-delivered-propulsion'],[{traction:false},'no-delivered-propulsion'],[{draining:false},'tank-not-draining'],[{overheat:true},'overheat'],[{paused:true},'paused'],[{hidden:true},'hidden'],[{running:false},'race-inactive']])assert.equal(boost({...valid,...change}),reason);
});

test('drag X-ray accepts exactly one perfect completed upshift',()=>{
  const valid={mode:'drag',phase:'run',changed:true,beforeGear:1,afterGear:2,quality:'optimal',speed:13.5,top:50,target:.27,alreadyTriggered:false};
  assert.equal(shift(valid),'perfect-upshift');
  for(const [change,reason] of [[{mode:'circuit'},'wrong-mode'],[{phase:'done'},'wrong-mode'],[{changed:false},'gear-not-advanced'],[{afterGear:1},'gear-not-advanced'],[{quality:'early'},'early'],[{quality:'late'},'late'],[{quality:'missed'},'missed'],[{quality:'ordinary'},'ordinary'],[{speed:11.5},'outside-perfect-band'],[{speed:16},'outside-perfect-band'],[{alreadyTriggered:true},'already-triggered']])assert.equal(shift({...valid,...change}),reason);
});

test('launch smoke requires brake, rev band, timely release, throttle commit and driven slip',()=>{
  const base={mode:'drag',running:true,paused:false,hidden:false,time:1,brake:0,gas:0,speed:0,slip:0};
  let state=launch(null,{...base,brake:1});assert.equal(state.phase,'braking');
  state=launch(state,{...base,brake:1,gas:.8,time:1.1});assert.equal(state.phase,'revved');
  state=launch(state,{...base,brake:0,gas:.8,time:1.2,slip:.03});assert.equal(state.phase,'committed');
  state=launch(state,{...base,brake:0,gas:.8,time:1.24,speed:2,slip:.12});assert.equal(state.reason,'launch-slip');assert.equal(state.phase,'active');
  assert.equal(launch(state,{...base,time:1.3,gas:.8,speed:2,slip:.12}).phase,'active');
  assert.equal(launch(state,{...base,time:2.2,gas:.8,speed:9,slip:0}).phase,'completed');
  assert.equal(launch(null,{...base,gas:1,slip:.3}).reason,'ordinary-acceleration');
  for(const [sample,reason] of [[{mode:'circuit'},'wrong-mode'],[{running:false},'race-inactive'],[{paused:true},'paused'],[{hidden:true},'hidden']])assert.equal(launch(null,{...base,...sample}).reason,reason);
  for(const [sample,reason] of [[{time:1.6,gas:.8},'launch-window-expired'],[{time:1.2,gas:.4},'throttle-not-committed'],[{time:1.2,gas:.8,speed:4},'throttle-not-committed']])assert.equal(launch({phase:'revved',revAt:1.1}, {...base,...sample}).reason,reason);
  assert.equal(launch({phase:'committed',revAt:1.1},{...base,time:1.2,gas:.8,slip:.03}).reason,'awaiting-driven-slip');
  assert.equal(launch({phase:'committed',revAt:1.1},{...base,time:1.2,gas:.2,slip:.3}).reason,'throttle-released');
});

test('NOS load transfer follows delivered acceleration and rejects invalid boost states',()=>{
  const valid={boostReason:'delivered-draining',acceleration:5.8,deliveredBoost:2.8,torque:.8,launchSlip:.3,speed:5};
  assert.ok(loadTransfer(valid)>.55);
  assert.ok(loadTransfer({...valid,launchSlip:0,speed:22})<loadTransfer(valid));
  for(const change of [{boostReason:'released'},{boostReason:'overheat'},{boostReason:'no-delivered-propulsion'},{boostReason:'tank-not-draining'},{deliveredBoost:0},{acceleration:-1}])assert.equal(loadTransfer({...valid,...change}),0);
});

test('handbrake fishtail needs a committed, fast, steered slide with real slip',()=>{
  const valid={running:true,paused:false,hidden:false,committed:true,speed:16,wheel:24,slip:.25,yawRate:.45,lateralAccel:6,availableGrip:.9,mode:'drift',grip:.8};
  assert.ok(handbrakeDrift(valid)>.5);
  for(const change of [{committed:false},{speed:5},{wheel:2},{slip:.02},{mode:'none'},{grip:.3},{paused:true},{hidden:true},{running:false}])assert.equal(handbrakeDrift({...valid,...change}),0);
  assert.ok(handbrakeDrift({...valid,slip:.12})<handbrakeDrift(valid));
  assert.ok(handbrakeDrift({...valid,lateralAccel:1})<handbrakeDrift(valid));
});

test('all five systems require distinct gameplay milestones and share priority and cooldown',()=>{
  const base={dt:.05,running:true,done:false,mode:'drag',launchTriggered:false,driftMode:'none',handbrakeCommitted:false,slip:0,speed:16,slide:false,brake:0,longitudinalAccel:0,heat:.3,overheat:false};
  const sample=(previous,change)=>cutawayMilestones(previous,{...base,...change});
  assert.deepEqual(Array.from(sample(null,{}).candidates),[]);
  assert.deepEqual(Array.from(sample(null,{done:true,running:false,launchTriggered:true}).candidates),['chassis']);
  assert.deepEqual(Array.from(sample(null,{done:true,running:false,launchTriggered:false}).candidates),[]);
  let state=null;
  for(let i=0;i<12;i++)state=sample(state,{mode:'drift',handbrakeCommitted:true,driftMode:'drift',slip:.2}).state;
  assert.deepEqual(Array.from(sample(state,{mode:'drift',driftMode:'skid',slide:true,slip:.4}).candidates),[]);
  assert.deepEqual(Array.from(sample(state,{mode:'drift',driftMode:'none',slip:.04}).candidates),['suspension']);
  state=null;for(let i=0;i<8;i++)state=sample(state,{mode:'circuit',brake:.8,longitudinalAccel:-4}).state;
  assert.deepEqual(Array.from(sample(state,{mode:'circuit',brake:0,longitudinalAccel:0}).candidates),['brakes']);
  assert.deepEqual(Array.from(sample(null,{mode:'circuit',brake:0,longitudinalAccel:0}).candidates),[]);
  state=sample(null,{mode:'endurance',heat:.8}).state;
  assert.deepEqual(Array.from(sample(state,{mode:'endurance',heat:.54,overheat:true}).candidates),[]);
  assert.deepEqual(Array.from(sample(state,{mode:'endurance',heat:.54}).candidates),['cooling']);
  let gate=cutaway(null,{time:1,active:true,candidates:['chassis','drivetrain','brakes']});assert.equal(gate.selected,'drivetrain');
  gate=cutaway(gate,{time:4,active:true,candidates:['brakes']});assert.equal(gate.selected,null);
  gate=cutaway(gate,{time:7.1,active:true,candidates:['brakes','chassis']});assert.equal(gate.selected,'brakes');
  gate=cutaway(gate,{time:13.2,active:true,candidates:['brakes']});assert.equal(gate.selected,null);
  gate=cutaway(gate,{time:13.2,active:false,candidates:['chassis']});assert.equal(gate.selected,null);
});
