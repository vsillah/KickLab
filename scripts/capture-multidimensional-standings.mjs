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
const output=resolve('qa-artifacts/multidimensional-standings'),raw=join(output,'raw');rmSync(raw,{recursive:true,force:true});mkdirSync(raw,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const origin=new URL(root).origin,external=new Set(),errors=[];
const players=[['alpha','QA Amina',800,2],['beta','QA Binta',800,2],['gamma','QA Camara',500,3],['delta','QA Dara',50,0]];
const seed={version:1,activeId:'gamma',legacyProfileId:'alpha',profiles:players.map(([id,nickname,xp,awards],index)=>({id,nickname,avatar:['rocket','wiz','tower','trick'][index],color:['sky','mint','sun','coral'][index],progress:{xp,badges:Object.fromEntries(Array.from({length:awards},(_,award)=>[`qa-award-${award}`,1]))},needsSetup:false,createdAt:index,updatedAt:index}))};
const layouts=[['phone',390,844],['tablet',768,1024],['desktop',1440,900]],segments=[];
try{
  for(const [label,width,height] of layouts){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',recordVideo:{dir:raw,size:{width,height}}});
    await context.addInitScript(value=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify(value)),seed);
    const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));page.on('request',request=>{const url=request.url();if(/^https?:/.test(url)&&new URL(url).origin!==origin)external.add(url);});
    const route=`${root}/kicklab.html?qa=multidimensional-video&rev=${revision}&viewport=${label}`;
    const response=await page.goto(route,{waitUntil:'domcontentloaded'});if(!response?.ok())throw new Error(`${label}: route failed`);
    await page.locator('#modeHome').waitFor({state:'visible'});if(await page.locator('#homeStandingsRows tr').count()!==4)throw new Error(`${label}: expected four synthetic players`);
    const before=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));
    for(const [metric,rank] of [['points','QA Amina'],['level','QA Amina'],['awards','QA Camara'],['points','QA Amina']]){
      if(metric!=='points'||await page.locator('[data-standing-rank="points"]').getAttribute('aria-pressed')!=='true')await page.locator(`[data-standing-rank="${metric}"]`).click();
      if(await page.locator('#homeStandingsRows tr:first-child .standings-player b').textContent()!==rank)throw new Error(`${label}: ${metric} ranking failed`);
      if(await page.locator(`[data-standing-rank="${metric}"]`).getAttribute('aria-pressed')!=='true')throw new Error(`${label}: ${metric} not visibly selected`);
      await page.waitForTimeout(1600);
    }
    if(await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'))!==before)throw new Error(`${label}: ranking changed saved profile data`);
    const source=page.video();await context.close();const sourcePath=await source.path();const segment=join(output,`${label}-${revision.slice(0,12)}.mp4`);
    const filter='scale=w=1800:h=990:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x050a16,fps=30';
    const encoded=spawnSync('ffmpeg',['-y','-v','error','-i',sourcePath,'-vf',filter,'-an','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',segment],{encoding:'utf8'});
    if(encoded.status!==0)throw new Error(`${label}: encode failed: ${encoded.stderr}`);segments.push(segment);console.log(`${label}: ${segment}`);
  }
  if(errors.length||external.size)throw new Error(`Browser errors or runtime egress: ${JSON.stringify({errors,external:[...external]})}`);
  const list=join(output,'segments.txt');writeFileSync(list,segments.map(path=>`file '${path.replaceAll("'","'\\''")}'`).join('\n')+'\n');
  const final=join(output,`kicklab-multidimensional-standings-${revision.slice(0,12)}.mp4`);
  const joined=spawnSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',final],{encoding:'utf8'});if(joined.status!==0)throw new Error(`MP4 concat failed: ${joined.stderr}`);
  const probed=spawnSync('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,nb_frames','-of','json',final],{encoding:'utf8'});if(probed.status!==0)throw new Error(`MP4 probe failed: ${probed.stderr}`);
  const media=JSON.parse(probed.stdout);if(Number(media.format.duration)<18||Number(media.format.size)<100000||media.streams[0]?.codec_name!=='h264')throw new Error(`MP4 invalid: ${JSON.stringify(media)}`);
  rmSync(raw,{recursive:true,force:true});console.log(JSON.stringify({revision,route:root,final,media,segments},null,2));
}finally{await browser.close();}
