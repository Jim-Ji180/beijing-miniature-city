// The supplied Miami aerial places continuous planted strips behind the
// sidewalks. Taller canopies punctuate a low, unbroken band of green.
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { createDetailedTree } from './detailed-tree.js?v=20';
import { createPlantedBedFoliage } from './city-turf.js?v=8';

// Each interval stops clear of a corner, landmark approach or transit stop.
const frontages = [
  { axis:'x', at:-2.49, width:.40, bands:[
    [-10.72,-7.43],[-6.17,-4.16],[-3.53,-2.14],
    [2.16,3.47],[4.16,6.20],[6.83,10.68],
  ] },
  { axis:'x', at:.295, width:.38, bands:[
    [-10.68,-6.06],[-4.71,-2.14],
    [2.18,3.54],[4.24,5.98],[8.23,10.68],
  ] },
  { axis:'z', at:-1.565, width:.226, bands:[
    [-8.30,-6.84],[-6.43,-4.52],[-4.18,-2.90],
    [.79,2.89],[3.25,5.22],[5.62,6.14],[6.58,8.26],
  ] },
  { axis:'z', at:1.585, width:.255, bands:[
    [-8.31,-7.54],[-7.20,-5.44],[-5.09,-2.93],
    [.77,3.24],[3.77,5.97],[6.58,8.26],
  ] },
];

const streetTrees = [
  [-9.13,-2.48,.205],[-3.10,-2.48,.20],
  [2.71,-2.49,.20],[5.75,-2.50,.205],[8.05,-2.48,.20],[10.15,-2.48,.20],
  [-9.07,.30,.21],[-7.06,.30,.21],[-3.35,.30,.215],
  [2.90,.29,.21],[5.19,.30,.19],[8.75,.29,.19],[10.19,.30,.20],
  [-1.56,-7.55,.18],[-1.56,-5.74,.17],[-1.56,-3.65,.17],
  [1.585,-6.33,.18],[1.585,-4.68,.17],
  [-1.564,1.66,.18],[-1.565,3.86,.17],[-1.56,5.90,.17],
  [1.585,1.51,.175],[1.585,2.98,.16],[1.585,4.29,.18],[1.585,5.68,.17],
];

export function createStreetVerges(T) {
  const group=new T.Group();
  group.name='boulevard-green-belts';
  const lawn=new T.MeshStandardMaterial({color:'#748e48',roughness:1});
  const stone=new T.MeshStandardMaterial({color:'#c2b7a1',roughness:.95});
  const ornamental=new T.MeshStandardMaterial({color:'#fff',roughness:1});
  const grate=new T.MeshStandardMaterial({color:'#8c8f8f',roughness:.96});
  const grateSlot=new T.MeshStandardMaterial({color:'#666c71',roughness:1});
  const batches=new Map(), planting=[];
  const updateHeight=.079, terrainBottom=.034;

  function cityPoint(axis,x,t){
    return axis==='x'?[x,t]:[t,x];
  }

  function batch(geometry,material){
    if(!batches.has(material))batches.set(material,[]);
    batches.get(material).push(geometry);
  }

  function box(size,position,material) {
    batch(new T.BoxGeometry(...size).translate(...position),material);
  }

  function makeBelt({axis,at,width},start,end){
    const length=end-start;
    const center=(start+end)/2;
    const horizontal=axis==='x';
    const [x,z]=cityPoint(axis,center,at);
    const [w,d]=horizontal?[length,width]:[width,length];
    const coping=.015;
    box([w-coping,.010,d-coping],[x,updateHeight-.005,z],lawn);
    for(const side of [-1,1]){
      const [sx,sz]=cityPoint(axis,center,at+side*(width-coping)*.5);
      box(horizontal?[length,.048,coping]:[coping,.048,length],
        [sx,terrainBottom+.024,sz],stone);
      const [ex,ez]=cityPoint(axis,center+side*(length-coping)*.5,at);
      box(horizontal?[coping,.048,width-coping*2]:[width-coping*2,.048,coping],
        [ex,terrainBottom+.024,ez],stone);
    }

    const shoulder=axis==='x'?.037:.010;
    const roadSide=axis==='x'?Math.sign(-1.15-at):-Math.sign(at);
    const [px,pz]=cityPoint(axis,center,at+roadSide*shoulder);
    const plantWidth=width-shoulder*2-.038;
    planting.push({x:px,z:pz,w:horizontal?length-.06:plantWidth,d:horizontal?plantWidth:length-.06,y:updateHeight});

    // Low hedges are drawn in a few grouped stretches so the turf remains
    // visible. No tall object or fence interrupts the public sidewalk.
    const eligible=length>=.85;
    const hedgeLanes=horizontal&&length>2?[0,1]:[0];
    if(!eligible)return;
    for(const row of hedgeLanes){
      let first=start+.135+(row===1?.13:0);
      while(first<end-.19){
        const last=Math.min(end-.14,first+.48+.2*hash(first+at*17));
        for(let s=first;s<=last;s+=.067+.015*hash(s+at)) {
          const variation=hash(s*29.4+at*9.17+row*4.27);
          const shift=roadSide*(width*.255-row*.12)+(variation-.5)*.017;
          const [hx,hz]=cityPoint(axis,s,at+shift);
          const crown=streetTrees.some(([tx,tz])=>Math.hypot(hx-tx,hz-tz)<.066);
          if(!crown) hedgeInstances.push([hx,hz,variation,axis]);
        }
        first=last+.19;
      }
    }
  }

  function hash(value){
    const n=Math.sin(value*53.461)*42976.52;
    return n-Math.floor(n);
  }

  // Storm drains sit in the asphalt gutter under the straight curb edge.
  // The bars are flush and transverse to the road axis.
  function drainage(axis,along,at){
    const [x,z]=cityPoint(axis,along,at);
    const horizontal=axis==='x';
    box(horizontal?[.102,.0022,.053]:[.053,.0022,.102],[x,.0430,z],grate);
    for(let i=-3;i<=3;i++){
      const [sx,sz]=cityPoint(axis,along+i*.012,at);
      box(horizontal?[.0044,.001,.036]:[.036,.001,.0044],[sx,.0440,sz],grateSlot);
    }
  }
  const hedgeInstances=[];
  for(const edge of frontages)for(const [start,end] of edge.bands){
    if(end-start>.24)makeBelt(edge,start,end);
  }
  for(const x of [-10.04,-7.95,-5.95,-4.51,-2.44,2.44,4.75,6.23,8.86,10.04]){
    drainage('x',x,-1.785);
    if(Math.abs(x+5.36)>.56&&Math.abs(x-6.65)>.56)drainage('x',x,-.515);
  }
  for(const z of [-7.62,-5.75,-3.87,1.6,3.75,5.84,7.84]){
    drainage('z',z,-1.012);
    drainage('z',z,1.012);
  }

  for(const [material,geometries] of batches){
    const mesh=new T.Mesh(mergeGeometries(geometries),material);
    geometries.forEach(geometry=>geometry.dispose());
    mesh.name=material===lawn?'verge-turf':material===stone?'low-stone-verge-curbing':'flush-drainage-detail';
    mesh.userData.cityTurf=material===lawn;
    mesh.receiveShadow=true;
    group.add(mesh);
  }

  // Two low overlapping masses per shrub make up a clipped canopy.
  const crown=new T.IcosahedronGeometry(1,2);
  const position=crown.getAttribute('position');
  for(let i=0;i<position.count;i++){
    const [x,y,z]=[position.getX(i),position.getY(i),position.getZ(i)];
    const k=1+.09*Math.sin(x*7+y*5)*Math.cos(y*7-z*6)+.071*Math.sin(z*12+y*8);
    position.setXYZ(i,x*k,y*k,z*k);
  }
  const top=crown.clone().scale(.78,.69,.82).translate(0,.43,-.07);
  crown.scale(1,.72,1).translate(0,-.14,0);
  const geometry=mergeGeometries([crown,top]);
  crown.dispose();
  top.dispose();
  const hedges=new T.InstancedMesh(geometry,ornamental,hedgeInstances.length);
  hedges.name='clipped-verge-shrubs';
  const palette=['#5b7c46','#668c4e','#708d51','#5e8748'].map(color=>new T.Color(color));
  const stamp=new T.Object3D();
  hedgeInstances.forEach(([x,z,t,axis],index)=>{
    const across=.039+t*.012;
    const along=.046+t*.024;
    stamp.position.set(x,updateHeight+.030+t*.008,z);
    stamp.rotation.y=(t-.5)*.62;
    stamp.scale.set(axis==='x'?along:across,.045+t*.018,axis==='z'?along:across);
    stamp.updateMatrix();
    hedges.setMatrixAt(index,stamp.matrix);
    hedges.setColorAt(index,palette[Math.floor(t*palette.length)]);
  });
  hedges.receiveShadow=true;
  group.add(hedges,createPlantedBedFoliage(T,planting));
  for(const [x,z,size] of streetTrees){
    const tree=createDetailedTree(T,x,z,size);
    tree.position.y=updateHeight;
    group.add(tree);
  }
  return group;
}
