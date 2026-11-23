import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=path=>readFileSync(join(root,path),'utf8');
const core=read('src/game/00-core.js');
const motionSource=core.slice(core.indexOf('const MOTION_QUERY='),core.indexOf('let dpr=1'));
const packaged=read('src/mobile-safe-area.js');

function harness(initialMedia=false,initialNative=false){
  const listeners=new Map();
  const query={matches:initialMedia,addEventListener:(_,fn)=>listeners.set('media',fn)};
  const rule={media:{mediaText:'(prefers-reduced-motion: reduce)'}};
  const document={hidden:false,documentElement:{dataset:{}},styleSheets:[{cssRules:[rule]}],addEventListener:(name,fn)=>listeners.set(name,fn)};
  const storage={player:'synthetic-profile',progress:7};
  const game={active:true,ticks:37};
  const events=[];
  const context={window:{matchMedia:()=>query,visualViewport:null,
    KickLabAndroidMotion:{isReducedMotion:()=>initialNative}},document,
    syncHomePreviews:()=>events.push('home'),racePreflightRender:()=>events.push('preflight'),
    $:()=>({hidden:true}),RACE_REPLAY_PREVIEW:{frames:null}};
  runInNewContext(`${motionSource};globalThis.motionState=()=>reduce;`,context);
  runInNewContext(packaged,context);
  return {context,document,query,rule,listeners,storage,game,events,
    changeNative:value=>context.window.KickLabAndroidMotionChanged(value),
    changeMedia:value=>{query.matches=value;listeners.get('media')();}};
}

test('running Android shell follows Remove animations in both directions without resetting state',()=>{
  const h=harness();
  assert.equal(h.context.motionState(),false);
  h.changeNative(true);
  assert.equal(h.context.motionState(),true);
  assert.equal(h.document.documentElement.dataset.kicklabNativeReducedMotion,'true');
  assert.equal(h.rule.media.mediaText,'not all');
  h.changeNative(false);
  assert.equal(h.context.motionState(),false);
  assert.equal(h.rule.media.mediaText,'(prefers-reduced-motion: reduce)');
  assert.deepEqual(h.events,['home','home']);
  assert.deepEqual(h.storage,{player:'synthetic-profile',progress:7});
  assert.deepEqual(h.game,{active:true,ticks:37});
});

test('foreground resume, reload and cold relaunch read the current native state',()=>{
  const h=harness(false,true);
  assert.equal(h.context.motionState(),true);
  h.changeNative(false);
  assert.equal(h.context.motionState(),false);
  h.context.window.KickLabAndroidMotion.isReducedMotion=()=>true;
  h.listeners.get('visibilitychange')();
  assert.equal(h.context.motionState(),true);
  const reloaded=harness(false,true);
  assert.equal(reloaded.context.motionState(),true);
  const relaunched=harness(false,false);
  assert.equal(relaunched.context.motionState(),false);
  assert.match(packaged,/visibilitychange/);
  assert.match(read('android/app/src/main/java/com/amadutown/kicklab/MainActivity.java'),/onResume\(\)[\s\S]*syncReducedMotion/);
});

test('native state overrides stale Android media query while browser keeps matchMedia behavior',()=>{
  const h=harness(true,false);
  assert.equal(h.context.motionState(),false);
  assert.equal(h.rule.media.mediaText,'not all');
  h.changeMedia(false);
  assert.equal(h.context.motionState(),false);
  assert.equal(h.rule.media.mediaText,'(prefers-reduced-motion: reduce)');
  const browser={window:{matchMedia:()=>({matches:false,addEventListener(_,fn){this.change=fn;}})},document:{},
    syncHomePreviews:()=>{},racePreflightRender:()=>{},$:()=>({hidden:true}),RACE_REPLAY_PREVIEW:{frames:null}};
  runInNewContext(`${motionSource};globalThis.motionState=()=>reduce;`,browser);
  assert.equal(browser.motionState(),false);
  browser.window.KickLabMotion.setNativeReducedMotion(null);
  assert.equal(browser.motionState(),false);
  assert.doesNotMatch(read('src/game/00-core.js'),/matchMedia\s*=/);
});
