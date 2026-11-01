// Real 3D Free Kick goal and miss across Gate 1 widths and input modalities.
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
const out=resolve(process.argv[3]||'qa-artifacts/kick-3d-free-widths');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),report={head,artifactSha256,cases:[],requests:[],initiators:[],errors:[],external:[],popups:[],downloads:[]};
for(const [width,height,input] of [[360,800,'touch'],[390,844,'touch'],[768,1024,'touch'],[1113,834,'pointer'],[1440,900,'keyboard']])for(const outcome of ['miss','goal']){
  if(process.env.KICKLAB_QA_CASE&&`${width}-${input}-${outcome}`!==process.env.KICKLAB_QA_CASE)continue;
  const label=`${width}-${input}-${outcome}`,context=await browser.newContext({viewport:{width,height},hasTouch:input==='touch',reducedMotion:width<=390?'reduce':'no-preference',permissions:[]});
  await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',mute:true}));let seed=123456789;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);window.__gatePermissionAttempts=[];if(navigator.mediaDevices?.getUserMedia)navigator.mediaDevices.getUserMedia=()=>{window.__gatePermissionAttempts.push('camera');throw Error('Unexpected camera request')}}); 
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));page.on('popup',popup=>report.popups.push(`${label}: ${popup.url()}`));page.on('download',download=>report.downloads.push(`${label}: ${download.suggestedFilename()}`));
  page.on('request',request=>{const target=new URL(request.url());report.requests.push({case:label,method:request.method(),origin:target.origin,path:target.pathname,type:request.resourceType(),status:null});if(target.origin!==base.origin&&!['blob:','data:'].includes(target.protocol))report.external.push(`${label}: ${target.origin}`)});
  page.on('response',response=>{const target=new URL(response.url()),entry=report.requests.findLast(item=>item.case===label&&item.origin===target.origin&&item.path===target.pathname&&item.status===null);if(entry)entry.status=response.status()});
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');cdp.on('Network.requestWillBeSent',event=>{const target=new URL(event.request.url),source=event.initiator?.url;report.initiators.push({case:label,path:target.pathname,type:event.initiator?.type||'unknown',source:source?new URL(source).pathname:null})});
  await page.route('**/*',route=>{const target=new URL(route.request().url());if(target.origin===base.origin||['blob:','data:'].includes(target.protocol))route.continue();else route.abort()});
  try{
    const url=new URL(base);url.searchParams.set('rev',head);await page.goto(url.href,{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-kick').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();await page.locator('#game-free').click();await page.locator('#freestyleStart').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    for(const [id,value] of [['v',outcome==='goal'?23:8],['th',outcome==='goal'?17:3]])await page.locator(`#var-kick-${id}`).evaluate((node,v)=>{node.value=v;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}))},String(value));
    const kick=page.getByRole('button',{name:'Kick (Space)'});if(!await kick.isVisible())await page.locator('#controllerCollapseButton').click();if(input==='touch')await kick.tap();else if(input==='pointer')await kick.click();else {await kick.focus();await page.keyboard.press('Space')}
    await page.locator('#results').waitFor({state:'visible',timeout:30000});await page.waitForTimeout(650);
    const state=await page.evaluate(()=>{const next=document.querySelector('#rNext'),rect=next?.getBoundingClientRect();return{title:document.querySelector('#rTitle')?.textContent?.trim(),mode:document.documentElement.dataset.kicklabMode,overflow:document.documentElement.scrollWidth-innerWidth,next:rect?{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}:null,permissions:window.__gatePermissionAttempts||[]}});
    if(state.title!==(outcome==='goal'?'TOP BINS!':'NO GOAL')||state.mode!=='kick'||state.overflow>1||state.permissions.length||!state.next||state.next.left<0||state.next.right>width)throw Error(`Kick result contract: ${JSON.stringify(state)}`);
    report.cases.push({label,width,height,input,outcome,...state});await page.screenshot({path:join(out,`${label}.png`)});
  }catch(error){const detail=`${label}: ${error.stack||error}`;report.errors.push(detail);console.error(detail);await page.screenshot({path:join(out,`${label}-failure.png`)}).catch(()=>{})}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.length,requests:report.requests.length,errors:report.errors,external:report.external,popups:report.popups,downloads:report.downloads},null,2));
if(report.cases.length!==(process.env.KICKLAB_QA_CASE?1:10)||report.errors.length||report.external.length||report.popups.length||report.downloads.length)process.exitCode=1;
