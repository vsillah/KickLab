// Browser Gate 1: force device-local writes to fail in an isolated synthetic profile.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[0-9a-f]{40}$/.test(head||''))throw Error('Set KICKLAB_QA_HEAD to the exact deployed main commit');
const base=new URL(process.argv[2]||'https://vsillah.github.io/KickLab/');
const out=resolve(process.argv[3]||'qa-artifacts/storage-denied-public');mkdirSync(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const artifactSha256=sha(readFileSync('dist/pages/index.html'));
const served=await fetch(new URL(`?rev=${head}`,base));
if(!served.ok||sha(Buffer.from(await served.arrayBuffer()))!==artifactSha256)throw Error('Live Pages artifact differs from exact build');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce',permissions:[]});
await context.addInitScript(()=>{window.__qaDeniedWrites=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===localStorage){window.__qaDeniedWrites++;throw new DOMException('QA simulated storage denial','QuotaExceededError');}return set.call(this,key,value);};});
const page=await context.newPage();const report={head,artifactSha256,browser:browser.version(),external:[],errors:[],popups:0,downloads:0};
page.on('pageerror',error=>report.errors.push(error.message));page.on('popup',()=>report.popups++);page.on('download',()=>report.downloads++);
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base.origin+'/')||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{report.external.push(url);route.abort();}});
try{
  const url=new URL(base);url.searchParams.set('rev',head);await page.goto(url.href,{waitUntil:'domcontentloaded'});
  await page.locator('#profileNickname').fill('QA Denied');
  await page.locator('#profileFormSave').click();
  report.afterSave=await page.evaluate(()=>({profileSummary:document.querySelector('#profileSummary')?.innerText.slice(0,100),toast:document.querySelector('#toasts')?.innerText.slice(0,150),formMessage:document.querySelector('#profileFormMsg')?.innerText,stored:localStorage.getItem('kicklab.profiles.v1')!==null,deniedWrites:window.__qaDeniedWrites}));
  await page.screenshot({path:join(out,'after-save-390.png')});
  await page.reload({waitUntil:'domcontentloaded'});
  report.afterReload=await page.evaluate(()=>({profileSummary:document.querySelector('#profileSummary')?.innerText.slice(0,100),formMessage:document.querySelector('#profileFormMsg')?.innerText,stored:localStorage.getItem('kicklab.profiles.v1')!==null}));
  await page.screenshot({path:join(out,'after-reload-390.png')});
  report.defect=report.afterSave.deniedWrites>0&&!report.afterSave.stored&&/Profile saved|ready to play/.test(report.afterSave.toast)&&!report.afterReload.profileSummary.includes('QA Denied');
}catch(error){report.errors.push(error.stack||String(error));}
await context.close();await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(report.defect||report.errors.length||report.external.length||report.popups||report.downloads)process.exitCode=1;
