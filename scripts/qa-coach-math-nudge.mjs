import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4202/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/coach-math-nudge');
const revision=process.argv[4]||'working-tree';
const videoDir=join(outputDir,'video-source');
mkdirSync(videoDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[],requests=[],checks=[];
let rawVideo='';

const urlFor=label=>`${baseUrl}${baseUrl.includes('?')?'&':'?'}qa=coach-math-nudge&case=${label}&rev=${revision}`;
const rectOverlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
const listen=page=>{
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{const url=new URL(request.url());if(!['127.0.0.1','localhost'].includes(url.hostname)&&!['data:','blob:'].includes(url.protocol))requests.push(request.url());});
};
async function enterLab(page,name){
  if(await page.locator('#profileDialog').isVisible())await page.getByRole('button',{name:'Close profiles'}).click();
  await page.getByRole('button',{name:new RegExp(`^${name} .*Enter ${name}$`)}).click();
  await page.locator('#coachMathNudge').waitFor({state:'visible',timeout:7000});
}
async function cueState(page){return page.evaluate(()=>{
  const box=node=>node.getBoundingClientRect().toJSON(),cue=document.querySelector('#coachMathNudge'),style=getComputedStyle(cue),message=getComputedStyle(document.querySelector('#coachMathNudgeMessage')),action=getComputedStyle(document.querySelector('#coachMathNudgeAction'));
  const audit=window.__KICKLAB_COACH_MATH_NUDGE__,pauseState=audit.snapshot();return{cue:box(cue),stage:box(document.querySelector('.stage')),canvas:box(document.querySelector('#cv')),hud:box(document.querySelector('#gameGuidanceHud')),deck:box(document.querySelector('.control-deck')),pause:pauseState.paused,pauseOwners:pauseState.owners,portraitHref:cue.querySelector('use').getAttribute('href'),portraitSymbols:document.querySelectorAll('#coachTomiPortrait').length,visibleUses:document.querySelectorAll('use[href="#coachTomiPortrait"]').length,message:document.querySelector('#coachMathNudgeMessage').textContent,background:style.backgroundColor,border:style.borderColor,textColor:message.color,actionColor:action.color,actionBackground:action.backgroundColor,audit:{visible:audit.visible,shown:audit.shown,dismissed:audit.dismissed,openedMath:audit.openedMath,lastReason:audit.lastReason,event:audit.event,pause:audit.pause}};
  });}

const specs=[
  {label:'desktop-1440x1000',width:1440,height:1000,mode:'Fight',line:'Force and contact time shape every hit.',action:true},
  {label:'tablet-768x1024',width:768,height:1024,mode:'Race',line:'Grip and turn radius set your safe speed.'},
  {label:'mobile-390x844',width:390,height:844,mode:'Kick',line:"Speed, angle, and gravity shape the ball's path."}
];
for(const spec of specs){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,...(spec.action?{recordVideo:{dir:videoDir,size:{width:1280,height:900}}}:{})});
  const page=await context.newPage();listen(page);await page.goto(urlFor(spec.label),{waitUntil:'networkidle'});await enterLab(page,spec.mode);await page.waitForTimeout(250);
  let state=await cueState(page),safeBottom=state.canvas.top+state.canvas.height*(spec.width<=480?.67:.52);
  if(state.pause||state.pauseOwners.paused||state.portraitHref!=='#coachTomiPortrait'||state.portraitSymbols!==1||state.visibleUses!==4||state.message!==spec.line||state.textColor!=='rgb(255, 255, 255)'||state.actionColor!=='rgb(255, 255, 255)'||!state.background.includes('0.96')||rectOverlap(state.cue,state.hud)>0||rectOverlap(state.cue,state.deck)>0||state.cue.bottom>safeBottom||state.cue.left<state.stage.left-1||state.cue.right>state.hud.left-3)throw new Error(`${spec.label}: cue placement or identity failed (${JSON.stringify({state,safeBottom})})`);
  await page.screenshot({path:join(outputDir,`${spec.label}-coach-tomi-math-cue.png`)});
  if(spec.action){
    await page.locator('#coachMathNudgeAction').focus();await page.keyboard.press('Enter');await page.waitForTimeout(180);
    const opened=await page.evaluate(()=>{const audit=window.__KICKLAB_COACH_MATH_NUDGE__,pauseState=audit.snapshot();return{cue:!document.querySelector('#coachMathNudge').hidden,math:!document.querySelector('#physicsDetail').hidden,openPanels:[...document.querySelectorAll('.context-detail:not([hidden])')].map(node=>node.id),paused:pauseState.paused,owners:pauseState.owners,focus:document.activeElement?.getAttribute('aria-label'),openedMath:audit.openedMath};});
    if(opened.cue||!opened.math||opened.openPanels.join(',')!=='physicsDetail'||!opened.paused||!opened.owners.owners.includes('context-detail')||opened.focus!=='Close physics details'||opened.openedMath!==1)throw new Error(`${spec.label}: canonical Math action failed (${JSON.stringify(opened)})`);
    await page.screenshot({path:join(outputDir,`${spec.label}-canonical-math.png`)});await page.waitForTimeout(500);await page.locator('#physicsDetail [data-close-detail]').click();await page.waitForTimeout(180);
    const closed=await page.evaluate(()=>({paused:window.__KICKLAB_COACH_MATH_NUDGE__.snapshot().paused,focus:document.activeElement===document.querySelector('#physicsDetailsHud'),math:!document.querySelector('#physicsDetail').hidden}));if(closed.paused||!closed.focus||closed.math)throw new Error(`${spec.label}: Math close ownership failed (${JSON.stringify(closed)})`);checks.push({label:spec.label,kind:'action',state,opened,closed,safeBottom});
  }else{
    const event=state.audit.event;await page.locator('#coachMathNudgeClose').focus();await page.keyboard.press('Enter');await page.waitForTimeout(120);
    const dismissed=await page.evaluate(event=>{const audit=window.__KICKLAB_COACH_MATH_NUDGE__,repeat=audit.show({coachMathEvent:event});return{hidden:document.querySelector('#coachMathNudge').hidden,paused:audit.snapshot().paused,focus:document.activeElement===document.querySelector('#physicsDetailsHud'),repeat,audit:{visible:audit.visible,shown:audit.shown,dismissed:audit.dismissed,openedMath:audit.openedMath,lastReason:audit.lastReason,event:audit.event,pause:audit.pause}};},event);
    if(!dismissed.hidden||dismissed.paused||!dismissed.focus||dismissed.repeat||dismissed.audit.shown!==1||dismissed.audit.dismissed!==1)throw new Error(`${spec.label}: dismiss or repeat bound failed (${JSON.stringify(dismissed)})`);checks.push({label:spec.label,kind:'dismiss-repeat',state,dismissed,safeBottom});
  }
  const recorded=page.video();await page.close();await context.close();if(recorded)rawVideo=await recorded.path();
}
await browser.close();
if(requests.length||errors.length)throw new Error(`privacy/runtime failures: ${JSON.stringify({requests,errors})}`);
const mp4=join(outputDir,'coach-tomi-math-cue-walkthrough.mp4');
const transcode=spawnSync('ffmpeg',['-y','-i',rawVideo,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);
const video=JSON.parse(probe.stdout);if(statSync(mp4).size<40_000||Number(video.format?.duration||0)<5)throw new Error(`MP4 validation failed (${statSync(mp4).size} bytes, ${video.format?.duration}s)`);
const report={revision,baseUrl,requests,errors,checks,video:{path:mp4,bytes:statSync(mp4).size,...video}};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));
