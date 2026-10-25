import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5879/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-awards-states');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(output,{recursive:true});
const executablePath=[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({headless:true,executablePath});
const results=[],errors=[],external=[];
const contrastBackground={earned:'#315a5d',available:'#304b58',locked:'#1b2b3a'};
function luminance(color){const channels=color.startsWith('#')?color.slice(1).match(/../g).map(value=>parseInt(value,16)):color.match(/[\d.]+/g).slice(0,3).map(Number);const linear=channels.map(channel=>{const value=channel/255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;});return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;}
function contrast(foreground,background){const a=luminance(foreground),b=luminance(background);return +(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
const steps=[
  {name:'opening',expected:['available','locked','locked','locked','locked','locked']},
  {name:'core-earned',expected:['earned','available','locked','locked','locked','locked'],qualify:['core',19.25]},
  {name:'drag-earned',expected:['earned','earned','available','locked','locked','locked'],qualify:['drag',1300]}
];
for(const viewport of [{width:360,height:780},{width:390,height:844},{width:768,height:1024},{width:1113,height:900},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('kicklab.profiles.v1',JSON.stringify({version:1,activeId:'progression',legacyProfileId:'progression',profiles:[{id:'progression',nickname:'Progression Fixture',avatar:'rocket',color:'sky',progress:{raceCompetition:{version:1,bests:{},awards:{}}}}]})));
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(`${viewport.width}: ${error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{external.push(url);route.abort();}});
  const url=new URL(base);url.searchParams.set('raceCompetition','prototype');url.searchParams.set('rev',head);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  for(const step of steps){
    if(step.qualify)await page.evaluate(([category,score])=>window.__KICKLAB_RACE_AWARDS_QA__.qualify(category,score),step.qualify);
    if(step.name==='opening')await page.click('#boardBtn');else await page.evaluate(()=>window.__KICKLAB_RACE_AWARDS_QA__.openJourney());
    await page.waitForFunction(()=>[...document.querySelectorAll('.race-journey-art img')].length===6&&[...document.querySelectorAll('.race-journey-art img')].every(img=>img.complete&&img.naturalWidth));
    const state=await page.evaluate(()=>{
      const section=document.querySelector('#raceCompetition');
      const cards=[...section.querySelectorAll('.race-journey-card')].map(card=>{
        const image=card.querySelector('img'),art=card.querySelector('.race-journey-art'),emblem=card.querySelector('.race-journey-emblem'),style=getComputedStyle(image),box=art.getBoundingClientRect(),icon=emblem?.getBoundingClientRect();
        return{status:['earned','available','locked'].find(status=>card.classList.contains(status)),imageFilter:style.filter,imageOpacity:Number(style.opacity),imageAnimation:style.animationName,emblem:!!emblem,emblemWidth:icon?.width||0,emblemCenterOffset:icon?Math.abs((icon.left+icon.width/2)-(box.left+box.width/2)):null,textColors:['h4','p','small','.race-journey-chapter'].map(selector=>getComputedStyle(card.querySelector(selector)).color)};
      });
      return{cards,overflow:section.scrollWidth-section.clientWidth,profileId:window.__KICKLAB_RACE_AWARDS_QA__.state().profileId};
    });
    const label=`${viewport.width}x${viewport.height}-${step.name}`;
    const statuses=state.cards.map(card=>card.status);
    if(JSON.stringify(statuses)!==JSON.stringify(step.expected))errors.push(`${label}: progression ${statuses.join(',')}`);
    if(state.profileId!=='progression'||state.overflow>1)errors.push(`${label}: profile or overflow ${JSON.stringify(state)}`);
    if(state.cards.some(card=>card.imageAnimation!=='none'))errors.push(`${label}: reduced motion is not static`);
    if(state.cards.some(card=>card.status==='earned'&&!card.emblem||card.status==='available'&&card.emblem||card.status==='locked'&&(!card.emblem||card.imageOpacity>.5||!card.imageFilter.includes('grayscale(1)')||card.emblemWidth<80||card.emblemCenterOffset>2)))errors.push(`${label}: visual state contract ${JSON.stringify(state.cards)}`);
    const minContrast=Math.min(...state.cards.flatMap(card=>card.textColors.map(color=>contrast(color,contrastBackground[card.status]))));
    if(minContrast<4.5)errors.push(`${label}: text contrast ${minContrast.toFixed(2)}:1`);
    await page.locator('#raceCompetition').screenshot({path:join(output,`${label}.png`)});
    results.push({label,statuses,overflow:state.overflow,profileId:state.profileId,minTextContrast:+minContrast.toFixed(2)});
    await page.click('#fbClose');
  }
  await context.close();
}
await browser.close();
const report={head,base,results,errors,external};
writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({head,results,errors,external,output},null,2));
if(errors.length||external.length)process.exitCode=1;
