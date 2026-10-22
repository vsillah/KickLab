/* Provider-neutral Race roster. The asset lane owns this declarative contract. */
(function installRaceVehicleCatalog(root){
  'use strict';
  const SCHEMA_VERSION=1;
  const WHEELS=Object.freeze({
    WheelFrontLeft:Object.freeze([1.28,.43,-1.04]),
    WheelFrontRight:Object.freeze([1.28,.43,1.04]),
    WheelRearLeft:Object.freeze([-1.28,.43,-1.04]),
    WheelRearRight:Object.freeze([-1.28,.43,1.04])
  });
  const local='assets/3d/';
  const cars=Object.freeze({
    cobalt:Object.freeze({id:'cobalt',name:'Cobalt',role:'Balanced',availability:'prototype',
      assetUrl:local+'kicklab-race-direction-a/v1/direction-a-atlas.glb',
      coach:'Balanced launch and corner grip. Use this car to learn the braking line before chasing a faster lap.',
      tradeoff:'Predictable all-round response; neither the quickest launch nor the strongest corner hold.',
      physics:Object.freeze({massKg:1400,driveForceN:8500,topSpeedMs:55,grip:1,rollingLoss:1,steeringResponse:1,slideRecovery:1,brakeHeat:1,brakeRecovery:1,downforce:0}),
      wheels:WHEELS}),
    kestrel:Object.freeze({id:'kestrel',name:'Kestrel',role:'Agile launch',availability:'prototype',
      assetUrl:local+'kicklab-race-kestrel/v1/kestrel-original.glb',
      coach:'Kestrel launches quickly and turns in early. Brake before the corner and unwind the wheel when its light rear starts to slide.',
      tradeoff:'Low mass and quick steering help launch; lower grip and slower slide recovery ask for a calmer corner entry.',
      physics:Object.freeze({massKg:880,driveForceN:7600,topSpeedMs:51,grip:.94,rollingLoss:.88,steeringResponse:1.14,slideRecovery:.82,brakeHeat:1.08,brakeRecovery:.93,downforce:.01}),
      wheels:WHEELS}),
    aegis:Object.freeze({id:'aegis',name:'Aegis',role:'Corner hold',availability:'prototype',
      assetUrl:local+'kicklab-race-aegis/v1/aegis-original.glb',
      coach:'Aegis holds a fast line with more tire grip and aero load. Its extra mass asks you to begin braking earlier.',
      tradeoff:'High corner grip and slide recovery; extra mass and rolling loss soften the launch and straight-line gain.',
      physics:Object.freeze({massKg:1560,driveForceN:8800,topSpeedMs:53,grip:1.10,rollingLoss:1.17,steeringResponse:.96,slideRecovery:1.16,brakeHeat:.90,brakeRecovery:1.12,downforce:.08}),
      wheels:WHEELS})
  });
  function enabled(loc=typeof location==='undefined'?null:location){
    if(!loc||!['localhost','127.0.0.1'].includes(loc.hostname))return false;
    if(!['http:','https:'].includes(loc.protocol))return false;
    return new URLSearchParams(loc.search).get('raceExpansion')==='prototype';
  }
  const get=id=>cars[id]||cars.cobalt;
  const list=()=>Object.values(cars);
  root.KickLabRaceVehicleCatalog=Object.freeze({schemaVersion:SCHEMA_VERSION,defaultId:'cobalt',cars,get,list,enabled});
})(typeof globalThis!=='undefined'?globalThis:window);
