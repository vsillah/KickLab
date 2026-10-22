import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://127.0.0.1:5864/kicklab.html';
const out = resolve(process.argv[3] || 'qa-artifacts/race-start-finish');
const head = process.env.KICKLAB_QA_HEAD || 'qa';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: [process.env.KICKLAB_CHROMIUM_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path)) });
const report = { head, cases: [], errors: [], external: [] };
const sizes = [[360,780],[390,844],[768,1024],[942,958],[1113,988],[1440,900]].filter(([width])=>!process.env.KICKLAB_QA_WIDTHS||process.env.KICKLAB_QA_WIDTHS.split(',').includes(String(width)));

async function inspect(name,width,height,{reduced=false,canvas=false}={}) {
  const context = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:1, reducedMotion:reduced?'reduce':'no-preference' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${name}: ${url}`);route.abort();});
  try {
    const url = new URL(base);url.searchParams.set('raceCornerTrace','prototype');url.searchParams.set('rev',head);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    if(canvas)await page.evaluate(()=>window.__KICKLAB_RACE_START_FINISH_QA__.useCanvas());
    await page.click('#lab-tab-race');
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const toast=page.locator('.toast-close:visible').first();if(await toast.count())await toast.evaluate(button=>button.click());
    if(canvas){
      await page.keyboard.down('Space');
      const before=await page.evaluate(()=>({state:window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_READ__().race.state,canvas:window.__KICKLAB_RACE_3D__?.canvas!==true}));
      await page.keyboard.up('Space');
      await page.locator('.stage').screenshot({path:join(out,`${name}-canvas.png`)});
      if(!before.canvas||before.state!=='count')throw new Error(`Canvas fallback unavailable: ${JSON.stringify(before)}`);
      await page.waitForFunction(()=>window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_READ__().race.state==='run',null,{timeout:7000});
      if(!await page.evaluate(()=>window.__KICKLAB_RACE_START_FINISH_QA__.approach()))throw new Error('Canvas finish approach fixture refused');
      await page.waitForFunction(()=>window.__KICKLAB_RACE_NAVIGATION__?.finishVisible,null,{timeout:5000});
      await page.locator('.stage').screenshot({path:join(out,`${name}-finish-approach.png`)});
      if(!await page.evaluate(()=>window.__KICKLAB_RACE_START_FINISH_QA__.cross()))throw new Error('Canvas finish crossing fixture refused');
      await page.waitForFunction(()=>window.__KICKLAB_LIVE_PHYSICS_COMBO_QA_READ__().race.state==='done',null,{timeout:5000});
      report.cases.push({name,canvas:true,before,finished:true});return;
    }
    await page.locator('.race-orbit-panel button').waitFor({state:'visible',timeout:10000});
    const orbit=await page.evaluate(()=>({state:window.__KICKLAB_RACE_3D__?.dynamics?.state,phase:window.__KICKLAB_RACE_3D__?.orbit?.phase,lights:window.__KICKLAB_RACE_3D__?.startLights?.phase,inputs:window.__KICKLAB_RACE_3D__?.dynamics?.inputs}));
    if(orbit.state!=='grid'||orbit.phase!=='orbit'||orbit.lights!=='ready')throw new Error(`Orbit state: ${JSON.stringify(orbit)}`);
    await page.click('.race-orbit-panel button');
    await page.waitForFunction(()=>window.__KICKLAB_RACE_START_LIGHTS__?.phase==='3',null,{timeout:12000});
    const phases=[];
    for(const phase of ['3','2','1','go']){
      await page.waitForFunction(phase=>window.__KICKLAB_RACE_START_LIGHTS__?.phase===phase,phase,{timeout:7000});
      const state=await page.evaluate(()=>({lights:window.__KICKLAB_RACE_START_LIGHTS__,state:window.__KICKLAB_RACE_3D__?.dynamics?.state,blocked:window.__KICKLAB_RACE_3D__?.orbit?.done&&window.__KICKLAB_RACE_3D__?.dynamics?.state==='grid',pacing:!document.querySelector('#gamePacingOverlay').hidden,overlay:document.querySelector('#gamePacingOverlay').dataset.presentation,car:{x:window.__KICKLAB_RACE_3D__?.dynamics?.x,y:window.__KICKLAB_RACE_3D__?.dynamics?.y}}));
      const expected={3:[true,false,false],2:[true,true,false],1:[true,true,false],go:[true,true,true]}[phase];
      if(JSON.stringify(state.lights.lamps)!==JSON.stringify(['red','yellow','green'].map((color,index)=>({color,lit:expected[index],hex:expected[index]?[0xff4f46,0xffcb47,0x62ff9e][index]:0x33414c})))||state.lights.lit!==expected.filter(Boolean).length||state.lights.go!==(phase==='go')||state.state!=='grid'||!state.blocked||state.overlay!=='race-start')throw new Error(`${phase}: ${JSON.stringify(state)}`);
      if(phase==='3'){await page.keyboard.down('Space');await page.waitForTimeout(60);await page.keyboard.up('Space');const blocked=await page.evaluate(()=>window.__KICKLAB_RACE_3D__?.dynamics);if(blocked.state!=='grid'||blocked.inputs.gas||Math.abs(blocked.x-state.car.x)>.01||Math.abs(blocked.y-state.car.y)>.01)throw new Error(`Countdown accepted throttle: ${JSON.stringify(blocked)}`);}
      phases.push(state);
      if(phase==='2'||phase==='go')await page.locator('.stage').screenshot({path:join(out,`${name}-${phase}.png`)});
    }
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='run'&&document.querySelector('#gamePacingOverlay').hidden,null,{timeout:7000});
    const go=await page.evaluate(()=>({state:window.__KICKLAB_RACE_3D__?.dynamics?.state,lights:window.__KICKLAB_RACE_3D__?.startLights?.phase,finish:window.__KICKLAB_RACE_3D__?.finish,canonical:window.__KICKLAB_RACE_3D__?.finish?.canonical}));
    if(go.lights!=='go'||JSON.stringify(go.finish.canonical)!==JSON.stringify(go.canonical)||JSON.stringify(go.finish.world)!==JSON.stringify(go.canonical))throw new Error(`GO/finish world mismatch: ${JSON.stringify(go)}`);
    await page.evaluate(()=>window.__KICKLAB_RACE_START_FINISH_QA__.approach());
    await page.waitForFunction(()=>window.__KICKLAB_RACE_NAVIGATION__?.finishVisible&&!!document.querySelector('#raceNavigationFinish')?.getAttribute('d'),null,{timeout:7000});
    const approach=await page.evaluate(()=>({world:window.__KICKLAB_RACE_3D__.finish.world,map:window.__KICKLAB_RACE_NAVIGATION__.finish,visible:window.__KICKLAB_RACE_NAVIGATION__.finishVisible,path:document.querySelector('#raceNavigationFinish').getAttribute('d'),overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)}));
    if(JSON.stringify(approach.world)!==JSON.stringify(approach.map)||approach.overflow)throw new Error(`Finish map mismatch/overflow: ${JSON.stringify(approach)}`);
    await page.locator('.stage').screenshot({path:join(out,`${name}-finish-approach.png`)});
    await page.evaluate(()=>window.__KICKLAB_RACE_START_FINISH_QA__.cross());
    await page.waitForFunction(()=>window.__KICKLAB_RACE_3D__?.dynamics?.state==='done',null,{timeout:5000});
    report.cases.push({name,width,height,reduced,orbit,phases:phases.map(({lights,state,blocked})=>({lights,state,blocked})),go,approach,finished:true});
  } catch(error){report.errors.push(`${name}: ${error.stack||error}`);} finally {await context.close();}
}

try{for(const [width,height] of sizes)await inspect(`width-${width}`,width,height);if(!process.env.KICKLAB_QA_WIDTHS){await inspect('phone-reduced',390,844,{reduced:true});await inspect('phone-canvas',390,844,{canvas:true});}}finally{await browser.close();}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,cases:report.cases.map(({name,finished,canvas})=>({name,finished,canvas})),errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
