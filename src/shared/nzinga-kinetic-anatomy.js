(function installKickLabNzinga(root) {
  'use strict';

  const QUERY_KEY = 'nzinga';
  const CONTACT_PHI = 0.33;
  const CONTACT_DRIFT_MAX_M = 0.13;
  const STORAGE_KEYS = Object.freeze(['impactlab.v1', 'impactlab.nick']);
  const JOINT_PAIRS = Object.freeze([
    ['head', 'neck'], ['neck', 'pel'],
    ['neck', 'shF'], ['shF', 'elF'], ['elF', 'haF'],
    ['neck', 'shR'], ['shR', 'elR'], ['elR', 'haR'],
    ['pel', 'hipF'], ['hipF', 'knF'], ['knF', 'anF'], ['anF', 'toF'],
    ['pel', 'hipR'], ['hipR', 'knR'], ['knR', 'anR'], ['anR', 'toR']
  ].map((pair) => Object.freeze(pair)));
  const HIGHLIGHT_JOINTS = Object.freeze(['shF', 'elF', 'pel', 'hipF', 'knF', 'anF']);
  const ANATOMY = Object.freeze({
    skull: 'head', spine: Object.freeze(['neck', 'pel']), pelvis: 'pel',
    longBones: Object.freeze([
      Object.freeze(['shF', 'elF']), Object.freeze(['elF', 'haF']),
      Object.freeze(['shR', 'elR']), Object.freeze(['elR', 'haR']),
      Object.freeze(['hipF', 'knF']), Object.freeze(['knF', 'anF']),
      Object.freeze(['hipR', 'knR']), Object.freeze(['knR', 'anR'])
    ]),
    feet: Object.freeze([Object.freeze(['anF', 'toF']), Object.freeze(['anR', 'toR'])])
  });

  function enabledFromSearch(search = '') {
    try { return new URLSearchParams(String(search)).get(QUERY_KEY) === '1'; }
    catch (_) { return false; }
  }

  function tier({ enabled = false, webgl = false, reduced = false } = {}) {
    if (!enabled) return 'off';
    if (!webgl) return 'canvas';
    return reduced ? 'reduced' : 'full';
  }

  function phase({ state = '', contact = false, phi = -1, replay = false, coaching = false } = {}) {
    if (replay) return 'replay';
    if (state === 'swing' && (contact || Number(phi) >= CONTACT_PHI)) return 'contact';
    if (coaching) return 'coaching';
    return 'quiet';
  }

  function relevant(input = {}) { return phase(input) !== 'quiet'; }

  function jointSignature(joints = {}) {
    return JOINT_PAIRS.map(([a, b]) => {
      const A = joints[a] || {}, B = joints[b] || {};
      return `${a}:${b}:${Number(A.x ?? A.X ?? 0).toFixed(3)},${Number(A.y ?? A.Y ?? 0).toFixed(3)}>${Number(B.x ?? B.X ?? 0).toFixed(3)},${Number(B.y ?? B.Y ?? 0).toFixed(3)}`;
    }).join('|');
  }

  function contactAudit({ state = '', contact = false, foot, ball } = {}) {
    const dx = Number(foot?.x) - Number(ball?.x);
    const dy = Number(foot?.y) - Number(ball?.y);
    const driftM = Number.isFinite(dx) && Number.isFinite(dy) ? Math.hypot(dx, dy) : Infinity;
    return Object.freeze({
      exact: state === 'swing' && contact === true,
      driftM,
      thresholdM: CONTACT_DRIFT_MAX_M,
      withinThreshold: state === 'swing' && contact === true && driftM <= CONTACT_DRIFT_MAX_M
    });
  }

  root.KickLabNzinga = Object.freeze({
    apiVersion: '1.0.0',
    QUERY_KEY,
    CONTACT_PHI,
    CONTACT_DRIFT_MAX_M,
    STORAGE_KEYS,
    JOINT_PAIRS,
    HIGHLIGHT_JOINTS,
    ANATOMY,
    enabledFromSearch,
    tier,
    phase,
    relevant,
    jointSignature,
    contactAudit
  });
})(globalThis);
