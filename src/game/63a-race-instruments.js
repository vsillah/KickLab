/* Flagged Race dial: presentation and input routing over canonical Race state. */
const RACE_INSTRUMENTS=(()=>{
  const deck=$('.control-deck'),pad=$('#padR'),dial=$('#raceActionDial'),gas=$('#raceDialGas'),action=$('#raceDialAction');
  const previous=$('#raceDialPrevious'),next=$('#raceDialNext');
  const clamp=value=>Math.min(1,Math.max(0,value));
  const faceCircles=[[66,66,60],[22,27,22],[22,105,22],[110,66,22]];
  const outline=Array.from({length:360},(_,degree)=>{const theta=degree*Math.PI/180,ux=Math.cos(theta),uy=Math.sin(theta);let radius=60;for(const [cx,cy,r] of faceCircles.slice(1)){const x=cx-66,y=cy-66,projection=x*ux+y*uy,discriminant=projection*projection-(x*x+y*y-r*r);if(discriminant>=0)radius=Math.max(radius,projection+Math.sqrt(discriminant));}return`${degree?'L':'M'}${(66+radius*ux).toFixed(2)} ${(66+radius*uy).toFixed(2)}`;}).join(' ')+' Z';
  document.querySelectorAll('.race-dial-outline').forEach(path=>path.setAttribute('d',outline));
  const arcPoint=fraction=>{const angle=(-20+fraction*70)*Math.PI/180;return`${(60+49*Math.sin(angle)).toFixed(2)} ${(60-49*Math.cos(angle)).toFixed(2)}`;};
  function paintBands(svg,target,key){if(svg.dataset.bandKey===key)return;svg.dataset.bandKey=key;for(const [className,from,to] of [['low',0,target[0]],['opt',target[0],target[1]],['red',target[1],1]])svg.querySelector(`.race-dial-band-${className}`).setAttribute('d',`M ${arcPoint(from)} A 49 49 0 0 1 ${arcPoint(to)}`);}
  document.querySelectorAll('.race-mini-gauge').forEach(svg=>paintBands(svg,[.55,.78],'preview'));
  let gasPointer=null,gasKeyboard=false,trim=null,trimTimer=null,brakePointer=null,brakeArmed=false,brakeTimer=null,brakeExpiry=null;
  let actionPointer=null,actionTimer=null,actionHeld=false,selected=null,selectionContext='',gaugeLock=null;
  const style=()=>RACE_SIMULATOR.active?'simulator':ANALOG_CONTROL.enabled?'analog':'classic';
  const live=()=>RACE_INSTRUMENTS_ON&&M===Race&&Race.state==='run'&&!!Race.telemetry&&!PAUSE.on&&!RP.on&&!CINE.on&&!document.hidden&&RACE_3D.on&&RACE_3D.ready&&!RACE_3D.failed&&!deck.classList.contains('controller-collapsed')&&$('#racePhoneToolsToggle').getAttribute('aria-expanded')!=='true';
  const countdown=()=>RACE_INSTRUMENTS_ON&&M===Race&&Race.state==='count'&&!!Race.telemetry&&!PAUSE.on&&!RP.on&&!CINE.on&&!document.hidden&&RACE_3D.on&&RACE_3D.ready&&!RACE_3D.failed&&!deck.classList.contains('controller-collapsed')&&$('#racePhoneToolsToggle').getAttribute('aria-expanded')!=='true';
  const gasValue=()=>Number(Race.inp.gas)||0;
  function finishApproach(){if(!RACE_FINISHES.enabled||!['drag','hill'].includes(Race.mode().id)||Race.signatureFinish?.phase!=='run')return false;if(!RACE_MODES.finisherReady(Race.modeAttempt,Race.st.v,Race.P().top))return false;const distance=RACE_FINISHES.distance(Race.mode().id,Race.st);return distance>=0&&distance<=Math.max(22,Race.st.v*2.1)&&Race.st.v>=13;}
  const trimEligible=()=>Race.mode().id==='drift'||finishApproach();
  function releaseInput(id){if(M===Race)Race.press(id,false);}
  function dropTrim(){if(trimTimer)clearTimeout(trimTimer);trimTimer=null;if(trim)releaseInput('gas');trim=null;dial.dataset.trim='off';}
  function dropBrake(){if(brakeTimer)clearTimeout(brakeTimer);if(brakeExpiry)clearTimeout(brakeExpiry);brakeTimer=brakeExpiry=null;if(brakePointer||brakeArmed)releaseInput('brake');brakePointer=null;brakeArmed=false;dial.dataset.brakeArmed='false';pad.querySelector('[data-id="brake"]')?.classList.remove('on');}
  function dropAction(){if(actionTimer)clearTimeout(actionTimer);actionTimer=null;if(actionHeld)releaseInput('drift');actionHeld=false;actionPointer=null;}
  function cancel(){if(gasPointer||gasKeyboard)releaseInput('gas');gasPointer=null;gasKeyboard=false;dropTrim();dropBrake();dropAction();if(typeof RACE_CONTEXTUAL_COACH!=='undefined')RACE_CONTEXTUAL_COACH.cancel();}
  function choices(){
    if(!live())return[];
    const mode=Race.mode().id,t=Race.telemetry,out=[];
    if(mode==='drag'&&Race.modeAttempt?.gear<4)out.push({id:'shift',label:`Shift G${Race.modeAttempt.gear+1}`,icon:'⇧'});
    if(mode==='drift')out.push({id:'handbrake',label:'Handbrake',icon:'↶'});
    if(finishApproach())out.unshift({id:'finish-handbrake',label:'Finish handbrake',icon:'↶'});
    if(t.capacity>.1&&!t.overheat&&t.pressure>=.25&&t.nosPulse<=0)out.push({id:'nos',label:'NOS',icon:'⚡'});
    return out;
  }
  function place(){const mode=style(),host=mode==='analog'?$('#touchController'):mode==='simulator'?$('#raceSimulator .sim-controls'):pad.querySelector('.arcade');if(host&&dial.parentElement!==host)host.appendChild(dial);dial.dataset.controller=mode;}
  function cycle(direction){const list=choices();if(list.length<2)return false;const index=list.findIndex(item=>item.id===selected);dropAction();selected=list[(index+direction+list.length)%list.length].id;gaugeLock=null;paint();action.focus();return true;}
  function doAction(id){if(!live()||!choices().some(item=>item.id===id))return false;
    if(id==='shift'){const changed=Race.shiftGear();if(changed){requestMobileHaptic('tick');renderRaceTelemetry();if(typeof RACE_CONTEXTUAL_COACH!=='undefined')RACE_CONTEXTUAL_COACH.result('shift',Race.modeAttempt.lastShift==='optimal'?'success':Race.modeAttempt.lastShift==='early'?'early':Race.modeAttempt.lastShift==='late'?'late':'miss',`Gear ${Race.modeAttempt.gear}; ${Race.modeAttempt.lastShift} timing.`);}return changed;}
    if(id==='nos'){const changed=RACE_TELEMETRY.activateNos(Race.telemetry,.25);if(changed){gaugeLock={kind:'nos',until:performance.now()+1700};requestMobileHaptic('tick');renderRaceTelemetry();if(typeof RACE_CONTEXTUAL_COACH!=='undefined')RACE_CONTEXTUAL_COACH.result('nos','success','A short pulse was released.');}return changed;}
    return false;
  }
  function gauge(){
    const t=Race.telemetry,kind=selected==='nos'||gaugeLock&&gaugeLock.until>performance.now()?'nos':Race.mode().id==='drift'?'drift':'rpm';
    const shift=kind==='rpm'&&Race.mode().id==='drag'?RACE_MODES.shiftDisplay(Race.modeAttempt?.gear||1,Race.st.v,Race.P().top):null;
    if(shift)return{kind,fraction:shift.fraction,value:`${(shift.rpm/1000).toFixed(1)}k`,state:{early:'LOW',optimal:'OPT',late:'RED'}[shift.timing],target:shift.target,shift};
    const range=RACE_TELEMETRY.GAUGES.find(item=>item.id===kind)?.target||[.55,.78],fraction=kind==='nos'?t.pressure:kind==='drift'?t.angle:t.rpm;
    const value=kind==='nos'?`${Math.round(t.pressure*100)}%`:kind==='drift'?`${Math.round(Math.abs(Race.st.slipAngle||0)*180/Math.PI)}°`:`${(t.rpm*8.5).toFixed(1)}k`;
    let state=fraction<range[0]?'LOW':fraction<=range[1]?'OPT':'RED';
    if(kind==='nos')state=t.capacity<=.1?'EMPTY':t.overheat?'HOT':t.pressure<.25?'BUILD':t.nosPulse>0?'ON':state;
    if(kind==='drift'&&Race.st.driftMode==='skid')state='SPIN';
    return{kind,fraction:clamp(fraction),value,state};
  }
  function paint(){
    if(!RACE_INSTRUMENTS_ON)return;
    const active=live(),preview=countdown(),present=active||preview;
    deck.classList.toggle('race-instruments-live',present);deck.classList.toggle('race-instruments-countdown',preview);
    const setupPreview=$('#raceSetupInstrument');setupPreview.hidden=!(M===Race&&Race.state==='grid'&&deck.classList.contains('race-setup-preview'));$('#raceStageInstrument').hidden=setupPreview.hidden;
    if(!setupPreview.hidden){const drift=Race.mode().id==='drift',label=`Race action dial preview for ${Race.mode().name}. ${drift?'Handbrake':'Shift'} and NOS become available during the heat. Driving controls activate after the green light.`;$('#raceSetupInstrumentAction').textContent=drift?'↶':'⇧';$('#raceStageInstrumentAction').textContent=drift?'↶':'⇧';$('#raceSetupInstrumentHint').textContent=drift?'Handbrake and NOS appear when ready':'Shift and NOS appear when ready';setupPreview.setAttribute('aria-label',label);$('#raceStageInstrument').setAttribute('aria-label',label);}
    if(!present){cancel();dial.hidden=true;return;}
    if(preview){cancel();place();dial.hidden=false;dial.dataset.preview='true';dial.dataset.selected='';dial.dataset.available='';dial.dataset.actionPhase='build';dial.dataset.trim='off';dial.dataset.brakeArmed='false';paintBands(dial.querySelector('.race-dial-gauge'),[.55,.78],'preview');dial.style.setProperty('--needle-angle','-2.5deg');$('#raceDialMetricIcon').textContent='◉';$('#raceDialMetricValue').textContent='WAIT';$('#raceDialThrottle').textContent='0%';$('#raceDialHold').textContent='WAIT';action.hidden=false;$('#raceDialActionIcon').textContent=Race.mode().id==='drift'?'↶':'⇧';$('#raceDialActionName').textContent=Race.mode().id==='drift'?'DRIFT':'SHIFT';previous.hidden=next.hidden=false;for(const button of [gas,action,previous,next]){button.disabled=true;button.setAttribute('aria-disabled','true');}dial.setAttribute('aria-label','Race action dial preview. Controls activate after the green light.');return;}
    dial.dataset.preview='false';dial.setAttribute('aria-label','Race action dial');for(const button of [gas,action,previous,next]){button.disabled=false;button.removeAttribute('aria-disabled');}
    place();dial.hidden=false;if(trim&&(!trimEligible()||performance.now()>=trim.until))dropTrim();
    const list=choices(),context=`${Race.mode().id}:${finishApproach()?'finish':'drive'}`;
    if(context!==selectionContext||!list.some(item=>item.id===selected)){dropAction();selected=list[0]?.id||null;selectionContext=context;}
    const current=list.find(item=>item.id===selected),g=gauge(),amount=Math.round(clamp(gasValue())*100);
    dial.dataset.selected=current?.id||'';dial.dataset.available=list.map(item=>item.id).join(',');dial.dataset.gauge=g.kind;dial.dataset.gaugeState=g.state;
    dial.dataset.shiftTiming=g.shift?.timing||'';
    dial.dataset.actionPhase=current?.id==='shift'?(Race.modeAttempt.shiftCooldown>0||g.shift?.timing==='early'?'build':g.shift?.timing==='optimal'?'act':'danger'):current?.id==='nos'?'act':current?'act':'build';
    const target=g.target||RACE_TELEMETRY.GAUGES.find(item=>item.id===g.kind)?.target||[.55,.78];paintBands(dial.querySelector('.race-dial-gauge'),target,g.shift?`shift-${g.shift.gear}`:g.kind);
    dial.style.setProperty('--needle-angle',`${-20+g.fraction*70}deg`);
    const shiftDescription=g.shift?`Gear ${g.shift.gear} shift RPM estimate ${g.value}, ${g.state}. Canonical shift window ${Math.round(g.shift.window.low*Race.P().top*3.6)} to ${Math.round(g.shift.window.high*Race.P().top*3.6)} kilometers per hour.`:null;
    dial.querySelector('.race-dial-gauge').setAttribute('aria-label',shiftDescription||`${g.kind==='rpm'?'Engine RPM':g.kind==='nos'?'NOS pressure':'Drift slip angle'} ${g.value}, ${g.state}${g.kind==='nos'?`, heat ${Math.round(Race.telemetry.heat*100)} percent, tank ${Math.round(Race.telemetry.capacity*100)} percent`:''}`);
    $('#raceDialMetricIcon').textContent=g.kind==='nos'?'⚡':g.kind==='drift'?'↶':'◴';$('#raceDialMetricValue').textContent=g.shift?`RPM ${g.value}`:g.value;$('#raceDialMetric').setAttribute('aria-label',shiftDescription||`${g.kind==='nos'?'NOS pressure':g.kind==='drift'?'Drift angle':'Engine RPM'} ${g.value}, ${g.state}`);$('#raceDialThrottle').textContent=`${amount}%`;
    $('#raceDialHold').textContent=trim?`${Math.max(1,Math.ceil((trim.until-performance.now())/1000))}s HOLD`:brakeArmed?'BRK ARM':'LIVE';
    dial.dataset.trim=trim?'armed':'off';dial.dataset.brakeArmed=String(brakeArmed);
    gas.setAttribute('aria-label',`Gas, throttle ${amount} percent. Slide vertically to set real throttle. ${trimEligible()?'Hold at least half a second, then release to keep a four-second throttle trim.':'Releases immediately.'} ${trim?'Throttle trim active. ':''}${brakeArmed?'Brake launch control armed. ':''}`);
    action.hidden=!current;$('#raceDialActionIcon').textContent=current?.icon||'·';$('#raceDialActionName').textContent=current?.id==='finish-handbrake'?'FINISH':current?.id==='handbrake'?'DRIFT':current?.id==='shift'?'SHIFT':current?.label||'NONE';
    action.setAttribute('aria-label',current?`${current.label}. ${g.shift?shiftDescription:`${g.kind} ${g.value}, ${g.state}.`} ${current.id==='finish-handbrake'?'Steer and hold handbrake beside the finish marker.':current.id==='handbrake'?'Hold to apply canonical handbrake.':'Tap to use canonical action.'}`:'No eligible special action');
    previous.hidden=next.hidden=list.length<2;
    previous.setAttribute('aria-label',`Previous eligible Race action${list.length>1?`, ${list[(list.findIndex(item=>item.id===selected)-1+list.length)%list.length].label}`:''}`);
    next.setAttribute('aria-label',`Next eligible Race action${list.length>1?`, ${list[(list.findIndex(item=>item.id===selected)+1)%list.length].label}`:''}`);
    for(const brake of [pad.querySelector('[data-id="brake"]'),$('#raceAnalogActions [data-race-assist="brake"]'),$('#simBrake')])if(brake)brake.setAttribute('aria-label',`Brake. ${brakeArmed?'Launch control armed; tap to release and launch.':'Hold to brake; long-press while stopped to arm launch control.'}`);
    if(typeof RACE_CONTEXTUAL_COACH!=='undefined')RACE_CONTEXTUAL_COACH.render({dial,action,gas,current,g,brakeArmed,finishApproach:finishApproach()});
  }
  function setGasFromY(y){const box=gas.getBoundingClientRect();Race.press('gas',clamp((box.bottom-y)/Math.max(1,box.height)));paint();}
  gas.addEventListener('pointerdown',event=>{if(!live())return;event.preventDefault();event.stopPropagation();unlock();dropTrim();gasPointer={id:event.pointerId,at:performance.now()};try{gas.setPointerCapture(event.pointerId);}catch(_){}setGasFromY(event.clientY);});
  gas.addEventListener('pointermove',event=>{if(gasPointer?.id!==event.pointerId)return;event.preventDefault();setGasFromY(event.clientY);});
  gas.addEventListener('pointerup',event=>{if(gasPointer?.id!==event.pointerId)return;event.preventDefault();const elapsed=performance.now()-gasPointer.at;gasPointer=null;if(live()&&trimEligible()&&elapsed>=500&&gasValue()>=.15){trim={value:gasValue(),until:performance.now()+4000};trimTimer=setTimeout(()=>{dropTrim();paint();},4000);}else Race.press('gas',false);paint();});
  for(const type of ['pointercancel','lostpointercapture'])gas.addEventListener(type,event=>{if(gasPointer?.id===event.pointerId){gasPointer=null;Race.press('gas',false);paint();}});
  gas.addEventListener('keydown',event=>{if(!live()||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();gasKeyboard=true;Race.press('gas',clamp(gasValue()+(event.key==='ArrowUp'?.1:-.1)));paint();});
  gas.addEventListener('blur',()=>{if(gasKeyboard){gasKeyboard=false;Race.press('gas',false);paint();}});
  function brakeDown(event,button){if(!live())return;event.preventDefault();event.stopImmediatePropagation();unlock();dropTrim();if(brakeArmed){dropBrake();paint();return;}brakePointer={id:event.pointerId,button};button.classList.add('on');try{button.setPointerCapture(event.pointerId);}catch(_){}Race.press('brake',true);if(Race.mode().id==='drag'&&Race.st.v<1.5)brakeTimer=setTimeout(()=>{if(!brakePointer||Race.st.v>=1.5)return;brakeArmed=true;dial.dataset.brakeArmed='true';brakeExpiry=setTimeout(()=>{cancel();paint();if(typeof RACE_CONTEXTUAL_COACH!=='undefined')RACE_CONTEXTUAL_COACH.result('launch','miss','Brake hold expired before launch.');},5000);paint();},500);paint();}
  function brakeUp(event){if(!live()&&brakePointer?.id!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();if(brakePointer?.id!==event.pointerId)return;if(brakeTimer)clearTimeout(brakeTimer);brakeTimer=null;brakePointer.button.classList.remove('on');if(event.type!=='pointerup'||!brakeArmed)dropBrake();else{brakePointer=null;if(typeof RACE_CONTEXTUAL_COACH!=='undefined')RACE_CONTEXTUAL_COACH.result('launch','success','Brake hold armed; release can launch.');}paint();}
  pad.addEventListener('pointerdown',event=>{const button=event.target.closest('[data-id="brake"]');if(button&&style()==='classic')brakeDown(event,button);},true);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,event=>{if(event.target.closest('[data-id="brake"]')&&style()==='classic')brakeUp(event);},true);
  for(const button of [$('#raceAnalogActions [data-race-assist="brake"]'),$('#simBrake')]){button.addEventListener('pointerdown',event=>brakeDown(event,button),true);for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,brakeUp,true);}
  function actionDown(event,kind=selected){if(!live())return;event.preventDefault();event.stopPropagation();actionPointer={id:event.pointerId??'keyboard',x:event.clientX??0,y:event.clientY??0,kind,swiped:false,direction:0};if(event.pointerId!=null)try{dial.setPointerCapture(event.pointerId);}catch(_){}if(kind?.includes('handbrake'))actionTimer=setTimeout(()=>{if(actionPointer?.kind===kind&&!actionPointer.swiped&&choices().some(item=>item.id===kind)){Race.press('drift',true);actionHeld=true;paint();}},80);}
  function actionUp(event){if(!actionPointer||event.pointerId!=null&&actionPointer.id!==event.pointerId)return;event?.preventDefault();const gesture=actionPointer,held=actionHeld,drifting=Race.st.driftMode==='drift';dropAction();if(gesture.swiped){cycle(gesture.direction);return;}if(gesture.kind==='handbrake'&&held&&typeof RACE_CONTEXTUAL_COACH!=='undefined')RACE_CONTEXTUAL_COACH.result('drift',drifting?'success':'miss',drifting?'Controlled slide registered.':'Handbrake held, but a controlled slide did not register.');if(gesture.kind&&!gesture.kind.includes('handbrake'))doAction(gesture.kind);paint();}
  action.addEventListener('pointerdown',event=>actionDown(event));
  dial.addEventListener('pointerdown',event=>{if(event.target===dial||event.target.closest('.race-dial-gauge'))actionDown(event,null);});
  dial.addEventListener('pointermove',event=>{if(actionPointer?.id!==event.pointerId)return;const dx=event.clientX-actionPointer.x,dy=event.clientY-actionPointer.y;if(Math.hypot(dx,dy)<24)return;actionPointer.swiped=true;actionPointer.direction=dx<0||Math.abs(dx)<8&&dy>0?1:-1;if(actionTimer)clearTimeout(actionTimer);actionTimer=null;if(actionHeld){Race.press('drift',false);actionHeld=false;}});
  dial.addEventListener('pointerup',event=>{if(actionPointer?.id===event.pointerId)actionUp(event);});
  for(const type of ['pointercancel','lostpointercapture'])dial.addEventListener(type,event=>{if(actionPointer?.id===event.pointerId){dropAction();paint();}});
  action.addEventListener('keydown',event=>{if([' ','Enter'].includes(event.key)&&!event.repeat)actionDown(event);});
  action.addEventListener('keyup',event=>{if([' ','Enter'].includes(event.key))actionUp(event);});
  action.addEventListener('blur',()=>{if(actionPointer?.id==='keyboard'){dropAction();paint();}});
  previous.addEventListener('click',()=>cycle(-1));next.addEventListener('click',()=>cycle(1));
  dial.addEventListener('keydown',event=>{if(event.target===gas)return;if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();cycle(event.key==='ArrowRight'?1:-1);}if(event.key==='Escape'){event.preventDefault();cancel();paint();}});
  for(const type of ['blur','orientationchange','pagehide'])window.addEventListener(type,()=>{cancel();paint();if(typeof RACE_CONTEXTUAL_COACH!=='undefined')RACE_CONTEXTUAL_COACH.suspend();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();paint();if(typeof RACE_CONTEXTUAL_COACH!=='undefined')RACE_CONTEXTUAL_COACH.suspend();}});
  return Object.freeze({render:paint,cancel});
})();
function renderRaceInstruments(){RACE_INSTRUMENTS.render();}
if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('raceShiftQA')==='1')globalThis.__KICKLAB_RACE_SHIFT_QA__=Object.freeze({
  state(){return{phase:Race.state,x:Race.st.x,gear:Race.modeAttempt?.gear,lastShift:Race.modeAttempt?.lastShift,ratio:Race.st.v/Math.max(1,Race.P().top),window:RACE_MODES.shiftWindow(Race.modeAttempt?.gear),selected:$('#raceActionDial').dataset.selected,available:$('#raceActionDial').dataset.available,gauge:$('#raceActionDial').dataset.gaugeState,metric:$('#raceDialMetric').textContent};},
  fixture(gear,ratio){if(!RACE_INSTRUMENTS_ON||Race.mode().id!=='drag'||Race.state!=='run'||!RACE_3D.ready)return null;const top=Race.P().top;Race.modeAttempt.gear=gear;Race.modeAttempt.phase='run';Race.modeAttempt.shiftCooldown=0;Race.st.v=ratio*top;Race.telemetry.rpm=.11;RACE_INSTRUMENTS.render();const dial=$('#raceActionDial'),attempt=RACE_MODES.initial('drag');attempt.phase='run';attempt.gear=gear;RACE_MODES.shift(attempt,Race.st.v,top,true);return{gear,ratio,phase:dial.dataset.gaugeState,timing:dial.dataset.shiftTiming,action:dial.dataset.actionPhase,selected:dial.dataset.selected,metric:$('#raceDialMetric').textContent,aria:$('#raceDialMetric').getAttribute('aria-label'),ghost:!dial.querySelector('.race-control-ghost')?.hidden,pulse:getComputedStyle($('#raceDialAction')).animationName,scored:attempt.lastShift,needle:dial.style.getPropertyValue('--needle-angle'),band:dial.querySelector('.race-dial-band-opt').getAttribute('d')};}
});
