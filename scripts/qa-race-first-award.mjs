import {createRequire} from 'node:module';
import {existsSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5988/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-first-award');
const revision=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={revision,cases:[],errors:[],external:[]};
async function run(width,height){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:{dir:output,size:{width,height}}});
  const page=await context.newPage(),video=page.video(),url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceTelemetry','prototype');url.searchParams.set('racePreflight','prototype');url.searchParams.set('raceCompetition','prototype');url.searchParams.set('rev',revision);
  page.on('pageerror',error=>report.errors.push(`${width}: ${error.message}`));
  await page.route('**/*',route=>{const request=route.request().url();if(request.startsWith(url.origin)||request.startsWith('data:')||request.startsWith('blob:'))route.continue();else{report.external.push(request);route.abort();}});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#boardBtn');await page.locator('#raceCompetition').waitFor({state:'visible'});
    const start=await page.evaluate(()=>window.__KICKLAB_RACE_AWARDS_QA__.state());
    if(start.journey[0].status!=='available'||start.journey[1].status!=='locked')throw Error(`fresh journey ${JSON.stringify(start)}`);
    await page.locator('#raceCompetition').screenshot({path:join(output,`fresh-${width}-${revision}.png`)});
    await page.click('#fbClose');await page.click('#lab-tab-race');
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    await page.locator('#racePreflight').waitFor({state:'visible',timeout:15000});
    await page.locator('[data-preflight-mode="drag"]').click();
    await page.locator('#racePreflightNext').click();
    await page.locator('#racePreflightNext').click();
    await page.locator('#racePreflightNext').click();
    await page.locator('#racePreflightNext').click();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:30000});
    await page.evaluate(()=>{window.__firstAwardNotices=[];new MutationObserver(()=>{for(const note of document.querySelectorAll('.race-award-toast')){const text=note.textContent;if(!window.__firstAwardNotices.includes(text))window.__firstAwardNotices.push(text);}}).observe(document.querySelector('#toasts'),{childList:true,subtree:true,attributes:true});});
    await page.keyboard.down('Space');
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.v>=12.7,null,{timeout:12000});
    await page.locator('#raceTelemetryShift').click();
    await page.waitForFunction(()=>['done','crashed'].includes(window.__KICKLAB_RACE_3D__?.dynamics?.state),null,{timeout:30000});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state()?.reviewSettled,null,{timeout:12000});
    const earnedToast=await page.evaluate(()=>window.__firstAwardNotices[0]||'');
    await page.screenshot({path:join(output,`notification-${width}-${revision}.png`)});
    await page.waitForFunction(()=>['done','crashed'].includes(window.__KICKLAB_RACE_3D__?.dynamics?.state),null,{timeout:10000});
    await page.keyboard.up('Space');
    const after=await page.evaluate(()=>({award:window.__KICKLAB_RACE_AWARDS_QA__.state(),mode:window.__KICKLAB_RACE_MODES_QA__?.state(),saved:JSON.parse(localStorage.getItem('kicklab.profiles.v1'))}));
    if(after.award.journey[0].status!=='earned'||after.award.journey[1].status!=='available'||!earnedToast.includes('Checkered Flag'))throw Error(`first award missing ${JSON.stringify({award:after.award,mode:after.mode,toast:earnedToast,ui:await page.evaluate(()=>({focus:document.activeElement?.id,toasts:document.querySelector('#toasts')?.innerHTML,noticed:window.__firstAwardNotices}))})}`);
    const saved=after.saved.profiles.find(profile=>profile.id===after.award.profileId)?.progress.raceCompetition;
    if(!saved?.awards.core||saved.awards.drag)throw Error(`profile persistence ${JSON.stringify(saved)}`);
    await page.evaluate(()=>window.__KICKLAB_RACE_AWARDS_QA__.openJourney());await page.locator('#raceCompetition').waitFor({state:'visible'});await page.locator('#raceCompetition').screenshot({path:join(output,`earned-${width}-${revision}.png`)});await page.waitForTimeout(2000);
    report.cases.push({width,url:url.toString(),profileId:after.award.profileId,states:after.award.journey.map(item=>item.status),toast:earnedToast,score:saved.bests.drag.score});
  }catch(error){report.errors.push(`${width}: ${error.stack||error}`);}finally{
    await context.close();const source=await video.path(),dest=join(output,`race-first-award-${width}-${revision}.mp4`);const ff=spawnSync('ffmpeg',['-y','-i',source,'-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',dest],{encoding:'utf8'});if(ff.status===0)report.cases.at(-1)?.width===width&&(report.cases.at(-1).video=dest);else report.errors.push(`${width}: MP4 encode ${ff.stderr.slice(-500)}`);
  }
}
try{for(const [width,height] of [[390,844],[1440,900]].filter(([width])=>!process.env.KICKLAB_QA_WIDTHS||process.env.KICKLAB_QA_WIDTHS.split(',').includes(String(width))))await run(width,height);}finally{await browser.close();}
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length||report.external.length)process.exitCode=1;
