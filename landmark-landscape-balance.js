// TinyRJ canopy colour and massing on the existing northern planting strips.
import {createDetailedTree} from './detailed-tree.js?v=20';
export function createLandmarkLandscapeBalance(T){
 const g=new T.Group();g.name='north-landmark-landscape-balance';let seed=520199;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const inside=(x,z,p)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit};
 const loop=[[-2.09,.68],[.67,.68],[.67,-2.10],[1.91,-2.10],[1.91,1.92],[-2.09,1.92]];
 function cctvClear(x,z,radius){const c=Math.cos(-.60),s=Math.sin(-.60),dx=x-4.08,dz=z+5.48,lx=(c*dx-s*dz)/.84,lz=(s*dx+c*dz)/.84;if(inside(lx,lz,loop))return false;
  for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length],vx=b[0]-a[0],vz=b[1]-a[1],t=Math.max(0,Math.min(1,((lx-a[0])*vx+(lz-a[1])*vz)/(vx*vx+vz*vz)));if(Math.hypot(lx-a[0]-vx*t,lz-a[1]-vz*t)<(.13+radius)/.84)return false}return true;
 }
 // New lawn stays outside the already detailed ceremonial plaza and its paths.
 // Each strip is a deliberate extension of the existing green precinct, rather
 // than a scatter of patches painted onto the pavers.
 const patches=[
  [[-5.45,-7.82],[-1.76,-7.82],[-1.76,-6.98],[-2.46,-6.98],[-2.46,-7.04],[-5.15,-7.04],[-5.45,-7.12]],
  [[-2.46,-6.89],[-1.69,-6.89],[-1.69,-3.85],[-2.46,-3.85]],
  [[-5.48,-6.73],[-5.17,-6.73],[-5.17,-4.12],[-5.48,-4.12]],
  [[1.86,-8.18],[4.26,-8.18],[4.26,-7.96],[4.20,-7.93],[1.90,-7.93],[1.86,-7.99]],
 ];
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#667349';ctx.fillRect(0,0,256,256);
 for(let i=0;i<8500;i++){const x=random()*256,y=random()*256;ctx.strokeStyle=i%3===0?'rgba(184,192,113,.10)':'rgba(22,53,30,.09)';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(random()-.5)*1.5,y-1-random()*2);ctx.stroke()}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;
 const turf=new T.MeshStandardMaterial({map,roughness:1,side:T.DoubleSide});
 patches.forEach((poly,index)=>{const shape=new T.Shape(poly.map(([x,z])=>new T.Vector2(x,-z))),geo=new T.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/1.5,pos.getZ(i)/1.5);const mesh=new T.Mesh(geo,turf);mesh.position.y=index===3?.086:.081;mesh.receiveShadow=true;mesh.name='north-green-precinct-'+index;g.add(mesh)});
 const trees=[
  [-5.02,-7.31,.22,'zun'],[-4.62,-7.42,.27,'zun'],[-4.22,-7.29,.23,'zun'],[-3.46,-7.40,.25,'zun'],[-2.98,-7.29,.23,'zun'],[-2.39,-7.36,.22,'zun'],
  [-2.08,-6.57,.25,'zun'],[-1.99,-6.15,.22,'zun'],[-2.09,-5.42,.25,'zun'],[-1.99,-4.94,.23,'zun'],[-2.10,-4.20,.23,'zun'],
  [-5.31,-6.19,.18,'zun'],[-5.31,-5.70,.19,'zun'],[-5.31,-4.62,.18,'zun'],
  [2.30,-7.52,.23,'cctv'],[2.71,-7.54,.27,'cctv'],[3.09,-7.48,.24,'cctv'],[3.60,-7.53,.26,'cctv'],[3.90,-7.34,.21,'cctv'],
  [2.14,-6.80,.21,'cctv'],[2.48,-6.93,.26,'cctv'],[2.85,-6.83,.21,'cctv'],[6.50,-7.53,.18,'cctv'],[6.48,-7.14,.18,'cctv'],
  [2.50,-3.78,.20,'cctv'],[5.78,-3.83,.22,'cctv'],
 ];
 const kept=[],batches=new Map(),matrix=new T.Matrix4(),world=new T.Matrix4(),col=new T.Color();
 for(let ti=0;ti<trees.length;ti++){
  const [x,z,size,region]=trees[ti],radius=size*1.50;if(region==='cctv'&&!cctvClear(x,z,radius))continue;
  const tree=createDetailedTree(T,x,z,size);tree.position.y=.081;tree.rotation.y=random()*Math.PI*2;tree.scale.y*=1.06+(ti%3)*.05;
  tree.updateMatrixWorld(true);tree.traverse(mesh=>{if(!mesh.isMesh)return;const key=mesh.geometry.uuid+'/'+mesh.material.uuid;if(!batches.has(key))batches.set(key,{geometry:mesh.geometry,material:mesh.material,castShadow:mesh.castShadow,matrices:[],colors:[]});const batch=batches.get(key),count=mesh.isInstancedMesh?mesh.count:1;for(let i=0;i<count;i++){if(mesh.isInstancedMesh){mesh.getMatrixAt(i,matrix);world.multiplyMatrices(mesh.matrixWorld,matrix)}else world.copy(mesh.matrixWorld);batch.matrices.push(world.clone());if(mesh.instanceColor)mesh.getColorAt(i,col);else col.set('#ffffff');batch.colors.push(col.clone())}});kept.push({x,z,size,region,crownRadius:radius});
 }
 for(const b of batches.values()){const mesh=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,b.colors[i])});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.castShadow=b.castShadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();g.add(mesh)}
 g.userData={reference:'TinyRJ city and canopy screenshot',treeCount:kept.length,plantedTrees:kept,shrubCount:0,cctvTransform:{x:4.08,z:-5.48,rotation:-.60,scale:.84},cctvFootprintMargin:.13,entranceClearX:[3.30,4.30],unchangedEastWalkX:[6.88,7.10]};return g;
}
