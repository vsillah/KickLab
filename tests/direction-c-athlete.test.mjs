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
const assetPath=join(root,'src/assets/3d/kicklab-direction-c-athlete/v1/kicklab-direction-c-athlete.glb');
const clips=['Celebrate','FollowThrough','Plant','Ready','Recovery','RunUp','Strike'];
globalThis.ProgressEvent??=class ProgressEvent{};

async function loadAsset(){
  const bytes=readFileSync(assetPath),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  return new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,'',resolve,reject));
}

function pose(gltf,mixer,name,time){
  mixer.stopAllAction();const action=mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations,name));action.play();action.paused=true;action.time=time;mixer.update(0);gltf.scene.updateMatrixWorld(true);
}

test('ships one fail-closed, self-authored production athlete under the payload budget',async()=>{
  const {assets}=await validateAssetSet(),asset=assets.find(entry=>entry.manifest.assetId==='kicklab-direction-c-athlete');
  assert.ok(asset);
  assert.equal(asset.manifest.status,'approved-production');
  assert.equal(asset.manifest.provenance.externalInputs,false);
  assert.equal(asset.manifest.provenance.likeness,false);
  assert.equal(asset.manifest.provenance.cloudProcessing,false);
  assert.equal(asset.manifest.network.externalUrisAllowed,false);
  assert.equal(asset.metrics.bytes,642092);
  assert.ok(asset.metrics.bytes<=2_500_000);
  assert.equal(asset.report.issues.numErrors,0);
  assert.equal(asset.report.issues.numWarnings,0);
  assert.equal(asset.report.info.hasTextures,false);
  assert.equal(asset.report.info.materialCount,6);
  assert.equal(asset.report.info.animationCount,7);
});

test('keeps the seven-clip shared skeleton and contact events within ten millimeters',async()=>{
  const gltf=await loadAsset(),mixer=new THREE.AnimationMixer(gltf.scene),names=gltf.animations.map(clip=>clip.name).sort();
  assert.deepEqual(names,clips);
  let bones=0,geometryBytes=0;const arrays=new Set();gltf.scene.traverse(object=>{if(object.isBone)bones++;if(object.isMesh&&object.geometry){for(const attribute of Object.values(object.geometry.attributes)){if(!arrays.has(attribute.array)){arrays.add(attribute.array);geometryBytes+=attribute.array.byteLength;}}if(object.geometry.index&&!arrays.has(object.geometry.index.array)){arrays.add(object.geometry.index.array);geometryBytes+=object.geometry.index.array.byteLength;}}});
  const animationBytes=gltf.animations.reduce((sum,clip)=>sum+clip.tracks.reduce((trackSum,track)=>trackSum+track.times.byteLength+track.values.byteLength,0),0);
  assert.equal(bones,23);
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
  const runtime=read('src/game/50a-direction-c-athlete.js'),html=read('src/index.html'),generator=read('scripts/generate-direction-c-athlete.py');
  assert.match(runtime,/get\('renderer'\)===['"]direction-c['"]/);
  assert.match(runtime,/status:'flag-off'/);
  assert.match(runtime,/best\.gfx===['"]2d['"]\)return['"]canvas['"]/);
  assert.match(runtime,/get\('quality'\)===['"]low['"]\)return['"]reduced-quality['"]/);
  assert.match(runtime,/assets\/3d\/kicklab-direction-c-athlete\/v1\/kicklab-direction-c-athlete\.glb/);
  assert.doesNotMatch(runtime,/https?:\/\//);
  assert.doesNotMatch(html,/Direction C|athlete dimensions|renderer chooser/i);
  assert.match(runtime,/if\(!PAUSE\.on&&!\(RP\.on&&!RP\.playing\)\)this\.clock\+=rdt\*\(RP\.on\?RP\.speed:1\)/);
  assert.doesNotMatch(generator,/requests|urllib|https?:\/\//i);
  assert.match(generator,/primitive_(?:cube|uv_sphere|cone)_add/);
});
