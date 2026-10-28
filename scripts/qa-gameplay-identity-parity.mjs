import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const base=process.argv[2]||'http://127.0.0.1:5198/kicklab.html';
const out=resolve(process.argv[3]||`qa-artifacts/gameplay-identity-parity/${head.slice(0,12)}`);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const ids=['rocket','wiz','tower','trick','cannon'];
const viewports=[['phone',390,844],['tablet',768,1024],['laptop',1113,834],['desktop',1440,900]];
const report={head,base,checks:[],errors:[],external:[],videos:[]};
try{
  for(const [name,width,height] of viewports)for(const id of ids)for(const lab of ['fight','kick'])for(const variant of lab==='kick'?['3d','2d','direction-c']:['canvas']){
    const tag=lab==='kick'?`${lab}-${variant}`:lab;
    const video=name==='desktop'&&['canvas','3d'].includes(variant)&&['rocket','trick'].includes(id);
    const context=await browser.newContext({viewport:{width,height},reducedMotion:name==='phone'?'reduce':'no-preference',recordVideo:video?{dir:out,size:{width,height}}:undefined});
    await context.addInitScript(({id})=>{localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'qa',legacyProfileId:'qa',profiles:[{id:'qa',nickname:`QA ${id}`,avatar:id,color:'sky',progress:{gfx:variant==='2d'?'2d':'3d'},needsSetup:false}]}));}, {id,variant});
    const page=await context.newPage(),errors=[],url=new URL(base);
    url.searchParams.set('rev',head);url.searchParams.set('qa','gameplay-identity-parity');url.searchParams.set('wardrobeResultsQA','1');
    if(variant==='direction-c'){url.searchParams.set('renderer','direction-c');url.searchParams.set('quality','full');}
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${name}/${id}/${tag}: ${target}`);route.abort();}});
    try{
      await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
      await page.locator(`#lab-tab-${lab}`).click();
      await page.locator('#game-cockpit').waitFor({state:'visible',timeout:20000});
      await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
      if(variant==='direction-c')await page.waitForFunction(()=>['ready','ready-reduced-motion'].includes(window.__KICKLAB_DIRECTION_C__?.status),null,{timeout:20000});
      const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,hud:document.querySelector('#hudProfileAvatar .driver-avatar-image')?.getAttribute('src'),canvas:!!document.querySelector('#fboard canvas, #fboard'),fight:window.__KICKLAB_FIGHT_IDENTITY_AUDIT__,kick:window.__KICKLAB_GAMEPLAY_IDENTITY_AUDIT__,kickCanvas:window.__KICKLAB_KICK_CANVAS_IDENTITY_AUDIT__,direction:window.__KICKLAB_DIRECTION_C__?.playerIdentity}));
      const expected=`assets/players/${lab==='fight'?'v2':'v1'}/${lab}/${id}.webp`;
      if(state.hud!==expected||state.overflow>1||!state.canvas)throw Error(`active state ${JSON.stringify(state)}; expected ${expected}`);
      if(lab==='fight'&&state.fight?.avatar!==id)throw Error(`Fight body identity ${JSON.stringify(state.fight)}`);
      if(lab==='kick'&&variant==='3d'&&(state.kick?.avatar!==id||!state.kick.head||Math.abs(state.kick.head[0])>=1||Math.abs(state.kick.head[1])>=1))throw Error(`Kick 3D body visibility ${JSON.stringify(state.kick)}`);
      if(lab==='kick'&&variant==='2d'&&state.kickCanvas?.avatar!==id)throw Error(`Kick Canvas body identity ${JSON.stringify(state.kickCanvas)}`);
      if(variant==='direction-c'&&(state.direction?.avatar!==id||state.kick?.renderer!=='direction-c'||!state.kick.head||Math.abs(state.kick.head[0])>=1||Math.abs(state.kick.head[1])>=1))throw Error(`Kick Direction C body identity ${JSON.stringify(state)}`);
      await page.locator('#game-cockpit').screenshot({path:join(out,`${name}-${id}-${tag}-active.png`)});
      if(video)await page.waitForTimeout(850);
      const fixture=await page.evaluate(lab=>window.__KICKLAB_WARDROBE_RESULTS_QA__?.fixture(lab),lab);
      if(!fixture)throw Error('result fixture missing');
      const result=await page.locator('#resultPlayer .driver-avatar-image').getAttribute('src');
      if(result!==expected)throw Error(`result portrait ${result}; expected ${expected}`);
      await page.locator('#game-cockpit').screenshot({path:join(out,`${name}-${id}-${tag}-result.png`)});
      if(video)await page.waitForTimeout(850);
      if(errors.length)throw Error(`page errors: ${errors.join(' | ')}`);
      report.checks.push({viewport:name,width,height,id,lab,variant,overflow:state.overflow,reducedMotion:name==='phone',active:true,result:true});
    }catch(error){report.errors.push(`${name}/${id}/${tag}: ${error.stack||error}`);}
    const recording=page.video();await context.close();if(recording){const destination=join(out,`${name}-${id}-${tag}.webm`);copyFileSync(await recording.path(),destination);report.videos.push(destination);}
  }
  const switching=await browser.newContext({viewport:{width:1113,height:834}});
  await switching.addInitScript(()=>{if(!localStorage.getItem('kicklab.profiles.v1'))localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'first',legacyProfileId:'first',profiles:[{id:'first',nickname:'First',avatar:'rocket',progress:{gfx:'3d'},needsSetup:false},{id:'second',nickname:'Second',avatar:'trick',progress:{gfx:'3d'},needsSetup:false}]}));});
  const switchPage=await switching.newPage(),switchUrl=new URL(base);
  switchUrl.searchParams.set('rev',head);switchUrl.searchParams.set('qa','gameplay-identity-parity');switchUrl.searchParams.set('wardrobeResultsQA','1');
  switchPage.on('pageerror',error=>report.errors.push(`profile switch: ${error.message}`));
  await switchPage.route('**/*',route=>{const target=route.request().url();if(target.startsWith(switchUrl.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`profile switch: ${target}`);route.abort();}});
  try{
    await switchPage.goto(switchUrl.toString());await switchPage.locator('#lab-tab-fight').click();await switchPage.locator('#gamePacingOverlay').waitFor({state:'hidden'});
    if(await switchPage.evaluate(()=>window.__KICKLAB_FIGHT_IDENTITY_AUDIT__?.avatar)!=='rocket')throw Error('initial Fight identity mismatch');
    await switchPage.locator('#profileBtn').click();await switchPage.locator('#profileList [data-profile-id="second"]').click();await switchPage.locator('#profileClose').click();
    await switchPage.waitForFunction(()=>window.__KICKLAB_FIGHT_IDENTITY_AUDIT__?.avatar==='trick');
    await switchPage.reload();await switchPage.locator('#lab-tab-kick').click();await switchPage.locator('#gamePacingOverlay').waitFor({state:'hidden'});
    await switchPage.waitForFunction(()=>window.__KICKLAB_GAMEPLAY_IDENTITY_AUDIT__?.avatar==='trick');
    await switchPage.evaluate(()=>window.__KICKLAB_WARDROBE_RESULTS_QA__?.fixture('kick'));
    if(await switchPage.locator('#resultPlayer .driver-avatar-image').getAttribute('src')!=='assets/players/v1/kick/trick.webp')throw Error('reloaded result identity mismatch');
    report.checks.push({profileSwitch:true,from:'rocket',to:'trick',fightBody:true,kickReloadBody:true,kickResult:true});
  }catch(error){report.errors.push(`profile switch: ${error.stack||error}`);}
  await switching.close();
}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,external:report.external,videos:report.videos,out},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
