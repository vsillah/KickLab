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

async function run(name,width,height,{coaching=true,reduced=false,record=false,defaultOff=false,style='classic'}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',...(record?{recordVideo:{dir:out,size:{width,height}}}:{})});
  await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
  const videoStart=Date.now(),page=await context.newPage(),video=record?page.video():null,url=new URL(base);
  if(!defaultOff)for(const [key,value] of Object.entries({raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',raceSimulator:'prototype',...(coaching?{raceCoaching:'prototype'}:{})}))url.searchParams.set(key,value);
  url.searchParams.set('raceShiftQA','1');url.searchParams.set('rev',head);
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${target}`);return route.abort();});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const skip=page.locator('.race-orbit-panel button');
    if(!defaultOff){
      await skip.waitFor({state:'visible',timeout:20000});
      await page.waitForFunction(()=>window.__KICKLAB_RACE_SHIFT_QA__?.lifecycle().setupHidden,null,{timeout:3000});
      const orbit=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.lifecycle());
      check(orbit.orbit==='orbit'&&orbit.deckHidden&&orbit.setupHidden,`${name}: orbit exposed gameplay controls ${JSON.stringify(orbit)}`);
      if(record)await page.screenshot({path:join(out,`${name}-orbit.png`)});
      const blocked=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.blockedGas());
      check(blocked.phase==='grid'&&!blocked.gas,`${name}: orbit accepted gas input`);
      if(style!=='classic'){
        const selected=await page.evaluate(value=>window.__KICKLAB_RACE_SHIFT_QA__.selectStyle(value),style);
        check(selected.deckHidden,`${name}: switching controller exposed orbit inputs`);
      }
      if(record){report.clips.push({name,trim:Math.max(0,(Date.now()-videoStart)/1000-.35)});await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done,null,{timeout:20000});}
      else await skip.click();
    }else if(await skip.isVisible())await skip.click();
    if(defaultOff){check(await page.locator('#raceActionDial').isHidden(),'default-off dial visible');await page.screenshot({path:join(out,`${name}.png`)});report.cases.push({name,width,height,defaultOff:true,url:url.toString(),checks:1});await context.close();return;}
    const start=page.locator(style==='simulator'?'#simStart':'#raceCoachSetupStart');await start.waitFor({state:'visible',timeout:20000});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_SHIFT_QA__?.lifecycle().deckClasses.includes('race-setup-preview'),null,{timeout:3000});
    const setup=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.lifecycle());
    check(setup.deckClasses.includes('race-setup-preview')&&!setup.setupHidden&&setup.orbitDone,`${name}: setup did not replace orbit ${JSON.stringify(setup)}`);
    if(record)await page.screenshot({path:join(out,`${name}-setup.png`)});
    await start.click();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_SHIFT_QA__?.lifecycle().phase==='count',null,{timeout:3000});
    const count=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.lifecycle());
    check(!count.gas&&!count.brake&&count.preview==='true'&&count.gasDisabled,`${name}: countdown controls accepted input ${JSON.stringify(count)}`);
    if(record)await page.screenshot({path:join(out,`${name}-countdown.png`)});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_SHIFT_QA__?.state()?.phase==='run'&&window.__KICKLAB_RACE_3D__?.status==='rendering',null,{timeout:10000});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_SHIFT_QA__?.lifecycle().preview==='false',null,{timeout:3000});
    const go=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.lifecycle());
    check(go.controller===style&&go.preview==='false',`${name}: GO did not activate ${style} dial ${JSON.stringify(go)}`);
    await page.locator('.stage').scrollIntoViewIfNeeded();
    const row={name,width,height,coaching,reduced,style,url:url.toString(),checks:[],realShifts:[]};
    if(record){
      const actionBox=await page.locator('#raceDialAction').boundingBox();check(actionBox,`${name}: Shift action lacks a hit target`);
      await page.keyboard.down('Space');
      for(const gear of [1,2,3]){
        await page.waitForFunction(gear=>{const s=window.__KICKLAB_RACE_SHIFT_QA__?.state();return s?.gear===gear&&s.selected==='shift'&&s.gauge==='OPT'&&s.ratio>=s.window.ideal;},gear,{timeout:18000});
        const before=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.state());
        check(before.gear===gear&&before.gauge==='OPT'&&!before.available.includes('finish-handbrake'),`${name}: G${gear} shift lost priority ${JSON.stringify(before)}`);
        await page.mouse.click(actionBox.x+actionBox.width/2,actionBox.y+actionBox.height/2);
        const after=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.state());
        check(after.gear===gear+1&&after.lastShift==='optimal',`${name}: G${gear} real shift not scored optimal ${JSON.stringify(after)}`);
        row.realShifts.push({before,after});
      }
      check(row.realShifts[2].after.x<210,`${name}: final shift has no finish approach room`);
      await page.waitForFunction(()=>window.__KICKLAB_RACE_SHIFT_QA__?.state()?.selected==='finish-handbrake',null,{timeout:9000});
      row.finisher=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.state());
      check(row.finisher.gear===4&&row.finisher.x<240,`${name}: finisher failed to take over after final shift`);
      await page.keyboard.up('Space');
      await page.waitForTimeout(550);
      await page.evaluate(()=>{const caption=document.createElement('div');caption.id='raceActionQACaption';caption.textContent='Action cycling · QA fixture';Object.assign(caption.style,{position:'fixed',zIndex:'9999',left:'12px',bottom:'12px',padding:'7px 10px',borderRadius:'8px',background:'#061b2bef',color:'#fff',font:'bold 13px sans-serif'});document.body.appendChild(caption);});
      const two=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.actionDemo('two'));
      check(two.available==='shift,nos',`${name}: two-action demo unavailable ${JSON.stringify(two)}`);
      await page.waitForTimeout(650);await page.screenshot({path:join(out,`${name}-action-cycle.png`)});
      const next=page.locator('#raceDialNext');check(await next.getAttribute('aria-label')==='Next action: NOS',`${name}: adjacent icon does not preview NOS`);
      await next.click();await page.waitForTimeout(650);
      check((await page.locator('#raceActionDial').getAttribute('data-selected'))==='nos',`${name}: cycling did not choose NOS`);
      await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.actionDemo('one'));await page.waitForTimeout(650);
      check(await next.isHidden(),`${name}: one-action cycling remained visible`);
      await page.evaluate(()=>document.querySelector('#raceActionQACaption').remove());
    }
    if(!record)for(const gear of [1,2,3]){
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
    if(!record&&!defaultOff){
      const actionCases=await page.evaluate(()=>window.__KICKLAB_RACE_SHIFT_QA__.actionCases());
      check(actionCases.one.available==='shift'&&actionCases.one.previous.hidden&&actionCases.one.next.hidden,`${name}: one-action cycling visible ${JSON.stringify(actionCases.one)}`);
      check(actionCases.two.available==='shift,nos'&&actionCases.two.next.action==='nos'&&actionCases.two.next.icon==='⚡'&&actionCases.two.next.label==='Next action: NOS',`${name}: two-action preview mismatch ${JSON.stringify(actionCases.two)}`);
      check(actionCases.cycled.selected==='nos'&&actionCases.cycled.previous.action==='shift'&&actionCases.cycled.previous.icon==='⇧'&&actionCases.cycled.previous.label==='Previous action: Shift G2',`${name}: cycling target mismatch ${JSON.stringify(actionCases.cycled)}`);
      check(actionCases.changed.selected==='shift'&&actionCases.changed.previous.hidden&&actionCases.changed.next.hidden,`${name}: changing action list did not hide cycling ${JSON.stringify(actionCases.changed)}`);
      check(actionCases.finish.available==='finish-handbrake,nos'&&actionCases.finish.selected==='finish-handbrake'&&actionCases.finish.next.action==='nos'&&actionCases.finish.next.icon==='⚡',`${name}: finisher takeover preview mismatch ${JSON.stringify(actionCases.finish)}`);
      row.actionCases=actionCases;
    }
    const box=await page.locator('#raceActionDial').boundingBox();check(box&&box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,`${name}: dial outside viewport ${JSON.stringify(box)}`);
    check((await page.evaluate(()=>Object.keys(localStorage).sort())).every(key=>['impactlab.nick','impactlab.v1','kicklab.profiles.v1'].includes(key)),`${name}: new storage key`);
    report.cases.push(row);await context.close();if(record)report.clips.find(clip=>clip.name===name).path=await video.path();
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);await context.close().catch(()=>{});}
}

for(const [name,width,height,options] of [
  ['flagged-phone',390,844,{record:true}],['flagged-tablet-reduced',768,1024,{reduced:true}],['flagged-laptop',1113,988,{}],['flagged-desktop',1440,900,{record:true}],
  ['flagged-phone-analog',390,844,{style:'analog'}],['flagged-tablet-simulator',768,1024,{style:'simulator'}],['flagged-desktop-simulator',1440,900,{style:'simulator'}],
  ['unflagged-phone',390,844,{coaching:false}],['unflagged-tablet',768,1024,{coaching:false}],['unflagged-desktop',1440,900,{coaching:false}],
  ['default-off-phone',390,844,{defaultOff:true}]
].filter(([name])=>!process.env.KICKLAB_QA_CASE||name===process.env.KICKLAB_QA_CASE))await run(name,width,height,options);
await browser.close();
if(report.clips.length===2&&!report.errors.length&&!report.external.length){
  const parts=[];for(const [i,clip] of report.clips.entries()){const target=join(out,`${i+1}.mp4`),encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-ss',String(clip.trim),'-i',clip.path,'-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2','-r','30','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',target],{encoding:'utf8'});if(encoded.status!==0){report.errors.push(encoded.stderr);break;}parts.push(target);}
  if(!report.errors.length){const list=join(out,'concat.txt');writeFileSync(list,parts.map(path=>`file '${path}'`).join('\n')+'\n');const target=join(out,`race-shift-window-${head.slice(0,12)}.mp4`),encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',target],{encoding:'utf8'});if(encoded.status!==0)report.errors.push(encoded.stderr);else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',target],{encoding:'utf8'});report.media={path:target,bytes:statSync(target).size,probe:JSON.parse(probe.stdout)};if(report.media.bytes<100000||Number(report.media.probe.format.duration)<8)report.errors.push('MP4 failed playback gate');}}
}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({head,cases:report.cases.map(({name,checks,realShifts,finisher})=>({name,checks:checks.length,realShifts:realShifts?.length||0,finisher:finisher?.x})),media:report.media,errors:report.errors,external:report.external},null,2));if(report.errors.length||report.external.length||!process.env.KICKLAB_QA_CASE&&!report.media)process.exitCode=1;
