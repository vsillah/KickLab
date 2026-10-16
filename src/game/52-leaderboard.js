/* ---------- family leaderboard (shared db) ---------- */
const BCATS=[
  {id:'punch',n:'Hardest punch',u:'N',hi:true,d:0,get:()=>best.punch||0,eq:'F = Δp ÷ Δt: more momentum, delivered faster, hits harder'},
  {id:'lap',n:'Fastest lap',u:'s',hi:false,d:2,get:()=>best.lap||0,eq:'v_max = √(μ·g·r): the fastest line keeps you right at the grip limit'},
  {id:'bar',n:'Crossbar challenge',u:'pts',hi:true,d:0,get:()=>best.barHi||0,eq:'60 seconds, aim at the bar: h = v₀·t − ½·g·t²'},
  {id:'mwins',n:'Match wins',u:'wins',hi:true,d:0,get:()=>best.mWins||0,eq:'Win a full Match: dribble, shoot, head, keep'},
  {id:'xp',n:'Total XP',u:'XP',hi:true,d:0,get:()=>Math.round(best.xp||0),eq:'Every round, badge and level adds up'}];
const BOARD={db:null,owner:false,rows:[],cat:'punch',ready:false,arm:null,
  nick(){try{return(localStorage.getItem('impactlab.nick')||'').trim();}catch(e){return BOARD._n||'';}},
  setNick(v){v=String(v||'').replace(/[<>]/g,'').trim().slice(0,16);BOARD._n=v;try{localStorage.setItem('impactlab.nick',v);}catch(e){}},
  slug(v){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)||'player';},
  top(cat){const C=BCATS.find(c=>c.id===cat);return this.rows.filter(r=>r.cat===cat&&typeof r.val==='number'&&r.val>0).sort((a,b)=>C.hi?b.val-a.val:a.val-b.val).slice(0,10);},
  mine(cat){const n=this.nick();if(!n)return null;const id=cat+'~'+this.slug(n);return this.rows.find(r=>r.id===id)||null;},
  better(C,v,old){if(!v)return false;if(!old)return true;return C.hi?v>old.val:v<old.val;},
  pending(){return BCATS.filter(C=>this.better(C,C.get(),this.mine(C.id)));},
  rank(cat){const n=this.nick();if(!n)return 0;const i=this.top(cat).findIndex(r=>r.id===cat+'~'+this.slug(n));return i+1;}};
function fbVal(C,v){return fmt(v,C.d)+' '+C.u;}
function renderBoard(){const box=$('#fboard');if(box.hidden)return;
  {const my=WKCAT.get();$('#fbWeek').innerHTML=`<span class="wk-k">Weekly challenge · ${WEEKLY.key}</span><b>${WEEKLY.n}</b><small>Crossbar challenge · ${WEEKLY.desc()}${my?` · your best ${my} pts`:''}</small><button type="button" id="fbPlayWk">Play it ▶</button>`;}
  $('#fbCats').innerHTML=BCATS.map(C=>`<button type="button" data-c="${C.id}" aria-pressed="${C.id===BOARD.cat}">${C.n}</button>`).join('');
  const C=BCATS.find(c=>c.id===BOARD.cat);$('#fbEq').textContent=C.eq;
  const post=$('#fbPost'),msg=$('#fbMsg');
  if(!BOARD.db){post.disabled=true;msg.textContent=BOARD.ready?'The family board only works when the game is opened from its claude.ai link while signed in.':'Connecting to the family board…';$('#fbList').innerHTML='';return;}
  const pend=BOARD.pending();post.disabled=!BOARD.nick()||!pend.length;
  if(!msg.dataset.hold)msg.textContent=!BOARD.nick()?'Pick a nickname to post. Use a made-up name, not your real one.':pend.length?`New bests ready to post: ${pend.map(c=>c.n).join(', ')}`:'Everything you have is already on the board.';
  const me=BOARD.nick()?BOARD.slug(BOARD.nick()):'';const list=BOARD.top(C.id);
  $('#fbList').innerHTML=list.length?list.map((r,i)=>`<li class="${r.id===C.id+'~'+me?'me':''}"><span class="rk">${i+1}</span><span class="nm"></span><span class="vl">${fbVal(C,r.val)}</span>${BOARD.owner?`<button type="button" class="del${BOARD.arm===r.id?' arm':''}" data-id="${r.id}">${BOARD.arm===r.id?'Remove?':'✕'}</button>`:'<span></span>'}</li>`).join(''):`<li class="fb-empty" style="display:block">${C===WKCAT?'No one has played this week yet. Be first.':`No one on the ${C.n.toLowerCase()} board yet. Be first.`}</li>`;
  $('#fbList').querySelectorAll('.nm').forEach((el,i)=>{el.textContent=String(list[i].nick||'Player').slice(0,16);if(list[i].at){const sm=document.createElement('small');sm.textContent=new Date(list[i].at).toLocaleDateString();el.appendChild(sm);}});}
function kitStat(l,v,base,unit,d,note,hiGood=true){const diff=v-base,cls=Math.abs(diff)<1e-3*Math.max(1,Math.abs(base))?'':((diff>0)===hiGood?'up':'dn');return`<div><span>${l}</span><b class="${cls}">${fmt(v,d)}${unit}</b><small>${note}</small></div>`;}
function renderKit(){if($('#kitroom').hidden)return;const K=kit(),vs=Kick.V.vs,pt=Kick.opt.pitch||'grass';
  const dk0=0.5*1.2*0.25*0.038/0.43,dk=0.5*1.2*AIR.Cd*AIR.A/AIR.m,mu=kitMu();
  $('#kitSum').innerHTML=kitStat('Shot speed',vs*kitShot(),vs,' m/s',1,`×${fmt(kitShot(),3)} vs match kit`)+kitStat('Ball pressure',ballBar(),KI('press').bar,' bar',2,`pumped ${KI('press').bar} at 20 °C, now ${temp().c} °C`)+kitStat('Dribble touch',0.3*kitTouch(),0.3,' m',2,'how far the ball pops ahead',false)+kitStat('Cut grip',mu,1,'×',2,`studs on ${PITCHES[pt].n.toLowerCase()}`)+kitStat('Drag factor',dk*1000,dk0*1000,'',2,'½ρC_dA÷m ×1000',false)+kitStat('Curl',kitSpin(),1.1,'×',2,'spin from the boot')+kitStat('Skill moves',1/KI('boot').sk,1,'×',2,'speed of your feet');
  $('#kitBody').innerHTML=Object.entries(KITS).map(([k,G])=>`<div class="kit-sec"><h3>${G.label}</h3><p class="eq">${G.eq}</p><p>${G.why}</p><div class="chips">${Object.entries(G.o).map(([v,o])=>`<button type="button" class="chip" data-k="${k}" data-v="${v}" aria-pressed="${K[k]===v}">${o.n}<small>${o.d}${k==='studs'?` · grip ×${o.mu[pt]} here`:''}</small></button>`).join('')}</div></div>`).join('');}
function openKit(){applyKit();$('#kitroom').hidden=false;renderKit();}
function closeKit(){$('#kitroom').hidden=true;renderAll(false);}
function setKit(k,v){best.kit=Object.assign({},kit(),{[k]:v});saveBest();applyKit();renderKit();
  const o=KITS[k].o[v],pt=Kick.opt.pitch||'grass';let msg='';
  if(k==='press')msg=`${o.n} ball, e = ${kitE()}${temp().c!==20?` (${fmt(ballBar(),2)} bar at ${temp().c} °C)`:''}. Shot ×${fmt(kitShot(),2)}, and touches pop ${fmt(0.3*kitTouch(),2)} m ahead. ${kitE()>0.8?'Fast shots, but a defender can poke away a loose touch.':kitE()<0.7?'Easy to control, but your shots lose pace.':'Regulation: the balanced choice.'}`;
  else if(k==='size')msg=`${o.n}: ${o.m} kg. Lighter ball, a = F ÷ m, so it leaves your foot faster but drag (÷ m) pushes it around more.`;
  else if(k==='surf')msg=`${o.n}: C_d ${o.Cd}. ${v==='smooth'?'Less drag, but try a knuckleball: it wobbles about 1.8× more.':'Grippy panels add spin, so curlers bend about 10% more.'}`;
  else if(k==='studs'){const m=o.mu[pt];msg=`${o.n} on ${PITCHES[pt].n.toLowerCase()}: grip ×${m}, so a_cut = ${fmt(Kick.V.grip*m,2)} × g. ${m<0.8?'You will slide on hard cuts. Wrong studs for this pitch!':m>=1?'Perfect match for this pitch.':'Okay, but not ideal for this pitch.'}`;}
  else if(k==='boot')msg=`${o.n} boots (${o.kg*1000} g): shot ×${fmt(kitShot(),3)}, skill moves take ×${o.sk} the time. Mass adds a little punch but slows your swing, so it nearly cancels out.`;
  COACH.say(msg,'tip',12);}
function openBoard(){$('#fboard').hidden=false;$('#fbNick').value=BOARD.nick();delete $('#fbMsg').dataset.hold;renderBoard();}
function closeBoard(){$('#fboard').hidden=true;BOARD.arm=null;}
async function postBoard(){const n=BOARD.nick();if(!BOARD.db||!n)return;const pend=BOARD.pending();if(!pend.length)return;const msg=$('#fbMsg');$('#fbPost').disabled=true;msg.dataset.hold='1';msg.textContent='Posting…';
  let ok=0,err='';for(const C of pend){const v=C.get();try{await BOARD.db.collection('board').doc(C.id+'~'+BOARD.slug(n)).set({cat:C.id,nick:n,val:+(+v).toFixed(C.d),at:Date.now()});ok++;}catch(e){err=e&&e.code||'error';if(err==='unavailable'){try{await new Promise(r=>setTimeout(r,600+Math.random()*600));await BOARD.db.collection('board').doc(C.id+'~'+BOARD.slug(n)).set({cat:C.id,nick:n,val:+(+v).toFixed(C.d),at:Date.now()});ok++;err='';}catch(e2){}}}}
  msg.textContent=err?(ok?`Posted ${ok}, but some didn't go through.`:'')+(err==='quota_exceeded'?' The board is full; ask a grown-up to clear old entries.':' You may need edit access to this game to post. Ask whoever shared it.'):`Posted ${ok} new best${ok>1?'s':''} as ${n}.`;
  setTimeout(()=>{delete msg.dataset.hold;renderBoard();refreshResBoard();},2600);renderBoard();refreshResBoard();}
function refreshResBoard(){const el=$('#rBoard');if(!el||$('#results').hidden||$('#results').classList.contains('mini')||!BOARD.db){if(el)el.hidden=true;return;}
  const pend=BOARD.pending();const k=M&&M.key;const rel=BCATS.filter(C=>k==='fight'?C.id==='punch':k==='race'?C.id==='lap':k==='kick'?(C.id==='bar'||C.id==='mwins'||C.id===WKCAT.id):false);
  const parts=[];rel.concat(BCATS.filter(c=>c.id==='xp')).forEach(C=>{const r=BOARD.rank(C.id);if(r)parts.push(`<span>#${r} in ${C.n}</span>`);});
  const hot=pend.filter(C=>C.id!=='xp');
  if(!parts.length&&!hot.length){el.hidden=true;return;}
  el.innerHTML='<b>🏆 Family board</b>'+parts.join(' · ')+(hot.length?` <button type="button" class="rpost" id="rPost">${BOARD.nick()?'Post new best':'Post to the board'}</button>`:'');el.hidden=false;}
(async()=>{try{if(!window.claude||!window.claude.use){BOARD.ready=true;return;}const [db,user]=await Promise.all([claude.use('db'),claude.use('user')]);BOARD.ready=true;BOARD.owner=!!(user&&await user.isOwner());if(!db){renderBoard();return;}BOARD.db=db;
  db.collection('board').limit(1000).onSnapshot(sn=>{BOARD.rows=sn.docs.map(d=>Object.assign({id:d.id},d.data()));renderBoard();refreshResBoard();},()=>{});renderBoard();}catch(e){BOARD.ready=true;}})();
