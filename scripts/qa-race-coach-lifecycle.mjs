import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5879/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-coach-lifecycle');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const viewport={width:390,height:844},context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage(),errors=[],external=[],steps=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();external.push(url);route.abort();});
const state=()=>page.evaluate(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state());
const capture=async name=>{const identity=await page.evaluate(()=>{const visible=selector=>[...document.querySelectorAll(selector)].filter(element=>element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden').map(element=>element.textContent.trim());return{setup:visible('#raceCoachSetup'),result:visible('#raceCoachResult'),telemetry:visible('#raceTelemetryCue'),navigation:visible('#raceNavigationCue'),coach:visible('#coachName'),toasts:visible('#toasts .toast[aria-label="Coach Nia"]')}});const all=Object.values(identity).flat().join(' ');if(/Tomi/i.test(all)||!/(Coach Nia|Nia:)/.test(all))throw new Error(`${name} Coach identity ${JSON.stringify(identity)}`);if(name==='live'&&!identity.navigation.some(value=>value.startsWith('Nia:')))throw new Error(`live navigation Coach identity ${JSON.stringify(identity)}`);if(name==='retry-ready'&&identity.toasts.length)throw new Error(`stale Coach result toast ${JSON.stringify(identity)}`);const cue=identity.setup[0]||identity.result[0]||identity.telemetry[0];steps.push({name,cue,identity,state:await state()});await page.locator('.stage').screenshot({path:join(out,`coach-${name}-${head.slice(0,12)}.png`)});};
try{
  const url=new URL(base);for(const [key,value] of [['raceProgression','prototype'],['raceTelemetry','prototype'],['raceCornerTrace','prototype'],['rev',head]])url.searchParams.set(key,value);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});
  await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:20000});await page.click('.race-orbit-panel button');
  await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.orbit?.done,null,{timeout:20000});await page.locator('#raceCoachSetup').waitFor({state:'visible'});await page.locator('#raceCoachSetup').scrollIntoViewIfNeeded();
  await capture('preview');
  const plan=await page.locator('#raceCoachSetup').textContent();if(!plan.includes('wide tires')||!plan.includes('Garage'))throw new Error(`plan ${plan}`);
  await page.click('#raceCoachSetupGarage');await page.locator('#raceGarage').waitFor({state:'visible'});await capture('garage-preview');
  await page.click('#settingsClose');await capture('garage-return');
  await page.evaluate(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.setAutopilot());
  await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='run',null,{timeout:10000});
  await page.evaluate(()=>{window.__coachDrive=setInterval(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.demoPedals(),16);});
  await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().x>35,null,{timeout:25000});await capture('live');
  await page.waitForFunction(()=>['done','crashed'].includes(globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState),null,{timeout:45000});await page.evaluate(()=>clearInterval(window.__coachDrive));
  const result=await state();if(!['done','crashed'].includes(result.raceState)||!result.result)throw new Error(`run did not finish ${JSON.stringify(result)}`);
  await capture('result');const comparison=await page.locator('#raceCoachResultMeasurements').textContent();if(!comparison.includes('time')||!comparison.includes('brakes'))throw new Error(`comparison ${comparison}`);
  await page.locator('#raceCoachResultGarage').click();await page.locator('#raceGarage').waitFor({state:'visible'});await capture('garage-result');
  await page.click('#settingsClose');await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='grid');await capture('retry-ready');
  await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='run',null,{timeout:10000});await capture('retry-live');
  await page.evaluate(()=>{window.__coachDrive=setInterval(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.demoPedals(),16);});
  await page.waitForFunction(()=>['done','crashed'].includes(globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState),null,{timeout:45000});await page.evaluate(()=>clearInterval(window.__coachDrive));await capture('retry-result');
  await page.locator('#raceCoachResultRetry').click();await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='grid');await capture('direct-retry-ready');
  await page.locator('#raceCoachSetupGarage').click();await page.locator('#raceGarage').waitFor({state:'visible'});
  for(const [part,value] of [['body','race'],['suspension','soft'],['tires','wide'],['brakes','endurance']]){
    const section=page.locator(`#raceGarage [data-garage-section="${part}"]`);if(await section.getAttribute('aria-expanded')!=='true')await section.click();
    await page.locator(`#raceGarage [data-garage-part="${part}"][data-garage-value="${value}"]`).click();
  }
  await page.click('#settingsClose');await capture('failure-setup');
  await page.locator('#raceCoachSetupStart').click();await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState==='run',null,{timeout:10000});
  await page.evaluate(()=>{window.__coachDrive=setInterval(()=>globalThis.__KICKLAB_RACE_PROGRESSION_QA__.demoPedals(),16);});
  await page.waitForFunction(()=>['done','crashed'].includes(globalThis.__KICKLAB_RACE_PROGRESSION_QA__.state().raceState),null,{timeout:45000});await page.evaluate(()=>clearInterval(window.__coachDrive));
  const failed=await state(),failedText=await page.locator('#raceCoachResultMeasurements').textContent(),category=await page.locator('#raceCoachResultGarage').textContent();
  if(failed.levelPass!==false||!failedText.startsWith('Retry needed')||!category.startsWith('Garage · '))throw new Error(`failure review ${JSON.stringify({failed,failedText,category})}`);
  await capture('failure-result');await page.locator('#raceCoachResultGarage').click();await page.locator('#raceGarage').waitFor({state:'visible'});
  const activeCategory=category.replace('Garage · ','');if(await page.locator(`#raceGarage [data-garage-section="${activeCategory}"]`).getAttribute('aria-expanded')!=='true')throw new Error(`Garage category ${activeCategory} did not open`);
  await capture('failure-garage');
}catch(error){errors.push(error.stack||String(error));}
const webm=await page.video().path();await context.close();await browser.close();
const mp4=join(out,`race-coach-lifecycle-${head.slice(0,12)}.mp4`),conversion=spawnSync('ffmpeg',['-y','-i',webm,'-vf','fps=30','-c:v','libx264','-crf','23','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});
if(conversion.status!==0)errors.push(`ffmpeg: ${conversion.stderr.slice(-1000)}`);
const probe=conversion.status===0?spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'}):null;
let media=null;try{media=probe&&probe.status===0?JSON.parse(probe.stdout):null;}catch{}
if(!media?.streams?.some(stream=>stream.codec_name==='h264'&&stream.width===390&&stream.height===844)||Number(media.format?.duration)<5)errors.push('MP4 codec, viewport or duration check failed');
writeFileSync(join(out,`coach-lifecycle-${head.slice(0,12)}.json`),JSON.stringify({head,base,steps,errors,external,mp4,media},null,2)+'\n');
console.log(JSON.stringify({steps:steps.map(step=>step.name),errors,external,mp4,duration:media?.format?.duration}));
if(errors.length||external.length)process.exitCode=1;
