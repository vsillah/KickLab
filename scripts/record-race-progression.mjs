import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5875/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-progression');
const label=process.argv[4]||'phone';
const head=process.env.KICKLAB_QA_HEAD||'working';
const viewport=label==='desktop'?{width:1440,height:900}:{width:390,height:844};
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const context=await browser.newContext({viewport,deviceScaleFactor:1,recordVideo:{dir:out,size:viewport}});
const page=await context.newPage(),errors=[],external=[],events=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();external.push(url);route.abort();});
const hook=()=>page.evaluate(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state());
const pause=ms=>page.waitForTimeout(ms);
async function scrollStage(){await page.locator('.stage').evaluate(element=>element.scrollIntoView({block:'start'}));}
async function openGoals(){await page.click('#goalsDetailToggle');await page.locator('#goalsDetail').waitFor({state:'visible'});}
async function closeGoals(){await page.click('#goalsDetail [data-close-detail]');}
async function openGarage(){await page.click('#chal [data-race-level-garage]');await page.locator('#raceGarage').waitFor({state:'visible'});}
async function choose(field,value){const section=page.locator(`#raceGarage [data-garage-section="${field}"]`);if(await section.getAttribute('aria-expanded')!=='true')await section.click();await page.click(`#raceGarage [data-garage-part="${field}"][data-garage-value="${value}"]`);await page.waitForFunction(({field,value})=>document.querySelector(`#raceGarage [data-garage-part="${field}"][data-garage-value="${value}"]`)?.getAttribute('aria-pressed')==='true',{field,value});await pause(320);}
async function closeGarage(){await page.click('#settingsClose');await page.locator('#goalsDetail').waitFor({state:'visible'});}
async function nextRound(){await page.locator('#rNext').waitFor({state:'visible',timeout:12000});await page.evaluate(()=>document.querySelector('#rNext').click());await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='grid');}
async function runHeat(expected){
  await scrollStage();await page.evaluate(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.setAutopilot());
  await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:15000});await page.locator('.race-orbit-panel button').click();
  await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='run',{timeout:22000});
  const outcome=await page.evaluate(async()=>{const qa=globalThis.__KICKLAB_RACE_PROGRESSION_QA__,until=performance.now()+45000;return new Promise(resolve=>{function step(){qa.demoPedals();const state=qa.state();if(state.raceState==='done'||state.raceState==='crashed'||performance.now()>until){qa.demoPedals();resolve(state);}else requestAnimationFrame(step);}step();});});
  if(!outcome.result||outcome.levelPass!==expected)throw new Error(`expected ${expected?'level pass':'level failure'}: ${JSON.stringify(outcome)}`);
  events.push({type:'heat',level:outcome.level,expected,result:outcome.result,progress:outcome.progress});
  await pause(2400);return outcome;
}

try{
  const url=new URL(base);url.searchParams.set('raceProgression','prototype');url.searchParams.set('rev',head);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});await scrollStage();
  await page.evaluate(()=>document.querySelector('.toast-close:not([hidden])')?.click());
  await openGoals();await page.locator('#chal .race-level-coach').scrollIntoViewIfNeeded();await pause(1700);
  await openGarage();for(const [field,value] of [['body','race'],['suspension','soft'],['tires','wide'],['brakes','endurance']])await choose(field,value);await closeGarage();await closeGoals();
  const failed=await runHeat(false);if(failed.progress.unlocked!==0)throw new Error('failed run unlocked a level');
  await nextRound();await openGoals();await openGarage();await choose('body','street');await closeGarage();await closeGoals();
  const highland=await runHeat(true);if(highland.progress.unlocked<1)throw new Error('Highland did not unlock Marine');
  await nextRound();await openGoals();await page.click('#chal [data-race-level="1"]');await closeGoals();await pause(1600);
  for(let heat=0;heat<2;heat++){const marine=await runHeat(true);if(heat===0&&marine.progress.heats!==1)throw new Error('Marine did not retain first heat');if(heat===1&&marine.progress.unlocked<2)throw new Error('Marine did not unlock Forest');if(heat===0)await nextRound();}
  await nextRound();await openGoals();await page.click('#chal [data-race-level="2"]');await closeGoals();await pause(2500);
  const final=await hook();if(final.venue!=='forest')throw new Error('Forest not selected');events.push({type:'forest-view',state:final});
}catch(error){errors.push(error.stack||String(error));}

const webm=await page.video().path();await context.close();await browser.close();
const mp4=join(out,`race-progression-${label}-${head.slice(0,12)}.mp4`);
const conversion=spawnSync('ffmpeg',['-y','-i',webm,'-vf','fps=30','-c:v','libx264','-crf','24','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});
if(conversion.status!==0)errors.push(`ffmpeg: ${conversion.stderr.slice(-1200)}`);
const probe=conversion.status===0?spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'}):null;
let media=null;try{media=probe&&probe.status===0?JSON.parse(probe.stdout):null;}catch{}
if(!media||!media.streams?.some(stream=>stream.codec_name==='h264'&&stream.width===viewport.width&&stream.height===viewport.height)||Number(media.format?.duration)<30)errors.push('final MP4 failed codec, dimensions or duration check');
const report={head,label,viewport,base,events,errors,external,webm,mp4,media};
writeFileSync(join(out,`record-${label}-${head.slice(0,12)}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({mp4,events:events.length,duration:media?.format?.duration,errors,external}));
if(errors.length||external.length)process.exitCode=1;
