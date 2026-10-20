import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url),{chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4318/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/fight-controller-safety');
const revision=process.argv[4]||'working-tree',videoDir=join(outputDir,'video-source');
mkdirSync(videoDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath}),checks=[],requests=[],errors=[],videoSources=[];
const specs=[['desktop-1440x1000',1440,1000],['mid-1113x988',1113,988],['tablet-768x1024',768,1024],['phone-390x844',390,844]];
const urlFor=label=>`${baseUrl}?qa=fight-controller-safety&livePhysicsCombo=1&rev=${encodeURIComponent(revision)}&view=${encodeURIComponent(label)}`;
const overlap=(a,b)=>!!a&&!!b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

function watch(page){
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>requests.push(request.url()));
}

async function seed(context){
  await context.addInitScript(()=>{
    localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'canvas',mute:true,ch:{fight:0,race:0,kick:0},play:{fight:'lab',race:'ch',kick:'ch'}}));
    localStorage.setItem('impactlab.nick','QA Player');
  });
}

async function enterFight(page,label){
  watch(page);await page.goto(urlFor(label),{waitUntil:'networkidle'});
  if(await page.locator('#profileDialog').isVisible())await page.getByRole('button',{name:'Close profiles'}).click();
  await page.locator('#lab-tab-fight').click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:12000});
  if((await page.locator('#controllerCollapseButton').getAttribute('aria-expanded'))==='false')await page.locator('#controllerCollapseButton').click();
  await page.waitForTimeout(300);
}

async function controllerState(page,label,state){
  const value=await page.evaluate(({label,state})=>{
    const canvas=document.querySelector('#cv'),stage=document.querySelector('.stage'),deck=document.querySelector('.control-deck'),pad=document.querySelector('#pad'),left=document.querySelector('#controlLeftSlot'),center=document.querySelector('.control-center-slot'),right=document.querySelector('#padR'),combo=document.querySelector('#livePhysicsCombo'),readout=document.querySelector('#fightPerformanceReadout'),results=document.querySelector('#results'),performance=window.__KICKLAB_FIGHT_PERFORMANCE__;
    const rect=node=>node?.getBoundingClientRect().toJSON()||null,visible=node=>!!node&&node.getClientRects().length>0&&!node.hidden&&getComputedStyle(node).visibility!=='hidden',style=node=>{const s=getComputedStyle(node);return{background:s.backgroundImage,backgroundColor:s.backgroundColor,border:s.border,boxShadow:s.boxShadow,backdrop:s.backdropFilter||s.webkitBackdropFilter};},canvasBox=rect(canvas),stageBox=rect(stage),deckBox=rect(deck),comboBox=visible(combo)?rect(combo):null,readoutBox=visible(readout)?rect(readout):null,resultBox=visible(results)?rect(results):null;
    return{label,state,url:location.href,viewport:{width:innerWidth,height:innerHeight},legacyBand:window.__KICKLAB_FIGHT_POWER_BAND__||null,performance,canvas:canvasBox,stage:stageBox,deck:deckBox,pad:rect(pad),left:rect(left),center:rect(center),right:rect(right),combo:comboBox,readout:readoutBox,results:resultBox,styles:{deck:style(deck),left:style(left),center:style(center),right:style(right)},comboState:combo?.dataset.state,controllerState:document.querySelector('#floatingControllerState')?.textContent.trim(),modeState:document.querySelector('#controllerModeSelected')?.textContent.trim(),collapsed:document.querySelector('#controllerCollapseButton')?.getAttribute('aria-expanded')==='false',overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  },{label,state});
  const inside=value.deck.left>=value.stage.left-1&&value.deck.right<=value.stage.right+1&&value.deck.top>=value.stage.top-1&&value.deck.bottom<=value.stage.bottom+1,readoutInside=!value.readout||(value.readout.left>=value.deck.left-1&&value.readout.right<=value.deck.right+1&&value.readout.top>=value.deck.top-1&&value.readout.bottom<=value.deck.bottom+1),heightRatio=value.deck.height/value.stage.height,transparentChildren=[value.styles.left,value.styles.center,value.styles.right].every(item=>item.boxShadow==='none'&&item.background==='none'&&item.backgroundColor==='rgba(0, 0, 0, 0)');
  if(value.legacyBand||!value.performance||value.performance.surface!=='controller'||value.performance.overhead!==false||!inside||!readoutInside||value.overflow>1||value.viewport.width<=480&&heightRatio>.5||!transparentChildren)throw new Error(`${label}/${state}: unsafe unified-controller geometry ${JSON.stringify({...value,inside,readoutInside,heightRatio,transparentChildren})}`);
  checks.push({kind:'controller-surface',...value,inside,readoutInside,heightRatio,transparentChildren});return value;
}

async function selectorState(page,label,kind,expanded){
  const ids=kind==='style'?{root:'.control-style-selector',summary:'#controlStyleDisclosure',options:'#controlStyleOptions',buttons:['#classicControlsButton','#analogControlsButton']}:{root:'.controller-mode-selector',summary:'#controllerModeDisclosure',options:'#controllerModeOptions',buttons:['#controllerModePlay','#controllerModeManual']};
  const value=await page.evaluate(({label,kind,expanded,ids})=>{const root=document.querySelector(ids.root),summary=document.querySelector(ids.summary),options=document.querySelector(ids.options),rail=document.querySelector('#gameGuidanceHud'),deck=document.querySelector('.control-deck'),visible=node=>!!node&&node.getClientRects().length>0&&!node.hidden,rect=node=>node?.getBoundingClientRect().toJSON()||null,buttons=ids.buttons.map(id=>document.querySelector(id)),optionBox=visible(options)?rect(options):null;return{label,kind,expanded,rootState:root.dataset.expanded,ariaExpanded:summary.getAttribute('aria-expanded'),summaryVisible:visible(summary),optionsVisible:visible(options),summary:rect(summary),options:optionBox,buttons:buttons.map(button=>({id:button.id,visible:visible(button),disabled:button.disabled,box:rect(button)})),rail:rect(rail),deck:rect(deck),status:kind==='mode'?{visible:visible(document.querySelector('#controllerModeStatus')),box:rect(document.querySelector('#controllerModeStatus')),text:document.querySelector('#controllerModeStatus').textContent.trim()}:null,activeId:document.activeElement?.id||'',overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};},{label,kind,expanded,ids});
  const actual=value.ariaExpanded==='true';
  if(actual!==expanded||value.optionsVisible!==expanded||value.summaryVisible===expanded||value.rootState!==String(expanded)||value.overflow>1)throw new Error(`${label}/${kind}: disclosure state failed ${JSON.stringify(value)}`);
  if(expanded){const small=value.buttons.filter(button=>!button.visible||button.box.width<43.5||button.box.height<43.5),railOverlap=overlap(value.options,value.rail);if(small.length||railOverlap)throw new Error(`${label}/${kind}: expanded target geometry failed ${JSON.stringify({small,railOverlap,value})}`);}
  if(kind==='mode'&&(value.status.box.width>1||value.status.box.height>1))throw new Error(`${label}: unavailable/status copy escaped the accessibility-only context ${JSON.stringify(value.status)}`);
  checks.push({kind:'compact-selector',...value});return value;
}

async function exerciseSelectors(page,label,capture){
  await selectorState(page,label,'style',false);
  await page.locator('#controlStyleDisclosure').click();await selectorState(page,label,'style',true);
  if(capture)await page.screenshot({path:join(outputDir,`${label}-style-expanded.png`)});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.id==='controlStyleDisclosure');
  await selectorState(page,label,'style',false);
  await page.locator('#controlStyleDisclosure').press('ArrowDown');await selectorState(page,label,'style',true);
  await page.locator('#analogControlsButton').press('End');if((await page.locator('#controlStyleDisclosure').getAttribute('aria-expanded'))!=='false'||(await page.locator('#floatingControllerState').textContent()).trim()!=='Analog')throw new Error(`${label}: style keyboard selection did not collapse to Analog.`);
  await page.locator('#controlStyleDisclosure').click();await page.locator('#classicControlsButton').click();
  await page.locator('#controllerCollapseButton').click();await page.waitForFunction(()=>document.querySelector('#controllerCollapseButton')?.getAttribute('aria-expanded')==='false');await page.waitForTimeout(120);const collapsed=await controllerState(page,label,'collapsed');if(!collapsed.collapsed)throw new Error(`${label}: controller did not collapse.`);if(capture)await page.screenshot({path:join(outputDir,`${label}-collapsed.png`)});await page.locator('#controllerCollapseButton').click();await page.waitForFunction(()=>document.querySelector('#controllerCollapseButton')?.getAttribute('aria-expanded')==='true');
  await selectorState(page,label,'mode',false);
  await page.locator('#controllerModeDisclosure').click();await selectorState(page,label,'mode',true);
  if(capture)await page.screenshot({path:join(outputDir,`${label}-mode-expanded.png`)});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.id==='controllerModeDisclosure');
  await selectorState(page,label,'mode',false);
  await page.locator('#controllerModeDisclosure').click();await page.locator('#controllerModeManual').click();if((await page.locator('#controllerModeSelected').textContent()).trim()!=='Manual'||(await page.locator('#controllerModeDisclosure').getAttribute('aria-expanded'))!=='false')throw new Error(`${label}: Manual selection did not collapse.`);
  await page.locator('#controllerModeDisclosure').click();await page.locator('#controllerModePlay').click();if((await page.locator('#controllerModeSelected').textContent()).trim()!=='Play')throw new Error(`${label}: Play selection did not restore.`);
}

async function startCombo(page){
  await page.waitForFunction(()=>Math.abs(window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_READ__().fight.needle-.5)<.04,null,{timeout:7000});
  await page.locator('button.abtn[data-id="cross"]').click();
  await page.waitForFunction(()=>document.querySelector('#livePhysicsCombo')?.dataset.state==='active',null,{timeout:2500});
  await page.waitForTimeout(120);
}

async function performanceState(page,label,phase){
  const value=await page.evaluate(({label,phase})=>{const performance=window.__KICKLAB_FIGHT_PERFORMANCE__,combo=document.querySelector('#livePhysicsCombo'),buttons=[...document.querySelectorAll('#livePhysicsComboBand .live-physics-choice')],audit=window.__KICKLAB_LIVE_PHYSICS_COMBO_AUDIT__;return{label,phase,performance,comboPhase:combo?.dataset.phase,comboState:combo?.dataset.state,progress:document.querySelector('#livePhysicsComboProgress')?.textContent.trim(),variable:document.querySelector('#livePhysicsComboVariable')?.textContent.trim(),buttonCount:buttons.length,recommended:buttons.filter(button=>button.dataset.recommended==='true').length,selected:buttons.filter(button=>button.getAttribute('aria-checked')==='true').length,timeScale:audit?.timeScale,reducedMotion:audit?.reducedMotion};},{label,phase});
  if(!value.performance||value.performance.phase!==phase||value.comboPhase!==phase||value.performance.surface!=='controller'||value.performance.overhead!==false)throw new Error(`${label}/${phase}: performance phase mismatch ${JSON.stringify(value)}`);
  if(value.performance.timingInteractive&&value.performance.physicsInteractive)throw new Error(`${label}/${phase}: timing and physics were concurrently interactive ${JSON.stringify(value)}`);
  if(phase==='time'&&(value.buttonCount!==0||!value.performance.timingInteractive||value.performance.physicsInteractive))throw new Error(`${label}: TIME IT exposed physics choices ${JSON.stringify(value)}`);
  if(phase==='tune'&&(value.buttonCount!==6||value.recommended<1||value.selected!==1||value.performance.timingInteractive||!value.performance.physicsInteractive||(!value.reducedMotion&&value.timeScale===1)))throw new Error(`${label}: TUNE IT hierarchy failed ${JSON.stringify(value)}`);
  if(phase==='see'&&(value.buttonCount!==0||value.performance.timingInteractive||value.performance.physicsInteractive||value.timeScale!==1||value.performance.force<=0))throw new Error(`${label}: SEE IT hierarchy failed ${JSON.stringify(value)}`);
  checks.push({kind:'fight-performance-phase',...value});return value;
}

async function forceMiniResult(page){
  await page.locator('#results').waitFor({state:'visible',timeout:8000});
}

async function exerciseViewport(label,width,height){
  const record=label==='desktop-1440x1000'||label==='phone-390x844',context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=480,...(record?{recordVideo:{dir:videoDir,size:{width,height}}}:{})});await seed(context);const page=await context.newPage();await enterFight(page,label);
  const passive=await controllerState(page,label,'passive-ready');await performanceState(page,label,'time');await page.screenshot({path:join(outputDir,`${label}-passive.png`)});await page.waitForTimeout(180);await page.screenshot({path:join(outputDir,`${label}-time-it.png`)});
  await exerciseSelectors(page,label,true);
  await startCombo(page);const active=await controllerState(page,label,'active-combo');await performanceState(page,label,'tune');await page.screenshot({path:join(outputDir,`${label}-tune-it-1.png`)});
  await page.locator('#livePhysicsComboBand .live-physics-choice[data-recommended="true"]').first().click();await page.waitForFunction(()=>document.querySelector('#livePhysicsComboProgress')?.textContent.includes('2 / 2'));await performanceState(page,label,'tune');await page.screenshot({path:join(outputDir,`${label}-tune-it-2.png`)});
  await page.locator('#livePhysicsComboBand .live-physics-choice[data-recommended="true"]').first().click();await page.waitForFunction(()=>document.querySelector('#livePhysicsCombo')?.dataset.phase==='see');await page.waitForTimeout(100);await performanceState(page,label,'see');await page.screenshot({path:join(outputDir,`${label}-see-it.png`)});
  await forceMiniResult(page);const result=await controllerState(page,label,'mini-result');await page.screenshot({path:join(outputDir,`${label}-result.png`)});
  const replayStart=await page.evaluate(()=>window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_REPLAY__());await page.locator('#rbar').waitFor({state:'visible',timeout:2500});const replay=await page.evaluate(()=>({combo:document.querySelector('#livePhysicsCombo')?.dataset.state,physicsInteractive:window.__KICKLAB_FIGHT_PERFORMANCE__?.physicsInteractive}));if(!replayStart.replay||replayStart.comboActive||replay.physicsInteractive)throw new Error(`${label}: replay did not suppress physics input ${JSON.stringify({replayStart,replay})}`);if(record)await page.screenshot({path:join(outputDir,`${label}-replay.png`)});await page.locator('#rbExit').click();checks.push({kind:'replay',label,...replayStart,...replay});
  const video=record?page.video():null;await page.close();await context.close();if(video)videoSources.push({label,width,height,path:await video.path()});checks.push({kind:'viewport-complete',label,width,height,passive:passive.deck,active:active.deck,result:result.deck});
}

for(const spec of specs)await exerciseViewport(...spec);

{
  const label='analog-reduced-motion',width=1113,height=988,context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:{dir:videoDir,size:{width,height}}});await seed(context);const page=await context.newPage();await enterFight(page,label);await page.locator('#controlStyleDisclosure').click();await page.locator('#analogControlsButton').click();await controllerState(page,label,'analog-passive');await page.screenshot({path:join(outputDir,`${label}-analog.png`)});await page.waitForFunction(()=>Math.abs(window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_READ__().fight.needle-.5)<.04,null,{timeout:7000});await page.locator('#gestureAction').press('Enter',{delay:420});await page.waitForFunction(()=>window.__KICKLAB_FIGHT_PERFORMANCE__?.phase==='tune',null,{timeout:2500});const tune=await performanceState(page,label,'tune');for(let step=0;step<2;step+=1){await page.locator('#livePhysicsComboBand .live-physics-choice[data-recommended="true"]').first().click();if(step===0)await page.waitForFunction(()=>document.querySelector('#livePhysicsComboProgress')?.textContent.includes('2 / 2'));}await page.waitForFunction(()=>window.__KICKLAB_FIGHT_PERFORMANCE__?.phase==='see');const see=await performanceState(page,label,'see'),style=(await page.locator('#floatingControllerState').textContent()).trim();if(style!=='Analog')throw new Error(`${label}: Analog control style did not remain active.`);checks.push({kind:'analog-reduced-motion',label,style,tune,see});const video=page.video();await page.close();await context.close();videoSources.push({label,width,height,path:await video.path()});
}

const mp4=join(outputDir,'fight-controller-safety-walkthrough.mp4');
const args=['-y'];for(const source of videoSources)args.push('-i',source.path);const filters=videoSources.map((source,index)=>`[${index}:v]fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v${index}]`).join(';')+`;${videoSources.map((_,index)=>`[v${index}]`).join('')}concat=n=${videoSources.length}:v=1:a=0[out]`;args.push('-filter_complex',filters,'-map','[out]','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4);const transcode=spawnSync('ffmpeg',args,{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);const video=JSON.parse(probe.stdout);if(statSync(mp4).size<100_000||Number(video.format?.duration||0)<12||video.streams?.[0]?.codec_name!=='h264'||video.streams?.[0]?.width!==1280||video.streams?.[0]?.height!==720)throw new Error(`MP4 validation failed ${JSON.stringify({bytes:statSync(mp4).size,video})}`);
const externalRequests=[...new Set(requests.filter(url=>{try{return new URL(url).origin!==new URL(baseUrl).origin;}catch{return true;}}))];if(externalRequests.length)throw new Error(`External requests observed: ${externalRequests.join(', ')}`);if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
const report={revision,baseUrl,externalRequests,errors,checks,video:{path:mp4,bytes:statSync(mp4).size,...video},files:readdirSync(outputDir).sort()};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify({revision,checks:checks.length,video:report.video,files:report.files},null,2));await browser.close();
