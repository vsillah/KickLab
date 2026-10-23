import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5878/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-route-followup');
const target=Number(process.argv.find(arg=>arg.startsWith('--target='))?.slice(9)||35);
const chosen=process.argv.find(arg=>arg.startsWith('--cases='))?.slice(8).split(',')||['drag-classic','drag-analog','drift-classic','drift-analog'];
const reduced=process.argv.includes('--reduced');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={base,revision:process.env.KICKLAB_QA_HEAD||'working',target,reducedMotion:reduced,caseResults:[],errors:[],external:[]};

async function prepare(page,mode,analog){
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  const skip=page.locator('.race-orbit-panel button');if(await skip.isVisible())await skip.click();
  await page.locator('#raceCoachSetup').waitFor({state:'visible',timeout:20000});
  await page.click('#raceCoachSetupGarage');await page.locator(`[data-race-mode="${mode}"]`).click();await page.click('#settingsClose');
  if(analog)await page.click('#raceCoachSetupControls');
  if(mode==='drift')await page.click('#raceCoachSetupSteering');
  const dismiss=page.getByRole('button',{name:'Dismiss Profile saved'});if(await dismiss.isVisible())await dismiss.click();
}

async function capture(page,name,label,result){
  const state=await page.evaluate(()=>({...globalThis.__KICKLAB_RACE_MODES_QA__.state(),overflow:document.documentElement.scrollWidth-innerWidth}));
  const file=join(output,`${name}-${label}.png`);await page.locator('.stage').screenshot({path:file});
  result.captures.push({label,file,state});return state;
}

for(const name of chosen){
  const [mode,control]=name.split('-'),analog=control==='analog',width=analog?390:960,height=analog?844:720;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:output,size:{width,height}}});
  const page=await context.newPage(),result={name,captures:[],events:[]};
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  let gas=false,brake=false,pointer=false,stick=null;
  async function analogInput(kind){if(!stick)stick=await page.locator('#analogStick').boundingBox();if(!stick)throw new Error('Analog stick hidden');const x=stick.x+stick.width/2,y=stick.y+stick.height*(kind==='gas'?.08:kind==='brake'?.92:.5);if(!pointer){await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();pointer=true;}await page.mouse.move(x,y,{steps:2});}
  async function drive(kind){if(analog){await analogInput(kind);return;}const nextGas=kind==='gas',nextBrake=kind==='brake';if(nextGas!==gas){await page.keyboard[nextGas?'down':'up']('Space');gas=nextGas;}if(nextBrake!==brake){await page.keyboard[nextBrake?'down':'up']('b');brake=nextBrake;}}
  try{
    const url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',report.revision);await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    await prepare(page,mode,analog);const setup=await capture(page,name,'setup',result);await page.click('#raceCoachSetupStart');
    for(const phase of ['red','yellow','green']){await page.waitForFunction(expected=>{const state=globalThis.__KICKLAB_RACE_MODES_QA__.state();return state.phase==='count'&&state.lightPhase===expected;},phase,{timeout:2000});if(phase==='red')await page.keyboard.down('Space');const state=await capture(page,name,`light-${phase}`,result);if(state.speedKmh!==0||state.x!==setup.x||state.reviewSettled||!state.canvasFallback&&state.startLamps!==1)throw new Error(`Countdown light or position failed: ${JSON.stringify(state)}`);}
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_MODES_QA__.state().phase==='run',null,{timeout:2000});const launch=await capture(page,name,'launch',result);await page.keyboard.up('Space');if(launch.speedKmh!==0||launch.x!==setup.x||!launch.canvasFallback&&(launch.startLamps!==0||launch.visibleBulbs!==0))throw new Error(`Countdown input or gantry lights carried through green: ${JSON.stringify(launch)}`);
    if(mode==='drag'){
      await drive('gas');const thresholds=[46,88,132];let shifted=0,approach=false,speedShot=false;
      for(let i=0;i<90;i++){
        await page.waitForTimeout(200);const state=await page.evaluate(()=>globalThis.__KICKLAB_RACE_MODES_QA__.state());
        if(state.phase==='done'||state.phase==='crashed')break;
        if(!speedShot&&state.speedKmh>=95){const high=await capture(page,name,'speed',result);speedShot=true;if(!reduced&&(!high.cinematic||high.cinematic.fieldOfView<=55||high.cinematic.roadsideReflectors<1||high.cinematic.streakOpacity))throw new Error(`Drag speed treatment absent: ${JSON.stringify(high.cinematic)}`);if(reduced&&high.cinematic&&(high.cinematic.fieldOfView!==55||high.cinematic.roll||high.cinematic.heave||high.cinematic.streakOpacity))throw new Error('Reduced motion kept camera motion or streaks');}
        if(!approach&&state.x>=228){await capture(page,name,'approach',result);approach=true;}
        if(shifted<thresholds.length&&state.speedKmh>=thresholds[shifted]){
          if(pointer){await page.mouse.up();pointer=false;}
          await page.locator('#raceTelemetryShift').click({timeout:5000});shifted++;
          if(analog)await drive('gas');
        }
      }
      await drive('neutral');if(pointer){await page.mouse.up();pointer=false;}
      const crossing=await capture(page,name,'crossing',result);await page.waitForTimeout(1200);const runoff=await capture(page,name,'runoff',result);await page.waitForTimeout(1800);const settled=await capture(page,name,'result',result);
      if(crossing.phase!=='done'||!crossing.result?.pass||crossing.reviewSettled||runoff.reviewSettled||!settled.reviewSettled||Math.abs(runoff.lineError)>1||runoff.x<=crossing.x||settled.x<=runoff.x||settled.x>390)throw new Error(`Drag crossing/runoff failed: ${JSON.stringify({crossing,runoff,settled})}`);
    }else{
      let lastZone=-1,lastSpin=0,approach=false;for(let i=0;i<210;i++){
        const state=await page.evaluate(()=>globalThis.__KICKLAB_RACE_MODES_QA__.state());
        if(state.zone!==lastZone){lastZone=state.zone;result.events.push({zone:state.zone,elapsed:state.elapsed,speedKmh:state.speedKmh,lineError:state.lineError});if([1,2,3,4].includes(state.zone))await capture(page,name,`zone-${state.zone}`,result);}
        if(state.spinCount!==lastSpin){lastSpin=state.spinCount;result.events.push({spinCount:lastSpin,zone:state.zone,elapsed:state.elapsed,speedKmh:state.speedKmh});}
        if(state.phase==='done'||state.phase==='crashed')break;
        if(!approach&&state.zone===4&&state.x>=203){await capture(page,name,'approach',result);approach=true;}
        await drive(state.speedKmh<target-1?'gas':'neutral');await page.waitForTimeout(200);
      }
      await drive('neutral');if(pointer){await page.mouse.up();pointer=false;}
      const crossing=await capture(page,name,'crossing',result);await page.waitForTimeout(1200);const runoff=await capture(page,name,'runoff',result);await page.waitForTimeout(1800);const settled=await capture(page,name,'result',result);
      if(crossing.phase!=='done'||!crossing.result?.pass||crossing.reviewSettled||runoff.reviewSettled||!settled.reviewSettled||crossing.driftCurvePoints.some(points=>points<50)||Math.abs(runoff.lineError)>1||runoff.x<=crossing.x||settled.x<runoff.x)throw new Error(`Drift crossing/runoff failed: ${JSON.stringify({crossing,runoff,settled})}`);
    }
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{if(pointer)await page.mouse.up();const video=page.video();await context.close();if(video)result.video=await video.path();report.caseResults.push(result);}
}
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({cases:report.caseResults.map(item=>({name:item.name,events:item.events,captures:item.captures.map(c=>({label:c.label,phase:c.state.phase,result:c.state.result,lineError:c.state.lineError,x:c.state.x,y:c.state.y}))})),errors:report.errors,external:report.external,output},null,2));if(report.errors.length||report.external.length||report.caseResults.some(item=>item.captures.some(c=>c.state.overflow>1)))process.exitCode=1;
