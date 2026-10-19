(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.KickLabCoachTomi=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clean=value=>String(value==null?'':value).replace(/\s+/g,' ').trim();
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  function experience(history={}){
    const plays=Math.max(0,number(history.plays)),wins=Math.max(0,number(history.wins)),cleared=Math.max(0,number(history.cleared));
    const tier=plays<3?'novice':plays>=8||cleared>=3?'experienced':'developing';
    return{tier,plays,wins,cleared};
  }
  function recommendation({mode,code='',context={}}={}){
    if(mode==='fight')return{kind:'math',topic:'timing',label:'See the math'};
    if(mode==='race')return{kind:'math',topic:code==='steering'?'steering':'corner-limit',label:'See the math'};
    if(context.keeper)return{kind:'control',variables:['gkr','gka'],direction:'lower',label:'Try this'};
    if(context.pass)return{kind:'control',variables:['pv'],direction:'higher',label:'Try this'};
    if(context.shot==='dribble')return{kind:'control',variables:['grip','run'],direction:'higher',label:'Try this'};
    if(context.shot==='header')return code==='timing'?{kind:'math',topic:'header-timing',label:'See the math'}:{kind:'control',variables:['jv','thH'],direction:code==='high'?'lower':'higher',label:'Try this'};
    if(code==='wall')return{kind:'control',variables:['th','v'],direction:'higher',label:'Try this'};
    if(code==='high')return{kind:'control',variables:['th','v'],direction:'lower',label:'Try this'};
    if(code==='power')return{kind:'control',variables:['v','th'],direction:'higher',label:'Try this'};
    if(code==='aim')return{kind:'control',variables:['th','spin','v'],direction:'adjust',label:'Try this'};
    if(code==='timing')return{kind:'math',topic:'timing',label:'See the math'};
    return{kind:'control',variables:['th','v'],direction:'adjust',label:'Try this'};
  }
  function beginning({mode,activity='',history={},variables={},context={}}={}){
    const exp=experience(history),advanced=exp.tier==='experienced',name=clean(activity)||({fight:'Fight round',race:'Race run',kick:'Free kick'}[mode]||'Next activity');
    if(mode==='fight')return{tier:exp.tier,observation:advanced?'Mass and contact time shape this round.':'Watch the timing bar.',cue:advanced?'Land in green, then compare force with padding time.':'Punch when the marker reaches green.',variable:`Padding ${number(variables.dt)||15} ms`,formula:'F ≈ m × Δv ÷ Δt',level:Math.max(0,Math.min(1,(number(variables.dt)||15)/40)),recommendation:recommendation({mode,context})};
    if(mode==='race')return{tier:exp.tier,observation:advanced?'Grip and turn radius set the corner limit.':'The corner has a safe speed.',cue:advanced?'Enter below √(μgR), then steer smoothly.':'Brake before the path turns red.',variable:`Limit ${Math.round(number(variables.limit)||0)} km/h`,formula:'v = √(μgR)',level:Math.max(0,Math.min(1,(number(variables.limit)||0)/160)),recommendation:recommendation({mode,context})};
    if(context.keeper)return{tier:exp.tier,observation:advanced?'Reaction time and dive acceleration set your reach.':'Watch the striker before you dive.',cue:advanced?'Choose the side early, then compare keeper reach.':'Pick a side as the shot starts.',variable:`Reaction ${number(variables.reaction).toFixed(2)} s`,formula:'reach = ½at²',level:Math.max(0,Math.min(1,1-number(variables.reaction)/1.2)),recommendation:recommendation({mode,context})};
    if(context.pass)return{tier:exp.tier,observation:advanced?'Pass speed sets when the ball meets the runner.':'The runner keeps moving after you pass.',cue:advanced?'Lead the runner, then tune pass speed.':'Aim ahead of the runner.',variable:`Pass ${number(variables.passSpeed)||0} m/s`,formula:'distance = speed × time',level:Math.max(0,Math.min(1,number(variables.passSpeed)/34)),recommendation:recommendation({mode,context})};
    if(context.shot==='dribble')return{tier:exp.tier,observation:advanced?'Run speed and grip shape the defender gap.':'Grip helps each change of direction.',cue:advanced?'Cut where predicted gap stays positive.':'Change direction before the defender closes.',variable:`Grip ${number(variables.grip).toFixed(2)}`,formula:'grip → cut speed',level:Math.max(0,Math.min(1,number(variables.grip)/1.4)),recommendation:recommendation({mode,context})};
    if(context.shot==='header')return{tier:exp.tier,observation:advanced?'Jump timing changes contact height and launch angle.':'Meet the ball at the top of your jump.',cue:advanced?'Time contact, then tune the launch angle.':'Jump as the ball reaches you.',variable:`Jump ${number(variables.jump)||0} m/s`,formula:'height = v² ÷ 2g',level:Math.max(0,Math.min(1,number(variables.jump)/9)),recommendation:recommendation({mode,context})};
    return{tier:exp.tier,observation:advanced?'Speed, angle, and gravity shape this flight.':'The ball follows your speed and aim.',cue:advanced?'Compare wall and goal heights before the kick.':'Set speed first, then adjust angle.',variable:`${number(variables.speed)||0} m/s · ${number(variables.angle)||0}°`,formula:'y = vᵧt − ½gt²',level:Math.max(0,Math.min(1,(number(variables.speed)||0)/40)),activity:name,recommendation:recommendation({mode,context})};
  }
  function outcomeCode({mode,title='',sub='',grade=''}={}){
    const text=`${title} ${sub}`.toLowerCase();
    if(mode==='fight')return grade==='D'||/off the green|mistimed|knocked down/.test(text)?'timing':null;
    if(mode==='race'){if(/hard or too early/.test(text))return'steering';if(/slid wide|off the track/.test(text))return'unsafe-speed';const match=text.match(/corner entry\s+([\d.]+)\s+of\s+([\d.]+)/);if(match&&Number(match[1])>Number(match[2])*1.02)return'unsafe-speed';return null;}
    if(mode==='kick'){if(/blocked|wall/.test(text))return'wall';if(/over the bar|crossbar|\bbar\b/.test(text))return'high';if(/saved|short|no goal/.test(text))return'power';if(/mistimed|missed it|he won it/.test(text))return'timing';if(grade==='D')return'aim';}
    return null;
  }
  function need(input={}){
    const code=outcomeCode(input);if(!code)return null;const exp=experience(input.history),tail=Array.isArray(input.recent)?input.recent.slice(-2):[],repeated=tail.length===2&&tail.every(item=>item===code),advanced=exp.tier==='experienced';
    const rules={
      timing:[repeated?'The timing miss repeated.':'The last attempt missed its timing window.',advanced?'Compare timing error with force before the next move.':'Wait for green before you act.'],
      'unsafe-speed':[repeated?'The corner-speed miss repeated.':'Entry speed passed the grip limit.',advanced?'Brake until entry is below √(μgR).':'Brake before the corner.'],
      steering:['The turn started too hard or too early.',advanced?'Build wheel angle toward the yellow notch.':'Steer later and more smoothly.'],
      wall:['The ball was below the wall line.',advanced?'Raise launch angle or speed, then recheck wall height.':'Raise the angle a little.'],
      high:['The ball reached the bar too high.',advanced?'Lower angle or speed, then recheck goal height.':'Lower the angle a little.'],
      power:['The shot did not reach a clear scoring window.',advanced?'Tune speed while keeping the target height open.':'Add a little speed or aim away from the keeper.'],
      aim:['The last path missed the target window.',advanced?'Adjust one variable, then compare the predicted line.':'Change one setting before the next try.']
    };
    const rule=rules[code]||rules.aim;return{code,observation:rule[0],cue:rule[1],tier:exp.tier,recommendation:recommendation({mode:input.mode,code,context:input.context})};
  }
  function result(input={}){
    const exp=experience(input.history),specific=clean(input.sub),title=clean(input.title),grade=clean(input.grade)||'—',code=outcomeCode(input),advanced=exp.tier==='experienced';
    const observation=specific||`${title||'Round complete'} · grade ${grade}`;
    let cue;
    if(code==='timing')cue=advanced?'Compare timing error with force before the next move.':'Wait for green on the next try.';
    else if(code==='unsafe-speed')cue=advanced?'Enter below √(μgR) on the next run.':'Brake before the corner.';
    else if(code==='steering')cue='Steer later and build the turn smoothly.';
    else if(code==='wall')cue=advanced?'Raise angle or speed until wall height clears.':'Raise the angle a little.';
    else if(code==='high')cue=advanced?'Lower angle or speed until goal height opens.':'Lower the angle a little.';
    else if(code==='power')cue=advanced?'Tune speed while keeping the target height open.':'Add a little speed or aim away from the keeper.';
    else if(code==='aim')cue='Change one setting, then compare the path.';
    else if(input.mode==='fight')cue=advanced?'Keep the timing window and compare padding time.':'Repeat the green timing.';
    else if(input.mode==='race')cue=advanced?'Keep entry under the grip limit and trim braking.':'Use the same smooth turn.';
    else cue=advanced?'Keep the scoring path and test one variable.':'Keep the same aim and timing.';
    return{tier:exp.tier,observation,cue,code,recommendation:recommendation({mode:input.mode,code,context:input.context})};
  }
  return Object.freeze({experience,beginning,outcomeCode,need,result,recommendation});
});
