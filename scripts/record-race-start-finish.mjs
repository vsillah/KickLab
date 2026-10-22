import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5864/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-start-finish/walkthrough'),head=process.env.KICKLAB_QA_HEAD||'qa';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,views:[],errors:[],external:[],video:null};
async function record(label,width,height){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:{dir:out,size:{width,height}}}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${label}: ${url}`);route.abort();});
  const url=new URL(base);url.searchParams.set('raceCornerTrace','prototype');url.searchParams.set('rev',head);
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const toast=page.locator('.toast-close:visible').first();if(await toast.count())await toast.evaluate(button=>button.click());
    await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:10000});
    await page.waitForTimeout(650);
    await page.click('.race-orbit-panel button');
    await page.waitForFunction(()=>window.__KICKLAB_RACE_START_LIGHTS__?.phase==='3',null,{timeout:12000});
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:12000});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run'&&window.__KICKLAB_RACE_NAVIGATION__?.visible,null,{timeout:7000});
    await page.waitForTimeout(350);
    if(!await page.evaluate(()=>window.__KICKLAB_RACE_START_FINISH_QA__.approach()))throw new Error('Finish approach fixture refused');
    await page.waitForFunction(()=>window.__KICKLAB_RACE_NAVIGATION__?.finishVisible,null,{timeout:5000});
    await page.waitForTimeout(1700);
    if(!await page.evaluate(()=>window.__KICKLAB_RACE_START_FINISH_QA__.cross()))throw new Error('Finish crossing fixture refused');
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='done',null,{timeout:5000});
    await page.waitForTimeout(900);
    report.views.push({label,width,height,url:url.toString(),finish:await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.finish),raw:null});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);}finally{await context.close();const view=report.views.find(item=>item.label===label);if(view)view.raw=await page.video().path();}
}
try{await record('phone390',390,844);await record('mid942',942,958);await record('desktop1440',1440,900);}finally{await browser.close();}
if(report.views.length===3&&!report.errors.length){
  const video=join(out,'race-start-finish-phone-mid-desktop.mp4');
  const encode=spawnSync('ffmpeg',['-y','-loglevel','error','-i',report.views[0].raw,'-i',report.views[1].raw,'-i',report.views[2].raw,'-filter_complex','[0:v]scale=414:900:flags=lanczos,setsar=1[phone];[1:v]scale=1200:900:force_original_aspect_ratio=decrease,pad=1200:900:(ow-iw)/2:(oh-ih)/2:color=0x071526,setsar=1[mid];[2:v]scale=1280:900:force_original_aspect_ratio=decrease,pad=1280:900:(ow-iw)/2:(oh-ih)/2:color=0x071526,setsar=1[desktop];[phone][mid][desktop]hstack=inputs=3:shortest=1[out]','-map','[out]','-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',video],{encoding:'utf8'});
  if(encode.status!==0)report.errors.push(`ffmpeg: ${encode.stderr}`);else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames','-of','json',video],{encoding:'utf8'});if(probe.status!==0)report.errors.push(`ffprobe: ${probe.stderr}`);else{report.video=video;report.probe=JSON.parse(probe.stdout);}}
}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,video:report.video,probe:report.probe,views:report.views.map(({label,finish})=>({label,finish})),errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
