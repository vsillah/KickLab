import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=(path)=>readFileSync(join(root,path),'utf8');
const json=(path)=>JSON.parse(read(path));
const config=json('capacitor.config.json');
const contract=json('config/mobile-release-contract.json');
const manifest=json('dist/mobile/kicklab-mobile-manifest.json');
const packageJson=json('package.json');
const mobile=read('dist/mobile/index.html');
const lifecycle=read('src/game/56-mobile-lifecycle.js');
const qualification=json('docs/release/mobile-qualification-status.json');
const ciWorkflow=read('.github/workflows/ci.yml');
const pagesWorkflow=read('.github/workflows/pages-prepare.yml');

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
  assert.equal(packageJson.dependencies['@capacitor/ios'],'8.5.3');
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
  assert.equal(contract.security.generalPurposeBridge,false);
  assert.equal(contract.security.analytics,false);
  assert.equal(contract.security.advertising,false);
  assert.equal(contract.security.childDataTransport,false);
  assert.match(mobile,/connect-src 'none'/);
  assert.match(mobile,/form-action 'none'/);
  assert.doesNotMatch(mobile,/<(?:script|link|img|audio|video|source)\b[^>]*(?:src|href)=["']https?:\/\//i);
  assert.doesNotMatch(mobile,/fonts\.(?:googleapis|gstatic)\.com/);
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

test('retains protected authority boundaries and scopes native generation to iOS',()=>{
  for(const [capability,allowed] of Object.entries(contract.authority))assert.equal(allowed,false,`${capability} must remain unauthorized`);
  assert.deepEqual(manifest.authority,contract.authority);
  assert.doesNotMatch(packageJson.scripts['mobile:prepare'],/cap\s+(?:add|sync|open|run|build)/);
  assert.equal(existsSync(join(root,'ios/App/App.xcodeproj/project.pbxproj')),true);
  assert.equal(existsSync(join(root,'ios/App/App/PrivacyInfo.xcprivacy')),true);
  assert.equal(existsSync(join(root,'android')),false);
});

test('keeps every unqualified release gate explicit',()=>{
  assert.deepEqual(qualification.gates.map(gate=>gate.id),['browser-baseline','ios-simulator-android-emulator','physical-devices','accessibility','signing','testflight-play-internal','feedback-release-candidate']);
  for(const gate of qualification.gates)assert.ok(['not_run','not_qualified'].includes(gate.status),`${gate.id} cannot be inferred as qualified`);
});
