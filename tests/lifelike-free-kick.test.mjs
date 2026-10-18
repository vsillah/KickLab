import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(join(root,'src/game/33-lifelike-free-kick.js'),'utf8');
const sandbox={URLSearchParams};sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'33-lifelike-free-kick.js'});
const core=sandbox.KickLabCharacterCore;
const kick=(overrides={})=>({state:'aim',phi:-1,contact:false,flightT:0,cheerT:0,outcome:null,BR:.11,ball:{x:0,y:.11},...overrides});

test('keeps the renderer flag default-off and resolves all fallback modes',()=>{
  assert.equal(core.modeFromSearch('',false),'canvas');
  assert.equal(core.modeFromSearch('?kicklabPoc=1',false),'canvas');
  assert.equal(core.modeFromSearch('?kicklabCharacter=full',false),'full');
  assert.equal(core.modeFromSearch('?kicklabCharacter=full',true),'reduced');
  assert.equal(core.modeFromSearch('?kicklabCharacter=reduced',false),'reduced');
  assert.equal(core.modeFromSearch('?kicklabCharacter=unknown',false),'canvas');
});

test('defines one rig driven by seven semantic animation clips',()=>{
  assert.deepEqual([...core.clipOrder],['ready','approach','plant','strike','follow-through','recover','celebration']);
  for(const clip of core.clipOrder){assert.ok(core.CLIPS[clip].duration>0);assert.ok(core.CLIPS[clip].events.length>0);}
  assert.match(source,/semantic\('boot-ball-contact',lastClip\);semantic\('physics-contact',lastClip\)/);
});

test('selects each semantic state from physics-owned kick state',()=>{
  assert.equal(core.clipForKick(kick()),'ready');
  assert.equal(core.clipForKick(kick({state:'swing',phi:-.8})),'approach');
  assert.equal(core.clipForKick(kick({state:'swing',phi:-.4})),'plant');
  assert.equal(core.clipForKick(kick({state:'swing',phi:.2})),'strike');
  assert.equal(core.clipForKick(kick({state:'flight',flightT:.2})),'follow-through');
  assert.equal(core.clipForKick(kick({state:'flight',flightT:1})),'recover');
  assert.equal(core.clipForKick(kick({state:'done',outcome:'goal',cheerT:1})),'celebration');
});

test('locks plant foot and aligns boot contact inside hard geometry thresholds',()=>{
  const samples=[
    kick({state:'swing',phi:-.4}),
    kick({state:'swing',phi:.33,contact:true}),
    kick({state:'flight',flightT:.25}),
    kick({state:'done',outcome:'goal',cheerT:1})
  ];
  for(const sample of samples){
    const pose=core.pose(sample,'full');
    assert.ok(pose.metrics.plantDrift<=.02,`${pose.clip} plant drift ${pose.metrics.plantDrift} m`);
    assert.ok(pose.metrics.groundPenetration<=.01,`${pose.clip} ground penetration ${pose.metrics.groundPenetration} m`);
  }
  const contact=core.pose(samples[1],'full');
  assert.equal(contact.clip,'strike');
  assert.ok(contact.metrics.contactError<=.03,`contact error ${contact.metrics.contactError} m`);
  assert.ok(Math.abs(contact.joints.toF.x-contact.contactTarget.x)<1e-9);
  assert.ok(Math.abs(contact.joints.toF.y-contact.contactTarget.y)<1e-9);
});

test('reduced motion uses the same skeleton and deterministic endpoint poses',()=>{
  const sample=kick({state:'swing',phi:-.35});
  const full=core.pose(sample,'full'),reduced=core.pose(sample,'reduced');
  assert.deepEqual(Object.keys(reduced.joints),Object.keys(full.joints));
  assert.ok([0,1].includes(reduced.t));
  assert.equal(core.pose(sample,'reduced').t,reduced.t);
});

test('keeps source local, asset-free, storage-neutral, and replay-compatible',()=>{
  assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//);
  assert.doesNotMatch(source,/localStorage|sessionStorage|impactlab\.v1|impactlab\.nick/);
  assert.match(source,/characterMode=mode/);
  assert.match(source,/originalApplySnap/);
  const replay=readFileSync(join(root,'src/index.html'),'utf8');
  assert.match(replay,/data-sp="0\.25"/);
});
