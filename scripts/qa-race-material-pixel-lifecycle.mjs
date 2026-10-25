import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out=resolve('qa-artifacts/race-material-pixel');mkdirSync(out,{recursive:true});
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8'}).trim();
const originalRotation=adb('shell','settings','get','system','user_rotation');
const originalAuto=adb('shell','settings','get','system','accelerometer_rotation');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
const findPage=()=>browser.contexts().flatMap(context=>context.pages()).find(page=>page.url().includes(`rev=${head}`));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rows=[],errors=[];
async function snapshot(label){const page=findPage();if(!page)throw Error('Exact-head Pixel tab disappeared');const state=await page.evaluate(()=>({width:innerWidth,height:innerHeight,hidden:document.hidden,audit:globalThis.__KICKLAB_RACE_3D__?{status:globalThis.__KICKLAB_RACE_3D__.status,shadowMode:globalThis.__KICKLAB_RACE_3D__.shadowMode,vehicle:globalThis.__KICKLAB_RACE_3D__.vehicle,canvas:globalThis.__KICKLAB_RACE_3D__.canvas}:null}));await page.locator('.stage:visible').first().screenshot({path:join(out,`${label}.png`)});rows.push({label,...state});return state;}
try{
  const initial=await snapshot('before-lifecycle');
  adb('shell','settings','put','system','accelerometer_rotation','0');
  adb('shell','settings','put','system','user_rotation','1');await sleep(2200);
  const landscape=await snapshot('landscape');if(landscape.width<=landscape.height||landscape.audit?.status!=='rendering'||!landscape.audit.vehicle)errors.push('Landscape lost visible WebGL or did not rotate');
  adb('shell','settings','put','system','user_rotation','0');await sleep(2200);
  const portrait=await snapshot('portrait-return');if(portrait.width>=portrait.height||portrait.audit?.status!=='rendering'||!portrait.audit.vehicle)errors.push('Portrait return lost visible WebGL');
  if(initial.audit?.status!=='rendering'||!initial.audit.vehicle)errors.push('Initial physical state was not rendering');
}catch(error){errors.push(error.stack||String(error));}
finally{
  adb('shell','settings','put','system','user_rotation',originalRotation);
  adb('shell','settings','put','system','accelerometer_rotation',originalAuto);
  await browser.close();
}
writeFileSync(join(out,'lifecycle-report.json'),JSON.stringify({head,originalRotation,originalAuto,rows,errors},null,2)+'\n');
console.log(JSON.stringify({head,originalRotation,originalAuto,rows,errors},null,2));
if(errors.length)process.exitCode=1;
