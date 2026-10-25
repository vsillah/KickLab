import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5971/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-effects-contracts-video'),revision=process.argv[4];
if(!/^[0-9a-f]{40}$/.test(revision||''))throw Error('Pass the exact 40-character Git head');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const report={revision,segments:[],errors:[],external:[],videos:[]};
async function capture(width,height){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:{dir:out,size:{width,height}}});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
  const page=await context.newPage(),video=page.video(),url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceEngineQA','1');url.searchParams.set('rev',revision);
  page.on('pageerror',error=>report.errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).origin!==url.origin)report.external.push(request.url());});
  await page.goto(url.toString(),{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();await page.locator('#lab-tab-race').click();const skip=page.locator('.race-orbit-panel button');await skip.waitFor({state:'visible',timeout:5000}).catch(()=>{});if(await skip.isVisible())await skip.click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});await page.evaluate(()=>{window.__KICKLAB_RACE_ENGINE_QA__.select('drag','cobalt');window.__KICKLAB_RACE_ENGINE_QA__.holdPresentation(true);window.__KICKLAB_RACE_ENGINE_QA__.run();});await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_FX__?.vehicle==='cobalt',{timeout:15000});
  await page.evaluate(()=>{const stage=document.querySelector('.stage');window.scrollTo(0,stage.getBoundingClientRect().top+scrollY-8);const label=document.createElement('div');label.id='raceContractLabel';label.style.cssText='position:absolute;z-index:28;left:2%;top:3%;padding:7px 12px;border:1px solid #84d5dc;border-radius:99px;background:rgba(3,18,31,.92);color:#f2fcff;font:700 14px system-ui;letter-spacing:.02em;pointer-events:none';stage.appendChild(label);});
  for(const [fixture,label,ms] of [['nos','NOS · delivered',1900],['nos-no-drain','NOS · no tank drain',1400],['nos-no-traction','NOS · no grip',1400],['launch','Launch · peel-out',2000],['launch-ordinary','Ordinary acceleration',1500],['launch-expired','Launch window missed',1500],['shift-perfect','Perfect paddle shift',2400],['shift-early','Early shift',1500],['shift-ordinary','Ordinary shift',1500]]){
    const row=await page.evaluate(({fixture,label})=>{document.querySelector('#raceContractLabel').textContent=label;return window.__KICKLAB_RACE_ENGINE_QA__.effect(fixture);},{fixture,label});
    report.segments.push({width,fixture,label,ms,reason:row.fx?.audit,renderer:row.renderer});await page.waitForTimeout(ms);
  }
  if(report.segments.filter(row=>row.width===width).some(row=>row.renderer!=='rendering'))report.errors.push(`${width}: renderer not ready`);
  await context.close();const source=await video.path(),mp4=join(out,`race-effects-contracts-${revision.slice(0,12)}-${width}.mp4`),sourceProbe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',source],{encoding:'utf8'});if(sourceProbe.status!==0)throw Error(sourceProbe.stderr);
  const segmentSeconds=report.segments.filter(row=>row.width===width).reduce((sum,row)=>sum+row.ms/1000,0),sourceSeconds=Number(JSON.parse(sourceProbe.stdout).format.duration),trim=Math.max(0,sourceSeconds-segmentSeconds-.2);
  const encode=spawnSync('ffmpeg',['-y','-ss',trim.toFixed(3),'-i',source,'-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});if(encode.status!==0)throw Error(encode.stderr.slice(-2000));
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw Error(probe.stderr);const details=JSON.parse(probe.stdout),stream=details.streams.find(item=>item.codec_name==='h264');if(!stream||stream.width!==width||stream.height!==height||Number(details.format.duration)<12||statSync(mp4).size<100000)throw Error('MP4 validation failed');report.videos.push({path:mp4,duration:Number(details.format.duration),bytes:statSync(mp4).size,trimmedSetupSeconds:trim});
}
try{await capture(390,844);await capture(1440,1000);}catch(error){report.errors.push(error.stack||String(error));}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({videos:report.videos,errors:report.errors,external:[...new Set(report.external)]},null,2));if(report.errors.length||report.external.length)process.exitCode=1;
