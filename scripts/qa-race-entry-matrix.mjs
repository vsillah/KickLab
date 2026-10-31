// Exact-head lifecycle matrix for the loaded-home Race entry change.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Exact-head matrix requires a clean worktree.');
const origin=process.env.KICKLAB_QA_ORIGIN||'http://127.0.0.1:47777';
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const results=[];
const home=label=>`${origin}/kicklab.html?qa=${label}&rev=${head}`;
async function open(label,{width=1280,height=720,gfx='3d',reduce=false,corrupt=false,flagged=false}={}){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:reduce?'reduce':'no-preference'});
  await context.addInitScript(({gfx,corrupt})=>{localStorage.setItem('impactlab.v1',corrupt?'{broken':JSON.stringify({gfx,ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));},{gfx,corrupt});
  const page=await context.newPage(),errors=[],external=[],documents=[];let offline=false;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{const url=request.url();if(offline&&request.isNavigationRequest())documents.push(url);if(!url.startsWith(origin+'/')&&!url.startsWith('blob:')&&!url.startsWith('data:'))external.push(url);});
  let url=home(label);if(flagged){const target=new URL(url);for(const [key,value] of Object.entries({raceSystems:'proxy',raceTelemetry:'prototype',raceCornerTrace:'prototype',raceProgression:'prototype',raceExpansion:'prototype',raceCompetition:'prototype',raceChampionship:'prototype',raceMultiplayer:'prototype',raceSimulator:'prototype',racePreflight:'prototype'}))target.searchParams.set(key,value);url=target.href;}
  await page.goto(url,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#modeHome').waitFor({state:'visible'});
  return{context,page,errors,external,documents,offline:async()=>{offline=true;await context.setOffline(true);},close:async()=>context.close()};
}
const check=(name,value)=>{if(!value)throw Error(name);};
try{
  for(const item of [
    {lab:'fight',width:390,height:844,gfx:'2d',reduce:true},
    {lab:'kick',width:768,height:1024,gfx:'2d',reduce:true},
    {lab:'race',width:390,height:844,gfx:'2d',reduce:true},
    {lab:'race',width:1440,height:900,gfx:'3d',reduce:false},
    {lab:'race',width:1024,height:768,gfx:'3d',reduce:false,corrupt:true}
  ]){
    const label=`offline-${item.lab}-${item.width}${item.corrupt?'-corrupt':''}`,run=await open(label,item);
    try{
      await run.offline();await run.page.locator(`#lab-tab-${item.lab}`).click();
      check(`${label}: mode`,await run.page.evaluate(()=>document.documentElement.dataset.kicklabMode)===item.lab);
      check(`${label}: document request`,run.documents.length===0);
      if(item.lab==='race'){
        await run.page.locator('#racePreflight').waitFor({state:'visible',timeout:8000});
        check(`${label}: flag`,new URL(run.page.url()).searchParams.get('racePreflight')==='prototype');
        if(item.reduce)check(`${label}: reduced motion`,await run.page.locator('#racePreflight video').count()===0);
        await run.page.locator('#racePreflightClose').click();
        await run.page.locator('#game-cockpit').waitFor({state:'visible'});
        if(item.gfx==='2d')check(`${label}: Canvas fallback`,await run.page.evaluate(()=>{const canvas=document.querySelector('#cv'),webgl=document.querySelector('#race3');return !!canvas&&getComputedStyle(canvas).display!=='none'&&(!webgl||getComputedStyle(webgl).display==='none');}));
      }else await run.page.locator('#game-cockpit').waitFor({state:'visible'});
      const overflow=await run.page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      check(`${label}: overflow`,overflow<=1);
      check(`${label}: errors or egress`,run.errors.length===0&&run.external.length===0);
      results.push({label,mode:item.lab,overflow,documentRequests:run.documents.length,errors:run.errors,external:run.external});
    }finally{await run.close();}
  }
  for(const flagged of [false,true]){
    const label=flagged?'direct-flagged':'direct-unflagged',run=await open(label,{width:1113,height:834,flagged});
    try{
      await run.page.locator('#lab-tab-race').click();await run.page.locator('#racePreflight').waitFor({state:'visible'});
      check(`${label}: route`,new URL(run.page.url()).searchParams.get('racePreflight')==='prototype');
      if(flagged){await run.page.locator('#racePreflightClose').click();await run.page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.status==='rendering',null,{timeout:15000});check(`${label}: WebGL`,await run.page.locator('#race3').isVisible());}
      check(`${label}: errors or egress`,run.errors.length===0&&run.external.length===0);
      results.push({label,url:run.page.url(),errors:run.errors,external:run.external});
    }finally{await run.close();}
  }
  const run=await open('history-older',{width:1113,height:834});
  try{
    await run.page.goto(home('history-current'),{waitUntil:'domcontentloaded'});
    await run.page.locator('#lab-tab-race').click();await run.page.locator('#racePreflight').waitFor({state:'visible'});
    const current=run.page.url();await run.page.goBack({waitUntil:'domcontentloaded'});
    check('history back',run.page.url()===home('history-older'));
    await run.page.goForward({waitUntil:'domcontentloaded'});
    check('history forward',run.page.url()===current);
    results.push({label:'history',back:home('history-older'),forward:current});
  }finally{await run.close();}
  console.log(JSON.stringify({head,results},null,2));
}finally{await browser.close();}
