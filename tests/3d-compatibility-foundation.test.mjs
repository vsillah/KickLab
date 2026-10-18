import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { validateAssetSet } from '../scripts/lib/3d-assets.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=(path)=>readFileSync(join(root,path),'utf8');
const json=(path)=>JSON.parse(read(path));

test('pins and exposes one version-matched offline Three.js and GLTFLoader bundle',()=>{
  const packageJson=json('package.json');
  assert.equal(packageJson.devDependencies.three,'0.186.1');
  assert.equal(packageJson.devDependencies['gltf-validator'],'2.0.0-dev.3.10');
  const source=read('src/vendor/three.min.js');
  assert.match(source,/Three\.js r186 \+ version-matched GLTFLoader/);
  const context={console,globalThis:null};context.globalThis=context;
  vm.runInNewContext(source,context,{timeout:5000});
  assert.equal(context.THREE.REVISION,'186');
  assert.equal(typeof context.THREE.GLTFLoader,'function');
});

test('rejects untracked 3D provenance and validates the exact local GLB',async()=>{
  const schema=json('config/asset-manifest.schema.json');
  assert.equal(schema.additionalProperties,false);
  assert.ok(schema.required.includes('provenance'));
  assert.ok(schema.required.includes('license'));
  assert.ok(schema.required.includes('validation'));
  assert.ok(schema.required.includes('network'));
  const {assets}=await validateAssetSet();
  const placeholder=assets.find(asset=>asset.manifest.assetId==='kicklab-placeholder-athlete');
  const directionC=assets.find(asset=>asset.manifest.assetId==='kicklab-direction-c-athlete');
  assert.ok(placeholder);
  assert.ok(directionC);
  const {manifest,metrics}=placeholder;
  assert.equal(manifest.status,'evaluation-only');
  assert.equal(manifest.provenance.externalInputs,false);
  assert.equal(manifest.provenance.likeness,false);
  assert.equal(manifest.provenance.cloudProcessing,false);
  assert.equal(manifest.network.externalUrisAllowed,false);
  assert.equal(metrics.gltf.errors,0);
  assert.equal(metrics.gltf.externalUris,0);
  assert.deepEqual(metrics.gltf.allowedIssues,[
    {code:'NODE_SKINNED_MESH_NON_ROOT',severity:1,count:2},
    {code:'UNUSED_OBJECT',severity:2,count:10},
  ]);
  assert.equal(directionC.manifest.status,'approved-production');
  assert.equal(directionC.manifest.provenance.sourceType,'self-authored-production');
  assert.equal(directionC.manifest.license.permittedUse,'production-game');
  assert.equal(directionC.manifest.network.runtimeRequests,'same-origin-local-only');
  assert.equal(directionC.metrics.bytes,782240);
  assert.equal(directionC.metrics.gltf.errors,0);
  assert.equal(directionC.metrics.gltf.externalUris,0);
  assert.deepEqual(directionC.metrics.gltf.allowedIssues,[{code:'NODE_EMPTY',severity:2,count:3}]);
});

test('keeps the imported-v42 Canvas source outside the compatibility delta',()=>{
  const canvasFiles=['src/game/10-fight.js','src/game/20-race.js','src/game/30-kick-sideview.js','src/game/32-soccer-3d-modes.js','src/game/42-match.js','src/game/70-main-loop.js'];
  for(const file of canvasFiles)assert.ok(read(file).length>1000,`${file} remains populated`);
  const renderer=read('src/game/50-renderer-3d.js');
  assert.match(renderer,/outputColorSpace=T\.SRGBColorSpace/);
  assert.doesNotMatch(renderer,/outputEncoding|sRGBEncoding/);
});
