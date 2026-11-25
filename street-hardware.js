// Miniature street hardware: the existing curved silver pole is the lamp
// reference; traffic camera proportions follow the saved Hikvision photo.
const cache=new WeakMap();
function resources(T){
 if(cache.has(T))return cache.get(T);
 const r={
  metal:new T.MeshStandardMaterial({color:'#939c97',roughness:.43,metalness:.52}),
  body:new T.MeshStandardMaterial({color:'#d9dbd3',roughness:.36,metalness:.28}),
  dark:new T.MeshStandardMaterial({color:'#26322e',roughness:.56,metalness:.16}),
  glass:new T.MeshPhysicalMaterial({color:'#263c43',roughness:.12,metalness:.28,clearcoat:.7}),
  led:new T.MeshStandardMaterial({color:'#eee8cd',roughness:.3,emissive:'#fff0cb',emissiveIntensity:.16})
 };cache.set(T,r);return r;
}
function mesh(T,parent,geometry,material,x,y,z){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}

export function createRoadLamp(T,x,z,towardX,towardZ){
 const r=resources(T),g=new T.Group();g.name='road-facing-curved-lamp';
 g.position.set(x,.08,z);g.rotation.y=Math.atan2(towardX,towardZ);
 g.userData.roadDirection=[towardX,0,towardZ];
 const curve=new T.CatmullRomCurve3([
  new T.Vector3(0,0,0),new T.Vector3(0,.49,0),new T.Vector3(0,.69,.015),
  new T.Vector3(0,.77,.10),new T.Vector3(0,.78,.30),new T.Vector3(0,.77,.53)
 ]);
 mesh(T,g,new T.TubeGeometry(curve,30,.011,7,false),r.metal,0,0,0);
 mesh(T,g,new T.CylinderGeometry(.024,.029,.09,8),r.metal,0,.045,0);
 mesh(T,g,new T.BoxGeometry(.067,.030,.15),r.metal,0,.756,.57);
 const lens=mesh(T,g,new T.BoxGeometry(.052,.005,.12),r.led,0,.738,.57);
 lens.name='downward-road-lamp-lens';lens.userData.emissionDirection=[0,-1,0];
 return g;
}

export function addSignalCamera(T,signal,headOffset){
 const r=resources(T),g=new T.Group();g.name='traffic-enforcement-camera';
 g.position.set(headOffset-.16,1.01,0);signal.add(g);
 // Two steel straps secure the bracket to the horizontal round signal arm.
 for(const x of [-.028,.028]){const clamp=mesh(T,g,new T.TorusGeometry(.028,.0035,5,12),r.metal,x,0,0);clamp.rotation.y=Math.PI/2;}
 mesh(T,g,new T.BoxGeometry(.082,.013,.057),r.metal,0,.036,0);
 mesh(T,g,new T.CylinderGeometry(.009,.012,.064,8),r.metal,0,.067,0);
 mesh(T,g,new T.SphereGeometry(.018,8,6),r.metal,0,.103,0);
 const housing=new T.Group();housing.position.set(0,.138,.008);housing.rotation.x=.20;g.add(housing);
 mesh(T,housing,new T.BoxGeometry(.098,.073,.178),r.body,0,0,0);
 mesh(T,housing,new T.BoxGeometry(.106,.009,.205),r.body,0,.043,.012);
 mesh(T,housing,new T.BoxGeometry(.089,.063,.008),r.dark,0,0,.094);
 const lens=mesh(T,housing,new T.CylinderGeometry(.022,.022,.007,16),r.glass,0,.007,.101);lens.rotation.x=Math.PI/2;lens.name='traffic-camera-lens';
 for(const x of [-.025,0,.025]){const ir=mesh(T,housing,new T.CylinderGeometry(.006,.006,.005,8),r.led,x,-.020,.101);ir.rotation.x=Math.PI/2;}
 const cable=new T.CatmullRomCurve3([new T.Vector3(0,.12,-.07),new T.Vector3(-.04,.075,-.08),new T.Vector3(-.05,.01,-.01)]);
 mesh(T,g,new T.TubeGeometry(cable,10,.004,5,false),r.dark,0,0,0);
 return g;
}
