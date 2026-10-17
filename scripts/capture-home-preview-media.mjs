import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const baseUrl=process.argv[2]||'http://127.0.0.1:4202/kicklab.html';
const revision=process.argv[3]||'working-tree';
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
  await context.addInitScript(()=>{localStorage.setItem('impactlab.nick','Preview Player');localStorage.setItem('impactlab.v1','{}');});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('request',request=>requests.push(request.url()));
  await page.goto(`${baseUrl}?capture=home-preview&lab=${slug}&rev=${encodeURIComponent(revision)}`,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:new RegExp(`^${lab} .*Enter ${lab}$`)}).click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:8000});
  await page.addStyleTag({content:`html,body{width:960px!important;height:540px!important;margin:0!important;overflow:hidden!important;background:#050a16!important}.wrap{width:960px!important;max-width:none!important;margin:0!important;padding:0!important;display:block!important}.top,.game-context-header,.control-deck,.game-guidance-hud,.results,.lvlup,.feed,.toasts,.game-overlay-backdrop,.context-detail,.settings-drawer,.profile-dialog,.fboard,.game-pacing-overlay{display:none!important}.play,.left,.game-frame,.stage{display:block!important;width:960px!important;height:540px!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;overflow:hidden!important}.stage>canvas#cv,.stage>#cv3{width:960px!important;height:540px!important;aspect-ratio:auto!important}`});
  await page.waitForTimeout(700);
  const actionId={Fight:'cross',Race:'gas',Kick:'go'}[lab],action=page.locator(`#pad [data-id="${actionId}"]`).last();
  const press=async hold=>{await action.evaluate(button=>button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true})));await page.waitForTimeout(hold);await action.evaluate(button=>button.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true})));};
  await press(lab==='Race'?2800:140);
  await page.waitForTimeout(lab==='Race'?1200:1100);
  if(lab!=='Race'&&await action.isEnabled())await press(140);
  await page.waitForTimeout(lab==='Race'?800:2100);
  const recorded=page.video();await page.close();await context.close();const rawVideo=await recorded.path();
  const external=[...new Set(requests.filter(url=>{try{return new URL(url).hostname!=='127.0.0.1';}catch{return true;}}))];
  if(errors.length||external.length)throw new Error(`${lab} capture failed: ${errors.join(' | ')} ${external.join(' | ')}`);
  const mp4=join(outputDir,`${slug}.mp4`),poster=join(outputDir,`${slug}-poster.png`);
  const transcode=spawnSync('ffmpeg',['-y','-sseof','-4.0','-i',rawVideo,'-t','3.8','-vf','scale=640:360:flags=lanczos','-r','30','-c:v','libx264','-profile:v','main','-level','3.1','-crf','25','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});
  if(transcode.status!==0)throw new Error(`${lab} MP4 encode failed: ${transcode.stderr}`);
  const posterResult=spawnSync('ffmpeg',['-y','-ss','1.2','-i',mp4,'-frames:v','1',poster],{encoding:'utf8'});
  if(posterResult.status!==0)throw new Error(`${lab} poster encode failed: ${posterResult.stderr}`);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});
  if(probe.status!==0)throw new Error(`${lab} probe failed: ${probe.stderr}`);
  const frameHashes=spawnSync('ffmpeg',['-v','error','-i',mp4,'-vf','fps=3','-f','framemd5','pipe:1'],{encoding:'utf8'});
  const uniqueFrames=new Set(frameHashes.stdout.split('\n').filter(line=>line&&!line.startsWith('#')).map(line=>line.split(',').at(-1)?.trim())).size;
  const metadata=JSON.parse(probe.stdout),bytes=statSync(mp4).size;
  if(bytes<20_000||statSync(poster).size<4_000||Number(metadata.format?.duration||0)<3||uniqueFrames<4)throw new Error(`${lab} preview validation failed (${bytes} bytes, ${metadata.format?.duration}s, ${uniqueFrames} frames)`);
  clips.push({lab,revision,source:'Current local KickLab renderer',mp4:`media/home-previews/${slug}.mp4`,poster:`media/home-previews/${slug}-poster.png`,bytes,uniqueFrames,...metadata});
}

await browser.close();
writeFileSync(join(outputDir,'manifest.json'),`${JSON.stringify({schemaVersion:1,privacy:'local renderer only; no external requests; no audio',clips},null,2)}\n`);
rmSync(rawDir,{recursive:true,force:true});
console.log(JSON.stringify({outputDir,clips},null,2));
