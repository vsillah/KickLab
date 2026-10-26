import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../src/shared/race-quick-challenge.js',import.meta.url),'utf8');
const modes={drag:{target:'Finish within 19 s and reach 95 km/h at the trap.'}};
function codec(){const root={KickLabRaceModes:{MODES:modes},TextEncoder,TextDecoder,btoa,atob};root.globalThis=root;runInNewContext(source,root);return root.KickLabRaceQuickChallenge;}
const contract={mode:'drag',vehicle:'street',garage:{version:1,body:'street',suspension:'balanced',tires:'balanced',brakes:'standard'},venue:'highland',steer:'you',rules:'race-expansion-v1',target:modes.drag.target,mu:.9,radius:32,force:8500,mass:1400};
const run={score:950,time:12,trace:[[0,0,0,0,0],[12,240,0,0,240]]};
test('deterministic private challenge and response round trip',()=>{const c=codec(),one=c.challenge('Ayo',contract,run),two=c.challenge('Ayo',contract,run);assert.equal(one,two);assert.equal(c.decode(one).alias,'Ayo');assert.equal(c.decode(one).run.trace.length,2);const reply=c.response('Bisi',one,{...run,score:1000});const decoded=c.decode(reply);assert.equal(decoded.kind,'response');assert.equal(decoded.challenge,c.checksum(one));assert.equal(decoded.score,1000);});
test('damaged, oversized, injected and impossible packets fail closed',()=>{const c=codec(),code=c.challenge('Ayo',contract,run);assert.throws(()=>c.decode(code.slice(0,-1)+(code.endsWith('0')?'1':'0')),/Damaged|Invalid/);assert.throws(()=>c.decode('x'.repeat(c.MAX_CODE+1)),/Invalid/);assert.throws(()=>c.challenge('<img src=x>',contract,run),/alias/);assert.throws(()=>c.challenge('Ayo',{...contract,venue:'private'},run),/setup/);assert.throws(()=>c.challenge('Ayo',contract,{...run,trace:[[0,0,0,0,0],[8,240,0,0,240]]}),/Ghost time/);assert.throws(()=>c.challenge('Ayo',contract,{...run,trace:[[0,0,0,0,0],[12,Infinity,0,0,240]]}),/ghost frame/);assert.throws(()=>c.challenge('Ayo',contract,{...run,trace:Array.from({length:97},(_,i)=>[i,0,0,0,0])}),/result/);const forged={v:1,kind:'challenge',alias:'<script>alert(1)</script>',contract,run};const json=JSON.stringify(forged),payload=Buffer.from(json).toString('base64url');assert.throws(()=>c.decode(`KLQ1.${payload}.${c.checksum(json)}`),/Unsupported/);});
