/* ---------- responsive web cockpit ---------- */
const INSPECTOR={pane:'math',trigger:null,mq:window.matchMedia('(max-width:980px)')};
const inspector=$('#inspector');
const desktopInspectorHost=$('#game-cockpit'),utilitySlot=$('#utilitySlot');
const MATH_CONSOLE={open:false,sig:''};
const mathConsole=$('#mathConsole'),mathConsolePanel=$('#mathConsolePanel'),mathConsolePull=$('#mathConsolePull');

function inspectorNeedsPause(name){return name==='setup'||name==='math';}
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
  setInspectorPause(inspector.classList.contains('open')&&(INSPECTOR.mq.matches?inspectorNeedsPause(name):name==='setup'));
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
  else{if(inspector.parentElement!==desktopInspectorHost)desktopInspectorHost.appendChild(inspector);inspector.classList.add('open');setInspectorPause(INSPECTOR.pane==='setup');}
  requestAnimationFrame(resize);
}

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
  if(INSPECTOR.mq.matches||!e.target.closest('[data-pane="setup"],[data-pane="math"]'))return;
  if(e.target.closest('button,input'))setInspectorPause(true);
});
inspector.addEventListener('focusin',e=>{
  if(INSPECTOR.mq.matches||!e.target.closest('[data-pane="setup"],[data-pane="math"]'))return;
  if(e.target.matches('button,input'))setInspectorPause(true);
});
inspector.addEventListener('focusout',()=>{
  if(INSPECTOR.mq.matches)return;
  requestAnimationFrame(()=>{if(!inspector.contains(document.activeElement))setInspectorPause(INSPECTOR.pane==='setup');});
});
try{INSPECTOR.mq.addEventListener('change',syncInspectorLayout);}catch(e){INSPECTOR.mq.addListener&&INSPECTOR.mq.addListener(syncInspectorLayout);}

function cockpitValue(def,value){
  const n=fmt(value,def.d==null?1:def.d),u=def.unit||'';
  return`${n}${u?(u==='°'?'°':' '+u):''}`;
}
function quickMathName(def){const names={m:'Mass',dt:'Padding',A:'Contact',mu:'Grip',R:'Radius',F:'Engine',v:'Speed',th:'Angle',thH:'Direction',g:'Gravity',spin:'Spin',jv:'Jump',run:'Run speed',grip:'Boot grip',curl:'Curve',vs:'Shot speed',pv:'Pass speed'};return names[def.id]||def.name;}
function quickMathDefs(){const defs=M.vars().filter(d=>!isLocked(M.key,d.id));if(!defs.length)return[];const mode=dialMode();if(mode==='select'){const i=((DP.sel%defs.length)+defs.length)%defs.length;return[defs[i]];}if(mode==='bound'){const ids=[...new Set(M.actions().filter(a=>a.step).map(a=>a.step[0]))],bound=ids.map(id=>defs.find(d=>d.id===id)).filter(Boolean);if(bound.length)return bound.slice(0,4);}const ids=defs.map(d=>d.id),order=M.key==='fight'?['m','dt','A']:M.key==='race'?['mu','R','F','m']:ids.includes('th')?['th','v','spin','g']:ids.includes('thH')?['thH','jv','g']:ids.includes('run')?['run','grip','curl','vs']:ids;return [...new Set([...order,...ids])].map(id=>defs.find(d=>d.id===id)).filter(Boolean).slice(0,4);}
function plainMath(html){return String(html||'').replace(/<[^>]*>/g,' ').replace(/&(?:emsp|ensp|nbsp);/g,' ').replace(/&minus;|−/g,'-').replace(/&times;|×|·/g,' x ').replace(/&divide;|÷/g,' / ').replace(/&amp;/g,' and ').replace(/&lt;/g,' less than ').replace(/&gt;/g,' greater than ').replace(/θ/g,'Angle').replace(/μ/g,'Grip').replace(/ρ/g,'Density').replace(/δ/g,'Steering').replace(/Δt/g,'Padding time').replace(/R_turn/g,'Turn radius').replace(/\bvx\b/g,'horizontal speed').replace(/\bvy\b/g,'vertical speed').replace(/≤/g,' at most ').replace(/≥/g,' at least ').replace(/→/g,' gives ').replace(/½/g,'0.5 x ').replace(/²/g,' squared').replace(/_eff/g,' effective').replace(/x\s+x/g,'x').replace(/\s+/g,' ').trim();}
function quickMathDisabled(def){const row=varEls.find(v=>v.def.id===def.id);return!!(row&&row.inp.disabled)||RP.on||CINE.on||resOpen();}
function buildMathConsole(defs){$('#mathConsoleControls').innerHTML=defs.length?defs.map(def=>`<div class="math-console-var" data-var="${def.id}" style="--c:${def.col}"><span class="readout"><b>${quickMathName(def)}</b><output></output></span><button type="button" data-step="-1" aria-label="Less ${quickMathName(def)}">Less</button><button type="button" data-step="1" aria-label="More ${quickMathName(def)}">More</button></div>`).join(''):'<p class="math-console-empty">No live variable controls in this moment. Use More math for the full explanation.</p>';}
function renderMathConsole(q){
  const defs=quickMathDefs(),sig=`${M.key}|${Kick.opt.shot}|${Kick.opt.pso}|${defs.map(d=>d.id).join(',')}`;
  if(sig!==MATH_CONSOLE.sig){MATH_CONSOLE.sig=sig;buildMathConsole(defs);}
  const mode=dialMode();$('#mathConsoleHeading').textContent=mode==='select'?'D-pad selected variable':mode==='bound'?'D-pad quick variables':'Adjust the math you play';
  defs.forEach(def=>{const row=$(`#mathConsoleControls [data-var="${def.id}"]`);if(!row)return;row.querySelector('output').textContent=cockpitValue(def,M.V[def.id]);row.querySelectorAll('button').forEach(b=>b.disabled=quickMathDisabled(def));});
  $('#mathConsoleValues').innerHTML=defs.map(def=>`<span><b>${quickMathName(def)}</b> ${cockpitValue(def,M.V[def.id])}</span>`).join('')||'<span>No live dials</span>';
  q=q||M.eqs();const live=M.LIVE(),line=q.lines[live&&live.length?live[0]:0]||q.lines[0]||M.hint;
  $('#mathConsoleStatus').textContent=plainMath(line);
}
function openMathConsole(){MATH_CONSOLE.open=true;mathConsolePanel.hidden=false;mathConsolePull.setAttribute('aria-expanded','true');$('#mathConsoleState').textContent='Close';mathConsole.classList.add('open');requestAnimationFrame(resize);}
function closeMathConsole({restore=true}={}){MATH_CONSOLE.open=false;mathConsolePanel.hidden=true;mathConsolePull.setAttribute('aria-expanded','false');$('#mathConsoleState').textContent='Open';mathConsole.classList.remove('open');if(restore)mathConsolePull.focus();requestAnimationFrame(resize);}
mathConsolePull.addEventListener('click',()=>MATH_CONSOLE.open?closeMathConsole():openMathConsole());
$('#mathConsoleClose').addEventListener('click',()=>closeMathConsole());
$('#mathConsoleMore').addEventListener('click',()=>{closeMathConsole({restore:false});INSPECTOR.trigger=$('#ins-tab-math');setInspectorPane('math',{focus:true,open:true});inspector.scrollIntoView({block:'nearest'});});
$('#mathConsoleControls').addEventListener('click',e=>{const b=e.target.closest('[data-step]'),row=b&&b.closest('[data-var]');if(!b||!row||b.disabled)return;e.stopPropagation();unlock();const def=quickMathDefs().find(d=>d.id===row.dataset.var);if(def&&adjustVar(def.id,def.step*+b.dataset.step)){SND.click();const q=M.eqs();renderMathHud(q);renderMathConsole(q);}});
mathConsole.addEventListener('pointerdown',e=>e.stopPropagation());
mathConsole.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'&&MATH_CONSOLE.open){e.preventDefault();closeMathConsole();}});
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
