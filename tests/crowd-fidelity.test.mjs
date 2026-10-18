import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const renderer=readFileSync(join(root,'src/game/50-renderer-3d.js'),'utf8');

test('builds a local hybrid crowd without external asset egress',()=>{
  for(const primitive of ['CylinderGeometry','SphereGeometry','PlaneGeometry','InstancedMesh'])assert.match(renderer,new RegExp(`T\\.${primitive}`));
  assert.match(renderer,/self-authored hybrid crowd/);
  assert.match(renderer,/crowdActorCapacity:this\.crowdInstanceCapacity/);
  assert.match(renderer,/farFill:'procedural-texture',nearDetail:'instanced-supporters'/);
  assert.doesNotMatch(renderer,/crowd[^\n]{0,180}(fetch\(|https?:\/\/|XMLHttpRequest|sendBeacon)/i);
});

test('keeps crowd motion independent, reaction-aware, pausable, and reduced-motion safe',()=>{
  assert.match(renderer,/wave=Math\.sin\(clock\*fan\.tempo\+fan\.phase\)/);
  assert.match(renderer,/answer=Math\.sin\(clock\*\(fan\.tempo\*1\.37\)\+fan\.phase\*1\.9\)/);
  assert.match(renderer,/motion=!reduce&&!paused/);
  assert.match(renderer,/if\(motion\)this\.crowdClock\+=rdt/);
  assert.match(renderer,/raise=reaction\*\(\.35\+\.65\*Math\.max\(0,wave\)\)/);
  assert.match(renderer,/signsActive=reaction>\.42/);
  assert.match(renderer,/this\.crowdReactionFixture\?1:0/);
});

test('uses viewport and distance LOD with bounded geometry and texture audits',()=>{
  assert.match(renderer,/mode=innerWidth<=480\?'mobile':innerWidth<=900\?'tablet':'desktop'/);
  assert.match(renderer,/mode==='mobile'\?\[12,9,6\]:mode==='tablet'\?\[24,19,14\]:\[36,30,22\]/);
  assert.match(renderer,/maxLayersPerStand:mode==='mobile'\?2:3/);
  assert.match(renderer,/crowdActorCapacity>=432/);
  assert.match(renderer,/crowdGeometryBytes<250000/);
  assert.match(renderer,/crowdTextureBytes<4000000/);
});

test('personalizes only local reaction signage',()=>{
  assert.match(renderer,/const fanName=celebrationNickname\(\)/);
  assert.match(renderer,/crowdNicknameLabel=crowdSigns\[0\]/);
  assert.match(renderer,/source:'active-local-profile'/);
  assert.match(renderer,/sign\.userData\.nickname/);
});
