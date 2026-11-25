import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';

// Park bench reference: Beijing Daily's park seating field photograph.
// The shelter follows the user's video at 00:04.
const cache=new WeakMap();
const benchCache=new WeakMap();
function mats(T){
 if(cache.has(T))return cache.get(T);
 const result={frame:new T.MeshStandardMaterial({color:'#343b38',metalness:.48,roughness:.55}),wood:new T.MeshStandardMaterial({color:'#a68158',roughness:.87}),edge:new T.MeshStandardMaterial({color:'#bbbdb5',metalness:.2,roughness:.7}),glass:new T.MeshStandardMaterial({color:'#c9d9d4',transparent:true,opacity:.28,roughness:.17,metalness:.05,side:T.DoubleSide,depthWrite:false})};cache.set(T,result);return result;
}
function box(T,g,mat,w,h,d,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=!mat.transparent;m.receiveShadow=true;g.add(m);return m}
function roundedBoard(T,w,h,d,y,z,slope=0){
 const bevel=.00145;
 const x=w/2-bevel,v=h/2-bevel;
 const shape=new T.Shape();shape.moveTo(-x,-v);shape.lineTo(x,-v);shape.lineTo(x,v);shape.lineTo(-x,v);shape.closePath();
 const geo=new T.ExtrudeGeometry(shape,{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1});
 return geo.translate(0,0,-(d-2*bevel)/2).rotateX(slope).translate(0,y,z);
}
function benchParts(T){
 if(benchCache.has(T))return benchCache.get(T);
 const metal=new T.MeshStandardMaterial({color:'#68716b',metalness:.44,roughness:.40});
 const fastener=new T.MeshStandardMaterial({color:'#a4a7a0',metalness:.63,roughness:.44});
 const wood=new T.MeshStandardMaterial({color:'#a87c51',roughness:.66});
 wood.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vBenchPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBenchPoint=position;');
  shader.fragmentShader='varying vec3 vBenchPoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
   #include <color_fragment>
   vec3 p=vBenchPoint;
   float ripple=sin(p.x*61.+sin(p.z*70.)+p.y*32.);
   float grain=sin((p.y+p.z)*2670.+ripple*1.5+sin(p.x*19.)*2.9);
   float endFade=smoothstep(.147,.178,abs(p.x));
   float grainFade=1.-smoothstep(.3,1.,fwidth((p.y+p.z)*1200.));
   diffuseColor.rgb*=1.+.067*ripple+grain*.085*grainFade-endFade*.105;
  `);
 };
 wood.customProgramCacheKey=()=> 'city-park-bench-grain';
 const boards=[],frame=[],bolts=[];
 const slat=(...dims)=>boards.push(roundedBoard(T,...dims));
 function strip(w,h,d,x,y,z){frame.push(new T.BoxGeometry(w,h,d).toNonIndexed().translate(x,y,z));}
 function rod(x,pairs,r){
  const path=new T.CatmullRomCurve3(pairs.map(([y,z])=>new T.Vector3(x,y,z)),false,'centripetal');
  frame.push(new T.TubeGeometry(path,21,r,7,false).toNonIndexed());
 }
 for(let k=0;k<6;k++){
  const z=-.048+k*.021;
  const rim=k===5?.0035:0;
  slat(.352,.012+rim,.018,.091-rim,z,-.035);
 }
 for(let k=0;k<5;k++){
  const y=.119+k*.0185,z=-.060-(y-.119)*.27;
  slat(.349,.015,.011,y,z,-.26);
  for(const x of [-.141,.141])bolts.push(new T.CylinderGeometry(.0019,.0023,.0010,8).rotateX(Math.PI/2).translate(x,y,z+.0055).toNonIndexed());
 }
 slat(.348,.012,.010,.075,.061);
 slat(.348,.012,.010,.059,.061);
 for(const x of [-.146,.146]){
  rod(x,[[.008,.055],[.047,.058],[.080,.055],[.084,.040],[.085,-.050],[.087,-.062],[.113,-.071],[.189,-.091]],.0055);
  rod(x,[[.085,-.062],[.048,-.067],[.006,-.071]],.0055);
  rod(x,[[.100,.047],[.116,.047],[.130,.041],[.133,.030],[.133,-.010],[.135,-.047],[.140,-.067]],.0048);
  strip(.022,.004,.022,x,.002,.055);strip(.022,.004,.022,x,.002,-.071);
  for(const z of [.055,-.071])for(const dx of [-.006,.006])
   bolts.push(new T.CylinderGeometry(.0016,.0018,.0014,7).translate(x+dx,.0045,z).toNonIndexed());
 }
 strip(.303,.008,.009,0,.064,-.014);
 const resources=[[boards,wood],[frame,metal],[bolts,fastener]].map(([parts,material])=>{
  const geo=mergeGeometries(parts);
  parts.forEach(part=>part.dispose());
  return [geo,material];
 });
 benchCache.set(T,resources);
 return resources;
}
export function createDetailedBench(T,x,z,angle=0){
 const g=new T.Group();g.name='street-bench-detail';g.position.set(x,.098,z);g.rotation.y=angle;
 for(const [geometry,material] of benchParts(T)){
  const part=new T.Mesh(geometry,material);part.castShadow=true;part.receiveShadow=true;g.add(part);
 }
 return g;
}
export function createDetailedBusShelter(T,x,z,side){
 const g=new T.Group(),m=mats(T);g.name='bus-shelter-detail';g.position.set(x,.085,z);g.rotation.y=side<0?Math.PI:0;
 // Thin, glazed canopy and perimeter frame retain the original footprint.
 box(T,g,m.glass,.675,.008,.175,0,.365,0);
 for(const pz of [-.095,.095])box(T,g,m.frame,.70,.012,.012,0,.365,pz);
 for(const px of [-.345,.345])box(T,g,m.frame,.012,.012,.20,px,.365,0);
 box(T,g,m.frame,.012,.009,.18,0,.365,0);
 for(const px of [-.32,.32])for(const pz of [-.085,.085])box(T,g,m.frame,.012,.35,.012,px,.175,pz);
 box(T,g,m.glass,.62,.28,.006,0,.19,-.084);
 for(const px of [-.315,.315])box(T,g,m.glass,.006,.27,.16,px,.19,0);
 for(const px of [-.14,.14])box(T,g,m.frame,.008,.27,.008,px,.19,-.082);
 box(T,g,m.frame,.64,.008,.008,0,.30,-.083);
 const wood=benchParts(T)[0][1];
 for(let k=0;k<5;k++){
  const geo=roundedBoard(T,.48,.012,.017,.089,-.038+k*.019);
  const slat=new T.Mesh(geo,wood);slat.castShadow=slat.receiveShadow=true;g.add(slat);
 }
 for(const px of [-.185,.185]){
  box(T,g,m.frame,.015,.009,.094,px,.080,.001);
  for(const z of [-.034,.033]){
   box(T,g,m.frame,.012,.083,.012,px,.0415,z);
   box(T,g,m.frame,.018,.0025,.018,px,.00125,z);
  }
 }
 return g;
}
