import { addOfficePodium } from './office-podium.js?v=8';
import { officeEnvelope, addOfficeFacade, createOfficePigment } from './office-facades.js?v=11';
import { addOfficeRooftop, addOfficeTerrace } from './office-rooftops.js?v=10';

const cache = new WeakMap();
function materials(T) {
  if (cache.has(T)) return cache.get(T);
  const surface = color => createOfficePigment(T,color);
  const result = {
    box: new T.BoxGeometry(),
    pane: new T.PlaneGeometry(),
    limestone: surface('#e9d9bb'),
    roof: surface('#a6a5a0'),
    shadowJoint: surface('#798899'),
    warmLine: new T.LineBasicMaterial({color: '#e2c4a6', transparent: true, opacity: .49}),
    slateLine: new T.LineBasicMaterial({color: '#aab7af', transparent: true, opacity: .46}),
    white: surface('#f1eee3'),
    clay: surface('#ab6b51'),
    balcony: surface('#e8e2d4'),
    balconyScreen: surface('#91abb1'),
    balconyMullion: new T.LineBasicMaterial({color:'#b8cbd0',transparent:true,opacity:.26,depthWrite:false}),
    planter: surface('#cbbf9f'),
    planting: surface('#648452'),
    foliage: new T.IcosahedronGeometry(1,1),
  };
  cache.set(T, result);
  return result;
}

function edgeSpans(loop) {
  return loop.map((a, i) => [a, loop[(i + 1) % loop.length]]);
}

function wallOffset(loop, distance) {
  function outward(a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    return [dz / length, -dx / length];
  }
  return loop.map((point, i) => {
    const before = outward(loop[(i + loop.length - 1) % loop.length], point);
    const after = outward(point, loop[(i + 1) % loop.length]);
    const scale = distance / Math.max(.55, 1 + before[0] * after[0] + before[1] * after[1]);
    return [point[0] + (before[0] + after[0]) * scale, point[1] + (before[1] + after[1]) * scale];
  });
}

function outlineGeometry(T, loop, height) {
  const path = new T.Shape();
  for (const [i, [x, z]] of loop.entries()) {
    if (i === 0) path.moveTo(x, -z);
    else path.lineTo(x, -z);
  }
  path.closePath();
  const geometry = new T.ExtrudeGeometry(path, {depth: height, bevelEnabled: false, steps: 1});
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function outlineSolid(T, group, loop, bottom, height, material, capMaterial = material) {
  const geometry = outlineGeometry(T, loop, height);
  const mesh = new T.Mesh(geometry, [capMaterial, material]);
  mesh.position.y = bottom;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function wrappedFacade(T, group, loop, bottom, top, lineMaterial, pierMaterial, boxGeometry) {
  const spans = edgeSpans(loop);
  const rows = Math.round((top - bottom) / .113);
  const points = [];
  const piers = [];
  for (const [[x, z], [nx, nz]] of spans) {
    const dx = nx - x, dz = nz - z;
    const length = Math.hypot(dx, dz);
    const ox = .004 * dz / length, oz = -.004 * dx / length;
    const bays = Math.max(1, Math.round(length / .062));
    for (let i = 0; i < bays; i++) {
      const u = i / bays, xx = x + dx * u + ox, zz = z + dz * u + oz;
      points.push(xx, bottom + .006, zz, xx, top - .009, zz);
    }
    for (let i = 1; i < rows; i++) {
      const y = bottom + (top - bottom) * i / rows;
      points.push(x + ox, y, z + oz, nx + ox, y, nz + oz);
    }
    if (pierMaterial && length > .043) {
      const u = .12;
      piers.push([x + dx * u + ox, z + dz * u + oz, Math.atan2(-dz, dx)]);
    }
  }
  const lineGeometry = new T.BufferGeometry();
  lineGeometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  group.add(new T.LineSegments(lineGeometry, lineMaterial));
  if (piers.length) {
    const matrix = new T.Object3D();
    const mesh = new T.InstancedMesh(boxGeometry, pierMaterial, piers.length);
    for (const [i, [x, z, angle]] of piers.entries()) {
      matrix.position.set(x, (bottom + top) / 2, z);
      matrix.rotation.y = angle;
      matrix.scale.set(.013, top - bottom - .022, .014);
      matrix.updateMatrix();
      mesh.setMatrixAt(i, matrix.matrix);
    }
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

function ribbonLoop(w, d, bend, sweep) {
  const loop = [];
  const count = 12;
  for (const side of [-1, 1]) {
    for (let i = 0; i <= count; i++) {
      const t = (side < 0 ? i : count - i) / count * 2 - 1;
      const x = w * (.47 * t);
      const z = d * (bend * (t * t - .66) + sweep * t + side * .20);
      loop.push([x, z]);
    }
  }
  return loop;
}

function cornerCut(w, d) {
  return [
    [-.47*w,-.43*d], [.12*w,-.43*d], [.45*w,-.19*d], [.45*w,.29*d],
    [.32*w,.43*d], [-.36*w,.43*d], [-.47*w,.29*d],
  ];
}

// The Miami reference shows both crescent balcony fronts and rounded sail-shaped
// towers. These footprints also shape the continuous glass and each balcony.
function balconyContour(w, d, sign, sail, x, z) {
  const contour = [];
  const count = 18;
  for (const side of [-1, 1]) {
    for (let i=0; i<=count; i++) {
      const t = (side < 0 ? i : count-i)*2/count-1;
      const arch = Math.sqrt(1-.92*t*t);
      const bend = sail ? .103*t-.075*t*t : .25*(t*t-.6);
      const depth = sail ? .375-.145*t : .305;
      contour.push([x+w*.46*t*sign, z+d*(bend+side*depth*arch)*sign]);
    }
  }
  return contour;
}

function repeatAtStoreys(T,group,{geometry,material,name,bottom,storey,count}) {
  const mesh = new T.InstancedMesh(geometry, material, count);
  const transform = new T.Matrix4();
  for(let i=0;i<count;i++) {
    transform.makeTranslation(0, bottom + i*storey, 0);
    mesh.setMatrixAt(i, transform);
  }
  mesh.name = name;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function balconyRailGeometry(T, contour) {
  const vertices = [], indices = [];
  for(const [[x,z],[nx,nz]] of edgeSpans(contour)){
    const at=vertices.length/3;
    vertices.push(x,0,z,x,.024,z,nx,0,nz,nx,.024,nz);
    indices.push(at,at+1,at+2,at+2,at+1,at+3);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function facetedOfficeTier(T, group, loop, bottom, top, envelope, seed, m) {
  const batches = new Map();
  const floors = Math.max(2, Math.round((top-bottom)/envelope.story));
  const floorH = (top-bottom)/floors;
  for (const [[x,z],[nx,nz]] of edgeSpans(loop)) {
    const dx=nx-x, dz=nz-z, length=Math.hypot(dx,dz);
    const vx=dx/length, vz=dz/length;
    const facing=Math.atan2(vz,-vx);
    const bays = Math.max(1, Math.round((length-.025)/envelope.bay));
    const bay = (length-.018)/bays, paneW = bay * envelope.coverage;
    const wallDepth=.010, inset=.005;
    const add = (material,from,to,low,high,normalOffset,depth=0) => {
      if (to <= from || high <= low) return;
      const along=(from+to)*.5;
      const stamp=[x+vx*along+vz*normalOffset,(low+high)*.5,z+vz*along-vx*normalOffset,
        to-from,high-low,depth,facing];
      if (!batches.has(material)) batches.set(material,[]);
      batches.get(material).push(stamp);
    };
    const wall = (from,to,low,high) => add(envelope.cladding,from,to,low,high,-wallDepth*.5,wallDepth);
    for (let floor=0; floor<floors; floor++) {
      const y=bottom+floor*floorH, paneLow=y+floorH*.19, paneHigh=y+floorH*.81;
      wall(0,length,y,paneLow);
      wall(0,length,paneHigh,y+floorH);
      let previous=0;
      for (let j=0; j<bays; j++) {
        const center=.009+(j+.5)*bay, left=center-paneW*.5, right=center+paneW*.5;
        wall(previous,left,paneLow,paneHigh);
        const glass=(floor*13+j*9+seed)%37===0 ? envelope.lit : envelope.glaze;
        add(glass,left,right,paneLow,paneHigh,-inset);
        previous=right;
      }
      wall(previous,length,paneLow,paneHigh);
    }
  }
  const transform = new T.Object3D();
  for (const [material,stamps] of batches) {
    const solid=material===envelope.cladding;
    const batch=new T.InstancedMesh(solid?m.box:m.pane,material,stamps.length);
    batch.name=solid?'office-faceted-masonry':'office-recessed-window';
    if (!solid) material.shadowSide=T.DoubleSide;
    stamps.forEach(([x,y,z,w,h,d,turn],i)=>{
      transform.position.set(x,y,z);
      transform.rotation.y=turn;
      transform.scale.set(w,h,solid?d:1);
      transform.updateMatrix();
      batch.setMatrixAt(i,transform.matrix);
    });
    batch.castShadow=batch.receiveShadow=true;
    group.add(batch);
  }
  outlineSolid(T,group,loop,bottom,.008,envelope.cladding);
  outlineSolid(T,group,loop,top-.011,.025,envelope.rail,m.roof);
}

export function createOfficeMassing(T, spec) {
  const {form, w, d, h} = spec;
  const seed = spec.seed ?? 317 + (spec.design ?? 0) * 791;
  const group = new T.Group(), m = materials(T);
  group.name = 'office-massing-' + form;
  const podium = Math.min(.24, h * .24);
  const envelope = officeEnvelope(T, spec.facade??1, spec.tone);
  const sign = spec.facing??1;
  addOfficePodium(T, group, {w, d, h: podium, seed, finish: form, tone:spec.tone});

  function box(material, x, y, z, width, height, depth) {
    const mesh = new T.Mesh(m.box, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  function rectangularTier(envelope, x, z, width, depth, bottom, top) {
    addOfficeFacade(T, group, envelope, {x, z, w: width, d: depth, bottom, top, seed});
  }
  function roof(x, z, width, depth, y, compact = false, finish) {
    addOfficeRooftop(T, group, {
      x, z, w: width, d: depth, y, seed, height: h,
      compact, finish,
    });
  }

  if (form === 'angled-slab' || form === 'zigzag-corner') {
    const tall = form==='angled-slab';
    const outline = tall
      ? [[-.46,-.41],[.35,-.41],[.46,-.29],[.46,.15],[-.25,.43],[-.46,.30]]
      : [[-.46,-.43],[.39,-.43],[.46,-.28],[.46,.13],[.13,.43],[-.17,.31],[-.46,.40]];
    const loop=outline.map(([x,z])=>[x*w*sign,z*d*sign]);
    const masonry={...envelope,coverage:tall?.64:.72,bay:tall?.115:.148};
    const shoulder=tall?h:podium+(h-podium)*.69;
    facetedOfficeTier(T,group,loop,podium,shoulder,masonry,seed,m);
    if (tall) {
      roof(w*.025*sign,-d*.13*sign,w*.65,d*.48,h+.014,true,2);
    } else {
      const upper=loop.map(([x,z])=>[x*.72-.035*w*sign,z*.69-.087*d*sign]);
      facetedOfficeTier(T,group,upper,shoulder+.014,h,masonry,seed+3,m);
      roof(-w*.04*sign,-d*.13*sign,w*.50,d*.36,h+.014,true,3);
      box(envelope.rail,w*.095*sign,shoulder+.037,d*.22*sign,w*.23,.047,d*.025);
    }
  } else if (form === 'courtyard-wing') {
    const rearZ=-d*.23, frontZ=d*.205, coreX=w*.25*sign;
    const wingTop=podium+(h-podium)*.40;
    const lobbyTop=podium+(h-podium)*.21;
    rectangularTier(envelope,coreX,rearZ,w*.43,d*.45,podium,h);
    rectangularTier({...envelope,mode:'piers',coverage:.51},-w*.24*sign,rearZ,w*.46,d*.45,podium,wingTop);
    rectangularTier({...envelope,mode:'brick',coverage:.51},coreX,frontZ,w*.43,d*.36,podium,wingTop);
    box(envelope.cladding,w*.015*sign,(podium+wingTop)*.5,rearZ,w*.076,wingTop-podium,d*.37);
    box(envelope.cladding,coreX,(podium+wingTop)*.5,d*.01,w*.38,wingTop-podium,d*.062);
    box(envelope.rail,-w*.10*sign,lobbyTop,d*.15,w*.34,.027,d*.36);
    box(envelope.cladding,-w*.24*sign,(podium+lobbyTop)*.5,d*.29,.027,lobbyTop-podium,.033);
    roof(coreX,rearZ,w*.42,d*.44,h,true,2);
    roof(-w*.24*sign,rearZ,w*.42,d*.42,wingTop,true,3);
    box(m.planter,coreX,wingTop+.015,d*.24,w*.30,.029,d*.094);
    for (const t of [-.10,-.035,.04,.10]) {
      const shrub=new T.Mesh(m.foliage,m.planting);
      shrub.scale.set(.035,.033,.032);
      shrub.position.set(coreX+t*w,wingTop+.049,d*.24);
      shrub.receiveShadow=true;
      group.add(shrub);
    }
  } else if (form === 'split-spine') {
    const bodyTop=h-.15, shaftX=-w*.315*sign, bodyX=w*.105*sign;
    rectangularTier({...envelope,mode:'ribbons',coverage:.49},bodyX,-d*.045,w*.64,d*.86,podium,bodyTop);
    box(envelope.cladding,shaftX,(h+podium)*.5,-d*.11,w*.235,h-podium,d*.64);
    box(envelope.rail,shaftX,h+.018,-d*.11,w*.246,.036,d*.66);
    for (const z of [-.22,-.08,.099]) {
      box(envelope.rail,shaftX-w*.119*sign,podium+(h-podium)*.50,d*z,.013,(h-podium)*.93,.014);
    }
    box(envelope.rail,bodyX,bodyTop+.017,-d*.045,w*.655,.034,d*.87);
    roof(bodyX,-d*.045,w*.62,d*.83,bodyTop+.035,true,1);
  } else if (form === 'colonnade-block') {
    const shoulder=podium+(h-podium)*.83, shoulderD=d*.79;
    const screen={...envelope,mode:'ribbons',story:.130,coverage:.59};
    rectangularTier(screen,0,-d*.050,w*.89,shoulderD,podium,shoulder);
    const facadeZ=-d*.050+shoulderD*.5;
    const frameH=shoulder-podium;
    const columnW=Math.min(.051,w*.06);
    for (const x of [-.39,-.13,.13,.39]) {
      box(envelope.cladding,w*x,podium+frameH*.5,facadeZ+.016,columnW,frameH,.050);
    }
    box(envelope.rail,0,shoulder+.018,facadeZ+.007,w*.92,.038,.077);
    const backZ=-d*.15;
    rectangularTier({...envelope,mode:'stone-openings',coverage:.50},0,backZ,w*.72,d*.53,shoulder,h);
    roof(0,backZ,w*.66,d*.48,h,true,2);
  } else if (form === 'shouldered-tower') {
    const shoulder=podium+(h-podium)*.61, crown=h-.087;
    const towerX=w*.045*sign;
    const stone={...envelope,mode:'stone-openings',coverage:.47,story:.141};
    rectangularTier({...stone,mode:'ribbons',coverage:.42},0,-d*.023,w*.94,d*.92,podium,shoulder);
    rectangularTier(stone,towerX,-d*.025,w*.53,d*.70,shoulder,crown);
    box(envelope.cladding,towerX,crown+.034,-d*.025,w*.56,.068,d*.73);
    box(envelope.rail,towerX,h-.009,-d*.025,w*.587,.027,d*.76);
    roof(towerX,-d*.025,w*.54,d*.69,h+.006,true,1);
    addOfficeTerrace(T,group,{x:0,z:-d*.023,w:w*.94,d:d*.92,y:shoulder},
      {x:towerX,z:-d*.025,w:w*.53,d:d*.70},seed);
  } else if (form === 'slot-tower') {
    const notchBase=podium+(h-podium)*.42;
    const notchTop=podium+(h-podium)*.83;
    const width=w*.90,depth=d*.87;
    const frontWingX=w*.28*sign, frontWingW=w*.33;
    rectangularTier({...envelope,mode:'piers',coverage:.58},0,0,width,depth,podium,notchBase);
    rectangularTier({...envelope,mode:'ribbons',coverage:.52},0,-depth*.20,width,depth*.60,notchBase,notchTop);
    rectangularTier({...envelope,mode:'piers',coverage:.58},frontWingX,depth*.305,frontWingW,depth*.39,notchBase,notchTop);
    box(envelope.cladding,frontWingX,(notchBase+notchTop)*.5,depth*.103,frontWingW*.91,notchTop-notchBase,depth*.045);
    box(envelope.rail,0,notchBase+.012,0,width+.011,.023,depth+.011);
    box(envelope.rail,0,notchTop+.012,0,width+.011,.023,depth+.011);
    rectangularTier({...envelope,mode:'stone-openings',coverage:.46},-w*.04*sign,-d*.035,
      width*.92,depth*.86,notchTop+.023,h);
    roof(-w*.04*sign,-d*.035,width*.875,depth*.80,h,true,1);
  } else if (form === 'gable-office') {
    const storyTop=h-Math.min(.26,d*.22);
    rectangularTier({...envelope,mode:'brick',coverage:.51},0,0,w*.93,d*.85,podium,storyTop);
    for (let ridge=0; ridge<3; ridge++) {
      const front=d*.42-ridge*d*.28, back=front-d*.28;
      const rise=(h-storyTop)*(ridge===1?1:.86);
      const crossSection=new T.Shape();
      crossSection.moveTo(-front,0);crossSection.lineTo(-back,0);
      crossSection.lineTo(-back,rise*.20);crossSection.lineTo(-back-d*.072,rise);
      crossSection.lineTo(-front,0);crossSection.closePath();
      const geo=new T.ExtrudeGeometry(crossSection,{depth:w*.95,bevelEnabled:false}).rotateY(Math.PI*.5);
      const cap=new T.Mesh(geo,[envelope.cladding,ridge===1?envelope.rail:m.roof]);
      cap.position.set(-w*.475,storyTop,0);
      cap.castShadow=cap.receiveShadow=true;
      group.add(cap);
    }
  } else if (form === 'offset-terraces') {
    const tiers=[
      {x:0,z:0,w:w*.94,d:d*.93,y:podium+(h-podium)*.39},
      {x:-w*.11*sign,z:-d*.11,w:w*.64,d:d*.60,y:podium+(h-podium)*.73},
      {x:-w*.22*sign,z:-d*.13,w:w*.34,d:d*.46,y:h},
    ];
    let bottom=podium;
    for (const [i,tier] of tiers.entries()) {
      rectangularTier({...envelope,mode:i===0?'ribbons':'piers',coverage:i===0?.44:.58},
        tier.x,tier.z,tier.w,tier.d,bottom,tier.y);
      box(envelope.rail,tier.x,tier.y+.010,tier.z,tier.w+.012,.020,tier.d+.012);
      if (i<tiers.length-1) addOfficeTerrace(T,group,{...tier,y:tier.y+.020},tiers[i+1],seed+i);
      bottom=tier.y+.020;
    }
    const top=tiers.at(-1);
    roof(top.x,top.z,top.w*.94,top.d*.91,top.y+.020,true,2);
  } else if (form === 'inset-gallery' || form === 'civic-corner') {
    const civic=form==='civic-corner';
    const width=w*(civic?.87:.93), depth=d*(civic?.83:.91);
    const galleryTop=podium+(h-podium)*(civic?.28:.68);
    const galleryBase=civic?podium:podium+(h-podium)*.49;
    const rearDepth=depth*(civic?.58:.51), rearZ=-depth*.23;
    const bays={...envelope,mode:civic?'piers':'stone-openings',coverage:civic?.53:.64};
    if (!civic) rectangularTier(bays,0,0,width,depth,podium,galleryBase);
    rectangularTier(bays,0,rearZ,width,rearDepth,galleryBase,galleryTop);
    for (const side of [-1,1]){
      const x=side*width*.425;
      box(envelope.cladding,x,(galleryBase+galleryTop)*.5,depth*.23,width*.14,galleryTop-galleryBase,depth*.54);
      if (civic) box(envelope.rail,x,podium+(h-podium)*.31,depth*.495,width*.10,(h-podium)*.59,.019);
    }
    box(envelope.rail,0,galleryBase+.018,depth*.39,width*.78,.035,depth*.20);
    box(envelope.rail,0,galleryTop+.012,0,width+.010,.026,depth+.010);
    rectangularTier(bays,civic?w*.034*sign:0,0,width*(civic?.83:1),depth,galleryTop+.025,h);
    roof(civic?w*.034*sign:0,0,width*(civic?.79:.91),depth*.89,h,true,civic?3:1);
  } else if (form === 'crescent-balconies' || form === 'sail-balconies') {
    const sail = form === 'sail-balconies';
    const sign = spec.facing ?? (seed % 2 === 0 ? 1 : -1);
    const shoulder = podium + (h-podium)*(sail ? .71 : .39);
    const glass = envelope.glaze;
    const tiers = sail
      ? [[1,1,0,0,podium,shoulder],[.71,.80,-.103,-.048,shoulder,h]]
      : [[1,1,0,0,podium,shoulder],[.85,.89,-.055,-.035,shoulder,h]];

    for (const [sx,sz,ox,oz,bottom,top] of tiers) {
      const x=w*ox*sign, z=d*oz*sign;
      const contour=balconyContour(w*sx,d*sz,sign,sail,x,z);
      const shell=contour.map(([px,pz])=>[x+(px-x)*.932,z+(pz-z)*.77]);
      const floors=Math.max(3,Math.round((top-bottom)/(sail?.147:.132)));
      const floorHeight=(top-bottom)/floors;
      outlineSolid(T,group,shell,bottom,top-bottom,glass,envelope.shade);
      repeatAtStoreys(T,group,{geometry:outlineGeometry(T,contour,.014),material:m.balcony,
        name:'office-wraparound-balconies',bottom,storey:floorHeight,count:floors});
      outlineSolid(T,group,contour,top-.016,.019,m.balcony,m.roof);
      // Fit the railing directly to the balcony slab with a separate inner
      // curtain wall. Muted mullions keep the curve readable up close.
      const rail=contour.map(([px,pz])=>[x+(px-x)*.967,z+(pz-z)*.956]);
      repeatAtStoreys(T,group,{geometry:balconyRailGeometry(T,rail),material:m.balconyScreen,
        name:'office-balcony-rails',bottom:bottom+.014,storey:floorHeight,count:floors});
      const mullions=[];
      for (const [i,[mx,mz]] of wallOffset(shell,.0017).entries()){
        if(i%3===1)mullions.push(mx,bottom,mz,mx,top-.015,mz);
      }
      const lineGeometry=new T.BufferGeometry();
      lineGeometry.setAttribute('position',new T.Float32BufferAttribute(mullions,3));
      group.add(new T.LineSegments(lineGeometry,m.balconyMullion));
      if (top===h) roof(x,z,w*sx*.36,d*sz*.29,h+.003,true,3);
    }
  } else if (form === 'fin-loggia' || form === 'garden-podium') {
    const garden=form==='garden-podium';
    const lower=envelope;
    const upper=officeEnvelope(T, garden?5:3,spec.tone);
    const sign=spec.facing??1;
    const terrace=podium+(h-podium)*(garden?.55:.26);
    const towerW=w*(garden?.59:.80),towerD=d*(garden?.48:.77);
    const x=w*(garden?-.11:-.055)*sign,z=-d*(garden?.174:.061)*sign;

    rectangularTier(lower,0,0,w*.96,d*.92,podium,terrace);
    box(m.balcony,0,terrace-.001,0,w*.985,.028,d*.95);
    rectangularTier(upper,x,z,towerW,towerD,terrace+.013,h);
    box(m.white,x,h+.007,z,towerW+.014,.022,towerD+.010);
    roof(x,z,towerW*(garden?.84:.88),towerD*.90,h+.018,garden,3);

    if (garden) {
      const deckZ=d*.282*sign;
      box(m.white,0,terrace+.032,deckZ,w*.90,.038,d*.041);
      box(m.planter,0,terrace+.025,deckZ,w*.74,.023,d*.115);
      const shrub = new T.InstancedMesh(m.foliage,m.planting,8);
      const transform = new T.Object3D();
      const tint=new T.Color();
      for(let i=0;i<8;i++) {
        transform.position.set(w*((i-3.5)*.089+.007*Math.sin(i*7.3)),terrace+.052+(i%3)*.005,
          deckZ+d*.019*Math.cos(i*3.9));
        transform.rotation.y=i*.8;
        transform.scale.set(w*(.044+(i%3)*.006),.023+(i%4)*.005,d*(.034+(i%3)*.006));
        transform.updateMatrix();
        shrub.setMatrixAt(i,transform.matrix);
        const brightness=.84+(i%3)*.052;
        shrub.setColorAt(i,tint.setRGB(brightness,brightness,brightness));
      }
      shrub.receiveShadow=true;
      shrub.name='office-terrace-planting';
      group.add(shrub);
    } else {
      const finBase=terrace+.014, finEnd=h-.015;
      const finHeight=finEnd-finBase;
      for(const face of [-1,1])for(const fraction of [-.38,-.155,.17,.394]){
        box(m.balcony,x+towerW*fraction,finBase+finHeight*.5,z+face*(towerD*.5+.001),
          .019,finHeight,.027);
      }
      for (const fraction of [.30,.62]) {
        const level=finBase+finHeight*fraction;
        box(m.white,x,level,z,towerW+.032,.024,towerD+.046);
      }
    }
  } else if (form === 'ribbon') {
    const bend = seed % 3 === 0 ? -.25 : .30;
    const contour = ribbonLoop(w, d, bend, spec.showcase ? 0 : (seed % 5 - 2) * .022);
    const bodyBottom = podium + .040;
    const crown = Math.min(.095, h * .055);
    outlineSolid(T, group, contour, podium, .048, m.limestone);
    outlineSolid(T, group, contour, bodyBottom, h - bodyBottom - crown, envelope.glaze, m.roof);
    wrappedFacade(T, group, contour, bodyBottom, h - crown, spec.tone==='steel'?m.slateLine:m.warmLine, m.limestone, m.box);
    const coping = wallOffset(contour, .007);
    outlineSolid(T, group, coping, h - crown, crown, m.limestone, m.roof);
    const fascia = wallOffset(coping, .003);
    outlineSolid(T, group, fascia, h - crown + .012, .010, m.shadowJoint, m.roof);
    roof(0, -d * bend * .65, w * .36, d * .25, h, true, 1);
    if (w > 1) {
      for (const side of [-1, 1]) {
        box(m.shadowJoint, side*w*.29, h+.008, -.24*d*bend, w*.115, .016, d*.081);
        box(m.white, side*w*.29, h+.018, -.24*d*bend, w*.107, .008, d*.071);
      }
    }
  } else if (form === 'terrace') {
    const mainW = w * .92, mainD = d * .42, mainZ = -d * .235;
    rectangularTier(envelope, 0, mainZ, mainW, mainD, podium, h);
    box(m.limestone, 0, h + .014, mainZ, mainW, .028, mainD);
    roof(0, mainZ, mainW, mainD, h + .028, true, 3);
    const steps = w > .83 || seed % 2 ? [.81, .65, .48, .32] : [.79, .58, .37];
    const direction = seed % 4 === 2 ? -1 : 1;
    const wingW = w * .856 / steps.length, wingD = d * .48, wingZ = d * .192;
    for (const [i, fraction] of steps.entries()) {
      const x = direction * ((steps.length - 1) / 2 - i) * wingW;
      const top = podium + (h - podium) * fraction;
      rectangularTier(envelope, x, wingZ, wingW, wingD, podium + .014, top);
      box(m.white, x, top + .012, wingZ, wingW, .024, wingD);
      if (wingW > .21) roof(x, wingZ, wingW * .84, wingD * .78, top + .024, true, 3);
    }
  } else if (form === 'cut-glass') {
    const base = cornerCut(w, d);
    const inset = base.map(([x, z]) => [x * .79 - w * .049, z * .75 - d * .075]);
    const shoulder = podium + (h - podium) * .61;
    outlineSolid(T, group, base, podium, shoulder - podium, envelope.glaze, m.roof);
    wrappedFacade(T, group, base, podium, shoulder, m.slateLine);
    outlineSolid(T, group, wallOffset(base,.0025), shoulder-.010, .010, m.shadowJoint, m.roof);
    outlineSolid(T, group, base, shoulder, .028, m.limestone, m.roof);
    outlineSolid(T, group, inset, shoulder + .028, h - shoulder - .028, envelope.glaze, m.roof);
    wrappedFacade(T, group, inset, shoulder + .028, h, m.slateLine);
    outlineSolid(T, group, wallOffset(inset,.0025), h-.010, .010, m.shadowJoint, m.roof);
    outlineSolid(T, group, inset, h, .023, m.limestone, m.roof);
    roof(-w * .11, -d * .055, w * .51, d * .53, h + .023, false, 1);
  } else {
    rectangularTier(envelope, 0, -d * .025, w * .95, d * .88, podium, h);
    box(m.roof, 0, h + .021, -d * .025, w * .96, .024, d * .93);
    const canopyW = w * (seed % 2 ? .66 : .44);
    box(seed%3===1?envelope.mullion:m.clay, (w - canopyW) * .16, podium + .079, d * .445, canopyW, .031, d * .09);
    box(m.shadowJoint, (w - canopyW) * .16, podium + .060, d * .445, canopyW * .96, .011, d * .085);
    roof(w * .18, -d * .025, w * .55, d * .78, h + .033, false, 2);
  }
  return group;
}
