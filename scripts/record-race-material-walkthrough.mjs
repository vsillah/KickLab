import {createRequire} from 'node:module';
import {existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out=resolve('qa-artifacts/race-material-walkthrough');mkdirSync(out,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({headless:true,executablePath,args:['--enable-webgl']});
const rows=[],errors=[],external=[];
const base='http://127.0.0.1:4173/kicklab.html';
const run=(command,args)=>{const result=spawnSync(command,args,{encoding:'utf8'});if(result.status!==0)throw Error(`${command}: ${result.stderr.slice(-1800)}`);return result.stdout;};
try{
  for(const venue of ['highland','marine','forest'])for(const [viewport,width,height] of [['phone',390,844],['desktop',1440,900]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:{dir:out,size:{width,height}}});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(`${venue}/${viewport}: ${error.message}`));
    await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d',ch:{fight:0,race:0,kick:0},play:{fight:'ch',race:'ch',kick:'ch'}}));localStorage.setItem('impactlab.nick','Race QA');});
    await page.route('**/*',async route=>{const url=new URL(route.request().url());
      if(url.origin===new URL(base).origin&&url.pathname==='/kicklab.html'){
        const response=await route.fetch();let html=await response.text(),end=html.lastIndexOf('</script>'),close=html.lastIndexOf('})();',end);
        if(close<0)throw Error('QA hook insertion failed');
        html=html.slice(0,close)+'globalThis.__KICKLAB_MATERIAL_QA__={Race,RACE_3D};\n'+html.slice(close);
        return route.fulfill({response,body:html});
      }
      if(url.origin===new URL(base).origin||['blob:','data:'].includes(url.protocol))return route.continue();
      external.push(url.href);return route.abort();
    });
    const url=new URL(base);url.searchParams.set('raceProgression','prototype');url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',head);
    await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    await page.click('#lab-tab-race');
    await page.waitForFunction(()=>globalThis.__KICKLAB_RACE_3D__?.vehicle===true,undefined,{timeout:20000});
    await page.evaluate(id=>{const {Race,RACE_3D}=globalThis.__KICKLAB_MATERIAL_QA__;
      Race.opt.venue=id;Race.state='run';Object.assign(Race.st,{x:44,y:0,th:0,v:0,t:2});Race.inp.gas=false;Race.inp.brake=false;
      RACE_3D.orbit={phase:'done',elapsed:0,transition:0,done:true};if(RACE_3D.orbitPanel)RACE_3D.orbitPanel.hidden=true;
      RACE_3D.cameraPose=null;RACE_3D.trackKey='';
    },venue);
    await page.waitForFunction(id=>globalThis.__KICKLAB_RACE_3D__?.status==='rendering'&&globalThis.__KICKLAB_RACE_3D__?.venue===id&&globalThis.__KICKLAB_RACE_3D__?.dynamics?.state==='run',venue);
    await page.evaluate(({venue,viewport})=>{const label=document.createElement('div');label.textContent=`${venue.toUpperCase()} · ${viewport.toUpperCase()}`;Object.assign(label.style,{position:'fixed',top:'255px',left:'50%',transform:'translateX(-50%)',zIndex:'99999',padding:'5px 12px',borderRadius:'8px',background:'rgba(7,21,38,.88)',color:'#fff',font:'700 14px system-ui',letterSpacing:'.08em',pointerEvents:'none'});document.body.append(label);},{venue,viewport});
    await page.keyboard.down('Space');await page.waitForTimeout(4800);await page.keyboard.up('Space');
    const audit=await page.evaluate(()=>globalThis.__KICKLAB_RACE_3D__);
    rows.push({venue,viewport,audit});
    if(audit.status!=='rendering'||!audit.vehicle||audit.dynamics.x<=44)errors.push(`${venue}/${viewport}: renderer or driving failed`);
    const video=page.video();await context.close();
    const raw=await video.path(),clip=join(out,`${venue}-${viewport}.mp4`);
    run('ffmpeg',['-y','-loglevel','error','-sseof','-4.4','-i',raw,'-t','4.2','-vf','fps=30','-an','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',clip]);
    console.log(`recorded ${venue}/${viewport}`);
  }
}finally{await browser.close();}
if(errors.length||external.length)throw Error(JSON.stringify({errors,external}));
const segments=[];
for(const venue of ['highland','marine','forest']){
  const segment=join(out,`${venue}-pair.mp4`),phone=join(out,`${venue}-phone.mp4`),desktop=join(out,`${venue}-desktop.mp4`);
  const filter='[0:v]crop=390:634:0:210,scale=404:720:force_original_aspect_ratio=decrease,pad=404:720:(ow-iw)/2:(oh-ih)/2:color=0x071526,setsar=1[p];[1:v]crop=900:690:270:210,scale=876:720:force_original_aspect_ratio=decrease,pad=876:720:(ow-iw)/2:(oh-ih)/2:color=0x071526,setsar=1[d];[p][d]hstack=inputs=2[out]';
  run('ffmpeg',['-y','-loglevel','error','-i',phone,'-i',desktop,'-filter_complex',filter,'-map','[out]','-t','4.0','-an','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',segment]);segments.push(segment);
}
const list=join(out,'segments.txt');writeFileSync(list,segments.map(path=>`file '${path.replaceAll("'","'\\''")}'`).join('\n')+'\n');
const mp4=join(out,`race-material-fidelity-${head.slice(0,12)}.mp4`);
run('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',mp4]);
const probe=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,nb_frames','-of','json',mp4]));
if(statSync(mp4).size<100000||Number(probe.format.duration)<11.5||probe.streams?.[0]?.width!==1280||probe.streams?.[0]?.height!==720)throw Error(`Invalid walkthrough: ${JSON.stringify(probe)}`);
writeFileSync(join(out,'report.json'),JSON.stringify({head,mp4,probe,rows,errors,external},null,2)+'\n');
console.log(JSON.stringify({head,mp4,bytes:statSync(mp4).size,probe,errors,external},null,2));
