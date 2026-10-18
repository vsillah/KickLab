import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(join(root,'src/game/33-lifelike-free-kick.js'),'utf8');
const stadiumSource=readFileSync(join(root,'src/game/30-kick-sideview.js'));
const mainLoopSource=readFileSync(join(root,'src/game/70-main-loop.js'),'utf8');
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

test('keeps shoulder elbow wrist order and bend direction anatomical in every clip',()=>{
  const samples=[
    kick(),kick({state:'swing',phi:-.8}),kick({state:'swing',phi:-.4}),kick({state:'swing',phi:.33,contact:true}),
    kick({state:'flight',flightT:.25}),kick({state:'flight',flightT:1}),kick({state:'done',outcome:'goal',cheerT:1})
  ];
  const cross=(A,K,B)=>(K.x-A.x)*(B.y-K.y)-(K.y-A.y)*(B.x-K.x);
  for(const sample of samples){
    const {clip,joints:J}=core.pose(sample,'full');
    for(const [side,shoulder,elbow,wrist,expected] of [['front',J.shF,J.elF,J.haF,1],['rear',J.shR,J.elR,J.haR,-1]]){
      const low=Math.min(shoulder.y,wrist.y),high=Math.max(shoulder.y,wrist.y);
      assert.ok(elbow.y>low&&elbow.y<high,`${clip} ${side} elbow must stay between shoulder and wrist`);
      assert.equal(Math.sign(cross(shoulder,elbow,wrist)),expected,`${clip} ${side} forearm bends backward`);
    }
  }
});

test('mirrors anatomical elbow bends without changing their joint order',()=>{
  const root={x:-.5,y:1.5},target={x:-.9,y:1.2},elbow=core.armElbow(root,target,-1,1),mirror=point=>({x:-point.x,y:point.y});
  const mirrored=core.armElbow(mirror(root),mirror(target),-1,-1);
  assert.ok(Math.abs(mirrored.x+elbow.x)<1e-9);
  assert.ok(Math.abs(mirrored.y-elbow.y)<1e-9);
  assert.ok(mirrored.y>target.y&&mirrored.y<root.y);
});

test('keeps the approved PR 20 stadium composition byte-for-byte unchanged and unobscured',()=>{
  assert.equal(createHash('sha256').update(stadiumSource).digest('hex'),'2ff5be0f1664d22d3f4abb8e569a19ed68a582a448b80f20749322d582642477');
  assert.match(source,/audit\.stadiumUnobscured=true/);
  assert.doesNotMatch(source,/character-poc|data-character-mode|characterPocDetail|Character renderer proof of concept|Current Canvas athlete|Full-motion local character/);
  assert.match(source,/setCharacterMode\(next\)\{setMode\(next\)/);
});

test('composites Physics Vision as transparent annotations over the live stadium',()=>{
  assert.match(mainLoopSource,/composition:'transparent-annotation-layer',backdropAlpha:0/);
  assert.match(mainLoopSource,/if\(physicsVision\)\{ctx\.save\(\);ctx\.globalAlpha=E\.env;M\.drawXray\(ctx\);ctx\.restore\(\);\}/);
  assert.doesNotMatch(mainLoopSource,/physicsVision\)[^\n]*fillRect/);
  assert.doesNotMatch(mainLoopSource,/globalAlpha=0\.72\*E\.env/);
});

test('defines a connected anatomical Physics Vision model with differentiated movement chains',()=>{
  for(const renderer of ['xrayBone','xrayJoint','xrayTag','drawAnatomicalPhysicsOverlay'])assert.match(source,new RegExp(`function ${renderer}\\(`));
  for(const part of ['skull','neck','spine','rib-cage','shoulders','elbows','wrists','hands','pelvis','hips','knees','ankles','feet'])assert.match(source,new RegExp(`['"]${part}['"]`));
  assert.match(source,/jointMarkers:\['socket','hinge','wrist','ankle'\]/);
  assert.match(source,/plantLeg:'rear-green',strikingLeg:'front-orange'/);
  assert.match(source,/transparentBackdrop:true/);
  assert.match(source,/Kick\.drawXray=function\(c\).*drawAnatomicalPhysicsOverlay/);
});

test('full mode owns differentiated volumetric anatomy and readable foot mechanics',()=>{
  for(const renderer of ['drawLifelikeAthlete','drawLifelikeHead','drawLifelikeBoot','lifelikeBentLimb','lifelikeJointBlend'])assert.match(source,new RegExp(`function ${renderer}\\(`));
  for(const part of ['head','face','neck','shoulders','chest','pelvis','upper-limbs','lower-limbs','ankles','heels','toes','boots'])assert.match(source,new RegExp(`['"]${part}['"]`));
  assert.match(source,/self-authored-volumetric-procedural/);
  assert.match(source,/audit\.mechanicsLens=false/);
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
