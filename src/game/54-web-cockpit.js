/* ---------- responsive web cockpit ---------- */
const CONTEXT_DETAILS={open:null,trigger:null,ownsPause:false};
const SETTINGS={level:'categories',category:null,trigger:null,restoreCategory:null};
const MATH_CONSOLE={sig:''},CONTROLLER={mode:'play',sel:0};
const WIDE_MANUAL={active:false,sig:''},PROTOTYPE_MANUAL={sig:'',expanded:null,change:null,cancelled:false};
const controllerPlay=$('#controllerModePlay'),controllerManual=$('#controllerModeManual'),manualController=$('#manualController');
const wideManualController=$('#wideManualController'),wideManualRows=$('#wideManualRows');
const prototypePhysics=$('#prototypePhysics'),prototypePhysicsRows=$('#prototypePhysicsRows');
const settingsDrawer=$('#settingsDrawer'),settingsToggle=$('#settingsToggle');
const gameOverlayBackdrop=$('#gameOverlayBackdrop'),gameStage=$('.stage'),gamePlayShell=$('.play'),profileDialog=$('#profileDialog');
const coachMathNudge=$('#coachMathNudge'),coachMathNudgeAction=$('#coachMathNudgeAction'),coachMathNudgeClose=$('#coachMathNudgeClose');
const COACH_MATH_NUDGE={sequence:0,current:null,seen:new Set(),lastShownAt:0,timer:null,cooldown:18000};
const COACH_TOMI_SESSIONS=new Map();
const COACH_TOMI_ACTIONS={pregame:null,nudge:null,result:null,current:null,timer:null,ownsPause:false};
const coachTomiControlRecommendation=$('#coachTomiControlRecommendation'),coachTomiMathRecommendation=$('#coachTomiMathRecommendation');

function coachTomiProfileKey(){return profileManager.active().id;}
function coachTomiSession(mode){const key=`${coachTomiProfileKey()}:${mode}`;if(!COACH_TOMI_SESSIONS.has(key))COACH_TOMI_SESSIONS.set(key,{recent:[],pending:null});return COACH_TOMI_SESSIONS.get(key);}
function coachTomiHistory(mode){const session=coachTomiSession(mode);return{plays:best.stats.plays[mode]||0,wins:best.stats.wins[mode]||0,cleared:best.ch[mode]||0,recent:session.recent.slice()};}
function coachTomiVariables(context={}){
  if(M===Fight)return{dt:Fight.V.dt};
  if(M===Race)return{limit:Math.sqrt(Race.V.mu*G0*Race.V.R)*3.6};
  return{speed:Kick.V.v,angle:Kick.V.th,reaction:Kick.V.gkr||.35,passSpeed:Kick.V.pv||18,grip:Kick.V.grip||.8,jump:Kick.V.jv||6,context};
}
function coachTomiTarget(def,suggestion,direction){
  const current=cockpitValue(def,M.V[def.id]),has=suggestion&&suggestion.lo!=null&&suggestion.hi!=null,span=Math.max(def.max-def.min,def.step),lo=has?clamp(suggestion.lo,def.min,def.max):M.V[def.id],hi=has?clamp(suggestion.hi,def.min,def.max):M.V[def.id],left=has?(lo-def.min)/span*100:direction==='lower'?0:direction==='higher'?65:35,width=has?Math.max((hi-lo)/span*100,4):35,target=has?(Math.abs(hi-lo)<def.step/2?`Target ${cockpitValue(def,lo)}`:`Target ${cockpitValue(def,lo)}–${cockpitValue(def,hi)}`):direction==='lower'?`Target below ${current}`:direction==='higher'?`Target above ${current}`:`Compare the coach band`;
  return{current:`Current ${current}`,target,left:clamp(left,0,96),width:clamp(width,4,100-left)};
}
function resolveCoachTomiRoute(note={}){
  const rec=note.recommendation||{kind:'math',label:'See the math'},defs=activeVariableProfile(),candidates=Array.isArray(rec.variables)?rec.variables:[],preferred=candidates.map(id=>defs.find(def=>def.id===id)).find(Boolean),def=candidates.map(id=>defs.find(item=>item.id===id&&!isLocked(M.key,id))).find(Boolean),locked=preferred&&isLocked(M.key,preferred.id)?prototypeLockReason(preferred):'';
  if(rec.kind==='control'&&def){const suggestion=(M.suggest?M.suggest():{})[def.id]||null;return{kind:'control',label:'Try this',def,target:coachTomiTarget(def,suggestion,rec.direction),locked,copy:locked?`${locked} Coach Tomi moved this tip to ${quickMathName(def)}.`:note.cue};}
  const subject=preferred?quickMathName(preferred):rec.topic==='corner-limit'?'corner limit':rec.topic==='steering'?'steering':rec.topic==='header-timing'?'header timing':'timing';return{kind:'math',label:'See the math',def:preferred||null,locked,copy:locked||`${note.cue||'Open the explanation.'} Review ${subject} without changing a value.`};
}
function setCoachTomiAction(source,note){
  const button=source==='pregame'?$('#coachTomiPregameAction'):source==='result'?$('#coachTomiResultAction'):coachMathNudgeAction,route=resolveCoachTomiRoute(note);COACH_TOMI_ACTIONS[source]=note;button.hidden=!note;button.textContent=route.label;button.setAttribute('aria-label',route.kind==='control'?`Try Coach Tomi's ${quickMathName(route.def)} recommendation in Manual Physics`:`Open Math for Coach Tomi's ${route.def?quickMathName(route.def):'physics'} explanation`);
}
function coachTomiRecommendationOwnsStage(){return!!COACH_TOMI_ACTIONS.current;}
function renderCoachTomiPregame(meta={}){
  const context=pacingContext(meta),plan=KickLabCoachTomi.beginning({mode:M.key,activity:pacingActivityName(meta),history:coachTomiHistory(M.key),variables:coachTomiVariables(context),context});
  $('#coachTomiPregameLevel').textContent=plan.tier==='novice'?'First look':plan.tier==='experienced'?'Next detail':'Build the skill';$('#coachTomiPregameObservation').textContent=plan.observation;$('#coachTomiPregameCue').textContent=plan.cue;$('#coachTomiPregameVariable').textContent=plan.variable;$('#coachTomiPregameFormula').textContent=plan.formula;$('#coachTomiPregameMeter').style.width=`${Math.round(Math.max(.08,plan.level||0)*100)}%`;$('#coachTomiPregame').dataset.tier=plan.tier;setCoachTomiAction('pregame',plan);return plan;
}
function captureCoachTomiOutcome(mode,success,meta={}){
  const session=coachTomiSession(mode),history=coachTomiHistory(mode),input={mode,success,title:meta.title,sub:meta.sub,grade:meta.grade,history,recent:session.recent,context:pacingContext(meta)};
  const code=KickLabCoachTomi.outcomeCode(input),need=KickLabCoachTomi.need(Object.assign({},input,{recent:code?[...session.recent,code]:session.recent})),result=KickLabCoachTomi.result(input);
  session.recent.push(code||'success');if(session.recent.length>4)session.recent.shift();if(need)session.pending=Object.assign({id:`${coachTomiProfileKey()}:${mode}:${++COACH_MATH_NUDGE.sequence}`},need);else if(success)session.pending=null;return result;
}
function renderCoachTomiResult(mode,meta={}){
  const note=meta.coachTomi||KickLabCoachTomi.result({mode,title:meta.title,sub:meta.sub,grade:meta.grade,history:coachTomiHistory(mode),context:pacingContext(meta)});$('#coachTomiResultLevel').textContent=note.tier==='novice'?'First look':note.tier==='experienced'?'Next detail':'Build the skill';$('#coachTomiResultObservation').textContent=note.observation;$('#coachTomiResultCue').textContent=note.cue;$('#coachTomiResult').dataset.tier=note.tier;setCoachTomiAction('result',note);return note;
}
function hideCoachMathNudge({restore=false,reason='dismissed'}={}){
  if(coachMathNudge.hidden)return;
  clearTimeout(COACH_MATH_NUDGE.timer);COACH_MATH_NUDGE.timer=null;coachMathNudge.hidden=true;coachMathNudge.dataset.state=reason;
  if(window.__KICKLAB_COACH_MATH_NUDGE__)Object.assign(window.__KICKLAB_COACH_MATH_NUDGE__,{visible:false,lastReason:reason,dismissed:window.__KICKLAB_COACH_MATH_NUDGE__.dismissed+(reason==='dismissed'?1:0)});
  if(restore&&coachMathNudge.contains(document.activeElement))$('#physicsDetailsHud').focus();
}
function maybeShowCoachMathNudge(meta={}){
  const need=meta.need;if(!need)return false;const key=meta.coachMathEvent||need.id||`${M.key}:${++COACH_MATH_NUDGE.sequence}`,now=Date.now();
  if(COACH_MATH_NUDGE.seen.has(key)||now-COACH_MATH_NUDGE.lastShownAt<COACH_MATH_NUDGE.cooldown||RP.on||CINE.on||resOpen())return false;
  COACH_MATH_NUDGE.seen.add(key);COACH_MATH_NUDGE.current=key;COACH_MATH_NUDGE.lastShownAt=now;$('#coachMathNudgeMessage').textContent=`${need.observation} ${need.cue}`;setCoachTomiAction('nudge',need);coachMathNudge.hidden=false;coachMathNudge.dataset.event=key;coachMathNudge.dataset.state='visible';coachMathNudge.dataset.rule=need.code||'context';
  clearTimeout(COACH_MATH_NUDGE.timer);COACH_MATH_NUDGE.timer=setTimeout(()=>hideCoachMathNudge({reason:'expired'}),9000);
  Object.assign(window.__KICKLAB_COACH_MATH_NUDGE__,{visible:true,event:key,shown:window.__KICKLAB_COACH_MATH_NUDGE__.shown+1,lastReason:'shown',pause:PAUSE.on});return true;
}
function showPendingCoachMathNudge(){const session=coachTomiSession(M.key),pending=session.pending;if(!pending)return false;const shown=maybeShowCoachMathNudge({coachMathEvent:pending.id,need:pending});if(shown)session.pending=null;return shown;}
window.__KICKLAB_COACH_MATH_NUDGE__={visible:false,shown:0,dismissed:0,openedMath:0,lastReason:'ready',pause:false,show:meta=>maybeShowCoachMathNudge(meta),showPending:()=>showPendingCoachMathNudge(),capture:(mode,success,meta)=>captureCoachTomiOutcome(mode,success,meta),begin:meta=>renderCoachTomiPregame(meta),renderResult:(mode,meta)=>renderCoachTomiResult(mode,meta),route:note=>resolveCoachTomiRoute(note),open:source=>openCoachTomiRecommendation(source),hide:()=>hideCoachMathNudge(),snapshot:()=>({paused:PAUSE.on,owners:PAUSE_OWNERS.snapshot(),context:CONTEXT_DETAILS.open,profile:coachTomiProfileKey(),session:coachTomiSession(M.key),stageMessageOwner:coachTomiRecommendationOwnsStage()?'coach-recommendation':null,transientTitle:E.title&&E.title.text||null,transitionActive:PACE_SEQUENCE.state().active,recommendation:COACH_TOMI_ACTIONS.current&&{kind:COACH_TOMI_ACTIONS.current.kind,variable:COACH_TOMI_ACTIONS.current.def&&COACH_TOMI_ACTIONS.current.def.id,current:COACH_TOMI_ACTIONS.current.target&&COACH_TOMI_ACTIONS.current.target.current,target:COACH_TOMI_ACTIONS.current.target&&COACH_TOMI_ACTIONS.current.target.target,locked:COACH_TOMI_ACTIONS.current.locked}})};
coachMathNudgeClose.addEventListener('click',()=>hideCoachMathNudge({restore:true}));
coachMathNudgeAction.addEventListener('click',()=>{const route=resolveCoachTomiRoute(COACH_TOMI_ACTIONS.nudge||{});if(route.kind==='math')window.__KICKLAB_COACH_MATH_NUDGE__.openedMath++;openCoachTomiRecommendation('nudge');});

function contextPanel(name){return $(`#${name==='math'?'physics':name}Detail`);}
function contextTriggers(name){return name==='math'?[$('#physicsDetailsHud'),$('#physicsDetailsCompact'),$('#physicsDetailsWide')]:[$(`#${name}DetailToggle`)];}
function syncContextTrigger(button,expanded){const action=expanded?'Close':'Open',label=button.dataset.detailLabel||'details',name=`${action} ${label}`;button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',name);button.title=name;}
function releaseGameplayForOverlay(){hideCoachMathNudge({reason:'overlay-opened'});if(typeof releaseMobileHeldInputs==='function')releaseMobileHeldInputs('Game overlay opened');ENGINE.off();document.querySelectorAll('#pad .on').forEach(button=>button.classList.remove('on'));}
function syncGameOverlayBackdrop(){const profileOpen=!profileDialog.hidden&&profileDialog.classList.contains('game-profile-overlay'),open=!!CONTEXT_DETAILS.open||!settingsDrawer.hidden||profileOpen;gameOverlayBackdrop.hidden=!open;gameStage.classList.toggle('has-game-overlay',open);gamePlayShell.classList.toggle('has-game-overlay',open);}
function overlayFocusables(panel){return[...panel.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(node=>!node.hidden&&node.getAttribute('aria-hidden')!=='true'&&node.getClientRects().length>0);}
function trapOverlayFocus(panel,e){if(e.key!=='Tab')return;const items=overlayFocusables(panel);if(!items.length)return;e.stopPropagation();const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
function closeContextDetail({restore=true,restart=true}={}){
  if(!CONTEXT_DETAILS.open)return;
  const trigger=CONTEXT_DETAILS.trigger,name=CONTEXT_DETAILS.open;
  contextPanel(name).hidden=true;contextTriggers(name).forEach(b=>syncContextTrigger(b,false));
  CONTEXT_DETAILS.open=null;CONTEXT_DETAILS.trigger=null;
  if(CONTEXT_DETAILS.ownsPause)releasePauseOwner('context-detail',{restart});
  CONTEXT_DETAILS.ownsPause=false;
  syncGameOverlayBackdrop();
  if(restore&&trigger&&trigger.isConnected&&!trigger.hidden)trigger.focus();
  requestAnimationFrame(resize);
}
function setContextDetail(name,{trigger=null,focus=false,open=true}={}){
  const panel=contextPanel(name);if(!panel)return;
  if(!open){closeContextDetail();return;}
  if(CONTEXT_DETAILS.open===name){closeContextDetail();return;}
  closeContextDetail({restore:false,restart:false});
  if(!settingsDrawer.hidden)closeSettings({restore:false,restart:false});
  if(!profileDialog.hidden)closeProfiles({restore:false,restart:false});
  CONTEXT_DETAILS.open=name;CONTEXT_DETAILS.trigger=trigger||contextTriggers(name).find(b=>b.offsetParent!==null)||contextTriggers(name)[0];
  document.querySelectorAll('.context-detail').forEach(p=>p.hidden=p!==panel);
  ['orientation','math','review','goals','learn'].forEach(n=>contextTriggers(n).forEach(b=>syncContextTrigger(b,n===name)));
  panel.hidden=false;releaseGameplayForOverlay();
  pauseGame('context-detail');CONTEXT_DETAILS.ownsPause=true;
  if(focus)requestAnimationFrame(()=>panel.querySelector('[data-close-detail]')?.focus());
  syncGameOverlayBackdrop();requestAnimationFrame(resize);
}

function clearCoachTomiRecommendation(){
  const ownsPause=COACH_TOMI_ACTIONS.ownsPause;clearTimeout(COACH_TOMI_ACTIONS.timer);COACH_TOMI_ACTIONS.timer=null;COACH_TOMI_ACTIONS.current=null;COACH_TOMI_ACTIONS.ownsPause=false;coachTomiControlRecommendation.hidden=true;coachTomiMathRecommendation.hidden=true;document.querySelectorAll('.coach-recommended').forEach(node=>node.classList.remove('coach-recommended'));if(ownsPause)releasePauseOwner('coach-recommendation');
}
function coachTomiRecommendationTimer(){clearTimeout(COACH_TOMI_ACTIONS.timer);COACH_TOMI_ACTIONS.timer=setTimeout(clearCoachTomiRecommendation,9000);}
function showCoachTomiControlRoute(route,{source}={}){
  clearCoachTomiRecommendation();COACH_TOMI_ACTIONS.current=route;const note=coachTomiControlRecommendation,target=note.querySelector('.coach-tomi-target');note.querySelector('p').textContent=route.locked?`${route.locked} Use ${quickMathName(route.def)} instead.`:route.copy;target.querySelector('small').textContent=route.target.current;target.querySelector('output').textContent=route.target.target;target.querySelector('em').style.left=`${route.target.left}%`;target.querySelector('em').style.width=`${route.target.width}%`;note.hidden=false;
  const finish=(row,focus)=>{if(!row)return false;row.classList.add('coach-recommended');row.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'});requestAnimationFrame(()=>focus?.focus());coachTomiRecommendationTimer();return true;};
  const holdPregame=()=>{if(source==='pregame'){claimPauseOwner('coach-recommendation');COACH_TOMI_ACTIONS.ownsPause=true;}};
  if(typeof ANALOG_CONTROL!=='undefined'&&ANALOG_CONTROL.enabled){prototypePhysics.open=true;renderPrototypeManual();const row=prototypePhysicsRows.querySelector(`[data-var="${route.def.id}"]`),focus=row&&row.querySelector('.prototype-slot[aria-checked="true"]');holdPregame();if(finish(row,focus))return;}
  if(WIDE_MANUAL.active){renderWideManual();const row=wideManualRows.querySelector(`[data-var="${route.def.id}"]`);holdPregame();if(finish(row,row&&row.querySelector('input')))return;}
  const defs=manualMathDefs(),index=defs.findIndex(def=>def.id===route.def.id);if(index>=0){CONTROLLER.sel=index;setControllerMode('manual',{restore:false});renderControllerMode();finish(manualController,$('#manualVariableSlider'));}
}
function showCoachTomiMathRoute(route){
  clearCoachTomiRecommendation();COACH_TOMI_ACTIONS.current=route;coachTomiMathRecommendation.querySelector('p').textContent=route.copy;coachTomiMathRecommendation.hidden=false;setContextDetail('math',{trigger:$('#physicsDetailsHud'),focus:false});const row=route.def&&varEls.find(item=>item.def.id===route.def.id)?.el,target=row||$('#liveEq');target?.classList.add('coach-recommended');target?.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'});requestAnimationFrame(()=>coachTomiMathRecommendation.focus());coachTomiRecommendationTimer();
}
function openCoachTomiRecommendation(source){
  const note=COACH_TOMI_ACTIONS[source];if(!note)return false;const route=resolveCoachTomiRoute(note),session=coachTomiSession(M.key);session.pending=null;if(source==='pregame'&&PACE_SEQUENCE.state().active)cancelGameTransition('coach-recommendation',{retain:true});if(source==='result'&&resOpen())ackResults();E.title=null;hideCoachMathNudge({reason:'recommendation-opened'});if(route.kind==='control')showCoachTomiControlRoute(route,{source});else showCoachTomiMathRoute(route);return true;
}
$('#coachTomiPregameAction').addEventListener('click',event=>{event.stopPropagation();openCoachTomiRecommendation('pregame');});
$('#coachTomiResultAction').addEventListener('click',event=>{event.stopPropagation();openCoachTomiRecommendation('result');});
coachTomiControlRecommendation.querySelector('button').addEventListener('click',clearCoachTomiRecommendation);
coachTomiMathRecommendation.querySelector('button').addEventListener('click',clearCoachTomiRecommendation);

function setSettingsPause(on){
  if(on)pauseGame('settings');
  else releasePauseOwner('settings');
  $('#settingsState').textContent=on?'Game paused while settings are open.':'Settings open. Changes apply immediately.';
}
function setSettingsLevel(level,{category=SETTINGS.category,focus=true}={}){
  SETTINGS.level=level;SETTINGS.category=category;
  const cats=$('#settingsCategories'),choices=$('#settingsChoices'),kitRoom=$('#kitroom'),back=$('#settingsBack');
  cats.hidden=level!=='categories';choices.hidden=level!=='choices';kitRoom.hidden=level!=='kit';back.hidden=level==='categories';
  const group=settingsGroups().find(g=>g.id===category),label=group?group.label:'Settings';
  $('#settingsBreadcrumb').textContent=level==='categories'?'Settings':level==='kit'?'Settings / Kit':`Settings / ${label}`;
  $('#settingsTitle').textContent=level==='categories'?'Choose a category':level==='kit'?'Equipment details':label;
  if(level==='categories')renderSettingsCategories();
  else if(level==='choices')renderSettingsChoices(category);
  else renderKit();
  $('#settingsDrawerBody').scrollTop=0;
  if(focus)requestAnimationFrame(()=>{const target=level==='categories'?cats.querySelector('button'):level==='choices'?choices.querySelector('button'):kitRoom.querySelector('button');(target||back).focus();});
}
function openSettings(category=null,trigger=settingsToggle){
  if(!profileDialog.hidden)closeProfiles({restore:false,restart:false});if(CONTEXT_DETAILS.open)closeContextDetail({restore:false,restart:false});SETTINGS.trigger=trigger;SETTINGS.restoreCategory=trigger&&trigger.dataset?trigger.dataset.category:null;settingsDrawer.hidden=false;settingsToggle.setAttribute('aria-expanded','true');releaseGameplayForOverlay();setSettingsPause(true);
  setSettingsLevel(category?'choices':'categories',{category,focus:true});syncGameOverlayBackdrop();requestAnimationFrame(resize);
}
function closeSettings({restore=true,restart=true}={}){
  if(settingsDrawer.hidden)return;settingsDrawer.hidden=true;$('#kitroom').hidden=true;settingsToggle.setAttribute('aria-expanded','false');releasePauseOwner('settings',{restart});
  syncGameOverlayBackdrop();if(restore){const trigger=SETTINGS.trigger&&SETTINGS.trigger.isConnected&&SETTINGS.trigger.offsetParent!==null?SETTINGS.trigger:SETTINGS.restoreCategory!=null?$(`#quickSettings [data-category="${SETTINGS.restoreCategory}"]`):null;(trigger||$('#orientationDetailToggle')||settingsToggle).focus();}requestAnimationFrame(resize);
}
function showKitSettings(trigger=$('#kitRoomToggle')){SETTINGS.trigger=SETTINGS.trigger||trigger;setSettingsLevel('kit',{category:'kit',focus:true});}
function settingsBack(){if(SETTINGS.level==='kit')setSettingsLevel('choices',{category:'kit'});else if(SETTINGS.level==='choices')setSettingsLevel('categories');}

settingsToggle.addEventListener('click',()=>settingsDrawer.hidden?openSettings(null,settingsToggle):closeSettings());
$('#settingsClose').addEventListener('click',()=>closeSettings());
$('#settingsBack').addEventListener('click',settingsBack);
$('#quickSettings').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;openSettings(b.dataset.category||null,b);});
$('#settingsCategories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;setSettingsLevel('choices',{category:b.dataset.category});});
settingsDrawer.addEventListener('pointerdown',e=>e.stopPropagation());
settingsDrawer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSettings();return;}trapOverlayFocus(settingsDrawer,e);e.stopPropagation();});
document.addEventListener('pointerdown',e=>{if(settingsDrawer.hidden||settingsDrawer.contains(e.target)||settingsToggle.contains(e.target)||$('#quickSettings').contains(e.target))return;const focusTarget=e.target.closest&&e.target.closest('button,input,select,textarea,[tabindex]');closeSettings({restore:false});if(!focusTarget)requestAnimationFrame(()=>settingsToggle.focus());});
gameOverlayBackdrop.addEventListener('click',()=>{if(!profileDialog.hidden&&profileDialog.classList.contains('game-profile-overlay'))closeProfiles();else if(CONTEXT_DETAILS.open)closeContextDetail();else if(!settingsDrawer.hidden)closeSettings();});

function bindContextTrigger(button,name){button.addEventListener('click',()=>setContextDetail(name,{trigger:button,focus:true}));button.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'&&CONTEXT_DETAILS.open){e.preventDefault();closeContextDetail();return;}if(e.key===' '||e.key==='Spacebar'){e.preventDefault();button.click();}});}
contextTriggers('math').forEach(b=>bindContextTrigger(b,'math'));
['orientation','review','goals','learn'].forEach(name=>bindContextTrigger(contextTriggers(name)[0],name));
document.querySelectorAll('[data-close-detail]').forEach(b=>b.addEventListener('click',()=>closeContextDetail()));
document.querySelectorAll('.context-detail').forEach(p=>{p.addEventListener('pointerdown',e=>e.stopPropagation());p.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeContextDetail();return;}trapOverlayFocus(p,e);e.stopPropagation();});});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&CONTEXT_DETAILS.open){e.preventDefault();e.stopPropagation();closeContextDetail();}});

function cockpitValue(def,value){
  const n=fmt(value,def.d==null?1:def.d),u=def.unit||'';
  return`${n}${u?(u==='°'?'°':' '+u):''}`;
}
function quickMathName(def){const names={m:'Mass',dt:'Padding',A:'Contact',mu:'Grip',R:'Radius',F:'Engine',v:'Speed',th:'Angle',thH:'Direction',g:'Gravity',spin:'Spin',jv:'Jump',run:'Run speed',grip:'Boot grip',curl:'Curve',vs:'Shot speed',pv:'Pass speed',gkr:'Reaction',gka:'Dive acceleration'};return names[def.id]||def.name;}
function quickMathDefs(){const defs=activeVariableProfile().filter(d=>!isLocked(M.key,d.id));if(!defs.length)return[];if(CONTROLLER.mode==='manual')return[defs[((CONTROLLER.sel%defs.length)+defs.length)%defs.length]];if(dialMode()==='quick')return quickTuneVariableIds().map(id=>defs.find(d=>d.id===id)).filter(Boolean);return defs.slice(0,4);}
function manualMathDefs(){return activeVariableProfile().filter(d=>!isLocked(M.key,d.id));}
function wideManualDefs(){return activeVariableProfile();}
function plainMath(html){return String(html||'').replace(/<[^>]*>/g,' ').replace(/&(?:emsp|ensp|nbsp);/g,' ').replace(/&minus;|−/g,'-').replace(/&times;|×|·/g,' x ').replace(/&divide;|÷/g,' / ').replace(/&amp;/g,' and ').replace(/&lt;/g,' less than ').replace(/&gt;/g,' greater than ').replace(/θ/g,'Angle').replace(/μ/g,'Grip').replace(/ρ/g,'Density').replace(/δ/g,'Steering').replace(/Δt/g,'Padding time').replace(/R_turn/g,'Turn radius').replace(/\bvx\b/g,'horizontal speed').replace(/\bvy\b/g,'vertical speed').replace(/≤/g,' at most ').replace(/≥/g,' at least ').replace(/→/g,' gives ').replace(/½/g,'0.5 x ').replace(/²/g,' squared').replace(/_eff/g,' effective').replace(/x\s+x/g,'x').replace(/\s+/g,' ').trim();}
function quickMathDisabled(def){const row=varEls.find(v=>v.def.id===def.id);return(CONTROLLER.mode!=='manual'&&!!(row&&row.inp.disabled))||RP.on||CINE.on||resOpen();}
function manualUnavailableReason(){if(RP.on)return'Manual Physics is unavailable during replay.';if(CINE.on)return'Manual Physics is unavailable during the replay sequence.';if(!$('#rvBack').hidden)return'Close Coach review before using Manual Physics.';if(!$('#lvlup').hidden)return'Finish the level-up moment before using Manual Physics.';if(resOpen())return'Manual Physics is unavailable while results are open. Choose Next round first.';return'';}
function prototypeLockReason(def){const challenge=curCh(M.key),locked=challenge&&challenge.lock&&challenge.lock[def.id]!==undefined;if(!locked)return'';return`${challenge.name} fixes ${quickMathName(def)} at ${cockpitValue(def,challenge.lock[def.id])}. Finish or leave this challenge to change it.`;}
function prototypeRangeLabel(model){return{low:'Below coach band',target:'In coach band',perfect:'Coach ideal',high:'Above coach band',locked:'Challenge locked',neutral:'No target band'}[model.state]||'Current range';}
function prototypeSlotText(def,value){const n=Math.abs(value)>=1000?`${fmt(value/1000,1)}k`:fmt(value,def.d==null?1:def.d);return`${n}${def.unit==='°'?'°':''}`;}
function prototypeGraphicTitle(def){if(M===Fight)return def.id==='dt'?'Timing window':def.id==='A'?'Pressure response':'Force and reaction';if(M===Race)return['mu','R'].includes(def.id)?'Grip and turning':'Acceleration';if(['gkr','gka'].includes(def.id))return'Goalkeeper coverage';if(def.id==='pv')return'Pass arrival';if(['run','grip'].includes(def.id))return'Defender separation';return'Trajectory clearance';}
function prototypeDirectImpact(slotState,prediction){if(['target','perfect'].includes(slotState))return GAME_CORE.objectiveImpact({benefit:slotState==='perfect'?'Best fit for objective':'Supports objective',prediction});if(['low','high'].includes(slotState))return GAME_CORE.objectiveImpact({cost:'Works against objective',prediction});return GAME_CORE.objectiveImpact({neutral:'Neutral / explore',prediction});}
function prototypeImpact(def,value,slotState){const q=M.eqs(),live=M.LIVE?M.LIVE():[],raw=live.map(index=>q.lines[index]).find(line=>line&&(line.includes(def.sym)||line.includes(def.id)))||q.lines[live[0]]||q.lines[0]||M.hint||'',equation=plainMath(raw);
  if(M===Fight){const m=def.id==='m'?value:Fight.V.m,dt=def.id==='dt'?value:Fight.V.dt,k=Fight.TYPES[Fight.opt.type].k,mEff=m*k,accuracy=1-Math.abs(Fight.needle()-.5)*2,v=def.id==='m'?Fight.vTiming(accuracy)*Math.sqrt(2.8/mEff):Fight.curV(),outForce=mEff*v/(dt/1000),tier=Fight.tier(),armor=tier.armor||0,incoming=OPPM*tier.vo/(dt/1000),incomingDamage=Math.min(60,incoming/40),cracks=!armor||outForce>=armor,safe=incomingDamage<=30,prediction=`At the current ${fmt(v,1)} m/s timing, your hit is ${fmt(outForce,0)} N${armor?` versus ${fmt(armor,0)} N armor: ${cracks?'it gets through':'it bounces off'}`:''}. His incoming hit is about ${fmt(incoming,0)} N (${fmt(incomingDamage,0)} HP).`;
    if(def.id==='dt'){if(cracks&&safe)return GAME_CORE.objectiveImpact({benefit:'Cracks armor safely',prediction});if(cracks)return GAME_CORE.objectiveImpact({benefit:'Stronger hit',cost:'Harder incoming hit',prediction});if(safe)return GAME_CORE.objectiveImpact({benefit:'Safer',cost:'Weaker hit',prediction});return GAME_CORE.objectiveImpact({cost:'Weak hit · hard incoming hit',prediction});}
    if(def.id==='m'){const fast=REACH/v<=tier.react;if(cracks&&fast)return GAME_CORE.objectiveImpact({benefit:'Fast enough · cracks armor',prediction});if(cracks)return GAME_CORE.objectiveImpact({benefit:'More force',cost:'Slower fist',prediction});if(fast)return GAME_CORE.objectiveImpact({benefit:'Faster fist',cost:'Less force',prediction});return GAME_CORE.objectiveImpact({cost:'Too slow · below armor',prediction});}
    return GAME_CORE.objectiveImpact({neutral:'Pressure only · damage neutral',prediction:`Contact area changes pressure, not force or knockout damage. ${equation}`});}
  if(M===Race){const mu=def.id==='mu'?value:Race.V.mu,R=def.id==='R'?value:Race.V.R,m=def.id==='m'?value:Race.V.m,F=def.id==='F'?value:Race.V.F,vmax=Math.sqrt(mu*G0*R)*3.6,a=F/m,gripCap=mu*G0;if(def.id==='R')return R<=32?GAME_CORE.objectiveImpact({benefit:'Shorter path',cost:'Lower corner limit',prediction:`This tighter ${fmt(R,0)} m radius shortens the route and allows about ${fmt(vmax,0)} km/h.`}):GAME_CORE.objectiveImpact({benefit:'Higher corner limit',cost:'Longer path',prediction:`This wider ${fmt(R,0)} m radius allows about ${fmt(vmax,0)} km/h but lengthens the route.`});if(def.id==='mu')return mu>=1.2?GAME_CORE.objectiveImpact({benefit:'More grip · shorter braking',prediction:`Grip ${fmt(mu,2)} sets the corner limit near ${fmt(vmax,0)} km/h and shortens braking.`}):GAME_CORE.objectiveImpact({cost:'Less grip · longer braking',prediction:`Grip ${fmt(mu,2)} limits the corner to about ${fmt(vmax,0)} km/h and lengthens braking.`});if(def.id==='m')return a>=gripCap?GAME_CORE.objectiveImpact({benefit:'Grip-limited launch',prediction:`F ÷ m reaches ${fmt(a,1)} m/s², so tire grip caps usable acceleration near ${fmt(gripCap,1)} m/s²; mass still cancels from corner speed.`}):GAME_CORE.objectiveImpact({cost:'Slower launch',prediction:`F ÷ m gives ${fmt(a,1)} m/s², below the ${fmt(gripCap,1)} m/s² grip limit; mass still cancels from corner speed.`});if(def.id==='F')return a>=gripCap?GAME_CORE.objectiveImpact({neutral:'Tire-limited · no extra acceleration',prediction:`F ÷ m reaches ${fmt(a,1)} m/s², but tire grip caps usable acceleration near ${fmt(gripCap,1)} m/s².`}):GAME_CORE.objectiveImpact({cost:'Below grip-limited acceleration',prediction:`F ÷ m gives ${fmt(a,1)} m/s², below the ${fmt(gripCap,1)} m/s² tire limit.`});}
  if(M===Kick&&Kick.opt.shot==='free'&&['v','th','g','spin'].includes(def.id)){const v=def.id==='v'?value:Kick.V.v,th=def.id==='th'?value:Kick.V.th,g=def.id==='g'?value:Kick.V.g,spin=def.id==='spin'?value:Kick.V.spin,result=Kick.freeCalc(v,th,spin,g),prediction=`The ball reaches ${fmt(result.yw,2)} m at the wall and ${fmt(result.yg,2)} m at goal height. ${result.clear?'It clears the wall':'It hits the wall'}; ${result.under?'the target window is open':'the target window is missed'}.`;if(result.clear&&result.under)return GAME_CORE.objectiveImpact({benefit:'Clears wall · under bar',prediction});if(!result.clear)return GAME_CORE.objectiveImpact({cost:'Hits wall',prediction});if(result.yg>=Kick.BAR-Kick.BR)return GAME_CORE.objectiveImpact({cost:'Over the bar',prediction});return GAME_CORE.objectiveImpact({cost:Kick.keeper?'Too low · keeper covers it':'Too low',prediction});}
  if(def.id==='gkr')return value<=.3?GAME_CORE.objectiveImpact({benefit:'Earlier keeper reaction',prediction:equation}):GAME_CORE.objectiveImpact({cost:'Later keeper reaction',prediction:equation});if(def.id==='gka')return value>=22?GAME_CORE.objectiveImpact({benefit:'More goal coverage',prediction:equation}):GAME_CORE.objectiveImpact({cost:'Less goal coverage',prediction:equation});if(def.id==='grip')return value>=.8?GAME_CORE.objectiveImpact({benefit:'Harder cut',prediction:equation}):GAME_CORE.objectiveImpact({cost:'Less separation',prediction:equation});return prototypeDirectImpact(slotState,equation);}
function prototypeEffect(def,model,suggestion){const slot=model.slots[model.selectedIndex],impact=prototypeImpact(def,model.value,slot.state),change=PROTOTYPE_MANUAL.change&&PROTOTYPE_MANUAL.change.id===def.id?PROTOTYPE_MANUAL.change:null;return{impact,slot,change,coach:suggestion&&suggestion.note?suggestion.note:'No numeric coach band is available for this mechanic. Use the live result and detailed physics drawer for fine tuning.'};}
function prototypeDetailHTML(def,model,suggestion,detailId){const effect=prototypeEffect(def,model,suggestion),scores={helps:.92,tradeoff:.58,neutral:.5,hurts:.2},impacts=model.slots.map(slot=>prototypeImpact(def,slot.value,slot.state)),points=model.slots.map((slot,index)=>`${8+index*18.4},${34-scores[impacts[index].kind]*24}`).join(' '),dots=model.slots.map((slot,index)=>`<circle cx="${8+index*18.4}" cy="${34-scores[impacts[index].kind]*24}" r="${slot.selected?3.8:2.2}" class="${impacts[index].kind}${slot.selected?' selected':''}"/>`).join(''),changed=effect.change&&effect.change.from!==effect.change.to?`${cockpitValue(def,effect.change.from)} → ${cockpitValue(def,effect.change.to)}`:`Selected ${cockpitValue(def,model.value)}`,summary=`${prototypeGraphicTitle(def)} for ${quickMathName(def)}. Six values show predicted objective impact. ${cockpitValue(def,model.value)} is selected: ${effect.impact.label}. ${effect.impact.prediction}`;return`<header><span><b>${prototypeGraphicTitle(def)}</b><small>${quickMathName(def)} · ${cockpitValue(def,model.value)}</small></span><button type="button" data-collapse-slots="${def.id}" aria-label="Collapse ${quickMathName(def)} details">Collapse</button></header><div class="prototype-detail-grid"><div class="prototype-detail-copy"><strong data-tone="${effect.impact.kind}">${effect.impact.label}</strong><p><b>Changed:</b> ${changed}</p><p><b>Predicted:</b> ${effect.impact.prediction}</p><p><b>${COACHES[M.key].name}:</b> ${effect.coach}</p></div><figure role="img" aria-label="${summary}"><svg viewBox="0 0 100 40" aria-hidden="true"><path d="M8 34H100"/><polyline points="${points}"/>${dots}</svg><figcaption>${summary}</figcaption></figure></div>`;}
function renderPrototypeManual(){if(!prototypePhysicsRows)return;const defs=wideManualDefs(),profile=activeVariableProfileKey(),sig=`${M.key}|${profile.join(':')}|${defs.map(d=>d.id).join(',')}`;
  if(!defs.some(def=>def.id===PROTOTYPE_MANUAL.expanded))PROTOTYPE_MANUAL.expanded=null;if(sig!==PROTOTYPE_MANUAL.sig){PROTOTYPE_MANUAL.sig=sig;prototypePhysicsRows.innerHTML=defs.map(def=>{const id=`prototype-slots-${M.key}-${profile[1]}-${def.id}`,desc=`${id}-description`,detail=`${id}-detail`;return`<div class="prototype-physics-row" data-var="${def.id}" style="--c:${def.col}"><span class="prototype-slider-head"><span><b>${def.sym||quickMathName(def)}</b><small>${quickMathName(def)}</small></span><output></output></span><span class="prototype-range-context" aria-hidden="true"><small class="range-min"></small><b class="range-state"></b><small class="range-max"></small></span><div class="prototype-slot-group" id="${id}" role="radiogroup" aria-label="${quickMathName(def)} quick values" aria-describedby="${desc}">${Array.from({length:6},(_,index)=>`<button type="button" class="prototype-slot" data-index="${index}" role="radio" aria-controls="${detail}"><span></span></button>`).join('')}</div><span class="prototype-range-description" id="${desc}"></span><section class="prototype-slot-detail" id="${detail}" aria-label="Selected ${quickMathName(def)} details" hidden></section></div>`;}).join('');}
  const suggestions=M.suggest?M.suggest():{},reason=manualUnavailableReason(),coach=COACHES[M.key].name;let lockedCount=0,bandCount=0;
  defs.forEach(def=>{const row=prototypePhysicsRows.querySelector(`[data-var="${def.id}"]`),source=varEls.find(v=>v.def.id===def.id),locked=isLocked(M.key,def.id),temporary=!!reason||!!(source&&source.inp.disabled&&!locked),lockReason=prototypeLockReason(def),suggestion=suggestions[def.id]||null,model=GAME_CORE.sliderSlotsModel({min:def.min,max:def.max,step:def.step,value:M.V[def.id],suggestion,locked,lockReason,name:quickMathName(def),unit:def.unit});if(!row)return;
    const blocked=locked||temporary,description=[model.description,'Choose one of six snap sections on the continuous band. Use Left or Right, Home or End from the keyboard.',suggestion&&suggestion.note?`${coach}: ${suggestion.note}`:'',temporary&&!locked?(reason||'Physics controls are locked during this action.'):''].filter(Boolean).join(' '),selected=model.slots[model.selectedIndex],expanded=PROTOTYPE_MANUAL.expanded===def.id,detail=row.querySelector('.prototype-slot-detail');row.querySelector('output').textContent=cockpitValue(def,M.V[def.id]);row.querySelector('.range-min').textContent=cockpitValue(def,def.min);row.querySelector('.range-max').textContent=cockpitValue(def,def.max);row.querySelector('.range-state').textContent=locked?'Challenge locked':prototypeRangeLabel(selected);row.querySelector('.prototype-range-description').textContent=description;row.dataset.state=selected.state;row.classList.toggle('locked',locked);row.classList.toggle('temporarily-locked',temporary&&!locked);const group=row.querySelector('.prototype-slot-group');group.setAttribute('aria-disabled',String(blocked));model.slots.forEach(slot=>{const button=group.querySelector(`[data-index="${slot.index}"]`);button.dataset.value=slot.value;button.dataset.state=slot.state;button.setAttribute('aria-label',slot.label);button.setAttribute('aria-checked',String(slot.selected));button.setAttribute('aria-disabled',String(blocked));button.setAttribute('aria-expanded',String(expanded&&slot.selected));button.tabIndex=slot.selected?0:-1;button.querySelector('span').textContent=prototypeSlotText(def,slot.value);});detail.hidden=!expanded;if(expanded)detail.innerHTML=prototypeDetailHTML(def,model,suggestion,detail.id);row.classList.toggle('has-band',model.hasBand);row.classList.toggle('detail-open',expanded);if(locked)lockedCount++;if(model.hasBand)bandCount++;});
  const activity=profile[1]==='default'?M.key[0].toUpperCase()+M.key.slice(1):profile[1].replace(/^./,c=>c.toUpperCase());$('#prototypePhysicsStatus').textContent=reason||`${activity} · ${defs.length} active mechanic${defs.length===1?'':'s'} · ${bandCount} live coach band${bandCount===1?'':'s'}${lockedCount?` · ${lockedCount} challenge locked`:''}`;}
function renderWideManual(){const defs=wideManualDefs(),sig=`${M.key}|${activeVariableProfileKey().join(':')}|${defs.map(d=>d.id).join(',')}`;if(sig!==WIDE_MANUAL.sig){WIDE_MANUAL.sig=sig;wideManualRows.innerHTML=defs.map(def=>`<label class="wide-manual-row" data-var="${def.id}" style="--c:${def.col}"><span><b>${def.sym||quickMathName(def)}</b><small>${quickMathName(def)}</small></span><output></output><input type="range" min="${def.min}" max="${def.max}" step="${def.step}" aria-label="${quickMathName(def)}"></label>`).join('');}
  const reason=manualUnavailableReason();let actionLocked=false,challengeLocked=false;defs.forEach(def=>{const row=wideManualRows.querySelector(`[data-var="${def.id}"]`),source=varEls.find(v=>v.def.id===def.id),locked=isLocked(M.key,def.id),temporary=!!reason||!!(source&&source.inp.disabled&&!locked),disabled=locked||temporary;if(!row)return;row.querySelector('output').textContent=cockpitValue(def,M.V[def.id]);const input=row.querySelector('input');input.value=M.V[def.id];input.disabled=disabled;input.setAttribute('aria-valuenow',M.V[def.id]);input.setAttribute('aria-valuetext',cockpitValue(def,M.V[def.id]));row.classList.toggle('locked',locked);row.classList.toggle('temporarily-locked',temporary);row.title=reason||(locked?'Locked by this challenge.':temporary?'Physics controls are locked during this action.':'');challengeLocked=challengeLocked||locked;actionLocked=actionLocked||temporary;});
  $('#wideManualStatus').textContent=reason||(actionLocked?'Physics controls are locked during this action.':challengeLocked?'Locked rows are fixed by this challenge.':'Changes apply immediately.');}
function syncManualAvailability(){const reason=manualUnavailableReason();controllerManual.disabled=!!reason;controllerManual.title=reason;controllerManual.setAttribute('aria-disabled',String(!!reason));if(reason&&CONTROLLER.mode==='manual')setControllerMode('play',{restore:false,reason});else if(reason)$('#controllerModeStatus').textContent=reason;else if(CONTROLLER.mode==='play')$('#controllerModeStatus').textContent='D-pad controls active.';}
function manualPause(on){if(on)pauseGame('manual-physics');else releasePauseOwner('manual-physics');}
function selectedManualDef(){const defs=manualMathDefs();if(!defs.length)return null;CONTROLLER.sel=((CONTROLLER.sel%defs.length)+defs.length)%defs.length;return defs[CONTROLLER.sel];}
function renderControllerMode(){syncManualAvailability();const manual=CONTROLLER.mode==='manual',defs=manualMathDefs(),def=manual&&selectedManualDef(),canCycle=defs.length>1;controllerPlay.setAttribute('aria-pressed',String(!manual));controllerManual.setAttribute('aria-pressed',String(manual));$('#padL').hidden=manual;manualController.hidden=!manual;$('#manualPrev').disabled=!canCycle;$('#manualNext').disabled=!canCycle;if(!manual||!def)return;const disabled=quickMathDisabled(def),slider=$('#manualVariableSlider');$('#manualVariableName').textContent=quickMathName(def);$('#manualVariableValue').textContent=cockpitValue(def,M.V[def.id]);slider.min=def.min;slider.max=def.max;slider.step=def.step;slider.value=M.V[def.id];slider.setAttribute('aria-label',quickMathName(def));slider.setAttribute('aria-valuemin',def.min);slider.setAttribute('aria-valuemax',def.max);slider.setAttribute('aria-valuenow',M.V[def.id]);slider.disabled=disabled;$('#manualLess').disabled=disabled;$('#manualMore').disabled=disabled;}
function setControllerMode(mode,{restore=true,reason=''}={}){if(mode==='manual'&&manualUnavailableReason()){syncManualAvailability();return;}CONTROLLER.mode=mode;MATH_CONSOLE.sig='';manualPause(mode==='manual');$('#controllerModeStatus').textContent=reason||(mode==='manual'?(PAUSE.why==='manual-physics'?'Manual active · play paused.':'Manual active · adjust before play.'):'D-pad controls active.');renderControllerMode();renderMathConsole();if(restore&&mode==='play')controllerManual.focus();requestAnimationFrame(resize);}
function buildMathConsole(defs){$('#mathConsoleControls').innerHTML=defs.length?defs.map(def=>`<div class="math-console-var" data-var="${def.id}" style="--c:${def.col}"><span class="readout"><b>${quickMathName(def)}</b><output></output></span><button type="button" data-step="-1" aria-label="Less ${quickMathName(def)}">Less</button><button type="button" data-step="1" aria-label="More ${quickMathName(def)}">More</button></div>`).join(''):'<p class="math-console-empty">No live variable controls in this moment. Use More math for the full explanation.</p>';}
function renderMathConsole(q){
  const profileIds=activeVariableProfile().map(d=>d.id).join(','),renderedIds=varEls.map(e=>e.def.id).join(',');if(profileIds!==renderedIds)renderVars();syncManualAvailability();renderWideManual();renderPrototypeManual();const manual=CONTROLLER.mode==='manual',defs=quickMathDefs(),sig=`${manual?'manual':'dpad'}|${M.key}|${activeVariableProfileKey().join(':')}|${defs.map(d=>d.id).join(',')}`;
  if(sig!==MATH_CONSOLE.sig){MATH_CONSOLE.sig=sig;buildMathConsole(defs);}
  const mode=dialMode();$('#mathConsoleHeading').textContent=manual?'Manual selected variable':mode==='quick'?`Quick Tune · ${DP.layer==='shot'?'Shot':'Advanced'}`:'Adjust the math you play';
  defs.forEach(def=>{const row=$(`#mathConsoleControls [data-var="${def.id}"]`);if(!row)return;const disabled=quickMathDisabled(def);row.querySelector('output').textContent=cockpitValue(def,M.V[def.id]);row.querySelectorAll('button').forEach(el=>el.disabled=disabled);});
  $('#mathConsoleValues').innerHTML=defs.map(def=>`<span><b>${quickMathName(def)}</b> ${cockpitValue(def,M.V[def.id])}</span>`).join('')||'<span>No live dials</span>';
  q=q||M.eqs();const live=M.LIVE(),line=q.lines[live&&live.length?live[0]:0]||q.lines[0]||M.hint;
  $('#mathConsoleStatus').textContent=plainMath(line);
  $('#liveMathHudValues').innerHTML=defs.slice(0,1).map(def=>`<span><b>${quickMathName(def)}</b> ${cockpitValue(def,M.V[def.id])}</span>`).join('')||'<span>Live state</span>';
  $('#liveMathHudStatus').textContent=plainMath(line)||M.hint||'Live physics ready.';
}
controllerPlay.addEventListener('click',()=>setControllerMode('play'));
controllerManual.addEventListener('click',()=>setControllerMode('manual'));
function selectManual(delta){CONTROLLER.sel+=delta;MATH_CONSOLE.sig='';renderControllerMode();renderMathConsole();}
$('#manualPrev').addEventListener('click',()=>selectManual(-1));$('#manualNext').addEventListener('click',()=>selectManual(1));
function adjustManual(mult){const def=selectedManualDef();if(def&&adjustVar(def.id,def.step*mult,true)){const q=M.eqs();renderControllerMode();renderMathHud(q);renderMathConsole(q);}}
$('#manualLess').addEventListener('click',()=>adjustManual(-1));$('#manualMore').addEventListener('click',()=>adjustManual(1));
$('#manualVariableSlider').addEventListener('input',e=>{const def=selectedManualDef();if(def&&adjustVar(def.id,+e.target.value-M.V[def.id],true)){const q=M.eqs();renderControllerMode();renderMathHud(q);renderMathConsole(q);}});
wideManualRows.addEventListener('input',e=>{const input=e.target.closest('input[type="range"]'),row=input&&input.closest('[data-var]'),def=row&&wideManualDefs().find(d=>d.id===row.dataset.var);if(!input||!def||input.disabled)return;if(adjustVar(def.id,+input.value-M.V[def.id],false)){const q=M.eqs();renderControllerMode();renderMathHud(q);renderMathConsole(q);}});
function activatePrototypeSlot(button,{focus=true}={}){const row=button&&button.closest('[data-var]'),def=row&&wideManualDefs().find(d=>d.id===row.dataset.var);if(!button||!def||button.getAttribute('aria-disabled')==='true'||PROTOTYPE_MANUAL.cancelled)return false;unlock();const index=+button.dataset.index,value=+button.dataset.value,from=M.V[def.id];PROTOTYPE_MANUAL.expanded=def.id;PROTOTYPE_MANUAL.change={id:def.id,from,to:value};const changed=Math.abs(value-from)>1e-9;if(changed&&!adjustVar(def.id,value-from,false))return false;if(changed)SND.click();const q=M.eqs();renderControllerMode();renderMathHud(q);renderMathConsole(q);if(focus)requestAnimationFrame(()=>prototypePhysicsRows.querySelector(`[data-var="${def.id}"] [data-index="${index}"]`)?.focus());return true;}
prototypePhysicsRows.addEventListener('click',e=>{const collapse=e.target.closest('[data-collapse-slots]');if(collapse){e.stopPropagation();const id=collapse.dataset.collapseSlots;PROTOTYPE_MANUAL.expanded=null;renderPrototypeManual();requestAnimationFrame(()=>prototypePhysicsRows.querySelector(`[data-var="${id}"] .prototype-slot[aria-checked="true"]`)?.focus());return;}const button=e.target.closest('.prototype-slot');if(button){e.stopPropagation();activatePrototypeSlot(button);}});
prototypePhysicsRows.addEventListener('pointerdown',e=>{if(e.target.closest('.prototype-slot'))PROTOTYPE_MANUAL.cancelled=false;});prototypePhysicsRows.addEventListener('pointercancel',e=>{if(e.target.closest('.prototype-slot')){PROTOTYPE_MANUAL.cancelled=true;$('#prototypePhysicsStatus').textContent='Quick value selection cancelled · no change';}});
prototypePhysicsRows.addEventListener('keydown',e=>{const button=e.target.closest('.prototype-slot');if(!button)return;e.stopPropagation();const keys=['ArrowLeft','ArrowRight','Home','End'];if(e.key==='Escape'){e.preventDefault();PROTOTYPE_MANUAL.cancelled=true;$('#prototypePhysicsStatus').textContent='Quick value selection cancelled · no change';return;}if(!keys.includes(e.key))return;e.preventDefault();const buttons=[...button.closest('.prototype-slot-group').querySelectorAll('.prototype-slot')],current=+button.dataset.index,index=e.key==='Home'?0:e.key==='End'?5:clamp(current+(e.key==='ArrowLeft'?-1:1),0,5);PROTOTYPE_MANUAL.cancelled=false;activatePrototypeSlot(buttons[index]);});
prototypePhysics.addEventListener('pointerdown',e=>e.stopPropagation());prototypePhysics.addEventListener('keydown',e=>e.stopPropagation());
$('#controlLeftSlot').addEventListener('pointerdown',e=>e.stopPropagation());$('#controlLeftSlot').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'&&CONTROLLER.mode==='manual'){e.preventDefault();setControllerMode('play');}});
$('#mathConsoleControls').addEventListener('click',e=>{const b=e.target.closest('[data-step]'),row=b&&b.closest('[data-var]');if(!b||!row||b.disabled)return;e.stopPropagation();unlock();const manual=CONTROLLER.mode==='manual',def=quickMathDefs().find(d=>d.id===row.dataset.var);if(def&&adjustVar(def.id,def.step*+b.dataset.step,manual)){SND.click();const q=M.eqs();renderControllerMode();renderMathHud(q);renderMathConsole(q);}});
function renderMathHud(q){
  $('#mathHudTitle').textContent=M.hint||`${M.key} lab`;
}
function challengeSummary(){
  if(M.key==='kick'&&Kick.opt.shot==='dribble'){
    const g=GAMES.find(x=>x.k===curGame()),d=typeof Drib!=='undefined'&&Drib.D?Drib.D():null;
    return{eyebrow:'Current soccer mode',title:g?g.n:'Soccer',detail:d?`Against ${d.name}. ${g?g.d:''}`:(g?g.d:'Keep the ball moving.')};
  }
  const c=curCh(M.key),n=CH[M.key].length,k=best.ch[M.key];
  if(best.play[M.key]!=='ch')return{eyebrow:'Free play',title:'No limits',detail:`${Math.min(k,n)} of ${n} challenges cleared.`};
  if(!c)return{eyebrow:'Ladder complete',title:'Champion',detail:`All ${n} challenges cleared.`};
  return{eyebrow:`Challenge ${k+1} of ${n}`,title:c.name,detail:c.goal};
}
function liveHudState(){if(M===Fight&&Fight.bout)return`You ${Math.ceil(Fight.bout.me)} HP · ${Fight.bout.T.name} ${Math.ceil(Fight.bout.opp)} HP`;if(M===Race)return Race.state==='run'?`${fmt(Race.st.t,1)} s · ${fmt(Race.st.v*3.6,0)} km/h`:`Race · ${Race.state==='count'?'countdown':'ready'}`;if(M===Kick&&typeof MATCH!=='undefined'&&MATCH.on)return`Match ${MATCH.you}–${MATCH.them}`;if(M===Kick&&typeof LIVEM!=='undefined'&&LIVEM.on)return`Live ${LIVEM.you}–${LIVEM.them} · ${LIVEM.clock()}`;if(M===Kick&&Kick.opt.shot==='dribble')return`Kick · ${(GAMES.find(game=>game.k===curGame())||{}).n||'activity'}`;return M===Kick?`Kick · ${Kick.opt.shot==='header'?'Header duel':'Free kick'}`:`${M.key} lab`;}
function railHudState(){if(M===Fight&&Fight.bout)return`${Math.ceil(Fight.bout.me)}–${Math.ceil(Fight.bout.opp)} HP`;if(M===Race)return Race.state==='run'?`${fmt(Race.st.v*3.6,0)} km/h`:Race.state==='count'?'Countdown':'Ready';if(M===Kick&&typeof MATCH!=='undefined'&&MATCH.on)return`${MATCH.you}–${MATCH.them}`;if(M===Kick&&typeof LIVEM!=='undefined'&&LIVEM.on)return`${LIVEM.you}–${LIVEM.them}`;if(M===Kick&&Kick.opt.shot==='dribble')return(GAMES.find(game=>game.k===curGame())||{}).n||'Activity';return M===Kick?(Kick.opt.shot==='header'?'Header':'Free kick'):`${M.key} lab`;}
function renderChallengeHud(){$('#challengeHudSummary').innerHTML=`<span class="mobile-hud-label" aria-hidden="true">Goal</span><b class="hud-summary-cue">${railHudState()}</b>`;}
function playerHudState(){
  if(!M)return{action:'Ready',detail:'Choose a lab to begin'};
  if(M===Race){const action=Race.state==='run'?(Race.brake?'Braking':Race.gas?'Throttle':'Steering'):Race.state==='count'?'Countdown':Race.state==='done'?'Finished':Race.state==='crashed'?'Recovery':'Grid';return{action,detail:`Race · The Rocket · ${action}`};}
  if(M===Kick&&Kick.opt.shot==='dribble'&&typeof Drib!=='undefined'){const s=Drib.state,keeping=s==='keep',action=s==='run'?'Sprint':s==='beat'?'Attack':keeping?'Set & dive':s==='set'?'Set piece':s==='done'?'Round complete':s==='ready'?'Ready':'Live',game=(GAMES.find(item=>item.k===curGame())||{}).n||'Soccer';return{action,detail:`${game} · ${keeping?'Keeper · ':''}${PLY().n} · ${action}`};}
  if(M===Kick){const action=Kick.state==='swing'?'Follow-through':Kick.state==='flight'?'Tracking ball':Kick.state==='incoming'?'Head it':Kick.state==='heading'?'Header':Kick.state==='done'?'Round complete':'Set piece';return{action,detail:`${Kick.opt.shot==='header'?'Header duel':'Free kick'} · ${PLY().n} · ${action}`};}
  const action=Fight.state==='swing'?'Punching':Fight.state==='hold'?'Impact':Fight.state==='recoil'?'Resetting':'Ready';return{action,detail:`Fight · ${action}`};
}
function renderPlayerHud(){const state=playerHudState(),compact=$('#hudProfileState'),current=$('#profileCurrentPlay'),context=$('#profileCurrentContext');if(compact)compact.textContent=state.action;if(current)current.textContent=state.action;if(context)context.textContent=state.detail;}
function renderOrientationHud(){const current=$('#orientationCurrentMode');if(current)current.textContent=MODE_NAMES[M.key]||M.key;}
function renderHistorySummary(){const latest=LOGS[M.key].filter(x=>!x.sep).slice(-1)[0];$('#historyTitle').textContent=latest?latest.title:'Move log ready';$('#historyLatest').textContent=latest?`${fmtT(latest.t)}${latest.res?` · ${latest.res}`:''}${latest.math?` · ${plainMath(latest.math)}`:''}`:{fight:'Your next punch, dodge or block will appear here.',race:'Your next braking or corner event will appear here.',kick:'Your next shot event will appear here.'}[M.key];}
function renderGoalsSummary(){
  const total=Object.values(BADGES).reduce((n,l)=>n+l.length,0),earned=Object.keys(best.badges||{}).length;
  $('#goalsSummary').innerHTML=`<span>Level <b>${lvlOf(best.xp)}</b></span><span>XP <b>${fmt(best.xp||0,0)}</b></span><span>Badges <b>${earned}/${total}</b></span><span>Mode <b>${M.key[0].toUpperCase()+M.key.slice(1)}</b></span>`;
}
function renderCockpit(q){renderControllerMode();renderMathHud(q);renderMathConsole(q);renderChallengeHud();renderPlayerHud();renderOrientationHud();renderGoalsSummary();renderHistorySummary();syncDialsAvailability();}

new ResizeObserver(entries=>{const active=entries[0].contentRect.width>=980;if(active===WIDE_MANUAL.active)return;WIDE_MANUAL.active=active;if(active&&CONTROLLER.mode==='manual')setControllerMode('play',{restore:false});renderWideManual();}).observe($('.control-deck'));

setTimeout(()=>{document.querySelectorAll('.context-detail').forEach(p=>p.hidden=true);},0);
