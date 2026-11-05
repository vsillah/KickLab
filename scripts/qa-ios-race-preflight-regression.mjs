import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.argv[2]||'http://127.0.0.1:4173/kicklab.html';
const out=resolve(process.argv[3]||'qa-artifacts/ios-race-preflight-regression');
const sha=v=>createHash('sha256').update(v).digest('hex');
if(sha(Buffer.from(await(await fetch(base)).arrayBuffer()))!==sha(readFileSync('dist/kicklab.html')))throw Error('Served HTML differs from this build');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report={cases:[],errors:[],external:[]};
try{
  for(const [width,height] of [[812,375],[844,390],[874,402],[932,430],[390,844],[768,1024],[1440,900]]){
    if(process.env.KICKLAB_QA_WIDTH&&Number(process.env.KICKLAB_QA_WIDTH)!==width)continue;
    const label=`${width}x${height}`;console.log(`Preflight ${label}`);
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',...(width===812?{recordVideo:{dir:out,size:{width,height}}}:{})});
    await context.addInitScript(()=>{localStorage.setItem('impactlab.v1',JSON.stringify({gfx:'3d'}));localStorage.setItem('impactlab.nick','QA Player');});
    const page=await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
    await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(new URL(base).origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(`${label}: ${url}`);route.abort();});
    try{
      const url=new URL(base);for(const key of ['raceTelemetry','raceCornerTrace','raceProgression','raceExpansion','raceCompetition','raceChampionship','raceMultiplayer','raceSimulator','racePreflight','raceInstruments'])url.searchParams.set(key,'prototype');url.searchParams.set('raceSystems','proxy');url.searchParams.set('raceCompactGuidanceQA','1');url.searchParams.set('rev',process.env.KICKLAB_QA_REV||'ios-race-landscape');
      await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
      if(await page.locator('#profileFormSave').isVisible())await page.locator('#profileFormSave').click();
      if(await page.locator('#profileClose').isVisible())await page.locator('#profileClose').click();
      await page.locator('#lab-tab-race').click();
      await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
      const state=[];
      for(const [name,action] of [['route',async()=>{await page.locator('[data-preflight-venue="highland"]').click();await page.locator('[data-preflight-mode="drag"]').click();}],['vehicle',async()=>{await page.locator('#racePreflightNext').click();await page.locator('[data-preflight-vehicle="kestrel"]').click();}],['tuning',async()=>{await page.locator('#racePreflightNext').click();await page.locator('[data-preflight-part="brakes"][data-preflight-value="sport"]').click();}],['grid',async()=>{await page.locator('#racePreflightNext').click();}]]){
        await action();
        const view=await page.evaluate(()=>{const e=document.querySelector('#racePreflight'),f=document.querySelector('.race-preflight-footer'),r=e.getBoundingClientRect(),b=f.getBoundingClientRect();return{dialog:{top:r.top,bottom:r.bottom},footer:{top:b.top,bottom:b.bottom},draft:window.__KICKLAB_RACE_PREFLIGHT_QA__?.state().draft,overflow:document.documentElement.scrollWidth-innerWidth};});
        if(view.dialog.top<0||view.dialog.bottom>height+1||view.footer.top<0||view.footer.bottom>height+1||view.overflow>1)throw Error(`${name} clipped: ${JSON.stringify(view)}`);
        await page.screenshot({path:join(out,`${label}-${name}.png`)});state.push({name,...view});
      }
      if(state.at(-1).draft.vehicle!=='kestrel'||state.at(-1).draft.garage.brakes!=='sport')throw Error(`Selection did not reach grid: ${JSON.stringify(state.at(-1))}`);
      if(width>height&&height<=430){
        await page.locator('#racePreflightNext').click();
        await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
        await page.waitForFunction(()=>document.documentElement.dataset.racePhase==='grid');
        const grid=await page.evaluate(()=>{const bounds=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};return{cockpit:bounds('#game-cockpit'),stage:bounds('#game-cockpit .stage'),pad:bounds('#padL'),gas:bounds('#raceDialGas'),phase:document.documentElement.dataset.racePhase};});
        if(grid.cockpit.x<0||grid.cockpit.y<0||grid.cockpit.right>width+1||grid.cockpit.bottom>height+1||grid.stage.bottom>height+1||grid.pad.bottom>height+1||grid.gas.bottom>height+1)throw Error(`Race grid clipped before lights: ${JSON.stringify(grid)}`);
        await page.screenshot({path:join(out,`${label}-grid-viewport.png`)});
        state.push({name:'grid-viewport',...grid});
        const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
        await page.waitForFunction(()=>document.documentElement.dataset.racePhase==='run',null,{timeout:25000});
        for(const [mode,button,selectors,gasCandidates] of [['classic',null,['#padL','#padR [data-id="brake"]','#raceActionDial'],['#raceDialGas','#padR [data-id="gas"]']],['analog','#analogControlsButton',['.analog-zone','#raceAnalogActions [data-race-assist="brake"]','#raceActionDial'],['#raceDialGas','#gestureAction']],['simulator','#simulatorControlsButton',['.sim-status','.sim-live-top','.sim-live-foot','.sim-controls'],['#raceDialGas','#simGas']]]){
          if(button)await page.locator(button).click();
          await page.waitForTimeout(150);
          const controls=await page.evaluate(selectors=>selectors.map(selector=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();return{selector,visible:!!e?.getClientRects().length,x:r?.x,y:r?.y,right:r?.right,bottom:r?.bottom,width:r?.width,height:r?.height};}),[...selectors,...gasCandidates,'.stage>.floating-control-head']);
          const fits=c=>c.visible&&c.x>=0&&c.y>=0&&c.right<=width&&c.bottom<=height;
          if(controls.slice(0,selectors.length).some(c=>!fits(c))||!controls.slice(selectors.length).some(fits))throw Error(`${mode} control clipped: ${JSON.stringify(controls)}`);
          const surfaces=[...controls.slice(0,selectors.length),controls.at(-1)].filter(c=>c.visible);
          const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>-6&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>-6;
          for(let i=0;i<surfaces.length;i++)for(let j=i+1;j<surfaces.length;j++)if(overlap(surfaces[i],surfaces[j]))throw Error(`${mode} control surfaces collide: ${JSON.stringify([surfaces[i],surfaces[j]])}`);
          const occupancy=surfaces.reduce((sum,c)=>sum+c.width*c.height,0)/(width*height);
          if(occupancy>.22)throw Error(`${mode} control area ${occupancy.toFixed(3)} exceeds 22% viewport budget`);
          const presentation=await page.evaluate(()=>{const canvas=document.querySelector('#raceNavigationCanvas'),svg=document.querySelector('#raceNavigationMap'),dial=document.querySelector('#raceActionDial');const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();for(let i=0;i<pixels.length;i+=32)colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);return{canvas:!!canvas.getClientRects().length,renderer:canvas.dataset.renderer,svg:!!svg.getClientRects().length,colors:colors.size,wheel:getComputedStyle(dial.querySelector('.race-dial-housing')).display,gauge:getComputedStyle(dial.querySelector('.race-dial-gauge')).display,feed:getComputedStyle(document.querySelector('#feed')).display};});
          if(!presentation.canvas||presentation.renderer!=='canvas-road-plan'||presentation.svg||presentation.colors<6||presentation.wheel!=='none'||presentation.gauge!=='none'||presentation.feed!=='none')throw Error(`${mode} map/wheel presentation: ${JSON.stringify(presentation)}`);
          const dialHits=await page.evaluate(()=>['#raceDialGas','#raceDialAction','#raceDialPrevious','#raceDialNext'].map(selector=>{const e=document.querySelector(selector);if(!e||!e.getClientRects().length)return{selector,visible:false};const r=e.getBoundingClientRect(),found=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{selector,visible:true,hit:found===e||e.contains(found),bottom:r.bottom}}));
          if(dialHits.some(c=>c.visible&&(!c.hit||c.bottom>height)))throw Error(`${mode} dial button clipped or covered: ${JSON.stringify(dialHits)}`);
          const gasBox=await page.locator('#raceDialGas').boundingBox();await page.mouse.move(gasBox.x+gasBox.width/2,gasBox.y+gasBox.height/2);await page.mouse.down();
          await page.evaluate(mode=>{const t=document.createElement('div');t.className='toast race-phone-notice';t.setAttribute('role','status');t.innerHTML='<div class="ic" aria-hidden="true">★</div><div class="toast-copy"><b>QA notification</b><span></span></div><button type="button" class="toast-close" aria-label="Dismiss QA notification">×</button>';t.querySelector('span').textContent=`${mode} control held; stay in lane.`;document.querySelector('#toasts').replaceChildren(t);const coach=document.querySelector('#raceCoachNotice');coach.hidden=false;coach.querySelector('.race-coach-notice-text').textContent=`QA ${mode} braking notice.`;},mode);
          await page.waitForTimeout(350);
          const notices=await page.evaluate(selectors=>selectors.map(selector=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();return{selector,visible:!!e?.getClientRects().length,x:r?.x,y:r?.y,right:r?.right,bottom:r?.bottom,width:r?.width,height:r?.height};}),[...selectors,'.stage>.floating-control-head','#raceNavigation','#racePhoneProgress','#raceCoachNotice','#toasts .toast','#racePhoneToolsToggle']);
          await page.mouse.up();
          const visible=notices.filter(c=>c.visible&&c.width&&c.height);
          if(visible.some(c=>!fits(c)))throw Error(`${mode} notification or control clipped: ${JSON.stringify(visible)}`);
          for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++)if(overlap(visible[i],visible[j]))throw Error(`${mode} notification/control collision: ${JSON.stringify([visible[i],visible[j]])}`);
          await page.screenshot({path:join(out,`${label}-${mode}-live.png`)});if(width===812)await page.waitForTimeout(1600);state.push({name:mode,controls,occupancy,presentation,notices});
        }
        if(width===812){
          const guidance=await page.evaluate(()=>{
            const points=[];for(let x=-35;x<=120;x+=3)points.push({x,y:0,tx:1,ty:0});for(let i=1;i<=60;i++){const a=-Math.PI/2+i*Math.PI/120;points.push({x:120+40*Math.cos(a),y:40+40*Math.sin(a),tx:-Math.sin(a),ty:Math.cos(a)});}for(let y=43;y<=150;y+=3)points.push({x:160,y,tx:0,ty:1});
            const route=KickLabRaceDriverNavigation.route(points,false),bounds={minX:-35,maxX:160,minY:0,maxY:150},parameters={top:55,mu:1,response:1,stability:1,turnIn:1,brakePower:1},samples=[['brake',{x:111,y:0,v:25,th:0}],['turn',{x:120,y:0,v:15,th:0}],['apex',{x:148,y:10,v:15,th:0}],['accelerate',{x:160,y:40,v:14,th:Math.PI/2}],['recover',{x:148,y:10,v:16,th:0,slipAngle:.3}]],result=[];
            for(const [expected,state] of samples){const nav=KickLabRaceDriverNavigation.plan({route,state:{e:0,slipAngle:0,...state},parameters,mode:'hill',grip:1});window.__KICKLAB_RACE_COMPACT_GUIDANCE_QA__.paint(route,nav,bounds);const canvas=document.querySelector('#raceNavigationCanvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let colored=0;const rgb=({brake:[255,136,121],turn:[255,202,119],apex:[249,237,155],accelerate:[121,233,187],recover:[255,152,156]})[expected];for(let i=canvas.width*28*4;i<pixels.length;i+=4)if(pixels[i]===rgb[0]&&pixels[i+1]===rgb[1]&&pixels[i+2]===rgb[2])colored++;result.push({expected,stage:nav.stage,target:canvas.dataset.guidanceTarget,colored,accessible:canvas.getAttribute('aria-label'),image:canvas.toDataURL()});}
            window.__KICKLAB_RACE_COMPACT_GUIDANCE_QA__.refresh();return result;
          });
          const targets={brake:'apex',turn:'apex',apex:'exit',accelerate:'exit',recover:'exit'};
          if(guidance.some(item=>item.stage!==item.expected||item.target!==targets[item.expected]||item.colored<5||!item.accessible.includes(item.expected==='accelerate'?'Exit aligned':item.expected==='recover'?'Rear sliding':item.expected==='brake'?'Brake for':item.expected==='turn'?'Turn left':'At the left apex'))||new Set(guidance.map(item=>item.image)).size!==guidance.length)throw Error(`Canvas guidance did not follow navigation telemetry: ${JSON.stringify(guidance.map(({image,...item})=>item))}`);
          for(const item of guidance)writeFileSync(join(out,`${label}-guidance-${item.expected}.png`),Buffer.from(item.image.split(',')[1],'base64'));
          state.push({name:'canvas-guidance-stages',samples:guidance.map(({image,...item})=>item)});
          await page.locator('#classicControlsButton').click();
          await page.locator('#cv').click({position:{x:width/2,y:height/2}});
          await page.locator('#gamePacingResume').waitFor({state:'visible',timeout:3000});
          const paused=await page.evaluate(()=>({coach:!!document.querySelector('#raceCoachNotice').getClientRects().length,toast:!!document.querySelector('#toasts .toast')?.getClientRects().length,map:!!document.querySelector('#raceNavigation').getClientRects().length}));
          if(paused.coach||paused.toast||paused.map)throw Error(`Pause left live notices/map over overlay: ${JSON.stringify(paused)}`);
          await page.screenshot({path:join(out,`${label}-paused-with-notices.png`)});
          await page.locator('#gamePacingResume').click();
          await page.waitForFunction(()=>document.documentElement.dataset.racePhase==='run'&&!document.querySelector('#gamePacingOverlay').getClientRects().length,null,{timeout:3000});
          await page.setViewportSize({width:375,height:812});await page.waitForTimeout(200);
          const portrait=await page.evaluate(()=>({canvas:!!document.querySelector('#raceNavigationCanvas').getClientRects().length,svg:!!document.querySelector('#raceNavigationMap').getClientRects().length,phase:document.documentElement.dataset.racePhase}));
          if(portrait.canvas||!portrait.svg||portrait.phase!=='run')throw Error(`Rotation map presentation: ${JSON.stringify(portrait)}`);
          await page.setViewportSize({width,height});await page.waitForTimeout(200);
          const returned=await page.evaluate(()=>({canvas:!!document.querySelector('#raceNavigationCanvas').getClientRects().length,svg:!!document.querySelector('#raceNavigationMap').getClientRects().length,phase:document.documentElement.dataset.racePhase}));
          if(!returned.canvas||returned.svg||returned.phase!=='run')throw Error(`Landscape return map presentation: ${JSON.stringify(returned)}`);
          state.push({name:'pause-rotation',paused,portrait,returned});
        }
      }
      report.cases.push({label,state});
    }catch(error){report.errors.push(`${label}: ${error.message}`);}finally{await context.close();if(width===812&&page.video())await page.video().saveAs(join(out,'812x375-three-modes.webm'));}
  }
}finally{await browser.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:report.cases.map(c=>c.label),errors:report.errors,external:report.external},null,2));
if(report.errors.length||report.external.length)process.exitCode=1;
