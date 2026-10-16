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
  for(const id of ['opts','liveEq','vars','chart','ticker','mlList','chal','missions','eqs','steps','idea','quiz']){
    assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`${id} must have one owner`);
  }
});

test('provides every inspector destination with an accessible tab and panel',()=>{
  for(const name of ['setup','math','review','goals','learn']){
    assert.match(html,new RegExp(`id="ins-tab-${name}"[^>]+aria-controls="ins-pane-${name}"`));
    assert.match(html,new RegExp(`id="ins-pane-${name}"[^>]+role="tabpanel"[^>]+aria-labelledby="ins-tab-${name}"`));
  }
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
  assert.match(cockpit,/adjustVar\(def\.id,def\.step\*\+b\.dataset\.step\)/);
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
  assert.match(cockpit,/desktopInspectorHost\.appendChild\(inspector\)/);
  assert.match(cockpit,/inspector\.addEventListener\('keydown',e=>\{e\.stopPropagation\(\)/);
  assert.match(css,/\.inspector-tabs button,\.inspector-close\{min-height:44px\}/);
  assert.match(css,/\.inspector-body\{overflow:visible;overscroll-behavior:auto/);
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

test('keeps icon and text setup choices plus the Kit Room in Setup flow',()=>{
  const setup=html.indexOf('id="ins-pane-setup"'),kitRoom=html.indexOf('id="kitroom"',setup),setupEnd=html.indexOf('</section>',kitRoom);
  assert.ok(setup<kitRoom&&kitRoom<setupEnd);
  assert.doesNotMatch(html,/id="kitroom"[^>]+aria-modal/);
  assert.match(ui,/function setupLabel\(id,label\)/);
  assert.match(ui,/className='chip setup-choice/);
  assert.match(kit,/function openKit\(trigger=.*KITROOM\.scrollTop/);
  assert.match(kit,/function closeKit\(\).*scrollTop=KITROOM\.scrollTop/);
  assert.match(css,/\.inspector \.setup-choice\{min-height:48px\}/);
});

test('lets D-pad selection own the adjacent exact quick variable',()=>{
  assert.match(cockpit,/if\(mode==='select'\).*return\[defs\[i\]\]/);
  assert.match(ui,/dialSel\(id\).*renderMathConsole\(\)/);
  assert.match(cockpit,/D-pad selected variable/);
  assert.match(cockpit,/data-step="-1"[^>]+aria-label="Less/);
  assert.match(cockpit,/data-step="1"[^>]+aria-label="More/);
});

test('pauses expanded settings and resumes through existing inspector ownership',()=>{
  assert.match(cockpit,/name==='setup'\)\);/);
  assert.match(cockpit,/setInspectorPause\(false\)/);
  assert.match(html,/id="inspectorState" hidden>Game paused while you adjust this panel/);
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
