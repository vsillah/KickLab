import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root=process.cwd();
const read=path=>readFileSync(join(root,path),'utf8');
const runtime=read('src/game/62-live-physics-combo.js');
const html=read('src/index.html');
const styles=read('src/styles.css');
const build=read('scripts/build.mjs');

test('build loads the shared engine before the game runtime',()=>{
  assert.match(build,/const shared = \[[^\]]*'live-physics-combo\.js'[^\]]*\]/);
  assert.match(build,/const game = shared \+ '\\n' \+ parts\.map/);
  assert.ok('live-physics-combo.js'.localeCompare('62-live-physics-combo.js')>0,'shared code is emitted before every sorted game fragment');
});

test('runtime reuses canonical variable, suggestion, and six-slot models',()=>{
  assert.match(runtime,/activeVariableProfile\(\)/);
  assert.match(runtime,/M\.suggest\?M\.suggest\(\)/);
  assert.match(runtime,/GAME_CORE\.sliderSlotsModel/);
  assert.match(runtime,/function liveComboChoices\(def,target,model\)/);
  assert.match(runtime,/Math\.ceil\(\(Math\.min\(target\.lo,target\.hi\)-def\.min-1e-9\)\/def\.step\)/);
  assert.match(html,/id="livePhysicsComboBand" role="radiogroup"/);
  assert.match(html,/class="control-center-slot">[^]*id="livePhysicsCombo"[^]*id="wideManualController"/);
  assert.match(runtime,/class="live-physics-choice prototype-slot"/);
  assert.match(styles,/grid-template-columns:repeat\(6,minmax\(44px,1fr\)\)/);
});

test('paginates selections and timeouts before restoring the passive controller module',()=>{
  const engine=read('src/shared/live-physics-combo.js');
  assert.match(engine,/function advance\(lock\)/);
  assert.match(engine,/timedOut: true, input: 'timeout'/);
  assert.match(runtime,/floatingControlDeck\.classList\.add\('live-combo-active'\)/);
  assert.match(runtime,/renderLiveComboPassive\(\)/);
  assert.match(runtime,/E\.ts=1/);
  assert.doesNotMatch(html,/live-physics-combo-coach[^>]*>[^<]*<i>TO<\/i><b>Coach Tomi<\/b>/);
});

test('Fight presents one progressive performance HUD without concurrent timing and choice controls',()=>{
  const fight=read('src/game/10-fight.js');
  assert.match(fight,/drawPerformanceHud\(c\)/);
  assert.match(fight,/\['TIME IT','TUNE IT','SEE IT'\]/);
  assert.doesNotMatch(fight,/this\.drawBoard\(c\)/);
  assert.match(runtime,/dataset\.phase=fight\?'time':'ready'/);
  assert.match(runtime,/dataset\.phase=fight\?'tune':'choose'/);
  assert.match(runtime,/liveComboEl\.dataset\.phase='see'/);
  assert.match(runtime,/fight\?'Choose one value\. Timing is locked\.':liveComboEquation/);
  assert.match(runtime,/Fight\.performanceLocks=state\.locks/);
});

test('joint plans and live cached values stay coupled to the existing outcomes',()=>{
  assert.match(runtime,/for\(const v of liveComboValues\(byId\.v\)\)for\(const th of liveComboValues\(byId\.th\)\)/);
  assert.match(runtime,/clearMargin<\.08\|\|barMargin<\.05/);
  assert.match(runtime,/Fight\.dodged=!winding&&!stunned/);
  assert.match(runtime,/Kick\.v=bounded;const prediction=Kick\.freeCalc\(Kick\.v,Kick\.V\.th\)/);
  assert.match(runtime,/min:\.01/);
});

test('rendered QA rejects overlay-only success and proves existing outcomes',()=>{
  const qa=read('scripts/qa-live-physics-combo.mjs');
  assert.match(qa,/fightSuccess\.force>fightFailure\.force\*2/);
  assert.match(qa,/raceSuccess\.entry<=raceSuccess\.limit\*1\.02/);
  assert.match(qa,/kickSuccess\.outcome==='goal'/);
  assert.match(qa,/videoSources\.map\(item=>item\.label\)/);
  assert.match(qa,/External requests observed/);
});

test('Fight, Race, and Kick sequences bind to existing active variables',()=>{
  assert.match(runtime,/fight:Object\.freeze\(\{activity:'Punch exchange',ids:Object\.freeze\(\['m','dt'\]\)/);
  assert.match(runtime,/race:Object\.freeze\(\{activity:'Corner',ids:Object\.freeze\(\['mu','R'\]\)/);
  assert.match(runtime,/kick:Object\.freeze\(\{activity:'Free-kick strike',ids:Object\.freeze\(\['v','th'\]\)/);
});

test('default-off input path preserves the existing action call',()=>{
  assert.match(runtime,/M\.press\(id,down\);if\(!LIVE_COMBO_ENABLED\|\|!down\)return/);
  assert.match(runtime,/flagEnabled\(location\.search\)/);
});

test('pause, replay, results, mode changes, and lifecycle cancel deterministically',()=>{
  const pause=read('src/game/61-gameplay-pacing.js');
  const loop=read('src/game/70-main-loop.js');
  assert.match(runtime,/if\(PAUSE\.on\)return`pause:/);
  assert.match(runtime,/if\(RP\.on\)return'replay'/);
  assert.match(runtime,/if\(resOpen\(\)\)return'results'/);
  assert.match(runtime,/cancelLivePhysicsCombo\('mode-changed'\)/);
  assert.match(pause,/cancelLivePhysicsCombo\(`pause:\$\{owner\}`\)/);
  assert.match(loop,/tickLivePhysicsCombo\(rdt\)/);
});

test('Classic, keyboard, analog, gesture, touch, and pointer inputs share gameInput',()=>{
  const ui=read('src/game/41-ui.js');
  const keyboard=read('src/game/53-weekly-challenge.js');
  const analog=read('src/game/55-analog-gesture-controls.js');
  assert.match(ui,/gameInput\(a\.id,true,'classic-pointer'\)/);
  assert.match(ui,/gameInput\(a\.id,true,'classic-keyboard'\)/);
  assert.match(keyboard,/gameInput\(id,true,'keyboard'/);
  assert.match(analog,/gameInput\(id,true,'analog'\)/);
  assert.match(analog,/gameInput\(action\.id,true,'gesture'\)/);
  assert.match(runtime,/chooseLiveCombo\(event\.target\.closest\('\.live-physics-choice'\),'pointer'\)/);
  assert.match(runtime,/chooseLiveCombo\(button,'keyboard'\)/);
});

test('prototype adds no network or persistence channel',()=>{
  assert.doesNotMatch(runtime,/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB)\b/);
  assert.match(runtime,/storageWrites:0/);
});

test('responsive targets retain accessible controls and reduced-motion fallback',()=>{
  assert.match(styles,/\.live-physics-choice\{[^}]*min-width:44px;min-height:48px/);
  assert.match(styles,/@media\(max-width:800px\)/);
  assert.match(styles,/@media\(max-width:480px\)/);
  assert.match(styles,/@media\(prefers-reduced-motion:reduce\)\{\.live-physics-combo/);
});
