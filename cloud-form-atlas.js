export const FORM_RESOLUTION = [44, 34, 32];
export const FORM_COUNT = 8;
export const SUN_STEPS = 24;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function hash(x, y, z) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise(x, y, z) {
  const a = Math.floor(x), b = Math.floor(y), c = Math.floor(z);
  const u = smooth(x - a), v = smooth(y - b), w = smooth(z - c);
  const lower = mix(mix(hash(a, b, c), hash(a + 1, b, c), u),
                    mix(hash(a, b + 1, c), hash(a + 1, b + 1, c), u), v);
  const upper = mix(mix(hash(a, b, c + 1), hash(a + 1, b, c + 1), u),
                    mix(hash(a, b + 1, c + 1), hash(a + 1, b + 1, c + 1), u), v);
  return mix(lower, upper, w);
}

function fbm(x, y, z) {
  return .59 * noise(x, y, z)
       + .27 * noise(x * 2.03 + 8.3, y * 2.03 + 3.7, z * 2.03 + 6.1)
       + .14 * noise(x * 4.11 + 1.2, y * 4.11 + 5.4, z * 4.11 + 2.8);
}

export function createFormAtlas(light) {
  const [nx, ny, nz] = FORM_RESOLUTION;
  const slice = nx * ny;
  const formSize = slice * nz;
  const atlas = new Uint8Array(formSize * FORM_COUNT * 2);
  const data = new Uint8Array(formSize);

  function sampleCpu(x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x > nx - 1 || y > ny - 1 || z > nz - 1) return 0;
    const a = Math.floor(x), b = Math.floor(y), c = Math.floor(z);
    const u = x - a, v = y - b, w = z - c;
    const at = (i, j, k) => data[Math.min(nx - 1, i) + nx * Math.min(ny - 1, j) + slice * Math.min(nz - 1, k)] / 255;
    const lower = mix(mix(at(a, b, c), at(a + 1, b, c), u), mix(at(a, b + 1, c), at(a + 1, b + 1, c), u), v);
    const upper = mix(mix(at(a, b, c + 1), at(a + 1, b, c + 1), u), mix(at(a, b + 1, c + 1), at(a + 1, b + 1, c + 1), u), v);
    return mix(lower, upper, w);
  }

  const dx = light.x * (nx - 1) / 5.1;
  const dy = light.y * (ny - 1) / 2.85;
  const dz = light.z * (nz - 1) / 4.0;
  for (let form = 0; form < FORM_COUNT; form++) {
    const lean = hash(form + 11, 8, 2) - .5;
    const crest = hash(form + 9, 13, 5);
    const ridge = hash(form + 3, 15, 7) - .5;
    const lobes = [
      [lean * .12, -.055, -.015, .36 + crest * .06, .29, .34],
      [-.15 + lean * .18, .08 + crest * .025, ridge * .23, .23, .29 + crest * .06, .26],
      [.16 + lean * .08, -.065 + ridge * .13, .035, .23, .19 + crest * .06, .27],
      [lean * .40, .14, -.095, .15 + crest * .08, .19, .18 + crest * .06],
    ];
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const px = x / (nx - 1) - .5;
          const py = y / (ny - 1) - .5;
          const pz = z / (nz - 1) - .5;
          const warp = noise(px * 4 + 18, py * 4.1, pz * 4 + 7 + form) - .5;
          let envelope = -10;
          for (const [cx, cy, cz, rx, ry, rz] of lobes) {
            const ax = (px - cx + warp * .075) / rx;
            const ay = (py - cy + warp * .065) / ry;
            const az = (pz - cz + warp * .074) / rz;
            envelope = Math.max(envelope, 1 - Math.sqrt(ax * ax + ay * ay + az * az));
          }
          const broad = fbm(px * 5.4 + 11 + form * 3, py * 4.6 + 3, pz * 5.5 + 7);
          const fine = fbm(px * 15 + 27, py * 13 + 5 + form * 2, pz * 14 + 17);
          const shape = envelope + (broad - .5) * .82 - .095 - (1 - fine) * .13;
          const border = smooth(clamp((.5 - Math.max(Math.abs(px), Math.abs(py), Math.abs(pz))) * 13, 0, 1));
          const opacity = smooth(clamp(shape * 5.6, 0, 1)) * border;
          data[x + nx * y + slice * z] = Math.round(opacity * (.66 + .34 * fine) * 255);
        }
      }
    }
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const i = x + nx * y + slice * z;
          let optical = 0;
          if (data[i] > 0) {
            for (let j = 0; j < SUN_STEPS; j++) {
              const t = (j + .5) * .16;
              optical += sampleCpu(x + dx * t, y + dy * t, z + dz * t) * .16;
            }
          }
          const atlasIndex = (form * formSize + i) * 2;
          atlas[atlasIndex] = data[i];
          atlas[atlasIndex + 1] = Math.round(Math.exp(-optical * 2.5) * 255);
        }
      }
    }
  }

  return atlas;
}
