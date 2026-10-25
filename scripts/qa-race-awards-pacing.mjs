import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2];
if(!base)throw new Error('Usage: node scripts/qa-race-awards-pacing.mjs <kicklab-url>');
const probe=process.argv[3]||'';
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({headless:true,executablePath});
const results=[];
for(const viewport of [{width:1113,height:900,motion:'no-preference',budget:33.3},{width:390,height:844,motion:'reduce',budget:40}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:probe==='reduce'?'reduce':viewport.motion});
  await context.addInitScript(()=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'pacing',legacyProfileId:'pacing',profiles:[{id:'pacing',nickname:'Pacing Fixture',avatar:'rocket',color:'sky',progress:{raceCompetition:{version:1,bests:{},awards:{core:true,drag:true}}}}]})));
  const page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{external.push(url);route.abort();}});
  const url=new URL(base);url.searchParams.set('raceCompetition','prototype');
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  if(viewport.width>480)await page.waitForFunction(()=>[...document.querySelectorAll('.lab-showcase video')].some(video=>!video.paused));
  await page.click('#boardBtn');
  await page.locator('#raceCompetition').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.race-journey-art img')].length===6&&[...document.querySelectorAll('.race-journey-art img')].every(img=>img.complete&&img.naturalWidth));
  if(probe==='no-filter')await page.addStyleTag({content:'.race-journey-art img,.race-journey-card.locked .race-journey-art img{filter:none!important}'});
  if(probe==='pause')await page.addStyleTag({content:'.race-journey-art img{animation-play-state:paused!important}'});
  if(probe==='promote')await page.addStyleTag({content:'.race-journey-art img{will-change:transform}'});
  if(probe==='all-pause')await page.addStyleTag({content:'*{animation-play-state:paused!important}'});
  if(probe==='shine-off')await page.addStyleTag({content:'.xpbar i::after{animation:none!important}'});
  if(probe==='video-pause')await page.evaluate(()=>document.querySelectorAll('video').forEach(video=>video.pause()));
  await page.waitForTimeout(1200);
  const runs=[];
  for(let run=0;run<3;run++){
    const samples=await page.evaluate(()=>new Promise(resolve=>{const values=[];let last=0;function tick(now){if(last)values.push(now-last);last=now;if(values.length<120)requestAnimationFrame(tick);else resolve(values);}requestAnimationFrame(tick);}));
    const sorted=samples.slice(5).sort((a,b)=>a-b);
    runs.push(+sorted[Math.floor(sorted.length*.95)].toFixed(2));
  }
  const median=runs.slice().sort((a,b)=>a-b)[1];
  const media=await page.evaluate(()=>[...document.querySelectorAll('video')].map(video=>({paused:video.paused,visible:video.getBoundingClientRect().height>0,src:video.currentSrc.split('/').at(-1)})));
  if(!probe&&media.some(video=>!video.paused))errors.push('Home preview kept playing behind awards board');
  await page.click('#fbClose');
  if(viewport.width>480){await page.waitForFunction(()=>[...document.querySelectorAll('.lab-showcase video')].some(video=>!video.paused));}
  const resumed=await page.evaluate(()=>[...document.querySelectorAll('.lab-showcase video')].some(video=>!video.paused));
  if(!probe&&viewport.width>480&&!resumed)errors.push('Home previews did not resume after closing awards board');
  results.push({viewport,probe,visible:await page.locator('.race-journey-card').count(),runs,medianP95Ms:median,pass:median<=viewport.budget,errors,external,url:url.toString(),media,resumed});
  await context.close();
}
await browser.close();
console.log(JSON.stringify(results,null,2));
if(results.some(result=>!result.pass||result.errors.length||result.external.length))process.exitCode=1;
