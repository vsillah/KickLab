/* Opt-in Race Coach presentation. The game model remains the only source of coaching truth. */
const RACE_COACH_PERSONAS=globalThis.KickLabRaceCoachPersonas;
const RACE_PERSONA_UI={expression:'ready',trigger:null,profileId:null,selection:'nia'};
if(RACE_COACH_PERSONAS.enabled){document.documentElement.dataset.raceCoachPersonas='prototype';$('#raceCoachChoose').hidden=false;$('#racePreflightCoach').hidden=false;}
function raceCoachPersona(){return RACE_COACH_PERSONAS.get(RACE_COACH_PERSONAS.enabled?best.raceCoachId:'nia');}
function raceCoachName(){return raceCoachPersona().name;}
function raceCoachPersonaAsset(){return`assets/coaches/v1/${raceCoachPersona().id}.webp`;}
function raceCoachPersonaPaint(node,event='setup'){
  if(!RACE_COACH_PERSONAS.enabled||!node)return;
  const coach=raceCoachPersona(),expression=RACE_COACH_PERSONAS.expressionFor(event),index=RACE_COACH_PERSONAS.expressions.indexOf(expression);
  node.classList.add('race-persona-avatar');node.textContent='';node.removeAttribute('aria-hidden');node.style.backgroundImage=`url("${raceCoachPersonaAsset()}")`;node.style.backgroundPosition=`${index*25}% center`;
  node.setAttribute('role','img');node.setAttribute('aria-label',`${coach.name}, ${expression==='concern'?'supportive concern':expression==='focus'?'focused instruction':expression==='celebrate'?'celebrating':expression==='encourage'?'calm encouragement':'ready'}`);
}
function raceCoachPersonaExpression(event){
  if(!RACE_COACH_PERSONAS.enabled)return;
  RACE_PERSONA_UI.expression=event;
  for(const selector of ['#coachAv','#raceTelemetry .race-telemetry-coach','#raceCoachNoticeIcon','#raceResultCoachAvatar','#rvAv'])raceCoachPersonaPaint($(selector),event);
}
function raceCoachPersonaMessage(message){return RACE_COACH_PERSONAS.present(message,raceCoachPersona().id);}
function raceCoachPersonaSync(){
  if(!RACE_COACH_PERSONAS.enabled)return;
  const coach=raceCoachPersona();
  RACE_PERSONA_UI.profileId=profileManager.active().id;
  COACHES.race.name=coach.name;COACHES.race.ini=coach.name.split(' ')[1].slice(0,2).toUpperCase();COACHES.race.col=coach.color;
  if(M===Race){$('#coachName').textContent=coach.name;$('#coachRole').textContent=`${coach.role} · ${coach.style.toLowerCase()}`;$('#coach').style.setProperty('--cc',coach.color);}
  if(M===Race&&COACH.last)$('#coachMsg').textContent=raceCoachPersonaMessage(COACH.last);
  $('#raceCoachChoose').textContent=`Choose Coach · ${coach.name}`;$('#racePreflightCoach').textContent=coach.name;
  $('#raceCoachNoticeDismiss').setAttribute('aria-label',`Dismiss ${coach.name} message`);
  raceCoachPersonaExpression(RACE_PERSONA_UI.expression);
  renderRaceCoachHistory();
  for(const root of ['#game-cockpit','#racePreflight','#results','#review'])raceCoachPersonaReplace($(root));
}
function raceCoachPersonaReplace(root){
  if(!root||!RACE_COACH_PERSONAS.enabled)return;
  const coach=raceCoachPersona(),names=/Coach (?:Nia|Imani|Mateo|Arun)/gi,convert=match=>match===match.toUpperCase()?coach.name.toUpperCase():coach.name;
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walk.nextNode()))if(node.nodeValue){const updated=node.nodeValue.replace(names,convert);if(updated!==node.nodeValue)node.nodeValue=updated;}
  for(const element of root.querySelectorAll('[aria-label],[title]'))for(const key of ['aria-label','title']){const value=element.getAttribute(key);if(value){const updated=value.replace(names,convert);if(updated!==value)element.setAttribute(key,updated);}}
}
function renderRaceCoachRoster(){
  const box=$('#raceCoachRosterCards');box.replaceChildren();
  const current=raceCoachPersona().id;
  for(const coach of RACE_COACH_PERSONAS.roster){
    const button=document.createElement('button');button.type='button';button.className='race-coach-roster-card';button.dataset.coachId=coach.id;button.setAttribute('aria-pressed',String(coach.id===current));button.setAttribute('aria-label',`${coach.name}. ${coach.style}. ${coach.description}${coach.id===current?' Selected.':''}`);
    const avatar=document.createElement('span');avatar.className='race-persona-avatar';avatar.style.backgroundImage=`url("assets/coaches/v1/${coach.id}.webp")`;avatar.style.backgroundPosition='0% center';avatar.setAttribute('role','img');avatar.setAttribute('aria-label',`${coach.name}, ready`);
    const copy=document.createElement('span'),name=document.createElement('b'),style=document.createElement('small'),sample=document.createElement('q'),description=document.createElement('em');name.textContent=coach.name;style.textContent=coach.style;sample.textContent=coach.sample;description.textContent=coach.description;copy.append(name,style,sample,description);button.append(avatar,copy);box.append(button);
  }
  $('#raceCoachRosterStatus').textContent=`${raceCoachPersona().name} selected for this local player. All Coaches use the same Race guidance.`;
}
function openRaceCoachRoster(trigger){
  if(!RACE_COACH_PERSONAS.enabled)return;
  RACE_PERSONA_UI.trigger=trigger;RACE_PERSONA_UI.selection=raceCoachPersona().id;renderRaceCoachRoster();
  const modal=$('#raceCoachRoster');modal.hidden=false;modal.classList.add('is-open');
  if(Race.state==='run'&&!PAUSE.on)pauseGame('coach-roster');
  requestAnimationFrame(()=>boxCoachFocus());
}
function boxCoachFocus(){$('#raceCoachRosterCards [aria-pressed="true"]')?.focus();}
function closeRaceCoachRoster(){
  const modal=$('#raceCoachRoster');if(modal.hidden)return;modal.hidden=true;modal.classList.remove('is-open');
  releasePauseOwner('coach-roster',{restart:false});
  const trigger=RACE_PERSONA_UI.trigger;RACE_PERSONA_UI.trigger=null;if(trigger?.isConnected)trigger.focus();
}
for(const id of ['raceCoachChoose','racePreflightCoach'])$('#'+id).addEventListener('click',event=>openRaceCoachRoster(event.currentTarget));
$('#raceCoachRosterClose').addEventListener('click',closeRaceCoachRoster);
$('#raceCoachRoster').addEventListener('click',event=>{if(event.target.id==='raceCoachRoster')closeRaceCoachRoster();});
$('#raceCoachRosterCards').addEventListener('click',event=>{
  const button=event.target.closest('[data-coach-id]');if(!button)return;
  best.raceCoachId=RACE_COACH_PERSONAS.normalize(button.dataset.coachId);saveBest();RACE_PERSONA_UI.expression='setup';raceCoachPersonaSync();renderRaceCoachRoster();
  $('#raceCoachRosterStatus').textContent=`${raceCoachName()} selected and saved for ${profileManager.active().nickname}. Race guidance is unchanged.`;
  button.focus();
});
$('#raceCoachRoster').addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeRaceCoachRoster();return;}
  if(event.key==='Tab'){const focusable=[...$('#raceCoachRoster').querySelectorAll('button')],first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
if(RACE_COACH_PERSONAS.enabled){
  const observer=new MutationObserver(records=>{
    if(M!==Race)return;
    for(const record of records){const node=record.target.nodeType===Node.TEXT_NODE?record.target:record.target.nodeType===Node.ELEMENT_NODE?record.target:null;if(node?.nodeType===Node.TEXT_NODE){const text=node.nodeValue;if(text){const updated=text.replace(/Coach (?:Nia|Imani|Mateo|Arun)/gi,match=>match===match.toUpperCase()?raceCoachName().toUpperCase():raceCoachName());if(updated!==text)node.nodeValue=updated;}}else if(node?.nodeType===Node.ELEMENT_NODE&&node!==$('#raceCoachRoster'))raceCoachPersonaReplace(node);}
  });
  for(const root of ['#game-cockpit','#racePreflight','#results','#review'])observer.observe($(root),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title']});
  requestAnimationFrame(raceCoachPersonaSync);
}
