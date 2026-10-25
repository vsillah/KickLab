import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5897/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/signature-finishes'),head=process.argv[4]||'working';
mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const report={head,base,cases:[],errors:[],external:[]};
const read=page=>page.evaluate(()=>{const race=window.__KICKLAB_RACE_3D__,mode=window.__KICKLAB_RACE_MODES_QA__?.state?.();return{race,mode,dynamics:race?.dynamics||{state:mode?.phase,x:mode?.x,v:(mode?.speedKmh||0)/3.6},signature:race?.signatureFinish,result:mode?.reviewSettled||document.querySelector('#racts')?.hidden===false};});
async function run({name,vehicle='kestrel',width=390,height=844,reduced=false,canvas=false,kind='power-stop',mode='drag',autopilot=false}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:out,size:{width,height}}});
 await context.addInitScript(({canvas})=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:canvas?'2d':'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})),{canvas});
 const page=await context.newPage(),video=page.video(),url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceFinishes','prototype');url.searchParams.set('rev',head);
 page.on('pageerror',e=>report.errors.push(`${name}: ${e.stack}`));page.on('request',request=>{if(new URL(request.url()).origin!==url.origin)report.external.push(`${name}: ${request.url()}`);});
 let start=Date.now();const snapshots=[];
 try{
  await page.goto(url.toString(),{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();await page.locator('#lab-tab-race').click();
  if(!canvas){const orbit=page.locator('.race-orbit-panel button');await orbit.waitFor({state:'visible',timeout:10000});await orbit.click();}
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:20000});
  await page.locator('#raceCoachSetupGarage').click();if(mode!=='drag')await page.locator(`#raceGarage [data-race-mode="${mode}"]`).click();const body={kestrel:'kart',cobalt:'street',aegis:'race'}[vehicle];await page.locator(`#raceGarage [data-garage-part="body"][data-garage-value="${body}"]`).click();await page.locator('#settingsClose').click();if(autopilot)await page.locator('#raceCoachSetupSteering').click();
  await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state?.()?.phase==='run',null,{timeout:12000});start=Date.now();await page.keyboard.down('Space');
  const top={kestrel:51,cobalt:55,aegis:53}[vehicle];let gear=1,finish=null,peak=null,steering=false,handbraking=false,gasHeld=true,brakeHeld=false;
  for(let i=0;i<(mode==='drift'?1100:mode==='hill'?550:380);i++){
   await page.waitForTimeout(45);const v=await read(page);const d=v.dynamics;if(!d)continue;
   if(i%15===0||v.signature?.phase==='cinematic')snapshots.push({t:Date.now()-start,x:d.x,speed:d.v,gear:v.mode?.gear,state:d.state,signature:v.signature});
   if(mode!=='drag'&&d.state==='run'){const limit=mode==='drift'?10.5:15,wantGas=d.v<limit,wantBrake=d.v>limit+1;if(wantGas!==gasHeld){if(wantGas)await page.keyboard.down('Space');else await page.keyboard.up('Space');gasHeld=wantGas;}if(wantBrake!==brakeHeld){if(wantBrake)await page.keyboard.down('b');else await page.keyboard.up('b');brakeHeld=wantBrake;}}
   if(mode==='drag'&&!canvas&&gear<4&&d.v/top>=[.25,.47,.71][gear-1]){await page.locator('#raceTelemetryShift').click();gear++;}
   if(kind==='precision-hero'&&d.x>229&&d.state==='run')await page.keyboard.up('Space');if(kind==='handbrake-360'&&d.state==='run'){if(!steering&&d.x>211){await page.keyboard.down('ArrowRight');steering=true;}if(!handbraking&&d.x>226){await page.keyboard.down('Shift');handbraking=true;}}
   if(d.state==='done'){finish=v;if(kind==='power-stop')await page.keyboard.down('b');break;}if(d.state==='crashed')throw new Error(`crashed at ${d.x.toFixed(1)}m`);
  }
  if(!finish)throw new Error(`no finish: ${JSON.stringify((await read(page)).race?.dynamics)}`);
  const post=[];for(let j=0;j<(reduced?32:44);j++){await page.waitForTimeout(100);const state=await read(page);post.push({t:Date.now()-start,phase:state.signature?.phase,kind:state.signature?.kind,pose:state.signature?.pose,vehicle:state.race?.vehicleId||state.mode?.car,result:state.result});}await page.keyboard.up('b').catch(()=>{});await page.keyboard.up('Space').catch(()=>{});const end=await read(page);
  const row={name,vehicle,width,height,reduced,canvas,kind,mode,autopilot,url:url.toString(),top,gear,finish:finish.signature,end:end.signature,result:end.result,selected:end.race?.vehicleId||end.mode?.car,venue:end.race?.venue,storage:await page.evaluate(()=>Object.keys(localStorage).sort()),snapshots,post};
  if(!canvas&&kind!=='none'&&!post.some(item=>item.phase==='cinematic'))report.errors.push(`${name}: cinematic never rendered`);if(!canvas&&kind==='power-stop'&&finish.signature?.phase!=='await-brake'&&finish.signature?.phase!=='cinematic')report.errors.push(`${name}: power stop did not arm: ${JSON.stringify(finish.signature)}`);
  if(!canvas&&kind==='handbrake-360'&&finish.signature?.kind!=='handbrake-360')report.errors.push(`${name}: 360 not earned: ${JSON.stringify(finish.signature)}`);
  if(!canvas&&kind==='precision-hero'&&finish.signature?.kind!=='precision-hero')report.errors.push(`${name}: hero not earned: ${JSON.stringify(finish.signature)}`);
  if((end.race?.vehicleId||end.mode?.car)!==vehicle)report.errors.push(`${name}: wrong car ${end.race?.vehicleId}`);
  if(!row.storage.every(key=>['impactlab.nick','impactlab.v1','kicklab.profiles.v1'].includes(key)))report.errors.push(`${name}: new storage key ${row.storage.join(',')}`);if(!end.result)report.errors.push(`${name}: result absent`);
  await context.close();const source=await video.path(),mp4=join(out,`${name}-${head.slice(0,12)}.mp4`),encoded=spawnSync('ffmpeg',['-y','-i',source,'-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});if(encoded.status!==0)throw new Error(encoded.stderr.slice(-1000));const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames','-of','json',mp4],{encoding:'utf8'});const media=JSON.parse(probe.stdout);row.mp4={path:mp4,bytes:statSync(mp4).size,duration:Number(media.format.duration),frames:Number(media.streams[0].nb_frames)};if(row.mp4.duration<8||row.mp4.bytes<100000)report.errors.push(`${name}: invalid MP4`);report.cases.push(row);
 }catch(error){report.errors.push(`${name}: ${error.stack||error}`);await context.close().catch(()=>{});}
}
const cases=process.env.QA_CASES?process.env.QA_CASES.split(','):["kestrel-power-phone","cobalt-hero-desktop","aegis-power-tablet"];
for(const name of cases){if(name==='kestrel-power-phone')await run({name,vehicle:'kestrel',width:390,height:844});if(name==='cobalt-hero-desktop')await run({name,vehicle:'cobalt',width:1440,height:900,kind:'precision-hero'});if(name==='kestrel-360-phone')await run({name,vehicle:'kestrel',width:390,height:844,kind:'handbrake-360'});if(name==='kestrel-power-reduced')await run({name,vehicle:'kestrel',width:390,height:844,reduced:true});if(name==='kestrel-canvas')await run({name,vehicle:'kestrel',width:390,height:844,canvas:true});if(name==='cobalt-drift-negative')await run({name,vehicle:'cobalt',width:768,height:1024,kind:'none',mode:'drift',autopilot:true});if(name==='aegis-hill-negative')await run({name,vehicle:'aegis',width:1440,height:900,kind:'none',mode:'hill',autopilot:true});if(name==='aegis-power-tablet')await run({name,vehicle:'aegis',width:768,height:1024});}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:report.cases.map(({name,finish,end,result,selected,mp4})=>({name,finish,end,result,selected,mp4})),errors:report.errors,external:report.external},null,2));if(report.errors.length||report.external.length)process.exitCode=1;
