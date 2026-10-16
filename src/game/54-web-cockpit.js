/* ---------- responsive web cockpit ---------- */
const INSPECTOR={pane:'math',trigger:null,mq:window.matchMedia('(max-width:980px)')};
const inspector=$('#inspector');

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
  if(INSPECTOR.mq.matches)setInspectorPause(inspector.classList.contains('open')&&inspectorNeedsPause(name));
  else setInspectorPause(false);
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
  if(INSPECTOR.mq.matches){inspector.classList.remove('open');setInspectorPause(false);}
  else{inspector.classList.add('open');setInspectorPause(false);}
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
inspector.addEventListener('keydown',e=>{if(e.key==='Escape'&&INSPECTOR.mq.matches&&inspector.classList.contains('open')){e.preventDefault();closeInspector();}});
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
  requestAnimationFrame(()=>{if(!inspector.contains(document.activeElement))setInspectorPause(false);});
});
try{INSPECTOR.mq.addEventListener('change',syncInspectorLayout);}catch(e){INSPECTOR.mq.addListener&&INSPECTOR.mq.addListener(syncInspectorLayout);}

function cockpitValue(def,value){
  const n=fmt(value,def.d==null?1:def.d),u=def.unit||'';
  return`${n}${u?(u==='°'?'°':' '+u):''}`;
}
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
function renderCockpit(q){renderMathHud(q);renderChallengeHud();renderGoalsSummary();syncDialsAvailability();}

setTimeout(()=>{setInspectorPane('math',{open:!INSPECTOR.mq.matches});syncInspectorLayout();},0);
