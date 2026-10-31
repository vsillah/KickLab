import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

await import('../src/shared/profile-race-records.js');
await import('../src/shared/profile-avatar-art.js');
await import('../src/shared/profile-store.js');
const records=globalThis.KickLabProfileRaceRecords;
const source=readFileSync(new URL('../src/game/49-profiles.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');

test('migrates absent and malformed Race record data deterministically',()=>{
  const empty={version:1,topKmh:null,dragSeconds:null,driftPoints:null};
  assert.deepEqual(records.normalize(undefined),empty);
  assert.deepEqual(records.normalize({topKmh:-1,dragSeconds:'bad',driftPoints:Infinity}),empty);
  assert.deepEqual(records.normalize({topKmh:172.5,dragSeconds:12.31,driftPoints:264}),{version:1,topKmh:172.5,dragSeconds:12.31,driftPoints:264});
});

test('keeps Race record maxima and minimum while leaving input unchanged',()=>{
  const old={version:1,topKmh:120,dragSeconds:15,driftPoints:200};
  const next=records.record(old,{topKmh:140,dragSeconds:14.2,driftPoints:180});
  assert.deepEqual(old,{version:1,topKmh:120,dragSeconds:15,driftPoints:200});
  assert.deepEqual(next,{version:1,topKmh:140,dragSeconds:14.2,driftPoints:200});
  assert.deepEqual(records.record(next,{topKmh:100,dragSeconds:18,driftPoints:310}),{version:1,topKmh:140,dragSeconds:14.2,driftPoints:310});
});

test('Race records stay inside the active local profile and legacy mirror',()=>{
  const data=new Map([['impactlab.v1',JSON.stringify({xp:9,goals:4})],['impactlab.nick','First']]);
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const manager=globalThis.KickLabProfiles.createManager(storage,{now:()=>1,makeId:()=> 'second'});
  const first=manager.active().id;
  manager.create({nickname:'Second'});
  manager.saveActiveProgress({xp:20,raceProfileRecords:records.record(null,{topKmh:140,dragSeconds:13})});
  manager.switchTo(first);
  assert.deepEqual(manager.active().progress,{xp:9,goals:4});
  assert.equal(JSON.parse(data.get('impactlab.v1')).raceProfileRecords,undefined);
  assert.equal(manager.list().find(item=>item.id==='second').progress.raceProfileRecords.topKmh,140);
});

test('Race control style reports the saved profile choice at home and live Race choice',()=>{
  const helper=source.match(/function profileRaceControlStyle\(\)\{[^}]+\}/)?.[0];
  assert.ok(helper);
  for(const [saved,expected] of [[undefined,'Classic'],['analog','Analog'],['simulator','Simulator']]){
    const actual=runInNewContext(`${helper};profileRaceControlStyle()`,{best:{racePauseSetup:{control:saved}},M:null,Race:{},RACE_SIMULATOR:{active:false},ANALOG_CONTROL:{enabled:false},$:()=>({hidden:true})});
    assert.equal(actual,expected,`home should report ${expected} from the active profile`);
  }
  for(const [simulator,analog,expected] of [[false,false,'Classic'],[false,true,'Analog'],[true,false,'Simulator']]){
    const race={};
    const actual=runInNewContext(`${helper};profileRaceControlStyle()`,{best:{racePauseSetup:{control:'classic'}},M:race,Race:race,RACE_SIMULATOR:{active:simulator},ANALOG_CONTROL:{enabled:analog},$:()=>({hidden:false})});
    assert.equal(actual,expected,`active Race should report ${expected}`);
  }
  assert.match(source,/control=profileRaceControlStyle\(\)/);
});

test('profile sections keep lab metrics in their own renderers',()=>{
  for(const lab of ['overview','fight','race','kick'])assert.match(html,new RegExp(`data-profile-lab="${lab}"`));
  assert.match(source,/PROFILE_UI\.lab=inGame&&M\?\.key\|\|'overview'/);
  const fight=source.slice(source.indexOf('function profileFight()'),source.indexOf('function profileRace()'));
  const race=source.slice(source.indexOf('function profileRace()'),source.indexOf('function profileKick()'));
  const kick=source.slice(source.indexOf('function profileKick()'),source.indexOf('function renderProfileSummary()'));
  assert.doesNotMatch(race,/KI\(|Ball|Boots|goals|mWins|Crossbar/);
  assert.doesNotMatch(fight,/raceGarage|mWins|goals/);
  assert.match(kick,/KI\('press'\).*KI\('boot'\).*mWins/);
  for(const label of ['Selected vehicle','Garage build','Coach','Control style','Driver progress','Championship','Race collectibles','Best lap','Top speed','Drag time','Drift points','Local multiplayer'])assert.ok(race.includes(label),label);
  assert.doesNotMatch(source.slice(source.indexOf('function renderProfileSummary()'),source.indexOf('function renderProfileList()')),/Rounds|Best records|Match wins/);
});
