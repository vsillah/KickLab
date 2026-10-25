/* ---------- saved bests ---------- */
const profileManager=PROFILE_CORE.createManager(localStorage);
function normalizedProgress(input={}){const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};return Object.assign({punch:0,lap:0,goals:0,xp:0,badges:{},style:{fight:'red',race:'stock',kick:'classic'},ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'},stats:{plays:{fight:0,race:0,kick:0},wins:{fight:0,race:0,kick:0}}},source,{kickTime:GAME_CORE.normalizeKickTime(source.kickTime),badges:Object.assign({},source.badges||{}),style:Object.assign({fight:'red',race:'stock',kick:'classic'},source.style||{}),ch:Object.assign({fight:0,race:0,kick:0},source.ch||{}),play:Object.assign({fight:'ch',race:'ch',kick:'ch'},source.play||{}),raceGarage:globalThis.KickLabRaceGarage.normalize(source.raceGarage),raceProgression:globalThis.KickLabRaceProgression.normalize(source.raceProgression),...(globalThis.KickLabRaceModes.enabled()?{raceModes:globalThis.KickLabRaceModes.normalize(source.raceModes)}:{}),...(globalThis.KickLabRaceCompetition.enabled()?{raceCompetition:globalThis.KickLabRaceCompetition.normalize(source.raceCompetition)}:{}),...(globalThis.KickLabRaceChampionship.enabled()?{raceChampionship:globalThis.KickLabRaceChampionship.normalize(source.raceChampionship)}:{}),stats:{plays:Object.assign({fight:0,race:0,kick:0},source.stats&&source.stats.plays||{}),wins:Object.assign({fight:0,race:0,kick:0},source.stats&&source.stats.wins||{})}});}
const store={get(){return profileManager.active().progress;},set(o){profileManager.saveActiveProgress(o);}};
const best=normalizedProgress(store.get());
function renderScores(){$('#sPunch').textContent=best.punch?fmt(best.punch,0)+' N':'—';$('#sLap').textContent=best.lap?fmt(best.lap,2)+' s':'—';$('#sGoals').textContent=String(best.goals||0);}
function saveBest(){store.set(best);renderScores();if(typeof renderProfileSurfaces==='function')renderProfileSurfaces();}

/* ---------- XP, levels, combos, badges ---------- */
const LEVEL_T=['Rookie','Trainee','Lab Assistant','Physicist','Pro Physicist','Master Scientist','Legend'];
const lvlOf=xp=>{let n=1;while(xp>=200*n*(n+1))n++;return n;};
const COSMETICS={fight:{id:'glove',label:'Gloves',items:[['red','Red',1,'#c83a3a'],['gold','Gold',2,'#e2b23c'],['neon','Neon',5,'#27c7ff']]},
  race:{id:'paint',label:'Paint',items:[['stock','Stock',1,null],['pink','Neon pink',3,'#ff5fb5'],['gold','Gold',6,'#e2b23c']]},
  kick:{id:'ball',label:'Ball',items:[['classic','Classic',1,'#f3f6fb'],['gold','Golden',4,'#f0c24a'],['ember','Ember',7,'#ff7a45']]}};
best.style=Object.assign({fight:'red',race:'stock',kick:'classic'},best.style||{});
function styleCol(mode){const it=COSMETICS[mode].items.find(x=>x[0]===best.style[mode]);return it&&lvlOf(best.xp)>=it[2]?it[3]:COSMETICS[mode].items[0][3];}
function unlocksAt(n){const out=[];Object.entries(COSMETICS).forEach(([m,c])=>c.items.forEach(it=>{if(it[2]===n)out.push(`${it[1]} ${c.label.toLowerCase()}`);}));return out;}
function nextUnlock(n){for(let k=n+1;k<=12;k++){const u=unlocksAt(k);if(u.length)return{k,u};}return null;}
const HUD={disp:best.xp,sess:0,sessDisp:0,hold:0,lvl:lvlOf(best.xp),shown:-1};
function paintXP(){const x=HUD.disp,n=lvlOf(x),lo=200*(n-1)*n,hi=200*n*(n+1),pct=clamp((x-lo)/(hi-lo)*100,0,100);
  $('#medal').style.setProperty('--p',pct+'%');$('#lvlNum').textContent=String(n);$('#lvlName').textContent=LEVEL_T[Math.min(n-1,LEVEL_T.length-1)];
  $('#xpTxt').textContent=`${fmt(x,0)} / ${fmt(hi,0)} XP`;$('#xpBar').style.width=pct+'%';$('#sessXP').textContent='+'+fmt(HUD.sessDisp,0);
  const nu=nextUnlock(n);$('#nextUnlock').innerHTML=nu?`${fmt(hi-x,0)} XP to level ${n+1}${nu.k===n+1?` · unlocks <b>${nu.u.join(', ')}</b>`:` · next unlock at level ${nu.k}: <b>${nu.u[0]}</b>`}`:`${fmt(hi-x,0)} XP to level ${n+1}`;
  $('#sBadges').textContent=`${Object.keys(best.badges).length}/${Object.values(BADGES).reduce((a,l)=>a+l.length,0)}`;}
function renderXP(){paintXP();}
function tickHUD(rdt){const now=performance.now();if(now>HUD.hold){const gap=best.xp-HUD.disp;if(gap>0.5){HUD.disp+=Math.max(gap*rdt*3,rdt*120);if(HUD.disp>best.xp)HUD.disp=best.xp;}else HUD.disp=best.xp;
    const sg=HUD.sess-HUD.sessDisp;HUD.sessDisp=sg>0.5?Math.min(HUD.sess,HUD.sessDisp+Math.max(sg*rdt*3,rdt*120)):HUD.sess;}
  const r=Math.round(HUD.disp)+Math.round(HUD.sessDisp)*1e6;if(r!==HUD.shown){HUD.shown=r;paintXP();}
  const L=lvlOf(HUD.disp);if(L>HUD.lvl){HUD.lvl=L;showLevelUp(L);}}
const STREAK={fight:0,race:0,kick:0};
let resultsTimer=null,tallyTimers=[];
function hideResults(){$('#results').hidden=true;$('#results').classList.remove('mini','race-summary');clearTimeout(resultsTimer);clearTimeout(resultsDelay);tallyTimers.forEach(clearTimeout);tallyTimers=[];if(typeof syncDialsAvailability==='function')syncDialsAvailability();}
let resultsDelay=null;
function resOpen(){const el=$('#results');return!el.hidden&&!el.classList.contains('mini');}
function roundOver(){if(M.key==='fight')return!!(M.bout&&M.bout.over);if(M.key==='kick'&&M.opt.shot==='dribble')return Drib.state==='done';return M.state==='done'||M.state==='crashed';}
function ackResults(){if(!resOpen())return;SND.click();if(M===Race&&(RACE_MULTI_UI.match||RACE_CHAMP_UI.active&&RACE_CHAMP_UI.last?.passed)){hideResults();if(RACE_CHAMP_UI.active)$('#raceChampionshipEvents [aria-pressed="true"]')?.focus();return;}hideResults();if(MATCH.on)return;if(typeof CONTINUOUS!=='undefined'&&CONTINUOUS.on){CONTINUOUS.advance();return;}if(!roundOver())return;
  if(M.key==='fight'){M.reset();renderActions();COACH.say(M.introLine(),'tip',12);}else{M.reset();if(typeof setLabel==='function')setLabel();renderActions();}}
$('#rNext').addEventListener('click',e=>{e.stopPropagation();unlock();ackResults();});
function award(mode,items,success,meta={}){if(mode==='kick'&&MATCH.on&&!meta.auto&&!MATCH.lock){MATCH.lock=true;const ok=success;meta=Object.assign({},meta,{auto:true,delay:0,after:()=>setTimeout(()=>MATCH.next(ok),1900)});}if(success)STREAK[mode]++;else STREAK[mode]=0;const mult=success?1+0.25*Math.min(Math.max(STREAK[mode]-1,0),4):1;
  const rows=items.filter(i=>i[1]>0).map(([l,x])=>[l,Math.round(x*mult)]);const tot=rows.reduce((a,r)=>a+r[1],0);
  best.xp+=tot;best.stats.plays[mode]=(best.stats.plays[mode]||0)+1;if(success)best.stats.wins[mode]=(best.stats.wins[mode]||0)+1;HUD.sess+=tot;saveBest();renderStreak();
  if(mode==='kick'&&LIVEM.on&&!meta.live){LIVEM.result(success);return;}
  const delay=Math.max(meta.delay||0,meta.auto?0:1000),t0=performance.now(),tally=rows.length*130+(mult>1?130:0)+900;let saw=!!E.slow;HUD.hold=t0+delay+tally;
  const go0=()=>{resultsDelay=null;HUD.hold=performance.now()+tally;showResults(Object.assign({rows,mult,tot},meta));if(meta.after)meta.after();},
    go=()=>{if(success&&mode==='kick'&&!meta.auto&&!CINE.on){resultsDelay=null;const model=Kick.opt.shot==='dribble'?Drib:Kick;CINE.start(Kick.opt.shot==='free'?'fk':Kick.opt.shot==='dribble'?'goal':'hd',go0,model,{celebrate:true});}else go0();};
  const wait=()=>{if(E.slow||PAUSE.on){saw=saw||!!E.slow;HUD.hold=performance.now()+tally+1600;resultsDelay=setTimeout(wait,80);return;}const now=performance.now(),need=Math.max(t0+delay,saw?(E.slowEnd||now)+AFTER_SLOW:0);if(now<need){resultsDelay=setTimeout(wait,Math.min(120,need-now));return;}go();};
  clearTimeout(resultsDelay);resultsDelay=setTimeout(wait,60);}
const AFTER_SLOW=1600;
const GRADE_TONE={S:'#f3e36b',A:'#5fe3a1',B:'#7fdcff',C:'#ffb04a',D:'#ff6b73'};
function showResults(m){hideResults();const el=$('#results'),rc=$('#rc');const rr0=RECS[M.key];if(rr0)LASTG[M.key+rr0.id]=m.grade;$('#racts').hidden=!(rr0&&rr0.frames.length&&rr0.moves.length);if(RACE_COMPETITION.enabled())raceCompetitionResultActions();rc.style.setProperty('--tone',GRADE_TONE[m.grade]||C.good);
  const race=M===Race&&!m.auto;el.classList.toggle('race-summary',race);$('#raceResultCoach').hidden=!race;$('#raceResultAwards').hidden=true;$('#raceResultAwards').replaceChildren();$('#rRaceGarage').hidden=!race||!!RACE_MULTI_UI.match;$('#rRaceNext').hidden=true;
  if(race){const passed=m.grade!=='D',raw=m.coach||Race.progressionReviewNote||'';
    let coach=raw.replace(/^Coach Nia:\s*/,'').split(/(?<=[.!?])\s+/).slice(0,2).join(' ');if(coach.length>180)coach=coach.slice(0,177).replace(/\s+\S*$/,'')+'…';
    $('#raceResultCoachText').textContent=coach|| (passed?'Good finish. Review your line, then choose the next run.':'Review your entry speed and setup before retrying.');
    const awards=$('#raceResultAwards'),earned=RACE_COMP_UI.last?.profileId===profileManager.active().id?RACE_COMP_UI.last.earned:null;
    if(earned){const card=document.createElement('article');card.className='race-result-award';card.innerHTML=`<img src="assets/awards/race/v1/${earned.id}.webp" alt=""><div><span>NEW RACE COLLECTIBLE</span><b></b><small>Saved to this profile · cosmetic</small></div>`;card.querySelector('b').textContent=earned.name;awards.append(card);}
    if(m.raceAward){const card=document.createElement('article');card.className='race-result-award';card.innerHTML=`<img src="assets/awards/race/v1/${m.raceAwardId||'core'}.webp" alt=""><div><span>SEASON AWARD</span><b></b><small>Saved to this profile</small></div>`;card.querySelector('b').textContent=m.raceAward;awards.append(card);}
    for(const badge of Race.resultBadges||[]){const card=document.createElement('article');card.className='race-result-badge';card.innerHTML='<img src="assets/awards/race/v1/core.webp" alt=""><div><span>BADGE UNLOCKED · +200 XP</span><b></b></div>';card.querySelector('b').textContent=badge;awards.append(card);}
    awards.hidden=!awards.childElementCount;
    $('#rRaceNext').hidden=!(RACE_CHAMP_UI.active&&RACE_CHAMP_UI.last?.passed&&RACE_CHAMP_UI.selected<RACE_CHAMP.EVENTS.length-1&&RACE_CHAMP.unlocked(best.raceChampionship,RACE_CHAMP_UI.selected+1));
    if(RACE_CHAMP_UI.active)$('#rRaceNext').textContent=`Next · ${RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected+1]?.name||'event'}`;
    $('#rRaceGarage').textContent=Race.expansionActive()?'Garage & tuning':'Garage';
    $('#rReview').hidden=!(rr0?.moves?.length&&Race.review);$('#rReplay').hidden=!(rr0?.frames?.length);$('#racts').hidden=false;
    document.querySelectorAll('#toasts .toast').forEach(note=>note.remove());syncRacePhoneNoticeSlot();
  }else{$('#rReview').hidden=false;$('#rReplay').hidden=false;}
  $('#rGrade').innerHTML=`${m.grade}<small>GRADE</small>`;$('#rTitle').textContent=m.title;$('#rSub').textContent=m.sub||'';$('#rHint').textContent=m.hint||'';$('#results .rtotal span').textContent=m.seasonPoints?'Event points':'XP earned';
  const rowsHTML=m.rows.map(([l,x],i)=>`<li style="animation-delay:${0.25+i*0.13}s"><span>${l}</span><b>+${fmt(x,0)}</b></li>`).join('')+(m.mult>1?`<li class="cmb" style="animation-delay:${0.25+m.rows.length*0.13}s"><span>combo streak applied</span><b>×${m.mult}</b></li>`:'');
  $('#rRows').innerHTML=rowsHTML;$('#rTotal').textContent='+0';el.classList.toggle('mini',!!m.auto);el.hidden=false;if(typeof syncDialsAvailability==='function')syncDialsAvailability();if(typeof renderMathConsole==='function')renderMathConsole();$('#rLvl').hidden=true;SND.grade(m.grade);if(!m.auto&&LVL_STASH){const n=LVL_STASH;LVL_STASH=0;setTimeout(()=>{if(resOpen())lvlRibbon(n);},500);}if(!m.auto){const next=typeof CONTINUOUS!=='undefined'&&CONTINUOUS.on?CONTINUOUS.nextLabel():(m.next||'Next round');$('#rNext').innerHTML=next+' <span aria-hidden="true">▶</span> <kbd>Space</kbd>';}setTimeout(refreshResBoard,0);
  const start=250+m.rows.length*130+(m.mult>1?130:0);for(let i=0;i<m.rows.length;i++)tallyTimers.push(setTimeout(()=>SND.tick(),250+i*130));
  const steps=14;for(let k=1;k<=steps;k++)tallyTimers.push(setTimeout(()=>{$('#rTotal').textContent='+'+fmt(Math.round(m.tot*k/steps),0);if(k%3===0)SND.tick();if(k===steps){SND.total();const md=$('#medal');md.classList.remove('bump');void md.offsetWidth;md.classList.add('bump');}},start+k*40));
  if(race)$('#rNext').textContent=RACE_MULTI_UI.match?'Match controls':RACE_CHAMP_UI.active?'Back to season':'Retry run';
  if(m.auto){$('#racts').hidden=true;resultsTimer=setTimeout(()=>{$('#results').hidden=true;$('#results').classList.remove('mini');},2100);}}
$('#rRaceGarage').addEventListener('click',event=>{event.stopPropagation();if(M!==Race)return;GARAGE_UI.active=Race.expansionActive()?Race.mode().preferred:'body';hideResults();openSettings('garage',event.currentTarget);});
$('#rRaceNext').addEventListener('click',event=>{event.stopPropagation();$('#raceChampionshipNext').click();});

let LVL_STASH=0;
function lvlRibbon(n){const u=unlocksAt(n),r=$('#rLvl');r.innerHTML=`LEVEL UP <b>${n}</b> ${LEVEL_T[Math.min(n-1,LEVEL_T.length-1)]}`+(u.length?` <small>· unlocked ${u.join(', ')}</small>`:'');r.hidden=false;SND.fanfare();energizeControlledPlayer('level-up',1800);
  COACH.say(`LEVEL ${n}! You're a ${LEVEL_T[Math.min(n-1,LEVEL_T.length-1)]} now.`+(u.length?` You unlocked ${u.join(' and ')}. Pick it under Style.`:' Keep stacking combos.'),'hype',10);if(M)renderOpts();}
function showLevelUp(n){if(M===Race&&['done','crashed'].includes(Race.state)){LVL_STASH=n;return;}if(typeof RP!=='undefined'&&RP.on){HUD.lvlPending=n;return;}if(typeof CINE!=='undefined'&&CINE.on){LVL_STASH=n;return;}
  if(resOpen()){lvlRibbon(n);return;}if(resultsDelay){LVL_STASH=n;return;}
  const el=$('#lvlup');el.classList.add('compact');$('#luNum').textContent=String(n);$('#luTitle').textContent=LEVEL_T[Math.min(n-1,LEVEL_T.length-1)];const u=unlocksAt(n);$('#luUnlock').textContent=u.length?'Unlocked: '+u.join(', '):'';
  el.hidden=true;void el.offsetWidth;el.hidden=false;SND.fanfare();energizeControlledPlayer('level-up',1800);clearTimeout(showLevelUp.t);showLevelUp.t=setTimeout(()=>{el.hidden=true;},2700);
  COACH.say(`LEVEL ${n}! You're a ${LEVEL_T[Math.min(n-1,LEVEL_T.length-1)]} now.`+(u.length?` You unlocked ${u.join(' and ')}. Pick it under Style.`:' Keep stacking combos.'),'hype',10);if(M)renderOpts();}
$('#lvlup').addEventListener('click',()=>{$('#lvlup').hidden=true;});
function syncRacePhoneNoticeSlot(){const stage=$('.stage');stage.classList.toggle('race-phone-notice-active',!!stage.querySelector('#toasts .race-phone-notice'));}
function toast(title,msg,opts={}){if(typeof RP!=='undefined'&&RP.on)return null;const phoneRace=document.documentElement.dataset.kicklabMode==='race';if(phoneRace&&document.activeElement===$('#racePhoneProgress'))return null;if(phoneRace)$('#toasts').replaceChildren();const t=document.createElement('div');t.className='toast'+(phoneRace?' race-phone-notice':'');t.setAttribute('role',opts.action?'region':'status');t.setAttribute('aria-live','polite');t.setAttribute('aria-label',title);t.innerHTML=`<div class="ic" aria-hidden="true">★</div><div class="toast-copy"><b></b><span></span>${opts.action?'<button type="button" class="toast-action"></button>':''}</div><button type="button" class="toast-close" aria-label="Dismiss">×</button>`;t.querySelector('b').textContent=title;t.querySelector('span').textContent=msg;t.querySelector('.toast-action')?.append(document.createTextNode(opts.action||''));t.querySelector('.toast-close').setAttribute('aria-label',`Dismiss ${title}`);$('#toasts').appendChild(t);if(phoneRace)syncRacePhoneNoticeSlot();
  let gone=false;const remove=()=>{if(gone)return;gone=true;t.classList.add('out');setTimeout(()=>{t.remove();if(phoneRace)syncRacePhoneNoticeSlot();},phoneRace?250:400);};t.querySelector('.toast-close').addEventListener('click',remove);const action=t.querySelector('.toast-action');if(action)action.addEventListener('click',()=>{opts.onAction&&opts.onAction();remove();});setTimeout(remove,phoneRace?Math.min(opts.hold||6200,4200):opts.hold||6200);return t;}
$('#toasts').addEventListener('pointerdown',e=>e.stopPropagation());
$('#toasts').addEventListener('keydown',e=>e.stopPropagation());
function renderStreak(){const n=STREAK[M.key],mult=1+0.25*Math.min(Math.max(n-1,0),4);$('#streak').textContent=n>1?`streak ${n} · combo ×${mult}`:'';$('#comboX').textContent='×'+mult;
  $('#pips').querySelectorAll('i').forEach((p,i)=>p.classList.toggle('on',i<Math.min(n,5)));}
const BADGES={
  fight:[['f_perfect','Perfect Timing','Land a punch with the needle in the green'],['f_3k','Heavy Hitter','Hit 3,000 N or more'],['f_glove','Glove Scientist','Punch once with Δt ≤ 8 ms and once with Δt ≥ 15 ms'],['f_combo','Combo King','Three perfect punches in a row'],['f_soft','Safety First','Land a punch under 1,000 N with Δt ≥ 30 ms'],['f_duck','Slip & Rip','Duck a high punch, then land an uppercut'],['f_123','One-Two-Upper','Land jab, cross, uppercut in one combo']],
  race:[['r_finish','Checkered Flag','Finish a run'],['r_clean','Clean Line','Finish without sliding at all'],['r_angle','Math Steering','Steer the corner within 8° of the needed wheel angle'],['r_wet','Rain Master','Finish with μ ≤ 0.6'],['r_fast','Under 15','Finish in under 15 seconds']],
  kick:[['k_goal','First Goal','Score a free kick'],['k_math','Math First','Score after both checks were green'],['k_blind','Blindfold','Score with the predicted path hidden'],['k_space','Off-World','Score with gravity that isn\'t Earth\'s'],['k_header','Header Hero','Score a header'],['k_bins','Top Bins','Score above 1.9 m at the goal line'],['k_skill','Take-On','Dribble past a defender and score'],['k_ankle','Ankle Breaker','Make a defender drift 1.2 m the wrong way'],['k_moves','Skill School','Score using 3 different skill moves'],['k_spin','Marseille Turn','Beat a defender with the 360 roulette and score'],['k_gk','Safe Hands','Keep out 4 of 6 shots in Goalkeeper mode'],['k_pass','Playmaker','Complete 4 of 5 passes in Passing mode'],['k_live','Ninety Minutes','Win a Live match'],['k_pso','Shootout Hero','Win a penalty shootout'],['k_save','Brick Wall','Save 2 penalties in one shootout'],['k_air','Air Superiority','Win 3 header duels'],['k_onetwo','Give and Go','Score a first-time shot off a one-two'],['k_bike','Overhead Hero','Score a bicycle kick'],['k_bar','Bar Down','Hit the crossbar 3 times in one challenge'],['k_match','Match Winner','Win a full match']]};
function badge(id){if(best.badges[id])return false;let b=null;Object.values(BADGES).forEach(l=>l.forEach(x=>{if(x[0]===id)b=x;}));best.badges[id]=Date.now();best.xp+=200;
  HUD.sess+=200;if(M===Race){Race.resultBadges||=[];Race.resultBadges.push(b[1]);}else setTimeout(()=>{toast('Badge unlocked · +200 XP',`${b[1]}: ${b[2]}`);SND.badge();},1400);saveBest();renderMissions();return true;}
function renderMissions(){const l=BADGES[M.key];const done=l.filter(b=>best.badges[b[0]]).length;$('#misTitle').textContent=`Missions · ${done}/${l.length}`;
  $('#missions').innerHTML=l.map(([id,n,d])=>`<li class="${best.badges[id]?'done':''}"><span class="ck">${best.badges[id]?'✓':''}</span><span><b>${n}</b><small>${d}</small></span><span class="xp">${best.badges[id]?'earned':'+200 XP'}</span></li>`).join('');}

