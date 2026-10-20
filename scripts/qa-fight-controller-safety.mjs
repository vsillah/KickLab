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

async function bandState(page,label,state){
  const value=await page.evaluate(({label,state})=>{
    const canvas=document.querySelector('#cv'),stage=document.querySelector('.stage'),deck=document.querySelector('.control-deck'),combo=document.querySelector('#livePhysicsCombo'),results=document.querySelector('#results'),audit=window.__KICKLAB_FIGHT_POWER_BAND__;
    const rect=node=>node?.getBoundingClientRect().toJSON()||null,visible=node=>!!node&&node.getClientRects().length>0&&!node.hidden&&getComputedStyle(node).visibility!=='hidden',canvasBox=rect(canvas),stageBox=rect(stage),deckBox=rect(deck),comboBox=visible(combo)?rect(combo):null,resultBox=visible(results)?rect(results):null;
    const band=audit?{left:canvasBox.left+audit.css.x,top:canvasBox.top+audit.css.y,right:canvasBox.left+audit.css.x+audit.css.width,bottom:canvasBox.top+audit.css.y+audit.css.height,width:audit.css.width,height:audit.css.height}:null;
    return{label,state,url:location.href,viewport:{width:innerWidth,height:innerHeight},audit,band,canvas:canvasBox,stage:stageBox,deck:deckBox,combo:comboBox,results:resultBox,comboState:combo?.dataset.state,controllerState:document.querySelector('#floatingControllerState')?.textContent.trim(),modeState:document.querySelector('#controllerModeSelected')?.textContent.trim(),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  },{label,state});
  if(!value.audit||!value.band)throw new Error(`${label}/${state}: missing Fight timing-band audit.`);
  const inside=value.band.left>=value.canvas.left-1&&value.band.right<=value.canvas.right+1&&value.band.top>=value.canvas.top-1&&value.band.bottom<=value.canvas.bottom+1;
  const deckClear=!overlap(value.band,value.deck),comboClear=!overlap(value.band,value.combo);
  if(!inside||!deckClear||!comboClear||value.overflow>1)throw new Error(`${label}/${state}: unsafe timing-band geometry ${JSON.stringify({...value,inside,deckClear,comboClear})}`);
  checks.push({kind:'timing-band',...value,inside,deckClear,comboClear,resultOverlap:overlap(value.band,value.results)});return value;
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

async function forceMiniResult(page){
  await page.locator('#results').waitFor({state:'visible',timeout:8000});
}

async function exerciseViewport(label,width,height){
  const record=label==='desktop-1440x1000'||label==='phone-390x844',context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=480,...(record?{recordVideo:{dir:videoDir,size:{width,height}}}:{})});await seed(context);const page=await context.newPage();await enterFight(page,label);
  const passive=await bandState(page,label,'passive-ready');await page.screenshot({path:join(outputDir,`${label}-passive-ready.png`)});
  await exerciseSelectors(page,label,true);
  await startCombo(page);const active=await bandState(page,label,'active-combo');await page.screenshot({path:join(outputDir,`${label}-active-combo.png`)});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#livePhysicsCombo')?.dataset.state==='passive',null,{timeout:2500});
  await forceMiniResult(page);const result=await bandState(page,label,'mini-result');await page.screenshot({path:join(outputDir,`${label}-mini-result.png`)});
  if(overlap(result.band,result.results))throw new Error(`${label}: mini result visually covers the Fight timing band ${JSON.stringify({band:result.band,results:result.results})}`);
  const video=record?page.video():null;await page.close();await context.close();if(video)videoSources.push({label,width,height,path:await video.path()});checks.push({kind:'viewport-complete',label,width,height,passive:passive.band,active:active.band,result:result.band});
}

for(const spec of specs)await exerciseViewport(...spec);

const mp4=join(outputDir,'fight-controller-safety-walkthrough.mp4');
const args=['-y'];for(const source of videoSources)args.push('-i',source.path);const filters=videoSources.map((source,index)=>`[${index}:v]fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v${index}]`).join(';')+`;${videoSources.map((_,index)=>`[v${index}]`).join('')}concat=n=${videoSources.length}:v=1:a=0[out]`;args.push('-filter_complex',filters,'-map','[out]','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4);const transcode=spawnSync('ffmpeg',args,{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw new Error(`ffprobe failed: ${probe.stderr}`);const video=JSON.parse(probe.stdout);if(statSync(mp4).size<100_000||Number(video.format?.duration||0)<12||video.streams?.[0]?.codec_name!=='h264'||video.streams?.[0]?.width!==1280||video.streams?.[0]?.height!==720)throw new Error(`MP4 validation failed ${JSON.stringify({bytes:statSync(mp4).size,video})}`);
const externalRequests=[...new Set(requests.filter(url=>{try{return new URL(url).origin!==new URL(baseUrl).origin;}catch{return true;}}))];if(externalRequests.length)throw new Error(`External requests observed: ${externalRequests.join(', ')}`);if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
const report={revision,baseUrl,externalRequests,errors,checks,video:{path:mp4,bytes:statSync(mp4).size,...video},files:readdirSync(outputDir).sort()};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify({revision,checks:checks.length,video:report.video,files:report.files},null,2));await browser.close();
