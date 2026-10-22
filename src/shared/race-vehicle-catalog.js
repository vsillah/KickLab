/* Provider-neutral Race roster. The asset lane owns this declarative contract. */
(function installRaceVehicleCatalog(root){
  'use strict';
  const SCHEMA_VERSION=1;
  const PIVOTS=Object.freeze({
    WheelFrontLeft:Object.freeze([1.28,.43,-1.04]),
    WheelFrontRight:Object.freeze([1.28,.43,1.04]),
    WheelRearLeft:Object.freeze([-1.28,.43,-1.04]),
    WheelRearRight:Object.freeze([-1.28,.43,1.04])
  });
  const local='assets/3d/';
  const create=(vehicle)=>{const wheels={...PIVOTS};Object.defineProperty(wheels,'wheelbaseM',{value:vehicle.wheelbaseM,enumerable:false});return Object.freeze({...vehicle,thumbnailUrl:'assets/garage/roster/v1/'+vehicle.id+'.webp',physics:Object.freeze(vehicle.physics),modeSuitability:Object.freeze(vehicle.modeSuitability),wheels:Object.freeze(wheels)});};
  const vehicles=Object.freeze({
    kestrel:create({id:'kestrel',legacyBodyId:'kart',name:'Kestrel',role:'Agile launch',shortTradeoff:'Lower grip; slow slide recovery.',strength:'Lightest car · quickest turn-in',modeSuitability:{drag:'Strong launch; watch wheelspin.',drift:'Quick rotation; recover gently.',circuit:'Fast turn-in; lighter rear needs care.',hill:'Light mass helps the climb.'},availability:'prototype',assetUrl:local+'kicklab-race-kestrel/v1/kestrel-original.glb',coach:'Kestrel launches quickly and turns in early. Brake before the corner and unwind the wheel when its light rear starts to slide.',tradeoff:'Low mass and quick steering help launch; lower grip and slower slide recovery ask for a calmer corner entry.',massKg:880,driveForceN:7600,topMps:51,grip:.94,rollingLoss:.88,steeringResponse:1.14,slideRecovery:.82,brakeHeat:1.08,brakeRecovery:.93,downforce:.01,wheelbaseM:2.56,lengthM:4.15,widthM:1.82,color:'#5fe3a1',physics:{massKg:880,driveForceN:7600,topSpeedMs:51,grip:.94,rollingLoss:.88,steeringResponse:1.14,slideRecovery:.82,brakeHeat:1.08,brakeRecovery:.93,downforce:.01}}),
    cobalt:create({id:'cobalt',legacyBodyId:'street',name:'Cobalt',role:'Balanced',shortTradeoff:'Balanced, with no specialist edge.',strength:'Predictable launch · steady line',modeSuitability:{drag:'Steady launch and trap speed.',drift:'Forgiving recovery between curves.',circuit:'Consistent pace across two laps.',hill:'Balanced speed and corner control.'},availability:'prototype',assetUrl:local+'kicklab-race-direction-a/v1/direction-a-atlas.glb',coach:'Balanced launch and corner grip. Use this car to learn the braking line before chasing a faster lap.',tradeoff:'Predictable all-round response; neither the quickest launch nor the strongest corner hold.',massKg:1400,driveForceN:8500,topMps:55,grip:1,rollingLoss:1,steeringResponse:1,slideRecovery:1,brakeHeat:1,brakeRecovery:1,downforce:0,wheelbaseM:2.7,lengthM:4.5,widthM:1.85,color:'#7fdcff',physics:{massKg:1400,driveForceN:8500,topSpeedMs:55,grip:1,rollingLoss:1,steeringResponse:1,slideRecovery:1,brakeHeat:1,brakeRecovery:1,downforce:0}}),
    aegis:create({id:'aegis',legacyBodyId:'race',name:'Aegis',role:'Corner hold',shortTradeoff:'Extra mass and drag soften launch.',strength:'Most grip · strongest slide recovery',modeSuitability:{drag:'Strong trap speed; heavier launch.',drift:'Grip holds the line but resists rotation.',circuit:'High grip rewards precise laps.',hill:'Carries speed through the switchback.'},availability:'prototype',assetUrl:local+'kicklab-race-aegis/v1/aegis-original.glb',coach:'Aegis holds a fast line with more tire grip and aero load. Its extra mass asks you to begin braking earlier.',tradeoff:'High corner grip and slide recovery; extra mass and rolling loss soften the launch and straight-line gain.',massKg:1560,driveForceN:8800,topMps:53,grip:1.10,rollingLoss:1.17,steeringResponse:.96,slideRecovery:1.16,brakeHeat:.90,brakeRecovery:1.12,downforce:.08,wheelbaseM:2.9,lengthM:4.9,widthM:1.95,color:'#ff6b73',physics:{massKg:1560,driveForceN:8800,topSpeedMs:53,grip:1.10,rollingLoss:1.17,steeringResponse:.96,slideRecovery:1.16,brakeHeat:.90,brakeRecovery:1.12,downforce:.08}})
  });
  function enabled(loc=typeof location==='undefined'?null:location){
    if(!loc||!['localhost','127.0.0.1'].includes(loc.hostname))return false;
    if(!['http:','https:'].includes(loc.protocol))return false;
    return new URLSearchParams(loc.search).get('raceExpansion')==='prototype';
  }
  const get=id=>vehicles[id]||vehicles.cobalt;
  const list=()=>Object.values(vehicles);
  const forGarageBody=body=>list().find(vehicle=>vehicle.legacyBodyId===body)||vehicles.cobalt;
  root.KickLabRaceVehicleCatalog=Object.freeze({schemaVersion:SCHEMA_VERSION,version:SCHEMA_VERSION,source:'kicklab-local-roster',defaultId:'cobalt',cars:vehicles,vehicles,get,list,forGarageBody,enabled});
})(typeof globalThis!=='undefined'?globalThis:window);
