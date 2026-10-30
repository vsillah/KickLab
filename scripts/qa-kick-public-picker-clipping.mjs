// Exact-artifact Gate 1 repro for the Freestyle picker on narrow screens.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the full exact main commit');
if(execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim()!==head)throw Error('origin/main differs from the requested exact commit');
const base=new URL(process.argv[2]||'https://vsillah.github.io/KickLab/');
const out=resolve(process.argv[3]||'qa-artifacts/kick-public-picker-clipping');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const artifactSha256=sha(readFileSync('dist/pages/index.html'));
const served=await fetch(new URL(`?rev=${head}`,base));
if(!served.ok||sha(Buffer.from(await served.arrayBuffer()))!==artifactSha256)throw Error('Served Pages HTML differs from the exact local build');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={head,base:base.href,artifactSha256,browser:browser.version(),cases:[],defects:[],external:[],errors:[],popups:0,downloads:0};
for(const [width,height] of [[360,800],[390,844],[768,1024]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<=768,reducedMotion:'reduce',permissions:[]});
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${width}: ${error.message}`));
  page.on('popup',()=>report.popups++);page.on('download',()=>report.downloads++);
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base.origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.external.push(`${width}: ${url}`);route.abort();}});
  try{
    const url=new URL(base);url.searchParams.set('rev',head);
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
    if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
    await page.locator('#lab-tab-kick').click();
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:12000});
    await page.locator('#experienceSelector').click();
    await page.locator('#experienceFreestyle').click();
    const before=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,controls:['experiencePanel','game-free','game-header','freestyleStart'].map(id=>{const n=document.getElementById(id),r=n.getBoundingClientRect();return{id,left:+r.left.toFixed(1),right:+r.right.toFixed(1),width:+r.width.toFixed(1),selected:n.getAttribute('aria-checked')};})}));
    if(before.controls.some(control=>control.left<0||control.right>width))report.defects.push({width,issue:'Freestyle picker or action extends outside viewport',clipped:before.controls.filter(control=>control.left<0||control.right>width).map(control=>control.id)});
    await page.screenshot({path:join(out,`${width}-picker.png`)});
    await page.locator('#game-free').click();
    const after=await page.evaluate(()=>({pickerOpen:!!document.querySelector('#experiencePanel'),selected:document.querySelector('#game-free')?.getAttribute('aria-checked')??null}));
    if(!after.pickerOpen){await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();after.selectedAfterReopen=await page.locator('#game-free').getAttribute('aria-checked');}
    report.cases.push({width,height,before,after});
  }catch(error){report.errors.push(`${width}: ${error.stack||error}`);}
  await context.close();
}
await browser.close();
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.defects.length||report.errors.length||report.external.length||report.popups||report.downloads)process.exitCode=1;
