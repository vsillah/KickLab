import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=resolve(process.argv[2]||'qa-artifacts/race-pixel-exchange');mkdirSync(output,{recursive:true});
const url='http://127.0.0.1:5884/kicklab.html?raceExpansion=prototype&raceMultiplayer=prototype&rev='+(process.env.KICKLAB_QA_HEAD||'working');
const profile={version:1,activeId:'seat-a',legacyProfileId:'seat-a',profiles:[{id:'seat-a',nickname:'Local Racer',avatar:'rocket',color:'sky',progress:{xp:240,lap:17,stats:{plays:{race:2}},badges:{r_finish:true}}}]};
const report={head:process.env.KICKLAB_QA_HEAD||'working',device:'USB Pixel Chrome over ADB reverse and CDP',checks:[],errors:[]};
const laptop=await chromium.launch({headless:true});let phone;
async function ready(page){await page.goto(url);if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();if(await page.locator('#racePreflight').isVisible())await page.click('#racePreflightClose');await page.click('#racePhoneProgress');await page.click('#raceMultiQuick');}
const close=page=>page.click('[data-close-detail="orientation"]');
const open=async page=>{if(await page.locator('#results').isVisible())await page.click('#rNext');await page.click('#racePhoneProgress');};
try{
  const lc=await laptop.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await lc.addInitScript(value=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify(value)),profile);const a=await lc.newPage();
  phone=await chromium.connectOverCDP('http://127.0.0.1:9222');const pc=phone.contexts()[0];await pc.addInitScript(value=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify(value)),profile);const b=await pc.newPage();
  await ready(a);await ready(b);await a.fill('#raceQuickAlias','Ayo');await a.click('#raceQuickCreate');await close(a);await a.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.start());await a.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.finish(true));await open(a);
  const challenge=await a.locator('#raceQuickCode').inputValue();if(!challenge.startsWith('KLQ1.'))throw Error('laptop challenge absent');await a.locator('#raceQuick').screenshot({path:join(output,'laptop-challenge.png')});
  await b.fill('#raceQuickInput',challenge);await b.click('#raceQuickImport');if(!(await b.locator('#raceQuickPreview').innerText()).includes('Ayo'))throw Error('Pixel did not preview laptop challenge');await b.locator('#raceQuick').screenshot({path:join(output,'pixel-preview.png')});await b.click('#raceQuickAccept');await close(b);await b.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.start());await b.evaluate(()=>__KICKLAB_RACE_MULTIPLAYER_QA__.finish(true));await open(b);
  const response=await b.locator('#raceQuickCode').inputValue();if(!response.startsWith('KLQ1.'))throw Error('Pixel response absent');await b.locator('#raceQuick').screenshot({path:join(output,'pixel-response.png')});await a.fill('#raceQuickInput',response);await a.click('#raceQuickCompare');if(!(await a.locator('#raceQuickStatus').innerText()).includes('self-reported'))throw Error('laptop comparison absent');await a.locator('#raceQuick').screenshot({path:join(output,'laptop-comparison.png')});
  report.checks.push({challengeLength:challenge.length,responseLength:response.length,pixelPreview:true,pixelResponse:true,laptopCompare:true});await b.close();await lc.close();
}catch(error){report.errors.push(error.stack||String(error));}
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await phone?.close();await laptop.close();console.log(JSON.stringify(report,null,2));if(report.errors.length)process.exitCode=1;
