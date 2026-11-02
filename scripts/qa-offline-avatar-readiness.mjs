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
const publicOrigin=new URL(base).origin==='https://vsillah.github.io';
if(publicOrigin&&new URL(base).pathname!=='/KickLab/')throw Error('Production smoke requires the trusted GitHub Pages route');
const served=await fetch(new URL(`?rev=${head}`,base),{cache:'no-store'});
if(!served.ok||hash(Buffer.from(await served.arrayBuffer()))!==artifactSha256)throw Error('Served HTML differs from the exact-head built artifact');
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const cases=[
  {id:'rocket',width:360,height:800,video:true,canvas:true},
  {id:'wiz',width:390,height:844},
  {id:'tower',width:768,height:1024},
  {id:'trick',width:1113,height:834,reduced:true},
  {id:'cannon',width:1440,height:900}
];
const report={head,base,artifactSha256,cases:[],recovery:[],errors:[]};
for(const item of cases.filter(item=>!process.env.QA_RECOVERY_ONLY&&(!process.env.QA_ONE||item.id===process.env.QA_ONE))){
  const label=`${item.id}-${item.width}x${item.height}`,requests=[],errors=[];
  const context=await browser.newContext({viewport:{width:item.width,height:item.height},reducedMotion:item.reduced?'reduce':'no-preference',...(item.video?{recordVideo:{dir:out,size:{width:item.width,height:item.height}}}:{})});
  await context.addInitScript(gfx=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})),item.canvas?'2d':'3d');
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{const url=route.request().url(),target=new URL(url);if((target.origin===new URL(base).origin&&(!publicOrigin||target.pathname.startsWith('/KickLab/')))||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();errors.push(`egress ${url}`);return route.abort();});
  const url=new URL(base);for(const [key,value] of Object.entries({raceSystems:'proxy',raceTelemetry:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceExpansion:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',racePreflight:'prototype'}))url.searchParams.set(key,value);url.searchParams.set('rev',head);
  try{
    let frameP95Ms=null;
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible()){await page.fill('#profileNickname','QA Player');await page.click('#profileFormSave');}
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    if(item.id!=='rocket'){
      await page.click('#homeProfileButton');await page.click('#profileEdit');await page.locator(`[data-avatar="${item.id}"]`).click();await page.click('#profileFormSave');await page.click('#profileClose');
    }
    const identity=await page.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return{avatar:saved.profiles.find(profile=>profile.id===saved.activeId)?.avatar,count:saved.profiles.length};});
    if(identity.avatar!==item.id||identity.count!==1)throw Error(`Player identity or isolation changed: ${JSON.stringify(identity)}`);
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-lab-player] .driver-avatar-image')].length===3&&[...document.querySelectorAll('[data-lab-player] .driver-avatar-image')].every(img=>img.naturalWidth>0));
    if(item.video)await page.waitForTimeout(800);
    await context.setOffline(true);
    if(item.video)await page.evaluate(()=>{const note=document.createElement('div');note.textContent='QA · NETWORK OFFLINE';note.style.cssText='position:fixed;z-index:100000;right:8px;top:8px;padding:5px 8px;border:1px solid #83e7c5;border-radius:6px;background:#102638;color:#fff;font:700 11px system-ui;pointer-events:none';document.body.append(note);});
    page.on('request',request=>{if(request.url().startsWith(url.origin+'/'))requests.push(request.url());});
    const labPortraits={};
    for(const lab of ['fight','race','kick']){
      await page.click('#homeProfileButton');await page.locator(`[data-profile-lab="${lab}"]`).click();
      const portrait=await page.locator('#profileSummary .profile-lab-feature .driver-avatar-image').evaluate(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0}));
      if(!portrait.loaded||!portrait.src.startsWith('data:image/webp;'))throw Error(`${lab} portrait missing after offline redraw`);
      labPortraits[lab]=portrait.src;
      await page.screenshot({path:join(out,`${label}-${lab}.png`)});
      if(item.video)await page.waitForTimeout(600);
      await page.click('#profileClose');
      await page.locator(`#lab-tab-${lab}`).click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
      const hud=await page.locator('#hudProfileAvatar .driver-avatar-image').evaluate(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0})).catch(error=>{throw Error(`${error.message}; url=${page.url()}`);});
      if(!hud.loaded||hud.src!==labPortraits[lab])throw Error(`${lab} HUD portrait differs from the active player's offline portrait`);
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
      await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
      await page.click('[data-preflight-venue="highland"]');
      await page.click('[data-preflight-mode="drag"]');
      for(let step=0;step<3;step++)await page.click('#racePreflightNext');
      await page.click('[data-preflight-control="classic"]');
      if(await page.locator('#racePreflightSteer').textContent()==='You steer')await page.click('#racePreflightSteer');
      await page.click('#racePreflightNext');
      await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
      const orbit=page.locator('.race-orbit-panel button');
      if(await orbit.isVisible())await orbit.click();
      await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state()?.phase==='run',null,{timeout:30000});
      let shifted=0,peakKmh=0;
      await page.keyboard.down('KeyW');
      try{
        for(let step=0;step<240&&!await page.locator('#results').isVisible();step++){
          const speed=await page.evaluate(()=>window.__KICKLAB_RACE_MODES_QA__?.state()?.speedKmh);
          if(!Number.isFinite(speed))throw Error('Public Race diagnostics unavailable');
          peakKmh=Math.max(peakKmh,speed);
          if(shifted<3&&speed>=[46,88,132][shifted]&&await page.locator('#raceTelemetryShift').isVisible()&&await page.locator('#raceTelemetryShift').isEnabled()){
            await page.click('#raceTelemetryShift');shifted++;
          }
          await page.waitForTimeout(150);
        }
      }finally{await page.keyboard.up('KeyW');}
      await page.locator('#results').waitFor({state:'visible',timeout:10000});
      const actual=await page.evaluate(()=>window.__KICKLAB_RACE_MODES_QA__.state());
      if(actual.mode!=='drag'||actual.phase!=='done'||!actual.result?.pass)throw Error(`Offline Drag failed: ${JSON.stringify(actual)}`);
      result={actual:true,mode:actual.mode,elapsed:actual.elapsed,outcome:actual.result,peakKmh,shifted,title:await page.locator('#rTitle').textContent()};
    }
    const coach=await page.locator('#raceResultCoach').textContent();
    const positive=(await page.locator('#raceResultCoachPositive').textContent()).trim(),focus=(await page.locator('#raceResultCoachFocus').textContent()).trim();
    if(!await page.locator('#raceResultCoach').isVisible()||!coach.includes('What worked')||!coach.includes('Next focus')||!positive||!focus)throw Error('Coach result themes missing');
    const resultIdentity=await page.locator('#resultPlayer .driver-avatar-image').evaluate(img=>({source:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0}));
    if(!resultIdentity.loaded||resultIdentity.source!==labPortraits.race)throw Error('Race result portrait differs from the active player');
    if(await page.locator('#raceResultCoach').isEnabled()){
      await page.click('#raceResultCoach');
      const detail=await page.evaluate(()=>({positive:document.querySelector('#rvRacePositive')?.textContent?.trim(),focus:document.querySelector('#rvRaceFocus')?.textContent?.trim()}));
      if(!await page.locator('#review').isVisible()||!detail.positive||!detail.focus)throw Error('Detailed Coach review missing');
      await page.click('#rvClose');
    }
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
for(const kind of ['online-reload-then-offline','corrupt-storage','denied-storage']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),requests=[],errors=[];
  await context.addInitScript(scenario=>{
    localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));
    if(scenario==='corrupt-storage'){
      localStorage.setItem('kicklab.profiles.v1','{corrupt');
      localStorage.setItem('impactlab.nick','Recovery Kid');
    }
    if(scenario==='denied-storage'){
      const original=Storage.prototype.setItem;window.__qaDenyProfileWrites=false;
      Storage.prototype.setItem=function(key,value){if(this===localStorage&&window.__qaDenyProfileWrites&&String(key).startsWith('kicklab.profiles.'))throw new DOMException('Local storage denied','QuotaExceededError');return original.call(this,key,value);};
    }
  },kind);
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(new URL(base).origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))return route.continue();errors.push(`egress ${target}`);return route.abort();});
  const url=new URL(base);for(const [key,value] of Object.entries({raceSystems:'proxy',raceTelemetry:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceExpansion:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',racePreflight:'prototype'}))url.searchParams.set(key,value);url.searchParams.set('rev',head);url.searchParams.set('storageQA',kind);
  try{
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible()){await page.fill('#profileNickname','QA Player');await page.click('#profileFormSave');}
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    if(kind!=='corrupt-storage'){
      await page.click('#homeProfileButton');await page.click('#profileEdit');await page.locator('[data-avatar="wiz"]').click();await page.click('#profileFormSave');await page.click('#profileClose');
    }
    if(kind==='online-reload-then-offline'){
      await page.reload({waitUntil:'domcontentloaded'});
      if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    }
    if(kind==='denied-storage'){
      await page.click('#homeProfileButton');await page.click('#profileEdit');await page.fill('#profileNickname','Leaked Name');await page.locator('[data-avatar="tower"]').click();
      await page.evaluate(()=>window.__qaDenyProfileWrites=true);
      await page.click('#profileFormSave');
      await page.locator('#profileFormMsg').getByText('Player not saved. Check browser storage, then try Save player again. Current player is unchanged.').waitFor();
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')));
      if(saved.profiles.find(profile=>profile.id===saved.activeId)?.avatar!=='wiz'||saved.profiles.some(profile=>profile.nickname==='Leaked Name'))throw Error('Denied write leaked the attempted player change');
      await page.click('#profileFormCancel');await page.click('#profileClose');
    }
    const expected=kind==='corrupt-storage'?'rocket':'wiz';
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-lab-player] .driver-avatar-image')].length===3&&[...document.querySelectorAll('[data-lab-player] .driver-avatar-image')].every(image=>image.naturalWidth>0));
    const identity=await page.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return{name:document.querySelector('#homeProfileName').textContent,avatar:saved.profiles.find(profile=>profile.id===saved.activeId)?.avatar,profileCount:saved.profiles.length,profiles:document.querySelector('#profileList').textContent};});
    if(identity.avatar!==expected||identity.profileCount!==1||identity.profiles.includes('Leaked Name')||identity.profiles.includes('Secret'))throw Error(`Recovery identity leaked or changed: ${JSON.stringify(identity)}`);
    await context.setOffline(true);page.on('request',request=>{if(request.url().startsWith(url.origin+'/'))requests.push(request.url());});
    for(const lab of ['fight','race','kick']){
      await page.click('#homeProfileButton');await page.locator(`[data-profile-lab="${lab}"]`).click();
      const portrait=await page.locator('#profileSummary .profile-lab-feature .driver-avatar-image').evaluate(image=>({source:image.getAttribute('src'),loaded:image.complete&&image.naturalWidth>0}));
      if(!portrait.loaded||!portrait.source.startsWith('data:image/webp;'))throw Error(`${kind}: ${lab} portrait did not survive offline redraw`);
      await page.click('#profileClose');
    }
    const portraitRequests=requests.filter(request=>/\/assets\/(drivers|players)\//.test(request));
    if(portraitRequests.length||errors.length)throw Error(`${kind}: requests or page errors ${JSON.stringify({portraitRequests,errors})}`);
    await page.screenshot({path:join(out,`${kind}.png`)});
    report.recovery.push({kind,expectedAvatar:expected,identityName:identity.name,visibleFailureMessage:kind==='denied-storage',postOfflinePortraitRequests:portraitRequests.length,postOfflineOtherRequests:requests.length,externalOrigins:0});
  }catch(error){report.errors.push(`${kind}: ${error.stack||error}`);}finally{await context.close();}
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length||report.cases.length!==(process.env.QA_RECOVERY_ONLY?0:process.env.QA_ONE?1:cases.length)||report.recovery.length!==3)process.exitCode=1;
