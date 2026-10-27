import {createRequire} from 'node:module';
import {existsSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const base=process.argv[2]||'http://127.0.0.1:4173/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/mode-aware-profile');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,base,checks:[],errors:[],external:[]};
const viewports=[['phone',390,844,'touch'],['tablet',768,1024,'keyboard'],['laptop',1113,834,'pointer'],['desktop',1440,900,'pointer']];
try{
  for(const [name,width,height,input] of viewports){
    if(process.env.KICKLAB_PROFILE_QA_ONLY&&name!==process.env.KICKLAB_PROFILE_QA_ONLY)continue;
    const context=await browser.newContext({viewport:{width,height},hasTouch:input==='touch',reducedMotion:'reduce',recordVideo:name==='desktop'?{dir:out,size:{width,height}}:undefined});
    await context.addInitScript(()=>{localStorage.setItem('impactlab.nick','Pilot Fox');localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'2d',xp:1250,punch:3010,lap:14.31,goals:6,mWins:2,barHi:120,badges:{f_3k:1,r_finish:2,k_goal:3},ch:{fight:2,race:1,kick:3},stats:{plays:{fight:4,race:5,kick:6},wins:{fight:2,race:3,kick:4}},raceProfileRecords:{version:1,topKmh:156.2,dragSeconds:13.14,driftPoints:234}}));});
    const page=await context.newPage(),url=new URL(base),pageErrors=[];
    url.searchParams.set('rev',head);url.searchParams.set('qa','mode-profile');
    for(const flag of ['raceExpansion','raceProgression','raceCompetition','raceChampionship','raceMultiplayer','racePreflight'])url.searchParams.set(flag,'prototype');
    page.on('pageerror',error=>pageErrors.push(error.message));
    await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(url.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(`${name}: ${target}`);route.abort();}});
    const activate=async selector=>{const item=page.locator(selector);if(input==='touch')await item.tap();else if(input==='keyboard'){await item.focus();await page.keyboard.press('Enter');}else await item.click();};
    try{
      await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
      await activate('#homeProfileButton');
      const overview=await page.locator('#profileSummary').innerText();
      if(!overview.includes('Three labs, one player')||!overview.includes('Fight')||!overview.includes('Race')||!overview.includes('Kick'))throw Error('home overview missing labs');
      await page.screenshot({path:join(out,`${name}-overview.png`)});
      if(name==='desktop')await page.waitForTimeout(900);
      await activate('#profileClose');
      if(input==='keyboard')await page.waitForTimeout(120);
      for(const lab of ['fight','race','kick']){
        await activate(`#lab-tab-${lab}`);
        if(lab==='race')await page.waitForURL(/raceSimulator=prototype/,{timeout:20000});
        await page.locator('#game-cockpit').waitFor({state:'visible',timeout:20000});
        await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
        if(lab==='race'){await page.waitForTimeout(300);if(await page.locator('#racePreflightClose').isVisible())await activate('#racePreflightClose');await activate('#racePhoneToolsToggle');}
        await activate('#profileBtn');
        await page.waitForTimeout(350);
        const state=await page.evaluate(()=>({lab:document.querySelector('#profileLabs [aria-current="true"]')?.dataset.profileLab,text:document.querySelector('#profileSummary').innerText,panel:document.querySelector('.profile-panel').getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth-innerWidth,inside:document.querySelector('#profileSummary').scrollWidth-document.querySelector('#profileSummary').clientWidth,canvas:document.querySelector('#cv')?.getContext('2d')!==null,profileId:JSON.parse(localStorage.getItem('kicklab.profiles.v1')).activeId}));
        if(state.lab!==lab||state.overflow>1||state.inside>1)throw Error(`${lab} layout ${JSON.stringify(state)}`);
        if(lab==='race'&&(/\bball\b|\bboots\b|\bgoals\b|crossbar/i.test(state.text)||!state.text.includes('Selected vehicle')||!state.text.includes('Drag time')||!state.text.includes('Top speed')))throw Error(`Race content leak ${state.text}`);
        if(lab==='fight'&&!state.text.includes('Glove style')||lab==='kick'&&!state.text.includes('Boots'))throw Error(`${lab} content missing`);
        await page.screenshot({path:join(out,`${name}-${lab}.png`)});
        if(name==='desktop'){await page.waitForTimeout(900);await page.locator('.profile-panel').evaluate(panel=>panel.scrollTop=panel.scrollHeight);await page.waitForTimeout(900);}
        report.checks.push({name,width,height,input,lab,profileId:state.profileId,canvas:state.canvas,overflow:state.overflow});
        await activate('#profileClose');
        if(input==='keyboard')await page.waitForTimeout(120);
        if(input==='keyboard'){await page.goto(url.toString(),{waitUntil:'domcontentloaded'});await page.locator('#modeHome').waitFor({state:'visible'});}
        else{await activate('#orientationDetailToggle');await activate('#modeHomeButton');}
      }
      if(name==='desktop'){
        await page.click('#homeProfileButton');
        await page.click('#profileCreate');
        await page.fill('#profileNickname','Second Star');
        await page.click('#profileFormSave');
        await page.click('#profileLabs [data-profile-lab="race"]');
        const second=await page.locator('#profileSummary').innerText();
        if(!second.includes('Second Star')||!second.includes('No record yet')||second.includes('156.2 km/h'))throw Error(`new player leaked Race records: ${second}`);
        await page.click('#profileList [data-profile-id="legacy-player"]');
        const restored=await page.locator('#profileSummary').innerText();
        if(!restored.includes('Pilot Fox')||!restored.includes('156.2 km/h'))throw Error(`original player Race records missing: ${restored}`);
        report.checks.push({name:'profile-switch',isolated:true,restored:true});
        await page.waitForTimeout(900);
        await page.click('#profileClose');
      }
      if(pageErrors.length)throw Error(`page errors ${pageErrors.join(' | ')}`);
      const video=page.video();await context.close();if(video)copyFileSync(await video.path(),join(out,'profile-walkthrough.webm'));
    }catch(error){report.errors.push(`${name}: ${error.stack||error}`);await context.close();}
  }
}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,external:report.external,out},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
