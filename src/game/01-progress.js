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
function hideResults(){stopRaceReplayPreview();$('#results').hidden=true;$('#results').classList.remove('mini','race-summary');clearTimeout(resultsTimer);clearTimeout(resultsDelay);tallyTimers.forEach(clearTimeout);tallyTimers=[];if(typeof syncDialsAvailability==='function')syncDialsAvailability();}
let resultsDelay=null;
function resOpen(){const el=$('#results');return!el.hidden&&!el.classList.contains('mini');}
function roundOver(){if(M.key==='fight')return!!(M.bout&&M.bout.over);if(M.key==='kick'&&M.opt.shot==='dribble')return Drib.state==='done';return M.state==='done'||M.state==='crashed';}
function ackResults(){if(!resOpen())return;if(M===Race&&$('#rNext').hidden){$('#rRaceGarage').focus();return;}SND.click();if(M===Race&&(RACE_MULTI_UI.match||RACE_CHAMP_UI.active&&RACE_CHAMP_UI.last?.passed)){hideResults();if(RACE_CHAMP_UI.active)$('#raceChampionshipEvents [aria-pressed="true"]')?.focus();return;}hideResults();if(MATCH.on)return;if(typeof CONTINUOUS!=='undefined'&&CONTINUOUS.on){CONTINUOUS.advance();return;}if(!roundOver())return;
  if(M.key==='fight'){M.reset();renderActions();COACH.say(M.introLine(),'tip',12);}else{M.reset();if(typeof setLabel==='function')setLabel();renderActions();}}
$('#rNext').addEventListener('click',e=>{e.stopPropagation();unlock();if(M===Race&&resOpen()&&e.currentTarget.dataset.raceAction==='next'){hideResults();$('#raceChampionshipNext').click();return;}ackResults();});
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
function raceResultCoachSummary(record,passed,result){
  const moves=record?.moves||[],entry=moves.find(move=>move.kind==='entry'),brake=moves.find(move=>move.kind==='brake'),finish=moves.find(move=>move.kind==='finish'),crash=moves.find(move=>move.kind==='crash'),slide=moves.find(move=>move.kind==='slide');
  const safeEntry=entry&&Number.isFinite(entry.v)&&Number.isFinite(entry.vmax)&&entry.vmax>0&&entry.v<=entry.vmax*1.02;
  const mode=Race.expansionActive()?Race.mode():null;
  let positive=brake?.tone==='good'?'Your braking was on target before the corner.':safeEntry?'You entered the corner within its speed limit.':passed&&finish?'You reached the finish.':entry?'You reached the corner entry.':brake?'You made a braking attempt before the corner.':passed?'You completed the run.':'You started the run.';
  let focus;
  if(entry&&Number.isFinite(entry.v)&&Number.isFinite(entry.vmax)&&entry.vmax>0&&entry.v>entry.vmax*1.02)focus='Brake earlier to enter below the corner limit.';
  else if(brake?.tone==='bad')focus=brake.d2c<brake.dN?'Start braking earlier on the straight.':'Brake later while keeping the corner entry controlled.';
  else if(crash&&!brake)focus='Brake on the straight before the corner.';
  else if(slide)focus='Ease the wheel or speed to stay within tire grip.';
  else if(entry&&Number.isFinite(entry.v)&&Number.isFinite(entry.vmax)&&entry.vmax>0&&entry.v<entry.vmax*.85)focus='Carry more speed into the corner without exceeding its limit.';
  else if(!passed){const category=Race.progressionOutcome?.failed?.[0];focus=category?`Adjust ${category} in Garage before retrying.`:/off the track/i.test(result.title)?'Keep the car inside the track boundary on the retry.':mode?.id==='endurance'?'Set a steadier lap pace before retrying.':mode?.course==='straight'?'Hold the center line through the next run.':'Hold the racing line through the next corner.';}
  else if(entry)focus='Brake later while keeping entry speed below the corner limit.';
  else if(mode?.id==='endurance')focus='Keep your lap times closer together on the next run.';
  else if(mode?.course==='straight')focus='Hold launch traction longer before the next shift.';
  else focus='Brake later while keeping entry speed below the corner limit.';
  return{positive,focus};
}
function showResults(m){hideResults();const el=$('#results'),rc=$('#rc');const rr0=RECS[M.key];if(rr0)LASTG[M.key+rr0.id]=m.grade;$('#racts').hidden=!(rr0&&rr0.frames.length&&rr0.moves.length);if(RACE_COMPETITION.enabled())raceCompetitionResultActions();rc.style.setProperty('--tone',GRADE_TONE[m.grade]||C.good);
  const race=M===Race&&!m.auto;el.classList.toggle('race-summary',race);el.querySelector('.rgo').classList.remove('sole-action');$('#rNext').hidden=false;$('#raceResultCoach').hidden=!race;$('#raceResultAwards').hidden=true;$('#raceResultAwards').replaceChildren();$('#raceReplayBlock').hidden=true;$('#rRaceGarage').hidden=true;$('#rRaceNext').hidden=true;
  if(race){const passed=m.grade!=='D',summary=raceResultCoachSummary(rr0,passed,m);
    $('#raceResultCoachPositive').textContent=summary.positive;$('#raceResultCoachFocus').textContent=summary.focus;
    const coachReview=!!(rr0?.moves?.length&&Race.review);$('#raceResultCoach').disabled=!coachReview;$('#raceResultCoachAction').hidden=!coachReview;$('#raceResultCoach').title=coachReview?'Open detailed Coach review':'Detailed review requires recorded moves';
    const awards=$('#raceResultAwards'),earned=RACE_COMP_UI.last?.profileId===profileManager.active().id?RACE_COMP_UI.last.earned:null;
    const badges=[...(Race.resultBadges||[])],sameName=(a,b)=>String(a||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US')===String(b||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
    const matched=earned?badges.findIndex(name=>sameName(name,earned.name)):-1;
    if(earned){const card=document.createElement('button');card.type='button';card.className='race-result-award';card.dataset.awardKind='journey';card.innerHTML=`<img src="assets/awards/race/v1/${earned.id}.webp" alt=""><div><span></span><b></b><small></small><em>View award journey ›</em></div>`;card.querySelector('span').textContent=matched>=0?'NEW COLLECTIBLE + BADGE':'NEW RACE COLLECTIBLE';card.querySelector('b').textContent=earned.name;card.querySelector('small').textContent=matched>=0?'Collectible saved to this profile · cosmetic · Badge unlocked · +200 XP':'Saved to this profile · cosmetic';awards.append(card);}
    if(matched>=0)badges.splice(matched,1);
    if(m.raceAward){const card=document.createElement('button');card.type='button';card.className='race-result-award';card.dataset.awardKind='season';card.innerHTML=`<img src="assets/awards/race/v1/${m.raceAwardId||'core'}.webp" alt=""><div><span>SEASON AWARD</span><b></b><small>Saved to this profile</small><em>View season details ›</em></div>`;card.querySelector('b').textContent=m.raceAward;awards.append(card);}
    for(const badge of badges){const card=document.createElement('button');card.type='button';card.className='race-result-badge';card.dataset.awardKind='journey';card.innerHTML='<img src="assets/awards/race/v1/core.webp" alt=""><div><span>BADGE UNLOCKED · +200 XP</span><b></b><em>View award journey ›</em></div>';card.querySelector('b').textContent=badge;awards.append(card);}
    awards.hidden=!awards.childElementCount;
    const validNext=passed&&RACE_CHAMP_UI.active&&RACE_CHAMP_UI.last?.passed&&RACE_CHAMP_UI.last.next&&RACE_CHAMP_UI.selected<RACE_CHAMP.EVENTS.length-1&&RACE_CHAMP.unlocked(best.raceChampionship,RACE_CHAMP_UI.selected+1);
    const match=!!RACE_MULTI_UI.match,soleSave=passed&&!validNext&&!match;
    $('#rNext').dataset.raceAction=validNext?'next':match?'match':passed?'save':'retry';
    $('#rNext').hidden=soleSave;el.querySelector('.rgo').classList.toggle('sole-action',soleSave);
    $('#rRaceGarage').hidden=false;
    $('#rRaceGarage').textContent='Save & Exit';
    $('#rReview').hidden=true;$('#rReplay').hidden=true;$('#rRaceBoard').hidden=true;$('#racts').hidden=true;
    const recorded=!!rr0?.frames?.length,visualReplay=recorded&&!!rr0.preview3d?.length;$('#raceReplayBlock').hidden=!recorded;$('#raceReplayPreview').hidden=!visualReplay;$('#raceReplayFallback').hidden=!recorded||visualReplay;if(visualReplay)startRaceReplayPreview(rr0);
    document.querySelectorAll('#toasts .toast').forEach(note=>note.remove());syncRacePhoneNoticeSlot();
  }else{$('#rReview').hidden=false;$('#rReplay').hidden=false;}
  $('#rGrade').innerHTML=`${m.grade}<small>GRADE</small>`;$('#rTitle').textContent=m.title;$('#rSub').textContent=race?'':m.sub||'';$('#rHint').textContent=race?'':m.hint||'';$('#results .rtotal span').textContent=m.seasonPoints?'Event points':'XP earned';
  const rowsHTML=m.rows.map(([l,x],i)=>`<li style="animation-delay:${0.25+i*0.13}s"><span>${l}</span><b>+${fmt(x,0)}</b></li>`).join('')+(m.mult>1?`<li class="cmb" style="animation-delay:${0.25+m.rows.length*0.13}s"><span>combo streak applied</span><b>×${m.mult}</b></li>`:'');
  $('#rRows').innerHTML=rowsHTML;$('#rTotal').textContent='+0';el.classList.toggle('mini',!!m.auto);el.hidden=false;if(typeof syncDialsAvailability==='function')syncDialsAvailability();if(typeof renderMathConsole==='function')renderMathConsole();$('#rLvl').hidden=true;SND.grade(m.grade);if(!m.auto&&LVL_STASH){const n=LVL_STASH;LVL_STASH=0;setTimeout(()=>{if(resOpen())lvlRibbon(n);},500);}if(!m.auto){const next=typeof CONTINUOUS!=='undefined'&&CONTINUOUS.on?CONTINUOUS.nextLabel():(m.next||'Next round');$('#rNext').innerHTML=next+' <span aria-hidden="true">▶</span> <kbd>Space</kbd>';}setTimeout(refreshResBoard,0);
  const start=250+m.rows.length*130+(m.mult>1?130:0);for(let i=0;i<m.rows.length;i++)tallyTimers.push(setTimeout(()=>SND.tick(),250+i*130));
  const steps=14;for(let k=1;k<=steps;k++)tallyTimers.push(setTimeout(()=>{$('#rTotal').textContent='+'+fmt(Math.round(m.tot*k/steps),0);if(k%3===0)SND.tick();if(k===steps){SND.total();const md=$('#medal');md.classList.remove('bump');void md.offsetWidth;md.classList.add('bump');}},start+k*40));
  if(race&&!$('#rNext').hidden)$('#rNext').textContent=RACE_MULTI_UI.match?'Match controls':$('#rNext').dataset.raceAction==='next'?'Continue to next':'Retry';
  if(m.auto){$('#racts').hidden=true;resultsTimer=setTimeout(()=>{$('#results').hidden=true;$('#results').classList.remove('mini');},2100);}}
$('#rRaceGarage').addEventListener('click',event=>{event.stopPropagation();if(M!==Race||!resOpen())return;
  // Awards and progression have already been applied. This writes the same profile
  // through the canonical store and verifies it before leaving the result.
  saveBest();let persisted=false;try{const saved=JSON.parse(localStorage.getItem(PROFILE_CORE.PROFILE_KEY));persisted=JSON.stringify(saved.profiles.find(profile=>profile.id===profileManager.active().id)?.progress)===JSON.stringify(best);}catch(_){}
  if(!persisted){$('#rHint').textContent='Could not save on this device. Free up space or allow local storage, then try again.';return;}
  if(RECS.race?.on)stopRec('race');showModeHome({preserveRaceResult:true});
});
$('#rRaceNext').addEventListener('click',event=>{event.stopPropagation();$('#raceChampionshipNext').click();});
$('#raceResultCoach').addEventListener('click',event=>{event.stopPropagation();if(!event.currentTarget.disabled)openReview();});
$('#raceResultAwards').addEventListener('click',event=>{const card=event.target.closest('[data-award-kind]');if(!card)return;event.stopPropagation();if(card.dataset.awardKind==='season'){hideResults();racePhoneProgress.click();}else{RACE_COMP_UI.category=RACE_COMP_UI.last?.category||'core';openBoard(card);}});
$('#raceReplayPreview').addEventListener('click',event=>{event.stopPropagation();startReplay(0);});
$('#raceReplayFallback').addEventListener('click',event=>{event.stopPropagation();startReplay(0);});
function captureRace3DPreviewFrame(force=false){
  const record=RECS.race;if(M!==Race||!RACE_3D.on||!RACE_3D.ready||!record?.frames.length||RP.on||!force&&(Race.state!=='run'||!record.on))return false;
  const now=performance.now();if(!force&&now-(record.preview3dAt||0)<450)return false;
  const source=RACE_VIDEO.source();if(!source)return false;
  try{
    const frame=document.createElement('canvas');frame.width=360;frame.height=240;const context=frame.getContext('2d',{willReadFrequently:true}),aspect=frame.width/frame.height,sw=Math.min(source.width,source.height*aspect),sh=sw/aspect,car=globalThis.__KICKLAB_RACE_3D__?.composition?.carCenter||[.5,.62],sx=clamp(source.width*car[0]-sw*.5,0,source.width-sw),sy=clamp(source.height*car[1]-sh*.76,0,source.height-sh);
    context.drawImage(source,sx,sy,sw,sh,0,0,frame.width,frame.height);
    const pixels=context.getImageData(0,0,frame.width,frame.height).data;let visible=false;for(const [x,y] of [[180,40],[90,120],[180,120],[270,120],[180,200]]){const i=(y*frame.width+x)*4;if(pixels[i+3]>0&&pixels[i]+pixels[i+1]+pixels[i+2]>40){visible=true;break;}}if(!visible)return false;
    record.preview3d||=[];record.preview3d.push({canvas:frame,t:record.t});if(record.preview3d.length>8)record.preview3d.shift();record.preview3dAt=now;return true;
  }catch(_){return false;}
}
const RACE_REPLAY_PREVIEW={timer:0,started:0,frames:null};
function stopRaceReplayPreview(){clearInterval(RACE_REPLAY_PREVIEW.timer);RACE_REPLAY_PREVIEW.timer=0;RACE_REPLAY_PREVIEW.frames=null;}
function drawRaceReplayPreview(){
  const frames=RACE_REPLAY_PREVIEW.frames;if(!frames?.length)return;
  const canvas=$('#raceReplayCanvas'),context=canvas.getContext('2d'),phase=matchMedia('(prefers-reduced-motion:reduce)').matches?.5:(performance.now()-RACE_REPLAY_PREVIEW.started)%3000/3000,index=Math.min(frames.length-1,Math.floor(phase*frames.length));
  context.drawImage(frames[index].canvas,0,0,canvas.width,canvas.height);
}
function startRaceReplayPreview(record){stopRaceReplayPreview();RACE_REPLAY_PREVIEW.frames=record.preview3d;RACE_REPLAY_PREVIEW.started=performance.now();drawRaceReplayPreview();if(!matchMedia('(prefers-reduced-motion:reduce)').matches)RACE_REPLAY_PREVIEW.timer=setInterval(()=>{if(!document.hidden&&!$('#results').hidden)drawRaceReplayPreview();},120);}

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

