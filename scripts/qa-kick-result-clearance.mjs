// Rendered Kick Combo result clearance at five viewports. No game-state fixture.
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
const viewports=[[360,800],[390,844],[768,1024],[1113,834],[1440,900]];
const cases=viewports.map(([width,height],view)=>({width,height,input:view<3?'touch':view===4?'keyboard':'pointer',reduced:view%2===0}));
const browser=await chromium.launch({headless:true});
const report={head,url:url.href,cases:[],errors:[],external:[]};
const assert=(value,message)=>{if(!value)throw Error(message)};
const snapshot=page=>page.evaluate(()=>{
  const rail=document.querySelector('#gameGuidanceHud'),results=document.querySelector('#results');
  const actions=[...results.querySelectorAll('button')].filter(button=>!button.hidden&&button.getClientRects().length&&!button.disabled).map(button=>{
    const b=button.getBoundingClientRect(),points=[[b.left+b.width/2,b.top+b.height/2],[b.right-10,b.top+b.height/2]];
    return{id:button.id,rect:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},hits:points.map(([x,y])=>{const hit=document.elementFromPoint(x,y);return hit===button||button.contains(hit)})};
  });
  return{result:!results.hidden,title:document.querySelector('#rTitle').textContent,railVisible:getComputedStyle(rail).display!=='none',actions,overflow:document.documentElement.scrollWidth-innerWidth};
});
for(const testCase of cases.filter(c=>!process.env.KICKLAB_QA_WIDTH||c.width===Number(process.env.KICKLAB_QA_WIDTH))){
  const {width,height,input,reduced}=testCase,label=`combo-${width}x${height}-${input}${reduced?'-reduced':''}`;
  const context=await browser.newContext({viewport:{width,height},hasTouch:input==='touch',reducedMotion:reduced?'reduce':'no-preference'});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('request',request=>{const target=request.url();if(!target.startsWith(url.origin+'/')&&!target.startsWith('data:')&&!target.startsWith('blob:'))report.external.push(`${label}: ${target}`)});
  try{
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-kick').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();
    await page.locator('#game-combo').click();await page.locator('#freestyleStart').click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    assert(await page.locator('#gameGuidanceHud').isVisible(),`${label}: guidance missing during active play`);
    for(let step=0;step<12&&!await page.locator('#results').isVisible();step++){
      const go=page.locator('button.abtn[data-id="go"]:visible:not([disabled])').last();
      if(await go.count())await go.click();else await page.keyboard.press('Space');
      await page.waitForTimeout(1000);
    }
    await page.locator('#results').waitFor({state:'visible',timeout:15000});
    const result=await snapshot(page);assert(result.result&&!result.railVisible&&!result.overflow,`${label}: result or guidance state ${JSON.stringify(result)}`);
    assert(result.actions.some(action=>action.id==='rNext'),`${label}: Next round absent`);
    for(const action of result.actions)assert(action.rect.left>=0&&action.rect.right<=width&&action.rect.top>=0&&action.rect.bottom<=height&&action.hits.every(Boolean),`${label}: ${action.id} obstructed ${JSON.stringify(action)}`);
    if(width===390)await page.screenshot({path:join(out,'combo-390-result.png')});
    if(width===390){
      await page.locator('#rReview').click();await page.locator('#rvBack').waitFor({state:'visible'});
      await page.locator('#rvClose').click();await page.locator('#rvBack').waitFor({state:'hidden'});
      assert(await page.locator('#gameGuidanceHud').isVisible(),`${label}: guidance did not return after Coach review`);
    }else if(width===768){
      await page.locator('#rReplay').click();await page.locator('#rbar').waitFor({state:'visible'});
      await page.locator('#rbExit').click();await page.locator('#rbar').waitFor({state:'hidden'});
      assert(await page.locator('#gameGuidanceHud').isVisible(),`${label}: guidance did not return after Replay`);
    }else{
      const box=await page.locator('#rNext').boundingBox();assert(!!box,`${label}: Next round has no box`);
      if(input==='keyboard'){await page.locator('#rNext').focus();await page.keyboard.press('Enter')}
      else if(input==='touch')await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
      else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
      await page.locator('#results').waitFor({state:'hidden'});
      assert(await page.locator('#gameGuidanceHud').isVisible(),`${label}: guidance did not return after Next round`);
    }
    report.cases.push({label,title:result.title,actions:result.actions.map(action=>action.id),overflow:result.overflow});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);await page.screenshot({path:join(out,`${label}-error.png`)}).catch(()=>{});}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.length,errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
