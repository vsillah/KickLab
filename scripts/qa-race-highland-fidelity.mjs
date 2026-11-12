import {createRequire} from 'node:module';
import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const label=process.argv[2]||'review';
const out=resolve('qa-artifacts/race-highland-fidelity',label);
const base=process.env.QA_BASE||'http://127.0.0.1:4973/kicklab.html';
const origin=new URL(base).origin;
const states=[
  ['starting-grid',P=>[0,0,0,0]],['launch',P=>[24,0,0,9]],
  ['straight-speed',P=>[P.L-38,0,0,25]],['braking-approach',P=>[P.L-9,0,0,14]],
  ['corner-apex',P=>[P.L+P.R*.7071,P.R*(1-.7071),Math.PI/4,12]],
  ['recovery-finish',P=>[P.L+P.R,P.R+24,Math.PI/2,16]]
];
const views=process.env.QA_FAST?[[390,844],[1440,900]]:[[360,800],[390,844],[768,1024],[1113,834],[1440,900]];
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath,args:['--enable-webgl']});
const rows=[],errors=[],external=[];
try{
  for(const [width,height] of views)for(const motion of ['normal','reduced'])for(const fidelity of [false,true]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:motion==='reduced'?'reduce':'no-preference'});
    await context.addInitScript(()=>localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}})));
    const page=await context.newPage();const prefix=`${width}x${height}/${motion}/${fidelity?'on':'off'}`;
    page.on('pageerror',error=>errors.push(`${prefix}: ${error.message}`));
    page.on('request',request=>{const url=new URL(request.url());if(url.origin!==origin&&!['blob:','data:'].includes(url.protocol))external.push(url.href);});
    await page.route('**/kicklab.html*',async route=>{const response=await route.fetch();let html=await response.text();const close=html.lastIndexOf('})();');if(close<0)throw Error('Game script not found');html=html.slice(0,close)+'globalThis.__KL_HIGHLAND_QA__={Race,RACE_3D,best,PAUSE};\n'+html.slice(close);return route.fulfill({response,body:html});});
    const url=new URL(base);url.searchParams.set('raceSystems','proxy');url.searchParams.set('raceProgression','prototype');url.searchParams.set('rev',head);if(fidelity)url.searchParams.set('raceHighlandFidelity','prototype');
    await page.goto(url.href,{waitUntil:'domcontentloaded'});if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');await page.click('#lab-tab-race');
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.vehicle===true,undefined,{timeout:20000});
    await page.evaluate(()=>{const {Race,RACE_3D,best}=globalThis.__KL_HIGHLAND_QA__;best.raceModes.selected='hill';Race.opt.venue='highland';Race.state='run';Race.inp.gas=false;Race.inp.brake=false;Race.st.v=0;RACE_3D.orbit={phase:'done',elapsed:0,transition:0,done:true};if(RACE_3D.orbitPanel)RACE_3D.orbitPanel.hidden=true;RACE_3D.trackKey='';});
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.status==='rendering'&&globalThis.__KICKLAB_RACE_3D__?.venue==='highland');
    const P=await page.evaluate(()=>{const {Race,PAUSE}=globalThis.__KL_HIGHLAND_QA__;const p=Race.P();PAUSE.on=true;return{L:p.L,R:p.R};});
    for(const [name,pose] of states){const frame=await page.evaluate(([x,y,heading,speed])=>{const {Race,RACE_3D}=globalThis.__KL_HIGHLAND_QA__;Race.st.x=x;Race.st.y=y;Race.st.th=heading;Race.st.v=speed;Race.st.wheel=0;Race.st.t=2;Race.inp.gas=false;Race.inp.brake=false;RACE_3D.cameraPose=null;RACE_3D.speedMotion=null;RACE_3D.wheelSpin=0;RACE_3D.render(0);return RACE_3D.canvas.toDataURL('image/png');},pose(P));
      if(width===390||width===1440){const shot=join(out,`${prefix.replaceAll('/','-')}-${name}.png`);writeFileSync(shot,Buffer.from(frame.split(',')[1],'base64'));}
      const audit=await page.evaluate(()=>globalThis.__KICKLAB_RACE_3D__);rows.push({width,height,motion,fidelity,state:name,audit:{status:audit?.status,venue:audit?.venue,vehicle:audit?.vehicle,assetUrl:audit?.assetUrl,dynamics:audit?.dynamics,gpuMemory:audit?.gpuMemory},overflow:await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth))});
    }
    const performance=await page.evaluate(async()=>{const {RACE_3D,PAUSE}=globalThis.__KL_HIGHLAND_QA__;PAUSE.on=false;const intervals=await new Promise(resolve=>{const samples=[];let prior=0;function sample(now){if(prior)samples.push(now-prior);prior=now;if(samples.length<95)requestAnimationFrame(sample);else resolve(samples.slice(15));}requestAnimationFrame(sample);});intervals.sort((a,b)=>a-b);return{p95Ms:+intervals[Math.floor(intervals.length*.95)].toFixed(2),medianMs:+intervals[Math.floor(intervals.length*.5)].toFixed(2),gpuMemory:{...RACE_3D.renderer.info.memory},dpr:RACE_3D.renderer.getPixelRatio(),scale:RACE_3D.visualPressure?.scale??1};});
    rows.push({width,height,motion,fidelity,state:'performance',performance});
    await context.close();
  }
}catch(error){errors.push(error.stack||String(error));}finally{await browser.close();}
const report={head,label,payloadBytes:statSync(resolve('dist/kicklab.html')).size,rows,errors,external};
for(const [width,height] of views)for(const motion of ['normal','reduced'])for(const [name] of states){
  const off=rows.find(row=>row.width===width&&row.height===height&&row.motion===motion&&!row.fidelity&&row.state===name);
  const on=rows.find(row=>row.width===width&&row.height===height&&row.motion===motion&&row.fidelity&&row.state===name);
  if(off&&on&&(JSON.stringify(off.audit.dynamics)!==JSON.stringify(on.audit.dynamics)||off.audit.assetUrl!==on.audit.assetUrl))errors.push(`${width}x${height}/${motion}/${name}: gameplay or vehicle changed`);
}
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,label,rows:rows.length,errors,external,payloadBytes:report.payloadBytes},null,2));
if(errors.length||external.length||rows.length!==views.length*2*2*(states.length+1)||rows.some(row=>row.audit&&(row.audit.status!=='rendering'||!row.audit.vehicle||row.overflow)))process.exitCode=1;
