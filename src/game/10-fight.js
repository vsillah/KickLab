const REX=[
  {name:'Rex Mk I',hp:100,react:0.16,every:3.0,tele:0.8,vo:6,armor:0,twist:'A slow starter. Land clean punches and block when he flashes red.'},
  {name:'Rex Mk II',hp:120,react:0.14,every:2.6,tele:0.7,vo:7,armor:0,twist:'Quicker hands, quicker head. Slow punches get dodged.'},
  {name:'Rex Mk III',hp:130,react:0.12,every:2.3,tele:0.62,vo:7.5,armor:1800,twist:'Steel jaw: any hit under 1,800 N just bounces off.'},
  {name:'Rex Mk IV',hp:140,react:0.11,every:2.0,tele:0.56,vo:8.5,armor:1800,twist:'Steel jaw and a heavier counter punch.'},
  {name:'Rex Mk V',hp:150,react:0.10,every:1.8,tele:0.5,vo:9,armor:2300,twist:'Armor up to 2,300 N and he reacts in a tenth of a second.'},
  {name:'Rex Mk VI',hp:170,react:0.085,every:1.6,tele:0.45,vo:9.5,armor:2600,twist:'Armor 2,600 N. Blocks are no longer optional.'},
  {name:'Rex Mk VII',hp:190,react:0.072,every:1.4,tele:0.4,vo:10,armor:3000,twist:'The champion. 3,000 N armor, 0.072 s reactions.'}];
const REACH=0.6,OPPM=2.5,DUCK_H=0.4,DUCK_CLEAR=0.25,A_NECK=8;
const COMBOS=[{seq:['jab','cross','upper'],name:'ONE-TWO-UPPER',mult:1.6,xp:100},{seq:['jab','jab','cross'],name:'DOUBLE JAB, CROSS',mult:1.45,xp:70},{seq:['cross','upper'],name:'CROSS-UPPER',mult:1.35,xp:50},{seq:['upper','cross'],name:'LIFT & DRIVE',mult:1.35,xp:50},{seq:['jab','cross'],name:'ONE-TWO',mult:1.3,xp:40}];
const Fight={
  key:'fight',
  opt:{type:'cross'},
  V:{m:2.8,dt:15,A:120},
  COL:{m:['m',C.violet],v:['v',C.good],dt:['Δt',C.xray],A:['A',C.pink],F:['F',C.hot]},
  TYPES:{jab:{k:0.65,name:'Jab'},cross:{k:1,name:'Cross'},upper:{k:0.85,name:'Uppercut'}},
  mEff(){return this.V.m*this.TYPES[this.opt.type].k;},
  HEADM:4.5,
  hint:'Timing + mass set your speed',
  isBout(){return best.play.fight==='ch';},
  tier(){return REX[Math.min(best.ch.fight,REX.length-1)];},
  LIVE(){return this.isBout()?[0,1,2]:[0,1];},
  groups(){return[];},
  vars(){return[
    {id:'m',sym:'m',name:'mass behind your cross (jab uses 65%, upper 85%)',unit:'kg',min:1.5,max:6,step:0.1,d:1,col:C.violet,pre:[[2,'featherweight'],[2.8,'middleweight'],[4,'heavy'],[5.5,'heavyweight']]},
    {id:'dt',sym:'Δt',name:'glove padding: contact time',unit:'ms',min:3,max:40,step:1,d:0,col:C.xray,pre:[[6,'bare fist'],[10,'8 oz'],[15,'16 oz glove'],[35,'pillow']]},
    {id:'A',sym:'A',name:'contact area',unit:'cm²',min:10,max:150,step:5,d:0,col:C.pink,pre:[[25,'knuckles'],[120,'glove face']]}];},
  actions(){const over=this.bout&&this.bout.over,t=this.opt.type,bout=this.isBout(),P=[
      {id:'jab',label:'Jab',aria:'Jab (J)',icon:'jab',color:'#2aa8ff',key:'J',sel:t==='jab'},
      {id:'cross',label:over?'Next bout':'Cross',aria:over?'Next bout (K)':'Cross (K or Space)',icon:'cross',color:'#ff4d4d',key:'K',big:true,primary:true,sel:t==='cross',pulse:over},
      {id:'upper',label:'Upper',aria:'Uppercut (L)',icon:'upper',color:'#ffbf1f',key:'L',sel:t==='upper'}];
    return[{id:'block',dir:'left',tag:'BLOCK',aria:'Block: hold back',hold:true,disabled:!bout},{id:'duck',dir:'down',tag:'DUCK',aria:'Duck: hold down',hold:true,disabled:!bout},...P];},
  reset(){if(RECS.fight&&RECS.fight.on)stopRec('fight');this.perf=this.perf||0;this.state='ready';this.p=0;this.meterT=Math.random()*2;this.head={x:0,v:0,r:0,rv:0};this.rings=[];this.hit=false;this.slowed=false;this.res=null;this.boardV=this.boardV||0;this.boardT=this.boardT||0;this.u=0.5;this.pb=false;this.since=99;this.performancePhase='time';this.performanceUntil=0;this.performanceLocks=[];
    this.floats=[];this.meX=0;this.meV=0;this.blocking=false;this.ducking=false;this.duckT=0;this.duckA=0;this.slipT=0;this.rduckA=0;this.rduck=null;this.duckDodge=false;this.queued=null;this.dodge=0;this.dodged=false;this.ko=null;this.bob=0;this.warned={};
    this.bout=null;if(this.isBout()){const i=Math.min(best.ch.fight,REX.length-1),T=REX[i];this.bout={i,T,opp:T.hp,oppMax:T.hp,me:100,stun:0,stunMax:1,chain:[],bestCombo:0,namedN:0,namedXP:0,perf:0,blocks:0,counters:0,taken:0,landed:0,over:false,win:false,intro:1.3,atk:{ph:'idle',t:0},next:T.every*1.1};E.title={t:0,text:T.name.toUpperCase(),sub:'FIGHT!'};startRec('fight',`Bout vs ${T.name}`);RECS.fight.meta={react:T.react,armor:T.armor,vo:T.vo,name:T.name};}
    if(typeof setLabel==='function')setLabel();},
  rDrop(){return 55*(this.rduckA||0);},
  reactNow(){const b=this.bout;return b?b.T.react*(b.opp/b.oppMax<0.25?1.3:1):0.2;},
  stunned(){const b=this.bout;return!!(b&&b.stun>0);},
  omega(){return this.bout?3.2+this.bout.i*0.3:3.2;},
  worldOffsetY(){return innerWidth<=800?Math.max(0,H*.5-455):0;},
  target(){return this.opt.type==='upper'?{x:622,y:292+this.rDrop()}:{x:604,y:262};},
  pose(){const t=this.opt.type,p0=clamp(this.p,0,1),pp=p0*p0*(3-2*p0);let dx=0,dy=0,r=0;
    if(t==='jab'){dx=6*pp;}
    else if(t==='cross'){dx=20*pp;r=pp;}
    else{r=0.6*pp;dx=10*pp;dy=pp<0.35?16*(pp/0.35):16-26*((pp-0.35)/0.65);}
    const dk=this.duckA||0;dy+=58*dk;dx+=8*dk;
    const fS={x:448+dx-10*r+(t==='jab'?8*pp:0),y:244+dy},rS={x:420+dx+40*r,y:246+dy-4*r};
    return{t,pp,dx,dy,r,fS,rS,punchS:t==='jab'?fS:rS};},
  dx(){return this.pose().dx;},
  shoulder(){return this.pose().punchS;},
  rest(which,P){return which==='front'?{x:484+P.dx,y:252+P.dy}:{x:464+P.dx,y:230+P.dy};},
  gloveR(){return this.V.dt>=10?clamp(10+(this.V.dt-10)*0.35,11,20):0;},
  fistAt(p){const t=this.opt.type,T0=this.target(),P=this.pose(),raw=p;p=raw<=1?clamp(raw,0,1)*clamp(raw,0,1)*(3-2*clamp(raw,0,1)):raw;
    if(t==='upper'){const R0=this.rest('rear',P),Lw={x:470+P.dx,y:326},Q={x:560,y:356},dx=T0.x-Q.x,dy=T0.y-Q.y;
      if(p<0.25){const u=p/0.25;return{x:lerp(R0.x,Lw.x,u),y:lerp(R0.y,Lw.y,u),dx,dy};}
      if(p<=1){const q=(p-0.25)/0.75,u=1-q;return{x:u*u*Lw.x+2*u*q*Q.x+q*q*T0.x,y:u*u*Lw.y+2*u*q*Q.y+q*q*T0.y,dx,dy};}
      const L=Math.hypot(dx,dy);return{x:T0.x+dx/L*(p-1)*160,y:T0.y+dy/L*(p-1)*160,dx,dy};}
    const R=this.rest(t==='jab'?'front':'rear',P);return{x:R.x+(T0.x-R.x)*p,y:R.y+(T0.y-R.y)*p,dx:T0.x-R.x,dy:T0.y-R.y};},
  vTiming(acc){return 3.5+8.5*Math.pow(acc,1.2);},
  speedFor(u){const acc=1-Math.abs(u-0.5)*2;return{acc,v:this.vTiming(acc)*Math.sqrt(2.8/this.mEff())};},
  needle(){return(Math.sin(this.meterT*this.omega())+1)/2;},
  curV(){if(this.res&&(this.state!=='ready'||this.since<3))return this.res.v;return this.speedFor(this.needle()).v;},
  dmgOf(F){const b=this.bout;if(!b)return 0;return F<b.T.armor?0:Math.min(90,F/40);},
  incoming(){const b=this.bout;if(!b)return{F:0,d:0};const F=OPPM*b.T.vo/(this.V.dt/1000);return{F,d:Math.min(60,F/40)};},
  float(x,y,text,col,big){this.floats.push({x,y,text,col,big,t:0});},
  suggest(){const b=this.bout,o={};
    if(!b){o.dt={note:'try 6 ms (bare fist), punch, then 15 ms (glove). Same momentum, very different force.',dir:'compare 6 ms and 15 ms.'};o.m={note:'more mass means more momentum, but a slower fist (v ∝ 1/√m).',dir:'feel the trade-off.'};o.A={note:'area only changes pressure P = F ÷ A, not force.',dir:'pressure only.'};return o;}
    const T=b.T,k=this.TYPES[this.opt.type].k,vt=10.5,vNeed=REACH/T.react,dtNow=this.V.dt/1000;
    const dtSafe=clamp(OPPM*T.vo/(30*40)*1000,3,40),pp=vt*Math.sqrt(2.8*k*this.V.m),dtArm=T.armor?clamp(pp/T.armor*1000,3,40):null;
    if(!T.armor)o.dt={lo:Math.ceil(dtSafe),hi:Math.min(40,Math.ceil(dtSafe)+8),note:`${Math.ceil(dtSafe)}–${Math.min(40,Math.ceil(dtSafe)+8)} ms. Above ${Math.ceil(dtSafe)} ms his punches stay under 30 HP; much more padding softens your own hits too.`};
    else if(dtArm>=dtSafe)o.dt={lo:Math.ceil(dtSafe),hi:Math.floor(dtArm),note:`${Math.ceil(dtSafe)}–${Math.floor(dtArm)} ms. Under ${Math.floor(dtArm)} cracks his ${fmt(T.armor,0)} N armor with good timing; over ${Math.ceil(dtSafe)} keeps his hits under 30 HP.`};
    else o.dt={lo:Math.max(3,Math.floor(dtArm)-3),hi:Math.floor(dtArm),note:`no Δt does both. Cracking ${fmt(T.armor,0)} N needs ≤ ${Math.floor(dtArm)} ms, staying safe needs ≥ ${Math.ceil(dtSafe)}. Go ${Math.max(3,Math.floor(dtArm)-3)}–${Math.floor(dtArm)} ms and hold BLOCK when he flashes red.`};
    const mMax=clamp(2.8*Math.pow(vt/vNeed,2)/k,1.5,6),mMin=T.armor?clamp(Math.pow(T.armor*dtNow/vt,2)/(2.8*k),1.5,6):1.5,tn=this.TYPES[this.opt.type].name.toLowerCase();
    if(mMin<=mMax)o.m={lo:Math.round(mMin*10)/10,hi:Math.round(mMax*10)/10,note:`${fmt(mMin)}–${fmt(mMax)} kg. Under ${fmt(mMax)} your ${tn} beats his ${T.react} s reaction${T.armor?`; over ${fmt(mMin)} it cracks the armor at your current Δt`:''}.`};
    else o.m={lo:Math.round(mMax*10)/10-0.3,hi:Math.round(mMax*10)/10,note:`too heavy to be fast AND strong at this Δt. Stay near ${fmt(mMax)} kg and lower Δt instead.`};
    o.A={note:'area changes pressure, not damage. Leave it.',dir:'not important here.'};return o;},
  snap(){const b=this.bout;return{p:this.p,type:this.opt.type,state:this.state,hit:this.hit,v:this.v,u:this.u,acc:this.acc,meterT:this.meterT,since:this.since,head:{...this.head},dodge:this.dodge,dodged:this.dodged,duckDodge:this.duckDodge,rduckA:this.rduckA,rpro:!!(this.rduck&&this.rduck.pro),duckA:this.duckA,blocking:this.blocking,meX:this.meX,bob:this.bob,boardV:this.boardV,
    floats:this.floats.map(f=>({...f})),rings:this.rings.map(x=>({...x})),ko:this.ko?{...this.ko}:null,res:this.res,b:b?{me:b.me,opp:b.opp,stun:b.stun,stunMax:b.stunMax,cl:b.chain.length,ph:b.atk.ph,at:b.atk.t,low:b.atk.low,over:b.over,intro:b.intro,immune:b.immune}:null};},
  applySnap(o){Object.assign(this,{p:o.p,state:o.state,hit:o.hit,v:o.v,u:o.u,acc:o.acc,meterT:o.meterT,since:o.since,head:{...o.head},dodge:o.dodge,dodged:o.dodged,duckDodge:o.duckDodge,rduckA:o.rduckA,rduck:o.rpro?{pro:true}:null,duckA:o.duckA,blocking:o.blocking,meX:o.meX,bob:o.bob,boardV:o.boardV,floats:o.floats.map(f=>({...f})),rings:o.rings.map(x=>({...x})),ko:o.ko?{...o.ko}:null,res:o.res});this.opt.type=o.type;
    const base=(RP.backup&&RP.backup.bout)||this.bout;this.bout=o.b&&base?Object.assign({},base,{me:o.b.me,opp:o.b.opp,stun:o.b.stun,stunMax:o.b.stunMax,chain:Array(o.b.cl).fill('x'),atk:{ph:o.b.ph,t:o.b.at,low:o.b.low},over:o.b.over,intro:o.b.intro,immune:o.b.immune}):null;},
  review(r){const mv=r.moves,meta=r.meta||{react:0.16,armor:0},K=k=>mv.filter(m=>m.kind===k);const hits=K('hit'),dod=K('dodged'),cl=K('clank'),tk=K('taken'),bl=K('blocked'),sl=K('slip');
    const thrown=hits.length+dod.length+cl.length,all=[...hits,...dod,...cl],avgV=all.length?all.reduce((a,m)=>a+m.v,0)/all.length:0,maxF=Math.max(0,...hits.map(m=>m.F),...cl.map(m=>m.F)),dealt=hits.reduce((a,m)=>a+m.dmg,0),taken=[...tk,...bl].reduce((a,m)=>a+m.d,0),bestC=Math.max(0,...hits.map(m=>m.combo||1)),atks=tk.length+bl.length+sl.length;
    if(!r.meta)return{title:r.title,noun:'session',stats:[['Punches',hits.length],['Hardest',fmt(maxF,0)+' N'],['Avg speed',fmt(avgV)+' m/s']],best:topN(hits.map(m=>({score:m.F,t:m.t,text:`${m.title} · ${fmt(m.F,0)} N`,math:m.math})),3),work:[],plan:['Switch Mode to Bout vs Rex to fight back.']};
    const best=topN([...hits.map(m=>({score:m.dmg+(m.named?25:0)+(m.rip?20:0),t:m.t,text:`${m.title}: ${m.dmg} damage`,math:m.math})),...sl.map(m=>({score:22,t:m.t,text:'Slipped a high punch: 0 damage taken',math:m.math}))],3);
    const work=topN([...tk.map(m=>({score:m.d+5,t:m.t,text:`${m.title}: −${m.d} HP`,math:m.math,tip:m.lowDuck?'Body shots beat a duck. Watch his fist drop low, then hold ◀ block.':m.low?'Low wind-up = body shot. Hold ◀ block (takes 80% off).':m.late?`You ducked too late: dropping ${DUCK_CLEAR} m takes √(2h÷g) = ${fmt(Math.sqrt(2*DUCK_CLEAR/G0),2)} s. Start on the red flash.`:'High punch: hold ▼ duck (0 damage) or ◀ block.'})),
      ...dod.map(m=>({score:14,t:m.t,text:m.title,math:m.math,tip:m.byDuck?'When he ducks, only the uppercut (L) connects.':`You needed v > ${fmt(0.6/m.react)} m/s. Hit the green, throw a jab, or punch while he\u2019s stunned.`})),
      ...cl.map(m=>({score:16,t:m.t,text:m.title,math:m.math,tip:`Crack ${fmt(m.armor,0)} N: lower Δt (padding) or hit the green for more v.`}))],3);
    const plan=[];if(dod.length>=2)plan.push(`${dod.length} punches got dodged at an average ${fmt(dod.reduce((a,m)=>a+m.v,0)/dod.length)} m/s. Rex needs you above ${fmt(0.6/meta.react)} m/s (t = 0.6 ÷ v < ${meta.react} s).`);
    if(tk.length>=2)plan.push(`You defended ${bl.length+sl.length} of ${atks} attacks. Red HIGH = duck ▼, purple LOW = block ◀.`);
    if(cl.length)plan.push(`${cl.length} hit${cl.length>1?'s':''} bounced off the ${fmt(meta.armor,0)} N armor. F = m·v ÷ Δt: drop Δt or add m.`);
    if(bestC<2)plan.push(`No combos yet. After a clean hit he\u2019s stunned for t = (p ÷ 4.5) ÷ 8 ≈ 0.5 s: tap J → K → L inside it.`);
    else if(!hits.some(m=>m.named==='ONE-TWO-UPPER'))plan.push('Go for the ONE-TWO-UPPER (J → K → L) inside one stun window: ×1.6.');
    if(!hits.some(m=>m.counter))plan.push('Punch while he winds up (red flash): +25% and he can\u2019t dodge.');
    if(!plan.length)plan.push('That was clean. Turn the hints off in harder tiers and do it again.');
    return{title:r.title,noun:'bout',stats:[['Landed',`${hits.length}/${thrown}`],['Accuracy',thrown?Math.round(hits.length/thrown*100)+'%':'—'],['Damage dealt',dealt],['Damage taken',taken],['Hardest hit',fmt(maxF,0)+' N'],['Avg fist speed',fmt(avgV)+' m/s'],['Best combo',bestC+' hits'],['Blocks / slips',`${bl.length} / ${sl.length}`]],best,work,plan:plan.slice(0,4)};},
  onResume(){const b=this.bout;if(b&&!b.over){if(b.atk.ph==='tele'||b.atk.ph==='strike'){b.atk.ph='idle';b.atk.t=0;}b.next=Math.max(b.next,1.2);}},
  press(id,down){const b=this.bout;
    if(id==='block'){const was=this.blocking;this.blocking=!!(down&&b&&!b.over);if(this.blocking&&!was)tone(300,0.06,'square',0.04);return;}
    if(id==='duck'){const was=this.ducking;this.ducking=!!(down&&b&&!b.over&&this.state==='ready');if(this.ducking&&!was){this.duckT=0;noise(0.12,700,0.06,0,1,'lowpass',0.01);}return;}
    if(!down)return;if(id==='go')id=this.opt.type;
    if((id==='jab'||id==='cross'||id==='upper')&&b&&!b.over&&this.state!=='ready'){this.queued=id;return;}
    if((id==='jab'||id==='cross'||id==='upper')&&this.state==='ready'&&!(b&&b.over)){if(this.opt.type!==id){this.opt.type=id;setLabel();}}
    this.blocking=false;this.fromDuck=this.duckA>0.5||this.slipT>0;this.ducking=false;
    if(b&&b.over){if(this.ko&&this.ko.t>1.2){hideResults();this.reset();renderActions();COACH.say(this.introLine(),'tip',12);}return;}
    if(b&&b.intro>0)return;
    if(this.state==='ready'){const u=this.needle(),s=this.speedFor(u);this.u=u;this.acc=s.acc;this.v=s.v;this.rate=2.4+0.22*s.v;this.state='swing';this.performancePhase='see';this.performanceUntil=performance.now()+2400;this.performanceLocks=[];hideResults();SND.whoosh();this.p=0;this.hit=false;this.slowed=false;
      this.dodged=false;this.wantSlow=true;
      this.duckDodge=false;
      if(b){const winding=b.atk.ph==='tele',st=this.stunned()&&!(b.immune>0);this.dodged=!winding&&!st&&!(this.rduck&&this.rduck.pro)&&REACH/s.v>this.reactNow();
        if(this.dodged&&this.opt.type!=='upper'&&Math.random()<0.55){this.duckDodge=true;this.rduck={t:0,dur:0.55};}
        const F=this.calc(s.v).F,d=this.dmgOf(F)*(winding?1.25:1);
        this.wantSlow=!this.dodged&&!st&&b.chain.length===0&&(s.acc>0.92||(d>0&&d>=b.opp));}}},
  update(dt,rdt){const b=this.bout;
    if(this.state==='ready'){this.meterT+=rdt;this.since+=rdt;}
    const h=this.head;h.v+=(-160*h.x-11*h.v)*dt;h.x+=h.v*dt;h.rv+=(-140*h.r-10*h.rv)*dt;h.r+=h.rv*dt;
    this.meV+=(-160*this.meX-12*this.meV)*dt;this.meX+=this.meV*dt;this.bob+=dt;
    if(this.ducking){this.duckT+=dt;this.duckA=Math.max(this.duckA,Math.min(1,0.5*G0*this.duckT*this.duckT/DUCK_H));}else{this.duckT=0;this.duckA=Math.max(0,this.duckA-dt/0.25);}
    if(this.slipT>0)this.slipT-=dt;
    if(this.rduck){const r=this.rduck;r.t+=dt;if(r.t<r.dur)this.rduckA=Math.max(this.rduckA,Math.min(1,0.5*G0*r.t*r.t/DUCK_H));else{this.rduckA=Math.max(0,this.rduckA-dt/0.25);if(this.rduckA<=0)this.rduck=null;}}
    if(b){if(b.immune>0)b.immune-=dt;if(b.stun>0)b.stun=Math.max(0,b.stun-dt);else if(b.chain.length&&this.state==='ready'&&!this.queued){if(b.chain.length>=2)this.float(612,170,`${b.chain.length}-HIT COMBO`,C.violet);b.chain=[];}
      const mf=b.me/100,rf=b.opp/b.oppMax,P=this.pose();
      if(!b.over||this.ko){if(mf<0.45&&Math.random()<rdt*(0.45-mf)*30)burst(PARTS,434+P.dx+this.meX+(Math.random()-0.5)*30,184+P.dy,1,{dir:-Math.PI/2+(Math.random()-0.5)*2,spread:0.6,sp:[40,110],g:700,life:0.9,size:2.6,kind:'drop',col:'rgba(170,220,255,0.9)'});
        if(rf<0.5&&Math.random()<rdt*(0.5-rf)*14)burst(PARTS,648+(Math.random()-0.5)*50,300+this.rDrop()+(Math.random()-0.5)*40,6,{spread:6.28,sp:[80,260],g:500,life:0.35,size:2,kind:'spark',col:[C.yellow,'#ffffff',C.hot]});
        if(rf<0.3&&Math.random()<rdt*4)burst(PARTS,640+Math.random()*20,270+this.rDrop(),1,{dir:-Math.PI/2,spread:0.5,sp:[20,50],life:1.4,size:6,kind:'smoke',col:'#6b7385',drag:0.8});}}
    if(this.queued&&this.state==='recoil'&&this.p<0.55){this.p=0;this.state='ready';}
    if(this.queued&&this.state==='ready'){const q=this.queued;this.queued=null;this.press(q,true);}
    this.dodge=this.dodged&&!this.duckDodge&&(this.state==='swing'||this.state==='hold')?Math.min(1,this.dodge+dt*14):Math.max(0,this.dodge-dt*4);
    this.rings.forEach(r=>r.t+=dt);this.rings=this.rings.filter(r=>r.t<0.25);
    this.floats.forEach(f=>f.t+=rdt);this.floats=this.floats.filter(f=>f.t<1.4);
    this.boardV+=(this.boardT-this.boardV)*Math.min(1,dt*7);
    if(this.ko){this.ko.t+=rdt;if(!this.ko.done&&this.ko.t>1.0){this.ko.done=true;this.endBout(this.ko.who==='rex');}}
    if(this.state==='swing'){this.p+=dt*this.rate;
      if(this.wantSlow&&!this.slowed&&this.p>0.5){this.slowed=true;const T0=this.target();startSlow({focus:{x:T0.x-24,y:T0.y+4+this.worldOffsetY()},zoom:2.3,dur:2.0,min:0.06});}
      if(!this.hit&&this.p>=1){if(this.dodged)this.whiff();else if(this.bout&&this.opt.type!=='upper'&&this.rduckA>0.5)this.whiff('duck');else this.impact();}
      if(this.p>=1.07){this.p=1.07;this.state='hold';this.holdT=0;}}
    else if(this.state==='hold'){this.holdT+=dt;if(this.holdT>0.03)this.state='recoil';}
    else if(this.state==='recoil'){this.p-=dt*(this.opt.type==='jab'?5.5:3.2);if(this.p<=0){this.p=0;this.state='ready';this.since=0;}}
    if(b&&!b.over){if(b.intro>0){b.intro-=rdt;return;}if(E.slow)return;const a=b.atk,T=b.T;
      if(a.ph==='idle'&&!this.rduck&&b.stun<=0&&b.i>=2&&Math.random()<dt*(0.1+0.03*(b.i-2))){this.rduck={t:0,dur:0.85,pro:true};logMove('fight',{who:'rex',kind:'rexduck',title:'Rex ducks low',math:'only an uppercut reaches him',tone:'info'});if(!this.warned.rduck){this.warned.rduck=true;COACH.say('Rex is ducking! Jabs and crosses sail over his head. Throw an UPPERCUT: it comes from below and catches him low for ×1.3.','tip',8);}}
      if(a.ph==='idle'){if(this.state!=='swing'&&b.stun<=0&&!this.rduck)b.next-=dt;if(b.next<=0){a.ph='tele';a.t=0;a.low=Math.random()<Math.min(0.45,b.i*0.08);tone(a.low?120:200,0.12,'sawtooth',0.04);}}
      else if(a.ph==='tele'){a.t+=dt;if(a.t>=T.tele){a.ph='strike';a.t=0;SND.whoosh();}}
      else if(a.ph==='strike'){a.t+=dt;if(a.t>=0.1){a.ph='recover';a.t=0;this.takeHit();}}
      else if(a.ph==='recover'){a.t+=dt;if(a.t>=0.35){a.ph='idle';b.next=T.every*(0.75+Math.random()*0.5);}}}},
  takeHit(){const b=this.bout,inc=this.incoming(),low=!!b.atk.low,depth=this.duckA*DUCK_H;
    if(!low&&depth>=DUCK_CLEAR){b.slips=(b.slips||0)+1;this.slipT=0.9;this.float(470,160,'SLIPPED!',C.good,true);logMove('fight',{who:'you',kind:'slip',title:'Slipped his high punch',res:'0 HP',math:`head dropped ${fmt(depth,2)} m ≥ ${DUCK_CLEAR} m`,tone:'good'});tone(900,0.1,'triangle',0.06,1300);
      if(!this.warned.slip){this.warned.slip=true;COACH.say(`Slipped it! Your head dropped ${fmt(depth,2)} m, under his fist. Now fire an UPPERCUT for +50% (slip-and-rip).`,'hype',8);}return;}
    const lowDuck=low&&this.duckA>0.3,blocked=this.blocking&&!lowDuck,d=Math.round(inc.d*(blocked?0.2:lowDuck?1.2:1));b.me=Math.max(0,b.me-d);
    if(lowDuck&&!this.warned.low){this.warned.low=true;setTimeout(()=>COACH.say('That was a BODY SHOT. Ducking lowers your stomach right into it. Watch his fist: low wind-up means BLOCK (◀), high means DUCK (▼).','warn',9),50);}
    else if(!low&&this.duckA>0.05&&!blocked&&!this.warned.late){this.warned.late=true;setTimeout(()=>COACH.say(`Too late: you only dropped ${fmt(depth,2)} m. Falling ${DUCK_CLEAR} m takes t = √(2h ÷ g) = √(2 × ${DUCK_CLEAR} ÷ 9.81) = ${fmt(Math.sqrt(2*DUCK_CLEAR/G0),2)} s. Start ducking when he flashes red.`,'warn',10),50);}
    const Fm=`F = ${OPPM}×${b.T.vo}÷${fmt(this.V.dt/1000,3)} = ${fmt(inc.F,0)} N`;
    if(blocked)logMove('fight',{who:'rex',kind:'blocked',d,low,title:`${low?'Body shot':'High punch'} · BLOCKED`,res:`−${d} HP`,math:Fm+' × 20%',tone:'info'});
    else logMove('fight',{who:'rex',kind:'taken',d,F:inc.F,low,lowDuck,late:!low&&this.duckA>0.05,depth,title:`${low?'Body shot':'High punch'} landed${lowDuck?' (you ducked into it)':''}`,res:`−${d} HP`,math:Fm,tone:'bad'});
    if(blocked){b.blocks++;this.meV=-80;this.float(470,170,`BLOCKED  −${d}`,C.xray);tone(520,0.08,'square',0.05);}
    else{b.taken++;this.meV=-320;E.shake=reduce?0:9;E.flash=reduce?0:0.5;E.flashCol='#ff4050';sfx(inc.F/4000,0.9);this.float(450,lowDuck?250:170,`${low?'BODY ':''}−${d} HP · ${fmt(inc.F,0)} N`,C.bad,true);
      burst(PARTS,452,200,12,{dir:Math.PI,spread:1.6,sp:[120,380],g:420,life:0.4,size:2.2,kind:'spark',col:[C.bad,'#ffd0d4']});
      if(!this.warned.hit||d>=35){this.warned.hit=true;COACH.say(`Ouch: ${fmt(inc.F,0)} N on your ${fmt(this.V.dt,0)} ms glove. F = ${OPPM} kg × ${b.T.vo} m/s ÷ Δt. High punch: duck (▼). Body shot: block (◀). Or raise Δt to soften every hit.`,'warn',8);}}
    if(b.me<=0){logMove('fight',{who:'sys',kind:'down',title:'You are knocked down',res:'LOSS',tone:'bad'});b.over=true;b.win=false;this.ko={t:0,who:'me'};SND.grade('D');}},
  whiff(kind){this.hit=true;const b=this.bout,t=REACH/this.v;b.chain=[];
    logMove('fight',{who:'rex',kind:'dodged',type:this.opt.type,v:this.v,tt:t,react:this.reactNow(),byDuck:kind==='duck',title:kind==='duck'?`Rex ducked your ${{jab:'Jab',cross:'Cross',upper:'Uppercut'}[this.opt.type].toLowerCase()}`:`Rex dodged your ${{jab:'Jab',cross:'Cross',upper:'Uppercut'}[this.opt.type].toLowerCase()}`,res:'miss',math:kind==='duck'?'jab/cross go over a ducking head':`t = 0.6÷${fmt(this.v)} = ${fmt(t,3)} s > ${fmt(this.reactNow(),3)} s`,tone:'bad'});
    if(kind==='duck'||this.duckDodge){this.float(612,200,'HE DUCKED',C.muted,true);tone(240,0.18,'triangle',0.05,160);
      if(kind==='duck'){COACH.say('He ducked under it! When Rex drops low, only an UPPERCUT (yellow, L) reaches him.','warn',8);return;}}
    else{this.float(612,200,'DODGED',C.muted,true);tone(240,0.18,'triangle',0.05,160);}
    const vNeed=REACH/b.T.react;COACH.say(`Dodged! Your fist needed t = 0.6 ÷ ${fmt(this.v)} = ${fmt(t,3)} s, but Rex reacts in ${fmt(this.reactNow(),3)} s. You need v > ${fmt(REACH/this.reactNow())} m/s: hit the green`+(this.opt.type!=='jab'?', or throw a jab (lighter = faster).':(this.V.m>2.2?', or drop m (v ∝ 1/√m).':'.'))+' He can’t dodge while he winds up, so counter when he flashes red.','warn',10);},
  calc(v){const V=this.V,m=this.mEff(),dt=V.dt/1000,A=V.A/10000,p=m*v,F=p/dt;return{v,m,dt,A,p,F,P:F/A/1000,KE:0.5*m*v*v,a:F/this.HEADM};},
  impact(){this.hit=true;const r=this.calc(this.v);r.acc=this.acc;r.type=this.TYPES[this.opt.type];r.Fglove=r.p/0.015;r.Fbare=r.p/0.006;this.res=r;this.performancePhase='see';this.performanceUntil=performance.now()+2400;
    const T0=this.target();this.rings.push({x:T0.x,y:T0.y,t:0},{x:T0.x,y:T0.y,t:-0.05});
    const dirA=this.opt.type==='upper'?-1.0:0.08;burst(PARTS,T0.x,T0.y,14+Math.min(26,Math.round(r.F/250)),{dir:dirA,spread:2.2,sp:[180,520],g:420,life:0.45,size:2.4,kind:'spark',col:[C.hot,'#fff4d6',C.yellow]});
    burst(PARTS,T0.x+10,T0.y-6,8,{dir:dirA-0.3,spread:1.6,sp:[80,220],g:500,life:0.7,size:2.2,kind:'drop',col:'rgba(200,235,255,0.9)'});E.flash=reduce?0:Math.min(1,0.35+r.F/8000);E.flashCol=null;
    if(this.opt.type==='upper'){this.head.rv=-(2.2+this.v*0.35);this.head.v=90+this.v*14;}else this.head.v=180+this.v*38;
    E.shake=reduce?0:Math.min(14,3+r.F/500);sfx(r.F/4500,this.V.dt>=10?0.8:1.3);
    this.boardT=r.F;this.pb=r.F>best.punch;if(this.pb){best.punch=Math.round(r.F);saveBest();}
    notebook(this.result());this.badges(r);
    if(this.bout)this.boutHit(r);else this.game(r);},
  badges(r){const perfect=r.acc>0.92;this.perf=perfect?(this.perf||0)+1:0;
    if(perfect)badge('f_perfect');if(r.F>=3000)badge('f_3k');if(this.V.dt<=8)this.didBare=true;if(this.V.dt>=15)this.didGlove=true;if(this.didBare&&this.didGlove)badge('f_glove');if(this.perf>=3)badge('f_combo');if(this.V.dt>=30&&r.F<1000)badge('f_soft');},
  boutHit(r){const b=this.bout,T=b.T,counter=b.atk.ph==='tele';let d=this.dmgOf(r.F);
    if(d===0){this.float(612,190,`CLANK · ${fmt(r.F,0)} N`,C.muted,true);logMove('fight',{who:'you',kind:'clank',type:this.opt.type,F:r.F,v:r.v,armor:T.armor,title:`${{jab:'Jab',cross:'Cross',upper:'Uppercut'}[this.opt.type]} · CLANK`,res:'0 HP',math:`F = ${fmt(r.m,2)}×${fmt(r.v)}÷${fmt(r.dt,3)} = ${fmt(r.F,0)} N < ${fmt(T.armor,0)} N armor`,tone:'bad'});tone(1800,0.15,'square',0.04,900);
      const vP=this.vTiming(1)*Math.sqrt(2.8/this.mEff()),dtNeed=this.mEff()*vP/T.armor*1000;
      COACH.say(`CLANK! ${fmt(r.F,0)} N is under his ${fmt(T.armor,0)} N armor. F = m·v ÷ Δt, so at a perfect ${fmt(vP)} m/s you need Δt ≤ ${fmt(this.mEff(),2)}×${fmt(vP)}÷${fmt(T.armor,0)} = ${fmt(dtNeed,0)} ms. Drag Δt down, but less padding means his punches hurt more.`,'warn',11);return;}
    if(counter){d*=1.25;b.counters++;b.atk.ph='recover';b.atk.t=0;this.float(612,150,'COUNTER ×1.25',C.violet,true);}
    if(this.opt.type==='upper'&&this.fromDuck){d*=1.5;b.rips=(b.rips||0)+1;this.float(612,120,'SLIP & RIP ×1.5',C.yellow,true);badge('f_duck');}
    if(this.opt.type==='upper'&&this.rduckA>0.3){d*=1.3;b.caught=(b.caught||0)+1;this.float(612,236,'CAUGHT DUCKING ×1.3',C.yellow,true);this.rduck=null;this.rduckA=0;}
    const wasStun=b.stun>0&&!(b.immune>0);if(!wasStun)b.chain=[];b.chain.push(this.opt.type);const n=b.chain.length;let mult=Math.min(1.75,1+0.15*(n-1)),named=null;
    for(const cmb of COMBOS){const L=cmb.seq.length;if(n>=L&&cmb.seq.every((x,k)=>b.chain[n-L+k]===x)){named=cmb;break;}}
    if(named&&named.mult>mult)mult=named.mult;d*=mult;if(n>b.bestCombo)b.bestCombo=n;
    if(n>=2){this.float(700,150,`${n} HITS ×${fmt(mult,2)}`,C.violet,true);tone(600+n*120,0.08,'square',0.05);}
    if(named&&n>=named.seq.length){b.namedN++;b.namedXP+=named.xp;E.title={t:0.25,text:named.name,sub:`combo ×${fmt(named.mult,2)} · +${named.xp} XP`};SND.badge();if(named.name==='ONE-TWO-UPPER')badge('f_123');}
    const vh=r.p/this.HEADM,stun=clamp(vh/A_NECK,0.35,1.1)*Math.pow(0.8,n-1);b.stun=stun;b.stunMax=stun;
    if(n>=4){b.stun=0;b.chain=[];b.immune=1.4;b.next=Math.min(b.next,0.35);this.float(612,265,'HE BREAKS FREE',C.hot,true);}
    if(!this.warned.stun){this.warned.stun=true;COACH.say(`He's rocked! Your punch gave his head p ÷ m = ${fmt(r.p)} ÷ 4.5 = ${fmt(vh)} m/s. His neck needs t = v ÷ a = ${fmt(vh)} ÷ ${A_NECK} = ${fmt(stun,2)} s to stop it, and he can't dodge in that window. Chain: JAB → CROSS → UPPER.`,'hype',11);}
    d=Math.round(d);b.opp=Math.max(0,b.opp-d);b.landed++;if(r.acc>0.92)b.perf++;
    {const tags=[];if(named)tags.push(named.name);else if(n>=2)tags.push(`${n}-hit`);if(counter)tags.push('counter');if(this.opt.type==='upper'&&this.fromDuck)tags.push('slip & rip');if(r.acc>0.92)tags.push('perfect');
     logMove('fight',{who:'you',kind:'hit',type:this.opt.type,v:r.v,F:r.F,dmg:d,combo:n,named:named?named.name:null,counter,perfect:r.acc>0.92,rip:this.opt.type==='upper'&&this.fromDuck,
       title:`${{jab:'Jab',cross:'Cross',upper:'Uppercut'}[this.opt.type]}${tags.length?' · '+tags.join(', '):''}`,res:`−${d} HP`,math:`F = ${fmt(r.m,2)}×${fmt(r.v)}÷${fmt(r.dt,3)} = ${fmt(r.F,0)} N${mult>1?` · ×${fmt(mult,2)}`:''}`,tone:'good'});}
    this.float(620,188,`−${d}`,r.acc>0.92?C.yellow:C.hot,true);
    if(b.opp<=0){logMove('fight',{who:'sys',kind:'ko',title:`K.O.! ${T.name} is down`,res:'WIN',tone:'good'});b.over=true;b.win=true;this.ko={t:0,who:'rex'};this.head.rv=-6;this.head.v=500;SND.cheer();E.title={t:0,text:'K.O.!',sub:T.name+' is down'};return;}
    if(r.acc>0.92)COACH.say(`Perfect! ${fmt(r.F,0)} N for ${d} damage. ${b.opp} HP to go.`,'hype',6);},
  endBout(win){const b=this.bout,T=b.T,i=b.i,chk=curCh('fight');{const rid=RECS.fight&&RECS.fight.id;setTimeout(()=>{if(RECS.fight&&RECS.fight.id===rid)stopRec('fight');},900);}
    if(win){const rows=[[`K.O. ${T.name}`,250+100*i],[`perfect punches ×${b.perf}`,b.perf*40],[`counters ×${b.counters}`,b.counters*50],[`blocks ×${b.blocks}`,b.blocks*30],[`slips ×${b.slips||0}`,(b.slips||0)*40],[`slip & rips ×${b.rips||0}`,(b.rips||0)*60],[`best combo: ${b.bestCombo} hits`,b.bestCombo>=2?b.bestCombo*30:0],[`named combos ×${b.namedN}`,b.namedXP],[`caught him ducking ×${b.caught||0}`,(b.caught||0)*40],['health left',Math.round(b.me*2)]];if(b.taken===0)rows.push(['FLAWLESS',200]);
      if(chk)rows.push([`CHALLENGE ${i+1} CLEARED`,300+150*i]);
      const gr=b.taken===0&&b.perf>=2?'S':b.me>=60?'A':b.me>=30?'B':'C';
      award('fight',rows,true,{grade:gr,title:'K.O.!',sub:`${T.name} down · ${b.me} HP left · ${b.landed} punches landed`,hint:(chk&&i+1<REX.length?`Press PUNCH to face ${REX[i+1].name}`:'Press PUNCH for a rematch')+' · or check the coach review'});
      if(chk)completeCh('fight');}
    else{award('fight',[[`punches landed ×${b.landed}`,b.landed*15],['showed up',20]],false,{grade:'D',title:'KNOCKED DOWN',sub:`${T.name} had ${b.opp} HP left`,hint:'Press PUNCH to run it back'});
      const inc=this.incoming();COACH.say(`He got you. Each of his punches hit ${fmt(inc.F,0)} N = ${fmt(inc.d,0)} HP. Raise Δt to shrink that, block more (blocks take 80% off), and counter while he winds up.`,'warn',12);}
    setLabel();},
  introLine(){const b=this.bout;if(!b)return'';const T=b.T,vNeed=REACH/T.react,vP=this.vTiming(1)*Math.sqrt(2.8/this.mEff()),Fp=this.calc(vP).F,inc=this.incoming();
    let s=`${T.name}: ${T.twist} He reacts in ${T.react} s, so your fist must cover 0.6 m faster: v > 0.6 ÷ ${T.react} = ${fmt(vNeed)} m/s.`;
    if(T.armor){const dtNeed=this.mEff()*vP/T.armor*1000;s+=` Armor ${fmt(T.armor,0)} N: at a perfect ${fmt(vP)} m/s you need Δt ≤ ${fmt(dtNeed,0)} ms.`;}
    s+=` His punches will hit you with ${fmt(inc.F,0)} N (${fmt(inc.d,0)} HP) at your current Δt.`;if(b.i>=1)s+=' He now throws body shots too: HIGH = duck, LOW = block.';return s;},
  game(r){const perfect=r.acc>0.92;if(!RECS.fight||!RECS.fight.on)startRec('fight','Free lab');logMove('fight',{who:'you',kind:'hit',type:this.opt.type,v:r.v,F:r.F,dmg:0,perfect,title:`${{jab:'Jab',cross:'Cross',upper:'Uppercut'}[this.opt.type]}${perfect?' · perfect':''}`,res:`${fmt(r.F,0)} N`,math:`F = ${fmt(r.m,2)}×${fmt(r.v)}÷${fmt(r.dt,3)}`,tone:perfect?'good':'info'});
    const items=[['force',Math.round(r.F/40)]];if(perfect)items.push(['PERFECT TIMING',100]);else if(r.acc>0.6)items.push(['solid',30]);if(this.pb)items.push(['NEW BEST',150]);
    const gr=r.acc>=0.97?'S':perfect?'A':r.acc>=0.75?'B':r.acc>=0.5?'C':'D';
    award('fight',items,r.acc>0.6,{grade:gr,title:perfect?'PERFECT PUNCH':r.acc>0.6?'SOLID HIT':'OFF THE GREEN',sub:`${fmt(r.F,0)} N · ${fmt(r.v)} m/s · Δt ${fmt(r.dt*1000,0)} ms`,hint:'Punch again any time',auto:true,delay:E.slow?1300:0});
    const vTop=this.vTiming(1)*Math.sqrt(2.8/r.m),Ftop=r.m*vTop/r.dt;
    if(perfect)COACH.say(`PERFECT! ${fmt(r.v)} m/s puts ${fmt(r.F,0)} N into the dummy in ${fmt(r.dt*1000,0)} ms. `+(r.dt<0.01?'Bare knuckles take that same force right back. Now try 15 ms and compare.':'Now drag Δt down to 6 ms and hit again. Same momentum, way more force.'),'hype',9);
    else if(r.acc>0.6)COACH.say(`Solid. You got ${fmt(r.v)} m/s. Hit the green and v climbs to about ${fmt(vTop)} m/s, and since F = m·v ÷ Δt that's ${fmt(Ftop,0)} N.`,'tip',9);
    else COACH.say(`Off the green, only ${fmt(r.v)} m/s. Watch the needle, not the dummy. A perfect one here is worth ${fmt(Ftop,0)} N and +100 XP.`,'warn',9);},
  isIdle(){return this.state==='ready'&&(!this.bout||this.bout.over||this.bout.atk.ph==='idle');},
  idleTips(){if(this.bout&&!this.bout.over)return[this.introLine(),'Counter while Rex winds up (red flash): he can’t dodge and it does 25% extra.','Jabs are 35% lighter, so they\u2019re faster and harder to dodge. Save the cross for when he winds up.','Hold BLOCK while he flashes red: it cuts his damage by 80%. Let go and counter right after.','Duck (▼) a HIGH punch and it misses completely. Then throw an uppercut for SLIP & RIP ×1.5.','Combos: after a clean hit he\u2019s stunned (purple bar). Tap JAB → CROSS → UPPER before it runs out for ×1.6.','When Rex ducks, only the uppercut reaches him.'];
    return['Speed counts twice in energy: KE = ½·m·v². Nail the green.','Heavier m means more momentum but a slower fist: v ∝ 1/√m, so p = m·v grows like √m.','Want to see why gloves exist? Punch at Δt = 6 ms, then at 15 ms. That earns Glove Scientist.','Switch Mode to Bout vs Rex to fight a sparring robot that dodges and hits back.'];},
  headXform(c){c.translate(648,292+this.rDrop());c.rotate(this.head.r-this.dodge*0.35+(this.bout&&!this.bout.over?Math.sin(this.bob*2.4)*0.03:0));c.translate(this.head.x+this.dodge*38,-44+this.dodge*14);},
  rexFall(c){if(this.ko&&this.ko.who==='rex'){const a=Math.min(1.25,this.ko.t*2.2);c.translate(652,455);c.rotate(a);c.translate(-652,-455);}},
  meFall(c){if(this.ko&&this.ko.who==='me'){const a=Math.min(1.2,this.ko.t*2.2);c.translate(420,455);c.rotate(-a);c.translate(-420,-455);}},
  draw(c){
    const vy=this.worldOffsetY(),floor=455+vy;window.__KICKLAB_FIGHT_COMPOSITION__={worldOffsetY:vy,sceneFloorLogical:floor,sceneFloorCss:floor*sc,stageHeightCss:H*sc,coverage:floor/H};
    const g=c.createLinearGradient(0,-vy,0,455);g.addColorStop(0,'#0c1630');g.addColorStop(1,'#16244a');c.fillStyle=g;c.fillRect(-500,-500-vy,W+1000,H+1000);
    c.strokeStyle='rgba(147,164,195,0.07)';c.lineWidth=1;for(let x=0;x<=W;x+=60)line(c,x,-40,x,455);for(let y=35;y<455;y+=60)line(c,-40,y,W+40,y);
    const sp=c.createRadialGradient(540,40,10,540,160,420);sp.addColorStop(0,'rgba(255,230,170,0.16)');sp.addColorStop(1,'rgba(255,230,170,0)');c.fillStyle=sp;c.fillRect(-500,-500,W+1000,955);
    [[300,'#7a2d3a'],[342,'#e8eef9'],[384,'#2f4a86']].forEach(([y,col])=>{c.fillStyle='rgba(0,0,0,0.25)';c.fillRect(-500,y+3,W+1000,5);c.fillStyle=col;c.globalAlpha=0.55;c.fillRect(-500,y,W+1000,5);c.globalAlpha=1;});
    c.fillStyle='#223050';c.fillRect(250,280,14,176);c.fillRect(800,280,14,176);
    c.fillStyle='#1a2849';c.fillRect(-500,455,W+1000,H+500);c.fillStyle='#2a3d6a';c.fillRect(-500,455,W+1000,4);
    this.drawDummy(c);this.drawFighter(c);
    this.rings.forEach(r=>{if(r.t<0)return;c.save();c.globalAlpha=clamp(1-r.t*5,0,1);c.strokeStyle=C.hot;c.lineWidth=3;c.beginPath();c.arc(r.x,r.y,10+r.t*900,0,Math.PI*2);c.stroke();c.restore();});
    this.floats.forEach(f=>{c.save();c.globalAlpha=f.t<0.1?f.t/0.1:Math.max(0,1-(f.t-0.8)/0.6);const y=f.y-f.t*40;c.font=(f.big?'22px ':'16px ')+DISP;c.lineWidth=5;c.strokeStyle='rgba(6,11,24,0.9)';c.textAlign='center';c.strokeText(f.text,f.x,y);c.fillStyle=f.col;c.fillText(f.text,f.x,y);c.restore();});},
  performanceState(){const combo=globalThis.__KICKLAB_LIVE_PHYSICS_COMBO_AUDIT__,active=!!(combo&&combo.active&&combo.mode==='fight'),showResult=this.performancePhase==='see'&&performance.now()<this.performanceUntil;
    return KickLabLivePhysicsCombo.fightInteractionPhase({actionReady:this.state==='ready',comboStatus:active?'active':showResult?'resolved':'idle',comboMode:active||showResult?'fight':null,comboIndex:active?combo.index:-1,comboLength:active?2:0,showResult});},
  rexHand(){const b=this.bout,idle={x:600+Math.sin(this.bob*3)*3,y:302+this.rDrop()};if(!b)return idle;const a=b.atk,tgt=a.low?{x:476+this.meX,y:300}:{x:466+this.meX,y:204},wy=a.low?338:270;
    if(a.ph==='tele')return{x:646+Math.sin(this.bob*40)*2,y:wy};if(a.ph==='strike')return{x:lerp(646,tgt.x,Math.min(1,a.t/0.1)),y:lerp(wy,tgt.y,Math.min(1,a.t/0.1))};
    if(a.ph==='recover')return{x:lerp(tgt.x,idle.x,Math.min(1,a.t/0.35)),y:lerp(tgt.y,idle.y,Math.min(1,a.t/0.35))};return idle;},
  UA:74,FA:80,
  rig(){const P=this.pose(),t=P.t,dx=P.dx,lowHP=this.bout&&this.bout.me<45&&!this.ko,dy=P.dy+(lowHP?Math.sin(this.bob*7)*3*(1-this.bout.me/45):0),guard=this.blocking&&this.state==='ready';
    const piv=t==='cross'?P.r:t==='upper'?P.r*0.6:0,dk=this.duckA||0,br=this.state==='ready'&&!guard?Math.sin(this.bob*5.2)*2.2:0;
    const fS={x:P.fS.x,y:P.fS.y+(dy-P.dy)+br},rS={x:P.rS.x,y:P.rS.y+(dy-P.dy)+br};
    const hipF={x:448+dx,y:336+dy},hipR={x:424+dx*0.6+14*piv,y:338+dy},pelvis={x:(hipF.x+hipR.x)/2,y:(hipF.y+hipR.y)/2};
    const anF={x:500+10*dk+(t==='jab'?6*P.pp:0),y:440},anR={x:390+12*piv-12*dk,y:440-11*piv};
    const toF={x:anF.x+30,y:452},toR={x:anR.x+28+4*piv,y:452};
    const knF=ik(hipF.x,hipF.y,anF.x,anF.y,62,62,-1),knR=ik(hipR.x,hipR.y,anR.x,anR.y,62,62,-1);
    const chinF={x:478+dx,y:214+dy},chinR={x:464+dx,y:220+dy},fist=this.fistAt(this.p);let fF,rF;
    if(guard){fF={x:484+dx,y:206+dy};rF={x:466+dx,y:202+dy};}
    else if(t==='jab'){fF=fist;rF={x:chinR.x,y:chinR.y+br};}
    else{rF=fist;const k=Math.min(1,P.pp*2),fr=this.rest('front',P);fF={x:lerp(fr.x,chinF.x,k),y:lerp(fr.y,chinF.y,k)+br};}
    if(this.state==='ready'&&!guard){fF={x:fF.x,y:fF.y+br};}
    const elF=ik(fS.x,fS.y,fF.x,fF.y,this.UA,this.FA,1),elR=ik(rS.x,rS.y,rF.x,rF.y,this.UA,this.FA,1);
    const head={x:438+dx+6*piv,y:205+dy+br*0.6,tilt:-0.08-0.1*dk+(t==='upper'?-0.05*P.pp:0)},neck={x:(fS.x+rS.x)/2+2,y:Math.min(fS.y,rS.y)-6};
    return{P,t,guard,piv,fist,J:{facing:1,head,neck,pelvis,shF:fS,shR:rS,elF,elR,haF:fF,haR:rF,hipF,hipR,knF,knR,anF,anR,toF,toR,ground:452}};},
  drawFighter(c){const R=this.rig(),P=R.P,t=R.t,J=R.J,gr=this.gloveR(),guard=R.guard,punching=!guard,fist=R.fist;
    c.save();this.meFall(c);c.translate(this.meX,0);
    const armFront=!guard&&t!=='jab'&&P.pp>0.12;
    const A=GAME_CORE.playerAppearance('you');
    RIG.side(c,J,{u:150,skin:A.skin,hair:A.hair,hairStyle:A.hairStyle,eye:A.eye,brow:A.brow,mouth:A.mouth,kit:A.kit,accent:A.accent,shorts:A.shorts,sock:A.socks,boot:{color:'#10192d',accent:C.hot,sole:'flat',soleColor:'#e8eef9'},band:C.hot,belt:C.hot,glove:gr?gr*0.95:0,gloveCol:styleCol('fight'),armFront,chest:22,olw:2.4,headR:20});
    if(punching&&this.state==='swing'&&this.p>0.2){const Fp=t==='jab'?J.haF:J.haR,L=Math.hypot(fist.dx,fist.dy)||1;c.save();c.strokeStyle='rgba(232,238,249,0.35)';c.lineWidth=2;for(let i=0;i<3;i++){const o=(i-1)*7;line(c,Fp.x-fist.dx/L*(30+i*8)-fist.dy/L*o,Fp.y-fist.dy/L*(30+i*8)+fist.dx/L*o,Fp.x-fist.dx/L*14-fist.dy/L*o,Fp.y-fist.dy/L*14+fist.dx/L*o);}c.restore();}
    if(guard){c.strokeStyle='rgba(127,220,255,0.8)';c.lineWidth=3;glow(c,C.xray,12);c.beginPath();c.arc(456+P.dx,208+P.dy,42,-1.1,1.1);c.stroke();c.shadowBlur=0;}
    c.restore();},
  rexRig(){const b=this.bout,drop=this.rDrop(),dk=clamp(drop/55,0,1),tele=b&&!b.over&&b.atk.ph==='tele',br=Math.sin(this.bob*4.4)*1.5;
    const hipA={x:640,y:396+drop},hipB={x:664,y:396+drop},anA={x:600-16*dk,y:446},anB={x:700+16*dk,y:446};
    const knA=ik(hipA.x,hipA.y,anA.x,anA.y,36,36,1),knB=ik(hipB.x,hipB.y,anB.x,anB.y,36,36,1);
    const S={x:626,y:316+drop},Hh=b?this.rexHand():{x:600+Math.sin(this.bob*3)*3,y:302+drop},El=ik(S.x,S.y,Hh.x,Hh.y,52,52,-1);
    const S2={x:676,y:312+drop},H2={x:614+(tele?6:0),y:338+drop+br},E2=ik(S2.x,S2.y,H2.x,H2.y,44,44,-1);
    return{drop,dk,tele,hipA,hipB,anA,anB,knA,knB,S,Hh,El,S2,H2,E2};},
  drawDummy(c){c.save();this.rexFall(c);const b=this.bout,R=this.rexRig(),tele=R.tele,drop=R.drop;
    const metal=b?'#b9c3d6':'#d9ae4a',metalD=b?'#7f8aa3':'#a77f2c',joint=b?'#3a4b73':'#7a5a1e',ol='#0a1122',olw=2.2;
    if(tele){const pul=0.5+0.5*Math.sin(this.bob*30);const rg=c.createRadialGradient(652,300,10,652,300,120);rg.addColorStop(0,`rgba(255,64,80,${0.35+0.25*pul})`);rg.addColorStop(1,'rgba(255,64,80,0)');c.fillStyle=rg;c.fillRect(530,170,250,260);}
    c.fillStyle='rgba(0,0,0,0.3)';c.beginPath();c.ellipse(652,452,70,9,0,0,Math.PI*2);c.fill();
    const bolt=(p,r)=>{c.fillStyle=joint;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.lineWidth=olw;c.strokeStyle=ol;c.stroke();c.fill();c.fillStyle=metal;c.beginPath();c.arc(p.x,p.y,r*0.4,0,Math.PI*2);c.fill();};
    const leg=(H,K,A,far)=>{const m=far?metalD:metal;RIG.seg(c,H,K,12,10,m,ol,olw,true);RIG.seg(c,K,A,10,8,m,ol,olw,true);bolt(K,8);
      c.save();c.translate(A.x,A.y);c.fillStyle=far?'#2b3a5e':'#3a4b73';rr(c,-20,-4,34,12,4);c.lineWidth=olw;c.strokeStyle=ol;c.stroke();c.fill();c.restore();};
    /* far arm (guard) */
    RIG.seg(c,R.S2,R.E2,10,8,metalD,ol,olw,true);RIG.seg(c,R.E2,R.H2,8,7,metalD,ol,olw,true);bolt(R.E2,6);c.fillStyle='#4a5878';c.beginPath();c.arc(R.H2.x,R.H2.y,12,0,Math.PI*2);c.lineWidth=olw;c.strokeStyle=ol;c.stroke();c.fill();
    leg(R.hipB,R.knB,R.anB,true);leg(R.hipA,R.knA,R.anA,false);
    c.save();c.translate(0,drop);
    /* pelvis + torso armor */
    c.fillStyle=joint;rr(c,628,384,48,22,8);c.lineWidth=olw;c.strokeStyle=ol;c.stroke();c.fill();
    const tg=c.createLinearGradient(616,0,688,0);tg.addColorStop(0,tint(metal[0]==='#'?metal:'#b9c3d6',0.15));tg.addColorStop(1,metalD);c.fillStyle=tg;
    c.beginPath();c.moveTo(620,300);c.quadraticCurveTo(652,288,686,300);c.lineTo(684,372);c.quadraticCurveTo(652,392,620,372);c.closePath();c.stroke();c.fill();
    c.strokeStyle='rgba(16,25,45,0.55)';c.lineWidth=2;line(c,652,300,652,380);c.beginPath();c.moveTo(624,338);c.quadraticCurveTo(652,346,682,338);c.stroke();c.beginPath();c.moveTo(626,362);c.quadraticCurveTo(652,370,680,362);c.stroke();
    const low=b&&b.opp/b.oppMax<0.3,core=tele?C.bad:low&&Math.random()<0.3?'#33405c':'#27c7ff';c.save();glow(c,core,14);c.fillStyle=core;c.beginPath();c.arc(640,318,7,0,Math.PI*2);c.fill();c.restore();
    if(b&&b.opp/b.oppMax<0.5){c.strokeStyle='#1b2440';c.lineWidth=2;c.beginPath();c.moveTo(632,304);c.lineTo(644,322);c.lineTo(638,338);c.stroke();c.beginPath();c.moveTo(676,352);c.lineTo(668,368);c.stroke();}
    c.fillStyle=b?'#9aa5bb':'#c79c3e';c.fillRect(640,280,16,20);c.lineWidth=olw;c.strokeStyle=ol;c.strokeRect(640,280,16,20);
    c.restore();
    c.save();this.headXform(c);
    c.fillStyle=b?'#dfe5f0':'#f0d27a';c.beginPath();c.arc(0,0,32,0,Math.PI*2);c.fill();c.strokeStyle=b?'#8b95ab':'#b8923d';c.lineWidth=2;c.stroke();
    c.fillStyle='#1b2440';c.beginPath();c.arc(8,-8,9,0,Math.PI*2);c.fill();c.fillStyle=b?'#dfe5f0':'#f0d27a';c.beginPath();c.moveTo(8,-8);c.arc(8,-8,9,-Math.PI/2,0);c.closePath();c.fill();c.beginPath();c.moveTo(8,-8);c.arc(8,-8,9,Math.PI/2,Math.PI);c.closePath();c.fill();
    if(b){const dying=b.opp/b.oppMax<0.3&&Math.random()<0.25;c.fillStyle=dying?'#33405c':tele?C.bad:'#27c7ff';c.fillRect(-28,-10,20,6);}else{c.fillStyle='#1b2440';c.beginPath();c.arc(-18,-6,3.5,0,Math.PI*2);c.fill();}
    c.fillStyle='#1b2440';c.fillRect(-26,12,12,3);
    if(b&&b.T.armor&&!(this.ko&&this.ko.who==='rex')){c.strokeStyle='#8b95ab';c.lineWidth=4;c.beginPath();c.arc(0,4,30,Math.PI*0.62,Math.PI*1.05);c.stroke();}
    c.restore();
    /* near (striking) arm with shoulder pauldron */
    RIG.seg(c,R.S,R.El,11,9,metal,ol,olw,true);RIG.seg(c,R.El,R.Hh,9,8,metal,ol,olw,true);bolt(R.El,7);
    c.fillStyle=metalD;c.beginPath();c.arc(R.S.x,R.S.y,14,0,Math.PI*2);c.lineWidth=olw;c.strokeStyle=ol;c.stroke();c.fill();
    c.fillStyle='#5b6b8c';c.beginPath();c.arc(R.Hh.x,R.Hh.y,14,0,Math.PI*2);c.stroke();c.fill();c.fillStyle='rgba(255,255,255,0.2)';c.beginPath();c.arc(R.Hh.x-4,R.Hh.y-5,5,0,Math.PI*2);c.fill();
    if(tele&&b){c.save();glow(c,b.atk.low?C.violet:C.bad,14);if(b.atk.low){text(c,'! LOW',700,350,'22px '+DISP,C.violet,'left');}else text(c,'! HIGH',652,190,'22px '+DISP,C.bad,'center');c.restore();}
    c.restore();},
  drawXray(c){c.save();c.lineCap='round';c.lineJoin='round';glow(c,C.xray,10);c.strokeStyle=C.xray;
    c.save();this.headXform(c);c.lineWidth=1.6;
    c.beginPath();c.ellipse(4,-5,27,28,0,Math.PI*0.95,Math.PI*2.28);c.stroke();
    c.beginPath();c.ellipse(-16,-5,6,5,0,0,Math.PI*2);c.stroke();
    c.beginPath();c.moveTo(-27,-2);c.lineTo(-31,8);c.lineTo(-25,9);c.stroke();
    c.lineWidth=2.2;c.beginPath();c.moveTo(18,6);c.lineTo(14,24);c.lineTo(-4,31);c.lineTo(-22,29);c.lineTo(-28,20);c.lineTo(-22,17);c.lineTo(-6,20);c.lineTo(10,12);c.stroke();
    c.lineWidth=1;for(let i=0;i<5;i++)line(c,-26+i*4,13,-26+i*4,17);
    c.restore();
    c.save();c.translate(0,this.rDrop());c.lineWidth=1.4;for(let i=0;i<14;i++){rr(c,642,278+i*8.5,11,6,2);c.stroke();}
    for(let i=0;i<5;i++){c.beginPath();c.ellipse(650,312+i*14,26-i,6,0,Math.PI*1.05,Math.PI*1.95);c.stroke();}c.restore();
    const R=this.rig(),RJ=R.J,S=R.t==='jab'?RJ.shF:RJ.shR,F=this.fistAt(this.p),El=ik(S.x,S.y,F.x,F.y,this.UA,this.FA,1);
    c.save();c.translate(this.meX,0);c.shadowBlur=0;RIG.bones(c,RIG.pairsSide(RJ),RIG.jointsSide(RJ),2,C.xray);
    {const lab=this.state==='ready'?'elbow':R.t==='jab'?'jab elbow':'cross elbow';RIG.angle(c,S,El,F,20,C.good,R.t==='upper'&&this.state!=='ready'?'upper elbow':lab);}
    if(R.t!=='jab'&&this.state!=='ready')RIG.angle(c,RJ.hipR,RJ.knR,RJ.anR,18,C.violet,'rear knee');else if((this.duckA||0)>0.2)RIG.angle(c,RJ.hipF,RJ.knF,RJ.anF,18,C.violet,'knee');
    c.restore();glow(c,C.xray,10);c.strokeStyle=C.xray;
    const L=Math.hypot(F.dx,F.dy)||1,u={x:F.dx/L,y:F.dy/L},n={x:-u.y,y:u.x};
    c.lineWidth=2.2;line(c,S.x,S.y,El.x,El.y);c.beginPath();c.arc(S.x,S.y,6,0,Math.PI*2);c.stroke();
    const Wr={x:F.x-u.x*13,y:F.y-u.y*13};
    const ex={x:Wr.x-El.x,y:Wr.y-El.y},eL=Math.hypot(ex.x,ex.y)||1,en={x:-ex.y/eL,y:ex.x/eL};
    c.lineWidth=1.6;line(c,El.x+en.x*2.5,El.y+en.y*2.5,Wr.x+en.x*3.5,Wr.y+en.y*3.5);line(c,El.x-en.x*2.5,El.y-en.y*2.5,Wr.x-en.x*3.5,Wr.y-en.y*3.5);
    c.lineWidth=1.4;for(let i=0;i<4;i++){const o=(i-1.5)*4.2,b={x:Wr.x+u.x*2+n.x*o*0.6,y:Wr.y+u.y*2+n.y*o*0.6},k={x:F.x+u.x*4+n.x*o,y:F.y+u.y*4+n.y*o};
      line(c,b.x,b.y,k.x,k.y);c.beginPath();c.moveTo(k.x,k.y);c.lineTo(k.x+u.x*3+n.x*4,k.y+u.y*3+n.y*4);c.lineTo(k.x-u.x*2+n.x*7,k.y-u.y*2+n.y*7);c.stroke();}
    const gr=this.gloveR();if(gr){c.shadowBlur=0;c.strokeStyle='rgba(232,238,249,0.45)';c.setLineDash([3,3]);c.beginPath();c.arc(F.x,F.y,gr+1,0,Math.PI*2);c.stroke();c.setLineDash([]);}
    c.shadowBlur=0;
    if(this.hit&&this.res){const T0=this.target(),Lf=clamp(30+this.res.F/60,40,150);
      arrow(c,T0.x+u.x*12,T0.y+u.y*12,T0.x+u.x*(12+Lf),T0.y+u.y*(12+Lf),C.hot,4);
      arrow(c,F.x-u.x*20,F.y-u.y*20,F.x-u.x*(20+Lf*0.8),F.y-u.y*(20+Lf*0.8),C.violet,4);}
    else arrow(c,F.x+u.x*18,F.y+u.y*18,F.x+u.x*(18+this.v*6),F.y+u.y*(18+this.v*6),C.good,3.5);
    c.restore();},
  callouts(c){if(this.state==='ready')return;const F=this.fistAt(this.p),fs=toS(F.x,F.y),T0=this.target(),tsP=toS(T0.x+10,T0.y-8);
    const r=this.calc(this.v);
    callout(c,fs,30,64,['p = m · v',`= ${fmt(r.m)} × ${fmt(r.v)} = ${fmt(r.p)}`],C.good);
    if(this.hit)callout(c,tsP,W-280,64,['F = p ÷ Δt',`= ${fmt(r.p)} ÷ ${fmt(r.dt,3)}`,`≈ ${fmt(r.F,0)} N`],C.hot);},
  hud(c){const b=this.bout;
    if(b){const bar=(x,frac,col,right)=>{c.fillStyle='#0a1222';rr(c,x,40,360,18,9);c.fill();c.strokeStyle=C.line;c.lineWidth=2;c.stroke();const w=Math.max(0,360*frac);c.fillStyle=col;rr(c,right?x+360-w:x,40,w,18,9);c.fill();};
      bar(24,b.me/100,b.me>35?C.good:C.bad,false);bar(576,b.opp/b.oppMax,C.hot,true);
      text(c,`YOU  ${Math.ceil(b.me)} HP`,24,32,'15px '+DISP,C.ink);text(c,`${b.T.name.toUpperCase()}  ${Math.ceil(b.opp)} HP`,936,32,'15px '+DISP,C.ink,'right');
      const tags=[`react ${fmt(this.reactNow(),3)} s`,b.T.armor?`armor ${fmt(b.T.armor,0)} N`:'no armor',`punch ${b.T.vo} m/s`].join('  ·  ');text(c,tags,936,76,'600 11px '+MONO,C.muted,'right');
      if(b.stun>0){const w=200*b.stun/b.stunMax;c.fillStyle='rgba(185,162,255,0.25)';rr(c,736,86,200,8,4);c.fill();c.fillStyle=C.violet;rr(c,936-w,86,w,8,4);c.fill();text(c,`STUNNED ${fmt(b.stun,2)} s: can't dodge`,936,110,'700 11px '+MONO,C.violet,'right');}
      if(b.chain.length>=2&&b.stun>0){glow(c,C.violet,14);text(c,`${b.chain.length} HIT${b.chain.length>1?'S':''}`,720,250,'28px '+DISP,C.violet,'center');c.shadowBlur=0;}
      if(this.rduck&&this.rduck.pro&&this.rduckA>0.3)text(c,'HE\u2019S DUCKING: UPPERCUT!',W/2,100,'16px '+DISP,C.yellow,'center');
      if(b.opp/b.oppMax<0.25&&!b.over)text(c,'SYSTEMS FAILING · reactions +30%',936,128,'700 11px '+MONO,C.hot,'right');
      if(b.me<25&&!b.over){const a=0.25+0.2*Math.sin(this.bob*6);const vg=c.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.85);vg.addColorStop(0,'rgba(255,40,60,0)');vg.addColorStop(1,`rgba(255,40,60,${a})`);c.fillStyle=vg;c.fillRect(0,0,W,H);}
      text(c,this.blocking?'GUARD UP':this.duckA>0.1?`DUCKING ${fmt(this.duckA*DUCK_H,2)} m`:'◀ block  ·  ▼ duck',24,76,'600 11px '+MONO,this.blocking||this.duckA>0.1?C.xray:C.muted);
      if(this.state==='ready'&&!b.over&&b.intro<=0)text(c,b.atk.ph==='tele'?(b.atk.low?'BODY SHOT COMING: BLOCK ◀':'HIGH PUNCH: DUCK ▼ or BLOCK ◀'):'',W/2,100,'16px '+DISP,b.atk.ph==='tele'&&b.atk.low?C.violet:C.bad,'center');}
    else{text(c,'FIGHT LAB · FREE PLAY',24,34,'15px '+DISP,C.xray);text(c,this.state==='ready'?'Tap PUNCH (or the stage) when the needle is in the green.':'',24,54,'500 13px '+BODY,C.muted);}
  },
  eqs(){const M=this,r=this.calc(this.curV()),live=!(this.res&&(this.state!=='ready'||this.since<3)),b=this.bout;
    const base=[
      eqLine(`Momentum (${this.TYPES[this.opt.type].name.toLowerCase()})`,`p = ${T(M,'m')} · ${T(M,'v')}`,`= ${N(M,'m',fmt(r.m,2))} kg × ${N(M,'v',fmt(r.v))} m/s = <b>${fmt(r.p)} kg·m/s</b>`),
      eqLine('Impulse → force',`${T(M,'F')} = p ÷ ${T(M,'dt')}`,`= ${fmt(r.p)} ÷ ${N(M,'dt',fmt(r.dt,3))} s = <b class="hot">${fmt(r.F,0)} N</b>`),
      eqLine('Pressure',`P = ${T(M,'F')} ÷ ${T(M,'A')}`,`= ${fmt(r.F,0)} ÷ ${N(M,'A',fmt(r.A,4))} m² = <b>${fmt(r.P,0)} kPa</b>`),
      eqLine('Energy',`KE = ½ · ${T(M,'m')} · ${T(M,'v')}²`,`= ½ × ${N(M,'m',fmt(r.m,2))} × ${N(M,'v',fmt(r.v))}² = <b>${fmt(r.KE,0)} J</b>`),
      eqLine('Mass vs speed',`${T(M,'v')} = v_timing × √(2.8 ÷ ${T(M,'m')})`,`${this.TYPES[this.opt.type].name}: m = ${fmt(this.TYPES[this.opt.type].k*100,0)}% × ${fmt(this.V.m)} = ${N(M,'m',fmt(r.m,2))} kg → speed × ${fmt(Math.sqrt(2.8/r.m),2)}`)];
    const note=`<p class="note">${live?`<span style="color:${C.good}">v</span> is live from the timing needle.`:`<span style="color:${C.good}">v</span> = ${fmt(r.v)} m/s from your last punch.`}</p>`;
    if(!b)return{lines:base,note};
    const T0=b.T,t=REACH/r.v,inc=this.incoming(),d=this.dmgOf(r.F);
    return{lines:[
      eqLine('Beat his reaction time',`t = 0.6 m ÷ ${T(M,'v')}`,`= 0.6 ÷ ${N(M,'v',fmt(r.v))} = <b>${fmt(t,3)} s</b> vs Rex ${fmt(this.reactNow(),3)} s  ${t<this.reactNow()?'<span class="ok">lands</span>':'<span class="no">too slow: dodged</span>'}`),
      eqLine(T0.armor?'Crack his armor':'Damage per hit',`${T(M,'F')} = ${T(M,'m')} · ${T(M,'v')} ÷ ${T(M,'dt')}`,`= <b class="hot">${fmt(r.F,0)} N</b>  ${T0.armor?(r.F>=T0.armor?`<span class="ok">≥ ${fmt(T0.armor,0)}: −${Math.round(d)} HP</span>`:`<span class="no">under ${fmt(T0.armor,0)} N: bounces off</span>`):`→ −${Math.round(d)} HP`}`),
      eqLine('His punch on you',`F_Rex = ${OPPM} kg × ${T0.vo} m/s ÷ ${T(M,'dt')}`,`= <b>${fmt(inc.F,0)} N</b> → −${Math.round(inc.d)} HP  (blocked: −${Math.round(inc.d*0.2)})`),
      eqLine('Combo window (stun)',`v_head = p ÷ 4.5 kg&emsp;→&emsp;t_stun = v_head ÷ ${A_NECK} m/s²`,`= (${fmt(r.p)} ÷ 4.5) ÷ ${A_NECK} = <b>${fmt(clamp(r.p/4.5/A_NECK,0.35,1.1),2)} s</b> to land your next punch. More momentum = longer stun.`),
      eqLine('Duck under a high punch',`h = ½ · g · t²&emsp;→&emsp;t = √(2h ÷ g)`,`clear his fist by ${DUCK_CLEAR} m: t = √(2 × ${DUCK_CLEAR} ÷ 9.81) = <b>${fmt(Math.sqrt(2*DUCK_CLEAR/G0),3)} s</b>. He winds up for ${T0.tele} s, then strikes in 0.1 s.`),
      ...base],note:note+`<p class="note">Your Δt works both ways: more padding softens his punches but also softens yours.</p>`};},
  chart(c,w,h){const r=this.calc(this.curV()),p=r.p,b=this.bout,oppP=b?OPPM*b.T.vo:0;const top=Math.max(p,oppP)/0.003;const y1=niceTicks(0,top,4).slice(-1)[0]||1000;
    const f=plotFrame(c,w,h,{x0:3,x1:40,y0:0,y1,xt:[5,10,15,20,25,30,35,40],yt:niceTicks(0,y1,4),yf:t=>t>=1000?(t/1000)+'k':String(t),xl:'glove padding Δt (ms)',yl:'force (N)'});
    [[6,'bare'],[15,'glove']].forEach(([t,l])=>{c.strokeStyle='rgba(127,220,255,0.35)';c.setLineDash([3,3]);line(c,f.X(t),f.Tp,f.X(t),h-f.B);c.setLineDash([]);text(c,l,f.X(t)+3,f.Tp+10,'500 10px '+MONO,C.xray);});
    const curve=(pp,col)=>{c.strokeStyle=col;c.lineWidth=2;c.beginPath();for(let t=3;t<=40;t+=0.25){const Y=f.Y(Math.min(pp/(t/1000),y1));t===3?c.moveTo(f.X(t),Y):c.lineTo(f.X(t),Y);}c.stroke();};
    if(b&&b.T.armor){c.strokeStyle=C.muted;c.setLineDash([5,4]);line(c,f.L,f.Y(b.T.armor),w-f.R,f.Y(b.T.armor));c.setLineDash([]);text(c,'armor',w-f.R-4,f.Y(b.T.armor)-4,'700 10px '+MONO,C.muted,'right');}
    curve(p,C.hot);if(b){curve(oppP,C.violet);const X2=f.X(this.V.dt),Y2=f.Y(Math.min(oppP/(this.V.dt/1000),y1));c.fillStyle=C.violet;c.beginPath();c.arc(X2,Y2,5,0,Math.PI*2);c.fill();}
    const X=f.X(this.V.dt),Y=f.Y(Math.min(r.F,y1));c.fillStyle=C.hot;c.beginPath();c.arc(X,Y,5,0,Math.PI*2);c.fill();text(c,fmt(r.F,0)+' N',X+8,Y-6,'700 11px '+MONO,C.hot);
    return b?'Orange: your punch. Purple: Rex’s punch on you. Both drop as Δt grows, so padding is a trade-off. Dashed: his armor.':`Same momentum (${fmt(p)} kg·m/s), different stopping times. Force = p ÷ Δt, so doubling Δt halves the force.`;},
  result(){const r=this.res;return{
    title:`${r.type.name}: ${fmt(r.m)} kg at ${fmt(r.v)} m/s`,big:`${fmt(r.F,0)} N`,
    sub:`That's like ${fmt(r.F/G0,0)} kg pressing down, squeezed into ${fmt(r.dt*1000,0)} thousandths of a second.`,
    steps:[
      {h:'Fist speed',p:`Your timing hit ${Math.round(r.acc*100)}% of perfect, then mass slowed it by √(2.8 ÷ m).`,eq:`v = <em>${fmt(r.v)} m/s</em>  (${fmt(r.v*3.6,0)} km/h)`},
      {h:'Momentum',p:'Mass times velocity.',eq:`p = m·v = ${fmt(r.m)} × ${fmt(r.v)} = <em>${fmt(r.p)} kg·m/s</em>`},
      {h:'Impulse becomes force',p:`The fist stops in Δt = ${fmt(r.dt,3)} s.`,eq:`F = p / Δt = ${fmt(r.p)} / ${fmt(r.dt,3)} = <em>${fmt(r.F,0)} N</em>`},
      {h:'Pressure',p:`Spread over ${fmt(r.A*10000,0)} cm².`,eq:`P = F / A = ${fmt(r.F,0)} / ${fmt(r.A,4)} = <em>${fmt(r.P,0)} kPa</em>`},
      {h:'Compare the padding',p:'Same momentum, two different stopping times.',eq:`bare (6 ms): <em>${fmt(r.Fbare,0)} N</em>   glove (15 ms): <em>${fmt(r.Fglove,0)} N</em>`}],
    idea:`Newton's 3rd law: the target pushes back on your hand with the same ${fmt(r.F,0)} N. Padding doesn't change momentum, only how long the stop takes. That's the whole idea behind gloves, helmets and airbags.`,quiz:QUIZ.fight};}
};

/* =====================================================================
   RACE LAB
   ===================================================================== */
//<raceStep>
function racePath(x,y,P){
  if(x<P.L)return{e:-y,phi:0,kp:0,zone:0};
  if(y<P.R){const rx=x-P.L,ry=y-P.R,r=Math.hypot(rx,ry);return{e:r-P.R,phi:Math.atan2(ry,rx)+Math.PI/2,kp:1/P.R,zone:1};}
  return{e:x-(P.L+P.R),phi:Math.PI/2,kp:0,zone:2};}
function autoWheel(s,P){const pp=racePath(s.x,s.y,P);let eh=pp.phi-s.th;while(eh>Math.PI)eh-=2*Math.PI;while(eh<-Math.PI)eh+=2*Math.PI;
  const Ld=Math.max(8,0.7*s.v),kc=pp.kp+2*Math.sin(eh+Math.atan(pp.e/Ld))/Ld;return Math.max(-180,Math.min(180,P.ratio*Math.atan(kc*P.Lwb)*180/Math.PI));}
function raceStep(s,P,inp,dt){
  const G=9.81,drag=(P.F/P.m)/(P.top*P.top)*(P.rolling??1);
  const gas=typeof inp.gas==='number'?Math.max(0,Math.min(1,inp.gas)):inp.gas?1:0,brake=typeof inp.brake==='number'?Math.max(0,Math.min(1,inp.brake)):inp.brake?1:0;
  const rawWheel=inp.auto?autoWheel(s,P):inp.wheel,garage=globalThis.KickLabRaceGarage,tune=garage?garage.response(s,P,rawWheel,brake,dt):{wheel:rawWheel,muFactor:1,brakeFactor:1},mu=P.mu*tune.muFactor;
  let a;if(brake)a=-0.95*mu*G*brake*tune.brakeFactor;else if(gas)a=Math.min(P.F/P.m,mu*G)*gas;else a=-0.5*(P.rolling??1);
  a-=drag*s.v*s.v;s.v=Math.max(0,s.v+a*dt);
  const wheel=tune.wheel;s.wheel=wheel;
  const d=wheel/P.ratio*Math.PI/180,kc=Math.tan(d)/P.Lwb,kmax=mu*G*(P.stability??1)/Math.max(s.v*s.v,0.01),k=Math.max(-kmax,Math.min(kmax,kc));
  s.slide=Math.abs(kc)>kmax&&s.v>1.5;
  s.th+=s.v*k*dt;s.x+=s.v*Math.cos(s.th)*dt;s.y+=s.v*Math.sin(s.th)*dt;s.t+=dt;
  const pp=racePath(s.x,s.y,P);s.e=pp.e;s.zone=pp.zone;s.k=k;s.kc=kc;s.alat=s.v*s.v*Math.abs(k);s.need=s.v*s.v*Math.abs(kc);s.muEffective=mu;if(garage)garage.afterStep(s,P);return s;}
//</raceStep>
