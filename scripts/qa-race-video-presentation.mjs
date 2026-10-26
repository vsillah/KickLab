import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:4173/kicklab.html';
if(!/^http:\/\/127\.0\.0\.1:\d+\/kicklab\.html$/.test(base))throw new Error('Use a local KickLab build');
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
try{
  for(const viewport of [{width:390,height:844},{width:1440,height:900}])for(const reducedMotion of ['reduce','no-preference']){
    const context=await browser.newContext({viewport,reducedMotion});
    await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
    const page=await context.newPage(),external=[],errors=[];
    page.on('request',request=>{if(new URL(request.url()).origin!==new URL(base).origin)external.push(request.url());});
    page.on('pageerror',error=>errors.push(String(error)));
    const url=new URL(base);url.searchParams.set('raceVideo','cinematic');
    await page.goto(url.href,{waitUntil:'networkidle'});
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.getByRole('button',{name:/^Race .*Enter Race$/}).click();
    await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:15000});await page.locator('.race-orbit-panel button').click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});
    await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:15000});await page.locator('#raceCoachSetupStart').click();
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.dynamics?.state==='run',null,{timeout:25000});
    const state=await page.evaluate(()=>{
      const shown=selector=>getComputedStyle(document.querySelector(selector)).display!=='none'&&getComputedStyle(document.querySelector(selector)).visibility!=='hidden';
      const before={cockpit:shown('#raceCockpit'),tools:shown('#racePhoneToolsToggle'),overlay:shown('#cv'),storage:JSON.stringify(localStorage),active:document.documentElement.dataset.raceVideo||null};
      const activated=window.__KICKLAB_RACE_VIDEO__.activate();
      const after={cockpit:shown('#raceCockpit'),tools:shown('#racePhoneToolsToggle'),overlay:shown('#cv'),stage:document.querySelector('#race3').getBoundingClientRect().toJSON(),source:!!window.__KICKLAB_RACE_VIDEO__.source(),storage:JSON.stringify(localStorage),audit:window.__KICKLAB_RACE_3D__};
      return{before,after,activated};
    });
    if(!state.before.cockpit||!state.before.tools||!state.before.overlay||state.before.active||!state.activated||state.after.cockpit||state.after.tools||state.after.overlay||!state.after.source||state.before.storage!==state.after.storage||state.after.audit.status!=='rendering'||!state.after.audit.vehicle||state.after.audit.canvas!==true||state.after.stage.width<viewport.width-2||state.after.stage.height<viewport.height-2||external.length||errors.length)throw new Error(JSON.stringify({viewport,reducedMotion,state,external,errors}));
    console.log(JSON.stringify({viewport,reducedMotion,liveControls:true,cleanCapture:true,vehicle:true,externalRequests:0,storageChanged:false}));
    await context.close();
  }
}finally{await browser.close();}
