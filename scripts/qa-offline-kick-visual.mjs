import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const url=process.argv[2]||'http://127.0.0.1:4211/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/offline-kick-fidelity/visual');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p)),args:['--enable-webgl']});
const rows=[];try{for(const [width,height] of [[360,800],[390,844],[768,1024],[1113,834],[1440,900]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();const target=new URL(url);target.searchParams.set('renderer','direction-c');target.searchParams.set('quality','full');target.searchParams.set('qa','direction-c');target.searchParams.set('rev',process.env.KICKLAB_REV||'visual');
 await page.goto(target.href,{waitUntil:'networkidle'});const close=page.locator('#profileClose');if(await close.isVisible())await close.click();await page.waitForFunction(()=>window.__KICKLAB_KICK_3D_PREP__?.status==='ready');await context.setOffline(true);await page.locator('#lab-tab-kick').click();await page.waitForFunction(()=>window.__KICKLAB_DIRECTION_C__?.status==='ready');await page.waitForTimeout(3000);
 const state=await page.evaluate(()=>({direction:window.__KICKLAB_DIRECTION_C__,stadium:window.__KICKLAB_STADIUM_AUDIT__,overflow:document.documentElement.scrollWidth-innerWidth,cv3:getComputedStyle(document.querySelector('#cv3')).display}));assert.equal(state.overflow,0);assert.equal(state.cv3,'block');assert.ok(state.stadium?.passes?.crowd&&state.stadium?.passes?.nearStand);
 const samples=await page.evaluate(()=>new Promise(done=>{const values=[];let last=performance.now();function tick(now){values.push(now-last);last=now;values.length===100?done(values):requestAnimationFrame(tick)}requestAnimationFrame(tick)}));const sorted=samples.slice(5).sort((a,b)=>a-b),p95Ms=+sorted[Math.floor(sorted.length*.95)].toFixed(2);assert.ok(p95Ms<=(width<=768?40:20),`${width}x${height} frame p95 ${p95Ms} ms`);
 const path=join(out,`${width}x${height}-offline-kick.png`);await page.screenshot({path,fullPage:true});rows.push({width,height,path,status:state.direction.status,overflow:state.overflow,stadium:state.stadium.passes,p95Ms});await context.close();console.log(path);
}}finally{await browser.close();}writeFileSync(join(out,'report.json'),JSON.stringify(rows,null,2));
