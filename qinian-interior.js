export function addQinianInterior(T,hall,materials,joinery){
 const {lacquer,lineGold,verdigris,painted,stoneLight,deepBlue}=materials;
 const floorMat=new T.MeshStandardMaterial({color:'#777775',roughness:.66});
 const altarWood=new T.MeshStandardMaterial({color:'#55352e',roughness:.75});
 const bronze=new T.MeshStandardMaterial({color:'#ab8850',roughness:.44,metalness:.52});
 const inside=new T.Group();inside.name='qinian-ceremonial-interior';hall.add(inside);
 const boxGeo=new T.BoxGeometry(1,1,1);
 function part(parent,geo,mat,x,y,z){
   const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 function box(parent,mat,x,y,z,w,h,d){
   const mesh=part(parent,boxGeo,mat,x,y,z);mesh.scale.set(w,h,d);return mesh;
 }
 const floor=part(inside,new T.CylinderGeometry(.744,.744,.021,64),floorMat,0,.471,0);
 floor.name='qinian-stone-floor';
 const joints=[];
 for(let i=-7;i<=7;i++){
  const v=i*.095,r=Math.sqrt(.735**2-v*v);
  joints.push(-r,.482,v,r,.482,v,v,.482,-r,v,.482,r);
 }
 const jointGeo=new T.BufferGeometry();jointGeo.setAttribute('position',new T.Float32BufferAttribute(joints,3));
 inside.add(new T.LineSegments(jointGeo,new T.LineBasicMaterial({color:'#565853'})));
 const clerestory=painted.clone();clerestory.side=T.BackSide;
 const frieze=part(inside,new T.CylinderGeometry(.741,.741,.235,64,1,true),clerestory,0,.967,0);
 frieze.castShadow=false;
 // Radial ribs make the concave, painted ceiling readable through the doors.
 const dome=[[0,1.335],[.12,1.324],[.27,1.248],[.43,1.130],[.57,1.020],[.72,.943]];
 const domePaint=painted.clone();domePaint.side=T.DoubleSide;
 const innerRoof=part(inside,new T.LatheGeometry(dome.map(([x,y])=>new T.Vector2(x,y)),48),domePaint,0,0,0);
 innerRoof.castShadow=false;
 const ribPoints=[];
 for(let i=0;i<24;i++){
  const a=i*Math.PI/12,c=Math.cos(a),s=Math.sin(a);
  for(let j=1;j<dome.length-1;j++){
   const [r,y]=dome[j],[nextR,nextY]=dome[j+1];
   ribPoints.push(r*c,y-.005,r*s,nextR*c,nextY-.005,nextR*s);
  }
 }
 const ceilingRibs=new T.BufferGeometry();
 ceilingRibs.setAttribute('position',new T.Float32BufferAttribute(ribPoints,3));
 inside.add(new T.LineSegments(ceilingRibs,new T.LineBasicMaterial({color:'#b7aa73'})));
 for(const [r,y] of [[.24,1.257],[.43,1.126],[.58,1.013],[.72,.942]]){
  const band=part(inside,new T.TorusGeometry(r,.008,6,56),lineGold,0,y,0);
  band.rotation.x=Math.PI/2;
 }
 for(const x of [-.245,.245])for(const z of [-.245,.245]){
  part(inside,new T.CylinderGeometry(.029,.032,.60,18),lacquer,x,.780,z);
  part(inside,new T.CylinderGeometry(.040,.045,.026,16),stoneLight,x,.495,z);
  for(let j=0;j<6;j++){
   const collar=part(inside,new T.TorusGeometry(.030,.0016,6,14),lineGold,x,.59+j*.064,z);
   collar.rotation.x=Math.PI/2;
  }
  box(inside,verdigris,x,1.061,z,.079,.025,.079);
  box(inside,lineGold,x,1.079,z,.104,.012,.104);
 }
 for(let i=0;i<12;i++){
  const a=(i+.5)*Math.PI/6;
  part(inside,new T.CylinderGeometry(.015,.018,.452,12),lacquer,.571*Math.cos(a),.710,.571*Math.sin(a));
 }
 const altar=new T.Group();altar.name='qinian-altar';inside.add(altar);
 box(altar,stoneLight,0,.508,-.263,.362,.055,.31);
 box(altar,stoneLight,0,.538,-.105,.240,.032,.043);
 box(altar,altarWood,0,.565,-.263,.292,.057,.20);
 box(altar,altarWood,0,.695,-.358,.244,.28,.038);
 for(const x of [-.121,.121])box(altar,lineGold,x,.710,-.336,.008,.26,.006);
 box(altar,deepBlue,0,.740,-.333,.094,.153,.012);
 box(altar,lineGold,0,.817,-.333,.103,.010,.017);
 box(altar,altarWood,0,.578,.073,.283,.018,.104);
 for(const x of [-.119,.119])for(const z of [.035,.111])box(altar,lacquer,x,.527,z,.021,.096,.021);
 for(const x of [-.085,0,.085]){
  const radius=x===0?.024:.013;
  part(altar,new T.LatheGeometry([[0,0],[radius*.56,0],[radius*.56,.008],[radius*.84,.016],[radius,.033],[radius*.83,.041]].map(([r,y])=>new T.Vector2(r,y)),12),bronze,x,.588,.073);
 }
 const light=new T.PointLight('#ffdfb4',.17,1.40,2);
 light.position.set(0,.72,.35);inside.add(light);

 const hinges=[];
 for(const side of [-1,1]){
  const hinge=new T.Group();hinge.name='qinian-door-hinge';
  hinge.position.set(side*.154,.489,.800);hall.add(hinge);
  const fold=new T.Group();fold.name='qinian-inner-door-pivot';
  const stride=.077;
  fold.position.x=-side*stride;hinge.add(fold);
  joinery.addDoorLeaf(hinge,-side*stride/2,0,0);
  joinery.addDoorLeaf(fold,-side*stride/2,0,0,-side);
  hinges.push({side,hinge,fold});
 }
 let open=false,progress=0;
 return {
  light,
  hinges:hinges.map(({hinge})=>hinge),
  get open(){return open;},
  toggle(){open=!open;},
  reset(){open=false;progress=0;for(const {hinge,fold} of hinges){hinge.rotation.y=0;fold.rotation.y=0;}},
  update(dt){
   const next=T.MathUtils.damp(progress,open?1:0,9,dt);
   if(Math.abs(progress-next)<.000001)return false;
   progress=next;
   for(const {side,hinge,fold} of hinges){
    hinge.rotation.y=-side*progress*1.46;
    fold.rotation.y=side*progress*2.69;
   }
   return true;
  },
 };
}
