import {createRequire} from 'node:module';
import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:4173/kicklab.html';
const revision=process.argv[3];
if(!/^[0-9a-f]{40}$/.test(revision||''))throw Error('Pass the exact 40-character commit SHA');
const out=resolve('qa-artifacts/race-advanced-tier');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(x=>x&&existsSync(x)),args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const report={revision,clips:[],errors:[],external:[]};
try{
 for(const id of ['vesper','sable']){
  const size={width:1440,height:900};
  const context=await browser.newContext({viewport:size,recordVideo:{dir:out,size},reducedMotion:'no-preference'});
  await context.addInitScript(()=>{localStorage.setItem('impactlab.nick','QA Driver');localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',raceMastery:{version:1,cleared:['drag','drift','circuit']}}));});
  const page=await context.newPage(),recording=page.video(),url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceTelemetry','prototype');url.searchParams.set('racePreflight','prototype');url.searchParams.set('rev',revision);
  page.on('pageerror',e=>report.errors.push(`${id}: ${e.message}`));
  await page.route('**/*',route=>{const target=new URL(route.request().url());if(target.origin===url.origin||['blob:','data:'].includes(target.protocol))return route.continue();report.external.push(target.href);return route.abort();});
  try{
   await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
   if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
   if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
   await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
   await page.waitForFunction(()=>window.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,null,{timeout:20000});
   await page.locator('[data-preflight-mode="endurance"]').click();
   await page.click('#racePreflightNext');
   await page.locator(`[data-preflight-vehicle="${id}"]`).click();
   if(await page.locator(`[data-preflight-vehicle="${id}"]`).getAttribute('aria-pressed')!=='true')throw Error(`${id} preflight selection failed`);
   await page.click('#racePreflightNext');
   await page.click('#racePreflightNext');
   await page.click('#racePreflightNext');
   await page.waitForFunction(()=>!window.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,null,{timeout:12000});
   const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
   await page.waitForFunction(vehicle=>{const s=window.__KICKLAB_RACE_3D__;return s?.status==='rendering'&&s.vehicleId===vehicle&&s.vehicleAudit?.ok&&s.vehicle&&!s.canvasFallback;},id,{timeout:25000});
   await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:25000});
   const samples=[];
   const sample=async()=>samples.push(await page.evaluate(()=>{const s=window.__KICKLAB_RACE_3D__;return{vehicle:s?.vehicleId,status:s?.status,vehicleVisible:s?.vehicle,canvasFallback:s?.canvasFallback,state:s?.dynamics?.state,x:s?.dynamics?.x,track:s?.trackKey,asset:s?.assetUrl};}));
   await sample();await page.keyboard.down('Space');
   for(let n=0;n<5;n++){if(n===1||n===3)await page.keyboard.down(n===1?'ArrowLeft':'ArrowRight');await page.waitForTimeout(3000);if(n===1||n===3)await page.keyboard.up(n===1?'ArrowLeft':'ArrowRight');await sample();}
   await page.keyboard.up('Space');await page.waitForTimeout(800);await sample();
   if(samples.some(s=>s.vehicle!==id||s.status!=='rendering'||!s.vehicleVisible||s.canvasFallback))throw Error(`3D scene lost during ${id} run`);
   const row={id,url:url.toString(),samples};report.clips.push(row);
   await context.close();
   const source=await recording.path(),mp4=join(out,`advanced-gameplay-${id}-${revision.slice(0,12)}.mp4`);
   const encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-i',source,'-an','-vf','fps=30','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});if(encoded.status!==0)throw Error(encoded.stderr);
   const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw Error(probe.stderr);const meta=JSON.parse(probe.stdout);
   if(!meta.streams.some(s=>s.codec_name==='h264'&&s.width===1440&&s.height===900)||Number(meta.format.duration)<15||statSync(mp4).size<100000)throw Error(`${id} MP4 invalid`);
   row.mp4={path:mp4,duration:Number(meta.format.duration),bytes:statSync(mp4).size};
  }catch(e){report.errors.push(`${id}: ${e.stack||e}`);await context.close();break;}
 }
}finally{await browser.close();writeFileSync(join(out,'gameplay-video-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({revision,clips:report.clips.map(c=>({id:c.id,mp4:c.mp4,samples:c.samples.length,states:c.samples.map(s=>s.state)})),errors:report.errors,external:report.external},null,2));if(report.errors.length||report.external.length)process.exitCode=1;}
