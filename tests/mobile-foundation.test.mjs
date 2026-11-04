import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=(path)=>readFileSync(join(root,path),'utf8');
const json=(path)=>JSON.parse(read(path));
const config=json('capacitor.config.json');
const contract=json('config/mobile-release-contract.json');
const manifest=json('dist/kicklab-mobile-manifest.json');
const exclusions=json('config/mobile-package-exclusions.json');
const packageOnly=json('config/package-only-asset-exclusions.json');
const packageJson=json('package.json');
const mobile=read('dist/mobile/index.html');
const web=read('dist/kicklab.html');
const nativeSafeArea=read('src/mobile-safe-area.css');
const lifecycle=read('src/game/56-mobile-lifecycle.js');
const qualification=json('docs/release/mobile-qualification-status.json');
const ciWorkflow=read('.github/workflows/ci.yml');
const pagesWorkflow=read('.github/workflows/pages-prepare.yml');

test('applies native safe areas without changing the ordinary browser artifact',()=>{
  assert.ok(mobile.includes(nativeSafeArea));
  assert.ok(!web.includes(nativeSafeArea));
  for(const edge of ['top','right','bottom','left']){
    assert.match(nativeSafeArea,new RegExp(`env\\(safe-area-inset-${edge}, 0px\\)`));
  }
  assert.match(nativeSafeArea,/\.wrap\s*\{[^}]*padding-top:\s*calc\(18px \+ env\(safe-area-inset-top, 0px\)\)/s);
  assert.match(nativeSafeArea,/\.wrap\s*\{[^}]*padding-bottom:\s*calc\(48px \+ env\(safe-area-inset-bottom, 0px\)\)/s);
  assert.match(nativeSafeArea,/\.profile-dialog\s*\{[^}]*inset:\s*env\(safe-area-inset-top, 0px\)/s);
  assert.match(nativeSafeArea,/\.profile-panel\s*\{[^}]*max-height:\s*100%;/s);
  assert.match(nativeSafeArea,/\.profile-dialog:not\(\.game-profile-overlay\) \.profile-panel > \.profile-head\s*\{[^}]*position:\s*sticky;/s);
  assert.match(nativeSafeArea,/@media \(max-height: 600px\)\s*\{[^}]*\.profile-dialog\s*\{[^}]*top:\s*max\(60px, env\(safe-area-inset-top, 0px\)\)/s);
});

test('locks artifact identity and provisional stable app id',()=>{
  assert.equal(config.appId,'com.amadutown.kicklab');
  assert.equal(config.appId,contract.app.id);
  assert.equal(config.appName,'KickLab');
  assert.equal(config.webDir,'dist/mobile');
  assert.equal(manifest.appId,config.appId);
  assert.equal(manifest.artifact,'dist/mobile/index.html');
  assert.equal(manifest.sha256,createHash('sha256').update(mobile).digest('hex'));
  assert.match(mobile,/<meta name="kicklab-artifact" content="capacitor-local-v1">/);
  assert.equal(packageJson.dependencies['@capacitor/core'],'8.5.3');
  assert.equal(packageJson.dependencies['@capacitor/app'],'8.1.2');
  assert.equal(packageJson.dependencies['@capacitor/haptics'],'8.0.2');
  assert.equal(packageJson.devDependencies['@capacitor/cli'],'8.4.3');
  assert.equal(packageJson.engines.node,'>=22');
  assert.equal(contract.platforms.ios.minimumVersion,15);
  assert.deepEqual(contract.platforms.android,{minimumSdk:24,compileSdk:36,targetSdk:36});
  assert.match(contract.platforms.targetPolicy,/supported by the pinned Capacitor major/);
  assert.deepEqual(qualification.platformFloor,{node:'>=22',ios:'>=15',android:{minimumSdk:24,compileSdk:36,targetSdk:36}});
  assert.match(ciWorkflow,/node-version: 22/);
  assert.match(pagesWorkflow,/node-version: 22/);
});

test('keeps the packaged shell offline and fail-closed for navigation and egress',()=>{
  assert.equal(config.server.url,undefined);
  assert.deepEqual(config.server.allowNavigation,[]);
  assert.equal(config.server.cleartext,false);
  assert.equal(contract.security.packagedAssetsOnly,true);
  assert.equal(contract.security.connectPolicy,'same-origin-packaged-assets-and-local-blobs-only');
  assert.equal(contract.security.generalPurposeBridge,false);
  assert.equal(contract.security.analytics,false);
  assert.equal(contract.security.advertising,false);
  assert.equal(contract.security.childDataTransport,false);
  assert.match(mobile,/connect-src 'self' blob:/);
  assert.doesNotMatch(mobile,/connect-src[^;]*\b(?:https?:|wss?:|\*|data:)/);
  assert.match(mobile,/form-action 'none'/);
  assert.doesNotMatch(mobile,/<(?:script|link|img|audio|video|source)\b[^>]*(?:src|href)=["']https?:\/\//i);
  assert.doesNotMatch(mobile,/fonts\.(?:googleapis|gstatic)\.com/);
  for(const file of ['fight.mp4','fight-poster.png','race.mp4','race-poster.png','kick.mp4','kick-poster.png'])assert.ok(existsSync(join(root,'dist','mobile','media','home-previews',file)),`${file} must be packaged locally`);
  for(const file of [
    'assets/3d/kicklab-direction-c-athlete/v2/kicklab-makehuman-athlete.glb',
    'assets/3d/kicklab-race-direction-a/v1/direction-a-atlas.glb',
  ])assert.ok(existsSync(join(root,'dist','mobile',file)),`${file} must be packaged locally`);
});

test('packages only reviewed runtime files and notices while preserving source evidence',()=>{
  const packageRoot=join(root,'dist','mobile');
  const sourceRoot=join(root,'src');
  const sourceFiles=['assets','media'].flatMap(folder=>{
    const folderRoot=join(sourceRoot,folder);
    const visit=(directory)=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
      const path=join(directory,entry.name);
      return entry.isDirectory()?visit(path):[relative(sourceRoot,path)];
    });
    return visit(folderRoot);
  });
  const evidenceRows=read('docs/release/excluded-source-evidence.csv').split(/\r?\n/).map(line=>line.match(/^([^,]+),([a-f0-9]{64}),X0[1-5],/)).filter(Boolean);
  assert.deepEqual([...exclusions.paths].sort(),evidenceRows.map(match=>match[1]).sort());
  assert.equal(exclusions.paths.length,25);
  for(const [,path,sha256] of evidenceRows){
    assert.equal(createHash('sha256').update(readFileSync(join(sourceRoot,path))).digest('hex'),sha256,`${path} source evidence changed`);
  }
  for(const path of exclusions.paths){
    assert.ok(existsSync(join(sourceRoot,path)),`${path} source evidence must remain`);
    assert.equal(existsSync(join(packageRoot,path)),false,`${path} must not ship`);
    assert.ok(!mobile.includes(path),`${path} has a runtime HTML reference`);
  }
  assert.equal(packageOnly.files.length,6);
  assert.deepEqual(packageOnly.files.map(file=>file.path).sort(),[
    'assets/3d/kicklab-direction-c-athlete/v1/DirectionCColorAtlas.png',
    'assets/3d/kicklab-direction-c-athlete/v1/DirectionCNormalAtlas.png',
    'assets/3d/kicklab-direction-c-athlete/v1/DirectionCRoughnessAtlas.png',
    'assets/3d/kicklab-direction-c-athlete/v1/kicklab-direction-c-athlete.glb',
    'assets/3d/kicklab-placeholder-athlete/v1/kicklab-placeholder-athlete.glb',
    'assets/3d/kicklab-race-vehicle/v1/kicklab-race-vehicle.glb',
  ].sort());
  for(const {path,sha256} of packageOnly.files){
    assert.equal(createHash('sha256').update(readFileSync(join(sourceRoot,path))).digest('hex'),sha256,`${path} source evidence changed`);
    assert.equal(existsSync(join(packageRoot,path)),false,`${path} must not ship`);
    assert.equal(existsSync(join(root,'dist','pages',path)),false,`${path} must not ship on Pages`);
    assert.ok(!mobile.includes(path),`${path} has a runtime HTML reference`);
  }
  for(const metadata of ['build-metrics.json','kicklab-mobile-manifest.json']){
    assert.equal(existsSync(join(packageRoot,metadata)),false,`${metadata} must remain outside the package`);
    assert.ok(!mobile.includes(metadata),`${metadata} has a runtime HTML reference`);
  }
  const removed=new Set([...exclusions.paths,...packageOnly.files.map(file=>file.path)]);
  const expected=[...sourceFiles.filter(path=>!removed.has(path)),'index.html','party-qr.js','THIRD-PARTY-NOTICES.txt'].sort();
  const packaged=(directory)=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const path=join(directory,entry.name);
    return entry.isDirectory()?packaged(path):[relative(packageRoot,path)];
  });
  assert.deepEqual(packaged(packageRoot).sort(),expected);
  const ledgerRows=read('docs/release/shipped-file-rights.csv').split(/\r?\n/).map(line=>line.match(/^([^,]+),([a-f0-9]{64}),(\d+),/)).filter(Boolean);
  const actionRows=read('docs/release/rights-action-map.csv').split(/\r?\n/).map(line=>line.match(/^([^,]+),([a-f0-9]{64}),([^,]+),/)).filter(Boolean);
  assert.equal(ledgerRows.length,204);
  assert.equal(actionRows.length,204);
  assert.deepEqual(ledgerRows.map(row=>row[1]).sort(),expected);
  assert.deepEqual(actionRows.map(row=>row[1]).sort(),expected);
  for(const [,path,sha256,bytes] of ledgerRows){
    const packagedBytes=readFileSync(join(packageRoot,path));
    assert.equal(createHash('sha256').update(packagedBytes).digest('hex'),sha256,`${path} ledger hash changed`);
    assert.equal(packagedBytes.length,Number(bytes),`${path} ledger size changed`);
    assert.equal(actionRows.find(row=>row[1]===path)?.[2],sha256,`${path} action-map hash changed`);
  }
  const notices=read('dist/mobile/THIRD-PARTY-NOTICES.txt');
  assert.equal(notices,read('config/mobile-distribution-notices.txt'));
  assert.ok(notices.includes(read('node_modules/three/LICENSE').trim()));
  assert.match(notices,/Copyright \(c\) 2009 Kazuhiko Arase/);
  assert.match(notices,/Permission is hereby granted, free of charge/);
});

test('preserves local profiles, leaderboards, and legacy storage continuity',()=>{
  assert.deepEqual(contract.storage.keys,['impactlab.v1','impactlab.nick','kicklab.profiles.v1']);
  assert.equal(contract.storage.mode,'local-first');
  assert.equal(contract.storage.firstLaunchCreatesCloudIdentity,false);
  assert.equal(contract.storage.remoteSyncEnabled,false);
  for(const marker of [...contract.storage.keys,'Local device','Family board / shared'])assert.ok(mobile.includes(marker),`${marker} must remain in the native artifact`);
});

test('exposes only narrow lifecycle and haptic hooks and cancels held inputs',()=>{
  for(const marker of ['releaseMobileHeldInputs','pointercancel','M.press(id,false)','canvasHeld=false','ANALOG_CONTROL.keys.clear()','releaseAnalog','cancelGesture','AC.suspend','appStateChange','visibilitychange','pagehide'])assert.ok(lifecycle.includes(marker),`${marker} must remain in the lifecycle contract`);
  assert.match(lifecycle,/KickLabMobileLifecycle=MOBILE_SHELL/);
  assert.match(lifecycle,/dataset\.kicklabMobileLifecycle/);
  assert.doesNotMatch(lifecycle,/postMessage|messageHandlers|WKWebView|JavascriptInterface/);
  assert.deepEqual(contract.hooks.haptics,['target','perfect','overcharge']);
});

test('retains explicit no-authority boundaries and no generated native projects',()=>{
  for(const [capability,allowed] of Object.entries(contract.authority))assert.equal(allowed,false,`${capability} must remain unauthorized`);
  assert.deepEqual(manifest.authority,contract.authority);
  assert.doesNotMatch(packageJson.scripts['mobile:prepare'],/cap\s+(?:add|sync|open|run|build)/);
  assert.equal(existsSync(join(root,'ios')),false);
  assert.equal(existsSync(join(root,'android')),false);
});

test('binds browser qualification to its merged artifact and keeps later gates unqualified',()=>{
  assert.deepEqual(qualification.gates.map(gate=>gate.id),['browser-baseline','ios-simulator-android-emulator','physical-devices','accessibility','signing','testflight-play-internal','feedback-release-candidate']);
  const [browser,...laterGates]=qualification.gates;
  assert.equal(browser.status,'qualified');
  for(const identity of ['7e16186ba85d5f8048104819ae53602870ffecb3','20fd645fd25f10589724eabcc22a1a57ad795688ab39597a8225d80d5d38d66c','c3c963ffc2ad3314068c857dc44c9b82ff640a310ec662fcef9404132ddb0294']){
    assert.ok(browser.evidence.includes(identity),`browser qualification must cite ${identity}`);
  }
  for(const gate of laterGates)assert.ok(['not_run','not_qualified'].includes(gate.status),`${gate.id} cannot be inferred as qualified`);
});
