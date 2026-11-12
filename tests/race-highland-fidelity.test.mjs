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
