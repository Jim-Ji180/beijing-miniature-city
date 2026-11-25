import { addOfficePodium } from './office-podium.js?v=8';
import { officeEnvelope, addOfficeFacade, createOfficePigment } from './office-facades.js?v=11';
import { addOfficeRooftop, addOfficeTerrace } from './office-rooftops.js?v=10';
import { createOfficeMassing } from './office-massing.js?v=10';

// Dense, varied modern office buildings, modelled as three-dimensional geometry.
// Reference: user-supplied city video (frames 01, 03, 06): off-white masonry, dark narrow frames, warm windows and detailed roof edges.
// Office massing and existing footprint are preserved.
let R;
function resources(T){
 if(R)return R;const mat=color=>createOfficePigment(T,color);
 // Calibrated against Jakub frames v0-0/v0-1: warm mineral walls stay distinct
 // from cool, subdued windows. The sun, rather than white albedo, lights stone.
 R={
  box:new T.BoxGeometry(1,1,1),round:new T.CylinderGeometry(.5,.5,1,32),
  trim:mat('#e1ded4'),metal:mat('#a9aaa2'),
  lineGlass:new T.LineBasicMaterial({color:'#b5bdb4',transparent:true,opacity:.34,depthWrite:false}),
  lineHorizontal:new T.LineBasicMaterial({color:'#a9b2ab',transparent:true,opacity:.18,depthWrite:false})
 };
 return R;
}
export function createOfficeBuilding(T,spec={}){
 if(spec.form)return createOfficeMassing(T,spec);
 const w=spec.w??.8,d=spec.d??.7,h=spec.h??2.2,variant=((spec.variant??0)%6+6)%6;
 const M=resources(T),g=new T.Group();
 const roofSeed=spec.seed??1;
 const envelope=officeEnvelope(T,spec.facade??roofSeed%6,spec.tone);
 const roof=(y,w,d,x=0,z=0,offset=0,compact=false)=>addOfficeRooftop(T,g,{x,z,y,w,d,seed:roofSeed+offset,height:h,compact});
 const stone=envelope.cladding;
 const stoneShaft={...envelope,mode:'stone-openings',coverage:.43,bay:.11,story:.15,minimumBays:4,windowHeight:.68,
   cladding:stone,rail:envelope.rail};
 function item(mat,x,y,z,sx,sy,sz){const m=new T.Mesh(M.box,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
 function batches(mat,parts,geo=M.box){if(!parts.length)return;const mesh=new T.InstancedMesh(geo,mat,parts.length),o=new T.Object3D();parts.forEach((a,i)=>{o.position.set(a[0],a[1],a[2]);o.rotation.set(0,a[6]||0,0);o.scale.set(a[3],a[4],a[5]);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh)}
 // Glass is read as fine continuous silver uprights, not an equal-weight
 // square grid. Low-alpha one-pixel lines stay quiet in the default wide view.
 function glazingLines(points){const vertical=[],horizontal=[];for(let i=0;i<points.length;i+=6){const dst=Math.abs(points[i+1]-points[i+4])>.0001?vertical:horizontal;dst.push(...points.slice(i,i+6))}for(const [p,m] of [[vertical,M.lineGlass],[horizontal,M.lineHorizontal]])if(p.length){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));const mat=m.clone(),line=new T.LineSegments(geo,mat),viewport=new T.Vector2(),world=new T.Vector3(),base=m.opacity;line.onBeforeRender=(renderer,scene,camera)=>{renderer.getSize(viewport);let scale;if(camera.isOrthographicCamera)scale=viewport.y*camera.zoom/(camera.top-camera.bottom);else{line.getWorldPosition(world);scale=viewport.y/(2*Math.tan(camera.fov*Math.PI/360)*Math.max(.1,camera.position.distanceTo(world)))}mat.opacity=base*Math.max(.4,Math.min(1,.05*scale/2));};g.add(line);}}
 const podiumHeight=Math.min(.28,Math.max(.17,h*.125));
 const podium=()=>addOfficePodium(T,g,{w,d,h:podiumHeight,seed:roofSeed,tone:spec.tone});
 // A small number of pale stone office towers have an Art-Deco-inspired stepped crown.
 // Their terraces are progressively smaller solid volumes, not detached decorations.
 if((spec.seed??1)%19===0 && h>2.8){
  podium();
  item(stone,0,(h*.13+podiumHeight)*.5,0,w,h*.13-podiumHeight,d);
  const sw=w*.76,sd=d*.76,shaftTop=h*.81;
  addOfficeFacade(T,g,stoneShaft,{x:0,z:0,w:sw,d:sd,bottom:h*.13,top:shaftTop,seed:roofSeed});
  const crown=[[.81,.87,.72],[.87,.92,.57],[.92,.96,.41],[.96,1,.25]];
  for(const [bottom,top,k] of crown){item(stone,0,(bottom+top)*h/2,0,w*k,(top-bottom)*h,d*k);item(M.trim,0,bottom*h+.004,0,w*k,.008,d*k);}
  roof(h,w*.25,d*.25,0,0,0,true);
  return g;
 }
 // Additional silhouettes selected independently of the original six facade patterns.
 const silhouette=(spec.seed??1)%3===0?6+variant%3:variant;
 if(silhouette>=6){
  podium();
  const line=[];
  function installLines(){glazingLines(line);}
  if(silhouette===6){
   // An elliptic curtain-wall tower with the grid following the actual curved face.
   const body=new T.Mesh(M.round, envelope.glaze);body.position.y=(h+podiumHeight)/2;body.scale.set(w,h-podiumHeight,d);body.castShadow=true;body.receiveShadow=true;g.add(body);
   const floors=Math.max(5,Math.round(h/.15)),count=32;
   for(let j=0;j<count;j++){const a=j*2*Math.PI/count,x=Math.cos(a)*w*.502,z=Math.sin(a)*d*.502;line.push(x,podiumHeight+.010,z,x,h-.012,z)}
   for(let k=1;k<floors;k++){const y=podiumHeight+(h-podiumHeight)*k/floors;for(let j=0;j<count;j++){const a=j*2*Math.PI/count,b=(j+1)*2*Math.PI/count;line.push(Math.cos(a)*w*.502,y,Math.sin(a)*d*.502,Math.cos(b)*w*.502,y,Math.sin(b)*d*.502)}}
   const cap=new T.Mesh(M.round,envelope.rail);cap.position.y=h+.012;cap.scale.set(w*.96,.024,d*.96);g.add(cap);
   roof(h+.024,w*.66,d*.66);
  }else if(silhouette===7){
   // Chamfered stone volume with an actual sloping crown, not a floating roof shape.
   const shape=new T.Shape(),x=w/2,z=d/2,c=Math.min(w,d)*.16;
   shape.moveTo(-x+c,-z);shape.lineTo(x-c,-z);shape.lineTo(x,-z+c);shape.lineTo(x,z-c);shape.lineTo(x-c,z);shape.lineTo(-x+c,z);shape.lineTo(-x,z-c);shape.lineTo(-x,-z+c);shape.closePath();
   const geo=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1});
   const pos=geo.attributes.position,normals=geo.attributes.normal,wallTop=h*.90;
   // Straight faces stop above the window courses. The chamfered corners and
   // sloping cap are continuous geometry, and meet those courses at wallTop.
   for(let i=0;i<pos.count;i++){
    const straight=Math.max(Math.abs(normals.getX(i)),Math.abs(normals.getY(i)))>.999;
    pos.setZ(i,pos.getZ(i)>h*.99?h*(.90+.10*(pos.getX(i)/w+.5)):straight?wallTop:podiumHeight);
   }
   geo.computeVertexNormals();
   const body=new T.Mesh(geo,stone);body.rotation.x=-Math.PI/2;body.castShadow=true;body.receiveShadow=true;g.add(body);
   addOfficeFacade(T,g,{...stoneShaft,coverage:.63,windowHeight:.62,minimumBays:3},{
    x:0,z:0,w,d,bottom:podiumHeight,top:wallTop,seed:roofSeed,cornerInset:c,
   });
   const deckY=h*.968,deckW=w*.26,deckD=d*.47,deckX=-w*.035;
   item(M.trim,deckX,(deckY+h*.92)*.5,0,deckW,deckY-h*.92,deckD);
   roof(deckY,deckW,deckD,deckX,0,0,true);
  }else{
   // Two differently tall volumes rise from a single low commercial podium.
   item(stone,0,(h*.21+podiumHeight)*.5,0,w,h*.21-podiumHeight,d);
   const towers=[[-w*.24,0,w*.46,d*.74,h*.84],[w*.25,0,w*.42,d*.70,h]];
   for(const [cx,cz,tw,td,top] of towers){const bottom=h*.21;
    addOfficeFacade(T,g,envelope,{x:cx,z:cz,w:tw,d:td,bottom,top,seed:roofSeed});item(envelope.rail,cx,top+.012,cz,tw*.94,.024,td*.94);roof(top+.024,tw*.94,td*.94,cx,cz,Math.round(top*100));}
  }
  installLines();return g;
 }
 // The tiers remain inside the supplied footprint; some variants have a broad podium and setback crown.
 let tiers;
 if(variant===0)tiers=[[0,h*.14,1,1,0,0],[h*.14,h,.88,.90,-w*.045,d*.035]];
 else if(variant===1)tiers=[[0,h*.72,1,1,0,0],[h*.72,h,.82,.86,-w*.075,0]];
 else if(variant===2)tiers=[[0,h*.25,1,1,0,0],[h*.25,h*.65,.82,.85,-w*.07,-d*.06],[h*.65,h,.59,.65,-w*.16,-d*.14]];
 else if(variant===3)tiers=[[0,h*.18,1,1,0,0],[h*.18,h,.74,.86,w*.12,-d*.05]];
 else if(variant===4)tiers=[[0,h*.30,1,1,0,0],[h*.30,h,.66,.72,-w*.15,d*.10]];
 else tiers=[[0,h*.54,1,1,0,0],[h*.54,h,.72,.74,w*.13,-d*.12]];
 podium();
 for(const [grade,top,sw,sd,cx,cz] of tiers){
  const bottom=Math.max(podiumHeight,grade),tw=w*sw,td=d*sd;
  if(top<=bottom)continue;
  addOfficeFacade(T,g,envelope,{x:cx,z:cz,w:tw,d:td,bottom,top,seed:roofSeed});
  if(grade>=podiumHeight)item(M.trim,cx,grade+.012,cz,tw,.024,td);
 }
 const footprints=tiers.map(([,y,sw,sd,x,z])=>({x,z,y:Math.max(y,podiumHeight),w:w*sw,d:d*sd}));
 for(let i=0;i<footprints.length-1;i++)addOfficeTerrace(T,g,footprints[i],footprints[i+1],roofSeed+i);
 const {x:rx,z:rz,w:rw,d:rd}=footprints.at(-1);
 const roofClass=roofSeed%8;
 if(roofClass===0 && h>2.5){
  item(stone,rx,h+.095,rz,rw*.59,.19,rd*.59);
  item(M.trim,rx,h+.198,rz,rw*.61,.016,rd*.61);
  item(stone,rx,h+.24,rz,rw*.40,.07,rd*.39);
  roof(h+.275,rw*.40,rd*.39,rx,rz,0,true);
  addOfficeTerrace(T,g,{x:rx,z:rz,w:rw,d:rd,y:h},{x:rx,z:rz,w:rw*.59,d:rd*.59},roofSeed);
 }else if(roofClass===3 && h>2.5){
  const capGeometry=new T.ConeGeometry(.5,.22,4);capGeometry.rotateY(Math.PI/4);
  const cap=new T.Mesh(capGeometry,M.metal);
  cap.position.set(rx,h+.11,rz);cap.scale.set(rw*.75,1,rd*.75);
  cap.castShadow=true;cap.receiveShadow=true;g.add(cap);
 }else if(roofClass===5 && h>2){
  item(envelope.shade,rx,h+.105,rz,rw*.60,.21,rd*.51);
  const screenFins=[];
  for(let j=-3;j<=3;j++)screenFins.push([rx+j*rw*.081,h+.12,rz+rd*.253,.009,.18,.013]);
  batches(M.trim,screenFins);
  roof(h+.21,rw*.60,rd*.51,rx,rz,0,true);
 }else{
  roof(h,rw,rd,rx,rz);
 }

 return g;
}
