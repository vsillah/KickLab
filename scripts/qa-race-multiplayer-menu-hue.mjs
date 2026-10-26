import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5885/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-multiplayer-menu-hue');
mkdirSync(output,{recursive:true});
const url=new URL(base);
url.searchParams.set('raceExpansion','prototype');
url.searchParams.set('raceMultiplayer','prototype');
url.searchParams.set('rev',process.env.KICKLAB_QA_HEAD||'working');
const profile={version:1,activeId:'qa',legacyProfileId:'qa',profiles:[{id:'qa',nickname:'QA Racer',avatar:'rocket',color:'sky',progress:{xp:0}}]};
const browser=await chromium.launch({headless:true});
const report={revision:url.searchParams.get('rev'),viewports:[],errors:[],external:[]};

try{
  for(const [width,height] of [[360,780],[768,1024],[1113,900],[1440,900]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    await context.addInitScript(value=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify(value)),profile);
    const page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(error.message));
    await page.route('**/*',route=>{
      const request=route.request().url();
      if(request.startsWith(url.origin)||request.startsWith('data:')||request.startsWith('blob:'))route.continue();
      else{report.external.push(request);route.abort();}
    });
    await page.goto(url.toString());
    await page.click('#lab-tab-race');
    await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});
    const skip=page.locator('.race-orbit-panel button');
    if(await skip.isVisible())await skip.click();
    await page.click('#racePhoneProgress');
    await page.click('#raceMultiQuick');
    const styles=await page.evaluate(()=>{
      const read=selector=>{const style=getComputedStyle(document.querySelector(selector));return{backgroundImage:style.backgroundImage,backgroundColor:style.backgroundColor,borderColor:style.borderColor,color:style.color,opacity:style.opacity,outlineColor:style.outlineColor}};
      return {championship:read('#raceChampionship'),multiplayer:read('#raceMultiplayer'),couch:read('#raceMultiCouch'),quick:read('#raceMultiQuick'),live:read('#raceMultiLive'),quickPanel:read('#raceQuick'),quickAction:read('#raceQuickCreate'),overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    assert.equal(styles.multiplayer.backgroundImage,styles.championship.backgroundImage,'multiplayer shell should share the established Race menu gradient');
    assert.equal(styles.multiplayer.borderColor,styles.championship.borderColor,'multiplayer shell should share the established Race menu border');
    assert.match(styles.couch.backgroundImage,/rgb\(25, 50, 71\).*rgb\(16, 34, 54\)/,'base tile should use Race navy tones');
    assert.match(styles.quick.backgroundImage,/rgb\(108, 77, 25\).*rgb\(66, 49, 18\)/,'selected tile should use Race gold tones');
    assert.equal(styles.quick.borderColor,'rgb(240, 202, 117)');
    assert.equal(styles.live.backgroundColor,'rgb(16, 34, 54)','Live Room should have a muted navy disabled fill');
    assert.equal(styles.live.opacity,'0.86');
    assert.match(styles.quickPanel.backgroundImage,/rgb\(21, 47, 62\).*rgb\(10, 28, 45\)/,'Quick Challenge panel should use the Race card palette');
    assert.equal(styles.quickAction.backgroundColor,'rgb(35, 69, 91)','Quick Challenge action should use the Race button fill');
    assert.equal(styles.overflow,false,`horizontal overflow at ${width}px`);
    await page.locator('#raceMultiQuick').focus();
    assert.equal(await page.locator('#raceMultiQuick').evaluate(element=>getComputedStyle(element).outlineColor),'rgb(255, 255, 255)','keyboard focus should remain visible');
    await page.locator('#orientationDetail').screenshot({path:join(output,`menu-${width}.png`)});
    report.viewports.push({width,height,paletteMatched:true,disabledMuted:true,focusVisible:true,horizontalOverflow:false});
    await context.close();
  }
}catch(error){report.errors.push(error.stack||String(error));}
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
await browser.close();
console.log(JSON.stringify(report,null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
