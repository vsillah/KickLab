/* Default-off Race trajectory and canonical variable tuning. Never persisted. */
const RACE_CORNER_TRACE=(()=>{
  const enabled=globalThis.KickLabRaceOrigin.trusted()&&new URLSearchParams(location.search).get('raceCornerTrace')==='prototype';
  if(enabled&&typeof document!=='undefined')document.documentElement.dataset.raceCornerTrace='prototype';
  const VARIABLES=Object.freeze(['mu','F','m']);
  let selected='mu';
  function variable(){return Race.vars().find(item=>item.id===selected);}
  function select(direction){selected=VARIABLES[(VARIABLES.indexOf(selected)+direction+VARIABLES.length)%VARIABLES.length];return variable();}
  function tune(direction){if(!enabled||M!==Race||PAUSE.on||RP.on||RACE_3D.shouldBlockInput())return false;const def=variable();if(!def||isLocked('race',def.id))return false;return adjustVar(def.id,direction*def.step);}
  function input(){const t=Race.telemetry,s=Race.st,gas=Race.inp.gas,brake=Race.inp.brake;const driveGas=gas*(t?RACE_TELEMETRY.powerFactor(t):1)*(t?.lock==='torque'?1.06:1);return{gas:driveGas,brake,wheel:Race.wheel,auto:Race.opt.steer==='auto',drift:s.zone===1&&Math.abs(Race.wheel)>9&&(t?.grip??1)>.45,nitro:!!t&&t.nosPulse>0&&gas>.1&&!t.overheat};}
  function predict(){if(!enabled||!RACE_SYSTEMS.enabled()||!Race.st)return null;const P=Race.P(),venue=RACE_SYSTEMS.venue(Race.opt.venue),s={...Race.st},drive=input(),points=[{x:s.x,y:s.y}],time=Race.state==='run'?3.6:2.8;let peak=0,slip=0,exit=null;
    for(let i=0;i<60;i++){for(let j=0;j<3;j++)RACE_SYSTEMS.step(s,P,drive,time/180,venue);points.push({x:s.x,y:s.y});peak=Math.max(peak,Math.abs(s.e));slip=Math.max(slip,Math.abs(s.slipAngle||0));if(!exit&&s.zone===2)exit={x:s.x,y:s.y};}
    const curvatureGap=Math.abs(Race.st.kc||0)-Math.abs(Race.st.k||0);const state=peak>Race.HW*.75||s.driftMode==='skid'?slip>.18?'oversteer':'understeer':curvatureGap>.007&&Race.st.v>8?'understeer':slip>.18?'oversteer':'safe';
    return{points,exit:exit||points.at(-1),state,peak,slip,speed:Race.st.v,wheel:Race.wheel,grip:s.muEffective||P.mu,heat:Race.telemetry?.heat||0};}
  return Object.freeze({enabled,VARIABLES,variable,select,tune,predict});
})();
