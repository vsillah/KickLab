/* Optional, device-local Race preparation. Draft choices never touch profile progress. */
const RACE_PREFLIGHT_ON=Race.expansionActive()&&globalThis.KickLabRaceOrigin.trusted()&&new URLSearchParams(location.search).get('racePreflight')==='prototype';
if(RACE_PREFLIGHT_ON)document.documentElement.dataset.racePreflight='prototype';
const RACE_PREFLIGHT={phase:0,draft:null,profileId:null,lastEpoch:-1,committing:false,committed:false,lastRaceState:null,returnFocus:null,notice:''};
const RACE_PREFLIGHT_PHASES=['Location','Vehicle','Garage tuning','Starting grid'];
const RACE_ROUTE_TRAITS={
  drag:['Straight · 240 m','Highland road · weather fixed','Launch, shifts and heat','Intro'],
  drift:['Two linked curves','Highland road · weather fixed','Controlled slide and recovery','Technical'],
  circuit:['Oval · two laps','Highland road · weather fixed','Repeatable braking','Intermediate'],
  hill:['Switchback climb','Highland road · weather fixed','Grade, grip and stopping','Technical'],
  endurance:['Oval · three long laps','Highland road · weather fixed','Pace and engine heat','Advanced']
};
function racePreflightDraft(){
  const fixed=typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active?RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected].mode:null;
  const control=RACE_SIMULATOR.active?'simulator':$('#analogControlsButton').getAttribute('aria-pressed')==='true'?'analog':'classic';
  return{mode:fixed||Race.mode().id,vehicle:Race.vehicle().id,garage:{...Race.garage},control,steer:Race.opt.steer};
}
function racePreflightCanOpen(){return RACE_PREFLIGHT_ON&&M===Race&&Race.state==='grid'&&!PAUSE.on&&!RP.on&&!$('#game-cockpit').hidden&&$('#settingsDrawer').hidden&&$('#profileDialog').hidden&&!(typeof RACE_MULTI_UI!=='undefined'&&RACE_MULTI_UI.match);}
function racePreflightOpen(trigger=null){
  if(!racePreflightCanOpen())return false;
  if(RACE_PREFLIGHT.profileId!==profileManager.active().id||!RACE_PREFLIGHT.draft){RACE_PREFLIGHT.draft=racePreflightDraft();RACE_PREFLIGHT.phase=0;RACE_PREFLIGHT.profileId=profileManager.active().id;}
  RACE_PREFLIGHT.returnFocus=trigger&&trigger.isConnected?trigger:document.activeElement;
  RACE_PREFLIGHT.lastEpoch=Race.preflightEpoch||0;
  RACE_PREFLIGHT.notice='Your choices stay on this device. Nothing changes until Start heat.';
  $('#racePreflight').hidden=false;
  document.documentElement.dataset.racePreflightOpen='true';
  racePreflightRender();
  requestAnimationFrame(()=>$('#racePreflightClose').focus());
  return true;
}
function racePreflightMaybeOpen(){
  if(!RACE_PREFLIGHT_ON)return;
  if(M===Race&&RACE_PREFLIGHT.lastRaceState&&RACE_PREFLIGHT.lastRaceState!=='grid'&&Race.state==='grid'){RACE_PREFLIGHT.lastEpoch=-1;RACE_PREFLIGHT.committed=false;RACE_PREFLIGHT.draft=null;}
  RACE_PREFLIGHT.lastRaceState=M===Race?Race.state:null;
  if(!racePreflightCanOpen()||!$('#racePreflight').hidden||RACE_PREFLIGHT.committing||RACE_PREFLIGHT.committed||RACE_PREFLIGHT.lastEpoch===(Race.preflightEpoch||0)||RACE_3D.on&&!RACE_3D.orbit.done)return;
  RACE_PREFLIGHT.draft=null;
  racePreflightOpen($('#raceCoachSetupStart'));
}
function racePreflightClose(){
  $('#racePreflight').hidden=true;
  document.documentElement.dataset.racePreflightOpen='false';
  RACE_PREFLIGHT.lastEpoch=Race.preflightEpoch||0;
  RACE_PREFLIGHT.draft=null;
  const target=RACE_PREFLIGHT.returnFocus;
  RACE_PREFLIGHT.returnFocus=null;
  requestAnimationFrame(()=>(target&&target.isConnected?target:$('#raceCoachSetupStart')).focus());
}
function racePreflightMode(){return RACE_MODES.config(RACE_PREFLIGHT.draft.mode);}
function racePreflightCar(){return globalThis.KickLabRaceVehicleCatalog.get(RACE_PREFLIGHT.draft.vehicle);}
function racePreflightParams(build){
  const car=racePreflightCar(),venue=RACE_SYSTEMS.venue(racePreflightMode().venue),radius=racePreflightMode().id==='endurance'?RACE_MODES.ENDURANCE_TRACK.radius:Race.V.R;
  const P=RACE_GARAGE.parameters({L:Race.L,R:radius,m:car.massKg,F:car.driveForceN,top:car.topMps,mu:Race.V.mu*car.grip*venue.baseGrip*venue.gripZones[0].multiplier,tireMu:Race.V.mu*car.grip,Lwb:car.wheels.wheelbaseM,ratio:Race.RATIO},build);
  P.rolling*=car.rollingLoss;P.stability*=car.steeringResponse;P.response*=car.steeringResponse;P.recovery*=car.slideRecovery;P.brakeHeat*=car.brakeHeat;P.brakeRecovery=car.brakeRecovery;return P;
}
function racePreflightMetric(name,stock,tuned,unit='',digits=1){const format=value=>Number(value).toFixed(digits);const delta=tuned-stock;return`<span><small>${name}</small><b>${format(stock)}${unit} → ${format(tuned)}${unit}</b><em>${delta===0?'Stock':`${delta>0?'+':''}${format(delta)}${unit}`}</em></span>`;}
function racePreflightLocation(){const draft=RACE_PREFLIGHT.draft,fixed=typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active?RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected].mode:null;
  return`<div class="race-preflight-intro"><p>Pick the challenge before you tune the car. All current routes use Highland. Weather is fixed in this Race build.</p><aside><b>Coach Nia</b><span>${racePreflightMode().recommend}</span></aside></div><div class="race-preflight-route-list" role="group" aria-label="Race locations and challenges">${Object.values(RACE_MODES.MODES).map((mode,index)=>{const [route,surface,challenge,difficulty]=RACE_ROUTE_TRAITS[mode.id];const selected=draft.mode===mode.id,locked=!!fixed&&fixed!==mode.id;return`<button type="button" class="race-preflight-route" data-preflight-mode="${mode.id}" aria-pressed="${selected}" ${locked?'disabled':''}><span class="race-preflight-route-art route-${mode.id}" aria-hidden="true"><i></i><b>${String(index+1).padStart(2,'0')}</b></span><span class="race-preflight-route-copy"><small>${difficulty} · ${route}</small><strong>${mode.name}</strong><span>${surface} · ${challenge}</span><em>${mode.target}</em>${locked?'<small>Championship event is fixed</small>':''}</span></button>`;}).join('')}</div>`;
}
function racePreflightVehicle(){const mode=racePreflightMode(),selected=racePreflightCar(),cars=globalThis.KickLabRaceVehicleCatalog.list(),build=RACE_PREFLIGHT.draft.garage;
  const P=racePreflightParams(build),summary=RACE_GARAGE.summary(P);
  return`<div class="race-preflight-showroom"><div class="race-preflight-feature"><img src="${selected.thumbnailUrl}" alt="${selected.name} vehicle, elevated three-quarter view" width="640" height="400"><div><small>LOCAL GARAGE · ${selected.role}</small><h3>${selected.name}</h3><p>${selected.strength}</p><p>${selected.modeSuitability[mode.id]}</p><small>Tradeoff: ${selected.shortTradeoff}</small></div></div><div class="race-preflight-specs" aria-label="${selected.name} physics comparison">${[
    ['Power',`${selected.driveForceN.toLocaleString()} N`],['Handling',`${Math.round(selected.steeringResponse*100)}% response`],['Acceleration',`${(selected.driveForceN/selected.massKg).toFixed(1)} m/s² before grip`],['Braking',`${summary.stop.toFixed(1)} m from ${Math.round(summary.stopSpeedKmh)} km/h`],['Grip',`μ ${summary.grip.toFixed(2)}`],['Heat / cooling',`${Math.round(selected.brakeHeat*100)}% heat · ${Math.round(selected.brakeRecovery*100)}% recovery`],['Mode fit',selected.modeSuitability[mode.id]]].map(([label,value])=>`<span><small>${label}</small><b>${value}</b></span>`).join('')}</div></div><div class="race-preflight-roster" role="group" aria-label="Choose vehicle by button or horizontal scroll">${cars.map(car=>`<button type="button" data-preflight-vehicle="${car.id}" aria-pressed="${car.id===selected.id}"><img src="${car.thumbnailUrl}" alt="" width="640" height="400"><b>${car.name}</b><small>${car.role}</small></button>`).join('')}</div><p class="race-preflight-footnote">Scroll the car carousel or choose a card to feature it. All three locally bundled cars are available on this device.</p>`;
}
function racePreflightTuning(){const draft=RACE_PREFLIGHT.draft,mode=racePreflightMode(),stock={...draft.garage,suspension:'balanced',tires:'balanced',brakes:'standard'},before=RACE_GARAGE.summary(racePreflightParams(stock)),after=RACE_GARAGE.summary(racePreflightParams(draft.garage));
  return`<div class="race-preflight-intro"><p>${racePreflightCar().name} · ${mode.name}. Change a real Garage part to see its effect.</p><aside><b>Coach Nia</b><span>${mode.garage}</span></aside></div><div class="race-preflight-tune-layout"><div class="race-preflight-tune-preview"><img src="${racePreflightCar().thumbnailUrl}" alt="${racePreflightCar().name} car" width="640" height="400"><div class="race-preflight-deltas">${racePreflightMetric('Launch',before.launch,after.launch,' m/s²')}${racePreflightMetric('Corner limit',before.corner,after.corner,' km/h',0)}${racePreflightMetric('First stop',before.stop,after.stop,' m')}${racePreflightMetric('Turn-in',before.steeringResponse*100,after.steeringResponse*100,'%',0)}${racePreflightMetric('Slide recovery',before.slideRecovery*100,after.slideRecovery*100,'%',0)}</div></div><div class="race-preflight-parts">${['suspension','tires','brakes'].map(field=>{const part=RACE_GARAGE.PARTS[field],choice=RACE_GARAGE.option(field,draft.garage[field]),lesson=RACE_GARAGE.lesson(field,draft.garage,racePreflightParams(draft.garage));return`<fieldset><legend>${part.label}</legend><div class="race-preflight-part-options">${part.choices.map(option=>`<button type="button" data-preflight-part="${field}" data-preflight-value="${option.id}" aria-pressed="${option.id===choice.id}"><b>${option.name}</b><small>${option.detail}</small></button>`).join('')}</div><p><b>Coach Nia:</b> ${lesson.when} ${lesson.tradeoff}</p></fieldset>`;}).join('')}<p class="race-preflight-footnote">Body class follows the chosen vehicle. Tire width is the supported wheel choice. Steering response comes from suspension and tire turn-in; cooling comes from the brake package and vehicle. There are no separate tuning sliders for them.</p></div></div>`;
}
function racePreflightGrid(){const d=RACE_PREFLIGHT.draft,mode=racePreflightMode(),car=racePreflightCar(),parts=['suspension','tires','brakes'].map(field=>RACE_GARAGE.option(field,d.garage[field]).name);
  return`<div class="race-preflight-grid"><div class="race-preflight-grid-car"><img src="${car.thumbnailUrl}" alt="${car.name} on the starting grid" width="640" height="400"><span>STARTING GRID · HIGHLAND</span></div><div class="race-preflight-grid-brief"><small>${mode.name} · ${RACE_ROUTE_TRAITS[mode.id][0]}</small><h3>${car.name} is lined up</h3><p>${mode.target}</p><dl><div><dt>Car</dt><dd>${car.name} · ${car.role}</dd></div><div><dt>Tune</dt><dd>${parts.join(' · ')}</dd></div><div><dt>Controls</dt><dd>${d.control==='classic'?'Classic':d.control==='analog'?'Analog':'Simulator'} · ${d.steer==='auto'?'Autopilot steering':'You steer'}</dd></div></dl><aside><b>Coach Nia</b><span>${mode.recommend}</span></aside><div class="race-preflight-control-options" role="group" aria-label="Control style">${[['classic','Classic'],['analog','Analog'],...(typeof simFlag!=='undefined'&&simFlag?[['simulator','Simulator']]:[])].map(([id,name])=>`<button type="button" data-preflight-control="${id}" aria-pressed="${d.control===id}">${name}</button>`).join('')}</div><button type="button" id="racePreflightSteer">${d.steer==='auto'?'Autopilot steering':'You steer'}</button><small>Start heat commits these choices to this player and begins the existing Race lights.</small></div></div>`;
}
function racePreflightFocus(selector){requestAnimationFrame(()=>$('#racePreflight '+selector)?.focus({preventScroll:true}));}
function racePreflightRender(){if($('#racePreflight').hidden)return;const phase=RACE_PREFLIGHT.phase;
  $('#racePreflightTitle').textContent=['Choose your location','Choose your vehicle','Tune in the Garage','Take your place on the grid'][phase];
  $('#racePreflightSteps').innerHTML=RACE_PREFLIGHT_PHASES.map((name,index)=>`<button type="button" data-preflight-step="${index}" ${index>phase?'disabled':''} aria-current="${index===phase?'step':'false'}"><b>${index+1}</b><span>${name}</span></button>`).join('');
  $('#racePreflightStatus').textContent=RACE_PREFLIGHT.notice;
  $('#racePreflightContent').innerHTML=[racePreflightLocation,racePreflightVehicle,racePreflightTuning,racePreflightGrid][phase]();
  $('#racePreflightBack').textContent=phase?'Back':'Cancel';$('#racePreflightNext').textContent=phase===3?'Start heat':'Continue';
  if(phase===1)requestAnimationFrame(()=>{const roster=$('#racePreflight .race-preflight-roster'),selected=roster?.querySelector('[aria-pressed=\"true\"]');if(roster&&selected)roster.scrollLeft=selected.offsetLeft-roster.offsetLeft-(roster.clientWidth-selected.clientWidth)/2;});
}
let racePreflightScrollTimer=0;
$('#racePreflightContent').addEventListener('scroll',event=>{const roster=event.target;if(!roster.classList?.contains('race-preflight-roster')||RACE_PREFLIGHT.phase!==1)return;clearTimeout(racePreflightScrollTimer);racePreflightScrollTimer=setTimeout(()=>{if($('#racePreflight').hidden||RACE_PREFLIGHT.phase!==1)return;const middle=roster.getBoundingClientRect().left+roster.clientWidth/2,button=[...roster.querySelectorAll('[data-preflight-vehicle]')].reduce((nearest,item)=>Math.abs(item.getBoundingClientRect().left+item.clientWidth/2-middle)<Math.abs(nearest.getBoundingClientRect().left+nearest.clientWidth/2-middle)?item:nearest);if(button.dataset.preflightVehicle!==RACE_PREFLIGHT.draft.vehicle){RACE_PREFLIGHT.draft.vehicle=button.dataset.preflightVehicle;RACE_PREFLIGHT.draft.garage.body=globalThis.KickLabRaceVehicleCatalog.get(button.dataset.preflightVehicle).legacyBodyId;RACE_PREFLIGHT.notice=`${button.textContent.trim()} featured. Compatible tuning kept.`;racePreflightRender();}},220);},true);
function racePreflightCommit(){
  if(!racePreflightCanOpen()||RACE_PREFLIGHT.profileId!==profileManager.active().id)return;
  const d=RACE_PREFLIGHT.draft,mode=RACE_MODES.config(d.mode),vehicle=globalThis.KickLabRaceVehicleCatalog.get(d.vehicle);
  if(!mode||!vehicle||!RACE_GARAGE.fields.every(field=>RACE_GARAGE.option(field,d.garage[field])))return;
  if(typeof RACE_CHAMP_UI!=='undefined'&&RACE_CHAMP_UI.active&&RACE_CHAMP.EVENTS[RACE_CHAMP_UI.selected].mode!==mode.id)return;
  RACE_PREFLIGHT.committing=true;
  if(!RACE_CHAMP_UI.active&&Race.mode().id!==mode.id)Race.selectMode(mode.id);
  for(const field of RACE_GARAGE.fields)if(Race.garage[field]!==d.garage[field])Race.setGaragePart(field,d.garage[field]);
  Race.opt.steer=d.steer;
  if(d.control==='simulator'&&typeof simFlag!=='undefined'&&simFlag)simSelect(true);else{if(RACE_SIMULATOR.active)simSelect(false);setPrototypeControls(d.control==='analog');}
  RACE_3D.orbit.phase='done';RACE_3D.orbit.done=true;
  RACE_PREFLIGHT.lastEpoch=Race.preflightEpoch||0;
  $('#racePreflight').hidden=true;document.documentElement.dataset.racePreflightOpen='false';RACE_PREFLIGHT.draft=null;
  RACE_PREFLIGHT.committed=true;
  renderAll(false);renderRaceTelemetry();
  RACE_PREFLIGHT.committing=false;
  const start=d.control==='simulator'&&typeof simFlag!=='undefined'&&simFlag?$('#simStart'):$('#raceCoachSetupStart');
  if(start.hidden){RACE_PREFLIGHT.notice='The starting lights are not ready. Preparation is saved; use Start heat on the grid.';return;}
  start.click();
}
$('#racePreflight').addEventListener('click',event=>{const mode=event.target.closest('[data-preflight-mode]'),car=event.target.closest('[data-preflight-vehicle]'),part=event.target.closest('[data-preflight-part]'),control=event.target.closest('[data-preflight-control]'),step=event.target.closest('[data-preflight-step]');if(mode&&!mode.disabled){RACE_PREFLIGHT.draft.mode=mode.dataset.preflightMode;RACE_PREFLIGHT.notice=`Coach Nia: ${racePreflightMode().recommend}`;racePreflightRender();racePreflightFocus(`[data-preflight-mode=\"${mode.dataset.preflightMode}\"]`);}else if(car){const previous=RACE_PREFLIGHT.draft.vehicle;RACE_PREFLIGHT.draft.vehicle=car.dataset.preflightVehicle;RACE_PREFLIGHT.draft.garage.body=globalThis.KickLabRaceVehicleCatalog.get(RACE_PREFLIGHT.draft.vehicle).legacyBodyId;RACE_PREFLIGHT.notice=previous===RACE_PREFLIGHT.draft.vehicle?'Current car retained.':'Vehicle changed. Suspension, tires and brakes remain compatible and were kept.';racePreflightRender();racePreflightFocus(`[data-preflight-vehicle=\"${car.dataset.preflightVehicle}\"]`);}else if(part){RACE_PREFLIGHT.draft.garage[part.dataset.preflightPart]=part.dataset.preflightValue;RACE_PREFLIGHT.notice=RACE_GARAGE.option(part.dataset.preflightPart,part.dataset.preflightValue).coach;racePreflightRender();racePreflightFocus(`[data-preflight-part=\"${part.dataset.preflightPart}\"][data-preflight-value=\"${part.dataset.preflightValue}\"]`);}else if(control){RACE_PREFLIGHT.draft.control=control.dataset.preflightControl;RACE_PREFLIGHT.notice=`${control.textContent} controls selected for this heat.`;racePreflightRender();racePreflightFocus(`[data-preflight-control="${control.dataset.preflightControl}"]`);}else if(step&&!step.disabled){RACE_PREFLIGHT.phase=Number(step.dataset.preflightStep);racePreflightRender();racePreflightFocus(`[data-preflight-step=\"${step.dataset.preflightStep}\"]`);}else if(event.target.id==='racePreflightSteer'){RACE_PREFLIGHT.draft.steer=RACE_PREFLIGHT.draft.steer==='auto'?'you':'auto';racePreflightRender();racePreflightFocus('#racePreflightSteer');}});
$('#racePreflightClose').addEventListener('click',racePreflightClose);
$('#racePreflightBack').addEventListener('click',()=>{if(RACE_PREFLIGHT.phase===0)racePreflightClose();else{RACE_PREFLIGHT.phase--;racePreflightRender();requestAnimationFrame(()=>$('#racePreflightBack').focus());}});
$('#racePreflightNext').addEventListener('click',()=>{if(RACE_PREFLIGHT.phase===3)racePreflightCommit();else{RACE_PREFLIGHT.phase++;racePreflightRender();requestAnimationFrame(()=>$('#racePreflightNext').focus());}});
$('#racePreflight').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();racePreflightClose();}else if(event.key==='Tab'){const buttons=[...$('#racePreflight').querySelectorAll('button:not([disabled])')].filter(node=>node.getClientRects().length);if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
window.addEventListener('keydown',event=>{if($('#racePreflight').hidden||event.key!=='Escape')return;event.preventDefault();event.stopImmediatePropagation();racePreflightClose();},true);
if(RACE_PREFLIGHT_ON&&['localhost','127.0.0.1'].includes(location.hostname))globalThis.__KICKLAB_RACE_PREFLIGHT_QA__=Object.freeze({state:()=>({open:!$('#racePreflight').hidden,phase:RACE_PREFLIGHT.phase,draft:RACE_PREFLIGHT.draft?{...RACE_PREFLIGHT.draft,garage:{...RACE_PREFLIGHT.draft.garage}}:null,profileId:RACE_PREFLIGHT.profileId,raceState:Race.state,epoch:Race.preflightEpoch,lastEpoch:RACE_PREFLIGHT.lastEpoch,saved:{mode:best.raceModes?.selected,garage:{...best.raceGarage},xp:best.xp}}),open:()=>racePreflightOpen(),close:racePreflightClose});
