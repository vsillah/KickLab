import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const scene=read('src/game/21-race-3d.js');
const origin=read('src/shared/race-origin.js');
const flagSource=scene.match(/function raceHighlandFidelityEnabled\(loc=location\)\{[\s\S]*?\n\}/)?.[0];

test('Highland fidelity remains an explicit loopback-only visual experiment',()=>{
  assert.ok(flagSource);
  const context=vm.createContext({URL,URLSearchParams,location:new URL('http://127.0.0.1:4973/kicklab.html')});
  vm.runInContext(flagSource,context);
  const enabled=url=>vm.runInContext(`raceHighlandFidelityEnabled(new URL(${JSON.stringify(url)}))`,context);
  assert.equal(enabled('http://127.0.0.1:4973/kicklab.html'),false);
  assert.equal(enabled('http://127.0.0.1:4973/kicklab.html?raceHighlandFidelity=prototype'),true);
  assert.equal(enabled('http://localhost:4973/kicklab.html?raceHighlandFidelity=prototype'),true);
  assert.equal(enabled('https://vsillah.github.io/KickLab/?raceHighlandFidelity=prototype'),false);
  assert.equal(enabled('capacitor://localhost/index.html?raceHighlandFidelity=prototype'),false);
  assert.equal(enabled('file:///index.html?raceHighlandFidelity=prototype'),false);
  assert.equal(enabled('http://example.com/kicklab.html?raceHighlandFidelity=prototype'),false);
  assert.doesNotMatch(origin,/raceHighlandFidelity/);
});

test('Highland visual code adds no runtime request or persistent state path',()=>{
  const slice=scene.slice(0,scene.indexOf('async function raceNeedsProjectedShadow'));
  assert.doesNotMatch(slice,/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB)\b/);
  assert.match(scene,/if\(fidelity\)\{raceHighlandBanks/);
  assert.match(scene,/const fidelity=RACE_HIGHLAND_FIDELITY&&venue\.id==='highland'/);
});

test('adaptive resolution separates 30 Hz cadence from sustained render pressure',()=>{
  const source=scene.match(/function raceHighlandResolutionPressure\([\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const context=vm.createContext({Math});vm.runInContext(source,context);
  const step=(state,sample,count)=>{context.state=state;context.sample=sample;for(let i=0;i<count;i++)vm.runInContext('raceHighlandResolutionPressure(state, sample)',context);return state;};
  const healthy={slow:0,calm:0,scale:1,cooldown:0};
  step(healthy,{frameMs:33.4,cpuMs:3,gpuMs:1.7},600);
  assert.equal(healthy.scale,1);
  const loaded={slow:0,calm:0,scale:1,cooldown:0};
  step(loaded,{frameMs:50,cpuMs:43,gpuMs:47},600);
  assert.equal(loaded.scale,.65);
  step(loaded,{frameMs:33.4,cpuMs:3,gpuMs:1.7},180);
  assert.equal(loaded.scale,.65);
  step(loaded,{frameMs:33.4,cpuMs:3,gpuMs:1.7},720);
  assert.ok(loaded.scale>.65&&loaded.scale<=1);
  const recovered=loaded.scale;
  step(loaded,{frameMs:48,cpuMs:30,gpuMs:30},600);
  assert.equal(loaded.scale,recovered);
  const slowGpu={slow:0,calm:0,scale:1,cooldown:0};
  step(slowGpu,{frameMs:33.4,cpuMs:2,gpuMs:44},45);
  assert.equal(slowGpu.scale,.9);
  const slowCpu={slow:0,calm:0,scale:1,cooldown:0};
  step(slowCpu,{frameMs:33.4,cpuMs:44,gpuMs:2},45);
  assert.equal(slowCpu.scale,.9);
  const hidden={slow:0,calm:0,scale:1,cooldown:0};
  step(hidden,{frameMs:200,cpuMs:90,gpuMs:90,visible:false},600);
  assert.equal(hidden.scale,1);
});
