import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4211/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/direction-c-athlete/final');
mkdirSync(outputDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath});
const errors=[],externalRequests=new Set(),screenshots=[],responsive=[],framePacing={},fallbacks={},localOrigin=new URL(baseUrl).origin;
const budgets={assetBytes:2_500_000,firstPlayBytes:8_000_000,contactDriftMm:10,plantGroundMm:10,desktopP95Ms:20,mobileP95Ms:40,memoryProxyBytes:24*1024*1024,materials:6,overflowPx:0};

function watch(page){
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{const url=request.url();if(/^https?:/.test(url)&&new URL(url).origin!==localOrigin)externalRequests.add(url);});
}
const urlFor=(params={})=>{const url=new URL(baseUrl);url.searchParams.set('renderer','direction-c');url.searchParams.set('quality','full');url.searchParams.set('qa','direction-c');for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));return url.href;};

async function dismissProfile(page){const close=page.locator('#profileClose');if(await close.isVisible())await close.click();}
async function openKick(page,params={}){await page.goto(urlFor(params),{waitUntil:'networkidle'});await dismissProfile(page);await page.locator('#lab-tab-kick').click();await page.locator('.stage').waitFor({state:'visible'});await page.waitForTimeout(4200);return page.evaluate(()=>window.__KICKLAB_DIRECTION_C__);}
async function pacing(page,samples=150){const values=await page.evaluate(count=>new Promise(resolve=>{const values=[];let last=performance.now();const tick=now=>{values.push(now-last);last=now;if(values.length>=count)resolve(values);else requestAnimationFrame(tick);};requestAnimationFrame(tick);}),samples);const sorted=values.slice(4).sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)]||0,avg=sorted.reduce((sum,value)=>sum+value,0)/Math.max(1,sorted.length);return{samples:sorted.length,avgMs:+avg.toFixed(2),p95Ms:+p95.toFixed(2),maxMs:+Math.max(...sorted).toFixed(2)};}
async function capture({width,height,label,phase='ready',reducedMotion='no-preference'}){const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion});const page=await context.newPage();watch(page);const audit=await openKick(page,{athletePhase:phase,view:label});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);const path=join(outputDir,`${label}.png`);await page.screenshot({path,fullPage:true});screenshots.push(path);responsive.push({label,width,height,phase,reducedMotion,overflow,audit});framePacing[label]=await pacing(page,width<=768?100:150);await context.close();return audit;}
async function captureClose(phase){const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:2});const page=await context.newPage();watch(page);await openKick(page,{athletePhase:phase,view:`runtime-close-${phase}`});await page.evaluate(()=>window.__KICKLAB_DIRECTION_C_CLOSEUP__());await page.waitForTimeout(300);const box=await page.locator('#cv3').boundingBox();if(!box)throw new Error(`3D canvas missing for ${phase} close-up`);const path=join(outputDir,`runtime-close-${phase}.png`);await page.screenshot({path,clip:box});screenshots.push(path);await context.close();return path;}

const desktop=await capture({width:1440,height:1000,label:'desktop-ready',phase:'ready'});
const contact=await capture({width:1440,height:1000,label:'desktop-contact',phase:'contact'});
await capture({width:1440,height:1000,label:'desktop-follow-through',phase:'follow-through'});
await capture({width:768,height:1024,label:'tablet-run-up',phase:'run-up'});
await capture({width:390,height:844,label:'mobile-narrow-ready',phase:'ready'});
const reduced=await capture({width:390,height:844,label:'mobile-reduced-motion',phase:'contact',reducedMotion:'reduce'});
await captureClose('ready');
await captureClose('contact');
await captureClose('follow-through');

{
  const priorComparison=join(outputDir,'direction-c-reference-comparison.png'),current=join(outputDir,'runtime-close-contact.png'),comparison=join(outputDir,'direction-c-reference-v1-v2-comparison.png');
  if(existsSync(priorComparison)&&existsSync(current))execFileSync('ffmpeg',['-y','-i',priorComparison,'-i',current,'-filter_complex','[0:v]scale=1536:720:force_original_aspect_ratio=decrease,pad=1536:720:(ow-iw)/2:(oh-ih)/2:color=0x071022[left];[1:v]scale=768:720:force_original_aspect_ratio=decrease,pad=768:720:(ow-iw)/2:(oh-ih)/2:color=0x071022[right];[left][right]hstack=inputs=2[out]','-map','[out]','-frames:v','1',comparison],{stdio:'ignore'});
}

{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const page=await context.newPage();watch(page);
  await page.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'})));
  await page.goto(urlFor({view:'canvas-fallback'}),{waitUntil:'networkidle'});await dismissProfile(page);await page.locator('#lab-tab-kick').click();await page.locator('.stage').waitFor({state:'visible'});await page.waitForTimeout(2600);
  const state=await page.evaluate(()=>({audit:window.__KICKLAB_DIRECTION_C__,cv3:!!document.querySelector('#cv3'),canvas:getComputedStyle(document.querySelector('#cv')).display,fallback:window.__KICKLAB_SIDE_STADIUM__,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));fallbacks.canvas=state;if(state.cv3||state.canvas!=='block'||state.audit.status!=='canvas')throw new Error(`Canvas fallback failed: ${JSON.stringify(state)}`);const path=join(outputDir,'mobile-canvas-fallback.png');await page.screenshot({path,fullPage:true});screenshots.push(path);await context.close();
}
{
  const context=await browser.newContext({viewport:{width:768,height:1024},deviceScaleFactor:1});const page=await context.newPage();watch(page);await page.goto(urlFor({quality:'low',view:'reduced-quality'}),{waitUntil:'networkidle'});const state=await page.evaluate(()=>window.__KICKLAB_DIRECTION_C__);fallbacks.reducedQuality=state;if(state.status!=='reduced-quality'||state.loads!==0)throw new Error(`Reduced-quality fallback failed: ${JSON.stringify(state)}`);await context.close();
}
{
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});const page=await context.newPage();watch(page);await page.goto(`${baseUrl}?qa=direction-c-default-off`,{waitUntil:'networkidle'});const state=await page.evaluate(()=>window.__KICKLAB_DIRECTION_C__);fallbacks.defaultOff=state;if(state.enabled||state.status!=='flag-off'||state.loads!==0)throw new Error(`Default-off gate failed: ${JSON.stringify(state)}`);await context.close();
}
{
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});const page=await context.newPage();watch(page);await openKick(page,{athletePhase:'ready',view:'lifecycle'});const before=await page.evaluate(()=>window.__KICKLAB_DIRECTION_C__.phaseTime);await page.evaluate(()=>KickLabMobileLifecycle.suspend('direction-c-qa'));await page.waitForTimeout(500);const after=await page.evaluate(()=>window.__KICKLAB_DIRECTION_C__.phaseTime);await page.evaluate(()=>KickLabMobileLifecycle.foreground('direction-c-qa'));fallbacks.lifecycle={before,after,frozen:before===after};if(before!==after)throw new Error(`Lifecycle animation advanced while paused: ${before} -> ${after}`);await context.close();
}

let videoPath;
{
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});const page=await context.newPage();watch(page);await openKick(page,{view:'replay-evidence'});await page.locator('[data-id="go"]').click();await page.locator('#results').waitFor({state:'visible',timeout:20000});await page.locator('#rReplay').click();await page.locator('.rb-sp [data-sp="0.25"]').click();await page.waitForTimeout(900);const quarter=join(outputDir,'desktop-replay-quarter.png');await page.screenshot({path:quarter,fullPage:true});screenshots.push(quarter);const quarterAudit=await page.evaluate(()=>window.__KICKLAB_DIRECTION_C__);await page.locator('.rb-sp [data-sp="1"]').click();await page.waitForTimeout(700);const normal=join(outputDir,'desktop-replay-normal.png');await page.screenshot({path:normal,fullPage:true});screenshots.push(normal);const normalAudit=await page.evaluate(()=>window.__KICKLAB_DIRECTION_C__);fallbacks.replay={quarter:quarterAudit.replay,normal:normalAudit.replay};if(quarterAudit.replay?.speed!==.25||normalAudit.replay?.speed!==1)throw new Error(`Replay speed evidence failed: ${JSON.stringify(fallbacks.replay)}`);await context.close();
  const recordingDir=join(outputDir,'live-recording');mkdirSync(recordingDir,{recursive:true});const liveContext=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,reducedMotion:'no-preference',recordVideo:{dir:recordingDir,size:{width:1280,height:720}}}),livePage=await liveContext.newPage();watch(livePage);const recorded=livePage.video();await openKick(livePage,{view:'live-walkthrough'});await livePage.evaluate(()=>window.__KICKLAB_DIRECTION_C_FOCUS__?.());await livePage.waitForTimeout(800);const primary=livePage.locator('[data-id="go"]:not([disabled])').last();await primary.focus();await primary.press('Enter');await livePage.waitForTimeout(900);await livePage.evaluate(()=>window.__KICKLAB_DIRECTION_C_WIDE__?.());await livePage.waitForTimeout(2600);await liveContext.close();const sourceVideo=await recorded.path();videoPath=join(outputDir,'kicklab-direction-c-athlete-live-walkthrough.mp4');execFileSync('ffmpeg',['-y','-i',sourceVideo,'-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',videoPath],{stdio:'ignore'});
}

await browser.close();
const assetBytes=readFileSync(resolve('src/assets/3d/kicklab-direction-c-athlete/v2/kicklab-makehuman-athlete.glb')).byteLength;
const maxDesktop=Math.max(...Object.entries(framePacing).filter(([name])=>name.startsWith('desktop')).map(([,value])=>value.p95Ms));
const maxMobile=Math.max(...Object.entries(framePacing).filter(([name])=>name.startsWith('mobile')||name.startsWith('tablet')).map(([,value])=>value.p95Ms));
const report={baseUrl,budgets,metrics:{assetBytes,firstPlayBytes:desktop.firstPlayBytes,contactDriftMm:contact.contactDriftMm,plantGroundMm:desktop.plantGroundMm,memoryProxyBytes:desktop.memoryProxyBytes,materials:desktop.materials,textures:desktop.textures,textureBytes:desktop.textureBytes,triangles:desktop.triangles,maxDesktopP95Ms:maxDesktop,maxMobileP95Ms:maxMobile,maxOverflowPx:Math.max(...responsive.map(item=>item.overflow))},fallbacks,framePacing,responsive,externalRequests:[...externalRequests],errors,screenshots,video:videoPath,passes:{asset:assetBytes<=budgets.assetBytes,firstPlay:desktop.firstPlayBytes<=budgets.firstPlayBytes,contact:contact.contactDriftMm<=budgets.contactDriftMm,plant:desktop.plantGroundMm<=budgets.plantGroundMm,memory:desktop.memoryProxyBytes<=budgets.memoryProxyBytes,materials:desktop.materials<=budgets.materials,desktopFrame:maxDesktop<=budgets.desktopP95Ms,mobileFrame:maxMobile<=budgets.mobileP95Ms,overflow:responsive.every(item=>item.overflow===0),externalRequests:externalRequests.size===0,errors:errors.length===0}};
writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);
const failed=Object.entries(report.passes).filter(([,passed])=>!passed).map(([name])=>name);if(failed.length)throw new Error(`Direction C QA budgets failed: ${failed.join(', ')} (${JSON.stringify(report.metrics)})`);
console.log(JSON.stringify({ok:true,outputDir,metrics:report.metrics,passes:report.passes,video:videoPath},null,2));
