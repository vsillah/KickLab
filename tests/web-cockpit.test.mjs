import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(join(root,'src','index.html'),'utf8');
const cockpit=readFileSync(join(root,'src','game','54-web-cockpit.js'),'utf8');
const replay=readFileSync(join(root,'src','game','60-pause-replay.js'),'utf8');
const ui=readFileSync(join(root,'src','game','41-ui.js'),'utf8');
const progress=readFileSync(join(root,'src','game','01-progress.js'),'utf8');
const challenges=readFileSync(join(root,'src','game','02-challenges-coaches.js'),'utf8');
const kit=readFileSync(join(root,'src','game','52-leaderboard.js'),'utf8');
const css=readFileSync(join(root,'src','styles.css'),'utf8');

test('keeps relocated feature roots canonical and singular',()=>{
  for(const id of ['quickSettings','settingsDrawer','settingsCategories','settingsChoices','kitroom','liveEq','vars','chart','ticker','mlList','chal','missions','eqs','steps','idea','quiz']){
    assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`${id} must have one owner`);
  }
});

test('provides every inspector destination with an accessible tab and panel',()=>{
  for(const name of ['math','review','goals','learn']){
    assert.match(html,new RegExp(`id="ins-tab-${name}"[^>]+aria-controls="ins-pane-${name}"`));
    assert.match(html,new RegExp(`id="ins-pane-${name}"[^>]+role="tabpanel"[^>]+aria-labelledby="ins-tab-${name}"`));
  }
  assert.doesNotMatch(html,/id="ins-tab-setup"|id="ins-pane-setup"/);
});

test('keeps gameplay controls outside the canvas stage',()=>{
  const stageEnd=html.indexOf('</div>\n        <div class="control-deck"');
  assert.ok(stageEnd>html.indexOf('<div class="stage">'));
  assert.ok(html.indexOf('id="pad"')>stageEnd);
  assert.ok(html.indexOf('id="mathHud"')>stageEnd);
});

test('attaches one Math Console directly to the gameplay controls',()=>{
  const deck=html.indexOf('class="control-deck"'),consoleRoot=html.indexOf('id="mathConsole"'),utility=html.indexOf('id="utilitySlot"');
  assert.ok(deck<consoleRoot&&consoleRoot<utility);
  for(const id of ['mathConsole','mathConsolePanel','mathConsolePull','mathConsoleControls'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.match(cockpit,/function quickMathDefs\(\).*M\.vars\(\)/);
  assert.match(cockpit,/adjustVar\(def\.id,def\.step\*\+b\.dataset\.step,manual\)/);
  assert.match(cockpit,/setInspectorPane\('math',\{focus:true,open:true\}\)/);
  assert.doesNotMatch(cockpit,/mathConsoleControls[^\n]+appendChild\(\$\('#(?:liveEq|vars)'\)\)/);
});

test('keeps Math Console input ownership and focus return explicit',()=>{
  assert.match(cockpit,/mathConsole\.addEventListener\('pointerdown',e=>e\.stopPropagation\(\)\)/);
  assert.match(cockpit,/mathConsole\.addEventListener\('keydown',e=>\{e\.stopPropagation\(\)/);
  assert.match(cockpit,/if\(restore\)mathConsolePull\.focus\(\)/);
  assert.match(css,/\.math-console-panel\{[^}]*max-height:[^;]+;overflow-y:auto;overscroll-behavior:contain/);
  assert.doesNotMatch(css,/\.math-console-panel\{[^}]*position:fixed/);
});

test('anchors one responsive utility belt directly after the control deck',()=>{
  const deck=html.indexOf('class="control-deck"'),slot=html.indexOf('id="utilitySlot"'),dials=html.indexOf('id="dials"');
  assert.ok(deck<slot&&slot<dials);
  assert.equal((html.match(/id="utilitySlot"/g)||[]).length,1);
  assert.match(cockpit,/utilitySlot\.appendChild\(inspector\)/);
  assert.match(cockpit,/inspector\.addEventListener\('keydown',e=>\{e\.stopPropagation\(\)/);
  assert.match(css,/\.inspector-tabs button,\.inspector-close\{min-height:44px\}/);
  assert.match(css,/Final in-game utility ownership: no persistent desktop sidecar/);
  assert.match(css,/\.inspector-body\{box-sizing:border-box;position:absolute;[^}]*overflow-y:auto;overscroll-behavior:contain/);
  assert.match(css,/\.play\{grid-template-columns:minmax\(0,1fr\)\}/);
});

test('derives compact math from mode definitions and explicit equation data',()=>{
  assert.match(cockpit,/M\.vars\(\)/);
  assert.match(cockpit,/M\.LIVE\(\)/);
  assert.match(cockpit,/M\.eqs\(\)/);
  assert.doesNotMatch(cockpit,/liveEq[^\n]+(?:innerText|textContent)/);
});

test('returns Dials content to the Math pane exactly once',()=>{
  assert.match(replay,/function returnDialsContent\(\)/);
  assert.match(replay,/liveEq'\)\.parentElement!==pane/);
  assert.match(replay,/vars'\)\.parentElement!==pane/);
});

test('blocks Dials while another result or replay surface owns the stage',()=>{
  assert.match(replay,/function dialsUnavailableReason\(\)/);
  assert.match(replay,/if\(RP\.on\).*during replay/);
  assert.match(replay,/if\(resOpen\(\)\).*results are open/);
  assert.match(replay,/function openDials\(\).*syncDialsAvailability\(\);if\(dialsUnavailableReason\(\)\)return/);
  assert.match(progress,/function showResults\(m\)[\s\S]*renderMathConsole/);
  assert.match(html,/id="dialTopStatus" aria-live="polite"/);
});

test('renders readable labels with the existing control symbols',()=>{
  assert.match(ui,/class="action-label"/);
  assert.match(ui,/class="dir-label"/);
  assert.match(html,/>Dials <span class="k">P<\/span>/);
});

test('uses one on-game hierarchical settings experience',()=>{
  const stage=html.indexOf('<div class="stage">'),settings=html.indexOf('id="gameSettings"'),deck=html.indexOf('class="control-deck"'),kitRoom=html.indexOf('id="kitroom"',settings);
  assert.ok(stage<settings&&settings<deck&&settings<kitRoom);
  assert.doesNotMatch(html,/id="kitroom"[^>]+aria-modal/);
  for(const id of ['settingsToggle','quickSettings','settingsDrawer','settingsBack','settingsClose','settingsCategories','settingsChoices'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.match(ui,/function setupLabel\(id,label\)/);
  assert.match(ui,/function quickSettingSpecs\(groups\)/);
  for(const label of ['Mode','Player','Environment','Kit'])assert.match(ui,new RegExp(`label:'${label}'`));
  assert.match(ui,/function settingsGroups\(\)/);
  assert.match(ui,/kind:'kit'/);
  assert.match(cockpit,/function setSettingsLevel\(level/);
  assert.match(cockpit,/if\(SETTINGS\.level==='kit'\).*'choices'/);
  assert.match(cockpit,/else if\(SETTINGS\.level==='choices'\).*'categories'/);
  assert.match(cockpit,/if\(e\.key==='Escape'\).*closeSettings\(\)/);
  assert.match(kit,/function openKit\(trigger=.*showKitSettings\(trigger\)/);
  assert.match(kit,/function closeKit\(\).*setSettingsLevel\('choices'/);
  assert.match(css,/\.settings-drawer\{position:absolute/);
  assert.match(css,/\.settings-drawer-body\{[^}]*overflow-y:auto;overscroll-behavior:contain/);
  assert.match(css,/\.settings-drawer \.setup-choice\{min-height:48px/);
  assert.match(css,/\.quick-setting\{min-height:48px/);
});

test('lets D-pad selection own the adjacent exact quick variable',()=>{
  assert.match(cockpit,/if\(mode==='select'\).*return\[defs\[i\]\]/);
  assert.match(ui,/dialSel\(id\).*renderMathConsole\(\)/);
  assert.match(cockpit,/D-pad selected variable/);
  assert.match(cockpit,/data-step="-1"[^>]+aria-label="Less/);
  assert.match(cockpit,/data-step="1"[^>]+aria-label="More/);
});

test('swaps the D-pad footprint into guarded Manual Physics',()=>{
  assert.match(html,/class="controller-mode-toggle" role="group" aria-label="Controller mode"/);
  assert.match(html,/id="controllerModePlay" aria-pressed="true"/);
  assert.match(html,/id="controllerModeManual" aria-pressed="false"/);
  assert.match(html,/id="controllerModeStatus" role="status" aria-live="polite"/);
  assert.match(html,/id="padL"[^]*id="manualController" hidden/);
  assert.match(cockpit,/function manualMathDefs\(\)\{return M\.vars\(\)/);
  assert.match(cockpit,/function selectedManualDef\(\)/);
  assert.match(cockpit,/slider\.min=def\.min;slider\.max=def\.max;slider\.step=def\.step/);
  assert.match(cockpit,/CONTROLLER\.sel\+=delta/);
  assert.match(cockpit,/pauseGame\('manual-physics'\)/);
  assert.match(cockpit,/PAUSE\.why==='manual-physics'/);
  assert.match(cockpit,/function manualUnavailableReason\(\)/);
  assert.match(cockpit,/if\(resOpen\(\)\)return'Manual Physics is unavailable while results are open/);
  assert.match(cockpit,/setControllerMode\('play',\{restore:false,reason\}\)/);
  assert.match(cockpit,/e\.key==='Escape'.*setControllerMode\('play'\)/);
  assert.match(ui,/function adjustVar\(id,delta,allowManualPause=false\)/);
  assert.match(css,/\.control-left-slot\{width:158px;height:178px/);
  assert.match(css,/\.manual-controller\{box-sizing:border-box;grid-row:3;width:158px;height:126px/);
  assert.match(css,/\.manual-controller button\{[^}]*min-height:44px/);
  assert.doesNotMatch(cockpit,/math-console-var\$\{manual/);
});

test('keeps settings and the bounded utility drawer mutually exclusive',()=>{
  assert.match(cockpit,/if\(open&&!settingsDrawer\.hidden\)closeSettings\(\{restore:false\}\)/);
  assert.match(cockpit,/if\(inspector\.classList\.contains\('open'\)\)closeInspector\(\{restore:false\}\)/);
  assert.match(cockpit,/function syncInspectorLayout\(\)\{[^}]*utilitySlot\.appendChild\(inspector\)/);
  assert.doesNotMatch(cockpit,/desktopInspectorHost/);
  assert.match(css,/\.inspector-body\{box-sizing:border-box;position:absolute;[^}]*max-height:min\(520px,calc\(100vh - 160px\)\);overflow-y:auto/);
  assert.match(css,/\.panel\.inspector\.open \.inspector-body\{[^}]*max-height:min\(520px,calc\(100vh - 160px\)\)/);
});

test('pauses and resumes through canonical settings ownership',()=>{
  assert.match(cockpit,/function setSettingsPause\(on\)/);
  assert.match(cockpit,/pauseGame\('settings'\)/);
  assert.match(cockpit,/PAUSE\.why==='settings'/);
  assert.match(cockpit,/function openSettings\(category=null,trigger=settingsToggle\)/);
  assert.match(cockpit,/function closeSettings\(\{restore=true\}=\{\}\)/);
  assert.match(cockpit,/trigger\.isConnected/);
  assert.match(html,/id="settingsState">Game paused while settings are open/);
  assert.doesNotMatch(cockpit,/INSPECTOR\.pane==='setup'/);
});

test('puts coach and challenge guidance in the stage without duplicating nodes',()=>{
  const stage=html.indexOf('<div class="stage">'),hud=html.indexOf('id="gameGuidanceHud"'),deck=html.indexOf('class="control-deck"');
  assert.ok(stage<hud&&hud<deck);
  for(const id of ['challengeHud','coach','coachMsg'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.match(css,/\.game-guidance-hud\{display:grid/);
});

test('makes completed goals transient, dismissible, and linked to persistent details',()=>{
  assert.match(progress,/class="toast-action"/);
  assert.match(progress,/class="toast-close" aria-label="Dismiss/);
  assert.match(progress,/\$\('#toasts'\)\.addEventListener\('keydown',e=>e\.stopPropagation\(\)\)/);
  assert.match(challenges,/action:'View goals'/);
  assert.match(challenges,/setInspectorPane\('goals'/);
  assert.match(css,/\.toast\{pointer-events:auto/);
});
