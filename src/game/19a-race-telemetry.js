/* Default-off Race telemetry. This state is deliberately absent from records/storage. */
const RACE_TELEMETRY=(()=>{
  const enabled=globalThis.KickLabRaceOrigin.trusted()&&['raceTelemetry','raceCornerTrace'].some(key=>new URLSearchParams(location.search).get(key)==='prototype');
  if(enabled&&typeof document!=='undefined')document.documentElement.dataset.raceTelemetry='prototype';
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const GAUGES=Object.freeze([
    {id:'rpm',name:'RPM',unit:'rpm',target:[.55,.78],coach:'Hold the revs in the bright band for stronger pull.'},
    {id:'torque',name:'Throttle · torque',unit:'%',target:[.58,.82],coach:'Feed in throttle until the torque band locks.'},
    {id:'nos',name:'NOS pressure',unit:'%',target:[.62,.86],coach:'Build pressure, then release a short NOS pulse.'},
    {id:'temperature',name:'Engine temperature',unit:'°C',target:[.35,.68],coach:'Hot engine: ease off and let airflow cool it.'},
    {id:'braking',name:'Brake force · distance',unit:'%',target:[.5,.8],coach:'Brake before the board; give the tires room to slow.'},
    {id:'drift',name:'Drift angle',unit:'°',target:[.35,.65],coach:'Hold a modest angle. Too much slip loses the line.'},
    {id:'grip',name:'Grip recovery',unit:'%',target:[.7,1],coach:'Unwind the wheel until the tires bite again.'}
  ]);
  function initial(){return{heat:.2,brakeHeat:0,pressure:.5,capacity:1,rpm:.25,torque:0,braking:0,brakeDistance:0,angle:0,grip:1,gripLost:false,gripRecoveryUntil:0,selected:'rpm',recommended:'rpm',manualUntil:0,lock:'',lockUntil:0,phase:'ready',recoveryUntil:0,overheat:false,cooled:false,nosPulse:0,clock:0,lastCue:'',cueAge:0,cueUntil:0};}
  function recommend(t,s,input,P){if(t.overheat||t.heat>.76)return'temperature';if(s.slide||s.driftMode==='skid')return'grip';if(s.zone===1&&Math.abs(s.slipAngle||0)>.07)return'drift';if(s.zone===0&&s.x>P.L-55&&s.v>9)return'braking';if(input.brake>.1)return'braking';if(input.gas>.2&&t.pressure>.65&&s.v>9)return'nos';if(input.gas>.2)return t.rpm<.55?'rpm':'torque';return t.pressure<.6?'nos':'rpm';}
  function step(t,s,input,P,dt){const h=clamp(dt,0,.05),gas=clamp(Number(input.gas)||0,0,1),brake=clamp(Number(input.brake)||0,0,1);t.clock+=h;
    t.rpm=clamp(.18+s.v/Math.max(P.top,1)*.56+gas*.29,0,1);t.torque=gas*clamp(1-Math.abs(t.rpm-.67)*1.2,.2,1);t.braking=clamp(brake*(s.garageBrakeFactor||P.brakePower||1),0,1);t.brakeHeat=s.garageBrakeHeat||0;t.brakeDistance=s.v*s.v/(2*Math.max(.1,.95*(s.muEffective||P.mu)*9.81*(s.garageBrakeFactor||P.brakePower||1)));t.angle=clamp(Math.abs(s.slipAngle||0)/.48,0,1);t.grip=clamp(1-t.angle*.62-(s.slide?.25:0),0,1);t.capacity=clamp(Number(s.nitro??1),0,1);
    if(t.grip<.65)t.gripLost=true;else if(t.gripLost&&t.grip>=.78){t.gripLost=false;t.gripRecoveryUntil=t.clock+.8;}
    const cooling=(.035+s.v/Math.max(P.top,1)*.11+(1-gas)*.13+brake*.04)*h;
    t.heat=clamp(t.heat+(gas*gas*.19+(input.nitro?.28:0)+Math.max(0,t.rpm-.8)*.18)*h-cooling,0,1);
    if(!t.overheat&&t.heat>=.91){t.overheat=true;t.phase='overheat';t.cooled=false;}
    else if(t.overheat&&t.heat<=.48){t.overheat=false;t.phase='recovered';t.recoveryUntil=t.clock+1.5;t.cooled=true;}
    else if(!t.overheat)t.phase=t.clock<t.recoveryUntil?'recovered':t.heat>.76?'warning':'drive';
    if(t.nosPulse>0)t.nosPulse=Math.max(0,t.nosPulse-h);
    t.pressure=clamp(t.pressure+(input.nitro?-h*.36:(1-gas*.4)*h*.09),0,1);
    t.recommended=recommend(t,s,input,P);if(t.clock>=t.manualUntil)t.selected=t.recommended;
    if(t.clock>=t.lockUntil)t.lock='';
    t.cueAge+=h;return t;
  }
  function value(t,id){return{rpm:t.rpm,torque:t.torque,nos:t.pressure,temperature:t.heat,braking:t.braking,drift:t.angle,grip:t.grip}[id];}
  function canLock(t){const gauge=GAUGES.find(g=>g.id===t.selected),v=value(t,t.selected);return !t.overheat&&(t.selected!=='nos'||t.capacity>.1)&&v>=gauge.target[0]&&v<=gauge.target[1];}
  function tune(t,action){if(!enabled)return false;if(action==='next'||action==='prev'){const index=GAUGES.findIndex(g=>g.id===t.selected);t.selected=GAUGES[(index+(action==='next'?1:GAUGES.length-1))%GAUGES.length].id;t.manualUntil=t.clock+7;return true;}
    if(action==='apply'&&canLock(t)){t.lock=t.selected;t.lockUntil=t.clock+2;if(t.selected==='nos'){t.nosPulse=1.2;t.pressure=Math.max(0,t.pressure-.32);t.heat=clamp(t.heat+.09,0,1);}return true;}
    return false;}
  function cancel(t){if(t){t.nosPulse=0;t.manualUntil=0;t.lock='';t.lockUntil=0;}}
  return Object.freeze({enabled,GAUGES,initial,step,tune,recommend,canLock,cancel});
})();
