import assert from 'node:assert/strict';
import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';

const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:4318/kicklab.html';
const revision=process.argv[3]||'working-tree';
const output=resolve(process.argv[4]||'qa-artifacts/fight-result-rail');
const videoDir=join(output,'video-source');
mkdirSync(videoDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
assert.ok(executablePath,'Local Chrome or Chromium is required');
const browser=await chromium.launch({headless:true,executablePath});
const checks=[],errors=[],external=[];
const sizes=[['phone-360',360,800],['phone-390',390,844],['tablet',768,1024],['laptop',1113,834],['desktop',1440,900]];
const route=label=>`${base}?qa=fight-result-rail&rev=${encodeURIComponent(revision)}&view=${label}`;

async function enter(page,label){
  page.on('pageerror',error=>errors.push(`${label}: ${error}`));
  page.on('request',request=>{if(new URL(request.url()).origin!==new URL(base).origin)external.push(request.url());});
  await page.goto(route(label),{waitUntil:'networkidle'});
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-fight').click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:12000});
}

async function state(page,label,result){
  const value=await page.evaluate(()=>{
    const rail=document.querySelector('#gameGuidanceHud'),card=document.querySelector('#rc'),results=document.querySelector('#results'),next=document.querySelector('#rNext');
    const box=node=>node.getBoundingClientRect().toJSON(),nextBox=box(next),hit=document.elementFromPoint(nextBox.left+nextBox.width/2,nextBox.top+nextBox.height/2);
    return{mode:document.documentElement.dataset.kicklabMode,railDisplay:getComputedStyle(rail).display,railVisible:rail.getClientRects().length>0,resultVisible:!results.hidden,card:box(card),next:nextBox,nextHit:hit===next||next.contains(hit),nextDisabled:next.disabled,heading:document.querySelector('#rTitle').textContent,overflow:document.documentElement.scrollWidth-innerWidth,viewport:{width:innerWidth,height:innerHeight}};
  });
  assert.equal(value.mode,'fight',`${label}: wrong lab`);
  assert.equal(value.resultVisible,result,`${label}: result state`);
  assert.equal(value.railVisible,!result,`${label}: guidance lifecycle`);
  if(result){
    assert.equal(value.railDisplay,'none',`${label}: guidance remains in layout`);
    assert.ok(value.nextHit&&!value.nextDisabled,`${label}: Next round is obstructed`);
    assert.ok(value.card.left>=-1&&value.card.right<=value.viewport.width+1&&value.card.top>=-1&&value.card.bottom<=value.viewport.height+1,`${label}: result card clipped`);
  }
  assert.ok(value.overflow<=1,`${label}: horizontal overflow ${value.overflow}`);
  checks.push({label,result,...value});return value;
}

async function frameSample(page,label){
  const sample=await page.evaluate(()=>new Promise(resolve=>{
    const intervals=[];let previous=0;
    const tick=now=>{if(previous)intervals.push(now-previous);previous=now;if(intervals.length<90)requestAnimationFrame(tick);else resolve(intervals.sort((a,b)=>a-b)[Math.floor(intervals.length*.95)]);};
    requestAnimationFrame(tick);
  }));
  assert.ok(sample<50,`${label}: frame p95 ${sample.toFixed(1)} ms`);
  checks.push({label,frameP95Ms:Number(sample.toFixed(2))});
}

async function realVictory(page,label){
  const toggle=page.locator('#controllerCollapseButton');
  if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  const cross=page.locator('#padR button[data-id="cross"]');
  assert.equal(await cross.isVisible(),true,`${label}: Cross control unavailable`);
  let knockout=false;
  for(let attempt=0;attempt<24;attempt++){
    if(await cross.isEnabled())await cross.click();
    await page.waitForTimeout(300);
    knockout=await page.locator('#historyHud').innerText().then(text=>text.includes('K.O.!'));
    if(knockout)break;
  }
  assert.ok(knockout,`${label}: no real K.O. from visible Cross actions`);
  await page.locator('#results:not([hidden])').waitFor({state:'visible',timeout:15000});
  assert.match(await page.locator('#rTitle').innerText(),/^K\.O\.!!?$/,`${label}: expected real victory result`);
}

try{
  for(const [label,width,height] of process.env.KICKLAB_QA_VICTORY_ONLY?[]:sizes){
    const record=label==='phone-390'||label==='desktop';
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=390,reducedMotion:label==='phone-360'?'reduce':'no-preference',recordVideo:record?{dir:videoDir,size:{width,height}}:undefined});
    await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'canvas',mute:true,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Player');});
    const page=await context.newPage();await enter(page,label);await state(page,`${label}-active`,false);
    if(label==='phone-390'||label==='desktop')await frameSample(page,`${label}-active`);
    if(label==='phone-390'){
      const background=await context.newPage();await background.bringToFront();await page.waitForTimeout(250);await page.bringToFront();await background.close();
      await state(page,`${label}-foreground`,false);
      await page.waitForTimeout(1700);
      await page.locator('#cv').click({position:{x:Math.min(140,width/3),y:Math.min(180,height/3)},force:true});
      await page.locator('#gamePacingOverlay').waitFor({state:'visible',timeout:2000});
      await page.locator('#gamePacingResume').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden'});
      await state(page,`${label}-resumed`,false);
    }
    await page.locator('#results:not([hidden])').waitFor({state:'visible',timeout:120000});
    const loss=await state(page,`${label}-loss`,true);assert.match(loss.heading,/KNOCKED DOWN/);
    await page.screenshot({path:join(output,`${label}-loss.png`)});
    if(label==='phone-390')await page.locator('#rNext').tap();
    else if(label==='phone-360'){await page.locator('#rNext').focus();await page.keyboard.press('Enter');}
    else await page.locator('#rNext').click();
    await state(page,`${label}-next-round`,false);
    if(label==='phone-390'){
      await page.locator('#results:not([hidden])').waitFor({state:'visible',timeout:120000});
      await state(page,`${label}-second-loss`,true);
      await page.screenshot({path:join(output,`${label}-second-loss.png`)});
    }
    const recording=page.video();await page.close();await context.close();
    if(record)checks.push({label,webm:await recording.path()});
  }
  for(const [label,width,height] of [['victory-phone-360',360,800],['victory-phone',390,844],['victory-tablet',768,1024],['victory-laptop',1113,834],['victory-desktop',1440,900]].filter(([,width])=>!process.env.KICKLAB_QA_VICTORY_WIDTH||width===Number(process.env.KICKLAB_QA_VICTORY_WIDTH))){
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
    await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'canvas',mute:true,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));});
    await enter(page,label);await state(page,`${label}-active`,false);
    await realVictory(page,label);
    await state(page,`${label}-result`,true);await page.screenshot({path:join(output,`${label}-result.png`)});
    await page.locator('#rNext').scrollIntoViewIfNeeded();
    const target=await page.locator('#rNext').evaluate(next=>{const r=next.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{next:r.toJSON(),hit:hit?.outerHTML.slice(0,220),scrollY,viewport:{width:innerWidth,height:innerHeight}}});
    checks.push({label:`${label}-next-target`,...target});await page.screenshot({path:join(output,`${label}-next-target.png`)});
    assert.ok(target.hit?.includes('id="rNext"'),`${label}: Next round hit target obstructed ${JSON.stringify(target)}`);
    await page.locator('#rNext').click();await state(page,`${label}-next-round`,false);
    await context.close();
  }
  assert.deepEqual(errors,[],'Browser errors');assert.deepEqual(external,[],'External requests');
  for(const label of process.env.KICKLAB_QA_VICTORY_ONLY?[]:['phone-390','desktop']){
    const source=checks.find(item=>item.label===label&&item.webm).webm,target=join(output,`${label}-loss-walkthrough.mp4`);
    const convert=spawnSync('ffmpeg',['-y','-v','error','-i',source,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',target],{encoding:'utf8'});
    assert.equal(convert.status,0,convert.stderr);const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',target],{encoding:'utf8'});
    assert.equal(probe.status,0,probe.stderr);const media=JSON.parse(probe.stdout);
    assert.ok(statSync(target).size>50000&&Number(media.format.duration)>5,`${label}: invalid MP4`);
    checks.push({label,mp4:target,bytes:statSync(target).size,media});
  }
  writeFileSync(join(output,'report.json'),JSON.stringify({revision,base,checks,errors,external},null,2)+'\n');
  console.log(JSON.stringify({revision,checks:checks.length,errors,external,mp4:checks.filter(item=>item.mp4).map(item=>item.mp4)},null,2));
}finally{await browser.close();}
