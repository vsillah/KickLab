import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
const competition=readFileSync(new URL('../src/game/50b-race-competition.js',import.meta.url),'utf8');

test('Race highlight exposes local replay and download with no OS share action or invocation',()=>{
  assert.match(html, /id="raceReplayPreview"[^>]*aria-label="Replay recorded Race run"/);
  assert.match(html, /id="rRaceRecord"[^>]*>Save local highlight</);
  assert.match(html, /id="raceShareDownload"[^>]*>Download file</);
  assert.doesNotMatch(html, /id="raceShareNative"|>Share file</);
  assert.match(competition, /raceCompetitionShowFile\(file\)/);
  assert.match(competition, /link\.download=RACE_COMP_UI\.file\.name;link\.click\(\)/);
  assert.doesNotMatch(competition, /navigator\s*\.\s*(?:share|canShare)\b|raceShareNative|Share was unavailable/);
});
