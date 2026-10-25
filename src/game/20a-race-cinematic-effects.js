/* Presentation-only Race effects. Physics and result state stay in Race. */
const RACE_CINEMATIC_FX={
  attach(view){
    if(!view.scene||!view.car||!RACE_TELEMETRY.enabled)return;
    this.clear(view,true);
    const T=THREE,car=view.car,scene=view.scene,loader=new T.TextureLoader(),smokeTexture=loader.load('assets/effects/race/v1/soft-turbulent-smoke.png'),tireFrames=Array.from({length:8},(_,index)=>loader.load(`assets/effects/race/v1/tire-smoke-${String(index).padStart(2,'0')}.webp`)),particles=[];
    smokeTexture.colorSpace=T.SRGBColorSpace;
    for(const frame of tireFrames)frame.colorSpace=T.SRGBColorSpace;
    for(let i=0;i<64;i++){
      const material=new T.SpriteMaterial({map:smokeTexture,color:0xc8cbd0,transparent:true,opacity:0,depthWrite:false,alphaTest:.015});
      const mesh=new T.Sprite(material);mesh.visible=false;scene.add(mesh);
      particles.push({mesh,life:0,age:0,kind:'',velocity:new T.Vector3(),frame:-1,baseScale:0});
    }
    const markGeometry=new T.BoxGeometry(1,.004,1),markMaterial=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.58,depthWrite:false}),marks=new T.InstancedMesh(markGeometry,markMaterial,256);
    marks.count=0;marks.frustumCulled=false;scene.add(marks);
    const coreCanvas=document.createElement('canvas');coreCanvas.width=128;coreCanvas.height=64;const coreContext=coreCanvas.getContext('2d'),corePixels=coreContext.createImageData(128,64);
    for(let y=0;y<64;y++)for(let x=0;x<128;x++){const u=x/127,v=Math.abs((y-31.5)/31.5),width=(.23+.22*Math.sin(Math.PI*u))*(1-.38*u),edge=Math.max(0,Math.min(1,(width-v)*7)),fade=(1-u)*(.74+.26*Math.sin(u*21)**2),index=(y*128+x)*4;corePixels.data[index]=168+Math.round(87*(1-u));corePixels.data[index+1]=210+Math.round(45*(1-u));corePixels.data[index+2]=255;corePixels.data[index+3]=Math.round(210*edge*fade);}
    coreContext.putImageData(corePixels,0,0);const coreTexture=new T.CanvasTexture(coreCanvas);coreTexture.colorSpace=T.SRGBColorSpace;
    const flames=[];
    for(const side of ['Left','Right']){
      const marker=car.getObjectByName('Exhaust'+side);if(!marker)continue;
      const material=new T.SpriteMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,depthTest:false,alphaTest:.01,toneMapped:false}),sprite=new T.Sprite(material);
      const core=new T.Sprite(new T.SpriteMaterial({map:coreTexture,color:0xd5f4ff,transparent:true,opacity:0,depthWrite:false,depthTest:false,alphaTest:.01,toneMapped:false}));
      const wisp=new T.Sprite(new T.SpriteMaterial({map:smokeTexture,color:0xffa965,transparent:true,opacity:0,depthWrite:false,depthTest:false,alphaTest:.01,toneMapped:false}));
      for(const layer of [sprite,core,wisp]){layer.visible=false;layer.renderOrder=9;car.add(layer);}
      flames.push({sprite,core,wisp,marker,map:null,side:side==='Left'?0:1,frame:-1});
    }
    const fx={particles,smokeTexture,tireFrames,particleCursor:0,particleTick:0,coreTexture,flameAtlas:null,flames,flameEnergy:0,visualClock:0,marks,markGeometry,markMaterial,markEntries:[],lastContact:new Map(),markCursor:0,markTick:0,tireTick:0,tireEvent:'none',internals:null,assetReady:false,assetError:null,pendingSuccess:null,cutaway:null,materials:[],lastBoost:false,lastNitro:Race.st?.nitro??1,launch:null,shiftTriggered:false,cutawayGate:null,milestones:null,loadTransfer:0,driftEnergy:0,audit:{boost:{reason:'waiting',starts:0,ends:0},launch:{reason:'waiting',starts:0,ends:0},shift:{reason:'waiting',starts:0,ends:0},cutaway:{reason:'waiting',starts:0,ends:0}},counts:{vapor:0,tire:0,marks:0}};
    fx.flameAtlas=new T.TextureLoader().load('assets/effects/race/v1/nitrous-flame-atlas.webp',atlas=>{if(view.cinematicFx!==fx)return;atlas.colorSpace=T.SRGBColorSpace;for(const flame of flames){const map=atlas.clone();map.repeat.set(.25,.5);map.offset.set(0,.5);map.needsUpdate=true;flame.map=map;flame.sprite.material.map=map;flame.sprite.material.needsUpdate=true;}});
    view.cinematicFx=fx;this.loadInternals(view,fx);
  },
  loadInternals(view,fx){
    const T=THREE,token=view.loadToken,colors={chassis:0x84d5dc,drivetrain:0xffb95e,suspension:0x77dea1,brakes:0xff6d52,cooling:0x78caff};
    new T.GLTFLoader().load('assets/3d/kicklab-race-internals/v1/race-internals.glb',gltf=>{
      if(view.cinematicFx!==fx||view.loadToken!==token)return;
      const group=gltf.scene,vehicle=Race.vehicle(),parts={};group.name='RaceSuccessCutaway';group.visible=false;group.scale.set(vehicle.lengthM/4.5,1,vehicle.widthM/1.85);
      for(const key of Object.keys(colors)){
        const part=group.getObjectByName('System_'+key);if(!part){fx.assetError='Missing '+key;return;}
        part.userData.basePosition=part.position.clone();
        part.traverse(mesh=>{if(!mesh.isMesh)return;mesh.renderOrder=12;const clone=material=>{const copy=material.clone();copy.transparent=true;copy.depthWrite=false;copy.depthTest=false;copy.opacity=.1;return copy;};mesh.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);});parts[key]=part;
      }
      const sweep=new T.Mesh(new T.BoxGeometry(.035,1.05,vehicle.widthM*.96),new T.MeshBasicMaterial({color:0x9ceaff,transparent:true,opacity:0,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,toneMapped:false}));
      sweep.renderOrder=13;sweep.position.y=.7;group.add(sweep);view.car.add(group);
      fx.internals={group,parts,sweep};fx.assetReady=true;
      if(fx.pendingSuccess){const pending=fx.pendingSuccess;fx.pendingSuccess=null;if(Race.state==='done'||pending.allowRun&&Race.state==='run')this.success(view,pending.system,pending.allowRun);}
    },undefined,error=>{if(view.cinematicFx===fx)fx.assetError=String(error?.message||error);});
  },
  emit(view,kind,origin,life,scale,color,velocity){
    const fx=view.cinematicFx;if(!fx)return;
    const particle=fx.particles[fx.particleCursor++%fx.particles.length];particle.kind=kind;particle.age=0;particle.life=life;particle.velocity.copy(velocity);
    particle.baseScale=scale;particle.frame=-1;particle.mesh.material.map=kind==='tire'?fx.tireFrames[0]:fx.smokeTexture;
    particle.mesh.position.copy(origin);particle.mesh.scale.set(scale,scale,1);particle.mesh.material.color.setHex(color);particle.mesh.material.opacity=kind==='vapor'?.13:.42;particle.mesh.visible=true;
    return particle;
  },
  roadContact(view,node){
    if(!node)return null;const p=node.getWorldPosition(new THREE.Vector3()),path=RACE_SYSTEMS.path(p.x,p.z,Race.P(),RACE_SYSTEMS.venue(Race.opt.venue));
    return Math.abs(path.e)<Race.HW-.35?new THREE.Vector3(p.x,.05,p.z):null;
  },
  tireState(launchState=null){
    const s=Race.st,t=Race.telemetry,slip=Math.abs(s.slipAngle||0);
    if((launchState||RACE_3D.cinematicFx?.launch)?.phase==='active')return 'launch';
    if(s.driftMode==='skid'&&t.braking>.55)return 'brake-lock';
    if(s.driftMode==='skid'&&s.skidTime>.12&&slip>.16)return 'spinout';
    if(s.driftMode==='drift'&&slip>.06)return 'drift';
    return 'none';
  },
  contactWheels(event,slip){
    if(event==='launch')return ['WheelRearLeft','WheelRearRight'];
    if(event==='drift')return slip>=0?['WheelRearRight','WheelRearLeft']:['WheelRearLeft','WheelRearRight'];
    return ['WheelFrontLeft','WheelFrontRight','WheelRearLeft','WheelRearRight'];
  },
  mark(view,wheel,point,event){
    const fx=view.cinematicFx,previous=fx.lastContact.get(wheel);fx.lastContact.set(wheel,point.clone());
    if(!previous)return;
    const dx=point.x-previous.x,dz=point.z-previous.z,length=Math.hypot(dx,dz);
    if(length<.08||length>2.8){if(length>2.8)fx.lastContact.delete(wheel);return;}
    const index=fx.markCursor++%256;
    fx.markEntries[index]={x:(point.x+previous.x)/2,z:(point.z+previous.z)/2,heading:-Math.atan2(dz,dx),length,width:event==='spinout'?.19:event==='brake-lock'?.17:event==='drift'?.13+fx.driftEnergy*.05:.13,age:0};
    fx.marks.count=Math.max(fx.marks.count,index+1);fx.counts.marks++;
  },
  drawCanvasTires(c,race){
    const s=race.st,now=performance.now(),state=this.canvasTires||(this.canvasTires={clock:0,lastNow:now,lastRaceTime:s.t,lastSample:0,event:'none',previous:new Map(),marks:[],puffs:[]});
    if(s.t<state.lastRaceTime||race.state==='grid'){state.clock=0;state.lastSample=0;state.previous.clear();state.marks.length=0;state.puffs.length=0;state.event='none';state.launch=null;}
    const elapsed=Math.min(.05,Math.max(0,(now-state.lastNow)/1000));state.lastNow=now;state.lastRaceTime=s.t;
    if(!PAUSE.on&&!document.hidden)state.clock+=elapsed;
    const analog=race.analogControl?.active?race.analogControl:null,gas=Math.max(Number(race.inp.gas)||0,analog?Math.max(0,-Number(analog.y||0)):0),brake=Math.max(Number(race.inp.brake)||0,analog?Math.max(0,Number(analog.y||0)):0);
    state.launch=globalThis.KickLabRaceEffectsContracts.launch(state.launch,{mode:race.mode().id,running:race.state==='run',paused:PAUSE.on,hidden:document.hidden,time:s.t,brake,gas,speed:s.v,slip:s.launchSlip||0});
    const event=race.state==='run'&&!PAUSE.on&&!document.hidden?this.tireState(state.launch):'none';
    if(event!==state.event){state.previous.clear();state.event=event;}
    if(event!=='none'&&state.clock-state.lastSample>=(reduce?.16:.09)){
      state.lastSample=state.clock;
      const contract=RACE_SYSTEMS.CONTRACT.wheels,forward=[Math.cos(s.th),Math.sin(s.th)],side=[-forward[1],forward[0]],P=race.P(),venue=RACE_SYSTEMS.venue(race.opt.venue);
      for(const name of this.contactWheels(event,s.slipAngle||0)){
        const key=name.replace('Wheel','').replace('Front','front').replace('Rear','rear'),pivot=contract[key[0].toLowerCase()+key.slice(1)]?.pivot;
        if(!pivot)continue;
        const point={x:s.x+forward[0]*pivot[0]+side[0]*pivot[2],y:s.y+forward[1]*pivot[0]+side[1]*pivot[2]};
        if(Math.abs(RACE_SYSTEMS.path(point.x,point.y,P,venue).e)>=race.HW-.35){state.previous.delete(name);continue;}
        const prior=state.previous.get(name),distance=prior?Math.hypot(point.x-prior.x,point.y-prior.y):0;
        if(prior&&distance>.08&&distance<2.8){state.marks.push({a:prior,b:point,at:state.clock});if(state.marks.length>192)state.marks.shift();}
        state.previous.set(name,point);
        if(state.puffs.length<32||state.puffs[0].at<state.clock-1.1){state.puffs.push({x:point.x,y:point.y,vx:reduce?0:-forward[0]*s.v*.05+side[0]*(s.slipAngle||0)*s.v*.07,vy:reduce?0:-forward[1]*s.v*.05+side[1]*(s.slipAngle||0)*s.v*.07,at:state.clock,event});if(state.puffs.length>32)state.puffs.shift();}
      }
    }
    state.marks=state.marks.filter(mark=>state.clock-mark.at<5.5);
    state.puffs=state.puffs.filter(puff=>state.clock-puff.at<1.45);
    c.save();c.lineCap='round';
    for(const mark of state.marks){const fade=1-(state.clock-mark.at)/5.5;c.strokeStyle=`rgba(7,9,12,${(.68*fade).toFixed(3)})`;c.lineWidth=reduce?1.7:2.3;line(c,race.sx(mark.a.x),race.sy(mark.a.y),race.sx(mark.b.x),race.sy(mark.b.y));}
    for(const [index,puff] of state.puffs.entries()){
      const age=state.clock-puff.at,fade=Math.max(0,1-age/1.45),radius=(reduce?7:12)+age*(reduce?8:puff.event==='spinout'?20:16),x=race.sx(puff.x+puff.vx*age),y=race.sy(puff.y+puff.vy*age),offset=Math.sin(index*2.4+age*3)*radius*.35;
      if(reduce&&puff.event==='spinout'){c.beginPath();c.strokeStyle=`rgba(255,173,90,${(.65*fade).toFixed(3)})`;c.lineWidth=2;c.arc(x,y,10,0,Math.PI*2);c.stroke();}
      c.fillStyle=`rgba(204,210,213,${((reduce?.18:.28)*fade).toFixed(3)})`;
      for(const [dx,dy,size] of [[0,0,1],[-offset,radius*.25,.67],[offset,-radius*.2,.58]]){c.beginPath();c.ellipse(x+dx,y+dy,radius*size,radius*size*.7,0,0,Math.PI*2);c.fill();}
    }
    c.restore();
  },
  clipTireSmoke(view){
    const fx=view.cinematicFx;if(!fx||!view.canvas)return;
    const now=performance.now();
    if(!fx.uiRects||now-(fx.uiRectsAt||0)>180){
      fx.uiRectsAt=now;
      fx.uiRects=['#raceTelemetry','#padL','#padR','#controlStyleOptions','#controllerCollapseButton','#touchController'].map(selector=>document.querySelector(selector)).filter(node=>node&&!node.hidden).map(node=>node.getBoundingClientRect()).filter(rect=>rect.width&&rect.height);
    }
    const canvas=view.canvas.getBoundingClientRect();
    for(const particle of fx.particles){
      if(!particle.mesh.visible||particle.kind!=='tire')continue;
      const p=particle.mesh.position.clone().project(view.camera),x=canvas.left+(p.x+1)*canvas.width/2,y=canvas.top+(1-p.y)*canvas.height/2;
      if(fx.uiRects.some(rect=>x>rect.left-20&&x<rect.right+20&&y>rect.top-20&&y<rect.bottom+20))particle.mesh.material.opacity=0;
    }
  },
  success(view,system,allowRun=false){
    const fx=view.cinematicFx;if(!fx||!view.on||view.failed||fx.cutaway)return;
    const chosen=['chassis','drivetrain','suspension','brakes','cooling'].includes(system)?system:'chassis';
    if(!fx.assetReady){fx.pendingSuccess={system:chosen,allowRun};return;}
    fx.cutaway={system:chosen,elapsed:0,duration:reduce?2.4:3,allowRun};fx.audit.cutaway={reason:'started',starts:fx.audit.cutaway.starts+1,ends:fx.audit.cutaway.ends,system:chosen};fx.internals.group.visible=true;
    if(view.cutawayCaption){view.cutawayCaption.textContent={chassis:'CHASSIS · the car’s load path',drivetrain:'DRIVETRAIN · power to the wheels',suspension:'SUSPENSION · grip through the turn',brakes:'BRAKES · energy into heat',cooling:'COOLING · airflow restores power'}[chosen];view.cutawayCaption.hidden=false;}
    view.car.traverse(node=>{if(!node.isMesh||fx.internals.group.getObjectById(node.id))return;for(const material of [node.material].flat())if(material&&!fx.materials.some(entry=>entry.material===material)){fx.materials.push({material,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});material.transparent=true;material.opacity=Math.min(material.opacity,RACE_FINISHES.enabled&&Race.signatureFinish?.kind==='precision-hero'?.48:.18);material.depthWrite=false;}});
    const colors={chassis:0x84d5dc,drivetrain:0xffb95e,suspension:0x77dea1,brakes:0xff6d52,cooling:0x78caff};
    for(const [key,part] of Object.entries(fx.internals.parts))part.traverse(mesh=>{if(!mesh.isMesh)return;for(const material of [mesh.material].flat()){material.opacity=key===chosen?.92:.12;material.emissive?.setHex(key===chosen?colors[key]:0x000000);if(material.emissiveIntensity!==undefined)material.emissiveIntensity=key===chosen?.42:0;}});
  },
  endCutaway(view,reason='completed'){const fx=view.cinematicFx;if(!fx)return;if(fx.cutaway){fx.audit.cutaway={...fx.audit.cutaway,reason,ends:fx.audit.cutaway.ends+1};if(fx.cutaway.system==='drivetrain')fx.audit.shift={...fx.audit.shift,reason,ends:fx.audit.shift.ends+1};}for(const entry of fx.materials){entry.material.opacity=entry.opacity;entry.material.transparent=entry.transparent;entry.material.depthWrite=entry.depthWrite;}fx.materials.length=0;if(fx.internals){fx.internals.group.visible=false;fx.internals.sweep.material.opacity=0;for(const mesh of Object.values(fx.internals.parts))mesh.position.copy(mesh.userData.basePosition);}fx.cutaway=null;fx.pendingSuccess=null;if(view.cutawayCaption)view.cutawayCaption.hidden=true;},
  requestCutaway(view,candidates){const fx=view.cinematicFx;if(!fx)return null;fx.cutawayGate=globalThis.KickLabRaceEffectsContracts.cutaway(fx.cutawayGate,{time:Race.st.t,active:!PAUSE.on&&!document.hidden&&!fx.cutaway&&['run','done'].includes(Race.state),candidates});const selected=fx.cutawayGate.selected;if(selected)this.success(view,selected,Race.state==='run');return selected;},
  shift(view,event){const fx=view.cinematicFx;if(!fx)return;const reason=globalThis.KickLabRaceEffectsContracts.shift({...event,alreadyTriggered:fx.shiftTriggered});fx.audit.shift={...fx.audit.shift,reason,beforeGear:event.beforeGear,afterGear:event.afterGear};if(reason==='perfect-upshift'&&this.requestCutaway(view,['drivetrain'])==='drivetrain'){fx.shiftTriggered=true;fx.audit.shift.starts++;}},
  step(view,dt){
    const fx=view.cinematicFx,t=Race.telemetry,s=Race.st;if(!fx||!t)return;
    const analog=Race.analogControl?.active?Race.analogControl:null,gas=Math.max(Number(Race.inp.gas)||0,analog?Math.max(0,-Number(analog.y||0)):0),brake=Math.max(Number(Race.inp.brake)||0,analog?Math.max(0,Number(analog.y||0)):0),visualStep=!PAUSE.on&&!document.hidden?Math.min(.05,Math.max(0,dt)):0,active=Race.state==='run'&&!PAUSE.on&&!document.hidden,step=active?visualStep:0,draining=(fx.lastNitro??s.nitro)>s.nitro+1e-6,boostReason=globalThis.KickLabRaceEffectsContracts.boost({running:Race.state==='run',paused:PAUSE.on,hidden:document.hidden,delivered:!!s.nitroDelivered,pulse:t.nosPulse,overheat:!!t.overheat,active:!!s.nitroActive,throttle:gas>.1,draining,traction:s.driftMode!=='skid'}),boost=boostReason==='delivered-draining';
    fx.lastNitro=s.nitro;fx.audit.boost.reason=boostReason;if(boost&&!fx.lastBoost)fx.audit.boost.starts++;if(!boost&&fx.lastBoost)fx.audit.boost.ends++;
    const priorLaunch=fx.launch;
    fx.launch=globalThis.KickLabRaceEffectsContracts.launch(fx.launch,{mode:Race.mode().id,running:Race.state==='run',paused:PAUSE.on,hidden:document.hidden,time:s.t,brake,gas,speed:s.v,slip:s.launchSlip||0});fx.audit.launch.reason=fx.launch.reason;if(fx.launch.phase==='active'&&priorLaunch?.phase!=='active')fx.audit.launch.starts++;if(priorLaunch?.phase==='active'&&fx.launch.phase!=='active')fx.audit.launch.ends++;
    const loadTarget=globalThis.KickLabRaceEffectsContracts.loadTransfer({boostReason,acceleration:s.longitudinalAccel,deliveredBoost:s.deliveredBoostAccel,torque:t.torque,launchSlip:s.launchSlip,speed:s.v});
    fx.loadTransfer+=(loadTarget-fx.loadTransfer)*Math.min(1,visualStep*(loadTarget>fx.loadTransfer?7:4));
    const driftTarget=globalThis.KickLabRaceEffectsContracts.handbrakeDrift({running:Race.state==='run',paused:PAUSE.on,hidden:document.hidden,committed:s.handbrakeCommitted,speed:s.v,wheel:s.wheel||0,slip:s.slipAngle||0,yawRate:s.yawRate||0,lateralAccel:s.alat||0,availableGrip:s.muEffective||0,mode:s.driftMode,grip:t.grip});
    fx.driftEnergy+=(driftTarget-fx.driftEnergy)*Math.min(1,visualStep*(driftTarget>fx.driftEnergy?5:3));
    const milestone=globalThis.KickLabRaceEffectsContracts.cutawayMilestones(fx.milestones,{dt:step,running:active,done:Race.state==='done',mode:Race.mode().id,launchTriggered:fx.launch.triggered,driftMode:s.driftMode,handbrakeCommitted:s.handbrakeCommitted,slip:s.slipAngle||0,speed:s.v,slide:s.slide,brake,longitudinalAccel:s.longitudinalAccel,heat:t.heat,overheat:t.overheat});fx.milestones=milestone.state;if(milestone.candidates.length)this.requestCutaway(view,milestone.candidates);
    if(fx.cutaway&&(PAUSE.on||document.hidden||Race.state!=='done'&&!(fx.cutaway.allowRun&&Race.state==='run')))this.endCutaway(view,PAUSE.on?'paused':document.hidden?'hidden':'race-state-changed');
    fx.visualClock+=visualStep;fx.flameEnergy=boost?Math.min(1,fx.flameEnergy+step*9):0;
    for(const flame of fx.flames){
      const {sprite,core,wisp,marker,map}=flame;sprite.visible=core.visible=boost&&!!map;wisp.visible=boost&&!reduce&&!!map;
      if(!sprite.visible)continue;
      marker.updateWorldMatrix(true,false);const nozzle=marker.getWorldPosition(new THREE.Vector3()),localNozzle=view.car.worldToLocal(nozzle.clone()),back=new THREE.Vector3(Math.cos(s.th),0,Math.sin(s.th)),time=fx.visualClock+flame.side*.043;
      const surge=reduce?.9:Math.max(.55,Math.min(1.38,.91+.24*Math.sin(time*38+flame.side*2.1)+.16*Math.sin(time*67+flame.side*.7))),length=(.61+Math.min(1,t.nosPulse/1.2)*.19)*surge,width=length*(reduce?.49:.48+.1*Math.sin(time*53+flame.side*1.9));
      sprite.position.copy(localNozzle).x-=length*.58;if(!reduce)sprite.position.y+=.025*Math.sin(time*71+flame.side);sprite.scale.set(length,width,1);sprite.material.opacity=(reduce?.52:.4+.22*Math.sin(time*47+flame.side*2.7)**2)*fx.flameEnergy;
      const coreLength=length*(reduce?.3:.26+.08*Math.sin(time*59+flame.side)),coreWidth=width*.47;core.position.copy(localNozzle).x-=coreLength*.45;core.scale.set(coreLength,coreWidth,1);core.material.opacity=(reduce?.66:.56+.2*Math.sin(time*61+flame.side*2)**2)*fx.flameEnergy;
      const breakup=.5+.5*Math.sin(time*43+flame.side*2.4);wisp.position.copy(localNozzle).x-=length*(.66+.2*breakup);wisp.position.y+=(breakup-.5)*.11;wisp.scale.set(width*(.68+.25*breakup),width*(.55+.2*breakup),1);wisp.material.opacity=.12*(1-breakup*.45)*fx.flameEnergy;
      const a=nozzle.clone().project(view.camera),b=nozzle.clone().addScaledVector(back,-1).project(view.camera);
      if(Math.hypot(b.x-a.x,b.y-a.y)>.006){const angle=Math.atan2(b.y-a.y,b.x-a.x);sprite.material.rotation=angle;core.material.rotation=angle;wisp.material.rotation=angle+.28*Math.sin(time*37);}
      const frame=reduce?0:Math.floor((time*23+flame.side*2.8)%8);if(frame!==flame.frame){flame.frame=frame;map.offset.set((frame%4)*.25,frame<4?.5:0);}
    }
    const heat=t.heat,load=t.torque,stage=RACE_TELEMETRY.thermalStage(t),vaporRate=active&&!reduce&&stage!=='normal'?(stage==='critical'?4:stage==='hot'?2.5:1.1):active&&!reduce&&load>.62?1.2:0;
    fx.particleTick+=step*vaporRate;
    while(fx.particleTick>=1){fx.particleTick--;for(const {marker} of fx.flames)this.emit(view,'vapor',marker.getWorldPosition(new THREE.Vector3()),.82,.17,heat>.76?0x9da9af:0xc2c9cc,new THREE.Vector3(-Math.cos(s.th)*(1+s.v*.035),.13,-Math.sin(s.th)*(1+s.v*.035)));}
    const tireEvent=active?this.tireState():'none';
    if(tireEvent!==fx.tireEvent){fx.lastContact.clear();fx.markTick=fx.tireTick=0;fx.tireEvent=tireEvent;}
    if(tireEvent!=='none'){
      const wheels=this.contactWheels(tireEvent,s.slipAngle||0),rate=reduce?6:tireEvent==='spinout'?15:tireEvent==='brake-lock'?12:tireEvent==='drift'?11+fx.driftEnergy*5:11;
      fx.markTick+=step*rate;fx.tireTick+=step*(reduce?4:tireEvent==='spinout'?13:tireEvent==='launch'?11:tireEvent==='drift'?9+fx.driftEnergy*5:9);
      while(fx.markTick>=1){
        fx.markTick--;view.car.updateMatrixWorld(true);
        for(const wheel of wheels){const point=this.roadContact(view,view.car.getObjectByName(wheel));if(point)this.mark(view,wheel,point,tireEvent);else fx.lastContact.delete(wheel);}
      }
      while(fx.tireTick>=1){
        fx.tireTick--;view.car.updateMatrixWorld(true);
        for(const [index,wheel] of wheels.entries()){
          if(tireEvent==='drift'&&index>0&&fx.tireTick>.25)continue;
          const point=this.roadContact(view,view.car.getObjectByName(wheel));if(!point)continue;
          const forward=new THREE.Vector3(Math.cos(s.th),0,Math.sin(s.th)),side=new THREE.Vector3(-forward.z,0,forward.x),shear=reduce?0:(s.slipAngle||0)*s.v*.13;
          const velocity=forward.multiplyScalar(-Math.max(.16,s.v*.08)).addScaledVector(side,shear).setY(reduce?.12:tireEvent==='spinout'?.48:.27);
          const life=reduce?.95:tireEvent==='spinout'?1.45:tireEvent==='drift'?1.2:.9,scale=reduce?.29:tireEvent==='spinout'?.55:tireEvent==='brake-lock'?.42:.46+fx.driftEnergy*.12;
          const particle=this.emit(view,'tire',point.clone().setY(.17),life,scale,tireEvent==='launch'?0xd5d0c4:0xc8cbd0,velocity);
          particle.event=tireEvent;particle.phase=(fx.particleCursor+index*3)%8;
        }
      }
    }
    for(const particle of fx.particles){
      if(!particle.mesh.visible)continue;
      if(!active&&Race.state==='run'){particle.mesh.visible=false;continue;}
      particle.age+=visualStep;const phase=Math.min(1,particle.age/particle.life);
      particle.mesh.position.addScaledVector(particle.velocity,visualStep);
      particle.mesh.position.y+=visualStep*(particle.kind==='tire'?.025:.05);
      particle.mesh.scale.setScalar(particle.baseScale*(particle.kind==='tire'?1+phase*(reduce?.65:2.3):1+phase*.6));
      if(particle.kind==='tire'){
        const frame=reduce?0:Math.min(7,Math.floor(phase*8+particle.phase)%8);
        if(frame!==particle.frame){particle.frame=frame;particle.mesh.material.map=fx.tireFrames[frame];}
        particle.mesh.material.opacity=(reduce?.24:particle.event==='spinout'?.7:particle.event==='drift'?.6:.62)*Math.sin(Math.PI*Math.min(1,phase*.9+.08));
      }else particle.mesh.material.opacity=.13*Math.max(0,1-phase);
      if(particle.age>=particle.life)particle.mesh.visible=false;
    }
    const dummy=new THREE.Object3D();
    for(let i=0;i<fx.marks.count;i++){
      const mark=fx.markEntries[i];
      if(!mark){dummy.scale.setScalar(0);}
      else{
        mark.age+=visualStep;const fade=Math.max(0,1-mark.age/5.5);
        dummy.position.set(mark.x,.048,mark.z);dummy.rotation.set(0,mark.heading,0);dummy.scale.set(mark.length,1,mark.width);
        fx.marks.setColorAt(i,new THREE.Color().setRGB(.005+.11*(1-fade),.005+.11*(1-fade),.006+.11*(1-fade)));
        if(!fade)dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();fx.marks.setMatrixAt(i,dummy.matrix);
    }
    fx.marks.instanceMatrix.needsUpdate=true;if(fx.marks.instanceColor)fx.marks.instanceColor.needsUpdate=true;
    if(fx.cutaway&&(Race.state==='done'||fx.cutaway.allowRun&&Race.state==='run')&&!PAUSE.on&&!document.hidden){
      fx.cutaway.elapsed+=visualStep;const p=Math.min(1,fx.cutaway.elapsed/fx.cutaway.duration),pulse=Math.sin(Math.PI*p),selected=fx.internals.parts[fx.cutaway.system];
      selected.position.copy(selected.userData.basePosition);if(!reduce){selected.position.y+=pulse*.13;selected.position.x+=fx.cutaway.system==='cooling'?pulse*.12:0;}
      fx.internals.sweep.position.x=-Race.vehicle().lengthM*.5+Race.vehicle().lengthM*Math.min(1,p*2.25);fx.internals.sweep.material.opacity=reduce?0:Math.max(0,1-p*2.3)*.23;
      selected.traverse(mesh=>{if(!mesh.isMesh)return;for(const material of [mesh.material].flat())if(material.emissiveIntensity!==undefined)material.emissiveIntensity=reduce?.35:.34+.16*Math.sin(p*Math.PI*6)**2;});
      if(fx.cutaway.elapsed>=fx.cutaway.duration)this.endCutaway(view);
    }
    fx.lastBoost=boost;fx.counts.vapor=fx.particles.filter(p=>p.mesh.visible&&p.kind==='vapor').length;fx.counts.tire=fx.particles.filter(p=>p.mesh.visible&&p.kind==='tire').length;
    globalThis.__KICKLAB_RACE_FX__={vehicle:Race.vehicle().id,boost,loadTransfer:fx.loadTransfer,driftEnergy:fx.driftEnergy,flameEnergy:fx.flameEnergy,flameFrame:fx.flames[0]?.frame??-1,vapor:fx.counts.vapor,tireSmoke:fx.counts.tire,tireEvent:fx.tireEvent,markPool:256,markCount:fx.marks.count,visibleMarks:fx.markEntries.filter(mark=>mark&&mark.age<5.5).length,markEmissions:fx.counts.marks,assetReady:fx.assetReady,assetError:fx.assetError,cutaway:fx.cutaway?{system:fx.cutaway.system,elapsed:fx.cutaway.elapsed,duration:fx.cutaway.duration}:null,cutawayGate:fx.cutawayGate?structuredClone(fx.cutawayGate):null,milestones:fx.milestones?structuredClone(fx.milestones):null,reducedMotion:!!reduce,audit:structuredClone(fx.audit)};
  },
  clear(view,dispose=false){
    const fx=view.cinematicFx;if(!fx)return;if(fx.lastBoost)fx.audit.boost={...fx.audit.boost,reason:'lifecycle-cancelled',ends:fx.audit.boost.ends+1};if(fx.launch?.phase==='active')fx.audit.launch={...fx.audit.launch,reason:'lifecycle-cancelled',ends:fx.audit.launch.ends+1};if(fx.pendingSuccess?.allowRun)fx.audit.shift={...fx.audit.shift,reason:'lifecycle-cancelled',ends:fx.audit.shift.ends+1};this.endCutaway(view,'lifecycle-cancelled');globalThis.__KICKLAB_RACE_FX_LAST__={vehicle:Race.vehicle().id,audit:structuredClone(fx.audit)};globalThis.__KICKLAB_RACE_FX__=null;globalThis.__KICKLAB_RACE_SPIN__=null;
    if(view.spinPresentation){const spin=view.spinPresentation;spin.energy=spin.whip=0;spin.wasSpinning=spin.countersteer=false;if(spin.body)spin.body.position.y=spin.bodyRestY;}
    for(const particle of fx.particles)particle.mesh.visible=false;
    fx.markEntries.length=0;fx.lastContact.clear();fx.marks.count=0;fx.markCursor=fx.particleCursor=0;fx.markTick=fx.tireTick=fx.particleTick=fx.flameEnergy=fx.visualClock=fx.loadTransfer=fx.driftEnergy=0;fx.tireEvent='none';fx.lastNitro=Race.st?.nitro??1;fx.launch=null;fx.shiftTriggered=false;fx.cutawayGate=null;fx.milestones=null;fx.audit={boost:{reason:'waiting',starts:0,ends:0},launch:{reason:'waiting',starts:0,ends:0},shift:{reason:'waiting',starts:0,ends:0},cutaway:{reason:'waiting',starts:0,ends:0}};fx.counts={vapor:0,tire:0,marks:0};
    for(const {sprite,core,wisp} of fx.flames)for(const layer of [sprite,core,wisp]){layer.visible=false;layer.material.opacity=0;}
    if(!dispose)return;
    for(const particle of fx.particles){view.scene.remove(particle.mesh);particle.mesh.material.dispose();}fx.smokeTexture.dispose();for(const frame of fx.tireFrames)frame.dispose();
    view.scene.remove(fx.marks);fx.markGeometry.dispose();fx.markMaterial.dispose();
    for(const {sprite,core,wisp,map} of fx.flames){for(const layer of [sprite,core,wisp]){view.car?.remove(layer);layer.material.dispose();}map?.dispose();}fx.flameAtlas?.dispose();fx.coreTexture.dispose();
    if(fx.internals){view.car?.remove(fx.internals.group);fx.internals.group.traverse(node=>{node.geometry?.dispose();for(const material of [node.material].flat())material?.dispose();});}view.cinematicFx=null;view.spinPresentation=null;
  }
};
