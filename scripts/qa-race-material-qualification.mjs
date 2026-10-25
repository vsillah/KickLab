import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const onlyArg=process.argv.find(arg=>arg.startsWith('--only='));
const out=resolve('qa-artifacts/race-material-qualification',onlyArg?'retry':'');mkdirSync(out,{recursive:true});
const launchBrowser=()=>chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
let browser=await launchBrowser();
const base='http://127.0.0.1:4173/kicklab.html',rows=[],errors=[],external=[];
const viewports=[['phone360',360,780],['phone390',390,844],['tablet',768,1024],['laptop',1113,988],['desktop',1440,900]];
const only=onlyArg?new Set(onlyArg.slice(7).split(',')):null;
async function routeLocal(page,inject=false){
  await page.route('**/*',async route=>{const url=new URL(route.request().url());
    if(inject&&url.pathname==='/kicklab.html'&&url.origin===new URL(base).origin){const response=await route.fetch();let html=await response.text(),end=html.lastIndexOf('</script>'),close=html.lastIndexOf('})();',end);if(close<0)throw Error('QA hook insertion failed');html=html.slice(0,close)+'globalThis.__KICKLAB_MATERIAL_QA__={Race,RACE_3D};\n'+html.slice(close);return route.fulfill({response,body:html});}
    if(url.origin===new URL(base).origin||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();
  });
}
async function openRace(context,{android=false,inject=true}={}){
  if(android)await context.addInitScript(()=>Object.defineProperty(navigator,'userAgentData',{configurable:true,value:{platform:'Android',mobile:true,brands:[{brand:'Google Chrome',version:'156'}],getHighEntropyValues:async()=>({model:'Pixel 10 Pro',platformVersion:'17.0.0'})}}));
  await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','Material QA');});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await routeLocal(page,inject);
  const url=new URL(base);url.searchParams.set('raceProgression','prototype');url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',head);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
  await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.orbit?.done===true,undefined,{timeout:10000});
  await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:20000});await page.click('#raceCoachSetupStart');
  try{await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.dynamics?.state==='run',undefined,{timeout:25000});}
  catch(error){const state=await page.evaluate(()=>({audit:globalThis.__KICKLAB_RACE_3D__?{status:globalThis.__KICKLAB_RACE_3D__.status,error:globalThis.__KICKLAB_RACE_3D__.error,orbit:globalThis.__KICKLAB_RACE_3D__.orbit,dynamics:globalThis.__KICKLAB_RACE_3D__.dynamics}:null,pacing:!document.querySelector('#gamePacingOverlay')?.hidden,startVisible:!!document.querySelector('#raceCoachSetupStart')?.getClientRects().length}));throw Error(`${error.message}; state=${JSON.stringify(state)}`);}
  return page;
}
try{
  for(const [viewport,width,height] of viewports)for(const motion of ['normal','reduced']){
    if(only&&!only.has(`${viewport}/${motion}`))continue;
    console.log(`starting ${viewport}/${motion}`);
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=390,reducedMotion:motion==='reduced'?'reduce':'no-preference'});
    try{const page=await openRace(context);console.log(`running ${viewport}/${motion}`);
      for(const venue of ['highland','marine','forest']){
        await page.evaluate(id=>{const {Race,RACE_3D}=globalThis.__KICKLAB_MATERIAL_QA__;Race.opt.venue=id;Race.state='run';Object.assign(Race.st,{x:44,y:0,th:0,v:0,t:2});RACE_3D.trackKey='';RACE_3D.cameraPose=null;},venue);
        await page.keyboard.down('Space');await page.waitForTimeout(950);await page.keyboard.up('Space');
        await page.waitForFunction(id=>globalThis.__KICKLAB_RACE_3D__?.trackKey?.startsWith(id+'/'),venue);
        const state=await page.evaluate(()=>({audit:globalThis.__KICKLAB_RACE_3D__,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),nick:localStorage.getItem('impactlab.nick'),keys:Object.keys(localStorage).sort()}));
        const shot=join(out,`${viewport}-${motion}-${venue}.png`);await page.locator('.stage:visible').first().screenshot({path:shot});
        const row={viewport,width,height,motion,venue,shot,...state};rows.push(row);
        console.log(`captured ${viewport}/${motion}/${venue}`);
        if(state.audit?.status!=='rendering'||!state.audit.vehicle||!state.audit.canvas||state.audit.venue!==venue||state.audit.dynamics?.x<=44||state.audit.reducedMotion!==(motion==='reduced')||state.overflow||state.nick!=='Material QA')errors.push(`${viewport}/${motion}/${venue}: ${JSON.stringify({status:state.audit?.status,vehicle:state.audit?.vehicle,x:state.audit?.dynamics?.x,reduced:state.audit?.reducedMotion,overflow:state.overflow,nick:state.nick})}`);
      }
    }catch(error){errors.push(`${viewport}/${motion}: ${error.stack||error}`);}finally{console.log(`closing ${viewport}/${motion}`);await context.close();await browser.close();browser=await launchBrowser();}
  }
  const androidContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{const page=await openRace(androidContext,{android:true});await page.keyboard.down('Space');await page.waitForTimeout(1000);await page.keyboard.up('Space');const audit=await page.evaluate(()=>globalThis.__KICKLAB_RACE_3D__);rows.push({viewport:'android-emulated',audit});if(audit?.status!=='rendering'||!audit.vehicle||audit.shadowMode!=='projected-contact'||audit.shadowMap)errors.push(`Android emulation: ${JSON.stringify({status:audit?.status,vehicle:audit?.vehicle,shadowMode:audit?.shadowMode,shadowMap:audit?.shadowMap})}`);await page.locator('.stage:visible').first().screenshot({path:join(out,'android-emulated.png')});}catch(error){errors.push(`Android emulation: ${error.stack||error}`);}finally{await androidContext.close();}
  const fallbackContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{const page=await fallbackContext.newPage();page.on('pageerror',error=>errors.push(error.message));await routeLocal(page);await page.route('**/*.glb',route=>route.abort());const url=new URL(base);url.searchParams.set('raceSystems','proxy');url.searchParams.set('rev',head);await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.status==='canvas-fallback',undefined,{timeout:20000});const fallback=await page.evaluate(()=>({audit:globalThis.__KICKLAB_RACE_3D__,canvas:!!document.querySelector('#cv')?.getClientRects().length}));rows.push({viewport:'fallback',...fallback});if(fallback.audit?.status!=='canvas-fallback'||!fallback.canvas)errors.push(`Canvas fallback: ${JSON.stringify(fallback)}`);}catch(error){errors.push(`Canvas fallback: ${error.stack||error}`);}finally{await fallbackContext.close();}
  const offContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{const page=await offContext.newPage();await routeLocal(page);await page.goto(base+`?rev=${head}`,{waitUntil:'domcontentloaded'});const off=await page.evaluate(()=>({race:globalThis.__KICKLAB_RACE_3D__||null,canvas:!!document.querySelector('#race3')}));rows.push({viewport:'default-off',...off});if(off.race||off.canvas)errors.push(`Default-off: ${JSON.stringify(off)}`);}catch(error){errors.push(`Default-off: ${error.stack||error}`);}finally{await offContext.close();}
}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify({head,rows,errors,external},null,2)+'\n');
console.log(JSON.stringify({head,cases:rows.length,errors,external,matrix:rows.filter(row=>row.venue).map(row=>({viewport:row.viewport,motion:row.motion,venue:row.venue,x:+row.audit.dynamics.x.toFixed(2),status:row.audit.status,shadowMode:row.audit.shadowMode}))},null,2));
if(errors.length||external.length)process.exitCode=1;
