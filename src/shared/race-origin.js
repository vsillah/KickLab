/* Trusted locations for opt-in Race prototypes. Other origins and paths fail closed. */
(function installRaceOrigin(root){
  'use strict';
  function trusted(loc=typeof location==='undefined'?null:location){
    if(!loc)return false;
    const {protocol,hostname,port,pathname}=loc;
    if((hostname==='localhost'||hostname==='127.0.0.1')&&(protocol==='http:'||protocol==='https:'))return true;
    return protocol==='https:'&&hostname==='vsillah.github.io'&&!port&&
      (pathname==='/KickLab/'||pathname==='/KickLab/index.html');
  }
  // These are the device-local Race features already shipped in this build.
  const HOME_FLAGS=Object.freeze({raceSystems:'proxy',raceTelemetry:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceExpansion:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',racePreflight:'prototype'});
  const ENTRY_KEY='kicklab.race.home-entry.v1';
  const listeners=[];
  function onHomeEntry(listener){listeners.push(listener);}
  function homeUrl(loc=typeof location==='undefined'?null:location){
    if(!trusted(loc))return null;
    const url=new URL(loc.href);
    for(const [key,value] of Object.entries(HOME_FLAGS))url.searchParams.set(key,value);
    return url;
  }
  function enterFromHome(loc=location,storage=null,navigate=url=>location.replace(url),replace=url=>history.replaceState(history.state,'',url)){
    const url=homeUrl(loc);
    if(!url)return false;
    if(url.href===loc.href)return 'local';
    const params=new URLSearchParams(loc.search);
    // An explicit partial flag set was initialized with that exact contract.
    // Keep its established document navigation and session handoff.
    if(Object.keys(HOME_FLAGS).some(key=>params.has(key))){
      try{(storage||sessionStorage).setItem(ENTRY_KEY,url.href);navigate(url.href);return 'document';}catch(_){return false;}
    }
    try{replace(url.href);for(const listener of listeners)listener();return 'local';}catch(_){return false;}
  }
  function consumeHomeEntry(loc=location,storage=null){
    const url=homeUrl(loc);
    if(!url||url.href!==loc.href)return false;
    try{const target=storage||sessionStorage,pending=target.getItem(ENTRY_KEY);target.removeItem(ENTRY_KEY);return pending===url.href;}
    catch(_){return false;}
  }
  root.KickLabRaceOrigin=Object.freeze({trusted,HOME_FLAGS,homeUrl,onHomeEntry,enterFromHome,consumeHomeEntry});
})(typeof globalThis!=='undefined'?globalThis:window);
