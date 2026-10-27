import {existsSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2],out=resolve(process.argv[3]||'qa-artifacts/race-guardrail'),revision=process.argv[4];
if(!base||!/^[0-9a-f]{40}$/.test(revision||''))throw Error('Pass localhost URL, output folder and exact 40-character head');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(Boolean)});
const report={revision,base,runs:[],errors:[],external:[]};
async function run(width,height,{reduced=false,canvas=false,video=false,vehicle='cobalt'}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',...(video?{recordVideo:{dir:out,size:{width,height}}}:{})});
  await context.addInitScript(gfx=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})),canvas?'2d':'3d');
  const page=await context.newPage(),recording=video?page.video():null,url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',revision);
  page.on('pageerror',error=>report.errors.push(`${width}: ${error.message}`));page.on('request',request=>{if(new URL(request.url()).origin!==url.origin)report.external.push(request.url());});
  await page.goto(url.toString(),{waitUntil:'networkidle'});
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();
  if(!canvas){const skip=page.locator('.race-orbit-panel button');await skip.waitFor({state:'visible',timeout:6000}).catch(()=>{});if(await skip.isVisible())await skip.click();}
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:20000});
  if(vehicle!=='cobalt'){if(await page.locator('#raceCoachSetupGarage').isVisible())await page.locator('#raceCoachSetupGarage').click();else{await page.locator('#racePhoneToolsToggle').click();await page.locator('#raceToolsGarage').click();}await page.locator(`#raceGarage [data-garage-part="body"][data-garage-value="${{kestrel:'kart',aegis:'race'}[vehicle]}"]`).click();await page.locator('#settingsClose').click();if(await page.locator('#racePhoneToolsToggle').getAttribute('aria-expanded')==='true')await page.locator('#racePhoneToolsToggle').click();const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:20000});}
  if(!canvas)await page.waitForFunction(expected=>{const race=window.__KICKLAB_RACE_3D__;return race?.status==='rendering'&&race.vehicle===true&&race.vehicleId===expected&&race.orbit?.done===true&&race.dynamics?.state==='grid'&&!document.querySelector('#raceCoachSetupStart')?.hidden;},vehicle,{timeout:20000});
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('.stage').getBoundingClientRect().top+scrollY-12));
  const startedAt=Date.now();
  await page.locator('#raceCoachSetupStart').click();
  if(canvas)await page.waitForTimeout(3000);
  else await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:12000});
  await page.keyboard.down('Space');await page.waitForTimeout(3400);await page.keyboard.up('Space');
  const clean=await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.guardrail||null);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(1400);await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(750);
  const contact=await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.guardrail||null);
  const screenshot=join(out,`race-guardrail-${revision.slice(0,12)}-${vehicle}-${width}${canvas?'-canvas':''}${reduced?'-reduced':''}.png`);await page.locator('.stage').screenshot({path:screenshot});
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(800);await page.keyboard.up('ArrowLeft');await page.waitForTimeout(450);
  const end=await page.evaluate(()=>({audit:window.__KICKLAB_RACE_3D__?.guardrail||null,dynamics:window.__KICKLAB_RACE_3D__?.dynamics||null,storage:Object.keys(localStorage).sort(),canvasVisible:document.querySelector('#cv')?.offsetParent!==null}));
  const endedAt=Date.now();
  const row={width,height,reduced,canvas,vehicle,url:url.toString(),clean,contact,end,screenshot};
  await context.close();
  if(recording){const source=await recording.path(),mp4=join(out,`race-guardrail-${revision.slice(0,12)}.mp4`),sourceProbe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',source],{encoding:'utf8'});if(sourceProbe.status!==0)throw Error(sourceProbe.stderr);const sourceDuration=Number(JSON.parse(sourceProbe.stdout).format.duration),trim=Math.max(0,sourceDuration-(endedAt-startedAt)/1000-.5),encoded=spawnSync('ffmpeg',['-y','-ss',trim.toFixed(3),'-i',source,'-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});if(encoded.status!==0)throw Error(encoded.stderr.slice(-1500));const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw Error(probe.stderr);const meta=JSON.parse(probe.stdout);if(!meta.streams.some(x=>x.codec_name==='h264'&&x.width===width&&x.height===height)||Number(meta.format.duration)<6||statSync(mp4).size<100000)throw Error('MP4 validation failed');row.mp4={path:mp4,duration:Number(meta.format.duration),bytes:statSync(mp4).size,trim};}
  if(!canvas&&(!contact||contact.contacts<1))report.errors.push(`${width}: no real rail contact`);
  if(!canvas&&contact?.recoveries>1)report.errors.push(`${width}: repeated recovery`);
  if(end.storage.some(key=>!['impactlab.v1','impactlab.nick','kicklab.profiles.v1'].includes(key)))report.errors.push(`${width}: unexpected storage key`);
  report.runs.push(row);
}
try{if(process.env.QA_ONLY==='canvas')await run(390,844,{canvas:true});else if(process.env.QA_ONLY==='roster'){await run(1440,900,{vehicle:'kestrel'});await run(1440,900,{vehicle:'aegis'});}else{await run(1440,900,{video:true});for(const [w,h] of [[390,844],[768,1024],[1024,768]])await run(w,h);await run(390,844,{reduced:true});await run(390,844,{canvas:true});await run(1440,900,{vehicle:'kestrel'});await run(1440,900,{vehicle:'aegis'});}}catch(error){report.errors.push(error.stack||String(error));}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({revision,runs:report.runs.map(({width,reduced,canvas,contact,mp4})=>({width,reduced,canvas,contact,mp4})),errors:report.errors,external:report.external},null,2));if(report.errors.length||report.external.length)process.exitCode=1;
