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
  assert.match(renderer,/nearTier:'seat-grounded-shared-rig-clusters'.*midTier:'direction-c-rig-impostor-supporters'.*farTier:'palette-linked-soft-distance-fill'/);
  assert.match(renderer,/seatSteps:this\.crowdSeatSteps/);
  assert.match(renderer,/coherentTransition:true,physicalGrounding:true/);
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
  assert.match(renderer,/mode==='mobile'\?\[24,18,12\]:mode==='tablet'\?\[40,32,24\]:\[50,42,34\]/);
  assert.match(renderer,/maxLayersPerStand:mode==='mobile'\?2:3/);
  assert.match(renderer,/crowdActorCapacity>=720/);
  assert.match(renderer,/const capacity=60/);
  assert.match(renderer,/actorBudget=mode==='mobile'\?\[24,18,12\]:mode==='tablet'\?\[40,32,24\]:\[50,42,34\]/);
  assert.match(renderer,/heroSpectatorCapacity===12/);
  assert.match(renderer,/nearTier:'seat-grounded-shared-rig-clusters'/);
  assert.match(renderer,/midTier:'direction-c-rig-impostor-supporters'/);
  assert.match(renderer,/farTier:'palette-linked-soft-distance-fill'/);
  assert.match(renderer,/layers\.seatSteps>=36/);
  assert.match(renderer,/layers\.seatBacks>=36/);
  assert.match(renderer,/layers\.seatUnitCapacity>=864/);
  assert.match(renderer,/layers\.aisleSteps>=72/);
  assert.match(renderer,/layers\.railPosts>=36/);
  assert.match(renderer,/layers\.impostorTierLayers===12/);
  assert.match(renderer,/layers\.visibleImpostorSpectators>=60/);
  assert.match(renderer,/layers\.impostorAtlasSource==='direction-c-v2-local-rig'/);
  assert.match(renderer,/layers\.impostorAtlasLocalOnly/);
  assert.match(renderer,/layers\.impostorAtlasWidth===112/);
  assert.match(renderer,/layers\.impostorAtlasHeight===176/);
  assert.match(renderer,/layers\.impostorAtlasFrames===12/);
  assert.match(renderer,/layers\.impostorAtlasBytes===946176/);
  assert.match(renderer,/layers\.impostorAtlasMinPixelWidth>=78/);
  assert.match(renderer,/layers\.impostorAtlasMinPixelHeight>=142/);
  assert.match(athlete,/targetWidth=stance==='seated'\?88:stance==='half-risen'\?82:78/);
  assert.match(athlete,/g\.drawImage\(rawCanvas,sourceBounds\.x,sourceBounds\.y/);
  assert.match(renderer,/entry\.actorGroup\.visible=visible&&!impostors/);
  assert.match(renderer,/entry\.impostorGroup\.visible=visible/);
  assert.match(renderer,/layers\.seatRails>=12/);
  assert.match(renderer,/crowdGeometryBytes<250000/);
  assert.match(renderer,/crowdTextureBytes<2500000/);
});

test('renders a high-definition fictional adult reaction group onto the stadium jumbotron',()=>{
  assert.match(renderer,/new T\.WebGLRenderTarget\(jumboW,jumboH/);
  assert.match(athlete,/installCrowdSupporters\(source,clips\)/);
  assert.match(athlete,/T\.SkeletonUtils\.clone\(source\)/);
  assert.match(athlete,/V3\.jumbotron\.fans=palettes\.slice\(0,3\)/);
  assert.match(athlete,/V3\.crowdRigSupporters\.push\(fan\)/);
  assert.match(renderer,/jumbotronTier:'broadcast-linked-shared-rig-supporters'/);
  assert.match(renderer,/layers\.jumbotronSpectators===3/);
  assert.match(renderer,/layers\.jumbotronRigSource==='shared-direction-c-v2'/);
  assert.match(renderer,/layers\.rigHeroSpectatorCapacity===6/);
  assert.match(renderer,/layers\.groundedRigHeroSpectators===6/);
  assert.match(renderer,/layers\.broadcastLinkedSupporters===3/);
  assert.match(renderer,/layers\.jumbotronLinkedSupporters===3/);
  assert.match(athlete,/supporterIds=\['sky-rocket','orange-playmaker','green-guardian'\]/);
  assert.match(athlete,/seatGrounded=true/);
  assert.match(athlete,/installCrowdImpostorAtlas\(source,clips,palettes\)/);
  assert.match(athlete,/source:'direction-c-v2-local-rig'/);
  assert.match(athlete,/new T\.WebGLRenderTarget\(width,height/);
  assert.match(athlete,/R\.readRenderTargetPixels\(target/);
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
