import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,statSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const {chromium}=createRequire(import.meta.url)('playwright');
const url=process.env.KICKLAB_QA_URL||'http://127.0.0.1:5187/kicklab.html';
const out=process.env.KICKLAB_QA_OUT||'/tmp/kicklab-profile-storage-recovery';
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const checks=[];
try{
  for(const [width,height] of [[360,800],[390,844],[768,1024],[1113,834],[1440,900]]){
    const record=width===1440;
    const context=await browser.newContext({viewport:{width,height},hasTouch:width===360,reducedMotion:width===390?'reduce':'no-preference',recordVideo:record?{dir:out,size:{width,height}}:undefined});
    await context.addInitScript(()=>{
      const original=Storage.prototype.setItem;
      window.__qaDenyProfileWrites=true;
      Storage.prototype.setItem=function(key,value){
        if(this===localStorage&&window.__qaDenyProfileWrites&&String(key).startsWith('kicklab.profiles.'))throw new DOMException('Local storage denied','QuotaExceededError');
        return original.call(this,key,value);
      };
    });
    if(width===390)await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /^webgl/i.test(kind)?null:original.call(this,kind,...args);};});
    const page=await context.newPage(),egress=[],errors=[];
    page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:5187/'))egress.push(request.url());});
    page.on('pageerror',error=>errors.push(error.message));
    const video=record?page.video():null;
    await page.goto(`${url}?rev=${revision.slice(0,12)}&storage-recovery=${width}`,{waitUntil:'domcontentloaded'});
    await page.locator('#profileFormTitle').getByText('Create your first player').waitFor();
    await page.locator('#profileNickname').fill('QA Unsaved');
    if(width===360)await page.locator('#profileFormSave').tap();
    else if(width===390)await page.locator('#profileNickname').press('Enter');
    else await page.locator('#profileFormSave').click();
    const message=page.locator('#profileFormMsg');
    await message.getByText('Player not saved. Check browser storage, then try Save player again. Current player is unchanged.').waitFor();
    assert.equal(await page.locator('#profileForm').isVisible(),true);
    assert.equal(await page.locator('#profileNickname').inputValue(),'QA Unsaved');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')||'null')?.profiles?.some(p=>p.nickname==='QA Unsaved')||false),false);
    assert.equal(await page.locator('#profileList button').count(),1);
    await message.scrollIntoViewIfNeeded();
    const box=await message.boundingBox();
    assert.ok(box&&box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,`${width}: recovery message clipped`);
    await page.screenshot({path:join(out,`failure-${width}x${height}.png`)});
    if(record)await page.waitForTimeout(2800);
    await page.evaluate(()=>{window.__qaDenyProfileWrites=false;});
    if(width===360)await page.locator('#profileFormSave').tap();else await page.locator('#profileFormSave').click();
    await page.locator('#profileForm').waitFor({state:'hidden'});
    assert.equal(await page.locator('#homeProfileName').textContent(),'QA Unsaved');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles.some(p=>p.nickname==='QA Unsaved')),true);
    assert.equal(await page.evaluate(()=>localStorage.getItem('kicklab.profiles.pending.v1')),null);
    assert.equal(await message.textContent(),'');
    await page.screenshot({path:join(out,`recovered-${width}x${height}.png`)});
    if(record)await page.waitForTimeout(2500);
    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#homeProfileName').textContent(),'QA Unsaved');
    assert.equal(await page.locator('#profileForm').isVisible(),false);
    if(record)await page.waitForTimeout(2100);
    if(!record){
      await page.locator('#homeProfileButton').click();
      await page.locator('#profileEdit').click();
      await page.locator('#profileNickname').fill('QA Edited');
      await page.locator('#profileFormSave').click();
      await message.getByText('Player not saved. Check browser storage, then try Save player again. Current player is unchanged.').waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kicklab.profiles.v1')).profiles[0].nickname),'QA Unsaved');
      await page.evaluate(()=>{window.__qaDenyProfileWrites=false;});
      await page.locator('#profileFormSave').click();
      assert.equal(await page.locator('#homeProfileName').textContent(),'QA Edited');
      await page.reload({waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('#homeProfileName').textContent(),'QA Edited');
    }
    assert.deepEqual(egress,[]);assert.deepEqual(errors,[]);
    checks.push({viewport:`${width}x${height}`,touch:width===360,reducedMotion:width===390,canvasFallback:width===390,failedSaveTruthful:true,retryAndReload:true,egress:egress.length});
    await context.close();
    if(record){
      const webm=await video.path(),mp4=join(out,`profile-storage-recovery-${revision.slice(0,12)}.mp4`);
      execFileSync('ffmpeg',['-y','-loglevel','error','-i',webm,'-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
      const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',mp4],{encoding:'utf8'}));
      assert.ok(statSync(mp4).size>100000&&Number(probe.format.duration)>6);
      checks.push({mp4,bytes:statSync(mp4).size,seconds:Number(probe.format.duration),codec:probe.streams[0]?.codec_name});
    }
  }
  writeFileSync(join(out,'report.json'),JSON.stringify({revision,checks},null,2));
  console.log(JSON.stringify({revision,checks},null,2));
}finally{await browser.close();}
