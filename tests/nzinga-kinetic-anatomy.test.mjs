import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

await import('../src/shared/nzinga-kinetic-anatomy.js');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const nzinga = globalThis.KickLabNzinga;

test('keeps Direction C explicitly default-off and URL-scoped', () => {
  assert.equal(nzinga.enabledFromSearch(''), false);
  assert.equal(nzinga.enabledFromSearch('?nzinga=0'), false);
  assert.equal(nzinga.enabledFromSearch('?nzinga=1'), true);
  assert.equal(nzinga.enabledFromSearch('?mode=kick&nzinga=1&rev=abc'), true);
});

test('selects full, reduced, and Canvas tiers deterministically', () => {
  assert.equal(nzinga.tier({ enabled: false, webgl: true }), 'off');
  assert.equal(nzinga.tier({ enabled: true, webgl: true, reduced: false }), 'full');
  assert.equal(nzinga.tier({ enabled: true, webgl: true, reduced: true }), 'reduced');
  assert.equal(nzinga.tier({ enabled: true, webgl: false }), 'canvas');
});

test('limits kinetic anatomy to contact, coaching, and replay', () => {
  assert.equal(nzinga.phase({ state: 'aim', phi: -1 }), 'quiet');
  assert.equal(nzinga.phase({ state: 'swing', phi: 0.1 }), 'quiet');
  assert.equal(nzinga.phase({ state: 'swing', phi: 0.28 }), 'quiet');
  assert.equal(nzinga.phase({ state: 'swing', phi: 0.33 }), 'contact');
  assert.equal(nzinga.phase({ state: 'swing', contact: true }), 'contact');
  assert.equal(nzinga.phase({ state: 'swing', contact: true, coaching: true }), 'contact');
  assert.equal(nzinga.phase({ coaching: true }), 'coaching');
  assert.equal(nzinga.phase({ replay: true, coaching: true }), 'replay');
});

test('requires the canonical striking foot to meet the ball at exact contact', () => {
  const good = nzinga.contactAudit({ state: 'swing', contact: true, foot: { x: -.1, y: .116 }, ball: { x: 0, y: .11 } });
  assert.equal(good.exact, true);
  assert.equal(good.withinThreshold, true);
  assert.ok(good.driftM <= nzinga.CONTACT_DRIFT_MAX_M);
  assert.equal(nzinga.contactAudit({ state: 'swing', contact: false, foot: { x: 0, y: 0 }, ball: { x: 0, y: 0 } }).withinThreshold, false);
  assert.equal(nzinga.contactAudit({ state: 'flight', contact: true, foot: { x: 0, y: 0 }, ball: { x: 0, y: 0 } }).exact, false);
});

test('uses the shared joint contract for both renderers', () => {
  const side = read('src/game/30-kick-sideview.js');
  const renderer = read('src/game/50-renderer-3d.js');
  assert.match(side, /V3\.side\(this,J,x,opts\)/);
  assert.match(side, /RIG\.kinetic\(c,J/);
  assert.equal(nzinga.ANATOMY.longBones.length, 8);
  assert.equal(nzinga.ANATOMY.feet.length, 2);
  assert.match(renderer, /NZINGA_CORE\.ANATOMY/);
  assert.match(renderer, /skull:mkA/);
  assert.match(renderer, /ribs:Array\.from/);
  assert.match(renderer, /nzingaSignature:NZINGA_CORE\.jointSignature\(j\)/);
  assert.match(renderer, /nzingaSameRig:true/);
});

test('preserves privacy, storage, and offline boundaries', () => {
  const shared = read('src/shared/nzinga-kinetic-anatomy.js');
  const loop = read('src/game/70-main-loop.js');
  assert.deepEqual(nzinga.STORAGE_KEYS, ['impactlab.v1', 'impactlab.nick']);
  assert.doesNotMatch(shared, /fetch\(|XMLHttpRequest|WebSocket|https?:\/\//);
  assert.match(loop, /externalRequests:nzExternalRequests/);
  assert.match(loop, /storageWrites:0/);
});
