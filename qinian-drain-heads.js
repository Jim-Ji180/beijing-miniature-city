// The stone profile and incised details use photographs of the Hall of Prayer.
// Terrace sequence: cloud, phoenix and dragon. Each has a recessed outlet.
// https://www.bjnews.com.cn/detail/1784434400129176.html
// https://k.sina.cn/article_7062056909_p1a4ee6fcd00100kbsn.html
const profiles = {
  cloud: [[-.013,.017,.013,0],[.006,.017,.013,0],[.021,.018,.012,0],[.037,.018,.015,.000],[.049,.016,.014,.002],[.056,.013,.010,-.001],[.060,.008,.004,-.002],[.050,.006,.003,-.002],[.041,.004,.002,-.001]],
  phoenix: [[-.013,.016,.012,0],[.007,.016,.013,0],[.022,.017,.013,0],[.035,.017,.013,0],[.049,.015,.016,-.001],[.056,.013,.014,-.003],[.064,.011,.010,-.005],[.071,.006,.0035,-.006],[.062,.005,.002,-.006],[.052,.003,.0015,-.005]],
  dragon: [[-.013,.016,.013,0],[.005,.016,.014,0],[.022,.017,.015,.001],[.036,.018,.017,.002],[.046,.018,.017,.002],[.055,.017,.014,.001],[.062,.016,.012,-.001],[.069,.013,.008,-.003],[.072,.011,.005,-.003],[.060,.009,.0035,-.003],[.051,.005,.002,-.002]],
};

export function createQinianDrainHeads(T, tiers, stone) {
  const group = new T.Group();
  group.name = 'Qinian carved terrace drain heads';
  const anchor = new T.Object3D();
  const stoneCompile = stone.onBeforeCompile;
  const stoneKey = stone.customProgramCacheKey();
  tiers.forEach((tier, level) => {
    const count = [48, 44, 40][level];
    // Follow the existing baluster positions and leave the stair runs clear.
    const angles = Array.from({ length: count }, (_, i) => i * Math.PI * 2 / count)
      .filter(angle => Math.min(Math.abs(Math.sin(angle)), Math.abs(Math.cos(angle))) >= .38);
    const pattern = ['cloud', 'phoenix', 'dragon'][level];
    const material = stone.clone();
    material.name = `Qinian ${pattern} incised marble`;
    material.vertexColors = true;
    material.onBeforeCompile = function(shader, renderer) {
      stoneCompile.call(this,shader,renderer);
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= mix(.78, 1.04, smoothstep(.38,.56,texture2D(bumpMap,vBumpMapUv).r));
      `);
    };
    material.customProgramCacheKey = () => `${stoneKey}-qinian-drain-relief`;
    material.bumpMap = makeEngravings(T, pattern);
    material.bumpScale = .00215;
    const row = new T.InstancedMesh(sculpt(T, pattern), material, angles.length);
    row.name = `Qinian ${pattern} stone water spouts`;
    row.castShadow = row.receiveShadow = true;
    angles.forEach((angle, i) => {
      anchor.position.set(tier.r * Math.cos(angle), tier.top - .056, tier.r * Math.sin(angle));
      anchor.rotation.y = Math.PI / 2 - angle;
      anchor.scale.setScalar(.97 + .06 * (Math.sin(i * 2.27 + level) + 1) / 2);
      anchor.updateMatrix();
      row.setMatrixAt(i, anchor.matrix);
    });
    row.instanceMatrix.needsUpdate = true;
    group.add(row);
  });
  return group;
}

function smoothLobe(center, width, point) {
  const t = Math.abs(point - center) / width;
  return t < 1 ? Math.pow(1 - t * t, 2) : 0;
}

function sculpt(T, pattern) {
  // Loft the whole carved object, including its crest and the wet recess.
  // Rings curl inwards at the outlet instead of layering a second mesh.
  const outline = profiles[pattern], sections = [];
  for (let i = 0; i < outline.length - 1; i++) {
    const [a,b] = [outline[i],outline[i + 1]];
    const divisions = b[0] > a[0] ? Math.max(2, Math.ceil((b[0] - a[0]) / .0021)) : 3;
    for (let j = 0; j < divisions; j++) sections.push(a.map((n,k)=>T.MathUtils.lerp(n,b[k],j/divisions)));
  }
  sections.push(outline.at(-1));
  const nose = Math.max(...outline.map(section=>section[0]));
  const positions = [], colors = [], uvs = [], indices = [];
  const sides = 24, stride = sides + 1;
  let inner = false;
  for (let i = 0; i < sections.length; i++) {
    const [z, w, h, rise] = sections[i];
    if (i && z < sections[i - 1][0]) inner = true;
    for (let j = 0; j <= sides; j++) {
      const u = j / sides, angle = u * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle), y = Math.sin(angle);
      let carving = 0;
      if (!inner && y > 0) {
        if (pattern === 'phoenix') {
          // A fine scalloped feather comb is part of the profile.
          const crest = [.008,.016,.024,.032,.040].reduce((highest,center)=>
            Math.max(highest,smoothLobe(center,.0045,z)),0);
          carving = (.0011 + .0043*crest)*Math.pow(y, 12)*smoothLobe(.026,.034,z);
        } else if (pattern === 'dragon') {
          // Twin horns flow out of the forehead and return to the main stone.
          const horn = smoothLobe(.033,.013,z)*smoothLobe(.64,.34,Math.abs(x));
          const orbit = smoothLobe(.049,.014,z)*smoothLobe(.82,.38,Math.abs(x));
          carving = .0090*horn + .0035*orbit;
        }
      }
      positions.push(w * Math.sign(x) * Math.pow(Math.abs(x), .60), rise + h * Math.sign(y) * Math.pow(Math.abs(y), .67) + carving, z);
      const tone = inner ? .18 + .47 * smoothLobe(nose,.028,z) : .91 + .09 * (y + 1) / 2;
      colors.push(tone,tone,tone);
      uvs.push(u,.025+(z+.013)/.091);
      if (i === sections.length - 1 || j === sides) continue;
      const a = i * stride + j, b = a + 1;
      indices.push(a,b,a+stride,b,b+stride,a+stride);
    }
  }
  const end = positions.length/3;
  const [z, , , rise] = sections.at(-1);
  positions.push(0,rise,z); colors.push(.12,.12,.12); uvs.push(.50,.025+(z+.013)/.091);
  for (let j = 0; j < sides; j++) indices.push(end,end-stride+j,end-stride+j+1);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Average the two normals split by each texture seam on the underside.
  const normals = geometry.attributes.normal, normal = new T.Vector3();
  for (let i = 0; i < sections.length; i++) {
    const a = i * stride, b = a + sides;
    normal.set(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();
    normals.setXYZ(a,normal.x,normal.y,normal.z);
    normals.setXYZ(b,normal.x,normal.y,normal.z);
  }
  return geometry;
}

function makeEngravings(T, pattern) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle='#858585';
  ctx.fillRect(0,0,256,256);
  ctx.lineJoin = ctx.lineCap = 'round';
  const trace = (commands, gray, width) => {
    ctx.strokeStyle=gray;
    ctx.lineWidth=width;
    ctx.stroke(new Path2D(commands));
  };
  function carving(commands, width=3.4) {
    trace(commands,'#8f8f8f',width+2);
    trace(commands,'#676767',width*.66);
  }
  function curl(x,y,s) {
    ctx.save();
    ctx.translate(x,y);ctx.scale(s,s);
    carving('M-25 7C-18 12-10 11-8 4C-6-3-15-7-13-13C-10-20 0-21 6-15C9-11 9-5 6-2C2 2-2 0-2-4C-2-6 0-7 2-6',2.6);
    ctx.restore();
  }
  for (const side of [-1,1]) {
    ctx.save();
    ctx.setTransform(0,-1,side,0,side===1?64:192,249);
    if (pattern === 'cloud') {
      for (const [x,y,scale] of [[69,5,1.12],[103,-6,1.16],[128,10,1.23],[158,-5,1.18],[183,11,.94],[197,-9,.73]]) curl(x,y,scale);
      carving('M32-17C73-19 159-18 183-14',2.3);
      carving('M40-12C62-13 78-14 92-11',2.2);
    } else {
      curl(73,-5,1.1);
      curl(108,-6,1.08);
      curl(138,4,.84);
      for (let i = 0; i < 3; i++)
        carving(`M33 ${15-i*4}C67 ${16-i*4} 88 ${2-i*3} 123 ${3-i*3}Q145 ${1-i*3} 153 ${-2-i*3}`,2);
      carving('M155 6Q165 15 182 9L194 5Q183 12 167 8Z',2.7);
      trace('M175 8h5','#535353',2.4);
      if (pattern === 'dragon') {
        carving('M152 11Q165 28 185 16L197 12',3.3);
        carving('M201 1l6 3m3 1 4-1m-4-13Q189-19 169-12Q154-7 149-12',2.5);
      } else {
        carving('M101 10Q133 23 170 23M116 14Q133 27 154 28',2.4);
      }
    }
    ctx.restore();
  }
  const texture = new T.CanvasTexture(canvas);
  texture.anisotropy=4;
  return texture;
}
