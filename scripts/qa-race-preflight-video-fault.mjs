// Missing local preflight video through current venue-first Race flow.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[a-f0-9]{40}$/.test(head||'')||execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim()!==head)throw Error('Bind to exact product main');
const base=new URL(process.argv[2]||'http://127.0.0.1:4173/kicklab.html');
if(!['127.0.0.1','localhost'].includes(base.hostname)||base.pathname!=='/kicklab.html')throw Error('Use trusted localhost Pages');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),artifactSha256=sha(readFileSync('dist/kicklab.html'));
if(sha(Buffer.from(await(await fetch(base)).arrayBuffer()))!==artifactSha256)throw Error('Served artifact differs from exact build');
const out=resolve(process.argv[3]||'qa-artifacts/race-preflight-video-fault');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),report={head,artifactSha256,cases:[],errors:[],external:[],popups:[],downloads:[]};
for(const [width,height] of [[360,800],[390,844],[768,1024],[1113,834],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'}),label=`${width}x${height}`;
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',mute:true})));
  const page=await context.newPage(),failed=[];page.setDefaultTimeout(8000);page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('popup',popup=>report.popups.push(`${label}: ${popup.url()}`));page.on('download',download=>report.downloads.push(`${label}: ${download.suggestedFilename()}`));
  page.on('request',request=>{const url=request.url();if(!url.startsWith(base.origin+'/')&&!url.startsWith('blob:')&&!url.startsWith('data:'))report.external.push(`${label}: ${url}`)});
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base.origin+'/')||url.startsWith('blob:')||url.startsWith('data:'))route.continue();else route.abort()});
  await page.route('**/media/race-preflight/*.mp4',route=>{failed.push(new URL(route.request().url()).pathname);route.abort()});
  try{
    const url=new URL(base);url.searchParams.set('rev',head);for(const flag of ['raceExpansion','racePreflight'])url.searchParams.set(flag,'prototype');
    await page.goto(url.href,{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-race').click();await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
    await page.locator('[data-preflight-venue="highland"]').click();await page.locator('[data-preflight-mode="drag"]').click();
    await page.locator('[data-preflight-mode="drag"] .race-preflight-media-fallback').waitFor({state:'visible',timeout:15000});
    for(let step=0;step<3;step++)await page.locator('#racePreflightNext').click();
    await page.locator('.race-preflight-grid-car .race-preflight-media-fallback').waitFor({state:'visible',timeout:15000});const fallback=true;
    await page.screenshot({path:join(out,`${width}-grid-fallback.png`)});
    await page.locator('#racePreflightNext').click();await page.locator('#racePreflight').waitFor({state:'hidden',timeout:15000});
    const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
    await page.waitForFunction(()=>['count','run'].includes(window.__KICKLAB_RACE_MODES_QA__?.state().phase),null,{timeout:30000});
    const state=await page.evaluate(()=>({phase:window.__KICKLAB_RACE_MODES_QA__.state().phase,mode:window.__KICKLAB_RACE_MODES_QA__.state().mode,overflow:document.documentElement.scrollWidth-innerWidth}));
    if(!failed.length||!fallback||state.mode!=='drag'||state.overflow>1)throw Error(`Fault recovery: ${JSON.stringify({failed,fallback,state})}`);
    report.cases.push({label,failedPaths:[...new Set(failed)],fallback,phase:state.phase,mode:state.mode,overflow:state.overflow});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);await page.screenshot({path:join(out,`${width}-failure.png`)}).catch(()=>{})}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.length,errors:report.errors,external:report.external,popups:report.popups,downloads:report.downloads},null,2));
if(report.cases.length!==5||report.errors.length||report.external.length||report.popups.length||report.downloads.length)process.exitCode=1;
