import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('loaded unflagged home activates Race gates without a document request',()=>{
  const location=new URL('https://vsillah.github.io/KickLab/?rev=offline-entry');
  const document={documentElement:{dataset:{}}};
  const context=vm.createContext({location,document,URL,URLSearchParams});
  for(const path of [
    'src/shared/race-origin.js',
    'src/shared/race-modes.js',
    'src/game/19-race-systems.js',
    'src/game/19a-race-telemetry.js',
    'src/game/19b-race-corner-trace.js'
  ])vm.runInContext(read(path),context,{filename:path});
  const before=vm.runInContext('({modes:KickLabRaceModes.enabled(),systems:RACE_SYSTEMS.enabled(),telemetry:RACE_TELEMETRY.enabled,trace:RACE_CORNER_TRACE.enabled})',context);
  assert.deepEqual({...before},{modes:false,systems:false,telemetry:false,trace:false});
  let documentRequests=0,historyUpdates=0;
  const outcome=context.KickLabRaceOrigin.enterFromHome(location,null,()=>documentRequests++,url=>{historyUpdates++;location.href=url;});
  assert.equal(outcome,'local');
  assert.equal(documentRequests,0);
  assert.equal(historyUpdates,1);
  assert.equal(location.searchParams.get('rev'),'offline-entry');
  for(const [key,value] of Object.entries(context.KickLabRaceOrigin.HOME_FLAGS))assert.equal(location.searchParams.get(key),value,key);
  const after=vm.runInContext('({modes:KickLabRaceModes.enabled(),systems:RACE_SYSTEMS.enabled(),telemetry:RACE_TELEMETRY.enabled,trace:RACE_CORNER_TRACE.enabled})',context);
  assert.deepEqual({...after},{modes:true,systems:true,telemetry:true,trace:true});
  assert.equal(document.documentElement.dataset.raceSystems,'proxy');
  assert.equal(document.documentElement.dataset.raceTelemetry,'prototype');
  assert.equal(document.documentElement.dataset.raceCornerTrace,'prototype');
});
