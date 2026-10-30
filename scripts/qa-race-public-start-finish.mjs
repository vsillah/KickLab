import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {enterHighlandRace,finishHighlandDrag} from './qa-race-public-journey.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=new URL(process.argv[2]||'https://vsillah.github.io/KickLab/');
const out=resolve(process.argv[3]||'qa-artifacts/race-start-finish');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the exact product commit');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=sha(readFileSync('dist/pages/index.html'));
const response=await fetch(new URL(`?rev=${head}`,base));
if(!response.ok||sha(Buffer.from(await response.arrayBuffer()))!==expected)throw Error('Served Pages HTML does not match the exact build');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
const report={head,artifactSha256:expected,cases:[],errors:[],external:[],httpErrors:[]};
const sizes=[[360,780],[390,844],[768,1024],[942,958],[1113,834],[1440,900]].filter(([width])=>!process.env.KICKLAB_QA_WIDTHS||process.env.KICKLAB_QA_WIDTHS.split(',').includes(String(width)));
for(const [width,height] of sizes){
  const label=`${width}x${height}`,context=await browser.newContext({viewport:{width,height},reducedMotion:width===390?'reduce':'no-preference'}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('response',res=>{if(res.status()>=400)report.httpErrors.push(`${label}: ${res.status()} ${res.url()}`)});
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base.origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.external.push(`${label}: ${url}`);route.abort()}});
  try{
    const url=new URL(base);url.searchParams.set('rev',head);for(const flag of ['raceExpansion','raceCornerTrace','raceTelemetry','racePreflight'])url.searchParams.set(flag,'prototype');
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    await enterHighlandRace(page,{beforeCommit:async()=>page.evaluate(()=>{
      window.__gateLights=[];window.__gateLightPhase='';window.__gateLightTimer=setInterval(()=>{
        const state=window.__KICKLAB_RACE_MODES_QA__?.state(),lights=window.__KICKLAB_RACE_START_LIGHTS__;
        if(state?.phase==='count'&&lights?.phase!==window.__gateLightPhase){window.__gateLightPhase=lights.phase;window.__gateLights.push({phase:lights.phase,lit:lights.lit,visibleBulbs:lights.visibleBulbs,x:state.x,speedKmh:state.speedKmh});}
      },10);
    })});
    await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().phase==='run',null,{timeout:10000});
    const lights=await page.evaluate(()=>{clearInterval(window.__gateLightTimer);return{observed:window.__gateLights,go:window.__KICKLAB_RACE_START_LIGHTS__}});
    const phases=lights.observed.map(item=>item.phase);
    if(!['red','yellow','green'].every((phase,index)=>phases[index]===phase)||lights.observed.some((item,index)=>item.lit!==1||item.speedKmh>0.01||Math.abs(item.x-4)>0.01)||lights.go.phase!=='go'||lights.go.lit!==0||lights.go.visibleBulbs!==0)throw Error(`Countdown lamps or blocked input: ${JSON.stringify(lights)}`);
    const map=await page.evaluate(()=>({nav:window.__KICKLAB_RACE_NAVIGATION__,finish:window.__KICKLAB_RACE_3D__?.finish,overflow:document.documentElement.scrollWidth-innerWidth}));
    if(!map.nav?.visible||!map.nav.finishVisible||!map.finish?.canonical||JSON.stringify(map.finish.canonical)!==JSON.stringify(map.finish.world)||JSON.stringify(map.finish.world)!==JSON.stringify(map.nav.finish)||map.overflow>1)throw Error(`Live map/finish mismatch: ${JSON.stringify(map)}`);
    await page.locator('.stage').screenshot({path:join(out,`${label}-live.png`)});
    const run=await finishHighlandDrag(page);
    const result=await page.evaluate(()=>({visible:!document.querySelector('#results').hidden,title:document.querySelector('#rTitle').textContent,overflow:document.documentElement.scrollWidth-innerWidth}));
    if(!result.visible||!result.title.includes('COMPLETE')||result.overflow>1||run.final.x<map.finish.canonical.x)throw Error(`Finish/result mismatch: ${JSON.stringify({result,run})}`);
    report.cases.push({label,phases:lights.observed,go:lights.go.phase,finish:map.finish.canonical,result,shifted:run.shifted});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.map(({label,go,result})=>({label,go,result})),errors:report.errors,external:report.external,httpErrors:report.httpErrors},null,2));
if(report.errors.length||report.external.length||report.httpErrors.length||report.cases.length!==sizes.length)process.exitCode=1;
