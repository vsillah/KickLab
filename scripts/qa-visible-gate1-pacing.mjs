// Stable headed-browser frame pacing on the exact local Pages artifact.
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
const out=resolve(process.argv[3]||'qa-artifacts/visible-gate1-pacing');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:false});
const report={head,artifactSha256,browserVersion:browser.version(),thresholdMs:50,cases:[],errors:[],external:[],httpErrors:[]};
const cases=[...[[360,800],[390,844],[768,1024],[1113,834],[1440,900]].map(([width,height])=>({lab:'kick',width,height})),{lab:'fight',width:390,height:844},{lab:'race',width:390,height:844}].filter(({lab,width})=>(!process.env.KICKLAB_QA_LAB||lab===process.env.KICKLAB_QA_LAB)&&(!process.env.KICKLAB_QA_WIDTH||width===Number(process.env.KICKLAB_QA_WIDTH)));
for(const test of cases){
  const {lab,width,height}=test,label=`${lab}-${width}x${height}`;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',permissions:[]});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d',mute:true})));
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('response',response=>{if(response.status()>=400)report.httpErrors.push(`${label}: ${response.status()} ${response.url()}`)});
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(base.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${label}: ${target}`);route.abort()}});
  try{
    const url=new URL(base);url.searchParams.set('rev',head);
    if(lab==='race')for(const flag of ['raceExpansion','racePreflight','raceTelemetry'])url.searchParams.set(flag,'prototype');
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator(`#lab-tab-${lab}`).click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    if(lab==='race'){
      await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
      await page.locator('[data-preflight-venue="highland"]').click();
      for(let step=0;step<4;step++)await page.locator('#racePreflightNext').click();
      await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
      const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
      await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().phase==='run',null,{timeout:30000});
    }
    await page.bringToFront();
    await page.waitForTimeout(500);
    const marker=()=>page.evaluate(()=>({visibility:document.visibilityState,lab:document.documentElement.dataset.kicklabMode,resultHidden:document.querySelector('#results').hidden,overlayHidden:document.querySelector('#gamePacingOverlay').hidden,racePhase:window.__KICKLAB_RACE_MODES_QA__?.state().phase||null,overflow:document.documentElement.scrollWidth-innerWidth}));
    const runs=[];
    for(let attempt=0;attempt<6&&runs.filter(run=>run.valid).length<3;attempt++){
      const before=await marker();
      const samples=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let last=performance.now();function tick(now){frames.push(now-last);last=now;if(frames.length<180)requestAnimationFrame(tick);else resolve(frames)}requestAnimationFrame(tick)}));
      const after=await marker();
      if(before.visibility!=='visible'||after.visibility!=='visible'||before.lab!==lab||after.lab!==lab||!before.resultHidden||!after.resultHidden||!before.overlayHidden||!after.overlayHidden||before.racePhase!==after.racePhase||before.overflow>1||after.overflow>1){runs.push({valid:false,before,after});continue}
      const sorted=samples.slice(10).sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)];
      runs.push({valid:true,p95Ms:+p95.toFixed(2),medianMs:+sorted[Math.floor(sorted.length*.5)].toFixed(2),maxMs:+sorted.at(-1).toFixed(2),before,after});
    }
    const valid=runs.filter(run=>run.valid);if(valid.length!==3)throw Error(`Only ${valid.length} stable visible runs: ${JSON.stringify(runs)}`);
    const medianP95=valid.map(run=>run.p95Ms).sort((a,b)=>a-b)[1];
    const result={label,medianP95Ms:medianP95,runs,pass:medianP95<=report.thresholdMs};
    report.cases.push(result);
    await page.locator('.stage:visible').first().screenshot({path:join(out,`${label}.png`)});
    console.log(`${label}: ${medianP95.toFixed(2)} ms p95 ${result.pass?'PASS':'FAIL'}`);
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`)}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,artifactSha256,browserVersion:report.browserVersion,thresholdMs:report.thresholdMs,cases:report.cases.map(({label,medianP95Ms,pass})=>({label,medianP95Ms,pass})),errors:report.errors,external:report.external,httpErrors:report.httpErrors},null,2));
if(report.errors.length||report.external.length||report.httpErrors.length||report.cases.length!==cases.length||report.cases.some(item=>!item.pass))process.exitCode=1;
