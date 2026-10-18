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

test('keeps the local stadium crowd procedural, layered, animated, and mobile bounded',()=>{
  assert.match(renderer,/crowdSigns=\[`GO \$\{fanName\}!`,'GO TEAM!','MATH MOVES!','KICKLAB!'\]/);
  assert.match(renderer,/this\.crowdDepth\.push\(\{mesh:tier,material:cm,layer,stand:grp,baseY:tier\.position\.y\}\)/);
  assert.match(renderer,/visibleLayers=mobile\?\(distance<58\?2:1\):distance<58\?3:distance<105\?2:1/);
  assert.match(renderer,/distanceBased:true,maxLayersPerStand:innerWidth<=480\?2:3/);
  assert.match(renderer,/!reduce&&entry\.mesh\.visible&&cheer/);
  assert.doesNotMatch(renderer,/fetch\(|XMLHttpRequest|sendBeacon|https?:\/\//);
});
