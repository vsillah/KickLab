import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

const source=readFileSync(new URL('../src/shared/race-multiplayer.js',import.meta.url),'utf8');
function harness(search='?raceMultiplayer=prototype'){
  const localStorage=new Proxy({}, {get(){throw Error('match must not read storage');},set(){throw Error('match must not write storage');}});
  const scope={location:{search},KickLabRaceOrigin:{trusted:()=>true},localStorage,URLSearchParams};
  scope.globalThis=scope;runInNewContext(source,scope);return scope.KickLabRaceMultiplayer;
}
const contract={mode:'drag',vehicle:'street',garage:{body:'street',tires:'standard'},venue:'highland',steer:'you',rules:'race-expansion-v1',target:'Pass drag target',mu:.9,radius:32,force:8500,mass:1400};
const trace=[{t:0,p:0},{t:12,p:402}];

test('prototype is default off and trusted-origin gated',()=>{
  assert.equal(harness('').enabled(),false);assert.equal(harness().enabled(),true);
  const scope={location:{search:'?raceMultiplayer=prototype'},KickLabRaceOrigin:{trusted:()=>false},URLSearchParams};scope.globalThis=scope;runInNewContext(source,scope);assert.equal(scope.KickLabRaceMultiplayer.enabled(),false);
});
test('frozen contract, alternating seats, and result only after both valid runs',()=>{
  const api=harness(),match=api.create('a','b',contract);assert.equal(api.result(match),null);assert.equal(api.begin(match,'b',contract),false);assert.equal(api.begin(match,'a',{...contract,mu:1.4}),false);assert.equal(api.begin(match,'a',contract),true);
  assert.equal(api.finish(match,'a',contract,{pass:true,score:1200,time:12,measure:'12 s'},trace),true);assert.equal(match.phase,'handoff');assert.equal(api.result(match),null);assert.equal(api.begin(match,'b',contract),false);assert.equal(api.handoff(match,'b'),true);assert.equal(api.begin(match,'b',contract),true);
  assert.equal(api.finish(match,'b',contract,{pass:true,score:1250,time:11,measure:'11 s'},trace),true);assert.equal(match.phase,'result');assert.equal(api.result(match).winner,'B');assert.equal(api.result(match).difference,50);assert.equal(match.contract.garage.body,'street');
});
test('failure and retry keep outcome uncommitted; contract drift blocks it',()=>{
  const api=harness(),match=api.create('a','b',contract);api.begin(match,'a',contract);assert.equal(api.finish(match,'a',contract,{pass:false,score:900},trace),false);assert.equal(match.phase,'retryA');assert.equal(match.a,null);assert.equal(api.result(match),null);assert.equal(api.retry(match,'a'),true);api.begin(match,'a',contract);api.finish(match,'a',contract,{pass:true,score:1000,time:14},trace);api.handoff(match,'b');api.begin(match,'b',contract);
  assert.equal(api.finish(match,'b',{...contract,steer:'auto'},{pass:true,score:1100,time:13},trace),false);assert.equal(match.phase,'blocked');assert.equal(match.b,null);assert.equal(api.result(match),null);
});
test('mode-neutral comparison uses time for core and score for named modes',()=>{
  const api=harness();for(const mode of ['core','drag','circuit','endurance']){const setup={...contract,mode},match=api.create('a','b',setup);api.begin(match,'a',setup);api.finish(match,'a',setup,{pass:true,score:10,time:10},trace);api.handoff(match,'b');api.begin(match,'b',setup);api.finish(match,'b',setup,{pass:true,score:9,time:9},trace);assert.equal(api.result(match).winner,mode==='core'?'B':'A');}
});
