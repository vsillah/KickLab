import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/shared/game-core.js');

const { STORAGE_KEYS, calculateFreeKick, timeAtDistance } = globalThis.KickLabGameCore;

const baseKick = Object.freeze({
  speed: 22,
  angleDegrees: 17,
  gravity: 9.81,
  spinAcceleration: 0,
  startHeight: 0.11,
  horizontalAcceleration: 0,
  wallDistance: 9.15,
  goalDistance: 21,
  wallHeight: 1.85,
  crossbarHeight: 2.44,
  ballRadius: 0.11,
  keeperReach: 0,
  ballMass: 0.43,
  contactSeconds: 0.009
});

test('keeps legacy local progress keys stable', () => {
  assert.deepEqual(STORAGE_KEYS, {
    progress: 'impactlab.v1',
    nickname: 'impactlab.nick'
  });
  assert.equal(Object.isFrozen(STORAGE_KEYS), true);
});

test('calculates a deterministic free-kick result without browser APIs', () => {
  const first = calculateFreeKick(baseKick);
  const second = calculateFreeKick(baseKick);

  assert.deepEqual(first, second);
  assert.equal(first.kind, 'free-kick');
  assert.equal(first.clearsWall, true);
  assert.equal(first.underCrossbar, true);
  assert.equal(first.scores, true);
  assert.ok(Math.abs(first.wallY - 1.9796595793) < 1e-9);
  assert.ok(Math.abs(first.goalY - 1.6433750393) < 1e-9);
  assert.ok(Math.abs(first.impulseForce - 1051.1111111111) < 1e-9);
});

test('uses the reachable root when horizontal acceleration changes flight time', () => {
  const time = timeAtDistance(21, 20, -2);
  assert.ok(Math.abs(time - 1.1118055827) < 1e-9);
  assert.equal(timeAtDistance(21, 2, -1), Infinity);
});

test('accounts for keeper reach in the scoring decision', () => {
  const result = calculateFreeKick({ ...baseKick, keeperReach: 2.1 });
  assert.equal(result.clearsWall, true);
  assert.equal(result.underCrossbar, false);
  assert.equal(result.scores, false);
});

test('matches the imported v42 no-air formula across representative inputs', () => {
  const cases = [
    baseKick,
    { ...baseKick, speed: 15, angleDegrees: 30 },
    { ...baseKick, gravity: 1.62, spinAcceleration: 2.5 },
    { ...baseKick, speed: 30, angleDegrees: 8, horizontalAcceleration: -1.5 }
  ];

  for (const input of cases) {
    const actual = calculateFreeKick(input);
    const radians = input.angleDegrees * Math.PI / 180;
    const vx = input.speed * Math.cos(radians);
    const vy = input.speed * Math.sin(radians);
    const effectiveGravity = input.gravity + input.spinAcceleration;
    const wallTime = timeAtDistance(input.wallDistance, vx, input.horizontalAcceleration);
    const goalTime = timeAtDistance(input.goalDistance, vx, input.horizontalAcceleration);
    const heightAt = (time) => Number.isFinite(time)
      ? input.startHeight + vy * time - 0.5 * effectiveGravity * time * time
      : -1;

    assert.ok(Math.abs(actual.wallY - heightAt(wallTime)) < 1e-12);
    assert.ok(Math.abs(actual.goalY - heightAt(goalTime)) < 1e-12);
    assert.equal(actual.clearsWall, actual.wallY > input.wallHeight + input.ballRadius);
    assert.equal(
      actual.underCrossbar,
      actual.goalY < input.crossbarHeight - input.ballRadius
        && actual.goalY > Math.max(input.ballRadius, input.keeperReach + input.ballRadius)
    );
  }
});
