import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out=resolve('qa-artifacts/race-material-pixel');mkdirSync(out,{recursive:true});
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8'}).trim();
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
const pages=browser.contexts().flatMap(context=>context.pages());
const page=pages.find(item=>item.url().includes(`rev=${head}`)&&item.url().includes('raceSystems=proxy'));
if(!page)throw Error('Original exact-head Pixel gameplay tab not found');
const secondary=pages.find(item=>item!==page&&item.url()===`http://127.0.0.1:4173/kicklab.html?raceProgression=prototype&rev=${head}`);
if(secondary)await secondary.close();
const url=`http://127.0.0.1:4173/kicklab.html?raceProgression=prototype&rev=${head}`;
const rows=[],errors=[];
const state=()=>page.evaluate(()=>({url:location.href,hidden:document.hidden,audit:globalThis.__KICKLAB_RACE_3D__?{status:globalThis.__KICKLAB_RACE_3D__.status,shadowMode:globalThis.__KICKLAB_RACE_3D__.shadowMode,vehicle:globalThis.__KICKLAB_RACE_3D__.vehicle,canvas:globalThis.__KICKLAB_RACE_3D__.canvas,dynamics:globalThis.__KICKLAB_RACE_3D__.dynamics}:null}));
try{
  await page.bringToFront();await page.goto(url,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
  await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.orbit?.done,undefined,{timeout:10000});
  await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:20000});await page.click('#raceCoachSetupStart');
  await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.dynamics?.state==='run',undefined,{timeout:25000});
  rows.push({label:'before-home',...await state()});
  adb('shell','input','keyevent','3');await new Promise(resolve=>setTimeout(resolve,1000));
  adb('shell','am','start','-n','com.android.chrome/com.google.android.apps.chrome.Main');await new Promise(resolve=>setTimeout(resolve,1200));
  const returned=await state();rows.push({label:'after-home',...returned});
  await page.locator('.stage:visible').first().scrollIntoViewIfNeeded();
  writeFileSync(join(out,'focus-return-screen.png'),execFileSync('adb',['exec-out','screencap','-p'],{maxBuffer:16*1024*1024}));
  if(returned.url!==rows[0].url||returned.hidden||returned.audit?.status!=='rendering'||!returned.audit.vehicle||returned.audit.shadowMode!=='projected-contact')errors.push('Same-tab focus recovery lost projected 3D');
}catch(error){errors.push(error.stack||String(error));}
finally{await browser.close();}
writeFileSync(join(out,'focus-report.json'),JSON.stringify({head,rows,errors},null,2)+'\n');
console.log(JSON.stringify({head,rows,errors},null,2));if(errors.length)process.exitCode=1;
