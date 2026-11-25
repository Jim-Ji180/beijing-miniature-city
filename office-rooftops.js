import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { createOfficePigment } from './office-facades.js?v=11';

const resources = new WeakMap();

function roofResources(T) {
  if (resources.has(T)) return resources.get(T);
  const shared = {
    box: new T.BoxGeometry(),
    cylinder: new T.CylinderGeometry(.5, .5, 1, 12),
    cone: new T.CylinderGeometry(.35, .5, 1, 12),
    dish: new T.LatheGeometry([
      new T.Vector2(.005, 0), new T.Vector2(.2, .025),
      new T.Vector2(.38, .10), new T.Vector2(.5, .20),
      new T.Vector2(.5, .24), new T.Vector2(.38, .14),
      new T.Vector2(.2, .065), new T.Vector2(.005, .04),
    ], 14),
    material: createOfficePigment(T,'#ffffff',{vertexColors:true}),
  };
  const pigment = shared.material.onBeforeCompile;
  shared.material.customProgramCacheKey = () => 'office-roof-illustration-v1';
  shared.material.onBeforeCompile = shader => {
    pigment(shader);
    shader.vertexShader = 'attribute float roofFinish; varying vec3 vRoofPosition; varying float vRoofFinish, vRoofTop;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nvRoofPosition = position; vRoofFinish = roofFinish; vRoofTop = max(normal.y,0.0);');
    shader.fragmentShader = 'varying vec3 vRoofPosition; varying float vRoofFinish, vRoofTop;\n' + shader.fragmentShader.replace(
      '#include <color_fragment>', `#include <color_fragment>
      vec2 cells = vRoofPosition.xz * (vRoofFinish>2.5 ? vec2(9.,7.5) : vec2(5.,4.));
      vec2 seamDistance = abs(fract(cells+.5)-.5);
      vec2 footprint = fwidth(cells);
      vec2 aa = clamp(footprint,vec2(.006),vec2(.22));
      vec2 joints = smoothstep(vec2(.482)-aa,vec2(.482)+aa,seamDistance);
      float coverage = 1.-smoothstep(.24,.82,max(footprint.x,footprint.y));
      float ink = max(joints.x,joints.y*.65)*coverage*vRoofTop;
      if (vRoofFinish>.5) diffuseColor.rgb *= 1.-ink*(vRoofFinish>2.5 ? .25 : .14);
      `);
  };
  resources.set(T, shared);
  return shared;
}

export function addOfficeRooftop(T, building, {x = 0, z = 0, y, w, d, seed, height, compact = false, finish}) {
  const shapes = roofResources(T);
  const parts = [], obj = new T.Object3D();
  let state = seed >>> 0;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const u = Math.min(w, d);
  const concrete = ['#f1e8d2','#d7dfdc','#e9d4ad','#f1ede1'][Math.floor(random()*4)];
  const randomFinish = (seed+Math.floor(random()*13))%3+1;
  const deckMaterial = finish ?? randomFinish;
  const tileTerrace = !compact && height<1.40 && (seed%5===0 || seed%5===3);
  const membrane = tileTerrace ? '#ca6744' : ['#899198','#a3a2a0','#f2e6c9'][deckMaterial-1];
  const frame = '#596361', metal = '#b8c3c1', dark = '#445055', light = '#f7f1e1';
  const capAccent = !tileTerrace && !compact && height<2.65
    ? seed%5<2 ? '#d9643b' : seed%5===2 ? '#819186' : null
    : null;
  const flip = random() > .5 ? 1 : -1;
  const plan = Math.floor(random() * 4);
  const point = (px, py, pz) => new T.Vector3(x + px * w * flip, y + py, z + pz * d);

  function stamp(shape, color, center, scale, quaternion, finish=0) {
    obj.position.copy(center);
    obj.scale.set(...scale);
    obj.quaternion.copy(quaternion);
    obj.updateMatrix();
    const geometry = shapes[shape].clone().applyMatrix4(obj.matrix);
    const rgb = new T.Color(color);
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) rgb.toArray(colors, i);
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    geometry.setAttribute('roofFinish',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(finish),1));
    parts.push(geometry);
  }

  const level = new T.Quaternion();
  function box(color, px, py, pz, sx, sy, sz, finish=0) {
    stamp('box', color, point(px, py, pz), [sx*w, sy, sz*d], level, finish);
  }
  function round(shape, color, px, py, pz, diameter, tall, rotation = level) {
    stamp(shape, color, point(px, py, pz), [diameter, tall, diameter], rotation);
  }
  function tube(color, a, b, gauge) {
    const start = point(...a), end = point(...b);
    const axis = end.clone().sub(start);
    const rotation = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), axis.clone().normalize());
    stamp('cylinder', color, start.lerp(end, .5), [gauge, axis.length(), gauge], rotation);
  }

  const slab = .012, roomH = Math.max(.059, Math.min(u*.28, .19));
  const roomX = plan % 2 ? -.14 : -.19;
  const roomZ = plan === 3 ? .05 : -.17;
  const roomW = [.32,.40,.24,.36][plan];
  const roomD = [.25,.20,.26,.33][plan];
  box(membrane, 0, slab/2, 0, .96, slab, .96, tileTerrace ? 3 : deckMaterial);
  const parapet=concrete, coping=light;
  for (const sign of [-1,1]) {
    box(parapet, sign*.46, .031, 0, .034, .062, .93);
    box(parapet, 0, .031, sign*.46, .93, .062, .034);
    box(dark, sign*.46, .058, 0, .037, .006, .94);
    box(dark, 0, .058, sign*.46, .94, .006, .037);
    box(coping, sign*.46, .064, 0, .038, .008, .94);
    box(coping, 0, .064, sign*.46, .94, .008, .038);
  }
  // A reinforced core overrun with a maintenance door, lintel and threshold.
  box(concrete, roomX, slab + roomH/2, roomZ, roomW, roomH, roomD);
  box(dark,roomX,slab+roomH+.001,roomZ,roomW+.022,.007,roomD+.022);
  box(capAccent??(plan===3?frame:light),roomX,slab+roomH+.011,roomZ,roomW+.019,.013,roomD+.019,capAccent ? 3 : 0);
  box(frame, roomX-.04, slab + roomH*.36, roomZ+roomD/2, .093, roomH*.72, .016);
  box(light, roomX-.04, slab+.008, roomZ+roomD/2+.025, .12, .016, .055);
  box(light, roomX-.04, slab+roomH*.75, roomZ+roomD/2+.016, .13, .01, .041);
  for (let i=0; i<4; i++) {
    box(frame, roomX+.073, slab+roomH*(.43+i*.08), roomZ+roomD/2+.009, .08, .004, .009);
  }

  function fanUnit(px, pz, wide, deep, tall, pairs) {
    box(frame, px, slab+.012, pz, wide+.026, .024, deep+.026);
    box(metal, px, slab+.024+tall/2, pz, wide, tall, deep);
    const top = slab+.024+tall;
    for (let i=0; i<pairs; i++) {
      const ax = px + ((i+.5)/pairs-.5)*wide;
      const size = Math.min(w*wide/pairs,d*deep)*.76;
      round('cylinder', frame, ax, top+.005, pz, size, .014);
      round('cylinder', light, ax, top+.014, pz, size*.28, .009);
      for (const angle of [0, Math.PI/3, Math.PI*2/3]) {
        const dx = Math.cos(angle)*size*.40/w, dz = Math.sin(angle)*size*.40/d;
        tube(metal, [ax-dx,top+.014,pz-dz], [ax+dx,top+.014,pz+dz], .004);
      }
    }
    for(let i=0;i<4;i++) box(frame,px,slab+.024+tall*(.20+i*.19),pz+deep/2+.004,wide*.82,.004,.008);
  }

  if (compact) {
    fanUnit(.20,-.12,.27,.24,.048,1);
  } else if (plan === 0) {
    fanUnit(.18,-.12,.37,.24,.065,2);
    fanUnit(.14,.18,.29,.17,.042,2);
  } else if (plan === 1) {
    // Mechanical spine with one compact cooling tower and offset exhaust stacks.
    fanUnit(.20,-.20,.23,.26,.10,1);
    box(frame,.23,.056,.14,.29,.085,.27);
    round('cone',metal,.23,.115,.14,u*.245,.043);
    round('cylinder',dark,.23,.14,.14,u*.16,.017);
    for(const px of [.097,.34]) {
      round('cylinder',frame,px,.100,.24,u*.062,.162);
      round('cone',light,px,.187,.24,u*.071,.014);
    }
  } else if (plan === 2) {
    fanUnit(.21,-.20,.24,.27,.055,1);
    fanUnit(.10,.17,.15,.16,.042,1);
    fanUnit(.30,.10,.15,.16,.042,1);
    // A photovoltaic row in the existing service strip. Its light grid
    // divides the blue surface into cells at rooftop viewing distance.
    box(frame,-.04,.021,.33,.34,.017,.14);
    box(light,-.04,.030,.33,.326,.004,.13);
    for (let column=0;column<5;column++) {
      for(let row=0;row<2;row++) {
        const blue=(column+row)%3===0?'#325b86':'#254466';
        box(blue,-.04+(column-2)*.062,.034,.33+(row-.5)*.058,.058,.004,.054);
      }
    }
  } else {
    // Long screened plant yard with a strip of service skylights.
    box(frame,.20,.082,-.13,.36,.135,.35);
    box(metal,.20,.145,-.13,.32,.006,.31);
    for(let i=0;i<7;i++)box(metal,.20,.04+i*.014,.05,.34,.006,.017);
    box(metal,.16,.04,.21,.31,.042,.14);
    for(let i=0;i<5;i++)box('#50696f',.05+i*.055,.064,.21,.042,.010,.105);
  }

  const pathStart = roomZ+roomD/2+.06;
  for(let p=pathStart;p<.39;p+=.075) box(concrete,roomX-.04,slab+.004,p,.105,.008,.061);
  if(!compact){
    // The drain sits low against the flashing and the repair differs from the field.
    box(deckMaterial===1?'#747c77':'#777e76',-.33,slab+.001,.24,.09,.002,.11,1);
    box(dark,-.36,slab+.003,-.34,.041,.006,.041);
    for (const offset of [-.012,0,.012]) box(metal,-.36+offset,slab+.006,-.34,.003,.003,.032);
  }
  if (!compact) {
    // Raised ductwork connects the plant room to the cooling equipment.
    const plenumZ = roomZ-.11;
    box(metal, -.005, slab+.045, plenumZ, .14,.048,.065);
    box(frame, .058, slab+.019, plenumZ, .038,.038,.062);
    box(metal, .061, slab+.045, (plenumZ-.13)/2, .052,.048,Math.abs(plenumZ+.13)+.06);
    if (plan===1 || plan===3) {
      const pipe='#98664d';
      tube(pipe,[.055,.037,-.33],[.37,.037,-.33],.012);
      tube(pipe,[.37,.037,-.33],[.37,.037,.29],.012);
      for(const p of [-.29,.005,.26])box(metal,.37,.022,p,.039,.017,.026);
    }
    for(const p of [-.31,.34]) {
      box(frame,p,slab+.003,.32,.052,.006,.052);
      for(const offset of [-.015,0,.015]) box(metal,p+offset,slab+.007,.32,.004,.004,.038);
    }
  }

  if (!compact && height > 2.3 && plan !== 2) {
    const px = plan === 3 ? -.31 : -.36, pz = plan === 3 ? -.31 : .25;
    const mast = Math.min(.37, u*.66)*(plan===1 ? 1 : .82);
    box(concrete,px,slab+.015,pz,.103,.03,.086);
    tube(frame,[px,.039,pz],[px,.052+mast,pz],.017);
    tube(metal,[px-.074,.039,pz],[px,.044+mast*.54,pz],.007);
    tube(metal,[px+.067,.039,pz],[px,.044+mast*.54,pz],.007);
    if (plan === 1) {
      for(const offset of [-.046,.046]) box(light,px+offset,.035+mast*.78,pz,.034,mast*.35,.016);
      tube(frame,[px-.065,.035+mast*.73,pz],[px+.065,.035+mast*.73,pz],.01);
    } else {
      for(const fraction of [.61,.82,.97]) {
        const at = .04+mast*fraction;
        tube(metal,[px-.07,at,pz],[px+.07,at,pz],.008);
        tube(frame,[px+.038,at,pz-.044],[px+.038,at,pz+.044],.006);
      }
    }
    if(plan===1){
      for(const side of [-1,1])tube(metal,[px+side*.041,.05,pz-.035],[px,.035+mast*.66,pz],.006);
    }
    round('cylinder','#934f45',px,.057+mast,pz,.026,.016);
  } else if (!compact && plan === 2 && u > .57) {
    const tilt = new T.Quaternion().setFromEuler(new T.Euler(.4,0,-.62*flip));
    tube(frame,[-.31,slab,.24],[-.31,.12,.24],.024);
    round('dish',light,-.31,.12,.24,u*.22,u*.22,tilt);
    tube(metal,[-.31,.12,.24],[-.27,.17,.25],.008);
  }

  const surface = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  const detail = new T.Mesh(surface, shapes.material);
  detail.name = 'office-rooftop-mechanical-equipment';
  detail.castShadow = true;
  detail.receiveShadow = true;
  building.add(detail);
}

// Find an exposed shoulder between two setback volumes and fit a service roof to it.
export function addOfficeTerrace(T, building, lower, upper, seed) {
  const left = lower.x-lower.w/2, right = lower.x+lower.w/2;
  const back = lower.z-lower.d/2, front = lower.z+lower.d/2;
  const shoulder = [
    [left, upper.x-upper.w/2, back, front],
    [upper.x+upper.w/2, right, back, front],
    [left, right, back, upper.z-upper.d/2],
    [left, right, upper.z+upper.d/2, front],
  ].sort((a,b) => Math.min(b[1]-b[0],b[3]-b[2])-Math.min(a[1]-a[0],a[3]-a[2]))[0];
  const [x1,x2,z1,z2] = shoulder;
  if (Math.min(x2-x1,z2-z1) < .22) return;
  addOfficeRooftop(T, building, {
    x:(x1+x2)/2, z:(z1+z2)/2, y:lower.y, w:(x2-x1)*.90, d:(z2-z1)*.86,
    seed, height:0, compact:true,
  });
}
