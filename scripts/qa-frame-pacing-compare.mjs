import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const [beforeUrl,afterUrl]=process.argv.slice(2);
if(!beforeUrl||!afterUrl)throw new Error('Usage: node scripts/qa-frame-pacing-compare.mjs <before-url> <after-url>');
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({headless:true,executablePath});

async function measure(baseUrl,label){
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(`${baseUrl}?renderer=direction-c&quality=full&qa=frame-pacing&view=${label}`,{waitUntil:'networkidle'});
  const close=page.locator('#profileClose');if(await close.isVisible())await close.click();await page.locator('#lab-tab-kick').click();await page.locator('.stage').waitFor({state:'visible'});await page.waitForTimeout(1200);
  const runs=[];for(let run=0;run<3;run++){const values=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last=performance.now();const tick=now=>{samples.push(now-last);last=now;samples.length>=180?resolve(samples):requestAnimationFrame(tick);};requestAnimationFrame(tick);}));const sorted=values.slice(10).sort((a,b)=>a-b);runs.push({avgMs:+(sorted.reduce((sum,value)=>sum+value,0)/sorted.length).toFixed(2),p95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(2),maxMs:+Math.max(...sorted).toFixed(2)});}
  const median=key=>runs.map(run=>run[key]).sort((a,b)=>a-b)[1],result={label,runs,median:{avgMs:median('avgMs'),p95Ms:median('p95Ms'),maxMs:median('maxMs')},errors};await context.close();return result;
}

const before=await measure(beforeUrl,'before'),after=await measure(afterUrl,'after'),p95Delta=+(after.median.p95Ms-before.median.p95Ms).toFixed(2),pass=after.median.p95Ms<=Math.max(20,before.median.p95Ms+2)&&after.errors.length===0;
await browser.close();console.log(JSON.stringify({before,after,p95Delta,pass},null,2));if(!pass)throw new Error(`Frame pacing regressed by ${p95Delta} ms at p95.`);
