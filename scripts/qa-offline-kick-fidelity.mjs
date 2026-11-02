import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:4211/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/offline-kick-fidelity');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p)),args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const origin=new URL(base).origin,asset='/assets/3d/kicklab-direction-c-athlete/v2/kicklab-makehuman-athlete.glb';
const viewports=[[360,800],[390,844],[768,1024],[1113,834],[1440,900]],activities=['free','header','run','pass','combo','gk','pso','bar'],rows=[];
function url(extra={}){const u=new URL(base);u.searchParams.set('renderer','direction-c');u.searchParams.set('quality','full');u.searchParams.set('qa','direction-c');for(const [k,v] of Object.entries(extra))u.searchParams.set(k,v);return u.href;}
async function closeProfile(page){const b=page.locator('#profileClose');if(await b.isVisible())await b.click();}
async function state(page){return page.evaluate(()=>({prep:window.__KICKLAB_KICK_3D_PREP__,athlete:window.__KICKLAB_DIRECTION_C__,stadium:window.__KICKLAB_STADIUM_AUDIT__,cv3:!!document.querySelector('#cv3')&&getComputedStyle(document.querySelector('#cv3')).display!=='none',overflow:document.documentElement.scrollWidth-innerWidth,mode:document.documentElement.dataset.kicklabMode,home:!document.querySelector('#modeHome').hidden,stored:Object.keys(localStorage).sort()}));}
async function frame(page){const a=await page.evaluate(()=>new Promise(done=>{const v=[];let last=performance.now();function tick(now){v.push(now-last);last=now;v.length===16?done(v):requestAnimationFrame(tick)}requestAnimationFrame(tick)}));const sorted=a.slice(4).sort((x,y)=>x-y);return +sorted[Math.floor(sorted.length*.95)].toFixed(2);}
async function caseRun(width,height,key,{offline=true,reducedMotion='no-preference',video=false,storage='normal'}={}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion,recordVideo:video?{dir:join(out,'recordings'),size:{width,height}}:undefined});
 if(storage==='denied')await context.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===localStorage&&String(key).startsWith('kicklab.profiles.'))throw new DOMException('denied','QuotaExceededError');return original.call(this,key,value);};});
 if(storage==='corrupt')await context.addInitScript(()=>{try{localStorage.setItem('impactlab.v1','{broken')}catch{}});
 const page=await context.newPage(),requests=[],errors=[],external=[];let lost=false;
 page.on('request',r=>{const u=r.url();if(lost)requests.push(u);if(/^https?:/.test(u)&&new URL(u).origin!==origin)external.push(u)});
 page.on('pageerror',e=>errors.push(String(e)));
 const recorded=video?page.video():null;
 await page.goto(url({activity:key,rev:process.env.KICKLAB_REV||'offline-kick-fidelity'}),{waitUntil:'networkidle'});await closeProfile(page);
 await page.waitForFunction(()=>window.__KICKLAB_KICK_3D_PREP__?.status==='ready',null,{timeout:12000});
 const home=await state(page);assert.equal(home.home,true);assert.equal(home.mode,'fight');assert.equal(home.athlete.loads,0);assert.equal(home.prep.bytes,1643096);
 if(video)await page.waitForTimeout(700);
 if(offline){lost=true;await context.setOffline(true);if(video)await page.waitForTimeout(700);}
 await page.locator('#lab-tab-kick').click();if(key!=='free'){await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();const selected=page.locator('[role="checkbox"][aria-checked="true"]');while(await selected.count())await selected.first().click();await page.locator(`#game-${key}`).click();await page.locator('#freestyleStart').click();}await page.waitForFunction(()=>/^ready/.test(window.__KICKLAB_DIRECTION_C__?.status||''),null,{timeout:15000});
 await page.waitForTimeout(250);let active=await state(page);assert.equal(active.athlete.profile,key);assert.equal(active.cv3,true);assert.equal(active.overflow,0);assert.equal(active.athlete.assetUrl,asset.slice(1));assert.equal(active.athlete.localOnly,true);assert.equal(active.stadium?.passes?.crowd,true);assert.equal(active.stadium?.passes?.nearStand,true);
 const before=active.athlete.phaseTime;const primary=page.locator('[data-id="go"]:not([disabled])').last();if(await primary.isVisible())await primary.press('Enter');await page.waitForTimeout(450);const after=await state(page);if(video)await page.waitForTimeout(900);
 await page.evaluate(()=>KickLabMobileLifecycle.suspend('offline-kick-fidelity'));const freeze=(await state(page)).athlete.phaseTime;await page.waitForTimeout(240);assert.equal((await state(page)).athlete.phaseTime,freeze);await page.evaluate(()=>KickLabMobileLifecycle.foreground('offline-kick-fidelity'));
 await page.locator('#cv').click({position:{x:20,y:20}});await page.waitForFunction(()=>window.__KICKLAB_DIRECTION_C__?.paused===false,null,{timeout:5000});
 await page.waitForTimeout(280);const resumed=await state(page);assert.equal(resumed.cv3,true);assert.equal(resumed.athlete.paused,false);
 const p95=await frame(page);const row={width,height,key,offline,reducedMotion,storage,homePrep:home.prep,renderer:active.athlete.status,profile:active.athlete.profile,stadium:active.stadium?.passes,firstPlayBytes:active.athlete.firstPlayBytes,memoryProxyBytes:active.athlete.memoryProxyBytes,assetBytes:home.prep.bytes,p95Ms:p95,phaseMoved:after.athlete.phaseTime!==before,resumed:resumed.athlete.status,offlineRequests:requests,errors,external};
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);if(offline)assert.equal(requests.filter(u=>u.includes(asset)).length,0);
 assert.ok(row.firstPlayBytes<=8_000_000);assert.ok(row.memoryProxyBytes<=24*1024*1024);row.frameBudgetPass=p95<=(width<=768?40:20);
 if(video){await page.screenshot({path:join(out,'exact-head-offline-kick.png')});await page.waitForTimeout(700);}
 await context.close();if(video){const raw=await recorded.path(),mp4=join(out,'exact-head-offline-kick-webgl.mp4');execFileSync('ffmpeg',['-y','-i',raw,'-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{stdio:'ignore'});row.video=mp4;}
 rows.push(row);console.log(`${width}x${height} ${key} ${offline?'offline':'online'} ${active.athlete.status} ${p95}ms`);return row;
}
try{
 for(const [width,height] of (process.env.KICKLAB_ONLY_VIDEO==='1'?[[1440,900]]:viewports))for(const key of (process.env.KICKLAB_ONLY_VIDEO==='1'?['free']:activities))await caseRun(width,height,key,{video:width===1440&&key==='free'});
 if(process.env.KICKLAB_ONLY_VIDEO==='1'){writeFileSync(join(out,'exact-head-video-report.json'),JSON.stringify(rows,null,2));}else{
 await caseRun(390,844,'free',{offline:false});await caseRun(390,844,'header',{offline:false});
 await caseRun(390,844,'run',{reducedMotion:'reduce'});
 await caseRun(390,844,'free',{storage:'corrupt'});
 await caseRun(390,844,'free',{storage:'denied'});
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:original.call(this,type,...args)}});const page=await context.newPage();await page.goto(url(),{waitUntil:'networkidle'});await closeProfile(page);await page.locator('#lab-tab-kick').click();await page.waitForTimeout(800);const fallback=await state(page);assert.equal(fallback.athlete.status,'webgl-unavailable');assert.equal(fallback.cv3,false);await context.close();
 writeFileSync(join(out,'report.json'),JSON.stringify({base,viewports,activities,rows,fallback:{status:fallback.athlete.status,cv3:fallback.cv3}},null,2));
}
}finally{await browser.close();}
