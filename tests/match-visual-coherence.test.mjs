import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const athlete=read('src/game/50a-direction-c-athlete.js');
const renderer=read('src/game/50-renderer-3d.js');
const vendorEntry=read('src/vendor/three-runtime-entry.js');

test('defines camera-relative primary and opponent orientation for every Kick activity',()=>{
  for(const key of ['free','header','run','pass','combo','gk','pso','bar'])assert.match(athlete,new RegExp(`${key}:Object\\.freeze\\(\\{[^}]+orientation:DIRECTION_C_ORIENTATION\\.(?:attackRight|meetCrossLeft|defendLeft)`));
  assert.match(athlete,/attackRight:Object\.freeze\(\{primaryYaw:Math\.PI\/2,opponentYaw:-Math\.PI\/2,primaryFaces:'field-positive-x',opponentFaces:'field-negative-x'\}\)/);
  assert.match(athlete,/meetCrossLeft:Object\.freeze\(\{primaryYaw:-Math\.PI\/2,opponentYaw:-Math\.PI\/2,primaryFaces:'field-negative-x',opponentFaces:'field-negative-x'\}\)/);
  assert.match(athlete,/defendLeft:Object\.freeze\(\{primaryYaw:-Math\.PI\/2,opponentYaw:Math\.PI\/2,primaryFaces:'field-negative-x',opponentFaces:'field-positive-x'\}\)/);
  assert.match(athlete,/root\.rotation\.set\(0,side===['"]opponent['"]\?p\.orientation\.opponentYaw:p\.orientation\.primaryYaw,0\)/);
});

test('renders the Header Duel competitor through the shared skinned Direction C asset',()=>{
  assert.match(vendorEntry,/SkeletonUtils/);
  assert.match(athlete,/T\.SkeletonUtils\?\.clone/);
  assert.match(athlete,/KickLabDirectionCOpponent/);
  assert.match(athlete,/o\.headX!==undefined&&!o\.rec&&!o\.kicker/);
  assert.match(athlete,/K\.opt\.duel===['"]duel['"]&&!this\.opponent\.target/);
  assert.match(athlete,/opponentRenderer=opponentActive\?['"]shared-direction-c['"]:['"]procedural-fallback['"]/);
  assert.equal((athlete.match(/assets\/3d\/kicklab-direction-c-athlete\/v2\/kicklab-makehuman-athlete\.glb/g)||[]).length,1);
});

test('marks only the controlled Direction C athlete with the local responsive KickLab badge',()=>{
  assert.match(athlete,/shape:'kicklab-orbit-badge'/);
  assert.match(athlete,/sprite\.name='KickLabControlledPlayerIndicator'/);
  assert.match(athlete,/owner:'primary',targetRoot:'KickLabDirectionCAthlete',opponentMarked:false/);
  assert.match(athlete,/const head=indicator\.head\.getWorldPosition/);
  assert.match(athlete,/innerWidth<=480\?34:innerWidth<=900\?40:46/);
  assert.match(athlete,/motion:reduce\?'static':'gentle-bob'/);
  assert.match(athlete,/forced===['"]xray['"]\|\|forced===['"]replay['"]\|\|forced===['"]cinematic['"]\|\|forced===['"]canvas['"]/);
  assert.match(athlete,/if\(CINE\.on\)return['"]hidden-cinematic['"]/);
  assert.match(athlete,/if\(RP\.on\)return['"]hidden-replay['"]/);
  assert.match(athlete,/physicsVisionVisible\(\)\)return['"]hidden-xray['"]/);
  assert.match(athlete,/visibility:`hidden-\$\{initialFallback\}`/);
  assert.doesNotMatch(athlete,/fetch\(|XMLHttpRequest|sendBeacon|https?:\/\//);
});

test('keeps one procedural spectator language across near and distant views',()=>{
  assert.match(renderer,/audienceLanguage='procedural-low-poly-anatomical'/);
  assert.match(renderer,/midFarRenderer:'instanced-procedural-low-poly'/);
  assert.match(renderer,/visibleGroups=mobile\?\(distance<58\?2:distance<105\?1:0\):\(distance<58\?3:distance<135\?2:0\)/);
  assert.match(renderer,/distanceBased:true,maxLayersPerStand:innerWidth<=480\?2:3/);
  assert.match(renderer,/motionAllowed=!reduce&&!PAUSE\.on/);
  assert.match(renderer,/fanRenderer:'local-low-poly-skinned-mesh'/);
  assert.doesNotMatch(renderer,/crowdTex|crowdTextures|crowdDepth|crowdMats/);
  assert.doesNotMatch(renderer,/fetch\(|XMLHttpRequest|sendBeacon|https?:\/\//);
});
