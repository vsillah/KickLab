import {createRequire} from 'node:module';
import {existsSync,mkdirSync,renameSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:4317/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/kick-replay-skip-clearance');
const head=process.env.KICKLAB_QA_HEAD||'working';
const cases=[
  {width:360,height:800,input:'touch',gfx:'2d'},
  {width:390,height:844,input:'touch',gfx:'2d',reduced:true},
  {width:768,height:1024,input:'touch',gfx:'2d'},
  {width:1024,height:768,input:'pointer',gfx:'3d',recover:true,video:true},
  {width:1024,height:768,input:'pointer',gfx:'2d',recover:true},
  {width:1113,height:834,input:'pointer',gfx:'3d'},
  {width:1440,height:900,input:'keyboard',gfx:'3d'},
];
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync),args:['--enable-webgl']});
const report={head,base,cases:[],errors:[],external:[]};
const check=(condition,message)=>{if(!condition)throw Error(message)};

async function setup(page,gfx,url){
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  if(gfx==='2d'){
    await page.evaluate(()=>{const key='kicklab.profiles.v1',doc=JSON.parse(localStorage.getItem(key)),profile=doc.profiles.find(item=>item.id===doc.activeId);profile.progress.gfx='2d';localStorage.setItem(key,JSON.stringify(doc));localStorage.setItem('impactlab.v1',JSON.stringify(profile.progress))});
    await page.reload({waitUntil:'domcontentloaded'});
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  }
  await page.click('#lab-tab-kick');
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  for(const [id,value] of [['#var-kick-v','23'],['#var-kick-th','17']])await page.locator(id).evaluate((input,next)=>{input.value=next;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))},value);
}

async function activeSnapshot(page){return page.evaluate(()=>{
  const button=document.querySelector('#goalCelebrationSkip'),deck=document.querySelector('.control-deck'),stage=document.querySelector('.stage'),box=button.getBoundingClientRect(),d=deck.getBoundingClientRect(),s=stage.getBoundingClientRect(),hit=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);
  return{visible:!!button.getClientRects().length,hit:hit?.closest('button')?.id||hit?.className||null,button:{x:box.x,y:box.y,w:box.width,h:box.height,right:box.right,bottom:box.bottom},deck:{x:d.x,y:d.y,right:d.right,bottom:d.bottom,visible:!!deck.getClientRects().length},stage:{x:s.x,y:s.y,right:s.right,bottom:s.bottom},active:window.__KICKLAB_CELEBRATION_AUDIT__?.active,phase:window.__KICKLAB_CELEBRATION_AUDIT__?.phase,reduced:window.__KICKLAB_CELEBRATION_AUDIT__?.reduced,canvasFallback:!document.querySelector('#cv3')?.getClientRects().length,progress:(()=>{const doc=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return JSON.stringify(doc.profiles.find(profile=>profile.id===doc.activeId)?.progress)})(),storage:Object.keys(localStorage).sort(),overflow:document.documentElement.scrollWidth>innerWidth+1};
});}

for(const testCase of cases.filter(testCase=>!process.env.KICKLAB_QA_WIDTH||testCase.width===Number(process.env.KICKLAB_QA_WIDTH))){
  const {width,height,input,gfx,reduced,recover,video}=testCase,label=`${width}x${height}-${gfx}-${input}${recover?'-recovery':''}${reduced?'-reduced':''}`;
  const url=new URL(base);url.searchParams.set('rev',head);url.searchParams.set('kickReplaySkipQA','1');
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:input==='touch',reducedMotion:reduced?'reduce':'no-preference',recordVideo:video?{dir:out,size:{width,height}}:undefined});
  const page=await context.newPage(),recording=page.video(),entry={label,states:[],requests:0};
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(`${label}: ${message.text()}`)});
  await page.route('**/*',route=>{entry.requests++;const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${label}: ${target}`);route.abort()}});
  try{
    await setup(page,gfx,url);
    const before=await page.evaluate(()=>{const doc=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return JSON.stringify(doc.profiles.find(profile=>profile.id===doc.activeId)?.progress)});
    const kickButton=page.getByRole('button',{name:'Kick (Space)'});
    if(await kickButton.isVisible())await kickButton.click();
    else await page.keyboard.press('Space');
    await page.locator('#goalCelebrationControls').waitFor({state:'visible',timeout:15000});
    if(recover){
      await page.evaluate(()=>window.KickLabMobileLifecycle.suspend('qa-background'));
      const frozen=await page.evaluate(()=>window.__KICKLAB_CELEBRATION_AUDIT__.elapsed);
      await page.waitForTimeout(500);
      const still=await page.evaluate(()=>window.__KICKLAB_CELEBRATION_AUDIT__.elapsed);
      check(Math.abs(frozen-still)<.03,`${label}: Replay advanced while suspended`);
      await page.evaluate(()=>window.KickLabMobileLifecycle.foreground('qa-foreground'));
      const canvas=await page.locator('#cv').boundingBox();check(!!canvas,`${label}: stage canvas missing`);
      await page.mouse.click(canvas.x+canvas.width*.48,canvas.y+canvas.height*.46);
      await page.waitForFunction(prior=>window.__KICKLAB_CELEBRATION_AUDIT__?.elapsed>prior+.08,frozen,{timeout:3000});
      entry.states.push({phase:'foreground-recovered',frozen,still});
    }
    await page.locator('#goalCelebrationSkip').scrollIntoViewIfNeeded();
    const state=await activeSnapshot(page);entry.states.push({phase:'active-replay',...state});
    check(state.visible&&state.active&&state.hit==='goalCelebrationSkip'&&state.button.w>=44&&state.button.h>=44&&state.button.x>=0&&state.button.right<=width&&state.button.y>=0&&state.button.bottom<=height&&state.deck.visible&&!state.overflow,`${label}: Skip or deck geometry ${JSON.stringify(state)}`);
    check(state.canvasFallback===(gfx==='2d')&&state.reduced===!!reduced,`${label}: renderer or reduced-motion state ${JSON.stringify(state)}`);
    check(state.storage.every(key=>['impactlab.nick','impactlab.v1','kicklab.profiles.v1'].includes(key)),`${label}: unexpected local storage ${JSON.stringify(state.storage)}`);
    if(video){const performance=await page.evaluate(()=>new Promise(resolve=>{let previous=window.performance.now(),samples=[];function sample(now){samples.push(now-previous);previous=now;if(samples.length<70)requestAnimationFrame(sample);else{samples=samples.slice(5).sort((a,b)=>a-b);resolve({p95:samples[Math.floor(samples.length*.95)],frames:samples.length})}}requestAnimationFrame(sample)}));entry.states.push({phase:'performance',...performance});check(performance.p95<=50,`${label}: Replay frame pacing ${JSON.stringify(performance)}`)}
    await page.screenshot({path:join(out,`${label}-active.png`)});
    if(video){await page.screenshot({path:join(out,'1024x768-recovered-skip-visible.png')});await page.waitForTimeout(650)}
    if(input==='touch')await page.locator('#goalCelebrationSkip').tap();
    else if(input==='keyboard'){await page.keyboard.press('Tab');await page.locator('#goalCelebrationSkip').focus();check(await page.locator('#goalCelebrationSkip').evaluate(button=>button.matches(':focus-visible')),`${label}: focus ring absent`);await page.keyboard.press('Enter')}
    else await page.locator('#goalCelebrationSkip').click();
    await page.locator('#goalCelebrationControls').waitFor({state:'hidden',timeout:3000});
    await page.locator('#results').waitFor({state:'visible',timeout:3000});
    const ended=await page.evaluate(()=>({audit:window.__KICKLAB_CELEBRATION_AUDIT__,title:document.querySelector('#rTitle').textContent,profile:(()=>{const doc=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return JSON.stringify(doc.profiles.find(profile=>profile.id===doc.activeId)?.progress)})()}));
    entry.states.push({phase:'skip-activated',ended:ended.audit.ended,title:ended.title});
    check(ended.audit.ended==='skipped'&&JSON.parse(ended.profile).goals===(JSON.parse(before).goals||0)+1,`${label}: Skip changed outcome or lost progress ${JSON.stringify(ended)}`);
    if(video){
      await page.waitForTimeout(700);await page.screenshot({path:join(out,'1024x768-skip-result.png')});
      await setup(page,gfx,url);
      if(await kickButton.isVisible())await kickButton.click();else await page.keyboard.press('Space');
      await page.locator('#goalCelebrationControls').waitFor({state:'visible',timeout:15000});
      await page.locator('#goalCelebrationSkip').scrollIntoViewIfNeeded();
      const repeated=await activeSnapshot(page);
      check(repeated.hit==='goalCelebrationSkip'&&repeated.active,`${label}: second replay Skip obstructed ${JSON.stringify(repeated)}`);
      await page.locator('#goalCelebrationSkip').click();
      await page.locator('#results').waitFor({state:'visible',timeout:3000});
      const repeatedResult=await page.evaluate(()=>({ended:window.__KICKLAB_CELEBRATION_AUDIT__?.ended,goals:(()=>{const doc=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return doc.profiles.find(profile=>profile.id===doc.activeId)?.progress.goals})()}));
      entry.states.push({phase:'second-replay-skipped',...repeatedResult});
      check(repeatedResult.ended==='skipped'&&repeatedResult.goals===(JSON.parse(before).goals||0)+2,`${label}: second replay lost progress ${JSON.stringify(repeatedResult)}`);
    }
  }catch(error){const diagnostic=await page.evaluate(()=>({mode:document.documentElement.dataset.kicklabMode,buttons:[...document.querySelectorAll('button')].filter(button=>button.getClientRects().length&&/kick|shoot|space/i.test(button.textContent+' '+button.getAttribute('aria-label'))).map(button=>({id:button.id,text:button.textContent.trim(),aria:button.getAttribute('aria-label')})).slice(0,12),result:!document.querySelector('#results').hidden,title:document.querySelector('#rTitle').textContent,audit:window.__KICKLAB_CELEBRATION_AUDIT__||null})).catch(()=>null);await page.screenshot({path:join(out,`${label}-error.png`)}).catch(()=>{});const detail=`${label}: ${error.stack||String(error)} diagnostic=${JSON.stringify(diagnostic)}`;report.errors.push(detail);console.error(detail)}
  await context.close();
  if(recording){const raw=join(out,`1024x768-replay-skip-${head.slice(0,10)}.webm`);renameSync(await recording.path(),raw);const mp4=join(out,`1024x768-replay-skip-${head.slice(0,10)}.mp4`);const encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-i',raw,'-vf','scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});if(encoded.status!==0)report.errors.push(`${label}: MP4 encode ${encoded.stderr}`);else{const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)report.errors.push(`${label}: MP4 probe ${probe.stderr}`);else{report.mp4=mp4;report.media=JSON.parse(probe.stdout);if(statSync(mp4).size<80_000||Number(report.media.format?.duration||0)<5)report.errors.push(`${label}: MP4 too short or small`)}}}
  report.cases.push(entry);console.log(label,report.errors.some(error=>error.startsWith(label))?'FAIL':'PASS');
}
await browser.close();
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.length,errors:report.errors,external:report.external,mp4:report.mp4,media:report.media},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
