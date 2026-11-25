// Human-scale stone, glazing and bronze storefronts, using the street wall
// and recessed entries visible in the Wireframe NY and winter-street references.
import { createOfficePigment, officeEnvelope } from './office-facades.js?v=11';

const resources=new WeakMap();
const shopGlazing=['#6b6b62','#62736b','#6a7170'];
function podiumMaterials(T){
  if(resources.has(T))return resources.get(T);
  const mat=(color,properties={})=>createOfficePigment(T,color,properties);
  const lobbyLight=mat('#e3c9a7',{emissive:'#ffd19f',emissiveIntensity:0});
  lobbyLight.userData.nightEmission=.69;
  const materials={
    geometry:new T.BoxGeometry(),lobbyLight,glazing:new Map(),
    displayPlane:new T.PlaneGeometry(1,1),
    pale:mat('#eae8dc'),warm:mat('#d9c4a1'),gray:mat('#bfc1b8'),
    mineral:mat('#d9d3bf'),
    opaqueFinish:mat('#ffffff'),
    metalFinish:mat('#ffffff'),
    color:{
      pale:new T.Color('#e1d7c4'),trim:new T.Color('#535b59'),
      bronze:new T.Color('#786d54'),floor:new T.Color('#a8a497'),
      dark:new T.Color('#4d5352'),inner:new T.Color('#8d8273'),
    },
  };
  resources.set(T,materials);
  return materials;
}

export function addOfficePodium(T,building,{w,d,h,seed=1,finish,tone}){
  const m=podiumMaterials(T);
  const tint=tone?officeEnvelope(T,0,tone).glass:shopGlazing[seed%shopGlazing.length];
  if(!m.glazing.has(tint)){
    m.glazing.set(tint,{
      door:createOfficePigment(T,tint,{transparent:true,opacity:.71,depthWrite:false}),
      display:createOfficePigment(T,tint),
    });
  }
  const glass=m.glazing.get(tint);
  const wall=finish==='ribbon'?m.warm:finish==='slab'?m.mineral:[m.warm,m.gray,m.pale][seed%3];
  const metal=seed%4===0?'bronze':'trim';
  const entryW=w*(seed%2===0?.48:.53);
  const openingHeight=h*.77;
  const depth=Math.min(.12,d*.20);
  const front=d/2;
  const rear=front-depth;
  const sideW=(w-entryW)/2;
  const revealDepth=Math.min(.018,sideW*.15,d*.08);
  const batches=new Map();
  const displayPanes=[];
  const instance=new T.Object3D();
  function part(finish,x,y,z,width,height,length){
    const material=finish==='glass'?glass.door:finish==='lobbyLight'?m.lobbyLight:
      finish==='trim'||finish==='bronze'?m.metalFinish:m.opaqueFinish;
    if(!batches.has(material))batches.set(material,[]);
    batches.get(material).push([x,y,z,width,height,length,m.color[finish]]);
  }
  function mass(x,y,z,width,height,length){
    const mesh=new T.Mesh(m.geometry,wall);
    mesh.position.set(x,y,z);mesh.scale.set(width,height,length);
    mesh.castShadow=true;mesh.receiveShadow=true;
    building.add(mesh);
  }
  // Make each wall as continuous bands and piers around the display openings.
  // The back of each shallow reveal meets the solid core of the podium.
  function displayWall(axis,face,sign,left,right,bottom,top,openings){
    const outerCenter=face-sign*revealDepth/2;
    const glassDepth=face-sign*revealDepth*.64;
    const frontWall=axis==='z';
    function wallStrip(from,to,y0,y1){
      const center=(from+to)/2,y=(y0+y1)/2,span=to-from,height=y1-y0;
      if(frontWall)mass(center,y,outerCenter,span,height,revealDepth);
      else mass(outerCenter,y,center,revealDepth,height,span);
    }
    wallStrip(left,right,0,bottom);
    wallStrip(left,right,top,h);
    let nextPier=left;
    for(const [center,width] of openings){
      const start=center-width/2;
      wallStrip(nextPier,start,bottom,top);
      nextPier=center+width/2;
      const y=(bottom+top)/2;
      const pane=frontWall?[center,y,glassDepth,0]:[glassDepth,y,center,sign*Math.PI/2];
      displayPanes.push([...pane,width+.0008,top-bottom+.0008]);
    }
    wallStrip(nextPier,right,bottom,top);
  }
  for(const side of [-1,1]){
    const center=side*(entryW+sideW)/2;
    mass(center-side*revealDepth/2,h/2,-revealDepth/2,sideW-revealDepth,h,d-revealDepth);
    displayWall('z',front,1,center-sideW/2,center+sideW/2,h*.185,h*.695,[[center,sideW*.57]]);
  }
  mass(0,h/2,-depth/2,entryW,h,d-depth);
  mass(0,(h+openingHeight)/2,rear+depth*.5,entryW,h-openingHeight,depth);
  part('floor',0,.010,rear+depth*.48,entryW,.020,depth*.96);
  part('dark',0,openingHeight-.009,rear+depth*.47,entryW*.95,.012,depth*.88);
  part('lobbyLight',0,openingHeight-.017,rear+depth*.54,entryW*.69,.007,.013);
  part('inner',0,openingHeight*.46,rear+.006,entryW*.91,openingHeight*.81,.012);
  part('dark',entryW*.161,openingHeight*.42,rear+.018,entryW*.25,openingHeight*.81,.013);
  part('floor',-entryW*.23,openingHeight*.13,rear+depth*.22,entryW*.21,openingHeight*.21,.044);
  part('pale',-entryW*.23,openingHeight*.245,rear+depth*.22,entryW*.24,.010,.050);

  const doorZ=rear+depth*.59;
  const frameY=openingHeight*.51;
  const doorH=openingHeight*.91;
  for(const edge of [-.477,0,.477])part(metal,entryW*edge,frameY,doorZ,.010,doorH,.013);
  for(const height of [.037,.72,.97])part(metal,0,openingHeight*height,doorZ,entryW*.95,.008,.013);
  for(const side of [-1,1]){
    part('glass',side*entryW*.232,frameY,doorZ,entryW*.45,doorH,.003);
    part('bronze',side*entryW*.065,openingHeight*.42,doorZ+.008,.006,.034,.007);
    const center=side*(entryW+sideW)/2;
    part(metal,center,h*.44,front-revealDepth*.35,.008,h*.51,revealDepth*.40);
    part('pale',center,h*.142,front+.002,sideW*.73,.012,.006);
    part(metal,side*(entryW*.50-.004),openingHeight*.51,front-.025,.010,openingHeight*.88,depth*.13);
  }
  const bayCount=Math.max(2,Math.round(d/.23));
  for(const side of [-1,1]){
    const bay=d/bayCount;
    const openings=[];
    for(let i=0;i<bayCount;i++){
      const z=(i+.5)*bay-d/2;
      const at=side*(w/2+.002);
      openings.push([z,bay*.59]);
      part(metal,side*(w/2-revealDepth*.35),h*.47,z,revealDepth*.40,h*.44,.006);
      part('pale',at,h*.141,z,.008,.012,bay*.70);
    }
    displayWall('x',side*w/2,side,-front,front-revealDepth,h*.25,h*.69,openings);
    part(metal,side*(w/2+.003),h*.78,0,.009,.012,d*.944);
  }
  part('pale',0,h*.834,front-.015,entryW*1.04,.019,depth*.82);
  part(metal,0,h*.800,front-.012,entryW*1.02,.009,depth*.82);
  part(metal,0,h*.786,-d*.50-.002,w*.944,.012,.009);
  for(const [material,transforms] of batches){
    const mesh=new T.InstancedMesh(m.geometry,material,transforms.length);
    mesh.name=material===glass.door?'office-lobby-glazing':'office-podium-finish';
    transforms.forEach(([x,y,z,width,height,length,color],i)=>{
      instance.position.set(x,y,z);instance.scale.set(width,height,length);
      instance.updateMatrix();mesh.setMatrixAt(i,instance.matrix);
      if(color)mesh.setColorAt(i,color);
    });
    mesh.receiveShadow=true;
    building.add(mesh);
  }
  const glassBays=new T.InstancedMesh(m.displayPlane,glass.display,displayPanes.length);
  glassBays.name='office-podium-display-glazing';
  for(const [index,[x,y,z,angle,width,height]] of displayPanes.entries()){
    instance.position.set(x,y,z);
    instance.rotation.y=angle;
    instance.scale.set(width,height,1);
    instance.updateMatrix();
    glassBays.setMatrixAt(index,instance.matrix);
  }
  glassBays.receiveShadow=true;
  building.add(glassBays);
}
