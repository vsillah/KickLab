// Exercise every Freestyle Kick family's real result lifecycle. The shared
// result/HUD contract also covers grades that cannot be reproduced reliably.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[a-f0-9]{40}$/.test(head||'')||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==head)throw Error('KICKLAB_QA_HEAD must match HEAD');
const url=new URL(process.argv[2]||'http://127.0.0.1:4173/kicklab.html');
if(!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/kicklab.html')throw Error('Use local built KickLab');
url.searchParams.set('rev',head);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(hash(Buffer.from(await(await fetch(url)).arrayBuffer()))!==hash(readFileSync('dist/kicklab.html')))throw Error('Served HTML differs from exact-head build');
const out=resolve('qa-artifacts/kick-result-clearance',head.slice(0,10));mkdirSync(out,{recursive:true});
const cases=[
  ['free','failure','NO GOAL'],['free','success','TOP BINS!'],
  ['header','failure','MISSED IT'],['header','success','GOAL!'],
  ['run','failure','TACKLED BY RIO'],
  ['pass','failure','CLOSED DOWN'],
  ['combo','failure','TACKLED BY RIO'],
  ['gk','failure','GOAL'],
  ['pso','failure','MISSED'],['pso','success','GOAL!'],
  ['bar','failure','0 POINTS'],['bar','success',null],
];
const report={head,url:url.href,cases:[],errors:[],external:[]};
const browser=await chromium.launch({headless:true});
for(const [activity,intent,expected] of cases){
  const label=`${activity}-${intent}`,context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.addInitScript(()=>{
    localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'}));
    let seed=123456789;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  });
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('request',request=>{const target=request.url();if(!target.startsWith(url.origin+'/')&&!target.startsWith('data:')&&!target.startsWith('blob:'))report.external.push(`${label}: ${target}`)});
  try{
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-kick').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();
    await page.locator(`#game-${activity}`).click();await page.locator('#freestyleStart').click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    if(!await page.locator('#gameGuidanceHud').isVisible())throw Error('guidance absent during active play');
    const go=async()=>{const button=page.locator('button.abtn[data-id="go"]:visible:not([disabled])').last();if(await button.count())await button.click({timeout:5000});else await page.keyboard.press('Space')};
    const change=async(id,value)=>{const input=page.locator(`#var-kick-${id}`);if(await input.count())await input.evaluate((node,v)=>{node.value=v;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}))},String(value))};
    if(activity==='free'){await change('v',intent==='success'?23:8);await change('th',intent==='success'?17:3);await go()}
    if(activity==='header'){await change('thH',8);await go();if(intent==='success'){await page.waitForTimeout(1190);await go()}}
    if(activity==='run'||activity==='combo'||activity==='gk')await go();
    if(activity==='pass'){await page.waitForTimeout(3000);await go()}
    if(activity==='pso'){await go();if(intent==='failure'){await page.keyboard.down('ArrowUp');await page.waitForTimeout(3000);await page.keyboard.up('ArrowUp')}await go()}
    if(activity==='bar'){await go();if(intent==='success')for(let shot=0;shot<4;shot++){await go();await page.waitForTimeout(1800)}}
    await page.locator('#results').waitFor({state:'visible',timeout:activity==='bar'?75000:30000});
    const state=await page.evaluate(()=>{
      const results=document.querySelector('#results'),rail=document.querySelector('#gameGuidanceHud');
      const actions=[...results.querySelectorAll('button')].filter(button=>!button.hidden&&button.getClientRects().length&&!button.disabled).map(button=>{
        const b=button.getBoundingClientRect(),points=[[b.left+b.width/2,b.top+b.height/2],[b.right-10,b.top+b.height/2]];
        return{id:button.id,rect:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},hits:points.map(([x,y])=>{const hit=document.elementFromPoint(x,y);return hit===button||button.contains(hit)})};
      });
      return{title:document.querySelector('#rTitle').textContent.trim(),grade:document.querySelector('#rGrade').textContent.trim(),mini:results.classList.contains('mini'),mode:document.documentElement.dataset.kicklabMode,rail:getComputedStyle(rail).display,actions,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    if(expected&&state.title!==expected)throw Error(`outcome changed: ${JSON.stringify(state)}`);
    if(activity==='bar'&&intent==='success'&&!/^[1-9]\d* POINTS$/.test(state.title))throw Error(`positive score absent: ${state.title}`);
    if(state.mode!=='kick'||state.rail!=='none'||state.overflow>0)throw Error(`result ownership failed: ${JSON.stringify(state)}`);
    if(['pass','gk','pso'].includes(activity)!==state.mini)throw Error(`result lifecycle changed: ${JSON.stringify(state)}`);
    if(state.mini){if(state.actions.length)throw Error(`brief result has actions: ${JSON.stringify(state.actions)}`)}
    else{
      if(!state.actions.some(action=>action.id==='rNext'))throw Error('full result has no Next action');
      for(const action of state.actions)if(action.rect.left<0||action.rect.right>390||action.rect.top<0||action.rect.bottom>844||!action.hits.every(Boolean))throw Error(`obstructed action: ${JSON.stringify(action)}`);
    }
    report.cases.push({label,...state});console.log(`${label}: ${state.title} (${state.mini?'brief':'full'})`);
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);await page.screenshot({path:join(out,`${label}-error.png`)}).catch(()=>{})}
  await context.close();
}
await browser.close();
writeFileSync(join(out,'families-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.length,errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
