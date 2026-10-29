// Exact-head browser QA for the Race V1 replay-only boundary.
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(process.env.KICKLAB_QA_HEAD!==head||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Run against a clean exact-head checkout');
const base=process.argv[2]||'http://127.0.0.1:5878/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-replay-only');
const origin=new URL(base);if(origin.protocol!=='http:'||!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('Use trusted localhost');
const local=readFileSync('dist/kicklab.html'),remote=Buffer.from(await(await fetch(`${base}?rev=${head}`)).arrayBuffer());
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');if(sha(local)!==sha(remote))throw Error('Localhost does not serve the exact built artifact');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const cases=[
  {width:390,height:844,input:'touch',gfx:'3d',motion:'reduce',offline:true,noRecorder:false},
  {width:768,height:1024,input:'keyboard',gfx:'2d',motion:'reduce',offline:false,noRecorder:true},
  {width:1113,height:834,input:'pointer',gfx:'3d',motion:'no-preference',offline:false,noRecorder:true},
  {width:1440,height:900,input:'pointer',gfx:'3d',motion:'no-preference',offline:false,noRecorder:false}
];
const report={head,artifactSha256:sha(local),cases:[],errors:[],external:[],httpErrors:[],mp4:null};
for(const item of cases){
  const viewport={width:item.width,height:item.height};
  const context=await browser.newContext({viewport,hasTouch:item.input==='touch',reducedMotion:item.motion,recordVideo:item.width===390?{dir:out,size:viewport}:undefined});
  await context.addInitScript(({gfx,noRecorder})=>{
    localStorage.setItem('impactlab.v1',JSON.stringify({gfx}));
    window.__exportCalls={objectUrls:0,share:0,canShare:0,downloads:0};
    const make=URL.createObjectURL;URL.createObjectURL=function(...args){window.__exportCalls.objectUrls++;return make.apply(this,args);};
    Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{window.__exportCalls.share++;throw new DOMException('Denied','NotAllowedError');}});
    Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>{window.__exportCalls.canShare++;return true;}});
    const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(...args){if(this.download)window.__exportCalls.downloads++;return click.apply(this,args);};
    if(noRecorder){Object.defineProperty(window,'MediaRecorder',{configurable:true,value:undefined});Object.defineProperty(HTMLCanvasElement.prototype,'captureStream',{configurable:true,value:undefined});}
  },item);
  const page=await context.newPage(),video=page.video();let downloads=0;
  page.on('download',()=>downloads++);page.on('pageerror',error=>report.errors.push(`${item.width}: ${error.message}`));
  page.on('response',response=>{if(response.status()>=400)report.httpErrors.push(`${item.width}: ${response.status()} ${response.url()}`);});
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(origin.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(target);route.abort();}});
  try{
    const url=new URL(base);for(const flag of ['raceExpansion','raceCompetition','racePreflight'])url.searchParams.set(flag,'prototype');url.searchParams.set('raceResultsQA','1');url.searchParams.set('rev',head);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    const enter=async()=>{const race=page.locator('#lab-tab-race');if(item.input==='touch')await race.tap();else if(item.input==='keyboard'){await race.focus();await page.keyboard.press('Enter');}else await race.click();await page.locator('#racePreflight').waitFor({state:'visible'});await page.click('[data-preflight-venue="highland"]');for(let step=0;step<4;step++)await page.click('#racePreflightNext');await page.locator('#racePreflight').waitFor({state:'hidden',timeout:15000});const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();await page.waitForFunction(()=>window.__KICKLAB_RACE_RESULTS_QA__?.state().raceState==='run',null,{timeout:20000});};
    await enter();
    const initial=await page.evaluate(()=>({profileId:JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId,keys:Object.keys(localStorage).sort(),calls:{...window.__exportCalls}}));
    const states=[];
    for(const [index,scenario] of [{outcome:'pass',achievement:'collectible',replay:'both',coach:'clean'},{outcome:'pass',achievement:'none',replay:'both',coach:'error-heavy'}].entries()){
      const fixture=await page.evaluate(value=>window.__KICKLAB_RACE_RESULTS_QA__.scenario(value),scenario);
      if(!fixture?.frames||!fixture?.moves||!await page.locator('#results').isVisible())throw Error(`Result fixture failed: ${JSON.stringify(fixture)}`);
      const preview=await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.threePreview());
      const observed=await page.evaluate(()=>({exportControls:[...document.querySelectorAll('#rRaceRecord,#raceShare,#raceShareDownload,#raceShareNative')].length,replay3d:!document.querySelector('#raceReplayPreview').hidden,replayText:!document.querySelector('#raceReplayFallback').hidden,coach:document.querySelector('#raceResultCoach').textContent,awards:document.querySelector('#raceResultAwards').textContent,profileId:JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId,overflow:document.documentElement.scrollWidth-innerWidth,calls:window.__exportCalls,keys:Object.keys(localStorage).sort()}));
      if(observed.exportControls||observed.calls.objectUrls!==initial.calls.objectUrls||observed.calls.share||observed.calls.canShare||observed.calls.downloads||downloads||observed.overflow>1||!observed.coach.includes('What worked')||!observed.coach.includes('Next focus')||observed.profileId!==initial.profileId||observed.keys.some(key=>/highlight|download|\.webm/i.test(key)))throw Error(`Result boundary failed: ${JSON.stringify(observed)}`);
      if(item.gfx==='3d'&&(!preview?.ready||preview.count<1||!observed.replay3d)||item.gfx==='2d'&&!observed.replayText)throw Error(`Replay fallback mismatch: ${JSON.stringify({preview,observed})}`);
      if(item.width===390&&index===0){await page.waitForFunction(()=>[...document.querySelectorAll('#raceResultAwards img')].every(image=>image.complete&&image.naturalWidth>0));await page.locator('#results').screenshot({path:join(out,'phone-result.png')});}
      if(item.width===390)await page.waitForTimeout(1600);
      const action=page.locator(observed.replay3d?'#raceReplayPreview':'#raceReplayFallback');if(item.input==='keyboard'){await action.focus();await page.keyboard.press('Enter');}else if(item.input==='touch')await action.tap();else await action.click();
      await page.locator('#rbar').waitFor({state:'visible'});
      if(item.width===390)await page.waitForTimeout(1800);
      const exitHit=await page.locator('#rbExit').evaluate(button=>{const box=button.getBoundingClientRect(),node=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);return node===button||button.contains(node);});
      if(!exitHit)report.errors.push(`${item.width}: visible Exit Replay is covered by another control`);
      if(exitHit)await page.click('#rbExit');else{await page.locator('#rbExit').focus();await page.keyboard.press('Enter');}
      await page.locator('#rbar').waitFor({state:'hidden'});
      if(item.offline&&index===0)await context.setOffline(true);
      states.push({scenario,fixture,preview,observed});
    }
    let isolation=null;
    if(item.width===390){
      await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.scenario({outcome:'pass',achievement:'none',replay:'both'}));
      await page.locator('#results').waitFor({state:'visible'});
      await page.click('#rRaceGarage');await page.locator('#modeHome').waitFor({state:'visible'});
      await page.click('#homeProfileButton');await page.click('#profileCreate');await page.fill('#profileNickname','QA Second');await page.click('#profileFormSave');await page.click('#profileClose');await enter();
      const second=await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.scenario({outcome:'pass',achievement:'none',replay:'both'}));
      const secondId=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId);isolation={first:initial.profileId,second:secondId,frames:second.frames};if(secondId===initial.profileId||!second.frames)throw Error(`Profile switch failed: ${JSON.stringify(isolation)}`);
    }
    report.cases.push({item,url:url.toString(),initial,states,isolation,downloads});
  }catch(error){report.errors.push(`${item.width}: ${error.stack||error}`);}
  await context.close();
  if(video&&item.width===390){const mp4=join(out,`race-replay-only-${head.slice(0,12)}.mp4`);const conversion=spawnSync('ffmpeg',['-y','-i',await video.path(),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(conversion.status===0){const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});const media=probe.status===0?JSON.parse(probe.stdout):null;if(media?.streams?.some(stream=>stream.codec_name==='h264'&&stream.width===390&&stream.height===844)&&Number(media.format?.duration)>3)report.mp4=mp4;else report.errors.push('MP4 probe failed');}else report.errors.push(`MP4 encode failed: ${conversion.stderr?.slice(-500)}`);}
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({head,cases:report.cases.map(({item,states,isolation,downloads})=>({width:item.width,gfx:item.gfx,noRecorder:item.noRecorder,states:states.length,isolation,downloads})),errors:report.errors,external:report.external,httpErrors:report.httpErrors,mp4:report.mp4},null,2));if(report.errors.length||report.external.length||report.httpErrors.length||report.cases.length!==cases.length||!report.mp4)process.exitCode=1;
