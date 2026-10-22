(function installRaceGarage(root){
  'use strict';
  const DEFAULT=Object.freeze({version:1,body:'street',suspension:'balanced',tires:'balanced',brakes:'standard'});
  const PARTS=Object.freeze({
    body:Object.freeze({label:'Body',choices:Object.freeze([
      {id:'kart',name:'Go-kart',detail:'Quick launch · lower top speed',coach:'Light and lively. Turn gently when the rear starts to move.',stability:.82},
      {id:'street',name:'Street car',detail:'Steady all-round build',coach:'A balanced place to learn the braking and corner line.',stability:1},
      {id:'race',name:'Race car',detail:'Fast straight · less forgiving',coach:'More speed asks for an earlier brake point.',stability:.9}
    ])}),
    suspension:Object.freeze({label:'Suspension',choices:Object.freeze([
      {id:'soft',name:'Soft',detail:'Calm over bumps · slower turn-in',coach:'The body settles smoothly, but give the wheel an extra beat.',response:.78,recovery:1.2,transfer:.72},
      {id:'balanced',name:'Balanced',detail:'Predictable response',coach:'Balanced springs make a clear starting point.',response:1,recovery:1,transfer:1},
      {id:'firm',name:'Firm',detail:'Sharp turn-in · slower recovery',coach:'Sharper steering asks you to unwind sooner after a slide.',response:1.18,recovery:.78,transfer:1.18}
    ])}),
    tires:Object.freeze({label:'Wheels & tires',choices:Object.freeze([
      {id:'narrow',name:'Narrow',detail:'Low rolling loss · less grip',coach:'Narrow tires roll freely; slow a little more for the corner.',grip:.92,turnIn:.94,rolling:.82,heat:.75,profile:'Narrow road tire'},
      {id:'balanced',name:'Standard',detail:'Even grip and rolling',coach:'Standard tires balance corner grip and rolling resistance.',grip:1,turnIn:1,rolling:1,heat:1,profile:'Standard road tire'},
      {id:'wide',name:'Wide',detail:'More grip · more heat and drag',coach:'Wide tires bite harder, then warm up faster under load.',grip:1.1,turnIn:1.08,rolling:1.2,heat:1.28,profile:'Wide performance tire'}
    ])}),
    brakes:Object.freeze({label:'Brakes',choices:Object.freeze([
      {id:'standard',name:'Standard',detail:'Predictable stopping',coach:'Brake in a straight line before the turn.',power:1,heat:1,fade:1,mass:0},
      {id:'sport',name:'Sport',detail:'Stronger first stop · quicker fade',coach:'Strong first bite. Repeated hard braking warms this package.',power:1.16,heat:1.35,fade:1.3,mass:12},
      {id:'endurance',name:'Endurance',detail:'Cooler repeats · softer first stop',coach:'Softer bite stays steady through repeated stops.',power:.94,heat:.65,fade:.65,mass:16}
    ])})
  });
  const fields=Object.keys(PARTS);
  const option=(field,id)=>PARTS[field].choices.find(choice=>choice.id===id);
  function normalize(raw){if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1||fields.some(field=>!option(field,raw[field])))return{...DEFAULT};return{version:1,...Object.fromEntries(fields.map(field=>[field,raw[field]]))};}
  function isStock(build){return fields.every(field=>build[field]===DEFAULT[field]);}
  function parameters(base,raw){const build=normalize(raw),body=option('body',build.body),suspension=option('suspension',build.suspension),tires=option('tires',build.tires),brakes=option('brakes',build.brakes);return{...base,m:base.m+brakes.mass,mu:base.mu*tires.grip,...('tireMu'in base?{tireMu:base.tireMu*tires.grip}:{}),garageStock:isStock(build),stability:body.stability,response:suspension.response,recovery:suspension.recovery,transfer:suspension.transfer,turnIn:tires.turnIn,rolling:tires.rolling,tireHeat:tires.heat,brakePower:brakes.power,brakeHeat:brakes.heat,brakeFade:brakes.fade};}
  function summary(P){const g=9.81,speed=20;return{mass:P.m,launch:Math.min(P.F/P.m,P.mu*g),corner:Math.sqrt(P.mu*g*P.R)*3.6,stop:speed*speed/(2*.95*P.mu*g*P.brakePower),grip:P.mu,steeringResponse:P.response*P.stability*P.turnIn,slideRecovery:P.recovery};}
  function response(s,P,wheel,brake,dt){if(P.garageStock){s.garageBrakeFactor=1;s.garageBrakeHeat=0;return{wheel,muFactor:1,brakeFactor:1};}const h=Math.min(.02,Math.max(0,dt)),target=wheel*P.turnIn;s.garageSteer=(s.garageSteer??0)+(target-(s.garageSteer??0))*Math.min(1,h*8*P.response*P.stability);s.garageLoad=(s.garageLoad||0)+(Math.min(1,Math.abs(s.garageSteer)/90+brake*.45)-(s.garageLoad||0))*Math.min(1,h*4/P.response);s.garageTireHeat=Math.max(0,Math.min(1,(s.garageTireHeat||0)+h*(Math.abs(s.garageSteer)/180*(s.v||0)/30*.16+brake*.1)*P.tireHeat-h*.055));s.garageBrakeHeat=Math.max(0,Math.min(1,(s.garageBrakeHeat||0)+h*brake*(s.v||0)/24*.2*P.brakeHeat-h*(brake?.025:.09)));s.garageRecovery=Math.max(0,(s.garageRecovery||0)-h*P.recovery);const muFactor=Math.max(.75,1-s.garageLoad*.055*P.transfer-s.garageTireHeat*.12-Math.min(.1,s.garageRecovery*.08));const brakeFactor=P.brakePower*Math.max(.68,1-s.garageBrakeHeat*.32*P.brakeFade);s.garageBrakeFactor=brakeFactor;return{wheel:s.garageSteer,muFactor,brakeFactor};}
  function afterStep(s,P){if(!P.garageStock&&s.slide)s.garageRecovery=Math.max(s.garageRecovery||0,.45/P.recovery);}
  root.KickLabRaceGarage=Object.freeze({DEFAULT,PARTS,fields,option,normalize,isStock,parameters,summary,response,afterStep});
})(typeof globalThis!=='undefined'?globalThis:window);
