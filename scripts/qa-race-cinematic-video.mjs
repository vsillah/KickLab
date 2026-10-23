import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5971/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-cinematic-video'),revision=process.argv[4];
if(!/^[0-9a-f]{40}$/.test(revision||''))throw Error('Pass the exact 40-character Git head as the third argument');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const report={revision,base,segments:[],errors:[],external:[],storage:[]},videos=[];
async function record(reduced){
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:out,size:{width:1440,height:1000}}});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
  const page=await context.newPage(),video=page.video(),url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceEngineQA','1');url.searchParams.set('rev',revision);
  page.on('pageerror',error=>report.errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).origin!==url.origin)report.external.push(request.url());});
  await page.goto(url.toString(),{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();await page.locator('#lab-tab-race').click();
  const skip=page.locator('.race-orbit-panel button');await skip.waitFor({state:'visible',timeout:5000}).catch(()=>{});if(await skip.isVisible())await skip.click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  await page.evaluate(()=>{window.__KICKLAB_RACE_ENGINE_QA__.run();window.__KICKLAB_RACE_ENGINE_QA__.holdPresentation(true);const stage=document.querySelector('.stage');window.scrollTo(0,stage.getBoundingClientRect().top+scrollY-12);const label=document.createElement('div');label.id='raceCinematicQaLabel';label.style.cssText='position:absolute;z-index:28;left:50%;top:6%;transform:translateX(-50%);max-width:72%;padding:9px 16px;border:1px solid #84d5dc;border-radius:999px;background:rgba(3,18,31,.94);color:#f2fcff;font:700 16px system-ui;letter-spacing:.025em;text-align:center;pointer-events:none';stage.appendChild(label);});
  async function hold(name,fixture,ms){await page.evaluate(({name,fixture})=>{document.querySelector('#raceCinematicQaLabel').textContent='QA · '+name;window.__KICKLAB_RACE_ENGINE_QA__.effect(fixture);},{name,fixture});report.segments.push({name,reduced,fixture,durationMs:ms});await page.waitForTimeout(ms);}
  if(!reduced){
    await hold('Load-linked exhaust','exhaust',1900);
    await hold('NOS ignition','nos-ignition',1000);
    await hold('NOS sustain','nos',1500);
    await page.evaluate(()=>{document.querySelector('#raceCinematicQaLabel').textContent='QA · NOS decay';window.__KICKLAB_RACE_ENGINE_QA__.endBoostPresentation();});report.segments.push({name:'NOS decay',reduced,durationMs:850});await page.waitForTimeout(850);
    for(const [name,fixture] of [['Rear-wheel launch peel-out','launch'],['Braking slip and road contact','brake'],['Controlled drift and road contact','drift']]){
      await page.evaluate(({name,fixture})=>{document.querySelector('#raceCinematicQaLabel').textContent='QA · '+name;window.__KICKLAB_RACE_ENGINE_QA__.effect(fixture);},{name,fixture});
      for(let i=0;i<9;i++){await page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.nudgePresentation(.72));await page.waitForTimeout(150);}
      report.segments.push({name,reduced,fixture,durationMs:1350});
    }
    await page.evaluate(()=>{document.querySelector('#raceCinematicQaLabel').textContent='QA · Skid marks fade';window.__KICKLAB_RACE_ENGINE_QA__.stopSlipPresentation();});report.segments.push({name:'Skid marks fade',reduced,durationMs:5600});await page.waitForTimeout(5600);
    await page.evaluate(()=>{document.querySelector('#raceCinematicQaLabel').textContent='QA · Critical heat';window.__KICKLAB_RACE_ENGINE_QA__.effect('exhaust');window.__KICKLAB_RACE_ENGINE_QA__.thermal(.94,true,'overheat');});report.segments.push({name:'Critical heat',reduced,durationMs:1700});await page.waitForTimeout(1700);
    await page.evaluate(()=>{document.querySelector('#raceCinematicQaLabel').textContent='QA · Cooling and recovery';window.__KICKLAB_RACE_ENGINE_QA__.thermal(.44,false,'recovered');});report.segments.push({name:'Cooling and recovery',reduced,durationMs:1400});await page.waitForTimeout(1400);
    for(const system of ['chassis','drivetrain','suspension','brakes','cooling'])await hold(`Success cutaway: ${system}`,`cutaway-${system}`,2300);
  }else{
    await hold('Reduced motion: hot engine','exhaust',1400);
    await hold('Reduced motion: active boost','nos',1400);
    await hold('Reduced motion: road-contact slip','drift',1500);
    for(const system of ['chassis','drivetrain','suspension','brakes','cooling'])await hold(`Reduced motion: ${system} cutaway`,`cutaway-${system}`,1500);
  }
  report.storage.push({reduced,keys:await page.evaluate(()=>Object.keys(localStorage).sort())});await page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.holdPresentation(false));await context.close();videos.push(await video.path());
}
try{await record(false);await record(true);}finally{await browser.close();}
if(report.errors.length||report.external.length||report.storage.some(row=>row.keys.some(key=>!['impactlab.v1','impactlab.nick','kicklab.profiles.v1'].includes(key))))throw Error(JSON.stringify(report));
const mp4=join(out,`race-cinematic-effects-${revision.slice(0,12)}.mp4`),result=spawnSync('ffmpeg',['-y','-i',videos[0],'-i',videos[1],'-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0,fps=30[out]','-map','[out]','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});
if(result.status!==0)throw Error(result.stderr.slice(-2500));
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});
if(probe.status!==0)throw Error(probe.stderr);const details=JSON.parse(probe.stdout),stream=details.streams.find(item=>item.codec_name==='h264');
if(!stream||stream.width!==1440||stream.height!==1000||Number(details.format.duration)<20||statSync(mp4).size<100000)throw Error('MP4 playback validation failed');
report.mp4=mp4;report.duration=Number(details.format.duration);report.bytes=statSync(mp4).size;writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({mp4,revision,duration:report.duration,bytes:report.bytes,errors:report.errors,external:report.external},null,2));
