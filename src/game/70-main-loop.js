/* ---------- main loop ---------- */
let last=performance.now(),conT=0,lastEq='';
function frame(now){const rdt=Math.min(0.05,(now-last)/1000);last=now;
  if(typeof tickLivePhysicsCombo==='function')tickLivePhysicsCombo(rdt);
  stepControlledPlayerEnergy(rdt);
  if(RP.on){replayStep(rdt);}else if(E.slow&&!PAUSE.on){const s=E.slow;s.t+=rdt;const e=Math.min(1,s.t/0.15,Math.max(0,(s.dur-s.t)/0.35));E.env=e*e*(3-2*e);E.ts=1-E.env*(1-s.min);if(s.t>=s.dur){E.slow=null;E.slowEnd=performance.now();E.env=0;E.ts=1;}}else{E.env=0;E.ts=1;}
  E.shake=Math.max(0,E.shake-rdt*30);
  if(!PAUSE.on&&!RP.on&&!CINE.on)M.update(rdt*E.ts,rdt);
  if(cv.width!==Math.round((cv.clientWidth||W)*dpr)||cv.height!==Math.round((cv.clientHeight||H*sc)*dpr))resize();
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.setTransform(dpr*sc,0,0,dpr*sc,0,0);
  E.cam=RP.on?RP.cam:camNow();if(!CINE.on)recFrame(rdt);const k=E.cam,sh=RP.on?0:E.shake,shx=sh?(Math.random()-0.5)*sh:0,shy=sh?(Math.random()-0.5)*sh:0;
  V3.on=V3.want();if(V3.on)V3.begin();else V3.hide();if(M===Race)RACE_3D.load();RACE_3D.on=RACE_3D.want();if(!RACE_3D.on)RACE_3D.hide();if(CINE.on)CINE.step(rdt);CROWD.tick(rdt);
  if(M===Kick&&V3.on){window.__KICKLAB_SIDE_STADIUM__=null;window.__KICKLAB_SIDE_GOAL__=null;}
  else if(M===Kick&&Kick.opt.shot!=='dribble')Kick.fallbackSideScene(ctx,k);
  ctx.save();ctx.translate(W/2+shx,H/2+shy);ctx.scale(k.z,k.z);ctx.translate(-k.x,-k.y);const worldOffsetY=typeof M.worldOffsetY==='function'?M.worldOffsetY():0;ctx.translate(0,worldOffsetY);
  M.draw(ctx);drawControlledPlayerEnergy(ctx);if(V3.on)V3.render(Kick.opt.shot==='dribble'?Drib:Kick,k,shx,shy,rdt);if(RACE_3D.on)RACE_3D.render(rdt);if(!RP.on)stepParts(PARTS,rdt*E.ts);drawParts(ctx,PARTS);
  const physicsVision=E.env>0&&physicsVisionVisible();window.__KICKLAB_PHYSICS_VISION__={active:physicsVision,mode:M.key,activity:M===Kick?(Kick.opt.shot==='dribble'?Kick.opt.pso:Kick.opt.shot):M.key,env:E.env,annotations:E.slow?E.slow.annotations!==false:true,persistentMath:typeof stageAdjustmentVisible==='function'&&stageAdjustmentVisible()};
  if(physicsVision){ctx.save();ctx.globalAlpha=0.72*E.env;ctx.fillStyle='#030814';ctx.fillRect(-2000,-2000,5000,5000);ctx.restore();ctx.save();ctx.globalAlpha=E.env;M.drawXray(ctx);ctx.restore();}
  ctx.restore();
  if(physicsVision)xrayFrame(ctx,E.env);
  M.hud(ctx);drawDialHud(ctx);drawWorld(ctx);drawMatch(ctx);drawLive(ctx);drawPause(ctx);drawReplayBadge(ctx);if(CINE.on)CINE.draw(ctx);COACH.tick(rdt);tickHUD(rdt);
  if(E.flash>0){ctx.save();ctx.globalAlpha=E.flash*0.45;ctx.fillStyle='#fff6e0';ctx.fillRect(0,0,W,H);ctx.restore();E.flash=Math.max(0,E.flash-rdt*5);}
  if(E.title){E.title.t+=rdt;const t=E.title.t;if(t>1.6)E.title=null;else{const sc2=t<0.22?1.8-t/0.22*0.8:1,a=t<0.1?t/0.1:t>1.1?Math.max(0,(1.6-t)/0.5):1;ctx.save();ctx.globalAlpha=a;ctx.translate(W/2,H/2-20);ctx.scale(sc2,sc2);glow(ctx,C.xray,24);text(ctx,E.title.text,0,0,'64px '+DISP,C.ink,'center','middle');ctx.shadowBlur=0;text(ctx,E.title.sub,0,46,'600 16px '+BODY,C.xray,'center','middle');ctx.restore();}}
  stepParts(SPARTS,rdt);drawParts(ctx,SPARTS);
  if(physicsVision&&E.env>0.5&&M.callouts){ctx.save();ctx.globalAlpha=clamp((E.env-0.5)*2,0,1);M.callouts(ctx);ctx.restore();}
  conT+=rdt;if(conT>0.1){conT=0;{const r=RECS[M.key];$('#mlClock').textContent=RP.on?fmtT(RP.t):fmtT(r?r.t:0);
      if(RP.on){const lis=[...document.querySelectorAll('#mlList .mv.click')];let cur=null;lis.forEach(li=>{li.classList.remove('cur');if(+li.dataset.t<=RP.t+0.05&&(!cur||+li.dataset.t>+cur.dataset.t))cur=li;});if(cur){cur.classList.add('cur');const L=$('#mlList');L.scrollTop=Math.max(0,cur.offsetTop-L.offsetTop-L.clientHeight/3);}syncFeedReplay();}}const q=M.eqs(),full=q.lines.join('')+q.note;if(full!==lastEq){$('#eqs').innerHTML=full;$('#liveEq').innerHTML=M.LIVE().map(i=>q.lines[i]).join('');lastEq=full;}renderCockpit(q);if(M.liveCoach)M.liveCoach();
    updateAssist();if(typeof renderRaceTelemetry==='function')renderRaceTelemetry();const lk=M.locked?M.locked():false;varEls.forEach(v=>{v.inp.disabled=(!!(v.def.lock||M.key==='kick')&&lk)||isLocked(M.key,v.def.id);});
    const cw=ch.clientWidth;if(cw&&ch.width!==Math.round(cw*dpr))resize();cctx.setTransform(1,0,0,1,0,0);cctx.clearRect(0,0,ch.width,ch.height);cctx.setTransform(dpr,0,0,dpr,0,0);$('#chartCap').textContent=M.chart(cctx,cw||300,160);}
  requestAnimationFrame(frame);}
resize();renderScores();renderXP();placeTicker();setMode('fight');showModeHome({focus:false});maybeOpenFirstRunProfile();requestAnimationFrame(frame);
})();
