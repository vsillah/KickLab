import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base=process.argv[2]||'http://127.0.0.1:5271/kicklab.html';
const out=resolve(process.argv[3]||`qa-artifacts/profile-avatars/${head.slice(0,12)}`);mkdirSync(out,{recursive:true});
const report={head,cases:[],errors:[],external:[]};
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const flags={raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',raceCoaching:'prototype',raceCoachPersonas:'prototype',raceMultiplayer:'prototype',racePrivateParty:'prototype',raceResultsQA:'1',racePreflight:'prototype',rev:head.slice(0,12)};
async function run(width,height,{reduced=false,canvas=false}={}){
  console.log(`Checking ${width}x${height}${reduced?' reduced':''}${canvas?' Canvas':''}`);
  const record=!!process.env.QA_VIDEO&&width===390&&!reduced&&!canvas;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',hasTouch:width===390,...(record?{recordVideo:{dir:out,size:{width,height}}}:{})});
  await context.addInitScript(useCanvas=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:useCanvas?'2d':'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Driver');},canvas);
  const page=await context.newPage(),url=new URL(base);page.setDefaultTimeout(8000);for(const [key,value] of Object.entries(flags))url.searchParams.set(key,value);
  page.on('pageerror',error=>report.errors.push(`${width}: ${error.message}`));
  page.on('response',response=>{if(response.url().includes('/assets/drivers/')&&response.status()>=400)report.errors.push(`${width}: portrait HTTP ${response.status()} ${response.url()}`);});
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))return route.continue();report.external.push(`${width}: ${target}`);return route.abort();});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.screenshot({path:join(out,`home-${width}${reduced?'-reduced':''}${canvas?'-canvas':''}.png`)});if(record)await page.waitForTimeout(1200);
    await page.click('#homeProfileButton');await page.locator('#profileDialog').waitFor({state:'visible'});await page.click('#profileEdit');
    await page.locator('#profileAvatarPreview').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#profileAvatarPreview .driver-avatar-image')?.naturalWidth>0);await page.screenshot({path:join(out,`creator-${width}${reduced?'-reduced':''}${canvas?'-canvas':''}.png`)});if(record)await page.waitForTimeout(1800);
    for(const id of ['rocket','wiz','tower','trick','cannon']){await page.locator(`[data-avatar="${id}"]`).click();await page.waitForFunction(()=>document.querySelector('#profileAvatarPreview .driver-avatar-image')?.naturalWidth>0,null,{timeout:8000});}
    await page.locator('[data-avatar="wiz"]').click();await page.fill('#profileNickname','QA Driver');const preview=await page.locator('#profileAvatarPreview').getAttribute('aria-label');if(!preview?.includes('Playmaker'))throw Error('curated portrait preview did not update');await page.waitForFunction(()=>document.querySelector('#profileAvatarPreview .driver-avatar-image')?.naturalWidth>0);
    await page.screenshot({path:join(out,`custom-${width}${reduced?'-reduced':''}${canvas?'-canvas':''}.png`)});if(record)await page.waitForTimeout(1800);
    await page.click('#profileFormReset');if(!(await page.locator('#profileAvatarPreview').getAttribute('aria-label'))?.includes('Rocket'))throw Error('Reset did not restore default');
    await page.locator('[data-avatar="wiz"]').focus();await page.keyboard.press('Enter');if(!(await page.locator('#profileAvatarPreview').getAttribute('aria-label'))?.includes('Playmaker'))throw Error('Keyboard choice failed');
    await page.click('#profileFormCancel');let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles[0]);if(stored.avatar!=='rocket')throw Error('Cancel changed profile');
    await page.click('#profileEdit');await page.locator('[data-avatar="wiz"]').click();await page.click('#profileFormSave');stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles[0]);if(stored.avatar!=='wiz'||stored.avatarLook.skin!=='tan'||stored.avatarLook.hair!=='sweep')throw Error('Save did not persist curated portrait');
    await page.locator('[data-profile-lab="race"]').click();await page.locator('.profile-race-duo').waitFor({state:'visible'});const duo=await page.locator('.profile-race-duo').textContent();if(!duo.includes('QA Driver')||!duo.includes('Coach Nia'))throw Error(`Race identity missing ${duo}`);await page.waitForFunction(()=>document.querySelector('.profile-coach-portrait img')?.naturalWidth>0&&document.querySelector('.profile-race-duo .driver-avatar-image')?.naturalWidth>0,null,{timeout:8000});await page.screenshot({path:join(out,`race-profile-${width}${reduced?'-reduced':''}${canvas?'-canvas':''}.png`)});if(record)await page.waitForTimeout(2200);
    await page.click('#profileClose');await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});await page.locator('#racePreflightCoach').waitFor({state:'visible',timeout:20000});for(const id of ['nia','mateo','arun','imani']){await page.click('#racePreflightCoach');await page.locator(`[data-coach-id="${id}"]`).click();await page.click('#raceCoachRosterClose');const savedId=await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return state.profiles.find(profile=>profile.id===state.activeId).progress.raceCoachId;});if(savedId!==id)throw Error(`Coach ${id} did not save: ${savedId}`);}await page.click('#racePreflightClose');
    if(!canvas){try{await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:10000});await page.click('.race-orbit-panel button');}catch(_){}}
    await page.reload({waitUntil:'domcontentloaded'});if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#homeProfileButton');await page.locator('[data-profile-lab="race"]').click();const coachImage=await page.locator('.profile-coach-portrait img').getAttribute('src');if(!coachImage?.includes('imani.webp'))throw Error(`Coach portrait ${coachImage}`);await page.screenshot({path:join(out,`imani-profile-${width}${reduced?'-reduced':''}${canvas?'-canvas':''}.png`)});if(record)await page.waitForTimeout(2200);
    const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));if(overflow)throw Error(`horizontal overflow ${overflow}`);
    if((width===390||width===1440)&&!reduced&&!canvas){
      await page.click('#profileCreate');await page.fill('#profileNickname','Second Driver');await page.locator('[data-avatar="tower"]').click();await page.click('#profileFormSave');const second=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.at(-1));if(second.avatarLook.face!=='angular'||second.progress.raceCoachId)throw Error('second profile leaked identity or Coach');
      const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles[0]);await page.locator(`[data-profile-id="${first.id}"]`).click();const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.find(p=>p.id===JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId));if(restored.avatarLook.hair!=='sweep'||restored.progress.raceCoachId!=='imani')throw Error('profile switch lost isolation');
      await page.click('#profileClose');await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#homeProfileAvatar .driver-avatar-image')?.naturalWidth>0);
      await page.click('#homeProfileButton');await page.locator('[data-profile-lab="race"]').click();if(!await page.locator('.profile-coach-portrait img').getAttribute('src').then(value=>value?.includes('imani.webp')))throw Error('reload lost Coach portrait');
      for(const lab of ['fight','kick','race']){await page.locator(`[data-profile-lab="${lab}"]`).click();if(await page.locator(`[data-profile-lab="${lab}"]`).getAttribute('aria-current')!=='true')throw Error(`${lab} profile not selected`);}
      await page.click('#profileClose');await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});if(await page.locator('#racePreflight').isVisible())await page.click('#racePreflightClose');
      for(let attempt=0;attempt<4;attempt++){
        if(await page.locator('#racePreflight').isVisible())await page.click('#racePreflightClose');
        if(await page.locator('.race-orbit-panel button').isVisible()&&!await page.locator('#racePreflight').isVisible())await page.click('.race-orbit-panel button');
        if(!await page.locator('#racePreflight').isVisible())break;
      }
      await page.waitForTimeout(2000);await page.click('#racePhoneProgress');await page.locator('#raceIdentitySeats').waitFor({state:'visible'});
      await page.click('#raceMultiCouch');const couch=await page.locator('#raceIdentitySeats').textContent();if(!couch.includes('QA Driver')||!couch.includes('Second Driver'))throw Error(`Couch identities ${couch}`);await page.waitForFunction(()=>[...document.querySelectorAll('#raceIdentitySeats .driver-avatar-image')].length===2&&[...document.querySelectorAll('#raceIdentitySeats .driver-avatar-image')].every(img=>img.naturalWidth>0));await page.screenshot({path:join(out,`couch-${width}.png`)});await page.locator('#raceMultiplayer').screenshot({path:join(out,`couch-card-${width}.png`)});
      await page.click('#raceMultiComputer');const computer=await page.locator('#raceIdentitySeats').textContent();if(!computer.includes('Computer')||!computer.includes('QA Driver'))throw Error(`Computer identities ${computer}`);await page.waitForFunction(()=>document.querySelector('#raceIdentitySeats .driver-avatar-image')?.naturalWidth>0);await page.screenshot({path:join(out,`computer-${width}.png`)});await page.locator('#raceMultiplayer').screenshot({path:join(out,`computer-card-${width}.png`)});
      await page.click('#raceMultiQuick');const quick=await page.locator('#raceIdentitySeats').textContent();if(!quick.includes('Challenger')||!quick.includes('QA Driver'))throw Error(`Quick identities ${quick}`);
      await page.click('#raceMultiParty');const party=await page.locator('#raceIdentitySeats').textContent();if(!party.includes('Party challenger')||!party.includes('QA Driver'))throw Error(`Party identities ${party}`);
      report.cases.push({identityViews:true,width,couch,computer,quick,party});
    }
    report.cases.push({width,height,reduced,canvas,avatar:stored.avatar,look:stored.avatarLook,overflow});
  }catch(error){report.errors.push(`${width}${reduced?'/reduced':''}${canvas?'/canvas':''}: ${error.stack||error}`);}finally{await context.close();if(record){const videoPath=await page.video().path();execFileSync('ffmpeg',['-y','-loglevel','error','-i',videoPath,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',join(out,'walkthrough-phone.mp4')]);}}
}
for(const [width,height] of (process.env.QA_ONE||process.env.QA_VIDEO?[[390,844]]:[[390,844],[768,1024],[1113,834],[1440,900]]))await run(width,height);
if(!process.env.QA_ONE&&!process.env.QA_VIDEO){await run(390,844,{reduced:true});await run(390,844,{canvas:true});}
if(!process.env.QA_ONE&&!process.env.QA_VIDEO){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>localStorage.setItem('impactlab.nick','Fallback Driver'));
  const page=await context.newPage(),url=new URL(base);for(const [key,value] of Object.entries(flags))url.searchParams.set(key,value);
  await page.route('**/assets/drivers/v2/rocket.webp',route=>route.abort());
  try{await page.goto(url.toString(),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.querySelector('#homeProfileAvatar .driver-avatar-image'));const mark=await page.locator('#homeProfileAvatar .driver-avatar-fallback').textContent();if(mark!=='R')throw Error(`Fallback mark ${mark}`);report.cases.push({portraitAssetFailure:true,fallbackMark:mark});}catch(error){report.errors.push(`asset fallback: ${error.stack||error}`);}finally{await context.close();}
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length||report.external.length)process.exitCode=1;
