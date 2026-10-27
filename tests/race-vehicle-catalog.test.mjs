import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {resolve} from 'node:path';

const source=readFileSync(resolve('src/shared/race-vehicle-catalog.js'),'utf8');
const originSource=readFileSync(resolve('src/shared/race-origin.js'),'utf8');
function catalog(url){
  const context={location:new URL(url),URLSearchParams};
  context.globalThis=context;
  runInNewContext(originSource,context);
  runInNewContext(source,context);
  return context.KickLabRaceVehicleCatalog;
}

test('versioned roster has stable local assets and complete handling traits',()=>{
  const roster=catalog('http://127.0.0.1:4357/kicklab.html?raceExpansion=prototype');
  assert.equal(roster.schemaVersion,1);
  assert.equal(roster.defaultId,'cobalt');
  assert.deepEqual(Array.from(roster.list(),car=>car.id).sort(),['aegis','cobalt','kestrel','sable','vesper']);
  for(const car of roster.list()){
    assert.match(car.assetUrl,/^assets\/3d\/[a-z0-9/-]+\.glb$/);
    assert.ok(existsSync(resolve('src',car.assetUrl)));
    assert.equal(car.availability,['vesper','sable'].includes(car.id)?'mastery':'prototype');
    assert.ok(car.coach.length>30&&car.tradeoff.length>30);
    assert.deepEqual(Object.keys(car.physics),['massKg','driveForceN','topSpeedMs','grip','rollingLoss','steeringResponse','slideRecovery','brakeHeat','brakeRecovery',...(['vesper','sable'].includes(car.id)?['tireHeat','engineHeatLoad']:[]),'downforce']);
    assert.ok(Object.values(car.physics).every(Number.isFinite));
    assert.deepEqual(Object.keys(car.wheels),['WheelFrontLeft','WheelFrontRight','WheelRearLeft','WheelRearRight']);
  }
  assert.ok(roster.cars.kestrel.physics.driveForceN/roster.cars.kestrel.physics.massKg>roster.cars.cobalt.physics.driveForceN/roster.cars.cobalt.physics.massKg);
  assert.ok(roster.cars.aegis.physics.grip>roster.cars.cobalt.physics.grip);
  assert.ok(roster.cars.aegis.physics.downforce>roster.cars.kestrel.physics.downforce);
  assert.ok(roster.cars.vesper.wheelbaseM>roster.cars.aegis.wheelbaseM);
  assert.ok(roster.cars.sable.wheelbaseM<roster.cars.kestrel.wheelbaseM);
  assert.ok(roster.cars.vesper.brakeHeat>roster.cars.cobalt.brakeHeat);
  assert.ok(roster.cars.sable.tireHeat>1);
});

test('advanced cars unlock only from this profile’s passed formats',()=>{
  const roster=catalog('http://127.0.0.1:4357/kicklab.html?raceExpansion=prototype');
  const progress=cleared=>({raceMastery:{version:1,cleared}});
  assert.equal(roster.access('vesper',progress([])).unlocked,false);
  assert.equal(roster.access('sable',progress(['drag','circuit','hill'])).unlocked,false);
  assert.equal(roster.access('vesper',progress(['drag','circuit'])).unlocked,true);
  assert.equal(roster.access('sable',progress(['drag','drift','hill'])).unlocked,true);
  assert.equal(roster.access('kestrel',progress([])).unlocked,true);
  assert.equal(roster.access('sable',{}).unlocked,false);
  assert.equal(roster.access('vesper',{raceModes:{version:1,best:{drag:100,circuit:200}}}).unlocked,false,'historical scores cannot prove manual driving');
  const first=roster.recordMastery(null,'drag',{passed:true,manual:true,solo:true});
  assert.deepEqual(Array.from(first.cleared),['drag']);
  assert.deepEqual(Array.from(roster.recordMastery(first,'drift',{passed:true,manual:false,solo:true}).cleared),['drag']);
  assert.deepEqual(Array.from(roster.recordMastery(first,'drift',{passed:true,manual:true,solo:false}).cleared),['drag']);
  assert.deepEqual(Array.from(roster.recordMastery(first,'drift',{passed:false,manual:true,solo:true}).cleared),['drag']);
  assert.deepEqual(Array.from(roster.recordMastery(first,'drift',{passed:true,manual:true,solo:true}).cleared),['drag','drift']);
});

test('roster gate requires the explicit flag on trusted local and Pages locations',()=>{
  for(const url of [
    'http://127.0.0.1:4357/kicklab.html?raceExpansion=prototype',
    'http://localhost:4357/kicklab.html?raceExpansion=prototype',
    'https://vsillah.github.io/KickLab/?raceExpansion=prototype',
    'https://vsillah.github.io/KickLab/index.html?raceExpansion=prototype'
  ])assert.equal(catalog(url).enabled(),true,url);
  for(const url of [
    'http://127.0.0.1:4357/kicklab.html',
    'https://vsillah.github.io/KickLab/',
    'https://vsillah.github.io/KickLab/?raceExpansion=preview',
    'http://vsillah.github.io/KickLab/?raceExpansion=prototype',
    'https://vsillah.github.io:8443/KickLab/?raceExpansion=prototype',
    'https://vsillah.github.io/KickLab?raceExpansion=prototype',
    'https://vsillah.github.io/KickLab/other.html?raceExpansion=prototype',
    'https://vsillah.github.io.evil.test/KickLab/?raceExpansion=prototype',
    'file:///KickLab/?raceExpansion=prototype',
    'https://example.com/kicklab.html?raceExpansion=prototype'
  ])assert.equal(catalog(url).enabled(),false,url);
  const context={location:new URL('https://vsillah.github.io/KickLab/?raceExpansion=prototype'),URLSearchParams};
  context.globalThis=context;
  runInNewContext(source,context);
  assert.equal(context.KickLabRaceVehicleCatalog.enabled(),false,'missing trust policy fails closed');
});
