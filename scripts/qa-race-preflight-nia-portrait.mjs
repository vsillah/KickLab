import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const base=process.argv[2]||'http://127.0.0.1:5274/kicklab.html';
const out=resolve(process.argv[3]||`qa-artifacts/nia-baseline-portrait/${head.slice(0,12)}`);
const video=process.env.QA_VIDEO==='1';
mkdirSync(out,{recursive:true});
const report={head,cases:[],errors:[],external:[]};
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path)),args:['--enable-webgl']});
const flags={raceExpansion:'prototype',raceInstruments:'prototype',raceSystems:'proxy',raceTelemetry:'prototype',raceFinishes:'prototype',raceCoaching:'prototype',raceCoachPersonas:'prototype'};
async function run(width,height,{flagged=false,canvas=false,reduced=false,broken=false}={}){
  const name=`${flagged?'flagged':'baseline'}-${width}${canvas?'-canvas':''}${reduced?'-reduced':''}${broken?'-broken':''}`;
  const record=video&&!canvas&&!reduced&&!broken&&[390,768,1440].includes(width);
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',hasTouch:width<=390,...(record?{recordVideo:{dir:out,size:{width,height}}}:{})});
  await context.addInitScript(useCanvas=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:useCanvas?'2d':'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','QA Driver');},canvas);
  const page=await context.newPage(),url=new URL(base);url.searchParams.set('rev',head.slice(0,12));if(flagged)for(const [key,value] of Object.entries(flags))url.searchParams.set(key,value);
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const target=route.request().url();if(broken&&target.includes('/assets/coaches/v2/nia.webp'))return route.abort();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${target}`);return route.abort();});
  const checks=[];
  async function check(stage,coach='Nia'){
    const nodes=page.locator('#racePreflight .race-preflight-coach-comment:visible .race-preflight-coach-avatar');
    const count=await nodes.count();if(count<1)throw Error(`${name} ${stage}: no visible Coach comment`);
    for(let i=0;i<count;i++){
      const node=nodes.nth(i),label=await node.getAttribute('aria-label'),img=node.locator('img');
      if(label!==`Coach ${coach}, ready`)throw Error(`${name} ${stage}: wrong identity ${label}`);
      if(broken){await page.waitForFunction(element=>!element.querySelector('img'),await node.elementHandle(),{timeout:8000});if(!await node.locator('.race-preflight-coach-initials').isVisible())throw Error(`${name} ${stage}: fallback missing`);}
      else{await page.waitForFunction(element=>element.classList.contains('is-loaded'),await node.elementHandle(),{timeout:8000});const state=await img.evaluate(el=>({width:el.naturalWidth,visible:getComputedStyle(el).visibility,src:el.getAttribute('src')}));if(state.width!==1280||state.visible!=='visible'||!state.src.includes(`/${coach.toLowerCase()}.webp`))throw Error(`${name} ${stage}: ${JSON.stringify(state)}`);}
    }
    checks.push({stage,coach,count});
    if(record){await page.screenshot({path:join(out,`${name}-${stage}.png`)});await page.waitForTimeout(550);}
  }
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    const documentStart=await page.evaluate(()=>performance.timeOrigin);
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');
    await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
    if(!flagged){const gates=await page.evaluate(()=>({personas:KickLabRaceCoachPersonas.enabled,coaching:KickLabRaceContextualCoach.enabled,documentStart:performance.timeOrigin}));if(gates.personas||gates.coaching||gates.documentStart!==documentStart)throw Error(`${name}: default-off or same-document entry regressed ${JSON.stringify(gates)}`);}
    await check('venue');
    if(flagged&&!broken){
      await page.click('#racePreflightCoach');await page.locator('#raceCoachRoster').waitFor({state:'visible'});await page.locator('[data-coach-id="imani"]').click();await page.click('#raceCoachRosterClose');
      await page.waitForFunction(()=>document.querySelector('#racePreflight .race-preflight-coach-avatar')?.getAttribute('aria-label')==='Coach Imani, ready');
      await check('selected','Imani');
    }
    const coach=flagged&&!broken?'Imani':'Nia';
    if(width===390)await page.locator('[data-preflight-venue="highland"]').tap();else await page.locator('[data-preflight-venue="highland"]').click();await check('route',coach);
    if(width===1113){await page.locator('[data-preflight-mode="drag"]').focus();await page.keyboard.press('Enter');}else await page.locator('[data-preflight-mode="drag"]').click();await check('mode',coach);
    const before=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));
    for(const stage of ['vehicle','tuning','grid']){await page.click('#racePreflightNext');await check(stage,coach);}
    const after=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));
    if(before!==after)throw Error(`${name}: preflight navigation mutated profile storage`);
    const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));if(overflow)throw Error(`${name}: horizontal overflow ${overflow}`);
    if(!flagged&&await page.locator('#racePreflightCoach').isVisible())throw Error(`${name}: personality roster became enabled`);
    report.cases.push({name,width,height,flagged,canvas,reduced,broken,checks,storageUnchanged:true,overflow,url:url.toString()});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{
    const raw=record?page.video():null;await context.close();
    if(raw){const source=await raw.path(),target=join(out,`${name}.mp4`);execFileSync('ffmpeg',['-y','-loglevel','error','-i',source,'-an','-c:v','libx264','-pix_fmt','yuv420p','-crf','21','-movflags','+faststart',target]);}
  }
}
for(const [width,height] of [[360,800],[390,844],[768,1024],[1113,834],[1440,900]])for(const flagged of [false,true])await run(width,height,{flagged});
await run(390,844,{canvas:true});await run(390,844,{flagged:true,canvas:true});
await run(390,844,{reduced:true});await run(390,844,{flagged:true,reduced:true});
await run(390,844,{broken:true});
{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),url=new URL(base);
  url.searchParams.set('rev',head.slice(0,12));
  await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))return route.continue();report.external.push(`profile-switch: ${target}`);return route.abort();});
  try{
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId);
    await page.click('#homeProfileButton');await page.click('#profileCreate');await page.fill('#profileNickname','Second Racer');await page.click('#profileFormSave');
    const second=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId);
    if(first===second)throw Error('second profile not created');
    await page.locator(`#profileList [data-profile-id="${first}"]`).click();await page.click('#profileClose');
    await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
    await page.waitForFunction(()=>document.querySelector('#racePreflight .race-preflight-coach-avatar.is-loaded img')?.naturalWidth===1280);
    if(await page.locator('#racePreflight .race-preflight-coach-avatar').first().getAttribute('aria-label')!=='Coach Nia, ready')throw Error('first profile lost Nia');
    await page.reload({waitUntil:'domcontentloaded'});if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#homeProfileButton');await page.locator(`#profileList [data-profile-id="${second}"]`).click();await page.click('#profileClose');
    await page.click('#lab-tab-race');await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
    await page.waitForFunction(()=>document.querySelector('#racePreflight .race-preflight-coach-avatar.is-loaded img')?.naturalWidth===1280);
    if(await page.locator('#racePreflight .race-preflight-coach-avatar').first().getAttribute('aria-label')!=='Coach Nia, ready')throw Error('second profile lost Nia');
    report.cases.push({name:'profile-switch-and-reload',first,second,localPortrait:true});
  }catch(error){report.errors.push(`profile-switch: ${error.stack||error}`);}finally{await context.close();}
}
await browser.close();
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.length,errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
