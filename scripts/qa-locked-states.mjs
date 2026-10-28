import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5917/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/locked-states');
const head=process.env.KICKLAB_QA_HEAD||'working';
const viewports=[{width:360,height:780},{width:390,height:844},{width:768,height:1024},{width:1113,height:900},{width:1440,height:900}];
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const errors=[],external=[],checks=[];

async function open(viewport,race=false){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'locked-qa',legacyProfileId:'locked-qa',profiles:[{id:'locked-qa',nickname:'Local QA',avatar:'rocket',color:'sky',progress:{xp:0,ch:{kick:1},raceCompetition:{version:1,bests:{},awards:{}}}}]})));
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(`${viewport.width}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{external.push(`${viewport.width}: ${url}`);route.abort();}});
  const url=new URL(base);url.searchParams.set('rev',head);
  if(race)for(const [key,value] of Object.entries({raceCompetition:'prototype',racePreflight:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceExpansion:'prototype'}))url.searchParams.set(key,value);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  return{context,page};
}

async function clickAriaDisabled(page,locator){await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();assert.ok(box,'locked choice has a visible target');await page.mouse.click(box.x+box.width/2,box.y+box.height/2);}

async function inspectLock(locator,{name,requirement=false,disabled=false}={}){
  const state=await locator.evaluate(node=>{
    const veil=getComputedStyle(node,'::before'),icon=getComputedStyle(node,'::after'),hint=node.querySelector('.kl-unlock-requirement')||node.querySelector('.choice-copy small')||node.querySelector('small');
    return{tag:node.tagName,filter:getComputedStyle(node).filter,opacity:getComputedStyle(node).opacity,veil:veil.backgroundColor,icon:icon.backgroundColor,mask:icon.maskImage,aria:node.getAttribute('aria-label')||node.textContent,disabled:node.disabled||node.getAttribute('aria-disabled')==='true',hint:hint?.textContent?.trim()||'',hintColor:hint?getComputedStyle(hint).color:null,hintOverflow:hint?Math.max(hint.scrollWidth-hint.clientWidth,hint.scrollHeight-hint.clientHeight):0,overflow:node.scrollWidth-node.clientWidth};
  });
  assert.equal(state.filter,'grayscale(1)',`${name}: whole component is desaturated`);
  assert.equal(state.opacity,'1',`${name}: no competing opacity treatment`);
  assert.match(state.veil,/0\.68/,`${name}: shared dim layer`);
  assert.match(state.icon,/255, 255, 255/,`${name}: translucent white lock`);
  assert.match(state.mask,/data:image\/svg\+xml/,`${name}: lock icon mask`);
  assert.ok(state.overflow<=1,`${name}: card contains its content`);
  if(requirement){assert.ok(state.hint,`${name}: visible unlock requirement`);assert.equal(state.hintColor,'rgb(255, 255, 255)',`${name}: readable requirement`);assert.ok(state.hintOverflow<=1,`${name}: unlock requirement is not clipped`);}
  if(disabled)assert.ok(state.disabled,`${name}: disabled selection semantics`);
  return state;
}

async function run(viewport){
  const label=`${viewport.width}x${viewport.height}`;
  {
    const {context,page}=await open(viewport,true);
    try{
      await page.locator('#boardBtn').click();
      assert.equal(await page.locator('.race-journey-card.kl-locked').count(),5);
      await inspectLock(page.locator('.race-journey-card.kl-locked').first(),{name:`${label} awards`,requirement:true});
      await page.locator('#raceCompetition').screenshot({path:join(output,`${label}-awards.png`)});
      await page.locator('#fbClose').click();
      await page.locator('#lab-tab-race').click();
      await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
      await page.locator('#racePreflightNext').click();
      const lockedCar=page.locator('[data-preflight-vehicle="vesper"]');
      await inspectLock(lockedCar,{name:`${label} vehicle`,requirement:true,disabled:true});
      const chosen=await page.locator('[data-preflight-vehicle][aria-pressed="true"]').getAttribute('data-preflight-vehicle');
      const stored=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));
      await clickAriaDisabled(page,lockedCar);
      assert.equal(await page.locator('[data-preflight-vehicle][aria-pressed="true"]').getAttribute('data-preflight-vehicle'),chosen,`${label}: locked vehicle cannot be selected`);
      assert.equal(await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1')),stored,`${label}: locked vehicle does not mutate profile`);
      await lockedCar.scrollIntoViewIfNeeded();
      await page.locator('#racePreflight').screenshot({path:join(output,`${label}-vehicle.png`)});
      await page.locator('#racePreflightClose').click();
      await page.locator('#racePhoneToolsToggle').click();await page.locator('#raceToolsGarage').click();
      assert.equal(await page.locator('.garage-roster-card.kl-locked').count(),2);
      await inspectLock(page.locator('.garage-roster-card.kl-locked').first(),{name:`${label} Garage`,requirement:true,disabled:true});
      await page.locator('#settingsDrawer').screenshot({path:join(output,`${label}-garage.png`)});
      await page.locator('#settingsClose').click();
      await page.locator('#racePhoneProgress').click();
      await inspectLock(page.locator('#raceMultiLive'),{name:`${label} live room`,requirement:true,disabled:true});
      await inspectLock(page.locator('#raceMultiplayerStart'),{name:`${label} local match`,disabled:true});
      assert.match(await page.locator('#raceMultiplayerStatus').textContent(),/Create a second local player/);
      await page.locator('#raceChampionshipToggle').click();
      assert.equal(await page.locator('#raceChampionshipEvents .kl-locked').count(),4);
      await inspectLock(page.locator('#raceChampionshipEvents .kl-locked').first(),{name:`${label} championship`,requirement:true,disabled:true});
      await page.locator('#raceChampionshipEvents .kl-locked').first().scrollIntoViewIfNeeded();
      await page.locator('#raceChampionship').screenshot({path:join(output,`${label}-championship.png`)});
      checks.push({label,surface:'race',awards:5,lockedVehicles:await page.locator('[data-preflight-vehicle].kl-locked').count(),championship:4,profileUnchanged:true});
    }finally{await context.close();}
  }
  for(const lab of ['fight','kick']){
    const {context,page}=await open(viewport);
    try{
      await page.locator(`#lab-tab-${lab}`).click();
      await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
      await page.locator('#orientationDetailToggle').click();
      await page.locator('#settingsToggle').click();
      await page.locator('.settings-category').filter({hasText:'Style'}).click();
      const lock=page.locator('#settingsDrawer .chip.kl-locked').first();
      assert.ok(await page.locator('#settingsDrawer .chip.kl-locked').count()>0,`${label} ${lab}: level-gated styles exist`);
      await inspectLock(lock,{name:`${label} ${lab} style`,requirement:true,disabled:true});
      const before=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));
      await clickAriaDisabled(page,lock);
      await lock.focus();await page.keyboard.press('Enter');
      assert.equal(await lock.getAttribute('aria-pressed'),'false',`${label} ${lab}: locked style remains unselected`);
      assert.equal(await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1')),before,`${label} ${lab}: locked style does not change progress`);
      await page.locator('#settingsDrawer').screenshot({path:join(output,`${label}-${lab}-style.png`)});
      if(lab==='kick'){assert.equal(await page.locator('.var.kl-locked').count(),1,`${label}: fixed Kick challenge variable`);assert.equal(await page.locator('.var.kl-locked input').evaluate(node=>node.disabled),true,`${label}: fixed Kick variable stays disabled`);}
      checks.push({label,surface:lab,lockedStyles:await page.locator('#settingsDrawer .chip.kl-locked').count(),profileUnchanged:true});
    }finally{await context.close();}
  }
}

for(const viewport of viewports){try{await run(viewport);}catch(error){errors.push(`${viewport.width}x${viewport.height}: ${error.stack||error}`);}}
await browser.close();
const report={head,base,checks,errors,external};writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,checks,errors,external,output},null,2));
if(errors.length||external.length)process.exitCode=1;
