import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out=resolve(process.argv[2]||'qa-artifacts/race-preflight');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:process.env.KICKLAB_QA_HEADFUL!=='1',executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:process.env.KICKLAB_QA_HEADFUL==='1'?['--enable-webgl']:[]});
const report=[];
async function moving(page,selector){
  await page.waitForFunction(selector=>document.querySelector(selector)?.readyState>=2,selector,{timeout:15000});
  const before=await page.locator(selector).evaluate(video=>video.currentTime);
  await page.waitForTimeout(1700);
  const after=await page.locator(selector).evaluate(video=>video.currentTime);
  if(after-before<.5)throw Error(`Clip did not move: ${selector} ${before} → ${after}`);
}
try{
  for(const [name,width,height] of [['phone',390,844],['desktop',1440,900]]){
    const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out,size:{width,height}}});
    const page=await context.newPage(),errors=[],external=[],created=Date.now();
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:4173'||['data:','blob:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
    const url=`http://127.0.0.1:4173/kicklab.html?raceExpansion=prototype&raceTelemetry=prototype&racePreflight=prototype&rev=${head}`;
    await page.goto(url,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');
    if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:20000});
    const trim=Math.max(0,(Date.now()-created)/1000-.25);
    await moving(page,'[data-preflight-mode="drag"] video');
    await page.locator('[data-preflight-mode="endurance"]').click();
    await moving(page,'[data-preflight-mode="endurance"] video');
    await page.click('#racePreflightNext');
    await moving(page,'.race-preflight-feature video');
    await page.locator('[data-preflight-vehicle="aegis"]').click();
    await moving(page,'.race-preflight-feature video');
    await page.click('#racePreflightNext');
    await page.locator('[data-preflight-part="tires"][data-preflight-value="wide"]').click();
    await moving(page,'.race-preflight-tune-preview video');
    await page.locator('[data-preflight-part="brakes"][data-preflight-value="endurance"]').click();
    await page.waitForTimeout(700);
    await page.click('#racePreflightNext');
    await moving(page,'.race-preflight-grid-car video');
    await page.click('#racePreflightNext');
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().arriving,{timeout:3000});
    const arrivalVisible=await page.locator('.race-preflight-grid-car video').evaluate(video=>{const rect=video.getBoundingClientRect();return rect.width>100&&rect.height>100&&rect.top<innerHeight-80&&rect.bottom>80;});
    if(!arrivalVisible)throw Error(`${name} arrival video is outside the viewport`);
    await page.waitForFunction(()=>!globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:12000});
    await page.waitForFunction(()=>{const rect=document.querySelector('.stage')?.getBoundingClientRect();return rect&&rect.width>100&&rect.height>100&&rect.top<innerHeight-100&&rect.bottom>100;},undefined,{timeout:3000});
    const orbit=await page.evaluate(()=>globalThis.__KICKLAB_RACE_3D__?.orbit?.phase);
    if(!['orbit','transition','done'].includes(orbit))throw Error(`${name} missing orbit after arrival: ${orbit}`);
    await page.waitForFunction(()=>['count','run'].includes(globalThis.__KICKLAB_RACE_MODES_QA__?.state().phase),{timeout:25000});
    await page.waitForTimeout(2600);
    const state=await page.evaluate(()=>({preflight:globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state(),race:globalThis.__KICKLAB_RACE_MODES_QA__.state(),three:globalThis.__KICKLAB_RACE_3D__}));
    if(state.preflight.open||state.preflight.saved.mode!=='endurance'||state.race.car!=='aegis'||state.race.garage.tires!=='wide'||state.race.garage.brakes!=='endurance'||!state.three?.assetUrl?.includes('aegis')||!state.three?.trackKey?.includes('endurance')||external.length||errors.length)throw Error(`${name} recording failed: ${JSON.stringify({state,external,errors}).slice(0,2000)}`);
    const video=page.video();await context.close();
    const source=await video.path(),mp4=join(out,`race-preflight-${name}-${head.slice(0,12)}.mp4`);
    execFileSync('ffmpeg',['-y','-ss',trim.toFixed(2),'-i',source,'-an','-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-movflags','+faststart',mp4],{stdio:'ignore'});
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'}));
    if(!probe.streams?.some(stream=>stream.codec_name==='h264'&&stream.width===width&&stream.height===height)||Number(probe.format?.duration)<20)throw Error(`Invalid ${name} MP4`);
    report.push({name,head,url,mp4,duration:Number(probe.format.duration),trim,orbit,external,errors});
  }
  writeFileSync(join(out,`video-report-${head.slice(0,12)}.json`),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
