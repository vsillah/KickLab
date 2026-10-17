import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const html = read('src/index.html');
const profiles = read('src/game/49-profiles.js');
const board = read('src/game/52-leaderboard.js');
const css = read('src/styles.css');

test('keeps one accessible profile entry and dialog with child-safe setup fields', () => {
  for (const id of ['homeProfileButton', 'profileBtn', 'profileDialog', 'profileForm', 'profileNickname', 'profileAvatarChoices', 'profileColorChoices']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} must have one owner`);
  }
  assert.match(html, /Use a made-up nickname\. Keep your real name private\./);
  assert.doesNotMatch(html, /type="(?:email|date|tel)"|name="(?:age|school|location|email|realName)"/i);
});

test('switches the active progress object without reloading the document', () => {
  assert.match(profiles, /profileManager\.switchTo\(button\.dataset\.profileId\);loadActiveProfile\(\)/);
  assert.match(profiles, /Object\.keys\(best\)\.forEach\(key=>delete best\[key\]\);Object\.assign\(best,next\)/);
  assert.doesNotMatch(profiles, /location\.reload|window\.location/);
});

test('keeps local and shared leaderboards visibly separate with an offline fallback', () => {
  assert.match(html, /data-source="local"[^>]*>Local device</);
  assert.match(html, /data-source="shared"[^>]*>Family board \/ shared</);
  assert.match(board, /profileManager\.localRows\(C\.id\)/);
  assert.match(board, /Shared board unavailable\. Local scores are safe on this device\./);
  assert.match(css, /\.fboard\[data-source="local"\] \.fb-me\{display:none\}/);
});

test('defers destructive profile deletion and documents local-only behavior', () => {
  assert.match(html, /Removing profiles is intentionally deferred/);
  assert.doesNotMatch(profiles, /removeItem|deleteProfile|\.delete\(/);
  assert.doesNotMatch(profiles, /fetch\(|XMLHttpRequest|WebSocket/);
});

test('defines responsive profile layouts for tablet and narrow mobile', () => {
  assert.match(css, /@media\(max-width:800px\)[^]*\.profile-list\{grid-template-columns:repeat\(2/);
  assert.match(css, /@media\(max-width:520px\)[^]*\.profile-list\{grid-template-columns:minmax\(0,1fr\)/);
});
