(function installKickLabGameplayPacing(root) {
  'use strict';

  function createPauseOwnership() {
    let manual = false;
    const owners = new Set();
    const snapshot = () => Object.freeze({ manual, owners: Object.freeze([...owners]), paused: manual || owners.size > 0 });
    return Object.freeze({
      snapshot,
      setManual(on) { manual = !!on; return snapshot(); },
      claim(owner) { if (owner) owners.add(String(owner)); return snapshot(); },
      release(owner) { owners.delete(String(owner)); return snapshot(); },
      reset() { manual = false; owners.clear(); return snapshot(); }
    });
  }

  function createTransitionSequence({ schedule = setTimeout, cancelSchedule = clearTimeout, onPhase = () => {}, onComplete = () => {}, onCancel = () => {}, durations = {} } = {}) {
    const phases = Object.freeze([
      Object.freeze({ key: 'ready', label: 'READY?', ms: durations.ready == null ? 500 : durations.ready }),
      Object.freeze({ key: '3', label: '3', ms: durations.count == null ? 1000 : durations.count }),
      Object.freeze({ key: '2', label: '2', ms: durations.count == null ? 1000 : durations.count }),
      Object.freeze({ key: '1', label: '1', ms: durations.count == null ? 1000 : durations.count }),
      Object.freeze({ key: 'go', label: 'GO', ms: durations.go == null ? 450 : durations.go })
    ]);
    let token = 0, timer = null, active = false, meta = null, index = -1;
    const state = () => Object.freeze({ active, meta, index, phase: index >= 0 ? phases[index] : null });
    function cancel(reason = 'cancelled') {
      if (!active) return state();
      token += 1; active = false; if (timer != null) cancelSchedule(timer); timer = null;
      const prior = meta; meta = null; index = -1; onCancel(reason, prior); return state();
    }
    function start(nextMeta = {}) {
      if (active) cancel('replaced');
      const run = ++token; active = true; meta = Object.freeze({ ...nextMeta }); index = -1;
      const advance = () => {
        if (!active || run !== token) return;
        index += 1;
        if (index >= phases.length) { active = false; timer = null; const completeMeta = meta; meta = null; index = -1; onComplete(completeMeta); return; }
        onPhase(phases[index], meta, index);
        timer = schedule(advance, Math.max(0, phases[index].ms));
      };
      advance(); return state();
    }
    return Object.freeze({ phases, state, start, cancel });
  }

  function createLifecycleSession({ onSuspend = () => {}, onForeground = () => {}, onResume = () => {} } = {}) {
    let active = true, awaitingPlayerResume = false, lastReason = 'startup', suspensions = 0;
    const state = () => Object.freeze({ active, awaitingPlayerResume, lastReason, suspensions });
    function suspend(reason = 'background') {
      lastReason = String(reason);
      if (!active && awaitingPlayerResume) return state();
      active = false; awaitingPlayerResume = true; suspensions += 1;
      onSuspend(lastReason, state()); return state();
    }
    function foreground(reason = 'foreground') {
      active = true; lastReason = String(reason); onForeground(lastReason, state()); return state();
    }
    function resume(reason = 'player-resume') {
      if (!active || !awaitingPlayerResume) return state();
      awaitingPlayerResume = false; lastReason = String(reason); onResume(lastReason, state()); return state();
    }
    return Object.freeze({ state, suspend, foreground, resume });
  }

  root.KickLabGameplayPacing = Object.freeze({ apiVersion: '1.1.0', createPauseOwnership, createTransitionSequence, createLifecycleSession });
})(globalThis);
