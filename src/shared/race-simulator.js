(function installRaceSimulatorMath(root){
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function steering(angle,center=0,deadZone=6,sensitivity=1.5){
    if(!Number.isFinite(angle)||!Number.isFinite(center))return 0;
    const delta=((angle-center+540)%360)-180;
    const magnitude=Math.max(0,Math.abs(delta)-clamp(deadZone,0,20));
    return clamp(Math.sign(delta)*magnitude/38*clamp(sensitivity,.5,3),-1,1);
  }
  function axis(beta,gamma,orientation=0){
    if(Math.abs(orientation)===90)return Number.isFinite(beta)?beta*(orientation===90?1:-1):null;
    return Number.isFinite(gamma)?gamma:null;
  }
  function gesture(start,end,elapsed,kind){
    const travel=end-start;
    return elapsed>=45&&elapsed<=650&&(kind==='handbrake'?travel>=45:travel<=-55);
  }
  root.KickLabRaceSimulatorMath=Object.freeze({steering,axis,gesture});
})(typeof globalThis!=='undefined'?globalThis:window);
