/* Presentation-only Race effects. Physics and result state stay in Race. */
const RACE_CINEMATIC_FX={
  attach(view){
    if(!view.scene||!view.car||!RACE_TELEMETRY.enabled)return;
    this.clear(view,true);
    const T=THREE,car=view.car,scene=view.scene,smokeTexture=new T.TextureLoader().load('assets/effects/race/v1/soft-turbulent-smoke.png'),particles=[];
    smokeTexture.colorSpace=T.SRGBColorSpace;
    for(let i=0;i<32;i++){
      const material=new T.SpriteMaterial({map:smokeTexture,color:0xc8cbd0,transparent:true,opacity:0,depthWrite:false,alphaTest:.015});
      const mesh=new T.Sprite(material);mesh.visible=false;scene.add(mesh);
      particles.push({mesh,life:0,age:0,kind:'',velocity:new T.Vector3()});
    }
    const markGeometry=new T.BoxGeometry(.42,.004,.15),markMaterial=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.45,depthWrite:false}),marks=new T.InstancedMesh(markGeometry,markMaterial,72);
    marks.count=0;marks.frustumCulled=false;scene.add(marks);
    const coreCanvas=document.createElement('canvas');coreCanvas.width=128;coreCanvas.height=64;const coreContext=coreCanvas.getContext('2d'),corePixels=coreContext.createImageData(128,64);
    for(let y=0;y<64;y++)for(let x=0;x<128;x++){const u=x/127,v=Math.abs((y-31.5)/31.5),width=(.23+.22*Math.sin(Math.PI*u))*(1-.38*u),edge=Math.max(0,Math.min(1,(width-v)*7)),fade=(1-u)*(.74+.26*Math.sin(u*21)**2),index=(y*128+x)*4;corePixels.data[index]=168+Math.round(87*(1-u));corePixels.data[index+1]=210+Math.round(45*(1-u));corePixels.data[index+2]=255;corePixels.data[index+3]=Math.round(210*edge*fade);}
    coreContext.putImageData(corePixels,0,0);const coreTexture=new T.CanvasTexture(coreCanvas);coreTexture.colorSpace=T.SRGBColorSpace;
    const flames=[];
    for(const side of ['Left','Right']){
      const marker=car.getObjectByName('Exhaust'+side);if(!marker)continue;
      const material=new T.SpriteMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,alphaTest:.01,toneMapped:false}),sprite=new T.Sprite(material);
      const core=new T.Sprite(new T.SpriteMaterial({map:coreTexture,color:0xd5f4ff,transparent:true,opacity:0,depthWrite:false,alphaTest:.01,toneMapped:false}));
      const wisp=new T.Sprite(new T.SpriteMaterial({map:smokeTexture,color:0xffa965,transparent:true,opacity:0,depthWrite:false,alphaTest:.01,toneMapped:false}));
      for(const layer of [sprite,core,wisp]){layer.visible=false;layer.renderOrder=9;car.add(layer);}
      flames.push({sprite,core,wisp,marker,map:null,side:side==='Left'?0:1,frame:-1});
    }
    const fx={particles,smokeTexture,particleCursor:0,particleTick:0,coreTexture,flameAtlas:null,flames,flameEnergy:0,visualClock:0,marks,markGeometry,markMaterial,markEntries:[],markCursor:0,markTick:0,internals:null,assetReady:false,assetError:null,pendingSuccess:null,cutaway:null,materials:[],lastBoost:false,counts:{vapor:0,tire:0,marks:0}};
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
      if(fx.pendingSuccess&&Race.state==='done'){const system=fx.pendingSuccess;fx.pendingSuccess=null;this.success(view,system);}
    },undefined,error=>{if(view.cinematicFx===fx)fx.assetError=String(error?.message||error);});
  },
  emit(view,kind,origin,life,scale,color,velocity){
    const fx=view.cinematicFx;if(!fx)return;
    const particle=fx.particles[fx.particleCursor++%fx.particles.length];particle.kind=kind;particle.age=0;particle.life=life;particle.velocity.copy(velocity);
    particle.mesh.position.copy(origin);particle.mesh.scale.set(scale,scale,1);particle.mesh.material.color.setHex(color);particle.mesh.material.opacity=kind==='vapor'?.13:.22;particle.mesh.visible=true;
  },
  roadContact(view,node){
    if(!node)return null;const p=node.getWorldPosition(new THREE.Vector3()),path=RACE_SYSTEMS.path(p.x,p.z,Race.P(),RACE_SYSTEMS.venue(Race.opt.venue));
    return Math.abs(path.e)<Race.HW-.35?p:null;
  },
  mark(view,point){
    const fx=view.cinematicFx;if(!fx)return;const index=fx.markCursor++%72;
    fx.markEntries[index]={x:point.x,z:point.z,heading:Race.st.th,age:0};fx.marks.count=Math.max(fx.marks.count,index+1);fx.counts.marks++;
  },
  success(view,system){
    const fx=view.cinematicFx;if(!fx||!view.on||view.failed||fx.cutaway)return;
    const chosen=['chassis','drivetrain','suspension','brakes','cooling'].includes(system)?system:'chassis';
    if(!fx.assetReady){fx.pendingSuccess=chosen;return;}
    fx.cutaway={system:chosen,elapsed:0,duration:reduce?2.4:3};fx.internals.group.visible=true;
    if(view.cutawayCaption){view.cutawayCaption.textContent={chassis:'CHASSIS · the car’s load path',drivetrain:'DRIVETRAIN · power to the wheels',suspension:'SUSPENSION · grip through the turn',brakes:'BRAKES · energy into heat',cooling:'COOLING · airflow restores power'}[chosen];view.cutawayCaption.hidden=false;}
    view.car.traverse(node=>{if(!node.isMesh||fx.internals.group.getObjectById(node.id))return;for(const material of [node.material].flat())if(material&&!fx.materials.some(entry=>entry.material===material)){fx.materials.push({material,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});material.transparent=true;material.opacity=Math.min(material.opacity,.18);material.depthWrite=false;}});
    const colors={chassis:0x84d5dc,drivetrain:0xffb95e,suspension:0x77dea1,brakes:0xff6d52,cooling:0x78caff};
    for(const [key,part] of Object.entries(fx.internals.parts))part.traverse(mesh=>{if(!mesh.isMesh)return;for(const material of [mesh.material].flat()){material.opacity=key===chosen?.92:.12;material.emissive?.setHex(key===chosen?colors[key]:0x000000);if(material.emissiveIntensity!==undefined)material.emissiveIntensity=key===chosen?.42:0;}});
  },
  endCutaway(view){const fx=view.cinematicFx;if(!fx)return;for(const entry of fx.materials){entry.material.opacity=entry.opacity;entry.material.transparent=entry.transparent;entry.material.depthWrite=entry.depthWrite;}fx.materials.length=0;if(fx.internals){fx.internals.group.visible=false;fx.internals.sweep.material.opacity=0;for(const mesh of Object.values(fx.internals.parts))mesh.position.copy(mesh.userData.basePosition);}fx.cutaway=null;fx.pendingSuccess=null;if(view.cutawayCaption)view.cutawayCaption.hidden=true;},
  step(view,dt){
    const fx=view.cinematicFx,t=Race.telemetry,s=Race.st;if(!fx||!t)return;
    const visualStep=!PAUSE.on&&!document.hidden?Math.min(.05,Math.max(0,dt)):0,active=Race.state==='run'&&!PAUSE.on&&!document.hidden,step=active?visualStep:0,boost=active&&s.nitroDelivered&&t.nosPulse>0&&!t.overheat;
    fx.visualClock+=visualStep;fx.flameEnergy=!active?0:boost?Math.min(1,fx.flameEnergy+step*9):Math.max(0,fx.flameEnergy-step*7);
    for(const flame of fx.flames){
      const {sprite,core,wisp,marker,map}=flame;sprite.visible=core.visible=wisp.visible=boost&&!reduce&&!!map;
      if(!sprite.visible)continue;
      marker.updateWorldMatrix(true,false);const nozzle=marker.getWorldPosition(new THREE.Vector3()),localNozzle=view.car.worldToLocal(nozzle.clone()),back=new THREE.Vector3(Math.cos(s.th),0,Math.sin(s.th)),time=fx.visualClock+flame.side*.043;
      const surge=Math.max(.55,Math.min(1.38,.91+.24*Math.sin(time*38+flame.side*2.1)+.16*Math.sin(time*67+flame.side*.7))),length=(.61+Math.min(1,t.nosPulse/1.2)*.19)*surge,width=length*(.48+.1*Math.sin(time*53+flame.side*1.9));
      sprite.position.copy(localNozzle).x-=length*.58;sprite.position.y+=.025*Math.sin(time*71+flame.side);sprite.scale.set(length,width,1);sprite.material.opacity=(.4+.22*Math.sin(time*47+flame.side*2.7)**2)*fx.flameEnergy;
      const coreLength=length*(.26+.08*Math.sin(time*59+flame.side)),coreWidth=width*.47;core.position.copy(localNozzle).x-=coreLength*.45;core.scale.set(coreLength,coreWidth,1);core.material.opacity=(.56+.2*Math.sin(time*61+flame.side*2)**2)*fx.flameEnergy;
      const breakup=.5+.5*Math.sin(time*43+flame.side*2.4);wisp.position.copy(localNozzle).x-=length*(.66+.2*breakup);wisp.position.y+=(breakup-.5)*.11;wisp.scale.set(width*(.68+.25*breakup),width*(.55+.2*breakup),1);wisp.material.opacity=.12*(1-breakup*.45)*fx.flameEnergy;
      const a=nozzle.clone().project(view.camera),b=nozzle.clone().addScaledVector(back,-1).project(view.camera);
      if(Math.hypot(b.x-a.x,b.y-a.y)>.006){const angle=Math.atan2(b.y-a.y,b.x-a.x);sprite.material.rotation=angle;core.material.rotation=angle;wisp.material.rotation=angle+.28*Math.sin(time*37);}
      const frame=Math.floor((time*23+flame.side*2.8)%8);if(frame!==flame.frame){flame.frame=frame;map.offset.set((frame%4)*.25,frame<4?.5:0);}
    }
    const heat=t.heat,load=t.torque,stage=RACE_TELEMETRY.thermalStage(t),vaporRate=active&&!reduce&&stage!=='normal'?(stage==='critical'?4:stage==='hot'?2.5:1.1):active&&!reduce&&load>.62?1.2:0;
    fx.particleTick+=step*vaporRate;
    while(fx.particleTick>=1){fx.particleTick--;for(const {marker} of fx.flames)this.emit(view,'vapor',marker.getWorldPosition(new THREE.Vector3()),.82,.17,heat>.76?0x9da9af:0xc2c9cc,new THREE.Vector3(-Math.cos(s.th)*(1+s.v*.035),.13,-Math.sin(s.th)*(1+s.v*.035)));}
    const launch=active&&s.launchSlip>.03&&s.v<8,drift=active&&(s.driftMode==='drift'||s.driftMode==='skid')&&Math.abs(s.slipAngle||0)>.08,brakeSlip=active&&t.braking>.32&&(s.driftMode==='skid'||Math.abs(s.slipAngle||0)>.16),tireEvent=launch||drift||brakeSlip;
    fx.markTick+=step*(tireEvent?13:0);
    while(fx.markTick>=1){fx.markTick--;const wheelNames=brakeSlip?['WheelFrontLeft','WheelFrontRight','RearTireLeft','RearTireRight']:['RearTireLeft','RearTireRight'];
      for(const name of wheelNames){const point=this.roadContact(view,view.car.getObjectByName(name));if(!point)continue;this.mark(view,point);if(!reduce&&fx.markCursor%3===0)this.emit(view,'tire',new THREE.Vector3(point.x,.17,point.z),.78,.22,0xb3b9bd,new THREE.Vector3(-Math.cos(s.th)*s.v*.07,.36,-Math.sin(s.th)*s.v*.07));}
    }
    if(!tireEvent)fx.markTick=0;
    for(const particle of fx.particles){if(!particle.mesh.visible)continue;if(!active&&Race.state==='run'){particle.mesh.visible=false;continue;}particle.age+=visualStep;particle.mesh.position.addScaledVector(particle.velocity,visualStep);particle.mesh.position.y+=visualStep*.05;particle.mesh.scale.multiplyScalar(1+visualStep*.55);particle.mesh.material.opacity=(particle.kind==='vapor'?.13:.22)*Math.max(0,1-particle.age/particle.life);if(particle.age>=particle.life)particle.mesh.visible=false;}
    const dummy=new THREE.Object3D();for(let i=0;i<fx.marks.count;i++){const mark=fx.markEntries[i];if(!mark){dummy.scale.setScalar(0);}else{mark.age+=visualStep;const opacity=Math.max(0,1-mark.age/5.5);dummy.position.set(mark.x,.048,mark.z);dummy.rotation.set(0,-mark.heading,0);dummy.scale.set(opacity,.8,opacity);fx.marks.setColorAt(i,new THREE.Color().setRGB(.13+(.38*(1-opacity)),.13+(.4*(1-opacity)),.14+(.43*(1-opacity))));}dummy.updateMatrix();fx.marks.setMatrixAt(i,dummy.matrix);}fx.marks.instanceMatrix.needsUpdate=true;if(fx.marks.instanceColor)fx.marks.instanceColor.needsUpdate=true;
    if(fx.cutaway&&Race.state==='done'&&!PAUSE.on&&!document.hidden){
      fx.cutaway.elapsed+=visualStep;const p=Math.min(1,fx.cutaway.elapsed/fx.cutaway.duration),pulse=Math.sin(Math.PI*p),selected=fx.internals.parts[fx.cutaway.system];
      selected.position.copy(selected.userData.basePosition);if(!reduce){selected.position.y+=pulse*.13;selected.position.x+=fx.cutaway.system==='cooling'?pulse*.12:0;}
      fx.internals.sweep.position.x=-Race.vehicle().lengthM*.5+Race.vehicle().lengthM*Math.min(1,p*2.25);fx.internals.sweep.material.opacity=reduce?0:Math.max(0,1-p*2.3)*.23;
      selected.traverse(mesh=>{if(!mesh.isMesh)return;for(const material of [mesh.material].flat())if(material.emissiveIntensity!==undefined)material.emissiveIntensity=reduce?.35:.34+.16*Math.sin(p*Math.PI*6)**2;});
      if(fx.cutaway.elapsed>=fx.cutaway.duration)this.endCutaway(view);
    }
    fx.lastBoost=boost;fx.counts.vapor=fx.particles.filter(p=>p.mesh.visible&&p.kind==='vapor').length;fx.counts.tire=fx.particles.filter(p=>p.mesh.visible&&p.kind==='tire').length;
    globalThis.__KICKLAB_RACE_FX__={vehicle:Race.vehicle().id,boost,flameEnergy:fx.flameEnergy,flameFrame:fx.flames[0]?.frame??-1,vapor:fx.counts.vapor,tireSmoke:fx.counts.tire,markPool:72,markCount:fx.marks.count,visibleMarks:fx.markEntries.filter(mark=>mark&&mark.age<5.5).length,markEmissions:fx.counts.marks,assetReady:fx.assetReady,assetError:fx.assetError,cutaway:fx.cutaway?{system:fx.cutaway.system,elapsed:fx.cutaway.elapsed,duration:fx.cutaway.duration}:null,reducedMotion:!!reduce};
  },
  clear(view,dispose=false){
    const fx=view.cinematicFx;if(!fx)return;globalThis.__KICKLAB_RACE_FX__=null;this.endCutaway(view);
    for(const particle of fx.particles)particle.mesh.visible=false;
    fx.markEntries.length=0;fx.marks.count=0;fx.markCursor=fx.particleCursor=0;fx.markTick=fx.particleTick=fx.flameEnergy=fx.visualClock=0;fx.counts={vapor:0,tire:0,marks:0};
    for(const {sprite,core,wisp} of fx.flames)for(const layer of [sprite,core,wisp]){layer.visible=false;layer.material.opacity=0;}
    if(!dispose)return;
    for(const particle of fx.particles){view.scene.remove(particle.mesh);particle.mesh.material.dispose();}fx.smokeTexture.dispose();
    view.scene.remove(fx.marks);fx.markGeometry.dispose();fx.markMaterial.dispose();
    for(const {sprite,core,wisp,map} of fx.flames){for(const layer of [sprite,core,wisp]){view.car?.remove(layer);layer.material.dispose();}map?.dispose();}fx.flameAtlas?.dispose();fx.coreTexture.dispose();
    if(fx.internals){view.car?.remove(fx.internals.group);fx.internals.group.traverse(node=>{node.geometry?.dispose();for(const material of [node.material].flat())material?.dispose();});}view.cinematicFx=null;
  }
};
