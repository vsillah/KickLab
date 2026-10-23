(function installRaceSpeedPerception(root){
  'use strict';
  const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,Number.isFinite(value)?value:0));
  const TUNING=Object.freeze({drag:1,circuit:.78,endurance:.82,hill:.7,drift:.64});
  function cues({speed=0,top=55,accel=0,lateral=0,rpm=0,load=0,slip=0,roughness=0,mode='drag',active=false,reduced=false}={}){
    const pace=clamp(speed/Math.max(1,top)),intensity=active?clamp((speed-4)/Math.max(18,top-4))* (TUNING[mode]||.7):0;
    const road=clamp(roughness),lat=clamp(Math.abs(lateral)/9),long=clamp(accel/9,-1,1),tire=clamp(Math.abs(slip)/.42);
    return Object.freeze({intensity,pace,fieldOfView:55+(active&&!reduced?intensity*4.5:0),foreAft:active&&!reduced?long*.16:0,roll:active&&!reduced?Math.sign(lateral)*Math.min(.018,lat*.018):0,heave:active&&!reduced?road*intensity*.035:0,
      markerOpacity:active?clamp(.32+intensity*.38):.32,wind:active?pace*pace*.023:0,roadNoise:active?pace*(.008+road*.014):0,tireNoise:active?tire*pace*.025:0,
      harmonic:active?(.006+clamp(rpm)*.013)*(.45+.55*clamp(load)):0,frequency:58+clamp(rpm)*205});
  }
  root.KickLabRaceSpeedPerception=Object.freeze({cues,TUNING});
})(typeof globalThis!=='undefined'?globalThis:window);
