import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2],revision=process.argv[3]||'working-tree',out=resolve(process.argv[4]||'qa-artifacts/kick-daylight');
if(!base||!/^http:\/\/127\.0\.0\.1:\d+\/kicklab\.html$/.test(base))throw new Error('Pass localhost kicklab.html URL.');
mkdirSync(out,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({headless:true,executablePath});
const report={revision,base,checks:[],errors:[],external:[]};
const origin=new URL(base).origin;
const widths=[[360,780],[390,844],[768,1024],[1113,900],[1440,900]];
async function choose(page,category,value){
  await page.locator('#orientationDetailToggle').click();
  await page.locator('#settingsToggle').click();
  await page.locator(`#settingsCategories [data-category="${category}"]`).click();
  await page.locator(`#settingsChoices [data-setting="${category}"][data-value="${value}"]`).click();
  await page.locator('#settingsClose').click();
}
async function scene(width,height,graphics='3d',motion='no-preference'){
  const label=`${width}x${height}-${graphics}-${motion}`;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:motion});
  await context.addInitScript(({graphics})=>{localStorage.setItem('impactlab.nick','Daylight QA');localStorage.setItem('impactlab.v1',JSON.stringify({kickTime:'day',gfx:graphics,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));},{graphics});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${label}: ${e}`));page.on('console',m=>{if(m.type()==='error')report.errors.push(`${label}: ${m.text()}`);});page.on('request',r=>{if(new URL(r.url()).origin!==origin)report.external.push(`${label}: ${r.url()}`);});
  const url=new URL(base);url.searchParams.set('rev',revision);url.searchParams.set('scene',label);
  const response=await page.goto(url.href,{waitUntil:'networkidle'});if(!response?.ok())throw new Error(`${label}: HTTP ${response?.status()}`);
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.getByRole('button',{name:/^Kick .*Enter Kick$/}).click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});
  for(const shot of ['free','dribble']){
    if(shot==='dribble')await choose(page,'shot','dribble');
    for(const time of ['day','dusk','night']){
      if(time!=='day'||shot==='dribble')await choose(page,'time',time);
      await page.waitForTimeout(400);
      const audit=await page.evaluate(()=>({lighting:window.__KICKLAB_LIGHTING_AUDIT__||null,fallback:window.__KICKLAB_FALLBACK_ENV__||null,stage:document.querySelector('.stage')?.getBoundingClientRect().toJSON(),canvas3:getComputedStyle(document.querySelector('#cv3')||document.querySelector('#cv')).display,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,context:document.querySelector('#environmentContextLabel')?.textContent||'',reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}));
      if(graphics==='3d'&&audit.lighting?.time!==time)throw new Error(`${label} ${shot} ${time}: 3D lighting missing`);
      if(graphics==='2d'&&audit.fallback?.time!==time)throw new Error(`${label} ${shot} ${time}: Canvas palette missing`);
      if(!audit.context.includes(time[0].toUpperCase()+time.slice(1)))throw new Error(`${label} ${shot} ${time}: context missing time`);
      await page.locator('.stage').scrollIntoViewIfNeeded();const file=join(out,`${label}-${shot}-${time}.png`);await page.screenshot({path:file});
      report.checks.push({label,shot,time,file,audit});
    }
  }
  await context.close();
}
try{
  for(const [width,height] of widths)await scene(width,height);
  await scene(390,844,'2d');
  await scene(390,844,'3d','reduce');
}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
if(report.errors.length||report.external.length)throw new Error(JSON.stringify({errors:report.errors,external:report.external}));
console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,external:report.external,report:join(out,'report.json')},null,2));
