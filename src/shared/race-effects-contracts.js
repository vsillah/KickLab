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
  root.KickLabRaceEffectsContracts=Object.freeze({LIMITS,boost,shift,launch});
})(globalThis);
