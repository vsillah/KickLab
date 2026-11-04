import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=process.argv[2]||'http://127.0.0.1:4202';
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const errors=[],egress=[];
const players=[['alpha','Amina',120],['beta','Binta',120],['gamma','Camara',40],['delta','Dara',0]];
const seed={version:1,activeId:'gamma',legacyProfileId:'alpha',profiles:players.map(([id,nickname,xp],index)=>({id,nickname,avatar:['rocket','wiz','tower','trick'][index],color:['sky','mint','sun','coral'][index],progress:{xp},needsSetup:false,createdAt:index,updatedAt:index}))};
const origin=new URL(root).origin;
async function open(context,route='kicklab.html'){
  const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));page.on('request',request=>{if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==origin)egress.push(request.url());});
  const response=await page.goto(`${root}/${route}?qa=home-standings`,{waitUntil:'domcontentloaded'});assert(response?.ok());await page.locator('#modeHome').waitFor({state:'visible'});return page;
}
async function rows(page){return page.locator('#homeStandingsRows tr').evaluateAll(items=>items.map(row=>[row.cells[0].textContent.trim(),row.cells[1].querySelector('b').textContent.trim(),row.cells[2].textContent.trim(),row.getAttribute('aria-current')==='true']));}
try{
  for(const route of ['kicklab.html','mobile/index.html'])for(const [width,height] of [[360,800],[390,844],[768,1024],[1113,834],[1440,900],[844,390]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    await context.addInitScript(value=>{if(!localStorage.getItem('kicklab.profiles.v1'))localStorage.setItem('kicklab.profiles.v1',JSON.stringify(value));},seed);
    const page=await open(context,route);
    assert.deepEqual(await rows(page),[['#1','Amina','120',false],['#1','Binta','120',false],['#3','Camara','40',true],['#4','Dara','0',false]]);
    assert.equal(await page.locator('#homeStandingsEmpty').isVisible(),false);
    const layout=await page.evaluate(()=>{const q=s=>document.querySelector(s).getBoundingClientRect();const body=q('.home-standings-body'),table=q('.home-standings-table'),actions=q('.home-standings-actions'),profile=q('#homeProfileButton'),board=q('#boardBtn');return{overflow:document.documentElement.scrollWidth-innerWidth,tableInside:table.left>=body.left-1&&table.right<=body.right+1,actionsInside:actions.left>=body.left-1&&actions.right<=body.right+1,buttonsSeparate:profile.bottom<=board.top+1||profile.right<=board.left+1,buttonsSized:profile.height>=44&&board.height>=44};});
    assert(layout.overflow<=1&&layout.tableInside&&layout.actionsInside&&layout.buttonsSeparate&&layout.buttonsSized,`${route} ${width}x${height}: ${JSON.stringify(layout)}`);
    if(width===390&&route==='kicklab.html'){
      await page.locator('#homeProfileButton').click();await page.locator('#profileList [data-profile-id="alpha"]').click();await page.locator('#profileClose').click();
      assert.equal((await rows(page))[0][3],true);await page.reload({waitUntil:'domcontentloaded'});assert.equal((await rows(page))[0][3],true);
      assert.deepEqual((await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.map(p=>p.progress.xp))),[120,120,40,0]);
      await page.locator('#boardBtn').click();assert(await page.locator('#fboard').isVisible());
      await page.locator('#fboard').getByRole('button',{name:/Close/i}).first().click();await page.waitForTimeout(80);
      await page.locator('#lab-tab-race').focus();await page.keyboard.press('Enter');await page.locator('#game-cockpit').waitFor({state:'visible'});
    }
    console.log(`${route} ${width}x${height}: tied ranks, active player, layout passed`);await context.close();
  }
  const single=await browser.newContext();await single.addInitScript(()=>localStorage.setItem('impactlab.nick','Solo QA'));const singlePage=await open(single);assert.deepEqual(await rows(singlePage),[['#1','Solo QA','0',true]]);assert(await singlePage.locator('#homeStandingsEmpty').isVisible());assert(/add another/i.test(await singlePage.locator('#homeStandingsEmpty').innerText()));await single.close();
  const corrupt=await browser.newContext();await corrupt.addInitScript(()=>{localStorage.setItem('kicklab.profiles.v1','{bad');localStorage.setItem('impactlab.nick','Recovered QA');});const corruptPage=await open(corrupt);assert.deepEqual(await rows(corruptPage),[['#1','Recovered QA','0',true]]);await corrupt.close();
  const denied=await browser.newContext();await denied.addInitScript(()=>{localStorage.setItem('impactlab.nick','Denied QA');const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(String(key).startsWith('kicklab.profiles.'))throw new DOMException('Denied','QuotaExceededError');return set.call(this,key,value);};});const deniedPage=await open(denied);assert.deepEqual(await rows(deniedPage),[['#1','Denied QA','0',true]]);await denied.close();
  assert.deepEqual(errors,[]);assert.deepEqual(egress,[]);console.log('Home standings profile, storage, responsive, and zero-egress QA passed.');
}finally{await browser.close();}
