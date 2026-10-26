import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const base=process.argv[2]||'http://127.0.0.1:5379/';
const out=resolve(process.argv[3]||`qa-artifacts/race-shift-window/${head.slice(0,12)}`);
mkdirSync(out,{recursive:true});
const report={head,base,cases:[],errors:[],external:[],clips:[]};
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const check=(condition,message)=>{if(!condition)throw new Error(message);};

async function run(name,width,height,{coaching=true,reduced=false,record=false,defaultOff=false}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',...(record?{recordVideo:{dir:out,size:{width,height}}}:{})});
  await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
  const page=await context.newPage(),video=record?page.video():null,url=new URL(base);
  if(!defaultOff)for(const [key,value] of Object.entries({raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',...(coaching?{raceCoaching:'prototype'}:{})}))url.searchParams.set(key,value);
  url.searchParams.set('raceShiftQA','1');url.searchParams.set('rev',head.slice(0,12));
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${target}`);return route.abort();});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
    if(defaultOff){check(await page.locator('#raceActionDial').isHidden(),'default-off dial visible');await page.screenshot({path:join(out,`${name}.png`)});report.cases.push({name,width,height,defaultOff:true,url:url.toString(),checks:1});await context.close();return;}
    const start=page.locator('#raceCoachSetupStart');await start.waitFor({state:'visible',timeout:20000});
    const deadline=Date.now()+45000;while(Date.now()<deadline){if(await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__?.state()?.phase==='run'&&window.__KICKLAB_RACE_3D__?.status==='rendering'))break;if(await start.isVisible()&&await start.isEnabled())await start.click();await page.waitForTimeout(500);}
    await page.waitForFunction(()=>window.__KICKLAB_RACE_SHIFT_QA__?.state()?.phase==='run'&&window.__KICKLAB_RACE_3D__?.status==='rendering',null,{timeout:1000});
    await page.locator('.stage').scrollIntoViewIfNeeded();
    const row={name,width,height,coaching,reduced,url:url.toString(),checks:[],realShift:null};
    if(record){
      const actionBox=await page.locator('#raceDialAction').boundingBox();check(actionBox,`${name}: Shift action lacks a hit target`);
      await page.keyboard.down('Space');
      await page.waitForFunction(()=>{const s=window.__KICKLAB_RACE_SHIFT_QA__?.state();return s?.selected==='shift'&&s.gauge==='OPT'&&s.ratio>=s.window.low+.025;},null,{timeout:18000});
      const before=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.state());
      check(before.gear===1&&before.gauge==='OPT',`${name}: real shift missed live OPT window ${JSON.stringify(before)}`);
      await page.mouse.click(actionBox.x+actionBox.width/2,actionBox.y+actionBox.height/2);
      await page.keyboard.up('Space');
      const after=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.state());
      check(after.gear===2&&after.lastShift==='optimal',`${name}: real shift not scored optimal ${JSON.stringify(after)}`);
      row.realShift={before,after};await page.waitForTimeout(600);
    }
    for(const gear of [1,2,3]){
      const band=await page.evaluate(gear=>window.KickLabRaceModes.shiftWindow(gear),gear);
      for(const [ratio,phase,timing,action] of [[band.low-.02,'LOW','early','build'],[band.ideal,'OPT','optimal','act'],[band.high+.02,'RED','late','danger']]){
        const view=await page.evaluate(({gear,ratio})=>window.__KICKLAB_RACE_SHIFT_QA__.fixture(gear,ratio),{gear,ratio});
        check(view?.phase===phase&&view.timing===timing&&view.scored===timing,`${name}: G${gear} ${phase} mismatch ${JSON.stringify(view)}`);
        check(view.action===action&&view.selected==='shift',`${name}: G${gear} action mismatch ${JSON.stringify(view)}`);
        check(view.metric.includes('RPM')&&view.aria.includes(`Gear ${gear}`)&&view.aria.includes(phase)&&view.aria.includes('Canonical shift window'),`${name}: G${gear} accessible RPM mismatch ${JSON.stringify(view)}`);
        check(view.ghost===(coaching&&phase==='OPT'),`${name}: G${gear} ghost mismatch ${JSON.stringify(view)}`);
        check((view.pulse==='race-shift-opt')===(phase==='OPT'&&!reduced),`${name}: G${gear} pulse mismatch ${JSON.stringify(view)}`);
        row.checks.push({gear,phase,metric:view.metric,aria:view.aria,ghost:view.ghost,pulse:view.pulse,needle:view.needle,band:view.band});
        if(gear===1)await page.screenshot({path:join(out,`${name}-${phase.toLowerCase()}.png`)});
      }
    }
    const box=await page.locator('#raceActionDial').boundingBox();check(box&&box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,`${name}: dial outside viewport ${JSON.stringify(box)}`);
    check((await page.evaluate(()=>Object.keys(localStorage).sort())).every(key=>['impactlab.nick','impactlab.v1','kicklab.profiles.v1'].includes(key)),`${name}: new storage key`);
    report.cases.push(row);await context.close();if(record)report.clips.push({name,path:await video.path()});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);await context.close().catch(()=>{});}
}

for(const [name,width,height,options] of [
  ['flagged-phone',390,844,{record:true}],['flagged-tablet-reduced',768,1024,{reduced:true}],['flagged-desktop',1440,900,{record:true}],
  ['unflagged-phone',390,844,{coaching:false}],['unflagged-tablet',768,1024,{coaching:false}],['unflagged-desktop',1440,900,{coaching:false}],
  ['default-off-phone',390,844,{defaultOff:true}]
])await run(name,width,height,options);
await browser.close();
if(report.clips.length===2&&!report.errors.length&&!report.external.length){
  const parts=[];for(const [i,clip] of report.clips.entries()){const target=join(out,`${i+1}.mp4`),encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-i',clip.path,'-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2','-r','30','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',target],{encoding:'utf8'});if(encoded.status!==0){report.errors.push(encoded.stderr);break;}parts.push(target);}
  if(!report.errors.length){const list=join(out,'concat.txt');writeFileSync(list,parts.map(path=>`file '${path}'`).join('\n')+'\n');const target=join(out,`race-shift-window-${head.slice(0,12)}.mp4`),encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',target],{encoding:'utf8'});if(encoded.status!==0)report.errors.push(encoded.stderr);else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',target],{encoding:'utf8'});report.media={path:target,bytes:statSync(target).size,probe:JSON.parse(probe.stdout)};if(report.media.bytes<100000||Number(report.media.probe.format.duration)<8)report.errors.push('MP4 failed playback gate');}}
}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({head,cases:report.cases.map(({name,checks,realShift})=>({name,checks:checks.length,realShift})),media:report.media,errors:report.errors,external:report.external},null,2));if(report.errors.length||report.external.length||!report.media)process.exitCode=1;
