(function installKickLabLivePhysicsCombo(root) {
  'use strict';

  const freeze = value => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  };

  function flagEnabled(search = '') {
    const raw = String(search || '').replace(/^\?/, '');
    return raw.split('&').some(pair => {
      const [key, value = ''] = pair.split('=').map(part => decodeURIComponent(part || ''));
      return key === 'livePhysicsCombo' && ['1', 'true', 'on'].includes(value.toLowerCase());
    });
  }

  function evaluateChoice(variable, value) {
    const numeric = Number(value), target = variable && variable.target;
    const correct = Number.isFinite(numeric) && !!target && Number.isFinite(target.lo) && Number.isFinite(target.hi) && numeric >= Math.min(target.lo, target.hi) - 1e-9 && numeric <= Math.max(target.lo, target.hi) + 1e-9;
    return freeze({ correct, value: numeric, target: target ? { lo: Number(target.lo), hi: Number(target.hi) } : null });
  }

  function progressiveDetailModel({ variable, value, previousValue, impact, coach = '', graphicLabel = '' } = {}) {
    if (!variable || !variable.id || !variable.name) throw new Error('progressive detail requires a variable');
    const selectedValue = Number(value), priorValue = Number(previousValue);
    if (!Number.isFinite(selectedValue) || !Number.isFinite(priorValue)) throw new Error('progressive detail requires numeric values');
    const sourceImpact = impact && typeof impact === 'object' ? impact : {};
    const sourceKind = String(sourceImpact.kind || 'neutral');
    const tone = sourceKind === 'hurts' ? 'warn' : ['helps', 'tradeoff'].includes(sourceKind) ? sourceKind : 'neutral';
    const toneLabel = { helps: 'Helps', tradeoff: 'Trade-off', warn: 'Warning', neutral: 'Explore' }[tone];
    const decimals = Math.max(0, Number.isFinite(Number(variable.decimals)) ? Number(variable.decimals) : 1);
    const unit = String(variable.unit || '');
    const format = number => `${Number(number).toFixed(decimals)}${unit ? unit === '°' ? '°' : ` ${unit}` : ''}`;
    const selected = format(selectedValue), previous = format(priorValue);
    const changed = Math.abs(selectedValue - priorValue) < 1e-9 ? `Selected ${selected}` : `${previous} → ${selected}`;
    return freeze({
      variableId: String(variable.id),
      variableName: String(variable.name),
      value: selectedValue,
      previousValue: priorValue,
      unit,
      selected,
      previous,
      changed,
      tone,
      toneLabel,
      label: String(sourceImpact.label || toneLabel),
      prediction: String(sourceImpact.prediction || ''),
      coach: String(coach || ''),
      graphicLabel: String(graphicLabel || '')
    });
  }

  function fightInteractionPhase({ actionReady = true, comboStatus = 'idle', comboMode = null, comboIndex = -1, comboLength = 0, showResult = false } = {}) {
    const physicsInteractive = comboMode === 'fight' && comboStatus === 'active';
    const phase = physicsInteractive ? 'tune' : showResult || !actionReady ? 'see' : 'time';
    const timingInteractive = phase === 'time' && actionReady;
    return freeze({ phase, timingInteractive, physicsInteractive, timingLocked: !timingInteractive, currentStep: physicsInteractive ? comboIndex + 1 : 0, totalSteps: physicsInteractive ? comboLength : 0 });
  }

  function createEngine({ onChange = () => {}, onLock = () => {}, onResolve = () => {}, onCancel = () => {} } = {}) {
    let run = 0;
    let state = { status: 'idle', run, sequence: [], index: -1, remainingMs: 0, locks: [], result: null, meta: null };
    const snapshot = () => freeze({ ...state, sequence: state.sequence.map(item => ({ ...item })), locks: state.locks.map(item => ({ ...item })), result: state.result ? { ...state.result } : null, meta: state.meta ? { ...state.meta } : null });
    const emit = () => { const next = snapshot(); onChange(next); return next; };
    function resolve(kind, detail = {}) {
      if (state.status !== 'active') return snapshot();
      state = { ...state, status: 'resolved', remainingMs: 0, result: { kind, ...detail } };
      const next = emit(); onResolve(next.result, next); return next;
    }
    function start(sequence, meta = {}) {
      if (!Array.isArray(sequence) || !sequence.length) throw new Error('live physics combo requires at least one variable');
      if (state.status === 'active') cancel('replaced');
      run += 1;
      const normalized = sequence.map((item, index) => {
        if (!item || !item.id || !Array.isArray(item.choices) || !item.choices.length) throw new Error(`invalid live physics combo variable at ${index}`);
        const durationMs = Math.max(250, Number(item.durationMs) || 2400);
        const choices = item.choices.map(Number), timeoutValue = Number.isFinite(Number(item.timeoutValue)) ? Number(item.timeoutValue) : choices[0];
        return freeze({ ...item, choices, timeoutValue, durationMs, target: item.target ? { lo: Number(item.target.lo), hi: Number(item.target.hi) } : null });
      });
      state = { status: 'active', run, sequence: normalized, index: 0, remainingMs: normalized[0].durationMs, locks: [], result: null, meta: { ...meta } };
      return emit();
    }
    function advance(lock) {
      state = { ...state, locks: [...state.locks, lock] };
      onLock(freeze({ ...lock }), snapshot());
      if (state.index >= state.sequence.length - 1) {
        const locks = state.locks, kind = locks.some(item => item.timedOut) ? 'timeout' : locks.some(item => !item.correct) ? 'incorrect' : 'success';
        return resolve(kind, { variableId: lock.id, value: lock.value, input: lock.input, completed: true });
      }
      const index = state.index + 1;
      state = { ...state, index, remainingMs: state.sequence[index].durationMs };
      return emit();
    }
    function choose(value, input = 'unknown') {
      if (state.status !== 'active') return snapshot();
      const variable = state.sequence[state.index], evaluation = evaluateChoice(variable, value), lock = { id: variable.id, value: evaluation.value, correct: evaluation.correct, timedOut: false, input, index: state.index };
      return advance(lock);
    }
    function tick(elapsedMs) {
      if (state.status !== 'active') return snapshot();
      const remainingMs = state.remainingMs - Math.max(0, Number(elapsedMs) || 0);
      if (remainingMs <= 0) {
        const variable = state.sequence[state.index], evaluation = evaluateChoice(variable, variable.timeoutValue), lock = { id: variable.id, value: variable.timeoutValue, correct: evaluation.correct, timedOut: true, input: 'timeout', index: state.index };
        return advance(lock);
      }
      state = { ...state, remainingMs };
      return emit();
    }
    function cancel(reason = 'cancelled') {
      if (state.status !== 'active') return snapshot();
      state = { ...state, status: 'cancelled', remainingMs: 0, result: { kind: 'cancelled', reason: String(reason) } };
      const next = emit(); onCancel(next.result, next); return next;
    }
    function reset() {
      if (state.status === 'active') cancel('reset');
      state = { status: 'idle', run, sequence: [], index: -1, remainingMs: 0, locks: [], result: null, meta: null };
      return emit();
    }
    return freeze({ start, choose, tick, cancel, reset, state: snapshot });
  }

  root.KickLabLivePhysicsCombo = freeze({ apiVersion: '1.2.0', flagEnabled, evaluateChoice, progressiveDetailModel, fightInteractionPhase, createEngine });
})(globalThis);
