// Exact-build regression for dismissing Race preflight while the 3D orbit hides Start heat.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(head))throw Error('Use an exact commit');
const url=new URL(process.argv[2]||'http://127.0.0.1:4173/kicklab.html');
if(!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/kicklab.html')throw Error('Use local exact build');
for(const flag of ['raceExpansion','raceTelemetry','racePreflight'])url.searchParams.set(flag,'prototype');
url.searchParams.set('rev',head);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const artifactSha256=sha(readFileSync('dist/kicklab.html'));
if(sha(Buffer.from(await(await fetch(url)).arrayBuffer()))!==artifactSha256)throw Error('Served HTML differs from local build');
const out=resolve(process.argv[3]||'qa-artifacts/race-preflight-focus-restoration');mkdirSync(out,{recursive:true});
const cases=[
  {width:390,height:844,motion:'reduce',gfx:'3d',dismiss:'touch'},
  {width:390,height:844,motion:'normal',gfx:'3d',dismiss:'escape'},
  {width:768,height:1024,motion:'normal',gfx:'2d',dismiss:'pointer'},
  {width:1024,height:768,motion:'reduce',gfx:'3d',dismiss:'escape'},
  {width:1280,height:800,motion:'normal',gfx:'3d',dismiss:'pointer'},
  {width:1440,height:900,motion:'normal',gfx:'2d',dismiss:'escape'},
  {width:1440,height:900,motion:'reduce',gfx:'3d',dismiss:'pointer'}
];
const report={head,url:url.href,artifactSha256,cases:[],errors:[],external:[],httpErrors:[]};
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
try{
  for(const item of cases){
    const name=`${item.width}-${item.motion}-${item.gfx}-${item.dismiss}`;
    const context=await browser.newContext({viewport:{width:item.width,height:item.height},deviceScaleFactor:1,reducedMotion:item.motion==='reduce'?'reduce':'no-preference',hasTouch:item.dismiss==='touch'});
    await context.addInitScript(gfx=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx}));window.__permissionAttempts=[];if(navigator.permissions?.query){const query=navigator.permissions.query.bind(navigator.permissions);navigator.permissions.query=descriptor=>{window.__permissionAttempts.push(descriptor?.name||'unknown');return query(descriptor);};}},item.gfx);
    const page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
    page.on('response',response=>{if(response.status()>=400)report.httpErrors.push(`${name}: ${response.status()} ${new URL(response.url()).pathname}`);});
    await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${name}: ${target}`);route.abort();}});
    try{
      await page.goto(url.href,{waitUntil:'domcontentloaded'});
      if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
      if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
      await page.locator('#lab-tab-race').click();
      await page.locator('#racePreflight').waitFor({state:'visible',timeout:30000});
      await page.locator('[data-preflight-venue="highland"]').click();
      await page.locator('[data-preflight-mode="circuit"]').click();
      const savedBefore=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));
      if(item.dismiss==='escape')await page.keyboard.press('Escape');
      else if(item.dismiss==='touch')await page.locator('#racePreflightClose').tap();
      else await page.locator('#racePreflightClose').click();
      await page.locator('#racePreflight').waitFor({state:'hidden'});
      const premature=await page.evaluate(()=>{const start=document.querySelector('#raceCoachSetupStart');return !start.getClientRects().length&&document.activeElement===start;});
      if(premature)throw Error('Focused hidden Start heat during orbit');
      await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:30000});
      await page.waitForFunction(()=>document.activeElement?.id==='raceCoachSetupStart',null,{timeout:5000});
      const state=await page.evaluate(before=>({focus:document.activeElement?.id,startVisible:!!document.querySelector('#raceCoachSetupStart')?.getClientRects().length,startDisabled:document.querySelector('#raceCoachSetupStart')?.disabled,phase:window.__KICKLAB_RACE_MODES_QA__?.state().phase,preflightOpen:window.__KICKLAB_RACE_PREFLIGHT_QA__?.state().open,orbitDone:window.__KICKLAB_RACE_3D__?.orbit?.done,renderer:window.__KICKLAB_RACE_3D__?.status,storageUnchanged:localStorage.getItem('kicklab.profiles.v1')===before,overflow:document.documentElement.scrollWidth-innerWidth,permissionAttempts:window.__permissionAttempts}),savedBefore);
      if(!state.startVisible||state.startDisabled||state.phase!=='grid'||state.preflightOpen||!state.storageUnchanged||state.overflow>1||state.permissionAttempts.length)throw Error(`Wrong post-dismissal state: ${JSON.stringify(state)}`);
      if(item.gfx==='3d'&&state.renderer==='canvas-fallback')throw Error('WebGL case fell back to Canvas');
      if(item.gfx==='2d'&&await page.locator('#race3').isVisible())throw Error('Canvas case rendered WebGL');
      if(item.width===1280){
        const frames=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let previous;function frame(now){if(previous!==undefined)samples.push(now-previous);previous=now;if(samples.length<100)requestAnimationFrame(frame);else resolve(samples.slice(5));}requestAnimationFrame(frame);}));
        frames.sort((a,b)=>a-b);
        state.frameP95Ms=Number(frames[Math.floor(frames.length*.95)].toFixed(2));
        if(state.frameP95Ms>50)throw Error(`Race frame pacing exceeded 50 ms p95: ${state.frameP95Ms}`);
      }
      await page.keyboard.press('Enter');
      await page.locator('#racePreflight').waitFor({state:'visible',timeout:5000});
      report.cases.push({name,...state,keyboardReopen:true});
    }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}
    await context.close();
  }
}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,artifactSha256,cases:report.cases.length,errors:report.errors,external:report.external,httpErrors:report.httpErrors},null,2));
if(report.errors.length||report.external.length||report.httpErrors.length||report.cases.length!==cases.length)process.exitCode=1;
