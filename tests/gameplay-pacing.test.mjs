import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const source = readFileSync(join(process.cwd(), 'src/shared/gameplay-pacing.js'), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const PACING = context.globalThis.KickLabGameplayPacing;

function fakeClock() {
  let now = 0, nextId = 1;
  const tasks = new Map();
  return {
    schedule(fn, ms) { const id = nextId++; tasks.set(id, { at: now + ms, fn }); return id; },
    cancel(id) { tasks.delete(id); },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const due = [...tasks.entries()].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!due) break;
        tasks.delete(due[0]); now = due[1].at; due[1].fn();
      }
      now = end;
    },
    pending() { return tasks.size; }
  };
}

test('manual pause survives nested panel ownership until explicitly resumed', () => {
  const pause = PACING.createPauseOwnership();
  pause.setManual(true); pause.claim('settings'); pause.claim('profile');
  assert.equal(pause.release('settings').paused, true);
  assert.deepEqual([...pause.release('profile').owners], []);
  assert.equal(pause.snapshot().paused, true);
  assert.equal(pause.setManual(false).paused, false);
});

test('the final panel releases play only when no other owner remains', () => {
  const pause = PACING.createPauseOwnership();
  pause.claim('settings'); pause.claim('context-detail');
  assert.equal(pause.release('settings').paused, true);
  assert.equal(pause.release('context-detail').paused, false);
});

test('transition sequence is deterministic from READY through GO', () => {
  const clock = fakeClock(), seen = [], completed = [];
  const sequence = PACING.createTransitionSequence({ schedule: clock.schedule, cancelSchedule: clock.cancel, onPhase: phase => seen.push(phase.label), onComplete: meta => completed.push(meta.activity) });
  sequence.start({ activity: 'Free kick' });
  assert.deepEqual(seen, ['READY?']);
  clock.advance(500); assert.deepEqual(seen, ['READY?', '3']);
  clock.advance(1000); assert.deepEqual(seen, ['READY?', '3', '2']);
  clock.advance(1000); assert.deepEqual(seen, ['READY?', '3', '2', '1']);
  clock.advance(1000); assert.deepEqual(seen, ['READY?', '3', '2', '1', 'GO']);
  clock.advance(450); assert.deepEqual(completed, ['Free kick']); assert.equal(sequence.state().active, false);
});

test('cancel invalidates scheduled phases and a restart begins at READY', () => {
  const clock = fakeClock(), seen = [], cancelled = [];
  const sequence = PACING.createTransitionSequence({ schedule: clock.schedule, cancelSchedule: clock.cancel, onPhase: (phase, meta) => seen.push(`${meta.activity}:${phase.label}`), onCancel: (reason, meta) => cancelled.push(`${meta.activity}:${reason}`) });
  sequence.start({ activity: 'Fight' }); clock.advance(500);
  sequence.cancel('panel-open'); clock.advance(5000);
  assert.deepEqual(seen, ['Fight:READY?', 'Fight:3']); assert.deepEqual(cancelled, ['Fight:panel-open']); assert.equal(clock.pending(), 0);
  sequence.start({ activity: 'Race' });
  assert.equal(seen.at(-1), 'Race:READY?');
});

test('lifecycle foreground remains paused until an explicit player resume', () => {
  const events = [];
  const lifecycle = PACING.createLifecycleSession({
    onSuspend: reason => events.push(`suspend:${reason}`),
    onForeground: reason => events.push(`foreground:${reason}`),
    onResume: reason => events.push(`resume:${reason}`)
  });
  assert.deepEqual({ ...lifecycle.suspend('document-hidden') }, { active: false, awaitingPlayerResume: true, lastReason: 'document-hidden', suspensions: 1 });
  assert.equal(lifecycle.foreground('document-visible').awaitingPlayerResume, true);
  assert.equal(lifecycle.resume('player-gesture').awaitingPlayerResume, false);
  assert.deepEqual(events, ['suspend:document-hidden', 'foreground:document-visible', 'resume:player-gesture']);
});

test('lifecycle resume is ignored while the app is still inactive', () => {
  const events = [];
  const lifecycle = PACING.createLifecycleSession({ onResume: reason => events.push(reason) });
  lifecycle.suspend('page-hidden');
  assert.equal(lifecycle.resume('too-early').awaitingPlayerResume, true);
  assert.deepEqual(events, []);
});

test('duplicate background signals cancel once and resume once', () => {
  const events = [];
  const lifecycle = PACING.createLifecycleSession({
    onSuspend: reason => events.push(`cancel:${reason}`),
    onForeground: reason => events.push(`foreground:${reason}`),
    onResume: reason => events.push(`resume:${reason}`)
  });
  lifecycle.suspend('document-hidden');
  const duplicate = lifecycle.suspend('page-hidden');
  assert.deepEqual({ ...duplicate }, { active: false, awaitingPlayerResume: true, lastReason: 'page-hidden', suspensions: 1 });
  assert.equal(lifecycle.foreground('document-visible').awaitingPlayerResume, true);
  assert.equal(lifecycle.resume('player-resume').awaitingPlayerResume, false);
  assert.equal(lifecycle.resume('duplicate-resume').awaitingPlayerResume, false);
  assert.deepEqual(events, ['cancel:document-hidden', 'foreground:document-visible', 'resume:player-resume']);
});

test('game integrations route initial, continuous, panel, lifecycle and Match transitions through pacing owners', () => {
  const read = file => readFileSync(join(process.cwd(), file), 'utf8');
  const mode = read('src/game/53-weekly-challenge.js');
  const match = read('src/game/42-match.js');
  const continuous = read('src/game/51-live-match.js');
  const cockpit = read('src/game/54-web-cockpit.js');
  const lifecycle = read('src/game/56-mobile-lifecycle.js');
  assert.match(mode, /startGameTransition\(\{activity:\{fight:'Fight round',race:'Race run',kick:'Free kick'\}\[k\]\}\)/);
  assert.match(continuous, /begin\(\).*startGameTransition\(\{activity:/s);
  assert.match(continuous, /advance\(\).*startGameTransition\(\{activity:/s);
  assert.match(match, /startGameTransition\(\{activity:`\$\{m\}' · \$\{T\[0\]\}`,presentation:'match',matchTransition:/s);
  assert.match(match, /this\.tr=null;E\.title=null;SND\.whoosh\(\)/);
  assert.match(match, /Match pacing reuses the imported-v42 canvas banner/);
  assert.match(match, /if\(tr\.pacing\).*tr\.phase.*tr\.title/s);
  assert.match(match, /tr\.mapping\|\|\{\}/);
  assert.match(match, /compact=tr\.pacing&&innerWidth<=480/);
  assert.match(read('src/game/61-gameplay-pacing.js'), /if\(isMatchPresentation\(meta\)\)renderMatchPacing/);
  assert.match(read('src/game/61-gameplay-pacing.js'), /pacingOverlay\.dataset\.presentation='match'/);
  assert.match(cockpit, /pauseGame\('context-detail'\)/);
  assert.match(cockpit, /releasePauseOwner\('settings',\{restart\}\)/);
  assert.match(lifecycle, /claimPauseOwner\('mobile-lifecycle'\)/);
  assert.match(lifecycle, /visibilitychange[\s\S]*document\.hidden\?suspendMobileSession\('document-hidden'\):foregroundMobileSession\('document-visible'\)/);
  assert.match(lifecycle, /releaseMobileHeldInputs[\s\S]*cancelGesture\(reason\)/);
  assert.match(lifecycle, /suspendMobileAudio[\s\S]*AC\.suspend\(\)/);
  assert.match(read('src/game/61-gameplay-pacing.js'), /MOBILE_SHELL\.resume\('player-resume'\)/);
  assert.doesNotMatch(read('src/index.html'), /fonts\.googleapis\.com|fonts\.gstatic\.com/);
});
