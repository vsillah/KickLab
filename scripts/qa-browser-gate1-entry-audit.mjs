// Exact-build, synthetic-profile entry audit. Records sanitized request metadata.
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
const out=resolve(process.argv[3]||'qa-artifacts/browser-gate1-entry-audit');mkdirSync(out,{recursive:true});
const widths=[[360,800],[390,844],[768,1024],[1113,834],[1440,900]],browser=await chromium.launch({headless:true});
const report={head,artifactSha256,cases:[],requests:[],initiators:[],websockets:[],workers:[],errors:[],external:[],popups:[],downloads:[]};
for(const [width,height] of widths)for(const lab of ['home','fight','kick','race']){
  const label=`${lab}-${width}`,context=await browser.newContext({viewport:{width,height},hasTouch:width<=768,reducedMotion:width<=390?'reduce':'no-preference',permissions:[]});
  await context.addInitScript(()=>{
    localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'canvas',mute:true,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));
    localStorage.setItem('impactlab.nick','Gate QA');
    window.__gatePermissionAttempts=[];
    if(navigator.mediaDevices?.getUserMedia)navigator.mediaDevices.getUserMedia=()=>{window.__gatePermissionAttempts.push('getUserMedia');throw Error('Unexpected media request')};
    if(navigator.geolocation?.getCurrentPosition)navigator.geolocation.getCurrentPosition=()=>{window.__gatePermissionAttempts.push('geolocation');throw Error('Unexpected location request')};
    if(navigator.permissions?.query){const query=navigator.permissions.query.bind(navigator.permissions);navigator.permissions.query=descriptor=>{window.__gatePermissionAttempts.push('permissions:'+String(descriptor?.name||'unknown'));return query(descriptor)}}
  });
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('popup',popup=>report.popups.push(`${label}: ${popup.url()}`));page.on('download',download=>report.downloads.push(`${label}: ${download.suggestedFilename()}`));
  page.on('websocket',socket=>report.websockets.push(`${label}: ${new URL(socket.url()).origin}`));page.on('worker',worker=>report.workers.push(`${label}: ${new URL(worker.url()).pathname}`));
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent',event=>{const target=new URL(event.request.url),source=event.initiator?.url;report.initiators.push({case:label,path:target.pathname,type:event.initiator?.type||'unknown',source:source?new URL(source).pathname:null})});
  page.on('request',request=>{const target=new URL(request.url()),same=target.origin===base.origin;report.requests.push({case:label,method:request.method(),origin:target.origin,path:target.pathname,type:request.resourceType(),status:null});if(!same&&!['blob:','data:'].includes(target.protocol))report.external.push(`${label}: ${target.origin}`)});
  page.on('response',response=>{const target=new URL(response.url()),entry=report.requests.findLast(item=>item.case===label&&item.origin===target.origin&&item.path===target.pathname&&item.status===null);if(entry)entry.status=response.status()});
  await page.route('**/*',route=>{const target=new URL(route.request().url());if(target.origin===base.origin||['blob:','data:'].includes(target.protocol))route.continue();else route.abort()});
  try{
    const url=new URL(base);url.searchParams.set('rev',head);await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    if(lab!=='home'){await page.locator(`#lab-tab-${lab}`).click();if(lab==='race')await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});else await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000})}
    const state=await page.evaluate(()=>{
      const visible=node=>!!node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden'&&getComputedStyle(node).display!=='none';
      const unnamed=[...document.querySelectorAll('button,input,select,[role="button"],[role="checkbox"]')].filter(visible).filter(node=>!node.disabled).filter(node=>!(node.getAttribute('aria-label')||node.getAttribute('aria-labelledby')||node.getAttribute('title')||node.textContent?.trim()||node.labels?.[0]?.textContent?.trim())).map(node=>({tag:node.tagName,id:node.id,role:node.getAttribute('role')}));
      const clipped=[...document.querySelectorAll('button')].filter(visible).filter(node=>!node.disabled).map(node=>({node,rect:node.getBoundingClientRect()})).filter(({rect})=>rect.width>0&&rect.height>0&&(rect.left<-1||rect.right>innerWidth+1)).map(({node,rect})=>({id:node.id,left:rect.left,right:rect.right}));
      return{mode:document.documentElement.dataset.kicklabMode||'home',overflow:document.documentElement.scrollWidth-innerWidth,unnamed,clipped,permissionAttempts:window.__gatePermissionAttempts||[]};
    });
    report.cases.push({label,width,height,...state});await page.screenshot({path:join(out,`${label}.png`)});
    if(state.overflow>1||state.unnamed.length||state.permissionAttempts.length)report.errors.push(`${label}: ${JSON.stringify(state)}`);
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);await page.screenshot({path:join(out,`${label}-failure.png`)}).catch(()=>{})}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.length,requests:report.requests.length,initiators:report.initiators.length,errors:report.errors,external:report.external,popups:report.popups,downloads:report.downloads,websockets:report.websockets,workers:report.workers},null,2));
if(report.errors.length||report.external.length||report.popups.length||report.downloads.length||report.websockets.length||report.workers.length)process.exitCode=1;
