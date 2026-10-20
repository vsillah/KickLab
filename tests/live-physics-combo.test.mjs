import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const source = readFileSync(join(process.cwd(), 'src/shared/live-physics-combo.js'), 'utf8');
const context = { globalThis: {}, decodeURIComponent };
vm.runInNewContext(source, context);
const COMBO = context.globalThis.KickLabLivePhysicsCombo;
const step = (id, target, durationMs = 1200) => ({ id, choices: [1, 2, 3, 4, 5, 6], target, durationMs });

test('feature flag is default off and accepts explicit enabled values only', () => {
  assert.equal(COMBO.flagEnabled(''), false);
  assert.equal(COMBO.flagEnabled('?livePhysicsCombo=0'), false);
  assert.equal(COMBO.flagEnabled('?other=1&livePhysicsCombo=1'), true);
  assert.equal(COMBO.flagEnabled('livePhysicsCombo=true'), true);
});

test('correct values lock in order and resolve success after the final variable', () => {
  const locked = [], resolved = [];
  const engine = COMBO.createEngine({ onLock: lock => locked.push(lock.id), onResolve: result => resolved.push(result.kind) });
  engine.start([step('mass', { lo: 2, hi: 3 }), step('padding', { lo: 4, hi: 5 })], { mode: 'fight' });
  assert.equal(engine.choose(3, 'pointer').status, 'active');
  assert.equal(engine.state().index, 1);
  assert.equal(engine.choose(4, 'keyboard').status, 'resolved');
  assert.deepEqual(locked, ['mass', 'padding']);
  assert.deepEqual(resolved, ['success']);
  assert.equal(engine.state().locks.map(lock => lock.input).join(','), 'pointer,keyboard');
});

test('an incorrect choice advances and resolves only after the final variable', () => {
  const engine = COMBO.createEngine();
  engine.start([step('grip', { lo: 4, hi: 6 }), step('radius', { lo: 2, hi: 3 })]);
  const first = engine.choose(1, 'touch');
  assert.equal(first.status, 'active');
  assert.equal(first.index, 1);
  const state = engine.choose(2, 'pointer');
  assert.equal(state.status, 'resolved');
  assert.equal(state.result.kind, 'incorrect');
  assert.equal(state.result.completed, true);
  assert.equal(state.locks.length, 2);
});

test('real-time ticking advances at the visible deadline and completes the sequence', () => {
  const engine = COMBO.createEngine();
  engine.start([{ ...step('angle', { lo: 2, hi: 4 }, 900), timeoutValue: 1 }, step('speed', { lo: 3, hi: 5 }, 700)]);
  assert.equal(engine.tick(899).status, 'active');
  const advanced = engine.tick(1);
  assert.equal(advanced.status, 'active');
  assert.equal(advanced.index, 1);
  assert.equal(advanced.locks[0].timedOut, true);
  const state = engine.tick(700);
  assert.equal(state.status, 'resolved');
  assert.equal(state.result.kind, 'timeout');
  assert.equal(state.remainingMs, 0);
  assert.equal(state.locks.length, 2);
});

test('cancellation is idempotent and prevents later input or timers from resolving', () => {
  const events = [];
  const engine = COMBO.createEngine({ onCancel: result => events.push(result.reason), onResolve: result => events.push(result.kind) });
  engine.start([step('speed', { lo: 2, hi: 4 })]);
  assert.equal(engine.cancel('settings').status, 'cancelled');
  engine.cancel('lifecycle'); engine.tick(5000); engine.choose(3);
  assert.deepEqual(events, ['settings']);
  assert.equal(engine.state().result.reason, 'settings');
});

test('the canonical kick pair clears both outcome gates with collision margin', () => {
  const gravity = 9.81, speed = 22, angle = 18 * Math.PI / 180;
  const vx = speed * Math.cos(angle), vy = speed * Math.sin(angle);
  const heightAt = distance => 0.11 + vy * (distance / vx) - 0.5 * gravity * (distance / vx) ** 2;
  assert.ok(heightAt(9.15) - (1.85 + 0.11) >= 0.08);
  assert.ok(heightAt(21) < 2.44 - 0.11);
  assert.ok(heightAt(21) > 0.11);
  assert.ok(heightAt(9.0) > 1.85 + 0.11, 'the pre-wall collision plane also clears');
});
