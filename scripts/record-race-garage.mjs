import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5865/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-garage/walkthrough'),head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,views:[],errors:[],external:[],video:null};
async function record(label,width,height,{analog=false}={}){
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
    await page.locator('.stage:visible').first().evaluate(element=>element.scrollIntoView({block:'start'}));
    const toast=page.locator('.toast-close:visible').first();if(await toast.count())await toast.evaluate(button=>button.click());
    await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:10000});await page.click('.race-orbit-panel button');
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:15000});
    if(analog)await page.click('#analogControlsButton');
    await page.click('#orientationDetailToggle');await page.locator('#raceGarageShortcut').waitFor({state:'visible'});await page.waitForTimeout(950);
    await page.click('#raceGarageShortcut');await page.locator('#raceGarage').waitFor({state:'visible'});await page.waitForTimeout(650);
    const before=await page.evaluate(()=>window.__KICKLAB_RACE_GARAGE_QA__.read());
    const suspension=[];
    for(const [field,value] of [['suspension','soft'],['suspension','firm'],['body','race'],['tires','wide'],['brakes','sport']]){
      await page.click(`#raceGarage [data-garage-section="${field}"]`);
      await page.click(`#raceGarage [data-garage-part="${field}"][data-garage-value="${value}"]`);
      if(field==='suspension')suspension.push(await page.evaluate(()=>({choice:window.__KICKLAB_RACE_GARAGE__.build.suspension,current:window.__KICKLAB_RACE_GARAGE__.current,summary:document.querySelector('#raceGarageSummary').innerText,visible:document.querySelector('#raceGarageSummary').getBoundingClientRect().bottom<=innerHeight+1})));
      await page.waitForTimeout(field==='suspension'?900:650);
    }
    if(suspension.length!==2||suspension.some(item=>!item.visible)||!(suspension[0].current.steeringResponse<suspension[1].current.steeringResponse)||!(suspension[0].current.slideRecovery>suspension[1].current.slideRecovery))throw new Error(`Suspension comparison missing in video: ${JSON.stringify(suspension)}`);
    const after=await page.evaluate(()=>window.__KICKLAB_RACE_GARAGE_QA__.read());
    if(after.parameters.mu<=before.parameters.mu||after.parameters.brakePower<=before.parameters.brakePower||after.parameters.m===before.parameters.m)throw new Error('Garage parts did not change live parameters');
    await page.waitForTimeout(450);await page.click('#settingsClose');
    const coachToast=page.locator('#toasts .toast').filter({hasText:'Coach Nia'}).last();await coachToast.waitFor({state:'visible'});await page.waitForTimeout(800);
    await coachToast.getByRole('button',{name:'Open Coach'}).click();await page.locator('#garageCoachDetail').waitFor({state:'visible'});await page.waitForTimeout(1100);
    await page.locator('#learnDetail [data-close-detail]').click();await page.waitForTimeout(350);await page.evaluate(()=>document.activeElement?.blur());
    await page.keyboard.down('Space');await page.keyboard.down('ArrowRight');await page.waitForTimeout(1450);await page.keyboard.up('ArrowRight');await page.keyboard.up('Space');await page.waitForTimeout(650);
    const drive=await page.evaluate(()=>({garage:window.__KICKLAB_RACE_GARAGE_QA__.read(),telemetry:window.__KICKLAB_RACE_TELEMETRY__,trace:window.__KICKLAB_RACE_CORNER_TRACE__}));
    if(drive.garage.velocity<=0||!drive.telemetry?.enabled||!drive.trace)throw new Error(`Driving response missing: ${JSON.stringify(drive).slice(0,500)}`);
    report.views.push({label,width,height,url:url.toString(),before,suspension,after,drive,raw:null});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);}finally{await context.close();const view=report.views.find(item=>item.label===label);if(view)view.raw=await page.video().path();}
}
try{await record('phone390',390,844,{analog:true});await record('desktop1440',1440,900);}finally{await browser.close();}
if(report.views.length===2&&!report.errors.length){
  const video=join(out,'race-garage-phone-desktop.mp4');
  const encode=spawnSync('ffmpeg',['-y','-loglevel','error','-i',report.views[0].raw,'-i',report.views[1].raw,'-filter_complex','[0:v]scale=416:900:flags=lanczos,setsar=1[phone];[1:v]scale=1280:900:force_original_aspect_ratio=decrease,pad=1280:900:(ow-iw)/2:(oh-ih)/2:color=0x071526,setsar=1[desktop];[phone][desktop]hstack=inputs=2:shortest=1[out]','-map','[out]','-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',video],{encoding:'utf8'});
  if(encode.status!==0)report.errors.push(`ffmpeg: ${encode.stderr}`);else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames','-of','json',video],{encoding:'utf8'});if(probe.status!==0)report.errors.push(`ffprobe: ${probe.stderr}`);else{report.video=video;report.probe=JSON.parse(probe.stdout);}}
}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,video:report.video,probe:report.probe,views:report.views.map(({label,before,after,drive})=>({label,before:before.build,after:after.build,velocity:drive.garage.velocity})),errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
