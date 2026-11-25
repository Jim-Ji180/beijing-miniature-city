import { loadStreetVehicle } from './street-vehicle-models.js?v=6';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';

// World units, with the front of each model facing +Z.
export const vehicleSpecs = {
  sedan: { length: .55, speed: 1.12 },
  suv: { length: .59, speed: 1.10 },
  taxi: { length: .56, speed: 1.13 },
  'hatchback-sports': { length: .48, speed: 1.12 },
  van: { length: .64, speed: 1.03 },
  delivery: { length: .78, speed: .92 },
  bus: { length: 1.35, speed: .89 },
  pickup: { length: .64, speed: 1.03 },
  ambulance: { length: .68, speed: 1.02 },
  police: { length: .60, speed: 1.10 },
};

const textCache = new Map();
let fontReady;

function lettering(THREE, label, width, height, fg, bg, dots = false) {
  const key = [label,width,height,fg,bg,dots].join('|');
  if (textCache.has(key)) return textCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', {willReadFrequently: dots});
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0,0,width,height); }
  ctx.font = `700 ${height * .72}px VehicleSign, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  if (dots) {
    const mask = document.createElement('canvas');
    mask.width = width; mask.height = height;
    const ink = mask.getContext('2d', {willReadFrequently: true});
    ink.font = ctx.font; ink.textBaseline = 'middle'; ink.textAlign = 'center';
    ink.fillText(label,width/2,height*.53,width*.9);
    const {data} = ink.getImageData(0,0,width,height);
    for (let y=4;y<height-2;y+=4) for (let x=4;x<width-2;x+=4) {
      ctx.fillStyle = data[(y*width+x)*4+3]>100 ? fg : '#302316';
      ctx.beginPath(); ctx.arc(x,y,1.44,0,Math.PI*2); ctx.fill();
    }
  } else {
    ctx.fillStyle = fg;
    ctx.fillText(label,width/2,height*.53,width*.9);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({map,transparent: !bg,alphaTest: bg ? 0 : .35,toneMapped:false});
  textCache.set(key,material);
  return material;
}

let environment;
function vehicleEnvironment(THREE) {
  // Soft, elongated sky highlights make the curved paint and glazing readable at street level.
  if (environment) return environment;
  const canvas = document.createElement('canvas');
  canvas.width=256; canvas.height=128;
  const ctx=canvas.getContext('2d');
  const sky=ctx.createLinearGradient(0,0,0,128);
  for (const [t,c] of [[0,'#a4bfdb'],[.35,'#b7cfe1'],[.49,'#d5d9d6'],[.56,'#5c6164'],[1,'#292c32']]) sky.addColorStop(t,c);
  ctx.fillStyle=sky;ctx.fillRect(0,0,256,128);
  for (const x of [35,111,203]) {
    const light=ctx.createRadialGradient(x,29,2,x,29,29);
    light.addColorStop(0,'#fff6e6');light.addColorStop(1,'#fff6e600');
    ctx.save();ctx.translate(x,0);ctx.scale(1.45,1);ctx.translate(-x,0);
    ctx.fillStyle=light;ctx.fillRect(x-29,0,58,58);ctx.restore();
  }
  environment=new THREE.CanvasTexture(canvas);
  environment.mapping=THREE.EquirectangularReflectionMapping;
  environment.colorSpace=THREE.SRGBColorSpace;
  return environment;
}

export async function createCityVehicle(THREE, type) {
  if (['bus','taxi','police'].includes(type)) {
    fontReady ??= new FontFace('VehicleSign', 'url(./fonts/NotoSansSC-Vehicle-Bold.ttf)', {weight:'700'})
      .load().then(face=>document.fonts.add(face)).catch(()=>{});
    await fontReady;
  }
  const details = type==='bus'
    ? buildBus(THREE)
    : await loadStreetVehicle(THREE,type,(...args)=>lettering(THREE,...args),vehicleEnvironment(THREE));
  const {model}=details;
  const bounds = details.bounds??new THREE.Box3().setFromObject(model,true);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const scale = vehicleSpecs[type].length / size.z;
  const vehicle = new THREE.Group();
  model.scale.setScalar(scale);
  model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  vehicle.add(model);
  vehicle.updateMatrixWorld(true);
  const wheelContacts=(details.wheels??[]).map(wheel=>{
    const center=wheel.getWorldPosition(new THREE.Vector3());
    const size=new THREE.Box3().setFromObject(wheel).getSize(new THREE.Vector3());
    return {x:center.x,z:center.z,width:Math.max(.027,size.x*1.6),depth:size.y*.63};
  });
  return {
    model:vehicle,wheelContacts,width:size.x*scale,
    update(distance, stopping, time, night) { details.update(distance,stopping,time,night,scale); },
  };
}

function buildBus(T) {
  const model = new T.Group();
  const wheels = [];
  const solids = new Map();
  const enamel = vehicleEnvironment(T);
  const material = (color, roughness=.43, metalness=0) => new T.MeshStandardMaterial({color,roughness,metalness});
  const finish = color => new T.MeshPhysicalMaterial({color,roughness:.40,metalness:.09,clearcoat:.43,
    clearcoatRoughness:.27,envMap:enamel,envMapIntensity:.44});
  const glass = new T.MeshPhysicalMaterial({color:'#395462',roughness:.29,metalness:.16,clearcoat:.57,
    clearcoatRoughness:.31,envMap:enamel,envMapIntensity:.72,specularIntensity:.63});
  const rubber=material('#20242a',.91), trim=material('#262d35',.59), steel=material('#aeb9bf',.35,.32);
  const amber=material('#df9437',.37);
  const lamps = new T.MeshStandardMaterial({color:'#e8f2ff',emissive:'#b4d5ff',emissiveIntensity:.86,roughness:.27});
  const brake = new T.MeshStandardMaterial({color:'#9c1826',emissive:'#ee1934',emissiveIntensity:.36,roughness:.27});
  const w=.151;
  const paint=finish('#368aa5');

  function part(geometry, mat, x=0,y=0,z=0, parent=model, angle=0) {
    const mesh = new T.Mesh(geometry,mat);
    mesh.position.set(x,y,z); mesh.rotation.y=angle;
    parent.add(mesh);
    return mesh;
  }
  function solid(geometry, mat, x=0,y=0,z=0, yaw=0) {
    geometry.rotateY(yaw).translate(x,y,z);
    if(!solids.has(mat)) solids.set(mat,[]);
    solids.get(mat).push(geometry);
  }
  function shape2(w,h,r) {
    const s=new T.Shape(), x=-w/2,y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    return s;
  }
  function rounded(mat,x,y,z,a,b,c,r=.004,yaw=0) {
    const bevel=Math.min(r,a*.22,b*.22,c*.39);
    const shape=shape2(a-2*bevel,b-2*bevel,Math.min(r,(a-2*bevel)*.49,(b-2*bevel)*.49));
    const geometry=new T.ExtrudeGeometry(shape,{depth:c-2*bevel,steps:1,curveSegments:3,
      bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3});
    geometry.translate(0,0,-(c-2*bevel)/2);
    solid(geometry,mat,x,y,z,yaw);
  }
  function polygon(mat, points, x,y,z, yaw=0) {
    const shape=new T.Shape(points.map(([a,b])=>new T.Vector2(a,b)));
    solid(new T.ExtrudeGeometry(shape,{depth:.0025,steps:1,bevelEnabled:true,bevelSize:.0014,bevelThickness:.0014,bevelSegments:2}),mat,x,y,z,yaw);
  }
  function pipe(mat, points, radius) {
    solid(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),8,radius,5,false),mat);
  }
  function sign(label,x,y,z,width,height,yaw,fg,bg,dots=false) {
    const mat=lettering(T,label,256,Math.max(40,Math.round(256*height/width)),fg,bg,dots);
    part(new T.PlaneGeometry(width,height),mat,x,y,z,model,yaw);
  }

  const axles=[-.416,.362];
  function bodyAdvertisement(side,doors,yaw) {
    const left=-.635,right=.635,base=.060,top=.178;
    const width=1024,height=168;
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');
    const u=z=>.5-side*z/(right-left);
    const y=value=>height*(top-value)/(top-base);
    const paint=ctx.createLinearGradient(0,0,0,height);
    paint.addColorStop(0,'#aebdc0');paint.addColorStop(.73,'#69868f');paint.addColorStop(1,'#3983a1');
    ctx.fillStyle=paint;ctx.fillRect(0,0,width,height);
    const ink=ctx.createLinearGradient(0,0,width,height);
    ink.addColorStop(0,'#782d3d');ink.addColorStop(.57,'#a94e54');ink.addColorStop(1,'#9b3d46');
    ctx.fillStyle=ink;
    ctx.beginPath();
    ctx.moveTo(0,height*.17);ctx.bezierCurveTo(345,height*.08,727,height*.21,width,height*.07);
    ctx.lineTo(width,height*.70);ctx.bezierCurveTo(739,height*.72,387,height*.67,0,height*.91);
    ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(231,168,114,.89)';
    ctx.beginPath();ctx.moveTo(0,height*.91);ctx.bezierCurveTo(300,height*.79,575,height*.65,width,height*.64);
    ctx.lineTo(width,height*.69);ctx.bezierCurveTo(575,height*.72,278,height*.84,0,height*.97);ctx.fill();
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#fff0d4';
    ctx.font='700 62px VehicleSign, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.letterSpacing='11px';
    ctx.fillText('北京欢迎你',side<0?u(.088)*width:width*.50,height*.32,side<0?360:420);
    ctx.globalCompositeOperation='destination-out';
    for(const axle of axles){
      ctx.beginPath();
      ctx.ellipse(width*u(axle),y(.055),width*.075/(right-left),height*.078/(top-base),0,0,Math.PI*2);
      ctx.fill();
    }
    const map=new T.CanvasTexture(canvas);
    map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
    const wrap=new T.MeshStandardMaterial({map,alphaTest:.52,roughness:.48,metalness:.07});
    const edges=[left,...doors.flat(),right].sort((a,b)=>a-b);
    for(let index=0;index<edges.length-1;index++){
      const lo=edges[index],hi=edges[index+1],mid=(lo+hi)/2;
      const inDoor=doors.some(([doorLo,doorHi])=>mid>doorLo&&mid<doorHi);
      const boundaryInset=inDoor?.0028:0;
      const face=new T.PlaneGeometry(hi-lo-boundaryInset*2,top-base);
      const uv=face.attributes.uv;
      for(let corner=0;corner<uv.count;corner++){
        const z=mid-side*face.attributes.position.getX(corner);
        uv.setX(corner,u(z));
      }
      part(face,wrap,side*(inDoor?.1553:.1508),(top+base)/2,mid,model,yaw).receiveShadow=true;
    }
  }
  function bodyShell() {
    // Extrude the actual side elevation across the bus. The wheel openings
    // are cut into that elevation, so the tires sit inside the lower body.
    const side=new T.Shape();
    const low=.048, arch=.067, axleHeight=.057;
    side.moveTo(-.654,low);
    for(const z of axles) {
      side.lineTo(z-arch,low);
      side.lineTo(z-arch,axleHeight);
      side.absarc(z,axleHeight,arch,Math.PI,0,true);
      side.lineTo(z+arch,low);
    }
    side.lineTo(.646,low);
    side.quadraticCurveTo(.661,low,.661,.067);
    side.lineTo(.652,.323);
    side.quadraticCurveTo(.651,.342,.634,.342);
    side.lineTo(-.642,.342);
    side.quadraticCurveTo(-.657,.342,-.657,.326);
    side.closePath();
    const shell=new T.ExtrudeGeometry(side,{depth:.286,bevelSize:.007,bevelThickness:.007,
      bevelSegments:3,curveSegments:12,steps:1});
    shell.translate(0,0,-.143);
    shell.rotateY(-Math.PI/2);
    solid(shell,paint);
  }
  function wheel(x,z,r,wide) {
    const pivot=new T.Group();
    pivot.position.set(x,r,z);pivot.userData.radius=r;
    model.add(pivot);wheels.push(pivot);
    const tireProfile=[[0,-wide/2],[.76*r,-wide/2],[.93*r,-wide*.42],[r,-wide*.24],
      [r,wide*.24],[.93*r,wide*.42],[.76*r,wide/2],[0,wide/2]];
    const tire=new T.LatheGeometry(tireProfile.map(([a,b])=>new T.Vector2(a,b)),24);
    tire.rotateZ(Math.PI/2);
    const face=new T.CircleGeometry(r*.70,20);
    face.rotateY(Math.sign(x)*Math.PI/2);
    const cap=new T.CylinderGeometry(r*.25,r*.29,.004,12);
    cap.rotateZ(Math.PI/2);
    part(tire,rubber,0,0,0,pivot);
    part(face,steel,Math.sign(x)*(wide/2+.0008),0,0,pivot);
    part(cap,trim,Math.sign(x)*(wide/2+.002),0,0,pivot);
    const spokes=Array.from({length:5},(_,i)=>{
      const a=i*Math.PI*2/5;
      return new T.BoxGeometry(.002,r*.31,r*.09).rotateX(a)
        .translate(Math.sign(x)*(wide/2+.0015),Math.cos(a)*r*.49,Math.sin(a)*r*.49);
    });
    part(mergeGeometries(spokes),trim,0,0,0,pivot);
    spokes.forEach(geometry=>geometry.dispose());
  }
  function headlamps(z,y) {
    for (const side of [-1,1]) {
      const x=side*w*.65;
      const silhouette=[[side*-.035,-.004],[side*.016,-.012],[side*.035,.011],[side*.024,.017],[side*-.026,.008]];
      polygon(trim,silhouette,x,y,z,side*.15);
      const strip=[[side*-.028,.001,0],[0,.003,.002],[side*.026,.010,-.003]];
      pipe(lamps,strip.map(([a,b,c])=>[x+a,y+b,z+.004+c]),.0028);
      rounded(amber,x+side*.018,y-.013,z-.003,.012,.005,.008,.002);
    }
  }

  bodyShell();
  const panel=material('#75838a',.55);
  const glassBand=material('#242f35',.46);
  for(const side of [-1,1]) {
    const yaw=side*Math.PI/2;
    rounded(glassBand,side*.151,.239,-.003,1.276,.146,.004,.002,yaw);
    // Passenger doors share the window band and sit on the curb side.
    const doors=side<0?[[-.213,-.045],[.478,.631]]:[];
    const edges=[-.624,-.467,-.314,-.175,-.025,.132,.289,.451,.624];
    for(let i=0;i<edges.length-1;i++){
      const from=edges[i],to=edges[i+1];
      const visible=[[from,to]];
      for(const [a,b] of doors) {
        for(let j=visible.length-1;j>=0;j--){
          const [lo,hi]=visible[j];
          if(lo<b&&hi>a)visible.splice(j,1,...[[lo,Math.min(a,hi)],[Math.max(b,lo),hi]].filter(([x,y])=>y-x>.016));
        }
      }
      for(const [lo,hi] of visible)rounded(glass,side*.153,.242,(lo+hi)/2,hi-lo-.008,.111,.004,.002,yaw);
    }
    for(const [lo,hi] of doors){
      const z=(lo+hi)*.5;
      rounded(glassBand,side*.152,.200,z,hi-lo,.224,.005,.002,yaw);
      for(const offset of [-.038,.038])rounded(glass,side*.155,.237,z+offset,.065,.128,.004,.002,yaw);
    }
    // Follow the side panels and door recesses without covering the wheel wells.
    bodyAdvertisement(side,doors,yaw);
    for(const z of [-.562,-.129,.551])rounded(amber,side*.148,.082,z,.016,.009,.006,.002,yaw);
    for(const z of [-.558,.062,.512])rounded(trim,side*.151,.105,z,.036,.003,.003,.001,yaw);
    rounded(trim,side*.164,.289,.588,.041,.010,.020,.004);
    rounded(trim,side*.180,.278,.606,.020,.038,.027,.005);
    for(const z of axles)wheel(side*.130,z,.057,.035);
  }
  // Shallow, nearly upright fascia from the reference bus. The glazing and
  // the display share a broad black surround above the painted bumper.
  rounded(glassBand,0,.248,.657,.280,.161,.012,.007);
  rounded(glass,0,.235,.664,.260,.113,.006,.004);
  sign('1路',0,.307,.665,.228,.031,0,'#ffc16b','#151515',true);
  pipe(trim,[[-.082,.191,.668],[-.037,.195,.668],[.016,.207,.668]],.00125);
  pipe(trim,[[.010,.190,.668],[.062,.194,.668],[.111,.208,.668]],.00125);
  rounded(panel,0,.151,.660,.237,.019,.008,.003);
  rounded(trim,0,.077,.664,.265,.020,.013,.006);
  rounded(trim,0,.119,.665,.132,.008,.006,.002);
  rounded(amber,0,.099,.669,.052,.016,.003,.001);
  headlamps(.663,.132);
  rounded(glassBand,0,.244,-.658,.278,.127,.011,.006);
  rounded(glass,0,.249,-.665,.248,.089,.005,.004);
  sign('1路',0,.293,-.669,.112,.024,Math.PI,'#ffc16b','#151515',true);
  rounded(trim,0,.074,-.660,.264,.020,.010,.004);
  for(const side of [-1,1]){
    rounded(trim,side*.124,.126,-.658,.028,.064,.009,.005);
    rounded(brake,side*.124,.138,-.664,.013,.026,.004,.003);
    rounded(amber,side*.124,.115,-.664,.013,.009,.004,.002);
  }
  const roofCase=finish('#b9c4c9');
  rounded(roofCase,0,.350,-.131,.219,.025,.52,.008);
  for(let i=0;i<7;i++)rounded(trim,0,.363,-.28+i*.012,.100,.002,.004,.001);

  for(const [mat, geometries] of solids){
    const prepared=geometries.map(geometry=>{
      const g=geometry.index?geometry.toNonIndexed():geometry;
      g.deleteAttribute('uv');
      return g;
    });
    part(mergeGeometries(prepared),mat);
    prepared.forEach(geometry=>geometry.dispose());
    geometries.filter(geometry=>geometry.index).forEach(geometry=>geometry.dispose());
  }
  model.traverse(object=>{
    if(!object.isMesh||object.material.isMeshBasicMaterial)return;
    object.castShadow=true;object.receiveShadow=true;
    object.material.userData.vehicleFinish=true;
  });
  return {model,wheels,update(distance,stopping,time,night,scale) {
    for(const wheel of wheels)wheel.rotation.x+=distance/(wheel.userData.radius*scale);
    brake.emissiveIntensity=stopping?1.75:night?.68:.36;
    lamps.emissiveIntensity=night?1.65:.86;
  }};
}
