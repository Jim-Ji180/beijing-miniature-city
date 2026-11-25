// The supplied Miami view shows shallow concrete fascias, tapered retaining
// walls on approach, and separate carriageways at the crossing.
const ground = .041;
const rise = .769;
const northToe = -7.65;
const northDeck = -2.80;
const southDeck = .50;
const southToe = 5.55;
const roadHalfWidth = 1.035;
const slabDepth = .104;
const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = t => t * t * (3 - 2 * t);

export function flyoverHeight(z) {
  if (z <= northDeck) return ground + rise * smooth(clamp01((z - northToe) / (northDeck - northToe)));
  return ground + rise * smooth(clamp01((southToe - z) / (southToe - southDeck)));
}

export function flyoverSlope(z) {
  if (z <= northToe || z >= southToe || (z >= northDeck && z <= southDeck)) return 0;
  const span = z <= northDeck ? northDeck - northToe : southDeck - southToe;
  const t = (z - (z <= northDeck ? northToe : southToe)) / span;
  return rise * 6 * t * (1 - t) / span;
}

export function createStreetFlyover(T, roadMaterial) {
  const group = new T.Group();
  group.name = 'north-south-grade-separated-flyover';
  const material = (color, roughness = .9) => new T.MeshStandardMaterial({color, roughness});
  const pavement = roadMaterial.clone();
  pavement.polygonOffset = true; // The first and last rows meet the existing asphalt.
  pavement.polygonOffsetFactor = 0;
  pavement.polygonOffsetUnits = -1;
  pavement.customProgramCacheKey = () => 'flyover-pavement-v1';
  pavement.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec2 vFlyoverPosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vFlyoverPosition = position.xz;
    `);
    shader.fragmentShader = 'varying vec2 vFlyoverPosition;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float crossRoad = vFlyoverPosition.x;
      float alongRoad = vFlyoverPosition.y;
      vec2 antialiasWidth = max(fwidth(vFlyoverPosition)*.65,vec2(.0005));
      float shoulder = 1.0 - smoothstep(.008-antialiasWidth.x,.008+antialiasWidth.x,abs(abs(crossRoad)-.905));
      float centerDistance = abs(mod(alongRoad+7.445,.76)-.38);
      float centerDash = 1.0-smoothstep(.145-antialiasWidth.y,.145+antialiasWidth.y,centerDistance);
      centerDash *= 1.0-smoothstep(.016-antialiasWidth.x,.016+antialiasWidth.x,abs(crossRoad));
      centerDash *= step(-7.30,alongRoad)*step(alongRoad,5.43);
      float jointDistance = min(min(abs(alongRoad+4.18),abs(alongRoad+2.80)),min(abs(alongRoad-.50),abs(alongRoad-1.88)));
      float joint = (1.0-smoothstep(.004-antialiasWidth.y,.004+antialiasWidth.y,jointDistance))*step(abs(crossRoad),.965);
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.31,.32,.31),joint*.52);
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.79,.78,.69),shoulder);
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.67,.49,.18),centerDash);
    `);
  };
  const concrete = material('#adaea9');
  const soffit = material('#a3a6a4');
  const joint = material('#9b9d96');
  const edge = material('#d1cec1');
  const topRail = material('#bfc4bc', .75);
  const retaining = material('#b8b5a9');
  const pier = material('#c7c4b6');
  const bearing = material('#91968f');
  const ivory = material('#e6e4d8');
  ivory.polygonOffset = true;
  ivory.polygonOffsetFactor = -1;
  ivory.polygonOffsetUnits = -2;

  function add(name, positions, indices, finish, {outline = true, shadow = false, uv} = {}) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    if (uv) geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new T.Mesh(geometry, finish);
    mesh.name = name;
    mesh.receiveShadow = true;
    mesh.castShadow = shadow;
    // Continuous profiles cover walkable ground beneath the bridge. Only the
    // individual piers and retaining bays serve as street-level obstacles.
    if (outline) mesh.userData.flyoverSpan = true;
    group.add(mesh);
    return mesh;
  }

  function profile(start, end, widthA, widthB, shape, side = 0) {
    const positions = [], indices = [], uv = [];
    const rows = Math.ceil((end - start) / .065);
    for (let i = 0; i <= rows; i++) {
      const z = start + (end - start) * i / rows;
      for (const x of [widthA, widthB]) {
        positions.push(x, shape(x, z, i / rows), z);
        uv.push((x + 10.75) / 21.5, (z + 8.25) / 16.5);
      }
      if (i === rows) continue;
      const a = i * 2;
      const reverse = side < 0;
      if (reverse) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    return {positions, indices, uv};
  }

  function horizontal(name, start, end, x0, x1, height, finish, opts = {}) {
    const {positions, indices, uv} = profile(start, end, x0, x1, height, opts.down ? -1 : 1);
    return add(name, positions, indices, finish, {...opts, uv});
  }

  function wall(name, start, end, x, top, bottom, finish, opts = {}) {
    const positions = [], indices = [];
    const sections = Math.ceil((end - start) / .065);
    for (let i = 0; i <= sections; i++) {
      const z = start + (end - start) * i / sections;
      positions.push(x, top(z), z, x, bottom(z), z);
      if (i === sections) continue;
      const a = i * 2;
      if (x < 0) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    return add(name, positions, indices, finish, opts);
  }

  function box(name, x, y, z, width, height, depth, finish, span = false) {
    const mesh = new T.Mesh(new T.BoxGeometry(width, height, depth), finish);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData.flyoverSpan = span;
    group.add(mesh);
    return mesh;
  }

  function retainingBay(start, end, height) {
    const left = -.974, right = .974, base = .039;
    const front = height(start), back = height(end);
    const positions = [], indices = [];
    function face(...corners) {
      const first = positions.length / 3;
      positions.push(...corners.flat());
      indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
    }
    face([left,base,start],[left,base,end],[left,back,end],[left,front,start]);
    face([right,base,end],[right,base,start],[right,front,start],[right,back,end]);
    face([right,base,start],[left,base,start],[left,front,start],[right,front,start]);
    face([left,base,end],[right,base,end],[right,back,end],[left,back,end]);
    face([left,front,start],[left,back,end],[right,back,end],[right,front,start]);
    return add('flyover-retaining-bay', positions, indices, retaining, {outline:false});
  }

  const level = (_, z) => flyoverHeight(z);
  const soffitHeight = z => Math.max(.039, flyoverHeight(z) - slabDepth);
  const deck = horizontal('flyover-asphalt', northToe, southToe, -roadHalfWidth, roadHalfWidth, level, pavement, {shadow:true});
  // Keep the open underside visually distinct from the retaining approaches.
  horizontal('flyover-soffit', northToe, southToe, -roadHalfWidth, roadHalfWidth,
    (_, z) => soffitHeight(z), soffit, {down:true});

  for (const side of [-1, 1]) {
    const x = side * roadHalfWidth;
    wall('flyover-concrete-fascia', northToe, southToe, x, flyoverHeight, soffitHeight, concrete);
    wall('flyover-drip-edge', -6.92, 4.83, side * 1.037,
      z => flyoverHeight(z) - .039, z => Math.max(.039, flyoverHeight(z) - .052), edge);
    const start = northToe + .64;
    const end = southToe - .64;
    const guard = z => .105 * smooth(clamp01(Math.min(z - start, end - z) / .72));
    const top = z => flyoverHeight(z) + guard(z);
    const inner = side * .970;
    // Inward face reverses winding so both profiles remain opaque from street level.
    wall('flyover-parapet-outside', start, end, x, top, flyoverHeight, edge, {shadow:true});
    const insideWall = wall('flyover-parapet-inside', start, end, inner, top, flyoverHeight, edge, {shadow:true});
    const indices = insideWall.geometry.index.array;
    for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    insideWall.geometry.index.needsUpdate = true;
    insideWall.geometry.computeVertexNormals();
    horizontal('flyover-parapet-cap', start, end, Math.min(x,inner), Math.max(x,inner),
      (_, z) => top(z), topRail);
  }

  // The filled approaches stop outside the two sidewalk crossings.
  for (const [a, b] of [[northToe, -4.18], [1.88, southToe]]) {
    const count = Math.ceil((b - a) / .54);
    for (let i = 0; i < count; i++) {
      const start = a + (b - a) * i / count, end = a + (b - a) * (i + 1) / count;
      retainingBay(start, end, soffitHeight);
      if (i && soffitHeight(start) > .11) {
        for (const side of [-1, 1]) {
          wall('flyover-retaining-joint', start, start + .008, side * .975,
            z => soffitHeight(z) - .023, () => .051, joint);
        }
      }
    }
  }
  // End diaphragms close the retaining fill at the transition to the open span.
  for (const [z, inward] of [[-4.18, -1], [1.88, 1]]) {
    const depth = .15;
    const bearingHeight = soffitHeight(z);
    box('flyover-abutment', 0, (.039 + bearingHeight) / 2, z + depth / 2 * inward,
      1.948, bearingHeight - .039, depth, retaining);
  }
  // The carriageway below and both sidewalk crossings fit between the pier pairs.
  for (const z of [-3.26, 1.06]) {
    const bearingHeight = soffitHeight(z) - .007;
    for (const x of [-.625, .625]) {
      const base = .044, top = bearingHeight - .038;
      const column = new T.Mesh(new T.CylinderGeometry(.093, .114, top - base, 8), pier);
      column.name = 'flyover-pier-column';
      column.position.set(x, (base + top) / 2, z);
      column.receiveShadow = column.castShadow = true;
      group.add(column);
      box('flyover-column-foot', x, .060, z, .266, .032, .24, retaining);
      box('flyover-pier-cap', x, top + .015, z, .343, .042, .29, pier);
      box('flyover-bearing', x, bearingHeight, z, .162, .016, .13, bearing, true);
    }
  }

  const arrow = [[-.014,-.157],[.014,-.157],[.014,.047],[.065,.037],[0,.157],[-.065,.037],[-.014,.047]];
  const triangles = T.ShapeUtils.triangulateShape(arrow.map(([x,z]) => new T.Vector2(x,z)), []);
  for (const [x,z,dir] of [[-.51,-5.88,1],[.51,3.76,-1]]) {
    const positions = arrow.flatMap(([along,cross]) => [
      x + along * dir, flyoverHeight(z + cross * dir) + .0035, z + cross * dir
    ]);
    add('flyover-approach-arrow', positions, triangles.flatMap(([a,b,c]) => [a,c,b]), ivory);
  }

  return {group, deck};
}
