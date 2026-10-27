import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2],out=resolve(process.argv[3]||'qa-artifacts/race-guardrail-cases'),head=process.argv[4];
if(!base||!/^[0-9a-f]{40}$/.test(head||'')||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==head)throw Error('Pass localhost URL, output folder, and exact current Git head');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const report={head,base,cases:[],errors:[],external:[]},clips=[];
const read=page=>page.evaluate(()=>globalThis.__KICKLAB_RACE_3D__||null);
const wait=async(page,predicate,limitMs=8000)=>{const until=Date.now()+limitMs;while(Date.now()<until){const audit=await read(page);if(predicate(audit))return audit;await page.waitForTimeout(40);}throw Error(`Timed out waiting for Race state: ${JSON.stringify(await read(page))}`);};
async function open(name){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:1440,height:900}}});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
  const page=await context.newPage(),video=page.video(),url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',head);
  page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));page.on('request',r=>{if(new URL(r.url()).origin!==url.origin)report.external.push(`${name}: ${r.url()}`);});
  await page.goto(url.toString(),{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();await page.locator('#lab-tab-race').click();
  const skip=page.locator('.race-orbit-panel button');await skip.waitFor({state:'visible',timeout:6000}).catch(()=>{});if(await skip.isVisible())await skip.click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:20000});
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('.stage').getBoundingClientRect().top+scrollY-8));
  const startedAt=Date.now();await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:12000});
  await page.evaluate(label=>{const tag=document.createElement('div');tag.id='raceQaCaseLabel';tag.textContent=label;Object.assign(tag.style,{position:'fixed',top:'18px',left:'50%',transform:'translateX(-50%)',zIndex:'2147483647',padding:'8px 16px',borderRadius:'8px',background:'rgba(7,21,37,.85)',color:'#fff',font:'700 24px Arial,sans-serif',pointerEvents:'none'});document.body.append(tag);},{scrape:'01  SHALLOW SCRAPE',dent:'02  LOW-SPEED DENT',break:'03  HIGH-ENERGY BREAK-THROUGH'}[name]);
  return{context,page,video,url:url.toString(),startedAt};
}
async function close(name,session,contact,after,trace){
  const {context,page,video,url,startedAt}=session,endedAt=Date.now(),storage=await page.evaluate(()=>Object.keys(localStorage).sort());
  const row={name,url,contact:contact?.guardrail,contactDynamics:contact?.dynamics,after:after?.guardrail,afterDynamics:after?.dynamics,trace,storage};
  if(contact?.status!=='rendering'||!contact.vehicle||!contact.canvas||contact.dynamics?.state!=='run')report.errors.push(`${name}: contact did not occur in running 3D`);
  if(storage.some(key=>!['impactlab.v1','impactlab.nick','kicklab.profiles.v1'].includes(key)))report.errors.push(`${name}: unexpected storage`);
  await context.close();const source=await video.path(),sourceProbe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',source],{encoding:'utf8'});if(sourceProbe.status!==0)throw Error(sourceProbe.stderr);
  const sourceDuration=Number(JSON.parse(sourceProbe.stdout).format.duration),trim=Math.max(0,sourceDuration-(endedAt-startedAt)/1000-.45),clip=join(out,`${name}-${head.slice(0,12)}.mp4`);
  const filter='fps=30';
  const encoded=spawnSync('ffmpeg',['-y','-ss',trim.toFixed(3),'-i',source,'-vf',filter,'-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',clip],{encoding:'utf8'});if(encoded.status!==0)throw Error(encoded.stderr.slice(-1800));
  row.clip=clip;row.trim=trim;report.cases.push(row);clips.push(clip);
}
async function scrape(){const s=await open('scrape'),{page}=s,trace=[];await page.keyboard.down('Space');trace.push('gas down');await wait(page,a=>a?.dynamics?.v>=16);await page.keyboard.up('Space');trace.push('gas up at 16 m/s');await page.keyboard.down('ArrowRight');await page.waitForTimeout(40);await page.keyboard.up('ArrowRight');trace.push('right steering pulse 40 ms');const hit=await wait(page,a=>a?.guardrail?.last?.type==='scrape',7500);trace.push(`scrape at ${hit.dynamics.x.toFixed(1)} m, ${hit.guardrail.last.normalSpeed.toFixed(1)} m/s normal`);await page.locator('.stage').screenshot({path:join(out,'scrape-contact.png')});await page.keyboard.down('ArrowLeft');await page.waitForTimeout(650);await page.keyboard.up('ArrowLeft');await page.waitForTimeout(550);const after=await read(page);await close('scrape',s,hit,after,trace);if(hit.guardrail.contacts!==1||hit.guardrail.broken!==0||hit.guardrail.sparks>12)report.errors.push('scrape: unbounded or incorrect contact');}
async function dent(){const s=await open('dent'),{page}=s,trace=[];await page.keyboard.down('Space');await page.waitForTimeout(3400);await page.keyboard.up('Space');trace.push('gas 3.4 s');await page.keyboard.down('ArrowRight');trace.push('right steer');const hit=await wait(page,a=>a?.guardrail?.last?.type==='dent',4000);await page.keyboard.up('ArrowRight');trace.push(`dent at ${hit.dynamics.x.toFixed(1)} m`);await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.guardrail?.renderedDents>=1,null,{timeout:2000});await page.locator('.stage').screenshot({path:join(out,'dent-contact.png')});await page.keyboard.down('ArrowLeft');await page.waitForTimeout(800);await page.keyboard.up('ArrowLeft');const after=await wait(page,a=>a?.guardrail?.recoveries===1&&a?.guardrail?.recovering===0,4000);await close('dent',s,hit,after,trace);if(hit.guardrail.contacts!==1||hit.guardrail.broken!==0||after.dynamics.state!=='run')report.errors.push('dent: contact or recovery contract failed');}
async function breakthrough(){
  const s=await open('break'),{page}=s,trace=[];
  const hold=async(label,text)=>{await page.evaluate(value=>{document.querySelector('#raceQaCaseLabel').textContent=value;},`03  HIGH-ENERGY BREAK-THROUGH  ·  ${text}`);await page.screenshot({path:join(out,`break-${label}-hold.png`)});};
  await page.keyboard.down('Space');trace.push('gas down');let gear=1;const until=Date.now()+11000;
  while(Date.now()<until){const audit=await read(page),d=audit?.dynamics;if(!d||d.state!=='run')throw Error('Race ended before high-energy approach');if(gear<4&&d.v>=[10,17,23][gear-1]){await page.locator('#raceTelemetryShift').click();trace.push(`shift to gear ${gear+1} at ${d.v.toFixed(1)} m/s`);gear++;}if(d.v>=25){trace.push(`approach ${d.v.toFixed(1)} m/s at x=${d.x.toFixed(1)}`);break;}await page.waitForTimeout(60);}
  const approach=await read(page);await page.keyboard.up('Space');if(approach.dynamics.v<25)throw Error(`High-energy approach too slow: ${approach.dynamics.v}`);
  await page.keyboard.down('ArrowRight');await wait(page,a=>a?.dynamics?.y>=5.5&&a?.guardrail?.contacts===0,3500);await hold('before','01  BEFORE CONTACT');
  const hit=await wait(page,a=>a?.guardrail?.last?.type==='break',3500);await page.keyboard.up('ArrowRight');trace.push(`break at ${hit.dynamics.x.toFixed(1)} m, ${hit.guardrail.last.normalSpeed.toFixed(1)} m/s normal`);
  await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.guardrail?.renderedBreaks>=1,null,{timeout:2000});await page.locator('.stage').screenshot({path:join(out,'break-contact.png')});await hold('contact','02  RAIL CONTACT');
  await wait(page,a=>a?.guardrail?.detachedAge>=.12&&a?.guardrail?.impactHold>0,2500);await hold('deformation','03  LOCAL DEFORMATION');
  const gap=await wait(page,a=>a?.guardrail?.detachedAge>=.5&&a?.guardrail?.breached&&a?.guardrail?.contacts===1,2500);await hold('gap','04  PERSISTENT GAP');
  const after=await wait(page,a=>a?.guardrail?.recoveries===1&&a?.guardrail?.recovering===0,5000);await page.locator('.stage').screenshot({path:join(out,'break-recovery.png')});await close('break',s,hit,after,trace);
  if(hit.guardrail.contacts!==1||hit.guardrail.broken!==1||hit.guardrail.gapBeams!==3||hit.guardrail.gapPosts!==1||gap.guardrail.contacts!==1||after.guardrail.contacts!==1||after.guardrail.broken!==1||after.dynamics.state!=='run'||Math.abs(after.dynamics.y)>1)report.errors.push('break: segment, pass-through, or recovery contract failed');
}
try{await scrape();await dent();await breakthrough();}catch(error){report.errors.push(error.stack||String(error));}finally{await browser.close();}
if(clips.length===3){const list=join(out,'concat.txt');writeFileSync(list,clips.map(path=>`file '${path.replaceAll("'","'\\''")}'`).join('\n')+'\n');const mp4=join(out,`race-guardrail-three-cases-${head.slice(0,12)}.mp4`),encoded=spawnSync('ffmpeg',['-y','-f','concat','-safe','0','-i',list,'-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});if(encoded.status!==0)report.errors.push(encoded.stderr.slice(-1500));else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});const meta=JSON.parse(probe.stdout);report.mp4={path:mp4,duration:Number(meta.format.duration),bytes:statSync(mp4).size,streams:meta.streams};if(!meta.streams.some(x=>x.codec_name==='h264'&&x.width===1440&&x.height===900)||report.mp4.duration<20||report.mp4.bytes<300000)report.errors.push('Combined MP4 failed playback validation');}}

if(clips.length===3){
  const reviewClips=[clips[2]];
  for(const label of ['before','contact','deformation','gap']){
    const still=join(out,`break-${label}-hold.png`),clip=join(out,`break-${label}-hold-${head.slice(0,12)}.mp4`);
    const encoded=spawnSync('ffmpeg',['-y','-loop','1','-framerate','30','-t','1.8','-i',still,'-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',clip],{encoding:'utf8'});
    if(encoded.status!==0){report.errors.push(`${label} hold encode failed: ${encoded.stderr.slice(-1000)}`);break;}reviewClips.push(clip);
  }
  if(reviewClips.length===5){const list=join(out,'review-concat.txt');writeFileSync(list,reviewClips.map(path=>`file '${path.replaceAll("'","'\\''")}'`).join('\n')+'\n');const mp4=join(out,`race-guardrail-break-review-${head.slice(0,12)}.mp4`),encoded=spawnSync('ffmpeg',['-y','-f','concat','-safe','0','-i',list,'-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});if(encoded.status!==0)report.errors.push(`Review MP4 encode failed: ${encoded.stderr.slice(-1000)}`);else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});const meta=JSON.parse(probe.stdout);report.reviewMp4={path:mp4,duration:Number(meta.format.duration),bytes:statSync(mp4).size,streams:meta.streams};if(!meta.streams.some(x=>x.codec_name==='h264'&&x.width===1440&&x.height===900)||report.reviewMp4.duration<15)report.errors.push('Review MP4 failed playback validation');}}
}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({head,cases:report.cases.map(x=>({name:x.name,contact:x.contact,after:x.after,clip:x.clip})),mp4:report.mp4,errors:report.errors,external:report.external},null,2));if(report.errors.length||report.external.length)process.exitCode=1;
