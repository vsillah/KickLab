import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url);
const { chromium }=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4199/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/analog-controls');
const revision=process.argv[4]||'working-tree';
const videoDir=join(outputDir,'video-source');
mkdirSync(videoDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath});
const errors=[];const checks=[];
const listen=page=>{page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});};
const urlFor=label=>`${baseUrl}?qa=analog-controls&rev=${encodeURIComponent(revision)}&view=${label}`;

async function prepare(page,label){
  listen(page);await page.goto(urlFor(label),{waitUntil:'networkidle'});await page.getByRole('button',{name:/Try analog controls/}).click();await page.locator('#touchController').scrollIntoViewIfNeeded();await page.waitForTimeout(250);
  if(!(await page.locator('#touchController').isVisible()))throw new Error(`${label}: prototype controller is not visible`);
}
async function selectLab(page,name){await page.getByRole('tab',{name:new RegExp(`^${name}`)}).click();await page.waitForTimeout(250);}
async function chooseFreeLab(page){await page.getByRole('button',{name:/Open Mode settings/}).click();await page.getByRole('button',{name:/Free lab/}).click();await page.getByRole('button',{name:/Close settings/}).click();}
async function openKickActivity(page,name){
  const freestyle=page.getByRole('button',{name:/Freestyle/});await freestyle.click();const option=page.getByRole('checkbox',{name:new RegExp(`^${name}`)});if((await option.getAttribute('aria-checked'))!=='true')await option.click();await page.getByRole('button',{name:'Play activity',exact:true}).click();await page.waitForTimeout(400);
}
async function pointerPath(page,selector,points,{holdMs=0,release=true}={}){
  const box=await page.locator(selector).boundingBox();if(!box)throw new Error(`${selector}: no visible box`);const c={x:box.x+box.width/2,y:box.y+box.height/2};await page.mouse.move(c.x,c.y);await page.mouse.down();
  for(const point of points){await page.mouse.move(c.x+point[0]*box.width/2,c.y+point[1]*box.height/2,{steps:6});if(point[2])await page.waitForTimeout(point[2]);}
  if(holdMs)await page.waitForTimeout(holdMs);if(release)await page.mouse.up();return{box,center:c};
}
async function exerciseAnalog(page,label){
  const before=await page.evaluate(()=>scrollY),box=await page.locator('#analogStick').boundingBox();if(!box)throw new Error(`${label}: thumbstick unavailable`);const x=box.x+box.width/2,y=box.y+box.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+box.width*.14,y-box.height*.09,{steps:6});await page.waitForTimeout(180);const low=await page.locator('#analogReadout').innerText();await page.mouse.move(x+box.width*.43,y-box.height*.35,{steps:8});await page.waitForTimeout(280);const high=await page.locator('#analogReadout').innerText();await page.mouse.up();await page.waitForTimeout(160);const after=await page.evaluate(()=>scrollY);if(before!==after)throw new Error(`${label}: page scrolled while thumbstick was engaged`);if(low===high||!/\d+%/.test(low)||!/\d+%/.test(high))throw new Error(`${label}: analog magnitude did not produce distinct live readouts (${low} / ${high})`);checks.push({label,kind:'analog',low,high,scrollBefore:before,scrollAfter:after});
}
async function exercisePhysicsSlider(page,label){
  const rows=page.locator('#prototypePhysicsRows .prototype-physics-row.has-band:has(input:not(:disabled))'),choices=await rows.evaluateAll(elements=>elements.map((el,index)=>({index,start:parseFloat(el.style.getPropertyValue('--target-start'))/100,end:parseFloat(el.style.getPropertyValue('--target-end'))/100,id:el.dataset.var}))),choice=choices.find(item=>item.start>.08||item.end<.92);if(!choice)throw new Error(`${label}: no enabled coach slider has a testable outside range (${JSON.stringify(choices)})`);const row=rows.nth(choice.index),input=row.locator('input'),box=await input.boundingBox();if(!box)throw new Error(`${label}: coach slider has no pointer target`);
  const band=await row.evaluate(el=>({start:parseFloat(el.style.getPropertyValue('--target-start'))/100,end:parseFloat(el.style.getPropertyValue('--target-end'))/100,id:el.dataset.var,description:el.querySelector('.prototype-range-description').textContent}));if(!Number.isFinite(band.start)||!Number.isFinite(band.end)||band.end<=band.start)throw new Error(`${label}: invalid coach band ${JSON.stringify(band)}`);
  const drag=async ratio=>{await page.mouse.move(box.x+box.width*ratio,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*ratio,box.y+box.height/2,{steps:5});await page.mouse.up();await page.waitForTimeout(180);return{value:await input.inputValue(),state:await row.getAttribute('data-state'),marker:await row.evaluate(el=>el.style.getPropertyValue('--marker'))};};
  const outsideRatio=band.start>.08?.02:.98,outside=await drag(outsideRatio),inside=await drag((band.start+band.end)/2);if(!['low','high'].includes(outside.state))throw new Error(`${label}: pointer drag did not leave coach band (${JSON.stringify({band,outside})})`);if(!['target','perfect'].includes(inside.state))throw new Error(`${label}: pointer drag did not enter coach band (${JSON.stringify({band,inside})})`);if(outside.value===inside.value)throw new Error(`${label}: pointer drag did not change the mechanics value`);checks.push({label,kind:'physics-slider-pointer',variable:band.id,description:band.description,outside,inside,band:{start:band.start,end:band.end}});
}
async function exerciseCharge(page,label,{spin=true}={}){
  const points=spin?[[.38,-.22,220],[.72,.05,260],[.82,.42,220]]:[[.04,0,180]],before=await page.evaluate(()=>scrollY),box=await page.locator('#gestureAction').boundingBox();if(!box)throw new Error(`${label}: gesture action unavailable`);const x=box.x+box.width/2,y=box.y+box.height/2;await page.mouse.move(x,y);await page.mouse.down();for(const point of points){await page.mouse.move(x+point[0]*box.width/2,y+point[1]*box.height/2,{steps:6});if(point[2])await page.waitForTimeout(point[2]);}await page.waitForTimeout(spin?150:1120);const during={power:await page.locator('#gesturePowerValue').innerText(),state:await page.locator('#gestureAction').getAttribute('data-state'),spin:await page.locator('#gestureSpinValue').innerText(),status:await page.locator('#gesturePowerStatus').innerText()};if(during.power==='0%'||!['target','perfect'].includes(during.state))throw new Error(`${label}: charge did not enter the target/perfect band (${JSON.stringify(during)})`);await page.mouse.up();const released=await page.locator('#gesturePowerStatus').innerText(),after=await page.evaluate(()=>scrollY);if(before!==after)throw new Error(`${label}: page scrolled while gesture action was engaged`);if(!/release/i.test(released))throw new Error(`${label}: release state was not preserved (${released})`);checks.push({label,kind:'hold-band-release',during,released,scrollBefore:before,scrollAfter:after});
}

const viewportSpecs=[['desktop',1440,1000,'Fight'],['tablet',820,1180,'Race'],['mobile-390x844',390,844,'Kick']];
for(const [label,width,height,mode] of viewportSpecs){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'no-preference'});const page=await context.newPage();await prepare(page,label);if(mode!=='Fight')await selectLab(page,mode);if(mode==='Fight')await chooseFreeLab(page);await page.locator('#touchController').scrollIntoViewIfNeeded();await exerciseAnalog(page,`${label}-${mode.toLowerCase()}`);await exerciseCharge(page,`${label}-${mode.toLowerCase()}-gesture`,{spin:mode!=='Race'});const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));if(overflow.scrollWidth>overflow.clientWidth+1)throw new Error(`${label}: horizontal overflow ${overflow.scrollWidth}px > ${overflow.clientWidth}px`);await page.screenshot({path:join(outputDir,`${label}.png`)});checks.push({label,kind:'viewport',width,height,mode,mapping:await page.locator('#touchMapTitle').innerText(),overflow});await context.close();
}

const videoContext=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,reducedMotion:'no-preference',recordVideo:{dir:videoDir,size:{width:1280,height:900}}});
const page=await videoContext.newPage();await prepare(page,'walkthrough');await page.locator('#touchController').scrollIntoViewIfNeeded();
await exercisePhysicsSlider(page,'fight-coach-slider');await page.waitForTimeout(500);await chooseFreeLab(page);await page.locator('#touchController').scrollIntoViewIfNeeded();await exerciseAnalog(page,'fight-magnitudes');await exerciseCharge(page,'fight-charge-spin');await page.waitForTimeout(700);
await selectLab(page,'Race');await page.locator('#touchController').scrollIntoViewIfNeeded();await pointerPath(page,'#analogStick',[[0,-.36,450],[.65,-.75,650],[-.72,-.92,650]]);await exerciseCharge(page,'race-throttle',{spin:false});await page.waitForTimeout(500);
await selectLab(page,'Kick');await page.locator('#touchController').scrollIntoViewIfNeeded();await pointerPath(page,'#analogStick',[[.35,-.28,300],[-.7,-.7,350]]);await exerciseCharge(page,'free-kick-target-release');await page.waitForTimeout(1000);
await openKickActivity(page,'Goalkeeper');await page.locator('#touchController').scrollIntoViewIfNeeded();await pointerPath(page,'#analogStick',[[-.75,-.6,380],[.68,-.78,380]]);await exerciseCharge(page,'goalkeeper-set-release',{spin:false});await page.waitForTimeout(900);

const cdp=await videoContext.newCDPSession(page);const stick=await page.locator('#analogStick').boundingBox();if(stick){const x=stick.x+stick.width/2,y=stick.y+stick.height/2,scrollBefore=await page.evaluate(()=>scrollY);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1,radiusX:8,radiusY:8,force:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+30,y:y-38,id:1,radiusX:8,radiusY:8,force:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+30,y:y-38,id:1,radiusX:8,radiusY:8,force:1},{x:x+42,y:y-18,id:2,radiusX:8,radiusY:8,force:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(120);const scrollAfter=await page.evaluate(()=>scrollY);checks.push({label:'touch-cancel-multitouch',kind:'real-touch',scrollBefore,scrollAfter,readout:await page.locator('#analogReadout').innerText()});}

await page.locator('#touchController').scrollIntoViewIfNeeded();const actionBox=await page.locator('#gestureAction').boundingBox();if(actionBox){await page.mouse.move(actionBox.x+actionBox.width/2,actionBox.y+actionBox.height/2);await page.mouse.down();await page.waitForTimeout(180);await page.setViewportSize({width:1279,height:900});await page.waitForTimeout(120);checks.push({label:'resize-cancel',kind:'lifecycle',status:await page.locator('#gesturePowerStatus').innerText()});await page.mouse.up();}
await page.screenshot({path:join(outputDir,'walkthrough-final.png')});
const recordedVideo=page.video();await page.close();await videoContext.close();const rawVideo=await recordedVideo.path();

const reducedContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const reducedPage=await reducedContext.newPage();await prepare(reducedPage,'reduced-motion');const transitions=await reducedPage.locator('#gestureAction').evaluate(el=>({ring:getComputedStyle(el.querySelector('.gesture-ring')).transitionDuration,core:getComputedStyle(el.querySelector('.gesture-core')).transitionDuration}));if(transitions.ring!=='0s'||transitions.core!=='0s')throw new Error(`Reduced motion did not disable controller transitions: ${JSON.stringify(transitions)}`);checks.push({label:'reduced-motion',kind:'accessibility',transitions});await reducedContext.close();await browser.close();

const mp4=join(outputDir,'analog-controls-walkthrough.mp4');const transcode=spawnSync('ffmpeg',['-y','-i',rawVideo,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',mp4],{encoding:'utf8'});if(transcode.status!==0)throw new Error(`ffmpeg failed: ${transcode.stderr}`);
const dimensions={};for(const name of ['desktop.png','tablet.png','mobile-390x844.png']){const result=spawnSync('sips',['-g','pixelWidth','-g','pixelHeight',join(outputDir,name)],{encoding:'utf8'});dimensions[name]=result.stdout.trim();}
const report={revision,baseUrl,errors,checks,dimensions,video:{path:mp4,bytes:statSync(mp4).size,source:rawVideo},files:readdirSync(outputDir).sort()};writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);
if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);if(statSync(mp4).size<50_000)throw new Error(`Walkthrough MP4 is unexpectedly small: ${statSync(mp4).size} bytes`);console.log(JSON.stringify(report,null,2));
