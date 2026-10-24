import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const context={};context.globalThis=context;
vm.runInNewContext(read('src/shared/game-core.js'),context);
const core=context.KickLabGameCore;

function normalizeProgress(input){
  const source=read('src/game/01-progress.js');
  const body=source.slice(source.indexOf('function normalizedProgress('),source.indexOf('const store='));
  const scope={GAME_CORE:core,globalThis:{KickLabRaceGarage:{normalize:()=>({})},KickLabRaceProgression:{normalize:()=>({})},KickLabRaceModes:{enabled:()=>false},KickLabRaceCompetition:{enabled:()=>false},KickLabRaceChampionship:{enabled:()=>false}}};
  const run={...scope,input};vm.runInNewContext(`${body}\nthis.result=normalizedProgress(input);`,run);return run.result;
}

test('defaults absent and invalid profile time to Day while retaining valid choices',()=>{
  for(const value of [undefined,null,'dawn','DAY',42])assert.equal(core.normalizeKickTime(value),'day');
  for(const value of ['day','dusk','night'])assert.equal(core.normalizeKickTime(value),value);
  assert.equal(normalizeProgress({}).kickTime,'day');
  assert.equal(normalizeProgress({kickTime:'invalid'}).kickTime,'day');
  assert.equal(normalizeProgress({kickTime:'dusk'}).kickTime,'dusk');
  assert.equal(normalizeProgress({kickTime:'night'}).kickTime,'night');
});

test('gives all three times distinct Canvas palettes without touching stadium mechanics',()=>{
  const palettes=['day','dusk','night'].map(time=>core.fallbackEnvironment('home','grass',time));
  assert.equal(new Set(palettes.map(p=>p.skyTop)).size,3);
  assert.equal(new Set(palettes.map(p=>p.field)).size,3);
  assert.equal(palettes[0].floodlights,false);
  assert.equal(palettes[2].floodlights,true);
  assert.equal(core.fallbackEnvironment('home').time,'day');
  for(const id of ['home','alt','mars','moon'])for(const time of ['day','dusk','night']){
    const scene=core.fallbackEnvironment(id,'grass',time);
    assert.equal(scene.time,time);
    assert.ok(scene.skyTop&&scene.haze&&scene.field);
  }
  const stadium=read('src/game/31-soccer-data.js');
  assert.match(stadium,/home:\{n:'Home ground',d:'sea level',g:9\.81,rho:1\.2/);
  assert.match(stadium,/day:\{sky:/);assert.match(stadium,/dusk:\{sky:/);assert.match(stadium,/night:\{sky:/);
  const renderer=read('src/game/50-renderer-3d.js');
  for(const token of ['this.hemi.intensity=L.hemi','this.ambient.intensity=L.ambient','this.dl.intensity=L.sunPower','this.lampMat.emissiveIntensity=L.lamp','this.S.fog=new T.Fog','this.R.toneMappingExposure=L.exposure'])assert.ok(renderer.includes(token),token);
  for(const canvas of ['30-kick-sideview.js','32-soccer-3d-modes.js'])assert.match(read(`src/game/${canvas}`),/fallbackEnvironment\([^)]*\.opt\.time\)/);
});

test('time selection is presentation-only and does not enter the free-kick calculation',()=>{
  const input={speed:22,angleDegrees:17,gravity:9.81,spinAcceleration:0,startHeight:.11,horizontalAcceleration:0,wallDistance:9.15,goalDistance:21,wallHeight:1.85,crossbarHeight:2.44,ballRadius:.11,keeperReach:0,ballMass:.43,contactSeconds:.009};
  const results=['day','dusk','night'].map(time=>{assert.ok(core.fallbackEnvironment('home','grass',time));return core.calculateFreeKick(input);});
  assert.deepEqual(JSON.parse(JSON.stringify(results[0])),JSON.parse(JSON.stringify(results[1])));
  assert.deepEqual(JSON.parse(JSON.stringify(results[1])),JSON.parse(JSON.stringify(results[2])));
  const ui=read('src/game/41-ui.js');assert.match(ui,/g\.id==='time'\)\{best\.kickTime=GAME_CORE\.normalizeKickTime\(v\);saveBest\(\);renderAll\(false\);return;/);
  assert.match(read('src/game/30-kick-sideview.js'),/time:best\.kickTime/);
  assert.match(read('src/game/49-profiles.js'),/Kick\.opt\.time=best\.kickTime/);
});

test('keeps Fight and Race media bytes and local source policy intact',()=>{
  const expected={
    'fight.mp4':'7f84ffd903b08fc3dd4521b97f6598e8462b7f97f614c6af7da241877175e2f3',
    'race.mp4':'5d7eaafcac2ff87ff007619254153db0c0b70bc4b383099d2e3586924e66da74',
    'fight-poster.png':'3855ff1c70c78ae1b8ebdfda8ef020144aa11e388dfd04e5af11b4f9a66db1ba',
    'race-poster.png':'277b050e937db559e885828701237f9debbd474a9c0224cd7c9ec4614bc53c02'
  };
  for(const [name,hash] of Object.entries(expected))assert.equal(createHash('sha256').update(readFileSync(join(root,'src/media/home-previews',name))).digest('hex'),hash);
  const manifest=JSON.parse(read('src/media/home-previews/manifest.json'));
  assert.equal(manifest.privacy,'local renderer only; no external requests; no audio');
  for(const clip of manifest.clips.filter(clip=>clip.lab!=='Kick'))assert.equal(clip.revision,'db08f39641a8c8c1daa70bd1f3b967296cc5792a');
  const capture=read('scripts/capture-home-preview-media.mjs');assert.match(capture,/kickOnly\?\['Kick'\]/);assert.match(capture,/origin!==new URL\(baseUrl\)\.origin/);
});
