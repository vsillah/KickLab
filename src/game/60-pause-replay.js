/* ---------- time-outs: pause while you work the dials ---------- */
const PAUSE={on:false,why:'',resumeT:0};
function pausable(){return M.key==='fight'?!!(Fight.bout&&!Fight.bout.over&&Fight.bout.intro<=0):M.key==='race'?(Race.state==='run'||Race.state==='count'||RACE_3D.shouldBlockInput()||RACE_FINISHES.enabled&&['await-brake','cinematic'].includes(Race.signatureFinish?.phase)):M.key==='kick'?(Kick.opt.shot==='dribble'?(Drib.state==='run'||Drib.state==='beat')&&!Drib.outcome:Kick.state==='incoming'):false;}
function pauseGame(why){if(M===Race){RACE_SPEED_AUDIO.stop();RACE_SUPERCAR_AUDIO.stop();}if(why==='stage'||why==='manual')return setManualPause(true);return claimPauseOwner(why);}
function resumeGame(){return resumePlayerPause();}
function returnDialsContent(){const pane=$('#physicsDetail'),fig=pane.querySelector('figure.chart');if($('#liveEq').parentElement!==pane)pane.insertBefore($('#liveEq'),fig);if($('#vars').parentElement!==pane)pane.insertBefore($('#vars'),fig);}
function dialsUnavailableReason(){if(RP.on)return'Dials are unavailable during replay. Exit replay first.';if(CINE.on)return'Dials are unavailable during the replay sequence.';if(!$('#rvBack').hidden)return'Close Coach review before opening Dials.';if(!$('#lvlup').hidden)return'Finish the level-up moment before opening Dials.';if(resOpen())return'Dials are unavailable while results are open. Choose Next round first.';return'';}
function syncDialsAvailability(){const b=$('#dialTop'),s=$('#dialTopStatus'),reason=dialsUnavailableReason(),blocked=!!reason;b.disabled=blocked;b.setAttribute('aria-disabled',String(blocked));b.title=reason;if(b.dataset.blocked!==String(blocked)){b.dataset.blocked=String(blocked);b.innerHTML=blocked?'Dials after round':'Dials <span class="k">P</span>';}s.textContent=reason;if(typeof syncManualAvailability==='function')syncManualAvailability();}
function openDials(){if(!$('#dials').hidden)return;syncDialsAvailability();if(dialsUnavailableReason())return;$('#dialTop').hidden=true;pauseGame('dials');const body=$('#dialsBody');body.appendChild($('#liveEq'));body.appendChild($('#vars'));$('#dials').hidden=false;SND.click();}
function closeDials(){if($('#dials').hidden)return;returnDialsContent();$('#dials').hidden=true;$('#dialTop').hidden=false;releasePauseOwner('dials');syncDialsAvailability();SND.click();}
$('#dialsClose').addEventListener('click',closeDials);
$('#dialTop').addEventListener('pointerdown',e=>{e.stopPropagation();});
$('#dialTop').addEventListener('click',e=>{e.stopPropagation();unlock();$('#dials').hidden?openDials():closeDials();});
function drawPause(c){if(!PAUSE.on)return;c.save();c.fillStyle='rgba(4,8,18,0.6)';c.fillRect(0,0,W,H);
  if(PAUSE.why==='manual'||PAUSE.why==='transition'){c.restore();return;}
  const cx=PAUSE.why==='dials'&&cv.clientWidth>700?W*0.3:W/2;glow(c,C.xray,18);text(c,'TIME-OUT',cx,H/2-30,'54px '+DISP,C.ink,'center','middle');c.shadowBlur=0;
  const note=PAUSE.why==='dials'?'Work your dials, then tap Back in':PAUSE.why==='manual-physics'?'Manual Physics owns this pause. Close it to return.':PAUSE.why==='settings'?'Game paused while settings are open. Close settings to return.':PAUSE.why==='context-detail'?'Game paused while details are open. Close them to return.':'Return to the stage to resume.';
  text(c,note,cx,H/2+20,'600 16px '+BODY,C.xray,'center','middle');c.restore();}

/* ---------- move log, recording, replay, review ---------- */
const RECS={},LOGS={fight:[],race:[],kick:[]},LASTG={};let recSeq=0;
const fmtT=t=>{t=Math.max(0,t||0);const m=Math.floor(t/60),s=t-m*60;return`${m}:${s<10?'0':''}${s.toFixed(1)}`;};
function startRec(mode,title){if(RECS[mode]&&RECS[mode].on)stopRec(mode);const id=++recSeq;RECS[mode]={id,on:true,t:0,frames:[],moves:[],title,trail:null,skids:null,ghost:null};
  LOGS[mode].push({sep:true,text:title,id});if(LOGS[mode].length>220)LOGS[mode].splice(0,LOGS[mode].length-220);if(M&&M.key===mode){renderLog();renderHistorySummary();syncLogHead();}}
function stopRec(mode){const r=RECS[mode];if(!r||!r.on)return;r.on=false;const MM=MODES[mode];r.extra=MM.recExtra?MM.recExtra():null;r.trail=MM.trail||null;r.skids=MM.skids||null;r.ghost=MM.ghost||null;if(M.key===mode)syncLogHead();}
function logMove(mode,m){const r=RECS[mode];m.t=r&&r.on?r.t:(r?r.t:0);m.id=r?r.id:0;m.who=m.who||'you';m.tone=m.tone||'info';if(r)r.moves.push(m);const L=LOGS[mode];m.n=L.filter(x=>!x.sep&&x.id===m.id).length+1;L.push(m);
  if(M&&M.key===mode){addLogRow(m,true);addTick(m);renderHistorySummary();if(!RP.on&&mode!=='kick')pushFeed(m);else if(!RP.on&&mode==='kick')$('#feed').innerHTML='';}}
function logRowHTML(m){if(m.sep)return`<li class="mv sep">— ${m.text} —</li>`;const r=RECS[M.key],can=r&&m.id===r.id;
  return`<li class="mv ${m.who} ${m.tone}${can?' click':''}" data-t="${m.t}" data-id="${m.id}"><span class="n">${m.n}</span><span class="tm">${fmtT(m.t)}</span><div><span class="rs">${m.res||''}</span><span class="who">${m.wl?m.wl:m.who==='you'?'YOU':m.who==='rex'?(M.key==='fight'?'REX':M.key==='race'?'CAR':'BALL'):'•'}</span><b>${m.title}</b>${m.math?`<div class="mm">${m.math}</div>`:''}</div></li>`;}
function renderLog(){const L=LOGS[M.key],el=$('#mlList');if(!L.length){el.innerHTML=`<p class="ml-empty">${{fight:'Start a bout: every punch, dodge and block gets logged with its math.',race:'Hold GAS to start a run: braking, corner entry and slides get logged.',kick:'Take a shot: launch, wall, apex and goal line get logged.'}[M.key]}</p>`;return;}
  el.innerHTML=L.slice().reverse().map(logRowHTML).join('');}
function addLogRow(m,isNew){const el=$('#mlList');const e0=el.querySelector('.ml-empty');if(e0)e0.remove();el.insertAdjacentHTML('afterbegin',logRowHTML(m));if(isNew){el.firstElementChild.classList.add('new');if(!el.matches(':hover'))el.scrollTop=0;}while(el.children.length>220)el.lastElementChild.remove();}
function addTick(m){const tk=$('#tk');tk.insertAdjacentHTML('afterbegin',`<span class="tkc ${m.who} ${m.tone}"><span class="w">${fmtT(m.t)}</span>${m.title}${m.res?` <b>${m.res}</b>`:''}${m.math?` · ${m.math}`:''}</span>`);while(tk.children.length>6)tk.lastElementChild.remove();}
let feedSig='';
function feedCard(m){return`<div class="fc ${m.who} ${m.tone}"><span class="r">${m.res||''}</span><span class="w">#${m.n} ${fmtT(m.t)}</span><b>${m.title}</b>${m.math?`<span class="m">${m.math}</span>`:''}</div>`;}
function pushFeed(m){const f=$('#feed');f.classList.remove('replay');f.insertAdjacentHTML('beforeend',feedCard(m));while(f.children.length>3)f.firstElementChild.remove();}
function syncFeedReplay(){const r=RECS[M.key];if(!r)return;const mv=r.moves.filter(m=>m.t<=RP.t+0.02).slice(-3),sig=mv.map(m=>m.n).join(',');if(sig===feedSig)return;feedSig=sig;const f=$('#feed');f.classList.add('replay');f.innerHTML=mv.map(feedCard).join('');}
function resetFeed(){const f=$('#feed');f.innerHTML='';f.className='feed '+M.key;feedSig='';}
const mqPhone=window.matchMedia('(max-width:700px)');
function placeTicker(){}
function resetTicker(){$('#tk').innerHTML=`<span class="tkc sys"><span class="w">LOG</span>Every move and its math will scroll here.</span>`;const L=LOGS[M.key].filter(x=>!x.sep).slice(-5);L.forEach(addTick);}
function syncLogHead(){const r=RECS[M.key],ok=!!(r&&!r.on&&r.frames.length);$('#mlReplay').disabled=!ok;$('#mlReview').disabled=!(r&&!r.on&&r.moves.length);$('#mlRec').hidden=!(r&&r.on);}
$('#mlList').addEventListener('click',e=>{const li=e.target.closest('.mv.click');if(!li)return;const r=RECS[M.key];if(!r||+li.dataset.id!==r.id)return;if(r.on){COACH.say('Replays unlock when this match ends. Keep fighting!','tip',4);return;}startReplay(+li.dataset.t-1.2);});
$('#mlReplay').addEventListener('click',()=>startReplay(0));$('#mlReview').addEventListener('click',()=>openReview());
$('#rReplay').addEventListener('click',e=>{e.stopPropagation();startReplay(0);});$('#rReview').addEventListener('click',e=>{e.stopPropagation();openReview();});
function recFrame(rdt){const r=RECS[M.key];if(!r||!r.on||PAUSE.on||RP.on||!M.snap)return;r.frames.push({t:r.t,s:M.snap(),env:E.env,ts:E.ts,cam:{x:E.cam.x,y:E.cam.y,z:E.cam.z}});r.t+=rdt;if(r.frames.length>9000)stopRec(M.key);}
const RP={on:false,t:0,playing:true,speed:0.5,mode:null,backup:null,opt:null,cam:{x:W/2,y:H/2,z:1}};
function recEnd(r){return r.frames.length?r.frames[r.frames.length-1].t:0;}
function startReplay(t){const r=RECS[M.key];if(!r||!r.frames.length||!M.applySnap)return;if(r.on)stopRec(M.key);if(CONTEXT_DETAILS.open)closeContextDetail({restore:false});if(typeof racePhoneToolsActive==='function'&&racePhoneToolsActive()){racePhoneTools.setAttribute('aria-expanded','false');setFloatingControllerCollapsed(false);syncRacePhoneTools();}if(!$('#dials').hidden)closeDials();hideResults();$('#rvBack').hidden=true;
  if(!RP.on){RP.backup=Object.assign({},M);RP.opt=Object.assign({},M.opt);RP.on=true;RP.mode=M.key;PARTS.length=0;E.title=null;E.slow=null;ENGINE.off();$('#lvlup').hidden=true;$('#toasts').innerHTML='';$('#rbar').hidden=false;$('#pad').hidden=true;$('#dialTop').hidden=true;syncDialsAvailability();}
  RP.t=clamp(t||0,0,recEnd(r));RP.playing=true;feedSig='';syncRbar();}
function exitReplay(){if(!RP.on)return;Object.assign(M,RP.backup);Object.assign(M.opt,RP.opt);RP.on=false;E.env=0;E.ts=1;E.slow=null;$('#rbar').hidden=true;$('#pad').hidden=false;$('#dialTop').hidden=false;syncDialsAvailability();resetFeed();document.querySelectorAll('#mlList .cur').forEach(x=>x.classList.remove('cur'));setLabel();if(HUD.lvlPending){const n=HUD.lvlPending;HUD.lvlPending=0;showLevelUp(n);}}
function replayStep(rdt){const r=RECS[RP.mode],F=r.frames,end=recEnd(r);if(RP.playing){RP.t+=rdt*RP.speed;if(RP.t>=end){RP.t=end;RP.playing=false;syncRbar();}}
  let lo=0,hi=F.length-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(F[mid].t<=RP.t)lo=mid;else hi=mid-1;}const f=F[lo];M.applySnap(f.s,r);E.env=f.env;E.ts=f.ts;RP.cam=f.cam;
  $('#rbScrub').value=String(Math.round(RP.t/Math.max(end,0.001)*1000));$('#rbTime').textContent=`${fmtT(RP.t)} / ${fmtT(end)}`;}
function syncRbar(){$('#rbPlay').textContent=RP.playing?'Pause':'Play';document.querySelectorAll('.rb-sp button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.sp===RP.speed)));}
$('#rbPlay').addEventListener('click',()=>{const r=RECS[RP.mode];if(!RP.playing&&RP.t>=recEnd(r))RP.t=0;RP.playing=!RP.playing;syncRbar();});
$('#rbBack').addEventListener('click',()=>{RP.t=Math.max(0,RP.t-3);});
document.querySelectorAll('.rb-sp button').forEach(b=>b.addEventListener('click',()=>{RP.speed=+b.dataset.sp;syncRbar();}));
$('#rbScrub').addEventListener('input',()=>{const r=RECS[RP.mode];RP.t=(+$('#rbScrub').value/1000)*recEnd(r);RP.playing=false;syncRbar();});
$('#rbExit').addEventListener('click',exitReplay);$('#rbReview').addEventListener('click',()=>{RP.playing=false;syncRbar();openReview();});
function drawReplayBadge(c){if(!RP.on)return;c.save();c.fillStyle='rgba(8,13,28,0.85)';rr(c,W/2-120,10,240,30,15);c.fill();c.strokeStyle=C.violet;c.lineWidth=1.5;c.stroke();
  c.fillStyle=C.violet;c.beginPath();c.arc(W/2-100,25,5,0,Math.PI*2);c.fill();text(c,`REPLAY ${RP.speed===1?'1×':RP.speed===0.5?'½×':'¼×'} · ${fmtT(RP.t)}`,W/2+6,30,'700 13px '+MONO,C.ink,'center');c.restore();}
function openReview(){const r=RECS[M.key];if(!r||!r.moves.length||!M.review)return;if(r.on)stopRec(M.key);if(CONTEXT_DETAILS.open)closeContextDetail({restore:false});hideResults();const d=M.review(r),co=COACHES[M.key];
  const el=$('#rvBack'),race=M===Race,themes=race?raceResultCoachSummary(r,(LASTG[M.key+r.id]||d.grade)!=='D',{title:$('#rTitle').textContent||(Race.state==='crashed'?'Off the track':'Race complete')}):null;$('#review').style.setProperty('--cc',co.col);$('#review').classList.toggle('race-review',race);$('#lvlup').hidden=true;$('#toasts').innerHTML='';$('#rvAv').textContent=co.ini;$('#rvKick').textContent=`${co.name.toUpperCase()} · REVIEW`;$('#rvTitle').textContent=d.title;
  const g=LASTG[M.key+r.id]||d.grade||'';$('#rvGrade').textContent=g;$('#rvGrade').style.color=GRADE_TONE[g]||C.ink;
  const item=(x,work)=>`<li><span class="tm">${fmtT(x.t)}</span><div><b>${x.text}</b>${x.math?`<small>${x.math}</small>`:''}${x.tip?`<em>${x.tip}</em>`:''}</div>${x.t!=null?`<button type="button" data-t="${x.t}">▶ Watch</button>`:''}</li>`;
  $('#rvBody').innerHTML=`<div class="rv-stats">${d.stats.map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
    <div class="rv-cols"><div class="rv-sec best"><h3>${race?'What worked':'Best moves'}</h3>${race?'<p class="rv-theme-summary" id="rvRacePositive"></p>':''}<ul>${d.best.length?d.best.map(x=>item(x)).join(''):race?'<li><span></span><div>No standout move was logged.</div></li>':'<li><span></span><div>Nothing stood out yet. Next time!</div></li>'}</ul></div>
    <div class="rv-sec work"><h3>${race?'Next focus':'Needs work'}</h3>${race?'<p class="rv-theme-summary" id="rvRaceFocus"></p>':''}<ul>${d.work.length?d.work.map(x=>item(x,true)).join(''):race?'<li><span></span><div>No major mistake was logged; use this focus on the next run.</div></li>':'<li><span></span><div><b>Clean!</b> No big mistakes.</div></li>'}</ul></div></div>
    <div class="rv-sec plan"><h3>${co.name.split(' ').pop()}\u2019s plan for next time</h3><ol>${d.plan.map(t=>`<li>${t}</li>`).join('')}</ol></div>
    <div class="rv-foot"><button type="button" id="rvAll">▶ Replay whole ${d.noun||'match'}</button><button type="button" class="alt" id="rvDone">Back to the game</button></div>`;
  if(themes){$('#rvRacePositive').textContent=themes.positive;$('#rvRaceFocus').textContent=themes.focus;}el.hidden=false;$('#rvClose').focus();el.querySelectorAll('li button[data-t]').forEach(b=>b.addEventListener('click',()=>startReplay(+b.dataset.t-1.2)));
  $('#rvAll').addEventListener('click',()=>startReplay(0));$('#rvDone').addEventListener('click',()=>{el.hidden=true;exitReplay();});}
$('#rvClose').addEventListener('click',()=>{$('#rvBack').hidden=true;});
$('#rvBack').addEventListener('click',e=>{if(e.target.id==='rvBack')$('#rvBack').hidden=true;});
function topN(arr,n){return arr.sort((a,b)=>b.score-a.score).slice(0,n);}

