import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4202/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/coach-tomi-loop');
const revision=process.argv[4]||'working-tree';
const videoDir=join(outputDir,'video-source');
mkdirSync(videoDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[],requests=[],checks=[],videos=[];

const urlFor=label=>`${baseUrl}${baseUrl.includes('?')?'&':'?'}qa=coach-tomi-loop&case=${label}&rev=${revision}`;
const profileProgress=experienced=>({xp:experienced?2860:0,ch:{fight:experienced?4:0,race:experienced?3:0,kick:experienced?5:0},stats:{plays:{fight:experienced?12:0,race:experienced?10:0,kick:experienced?14:0},wins:{fight:experienced?8:0,race:experienced?7:0,kick:experienced?9:0}}});
const listen=page=>{
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{const url=new URL(request.url());if(!['127.0.0.1','localhost'].includes(url.hostname)&&!['data:','blob:'].includes(url.protocol))requests.push(request.url());});
};
async function seed(page,experienced){
  await page.addInitScript(({progress,name,id})=>{
    const profile={id,nickname:name,avatar:'rocket',color:'sky',progress,needsSetup:false,createdAt:1,updatedAt:1};
    localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:id,legacyProfileId:id,profiles:[profile]}));
    localStorage.setItem('impactlab.v1',JSON.stringify(progress));
    localStorage.setItem('impactlab.nick',name);
  },{progress:profileProgress(experienced),name:experienced?'Ayo Pro':'Ayo Rookie',id:experienced?'ayo-pro':'ayo-rookie'});
}
async function enterLab(page,name){
  if(await page.locator('#profileDialog').isVisible())await page.getByRole('button',{name:'Close profiles'}).click();
  await page.getByRole('button',{name:new RegExp(`^${name} .*Enter ${name}$`)}).click();
  await page.locator('#gamePacingOverlay').waitFor({state:'visible',timeout:2500});
}
async function beginningState(page){return page.evaluate(()=>{
  const section=document.querySelector('#coachTomiPregame'),box=section.getBoundingClientRect().toJSON(),overlay=document.querySelector('#gamePacingOverlay').getBoundingClientRect().toJSON();
  return{tier:section.dataset.tier,level:document.querySelector('#coachTomiPregameLevel').textContent.trim(),observation:document.querySelector('#coachTomiPregameObservation').textContent.trim(),cue:document.querySelector('#coachTomiPregameCue').textContent.trim(),variable:document.querySelector('#coachTomiPregameVariable').textContent.trim(),formula:document.querySelector('#coachTomiPregameFormula').textContent.trim(),portrait:section.querySelector('use').getAttribute('href'),box,overlay,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
});}
async function cueState(page){return page.evaluate(()=>{
  const cue=document.querySelector('#coachMathNudge'),audit=window.__KICKLAB_COACH_MATH_NUDGE__,box=node=>node.getBoundingClientRect().toJSON();
  return{hidden:cue.hidden,message:document.querySelector('#coachMathNudgeMessage').textContent.trim(),rule:cue.dataset.rule,portrait:cue.querySelector('use').getAttribute('href'),cue:box(cue),stage:box(document.querySelector('.stage')),hud:box(document.querySelector('#gameGuidanceHud')),deck:box(document.querySelector('.control-deck')),shown:audit.shown,session:audit.snapshot().session,paused:audit.snapshot().paused};
});}
async function showNeed(page,mode){
  const fixtures={fight:{grade:'D',title:'OFF THE GREEN',sub:'Timing error 182 ms · force 980 N'},race:{grade:'D',title:'OFF THE TRACK',sub:'Turned in too hard or too early · corner entry 92 of 70 km/h'},kick:{grade:'D',title:'BLOCKED',sub:'Wall height 2.4 m · ball height 1.8 m · speed 24 m/s'}};
  return page.evaluate(({mode,meta})=>{const audit=window.__KICKLAB_COACH_MATH_NUDGE__;const noNeed=audit.show({coachMathEvent:'unconditional-check'});const note=audit.capture(mode,false,meta);const shown=audit.showPending();return{noNeed,note,shown};},{mode,meta:fixtures[mode]});
}
async function showResultFixture(page,mode,experienced){
  const fixtures={fight:{grade:'D',title:'OFF THE GREEN',sub:'Timing error 182 ms · force 980 N'},race:{grade:'D',title:'OFF THE TRACK',sub:'Turned in too hard or too early · corner entry 92 of 70 km/h'},kick:{grade:'D',title:'BLOCKED',sub:'Wall height 2.4 m · ball height 1.8 m · speed 24 m/s'}},meta=fixtures[mode];
  return page.evaluate(({mode,meta,experienced})=>{
    const result=document.querySelector('#results');window.__KICKLAB_COACH_MATH_NUDGE__.renderResult(mode,meta);
    document.querySelector('#rGrade').innerHTML=`${meta.grade}<small>GRADE</small>`;document.querySelector('#rTitle').textContent=meta.title;document.querySelector('#rSub').textContent=meta.sub;document.querySelector('#rRows').innerHTML='<li><span>Round telemetry</span><b>+0</b></li>';document.querySelector('#rTotal').textContent='+0';document.querySelector('#rHint').textContent='Review the round, then try one adjustment.';result.classList.remove('mini');result.hidden=false;
    const note=document.querySelector('#coachTomiResult');return{tier:note.dataset.tier,level:document.querySelector('#coachTomiResultLevel').textContent.trim(),observation:document.querySelector('#coachTomiResultObservation').textContent.trim(),cue:document.querySelector('#coachTomiResultCue').textContent.trim(),portrait:note.querySelector('use').getAttribute('href'),expected:experienced?'experienced':'novice',overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  },{mode,meta,experienced});
}
async function transcode(rawVideo,name){
  const mp4=join(outputDir,name),run=spawnSync('ffmpeg',['-y','-i',rawVideo,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(run.status!==0)throw new Error(`ffmpeg failed: ${run.stderr}`);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);const data=JSON.parse(probe.stdout),bytes=statSync(mp4).size;if(bytes<40_000||Number(data.format?.duration||0)<4)throw new Error(`MP4 validation failed (${bytes} bytes, ${data.format?.duration}s)`);videos.push({path:mp4,bytes,...data});
}

const viewports=[{label:'desktop-1440x1000',width:1440,height:1000,mode:'fight',name:'Fight'},{label:'tablet-768x1024',width:768,height:1024,mode:'race',name:'Race'},{label:'mobile-390x844',width:390,height:844,mode:'kick',name:'Kick'}];
for(const spec of viewports)for(const experienced of [false,true]){
  const profile=experienced?'experienced':'novice',label=`${spec.label}-${profile}`,recordVideo=spec.label.startsWith('desktop')?{dir:videoDir,size:{width:1280,height:900}}:undefined;
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,...(recordVideo?{recordVideo}:{})});const page=await context.newPage();listen(page);await seed(page,experienced);const response=await page.goto(urlFor(label),{waitUntil:'networkidle'});if(!response?.ok())throw new Error(`${label}: page returned ${response?.status()}`);await enterLab(page,spec.name);await page.waitForTimeout(160);
  const beginning=await beginningState(page),expectedTier=experienced?'experienced':'novice';if(beginning.tier!==expectedTier||beginning.level!==(experienced?'Next detail':'First look')||beginning.portrait!=='#coachTomiPortrait'||!beginning.observation||!beginning.cue||!beginning.variable||!beginning.formula||beginning.overflow>1||beginning.box.bottom>beginning.overlay.bottom+1)throw new Error(`${label}: beginning gate failed (${JSON.stringify(beginning)})`);await page.screenshot({path:join(outputDir,`${label}-beginning.png`)});await page.waitForTimeout(4700);
  const afterGo=await cueState(page);if(!afterGo.hidden||afterGo.shown!==0)throw new Error(`${label}: unconditional post-GO cue appeared (${JSON.stringify(afterGo)})`);const need=await showNeed(page,spec.mode);await page.waitForTimeout(180);const mid=await cueState(page);if(need.noNeed||!need.shown||mid.hidden||mid.shown!==1||mid.portrait!=='#coachTomiPortrait'||mid.paused||!mid.message||mid.cue.left<mid.stage.left-1||mid.cue.right>mid.hud.left+1)throw new Error(`${label}: need-based cue gate failed (${JSON.stringify({need,mid})})`);await page.screenshot({path:join(outputDir,`${label}-mid-need.png`)});
  if(spec.label.startsWith('desktop')){await page.locator('#coachMathNudgeAction').click();await page.waitForTimeout(220);if(!(await page.locator('#physicsDetail').isVisible()))throw new Error(`${label}: See the math did not open canonical Math`);await page.screenshot({path:join(outputDir,`${label}-canonical-math.png`)});await page.locator('#physicsDetail [data-close-detail]').click();await page.waitForTimeout(220);}else{await page.locator('#coachMathNudgeClose').click();await page.waitForTimeout(120);}
  const end=await showResultFixture(page,spec.mode,experienced);await page.locator('#results').scrollIntoViewIfNeeded();await page.waitForTimeout(120);end.card=await page.locator('#rc').evaluate(node=>node.getBoundingClientRect().toJSON());end.deck=await page.locator('.control-deck').evaluate(node=>node.getBoundingClientRect().toJSON());end.hud=await page.locator('#gameGuidanceHud').evaluate(node=>node.getBoundingClientRect().toJSON());const telemetry=spec.mode==='fight'?'980 N':spec.mode==='race'?'92 of 70':'Wall height';if(end.tier!==end.expected||end.level!==(experienced?'Next detail':'First look')||end.portrait!=='#coachTomiPortrait'||!end.observation.includes(telemetry)||!end.cue||end.overflow>1||end.card.top<0||end.card.bottom>spec.height+1||end.card.bottom>end.deck.top+1||end.card.right>end.hud.left+1)throw new Error(`${label}: result coaching gate failed (${JSON.stringify(end)})`);await page.screenshot({path:join(outputDir,`${label}-end.png`)});checks.push({label,beginning,afterGo:{hidden:afterGo.hidden,shown:afterGo.shown},need,mid:{message:mid.message,rule:mid.rule,shown:mid.shown,paused:mid.paused},end});
  const recorded=page.video();await page.close();await context.close();if(recorded)await transcode(await recorded.path(),`coach-tomi-${profile}-walkthrough.mp4`);
}
await browser.close();
if(requests.length||errors.length)throw new Error(`privacy/runtime failures: ${JSON.stringify({requests,errors})}`);
const report={revision,baseUrl,requests,errors,checks,videos};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));
