import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { chromium }=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4208/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/expanded-stage');
const revision=process.argv[4]||'working-tree';
const baselinePath=process.argv[5]&&process.argv[5]!=='baseline'?resolve(process.argv[5]):null;
const baselineMode=process.argv[5]==='baseline';
const specs=[['phone-390x844',390,844],['tablet-768x1024',768,1024],['mid-1113x988',1113,988],['desktop-1440x1000',1440,1000]];
const modes=['Fight','Race','Kick'];
mkdirSync(outputDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath});
const measurements=[],errors=[],requests=[];
const urlFor=label=>`${baseUrl}?qa=expanded-stage&rev=${encodeURIComponent(revision)}&view=${label}`;

function watch(page){page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('request',request=>requests.push(request.url()));}
async function seed(page){await page.addInitScript(()=>{const progress={gfx:'3d',mute:true,xp:0,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}};localStorage.setItem('impactlab.v1',JSON.stringify(progress));localStorage.setItem('impactlab.nick','QA Player');localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'qa-stage',legacyProfileId:'qa-stage',profiles:[{id:'qa-stage',nickname:'QA Player',avatar:'rocket',color:'sky',progress,needsSetup:false,createdAt:1,updatedAt:1}]}));});}
async function enter(page,mode){if(await page.locator('#profileDialog').isVisible())await page.getByRole('button',{name:'Close profiles'}).click();await page.locator(`#lab-tab-${mode.toLowerCase()}`).click();try{await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:12000});}catch{await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:12000});}await page.waitForTimeout(350);}
async function home(page){await page.locator('#orientationDetailToggle').click();await page.locator('#modeHomeButton').click();await page.locator('#modeHome').waitFor({state:'visible'});}
async function snapshot(page,label,mode,style){
  const result=await page.evaluate(({label,mode,style})=>{const stage=document.querySelector('.stage'),cv=document.querySelector('#cv'),cv3=document.querySelector('#cv3'),deck=document.querySelector('.control-deck'),rail=document.querySelector('#gameGuidanceHud'),player=document.querySelector('#controlledPlayerMarker'),rect=node=>node?.getBoundingClientRect().toJSON()||null,box=rect(deck),stageBox=rect(stage),canvasBox=rect(cv),canvas3Box=cv3&&getComputedStyle(cv3).display!=='none'?rect(cv3):null,railBox=rect(rail),overlap=(a,b)=>!!a&&!!b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,area=r=>r?r.width*r.height:0,ratio=(w,h)=>Number((w/h).toFixed(4)),backingAspect=ratio(cv.width,cv.height),canvasAspect=ratio(canvasBox.width,canvasBox.height),canvas3BackingAspect=cv3?ratio(cv3.width,cv3.height):null,canvas3Aspect=canvas3Box?ratio(canvas3Box.width,canvas3Box.height):null,viewportAudit=window.__KICKLAB_VIEWPORT__||null;return{label,mode,style,url:location.href,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},viewportAudit,stage:stageBox,canvas:canvasBox,canvas3:canvas3Box,backing:{canvas:{width:cv.width,height:cv.height,aspect:backingAspect},canvas3:cv3?{width:cv3.width,height:cv3.height,aspect:canvas3BackingAspect}:null},controller:box,rail:railBox,player:rect(player),ratios:{stageAspect:ratio(stageBox.width,stageBox.height),canvasAspect,controllerToStage:Number((area(box)/area(stageBox)).toFixed(4)),controllerHeightToStage:Number((box.height/stageBox.height).toFixed(4))},geometry:{controllerInside:box.left>=stageBox.left-1&&box.right<=stageBox.right+1&&box.top>=stageBox.top-1&&box.bottom<=stageBox.bottom+1,railOverlap:overlap(box,railBox),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,canvasBackingMatches:Math.abs(canvasAspect-backingAspect)<.002,canvas3Matches:!canvas3Box||(Math.abs(canvas3Aspect-canvas3BackingAspect)<.002&&Math.abs(canvas3Aspect-canvasAspect)<.002),viewportAuditMatches:!!viewportAudit&&Math.abs(viewportAudit.height-(canvasBox.height/(canvasBox.width/viewportAudit.width)))<.5},computed:{canvasAspect:getComputedStyle(cv).aspectRatio,canvasHeight:getComputedStyle(cv).height,canvasWidth:getComputedStyle(cv).width},audits:{directionC:window.__KICKLAB_DIRECTION_C__||null,stadium:window.__KICKLAB_STADIUM_AUDIT__||null,side:window.__KICKLAB_SIDE_STADIUM__||null}};},{label,mode,style});
  measurements.push(result);return result;
}

for(const [label,width,height] of specs){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=480}),page=await context.newPage();watch(page);await seed(page);await page.goto(urlFor(label),{waitUntil:'networkidle'});
  for(let index=0;index<modes.length;index++){
    const mode=modes[index];if(index)await home(page);await enter(page,mode);
    if(width<=480&&(await page.locator('#controllerCollapseButton').getAttribute('aria-expanded'))==='false')await page.locator('#controllerCollapseButton').click();
    await page.getByRole('button',{name:'Classic',exact:true}).click();await page.waitForTimeout(150);const classic=await snapshot(page,label,mode,'classic-expanded');await page.screenshot({path:join(outputDir,`${label}-${mode.toLowerCase()}-classic.png`)});
    await page.getByRole('button',{name:'Analog',exact:true}).click();await page.waitForTimeout(180);const analog=await snapshot(page,label,mode,'analog-expanded');await page.screenshot({path:join(outputDir,`${label}-${mode.toLowerCase()}-analog.png`)});
    await page.locator('#controllerCollapseButton').click();await page.waitForTimeout(100);const collapsed=await snapshot(page,label,mode,'collapsed');await page.locator('#controllerCollapseButton').click();
    for(const state of [classic,analog,collapsed])if(!state.geometry.controllerInside||state.geometry.railOverlap||!state.geometry.canvasBackingMatches||!state.geometry.canvas3Matches||!state.geometry.viewportAuditMatches||state.geometry.overflow>1)throw new Error(`${label}-${mode}-${state.style}: stage geometry or backing-buffer audit failed: ${JSON.stringify(state.geometry)}`);
  }
  await context.close();
}

const externalRequests=[...new Set(requests.filter(url=>{try{return new URL(url).hostname!=='127.0.0.1';}catch{return true;}}))];
if(externalRequests.length)throw new Error(`External requests observed: ${externalRequests.join(', ')}`);if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
let comparison=null;
if(baselinePath){const before=JSON.parse(readFileSync(baselinePath,'utf8')).measurements,byKey=new Map(before.map(item=>[[item.label,item.mode,item.style].join('|'),item]));comparison=measurements.map(after=>{const previous=byKey.get([after.label,after.mode,after.style].join('|'));if(!previous)throw new Error(`Missing baseline for ${after.label}/${after.mode}/${after.style}`);return{label:after.label,mode:after.mode,style:after.style,before:{stageHeight:previous.stage.height,canvasHeight:previous.canvas.height,controllerToStage:previous.ratios.controllerToStage},after:{stageHeight:after.stage.height,canvasHeight:after.canvas.height,controllerToStage:after.ratios.controllerToStage,controllerHeightToStage:after.ratios.controllerHeightToStage},delta:{stageHeight:Number((after.stage.height-previous.stage.height).toFixed(2)),stagePercent:Number(((after.stage.height/previous.stage.height-1)*100).toFixed(1)),canvasHeight:Number((after.canvas.height-previous.canvas.height).toFixed(2)),canvasPercent:Number(((after.canvas.height/previous.canvas.height-1)*100).toFixed(1)),controllerAreaRatio:Number((after.ratios.controllerToStage-previous.ratios.controllerToStage).toFixed(4))}};});const expanded=comparison.filter(item=>item.style!=='collapsed');if(expanded.some(item=>item.delta.stagePercent<9||item.after.controllerToStage>.42||item.after.controllerHeightToStage>.45))throw new Error(`Stage expansion or controller ratio failed: ${JSON.stringify(expanded)}`);}
const report={revision,baseUrl,baselineMode,baselinePath,externalRequests,errors,measurements,comparison,files:readdirSync(outputDir).sort()};writeFileSync(join(outputDir,'stage-report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify({revision,count:measurements.length,summary:measurements.map(item=>({label:item.label,mode:item.mode,style:item.style,stageHeight:item.stage.height,canvasHeight:item.canvas.height,controllerToStage:item.ratios.controllerToStage,canvasAspect:item.ratios.canvasAspect})),comparison},null,2));await browser.close();
