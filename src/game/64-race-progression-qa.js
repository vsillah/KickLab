/* Local-only progression evidence hooks. Never available in the default game. */
if(RACE_PROGRESSION.enabled())globalThis.__KICKLAB_RACE_PROGRESSION_QA__=Object.freeze({
  state(){return{level:Race.progressionLevel().id,venue:Race.opt.venue,radius:Race.V.R,grade:Race.P().approachGrade,mu:Race.P().mu,progress:{...best.raceProgression},build:{...Race.garage},analog:ANALOG_CONTROL.enabled,paused:PAUSE.on,renderer:RACE_3D.on?'3d':'canvas',raceState:Race.state,x:Race.st.x,y:Race.st.y,speed:Race.st.v,zone:Race.st.zone,result:Race.res?{ok:Race.res.ok,t:Race.res.t,slideT:Race.res.slideT,brakeFactor:Race.res.brakeFactor}:null,levelPass:Race.progressionOutcome?.pass??null};},
  unlockForQA(index){const unlocked=Math.min(RACE_PROGRESSION.LEVELS.length,Math.max(0,Math.floor(Number(index)||0)));best.raceProgression={...RACE_PROGRESSION.DEFAULT,unlocked};saveBest();renderChal();return unlocked;},
  useCanvas(){best.gfx='2d';saveBest();return true;},
  setAutopilot(){if(Race.state!=='grid')return false;Race.opt.steer='auto';renderOpts();return true;},
  demoPedals(){if(Race.state!=='run'){RACE_SYSTEMS.cancelInput(Race.inp);Race.gas=false;Race.brake=false;return Race.state;}const P=Race.P(),s=Race.st,venue=RACE_SYSTEMS.venue(Race.opt.venue),path=RACE_SYSTEMS.path(s.x,s.y,P,venue),limit=Math.sqrt(P.mu*G0*P.R),distance=P.L-s.x,need=Math.max(0,(s.v*s.v-(limit*.8)**2)/(2*.95*P.mu*G0)),brake=path.zone===0&&s.v>limit*.8&&distance<need+8,gas=!brake&&(path.zone===0||(path.zone===2&&venue.id!=='forest'));Race.inp.gas=gas;Race.inp.brake=brake;Race.gas=gas;Race.brake=brake;return Race.state;}
});
