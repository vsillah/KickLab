const Race={
  key:'race',
  gas:false,brake:false,
  opt:{car:'street',steer:'you',venue:'highland'},
  V:{mu:0.9,m:1400,F:8500,R:32},
  COL:{mu:['μ',C.xray],m:['m',C.violet],F:['F',C.hot],R:['R',C.pink],v:['v',C.good],w:['θ',C.yellow]},
  CARS:{kart:{name:'Go-kart',m:160,F:2200,top:30,len:2.1,wid:1.3,Lwb:1.05,col:'#5fe3a1'},street:{name:'Street car',m:1400,F:8500,top:55,len:4.5,wid:1.85,Lwb:2.7,col:'#7fdcff'},race:{name:'Race car',m:760,F:11000,top:80,len:4.9,wid:1.95,Lwb:2.9,col:'#ff6b73'}},
  RATIO:15,L:120,HW:7,S:4.2,OX:66,OY:452,WH:{x:112,y:178,r:60},
  hint:'Drag the wheel on the stage, or ← →',
  LIVE(){return[1,3,4];},
  groups(){return[
    {id:'car',label:'Car',choices:Object.entries(this.CARS).map(([k,c])=>[k,c.name,`wheelbase ${c.Lwb} m`])},
    {id:'steer',label:'Steering',choices:[['you','You steer','drag wheel or ← →'],['auto','Autopilot','watch the math']]},
    ...(RACE_SYSTEMS.enabled()?[{id:'venue',label:'Structural venue',choices:Object.values(RACE_SYSTEMS.VENUES).map(v=>[v.id,v.name,'Systems prototype · no final scenery'])}]:[])];},
  onOpt(id,v){if(id==='car'){const c=this.CARS[v];this.V.m=c.m;this.V.F=c.F;}},
  vars(){return[
    {id:'mu',sym:'μ',name:'tire grip (friction coefficient)',unit:'',min:0.3,max:1.6,step:0.05,d:2,col:C.xray,pre:[[0.5,'wet'],[0.9,'street'],[1.4,'slicks']]},
    {id:'R',sym:'R',name:'corner radius (reshapes the track)',unit:'m',min:20,max:60,step:1,d:0,col:C.pink,lock:true,pre:[[20,'hairpin'],[32,'normal'],[55,'sweeper']]},
    {id:'m',sym:'m',name:'car mass',unit:'kg',min:150,max:2000,step:10,d:0,col:C.violet},
    {id:'F',sym:'F',name:'engine force',unit:'N',min:1000,max:15000,step:100,d:0,col:C.hot}];},
  actions(){return[{id:'gas',dir:'up',aria:'Gas (up)',hold:true},{id:'brake',dir:'down',aria:'Brake (down)',hold:true},{id:'left',dir:'left',aria:'Steer left',hold:true},{id:'right',dir:'right',aria:'Steer right',hold:true},
    {id:'brake',label:'Brake',aria:'Brake (B)',icon:'brake',color:'#ff4d4d',key:'B',hold:true},{id:'gas',label:'Gas',aria:'Gas (Space)',icon:'gas',color:'#2fd37a',key:'SPACE',big:true,hold:true,primary:true},
    ...(RACE_SYSTEMS.enabled()&&!RACE_TELEMETRY.enabled?[{id:'drift',label:'Drift',aria:'Hold Drift (Shift)',icon:'mv_spin',color:'#f0bc73',key:'SHIFT',hold:true},{id:'nitro',label:'Nitro',aria:'Hold Nitro (N)',icon:'gas',color:'#7fcfff',key:'N',hold:true}]:[])];},
  locked(){return this.state==='run'||this.state==='count';},
  FIN(){return this.V.R+40;},
  P(){const c=this.CARS[this.opt.car],v=RACE_SYSTEMS.enabled()?RACE_SYSTEMS.venue(this.opt.venue):null,tireMu=this.V.mu,cornerFactor=v?v.baseGrip*v.gripZones.find(z=>z.from<=this.L&&z.to>this.L).multiplier:1;return{L:this.L,R:this.V.R,m:this.V.m,F:this.V.F,top:c.top,mu:tireMu*cornerFactor,...(v?{tireMu}:{}),Lwb:c.Lwb,ratio:this.RATIO};},
  sx(x){return this.OX+x*this.S;},sy(y){return this.OY-y*this.S;},
  suggest(){const P=this.P(),o={},vk=Math.sqrt(P.mu*G0*P.R)*3.6;
    o.mu={lo:1.2,hi:1.6,note:`1.2–1.6. The corner limit is √(μ·g·R) = ${fmt(vk,0)} km/h now; more grip also shortens braking.`};
    o.R={lo:20,hi:32,note:`20–32 m. A tighter corner has a lower limit, but corner time only grows like √R while the path gets longer, so tight wins.`};
    const Fcap=P.mu*G0*P.m;o.F={lo:Math.min(15000,Math.ceil(Fcap/100)*100),hi:15000,note:`at least ${fmt(Fcap,0)} N. Past that the tires spin: a is capped at μ·g = ${fmt(P.mu*G0)} m/s².`};
    const mCap=P.F/(P.mu*G0);o.m={lo:150,hi:clamp(Math.floor(mCap/10)*10,150,2000),note:`under ${fmt(Math.min(2000,mCap),0)} kg your launch is grip-limited, the best a = F ÷ m can do.`};return o;},
  snap(){return{st:{...this.st},spin:this.spin,trailN:this.trail.length,skidsN:this.skids.length,state:this.state,wheel:this.wheel,inp:{...this.inp},cd:this.cd,endT:this.endT,...(this.telemetry?{telemetry:{...this.telemetry}}:{})};},
  applySnap(o,r){this.st={...o.st};this.spin=o.spin;this.trail=(r.trail||this.trail).slice(0,o.trailN);this.skids=(r.skids||this.skids).slice(0,o.skidsN);this.state=o.state;this.wheel=o.wheel;this.inp={...o.inp};this.cd=o.cd;this.endT=o.endT;if(o.telemetry)this.telemetry={...o.telemetry};},
  review(r){const mv=r.moves,m=r.meta||{},sm=r.sum||{},K=k=>mv.filter(x=>x.kind===k);const br=K('brake')[0],en=K('entry')[0],sl=K('slide'),fin=K('finish')[0],cr=K('crash')[0];
    const best=[],work=[],plan=[];
    if(en&&en.v<=en.vmax*1.02&&en.v>=en.vmax*0.85)best.push({score:3,t:en.t,text:`${en.title}: ${en.res}`,math:en.math});
    if(br&&br.tone==='good')best.push({score:2,t:br.t,text:br.title+': right on the math',math:br.math});
    if(fin)best.push({score:1,t:fin.t,text:`Finished in ${fmt(sm.t,2)} s`,math:fin.math});
    if(en&&en.v>en.vmax*1.02)work.push({score:5,t:en.t,text:`${en.title}: over the limit`,math:en.math,tip:`Arrive at ≤ ${fmt(en.vmax*3.6,0)} km/h, or raise μ: the limit grows like √μ.`});
    if(en&&en.v<en.vmax*0.85)work.push({score:3,t:en.t,text:`${en.title}: only ${en.res}`,math:en.math,tip:'You braked more than you needed. Brake later and carry more speed.'});
    if(br&&br.tone==='bad')work.push({score:4,t:br.t,text:br.d2c<br.dN?`${br.title}: too late`:`${br.title}: too early`,math:br.math,tip:br.d2c<br.dN?`You needed ${fmt(br.dN,0)} m. Hit the brakes before the ${br.dN>50?100:50} board.`:`You only needed ${fmt(br.dN,0)} m. Brake ${fmt(br.d2c-br.dN,0)} m later.`});
    if(!br&&cr)work.push({score:6,t:cr.t,text:'Never braked before the corner',math:cr.math,tip:'Brake on the straight: d = (v² − v_max²) ÷ (2·0.95·μ·g).'});
    sl.forEach(x=>work.push({score:4,t:x.t,text:`${x.title} at ${x.res}`,math:x.math,tip:'Ease the wheel or the speed: grip needed v²÷R_turn has to stay under μ·g.'}));
    if(cr)work.push({score:7,t:cr.t,text:cr.title,math:cr.math});
    if(sm.you&&sm.wNeed&&Math.abs(sm.wAvg-sm.wNeed)>8)plan.push(`Your wheel averaged ${fmt(sm.wAvg,0)}° but the math says 15 × atan(L ÷ R) = ${fmt(sm.wNeed,0)}°. Match the yellow notch.`);
    if(br&&br.tone==='bad')plan.push(`Brake at ${fmt(br.dN,0)} m before the corner (from ${fmt(br.v*3.6,0)} km/h).`);
    if(sm.slideT>0.05)plan.push(`You slid for ${fmt(sm.slideT,1)} s. Keep v² ÷ R_turn under μ·g = ${fmt((m.mu||0.9)*G0)} m/s².`);
    if(m.mu<1.4&&!isLocked('race','mu'))plan.push(`More grip: μ = 1.4 lifts the corner limit to ${fmt(Math.sqrt(1.4*G0*(m.R||32))*3.6,0)} km/h.`);
    if(!plan.length)plan.push('Clean run. Try a tighter R or the Race car to cut more time.');
    return{title:r.title,noun:'run',stats:[['Time',sm.ok?fmt(sm.t,2)+' s':'DNF'],['Top speed',fmt((sm.vp||0)*3.6,0)+' km/h'],['Corner entry',en?`${fmt(en.v*3.6,0)} km/h`:'—'],['Corner limit',fmt((m.vmax||0)*3.6,0)+' km/h'],['Sliding',fmt(sm.slideT||0,1)+' s'],['Wheel avg / needed',sm.wNeed?`${fmt(sm.wAvg,0)}° / ${fmt(sm.wNeed,0)}°`:'—']],best:topN(best,3),work:topN(work,3),plan:plan.slice(0,4)};},
  needW(){return this.RATIO*Math.atan(this.CARS[this.opt.car].Lwb/this.V.R)/DEG;},
  reset(){if(RECS.race&&RECS.race.on)stopRec('race');this.sliding=false;this.wasBrake=false;const ch=curCh('race');this.HW=(ch&&ch.env&&ch.env.hw)||7;this.st={x:4,y:0,th:0,v:0,t:0,e:0,k:0,kc:0,alat:0,need:0,zone:0,slide:false,wheel:0,...(RACE_SYSTEMS.enabled()?RACE_SYSTEMS.initial():{})};this.telemetry=RACE_TELEMETRY.enabled?RACE_TELEMETRY.initial():null;this.wheel=0;this.state='grid';this.inp={gas:false,brake:false,left:false,right:false,...(RACE_SYSTEMS.enabled()?{drift:false,nitro:false}:{})};this.cd=0;this.inTurn=false;this.vEntry=0;this.vPeak=0;this.res=null;this.spin=0;this.endT=0;this.trail=[];this.trailT=0;this.skids=[];this.skidPrev=null;this.wSum=0;this.wT=0;this.slideT=0;this.warnB=false;this.warnS=false;this.warnT=false;this.lastDynamicsMode='none';this.lastTelemetryPhase='ready';this.lastTelemetryLock='';this.lastTelemetryRecommendation='';this.lastGripRecoveryUntil=0;RACE_3D.resetOrbit();},
  press(id,down){if(RACE_3D.shouldBlockInput()){RACE_3D.startOrbit();return;}if(id==='gas'){this.inp.gas=down;this.gas=down;if(down&&this.state==='grid'){this.state='count';this.cd=2.4;hideResults();{const P=this.P();startRec('race',`Run · ${this.CARS[this.opt.car].name} · μ ${fmt(P.mu,2)} · R ${P.R} m`);RECS.race.meta={mu:P.mu,R:P.R,L:P.L,vmax:Math.sqrt(P.mu*G0*P.R),need:this.needW()};}tone(440,0.2,'square',0.05);}else if(down&&(this.state==='done'||this.state==='crashed')&&this.endT>0.8)this.reset();}
    if(id==='brake'){this.inp.brake=down;this.brake=down;}if(id==='left')this.inp.left=down;if(id==='right')this.inp.right=down;if(id==='center')this.wheel=0;if(RACE_SYSTEMS.enabled()&&!RACE_TELEMETRY.enabled&&(id==='drift'||id==='nitro'))this.inp[id]=down;},
  curWheel(){return this.opt.steer==='auto'?this.st.wheel:this.wheel;},
  update(dt,rdt){if(RACE_3D.shouldBlockInput())return;const P=this.P(),s=this.st;
    const analog=this.analogControl&&this.analogControl.active?this.analogControl:null,gas=analog?Math.max(0,-analog.y):this.inp.gas,brake=analog?Math.max(0,analog.y):this.inp.brake;
    if(this.opt.steer==='you'){const turnSign=RACE_SYSTEMS.enabled()?1:-1;if(analog)this.wheel=clamp(turnSign*analog.x*180,-180,180);else{const d=(this.inp.right?1:0)-(this.inp.left?1:0);if(d)this.wheel=clamp(this.wheel+turnSign*d*150*rdt,-180,180);}}
    if(this.state==='count'){const before=Math.floor((2.4-this.cd)/0.8);this.cd-=rdt;const after=Math.floor((2.4-this.cd)/0.8);if(after>before&&after<3)tone(440,0.2,'square',0.05);if(this.cd<=0){this.state='run';tone(880,0.35,'square',0.06);const P=this.P(),a=P.F/P.m,cap=P.mu*G0;logMove('race',{who:'sys',kind:'go',title:'GO!',math:`a = F÷m = ${fmt(P.F,0)}÷${fmt(P.m,0)} = ${fmt(a)} m/s²${a>cap?` → grip cap μg = ${fmt(cap)}`:''}`,tone:'info'});}return;}
    if(this.state==='run'){ENGINE.on();ENGINE.set(42+s.v*3.4+(gas?18*gas:0)+(this.telemetry?this.telemetry.rpm*25-this.telemetry.overheat*28:0),0.035);}else ENGINE.off();
    if(this.state==='run'&&(s.slide||(brake&&s.v>8))){const car=this.CARS[this.opt.car],back=car.len*0.34*1.8,side=car.wid*0.46*1.8,cx=s.x-Math.cos(s.th)*back,cy=s.y-Math.sin(s.th)*back,nx=-Math.sin(s.th)*side,ny=Math.cos(s.th)*side;
      const seg={l:{x:cx+nx,y:cy+ny},r:{x:cx-nx,y:cy-ny}};if(this.skidPrev)this.skids.push([this.skidPrev,seg]);this.skidPrev=seg;if(this.skids.length>1500)this.skids.shift();
      if(s.slide&&Math.random()<rdt*40)burst(PARTS,this.sx(cx),this.sy(cy),1,{sp:[5,25],life:1.1,size:5,kind:'smoke',col:'#c9d2e3',drag:1});
      this.skidSnd=(this.skidSnd||0)-rdt;if(s.slide&&this.skidSnd<=0){SND.skid();this.skidSnd=0.2;}}else this.skidPrev=null;
    if(this.state==='run'){const n=Math.max(1,Math.ceil(dt/0.004)),h=dt/n;
      for(let i=0;i<n;i++){if(this.telemetry){const t=this.telemetry,driveGas=gas*(t.overheat?.38:t.lock==='torque'?1.06:1),boost=t.nosPulse>0&&gas>.1&&!t.overheat;RACE_SYSTEMS.step(s,P,{gas:driveGas,brake,wheel:this.wheel,auto:this.opt.steer==='auto',drift:s.zone===1&&Math.abs(this.wheel)>9&&t.grip>.45,nitro:boost},h,RACE_SYSTEMS.venue(this.opt.venue));RACE_TELEMETRY.step(t,s,{gas:driveGas,brake,nitro:boost},P,h);}else if(RACE_SYSTEMS.enabled())RACE_SYSTEMS.step(s,P,{gas,brake,wheel:this.wheel,auto:this.opt.steer==='auto',drift:this.inp.drift,nitro:this.inp.nitro},h,RACE_SYSTEMS.venue(this.opt.venue));else raceStep(s,P,{gas,brake,wheel:this.wheel,auto:this.opt.steer==='auto'},h);
        if(RACE_SYSTEMS.enabled()&&s.driftMode!==this.lastDynamicsMode){if(s.driftMode==='drift'){logMove('race',{who:'you',kind:'drift',title:'Controlled drift',res:`${fmt(s.v*3.6,0)} km/h`,math:`slip ${fmt(Math.abs(s.slipAngle)*180/Math.PI,0)}° · grip ${fmt(s.muEffective,2)}`,tone:'info'});COACH.say('Hold the line through the drift; ease the wheel to straighten out.','tip',4);}else if(s.driftMode==='skid')COACH.say('The tires lost the line. Brake and unwind the wheel to recover.','warn',4);this.lastDynamicsMode=s.driftMode;}
        if(s.x<P.L&&s.v>this.vPeak)this.vPeak=s.v;
        if(s.zone===1){this.wSum+=Math.abs(s.wheel)*h;this.wT+=h;}
        if(brake&&!this.wasBrake&&s.zone===0&&s.v>3){const vm=Math.sqrt(P.mu*G0*P.R),d2c=P.L-s.x,dN=s.v>vm?(s.v*s.v-vm*vm)/(2*0.95*P.mu*G0):0;logMove('race',{who:'you',kind:'brake',d2c,dN,v:s.v,title:`Brake at ${fmt(d2c,0)} m to the corner`,res:`${fmt(s.v*3.6,0)} km/h`,math:`need d = (v²−v_max²)÷(2·0.95·μ·g) = ${fmt(dN,0)} m`,tone:d2c>=dN-2&&d2c<=dN+25?'good':'bad'});}
        this.wasBrake=brake;
        if(s.slide&&!this.sliding&&s.v>3){this.sliding=true;logMove('race',{who:'rex',kind:'slide',v:s.v,need:s.need,have:P.mu*G0,title:'Tires sliding',res:`${fmt(s.v*3.6,0)} km/h`,math:`v²÷R_turn = ${fmt(s.need)} > μg = ${fmt(P.mu*G0)} m/s²`,tone:'bad'});}else if(!s.slide)this.sliding=false;
        if(s.slide){this.slideT+=h;if(!this.warnS&&s.zone>0){this.warnS=true;COACH.say("You're sliding: v² ÷ R_turn is bigger than μ·g. Ease off the gas or unwind the wheel a touch.",'warn',5);}}
        if(s.zone===0&&!brake&&!this.warnB){const vm=Math.sqrt(P.mu*G0*P.R);if(s.v>vm*1.05){const dNeed=(s.v*s.v-vm*vm)/(2*0.95*P.mu*G0);if(P.L-s.x<dNeed+10){this.warnB=true;COACH.say(`Brake now! ${fmt(s.v*3.6,0)} km/h and this corner tops out at ${fmt(vm*3.6,0)}. You need ${fmt(dNeed,0)} m to slow down.`,'warn',5);}}}
        if(s.zone===1&&!this.warnT&&this.opt.steer==='you'&&s.th*(RACE_SYSTEMS.enabled()?RACE_SYSTEMS.venue(this.opt.venue).turn:1)<0.3){const need=this.RATIO*Math.atan(this.CARS[this.opt.car].Lwb/P.R)/DEG;if(s.x>P.L+3&&Math.abs(this.wheel-need*(RACE_SYSTEMS.enabled()?RACE_SYSTEMS.venue(this.opt.venue).turn:1))>20){this.warnT=true;COACH.say(`Turn in! This corner wants about ${fmt(need,0)}° of wheel. You have ${fmt(this.wheel,0)}°.`,'warn',5);}}
        if(!this.inTurn&&s.zone===1){this.inTurn=true;this.vEntry=s.v;{const vm=Math.sqrt(P.mu*G0*P.R);logMove('race',{who:'you',kind:'entry',v:s.v,vmax:vm,title:`Corner entry ${fmt(s.v*3.6,0)} km/h`,res:`${Math.round(s.v/vm*100)}% of limit`,math:`v_max = √(μ·g·R) = √(${fmt(P.mu,2)}×9.81×${P.R}) = ${fmt(vm*3.6,0)} km/h`,tone:s.v<=vm*1.02?(s.v>=vm*0.85?'good':'info'):'bad'});}if(!this.telemetry&&!(typeof maybeStartLivePhysicsRaceCombo==='function'&&maybeStartLivePhysicsRaceCombo()))startSlow({focus:()=>({x:this.sx(this.st.x),y:this.sy(this.st.y)}),zoom:1.9,dur:1.8,min:0.2});}
        if(Math.abs(s.e)>this.HW){burst(PARTS,this.sx(s.x),this.sy(s.y),26,{sp:[20,90],life:1.4,size:6,kind:'smoke',col:'#b8a27a',drag:1.2});this.state='crashed';this.finish(false,s.e*(RACE_SYSTEMS.enabled()?RACE_SYSTEMS.venue(this.opt.venue).turn:1)>0?'outside':'inside');sfx(0.7,0.7);E.shake=reduce?0:8;break;}
        if(s.zone===2&&s.y*(RACE_SYSTEMS.enabled()?RACE_SYSTEMS.venue(this.opt.venue).turn:1)>=this.FIN()){this.state='done';this.finish(true);break;}}
      if(this.telemetry){
        const t=this.telemetry;
        if(t.phase!==this.lastTelemetryPhase){
          if(t.phase==='overheat'){
            COACH.say('Engine overheated! Ease off the gas; airflow will cool it and bring power back.','warn',5);
            tone(310,.42,'sawtooth',.065,155);noise(.36,510,.035,0,.7,'bandpass',.05);
          }else if(t.phase==='recovered'){
            COACH.say('Engine cooled. Power is back; find the torque band again.','hype',4);
            tone(440,.13,'triangle',.07,620);tone(784,.18,'triangle',.055,null,.1);
          }else if(t.phase==='warning'){
            COACH.say('Heat is climbing. Lift the throttle before power drops.','warn',4);
            tone(540,.12,'triangle',.055,430);
          }
          this.lastTelemetryPhase=t.phase;
        }
        if(t.lock&&t.lock!==this.lastTelemetryLock){
          const gauge=RACE_TELEMETRY.GAUGES.find(g=>g.id===t.lock);
          COACH.say(`${gauge.name} locked. Feel the car respond.`,'hype',3);
          if(t.lock==='nos'){tone(290,.28,'sawtooth',.07,710);noise(.26,950,.04,0,1,'bandpass',.03);}
          else if(t.lock==='torque')tone(420,.2,'triangle',.07,640);
          else if(t.lock==='braking')tone(480,.16,'triangle',.055,390);
          else tone(640,.16,'triangle',.055,820);
          requestMobileHaptic('perfect');
        }
        this.lastTelemetryLock=t.lock;
        if(t.gripRecoveryUntil>this.lastGripRecoveryUntil){
          this.lastGripRecoveryUntil=t.gripRecoveryUntil;
          COACH.say('The tires have grip again. Hold the clean line.','tip',3);
          tone(560,.18,'triangle',.05,760);
        }
        if(t.recommended!==this.lastTelemetryRecommendation&&t.cueAge>1.5){
          t.cueAge=0;t.cueUntil=t.clock+.8;this.lastTelemetryRecommendation=t.recommended;
        }
      }
      this.trailT+=dt;if(this.trailT>0.06){this.trailT=0;this.trail.push({x:s.x,y:s.y,sl:s.slide});if(this.trail.length>600)this.trail.shift();}}
    else if(this.state==='crashed'){s.v=Math.max(0,s.v-16*dt);s.x+=s.v*Math.cos(s.th)*dt;s.y+=s.v*Math.sin(s.th)*dt;this.spin+=s.v*0.18*dt;
      if(Math.abs((RACE_SYSTEMS.enabled()?RACE_SYSTEMS.path(s.x,s.y,P,RACE_SYSTEMS.venue(this.opt.venue)):racePath(s.x,s.y,P)).e)>this.HW+5)s.v=0;this.endT+=rdt;}
    else if(this.state==='done'){this.endT+=rdt;s.v=Math.max(0,s.v-6*dt);s.y+=s.v*dt*(RACE_SYSTEMS.enabled()?RACE_SYSTEMS.venue(this.opt.venue).turn:1);}},
  finish(ok,where){const P=this.P(),c=this.CARS[this.opt.car],v=this.vEntry||this.st.v,mu=P.mu;
    const Fc=P.m*v*v/P.R,Fg=mu*P.m*G0,vmax=Math.sqrt(mu*G0*P.R),vp=this.vPeak,dB=vp>vmax?(vp*vp-vmax*vmax)/(2*0.95*mu*G0):0;
    const wNeed=this.RATIO*Math.atan(c.Lwb/P.R)/DEG,wAvg=this.wT?this.wSum/this.wT:Math.abs(this.st.wheel);
    this.res={ok,where,t:this.st.t,v,vp,Fc,Fg,vmax,dB,c,P,wNeed,wAvg,slideT:this.slideT,aEng:P.F/P.m};
    logMove('race',ok?{who:'sys',kind:'finish',t2:this.st.t,title:'Finish',res:`${fmt(this.st.t,2)} s`,math:`slid ${fmt(this.slideT,1)} s · wheel avg ${fmt(wAvg,0)}° vs ${fmt(wNeed,0)}°`,tone:'good'}:{who:'sys',kind:'crash',where,title:where==='outside'?'Slid off the outside':'Cut off the inside',res:'OUT',math:`entry ${fmt(v*3.6,0)} vs limit ${fmt(vmax*3.6,0)} km/h`,tone:'bad'});
    RECS.race&&(RECS.race.sum={ok,t:this.st.t,vp,v,vmax,slideT:this.slideT,wAvg,wNeed,you:this.opt.steer==='you'});{const rid=RECS.race&&RECS.race.id;setTimeout(()=>{if(RECS.race&&RECS.race.id===rid)stopRec('race');},1600);}
    if(ok&&(!best.lap||this.st.t<best.lap)){best.lap=+this.st.t.toFixed(2);saveBest();this.pb=true;}else this.pb=false;
    notebook(this.result());this.game();},
  game(){const r=this.res,P=r.P,you=this.opt.steer==='you',angleOK=you&&Math.abs(r.wAvg-r.wNeed)<=8,clean=r.slideT<0.05,vk=r.vmax*3.6;r.you=you;const chk=curCh('race'),ci=best.ch.race;this.chPass=!!(chk&&chk.check(r));
    if(r.ok){const items=[['finish',300],['time bonus',Math.max(0,Math.round((25-r.t)*30))]];if(clean)items.push(['clean line',150]);if(angleOK)items.push(['math steering',150]);if(this.pb)items.push(['NEW BEST',200]);
      const gr=clean&&angleOK&&r.v>=r.vmax*0.95?'S':clean&&r.v>=r.vmax*0.88?'A':(clean||r.v>=r.vmax*0.9)?'B':'C';
      if(this.chPass)items.push([`CHALLENGE ${ci+1} CLEARED`,chXP(ci)]);
      award('race',items,true,{grade:this.chPass&&gr!=='S'?(gr==='C'?'B':'A'):gr,title:this.pb?'NEW BEST RUN':'FINISHED',sub:`${fmt(r.t,2)} s · corner entry ${fmt(r.v*3.6,0)} of ${fmt(vk,0)} km/h`,hint:'Tap GAS to race again',delay:400});energizeControlledPlayer('race-finish',1500);SND.cheer();badge('r_finish');if(clean)badge('r_clean');if(angleOK)badge('r_angle');if(P.mu<=0.6)badge('r_wet');if(r.t<15)badge('r_fast');
      let tip;if(r.v<r.vmax*0.85)tip=`You braked more than you needed. This corner allows ${fmt(vk,0)} km/h and you entered at ${fmt(r.v*3.6,0)}. Brake later.`;
      else if(!clean)tip=`Fast, but you slid for ${fmt(r.slideT,1)} s. Keep v² ÷ R_turn under μ·g = ${fmt(P.mu*G0)} for the Clean Line bonus.`;
      else if(!you)tip='Autopilot did the steering. Switch to You steer and match the yellow notch for the Math Steering bonus.';
      else tip=`Want more speed? More grip raises the limit: racing slicks make it √(1.4 × 9.81 × ${P.R}) = ${fmt(Math.sqrt(1.4*G0*P.R)*3.6,0)} km/h.`;
      COACH.say(`${fmt(r.t,2)} s, nice driving! ${tip}`,'hype',10);}
    else{award('race',[['nice try',20]],false,{grade:'D',title:'OFF THE TRACK',sub:r.where==='outside'?`Slid wide at ${fmt(r.v*3.6,0)} km/h. Limit: ${fmt(vk,0)} km/h`:'Turned in too hard or too early',hint:'Tap GAS to retry',delay:600});
      if(r.where==='outside')COACH.say(`Too hot. You entered at ${fmt(r.v*3.6,0)} km/h and the limit is ${fmt(vk,0)}.`+(r.dB>0?` From ${fmt(r.vp*3.6,0)} km/h you need ${fmt(r.dB,0)} m of braking, so hit the brakes before the ${r.dB>50?100:50} board.`:' Turn the wheel more to tighten the radius.'),'warn',10);
      else COACH.say(`You turned too hard or too early. The math says ${fmt(r.wNeed,0)}° of wheel and you averaged ${fmt(r.wAvg,0)}°. Turn in right at the corner.`,'warn',10);}
    if(this.chPass)completeCh('race');else if(chk)COACH.say(raceFail(r,chk),'warn',12);},
  isIdle(){return this.state==='grid'||this.state==='done'||this.state==='crashed';},
  idleTips(){const c=curCh('race');return[...(c?[c.intro()]:[]),'The yellow notch on the wheel is the math: θ = 15 × atan(L ÷ R). Match it through the turn.','Watch the brake boards. At the corner you want v ≤ √(μ·g·R).','Drag R to 55 m. The needed wheel angle drops and the speed limit jumps.','Try the wet preset for Rain Master. Same corner, less μ, much lower limit.','Finish without a single slide for the Clean Line bonus.'];},
  turnR(w){const c=this.CARS[this.opt.car],d=Math.abs(w)/this.RATIO;return d<0.05?Infinity:c.Lwb/Math.tan(d*DEG);},
  draw(c){if(RACE_3D.on)return;if(RACE_SYSTEMS.enabled())return this.drawStructuralCanvas(c);const P=this.P(),S=this.S,L=this.L,R=P.R,HW=this.HW,FIN=this.FIN();
    c.fillStyle='#0d2129';c.fillRect(-600,-600,W+1200,H+1200);
    c.fillStyle='rgba(127,220,255,0.05)';for(let x=-40;x<W+40;x+=24)for(let y=-40;y<H+40;y+=24)c.fillRect(x,y,2,2);
    const cx=this.sx(L),cy=this.sy(R);
    const path=()=>{c.beginPath();c.moveTo(this.sx(-30),this.sy(0));c.lineTo(cx,this.sy(0));c.arc(cx,cy,R*S,Math.PI/2,0,true);c.lineTo(this.sx(L+R),this.sy(FIN+60));};
    c.save();c.lineCap='butt';
    c.strokeStyle='#3a3526';c.lineWidth=(HW+5)*2*S;c.beginPath();c.arc(cx,cy,R*S,Math.PI/2+0.25,-0.25,true);c.stroke();
    c.strokeStyle='#2a3244';c.lineWidth=HW*2*S;path();c.stroke();
    c.lineWidth=5;c.setLineDash([9,9]);
    [R-HW,R+HW].forEach(rad=>{c.strokeStyle=C.ink;c.lineDashOffset=0;c.beginPath();c.arc(cx,cy,rad*S,Math.PI/2,0,true);c.stroke();c.strokeStyle=C.bad;c.lineDashOffset=9;c.beginPath();c.arc(cx,cy,rad*S,Math.PI/2,0,true);c.stroke();});
    c.setLineDash([12,14]);c.lineDashOffset=0;c.strokeStyle='rgba(232,238,249,0.25)';c.lineWidth=2;path();c.stroke();c.setLineDash([]);
    c.strokeStyle='rgba(232,238,249,0.5)';c.lineWidth=2;
    line(c,this.sx(-30),this.sy(HW),cx,this.sy(HW));line(c,this.sx(-30),this.sy(-HW),cx,this.sy(-HW));
    line(c,this.sx(L+R-HW),cy,this.sx(L+R-HW),this.sy(FIN+60));line(c,this.sx(L+R+HW),cy,this.sx(L+R+HW),this.sy(FIN+60));
    c.fillStyle='#1c2233';c.strokeStyle='#4b5875';c.lineWidth=1.5;const rw=(R+HW+8)*S;
    for(let a=Math.PI/2+0.3;a>-0.3;a-=0.075){const x=cx+Math.cos(a)*rw,y=cy+Math.sin(a)*rw;c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();c.stroke();}
    c.restore();
    const chk=(x1,y1,x2,y2,n)=>{for(let i=0;i<n;i++)for(let j=0;j<2;j++){c.fillStyle=(i+j)%2?C.ink:'#0a1020';const fx=x1+(x2-x1)*i/n,fy=y1+(y2-y1)*i/n;const hor=Math.abs(y2-y1)<1;c.fillRect(hor?fx:fx+j*5,hor?fy+j*5:fy,hor?(x2-x1)/n:5,hor?5:(y2-y1)/n);}};
    chk(this.sx(4)-5,this.sy(HW),this.sx(4)-5,this.sy(-HW),8);chk(this.sx(L+R-HW),this.sy(FIN),this.sx(L+R+HW),this.sy(FIN),8);
    [100,50].forEach(d=>{const x=this.sx(L-d);c.fillStyle='#0a1020';rr(c,x-13,this.sy(-HW)+6,26,16,3);c.fill();c.strokeStyle=C.muted;c.lineWidth=1;c.stroke();text(c,String(d),x,this.sy(-HW)+18,'700 10px '+MONO,C.ink,'center');});
    text(c,'brake boards: meters to the corner',this.sx(L-100)-13,this.sy(-HW)+38,'500 10px '+BODY,C.muted);
    c.save();c.setLineDash([4,5]);c.strokeStyle='rgba(255,143,199,0.8)';c.lineWidth=1.5;const ma=Math.PI/4;line(c,cx,cy,cx+Math.cos(ma)*R*S,cy+Math.sin(ma)*R*S);c.setLineDash([]);
    c.fillStyle=C.pink;c.beginPath();c.arc(cx,cy,3.5,0,Math.PI*2);c.fill();text(c,'R = '+R+' m',cx+Math.cos(ma)*R*S*0.5+6,cy+Math.sin(ma)*R*S*0.5-6,'700 12px '+MONO,C.pink);
    text(c,'turn center',cx-6,cy-8,'500 10px '+BODY,C.muted,'right');c.restore();
    text(c,'START',this.sx(4),this.sy(HW)-8,'700 10px '+MONO,C.muted,'center');text(c,'FINISH',this.sx(L+R+HW)+8,this.sy(FIN)+4,'700 10px '+MONO,C.muted);
    c.save();c.strokeStyle='rgba(5,8,14,0.55)';c.lineWidth=2.4;c.lineCap='round';(this.skids||[]).forEach(([a,b])=>{line(c,this.sx(a.l.x),this.sy(a.l.y),this.sx(b.l.x),this.sy(b.l.y));line(c,this.sx(a.r.x),this.sy(a.r.y),this.sx(b.r.x),this.sy(b.r.y));});c.restore();
    this.trail.forEach(p=>{c.fillStyle=p.sl?'rgba(255,107,115,0.7)':'rgba(95,227,161,0.45)';c.fillRect(this.sx(p.x)-1.5,this.sy(p.y)-1.5,3,3);});
    this.drawPrediction(c);this.drawCar(c);},
  drawStructuralCanvas(c){const P=this.P(),v=RACE_SYSTEMS.venue(this.opt.venue),pts=RACE_3D.trackPoints(P),S=this.S;const xy=p=>[this.sx(p.x),this.sy(p.z)],road=()=>{c.beginPath();pts.forEach((p,i)=>{const [x,y]=xy(p);i?c.lineTo(x,y):c.moveTo(x,y);});};
    c.fillStyle=v.id==='marine'?'#1d303b':v.id==='forest'?'#172a26':'#312f27';c.fillRect(-600,-600,W+1200,H+1200);c.lineJoin='round';c.lineCap='round';for(const [width,color] of [[this.HW*2+v.runoffWidth*2,v.id==='marine'?'#8c8d87':v.id==='forest'?'#3b4938':'#654c36'],[this.HW*2+2,'#737576'],[this.HW*2,v.id==='marine'?'#4b5a64':v.id==='forest'?'#303d42':'#3b4248']]){road();c.strokeStyle=color;c.lineWidth=width*S;c.stroke();}
    for(const side of [-1,1]){c.beginPath();pts.forEach((p,i)=>{const x=this.sx(p.x-p.tz*side*(this.HW-.4)),y=this.sy(p.z+p.tx*side*(this.HW-.4));i?c.lineTo(x,y):c.moveTo(x,y);});c.strokeStyle='#d6d4c6';c.lineWidth=1.5;c.stroke();}
    road();c.setLineDash([11,16]);c.strokeStyle='#d7c876';c.lineWidth=2;c.stroke();c.setLineDash([]);text(c,`STRUCTURAL PROXY · ${v.name}`,24,128,'700 11px '+MONO,C.yellow);
    c.save();c.strokeStyle='rgba(5,8,14,0.55)';c.lineWidth=2.4;(this.skids||[]).forEach(([a,b])=>{line(c,this.sx(a.l.x),this.sy(a.l.y),this.sx(b.l.x),this.sy(b.l.y));line(c,this.sx(a.r.x),this.sy(a.r.y),this.sx(b.r.x),this.sy(b.r.y));});c.restore();this.trail.forEach(p=>{c.fillStyle=p.sl?'rgba(255,107,115,.7)':'rgba(95,227,161,.45)';c.fillRect(this.sx(p.x)-1.5,this.sy(p.y)-1.5,3,3);});this.drawCar(c);},
  drawPrediction(c){const s=this.st;if(this.state==='crashed'||this.state==='done')return;const P=this.P();
    const w=this.curWheel(),kc=Math.tan(w/this.RATIO*DEG)/P.Lwb,kmax=P.mu*G0/Math.max(s.v*s.v,0.01),k=clamp(kc,-kmax,kmax),slide=Math.abs(kc)>kmax&&s.v>1.5;
    const trace=(kk,col,dash)=>{let x=s.x,y=s.y,th=s.th;c.save();c.strokeStyle=col;c.lineWidth=2;c.setLineDash(dash);c.beginPath();c.moveTo(this.sx(x),this.sy(y));
      for(let i=0;i<60;i++){th+=kk*1.2;x+=Math.cos(th)*1.2;y+=Math.sin(th)*1.2;c.lineTo(this.sx(x),this.sy(y));}c.stroke();c.restore();};
    if(slide)trace(kc,'rgba(243,227,107,0.35)',[3,5]);trace(k,slide?C.bad:'rgba(243,227,107,0.85)',[6,5]);},
  carFrame(c){const s=this.st;c.translate(this.sx(s.x),this.sy(s.y));c.rotate(-s.th-this.spin);},
  drawCar(c){const car=this.CARS[this.opt.car],k=1.8*this.S,l=car.len*k,w=car.wid*k,st=this.curWheel()/this.RATIO*DEG;c.save();this.carFrame(c);
    c.fillStyle='rgba(0,0,0,0.35)';rr(c,-l/2+2,-w/2+3,l,w,5);c.fill();
    c.fillStyle='#0a0f1c';[[l*0.3,-w/2,1],[l*0.3,w/2,1],[-l*0.34,-w/2,0],[-l*0.34,w/2,0]].forEach(([x,y,f])=>{c.save();c.translate(x,y);if(f)c.rotate(-st*3);c.fillRect(-4.5,-2.5,9,5);c.restore();});
    c.fillStyle=styleCol('race')||car.col;rr(c,-l/2,-w/2+1,l,w-2,this.opt.car==='kart'?3:6);c.fill();
    c.fillStyle='#0a1020';rr(c,l*0.02,-w/2+3,l*0.2,w-6,2);c.fill();
    {const A=GAME_CORE.playerAppearance('rocket'),hx=this.opt.car==='kart'?-l*0.05:l*0.08,hr=Math.max(9,w*0.26),turn=clamp(this.curWheel()/180,-1,1),brake=this.brake?1:0,gas=this.gas?1:0;c.fillStyle=A.kit;c.beginPath();c.ellipse(hx-hr*.72,0,hr*.7,hr*1.02,0,0,Math.PI*2);c.fill();c.strokeStyle=A.accent;c.lineWidth=Math.max(2,hr*.14);c.beginPath();c.moveTo(hx-hr*1.18,-hr*.65);c.lineTo(hx-hr*.5,0);c.lineTo(hx-hr*1.18,hr*.65);c.stroke();c.fillStyle=A.hair;c.beginPath();c.arc(hx-2,0,hr*1.1,0,Math.PI*2);c.fill();c.fillStyle=A.skin;c.beginPath();c.arc(hx,0,hr,0,Math.PI*2);c.fill();c.fillStyle=A.eye;c.beginPath();c.arc(hx+hr*.4,-hr*.32,Math.max(1.4,hr*.1),0,Math.PI*2);c.arc(hx+hr*.4,hr*.32,Math.max(1.4,hr*.1),0,Math.PI*2);c.fill();c.strokeStyle=A.skin;c.lineWidth=Math.max(4,hr*.28);c.lineCap='round';line(c,hx-hr*.55,-hr*.6,hx+hr*(.35+turn*.28),-w*.41);line(c,hx-hr*.55,hr*.6,hx+hr*(.35-turn*.28),w*.41);c.strokeStyle=A.accent;c.lineWidth=Math.max(2,hr*.1);c.beginPath();c.arc(hx+hr*.42,0,hr*.58,-1.1,1.1);c.stroke();c.fillStyle=gas?C.good:brake?C.bad:A.accent;c.beginPath();c.arc(hx-hr*.75,0,hr*.16,0,Math.PI*2);c.fill();}
    c.restore();},
  drawXray(c){const s=this.st,car=this.CARS[this.opt.car],P=this.P(),k=1.8*this.S,l=car.len*k,w=car.wid*k;
    const cx=this.sx(this.L),cy=this.sy(P.R);
    c.save();if(s.zone===1){c.setLineDash([5,5]);c.strokeStyle='rgba(255,143,199,0.8)';c.lineWidth=1.2;line(c,this.sx(s.x),this.sy(s.y),cx,cy);c.setLineDash([]);}
    this.carFrame(c);glow(c,C.xray,8);c.strokeStyle=C.xray;c.lineWidth=1.2;
    rr(c,-l/2,-w/2,l,w,5);c.stroke();
    line(c,-l*0.34,-w*0.3,l*0.3,-w*0.3);line(c,-l*0.34,w*0.3,l*0.3,w*0.3);line(c,l*0.3,-w*0.42,l*0.3,w*0.42);line(c,-l*0.34,-w*0.42,-l*0.34,w*0.42);
    c.strokeStyle=C.yellow;line(c,l*0.3,-w*0.6,-l*0.34,-w*0.6);text(c,'L',(l*0.3-l*0.34)/2,-w*0.6-3,'700 7px '+MONO,C.yellow,'center');
    const cap=P.mu*G0,use=s.alat/cap,needR=s.need/cap;
    [[l*0.3,-w*0.46],[l*0.3,w*0.46],[-l*0.34,-w*0.46],[-l*0.34,w*0.46]].forEach(([x,y])=>{c.strokeStyle=C.xray;rr(c,x-4.5,y-2,9,4,1);c.stroke();
      c.shadowBlur=0;if(s.slide)arrow(c,x,y,x,y-4-needR*12,'rgba(255,107,115,0.9)',1.2,[2,2]);if(use>0.02)arrow(c,x,y,x,y-4-use*12,C.hot,1.6);glow(c,C.xray,8);});
    c.shadowBlur=0;arrow(c,l/2+2,0,l/2+2+s.v*1.1,0,C.good,1.8);
    c.restore();},
  callouts(c){const s=this.st,P=this.P(),a=toS(this.sx(s.x),this.sy(s.y)),Rt=this.turnR(s.wheel);
    callout(c,a,W-340,64,['GRIP: NEED vs HAVE',`need v²÷R_turn = ${fmt(s.need)} m/s²`,`have μ·g = ${fmt(P.mu*G0)} m/s²`,s.slide?'need > have: SLIDING':'need ≤ have: holding'],s.slide?C.bad:C.hot);},
  drawWheel(c){const {x,y,r}=this.WH,w=this.curWheel(),need=this.RATIO*Math.atan(this.CARS[this.opt.car].Lwb/this.V.R)/DEG;
    c.save();c.fillStyle='rgba(6,11,24,0.75)';c.beginPath();c.arc(x,y,r+20,0,Math.PI*2);c.fill();
    c.strokeStyle='rgba(243,227,107,0.35)';c.lineWidth=3;c.beginPath();c.arc(x,y,r+12,-Math.PI/2-need*DEG-0.04,-Math.PI/2-need*DEG+0.04);c.stroke();
    c.save();c.translate(x,y);const a=-need*DEG;c.rotate(a);c.fillStyle=C.yellow;c.beginPath();c.moveTo(0,-r-8);c.lineTo(-5,-r-17);c.lineTo(5,-r-17);c.closePath();c.fill();c.restore();
    c.translate(x,y);c.rotate(-w*DEG);c.strokeStyle='#cfd8ea';c.lineWidth=9;c.beginPath();c.arc(0,0,r-6,0,Math.PI*2);c.stroke();
    c.lineWidth=7;line(c,-r+8,4,-14,4);line(c,r-8,4,14,4);line(c,0,14,0,r-8);c.fillStyle='#1b2744';c.beginPath();c.arc(0,4,16,0,Math.PI*2);c.fill();
    c.fillStyle=C.yellow;c.fillRect(-3,-r,6,12);c.restore();
    text(c,`θ = ${fmt(w,0)}°`,x,y+r+36,'700 13px '+MONO,C.yellow,'center');
    text(c,`needed ≈ ${fmt(need,0)}°`,x,y+r+52,'500 11px '+MONO,C.muted,'center');},
  hud(c){const s=this.st,P=this.P();
    text(c,'RACE LAB',24,34,'15px '+DISP,C.xray);
    const msg={grid:'Hold GAS to start. Steer into the corner, brake if the path turns red.',count:'Get ready…',run:'',done:'',crashed:''}[this.state];text(c,msg,24,54,'500 13px '+BODY,C.muted);
    if(RACE_SYSTEMS.enabled()){const venue=RACE_SYSTEMS.venue(this.opt.venue);text(c,`DEV PROXY · ${venue.name}`,24,77,'700 11px '+MONO,C.yellow);text(c,`Nitro ${Math.round((s.nitro||0)*100)}%${s.nitroCooldown>0?' · cooldown '+fmt(s.nitroCooldown,1)+' s':''} · ${s.driftMode==='drift'?'CONTROLLED DRIFT':s.driftMode==='skid'?'UNCONTROLLED SKID':'GRIP LINE'}`,24,94,'700 10px '+MONO,s.driftMode==='skid'?C.bad:C.xray);}
    this.drawWheel(c);
    c.save();c.translate(190,-196);c.fillStyle='rgba(6,11,24,0.82)';rr(c,20,316,190,92,10);c.fill();c.strokeStyle=C.line;c.stroke();
    text(c,fmt(s.v*3.6,0),32,356,'30px '+DISP,C.ink);c.font='30px '+DISP;const kw=c.measureText(fmt(s.v*3.6,0)).width;text(c,'km/h',38+kw,356,'600 12px '+MONO,C.muted);
    text(c,fmt(s.v)+' m/s',198,334,'600 11px '+MONO,C.good,'right');
    const cap=P.mu*G0,use=clamp(s.need/cap,0,1.5);text(c,'GRIP USED',32,384,'700 10px '+MONO,C.muted);
    c.fillStyle='#1b2744';c.fillRect(32,390,140,8);c.fillStyle=use>1?C.bad:use>0.75?C.hot:C.good;c.fillRect(32,390,140*Math.min(use,1),8);
    text(c,Math.round(use*100)+'%',198,398,'600 11px '+MONO,use>1?C.bad:C.ink,'right');c.restore();
    text(c,fmt(s.t,2)+' s',W-24,40,'22px '+DISP,C.ink,'right');
    if(s.slide&&this.state==='run'){text(c,'SLIDING: need more grip than μ·g',W/2,66,'700 13px '+MONO,C.bad,'center');}
    if(this.state==='count'||this.state==='grid'){const lit=this.state==='count'?Math.min(3,Math.floor((2.4-this.cd)/0.8)+1):0;
      c.save();c.fillStyle='rgba(6,11,24,0.85)';rr(c,W/2-74,74,148,46,23);c.fill();for(let i=0;i<3;i++){c.fillStyle=i<lit?C.bad:'#2a3552';c.beginPath();c.arc(W/2-44+i*44,97,14,0,Math.PI*2);c.fill();}c.restore();}
    if(this.state==='run'&&s.t<0.8){c.save();c.globalAlpha=1-s.t/0.8;text(c,'GO!',W/2,112,'34px '+DISP,C.good,'center');c.restore();}
  },
  eqs(){const M=this,s=this.st,P=this.P(),car=this.CARS[this.opt.car],w=this.curWheel(),d=Math.abs(w)/this.RATIO,Rt=this.turnR(w),v=s.v;
    const need=isFinite(Rt)?v*v/Rt:0,have=P.mu*G0,vmax=Math.sqrt(P.mu*G0*P.R),wNeed=this.RATIO*Math.atan(car.Lwb/P.R)/DEG,aE=P.F/P.m;
    return{lines:[
      eqLine('Steering wheel → front tires',`δ = ${T(M,'w')} ÷ 15`,`= ${N(M,'w',fmt(Math.abs(w),0)+'°')} ÷ 15 = <b>${fmt(d,2)}°</b>  (steering ratio 15:1)`),
      eqLine('Turn radius',`R_turn = L ÷ tan δ`,isFinite(Rt)?`= ${car.Lwb} m ÷ tan ${fmt(d,2)}° = <b>${fmt(Rt,1)} m</b>  (L = wheelbase)`:'= straight line: δ ≈ 0, so tan δ ≈ 0 and the radius is infinite'),
      eqLine('Wheel angle this corner needs',`${T(M,'w')} = 15 × atan(L ÷ ${T(M,'R')})`,`= 15 × atan(${car.Lwb} ÷ ${N(M,'R',P.R)}) = <b>${fmt(wNeed,0)}°</b>`),
      eqLine('Grip needed to turn',`a = ${T(M,'v')}² ÷ R_turn`,isFinite(Rt)?`= ${N(M,'v',fmt(v))}² ÷ ${fmt(Rt,1)} = <b class="hot">${fmt(need)} m/s²</b>`:'= 0 (going straight)'),
      eqLine('Grip available',`a_max = ${T(M,'mu')} · g`,`= ${N(M,'mu',fmt(P.mu,2))} × 9.81 = <b>${fmt(have)} m/s²</b>  ${need>have?'<span class="no">need > have: sliding</span>':'<span class="ok">holding the line</span>'}`),
      eqLine('Corner speed limit (mass cancels)',`v_max = √(${T(M,'mu')} · g · ${T(M,'R')})`,`= √(${N(M,'mu',fmt(P.mu,2))} × 9.81 × ${N(M,'R',P.R)}) = <b>${fmt(vmax)} m/s</b> = ${fmt(vmax*3.6,0)} km/h`),
      eqLine('Launch acceleration',`a = ${T(M,'F')} ÷ ${T(M,'m')}`,`= ${N(M,'F',fmt(P.F,0))} ÷ ${N(M,'m',fmt(P.m,0))} = ${fmt(aE)} m/s²${aE>have?`  → tires cap it at μ·g = <b>${fmt(have)}</b>`:`  → <b>${fmt(aE)} m/s²</b>`}`)],note:`<p class="note">The dashed line on the track is your predicted path from the current wheel angle. It turns red when the tires can't deliver the grip.</p>`};},
  chart(c,w,h){const P=this.P(),s=this.st,have=P.mu*G0,vmax=Math.sqrt(have*P.R),x1=Math.max(40,Math.ceil(vmax*1.8/10)*10),y1=Math.ceil(Math.max(have*1.6,12)/5)*5;
    const f=plotFrame(c,w,h,{x0:0,x1,y0:0,y1,xt:niceTicks(0,x1,5),yt:niceTicks(0,y1,4),xl:'speed v (m/s)',yl:'sideways accel (m/s²)'});
    c.fillStyle='rgba(255,107,115,0.08)';c.fillRect(f.L,f.Tp,f.X(x1)-f.L,f.Y(have)-f.Tp);
    c.strokeStyle=C.xray;c.lineWidth=2;line(c,f.L,f.Y(have),f.X(x1),f.Y(have));text(c,'μ·g = '+fmt(have),f.X(x1)-4,f.Y(have)-5,'700 10px '+MONO,C.xray,'right');
    c.strokeStyle=C.pink;c.lineWidth=2;c.beginPath();for(let v=0;v<=x1;v+=0.5){const y=Math.min(v*v/P.R,y1);v===0?c.moveTo(f.X(v),f.Y(y)):c.lineTo(f.X(v),f.Y(y));}c.stroke();
    c.setLineDash([3,3]);c.strokeStyle=C.muted;line(c,f.X(vmax),f.Tp,f.X(vmax),h-f.B);c.setLineDash([]);text(c,'v_max '+fmt(vmax),f.X(vmax)+4,f.Tp+10,'700 10px '+MONO,C.muted);
    const vy=Math.min(s.v*s.v/P.R,y1);c.fillStyle=C.good;c.beginPath();c.arc(f.X(Math.min(s.v,x1)),f.Y(vy),5,0,Math.PI*2);c.fill();
    return`Pink curve: grip needed for the ${P.R} m corner, v²÷R. Blue line: what the tires can give. Where pink crosses blue is the corner's speed limit.`;},
  result(){const r=this.res,P=r.P;return{
    title:`${r.c.name}, μ = ${fmt(P.mu,2)}, R = ${P.R} m`,big:r.ok?`${fmt(r.t,2)} s`:'Off track',
    sub:r.ok?`Corner entry at ${fmt(r.v*3.6,0)} km/h. The limit was ${fmt(r.vmax*3.6,0)} km/h.`:r.where==='outside'?`You slid wide. At ${fmt(r.v*3.6,0)} km/h you needed ${fmt(r.Fc/r.Fg*100,0)}% of the grip the tires have.`:'You turned in too early or too hard and left the inside of the track.',
    steps:[
      {h:'Steering you used',p:'Average wheel angle through the corner, versus the angle the math says.',eq:`used ≈ <em>${fmt(r.wAvg,0)}°</em>   needed = 15 × atan(${r.c.Lwb} ÷ ${P.R}) = <em>${fmt(r.wNeed,0)}°</em>`},
      {h:'Corner entry speed',p:'How fast you arrived at the turn.',eq:`v = <em>${fmt(r.v)} m/s</em> = ${fmt(r.v*3.6,0)} km/h`},
      {h:'Grip needed',p:'Centripetal force: the pull toward the turn center that bends your path.',eq:`F_c = m·v²/R = ${fmt(P.m,0)} × ${fmt(r.v)}² / ${P.R} = <em>${fmt(r.Fc,0)} N</em>`},
      {h:'Grip available',p:'Tire friction is the only thing providing that pull.',eq:`F_grip = μ·m·g = ${fmt(P.mu,2)} × ${fmt(P.m,0)} × 9.81 = <em>${fmt(r.Fg,0)} N</em>`},
      {h:'Speed limit',p:'Set them equal. Mass is on both sides and cancels.',eq:`v_max = √(μ·g·R) = <em>${fmt(r.vmax)} m/s</em> (${fmt(r.vmax*3.6,0)} km/h)`},
      {h:'Braking distance',p:r.vp>r.vmax?`Top speed on the straight was ${fmt(r.vp)} m/s.`:'You never went over the limit on the straight.',eq:r.vp>r.vmax?`d = (v₁² − v₂²) / (2·0.95·μ·g) = <em>${fmt(r.dB,0)} m</em> before the corner`:`<em>${fmt(r.vp)} ≤ ${fmt(r.vmax)} m/s</em>, no braking needed`}],
    idea:`Two ways to go faster through a corner: more grip (μ) or a bigger radius (R). Drag R up and watch the needed wheel angle shrink and the speed limit rise. That's why racers use the whole track to make the turn wider.`,quiz:QUIZ.race};}
};

/* =====================================================================
   KICK LAB
   ===================================================================== */
