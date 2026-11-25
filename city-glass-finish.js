// Reflections use this city's actual modelled skyline and studio background.
// The cube is captured once after the landmark GLBs are present; the reflected
// direction still changes with the viewing camera. No global environment is set:
// stone, roofs, planting, vehicles and the historic buildings keep their finish.
const installed = new WeakMap();

export function installCityGlassReflections(T, renderer, scene, options = {}) {
  if (installed.has(scene)) return installed.get(scene);

  const selected = new Map();
  let meshCount = 0;
  const isVisible = object => {
    for (let current = object; current; current = current.parent) {
      if (!current.visible) return false;
    }
    return true;
  };
  scene.traverse(mesh => {
    if (!mesh.isMesh || !isVisible(mesh)) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    let matched = false;
    for (const material of materials) {
      if (!material?.isMeshStandardMaterial) continue;
      const cctv = /^cctv-(glass|steel)$/.test(material.name) ||
        material.userData.cctvGlass || material.userData.cctvSteel;
      // GLTFLoader sanitises whitespace to underscores in Object3D names.
      const zun = /Tower \| curved glazing|Recessed glazed lobby/.test(mesh.name.replace(/_/g, ' '));
      // The office modules explicitly give only glass/windows an environment.
      // Metal roof equipment and pale masonry do not meet these conditions.
      const office = material.envMap && material.roughness <= .43 &&
        material.metalness <= .40;
      if (!cctv && !zun && !office) continue;
      matched = true;
      if (!selected.has(material)) selected.set(material, {
        kind: cctv ? 'cctv' : zun ? 'zun' : material.roughness > .33 ? 'window' : 'curtain-wall',
        envMap: material.envMap,
        envMapIntensity: material.envMapIntensity,
        roughness: material.roughness
      });
    }
    if (matched) meshCount++;
  });

  // An open point over the central boulevard sees buildings on both sides,
  // rather than capturing the inside of any one glass building.
  const position = options.position || new T.Vector3(0, 2.10, -2.80);
  const cubeTarget = new T.WebGLCubeRenderTarget(options.size || 256, {
    type: T.HalfFloatType,
    format: T.RGBAFormat,
    colorSpace: T.LinearSRGBColorSpace,
    generateMipmaps: false,
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
    depthBuffer: true
  });
  cubeTarget.texture.name = 'Beijing real skyline capture';
  const cubeCamera = new T.CubeCamera(.08, 120, cubeTarget);
  cubeCamera.position.copy(position);
  // The displayed studio backdrop is deliberately very quiet. For reflections,
  // resolve the daylight it represents into a directional HDR sky. This is an
  // environment-only light distribution, aligned with the existing sun, never
  // a painted streak on a facade or a change to the visible backdrop/lighting.
  let sunlight;
  scene.traverse(object => { if (object.isDirectionalLight && (!sunlight || object.intensity > sunlight.intensity)) sunlight = object; });
  const sunDirection = new T.Vector3(-16, 17, 13);
  if (sunlight) sunDirection.copy(sunlight.getWorldPosition(new T.Vector3())).sub(sunlight.target.getWorldPosition(new T.Vector3()));
  sunDirection.normalize();
  const reflectionSkyMaterial = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, toneMapped: false,
    uniforms: { sunDirection: { value: sunDirection } },
    vertexShader: 'varying vec3 skyDirection; void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 skyDirection; uniform vec3 sunDirection;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float cloudNoise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      void main(){
        vec3 direction=normalize(skyDirection);
        float elevation=max(direction.y,0.0);
        vec3 horizon=vec3(.83,.80,.73),zenith=vec3(.10,.20,.37);
        vec3 radiance=mix(horizon,zenith,pow(elevation,.48));
        // Broad, soft cloud radiance creates reflection variation even where
        // this elevated camera sees sky rather than neighbouring buildings.
        // It is sampled by the PBR reflection vector, not by facade position.
        vec3 cloudPoint=direction*9.0+vec3(2.3,.4,5.1);
        float cloud=.68*cloudNoise(cloudPoint)+.32*cloudNoise(cloudPoint*2.03);
        cloud=smoothstep(.43,.67,cloud)*smoothstep(.03,.22,elevation);
        radiance+=vec3(2.7,2.65,2.5)*cloud;
        float solarGlow=pow(max(dot(direction,sunDirection),0.0),18.0);
        radiance+=vec3(3.8,3.25,2.45)*solarGlow;
        radiance*=.82+.18*max(dot(direction.xz,normalize(sunDirection.xz)),0.0);
        gl_FragColor=vec4(radiance,1.0);
      }`
  });
  const reflectionSky = new T.Mesh(new T.SphereGeometry(80, 32, 16), reflectionSkyMaterial);
  reflectionSky.name = 'Capture-only sunlit sky';
  reflectionSky.position.copy(position);
  reflectionSky.renderOrder = -1000;
  reflectionSky.frustumCulled = false;
  const previous = {
    background: scene.background,
    target: renderer.getRenderTarget(),
    face: renderer.getActiveCubeFace(),
    mip: renderer.getActiveMipmapLevel(),
    toneMapping: renderer.toneMapping,
    exposure: renderer.toneMappingExposure,
    autoClear: renderer.autoClear,
    xr: renderer.xr.enabled,
    shadowAutoUpdate: renderer.shadowMap.autoUpdate,
    shadowNeedsUpdate: renderer.shadowMap.needsUpdate
  };
  const pmrem = new T.PMREMGenerator(renderer);
  let environmentTarget;
  try {
    renderer.toneMapping = T.NoToneMapping;
    renderer.autoClear = true;
    renderer.xr.enabled = false;
    // The main view has rendered before installation. Reuse its shadow map;
    // rebuilding a 2048px sun shadow for all six cube faces is unnecessary.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = false;
    scene.background = null;
    scene.add(reflectionSky);
    scene.updateMatrixWorld(true);
    cubeCamera.update(renderer, scene);
    environmentTarget = pmrem.fromCubemap(cubeTarget.texture);
  } finally {
    scene.remove(reflectionSky);
    scene.background = previous.background;
    reflectionSky.geometry.dispose();
    reflectionSkyMaterial.dispose();
    renderer.setRenderTarget(previous.target, previous.face, previous.mip);
    renderer.toneMapping = previous.toneMapping;
    renderer.toneMappingExposure = previous.exposure;
    renderer.autoClear = previous.autoClear;
    renderer.xr.enabled = previous.xr;
    renderer.shadowMap.autoUpdate = previous.shadowAutoUpdate;
    renderer.shadowMap.needsUpdate = previous.shadowNeedsUpdate;
    cubeTarget.dispose();
    pmrem.dispose();
  }

  const environment = environmentTarget.texture;
  environment.name = 'Beijing real skyline PMREM';
  const counts = { cctv: 0, zun: 0, window: 0, 'curtain-wall': 0 };
  for (const [material, original] of selected) {
    material.envMap = environment;
    // The CCTV specialist controls its own glazing and steel parameters.
    // Offices retain their original albedo, metalness, shaders and mullions.
    if (original.kind !== 'cctv') {
      material.roughness = original.kind === 'window' ? .23 : .17;
      material.envMapIntensity = original.kind === 'zun' ? 1.20 :
        original.kind === 'window' ? .88 : 1.14;
    }
    material.needsUpdate = true;
    counts[original.kind]++;
  }
  const stats = {
    source: 'real city cubemap with capture-only directional daylight sky',
    sunDirection: sunDirection.toArray(),
    size: cubeTarget.width,
    position: position.toArray(),
    materialCount: selected.size,
    meshCount,
    counts
  };
  const result = {
    environment,
    stats,
    dispose() {
      for (const [material, original] of selected) {
        if (material.envMap !== environment) continue;
        material.envMap = original.envMap;
        material.envMapIntensity = original.envMapIntensity;
        material.roughness = original.roughness;
        material.needsUpdate = true;
      }
      environmentTarget.dispose();
      installed.delete(scene);
      if (scene.userData.cityGlassReflections === stats) delete scene.userData.cityGlassReflections;
    }
  };
  scene.userData.cityGlassReflections = stats;
  installed.set(scene, result);
  return result;
}
