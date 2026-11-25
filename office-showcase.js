import { addOfficePodium } from './office-podium.js?v=8';
import { officeEnvelope, addOfficeFacade, createOfficePigment } from './office-facades.js?v=11';
import { addOfficeRooftop, addOfficeTerrace } from './office-rooftops.js?v=10';
import { createOfficeMassing } from './office-massing.js?v=10';

// A single planned CBD precinct, using the user's New York skyline reference
// for varied massing and video 00:04/00:14 for entrances, paving and glazing.
// It does not alter any other district or landmark.
const cache=new WeakMap();
function materials(T){if(cache.has(T))return cache.get(T);const m=color=>createOfficePigment(T,color);const o={box:new T.BoxGeometry(1,1,1),trim:m('#e4d9c4'),glazingVertical:new T.LineBasicMaterial({color:'#b4bab1',transparent:true,opacity:.37,depthWrite:false}),glazingHorizontal:new T.LineBasicMaterial({color:'#aeb5ac',transparent:true,opacity:.19,depthWrite:false}),roof:m('#b2b8b4'),pave:m('#c5c4bc'),joints:new T.LineBasicMaterial({color:'#aab3b4',transparent:true,opacity:.46})};
 cache.set(T,o);return o}
export function createShowcaseOffice(T,s){
 if(s.form)return createOfficeMassing(T,s);
 const M=materials(T),g=new T.Group(),{w,d,h,design}=s;g.name='planned-office-'+design;
 const envelope=officeEnvelope(T,s.facade??design%6,s.tone);
 function box(mat,x,y,z,sx,sy,sz){const m=new T.Mesh(M.box,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
 const podium=Math.min(.255,h*.18);
 addOfficePodium(T,g,{w,d,h:podium,seed:design,tone:s.tone});
 // Each type has a distinct actual volume and facade rhythm. The two round
 // towers use geometry and mullions that follow the curved exterior.
 const setback=(design===1||design===4||design===6)? .83:.91,tw=w*setback,td=d*(design===3?.80:.86),tx=design===6?-w*.05:0,tz=-d*.035;
 function rectangularTier(cx,cz,sw,sd,bottom,top) {
  addOfficeFacade(T,g,envelope,{x:cx,z:cz,w:sw,d:sd,bottom,top,seed:design});
 }
 let roofW=tw,roofD=td,roofX=tx,roofZ=tz;
 if(design===2||design===7){
  // Cylindrical glass or chamfered eight-sided tower; the roof and facade
  // grids follow precisely the same circular/polygonal exterior.
  const sides=design===7?8:32,geo=new T.CylinderGeometry(.5,.5,1,sides),shaft=new T.Mesh(geo,envelope.glaze);shaft.position.set(tx,(h+podium)/2,tz);shaft.scale.set(tw,h-podium,td);shaft.castShadow=true;shaft.receiveShadow=true;g.add(shaft);
  const lines=[],floors=Math.max(4,Math.floor((h-podium)/.15));for(let j=0;j<sides;j++){const a=j*2*Math.PI/sides,b=(j+1)*2*Math.PI/sides,ax=tx+Math.sin(a)*tw*.505,az=tz+Math.cos(a)*td*.505,bx=tx+Math.sin(b)*tw*.505,bz=tz+Math.cos(b)*td*.505,parts=design===7?Math.max(3,Math.round(Math.hypot(bx-ax,bz-az)/.05)):2;for(let k=0;k<parts;k++){const t=k/parts,x=ax+(bx-ax)*t,z=az+(bz-az)*t;lines.push(x,podium,z,x,h,z)}}for(let f=1;f<floors;f++){const y=podium+(h-podium)*f/floors;for(let j=0;j<sides;j++){const a=j*2*Math.PI/sides,b=(j+1)*2*Math.PI/sides;lines.push(tx+Math.sin(a)*tw*.505,y,tz+Math.cos(a)*td*.505,tx+Math.sin(b)*tw*.505,y,tz+Math.cos(b)*td*.505)}}const vertical=[],horizontal=[];for(let i=0;i<lines.length;i+=6)(Math.abs(lines[i+1]-lines[i+4])>.001?vertical:horizontal).push(...lines.slice(i,i+6));for(const [points,material] of [[vertical,M.glazingVertical],[horizontal,M.glazingHorizontal]]){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));const mat=material.clone(),line=new T.LineSegments(geo,mat),viewport=new T.Vector2(),world=new T.Vector3(),base=material.opacity;line.onBeforeRender=(renderer,scene,camera)=>{renderer.getSize(viewport);let scale;if(camera.isOrthographicCamera)scale=viewport.y*camera.zoom/(camera.top-camera.bottom);else{line.getWorldPosition(world);scale=viewport.y/(2*Math.tan(camera.fov*Math.PI/360)*Math.max(.1,camera.position.distanceTo(world)))}mat.opacity=base*Math.max(.4,Math.min(1,.05*scale/2));};g.add(line);}
  const cap=new T.Mesh(new T.CylinderGeometry(.5,.5,.014,sides),design===7?M.roof:envelope.rail);cap.position.set(tx,h+.007,tz);cap.scale.set(tw,1,td);g.add(cap);roofW=tw*.70;roofD=td*.70;
 }else if(design===1){
  const cut=podium+(h-podium)*.70;rectangularTier(tx,tz,tw,td,podium,cut);roofW=tw*.72;roofD=td*.76;roofX=tx-tw*.09;roofZ=tz-td*.08;box(M.trim,tx,cut+.012,tz,tw,.024,td);rectangularTier(roofX,roofZ,roofW,roofD,cut,h);
  addOfficeTerrace(T,g,{x:tx,z:tz,y:cut+.024,w:tw,d:td},
    {x:roofX,z:roofZ,w:roofW,d:roofD},791+design);
 }else{rectangularTier(tx,tz,tw,td,podium,h);}
 addOfficeRooftop(T,g,{x:roofX,z:roofZ,y:h+((design===2||design===7)?.014:0),
   w:roofW,d:roofD,seed:317+design*791,height:h});

 return g;
}
export function addShowcaseWalkways(T,scene){
 const M=materials(T),g=new T.Group();g.name='northwest-office-walks';scene.add(g);
 // The three cross-precinct paths use gaps between building rows. Offset
 // connectors thread the actual building gaps without running through floors.
 function rect(x,z,w,d){const m=new T.Mesh(new T.PlaneGeometry(w,d),M.pave);m.rotation.x=-Math.PI/2;m.position.set(x,.075,z);m.receiveShadow=true;g.add(m)}
 rect(-8.06,-6.46,4.23,.13);rect(-8.06,-4.57,4.23,.13);rect(-8.06,-3.10,4.23,.15);
 rect(-9.02,-5.515,.13,1.89);rect(-8.47,-3.835,.13,1.47);
 // Short entrance approaches end at the nearest open cross-path.
 for(const [x,front,line] of [[-9.68,-6.705,-6.46],[-8.10,-6.73,-6.46],[-6.65,-6.63,-6.46],[-9.66,-4.91,-4.57],[-8.05,-4.93,-4.57],[-6.55,-5.09,-4.57],[-9.45,-3.31,-3.10],[-7.55,-3.31,-3.10],[-6.35,-3.41,-3.10]])rect(x,(front+line+.008)/2,.13,Math.abs(front-line)-.008);
 // A narrow connector crosses the planting strip and stops at the sidewalk edge.
 rect(-8.47,-2.6525,.13,.895);
 const points=[];for(const z of [-6.46,-4.57,-3.10])for(let x=-10.12;x<-5.98;x+=.25)points.push(new T.Vector3(x,.077,z-.06),new T.Vector3(x,.077,z+.06));g.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(points),M.joints));return g;
}
