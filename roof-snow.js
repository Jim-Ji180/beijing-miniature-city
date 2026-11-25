// Reference: snow following the individual roof slopes and eaves at Beijing's
// Palace Museum (outputs/winter-weather-review/beijing-roof-snow.jpg).
export function createRoofSnow(T) {
  const accumulation = { value: 0 };
  const material = new T.MeshStandardMaterial({
    color: '#ecf4fa',
    roughness: .9,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  material.name = 'Grainy snow settled on upward-facing roofs';
  material.onBeforeCompile = shader => {
    shader.uniforms.uSnowAccumulation = accumulation;
    shader.vertexShader = 'uniform float uSnowAccumulation; varying vec3 vSnowPosition;\n'
      + shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vSnowPosition = position;
        transformed.y += .004 + .010 * uSnowAccumulation;
      `);
    shader.fragmentShader = `
      uniform float uSnowAccumulation;
      varying vec3 vSnowPosition;
      float snowHash(vec2 p) { return fract(sin(dot(p, vec2(129.9, 278.1))) * 43758.54); }
      float snowNoise(vec2 p) {
        vec2 cell = floor(p);
        vec2 f = fract(p);
        f = f * f * (3. - 2. * f);
        return mix(mix(snowHash(cell), snowHash(cell + vec2(1., 0.)), f.x),
          mix(snowHash(cell + vec2(0., 1.)), snowHash(cell + 1.), f.x), f.y);
      }
    ` + shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      vec2 snowPoint = vSnowPosition.xz + vSnowPosition.y * vec2(.19, .28);
      float snowCoarse = snowNoise(snowPoint * 7.5);
      float snowFine = snowNoise(snowPoint * 42.);
      float snowField = .72 * snowCoarse + .28 * snowFine;
      float snowBoundary = mix(.92, .05, pow(uSnowAccumulation, .86));
      float snowMask = smoothstep(snowBoundary - .08, snowBoundary + .095, snowField);
      diffuseColor.a *= snowMask * smoothstep(0., .14, uSnowAccumulation);
      diffuseColor.rgb *= .92 + .08 * snowFine;
      if (diffuseColor.a < .007) discard;
    `);
  };
  const mesh = new T.Group();
  mesh.name = 'Roof snow cover';
  mesh.visible = false;

  const roofs = new Map();
  const underConstruction = new Set();
  let dirty = false;
  let lastTime = null;
  let pendingCover = null;
  let coverDeadline = 0;
  const worldBounds = new T.Box3();
  const worldTransform = new T.Matrix4();
  const instanceTransform = new T.Matrix4();
  const normalTransform = new T.Matrix3();
  const corners = [new T.Vector3(), new T.Vector3(), new T.Vector3()];
  const face = new T.Vector3();
  const edge = new T.Vector3();
  const normal = new T.Vector3();

  function addSurfaces(...roots) {
    for (const root of roots) {
      if (!root || roofs.has(root)) continue;
      roofs.set(root, null);
      dirty = true;
    }
  }

  function* createCover(root) {
    const positions = [];
    const normals = [];
    root.updateWorldMatrix(true, true);
    worldBounds.setFromObject(root);
    if (worldBounds.isEmpty()) return;
    const rise = worldBounds.max.y - worldBounds.min.y;
    const threshold = worldBounds.min.y + rise * .55;
    const courtyard = root.userData.isCourtyardRoof;
    const cctv = root.name === 'CCTV Headquarters';
    const objects = [];
    root.traverse(object => {
      if (object.isMesh && object.visible && object.geometry?.attributes.position) objects.push(object);
    });
    let batchSize = 0;
    for (const object of objects) {
      if (performance.now() >= coverDeadline) yield;
      if (courtyard) {
        let branch = object.parent;
        while (branch && branch !== root && branch.name !== 'branching-street-tree') branch = branch.parent;
        if (branch?.name === 'branching-street-tree') continue;
      }
      const { position, normal: sourceNormals } = object.geometry.attributes;
      const sourceIndex = object.geometry.index;
      const triangleCount = sourceIndex?.count ?? position.count;
      const pitchedTempleRoof = object.geometry.type === 'LatheGeometry';
      const minimumHeight = courtyard ? .36 : pitchedTempleRoof ? 1.3 : cctv ? .24 : threshold;
      const twoSided = object.material?.side === T.DoubleSide && !pitchedTempleRoof;
      const count = object.isInstancedMesh ? object.count : 1;
      for (let instance = 0; instance < count; instance++) {
        worldTransform.copy(object.matrixWorld);
        if (object.isInstancedMesh) {
          object.getMatrixAt(instance, instanceTransform);
          worldTransform.multiply(instanceTransform);
        }
        normalTransform.getNormalMatrix(worldTransform);
        for (let triangle = 0; triangle + 2 < triangleCount; triangle += 3) {
          if (++batchSize >= 256) {
            batchSize = 0;
            if (performance.now() >= coverDeadline) yield;
          }
          const a = sourceIndex ? sourceIndex.getX(triangle) : triangle;
          const b = sourceIndex ? sourceIndex.getX(triangle + 1) : triangle + 1;
          const c = sourceIndex ? sourceIndex.getX(triangle + 2) : triangle + 2;
          corners[0].fromBufferAttribute(position, a).applyMatrix4(worldTransform);
          corners[1].fromBufferAttribute(position, b).applyMatrix4(worldTransform);
          corners[2].fromBufferAttribute(position, c).applyMatrix4(worldTransform);
          if ((corners[0].y + corners[1].y + corners[2].y) / 3 < minimumHeight) continue;
          face.subVectors(corners[1], corners[0]).cross(edge.subVectors(corners[2], corners[0]));
          const reversed = twoSided && face.y < 0;
          if (reversed) face.negate();
          // Reject vertical walls and tiny horizontal window trim. Snow stays
          // on the original broad roofs, rooftop equipment, and ledges.
          if (face.y < .00012 || face.y < face.length() * .32) continue;
          face.normalize();
          for (let vertex = 0; vertex < 3; vertex++) {
            const order = reversed && vertex !== 0 ? 3 - vertex : vertex;
            const point = corners[order];
            positions.push(point.x, point.y, point.z);
            if (sourceNormals) {
              const index = order === 0 ? a : order === 1 ? b : c;
              normal.fromBufferAttribute(sourceNormals, index).applyNormalMatrix(normalTransform);
              if (reversed) normal.negate();
              if (normal.y < .22) normal.copy(face);
            } else {
              normal.copy(face);
            }
            normals.push(normal.x, normal.y, normal.z);
          }
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    if (positions.length) geometry.computeBoundingSphere();
    const cover = new T.Mesh(geometry, material);
    cover.receiveShadow = true;
    cover.renderOrder = 7;
    return cover;
  }

  function buildCover() {
    // Large landmark meshes span several frames before their settled cover is
    // ready. Falling snow starts immediately and the accumulation ramps in.
    coverDeadline = performance.now() + 4;
    dirty = false;
    for (const [root, currentCover] of roofs) {
      if (currentCover || underConstruction.has(root)) continue;
      if (performance.now() >= coverDeadline) {
        dirty = true;
        break;
      }
      if (pendingCover?.root !== root) pendingCover = {root, builder: createCover(root)};
      const result = pendingCover.builder.next();
      if (!result.done) {
        dirty = true;
        break;
      }
      pendingCover = null;
      if (result.value) {
        roofs.set(root, result.value);
        mesh.add(result.value);
      }
    }
    mesh.userData.roofTriangles = mesh.children.reduce((total, cover) => total + cover.geometry.attributes.position.count / 3, 0);
  }

  function update(time, falling) {
    const elapsed = lastTime === null ? 0 : Math.max(0, time - lastTime);
    lastTime = time;
    if (!falling) accumulation.value = 0;
    if (falling) accumulation.value = Math.min(1, accumulation.value + elapsed * .152);
    if (accumulation.value > .001 && dirty) buildCover();
    mesh.visible = accumulation.value > .001 && mesh.children.length > 0;
    mesh.userData.snowLevel = accumulation.value;
  }

  return {
    mesh,
    addSurfaces,
    removeSurfaces(root) {
      if (pendingCover?.root === root) pendingCover = null;
      const cover = roofs.get(root);
      if (cover) {
        mesh.remove(cover);
        cover.geometry.dispose();
      }
      roofs.delete(root);
      underConstruction.delete(root);
      dirty = true;
    },
    update,
    setBuilding(root, building) {
      if (building) {
        underConstruction.add(root);
        if (pendingCover?.root === root) pendingCover = null;
      } else underConstruction.delete(root);
      const cover = roofs.get(root);
      if (cover) cover.visible = !building;
      else if (!building && roofs.has(root)) dirty = true;
    },
    reset() {
      lastTime = null;
      pendingCover = null;
      accumulation.value = 0;
      mesh.userData.snowLevel = 0;
      mesh.visible = false;
    },
    dispose() { for (const cover of mesh.children) cover.geometry.dispose(); material.dispose(); },
  };
}
