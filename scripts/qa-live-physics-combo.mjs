import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url),{chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4317/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/live-physics-combo');
const revision=process.argv[4]||'working-tree',videoDir=join(outputDir,'video-source');
mkdirSync(videoDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath}),errors=[],requests=[],checks=[],screenshots=[];
const localOrigin=new URL(baseUrl).origin;
const watch=page=>{page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('request',request=>requests.push(request.url()));};
const urlFor=(label,enabled=true)=>`${baseUrl}?qa=live-physics-combo&rev=${encodeURIComponent(revision)}&view=${encodeURIComponent(label)}${enabled?'&livePhysicsCombo=1':''}`;
async function enterLab(page,mode,label,{enabled=true}={}){watch(page);await page.goto(urlFor(label,enabled),{waitUntil:'networkidle'});if(await page.locator('#profileDialog').isVisible())await page.getByRole('button',{name:'Close profiles'}).click();await page.locator(`#lab-tab-${mode}`).click();await page.waitForTimeout(5300);if(!(await page.locator('#game-cockpit').isVisible()))throw new Error(`${label}: ${mode} lab did not open`);}
async function trigger(page,mode,input='pointer'){
  if(mode==='fight'){
    const action=page.locator('button.abtn[data-id="cross"]');
    for(let attempt=0;attempt<24&&!(await page.locator('#livePhysicsCombo').isVisible());attempt+=1){if(input==='keyboard')await page.keyboard.press('KeyK');else if(input==='touch'){const box=await action.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}else await action.click();await page.waitForTimeout(250);}
  }else if(mode==='kick'){
    if(input==='keyboard')await page.keyboard.press('Space');else{const action=page.locator('button.abtn[data-id="go"]');if(input==='touch'){const box=await action.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}else await action.click();}
  }else{
    await page.keyboard.down('Space');try{await page.locator('#livePhysicsCombo').waitFor({state:'visible',timeout:28000});}finally{await page.keyboard.up('Space');}
  }
  await page.locator('#livePhysicsCombo').waitFor({state:'visible',timeout:2500});
}
async function activeAudit(page,label,mode,width,height){
  const state=await page.locator('#livePhysicsCombo').evaluate((el,{mode,width,height})=>{const box=el.getBoundingClientRect(),buttons=[...el.querySelectorAll('.live-physics-choice')],buttonBoxes=buttons.map(button=>button.getBoundingClientRect());return{mode,width,height,visible:!el.hidden,state:el.dataset.state,progress:el.querySelector('#livePhysicsComboProgress').textContent.trim(),variable:el.querySelector('#livePhysicsComboVariable').textContent.trim(),coach:el.querySelector('.live-physics-combo-coach b').textContent.trim(),choices:buttons.length,minChoiceWidth:Math.min(...buttonBoxes.map(item=>item.width)),minChoiceHeight:Math.min(...buttonBoxes.map(item=>item.height)),choicesContained:buttonBoxes.every(item=>item.left>=box.left-1&&item.right<=box.right+1&&item.left>=-1&&item.right<=innerWidth+1),box:box.toJSON(),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};},{mode,width,height});
  if(!state.visible||state.choices!==6||state.minChoiceWidth<43.5||state.minChoiceHeight<43.5||!state.choicesContained||state.overflow>1||state.coach!=='Coach Tomi')throw new Error(`${label}: invalid active combo ${JSON.stringify(state)}`);
  return state;
}
async function resolveCombo(page,outcome){
  for(let step=0;step<3;step+=1){
    const state=await page.locator('#livePhysicsCombo').getAttribute('data-state');
    if(state!=='active'&&state!=='locked')break;
    let choice;
    if(outcome==='failure')choice=page.locator('.live-physics-choice[data-correct="false"]').first();
    if(!choice||await choice.count()===0)choice=page.locator('.live-physics-choice[data-correct="true"]').first();
    await choice.click();
  }
  await page.waitForTimeout(90);
  const result={state:await page.locator('#livePhysicsCombo').getAttribute('data-state'),status:(await page.locator('#livePhysicsComboStatus').textContent()).trim()};
  if(outcome==='success'&&result.state!=='success')throw new Error(`success did not resolve: ${JSON.stringify(result)}`);
  if(outcome==='failure'&&result.state!=='incorrect')throw new Error(`failure did not resolve: ${JSON.stringify(result)}`);
  return result;
}
async function scenario({mode,outcome,width,height,input='pointer',reducedMotion='no-preference',recordVideo=false,label}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:input==='touch',reducedMotion,...(recordVideo?{recordVideo:{dir:videoDir,size:{width,height}}}:{})}),page=await context.newPage();
  await enterLab(page,mode,label);await trigger(page,mode,input);const active=await activeAudit(page,label,mode,width,height),screenshot=join(outputDir,`${label}-active.png`);await page.screenshot({path:screenshot});screenshots.push(screenshot);const result=await resolveCombo(page,outcome);await page.waitForTimeout(900);const continuation={comboHidden:await page.locator('#livePhysicsCombo').isHidden(),resultsVisible:await page.locator('#results').isVisible(),history:(await page.locator('#historyLatest').textContent()).trim()};const video=recordVideo?page.video():null;await page.close();await context.close();const source=video?await video.path():null;checks.push({label,kind:'live-combo',mode,outcome,input,viewport:`${width}x${height}`,reducedMotion,active,result,continuation,screenshot});return source;
}

// Default-off compatibility: the legacy action proceeds and the combo never mounts visibly.
{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();await enterLab(page,'fight','flag-off',{enabled:false});const before=await page.evaluate(()=>Object.keys(localStorage).sort());await page.locator('button.abtn[data-id="cross"]').click();await page.waitForTimeout(150);const after=await page.evaluate(()=>Object.keys(localStorage).sort()),hidden=await page.locator('#livePhysicsCombo').isHidden();if(!hidden||JSON.stringify(before)!==JSON.stringify(after))throw new Error(`flag-off compatibility failed: ${JSON.stringify({hidden,before,after})}`);checks.push({label:'flag-off',kind:'compatibility',hidden,storageKeysBefore:before,storageKeysAfter:after});await context.close();
}

await scenario({mode:'fight',outcome:'success',width:1440,height:1000,input:'pointer',label:'desktop-1440x1000-fight-success'});
await scenario({mode:'race',outcome:'success',width:768,height:1024,input:'pointer',label:'tablet-768x1024-race-success'});
await scenario({mode:'kick',outcome:'success',width:1113,height:988,input:'keyboard',label:'desktop-1113x988-kick-success'});
await scenario({mode:'fight',outcome:'failure',width:390,height:844,input:'touch',label:'phone-390x844-fight-failure'});
await scenario({mode:'race',outcome:'failure',width:390,height:844,input:'pointer',label:'phone-390x844-race-failure'});
await scenario({mode:'kick',outcome:'failure',width:390,height:844,input:'touch',reducedMotion:'reduce',label:'phone-390x844-kick-failure-reduced'});
const videoSource=await scenario({mode:'fight',outcome:'success',width:1280,height:720,input:'pointer',recordVideo:true,label:'walkthrough-fight-success'});

// An in-context stage pause owns cancellation and cannot race a later timeout.
{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();await enterLab(page,'fight','pause-cancellation');await trigger(page,'fight');await page.locator('#cv').click({position:{x:20,y:20}});await page.waitForTimeout(150);const hidden=await page.locator('#livePhysicsCombo').isHidden(),status=(await page.locator('#livePhysicsComboStatus').textContent()).trim();if(!hidden||!status.includes('cancelled'))throw new Error(`pause cancellation failed: ${JSON.stringify({hidden,status})}`);checks.push({label:'pause-cancellation',kind:'lifecycle',hidden,status});await context.close();
}

await browser.close();
const externalRequests=[...new Set(requests.filter(url=>{try{return new URL(url).origin!==localOrigin;}catch{return true;}}))];
if(externalRequests.length)throw new Error(`External requests observed: ${externalRequests.join(', ')}`);
if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
const mp4=join(outputDir,'live-physics-combo-walkthrough.mp4'),transcode=spawnSync('ffmpeg',['-y','-i',videoSource,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});
if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});
if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);
const video=JSON.parse(probe.stdout);if(statSync(mp4).size<40_000||Number(video.format?.duration||0)<4)throw new Error(`MP4 validation failed (${statSync(mp4).size} bytes, ${video.format?.duration}s)`);
const report={revision,baseUrl,externalRequests,errors,checks,screenshots,video:{path:mp4,bytes:statSync(mp4).size,...video},files:readdirSync(outputDir).sort()};
writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));
