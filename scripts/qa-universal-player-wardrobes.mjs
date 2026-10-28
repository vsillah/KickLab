import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const base=process.argv[2]||'http://127.0.0.1:5198/kicklab.html';
const out=resolve(process.argv[3]||`qa-artifacts/universal-player-wardrobes/${head.slice(0,12)}`);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,base,checks:[],errors:[],external:[],videos:[]};
const viewports=[['phone',390,844,'touch'],['tablet',768,1024,'keyboard'],['laptop',1113,834,'pointer'],['desktop',1440,900,'pointer']];
const portraitPath=(lab,id)=>lab==='race'?`assets/drivers/v2/${id}.webp`:`assets/players/${lab==='fight'?'v2':'v1'}/${lab}/${id}.webp`;
async function inspect(page,selector,expected){
  const image=page.locator(`${selector} .driver-avatar-image`).first();
  await image.waitFor({state:'attached'});
  await image.evaluate(node=>node.decode());
  const value=await image.evaluate(node=>({src:node.getAttribute('src'),loaded:node.complete&&node.naturalWidth>0}));
  if(value.src!==expected||!value.loaded)throw Error(`${selector}: ${JSON.stringify(value)}; expected ${expected}`);
}
async function activate(page,selector,input){
  const control=page.locator(selector);
  if(input==='touch')await control.tap();
  else if(input==='keyboard'){await control.focus();await page.keyboard.press('Enter');}
  else await control.click();
}
try{
  for(const [name,width,height,input] of viewports){
    const context=await browser.newContext({viewport:{width,height},hasTouch:input==='touch',reducedMotion:name==='phone'?'reduce':'no-preference',recordVideo:name==='desktop'?{dir:out,size:{width,height}}:undefined});
    await context.addInitScript(()=>{localStorage.setItem('impactlab.nick','Pilot Fox');localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d',xp:725,punch:2100,goals:3,stats:{plays:{fight:2,race:2,kick:2}},ch:{fight:0,race:0,kick:0}}));});
    const page=await context.newPage(),url=new URL(base),errors=[];
    url.searchParams.set('rev',head);url.searchParams.set('qa','universal-player-wardrobes');
    url.searchParams.set('raceSystems','proxy');url.searchParams.set('raceExpansion','prototype');url.searchParams.set('racePreflight','prototype');url.searchParams.set('raceMultiplayer','prototype');url.searchParams.set('raceResultsQA','1');url.searchParams.set('wardrobeResultsQA','1');
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${name}: ${target}`);route.abort();}});
    try{
      await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
      if(await page.locator('#profileForm').isVisible())await page.locator('#profileFormSave').click();
      if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
      for(const lab of ['fight','race','kick'])await inspect(page,`[data-lab-player="${lab}"]`,portraitPath(lab,'rocket'));
      await inspect(page,'#homeProfileAvatar',portraitPath('race','rocket'));
      if(name==='desktop')await page.screenshot({path:join(out,'desktop-home.png')});
      await activate(page,'#homeProfileButton',input);
      for(const lab of ['overview','fight','race','kick']){
        await activate(page,`[data-profile-lab="${lab}"]`,input);
        if(lab==='overview')for(const activity of ['fight','race','kick'])await inspect(page,`.profile-lab-card:has(h3:text-is("${activity[0].toUpperCase()+activity.slice(1)}"))`,portraitPath(activity,'rocket'));
        else await inspect(page,'.profile-lab-feature',portraitPath(lab,'rocket'));
        if(name==='desktop'){await page.screenshot({path:join(out,`desktop-${lab}.png`)});await page.waitForTimeout(1100);}
      }
      if(name==='desktop'){
        await activate(page,'#profileCreate',input);await page.locator('#profileNickname').fill('Second Star');await activate(page,'[data-avatar="tower"]',input);await activate(page,'#profileFormSave',input);
        await inspect(page,'.profile-lab-feature',portraitPath('kick','tower'));
        const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')));
        if(stored.profiles.length!==2||stored.profiles[0].progress.xp!==725||stored.profiles[1].progress.xp)throw Error('profile isolation or migration failed');
        await activate(page,`[data-profile-id="${stored.profiles[0].id}"]`,input);await inspect(page,'.profile-lab-feature',portraitPath('kick','rocket'));
      }
      await activate(page,'#profileClose',input);
      for(const lab of ['fight','race','kick']){
        await activate(page,`#lab-tab-${lab}`,input);
        await page.locator('#game-cockpit').waitFor({state:'visible',timeout:20000});
        await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
        if(lab==='race'&&await page.locator('#racePreflightClose').isVisible())await activate(page,'#racePreflightClose',input);
        await inspect(page,'#hudProfileAvatar',portraitPath(lab,'rocket'));
        if(lab==='race'){
          await inspect(page,'#raceIdentitySeats',portraitPath('race','rocket'));
          const result=await page.evaluate(()=>window.__KICKLAB_RACE_RESULTS_QA__?.fixture('failed'));
          if(!result?.profileId)throw Error('Race result fixture unavailable');
          await inspect(page,'#resultPlayer',portraitPath('race','rocket'));
          if(name==='desktop')await page.screenshot({path:join(out,'desktop-race-result.png')});
        }else{
          const result=await page.evaluate(lab=>window.__KICKLAB_WARDROBE_RESULTS_QA__?.fixture(lab),lab);
          if(!result)throw Error(`${lab} result fixture unavailable`);
          await inspect(page,'#resultPlayer',portraitPath(lab,'rocket'));
          if(name==='desktop')await page.screenshot({path:join(out,`desktop-${lab}-result.png`)});
        }
        report.checks.push({name,width,height,input,lab,portrait:true});
        await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
        if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
      }
      const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,profile:JSON.parse(localStorage.getItem('kicklab.profiles.v1')),legacy:JSON.parse(localStorage.getItem('impactlab.v1')),nick:localStorage.getItem('impactlab.nick')}));
      if(state.overflow>1||state.profile.profiles[0].avatar!=='rocket'||state.nick!=='Pilot Fox'||!state.legacy)throw Error(`storage/layout ${JSON.stringify(state).slice(0,500)}`);
      if(errors.length)throw Error(`page errors: ${errors.join(' | ')}`);
      report.checks.push({name,storage:true,overflow:state.overflow,reducedMotion:name==='phone',canvasFallback:true});
      const video=page.video();await context.close();if(video){const destination=join(out,'identity-three-labs.webm');copyFileSync(await video.path(),destination);report.videos.push(destination);}
    }catch(error){report.errors.push(`${name}: ${error.stack||error}`);await context.close();}
  }
}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,external:report.external,videos:report.videos,out},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
