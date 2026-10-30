// Privacy-safe local walkthrough of the exact Kick Freestyle picker revision.
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:4187/kicklab.html';
const head=process.argv[3];
const out=resolve(process.argv[4]||'qa-artifacts/kick-freestyle-picker-video');
if(!/^http:\/\/127\.0\.0\.1:\d+\/kicklab\.html$/.test(base)||!head||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==head)throw Error('Pass exact-head localhost URL and full current commit');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
const cases=[{name:'phone',width:360,height:800,first:'free',second:'header',input:'touch'},{name:'tablet',width:768,height:1024,first:'run',second:'pass',input:'keyboard'},{name:'desktop',width:1440,height:900,first:'gk',second:'bar',input:'pointer'}];
const report={head,base,segments:[],errors:[],external:[]};
async function action(page,selector,input){const el=page.locator(selector);if(input==='touch')await el.tap();else if(input==='keyboard'){await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));await el.focus();await page.keyboard.press('Enter');}else await el.click();}
try{
  for(const item of cases){
    const context=await browser.newContext({viewport:{width:item.width,height:item.height},hasTouch:item.input==='touch',recordVideo:{dir:out,size:{width:item.width,height:item.height}},reducedMotion:'reduce'});
    const page=await context.newPage(),video=page.video();
    page.on('pageerror',error=>report.errors.push(`${item.name}: ${error.message}`));
    page.on('request',request=>{if(new URL(request.url()).origin!==new URL(base).origin)report.external.push(`${item.name}: ${request.url()}`)});
    const url=new URL(base);url.searchParams.set('rev',head);url.searchParams.set('walkthrough',item.name);
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-kick').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:15000});
    await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();await page.waitForTimeout(900);
    await action(page,`#game-${item.first}`,item.input);await page.waitForTimeout(800);
    await action(page,`#game-${item.second}`,item.input);await page.waitForTimeout(900);
    const selected=await page.evaluate(()=>[...document.querySelectorAll('#gameBar .gt[aria-checked="true"]')].map(x=>x.id));
    if(selected.join(',')!==[`game-${item.first}`,`game-${item.second}`].join(','))throw Error(`${item.name}: selection mismatch ${selected}`);
    await action(page,'#freestyleStart',item.input);await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:15000});await page.waitForTimeout(1000);
    await page.close();await context.close();
    report.segments.push({name:item.name,viewport:`${item.width}x${item.height}`,selected,raw:await video.path()});
  }
}finally{await browser.close();}
if(report.errors.length||report.external.length)throw Error(`Browser integrity failed: ${JSON.stringify({errors:report.errors,external:report.external})}`);
const normalized=[];
for(const segment of report.segments){
  const target=join(out,`${segment.name}-normalized.mp4`);
  const ff=spawnSync('ffmpeg',['-y','-i',segment.raw,'-vf','scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:black,setsar=1','-r','30','-c:v','libx264','-pix_fmt','yuv420p','-an',target],{encoding:'utf8'});
  if(ff.status!==0)throw Error(`ffmpeg ${segment.name}: ${ff.stderr}`);
  normalized.push(target);
}
const concat=join(out,'segments.txt');writeFileSync(concat,normalized.map(path=>`file '${path.replaceAll("'","'\\''")}'`).join('\n')+'\n');
const mp4=join(out,`kick-freestyle-picker-${head.slice(0,8)}.mp4`);
const ff=spawnSync('ffmpeg',['-y','-f','concat','-safe','0','-i',concat,'-c','copy','-movflags','+faststart',mp4],{encoding:'utf8'});
if(ff.status!==0)throw Error(`ffmpeg concat: ${ff.stderr}`);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});
if(probe.status!==0)throw Error(`ffprobe: ${probe.stderr}`);
report.video={path:mp4,bytes:statSync(mp4).size,...JSON.parse(probe.stdout)};
if(report.video.bytes<50_000||Number(report.video.format?.duration)<12)throw Error(`Walkthrough is too short or empty: ${JSON.stringify(report.video)}`);
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.video,null,2));
