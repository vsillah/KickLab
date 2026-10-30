// Browser Gate 1 helpers: reach Race states through visible controls only.
export async function enterHighlandRace(page,{beforeCommit}={}){
  if(await page.locator('#profileFormSave').isVisible())await page.click('#profileFormSave');
  if(await page.locator('#profileClose').isVisible())await page.click('#profileClose');
  await page.click('#lab-tab-race');
  await page.locator('#racePreflight').waitFor({state:'visible',timeout:20000});
  if(!await page.locator('[data-preflight-venue="highland"]').isEnabled())throw Error('Highland is unavailable');
  await page.click('[data-preflight-venue="highland"]');
  for(let step=0;step<4;step++){
    if(step===3&&beforeCommit)await beforeCommit(page);
    if(!await page.locator('#racePreflightNext').isEnabled())throw Error(`Preflight step ${step+1} is blocked`);
    await page.click('#racePreflightNext');
  }
  await page.locator('#racePreflight').waitFor({state:'hidden',timeout:20000});
  const orbit=page.locator('.race-orbit-panel button');if(await orbit.isVisible())await orbit.click();
  await page.waitForFunction(()=>['count','run'].includes(window.__KICKLAB_RACE_MODES_QA__?.state().phase),null,{timeout:30000});
}

export async function finishHighlandDrag(page){
  await page.waitForFunction(()=>window.__KICKLAB_RACE_MODES_QA__?.state().phase==='run',null,{timeout:10000});
  const initial=await page.evaluate(()=>window.__KICKLAB_RACE_MODES_QA__.state());
  if(initial.mode!=='drag')throw Error(`Expected the Highland Drag route, got ${initial.mode}`);
  let shifted=0,previousX=initial.x;
  await page.keyboard.down('Space');
  try{
    for(let step=0;step<180;step++){
      const state=await page.evaluate(()=>window.__KICKLAB_RACE_MODES_QA__.state());
      if(['done','crashed'].includes(state.phase)){
        if(state.phase!=='done'||!state.result?.pass)throw Error(`Race did not pass: ${JSON.stringify(state)}`);
        await page.locator('#results').waitFor({state:'visible',timeout:10000});
        return{initial,final:state,shifted};
      }
      if(state.x+0.01<previousX)throw Error(`Race moved backwards: ${state.x} < ${previousX}`);
      previousX=state.x;
      if(shifted<3&&state.speedKmh>=[46,88,132][shifted]&&await page.locator('#raceTelemetryShift').isVisible()&&await page.locator('#raceTelemetryShift').isEnabled()){
        await page.locator('#raceTelemetryShift').click();shifted++;
      }
      await page.waitForTimeout(200);
    }
    throw Error('Race did not reach a result within 36 seconds of live input');
  }finally{await page.keyboard.up('Space');}
}
