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

test('keeps near spectators skinned, bounded, grounded, and separate from distant cards',()=>{
  assert.match(renderer,/new T\.SkinnedMesh\(this\.nearFanGeometry,this\.nearFanMaterial\)/);
  assert.match(renderer,/state===['"]seated['"]/);
  assert.match(renderer,/'half-risen'/);
  assert.match(renderer,/'standing'/);
  assert.match(renderer,/nearBillboards:0/);
  assert.match(renderer,/for\(let layer=1;layer<3;layer\+\+\)/);
  assert.match(renderer,/contactsPass=seatedContacts\.length>0/);
  assert.match(renderer,/memoryBudgetBytes:262144/);
  assert.doesNotMatch(renderer,/fetch\(|XMLHttpRequest|sendBeacon|https?:\/\//);
});

test('requires screenshot evidence for bodies, chairs, LOD, jumbotron, pause, reduced motion, and Canvas',()=>{
  for(const token of ['contact-oblique','wide-reaction','near-to-far-lod','jumbotron-context','desktop','tablet','mobile','reduced-motion','paused','canvas-fallback'])assert.match(qa,new RegExp(token));
  assert.match(qa,/analyzeContactScreenshot/);
  assert.match(qa,/connected shirt silhouettes/);
  assert.match(qa,/flat or fragmented/);
  assert.match(qa,/External requests observed/);
  assert.match(qa,/libx264/);
});
