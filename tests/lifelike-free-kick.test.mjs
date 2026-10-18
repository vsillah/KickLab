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

test('counter-rotates torso and pelvis through strike and balanced recovery',()=>{
  const plant=core.pose(kick({state:'swing',phi:-.2}),'full');
  const strike=core.pose(kick({state:'swing',phi:.33,contact:true}),'full');
  const follow=core.pose(kick({state:'flight',flightT:.35}),'full');
  const recover=core.pose(kick({state:'flight',flightT:1}),'full');
  assert.ok(plant.motion.torso<0&&plant.motion.pelvis>0);
  assert.ok(strike.motion.torso>0&&strike.motion.pelvis<0);
  assert.ok(follow.motion.heelLift>0&&follow.motion.balance>strike.motion.balance);
  assert.ok(Math.abs(recover.motion.torso)<Math.abs(follow.motion.torso));
  assert.ok(Math.abs(recover.motion.pelvis)<Math.abs(follow.motion.pelvis));
});

test('keeps adult shoulder and hip mass wider than the v1 capsule spacing',()=>{
  for(const sample of [kick(),kick({state:'swing',phi:-.2}),kick({state:'flight',flightT:.35})]){
    const {joints}=core.pose(sample,'full');
    assert.ok(Math.abs(joints.shF.x-joints.shR.x)>=.14,'shoulder mass collapsed');
    assert.ok(Math.abs(joints.hipF.x-joints.hipR.x)>=.1,'hip mass collapsed');
    assert.ok(joints.head.y-joints.pelvis.y>.75,'adult vertical proportion collapsed');
  }
});

test('full mode owns differentiated volumetric anatomy and readable foot mechanics',()=>{
  for(const renderer of ['drawLifelikeAthlete','drawLifelikeHead','drawLifelikeBoot','drawMechanicsLens','lifelikeBentLimb','lifelikeJointBlend'])assert.match(source,new RegExp(`function ${renderer}\\(`));
  for(const part of ['head','face','neck','shoulders','chest','pelvis','upper-limbs','lower-limbs','ankles','heels','toes','boots'])assert.match(source,new RegExp(`['"]${part}['"]`));
  assert.match(source,/self-authored-volumetric-procedural/);
  assert.match(source,/mechanicsLens=true/);
  assert.doesNotMatch(source,/RIG\.side\(c,J/);
});

test('differentiates canonical speed and power kit profiles without shadow telemetry',()=>{
  assert.match(source,/profile==='power'/);
  assert.match(source,/profile==='speed'/);
  assert.match(source,/audit\.kitSelection=kit\(\)/);
  assert.match(source,/audit\.kitTelemetry=kitState\(\)/);
  assert.match(source,/audit\.kitProfile=equipment\.boot\.profile/);
  assert.doesNotMatch(source,/shotMultiplier\s*=|skillTimingMultiplier\s*=/);
});

test('keeps source local, asset-free, storage-neutral, and replay-compatible',()=>{
  assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//);
  assert.doesNotMatch(source,/localStorage|sessionStorage|impactlab\.v1|impactlab\.nick/);
  assert.match(source,/characterMode=mode/);
  assert.match(source,/originalApplySnap/);
  assert.match(source,/if\(pocVisible\)window\.__KICKLAB_CHARACTER_POC_QA__/);
  const replay=readFileSync(join(root,'src/index.html'),'utf8');
  assert.match(replay,/data-sp="0\.25"/);
});
