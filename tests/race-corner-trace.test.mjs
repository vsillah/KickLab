import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {local,pages,raceContext} from './helpers/race-origin.mjs';

const systems=readFileSync(new URL('../src/game/19-race-systems.js',import.meta.url),'utf8');
const telemetry=readFileSync(new URL('../src/game/19a-race-telemetry.js',import.meta.url),'utf8');
const trace=readFileSync(new URL('../src/game/19b-race-corner-trace.js',import.meta.url),'utf8');
function load(location=local('?raceCornerTrace=prototype')){
  const Race={V:{mu:.9,F:8500,m:1400,R:32},L:120,HW:7,RATIO:15,opt:{car:'street',steer:'you',venue:'highland'},CARS:{street:{top:55,Lwb:2.7}},st:{x:103,y:0,th:0,v:18,t:0,e:0,zone:0,latV:0,slipAngle:0,driftMode:'none',skidTime:0,driftHold:0,nitro:1,nitroCooldown:0},inp:{gas:true,brake:false},telemetry:{heat:.2,overheat:false,lock:'',nosPulse:0,grip:1},wheel:26,state:'run',vars(){return[{id:'mu',step:.05,min:.3,max:1.6},{id:'F',step:100,min:1000,max:15000},{id:'m',step:10,min:150,max:2000},{id:'R',step:1,min:20,max:60}];},P(){return{L:this.L,R:this.V.R,m:this.V.m,F:this.V.F,top:55,mu:this.V.mu*.94,tireMu:this.V.mu,Lwb:2.7,ratio:15};}};
  const context=raceContext(location,{Race,M:Race,PAUSE:{on:false},RP:{on:false},RACE_3D:{shouldBlockInput:()=>false},isLocked:()=>false,adjustVar(id,delta){const def=Race.vars().find(v=>v.id===id);Race.V[id]=Math.min(def.max,Math.max(def.min,Math.round((Race.V[id]+delta)/def.step)*def.step));return true;}});
  const api=vm.runInNewContext(systems+'\n'+telemetry+'\n'+trace+'\n({systems:RACE_SYSTEMS,trace:RACE_CORNER_TRACE})',context);return{...api,Race,context};
}
const gap=(a,b)=>Math.hypot(a.exit.x-b.exit.x,a.exit.y-b.exit.y);
test('corner trace is default off, trusted-location only, and tunes the canonical bounded variable',()=>{assert.equal(load(local()).trace.enabled,false);assert.equal(load(pages()).trace.enabled,false);assert.equal(load(pages('?raceCornerTrace=prototype')).trace.enabled,true);assert.equal(load({...pages('?raceCornerTrace=prototype'),pathname:'/Other/'}).trace.enabled,false);const {trace,Race}=load();assert.equal(trace.enabled,true);const before=Race.V.mu;assert.equal(trace.tune(1),true);assert.ok(Race.V.mu>before);assert.equal(trace.tune(-1),true);assert.equal(Race.V.mu,before);trace.select(1);assert.equal(trace.variable().id,'F');assert.equal(trace.tune(1),true);assert.equal(Race.V.F,8600);for(let i=0;i<200;i++)trace.tune(1);assert.equal(Race.V.F,15000);});
test('prediction copies canonical state and responds to grip, brake, steering, slip and heat',()=>{const {trace,Race}=load(),original=JSON.stringify(Race.st),base=trace.predict();Race.V.mu=1.5;const grip=trace.predict();Race.V.mu=.9;Race.inp.brake=true;const brake=trace.predict();Race.inp.brake=false;Race.wheel=55;const steer=trace.predict();Race.wheel=26;Race.st.slipAngle=.3;const slip=trace.predict();Race.st.slipAngle=0;Race.telemetry.overheat=true;Race.telemetry.heat=.96;const heat=trace.predict();assert.equal(JSON.stringify(Race.st),original);for(const [name,variant] of Object.entries({grip,brake,steer,slip,heat}))assert.ok(gap(base,variant)>.05,`${name} changes projected exit`);assert.equal(base.points.length,61);assert.ok(['safe','understeer','oversteer'].includes(base.state));});
test('fixed-horizon prediction stays within a bounded CPU budget',()=>{const {trace}=load(),start=performance.now();for(let i=0;i<1000;i++)trace.predict();assert.ok(performance.now()-start<5000,'predictor must average under 5 ms per sample');});
