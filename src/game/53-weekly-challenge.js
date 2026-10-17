/* ---------- family weekly challenge ---------- */
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return t.getUTCFullYear()+'-W'+String(Math.ceil(((t-y0)/864e5+1)/7)).padStart(2,'0');}
function seedRng(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;return(h>>>0)/4294967296;};}
const WEEKLY=(()=>{const key=isoWeek(new Date()),r=seedRng('impactlab-'+key),pick=a=>a[Math.floor(r()*a.length)];
  const stad=pick(['home','home','home','alt','alt','mars','moon']),airy=STADIUMS[stad].rho>0.5;
  const set={stad,temp:pick(Object.keys(TEMPS)),wx:airy?pick(['calm','breezy','gusty','gusty']):'calm',pl:pick(Object.keys(PLAYERS)),air:'on',pitch:'grass'};
  const wkit={press:pick(['soft','match','match','hard']),size:pick(['5','5','4']),surf:pick(['tex','smooth']),studs:'fg',boot:'std'};
  const n=[TEMPS[set.temp].n,WEATHER[set.wx].n,STADIUMS[stad].n].join(' · ');
  return{key,set,kit:wkit,n,on:false,
    sig(){return Object.keys(this.set).every(k=>Kick.opt[k]===this.set[k])&&Object.keys(this.kit).every(k=>kit()[k]===this.kit[k]);},
    live(){return this.on&&M===Kick&&Kick.opt.shot==='dribble'&&Kick.opt.pso==='bar'&&!MATCH.on&&this.sig();},
    desc(){const K=this.kit;return`${PLAYERS[this.set.pl].n} · ${KITS.press.o[K.press].n.toLowerCase()} ${KITS.size.o[K.size].n} ${KITS.surf.o[K.surf].n.toLowerCase()} ball · ${TEMPS[this.set.temp].c} °C`;}};})();
const WKCAT={id:'wk'+WEEKLY.key.replace('-',''),n:'This week',u:'pts',hi:true,d:0,get:()=>best.wk&&best.wk.key===WEEKLY.key?best.wk.score:0,eq:'Same conditions for everyone. Crossbar challenge, 60 seconds.'};
BCATS.unshift(WKCAT);BOARD.cat=WKCAT.id;
function startWeekly(){closeBoard();if(MATCH.on)MATCH.stop();if(M!==Kick)setMode('kick');Object.assign(Kick.opt,WEEKLY.set);best.kit=Object.assign({},WEEKLY.kit);saveBest();applyWorld();if(!isLocked('kick','g'))Kick.V.g=stad().g;applyPlayer();WEEKLY.on=true;pickGame('bar');
  COACH.say(`Weekly challenge ${WEEKLY.key}: ${WEEKLY.n}. You play as ${PLAYERS[WEEKLY.set.pl].n} with a ${WEEKLY.desc().split(' · ')[1]}. Your dials are yours to tune; the conditions are the same for the whole family. Change any condition or kit and the run stops counting.`,'tip',18);}
function weeklyEnd(score){if(!WEEKLY.live())return;const cur=best.wk&&best.wk.key===WEEKLY.key?best.wk.score:0;if(score>cur){best.wk={key:WEEKLY.key,score};saveBest();setTimeout(()=>toast('Weekly best!',`${score} pts in ${WEEKLY.n}`),900);}
  if(score>cur&&BOARD.db&&BOARD.nick())setTimeout(postBoard,400);}
function drawWeekly(c){if(!WEEKLY.on||M!==Kick||Kick.opt.shot!=='dribble'||Kick.opt.pso!=='bar')return;const ok=WEEKLY.sig(),t=ok?`★ WEEKLY ${WEEKLY.key} · counts`:'WEEKLY · conditions changed, not counting';c.save();c.font='700 10px '+MONO;const w=c.measureText(t).width+18,x=16,y=162;c.fillStyle=ok?'rgba(255,159,67,0.92)':'rgba(6,11,24,0.85)';rr(c,x,y,w,18,9);c.fill();text(c,t,x+w/2,y+13,'700 10px '+MONO,ok?'#08101f':C.muted,'center');c.restore();}
setTimeout(()=>V3.load(),0);V3.onReady=()=>{if(M===Kick)renderOpts();};
function setMode(k){if(typeof closeSettings==='function'&&!$('#settingsDrawer').hidden)closeSettings({restore:false});if(typeof closeContextDetail==='function'&&CONTEXT_DETAILS.open)closeContextDetail({restore:false});if(MATCH.on&&k!=='kick')MATCH.stop();if(LIVEM.on&&k!=='kick')LIVEM.stop();setTimeout(applyWorld,0);exitReplay();$('#rvBack').hidden=true;if(M&&M.key!==k&&RECS[M.key]&&RECS[M.key].on)stopRec(M.key);if(!$('#dials').hidden){returnDialsContent();$('#dials').hidden=true;$('#dialTop').hidden=false;}PAUSE.on=false;PAUSE.resumeT=0;PAUSE.why='';M=MODES[k];E.slow=null;E.shake=0;PARTS.length=0;ENGINE.off();hideResults();applyCh(k);M.reset();renderAll(true);COACH.set(k);renderLog();resetTicker();resetFeed();syncLogHead();
  if(!(k==='fight'&&Fight.bout))E.title={t:0,text:{fight:'FIGHT LAB',race:'RACE LAB',kick:'KICK LAB'}[k],sub:curCh(k)?`Challenge ${best.ch[k]+1}: ${curCh(k).name}`:COACHES[k].name+' is in your corner'};document.querySelectorAll('.tab').forEach(t=>{const on=t.dataset.mode===k;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;});$('#game-cockpit').setAttribute('aria-labelledby',`lab-tab-${k}`);resize();}
document.querySelectorAll('.tab').forEach(t=>{t.addEventListener('click',()=>{unlock();SND.click();setMode(t.dataset.mode);});t.addEventListener('keydown',e=>{const tabs=[...document.querySelectorAll('.tab')],i=tabs.indexOf(t),n=e.key==='Home'?0:e.key==='End'?tabs.length-1:e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:-1;if(n<0)return;e.preventDefault();e.stopPropagation();tabs[n].focus();unlock();SND.click();setMode(tabs[n].dataset.mode);});});
$('#kitReset').addEventListener('click',()=>{best.kit=Object.assign({},KIT_DEF);saveBest();applyKit();renderKit();});
$('#kitroom').addEventListener('click',e=>{const c=e.target.closest('[data-k]');if(c){SND.click();setKit(c.dataset.k,c.dataset.v);}});
$('#boardBtn').addEventListener('click',()=>{SND.click();openBoard();});
$('#fbClose').addEventListener('click',closeBoard);
$('#fboard').addEventListener('click',e=>{if(e.target.id==='fbPlayWk'){unlock();SND.click();startWeekly();return;}if(e.target.id==='fboard')closeBoard();const c=e.target.closest('[data-c]');if(c){BOARD.cat=c.dataset.c;BOARD.arm=null;renderBoard();}
  const d=e.target.closest('.del');if(d&&BOARD.owner&&BOARD.db){const id=d.dataset.id;if(BOARD.arm===id){BOARD.arm=null;BOARD.db.collection('board').doc(id).delete().catch(()=>{});}else{BOARD.arm=id;renderBoard();}}});
$('#fbNick').addEventListener('input',e=>{BOARD.setNick(e.target.value);delete $('#fbMsg').dataset.hold;renderBoard();});
$('#fbNick').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')postBoard();});
$('#fbPost').addEventListener('click',postBoard);
$('#rBoard').addEventListener('click',e=>{if(e.target.id==='rPost'){e.stopPropagation();if(BOARD.nick())postBoard();else openBoard();}});
$('#mute').addEventListener('click',()=>{best.mute=!best.mute;saveBest();if(best.mute)ENGINE.off();$('#mute').setAttribute('aria-pressed',String(!!best.mute));$('#mute').textContent=best.mute?'Sound off':'Sound on';if(!best.mute){unlock();SND.click();}});
$('#mute').setAttribute('aria-pressed',String(!!best.mute));$('#mute').textContent=best.mute?'Sound off':'Sound on';
const primary=()=>M.actions().find(a=>a.primary).id;
const KEYMAP={Space:'P',ArrowUp:'P',KeyW:'P',ArrowDown:'brake',KeyS:'brake',KeyB:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyC:'center',KeyJ:'jab',Digit1:'jab',KeyK:'cross',Digit2:'cross',KeyL:'upper',Digit3:'upper',KeyX:'skill',KeyE:'skill'};
const held={};
window.addEventListener('keydown',e=>{if(!$('#kitroom').hidden){if(e.code==='Escape')closeKit();return;}if(!$('#fboard').hidden){if(e.code==='Escape')closeBoard();return;}if(!$('#rvBack').hidden&&e.code==='Escape'){$('#rvBack').hidden=true;return;}
  if(RP.on){if(e.target&&e.target.tagName==='INPUT')return;if(e.code==='Space'){e.preventDefault();$('#rbPlay').click();}else if(e.code==='Escape'){exitReplay();}else if(e.code==='ArrowLeft'){e.preventDefault();RP.t=Math.max(0,RP.t-1);}else if(e.code==='ArrowRight'){e.preventDefault();RP.t+=1;}return;}
  if(e.code==='KeyP'&&!e.repeat){e.preventDefault();$('#dials').hidden?openDials():closeDials();return;}if(e.code==='Escape'){closeDials();return;}
  if(e.target&&e.target.tagName==='INPUT'&&/Arrow/.test(e.key))return;if(PAUSE.on&&KEYMAP[e.code]&&!(e.target&&e.target.tagName==='INPUT')){e.preventDefault();if($('#dials').hidden)resumeGame();return;}
  const dd={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.code];let id=null;
  if(dd){const a=M.actions().find(x=>x.dir===dd);if(a&&a.disabled){e.preventDefault();return;}if(a&&a.step){e.preventDefault();adjustVar(a.step[0],a.step[1]);return;}if(a&&dialSel(a.id)){e.preventDefault();return;}if(a)id=a.id;}
  if(resOpen()){const k=KEYMAP[e.code];if(k==='P'||e.code==='Enter'||e.code==='NumpadEnter'){e.preventDefault();if(!e.repeat)ackResults();}else if(id||k)e.preventDefault();return;}
  if(!id)id=KEYMAP[e.code];if(!id)return;if(id==='P')id=primary();if(id==='brake'&&M.key==='fight')id='block';
  if(!M.actions().some(a=>a.id===id)&&!(id==='center'&&M.key==='race'))return;e.preventDefault();if(e.repeat||held[e.code])return;held[e.code]=id;unlock();M.press(id,true);padEls(id).forEach(b=>b.classList.add('on'));});
window.addEventListener('keyup',e=>{const id=held[e.code];if(!id)return;held[e.code]=false;M.press(id,false);padEls(id).forEach(b=>b.classList.remove('on'));});
/* stage pointer: tap to act, or drag the steering wheel in the race */
let canvasHeld=false,drag=null;
function cpt(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
cv.addEventListener('pointerdown',e=>{e.preventDefault();unlock();if(RP.on){$('#rbPlay').click();return;}if(PAUSE.on){if($('#dials').hidden)resumeGame();return;}if(resOpen()){ackResults();return;}
  if(M.key==='race'){const p=cpt(e),wh=Race.WH;if(Math.hypot(p.x-wh.x,p.y-wh.y)<wh.r+26&&Race.opt.steer==='you'){drag={id:e.pointerId,a:Math.atan2(p.y-wh.y,p.x-wh.x)};try{cv.setPointerCapture(e.pointerId);}catch(_){}}return;}
  if(E.slow&&E.slow.t>0.6){E.slow.t=Math.max(E.slow.t,E.slow.dur-0.4);return;}
  canvasHeld=true;M.press(primary(),true);});
cv.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const p=cpt(e),wh=Race.WH,a=Math.atan2(p.y-wh.y,p.x-wh.x);let d=a-drag.a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;drag.a=a;Race.wheel=clamp(Race.wheel-d/DEG,-180,180);});
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,e=>{if(drag&&e.pointerId===drag.id)drag=null;if(canvasHeld){canvasHeld=false;M.press(primary(),false);}}));
cv.addEventListener('dblclick',()=>{if(M.key==='race')Race.wheel=0;});

