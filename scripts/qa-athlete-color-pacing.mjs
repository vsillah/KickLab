import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const [beforeUrl,afterUrl,outputArg]=process.argv.slice(2);
if(!beforeUrl||!afterUrl||!outputArg)throw new Error('Pass before URL, after URL, and output JSON path.');
const browser=await chromium.launch({headless:true}),results=[];
async function measure(url,version,width,height,run){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  await context.addInitScript(()=>{localStorage.setItem('impactlab.nick','Pacing QA');localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',kickTime:'night',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`${url}?renderer=direction-c&quality=full&qa=direction-c&pacing=${version}-${width}-${run}`,{waitUntil:'networkidle'});
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-kick').click();await page.waitForFunction(()=>/^ready/.test(window.__KICKLAB_DIRECTION_C__?.status||''),null,{timeout:15000});
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});
  const samples=await page.evaluate(()=>new Promise(resolve=>{let previous=performance.now();const values=[];function frame(now){values.push(now-previous);previous=now;if(values.length<65)requestAnimationFrame(frame);else resolve(values.slice(5));}requestAnimationFrame(frame);}));
  const sorted=samples.sort((a,b)=>a-b),result={version,width,height,run,p50Ms:sorted[30],p95Ms:sorted[Math.floor(sorted.length*.95)],errors};await context.close();return result;
}
try{for(const [width,height] of [[390,844],[768,1024],[1440,900]])for(let run=1;run<=2;run++){
  results.push(await measure(beforeUrl,'before',width,height,run));
  results.push(await measure(afterUrl,'after',width,height,run));
}}finally{await browser.close();}
const deltas=Object.fromEntries([390,768,1440].map(width=>{const pair=version=>results.filter(item=>item.width===width&&item.version===version).map(item=>item.p95Ms).sort((a,b)=>a-b);const before=pair('before'),after=pair('after'),beforeMedian=(before[0]+before[1])/2,afterMedian=(after[0]+after[1])/2;return[width,{beforeP95Ms:beforeMedian,afterP95Ms:afterMedian,deltaMs:afterMedian-beforeMedian}];}));
const pass=results.every(item=>!item.errors.length)&&Object.values(deltas).every(item=>item.deltaMs<=3);
const report={beforeUrl,afterUrl,results,deltas,pass};writeFileSync(resolve(outputArg),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({deltas,pass,output:resolve(outputArg)},null,2));if(!pass)process.exitCode=1;
