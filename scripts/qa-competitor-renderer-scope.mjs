import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4279/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/competitor-renderer-scope');
const revision=process.argv[4]||'local';
mkdirSync(outputDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath}),localOrigin=new URL(baseUrl).origin,externalRequests=new Set(),errors=[],captures=[],audits=[];
const viewports=[['desktop',1440,1000],['tablet',768,1024],['mobile',390,844]];
const seedProfile=()=>{const progress={gfx:'3d',mute:true,xp:0};localStorage.setItem('impactlab.v1',JSON.stringify(progress));localStorage.setItem('impactlab.nick','QA Athlete');localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'qa-athlete',legacyProfileId:'qa-athlete',profiles:[{id:'qa-athlete',nickname:'QA Athlete',avatar:'rocket',color:'sky',progress,needsSetup:false,createdAt:1,updatedAt:1}]}));};
const watch=page=>{page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('request',request=>{const value=request.url();if(/^https?:/.test(value)&&new URL(value).origin!==localOrigin)externalRequests.add(value);});};
const url=()=>{const value=new URL(baseUrl);value.searchParams.set('renderer','direction-c');value.searchParams.set('quality','full');value.searchParams.set('qa','competitor-renderer-scope');value.searchParams.set('revision',revision);return value.href;};
async function snapshot(page){return page.evaluate(()=>({directionC:window.__KICKLAB_DIRECTION_C__,canvas3d:!!document.querySelector('#cv3')&&getComputedStyle(document.querySelector('#cv3')).display!=='none',canvas2d:getComputedStyle(document.querySelector('#cv')).display,overflow:document.documentElement.scrollWidth-innerWidth}));}
for(const [viewport,width,height] of viewports){const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});await context.addInitScript(seedProfile);const page=await context.newPage();watch(page);for(const mode of ['fight','race']){await page.goto(url(),{waitUntil:'networkidle'});await page.locator(`#lab-tab-${mode}`).click();await page.locator('.stage').waitFor({state:'visible'});await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:10000}).catch(()=>{});await page.waitForTimeout(500);const state=await snapshot(page);if(state.canvas3d||state.canvas2d!=='block'||state.directionC.controlledIndicator.visible||state.overflow>0)throw new Error(`${viewport}/${mode}: renderer scope contract failed ${JSON.stringify(state)}`);const path=join(outputDir,`${viewport}-${mode}-canvas-scope.png`);await page.screenshot({path,fullPage:true});captures.push(path);audits.push({viewport,width,height,mode,scope:mode==='fight'?'canvas-only-two-fighter-lab':'canvas-only-solo-driver-lab',fullRendererActive:false,state});}await context.close();}
await browser.close();
if(externalRequests.size)throw new Error(`External requests observed: ${JSON.stringify([...externalRequests])}`);
if(errors.length)throw new Error(`Page errors observed: ${JSON.stringify(errors)}`);
const report={revision,baseUrl,viewports,audits,captures,externalRequests:[...externalRequests],errors,conclusion:{fight:'Canvas-only renderer; Direction C full renderer is inactive, so the legacy player and Rex remain the intentional fallback path.',race:'Canvas-only solo-driver renderer with no gameplay rival; Direction C full renderer is inactive.',kick:'Full Direction C renderer; competitor parity is validated by qa-multi-activity-athlete.'}};
writeFileSync(join(outputDir,'qa-report.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({ok:true,outputDir,revision,captures:captures.length,externalRequests:[],errors:[],conclusion:report.conclusion},null,2));
