/* ---------- UI glue ---------- */
const MODES={fight:Fight,race:Race,kick:Kick};let M=Fight;
const SV=(b,extra='')=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${b}</svg>`;
const FIST=(x=0,y=0)=>`<g transform="translate(${x} ${y})"><path d="M13 10.5h8.5a4 4 0 0 1 4 4v3a6 6 0 0 1-6 6H16a5 5 0 0 1-5-5v-5.5a2.5 2.5 0 0 1 2-2.5z" fill="currentColor" stroke="none"/><path d="M15.5 10.5v4M19 10.5v4M22.5 11v3.5" stroke="rgba(0,0,0,.35)" stroke-width="1.6"/><path d="M11 17.5h5.5" stroke="rgba(0,0,0,.35)" stroke-width="1.6"/></g>`;
const ICONS={
  run:SV('<path d="M10 7l14 9-14 9z" fill="currentColor" stroke="none"/>'),
  cut:SV('<path d="M5 24l7-8-5-7h7l6 7-6 8" stroke-width="3"/><path d="M20 24h7v-7" stroke-width="3"/>'),
  up:SV('<path d="M16 8l8 11H8z" fill="currentColor" stroke="none"/>'),down:SV('<path d="M16 24L8 13h16z" fill="currentColor" stroke="none"/>'),
  left:SV('<path d="M8 16l11-8v16z" fill="currentColor" stroke="none"/>'),right:SV('<path d="M24 16L13 8v16z" fill="currentColor" stroke="none"/>'),
  jab:SV(FIST(2,0)+'<path d="M4 17h5"/>'),
  cross:SV(FIST(3,0)+'<path d="M2 12h6M1 17h7M2 22h6"/>'),
  upper:SV(FIST(0,3)+'<path d="M8 25c0-5 1-8 4-11M12 14l-3.5 1M12 14l.8 3.5"/>'),
  shield:SV('<path d="M16 4l10 4v7c0 7-5 11-10 13C11 26 6 22 6 15V8z" fill="currentColor" stroke="none"/>'),
  gas:SV('<path d="M9 26l6-20h4l-2 8h6L13 28l2-9H9z" fill="currentColor" stroke="none"/>'),
  brake:SV('<path d="M11 4h10l7 7v10l-7 7H11l-7-7V11z" fill="currentColor" stroke="none"/><path d="M10 16h12" stroke="rgba(0,0,0,.45)" stroke-width="3"/>'),
  kick:SV('<circle cx="20" cy="16" r="8" fill="currentColor" stroke="none"/><path d="M20 8l-3 5 3 4 3-4zM13.5 19l3.5-2M26.5 19l-3.5-2" stroke="rgba(0,0,0,.4)" stroke-width="1.6"/><path d="M2 12h6M1 17h6M2 22h6"/>'),
  crossin:SV('<circle cx="23" cy="10" r="6" fill="currentColor" stroke="none"/><path d="M4 26c3-9 8-13 13-14" /><path d="M14 9l3.5 3-4 2"/>'),
  head:SV('<circle cx="13" cy="19" r="8" fill="currentColor" stroke="none"/><circle cx="25" cy="8" r="5" fill="currentColor" stroke="none"/><path d="M18 11l3-2" stroke-width="2"/>'),
  mv_step:SV('<circle cx="16" cy="23" r="5" fill="currentColor" stroke="none"/><path d="M5 21C5 9 27 9 27 18" stroke-width="3"/><path d="M27 18l-4-3M27 18l2.5-4.5" stroke-width="2.6"/>'),
  mv_croq:SV('<circle cx="16" cy="13" r="6" fill="currentColor" stroke="none"/><path d="M6 25h20M6 25l3.5-3M6 25l3.5 3M26 25l-3.5-3M26 25l-3.5 3" stroke-width="2.6"/>'),
  mv_elas:SV('<circle cx="16" cy="25" r="4.5" fill="currentColor" stroke="none"/><path d="M16 19c0-5 9-5 9-10S16 4 10 7" stroke-width="3"/><path d="M10 7l4.5-1M10 7l2 4" stroke-width="2.6"/>'),
  mv_drag:SV('<circle cx="12" cy="20" r="5" fill="currentColor" stroke="none"/><path d="M28 20H18M18 20l4-4M18 20l4 4" stroke-width="2.8"/>'),
  mv_cruyff:SV('<circle cx="22" cy="23" r="4.5" fill="currentColor" stroke="none"/><path d="M8 6v12h12" stroke-width="3"/><path d="M20 18l-3.5-3.5M20 18l-3.5 3.5" stroke-width="2.6"/>'),
  mv_nut:SV('<path d="M9 4l5 22M23 4l-5 22" stroke-width="2.8"/><circle cx="16" cy="20" r="3.6" fill="currentColor" stroke="none"/>'),
  mv_rainbow:SV('<path d="M5 25C7 6 25 6 27 25" stroke-width="2.8"/><circle cx="16" cy="10" r="4.5" fill="currentColor" stroke="none"/>'),
  mv_spin:SV('<circle cx="16" cy="16" r="4" fill="currentColor" stroke="none"/><path d="M25 11A10.5 10.5 0 1 0 26.5 18" stroke-width="3"/><path d="M25 4v7h-7" stroke-width="3"/>'),
  setup_mode:SV('<circle cx="16" cy="16" r="10"/><path d="M16 9v7l5 3"/><path d="M8 5l-3 5h6M24 27l3-5h-6"/>'),
  setup_kit:SV('<path d="M6 11h20v16H6z"/><path d="M11 11V7h10v4M16 11v16"/>'),
  setup_player:SV('<circle cx="16" cy="9" r="4"/><path d="M9 28v-6a7 7 0 0 1 14 0v6M8 18l-4 6M24 18l4 6"/>'),
  setup_stadium:SV('<path d="M4 25V10l12-6 12 6v15M8 25V13h16v12M4 25h24"/><path d="M12 18h8"/>'),
  setup_pitch:SV('<rect x="4" y="6" width="24" height="20" rx="2"/><path d="M16 6v20"/><circle cx="16" cy="16" r="4"/>'),
  setup_weather:SV('<path d="M9 24h15a5 5 0 0 0 0-10 8 8 0 0 0-15-2 6 6 0 0 0 0 12z"/><path d="M10 27l-1 2M17 27l-1 2M24 27l-1 2"/>'),
  setup_temp:SV('<path d="M14 6a3 3 0 0 1 6 0v12a6 6 0 1 1-6 0z"/><path d="M17 10v12"/>'),
  setup_ball:SV('<circle cx="16" cy="16" r="11"/><path d="M16 10l5 4-2 6h-6l-2-6zM5 14l6 0M21 14l6-1M13 20l-3 6M19 20l3 6"/>'),
  setup_path:SV('<path d="M4 24c8-18 16 5 24-16"/><path d="M23 7l5 1-1 5"/>'),
  setup_controls:SV('<circle cx="16" cy="16" r="10"/><path d="M16 6v5M16 21v5M6 16h5M21 16h5"/><circle cx="16" cy="16" r="3"/>'),
  setup_style:SV('<path d="M16 4l3.5 7 7.5 1-5.5 5 1.5 8-7-4-7 4 1.5-8-5.5-5 7.5-1z"/>')};
const SETUP_ICON_KEY={__play:'setup_mode',kit:'setup_kit',pl:'setup_player',player:'setup_player',stad:'setup_stadium',stadium:'setup_stadium',pitch:'setup_pitch',wx:'setup_weather',weather:'setup_weather',temp:'setup_temp',press:'setup_ball',size:'setup_ball',surf:'setup_ball',ball:'setup_ball',pred:'setup_path',air:'setup_weather',shot:'setup_ball',pso:'setup_mode',style:'setup_style'};
function setupIcon(id){return ICONS[SETUP_ICON_KEY[id]||'setup_controls'];}
function setupLabel(id,label){return`<span class="setup-label">${setupIcon(id)}<span>${label}</span></span>`;}
function setupChoice(id,label,sub,locked=false){return`${setupIcon(id)}<span class="choice-copy">${locked?'<span class="lock-mark" aria-hidden="true">LOCKED</span> ':''}<b>${label}</b><small>${sub}</small></span>`;}
function padEls(id){return document.querySelectorAll(`#pad [data-id="${id}"]`);}
function setLabel(){M.actions().forEach(x=>{padEls(x.id).forEach(el=>{el.classList.toggle('sel',!!x.sel);el.classList.toggle('pulse',!!x.pulse);el.disabled=!!x.disabled;if(x.icon&&el._icon!==x.icon){const c=el.querySelector('.cap');if(c){c.innerHTML=ICONS[x.icon];el._icon=x.icon;}}const label=x.label||String(x.aria||x.id).replace(/\s*\(.*/, '');const vl=el.querySelector('.action-label');if(vl)vl.textContent=label;el.setAttribute('aria-label',x.aria||x.label||x.id);});});}
function adjustVar(id,delta){const e=varEls.find(v=>v.def.id===id);if(!e||e.inp.disabled)return false;const d=e.def,nv=clamp(Math.round((M.V[id]+delta)/d.step)*d.step,d.min,d.max);e.inp.value=nv;e.inp.dispatchEvent(new Event('input'));
  DP.flash={id,t:performance.now()};const box=e.inp.closest('.var');if(box){box.classList.remove('dflash');void box.offsetWidth;box.classList.add('dflash');}return true;}
const DP={sel:0,flash:null};
function dialVars(){return M.vars().filter(v=>!isLocked(M.key,v.id));}
function dialStep(v){return Math.max(v.step,Math.round((v.max-v.min)/40/v.step)*v.step);}
/* which d-pad style applies right now: 'bound' (arms fixed to dials, easy levels), 'select' (you pick the dial), or null */
function dialMode(){if(M===Kick&&Kick.opt.shot!=='dribble'&&Kick.state==='aim')return assistLevel('kick')===2?'bound':'select';if(M===Kick&&Kick.opt.shot==='dribble'&&Drib.state==='ready'&&!MATCH.on)return'select';return null;}
function dialSelectActions(){const vs=dialVars();if(!vs.length)return[];const n=vs.length,cur=vs[((DP.sel%n)+n)%n],st=dialStep(cur);
  return[{id:'dsel-',dir:'left',tag:'DIAL',aria:'previous dial'},{id:'dsel+',dir:'right',aria:'next dial'},{id:'dinc',dir:'up',tag:cur.sym,aria:`raise ${cur.name}`,step:[cur.id,st]},{id:'ddec',dir:'down',tag:cur.sym,aria:`lower ${cur.name}`,step:[cur.id,-st]}];}
function dialSel(id){if(id!=='dsel-'&&id!=='dsel+')return false;DP.sel+=id==='dsel+'?1:-1;const vs=dialVars(),cur=vs[((DP.sel%vs.length)+vs.length)%vs.length];if(cur){DP.flash={id:cur.id,t:performance.now()};const e=varEls.find(v=>v.def.id===cur.id),box=e&&e.inp.closest('.var');if(box){box.classList.remove('dflash');void box.offsetWidth;box.classList.add('dflash');}}SND.click();renderActions();setLabel();if(typeof renderMathConsole==='function')renderMathConsole();return true;}
function drawDialHud(c){const md=dialMode();if(!md)return;const vs=dialVars();if(!vs.length)return;const acts=M.actions(),fresh=DP.flash&&performance.now()-DP.flash.t<700;
  const rows=md==='bound'?acts.filter(a=>a.step).reduce((L,a)=>{const v=vs.find(x=>x.id===a.step[0]);if(v&&!L.some(r=>r.v===v))L.push({v,keys:acts.filter(b=>b.step&&b.step[0]===v.id).map(b=>({up:'▲',down:'▼',left:'◀',right:'▶'})[b.dir]).join('')});return L;},[]):null;
  const x=14,h=md==='bound'?26+rows.length*19:62,y=360-h,w=278;c.save();c.fillStyle='rgba(6,11,24,0.86)';rr(c,x,y,w,h,9);c.fill();c.strokeStyle=C.line;c.stroke();
  text(c,md==='bound'?'D-PAD CHANGES THESE DIALS':'D-PAD: ◀ ▶ PICK A DIAL · ▲ ▼ CHANGE IT',x+10,y+15,'700 9.5px '+MONO,C.muted);
  if(md==='bound')rows.forEach((r,i)=>{const yy=y+33+i*19,hot=fresh&&DP.flash.id===r.v.id;text(c,r.keys,x+10,yy,'700 12px '+MONO,hot?'#fff':C.muted);text(c,`${r.v.sym}`,x+44,yy,'700 13px '+MONO,r.v.col);text(c,`${r.v.name} = ${fmt(M.V[r.v.id],r.v.d)}${r.v.unit?(r.v.unit==='°'?'°':' '+r.v.unit):''}`,x+70,yy,'600 11px '+MONO,hot?'#fff':C.ink);});
  else{const n=vs.length,ci=((DP.sel%n)+n)%n,cur=vs[ci];let xx=x+10;vs.forEach((v,i)=>{const on=i===ci;c.font='700 11px '+MONO;const tw=c.measureText(v.sym).width+12;c.fillStyle=on?v.col:'rgba(255,255,255,0.06)';rr(c,xx,y+22,tw,17,5);c.fill();text(c,v.sym,xx+6,y+34,'700 11px '+MONO,on?'#08101f':C.muted);xx+=tw+5;});
    const hot=fresh&&DP.flash.id===cur.id;text(c,`${cur.name} = ${fmt(M.V[cur.id],cur.d)}${cur.unit?(cur.unit==='°'?'°':' '+cur.unit):''}`,x+10,y+55,'700 12px '+MONO,hot?'#fff':cur.col);}
  c.restore();}
function renderOpts(){const box=$('#opts');box.innerHTML='';const k=M.key,n=CH[k].length;
  const modeG={id:'__play',label:'Mode',choices:k==='fight'?[['ch','Bout vs Rex',best.ch.fight<n?REX[best.ch.fight].name:'champion rematch'],['free','Free lab','no opponent']]:[['ch','Challenge',best.ch[k]<n?`${best.ch[k]+1} of ${n}`:'complete'],['free','Free play','no limits']]};
  {const el=document.createElement('div');el.className='group';el.innerHTML=`<span class="lbl">${setupLabel('__play','Mode')}</span>`;const ch=document.createElement('div');ch.className='chips';
   modeG.choices.forEach(([v,l,sub])=>{const b=document.createElement('button');b.type='button';b.className='chip setup-choice';b.setAttribute('aria-pressed',String(best.play[k]===v));b.innerHTML=setupChoice('__play',l,sub);
     b.addEventListener('click',()=>{if(best.play[k]===v)return;unlock();SND.click();best.play[k]=v;saveBest();applyCh(k);E.slow=null;hideResults();M.reset();renderAll(false);COACH.set(k);});ch.appendChild(b);});
   el.appendChild(ch);box.appendChild(el);}
  if(M===Kick){const el=document.createElement('div');el.className='group';el.innerHTML=`<span class="lbl">${setupLabel('kit','Kit')}</span>`;const b=document.createElement('button');b.type='button';b.className='kitbtn setup-choice';b.id='kitRoomToggle';b.setAttribute('aria-expanded',String(!$('#kitroom').hidden));b.setAttribute('aria-controls','kitroom');
    const K=kit();b.innerHTML=`${setupIcon('kit')}<span class="choice-copy"><b>Kit Room</b><small>${KI('press').n} ball · ${KI('size').n} · ${KI('surf').n} · ${KI('studs').n} · ${KI('boot').n} boots</small></span>`;b.addEventListener('click',()=>{unlock();SND.click();$('#kitroom').hidden?openKit(b):closeKit();});el.appendChild(b);box.appendChild(el);}
  M.groups().filter(g=>!(M===Kick&&(g.id==='shot'||g.id==='pso'))).forEach(g=>{const el=document.createElement('div');el.className='group';el.innerHTML=`<span class="lbl">${setupLabel(g.id,g.label)}</span>`;
  const ch=document.createElement('div');ch.className='chips';g.choices.forEach(([v,l,sub,lock])=>{const b=document.createElement('button');b.type='button';b.className='chip setup-choice'+(lock?' locked':'');b.setAttribute('aria-pressed',String(M.opt[g.id]===v&&!lock));b.innerHTML=setupChoice(g.id,l,sub,!!lock);
    b.addEventListener('click',()=>{if(lock){COACH.say(lock,'tip',6);return;}if(M.opt[g.id]===v)return;unlock();SND.click();M.opt[g.id]=v;if(M.onOpt)M.onOpt(g.id,v);E.slow=null;M.reset();renderAll(false);});ch.appendChild(b);});
  el.appendChild(ch);box.appendChild(el);});
  const cs=COSMETICS[M.key],lv=lvlOf(best.xp),el=document.createElement('div');el.className='group';el.innerHTML=`<span class="lbl">${setupLabel('style','Style · unlock with levels')}</span>`;const ch=document.createElement('div');ch.className='chips';
  cs.items.forEach(([id,l,need])=>{const b=document.createElement('button');b.type='button';const locked=lv<need;b.className='chip setup-choice'+(locked?' locked':'');b.setAttribute('aria-pressed',String(best.style[M.key]===id&&!locked));b.innerHTML=setupChoice('style',l,locked?'LVL '+need:'unlocked',locked);
    b.addEventListener('click',()=>{if(locked){COACH.say(`${l} unlocks at level ${need}. Keep earning XP!`,'tip',6);return;}SND.click();best.style[M.key]=id;saveBest();renderOpts();});ch.appendChild(b);});el.appendChild(ch);box.appendChild(el);}
const varEls=[];
function renderVars(){const box=$('#vars');box.innerHTML='';varEls.length=0;M.vars().forEach(v=>{const el=document.createElement('div');el.className='var'+(isLocked(M.key,v.id)?' locked':'');el.style.setProperty('--c',v.col);const id='var-'+M.key+'-'+v.id;
  const show=x=>fmt(x,v.d)+(v.unit?(v.unit==='°'?'':' ')+v.unit:'');
  el.innerHTML=`<label class="vh" for="${id}"><span class="sym">${v.sym}</span><span class="nm">${v.name}</span><output>${show(M.V[v.id])}</output></label><div class="track"><input type="range" id="${id}" min="${v.min}" max="${v.max}" step="${v.step}" value="${M.V[v.id]}"><i class="band" hidden></i></div><p class="vnote" hidden></p>`+(v.pre?`<div class="pre">${v.pre.map(([x,l])=>`<button type="button" data-v="${x}">${l} ${fmt(x,v.d)}</button>`).join('')}</div>`:'');
  const inp=el.querySelector('input'),out=el.querySelector('output');
  const set=x=>{M.V[v.id]=clamp(+x,v.min,v.max);inp.value=M.V[v.id];out.textContent=show(M.V[v.id]);if(M.onVar)M.onVar(v.id);};
  inp.addEventListener('input',()=>set(inp.value));el.querySelectorAll('.pre button').forEach(b=>b.addEventListener('click',()=>{if(!inp.disabled)set(b.dataset.v);}));
  varEls.push({def:v,inp,el,band:el.querySelector('.band'),note:el.querySelector('.vnote')});box.appendChild(el);});lastAssist='';}
/* coach zones: suggested ranges on each slider, fading out on higher tiers */
function assistLevel(m){if(m==='kick'&&typeof Kick!=='undefined'&&Kick.opt.shot==='dribble'){const l=Drib.lvl();return l<=1?2:l<=3?1:0;}if(best.play[m]!=='ch')return 2;const i=best.ch[m];return i<=2?2:i<=4?1:0;}
const ASSIST_TXT=['off: trust the Live Math','direction only','full zones'];
let lastAssist='';
function runsPick(vals,cur,step){if(!vals.length)return null;const runs=[[vals[0]]];for(let i=1;i<vals.length;i++){if(vals[i]-vals[i-1]>step*1.5)runs.push([]);runs[runs.length-1].push(vals[i]);}
  let bestR=runs[0],bd=1e9;runs.forEach(r=>{const lo=r[0],hi=r[r.length-1],d=cur<lo?lo-cur:cur>hi?cur-hi:0;if(d<bd){bd=d;bestR=r;}});return{lo:bestR[0],hi:bestR[bestR.length-1]};}
function updateAssist(){const lvl=assistLevel(M.key),sg=M.suggest?M.suggest():{},who=COACHES[M.key].name.split(' ').pop();let sig=lvl+'|';
  varEls.forEach(e=>{const s=sg[e.def.id],id=e.def.id,d=e.def;if(!s||isLocked(M.key,id)||lvl===0){e.band.hidden=true;e.note.hidden=true;e.el.classList.remove('inzone');return;}
    const val=M.V[id],has=s.lo!=null&&s.hi!=null,ok=has&&val>=s.lo-1e-9&&val<=s.hi+1e-9;
    if(has&&lvl===2){const a=(clamp(s.lo,d.min,d.max)-d.min)/(d.max-d.min)*100,b=(clamp(s.hi,d.min,d.max)-d.min)/(d.max-d.min)*100;e.band.hidden=false;e.band.style.left=`calc(${a}% - 3px)`;e.band.style.width=`calc(${Math.max(b-a,0)}% + 6px)`;}else e.band.hidden=true;
    let html;if(lvl===2)html=`<b>${who}:</b> ${s.note}`;else html=has?`<b>${who}:</b> ${ok?'that\u2019s in the zone.':val<s.lo?'go higher.':'go lower.'}`:(s.dir?`<b>${who}:</b> ${s.dir}`:'');
    if(!html){e.note.hidden=true;return;}e.note.hidden=false;e.note.className='vnote'+(has&&ok?' ok':'');e.el.classList.toggle('inzone',has&&ok);
    const k=id+html;sig+=k;if(e.note._h!==html){e.note.innerHTML=html;e.note._h=html;}});
  lastAssist=sig;}
function renderActions(){$('#padL').innerHTML='';$('#padR').innerHTML='';const acts=M.actions();
  const dp=document.createElement('div');dp.className='dpad';dp.innerHTML=`<div class="hub"><i></i></div>`;$('#padL').appendChild(dp);
  const arc=document.createElement('div');arc.className='arcade';$('#padR').appendChild(arc);
  ['up','down','left','right'].forEach(d=>{if(!acts.some(a=>a.dir===d))acts.push({id:'none-'+d,dir:d,disabled:true,aria:'unused'});});
  acts.forEach(a=>{const b=document.createElement('button');b.type='button';b.dataset.id=a.id;b.setAttribute('aria-label',a.aria||a.label||a.id);if(a.disabled)b.disabled=true;
  if(a.dir){const raw=a.label||String(a.aria||a.dir).replace(/\s*[:(].*/,''),direction=raw.match(/\b(left|right|up|down)\b/i),dl=a.disabled?'':(direction?direction[1]:raw);b.className='arm '+a.dir+(a.disabled?'':' act');b.innerHTML=ICONS[a.dir]+(a.tag?`<span class="tag" style="${a.dir==='up'?'bottom:1px':a.dir==='down'?'top:1px':a.dir==='left'?'right:2px;bottom:1px':'left:2px;bottom:1px'}">${a.tag}</span>`:'')+(dl?`<span class="dir-label">${dl}</span>`:'');}
  else{const al=a.label||String(a.aria||a.id).replace(/\s*\(.*/, '');b.className='abtn'+(a.big?' big':'')+(a.sel?' sel':'')+(a.pulse?' pulse':'');b.style.setProperty('--bc',a.color||'#ff5a4e');b.innerHTML=`<span class="cap">${ICONS[a.icon]||''}</span><span class="action-label">${al}</span>${a.key?`<span class="kk">${a.key}</span>`:''}`;b._icon=a.icon;}
  if(a.disabled){(a.dir?dp:arc).appendChild(b);return;}
  let rep=null;
  b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();unlock();try{b.setPointerCapture(e.pointerId);}catch(_){}b.classList.add('on');
    if(a.step){adjustVar(a.step[0],a.step[1]);if(typeof renderMathConsole==='function')renderMathConsole();SND.click();clearTimeout(rep);rep=setTimeout(function tick(){adjustVar(a.step[0],a.step[1]);if(typeof renderMathConsole==='function')renderMathConsole();rep=setTimeout(tick,90);},350);return;}
    if(a.id==='dials'){$('#dials').hidden?openDials():closeDials();return;}
    if(PAUSE.on){if($('#dials').hidden)resumeGame();return;}
    if(dialSel(a.id)){b.classList.remove('on');return;}
    if(resOpen()){if(a.primary)ackResults();else{b.classList.remove('on');$('#rNext').animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:260});}return;}
    M.press(a.id,true);});
  const up=()=>{clearTimeout(rep);if(b.classList.contains('on')){b.classList.remove('on');if(!a.step&&a.id!=='dials')M.press(a.id,false);}};
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,up));
  b.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();e.stopPropagation();if(resOpen()){ackResults();return;}M.press(a.id,true);}});b.addEventListener('keyup',e=>{if(e.key==='Enter')M.press(a.id,false);});
  (a.dir?dp:arc).appendChild(b);});}
