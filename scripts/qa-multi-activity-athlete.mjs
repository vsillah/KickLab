import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4217/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/multi-activity-athlete/final');
mkdirSync(outputDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath});
const activities=[['free','Free kick'],['header','Header duel'],['run','1v1 Dribble'],['pass','Passing'],['combo','Combo attack'],['gk','Goalkeeper'],['pso','Penalty shootout'],['bar','Crossbar']];
const viewports=[['desktop',1440,1000],['tablet',768,1024],['mobile',390,844]];
const errors=[],externalRequests=new Set(),captures=[],audits=[],pacing={},fallbacks={},localOrigin=new URL(baseUrl).origin;
const budgets={assetBytes:2_500_000,firstPlayBytes:8_000_000,contactDriftMm:10,plantGroundMm:10,desktopP95Ms:20,mobileP95Ms:40,memoryProxyBytes:24*1024*1024,materials:6,overflowPx:0};

function watch(page){page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('request',request=>{const url=request.url();if(/^https?:/.test(url)&&new URL(url).origin!==localOrigin)externalRequests.add(url);});}
const urlFor=(params={})=>{const url=new URL(baseUrl);url.searchParams.set('renderer','direction-c');url.searchParams.set('quality','full');url.searchParams.set('qa','direction-c');url.searchParams.set('athletePhase','contact');for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));return url.href;};
async function dismissProfile(page){const close=page.locator('#profileClose');if(await close.isVisible())await close.click();}
async function openKick(page){await page.goto(urlFor(),{waitUntil:'networkidle'});await dismissProfile(page);await page.locator('#lab-tab-kick').click();await page.locator('.stage').waitFor({state:'visible'});await page.waitForTimeout(4400);}
async function openActivity(page,key,name){if(name==='Free kick')return;await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();await page.locator('#experiencePanel').waitFor({state:'visible'});for(;;){const selected=page.locator('[role="checkbox"][aria-checked="true"]');if(await selected.count()===0)break;if(await selected.first().getAttribute('id')===`game-${key}`)break;await selected.first().click();}const target=page.locator(`#game-${key}`);if(await target.getAttribute('aria-checked')!=='true')await target.click();await page.locator('#freestyleStart').click();await page.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(4400);}
async function framePacing(page,samples){const values=await page.evaluate(count=>new Promise(resolve=>{const out=[];let last=performance.now();const tick=now=>{out.push(now-last);last=now;out.length>=count?resolve(out):requestAnimationFrame(tick);};requestAnimationFrame(tick);}),samples);const sorted=values.slice(4).sort((a,b)=>a-b);return{samples:sorted.length,avgMs:+(sorted.reduce((a,b)=>a+b,0)/sorted.length).toFixed(2),p95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(2),maxMs:+Math.max(...sorted).toFixed(2)};}
async function state(page){return page.evaluate(()=>({athlete:window.__KICKLAB_DIRECTION_C__,stadium:window.__KICKLAB_STADIUM_AUDIT__,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,canvas3d:!!document.querySelector('#cv3')&&getComputedStyle(document.querySelector('#cv3')).display!=='none',canvas2d:getComputedStyle(document.querySelector('#cv')).display}));}
async function closeCamera(page){const focused=await page.evaluate(()=>window.__KICKLAB_DIRECTION_C_FOCUS__?.());if(!focused)throw new Error('Athlete close camera was unavailable');await page.waitForTimeout(250);}

for(const [viewport,width,height] of viewports){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'no-preference'}),page=await context.newPage();watch(page);await openKick(page);
  for(const [key,name] of activities){
    console.log(`qa ${viewport} ${key}`);await openActivity(page,key,name);await page.waitForFunction(expected=>window.__KICKLAB_DIRECTION_C__?.profile===expected&&/^ready/.test(window.__KICKLAB_DIRECTION_C__.status),key,{timeout:8000});const before=await state(page);await page.waitForTimeout(260);const after=await state(page);
    const expectedActivity=name;if(before.athlete.activity!==expectedActivity||!before.athlete.camera||!before.athlete.contactNode)throw new Error(`${viewport}/${name}: incomplete profile ${JSON.stringify(before.athlete)}`);
    if(before.athlete.contactDriftMm>budgets.contactDriftMm)throw new Error(`${viewport}/${name}: contact drift ${before.athlete.contactDriftMm} mm`);
    if(before.athlete.plantRequired&&before.athlete.plantGroundMm>budgets.plantGroundMm)throw new Error(`${viewport}/${name}: plant offset ${before.athlete.plantGroundMm} mm`);
    if(before.overflow!==0||!before.canvas3d)throw new Error(`${viewport}/${name}: renderer/overflow ${JSON.stringify(before)}`);
    const stadiumPasses=Object.values(before.stadium?.passes||{});if(stadiumPasses.length!==7||stadiumPasses.some(pass=>!pass))throw new Error(`${viewport}/${name}: stadium layers failed ${JSON.stringify(before.stadium)}`);
    if(JSON.stringify(before.stadium.boardOffsets)===JSON.stringify(after.stadium.boardOffsets))throw new Error(`${viewport}/${name}: animated boards did not advance`);
    const wide=join(outputDir,`${viewport}-${key}-wide.png`);await page.screenshot({path:wide,fullPage:true});captures.push(wide);audits.push({viewport,width,height,key,name,state:before,boardOffsetsAfter:after.stadium.boardOffsets});
    if(key==='free'||key==='run'){await closeCamera(page);const close=join(outputDir,`${viewport}-${key}-athlete-close.png`);await page.locator('.stage').screenshot({path:close});captures.push(close);await page.evaluate(()=>window.__KICKLAB_DIRECTION_C_WIDE__?.());}
  }
  pacing[viewport]=await framePacing(page,viewport==='desktop'?150:100);await context.close();
}

async function fallback(label,setup,urlParams,assertion){const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();if(label!=='webglFailure')watch(page);if(setup)await page.addInitScript(setup);await page.goto(urlFor(urlParams),{waitUntil:'networkidle'});await dismissProfile(page);await page.locator('#lab-tab-kick').click();await page.waitForTimeout(1000);const value=await page.evaluate(()=>({athlete:window.__KICKLAB_DIRECTION_C__,cv3:!!document.querySelector('#cv3'),canvas:getComputedStyle(document.querySelector('#cv')).display}));fallbacks[label]=value;if(!assertion(value))throw new Error(`${label} failed: ${JSON.stringify(value)}`);await context.close();}
await fallback('canvas',()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'})),{},s=>s.athlete.status==='canvas'&&!s.cv3&&s.canvas==='block');
await fallback('reducedQuality',null,{quality:'low'},s=>s.athlete.status==='reduced-quality'&&s.athlete.loads===0);
await fallback('webglFailure',()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:original.call(this,type,...args);};},{},s=>s.athlete.status==='webgl-unavailable'&&!s.cv3&&s.canvas==='block');
{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();watch(page);await page.goto(`${baseUrl}?qa=multi-activity-default-off`,{waitUntil:'networkidle'});const value=await page.evaluate(()=>window.__KICKLAB_DIRECTION_C__);fallbacks.defaultOff=value;if(value.enabled||value.status!=='flag-off'||value.loads!==0)throw new Error(`default-off failed: ${JSON.stringify(value)}`);await context.close();
}

const ordered=captures.filter(path=>/-wide\.png$|-athlete-close\.png$/.test(path));const video=join(outputDir,'kicklab-multi-activity-athlete-walkthrough.mp4');const args=['-y'];ordered.forEach(path=>args.push('-loop','1','-t','1.15','-i',path));const filters=ordered.map((_,i)=>`[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x071022,setsar=1,fps=30[v${i}]`);filters.push(`${ordered.map((_,i)=>`[v${i}]`).join('')}concat=n=${ordered.length}:v=1:a=0[outv]`);args.push('-filter_complex',filters.join(';'),'-map','[outv]','-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',video);execFileSync('ffmpeg',args,{stdio:'ignore'});
await browser.close();
const assetBytes=readFileSync(resolve('src/assets/3d/kicklab-direction-c-athlete/v2/kicklab-makehuman-athlete.glb')).byteLength,desktopP95=pacing.desktop.p95Ms,mobileP95=Math.max(pacing.tablet.p95Ms,pacing.mobile.p95Ms),first=audits[0].state.athlete;
const metrics={assetBytes,firstPlayBytes:first.firstPlayBytes,memoryProxyBytes:first.memoryProxyBytes,materials:first.materials,maxContactDriftMm:Math.max(...audits.map(a=>a.state.athlete.contactDriftMm||0)),maxRequiredPlantGroundMm:Math.max(...audits.filter(a=>a.state.athlete.profile!=='header'&&a.state.athlete.profile!=='gk').map(a=>a.state.athlete.plantGroundMm||0)),desktopP95Ms:desktopP95,mobileP95Ms:mobileP95,maxOverflowPx:Math.max(...audits.map(a=>a.state.overflow))};
const passes={allProfiles:audits.length===activities.length*viewports.length,asset:assetBytes<=budgets.assetBytes,firstPlay:metrics.firstPlayBytes<=budgets.firstPlayBytes,memory:metrics.memoryProxyBytes<=budgets.memoryProxyBytes,materials:metrics.materials<=budgets.materials,contact:metrics.maxContactDriftMm<=budgets.contactDriftMm,plant:metrics.maxRequiredPlantGroundMm<=budgets.plantGroundMm,desktopFrame:desktopP95<=budgets.desktopP95Ms,mobileFrame:mobileP95<=budgets.mobileP95Ms,overflow:metrics.maxOverflowPx===0,externalRequests:externalRequests.size===0,errors:errors.length===0,video:existsSync(video)};
const report={baseUrl,budgets,metrics,passes,fallbacks,framePacing:pacing,externalRequests:[...externalRequests],errors,audits,captures,video};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);writeFileSync(join(outputDir,'walkthrough-order.json'),`${JSON.stringify({secondsPerState:1.15,states:ordered.map(path=>path.split('/').pop().replace(/\.png$/,''))},null,2)}\n`);const failed=Object.entries(passes).filter(([,ok])=>!ok).map(([name])=>name);if(failed.length)throw new Error(`Multi-activity QA failed: ${failed.join(', ')} (${JSON.stringify(metrics)})`);console.log(JSON.stringify({ok:true,outputDir,metrics,passes,captures:captures.length,video},null,2));
