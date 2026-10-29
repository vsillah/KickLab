import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,statSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const url=process.env.KICKLAB_QA_URL||'http://127.0.0.1:5187/kicklab.html';
const out=process.env.KICKLAB_QA_OUT||'/tmp/kicklab-local-data-deletion';
mkdirSync(out,{recursive:true});
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true});
const checks=[];
const profiles={version:1,activeId:'qa-comet',legacyProfileId:'qa-comet',profiles:[
  {id:'qa-comet',nickname:'QA Comet',avatar:'rocket',color:'sky',progress:{xp:900,goals:4,badges:{f_3k:1},raceGarage:{body:'stock'},raceVenue:'highland'}},
  {id:'qa-nova',nickname:'QA Nova',avatar:'wiz',color:'mint',progress:{xp:500,punch:1200,badges:{}}}
]};
const seed=profiles=>{
  if(localStorage.getItem('qa.deletion.seeded'))return;
  localStorage.setItem('qa.deletion.seeded','sentinel');
  localStorage.setItem('kicklab.profiles.v1',JSON.stringify(profiles));
  localStorage.setItem('impactlab.v1',JSON.stringify(profiles.profiles[0].progress));
  localStorage.setItem('impactlab.nick','QA Comet');
  localStorage.setItem('kicklab.future.v2','owned');
  sessionStorage.setItem('kicklab.race.home-entry.v1','/race');
  sessionStorage.setItem('qa.deletion.session','sentinel');
};

try{
  for(const [width,height] of [[360,800],[390,844],[768,1024],[1113,834],[1440,900]]){
    const record=width===1440;
    const context=await browser.newContext({viewport:{width,height},hasTouch:width===360,reducedMotion:width===390?'reduce':'no-preference',recordVideo:record?{dir:out,size:{width,height}}:undefined});
    await context.addInitScript(seed,profiles);
    if(width===390)await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /^webgl/i.test(kind)?null:original.call(this,kind,...args);};});
    const page=await context.newPage(),egress=[],errors=[];
    page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:5187/'))egress.push(request.url());});
    page.on('pageerror',error=>errors.push(error.message));
    const video=record?page.video():null;
    await page.goto(`${url}?rev=${revision.slice(0,12)}&width=${width}`,{waitUntil:'domcontentloaded'});
    await page.locator('#homeProfileButton').click();
    await page.getByText('QA Comet',{exact:true}).first().waitFor();
    assert.equal(await page.locator('#profileList button').count(),2);
    const section=page.locator('.profile-data-settings');
    await section.scrollIntoViewIfNeeded();
    assert.equal(await section.getByRole('button',{name:'Delete all local data'}).isVisible(),true);
    assert.match(await section.innerText(),/Delete every local player and all saved KickLab progress and settings from this device\./);
    const copyLines=await section.locator('p').evaluate(node=>Math.round(node.getBoundingClientRect().height/parseFloat(getComputedStyle(node).lineHeight)));
    if(width===1440)assert.ok(copyLines<=2,`desktop copy uses ${copyLines} lines`);
    await page.screenshot({path:join(out,`guardian-copy-${width}x${height}.png`)});
    const openDelete=async()=>{if(width===360)await page.locator('#profileDeleteOpen').tap();else await page.locator('#profileDeleteOpen').click();};
    const cancelDelete=async()=>{if(width===360)await page.locator('#profileDeleteCancel').tap();else await page.locator('#profileDeleteCancel').click();};
    const word=page.locator('#profileDeleteWord'),confirm=page.locator('#profileDeleteConfirmButton');
    if(record)await page.waitForTimeout(1100);
    await openDelete();
    assert.equal(await page.locator('#profileDeleteConfirm').isVisible(),true);
    assert.equal(await page.locator('#profileDeleteCancel').isVisible(),true);
    assert.equal(await confirm.isVisible(),true);
    assert.equal(await confirm.isDisabled(),true);
    assert.equal(await word.inputValue(),'');
    const bounds=await confirm.boundingBox(),inputBounds=await word.boundingBox();
    for(const [name,box] of [['button',bounds],['input',inputBounds]])assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height,`${width}: ${name} clipped`);
    await page.screenshot({path:join(out,`confirmation-${width}x${height}.png`)});
    await word.press('Enter');assert.equal(await confirm.isDisabled(),true);
    await word.fill('del');assert.equal(await confirm.isDisabled(),true);
    await word.fill('DELETE');assert.equal(await confirm.isDisabled(),true);
    if(record)await page.waitForTimeout(1000);
    await word.fill(' delete ');assert.equal(await confirm.isEnabled(),true);
    if(record)await page.waitForTimeout(1300);
    await cancelDelete();
    assert.equal(await page.locator('#profileDeleteConfirm').isVisible(),false);
    assert.equal(await page.locator('#profileList button').count(),2);
    assert.equal(await page.evaluate(()=>localStorage.getItem('impactlab.nick')),'QA Comet');
    await openDelete();assert.equal(await word.inputValue(),'');assert.equal(await confirm.isDisabled(),true);
    if(record)await page.waitForTimeout(950);
    await word.fill('delete');assert.equal(await confirm.isEnabled(),true);
    await word.press('Escape');assert.equal(await page.locator('#profileDeleteConfirm').isVisible(),false);
    await openDelete();assert.equal(await word.inputValue(),'');assert.equal(await confirm.isDisabled(),true);
    if(width===1113){
      await page.locator('#profileDialog').click({position:{x:2,y:2}});
      assert.equal(await page.locator('#profileDialog').isVisible(),false);
      await page.locator('#homeProfileButton').click();await openDelete();
      assert.equal(await word.inputValue(),'');assert.equal(await confirm.isDisabled(),true);
    }
    await word.fill('delete');assert.equal(await confirm.isEnabled(),true);
    if(record)await page.waitForTimeout(1100);
    await confirm.focus();await page.keyboard.press('Enter');
    await page.locator('#profileFormTitle').getByText('Create your first player').waitFor({timeout:15000});
    const after=await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),name:document.querySelector('#homeProfileName')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth}));
    assert.deepEqual(after.local.sort(),['kicklab.profiles.v1','qa.deletion.seeded']);
    assert.deepEqual(after.session,['qa.deletion.session']);
    assert.equal(after.name,'Lab Rookie');assert.equal(after.overflow,false);
    if(record)await page.waitForTimeout(1500);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#profileFormTitle').getByText('Create your first player').waitFor();
    assert.equal(await page.locator('#profileList button').count(),1);
    assert.equal(await page.evaluate(()=>localStorage.getItem('impactlab.nick')),null);
    assert.deepEqual(egress,[]);assert.deepEqual(errors,[]);
    checks.push({viewport:`${width}x${height}`,touch:width===360,canvasFallback:width===390,reducedMotion:width===390,egress:egress.length,firstRunAfterReload:true});
    if(record){
      await page.waitForTimeout(1300);
      await context.close();
      const webm=await video.path(),mp4=join(out,`guardian-deletion-${revision.slice(0,12)}.mp4`);
      execFileSync('ffmpeg',['-y','-loglevel','error','-i',webm,'-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
      const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'}));
      assert.ok(statSync(mp4).size>100000&&Number(probe.format.duration)>6);
      checks.push({mp4,bytes:statSync(mp4).size,seconds:Number(probe.format.duration),codec:probe.streams[0]?.codec_name});
    }else await context.close();
  }
  writeFileSync(join(out,'report.json'),JSON.stringify({revision,checks},null,2));
  console.log(JSON.stringify({revision,checks},null,2));
}finally{await browser.close();}
