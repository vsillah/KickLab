import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=process.argv[2]||'http://127.0.0.1:4202';
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const errors=[],egress=[],unexpected=[];
const origin=new URL(root).origin;
const players=[['alpha','Amina',800,2],['beta','Binta',800,2],['gamma','Camara',500,3],['delta','Dara',50,0],['epsilon','Esi',0,0]];
const seed={version:1,activeId:'gamma',legacyProfileId:'alpha',profiles:players.map(([id,nickname,xp,awards],index)=>({id,nickname,avatar:['rocket','wiz','tower','trick','cannon'][index],color:['sky','mint','sun','coral','violet'][index],progress:{xp,badges:Object.fromEntries(Array.from({length:awards},(_,award)=>[`qa-award-${award}`,1]))},needsSetup:false,createdAt:index,updatedAt:index}))};
const expected={points:[['#1','Amina',2,2,800],['#1','Binta',2,2,800],['#3','Camara',2,3,500],['#4','Dara',1,0,50],['#5','Esi',1,0,0]],level:[['#1','Amina',2,2,800],['#1','Binta',2,2,800],['#1','Camara',2,3,500],['#4','Dara',1,0,50],['#4','Esi',1,0,0]],awards:[['#1','Camara',2,3,500],['#2','Amina',2,2,800],['#2','Binta',2,2,800],['#4','Dara',1,0,50],['#4','Esi',1,0,0]]};
async function open(context,route='kicklab.html'){
  const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));page.on('request',request=>{if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==origin)egress.push(request.url());});page.on('popup',()=>unexpected.push('popup'));page.on('download',()=>unexpected.push('download'));
  const response=await page.goto(`${root}/${route}?qa=multidimensional-standings`,{waitUntil:'domcontentloaded'});assert(response?.ok());await page.locator('#modeHome').waitFor({state:'visible'});return page;
}
async function rows(page){return page.locator('#homeStandingsRows tr').evaluateAll(items=>items.map(row=>[row.cells[0].textContent.trim(),row.cells[1].querySelector('b').textContent.trim(),Number(row.querySelector('.standings-meta span:first-child data').value),Number(row.querySelector('.standings-meta span:last-child data').value),Number(row.cells[2].querySelector('data').value)]));}
async function checkMetric(page,metric){
  assert.deepEqual(await rows(page),expected[metric]);
  const label={points:'Total points',level:'Level',awards:'Awards'}[metric];
  assert.equal(await page.locator('#homeStandingsRankStatus').textContent(),`Ranked by ${label}`);
  assert.deepEqual(await page.locator('[data-standing-rank]').evaluateAll(buttons=>buttons.map(button=>button.getAttribute('aria-pressed'))),['points','level','awards'].map(value=>String(value===metric)));
  assert.equal(await page.locator('#homeStandingsRows tr[aria-current="true"] .standings-player b').textContent(),'Camara');
}
async function layout(page){return page.evaluate(()=>{const q=s=>document.querySelector(s).getBoundingClientRect(),body=q('.home-standings-body'),table=q('.home-standings-table'),actions=q('.home-standings-actions'),rankbar=q('.home-standings-rankbar'),buttons=[...document.querySelectorAll('[data-standing-rank]')];return{overflow:document.documentElement.scrollWidth-innerWidth,tableInside:table.left>=body.left-1&&table.right<=body.right+1,actionsInside:actions.left>=body.left-1&&actions.right<=body.right+1,rankbarInside:rankbar.left>=q('#progressHud').left-1&&rankbar.right<=q('#progressHud').right+1,buttonsSized:buttons.every(button=>button.getBoundingClientRect().height>=44),clipped:[...document.querySelectorAll('.standings-meta,.standings-player-name,[data-standing-rank]')].some(node=>node.scrollWidth>node.clientWidth+1)};});}
async function clickMetric(page,metric,method){const button=page.locator(`[data-standing-rank="${metric}"]`);if(method==='touch')await button.tap();else if(method==='keyboard')await button.press('Enter');else await button.click();await checkMetric(page,metric);}
try{
  for(const route of ['kicklab.html','mobile/index.html'])for(const [width,height] of [[360,800],[390,844],[768,1024],[1113,834],[1440,900],[844,390]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width===360});
    await context.addInitScript(value=>{if(!localStorage.getItem('kicklab.profiles.v1'))localStorage.setItem('kicklab.profiles.v1',JSON.stringify(value));},seed);
    const page=await open(context,route),stored=await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1'));
    await checkMetric(page,'points');assert.equal(await page.locator('#homeStandingsEmpty').isVisible(),false);
    const geometry=await layout(page);assert(geometry.overflow<=1&&geometry.tableInside&&geometry.actionsInside&&geometry.rankbarInside&&geometry.buttonsSized&&!geometry.clipped,`${route} ${width}x${height}: ${JSON.stringify(geometry)}`);
    const method=width===360?'touch':width===390?'keyboard':'pointer';
    await clickMetric(page,'level',method);await clickMetric(page,'awards',method);await clickMetric(page,'points',method);
    assert.equal(await page.evaluate(()=>localStorage.getItem('kicklab.profiles.v1')),stored,'ranking changed saved profiles');
    if(width===390&&route==='kicklab.html'){
      await clickMetric(page,'awards','keyboard');await page.locator('#homeProfileButton').click();await page.locator('#profileList [data-profile-id="alpha"]').click();await page.locator('#profileClose').click();
      assert.equal(await page.locator('#homeStandingsRows tr[aria-current="true"] .standings-player b').textContent(),'Amina');assert.deepEqual(await rows(page),expected.awards);
      await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.locator('#homeStandingsRows tr[aria-current="true"] .standings-player b').textContent(),'Amina');assert.deepEqual(await rows(page),expected.points);assert.equal(await page.locator('#homeStandingsRankStatus').textContent(),'Ranked by Total points');
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.map(profile=>profile.progress)),seed.profiles.map(profile=>profile.progress));
      await page.evaluate(()=>{const key='kicklab.profiles.v1',saved=JSON.parse(localStorage.getItem(key));const active=saved.profiles.find(profile=>profile.id===saved.activeId);active.progress.xp=1300;active.progress.badges['qa-earned-after-render']=1;localStorage.setItem(key,JSON.stringify(saved));});
      await page.reload({waitUntil:'domcontentloaded'});
      assert.deepEqual((await rows(page))[0],['#1','Amina',3,3,1300]);
      await page.locator('[data-standing-rank="awards"]').click();assert.deepEqual((await rows(page)).slice(0,2).map(row=>row.slice(0,2)),[['#1','Amina'],['#1','Camara']]);
      await page.reload({waitUntil:'domcontentloaded'});assert.deepEqual((await rows(page))[0],['#1','Amina',3,3,1300]);
      await page.locator('#boardBtn').click();assert(await page.locator('#fboard').isVisible());await page.locator('#fbClose').click();await page.waitForTimeout(80);await page.locator('#lab-tab-race').press('Enter');await page.locator('#game-cockpit').waitFor({state:'visible'});
    }
    if(width===1440&&route==='kicklab.html'){
      await page.locator('[data-standing-rank="awards"]').hover();assert(await page.locator('[data-standing-rank="awards"]').evaluate(node=>node.matches(':hover')));
      const frames=await page.evaluate(async()=>{const stamps=[];for(let i=0;i<120;i++)stamps.push(await new Promise(resolve=>requestAnimationFrame(resolve)));return stamps.slice(1).map((stamp,index)=>stamp-stamps[index]).sort((a,b)=>a-b);});
      const p95=frames[Math.floor(frames.length*.95)];assert(p95<=50,`Home frame p95 ${p95.toFixed(1)} ms`);console.log(`Home desktop frame p95 ${p95.toFixed(1)} ms`);
    }
    console.log(`${route} ${width}x${height}: all three rankings, ties, metadata, ${method}, layout passed`);await context.close();
  }
  const single=await browser.newContext();await single.addInitScript(()=>localStorage.setItem('impactlab.nick','Solo QA'));const singlePage=await open(single);assert.equal(await singlePage.locator('#homeStandingsRows tr').count(),1);assert(await singlePage.locator('#homeStandingsEmpty').isVisible());for(const metric of ['level','awards']){await singlePage.locator(`[data-standing-rank="${metric}"]`).click();assert.equal(await singlePage.locator('#homeStandingsRows tr .standings-rank').textContent(),'#1');}await single.close();
  const full=await browser.newContext({viewport:{width:360,height:800},reducedMotion:'reduce'});await full.addInitScript(value=>{value.profiles=Array.from({length:12},(_,index)=>({...value.profiles[index%value.profiles.length],id:`full-${index}`,nickname:`LongPlayerName${index}`,progress:{xp:index*100,badges:{}}}));value.activeId='full-11';localStorage.setItem('kicklab.profiles.v1',JSON.stringify(value));},structuredClone(seed));const fullPage=await open(full);assert.equal(await fullPage.locator('#homeStandingsRows tr').count(),12);for(const metric of ['level','awards'])await fullPage.locator(`[data-standing-rank="${metric}"]`).click();const fullLayout=await layout(fullPage);assert(fullLayout.overflow<=1&&!fullLayout.clipped,`12-player phone layout: ${JSON.stringify(fullLayout)}`);await full.close();
  const corrupt=await browser.newContext();await corrupt.addInitScript(()=>{localStorage.setItem('kicklab.profiles.v1','{bad');localStorage.setItem('impactlab.nick','Recovered QA');});const corruptPage=await open(corrupt);assert.equal(await corruptPage.locator('#homeStandingsRows tr .standings-player b').textContent(),'Recovered QA');assert(/Level 1/.test(await corruptPage.locator('.standings-meta').textContent()));await corrupt.close();
  const denied=await browser.newContext();await denied.addInitScript(()=>{localStorage.setItem('impactlab.nick','Denied QA');const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(String(key).startsWith('kicklab.profiles.'))throw new DOMException('Denied','QuotaExceededError');return set.call(this,key,value);};});const deniedPage=await open(denied);assert.equal(await deniedPage.locator('#homeStandingsRows tr .standings-player b').textContent(),'Denied QA');await deniedPage.locator('[data-standing-rank="awards"]').click();assert.equal(await deniedPage.locator('#homeStandingsRows tr .standings-rank').textContent(),'#1');await deniedPage.locator('#homeProfileButton').click();await deniedPage.locator('#profileCreate').click();await deniedPage.locator('#profileNickname').fill('Unsaved QA');await deniedPage.locator('#profileFormSave').click();assert(/Player not saved/.test(await deniedPage.locator('#profileFormMsg').innerText()));assert.equal(await deniedPage.locator('#homeStandingsRows tr').count(),1);await denied.close();
  assert.deepEqual(errors,[]);assert.deepEqual(egress,[]);assert.deepEqual(unexpected,[]);console.log('Multi-dimensional standings, storage, input, performance, privacy, and zero-egress QA passed.');
}finally{await browser.close();}
