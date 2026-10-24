import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const baseUrl=process.argv[2],revision=process.argv[3];
if(!baseUrl||!revision||!/^http:\/\/127\.0\.0\.1:\d+\/kicklab\.html$/.test(baseUrl))throw new Error('Pass revision-bound localhost URL and exact HEAD.');
const head=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
if(head.status!==0||head.stdout.trim()!==revision)throw new Error('Capture revision must match worktree HEAD.');
const outputDir=join(root,'src','media','home-previews');
const rawDir=resolve(process.argv[4]||join(root,'qa-artifacts','home-preview-source'));
mkdirSync(outputDir,{recursive:true});mkdirSync(rawDir,{recursive:true});

const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath});
const clips=[];

for(const lab of ['Fight','Race','Kick']){
  const slug=lab.toLowerCase(),videoDir=join(rawDir,slug);mkdirSync(videoDir,{recursive:true});
  const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1,recordVideo:{dir:videoDir,size:{width:960,height:540}}});
  await context.addInitScript(()=>{localStorage.setItem('impactlab.nick','Preview Player');localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('request',request=>requests.push(request.url()));
  const url=new URL(baseUrl);url.searchParams.set('rev',revision);if(lab==='Race')url.searchParams.set('raceSystems','proxy');
  await page.goto(url.href,{waitUntil:'networkidle'});
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.getByRole('button',{name:new RegExp(`^${lab} .*Enter ${lab}$`)}).click();
  if(lab==='Race'){const orbit=page.locator('.race-orbit-panel button');await orbit.waitFor({state:'visible',timeout:15000});await orbit.click();}
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});
  if(lab==='Race')await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:25000});
  if(lab==='Kick')await page.locator('#cv3').waitFor({state:'visible',timeout:25000});
  const ready=await page.evaluate(lab=>lab==='Fight'?!!document.querySelector('#cv')?.width:lab==='Kick'?!!document.querySelector('#cv3')?.width&&getComputedStyle(document.querySelector('#cv3')).display!=='none':window.__KICKLAB_RACE_3D__?.status==='rendering'&&!!document.querySelector('#race3')?.width,lab);
  if(!ready)throw new Error(`${lab} renderer did not become ready`);
  await page.addStyleTag({content:`html,body{width:960px!important;height:540px!important;margin:0!important;overflow:hidden!important;background:#050a16!important}.wrap{width:960px!important;max-width:none!important;margin:0!important;padding:0!important;display:block!important}.top,.game-context-header,.control-deck,.game-guidance-hud,.results,.lvlup,.feed,.toasts,.game-overlay-backdrop,.context-detail,.settings-drawer,.profile-dialog,.fboard,.game-pacing-overlay,.race-orbit-panel{display:none!important}.play,.left,.game-frame,.stage{display:block!important;width:960px!important;height:540px!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;overflow:hidden!important}.stage>canvas#cv,.stage>#cv3,.stage>#race3{width:960px!important;height:540px!important;aspect-ratio:auto!important}`});
  await page.waitForTimeout(350);
  const actionId={Fight:'cross',Race:'gas',Kick:'go'}[lab],action=page.locator(`#pad [data-id="${actionId}"]`).last();
  const press=async hold=>{await action.dispatchEvent('pointerdown',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true});await page.waitForTimeout(hold);await action.dispatchEvent('pointerup',{pointerId:1,pointerType:'mouse',button:0,isPrimary:true});};
  if(lab==='Race')await press(5900);
  else{await press(120);await page.waitForTimeout(lab==='Kick'?4200:2100);if(lab==='Fight'){await press(120);await page.waitForTimeout(3100);}else await page.waitForTimeout(1600);}
  const recorded=page.video();await page.close();await context.close();const rawVideo=await recorded.path();
  const external=[...new Set(requests.filter(url=>{try{return new URL(url).origin!==new URL(baseUrl).origin;}catch{return true;}}))];
  if(errors.length||external.length)throw new Error(`${lab} capture failed: ${errors.join(' | ')} ${external.join(' | ')}`);
  const mp4=join(outputDir,`${slug}.mp4`),poster=join(outputDir,`${slug}-poster.png`);
  const frameFilter=lab==='Kick'?'scale=832:468:flags=lanczos,crop=640:360:96:108':'scale=640:360:flags=lanczos';
  const transcode=spawnSync('ffmpeg',['-y','-v','error','-sseof','-6.0','-i',rawVideo,'-t','5.8','-vf',frameFilter,'-r','30','-c:v','libx264','-profile:v','main','-level','3.1','-crf','27','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});
  if(transcode.status!==0)throw new Error(`${lab} MP4 encode failed: ${transcode.stderr}`);
  const posterTime={Fight:'2.0',Race:'4.2',Kick:'1.8'}[lab];
  const posterResult=spawnSync('ffmpeg',['-y','-ss',posterTime,'-i',mp4,'-frames:v','1',poster],{encoding:'utf8'});
  if(posterResult.status!==0)throw new Error(`${lab} poster encode failed: ${posterResult.stderr}`);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});
  if(probe.status!==0)throw new Error(`${lab} probe failed: ${probe.stderr}`);
  const frameHashes=spawnSync('ffmpeg',['-v','error','-i',mp4,'-vf','fps=3','-f','framemd5','pipe:1'],{encoding:'utf8'});
  const uniqueFrames=new Set(frameHashes.stdout.split('\n').filter(line=>line&&!line.startsWith('#')).map(line=>line.split(',').at(-1)?.trim())).size;
  const metadata=JSON.parse(probe.stdout),bytes=statSync(mp4).size;
  if(bytes<20_000||statSync(poster).size<4_000||Number(metadata.format?.duration||0)<5||uniqueFrames<10)throw new Error(`${lab} preview validation failed (${bytes} bytes, ${metadata.format?.duration}s, ${uniqueFrames} frames)`);
  clips.push({lab,revision,source:lab==='Fight'?'Current local KickLab Canvas renderer':'Current local KickLab 3D renderer',captureFlags:lab==='Race'?['raceSystems=proxy']:[],mp4:`media/home-previews/${slug}.mp4`,poster:`media/home-previews/${slug}-poster.png`,bytes,posterBytes:statSync(poster).size,uniqueFrames,...metadata});
}

await browser.close();
writeFileSync(join(outputDir,'manifest.json'),`${JSON.stringify({schemaVersion:2,privacy:'local renderer only; no external requests; no audio',clips},null,2)}\n`);
rmSync(rawDir,{recursive:true,force:true});
console.log(JSON.stringify({outputDir,clips},null,2));
