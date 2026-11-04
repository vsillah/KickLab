import { createRequire } from 'node:module';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const revision=process.argv[2],root=process.argv[3]||'http://127.0.0.1:4202';
if(!/^[a-f0-9]{40}$/.test(revision||''))throw new Error('Pass the exact 40-character HEAD commit.');
const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
if(head!==revision)throw new Error(`HEAD ${head} differs from requested ${revision}`);
const output=resolve('qa-artifacts/identity-header'),raw=join(output,'raw');rmSync(raw,{recursive:true,force:true});mkdirSync(raw,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const origin=new URL(root).origin,external=new Set(),errors=[];
const layouts=[['phone-portrait',390,844],['phone-landscape',844,390],['tablet',768,1024],['desktop',1440,900]];
const segments=[];
async function hold(page,ms=850){await page.waitForTimeout(ms);}
try{
 for(const [label,width,height] of layouts){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',recordVideo:{dir:raw,size:{width,height}}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));page.on('request',request=>{const url=request.url();if(/^https?:/.test(url)&&new URL(url).origin!==origin)external.add(url);});
  const route=`${root}/kicklab.html?qa=identity-header-video&rev=${revision}&viewport=${label}`;
  await page.goto(route,{waitUntil:'domcontentloaded'});await page.locator('#modeHome').waitFor({state:'visible'});await hold(page,1200);
  if(await page.locator('#introContinue').isVisible()){await page.locator('#introContinue').click();await page.locator('#profileForm').waitFor({state:'visible'});await hold(page,750);await page.locator('#profileNickname').fill('QA Player');await page.locator('#profileFormSave').click();await page.locator('#profileForm').waitFor({state:'hidden'});await page.locator('#profileClose').click();}
  await hold(page,1100);
  for(const mode of ['fight','race','kick']){await page.locator(`#lab-tab-${mode}`).click();await page.locator('#game-cockpit').waitFor({state:'visible'});if(mode==='race'&&await page.locator('#racePreflight').isVisible())await page.locator('#racePreflightClose').click();await hold(page,1500);if(mode!=='kick'){await page.goto(route,{waitUntil:'domcontentloaded'});await page.locator('#modeHome').waitFor({state:'visible'});await hold(page,450);}}
  const source=page.video();await context.close();const sourcePath=await source.path();const segment=join(output,`${label}-${revision.slice(0,12)}.mp4`);
  const filter='scale=w=1800:h=990:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x050a16,fps=30';
  const encode=spawnSync('ffmpeg',['-y','-v','error','-i',sourcePath,'-vf',filter,'-an','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',segment],{encoding:'utf8'});
  if(encode.status!==0)throw new Error(`${label} encode failed: ${encode.stderr}`);
  segments.push(segment);console.log(`${label}: ${segment}`);
 }
 if(errors.length||external.size)throw new Error(`Browser errors or runtime egress: ${JSON.stringify({errors,external:[...external]})}`);
 const list=join(output,'segments.txt');writeFileSync(list,segments.map(path=>`file '${path.replaceAll("'","'\\''")}'`).join('\n')+'\n');
 const final=join(output,`kicklab-identity-header-${revision.slice(0,12)}.mp4`);
 const joinVideo=spawnSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',final],{encoding:'utf8'});if(joinVideo.status!==0)throw new Error(`MP4 concat failed: ${joinVideo.stderr}`);
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration,size','-of','json',final],{encoding:'utf8'});if(probe.status!==0)throw new Error(`MP4 probe failed: ${probe.stderr}`);
 const media=JSON.parse(probe.stdout).format;if(Number(media.duration)<15||Number(media.size)<100000)throw new Error(`MP4 invalid: ${JSON.stringify(media)}`);
 rmSync(raw,{recursive:true,force:true});console.log(JSON.stringify({revision,route:root,final,media,segments},null,2));
}finally{await browser.close();}
