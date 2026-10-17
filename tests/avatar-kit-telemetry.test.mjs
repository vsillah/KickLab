import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

await import('../src/shared/game-core.js');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const core = globalThis.KickLabGameCore;

test('keeps archetype appearance descriptors stylized and visibly distinct', () => {
  const ids = ['you', 'wiz', 'rocket', 'tower', 'trick', 'cannon'];
  const looks = ids.map((id) => core.playerAppearance(id));

  assert.equal(new Set(looks.map((look) => look.kit)).size, ids.length);
  assert.equal(new Set(looks.map((look) => look.hairStyle)).size, ids.length);
  assert.ok(core.playerAppearance('tower').build > core.playerAppearance('wiz').build);
  assert.deepEqual(core.playerAppearance('unknown').id, 'you');
  for (const look of looks) {
    for (const key of ['skin', 'hair', 'hairStyle', 'eye', 'brow', 'mouth', 'kit', 'accent', 'shorts', 'socks', 'build', 'height', 'shoulders', 'torso', 'legs', 'stance', 'number']) {
      assert.notEqual(look[key], undefined, `${look.id} must define ${key}`);
    }
  }
});

test('keeps archetype silhouette signatures structurally unique', () => {
  const ids = ['you', 'wiz', 'rocket', 'tower', 'trick', 'cannon'];
  const signatures = ids.map((id) => {
    const look = core.playerAppearance(id);
    return [look.height, look.shoulders, look.torso, look.legs, look.stance].join(':');
  });

  assert.equal(new Set(signatures).size, ids.length);
  assert.ok(core.playerAppearance('tower').shoulders > core.playerAppearance('trick').shoulders);
  assert.ok(core.playerAppearance('rocket').legs > core.playerAppearance('cannon').legs);
});

test('keeps the canonical head and neck geometry attached', () => {
  for (const scale of [0.8, 1, 1.25, 1.6]) {
    const joint = core.headAttachmentGeometry(scale);
    const neckToCenter = joint.headCenterAboveShoulders - joint.neckTopAboveShoulders;
    assert.ok(neckToCenter < joint.headRadius, `scale ${scale} leaves a visible head gap`);
    assert.ok(joint.maxVisibleGap <= 0.01 * scale);
  }
});

test('keeps fallback stadium environments visually distinct without changing physics', () => {
  const ids = ['home', 'alt', 'mars', 'moon'];
  const scenes = ids.map((id) => core.fallbackEnvironment(id, 'grass'));
  assert.equal(new Set(scenes.map((scene) => `${scene.skyTop}:${scene.field}:${scene.atmosphere}`)).size, ids.length);
  assert.equal(core.fallbackEnvironment('unknown').id, 'home');
  assert.notEqual(core.fallbackEnvironment('home', 'wet').field, core.fallbackEnvironment('home', 'grass').field);
});

test('renders procedural fallback pitch and stadium layers in both soccer cameras', () => {
  const side = read('src/game/30-kick-sideview.js');
  const field = read('src/game/32-soccer-3d-modes.js');
  const loop = read('src/game/70-main-loop.js');
  const renderer = read('src/game/50-renderer-3d.js');

  assert.match(side, /fallbackSideScene\(c,k\)/);
  for (const layer of ['fallbackSideAtmosphere', 'fallbackSideRoof', 'fallbackSideStands', 'fallbackSideReturns', 'fallbackSideBoards', 'fallbackSidePitch']) {
    assert.match(side, new RegExp(`${layer}\\(c`), `side-view stadium must call ${layer}`);
  }
  assert.match(side, /__KICKLAB_SIDE_STADIUM__/);
  assert.match(side, /__KICKLAB_SIDE_GOAL__/);
  assert.match(side, /drawSideGoal\(c,X,Y,S\)/);
  for (const primitive of ['frontFrame', 'rearFrame', 'sideNet', 'backNet', 'perspectiveGrid']) assert.match(side, new RegExp(`${primitive}:true`));
  assert.match(side, /boardPhase:this\._sideBoardPhase/);
  assert.match(side, /performance\.now\(\)\/1000\*38/);
  assert.match(side, /perspective-pitch/);
  assert.match(side, /side-returns/);
  assert.match(side, /Math\.pow\(t0,1\.75\)/);
  assert.match(side, /mode:this\.opt\.shot/);
  assert.match(loop, /Kick\.opt\.shot!==['"]dribble['"]\)Kick\.fallbackSideScene\(ctx,k\)/);
  assert.match(renderer, /Kick\.opt\.shot===['"]dribble['"]/);
  assert.match(field, /fallbackStadium\(c,st\)/);
  assert.match(field, /fallbackPitch\(c,st\)/);
  assert.match(field, /__KICKLAB_FALLBACK_ENV__/);
  assert.doesNotMatch(`${side}\n${field}`, /new Image\(|https?:\/\//);
});

test('keeps true side-view spatial fidelity animated and dimensional', () => {
  const side = read('src/game/30-kick-sideview.js');
  assert.match(side, /drawSideGoal\(c,X,Y,S\)/);
  for (const primitive of ['frontFrame', 'rearFrame', 'sideNet', 'backNet', 'perspectiveGrid']) assert.match(side, new RegExp(`${primitive}:true`));
  assert.match(side, /fallbackSideBoards\(c,E,h\)/);
  assert.match(side, /performance\.now\(\)\/1000\*38/);
  assert.match(side, /boardPhase:this\._sideBoardPhase/);
  assert.match(side, /fallbackSidePitch\(c,E,h\)/);
  assert.match(side, /Math\.pow\(t0,1\.75\)/);
  assert.match(side, /fallbackSideReturns\(c,E,h\)/);
  assert.match(side, /side-returns/);
});

test('derives kit telemetry from the same canonical model for gameplay and UI', () => {
  const match = core.kitMetrics(core.KIT_DEFAULTS, { baseShotSpeed: 24, pitch: 'grass', temperatureC: 20, rho: 1.2, airOn: true });
  const hardYouth = core.kitMetrics({ press: 'hard', size: '4', surf: 'smooth', studs: 'sg', boot: 'light' }, { baseShotSpeed: 24, pitch: 'wet', temperatureC: 35, rho: 1.2, airOn: true });

  assert.equal(match.ballMass, 0.43);
  assert.equal(match.shotSpeed, 24);
  assert.equal(match.touchDistance, 0.3);
  assert.equal(match.gripMultiplier, 1);
  assert.equal(match.spinMultiplier, 1.1);
  assert.equal(match.skillTimingMultiplier, 1);
  assert.ok(hardYouth.shotSpeed > match.shotSpeed);
  assert.ok(hardYouth.touchDistance > match.touchDistance);
  assert.equal(hardYouth.gripMultiplier, 1.05);
  assert.equal(hardYouth.spinMultiplier, 0.85);
  assert.equal(hardYouth.skillTimingMultiplier, 0.9);
  assert.ok(hardYouth.dragFactor > 0);
  assert.equal(core.kitMetrics(core.KIT_DEFAULTS, { airOn: false }).dragFactor, 0);
});

test('keeps kit appearance selection and invalid-value fallback canonical', () => {
  const custom = core.kitAppearance({ press: 'soft', size: '4', surf: 'smooth', studs: 'tf', boot: 'heavy' });
  const fallback = core.normalizeKit({ press: 'not-real', size: '9', surf: 'missing', studs: 'ice', boot: 'bare' });

  assert.equal(custom.ball.pattern, 'rings');
  assert.equal(custom.ball.scale, 0.932);
  assert.equal(custom.ball.squash, 0.94);
  assert.equal(custom.boot.profile, 'power');
  assert.equal(custom.boot.sole, 'nubs');
  assert.equal(custom.glove.color, custom.boot.accent);
  assert.deepEqual(fallback, core.KIT_DEFAULTS);
});

test('wires appearance, equipment, telemetry deltas, and WebGL fallback into both render paths', () => {
  const rig = read('src/game/04-body-rig.js');
  const soccer = read('src/game/32-soccer-3d-modes.js');
  const renderer = read('src/game/50-renderer-3d.js');
  const kitRoom = read('src/game/52-leaderboard.js');
  const main = read('src/game/70-main-loop.js');

  assert.match(rig, /hairStyle/);
  assert.match(rig, /studCount/);
  assert.match(soccer, /playerLook\(\)/);
  assert.match(soccer, /Kick\.drawBall/);
  assert.match(renderer, /faceRig\(/);
  assert.match(renderer, /bootRig\(/);
  assert.match(renderer, /this\.ballTextures/);
  assert.match(renderer, /__KICKLAB_RIG_AUDIT__/);
  assert.match(renderer, /local 3D bundle unavailable/);
  assert.doesNotMatch(renderer, /cdnjs|https?:\/\//);
  assert.match(rig, /portrait\(/);
  assert.match(kitRoom, /KITROOM\.change=\{key:k,before,after:kitState\(next\)\}/);
  assert.match(kitRoom, /aria-pressed="\$\{K\[k\]===v\}"/);
  assert.match(main, /V3\.on=V3\.want\(\);if\(V3\.on\)V3\.begin\(\);else V3\.hide\(\)/);
});

test('keeps canonical kit snapshots within a bounded CPU budget', () => {
  const start = performance.now();
  for (let i = 0; i < 20_000; i += 1) {
    core.kitMetrics({ press: i % 2 ? 'match' : 'hard', size: i % 3 ? '5' : '4', surf: i % 2 ? 'tex' : 'smooth', studs: i % 4 ? 'fg' : 'tf', boot: i % 2 ? 'std' : 'light' }, { pitch: 'grass', temperatureC: 20, rho: 1.2, airOn: true });
  }
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 500, `20,000 kit snapshots took ${elapsed.toFixed(1)} ms`);
});
