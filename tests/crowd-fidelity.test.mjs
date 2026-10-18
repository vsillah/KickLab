import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const renderer=readFileSync(join(root,'src/game/50-renderer-3d.js'),'utf8');
const athlete=readFileSync(join(root,'src/game/50a-direction-c-athlete.js'),'utf8');

test('builds a local hybrid crowd without external asset egress',()=>{
  for(const primitive of ['CylinderGeometry','SphereGeometry','PlaneGeometry','InstancedMesh'])assert.match(renderer,new RegExp(`T\\.${primitive}`));
  assert.match(renderer,/self-authored hybrid crowd/);
  assert.match(renderer,/crowdActorCapacity:this\.crowdInstanceCapacity/);
  assert.match(renderer,/nearTier:'shared-rig-heroes-plus-dimensional-supporters'.*midTier:'instanced-supporters'.*farTier:'muted-procedural-fill'/);
  assert.doesNotMatch(renderer,/crowd[^\n]{0,180}(fetch\(|https?:\/\/|XMLHttpRequest|sendBeacon)/i);
});

test('keeps crowd motion independent, reaction-aware, pausable, and reduced-motion safe',()=>{
  assert.match(renderer,/wave=Math\.sin\(clock\*fan\.tempo\+fan\.phase\)/);
  assert.match(renderer,/answer=Math\.sin\(clock\*\(fan\.tempo\*1\.37\)\+fan\.phase\*1\.9\)/);
  assert.match(renderer,/motion=!reduce&&!paused/);
  assert.match(renderer,/if\(motion\)this\.crowdClock\+=rdt/);
  assert.match(renderer,/raise=reaction\*\(\.2\+\.8\*Math\.max\(0,wave\)\)/);
  assert.match(renderer,/signsActive=reaction>\.42/);
  assert.match(renderer,/this\.crowdReactionFixture\?1:0/);
});

test('uses viewport and distance LOD with bounded geometry and texture audits',()=>{
  assert.match(renderer,/mode=innerWidth<=480\?'mobile':innerWidth<=900\?'tablet':'desktop'/);
  assert.match(renderer,/mode==='mobile'\?\[8,6,4\]:mode==='tablet'\?\[14,10,7\]:\[18,14,10\]/);
  assert.match(renderer,/maxLayersPerStand:mode==='mobile'\?2:3/);
  assert.match(renderer,/crowdActorCapacity>=216/);
  assert.match(renderer,/heroSpectatorCapacity===12/);
  assert.match(renderer,/nearTier:'shared-rig-heroes-plus-dimensional-supporters'/);
  assert.match(renderer,/midTier:'instanced-supporters'/);
  assert.match(renderer,/farTier:'muted-procedural-fill'/);
  assert.match(renderer,/crowdGeometryBytes<250000/);
  assert.match(renderer,/crowdTextureBytes<2500000/);
});

test('renders a high-definition fictional adult reaction group onto the stadium jumbotron',()=>{
  assert.match(renderer,/new T\.WebGLRenderTarget\(jumboW,jumboH/);
  assert.match(athlete,/installCrowdSupporters\(source,clips\)/);
  assert.match(athlete,/T\.SkeletonUtils\.clone\(source\)/);
  assert.match(athlete,/V3\.jumbotron\.fans=palettes\.slice\(0,3\)/);
  assert.match(athlete,/V3\.crowdRigSupporters\.push\(fan\)/);
  assert.match(renderer,/jumbotronTier:'shared-direction-c-rig-supporters'/);
  assert.match(renderer,/layers\.jumbotronSpectators===3/);
  assert.match(renderer,/layers\.jumbotronRigSource==='shared-direction-c-v2'/);
  assert.match(renderer,/layers\.rigHeroSpectatorCapacity===4/);
  assert.match(renderer,/window\.__KICKLAB_JUMBOTRON_EVIDENCE__=/);
  assert.match(renderer,/readRenderTargetPixels/);
  assert.match(renderer,/R\.render\(this\.jumbotron\.scene,this\.jumbotron\.cam\)/);
  assert.doesNotMatch(renderer+athlete,/real.person|child likeness|remote jumbotron/i);
});

test('personalizes only local reaction signage',()=>{
  assert.match(renderer,/const fanName=celebrationNickname\(\)/);
  assert.match(renderer,/crowdNicknameLabel=crowdSigns\[0\]/);
  assert.match(renderer,/source:'active-local-profile'/);
  assert.match(renderer,/sign\.userData\.nickname/);
});
