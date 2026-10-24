import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {copyFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out=resolve(process.argv[2]||'qa-artifacts/race-preflight');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report=[];
try{
  for(const [name,width,height] of [['phone',390,844],['desktop',1440,900]]){
    const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out,size:{width,height}}});
    const page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:4173'||['data:','blob:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
    const url=`http://127.0.0.1:4173/kicklab.html?raceExpansion=prototype&raceTelemetry=prototype&racePreflight=prototype&rev=${head}`;
    await page.goto(url,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');
    if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,{timeout:20000});
    await page.waitForTimeout(900);
    await page.locator('[data-preflight-mode="endurance"]').click();await page.waitForTimeout(800);
    await page.click('#racePreflightNext');await page.locator('.race-preflight-feature img').evaluate(img=>img.decode());await page.waitForTimeout(850);
    await page.locator('[data-preflight-vehicle="aegis"]').click();await page.locator('.race-preflight-feature img').evaluate(img=>img.decode());await page.waitForTimeout(1000);
    await page.locator('.race-preflight-roster').scrollIntoViewIfNeeded();await page.waitForTimeout(700);
    await page.click('#racePreflightNext');await page.locator('.race-preflight-tune-preview img').evaluate(img=>img.decode());await page.waitForTimeout(650);
    await page.locator('[data-preflight-part="tires"][data-preflight-value="wide"]').click();await page.waitForTimeout(700);
    await page.locator('[data-preflight-part="brakes"][data-preflight-value="endurance"]').click();await page.waitForTimeout(700);
    await page.click('#racePreflightNext');await page.locator('.race-preflight-grid-car img').evaluate(img=>img.decode());await page.evaluate(()=>document.querySelector('#racePreflight').scrollTop=0);await page.waitForTimeout(2400);
    await page.click('#racePreflightNext');await page.waitForFunction(()=>['count','run'].includes(globalThis.__KICKLAB_RACE_MODES_QA__?.state().phase),{timeout:10000});await page.waitForTimeout(3200);
    const state=await page.evaluate(()=>({preflight:globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state(),race:globalThis.__KICKLAB_RACE_MODES_QA__.state()}));
    if(state.preflight.open||state.preflight.saved.mode!=='endurance'||state.race.car!=='aegis'||state.race.garage.tires!=='wide'||state.race.garage.brakes!=='endurance'||external.length||errors.length)throw Error(`${name} recording failed: ${JSON.stringify({state,external,errors}).slice(0,1600)}`);
    const video=page.video();await context.close();
    const source=await video.path(),mp4=join(out,`race-preflight-${name}-${head.slice(0,12)}.mp4`);
    execFileSync('ffmpeg',['-y','-ss','6.8','-i',source,'-an','-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-movflags','+faststart',mp4],{stdio:'ignore'});
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames','-of','json',mp4],{encoding:'utf8'}));
    if(!probe.streams?.some(stream=>stream.codec_name==='h264'&&stream.width===width&&stream.height===height)||Number(probe.format?.duration)<8)throw Error(`Invalid ${name} MP4`);
    report.push({name,head,url,mp4,duration:Number(probe.format.duration),external,errors});
  }
  writeFileSync(join(out,`video-report-${head.slice(0,12)}.json`),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
