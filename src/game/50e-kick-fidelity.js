/* ---------- Kick stadium fidelity experiment ("Dusk kickoff, lights just on" and "Night under the lights"). Default off.
   Opt in with ?kickFidelity=dusk, ?kickFidelity=night or ?kickFidelity=dusk,night. Draw-only: reads Kick.opt, the camera and already-placed rigs; never writes game state.
   Uses its own seeded generator (never Math.random) and the render clock only. dispose() puts today's scene back.
   ?kickReview=K1..K6 is a dev-only fixed-camera hook for screenshot review; it works with the flag on or off. ---------- */
const KICK_FIDELITY_PARAMS=new URLSearchParams(location.search);
const KICK_FIDELITY={
  looks:(KICK_FIDELITY_PARAMS.get('kickFidelity')||'').split(',').filter(name=>name==='dusk'||name==='night'),get flag(){return this.looks.length>0;},cur:'',
  review:/^K[1-6]$/.test(KICK_FIDELITY_PARAMS.get('kickReview')||'')?KICK_FIDELITY_PARAMS.get('kickReview'):null,
  ladderLocked:KICK_FIDELITY_PARAMS.get('kickFidelityLadder')==='off',
  active:false,failed:false,reason:'flag-off',tier:0,res:null,last:null,
  SUN:[-.793,.259,.551],
  /* one parameter set per time of day. key = direction to the shadow-casting light: the low sun at dusk (today's bearing, 15 degrees up),
     one floodlight tower at night. keyTower names the tower the key light stands in for, so it gets no second, faked shadow. */
  LOOKS:{dusk:{key:[-.793,.259,.551],keyTower:-1,keyColor:0xffa25c,keyPower:4.4,flood:.4,env:.5,hemi:.22,ambient:.04,lamp:2.4,exposure:1,glow:13,blob:.085,bloom:.5,haze:.6,hazeWarm:[1.05,.52,.24],hazeCool:[.2,.19,.3],fog:[75,290]},
    night:{key:[-.656,.453,-.604],keyTower:0,keyColor:0xe8efff,keyPower:1.55,flood:1.05,env:.42,hemi:.1,ambient:.03,lamp:4.2,exposure:1.06,glow:19,blob:.15,bloom:.85,haze:.42,hazeWarm:[.07,.085,.13],hazeCool:[.018,.026,.05],fog:[60,300]}},
  TOWERS:[[-50,-46],[-50,46],[50,-46],[50,46]],TOWER_H:34.5,
  publish(extra){window.__KICKLAB_KICK_FIDELITY_AUDIT__=Object.assign({flag:this.flag,active:this.active,failed:this.failed,reason:this.reason,tier:this.tier,review:this.review},extra||{});},
  wantLook(){if(!this.flag||this.failed||Kick.opt.stad!=='home')return null;const time=GAME_CORE.normalizeKickTime(Kick.opt.time);return this.looks.includes(time)?time:null;},
  /* seeded generator and value noise: deterministic, independent of gameplay randomness */
  rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};},
  hash(x,y,z){let h=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(z,2147483647)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;},
  noise(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf),H=this.hash,L=(a,b,t)=>a+(b-a)*t;
    return L(L(L(H(xi,yi,zi),H(xi+1,yi,zi),u),L(H(xi,yi+1,zi),H(xi+1,yi+1,zi),u),v),L(L(H(xi,yi,zi+1),H(xi+1,yi,zi+1),u),L(H(xi,yi+1,zi+1),H(xi+1,yi+1,zi+1),u),v),w);},
  fbm(x,y,z,oct){let s=0,a=.5,f=1;for(let i=0;i<oct;i++){s+=a*this.noise(x*f,y*f,z*f);a*=.5;f*=2.03;}return s;},
  /* one analytic dusk sky, in linear light. Drives the backdrop, the reflection map and the fog colour. */
  sky(dx,dy,dz,hdr,night){const S=this.LOOKS.dusk.key,mix=(a,b,t)=>a+(b-a)*t,sat=t=>t<0?0:t>1?1:t,hl=Math.hypot(dx,dz)||1e-6,sh=Math.hypot(S[0],S[2]);
    if(night){const e=dy;if(hdr&&e<-.01){const g=sat(1+e*3);return[mix(.004,.02,g),mix(.008,.03,g),mix(.006,.022,g)];}
      /* night: near-black blue overhead, a faint warm town glow on the horizon, thin cloud lit from below (no stars: the lamps wash them out) */
      const ee=Math.max(e,0),k1=1-Math.pow(1-sat(ee/.3),2),k2=sat((ee-.2)/.6);let r=mix(mix(.06,.014,k1),.0035,k2),g=mix(mix(.052,.019,k1),.0055,k2),b=mix(mix(.058,.042,k1),.016,k2);
      let cloud=0;if(e>.02&&e<.7){const band=sat((e-.02)/.1)*sat((.7-e)/.4);cloud=sat((this.fbm(dx*1.7+3,dy*8.5,dz*1.7+19,4)-.45)*3.4)*band;r=mix(r,.05,cloud*.6);g=mix(g,.055,cloud*.6);b=mix(b,.075,cloud*.6);}
      if(hdr)for(const[tx,tz]of this.TOWERS){const len=Math.hypot(tx,this.TOWER_H,tz),lamp=Math.pow(sat((dx*tx+dy*this.TOWER_H+dz*tz)/len),1400);r+=lamp*66;g+=lamp*70;b+=lamp*78;}
      return[r,g,b];}
    const toward=((dx/hl)*(S[0]/sh)+(dz/hl)*(S[2]/sh))*.5+.5,cosSun=dx*S[0]+dy*S[1]+dz*S[2],e=dy;
    if(hdr&&e<-.01){const g=sat(1+e*3);return[mix(.012,.05,g),mix(.02,.055,g),mix(.018,.05,g)];}     /* reflection map only: dark ground bounce below the horizon */
    const tw=toward*toward,zen=[.03,.062,.21],mid=[.2,.19,.4],warm=[1.25,.56,.22],pink=[.78,.4,.42],dusk=[.4,.33,.46];
    /* away from the sun: a blue-grey band on the horizon with a pink arch above it; toward the sun: orange */
    const arch=sat(e/.09),lowR=mix(mix(dusk[0],pink[0],arch),warm[0],tw),lowG=mix(mix(dusk[1],pink[1],arch),warm[1],tw),lowB=mix(mix(dusk[2],pink[2],arch),warm[2],tw);
    const ee=Math.max(e,0),t1=sat(ee/.3),t2=sat((ee-.2)/.65),k1=1-Math.pow(1-t1,1.8),k2=t2*t2*(3-2*t2);
    let r=mix(mix(lowR,mid[0],k1),zen[0],k2),g=mix(mix(lowG,mid[1],k1),zen[1],k2),b=mix(mix(lowB,mid[2],k1),zen[2],k2);
    const glow=Math.pow(sat(cosSun),6)*.6+Math.pow(sat(cosSun),48)*1.5;r+=glow*1.25;g+=glow*.62;b+=glow*.26;
    if(e>.02&&e<.8){const band=sat((e-.02)/.08)*sat((.8-e)/.45),n=this.fbm(dx*1.7+11,dy*8.5,dz*1.7-7,5),c=sat((n-.43)*4.2)*band;
      if(c>0){const lit=.35+.65*Math.pow(toward,1.4),under=sat(1.3-n*1.9),cr=mix(.26,1.7,lit*under),cg=mix(.24,.74,lit*under),cb=mix(.36,.5,lit*under);r=mix(r,cr,c*.85);g=mix(g,cg,c*.85);b=mix(b,cb,c*.85);}}
    if(hdr){const disc=Math.pow(sat(cosSun),900);r+=disc*60;g+=disc*34;b+=disc*14;
      for(const[tx,tz]of this.TOWERS){const len=Math.hypot(tx,this.TOWER_H,tz),lamp=Math.pow(sat((dx*tx+dy*this.TOWER_H+dz*tz)/len),1400);r+=lamp*42;g+=lamp*44;b+=lamp*48;}}
    return[r,g,b];},
  /* backdrop, reflection map and fog for one time of day, built the first time it is needed */
  buildSky(V3,name){const T=THREE,night=name==='night',sky={};
    {const w=1024,h=512,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),img=g.createImageData(w,h),d=img.data,enc=v=>{v=v/(1+v*.55);return 255*Math.pow(v<0?0:v>1?1:v,1/2.2);};   /* soft shoulder, then display gamma */
      for(let y=0;y<h;y++){const el=(.5-(y+.5)/h)*Math.PI,ce=Math.cos(el),se=Math.sin(el);for(let x=0;x<w;x++){const az=((x+.5)/w-.5)*Math.PI*2,p=this.sky(Math.cos(az)*ce,se,Math.sin(az)*ce,false,night),i=(y*w+x)*4;d[i]=enc(p[0]);d[i+1]=enc(p[1]);d[i+2]=enc(p[2]);d[i+3]=255;}}
      g.putImageData(img,0,0);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.mapping=T.EquirectangularReflectionMapping;sky.backdrop=t;}
    {const w=256,h=128,data=new Uint16Array(w*h*4),hf=T.DataUtils.toHalfFloat;
      for(let y=0;y<h;y++){const el=((y+.5)/h-.5)*Math.PI,ce=Math.cos(el),se=Math.sin(el);for(let x=0;x<w;x++){const az=((x+.5)/w-.5)*Math.PI*2,p=this.sky(Math.cos(az)*ce,se,Math.sin(az)*ce,true,night),i=(y*w+x)*4;data[i]=hf(Math.min(p[0],60000));data[i+1]=hf(Math.min(p[1],60000));data[i+2]=hf(Math.min(p[2],60000));data[i+3]=hf(1);}}
      const src=new T.DataTexture(data,w,h,T.RGBAFormat,T.HalfFloatType);src.mapping=T.EquirectangularReflectionMapping;src.colorSpace=T.LinearSRGBColorSpace;src.magFilter=src.minFilter=T.LinearFilter;src.needsUpdate=true;
      const pm=new T.PMREMGenerator(V3.R);sky.envRT=pm.fromEquirectangular(src);pm.dispose();src.dispose();}
    {const hz=this.sky(.6,.004,-.8,false,night),range=this.LOOKS[name].fog;sky.fog=new T.Fog(new T.Color().setRGB(hz[0],hz[1],hz[2]),range[0],range[1]);}
    return sky;},
  build(V3){const T=THREE,res=this.res={sky:{}};
    res.floods=this.TOWERS.map(([x,z])=>{const l=new T.DirectionalLight(0xdfe9ff,.4);l.position.set(x,this.TOWER_H,z);l.target.position.set(0,0,0);l.castShadow=false;return l;});
    {const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.45,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
      const a=new T.CanvasTexture(c),geo=new T.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);res.blobTex=a;res.blobGeo=geo;
      res.blobMat=new T.MeshBasicMaterial({color:0x040a12,alphaMap:a,transparent:true,opacity:.085,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      res.blobs=new T.InstancedMesh(geo,res.blobMat,160);res.blobs.frustumCulled=false;res.blobs.renderOrder=2;res.blobs.count=0;res.dummy=new T.Object3D();}
    this.buildPitch(V3);this.buildCrowd(V3);this.buildLens(V3);
    {const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.clearRect(0,0,128,128);g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=1.6;for(let i=0;i<=128;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,128);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(128,i);g.stroke();}
      res.netTex=new T.CanvasTexture(c);res.netTex.wrapS=res.netTex.wrapT=T.RepeatWrapping;res.netTex.colorSpace=T.SRGBColorSpace;res.netTex.anisotropy=4;
      res.nets=V3.netGroup.children.map(mesh=>{const old=mesh.material,t=res.netTex.clone();t.needsUpdate=true;t.repeat.copy(old.map.repeat).multiplyScalar(2);return{mesh,old,mat:new T.MeshBasicMaterial({map:t,color:0xc9c4cc,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false})};});}
  },
  /* lens: one hand-written post pass on core render targets. Bloom from real light sources only, bowl haze from depth, vignette, static grain. */
  buildLens(V3){const T=THREE,res=this.res,tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));tri.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
    const quad=new T.Mesh(tri,null);quad.frustumCulled=false;const scene=new T.Scene();scene.add(quad);const cam=new T.OrthographicCamera(-1,1,1,-1,0,1),vs='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
    const mk=(fs,uniforms,toneMapped)=>new T.ShaderMaterial({vertexShader:vs,fragmentShader:fs,uniforms,depthTest:false,depthWrite:false,toneMapped:!!toneMapped,fog:false});
    const L=res.lens={quad,scene,cam,w:0,h:0,scale:1,
      bright:mk('varying vec2 vUv;uniform sampler2D tScene;uniform vec2 texel;void main(){vec3 c=vec3(0.0);for(int i=0;i<4;i++){vec2 o=vec2(i==0||i==2?-1.0:1.0,i<2?-1.0:1.0)*texel;vec3 s=min(texture2D(tScene,vUv+o).rgb,vec3(6.0));float l=max(s.r,max(s.g,s.b));c+=s*smoothstep(1.35,2.6,l);}gl_FragColor=vec4(c*0.25,1.0);}',{tScene:{value:null},texel:{value:new T.Vector2()}}),
      blur:mk('varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 dir;void main(){vec3 c=texture2D(tSrc,vUv).rgb*0.227;c+=(texture2D(tSrc,vUv+dir*1.385).rgb+texture2D(tSrc,vUv-dir*1.385).rgb)*0.316;c+=(texture2D(tSrc,vUv+dir*3.231).rgb+texture2D(tSrc,vUv-dir*3.231).rgb)*0.0703;gl_FragColor=vec4(c,1.0);}',{tSrc:{value:null},dir:{value:new T.Vector2()}}),
      out:mk(`varying vec2 vUv;uniform sampler2D tScene;uniform sampler2D tBloom;uniform sampler2D tDepth;uniform mat4 invProj;uniform mat4 camWorld;uniform vec3 sunDir;uniform vec3 hazeWarm;uniform vec3 hazeCool;uniform float bloom;uniform float hazeAmt;uniform float grain;uniform vec2 px;
void main(){vec3 col=texture2D(tScene,vUv).rgb;float d=texture2D(tDepth,vUv).x;vec4 v=invProj*vec4(vUv*2.0-1.0,d*2.0-1.0,1.0);v/=v.w;vec3 ray=(camWorld*vec4(v.xyz,0.0)).xyz;float dist=length(ray);ray/=max(dist,0.001);vec3 eye=camWorld[3].xyz;
float y0=max(eye.y,0.0),den=0.0026;float along=min(dist,420.0);float fall=0.045;float od=den*exp(-y0*fall)*(abs(ray.y)>0.0005?(1.0-exp(-ray.y*fall*along))/(ray.y*fall):along);float haze=1.0-exp(-max(od,0.0));
float toSun=pow(max(dot(ray,sunDir),0.0),5.0);col=mix(col,mix(hazeCool,hazeWarm,toSun),haze*hazeAmt);col+=texture2D(tBloom,vUv).rgb*bloom;
vec2 q=vUv-0.5;col*=1.0-dot(q,q)*0.38;float n=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);col*=1.0+(n-0.5)*grain;
gl_FragColor=vec4(col,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,{tScene:{value:null},tBloom:{value:null},tDepth:{value:null},invProj:{value:new T.Matrix4()},camWorld:{value:new T.Matrix4()},sunDir:{value:new T.Vector3(...this.SUN)},hazeWarm:{value:new T.Color().setRGB(1.05,.52,.24)},hazeCool:{value:new T.Color().setRGB(.2,.19,.3)},bloom:{value:.5},hazeAmt:{value:.6},grain:{value:.035},px:{value:new T.Vector2()}},true)};
    L.size=(w,h)=>{if(L.w===w&&L.h===h)return;L.w=w;L.h=h;for(const k of['rt','b1','b2'])if(L[k])L[k].dispose();
      L.rt=new T.WebGLRenderTarget(w,h,{type:T.HalfFloatType,samples:innerWidth<=480?2:4,depthBuffer:true});L.rt.depthTexture=new T.DepthTexture(w,h);
      const bw=Math.max(2,w>>2),bh=Math.max(2,h>>2),o={type:T.HalfFloatType,depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter};L.b1=new T.WebGLRenderTarget(bw,bh,o);L.b2=new T.WebGLRenderTarget(bw,bh,o);};
    L.pass=(R,mat,target)=>{quad.material=mat;R.setRenderTarget(target);R.render(scene,cam);};
  },
  lensDraw(V3){const T=THREE,R=V3.R,L=this.res.lens,sz=R.getDrawingBufferSize(new T.Vector2()),sc=this.tier>=2?.7:this.tier>=1?.82:1;L.size(Math.max(2,Math.round(sz.x*sc)),Math.max(2,Math.round(sz.y*sc)));
    R.setRenderTarget(L.rt);R.render(V3.S,V3.cam);
    L.bright.uniforms.tScene.value=L.rt.texture;L.bright.uniforms.texel.value.set(1/L.w,1/L.h);L.pass(R,L.bright,L.b1);
    for(let i=0;i<2;i++){L.blur.uniforms.tSrc.value=L.b1.texture;L.blur.uniforms.dir.value.set((1+i*1.6)/L.b1.width,0);L.pass(R,L.blur,L.b2);L.blur.uniforms.tSrc.value=L.b2.texture;L.blur.uniforms.dir.value.set(0,(1+i*1.6)/L.b1.height);L.pass(R,L.blur,L.b1);}
    const u=L.out.uniforms;u.tScene.value=L.rt.texture;u.tBloom.value=L.b1.texture;u.tDepth.value=L.rt.depthTexture;u.invProj.value.copy(V3.cam.projectionMatrixInverse);V3.cam.updateMatrixWorld();u.camWorld.value.copy(V3.cam.matrixWorld);u.grain.value=reduce?0:.035;
    L.pass(R,L.out,null);},
  /* fallback ladder: when the 95th-percentile frame time stays over budget for two seconds, give something up. Never steps during a pause. */
  ladder(V3){if(this.ladderLocked||PAUSE.on)return;const now=performance.now(),dt=now-(this.lastT||now);this.lastT=now;if(dt<=0||dt>250)return;const W=this.win||(this.win={t:0,s:[],over:0});W.t+=dt;W.s.push(dt);if(W.t<1000)return;
    W.s.sort((a,b)=>a-b);const p95=W.s[Math.min(W.s.length-1,Math.floor(W.s.length*.95))],budget=innerWidth<=480?40:24;this.p95=p95;W.over=p95>budget?W.over+1:0;W.t=0;W.s=[];
    if(W.over>=2){W.over=0;this.tier++;if(this.tier===3)this.shadowSize(V3,1024);if(this.tier>=5){this.deactivate(V3,'budget');this.failed=true;this.reason='budget';}this.publish({p95:Math.round(p95*10)/10});}},
  shadowSize(V3,size){const sh=V3.dl.shadow;if(sh.mapSize.x===size)return;sh.mapSize.set(size,size);if(sh.map){sh.map.dispose();sh.map=null;}},
  /* crowd: every stand filled with instanced supporters in sectioned colour blocks (invented colours), one draw call per stand */
  buildCrowd(V3){const T=THREE,res=this.res,rnd=this.rng(20261122),pos=[],part=[];
    const tri=(a,b,c,k)=>{pos.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);part.push(k,k,k);},quad=(a,b,c,d,k)=>{tri(a,b,c,k);tri(a,c,d,k);};
    const prism=(A,B,ra,rb,n,k,caps)=>{const ax=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],l=Math.hypot(...ax)||1,d=ax.map(v=>v/l),ref=Math.abs(d[1])<.9?[0,1,0]:[1,0,0],u=[d[1]*ref[2]-d[2]*ref[1],d[2]*ref[0]-d[0]*ref[2],d[0]*ref[1]-d[1]*ref[0]],ul=Math.hypot(...u),un=u.map(v=>v/ul),v=[d[1]*un[2]-d[2]*un[1],d[2]*un[0]-d[0]*un[2],d[0]*un[1]-d[1]*un[0]];
      const ring=(C,r)=>Array.from({length:n},(_,i)=>{const q=i/n*Math.PI*2,c=Math.cos(q)*r[0],s2=Math.sin(q)*r[1];return[C[0]+un[0]*c+v[0]*s2,C[1]+un[1]*c+v[1]*s2,C[2]+un[2]*c+v[2]*s2];}),r0=ring(A,ra),r1=ring(B,rb);
      for(let i=0;i<n;i++){const j=(i+1)%n;quad(r0[i],r1[i],r1[j],r0[j],k);if(caps){tri(B,r1[j],r1[i],k);tri(A,r0[i],r0[j],k);}}};
    const hip=[0,.68,-.05],sh=[0,1.2,-.16],head=[0,1.42,-.17];
    prism(hip,sh,[.19,.13],[.23,.13],6,1,true);prism([0,1.2,-.16],[0,1.3,-.165],[.05,.05],[.05,.05],4,2,false);prism([0,1.3,-.17],[0,1.56,-.17],[.11,.12],[.105,.11],6,2,true);prism([0,1.5,-.19],[0,1.6,-.19],[.118,.125],[.09,.1],6,3,true);
    for(const sd of[-1,1]){prism([sd*.1,.68,-.03],[sd*.11,.66,.4],[.085,.075],[.07,.065],4,4,true);prism([sd*.11,.66,.4],[sd*.11,.14,.44],[.06,.06],[.05,.05],4,4,false);prism([sd*.24,1.16,-.15],[sd*.27,.86,.02],[.06,.06],[.05,.05],4,1,false);prism([sd*.27,.86,.02],[sd*.17,.74,.3],[.045,.045],[.04,.04],4,2,true);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('fanPart',new T.Float32BufferAttribute(part,1));geo.computeVertexNormals();res.crowdGeo=geo;
    const U=res.crowdU={kfCheer:{value:0},kfTime:{value:0}},mat=res.crowdMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.86,metalness:0});
    mat.onBeforeCompile=shd=>{Object.assign(shd.uniforms,U);
      shd.vertexShader=shd.vertexShader.replace('#include <common>','#include <common>\nattribute float fanPart;attribute vec3 kfShirt;attribute vec4 kfSkin;uniform float kfCheer;uniform float kfTime;varying vec3 vKfTint;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\n{float rise=kfCheer*max(0.0,sin(kfTime*7.0+kfSkin.w*6.2831));transformed.y+=rise*0.2*smoothstep(0.5,1.4,position.y)+rise*0.12;}\nvKfTint=fanPart>3.5?vec3(0.035,0.045,0.075)*(0.6+kfSkin.w):fanPart>2.5?vec3(0.02,0.015,0.012)+kfSkin.w*vec3(0.05,0.035,0.02):fanPart>1.5?kfSkin.rgb:kfShirt;');
      shd.fragmentShader=shd.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vKfTint;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=vKfTint;');};
    mat.customProgramCacheKey=()=>'kick-fidelity-crowd-1';
    const lin=hex=>{const c=new T.Color(hex);return[c.r,c.g,c.b];},blocks=[[lin(0x18b3a4),lin(0x1b2a4e)],[lin(0x1b2a4e),lin(0xe7ecef)],[lin(0x18b3a4),lin(0xe7ecef)],[lin(0xf2913d),lin(0x1b2a4e)]],away=[lin(0xd9483b),lin(0xf1e3c2)],neutral=[0x2b2f38,0x6b7280,0xcfc9bd,0x35507a,0x7a3b3b,0x8a8f6a].map(lin),skins=[0x5a3524,0x6f4530,0x8d5b3c,0xa9744f,0xc98f68,0xe0b08c].map(lin);
    const rows=6,rise=.72,depth=1.16,seatMat=V3.stadiumMaterials.chairMat,o=new T.Object3D();res.crowd=[];res.crowdCount=0;
    V3.stands.forEach((stand,si)=>{const len=si<2?110:80,taken=[];
      V3.nearFans.filter(f=>f.stand===stand).forEach(f=>taken.push([Math.round((f.mesh.position.y-.18)/rise),f.mesh.position.x]));
      V3.coherentAudience.filter(e=>e.stand===stand).forEach(e=>{const m4=new T.Matrix4(),v=new T.Vector3();for(let i=0;i<e.count;i++){e.mesh.getMatrixAt(i,m4);v.setFromMatrixPosition(m4);taken.push([Math.round((v.y-.18)/rise),v.x]);}});
      const seats=[];for(let row=0;row<rows;row++)for(let x=-len/2+2.6;x<=len/2-2.6;x+=.8){if(Math.abs(Math.abs(x)-len*.25)<1)continue;seats.push([row,x]);}
      const people=seats.filter(([row,x])=>rnd()<.9&&!taken.some(([r,tx])=>r===row&&Math.abs(tx-x)<.55));
      for(let i=people.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[people[i],people[j]]=[people[j],people[i]];}     /* shuffled so a lower tier can draw the first half evenly */
      const mesh=new T.InstancedMesh(geo,mat,people.length),shirt=new Float32Array(people.length*3),skin=new Float32Array(people.length*4);
      people.forEach(([row,x],i)=>{const sec=Math.floor((x+len/2)/11),pal=si===2&&x>len*.2?away:blocks[(sec+si)%blocks.length],q=rnd(),c=q<.6?pal[0]:q<.8?pal[1]:neutral[Math.floor(rnd()*neutral.length)],j=.82+rnd()*.3,tone=skins[Math.floor(rnd()*skins.length)],sc=.92+rnd()*.14;
        shirt.set([c[0]*j,c[1]*j,c[2]*j],i*3);skin.set([tone[0],tone[1],tone[2],rnd()],i*4);
        o.position.set(x+(rnd()-.5)*.12,.18+row*rise,-.72-row*depth);o.rotation.set((rnd()-.5)*.1,(rnd()-.5)*.5,0);o.scale.set(sc,sc*(.96+rnd()*.1),sc);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});
      mesh.geometry=geo.clone();mesh.geometry.setAttribute('kfShirt',new T.InstancedBufferAttribute(shirt,3));mesh.geometry.setAttribute('kfSkin',new T.InstancedBufferAttribute(skin,4));
      mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.full=people.length;
      const backs=new T.InstancedMesh(new T.BoxGeometry(.5,.6,.08),seatMat,seats.length);seats.forEach(([row,x],i)=>{o.position.set(x,.18+row*rise+1.0,-.72-row*depth-.3);o.rotation.set(-.14,0,0);o.scale.set(1,1,1);o.updateMatrix();backs.setMatrixAt(i,o.matrix);});backs.instanceMatrix.needsUpdate=true;backs.receiveShadow=true;backs.frustumCulled=false;
      res.crowd.push({stand,mesh,backs});res.crowdCount+=people.length;});
  },
  /* pitch: mown bands whose brightness depends on which way the blades lean relative to the camera, broken tiling, worn patches.
     Same band layout as today's texture (4 m bands across the pitch), so the surface a player chose still reads the same. */
  PITCH_LOOK:{grass:{light:[.086,.33,.05],dark:[.03,.19,.028],lean:.36,rough:.84,wet:0,worn:[.21,.2,.075]},turf:{light:[.07,.3,.1],dark:[.045,.235,.085],lean:.1,rough:.95,wet:0,worn:[.07,.25,.09]},wet:{light:[.05,.24,.04],dark:[.02,.14,.024],lean:.3,rough:.5,wet:1,worn:[.12,.13,.06]}},
  buildPitch(V3){const T=THREE,res=this.res,U=res.pitchU={kfShift:{value:0},kfLight:{value:new T.Color()},kfDark:{value:new T.Color()},kfWorn:{value:new T.Color()},kfLean:{value:.36},kfWet:{value:0}};
    const mat=res.pitchMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.84,metalness:0});
    mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vKfWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nvKfWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vKfWorld;uniform float kfShift;uniform vec3 kfLight;uniform vec3 kfDark;uniform vec3 kfWorn;uniform float kfLean;uniform float kfWet;
float kfHash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float kfNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(kfHash(i),kfHash(i+vec2(1.0,0.0)),f.x),mix(kfHash(i+vec2(0.0,1.0)),kfHash(i+vec2(1.0,1.0)),f.x),f.y);}
float kfFbm(vec2 p){return kfNoise(p)*0.5+kfNoise(p*2.07+17.0)*0.3+kfNoise(p*4.3+41.0)*0.2;}
float kfSpot(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return 1.0-smoothstep(0.35,1.0,dot(d,d));}
float kfWearMask(vec2 p){float w=kfSpot(p,vec2(38.9,0.0),vec2(2.4,4.4))*0.75+kfSpot(p,vec2(29.0,0.0),vec2(1.1,1.1))*0.8+kfSpot(p,vec2(-12.5,0.0),vec2(1.6,1.6))*0.6;
  w+=(1.0-smoothstep(0.0,1.3,abs(abs(p.y)-34.0)))*0.3;return clamp(w,0.0,1.0);}`)
      .replace('#include <map_fragment>',`vec2 kfP=vec2(vKfWorld.x-kfShift,vKfWorld.z);vec2 kfV=kfP-(cameraPosition.xz-vec2(kfShift,0.0));float kfDist=length(kfV);kfV/=max(kfDist,0.001);
float kfS=mod(floor((kfP.x+72.0)/4.0),2.0)<0.5?1.0:-1.0;float kfS2=mod(floor((kfP.y+60.0)/5.5),2.0)<0.5?1.0:-1.0;
float kfEdge=min(smoothstep(0.0,0.12,abs(fract((kfP.x+72.0)/4.0)-0.5)*2.0-0.0),1.0);
float kfT=0.5+kfS*(0.15+kfLean*kfV.x)+kfS2*(0.035+0.3*kfLean*kfV.y);
float kfMacro=kfFbm(kfP*0.11);float kfFine=kfNoise(kfP*vec2(23.0,71.0))*0.55+kfNoise(kfP*vec2(113.0,37.0))*0.45;float kfNear=exp(-kfDist*0.07);
vec3 kfCol=mix(kfDark,kfLight,clamp(kfT,0.0,1.0));kfCol*=0.86+0.3*kfMacro;kfCol*=mix(1.0,0.72+0.56*kfFine,kfNear*0.75);
kfCol=mix(kfCol,kfCol*vec3(1.12,1.02,0.7),smoothstep(0.55,0.8,kfNoise(kfP*0.37+9.0))*0.35);
float kfWear=kfWearMask(kfP)*smoothstep(0.25,0.75,kfFbm(kfP*0.9+3.0)+kfWearMask(kfP)*0.35);
kfCol=mix(kfCol,kfWorn*(0.8+0.4*kfFine),kfWear*0.55);diffuseColor.rgb*=kfCol;`)
      .replace('#include <roughnessmap_fragment>',`float roughnessFactor=roughness;{float kfPuddle=smoothstep(0.52,0.72,kfFbm(kfP*0.23+31.0));roughnessFactor=mix(roughnessFactor+0.1*(kfFine-0.5)*kfNear,mix(0.66,0.5,kfPuddle),kfWet*0.85);roughnessFactor=mix(roughnessFactor,0.96,kfWear*0.6);}`);};
    mat.customProgramCacheKey=()=>'kick-fidelity-pitch-1';
    res.lineMat=new T.MeshStandardMaterial({color:0xe9ece6,roughness:.95,metalness:0,transparent:true,opacity:.92});
    res.ground=V3.world.children.find(ch=>ch.isMesh&&ch.material===V3.groundMat)||null;
    res.lines=V3.world.children.filter(ch=>ch.isMesh&&ch.material&&ch.material.isMeshBasicMaterial&&ch.material.transparent&&Math.abs(ch.position.y-.0125)<.002);
    res.lineOld=res.lines.length?res.lines[0].material:null;
    res.towerGlows=V3.world.children.filter(ch=>ch.isSprite&&ch.userData.tower);
  },
  pitchLook(){const look=this.PITCH_LOOK[Kick.opt.pitch]||this.PITCH_LOOK.grass,U=this.res.pitchU,m=this.res.pitchMat;U.kfLight.value.setRGB(...look.light);U.kfDark.value.setRGB(...look.dark);U.kfWorn.value.setRGB(...look.worn);U.kfLean.value=look.lean;U.kfWet.value=look.wet;m.roughness=look.rough;},
  activate(V3,name){if(!this.res)this.build(V3);const S=V3.S,mem=Number(navigator.deviceMemory||0),cores=Number(navigator.hardwareConcurrency||0);if(!this.ladderLocked&&this.tier<3&&((mem&&mem<4)||(cores&&cores<4))){this.tier=3;this.shadowSize(V3,1024);}
    this.saved={environment:S.environment,envIntensity:S.environmentIntensity,far:V3.dl.shadow.camera.far,bias:V3.dl.shadow.bias,normalBias:V3.dl.shadow.normalBias};this.apply(V3,name);},
  apply(V3,name){const S=V3.S,res=this.res,look=this.LOOKS[name],sky=res.sky[name]||(res.sky[name]=this.buildSky(V3,name));this.cur=name;this.SUN=look.key;res.backdrop=sky.backdrop;
    if(S.background?.isTexture&&!Object.values(res.sky).some(entry=>entry.backdrop===S.background))S.background.dispose();
    S.background=sky.backdrop;S.environment=sky.envRT.texture;S.environmentIntensity=look.env;S.fog=sky.fog;
    V3.hemi.intensity=look.hemi;V3.ambient.intensity=look.ambient;V3.dl.color.setHex(look.keyColor);V3.dl.intensity=look.keyPower;V3.lampMat.emissiveIntensity=look.lamp;V3.R.toneMappingExposure=look.exposure;
    res.floods.forEach((light,i)=>light.intensity=i===look.keyTower?0:look.flood);res.blobMat.opacity=look.blob;
    {const u=res.lens.out.uniforms;u.sunDir.value.set(...look.key);u.hazeWarm.value.setRGB(...look.hazeWarm);u.hazeCool.value.setRGB(...look.hazeCool);u.bloom.value=look.bloom;u.hazeAmt.value=look.haze;}
    V3.dl.shadow.camera.far=330;V3.dl.shadow.camera.updateProjectionMatrix();V3.dl.shadow.bias=-.0007;V3.dl.shadow.normalBias=.04;
    res.floods.forEach(l=>{S.add(l);S.add(l.target);});S.add(res.blobs);
    this.pitchLook();if(res.ground)res.ground.material=res.pitchMat;res.lines.forEach(l=>{l.material=res.lineMat;l.receiveShadow=true;});res.towerGlows.forEach(g=>g.scale.set(look.glow,look.glow,1));res.crowd.forEach(c=>{c.stand.add(c.backs);c.stand.add(c.mesh);});res.nets.forEach(n=>n.mesh.material=n.mat);
    this.active=true;this.reason='active';this.publish({time:name,venue:'home',passes:['light-and-sky','pitch-and-lines','crowd','lens'],crowd:this.res.crowdCount});},
  deactivate(V3,reason){if(!this.active)return;const S=V3.S,res=this.res;
    res.floods.forEach(l=>{S.remove(l);S.remove(l.target);});S.remove(res.blobs);
    if(res.ground)res.ground.material=V3.groundMat;res.lines.forEach(l=>{l.material=res.lineOld;l.receiveShadow=false;});res.towerGlows.forEach(g=>g.scale.set(26,26,1));res.crowd.forEach(c=>{c.stand.remove(c.backs);c.stand.remove(c.mesh);});res.nets.forEach(n=>n.mesh.material=n.old);this.shadowSize(V3,2048);
    S.environment=this.saved.environment;S.environmentIntensity=this.saved.envIntensity;S.background=null;
    V3.dl.shadow.camera.far=this.saved.far;V3.dl.shadow.camera.updateProjectionMatrix();V3.dl.shadow.bias=this.saved.bias;V3.dl.shadow.normalBias=this.saved.normalBias;
    this.active=false;this.reason=reason||'inactive';V3.skyKey='';V3.setSky();this.publish();},   /* setSky rebuilds today's backdrop, fog, light levels and exposure */
  dispose(V3,reason){this.deactivate(V3,reason);const res=this.res;if(!res)return;Object.values(res.sky).forEach(entry=>{entry.backdrop.dispose();entry.envRT.dispose();});res.blobTex.dispose();res.blobGeo.dispose();res.blobMat.dispose();res.blobs.dispose();res.pitchMat.dispose();res.lineMat.dispose();res.crowdGeo.dispose();res.crowdMat.dispose();res.netTex.dispose();res.nets.forEach(n=>{n.mat.map.dispose();n.mat.dispose();});{const L=res.lens;for(const k of['rt','b1','b2'])if(L[k])L[k].dispose();L.bright.dispose();L.blur.dispose();L.out.dispose();L.quad.geometry.dispose();}res.crowd.forEach(c=>{c.mesh.geometry.dispose();c.mesh.dispose();c.backs.geometry.dispose();c.backs.dispose();});res.floods.forEach(l=>l.dispose());this.res=null;},
  fail(V3,error){this.failed=true;try{this.dispose(V3,'error');}catch(e){}this.reason='error';this.publish({error:String(error&&error.message||error).slice(0,120)});console.warn('Kick fidelity off',error);},
  attach(V3){if(this.review)window.__KICKLAB_KICK_REVIEW__={state:this.review,capture:()=>{const L=this.last;if(!L)return null;if(!this.draw(V3,L.D,0))V3.R.render(V3.S,V3.cam);return V3.cv3.toDataURL('image/png');},
      /* scene-state digest, used to prove that switching the experiment off leaves today's scene exactly as it was */
      digest:()=>{const S=V3.S,hex=c=>c&&c.getHexString?c.getHexString():null,w=V3.world.children,sh=V3.dl.shadow;return{sceneChildren:S.children.length,worldChildren:w.length,standChildren:V3.stands.map(st=>st.children.length),background:S.background&&S.background.isTexture?[S.background.image.width,S.background.image.height]:null,environment:!!S.environment,envIntensity:S.environmentIntensity,fog:S.fog?[hex(S.fog.color),S.fog.near,S.fog.far]:null,
        hemi:[hex(V3.hemi.color),V3.hemi.intensity],ambient:V3.ambient.intensity,sun:[hex(V3.dl.color),V3.dl.intensity],shadow:[sh.camera.far,sh.bias,sh.normalBias,sh.mapSize.x],exposure:V3.R.toneMappingExposure,lamp:V3.lampMat.emissiveIntensity,
        ground:w.filter(ch=>ch.material===V3.groundMat).length,basicMeshes:w.filter(ch=>ch.isMesh&&ch.material&&ch.material.isMeshBasicMaterial).length,netBasic:V3.netGroup.children.filter(ch=>ch.material.isMeshBasicMaterial&&ch.material.opacity===1).length,glow:w.filter(ch=>ch.isSprite).map(ch=>ch.scale.x),lights:S.children.filter(ch=>ch.isLight).length};}};this.publish();},
  /* called once per frame right after the renderer's own sky/light sync */
  sync(V3,D){
    if(this.review&&D!==Kick){const T=THREE,a=D.att,b=D.ball,pose={K3:[[38.6,1.75,-1.2],[a.x,1.1,a.y+2],46],K4:[[43.4,1.15,2.4],[a.x,1.3,a.y-1],40],K5:[[b.x-1.5,.22,b.y+1.1],[b.x+4,.2,b.y-1.2],34]}[this.review];
      if(pose)V3.cine=this.reviewCine={pos:new T.Vector3(...pose[0]),look:new T.Vector3(...pose[1]),fov:pose[2]};}
    else if(this.reviewCine&&V3.cine===this.reviewCine)V3.cine=this.reviewCine=null;
    if(!this.flag||this.failed)return;
    try{const want=this.wantLook();if(want&&!this.active)this.activate(V3,want);else if(!want&&this.active)this.deactivate(V3,'venue-or-time');
      if(this.active&&(want!==this.cur||V3.S.background!==this.res.backdrop))this.apply(V3,want);}   /* pitch option changed: the renderer rebuilt its sky, take it back */
    catch(error){this.fail(V3,error);}},
  crowdFrame(V3,D,rdt){const U=this.res.crowdU,still=reduce||PAUSE.on,cheer=still?0:Math.max(D===Kick&&Kick.cheerT>0?1:0,D.netT!=null?Math.max(0,1-D.netT/3):0);
    if(!still)U.kfTime.value=(U.kfTime.value+Math.min(rdt||0,.1))%1000;U.kfCheer.value+=(cheer-U.kfCheer.value)*Math.min(1,(rdt||0)*6);if(still)U.kfCheer.value=0;
    const half=innerWidth<=480||this.tier>=3;for(const c of this.res.crowd)c.mesh.count=half?Math.ceil(c.mesh.userData.full/2):c.mesh.userData.full;},
  /* soft floodlight shadows: one contact blob and four long faint shadows per figure and for the ball */
  shadows(V3,D){const T=THREE,res=this.res,m=res.blobs,o=res.dummy,side=D===Kick,shift=side?V3.world.position.x:0,pts=[];
    const n=side?V3.sents.length:V3.ents.length;for(let i=0;i<n&&i<V3.rigs.length;i++){const r=V3.rigs[i];if(r.g.visible&&r.pelvis)pts.push([r.pelvis.position.x,r.pelvis.position.z,r.pelvis.position.y*1.85,Math.max(0,r.pelvis.position.y-1.15),.62]);}
    const C=V3.directionC;if(C)for(const root of [C.root,C.opponent&&C.opponent.root,...(C.squad||[]).map(actor=>actor.root)]){if(root&&root.visible&&root.parent){const p=root.getWorldPosition(new T.Vector3());pts.push([p.x,p.z,1.75,Math.max(0,p.y),.62]);}}
    {const b=V3.ball.position;pts.push([b.x,b.z,.22,Math.max(0,b.y-.11),.2]);}
    let k=0;for(const[x,z,h,lift,w]of pts){if(k+6>160)break;const fade=1/(1+lift*1.6);
      o.position.set(x,.016,z);o.rotation.set(0,0,0);o.scale.set(w*1.25*fade,1,w*1.25*fade);o.updateMatrix();m.setMatrixAt(k++,o.matrix);m.setMatrixAt(k++,o.matrix);
      for(let t=0;t<this.TOWERS.length;t++){if(t===this.LOOKS[this.cur].keyTower)continue;const[tx,tz]=this.TOWERS[t],dx=x-(tx+shift),dz=z-tz,dist=Math.hypot(dx,dz)||1,len=Math.min(3.4,h*dist/this.TOWER_H),off=lift*dist/this.TOWER_H;
        o.position.set(x+dx/dist*(off+len/2),.016,z+dz/dist*(off+len/2));o.rotation.set(0,Math.atan2(dx,dz),0);o.scale.set(w*.8*fade,1,len+w*.5);o.updateMatrix();m.setMatrixAt(k++,o.matrix);}}
    m.count=k;m.instanceMatrix.needsUpdate=true;},
  /* called in place of the plain render; returns false when the caller should render as today */
  draw(V3,D,rdt){this.last={D};if(!this.active)return false;
    try{const fc=V3.dl.target.position,S=this.SUN;V3.dl.position.set(fc.x+S[0]*150,S[1]*150,fc.z+S[2]*150);this.res.pitchU.kfShift.value=D===Kick?V3.world.position.x:0;this.crowdFrame(V3,D,rdt);this.shadows(V3,D);if(rdt)this.ladder(V3);if(!this.active)return false;if(this.tier>=4)V3.R.render(V3.S,V3.cam);else this.lensDraw(V3);return true;}
    catch(error){this.fail(V3,error);return false;}}
};
