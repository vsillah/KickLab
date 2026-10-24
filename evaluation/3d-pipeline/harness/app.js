(() => {
  'use strict';

  const ASSET_URL = '../assets/kicklab-placeholder-athlete.glb';
  const CONTACT_TIME = 17 / 30;
  const params = new URLSearchParams(location.search);
  const canvas = document.querySelector('#webgl-stage');
  const fallbackCanvas = document.querySelector('#fallback-stage');
  const ui = Object.fromEntries(['load-status','revision','contact-readout','mode-badge','metric-bytes','metric-triangles','metric-bones','metric-draws','metric-render','metric-network'].map(id => [id, document.querySelector(`#${id}`)]));
  ui.revision.textContent = `revision: ${params.get('rev') || 'working-tree'}`;

  const audit = window.__KICKLAB_3D_EVAL__ = {
    ready: false,
    remoteRequests: 0,
    assetUrl: ASSET_URL,
    renderer: 'Three.js r128 local vendor',
    frameSamples: [],
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = (...args) => {
    const url = new URL(String(args[0] instanceof Request ? args[0].url : args[0]), location.href);
    if (url.origin !== location.origin) audit.remoteRequests += 1;
    ui['metric-network'].textContent = String(audit.remoteRequests);
    return originalFetch(...args);
  };

  function typedArray(componentType, buffer, offset, count) {
    const types = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    return new types[componentType](buffer, offset, count);
  }

  function parseGlb(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) throw new Error('Expected a GLB 2.0 asset');
    let offset = 12;
    let json;
    let bin;
    while (offset < arrayBuffer.byteLength) {
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      const dataStart = offset + 8;
      if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, dataStart, length)));
      if (type === 0x004e4942) bin = arrayBuffer.slice(dataStart, dataStart + length);
      offset = dataStart + length;
    }
    if (!json || !bin) throw new Error('GLB is missing JSON or binary data');
    return { json, bin };
  }

  function loadAccessor(doc, bin, index) {
    const accessor = doc.accessors[index];
    const bufferView = doc.bufferViews[accessor.bufferView];
    const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[accessor.type];
    const bytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
    const sourceOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    const packedStride = components * bytes;
    if (!bufferView.byteStride || bufferView.byteStride === packedStride) {
      return typedArray(accessor.componentType, bin, sourceOffset, accessor.count * components);
    }
    const packed = typedArray(accessor.componentType, new ArrayBuffer(accessor.count * packedStride), 0, accessor.count * components);
    const source = new DataView(bin);
    const readers = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' };
    for (let i = 0; i < accessor.count; i += 1) {
      for (let c = 0; c < components; c += 1) packed[i * components + c] = source[readers[accessor.componentType]](sourceOffset + i * bufferView.byteStride + c * bytes, true);
    }
    return packed;
  }

  function makeMaterial(definition = {}) {
    const pbr = definition.pbrMetallicRoughness || {};
    const color = pbr.baseColorFactor || [0.8, 0.8, 0.8, 1];
    const material = new THREE.MeshStandardMaterial({
      name: definition.name || 'Material',
      color: new THREE.Color(color[0], color[1], color[2]),
      opacity: color[3],
      transparent: color[3] < 1,
      roughness: pbr.roughnessFactor ?? 0.7,
      metalness: pbr.metallicFactor ?? 0,
      side: definition.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    });
    if (/anatomy/i.test(material.name)) { material.transparent = true; material.opacity = 0.72; material.depthWrite = false; }
    return material;
  }

  function buildGlb(arrayBuffer) {
    const { json: doc, bin } = parseGlb(arrayBuffer);
    const jointIndexes = new Set((doc.skins || []).flatMap(skin => skin.joints));
    const nodes = (doc.nodes || []).map((definition, index) => {
      const object = jointIndexes.has(index) ? new THREE.Bone() : new THREE.Group();
      object.name = definition.name || `Node_${index}`;
      object.userData = { ...(definition.extras || {}), gltfNodeIndex: index };
      if (definition.translation) object.position.fromArray(definition.translation);
      if (definition.rotation) object.quaternion.fromArray(definition.rotation);
      if (definition.scale) object.scale.fromArray(definition.scale);
      if (definition.matrix) object.matrix.fromArray(definition.matrix).decompose(object.position, object.quaternion, object.scale);
      return object;
    });
    (doc.nodes || []).forEach((definition, index) => (definition.children || []).forEach(child => nodes[index].add(nodes[child])));

    const materials = (doc.materials || []).map(makeMaterial);
    const skinnedMeshes = [];
    let triangles = 0;
    let geometryBytes = 0;
    (doc.nodes || []).forEach((definition, nodeIndex) => {
      if (definition.mesh === undefined) return;
      const primitives = doc.meshes[definition.mesh].primitives;
      primitives.forEach((primitive, primitiveIndex) => {
        const geometry = new THREE.BufferGeometry();
        const attributeNames = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv', JOINTS_0: 'skinIndex', WEIGHTS_0: 'skinWeight' };
        Object.entries(primitive.attributes || {}).forEach(([semantic, accessorIndex]) => {
          if (!attributeNames[semantic]) return;
          const accessor = doc.accessors[accessorIndex];
          const array = loadAccessor(doc, bin, accessorIndex);
          const itemSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
          geometry.setAttribute(attributeNames[semantic], new THREE.BufferAttribute(array, itemSize, Boolean(accessor.normalized)));
          geometryBytes += array.byteLength;
        });
        if (primitive.indices !== undefined) {
          const index = loadAccessor(doc, bin, primitive.indices);
          geometry.setIndex(new THREE.BufferAttribute(index, 1));
          geometryBytes += index.byteLength;
          triangles += index.length / 3;
        } else {
          triangles += geometry.attributes.position.count / 3;
        }
        geometry.computeBoundingSphere();
        const material = materials[primitive.material] || makeMaterial();
        const mesh = definition.skin === undefined ? new THREE.Mesh(geometry, material) : new THREE.SkinnedMesh(geometry, material);
        mesh.name = `${nodes[nodeIndex].name}__${primitiveIndex}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        nodes[nodeIndex].add(mesh);
        if (definition.skin !== undefined) skinnedMeshes.push({ mesh, skinIndex: definition.skin });
      });
    });

    const scene = new THREE.Group();
    scene.name = 'ImportedGLB';
    const sceneDefinition = doc.scenes?.[doc.scene || 0];
    (sceneDefinition?.nodes || doc.nodes.map((_, index) => index).filter(index => !(doc.nodes.some(node => (node.children || []).includes(index))))).forEach(index => scene.add(nodes[index]));
    scene.updateMatrixWorld(true);

    const skins = (doc.skins || []).map(skin => {
      let inverses;
      if (skin.inverseBindMatrices !== undefined) {
        const values = loadAccessor(doc, bin, skin.inverseBindMatrices);
        inverses = skin.joints.map((_, index) => new THREE.Matrix4().fromArray(values, index * 16));
      }
      return new THREE.Skeleton(skin.joints.map(index => nodes[index]), inverses);
    });
    skinnedMeshes.forEach(({ mesh, skinIndex }) => mesh.bind(skins[skinIndex], mesh.matrixWorld));

    const animations = (doc.animations || []).map(animation => {
      const tracks = animation.channels.map(channel => {
        const sampler = animation.samplers[channel.sampler];
        const times = loadAccessor(doc, bin, sampler.input);
        const values = loadAccessor(doc, bin, sampler.output);
        const target = nodes[channel.target.node];
        const suffix = { translation: 'position', rotation: 'quaternion', scale: 'scale' }[channel.target.path];
        const Track = channel.target.path === 'rotation' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
        return new Track(`${target.uuid}.${suffix}`, times, values);
      });
      return new THREE.AnimationClip(animation.name || 'Clip', -1, tracks);
    });

    return { scene, nodes, skins, animations, doc, metrics: { triangles: Math.round(triangles), geometryBytes, bones: jointIndexes.size, materials: materials.length } };
  }

  function seeded(index) {
    const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function buildStadium() {
    const root = new THREE.Group();
    root.name = 'ProceduralStadium';
    const field = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshStandardMaterial({ color: 0x176c45, roughness: 1 }));
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    root.add(field);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xe7f6ea });
    const linePoints = [[-7,0, -4],[7,0,-4],[7,0,4],[-7,0,4],[-7,0,-4],[-0.01,0,-4],[-0.01,0,4]].map(point => new THREE.Vector3(point[0], 0.008, point[2]));
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints), lineMaterial));

    const lod = new THREE.LOD();
    lod.name = 'StadiumLOD';
    const high = new THREE.Group();
    const low = new THREE.Group();
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x253b4d, roughness: 0.95 });
    for (let side = -1; side <= 1; side += 2) {
      for (let row = 0; row < 5; row += 1) {
        const tier = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.28, 0.62), standMaterial);
        tier.position.set(0, 0.14 + row * 0.27, side * (4.5 + row * 0.29));
        high.add(tier);
      }
      const block = new THREE.Mesh(new THREE.BoxGeometry(14.6, 1.3, 2.2), standMaterial);
      block.position.set(0, 0.65, side * 5.25);
      low.add(block);
    }
    lod.addLevel(high, 0);
    lod.addLevel(low, 24);
    root.add(lod);

    const crowdGeometry = new THREE.BoxGeometry(0.075, 0.16, 0.075);
    const crowdMaterial = new THREE.MeshStandardMaterial({ color: 0x8fd3ff, roughness: 0.8 });
    const crowd = new THREE.InstancedMesh(crowdGeometry, crowdMaterial, 480);
    crowd.name = 'InstancedCrowd';
    const transform = new THREE.Matrix4();
    for (let index = 0; index < 480; index += 1) {
      const side = index % 2 ? -1 : 1;
      const lane = Math.floor(index / 2) % 120;
      const row = Math.floor(index / 240);
      const x = -6.8 + (lane % 40) * 0.35;
      const tier = Math.floor(lane / 40) + row * 3;
      const y = 0.52 + tier * 0.27 + seeded(index) * 0.05;
      const z = side * (4.28 + tier * 0.29);
      transform.makeTranslation(x, y, z);
      crowd.setMatrixAt(index, transform);
    }
    crowd.instanceMatrix.needsUpdate = true;
    high.add(crowd);
    root.userData.lodLevels = lod.levels.length;
    root.userData.instanceCount = crowd.count;
    return root;
  }

  function drawFallback() {
    const context = fallbackCanvas.getContext('2d');
    const width = fallbackCanvas.width = Math.max(1, fallbackCanvas.clientWidth * devicePixelRatio);
    const height = fallbackCanvas.height = Math.max(1, fallbackCanvas.clientHeight * devicePixelRatio);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const w = width / devicePixelRatio;
    const h = height / devicePixelRatio;
    const gradient = context.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#163247'); gradient.addColorStop(1, '#081118');
    context.fillStyle = gradient; context.fillRect(0, 0, w, h);
    context.fillStyle = '#173f2e'; context.beginPath(); context.moveTo(0,h*.68); context.lineTo(w,h*.5); context.lineTo(w,h); context.lineTo(0,h); context.fill();
    context.strokeStyle = '#e8f5ec'; context.lineWidth = 2; context.strokeRect(w*.08,h*.61,w*.84,h*.3);
    const x = w*.5, y = h*.52, s = Math.min(w,h)/370;
    context.strokeStyle = '#d7ff45'; context.lineWidth = 12*s; context.lineCap = 'round';
    context.beginPath(); context.moveTo(x,y-55*s); context.lineTo(x,y+25*s); context.moveTo(x,y-25*s); context.lineTo(x-42*s,y+8*s); context.moveTo(x,y-22*s); context.lineTo(x+48*s,y-4*s); context.moveTo(x,y+22*s); context.lineTo(x-22*s,y+92*s); context.moveTo(x,y+22*s); context.lineTo(x+69*s,y+64*s); context.stroke();
    context.fillStyle='#d08b63'; context.beginPath(); context.arc(x,y-80*s,21*s,0,Math.PI*2); context.fill();
    context.fillStyle='#f5f1e8'; context.beginPath(); context.arc(x+92*s,y+62*s,16*s,0,Math.PI*2); context.fill();
    context.fillStyle='#4ff3dc'; context.font=`700 ${14*s}px system-ui`; context.textAlign='center'; context.fillText('LOW-POWER 2D FALLBACK', x, h*.16);
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1b27);
  scene.fog = new THREE.Fog(0x0b1b27, 15, 36);
  const camera = new THREE.PerspectiveCamera(37, 16 / 9, 0.1, 80);
  camera.position.set(3.8, 2.4, 6.8);
  camera.lookAt(0, 0.95, 0);
  scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x172c21, 0.72));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(4, 8, 5); keyLight.castShadow = true; scene.add(keyLight);
  const stadium = buildStadium(); scene.add(stadium);

  let mixer;
  let clips = new Map();
  let athlete;
  let anatomy;
  let marker;
  let ball;
  let fallback = false;
  let reduced = false;
  let frameStart = performance.now();
  const clock = new THREE.Clock();

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * renderer.getPixelRatio()) || canvas.height !== Math.round(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      drawFallback();
    }
  }

  function setClip(name) {
    if (!mixer || !clips.has(name)) return;
    mixer.stopAllAction();
    const action = mixer.clipAction(clips.get(name));
    action.reset().setLoop(name === 'Idle' ? THREE.LoopRepeat : THREE.LoopOnce, name === 'Idle' ? Infinity : 1).play();
    if (name === 'KickContact') {
      mixer.setTime(CONTACT_TIME);
      scene.updateMatrixWorld(true);
      const markerPosition = marker.getWorldPosition(new THREE.Vector3());
      const ballPosition = ball.getWorldPosition(new THREE.Vector3());
      audit.contactDriftMeters = markerPosition.distanceTo(ballPosition);
      ui['contact-readout'].textContent = `Contact drift: ${(audit.contactDriftMeters * 1000).toFixed(2)} mm`;
      mixer.setTime(0);
    }
  }

  function setFallback(enabled) {
    fallback = enabled;
    canvas.style.display = enabled ? 'none' : 'block';
    fallbackCanvas.style.display = enabled ? 'block' : 'none';
    ui['mode-badge'].textContent = enabled ? '2D FALLBACK' : reduced ? 'REDUCED 3D' : 'FULL 3D';
    document.querySelector('#toggle-fallback').setAttribute('aria-pressed', String(enabled));
    document.querySelector('#toggle-fallback').textContent = `2D fallback ${enabled ? 'on' : 'off'}`;
    if (enabled) drawFallback();
  }

  function setReduced(enabled) {
    reduced = enabled;
    renderer.setPixelRatio(enabled ? 1 : Math.min(devicePixelRatio, 2));
    scene.fog.far = enabled ? 18 : 36;
    stadium.traverse(object => { if (object.name === 'InstancedCrowd') object.visible = !enabled; });
    ui['mode-badge'].textContent = fallback ? '2D FALLBACK' : enabled ? 'REDUCED 3D' : 'FULL 3D';
    document.querySelector('#toggle-reduced').setAttribute('aria-pressed', String(enabled));
    document.querySelector('#toggle-reduced').textContent = `Reduced ${enabled ? 'on' : 'off'}`;
  }

  function bindControls() {
    document.querySelector('#play-kick').addEventListener('click', () => setClip('KickContact'));
    document.querySelector('#play-idle').addEventListener('click', () => setClip('Idle'));
    document.querySelector('#toggle-anatomy').addEventListener('click', event => {
      anatomy.visible = !anatomy.visible;
      event.currentTarget.setAttribute('aria-pressed', String(anatomy.visible));
      event.currentTarget.textContent = `Anatomy ${anatomy.visible ? 'on' : 'off'}`;
    });
    document.querySelector('#toggle-reduced').addEventListener('click', () => setReduced(!reduced));
    document.querySelector('#toggle-fallback').addEventListener('click', () => setFallback(!fallback));
  }

  function animate() {
    requestAnimationFrame(animate);
    resize();
    const now = performance.now();
    const delta = Math.min(clock.getDelta(), 0.05);
    if (mixer && !fallback) mixer.update(delta);
    if (!fallback) renderer.render(scene, camera);
    const frameMs = performance.now() - now;
    if (audit.frameSamples.length < 240) audit.frameSamples.push(frameMs);
    if (audit.frameSamples.length >= 90) {
      const sorted = [...audit.frameSamples].sort((a,b) => a-b);
      audit.renderP95Ms = sorted[Math.floor(sorted.length * 0.95)];
      audit.renderAverageMs = sorted.reduce((sum,value) => sum + value, 0) / sorted.length;
      ui['metric-render'].textContent = audit.renderP95Ms.toFixed(2);
    }
    audit.drawCalls = renderer.info.render.calls;
    ui['metric-draws'].textContent = String(audit.drawCalls);
  }

  async function init() {
    const started = performance.now();
    try {
      const response = await fetch(ASSET_URL);
      if (!response.ok) throw new Error(`GLB request failed: ${response.status}`);
      const buffer = await response.arrayBuffer();
      const imported = buildGlb(buffer);
      athlete = imported.scene.getObjectByName('AthleteSurface');
      anatomy = imported.scene.getObjectByName('SharedSkeletonAnatomy');
      marker = imported.scene.getObjectByName('FootContact_R');
      ball = imported.scene.getObjectByName('ContactBall');
      if (!athlete || !anatomy || !marker || !ball) throw new Error('Required pipeline nodes are missing');
      anatomy.visible = false;
      imported.scene.position.set(0, 0.02, 0);
      imported.scene.rotation.y = 0.16;
      scene.add(imported.scene);
      mixer = new THREE.AnimationMixer(imported.scene);
      clips = new Map(imported.animations.map(clip => [clip.name, clip]));
      audit.assetBytes = buffer.byteLength;
      audit.triangles = imported.metrics.triangles;
      audit.geometryBytes = imported.metrics.geometryBytes;
      audit.bones = imported.metrics.bones;
      audit.materials = imported.metrics.materials;
      audit.animations = [...clips.keys()];
      audit.lodLevels = stadium.userData.lodLevels;
      audit.crowdInstances = stadium.userData.instanceCount;
      audit.loadMs = performance.now() - started;
      ui['metric-bytes'].textContent = buffer.byteLength.toLocaleString();
      ui['metric-triangles'].textContent = imported.metrics.triangles.toLocaleString();
      ui['metric-bones'].textContent = String(imported.metrics.bones);
      setClip('KickContact');
      setClip(params.get('clip') === 'kick' ? 'KickContact' : 'Idle');
      if (params.get('anatomy') === '1') document.querySelector('#toggle-anatomy').click();
      if (params.get('mode') === 'reduced') setReduced(true);
      if (params.get('mode') === 'fallback') setFallback(true);
      ui['load-status'].textContent = 'Local GLB ready';
      audit.ready = true;
      audit.totalReadyMs = performance.now() - frameStart;
      bindControls();
    } catch (error) {
      audit.error = error.message;
      ui['load-status'].textContent = `Load failed: ${error.message}`;
      ui['load-status'].style.color = '#ff8b80';
      setFallback(true);
      throw error;
    }
  }

  animate();
  init();
})();
