import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5878/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-competition');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(process.env.KICKLAB_QA_HEAD&&process.env.KICKLAB_QA_HEAD!==head)throw new Error('QA head does not match checkout');
const url=new URL(base);url.searchParams.set('raceCompetition','prototype');url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',head);
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const viewport={width:390,height:844};
const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce',acceptDownloads:true,recordVideo:{dir:output,size:viewport}});
const page=await context.newPage(),errors=[],external=[],events=[];
page.on('pageerror',error=>errors.push(error.stack||error.message));
await page.route('**/*',route=>{const requested=route.request().url();if(requested.startsWith(url.origin)||requested.startsWith('data:')||requested.startsWith('blob:'))route.continue();else{external.push(requested);route.abort();}});
const state=()=>page.evaluate(()=>globalThis.__KICKLAB_RACE_MODES_QA__.state());
let downloaded=null;
try{
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#boardBtn');await page.locator('#raceCompetition').waitFor({state:'visible'});await page.locator('[data-race-comp-cat="drag"]').click();
  if(!(await page.locator('#raceCompetitionList').textContent()).includes('No drag sprint scores'))throw new Error('initial Race board was not empty');
  events.push('empty device board');await page.waitForTimeout(1300);await page.click('#fbClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:20000});
  await page.click('#raceCoachSetupStart');await page.waitForTimeout(3000);await page.keyboard.down('Space');
  let shifts=0;for(let i=0;i<65;i++){await page.waitForTimeout(300);const current=await state();if(current.phase==='done'||current.phase==='crashed')break;if(shifts<3&&current.speedKmh>=[46,88,132][shifts]){await page.keyboard.up('Space');await page.locator('#raceTelemetryShift').click();shifts++;await page.keyboard.down('Space');}}
  await page.keyboard.up('Space');await page.waitForFunction(()=>{const state=globalThis.__KICKLAB_RACE_MODES_QA__.state();return state.reviewSettled&&state.result;},{timeout:12000});
  const final=await state();if(!final.result.pass)throw new Error(`Drag did not qualify: ${JSON.stringify(final.result)}`);
  await page.locator('#rRaceRecord').waitFor({state:'visible'});await page.screenshot({path:join(output,`race-result-${head.slice(0,12)}.png`)});events.push(`qualified Drag ${final.result.score} points`);
  await page.click('#rRaceBoard');await page.locator('#raceCompetition').waitFor({state:'visible'});
  const boardText=await page.locator('#raceCompetition').textContent();if(!boardText.includes('Launch Ace')||!boardText.includes('Racer 1')||boardText.includes('Lab Rookie'))throw new Error('earned board or alias failed');
  await page.screenshot({path:join(output,`race-board-${head.slice(0,12)}.png`)});events.push('earned award and local rank');await page.waitForTimeout(1700);await page.click('#fbClose');
  await page.click('#rRaceRecord');await page.locator('#raceShare').waitFor({state:'visible',timeout:30000});
  await page.waitForFunction(()=>{const video=document.querySelector('#raceSharePreview video');return video&&video.readyState>=2&&!document.querySelector('#raceShareDownload').hidden;},{timeout:10000});
  const downloadPromise=page.waitForEvent('download');await page.click('#raceShareDownload');const download=await downloadPromise;downloaded=join(output,`race-highlight-${head.slice(0,12)}.webm`);await download.saveAs(downloaded);
  await page.locator('#raceSharePreview video').evaluate(video=>{video.muted=true;return video.play();});await page.waitForTimeout(2200);await page.screenshot({path:join(output,`race-share-${head.slice(0,12)}.png`)});events.push('explicit replay recording, playable preview and download');
}catch(error){errors.push(error.stack||String(error));}
const video=page.video();await context.close();await browser.close();
const walkthroughWebm=video?await video.path():null,mp4=join(output,`race-competition-walkthrough-${head.slice(0,12)}.mp4`);
const conversion=walkthroughWebm?spawnSync('ffmpeg',['-y','-i',walkthroughWebm,'-vf','fps=30','-c:v','libx264','-crf','23','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'}):null;
if(!conversion||conversion.status!==0)errors.push(`walkthrough conversion failed: ${conversion?.stderr?.slice(-1200)||'no browser video'}`);
const probe=conversion?.status===0?spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'}):null;
let media=null;try{media=probe?.status===0?JSON.parse(probe.stdout):null;}catch(_){}
if(!media?.streams?.some(stream=>stream.codec_name==='h264'&&stream.width===390&&stream.height===844)||Number(media?.format?.duration)<30)errors.push('walkthrough MP4 codec, dimensions, or duration invalid');
const replay=downloaded?spawnSync('ffprobe',['-v','error','-count_frames','-show_entries','stream=codec_name,width,height,nb_read_frames','-of','json',downloaded],{encoding:'utf8'}):null;
let replayMedia=null;try{replayMedia=replay?.status===0?JSON.parse(replay.stdout):null;}catch(_){}
if(!replayMedia?.streams?.some(stream=>stream.width===960&&stream.height===540&&Number(stream.nb_read_frames)>100))errors.push('downloaded replay file has no valid gameplay frames');
const report={head,url:url.toString(),events,errors,external,downloaded,walkthroughWebm,mp4,media,replayMedia};writeFileSync(join(output,`record-${head.slice(0,12)}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,url:url.toString(),events,errors,external,mp4,downloaded,duration:media?.format?.duration,replayFrames:replayMedia?.streams?.[0]?.nb_read_frames},null,2));if(errors.length||external.length)process.exitCode=1;
