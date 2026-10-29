import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(process.env.KICKLAB_QA_HEAD!==head||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Run against a clean exact-head checkout');
const base=process.argv[2]||'http://127.0.0.1:5878/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-highlight-local-only');
const origin=new URL(base);
if(origin.protocol!=='http:'||!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('Use localhost');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,cases:[],errors:[],external:[],mp4:null};
const cases=[
  {width:390,height:844,share:'denied',motion:'reduce',gfx:'3d',input:'touch',offline:true},
  {width:768,height:1024,share:'absent',motion:'reduce',gfx:'2d',input:'keyboard'},
  {width:1113,height:834,share:'cancelled',motion:'no-preference',gfx:'3d',input:'pointer'},
  {width:1440,height:900,share:'available',motion:'no-preference',gfx:'3d',input:'pointer'}
];
for(const item of cases){
  const viewport={width:item.width,height:item.height};
  const context=await browser.newContext({viewport,reducedMotion:item.motion,hasTouch:item.input==='touch',acceptDownloads:true,recordVideo:item.width===390?{dir:output,size:viewport}:undefined});
  await context.addInitScript(({share,gfx})=>{
    localStorage.setItem('impactlab.v1',JSON.stringify({gfx}));
    window.__shareCalls={share:0,canShare:0};
    if(share==='absent'){Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'canShare',{configurable:true,value:undefined});return;}
    Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>{window.__shareCalls.canShare++;return true;}});
    Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{window.__shareCalls.share++;throw new DOMException(share==='cancelled'?'Cancelled':'Denied',share==='cancelled'?'AbortError':'NotAllowedError');}});
  },item);
  const page=await context.newPage(),video=page.video();
  page.on('pageerror',error=>report.errors.push(`${item.width}: ${error.message}`));
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(origin.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(target);route.abort();}});
  try{
    const url=new URL(base);for(const flag of ['raceExpansion','raceCompetition','raceResultsQA','racePreflight'])url.searchParams.set(flag,flag==='raceResultsQA'?'1':'prototype');url.searchParams.set('rev',head);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    const race=page.locator('#lab-tab-race');if(item.input==='touch')await race.tap();else if(item.input==='keyboard'){await race.focus();await page.keyboard.press('Enter');}else await race.click();
    await page.locator('#racePreflight').waitFor({state:'visible'});
    await page.click('[data-preflight-venue="highland"]');
    for(let step=0;step<4;step++)await page.click('#racePreflightNext');
    await page.locator('#racePreflight').waitFor({state:'hidden',timeout:15000});
    const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_RESULTS_QA__&&window.__KICKLAB_RACE_RESULTS_QA__.state().raceState==='run',null,{timeout:20000});
    const fixture=await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__.scenario({outcome:'pass',achievement:'collectible',replay:'both'}));
    if(!fixture?.frames||!fixture?.moves||await page.locator('#rRaceRecord').isHidden())throw Error(`Local result fixture unavailable: ${JSON.stringify(fixture)}`);
    if(item.offline)await context.setOffline(true);
    const replayAvailable=await page.locator('#raceReplayPreview,#raceReplayFallback').evaluateAll(nodes=>nodes.some(node=>!node.hidden));
    if(!replayAvailable)throw Error('Local Replay action is missing');
    await page.click('#rRaceRecord');await page.locator('#raceShare').waitFor({state:'visible'});
    if(item.gfx==='3d')await page.locator('#raceShareDownload').waitFor({state:'visible',timeout:15000});
    const measured=await page.evaluate(()=>({calls:window.__shareCalls,osAction:!!document.querySelector('#raceShareNative'),copy:document.querySelector('#raceShare').textContent,overflow:document.documentElement.scrollWidth-innerWidth,profileId:JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId,preview:!!document.querySelector('#raceSharePreview video,#raceSharePreview img')}));
    if(measured.calls.share||measured.calls.canShare||measured.osAction||/Share file|choose Download or Share|Share was unavailable/.test(measured.copy)||measured.overflow>1||item.gfx==='3d'&&!measured.preview||item.gfx==='2d'&&!measured.copy.includes('Use the in-game Replay action'))throw Error(`Boundary failed: ${JSON.stringify(measured)}`);
    let path=null;
    if(item.gfx==='3d'){const downloadPromise=page.waitForEvent('download');await page.click('#raceShareDownload');const download=await downloadPromise;path=join(output,`${item.width}-${download.suggestedFilename()}`);await download.saveAs(path);}
    if(item.width===390){await page.locator('#raceShare').screenshot({path:join(output,'highlight-dialog.png')});await page.waitForTimeout(1300);}
    report.cases.push({...item,fixture,measured,download:path,url:url.toString()});
  }catch(error){report.errors.push(`${item.width}: ${error.stack||error}`);}
  await context.close();
  if(video&&item.width===390){const mp4=join(output,`race-highlight-local-only-${head.slice(0,12)}.mp4`);const conversion=spawnSync('ffmpeg',['-y','-i',await video.path(),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(conversion.status===0){const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});const media=probe.status===0?JSON.parse(probe.stdout):null;if(media?.streams?.some(stream=>stream.codec_name==='h264'&&stream.width===390&&stream.height===844)&&Number(media.format?.duration)>3)report.mp4=mp4;else report.errors.push('MP4 probe failed');}else report.errors.push(`MP4 encode failed: ${conversion.stderr?.slice(-500)}`);}
}
await browser.close();
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.map(item=>({width:item.width,share:item.share,gfx:item.gfx,download:item.download})),errors:report.errors,external:report.external,mp4:report.mp4},null,2));
if(report.errors.length||report.external.length||report.cases.length!==cases.length||!report.mp4)process.exitCode=1;
