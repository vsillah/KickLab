import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,rmSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.argv[2],base=process.argv[3]||'http://127.0.0.1:48239/kicklab.html';
if(!head||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==head||!/^http:\/\/127\.0\.0\.1:\d+\/kicklab\.html$/.test(base))throw new Error('Pass exact HEAD and local KickLab URL');
const out=resolve('qa-artifacts/race-video-presentation/exact-head'),raw=join(out,'raw');mkdirSync(raw,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
try{
  const context=await browser.newContext({viewport:{width:960,height:540},recordVideo:{dir:raw,size:{width:960,height:540}}});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
  const page=await context.newPage(),video=page.video(),url=new URL(base),external=[];url.searchParams.set('raceVideo','cinematic');url.searchParams.set('rev',head);
  page.on('request',request=>{if(new URL(request.url()).origin!==url.origin)external.push(request.url());});
  await page.goto(url.href,{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.getByRole('button',{name:/^Race .*Enter Race$/}).click();await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:15000});await page.locator('.race-orbit-panel button').click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:15000});await page.locator('#raceCoachSetupStart').click();
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:25000});
  if(!await page.evaluate(()=>window.__KICKLAB_RACE_VIDEO__.activate()&&getComputedStyle(document.querySelector('#raceCockpit')).display==='none'))throw new Error('Clean Race presentation did not activate');
  await page.screenshot({path:join(out,'clean.png')});
  const gas=page.locator('#pad [data-id="gas"]').last();await gas.dispatchEvent('pointerdown',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true});
  await page.waitForTimeout(4000);await gas.dispatchEvent('pointerup',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true});
  await page.evaluate(()=>window.__KICKLAB_RACE_VIDEO__.deactivate());
  if(!await page.evaluate(()=>getComputedStyle(document.querySelector('#raceCockpit')).display!=='none'&&getComputedStyle(document.querySelector('#raceCockpit')).visibility!=='hidden'))throw new Error('Live controls did not return');
  await page.screenshot({path:join(out,'live.png')});await page.waitForTimeout(3000);
  await page.close();await context.close();if(external.length)throw new Error(`External requests: ${external.join(', ')}`);
  const source=await video.path(),mp4=join(out,`kicklab-race-video-${head}.mp4`);
  execFileSync('ffmpeg',['-y','-v','error','-sseof','-7','-i',source,'-t','7','-r','30','-c:v','libx264','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4]);
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'}));
  if(Number(probe.format.duration)<6.5||statSync(mp4).size<50_000)throw new Error('Walkthrough is incomplete');
  rmSync(raw,{recursive:true,force:true});console.log(JSON.stringify({head,url:url.href,mp4,duration:probe.format.duration,bytes:statSync(mp4).size,externalRequests:0},null,2));
}finally{await browser.close();}
