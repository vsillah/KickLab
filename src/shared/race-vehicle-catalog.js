/* Compatibility fixture. Makeda's roster supplies this provider-neutral contract. */
/** @typedef {{id:'kestrel'|'cobalt'|'aegis',legacyBodyId:'kart'|'street'|'race',name:string,assetUrl:string|null,coach:string,massKg:number,driveForceN:number,topMps:number,grip:number,rollingLoss:number,steeringResponse:number,slideRecovery:number,brakeHeat:number,brakeRecovery:number,downforce:number,wheels:{wheelbaseM:number},lengthM:number,widthM:number,color:string}} RaceVehicle */
(function installRaceVehicleCatalog(root){
  'use strict';
  /** @type {Readonly<Record<RaceVehicle['id'], RaceVehicle>>} */
  const vehicles=Object.freeze({
    kestrel:Object.freeze({id:'kestrel',legacyBodyId:'kart',name:'Go-kart',assetUrl:null,coach:'Light launch and quick rotation; manage speed on long straights.',massKg:160,driveForceN:2200,topMps:30,grip:.94,rollingLoss:.94,steeringResponse:1.08,slideRecovery:1.12,brakeHeat:.85,brakeRecovery:1.12,downforce:0,wheels:{wheelbaseM:1.05},lengthM:2.1,widthM:1.3,color:'#5fe3a1'}),
    cobalt:Object.freeze({id:'cobalt',legacyBodyId:'street',name:'Street car',assetUrl:'assets/3d/kicklab-race-direction-a/v1/direction-a-atlas.glb',coach:'Balanced line and stable braking.',massKg:1400,driveForceN:8500,topMps:55,grip:1,rollingLoss:1,steeringResponse:1,slideRecovery:1,brakeHeat:1,brakeRecovery:1,downforce:0,wheels:{wheelbaseM:2.7},lengthM:4.5,widthM:1.85,color:'#7fdcff'}),
    aegis:Object.freeze({id:'aegis',legacyBodyId:'race',name:'Race car',assetUrl:null,coach:'Fast straight and higher corner load; brake before the turn.',massKg:760,driveForceN:11000,topMps:80,grip:1.06,rollingLoss:1.08,steeringResponse:1.05,slideRecovery:.88,brakeHeat:1.12,brakeRecovery:.9,downforce:.08,wheels:{wheelbaseM:2.9},lengthM:4.9,widthM:1.95,color:'#ff6b73'})
  });
  function get(id){return vehicles[id]||vehicles.cobalt;}
  function forGarageBody(body){return Object.values(vehicles).find(vehicle=>vehicle.legacyBodyId===body)||vehicles.cobalt;}
  root.KickLabRaceVehicleCatalog=Object.freeze({version:1,source:'direction-a-compatibility-fixture',vehicles,get,forGarageBody});
})(typeof globalThis!=='undefined'?globalThis:window);
