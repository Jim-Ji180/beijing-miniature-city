// Reference: oikofuge.com/tertiary-rainbows/ — broad landscape arc,
// continuous spectrum, soft scattering edges and fading feet.
const BANDS = ['#9872d9', '#647ddb', '#46b4e4', '#71cd82', '#f3e681', '#ffb36d', '#ef8580'];

export function createRainbow(T) {
  const group = new T.Group();
  group.name = 'Primary rainbow behind the skyline';
  group.position.set(-1.3, .4, -6.8);
  group.visible = false;

  const segments = 192;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const along = i / segments;
    const angle = Math.PI * along;
    for (let edge = 0; edge < 2; edge++) {
      const radialOffset = (edge - .5) * 2.9;
      positions.push(
        Math.cos(angle) * (10.7 + radialOffset),
        Math.sin(angle) * (5.8 + radialOffset * .84),
        0,
      );
      uvs.push(along, edge);
    }
    if (i > 0) {
      const corner = i * 2;
      indices.push(corner - 2, corner - 1, corner, corner, corner - 1, corner + 1);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const material = new T.ShaderMaterial({
    name: 'Soft spectral scattering',
    uniforms: {
      uBands: { value: BANDS.map(color => new T.Color(color)) },
      uStrength: { value: .78 },
      uNight: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    vertexShader: `
      varying vec2 vBow;
      void main() {
        vBow = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      varying vec2 vBow;
      uniform vec3 uBands[7];
      uniform float uStrength, uNight;

      void main() {
        float along = vBow.x;
        float across = vBow.y;
        float spectrum = clamp((across - .08) * 6.8, 0., 6.);
        vec3 color = uBands[0];
        for (int i = 0; i < 6; ++i) {
          color = mix(color, uBands[i + 1], smoothstep(float(i), float(i + 1), spectrum));
        }
        color = mix(color, vec3(.39, .48, .62), uNight * .68);
        float radial = smoothstep(0., .19, across) * (1. - smoothstep(.8, 1., across));
        float legs = smoothstep(0., .105, along) * (1. - smoothstep(.84, 1., along));
        float moisture = .74 + .26 * smoothstep(.14, .8, along);
        gl_FragColor = vec4(color, radial * legs * moisture * uStrength);
      }
    `,
  });
  const bow = new T.Mesh(geometry, material);
  bow.renderOrder = -2;
  group.add(bow);

  return {
    group,
    update(_time, { rainbow, night, sun }) {
      group.visible = Boolean(rainbow);
      material.uniforms.uStrength.value = night ? .20 : sun ? .78 : .58;
      material.uniforms.uNight.value = Number(Boolean(night));
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
