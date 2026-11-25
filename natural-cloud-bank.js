import { createFormAtlas, FORM_COUNT, FORM_RESOLUTION, hash, SUN_STEPS } from './cloud-form-atlas.js?v=1';

// Cloud silhouettes follow the separated cumulus in the Met Office reference.
// The CRI reference guides the soft cloud edges around the tower.
const FLIGHT_START = -15;
const FLIGHT_LENGTH = 30;
const RAY_STEPS = 56;

const FLIGHTS = [
  { id: 'tower', x: -3.57, z: -4.84, altitude: 7.02, size: [5.6, 3.15, 4.3], speed: .51, visibility: [0, .20] },
  { id: 'west', x: -9.1, z: -6.4, altitude: 7.38, size: [4.55, 2.8, 3.55], speed: .49, visibility: [.10, .39] },
  { id: 'foreground', x: 5.8, z: 3.8, altitude: 6.32, size: [5.15, 2.65, 4.05], speed: .46, visibility: [.25, .56] },
  { id: 'middle', x: 3.1, z: -.45, altitude: 7.37, size: [4.35, 2.45, 3.9], speed: .51, visibility: [.55, .78] },
  { id: 'upper', x: 8.35, z: -6.5, altitude: 7.86, size: [4.8, 2.55, 3.4], speed: .45, visibility: [.67, .91] },
  { id: 'lower', x: -9.9, z: 5.55, altitude: 6.16, size: [4.8, 2.8, 4.2], speed: .44, visibility: [.80, 1] },
];

function mix(a, b, t) {
  return a + (b - a) * t;
}

const vertexShader = `
  out vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }
`;

const fragmentShader = `
  precision highp float;
  precision highp sampler3D;
  in vec3 vLocal;
  out vec4 outCloud;
  uniform sampler3D uDensity;
  uniform mat4 uInverse;
  uniform vec3 uSize, uCenter, uResolution, uOrigin;
  uniform sampler2D uDepth;
  uniform vec2 uViewport;
  uniform mat4 uInverseVP;
  uniform float uUseDepth, uWeight, uSun, uNight, uThickness, uWind;
  uniform vec3 uSunTint;
  uniform vec4 uForms, uFlash;

  vec2 boxHit(vec3 origin, vec3 ray) {
    vec3 inverseRay = 1. / (ray + vec3(.000001));
    vec3 a = (-.5 - origin) * inverseRay, b = (.5 - origin) * inverseRay;
    vec3 lo = min(a, b), hi = max(a, b);
    return vec2(max(lo.x, max(lo.y, lo.z)), min(hi.x, min(hi.y, hi.z)));
  }

  vec2 sampleForm(vec3 p, float index) {
    vec3 coord = (clamp(p + .5, 0., 1.) * (uResolution - 1.) + .5) / uResolution;
    coord.z = (coord.z + index) / ${FORM_COUNT}.;
    return texture(uDensity, coord).rg;
  }

  void main() {
    vec3 origin = uOrigin;
    vec3 ray = normalize(vLocal - origin);
    vec2 hit = boxHit(origin, ray);
    float start = max(hit.x, 0.);
    if (uUseDepth > .5) {
      vec2 uv = gl_FragCoord.xy / uViewport;
      float depth = texture(uDepth, uv).r;
      if (depth < .999999) {
        vec4 opaque = uInverseVP * vec4(uv * 2. - 1., depth * 2. - 1., 1.);
        opaque /= opaque.w;
        vec3 localOpaque = (uInverse * opaque).xyz;
        hit.y = min(hit.y, dot(localOpaque - origin, ray));
      }
    }
    if (hit.y <= start) discard;

    float stepLocal = (hit.y - start) / ${RAY_STEPS}.;
    float stepWorld = length(ray * uSize) * stepLocal;
    float jitter = .5 + .7 * (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))) - .5);
    float windX = sin(uForms.w * .27) * .14;
    float windStrength = .4 + 1.2 * uWind;
    float shadowDepth = mix(.90, 2.30, uThickness);
    float extinction = mix(.70, 2.70, uThickness) * stepWorld;
    vec3 sunColor = mix(vec3(1.20, 1.11, .98) * uSunTint, vec3(.54, .69, .95), uNight);
    float transmission = 1.;
    vec3 scattering = vec3(0.);
    for (int i = 0; i < ${RAY_STEPS}; i++) {
      vec3 p = origin + ray * (start + (float(i) + jitter) * stepLocal);
      // Wind shears the upper lobes and rolls the edge at a different phase.
      vec3 wind = vec3(
        p.y * windX + sin(p.z * 9. + uForms.w * .48) * .023,
        cos(p.x * 10. - uForms.w * .33) * .022,
        sin(p.y * 8. + p.x * 5. + uForms.w * .30) * .026
      );
      vec3 coord = p + wind * windStrength;
      vec2 field = sampleForm(coord, uForms.z < 1. ? uForms.x : uForms.y);
      if (uForms.z > 0. && uForms.z < 1.) field = mix(field, sampleForm(coord, uForms.y), uForms.z);
      float density = field.r * uWeight;
      if (density > .001) {
        float shadow = pow(max(.001, field.g), shadowDepth);
        float direct = mix(1., shadow, uWeight);
        float top = smoothstep(-.25, .28, p.y);
        vec3 ambient = mix(vec3(.075, .10, .145), vec3(.20, .25, .31), top);
        ambient = mix(ambient, mix(vec3(.020, .032, .062), vec3(.072, .102, .16), top), uNight);
        vec3 color = ambient + sunColor * direct * uSun;
        if (uFlash.w > .001) {
          vec3 delta = p * uSize + uCenter - uFlash.xyz;
          color += vec3(.79, .88, 1.18) * uFlash.w * exp(-dot(delta, delta) * .26);
        }
        float absorb = 1. - exp(-density * extinction);
        scattering += transmission * absorb * color;
        transmission *= 1. - absorb;
        if (transmission < .015) break;
      }
    }
    float alpha = 1. - transmission;
    if (alpha < .004) discard;
    outCloud = vec4(scattering / max(alpha, .001), alpha);
  }
`;

export function createNaturalCloudBank(T, sunDirection) {
  const group = new T.Group();
  group.name = 'Advecting three-dimensional cloud formations';
  const light = (sunDirection || new T.Vector3(-16, 17, 13)).clone().normalize();
  const afternoonTint = new T.Color('#ffe6c4');
  const [nx, ny, nz] = FORM_RESOLUTION;
  const resolution = new T.Vector3(nx, ny, nz);
  const density = new T.Data3DTexture(null, nx, ny, nz * FORM_COUNT);
  density.format = T.RGFormat;
  density.type = T.UnsignedByteType;
  density.minFilter = T.LinearFilter;
  density.magFilter = T.LinearFilter;
  density.unpackAlignment = 1;
  let ready = false;
  let disposed = false;
  let worker;
  function setAtlas(atlas) {
    if (disposed) return;
    density.image.data = atlas;
    density.needsUpdate = true;
    ready = true;
    positionClouds();
    revision++;
  }
  function scheduleAtlasFallback() {
    const build = () => {
      if (!disposed) setAtlas(createFormAtlas(light));
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(build, {timeout: 2000});
    else setTimeout(build, 0);
  }
  const geometry = new T.BoxGeometry(1, 1, 1);
  const sharedUniforms = {
    uDensity: { value: density },
    uResolution: { value: resolution },
    uDepth: { value: null },
    uViewport: { value: new T.Vector2(1, 1) },
    uInverseVP: { value: new T.Matrix4() },
    uUseDepth: { value: 0 },
    uSun: { value: 1 },
    uSunTint: { value: new T.Color(1, 1, 1) },
    uNight: { value: 0 },
    uThickness: { value: .5 },
    uWind: { value: .5 },
    uFlash: { value: new T.Vector4() },
  };
  const coverageFlights = Array.from({length:12}, (_,i)=>({id:'overcast-'+i, x:-9+(i%4)*6,z:-6+Math.floor(i/4)*6,altitude:7.2+(i%3)*.65,size:[8.5,5.4,8.5],speed:.28,visibility:[.66+(i%4)*.045,.82+(i%4)*.045],coverage:true}));
  const valleyFlights = [
    {id:'below west',x:-11.0,z:6.2,altitude:-6.0,size:[13,4.8,7.7],speed:.32,visibility:[.04,.42],valley:true},
    {id:'below east',x:10.5,z:5.1,altitude:-6.5,size:[15.8,4.3,10.3],speed:.28,visibility:[.03,.42],valley:true},
    {id:'below rear',x:-1.1,z:-10.5,altitude:-8.2,size:[22,5.8,12],speed:.23,visibility:[.12,.53],valley:true},
    {id:'below front',x:2.7,z:11.9,altitude:-9.5,size:[18,4.5,8.3],speed:.23,visibility:[.23,.63],valley:true},
  ];
  const flights = [...FLIGHTS,...coverageFlights,...valleyFlights].map(flight => {
    const uniforms = {
      ...sharedUniforms,
      uInverse: { value: new T.Matrix4() },
      uSize: { value: new T.Vector3() },
      uCenter: { value: new T.Vector3() },
      uOrigin: { value: new T.Vector3() },
      uWeight: { value: 0 },
      uForms: { value: new T.Vector4() },
    };
    const material = new T.ShaderMaterial({
      name: 'Cumulus density scattering',
      glslVersion: T.GLSL3,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: T.BackSide,
      vertexShader,
      fragmentShader,
    });
    const mesh = new T.Mesh(geometry, material);
    mesh.name = 'Drifting density cloud volume: ' + flight.id;
    mesh.renderOrder = 40;
    group.add(mesh);
    const anchor = { id: flight.id, x: 0, y: 0, z: 0, radiusX: 0, radiusZ: 0, baseY: 0, weight: 0 };
    return { ...flight, mesh, uniforms, anchor, amountWeight: 0 };
  });

  const activeClouds = [];
  const cameraWorld = new T.Vector3();
  let visibleClouds = false;
  let revision = 0;
  let amount = -1;
  let thickness = .5;
  let windTarget = 0;
  let windSpeed = 0;
  let travelTime = 0;
  let lastTime = 0;
  let sunEnabled = true;
  let night = false;

  function setLighting() {
    sharedUniforms.uSun.value = night ? .075 : sunEnabled ? 1 : .30;
    sharedUniforms.uNight.value = Number(night);
    sharedUniforms.uSunTint.value.setRGB(1, 1, 1);
  }

  function positionClouds() {
    activeClouds.length = 0;
    visibleClouds = false;
    if (!ready) {
      for (const {mesh} of flights) mesh.visible = false;
      return;
    }
    const width = mix(.67, 1.32, amount) + .38 * T.MathUtils.smoothstep(amount,.6,1);
    const depth = mix(.76, 1.30, amount) + .38 * T.MathUtils.smoothstep(amount,.6,1);
    flights.forEach((flight, index) => {
      const { mesh, uniforms, anchor } = flight;
      if (flight.amountWeight <= .003) {
        mesh.visible = false;
        return;
      }
      const travel = flight.x - FLIGHT_START + travelTime * flight.speed;
      const pass = Math.floor(travel / FLIGHT_LENGTH);
      const x = FLIGHT_START + T.MathUtils.euclideanModulo(travel, FLIGHT_LENGTH);
      const z = flight.z + (x - flight.x) * .125
        + Math.sin(travelTime * .079 + index * 1.93) * .66
        + (pass ? (hash(pass + 2, index + 3, 23) - .5) * 3.0 : 0);
      const phase = travelTime * (.112 + index * .005) + index * 2.17;
      const formation = Math.floor(phase);
      const morph = T.MathUtils.smoothstep(phase - formation, .10, .94);
      const formA = T.MathUtils.euclideanModulo(formation * 3 + index, FORM_COUNT);
      const formB = (formA + 3) % FORM_COUNT;
      const exit = 14.45 - Math.max(0, z + 1) * .18;
      const fade = flight.valley ? 1 - T.MathUtils.smoothstep(Math.abs(x),12.4,15) : flight.coverage ? 1 - T.MathUtils.smoothstep(Math.abs(x), 12.8, 15) : 1 - T.MathUtils.smoothstep(Math.abs(x), 10.25, exit);
      const weight = flight.amountWeight * fade;
      mesh.visible = weight > .003;
      if (!mesh.visible) return;
      visibleClouds = true;

      const spread = 1 + Math.sin(phase * 1.72) * .12;
      const uplift = 1 + Math.sin(phase * 1.45 + .7) * .08;
      const y = flight.altitude + .18 * Math.sin(phase * 1.6)
        - Math.max(0, -6.5 - z) * (flight.valley ? .08 : .49) - (thickness - .5) * .14;
      mesh.position.set(x, y, z);
      mesh.scale.set(
        flight.size[0] * width * spread,
        flight.size[1] * uplift * mix(.58, 1.42, thickness),
        flight.size[2] * depth,
      );
      mesh.updateWorldMatrix(true, false);
      uniforms.uInverse.value.copy(mesh.matrixWorld).invert();
      uniforms.uCenter.value.copy(mesh.position);
      uniforms.uSize.value.copy(mesh.scale);
      uniforms.uWeight.value = weight;
      uniforms.uForms.value.set(formA, formB, morph, travelTime + index * 13);
      anchor.x = x;
      anchor.y = y;
      anchor.z = z;
      anchor.radiusX = mesh.scale.x * .43;
      anchor.radiusZ = mesh.scale.z * .43;
      anchor.baseY = y - mesh.scale.y * .34;
      anchor.weight = weight;
      if (!flight.valley && weight > .015) activeClouds.push(anchor);
    });
  }

  function setAmount(nextAmount) {
    const next = T.MathUtils.clamp(nextAmount, 0, 1);
    if (next === amount) return;
    amount = next;
    for (const flight of flights) {
      const [min, max] = flight.visibility;
      flight.amountWeight = T.MathUtils.smoothstep(amount, min, max);
    }
    positionClouds();
    revision++;
  }

  function update(time, camera) {
    const elapsed = time - lastTime;
    const previousTravel = travelTime;
    if (elapsed < 0) {
      // Seeking the simulation time starts the selected wind history anew.
      windSpeed = windTarget;
      travelTime = time * windSpeed;
    } else if (elapsed > 0) {
      // Integrate velocity through its eased change, so the slider never
      // multiplies the elapsed time and teleports existing clouds.
      const easeSeconds = .65;
      const ease = 1 - Math.exp(-elapsed / easeSeconds);
      travelTime += windTarget * elapsed + (windSpeed - windTarget) * easeSeconds * ease;
      windSpeed += (windTarget - windSpeed) * ease;
    }
    sharedUniforms.uWind.value = windSpeed * .25;
    lastTime = time;
    if (travelTime !== previousTravel) positionClouds();
    if (camera && visibleClouds) {
      camera.updateMatrixWorld();
      sharedUniforms.uInverseVP.value.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
      cameraWorld.setFromMatrixPosition(camera.matrixWorld);
      for (const { mesh, uniforms } of flights) {
        if (mesh.visible) uniforms.uOrigin.value.copy(cameraWorld).applyMatrix4(uniforms.uInverse.value);
      }
    }
  }

  function setSceneDepth(texture, viewport) {
    sharedUniforms.uDepth.value = texture;
    sharedUniforms.uUseDepth.value = texture ? 1 : 0;
    if (viewport) sharedUniforms.uViewport.value.copy(viewport);
  }

  group.userData = {
    method: 'Drifting volumetric clouds with interpolated density formations',
    densityResolution: [resolution.x, resolution.y, resolution.z * FORM_COUNT],
    raySteps: RAY_STEPS,
    sunSteps: SUN_STEPS,
    cloudVolumes: flights.length,
    reference: 'Met Office sunlit cumulus + CRI cloud-piercing tower',
  };
  setAmount(.55);
  if (typeof Worker === 'function') {
    try {
      worker = new Worker(new URL('./cloud-form-atlas.worker.js?v=1', import.meta.url), {type: 'module'});
      worker.onmessage = ({ data }) => {
        worker.terminate();
        worker = null;
        setAtlas(data);
      };
      worker.onerror = event => {
        event.preventDefault();
        worker.terminate();
        worker = null;
        scheduleAtlasFallback();
      };
      worker.postMessage({x: light.x, y: light.y, z: light.z});
    } catch {
      worker?.terminate();
      worker = null;
      scheduleAtlasFallback();
    }
  } else {
    scheduleAtlasFallback();
  }
  return {
    group,
    update,
    setSceneDepth,
    setAmount,
    getActiveClouds: () => activeClouds,
    get hasVisibleClouds() { return visibleClouds; },
    get revision() { return revision; },
    setThickness(value) {
      const next = T.MathUtils.clamp(value, 0, 1);
      if (next === thickness) return;
      thickness = next;
      sharedUniforms.uThickness.value = thickness;
      positionClouds();
      revision++;
    },
    setWind(value) {
      // Below 20% there is no advection or shape animation.
      const wind = T.MathUtils.clamp(value, 0, 1);
      windTarget = wind <= .20 ? 0 : 4 * Math.pow((wind - .20) / .80, 1.25);
      if (windTarget === 0) windSpeed = 0;
    },
    setSunEnabled(on) {
      sunEnabled = on;
      setLighting();
      revision++;
    },
    setNight(on) {
      night = on;
      setLighting();
      revision++;
    },
    setTimeLighting(nightMix, daylightStrength, tint = afternoonTint) {
      const dark = T.MathUtils.clamp(nightMix, 0, 1);
      const sunlight = mix(.30, 1, T.MathUtils.clamp(daylightStrength, 0, 1));
      sharedUniforms.uNight.value = dark;
      sharedUniforms.uSun.value = mix(sunlight, .075, dark);
      // The midday-to-twilight variation is relative to the original afternoon tone.
      sharedUniforms.uSunTint.value.setRGB(
        mix(1, tint.r / afternoonTint.r, .30),
        mix(1, tint.g / afternoonTint.g, .30),
        mix(1, tint.b / afternoonTint.b, .30),
      );
      revision++;
    },
    setFlash(x, y, z, strength) {
      sharedUniforms.uFlash.value.set(x, y, z, strength);
    },
    dispose() {
      disposed = true;
      worker?.terminate();
      density.dispose();
      geometry.dispose();
      for (const flight of flights) flight.mesh.material.dispose();
    },
  };
}
