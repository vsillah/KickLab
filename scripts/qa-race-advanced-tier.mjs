import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:4173/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-advanced-tier');mkdirSync(out,{recursive:true});
const revision=process.env.KICKLAB_QA_HEAD||'working';
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(Boolean),args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const report={revision,base,viewports:[],errors:[],external:[]};
async function open(width,height,{mastery=false,canvas=false,reduced=false}={}){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
 await context.addInitScript(({mastery,canvas})=>{localStorage.setItem('impactlab.nick','QA Driver');localStorage.setItem('impactlab.v1',JSON.stringify({gfx:canvas?'2d':'3d',raceMastery:{version:1,cleared:mastery?['drag','drift','circuit']:[]},raceGarage:{version:1,body:'street',suspension:'balanced',tires:'balanced',brakes:'standard'}}));},{mastery,canvas});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${width}: ${e.message}`));
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===new URL(base).origin||['blob:','data:'].includes(url.protocol))return route.continue();report.external.push(`${width}: ${url.href}`);return route.abort();});
 const url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('raceTelemetry','prototype');url.searchParams.set('rev',revision);
 await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
 if(!canvas)await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering',{timeout:20000});
 if(await page.locator('#racePreflightClose').isVisible())await page.click('#racePreflightClose');
 if(await page.locator('#raceCoachSetupGarage').isVisible())await page.click('#raceCoachSetupGarage');else if(await page.locator('#racePhoneToolsToggle').isVisible()){if(await page.locator('#racePhoneToolsToggle').getAttribute('aria-expanded')!=='true')await page.click('#racePhoneToolsToggle');await page.click('#raceToolsGarage');}else{await page.click('#settingsToggle');await page.locator('#settingsCategories [data-category="garage"]').click();}
 await page.locator('#raceGarage').waitFor({state:'visible'});return {context,page,url:url.toString()};
}
try{
 for(const [width,height] of [[390,844],[768,1024],[1113,834],[1440,900]].filter(([width])=>!process.env.KICKLAB_QA_WIDTHS||process.env.KICKLAB_QA_WIDTHS.split(',').includes(String(width)))){
  const {context,page,url}=await open(width,height,{mastery:true});
  try{
   const cards=page.locator('.garage-roster-card');if(await cards.count()!==5)throw Error(`Expected 5 cars at ${width}`);
   const chosen=[];
   for(const id of ['vesper','sable']){
    await page.locator(`[data-garage-part="body"][data-garage-value="${id}"]`).click();
    await page.waitForFunction(id=>window.__KICKLAB_RACE_3D__?.status==='rendering'&&window.__KICKLAB_RACE_3D__?.vehicleId===id,id,{timeout:20000});
    const state=await page.evaluate(()=>({scene:window.__KICKLAB_RACE_3D__,garage:window.__KICKLAB_RACE_GARAGE__,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)}));
    if(state.garage.vehicleId!==id||state.scene.vehicleId!==id||state.scene.canvasFallback||state.overflow||state.scene.wheelPivots.length!==4)throw Error(`Bad ${id} at ${width}: ${JSON.stringify(state).slice(0,500)}`);
    const file=join(out,`${id}-garage-${width}.png`);await page.locator('.stage:visible').first().screenshot({path:file});chosen.push({id,mass:state.garage.parameters.m,asset:state.scene.assetUrl,pivots:state.scene.wheelPivots});
   }
   report.viewports.push({width,height,url,chosen});
  }catch(e){report.errors.push(`${width}: ${e.stack||e}`);}finally{await context.close();}
 }
 const locked=await open(390,844);try{const page=locked.page;for(const id of ['vesper','sable']){const card=page.locator(`[data-garage-value="${id}"]`);if(await card.getAttribute('aria-disabled')!=='true'||!await card.innerText().then(t=>t.includes('You steer')))throw Error(`${id} lock unclear`);if(await page.evaluate(()=>window.__KICKLAB_RACE_GARAGE__?.vehicleId)!=='cobalt')throw Error(`${id} lock bypassed`);}report.locked=true;}catch(e){report.errors.push(`locked: ${e.stack||e}`);}finally{await locked.context.close();}
 const fallback=await open(390,844,{mastery:true,canvas:true,reduced:true});try{const page=fallback.page;await page.locator('[data-garage-value="sable"]').click();const state=await page.evaluate(()=>({garage:window.__KICKLAB_RACE_GARAGE__,scene:window.__KICKLAB_RACE_3D__,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)}));if(state.garage.vehicleId!=='sable'||!state.reduced||state.overflow)throw Error(`Canvas mismatch ${JSON.stringify(state).slice(0,700)}`);await page.locator('.stage:visible').first().screenshot({path:join(out,'sable-canvas-reduced-390.png')});report.canvas={vehicle:state.garage.vehicleId,reduced:state.reduced};}catch(e){report.errors.push(`canvas: ${e.stack||e}`);}finally{await fallback.context.close();}
}finally{await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({revision,viewports:report.viewports.map(x=>({width:x.width,cars:x.chosen.map(y=>y.id)})),locked:report.locked,canvas:report.canvas,errors:report.errors,external:report.external},null,2));if(report.errors.length||report.external.length)process.exitCode=1;}
