// Direct wall-root planting on the courtyard's east edge. Placement is based on
// old-beijing.js and the viewed current map; flower form and restrained colours
// follow the already approved hutong-front-garden.js, without its raised border.
export function createHutongEastFlowers(T) {
  const group = new T.Group();
  group.name = 'hutong-east-direct-wall-flowers';
  const material = color => new T.MeshStandardMaterial({ color, roughness: 1 });
  const stemMat = material('#4d713d');
  const leafMats = ['#4f7540', '#698643', '#7c9447'].map(material);
  const petalMats = ['#e6be55', '#e3cda0', '#d3a0a0'].map(material);
  const centerMat = material('#a37532');
  const stemGeo = new T.CylinderGeometry(1, 1, 1, 5);
  const organicGeo = new T.SphereGeometry(1, 8, 6);
  const batches = new Map(), obj = new T.Object3D();
  let seed = 21841;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const add = (key, geo, mat, position, scale, rotation = [0, 0, 0]) => {
    if (!batches.has(key)) batches.set(key, { geo, mat, transforms: [] });
    obj.position.set(...position); obj.scale.set(...scale); obj.rotation.set(...rotation); obj.updateMatrix();
    batches.get(key).transforms.push(obj.matrix.clone());
  };
  const stems = [];
  // The wall's outside face is x=-6.23.  The existing clear walking surface
  // begins at -6.10. Neither the path nor the east-west lane is planted over.
  const sections = [[1.00, 3.79], [4.52, 7.50]];
  for (let section = 0; section < sections.length; section++) {
    const [start, end] = sections[section];
    let index = 0;
    for (let z = start; z < end; z += .061, index++) {
      // Small gaps separate natural clumps; this is not a rigid flower fence.
      if ((index + section * 4) % 18 > 14) continue;
      const px = -6.164 + (random() - .5) * .015;
      const pz = z + (random() - .5) * .018;
      const height = .067 + random() * .087, base = .073;
      const flowerY = base + height;
      add('stem', stemGeo, stemMat, [px, base + height / 2, pz], [.0020, height, .0020]);
      for (let leaf = 0; leaf < 5; leaf++) {
        const direction = leaf % 2 ? 1 : -1;
        const angle = random() * Math.PI;
        add('leaf-' + leaf % 3, organicGeo, leafMats[leaf % 3],
          [px + direction * .011, base + .018 + height * .15 + leaf * .012, pz + (random() - .5) * .034],
          [.019 + random() * .004, .005, .011], [0, angle, direction * .35]);
      }
      const tone = index % 12 === 0 ? 2 : index % 3 === 0 ? 1 : 0;
      const flowerScale = .80 + random() * .22;
      const turn = random() * Math.PI;
      for (let petal = 0; petal < 8; petal++) {
        const angle = turn + petal * Math.PI / 4;
        add('petal-' + tone, organicGeo, petalMats[tone],
          [px + Math.cos(angle) * .015 * flowerScale, flowerY, pz + Math.sin(angle) * .015 * flowerScale],
          [.014 * flowerScale, .005 * flowerScale, .008 * flowerScale], [0, -angle, 0]);
      }
      add('flower-center', organicGeo, centerMat, [px, flowerY + .004, pz], [.0075 * flowerScale, .005, .0075 * flowerScale]);
      // Tiny basal leaves conceal the stem's soil junction, with no planter,
      // decorative curb, box or stone surface added to the existing ground.
      add('basal-leaf', organicGeo, leafMats[0], [px, base + .004, pz], [.028, .006, .025], [0, random() * Math.PI, 0]);
      stems.push([px, pz, height]);
    }
  }
  for (const [name, batch] of batches) {
    const mesh = new T.InstancedMesh(batch.geo, batch.mat, batch.transforms.length);
    mesh.name = 'east-wall-flower-' + name;
    batch.transforms.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); group.add(mesh);
  }
  group.userData = {
    reference: 'layout-balance-review/round5-overview.png; existing approved hutong-front-garden.js',
    plantCount: stems.length, flowerSections: sections, stemBaseY: .073,
    wallOuterX: -6.23, clearFootwayX: [-6.10, -5.78], clearCrossLaneZ: [4.07, 4.43],
    plantCenters: stems,
  };
  return group;
}
