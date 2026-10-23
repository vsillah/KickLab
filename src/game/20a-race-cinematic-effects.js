/* Presentation-only Race effects. Physics and result state stay in Race. */
const RACE_CINEMATIC_FX={
  attach(view){
    if(!view.scene||!view.car||!RACE_TELEMETRY.enabled)return;
    this.clear(view,true);
    const T=THREE,car=view.car,scene=view.scene,particleGeometry=new T.SphereGeometry(1,6,4),particles=[];
    for(let i=0;i<24;i++){
      const material=new T.MeshBasicMaterial({color:0xc8cbd0,transparent:true,opacity:0,depthWrite:false});
      const mesh=new T.Mesh(particleGeometry,material);mesh.visible=false;scene.add(mesh);
      particles.push({mesh,life:0,age:0,kind:''});
    }
    const markGeometry=new T.BoxGeometry(.42,.004,.15),markMaterial=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.45,depthWrite:false}),marks=new T.InstancedMesh(markGeometry,markMaterial,72);
    marks.count=0;marks.frustumCulled=false;scene.add(marks);
    const flameMaterial=new T.MeshBasicMaterial({color:0xff7c2f,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending}),coreMaterial=new T.MeshBasicMaterial({color:0x8de8ff,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});
    const flames=[];
    for(const side of ['Left','Right']){
      const marker=car.getObjectByName('Exhaust'+side);if(!marker)continue;
      const outer=new T.Mesh(new T.ConeGeometry(.15,1.05,7),flameMaterial.clone()),core=new T.Mesh(new T.ConeGeometry(.075,.68,7),coreMaterial.clone());
      outer.rotation.z=core.rotation.z=Math.PI/2;outer.position.x=-.43;core.position.x=-.27;marker.add(outer,core);flames.push({outer,core,marker});
    }
    flameMaterial.dispose();coreMaterial.dispose();
    const internals=this.makeInternals(view);
    view.cinematicFx={particles,particleGeometry,particleCursor:0,particleTick:0,flames,flameEnergy:0,marks,markGeometry,markMaterial,markEntries:[],markCursor:0,markTick:0,internals,cutaway:null,materials:[],lastBoost:false,counts:{vapor:0,tire:0,marks:0}};
  },
  makeInternals(view){
    const T=THREE,vehicle=Race.vehicle(),length=vehicle.lengthM,width=vehicle.widthM,group=new T.Group();group.name='RaceSuccessCutaway';group.visible=false;view.car.add(group);
    const colors={chassis:0x84d5dc,drivetrain:0xffb95e,suspension:0x77dea1,brakes:0xff6d52,cooling:0x78caff},parts={},boxGeometry=new T.BoxGeometry(1,1,1),cylinderGeometry=new T.CylinderGeometry(1,1,1,12),materials=Object.fromEntries(Object.entries(colors).map(([key,color])=>[key,new T.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false,depthTest:false,toneMapped:false})]));
    const add=(system,geometry,x,y,z,sx,sy,sz,rotation=0)=>{const mesh=new T.Mesh(geometry,materials[system]);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.z=rotation;mesh.renderOrder=10;group.add(mesh);(parts[system]??=[]).push(mesh);};
    for(const side of [-1,1])add('chassis',boxGeometry,0,.56,side*width*.29,length*.8,.08,.08);
    add('chassis',boxGeometry,-length*.32,.56,0,.1,.08,width*.6);add('chassis',boxGeometry,length*.32,.56,0,.1,.08,width*.6);
    add('drivetrain',boxGeometry,length*.13,.7,0,length*.3,.27,.36);
    add('drivetrain',cylinderGeometry,-length*.12,.53,0,.07,length*.6,.07,Math.PI/2);
    for(const side of [-1,1]){
      add('suspension',cylinderGeometry,-length*.28,.55,side*width*.34,.045,.62,.045,side*.55);
      add('suspension',cylinderGeometry,length*.28,.55,side*width*.34,.045,.62,.045,-side*.55);
      add('brakes',cylinderGeometry,-length*.28,.43,side*width*.43,.21,.035,.21,Math.PI/2);
      add('brakes',cylinderGeometry,length*.28,.43,side*width*.43,.21,.035,.21,Math.PI/2);
      add('cooling',boxGeometry,length*.05,.85,side*.2,length*.43,.045,.045);
    }
    add('cooling',boxGeometry,length*.34,.63,0,.13,.39,width*.53);
    return{group,parts,boxGeometry,cylinderGeometry,materials};
  },
  emit(view,kind,origin,life,scale,color,velocity){
    const fx=view.cinematicFx;if(!fx)return;
    const particle=fx.particles[fx.particleCursor++%fx.particles.length];particle.kind=kind;particle.age=0;particle.life=life;particle.velocity=velocity;
    particle.mesh.position.copy(origin);particle.mesh.scale.setScalar(scale);particle.mesh.material.color.setHex(color);particle.mesh.material.opacity=kind==='vapor'?.11:.27;particle.mesh.visible=true;
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
    fx.cutaway={system:chosen,elapsed:0,duration:reduce?2.4:3};fx.internals.group.visible=true;
    if(view.cutawayCaption){view.cutawayCaption.textContent={chassis:'CHASSIS · the car’s load path',drivetrain:'DRIVETRAIN · power to the wheels',suspension:'SUSPENSION · grip through the turn',brakes:'BRAKES · energy into heat',cooling:'COOLING · airflow restores power'}[chosen];view.cutawayCaption.hidden=false;}
    view.car.traverse(node=>{if(!node.isMesh||fx.internals.group.getObjectById(node.id))return;for(const material of [node.material].flat())if(material&&!fx.materials.some(entry=>entry.material===material)){fx.materials.push({material,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});material.transparent=true;material.opacity=Math.min(material.opacity,.15);material.depthWrite=false;}});
    for(const [key,meshes] of Object.entries(fx.internals.parts))for(const mesh of meshes)mesh.material.opacity=key===chosen?.96:.3;
  },
  endCutaway(view){const fx=view.cinematicFx;if(!fx)return;for(const entry of fx.materials){entry.material.opacity=entry.opacity;entry.material.transparent=entry.transparent;entry.material.depthWrite=entry.depthWrite;}fx.materials.length=0;fx.internals.group.visible=false;fx.cutaway=null;if(view.cutawayCaption)view.cutawayCaption.hidden=true;},
  step(view,dt){
    const fx=view.cinematicFx,t=Race.telemetry,s=Race.st;if(!fx||!t)return;
    const visualStep=!PAUSE.on&&!document.hidden?Math.min(.05,Math.max(0,dt)):0,active=Race.state==='run'&&!PAUSE.on&&!document.hidden,step=active?visualStep:0,boost=active&&s.nitroDelivered&&t.nosPulse>0&&!t.overheat;
    const envelope=!active?0:boost?Math.min(1,fx.flameEnergy+step*8):Math.max(0,fx.flameEnergy-step*6);fx.flameEnergy=envelope;
    for(const {outer,core} of fx.flames){outer.material.opacity=reduce?0:envelope*.75;core.material.opacity=reduce?0:envelope*.9;outer.visible=core.visible=!reduce&&envelope>.02;outer.scale.y=.55+envelope*.65;core.scale.y=.5+envelope*.4;}
    const heat=t.heat,load=t.torque,stage=RACE_TELEMETRY.thermalStage(t),vaporRate=active&&!reduce&&stage!=='normal'?(stage==='critical'?4:stage==='hot'?2.5:1.1):active&&!reduce&&load>.62?1.2:0;
    fx.particleTick+=step*vaporRate;
    while(fx.particleTick>=1){fx.particleTick--;for(const {marker} of fx.flames)this.emit(view,'vapor',marker.getWorldPosition(new THREE.Vector3()),.72,.07,heat>.76?0x9da9af:0xc2c9cc,new THREE.Vector3(-Math.cos(s.th)*.55,.16,-Math.sin(s.th)*.55));}
    const launch=active&&s.launchSlip>.03&&s.v<8,drift=active&&(s.driftMode==='drift'||s.driftMode==='skid')&&Math.abs(s.slipAngle||0)>.08,brakeSlip=active&&t.braking>.32&&(s.driftMode==='skid'||Math.abs(s.slipAngle||0)>.16),tireEvent=launch||drift||brakeSlip;
    fx.markTick+=step*(tireEvent?13:0);
    while(fx.markTick>=1){fx.markTick--;const wheelNames=brakeSlip?['WheelFrontLeft','WheelFrontRight','RearTireLeft','RearTireRight']:['RearTireLeft','RearTireRight'];
      for(const name of wheelNames){const point=this.roadContact(view,view.car.getObjectByName(name));if(!point)continue;this.mark(view,point);if(!reduce&&fx.markCursor%3===0)this.emit(view,'tire',new THREE.Vector3(point.x,.17,point.z),.65,.09,0xb3b9bd,new THREE.Vector3(0,.5,0));}
    }
    if(!tireEvent)fx.markTick=0;
    for(const particle of fx.particles){if(!particle.mesh.visible)continue;if(!active&&Race.state==='run'){particle.mesh.visible=false;continue;}particle.age+=visualStep;particle.mesh.position.addScaledVector(particle.velocity,visualStep);particle.mesh.scale.multiplyScalar(1+visualStep*.8);particle.mesh.material.opacity=(particle.kind==='vapor'?.11:.27)*Math.max(0,1-particle.age/particle.life);if(particle.age>=particle.life)particle.mesh.visible=false;}
    const dummy=new THREE.Object3D();for(let i=0;i<fx.marks.count;i++){const mark=fx.markEntries[i];if(!mark){dummy.scale.setScalar(0);}else{mark.age+=visualStep;const opacity=Math.max(0,1-mark.age/5.5);dummy.position.set(mark.x,.048,mark.z);dummy.rotation.set(0,-mark.heading,0);dummy.scale.set(opacity,.8,opacity);fx.marks.setColorAt(i,new THREE.Color().setRGB(.13+(.38*(1-opacity)),.13+(.4*(1-opacity)),.14+(.43*(1-opacity))));}dummy.updateMatrix();fx.marks.setMatrixAt(i,dummy.matrix);}fx.marks.instanceMatrix.needsUpdate=true;if(fx.marks.instanceColor)fx.marks.instanceColor.needsUpdate=true;
    if(fx.cutaway&&Race.state==='done'&&!PAUSE.on&&!document.hidden){fx.cutaway.elapsed+=Math.min(.05,dt);if(fx.cutaway.elapsed>=fx.cutaway.duration)this.endCutaway(view);}
    fx.lastBoost=boost;fx.counts.vapor=fx.particles.filter(p=>p.mesh.visible&&p.kind==='vapor').length;fx.counts.tire=fx.particles.filter(p=>p.mesh.visible&&p.kind==='tire').length;
    globalThis.__KICKLAB_RACE_FX__={vehicle:Race.vehicle().id,boost,flameEnergy:fx.flameEnergy,vapor:fx.counts.vapor,tireSmoke:fx.counts.tire,markPool:72,markCount:fx.marks.count,visibleMarks:fx.markEntries.filter(mark=>mark&&mark.age<5.5).length,markEmissions:fx.counts.marks,cutaway:fx.cutaway?{system:fx.cutaway.system,elapsed:fx.cutaway.elapsed,duration:fx.cutaway.duration}:null,reducedMotion:!!reduce};
  },
  clear(view,dispose=false){
    const fx=view.cinematicFx;if(!fx)return;globalThis.__KICKLAB_RACE_FX__=null;this.endCutaway(view);
    for(const particle of fx.particles)particle.mesh.visible=false;
    fx.markEntries.length=0;fx.marks.count=0;fx.markCursor=fx.particleCursor=0;fx.markTick=fx.particleTick=fx.flameEnergy=0;fx.counts={vapor:0,tire:0,marks:0};
    for(const {outer,core} of fx.flames){outer.visible=core.visible=false;outer.material.opacity=core.material.opacity=0;}
    if(!dispose)return;
    for(const particle of fx.particles){view.scene.remove(particle.mesh);particle.mesh.material.dispose();}fx.particleGeometry.dispose();
    view.scene.remove(fx.marks);fx.markGeometry.dispose();fx.markMaterial.dispose();
    for(const {outer,core,marker} of fx.flames){marker.remove(outer,core);outer.geometry.dispose();core.geometry.dispose();outer.material.dispose();core.material.dispose();}
    view.car?.remove(fx.internals.group);fx.internals.boxGeometry.dispose();fx.internals.cylinderGeometry.dispose();Object.values(fx.internals.materials).forEach(material=>material.dispose());view.cinematicFx=null;
  }
};
