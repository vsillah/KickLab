import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:process.env.KICKLAB_QA_HEADFUL!=='1',executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const out=resolve('qa-artifacts/race-preflight-guide');mkdirSync(out,{recursive:true});
const report=[];
try{
  for(const [name,width,height] of [['phone',390,844],['tablet',768,1024],['desktop',1440,900]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:name==='phone',isMobile:name==='phone'}),page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:4173'||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
    await page.goto(`http://127.0.0.1:4173/kicklab.html?raceExpansion=prototype&raceTelemetry=prototype&racePreflight=prototype&rev=${head}`,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');
    if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,undefined,{timeout:20000});
    const stored=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));
    const first=await page.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state());
    if(first.recommendation.tier!=='beginner'||first.recommendation.parts.brakes!=='standard')throw Error(`${name}: unexpected starting recommendation`);
    await page.locator('[data-preflight-mode="endurance"]').click();
    const route=await page.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state());
    if(route.recommendation.parts.brakes!=='endurance'||route.draft.mode!=='endurance')throw Error(`${name}: track advice did not recompute`);
    await page.click('#racePreflightNext');
    const vehicles=page.locator('[data-preflight-vehicle]');
    if(await vehicles.count()!==3||await page.locator('[data-preflight-vehicle][data-coach-recommended="true"]').count()!==1)throw Error(`${name}: vehicle mark count`);
    const coachCar=page.locator('[data-preflight-vehicle="cobalt"]');
    if(!await coachCar.getAttribute('aria-label').then(label=>label.includes('Coach recommended'))||!await coachCar.getAttribute('title').then(title=>title.includes('three-lap')))throw Error(`${name}: vehicle advice inaccessible`);
    await page.locator('[data-preflight-vehicle="aegis"]').click();
    if(await page.locator('[data-preflight-vehicle="aegis"]').getAttribute('aria-pressed')!=='true'||await coachCar.getAttribute('data-coach-recommended')!=='true')throw Error(`${name}: recommendation overrode car selection`);
    await page.screenshot({path:resolve(out,`${name}-vehicle.png`)});
    await page.click('#racePreflightNext');
    if(await page.locator('#raceInspectionWhole .race-part-icon').count()!==1||await page.locator('.race-preflight-parts legend .race-part-icon').count()!==3||await page.locator('.race-preflight-part-options button .race-part-icon').count()!==9)throw Error(`${name}: icon coverage incomplete`);
    for(const part of ['suspension','tires','brakes']){
      const field=page.locator(`[data-inspection-field="${part}"]`),choices=field.locator('button');
      if(await field.locator('[data-coach-recommended="true"]').count()!==1)throw Error(`${name}: ${part} mark count`);
      for(let i=0;i<await choices.count();i++){
        const button=choices.nth(i),label=await button.getAttribute('aria-label'),title=await button.getAttribute('title');
        if(!label?.includes(part==='tires'?'Wheels & tires':part[0].toUpperCase()+part.slice(1))||!title||!await button.locator('.race-part-icon').count())throw Error(`${name}: ${part} option ${i} inaccessible`);
      }
    }
    await page.locator('[data-preflight-part="brakes"][data-preflight-value="sport"]').click();
    const chosen=await page.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state());
    if(chosen.draft.vehicle!=='aegis'||chosen.draft.garage.brakes!=='sport'||chosen.recommendation.parts.brakes!=='endurance')throw Error(`${name}: non-recommended choice was overridden`);
    await page.locator('[data-preflight-part="brakes"][data-preflight-value="sport"]').focus();
    if(!await page.locator('[data-preflight-part="brakes"][data-preflight-value="sport"]').evaluate(button=>button===document.activeElement))throw Error(`${name}: keyboard focus lost`);
    await page.locator('[data-inspection-field="brakes"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:resolve(out,`${name}-brakes.png`)});
    const after=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));
    const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
    if(stored!==after||overflow||errors.length||external.length)throw Error(`${name}: ${JSON.stringify({storedUnchanged:stored===after,overflow,errors,external})}`);
    report.push({name,width,height,beginner:route.recommendation,chosen:{vehicle:chosen.draft.vehicle,brakes:chosen.draft.garage.brakes},overflow,errors,external,storageUnchanged:true});
    await context.close();
    console.log(`passed ${name} Coach guide`);
  }
  const profileContext=await browser.newContext({viewport:{width:1280,height:800}});
  await profileContext.addInitScript(()=>{
    if(!localStorage.getItem('kicklab.profiles.v1'))localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'beginner',legacyProfileId:'beginner',profiles:[
      {id:'beginner',nickname:'New Racer',avatar:'rocket',color:'sky',progress:{raceModes:{version:1,selected:'drag',best:{}}}},
      {id:'practiced',nickname:'Track Racer',avatar:'rocket',color:'mint',progress:{raceModes:{version:1,selected:'drag',best:{drag:1100,circuit:850}}}}
    ]}));
  });
  const profilePage=await profileContext.newPage();
  await profilePage.goto(`http://127.0.0.1:4173/kicklab.html?raceExpansion=prototype&raceTelemetry=prototype&racePreflight=prototype&rev=${head}`,{waitUntil:'domcontentloaded'});
  await profilePage.click('#lab-tab-race');
  if(await profilePage.locator('.race-orbit-panel button').isVisible())await profilePage.locator('.race-orbit-panel button').click();
  await profilePage.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,undefined,{timeout:20000});
  if(await profilePage.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state().recommendation.vehicle)!=='cobalt')throw Error('Beginner profile recommendation missing');
  await profilePage.click('#racePreflightClose');
  await profilePage.click('#profileBtn');
  await profilePage.click('#profileList [data-profile-id="practiced"]');
  await profilePage.click('#profileClose');
  await profilePage.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,undefined,{timeout:20000});
  const switched=await profilePage.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state());
  if(switched.profileId!=='practiced'||switched.recommendation.tier!=='practiced'||switched.recommendation.vehicle!=='kestrel'||switched.draft.vehicle!=='cobalt')throw Error(`Profile advice did not recompute without selection mutation: ${JSON.stringify(switched).slice(0,1000)}`);
  report.push({name:'profile-switch',profile:switched.profileId,recommendation:switched.recommendation.vehicle,selected:switched.draft.vehicle});
  await profileContext.close();
  console.log('passed isolated profile switch');
  writeFileSync(resolve(out,'report.json'),JSON.stringify({head,cases:report},null,2));
  console.log(JSON.stringify({head,cases:report.length,errors:0,external:0},null,2));
}finally{await browser.close();}
