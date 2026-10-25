(function installRaceEffectsContracts(root){
  'use strict';
  const LIMITS=Object.freeze({revGas:.72,commitGas:.7,brakeHeld:.5,launchWindow:.35,launchSlip:.08,stageSpeed:1.5,commitSpeed:3,smokeSpeed:8,shiftTolerance:.025});
  function boost({running,paused,hidden,delivered,pulse,overheat,active,throttle,draining,traction}){
    if(!running)return'race-inactive';if(paused)return'paused';if(hidden)return'hidden';
    if(!active||!throttle||pulse<=0)return'released';if(overheat)return'overheat';
    if(!traction||!delivered)return'no-delivered-propulsion';if(!draining)return'tank-not-draining';
    return'delivered-draining';
  }
  function shift({mode,phase,changed,beforeGear,afterGear,quality,speed,top,target,alreadyTriggered}){
    if(mode!=='drag'||phase!=='run')return'wrong-mode';
    if(!changed||afterGear!==beforeGear+1)return'gear-not-advanced';
    if(alreadyTriggered)return'already-triggered';
    if(quality!=='optimal')return quality||'ordinary';
    if(!Number.isFinite(target)||Math.abs(speed/Math.max(top,1)-target)>LIMITS.shiftTolerance)return'outside-perfect-band';
    return'perfect-upshift';
  }
  function launch(previous,sample){
    const state={phase:previous?.phase||'idle',revAt:previous?.revAt??null,activeUntil:previous?.activeUntil??null,triggered:!!previous?.triggered,reason:previous?.reason||'waiting'};
    const {mode,running,paused,hidden,time,brake,gas,speed,slip}=sample;
    if(mode!=='drag'||!running||paused||hidden){state.phase='idle';state.revAt=null;state.reason=!running?'race-inactive':paused?'paused':hidden?'hidden':'wrong-mode';return state;}
    if(state.triggered){if(state.phase==='active'&&time<state.activeUntil&&speed<LIMITS.smokeSpeed&&slip>LIMITS.launchSlip){state.reason='launch-slip';return state;}state.phase='completed';state.reason='already-triggered';return state;}
    if(speed>=LIMITS.smokeSpeed){state.phase='expired';state.reason='too-fast';return state;}
    if(brake>=LIMITS.brakeHeld&&speed<LIMITS.stageSpeed){
      if(gas>=LIMITS.revGas){state.phase='revved';state.revAt=time;state.reason='brake-held-rev-band';}
      else if(state.phase!=='revved'){state.phase='braking';state.reason='brake-held';}
      return state;
    }
    if(state.phase==='revved'&&brake<LIMITS.brakeHeld){
      if(time-state.revAt>LIMITS.launchWindow){state.phase='expired';state.reason='launch-window-expired';return state;}
      if(gas<LIMITS.commitGas||speed>=LIMITS.commitSpeed){state.phase='expired';state.reason='throttle-not-committed';return state;}
      state.phase='committed';state.reason='brake-release-throttle-commit';
    }
    if(state.phase==='committed'){
      if(time-state.revAt>LIMITS.launchWindow){state.phase='expired';state.reason='launch-window-expired';}
      else if(gas<LIMITS.commitGas){state.phase='expired';state.reason='throttle-released';}
      else if(speed<LIMITS.smokeSpeed&&slip>LIMITS.launchSlip){state.phase='active';state.triggered=true;state.activeUntil=time+.8;state.reason='launch-slip';}
      else state.reason='awaiting-driven-slip';
    }else if(state.phase==='idle')state.reason='ordinary-acceleration';
    return state;
  }
  function loadTransfer({boostReason,acceleration,deliveredBoost,torque,launchSlip,speed}){
    if(boostReason!=='delivered-draining'||!Number.isFinite(acceleration)||!Number.isFinite(deliveredBoost)||deliveredBoost<=.05)return 0;
    const drive=Math.max(0,Math.min(1,(acceleration-1.5)/5)),delivery=Math.max(0,Math.min(1,deliveredBoost/3.8)),load=Math.max(0,Math.min(1,Number(torque)||0));
    const launch=Math.max(0,Math.min(1,(Number(launchSlip)||0)/.35))*(speed<8?1:0);
    return Math.min(1,drive*delivery*(.6+.2*load+.2*launch));
  }
  function handbrakeDrift({running,paused,hidden,committed,speed,wheel,slip,yawRate,lateralAccel,availableGrip,mode,grip}){
    if(!running||paused||hidden||!committed||speed<9||Math.abs(wheel)<9||grip<=.45||!['drift','skid'].includes(mode)||Math.abs(slip)<.08)return 0;
    const angle=Math.min(1,(Math.abs(slip)-.08)/.24),turn=Math.min(1,Math.abs(yawRate)/.6),tireLoad=Math.min(1,Math.max(0,(Number(lateralAccel)||0)/Math.max(.1,(Number(availableGrip)||0)*9.81)));
    return Math.min(1,(.3+angle*.35+turn*.15+tireLoad*.2)*Math.min(1,(speed-8)/3));
  }
  const CUTAWAY_PRIORITY=Object.freeze(['drivetrain','suspension','brakes','cooling','chassis']);
  function cutawayMilestones(previous,sample){
    const state={driftTime:previous?.driftTime||0,driftArmed:!!previous?.driftArmed,brakeTime:previous?.brakeTime||0,brakeArmed:!!previous?.brakeArmed,hotSeen:!!previous?.hotSeen};
    const candidates=[];
    if(!sample.running&&!sample.done)return{state,candidates};
    const dt=Math.max(0,Math.min(.05,sample.dt||0));
    if(sample.running&&sample.mode==='drift'&&sample.handbrakeCommitted&&sample.driftMode==='drift'&&sample.speed>=9&&Math.abs(sample.slip)>=.1&&!sample.slide){state.driftTime+=dt;if(state.driftTime>=.55)state.driftArmed=true;}
    else if(state.driftArmed&&sample.mode==='drift'&&sample.driftMode==='none'&&Math.abs(sample.slip)<.08&&sample.speed>=8&&!sample.slide){candidates.push('suspension');state.driftArmed=false;state.driftTime=0;}
    else if(sample.driftMode==='skid'||sample.speed<8){state.driftArmed=false;state.driftTime=0;}
    else if(!state.driftArmed)state.driftTime=0;
    if(sample.running&&['circuit','hill','endurance'].includes(sample.mode)&&sample.brake>=.6&&sample.speed>=10&&sample.longitudinalAccel<=-2.5&&!sample.slide){state.brakeTime+=dt;if(state.brakeTime>=.35)state.brakeArmed=true;}
    else if(state.brakeArmed&&sample.brake<.1&&sample.speed>=5&&!sample.slide){candidates.push('brakes');state.brakeArmed=false;state.brakeTime=0;}
    else if(sample.slide||sample.speed<5){state.brakeArmed=false;state.brakeTime=0;}
    else if(!state.brakeArmed)state.brakeTime=0;
    if(sample.running&&['hill','endurance'].includes(sample.mode)&&sample.heat>=.74)state.hotSeen=true;
    if(state.hotSeen&&sample.running&&sample.heat<=.57&&sample.speed>=8&&!sample.overheat){candidates.push('cooling');state.hotSeen=false;}
    if(sample.done&&sample.mode==='drag'&&sample.launchTriggered&&!sample.slide)candidates.push('chassis');
    return{state,candidates};
  }
  function cutaway(previous,{time,active,candidates}){
    const state={used:{...(previous?.used||{})},cooldownUntil:previous?.cooldownUntil||0,last:previous?.last||null};
    if(!active||time<state.cooldownUntil)return{...state,selected:null};
    const selected=CUTAWAY_PRIORITY.find(system=>candidates.includes(system)&&!state.used[system])||null;
    if(selected){state.used[selected]=true;state.cooldownUntil=time+6;state.last=selected;}
    return{...state,selected};
  }
  root.KickLabRaceEffectsContracts=Object.freeze({LIMITS,boost,shift,launch,loadTransfer,handbrakeDrift,cutawayMilestones,cutaway,CUTAWAY_PRIORITY});
})(globalThis);
