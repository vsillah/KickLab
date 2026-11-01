// Drive the current venue-first Highland Circuit through visible controls on exact product main.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
const cleanPace=process.argv.includes('--clean-pace');
const inputStyle=process.env.KICKLAB_QA_INPUT||'classic';
if(!['classic','analog','simulator'].includes(inputStyle))throw Error('Unknown Race input style');
const analogSafePace=process.env.KICKLAB_QA_ANALOG_SAFE==='1';
if(analogSafePace&&inputStyle!=='analog')throw Error('Analog-safe pace requires Analog input');
const fasterCleanPace=process.env.KICKLAB_QA_FAST_CLEAN==='1';
const balancedCleanPace=process.env.KICKLAB_QA_BALANCED_CLEAN==='1';
if(fasterCleanPace&&balancedCleanPace)throw Error('Select one clean-pace driver');
const args=process.argv.slice(2).filter(arg=>!arg.startsWith('--'));
if(!/^[a-f0-9]{40}$/.test(head||'')||execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim()!==head)throw Error('Bind to exact product main');
const base=new URL(args[0]||'http://127.0.0.1:4173/kicklab.html');
if(!['127.0.0.1','localhost'].includes(base.hostname)||base.pathname!=='/kicklab.html')throw Error('Use trusted localhost Pages');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const artifactSha256=sha(readFileSync('dist/kicklab.html'));
if(sha(Buffer.from(await(await fetch(base)).arrayBuffer()))!==artifactSha256)throw Error('Served artifact differs from exact build');
const out=resolve(args[1]||'qa-artifacts/race-circuit-result');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const width=Number(process.env.KICKLAB_QA_WIDTH||390),height=Number(process.env.KICKLAB_QA_HEIGHT||({360:800,390:844,768:1024,1113:834,1440:900}[width]));
if(!Number.isInteger(width)||!Number.isInteger(height)||width<320||height<600)throw Error('Invalid QA viewport');
const maxSteps=Number(process.env.KICKLAB_QA_MAX_STEPS||300);
if(!Number.isInteger(maxSteps)||maxSteps<300||maxSteps>330)throw Error('QA drive bound must be 300-330 steps');
const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',permissions:[]});
const page=await context.newPage(),report={head,artifactSha256,viewport:{width,height},inputStyle,cleanPace,fasterCleanPace,balancedCleanPace,analogSafePace,maxSteps,events:[],requests:[],initiators:[],errors:[],external:[],httpErrors:[],popups:[],downloads:[]};
page.on('pageerror',error=>report.errors.push(error.message));
page.on('request',request=>{const target=new URL(request.url());report.requests.push({method:request.method(),origin:target.origin,path:target.pathname,type:request.resourceType(),status:null})});
page.on('response',response=>{const target=new URL(response.url()),entry=report.requests.findLast(item=>item.origin===target.origin&&item.path===target.pathname&&item.status===null);if(entry)entry.status=response.status();if(response.status()>=400)report.httpErrors.push(`${response.status()} ${target.pathname}`)});
const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');cdp.on('Network.requestWillBeSent',event=>{const target=new URL(event.request.url),source=event.initiator?.url;report.initiators.push({path:target.pathname,type:event.initiator?.type||'unknown',source:source?new URL(source).pathname:null})});
page.on('popup',popup=>report.popups.push(popup.url()));
page.on('download',download=>report.downloads.push(download.suggestedFilename()));
await page.route('**/*',route=>{const target=route.request().url();if(target.startsWith(base.origin+'/')||target.startsWith('data:')||target.startsWith('blob:'))route.continue();else{report.external.push(target);route.abort()}});
try{
  const url=new URL(base);url.searchParams.set('rev',head);
  for(const flag of ['raceExpansion','raceCornerTrace','raceTelemetry','racePreflight',...(inputStyle==='simulator'?['raceSimulator']:[])])url.searchParams.set(flag,'prototype');
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.click('#lab-tab-race');
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
  await page.locator('[data-preflight-venue="highland"]').click();
  await page.locator('[data-preflight-mode="circuit"]').click();
  if(await page.locator('[data-preflight-mode="circuit"]').getAttribute('aria-pressed')!=='true')throw Error('Circuit not selected');
  for(let step=0;step<3;step++)await page.locator('#racePreflightNext').click();
  if(inputStyle!=='classic'){
    await page.locator(`[data-preflight-control="${inputStyle}"]`).click();
    if(await page.locator(`[data-preflight-control="${inputStyle}"]`).getAttribute('aria-pressed')!=='true')throw Error(`${inputStyle} controller not selected`);
  }
  if((await page.locator('#racePreflightSteer').textContent())?.trim()==='You steer')await page.locator('#racePreflightSteer').click();
  await page.locator('#racePreflightNext').click();
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().phase==='run',null,{timeout:30000});
  const initial=await page.evaluate(()=>window.__KICKLAB_RACE_MODES_QA__.state());
  if(initial.mode!=='circuit')throw Error(`Wrong mode: ${initial.mode}`);
  if(inputStyle==='simulator'&&!await page.locator('#raceSimulator').isVisible())await page.locator('#simulatorControlsButton').click();
  if(inputStyle==='analog'&&!await page.locator('#gestureAction').isVisible())await page.locator('#analogControlsButton').click();
  const pedal={analog:{gas:'#gestureAction',brake:'#raceAnalogActions [data-race-assist="brake"]'},simulator:{gas:'#simGas',brake:'#simBrake'}}[inputStyle];
  if(pedal)for(const selector of Object.values(pedal))if(!await page.locator(selector).isVisible())throw Error(`${inputStyle} input hidden: ${selector}`);
  let touchId=1;
  const holdVisible=async(kind)=>{
    const box=await page.locator(pedal[kind]).boundingBox();if(!box)throw Error(`${kind} target lost`);
    const x=box.x+box.width/2,y=box.y+box.height/2;
    if(width<=768){const id=touchId++;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id,radiusX:4,radiusY:4,force:1}]});await page.waitForTimeout(550);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    else{await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();}
  };
  await page.locator('.stage').screenshot({path:join(out,'circuit-start.png')});
  let lastLap='',wrapped=false,done=false;
  const bendBrakeKmh=analogSafePace?24:cleanPace?(fasterCleanPace?28:balancedCleanPace?26.5:25):68;
  const bendGasKmh=analogSafePace?20:cleanPace?(fasterCleanPace?25:balancedCleanPace?23:21):54;
  const straightGasKmh=analogSafePace?32:cleanPace?(fasterCleanPace?37:balancedCleanPace?34:30):92;
  for(let step=0;step<maxSteps;step++){
    const state=await page.evaluate(()=>({race:window.__KICKLAB_RACE_MODES_QA__.state(),stage:document.querySelector('#raceNavigation')?.dataset.stage||'',lap:document.querySelector('#raceNavigationProgressLabel')?.textContent||'',progress:document.querySelector('#raceNavigationProgress')?.textContent||'',overflow:document.documentElement.scrollWidth-innerWidth}));
    if(state.overflow>1)throw Error(`Horizontal overflow: ${state.overflow}`);
    if(state.lap!==lastLap){report.events.push({step,phase:state.race.phase,lap:state.lap,progress:state.progress,x:state.race.x,speedKmh:state.race.speedKmh});lastLap=state.lap}
    if(state.lap.includes('2/2'))wrapped=true;
    if(['done','crashed'].includes(state.race.phase)){report.final=state;done=true;break}
    const speed=Number(state.race.speedKmh)||0,bend=['brake','turn','apex'].includes(state.stage);
    if(bend&&speed>bendBrakeKmh){
      if(pedal)await holdVisible('brake');else await page.keyboard.press('b',{delay:550});
    }else if(speed<(bend?bendGasKmh:straightGasKmh)){
      if(pedal)await holdVisible('gas');else await page.keyboard.press('Space',{delay:550});
    }
    else await page.waitForTimeout(550);
  }
  if(!done||!wrapped)throw Error(`Circuit did not finish with lap wrap: ${JSON.stringify({done,wrapped,events:report.events})}`);
  await page.locator('#results').waitFor({state:'visible',timeout:10000});
  await page.waitForTimeout(750);
  report.result=await page.evaluate(()=>({title:document.querySelector('#rTitle')?.textContent||'',coach:document.querySelector('#raceResultCoach')?.textContent||'',overflow:document.documentElement.scrollWidth-innerWidth}));
  if(!report.result.title||!report.result.coach.includes('What worked')||!report.result.coach.includes('Next focus')||report.result.overflow>1)throw Error(`Result contract: ${JSON.stringify(report.result)}`);
  if(cleanPace&&!report.final.race.result?.pass)throw Error(`Clean-pace Circuit did not pass: ${JSON.stringify(report.final.race.result)}`);
  await page.locator('#results').screenshot({path:join(out,'circuit-result.png')});
  if(report.final.race.result?.pass===false){
    if((await page.locator('#rNext').innerText()).trim()!=='Retry')throw Error('Failed Circuit has no Retry action');
    await page.locator('#rNext').click();
    report.recovery=await page.evaluate(()=>({resultHidden:document.querySelector('#results').hidden,phase:window.__KICKLAB_RACE_MODES_QA__?.state().phase,mode:window.__KICKLAB_RACE_MODES_QA__?.state().mode,overflow:document.documentElement.scrollWidth-innerWidth}));
    if(!report.recovery.resultHidden||report.recovery.mode!=='circuit'||report.recovery.overflow>1)throw Error(`Retry did not recover Circuit: ${JSON.stringify(report.recovery)}`);
  }
}catch(error){report.errors.push(error.stack||String(error));await page.screenshot({path:join(out,'failure.png')}).catch(()=>{})}
await context.close();await browser.close();
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,artifactSha256,events:report.events,final:report.final&&{phase:report.final.race.phase,mode:report.final.race.mode,result:report.final.race.result},result:report.result,recovery:report.recovery,errors:report.errors,external:report.external,httpErrors:report.httpErrors,popups:report.popups,downloads:report.downloads},null,2));
if(report.errors.length||report.external.length||report.httpErrors.length||report.popups.length||report.downloads.length)process.exitCode=1;
