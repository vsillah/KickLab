import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../src/shared/race-championship.js',import.meta.url),'utf8');
const context={URLSearchParams,globalThis:{KickLabRaceOrigin:{trusted:()=>true},KickLabRaceModes:{enabled:()=>true}},location:{search:'?raceChampionship=prototype'}};
runInNewContext(source,context);
const season=context.globalThis.KickLabRaceChampionship;

test('championship requires the trusted explicit flag and Race expansion',()=>{
  assert.equal(season.enabled(),true);
  context.location.search='';assert.equal(season.enabled(),false);
  context.location.search='?raceChampionship=prototype';context.globalThis.KickLabRaceModes.enabled=()=>false;assert.equal(season.enabled(),false);
  context.globalThis.KickLabRaceModes.enabled=()=>true;
});

test('five event ladder rejects skips and awards one cosmetic crest per clear',()=>{
  let state=season.normalize({version:0,results:{drag:{score:900,points:15}}});
  assert.equal(Object.keys(state.results).length,0);
  assert.equal(season.complete(state,'endurance',{pass:true,score:2200},'aegis').accepted,false);
  for(const event of season.EVENTS){const result=season.complete(state,event.id,{pass:true,score:1000},'cobalt');assert.equal(result.accepted,true);assert.ok(result.newAward);state=result.state;}
  assert.equal(Object.keys(state.results).length,5);
  assert.equal(season.points(state),60);
  assert.equal(season.complete(state,'endurance',{pass:true,score:900},'aegis').newAward,null);
  assert.equal(season.complete(state,'endurance',{pass:false,score:3000},'aegis').accepted,false);
});

test('records and standings remain profile local and migration bounds ghost data',()=>{
  const first=season.complete(null,'drag',{pass:true,score:1100},'kestrel',[{t:1,p:20},{t:-1,p:4},{t:2,p:40}]).state;
  const second=season.normalize(null);
  assert.equal(second.results.drag,undefined);
  assert.equal(first.results.drag.trace.length,2);
  const rows=season.standings([{id:'a',progress:{raceChampionship:first}},{id:'b',progress:{raceChampionship:second}}]);
  assert.equal(rows[0].profileId,'a');assert.equal(rows[1].points,0);
  assert.equal(rows[0].alias,'Racer 1');
});
test('championship records preserve advanced vehicle identities',()=>{
  for(const vehicle of ['vesper','sable']){
    const state=season.complete(null,'drag',{pass:true,score:1100},vehicle).state;
    assert.equal(season.normalize(state).results.drag.vehicle,vehicle);
  }
});
