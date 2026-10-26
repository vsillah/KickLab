import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/shared/race-contextual-coach.js',import.meta.url),'utf8');
function load(search=''){
  const context={location:{search},URLSearchParams,globalThis:{KickLabRaceOrigin:{trusted:()=>true}}};
  vm.runInNewContext(source,context);
  return context.globalThis.KickLabRaceContextualCoach;
}
test('default off and complete feature binding',()=>{
  assert.equal(load().enabled,false);
  assert.equal(load('?raceExpansion=prototype&raceInstruments=prototype').enabled,false);
  assert.equal(load('?raceExpansion=prototype&raceInstruments=prototype&raceCoaching=prototype').enabled,true);
});
test('teach, confirm, retire, return after repeated misses, and reset',()=>{
  const core=load(),state=core.create(null);
  assert.equal(core.status(state,'shift'),'teach');
  assert.equal(core.observe(state,'shift','success','optimal').to,'confirm');
  assert.equal(core.observe(state,'shift','success','optimal').to,'retired');
  assert.equal(core.status(state,'shift'),'retired');
  assert.equal(core.observe(state,'shift','early').to,'retired');
  assert.equal(core.observe(state,'shift','late').to,'teach');
  assert.equal(core.status(state,'shift'),'teach');
  core.resetRun(state);
  assert.equal(state.history.length,0);
  assert.equal(core.status(state,'shift'),'teach');
});
test('progress is bounded, per instance, and ignores unrecognized actions',()=>{
  const core=load(),a=core.create({actions:{nos:{success:1e8,misses:-3,mastered:true},bad:{success:2}}}),b=core.create(null);
  assert.equal(a.progress.actions.nos.success,99);
  assert.equal(a.progress.actions.nos.misses,0);
  assert.equal(b.progress.actions.nos.success,0);
  assert.equal(core.observe(a,'bad','success'),null);
  assert.equal(Object.hasOwn(a.progress.actions,'bad'),false);
});
