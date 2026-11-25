// Ground finish follows the supplied Jakub city frames: quiet neutral paving,
// narrow darker pedestrian bands and clear planted/paved boundaries.
// It preserves all roads, landmark footprints and the protected historic quarter.
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { officeBlocks, districts } from './office-layout.js?v=10';
export function createPrecinctGroundFinish(T){
 const group=new T.Group();group.name='precinct-ground-finish';
 const texCache=new Map(),materialCache=new Map();
 function pavingTexture(w,d,base,mode='running'){
  const key=[base,mode].join('/');if(texCache.has(key))return texCache.get(key);
  const c=document.createElement('canvas');c.width=c.height=512;const q=c.getContext('2d');q.fillStyle=base;q.fillRect(0,0,512,512);
  let seed=87531;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const cols=12,rows=12,cw=512/cols,ch=512/rows;
  // Small, consistent stone modules with low-contrast variation; no white paper strokes.
  for(let row=0;row<rows;row++)for(let col=-1;col<cols+1;col++){
   const shift=mode==='running'&&row%2?cw*.5:0,x=col*cw+shift,y=row*ch;
   q.fillStyle=r()<.5?'rgba(255,255,255,.040)':'rgba(45,52,64,.028)';q.fillRect(x,y,cw,ch);
   q.strokeStyle='rgba(56,65,78,.115)';q.lineWidth=.8;q.strokeRect(x+.4,y+.4,cw-.8,ch-.8);
  }
  for(let i=0;i<5000;i++){q.fillStyle=i%2?'rgba(255,255,255,.018)':'rgba(18,28,44,.018)';q.fillRect(r()*512,r()*512,1,1)}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;texCache.set(key,t);return t;
 }
 function material(w,d,base,mode){const key=base+'/'+mode;if(!materialCache.has(key))materialCache.set(key,new T.MeshStandardMaterial({map:pavingTexture(w,d,base,mode),color:'#ffffff',roughness:.91,side:T.DoubleSide}));return materialCache.get(key);}
 function scaleUV(mesh,w,d){const uv=mesh.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/2.16,uv.getY(i)*d/1.44);uv.needsUpdate=true;}
 function patch(x0,x1,z0,z1,base,height=.0736,mode='running'){
  if(x1-x0<.025||z1-z0<.025)return;
  const w=x1-x0,d=z1-z0,m=new T.Mesh(new T.PlaneGeometry(w,d),material(w,d,base,mode));
  const uv=m.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(x0+uv.getX(i)*w)/2.16,(z1-uv.getY(i)*d)/1.44);uv.needsUpdate=true;
  m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,height,(z0+z1)/2);m.receiveShadow=true;m.name='quiet-stone-paving';group.add(m);return m;
 }
 // Split only open strips around the actual office footprints. Leaving a .04
 // margin avoids stones bleeding through plinths and entrances.
 function openPatch(x0,x1,z0,z1,base){
  let parts=[[x0,x1,z0,z1]];
  for(const b of officeBlocks){
   const bx0=b.x-b.w/2-.04,bx1=b.x+b.w/2+.04,bz0=b.z-b.d/2-.04,bz1=b.z+b.d/2+.04,next=[];
   for(const p of parts){const [a,c,e,f]=p,ix0=Math.max(a,bx0),ix1=Math.min(c,bx1),iz0=Math.max(e,bz0),iz1=Math.min(f,bz1);
    if(ix0>=ix1||iz0>=iz1){next.push(p);continue}
    if(a<ix0)next.push([a,ix0,e,f]);if(ix1<c)next.push([ix1,c,e,f]);if(e<iz0)next.push([ix0,ix1,e,iz0]);if(iz1<f)next.push([ix0,ix1,iz1,f]);
   }parts=next;
  }
  for(const [a,c,e,f]of parts)patch(a,c,e,f,base);
 }
 // Replace broad beige office ground with locally legible paving fields.
 // Existing cross walks at y=.075 and model plinths stay above this .0736 finish.
 for(const d of districts){
  if(d.id==='south-west')continue;
  const north=d.id.startsWith('north');
  openPatch(d.x0,d.x1,d.z0+(north?0:.095),d.z1-(north?.095:0),d.id==='north-east'?'#aeb5bb':d.id==='south-central'?'#b8b6af':'#b7b9b7');
  // A thin, darker threshold strip joins the public walk along each precinct.
  // NW/NE face south; SC/SE face north. Every strip remains within its own parcel.
  const z0=north?d.z1-.095:d.z0,z1=north?d.z1:d.z0+.095;
  openPatch(d.x0,d.x1,z0,z1,'#969fa5');
 }
 // China Zun outer apron: lateral passages sit outside the bounded lawn and
 // connect its existing cross walk to the tower/office precincts.
 patch(-5.72,-5.12,-7.76,-3.45,'#aaaeb1');
 patch(-2.58,-1.48,-7.76,-3.45,'#b4b5b2');
 patch(-5.12,-2.58,-7.76,-6.88,'#aeb3b7');
 // CCTV rear edge is outside its existing raised main plaza, with a calm stone
 // field that stops before the east lawn and western public sidewalk.
 patch(1.52,6.08,-7.93,-7.445,'#a6afb9');
 // Batch the clipped rectangles by surface family, retaining their world UVs.
 // Eight draw calls replace the 193 tiny patches without adding a texture atlas.
 const batches=new Map();for(const m of [...group.children]){m.updateMatrix();const geom=m.geometry.clone().applyMatrix4(m.matrix);if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(geom);group.remove(m);m.geometry.dispose();}
 for(const [mat,geoms]of batches){const merged=mergeGeometries(geoms,false);for(const geo of geoms)geo.dispose();const m=new T.Mesh(merged,mat);m.name='batched-precinct-paving';m.receiveShadow=true;group.add(m);}
 // Main landmark paving already lies higher than the base. Mutate only those
 // exact existing surfaces instead of stacking coplanar planes over them.
 group.applyToExisting=function(scene){
  let changed=0;
  scene.traverse(o=>{
   if(!o.isMesh||!o.geometry||group===o.parent||o.userData.precinctGroundFinished)return;
   const p=o.geometry.parameters||{};
   if(o.geometry.type==='PlaneGeometry'&&(o.userData.cctvPrecinct||(Math.abs(o.position.x-3.8)<.01&&Math.abs(o.position.z+5.25)<.01&&Math.abs(p.width-4.6)<.01&&Math.abs(p.height-4.35)<.01))){
    o.material=material(p.width,p.height,'#b2bac0','stack');scaleUV(o,p.width,p.height);o.name='cctv-detailed-paving';o.userData.precinctGroundFinished=true;changed++;
   }
   if(o.parent?.name==='china-zun-plaza'&&o.geometry.type==='BoxGeometry'&&Math.abs(p.height-.018)<.001&&o.material?.map&&!(Math.abs(p.width-2.45)<.01&&Math.abs(p.depth-3.8)<.01)){
    o.material=material(p.width,p.depth,'#b9bcb9','stack');scaleUV(o,p.width,p.depth);o.userData.precinctGroundFinished=true;changed++;
   }
  });
  return changed;
 };
 group.userData.reference='jakub-reference/v0-0.jpg + v2-2.jpg';
 group.userData.finishBounds=[[-10.35,-5.90,-7.85,-2.85],[7.30,10.35,-7.85,-2.85],[-4.85,-1.65,.70,6.70],[7.20,10.35,.70,6.70],[-5.72,-1.48,-7.76,-3.45],[1.52,6.08,-7.93,-7.445]];
 return group;
}
