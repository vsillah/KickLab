import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const baseUrl=process.argv[2],headUrl=process.argv[3],out=resolve(process.argv[4]||'qa-artifacts/offline-kick-fidelity');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p)),args:process.env.KICKLAB_BROWSER_GPU==='normal'?['--enable-webgl']:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const rows=[];
for(const [label,url] of [['base',baseUrl],['head',headUrl]])for(const offline of [false,true]){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();let lost=false;const requests=[],allRequests=[];page.on('request',r=>{allRequests.push(r.url());if(lost)requests.push(r.url())});
 await page.goto(`${url}?renderer=direction-c&quality=full&qa=direction-c&rev=${label}`,{waitUntil:'networkidle'});const close=page.locator('#profileClose');if(await close.isVisible())await close.click();
 if(label==='head')await page.waitForFunction(()=>window.__KICKLAB_KICK_3D_PREP__?.status==='ready');
 if(offline){lost=true;await context.setOffline(true);}
 await page.locator('#lab-tab-kick').click();await page.waitForTimeout(2800);
 const state=await page.evaluate(()=>({athlete:window.__KICKLAB_DIRECTION_C__,stadium:window.__KICKLAB_STADIUM_AUDIT__,cv3:!!document.querySelector('#cv3')&&getComputedStyle(document.querySelector('#cv3')).display!=='none',prep:window.__KICKLAB_KICK_3D_PREP__||null,canvas:getComputedStyle(document.querySelector('#cv')).display}));
 const samples=await page.evaluate(()=>new Promise(done=>{const a=[];let last=performance.now();function tick(now){a.push(now-last);last=now;a.length===32?done(a):requestAnimationFrame(tick)}requestAnimationFrame(tick)}));const sorted=samples.slice(4).sort((a,b)=>a-b),p95=+sorted[Math.floor(sorted.length*.95)].toFixed(2);
 rows.push({label,offline,status:state.athlete.status,phase:state.athlete.phase,cv3:state.cv3,canvas:state.canvas,p95Ms:p95,memoryProxyBytes:state.athlete.memoryProxyBytes,firstPlayBytes:state.athlete.firstPlayBytes,stadiumPasses:state.stadium?.passes,prep:state.prep,requests,requestPaths:[...new Set(allRequests.filter(u=>/^https?:/.test(u)).map(u=>new URL(u).pathname))]});await context.close();
}
await browser.close();writeFileSync(join(out,process.env.KICKLAB_BROWSER_GPU==='normal'?'base-comparison-normal-chrome.json':'base-comparison.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.map(({label,offline,status,cv3,p95Ms,requests})=>({label,offline,status,cv3,p95Ms,offlineRequests:requests.length})),null,2));
