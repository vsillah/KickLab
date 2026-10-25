import {createRequire} from 'node:module';
import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';

// Repeatable visual checkpoint: static active-play pose, unchanged camera and venue.
const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const label=process.argv[2]||'baseline';
const out=resolve('qa-artifacts/race-material-frames',label);
mkdirSync(out,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({headless:true,executablePath,args:['--enable-webgl']});
const rows=[],errors=[],external=[];
try{
  for(const [viewport,width,height] of [['phone',390,844],['desktop',1440,900]])for(const venue of ['highland','marine','forest']){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(`${viewport}/${venue}: ${error.message}`));
    await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:4173'&&url.pathname==='/kicklab.html'){
      const response=await route.fetch();let html=await response.text();const end=html.lastIndexOf('</script>');
      const close=html.lastIndexOf('})();',end);
      if(end<0||close<0)throw Error('Game script not found');
      html=html.slice(0,close)+'globalThis.__KICKLAB_MATERIAL_QA__={Race,RACE_3D};\n'+html.slice(close);
      return route.fulfill({response,body:html});
    }if(url.origin==='http://127.0.0.1:4173'||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
    await page.goto(`http://127.0.0.1:4173/kicklab.html?raceSystems=proxy&raceProgression=prototype&rev=${head}`,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.vehicle===true,undefined,{timeout:20000});
    await page.evaluate(id=>{
      const {Race,RACE_3D}=globalThis.__KICKLAB_MATERIAL_QA__;
      Race.opt.venue=id;
      Race.state='run';
      Race.st.x=44;Race.st.y=0;Race.st.th=0;Race.st.v=0;Race.st.t=2;
      Race.inp.gas=false;Race.inp.brake=false;
      RACE_3D.orbit={phase:'done',elapsed:0,transition:0,done:true};
      if(RACE_3D.orbitPanel)RACE_3D.orbitPanel.hidden=true;
      RACE_3D.cameraPose=null;
      RACE_3D.trackKey='';
    },venue);
    await page.waitForFunction(id=>globalThis.__KICKLAB_RACE_3D__?.status==='rendering'&&globalThis.__KICKLAB_RACE_3D__?.venue===id&&globalThis.__KICKLAB_RACE_3D__?.dynamics?.state==='run',venue);
    await page.waitForTimeout(700);
    const metrics=await page.evaluate(async()=>{
      const times=await new Promise(resolve=>{const values=[];let last=0;function tick(now){if(last)values.push(now-last);last=now;if(values.length<120)requestAnimationFrame(tick);else resolve(values);}requestAnimationFrame(tick);});
      const sorted=times.slice(5).sort((a,b)=>a-b);
      return{frameP95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(2),frameMedianMs:+sorted[Math.floor(sorted.length*.5)].toFixed(2),audit:globalThis.__KICKLAB_RACE_3D__,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)};
    });
    const shot=join(out,`${viewport}-${venue}.png`);
    await page.locator('.stage:visible').first().screenshot({path:shot});
    rows.push({viewport,width,height,venue,shot,...metrics});
    await context.close();
  }
}finally{await browser.close();}
const report={head,label,payloadBytes:statSync(resolve('dist/kicklab.html')).size,rows,errors,external};
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,label,payloadBytes:report.payloadBytes,rows:rows.map(({viewport,venue,frameP95Ms,frameMedianMs,overflow,audit})=>({viewport,venue,frameP95Ms,frameMedianMs,overflow,status:audit?.status,vehicle:audit?.vehicle,shadowMode:audit?.shadowMode})),errors,external},null,2));
if(errors.length||external.length||rows.some(row=>row.audit?.status!=='rendering'||!row.audit.vehicle||row.overflow))process.exitCode=1;
