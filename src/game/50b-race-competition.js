/* Opt-in, device-only Race awards, rankings and replay export. */
const RACE_COMPETITION=globalThis.KickLabRaceCompetition;
const RACE_COMPETITION_ON=RACE_COMPETITION.enabled();
if(RACE_COMPETITION_ON)document.documentElement.dataset.raceCompetition='prototype';
const RACE_COMP_UI={category:'core',last:null,capture:null,file:null,url:null,storageWarning:false};
const RACE_AWARD_IMAGES=Object.fromEntries((RACE_COMPETITION_ON?RACE_COMPETITION.CATEGORIES:[]).map(cat=>{const image=new Image();image.src=`assets/awards/race/v1/${cat.id}.webp`;return[cat.id,image];}));
function raceAwardArt(id){return`<img src="assets/awards/race/v1/${id}.webp" alt="" loading="lazy">`;}
function raceCompetitionResult(event){
  if(!RACE_COMPETITION.enabled())return;
  RACE_COMP_UI.last=null;
  if(!event.passed)return;
  const rec=RECS.race,profile=profileManager.active(),vehicle=Race.expansionActive()?Race.vehicle().name:Race.CARS[Race.opt.car].name;
  const result=RACE_COMPETITION.record(best.raceCompetition,{...event,vehicle});
  best.raceCompetition=result.state;saveBest();
  try{const saved=JSON.parse(localStorage.getItem(profileManager.key));RACE_COMP_UI.storageWarning=JSON.stringify(saved.profiles.find(row=>row.id===profile.id)?.progress?.raceCompetition)!==JSON.stringify(result.state);}catch(_){RACE_COMP_UI.storageWarning=true;}
  RACE_COMP_UI.last={profileId:profile.id,recId:rec?.id,category:event.category,score:event.score,vehicle,award:result.earned?.name||(result.state.awards[event.category]?RACE_COMPETITION.AWARDS[event.category].name:'Race result')};
  if(RACE_COMP_UI.storageWarning)toast('Race record is session-only','Device storage could not save this award. Clear space before leaving this page.');
  if(result.earned){
    const announce=()=>{if(profileManager.active().id!==profile.id)return;COACH.say(`${result.earned.name} earned. See your next chapter in Race awards.`,'hype',7);const note=toast('Race collectible earned',result.earned.name,{hold:7000});if(note){note.classList.add('race-award-toast');note.querySelector('.ic').replaceChildren(RACE_AWARD_IMAGES[result.awardId].cloneNode());}};
    if(Race.state==='done')setTimeout(announce,0);else announce();
  }else if(!result.state.awards[event.category])COACH.say(`Run recorded. ${RACE_COMPETITION.journey(result.state).find(item=>item.id===event.category).progress}.`,'tip',6);
}
function raceCompetitionClear(){
  RACE_COMP_UI.last=null;
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
  $('#raceCompetitionAwards').innerHTML=journey.map(item=>`<article class="race-journey-card ${item.status}" aria-label="Chapter ${item.index+1}: ${item.name}. ${item.status}. ${item.requirement}. ${item.progress}."><div class="race-journey-art">${raceAwardArt(item.id)}</div><div class="race-journey-copy"><span class="race-journey-chapter">${String(item.index+1).padStart(2,'0')} / ${item.chapter}</span><h4>${item.name}</h4><p>${item.requirement}</p><small>${item.status==='earned'?'Collected · '+item.perk:item.progress}</small></div><span class="race-journey-state">${item.status==='earned'?'Earned':item.status==='available'?'Ready':'Locked'}</span></article>`).join('');
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
