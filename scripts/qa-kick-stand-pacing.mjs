import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';

const {chromium}=createRequire(import.meta.url)('playwright');
const [beforeUrl,afterUrl,output]=process.argv.slice(2);
if(!beforeUrl||!afterUrl||!output)throw new Error('Usage: node scripts/qa-kick-stand-pacing.mjs <before-url> <after-url> <output.json>');
const browser=await chromium.launch({headless:true});
const results=[];
for(const [name,url] of [['before',beforeUrl],['after',afterUrl]])for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},deviceScaleFactor:1});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({kickTime:'night',gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(url,{waitUntil:'networkidle'});
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.getByRole('button',{name:/^Kick .*Enter Kick$/}).click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});
  const runs=[];
  for(let i=0;i<2;i++)runs.push(await page.evaluate(()=>new Promise(resolve=>{
    const samples=[];let previous=performance.now();
    function frame(now){samples.push(now-previous);previous=now;if(samples.length<55)requestAnimationFrame(frame);else{const values=samples.slice(5).sort((a,b)=>a-b);resolve({samples:values.length,p50:values[25],p95:values[Math.floor(values.length*.95)],max:values.at(-1)});}}
    requestAnimationFrame(frame);
  })));
  results.push({name,width,runs,errors});await context.close();
}
await browser.close();
const pair=width=>results.filter(item=>item.width===width).map(item=>Math.max(...item.runs.map(run=>run.p95)));
const deltas=Object.fromEntries([390,1440].map(width=>{const [before,after]=pair(width);return[width,{before,after,delta:after-before}];}));
const report={results,deltas,pass:Object.values(deltas).every(item=>item.delta<=2)&&results.every(item=>!item.errors.length)};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({deltas,pass:report.pass,output},null,2));
if(!report.pass)process.exitCode=1;
