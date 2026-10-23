import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5884/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-multiplayer');
const head=process.env.KICKLAB_QA_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const profiles={version:1,activeId:'seat-a',legacyProfileId:'seat-a',profiles:[{id:'seat-a',nickname:'Racer A',avatar:'rocket',color:'sky',progress:{}},{id:'seat-b',nickname:'Racer B',avatar:'wiz',color:'mint',progress:{}}]};
const context=await browser.newContext({viewport:{width:1113,height:900},deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:{dir:output,size:{width:1113,height:900}}});
await context.addInitScript(seed=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify(seed)),profiles);
const page=await context.newPage(),errors=[],external=[];page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{external.push(url);route.abort();}});
const url=new URL(base);for(const [key,value] of Object.entries({raceExpansion:'prototype',raceMultiplayer:'prototype',rev:head}))url.searchParams.set(key,value);
async function state(){return page.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.state());}
async function drive(seat){
  const setup=page.locator('#raceCoachSetup');await setup.waitFor({state:'visible',timeout:15000});await page.click('#raceCoachSetupStart');
  await page.waitForFunction(()=>__KICKLAB_RACE_MODES_QA__.state().phase==='run',{timeout:10000});
  await page.keyboard.down('Space');let held=true,shifted=0;
  let phase='',last=null;const thresholds=[46,88,132];for(let i=0;i<95;i++){await page.waitForTimeout(180);phase=(await state()).phase;last=await page.evaluate(()=>__KICKLAB_RACE_MODES_QA__.state());if(phase==='handoff'||phase==='result'||phase.startsWith('retry'))break;
    if(shifted<thresholds.length&&last.speedKmh>=thresholds[shifted]&&await page.locator('#raceTelemetryShift').isEnabled()){await page.locator('#raceTelemetryShift').click();shifted++;}
    if(last.heat>.86&&held){await page.keyboard.up('Space');held=false;}else if(last.heat<.58&&!held){await page.keyboard.down('Space');held=true;}
  }
  if(held)await page.keyboard.up('Space');if(phase.startsWith('retry'))throw Error(`Seat ${seat} did not pass actual Drag: ${JSON.stringify(last)}`);if(seat==='A'&&phase!=='handoff'||seat==='B'&&phase!=='result')throw Error(`Seat ${seat} did not resolve: ${phase} ${JSON.stringify(last)}`);
  await page.waitForTimeout(900);
}
try{
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:15000});await page.waitForTimeout(1100);
  await page.click('#raceMultiplayerStart');await page.waitForTimeout(700);await drive('A');
  await page.click('#profileBtn');await page.locator('#profileList [data-profile-id="seat-b"]').click();const handoff=await state();if(handoff.phase!=='readyB'||handoff.replay||handoff.logEntries)throw Error(`handoff leak: ${JSON.stringify(handoff)}`);await page.waitForTimeout(900);await page.click('#profileClose');
  if(await skip.isVisible())await skip.click();await drive('B');const result=await state();if(!result.result||!result.hasA||!result.hasB)throw Error(`missing comparison: ${JSON.stringify(result)}`);await page.waitForTimeout(1800);
  const video=page.video();await context.close();const webm=await video.path(),mp4=join(output,`race-multiplayer-${head.slice(0,12)}.mp4`);
  execFileSync('ffmpeg',['-y','-i',webm,'-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{stdio:'ignore'});
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,nb_frames','-of','json',mp4],{encoding:'utf8'}));if(Number(probe.format.duration)<15||Number(probe.format.size)<100000)throw Error(`invalid MP4: ${JSON.stringify(probe)}`);
  writeFileSync(join(output,'video-report.json'),JSON.stringify({head,url:url.toString(),mp4,probe,result:result.result,errors,external},null,2)+'\n');console.log(JSON.stringify({mp4,duration:probe.format.duration,result:result.result,errors,external},null,2));
}catch(error){errors.push(error.stack||String(error));console.error(JSON.stringify({errors,external},null,2));await context.close().catch(()=>{});process.exitCode=1;}finally{await browser.close();}
