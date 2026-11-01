// Exact Pages probe of visible Kick activity outcomes; no gameplay state mutation.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[a-f0-9]{40}$/.test(head||'')||execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim()!==head)throw Error('Set KICKLAB_QA_HEAD to exact origin/main product commit');
const base=new URL(process.argv[2]||'http://127.0.0.1:4173/kicklab.html');
if(!['127.0.0.1','localhost'].includes(base.hostname)||base.pathname!=='/kicklab.html')throw Error('Use trusted localhost Pages');
base.searchParams.set('rev',head);
const sha=value=>createHash('sha256').update(value).digest('hex'),artifactSha256=sha(readFileSync('dist/kicklab.html'));
if(sha(Buffer.from(await(await fetch(base)).arrayBuffer()))!==artifactSha256)throw Error('Served HTML differs from build');
const suffix=[process.env.KICKLAB_QA_ACTIVITY||'all',process.env.KICKLAB_QA_OFFLINE==='1'?'offline':'online',process.env.KICKLAB_QA_DENY_STORAGE==='1'?'denied':'storage'].join('-');
const out=resolve('qa-artifacts/public-kick-outcomes',suffix);mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const offline=process.env.KICKLAB_QA_OFFLINE==='1',denyStorage=process.env.KICKLAB_QA_DENY_STORAGE==='1';
const activities=['free','header','run','pass','combo','gk','pso','bar'];
const viewports=[[390,844],[768,1024],[1113,834],[1440,900]];
const report={head,artifactSha256,offline,denyStorage,cases:[],errors:[],external:[],popups:[],downloads:[],permissions:[],offlineRequests:[]};
for(let i=0;i<activities.length;i++){
  const activity=activities[i],[width,height]=viewports[i%viewports.length],label=`${width}-${activity}`;
  if(process.env.KICKLAB_QA_ACTIVITY&&process.env.KICKLAB_QA_ACTIVITY!==activity)continue;
  const context=await browser.newContext({viewport:{width,height},hasTouch:width===390,reducedMotion:i%2?'no-preference':'reduce',permissions:[]});
  await context.addInitScript(({denyStorage})=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'}));window.__qaPermissionAttempts=[];for(const key of ['query'])if(navigator.permissions?.[key]){const fn=navigator.permissions[key].bind(navigator.permissions);navigator.permissions[key]=(...args)=>{window.__qaPermissionAttempts.push(`permissions:${args[0]?.name||'unknown'}`);return fn(...args);};}if(navigator.mediaDevices?.getUserMedia){const fn=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=(...args)=>{window.__qaPermissionAttempts.push('media');return fn(...args);};}for(const key of ['getCurrentPosition','watchPosition'])if(navigator.geolocation?.[key]){const fn=navigator.geolocation[key].bind(navigator.geolocation);navigator.geolocation[key]=(...args)=>{window.__qaPermissionAttempts.push(`geolocation:${key}`);return fn(...args);};}if(denyStorage){const fn=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===localStorage)throw new DOMException('Storage denied','QuotaExceededError');return fn.call(this,key,value);};}}, {denyStorage});
  await context.addInitScript(()=>{window.__qaResultEvents=[];addEventListener('DOMContentLoaded',()=>{const el=document.querySelector('#results');if(!el)return;const record=()=>{if(el.hidden)return;const title=document.querySelector('#rTitle')?.textContent||'';if(title&&window.__qaResultEvents.at(-1)?.title!==title)window.__qaResultEvents.push({title,sub:document.querySelector('#rSub')?.textContent||'',rows:document.querySelector('#rRows')?.innerText||''});};new MutationObserver(record).observe(el,{attributes:true,subtree:true,childList:true});record();});});
  const page=await context.newPage();page.setDefaultTimeout(12000);let offlineActive=false;
  page.on('pageerror',e=>report.errors.push(`${label}: ${e.message}`));
  page.on('request',r=>{if(offlineActive)report.offlineRequests.push(`${label}: ${r.url()}`);if(!r.url().startsWith(base.origin+'/')&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))report.external.push(`${label}: ${r.url()}`);});
  page.on('popup',p=>report.popups.push(`${label}: ${p.url()}`));page.on('download',d=>report.downloads.push(`${label}: ${d.suggestedFilename()}`));
  try{
    await page.goto(base.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    if(offline){offlineActive=true;await context.setOffline(true);}
    await page.locator('#lab-tab-kick').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();
    await page.locator(`#game-${activity}`).click();await page.locator('#freestyleStart').click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    if(activity==='free')for(const [id,value] of [['v','8'],['th','3']]){
      await page.locator(`#var-kick-${id}`).evaluate((node,next)=>{node.value=next;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);
    }
    const initial=await page.evaluate(()=>({activity:document.querySelector('#experienceSelector')?.textContent,actions:[...document.querySelectorAll('button.abtn')].filter(x=>x.getClientRects().length).map(x=>({id:x.dataset.id,label:x.getAttribute('aria-label'),disabled:x.disabled})),overflow:document.documentElement.scrollWidth-innerWidth}));
    await page.screenshot({path:join(out,`${label}-ready.png`)});
    const steps=[];
    for(let step=0;step<10;step++){
      if(await page.locator('#results').isVisible())break;
      const go=page.locator('button.abtn[data-id="go"]:visible:not([disabled])').last();
      if(await go.count())await go.click();else await page.keyboard.press('Space');
      await page.waitForTimeout(1000);
      steps.push(await page.evaluate(()=>({result:!document.querySelector('#results').hidden,primary:[...document.querySelectorAll('button.abtn[data-id="go"]')].filter(x=>x.getClientRects().length).map(x=>({label:x.getAttribute('aria-label'),disabled:x.disabled})),coach:document.querySelector('#coachText')?.textContent||null})));
      if(activity==='run'&&steps.at(-1)?.primary.some(action=>action.label?.startsWith('Next attempt')))break;
    }
    if(activity==='run'&&!await page.evaluate(()=>window.__qaResultEvents.length))await page.waitForFunction(()=>window.__qaResultEvents.length>0,null,{timeout:12000}).catch(()=>{});
    if(activity==='bar'&&!await page.evaluate(()=>window.__qaResultEvents.length))await page.waitForFunction(()=>window.__qaResultEvents.length>0,null,{timeout:65000}).catch(()=>{});
    if((offline||denyStorage)&&!await page.evaluate(()=>window.__qaResultEvents.length))await page.waitForFunction(()=>window.__qaResultEvents.length>0,null,{timeout:30000}).catch(()=>{});
    const outcome=await page.evaluate(()=>{const results=document.querySelector('#results'),next=document.querySelector('#rNext'),b=next?.getBoundingClientRect(),hit=b?document.elementFromPoint(b.right-10,b.top+b.height/2):null,box=id=>document.querySelector(id)?.getBoundingClientRect().toJSON()||null;return{result:!results.hidden,mini:results.classList.contains('mini'),visibleActions:[...results.querySelectorAll('button')].filter(x=>!x.hidden&&x.getClientRects().length&&!x.disabled).map(x=>x.id),title:document.querySelector('#rTitle')?.textContent||'',sub:document.querySelector('#rSub')?.textContent||'',rows:document.querySelector('#rRows')?.innerText||'',observedResults:window.__qaResultEvents,permissions:window.__qaPermissionAttempts,overflow:document.documentElement.scrollWidth-innerWidth,nextHitRight:!!next&&!!hit&&(hit===next||next.contains(hit)),geometry:{results:box('#results'),rail:box('#gameGuidanceHud'),next:box('#rNext'),railZ:getComputedStyle(document.querySelector('#gameGuidanceHud')).zIndex,resultZ:getComputedStyle(results).zIndex,rightEdgeHit:{id:hit?.id||'',className:typeof hit?.className==='string'?hit.className:''}}};});
    report.permissions.push(...outcome.permissions.map(value=>`${label}: ${value}`));
    await page.screenshot({path:join(out,`${label}-outcome.png`)});
    report.cases.push({label,width,height,activity,initial,steps,outcome});
  }catch(e){report.errors.push(`${label}: ${e.stack||e}`);await page.screenshot({path:join(out,`${label}-failure.png`)}).catch(()=>{});}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,artifactSha256,offline,denyStorage,cases:report.cases.map(c=>({label:c.label,result:c.outcome.result,title:c.outcome.title,nextHitRight:c.outcome.nextHitRight,steps:c.steps.length,overflow:c.outcome.overflow})),errors:report.errors,external:report.external,popups:report.popups,downloads:report.downloads,permissions:report.permissions,offlineRequests:report.offlineRequests},null,2));
if(report.errors.length||report.external.length||report.popups.length||report.downloads.length||report.permissions.length||report.offlineRequests.length||report.cases.some(c=>!c.outcome.result||c.outcome.overflow>1||(['pass','gk','pso'].includes(c.activity)!==c.outcome.mini)|| (c.outcome.mini?c.outcome.visibleActions.length>0:!c.outcome.visibleActions.includes('rNext')||!c.outcome.nextHitRight)))process.exitCode=1;
