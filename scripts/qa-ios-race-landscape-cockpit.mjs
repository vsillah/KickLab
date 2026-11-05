import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||new URL('../dist/mobile/index.html',import.meta.url).href;
const out=resolve(process.argv[3]||'qa-artifacts/ios-race-landscape-cockpit');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const htmlSha256=hash(readFileSync('dist/mobile/index.html'));
if(base.startsWith('file:')){if(hash(readFileSync(new URL(base)))!==htmlSha256)throw Error('Opened mobile HTML differs from this build');}
else if(hash(Buffer.from(await(await fetch(base)).arrayBuffer()))!==htmlSha256)throw Error('Served mobile HTML differs from this build');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const sizes=[[812,375],[844,390],[932,430],[390,844],[768,1024],[1024,768],[1440,900]];
const report={htmlSha256,cases:[],errors:[],external:[]};
const measure=page=>page.evaluate(()=>{
  const rect=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,visible:!!e.getClientRects().length}:null};
  const $=s=>document.querySelector(s),hit=e=>{const r=e.getBoundingClientRect(),found=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return found===e||e.contains(found)};
  const gas=$('#padR [data-id="gas"]'),brake=$('#padR [data-id="brake"]'),left=$('#padL .arm.left'),right=$('#padL .arm.right');
  return{viewport:[innerWidth,innerHeight],phase:document.documentElement.dataset.racePhase,stage:rect($('.game-frame .stage')),gas:rect(gas),brake:rect(brake),left:rect(left),right:rect(right),hits:{gas:hit(gas),brake:hit(brake),left:hit(left),right:hit(right)},names:[gas,brake,left,right].map(e=>e.getAttribute('aria-label')||e.textContent.trim()),disabled:[gas,brake,left,right].map(e=>e.disabled),overflow:document.documentElement.scrollWidth-innerWidth};
});
async function enter(page){
  await page.goto(`${base}?rev=ios-race-landscape`,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  await page.locator('#padR [data-id="gas"]').click();
  await page.waitForFunction(()=>document.documentElement.dataset.racePhase==='count',null,{timeout:5000});
  await page.waitForFunction(()=>document.documentElement.dataset.racePhase==='run',null,{timeout:10000});
  await page.waitForTimeout(120);
}
try{
  for(const [width,height] of sizes){
    if(process.env.KICKLAB_QA_WIDTH&&Number(process.env.KICKLAB_QA_WIDTH)!==width)continue;
    const label=`${width}x${height}`;
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',hasTouch:width<=932,...(width===812?{recordVideo:{dir:out,size:{width,height}}}:{})});
    await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d'}));localStorage.setItem('impactlab.nick','QA Player');});
    const page=await context.newPage();
    page.setDefaultTimeout(8000);
    console.log(`Starting ${label}`);
    page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
    await page.route('**/*',route=>{const url=route.request().url();if(base.startsWith('file:')&&url.startsWith('file:')||url.startsWith('data:')||url.startsWith('blob:')||base.startsWith('http')&&url.startsWith(new URL(base).origin))return route.continue();report.external.push(`${label}: ${url}`);route.abort();});
    try{
      await enter(page);
      console.log(`Live ${label}`);
      const live=await measure(page);
      if(width>height&&height<=520){
        for(const key of ['gas','brake','left','right']){const r=live[key];if(!r.visible||r.x<0||r.y<0||r.right>width||r.bottom>height-3||!live.hits[key])throw Error(`${key} clipped or covered: ${JSON.stringify(live)}`);}
        if(live.stage.bottom>height+1||live.stage.top<0)throw Error(`Stage outside landscape viewport: ${JSON.stringify(live)}`);
      }
      if(live.phase!=='run'||live.disabled.some(Boolean)||live.overflow>1||!live.names.every(Boolean))throw Error(`Live controls contract: ${JSON.stringify(live)}`);
      await page.screenshot({path:join(out,`${label}-live.png`)});
      if(width===812){
        console.log('Exercising controls and pause');
        await page.locator('#padR [data-id="gas"]').click();
        await page.locator('#padL .arm.left').click();
        await page.locator('#padR [data-id="brake"]').click();
        await page.locator('#cv').click({position:{x:width/2,y:height/3}});
        await page.locator('#gamePacingResume').waitFor({state:'visible',timeout:3000});
        const pause=await page.evaluate(()=>{const r=document.querySelector('#gamePacingResume').getBoundingClientRect(),e=document.querySelector('#gamePacingSaveExit').getBoundingClientRect();return{phase:document.querySelector('#gamePacingOverlay').dataset.state,resume:{y:r.y,bottom:r.bottom,height:r.height},exit:{y:e.y,bottom:e.bottom,height:e.height}};});
        if(pause.phase!=='paused'||pause.resume.y<0||pause.exit.bottom>height||pause.resume.height<44||pause.exit.height<44)throw Error(`Pause controls clipped: ${JSON.stringify(pause)}`);
        await page.screenshot({path:join(out,`${label}-paused.png`)});
        await page.locator('#gamePacingResume').click();
        console.log('Resumed; rotating');
        await page.waitForFunction(()=>document.querySelector('#gamePacingOverlay').hidden,null,{timeout:3000});
        await page.setViewportSize({width:375,height:812});
        await page.waitForTimeout(250);
        const rotated=await measure(page);if(rotated.phase!=='run'||rotated.overflow>1)throw Error(`Rotation changed Race state: ${JSON.stringify(rotated)}`);
        await page.screenshot({path:join(out,'375x812-rotated.png')});
        await page.setViewportSize({width,height});
        await page.waitForTimeout(250);
        const returned=await measure(page);if(returned.phase!=='run'||returned.gas.bottom>height-3||!returned.hits.gas)throw Error(`Landscape return clipped Gas: ${JSON.stringify(returned)}`);
        await page.reload({waitUntil:'domcontentloaded'});
        console.log('Relaunched');
        await page.waitForTimeout(150);
        const relaunched=await page.evaluate(()=>({mode:document.documentElement.dataset.kicklabMode,phase:document.documentElement.dataset.racePhase,stored:!!localStorage.getItem('impactlab.v1')}));
        if(!relaunched.stored||relaunched.phase==='run')throw Error(`Relaunch resumed active run: ${JSON.stringify(relaunched)}`);
        report.cases.push({label,live,pause,rotated,returned,relaunched});
      }else report.cases.push({label,live});
    }catch(error){report.errors.push(`${label}: ${error.message}`);}finally{await context.close();if(width===812&&page.video())await page.video().saveAs(join(out,'812x375-walkthrough.webm'));}
  }
}finally{await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({htmlSha256,cases:report.cases.map(c=>c.label),errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
