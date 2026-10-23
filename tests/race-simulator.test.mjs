import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root={};
root.globalThis=root;
vm.runInNewContext(readFileSync(new URL('../src/shared/race-simulator.js',import.meta.url),'utf8'),root);
const input=root.KickLabRaceSimulatorMath;

test('calibration, dead zone, sensitivity, and landscape axis are deterministic',()=>{
  assert.equal(input.steering(10,10),0);
  assert.equal(input.steering(15,10,6),0);
  assert.ok(input.steering(30,10,6)>0);
  assert.equal(input.steering(-10,10,6),-input.steering(30,10,6));
  assert.equal(input.steering(80,0),1);
  assert.equal(input.steering(null,0),0);
  assert.equal(input.axis(20,5,0),5);
  assert.equal(input.axis(20,5,90),20);
  assert.equal(input.axis(20,5,-90),-20);
});

test('intentional vertical gestures reject taps, wrong direction, and slow swipes',()=>{
  assert.equal(input.gesture(100,151,200,'handbrake'),true);
  assert.equal(input.gesture(100,44,200,'nos'),true);
  assert.equal(input.gesture(100,144,200,'handbrake'),false);
  assert.equal(input.gesture(100,160,800,'handbrake'),false);
  assert.equal(input.gesture(100,160,200,'nos'),false);
});
