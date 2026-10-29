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
  assert.match(html, /id="gameGuidanceHud"[^>]*>[\s\S]*class="profile-hud contextual-summary"[^>]+id="profileHud"[\s\S]*id="profileBtn"/);
  assert.match(html, /id="profileBtn"[^>]+aria-expanded="false"[^>]+aria-controls="profileDialog"/);
  assert.match(html, /id="hudProfileAvatar"[^>]*>[A-Z]<\/span><b id="hudProfileName">[^<]+<\/b><small id="hudProfileState">Ready<\/small>/);
  assert.doesNotMatch(html, /class="game-player-tools"[^>]*>[\s\S]{0,300}id="profileBtn"/);
  assert.match(profiles, /function openProfiles[\s\S]*closeSettings\(\{restore:false,restart:false\}\)[\s\S]*closeContextDetail\(\{restore:false,restart:false\}\)[\s\S]*pauseGame\('profile'\)/);
  assert.match(profiles, /function closeProfiles[\s\S]*releasePauseOwner\('profile',\{restart\}\)[\s\S]*trigger\.focus\(\)/);
  assert.match(profiles, /openProfiles[\s\S]*setAttribute\('aria-expanded',String\(inGame\)\)/);
  assert.match(profiles, /closeProfiles[\s\S]*setAttribute\('aria-expanded','false'\)/);
  assert.match(profiles, /class="profile-stat profile-current-play"[\s\S]*id="profileCurrentPlay"[\s\S]*id="profileCurrentContext"/);
  assert.match(css, /\.stage>\.profile-dialog\.game-profile-overlay\{position:absolute;z-index:25/);
  assert.match(css, /\.profile-hud-summary\{[^}]+grid-template-columns:18px minmax\(0,1fr\)/);
  assert.match(css, /\.stage>\.profile-dialog\.game-profile-overlay \.profile-panel\{[^}]+background:rgba\(5,14,29,\.2\)/);
  assert.match(css, /@media \(max-width:800px\)\{\.game-frame \.stage:has\(>\.profile-dialog\.game-profile-overlay:not\(\[hidden\]\)\)\{z-index:30\}\.play\.has-game-overlay \.control-deck\{opacity:\.5;filter:saturate\(\.15\) brightness\(\.18\) blur\(1\.5px\)\}\}/);
});

test('switches active progress without reloading, while confirmed deletion restarts cleanly', () => {
  assert.match(profiles, /profileManager\.switchTo\(button\.dataset\.profileId\);loadActiveProfile\(\)/);
  assert.match(profiles, /Object\.keys\(best\)\.forEach\(key=>delete best\[key\]\);Object\.assign\(best,next\)/);
  assert.match(profiles, /profileManager\.switchTo\(button\.dataset\.profileId\);loadActiveProfile\(\)/);
  assert.match(profiles, /deleteAllLocalData\(localStorage,sessionStorage,globalThis\.caches\)[\s\S]*window\.location\.reload\(\)/);
});

test('keeps local and shared leaderboards visibly separate with an offline fallback', () => {
  assert.match(html, /data-source="local"[^>]*>Local device</);
  assert.match(html, /data-source="shared"[^>]*>Family board \/ shared</);
  assert.match(board, /profileManager\.localRows\(C\.id\)/);
  assert.match(board, /Shared board unavailable\. Local scores are safe on this device\./);
  assert.match(css, /\.fboard\[data-source="local"\] \.fb-me\{display:none\}/);
});

test('offers guardian data deletion with a separate explicit confirmation', () => {
  assert.match(html, /For parents and guardians/);
  assert.match(html, /id="profileDeleteOpen"[^>]*>Delete all local data/);
  assert.match(html, /id="profileDeleteConfirm" role="alertdialog"[^>]*hidden/);
  assert.match(html, /id="profileDeleteCancel"[^>]*>Cancel · keep data/);
  assert.match(html, /id="profileDeleteConfirmButton"[^>]*>Yes, delete all local data/);
  assert.match(profiles, /profileDeleteCancel'\)\.addEventListener\('click',\(\)=>closeProfileDelete\(\)\)/);
  assert.doesNotMatch(profiles, /fetch\(|XMLHttpRequest|WebSocket/);
});

test('defines responsive profile layouts for tablet and narrow mobile', () => {
  assert.match(css, /@media\(max-width:800px\)[^]*\.profile-list\{grid-template-columns:repeat\(2/);
  assert.match(css, /@media\(max-width:520px\)[^]*\.profile-list\{grid-template-columns:minmax\(0,1fr\)/);
});
