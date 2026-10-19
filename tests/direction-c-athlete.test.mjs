import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { validateAssetSet } from '../scripts/lib/3d-assets.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const assetPath=join(root,'src/assets/3d/kicklab-direction-c-athlete/v2/kicklab-makehuman-athlete.glb');
const clips=['Celebrate','ComboVolley','CrossbarStrike','DribbleCycle','FollowThrough','HeaderContact','HeaderReady','KeeperDive','KeeperReady','PassContact','PenaltyStrike','Plant','Ready','Recovery','RunUp','Strike'];
globalThis.ProgressEvent??=class ProgressEvent{};
globalThis.self??=globalThis;
globalThis.createImageBitmap??=async()=>({width:128,height:128,close(){}});

async function loadAsset(){
  const bytes=readFileSync(assetPath),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  return new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,'',resolve,reject));
}

function pose(gltf,mixer,name,time){
  mixer.stopAllAction();const action=mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations,name));action.play();action.paused=true;action.time=time;mixer.update(0);gltf.scene.updateMatrixWorld(true);
}

test('ships one fail-closed, CC0-derived production athlete under the payload budget',async()=>{
  const {assets}=await validateAssetSet(),asset=assets.find(entry=>entry.manifest.assetId==='kicklab-direction-c-athlete'&&entry.manifest.version==='2');
  assert.ok(asset);
  assert.equal(asset.manifest.status,'approved-production');
  assert.equal(asset.manifest.provenance.sourceType,'official-core-derived');
  assert.equal(asset.manifest.provenance.externalInputs,true);
  assert.equal(asset.manifest.provenance.likeness,false);
  assert.equal(asset.manifest.provenance.cloudProcessing,false);
  assert.equal(asset.manifest.network.externalUrisAllowed,false);
  assert.equal(asset.manifest.license.basis,'cc0-official-core');
  assert.equal(asset.metrics.bytes,1643096);
  assert.ok(asset.metrics.bytes<=2_500_000);
  assert.equal(asset.report.issues.numErrors,0);
  assert.equal(asset.report.issues.numWarnings,0);
  assert.equal(asset.report.info.hasTextures,true);
  assert.equal(asset.report.info.resources.filter(resource=>resource.image).length,1);
  assert.equal(asset.report.info.materialCount,6);
  assert.equal(asset.report.info.animationCount,16);
  assert.equal(asset.report.info.totalTriangleCount,26502);
});

test('keeps the shared skeleton and approved free-kick contact events within ten millimeters',async()=>{
  const gltf=await loadAsset(),mixer=new THREE.AnimationMixer(gltf.scene),names=gltf.animations.map(clip=>clip.name).sort();
  assert.deepEqual(names,clips);
  let bones=0,geometryBytes=0;const arrays=new Set();gltf.scene.traverse(object=>{if(object.isBone)bones++;if(object.isMesh&&object.geometry){for(const attribute of Object.values(object.geometry.attributes)){if(!arrays.has(attribute.array)){arrays.add(attribute.array);geometryBytes+=attribute.array.byteLength;}}if(object.geometry.index&&!arrays.has(object.geometry.index.array)){arrays.add(object.geometry.index.array);geometryBytes+=object.geometry.index.array.byteLength;}}});
  const animationBytes=gltf.animations.reduce((sum,clip)=>sum+clip.tracks.reduce((trackSum,track)=>trackSum+track.times.byteLength+track.values.byteLength,0),0);
  assert.equal(bones,53);
  assert.ok(geometryBytes+animationBytes<=24*1024*1024);
  const marker=gltf.scene.getObjectByName('StrikeContact_R'),target=gltf.scene.getObjectByName('BallContactTarget'),plant=gltf.scene.getObjectByName('PlantContact_L'),world=node=>node.getWorldPosition(new THREE.Vector3());
  pose(gltf,mixer,'Plant',.56);const plantAnchor=world(plant);
  pose(gltf,mixer,'Strike',0);assert.ok(world(plant).distanceTo(plantAnchor)*1000<=10);
  pose(gltf,mixer,'Strike',.4);const contactDriftMm=world(marker).distanceTo(world(target))*1000,plantDriftMm=world(plant).distanceTo(plantAnchor)*1000,contactHeightMm=(world(marker).y-world(plant).y)*1000;
  assert.ok(contactDriftMm<=10,`contact drift ${contactDriftMm} mm`);
  assert.ok(plantDriftMm<=10,`plant drift ${plantDriftMm} mm`);
  assert.ok(Math.abs(contactHeightMm-110)<=10,`contact height ${contactHeightMm} mm`);
  pose(gltf,mixer,'FollowThrough',0);assert.ok(world(plant).distanceTo(plantAnchor)*1000<=10);
});

test('keeps the player-facing switch hidden and fails closed to existing fallbacks',()=>{
  const runtime=read('src/game/50a-direction-c-athlete.js'),renderer=read('src/game/50-renderer-3d.js'),html=read('src/index.html'),generator=read('scripts/generate-makehuman-athlete.py'),extension=read('scripts/extend-multi-activity-athlete.py');
  assert.match(runtime,/get\('renderer'\)===['"]direction-c['"]/);
  assert.match(runtime,/status:'flag-off'/);
  assert.match(runtime,/best\.gfx===['"]2d['"]\)return['"]canvas['"]/);
  assert.match(runtime,/get\('quality'\)===['"]low['"]\)return['"]reduced-quality['"]/);
  assert.match(runtime,/assets\/3d\/kicklab-direction-c-athlete\/v2\/kicklab-makehuman-athlete\.glb/);
  assert.match(runtime,/attackRight:Object\.freeze\(\{primaryYaw:Math\.PI\/2,opponentYaw:-Math\.PI\/2/);
  assert.match(runtime,/meetCrossLeft:Object\.freeze\(\{primaryYaw:-Math\.PI\/2,opponentYaw:-Math\.PI\/2/);
  assert.doesNotMatch(runtime,/https?:\/\//);
  assert.doesNotMatch(html,/Direction C|athlete dimensions|renderer chooser/i);
  assert.match(runtime,/if\(!PAUSE\.on&&!\(RP\.on&&!RP\.playing\)\)this\.clock\+=rdt\*\(RP\.on\?RP\.speed:1\)/);
  assert.match(renderer,/directionC\.useForSide\(K,o,x\)/);
  assert.match(renderer,/directionC\.useForWorld\(D,o,x,y\)/);
  assert.doesNotMatch(generator,/requests|urllib|https?:\/\//i);
  assert.doesNotMatch(extension,/requests|urllib|https?:\/\//i);
  assert.match(generator,/KICKLAB_MAKEHUMAN_CORE_ASSETS/);
});

test('keeps the controlled-player marker bound to the primary role across activities',()=>{
  const source=read('src/game/50a-direction-c-athlete.js');
  assert.match(source,/role:p\.role/);
  assert.match(source,/const role=p\.role===['"]dynamic['"]&&D\.state===['"]keep['"]\?['"]keeper['"]:p\.role===['"]dynamic['"]\?['"]attacker['"]:p\.role/);
  assert.match(source,/targetRoot:'KickLabDirectionCAthlete'/);
  assert.match(source,/opponentMarked:false/);
  assert.match(source,/this\.updateControlledIndicator\(true\)/);
});

test('defines a specific athlete, camera, and contact profile for all eight Kick activities',()=>{
  const runtime=read('src/game/50a-direction-c-athlete.js');
  const expected=[
    ['free','Free kick','side-free-kick','StrikeContact_R'],
    ['header','Header duel','side-header-duel','head'],
    ['run','1v1 Dribble','chase-dribble','StrikeContact_R'],
    ['pass','Passing','chase-passing-lane','StrikeContact_R'],
    ['combo','Combo attack','chase-combo-return','StrikeContact_R'],
    ['gk','Goalkeeper','goal-line-keeper','hand_r'],
    ['pso','Penalty shootout','penalty-two-way','StrikeContact_R'],
    ['bar','Crossbar','crossbar-target','StrikeContact_R'],
  ];
  for(const [key,activity,camera,contact] of expected){
    assert.match(runtime,new RegExp(`${key}:Object\\.freeze\\(\\{activity:'${activity}',camera:'${camera}'.+contactNode:'${contact}'`));
  }
  assert.doesNotMatch(runtime,/generic|gray disabled/i);
  assert.match(runtime,/profiles:Object\.keys\(this\.profiles\)/);
  assert.match(runtime,/root\.scale\.setScalar\(target\.space===['"]world['"]\?\.92:1\)/);
});

test('ships deterministic self-authored activity clips on the existing v2 skeleton',async()=>{
  const gltf=await loadAsset(),names=gltf.animations.map(clip=>clip.name);
  for(const name of ['HeaderReady','HeaderContact','DribbleCycle','PassContact','ComboVolley','KeeperReady','KeeperDive','PenaltyStrike','CrossbarStrike'])assert.ok(names.includes(name),name);
  for(const node of ['head','hand_r','StrikeContact_R','PlantContact_L'])assert.ok(gltf.scene.getObjectByName(node),node);
  const source=read('scripts/extend-multi-activity-athlete.py');
  assert.match(source,/KickLabMakeHumanGameEngineRig/);
  assert.match(source,/export_animation_mode="ACTIONS"/);
  assert.doesNotMatch(source,/HumanService|TargetService|mhclo|download/i);
});

test('uses the approved local geometry as a recognizable soccer kit',async()=>{
  const gltf=await loadAsset(),materials=new Set();
  gltf.scene.traverse(object=>{if(object.isMesh){const entries=Array.isArray(object.material)?object.material:[object.material];entries.filter(Boolean).forEach(material=>materials.add(material.name));}});
  for(const name of ['KickLabNavy','KickLabCyan','KickLabSockWhite','KickLabBoots'])assert.ok(materials.has(name),name);
  const source=read('scripts/extend-multi-activity-athlete.py');
  assert.match(source,/build_soccer_kit/);
  assert.match(source,/center\.z >= 0\.96/);
  assert.doesNotMatch(source,/download|https?:\/\//i);
});

test('keeps the dimensional procedural stadium in the multi-activity regression gate',()=>{
  const renderer=read('src/game/50-renderer-3d.js'),qa=read('scripts/qa-multi-activity-athlete.mjs'),legacyQa=read('scripts/qa-direction-c-athlete.mjs');
  assert.match(renderer,/pitchMarkings>=12/);
  assert.match(renderer,/goalNetSurfaces>=4/);
  assert.match(renderer,/stands>=4&&layers\.sideReturns>=2/);
  assert.match(renderer,/roofPanels>=4&&layers\.roofTrusses>=20/);
  assert.match(renderer,/animatedBoards>=4/);
  assert.match(renderer,/visibleLegacyAudienceRenderers===0/);
  assert.match(renderer,/oldCrowdTextureLayers===0/);
  assert.match(renderer,/coherentAudienceInstances===64/);
  assert.match(renderer,/passes:\{pitch:.+nearStand:/);
  assert.match(renderer,/shadowMap&&layers\.shadowCaster&&layers\.hemisphereLight&&layers\.directionalLight/);
  assert.match(qa,/activities\.length\*viewports\.length/);
  assert.match(qa,/key===['"]free['"]\|\|key===['"]header['"]\|\|key===['"]run['"]/);
  assert.match(qa,/animated boards did not advance/);
  assert.match(qa,/phaseTimeChanged/);
  assert.match(qa,/motionSignature/);
  assert.match(qa,/recordVideo/);
  assert.match(qa,/real-time Playwright page recordings/);
  assert.doesNotMatch(qa,/searchParams\.set\(['"]athletePhase/);
  assert.match(legacyQa,/recordVideo/);
  assert.doesNotMatch(legacyQa,/'-loop'/);
});
