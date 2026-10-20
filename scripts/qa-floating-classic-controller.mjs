import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url);
const { chromium }=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4207/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/floating-classic-controller');
const revision=process.argv[4]||'working-tree';
const videoDir=join(outputDir,'video-source');
mkdirSync(videoDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath});
const errors=[],requests=[],checks=[];
const specs=[['phone-390x844',390,844],['tablet-768x1024',768,1024],['mid-1113x988',1113,988],['desktop-1440x1000',1440,1000]];
const urlFor=label=>`${baseUrl}?qa=floating-controller&rev=${encodeURIComponent(revision)}&view=${label}`;

function listen(page){
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>requests.push(request.url()));
}

async function seed(page){
  await page.addInitScript(()=>{
    localStorage.setItem('impactlab.v1',JSON.stringify({ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));
    localStorage.setItem('impactlab.nick','QA Player');
  });
}

async function enter(page,mode){
  if(await page.locator('#profileDialog').isVisible())await page.getByRole('button',{name:'Close profiles'}).click();
  await page.getByRole('button',{name:new RegExp(`^${mode} .*Enter ${mode}$`)}).click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:12000});
  await page.waitForTimeout(250);
  if(!(await page.locator('#game-cockpit').isVisible())||await page.locator('#modeHome').isVisible())throw new Error(`${mode}: game did not enter.`);
}

async function returnHome(page){
  await page.locator('#orientationDetailToggle').click();
  await page.locator('#modeHomeButton').click();
  await page.locator('#modeHome').waitFor({state:'visible'});
}

async function deckState(page,label){
  const state=await page.evaluate(label=>{
    const deck=document.querySelector('.control-deck'),stage=document.querySelector('.stage'),rail=document.querySelector('#gameGuidanceHud'),head=document.querySelector('.floating-control-head'),left=document.querySelector('.control-left-slot'),right=document.querySelector('#padR'),pad=document.querySelector('#pad'),touch=document.querySelector('#touchController'),collapse=document.querySelector('#controllerCollapseButton');
    const rect=node=>node.getBoundingClientRect().toJSON(),visible=node=>!!node&&node.getClientRects().length>0&&getComputedStyle(node).visibility!=='hidden',overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const boxes={deck:rect(deck),stage:rect(stage),rail:rect(rail),head:rect(head),left:visible(left)?rect(left):null,right:visible(right)?rect(right):null,pad:visible(pad)?rect(pad):null,touch:visible(touch)?rect(touch):null};
    const style=getComputedStyle(deck),headStyle=getComputedStyle(head),visibleButtons=[...deck.querySelectorAll('button')].filter(visible).map(node=>({id:node.id,label:node.getAttribute('aria-label')||node.textContent.trim(),segmented:node.classList.contains('prototype-slot'),box:rect(node)}));
    return{label,viewport:{width:innerWidth,height:innerHeight},collapsed:deck.classList.contains('controller-collapsed'),prototype:deck.classList.contains('prototype-active'),manual:deck.classList.contains('manual-active'),expanded:collapse.getAttribute('aria-expanded'),stateText:document.querySelector('#floatingControllerState').textContent.trim(),boxes,styles:{background:style.backgroundColor,image:style.backgroundImage,filter:style.backdropFilter||style.webkitBackdropFilter,headImage:headStyle.backgroundImage,headFilter:headStyle.backdropFilter||headStyle.webkitBackdropFilter},geometry:{insideStage:boxes.deck.left>=boxes.stage.left-1&&boxes.deck.right<=boxes.stage.right+1&&boxes.deck.top>=boxes.stage.top-1&&boxes.deck.bottom<=boxes.stage.bottom+1,railOverlap:overlap(boxes.deck,boxes.rail),podOverlap:boxes.left&&boxes.right?overlap(boxes.left,boxes.right):false,centerGap:boxes.left&&boxes.right?boxes.right.left-boxes.left.right:null,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth},visibleButtons};
  },label);
  if(!state.geometry.insideStage||state.geometry.railOverlap||state.geometry.podOverlap||state.geometry.overflow>1)throw new Error(`${label}: floating geometry failed (${JSON.stringify(state.geometry)})`);
  if(state.styles.background!=='rgba(0, 0, 0, 0)'||state.styles.image!=='none'||state.styles.filter!=='none'||state.styles.headImage==='none'||state.styles.headFilter==='none')throw new Error(`${label}: controller material contract failed (${JSON.stringify(state.styles)})`);
  const tooSmall=state.visibleButtons.filter(button=>button.box.height<43.5||button.box.width<(button.segmented?40:43.5));
  if(tooSmall.length)throw new Error(`${label}: visible targets below 44 px (${JSON.stringify(tooSmall)})`);
  checks.push({kind:'layout',...state});return state;
}

async function togglePhoneExpansion(page,label){
  const button=page.locator('#controllerCollapseButton');
  if((await button.getAttribute('aria-expanded'))!=='false')throw new Error(`${label}: phone controller should begin collapsed.`);
  await page.screenshot({path:join(outputDir,`${label}-classic-collapsed.png`)});
  await button.click();await page.waitForTimeout(120);
  if((await button.getAttribute('aria-expanded'))!=='true'||!(await page.locator('#pad').isVisible()))throw new Error(`${label}: expand failed.`);
}

async function exerciseClassic(page,label){
  const directions=page.locator('#padL .dpad .arm:not(:disabled)');
  const directionCount=await directions.count();if(directionCount<1)throw new Error(`${label}: no enabled direction controls (${JSON.stringify(await page.locator('#padL button').allTextContents())}).`);
  for(let index=0;index<directionCount;index++){
    const button=directions.nth(index),box=await button.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(40);await page.mouse.up();
    if(await button.evaluate(node=>node.classList.contains('on')))throw new Error(`${label}: direction ${index} remained pressed.`);
  }
  const action=page.locator('#padR button:not(:disabled)').first(),actionBox=await action.boundingBox();
  await page.mouse.move(actionBox.x+actionBox.width/2,actionBox.y+actionBox.height/2);await page.mouse.down();await page.waitForTimeout(80);await page.mouse.up();
  const quick=page.locator('#padL .quick-layer');let quickTune=null;if(await quick.count()){const before=await quick.innerText();await quick.click();const after=await quick.innerText();if(before===after)throw new Error(`${label}: quick-tune layer did not change.`);quickTune={before,after};}
  await page.locator('#physicsDetailsHud').click();if(!(await page.locator('#physicsDetail').isVisible()))throw new Error(`${label}: physics details did not open.`);await page.locator('#gameOverlayBackdrop').click({position:{x:3,y:3}});
  await page.locator('#controllerModeManual').click();if((await page.locator('#controllerModeManual').getAttribute('aria-pressed'))!=='true'||!/Manual/.test(await page.locator('#floatingControllerState').innerText()))throw new Error(`${label}: Manual did not activate.`);
  await page.locator('#controllerModePlay').click();if((await page.locator('#controllerModePlay').getAttribute('aria-pressed'))!=='true')throw new Error(`${label}: Play did not restore.`);
  checks.push({kind:'classic-interactions',label,directions:directionCount,action:true,quickTune,details:true,manual:true});
}

async function exerciseAnalog(page,label){
  await page.getByRole('button',{name:'Analog',exact:true}).click();await page.waitForTimeout(150);
  if(!(await page.locator('#touchController').isVisible())||(await page.locator('#analogControlsButton').getAttribute('aria-pressed'))!=='true')throw new Error(`${label}: Analog did not activate.`);
  const physics=page.locator('#prototypePhysics');if(await physics.getAttribute('open')!==null)throw new Error(`${label}: physics should begin collapsed.`);await physics.locator('summary').click();if(await physics.getAttribute('open')===null)throw new Error(`${label}: physics expansion failed.`);await physics.locator('summary').click();
  const stick=await page.locator('#analogStick').boundingBox(),x=stick.x+stick.width/2,y=stick.y+stick.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+stick.width*.3,y-stick.height*.25,{steps:6});const reading=await page.locator('#analogReadout').innerText();await page.mouse.up();if(!/\d+%/.test(reading))throw new Error(`${label}: analog readout did not change (${reading}).`);
  const gesture=await page.locator('#gestureAction').boundingBox();await page.mouse.move(gesture.x+gesture.width/2,gesture.y+gesture.height/2);await page.mouse.down();await page.waitForTimeout(180);await page.mouse.move(gesture.x+gesture.width*.65,gesture.y+gesture.height*.4,{steps:4});await page.mouse.up();
  checks.push({kind:'analog-interactions',label,details:true,reading,gesture:true});
}

async function exerciseRailAndPause(page,label){
  const resume=page.locator('#gamePacingResume'),resumeIfVisible=async()=>{if(await resume.isVisible().catch(()=>false)){await resume.click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden'});}};
  await resumeIfVisible();
  await page.locator('#orientationDetailToggle').click();if(!(await page.locator('#orientationDetail').isVisible()))throw new Error(`${label}: Labs panel did not open.`);
  await page.locator('#settingsToggle').click();if(!(await page.locator('#settingsDrawer').isVisible())||await page.locator('#orientationDetail').isVisible())throw new Error(`${label}: settings exclusivity failed.`);
  await page.locator('#gameOverlayBackdrop').click({position:{x:3,y:3}});if(await page.locator('#settingsDrawer').isVisible())throw new Error(`${label}: settings click-off failed.`);
  await resumeIfVisible();await page.getByRole('button',{name:'Classic',exact:true}).click();await page.waitForTimeout(1300);await page.locator('#cv').click({position:{x:Math.min(260,page.viewportSize().width*.35),y:Math.min(220,page.viewportSize().height*.3)},force:true});
  if(await resume.isVisible({timeout:1200}).catch(()=>false))await resume.click();
  checks.push({kind:'rail-and-pause',label,settings:true,clickOff:true,pauseResume:true});
}

async function exerciseViewport(label,width,height){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=480}),page=await context.newPage();listen(page);await seed(page);await page.goto(urlFor(label),{waitUntil:'networkidle'});await enter(page,'Fight');
  if(width<=480)await togglePhoneExpansion(page,label);
  await deckState(page,`${label}-classic`);await exerciseClassic(page,label);await page.screenshot({path:join(outputDir,`${label}-classic-expanded.png`)});
  await exerciseAnalog(page,label);await deckState(page,`${label}-analog`);await page.screenshot({path:join(outputDir,`${label}-analog-expanded.png`)});
  await exerciseRailAndPause(page,label);
  for(const mode of ['Race','Kick']){await returnHome(page);await enter(page,mode);if(width<=480&&(await page.locator('#controllerCollapseButton').getAttribute('aria-expanded'))==='false')await page.locator('#controllerCollapseButton').click();await page.getByRole('button',{name:'Classic',exact:true}).click();let quickTune=null;if(mode==='Kick'){const quick=page.locator('#padL .quick-layer'),before=await quick.innerText();await quick.click();const after=await quick.innerText();if(before===after)throw new Error(`${label}-${mode}: quick-tune layer did not change.`);quickTune={before,after};}const mapping=await page.locator('#pad').getAttribute('aria-label');checks.push({kind:'mode-mapping',label,mode,mapping,quickTune,actions:await page.locator('#padR button:not(:disabled)').allTextContents()});}
  await context.close();
}

async function record(label,width,height){
  const dir=join(videoDir,label);mkdirSync(dir,{recursive:true});const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:{dir,size:{width,height}}}),page=await context.newPage();listen(page);await seed(page);await page.goto(urlFor(`${label}-walkthrough`),{waitUntil:'networkidle'});await enter(page,'Kick');
  if(width<=480){await page.waitForTimeout(500);await page.locator('#controllerCollapseButton').click();}await page.waitForTimeout(700);await page.locator('#controllerModeManual').click();await page.waitForTimeout(700);await page.locator('#controllerModePlay').click();await page.waitForTimeout(500);await page.getByRole('button',{name:'Analog',exact:true}).click();await page.waitForTimeout(800);await page.locator('#prototypePhysics summary').click();await page.waitForTimeout(700);await page.locator('#prototypePhysics summary').click();await page.waitForTimeout(500);await page.getByRole('button',{name:'Classic',exact:true}).click();await page.waitForTimeout(600);await page.locator('#controllerCollapseButton').click();await page.waitForTimeout(600);
  const video=page.video();await page.close();await context.close();return video.path();
}

for(const spec of specs)await exerciseViewport(...spec);
const reducedContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),reduced=await reducedContext.newPage();listen(reduced);await seed(reduced);await reduced.goto(urlFor('reduced-motion'),{waitUntil:'networkidle'});await enter(reduced,'Kick');const transitions=await reduced.evaluate(()=>({deck:getComputedStyle(document.querySelector('.control-deck')).transitionDuration,icon:getComputedStyle(document.querySelector('.controller-collapse span')).transitionDuration}));if(transitions.deck!=='0s'||transitions.icon!=='0s')throw new Error(`Reduced-motion transitions remain (${JSON.stringify(transitions)}).`);checks.push({kind:'reduced-motion',transitions});await reducedContext.close();

const desktopRaw=await record('desktop',1440,1000),phoneRaw=await record('phone',390,844),mp4=join(outputDir,'floating-classic-controller-walkthrough.mp4');
const transcode=spawnSync('ffmpeg',['-y','-i',desktopRaw,'-i',phoneRaw,'-filter_complex','[0:v]fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setsar=1[d];[1:v]fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setsar=1[p];[d][p]concat=n=2:v=1:a=0[out]','-map','[out]','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);const video=JSON.parse(probe.stdout);if(statSync(mp4).size<100_000||Number(video.format?.duration||0)<12)throw new Error(`MP4 validation failed (${statSync(mp4).size} bytes, ${video.format?.duration}s).`);
const externalRequests=[...new Set(requests.filter(url=>{try{return new URL(url).hostname!=='127.0.0.1';}catch{return true;}}))];if(externalRequests.length)throw new Error(`External requests observed: ${externalRequests.join(', ')}`);if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
const report={revision,baseUrl,externalRequests,errors,video:{path:mp4,bytes:statSync(mp4).size,...video},checks,files:readdirSync(outputDir).sort()};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify({revision,checks:checks.length,video:report.video,files:report.files},null,2));await browser.close();
