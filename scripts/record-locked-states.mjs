import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5917/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/locked-states-video');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const external=[],pageErrors=[],segments=[];

async function record(name,{race=false,run}){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:{dir:output,size:{width:390,height:844}}});
  await context.addInitScript(()=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'walkthrough',legacyProfileId:'walkthrough',profiles:[{id:'walkthrough',nickname:'Local QA',avatar:'rocket',color:'sky',progress:{xp:0,raceCompetition:{version:1,bests:{},awards:{}}}}]})));
  const page=await context.newPage();
  page.on('pageerror',error=>pageErrors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{external.push(`${name}: ${url}`);route.abort();}});
  const url=new URL(base);url.searchParams.set('rev',head);
  if(race)for(const [key,value] of Object.entries({raceCompetition:'prototype',racePreflight:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceExpansion:'prototype'}))url.searchParams.set(key,value);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await run(page);
  const video=page.video();await context.close();const path=join(output,`${name}.webm`);await video.saveAs(path);segments.push({name,path,url:url.toString()});
}

await record('01-race',{race:true,run:async page=>{
  await page.locator('#boardBtn').click();await page.waitForTimeout(1300);
  await page.locator('.race-journey-card.locked').last().scrollIntoViewIfNeeded();await page.waitForTimeout(750);
  await page.locator('#fbClose').click();await page.locator('#lab-tab-race').click();
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});await page.locator('#racePreflightNext').click();
  await page.locator('[data-preflight-vehicle="vesper"]').scrollIntoViewIfNeeded();await page.waitForTimeout(1500);
  await page.locator('#racePreflightClose').click();await page.locator('#racePhoneProgress').click();
  await page.locator('#raceChampionshipToggle').click();await page.locator('#raceChampionshipEvents .kl-locked').first().scrollIntoViewIfNeeded();await page.waitForTimeout(1400);
}});
for(const lab of ['fight','kick'])await record(`02-${lab}`,{run:async page=>{
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
writeFileSync(join(output,'manifest.json'),JSON.stringify({head,mp4,segments,external,pageErrors},null,2)+'\n');
console.log(JSON.stringify({head,mp4,segments:segments.map(segment=>segment.name),external,pageErrors},null,2));
