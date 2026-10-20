import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const progress=read('src/game/01-progress.js');
const renderer=read('src/game/50-renderer-3d.js');
const side=read('src/game/30-kick-sideview.js');
const spatial=read('src/game/32-soccer-3d-modes.js');
const loop=read('src/game/70-main-loop.js');
const effects=read('src/game/03-audio-fx-engine.js');
const directionC=read('src/game/50a-direction-c-athlete.js');
const html=read('src/index.html');
const css=read('src/styles.css');
const qa=read('scripts/qa-goal-celebration.mjs');

test('starts the celebration only for successful Kick awards',()=>{
  assert.match(progress,/if\(success&&mode==='kick'&&!meta\.auto&&!CINE\.on\)/);
  assert.doesNotMatch(progress,/if\(mode==='kick'&&V3\.on&&!meta\.auto/);
  assert.match(progress,/CINE\.start\([^;]+\{celebrate:true\}\)/);
});

test('keeps replay visual-only and restores the canonical model snapshot',()=>{
  assert.match(renderer,/this\.backup=playback\.snap\?playback\.snap\(\):null/);
  assert.match(renderer,/if\(this\.backup&&this\.model&&this\.model\.applySnap\)this\.model\.applySnap\(this\.backup,RECS\.kick\)/);
  assert.doesNotMatch(renderer,/CINE=\{[^]*\b(?:award|saveBest|badge|logMove)\(/);
  assert.match(renderer,/scoreWrites:0,xpWrites:0/);
  assert.match(loop,/if\(!PAUSE\.on&&!RP\.on&&!CINE\.on\)M\.update/);
});

test('provides a bounded accessible skip control without modal focus ownership',()=>{
  assert.match(html,/id="goalCelebrationStatus" role="status" aria-live="polite"/);
  assert.match(html,/id="goalCelebrationSkip">Skip replay<\/button>/);
  assert.match(renderer,/goalCelebrationSkip'\)\.addEventListener\('click'[^]*CINE\.end\('skipped'\)/);
  assert.doesNotMatch(html,/goalCelebrationControls[^>]+(?:role="dialog"|aria-modal)/);
  assert.match(css,/\.goal-celebration-controls button\{pointer-events:auto;min-width:44px;min-height:44px/);
});

test('sanitizes a transient local nickname and bounds supporter signs',()=>{
  assert.match(renderer,/profileManager\.active\(\)\?\.nickname/);
  assert.match(renderer,/normalize\('NFKC'\).*replace\(\/\[\^\\p\{L\}\\p\{N\}/);
  assert.match(renderer,/slice\(0,16\)/);
  assert.match(renderer,/signs:this\.celebrate\?3:0/);
  assert.doesNotMatch(renderer,/localStorage|fetch\(|XMLHttpRequest|sendBeacon/);
});

test('respects mute, reduced motion, and lifecycle pause ownership',()=>{
  assert.match(side,/energizeControlledPlayer\('goal',1700\);SND\.goal\(\)/);
  assert.match(spatial,/SND\.goal\(\);setTimeout\(\(\)=>energizeControlledPlayer\('goal',1600\),200\)/);
  assert.match(effects,/const rings=reduce\?1:3/);
  assert.match(renderer,/phase=reduce&&this\.celebrate\?'crowd':'replay'/);
  assert.match(renderer,/step\(rdt\)\{if\(PAUSE\.on\)return/);
  assert.match(renderer,/muted:!!best\.mute/);
});

test('uses controlled-body energy instead of detached celebration confetti',()=>{
  for(const source of [progress,side,spatial,read('src/game/20-race.js'),read('src/game/42-match.js'),read('src/game/51-live-match.js')])assert.doesNotMatch(source,/\bconfetti\(/);
  assert.match(effects,/attachment:'controlled-body-contour'/);
  assert.match(effects,/markerClear:true,detachedParticles:0/);
  assert.match(loop,/M\.draw\(ctx\);drawControlledPlayerEnergy\(ctx\);/);
  assert.match(directionC,/attachment:'rig-bones-and-body-materials'/);
  assert.match(directionC,/const names=\['spine_03','upperarm_l','upperarm_r','calf_l','calf_r','hand_r'\]/);
  assert.match(directionC,/applyControlledEnergy\(true\);this\.updateControlledIndicator\(true\)/);
});

test('drives successful celebration scenarios with an explicit scoring shot',()=>{
  assert.match(qa,/async function setShot\(page,speed=23,angle=17\)/);
  assert.match(qa,/setup\(lifecyclePage[^;]+;await setShot\(lifecyclePage\);await kick/);
  assert.match(qa,/setup\(mutePage[^;]+;await setShot\(mutePage\)/);
  assert.match(qa,/Celebration did not become visible:[^`]+diagnostic/);
});
