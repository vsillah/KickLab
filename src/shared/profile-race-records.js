(function installProfileRaceRecords(root){
  'use strict';
  const value=(raw,max)=>Number.isFinite(Number(raw))&&Number(raw)>0&&Number(raw)<=max?Number(raw):null;
  function normalize(raw){
    const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    return{version:1,topKmh:value(source.topKmh,1000),dragSeconds:value(source.dragSeconds,600),driftPoints:value(source.driftPoints,1000000)};
  }
  function record(raw,{topKmh,dragSeconds,driftPoints}={}){
    const next=normalize(raw),speed=value(topKmh,1000),drag=value(dragSeconds,600),drift=value(driftPoints,1000000);
    if(speed!==null)next.topKmh=Math.max(next.topKmh||0,speed);
    if(drag!==null)next.dragSeconds=Math.min(next.dragSeconds||Infinity,drag);
    if(drift!==null)next.driftPoints=Math.max(next.driftPoints||0,drift);
    return next;
  }
  root.KickLabProfileRaceRecords=Object.freeze({normalize,record});
})(typeof globalThis!=='undefined'?globalThis:window);
