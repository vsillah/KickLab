import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:63339/pages/index.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-pause-save-exit');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the full reviewed commit.');
const origin=new URL(base);
if(origin.protocol!=='http:'||!['127.0.0.1','localhost'].includes(origin.hostname)||origin.pathname!=='/pages/index.html')throw Error('Use the trusted localhost Pages artifact.');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const url=new URL(base);url.searchParams.set('rev',head);
const response=await fetch(url);
if(!response.ok||sha(Buffer.from(await response.arrayBuffer()))!==sha(readFileSync('dist/pages/index.html')))throw Error('Served Pages HTML does not match this build.');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const report={head,artifactSha256:sha(readFileSync('dist/pages/index.html')),cases:[],errors:[],external:[],httpErrors:[]};
const sizes=[{width:390,height:844,input:'touch',gfx:'2d',motion:'reduce'},{width:768,height:1024,input:'keyboard',gfx:'3d',motion:'reduce'},{width:1113,height:834,input:'pointer',gfx:'3d',motion:'no-preference'},{width:1440,height:900,input:'pointer',gfx:'3d',motion:'no-preference'}];
const fail=(message,data)=>{throw Error(`${message}: ${JSON.stringify(data)}`);};
const read=page=>page.evaluate(()=>{
  const store=JSON.parse(localStorage.getItem('kicklab.profiles.v1')||'null'),active=store?.profiles?.find(profile=>profile.id===store.activeId),modes=window.__KICKLAB_RACE_MODES_QA__?.state(),multi=window.__KICKLAB_RACE_MULTIPLAYER_QA__?.state(),rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
  return{home:!document.querySelector('#modeHome').hidden,preflight:!document.querySelector('#racePreflight').hidden,phase:modes?.phase,pause:!document.querySelector('#gamePacingOverlay').hidden&&document.querySelector('#gamePacingOverlay').dataset.state==='paused',results:!document.querySelector('#results').hidden,profileId:store?.activeId,progress:active?.progress,mode:modes?.mode,vehicle:multi?.activeVehicle,garage:multi?.activeGarage,venue:window.__KICKLAB_RACE_3D__?.venue,steer:multi?.activeSteer,control:multi?.activeControl,renderer:window.__KICKLAB_RACE_3D__?.status,back:rect('#gamePacingResume'),exit:rect('#gamePacingSaveExit'),overflow:document.documentElement.scrollWidth-innerWidth};
});
const score=progress=>JSON.stringify({xp:progress.xp,stats:progress.stats,badges:progress.badges,raceModes:progress.raceModes,raceProgression:progress.raceProgression,raceChampionship:progress.raceChampionship,raceCompetition:progress.raceCompetition,raceMastery:progress.raceMastery,raceProfileRecords:progress.raceProfileRecords});
async function pause(page,input){
  if(input==='touch')await page.locator('#cv').tap();
  else if(input==='keyboard')await page.keyboard.press('KeyP');
  else await page.locator('#cv').click();
  await page.locator('#gamePacingSaveExit').waitFor({state:'visible'});
  const state=await read(page);
  if(!state.pause||state.phase!=='run'||state.results||state.overflow>1)fail('Race did not enter manual pause',state);
  const visual=await page.evaluate(()=>{
    const a=document.querySelector('#gamePacingResume'),b=document.querySelector('#gamePacingSaveExit'),ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(),ca=getComputedStyle(a),cb=getComputedStyle(b),hit=r=>document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return{resume:a.textContent.trim(),exit:b.textContent.trim(),resumeName:a.getAttribute('aria-label'),exitName:b.getAttribute('aria-label'),previewName:document.querySelector('#gameControlPreview').getAttribute('aria-label'),widths:[ra.width,rb.width],heights:[ra.height,rb.height],fonts:[ca.font,cb.font],hits:[hit(ra)===a,hit(rb)===b],viewport:[innerWidth,innerHeight],rects:[{x:ra.x,y:ra.y,right:ra.right,bottom:ra.bottom},{x:rb.x,y:rb.y,right:rb.right,bottom:rb.bottom}]};
  });
  if(visual.resume!=='Resume'||visual.exit!=='Save & Exit'||visual.resumeName!=='Resume Race'||!visual.exitName.includes('KickLab home')||visual.previewName||Math.abs(visual.widths[0]-visual.widths[1])>1||Math.abs(visual.heights[0]-visual.heights[1])>1||visual.heights[0]<44||visual.fonts[0]!==visual.fonts[1]||visual.hits.some(hit=>!hit)||visual.rects.some(rect=>rect.x<0||rect.y<0||rect.right>visual.viewport[0]+1||rect.bottom>visual.viewport[1]+1))fail('Pause actions differ or are obstructed',visual);
  return visual;
}
async function enter(page,input){
  const card=page.locator('#lab-tab-race');
  if(input==='touch')await card.tap();else if(input==='keyboard'){await card.focus();await page.keyboard.press('Enter');}else await card.click();
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:30000});
  const state=await read(page);
  if(state.home||state.results||state.pause||state.phase!=='grid')fail('Race did not re-enter a fresh preflight',state);
  return state;
}
async function start(page,{countdownPause=false}={}){
  await page.locator('[data-preflight-mode="drag"]').click();await page.click('#racePreflightNext');
  await page.locator('[data-preflight-vehicle="kestrel"]').click();await page.click('#racePreflightNext');
  await page.locator('[data-preflight-part="brakes"][data-preflight-value="sport"]').click();await page.click('#racePreflightNext');
  await page.locator('[data-preflight-control="analog"]').click();await page.click('#racePreflightSteer');
  await page.click('#racePreflightNext');
  const arrival=await page.evaluate(()=>({open:!document.querySelector('#racePreflight').hidden,back:document.querySelector('#racePreflightBack').disabled,next:document.querySelector('#racePreflightNext').disabled}));
  if(!arrival.open||!arrival.back||!arrival.next)fail('Starting-grid arrival navigation was not locked',arrival);
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:16000});
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  if(countdownPause){
    await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().phase==='count',null,{timeout:20000});
    await page.evaluate(()=>window.__KICKLAB_RACE_AUDIO_QA__.pause());
    await page.locator('#gamePacingSaveExit').waitFor({state:'visible'});
    const countdown=await read(page);
    if(!countdown.pause||countdown.phase!=='count')fail('Countdown pause was unavailable',countdown);
    await page.click('#gamePacingResume');
    if((await read(page)).pause)fail('Countdown did not resume',await read(page));
  }
  await page.waitForFunction(()=>/\d+ km\/h/.test(document.querySelector('#challengeHudSummary .hud-summary-cue')?.textContent||''),null,{timeout:35000});
  await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().phase==='run',null,{timeout:20000});
  await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().speedKmh>7,null,{timeout:12000});
  await page.keyboard.up('KeyW');
}
for(const size of sizes.filter(item=>!process.env.KICKLAB_QA_WIDTH||String(item.width)===process.env.KICKLAB_QA_WIDTH)){
  const label=`${size.width}x${size.height}/${size.input}/${size.gfx}/${size.motion}`;
  console.log(`Starting ${label}`);
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,hasTouch:size.input==='touch',reducedMotion:size.motion,...(size.width===1113?{recordVideo:{dir:out,size:{width:size.width,height:size.height}}}:{})});
  const page=await context.newPage();
  await page.addInitScript(gfx=>{if(!sessionStorage.getItem('kicklab.pause.qa.init')){localStorage.setItem('impactlab.v1',JSON.stringify({gfx}));sessionStorage.setItem('kicklab.pause.qa.init','1');}},size.gfx);
  page.on('pageerror',error=>report.errors.push(`${label}: browser ${error.message}`));
  page.on('response',response=>{if(response.status()>=400)report.httpErrors.push(`${response.status()} ${response.url()}`);});
  await page.route('**/*',route=>{const requestUrl=route.request().url();if(requestUrl.startsWith(origin.origin+'/')||requestUrl.startsWith('data:')||requestUrl.startsWith('blob:'))route.continue();else{report.external.push(requestUrl);route.abort();}});
  page.setDefaultTimeout(12000);
  try{
    const caseUrl=new URL(url);if(size.width===768)caseUrl.searchParams.set('raceAudioQA','1');
    await page.goto(caseUrl.toString(),{waitUntil:'domcontentloaded'});
    const navigation=await page.evaluate(()=>Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd||0));
    if(navigation<=0||navigation>30000)fail('Initial page load exceeded performance bound',{navigation});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    if(!(await read(page)).home||new URL(page.url()).searchParams.has('racePreflight'))fail('Unflagged Race did not remain default off',await read(page));
    await enter(page,size.input);await start(page,{countdownPause:size.width===768});
    const before=await read(page),visual=await pause(page,size.input);
    if(size.width===1113)await page.screenshot({path:join(out,`pause-actions-${head.slice(0,8)}.png`)});
    await page.waitForTimeout(size.width===1113?1700:50);
    await page.click('#gamePacingResume');
    if((await read(page)).pause)fail('Resume left the race paused',await read(page));
    await page.waitForTimeout(size.width===1113?1200:50);
    const second=await pause(page,size.input);
    await page.waitForTimeout(size.width===1113?1700:50);
    if(size.width===390){await page.evaluate(()=>{const original=Storage.prototype.getItem;window.__qaStorageRead=original;Storage.prototype.getItem=function(key){if(key==='kicklab.profiles.v1')throw Error('simulated storage failure');return original.call(this,key);};});await page.locator('#gamePacingSaveExit').tap();const blocked=await page.locator('#gamePacingSaveExit').isVisible()&&await page.locator('#gamePacingActivity').innerText().then(text=>text.includes('Could not save'));await page.evaluate(()=>{Storage.prototype.getItem=window.__qaStorageRead;delete window.__qaStorageRead;});if(!blocked)fail('Storage failure did not keep pause open',await read(page));}
    await page.waitForTimeout(size.width===1113?1300:50);
    if(size.input==='touch')await page.locator('#gamePacingSaveExit').tap();else if(size.input==='keyboard'){await page.locator('#gamePacingSaveExit').focus();await page.keyboard.press('Enter');}else await page.click('#gamePacingSaveExit');
    const exited=await read(page);
    if(!exited.home||exited.results||score(exited.progress)!==score(before.progress)||exited.progress.racePauseSetup?.control!=='analog'||exited.progress.racePauseSetup?.steer!=='auto'||exited.progress.raceVenue!=='highland')fail('Exit lost setup or changed score', {before,exited});
    await page.waitForTimeout(size.width===1113?1500:50);
    await page.reload({waitUntil:'domcontentloaded'});
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#homeProfileButton');await page.locator('[data-profile-lab="race"]').click();
    const profileRace=await page.locator('#profileSummary').innerText();
    if(!profileRace.includes('Control style')||!profileRace.includes('Analog'))fail('Profile did not show saved Race control style',{profileRace});
    if(size.width===390){
      await page.click('#profileCreate');await page.fill('#profileNickname','QA Second');await page.click('#profileFormSave');
      const secondProfile=await page.locator('#profileSummary').innerText();
      if(!secondProfile.includes('Control style')||!secondProfile.includes('Classic'))fail('Control style leaked to second profile',{secondProfile});
      await page.locator(`#profileList [data-profile-id="${before.profileId}"]`).click();
      const originalProfile=await page.locator('#profileSummary').innerText();
      if(!originalProfile.includes('Analog'))fail('Original profile lost saved control style',{originalProfile});
    }
    await page.click('#profileClose');
    const returned=await enter(page,size.input);
    if(returned.profileId!==before.profileId||returned.mode!=='drag'||returned.vehicle!=='kestrel'||returned.garage.brakes!=='sport'||returned.control!=='analog'||returned.steer!=='auto'||returned.phase!=='grid'||score(returned.progress)!==score(before.progress))fail('Reload and re-entry lost setup or restored stale run',{before,returned});
    report.cases.push({label,passed:true,visual,second,profile:returned.profileId,scoreUnchanged:true,renderer:returned.renderer,domContentLoadedMs:navigation});
    if(size.width===1113){await page.waitForTimeout(1100);await page.screenshot({path:join(out,`pause-return-${head.slice(0,8)}.png`)});}
  }catch(error){report.errors.push(`${label}: ${error.stack||String(error)}`);}
  const video=page.video();
  await context.close();
  if(video&&size.width===1113&&!report.errors.some(error=>error.startsWith(label))){
    const mp4=join(out,`pause-save-exit-${head.slice(0,8)}.mp4`),encoded=spawnSync('ffmpeg',['-y','-i',await video.path(),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});
    if(encoded.status!==0)report.errors.push(`${label}: MP4 encode failed ${encoded.stderr}`);
    else{const decode=spawnSync('ffmpeg',['-v','error','-i',mp4,'-f','null','-'],{encoding:'utf8'}),probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'}),info=JSON.parse(probe.stdout||'{}');if(decode.status!==0||probe.status!==0||statSync(mp4).size<50000||Number(info.format?.duration||0)<12)report.errors.push(`${label}: MP4 validation failed`);else report.video={mp4,bytes:statSync(mp4).size,info};}
  }
}
await browser.close();
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.length,errors:report.errors,external:report.external,httpErrors:report.httpErrors,video:report.video,out},null,2));
if(report.errors.length||report.external.length||report.httpErrors.length)process.exitCode=1;
