import {createRequire} from 'node:module';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5917/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/locked-states-video');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the full exact commit.');
if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==head||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Exact-head recording requires a clean checkout at KICKLAB_QA_HEAD.');
const reviewUrl=new URL(base);reviewUrl.searchParams.set('rev',head);
const response=await fetch(reviewUrl);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const artifactSha256=sha(readFileSync(resolve('dist/kicklab.html')));
if(!response.ok||sha(Buffer.from(await response.arrayBuffer()))!==artifactSha256)throw Error('Localhost does not serve the exact built KickLab artifact.');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const external=[],pageErrors=[],segments=[];

async function record(name,{race=false,unlocked=false,gfx2d=false,run}){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:{dir:output,size:{width:390,height:844}}});
  await context.addInitScript(gfx2d=>{if(sessionStorage.getItem('kicklab.locked.record.init'))return;localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'walkthrough',legacyProfileId:'walkthrough',profiles:[{id:'walkthrough',nickname:'Local QA',avatar:'rocket',color:'sky',progress:{xp:0,raceCompetition:{version:1,bests:{},awards:{}}}}]}));if(gfx2d)localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'}));sessionStorage.setItem('kicklab.locked.record.init','1');},gfx2d);
  const page=await context.newPage();
  page.on('pageerror',error=>pageErrors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{external.push(`${name}: ${url}`);route.abort();}});
  const url=new URL(base);url.searchParams.set('rev',head);
  if(race)for(const [key,value] of Object.entries({raceCompetition:'prototype',racePreflight:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceExpansion:'prototype',raceProgression:'prototype'}))url.searchParams.set(key,value);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  if(unlocked)await page.evaluate(()=>window.__KICKLAB_RACE_PROGRESSION_QA__.unlockForQA(2));
  await run(page);
  const video=page.video();await context.close();const path=join(output,`${name}.webm`);await video.saveAs(path);segments.push({name,path,url:url.toString()});
}

await record('01-race',{race:true,run:async page=>{
  await page.locator('#boardBtn').click();await page.waitForTimeout(1300);
  await page.locator('.race-journey-card.locked').last().scrollIntoViewIfNeeded();await page.waitForTimeout(750);
  await page.locator('#fbClose').click();await page.locator('#lab-tab-race').click();
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
  await page.locator('[data-preflight-venue="forest"]').scrollIntoViewIfNeeded();await page.waitForTimeout(1600);
  await page.locator('[data-preflight-venue="highland"]').click();await page.locator('#racePreflightNext').click();
  await page.locator('[data-preflight-vehicle="vesper"]').scrollIntoViewIfNeeded();await page.waitForTimeout(1500);
  await page.locator('#racePreflightClose').click();await page.locator('#racePhoneProgress').click();
  await page.locator('#raceChampionshipToggle').click();await page.locator('#raceChampionshipEvents .kl-locked').first().scrollIntoViewIfNeeded();await page.waitForTimeout(1400);
}});
await record('02-venues-open',{race:true,unlocked:true,run:async page=>{
  await page.locator('#lab-tab-race').click();await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
  await page.locator('[data-preflight-venue="forest"]').scrollIntoViewIfNeeded();await page.waitForTimeout(1600);
  await page.locator('[data-preflight-venue="marine"]').click();await page.waitForTimeout(1200);
}});
await record('03-race-pause',{race:true,gfx2d:true,run:async page=>{
  await page.locator('#lab-tab-race').click();await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
  await page.locator('[data-preflight-venue="highland"]').click();await page.locator('[data-preflight-mode="drag"]').click();
  await page.locator('#racePreflightNext').click();await page.locator('#racePreflightNext').click();await page.locator('#racePreflightNext').click();await page.locator('#racePreflightNext').click();
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  await page.waitForFunction(()=>/\d+ km\/h/.test(document.querySelector('#challengeHudSummary .hud-summary-cue')?.textContent||''),null,{timeout:35000});
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().phase==='run',null,{timeout:20000});await page.keyboard.up('KeyW');
  await page.locator('#cv').click();await page.locator('#gamePacingSaveExit').waitFor({state:'visible',timeout:12000});
  await page.waitForTimeout(1800);
}});
for(const lab of ['fight','kick'])await record(`04-${lab}`,{run:async page=>{
  await page.locator(`#lab-tab-${lab}`).click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  await page.locator('#orientationDetailToggle').click();await page.locator('#settingsToggle').click();
  await page.locator('.settings-category').filter({hasText:'Style'}).click();await page.waitForTimeout(1500);
}});
await browser.close();
if(external.length||pageErrors.length)throw new Error(JSON.stringify({external,pageErrors}));
const filter=segments.map((_,index)=>`[${index}:v]setpts=PTS-STARTPTS,fps=30,format=yuv420p[v${index}]`).join(';')+';'+segments.map((_,index)=>`[v${index}]`).join('')+`concat=n=${segments.length}:v=1:a=0[v]`;
const mp4=join(output,`kicklab-locked-states-${head.slice(0,8)}.mp4`);
const args=['-y',...segments.flatMap(segment=>['-i',segment.path]),'-filter_complex',filter,'-map','[v]','-c:v','libx264','-crf','21','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',mp4];
const encoded=spawnSync('ffmpeg',args,{encoding:'utf8'});
if(encoded.status!==0)throw new Error(`ffmpeg failed: ${encoded.stderr.slice(-3000)}`);
writeFileSync(join(output,'manifest.json'),JSON.stringify({head,artifactSha256,mp4,segments,external,pageErrors},null,2)+'\n');
console.log(JSON.stringify({head,artifactSha256,mp4,segments:segments.map(segment=>segment.name),external,pageErrors},null,2));
