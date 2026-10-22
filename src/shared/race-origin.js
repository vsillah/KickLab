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
  root.KickLabRaceOrigin=Object.freeze({trusted});
})(typeof globalThis!=='undefined'?globalThis:window);
