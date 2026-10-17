import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(join(root,'src','index.html'),'utf8');
const cockpit=readFileSync(join(root,'src','game','54-web-cockpit.js'),'utf8');
const replay=readFileSync(join(root,'src','game','60-pause-replay.js'),'utf8');
const engine=readFileSync(join(root,'src','game','03-audio-fx-engine.js'),'utf8');
const loop=readFileSync(join(root,'src','game','70-main-loop.js'),'utf8');
const keys=readFileSync(join(root,'src','game','53-weekly-challenge.js'),'utf8');
const ui=readFileSync(join(root,'src','game','41-ui.js'),'utf8');
const progress=readFileSync(join(root,'src','game','01-progress.js'),'utf8');
const games=readFileSync(join(root,'src','game','42-match.js'),'utf8');
const kickSide=readFileSync(join(root,'src','game','30-kick-sideview.js'),'utf8');
const kick3d=readFileSync(join(root,'src','game','32-soccer-3d-modes.js'),'utf8');
const race=readFileSync(join(root,'src','game','20-race.js'),'utf8');
const live=readFileSync(join(root,'src','game','51-live-match.js'),'utf8');
const challenges=readFileSync(join(root,'src','game','02-challenges-coaches.js'),'utf8');
const kit=readFileSync(join(root,'src','game','52-leaderboard.js'),'utf8');
const css=readFileSync(join(root,'src','styles.css'),'utf8');
const rig=readFileSync(join(root,'src','game','04-body-rig.js'),'utf8');
const analog=readFileSync(join(root,'src','game','55-analog-gesture-controls.js'),'utf8');

test('keeps relocated feature roots canonical and singular',()=>{
  for(const id of ['quickSettings','settingsDrawer','settingsCategories','settingsChoices','kitroom','liveEq','vars','chart','ticker','mlList','chal','missions','eqs','steps','idea','quiz']){
    assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`${id} must have one owner`);
  }
});

test('maps the four contextual summaries to accessible disclosures',()=>{
  for(const [trigger,panel,label] of [['physicsDetailsHud','physicsDetail','physics details'],['physicsDetailsCompact','physicsDetail','physics details'],['physicsDetailsWide','physicsDetail','physics details'],['reviewDetailToggle','reviewDetail','move history'],['goalsDetailToggle','goalsDetail','goal details'],['learnDetailToggle','learnDetail','coach notebook']]){
    assert.match(html,new RegExp(`id="${trigger}"[^>]+data-detail-label="${label}"[^>]+aria-label="Open ${label}"[^>]+title="Open ${label}"[^>]+aria-expanded="false"[^>]+aria-controls="${panel}"[^>]*><span aria-hidden="true">⌄</span></button>`));
  }
  for(const id of ['physicsDetail','reviewDetail','goalsDetail','learnDetail'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.doesNotMatch(html,/id="contextMenuSlot"|id="inspector"|id="ins-tab-|id="ins-pane-/);
});

test('keeps gameplay controls outside the canvas stage',()=>{
  const stageEnd=html.indexOf('</div>\n        <div class="control-deck"');
  assert.ok(stageEnd>html.indexOf('<div class="stage">'));
  assert.ok(html.indexOf('id="pad"')>stageEnd);
  assert.ok(html.indexOf('id="physicsDetail"')>html.indexOf('id="cv"'));
  assert.ok(html.indexOf('id="physicsDetail"')<stageEnd);
  assert.ok(html.indexOf('id="rbar"')>stageEnd);
});

test('keeps canonical Math content in the physics disclosure',()=>{
  const detail=html.indexOf('id="physicsDetail"'),liveEq=html.indexOf('id="liveEq"'),vars=html.indexOf('id="vars"'),rbar=html.indexOf('id="rbar"');
  assert.ok(detail<liveEq&&liveEq<vars&&vars<rbar);
  for(const id of ['mathHudTitle','mathConsoleValues','mathConsoleStatus','mathConsoleHeading','mathConsoleControls','dialTop','dialTopStatus'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.doesNotMatch(html,/id="mathConsole"|id="mathConsolePull"|id="utilitySlot"|id="mathHud"|id="mathHudEquation"|id="mathHudValues"/);
  assert.match(cockpit,/function quickMathDefs\(\).*activeVariableProfile\(\)/);
  assert.match(cockpit,/adjustVar\(def\.id,def\.step\*\+b\.dataset\.step,manual\)/);
  assert.doesNotMatch(cockpit,/mathConsoleControls[^\n]+appendChild\(\$\('#(?:liveEq|vars)'\)\)/);
});

test('keeps contextual detail input ownership and focus return explicit',()=>{
  assert.match(cockpit,/function bindContextTrigger\(button,name\).*if\(e\.key==='Escape'&&CONTEXT_DETAILS\.open\).*closeContextDetail\(\).*if\(e\.key===' '\|\|e\.key==='Spacebar'\).*button\.click\(\)/);
  assert.match(cockpit,/document\.querySelectorAll\('\.context-detail'\)\.forEach\(p=>\{p\.addEventListener\('pointerdown',e=>e\.stopPropagation\(\)\);p\.addEventListener\('keydown',e=>\{if\(e\.key==='Escape'\).*closeContextDetail\(\)/);
  assert.match(cockpit,/if\(restore&&trigger&&trigger\.isConnected&&!trigger\.hidden\)trigger\.focus\(\)/);
  assert.match(cockpit,/if\(e\.key==='Escape'&&CONTEXT_DETAILS\.open\).*closeContextDetail\(\)/);
  assert.match(cockpit,/function trapOverlayFocus\(panel,e\)/);
  assert.match(css,/\.stage \.context-detail,\.stage \.settings-drawer\{position:absolute;z-index:25/);
});

test('opens only one responsive contextual detail at a time',()=>{
  assert.match(cockpit,/document\.querySelectorAll\('\.context-detail'\)\.forEach\(p=>p\.hidden=p!==panel\)/);
  assert.match(cockpit,/function syncContextTrigger\(button,expanded\).*button\.setAttribute\('aria-label',name\);button\.title=name/);
  assert.match(cockpit,/\['orientation','math','review','goals','learn'\]\.forEach\(n=>contextTriggers\(n\)\.forEach\(b=>syncContextTrigger\(b,n===name\)\)\)/);
  assert.match(cockpit,/pauseGame\('context-detail'\);CONTEXT_DETAILS\.ownsPause=true/);
  assert.match(cockpit,/if\(CONTEXT_DETAILS\.ownsPause\)releasePauseOwner\('context-detail',\{restart\}\)/);
  assert.match(cockpit,/function syncGameOverlayBackdrop\(\)/);
  assert.match(css,/\.game-overlay-backdrop\{appearance:none;position:absolute;z-index:20;inset:0/);
});

test('uses a compact active-play HUD and one translucent field overlay',()=>{
  const stage=html.indexOf('<div class="stage">'),nav=html.indexOf('class="play-nav game-shell-nav"'),canvas=html.indexOf('id="cv"'),hud=html.indexOf('id="gameGuidanceHud"'),settings=html.indexOf('id="settingsDrawer"'),detail=html.indexOf('id="physicsDetail"'),deck=html.indexOf('class="control-deck"');
  assert.ok(nav<stage&&stage<canvas&&canvas<hud&&hud<settings&&settings<detail&&detail<deck);
  for(const id of ['gameOverlayBackdrop','liveMathHud','liveMathHudValues','liveMathHudStatus','physicsDetailsHud'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`${id} must be singular`);
  for(const id of ['orientationDetail','physicsDetail','reviewDetail','goalsDetail','learnDetail','settingsDrawer'])assert.match(html,new RegExp(`id="${id}"[^>]+role="dialog"[^>]+aria-modal="true"`));
  assert.match(cockpit,/function releaseGameplayForOverlay\(\).*releaseMobileHeldInputs\('Game overlay opened'\)/);
  assert.match(cockpit,/gameOverlayBackdrop\.addEventListener\('click'/);
  assert.match(cockpit,/\$\('#liveMathHudValues'\)\.innerHTML=defs\.slice\(0,1\)/);
  assert.match(cockpit,/function liveHudState\(\).*Fight\.bout.*Race\.st\.t.*MATCH\.on.*LIVEM\.on/s);
  assert.match(css,/\.game-shell-nav\{position:absolute;z-index:12/);
  assert.match(css,/\.game-guidance-hud\{position:absolute;z-index:26/);
  assert.match(css,/\.game-shell-nav\{[^}]+background:linear-gradient\(180deg,rgba\(3,8,20,\.08\),rgba\(3,8,20,\.02\),transparent\)/);
  assert.match(css,/\.game-shell-nav \.mode-home-button,\.game-shell-nav \.current-mode,\.game-shell-nav \.experience-selector,\.game-player-tools>button\{background:rgba\(7,15,30,\.1\)/);
  assert.match(css,/\.game-guidance-hud\{[^}]+background:linear-gradient\(145deg,rgba\(5,14,29,\.04\),rgba\(5,14,29,\.01\)\)/);
  assert.match(css,/\.game-frame \.stage>canvas#cv\{[^}]+width:calc\(100% - var\(--game-rail-space\)\)/);
  assert.match(css,/\.stage \.context-detail,\.stage \.settings-drawer\{[^}]+right:calc\(var\(--game-rail-space\)/);
  assert.match(css,/\.stage \.context-detail,\.stage \.settings-drawer\{[^}]+background:rgba\(5,14,29,\.2\)/);
  assert.match(css,/\.stage \.context-detail-head\{top:-10px;background:rgba\(9,24,46,\.14\)\}/);
  assert.match(css,/\.stage \.context-detail :is\(\.missions,\.full,\.notebook,\.card,\.ticker,\.mlog,\.math-context-summary,\.math-context-controls,figure\.chart\)\{background:rgba\(8,22,42,\.1\)\}/);
  assert.match(css,/\.stage \.context-detail :is\(\.goals-summary span,\.math-console-values span,\.eqline,\.var,\.mv,\.tkc,\.lk,\.q button\)\{background:rgba\(15,32,55,\.11\)\}/);
  assert.match(css,/backdrop-filter:blur\(14px\) saturate\(1\.15\)/);
  assert.match(css,/env\(safe-area-inset-top\)/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\).*\.game-overlay-backdrop/s);
});

test('keeps six compact summaries inside one divided right-side tray',()=>{
  for(const label of ['Lab','Coach','Log','Math','Player'])assert.match(html,new RegExp(`class="mobile-hud-label"[^>]*>${label}</span>`));
  assert.match(cockpit,/class="mobile-hud-label" aria-hidden="true">Goal<\/span>/);
  assert.match(css,/\.mobile-hud-label\{display:block/);
  assert.match(css,/\.desktop-hud-label\{display:none\}/);
  assert.match(cockpit,/function railHudState\(\).*Fight\.bout.*Race\.st\.v.*MATCH\.on.*LIVEM\.on/s);
  assert.match(html,/id="profileHud"[\s\S]*id="hudProfileAvatar"[\s\S]*id="hudProfileName"[\s\S]*id="hudProfileState"/);
  assert.match(cockpit,/function playerHudState\(\)[\s\S]*Race · The Rocket[\s\S]*Set piece[\s\S]*Follow-through[\s\S]*Fight ·/);
  assert.match(cockpit,/function renderPlayerHud\(\)[\s\S]*hudProfileState[\s\S]*profileCurrentPlay[\s\S]*profileCurrentContext/);
  assert.match(cockpit,/renderChallengeHud\(\).*mobile-hud-label[^`]+hud-summary-cue/s);
  assert.match(cockpit,/liveMathHudValues'\)\.innerHTML=defs\.slice\(0,1\)/);
  assert.match(html,/id="gameGuidanceHud" aria-label="Gameplay information rail">[\s\S]*id="orientationHud"[\s\S]*id="orientationDetailToggle"[\s\S]*id="challengeHud"[\s\S]*id="coach"[\s\S]*id="historyHud"[\s\S]*id="liveMathHud"[\s\S]*id="profileHud"[\s\S]*id="profileBtn"/);
  assert.match(html,/id="orientationDetail"[^>]+role="dialog"[\s\S]*id="modeHomeButton"[\s\S]*id="settingsToggle"/);
  assert.doesNotMatch(html,/class="game-orientation-tools"/);
  assert.doesNotMatch(html,/class="game-player-tools"[\s\S]{0,500}id="profileBtn"/);
  assert.match(css,/\.game-guidance-hud\{position:absolute[^}]+width:68px[^}]+grid-auto-flow:row/);
  assert.match(css,/\.game-guidance-hud>\.contextual-summary\{[^}]+border:0[^}]+background:transparent[^}]+box-shadow:none/);
  assert.match(css,/\.game-guidance-hud>\.contextual-summary\+ \.contextual-summary\{border-top:/);
  assert.match(css,/@media \(hover:hover\)\{\.game-guidance-hud>\.contextual-summary:hover\{background:rgba\(32,91,128,\.18\)\}\}/);
  assert.match(css,/\.game-guidance-hud>\.contextual-summary:focus-within\{background:rgba\(39,112,155,\.24\)/);
  assert.match(css,/\.game-guidance-hud>\.contextual-summary:has\(\.context-disclosure\[aria-expanded="true"\]\)/);
  assert.match(css,/#gameGuidanceHud \.context-disclosure\{position:absolute;z-index:2;inset:0;[^}]+width:100%;min-width:44px;height:100%;min-height:44px/);
  assert.match(css,/@media \(max-width:480px\)\{\.game-frame \.stage\{--game-rail-space:60px\}\.game-guidance-hud\{[^}]+width:52px/);
  assert.match(css,/@media \(min-width:1100px\)\{\.game-frame \.stage\{--game-rail-space:82px\}\.game-frame \.stage>canvas#cv\{width:100%\}/);
  assert.match(css,/@media \(min-width:1100px\)\{\.game-frame \.stage>canvas#cv,\.game-frame \.stage>#cv3\{width:100%\}/);
  assert.match(css,/\.game-shell-nav \.gamebar\{position:relative;top:auto;left:auto;right:auto;transform:none/);
  assert.match(css,/\.orientation-summary\{[^}]+display:grid/);
  assert.match(css,/\.orientation-actions>button\{[^}]+min-height:76px/);
  assert.match(css,/@media \(min-width:1100px\)[\s\S]*\.game-guidance-hud\{top:max\(218px[^}]+width:68px/);
});

test('uses readable translucent contrast plates without making the field shell opaque',()=>{
  assert.match(css,/\.game-guidance-hud\{background:linear-gradient\(145deg,rgba\(3,10,24,\.18\),rgba\(3,10,24,\.08\)\)/);
  assert.match(css,/#gameGuidanceHud :is\([^}]+background:rgba\(2,7,17,\.72\)/);
  assert.match(css,/\.stage \.context-detail,\.stage \.settings-drawer\{background:rgba\(3,10,24,\.36\)/);
  assert.match(css,/\.stage :is\([^}]+background-color:rgba\(2,7,17,\.66\)/);
  assert.match(css,/button:disabled,\[aria-disabled="true"\]\)\{opacity:\.86\}/);
});

test('moves player portrait status out of the field and into the profile rail',()=>{
  for(const source of [race,kickSide,kick3d])assert.doesNotMatch(source,/RIG\.portrait\(/);
  assert.doesNotMatch(`${race}\n${kickSide}\n${kick3d}`,/THE ROCKET|FOLLOW-THROUGH|TRACKING BALL|SET & DIVE/);
  assert.match(rig,/window\.__KICKLAB_PLAYER_PORTRAIT_RENDERS__=0/);
  assert.match(rig,/portrait\(c,x,y,w,h,A,o=\{\}\)\{window\.__KICKLAB_PLAYER_PORTRAIT_RENDERS__\+\+/);
  assert.match(cockpit,/renderCockpit\(q\).*renderChallengeHud\(\);renderPlayerHud\(\)/);
});

test('derives compact math from mode definitions and explicit equation data',()=>{
  assert.match(cockpit,/activeVariableProfile\(\)/);
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

test('keeps Match, Live Match, and bounded Freestyle selection in one compact experience selector',()=>{
  assert.match(live,/const CONTINUOUS=\{experience:'freestyle',running:false,on:false,menuOpen:false,pickerOpen:false,picks:\[\],i:0,status:''/);
  assert.match(live,/games\(\)\{return GAMES\.filter\(g=>!g\.sequence\);\}/);
  assert.match(live,/id="experienceSelector" aria-expanded="\$\{open\}" aria-controls="experiencePanel"/);
  assert.match(live,/CONTINUOUS\.menuOpen\?'<div class="experience-panel experience-menu"[^]*id="experienceMatch"[^]*id="experienceLive"[^]*id="experienceFreestyle"/);
  assert.match(live,/if\(experience==='match'\)MATCH\.begin\(\);else LIVEM\.begin\(\);/);
  assert.match(games,/const MATCH=\{on:false,i:0,you:0,them:0[\s\S]*?evs=\['run','combo','corner','counter','run','combo','corner','counter'\]/);
  assert.match(games,/end\(\)\{const w=this\.you>this\.them[\s\S]*?FULL TIME/);
  assert.match(live,/const LIVEM=\{on:false,T:240,left:240,you:0,them:0,saves:0,passes:0/);
  assert.match(live,/clock\(\)\{const s=Math\.ceil\(this\.left\)/);
  assert.match(live,/if\(this\.picks\.length>=3\).*Three-activity limit reached/);
  assert.match(live,/primaryLabel\(\)\{return this\.picks\.length===1\?'Play activity':'Start continuous';\}/);
  assert.match(live,/freestyle&&CONTINUOUS\.pickerOpen\?`<div class="experience-panel freestyle-picker"/);
  assert.match(live,/this\.running=true;this\.on=this\.picks\.length>1;this\.menuOpen=false;this\.pickerOpen=false/);
  assert.match(live,/renderGameBar\(\);requestAnimationFrame\(\(\)=>\$\(`#game-\$\{k\}`\)\?\.focus\(\)\)/);
  assert.match(live,/setAttribute\('role','checkbox'\)/);
  assert.match(live,/setAttribute\('aria-checked'/);
  assert.match(live,/class="game-order"/);
  assert.match(live,/showOrder=selected\.length>1&&order/);
  assert.match(live,/pickGame\(this\.picks\[0\],true,true\)/);
  assert.match(live,/this\.on=this\.picks\.length>1/);
  assert.match(live,/this\.i=\(this\.i\+1\)%this\.picks\.length/);
  assert.match(live,/function focusFreestylePlay\(\).*#padR button:not\(:disabled\)/);
  assert.match(live,/function stopExperiencePlayback\(\).*RP\.on.*exitReplay\(\).*CINE\.on.*CINE\.done=null/s);
  assert.match(live,/document\.addEventListener\('pointerdown'.*CONTINUOUS\.closeSelector\(\)/);
  assert.doesNotMatch(live,/id="continuousToggle"/);
  assert.doesNotMatch(live,/class="experience-status"|class="continuous-status"/);
  assert.match(progress,/CONTINUOUS\.on\)\{CONTINUOUS\.advance\(\);return;\}/);
  assert.match(progress,/CONTINUOUS\.nextLabel\(\)/);
  assert.match(games,/k:'match'[\s\S]*?sequence:true/);
  assert.match(games,/k:'live'[\s\S]*?sequence:true/);
  assert.match(css,/\.experience-panel \.gamebar-grid\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/@media \(max-width:800px\)[^\n]*\.experience-panel \.gamebar-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css,/\.gamebar-track\{[^}]*overflow-x:auto/);
  assert.match(css,/\.experience-selector\{[^}]*min-height:44px/);
  assert.match(css,/\.experience-menu\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.game-order\{position:absolute/);
});

test('starts on a dedicated mode home and keeps the full lab chooser out of active play',()=>{
  const home=html.indexOf('id="modeHome"'),tabs=html.indexOf('class="tabs"'),cockpit=html.indexOf('id="game-cockpit"');
  assert.ok(home>=0&&home<tabs&&tabs<cockpit);
  assert.match(html,/id="modeHome" aria-labelledby="modeHomeTitle"/);
  assert.match(html,/class="hudbar home-progress" id="progressHud" aria-labelledby="homeScorecardTitle" aria-describedby="homeScorecardScope"/);
  for(const mode of ['fight','race','kick'])assert.match(html,new RegExp(`class="tab lab-showcase" id="lab-tab-${mode}"[^>]+data-mode="${mode}"[^>]+aria-pressed=`));
  assert.match(html,/id="game-cockpit" role="region" aria-labelledby="currentModeTitle" hidden/);
  assert.match(html,/id="modeHomeButton"[^>]*>[\s\S]*All labs[\s\S]*<\/button>/);
  assert.match(keys,/function showModeHome\(\{focus=true\}=\{\}\)/);
  assert.match(keys,/\$\('#game-cockpit'\)\.hidden=true;\$\('#modeHome'\)\.hidden=false/);
  assert.match(keys,/\$\('#modeHome'\)\.after\(\$\('#progressHud'\)\)/);
  assert.match(keys,/\$\('#progressHud'\)\.hidden=false/);
  assert.match(keys,/function setMode\(k\)\{\$\('#modeHome'\)\.hidden=true;\$\('#game-cockpit'\)\.hidden=false/);
  assert.match(keys,/\$\('#progressHud'\)\.hidden=true/);
  assert.match(keys,/CONTINUOUS\.menuOpen\|\|CONTINUOUS\.pickerOpen.*CONTINUOUS\.closeSelector\(\)/);
  assert.match(loop,/setMode\('fight'\);showModeHome\(\{focus:false\}\)/);
  assert.match(css,/\.mode-home\{display:grid/);
  assert.match(css,/\.mode-home \.tab\{[^}]*min-height:176px/);
  assert.match(css,/\.mode-home-button\{[^}]*min-height:44px/);
});

test('uses one on-game hierarchical settings experience',()=>{
  const stage=html.indexOf('<div class="stage">'),settings=html.indexOf('id="settingsDrawer"'),deck=html.indexOf('class="control-deck"'),kitRoom=html.indexOf('id="kitroom"',settings);
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
  assert.match(cockpit,/document\.addEventListener\('pointerdown',e=>\{if\(settingsDrawer\.hidden\|\|settingsDrawer\.contains\(e\.target\)\|\|settingsToggle\.contains\(e\.target\)\|\|\$\('#quickSettings'\)\.contains\(e\.target\)\)return/);
  assert.match(cockpit,/closeSettings\(\{restore:false\}\);if\(!focusTarget\)requestAnimationFrame\(\(\)=>settingsToggle\.focus\(\)\)/);
  assert.match(html,/id="settingsClose" aria-label="Close settings"><span aria-hidden="true">✕<\/span><span class="settings-close-label">Close<\/span>/);
  assert.match(kit,/function openKit\(trigger=.*showKitSettings\(trigger\)/);
  assert.match(kit,/function closeKit\(\).*setSettingsLevel\('choices'/);
  assert.match(css,/\.settings-drawer\{position:absolute/);
  assert.match(css,/\.settings-drawer-body\{[^}]*overflow-y:auto;overscroll-behavior:contain/);
  assert.match(css,/\.settings-drawer-head\{position:relative;z-index:2/);
  assert.match(css,/\.settings-drawer \.setup-choice\{min-height:48px/);
  assert.match(css,/\.quick-setting\{min-height:48px/);
});

test('resolves a real active-variable profile for every game and Kick activity state',()=>{
  const profilesMatch=ui.match(/const ACTIVE_VARIABLE_PROFILES=(\{[^\n]+\});/),resolverMatch=ui.match(/function resolveActiveVariableProfile\([^\n]+/);
  assert.ok(profilesMatch&&resolverMatch,'profile table and pure resolver must remain inspectable');
  const profiles=Function(`return (${profilesMatch[1]})`)();
  const resolve=Function(`return (${resolverMatch[0]})`)();
  const cases=[
    ['Fight ready','fight',null,null,'ready',{},['fight','default'],['m','dt','A']],
    ['Race grid','race',null,null,'grid',{},['race','default'],['mu','R','m','F']],
    ['Free kick','kick','free','free','aim',{},['kick','free'],['v','th','g','spin']],
    ['Header and Match corner','kick','header','match','aim',{},['kick','header'],['jv','thH','g']],
    ['Passing','kick','dribble','pass','pass',{pass:true},['kick','pass'],['pv']],
    ['Combo','kick','dribble','combo','crun',{combo:true},['kick','combo'],['run','grip','vs']],
    ['Goalkeeper drill','kick','dribble','gk','ready',{},['kick','keeper'],['gkr','gka']],
    ['Penalty shooter','kick','dribble','pso','set',{},['kick','shot'],['vs','curl']],
    ['Penalty keeper','kick','dribble','pso','keep',{},['kick','keeper'],['gkr','gka']],
    ['Crossbar','kick','dribble','bar','set',{},['kick','shot'],['vs','curl']],
    ['Match run','kick','dribble','match','run',{},['kick','run'],['run','grip','curl','vs']],
    ['Match combo','kick','dribble','match','cpass',{combo:true},['kick','combo'],['run','grip','vs']],
    ['Match counter','kick','dribble','match','keep',{},['kick','keeper'],['gkr','gka']],
    ['Live kickoff pass','kick','dribble','live','ready',{},['kick','pass'],['pv']],
    ['Live run','kick','dribble','live','run',{},['kick','run'],['run','grip','curl','vs']],
    ['Live goalkeeper','kick','dribble','live','keep',{},['kick','keeper'],['gkr','gka']],
  ];
  for(const [name,game,shot,pso,state,flags,key,ids] of cases){assert.deepEqual(resolve(game,shot,pso,state,flags),key,name);assert.deepEqual(profiles[key[0]][key[1]],ids,`${name} variables`);assert.ok(ids.length,`${name} must not be empty`);}
  assert.match(kick3d,/id:'gkr',sym:'tᵣ',name:'keeper reaction time'/);
  assert.match(kick3d,/id:'gka',sym:'a_dive',name:'keeper dive acceleration'/);
  assert.match(kick3d,/0\.5\*Kick\.V\.gka\*Math\.max\(0,t-Kick\.V\.gkr\)\*\*2/);
  assert.match(kick3d,/g\.vy=clamp\(g\.vy\+Math\.sign\(dy\)\*Kick\.V\.gka\*dt/);
  assert.doesNotMatch(kick3d,/GK_REACT|GK_DIVE_A/);
});

test('maps the Kick D-pad to stable Shot and Advanced Quick Tune layers',()=>{
  assert.match(ui,/const DP=\{layer:'shot',flash:null\}/);
  assert.match(ui,/function dialMode\(\)\{return M===Kick&&Kick\.opt\.shot!=='dribble'&&Kick\.state==='aim'\?'quick':null;\}/);
  assert.match(ui,/DP\.layer==='advanced'\?\(hdr\?\['g'\]:\['spin','g'\]\):\(hdr\?\['jv','thH'\]:\['v','th'\]\)/);
  assert.match(ui,/action\(horizontal,'left',-1\),action\(horizontal,'right',1\),action\(vertical,'down',-1\),action\(vertical,'up',1\)/);
  assert.match(ui,/v:\['v','SPEED','launch speed'\].*th:\['θ','ANGLE','launch angle'\].*spin:\['aₛ','SPIN','spin'\].*g:\['g','GRAVITY','gravity'\]/);
  assert.match(ui,/aria:`\$\{sign<0\?'Decrease':'Increase'\} \$\{meta\.name\}`/);
  assert.match(ui,/tag:`\$\{meta\.symbol\}\$\{sign<0\?'−':'\+'\}`/);
  assert.match(ui,/\$\{h\?`<span class="quick-axis horizontal".*\$\{h\.symbol\}.*\$\{h\.label\}.*\$\{v\?`<span class="quick-axis vertical".*\$\{v\.symbol\}.*\$\{v\.label\}/);
  assert.match(ui,/disabled:!def\|\|isLocked\(M\.key,id\)/);
  assert.match(ui,/function toggleQuickTuneLayer\(\).*DP\.layer=DP\.layer==='shot'\?'advanced':'shot'/);
  assert.match(ui,/data-id="quick-layer" aria-label="Switch to \$\{DP\.layer==='shot'\?'Advanced':'Shot'\} quick tune/);
  assert.match(keys,/e\.code==='KeyC'&&dialMode\(\)==='quick'&&!e\.repeat&&!PAUSE\.on&&!CINE\.on&&!resOpen\(\).*toggleQuickTuneLayer\(\)/);
  assert.match(cockpit,/if\(dialMode\(\)==='quick'\)return quickTuneVariableIds\(\)\.map/);
  assert.match(cockpit,/`Quick Tune · \$\{DP\.layer==='shot'\?'Shot':'Advanced'\}`/);
  assert.doesNotMatch(ui,/previous dial|next dial|tag:'DIAL'|dialSelectActions|dialSel\(/);
  assert.match(css,/\.dpad \.hub\.quick-layer\{[^}]*cursor:pointer/);
  assert.match(css,/\.dpad \.quick-axis\{[^}]*color:var\(--quick-color\)/);
  assert.match(kickSide,/id:'v',sym:'v',name:'launch speed'.*col:C\.xray/);
});

test('shows adjustment math temporarily while keeping environment context persistent',()=>{
  assert.match(ui,/const STAGE_ADJUST=\{id:null,t:0,duration:reduce\?1800:2400,fade:reduce\?0:500\}/);
  assert.match(ui,/function showStageAdjustment\(id\)/);
  assert.match(ui,/function stageAdjustmentVisible\(\)/);
  assert.match(ui,/if\(!stageAdjustmentVisible\(\)\|\|PAUSE\.on\|\|RP\.on\|\|CINE\.on\|\|resOpen\(\)\)return/);
  assert.match(ui,/hideStageAdjustment\(\);M\.press\(a\.id,true\)/);
  assert.match(ui,/const set=x=>\{[^}]*showStageAdjustment\(v\.id\)/);
  assert.ok(games.includes('parts=[`${S.n} · g ${fmt(S.g,2)} m/s²`]'));
  assert.match(html,/class="game-context-header"[^>]+aria-label="Current game context"[\s\S]*id="gameBar"[\s\S]*id="environmentContext"[^>]+role="status"[^>]+aria-label="Environment for the selected Kick experience"[^>]+aria-live="polite"[^>]+hidden/);
  assert.ok(html.indexOf('id="gameBar"')<html.indexOf('id="environmentContext"'));
  assert.ok(html.indexOf('id="environmentContext"')<html.indexOf('<div class="stage">'));
  assert.match(games,/function renderEnvironmentContext\(\).*el\.hidden=!active.*environmentContextLabel.*environmentContextDetail/);
  assert.match(live,/function renderAll\(intro=true\)\{renderGameBar\(\);renderEnvironmentContext\(\);/);
  assert.match(live,/id="experienceSelector"[^>]+aria-describedby="environmentContext"/);
  assert.match(css,/\.game-context-header\{[^}]+grid-template-columns:minmax\(280px,1\.45fr\) minmax\(220px,1fr\)/);
  assert.match(css,/\.game-context-header \.environment-context\{[^}]+min-height:32px[^}]+justify-content:flex-start/);
  assert.match(css,/\.environment-context\[hidden\]\{display:none\}/);
  assert.doesNotMatch(games,/__KICKLAB_ENV_LABEL__|environmentLabelRightInset/);
  assert.doesNotMatch(kickSide,/air drag ON · ρ/);
  assert.match(kickSide,/if\(stageAdjustmentVisible\(\)\)\{text\(c,'θ = '/);
  assert.match(kick3d,/if\(stageAdjustmentVisible\(\)&&\(\(s==='beat'/);
});

test('keeps Kick action X-ray transient while suppressing persistent stage math',()=>{
  assert.match(engine,/const kickAction=typeof M!=='undefined'&&typeof Kick!=='undefined'&&M===Kick/);
  assert.match(engine,/annotations:!kickAction,physicsVision:true/);
  assert.match(engine,/function physicsVisionVisible\(\)\{return!!\(RP\.on\|\|\(E\.slow&&E\.slow\.physicsVision!==false\)\);\}/);
  assert.match(loop,/const physicsVision=E\.env>0&&physicsVisionVisible\(\)/);
  assert.match(loop,/persistentMath:typeof stageAdjustmentVisible==='function'&&stageAdjustmentVisible\(\)/);
  assert.match(loop,/if\(physicsVision\).*M\.drawXray\(ctx\)/);
  assert.match(loop,/if\(physicsVision\)xrayFrame\(ctx,E\.env\)/);
  assert.match(loop,/if\(physicsVision&&E\.env>0\.5&&M\.callouts\)/);
  assert.match(ui,/hideStageAdjustment\(\);M\.press\(a\.id,true\)/);
  assert.match(replay,/if\(!RP\.on&&mode!=='kick'\)pushFeed\(m\);else if\(!RP\.on&&mode==='kick'\)\$\('#feed'\)\.innerHTML=''/);
  assert.match(kickSide,/if\(stageAdjustmentVisible\(\)\)text\(c,'bar 2\.44 m'/);
  assert.match(kickSide,/if\(this\.state==='flight'&&!this\.outcome&&stageAdjustmentVisible\(\)\)/);
  assert.match(kick3d,/if\(stageAdjustmentVisible\(\)\)text\(c,'wall 1\.85 m \(\+jump\)'/);
});

test('swaps the D-pad footprint into guarded Manual Physics',()=>{
  assert.match(html,/class="controller-mode-toggle" role="group" aria-label="Controller mode"/);
  assert.match(html,/id="controllerModePlay" aria-pressed="true"/);
  assert.match(html,/id="controllerModeManual" aria-pressed="false"/);
  assert.match(html,/id="controllerModeStatus" role="status" aria-live="polite"/);
  assert.match(html,/id="padL"[^]*id="manualController" hidden/);
  assert.match(cockpit,/function manualMathDefs\(\)\{return activeVariableProfile\(\)/);
  assert.match(cockpit,/function selectedManualDef\(\)/);
  assert.match(cockpit,/slider\.min=def\.min;slider\.max=def\.max;slider\.step=def\.step/);
  assert.match(cockpit,/CONTROLLER\.sel\+=delta/);
  assert.match(cockpit,/canCycle=defs\.length>1/);
  assert.match(cockpit,/\$\('#manualPrev'\)\.disabled=!canCycle;\$\('#manualNext'\)\.disabled=!canCycle/);
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
  assert.match(cockpit,/function wideManualDefs\(\)\{return activeVariableProfile\(\);\}/);
  assert.match(cockpit,/class="wide-manual-row" data-var="\$\{def\.id\}"/);
  assert.match(cockpit,/input type="range"[^>]+aria-label="\$\{quickMathName\(def\)\}"/);
  assert.match(cockpit,/input\.setAttribute\('aria-valuetext',cockpitValue\(def,M\.V\[def\.id\]\)\)/);
  assert.match(cockpit,/wideManualRows\.addEventListener\('input'/);
  assert.match(cockpit,/adjustVar\(def\.id,\+input\.value-M\.V\[def\.id\],false\)/);
  assert.match(cockpit,/manualUnavailableReason\(\).*isLocked\(M\.key,def\.id\)/s);
  assert.match(cockpit,/row\.classList\.toggle\('locked',locked\);row\.classList\.toggle\('temporarily-locked',temporary\)/);
  assert.match(cockpit,/new ResizeObserver\(entries=>\{const active=entries\[0\]\.contentRect\.width>=980/);
  assert.match(css,/\.wide-manual-controller\{display:none/);
  assert.match(css,/\.wide-manual-controller\{display:none;[^}]*pointer-events:auto/);
  assert.match(css,/\.manual-controller input\[type="range"\],\.wide-manual-row input\[type="range"\]\{pointer-events:auto;touch-action:none;cursor:pointer\}/);
  assert.match(css,/\.manual-controller input\[type="range"\]:disabled,\.wide-manual-row input\[type="range"\]:disabled\{pointer-events:none;cursor:not-allowed\}/);
  assert.match(css,/\.wide-manual-row\.temporarily-locked\{opacity:1\}/);
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

test('keeps six-slot mechanics controls between analog and gesture controls',()=>{
  assert.match(html,/id="analogStick"[^]*id="prototypePhysics"[^]*id="gestureAction"/);
  assert.match(html,/id="prototypePhysics" open/);
  assert.match(html,/id="prototypePhysicsStatus" role="status" aria-live="polite"/);
  assert.match(cockpit,/function renderPrototypeManual\(\)/);
  assert.match(cockpit,/const defs=wideManualDefs\(\),profile=activeVariableProfileKey\(\)/);
  assert.match(cockpit,/suggestions=M\.suggest\?M\.suggest\(\):\{\}/);
  assert.match(cockpit,/GAME_CORE\.sliderSlotsModel\(\{min:def\.min,max:def\.max,step:def\.step,value:M\.V\[def\.id\],suggestion,locked,lockReason,name:quickMathName\(def\),unit:def\.unit\}\)/);
  assert.match(cockpit,/function prototypeLockReason\(def\)\{const challenge=curCh\(M\.key\)/);
  assert.match(cockpit,/challenge\.name} fixes \$\{quickMathName\(def\)\} at/);
  assert.match(cockpit,/Array\.from\(\{length:6\}/);
  assert.match(cockpit,/class="prototype-slot" data-index="\$\{index\}" role="radio"/);
  assert.match(cockpit,/button\.setAttribute\('aria-label',slot\.label\)/);
  assert.match(cockpit,/button\.setAttribute\('aria-checked',String\(slot\.selected\)\)/);
  assert.match(cockpit,/button\.setAttribute\('aria-expanded',String\(expanded&&slot\.selected\)\)/);
  assert.match(cockpit,/class="prototype-slot-detail"[^>]+aria-label="Selected \$\{quickMathName\(def\)\} details" hidden/);
  assert.match(cockpit,/function prototypeGraphicTitle\(def\)/);
  assert.match(cockpit,/function prototypeImpact\(def,value,slotState\)/);
  assert.match(cockpit,/function prototypeEffect\(def,model,suggestion\)/);
  assert.match(cockpit,/if\(def\.id==='dt'\).*cracks&&safe.*cracks.*safe.*'Safer',cost:'Weaker hit'/s);
  assert.match(cockpit,/accuracy=1-Math\.abs\(Fight\.needle\(\)-\.5\)\*2/);
  assert.match(cockpit,/if\(def\.id==='R'\)return R<=32\?.*'Shorter path',cost:'Lower corner limit'.*'Higher corner limit',cost:'Longer path'/s);
  assert.match(cockpit,/if\(def\.id==='m'\)return a>=gripCap\?.*'Grip-limited launch'.*'Slower launch'/s);
  assert.match(cockpit,/if\(def\.id==='F'\)return a>=gripCap\?.*'Tire-limited · no extra acceleration'.*'Below grip-limited acceleration'/s);
  assert.match(cockpit,/M===Kick&&Kick\.opt\.shot==='free'&&\['v','th','g','spin'\]\.includes\(def\.id\).*Kick\.freeCalc\(v,th,spin,g\).*'Clears wall · under bar'.*'Hits wall'.*'Over the bar'/s);
  assert.match(cockpit,/if\(def\.id==='gkr'\)return value<=\.3\?.*if\(def\.id==='gka'\)return value>=22\?.*if\(def\.id==='grip'\)return value>=\.8\?/s);
  assert.match(cockpit,/scores=\{helps:\.92,tradeoff:\.58,neutral:\.5,hurts:\.2\}/);
  assert.match(cockpit,/data-tone="\$\{effect\.impact\.kind\}"/);
  assert.match(cockpit,/\$\{effect\.impact\.label\}.*Predicted:.*\$\{effect\.impact\.prediction\}/s);
  assert.match(cockpit,/role="img" aria-label="\$\{summary\}"/);
  assert.match(cockpit,/PROTOTYPE_MANUAL\.expanded=def\.id;PROTOTYPE_MANUAL\.change=\{id:def\.id,from,to:value\}/);
  assert.match(cockpit,/data-collapse-slots/);
  assert.match(cockpit,/PROTOTYPE_MANUAL\.expanded=null;renderPrototypeManual\(\)/);
  assert.match(cockpit,/prototypePhysicsRows\.addEventListener\('click'/);
  assert.match(cockpit,/prototypePhysicsRows\.addEventListener\('pointercancel'/);
  assert.match(cockpit,/\['ArrowLeft','ArrowRight','Home','End'\]/);
  assert.match(cockpit,/adjustVar\(def\.id,value-from,false\)/);
  assert.doesNotMatch(cockpit,/prototype-slots[^\n]+type="range"/);
  assert.match(css,/@media \(min-width:981px\)\{\.touch-controller\{grid-template-columns:minmax\(205px,1fr\) minmax\(330px,1\.45fr\) minmax\(205px,1fr\)/);
  assert.match(css,/\.prototype-physics\{grid-column:2;grid-row:2/);
  assert.match(css,/\.prototype-slot-group\{position:relative;grid-template-columns:repeat\(6,minmax\(0,1fr\)\);gap:0/);
  assert.match(css,/\.prototype-slot\{[^}]*min-height:44px/);
  assert.match(css,/\.prototype-slot\+ \.prototype-slot::before\{content:"";[^}]*height:16px/);
  assert.match(css,/\.prototype-slot\[aria-checked="true"\]::after\{[^}]*left:50%;[^}]*height:24px/);
  assert.match(cockpit,/Choose one of six snap sections on the continuous band/);
  assert.match(css,/\.prototype-slot:focus-visible\{outline:3px solid var\(--hot\)/);
  assert.match(css,/\.prototype-slot-detail\{[^}]*max-height:190px;overflow:auto/);
  assert.match(css,/\.prototype-detail-grid\{display:grid;grid-template-columns:minmax\(0,1\.45fr\) minmax\(115px,\.75fr\)/);
  assert.match(css,/\.prototype-slot-detail figure\{[^}]*min-width:0/);
  assert.match(css,/strong\[data-tone="tradeoff"\]/);
  assert.match(css,/\.prototype-physics-row>\.prototype-range-description\{position:absolute!important;width:1px!important;height:1px!important/);
  for(const impact of ['helps','tradeoff','neutral','hurts'])assert.match(css,new RegExp(`prototype-slot-detail svg circle\\.${impact}`));
  assert.match(css,/@media \(min-width:620px\) and \(max-width:980px\)\{\.prototype-physics-rows\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media \(max-width:480px\)[^\n]+\.prototype-detail-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  for(const state of ['low','target','perfect','high'])assert.match(css,new RegExp(`prototype-slot\\[data-state="${state}"\\]`));
  assert.match(css,/\.prototype-physics-row\.locked \.prototype-slot/);
});

test('uses a compact accessible Classic and Analog control-style selector',()=>{
  assert.match(html,/class="prototype-control-bar" role="group" aria-label="Control style" aria-describedby="controlStyleDescription"/);
  assert.match(html,/id="classicControlsButton" aria-pressed="true"[^>]*>Classic<\/button>/);
  assert.match(html,/id="analogControlsButton" aria-pressed="false"[^>]*>Analog<\/button>/);
  assert.doesNotMatch(html,/Prototype · classic stays available|Try analog controls|Use classic controls/);
  assert.match(analog,/classicControlsButton\.setAttribute\('aria-pressed',String\(!ANALOG_CONTROL\.enabled\)\)/);
  assert.match(analog,/analogControlsButton\.setAttribute\('aria-pressed',String\(ANALOG_CONTROL\.enabled\)\)/);
  assert.match(analog,/\['ArrowLeft','ArrowRight','Home','End'\]/);
  assert.match(css,/\.prototype-control-bar\{[^}]+width:170px[^}]+min-height:48px[^}]+grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.prototype-control-bar button\{[^}]+min-height:44px/);
  assert.match(css,/\.prototype-control-bar button\[aria-pressed="true"\]\{[^}]*border-color:#7fdcff[^}]*background:#17304d/);
});

test('keeps settings and contextual details mutually exclusive',()=>{
  assert.match(cockpit,/function openSettings\(category=null,trigger=settingsToggle\)\{\s*if\(!profileDialog\.hidden\)closeProfiles\(\{restore:false,restart:false\}\);if\(CONTEXT_DETAILS\.open\)closeContextDetail\(\{restore:false,restart:false\}\)/);
  assert.match(cockpit,/function setContextDetail\(name,[\s\S]*if\(!settingsDrawer\.hidden\)closeSettings\(\{restore:false,restart:false\}\);\s*if\(!profileDialog\.hidden\)closeProfiles\(\{restore:false,restart:false\}\)/);
  assert.doesNotMatch(cockpit,/INSPECTOR|contextMenuSlot|closeInspector|syncInspectorLayout/);
});

test('pauses and resumes through canonical settings ownership',()=>{
  assert.match(cockpit,/function setSettingsPause\(on\)/);
  assert.match(cockpit,/pauseGame\('settings'\)/);
  assert.match(cockpit,/releasePauseOwner\('settings'/);
  assert.match(cockpit,/function openSettings\(category=null,trigger=settingsToggle\)/);
  assert.match(cockpit,/function closeSettings\(\{restore=true,restart=true\}=\{\}\)/);
  assert.match(cockpit,/trigger\.isConnected/);
  assert.match(html,/id="settingsState">Game paused while settings are open/);
  assert.doesNotMatch(cockpit,/INSPECTOR\.pane==='setup'/);
});

test('puts coach, challenge, and history guidance in the stage without duplicating nodes',()=>{
  const stage=html.indexOf('<div class="stage">'),canvas=html.indexOf('id="cv"'),hud=html.indexOf('id="gameGuidanceHud"'),deck=html.indexOf('class="control-deck"');
  assert.ok(stage<canvas&&canvas<hud&&hud<deck);
  assert.doesNotMatch(html.slice(canvas,hud),/id="gameBar"|id="quickSettings"|class="play-nav"/);
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
