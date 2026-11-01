// Exact Pages Fight outcome after network denial; use synthetic local state only.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[a-f0-9]{40}$/.test(head||'')||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==head)throw Error('Set KICKLAB_QA_HEAD to exact HEAD');
const base=new URL(process.argv[2]||'http://127.0.0.1:4173/pages/index.html');
if(!['127.0.0.1','localhost'].includes(base.hostname)||base.pathname!=='/pages/index.html')throw Error('Use trusted localhost Pages');
base.searchParams.set('rev',head);
const sha=value=>createHash('sha256').update(value).digest('hex'),artifactSha256=sha(readFileSync('dist/pages/index.html'));
if(sha(Buffer.from(await(await fetch(base)).arrayBuffer()))!==artifactSha256)throw Error('Served HTML differs from build');
const out=resolve('qa-artifacts/public-fight-offline-outcome');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),report={head,artifactSha256,cases:[]};
for(const [width,height] of [[390,844],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:width===390?'reduce':'no-preference',permissions:[]});
  await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'}));window.__qaPermissionAttempts=[];if(navigator.permissions?.query){const fn=navigator.permissions.query.bind(navigator.permissions);navigator.permissions.query=(...args)=>{window.__qaPermissionAttempts.push(`permissions:${args[0]?.name||'unknown'}`);return fn(...args);};}if(navigator.mediaDevices?.getUserMedia){const fn=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=(...args)=>{window.__qaPermissionAttempts.push('media');return fn(...args);};}});
  const page=await context.newPage(),errors=[],external=[],offlineRequests=[],popups=[],downloads=[];let offline=false;
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{const url=request.url();if(offline)offlineRequests.push(url);if(!url.startsWith(base.origin+'/')&&!url.startsWith('data:')&&!url.startsWith('blob:'))external.push(url);});page.on('popup',popup=>popups.push(popup.url()));page.on('download',download=>downloads.push(download.suggestedFilename()));
  try{
    await page.goto(base.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    offline=true;await context.setOffline(true);await page.locator('#lab-tab-fight').click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    await page.screenshot({path:join(out,`${width}-active.png`)});
    const actions=[];
    for(let i=0;i<(width===390?0:40);i++){
      if(await page.locator('#results').isVisible())break;
      const cross=page.locator('#padR button:visible:not([disabled])').filter({hasText:'Cross'}).first();
      if(await cross.count())await cross.click();
      await page.waitForTimeout(500);
      if(i%5===0)actions.push(await page.evaluate(()=>({result:!document.querySelector('#results').hidden,live:document.querySelector('#liveHud')?.textContent||'',history:document.querySelector('#historyHud')?.textContent||''})));
    }
    if(!await page.locator('#results').isVisible())await page.locator('#results').waitFor({state:'visible',timeout:45000}).catch(()=>{});
    const outcome=await page.evaluate(()=>{const rect=id=>document.querySelector(id)?.getBoundingClientRect().toJSON()||null;return{result:!document.querySelector('#results').hidden,title:document.querySelector('#rTitle')?.textContent||'',sub:document.querySelector('#rSub')?.textContent||'',permissions:window.__qaPermissionAttempts,overflow:document.documentElement.scrollWidth-innerWidth,boxes:{results:rect('#results'),rail:rect('#gameGuidanceHud'),next:rect('#rNext')},layers:{results:getComputedStyle(document.querySelector('#results')).zIndex,rail:getComputedStyle(document.querySelector('#gameGuidanceHud')).zIndex}};});
    await page.screenshot({path:join(out,`${width}-outcome.png`)});
    report.cases.push({width,height,actions,outcome,errors,external,offlineRequests,popups,downloads});
  }catch(error){report.cases.push({width,height,error:String(error),errors,external,offlineRequests,popups,downloads});}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,artifactSha256,cases:report.cases.map(({width,error,outcome,errors,external,offlineRequests,popups,downloads})=>({width,error,outcome,errors,external,offlineRequests,popups,downloads}))},null,2));
if(report.cases.some(c=>c.error||!c.outcome?.result||c.errors.length||c.external.length||c.offlineRequests.length||c.popups.length||c.downloads.length||c.outcome?.permissions.length||c.outcome?.overflow>1))process.exitCode=1;
