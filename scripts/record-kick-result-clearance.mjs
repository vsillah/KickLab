import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,renameSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const head=process.env.KICKLAB_QA_HEAD;
if(!/^[a-f0-9]{40}$/.test(head||'')||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==head)throw Error('KICKLAB_QA_HEAD must match HEAD');
const root=resolve('qa-artifacts/kick-result-clearance');mkdirSync(root,{recursive:true});
const base=`http://127.0.0.1:4173/kicklab.html?rev=${head}`;
const browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)});
const clips=[];
for(const [label,width,height] of [['phone',390,844],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:root,size:{width,height}}});
  const page=await context.newPage();await page.goto(base,{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
  if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
  await page.locator('#lab-tab-kick').click();await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  await page.locator('#experienceSelector').click();await page.locator('#experienceFreestyle').click();
  await page.locator('#game-combo').click();await page.locator('#freestyleStart').click();
  await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
  if(!await page.locator('#gameGuidanceHud').isVisible())throw Error(`${label}: active guidance absent`);
  await page.waitForTimeout(800);
  for(let step=0;step<12&&!await page.locator('#results').isVisible();step++){
    const go=page.locator('button.abtn[data-id="go"]:visible:not([disabled])').last();
    if(await go.count())await go.click();else await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
  }
  await page.locator('#results').waitFor({state:'visible',timeout:15000});
  if(await page.locator('#gameGuidanceHud').isVisible())throw Error(`${label}: guidance covers result`);
  await page.waitForTimeout(1200);
  const next=await page.locator('#rNext').boundingBox();
  if(!next)throw Error(`${label}: Next round is not rendered`);
  const hit=await page.evaluate(({x,y})=>{const next=document.querySelector('#rNext'),target=document.elementFromPoint(x,y);return target===next||next.contains(target)},{x:next.x+next.width/2,y:next.y+next.height/2});
  if(!hit)throw Error(`${label}: Next round pointer target is obstructed`);
  await page.mouse.click(next.x+next.width/2,next.y+next.height/2);
  await page.locator('#results').waitFor({state:'hidden'});
  await page.waitForTimeout(800);
  const video=page.video();await context.close();const raw=join(root,`${label}-${head.slice(0,10)}.webm`);renameSync(await video.path(),raw);clips.push(raw);
}
await browser.close();
const mp4=join(root,`kick-result-clearance-${head.slice(0,10)}.mp4`);
const args=['-y','-loglevel','error','-i',clips[0],'-i',clips[1],'-filter_complex','[0:v]scale=780:1688,setsar=1,format=yuv420p[p];[1:v]scale=1440:900,pad=1440:1688:0:394,setsar=1,format=yuv420p[d];[p][d]hstack=inputs=2[v]','-map','[v]','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4];
const encode=spawnSync('ffmpeg',args,{encoding:'utf8'});if(encode.status!==0)throw Error(encode.stderr);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',mp4],{encoding:'utf8'});if(probe.status!==0)throw Error(probe.stderr);
const media=JSON.parse(probe.stdout);if(statSync(mp4).size<80000||Number(media.format.duration)<5)throw Error('MP4 failed size or duration validation');
writeFileSync(join(root,'video-report.json'),JSON.stringify({head,mp4,bytes:statSync(mp4).size,media},null,2)+'\n');console.log(JSON.stringify({head,mp4,bytes:statSync(mp4).size,media},null,2));
