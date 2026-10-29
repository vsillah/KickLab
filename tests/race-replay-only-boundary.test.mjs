import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('../src/index.html');
const competition=read('../src/game/50b-race-competition.js');
const loop=read('../src/game/70-main-loop.js');
const multiplayer=read('../src/game/50c-race-multiplayer.js');
const championship=read('../src/game/50d-race-championship.js');

test('Race results retain replay and review without file export or OS sharing',()=>{
  assert.match(html,/id="raceReplayPreview"[^>]*aria-label="Replay recorded Race run"/);
  assert.match(html,/id="raceReplayFallback"[^>]*>Replay recorded run</);
  assert.match(html,/id="raceResultCoach"/);
  assert.match(html,/id="rRaceBoard"/);
  assert.doesNotMatch(html,/id="(?:rRaceRecord|raceShare|raceShareDownload|raceShareNative)"|Save local highlight|Download file|Share file/);
  assert.doesNotMatch(competition,/MediaRecorder|captureStream|toBlob|createObjectURL|revokeObjectURL|\.download\s*=|new File\(|navigator\s*\.\s*(?:share|canShare)\b|raceCompetitionCaptureFrame|raceCompetitionRecordHighlight|raceShare/);
  assert.doesNotMatch(loop,/raceCompetitionCaptureFrame/);
  assert.doesNotMatch(multiplayer,/raceShare/);
  assert.doesNotMatch(championship,/rRaceRecord/);
});
