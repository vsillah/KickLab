// Reproducible, local-only capture of actual Race courses and catalog cars.
// Serve a fresh `dist` build locally, then run with NODE_PATH pointing to Playwright.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.KICKLAB_CAPTURE_ORIGIN||'http://127.0.0.1:4173';
const kind=process.env.KICKLAB_CAPTURE_KIND==='arrival'?'arrival':'drive';
const venueCapture=process.env.KICKLAB_CAPTURE_VENUES==='1';
const target=resolve('src/media/race-preflight');
const scratch=resolve('qa-artifacts/race-preflight/capture-source');
mkdirSync(target,{recursive:true});mkdirSync(scratch,{recursive:true});
const browser=await chromium.launch({headless:process.env.KICKLAB_CAPTURE_HEADFUL!=='1',executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:process.env.KICKLAB_CAPTURE_HEADFUL==='1'?['--enable-webgl']:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:960,height:610},acceptDownloads:true,reducedMotion:'no-preference'});
const page=await context.newPage();
const errors=[],external=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
const manifestPath=join(target,venueCapture?kind==='arrival'?'venue-arrival-manifest.json':'venue-manifest.json':kind==='arrival'?'arrival-manifest.json':'manifest.json');
const previous=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):null;
const manifest={source:'KickLab local Race 3D renderer',...(venueCapture?{commercialReleaseDisposition:'hold: verify capture rights from every rendered input under the Phase 2 rights gate'}:{}),kind,origin:base,captureFlag:'racePreflightCapture=1',venueCapture,durationTargetSeconds:5.2,entries:previous?.entries||[]};
const vehicles=process.env.KICKLAB_CAPTURE_VEHICLES?.split(',').filter(Boolean)||['kestrel','cobalt','aegis'];
try{
  await page.goto(`${base}/kicklab.html?raceExpansion=prototype&raceTelemetry=prototype&racePreflight=prototype&racePreflightCapture=1`,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');
  await page.waitForTimeout(1800);
  for(const mode of venueCapture?['marine','forest']:['drag','drift','circuit','hill','endurance'])for(const vehicle of vehicles){
    const id=`${mode}-${vehicle}`;
    if(process.env.KICKLAB_CAPTURE_ONLY&&process.env.KICKLAB_CAPTURE_ONLY!==id)continue;
    const selected=await page.evaluate(({mode,vehicle})=>window.__KICKLAB_RACE_PREFLIGHT_CAPTURE__?.select(mode,vehicle),{mode,vehicle});
    if(!selected)throw Error(`Cannot select ${id}`);
    await page.waitForFunction(()=>window.__KICKLAB_RACE_PREFLIGHT_CAPTURE__?.ready(),{timeout:20000});
    const capture=page.evaluate(async ({id,kind})=>{
      const hook=window.__KICKLAB_RACE_PREFLIGHT_CAPTURE__,canvas=window.__KICKLAB_RACE_VIDEO__?.source();
      if(!canvas)throw new Error('Clean 3D Race video source is unavailable');
      const stream=canvas.captureStream(24),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:1200000}),chunks=[];
      recorder.ondataavailable=event=>chunks.push(event.data);
      const stopped=new Promise(resolve=>recorder.onstop=resolve);
      const binding=hook[kind==='arrival'?'arrive':'drive']();recorder.start();
      await new Promise(resolve=>setTimeout(resolve,5400));
      recorder.stop();await stopped;stream.getTracks().forEach(track=>track.stop());
      const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));link.download=`${id}.webm`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
      hook.stop();return binding;
    },{id:`${kind}-${id}`,kind});
    const [download,binding]=await Promise.all([page.waitForEvent('download',{timeout:30000}),capture]);
    const raw=join(scratch,`${kind}-${id}.webm`);await download.saveAs(raw);
    const stem=`${venueCapture?'venue-':''}${kind==='arrival'?'arrival-':''}${id}`,output=join(target,`${stem}.mp4`),poster=join(target,`${stem}.jpg`);
    execFileSync('ffmpeg',['-y','-i',raw,'-an','-vf','scale=720:-2:flags=lanczos,fps=24','-c:v','libx264','-preset','medium','-crf','27','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:'ignore'});
    execFileSync('ffmpeg',['-y','-ss','0.6','-i',output,'-frames:v','1','-vf','scale=720:-2:flags=lanczos','-q:v','3',poster],{stdio:'ignore'});
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_entries','format=duration,size:stream=width,height,nb_read_frames','-of','json',raw],{encoding:'utf8'}));
    const duration=Number(probe.format?.duration),frames=Number(probe.streams?.[0]?.nb_read_frames);
    if(duration<4||frames<28||!binding.track.includes(venueCapture?'legacy':mode==='endurance'?'endurance':({drag:'straight',drift:'drift',circuit:'oval',hill:'bend'})[mode])||venueCapture&&!binding.track.includes(mode)||!binding.asset.includes(vehicle==='cobalt'?'direction-a':vehicle))throw Error(`${id} failed source gate: ${JSON.stringify({duration,frames,binding})}`);
    const sha256=createHash('sha256').update(readFileSync(output)).digest('hex');
    manifest.entries=manifest.entries.filter(entry=>entry.mode!==mode||entry.vehicle!==vehicle);
    manifest.entries.push({mode,vehicle,course:binding.track,asset:binding.asset,video:`media/race-preflight/${stem}.mp4`,poster:`media/race-preflight/${stem}.jpg`,duration:Number(duration.toFixed(2)),sourceFrames:frames,bytes:readFileSync(output).length,posterSha256:createHash('sha256').update(readFileSync(poster)).digest('hex'),sha256});
    console.log(`${stem}: ${duration.toFixed(2)} s, ${frames} source frames, ${Math.round(readFileSync(output).length/1024)} KiB`);
    rmSync(raw);
  }
  if(external.length||errors.length)throw Error(JSON.stringify({external,errors}));
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  console.log(`Captured ${manifest.entries.length} local pairings`);
}finally{await context.close();await browser.close();}
