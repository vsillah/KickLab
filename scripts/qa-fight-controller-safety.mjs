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
    return{label,state,url:location.href,viewport:{width:innerWidth,height:innerHeight},legacyBand:window.__KICKLAB_FIGHT_POWER_BAND__||null,performance,canvas:canvasBox,stage:stageBox,deck:deckBox,pad:rect(pad),left:rect(left),center:rect(center),right:rect(right),combo:comboBox,readout:readoutBox,results:resultBox,styles:{deck:style(deck),left:style(left),center:style(center),right:style(right)},comboState:combo?.dataset.state,collapsed:document.querySelector('#controllerCollapseButton')?.getAttribute('aria-expanded')==='false',overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  },{label,state});
  const inside=value.deck.left>=value.stage.left-1&&value.deck.right<=value.stage.right+1&&value.deck.top>=value.stage.top-1&&value.deck.bottom<=value.stage.bottom+1,readoutInside=!value.readout||(value.readout.left>=value.deck.left-1&&value.readout.right<=value.deck.right+1&&value.readout.top>=value.deck.top-1&&value.readout.bottom<=value.deck.bottom+1),heightRatio=value.deck.height/value.stage.height,transparentChildren=[value.styles.left,value.styles.center,value.styles.right].every(item=>item.boxShadow==='none'&&item.background==='none'&&item.backgroundColor==='rgba(0, 0, 0, 0)');
  if(value.legacyBand||!value.performance||value.performance.surface!=='controller'||value.performance.overhead!==false||!inside||!readoutInside||value.overflow>1||value.viewport.width<=480&&heightRatio>.5||!transparentChildren)throw new Error(`${label}/${state}: unsafe unified-controller geometry ${JSON.stringify({...value,inside,readoutInside,heightRatio,transparentChildren})}`);
  checks.push({kind:'controller-surface',...value,inside,readoutInside,heightRatio,transparentChildren});return value;
}

async function styleState(page,label,state){
  const value=await page.evaluate(({label,state})=>{
    const group=document.querySelector('#controlStyleOptions'),collapse=document.querySelector('#controllerCollapseButton'),head=document.querySelector('.floating-control-head'),deck=document.querySelector('.control-deck'),stage=document.querySelector('.stage'),pad=document.querySelector('#pad'),right=document.querySelector('#padR'),rail=document.querySelector('#gameGuidanceHud'),buttons=[...group.querySelectorAll('.control-style-button')];
    const visible=node=>!!node&&node.getClientRects().length>0&&!node.hidden,rect=node=>node?.getBoundingClientRect().toJSON()||null;
    const buttonStates=buttons.map(button=>{const tip=button.querySelector('.control-style-tooltip'),tipStyle=getComputedStyle(tip);return{id:button.id,visible:visible(button),box:rect(button),pressed:button.getAttribute('aria-pressed'),label:button.getAttribute('aria-label'),title:button.title,tooltip:button.dataset.tooltip,svg:!!button.querySelector('svg'),tip:{text:tip.textContent.trim(),box:rect(tip),opacity:Number(tipStyle.opacity),visibility:tipStyle.visibility,pointerEvents:tipStyle.pointerEvents,ariaHidden:tip.getAttribute('aria-hidden')}};});
    return{label,state,head:rect(head),deck:rect(deck),stage:rect(stage),pad:rect(pad),right:rect(right),rail:rect(rail),group:rect(group),groupLabel:group.getAttribute('aria-label'),collapse:rect(collapse),collapseLabel:collapse.getAttribute('aria-label'),buttons:buttonStates,activeId:document.activeElement?.id||'',legacy:{styleDisclosure:!!document.querySelector('#controlStyleDisclosure'),styleText:!!document.querySelector('#floatingControllerState'),modeSelector:!!document.querySelector('#controllerModeDisclosure'),manual:!!document.querySelector('#manualController, #wideManualController, #prototypePhysics')},overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  },{label,state});
  const small=value.buttons.filter(button=>!button.visible||button.box.width<43.5||button.box.height<43.5),pressed=value.buttons.filter(button=>button.pressed==='true');
  const activeTooltips=value.buttons.map(button=>button.tip).filter(tip=>tip.opacity>.99&&tip.visibility==='visible'),activeTooltip=activeTooltips[0]||null,inside=(inner,outer)=>inner&&outer&&inner.left>=outer.left-1&&inner.right<=outer.right+1&&inner.top>=outer.top-1&&inner.bottom<=outer.bottom+1;
  const groupRightAligned=Math.abs(value.head.right-value.group.right)<=1,collapseDistinct=value.group.left-value.collapse.right>=4&&value.collapse.width>=43.5&&value.collapse.height>=43.5&&value.group.left>value.collapse.left;
  const headerContained=inside(value.group,value.head)&&inside(value.collapse,value.head),baseOverlaps=overlap(value.group,value.collapse)||overlap(value.group,value.right)||overlap(value.group,value.rail)||overlap(value.collapse,value.right)||overlap(value.collapse,value.rail);
  const tooltipUnsafe=activeTooltip&&(!inside(activeTooltip.box,value.head)||overlap(activeTooltip.box,value.group)||overlap(activeTooltip.box,value.collapse)||overlap(activeTooltip.box,value.pad)||overlap(activeTooltip.box,value.right)||overlap(activeTooltip.box,value.rail));
  if(small.length||pressed.length!==1||activeTooltips.length>1||value.buttons.some(button=>!button.svg||button.label!==button.title||button.label!==button.tooltip||button.tip.text!==button.tooltip||button.tip.ariaHidden!=='true'||button.tip.pointerEvents!=='none')||value.groupLabel!=='Controller style'||!value.collapseLabel?.includes('game controls')||!groupRightAligned||!collapseDistinct||!headerContained||baseOverlaps||tooltipUnsafe||!inside(value.head,value.deck)||!inside(value.deck,value.stage)||Object.values(value.legacy).some(Boolean)||value.overflow>1)throw new Error(`${label}/${state}: icon selector contract failed ${JSON.stringify({small,pressed,activeTooltipCount:activeTooltips.length,groupRightAligned,collapseDistinct,headerContained,baseOverlaps,tooltipUnsafe,value})}`);
  const result={...value,activeTooltip,activeTooltipCount:activeTooltips.length,groupRightAligned,collapseDistinct,headerContained,baseOverlaps,tooltipUnsafe};checks.push({kind:'icon-style-selector',...result});return result;
}

async function exerciseSelectors(page,label,capture){
  await styleState(page,label,'classic-default');
  await page.locator('#classicControlsButton').hover();await page.waitForTimeout(160);const hover=await styleState(page,label,'classic-hover');if(!hover.activeTooltip||hover.activeTooltip.text!=='Classic controls')throw new Error(`${label}: Classic hover tooltip was not exposed ${JSON.stringify(hover.activeTooltip)}`);
  await page.locator('#analogControlsButton').click();const analogPointer=await styleState(page,label,'analog-pointer');if(analogPointer.buttons.find(button=>button.id==='analogControlsButton').pressed!=='true')throw new Error(`${label}: pointer did not select Analog.`);
  await page.locator('#classicControlsButton').click();
  await page.locator('#classicControlsButton').focus();await page.locator('#classicControlsButton').press('ArrowRight');await page.waitForFunction(()=>document.activeElement?.id==='analogControlsButton');await page.waitForTimeout(160);const analogKeyboard=await styleState(page,label,'analog-keyboard-focus');if(analogKeyboard.activeId!=='analogControlsButton'||analogKeyboard.buttons.find(button=>button.id==='analogControlsButton').pressed!=='true'||analogKeyboard.activeTooltip?.text!=='Analog controls')throw new Error(`${label}: keyboard selection or focus tooltip failed ${JSON.stringify(analogKeyboard)}`);
  if(capture)await page.screenshot({path:join(outputDir,`${label}-style-tooltip.png`)});
  await page.locator('#analogControlsButton').press('Home');await page.waitForFunction(()=>document.activeElement?.id==='classicControlsButton');const classicKeyboard=await styleState(page,label,'classic-keyboard-focus');if(classicKeyboard.activeId!=='classicControlsButton'||classicKeyboard.buttons.find(button=>button.id==='classicControlsButton').pressed!=='true')throw new Error(`${label}: Home did not restore Classic with focus.`);
  await page.locator('#controllerCollapseButton').click();await page.waitForFunction(()=>document.querySelector('#controllerCollapseButton')?.getAttribute('aria-expanded')==='false');await page.waitForTimeout(120);const collapsed=await controllerState(page,label,'collapsed');if(!collapsed.collapsed)throw new Error(`${label}: controller did not collapse.`);if(capture)await page.screenshot({path:join(outputDir,`${label}-collapsed.png`)});await page.locator('#controllerCollapseButton').click();await page.waitForFunction(()=>document.querySelector('#controllerCollapseButton')?.getAttribute('aria-expanded')==='true');
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
  const label='analog-reduced-motion',width=1113,height=988,context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:{dir:videoDir,size:{width,height}}});await seed(context);const page=await context.newPage();await enterFight(page,label);await page.locator('#analogControlsButton').click();await controllerState(page,label,'analog-passive');await styleState(page,label,'analog-reduced-motion');await page.screenshot({path:join(outputDir,`${label}-analog.png`)});await page.waitForFunction(()=>Math.abs(window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_READ__().fight.needle-.5)<.04,null,{timeout:7000});await page.locator('#gestureAction').press('Enter',{delay:420});await page.waitForFunction(()=>window.__KICKLAB_FIGHT_PERFORMANCE__?.phase==='tune',null,{timeout:2500});const tune=await performanceState(page,label,'tune');for(let step=0;step<2;step+=1){await page.locator('#livePhysicsComboBand .live-physics-choice[data-recommended="true"]').first().click();if(step===0)await page.waitForFunction(()=>document.querySelector('#livePhysicsComboProgress')?.textContent.includes('2 / 2'));}await page.waitForFunction(()=>window.__KICKLAB_FIGHT_PERFORMANCE__?.phase==='see');const see=await performanceState(page,label,'see'),style=await page.locator('#analogControlsButton').getAttribute('aria-pressed');if(style!=='true')throw new Error(`${label}: Analog control style did not remain active.`);checks.push({kind:'analog-reduced-motion',label,style:'Analog',tune,see});const video=page.video();await page.close();await context.close();videoSources.push({label,width,height,path:await video.path()});
}

const mp4=join(outputDir,'fight-controller-safety-walkthrough.mp4');
const args=['-y'];for(const source of videoSources)args.push('-i',source.path);const filters=videoSources.map((source,index)=>`[${index}:v]fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v${index}]`).join(';')+`;${videoSources.map((_,index)=>`[v${index}]`).join('')}concat=n=${videoSources.length}:v=1:a=0[out]`;args.push('-filter_complex',filters,'-map','[out]','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4);const transcode=spawnSync('ffmpeg',args,{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);const video=JSON.parse(probe.stdout);if(statSync(mp4).size<100_000||Number(video.format?.duration||0)<12||video.streams?.[0]?.codec_name!=='h264'||video.streams?.[0]?.width!==1280||video.streams?.[0]?.height!==720)throw new Error(`MP4 validation failed ${JSON.stringify({bytes:statSync(mp4).size,video})}`);
const externalRequests=[...new Set(requests.filter(url=>{try{return new URL(url).origin!==new URL(baseUrl).origin;}catch{return true;}}))];if(externalRequests.length)throw new Error(`External requests observed: ${externalRequests.join(', ')}`);if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
const report={revision,baseUrl,externalRequests,errors,checks,video:{path:mp4,bytes:statSync(mp4).size,...video},files:readdirSync(outputDir).sort()};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify({revision,checks:checks.length,video:report.video,files:report.files},null,2));await browser.close();
