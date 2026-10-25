import {createRequire} from 'node:module';
import {existsSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5878/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-awards-journey');
const head=process.env.KICKLAB_QA_HEAD||'working';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const errors=[],external=[],clips=[];
async function scene(name,viewport,initialAwards){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:name==='reduced'?'reduce':'no-preference',recordVideo:{dir:output,size:viewport}});
 await context.addInitScript(awards=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'racer',legacyProfileId:'racer',profiles:[{id:'racer',nickname:'Racer One',avatar:'rocket',color:'sky',progress:{raceCompetition:{version:1,bests:{},awards}}}]})),initialAwards);
 const page=await context.newPage();page.on('pageerror',error=>errors.push(`${name}: ${error.message}`));await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{external.push(url);route.abort();}});
 const url=new URL(base);url.searchParams.set('raceCompetition','prototype');url.searchParams.set('rev',head);await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
 if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
 if(name==='desktop'||name==='reduced')await page.evaluate(labelText=>{const label=document.createElement('div');label.textContent=labelText;label.style.cssText='position:fixed;right:8px;top:8px;z-index:9999;background:#081623e8;color:#d8f3dc;border:1px solid #8ccbb0;padding:5px 8px;border-radius:6px;font:700 10px system-ui;pointer-events:none';document.body.append(label);},name==='reduced'?'LOCAL QA FIXTURE · REDUCED MOTION':'LOCAL QA FIXTURE · NORMAL MOTION');
 await page.click('#boardBtn');await page.locator('#raceCompetition').waitFor({state:'visible'});await page.waitForFunction(()=>[...document.querySelectorAll('.race-journey-art img')].every(image=>image.complete&&image.naturalWidth));
 await page.locator('#raceCompetition').scrollIntoViewIfNeeded();await page.waitForTimeout(name==='desktop'?6500:1800);
 if(name==='desktop'){
   await page.locator('#raceCompetition').screenshot({path:join(output,`desktop-opening-${head}.png`)});
   await page.click('#fbClose');
   await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
   await page.evaluate(()=>window.__KICKLAB_RACE_AWARDS_QA__.qualify('core',19.25));
   await page.waitForTimeout(1900);
   await page.evaluate(()=>window.__KICKLAB_RACE_AWARDS_QA__.openJourney());await page.locator('#raceCompetition').scrollIntoViewIfNeeded();await page.waitForTimeout(4800);
   await page.locator('#raceCompetition').screenshot({path:join(output,`desktop-core-earned-${head}.png`)});
   await page.click('#fbClose');await page.evaluate(()=>window.__KICKLAB_RACE_AWARDS_QA__.qualify('drag',1300));
   await page.evaluate(()=>window.__KICKLAB_RACE_AWARDS_QA__.openJourney());await page.locator('#raceCompetition').scrollIntoViewIfNeeded();await page.waitForTimeout(4800);
   await page.locator('#raceCompetition').screenshot({path:join(output,`desktop-drag-earned-${head}.png`)});
   await page.click('#fbClose');await page.evaluate(()=>window.__KICKLAB_RACE_AWARDS_QA__.openProfile());await page.locator('.race-profile-perk img').waitFor();await page.waitForTimeout(2100);
 }else{
   await page.locator('#raceCompetition').screenshot({path:join(output,`${name}-journey-${head}.png`)});
   await page.waitForTimeout(name==='reduced'?4000:3500);
   if(name==='phone'){await page.locator('.race-journey-card:last-child').scrollIntoViewIfNeeded();await page.waitForTimeout(3000);await page.locator('.race-journey-card:first-child').scrollIntoViewIfNeeded();await page.waitForTimeout(1200);}
 }
 const path=await page.video().path();await context.close();const dest=join(output,`${name}-${head}.webm`);copyFileSync(path,dest);clips.push(dest);
}
try{await scene('desktop',{width:1280,height:900},{});await scene('reduced',{width:1113,height:900},{core:true});await scene('phone',{width:390,height:844},{core:true});}finally{await browser.close();}
writeFileSync(join(output,`record-${head}.json`),JSON.stringify({head,base,clips,errors,external,fixture:'Local synthetic qualification events; no player data or upload'},null,2)+'\n');
console.log(JSON.stringify({head,clips,errors,external},null,2));if(errors.length||external.length)process.exitCode=1;
