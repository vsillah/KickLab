/* ---------- reversible analog + gesture controller prototype ---------- */
const ANALOG_CONTROL={enabled:false,pointer:null,center:null,value:{x:0,y:0,magnitude:0},pressed:new Set(),keys:new Set(),lastStep:0};
const GESTURE_CONTROL={pointer:null,start:0,origin:null,points:[],power:0,state:'early',targetBuzzed:false,overBuzzed:false,frame:0,continuousId:null};
const controlStyleGroup=$('.prototype-control-bar'),classicControlsButton=$('#classicControlsButton'),analogControlsButton=$('#analogControlsButton'),touchController=$('#touchController'),analogStick=$('#analogStick'),analogKnob=$('#analogKnob'),gestureAction=$('#gestureAction');
const floatingControlDeck=$('.control-deck'),controllerCollapseButton=$('#controllerCollapseButton'),floatingControllerState=$('#floatingControllerState');
const FLOATING_CONTROLLER={collapsed:matchMedia('(max-width:480px)').matches};
const nativeHapticPlugin=globalThis.Capacitor&&globalThis.Capacitor.Plugins&&globalThis.Capacitor.Plugins.Haptics;
const haptic=GAME_CORE.hapticCapability(nativeHapticPlugin?{vibrate(){}}:navigator);

function analogContext(){return{mode:M.key,shot:M===Kick?Kick.opt.shot:null,pso:M===Kick?Kick.opt.pso:null,state:M===Kick&&Kick.opt.shot==='dribble'?Drib.state:M.state,pass:M===Kick&&!!Drib.ps,keeper:M===Kick&&!!Drib.gs,combo:M===Kick&&!!Drib.cb};}
function analogMapping(){return GAME_CORE.resolveControlMapping(analogContext());}
function primaryAction(){return M.actions().find(a=>a.primary)||null;}
function actionForDirection(direction){return M.actions().find(a=>a.dir===direction&&!a.disabled&&!a.step)||null;}
function vibrateFor(name){if(typeof MOBILE_SHELL!=='undefined')return MOBILE_SHELL.haptic(name);if(!haptic.supported)return false;try{return navigator.vibrate(GAME_CORE.hapticCueFor(name));}catch(_){return false;}}
function powerLabel(state){return{early:'Early',target:'Target band',perfect:'Perfect',overcharge:'Overcharge'}[state]||'Ready';}

function renderAnalogControls(){
  if(!analogControlsButton)return;
  const map=analogMapping(),primary=primaryAction();touchController.style.setProperty('--control-accent',map.color);
  $('#touchMapTitle').textContent=map.title;$('#touchMapAxes').textContent=`${map.x.join(' ↔ ')} · ${map.y.join(' ↔ ')}`;
  $('#analogLeftLabel').textContent=map.x[0];$('#analogRightLabel').textContent=map.x[1];$('#analogDownLabel').textContent=map.y[0];$('#analogUpLabel').textContent=map.y[1];
  const variableAxes=M===Kick&&Kick.opt.shot!=='dribble';[['analogLeftLabel','left'],['analogRightLabel','right'],['analogDownLabel','down'],['analogUpLabel','up']].forEach(([id,direction])=>{$(`#${id}`).classList.toggle('disabled',!variableAxes&&!actionForDirection(direction));});
  $('#touchHapticStatus').textContent=haptic.label;$('#gestureActionVerb').textContent=primary?(primary.label||map.action[0]):map.action[0];
  $('#gestureActionIcon').innerHTML=ICONS[(primary&&primary.icon)||map.icon]||ICONS.run;
  $('#gestureInstructions').textContent=map.action[1]+' · hold, curve, release';gestureAction.disabled=!primary||!!primary.disabled;
  gestureAction.setAttribute('aria-label',`${primary?(primary.label||map.action[0]):map.action[0]}. Hold to charge, slide to add spin, and release to act. ${haptic.label}.`);
}

function renderFloatingControllerState(){
  if(!floatingControllerState)return;const style=ANALOG_CONTROL.enabled?'Analog':'Classic',mode=typeof CONTROLLER!=='undefined'&&CONTROLLER.mode==='manual'?'Manual':'Play';floatingControllerState.textContent=`${style} · ${mode}`;
}
function setFloatingControllerCollapsed(collapsed,{focus=false}={}){
  FLOATING_CONTROLLER.collapsed=!!collapsed;floatingControlDeck.classList.toggle('controller-collapsed',FLOATING_CONTROLLER.collapsed);controllerCollapseButton.setAttribute('aria-expanded',String(!FLOATING_CONTROLLER.collapsed));controllerCollapseButton.setAttribute('aria-label',FLOATING_CONTROLLER.collapsed?'Expand game controls':'Collapse game controls');
  if(FLOATING_CONTROLLER.collapsed){cancelAnalog('Controls collapsed');cancelGesture('Controls collapsed');}
  if(focus)controllerCollapseButton.focus();requestAnimationFrame(resize);
}

function setPrototypeControls(on){
  ANALOG_CONTROL.enabled=!!on;classicControlsButton.setAttribute('aria-pressed',String(!ANALOG_CONTROL.enabled));analogControlsButton.setAttribute('aria-pressed',String(ANALOG_CONTROL.enabled));
  touchController.hidden=!ANALOG_CONTROL.enabled;$('.control-deck').classList.toggle('prototype-active',ANALOG_CONTROL.enabled);
  if(!ANALOG_CONTROL.enabled){cancelAnalog('Classic controls restored');cancelGesture('Classic controls restored');}
  else{$('#gesturePowerStatus').textContent='Ready · release timing sets power';renderAnalogControls();}
  renderFloatingControllerState();
  requestAnimationFrame(resize);
}

function analogDirections(value){const t=0.16,out=[];if(value.x<-t)out.push('left');if(value.x>t)out.push('right');if(value.y<-t)out.push('up');if(value.y>t)out.push('down');return out;}
function syncDirectionalActions(value){
  const desired=new Map();analogDirections(value).forEach(direction=>{const action=actionForDirection(direction);if(action)desired.set(action.id,action);});
  ANALOG_CONTROL.pressed.forEach(id=>{if(!desired.has(id)){gameInput(id,false,'analog');ANALOG_CONTROL.pressed.delete(id);}});
  desired.forEach((action,id)=>{if(!ANALOG_CONTROL.pressed.has(id)){gameInput(id,true,'analog');ANALOG_CONTROL.pressed.add(id);}});
}
function applyAnalogVariables(value,now){
  if(M!==Kick||Kick.opt.shot==='dribble'||now-ANALOG_CONTROL.lastStep<85)return;
  const x=Math.abs(value.x)>0.18?Math.sign(value.x):0,y=Math.abs(value.y)>0.18?-Math.sign(value.y):0;if(!x&&!y)return;ANALOG_CONTROL.lastStep=now;
  if(Kick.opt.shot==='free'){if(x&&!isLocked('kick','spin'))adjustVar('spin',x*0.1);if(y&&!isLocked('kick','th'))adjustVar('th',y);}
  else{if(x&&!isLocked('kick','thH'))adjustVar('thH',x);if(y&&!isLocked('kick','jv'))adjustVar('jv',y*0.1);}
  renderMathConsole();
}
function paintAnalog(value){
  const travel=35;analogKnob.style.setProperty('--stick-x',`${value.x*travel}px`);analogKnob.style.setProperty('--stick-y',`${value.y*travel}px`);analogKnob.style.setProperty('--stick-mag',value.magnitude.toFixed(3));
  const dirs=analogDirections(value),label=dirs.length?dirs.map(x=>x[0].toUpperCase()+x.slice(1)).join(' + '):value.magnitude?'Fine control':'Centered';$('#analogReadout').textContent=`${label} · ${Math.round(value.magnitude*100)}%`;
}
function updateAnalog(clientX,clientY,now=performance.now()){
  if(!ANALOG_CONTROL.center)return;const dx=clientX-ANALOG_CONTROL.center.x,dy=clientY-ANALOG_CONTROL.center.y,value=GAME_CORE.normalizeAnalogStick(dx,dy,ANALOG_CONTROL.center.radius,{deadZone:.16,curve:1.45});ANALOG_CONTROL.value=value;M.analogControl={...value,active:true};paintAnalog(value);syncDirectionalActions(value);applyAnalogVariables(value,now);
}
function releaseAnalog(reason='Centered'){
  ANALOG_CONTROL.pressed.forEach(id=>gameInput(id,false,'analog'));ANALOG_CONTROL.pressed.clear();ANALOG_CONTROL.pointer=null;ANALOG_CONTROL.center=null;ANALOG_CONTROL.value={x:0,y:0,magnitude:0};M.analogControl={x:0,y:0,magnitude:0,active:false};analogStick.classList.remove('engaged');paintAnalog(ANALOG_CONTROL.value);$('#analogReadout').textContent=`${reason} · 0%`;
}
function cancelAnalog(reason='Input cancelled'){if(ANALOG_CONTROL.pointer!=null||ANALOG_CONTROL.pressed.size)releaseAnalog(reason);}

analogStick.addEventListener('pointerdown',e=>{if(ANALOG_CONTROL.pointer!=null){$('#analogReadout').textContent='One thumb at a time';return;}e.preventDefault();e.stopPropagation();unlock();const r=analogStick.getBoundingClientRect();ANALOG_CONTROL.pointer=e.pointerId;ANALOG_CONTROL.center={x:r.left+r.width/2,y:r.top+r.height/2,radius:r.width*.39};analogStick.classList.add('engaged');try{analogStick.setPointerCapture(e.pointerId);}catch(_){}updateAnalog(e.clientX,e.clientY);});
analogStick.addEventListener('pointermove',e=>{if(e.pointerId!==ANALOG_CONTROL.pointer)return;e.preventDefault();updateAnalog(e.clientX,e.clientY);});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>analogStick.addEventListener(type,e=>{if(e.pointerId!==ANALOG_CONTROL.pointer)return;e.preventDefault();releaseAnalog(type==='pointerup'?'Centered':'Input cancelled');}));

function keyboardAnalog(){const x=(ANALOG_CONTROL.keys.has('ArrowRight')?1:0)-(ANALOG_CONTROL.keys.has('ArrowLeft')?1:0),y=(ANALOG_CONTROL.keys.has('ArrowDown')?1:0)-(ANALOG_CONTROL.keys.has('ArrowUp')?1:0),length=Math.hypot(x,y)||1,value={x:x/length,y:y/length,magnitude:x||y?1:0};ANALOG_CONTROL.value=value;M.analogControl={...value,active:!!(x||y)};paintAnalog(value);syncDirectionalActions(value);applyAnalogVariables(value,performance.now());}
analogStick.addEventListener('keydown',e=>{if(!/^Arrow/.test(e.key))return;e.preventDefault();e.stopPropagation();ANALOG_CONTROL.keys.add(e.key);keyboardAnalog();});
analogStick.addEventListener('keyup',e=>{if(!/^Arrow/.test(e.key))return;e.preventDefault();e.stopPropagation();ANALOG_CONTROL.keys.delete(e.key);keyboardAnalog();if(!ANALOG_CONTROL.keys.size)releaseAnalog();});
analogStick.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();releaseAnalog('Input cancelled');}});

function gesturePoint(e){return{x:e.clientX,y:e.clientY,t:performance.now()};}
function gestureDisplacement(){if(!GESTURE_CONTROL.origin||!GESTURE_CONTROL.points.length)return 0;const p=GESTURE_CONTROL.points[GESTURE_CONTROL.points.length-1];return clamp(Math.hypot(p.x-GESTURE_CONTROL.origin.x,p.y-GESTURE_CONTROL.origin.y)/72,0,1);}
function paintGesture(){
  const spin=GAME_CORE.gestureToSpin(GESTURE_CONTROL.points);gestureAction.style.setProperty('--power',GESTURE_CONTROL.power.toFixed(3));gestureAction.style.setProperty('--charge-strength',GESTURE_CONTROL.power.toFixed(3));gestureAction.dataset.state=GESTURE_CONTROL.state;
  $('#gesturePowerValue').textContent=`${Math.round(GESTURE_CONTROL.power*100)}%`;$('#gestureSpinValue').textContent=spin.direction==='none'?'No spin':`${spin.direction} spin · ${Math.round(Math.abs(spin.spin)*100)}%`;$('#gesturePowerStatus').textContent=`${powerLabel(GESTURE_CONTROL.state)} · release to act`;
}
function tickGesture(){
  if(GESTURE_CONTROL.pointer==null)return;GESTURE_CONTROL.power=GAME_CORE.powerFromGesture({elapsedMs:performance.now()-GESTURE_CONTROL.start,displacement:gestureDisplacement()});const state=GAME_CORE.classifyPower(GESTURE_CONTROL.power);
  if((state==='target'||state==='perfect')&&!GESTURE_CONTROL.targetBuzzed){vibrateFor('target');GESTURE_CONTROL.targetBuzzed=true;}if(state==='overcharge'&&!GESTURE_CONTROL.overBuzzed){vibrateFor('overcharge');GESTURE_CONTROL.overBuzzed=true;}GESTURE_CONTROL.state=state;paintGesture();GESTURE_CONTROL.frame=requestAnimationFrame(tickGesture);
}
function setPowerVariable(id,power){const def=activeVariableProfile().find(x=>x.id===id);if(!def||isLocked(M.key,id))return;M.V[id]=Math.round((def.min+(def.max-def.min)*power)/def.step)*def.step;if(M.onVar)M.onVar(id);}
function applyGesturePhysics(power,spin){
  if(M!==Kick)return;if(Kick.opt.shot==='free'){setPowerVariable('v',power);if(!isLocked('kick','spin'))Kick.V.spin=Math.round(spin.spin*30)/10;}
  else if(Kick.opt.shot==='header'){setPowerVariable('jv',power);if(!isLocked('kick','thH'))Kick.V.thH=Math.round(spin.spin*35);}
  else if(activeVariableProfile().some(x=>x.id==='vs')){setPowerVariable('vs',power);if(activeVariableProfile().some(x=>x.id==='curl')&&!isLocked('kick','curl'))Kick.V.curl=Math.round(spin.spin*10);}
  else if(activeVariableProfile().some(x=>x.id==='pv'))setPowerVariable('pv',power);
  renderVars();renderMathConsole();
}
function startGesture(pointerId,point){
  const action=primaryAction();if(!action||action.disabled)return false;GESTURE_CONTROL.pointer=pointerId;GESTURE_CONTROL.start=performance.now();GESTURE_CONTROL.origin=point;GESTURE_CONTROL.points=[point];GESTURE_CONTROL.power=0;GESTURE_CONTROL.state='early';GESTURE_CONTROL.targetBuzzed=false;GESTURE_CONTROL.overBuzzed=false;gestureAction.classList.add('engaged');
  if(analogMapping().continuous){gameInput(action.id,true,'gesture');GESTURE_CONTROL.continuousId=action.id;}tickGesture();return true;
}
function finishGesture({execute=true,reason='Ready'}={}){
  if(GESTURE_CONTROL.pointer==null)return;cancelAnimationFrame(GESTURE_CONTROL.frame);const action=primaryAction(),spin=GAME_CORE.gestureToSpin(GESTURE_CONTROL.points),state=GESTURE_CONTROL.state,power=GESTURE_CONTROL.power;
  if(GESTURE_CONTROL.continuousId){gameInput(GESTURE_CONTROL.continuousId,false,'gesture');GESTURE_CONTROL.continuousId=null;}else if(execute&&action&&!action.disabled){applyGesturePhysics(power,spin);gameInput(action.id,true,'gesture');gameInput(action.id,false,'gesture');if(state==='perfect')vibrateFor('perfect');}
  GESTURE_CONTROL.pointer=null;GESTURE_CONTROL.points=[];gestureAction.classList.remove('engaged');$('#gesturePowerStatus').textContent=execute?`${powerLabel(state)} release · ${Math.round(power*100)}% · ${spin.direction} spin`:`${reason} · no action`;setTimeout(()=>{if(GESTURE_CONTROL.pointer==null){GESTURE_CONTROL.power=0;GESTURE_CONTROL.state='early';paintGesture();}},700);
}
function cancelGesture(reason='Input cancelled'){finishGesture({execute:false,reason});}

gestureAction.addEventListener('pointerdown',e=>{if(GESTURE_CONTROL.pointer!=null){$('#gesturePowerStatus').textContent='One thumb at a time · second touch ignored';return;}e.preventDefault();e.stopPropagation();unlock();const point=gesturePoint(e);if(!startGesture(e.pointerId,point))return;try{gestureAction.setPointerCapture(e.pointerId);}catch(_){}});
gestureAction.addEventListener('pointermove',e=>{if(e.pointerId!==GESTURE_CONTROL.pointer)return;e.preventDefault();GESTURE_CONTROL.points.push(gesturePoint(e));if(GESTURE_CONTROL.points.length>24)GESTURE_CONTROL.points.shift();});
gestureAction.addEventListener('pointerup',e=>{if(e.pointerId!==GESTURE_CONTROL.pointer)return;e.preventDefault();GESTURE_CONTROL.points.push(gesturePoint(e));finishGesture();});
['pointercancel','lostpointercapture'].forEach(type=>gestureAction.addEventListener(type,e=>{if(e.pointerId===GESTURE_CONTROL.pointer){e.preventDefault();cancelGesture('Input cancelled');}}));
gestureAction.addEventListener('keydown',e=>{if(![' ','Enter'].includes(e.key)||e.repeat||GESTURE_CONTROL.pointer!=null)return;e.preventDefault();e.stopPropagation();startGesture('keyboard',{x:0,y:0,t:performance.now()});});
gestureAction.addEventListener('keyup',e=>{if(![' ','Enter'].includes(e.key)||GESTURE_CONTROL.pointer!=='keyboard')return;e.preventDefault();e.stopPropagation();finishGesture();});
gestureAction.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancelGesture('Input cancelled');}});

classicControlsButton.addEventListener('click',()=>setPrototypeControls(false));
analogControlsButton.addEventListener('click',()=>setPrototypeControls(true));
controllerCollapseButton.addEventListener('click',()=>setFloatingControllerCollapsed(!FLOATING_CONTROLLER.collapsed));
controlStyleGroup.addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(e.key))return;e.preventDefault();e.stopPropagation();const analog=e.key==='ArrowRight'||e.key==='End';setPrototypeControls(analog);(analog?analogControlsButton:classicControlsButton).focus();});
window.addEventListener('blur',()=>{cancelAnalog('Focus lost');cancelGesture('Focus lost');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnalog('Page hidden');cancelGesture('Page hidden');}});
['resize','orientationchange'].forEach(type=>window.addEventListener(type,()=>{cancelAnalog('Layout changed');cancelGesture('Layout changed');}));
floatingControlDeck.addEventListener('pointerdown',event=>event.stopPropagation());
floatingControlDeck.addEventListener('keydown',event=>{if(event.key==='Escape'&&event.target===controllerCollapseButton&&!FLOATING_CONTROLLER.collapsed){event.preventDefault();setFloatingControllerCollapsed(true,{focus:true});}});
setFloatingControllerCollapsed(FLOATING_CONTROLLER.collapsed);renderAnalogControls();renderFloatingControllerState();paintGesture();
