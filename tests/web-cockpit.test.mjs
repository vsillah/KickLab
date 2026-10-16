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
  assert.match(html,/id="dialTopStatus" aria-live="polite"/);
});

test('renders readable labels with the existing control symbols',()=>{
  assert.match(ui,/class="action-label"/);
  assert.match(ui,/class="dir-label"/);
  assert.match(html,/>Dials <span class="k">P<\/span>/);
});
