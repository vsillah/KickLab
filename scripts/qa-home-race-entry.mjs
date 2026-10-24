import {copyFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const local='http://127.0.0.1:4173/kicklab.html';
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out=resolve(process.argv[2]||'qa-artifacts/home-race-entry');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(x=>x&&existsSync(x))});
const results=[];
try{
  for(const [name,width,height,publicOrigin] of [['phone',390,844,false],['tablet',768,1024,false],['desktop',1440,900,false],['pages',390,844,true]]){
    const context=await browser.newContext({viewport:{width,height},recordVideo:name==='phone'||name==='desktop'?{dir:out,size:{width,height}}:undefined});
    const page=await context.newPage(),external=[],errors=[];
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(publicOrigin&&url.origin==='https://vsillah.github.io'&&url.pathname.startsWith('/KickLab/')){
        const path=url.pathname.slice('/KickLab/'.length)||'index.html';
        const response=await fetch(new URL(path+url.search,'http://127.0.0.1:4173/pages/'));
        await route.fulfill({status:response.status,body:Buffer.from(await response.arrayBuffer()),headers:{'content-type':response.headers.get('content-type')||'application/octet-stream'}});
      }else if(!publicOrigin&&url.origin==='http://127.0.0.1:4173'||['data:','blob:'].includes(url.protocol))await route.continue();
      else{external.push(url.href);await route.abort();}
    });
    page.on('pageerror',error=>errors.push(error.message));
    const start=publicOrigin?`https://vsillah.github.io/KickLab/?qa=home-entry&rev=${head}`:`${local}?qa=home-entry&rev=${head}`;
    await page.goto(start,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    const before=await page.evaluate(()=>({home:!document.querySelector('#modeHome').hidden,systems:document.documentElement.dataset.raceSystems||null,render:globalThis.__KICKLAB_RACE_3D__?.status||null}));
    if(!before.home||before.systems||before.render)throw Error(`${name} initial state ${JSON.stringify(before)}`);
    await page.screenshot({path:join(out,`${name}-home.png`)});
    await page.locator('#lab-tab-race').click();
    await page.waitForFunction(()=>document.documentElement.dataset.kicklabMode==='race'&&globalThis.__KICKLAB_RACE_3D__?.status==='rendering',null,{timeout:30000});
    if(await page.locator('.race-orbit-panel button').isVisible())await page.locator('.race-orbit-panel button').click();
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.orbit?.done,{timeout:15000});
    await page.locator('.stage').scrollIntoViewIfNeeded();
    const race=await page.evaluate(()=>({url:location.href,home:document.querySelector('#modeHome').hidden,scene:globalThis.__KICKLAB_RACE_3D__,roster:globalThis.KickLabRaceVehicleCatalog.enabled(),overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)}));
    if(!race.home||!race.roster||!race.scene.vehicle||!race.scene.canvas||race.overflow>1||!race.url.includes('qa=home-entry'))throw Error(`${name} Race state ${JSON.stringify(race).slice(0,1500)}`);
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:15000});
    await page.locator('#raceCoachSetupStart').click();
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:12000});
    await page.locator('.stage').scrollIntoViewIfNeeded();
    await page.screenshot({path:join(out,`${name}-race.png`)});
    await page.click('#orientationDetailToggle');
    await page.click('#modeHomeButton');
    if(!await page.locator('#modeHome').isVisible())throw Error(`${name} home return failed`);
    await page.click('#lab-tab-race');
    await page.waitForFunction(()=>document.documentElement.dataset.kicklabMode==='race'&&globalThis.__KICKLAB_RACE_3D__?.status==='rendering');
    if(external.length||errors.length)throw Error(`${name} egress/errors ${JSON.stringify({external,errors})}`);
    results.push({name,width,height,publicOrigin,before,scene:{status:race.scene.status,vehicleId:race.scene.vehicleId,assetUrl:race.scene.assetUrl},url:race.url,external,errors});
    await context.close();
    if(page.video())copyFileSync(await page.video().path(),join(out,`${name}.webm`));
  }
  for(const mode of ['fight','kick']){
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
    await page.goto(`${local}?qa=home-entry`,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click(`#lab-tab-${mode}`);
    const state=await page.evaluate(()=>({url:location.href,mode:document.documentElement.dataset.kicklabMode,raceSystems:document.documentElement.dataset.raceSystems||null}));
    if(state.mode!==mode||state.raceSystems||new URL(state.url).searchParams.has('raceExpansion'))throw Error(`${mode} entry changed: ${JSON.stringify(state)}`);
    results.push({name:mode,state});
    await context.close();
  }
  writeFileSync(join(out,'report.json'),JSON.stringify({head,results},null,2));
  console.log(JSON.stringify(results.map(({name,scene,url})=>({name,scene,url})),null,2));
}finally{await browser.close();}
