// Local, synthetic regression for the responsive Freestyle picker.
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:4187/kicklab.html';
const revision=process.argv[3]||'working-tree';
const out=resolve(process.argv[4]||'qa-artifacts/kick-freestyle-picker');
if(!/^http:\/\/127\.0\.0\.1:\d+\/kicklab\.html$/.test(base))throw Error('Pass a local kicklab.html URL');
mkdirSync(out,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(x=>x&&existsSync(x));
const browser=await chromium.launch({headless:true,executablePath});
const families=['free','header','run','pass','combo','gk','pso','bar'];
const viewports=[[360,800],[390,844],[768,1024],[1113,834],[1440,900]];
const report={revision,base,cases:[],starts:[],errors:[],external:[],popups:0,downloads:0};
const origin=new URL(base).origin;
async function open(width,height,reducedMotion='reduce'){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<=768,reducedMotion,permissions:[]});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  page.on('request',r=>{if(new URL(r.url()).origin!==origin)report.external.push(r.url());});
  page.on('popup',()=>report.popups++);page.on('download',()=>report.downloads++);
  const url=new URL(base);url.searchParams.set('rev',revision);
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-kick').click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:15000});
  await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();
  return{page,context};
}
async function geometry(page,width,height){
  const state=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,controls:['experiencePanel','game-free','game-header','game-run','game-pass','game-combo','game-gk','game-pso','game-bar','freestyleStart'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return{id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};})}));
  for(const c of state.controls)if(c.left<0||c.right>width+1||c.width<40||c.height<36)throw Error(`${width}x${height} ${c.id} clipped or undersized: ${JSON.stringify(c)}`);
  if(state.scrollWidth>width+1)throw Error(`${width}x${height} horizontal overflow: ${state.scrollWidth}`);
  return state;
}
async function activate(page,selector,method,key='Enter'){
  const target=page.locator(selector);
  if(method==='keyboard'){
    // The picker restores focus on the next frame after replacing its buttons.
    // Let that frame settle before moving focus to the next activity.
    await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
    await target.focus();
    if(await page.evaluate(()=>document.activeElement?.id)!==selector.slice(1))throw Error(`Keyboard focus did not reach ${selector}`);
    await page.keyboard.press(key);
  }
  else if(method==='touch')await target.tap();
  else await target.click();
}
try{
  for(const [width,height] of viewports){
    const {page,context}=await open(width,height);
    const before=await geometry(page,width,height);
    await page.screenshot({path:join(out,`${width}x${height}-picker.png`)});
    for(let i=0;i<families.length;i++){
      const key=families[i],method=width<=390?'touch':width===768?'keyboard':'pointer';
      await activate(page,`#game-${key}`,method,'Enter');
      if(await page.locator(`#game-${key}`).getAttribute('aria-checked')!=='true')throw Error(`${width} ${key} did not select with ${method}`);
      await activate(page,`#game-${key}`,method,'Space');
      if(await page.locator(`#game-${key}`).getAttribute('aria-checked')!=='false')throw Error(`${width} ${key} did not deselect with ${method}`);
    }
    await activate(page,'#freestyleStart',width<=390?'touch':width===768?'keyboard':'pointer');
    if(!/Choose at least one/.test(await page.locator('#continuousStatus').textContent()))throw Error(`${width}: empty Start did not explain recovery`);
    report.cases.push({width,height,method:width<=390?'touch':width===768?'keyboard':'pointer',families:families.length,before,emptyStart:true});
    await context.close();
  }
  {
    const {page,context}=await open(390,844);
    for(const key of ['free','header','run'])await activate(page,`#game-${key}`,'touch');
    await activate(page,'#game-pass','touch');
    const selected=await page.locator('#gameBar .gt[aria-checked="true"]').count();
    const status=await page.locator('#continuousStatus').textContent();
    if(selected!==3||!/Three-activity limit reached/.test(status||''))throw Error(`Three-choice limit failed: ${JSON.stringify({selected,status})}`);
    await page.keyboard.press('Escape');
    if(await page.locator('#experiencePanel').count())throw Error('Escape did not close the picker');
    await activate(page,'#experienceSelector','keyboard','Space');
    await activate(page,'#experienceFreestyle','keyboard','Enter');
    if(await page.locator('#gameBar .gt[aria-checked="true"]').count()!==3)throw Error('Reopening lost the ordered selection');
    report.negativeStates={limit:true,escape:true,reopen:true};
    await context.close();
  }
  for(let i=0;i<families.length;i++){
    const key=families[i],method=['touch','keyboard','pointer'][i%3],{page,context}=await open(390,844,'no-preference');
    const initial=await page.locator(`#game-${key}`).getAttribute('aria-checked');
    await activate(page,`#game-${key}`,method,i%2?'Space':'Enter');
    const selected=await page.locator(`#game-${key}`).getAttribute('aria-checked');
    if(initial!=='false'||selected!=='true')throw Error(`${key}: selection failed with ${method}: ${JSON.stringify({initial,selected,status:await page.locator('#continuousStatus').textContent()})}`);
    await activate(page,'#freestyleStart',method,i%2?'Enter':'Space');
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:15000});
    const state=await page.evaluate(()=>({selection:document.querySelector('#experienceSelector')?.textContent,actions:[...document.querySelectorAll('#padR button')].map(x=>({label:x.getAttribute('aria-label'),disabled:x.disabled})),resultHidden:document.querySelector('#results')?.hidden,mode:document.querySelector('#modeHomeButton')?.getAttribute('aria-label')}));
    if(!state.selection?.includes('Freestyle')||!state.selection?.includes('Playing'))throw Error(`${key}: Start did not enter Freestyle play: ${JSON.stringify(state)}`);
    report.starts.push({key,method,state});
    await context.close();
  }
}finally{await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
if(report.errors.length||report.external.length||report.popups||report.downloads)throw Error(`Browser integrity failed: ${JSON.stringify({errors:report.errors,external:report.external,popups:report.popups,downloads:report.downloads})}`);
console.log(JSON.stringify({viewports:report.cases.map(x=>`${x.width}x${x.height}`),starts:report.starts.map(x=>x.key),report:join(out,'report.json')},null,2));
