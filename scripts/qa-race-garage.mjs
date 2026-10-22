import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5865/kicklab.html',out=resolve(process.argv[3]||'qa-artifacts/race-garage'),head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={head,cases:[],errors:[],external:[]};
const sizes=[[360,780],[390,844],[768,1024],[942,958],[1113,988],[1440,900]].filter(([width])=>!process.env.KICKLAB_QA_WIDTHS||process.env.KICKLAB_QA_WIDTHS.split(',').includes(String(width)));

async function inspect(width,height,{reduced=false,canvas=false,analog=false}={}){
  const name=`${width}${reduced?'-reduced':''}${canvas?'-canvas':''}${analog?'-analog':''}`;
  const input=width===360?'touch':width===390&&!reduced&&!canvas&&!analog?'keyboard-enter':width===768?'keyboard-space':'pointer';
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',hasTouch:input==='touch',isMobile:input==='touch'}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  try{
    const url=new URL(base);url.searchParams.set('raceCornerTrace','prototype');url.searchParams.set('rev',head);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    if(canvas)await page.evaluate(()=>window.__KICKLAB_RACE_START_FINISH_QA__.useCanvas());
    await page.click('#lab-tab-race');
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const toast=page.locator('.toast-close:visible').first();if(await toast.count())await toast.evaluate(button=>button.click());
    if(analog)await page.click('#analogControlsButton');
    await page.click('#orientationDetailToggle');
    const direct=await page.evaluate(()=>{const button=document.querySelector('#raceGarageShortcut'),panel=document.querySelector('#orientationDetail'),rect=button.getBoundingClientRect(),frame=panel.getBoundingClientRect();return{visible:!!button.getClientRects().length,hidden:button.hidden,allLabs:!!document.querySelector('#modeHomeButton').getClientRects().length,settings:!!document.querySelector('#settingsToggle').getClientRects().length,within:rect.left>=frame.left&&rect.right<=frame.right&&rect.top>=frame.top&&rect.bottom<=frame.bottom,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)};});
    if(!direct.visible||direct.hidden||!direct.allLabs||!direct.settings||!direct.within||direct.overflow)throw new Error(`Garage direct entry: ${JSON.stringify(direct)}`);
    await page.locator('#orientationDetail').screenshot({path:join(out,`${name}-direct-entry.png`)});
    const shortcut=page.locator('#raceGarageShortcut');
    if(input==='touch'){const rect=await shortcut.boundingBox();await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);}
    else if(input.startsWith('keyboard')){await shortcut.focus();await page.keyboard.press(input==='keyboard-space'?'Space':'Enter');}
    else await shortcut.click();
    await page.locator('#raceGarage').waitFor({state:'visible'});
    if(await page.locator('#orientationDetail').isVisible()||!await page.locator('#settingsDrawer').isVisible())throw new Error('Direct action did not replace Lab controls with Garage');
    await page.click('#settingsBack');
    if(!await page.locator('#settingsCategories [data-category="garage"]').isVisible())throw new Error('Garage missing from Settings category path');
    await page.click('#settingsCategories [data-category="garage"]');
    const initial=await page.evaluate(()=>({level:document.querySelector('#settingsTitle').textContent,build:window.__KICKLAB_RACE_GARAGE__?.build,summary:!document.querySelector('#raceGarageSummary').hidden,scrollWidth:document.documentElement.scrollWidth,innerWidth,focus:document.activeElement?.dataset.garagePart||''}));
    if(initial.level!=='Garage & tuning'||!initial.summary||initial.scrollWidth>initial.innerWidth+1)throw new Error(`Garage entry: ${JSON.stringify(initial)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-stock.png`)});
    const lessonSnapshots={};
    const choose=async(field,value)=>{await page.click(`#raceGarage [data-garage-section="${field}"]`);
      const taught=await page.evaluate(field=>{const model=window.__KICKLAB_RACE_GARAGE__,node=document.querySelector(`#garage-lesson-${field}`),toggle=document.querySelector(`#raceGarage [data-garage-section="${field}"]`),r=node.getBoundingClientRect(),drawer=document.querySelector('#settingsDrawer').getBoundingClientRect();return{model:model.lesson,text:node.textContent,visible:!node.hidden,within:r.left>=drawer.left&&r.right<=drawer.right+1,toggleHeight:toggle.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth+1};},field);
      if(!taught.visible||!taught.within||taught.overflow||width<=480&&taught.toggleHeight<44||!taught.model.formula.every(line=>taught.text.includes(line))||!['reading','how','when','tradeoff'].every(key=>taught.text.includes(taught.model[key])))throw new Error(`${field} instruction: ${JSON.stringify(taught)}`);
      lessonSnapshots[field]=taught.model;
      await page.click(`#raceGarage [data-garage-part="${field}"][data-garage-value="${value}"]`);
      const selected=await page.evaluate(field=>{const model=window.__KICKLAB_RACE_GARAGE__,node=document.querySelector(`#garage-lesson-${field}`),option=node.parentElement.querySelector('.garage-option[aria-pressed="true"]');return{lesson:model.lesson,text:node.textContent,optionHeight:option?.getBoundingClientRect().height};},field);
      if(!selected.text.includes(selected.lesson.reading)||width<=480&&selected.optionHeight<44)throw new Error(`${field} selected instruction: ${JSON.stringify(selected)}`);
    };
    const suspension=[];
    for(const value of ['soft','balanced','firm']){
      await choose('suspension',value);
      suspension.push(await page.evaluate(()=>({choice:window.__KICKLAB_RACE_GARAGE__.build.suspension,stock:window.__KICKLAB_RACE_GARAGE__.stock,current:window.__KICKLAB_RACE_GARAGE__.current,summary:document.querySelector('#raceGarageSummary').innerText,visible:document.querySelector('#raceGarageSummary').getBoundingClientRect().bottom<=innerHeight+1})));
    }
    if(suspension.some(item=>!item.visible||item.stock.steeringResponse!==1||item.stock.slideRecovery!==1)||!(suspension[0].current.steeringResponse<suspension[1].current.steeringResponse&&suspension[1].current.steeringResponse<suspension[2].current.steeringResponse)||!(suspension[0].current.slideRecovery>suspension[1].current.slideRecovery&&suspension[1].current.slideRecovery>suspension[2].current.slideRecovery)||!suspension[2].summary.includes('118%')||!suspension[2].summary.includes('78%'))throw new Error(`Suspension comparison: ${JSON.stringify(suspension)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-suspension-firm.png`)});
    await choose('suspension','balanced');
    for(const [field,value] of [['body','race'],['suspension','firm'],['tires','wide'],['brakes','sport']]){
      await choose(field,value);
      const applied=await page.evaluate(({field,value})=>({selected:window.__KICKLAB_RACE_GARAGE__?.build?.[field],pressed:document.querySelector(`#raceGarage [data-garage-part="${field}"][data-garage-value="${value}"]`)?.getAttribute('aria-pressed'),focus:document.activeElement?.dataset.garagePart,summary:document.querySelector('#raceGarageSummary').getBoundingClientRect().bottom<=innerHeight+1}),{field,value});
      if(applied.selected!==value||applied.pressed!=='true'||!applied.summary)throw new Error(`${field}: ${JSON.stringify(applied)}`);
    }
    const tuned=await page.evaluate(()=>({build:window.__KICKLAB_RACE_GARAGE__.build,current:window.__KICKLAB_RACE_GARAGE__.current,stock:window.__KICKLAB_RACE_GARAGE__.stock,summary:document.querySelector('#raceGarageSummary').innerText,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)}));
    if(tuned.current.launch<=tuned.stock.launch||tuned.current.corner<=tuned.stock.corner||tuned.overflow)throw new Error(`No tuned physics or overflow: ${JSON.stringify(tuned)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-tuned.png`)});
    const expectedCoach=await page.evaluate(()=>window.__KICKLAB_RACE_GARAGE__.lesson);
    await page.keyboard.press('Escape');if(await page.locator('#settingsDrawer').isVisible())throw new Error('Escape did not close settings');
    const coachToast=page.locator('#toasts .toast').filter({hasText:'Coach Nia'}).last();await coachToast.waitFor({state:'visible'});
    if(!await coachToast.getByRole('button',{name:'Open Coach'}).isVisible()||!await coachToast.innerText().then(text=>text.includes(expectedCoach.coach)))throw new Error('Coach toast disagrees with selected tune');
    await coachToast.getByRole('button',{name:'Open Coach'}).click();
    const coachDetail=await page.locator('#garageCoachMessage').innerText();
    if(!await page.locator('#learnDetail').isVisible()||!await page.locator('#garageCoachDetail').isVisible()||![...expectedCoach.formula,expectedCoach.reading,expectedCoach.when,expectedCoach.tradeoff].every(item=>coachDetail.includes(item)))throw new Error('Coach detail disagrees with selected tune');
    await page.locator('#learnDetail [data-close-detail]').click();
    if(await page.locator('#learnDetail').isVisible()||!await page.locator('#learnDetailToggle').evaluate(element=>document.activeElement===element))throw new Error('Coach detail focus return failed');
    if(!canvas){if(await page.locator('.race-orbit-panel button').isVisible())await page.click('.race-orbit-panel button');}
    else {await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('Space');await page.keyboard.up('Space');}
    await page.waitForFunction(()=>window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_READ__().race.state==='run',null,{timeout:15000});
    if(analog)await page.click('#controllerCollapseButton');
    const live=await page.evaluate(()=>({state:window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_READ__().race.state,params:window.__KICKLAB_RACE_GARAGE_QA__.read().parameters,style:document.querySelector('#analogControlsButton').getAttribute('aria-pressed'),collapsed:document.querySelector('#controllerCollapseButton').getAttribute('aria-expanded'),telemetry:window.__KICKLAB_RACE_TELEMETRY__?.enabled===true}));
    if(live.state!=='run'||live.params.brakePower<=1||live.params.mu<=.9||(!canvas&&!live.telemetry))throw new Error(`Live Race parameters: ${JSON.stringify(live)}`);
    if(width===390&&!reduced&&!canvas&&!analog){
      await page.click('#profileBtn');const originalId=await page.locator('#profileList [aria-current="true"]').getAttribute('data-profile-id');
      await page.click('#profileCreate');await page.fill('#profileNickname','QA Driver');await page.click('#profileFormSave');
      const fresh=await page.evaluate(()=>({build:window.__KICKLAB_RACE_GARAGE_QA__.read().build,coachNotice:[...document.querySelectorAll('#toasts .toast')].some(node=>node.getAttribute('aria-label')==='Coach Nia')}));
      if(fresh.build.body!=='street'||fresh.build.suspension!=='balanced'||fresh.build.tires!=='balanced'||fresh.build.brakes!=='standard'||fresh.coachNotice)throw new Error(`New player inherited tuning or Coach note: ${JSON.stringify(fresh)}`);
      await page.locator('#profileClose').evaluate(button=>button.click());await page.click('#learnDetailToggle');
      if(await page.locator('#garageCoachDetail').isVisible())throw new Error('Coach detail leaked across players');
      await page.locator('#learnDetail [data-close-detail]').click();await page.click('#profileBtn');await page.click(`#profileList [data-profile-id="${originalId}"]`);
      const restored=await page.evaluate(()=>window.__KICKLAB_RACE_GARAGE_QA__.read().build);
      if(JSON.stringify(restored)!==JSON.stringify(tuned.build))throw new Error(`Original player's tuning did not return: ${JSON.stringify(restored)}`);
      await page.locator('#profileClose').evaluate(button=>button.click());
      for(const lab of ['fight','kick']){
        await page.click('#orientationDetailToggle');await page.click('#modeHomeButton');await page.click(`#lab-tab-${lab}`);
        await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});await page.click('#orientationDetailToggle');
        if(await page.locator('#raceGarageShortcut').isVisible())throw new Error(`Garage shortcut leaked into ${lab}`);
        await page.click('#orientationDetail [data-close-detail="orientation"]');
        await page.click('#profileBtn');await page.click('#profileEdit');await page.click('#profileFormSave');const toastAtSave=await page.locator('#toasts').innerText();await page.locator('#profileClose').evaluate(button=>button.click());
        const profileToast=page.locator('#toasts .toast').filter({hasText:'Profile saved'}).last();
        if(!await profileToast.isVisible()||await page.locator('#garageCoachDetail').isVisible())throw new Error(`${lab} notification regression: ${JSON.stringify({toast:await profileToast.isVisible(),coach:await page.locator('#garageCoachDetail').isVisible(),toasts:await page.locator('#toasts').innerText(),toastAtSave,formMsg:await page.locator('#profileFormMsg').innerText(),formHidden:await page.locator('#profileForm').evaluate(element=>element.hidden),replayBar:await page.locator('#rbar').isVisible(),profileTitle:await page.locator('#profileFormTitle').innerText()})}`);
        await profileToast.getByRole('button',{name:'Dismiss Profile saved'}).click();
      }
    }
    report.cases.push({name,width,height,reduced,canvas,analog,input,direct,initial,lessonSnapshots,suspension,tuned,live});
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
}
try{if(process.env.KICKLAB_QA_ONLY==='canvas')await inspect(390,844,{canvas:true});else{for(const [width,height] of sizes)await inspect(width,height);if(!process.env.KICKLAB_QA_WIDTHS){await inspect(390,844,{reduced:true});await inspect(390,844,{canvas:true});await inspect(390,844,{analog:true});}}}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.map(x=>x.name),errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
