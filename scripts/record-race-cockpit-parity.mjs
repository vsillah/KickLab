import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const baseline='733f7bfbb3c483b18ca2d65abb011a093692c996';
const current=process.argv[2]||'http://127.0.0.1:5289/kicklab.html';
const old=process.argv[3]||'http://127.0.0.1:5290/kicklab.html';
const out=resolve(process.argv[4]||'qa-artifacts/cockpit-parity/video');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,baseline,clips:[],errors:[],externalRequests:[]};
const scenarios=[['baseline-laptop',old,1113,988],['corrected-laptop',current,1113,988],['corrected-desktop',current,1440,900],['corrected-phone',current,390,844]];
for(const [name,base,width,height] of scenarios){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:{dir:out,size:{width,height}}});
 await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
 await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.externalRequests.push(`${name}: ${url}`);route.abort();}});
 try{
  const url=new URL(base);for(const key of ['raceExpansion','raceCompetition','raceChampionship','raceSimulator','raceCornerTrace','raceTelemetry'])url.searchParams.set(key,'prototype');url.searchParams.set('rev',name.startsWith('baseline')?baseline:head);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();await page.locator('#raceStageStart').waitFor({state:'visible',timeout:20000});
  if(name.startsWith('baseline')){
   await page.locator('#raceChampionship').scrollIntoViewIfNeeded();await page.waitForTimeout(1300);
   await page.click('#raceChampionshipToggle');await page.waitForTimeout(1700);
   await page.locator('.stage').scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
  }else{
   await page.locator('.stage').scrollIntoViewIfNeeded();await page.waitForTimeout(700);
   await page.click('#racePhoneProgress');await page.waitForTimeout(1100);await page.click('[data-close-detail="orientation"]');
   await page.click('#raceCoachSetupStart');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:25000});await page.waitForTimeout(900);
   await page.click('#racePhoneToolsToggle');await page.waitForTimeout(1200);await page.click('#racePhoneToolsToggle');
   if(width>480){await page.click('#analogControlsButton');await page.waitForTimeout(650);await page.click('#classicControlsButton');}
   await page.waitForTimeout(1000);
  }
  const path=await page.video().path();await context.close();report.clips.push({name,width,height,url:url.toString(),source:path});
 }catch(error){report.errors.push(`${name}: ${error.message}`);await context.close();break;}
}
await browser.close();
if(!report.errors.length&&!report.externalRequests.length){
 const parts=[];
 for(const [index,clip] of report.clips.entries()){
  const target=join(out,`${String(index+1).padStart(2,'0')}-${clip.name}.mp4`);
  const filter='scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
  const run=spawnSync('ffmpeg',['-y','-loglevel','error','-i',clip.source,'-vf',filter,'-r','30','-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',target],{encoding:'utf8'});
  if(run.status!==0){report.errors.push(`${clip.name} encode: ${run.stderr}`);break;}parts.push(target);
 }
 if(!report.errors.length){
  const list=join(out,'concat.txt');writeFileSync(list,parts.map(path=>`file '${path}'`).join('\n')+'\n');const target=join(out,`race-cockpit-parity-${head.slice(0,12)}.mp4`);
  const run=spawnSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',target],{encoding:'utf8'});
  if(run.status!==0)report.errors.push(`concat: ${run.stderr}`);else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',target],{encoding:'utf8'});report.final={path:target,bytes:statSync(target).size,probe:JSON.parse(probe.stdout)};}
 }
}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({head,clips:report.clips.map(clip=>clip.name),final:report.final,errors:report.errors,externalRequests:report.externalRequests}));if(report.errors.length||report.externalRequests.length)process.exitCode=1;
