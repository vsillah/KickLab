import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const speed=vm.runInNewContext(read('src/shared/race-speed-perception.js')+'\nglobalThis.KickLabRaceSpeedPerception');

test('speed cues rise with measured speed in every expansion mode',()=>{
  for(const mode of Object.keys(speed.TUNING)){
    const samples=[5,20,40].map(value=>speed.cues({speed:value,top:55,rpm:value/55,load:.7,roughness:.3,mode,active:true}));
    for(const key of ['intensity','fieldOfView','wind','roadNoise','markerOpacity'])assert.ok(samples[0][key]<samples[1][key]&&samples[1][key]<samples[2][key],`${mode}: ${key}`);
    assert.ok(samples[2].fieldOfView<=59.5);
  }
});

test('camera follows acceleration and signed lateral G within restrained bounds',()=>{
  const base={speed:30,top:55,rpm:.6,load:.8,active:true};
  const acceleration=speed.cues({...base,accel:5,lateral:6,roughness:.8});
  const braking=speed.cues({...base,accel:-5,lateral:-6,roughness:.8});
  assert.ok(acceleration.foreAft>0&&braking.foreAft<0);
  assert.ok(acceleration.roll>0&&braking.roll<0);
  assert.ok(Math.abs(acceleration.roll)<=.018&&acceleration.heave<=.035);
});

test('pause, results and reduced motion cancel moving camera cues while retaining cadence and audio map',()=>{
  const input={speed:35,top:55,accel:5,lateral:8,rpm:.75,load:.9,roughness:.6,slip:.2,mode:'endurance'};
  const live=speed.cues({...input,active:true}),reduced=speed.cues({...input,active:true,reduced:true}),inactive=speed.cues({...input,active:false});
  assert.equal(reduced.fieldOfView,55);assert.equal(reduced.foreAft,0);assert.equal(reduced.roll,0);assert.equal(reduced.heave,0);
  assert.equal(reduced.wind,live.wind);assert.equal(reduced.markerOpacity,live.markerOpacity);
  assert.equal(inactive.intensity,0);assert.equal(inactive.wind,0);assert.equal(inactive.tireNoise,0);assert.equal(inactive.harmonic,0);
});

test('audio nodes stop on pause, mute, page hide and can restart cleanly',()=>{
  let stopped=0,disconnected=0;const listeners={},node=()=>({connect(){return this;},disconnect(){disconnected++;},start(){},stop(){stopped++;},frequency:{value:0,setTargetAtTime(){}},gain:{value:0,setTargetAtTime(){}}});
  const context={state:'running',currentTime:1,sampleRate:4000,destination:node(),createGain:node,createOscillator:node,createBiquadFilter:node,createBufferSource:node,createBuffer(){return{sampleRate:4000,getChannelData(){return new Float32Array(4000);}}}};
  const sandbox={AC:context,best:{mute:false},tone(){},document:{addEventListener(name,fn){listeners[name]=fn;},hidden:false},window:{addEventListener(name,fn){listeners[name]=fn;}}};
  const audio=vm.runInNewContext(read('src/game/19c-race-speed-audio.js')+'\nRACE_SPEED_AUDIO',sandbox);
  audio.update({frequency:140,harmonic:.01,wind:.01,roadNoise:.01,tireNoise:.01},{active:true,gear:1});assert.ok(audio.nodes);
  audio.update({}, {active:false});assert.equal(audio.nodes,null);assert.equal(stopped,4);
  audio.update({frequency:140,harmonic:.01,wind:.01,roadNoise:.01,tireNoise:.01},{active:true});sandbox.best.mute=true;audio.update({}, {active:true});assert.equal(audio.nodes,null);
  sandbox.best.mute=false;audio.update({frequency:140,harmonic:.01,wind:.01,roadNoise:.01,tireNoise:.01},{active:true});sandbox.document.hidden=true;listeners.visibilitychange();assert.equal(audio.nodes,null);
  assert.ok(disconnected>0);
});
