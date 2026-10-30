import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {enterHighlandRace,finishHighlandDrag} from './qa-race-public-journey.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=new URL(process.argv[2]||'https://vsillah.github.io/KickLab/');
const out=resolve(process.argv[3]||'qa-artifacts/race-results-save-exit');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the exact product commit');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=sha(readFileSync('dist/pages/index.html'));
const response=await fetch(new URL(`?rev=${head}`,base));
if(!response.ok||sha(Buffer.from(await response.arrayBuffer()))!==expected)throw Error('Served Pages HTML does not match the exact build');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
const report={head,base:base.href,artifactSha256:expected,checks:[],errors:[],external:[],httpErrors:[]};
const sizes=[[390,844],[768,1024],[1113,834],[1440,900]].filter(([width])=>!process.env.KICKLAB_QA_WIDTHS||process.env.KICKLAB_QA_WIDTHS.split(',').includes(String(width)));
for(const [width,height] of sizes){
  const label=`${width}x${height}`,context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('response',res=>{if(res.status()>=400)report.httpErrors.push(`${label}: ${res.status()} ${res.url()}`)});
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base.origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.external.push(`${label}: ${url}`);route.abort()}});
  try{
    const url=new URL(base);url.searchParams.set('rev',head);for(const flag of ['raceExpansion','raceCompetition','raceTelemetry','racePreflight'])url.searchParams.set(flag,'prototype');
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    await enterHighlandRace(page);
    const before=await page.evaluate(()=>{const doc=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return{profileId:doc.activeId,progress:doc.profiles.find(p=>p.id===doc.activeId).progress}});
    const run=await finishHighlandDrag(page);
    const summary=await page.evaluate(()=>{const save=document.querySelector('#rRaceGarage'),primary=document.querySelector('#rNext'),preview=document.querySelector('#raceReplayPreview'),s=save.getBoundingClientRect(),p=preview.getBoundingClientRect(),hit=document.elementFromPoint(s.left+s.width/2,s.top+s.height/2);return{title:document.querySelector('#rTitle').textContent,save:save.getAttribute('aria-label'),saveTitle:save.title,saveText:save.textContent.trim(),iconParts:save.querySelectorAll('svg path,svg circle').length,saveHit:hit?.closest('button')?.id||null,saveBox:{width:s.width,height:s.height,right:s.right,bottom:s.bottom},alignedToReplay:Math.abs(s.right-p.right)<1,primary:primary.hidden?null:primary.textContent.trim(),primaryFirst:!!(primary.compareDocumentPosition(save)&Node.DOCUMENT_POSITION_FOLLOWING),coach:document.querySelector('#raceResultCoach').textContent,overflow:document.documentElement.scrollWidth-innerWidth,exportControls:[...document.querySelectorAll('#rRaceRecord,#raceShare,#raceShareDownload,#raceShareNative')].filter(el=>!el.hidden).length}});
    if(summary.save!=='Save & Exit'||summary.saveTitle!=='Save & Exit'||summary.saveText||summary.iconParts<3||summary.saveHit!=='rRaceGarage'||summary.saveBox.width<44||summary.saveBox.height<44||summary.saveBox.right>width+1||summary.saveBox.bottom>height+1||!summary.alignedToReplay||!summary.primaryFirst||summary.primary!=='Keep racing'||!summary.coach.includes('What worked')||!summary.coach.includes('Next focus')||summary.overflow>1||summary.exportControls)throw Error(`Result contract: ${JSON.stringify(summary)}`);
    if(width===768){await page.locator('#rNext').focus();await page.keyboard.press('Tab');const focus=await page.evaluate(()=>{const save=document.querySelector('#rRaceGarage');return{active:document.activeElement===save,visible:save.matches(':focus-visible'),outline:parseFloat(getComputedStyle(save).outlineWidth)}});if(!focus.active||!focus.visible||focus.outline<2)throw Error(`Save & Exit focus: ${JSON.stringify(focus)}`)}
    await page.locator('#results').screenshot({path:join(out,`${label}-result.png`)});
    await page.click('#rRaceGarage');
    const after=await page.evaluate(()=>{const doc=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return{home:!document.querySelector('#modeHome').hidden,results:!document.querySelector('#results').hidden,profileId:doc.activeId,progress:doc.profiles.find(p=>p.id===doc.activeId).progress}});
    if(!after.home||after.results||after.profileId!==before.profileId||after.progress.xp<=before.progress.xp||after.progress.stats?.plays?.race<=before.progress.stats?.plays?.race)throw Error(`Save & Exit lost or misbound progress: ${JSON.stringify({before,after})}`);
    await page.reload({waitUntil:'domcontentloaded'});if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    const restored=await page.evaluate(()=>{const doc=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));return{profileId:doc.activeId,progress:doc.profiles.find(p=>p.id===doc.activeId).progress}});
    if(restored.profileId!==after.profileId||JSON.stringify(restored.progress)!==JSON.stringify(after.progress))throw Error('Reload lost saved result');
    report.checks.push({label,run:{initialX:run.initial.x,finalX:run.final.x,shifted:run.shifted},summary,home:after.home,persisted:true});
  }catch(error){report.errors.push(`${label}: ${error.stack||error}`);}
  await context.close();
}
await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,checks:report.checks,errors:report.errors,external:report.external,httpErrors:report.httpErrors},null,2));
if(report.errors.length||report.external.length||report.httpErrors.length||report.checks.length!==sizes.length)process.exitCode=1;
