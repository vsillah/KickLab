/* Opt-in, device-only Race awards, rankings and replay export. */
const RACE_COMPETITION=globalThis.KickLabRaceCompetition;
const RACE_COMPETITION_ON=RACE_COMPETITION.enabled();
if(RACE_COMPETITION_ON)document.documentElement.dataset.raceCompetition='prototype';
const RACE_COMP_UI={category:'core',last:null,capture:null,file:null,url:null,storageWarning:false};
const RACE_AWARD_IMAGES=Object.fromEntries((RACE_COMPETITION_ON?RACE_COMPETITION.CATEGORIES:[]).map(cat=>{const image=new Image();image.src=`assets/awards/race/v1/${cat.id}.webp`;return[cat.id,image];}));
function raceAwardArt(id){return`<img src="assets/awards/race/v1/${id}.webp" alt="" loading="lazy">`;}
const RACE_JOURNEY_EMBLEM=Object.freeze({
  earned:'<span class="race-journey-emblem" aria-hidden="true"><svg viewBox="0 0 56 64" focusable="false"><path d="M28 3 50 11v18c0 14-9 25-22 32C15 54 6 43 6 29V11L28 3Z" fill="currentColor"/><path d="M28 9 44 15v14c0 10-6 19-16 25-10-6-16-15-16-25V15l16-6Z" fill="none" stroke="#fff4d8" stroke-width="2"/><path d="m18 29 7 7 14-16" fill="none" stroke="#163b3b" stroke-linecap="round" stroke-linejoin="round" stroke-width="5"/></svg></span>',
  locked:'<span class="race-journey-emblem" aria-hidden="true"><svg viewBox="0 0 64 72" focusable="false"><path d="M19 30v-9a13 13 0 0 1 26 0v9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="6"/><rect x="12" y="29" width="40" height="34" rx="7" fill="currentColor"/><circle cx="32" cy="45" r="3.5" fill="#162538"/><path d="M32 46v8" stroke="#162538" stroke-linecap="round" stroke-width="4"/></svg></span>'
});
function raceCompetitionResult(event){
  if(!RACE_COMPETITION.enabled())return;
  RACE_COMP_UI.last=null;
  if(!event.passed)return;
  const rec=RECS.race,profile=profileManager.active(),vehicle=Race.expansionActive()?Race.vehicle().name:Race.CARS[Race.opt.car].name;
  const result=RACE_COMPETITION.record(best.raceCompetition,{...event,vehicle});
  best.raceCompetition=result.state;saveBest();
  try{const saved=JSON.parse(localStorage.getItem(profileManager.key));RACE_COMP_UI.storageWarning=JSON.stringify(saved.profiles.find(row=>row.id===profile.id)?.progress?.raceCompetition)!==JSON.stringify(result.state);}catch(_){RACE_COMP_UI.storageWarning=true;}
  RACE_COMP_UI.last={profileId:profile.id,recId:rec?.id,category:event.category,score:event.score,vehicle,award:result.earned?.name||(result.state.awards[event.category]?RACE_COMPETITION.AWARDS[event.category].name:'Race result'),earned:result.earned?{id:result.awardId,name:result.earned.name}:null};
  if(RACE_COMP_UI.storageWarning)toast('Race record is session-only','Device storage could not save this award. Clear space before leaving this page.');
  // The result surface owns award and progress announcements for this run.
}
function raceCompetitionClear(){
  RACE_COMP_UI.last=null;
  document.querySelectorAll('.stage .race-award-toast').forEach(note=>note.remove());syncRacePhoneNoticeSlot();
  if(RACE_COMP_UI.capture){RACE_COMP_UI.capture.cancelled=true;try{RACE_COMP_UI.capture.recorder.stop();}catch(_){}RACE_COMP_UI.capture.stream.getTracks().forEach(track=>track.stop());RACE_COMP_UI.capture=null;}
  if(RP.on)exitReplay();
  if(RACE_COMP_UI.url)URL.revokeObjectURL(RACE_COMP_UI.url);
  RACE_COMP_UI.url=null;RACE_COMP_UI.file=null;$('#raceShare').hidden=true;
  RACE_COMP_UI.storageWarning=false;
  delete RECS.race;LOGS.race.length=0;
}
function raceCompetitionValue(category,score){return category==='core'?`${score.toFixed(2)} s`:`${Math.round(score).toLocaleString('en-US')} pts`;}
function renderRaceCompetition(){
  const section=$('#raceCompetition');section.hidden=!RACE_COMPETITION.enabled();if(section.hidden)return;
  if(section.nextElementSibling!==$('#fboard .fb-source'))$('#fboard .fb-source').before(section);
  const cats=RACE_COMPETITION.CATEGORIES,cat=cats.find(c=>c.id===RACE_COMP_UI.category)||cats[0],progress=RACE_COMPETITION.normalize(best.raceCompetition),rows=RACE_COMPETITION.rows(profileManager.list(),cat.id),active=profileManager.active(),mine=rows.find(row=>row.profileId===active.id),entry=progress.bests[cat.id];
  $('#raceCompetitionCats').innerHTML=cats.map(c=>`<button type="button" data-race-comp-cat="${c.id}" aria-pressed="${c.id===cat.id}">${c.name}</button>`).join('');
  $('#raceCompetitionStats').innerHTML=`<div><span>Your best</span><b>${entry?raceCompetitionValue(cat.id,entry.score):'—'}</b><small>${entry?.previous?`Improved from ${raceCompetitionValue(cat.id,entry.previous)}`:entry?'First recorded best':'Complete a qualifying run'}</small></div><div><span>Device rank</span><b>${mine?'#'+mine.rank:'—'}</b><small>${rows.length?`${rows.length} local racer${rows.length===1?'':'s'}`:'No local scores yet'}</small></div><div><span>Progress</span><b>${Object.keys(progress.awards).length} / ${cats.length}</b><small>cosmetic awards earned</small></div>`;
  $('#raceCompetitionList').innerHTML=rows.length?rows.map(row=>`<li class="${row.profileId===active.id?'is-you':''}"><strong>#${row.rank}</strong><span>${row.alias}<small> · ${RACE_COMPETITION.AWARDS[cat.id].name}${row.profileId===active.id?' · playing now':''}</small></span><b>${raceCompetitionValue(cat.id,row.score)}</b></li>`).join(''):`<li class="empty">No ${cat.name.toLowerCase()} scores on this device yet. Finish a qualifying run to start this board.</li>`;
  section.querySelector('.race-competition-warning')?.remove();if(RACE_COMP_UI.storageWarning)$('#raceCompetitionStats').insertAdjacentHTML('afterend','<p class="race-competition-warning">This session’s record could not be saved to device storage. Clear space before leaving the page.</p>');
  const journey=RACE_COMPETITION.journey(progress),target=journey.find(item=>item.status==='available');
  $('#raceJourneyNext').textContent=target?`NEXT · ${target.name} — ${target.requirement}`:'Journey complete · all six collectibles earned on this profile';
  $('#raceCompetitionAwards').innerHTML=journey.map(item=>`<article class="race-journey-card ${item.status}" aria-label="Chapter ${item.index+1}: ${item.name}. ${item.status}. ${item.requirement}. ${item.progress}."><div class="race-journey-art">${raceAwardArt(item.id)}${RACE_JOURNEY_EMBLEM[item.status]||''}</div><div class="race-journey-copy"><span class="race-journey-chapter">${String(item.index+1).padStart(2,'0')} / ${item.chapter}</span><h4>${item.name}</h4><p>${item.requirement}</p><small>${item.status==='earned'?'Collected · '+item.perk:item.progress}</small></div><span class="race-journey-state">${item.status==='earned'?'Earned':item.status==='available'?'Ready':'Locked'}</span></article>`).join('');
}
function raceCompetitionProfilePerk(){if(!RACE_COMPETITION.enabled())return;const earned=RACE_COMPETITION.journey(best.raceCompetition).filter(item=>item.status==='earned');if(!earned.length)return;const item=earned.at(-1);$('#profileSummary').insertAdjacentHTML('beforeend',`<div class="profile-achievement race-profile-perk">${raceAwardArt(item.id)}<span><b>${item.name}</b><small>${earned.length} of 6 Race collectibles · this profile</small></span></div>`);}
$('#raceCompetitionCats').addEventListener('click',event=>{const button=event.target.closest('[data-race-comp-cat]');if(!button)return;RACE_COMP_UI.category=button.dataset.raceCompCat;renderRaceCompetition();button.focus();});
function raceCompetitionResultActions(){const active=RACE_COMP_UI.last&&RACE_COMP_UI.last.profileId===profileManager.active().id&&RACE_COMP_UI.last.recId===RECS.race?.id&&M===Race&&RACE_COMPETITION.enabled();$('#rRaceBoard').hidden=!RACE_COMPETITION.enabled()||M!==Race;$('#rRaceRecord').hidden=!active||!RECS.race?.frames.length;}
$('#rRaceBoard').addEventListener('click',event=>{event.stopPropagation();RACE_COMP_UI.category=RACE_COMP_UI.last?.category||'core';openBoard(event.currentTarget);});
$('#rRaceRecord').addEventListener('click',event=>{event.stopPropagation();raceCompetitionRecordShare();});
function raceCompetitionDrawCapture(canvas,context,item){
  context.fillStyle='#102037';context.fillRect(0,0,canvas.width,canvas.height);
  const three=$('#race3');if(three&&RACE_3D.on&&three.width&&three.height)context.drawImage(three,0,0,canvas.width,canvas.height);
  context.drawImage(cv,0,0,canvas.width,canvas.height);
  const bar=Math.max(50,canvas.height*.11);context.fillStyle='rgba(4,13,28,.9)';context.fillRect(0,canvas.height-bar,canvas.width,bar);
  context.fillStyle='#b1eeff';context.font=`700 ${Math.max(15,canvas.width*.025)}px system-ui`;context.fillText(`KICKLAB · ${RACE_COMPETITION.CATEGORIES.find(c=>c.id===item.category).name}`,18,canvas.height-bar+26);
  context.fillStyle='#fff';context.font=`600 ${Math.max(13,canvas.width*.019)}px system-ui`;context.fillText(`${item.vehicle} · ${raceCompetitionValue(item.category,item.score)} · ${item.award}`,18,canvas.height-12);
  const art=item.award==='Race result'?null:RACE_AWARD_IMAGES[item.category];if(art?.complete&&art.naturalWidth)context.drawImage(art,canvas.width-118,canvas.height-bar-108,100,100);
}
function raceCompetitionCaptureFrame(){const job=RACE_COMP_UI.capture;if(!job||job.cancelled)return;try{raceCompetitionDrawCapture(job.canvas,job.context,job.item);if(RP.on&&RP.t>=job.end&&!RP.playing&&!job.stopping){job.stopping=true;job.recorder.stop();}}catch(error){job.error=error;job.stopping=true;try{job.recorder.stop();}catch(_){}}}
function raceCompetitionShowFile(file,reason=''){
  if(RACE_COMP_UI.url)URL.revokeObjectURL(RACE_COMP_UI.url);RACE_COMP_UI.file=file;RACE_COMP_UI.url=URL.createObjectURL(file);
  const box=$('#raceSharePreview');box.replaceChildren();const media=document.createElement(file.type.startsWith('video/')?'video':'img');media.setAttribute('aria-label','Local Race highlight preview');box.appendChild(media);
  const ready=()=>{$('#raceShareStatus').textContent=reason||`Ready: ${file.name}. Preview it, then choose Download or Share.`;$('#raceShareDownload').hidden=false;$('#raceShareNative').hidden=!(navigator.canShare&&navigator.canShare({files:[file]}));};
  $('#raceShareDownload').hidden=true;$('#raceShareNative').hidden=true;
  if(media.tagName==='VIDEO'){media.controls=true;media.playsInline=true;media.preload='auto';media.addEventListener('loadeddata',ready,{once:true});media.addEventListener('error',()=>raceCompetitionStill(RACE_COMP_UI.last,'The recorded video could not be decoded in this browser.'),{once:true});$('#raceShareStatus').textContent='Checking the local replay video…';}
  else{media.addEventListener('load',ready,{once:true});media.addEventListener('error',()=>{$('#raceShareStatus').textContent='This browser could not preview the local highlight image.';},{once:true});$('#raceShareStatus').textContent='Checking the local highlight image…';}
  media.src=RACE_COMP_UI.url;$('#raceShare').hidden=false;$('#raceShareClose').focus();
}
function raceCompetitionStill(item,reason){const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const context=canvas.getContext('2d');raceCompetitionDrawCapture(canvas,context,item);canvas.toBlob(blob=>{if(!blob){$('#raceShareStatus').textContent='This browser could not create a local image. Use the in-game Replay action.';$('#raceShare').hidden=false;return;}raceCompetitionShowFile(new File([blob],'kicklab-race-highlight.png',{type:'image/png'}),reason+' A still image is available instead.');},'image/png');}
function raceCompetitionRecordShare(){
  const item=RACE_COMP_UI.last,rec=RECS.race;if(!RACE_COMPETITION.enabled()||!item||item.profileId!==profileManager.active().id||item.recId!==rec?.id||!rec.frames.length)return;
  if(RACE_COMP_UI.capture)return;
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const context=canvas.getContext('2d');
  if(!canvas.captureStream||typeof MediaRecorder==='undefined'){raceCompetitionStill(item,'Video recording is unavailable in this browser.');return;}
  const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(candidate=>MediaRecorder.isTypeSupported(candidate));if(!type){raceCompetitionStill(item,'This browser has no supported WebM recorder.');return;}
  try{
    const stream=canvas.captureStream(24),recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:1800000}),parts=[],end=recEnd(rec),start=Math.max(0,end-12),job={canvas,context,stream,recorder,item,end,stopping:false,cancelled:false,error:null};
    RACE_COMP_UI.capture=job;recorder.ondataavailable=event=>{if(event.data?.size)parts.push(event.data);};
    recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());if(RACE_COMP_UI.capture!==job)return;RACE_COMP_UI.capture=null;exitReplay();if(job.cancelled)return;if(job.error||!parts.length||parts.reduce((n,p)=>n+p.size,0)<1000){raceCompetitionStill(item,'The browser did not produce a playable video.');return;}const file=new File(parts,'kicklab-race-highlight.webm',{type:'video/webm'});raceCompetitionShowFile(file);};
    recorder.start(250);startReplay(start);RP.speed=1;RP.playing=true;syncRbar();$('#raceShareStatus').textContent='Recording your last 12 seconds from the saved run…';
  }catch(error){if(RACE_COMP_UI.capture){RACE_COMP_UI.capture.stream.getTracks().forEach(track=>track.stop());RACE_COMP_UI.capture=null;}raceCompetitionStill(item,`Video recording failed (${error.name||'browser error'}).`);}
}
$('#raceShareClose').addEventListener('click',()=>{$('#raceShare').hidden=true;});
$('#raceShareDownload').addEventListener('click',()=>{if(!RACE_COMP_UI.file)return;const link=document.createElement('a');link.href=RACE_COMP_UI.url;link.download=RACE_COMP_UI.file.name;link.click();});
$('#raceShareNative').addEventListener('click',async()=>{const file=RACE_COMP_UI.file;if(!file||!navigator.share||!navigator.canShare?.({files:[file]}))return;try{await navigator.share({files:[file],title:'KickLab Race highlight'});}catch(error){if(error.name!=='AbortError')$('#raceShareStatus').textContent='Share was unavailable. You can still download the file.';}});
if(RACE_COMPETITION_ON&&(location.hostname==='localhost'||location.hostname==='127.0.0.1'))globalThis.__KICKLAB_RACE_AWARDS_QA__=Object.freeze({
  qualify:(category,score)=>raceCompetitionResult({category,passed:true,score}),
  openJourney:()=>openBoard(),
  openProfile:()=>openProfiles(),
  state:()=>({profileId:profileManager.active().id,journey:RACE_COMPETITION.journey(best.raceCompetition),storageWarning:RACE_COMP_UI.storageWarning})
});
if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('raceResultsQA')==='1')globalThis.__KICKLAB_RACE_RESULTS_QA__=Object.freeze({
  fixture(state){if(M!==Race)return false;Race.state=state==='failed'?'crashed':'done';Race.resultBadges=[];Race.progressionReviewNote=state==='failed'?'Brake before the corner. Match the wheel angle, then retry.':'Controlled line. Keep your entry speed steady on the next run.';if(state==='success-new-award')badge('r_finish');if(state==='success-distinct-award')badge('r_clean');raceCompetitionResult({category:state==='success-distinct-award'?'drag':'core',passed:state!=='failed',score:state==='success-distinct-award'?1300:18.24});showResults({grade:state==='failed'?'D':'A',rows:[['run recorded',state==='failed'?20:300]],mult:1,tot:state==='failed'?20:300,title:state==='failed'?'OFF THE TRACK':'RACE COMPLETE',sub:state==='failed'?'Slid wide at the corner':'18.24 s · clean line',hint:'This profile · device only'});return{awards:RACE_COMPETITION.normalize(best.raceCompetition).awards,badges:{r_finish:!!best.badges.r_finish,r_clean:!!best.badges.r_clean},profileId:profileManager.active().id};},
  recorded(availability='both'){if(M!==Race||!['none','frames','moves','both'].includes(availability))return false;hideResults();RACE_COMP_UI.last=null;Race.state='run';startRec('race','QA recorded Race run');const r=RECS.race,P=Race.P(),vmax=Math.sqrt(P.mu*G0*P.R);r.meta={mu:P.mu,R:P.R,L:P.L,vmax,need:Race.needW()};r.sum={ok:true,t:18.24,vp:24,v:Math.min(vmax,21),vmax,slideT:0,wAvg:Race.needW(),wNeed:Race.needW(),you:true};recFrame(.1);Race.st.x+=8;logMove('race',{who:'sys',kind:'entry',title:'Corner entry',res:'controlled',math:'v ≤ √(μgR)',v:Math.min(vmax,21),vmax,tone:'good'});recFrame(.1);Race.st.x+=8;logMove('race',{who:'sys',kind:'finish',title:'Finish',res:'18.24 s',math:'clean line',tone:'good'});recFrame(.1);stopRec('race');r.frames.forEach((frame,index)=>{frame.s.st.v=[9,17,12][index];frame.s.st.y=[0,1.5,-.5][index];});if(availability==='none'||availability==='moves')r.frames=[];if(availability==='none'||availability==='frames')r.moves=[];Race.state='done';Race.resultBadges=[];Race.progressionReviewNote='Hold a steady line through the corner.';showResults({grade:'A',rows:[['run recorded',300]],mult:1,tot:300,title:'RACE COMPLETE',sub:'18.24 s · clean line',hint:'This profile · device only'});return{recordId:r.id,frames:r.frames.length,moves:r.moves.length,profileId:profileManager.active().id};},
  scenario({outcome='pass',achievement='none',replay='both',context='standalone',coach='clean'}={}){if(M!==Race||!['pass','fail'].includes(outcome)||!['none','collectible','season'].includes(achievement)||!['none','frames','moves','both'].includes(replay)||!['standalone','mid','final'].includes(context)||!['clean','error-heavy'].includes(coach))return false;
    this.recorded(replay);const record=RECS.race;if(record.moves.length){record.moves=record.moves.filter(move=>outcome==='pass'||move.kind!=='finish');if(coach==='error-heavy'){const entry=record.moves.find(move=>move.kind==='entry');if(entry){entry.v=entry.vmax*1.18;entry.res='above limit';entry.tone='bad';}record.moves.push({kind:'brake',title:'Brake point',tone:'bad',d2c:12,dN:32,t:.15},{kind:'slide',title:'Tire slide',res:'corner exit',tone:'bad',t:.25});if(outcome==='fail')record.moves.push({kind:'crash',title:'Off track',tone:'bad',t:.3});record.sum.slideT=1.4;record.sum.ok=outcome==='pass';}}
    RACE_COMP_UI.last=null;Race.resultBadges=[];Race.state=outcome==='fail'?'crashed':'done';Race.progressionReviewNote=outcome==='fail'?'Brake before the corner. Open Garage brakes, then retry.':'Controlled line. Keep your entry speed steady.';
    RACE_CHAMP_UI.active=context!=='standalone';RACE_CHAMP_UI.selected=context==='final'?RACE_CHAMP.EVENTS.length-1:0;RACE_CHAMP_UI.last=null;
    if(context!=='standalone'){let state=RACE_CHAMP.normalize({});if(outcome==='pass'){for(let i=0;i<=(context==='final'?RACE_CHAMP.EVENTS.length-1:0);i++)state=RACE_CHAMP.complete(state,RACE_CHAMP.EVENTS[i].id,{pass:true,score:1200},'cobalt').state;}best.raceChampionship=state;RACE_CHAMP_UI.last={profileId:profileManager.active().id,eventId:RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected].id,passed:outcome==='pass',next:outcome==='pass'?RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected+1]||null:null};}renderRaceChampionship();
    if(achievement==='collectible'&&outcome==='pass'){badge('r_finish');raceCompetitionResult({category:'core',passed:true,score:18.24});}
    const seasonAward=achievement==='season'&&outcome==='pass'&&context!=='standalone'?RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected].award:null;
    showResults({grade:outcome==='fail'?'D':'A',rows:[['run recorded',outcome==='fail'?20:300]],mult:1,tot:outcome==='fail'?20:300,title:outcome==='fail'?'OFF THE TRACK':'RACE COMPLETE',sub:'18.24 s · device only',hint:outcome==='fail'?'Open Garage brakes, then retry':'This profile · device only',raceAward:seasonAward,raceAwardId:seasonAward?RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected].mode:null});
    return{outcome,achievement,replay,context,coach,frames:RECS.race?.frames.length,moves:RECS.race?.moves.length,profileId:profileManager.active().id};},
  state:()=>({raceState:Race.state,seasonActive:RACE_CHAMP_UI.active,selected:RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected].id,resultsOpen:!$('#results').hidden})
});
