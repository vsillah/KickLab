/* Optional Race Garage inspection bay. Own renderer; no saved state or physics writes. */
const RACE_INSPECT={
  host:null,renderer:null,scene:null,camera:null,car:null,frame:0,token:0,part:'whole',assetId:null,loaded:false,failed:false,metrics:null,cameraGoal:null,lookGoal:null,marker:null,contact:null,brake:null,loadBar:null,loadMarker:null,focusLight:null,lastFrame:0,frames:0,
  poses:{
    whole:{position:[8.0,4.0,9.0],look:[0,.72,0],fov:42},
    suspension:{position:[5.8,2.7,6.8],look:[.65,.72,.55],fov:43},
    tires:{position:[5.0,2.15,6.0],look:[.9,.53,.7],fov:41},
    brakes:{position:[5.3,2.3,6.3],look:[.95,.59,.7],fov:42}
  },
  mount(host,vehicle,part,metrics){
    if(!host)return;
    this.host=host;this.metrics=metrics;this.part=part;
    if(!window.THREE||best.gfx==='2d'||RACE_3D.failed){this.dispose();this.host=host;this.part=part;this.metrics=metrics;this.fallback('Canvas mode · local vehicle still');return;}
    if(this.renderer&&this.assetId===vehicle.id&&!this.failed){
      host.prepend(this.renderer.domElement);this.update(part,metrics);this.start();return;
    }
    this.dispose();this.host=host;this.assetId=vehicle.id;this.part=part;this.metrics=metrics;this.failed=false;
    const T=THREE;
    try{
      const token=++this.token;
      const canvas=document.createElement('canvas');canvas.className='race-inspection-canvas';canvas.setAttribute('aria-hidden','true');
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(token!==this.token)return;this.failed=true;this.dispose();this.host=host;this.fallback('3D unavailable · local vehicle still');});
      this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
      this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.5;
      this.renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
      this.scene=new T.Scene();this.scene.background=new T.Color(0x102732);
      this.camera=new T.PerspectiveCamera(42,16/9,.12,60);
      this.scene.add(new T.HemisphereLight(0xe6f6ff,0x354246,2.4));
      const key=new T.DirectionalLight(0xffe5bd,3.4);key.position.set(4,8,5);this.scene.add(key);
      const fill=new T.DirectionalLight(0x78c8e7,1.6);fill.position.set(-5,4,-4);this.scene.add(fill);
      const floor=new T.Mesh(new T.PlaneGeometry(22,22),new T.MeshStandardMaterial({color:0x203941,roughness:.9}));
      floor.rotation.x=-Math.PI/2;floor.position.y=-.025;this.scene.add(floor);
      host.prepend(canvas);
      new T.GLTFLoader().load(vehicle.assetUrl,gltf=>{
        if(token!==this.token){gltf.scene.traverse(node=>{node.geometry?.dispose();for(const material of [node.material].flat())material?.dispose();});return;}
        this.car=gltf.scene;this.car.name='RaceInspection'+vehicle.name;
        const wheels=['WheelFrontLeft','WheelFrontRight','WheelRearLeft','WheelRearRight'];
        if(wheels.some(name=>!this.car.getObjectByName(name))){this.failed=true;this.dispose();this.host=host;this.fallback('Wheel binding unavailable · local vehicle still');return;}
        this.scene.add(this.car);this.loaded=true;this.makeMarkers();this.update(part,metrics);this.start();
      },undefined,()=>{if(token===this.token){this.failed=true;this.dispose();this.host=host;this.fallback('3D unavailable · local vehicle still');}});
      this.update(part,metrics);this.start();
    }catch(_){this.failed=true;this.dispose();this.host=host;this.fallback('3D unavailable · local vehicle still');}
  },
  makeMarkers(){
    const T=THREE,group=new T.Group();group.name='RaceInspectionCues';this.scene.add(group);this.marker=group;
    this.focusLight=new T.PointLight(0xffd18a,2.2,4.2,1.6);this.focusLight.position.set(1.55,1.45,2.25);this.scene.add(this.focusLight);
    this.contact=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:48},(_,i)=>{const a=i*Math.PI*2/48;return new T.Vector3(1.28+Math.cos(a)*.52,.048,1.04+Math.sin(a)*.44);})),new T.LineBasicMaterial({color:0x89e5b4,depthTest:false}));this.contact.renderOrder=8;group.add(this.contact);
    this.brake=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:48},(_,i)=>{const a=i*Math.PI*2/48;return new T.Vector3(1.28+Math.cos(a)*.42,.43+Math.sin(a)*.42,1.155);})),new T.LineBasicMaterial({color:0xffa875,depthTest:false}));this.brake.renderOrder=8;group.add(this.brake);
    const indicatorMaterial=new T.MeshBasicMaterial({color:0xffd58a,depthTest:false,depthWrite:false});
    this.loadBar=new T.Mesh(new T.BoxGeometry(.025,1.1,.025),indicatorMaterial.clone());this.loadBar.position.set(1.78,.66,1.12);this.loadBar.renderOrder=8;group.add(this.loadBar);
    this.loadMarker=new T.Mesh(new T.BoxGeometry(.29,.065,.055),indicatorMaterial);this.loadMarker.position.set(1.78,.7,1.14);this.loadMarker.renderOrder=9;group.add(this.loadMarker);
  },
  update(part,metrics){
    this.part=part||'whole';this.metrics=metrics||this.metrics;
    const pose=this.poses[this.part]||this.poses.whole,T=window.THREE;
    if(this.camera&&T){this.cameraGoal=new T.Vector3(...pose.position);this.lookGoal=new T.Vector3(...pose.look);if(reduce||!this.camera.userData.look){this.camera.position.copy(this.cameraGoal);this.camera.userData.look=this.lookGoal.clone();this.camera.fov=pose.fov;}}
    if(this.contact)this.contact.visible=this.part==='tires';
    if(this.brake)this.brake.visible=this.part==='brakes';
    if(this.loadBar)this.loadBar.visible=this.part==='suspension';
    if(this.loadMarker){this.loadMarker.visible=this.part==='suspension';const transfer=Math.max(.5,Math.min(1.5,this.metrics?.transfer||1));this.loadMarker.position.y=.7+(transfer-1)*.38;}
    if(this.brake)this.brake.material.color.setHex((this.metrics?.brakeHeat||1)>1.1?0xff8b65:0xffbc83);
    if(this.contact)this.contact.material.color.setHex((this.metrics?.tireHeat||1)>1.1?0xffba76:0x89e5b4);
    if(this.focusLight){this.focusLight.intensity=this.part==='whole'?.55:2.2;this.focusLight.color.setHex(this.part==='brakes'?0xffa66f:this.part==='tires'?0x8ff0bf:0xffd18a);}
    if(this.host)this.host.dataset.inspectionPart=this.part;
    this.start();
  },
  fallback(message){if(!this.host)return;this.host.dataset.inspectionFallback=message;this.host.dataset.inspectionPart=this.part;const label=this.host.querySelector('.race-inspection-fallback');if(label)label.textContent=message;},
  start(){if(this.frame||!this.renderer||!this.host||!this.host.isConnected||document.hidden)return;this.frame=requestAnimationFrame(time=>this.draw(time));},
  draw(time){
    this.frame=0;if(!this.renderer||!this.host?.isConnected||document.hidden)return;
    const w=this.host.clientWidth,h=this.host.clientHeight;if(w<10||h<10)return;
    if(!this.lastFrame||time-this.lastFrame>=28||reduce){
      const pose=this.poses[this.part]||this.poses.whole,blend=reduce?1:.16;
      if(!this.camera.userData.look)this.camera.userData.look=new THREE.Vector3(...pose.look);
      this.camera.position.lerp(this.cameraGoal,blend);this.camera.userData.look.lerp(this.lookGoal,blend);
      this.camera.fov+=(pose.fov-this.camera.fov)*blend;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.camera.lookAt(this.camera.userData.look);
      if(this.loadMarker&&!reduce&&this.part==='suspension'){const amplitude=.09*Math.min(1.4,Math.max(.65,this.metrics?.transfer||1));const recovery=Math.min(1.5,Math.max(.6,this.metrics?.recovery||1));this.loadMarker.position.y=.7+(this.metrics.transfer-1)*.38+Math.sin(time*.002*recovery)*amplitude;}
      this.renderer.setSize(w,h,false);this.renderer.render(this.scene,this.camera);this.lastFrame=time;this.frames++;
    }
    if(!reduce||this.camera.position.distanceTo(this.cameraGoal)>.01)this.frame=requestAnimationFrame(next=>this.draw(next));
  },
  detach(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.renderer?.domElement.remove();this.host=null;},
  dispose(){
    this.detach();this.token++;
    if(this.scene)this.scene.traverse(node=>{node.geometry?.dispose();for(const material of [node.material].flat())material?.dispose();});
    this.renderer?.dispose();this.renderer?.forceContextLoss();this.scene=this.camera=this.renderer=this.car=this.marker=this.contact=this.brake=this.loadBar=this.loadMarker=this.focusLight=null;
    this.assetId=null;this.loaded=false;this.lastFrame=0;
  },
  state(){return{mounted:!!this.host,loaded:this.loaded,failed:this.failed,vehicle:this.assetId,part:this.part,frames:this.frames,memory:this.renderer?{...this.renderer.info.memory}:null};}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)RACE_INSPECT.detach();else if(RACE_INSPECT.renderer&&RACE_PREFLIGHT_ON&&RACE_PREFLIGHT.phase===2&&!$('#racePreflight').hidden){RACE_INSPECT.host=$('#raceInspectionStage');RACE_INSPECT.host.prepend(RACE_INSPECT.renderer.domElement);RACE_INSPECT.start();}});
