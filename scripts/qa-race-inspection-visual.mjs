import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:process.env.KICKLAB_QA_HEADFUL!=='1',executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const out=resolve('qa-artifacts/race-inspection-visual');mkdirSync(out,{recursive:true});
const viewports=[['phone',390,844],['tablet',768,1024],['desktop',1440,900]],cars=['kestrel','cobalt','aegis'];
const views=[['whole',null,null],['suspension','firm','suspension'],['tires','wide','tires'],['brakes','sport','brakes']];
const report=[];
try{
  for(const [viewport,width,height] of viewports){
    const folder=resolve(out,viewport);mkdirSync(folder,{recursive:true});
    for(const car of cars){
      const context=await browser.newContext({viewport:{width,height},hasTouch:viewport==='phone',isMobile:viewport==='phone'});
      const page=await context.newPage(),errors=[],external=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:4173'||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
      await page.goto(`http://127.0.0.1:4173/kicklab.html?raceExpansion=prototype&raceTelemetry=prototype&racePreflight=prototype&rev=${head}`,{waitUntil:'domcontentloaded'});
      if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
      if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
      await page.click('#lab-tab-race');
      if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
      await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,undefined,{timeout:20000});
      await page.click('#racePreflightNext');
      await page.locator(`[data-preflight-vehicle="${car}"]`).click();
      await page.click('#racePreflightNext');
      await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__?.state().inspection.loaded,undefined,{timeout:20000});
      for(const [view,value,part] of views){
        if(view==='whole')await page.click('#raceInspectionWhole');
        else await page.locator(`[data-preflight-part="${part}"][data-preflight-value="${value}"]`).click();
        await page.waitForTimeout(850);
        const state=await page.evaluate(()=>globalThis.__KICKLAB_RACE_PREFLIGHT_QA__.state());
        const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
        if(!state.inspection.loaded||state.inspection.vehicle!==car||state.inspection.part!==view||overflow||errors.length||external.length)throw Error(JSON.stringify({viewport,car,view,state:state.inspection,overflow,errors,external}));
        await page.locator('#raceInspectionStage').screenshot({path:resolve(folder,`${car}-${view}.png`)});
        report.push({viewport,width,height,car,view,frames:state.inspection.frames,overflow,errors:[...errors],external:[...external]});
      }
      await context.close();
      console.log(`captured ${viewport}/${car}`);
    }
  }
  writeFileSync(resolve(out,'report.json'),JSON.stringify({head,views:report},null,2));
  console.log(JSON.stringify({head,captures:report.length,errors:0,external:0},null,2));
}finally{await browser.close();}
