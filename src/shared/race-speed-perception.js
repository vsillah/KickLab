(function installRaceSpeedPerception(root){
  'use strict';
  const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,Number.isFinite(value)?value:0));
  // Full speed is a perceptual reference for each course, not the vehicle's gearing limit.
  const TUNING=Object.freeze({
    drag:Object.freeze({onset:4,full:32,gain:1}),
    circuit:Object.freeze({onset:3,full:22,gain:.88}),
    endurance:Object.freeze({onset:5,full:34,gain:.9}),
    hill:Object.freeze({onset:3,full:23,gain:.82}),
    drift:Object.freeze({onset:2.5,full:16,gain:.75})
  });
  function cues({speed=0,top=55,accel=0,lateral=0,rpm=0,load=0,slip=0,roughness=0,mode='drag',active=false,reduced=false}={}){
    const tuning=TUNING[mode]||TUNING.drag,pace=clamp(speed/tuning.full),intensity=active?clamp((speed-tuning.onset)/(tuning.full-tuning.onset))*tuning.gain:0;
    const road=clamp(roughness),lat=clamp(Math.abs(lateral)/9),long=clamp(accel/9,-1,1),tire=clamp(Math.abs(slip)/.42);
    return Object.freeze({intensity,pace,fieldOfView:55+(active&&!reduced?intensity*7:0),setback:active&&!reduced?intensity*1.4:0,heightDelta:active&&!reduced?-intensity*.95:0,
      foreAft:active&&!reduced?long*.22:0,roll:active&&!reduced?Math.sign(lateral)*Math.min(.018,lat*.018):0,heave:active&&!reduced?road*intensity*.09:0,
      markerOpacity:active?clamp(.3+intensity*.48):.3,peripheralOpacity:active?clamp(.18+intensity*.46):.18,
      wind:active?pace*pace*.047:0,roadNoise:active?pace*(.015+road*.026):0,tireNoise:active?tire*pace*.036:0,
      harmonic:active?(.012+clamp(rpm)*.025)*(.45+.55*clamp(load)):0,frequency:58+clamp(rpm)*205});
  }
  root.KickLabRaceSpeedPerception=Object.freeze({cues,TUNING});
})(typeof globalThis!=='undefined'?globalThis:window);
