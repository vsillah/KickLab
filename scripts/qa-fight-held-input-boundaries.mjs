// Fight held Block release on pointer cancellation and pagehide, exact local Pages build.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;if(!/^[a-f0-9]{40}$/.test(head||'')||execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim()!==head)throw Error('Bind to exact product main');
const base=new URL(process.argv[2]||'http://127.0.0.1:4173/kicklab.html');if(!['127.0.0.1','localhost'].includes(base.hostname)||base.pathname!=='/kicklab.html')throw Error('Use trusted localhost Pages');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),artifactSha256=sha(readFileSync('dist/kicklab.html'));if(sha(Buffer.from(await(await fetch(base)).arrayBuffer()))!==artifactSha256)throw Error('Served artifact differs from exact build');
const out=resolve(process.argv[3]||'qa-artifacts/fight-held-input-boundaries');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),report={head,artifactSha256,cases:[],errors:[],external:[],httpErrors:[]};
for(const [width,height] of [[390,844],[1113,834]].filter(([width])=>!process.env.KICKLAB_QA_WIDTH||width===Number(process.env.KICKLAB_QA_WIDTH))){
  const label=`${width}x${height}`,context=await browser.newContext({viewport:{width,height},hasTouch:width===390,reducedMotion:width===390?'reduce':'no-preference',permissions:[]});
  await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'canvas',mute:true,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));page.on('response',response=>{if(response.status()>=400)report.httpErrors.push(`${label}: ${response.status()} ${response.url()}`)});
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(base.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${label}: ${target}`);route.abort()}});
  try{
    const url=new URL(base);url.searchParams.set('rev',head);await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-fight').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    if(await page.locator('#controllerCollapseButton').getAttribute('aria-expanded')==='false')await page.locator('#controllerCollapseButton').click();
    const block=page.locator('button.arm[data-id="block"]:visible:not([disabled])').first();await block.waitFor({state:'visible'});
    const state=()=>page.evaluate(()=>({blocking:!!document.querySelector('button.arm[data-id="block"].on'),paused:!document.querySelector('#gamePacingOverlay').hidden&&document.querySelector('#gamePacingOverlay').dataset.state==='paused',result:!document.querySelector('#results').hidden,overflow:document.documentElement.scrollWidth-innerWidth}));
    if(width===390){
      const cdp=await context.newCDPSession(page),box=await block.boundingBox();if(!box)throw Error('Block button hidden');const x=box.x+box.width/2,y=box.y+box.height/2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1,radiusX:4,radiusY:4,force:1}]});await page.waitForTimeout(100);
      if(!(await state()).blocking)throw Error('Touch Block did not engage');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(100);
      if((await state()).blocking)throw Error('Touch cancellation left Block engaged');
    }else{
      await page.locator('.stage').focus();await page.keyboard.down('ArrowLeft');await page.waitForTimeout(100);if(!(await state()).blocking)throw Error('Keyboard Block did not engage');
      await page.keyboard.up('ArrowLeft');await page.waitForTimeout(100);if((await state()).blocking)throw Error('Keyboard release left Block engaged');
    }
    await page.locator('.stage').focus();await page.keyboard.down('ArrowLeft');await page.waitForTimeout(100);if(!(await state()).blocking)throw Error('Held Block absent before pagehide');
    await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));const hidden=await state();await page.keyboard.up('ArrowLeft');
    if(hidden.blocking||hidden.result||hidden.overflow>1)throw Error(`Pagehide boundary failed: ${JSON.stringify(hidden)}`);
    report.cases.push({label,pointerCancel:width===390,keyboardRelease:width!==390,pagehideReleased:true,overflow:hidden.overflow});await page.screenshot({path:join(out,`${label}-released.png`)});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);await page.screenshot({path:join(out,`${label}-failure.png`)}).catch(()=>{})}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.errors.length||report.external.length||report.httpErrors.length||report.cases.length!==2)process.exitCode=1;
