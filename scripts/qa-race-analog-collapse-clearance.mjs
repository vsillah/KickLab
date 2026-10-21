import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url),{chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4389/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/race-analog-collapse-clearance');
const revision=process.argv[4]||'working-tree';
mkdirSync(outputDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found');
const browser=await chromium.launch({headless:true,executablePath});
const report={revision,baseUrl,checks:[],screenshots:[],errors:[],externalRequests:[]};
const localOrigin=new URL(baseUrl).origin;
function watch(page){page.on('pageerror',error=>report.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});page.on('request',request=>{if(new URL(request.url()).origin!==localOrigin)report.externalRequests.push(request.url());});}
async function enter(page,label,params=''){
  watch(page);await page.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
  await page.goto(`${baseUrl}?qa=race-analog-clearance&rev=${encodeURIComponent(revision)}&view=${label}${params}`,{waitUntil:'networkidle'});
  if(await page.locator('#profileDialog').isVisible())await page.getByRole('button',{name:'Close profiles'}).click();
  await page.getByRole('button',{name:/^Race .*Enter Race$/}).click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:12000});
}
async function activate(page,selector,input){
  const target=page.locator(selector);await target.scrollIntoViewIfNeeded();
  if(input==='keyboard'){await target.focus();await page.keyboard.press('Enter');}
  else if(input==='touch'){const b=await target.boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
  else await target.click();
  await page.waitForTimeout(100);
}
async function state(page,label,style,collapsed){
  const s=await page.evaluate(()=>{
    const deck=document.querySelector('.control-deck'),stage=document.querySelector('.stage'),touch=document.querySelector('#touchController'),head=document.querySelector('.floating-control-head');
    const rect=e=>e.getBoundingClientRect().toJSON(),hit=e=>{const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,top=document.elementFromPoint(x,y);return top===e||e.contains(top);};
    const buttons=['#classicControlsButton','#analogControlsButton','#controllerCollapseButton'].map(id=>{const e=document.querySelector(id),r=rect(e);return{id,rect:r,hit:hit(e)};});
    const d=rect(deck),st=rect(stage),t=rect(touch),h=rect(head);
    const style=getComputedStyle(deck);return{mode:document.documentElement.dataset.kicklabMode,collapsed:deck.classList.contains('controller-collapsed'),analog:deck.classList.contains('prototype-active'),expanded:document.querySelector('#controllerCollapseButton').getAttribute('aria-expanded'),touchHidden:touch.hidden,buttons,geometry:{deck:d,stage:st,touch:t,head:h,headTouchGap:t.top-h.bottom,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth},material:{background:style.backgroundImage,filter:style.backdropFilter||style.webkitBackdropFilter},storage:{nick:localStorage.getItem('impactlab.nick'),progress:!!localStorage.getItem('impactlab.v1')}};
  });
  if(s.mode!=='race'||s.collapsed!==collapsed||s.analog!==(style==='Analog')||s.expanded!==String(!collapsed)||s.touchHidden!==(style==='Classic')||s.buttons.some(b=>!b.hit)||s.buttons.some(b=>b.rect.width<43.5||b.rect.height<43.5)||s.geometry.stage.height<739||s.geometry.overflow>1||s.material.filter!=='none'||s.storage.nick!=='QA Player'||!s.storage.progress)throw new Error(`${label}: ${JSON.stringify(s)}`);
  if(!collapsed&&style==='Analog'&&page.viewportSize().width>480&&s.geometry.headTouchGap<7)throw new Error(`${label}: header and gesture panel overlap ${JSON.stringify(s.geometry)}`);
  report.checks.push({label,style,collapsed,buttons:s.buttons,geometry:s.geometry,material:s.material,storage:s.storage});return s;
}
async function shot(page,label){const path=join(outputDir,`${label}.png`);await page.screenshot({path,fullPage:true});report.screenshots.push(path);}
async function frameAudit(page,label,width){const samples=await page.evaluate(()=>new Promise(resolve=>{let last=performance.now(),deltas=[];const tick=now=>{deltas.push(now-last);last=now;if(deltas.length<34)requestAnimationFrame(tick);else resolve(deltas.slice(2).sort((a,b)=>a-b));};requestAnimationFrame(tick);}));const p95=samples[Math.floor(samples.length*.95)],budget=width<=480?45:28;if(p95>budget)throw new Error(`${label}: frame p95 ${p95.toFixed(2)}ms exceeds ${budget}ms`);report.checks.push({label:`${label}-frame-pacing`,p95Ms:+p95.toFixed(2),budgetMs:budget});}
const sizes=[[360,780],[390,844],[768,1024],[1113,988],[1440,1000]];
for(const [width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:true});
  const page=await context.newPage(),tag=`${width}x${height}`;await enter(page,tag);
  if(width<=480)await activate(page,'#controllerCollapseButton','touch');
  await state(page,`${tag}-classic-expanded`,'Classic',false);await shot(page,`${tag}-classic-expanded`);
  await activate(page,'#analogControlsButton','pointer');await state(page,`${tag}-analog-expanded`,'Analog',false);await shot(page,`${tag}-analog-expanded`);
  await activate(page,'#controllerCollapseButton','touch');await state(page,`${tag}-analog-collapsed`,'Analog',true);await shot(page,`${tag}-analog-collapsed`);
  await activate(page,'#controllerCollapseButton','keyboard');await state(page,`${tag}-analog-reexpanded`,'Analog',false);
  await activate(page,'#classicControlsButton','touch');await state(page,`${tag}-classic-reexpanded`,'Classic',false);
  await activate(page,'#controllerCollapseButton','pointer');await state(page,`${tag}-classic-collapsed`,'Classic',true);await shot(page,`${tag}-classic-collapsed`);
  await activate(page,'#controllerCollapseButton','keyboard');await state(page,`${tag}-classic-keyboard-expanded`,'Classic',false);
  await activate(page,'#analogControlsButton','keyboard');await state(page,`${tag}-analog-keyboard-expanded`,'Analog',false);
  await frameAudit(page,tag,width);
  await context.close();
}
for(const [flag,params] of [['telemetry','&raceTelemetry=prototype'],['corner-trace','&raceCornerTrace=prototype']]){
  for(const [width,height] of [[768,1024],[1113,988]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:true});
    const page=await context.newPage(),tag=`${flag}-${width}x${height}`;await enter(page,tag,params);
    await activate(page,'#analogControlsButton','pointer');await state(page,`${tag}-analog-expanded`,'Analog',false);await shot(page,`${tag}-analog-expanded`);
    await activate(page,'#controllerCollapseButton','touch');await state(page,`${tag}-analog-collapsed`,'Analog',true);
    await activate(page,'#controllerCollapseButton','keyboard');await state(page,`${tag}-analog-reexpanded`,'Analog',false);
    await context.close();
  }
}
for(const [label,options,params] of [['reduced-motion',{reducedMotion:'reduce'},''],['canvas-fallback',{},'&fallback=canvas']]){
  const context=await browser.newContext({viewport:{width:768,height:1024},deviceScaleFactor:1,hasTouch:true,...options});
  const page=await context.newPage();await enter(page,label,params);await activate(page,'#analogControlsButton','keyboard');await state(page,`${label}-analog-expanded`,'Analog',false);if(label==='canvas-fallback'){const canvas=await page.evaluate(()=>({race3:!!document.querySelector('#race3'),display:getComputedStyle(document.querySelector('#cv')).display}));if(canvas.race3||canvas.display!=='block')throw new Error(`Canvas fallback failed: ${JSON.stringify(canvas)}`);report.checks.push({label:'canvas-fallback-renderer',canvas});}if(label==='reduced-motion'){const motion=await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);if(!motion)throw new Error('Reduced motion preference unavailable');report.checks.push({label:'reduced-motion-preference',motion});}await activate(page,'#controllerCollapseButton','touch');await state(page,`${label}-analog-collapsed`,'Analog',true);await context.close();
}
const videoContext=await browser.newContext({viewport:{width:768,height:1024},deviceScaleFactor:1,hasTouch:true,recordVideo:{dir:outputDir,size:{width:768,height:1024}}});
const videoPage=await videoContext.newPage();await enter(videoPage,'tablet-walkthrough');await videoPage.waitForTimeout(500);await activate(videoPage,'#analogControlsButton','pointer');await videoPage.waitForTimeout(800);await activate(videoPage,'#controllerCollapseButton','touch');await videoPage.waitForTimeout(600);await activate(videoPage,'#controllerCollapseButton','keyboard');await videoPage.waitForTimeout(600);await activate(videoPage,'#classicControlsButton','touch');await videoPage.waitForTimeout(600);
const rawVideo=videoPage.video();await videoPage.close();await videoContext.close();const rawPath=await rawVideo.path();
const mp4=join(outputDir,'race-analog-collapse-clearance.mp4');const ffmpeg=spawnSync('ffmpeg',['-y','-i',rawPath,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(ffmpeg.status!==0)throw new Error(ffmpeg.stderr);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(probe.stderr);const info=JSON.parse(probe.stdout);if(statSync(mp4).size<100_000||Number(info.format?.duration)<3||info.streams?.[0]?.codec_name!=='h264')throw new Error(`Video invalid: ${JSON.stringify(info)}`);report.video={path:mp4,bytes:statSync(mp4).size,info};
await browser.close();report.externalRequests=[...new Set(report.externalRequests)];if(report.errors.length||report.externalRequests.length)throw new Error(`Browser failures: ${JSON.stringify({errors:report.errors,externalRequests:report.externalRequests})}`);
writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify({checks:report.checks.length,screenshots:report.screenshots.length,video:report.video,errors:report.errors,externalRequests:report.externalRequests}));
