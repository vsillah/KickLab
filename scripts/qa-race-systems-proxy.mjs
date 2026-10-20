import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:5850/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-systems-proxy');
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath});
const report={base,head:process.env.KICKLAB_QA_HEAD||null,rows:[],errors:[],external:[],assertions:[]};
const check=(name,pass,observed)=>report.assertions.push({name,pass:!!pass,observed});
async function pageFor(width,height,{flag=true,reducedMotion='no-preference',assetFailure=false}={}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion});
  const page=await context.newPage();page.setDefaultTimeout(9000);
  page.on('pageerror',error=>report.errors.push(`${width}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(assetFailure&&url.endsWith('kicklab-race-vehicle.glb'))route.abort();else if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.external.push(url);route.abort();}});
  const target=new URL(base);if(flag)target.searchParams.set('raceSystems','proxy');target.searchParams.set('qa',String(Date.now()));const url=target.toString();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const toast=page.locator('.toast-close:visible').first();if(await toast.count())await toast.click();
  await page.locator('.stage:visible').first().scrollIntoViewIfNeeded();
  return{context,page,url};
}
async function pacing(page){const frames=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let last=performance.now();function tick(now){frames.push(now-last);last=now;if(frames.length===125)resolve(frames);else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));const sorted=frames.slice(5).sort((a,b)=>a-b);return +sorted[Math.floor(sorted.length*.95)].toFixed(2);}
async function venue(page,id){await page.click('#orientationDetailToggle');await page.click('#settingsToggle');await page.click('#settingsCategories [data-category="venue"]');await page.click(`#settingsChoices [data-setting="venue"][data-value="${id}"]`);await page.click('#settingsClose');await page.waitForFunction(expected=>window.__KICKLAB_RACE_3D__?.trackKey?.startsWith(expected+'/'),id);}
try{
  for(const [name,width,height,motion] of [['desktop',1440,1000,'no-preference'],['mid',1113,988,'no-preference'],['tablet',768,1024,'no-preference'],['phone',390,844,'no-preference'],['phone-reduced',390,844,'reduce']]){
    const {context,page,url}=await pageFor(width,height,{reducedMotion:motion});
    const state=await page.evaluate(()=>({audit:window.__KICKLAB_RACE_3D__,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),stageHeight:document.querySelector('.stage').getBoundingClientRect().height,actions:[...document.querySelectorAll('#padR .abtn')].map(b=>({id:b.dataset.id,visible:!!b.getClientRects().length,rect:b.getBoundingClientRect().toJSON()}))}));
    const p95Ms=await pacing(page);const shot=join(out,`${name}.png`);await page.locator('.stage:visible').first().screenshot({path:shot});
    report.rows.push({name,width,height,url,shot,p95Ms,...state});
    check(`${name} WebGL proxy`,state.audit?.status==='rendering'&&state.audit.vehicleAudit?.ok&&state.audit.canvas,state.audit);
    check(`${name} horizontal overflow`,state.overflow===0,state.overflow);
    check(`${name} frame p95`,p95Ms<=(width<=480?40:33.3),p95Ms);
    check(`${name} stage height`,state.stageHeight/height>=.52,+(state.stageHeight/height).toFixed(3));
    check(`${name} four Race actions are present`,['brake','gas','drift','nitro'].every(id=>state.actions.some(a=>a.id===id&&(width<=480||a.visible))),state.actions.map(a=>a.id+':'+a.visible));
    if(name==='desktop'){
      for(const id of ['marine','forest']){await venue(page,id);const audit=await page.evaluate(()=>window.__KICKLAB_RACE_3D__);const venueShot=join(out,`${id}.png`);await page.locator('.stage:visible').first().screenshot({path:venueShot});report.rows.push({name:id,url,shot:venueShot,audit});check(`${id} structural route`,audit.venue===id&&audit.trackKey.startsWith(id+'/')&&audit.canvas,audit.trackKey);}
      await venue(page,'highland');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});await page.evaluate(()=>document.activeElement?.blur());
      await page.keyboard.down('Space');await page.waitForTimeout(3000);await page.keyboard.down('KeyN');await page.waitForTimeout(800);let telemetry=await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.dynamics);check('nitro hold and drain',telemetry?.boost&&telemetry.nitro<1,telemetry);await page.keyboard.up('KeyN');
      await page.keyboard.down('ShiftLeft');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);telemetry=await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.dynamics);check('Classic drift hold mapping',telemetry?.inputs.drift&&telemetry?.inputs.left,telemetry);await page.keyboard.press('KeyP');await page.waitForTimeout(200);telemetry=await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.dynamics);check('pause releases Race holds',!telemetry?.inputs.gas&&!telemetry?.inputs.drift&&!telemetry?.inputs.nitro,telemetry);await page.keyboard.up('ShiftLeft');await page.keyboard.up('ArrowLeft');await page.keyboard.up('Space');
    }
    if(name==='phone'){
      await page.click('#controllerCollapseButton');check('phone expanded Classic controls',await page.locator('#padR .abtn:visible').count()===4,await page.locator('#padR .abtn:visible').count());await page.click('#analogControlsButton');
      const assists=await page.locator('#raceAnalogActions [data-race-assist]').evaluateAll(els=>els.map(e=>({id:e.dataset.raceAssist,visible:!!e.getClientRects().length,rect:e.getBoundingClientRect().toJSON()})));
      check('phone Analog Drift/Nitro actions',assists.length===2&&assists.every(x=>x.visible),assists);
      const button=page.locator('#raceAnalogActions [data-race-assist="nitro"]');await button.dispatchEvent('pointerdown',{pointerId:2});await page.waitForTimeout(100);let telemetry=await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.dynamics);check('Analog nitro hold',telemetry?.inputs.nitro,telemetry);await button.dispatchEvent('pointercancel',{pointerId:2});await page.waitForTimeout(100);telemetry=await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.dynamics);check('Analog pointer cancel',!telemetry?.inputs.nitro,telemetry);
    }
    await context.close();
  }
  const fallback=await pageFor(1280,720,{assetFailure:true});await fallback.page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='canvas-fallback');const fallbackState=await fallback.page.evaluate(()=>({audit:window.__KICKLAB_RACE_3D__,canvas:!!document.querySelector('#cv')?.getClientRects().length}));check('missing proxy asset keeps Race Canvas',fallbackState.audit?.status==='canvas-fallback'&&!fallbackState.audit.canvas&&fallbackState.canvas,fallbackState);await fallback.page.locator('.stage:visible').first().screenshot({path:join(out,'asset-fallback.png')});await fallback.context.close();
  const {context,page}=await pageFor(1280,720,{flag:false});const off=await page.evaluate(()=>({race:window.__KICKLAB_RACE_3D__||null,canvas:!!document.querySelector('#race3'),drift:!!document.querySelector('#padR [data-id="drift"]'),nitro:!!document.querySelector('#padR [data-id="nitro"]')}));check('default-off compatibility',!off.canvas&&!off.drift&&!off.nitro,off);await context.close();
}finally{await browser.close();}
check('browser errors',report.errors.length===0,report.errors);check('external requests',report.external.length===0,report.external);
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
const failed=report.assertions.filter(item=>!item.pass);console.log(JSON.stringify({head:report.head,rows:report.rows.map(row=>({name:row.name,p95Ms:row.p95Ms,trackKey:row.audit?.trackKey})),failed,errors:report.errors,external:report.external},null,2));if(failed.length)process.exitCode=1;
