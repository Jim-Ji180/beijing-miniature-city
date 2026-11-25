// TinyRJ reference: park trees read as overlapping patches of canopy.
import {createDetailedTree} from './detailed-tree.js?v=20';
export function createAutumnGroves(T,{precinctPreview=false}={}){
 const group=new T.Group();group.name='clustered-autumn-gardens';let seed=918257;
 const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},trees=[];
 const exclusion=(x,z,rad)=>{
  // Temple south axis and the two seats must retain their full approach space.
  if(z>4.92&&z<7.86&&Math.abs(x-3.9)<.34+rad)return true;
  for(const [bx,bz]of [[2.62,5.90],[5.12,5.90]])if(Math.abs(x-bx)<.36+rad&&Math.abs(z-bz)<.20+rad)return true;
  return false;
 };
 const plant=(x,z,size,region)=>{if(exclusion(x,z,size*1.04))return;trees.push({x,z,size,region});};
 // Four staggered rows, clipped to the actual winding path. Crowns overlap
 // substantially across rows and columns instead of appearing as isolated trios.
 const strips=[[-4.80,-1.56,.4,.09],[1.53,6.30,1.3,.23],[7.12,10.48,2.0,.15]];
 strips.forEach(([x0,x1,phase,amp],region)=>{
  for(let row=0;row<4;row++)for(let xx=x0+.22+(row%2)*.105;xx<x1-.19;xx+=.178+r()*.071){
   const x=xx+(r()-.5)*.088;
   const t=(x-x0)/(x1-x0),wave=Math.sin(t*Math.PI*2+phase);
   const mid=7.59+amp*wave*Math.sin(t*Math.PI);
   const z=[6.995,7.225,7.975,8.205][row]+.040*Math.sin(t*16+row*1.55)+(r()-.5)*.070;
   const size=.134+r()*.071+.013*Math.cos(t*12+row);
   // The small crown radius, not just the root, clears the walking ribbon.
   if(Math.abs(z-mid)<.15+size*1.17+.025)continue;plant(x,z,size,region);
  }
  // Preserve the established tree poses when dropping the decorative shrub row.
  for(let x=x0+.14;x<x1-.13;x+=.17)for(const z of [6.91,8.27]){
   if(!exclusion(x,z,.09)){r();r();r();}
  }
 });
 // Dense side woods frame the temple, keeping the marble platform clear.
 for(const x of [1.84,1.99,5.81,5.97])for(let z=1.17;z<5.72;z+=.235)plant(x+(r()-.5)*.025,z+(r()-.5)*.045,.145+r()*.035,3);
 for(const z of [.99,1.24,5.76,6.12])for(let x=2.08;x<5.72;x+=.225){if(Math.abs(x-3.9)<.46)continue;plant(x+(r()-.5)*.04,z+(r()-.5)*.045,.15+r()*.045,3);}
 // Existing narrow northern verges remain street planting, not dense forest.
 for(const x of [-10.0,-7.5,-5.5,2.55,5.45,8.4,10.0])for(let j=0;j<3;j++)plant(x+(j-1)*.23,-2.48+(j===1?.025:-.025),.14+(j%2)*.025,4);
 // Larger bands of canopy sit behind openings for the paths and seats.
 const foregroundGroups=[
  [[.12,.15],[.46,.18],[.86,.148]],
  [[.12,.13],[.34,.108],[.69,.145],[.91,.113]],
  [[.12,.14],[.48,.175],[.88,.135]],
 ];
 function inForegroundGroup(x,region){const [x0,x1]=strips[region],u=(x-x0)/(x1-x0);return foregroundGroups[region].some(([center,radius])=>Math.abs(u-center)<radius);}
 function retain(t){
  if(t.region===4)return true;
  if(t.region===3 && t.x<2.22 && Math.abs(t.z-3.5)<.31)return false;
  if(t.region<3)return inForegroundGroup(t.x,t.region);
  const groups=t.x<2.08||t.x>5.72?[[1.48,.42],[2.61,.44],[3.85,.40],[5.14,.41]]:[[2.35,.34],[3.02,.35],[4.75,.32],[5.48,.33]];
  const coordinate=t.x<2.08||t.x>5.72?t.z:t.x;
  return groups.some(([center,radius])=>Math.abs(coordinate-center)<radius);
 }
 const inPreview=t=>precinctPreview&&t.region>=1&&t.region<=3;
 if(precinctPreview){
  const canopyGaps=[
   [2.47,7.00,.196,1],[2.70,8.19,.194,1],[5.12,7.06,.182,1],[5.63,8.12,.201,1],
   [7.49,7.03,.201,2],[8.06,8.15,.191,2],[8.61,7.05,.192,2],[9.46,8.10,.200,2],[10.07,7.06,.186,2],
   [5.92,2.08,.182,3],[5.91,2.96,.190,3],[5.92,4.52,.186,3],[5.89,5.32,.182,3],
  ];
  for(const [x,z,size,region] of canopyGaps){
   if(!trees.some(t=>retain(t)&&Math.hypot(x-t.x,z-t.z)<.127))plant(x,z,size,region);
  }
 }
 const plantedTrees=trees.filter(retain);
 const moss=new T.Color('#6b943d'),forest=new T.Color('#2c6b42');
 // Build all woodland wood/crowns as global batches. Geometry and materials
 // are shared with street trees; adding hundreds of trees does not add hundreds
 // of draw calls. Temporary per-tree groups never enter the scene.
 const batches=new Map(),matrix=new T.Matrix4(),world=new T.Matrix4(),color=new T.Color();
 for(const t of trees){
  // Consume the original pose sequence even for removed roots, preserving the
  // exact northern verge tree positions, sizes, rotations and proportions.
  const rotation=r()*Math.PI*2,stretch=t.region===4?1:1.04+r()*.40;
  if(!retain(t))continue;
  const tree=createDetailedTree(T,t.x,t.z,t.size);tree.position.y=.073;tree.rotation.y=rotation;tree.scale.y*=stretch;
  if(inPreview(t)){
   const crown=tree.children.find(child=>child.material?.isMeshToonMaterial);
   if(crown){
    const width=1.11+.13*(.5+.5*Math.sin(t.x*5.8+t.z*7.3));
    crown.scale.set(width,1.02,width);
   }
  }
  tree.updateMatrixWorld(true);tree.traverse(o=>{
  if(!o.isMesh)return;const key=o.geometry.uuid+'/'+o.material.uuid;if(!batches.has(key))batches.set(key,{geometry:o.geometry,material:o.material,castShadow:o.castShadow,matrices:[],colors:[]});const batch=batches.get(key),n=o.isInstancedMesh?o.count:1;
  for(let i=0;i<n;i++){if(o.isInstancedMesh){o.getMatrixAt(i,matrix);world.multiplyMatrices(o.matrixWorld,matrix);}else world.copy(o.matrixWorld);batch.matrices.push(world.clone());if(o.instanceColor){
   o.getColorAt(i,color);
   if(inPreview(t))color.lerp(Math.sin(t.x*5.8+t.z*7.3)>.24?moss:forest,.135);
  }else color.set('#ffffff');batch.colors.push(color.clone());}
 });}
 for(const b of batches.values()){const mesh=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,b.colors[i]);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.castShadow=b.castShadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
 group.userData.treeCount=plantedTrees.length;group.userData.shrubCount=0;group.userData.drawCalls=group.children.length;group.userData.plantedTrees=plantedTrees;group.userData.sourceTreeCount=trees.length;return group;
}
