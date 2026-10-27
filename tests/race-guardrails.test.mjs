import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {local,raceContext} from './helpers/race-origin.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const context=raceContext(local('?raceSystems=proxy'));
const api=vm.runInNewContext(read('../src/game/19-race-systems.js')+'\n'+read('../src/game/19e-race-guardrails.js')+'\n({systems:RACE_SYSTEMS,rail:RACE_GUARDRAILS})',context);
const {systems,rail}=api,venue=systems.venue('highland');
const P={L:120,R:32,m:1400,F:8500,top:55,mu:.9,Lwb:2.7,ratio:15,expansionCourse:'straight'};
const state=(y=0,v=20,th=0)=>({x:40,y,th,v,t:0,e:-y,...systems.initial()});
function contact({y=8.05,v=20,th=0,from=7.8,dt=.004}={}){const q=rail.initial(),s=state(y,v,th);s.t=.4;return{q,s,event:rail.step(q,s,{x:40,y:from},P,venue,7,dt)};}

test('clean driving and original oversteer dynamics stay untouched',()=>{
  const q=rail.initial(),s=state();for(let i=0;i<250;i++){const old={x:s.x,y:s.y};systems.step(s,P,{gas:.35,wheel:0},.004,venue);assert.equal(rail.step(q,s,old,P,venue,7,.004),null);}
  assert.equal(q.contacts,0);assert.equal(q.recoveries,0);
  const a=state(),b=state();for(let i=0;i<180;i++){systems.step(a,P,{gas:.3,wheel:55,handbrake:true},.004,venue);systems.step(b,P,{gas:.3,wheel:55,handbrake:true},.004,venue);}assert.equal(JSON.stringify(a),JSON.stringify(b));assert.ok(a.slipAngle>.2);
});

test('shallow rail rub gives one bounded scrape without an outward ricochet',()=>{
  const {q,s,event}=contact({y:8.27,from:8.26,v:21,th:0});assert.equal(event.type,'scrape');assert.ok(s.v>20);assert.ok(Math.abs(s.e)<=8.3);assert.equal(q.broken.size,0);
  const repeat=rail.step(q,s,{x:s.x,y:s.y},P,venue,7,.004);assert.equal(repeat,null);assert.equal(q.contacts,1);
});

test('low speed normal impact dents, high energy impact opens a local rail gap',()=>{
  const dent=contact({y:8.8,from:8.76,v:9,th:-.5});assert.equal(dent.event.type,'dent');assert.ok(dent.event.depth>0&&dent.event.depth<=.55);assert.ok(dent.s.v<9);assert.ok(Math.abs(dent.s.e)<=8.3);
  const hit=contact({y:8.8,from:8.70,v:22,th:-.7});assert.equal(hit.event.type,'break');assert.equal(hit.q.broken.size,1);assert.equal(hit.s.y,8.8);const next=rail.step(hit.q,hit.s,{x:40,y:8.7},P,venue,7,.004);assert.equal(next,null);
  const noBreak=contact({y:8.8,from:8.75,v:11,th:-.5});assert.notEqual(noBreak.event.type,'break');
});

test('stranded car gets one timed centerline recovery with forward low speed',()=>{
  const q=rail.initial(),s=state(15,0,2.8);let event=null;for(let i=0;i<255;i++){s.t+=.004;event=rail.step(q,s,{x:s.x,y:s.y},P,venue,7,.004)||event;}assert.equal(event.type,'recovery-start');assert.equal(q.recoveries,1);assert.ok(q.recovering>0);
  for(let i=0;i<81;i++)rail.tickRecovery(q,s,P,venue,.004);assert.equal(q.recovering,0);assert.ok(Math.abs(s.e)<1e-6);assert.equal(s.v,2);assert.equal(s.th,0);assert.equal(s.y,0);assert.equal(s.latV,0);
  for(let i=0;i<300;i++){s.t+=.004;rail.step(q,s,{x:s.x,y:s.y},P,venue,7,.004);}assert.equal(q.recoveries,1);
});

test('event pool stays bounded under repeated rail contacts',()=>{
  const q=rail.initial(),s=state(8.8,8,-.25);for(let i=0;i<1200;i++){s.t+=.004;s.y=8.8;rail.step(q,s,{x:s.x,y:8.65},P,venue,7,.004);}assert.ok(q.events.length<=24);assert.equal(q.contacts,1);assert.equal(q.broken.size,0);
});

test('three vehicle masses use the same bounded energy rule and reset clears damage',()=>{
  for(const mass of [880,1400,1720]){
    const q=rail.initial(),s=state(8.8,22,-.7),car={...P,m:mass};s.t=.5;
    const event=rail.step(q,s,{x:40,y:8.7},car,venue,7,.004);
    assert.equal(event.type,'break');assert.ok(Number.isFinite(event.energy));assert.ok(q.broken.size===1);
    const next=rail.initial();assert.equal(next.broken.size,0);assert.equal(next.dents.size,0);assert.equal(next.contacts,0);
  }
});
