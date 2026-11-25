import { rockContact } from './floating-ground-rim.js?v=2';

// Soil cutaway reference: the user's warm seaside-diorama screenshot,
// codex-clipboard-27ffdbb8-ab69-4fdd-a2fa-4eaaf9a244c5.png.
// Borrowed details are the continuous earth section, soft sediment horizons,
// irregular embedded aggregate and a clean rectangular presentation footprint.
// No image or external model is used. The existing city hides the upper cap.
export function createSoilPlinth(T, {
  width = 22, depth = 17, top = -.052, bottom = -.90,
} = {}) {
  const group = new T.Group();
  group.name = 'Earth section beneath the city';
  const height = top - bottom;
  if (!(width > 0 && depth > 0 && height > 0)) return group;
  let seed = 68312;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);

  const soil = new T.MeshStandardMaterial({
    color: '#ffffff', roughness: 1, metalness: 0,
  });
  soil.name = 'Dry loam, sand lenses and compacted mineral earth';
  soil.customProgramCacheKey = () => 'cut-earth-section-v2';
  soil.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      uSoilTop: { value: top }, uSoilHeight: { value: height },
      uSoilLoam: { value: new T.Color('#8d7255') },
      uSoilSurface: { value: new T.Color('#755e46') },
      uSoilLower: { value: new T.Color('#77624e') },
      uSoilSand: { value: new T.Color('#b29a76') },
    });
    shader.vertexShader = 'varying vec3 vEarthPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvEarthPosition = position;');
    shader.fragmentShader = /* glsl */`
      varying vec3 vEarthPosition;
      uniform float uSoilTop;
      uniform float uSoilHeight;
      uniform vec3 uSoilLoam, uSoilSurface, uSoilLower, uSoilSand;
      float earthHash(vec3 p) {
        p = fract(p * .1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float earthNoise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(earthHash(i), earthHash(i + vec3(1,0,0)), f.x),
                       mix(earthHash(i + vec3(0,1,0)), earthHash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(earthHash(i + vec3(0,0,1)), earthHash(i + vec3(1,0,1)), f.x),
                       mix(earthHash(i + vec3(0,1,1)), earthHash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float earthHeight(vec3 p) {
        return earthNoise(p * 71.0) * .0016 + earthNoise(p * 21.0) * .0022;
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', /* glsl */`
      #include <color_fragment>
      vec3 ep = vEarthPosition;
      float ed = clamp((uSoilTop - ep.y) / uSoilHeight, 0.0, 1.0);
      float broad = earthNoise(vec3(ep.x * .63, ep.y * 2.4, ep.z * .63));
      float horizon = .14 + .025 * sin(ep.x * .68 + ep.z * .43) + .035 * (broad - .5);
      vec3 earth = mix(uSoilSurface, uSoilLoam, smoothstep(horizon - .045, horizon + .065, ed));
      float lower = .72 + .045 * sin(ep.x * .39 - ep.z * .51) + .055 * (broad - .5);
      earth = mix(earth, uSoilLower, smoothstep(lower - .10, lower + .17, ed));
      // Discontinuous, feathered sand lenses, rather than evenly spaced bands.
      float lensLevel = .36 + .065 * sin(ep.x * .48 + ep.z * .31) + .038 * (broad - .5);
      float lensWidth = .020 + .028 * earthNoise(vec3(ep.x * .82, 8.0, ep.z * .82));
      float lens = 1.0 - smoothstep(lensWidth, lensWidth + .058, abs(ed - lensLevel));
      lens *= smoothstep(.29, .67, earthNoise(vec3(ep.x * .71, 3.0, ep.z * .71))) * .55;
      earth = mix(earth, uSoilSand, lens);
      float grains = earthNoise(ep * 94.0);
      float aggregates = earthNoise(ep * 28.0);
      float pores = 1.0 - smoothstep(.17, .27, grains);
      earth *= .88 + .22 * grains + .12 * aggregates - pores * .15;
      diffuseColor.rgb *= earth;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', /* glsl */`
      #include <emissivemap_fragment>
      // A low reflected fill on the downward cap exposes the same soil grain.
      float cap = 1.0 - step(.0001, abs(ep.y - (uSoilTop - uSoilHeight)));
      totalEmissiveRadiance += earth * .38 * cap;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */`
      #include <normal_fragment_maps>
      // Fine relief remains part of the lit material, including in grazing light.
      vec3 eDp1 = dFdx(-vViewPosition), eDp2 = dFdy(-vViewPosition);
      vec3 eR1 = cross(eDp2, normal), eR2 = cross(normal, eDp1);
      float eDet = dot(eDp1, eR1);
      float eHeight = earthHeight(vEarthPosition);
      vec3 eGradient = sign(eDet) * (dFdx(eHeight) * eR1 + dFdy(eHeight) * eR2);
      normal = normalize(abs(eDet) * normal - eGradient);
    `);
  };

  // Shared perimeter rings close all four corners. Small inward relief breaks
  // the sterile extrusion without producing spikes outside the city footprint.
  const perimeter = [], sideSteps = [Math.ceil(width * 7), Math.ceil(depth * 7), Math.ceil(width * 7), Math.ceil(depth * 7)];
  const corners = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]];
  const normals = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (let side = 0; side < 4; side++) {
    const a = corners[side], b = corners[(side + 1) % 4];
    for (let i = 0; i < sideSteps[side]; i++) {
      const t = i / sideSteps[side];
      perimeter.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, nx: normals[side][0], nz: normals[side][1], edge: Math.sin(Math.PI * t) });
    }
  }
  const positions = [], indices = [], count = perimeter.length, rows = 16;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows, envelope = Math.sin(Math.PI * t);
    for (const p of perimeter) {
      const inset = envelope * p.edge * (.012 + .006 * Math.sin(p.x * 13.1 + p.z * 11.7 + row * 1.9));
      const y = top+(rockContact(p.x,p.z)-.075-top)*t;
      positions.push(p.x - p.nx * inset, y, p.z - p.nz * inset);
    }
  }
  for (let row = 0; row < rows; row++) for (let i = 0; i < count; i++) {
    const next = (i + 1) % count, a = row * count + i, b = row * count + next, c = a + count, d = b + count;
    indices.push(a, b, c, b, d, c);
  }
  // Cap vertices are separate so top and bottom lighting have flat normals.
  for (const isTop of [true, false]) {
    const y = isTop ? top : bottom, center = positions.length / 3;
    positions.push(0, y, 0);
    for (const p of perimeter) positions.push(p.x,isTop?y:rockContact(p.x,p.z)-.075,p.z);
    for (let i = 0; i < count; i++) {
      const a = center + 1 + i, b = center + 1 + (i + 1) % count;
      if (isTop) indices.push(center, b, a); else indices.push(center, a, b);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const body = new T.Mesh(geometry, soil);
  body.name = 'Closed continuous cut-earth slab';
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);

  // Aggregate is half buried in the slightly recessed section, not glued onto
  // its edge. Instances stay inside the nominal rectangular cutaway bounds.
  const stoneGeo = new T.IcosahedronGeometry(1, 1);
  const stonePos = stoneGeo.attributes.position;
  for (let i = 0; i < stonePos.count; i++) {
    const x = stonePos.getX(i), y = stonePos.getY(i), z = stonePos.getZ(i);
    const f = .91 + .09 * Math.sin(x * 7.8 + y * 5.1 + z * 6.3);
    stonePos.setXYZ(i, x * f, y * f, z * f);
  }
  stoneGeo.computeVertexNormals();
  const number = Math.ceil((width + depth) * 2 * height * 16);
  const stoneMat = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0, flatShading: true });
  const stones = new T.InstancedMesh(stoneGeo, stoneMat, number);
  stones.name = 'Embedded warm gravel and pale mineral fragments';
  stones.castShadow = false; stones.receiveShadow = true;
  const matrix = new T.Matrix4(), quaternion = new T.Quaternion(), baseQuaternion = new T.Quaternion();
  const tangent = new T.Vector3(), up = new T.Vector3(0, 1, 0), normal = new T.Vector3(), scale = new T.Vector3(), position = new T.Vector3();
  const palette = ['#b6a080', '#998367', '#cfb994', '#73634f', '#a39279', '#c0ad8e'].map(c => new T.Color(c));
  for (let i = 0; i < number; i++) {
    const side = Math.floor(random() * 4), a = corners[side], b = corners[(side + 1) % 4];
    const t = range(.006, .994), d = range(.10, .94), n = normals[side];
    // More mineral fragments lower in the profile; upper topsoil stays fine.
    const sy = range(.008, .023) * (d < .26 ? .6 : 1), sx = sy * range(.8, 2.05), thickness = .014;
    position.set(a[0] + (b[0] - a[0]) * t - n[0] * thickness, top + (rockContact(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)-top)*d, a[1] + (b[1] - a[1]) * t - n[1] * thickness);
    normal.set(n[0], 0, n[1]); tangent.crossVectors(up, normal);
    matrix.makeBasis(tangent, up, normal); baseQuaternion.setFromRotationMatrix(matrix);
    quaternion.setFromAxisAngle(new T.Vector3(0, 0, 1), range(-Math.PI, Math.PI));
    quaternion.premultiply(baseQuaternion);
    scale.set(sx, sy, thickness);
    matrix.compose(position, quaternion, scale); stones.setMatrixAt(i, matrix);
    const color = palette[Math.floor(random() * palette.length)].clone();
    color.multiplyScalar(range(.85, 1.06)); stones.setColorAt(i, color);
  }
  stones.instanceMatrix.needsUpdate = true;
  if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
  stones.computeBoundingBox(); stones.computeBoundingSphere();
  group.add(stones);
  group.userData.reference = 'User supplied seaside-diorama screenshot: brown mineral cutaway, irregular sediment lenses, embedded aggregate';
  group.userData.bounds = { width, depth, top, bottom };
  group.userData.aggregateCount = number;
  return group;
}
