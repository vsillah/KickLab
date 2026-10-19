import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const renderer=readFileSync(join(root,'src/game/50-renderer-3d.js'),'utf8');
const qa=readFileSync(join(root,'scripts/qa-near-stand.mjs'),'utf8');

test('builds continuous stepped seating with complete chair modules',()=>{
  assert.match(renderer,/architecture:'continuous-tread-riser-bowl'/);
  assert.match(renderer,/chairParts:\['pan','upright-back','dual-supports'\]/);
  assert.match(renderer,/new T\.InstancedMesh\(new T\.BoxGeometry\(\.72,\.1,\.52\),chairMat/);
  assert.match(renderer,/new T\.InstancedMesh\(new T\.BoxGeometry\(\.72,\.7,\.1\),chairMat/);
  assert.match(renderer,/steppedRows>=24/);
  assert.match(renderer,/chairModules>=120/);
});

test('keeps near spectators skinned and mid-far spectators coherent without legacy cards',()=>{
  assert.match(renderer,/new T\.SkinnedMesh\(this\.nearFanGeometry,this\.nearFanMaterials\[/);
  assert.match(renderer,/state===['"]seated['"]/);
  assert.match(renderer,/'half-risen'/);
  assert.match(renderer,/'standing'/);
  assert.match(renderer,/new T\.InstancedMesh\(this\.farFanGeometries\[state\]/);
  assert.match(renderer,/visibleLegacyAudienceRenderers:0/);
  assert.match(renderer,/oldCrowdTextureLayers:0/);
  assert.match(renderer,/coherentAudienceInstances===64/);
  assert.match(renderer,/contactsPass=seatedContacts\.length>0/);
  assert.match(renderer,/memoryBudgetBytes:262144/);
  assert.match(renderer,/anatomy:\['head-neck','shoulders-torso','upper-lower-arms','hands','thighs-calves','feet'\]/);
  assert.match(renderer,/paletteVariants:this\.nearFanMaterials/);
  assert.doesNotMatch(renderer,/crowdTex|crowdTextures|crowdDepth|distantBillboardLayers/);
  assert.doesNotMatch(renderer,/fetch\(|XMLHttpRequest|sendBeacon|https?:\/\//);
});

test('builds bounded dimensional roofs, floodlight arrays, and supported jumbotrons',()=>{
  assert.match(renderer,/architecture:'panel-fascia-support-truss'/);
  assert.match(renderer,/lighting:'bounded-instanced-housings-and-lamps'/);
  assert.match(renderer,/roofPanels===12/);
  assert.match(renderer,/roofFascias===4/);
  assert.match(renderer,/roofSupports===12/);
  assert.match(renderer,/roofTrusses===20/);
  assert.match(renderer,/fixtureAssemblies===16/);
  assert.match(renderer,/lampElements===64/);
  assert.match(renderer,/jumbotronSupports===8/);
  assert.match(renderer,/jumbotrons===4/);
  assert.doesNotMatch(renderer,/const strip=/);
});

test('requires screenshot evidence for bodies, chairs, LOD, jumbotron, pause, reduced motion, and Canvas',()=>{
  for(const token of ['contact-oblique','wide-reaction','near-to-far-lod','roof-lights-jumbotron','jumbotron-context','desktop','tablet','mobile','reduced-motion','paused','canvas-fallback'])assert.match(qa,new RegExp(token));
  assert.match(qa,/analyzeContactScreenshot/);
  assert.match(qa,/connected shirt silhouettes/);
  assert.match(qa,/flat or fragmented/);
  assert.match(qa,/External requests observed/);
  assert.match(qa,/libx264/);
});
