import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:5878/kicklab.html';
const output=resolve(process.argv[3]||'qa-artifacts/race-competition');
const head=process.env.KICKLAB_QA_HEAD||'working';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:[process.env.KICKLAB_CHROMIUM_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path=>path&&existsSync(path))});
const errors=[],external=[],cases=[];
const profiles={version:1,activeId:'p1',legacyProfileId:'p1',profiles:[
  {id:'p1',nickname:'Secret Alpha',avatar:'rocket',color:'sky',progress:{raceCompetition:{version:1,bests:{drag:{score:1100,vehicle:'Cobalt',at:1}},awards:{drag:true}}}},
  {id:'p2',nickname:'Secret Beta',avatar:'wiz',color:'mint',progress:{raceCompetition:{version:1,bests:{drag:{score:1300,vehicle:'Aegis',at:2},endurance:{score:2800,vehicle:'Aegis',at:2}},awards:{drag:true,endurance:true}}}}
]};
async function visit(viewport,{seed=true,flag=true,corrupt=false,fallback=false}={}){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
  if(seed||corrupt)await context.addInitScript(({seed,corrupt,profiles})=>{localStorage.setItem('kicklab.profiles.v1',corrupt?'{corrupt':JSON.stringify(profiles));},{seed,corrupt,profiles});
  if(fallback)await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl'||kind==='webgl2'?null:get.call(this,kind,...args);};});
  const page=await context.newPage(),name=`${viewport.width}x${viewport.height}-${flag?'flag':'default'}${seed?'-profiles':'-empty'}${fallback?'-canvas':''}`;
  page.on('pageerror',error=>errors.push(`${name}: ${error.stack||error.message}`));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{external.push(`${name}: ${url}`);route.abort();}});
  try{
    const url=new URL(base);if(flag)url.searchParams.set('raceCompetition','prototype');if(fallback)url.searchParams.set('raceExpansion','prototype');url.searchParams.set('rev',head);await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
    if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
    if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
    const off=await page.evaluate(()=>({flag:document.documentElement.dataset.raceCompetition||null,competition:document.querySelector('#raceCompetition').hidden,buttons:[document.querySelector('#rRaceBoard').hidden,document.querySelector('#rRaceRecord').hidden]}));
    if(!flag){if(off.flag||!off.competition||off.buttons.some(hidden=>!hidden))throw new Error(`unflagged UI changed: ${JSON.stringify(off)}`);cases.push({name,unflagged:true});return;}
    await page.click('#boardBtn');await page.locator('#raceCompetition').waitFor({state:'visible'});
    await page.locator('[data-race-comp-cat="drag"]').click();
    const state=await page.evaluate(()=>{const section=document.querySelector('#raceCompetition'),board=document.querySelector('#fboard');return{aliases:section.querySelector('#raceCompetitionList').textContent,rank:section.querySelector('#raceCompetitionStats').textContent,awards:section.querySelectorAll('.race-competition-awards .earned').length,overflow:board.scrollWidth-board.clientWidth,sectionOverflow:section.scrollWidth-section.clientWidth,active:document.querySelector('#profileList [aria-current="true"]')?.textContent||'',firstAction:document.elementFromPoint(...(()=>{const r=document.querySelector('[data-race-comp-cat="drag"]').getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2];})())?.closest('[data-race-comp-cat]')?.dataset.raceCompCat}});
    if(state.overflow>1||state.sectionOverflow>1||state.firstAction!=='drag')throw new Error(`board geometry: ${JSON.stringify(state)}`);
    if(seed&&(!state.aliases.includes('Racer 1')||!state.aliases.includes('Racer 2')||state.aliases.includes('Secret')))throw new Error(`alias leak: ${state.aliases}`);
    if(!seed&&!state.aliases.includes('No drag sprint scores'))throw new Error(`empty state: ${state.aliases}`);
    await page.locator('#fboard').screenshot({path:join(output,`${name}-board.png`)});
    cases.push({name,...state});
    if(seed&&!fallback&&viewport.width===390&&viewport.height===844){
      await page.click('#fbClose');await page.click('#homeProfileButton');await page.click('#profileList [data-profile-id="p2"]');await page.click('#profileClose');await page.click('#boardBtn');await page.locator('[data-race-comp-cat="endurance"]').click();
      const switched=await page.locator('#raceCompetitionStats').textContent();if(!switched.includes('2,800 pts'))throw new Error(`profile isolation: ${switched}`);cases.push({name:'profile-switch',best:switched});
    }
    if(fallback){await page.click('#fbClose');await page.click('#lab-tab-race');await page.locator('#gamePacingOverlay').waitFor({state:'hidden',timeout:20000});const got=await page.evaluate(()=>window.__KICKLAB_RACE_MODES_QA__?.state().canvasFallback);cases.push({name:'canvas-fallback',value:got});}
  }catch(error){errors.push(`${name}: ${error.stack||error}`);}finally{await context.close();}
}
for(const viewport of [{width:360,height:780},{width:390,height:844},{width:768,height:1024},{width:1113,height:900},{width:1440,height:900},{width:390,height:650}])await visit(viewport);
await visit({width:390,height:844},{seed:false});
await visit({width:390,height:844},{seed:false,corrupt:true});
await visit({width:390,height:844},{flag:false});
await visit({width:390,height:844},{fallback:true});
await browser.close();
const report={head,base,cases,errors,external};writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:cases.map(item=>item.name),errors,external,output},null,2));if(errors.length||external.length)process.exitCode=1;
