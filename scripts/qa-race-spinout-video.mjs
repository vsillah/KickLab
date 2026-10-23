import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5971/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-spinout-video'),revision=process.argv[4],phone=process.argv[5]==='phone',width=phone?390:1440,height=phone?844:1000;
if(!/^[0-9a-f]{40}$/.test(revision||''))throw Error('Pass the exact 40-character Git head as the third argument');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const report={revision,base,width,height,segments:[],errors:[],external:[],storage:[]},videos=[];
async function record({reduced=false,canvas=false}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:out,size:{width,height}}});
  await context.addInitScript(gfx=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})),canvas?'2d':'3d');
  const page=await context.newPage(),video=page.video(),videoOrigin=Date.now(),url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceEngineQA','1');url.searchParams.set('rev',revision);
  page.on('pageerror',error=>report.errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).origin!==url.origin)report.external.push(request.url());});
  await page.goto(url.toString(),{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();await page.locator('#lab-tab-race').click();
  if(!canvas){const skip=page.locator('.race-orbit-panel button');await skip.waitFor({state:'visible',timeout:5000}).catch(()=>{});if(await skip.isVisible())await skip.click();}
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  await page.evaluate(({phone})=>{window.__KICKLAB_RACE_ENGINE_QA__.run();window.__KICKLAB_RACE_ENGINE_QA__.holdPresentation(true);const stage=document.querySelector('.stage');window.scrollTo(0,stage.getBoundingClientRect().top+scrollY-12);const label=document.createElement('div');label.id='raceSpinQaLabel';label.style.cssText=`position:absolute;z-index:28;left:50%;top:3%;transform:translateX(-50%);max-width:84%;padding:${phone?'6px 9px':'9px 16px'};border:1px solid #84d5dc;border-radius:999px;background:rgba(3,18,31,.94);color:#f2fcff;font:700 ${phone?'12px':'16px'} system-ui;letter-spacing:.015em;text-align:center;pointer-events:none`;stage.appendChild(label);},{phone});
  if(phone&&await page.locator('#controllerCollapseButton').getAttribute('aria-expanded')==='false')await page.locator('#controllerCollapseButton').click();
  const trimStart=Math.max(0,(Date.now()-videoOrigin)/1000-.3);
  async function hold(name,fixture,ms){const audit=await page.evaluate(({name,fixture})=>{document.querySelector('#raceSpinQaLabel').textContent=name;return window.__KICKLAB_RACE_ENGINE_QA__.effect(fixture);},{name,fixture});report.segments.push({name,fixture,reduced,canvas,durationMs:ms,fx:audit.fx,spin:audit.spin});await page.waitForTimeout(ms);}
  if(canvas){
    await page.evaluate(()=>{document.querySelector('#raceSpinQaLabel').textContent='Canvas fallback · tire contact';window.__KICKLAB_RACE_ENGINE_QA__.effect('spinout');});
    for(let i=0;i<15;i++){await page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.nudgePresentation(.35));await page.waitForTimeout(140);}
    const audit=await page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.tireAudit());report.segments.push({name:'Canvas fallback · tire contact',fixture:'spinout',canvas:true,durationMs:2100,canvasTires:audit.canvasTires});
    await page.waitForTimeout(900);
  }else if(reduced){await hold('Reduced motion · symbolic grip loss','spinout',2200);await page.evaluate(()=>{document.querySelector('#raceSpinQaLabel').textContent='Reduced motion · grip restored';window.__KICKLAB_RACE_ENGINE_QA__.recoverSpinPresentation();});await page.waitForTimeout(1400);}
  else{
    for(const [name,fixture] of [['Launch · rear tire peel-out','launch'],['Hard braking · locked tires','brake-lock'],['Controlled drift · rear tire slip','drift'],['Spinout · countersteer and contact','spinout']])await hold(name,fixture,2000);
    const recovery=await page.evaluate(()=>{document.querySelector('#raceSpinQaLabel').textContent='Recovery · grip returns';return window.__KICKLAB_RACE_ENGINE_QA__.recoverSpinPresentation();});report.segments.push({name:'Recovery · grip returns',durationMs:2000,spin:recovery.spin});await page.waitForTimeout(2000);
  }
  report.storage.push({reduced,canvas,keys:await page.evaluate(()=>Object.keys(localStorage).sort())});await page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.holdPresentation(false));await context.close();videos.push({path:await video.path(),trimStart});
}
try{await record();await record({reduced:true});await record({canvas:true});}finally{await browser.close();}
if(report.errors.length||report.external.length||report.storage.some(row=>row.keys.some(key=>!['impactlab.v1','impactlab.nick','kicklab.profiles.v1'].includes(key)))||report.segments.some(row=>row.fx&&['launch','brake-lock','drift','spinout'].includes(row.fixture)&&row.fx.tireEvent!==row.fixture)||report.segments.some(row=>row.canvas&&(!row.canvasTires||row.canvasTires.marks<2)))throw Error(JSON.stringify(report));
const mp4=join(out,`race-spinout-${revision.slice(0,12)}${phone?'-phone':''}.mp4`),inputs=videos.flatMap(item=>['-ss',item.trimStart.toFixed(3),'-i',item.path]),result=spawnSync('ffmpeg',['-y',...inputs,'-filter_complex','[0:v][1:v][2:v]concat=n=3:v=1:a=0,fps=30[out]','-map','[out]','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});
if(result.status!==0)throw Error(result.stderr.slice(-2500));
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});
if(probe.status!==0)throw Error(probe.stderr);const details=JSON.parse(probe.stdout),stream=details.streams.find(item=>item.codec_name==='h264');
if(!stream||stream.width!==width||stream.height!==height||Number(details.format.duration)<13||statSync(mp4).size<100000)throw Error('MP4 playback validation failed');
report.mp4=mp4;report.duration=Number(details.format.duration);report.bytes=statSync(mp4).size;report.trims=videos.map(item=>item.trimStart);writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({mp4,revision,duration:report.duration,bytes:report.bytes,trims:report.trims,errors:report.errors,external:report.external},null,2));
