function badgeAir(K){const D=K.duel;if(!D||D.counted)return;D.counted=true;best.airW=(best.airW||0)+1;if(D.i===(best.duelW||0)&&(best.duelW||0)<DEFS.length-1){best.duelW=(best.duelW||0)+1;setTimeout(()=>toast(`You beat ${D.name} in the air`,`Next marker: ${DEFS[best.duelW].name}`),1600);}if(best.airW>=3)badge('k_air');saveBest();}
const DEFS=[
  {name:'Rio',tr:0.40,a:5.0,vm:4.5,read:0.15,reach:0.9,chase:6.2,col:'#d4553a',twist:'Slow to react. Bites on almost any lean.'},
  {name:'Dex',tr:0.33,a:5.8,vm:5.0,read:0.25,reach:0.95,chase:6.6,col:'#c0392b',twist:'Quicker feet. Sell the feint a little longer.'},
  {name:'Mo',tr:0.28,a:6.5,vm:5.5,read:0.35,reach:1.0,chase:7.0,col:'#a53a6b',twist:'Patient. Ignores quick shimmies.'},
  {name:'Tank',tr:0.24,a:7.2,vm:6.0,read:0.45,reach:1.1,chase:7.2,col:'#7a2d3a',twist:'Long legs: 1.1 m reach. Needs a big gap.'},
  {name:'Captain Kai',tr:0.20,a:8.0,vm:6.5,read:0.55,reach:1.1,chase:7.6,col:'#4a1f5c',twist:'The best defender. Only a long, committed feint fools him.'}];
const DR={DX:18,GOAL:40,SHOOT:24,LAT:11,LEANT:0.22,F:560,CY:150,CH:2.75,BACK:5.25,PM:75};
const yPath=(t,v0,a,vm)=>{if(t<=0)return 0;const t1=Math.max(0,(vm-v0)/a);if(t<t1)return v0*t+0.5*a*t*t;return v0*t1+0.5*a*t1*t1+vm*(t-t1);};
const MOVES={step:{name:'Step-over',need:1,by:'Rio',sub:'sells 0.3 s of feint'},croq:{name:'La Croqueta',need:3,by:'Mo',sub:'quick sideways shift'},elas:{name:'Elastico',need:4,by:'Tank',sub:'flick out, snap back'},spin:{name:'360 Roulette',need:5,by:'Captain Kai',sub:'spin around him'},drag:{name:'Drag-back',need:2,by:'Dex',sub:'stop dead, he lunges'},cruyff:{name:'Cruyff turn',need:3,by:'Mo',sub:'fake a shot, turn 90°'},nut:{name:'Nutmeg',need:4,by:'Tank',sub:'through his legs'},rainbow:{name:'Rainbow flick',need:5,by:'Captain Kai',sub:'flick it over his head'}};
const GKS=[{name:'Benny',tr:0.3,a:16,reach:1.0},{name:'Sal',tr:0.27,a:17,reach:1.05},{name:'Ivo',tr:0.24,a:18,reach:1.1},{name:'Big Ola',tr:0.24,a:16,reach:1.35},{name:'The Cat',tr:0.18,a:22,reach:1.2}],GKX=39.4,SHOT_V=21;
const SHV={drive:24,curl:19},MAG=0.045,WALL_V0=3.2;
const AIR={rho:1.2,Cd:0.25,A:0.038,m:0.43};
/* player styles: original archetypes, with body numbers in the range measured for elite pros */
const PLAYERS={you:{n:'You',d:'set every dial yourself',h:1.80,m:75,top:0,agil:1,shot:0,jump:0,skill:1,num:'10',kit:'#2f4a86'},
  wiz:{n:'The Wizard',d:'tiny, low, glued-on touch',h:1.70,m:68,top:9.6,agil:1.3,shot:27,jump:2.7,skill:0.85,num:'10',kit:'#6d3fbf',why:'low center of mass: the lower your hips, the faster you can lean into a cut'},
  rocket:{n:'The Rocket',d:'top speed 38 km/h',h:1.78,m:73,top:10.6,agil:1.1,shot:29,jump:3.0,skill:1.0,num:'7',kit:'#1f8a70',why:'top speed 10.6 m/s: defenders who chase at 6 to 7 m/s never catch up'},
  tower:{n:'The Tower',d:'1.95 m, 88 kg, thunder shot',h:1.95,m:88,top:10.0,agil:0.85,shot:33,jump:3.1,skill:1.15,num:'9',kit:'#b8862b',why:'more mass means more momentum (p = m·v): tacklers bounce off'},
  trick:{n:'The Trickster',d:'every skill move, fast feet',h:1.75,m:68,top:9.7,agil:1.2,shot:27,jump:2.8,skill:0.7,num:'11',kit:'#c2366b',all:true,why:'quick feet: each skill move takes 30% less time'},
  cannon:{n:'The Cannon',d:'huge leap, knuckleball king',h:1.87,m:84,top:9.9,agil:0.95,shot:33,jump:3.6,skill:1.0,num:'17',kit:'#c0392b',kn:1.6,why:'jump take-off 3.6 m/s: h = v₀²÷2g ≈ 0.66 m of air'}};
function PLY(){return PLAYERS[Kick.opt.pl]||PLAYERS.you;}
function playerLook(id=Kick.opt.pl,overrides={}){const P=PLAYERS[id]||PLAYERS.you,A=GAME_CORE.playerAppearance(id,overrides),identity=globalThis.KickLabProfileAvatarArt.gameplay(profileManager.active().avatar,'kick');return Object.assign({},A,identity,overrides,{kit:overrides.kit||identity.kit,hs:identity.build,ws:identity.build});}
function applyPlayer(){const P=PLY();if(Kick.opt.pl==='you')return;const set=(k,v)=>{if(!isLocked('kick',k))Kick.V[k]=v;};set('run',+(Math.min(9,P.top/1.22)).toFixed(1));set('vs',P.shot);set('jv',P.jump);}
const STADIUMS={home:{n:'Home ground',d:'sea level',g:9.81,rho:1.2,sky:['#070d1d','#1a2a4a']},alt:{n:'High altitude',d:'2,240 m up · thin air',g:9.78,rho:0.96,sky:['#0b1430','#2a4370']},mars:{n:'Mars dome',d:'g 3.71 · almost no air',g:3.71,rho:0.02,sky:['#1f0c08','#6b2e1c']},moon:{n:'Moon',d:'g 1.62 · no air at all',g:1.62,rho:0,sky:['#000000','#0b0f1a']}};
// Presentation only. These values never enter stadium, weather, or ball equations.
const KICK_LIGHTING={
  day:{sky:['#4c9dd2','#a9d8ef','#d8e9e3'],fog:'#bed8d8',fogNear:115,fogFar:300,hemiSky:0xe8f5ff,hemiGround:0x526d50,hemi:1.12,ambient:.24,sun:0xfff1d5,sunPower:2.05,sunOffset:[-25,48,30],lamp:.04,exposure:1.01},
  dusk:{sky:['#344778','#e49d76','#f2c2a1'],fog:'#b99191',fogNear:88,fogFar:245,hemiSky:0xffdcc7,hemiGround:0x435063,hemi:.79,ambient:.18,sun:0xffb778,sunPower:1.48,sunOffset:[-36,23,25],lamp:.72,exposure:1.04},
  night:{sky:['#07101f','#20365c','#364a71'],fog:'#304667',fogNear:82,fogFar:230,hemiSky:0xcfe0ff,hemiGround:0x1b3322,hemi:.55,ambient:.12,sun:0xd6e4ff,sunPower:1.15,sunOffset:[-18,38,22],lamp:1.35,exposure:1.08}
};
const PITCHES={grass:{n:'Grass',e:0.55,f:0.22,roll:0.35,d:'e 0.55 · grips'},turf:{n:'Turf',e:0.7,f:0.1,roll:0.18,d:'e 0.70 · bouncy'},wet:{n:'Wet pitch',e:0.4,f:0.04,roll:0.08,d:'e 0.40 · skids fast'}};
const WEATHER={calm:{n:'Calm',base:0,gust:0,d:'no wind'},breezy:{n:'Breezy',base:1.5,gust:0.8,d:'steady crosswind'},gusty:{n:'Gusty',base:1.0,gust:3.0,d:'changes mid-flight'}};
function stad(){return STADIUMS[Kick.opt.stad]||STADIUMS.home;}function pitch(){return PITCHES[Kick.opt.pitch]||PITCHES.grass;}function wx(){return WEATHER[Kick.opt.wx]||WEATHER.calm;}
/* ---------- Kit Room: ball + boots ---------- */
const KIT_DEF=GAME_CORE.KIT_DEFAULTS;
const KITS=Object.fromEntries(Object.entries(GAME_CORE.KIT_CATALOG).map(([key,group])=>[key,{label:group.label,eq:group.eq,why:group.why,o:group.options}]));
function kit(){return GAME_CORE.normalizeKit(best.kit||{});}
function KI(k){return KITS[k].o[kit()[k]]||KITS[k].o[KIT_DEF[k]];}
function kitDefault(){const K=kit();return Object.keys(KIT_DEF).every(k=>K[k]===KIT_DEF[k]);}
function kitState(K=kit(),extra={}){return GAME_CORE.kitMetrics(K,Object.assign({temperatureC:temp().c,pitch:(typeof Kick!=='undefined'&&Kick.opt.pitch)||'grass',rho:AIR.rho,airOn:typeof airOn==='function'?airOn():true,baseShotSpeed:typeof Kick!=='undefined'?Kick.V.vs:24},extra));}
function kitLook(K=kit()){return GAME_CORE.kitAppearance(K);}
function ballM(K=kit()){return kitState(K).ballMass;}
function kitShot(K=kit()){return kitState(K).shotMultiplier;}
function kitTouch(K=kit()){return kitState(K).touchMultiplier;}
function kitReach(K=kit()){return kitState(K).reachMultiplier;}
function kitMu(K=kit()){return kitState(K).gripMultiplier;}
function kitSpin(K=kit()){return kitState(K).spinMultiplier;}
function applyKit(){const S=kitState();AIR.m=S.ballMass;AIR.A=S.ballArea;AIR.Cd=KI('surf').Cd;}
const TEMPS={cold:{n:'Freezing',c:-5,d:'−5 °C · night game'},cool:{n:'Cool',c:10,d:'10 °C · autumn'},mild:{n:'Mild',c:20,d:'20 °C · baseline'},hot:{n:'Hot',c:35,d:'35 °C · summer'}};
function temp(){return TEMPS[(typeof Kick!=='undefined'&&Kick.opt.temp)||'mild']||TEMPS.mild;}
function tK(){return 273.15+temp().c;}
const PATM=1.013,T_PUMP=293.15;
function ballBar(K=kit()){return kitState(K).pressureBar;}
function eOfBar(b){return GAME_CORE.restitutionAtPressure(b);}
function kitE(K=kit()){return kitState(K).restitution;}
const STRIKE={mid:{n:'Through the middle',d:'no up/down spin · full power',w:0,f:1},over:{n:'Over the top',d:'topspin: clears the wall, then dips',w:1,f:0.92},under:{n:'Under the ball',d:'backspin: floats and rises',w:-1,f:0.92}},STRIKE_W=5;
function strikeOf(fin){return fin==='knuck'?STRIKE.mid:(STRIKE[Kick.opt.strike]||STRIKE.mid);}
function strikeF(fin){return strikeOf(fin).f;}
function strikeAz(v,fin){const S=strikeOf(fin);return S.w?-S.w*MAG*kitSpin()*STRIKE_W*v*(AIR.rho/1.2):0;}
function applyWorld(){const S=stad();AIR.rho=+(S.rho*T_PUMP/tK()).toFixed(3);G0=M===Kick?S.g:9.81;applyKit();}
function airOn(){const o=Kick.opt.air||'auto';return AIR.rho>0&&(o==='on'||(o==='auto'&&assistLevel('kick')<2)||stad().rho!==1.2);}
function dragK(K=kit()){return kitState(K).dragFactor;}
function shotV(fin){return Kick.V.vs*kitShot()*strikeF(fin)*(fin==='curl'?0.8:fin==='knuck'?1.05:1);}
function wallH(tau){return tau<=0?0:Math.max(0,WALL_V0*tau-0.5*G0*tau*tau);}
function ballTick(b,dt){const k=dragK();if(k){const v=Math.hypot(b.vx,b.vy,b.vz);b.vx-=k*v*b.vx*dt;b.vy-=k*v*b.vy*dt;b.vz-=k*v*b.vz*dt;
    if(b.kn){const K=b.kn;K.t+=dt;b.vy+=K.amp*v*v*Math.sin(K.w*K.t+K.ph)*dt;b.vz+=0.6*K.amp*v*v*Math.sin(1.37*K.w*K.t+K.ph2)*dt;}}
  if(b.wind&&b.z>0.05){const Wd=b.wind;Wd.t+=dt;b.vy+=(Wd.base+Wd.gust*Math.sin(Wd.w*Wd.t+Wd.ph))*dt*(Wd.sim?0:1)+(Wd.sim?Wd.base*dt:0);}
  b.vz+=((b.amz||0)-G0)*dt;b.vy+=(b.am||0)*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z=Math.max(0,b.z+b.vz*dt);
  if(b.z===0&&b.vz<0){const P=pitch();if(b.vz<-1){b.bounces=(b.bounces||0)+1;b.lastHit={vz:b.vz,e:P.e};b.vz*=-P.e;b.vx*=1-P.f;b.vy*=1-P.f;b.am=0;b.amz=0;}else{b.vz=0;const r=Math.pow(1-Math.min(0.9,P.roll),dt);b.vx*=r;b.vy*=r;}}}
function reachEff(K,z){return K.reach*(z>1.5?0.8:z<0.5?0.9:1);}
function gkTick(g,K,bh,tNow,dt){let seen=null;const ts=tNow-K.tr;for(const h of bh){if(h.t<=ts)seen=h;else break;}
  if(seen&&seen.vx>0){const tc=Math.max(0,(GKX-seen.x)/seen.vx),tgt=clamp(seen.y+seen.vy*tc,-4.5,4.5),dy=tgt-g.y,stop=g.vy*g.vy/(2*K.a);g.tgt=tgt;g.seen=true;
    if(Math.abs(dy)>K.reach*0.35&&!(Math.sign(g.vy)===Math.sign(dy)&&stop>=Math.abs(dy)-K.reach*0.35))g.vy+=Math.sign(dy)*K.a*dt;else g.vy-=Math.sign(g.vy)*Math.min(Math.abs(g.vy),K.a*dt);
    g.vy=clamp(g.vy,-10,10);if(Math.abs(g.vy)>0.5)g.dir=Math.sign(g.vy);g.dive=Math.min(1,(g.dive||0)+dt*(Math.abs(g.vy)>1?4:0.5));}
  g.y+=g.vy*dt;}
/* ---------- goalkeeper + passing data ---------- */
const GK_SCN=[{n:'Penalty',x:29,y:0,run:false},{n:'Edge of the box',x:22,y:3,run:false},{n:'Angled run',x:26,y:-8,run:true},{n:'Long range',x:17,y:-2,run:false},{n:'Breakaway 1v1',x:28,y:2,run:true},{n:'Tight angle',x:33,y:8,run:true}];
const STRK=[{name:'Rio',v:17,acc:1.3,chip:0,hon:0.85,col:'#d4553a'},{name:'Dex',v:18.5,acc:1.1,chip:0.25,hon:0.75,col:'#c0392b'},{name:'Mo',v:19.5,acc:0.9,chip:0.4,hon:0.65,col:'#a53a6b'},{name:'Tank',v:21,acc:0.75,chip:0.5,hon:0.55,col:'#7a2d3a'},{name:'Captain Kai',v:22.5,acc:0.6,chip:0.6,hon:0.45,col:'#4a1f5c'}];
const PASSL=[{tr:0.5,a:6,vm:4.2,press:1.4},{tr:0.42,a:7,vm:4.8,press:1.8},{tr:0.36,a:7.5,vm:5.3,press:2.1},{tr:0.3,a:8,vm:5.8,press:2.4},{tr:0.25,a:8.5,vm:6.3,press:2.7}],PASS_CTRL=16,PASS_TH=30*Math.PI/180,MATES=[{name:'Kim',num:'7'},{name:'Zara',num:'11'},{name:'Leo',num:'8'}];
const PASS_SC=[
  {n:'Find the runner',m:[{x:16,y:-7,vx:5.5,vy:0.8},{x:15,y:7,vx:6,vy:-0.4}],d:[{x:19,y:-2.5},{x:20,y:4}]},
  {n:'Split the defence',m:[{x:15,y:-4,vx:6.5,vy:0.6},{x:17,y:5,vx:5,vy:-0.8}],d:[{x:20,y:-3},{x:21,y:1},{x:20,y:5.5}]},
  {n:'Through ball',m:[{x:17,y:-2,vx:7,vy:0.5},{x:14,y:8,vx:5,vy:0}],d:[{x:21,y:-4.5},{x:21,y:0.5},{x:21,y:5}]},
  {n:'Switch the play',m:[{x:14,y:10,vx:6,vy:-0.5},{x:15,y:-5,vx:5,vy:0}],d:[{x:17,y:-2},{x:19,y:5},{x:18,y:-6}]},
  {n:'Over the top',m:[{x:24,y:-3,vx:6,vy:0},{x:16,y:6,vx:5,vy:0.3}],d:[{x:16,y:-1.5},{x:17,y:-5},{x:18,y:2}]}];
const OUTSIDE_NEED=2,SK_DUR={step:0.35,croq:0.22,elas:0.28,spin:0.6,drag:0.4,cruyff:0.4,nut:0.55,rainbow:0.3},RB_VZ=6.5,NUT_V=9;
function headReach(D){return+(1.75+0.3*D.reach).toFixed(2);}
function moveOK(id){if(typeof Kick!=='undefined'&&PLY().all)return true;const n=best.drib||0;return id==='out'?n>=OUTSIDE_NEED:!!MOVES[id]&&n>=MOVES[id].need;}
