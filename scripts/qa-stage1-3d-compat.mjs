import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const baseUrl=process.argv[2]||'http://127.0.0.1:4211/kicklab.html';
const outputDir=resolve(process.argv[3]||'qa-artifacts/stage1-3d-compat');
mkdirSync(outputDir,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
if(!executablePath)throw new Error('No local Chrome or Chromium executable found.');
const browser=await chromium.launch({headless:true,executablePath});
const errors=[],externalRequests=new Set(),checks=[];
const localOrigin=new URL(baseUrl).origin;

function watch(page){
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{const url=request.url();if(/^https?:/.test(url)&&new URL(url).origin!==localOrigin)externalRequests.add(url);});
}

async function openKick({width,height,classic=false,label}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();watch(page);
  if(classic)await page.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'})));
  const response=await page.goto(`${baseUrl}?qa=stage1-3d-compat&view=${label}`,{waitUntil:'networkidle'});
  if(!response?.ok())throw new Error(`${label}: request failed with ${response?.status()}`);
  await page.locator('#lab-tab-kick').evaluate(node=>node.click());
  await page.locator('.stage').waitFor({state:'visible'});
  await page.waitForTimeout(700);
  const before=await page.evaluate(()=>{const cv=document.querySelector('#cv'),cv3=document.querySelector('#cv3'),display=node=>node?getComputedStyle(node).display:'missing';return{revision:globalThis.THREE?.REVISION,loader:typeof globalThis.THREE?.GLTFLoader,canvas:display(cv),canvas3d:display(cv3),fallback:globalThis.__KICKLAB_SIDE_STADIUM__||null,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};});
  if(before.revision!=='186'||before.loader!=='function')throw new Error(`${label}: mismatched local runtime ${JSON.stringify(before)}`);
  if(classic){
    if(before.canvas!=='block'||before.canvas3d!=='missing'||!before.fallback?.layers?.includes('perspective-pitch'))throw new Error(`${label}: Classic Canvas fallback failed ${JSON.stringify(before)}`);
    await page.keyboard.press('Space');
    await page.waitForTimeout(260);
  }else if(before.canvas3d==='none'||before.canvas3d==='missing')throw new Error(`${label}: WebGL canvas unavailable ${JSON.stringify(before)}`);
  const after=await page.evaluate(()=>({canvasWidth:document.querySelector('#cv')?.width||0,canvas3dWidth:document.querySelector('#cv3')?.width||0,fallback:globalThis.__KICKLAB_SIDE_STADIUM__||null}));
  await page.screenshot({path:join(outputDir,`${label}.png`),fullPage:true});
  checks.push({label,width,height,classic,before,after});
  await context.close();
}

await openKick({width:1440,height:1000,classic:false,label:'desktop-webgl'});
await openKick({width:1440,height:1000,classic:true,label:'desktop-classic'});
await openKick({width:390,height:844,classic:true,label:'mobile-classic'});
await browser.close();
if(errors.length||externalRequests.size)throw new Error(JSON.stringify({errors,externalRequests:[...externalRequests]}));
const report={baseUrl,errors,externalRequests:[],checks};
writeFileSync(join(outputDir,'report.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({ok:true,outputDir,checks:checks.length,errors:0,externalRequests:0},null,2));
