import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const base=process.argv[2]||'http://127.0.0.1:5271/kicklab.html';
const out=resolve(process.argv[3]||`qa-artifacts/offline-avatar/${head.slice(0,12)}`);
mkdirSync(out,{recursive:true});
const hash=value=>createHash('sha256').update(value).digest('hex');
const artifactSha256=hash(readFileSync('dist/kicklab.html'));
const served=await fetch(new URL(`?rev=${head}`,base));
if(!served.ok||hash(Buffer.from(await served.arrayBuffer()))!==artifactSha256)throw Error('Localhost does not serve the exact built artifact');
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const cases=[
  {id:'rocket',width:360,height:800,video:true,canvas:true},
  {id:'wiz',width:390,height:844},
  {id:'tower',width:768,height:1024},
  {id:'trick',width:1113,height:834,reduced:true},
  {id:'cannon',width:1440,height:900}
];
const report={head,base,artifactSha256,cases:[],errors:[]};
for(const item of cases.filter(item=>!process.env.QA_ONE||item.id===process.env.QA_ONE)){
  const label=`${item.id}-${item.width}x${item.height}`,requests=[],errors=[];
  const context=await browser.newContext({viewport:{width:item.width,height:item.height},reducedMotion:item.reduced?'reduce':'no-preference',...(item.video?{recordVideo:{dir:out,size:{width:item.width,height:item.height}}}:{})});
  await context.addInitScript(gfx=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})),item.canvas?'2d':'3d');
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();errors.push(`egress ${url}`);return route.abort();});
  const url=new URL(base);for(const [key,value] of Object.entries({raceSystems:'proxy',raceTelemetry:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceExpansion:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',racePreflight:'prototype'}))url.searchParams.set(key,value);url.searchParams.set('raceResultsQA','1');url.searchParams.set('rev',head);
  try{
    let frameP95Ms=null;
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible()){await page.fill('#profileNickname','QA Player');await page.click('#profileFormSave');}
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    if(item.id!=='rocket'){
      await page.click('#homeProfileButton');await page.click('#profileEdit');await page.locator(`[data-avatar="${item.id}"]`).click();await page.click('#profileFormSave');await page.click('#profileClose');
    }
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-lab-player] .driver-avatar-image')].length===3&&[...document.querySelectorAll('[data-lab-player] .driver-avatar-image')].every(img=>img.naturalWidth>0));
    if(item.video)await page.waitForTimeout(800);
    await context.setOffline(true);
    if(item.video)await page.evaluate(()=>{const note=document.createElement('div');note.textContent='QA · NETWORK OFFLINE';note.style.cssText='position:fixed;z-index:100000;right:8px;top:8px;padding:5px 8px;border:1px solid #83e7c5;border-radius:6px;background:#102638;color:#fff;font:700 11px system-ui;pointer-events:none';document.body.append(note);});
    page.on('request',request=>{if(request.url().startsWith(url.origin+'/'))requests.push(request.url());});
    for(const lab of ['fight','race','kick']){
      await page.click('#homeProfileButton');await page.locator(`[data-profile-lab="${lab}"]`).click();
      const portrait=await page.locator('#profileSummary .profile-lab-feature .driver-avatar-image').evaluate(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0}));
      if(!portrait.loaded||!portrait.src.startsWith('data:image/webp;'))throw Error(`${lab} portrait missing after offline redraw`);
      await page.screenshot({path:join(out,`${label}-${lab}.png`)});
      if(item.video)await page.waitForTimeout(600);
      await page.click('#profileClose');
      await page.locator(`#lab-tab-${lab}`).click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
      const hud=await page.locator('#hudProfileAvatar .driver-avatar-image').evaluate(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0})).catch(error=>{throw Error(`${error.message}; url=${page.url()}`);});
      if(!hud.loaded||!hud.src.startsWith('data:image/webp;'))throw Error(`${lab} HUD portrait missing`);
      if(lab==='race'){
        frameP95Ms=await page.evaluate(()=>new Promise(resolve=>{let last=performance.now();const frames=[];function tick(now){frames.push(now-last);last=now;if(frames.length<90)requestAnimationFrame(tick);else{frames.splice(0,5);frames.sort((a,b)=>a-b);resolve(frames[Math.floor(frames.length*.95)]);}}requestAnimationFrame(tick);}));
        if(frameP95Ms>=50)throw Error(`Race frame pacing exceeded 50 ms p95: ${frameP95Ms}`);
      }
      await page.screenshot({path:join(out,`${label}-${lab}-game.png`)});
      if(item.video)await page.waitForTimeout(600);
      if(lab==='race'&&await page.locator('#racePreflight').isVisible())await page.click('#racePreflightClose');
      await page.evaluate(()=>document.querySelector('#modeHomeButton').click());
    }
    await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    let result;
    if(item.video){
      await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
      await page.click('[data-preflight-venue="highland"]');
      await page.click('[data-preflight-mode="circuit"]');
      for(let step=0;step<3;step++)await page.click('#racePreflightNext');
      await page.click('[data-preflight-control="simulator"]');
      if(await page.locator('#racePreflightSteer').textContent()==='You steer')await page.click('#racePreflightSteer');
      await page.screenshot({path:join(out,`${label}-circuit-grid.png`)});
      await page.click('#racePreflightNext');
      await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state()?.phase==='run',null,{timeout:30000}).catch(async error=>{const state=await page.evaluate(()=>({url:location.href,mode:window.__KICKLAB_RACE_MODES_QA__?.state(),preflight:window.__KICKLAB_RACE_PREFLIGHT_QA__?.state(),sim:window.__KICKLAB_RACE_SIMULATOR_QA__?.state(),stageStart:document.querySelector('#raceStageStart')?.hidden,simStart:document.querySelector('#simStart')?.hidden}));await page.screenshot({path:join(out,`${label}-circuit-stall.png`)});throw Error(`${error.message}: ${JSON.stringify(state)}`);});
      let gas=false,brake=false;
      const input=async(nextGas,nextBrake)=>{if(nextGas!==gas){await page.evaluate(value=>window.__KICKLAB_RACE_SIMULATOR_QA__.input('gas',value),nextGas);gas=nextGas;}if(nextBrake!==brake){await page.evaluate(value=>window.__KICKLAB_RACE_SIMULATOR_QA__.input('brake',value),nextBrake);brake=nextBrake;}};
      for(let step=0;step<1500;step++){
        const current=await page.evaluate(()=>window.__KICKLAB_RACE_MODES_QA__.state());
        if(current.phase==='done'||current.phase==='crashed'){await input(false,false);if(current.phase!=='done'||!current.result?.pass||current.laps!==2)throw Error(`Offline Circuit failed: ${JSON.stringify(current)}`);result={actual:true,laps:current.laps,lapTimes:current.lapTimes,elapsed:current.elapsed,outcome:current.result};break;}
        await input(current.speedKmh<34,current.speedKmh>37);
        await page.waitForTimeout(100);
      }
      if(!result)throw Error('Offline Circuit did not reach a completed two-lap result');
      await page.locator('#results').waitFor({state:'visible',timeout:10000});
    }else{
      if(await page.locator('#racePreflight').isVisible())await page.click('#racePreflightClose');
      result=await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__?.fixture('success-new-award'));
      if(!result||!await page.locator('#results').isVisible())throw Error('Offline Race result fixture unavailable');
    }
    const coach=await page.locator('#raceResultCoach').textContent();
    if(!coach.includes('What worked')||!coach.includes('Next focus'))throw Error('Coach result themes missing');
    await page.screenshot({path:join(out,`${label}-result.png`)});
    if(item.video)await page.waitForTimeout(1400);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    if(overflow>1||requests.some(request=>/\/assets\/(drivers|players)\//.test(request)))throw Error(`offline overflow or portrait request: ${JSON.stringify({overflow,requests})}`);
    report.cases.push({label,overflow,frameP95Ms,result,coach:coach.slice(0,180),postOfflinePortraitRequests:0,postOfflineOtherRequestCount:requests.length,postOfflineOtherRequestPaths:[...new Set(requests.map(request=>new URL(request).pathname))],errors});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);}
  const video=page.video();await context.close();
  if(video){const raw=await video.path(),mp4=join(out,'offline-avatar-walkthrough.mp4');const encoded=spawnSync('ffmpeg',['-y','-loglevel','error','-i',raw,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});if(encoded.status!==0||!existsSync(mp4)||statSync(mp4).size<50000)report.errors.push(`MP4 encoding failed: ${encoded.stderr}`);else report.mp4=mp4;}
  report.errors.push(...errors.map(error=>`${label}: ${error}`));
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length||report.cases.length!==(process.env.QA_ONE?1:cases.length))process.exitCode=1;
