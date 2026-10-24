import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const [baseUrl,revision,outputArg]=process.argv.slice(2);
if(!baseUrl||!revision||!outputArg||!/^http:\/\/127\.0\.0\.1:\d+\/kicklab\.html$/.test(baseUrl))throw new Error('Pass loopback kicklab.html URL, revision, and output folder.');
const output=resolve(outputArg),origin=new URL(baseUrl).origin;
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={baseUrl,revision,states:[],fallbacks:[],errors:[],externalRequests:[]};
const viewports=[['phone',390,844],['tablet',768,1024],['desktop',1440,900]];
const activities=[['free','Free kick'],['header','Header duel'],['run','1v1 Dribble']];
function watch(page,label){page.on('pageerror',error=>report.errors.push(`${label}: ${error}`));page.on('console',message=>{if(message.type()==='error')report.errors.push(`${label}: ${message.text()}`);});page.on('request',request=>{const url=request.url();if(/^https?:/.test(url)&&new URL(url).origin!==origin)report.externalRequests.push(`${label}: ${url}`);});}
function urlFor(label,extra={}){const url=new URL(baseUrl);for(const [key,value] of Object.entries({renderer:'direction-c',quality:'full',qa:'direction-c',rev:revision,view:label,...extra}))url.searchParams.set(key,String(value));return url.href;}
async function enterKick(page){await page.goto(urlFor('athlete-color'),{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();await page.locator('#lab-tab-kick').click();await page.waitForFunction(()=>/^ready/.test(window.__KICKLAB_DIRECTION_C__?.status||''),null,{timeout:15000});await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});}
async function selectActivity(page,key){if(key==='free')return;await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();await page.locator('#experiencePanel').waitFor({state:'visible'});const selected=page.locator('[role="checkbox"][aria-checked="true"]');while(await selected.count())await selected.first().click();await page.locator(`#game-${key}`).click();await page.locator('#freestyleStart').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});await page.waitForFunction(expected=>window.__KICKLAB_DIRECTION_C__?.profile===expected&&/^ready/.test(window.__KICKLAB_DIRECTION_C__?.status||''),key,{timeout:10000});}
async function state(page){return page.evaluate(()=>({athlete:window.__KICKLAB_DIRECTION_C__||null,lighting:window.__KICKLAB_LIGHTING_AUDIT__||null,stands:window.__KICKLAB_STAND_LIGHTING__||null,stadium:window.__KICKLAB_STADIUM_AUDIT__||null,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,canvas3d:!!document.querySelector('#cv3')&&getComputedStyle(document.querySelector('#cv3')).display!=='none'}));}
try{
  for(const [viewport,width,height] of viewports)for(const time of ['day','dusk','night']){
    const label=`${viewport}-${time}`,context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    await context.addInitScript(t=>{localStorage.setItem('impactlab.nick','Color QA');localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',kickTime:t,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));},time);
    const page=await context.newPage();watch(page,label);await enterKick(page);
    for(const [key,name] of activities){
      await selectActivity(page,key);await page.waitForTimeout(250);
      const before=await state(page);
      if(before.athlete?.profile!==key||!/^ready/.test(before.athlete.status)||!before.canvas3d||before.lighting?.time!==time||before.stands?.time!==time||before.stands?.standLights!==2||before.overflow>1)throw new Error(`${label}/${key}: incomplete render (${JSON.stringify(before)})`);
      if(Object.values(before.stadium?.passes||{}).some(value=>!value))throw new Error(`${label}/${key}: stadium layer regression`);
      if(key==='header'&&(!before.athlete.opponentVisible||before.athlete.opponentRenderer!=='shared-direction-c'))throw new Error(`${label}/${key}: shared opponent absent`);
      const wide=join(output,`${label}-${key}-wide.png`);await page.locator('.stage').screenshot({path:wide});
      if(!await page.evaluate(()=>window.__KICKLAB_DIRECTION_C_FOCUS__?.()))throw new Error(`${label}/${key}: close camera unavailable`);
      await page.waitForTimeout(250);
      const close=join(output,`${label}-${key}-close.png`);await page.locator('.stage').screenshot({path:close});
      await page.evaluate(()=>window.__KICKLAB_DIRECTION_C_WIDE__?.());
      report.states.push({viewport,width,height,time,key,name,wide,close,audit:{status:before.athlete.status,activity:before.athlete.activity,camera:before.athlete.camera,opponentVisible:before.athlete.opponentVisible,lighting:before.lighting,stands:before.stands,overflow:before.overflow}});
    }
    await context.close();
  }
  for(const [label,init,params,expected] of [
    ['canvas',()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d'})),{},'canvas'],
    ['reduced-quality',null,{quality:'low'},'reduced-quality'],
    ['webgl-unavailable',()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:old.call(this,type,...args);};},{},'webgl-unavailable']
  ]){
    const context=await browser.newContext({viewport:{width:390,height:844}});if(init)await context.addInitScript(init);
    const page=await context.newPage();if(label!=='webgl-unavailable')watch(page,label);
    await page.goto(urlFor(label,params),{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();await page.locator('#lab-tab-kick').click();
    await page.waitForFunction(value=>window.__KICKLAB_DIRECTION_C__?.status===value,expected,{timeout:10000});
    const fallback=await page.evaluate(()=>({status:window.__KICKLAB_DIRECTION_C__?.status,canvas3d:!!document.querySelector('#cv3'),canvas2d:getComputedStyle(document.querySelector('#cv')).display,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
    if(fallback.status!==expected||fallback.overflow>1||((label==='canvas'||label==='webgl-unavailable')&&fallback.canvas2d!=='block'))throw new Error(`${label}: fallback failed (${JSON.stringify(fallback)})`);
    const screenshot=join(output,`fallback-${label}.png`);await page.screenshot({path:screenshot});report.fallbacks.push({label,...fallback,screenshot});await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();watch(page,'procedural-3d');
    const url=new URL(baseUrl);url.searchParams.set('rev',revision);url.searchParams.set('view','procedural-3d');
    await page.goto(url.href,{waitUntil:'networkidle'});if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();await page.locator('#lab-tab-kick').click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:25000});
    const procedural=await page.evaluate(()=>({athlete:window.__KICKLAB_DIRECTION_C__?.status,canvas3d:!!document.querySelector('#cv3')&&getComputedStyle(document.querySelector('#cv3')).display!=='none',overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
    if(procedural.athlete!=='flag-off'||!procedural.canvas3d||procedural.overflow>1)throw new Error(`Procedural 3D fallback failed (${JSON.stringify(procedural)})`);
    const screenshot=join(output,'fallback-procedural-3d.png');await page.locator('.stage').screenshot({path:screenshot});report.fallbacks.push({label:'procedural-3d',...procedural,screenshot});await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();watch(page,'reduced-motion');await enterKick(page);const reduced=await state(page);if(!reduced.athlete?.reducedMotion||!/^ready/.test(reduced.athlete.status))throw new Error('Reduced-motion athlete failed');const screenshot=join(output,'reduced-motion.png');await page.locator('.stage').screenshot({path:screenshot});report.fallbacks.push({label:'reduced-motion',status:reduced.athlete.status,screenshot});await context.close();
}finally{await browser.close();writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
if(report.states.length!==27||report.externalRequests.length||report.errors.length)throw new Error(JSON.stringify({states:report.states.length,errors:report.errors,externalRequests:report.externalRequests}));
console.log(JSON.stringify({states:report.states.length,fallbacks:report.fallbacks.length,errors:report.errors.length,externalRequests:report.externalRequests.length,report:join(output,'report.json')},null,2));
