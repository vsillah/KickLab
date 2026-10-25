/* ---------- responsive web cockpit ---------- */
const CONTEXT_DETAILS={open:null,trigger:null,ownsPause:false};
const SETTINGS={level:'categories',category:null,trigger:null,restoreCategory:null};
const MATH_CONSOLE={sig:''};
const settingsDrawer=$('#settingsDrawer'),settingsToggle=$('#settingsToggle');
const gameOverlayBackdrop=$('#gameOverlayBackdrop'),gameStage=$('.stage'),gamePlayShell=$('.play'),profileDialog=$('#profileDialog');
const racePhoneTools=$('#racePhoneToolsToggle'),racePhoneRail=$('#gameGuidanceHud');
const racePhoneProgress=$('#racePhoneProgress'),racePhoneStatusContent=$('#racePhoneStatusContent');
const racePhoneChampionship=$('#raceChampionship'),racePhoneMultiplayer=$('#raceMultiplayer'),racePhoneStatusHome=racePhoneChampionship.parentElement;
const racePhoneControlHead=$('.control-deck .floating-control-head'),racePhoneControlHome=racePhoneControlHead.parentElement;
const racePhoneStyleGroup=$('#controlStyleOptions');
const racePhoneCalibration=$('#raceSimulator .sim-calibration'),racePhoneCalibrationHome=racePhoneCalibration.parentElement;
function racePhoneToolsActive(){return document.documentElement.dataset.kicklabMode==='race';}
const RACE_PHONE_NOTICE={text:'',at:0};
function clearRacePhoneNotices(reset=true){document.querySelectorAll('#toasts .race-phone-notice').forEach(note=>note.remove());syncRacePhoneNoticeSlot();if(reset){RACE_PHONE_NOTICE.text='';RACE_PHONE_NOTICE.at=0;}}
function racePhoneNotice(message,mood='tip'){
  if(!racePhoneToolsActive()||M!==Race||document.hidden||RP.on||gameStage.classList.contains('has-game-overlay')||document.activeElement===racePhoneProgress)return;
  const text=String(message).replace(/^Coach Nia:\s*/i,'').trim().split(/(?<=[.!?])\s+/)[0].slice(0,96);
  if(!text||text==='Coach Nia on the radio.')return;
  const now=performance.now();
  if(text===RACE_PHONE_NOTICE.text||mood!=='warn'&&now-RACE_PHONE_NOTICE.at<3600)return;
  RACE_PHONE_NOTICE.text=text;RACE_PHONE_NOTICE.at=now;
  const note=toast(mood==='warn'?'Race warning':'Coach Nia',text,{hold:3900});
  if(note)note.dataset.racePhoneMood=mood;
}
function syncRacePhoneTools(){
  const active=racePhoneToolsActive(),expanded=active&&racePhoneTools.getAttribute('aria-expanded')==='true';
  if(!active&&racePhoneTools.getAttribute('aria-expanded')==='true')setFloatingControllerCollapsed(false);
  if(active&&racePhoneControlHead.parentElement!==gameStage)gameStage.appendChild(racePhoneControlHead);
  if(active&&(matchMedia('(max-width:480px)').matches||expanded)&&racePhoneStyleGroup.parentElement!==racePhoneRail)racePhoneRail.appendChild(racePhoneStyleGroup);
  if(active&&racePhoneCalibration.parentElement!==racePhoneRail)racePhoneRail.appendChild(racePhoneCalibration);
  if(active&&racePhoneChampionship.parentElement!==racePhoneStatusContent)racePhoneStatusContent.append(racePhoneChampionship,racePhoneMultiplayer);
  if(!active&&racePhoneCalibration.parentElement!==racePhoneCalibrationHome)racePhoneCalibrationHome.insertBefore(racePhoneCalibration,racePhoneCalibrationHome.querySelector('.sim-fallbacks'));
  if(!active&&racePhoneChampionship.parentElement!==racePhoneStatusHome)racePhoneStatusHome.insertBefore(racePhoneChampionship,gameStage);
  if(!active&&racePhoneMultiplayer.parentElement!==racePhoneStatusHome)racePhoneStatusHome.insertBefore(racePhoneMultiplayer,gameStage);
  if((!active||!matchMedia('(max-width:480px)').matches&&!expanded)&&racePhoneStyleGroup.parentElement!==racePhoneControlHead)racePhoneControlHead.insertBefore(racePhoneStyleGroup,racePhoneControlHead.firstChild);
  if(!active&&racePhoneControlHead.parentElement!==racePhoneControlHome)racePhoneControlHome.insertBefore(racePhoneControlHead,racePhoneControlHome.firstChild);
  racePhoneRail.inert=active&&!expanded;
  if(!active)clearRacePhoneNotices();
  racePhoneTools.setAttribute('aria-label',expanded?'Close Race tools and restore game controls':'Open Race tools and collapse game controls');
  if(!active)racePhoneTools.setAttribute('aria-expanded','false');
}
racePhoneTools.addEventListener('click',()=>{
  const expanded=racePhoneTools.getAttribute('aria-expanded')!=='true';
  racePhoneTools.setAttribute('aria-expanded',String(expanded));
  if(racePhoneToolsActive())setFloatingControllerCollapsed(expanded);
  syncRacePhoneTools();
  if(racePhoneTools.getAttribute('aria-expanded')==='true')racePhoneRail.querySelector('button')?.focus();
  else racePhoneTools.focus();
});
racePhoneRail.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&racePhoneToolsActive()&&!CONTEXT_DETAILS.open){event.preventDefault();event.stopPropagation();racePhoneTools.setAttribute('aria-expanded','false');setFloatingControllerCollapsed(false);syncRacePhoneTools();racePhoneTools.focus();}
},true);
racePhoneControlHead.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&racePhoneToolsActive()&&event.target===$('#controllerCollapseButton')&&!racePhoneControlHome.classList.contains('controller-collapsed')){event.preventDefault();setFloatingControllerCollapsed(true,{focus:true});}
});
new MutationObserver(syncRacePhoneTools).observe(document.documentElement,{attributes:true,attributeFilter:['data-kicklab-mode']});
addEventListener('resize',syncRacePhoneTools);
syncRacePhoneTools();
racePhoneProgress.addEventListener('click',()=>{if(!racePhoneToolsActive())return;racePhoneTools.setAttribute('aria-expanded','false');setFloatingControllerCollapsed(false);syncRacePhoneTools();setContextDetail('orientation',{trigger:racePhoneProgress,focus:true});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearRacePhoneNotices();});

function contextPanel(name){return $(`#${name==='math'?'physics':name}Detail`);}
function contextTriggers(name){return(name==='math'?[$('#physicsDetailsHud')]:[$(`#${name}DetailToggle`)]).filter(Boolean);}
function syncContextTrigger(button,expanded){const action=expanded?'Close':'Open',label=button.dataset.detailLabel||'details',name=`${action} ${label}`;button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',name);button.title=name;}
function releaseGameplayForOverlay(){if(typeof releaseMobileHeldInputs==='function')releaseMobileHeldInputs('Game overlay opened');ENGINE.off();RACE_SUPERCAR_AUDIO.stop();document.querySelectorAll('#pad .on').forEach(button=>button.classList.remove('on'));}
function syncGameOverlayBackdrop(){const profileOpen=!profileDialog.hidden&&profileDialog.classList.contains('game-profile-overlay'),open=!!CONTEXT_DETAILS.open||!settingsDrawer.hidden||profileOpen;gameOverlayBackdrop.hidden=!open;gameStage.classList.toggle('has-game-overlay',open);gamePlayShell.classList.toggle('has-game-overlay',open);if(open)clearRacePhoneNotices(false);}
function overlayFocusables(panel){return[...panel.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(node=>!node.hidden&&node.getAttribute('aria-hidden')!=='true'&&node.getClientRects().length>0);}
function trapOverlayFocus(panel,e){if(e.key!=='Tab')return;const items=overlayFocusables(panel);if(!items.length)return;e.stopPropagation();const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
function closeContextDetail({restore=true,restart=true}={}){
  if(!CONTEXT_DETAILS.open)return;
  const trigger=CONTEXT_DETAILS.trigger,name=CONTEXT_DETAILS.open;
  contextPanel(name).hidden=true;contextTriggers(name).forEach(b=>syncContextTrigger(b,false));
  CONTEXT_DETAILS.open=null;CONTEXT_DETAILS.trigger=null;
  if(CONTEXT_DETAILS.ownsPause)releasePauseOwner('context-detail',{restart});
  CONTEXT_DETAILS.ownsPause=false;
  syncGameOverlayBackdrop();
  if(restore&&trigger&&trigger.isConnected&&!trigger.hidden)trigger.focus();
  requestAnimationFrame(resize);
}
function setContextDetail(name,{trigger=null,focus=false,open=true}={}){
  const panel=contextPanel(name);if(!panel)return;
  if(!open){closeContextDetail();return;}
  if(CONTEXT_DETAILS.open===name){closeContextDetail();return;}
  if(name==='learn'){const note=$('#garageCoachDetail');note.hidden=M!==Race||!GARAGE_UI.last;if(!note.hidden)$('#garageCoachMessage').textContent=GARAGE_UI.last;const progression=$('#raceProgressionCoach');progression.hidden=M!==Race||!Race.progressionActive();if(!progression.hidden){const level=Race.progressionLevel(),P=Race.P(),v=RACE_SYSTEMS.venue(level.venue);$('#raceProgressionCoachChallenge').textContent=level.challenge+` Pass each heat within ${level.time} s, at least ${level.entry} km/h at corner entry, no more than ${level.slide} s sliding, and at least ${fmt(level.brakeFactor*100,0)}% brake power.`;$('#raceProgressionCoachMath').textContent=`v_limit = √(μgR) = ${fmt(Math.sqrt(P.mu*G0*P.R)*3.6,0)} km/h; μ ${fmt(P.mu,2)} is unitless, g = 9.81 m/s², R = ${P.R} m. Approach grade ${fmt(globalThis.KickLabRaceProgression.grade(v,4)*100,1)}%.`;$('#raceProgressionCoachStrategies').innerHTML=level.strategies.map(strategy=>`<li>${strategy}</li>`).join('');}}
  closeContextDetail({restore:false,restart:false});
  if(!settingsDrawer.hidden)closeSettings({restore:false,restart:false});
  if(!profileDialog.hidden)closeProfiles({restore:false,restart:false});
  CONTEXT_DETAILS.open=name;CONTEXT_DETAILS.trigger=trigger||contextTriggers(name).find(b=>b.offsetParent!==null)||contextTriggers(name)[0];
  document.querySelectorAll('.context-detail').forEach(p=>p.hidden=p!==panel);
  ['orientation','math','review','goals','learn'].forEach(n=>contextTriggers(n).forEach(b=>syncContextTrigger(b,n===name)));
  panel.hidden=false;releaseGameplayForOverlay();
  pauseGame('context-detail');CONTEXT_DETAILS.ownsPause=true;
  if(focus)requestAnimationFrame(()=>panel.querySelector('[data-close-detail]')?.focus());
  syncGameOverlayBackdrop();requestAnimationFrame(resize);
}

function setSettingsPause(on){
  if(on)pauseGame('settings');
  else releasePauseOwner('settings');
  $('#settingsState').textContent=on?'Game paused while settings are open.':'Settings open. Changes apply immediately.';
}
function setSettingsLevel(level,{category=SETTINGS.category,focus=true}={}){
  SETTINGS.level=level;SETTINGS.category=category;
  settingsDrawer.classList.toggle('garage-open',level==='garage');
  gameStage.classList.toggle('garage-review-open',level==='garage');
  const cats=$('#settingsCategories'),choices=$('#settingsChoices'),kitRoom=$('#kitroom'),garage=$('#raceGarage'),garageSummary=$('#raceGarageSummary'),back=$('#settingsBack');
  cats.hidden=level!=='categories';choices.hidden=level!=='choices';kitRoom.hidden=level!=='kit';garage.hidden=level!=='garage';garageSummary.hidden=level!=='garage';back.hidden=level==='categories';
  const group=settingsGroups().find(g=>g.id===category),label=group?group.label:'Settings';
  $('#settingsBreadcrumb').textContent=level==='categories'?'Settings':level==='kit'?'Settings / Kit':level==='garage'?'Settings / Race':`Settings / ${label}`;
  $('#settingsTitle').textContent=level==='categories'?'Choose a category':level==='kit'?'Equipment details':label;
  if(level==='categories')renderSettingsCategories();
  else if(level==='choices')renderSettingsChoices(category);
  else if(level==='garage')renderGarage();
  else renderKit();
  $('#settingsDrawerBody').scrollTop=0;
  if(focus)requestAnimationFrame(()=>{const target=level==='categories'?cats.querySelector('button'):level==='choices'?choices.querySelector('button'):level==='garage'?garage.querySelector('button'):kitRoom.querySelector('button');(target||back).focus();});
}
function openSettings(category=null,trigger=settingsToggle){
  if(!profileDialog.hidden)closeProfiles({restore:false,restart:false});if(CONTEXT_DETAILS.open)closeContextDetail({restore:false,restart:false});SETTINGS.trigger=trigger;SETTINGS.restoreCategory=trigger&&trigger.dataset?trigger.dataset.category:null;settingsDrawer.hidden=false;settingsToggle.setAttribute('aria-expanded','true');releaseGameplayForOverlay();setSettingsPause(true);
  setSettingsLevel(category?(category==='garage'?'garage':'choices'):'categories',{category,focus:true});syncGameOverlayBackdrop();requestAnimationFrame(resize);
}
function closeSettings({restore=true,restart=true}={}){
  if(settingsDrawer.hidden)return;settingsDrawer.hidden=true;gameStage.classList.remove('garage-review-open');$('#kitroom').hidden=true;settingsToggle.setAttribute('aria-expanded','false');releasePauseOwner('settings',{restart});
  syncGameOverlayBackdrop();if(M===Race)renderRaceTelemetry();if(restore){const trigger=SETTINGS.trigger&&SETTINGS.trigger.isConnected&&SETTINGS.trigger.offsetParent!==null?SETTINGS.trigger:SETTINGS.restoreCategory!=null?$(`#quickSettings [data-category="${SETTINGS.restoreCategory}"]`):null;(trigger||$('#orientationDetailToggle')||settingsToggle).focus();}requestAnimationFrame(resize);
  const returnToRaceRetry=restore&&M===Race&&GARAGE_UI.returnToRaceRetry;GARAGE_UI.returnToRaceRetry=false;
  if(returnToRaceRetry){GARAGE_UI.notice=null;document.querySelectorAll('#toasts .toast[aria-label="Coach Nia"]').forEach(note=>note.remove());prepareRaceCoachRetry();}
  else if(M===Race&&GARAGE_UI.notice){const message=GARAGE_UI.notice;GARAGE_UI.notice=null;toast('Coach Nia',message,{action:'Open Coach',hold:14000,onAction:()=>setContextDetail('learn',{trigger:$('#learnDetailToggle'),focus:true})});}
  if(restore&&M===Race&&GARAGE_UI.returnToProgression){GARAGE_UI.returnToProgression=false;renderChal();setContextDetail('goals',{trigger:$('#goalsDetailToggle'),focus:false});requestAnimationFrame(()=>$(`#chal [data-race-level="${best.raceProgression.selected}"]`)?.focus());}else GARAGE_UI.returnToProgression=false;
}
function showKitSettings(trigger=$('#kitRoomToggle')){SETTINGS.trigger=SETTINGS.trigger||trigger;setSettingsLevel('kit',{category:'kit',focus:true});}
function settingsBack(){if(SETTINGS.level==='kit')setSettingsLevel('choices',{category:'kit'});else if(SETTINGS.level==='choices')setSettingsLevel('categories');else if(SETTINGS.level==='garage')setSettingsLevel('categories');}

settingsToggle.addEventListener('click',()=>settingsDrawer.hidden?openSettings(null,settingsToggle):closeSettings());
$('#raceGarageShortcut').addEventListener('click',e=>{if(M===Race)openSettings('garage',e.currentTarget);});
$('#raceProgressionCoachGarage').addEventListener('click',e=>{if(M===Race&&Race.progressionActive()){GARAGE_UI.returnToProgression=true;openSettings('garage',e.currentTarget);}});
$('#settingsClose').addEventListener('click',()=>closeSettings());
$('#settingsBack').addEventListener('click',settingsBack);
$('#quickSettings').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;openSettings(b.dataset.category||null,b);});
$('#settingsCategories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;setSettingsLevel(b.dataset.category==='garage'?'garage':'choices',{category:b.dataset.category});});
$('#raceGarage').addEventListener('click',e=>{if(M!==Race)return;const mode=e.target.closest('[data-race-mode]');if(mode){Race.selectMode(mode.dataset.raceMode);renderGarage();renderQuickSettings();return;}const section=e.target.closest('[data-garage-section]');if(section){GARAGE_UI.active=section.dataset.garageSection;renderGarage();requestAnimationFrame(()=>$(`#raceGarage [data-garage-section="${GARAGE_UI.active}"]`)?.focus());return;}const button=e.target.closest('[data-garage-part]');if(!button)return;const field=button.dataset.garagePart,value=button.dataset.garageValue;if(Race.garage[field]===value)return;if(!Race.setGaragePart(field,value))return;GARAGE_UI.active=field;const lesson=RACE_GARAGE.lesson(field,Race.garage,Race.P());GARAGE_UI.notice=field==='body'&&Race.expansionActive()?`${Race.vehicle().name}: ${Race.vehicle().coach}`:lesson.coach;GARAGE_UI.last=`${field==='body'&&Race.expansionActive()?Race.vehicle().name:RACE_GARAGE.option(field,value).name} · ${field==='body'&&Race.expansionActive()?'Race car':RACE_GARAGE.PARTS[field].label}\n${lesson.formula.join(' · ')}\n${lesson.reading}\n${lesson.how}\n${lesson.when}\nTradeoff: ${lesson.tradeoff}`;if(field==='body'&&Race.expansionActive()){const car=Race.vehicle();GARAGE_UI.last=`${car.name} · ${car.role}\n${lesson.formula.join(' · ')}\n${lesson.reading}\n${car.coach}\n${Race.mode().name}: ${car.modeSuitability[Race.mode().id]}\nTradeoff: ${car.tradeoff}`;}renderGarage();renderQuickSettings();renderRaceTelemetry();requestAnimationFrame(()=>$(`#raceGarage [data-garage-part="${field}"][data-garage-value="${value}"]`)?.focus());});
settingsDrawer.addEventListener('pointerdown',e=>e.stopPropagation());
settingsDrawer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSettings();return;}trapOverlayFocus(settingsDrawer,e);e.stopPropagation();});
document.addEventListener('pointerdown',e=>{if(settingsDrawer.hidden||settingsDrawer.contains(e.target)||settingsToggle.contains(e.target)||$('#quickSettings').contains(e.target))return;const focusTarget=e.target.closest&&e.target.closest('button,input,select,textarea,[tabindex]');closeSettings({restore:false});if(!focusTarget)requestAnimationFrame(()=>settingsToggle.focus());});
gameOverlayBackdrop.addEventListener('click',()=>{if(!profileDialog.hidden&&profileDialog.classList.contains('game-profile-overlay'))closeProfiles();else if(CONTEXT_DETAILS.open)closeContextDetail();else if(!settingsDrawer.hidden)closeSettings();});

function bindContextTrigger(button,name){button.addEventListener('click',()=>setContextDetail(name,{trigger:button,focus:true}));button.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'&&CONTEXT_DETAILS.open){e.preventDefault();closeContextDetail();return;}if(e.key===' '||e.key==='Spacebar'){e.preventDefault();button.click();}});}
contextTriggers('math').forEach(b=>bindContextTrigger(b,'math'));
['orientation','review','goals','learn'].forEach(name=>bindContextTrigger(contextTriggers(name)[0],name));
document.querySelectorAll('[data-close-detail]').forEach(b=>b.addEventListener('click',()=>closeContextDetail()));
document.querySelectorAll('.context-detail').forEach(p=>{p.addEventListener('pointerdown',e=>e.stopPropagation());p.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeContextDetail();return;}trapOverlayFocus(p,e);e.stopPropagation();});});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&CONTEXT_DETAILS.open){e.preventDefault();e.stopPropagation();closeContextDetail();}});

function cockpitValue(def,value){
  const n=fmt(value,def.d==null?1:def.d),u=def.unit||'';
  return`${n}${u?(u==='°'?'°':' '+u):''}`;
}
function quickMathName(def){const names={m:'Mass',dt:'Padding',A:'Contact',mu:'Grip',R:'Radius',F:'Engine',v:'Speed',th:'Angle',thH:'Direction',g:'Gravity',spin:'Spin',jv:'Jump',run:'Run speed',grip:'Boot grip',curl:'Curve',vs:'Shot speed',pv:'Pass speed',gkr:'Reaction',gka:'Dive acceleration'};return names[def.id]||def.name;}
function quickMathDefs(){const defs=activeVariableProfile().filter(d=>!isLocked(M.key,d.id));if(!defs.length)return[];if(dialMode()==='quick')return quickTuneVariableIds().map(id=>defs.find(d=>d.id===id)).filter(Boolean);return defs.slice(0,4);}
function plainMath(html){return String(html||'').replace(/<[^>]*>/g,' ').replace(/&(?:emsp|ensp|nbsp);/g,' ').replace(/&minus;|−/g,'-').replace(/&times;|×|·/g,' x ').replace(/&divide;|÷/g,' / ').replace(/&amp;/g,' and ').replace(/&lt;/g,' less than ').replace(/&gt;/g,' greater than ').replace(/θ/g,'Angle').replace(/μ/g,'Grip').replace(/ρ/g,'Density').replace(/δ/g,'Steering').replace(/Δt/g,'Padding time').replace(/R_turn/g,'Turn radius').replace(/\bvx\b/g,'horizontal speed').replace(/\bvy\b/g,'vertical speed').replace(/≤/g,' at most ').replace(/≥/g,' at least ').replace(/→/g,' gives ').replace(/½/g,'0.5 x ').replace(/²/g,' squared').replace(/_eff/g,' effective').replace(/x\s+x/g,'x').replace(/\s+/g,' ').trim();}
function quickMathDisabled(def){const row=varEls.find(v=>v.def.id===def.id);return!!(row&&row.inp.disabled)||RP.on||CINE.on||resOpen();}
function buildMathConsole(defs){$('#mathConsoleControls').innerHTML=defs.length?defs.map(def=>`<div class="math-console-var" data-var="${def.id}" style="--c:${def.col}"><span class="readout"><b>${quickMathName(def)}</b><output></output></span><button type="button" data-step="-1" aria-label="Less ${quickMathName(def)}">Less</button><button type="button" data-step="1" aria-label="More ${quickMathName(def)}">More</button></div>`).join(''):'<p class="math-console-empty">No live variable controls in this moment. Use More math for the full explanation.</p>';}
function renderMathConsole(q){
  const profileIds=activeVariableProfile().map(d=>d.id).join(','),renderedIds=varEls.map(e=>e.def.id).join(',');if(profileIds!==renderedIds)renderVars();const defs=quickMathDefs(),sig=`play|${M.key}|${activeVariableProfileKey().join(':')}|${defs.map(d=>d.id).join(',')}`;
  if(sig!==MATH_CONSOLE.sig){MATH_CONSOLE.sig=sig;buildMathConsole(defs);}
  const mode=dialMode();$('#mathConsoleHeading').textContent=mode==='quick'?`Quick Tune · ${DP.layer==='shot'?'Shot':'Advanced'}`:'Adjust the math you play';
  defs.forEach(def=>{const row=$(`#mathConsoleControls [data-var="${def.id}"]`);if(!row)return;const disabled=quickMathDisabled(def);row.querySelector('output').textContent=cockpitValue(def,M.V[def.id]);row.querySelectorAll('button').forEach(el=>el.disabled=disabled);});
  $('#mathConsoleValues').innerHTML=defs.map(def=>`<span><b>${quickMathName(def)}</b> ${cockpitValue(def,M.V[def.id])}</span>`).join('')||'<span>No live dials</span>';
  q=q||M.eqs();const live=M.LIVE(),line=q.lines[live&&live.length?live[0]:0]||q.lines[0]||M.hint;
  $('#mathConsoleStatus').textContent=plainMath(line);
  $('#liveMathHudValues').innerHTML=defs.slice(0,1).map(def=>`<span><b>${quickMathName(def)}</b> ${cockpitValue(def,M.V[def.id])}</span>`).join('')||'<span>Live state</span>';
  $('#liveMathHudStatus').textContent=plainMath(line)||M.hint||'Live physics ready.';
}
$('#controlLeftSlot').addEventListener('pointerdown',e=>e.stopPropagation());$('#controlLeftSlot').addEventListener('keydown',e=>e.stopPropagation());
$('#mathConsoleControls').addEventListener('click',e=>{const b=e.target.closest('[data-step]'),row=b&&b.closest('[data-var]');if(!b||!row||b.disabled)return;e.stopPropagation();unlock();const def=quickMathDefs().find(d=>d.id===row.dataset.var);if(def&&adjustVar(def.id,def.step*+b.dataset.step,false)){SND.click();const q=M.eqs();renderMathHud(q);renderMathConsole(q);}});
function renderMathHud(q){
  $('#mathHudTitle').textContent=M.hint||`${M.key} lab`;
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
function liveHudState(){if(M===Fight&&Fight.bout)return`You ${Math.ceil(Fight.bout.me)} HP · ${Fight.bout.T.name} ${Math.ceil(Fight.bout.opp)} HP`;if(M===Race)return RACE_3D.shouldBlockInput()&&!RACE_3D.awaitingPacing?'Race · vehicle view':Race.state==='run'?`${fmt(Race.st.t,1)} s · ${fmt(Race.st.v*3.6,0)} km/h`:`Race · ${Race.state==='count'?'countdown':'ready'}`;if(M===Kick&&typeof MATCH!=='undefined'&&MATCH.on)return`Match ${MATCH.you}–${MATCH.them}`;if(M===Kick&&typeof LIVEM!=='undefined'&&LIVEM.on)return`Live ${LIVEM.you}–${LIVEM.them} · ${LIVEM.clock()}`;if(M===Kick&&Kick.opt.shot==='dribble')return`Kick · ${(GAMES.find(game=>game.k===curGame())||{}).n||'activity'}`;return M===Kick?`Kick · ${Kick.opt.shot==='header'?'Header duel':'Free kick'}`:`${M.key} lab`;}
function railHudState(){if(M===Fight&&Fight.bout)return`${Math.ceil(Fight.bout.me)}–${Math.ceil(Fight.bout.opp)} HP`;if(M===Race)return RACE_3D.shouldBlockInput()&&!RACE_3D.awaitingPacing?'Vehicle view':Race.state==='run'?`${fmt(Race.st.v*3.6,0)} km/h`:Race.state==='count'?'Countdown':Race.progressionActive()?`Level ${best.raceProgression.selected+1} · heat ${best.raceProgression.heats+1}`:'Ready';if(M===Kick&&typeof MATCH!=='undefined'&&MATCH.on)return`${MATCH.you}–${MATCH.them}`;if(M===Kick&&typeof LIVEM!=='undefined'&&LIVEM.on)return`${LIVEM.you}–${LIVEM.them}`;if(M===Kick&&Kick.opt.shot==='dribble')return(GAMES.find(game=>game.k===curGame())||{}).n||'Activity';return M===Kick?(Kick.opt.shot==='header'?'Header':'Free kick'):`${M.key} lab`;}
function renderChallengeHud(){$('#challengeHudSummary').innerHTML=`<span class="mobile-hud-label" aria-hidden="true">Goal</span><b class="hud-summary-cue">${railHudState()}</b>`;}
function playerHudState(){
  if(!M)return{action:'Ready',detail:'Choose a lab to begin'};
  if(M===Race){const action=Race.state==='run'?(Race.brake?'Braking':Race.gas?'Throttle':'Steering'):Race.state==='count'?'Countdown':Race.state==='done'?'Finished':Race.state==='crashed'?'Recovery':'Grid';return{action,detail:`Race · The Rocket · ${action}`};}
  if(M===Kick&&Kick.opt.shot==='dribble'&&typeof Drib!=='undefined'){const s=Drib.state,keeping=s==='keep',action=s==='run'?'Sprint':s==='beat'?'Attack':keeping?'Set & dive':s==='set'?'Set piece':s==='done'?'Round complete':s==='ready'?'Ready':'Live',game=(GAMES.find(item=>item.k===curGame())||{}).n||'Soccer';return{action,detail:`${game} · ${keeping?'Keeper · ':''}${PLY().n} · ${action}`};}
  if(M===Kick){const action=Kick.state==='swing'?'Follow-through':Kick.state==='flight'?'Tracking ball':Kick.state==='incoming'?'Head it':Kick.state==='heading'?'Header':Kick.state==='done'?'Round complete':'Set piece';return{action,detail:`${Kick.opt.shot==='header'?'Header duel':'Free kick'} · ${PLY().n} · ${action}`};}
  const action=Fight.state==='swing'?'Punching':Fight.state==='hold'?'Impact':Fight.state==='recoil'?'Resetting':'Ready';return{action,detail:`Fight · ${action}`};
}
function renderPlayerHud(){const state=playerHudState(),compact=$('#hudProfileState'),current=$('#profileCurrentPlay'),context=$('#profileCurrentContext');if(compact)compact.textContent=state.action;if(current)current.textContent=state.action;if(context)context.textContent=state.detail;}
function renderOrientationHud(){const current=$('#orientationCurrentMode');if(current)current.textContent=MODE_NAMES[M.key]||M.key;$('#raceGarageShortcut').hidden=M!==Race;}
function renderHistorySummary(){const latest=LOGS[M.key].filter(x=>!x.sep).slice(-1)[0];$('#historyTitle').textContent=latest?latest.title:'Move log ready';$('#historyLatest').textContent=latest?`${fmtT(latest.t)}${latest.res?` · ${latest.res}`:''}${latest.math?` · ${plainMath(latest.math)}`:''}`:{fight:'Your next punch, dodge or block will appear here.',race:'Your next braking or corner event will appear here.',kick:'Your next shot event will appear here.'}[M.key];}
function renderGoalsSummary(){
  const total=Object.values(BADGES).reduce((n,l)=>n+l.length,0),earned=Object.keys(best.badges||{}).length;
  $('#goalsSummary').innerHTML=`<span>Level <b>${lvlOf(best.xp)}</b></span><span>XP <b>${fmt(best.xp||0,0)}</b></span><span>Badges <b>${earned}/${total}</b></span><span>Mode <b>${M.key[0].toUpperCase()+M.key.slice(1)}</b></span>`;
}
function renderCockpit(q){renderMathHud(q);renderMathConsole(q);renderChallengeHud();renderPlayerHud();renderOrientationHud();renderGoalsSummary();renderHistorySummary();syncDialsAvailability();}

setTimeout(()=>{document.querySelectorAll('.context-detail').forEach(p=>p.hidden=true);},0);
