import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5878/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-route-followup');
const target=Number(process.argv.find(arg=>arg.startsWith('--target='))?.slice(9)||35);
const chosen=process.argv.find(arg=>arg.startsWith('--cases='))?.slice(8).split(',')||['drag-classic','drag-analog','drift-classic','drift-analog'];
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const report={base,revision:process.env.KICKLAB_QA_HEAD||'working',target,caseResults:[],errors:[],external:[]};

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
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:{dir:output,size:{width,height}}});
  const page=await context.newPage(),result={name,captures:[],events:[]};
  page.on('pageerror',error=>report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  let gas=false,brake=false,pointer=false,stick=null;
  async function analogInput(kind){if(!stick)stick=await page.locator('#analogStick').boundingBox();if(!stick)throw new Error('Analog stick hidden');const x=stick.x+stick.width/2,y=stick.y+stick.height*(kind==='gas'?.08:kind==='brake'?.92:.5);if(!pointer){await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();pointer=true;}await page.mouse.move(x,y,{steps:2});}
  async function drive(kind){if(analog){await analogInput(kind);return;}const nextGas=kind==='gas',nextBrake=kind==='brake';if(nextGas!==gas){await page.keyboard[nextGas?'down':'up']('Space');gas=nextGas;}if(nextBrake!==brake){await page.keyboard[nextBrake?'down':'up']('b');brake=nextBrake;}}
  try{
    const url=new URL(base);url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',report.revision);await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    await prepare(page,mode,analog);await capture(page,name,'setup',result);await page.click('#raceCoachSetupStart');await page.locator('#raceTelemetry').waitFor({state:'visible',timeout:10000});await page.waitForTimeout(2500);
    if(mode==='drag'){
      await drive('gas');const thresholds=[46,88,132];let shifted=0;
      for(let i=0;i<90;i++){
        await page.waitForTimeout(200);const state=await page.evaluate(()=>globalThis.__KICKLAB_RACE_MODES_QA__.state());
        if(state.phase==='done'||state.phase==='crashed')break;
        if(shifted<thresholds.length&&state.speedKmh>=thresholds[shifted]){
          if(pointer){await page.mouse.up();pointer=false;}
          await page.locator('#raceTelemetryShift').click({timeout:5000});shifted++;
          if(analog)await drive('gas');
        }
      }
      await drive('neutral');if(pointer){await page.mouse.up();pointer=false;}
      const trap=await capture(page,name,'trap',result);await page.waitForTimeout(5500);const coast=await capture(page,name,'coast',result);
      if(trap.phase!=='done'||!trap.result?.pass||coast.phase!=='done'||Math.abs(coast.lineError)>1||coast.x<=trap.x||coast.x>390)throw new Error(`Drag finish/coast failed: ${JSON.stringify({trap,coast})}`);
    }else{
      let lastZone=-1,lastSpin=0;for(let i=0;i<210;i++){
        const state=await page.evaluate(()=>globalThis.__KICKLAB_RACE_MODES_QA__.state());
        if(state.zone!==lastZone){lastZone=state.zone;result.events.push({zone:state.zone,elapsed:state.elapsed,speedKmh:state.speedKmh,lineError:state.lineError});if([1,2,3,4].includes(state.zone))await capture(page,name,`zone-${state.zone}`,result);}
        if(state.spinCount!==lastSpin){lastSpin=state.spinCount;result.events.push({spinCount:lastSpin,zone:state.zone,elapsed:state.elapsed,speedKmh:state.speedKmh});}
        if(state.phase==='done'||state.phase==='crashed')break;
        await drive(state.speedKmh<target-1?'gas':'neutral');await page.waitForTimeout(200);
      }
      await drive('neutral');if(pointer){await page.mouse.up();pointer=false;}
      const finish=await capture(page,name,'finish',result);
      if(finish.phase!=='done'||!finish.result?.pass||finish.driftCurvePoints.some(points=>points<50)||Math.abs(finish.lineError)>1)throw new Error(`Drift run failed: ${JSON.stringify(finish)}`);
    }
  }catch(error){report.errors.push(`${name}: ${error.stack||error}`);}finally{if(pointer)await page.mouse.up();const video=page.video();await context.close();if(video)result.video=await video.path();report.caseResults.push(result);}
}
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({cases:report.caseResults.map(item=>({name:item.name,events:item.events,captures:item.captures.map(c=>({label:c.label,phase:c.state.phase,result:c.state.result,lineError:c.state.lineError,x:c.state.x,y:c.state.y}))})),errors:report.errors,external:report.external,output},null,2));if(report.errors.length||report.external.length||report.caseResults.some(item=>item.captures.some(c=>c.state.overflow>1)))process.exitCode=1;
