import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out=resolve('qa-artifacts/race-material-pixel');mkdirSync(out,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
const page=browser.contexts().flatMap(context=>context.pages()).find(item=>item.url().includes(`rev=${head}`));
if(!page)throw Error(`Exact-head Pixel tab missing: ${head}`);
page.setDefaultTimeout(10000);
const errors=[],external=[],steps=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{const url=new URL(request.url());if(url.origin!=='http://127.0.0.1:4173'&&!['data:','blob:'].includes(url.protocol))external.push(url.href);});
await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:4173'||['data:','blob:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
const audit=()=>page.evaluate(()=>globalThis.__KICKLAB_RACE_3D__||null);
async function step(label,screenshot=true){const state=await audit();steps.push({label,status:state?.status,shadowMode:state?.shadowMode,shadowMap:state?.shadowMap,vehicle:state?.vehicle,canvas:state?.canvas,dynamics:state?.dynamics?{state:state.dynamics.state,x:state.dynamics.x,v:state.dynamics.v}:null});if(screenshot)await page.locator('.stage:visible').first().screenshot({path:join(out,`${label}.png`)});return state;}
try{
  await page.reload({waitUntil:'domcontentloaded'});
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
  await page.locator('#raceCoachSetupStart').waitFor({state:'visible',timeout:20000});
  await page.click('#raceCoachSetupStart');
  await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.dynamics?.state==='run',undefined,{timeout:25000});
  const go=await step('after-go');
  if(go?.status!=='rendering'||!go.vehicle||!go.canvas||go.shadowMode!=='projected-contact'||go.shadowMap)throw Error(`Physical 3D/projected-shadow gate failed: ${JSON.stringify(steps.at(-1))}`);
  await page.keyboard.down('Space');await page.waitForTimeout(2200);await page.keyboard.up('Space');
  const driven=await step('after-drive');if(driven?.dynamics?.x<=go.dynamics.x+1)throw Error(`Physical driving did not advance: ${go.dynamics.x} -> ${driven?.dynamics?.x}`);
  const frameTimes=await page.evaluate(()=>new Promise(resolve=>{const values=[];let last=0;function tick(now){if(last)values.push(now-last);last=now;if(values.length<180)requestAnimationFrame(tick);else resolve(values);}requestAnimationFrame(tick);}));
  const sorted=frameTimes.slice(10).sort((a,b)=>a-b),performance={medianMs:+sorted[Math.floor(sorted.length*.5)].toFixed(2),p95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(2),worstMs:+sorted.at(-1).toFixed(2)};
  await page.keyboard.press('p');await page.locator('#gamePacingOverlay').waitFor({state:'visible',timeout:5000});await step('paused',false);
  await page.keyboard.press('p');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:5000});const resumed=await step('resumed',false);if(resumed?.status!=='rendering'||!resumed.vehicle)throw Error('Physical resume lost 3D renderer');
  writeFileSync(join(out,'report.json'),JSON.stringify({head,url:page.url(),steps,performance,errors,external},null,2)+'\n');
  console.log(JSON.stringify({head,steps,performance,errors,external},null,2));
  if(errors.length||external.length)process.exitCode=1;
}catch(error){errors.push(error.stack||String(error));writeFileSync(join(out,'report.json'),JSON.stringify({head,url:page.url(),steps,errors,external},null,2)+'\n');console.error(JSON.stringify({head,steps,errors,external},null,2));process.exitCode=1;
}finally{await browser.close();}
