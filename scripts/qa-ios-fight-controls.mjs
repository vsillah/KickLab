import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:4318';
const output=resolve(process.argv[3]||'qa-artifacts/ios-fight-controls');
const revision=process.argv[4]||'working-tree';
mkdirSync(output,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('Chromium is unavailable');
const browser=await chromium.launch({headless:true,executablePath});
const results=[];
try{
  for(const [artifact,width,height] of [['browser',390,844],['browser',768,1024],['browser',1440,900],['native',390,844],['native',844,390],['native',820,1180],['native',1180,820]]){
    const label=`${artifact}-${width}x${height}`;if(process.env.KICKLAB_ONLY&&!label.includes(process.env.KICKLAB_ONLY))continue;console.log(`Checking ${label}`);
    const record=artifact==='native';
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<1000,reducedMotion:'reduce',recordVideo:record?{dir:join(output,'video'),size:{width,height}}:undefined});
    await context.addInitScript(()=>{
      localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'canvas',mute:true,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));
      localStorage.setItem('impactlab.nick','QA Player');
    });
    const page=await context.newPage();
    const errors=[],requests=[];page.on('pageerror',error=>errors.push(String(error)));page.on('request',request=>requests.push(request.url()));
    const path=artifact==='native'?'/mobile/index.html':'/kicklab.html';
    await page.goto(`${base}${path}?qa=ios-fight-controls&rev=${revision}`,{waitUntil:'networkidle'});
    if(await page.locator('#profileDialog').isVisible())await page.getByRole('button',{name:'Close profiles'}).click();
    await page.locator('#lab-tab-fight').click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:12000});
    await page.waitForFunction(()=>[...document.querySelectorAll('#mlList .mv.rex')].some(row=>row.textContent.includes('HP')),null,{timeout:15000});
    const before=await page.evaluate(()=>{
      const deck=document.querySelector('.control-deck'),buttons=[...document.querySelectorAll('#pad button:not(:disabled)')],action=document.querySelector('#padR button:not(:disabled)'),movement=document.querySelector('#padL button:not(:disabled)'),box=action?.getBoundingClientRect();
      const inViewport=rect=>rect&&rect.width>=40&&rect.height>=40&&rect.left>=0&&rect.right<=innerWidth&&rect.top>=0&&rect.bottom<=innerHeight;
      const rect=selector=>document.querySelector(selector)?.getBoundingClientRect().toJSON();
      const controls=[...document.querySelectorAll('#padL .dpad .arm,#padR .arcade .abtn')].filter(item=>getComputedStyle(item).display!=='none').map(item=>({name:item.getAttribute('aria-label')||item.textContent.trim(),rect:item.getBoundingClientRect().toJSON(),reachable:inViewport(item.getBoundingClientRect())}));
      return {damage:document.querySelector('#mlList .mv.rex')?.textContent,collapsed:deck.classList.contains('controller-collapsed'),buttonCount:buttons.length,action:action?.getAttribute('aria-label'),movement:movement?.getAttribute('aria-label'),actionRect:box?.toJSON(),movementRect:movement?.getBoundingClientRect().toJSON(),actionVisible:inViewport(box),movementVisible:inViewport(movement?.getBoundingClientRect()),controls,stage:rect('.stage'),canvas:rect('canvas#cv'),deck:deck.getBoundingClientRect().toJSON(),pad:rect('.control-deck .pad'),head:rect('.control-deck .floating-control-head'),left:rect('.control-deck .control-left-slot'),center:rect('.control-deck .control-center-slot'),right:rect('.control-deck #padR'),viewport:{width:innerWidth,height:innerHeight}};
    });
    await page.screenshot({path:join(output,`${label}-damage.png`)});
    if(before.collapsed||(artifact==='native'&&(!before.actionVisible||!before.movementVisible||before.controls.some(control=>!control.reachable)))||before.buttonCount<2||errors.length||requests.some(url=>!url.startsWith(base)))throw new Error(`${label}: damaging play without reachable Fight controls: ${JSON.stringify({before,errors,requests})}`);
    if(record)await page.waitForTimeout(700);
    await page.locator('#padR button:not(:disabled)').first().press('Enter');
    await page.waitForFunction(()=>document.querySelector('#mlList .mv.you'),null,{timeout:3000});
    if(record)await page.waitForTimeout(800);
    const after=await page.evaluate(()=>({moveCount:document.querySelectorAll('#mlList .mv').length}));
    await page.keyboard.press('KeyP');
    if(!(await page.locator('#gamePacingResume').isVisible()))throw new Error(`${label}: pause unavailable`);
    if(record)await page.waitForTimeout(900);
    await page.locator('#gamePacingResume').click();
    await page.waitForTimeout(record?900:150);
    const resumed=await page.evaluate(()=>({paused:!document.querySelector('#gamePacingOverlay').hidden,collapsed:document.querySelector('.control-deck').classList.contains('controller-collapsed')}));
    if(resumed.paused||resumed.collapsed)throw new Error(`${label}: Fight controls lost after resume: ${JSON.stringify(resumed)}`);
    await page.screenshot({path:join(output,`${label}.png`)});
    results.push({label,before,after,resumed,errors});
    const video=page.video();await page.close();await context.close();if(video)results.at(-1).video=await video.path();
  }
}finally{await browser.close();}
writeFileSync(join(output,'results.json'),JSON.stringify({revision,results},null,2));
console.log(JSON.stringify({revision,checks:results.map(result=>({label:result.label,damage:result.before.damage,action:result.before.action,movement:result.before.movement,video:result.video}))},null,2));
