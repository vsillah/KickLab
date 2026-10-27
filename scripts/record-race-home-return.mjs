import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:63337/pages/index.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-home-return');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the full reviewed commit.');
const url=new URL(base);
if(url.protocol!=='http:'||!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/pages/index.html')throw Error('Record the trusted localhost Pages artifact.');
url.searchParams.set('rev',head);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const response=await fetch(url);
if(!response.ok||sha(Buffer.from(await response.arrayBuffer()))!==sha(readFileSync('dist/pages/index.html')))throw Error('Served Pages artifact does not match the local build.');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:1280,height:800}}});
await context.addInitScript(()=>{if(!sessionStorage.getItem('kicklab.record.init')){localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d'}));sessionStorage.setItem('kicklab.record.init','1');}});
const page=await context.newPage(),errors=[],external=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{external.push(target);route.abort();}});
page.setDefaultTimeout(12000);
async function drive(){
  await page.keyboard.down('KeyW');
  try{
    for(const limit of [55,85,93]){
      await page.waitForFunction(minimum=>{const text=document.querySelector('#challengeHudSummary .hud-summary-cue')?.textContent||'',match=text.match(/(\d+) km\/h/);return match&&Number(match[1])>=minimum;},limit,{timeout:15000});
      await page.locator('#raceTelemetryShift').click();
    }
    await page.locator('#results').waitFor({state:'visible',timeout:35000});
  }finally{await page.keyboard.up('KeyW');}
  const title=await page.locator('#rTitle').innerText();
  if(!title.includes('DRAG SPRINT COMPLETE'))throw Error(`Real Drag run did not pass: ${title}`);
}
try{
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.waitForTimeout(1000);
  await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible'});
  await page.click('[data-preflight-mode="drag"]');await page.waitForTimeout(700);await page.click('#racePreflightNext');
  await page.waitForTimeout(800);await page.click('[data-preflight-vehicle="kestrel"]');await page.waitForTimeout(600);await page.click('#racePreflightNext');
  await page.waitForTimeout(800);await page.click('[data-preflight-part="brakes"][data-preflight-value="sport"]');await page.waitForTimeout(600);await page.click('#racePreflightNext');
  await page.waitForTimeout(1100);await page.click('#racePreflightNext');
  const arriving=await page.evaluate(()=>({next:document.querySelector('#racePreflightNext').disabled,back:document.querySelector('#racePreflightBack').disabled,arrival:document.documentElement.dataset.racePreflightArriving}));
  if(!arriving.next||!arriving.back||arriving.arrival!=='true')throw Error(`Arrival controls were not disabled: ${JSON.stringify(arriving)}`);
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:15000});
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  await page.waitForFunction(()=>/\d+ km\/h/.test(document.querySelector('#challengeHudSummary .hud-summary-cue')?.textContent||''),null,{timeout:35000});
  await drive();await page.waitForTimeout(1700);
  await page.click('#rRaceGarage');await page.locator('#modeHome').waitFor({state:'visible'});await page.waitForTimeout(1200);
  await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible'});
  const returned=await page.evaluate(()=>({head:new URLSearchParams(location.search).get('rev'),phase:[...document.querySelectorAll('#racePreflightSteps button')].findIndex(button=>button.getAttribute('aria-current')==='step'),mode:document.querySelector('[data-preflight-mode][aria-pressed="true"]')?.dataset.preflightMode,backDisabled:document.querySelector('#racePreflightBack').disabled,nextDisabled:document.querySelector('#racePreflightNext').disabled,renderer:window.__KICKLAB_RACE_3D__?.status}));
  if(returned.head!==head||returned.phase!==0||returned.mode!=='drag'||returned.backDisabled||returned.nextDisabled||returned.renderer!=='rendering')throw Error(`Return navigation failed: ${JSON.stringify(returned)}`);
  await page.waitForTimeout(1200);await page.click('#racePreflightNext');await page.waitForTimeout(1000);
  await page.click('#racePreflightNext');await page.waitForTimeout(1000);
  await page.click('#racePreflightNext');await page.waitForTimeout(1300);
  const final=await page.evaluate(()=>({phase:[...document.querySelectorAll('#racePreflightSteps button')].findIndex(button=>button.getAttribute('aria-current')==='step'),grid:document.querySelector('.race-preflight-grid-brief')?.innerText||'',backDisabled:document.querySelector('#racePreflightBack').disabled,nextDisabled:document.querySelector('#racePreflightNext').disabled}));
  if(final.phase!==3||!final.grid.includes('Kestrel')||!final.grid.includes('Sport')||final.backDisabled||final.nextDisabled)throw Error(`Return progression failed: ${JSON.stringify(final)}`);
  if(errors.length||external.length)throw Error(`Browser errors or egress: ${JSON.stringify({errors,external})}`);
  await page.screenshot({path:join(out,`race-home-return-${head.slice(0,8)}.png`)});
  const raw=page.video();await page.close();await context.close();await browser.close();
  const mp4=join(out,`race-home-return-${head.slice(0,8)}.mp4`),transcode=spawnSync('ffmpeg',['-y','-i',await raw.path(),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});
  if(transcode.status!==0)throw Error(`ffmpeg failed: ${transcode.stderr}`);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});
  if(probe.status!==0)throw Error(`ffprobe failed: ${probe.stderr}`);
  const info=JSON.parse(probe.stdout),decode=spawnSync('ffmpeg',['-v','error','-i',mp4,'-f','null','-'],{encoding:'utf8'});
  if(decode.status!==0||statSync(mp4).size<50000||Number(info.format?.duration||0)<12)throw Error(`MP4 invalid: ${JSON.stringify({info,decode:decode.stderr})}`);
  console.log(JSON.stringify({mp4,bytes:statSync(mp4).size,info,returned,final,errors,external},null,2));
}catch(error){await context.close();await browser.close();throw error;}
