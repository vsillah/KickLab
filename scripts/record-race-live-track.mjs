import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5289/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-live-track-hud');mkdirSync(out,{recursive:true});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&existsSync(p))});
const context=await browser.newContext({viewport:{width:768,height:1024},deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:{dir:out,size:{width:768,height:1024}}});
await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
const page=await context.newPage(),errors=[],external=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{external.push(url);route.abort();}});
const url=new URL(base);for(const key of ['raceExpansion','raceCornerTrace','raceTelemetry'])url.searchParams.set(key,'prototype');url.searchParams.set('raceEngineQA','1');url.searchParams.set('rev',head);
let webm;
try{
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
  await page.locator('[data-preflight-mode="hill"]').click();for(let i=0;i<3;i++)await page.locator('#racePreflightNext').click();
  await page.locator('#racePreflightSteer').click();await page.locator('#racePreflightNext').click();
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  if(await page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.state().steer)!=='auto')throw Error('Existing steering assist was not selected for the recorded pedal run');
  await page.evaluate(()=>window.__KICKLAB_RACE_ENGINE_QA__.run());await page.locator('#raceNavigation').waitFor({state:'visible',timeout:5000});
  await page.locator('.stage').focus();await page.keyboard.down('Space');
  let last='',began=Date.now(),gasHeld=true,brakeHeld=false;
  while(Date.now()-began<45000){
    const state=await page.evaluate(()=>{const game=window.__KICKLAB_RACE_MODES_QA__.state(),nav=window.__KICKLAB_RACE_NAVIGATION__;return{x:game.x,y:game.y,v:game.speedKmh/3.6,e:game.lineError,phase:game.phase,nav:nav?.stage,detail:nav?.detail,visible:nav?.visible,renderer:window.__KICKLAB_RACE_3D__?.status};});
    if(state.nav!==last){samples.push({...state,t:Number(((Date.now()-began)/1000).toFixed(2))});last=state.nav;}
    if(state.phase!=='run')break;
    const brake=state.x>=70&&state.x<107,gas=state.x<70||state.x>=148;
    if(gas!==gasHeld){await page.keyboard[gas?'down':'up']('Space');gasHeld=gas;}
    if(brake!==brakeHeld){await page.keyboard[brake?'down':'up']('b');brakeHeld=brake;}
    if(state.x>158&&state.y>52)break;
    await page.waitForTimeout(90);
  }
  if(gasHeld)await page.keyboard.up('Space');if(brakeHeld)await page.keyboard.up('b');await page.waitForTimeout(1500);
  const stages=new Set(samples.map(s=>s.nav));if(!['prepare','brake','turn','apex','accelerate'].every(stage=>stages.has(stage)))throw Error(`Incomplete corner sequence: ${JSON.stringify(samples)}`);
  if(errors.length||external.length)throw Error(`Browser errors or runtime egress: ${JSON.stringify({errors,external})}`);
}finally{const video=page.video();await context.close();webm=video?await video.path():null;await browser.close();}
const mp4=join(out,`race-live-track-${head.slice(0,12)}.mp4`);
if(!webm)throw Error('Playwright did not produce a video');
execFileSync('ffmpeg',['-y','-loglevel','error','-i',webm,'-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'}));
if(!probe.format?.duration||Number(probe.format.duration)<5||probe.streams[0]?.codec_name!=='h264')throw Error(`Invalid MP4: ${JSON.stringify(probe)}`);
const report={head,url:url.toString(),mp4,probe,samples,errors,external};writeFileSync(join(out,'video-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({mp4,duration:probe.format.duration,stages:samples.map(s=>s.nav),errors,external}));
