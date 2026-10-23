import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5917/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-speed-perception');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(Boolean)});
const report={head:process.env.KICKLAB_QA_HEAD||'working',base,cases:[],errors:[],external:[]};
async function run(width,height,mode='endurance',reduced=false,canvas=false,video=false){
  const name=`${mode}-${width}x${height}${reduced?'-reduced':''}${canvas?'-canvas':''}`;if(process.argv.some(arg=>arg.startsWith('--only='))&&!process.argv.includes(`--only=${name}`))return;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',recordVideo:video?{dir:out,size:{width,height}}:undefined});
  await context.addInitScript(gfx=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})),canvas?'2d':'3d');
  const page=await context.newPage(),samples=[];page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  const state=()=>page.evaluate(()=>({...globalThis.__KICKLAB_RACE_MODES_QA__.state(),render:globalThis.__KICKLAB_RACE_3D__?.status,composition:globalThis.__KICKLAB_RACE_3D__?.composition,overflow:document.documentElement.scrollWidth-innerWidth}));
  const capture=async label=>{const sample={label,...await state()};samples.push(sample);await page.locator('.stage').screenshot({path:join(out,`${name}-${label}.png`)});return sample;};
  try{
    const url=new URL(base);for(const [key,value] of [['raceExpansion','prototype'],['raceSimulator','prototype'],['raceTelemetry','prototype'],['rev',report.head]])url.searchParams.set(key,value);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-race').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:20000});
    if(!await page.evaluate(selected=>globalThis.__KICKLAB_RACE_SIMULATOR_QA__.selectMode(selected),mode))throw new Error('mode unavailable');
    if(mode!=='drag')await page.locator('#raceCoachSetupSteering').click();await page.locator('#raceCoachSetupSimulator').click();await page.locator('#simStart').waitFor({state:'visible',timeout:10000});
    await capture('setup');await page.locator('#simStart').click();await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_MODES_QA__.state().phase==='run',null,{timeout:10000});
    await capture('low');await page.evaluate(()=>globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('gas',true));
    for(const [label,target] of [['medium',25],['high',48]]){await page.waitForFunction(kmh=>globalThis.__KICKLAB_RACE_MODES_QA__.state().speedKmh>=kmh,target,{timeout:18000});await capture(label);}
    await page.evaluate(()=>globalThis.__KICKLAB_RACE_SIMULATOR_QA__.input('gas',false));
    if(mode==='endurance'){await page.evaluate(()=>globalThis.__KICKLAB_RACE_SIMULATOR_QA__.pause());if(!canvas)await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_CINEMATIC__?.audioActive===false,null,{timeout:3000});else await page.waitForTimeout(80);await capture('paused');}
    const [low,medium,high]=samples.filter(x=>['low','medium','high'].includes(x.label));
    if([low,medium,high].some(x=>x.overflow>1))throw new Error('horizontal overflow');
    if(!canvas&&[low,medium,high].some(x=>x.render!=='rendering'))throw new Error('3D renderer unavailable');
    if(!canvas&&!reduced&&!(low.cinematic.intensity<medium.cinematic.intensity&&medium.cinematic.intensity<high.cinematic.intensity&&low.cinematic.fieldOfView<medium.cinematic.fieldOfView&&medium.cinematic.fieldOfView<high.cinematic.fieldOfView))throw new Error('speed presentation is not monotonic');
    if(!canvas&&reduced&&[low,medium,high].some(x=>x.cinematic.fieldOfView!==55||x.cinematic.roll||x.cinematic.heave||x.cinematic.streakOpacity))throw new Error('reduced motion has camera movement');
    if(!canvas&&mode==='endurance'&&high.cinematic.roadsideReflectors<20)throw new Error('oval lacks reflectors');
    if(!canvas&&mode==='endurance'&&samples.at(-1).cinematic.audioActive)throw new Error('audio continued on pause');
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}
  const recording=page.video();await context.close();const source=recording?await recording.path():null;report.cases.push({name,samples,source});
}
for(const [width,height] of [[360,780],[390,844],[768,1024],[1113,988],[1440,1000]])await run(width,height,'endurance',false,false,width===390);
for(const mode of ['drag','circuit','hill','drift'])await run(390,844,mode,false,false,true);
await run(390,844,'endurance',true,false,true);await run(390,844,'endurance',false,true,false);
await browser.close();
const videos=report.cases.filter(item=>item.source).map(item=>item.source);if(videos.length){const list=join(out,'video-list.txt');writeFileSync(list,videos.map(path=>`file '${path.replaceAll("'","'\\''")}'`).join('\n')+'\n');const mp4=join(out,'race-speed-perception.mp4'),encode=spawnSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});if(encode.status)report.errors.push(`MP4 encode: ${encode.stderr}`);else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});if(probe.status)report.errors.push(`MP4 probe: ${probe.stderr}`);else report.mp4={path:mp4,...JSON.parse(probe.stdout)};}}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:report.cases.map(item=>({name:item.name,samples:item.samples.map(sample=>({label:sample.label,speedKmh:sample.speedKmh,phase:sample.phase,cinematic:sample.cinematic}))})),mp4:report.mp4,errors:report.errors,external:report.external},null,2));if(report.errors.length||report.external.length)process.exitCode=1;
