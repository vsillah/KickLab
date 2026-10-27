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
test('setup, action, recovery, and result wording varies without changing the instruction',()=>{
  const api=load(flags),cases={
    setup:'Suggested: Cobalt with narrow tires for speed.',
    shift:'Shift in the bright band.',
    nos:'Release a NOS pulse in the bright band.',
    drift:'Hold a controlled slide through each curve.',
    heat:'Lift now; engine heat is reducing power.',
    correction:'Brake earlier to enter below the corner limit.',
    recovery:'Back on the line. Build speed and steer into the next section.',
    win:'You reached the finish.',
    loss:'The run failed; keep the car inside the track boundary on the retry.'
  };
  for(const [kind,core] of Object.entries(cases)){
    const outputs=api.roster.map(coach=>api.present(core,coach.id));
    assert.equal(new Set(outputs).size,4,`${kind} must sound different`);
    for(const [index,output] of outputs.entries()){
      assert.equal(api.canonical(output),core,`${kind} canonical parity for ${api.roster[index].id}`);
      assert.ok(output.includes(core),`${kind} must retain the full instruction`);
      assert.equal(api.intent(core),kind);
      assert.equal(api.frame(core,api.roster[index].id),output.slice(api.roster[index].name.length+2));
    }
  }
});
test('live cues stay within one sentence and 72 characters while preserving the canonical action',()=>{
  const api=load(flags),messages=[
    'Shift in the bright band. Retry at the next marker.',
    'Release a NOS pulse.',
    'Hold a controlled slide.',
    'Lift now; power is reduced.',
    'Brake earlier.',
    'Back on the line.',
    'You reached the finish.',
    'Keep the car inside the track boundary.'
  ];
  for(const message of messages){
    const outputs=api.roster.map(coach=>api.live(message,coach.id));
    assert.equal(new Set(outputs).size,4);
    for(const output of outputs){
      assert.ok(output.length<=72,output);
      assert.equal((output.match(/[.!?]/g)||[]).length,1,output);
      assert.equal(api.canonical(`Coach ${api.roster.find(coach=>output===api.live(message,coach.id)).name.slice(6)}: ${output}`),message.split(/(?<=[.!?])\s+/)[0]);
    }
  }
});
test('canonical Race events map to supportive expressions',()=>{
  const api=load(flags);
  assert.deepEqual(['setup','correct','mistake','recovery','award','win','loss','pause','instruction'].map(event=>api.expressionFor(event)),['ready','celebrate','concern','encourage','celebrate','celebrate','encourage','encourage','focus']);
  assert.equal(api.expressionFor('unknown'),'ready');
});
