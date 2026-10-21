import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const proxyBase=process.argv[2]||'http://127.0.0.1:5856/kicklab.html',directionABase=process.argv[3],out=resolve(process.argv[4]||'qa-artifacts/race-telemetry/steering');mkdirSync(out,{recursive:true});
const bases=[['proxy',proxyBase],...(directionABase?[['direction-a',directionABase]]:[])];
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
const rows=[],errors=[],external=[];
for(const [build,base] of bases)for(const [viewport,width,height] of [['phone',390,844],['desktop',1440,1000]])for(const method of ['classic','keyboard','analog','touch'])for(const direction of ['right','left']){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:method==='touch',isMobile:method==='touch'}),page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(`${build}/${viewport}/${method}/${direction}: ${e.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();external.push(url);route.abort();});
  try{
    const url=new URL(base);url.searchParams.set('raceTelemetry','prototype');url.searchParams.set('rev',process.env.KICKLAB_QA_HEAD||'qa');
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();const toast=page.locator('.toast-close:visible').first();if(await toast.count())await toast.evaluate(button=>button.click());if(width<=480)await page.click('#controllerCollapseButton');
    if(method==='analog')await page.click('#analogControlsButton');await page.locator('.stage:visible').first().scrollIntoViewIfNeeded();await page.evaluate(()=>document.activeElement?.blur());
    await page.keyboard.down('Space');await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run'&&window.__KICKLAB_RACE_3D__?.dynamics?.v>5,null,{timeout:10000});
    const before=await page.evaluate(()=>({world:window.__KICKLAB_RACE_3D__.dynamics,camera:window.__KICKLAB_RACE_3D__.camera,composition:window.__KICKLAB_RACE_3D__.composition}));
    if(method==='classic')await page.locator(`#pad button[aria-label="Steer ${direction}"]`).dispatchEvent('pointerdown',{pointerId:22,pointerType:'mouse',button:0});
    else if(method==='keyboard')await page.keyboard.down(direction==='right'?'ArrowRight':'ArrowLeft');
    else if(method==='analog'){const box=await page.locator('#analogStick').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*(direction==='right'?.72:.28),box.y+box.height*.32);}
    else{const box=await page.locator(`#pad button[aria-label="Steer ${direction}"]`).boundingBox(),cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});}
    await page.waitForTimeout(360);const after=await page.evaluate(()=>({world:window.__KICKLAB_RACE_3D__.dynamics,camera:window.__KICKLAB_RACE_3D__.camera,composition:window.__KICKLAB_RACE_3D__.composition}));
    await page.locator('.stage:visible').first().screenshot({path:join(out,`${build}-${viewport}-${method}-${direction}.png`)});
    const deltaY=after.world.y-before.world.y,deltaHeading=after.world.heading-before.world.heading,screenDx=after.composition.carCenter[0]-before.composition.carCenter[0],screenRightFactor=after.camera.look[0]-after.camera.position[0],sign=direction==='right'?1:-1;
    rows.push({build,viewport,method,direction,before,after,deltaY,deltaHeading,screenDx,screenRightFactor,pass:deltaY*sign>.005&&deltaHeading*sign>0&&after.world.wheel*sign>0&&screenDx*sign>0&&screenRightFactor>0,status:after.world.state});
    await page.keyboard.up('Space');if(method==='keyboard')await page.keyboard.up(direction==='right'?'ArrowRight':'ArrowLeft');if(method==='analog')await page.mouse.up();
  }catch(e){errors.push(`${build}/${viewport}/${method}/${direction}: ${e.stack||e}`);}finally{await context.close();}
}
await browser.close();const report={head:process.env.KICKLAB_QA_HEAD||null,rows,errors,external};writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');const failed=rows.filter(r=>!r.pass).map(r=>({build:r.build,viewport:r.viewport,method:r.method,direction:r.direction,deltaY:r.deltaY,deltaHeading:r.deltaHeading,screenDx:r.screenDx,wheel:r.after.world.wheel}));console.log(JSON.stringify({head:report.head,cases:rows.length,passed:rows.length-failed.length,failed,errors,external},null,2));if(errors.length||external.length||failed.length)process.exitCode=1;
