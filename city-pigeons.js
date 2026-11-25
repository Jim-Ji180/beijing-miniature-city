import { GLTFLoader } from './vendor/GLTFLoader.js';

const birdsPerFlock = 15;
const turn = Math.PI * 2;

// Clone the skinned mesh with its own bones so wingbeats can be out of phase.
function cloneBird(source) {
  const copy = source.clone(true);
  const originals = [];
  const copies = [];
  source.traverse(node => originals.push(node));
  copy.traverse(node => copies.push(node));
  const clones = new Map(originals.map((node, index) => [node, copies[index]]));
  for (const node of originals) {
    if (!node.isSkinnedMesh) continue;
    const mesh = clones.get(node);
    mesh.skeleton = node.skeleton.clone();
    mesh.skeleton.bones = node.skeleton.bones.map(bone => clones.get(bone));
    mesh.bind(mesh.skeleton, node.bindMatrix);
    mesh.frustumCulled = false;
  }
  return copy;
}

export function createPigeonFlight(THREE, scene) {
  let asset, flock = [], elapsed = 0, generation = 0;
  const position = new THREE.Vector3();
  const next = new THREE.Vector3();
  const rotation = new THREE.Euler(0, 0, 0, 'YXZ');

  function load() {
    asset ??= new GLTFLoader().loadAsync('./assets/animals/dudecon-pigeon.glb').then(model => {
      const flap = model.animations.find(clip => clip.name === 'Flapping');
      const glide = model.animations.find(clip => clip.name === 'Gliding');
      if (!flap || !glide) throw new Error('Pigeon flight clips are missing');
      return { source: model.scene, flap, glide };
    }).catch(error => {
      asset = null;
      throw error;
    });
    return asset;
  }

  function clear() {
    generation++;
    elapsed = 0;
    for (const bird of flock) {
      bird.mixer.stopAllAction();
      bird.mixer.uncacheRoot(bird.model);
      bird.model.traverse(node => { if (node.isSkinnedMesh) node.skeleton.dispose(); });
      scene.remove(bird.root);
    }
    flock = [];
  }

  async function release() {
    const ticket = generation;
    const { source, flap, glide } = await load();
    if (ticket !== generation) return false;
    const group = flock.length / birdsPerFlock;
    const orbitOffset = ((group * .381966) % 1) * turn;
    const altitude = group === 0 ? 0 : .72 * Math.sin(group * 2.39996);
    for (let i = 0; i < birdsPerFlock; i++) {
      const model = cloneBird(source);
      const root = new THREE.Group();
      root.name = 'city-pigeon';
      root.add(model);
      root.scale.setScalar(.33 + .09 * ((i * 7) % 13) / 12);
      scene.add(root);
      const mixer = new THREE.AnimationMixer(model);
      const flapping = mixer.clipAction(flap).play();
      const gliding = mixer.clipAction(glide).play();
      const phase = (i * .381966 + group * .236068) % 1;
      flapping.time = phase * flap.duration;
      flapping.timeScale = 1.08 + phase * .52;
      gliding.time = phase * glide.duration;
      const column = (i % 5) - 2;
      const row = Math.floor(i / 5);
      const bird = { root, model, mixer, flapping, gliding, phase, orbitOffset,
        trail: column * .14 + row * .19,
        spread: (row - 1) * .56 + .20 * Math.sin(i * 2.4) + .32 * Math.sin(group * 1.7),
        height: altitude + .54 * Math.sin(i * 2.4) + .25 * column };
      flock.push(bird);
      updateBird(bird, 0);
    }
    return true;
  }

  function path(bird, time, out) {
    const a = 2.67 + bird.orbitOffset + time * .45 - bird.trail;
    const wobble = Math.sin(time * .84 + bird.phase * turn);
    return out.set(
      Math.cos(a) * (5.85 + bird.spread + wobble * .19),
      7.55 + bird.height + Math.sin(a * 2 + bird.phase) * .40 + wobble * .16,
      1.65 + Math.sin(a) * (3.40 + bird.spread * .62) + .35 * Math.sin(time * .24),
    );
  }

  function updateBird(bird, dt) {
    path(bird, elapsed, position);
    path(bird, elapsed + .045, next).sub(position);
    bird.root.position.copy(position);
    const pitch = Math.atan2(next.y, Math.hypot(next.x, next.z));
    const bank = -.34 + .10 * Math.sin(elapsed * 1.1 + bird.phase * turn);
    rotation.set(-pitch, Math.atan2(next.x, next.z), bank);
    bird.root.quaternion.setFromEuler(rotation);
    const cycle = (elapsed * .29 + bird.phase) % 1;
    const weight = THREE.MathUtils.smoothstep(cycle, .02, .13)
      * (1 - THREE.MathUtils.smoothstep(cycle, .59, .78));
    bird.flapping.setEffectiveWeight(weight);
    bird.gliding.setEffectiveWeight(1 - weight);
    bird.mixer.update(dt);
  }

  function update(dt) {
    elapsed += dt;
    for (const bird of flock) updateBird(bird, dt);
  }

  return { release, clear, update, get count() { return flock.length; } };
}
