import { addSurfaceFinish } from './street-realism.js?v=4';
// Hall of Prayer: one connected stepped timber structure carrying three projecting eaves.
// Visual references: tiantanpark.cn official front photo and Beijing Parks bracket photographs.
// Provenance: outputs/temple-v256-review/walkthrough.md .
import { addQinianPlaque } from './qinian-plaque.js?v=1';
import { createQinianJoinery } from './qinian-joinery.js?v=2';
import { createQinianBeamPaint, createQinianPaintedJointRing } from './qinian-painted-beams.js?v=3';
import { createQinianDrainHeads } from './qinian-drain-heads.js?v=3';
import { addQinianInterior } from './qinian-interior.js?v=6';
export function createTemple(THREE) {
 const g=new THREE.Group();g.name="Qinian Hall connected triple-eave structure";
 const stone=new THREE.MeshStandardMaterial({color:'#e8e2d2',roughness:1});
 const stoneShade=new THREE.MeshStandardMaterial({color:'#cdc9b8',roughness:1});
 const stoneLight=new THREE.MeshStandardMaterial({color:'#ddd9cd',roughness:.94});
 const treadEdge=new THREE.MeshStandardMaterial({color:'#d8d3c3',roughness:1});
 const reliefLine=new THREE.LineBasicMaterial({color:'#c1bba9',transparent:true,opacity:.45});
 const blue=new THREE.MeshPhysicalMaterial({color:'#2a6492',roughness:.73,metalness:.025,clearcoat:.13,clearcoatRoughness:.63,side:THREE.DoubleSide});
 const deepBlue=new THREE.MeshStandardMaterial({color:'#1f4c78',roughness:.86});
 const eaveBlue=new THREE.MeshStandardMaterial({color:'#44788d',roughness:.81,emissive:'#375a63',emissiveIntensity:.07});
 const verdigris=new THREE.MeshStandardMaterial({color:'#638078',roughness:.85,emissive:'#527161',emissiveIntensity:.07});
 const red=new THREE.MeshStandardMaterial({color:'#a74738',roughness:.94});
 const redDark=new THREE.MeshStandardMaterial({color:'#783b32',roughness:.94});
 const gold=new THREE.MeshStandardMaterial({color:'#c9a65b',roughness:.78});
 const matLine=new THREE.LineBasicMaterial({color:'#6c9abc',transparent:true,opacity:.30});
 const shadowLine=new THREE.LineBasicMaterial({color:'#204e79',transparent:true,opacity:.28});
 for(const surface of [blue,deepBlue])addSurfaceFinish(surface,'illustrated-clay');
 for(const surface of [red,redDark])addSurfaceFinish(surface,'timber');
 for(const surface of [stone,stoneShade,stoneLight])addSurfaceFinish(surface,'masonry');
 const tileSeam=new THREE.LineBasicMaterial({color:'#174d7c',transparent:true,opacity:.19});
 function mesh(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
 function cyl(radius,height,y,mat=stone,open=false){return mesh(new THREE.CylinderGeometry(radius,radius,height,64,1,open),mat,0,y,0)}
 function box(w,h,d,mat,x,y,z){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z)}
 // Three separately articulated, stepped marble terraces.
 const tiers=[{r:1.45,bottom:.00,top:.14},{r:1.28,bottom:.14,top:.28},{r:1.11,bottom:.28,top:.42}];
 for(const t of tiers){cyl(t.r,t.top-t.bottom,(t.top+t.bottom)/2,stone).userData.walkSurface=true;cyl(t.r+.012,.022,t.top-.011,stoneLight);cyl(t.r+.009,.018,t.bottom+.010,stoneShade)}
 // Fine joints in the carved terrace courses, just outside the vertical face.
 const stoneJoints=[];
 for(const t of tiers)for(let i=0;i<64;i++){let a=i*2*Math.PI/64,rr=t.r+.001;stoneJoints.push(new THREE.Vector3(Math.cos(a)*rr,t.bottom+.025,Math.sin(a)*rr),new THREE.Vector3(Math.cos(a)*rr,t.top-.024,Math.sin(a)*rr));}
 g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(stoneJoints),reliefLine));
 // Railings: separate posts and slender infill panels on all three terraces, with
 // an actual opening aligned with the front staircase rather than a closed ring.
 const postParts=[],baseParts=[],capParts=[],railParts=[],panelParts=[],insetParts=[],dummy=new THREE.Object3D();
 for(const [ti,t] of tiers.entries()){
  const r=t.r-.055,count=ti===0?48:ti===1?44:40;
  for(let i=0;i<count;i++){
   const a=i*Math.PI*2/count,ca=Math.cos(a),sa=Math.sin(a);
   // Leave four cardinal stair openings, each aligned to its own stone stair.
   if((Math.abs(sa)>.90 && Math.abs(ca)<.38)||(Math.abs(ca)>.90 && Math.abs(sa)<.38))continue;
   postParts.push({x:r*ca,y:t.top+.067,z:r*sa,sx:.027,sy:.12,sz:.027,rot:0});
   baseParts.push({x:r*ca,y:t.top+.015,z:r*sa,sx:.040,sy:.025,sz:.040,rot:0});
   capParts.push({x:r*ca,y:t.top+.130,z:r*sa,sx:.033,sy:.037,sz:.033,rot:0});
   const b=(i+.5)*Math.PI*2/count,cb=Math.cos(b),sb=Math.sin(b);
   if((Math.abs(sb)>.90 && Math.abs(cb)<.38)||(Math.abs(cb)>.90 && Math.abs(sb)<.38))continue;
   railParts.push({x:r*cb,y:t.top+.080,z:r*sb,sx:2*Math.PI*r/count*.86,sy:.017,sz:.024,rot:-b-Math.PI/2});
   railParts.push({x:r*cb,y:t.top+.025,z:r*sb,sx:2*Math.PI*r/count*.86,sy:.018,sz:.018,rot:-b-Math.PI/2});
   // The real balustrade contains solid marble panels under its open top rail.
   panelParts.push({x:r*cb,y:t.top+.050,z:r*sb,sx:2*Math.PI*r/count*.82,sy:.046,sz:.014,rot:-b-Math.PI/2});
   insetParts.push({x:(r+.007)*cb,y:t.top+.052,z:(r+.007)*sb,sx:2*Math.PI*r/count*.66,sy:.030,sz:.003,rot:-b-Math.PI/2});
  }
 }
 function instances(parts,mat){const result=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat,parts.length);parts.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rot,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();result.setMatrixAt(i,dummy.matrix)});result.castShadow=true;result.receiveShadow=true;g.add(result)}
 const caps=new THREE.InstancedMesh(new THREE.CylinderGeometry(.5,.45,1,9),stoneLight,capParts.length);
 function setParts(m,parts){
  parts.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rot,0);
   dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});
  m.castShadow=m.receiveShadow=true;g.add(m);
 }
 setParts(caps,capParts);
 g.add(createQinianDrainHeads(THREE,tiers,stoneShade));
 instances(baseParts,stone);instances(postParts,stoneLight);instances(railParts,stoneLight);
 instances(panelParts,stone);instances(insetParts,stoneShade);
 // Four ceremonial staircases: each is one instanced set of steps with a
 // continuous central stone ramp. Their radial footprint stays within 1.84.
 const carvedCanvas=document.createElement('canvas');
 carvedCanvas.width=160;carvedCanvas.height=768;
 const carving=carvedCanvas.getContext('2d');
 carving.fillStyle='#d9d5ca';carving.fillRect(0,0,160,768);
 carving.strokeStyle='#ada79a';carving.lineWidth=2;carving.strokeRect(8,8,144,752);
 carving.strokeStyle='#f2ebde';carving.lineWidth=1;carving.strokeRect(11,11,138,746);
 for(let i=0;i<7;i++){
  const y=65+i*106,x=i%2===0?66:96;
  carving.beginPath();
  carving.moveTo(x-44,y+27);carving.bezierCurveTo(x-34,y-17,x-28,y-26,x-14,y-12);
  carving.bezierCurveTo(x+1,y+5,x+5,y+21,x+30,y+12);
  carving.bezierCurveTo(x+45,y+4,x+31,y-22,x+13,y-26);
  carving.strokeStyle='#a29a86';carving.lineWidth=5;carving.stroke();
  carving.translate(0,5);carving.strokeStyle='#f2eadd';carving.lineWidth=3;carving.stroke();carving.translate(0,-5);
 }
 const reliefTex=new THREE.CanvasTexture(carvedCanvas);reliefTex.colorSpace=THREE.SRGBColorSpace;reliefTex.anisotropy=8;
 const carvedStone=new THREE.MeshStandardMaterial({color:'#fff',map:reliefTex,roughness:.96});
 function staircase(angle){
  const stairs=new THREE.Group();stairs.rotation.y=angle;stairs.scale.z=.97;g.add(stairs);
  const count=12,parts=[];for(let i=0;i<count;i++){
   const h=.035*(i+1),z=1.80-i*.055;
   for(const x of [-.19,.19])parts.push({x,y:h/2,z,sx:.22,sy:h,sz:.070});
  }
  const steps=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),stoneLight,parts.length);
  parts.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();steps.setMatrixAt(i,dummy.matrix)});
  steps.userData.walkSurface=true;steps.castShadow=true;steps.receiveShadow=true;stairs.add(steps);
  // Thin stone nosings make the treads readable even when seen from the side.
  const nosings=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),treadEdge,parts.length);
  parts.forEach((p,i)=>{dummy.position.set(p.x,p.sy+.0015,p.z+.027);dummy.rotation.set(0,0,0);dummy.scale.set(p.sx*.94,.003,.006);dummy.updateMatrix();nosings.setMatrixAt(i,dummy.matrix)});
  nosings.receiveShadow=true;stairs.add(nosings);
  function stoneSlope(w,h,d,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),stone);m.position.set(x,y,z);m.rotation.x=.46;m.castShadow=true;m.receiveShadow=true;stairs.add(m)}
  stoneSlope(.15,.035,.86,0,.225,1.50);stairs.children.at(-1).userData.walkSurface=true;
  // A low-contrast carved stone insert, scaled to the visible central approach.
  const marbleInsert=new THREE.Mesh(new THREE.PlaneGeometry(.135,.76),carvedStone);
  const reliefOffset=.0195;
  marbleInsert.position.set(0,.225+Math.cos(.46)*reliefOffset,1.50+Math.sin(.46)*reliefOffset);
  marbleInsert.rotation.x=.46-Math.PI/2;
  marbleInsert.receiveShadow=true;
  stairs.add(marbleInsert);
  for(const x of [-.34,.34])stoneSlope(.045,.055,.90,x,.225,1.50);
 }
 for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2])staircase(angle);
 // Bridge the short gap between the last tread and the upper terrace.
 const landing=cyl(1.19,.025,.4075,stoneLight);
 landing.userData.walkSurface=true;
 const hallStart=g.children.length;
 // The exterior is one continuous timber hall. Roof skirts terminate against
 // the stepped painted wall; the middle and lower roofs are not separate cones.
 const lacquer=new THREE.MeshStandardMaterial({color:'#8f3025',roughness:.70});
 const lineGold=new THREE.MeshStandardMaterial({color:'#b9a064',roughness:.7,metalness:.1});
 const painted=createQinianBeamPaint(THREE);
 function ringPaint(r,y,h){
  const material=createQinianBeamPaint(THREE,{radius:r,bandHeight:h});
  cyl(r,h,y,material,true);
  cyl(r+.003,.012,y+h/2,lineGold,true);
  cyl(r+.003,.010,y-h/2,verdigris,true);
  g.add(createQinianPaintedJointRing(THREE,r,y,h));
 }
 const bayCount=12,hallRadius=.775;
 cyl(.80,.045,.445,stoneLight);
 // The circular roof frame sits on twelve perimeter columns, independent of
 // the flat joinery fitted into each of the twelve window and door bays.
 for(let i=0;i<bayCount;i++){
  const angle=(i+.5)*Math.PI*2/bayCount;
  const x=hallRadius*Math.cos(angle),z=hallRadius*Math.sin(angle);
  mesh(new THREE.CylinderGeometry(.028,.031,.64,18),lacquer,x,.766,z);
  mesh(new THREE.CylinderGeometry(.035,.038,.023,16),stoneLight,x,.451,z);
 }
 ringPaint(.795,1.10,.133);
 // The stepped cores close every gap and carry the upper eave rings.
 cyl(.635,.54,1.427,deepBlue,true);cyl(.495,.49,1.915,deepBlue,true);
 ringPaint(.641,1.535,.177);ringPaint(.501,2.025,.171);
 function bracketRing(r,y,count){
  const blocks=[],arms=[],tips=[],centers=[],cushions=[];
  for(let i=0;i<count;i++){
   const a=i*2*Math.PI/count,c=Math.cos(a),s=Math.sin(a),rot=Math.PI/2-a;
   blocks.push({x:r*c,y:y-.065,z:r*s,sx:.034,sy:.024,sz:.045,rot});
   arms.push({x:(r+.019)*c,y:y-.045,z:(r+.019)*s,sx:.075,sy:.015,sz:.073,rot});
   centers.push({x:(r+.042)*c,y:y-.026,z:(r+.042)*s,sx:.026,sy:.025,sz:.069,rot});
   cushions.push({x:(r+.085)*c,y:y-.004,z:(r+.085)*s,sx:.043,sy:.013,sz:.050,rot});
   tips.push({x:(r+.074)*c,y:y-.015,z:(r+.074)*s,sx:.093,sy:.013,sz:.065,rot});
  }
  instances(blocks,deepBlue);instances(arms,verdigris);instances(centers,lineGold);instances(tips,eaveBlue);instances(cushions,deepBlue);
 }
 bracketRing(.865,1.207,60);bracketRing(.691,1.687,48);bracketRing(.526,2.145,40);
 const roofSurfaces=[],tileRibs=[],tileEnds=[],ribObj=new THREE.Object3D();
 const ribGeometry=new THREE.CylinderGeometry(.0032,.0038,1,6);
 function roofSkirt(points){
  const lathePoints=points.map(([r,y])=>new THREE.Vector2(r,y));
  roofSurfaces.push(mesh(new THREE.LatheGeometry(lathePoints,96),blue));
  const edge=points.reduce((p,n)=>n[0]>p[0]?n:p,points[0]);
  // Actual eave ends, fascia and underside, rather than a floating cone lip.
  cyl(edge[0],.025,edge[1]-.015,deepBlue,true);
  const tileCount=Math.round(edge[0]*120);
  const outer=points.slice(0,points.findIndex(p=>p[0]===edge[0])+1);
  for(let j=0;j<tileCount;j++){
   const a=j*Math.PI*2/tileCount,c=Math.cos(a),s=Math.sin(a);
   for(let k=0;k<outer.length-1;k++){
    const p=outer[k],q=outer[k+1],u=new THREE.Vector3(p[0]*c,p[1]+.003,p[0]*s),v=new THREE.Vector3(q[0]*c,q[1]+.003,q[0]*s),delta=v.clone().sub(u);
    if(delta.length()<.005)continue;ribObj.position.copy(u).add(v).multiplyScalar(.5);ribObj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());ribObj.scale.set(1,delta.length(),1);ribObj.updateMatrix();tileRibs.push(ribObj.matrix.clone());
   }
   const e=new THREE.Object3D();e.position.set(edge[0]*c,edge[1]+.002,edge[0]*s);e.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(c,0,s));e.scale.set(1,1,1);e.updateMatrix();tileEnds.push(e.matrix.clone());
  }
  // Closed underside slope connects the outer lip back to the painted core.
 }
 roofSkirt([[.63,1.476],[.71,1.394],[.82,1.307],[.93,1.245],[1.005,1.222],[1.02,1.234],[1.02,1.210],[.93,1.217],[.82,1.279],[.71,1.366],[.63,1.448],[.63,1.476]]);
 roofSkirt([[.49,1.955],[.56,1.876],[.65,1.793],[.75,1.731],[.824,1.702],[.84,1.714],[.84,1.690],[.75,1.703],[.65,1.765],[.56,1.848],[.49,1.927],[.49,1.955]]);
 roofSkirt([[0,2.600],[.09,2.588],[.17,2.505],[.30,2.383],[.44,2.264],[.56,2.190],[.64,2.161],[.66,2.173],[.66,2.149],[.56,2.162],[.44,2.236],[.30,2.355],[.17,2.477],[.09,2.560],[0,2.572],[0,2.600]]);
 const ribs=new THREE.InstancedMesh(ribGeometry,new THREE.MeshStandardMaterial({color:'#466f92',roughness:.78,metalness:.02}),tileRibs.length);tileRibs.forEach((m,i)=>{
   ribs.setMatrixAt(i,m);
   ribs.setColorAt(i,new THREE.Color().setScalar(.95+(Math.floor(i/4)*13%10)/100));
 });ribs.receiveShadow=true;g.add(ribs);
 const ends=new THREE.InstancedMesh(new THREE.CylinderGeometry(.009,.009,.018,10),deepBlue,tileEnds.length);tileEnds.forEach((m,i)=>ends.setMatrixAt(i,m));ends.castShadow=true;ends.receiveShadow=true;g.add(ends);
 // Crown is integrated into the top roof neck and follows the real gourd finial.
 cyl(.10,.062,2.604,deepBlue);cyl(.080,.052,2.650,gold);mesh(new THREE.SphereGeometry(.082,20,14),gold,0,2.707,0);
 // Elevation-photo calibration: the door storey is shorter than the roof drum
 // spacing, and the top roof has a lower pitch than the former repeated cones.
 const elevationY=y=>{let out=y<=1.06?.42+(y-.42)*.75:y-.16;return out>2.013?2.013+(out-2.013)*.83:out;};
 for(const part of g.children.slice(hallStart).flatMap(p=>p.isGroup?p.children:[p])){
  if(part.isInstancedMesh){
   const m=new THREE.Matrix4(),p=new THREE.Vector3();for(let i=0;i<part.count;i++){part.getMatrixAt(i,m);p.setFromMatrixPosition(m);const factor=(elevationY(p.y+.001)-elevationY(p.y-.001))/.002;const ys=new THREE.Matrix4().makeScale(1,factor,1);m.premultiply(ys);m.setPosition(p.x,elevationY(p.y),p.z);part.setMatrixAt(i,m);}part.instanceMatrix.needsUpdate=true;
  }else if(part.isMesh){
   part.updateMatrix();const geo=part.geometry.clone().applyMatrix4(part.matrix),pos=geo.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,elevationY(pos.getY(i)));geo.computeVertexNormals();part.geometry=geo;part.position.set(0,0,0);part.rotation.set(0,0,0);part.scale.set(1,1,1);
  }
 }
 g.userData.templeProfile={connected:true,roofEaveHeights:[1.074,1.554,2.013],roofRadii:[1.02,.84,.66],totalHeight:2.524};
 g.userData.roofSurfaces=roofSurfaces;
 g.userData.plaqueParts=addQinianPlaque(THREE,g);
 const joinery=createQinianJoinery(THREE,{lacquer,redDark,stoneLight});
 for(let i=0;i<bayCount;i++){
  const angle=i*Math.PI*2/bayCount;
  const bay=new THREE.Group();
  bay.position.set(hallRadius*Math.cos(angle),0,hallRadius*Math.sin(angle));
  bay.rotation.y=Math.PI/2-angle;
  joinery.addBay(bay,i);
  g.add(bay);
 }
 joinery.finishBays(g);
 g.userData.entrance=addQinianInterior(THREE,g,{lacquer,lineGold,verdigris,painted,stoneLight,deepBlue},joinery);
 return g;
}
