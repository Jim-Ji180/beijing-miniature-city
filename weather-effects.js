import { createRainReflection } from './rain-reflection.js?v=3';
// Shape and falloff reference: Frank Bliss's rain shaft and lightning photos
// in the NWS Hulett storm case, https://www.weather.gov/unr/2019-06-25.
import { createRoofSnow } from './roof-snow.js?v=6';

const plotWidth = 22;
const plotDepth = 17;
const rainCounts = [0, 850, 2200, 4200];
const fillSpeeds = [-.055, .066, .115, .21];
const clearStrike = { id: 'clear-sky', x: 1.8, z: -4.9, baseY: 8.0 };

function randomGenerator(initialSeed) {
  let seed = initialSeed;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createRain(T) {
  const random = randomGenerator(418192);
  const geometry = new T.InstancedBufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute([
    -1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0,
  ], 3));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  const origins = [];
  const properties = [];
  for (let drop = 0; drop < rainCounts[3]; drop++) {
    origins.push(random(), random());
    properties.push(random(), random(), random(), random());
  }
  geometry.setAttribute('dropOrigin', new T.InstancedBufferAttribute(new Float32Array(origins), 2));
  geometry.setAttribute('dropProperties', new T.InstancedBufferAttribute(new Float32Array(properties), 4));
  geometry.instanceCount = 0;
  const material = new T.ShaderMaterial({
    name: 'Wind-driven shower streaks',
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uPlot: { value: new T.Vector2(plotWidth, plotDepth) },
      uNight: { value: 0 },
      uWind: { value: 0 },
      uStrength: { value: 0 },
    },
    vertexShader: `
      attribute vec2 dropOrigin;
      attribute vec4 dropProperties;
      uniform float uTime;
      uniform vec2 uPlot;
      uniform float uWind;
      uniform float uStrength;
      varying vec2 vStroke;
      varying float vOpacity;
      void main() {
        float top = 7.15 + 1.45 * dropProperties.w;
        float phase = fract(dropProperties.x + uTime * (4.0 + dropProperties.y * 2.3) / top);
        float lengthOfDrop = (.15 + .22 * dropProperties.z) * mix(.70, 1.17, uStrength);
        float height = .08 + (top - .08) * (1. - phase);
        float rise = min(lengthOfDrop, top - height) * position.y;
        vec2 wind = vec2(.035, .017) + vec2(.67, .36) * uWind;
        vec2 origin = (fract(dropOrigin + wind * (top - height) / uPlot) - .5) * uPlot;
        vec2 margin = uPlot * .5 - abs(origin);
        float edge = smoothstep(.04, .65, min(margin.x, margin.y));
        origin -= wind * rise;
        vec4 viewPoint = modelViewMatrix * vec4(origin.x, height + rise, origin.y, 1.);
        viewPoint.x += position.x * (.014 + .012 * dropProperties.w);
        gl_Position = projectionMatrix * viewPoint;
        float fadeAtTop = smoothstep(.015, .20, phase);
        float fadeAtGround = 1. - smoothstep(.94, 1., phase);
        float gust = .83 + .17 * sin(origin.x * .31 + origin.y * .24 - uTime * 1.25);
        float nearFade = smoothstep(3.5, 10., -viewPoint.z);
        vOpacity = fadeAtTop * fadeAtGround * edge * gust * nearFade
          * (.29 + .30 * dropProperties.w) * mix(.76, 1.04, uStrength);
        vStroke = position.xy;
      }
    `,
    fragmentShader: `
      uniform float uNight;
      varying vec2 vStroke;
      varying float vOpacity;
      void main() {
        float width = 1. - smoothstep(.1, 1., abs(vStroke.x));
        float ends = smoothstep(0., .18, vStroke.y) * (1. - smoothstep(.64, 1., vStroke.y));
        vec3 tint = mix(vec3(.22,.33,.45), vec3(.70,.83,.97), vStroke.y);
        tint *= mix(1., .57, uNight);
        gl_FragColor = vec4(tint, width * ends * vOpacity);
      }
    `,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.name = 'Rain across the plot';
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 15;

  function update(time, intensity, night, wind) {
    geometry.instanceCount = Math.round(rainCounts[3] * intensity / 3);
    mesh.visible = intensity > 0;
    if (!mesh.visible) return;
    material.uniforms.uTime.value = time;
    material.uniforms.uNight.value = night ? 1 : 0;
    material.uniforms.uWind.value = wind;
    material.uniforms.uStrength.value = intensity / 3;
  }

  return { mesh, update, dispose() { geometry.dispose(); material.dispose(); } };
}

function createSnowfall(T) {
  const random = randomGenerator(58102);
  const flakeCount = 1900;
  const positions = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];
  const seeds = new Float32Array(flakeCount * 4);
  for (let index = 0; index < seeds.length; index++) seeds[index] = random();
  const geometry = new T.InstancedBufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  geometry.setAttribute('flakeSeed', new T.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = flakeCount;
  const uniforms = {
    uTime: { value: 0 },
    uDrift: { value: 0 },
    uPlot: { value: new T.Vector2(plotWidth, plotDepth) },
    uNight: { value: 0 },
  };
  const material = new T.ShaderMaterial({
    name: 'Wind-carried snowfall',
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: `
      attribute vec4 flakeSeed;
      uniform float uTime;
      uniform float uDrift;
      uniform vec2 uPlot;
      varying vec2 vFlake;
      varying float vFade;
      void main() {
        float top = 8.05 + 1.9 * flakeSeed.w;
        float fallSpeed = .55 + .74 * flakeSeed.z;
        float phase = fract(flakeSeed.z + uTime * fallSpeed / top);
        float height = .08 + (1. - phase) * top;
        float swirl = uTime * (.49 + flakeSeed.w) + flakeSeed.z * 26.;
        vec2 floatMotion = vec2(sin(swirl), cos(swirl * .73)) * (.11 + .19 * flakeSeed.w);
        vec2 drift = vec2(.88, .46) * uDrift * (.72 + flakeSeed.w * .35);
        vec2 ground = (fract(flakeSeed.xy + (drift + floatMotion) / uPlot) - .5) * uPlot;
        vec2 margin = uPlot * .5 - abs(ground);
        vec4 view = modelViewMatrix * vec4(ground.x, height, ground.y, 1.);
        float radius = .012 + .029 * pow(flakeSeed.w, 1.85);
        float turn = swirl * .66;
        mat2 spin = mat2(cos(turn), -sin(turn), sin(turn), cos(turn));
        view.xy += spin * position.xy * radius;
        gl_Position = projectionMatrix * view;
        vFlake = position.xy;
        vFade = smoothstep(.025, .16, phase) * (1. - smoothstep(.88, .99, phase))
          * smoothstep(.015, .6, min(margin.x, margin.y))
          * smoothstep(2., 6., -view.z) * (.40 + flakeSeed.w * .52);
      }
    `,
    fragmentShader: `
      uniform float uNight;
      varying vec2 vFlake;
      varying float vFade;
      void main() {
        float radius = length(vFlake);
        float body = 1. - smoothstep(.12, .84, radius);
        float edge = max(0., cos(6. * atan(vFlake.y, vFlake.x)));
        float crystal = (1. - smoothstep(.40, .98, radius)) * edge * .24;
        vec3 tint = mix(vec3(.93,.96,1.), vec3(.69,.79,.94), uNight);
        gl_FragColor = vec4(tint, (body + crystal) * vFade);
      }
    `,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.name = 'Snowfall across the plot';
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 15;
  let lastTime = null;

  return {
    mesh,
    update(time, enabled, night, wind) {
      const elapsed = lastTime === null ? 0 : Math.max(0, time - lastTime);
      lastTime = time;
      mesh.visible = enabled;
      if (!enabled) return;
      uniforms.uTime.value = time;
      uniforms.uDrift.value += elapsed * (.055 + wind * 1.28);
      uniforms.uNight.value = night ? 1 : 0;
    },
    reset() {
      lastTime = null;
      uniforms.uDrift.value = 0;
      mesh.visible = false;
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

// Low spots collect alongside curbs in uneven groups, matching the irregular
// wet edges and quiet reflected highlights in reference-puddle.jpg.
const lowSpots = [
  // x, z, spread along x, spread along z, relative depth
  [-.82, -7.67, .20, .62, .76], [-.79, -7.22, .26, .71, .88], [-.70, -6.65, .34, .69, .72],
  [-.91, -5.55, .10, .23, .40], [.80, -6.80, .13, .28, .58],
  [.76, -4.06, .22, .69, .74], [.90, -3.64, .16, .38, .66],
  [-.76, 1.15, .25, .55, .78], [-.86, 1.60, .18, .49, .67],
  [.88, 2.72, .14, .35, .54], [-.73, 4.21, .24, .34, .62],
  [.84, 4.97, .21, .58, .68], [.75, 5.50, .33, .84, .92], [.87, 6.12, .18, .82, .73],
  [.78, 7.10, .26, .28, .57], [-.90, 6.54, .14, .51, .67], [-.78, 7.72, .23, .33, .55],
  [-10.12, -1.64, .71, .19, .81], [-9.56, -1.63, .62, .18, .70], [-8.69, -1.68, .36, .12, .55],
  [-7.51, -.64, .71, .17, .68], [-7.08, -.74, .44, .26, .69], [-4.15, -1.66, .52, .15, .75],
  [-3.11, -.67, .48, .21, .62], [2.98, -1.62, .47, .15, .61],
  [4.21, -.66, .79, .18, .82], [4.82, -.71, .61, .23, .71], [5.66, -.62, .24, .13, .53],
  [7.75, -1.63, .36, .15, .54], [8.72, -1.60, .55, .24, .77], [9.10, -1.69, .62, .14, .69],
  [10.49, -.65, .39, .14, .57],
  [-5.46, 1.84, .11, .68, .57], [-5.49, 2.36, .10, .44, .56], [-5.25, 6.42, .12, .38, .59],
  [6.76, 1.13, .10, .24, .54], [6.54, 4.62, .10, .75, .70], [6.50, 5.21, .08, .61, .67],
  [6.77, 7.76, .10, .34, .62],
  [1.21,-.37,.19,.15,.69],[-1.27,-.40,.19,.14,.61],
  [1.21,-1.91,.21,.15,.65],[-1.23,-1.88,.20,.12,.59],
];

function createDrainageField(T) {
  const width = 1024;
  const height = 768;
  const data = new Uint8Array(width * height);
  const toColumn = x => (x / plotWidth + .5) * width;
  const toRow = z => (z / plotDepth + .5) * height;
  for (const [centerX, centerZ, radiusX, radiusZ, depth] of lowSpots) {
    const left = Math.max(0, Math.floor(toColumn(centerX - radiusX * 1.45)));
    const right = Math.min(width, Math.ceil(toColumn(centerX + radiusX * 1.45)));
    const top = Math.max(0, Math.floor(toRow(centerZ - radiusZ * 1.45)));
    const bottom = Math.min(height, Math.ceil(toRow(centerZ + radiusZ * 1.45)));
    const phase = centerX * 31.9 + centerZ * 15.7;
    for (let row = top; row < bottom; row++) {
      const worldZ = ((row + .5) / height - .5) * plotDepth;
      const z = (worldZ - centerZ) / radiusZ;
      for (let column = left; column < right; column++) {
        const worldX = ((column + .5) / width - .5) * plotWidth;
        const x = (worldX - centerX) / radiusX;
        const roughness = .09 * Math.sin(worldX * 31 + worldZ * 17 + phase)
          + .045 * Math.sin(worldX * 73 - worldZ * 52 + phase)
          + .025 * Math.sin(worldX * 105 + worldZ * 91 - phase);
        const bend = .19 * Math.sin(z * 2.9 + phase) + .095 * Math.sin(z * 6.2 - phase);
        const lowPoint = 1 - Math.hypot(x + bend, z + .19 * Math.sin(x * 3.5 - phase));
        const heightValue = Math.round(T.MathUtils.clamp(lowPoint * depth + roughness, 0, 1) * 255);
        const index = row * width + column;
        data[index] = Math.max(data[index], heightValue);
      }
    }
  }
  const texture = new T.DataTexture(data, width, height, T.RedFormat);
  texture.name = 'Asphalt drainage field';
  texture.minFilter = texture.magFilter = T.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createPuddleRoadGeometry(T) {
  // Match the straight asphalt surfaces and keep the water below painted marks.
  const sections = [
    [-1.049, 1.049, -8.499, 8.499],
    [-10.999, -1.049, -1.824, -.476], [1.049, 10.999, -1.824, -.476],
    [-5.589, -5.131, -.475, 8.499], [6.421, 6.879, -.475, 8.499],
  ];
  const positions = [];
  const indices = [];
  for (const [left, right, back, front] of sections) {
    const start = positions.length / 3;
    positions.push(left, .044, back, right, .044, back, left, .044, front, right, .044, front);
    indices.push(start, start + 2, start + 1, start + 2, start + 3, start + 1);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

function createPuddles(T) {
  const drainage = createDrainageField(T);
  let geometry = createPuddleRoadGeometry(T);
  const uniforms = {
    uDrainage: { value: drainage },
    uReflection: { value:null },
    uMirror: { value:new T.Matrix4() },
    uMirrorReady: { value:0 },
    uTraffic: { value:Array.from({length:14},()=>new T.Vector4(100,100,0,0)) },
    uPlot: { value: new T.Vector2(plotWidth, plotDepth) },
    uWater: { value: 0 },
    uRain: { value: 0 },
    uTime: { value: 0 },
    uDaylight: { value: 1 },
    uFlash: { value: new T.Vector4() },
  };
  const material = new T.ShaderMaterial({
    name: 'Shallow rainwater on asphalt',
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
      }
    `,
    fragmentShader: `
      uniform sampler2D uDrainage;
      uniform sampler2D uReflection;
      uniform mat4 uMirror;
      uniform float uMirrorReady;
      uniform vec4 uTraffic[14];
      uniform vec2 uPlot;
      uniform float uWater;
      uniform float uRain;
      uniform float uTime;
      uniform float uDaylight;
      uniform vec4 uFlash;
      varying vec3 vWorld;

      float impact(vec2 point, vec2 center, float phase) {
        float radius = .020 + phase * .17;
        float edge = abs(length(point - center) - radius);
        return (1. - smoothstep(.006, .020, edge)) * pow(1. - phase, 1.6);
      }
      float hash(vec2 point) {
        return fract(sin(dot(point, vec2(41.3, 27.1))) * 17381.);
      }
      void main() {
        vec2 point = vWorld.xz;
        float basin = texture2D(uDrainage, point / uPlot + .5).r;
        float waterline = mix(.64, .115, pow(uWater, .68));
        float poolEdge = basin + .016 * sin(point.x * 42. + point.y * 31.) * sin(point.y * 28. - point.x * 17.);
        float water = smoothstep(waterline, waterline + .11, poolEdge);
        float damp = smoothstep(max(.04, waterline - .17), waterline + .02, poolEdge);
        float fadeIn = smoothstep(.015, .34, uWater);
        float film = (.18 + .27 * damp) * fadeIn;
        if (water + film < .003) discard;

        vec2 cell = floor(point * 2.6);
        vec2 local = fract(point * 2.6) - .5;
        float seed = hash(cell);
        vec2 center = .24 * vec2(sin(seed * 39.1), cos(seed * 20.3));
        float rings = impact(local, center, fract(uTime * 1.7 + seed));
        rings += impact(local, -center, fract(uTime * 1.16 + seed + .48)) * .51;
        rings *= uRain;
        float wake=0.;
        if(water>.12){
          for(int i=0;i<14;i++){
            vec4 car=uTraffic[i];
            vec2 offset=point-car.xy;
            float along=dot(offset,car.zw),crossing=abs(offset.x*car.w-offset.y*car.z);
            float envelope=exp(-pow((crossing-.092)*39.,2.)-pow((along+.21)*5.,2.));
            wake+=sin(along*107.+uTime*14.)*envelope*step(.001,length(car.zw));
          }
        }

        vec3 viewDirection = normalize(cameraPosition - vWorld);
        float grain = hash(floor(point * 135.));
        float waves = sin(dot(point, vec2(5.8, -9.2)) + uTime * 1.3);
        vec3 reflected = reflect(-viewDirection, normalize(vec3(.022 * waves, 1., .012 * rings)));
        float fresnel = pow(1. - clamp(viewDirection.y, 0., 1.), 2.0);
        // A narrow neutral glint follows the angle to the sky. Darkness in the
        // rest of the pool preserves the view of the submerged asphalt.
        float skyline = sin(point.x * 4.5 + point.y * 2.9 + reflected.x * 6.5)
                      + .37 * sin(point.x * 9.1 - point.y * 7.4 + reflected.z * 6.);
        float sky = .31 + .46 * smoothstep(-.58, .76, skyline) + .28 * fresnel;
        vec3 skyTint = mix(vec3(.028,.042,.065), vec3(.28,.29,.30), uDaylight);
        vec3 wetAsphalt = mix(vec3(.009,.014,.024), vec3(.036,.043,.052), uDaylight);
        wetAsphalt *= mix(.84, 1.12, grain);
        float rippleStrength = .025 + .06 * uDaylight;
        vec3 surface = wetAsphalt * .62 + skyTint * sky + vec3(rippleStrength) * rings;
        float flashFalloff = exp(-dot(point - uFlash.xz, point - uFlash.xz) * .19);
        surface += vec3(.20,.31,.5) * flashFalloff * uFlash.w;
        if (uMirrorReady>.001){
          vec4 projected=uMirror*vec4(vWorld,1.);
          vec2 projectedUV=projected.xy/projected.w;
          projectedUV+=vec2(waves+rings*.55,wake+rings*.23)*(.0018+water*.0015);
          vec2 inside=step(vec2(.005),projectedUV)*step(projectedUV,vec2(.995));
          vec3 reflection=texture2D(uReflection,projectedUV).rgb;
          float clarity=(.34+.27*fresnel)*smoothstep(.24,.98,water);
          surface=mix(surface,reflection,clarity*uMirrorReady*inside.x*inside.y);
        }
        surface+=vec3(.032*wake);
        vec3 color = mix(wetAsphalt, surface, water);
        gl_FragColor = vec4(color, film + water * (.58 - film) * fadeIn);
      }
    `,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.name = 'Pooled rainwater and ripples';
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 14;
  let lastTime = null;

  function reset() {
    lastTime = null;
    uniforms.uWater.value = 0;
    mesh.visible = false;
    mesh.userData.waterLevel = 0;
  }

  function update(time, intensity, { night, sun }, frame, reduceMotion) {
    const elapsed = lastTime === null ? 0 : Math.max(0, time - lastTime);
    lastTime = time;
    const speed = intensity > 0 ? .21 * intensity / 3 : fillSpeeds[0];
    const water = T.MathUtils.clamp(uniforms.uWater.value + elapsed * speed, 0, 1);
    uniforms.uWater.value = water;
    uniforms.uRain.value = intensity / 3;
    uniforms.uTime.value = time * (reduceMotion ? .45 : 1);
    uniforms.uDaylight.value = night ? 0 : sun ? 1 : .65;
    const strike = frame.flashPosition;
    uniforms.uFlash.value.set(strike.x, strike.y, strike.z, frame.flash);
    mesh.visible = water > .01;
    mesh.userData.waterLevel = water;
  }
  reset();
  function setRoadMeshes(meshes){
    if(!meshes.length)return;
    const positions=[],indices=[],v=new T.Vector3();
    for(const part of meshes){
      part.updateWorldMatrix(true,false);
      const {position}=part.geometry.attributes, index=part.geometry.index;
      const start=positions.length/3;
      for(let i=0;i<position.count;i++){
        v.fromBufferAttribute(position,i).applyMatrix4(part.matrixWorld);
        positions.push(v.x,v.y+.003,v.z);
      }
      for(let i=0;i<index.count;i++)indices.push(start+index.getX(i));
    }
    geometry.dispose();
    geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setIndex(indices);
    mesh.geometry=geometry;
    material.side=T.DoubleSide;
  }
  return { mesh, uniforms, update, reset, setRoadMeshes, dispose() { geometry.dispose(); material.dispose(); drainage.dispose(); } };
}

function createLightning(T) {
  const random = randomGenerator(918471);
  const maxVertices = 256;
  const geometry = new T.BufferGeometry();
  const positions = new T.BufferAttribute(new Float32Array(maxVertices * 3), 3).setUsage(T.DynamicDrawUsage);
  const tangents = new T.BufferAttribute(new Float32Array(maxVertices * 3), 3).setUsage(T.DynamicDrawUsage);
  const stroke = new T.BufferAttribute(new Float32Array(maxVertices * 2), 2).setUsage(T.DynamicDrawUsage);
  const indices = new T.BufferAttribute(new Uint16Array(maxVertices * 3), 1).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  geometry.setAttribute('strokeTangent', tangents);
  geometry.setAttribute('strokeData', stroke);
  geometry.setIndex(indices);

  const material = new T.ShaderMaterial({
    name: 'Forked electric channel',
    transparent: true,
    side: T.DoubleSide,
    depthWrite: false,
    uniforms: { uFlash: { value: 0 } },
    vertexShader: `
      attribute vec3 strokeTangent;
      attribute vec2 strokeData;
      varying float vEdge;
      void main() {
        vec4 viewPoint = modelViewMatrix * vec4(position, 1.);
        vec3 tangent = mat3(modelViewMatrix) * strokeTangent;
        vec3 side = normalize(cross(tangent, -viewPoint.xyz));
        viewPoint.xyz += side * strokeData.x * strokeData.y;
        vEdge = strokeData.x;
        gl_Position = projectionMatrix * viewPoint;
      }
    `,
    fragmentShader: `
      uniform float uFlash;
      varying float vEdge;
      void main() {
        float d = abs(vEdge);
        float halo = (1. - smoothstep(.10, 1., d)) * .49;
        float core = 1. - smoothstep(.15, .39, d);
        vec3 color = mix(vec3(.20,.39,.78), vec3(2.5,2.75,3.1), core);
        gl_FragColor = vec4(color, uFlash * max(core, halo));
      }
    `,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.name = 'Lightning channel and branches';
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 16;

  // Perturb at two scales to get crooked main turns and smaller irregular kinks.
  function jaggedPath(start, end, steps, amplitude) {
    const path = [start];
    const direction = end.clone().sub(start);
    const axis = new T.Vector3(direction.y, -direction.x, 0).normalize();
    const coarse = Array.from({ length: 7 }, () => (random() - .5) * amplitude);
    for (let index = 1; index < steps; index++) {
      const t = index / steps;
      const segment = t * (coarse.length - 1);
      const offset = T.MathUtils.lerp(coarse[Math.floor(segment)], coarse[Math.ceil(segment)], segment % 1);
      const taper = Math.sin(Math.PI * t);
      const point = start.clone().addScaledVector(direction, t);
      point.addScaledVector(axis, offset * taper + (random() - .5) * amplitude * .39);
      point.z += (random() - .5) * amplitude * .45 * taper;
      path.push(point);
    }
    path.push(end);
    return path;
  }

  function place(origin) {
    const drop = origin.y;
    const offsetX = T.MathUtils.clamp(origin.x + (random() - .5) * 2.5, -9.1, 9.1) - origin.x;
    const offsetZ = T.MathUtils.clamp(origin.z + 1.1 + random(), -7.0, 7.0) - origin.z;
    const main = jaggedPath(new T.Vector3(), new T.Vector3(offsetX, -drop + .09, offsetZ), 22, 1.38);
    let vertices = 0;
    let indexCount = 0;
    function addStroke(path, width) {
      for (let index = 0; index < path.length; index++) {
        const point = path[index];
        const tangent = path[Math.min(index + 1, path.length - 1)].clone()
          .sub(path[Math.max(index - 1, 0)]).normalize();
        const t = index / (path.length - 1);
        const radius = width * (1 - .82 * t);
        for (const side of [-1, 1]) {
          positions.setXYZ(vertices, point.x, point.y, point.z);
          tangents.setXYZ(vertices, tangent.x, tangent.y, tangent.z);
          stroke.setXY(vertices, side, radius);
          vertices++;
        }
        if (index === 0) continue;
        for (const vertex of [vertices - 4, vertices - 3, vertices - 2, vertices - 2, vertices - 3, vertices - 1]) {
          indices.setX(indexCount++, vertex);
        }
      }
    }

    addStroke(main, .10);
    for (const [node, side, length] of [[4, -1, 2.0], [8, 1, 1.6], [13, -1, 1.25], [16, 1, 1.05]]) {
      const start = main[node];
      const end = start.clone().add(new T.Vector3(side * length, -length * (.49 + random() * .49), .32 + random() * .45));
      end.y = Math.max(end.y, -drop + .11);
      const branch = jaggedPath(start, end, 9, .69);
      addStroke(branch, .063);
      if (node < 10) {
        const fork = branch[4];
        const forkEnd = fork.clone().add(new T.Vector3(side * length * .54, -.37, -.36));
        addStroke(jaggedPath(fork, forkEnd, 5, .32), .046);
      }
    }

    geometry.setDrawRange(0, indexCount);
    positions.needsUpdate = tangents.needsUpdate = stroke.needsUpdate = indices.needsUpdate = true;
  }

  return { mesh, material, place, dispose() { geometry.dispose(); material.dispose(); } };
}

export function createWeatherEffects(T,renderer) {
  const group = new T.Group();
  group.name = 'Local weather effects';
  const rain = createRain(T);
  const snowfall = createSnowfall(T);
  const roofSnow = createRoofSnow(T);
  const puddles = createPuddles(T);
  const roadMeshes=[];
  const lightning = createLightning(T);
  const light = new T.PointLight('#b9d2ff', 0, 9.0, 2);
  light.name = 'Local lightning illumination';
  group.add(roofSnow.mesh, puddles.mesh, rain.mesh, snowfall.mesh, lightning.mesh, light);
  const reflection=createRainReflection(T,renderer,puddles.mesh,group,puddles.uniforms);

  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const nextRandom = randomGenerator(5713);
  const frame = { flash: 0, flashPosition: new T.Vector3() };
  let wasEnabled = false;
  let nextStrike = Infinity;
  let strikeTime = -Infinity;
  let previousTime = 0;
  let origin = clearStrike;
  const strikeOrigin = new T.Vector3();

  function setStrikeOrigin(anchor) {
    strikeOrigin.set(anchor.x + (anchor.radiusX ?? 0) * .27, anchor.baseY + .34, anchor.z + (anchor.radiusZ ?? 0) * .24);
  }

  function update(time, state, clouds = []) {
    const reduceMotion = !!reducedMotion?.matches;
    const fallTime = reduceMotion ? time * .45 : time;
    const intensity = T.MathUtils.clamp((state.rainIntensity ?? (state.rain ? 2 : 0)), 0, 3);
    const wind = T.MathUtils.clamp(state.wind ?? .2, 0, 1);
    rain.update(fallTime, intensity, state.night, wind);
    snowfall.update(fallTime, !!state.snow, state.night, wind);
    roofSnow.update(time, !!state.snow);

    if (!state.lightning) {
      nextStrike = Infinity;
      strikeTime = -Infinity;
    } else if (!wasEnabled || time < previousTime) {
      nextStrike = time + .48;
      strikeTime = -Infinity;
    }
    wasEnabled = !!state.lightning;
    previousTime = time;

    if (state.lightning && time >= nextStrike) {
      const candidates = clouds.filter(cloud => cloud.weight > .25);
      origin = candidates[Math.floor(nextRandom() * candidates.length)] ?? clearStrike;
      strikeTime = time;
      nextStrike = time + 4.9 + nextRandom() * 3.1;
      setStrikeOrigin(origin);
      lightning.place(strikeOrigin);
    }
    const elapsed = time - strikeTime;
    const duration = reduceMotion ? .62 : .43;
    const active = state.lightning && elapsed >= 0 && elapsed < duration;
    const anchor = clouds.find(cloud => cloud.id === origin.id) ?? origin;
    const rise = T.MathUtils.smoothstep(elapsed, -.045, reduceMotion ? .19 : .035);
    const decay = 1 - T.MathUtils.smoothstep(elapsed, .07, duration);
    const strength = active ? rise * decay : 0;
    frame.flash = strength * (reduceMotion ? .23 : 1);
    setStrikeOrigin(anchor);
    frame.flashPosition.copy(strikeOrigin);
    lightning.mesh.position.copy(frame.flashPosition);
    lightning.mesh.visible = active;
    lightning.material.uniforms.uFlash.value = strength * (reduceMotion ? .48 : 1);
    light.position.copy(frame.flashPosition);
    light.position.y -= 1.1;
    light.intensity = frame.flash * 47;
    puddles.update(time, intensity, state, frame, reduceMotion);
    return frame;
  }

  return {
    group,
    update,
    renderReflections(scene,camera,cars){
      if(puddles.mesh.visible){
        puddles.uniforms.uTraffic.value.forEach((wake,i)=>{
          const car=cars[i];
          if(car?.g.visible&&car.speed>.15&&car.g.position.y<.065)wake.set(car.g.position.x,car.g.position.z,
            car.horizontal?car.dir:0,car.horizontal?0:car.dir);
          else wake.set(100,100,0,0);
        });
      }
      reflection.update(scene,camera);
    },
    addWetRoad(mesh){roadMeshes.push(mesh);},
    finishRoads(){puddles.setRoadMeshes(roadMeshes);},
    addSnowSurfaces: roofSnow.addSurfaces,
    setRoofBuilding: roofSnow.setBuilding,
    removeSnowSurfaces: roofSnow.removeSurfaces,
    reset() {
      puddles.reset();
      snowfall.reset();
      roofSnow.reset();
      rain.mesh.visible = lightning.mesh.visible = false;
      frame.flash = light.intensity = 0;
      wasEnabled = false;
      nextStrike = Infinity;
      strikeTime = -Infinity;
    },
    dispose() {
      rain.dispose();
      snowfall.dispose();
      roofSnow.dispose();
      puddles.dispose();
      reflection.dispose();
      lightning.dispose();
      light.dispose();
    },
  };
}
