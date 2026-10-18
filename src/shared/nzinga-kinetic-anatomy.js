(function installKickLabNzinga(root) {
  'use strict';

  const QUERY_KEY = 'nzinga';
  const CONTACT_PHI = 0.28;
  const STORAGE_KEYS = Object.freeze(['impactlab.v1', 'impactlab.nick']);
  const JOINT_PAIRS = Object.freeze([
    ['head', 'neck'], ['neck', 'pel'],
    ['neck', 'shF'], ['shF', 'elF'], ['elF', 'haF'],
    ['neck', 'shR'], ['shR', 'elR'], ['elR', 'haR'],
    ['pel', 'hipF'], ['hipF', 'knF'], ['knF', 'anF'], ['anF', 'toF'],
    ['pel', 'hipR'], ['hipR', 'knR'], ['knR', 'anR'], ['anR', 'toR']
  ].map((pair) => Object.freeze(pair)));
  const HIGHLIGHT_JOINTS = Object.freeze(['shF', 'elF', 'pel', 'hipF', 'knF', 'anF']);

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
    if (coaching) return 'coaching';
    if (state === 'swing' && (contact || Number(phi) >= CONTACT_PHI)) return 'contact';
    return 'quiet';
  }

  function relevant(input = {}) { return phase(input) !== 'quiet'; }

  function jointSignature(joints = {}) {
    return JOINT_PAIRS.map(([a, b]) => {
      const A = joints[a] || {}, B = joints[b] || {};
      return `${a}:${b}:${Number(A.x ?? A.X ?? 0).toFixed(3)},${Number(A.y ?? A.Y ?? 0).toFixed(3)}>${Number(B.x ?? B.X ?? 0).toFixed(3)},${Number(B.y ?? B.Y ?? 0).toFixed(3)}`;
    }).join('|');
  }

  root.KickLabNzinga = Object.freeze({
    apiVersion: '1.0.0',
    QUERY_KEY,
    CONTACT_PHI,
    STORAGE_KEYS,
    JOINT_PAIRS,
    HIGHLIGHT_JOINTS,
    enabledFromSearch,
    tier,
    phase,
    relevant,
    jointSignature
  });
})(globalThis);
