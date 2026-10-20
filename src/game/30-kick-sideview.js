const Kick={
  key:'kick',
  opt:{shot:'free',pred:'on',move:'step',foot:'in',fin:'drive',pso:'run',duel:'duel',air:'auto',stad:'home',pitch:'grass',wx:'calm',pl:'you',strike:'mid',temp:'mild',gfx:best.gfx||'3d'},
  V:{v:22,th:17,g:9.81,spin:0,thH:8,run:6,grip:0.8,curl:6,vs:24,jv:3.0,pv:13,gkr:0.3,gka:22},
  COL:{v:['v',C.good],th:['θ',C.pink],thH:['θ',C.pink],g:['g',C.xray],spin:['a_s',C.violet],vx:['vx',C.xray],vy:['vy',C.violet],run:['v_run',C.good],grip:['μ',C.xray],curl:['ω',C.violet],vs:['v_shot',C.hot],jv:['v₀',C.good],pv:['v_pass',C.good]},
  D:21,WX:9.15,WH:1.85,BAR:2.44,BR:0.11,M:0.43,S:27,OX:212,OY:470,DT_KICK:0.009,DT_HEAD:0.012,HX:10.0,
  hint:'Get both checks green, then kick',
  LIVE(){return this.opt.shot==='free'?[2,3]:[2,4];},
  sx(x){return this.OX+x*this.S;},sy(y){return this.OY-y*this.S;},
  groups(){return[
    {id:'shot',label:'Game',choices:[['free','Free kick','21 m out, wall at 9.15 m'],['header','Header','cross from behind'],['dribble','Dribble','feint past a defender']]},
    {id:'pl',label:'Your player',choices:Object.entries(PLAYERS).map(([k,P])=>[k,P.n,P.d])},
    {id:'stad',label:'Stadium',choices:Object.entries(STADIUMS).map(([k,S])=>[k,S.n,S.d])},
    {id:'pitch',label:'Pitch',choices:Object.entries(PITCHES).map(([k,P])=>[k,P.n,P.d])},
    {id:'wx',label:'Weather',choices:Object.entries(WEATHER).map(([k,X])=>[k,X.n,X.d])},
    ...(this.opt.shot==='dribble'?[{id:'gfx',label:'Graphics',choices:[['3d','3D stadium',V3.failed?'not available here'+(V3.err?` (${V3.err})`:''):V3.ready?'lights, shadows, crowd':'loading…',V3.failed?'3D graphics could not start on this device, so the classic view is on.':null],['2d','Classic','lighter, runs anywhere']]}]:[]),
    {id:'temp',label:'Temperature',choices:Object.entries(TEMPS).map(([k,T])=>[k,T.n,T.d])},
    {id:'air',label:'Air',choices:[['auto','Auto','air turns on at higher levels'],['off','No air','vacuum: only ½·g·t²'],['on','Air drag','F = ½·ρ·C_d·A·v²']]},
    ...(this.opt.shot==='header'?[{id:'duel',label:'Opponent',choices:[['duel','Header duel','race a defender to the ball'],['solo','Solo','nobody marking you']]}]:[]),
    ...(this.opt.shot==='dribble'?Drib.moveGroups():[{id:'pred',label:'Predicted path on field',choices:[['on','Show','practice'],['off','Hide','challenge']]}])];},
  vars(){const hdr=this.opt.shot==='header';const g={id:'g',sym:'g',name:'gravity',unit:'m/s²',min:1.6,max:25,step:0.01,d:2,col:C.xray,pre:[[1.62,'Moon'],[3.71,'Mars'],[9.81,'Earth'],[24.79,'Jupiter']]};
    if(hdr)return[{id:'thH',sym:'θ',name:'header direction',unit:'°',min:-10,max:35,step:1,d:0,col:C.pink},{id:'jv',sym:'v₀',name:'jump take-off speed',unit:'m/s',min:2,max:3.8,step:0.1,d:1,col:C.good,pre:[[2.4,'hop'],[3.0,'leap'],[3.5,'max']]},g];
    return[{id:'v',sym:'v',name:'launch speed',unit:'m/s',min:8,max:35,step:0.5,d:1,col:C.xray,pre:[[15,'pass'],[22,'free kick'],[30,'rocket']]},
      {id:'th',sym:'θ',name:'launch angle',unit:'°',min:3,max:45,step:1,d:0,col:C.pink},g,
      {id:'spin',sym:'a_s',name:'spin (Magnus push, + = topspin dips)',unit:'m/s²',min:-3,max:3,step:0.1,d:1,col:C.violet,pre:[[-2,'backspin'],[0,'none'],[2.5,'topspin']]}];},
  actions(){if(dialMode()==='quick'){const icon=this.opt.shot!=='header'?'kick':this.state==='incoming'?'head':'crossin';return[...quickTuneActions(),{id:'go',label:this.label(),aria:this.label()+' (Space)',icon,color:'#ff8a1f',key:'SPACE',big:true,primary:true,pulse:this.state==='done'||this.state==='incoming'}];}
    const hdr=this.opt.shot==='header',th=hdr?'thH':'th',L=[{id:'th+',dir:'up',tag:'θ',aria:'raise angle',step:[th,1]},{id:'th-',dir:'down',tag:'θ',aria:'lower angle',step:[th,-1]}];
    if(!hdr)L.push({id:'v-',dir:'left',tag:'v',aria:'less speed',step:['v',-0.5]},{id:'v+',dir:'right',tag:'v',aria:'more speed',step:['v',0.5]});
    const icon=!hdr?'kick':this.state==='incoming'?'head':'crossin';
    return[...L,{id:'go',label:this.label(),aria:this.label()+' (Space)',icon,color:'#ff8a1f',key:'SPACE',big:true,primary:true,pulse:this.state==='done'||this.state==='incoming'}];},
  label(){if(this._dm!==dialMode()){this._dm=dialMode();setTimeout(renderActions,0);}if(this.opt.shot==='free')return this.state==='done'?'Next shot':'Kick';return this.state==='done'?'Next ball':this.state==='incoming'?'Head it!':'Cross it in';},
  locked(){return this.state!=='aim'&&this.state!=='done';},
  g(){return this.V.g;},gEff(){return this.V.g+(this.opt.shot==='free'?this.V.spin:0);},
  reset(){if(this.opt.shot==='header'){this.S=46;this.OX=-170;}else{this.S=27;this.OX=212;}this.wallLog=false;this.lineY=null;const ch=curCh('kick'),env=(ch&&ch.env)||{};this.WH=env.wh||1.85;this.wind=env.wind||0;this.keeper=env.keeper||0;hideResults();this.netT=null;this.lastK=null;this.state='aim';this.phi=-1.0;this.contact=false;this.contactT=0;this.slowed=false;this.ball={x:this.opt.shot==='free'?0:-3,y:this.BR,vx:0,vy:0,rot:0};
    this.ghost=this.lastTrail||[];this.trail=[];this.apex=null;this.outcome=null;this.endT=0;this.res=null;this.flightT=0;this.tapped=false;this.jumpT=-1;this.v=0;this.q=null;setLabel();},
  hip(){return{x:-0.38,y:0.93};},
  foot(){const h=this.hip(),L=0.86;return{x:h.x+Math.sin(this.phi)*L,y:h.y-Math.cos(this.phi)*L};},
  press(id,down){if(!down)return;
    if(this.opt.shot==='free'){if(this.state==='aim'){const pr=this.freeCalc(this.V.v,this.V.th);this.predOK=pr.clear&&pr.under;this.blind=this.opt.pred==='off';this.v=this.V.v;this._gt=0;this._gph=Math.random()*6.28;this.state='swing';this.phi=-1.0;startRec('kick',`Free kick · v ${fmt(this.V.v)} · θ ${this.V.th}°`);RECS.kick.meta={pred:pr};}else if(this.state==='done')this.reset();}
    else{if(this.state==='aim')this.startCross();else if(this.state==='incoming'&&!this.tapped)this.tap();else if(this.state==='done')this.reset();}
    setLabel();},
  jumpH(v0,tau){const g=this.V.g;return tau<=0?0:Math.max(0,v0*tau-0.5*g*tau*tau);},
  duelT(){return Math.min(best.duelW||0,DEFS.length-1);},
  headPos(){const j=this.jumpT>=0?this.jumpH(this.V.jv,this.jumpT):0;return{x:this.HX+0.12,y:PLY().h-0.12+j};},
  crossVin(){const T0=1.5,S={x:-1,y:0.3},Hp={x:this.HX+0.36,y:2.3},g=this.g();return{T0,S,Hp,v0:{x:(Hp.x-S.x)/T0,y:(Hp.y-S.y+0.5*g*T0*T0)/T0},vin:{x:(Hp.x-S.x)/T0,y:(Hp.y-S.y+0.5*g*T0*T0)/T0-g*T0}};},
  startCross(){hideResults();startRec('kick','Header');RECS.kick.meta={};logMove('kick',{who:'sys',kind:'cross',title:'Cross whipped in',math:`g = ${fmt(this.V.g,2)} m/s²`,tone:'info'});this.blind=this.opt.pred==='off';this.predOK=false;this.state='incoming';this.inT=0;const cr=this.crossVin();this.cr=cr;this.duel=null;
    if(this.opt.duel==='duel'){const i=this.duelT(),T=DEFS[i],v0=[2.6,2.8,2.95,3.05,3.25][i],stand=[1.78,1.80,1.84,1.92,1.86][i],err=(Math.random()*2-1)*[0.14,0.1,0.07,0.05,0.03][i],tD=cr.T0-v0/this.V.g+err;
      this.duel={i,name:T.name,col:T.col,v0,stand,tD,err,won:null};logMove('kick',{who:'rex',wl:'DEF',kind:'mark',title:`${T.name} marks you`,res:`v₀ ${v0} m/s`,math:`his peak h_max = v₀²÷2g = ${fmt(v0*v0/(2*this.V.g),2)} m → head reaches ${fmt(stand+v0*v0/(2*this.V.g),2)} m · ball arrives at 2.30 m`,tone:'info'});}this.ball={x:cr.S.x,y:cr.S.y,vx:cr.v0.x,vy:cr.v0.y,rot:0};},
  hisTop(t){const D=this.duel;return D?D.stand+this.jumpH(D.v0,t-D.tD):0;},
  tap(){this.tapped=true;this.jumpT=0;const g=this.V.g,cr=this.cr,ideal=cr.T0-this.V.jv/g,e=this.inT-ideal;this.tapErr=e;
    const top=PLY().h+this.jumpH(this.V.jv,cr.T0-this.inT),reach=top>=cr.Hp.y-0.1,his=this.duel?this.hisTop(cr.T0):0;this.myTop=top;
    if(this.duel){this.duel.won=reach&&top>=his;this.duel.my=top;this.duel.his=his;}
    if(reach&&this.inT<cr.T0&&(!this.duel||this.duel.won)){this.q=clamp(1-Math.abs(e)/0.25,0.15,1);this.good=true;startSlow({focus:{x:this.sx(cr.Hp.x-0.15),y:this.sy(cr.Hp.y)},zoom:2.4,dur:2.2,min:0.06});}
    else{this.good=false;if(this.duel&&his>=cr.Hp.y-0.1)startSlow({focus:{x:this.sx(cr.Hp.x),y:this.sy(cr.Hp.y)},zoom:2.2,dur:1.6,min:0.08});}
    if(this.duel)logMove('kick',{who:'you',kind:'jump',title:`You jump · peak ${fmt(1.80+this.V.jv*this.V.jv/(2*g),2)} m`,res:this.duel.won?'you win it':reach?'he gets higher':"can't reach",math:`at contact your head is at ${fmt(top,2)} m vs his ${fmt(his,2)} m · ideal take-off = T − v₀÷g = ${fmt(ideal,2)} s, you went ${e<0?fmt(-e,2)+' s early':fmt(e,2)+' s late'}`,tone:this.duel.won?'good':'bad'});},
  launch(vx,vy){const b=this.ball;b.vx=vx;b.vy=vy;this.state='flight';this.flightT=0;this.trail=[];this.apex=null;},
  headerCalc(q){const cr=this.crossVin(),vin=cr.vin,vinM=Math.hypot(vin.x,vin.y),vHead=2+4.5*q,vout=0.35*vinM+1.8*vHead,th=this.V.thH*DEG;
    const vo={x:vout*Math.cos(th),y:vout*Math.sin(th)},dv={x:vo.x-vin.x,y:vo.y-vin.y},dvM=Math.hypot(dv.x,dv.y),d=this.D-cr.Hp.x,t=d/vo.x,g=this.g(),yg=cr.Hp.y+vo.y*t-0.5*g*t*t;
    return{kind:'header',vin,vinM,vHead,vout,vo,dv,dvM,F:this.M*dvM/this.DT_HEAD,d,t,yg,th:this.V.thH,q,g,Hp:cr.Hp};},
  tAt(x,vx,w){return GAME_CORE.timeAtDistance(x,vx,w);},
  freeCalcBase(v,thDeg,spin,vx,vy,ga,h0,tw,yw,tg,yg,tp,hp,w,WH,kp){const clear=yw>WH+this.BR,under=yg<this.BAR-this.BR&&yg>Math.max(this.BR,kp+this.BR);return{kind:'free',v,th:thDeg,vx,vy,ga,h0,tw,yw,tg,yg,tp,hp,F:this.M*v/this.DT_KICK,clear,under,g:this.V.g,spin,w,WH,kp};},
  freeCalc(v,thDeg,spin,g){if(spin===undefined)spin=this.V.spin;const gravity=g===undefined?this.V.g:g,h0=this.BR,w=this.wind||0,WH=this.WH||1.85,kp=this.keeper||0;
    const core=GAME_CORE.calculateFreeKick({speed:v,angleDegrees:thDeg,gravity,spinAcceleration:spin,startHeight:h0,horizontalAcceleration:w,wallDistance:this.WX,goalDistance:this.D,wallHeight:WH,crossbarHeight:this.BAR,ballRadius:this.BR,keeperReach:kp,ballMass:this.M,contactSeconds:this.DT_KICK});
    const vx=core.horizontalVelocity,vy=core.verticalVelocity,ga=core.effectiveGravity,tw=core.wallTime,yw=core.wallY,tg=core.goalTime,yg=core.goalY,tp=core.peakTime,hp=core.peakHeight;
    let air=null;const kd=dragK();if(kd){let x=0,y=h0,ux=vx,uy=vy,t=0,ywA=-1,ygA=-1,twA=Infinity,tgA=Infinity,hpA=h0,vW=0,vG=0;const dt=0.004;
      while(t<8&&y>=0&&x<this.D+0.5){const sp=Math.hypot(ux,uy),px=x,py=y;ux-=kd*sp*ux*dt;uy-=kd*sp*uy*dt;uy-=ga*dt;if(w)ux+=w*dt;x+=ux*dt;y+=uy*dt;t+=dt;hpA=Math.max(hpA,y);
        if(px<this.WX&&x>=this.WX){ywA=py+(y-py)*(this.WX-px)/(x-px);twA=t;vW=Math.hypot(ux,uy);}if(px<this.D&&x>=this.D){ygA=py+(y-py)*(this.D-px)/(x-px);tgA=t;vG=Math.hypot(ux,uy);}if(ux<=0)break;}
      air={k:kd,yw0:yw,yg0:yg,vW,vG,aD:kd*v*v};return Object.assign(this.freeCalcBase(v,thDeg,spin,vx,vy,ga,h0,twA,ywA,tgA,ygA,tp,hpA,w,WH,kp),{air});}
    return this.freeCalcBase(v,thDeg,spin,vx,vy,ga,h0,tw,yw,tg,yg,tp,hp,w,WH,kp);},
  suggest(){const V=this.V,o={};
    if(this.opt.shot==='header'){const pass=[];const save=V.thH;for(let th=-10;th<=35;th++){V.thH=th;const r=this.headerCalc(1);if(r.yg<this.BAR-this.BR&&r.yg>this.BR)pass.push(th);}V.thH=save;
      const w=runsPick(pass,V.thH,1);o.thH=w?{lo:w.lo,hi:w.hi,note:`${w.lo}°–${w.hi}° puts a well-timed header under the bar.`}:{note:'no angle scores with this gravity; try a different g.',dir:'change g first.'};return o;}
    const ok=(v,th,sp,g)=>{const r=this.freeCalc(v,th,sp,g);return r.clear&&r.under;},sc=(a,b,st,f)=>{const out=[];for(let x=a;x<=b+1e-9;x+=st){const xr=Math.round(x*100)/100;if(f(xr))out.push(xr);}return out;};
    const th=runsPick(sc(3,45,1,t=>ok(V.v,t,V.spin)),V.th,1);o.th=th?{lo:th.lo,hi:th.hi,note:`${th.lo}°–${th.hi}° scores at v = ${fmt(V.v)} m/s${V.spin?` and a_s = ${fmt(V.spin,1)}`:''}.`}:{note:'no angle works at this v and spin. Move v or spin first.',dir:'fix v or spin first.'};
    const v=runsPick(sc(8,35,0.5,x=>ok(x,V.th,V.spin)),V.v,0.5);o.v=v?{lo:v.lo,hi:v.hi,note:`${fmt(v.lo)}–${fmt(v.hi)} m/s scores at θ = ${V.th}°.`}:{note:`no speed works at θ = ${V.th}°. Change the angle first.`,dir:'change θ first.'};
    const sp=runsPick(sc(-3,3,0.1,x=>ok(V.v,V.th,x)),V.spin,0.1);o.spin={lo:sp?sp.lo:null,hi:sp?sp.hi:null,note:sp?`${fmt(sp.lo,1)} to ${fmt(sp.hi,1)} m/s². Topspin (+) pulls it down late; backspin (−) floats it.`:'no spin saves this v and θ.',dir:sp?'':'spin alone won\u2019t fix it.'};
    const g=runsPick(sc(1.6,25,0.1,x=>ok(V.v,V.th,V.spin,x)),V.g,0.1);o.g={lo:g?g.lo:null,hi:g?g.hi:null,note:g?`g from ${fmt(g.lo,1)} to ${fmt(g.hi,1)} m/s² makes this exact kick score.`:'no planet makes this kick score.',dir:''};return o;},
  snap(){return{ball:{...this.ball},phi:this.phi,state:this.state,contact:this.contact,trailN:this.trail.length,apex:this.apex?{...this.apex}:null,outcome:this.outcome,jumpT:this.jumpT,netT:this.netT,cheerT:this.cheerT,endT:this.endT,flightT:this.flightT,res:this.res,cr:this.cr,q:this.q,inT:this.inT};},
  applySnap(o,r){Object.assign(this,{ball:{...o.ball},phi:o.phi,state:o.state,contact:o.contact,apex:o.apex?{...o.apex}:null,outcome:o.outcome,jumpT:o.jumpT,netT:o.netT,cheerT:o.cheerT,endT:o.endT,flightT:o.flightT,res:o.res,cr:o.cr,q:o.q,inT:o.inT});this.trail=(r.trail||this.trail).slice(0,o.trailN);if(r.ghost)this.ghost=r.ghost;},
  review(r){const mv=r.moves,K=k=>mv.filter(x=>x.kind===k),kk=K('kick')[0],hd=K('head')[0],w=K('wall')[0],ap=K('apex')[0],out=K('out')[0],best=[],work=[],plan=[];
    if(kk&&kk.ok)best.push({score:3,t:kk.t,text:'Solved it before kicking: both checks green',math:kk.math});
    if(w)best.push({score:2,t:w.t,text:`Cleared the wall by ${fmt((w.y-(this.WH+this.BR))*100,0)} cm`,math:w.math});
    if(out&&out.o==='goal')best.push({score:4,t:out.t,text:`Goal at ${fmt(out.y,2)} m`,math:out.math});
    if(hd&&hd.q>0.85)best.push({score:3,t:hd.t,text:hd.title,math:hd.math});
    if(out&&out.o!=='goal'){const tip=out.o==='wall'?'Raise θ a degree or two, or add v.':out.o==='over'||out.o==='bar'?'Lower θ or v, or add topspin so it dips late.':out.o==='saved'?`Aim between ${fmt(this.keeper+this.BR,2)} and ${fmt(this.BAR-this.BR,2)} m at the line.`:out.o==='mistimed'?'Tap when the ball is one ball-width from your head.':'More v.';work.push({score:5,t:out.t,text:out.title+(out.res?` (${out.res})`:''),math:out.math,tip});}
    if(kk&&!kk.ok)work.push({score:4,t:kk.t,text:'Kicked with a red check in Live Math',math:kk.math,tip:'Get both checks green first: the equations predicted this.'});
    if(kk&&out&&out.o!=='goal')plan.push(this.kickSolve());
    if(kk&&out&&out.o==='goal'&&this.opt.pred==='on')plan.push('Now hide the predicted path and score from the math alone (+200 XP).');
    if(!plan.length)plan.push('Try Mars or the Moon: same equations, different g.');
    return{title:r.title,noun:'shot',stats:kk?[['Launch',`${fmt(kk.v)} m/s at ${kk.th}°`],['At the wall',fmt(kk.yw,2)+' m'],['At the line',fmt(kk.yg,2)+' m'],['Top of flight',ap?fmt(ap.y,2)+' m':'—'],['Result',out?out.title:'—']]:[['Header',hd?hd.res:'—'],['Result',out?out.title:'—']],best:topN(best,3),work:topN(work,3),plan};},
  kickSolve(){const V=this.V,ok=(v,th,sp)=>{const r=this.freeCalc(v,th,sp);return r.clear&&r.under;},range=(v,sp)=>{const a=[];for(let th=3;th<=45;th++)if(ok(v,th,sp))a.push(th);return a;};
    let a=range(V.v,V.spin);if(a.length)return `The math says: at v = ${fmt(V.v)} m/s${V.spin?` with a_s = ${fmt(V.spin,1)}`:''}, any θ from ${a[0]}° to ${a[a.length-1]}° goes in. Drag θ into that window.`;
    if(!isLocked('kick','spin'))for(const sp of [2.5,1.5,3,1,-1,-2]){a=range(V.v,sp);if(a.length)return `No angle works at v = ${fmt(V.v)} m/s with your spin. Set spin a_s to ${fmt(sp,1)}: then θ from ${a[0]}° to ${a[a.length-1]}° scores.`;}
    if(!isLocked('kick','v')){let bestV=null;for(let d=0;d<=27&&!bestV;d+=0.5)for(const v of [V.v+d,V.v-d])if(v>=8&&v<=35&&!bestV){const r=range(v,V.spin);if(r.length)bestV=[v,r];}
      if(bestV)return `Change v to about ${fmt(bestV[0])} m/s: then θ from ${bestV[1][0]}° to ${bestV[1][bestV[1].length-1]}° scores.`;}
    return 'Try topspin (a_s > 0) with a steeper angle. It lets the ball climb over the wall and still drop late.';},
  update(dt,rdt){
    if(this.netT!=null)this.netT+=dt;if(this.cheerT>0)this.cheerT-=rdt;
    if(this.jumpT>=0)this.jumpT+=dt;
    if(this.state==='swing'){this.phi+=dt*(this.contact?1.5:13);
      if(!this.slowed&&this.phi>-0.5){this.slowed=true;startSlow({focus:{x:this.sx(0.05),y:this.sy(0.45)},zoom:2.4,dur:2.3,min:0.06});}
      if(!this.contact&&this.phi>=0.33){this.contact=true;this.contactT=0;sfx(this.v/32,1.4);burst(PARTS,this.sx(0),this.sy(0.02),16,{dir:-Math.PI/2-0.4,spread:1.4,sp:[60,200],g:600,life:0.8,size:2.2,kind:'drop',col:['#2d7a4f','#3f9a63','#8fd4a3']});}
      if(this.contact){this.contactT+=dt;if(this.contactT>=this.DT_KICK){this.res=this.freeCalc(this.v,this.V.th);this.launch(this.res.vx,this.res.vy);{const r=this.res;logMove('kick',{who:'you',kind:'kick',v:r.v,th:r.th,yw:r.yw,yg:r.yg,ok:r.clear&&r.under,title:`Kick ${fmt(r.v)} m/s at ${r.th}°`,res:`${fmt(r.F,0)} N`,math:`vx = ${fmt(r.vx,2)} · vy = ${fmt(r.vy,2)} · predicts ${fmt(r.yw,2)} m at wall, ${fmt(r.yg,2)} m at line`,tone:r.clear&&r.under?'good':'info'});}}}}
    else if(this.state==='incoming'){this.inT+=dt;const b=this.ball,t=this.inT,cr=this.cr,g=this.g();
      if(this.good&&t>=cr.T0){b.x=cr.Hp.x;b.y=cr.Hp.y;this.state='heading';this.contactT=0;sfx(0.6,1.5);if(this.duel)badgeAir(this);}
      else if(this.duel&&!this.good&&t>=cr.T0&&this.hisTop(cr.T0)>=cr.Hp.y-0.1&&!this.outcome){const D=this.duel;b.x=cr.Hp.x;b.y=cr.Hp.y;sfx(0.5,1.2);this.launch(-7,5.5);D.won=false;D.his=this.hisTop(cr.T0);
        logMove('kick',{who:'rex',wl:'DEF',kind:'clear',title:`${D.name} wins the header`,res:`${fmt(D.his,2)} m`,math:`his head ${fmt(D.his,2)} m vs yours ${this.myTop?fmt(this.myTop,2):fmt(1.8+(this.jumpT>=0?this.jumpH(this.V.jv,this.jumpT):0),2)} m at the moment the ball arrived`,tone:'bad'});this.setOutcome('cleared');}
      else{b.x=cr.S.x+cr.v0.x*t;b.y=cr.S.y+cr.v0.y*t-0.5*g*t*t;b.vx=cr.v0.x;b.vy=cr.v0.y-g*t;b.rot+=b.vx*dt/this.BR;
        if(t>cr.T0+0.12&&!this.good){this.state='flight';this.flightT=0;this.trail=[];if(!this.outcome)this.setOutcome(this.tapped?'mistimed':'noheader');}}}
    else if(this.state==='heading'){this.contactT+=dt;if(this.contactT>=this.DT_HEAD){this.res=this.headerCalc(this.q);this.launch(this.res.vo.x,this.res.vo.y);{const r=this.res;logMove('kick',{who:'you',kind:'head',q:this.q,title:`Header · timing ${Math.round(this.q*100)}%`,res:`${fmt(r.F,0)} N`,math:`|Δv| = ${fmt(r.dvM)} m/s → v_out ${fmt(r.vout)} at ${r.th}°`,tone:'good'});}}}
    if(this.state==='flight'||this.state==='done'){this.flightT+=dt;const n=Math.max(1,Math.ceil(dt/0.004)),h=dt/n;for(let i=0;i<n;i++)this.stepBall(h);
      const lt=this.trail[this.trail.length-1];if(!lt||Math.hypot(this.ball.x-lt.x,this.ball.y-lt.y)>0.35)this.trail.push({x:this.ball.x,y:this.ball.y});
      if(!this.outcome&&(this.flightT>8||(Math.abs(this.ball.vx)<0.4&&this.ball.y<=this.BR+0.001)||this.ball.x<-4))this.setOutcome('short');
      if(this.outcome&&this.state==='flight'){this.endT+=rdt;if(this.endT>1.0){this.state='done';this.lastTrail=this.trail.slice();setLabel();stopRec('kick');}}}
    if(this.phi>0.33&&this.state!=='swing'&&this.phi<1.1)this.phi+=dt*6;},
  setOutcome(o){this.outcome=o;this.endT=0;{const L={goal:'GOAL!',wall:'Blocked by the wall',bar:'Hit the crossbar',over:'Over the bar',short:'Ran out of steam',saved:'Keeper saves',mistimed:'Mistimed header',noheader:'Missed the header',cleared:'Defender won the header'};
    logMove('kick',{who:'sys',kind:'out',o,y:this.lineY,title:L[o]||o,res:this.lineY!=null&&['goal','bar','over','saved'].includes(o)?`${fmt(this.lineY,2)} m`:'',math:['goal','bar','over','saved'].includes(o)?`at the goal line (bar 2.44 m${this.keeper?`, keeper ${fmt(this.keeper,1)} m`:''})`:'',tone:o==='goal'?'good':'bad'});}if(o==='goal'){best.goals=(best.goals||0)+1;saveBest();sfx(0.5,2);}if(o==='bar'||o==='wall')sfx(0.5,1.8);
    if(!this.res&&(o==='mistimed'||o==='noheader'))this.res={kind:'miss',err:this.tapErr,tapped:this.tapped};
    notebook(this.result());this.game(o);},
  game(o){const free=this.opt.shot==='free',r=this.res,off=Math.abs(this.V.g-G0)>1;
    if(o==='goal'){const items=[['GOAL',250]];const bins=this.lineY>=1.9;if(bins)items.push(['TOP BINS',150]);if(this.blind)items.push(['blindfold',200]);if(off)items.push(['off-world',100]);
      if(!free){items.push(['header',100]);if(this.q>0.85)items.push(['perfect timing',100]);}
      const gr=(bins&&this.blind)||(!free&&this.q>0.85&&bins)?'S':(bins||this.blind||off||(!free&&this.q>0.85))?'A':'B';
      const chk=free?curCh('kick'):null,ci=best.ch.kick;if(chk)items.push([`CHALLENGE ${ci+1} CLEARED`,chXP(ci)]);
      award('kick',items,true,{grade:gr,title:bins?'TOP BINS!':'GOAL!',sub:free&&r&&r.kind==='free'?`${fmt(r.v)} m/s at ${r.th}° · ${fmt(this.lineY,2)} m at the line`:'Header goal',hint:'Tap for the next shot',delay:500});
      if(chk)completeCh('kick');this.netT=0;this.cheerT=2.5;setTimeout(()=>{energizeControlledPlayer('goal',1700);SND.goal();},250);if(free)badge('k_goal');if(free&&this.predOK)badge('k_math');if(this.blind)badge('k_blind');if(off)badge('k_space');if(!free)badge('k_header');if(bins)badge('k_bins');
      COACH.say(free&&r&&r.kind==='free'?`GOAL! The math said ${fmt(r.yw,2)} m at the wall and ${fmt(r.yg,2)} m at the line, and the ball agreed.`+(this.blind?' Scored blind, too!':' Now hide the predicted path and do it from the math alone: +200.'):`GOAL! That header left at ${r&&r.vout?fmt(r.vout):'?'} m/s.`+(this.q>0.85?' Timing was spot on.':' Tighter timing means a faster head and more Δv.'),'hype',10);return;}
    award('kick',[['attempt',10]],false,{grade:o==='bar'?'C':'D',title:{saved:'SAVED!',wall:'BLOCKED',over:'OVER THE BAR',bar:'CROSSBAR!',short:'NO GOAL',mistimed:'MISTIMED',noheader:'MISSED IT',cleared:'HE WON IT'}[o]||'NO GOAL',sub:r&&r.kind==='free'?`${fmt(r.yw,2)} m at the wall · ${fmt(r.yg,2)} m at the line`:'',hint:'Tap for the next shot',delay:500});
    if(o==='cleared'||(this.duel&&(o==='mistimed'||o==='noheader'))){const D=this.duel,g=this.V.g,need=(D?Math.max(D.his||0,2.2):2.2)-1.8,v0n=Math.sqrt(2*g*Math.max(0.05,need+0.02));
      COACH.say(o==='cleared'?`${D.name}'s head reached ${fmt(D.his,2)} m. To get above him you need h = v₀²÷2g ≥ ${fmt(need,2)} m, so v₀ ≥ √(2g·h) = ${fmt(v0n,2)} m/s, and take off at T − v₀÷g so you peak as the ball arrives.`:`You didn't reach it. Peak height = v₀²÷2g = ${fmt(this.V.jv*this.V.jv/(2*g),2)} m: take off v₀÷g = ${fmt(this.V.jv/g,2)} s before the ball arrives.`,'warn',12);return;}
    if(o==='mistimed'||o==='noheader'){COACH.say(o==='noheader'?'Tap HEAD IT as the ball drops in. You have about ±0.2 s.':(this.tapErr<0?`Early by ${fmt(-this.tapErr*1000,0)} ms. Wait until the ball is a ball-width away.`:`Late by ${fmt(this.tapErr*1000,0)} ms. The ball was already past you.`),'warn',9);return;}
    if(!r||r.kind!=='free'){COACH.say({over:'Over the bar. Point θ lower.',bar:'Crossbar! Drop θ a degree.',short:'Not enough on it. Aim a little higher.'}[o]||'Close. Adjust θ and go again.','warn',9);return;}
    const M2={saved:`Saved! You were only ${fmt(this.lineY||0,2)} m up at the goal line and the keeper reaches ${fmt(this.keeper,1)} m. You need between ${fmt(this.keeper+this.BR,2)} and ${fmt(this.BAR-this.BR,2)} m.`,wall:`Blocked. At 9.15 m you were only ${fmt(r.yw,2)} m up and the wall reaches 1.85 m. Add a degree or two of θ, or more v.`,
      over:`Over by ${fmt(r.yg-this.BAR,2)} m at the goal line. Lower θ or v, or add topspin so it dips late.`,
      bar:`Crossbar! You were ${fmt(Math.abs(r.yg-this.BAR)*100,0)} cm off. Drop θ by one degree.`,
      short:`It landed at about ${fmt(r.vx*2*r.vy/r.ga,0)} m and died. More v.`}[o];
    const ck=curCh('kick');COACH.say((M2||'Adjust and go again.')+(ck?' '+this.kickSolve():''),'warn',12);},
  onVar(){this.touched=true;},
  liveCoach(){if(this.opt.shot!=='free'||this.state!=='aim'||!this.touched)return;if(this.keeper){const r0=this.freeCalc(this.V.v,this.V.th);if(r0.clear&&!r0.under&&r0.yg>this.BR&&r0.yg<this.keeper+this.BR){const k2=9;if(this.lastK!==k2){this.lastK=k2;COACH.say(`The keeper would stop that: ${fmt(r0.yg,2)} m at the line. Aim between ${fmt(this.keeper+this.BR,2)} and ${fmt(this.BAR-this.BR,2)} m. ${this.kickSolve()}`,'tip',9);}return;}}const r=this.freeCalc(this.V.v,this.V.th),k=(r.clear?1:0)+(r.under?2:0);if(k===this.lastK)return;this.lastK=k;
    if(k===3)COACH.say(`Both checks green: ${fmt(r.yw,2)} m at the wall, ${fmt(r.yg,2)} m at the line. That's a goal on paper. Take the shot!`,'hype',8);
    else if(!r.clear)COACH.say(`At the wall you'd only be ${fmt(r.yw,2)} m up. The wall reaches ${fmt(this.WH,2)} m. ${this.kickSolve()}`,'tip',9);
    else COACH.say((r.yg<=this.BR?'The ball lands before the goal line. ':`At the goal line you'd be ${fmt(r.yg,2)} m up, over the 2.44 m bar. `)+this.kickSolve(),'tip',9);},
  isIdle(){return this.state==='aim'||this.state==='done';},
  idleTips(){const c=curCh('kick');return[...(c?[`${c.name}: ${this.kickSolve()}`]:[]),'Set g to the Moon and try to score. You will need a much flatter, slower shot: that earns Off-World.','Topspin (a_s > 0) pulls the ball down faster, so you can kick harder and still dip under the bar.','Hide the predicted path for the Blindfold bonus. Trust the Live Math checks.','Top Bins: get the ball above 1.9 m at the goal line but under the bar.','Headers: tap when the ball is about one ball-width from your head.'];},
  stepBall(h){const b=this.ball,free=this.opt.shot==='free',ga=free?this.gEff():this.g(),px=b.x,vyPrev=b.vy,kd=dragK();
    if(kd){const v=Math.hypot(b.vx,b.vy);b.vx-=kd*v*b.vx*h;b.vy-=kd*v*b.vy*h;}b.vy-=ga*h;if(free&&this.wind&&b.y>this.BR+0.01)b.vx+=this.wind*h;{const X=wx();if(X.gust&&b.y>this.BR+0.01){this._gt=(this._gt||0)+h;b.vx+=-(X.base+X.gust*Math.sin(3.1*this._gt+(this._gph||0)))*0.6*h;}}b.x+=b.vx*h;b.y+=b.vy*h;b.rot+=b.vx*h/this.BR;
    if(!this.apex&&vyPrev>0&&b.vy<=0&&b.y>0.4){this.apex={x:b.x,y:b.y};logMove('kick',{who:'rex',kind:'apex',y:b.y,title:`Top of flight at x = ${fmt(b.x)} m`,res:`${fmt(b.y,2)} m`,math:'vy = 0 here: h = h₀ + vy²÷(2g)',tone:'info'});}
    if(free&&!this.outcome&&px<this.WX-0.15&&b.x>=this.WX-0.15&&b.y<this.WH+this.BR){b.x=this.WX-0.16;b.vx=-0.25*Math.abs(b.vx);b.vy*=0.3;this.setOutcome('wall');}
    if(free&&!this.wallLog&&!this.outcome&&px<this.WX&&b.x>=this.WX){this.wallLog=true;logMove('kick',{who:'rex',kind:'wall',y:b.y,title:'Over the wall',res:`${fmt(b.y,2)} m`,math:`needed > ${fmt(this.WH+this.BR,2)} m · cleared by ${fmt((b.y-this.WH-this.BR)*100,0)} cm`,tone:'good'});}
    if(!this.outcome&&px<this.D&&b.x>=this.D){this.lineY=b.y;if(free&&this.keeper&&b.y<this.keeper+this.BR){b.x=this.D-0.3;b.vx=-0.3*Math.abs(b.vx);b.vy=Math.abs(b.vy)*0.4+1;this.setOutcome('saved');}else if(b.y<this.BAR-this.BR)this.setOutcome('goal');else if(b.y<this.BAR+0.12+this.BR){b.x=this.D-0.01;b.vx=-0.4*Math.abs(b.vx);b.vy=Math.abs(b.vy)*0.3+1.5;this.setOutcome('bar');}else this.setOutcome('over');}
    if(this.outcome==='goal'&&b.x>this.D+1.7){b.x=this.D+1.7;b.vx=-0.1;b.vy*=0.4;}
    if(b.y<this.BR){b.y=this.BR;const P=pitch();if(b.vy<-1.2){b.vy=-P.e*b.vy;b.vx*=1-P.f;}else{b.vy=0;b.vx*=Math.pow(P.roll,h);}}},
  predPts(){const pts=[];const kd=dragK();if(kd){const free=this.opt.shot==='free';let x,y,ux,uy,ga;if(free){const r=this.freeCalc(this.V.v,this.V.th);x=0;y=r.h0;ux=r.vx;uy=r.vy;ga=r.ga;}else{const r=this.headerCalc(1);x=r.Hp.x;y=r.Hp.y;ux=r.vo.x;uy=r.vo.y;ga=r.g;}
      for(let t=0,i=0;t<6;t+=0.004,i++){const sp=Math.hypot(ux,uy);ux-=kd*sp*ux*0.004;uy-=kd*sp*uy*0.004+ga*0.004;if(free&&this.wind)ux+=this.wind*0.004;x+=ux*0.004;y+=uy*0.004;if(y<0||x>this.D+1||ux<=0)break;if(i%5===0)pts.push({x,y});}return pts;}
    if(this.opt.shot==='free'){const r=this.freeCalc(this.V.v,this.V.th);for(let t=0;t<6;t+=0.02){const x=r.vx*t+0.5*r.w*t*t,y=r.h0+r.vy*t-0.5*r.ga*t*t;if(r.w&&r.vx+r.w*t<=0)break;if(y<0||x>this.D+1)break;pts.push({x,y});}}
    else{const r=this.headerCalc(1);for(let t=0;t<4;t+=0.02){const x=r.Hp.x+r.vo.x*t,y=r.Hp.y+r.vo.y*t-0.5*r.g*t*t;if(y<0||x>this.D+1)break;pts.push({x,y});}}return pts;},
  drawPerson(c,x,opts={}){const chosen=opts.kicker||opts.rec?playerLook():GAME_CORE.playerAppearance('you'),A=Object.assign({},chosen,opts);opts=Object.assign({},opts,{skin:opts.skin||A.skin,hair:opts.hair||A.hair,hairStyle:opts.hairStyle||A.hairStyle,eye:opts.eye||A.eye,brow:opts.brow||A.brow,mouth:opts.mouth||A.mouth,kit:opts.kit||A.kit,accent:opts.accent||A.accent,shorts:opts.shorts||A.shorts,sock:opts.sock||A.socks,boot:opts.boot||kitLook().boot});const s=this.S,X=v=>this.sx(v),Y=v=>this.sy(v),j=opts.j||0,f=opts.facing||(opts.kicker||opts.headY!==undefined?1:-1),p=(mx,my)=>({x:X(mx),y:Y(my)});
    const kneeF=(H,A)=>{const a=ik(H.x,H.y,A.x,A.y,0.46*s,0.45*s,1),b=ik(H.x,H.y,A.x,A.y,0.46*s,0.45*s,-1);return(a.x-b.x)*f>0?a:b;};
    const elbowD=(S,Hh)=>{const a=ik(S.x,S.y,Hh.x,Hh.y,0.3*s,0.29*s,1),b=ik(S.x,S.y,Hh.x,Hh.y,0.3*s,0.29*s,-1);return a.y>b.y?a:b;};
    let J;
    if(opts.kicker){const hp=this.hip(),ft=this.foot(),ph=this.phi,sw=clamp((ph+1)/2.2,0,1);
      const hipF=p(hp.x+x,hp.y),hipR=p(hp.x+x-0.05,hp.y+0.01),knF=p(hp.x+x+Math.sin(ph-0.25)*0.45,hp.y-Math.cos(ph-0.25)*0.45),anF=p(ft.x+x,ft.y);
      const sh={x:anF.x-knF.x,y:anF.y-knF.y},sl=Math.hypot(sh.x,sh.y)||1,toF={x:anF.x+sh.x/sl*0.15*s+0.07*s,y:anF.y+sh.y/sl*0.15*s};
      const anR=p(x-0.3,0.07),toR=p(x-0.06,0.02),knR=kneeF(hipR,anR);
      const lean=-0.08-0.3*sw,sc={x:hp.x+x+Math.sin(lean)*0.5,y:hp.y+Math.cos(lean)*0.5};
      const shF=p(sc.x+0.03,sc.y),shR=p(sc.x-0.03,sc.y+0.01),haR=p(sc.x+0.38-0.15*sw,sc.y-0.12+0.2*sw),haF=p(sc.x-0.3+0.1*sw,sc.y-0.3+0.05*sw);
      J={facing:1,hipF,hipR,knF,knR,anF,anR,toF,toR,shF,shR,elF:elbowD(shF,haF),elR:elbowD(shR,haR),haF,haR,neck:p(sc.x+0.01,sc.y+0.07),head:Object.assign(p(sc.x+0.05,sc.y+0.21),{tilt:0.25}),ground:Y(0)};}
    else{const tuck=Math.min(1,j/0.35),hc={x,y:0.93+j};const hipF=p(x+0.03*f,hc.y),hipR=p(x-0.03*f,hc.y+0.01);
      const anF=p(x+0.1*f-0.12*f*tuck,0.07+j*0.55),anR=p(x-0.1*f-0.08*f*tuck,0.07+j*0.45),toF={x:anF.x+0.2*s*f,y:anF.y+0.04*s},toR={x:anR.x+0.2*s*f,y:anR.y+0.04*s};
      const hx=opts.headX!==undefined?opts.headX:x+0.02*f,hy=opts.headY!==undefined?opts.headY:1.64+j,sc={x:(x+hx)/2-0.02*f,y:1.43+j};
      const shF=p(sc.x+0.03*f,sc.y),shR=p(sc.x-0.03*f,sc.y+0.01),ar=opts.arms!=null?opts.arms:0.2;let haF,haR;
      if(opts.wall){haF=p(sc.x+0.14*f,0.98+j);haR=p(sc.x+0.1*f,1.02+j);}
      else if(opts.keeper){haF=p(sc.x+0.2*f,0.93+ar+j*0);haR=p(sc.x-0.05*f,0.93+ar-0.05);}
      else{haF=p(sc.x-0.28*f,0.93+ar+j*0.2);haR=p(sc.x+0.3*f,0.93+ar*0.9+j*0.2);}
      J={facing:f,hipF,hipR,knF:kneeF(hipF,anF),knR:kneeF(hipR,anR),anF,anR,toF,toR,shF,shR,elF:elbowD(shF,haF),elR:elbowD(shR,haR),haF,haR,neck:p(sc.x+0.01*f,sc.y+0.07),head:Object.assign(p(hx,hy),{tilt:opts.headY!==undefined?0.2:0}),ground:Y(0)};}
    J.pelvis={x:(J.hipF.x+J.hipR.x)/2,y:(J.hipF.y+J.hipR.y)/2};if(opts.rec)this._J=J;
    if(opts.xray){RIG.bones(c,RIG.pairsSide(J),RIG.jointsSide(J),1.4,C.xray);return J;}
    if(V3.on&&V3.side(this,J,x,opts))return J;
    RIG.side(c,J,{u:s*1.18,skin:opts.skin,hair:opts.hair,hairStyle:opts.hairStyle,eye:opts.eye,brow:opts.brow,mouth:opts.mouth,kit:opts.kit,accent:opts.accent,shorts:opts.shorts,sock:opts.sock,boot:opts.boot,olw:1.35,chest:0.17*s*(opts.ws||opts.shoulders||1),headR:0.15*s,sleeve:true,num:opts.number||null,shadow:true,glove:opts.keeper?0.095*s:0,gloveCol:opts.boot.accent});return J;},
  fallbackSideAtmosphere(c,E,env,h){const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,E.skyTop);sky.addColorStop(.7,E.skyBottom);sky.addColorStop(1,E.haze);c.fillStyle=sky;c.fillRect(0,0,W,h);
    if(env==='alt'){c.fillStyle='rgba(218,235,255,.3)';c.beginPath();c.moveTo(0,192);for(let x=0;x<=W;x+=64)c.lineTo(x,126-((x*13)%62));c.lineTo(W,232);c.lineTo(0,232);c.fill();c.fillStyle='rgba(35,62,102,.5)';c.beginPath();c.moveTo(0,220);for(let x=0;x<=W;x+=82)c.lineTo(x,166-((x*7)%38));c.lineTo(W,242);c.lineTo(0,242);c.fill();}
    if(env==='mars'||env==='moon'){c.fillStyle='rgba(255,255,255,.78)';for(let i=0;i<72;i++)c.fillRect((i*89)%W,24+(i*43)%148,i%17===0?2:1,i%17===0?2:1);c.strokeStyle=env==='mars'?'rgba(255,188,135,.3)':'rgba(220,235,255,.36)';c.lineWidth=5;c.beginPath();c.ellipse(W/2,h+74,W*.62,418,0,Math.PI,Math.PI*2);c.stroke();for(let x=90;x<W;x+=130){c.lineWidth=1;c.beginPath();c.moveTo(x,170);c.lineTo(W/2,h+18);c.stroke();}}
    if(env==='home'){const beam=c.createLinearGradient(0,0,0,h);beam.addColorStop(0,'rgba(255,248,219,.2)');beam.addColorStop(1,'rgba(255,248,219,0)');c.fillStyle=beam;c.beginPath();c.moveTo(55,72);c.lineTo(245,h);c.lineTo(375,h);c.lineTo(112,72);c.fill();c.beginPath();c.moveTo(W-55,72);c.lineTo(W-245,h);c.lineTo(W-375,h);c.lineTo(W-112,72);c.fill();}},
  fallbackSideRoof(c,E,env){const vx=W*.53;c.fillStyle='rgba(3,8,20,.9)';c.beginPath();c.moveTo(0,45);c.lineTo(vx,88);c.lineTo(W,42);c.lineTo(W,104);c.lineTo(vx,98);c.lineTo(0,106);c.fill();c.strokeStyle=E.rail;c.globalAlpha=.48;c.lineWidth=2;line(c,0,105,vx,98);line(c,vx,98,W,103);for(let x=0;x<=W;x+=96){line(c,x,48,vx,98);line(c,x,105,vx,79);}c.globalAlpha=1;
    if(env==='home'||env==='alt'){for(const x of [54,W-54]){c.fillStyle='#172038';c.fillRect(x-4,54,8,118);c.fillStyle='#fff3c7';for(let r=0;r<3;r++)for(let q=0;q<4;q++)c.fillRect(x-23+q*12,48+r*8,8,5);}}
    if(env==='moon'){c.strokeStyle='rgba(235,245,255,.62)';c.lineWidth=3;line(c,0,82,W,82);for(let x=40;x<W;x+=92)line(c,x,82,x+42,111);}},
  fallbackSideStands(c,E,h){const top=108,mid=232,front=Math.max(350,h-58),chr=this.cheerT>0,fr=Math.floor(performance.now()/100);c.fillStyle=E.stand;c.fillRect(0,top,W,front-top);c.fillStyle=E.tier;c.beginPath();c.moveTo(0,top);c.lineTo(W,top);c.lineTo(W,mid-10);c.lineTo(0,mid+22);c.fill();c.fillStyle=E.stand;c.beginPath();c.moveTo(0,mid+8);c.lineTo(W,mid-18);c.lineTo(W,front);c.lineTo(0,front);c.fill();
    c.save();c.globalAlpha=chr?.92:.68;for(let tier=0;tier<2;tier++){const y0=tier?mid+17:top+13,rows=tier?7:8,step=tier?17:13,count=tier?60:52;for(let r=0;r<rows;r++)for(let i=0;i<count;i++){const x=(i*(tier?19:23)+r*11+tier*7)%W,y=y0+r*step+((i*17+r*7)%5)-(chr&&(i+r+fr)%7===0?3:0);c.fillStyle=E.crowd[(i+r+tier)%E.crowd.length];c.fillRect(x,y,tier?3:2.5,tier?4:3);}}c.restore();
    c.fillStyle='rgba(3,8,20,.5)';for(let x=92;x<W;x+=190){c.beginPath();c.moveTo(x,top);c.lineTo(x+34,top);c.lineTo(x+74,front);c.lineTo(x+32,front);c.fill();}c.strokeStyle=E.rail;c.globalAlpha=.48;c.lineWidth=2;line(c,0,mid,W,mid-20);line(c,0,front-2,W,front-2);c.globalAlpha=1;},
  fallbackSideReturns(c,E,h){const top=112,front=Math.max(350,h-58),edge=Math.max(380,h-29);c.save();c.globalAlpha=.94;c.fillStyle=E.tier;c.beginPath();c.moveTo(0,top);c.lineTo(128,158);c.lineTo(116,front);c.lineTo(0,edge+44);c.fill();c.fillStyle=E.stand;c.beginPath();c.moveTo(W,top);c.lineTo(W-112,158);c.lineTo(W-98,front);c.lineTo(W,edge+42);c.fill();c.strokeStyle=E.rail;c.lineWidth=2;for(let i=0;i<4;i++){line(c,0,top+34+i*48,116-i*10,170+i*58);line(c,W,top+34+i*48,W-105+i*8,170+i*58);}c.fillStyle='rgba(3,8,20,.56)';c.beginPath();c.moveTo(0,edge+20);c.lineTo(92,edge+7);c.lineTo(144,H);c.lineTo(0,H);c.fill();c.beginPath();c.moveTo(W,edge+18);c.lineTo(W-82,edge+8);c.lineTo(W-132,H);c.lineTo(W,H);c.fill();c.restore();},
  fallbackSideBoards(c,E,h){const front=Math.max(350,h-58),panel=152,phase=(performance.now()/1000*38)%panel,msgs=['KICKLAB','F = m·a','v = d ÷ t','p = m·v','E = ½mv²','h = v²÷2g'];c.fillStyle=E.board;c.fillRect(0,front-1,W,31);c.save();c.beginPath();c.rect(0,front,W,30);c.clip();for(let i=-1;i<Math.ceil(W/panel)+2;i++){const x=i*panel-phase,j=((i%msgs.length)+msgs.length)%msgs.length;c.fillStyle=j%2?E.tier:E.board;c.fillRect(x,front,panel-3,29);c.fillStyle=E.accent;c.fillRect(x,front,3,29);text(c,msgs[j],x+panel/2,front+19,'700 10px '+MONO,j%2?E.rail:E.accent,'center');}c.restore();this._sideBoardPhase=phase;},
  fallbackSidePitch(c,E,h){const edge=Math.max(380,h-29),vx=W*.53,depth=H-edge;c.fillStyle=E.field;c.fillRect(0,edge,W,depth);for(let i=0;i<12;i++){const b0=i*W/12,b1=(i+1)*W/12,t0=vx+(b0-vx)*.72,t1=vx+(b1-vx)*.72;c.fillStyle=i%2?E.field:E.band;c.beginPath();c.moveTo(t0,edge);c.lineTo(t1,edge);c.lineTo(b1,H);c.lineTo(b0,H);c.fill();}for(let r=0;r<5;r++){const t0=r/5,t1=(r+1)/5,y0=edge+depth*Math.pow(t0,1.75),y1=edge+depth*Math.pow(t1,1.75);c.fillStyle=r%2?'rgba(255,255,255,.018)':'rgba(0,0,0,.035)';c.fillRect(0,y0,W,y1-y0);}
    c.strokeStyle='rgba(246,250,255,.7)';c.lineWidth=1.5;c.beginPath();c.moveTo(0,edge+2);c.lineTo(58,H);c.moveTo(W,edge+2);c.lineTo(W-48,H);c.moveTo(vx,edge);c.lineTo(W*.5,H);c.moveTo(W*.74,edge+1);c.lineTo(W*.67,H);c.lineTo(W*.91,H);c.lineTo(W*.86,edge+1);c.moveTo(W*.82,edge+1);c.lineTo(W*.77,H);c.lineTo(W*.87,H);c.lineTo(W*.9,edge+1);c.stroke();c.lineWidth=2;line(c,0,edge,W,edge);
    c.save();const shade=c.createLinearGradient(0,edge,0,H);shade.addColorStop(0,'rgba(3,8,20,.2)');shade.addColorStop(.45,'rgba(3,8,20,0)');shade.addColorStop(1,'rgba(3,8,20,.24)');c.fillStyle=shade;c.fillRect(0,edge,W,depth);c.globalAlpha=this.opt.pitch==='wet'?.25:.13;for(let i=0;i<96;i++){c.fillStyle=i%3?E.haze:E.accent;const y=edge+8+(i*37)%Math.max(24,depth),wide=6+(y-edge)/Math.max(1,depth)*24;c.fillRect((i*97)%W,y,wide,1);}c.restore();},
  fallbackSideScene(c,k){const E=GAME_CORE.fallbackEnvironment(this.opt.stad,this.opt.pitch),env=this.opt.stad,z=k&&Number.isFinite(k.z)?k.z:1,ky=k&&Number.isFinite(k.y)?k.y:H/2,h=clamp(H/2+(this.OY-ky)*z,400,478);this.fallbackSideAtmosphere(c,E,env,h);this.fallbackSideRoof(c,E,env);this.fallbackSideStands(c,E,h);this.fallbackSideReturns(c,E,h);this.fallbackSideBoards(c,E,h);this.fallbackSidePitch(c,E,h);const layers=['atmosphere','roof-truss','upper-stands','lower-stands','crowd','side-returns','animated-boards','perspective-pitch'];window.__KICKLAB_SIDE_STADIUM__={mode:this.opt.shot,id:E.id,pitch:E.pitchId,layers,boardPhase:this._sideBoardPhase};window.__KICKLAB_FALLBACK_ENV__={id:E.id,pitch:E.pitchId,atmosphere:E.atmosphere};},
  drawSideGoal(c,X,Y,S){const E=GAME_CORE.fallbackEnvironment(this.opt.stad,this.opt.pitch),frontX=X(this.D),backX=X(this.D+2.15),ground=Y(0),frontTop=Y(this.BAR),backTop=Y(this.BAR-1.02),depth=backX-frontX,nb=this.netT!=null?Math.exp(-this.netT*2.5)*Math.sin(this.netT*18)*8:0;c.save();c.fillStyle='rgba(230,242,255,.07)';c.beginPath();c.moveTo(frontX,frontTop);c.lineTo(backX+nb,backTop);c.lineTo(backX+nb,ground);c.lineTo(frontX,ground);c.fill();c.strokeStyle='rgba(232,241,255,.34)';c.lineWidth=1;
    for(let i=0;i<=8;i++){const t=i/8,fy=frontTop+(ground-frontTop)*t,by=backTop+(ground-backTop)*t;line(c,frontX,fy,backX+nb*(1-t),by);}for(let i=0;i<=8;i++){const t=i/8,x=frontX+depth*t+nb*t;line(c,x,frontTop+(backTop-frontTop)*t,x,ground);}c.strokeStyle='rgba(232,241,255,.5)';line(c,backX+nb,backTop,backX+nb,ground);line(c,frontX,frontTop,backX+nb,backTop);line(c,frontX,ground,backX+nb,ground);
    c.shadowColor='rgba(0,0,0,.65)';c.shadowBlur=5;c.strokeStyle='#f7fbff';c.lineWidth=5;c.lineCap='square';line(c,frontX,ground,frontX,frontTop);line(c,frontX,frontTop,backX+4,frontTop);c.shadowBlur=0;c.strokeStyle=E.rail;c.lineWidth=2;line(c,backX+nb,ground,backX+nb,backTop);line(c,backX+nb,backTop,frontX,frontTop);c.restore();window.__KICKLAB_SIDE_GOAL__={frontFrame:true,rearFrame:true,sideNet:true,backNet:true,perspectiveGrid:true};},
  draw(c){const X=v=>this.sx(v),Y=v=>this.sy(v),S=this.S,free=this.opt.shot==='free',v3=V3.on;
    for(let m=0;m<=20;m+=5){text(c,m+' m',X(m),this.OY+22,'600 11px '+MONO,'rgba(232,238,249,0.7)','center');c.fillStyle='rgba(232,238,249,0.5)';c.fillRect(X(m)-1,this.OY,2,7);}
    if(!v3)this.drawSideGoal(c,X,Y,S);
    if(stageAdjustmentVisible())text(c,'bar 2.44 m',X(this.D)+8,Y(this.BAR+0.3),'600 11px '+MONO,C.muted);
    if(free){const jw=this.WH-1.85;for(let i=0;i<4;i++)this.drawPerson(c,this.WX+i*0.07-0.1,{kit:i%2?'#8a3242':'#7a2d3a',skin:i%2?'#6d4a33':'#a0694a',arms:0.1,j:jw,wall:true,facing:-1});
      c.save();c.setLineDash([4,4]);c.strokeStyle='rgba(255,107,115,0.6)';line(c,X(this.WX)-14,Y(this.WH),X(this.WX)+14,Y(this.WH));c.restore();if(stageAdjustmentVisible())text(c,`wall ${fmt(this.WH,2)} m`,X(this.WX),Y(this.WH)-10,'600 11px '+MONO,jw>0?C.hot:C.muted,'center');
      if(this.keeper){c.fillStyle='rgba(255,107,115,0.14)';c.fillRect(X(this.D)-2,Y(this.keeper),0.3*S,this.keeper*S);this.drawPerson(c,this.D-0.35,{kit:'#d4a017',skin:'#6d4a33',arms:this.keeper-0.93,keeper:true,facing:-1});if(stageAdjustmentVisible())text(c,`keeper ${fmt(this.keeper,1)} m`,X(this.D)-8,Y(this.keeper)-8,'600 11px '+MONO,C.hot,'right');}
      if(this.wind){const tt=performance.now()/1000;c.save();c.strokeStyle='rgba(127,220,255,0.35)';c.lineWidth=2;for(let i=0;i<9;i++){const xx=((i*137-tt*260)%(W+200)+W+200)%(W+200)-100,yy=90+(i*53)%120;line(c,xx,yy,xx+40,yy);}c.restore();text(c,`HEADWIND ${fmt(-this.wind,0)} m/s² ←`,W/2,86,'700 13px '+MONO,C.xray,'center');}}
    if(this.ghost&&this.ghost.length){c.fillStyle='rgba(232,238,249,0.16)';this.ghost.forEach(p=>c.fillRect(X(p.x)-1.5,Y(p.y)-1.5,3,3));}
    if(this.opt.pred==='on'&&(this.state==='aim'||this.state==='incoming')){const pts=this.predPts(),ok=free?(()=>{const r=this.freeCalc(this.V.v,this.V.th);return r.clear&&r.under;})():(()=>{const r=this.headerCalc(1);return r.yg<this.BAR-this.BR&&r.yg>this.BR;})();
      if(v3)V3.arc={pts,ok};else{c.save();c.setLineDash([6,6]);c.strokeStyle=ok?'rgba(95,227,161,0.8)':'rgba(255,107,115,0.7)';c.lineWidth=2;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(X(p.x),Y(p.y)):c.moveTo(X(p.x),Y(p.y)));c.stroke();c.restore();}}
    if(free)this.drawPerson(c,0,{kicker:true,rec:true,sock:'#e8eef9'});
    else{const hp=this.headPos(),j=hp.y-1.68;
      if(this.duel){const D=this.duel,t=this.state==='incoming'?this.inT:this.cr?this.cr.T0+0.3:0,dj=D.stand+this.jumpH(D.v0,t-D.tD)-D.stand,X=v=>this.sx(v),Y=v=>this.sy(v);
        this.drawPerson(c,this.HX+0.55,{j:dj+(D.stand-1.80),kit:D.col,skin:'#6d4a33',arms:0.5+dj,facing:-1,headX:this.HX+0.47,headY:1.68+dj+(D.stand-1.80)});
        c.save();c.setLineDash([4,4]);c.lineWidth=1.5;const pkMe=PLY().h+this.V.jv*this.V.jv/(2*this.V.g),pkHim=D.stand+D.v0*D.v0/(2*this.V.g);
        c.strokeStyle='rgba(127,220,255,0.8)';line(c,X(this.HX-0.6),Y(pkMe),X(this.HX+0.3),Y(pkMe));c.strokeStyle='rgba(255,107,115,0.8)';line(c,X(this.HX+0.25),Y(pkHim),X(this.HX+1.1),Y(pkHim));c.restore();
        text(c,`your peak ${fmt(pkMe,2)} m`,X(this.HX-0.65),Y(pkMe)-4,'700 10px '+MONO,'#7fdcff','right');text(c,`${D.name} ${fmt(pkHim,2)} m`,X(this.HX+1.15),Y(pkHim)-4,'700 10px '+MONO,C.bad,'left');}
      this.drawPerson(c,this.HX,{j,headX:hp.x,headY:hp.y,arms:0.5+j,rec:true,sock:'#e8eef9'});}
    this.trail.forEach((p,i)=>{c.fillStyle=`rgba(255,176,74,${0.25+0.5*i/this.trail.length})`;c.beginPath();c.arc(X(p.x),Y(p.y),2,0,Math.PI*2);c.fill();});
    if(this.apex&&stageAdjustmentVisible()){const a=this.apex;c.fillStyle=C.violet;c.beginPath();c.arc(X(a.x),Y(a.y),4,0,Math.PI*2);c.fill();text(c,'top: vy = 0  (h = '+fmt(a.y)+' m)',X(a.x),Y(a.y)-12,'600 11px '+MONO,C.violet,'center');}
    const b=this.ball;if(!v3){c.fillStyle='rgba(0,0,0,0.35)';c.beginPath();c.ellipse(X(b.x),this.OY+2,0.14*S*clamp(1.4-b.y/8,0.4,1.4),3,0,0,Math.PI*2);c.fill();
    this.drawBall(c,X(b.x),Y(b.y),this.BR*S*1.35,b.rot,this.squash());}
    if(this.state==='flight'&&!this.outcome&&stageAdjustmentVisible()){const vs=4;arrow(c,X(b.x),Y(b.y),X(b.x)+b.vx*vs,Y(b.y),C.xray,2.5);arrow(c,X(b.x),Y(b.y),X(b.x),Y(b.y)-b.vy*vs,C.violet,2.5);
      text(c,'vx '+fmt(b.vx),X(b.x)+b.vx*vs+6,Y(b.y)+4,'600 11px '+MONO,C.xray);text(c,'vy '+fmt(b.vy),X(b.x)+6,Y(b.y)-b.vy*vs+(b.vy>0?-4:12),'600 11px '+MONO,C.violet);}
    if(this.state==='aim'){const th=(free?this.V.th:this.V.thH)*DEG,ox=free?b.x:this.HX+0.36,oy=free?b.y:2.3,len=free?this.V.v*4:50;
      arrow(c,X(ox),Y(oy),X(ox)+Math.cos(th)*len,Y(oy)-Math.sin(th)*len,C.good,3);
      c.save();c.strokeStyle=C.pink;c.lineWidth=1.5;c.beginPath();c.arc(X(ox),Y(oy),26,0,-th,th>0);c.stroke();c.restore();
      if(stageAdjustmentVisible()){text(c,'θ = '+(free?this.V.th:this.V.thH)+'°',X(ox)+32,Y(oy)-Math.sin(th/2)*30-2,'600 12px '+MONO,C.pink);
        if(free)text(c,'v = '+fmt(this.V.v)+' m/s',X(ox)+Math.cos(th)*len+8,Y(oy)-Math.sin(th)*len-6,'700 13px '+MONO,C.good);}}},
  squash(){if(this.state==='swing'&&this.contact)return{k:0.8,a:this.V.th*DEG};if(this.state==='heading'){const v=this.cr.vin;return{k:0.78,a:Math.atan2(v.y,v.x)};}return null;},
  drawBall(c,x,y,r,rot,sq){const B=kitLook().ball,rr=r*B.scale;c.save();c.translate(x,y);if(sq){c.rotate(-sq.a);c.scale(sq.k,1/Math.sqrt(sq.k));c.rotate(sq.a);}else c.scale(1,B.squash);
    const bc=styleCol('kick');if(bc!=='#f3f6fb'){c.shadowColor=bc;c.shadowBlur=10;}c.fillStyle=B.color;c.beginPath();c.arc(0,0,rr,0,Math.PI*2);c.fill();c.shadowBlur=0;c.rotate(rot);c.strokeStyle=B.accent;c.fillStyle=B.accent;c.lineWidth=Math.max(1,rr*(B.seam==='wide'?0.1:B.seam==='tight'?0.045:0.07));
    if(B.pattern==='rings'){for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,0,rr*(0.34+i*0.22),rr*(0.16+i*0.1),i*0.7,0,Math.PI*2);c.stroke();}c.beginPath();c.arc(0,0,rr*0.16,0,Math.PI*2);c.fill();}
    else{for(let i=0;i<5;i++){const a=i*Math.PI*2/5;c.beginPath();c.arc(Math.cos(a)*rr*0.72,Math.sin(a)*rr*0.72,rr*0.2,0,Math.PI*2);c.fill();}c.beginPath();c.arc(0,0,rr*0.27,0,Math.PI*2);c.fill();}
    c.restore();},
  drawXray(c){const X=v=>this.sx(v),Y=v=>this.sy(v),S=this.S;c.save();c.lineCap='round';c.lineJoin='round';glow(c,C.xray,10);c.strokeStyle=C.xray;
    if(this._J){c.save();c.shadowBlur=0;RIG.bones(c,RIG.pairsSide(this._J),RIG.jointsSide(this._J),1.3,C.xray);if(this.opt.shot==='free'){const J=this._J;RIG.angle(c,J.hipF,J.knF,J.anF,14,C.good,'knee','700 11px '+MONO);}c.restore();glow(c,C.xray,10);c.strokeStyle=C.xray;}
    if(this.opt.shot==='free'){const hp=this.hip(),f=this.foot(),kn={x:hp.x+Math.sin(this.phi-0.25)*0.45,y:hp.y-Math.cos(this.phi-0.25)*0.45};
      c.lineWidth=1.3;c.beginPath();c.ellipse(X(hp.x-0.04),Y(hp.y+0.02),0.16*S,0.09*S,0.3,0,Math.PI*2);c.stroke();
      c.lineWidth=2;line(c,X(hp.x),Y(hp.y),X(kn.x),Y(kn.y));c.beginPath();c.arc(X(kn.x),Y(kn.y),2.4,0,Math.PI*2);c.stroke();
      const lx=f.x-kn.x,ly=f.y-kn.y,ll=Math.hypot(lx,ly),nx=-ly/ll*0.025,ny=lx/ll*0.025;c.lineWidth=1.4;line(c,X(kn.x+nx),Y(kn.y+ny),X(f.x+nx),Y(f.y+ny));line(c,X(kn.x-nx*1.6),Y(kn.y-ny*1.6),X(f.x-nx*1.6),Y(f.y-ny*1.6));
      const ux=lx/ll,uy=ly/ll,fx=Math.cos(this.phi-1.2),fy=Math.sin(this.phi-1.2);
      c.lineWidth=1;for(let i=0;i<4;i++){const o=(i-1.5)*0.012;line(c,X(f.x+o),Y(f.y+o*0.5),X(f.x+ux*0.02+fx*0.17+o),Y(f.y+uy*0.02+fy*0.17+o*0.5));}
      const b=this.ball,th=this.V.th*DEG;c.shadowBlur=0;
      if(this.state==='swing'&&this.contact){arrow(c,X(b.x),Y(b.y),X(b.x)+Math.cos(th)*30,Y(b.y)-Math.sin(th)*30,C.hot,2.4);arrow(c,X(f.x),Y(f.y),X(f.x)-Math.cos(th)*24,Y(f.y)+Math.sin(th)*24,C.violet,2.2);}
      else if(this.state!=='swing'&&this.res&&this.res.kind==='free'){const r=this.res,vs=2.2,bx=X(b.x),by=Y(b.y);
        arrow(c,bx,by,bx+r.vx*vs,by-r.vy*vs,C.good,2.2);c.setLineDash([3,3]);arrow(c,bx,by,bx+r.vx*vs,by,C.xray,1.6);arrow(c,bx+r.vx*vs,by,bx+r.vx*vs,by-r.vy*vs,C.violet,1.6);c.setLineDash([]);
        c.strokeStyle=C.pink;c.lineWidth=1;c.beginPath();c.arc(bx,by,14,0,-th,true);c.stroke();}}
    else{const hp=this.headPos(),hx=X(hp.x),hy=Y(hp.y),r=0.12*S;c.lineWidth=1.2;
      c.beginPath();c.arc(hx-1,hy,r*1.05,Math.PI*0.55,Math.PI*2.2);c.stroke();c.beginPath();c.arc(hx+r*0.45,hy+1,1.6,0,Math.PI*2);c.stroke();
      c.beginPath();c.moveTo(hx+r*0.9,hy+r*0.3);c.lineTo(hx+r*0.6,hy+r*0.95);c.lineTo(hx-r*0.2,hy+r*0.9);c.stroke();
      for(let i=0;i<5;i++){rr(c,hx-r*0.35-1.5,hy+r*0.95+i*2.6,3,2,0.6);c.stroke();}
      c.shadowBlur=0;const b=this.ball,bx=X(b.x),by=Y(b.y),vi=this.cr?this.cr.vin:{x:0,y:0};arrow(c,bx-vi.x*2.2,by+vi.y*2.2,bx-1,by,C.good,1.8,[3,3]);
      if(this.res&&this.res.kind==='header'){const r2=this.res;arrow(c,bx,by,bx+r2.vo.x*2.2,by-r2.vo.y*2.2,C.good,2.2);arrow(c,bx,by,bx+r2.dv.x*1.4,by-r2.dv.y*1.4,C.hot,2.4);}}
    c.restore();},
  callouts(c){const X=v=>this.sx(v),Y=v=>this.sy(v),b=this.ball,bs=toS(X(b.x),Y(b.y));
    if(this.opt.shot==='free'){if(this.state==='swing'&&this.contact){const F=this.M*this.v/this.DT_KICK;callout(c,bs,30,64,['F = m · Δv ÷ Δt',`= 0.43 × ${fmt(this.v)} ÷ 0.009`,`≈ ${fmt(F,0)} N`],C.hot);}
      if(this.state!=='swing'&&this.res&&this.res.kind==='free'){const r=this.res;callout(c,bs,W-300,64,[`v = ${fmt(r.v)} at θ = ${r.th}°`,`vx = v·cos θ = ${fmt(r.vx)}`,`vy = v·sin θ = ${fmt(r.vy)}`],C.good);}}
    else if(this.res&&this.res.kind==='header'){const r=this.res;callout(c,bs,W-300,64,['Δv = v_out − v_in',`|Δv| = ${fmt(r.dvM)} m/s`,`F = m·|Δv|÷Δt ≈ ${fmt(r.F,0)} N`],C.hot);}},
  hud(c){text(c,'KICK LAB',24,34,'15px '+DISP,C.xray);const free=this.opt.shot==='free';
    const tip=this.state==='aim'?(free?'Set v and θ in the math console. When both checks are green, KICK.':'Aim with θ, then cross it in. Tap HEAD IT just before the ball reaches you.'):this.state==='incoming'?'Tap HEAD IT now!':'';
    text(c,tip,24,54,'500 13px '+BODY,C.muted);
    text(c,'GOALS '+(best.goals||0),W-24,38,'18px '+DISP,C.ink,'right');
  },
  eqs(){const M=this;
    if(this.opt.shot==='free'){const r=this.freeCalc(this.V.v,this.V.th);return{lines:[
      eqLine('Split the kick into parts',`vx = ${T(M,'v')}·cos ${T(M,'th')}&emsp;&emsp;vy = ${T(M,'v')}·sin ${T(M,'th')}`,`vx = ${N(M,'v',fmt(r.v))} × cos ${N(M,'th',r.th+'°')} = <b>${fmt(r.vx,2)}</b>&emsp;&emsp;vy = <b>${fmt(r.vy,2)}</b> m/s`),
      eqLine('Downward pull',`g_eff = ${T(M,'g')} + ${T(M,'spin')}`,`= ${N(M,'g',fmt(r.g,2))} + ${N(M,'spin',fmt(r.spin,1))} = <b>${fmt(r.ga,2)} m/s²</b>`),
      eqLine(`Check 1: over the ${fmt(r.WH,2)} m wall at 9.15 m`,r.w?`x = vx·t + ½·w·t² → t at 9.15 m&emsp;&emsp;y = 0.11 + vy·t − ½·g_eff·t²`:`t = 9.15 ÷ vx&emsp;&emsp;y = 0.11 + vy·t − ½·g_eff·t²`,`t = ${fmt(r.tw,3)} s → y = <b>${fmt(r.yw,2)} m</b>  ${r.clear?`<span class="ok">clears ${fmt(r.WH,2)} m</span>`:'<span class="no">hits the wall</span>'}`),
      eqLine('Check 2: under the bar at 21 m',`t = 21 ÷ vx&emsp;&emsp;y = 0.11 + vy·t − ½·g_eff·t²`,`t = ${isFinite(r.tg)?fmt(r.tg,3):'never'} s → y = <b>${fmt(r.yg,2)} m</b>  ${r.under?`<span class="ok">under 2.44 m${r.kp?', over the keeper':''}</span>`:r.yg<=this.BR?'<span class="no">lands first (might bounce in)</span>':r.kp&&r.yg<r.kp+this.BR?`<span class="no">keeper saves it (below ${fmt(r.kp,1)} m)</span>`:'<span class="no">over the bar</span>'}`),
      eqLine('Highest point',`h = 0.11 + vy² ÷ (2·g_eff)`,`= 0.11 + ${fmt(r.vy,2)}² ÷ ${fmt(2*r.ga,2)} = <b>${fmt(r.hp,2)} m</b> at t = ${fmt(r.tp,2)} s`),
      eqLine('Kick force (9 ms of contact)',`F = 0.43 kg · ${T(M,'v')} ÷ 0.009 s`,`= 0.43 × ${N(M,'v',fmt(r.v))} ÷ 0.009 = <b class="hot">${fmt(r.F,0)} N</b>`),
      ...(r.air?[eqLine('Air drag (on)',`F = ½·ρ·C_d·A·v²  →  a = ${fmt(r.air.k,4)}·v²`,`at ${fmt(r.v,1)} m/s: a = <b>${fmt(r.air.aD,1)} m/s²</b> backwards · ball is down to ${fmt(r.air.vW,1)} m/s at the wall, ${fmt(r.air.vG,1)} m/s at the line · without air it would cross at ${fmt(r.air.yg0,2)} m, with air <b>${fmt(r.yg,2)} m</b>`)]:[]),
      ...(r.w?[eqLine('Headwind slows vx',`x = vx·t + ½·w·t²&emsp;→&emsp;t = (−vx + √(vx² + 2·w·x)) ÷ w`,`w = ${fmt(r.w,1)} m/s²: reaching 21 m takes ${isFinite(r.tg)?fmt(r.tg,3):'forever'} s instead of ${fmt(this.D/r.vx,3)} s`)]:[])],note:`<p class="note">${r.clear&&r.under?'<span class="ok">Both checks pass.</span> Math says this one goes in. Kick it and see.':'Adjust v and θ until both checks are green.'}</p>`};}
    const r=this.headerCalc(this.q!=null?this.q:1),perfect=this.q==null;return{lines:[
      eqLine('Ball arriving (a vector)',`|v_in| = √(vx² + vy²)`,`= √(${fmt(r.vin.x)}² + ${fmt(r.vin.y)}²) = <b>${fmt(r.vinM)} m/s</b>`),
      eqLine('Your jump',`h_max = ${T(M,'jv')}² ÷ 2g,  time to peak t = ${T(M,'jv')} ÷ g`,`= ${N(M,'jv',fmt(this.V.jv,1))}² ÷ ${fmt(2*this.V.g,1)} = <b>${fmt(this.V.jv*this.V.jv/(2*this.V.g),2)} m</b> · take off ${fmt(this.V.jv/this.V.g,2)} s before the ball arrives (head reaches ${fmt(PLY().h+this.V.jv*this.V.jv/(2*this.V.g),2)} m vs ball 2.30 m)`),
      ...(this.opt.duel==='duel'?[(()=>{const i=this.duelT(),v0=[2.6,2.8,2.95,3.05,3.25][i],st=[1.78,1.80,1.84,1.92,1.86][i],hm=st+v0*v0/(2*this.V.g),me=PLY().h+this.V.jv*this.V.jv/(2*this.V.g);return eqLine(`Duel vs ${DEFS[i].name}`,'higher head at the moment the ball arrives wins',`his best ${fmt(hm,2)} m vs your best ${fmt(me,2)} m ${me>=hm?'<span class="ok">you can win it</span>':'<span class="no">jump harder (v₀)</span>'}`);})()]:[]),
      eqLine('Ball leaving',`v_out = 0.35·|v_in| + 1.8·v_head`,`= 0.35 × ${fmt(r.vinM)} + 1.8 × ${fmt(r.vHead)} = <b>${fmt(r.vout)} m/s</b> at ${N(M,'thH',r.th+'°')}${perfect?'  (if your timing is perfect)':''}`),
      eqLine('Change in velocity',`Δv = v_out − v_in  (subtract as vectors)`,`= (${fmt(r.dv.x)}, ${fmt(r.dv.y)}) → |Δv| = <b>${fmt(r.dvM)} m/s</b>`),
      eqLine('Force on your forehead',`F = 0.43 · |Δv| ÷ 0.012 s`,`= <b class="hot">${fmt(r.F,0)} N</b>`),
      eqLine('Height at the goal line',`t = ${fmt(r.d)} ÷ vx_out&emsp;&emsp;y = 2.3 + vy_out·t − ½·${T(M,'g')}·t²`,`t = ${fmt(r.t,2)} s → y = <b>${fmt(r.yg,2)} m</b>  ${r.yg<this.BAR-this.BR&&r.yg>this.BR?'<span class="ok">under the bar</span>':r.yg<=this.BR?'<span class="no">bounces first</span>':'<span class="no">over the bar</span>'}`)],note:''};},
  chart(c,w,h){const free=this.opt.shot==='free',pts=this.predPts(),hp=Math.max(4,...pts.map(p=>p.y))+0.5,y1=Math.min(Math.ceil(hp),30);
    const f=plotFrame(c,w,h,{x0:0,x1:24,y0:0,y1,xt:[0,5,9.15,15,21],yt:niceTicks(0,y1,4),xl:'distance x (m)',yl:'height y (m)'});
    if(free){c.fillStyle='rgba(255,107,115,0.35)';c.fillRect(f.X(this.WX-0.2),f.Y(this.WH),f.X(this.WX+0.2)-f.X(this.WX-0.2),f.Y(0)-f.Y(this.WH));if(this.keeper){c.fillStyle='rgba(255,176,74,0.35)';c.fillRect(f.X(this.D-0.5),f.Y(this.keeper),f.X(this.D)-f.X(this.D-0.5),f.Y(0)-f.Y(this.keeper));}}
    c.fillStyle='rgba(95,227,161,0.15)';c.fillRect(f.X(this.D),f.Y(this.BAR),f.X(this.D+2)-f.X(this.D),f.Y(0)-f.Y(this.BAR));
    c.strokeStyle=C.ink;c.lineWidth=2;line(c,f.X(this.D),f.Y(0),f.X(this.D),f.Y(this.BAR));line(c,f.X(this.D),f.Y(this.BAR),f.X(this.D+0.6),f.Y(this.BAR));
    const r=free?this.freeCalc(this.V.v,this.V.th):null,ok=free?(r.clear&&r.under):(()=>{const q=this.headerCalc(1);return q.yg<this.BAR-this.BR&&q.yg>this.BR;})();
    c.strokeStyle=ok?C.good:C.bad;c.lineWidth=2;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(f.X(p.x),f.Y(p.y)):c.moveTo(f.X(p.x),f.Y(p.y)));c.stroke();
    if(this.lastTrail&&this.lastTrail.length){c.fillStyle='rgba(255,176,74,0.6)';this.lastTrail.forEach(p=>{if(p.x>=0&&p.x<=24&&p.y<=y1)c.fillRect(f.X(p.x)-1,f.Y(p.y)-1,2,2);});}
    if(free){[[this.WX,r.yw],[this.D,r.yg]].forEach(([x,y])=>{if(y>0&&y<y1){c.fillStyle=C.pink;c.beginPath();c.arc(f.X(x),f.Y(y),4,0,Math.PI*2);c.fill();}});}
    return free?'Predicted flight from the equations. Red block: the wall. Green box: the goal mouth. Orange dots: your last real shot.':'Predicted header path with perfect timing. Orange dots: your last real attempt.';},
  result(){const r=this.res,o=this.outcome;
    const verdict={goal:'GOAL',wall:'Blocked by the wall',bar:'Hit the crossbar',over:'Over the bar',short:'No goal',mistimed:'Mistimed header',noheader:'No header'}[o]||'';
    if(!r||r.kind==='miss')return{title:'Header timing',big:verdict,sub:r&&r.tapped?`Your jump was ${fmt(Math.abs(r.err)*1000,0)} ms ${r.err<0?'early':'late'}. The window is about ±220 ms.`:'The ball flew past without a touch.',
      steps:[{h:'Why timing matters',p:'The ball moves about 10 m/s. In 0.1 s it covers a whole meter.',eq:'distance = speed × time = 10 m/s × 0.1 s = <em>1 m</em>'}],idea:'Tap when the ball is about one ball-width from your head.',quiz:QUIZ.kick};
    if(r.kind==='free')return{title:`v = ${fmt(r.v)} m/s at θ = ${r.th}°, g = ${fmt(r.g,2)}`,big:verdict,
      sub:`Math predicted ${fmt(r.yw,2)} m at the wall and ${fmt(r.yg,2)} m at the goal line.`,
      steps:[
        {h:'Split the launch',p:'Horizontal and vertical parts.',eq:`vx = <em>${fmt(r.vx,2)}</em>   vy = <em>${fmt(r.vy,2)}</em> m/s`},
        {h:'Height at the wall',p:'t = 9.15 ÷ vx, then plug t into the height equation.',eq:`t = ${fmt(r.tw,3)} s → y = <em>${fmt(r.yw,2)} m</em> (need > 1.85 + ball radius)`},
        {h:'Height at the goal line',p:'Same equation at 21 m.',eq:`t = ${fmt(r.tg,3)} s → y = <em>${fmt(r.yg,2)} m</em> (need < 2.44 − ball radius)`},
        {h:'Highest point',p:'Where vy reaches zero.',eq:`h = <em>${fmt(r.hp,2)} m</em> at t = ${fmt(r.tp,2)} s`},
        {h:'Kick force',p:'0 to v in 9 ms.',eq:`F = 0.43 × ${fmt(r.v)} / 0.009 = <em>${fmt(r.F,0)} N</em>`}],
      idea:'Try the Moon (g = 1.62). Same kick, gravity six times weaker: the ball sails far over the bar. To score there you need a much flatter, slower shot. The equations tell you exactly how much.',quiz:QUIZ.kick};
    return{title:`Header at θ = ${r.th}°`,big:verdict,sub:`Timing ${Math.round(r.q*100)}% of perfect gave a head speed of ${fmt(r.vHead)} m/s.`,
      steps:[
        {h:'Ball coming in',p:'Size of the incoming velocity vector.',eq:`|v_in| = <em>${fmt(r.vinM)} m/s</em>`},
        {h:'Ball going out',p:'Bounce plus the push from your head and neck.',eq:`v_out = <em>${fmt(r.vout)} m/s</em> at ${r.th}°`},
        {h:'Change in velocity',p:'Subtract vectors, not speeds.',eq:`|Δv| = <em>${fmt(r.dvM)} m/s</em>`},
        {h:'Force on your forehead',p:'Over 12 ms of contact.',eq:`F = 0.43 × ${fmt(r.dvM)} / 0.012 = <em>${fmt(r.F,0)} N</em>`},
        {h:'Height at the goal line',p:`${fmt(r.d)} m to travel.`,eq:`y = <em>${fmt(r.yg,2)} m</em>`}],
      idea:'Redirecting a ball takes more force than pushing it straight on, because Δv counts the change in direction too.',quiz:QUIZ.kick};}
};

/* =====================================================================
   DRIBBLE (Kick lab · 3rd-person 1v1 with feints)
   x = toward goal (m), y = lateral (+ = screen right), z = height
   ===================================================================== */
