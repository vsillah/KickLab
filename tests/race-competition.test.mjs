import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const origin=readFileSync(new URL('../src/shared/race-origin.js',import.meta.url),'utf8');
const source=readFileSync(new URL('../src/shared/race-competition.js',import.meta.url),'utf8');
function context(location){const scope={location,URLSearchParams};vm.runInNewContext(origin,scope);vm.runInNewContext(source,scope);return scope.KickLabRaceCompetition;}
const local=(search='')=>({protocol:'http:',hostname:'127.0.0.1',port:'4173',pathname:'/kicklab.html',search});

test('Race competition stays off without a trusted explicit prototype flag',()=>{
  assert.equal(context(local()).enabled(),false);
  assert.equal(context(local('?raceCompetition=prototype')).enabled(),true);
  assert.equal(context({...local('?raceCompetition=prototype'),hostname:'example.com'}).enabled(),false);
  assert.equal(context({...local('?raceCompetition=prototype'),protocol:'file:'}).enabled(),false);
});

test('qualifying results unlock only cosmetic awards and improve the correct score direction',()=>{
  const competition=context(local('?raceCompetition=prototype'));
  let result=competition.record({}, {category:'core',passed:true,score:19.2,vehicle:'Kart',at:1});
  assert.equal(result.earned.name,'Checkered Flag');
  assert.equal(result.state.bests.core.score,19.2);
  result=competition.record(result.state,{category:'core',passed:true,score:20,vehicle:'Kart',at:2});
  assert.equal(result.improved,false);assert.equal(result.earned,null);
  result=competition.record(result.state,{category:'core',passed:true,score:18.4,vehicle:'Kart',at:3});
  assert.equal(result.state.bests.core.previous,19.2);
  assert.equal(result.state.bests.core.score,18.4);
  const failed=competition.record(result.state,{category:'endurance',passed:false,score:3000});
  assert.equal(failed.state.bests.endurance,undefined);
  const mode=competition.record(failed.state,{category:'endurance',passed:true,score:3000,vehicle:'Aegis'});
  assert.equal(mode.earned.perk,'Heat Tactician title');
  assert.equal(competition.record(mode.state,{category:'endurance',passed:true,score:3100}).improved,true);
  assert.equal(competition.record(mode.state,{category:'endurance',passed:true,score:2900}).improved,false);
});

test('device rankings use aliases, isolate profile records and share tied ranks',()=>{
  const competition=context(local('?raceCompetition=prototype'));
  const profiles=[
    {id:'a',nickname:'Private Name',progress:{raceCompetition:{bests:{drag:{score:950}}}}},
    {id:'b',nickname:'Another Name',progress:{raceCompetition:{bests:{drag:{score:1100}}}}},
    {id:'c',nickname:'Third Name',progress:{raceCompetition:{bests:{drag:{score:1100}}}}},
    {id:'d',nickname:'None',progress:{}}
  ];
  const rows=competition.rows(profiles,'drag');
  assert.equal(JSON.stringify(rows.map(row=>[row.alias,row.rank])),JSON.stringify([['Racer 2',1],['Racer 3',1],['Racer 1',3]]));
  assert.equal(JSON.stringify(rows).includes('Private Name'),false);
  assert.equal(competition.rows(profiles,'hill').length,0);
});
