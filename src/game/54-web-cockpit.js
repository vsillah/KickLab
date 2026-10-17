/* ---------- responsive web cockpit ---------- */
const CONTEXT_DETAILS={open:null,trigger:null,ownsPause:false};
const SETTINGS={level:'categories',category:null,trigger:null,restoreCategory:null};
const MATH_CONSOLE={sig:''},CONTROLLER={mode:'play',sel:0};
const WIDE_MANUAL={active:false,sig:''};
const controllerPlay=$('#controllerModePlay'),controllerManual=$('#controllerModeManual'),manualController=$('#manualController');
const wideManualController=$('#wideManualController'),wideManualRows=$('#wideManualRows');
const settingsDrawer=$('#settingsDrawer'),settingsToggle=$('#settingsToggle');

function contextPanel(name){return $(`#${name==='math'?'physics':name}Detail`);}
function contextTriggers(name){return name==='math'?[$('#physicsDetailsCompact'),$('#physicsDetailsWide')]:[$(`#${name}DetailToggle`)];}
function syncContextTrigger(button,expanded){const action=expanded?'Close':'Open',label=button.dataset.detailLabel||'details',name=`${action} ${label}`;button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',name);button.title=name;}
function closeContextDetail({restore=true}={}){
  if(!CONTEXT_DETAILS.open)return;
  const trigger=CONTEXT_DETAILS.trigger,name=CONTEXT_DETAILS.open;
  contextPanel(name).hidden=true;contextTriggers(name).forEach(b=>syncContextTrigger(b,false));
  CONTEXT_DETAILS.open=null;CONTEXT_DETAILS.trigger=null;
  if(CONTEXT_DETAILS.ownsPause&&PAUSE.why==='context-detail'){PAUSE.why='';resumeGame();}
  CONTEXT_DETAILS.ownsPause=false;
  if(restore&&trigger&&trigger.isConnected&&!trigger.hidden)trigger.focus();
  requestAnimationFrame(resize);
}
function setContextDetail(name,{trigger=null,focus=false,open=true}={}){
  const panel=contextPanel(name);if(!panel)return;
  if(!open){closeContextDetail();return;}
  if(CONTEXT_DETAILS.open===name){closeContextDetail();return;}
  closeContextDetail({restore:false});
  if(!settingsDrawer.hidden)closeSettings({restore:false});
  CONTEXT_DETAILS.open=name;CONTEXT_DETAILS.trigger=trigger||contextTriggers(name).find(b=>b.offsetParent!==null)||contextTriggers(name)[0];
  document.querySelectorAll('.context-detail').forEach(p=>p.hidden=p!==panel);
  ['math','review','goals','learn'].forEach(n=>contextTriggers(n).forEach(b=>syncContextTrigger(b,n===name)));
  panel.hidden=false;
  if(!PAUSE.on){pauseGame('context-detail');CONTEXT_DETAILS.ownsPause=PAUSE.on&&PAUSE.why==='context-detail';}
  if(focus)requestAnimationFrame(()=>panel.querySelector('[data-close-detail]')?.focus());
  panel.scrollIntoView({block:'nearest'});requestAnimationFrame(resize);
}

function setSettingsPause(on){
  if(on)pauseGame('settings');
  else if(PAUSE.why==='settings'){PAUSE.why='';resumeGame();}
  $('#settingsState').textContent=on&&PAUSE.on&&PAUSE.why==='settings'?'Game paused while settings are open.':'Settings open. Changes apply immediately.';
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
  if(CONTEXT_DETAILS.open)closeContextDetail({restore:false});SETTINGS.trigger=trigger;SETTINGS.restoreCategory=trigger&&trigger.dataset?trigger.dataset.category:null;settingsDrawer.hidden=false;settingsToggle.setAttribute('aria-expanded','true');setSettingsPause(true);
  setSettingsLevel(category?'choices':'categories',{category,focus:true});requestAnimationFrame(resize);
}
function closeSettings({restore=true}={}){
  if(settingsDrawer.hidden)return;settingsDrawer.hidden=true;$('#kitroom').hidden=true;settingsToggle.setAttribute('aria-expanded','false');setSettingsPause(false);
  if(restore){const trigger=SETTINGS.trigger&&SETTINGS.trigger.isConnected?SETTINGS.trigger:SETTINGS.restoreCategory!=null?$(`#quickSettings [data-category="${SETTINGS.restoreCategory}"]`):null;(trigger||settingsToggle).focus();}requestAnimationFrame(resize);
}
function showKitSettings(trigger=$('#kitRoomToggle')){SETTINGS.trigger=SETTINGS.trigger||trigger;setSettingsLevel('kit',{category:'kit',focus:true});}
function settingsBack(){if(SETTINGS.level==='kit')setSettingsLevel('choices',{category:'kit'});else if(SETTINGS.level==='choices')setSettingsLevel('categories');}

settingsToggle.addEventListener('click',()=>settingsDrawer.hidden?openSettings(null,settingsToggle):closeSettings());
$('#settingsClose').addEventListener('click',()=>closeSettings());
$('#settingsBack').addEventListener('click',settingsBack);
$('#quickSettings').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;openSettings(b.dataset.category||null,b);});
$('#settingsCategories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;setSettingsLevel('choices',{category:b.dataset.category});});
settingsDrawer.addEventListener('pointerdown',e=>e.stopPropagation());
settingsDrawer.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closeSettings();}});
document.addEventListener('pointerdown',e=>{if(settingsDrawer.hidden||settingsDrawer.contains(e.target)||settingsToggle.contains(e.target)||$('#quickSettings').contains(e.target))return;const focusTarget=e.target.closest&&e.target.closest('button,input,select,textarea,[tabindex]');closeSettings({restore:false});if(!focusTarget)requestAnimationFrame(()=>settingsToggle.focus());});

function bindContextTrigger(button,name){button.addEventListener('click',()=>setContextDetail(name,{trigger:button}));button.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'&&CONTEXT_DETAILS.open){e.preventDefault();closeContextDetail();return;}if(e.key===' '||e.key==='Spacebar'){e.preventDefault();button.click();}});}
contextTriggers('math').forEach(b=>bindContextTrigger(b,'math'));
['review','goals','learn'].forEach(name=>bindContextTrigger(contextTriggers(name)[0],name));
document.querySelectorAll('[data-close-detail]').forEach(b=>b.addEventListener('click',()=>closeContextDetail()));
document.querySelectorAll('.context-detail').forEach(p=>{p.addEventListener('pointerdown',e=>e.stopPropagation());p.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeContextDetail();return;}e.stopPropagation();});});
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
function renderWideManual(){const defs=wideManualDefs(),sig=`${M.key}|${activeVariableProfileKey().join(':')}|${defs.map(d=>d.id).join(',')}`;if(sig!==WIDE_MANUAL.sig){WIDE_MANUAL.sig=sig;wideManualRows.innerHTML=defs.map(def=>`<label class="wide-manual-row" data-var="${def.id}" style="--c:${def.col}"><span><b>${def.sym||quickMathName(def)}</b><small>${quickMathName(def)}</small></span><output></output><input type="range" min="${def.min}" max="${def.max}" step="${def.step}" aria-label="${quickMathName(def)}"></label>`).join('');}
  const reason=manualUnavailableReason();let actionLocked=false,challengeLocked=false;defs.forEach(def=>{const row=wideManualRows.querySelector(`[data-var="${def.id}"]`),source=varEls.find(v=>v.def.id===def.id),locked=isLocked(M.key,def.id),temporary=!!reason||!!(source&&source.inp.disabled&&!locked),disabled=locked||temporary;if(!row)return;row.querySelector('output').textContent=cockpitValue(def,M.V[def.id]);const input=row.querySelector('input');input.value=M.V[def.id];input.disabled=disabled;input.setAttribute('aria-valuenow',M.V[def.id]);input.setAttribute('aria-valuetext',cockpitValue(def,M.V[def.id]));row.classList.toggle('locked',locked);row.classList.toggle('temporarily-locked',temporary);row.title=reason||(locked?'Locked by this challenge.':temporary?'Physics controls are locked during this action.':'');challengeLocked=challengeLocked||locked;actionLocked=actionLocked||temporary;});
  $('#wideManualStatus').textContent=reason||(actionLocked?'Physics controls are locked during this action.':challengeLocked?'Locked rows are fixed by this challenge.':'Changes apply immediately.');}
function syncManualAvailability(){const reason=manualUnavailableReason();controllerManual.disabled=!!reason;controllerManual.title=reason;controllerManual.setAttribute('aria-disabled',String(!!reason));if(reason&&CONTROLLER.mode==='manual')setControllerMode('play',{restore:false,reason});else if(reason)$('#controllerModeStatus').textContent=reason;else if(CONTROLLER.mode==='play')$('#controllerModeStatus').textContent='D-pad controls active.';}
function manualPause(on){if(on)pauseGame('manual-physics');else if(PAUSE.why==='manual-physics'){PAUSE.why='';resumeGame();}}
function selectedManualDef(){const defs=manualMathDefs();if(!defs.length)return null;CONTROLLER.sel=((CONTROLLER.sel%defs.length)+defs.length)%defs.length;return defs[CONTROLLER.sel];}
function renderControllerMode(){syncManualAvailability();const manual=CONTROLLER.mode==='manual',defs=manualMathDefs(),def=manual&&selectedManualDef(),canCycle=defs.length>1;controllerPlay.setAttribute('aria-pressed',String(!manual));controllerManual.setAttribute('aria-pressed',String(manual));$('#padL').hidden=manual;manualController.hidden=!manual;$('#manualPrev').disabled=!canCycle;$('#manualNext').disabled=!canCycle;if(!manual||!def)return;const disabled=quickMathDisabled(def),slider=$('#manualVariableSlider');$('#manualVariableName').textContent=quickMathName(def);$('#manualVariableValue').textContent=cockpitValue(def,M.V[def.id]);slider.min=def.min;slider.max=def.max;slider.step=def.step;slider.value=M.V[def.id];slider.setAttribute('aria-label',quickMathName(def));slider.setAttribute('aria-valuemin',def.min);slider.setAttribute('aria-valuemax',def.max);slider.setAttribute('aria-valuenow',M.V[def.id]);slider.disabled=disabled;$('#manualLess').disabled=disabled;$('#manualMore').disabled=disabled;}
function setControllerMode(mode,{restore=true,reason=''}={}){if(mode==='manual'&&manualUnavailableReason()){syncManualAvailability();return;}CONTROLLER.mode=mode;MATH_CONSOLE.sig='';manualPause(mode==='manual');$('#controllerModeStatus').textContent=reason||(mode==='manual'?(PAUSE.why==='manual-physics'?'Manual active · play paused.':'Manual active · adjust before play.'):'D-pad controls active.');renderControllerMode();renderMathConsole();if(restore&&mode==='play')controllerManual.focus();requestAnimationFrame(resize);}
function buildMathConsole(defs){$('#mathConsoleControls').innerHTML=defs.length?defs.map(def=>`<div class="math-console-var" data-var="${def.id}" style="--c:${def.col}"><span class="readout"><b>${quickMathName(def)}</b><output></output></span><button type="button" data-step="-1" aria-label="Less ${quickMathName(def)}">Less</button><button type="button" data-step="1" aria-label="More ${quickMathName(def)}">More</button></div>`).join(''):'<p class="math-console-empty">No live variable controls in this moment. Use More math for the full explanation.</p>';}
function renderMathConsole(q){
  const profileIds=activeVariableProfile().map(d=>d.id).join(','),renderedIds=varEls.map(e=>e.def.id).join(',');if(profileIds!==renderedIds)renderVars();syncManualAvailability();renderWideManual();const manual=CONTROLLER.mode==='manual',defs=quickMathDefs(),sig=`${manual?'manual':'dpad'}|${M.key}|${activeVariableProfileKey().join(':')}|${defs.map(d=>d.id).join(',')}`;
  if(sig!==MATH_CONSOLE.sig){MATH_CONSOLE.sig=sig;buildMathConsole(defs);}
  const mode=dialMode();$('#mathConsoleHeading').textContent=manual?'Manual selected variable':mode==='quick'?`Quick Tune · ${DP.layer==='shot'?'Shot':'Advanced'}`:'Adjust the math you play';
  defs.forEach(def=>{const row=$(`#mathConsoleControls [data-var="${def.id}"]`);if(!row)return;const disabled=quickMathDisabled(def);row.querySelector('output').textContent=cockpitValue(def,M.V[def.id]);row.querySelectorAll('button').forEach(el=>el.disabled=disabled);});
  $('#mathConsoleValues').innerHTML=defs.map(def=>`<span><b>${quickMathName(def)}</b> ${cockpitValue(def,M.V[def.id])}</span>`).join('')||'<span>No live dials</span>';
  q=q||M.eqs();const live=M.LIVE(),line=q.lines[live&&live.length?live[0]:0]||q.lines[0]||M.hint;
  $('#mathConsoleStatus').textContent=plainMath(line);
}
controllerPlay.addEventListener('click',()=>setControllerMode('play'));
controllerManual.addEventListener('click',()=>setControllerMode('manual'));
function selectManual(delta){CONTROLLER.sel+=delta;MATH_CONSOLE.sig='';renderControllerMode();renderMathConsole();}
$('#manualPrev').addEventListener('click',()=>selectManual(-1));$('#manualNext').addEventListener('click',()=>selectManual(1));
function adjustManual(mult){const def=selectedManualDef();if(def&&adjustVar(def.id,def.step*mult,true)){const q=M.eqs();renderControllerMode();renderMathHud(q);renderMathConsole(q);}}
$('#manualLess').addEventListener('click',()=>adjustManual(-1));$('#manualMore').addEventListener('click',()=>adjustManual(1));
$('#manualVariableSlider').addEventListener('input',e=>{const def=selectedManualDef();if(def&&adjustVar(def.id,+e.target.value-M.V[def.id],true)){const q=M.eqs();renderControllerMode();renderMathHud(q);renderMathConsole(q);}});
wideManualRows.addEventListener('input',e=>{const input=e.target.closest('input[type="range"]'),row=input&&input.closest('[data-var]'),def=row&&wideManualDefs().find(d=>d.id===row.dataset.var);if(!input||!def||input.disabled)return;if(adjustVar(def.id,+input.value-M.V[def.id],false)){const q=M.eqs();renderControllerMode();renderMathHud(q);renderMathConsole(q);}});
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
function renderChallengeHud(){const x=challengeSummary();$('#challengeHudSummary').innerHTML=`<span class="eyebrow">${x.eyebrow}</span><b>${x.title}</b><p>${x.detail}</p>`;}
function renderHistorySummary(){const latest=LOGS[M.key].filter(x=>!x.sep).slice(-1)[0];$('#historyTitle').textContent=latest?latest.title:'Move log ready';$('#historyLatest').textContent=latest?`${fmtT(latest.t)}${latest.res?` · ${latest.res}`:''}${latest.math?` · ${plainMath(latest.math)}`:''}`:{fight:'Your next punch, dodge or block will appear here.',race:'Your next braking or corner event will appear here.',kick:'Your next shot event will appear here.'}[M.key];}
function renderGoalsSummary(){
  const total=Object.values(BADGES).reduce((n,l)=>n+l.length,0),earned=Object.keys(best.badges||{}).length;
  $('#goalsSummary').innerHTML=`<span>Level <b>${lvlOf(best.xp)}</b></span><span>XP <b>${fmt(best.xp||0,0)}</b></span><span>Badges <b>${earned}/${total}</b></span><span>Mode <b>${M.key[0].toUpperCase()+M.key.slice(1)}</b></span>`;
}
function renderCockpit(q){renderControllerMode();renderMathHud(q);renderMathConsole(q);renderChallengeHud();renderGoalsSummary();renderHistorySummary();syncDialsAvailability();}

new ResizeObserver(entries=>{const active=entries[0].contentRect.width>=980;if(active===WIDE_MANUAL.active)return;WIDE_MANUAL.active=active;if(active&&CONTROLLER.mode==='manual')setControllerMode('play',{restore:false});renderWideManual();}).observe($('.control-deck'));

setTimeout(()=>{document.querySelectorAll('.context-detail').forEach(p=>p.hidden=true);},0);
