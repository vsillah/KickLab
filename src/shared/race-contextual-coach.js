(function installRaceContextualCoach(root){
  'use strict';
  const params=typeof location==='undefined'?null:new URLSearchParams(location.search);
  const enabled=!!(root.KickLabRaceOrigin?.trusted()&&params?.get('raceExpansion')==='prototype'&&params.get('raceInstruments')==='prototype'&&params.get('raceCoaching')==='prototype');
  const actions=['shift','nos','drift','launch','finisher'];
  function normalize(source){const raw=source&&typeof source==='object'&&!Array.isArray(source)?source:{};const out={version:1,actions:{}};for(const id of actions){const item=raw.actions?.[id]||{};out.actions[id]={success:Math.min(99,Math.max(0,Math.floor(Number(item.success)||0))),misses:Math.min(99,Math.max(0,Math.floor(Number(item.misses)||0))),mastered:!!item.mastered};}return out;}
  function create(source){return{progress:normalize(source),run:{},history:[],epoch:0};}
  function resetRun(state){state.epoch++;state.run={};state.history=[];return state;}
  function status(state,id){const saved=state.progress.actions[id];if(!saved)return'retired';if(saved.mastered&&saved.misses<2)return'retired';return state.run[id]?.phase||'teach';}
  function observe(state,id,kind,detail=''){
    const saved=state.progress.actions[id];if(!saved)return null;
    if(kind==='cancel'){state.run[id]=null;return null;}
    const before=status(state,id),positive=kind==='success',negative=kind==='early'||kind==='late'||kind==='miss';
    if(!positive&&!negative)return null;
    if(positive){saved.success=Math.min(99,saved.success+1);saved.misses=0;state.run[id]={phase:'confirm'};if(saved.success>=2){saved.mastered=true;state.run[id]={phase:'retired'};}}
    else{saved.misses=Math.min(99,saved.misses+1);if(saved.mastered&&saved.misses>=2){saved.mastered=false;saved.success=0;}state.run[id]={phase:'teach'};}
    const event={id,kind,detail:String(detail).slice(0,100),from:before,to:status(state,id)};
    state.history.push(event);if(state.history.length>24)state.history.shift();return event;
  }
  root.KickLabRaceContextualCoach=Object.freeze({enabled,actions,normalize,create,resetRun,status,observe});
})(typeof globalThis!=='undefined'?globalThis:window);
