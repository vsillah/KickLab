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
const games=readFileSync(join(root,'src','game','42-match.js'),'utf8');
const live=readFileSync(join(root,'src','game','51-live-match.js'),'utf8');
const challenges=readFileSync(join(root,'src','game','02-challenges-coaches.js'),'utf8');
const kit=readFileSync(join(root,'src','game','52-leaderboard.js'),'utf8');
const css=readFileSync(join(root,'src','styles.css'),'utf8');

test('keeps relocated feature roots canonical and singular',()=>{
  for(const id of ['quickSettings','settingsDrawer','settingsCategories','settingsChoices','kitroom','liveEq','vars','chart','ticker','mlList','chal','missions','eqs','steps','idea','quiz']){
    assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`${id} must have one owner`);
  }
});

test('maps the four contextual summaries to accessible disclosures',()=>{
  for(const [trigger,panel] of [['physicsDetailsCompact','physicsDetail'],['physicsDetailsWide','physicsDetail'],['reviewDetailToggle','reviewDetail'],['goalsDetailToggle','goalsDetail'],['learnDetailToggle','learnDetail']]){
    assert.match(html,new RegExp(`id="${trigger}"[^>]+aria-expanded="false"[^>]+aria-controls="${panel}"`));
  }
  for(const id of ['physicsDetail','reviewDetail','goalsDetail','learnDetail'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.doesNotMatch(html,/id="contextMenuSlot"|id="inspector"|id="ins-tab-|id="ins-pane-/);
});

test('keeps gameplay controls outside the canvas stage',()=>{
  const stageEnd=html.indexOf('</div>\n        <div class="control-deck"');
  assert.ok(stageEnd>html.indexOf('<div class="stage">'));
  assert.ok(html.indexOf('id="pad"')>stageEnd);
  assert.ok(html.indexOf('id="physicsDetail"')>html.indexOf('id="pad"'));
  assert.ok(html.indexOf('id="physicsDetail"')<html.indexOf('id="rbar"'));
});

test('keeps canonical Math content in the physics disclosure',()=>{
  const detail=html.indexOf('id="physicsDetail"'),liveEq=html.indexOf('id="liveEq"'),vars=html.indexOf('id="vars"'),rbar=html.indexOf('id="rbar"');
  assert.ok(detail<liveEq&&liveEq<vars&&vars<rbar);
  for(const id of ['mathHudTitle','mathConsoleValues','mathConsoleStatus','mathConsoleHeading','mathConsoleControls','dialTop','dialTopStatus'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.doesNotMatch(html,/id="mathConsole"|id="mathConsolePull"|id="utilitySlot"|id="mathHud"|id="mathHudEquation"|id="mathHudValues"/);
  assert.match(cockpit,/function quickMathDefs\(\).*M\.vars\(\)/);
  assert.match(cockpit,/adjustVar\(def\.id,def\.step\*\+b\.dataset\.step,manual\)/);
  assert.doesNotMatch(cockpit,/mathConsoleControls[^\n]+appendChild\(\$\('#(?:liveEq|vars)'\)\)/);
});

test('keeps contextual detail input ownership and focus return explicit',()=>{
  assert.match(cockpit,/document\.querySelectorAll\('\.context-detail'\)\.forEach\(p=>\{p\.addEventListener\('pointerdown',e=>e\.stopPropagation\(\)\);p\.addEventListener\('keydown',e=>\{if\(e\.key==='Escape'\).*closeContextDetail\(\)/);
  assert.match(cockpit,/if\(restore&&trigger&&trigger\.isConnected&&!trigger\.hidden\)trigger\.focus\(\)/);
  assert.match(cockpit,/if\(e\.key==='Escape'&&CONTEXT_DETAILS\.open\).*closeContextDetail\(\)/);
  assert.match(css,/\.context-detail\{[^}]*max-height:min\(390px,42vh\);overflow-y:auto;overscroll-behavior:contain/);
  assert.doesNotMatch(css,/\.context-detail\{[^}]*position:(?:fixed|absolute)/);
});

test('opens only one responsive contextual detail at a time',()=>{
  assert.match(cockpit,/document\.querySelectorAll\('\.context-detail'\)\.forEach\(p=>p\.hidden=p!==panel\)/);
  assert.match(cockpit,/\['math','review','goals','learn'\]\.forEach\(n=>contextTriggers\(n\)\.forEach\(b=>b\.setAttribute\('aria-expanded',String\(n===name\)\)\)\)/);
  assert.match(cockpit,/if\(!PAUSE\.on\)\{pauseGame\('context-detail'\)/);
  assert.match(cockpit,/if\(CONTEXT_DETAILS\.ownsPause&&PAUSE\.why==='context-detail'\).*resumeGame\(\)/);
  assert.match(css,/\.contextual-summary:has\(>\.context-detail:not\(\[hidden\]\)\)\{grid-column:1\/-1\}/);
  assert.match(css,/@media \(max-width:700px\)[\s\S]*\.context-detail\{max-height:min\(330px,40vh\)/);
});

test('derives compact math from mode definitions and explicit equation data',()=>{
  assert.match(cockpit,/M\.vars\(\)/);
  assert.match(cockpit,/M\.LIVE\(\)/);
  assert.match(cockpit,/M\.eqs\(\)/);
  assert.doesNotMatch(cockpit,/liveEq[^\n]+(?:innerText|textContent)/);
});

test('returns Dials content to the Math pane exactly once',()=>{
  assert.match(replay,/function returnDialsContent\(\)/);
  assert.match(replay,/const pane=\$\('#physicsDetail'\)/);
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

test('keeps Match, Live Match, and bounded Freestyle selection in one attached rail',()=>{
  assert.match(live,/const CONTINUOUS=\{experience:'freestyle',running:false,on:false,picks:\[\],i:0,status:''/);
  assert.match(live,/games\(\)\{return GAMES\.filter\(g=>!g\.sequence\);\}/);
  assert.match(live,/id="experienceMatch"[\s\S]*?id="experienceLive"[\s\S]*?id="experienceFreestyle"/);
  assert.match(live,/if\(experience==='match'\)MATCH\.begin\(\);else LIVEM\.begin\(\);/);
  assert.match(games,/const MATCH=\{on:false,i:0,you:0,them:0[\s\S]*?evs=\['run','combo','corner','counter','run','combo','corner','counter'\]/);
  assert.match(games,/end\(\)\{const w=this\.you>this\.them[\s\S]*?FULL TIME/);
  assert.match(live,/const LIVEM=\{on:false,T:240,left:240,you:0,them:0,saves:0,passes:0/);
  assert.match(live,/clock\(\)\{const s=Math\.ceil\(this\.left\)/);
  assert.match(live,/Live Match started · four minutes of nonstop possession, attack, goalkeeping, clock, and score\./);
  assert.match(live,/Choose one for a single activity\. Choose more than one for Continuous Play\./);
  assert.match(live,/if\(this\.picks\.length>=3\).*Three-activity limit reached/);
  assert.match(live,/primaryLabel\(\)\{return!this\.picks\.length\?'Choose activity':this\.picks\.length===1\?'Play activity':'Start continuous';\}/);
  assert.match(live,/id="freestyleStart"\$\{selected\.length&&!CONTINUOUS\.running\?'':' disabled'\}/);
  assert.match(live,/setAttribute\('role','checkbox'\)/);
  assert.match(live,/setAttribute\('aria-checked'/);
  assert.match(live,/class="game-order"/);
  assert.match(live,/showOrder=selected\.length>1&&order/);
  assert.match(live,/pickGame\(this\.picks\[0\],true,true\)/);
  assert.match(live,/this\.on=this\.picks\.length>1/);
  assert.match(live,/this\.i=\(this\.i\+1\)%this\.picks\.length/);
  assert.match(live,/function focusFreestylePlay\(\).*#padR button:not\(:disabled\)/);
  assert.match(live,/function stopExperiencePlayback\(\).*RP\.on.*exitReplay\(\).*CINE\.on.*CINE\.done=null/s);
  assert.match(live,/requestAnimationFrame\(\(\)=>\$\('#experienceFreestyle'\)\?\.focus\(\)\)/);
  assert.doesNotMatch(live,/id="continuousToggle"/);
  assert.match(progress,/CONTINUOUS\.on\)\{CONTINUOUS\.advance\(\);return;\}/);
  assert.match(progress,/CONTINUOUS\.nextLabel\(\)/);
  assert.match(games,/k:'match'[\s\S]*?sequence:true/);
  assert.match(games,/k:'live'[\s\S]*?sequence:true/);
  assert.match(css,/\.gamebar-track\{[^}]*overflow-x:auto/);
  assert.match(css,/\.continuous-start,\.continuous-cancel\{[^}]*min-height:44px/);
  assert.match(css,/\.experience-tabs\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.game-order\{position:absolute/);
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
  assert.match(css,/\.control-left-slot\{width:158px;height:178px;[^}]*pointer-events:auto/);
  assert.match(css,/\.manual-controller\{box-sizing:border-box;grid-row:3;width:158px;height:126px/);
  assert.match(css,/\.manual-controller button\{[^}]*min-height:44px/);
  assert.doesNotMatch(cockpit,/math-console-var\$\{manual/);
});

test('projects every canonical manual variable into the wide control gap',()=>{
  assert.match(html,/id="wideManualController" aria-label="Desktop manual physics controls"/);
  assert.match(html,/id="wideManualStatus">Changes apply immediately/);
  assert.match(html,/id="wideManualRows"/);
  assert.match(cockpit,/const WIDE_MANUAL=\{active:false,sig:''\}/);
  assert.match(cockpit,/function wideManualDefs\(\)\{return M\.vars\(\);\}/);
  assert.match(cockpit,/class="wide-manual-row" data-var="\$\{def\.id\}"/);
  assert.match(cockpit,/input type="range"[^>]+aria-label="\$\{quickMathName\(def\)\}"/);
  assert.match(cockpit,/input\.setAttribute\('aria-valuetext',cockpitValue\(def,M\.V\[def\.id\]\)\)/);
  assert.match(cockpit,/wideManualRows\.addEventListener\('input'/);
  assert.match(cockpit,/adjustVar\(def\.id,\+input\.value-M\.V\[def\.id\],false\)/);
  assert.match(cockpit,/manualUnavailableReason\(\).*isLocked\(M\.key,def\.id\)/s);
  assert.match(cockpit,/new ResizeObserver\(entries=>\{const active=entries\[0\]\.contentRect\.width>=980/);
  assert.match(css,/\.wide-manual-controller\{display:none/);
  assert.match(css,/\.wide-manual-controller\{display:none;[^}]*pointer-events:auto/);
  assert.match(css,/\.manual-controller input\[type="range"\],\.wide-manual-row input\[type="range"\]\{pointer-events:auto;touch-action:none;cursor:pointer\}/);
  assert.match(css,/\.manual-controller input\[type="range"\]:disabled,\.wide-manual-row input\[type="range"\]:disabled\{pointer-events:none;cursor:not-allowed\}/);
  assert.match(css,/@container \(min-width:980px\)\{\.control-deck \.pad\{display:grid;grid-template-columns:minmax\(220px,1fr\) minmax\(380px,520px\) minmax\(220px,1fr\)/);
  assert.match(css,/\.control-deck #padR\{width:100%;height:190px;align-items:center;justify-content:center\}/);
  assert.match(css,/\.control-deck \.dpad\{grid-template-columns:repeat\(3,54px\);grid-template-rows:repeat\(3,54px\)\}/);
  assert.match(css,/\.control-deck \.abtn \.cap\{width:76px;height:76px\}/);
  assert.match(css,/\.control-deck \.abtn\.big \.cap\{width:96px;height:96px\}/);
  assert.match(css,/\.control-left-slot,\.wide-manual-controller,\.control-deck #padR\{box-sizing:border-box;border:1px solid rgba\(87,126,176,\.34\);border-radius:16px/);
  assert.match(css,/\.control-deck \.dpad \.arm\{box-sizing:border-box;display:grid;grid-template-columns:1fr;grid-template-rows:minmax\(0,1fr\) 10px/);
  assert.match(css,/\.control-deck \.dpad \.arm \.tag,\.control-deck \.dpad \.arm \.dir-label\{position:static!important;inset:auto!important/);
  assert.match(css,/\.control-deck \.abtn \.cap::before\{content:"";position:absolute;inset:var\(--cap-inset\);border-radius:50%/);
  assert.match(css,/\.wide-manual-row\{display:grid;grid-template-columns:82px 76px minmax\(120px,1fr\)/);
});

test('keeps settings and contextual details mutually exclusive',()=>{
  assert.match(cockpit,/function openSettings\(category=null,trigger=settingsToggle\)\{\s*if\(CONTEXT_DETAILS\.open\)closeContextDetail\(\{restore:false\}\)/);
  assert.match(cockpit,/function setContextDetail\(name,[\s\S]*if\(!settingsDrawer\.hidden\)closeSettings\(\{restore:false\}\)/);
  assert.doesNotMatch(cockpit,/INSPECTOR|contextMenuSlot|closeInspector|syncInspectorLayout/);
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

test('puts coach, challenge, and history guidance in the stage without duplicating nodes',()=>{
  const stage=html.indexOf('<div class="stage">'),hud=html.indexOf('id="gameGuidanceHud"'),deck=html.indexOf('class="control-deck"');
  assert.ok(stage<hud&&hud<deck);
  for(const id of ['challengeHud','challengeHudSummary','coach','coachMsg','historyHud','historyTitle','historyLatest'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.match(cockpit,/renderChallengeHud\(\).*\$\('#challengeHudSummary'\)/);
  assert.match(cockpit,/function renderHistorySummary\(\)/);
  assert.match(replay,/renderHistorySummary\(\)/);
  assert.match(challenges,/className='coach contextual-summary '/);
  assert.match(css,/\.game-guidance-hud\{display:grid/);
});

test('makes completed goals transient, dismissible, and linked to persistent details',()=>{
  assert.match(progress,/class="toast-action"/);
  assert.match(progress,/class="toast-close" aria-label="Dismiss/);
  assert.match(progress,/\$\('#toasts'\)\.addEventListener\('keydown',e=>e\.stopPropagation\(\)\)/);
  assert.match(challenges,/action:'View goals'/);
  assert.match(challenges,/setContextDetail\('goals',\{trigger:\$\('#goalsDetailToggle'\),focus:true\}\)/);
  assert.match(css,/\.toast\{pointer-events:auto/);
});
