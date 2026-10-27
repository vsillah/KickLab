import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/shared/race-coach-personas.js',import.meta.url),'utf8');
const flags='?raceExpansion=prototype&raceInstruments=prototype&raceCoaching=prototype&raceCoachPersonas=prototype';
function load(search='',trusted=true){const context={location:{search},URLSearchParams,globalThis:{KickLabRaceOrigin:{trusted:()=>trusted}}};vm.runInNewContext(source,context);return context.globalThis.KickLabRaceCoachPersonas;}

test('roster stays off unless all trusted prototype flags are present',()=>{
  assert.equal(load().enabled,false);
  assert.equal(load(flags.replace('&raceCoachPersonas=prototype','')).enabled,false);
  assert.equal(load(flags,false).enabled,false);
  assert.equal(load(flags).enabled,true);
});
test('four distinct Coaches share the same canonical instruction',()=>{
  const api=load(flags),message='Coach Nia: Shift in the bright band. Retry at the next marker.';
  assert.equal(api.roster.length,4);
  assert.equal(new Set(api.roster.map(coach=>coach.name)).size,4);
  for(const coach of api.roster){
    assert.equal(api.canonical(api.present(message,coach.id)),'Shift in the bright band. Retry at the next marker.');
    assert.ok(api.present(message,coach.id).startsWith(coach.name));
  }
  assert.equal(api.normalize('unknown'),'nia');
});
test('canonical Race events map to supportive expressions',()=>{
  const api=load(flags);
  assert.deepEqual(['setup','correct','mistake','recovery','award','win','loss','pause','instruction'].map(event=>api.expressionFor(event)),['ready','celebrate','concern','encourage','celebrate','celebrate','encourage','encourage','focus']);
  assert.equal(api.expressionFor('unknown'),'ready');
});
