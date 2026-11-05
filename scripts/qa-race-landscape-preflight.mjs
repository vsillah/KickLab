import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:4318/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/race-landscape-preflight');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report=[];

async function bounds(page,label){
  const result=await page.evaluate(()=>{
    const box=selector=>{const element=document.querySelector(selector),rect=element?.getBoundingClientRect();return rect&&{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,height:rect.height};};
    return{viewport:{width:innerWidth,height:innerHeight},dialog:box('#racePreflight'),content:box('#racePreflightContent'),footer:box('.race-preflight-footer'),back:box('#racePreflightBack'),next:box('#racePreflightNext'),scrollHeight:document.querySelector('#racePreflightContent')?.scrollHeight,clientHeight:document.querySelector('#racePreflightContent')?.clientHeight,horizontalOverflow:document.documentElement.scrollWidth-innerWidth};
  });
  const {height,width}=result.viewport;
  if(!result.dialog||result.content.height<100||result.footer.bottom>height+1||result.back.bottom>height+1||result.next.bottom>height+1||result.back.left<0||result.next.right>width+1||result.horizontalOverflow>1)throw Error(`${label}: clipped preflight ${JSON.stringify(result)}`);
  return result;
}

async function enter(page){
  await page.goto(base,{waitUntil:'domcontentloaded'});
  if(await page.locator('#introContinue').isVisible())await page.locator('#introContinue').click();
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-race').click();
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
}

try{
  for(const [name,width,height,motion] of [['iphone-landscape',844,390,'no-preference'],['iphone-short',812,375,'reduce'],['iphone-tall-landscape',932,430,'reduce'],['iphone-portrait',390,844,'reduce'],['ipad-landscape',1180,820,'reduce'],['browser-mid',900,600,'no-preference']]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,recordVideo:name==='iphone-landscape'?{dir:out,size:{width,height}}:undefined});
    const page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===new URL(base).origin||['data:','blob:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
    await enter(page);
    const phases=[];
    phases.push({name:'location',bounds:await bounds(page,`${name} location`)});
    await page.locator('[data-preflight-venue="highland"]').click();
    await page.locator('[data-preflight-mode="drag"]').click();
    phases.push({name:'route',bounds:await bounds(page,`${name} route`)});
    await page.screenshot({path:join(out,`${name}-route.png`)});
    await page.locator('#racePreflightNext').click();
    phases.push({name:'vehicle',bounds:await bounds(page,`${name} vehicle`)});
    await page.locator('[data-preflight-vehicle="cobalt"]').click();
    await page.screenshot({path:join(out,`${name}-vehicle.png`)});
    await page.locator('#racePreflightNext').click();
    phases.push({name:'tuning',bounds:await bounds(page,`${name} tuning`)});
    await page.locator('[data-preflight-part="tires"]').first().click();
    await page.screenshot({path:join(out,`${name}-tuning.png`)});
    await page.locator('#racePreflightNext').click();
    phases.push({name:'grid',bounds:await bounds(page,`${name} grid`)});
    await page.locator('[data-preflight-control="classic"]').click();
    await page.screenshot({path:join(out,`${name}-grid.png`)});
    await page.locator('#racePreflightBack').click();
    if((await page.locator('#racePreflightTitle').innerText())!=='Tune in the Garage')throw Error(`${name}: Back did not return to tuning`);
    await page.locator('#racePreflightNext').click();
    let raceStart=null;
    if(name==='iphone-landscape'){
      raceStart=await page.evaluate(()=>{
        const dialog=document.querySelector('#racePreflight'),overlay=document.querySelector('#gamePacingOverlay');
        dialog.hidden=true;overlay.hidden=false;overlay.dataset.state='countdown';overlay.dataset.presentation='race-start';
        const r=overlay.querySelector('.game-pacing-card').getBoundingClientRect();
        const result={top:r.top,bottom:r.bottom,left:r.left,right:r.right};
        overlay.hidden=true;dialog.hidden=false;
        return result;
      });
      if(raceStart.top<0||raceStart.bottom>height+1||raceStart.left<0||raceStart.right>width+1)throw Error(`${name}: countdown card clipped ${JSON.stringify(raceStart)}`);
      await page.locator('#racePreflightNext').click();
      await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
    }else{
      await page.locator('#racePreflightClose').click();
      await page.locator('#racePreflight').waitFor({state:'hidden'});
    }
    let startCue=null;
    if(await page.locator('#raceStageStart').isVisible()){
      startCue=await page.locator('#raceStageStart').evaluate(node=>{const card=node.querySelector('.race-stage-start-card').getBoundingClientRect(),action=node.querySelector('#raceCoachSetupStart').getBoundingClientRect();return{card:{top:card.top,bottom:card.bottom,left:card.left,right:card.right},action:{top:action.top,bottom:action.bottom,left:action.left,right:action.right}};});
      if(name.startsWith('iphone-')&&(startCue.card.top<0||startCue.card.bottom>height+1||startCue.action.bottom>height+1||startCue.action.left<0||startCue.action.right>width+1))throw Error(`${name}: start cue clipped ${JSON.stringify(startCue)}`);
      await page.screenshot({path:join(out,`${name}-start-cue.png`)});
    }
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#lab-tab-race').click();
    await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
    const relaunch=await bounds(page,`${name} relaunch`);
    let rotation=null;
    if(name==='iphone-landscape'){
      await page.setViewportSize({width:390,height:844});
      const portrait=await bounds(page,'rotation portrait');
      await page.setViewportSize({width:844,height:390});
      const landscape=await bounds(page,'rotation landscape');
      rotation={portraitContentHeight:portrait.content.height,landscapeContentHeight:landscape.content.height};
    }
    if(errors.length||external.length)throw Error(`${name}: errors or egress ${JSON.stringify({errors,external})}`);
    report.push({name,width,height,motion,phases:phases.map(({name,bounds})=>({name,contentHeight:bounds.content.height,footerBottom:bounds.footer.bottom})),startCue,raceStart,relaunchContentHeight:relaunch.content.height,rotation,errors,external});
    await context.close();
  }
  writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
