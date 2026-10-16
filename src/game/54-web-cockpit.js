/* ---------- responsive web cockpit ---------- */
const INSPECTOR={pane:'math',trigger:null,mq:window.matchMedia('(max-width:980px)')};
const SETTINGS={level:'categories',category:null,trigger:null,restoreCategory:null};
const inspector=$('#inspector');
const desktopInspectorHost=$('#game-cockpit'),utilitySlot=$('#utilitySlot');
const MATH_CONSOLE={open:false,sig:'',mode:'dpad',trigger:null};
const mathConsole=$('#mathConsole'),mathConsolePanel=$('#mathConsolePanel'),mathConsolePull=$('#mathConsolePull');
const physicsModeSwitch=$('#physicsModeSwitch');
const settingsDrawer=$('#settingsDrawer'),settingsToggle=$('#settingsToggle');

function inspectorNeedsPause(name){return name==='math';}
function setInspectorPause(on){
  const state=$('#inspectorState');
  if(on){
    pauseGame('inspector');
    state.hidden=false;
  }else{
    state.hidden=true;
    if(PAUSE.why==='inspector'){PAUSE.why='';resumeGame();}
  }
}
function setInspectorPane(name,{focus=false,open=true}={}){
  const tab=$(`#ins-tab-${name}`),pane=$(`#ins-pane-${name}`);
  if(!tab||!pane)return;
  INSPECTOR.pane=name;
  inspector.querySelectorAll('[role="tab"]').forEach(b=>{
    const on=b===tab;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;
  });
  inspector.querySelectorAll('.inspector-pane').forEach(p=>p.hidden=p!==pane);
  if(open)inspector.classList.add('open');
  setInspectorPause(inspector.classList.contains('open')&&INSPECTOR.mq.matches&&inspectorNeedsPause(name));
  if(focus)tab.focus();
  requestAnimationFrame(resize);
}
function closeInspector({restore=true}={}){
  if(!INSPECTOR.mq.matches)return;
  inspector.classList.remove('open');
  setInspectorPause(false);
  if(restore&&(INSPECTOR.trigger||$(`#ins-tab-${INSPECTOR.pane}`)))
    (INSPECTOR.trigger||$(`#ins-tab-${INSPECTOR.pane}`)).focus();
  requestAnimationFrame(resize);
}
function syncInspectorLayout(){
  if(INSPECTOR.mq.matches){if(inspector.parentElement!==utilitySlot)utilitySlot.appendChild(inspector);inspector.classList.remove('open');setInspectorPause(false);}
  else{if(inspector.parentElement!==desktopInspectorHost)desktopInspectorHost.appendChild(inspector);inspector.classList.add('open');setInspectorPause(false);}
  requestAnimationFrame(resize);
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
  SETTINGS.trigger=trigger;SETTINGS.restoreCategory=trigger&&trigger.dataset?trigger.dataset.category:null;settingsDrawer.hidden=false;settingsToggle.setAttribute('aria-expanded','true');setSettingsPause(true);
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

inspector.querySelectorAll('[role="tab"]').forEach(tab=>{
  tab.addEventListener('click',()=>{INSPECTOR.trigger=tab;setInspectorPane(tab.dataset.pane,{open:true});});
  tab.addEventListener('keydown',e=>{
    const tabs=[...inspector.querySelectorAll('[role="tab"]')],i=tabs.indexOf(tab);
    const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:-1;
    if(next<0)return;e.preventDefault();INSPECTOR.trigger=tabs[next];setInspectorPane(tabs[next].dataset.pane,{focus:true,open:true});
  });
});
$('#inspectorClose').addEventListener('click',()=>closeInspector());
inspector.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'&&INSPECTOR.mq.matches&&inspector.classList.contains('open')){e.preventDefault();closeInspector();}});
inspector.addEventListener('pointerdown',e=>{
  if(INSPECTOR.mq.matches||!e.target.closest('[data-pane="math"]'))return;
  if(e.target.closest('button,input'))setInspectorPause(true);
});
inspector.addEventListener('focusin',e=>{
  if(INSPECTOR.mq.matches||!e.target.closest('[data-pane="math"]'))return;
  if(e.target.matches('button,input'))setInspectorPause(true);
});
inspector.addEventListener('focusout',()=>{
  if(INSPECTOR.mq.matches)return;
  requestAnimationFrame(()=>{if(!inspector.contains(document.activeElement))setInspectorPause(false);});
});
try{INSPECTOR.mq.addEventListener('change',syncInspectorLayout);}catch(e){INSPECTOR.mq.addListener&&INSPECTOR.mq.addListener(syncInspectorLayout);}

function cockpitValue(def,value){
  const n=fmt(value,def.d==null?1:def.d),u=def.unit||'';
  return`${n}${u?(u==='°'?'°':' '+u):''}`;
}
function quickMathName(def){const names={m:'Mass',dt:'Padding',A:'Contact',mu:'Grip',R:'Radius',F:'Engine',v:'Speed',th:'Angle',thH:'Direction',g:'Gravity',spin:'Spin',jv:'Jump',run:'Run speed',grip:'Boot grip',curl:'Curve',vs:'Shot speed',pv:'Pass speed'};return names[def.id]||def.name;}
function quickMathDefs(){const defs=M.vars().filter(d=>!isLocked(M.key,d.id));if(!defs.length)return[];const mode=dialMode();if(mode==='select'){const i=((DP.sel%defs.length)+defs.length)%defs.length;return[defs[i]];}if(mode==='bound'){const ids=[...new Set(M.actions().filter(a=>a.step).map(a=>a.step[0]))],bound=ids.map(id=>defs.find(d=>d.id===id)).filter(Boolean);if(bound.length)return bound.slice(0,4);}const ids=defs.map(d=>d.id),order=M.key==='fight'?['m','dt','A']:M.key==='race'?['mu','R','F','m']:ids.includes('th')?['th','v','spin','g']:ids.includes('thH')?['thH','jv','g']:ids.includes('run')?['run','grip','curl','vs']:ids;return [...new Set([...order,...ids])].map(id=>defs.find(d=>d.id===id)).filter(Boolean).slice(0,4);}
function manualMathDefs(){return M.vars().filter(d=>!isLocked(M.key,d.id));}
function plainMath(html){return String(html||'').replace(/<[^>]*>/g,' ').replace(/&(?:emsp|ensp|nbsp);/g,' ').replace(/&minus;|−/g,'-').replace(/&times;|×|·/g,' x ').replace(/&divide;|÷/g,' / ').replace(/&amp;/g,' and ').replace(/&lt;/g,' less than ').replace(/&gt;/g,' greater than ').replace(/θ/g,'Angle').replace(/μ/g,'Grip').replace(/ρ/g,'Density').replace(/δ/g,'Steering').replace(/Δt/g,'Padding time').replace(/R_turn/g,'Turn radius').replace(/\bvx\b/g,'horizontal speed').replace(/\bvy\b/g,'vertical speed').replace(/≤/g,' at most ').replace(/≥/g,' at least ').replace(/→/g,' gives ').replace(/½/g,'0.5 x ').replace(/²/g,' squared').replace(/_eff/g,' effective').replace(/x\s+x/g,'x').replace(/\s+/g,' ').trim();}
function quickMathDisabled(def){const row=varEls.find(v=>v.def.id===def.id);return(MATH_CONSOLE.mode!=='manual'&&!!(row&&row.inp.disabled))||RP.on||CINE.on||resOpen();}
function manualUnavailableReason(){if(RP.on)return'Manual Physics is unavailable during replay.';if(CINE.on)return'Manual Physics is unavailable during the replay sequence.';if(!$('#rvBack').hidden)return'Close Coach review before using Manual Physics.';if(!$('#lvlup').hidden)return'Finish the level-up moment before using Manual Physics.';if(resOpen())return'Manual Physics is unavailable while results are open. Choose Next round first.';return'';}
function syncManualAvailability(){const reason=manualUnavailableReason();physicsModeSwitch.disabled=!!reason;physicsModeSwitch.title=reason;physicsModeSwitch.setAttribute('aria-disabled',String(!!reason));if(reason&&MATH_CONSOLE.mode==='manual')setManualPhysics(false,{restore:false,reason});else if(reason)$('#physicsModeStatus').textContent=reason;else if(MATH_CONSOLE.mode==='dpad')$('#physicsModeStatus').textContent='D-pad controls choose the live math.';}
function manualPause(on){if(on)pauseGame('manual-physics');else if(PAUSE.why==='manual-physics'){PAUSE.why='';resumeGame();}}
function setManualPhysics(on,{restore=true,reason=''}={}){if(on&&manualUnavailableReason()){syncManualAvailability();return;}MATH_CONSOLE.mode=on?'manual':'dpad';MATH_CONSOLE.sig='';physicsModeSwitch.setAttribute('aria-checked',String(on));physicsModeSwitch.querySelector('b').textContent=on?'Manual Physics':'D-pad Math';physicsModeSwitch.querySelector('small').textContent=on?'D-pad Math off':'Manual Physics off';manualPause(on);$('#physicsModeStatus').textContent=reason||(on?(PAUSE.why==='manual-physics'?'Manual Physics open. Active play paused.':'Manual Physics open. Changes apply before play.'):'D-pad controls choose the live math.');if(on){renderMathConsole();openMathConsole();}else{closeMathConsole({restore:false});renderMathConsole();if(restore)physicsModeSwitch.focus();}}
function buildMathConsole(defs){const manual=MATH_CONSOLE.mode==='manual';$('#mathConsoleControls').innerHTML=defs.length?defs.map(def=>{const name=quickMathName(def),presets=manual&&def.pre&&def.pre.length?`<select data-preset aria-label="${name} presets"><option value="">${name} presets</option>${def.pre.map(([v,l])=>`<option value="${v}">${l} · ${cockpitValue(def,v)}</option>`).join('')}</select>`:'';return`<div class="math-console-var${manual?' manual':''}" data-var="${def.id}" style="--c:${def.col}"><span class="readout"><b>${name}</b><output></output></span><button type="button" data-step="-1" aria-label="Less ${name}">Less</button><button type="button" data-step="1" aria-label="More ${name}">More</button>${manual?`<input type="range" min="${def.min}" max="${def.max}" step="${def.step}" value="${M.V[def.id]}" aria-label="${name}" aria-valuemin="${def.min}" aria-valuemax="${def.max}" aria-valuenow="${M.V[def.id]}">`:''}${presets}</div>`;}).join(''):'<p class="math-console-empty">No live variable controls in this moment. Use More math for the full explanation.</p>';}
function renderMathConsole(q){
  syncManualAvailability();const manual=MATH_CONSOLE.mode==='manual',defs=manual?manualMathDefs():quickMathDefs(),sig=`${manual?'manual':'dpad'}|${M.key}|${Kick.opt.shot}|${Kick.opt.pso}|${defs.map(d=>d.id).join(',')}`;
  if(sig!==MATH_CONSOLE.sig){MATH_CONSOLE.sig=sig;buildMathConsole(defs);}
  const mode=dialMode();$('#mathConsoleHeading').textContent=manual?`${M.key[0].toUpperCase()+M.key.slice(1)} Manual Physics`:mode==='select'?'D-pad selected variable':mode==='bound'?'D-pad quick variables':'Adjust the math you play';$('#mathConsolePauseState').textContent=manual?(PAUSE.why==='manual-physics'?'Active play paused by this panel.':'Changes apply before active play.') :'';
  defs.forEach(def=>{const row=$(`#mathConsoleControls [data-var="${def.id}"]`);if(!row)return;const disabled=quickMathDisabled(def);row.querySelector('output').textContent=cockpitValue(def,M.V[def.id]);row.querySelectorAll('button,input,select').forEach(el=>el.disabled=disabled);const range=row.querySelector('input[type="range"]');if(range){range.value=M.V[def.id];range.setAttribute('aria-valuenow',String(M.V[def.id]));}});
  $('#mathConsoleValues').innerHTML=defs.map(def=>`<span><b>${quickMathName(def)}</b> ${cockpitValue(def,M.V[def.id])}</span>`).join('')||'<span>No live dials</span>';
  q=q||M.eqs();const live=M.LIVE(),line=q.lines[live&&live.length?live[0]:0]||q.lines[0]||M.hint;
  $('#mathConsoleStatus').textContent=plainMath(line);
}
function openMathConsole(){MATH_CONSOLE.open=true;mathConsolePanel.hidden=false;mathConsolePull.setAttribute('aria-expanded','true');$('#mathConsoleState').textContent=MATH_CONSOLE.mode==='manual'?'Manual on':'Close';mathConsole.classList.add('open');requestAnimationFrame(resize);}
function closeMathConsole({restore=true}={}){MATH_CONSOLE.open=false;mathConsolePanel.hidden=true;mathConsolePull.setAttribute('aria-expanded','false');$('#mathConsoleState').textContent='Open';mathConsole.classList.remove('open');if(restore)mathConsolePull.focus();requestAnimationFrame(resize);}
physicsModeSwitch.addEventListener('click',()=>setManualPhysics(MATH_CONSOLE.mode!=='manual'));
mathConsolePull.addEventListener('click',()=>MATH_CONSOLE.open?(MATH_CONSOLE.mode==='manual'?setManualPhysics(false):closeMathConsole()):openMathConsole());
$('#mathConsoleClose').addEventListener('click',()=>MATH_CONSOLE.mode==='manual'?setManualPhysics(false):closeMathConsole());
$('#mathConsoleMore').addEventListener('click',()=>{if(MATH_CONSOLE.mode==='manual')setManualPhysics(false,{restore:false});else closeMathConsole({restore:false});INSPECTOR.trigger=$('#ins-tab-math');setInspectorPane('math',{focus:true,open:true});inspector.scrollIntoView({block:'nearest'});});
$('#mathConsoleControls').addEventListener('click',e=>{const b=e.target.closest('[data-step]'),row=b&&b.closest('[data-var]');if(!b||!row||b.disabled)return;e.stopPropagation();unlock();const manual=MATH_CONSOLE.mode==='manual',def=(manual?manualMathDefs():quickMathDefs()).find(d=>d.id===row.dataset.var);if(def&&adjustVar(def.id,def.step*+b.dataset.step,manual)){SND.click();const q=M.eqs();renderMathHud(q);renderMathConsole(q);}});
$('#mathConsoleControls').addEventListener('input',e=>{const range=e.target.closest('input[type="range"]'),row=range&&range.closest('[data-var]');if(!range||!row||range.disabled||MATH_CONSOLE.mode!=='manual')return;e.stopPropagation();const def=manualMathDefs().find(d=>d.id===row.dataset.var);if(def&&adjustVar(def.id,+range.value-M.V[def.id],true)){const q=M.eqs();renderMathHud(q);renderMathConsole(q);}});
$('#mathConsoleControls').addEventListener('change',e=>{const select=e.target.closest('select[data-preset]'),row=select&&select.closest('[data-var]');if(!select||!row||select.disabled||select.value==='')return;e.stopPropagation();const def=manualMathDefs().find(d=>d.id===row.dataset.var);if(def&&adjustVar(def.id,+select.value-M.V[def.id],true)){const q=M.eqs();renderMathHud(q);renderMathConsole(q);}select.value='';});
mathConsole.addEventListener('pointerdown',e=>e.stopPropagation());
mathConsole.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'&&MATH_CONSOLE.open){e.preventDefault();MATH_CONSOLE.mode==='manual'?setManualPhysics(false):closeMathConsole();}});
mathConsole.addEventListener('focusin',()=>mathConsole.classList.add('has-focus'));
mathConsole.addEventListener('focusout',()=>requestAnimationFrame(()=>{if(!mathConsole.contains(document.activeElement))mathConsole.classList.remove('has-focus');}));
function cockpitValues(){
  const defs=M.vars().map(d=>({label:d.name,sym:d.sym,value:cockpitValue(d,M.V[d.id]),col:d.col}));
  const add=(label,sym,value,unit='',d=1,col=C.muted)=>{
    if(defs.length>=5||defs.some(x=>x.label===label))return;
    defs.push({label,sym,value:`${fmt(value,d)}${unit?(unit==='°'?'°':' '+unit):''}`,col});
  };
  if(M.key==='kick'){
    add('gravity','g',G0,'m/s²',2,C.xray);
    if(typeof AIR!=='undefined')add('air density','ρ',AIR.rho,'kg/m³',3,C.violet);
    if(typeof temp==='function')add('temperature','T',temp().c,'°C',0,C.hot);
    if(typeof ballM==='function')add('ball mass','m_ball',ballM(),'kg',2,C.good);
  }
  add('level','LVL',lvlOf(best.xp),'',0,C.good);
  return defs.slice(0,5);
}
function renderMathHud(q){
  q=q||M.eqs();
  const live=M.LIVE(),line=q.lines[live&&live.length?live[0]:0]||q.lines[0]||'';
  $('#mathHudTitle').textContent=M.hint||`${M.key} lab`;
  $('#mathHudEquation').innerHTML=line;
  $('#mathHudValues').innerHTML=cockpitValues().map(v=>`<div title="${v.label}"><dt style="color:${v.col}">${v.sym}</dt><dd>${v.value}</dd></div>`).join('');
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
function renderChallengeHud(){const x=challengeSummary();$('#challengeHud').innerHTML=`<span class="eyebrow">${x.eyebrow}</span><b>${x.title}</b><p>${x.detail}</p>`;}
function renderGoalsSummary(){
  const total=Object.values(BADGES).reduce((n,l)=>n+l.length,0),earned=Object.keys(best.badges||{}).length;
  $('#goalsSummary').innerHTML=`<span>Level <b>${lvlOf(best.xp)}</b></span><span>XP <b>${fmt(best.xp||0,0)}</b></span><span>Badges <b>${earned}/${total}</b></span><span>Mode <b>${M.key[0].toUpperCase()+M.key.slice(1)}</b></span>`;
}
function renderCockpit(q){renderMathHud(q);renderMathConsole(q);renderChallengeHud();renderGoalsSummary();syncDialsAvailability();}

setTimeout(()=>{setInspectorPane('math',{open:!INSPECTOR.mq.matches});syncInspectorLayout();},0);
