(function installRaceVenueSelection(root){
  'use strict';
  const ROUTES=Object.freeze({
    highland:Object.freeze(['drag','drift','circuit','hill','endurance']),
    marine:Object.freeze(['marine']),
    forest:Object.freeze(['forest'])
  });
  function compatible(venue,route){return !!ROUTES[venue]?.includes(route);}
  function normalize(venue,progress){
    const unlocked=root.KickLabRaceProgression.normalize(progress).unlocked;
    return ROUTES[venue]&&unlocked>=['highland','marine','forest'].indexOf(venue)?venue:'highland';
  }
  function clearHighland(progress,passed){
    const state=root.KickLabRaceProgression.normalize(progress);
    return passed&&state.unlocked<1?{...state,unlocked:1}:state;
  }
  root.KickLabRaceVenueSelection=Object.freeze({ROUTES,compatible,normalize,clearHighland});
})(typeof globalThis!=='undefined'?globalThis:window);
