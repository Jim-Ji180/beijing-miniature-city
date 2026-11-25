import {createPlantedBedFoliage} from './city-turf.js?v=7';
// China Zun precinct, modelled for the existing city coordinates.
// Reference: user's video 00:04 and 00:08 — regular stone pavers, fine-edged
// planted beds and layered foliage. Keep the ceremonial route unobstructed.
export function createChinaZunPlaza(T,createTree,createBench){
 const g=new T.Group();g.name='china-zun-plaza';
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:1,...extra});
 const soil=mat('#526a43'),stone=mat('#c7bba5');
 function slab(x,z,w,d,y,material){const m=new T.Mesh(new T.BoxGeometry(w,.018,d),material);m.position.set(x,y,z);m.receiveShadow=true;g.add(m);return m;}
 // Irregular but restrained stone colour and fine joints, based on the reference plaza.
 const c=document.createElement('canvas');c.width=c.height=512;const q=c.getContext('2d');q.fillStyle='#c8c6bd';q.fillRect(0,0,512,512);let seed=85731;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let j=0;j<16;j++)for(let i=0;i<12;i++){const n=Math.floor(rnd()*24-12),base=[201+n,200+n,192+n],x=i*512/12,y=j*32;q.fillStyle=`rgb(${base.join(',')})`;q.fillRect(x,y,512/12,32);const wash=q.createLinearGradient(x,y,x+512/12,y+32);wash.addColorStop(0,'rgba(255,255,250,.05)');wash.addColorStop(.55,'rgba(115,118,110,.025)');wash.addColorStop(1,'rgba(255,255,248,.035)');q.fillStyle=wash;q.fillRect(x+1,y+1,512/12-2,30);}
 for(let i=0;i<8000;i++){const x=rnd()*512,y=rnd()*512;q.fillStyle=i%2?'rgba(255,255,255,.05)':'rgba(65,67,61,.035)';q.fillRect(x,y,1,1)}
 q.strokeStyle='rgba(94,97,90,.30)';q.lineWidth=1;for(let i=0;i<=12;i++){q.beginPath();q.moveTo(i*512/12,0);q.lineTo(i*512/12,512);q.stroke()}for(let j=0;j<=16;j++){q.beginPath();q.moveTo(0,j*32);q.lineTo(512,j*32);q.stroke()}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;const paved=mat('#ffffff',{map:tex});
 // Finer mixed grass tones bring the lawn closer to the textured reference.
 const gc=document.createElement('canvas');gc.width=gc.height=512;const gx=gc.getContext('2d');gx.fillStyle='#646f47';gx.fillRect(0,0,512,512);
 for(let i=0;i<16000;i++){const x=rnd()*512,y=rnd()*512;gx.strokeStyle=i%3===0?'rgba(43,87,38,.18)':i%3===1?'rgba(199,212,144,.13)':'rgba(255,255,221,.08)';gx.lineWidth=.4+rnd()*.55;gx.beginPath();gx.moveTo(x,y);gx.lineTo(x+(rnd()-.5)*2,y-rnd()*3);gx.stroke()}
 const grassTex=new T.CanvasTexture(gc);grassTex.colorSpace=T.SRGBColorSpace;grassTex.anisotropy=8;const grass=mat('#ffffff',{map:grassTex});
 // One lawn is visibly bounded; plaza and through-routes sit over its surface.
 slab(-3.85,-4.9,2.45,3.8,.072,grass).userData.cityTurf=true;
 slab(-3.8,-4.66,1.55,2.18,.089,paved);
 // Axial route connects the existing public sidewalk; west spur joins the office precinct.
 slab(-3.8,-2.98,.46,1.57,.09,paved);
 slab(-5.515,-3.28,.88,.28,.091,paved);
 // A single transverse walk joins both sidewalks and the existing western
 // office path. The side returns turn it into a legible circulation loop.
 slab(-3.85,-3.28,2.45,.28,.091,paved);
 slab(-2.0275,-3.28,1.195,.28,.091,paved);
 for(const x of [-4.57,-3.03])slab(x,-4.59,.15,2.03,.090,paved);
 // Low retaining curb around garden perimeter; gaps mark both pedestrian entries.
 for(const z of [-6.8,-3.0])for(const [x,w] of z===-3.0?[[-4.58,.99],[-3.13,.99]]:[[-3.85,2.45]])slab(x,z,w,.025,.091,stone);
 for(const [x,z,d] of [[-5.075,-5.135,3.33],[-2.625,-5.11,3.38],[-2.625,-3.07,.14]])slab(x,z,.025,d,.091,stone);
 // Small flush circular tree wells frame the trees without oversized square planters.
 const wells=[[-4.80,-6.30],[-2.91,-6.30],[-4.83,-3.70],[-2.87,-3.70]];
 function disk(x,z,r,y,material){const m=new T.Mesh(new T.CircleGeometry(r,20),material);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;g.add(m)}
 for(let i=0;i<wells.length;i++){const [x,z]=wells[i];disk(x,z,.115,.083,stone);disk(x,z,.096,.085,soil);const tree=createTree(T,x,z,[.22,.245,.215,.235][i]);tree.rotation.y=[.15,1.2,2.1,2.8][i];g.add(tree);}
 // The seats sit on small paved pads and face the open route, keeping the lawn clear.
 slab(-4.77,-4.27,.23,.43,.089,paved);slab(-2.84,-5.05,.23,.43,.089,paved);
 // Short flush connections link the seat pads directly to the central paving.
 slab(-4.615,-4.27,.10,.16,.089,paved);slab(-2.99,-5.05,.09,.16,.089,paved);
 // Defined low planting strips, with a fine edging rather than raised planters.
 const bed=mat('#9b8967');
 for(const [x,z,w,d] of [[-4.84,-5.33,.24,1.02],[-2.84,-5.62,.24,.48],[-2.84,-4.53,.24,.36]]){
  slab(x,z,w,d,.083,bed);
  for(const xx of [x-w/2,x+w/2])slab(xx,z,.009,d,.089,stone);
  for(const zz of [z-d/2,z+d/2])slab(x,zz,w,.009,.089,stone);
 }
 // Plantings rise from the soil and stay below the nearby seat and path edges.
 g.add(createPlantedBedFoliage(T,[
  {x:-4.84,z:-5.33,w:.231,d:1.01,y:.092},
  {x:-2.84,z:-5.62,w:.231,d:.47,y:.092},
  {x:-2.84,z:-4.53,w:.231,d:.35,y:.092},
 ]));
 // Two benches, on the sides with their long axis parallel to the open route.
 g.add(createBench(T,-4.77,-4.27,Math.PI/2));g.add(createBench(T,-2.84,-5.05,-Math.PI/2));
 return g;
}
