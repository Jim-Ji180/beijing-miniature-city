// Proportions and layered clothing follow the supplied sidewalk walking reference.
const cache=new WeakMap();

function resources(T){
  if(cache.has(T))return cache.get(T);
  const cloth=color=>new T.MeshStandardMaterial({color,roughness:.94});
  const ovalProfile=(profile,depth,segments=10)=>new T.LatheGeometry(
    profile.map(([radius,y])=>new T.Vector2(radius,y)),segments).scale(1,1,depth);
  const data={
    shirts:['#536970','#925c46','#aa9b79','#64745b','#9da4a0','#6c7184','#a5805a'].map(cloth),
    pants:['#41494b','#565952','#544c46','#41484d'].map(cloth),
    skin:['#bb8e72','#d1ac91','#a2745e','#c69675'].map(cloth),
    hair:['#39322d','#514139','#6e5241'].map(cloth),
    shoe:cloth('#333735'),sole:cloth('#4e4940'),strap:cloth('#3c403b'),pack:cloth('#655747'),
    head:new T.SphereGeometry(.022,12,8).scale(.91,1.16,.97),
    nose:new T.SphereGeometry(.0045,7,5).scale(.8,.85,1.2),
    hairGeo:new T.SphereGeometry(.023,12,7,0,Math.PI*2,0,Math.PI*.51).scale(1,1.08,1),
    torso:ovalProfile([[0,0],[.029,0],[.027,.026],[.033,.059],[.032,.074],[.019,.084],[0,.084]],.65),
    collar:ovalProfile([[.010,0],[.017,0],[.016,.007],[.010,.007]],.83),
    neck:new T.CylinderGeometry(.009,.010,.017,8),
    upperArm:ovalProfile([[0,0],[.009,0],[.012,.024],[.011,.036],[0,.042]],.93,8),
    foreArm:ovalProfile([[0,0],[.007,0],[.009,.026],[0,.034]],.95,8),
    hand:new T.SphereGeometry(.0065,7,5).scale(.80,1.25,.80),
    leg:ovalProfile([[0,0],[.010,0],[.013,.050],[.015,.097],[.013,.111],[0,.111]],.83,8),
    shoeGeo:new T.SphereGeometry(1,10,6).scale(.0105,.0077,.017),
    soleGeo:new T.SphereGeometry(1,10,6).scale(.010,.003,.017),
    seam:new T.BoxGeometry(.0015,.067,.0006),
    backpack:new T.SphereGeometry(1,10,7).scale(.021,.032,.013),
    shoulderStrap:new T.BoxGeometry(.004,.047,.002),
  };
  cache.set(T,data);
  return data;
}

export function createStreetPerson(T,i){
  const a=resources(T),group=new T.Group();
  group.name='walking-city-person';
  function add(geo,mat,parent,x,y,z){
    const mesh=new T.Mesh(geo,mat);
    mesh.position.set(x,y,z);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    parent.add(mesh);
    return mesh;
  }
  const shirt=a.shirts[i%a.shirts.length],pants=a.pants[(i*3)%a.pants.length];
  const skin=a.skin[(i*13)%a.skin.length],hair=a.hair[(i*5)%a.hair.length];
  add(a.torso,shirt,group,0,.119,0);
  add(a.collar,shirt,group,0,.198,0);
  add(a.neck,skin,group,0,.205,0);
  add(a.head,skin,group,0,.230,0);
  add(a.nose,skin,group,0,.227,.020);
  add(a.hairGeo,hair,group,0,.235,-.002);
  if(i%3!==0)add(a.seam,a.strap,group,0,.156,.020);
  if(i%4===0){
    add(a.backpack,a.pack,group,0,.158,-.020);
    for(const side of [-1,1])add(a.shoulderStrap,a.strap,group,side*.018,.173,.015);
  }
  for(const side of [-1,1]){
    const arm=add(a.upperArm,shirt,group,side*.037,.149,0);
    arm.rotation.z=-side*.16;
    const forearm=add(a.foreArm,shirt,group,side*.042,.121,.003);
    forearm.rotation.x=-.20;
    add(a.hand,skin,group,side*.043,.116,.010);
  }
  const legs=[];
  for(const side of [-1,1]){
    const hip=new T.Group();
    hip.position.set(side*.015,.115,0);
    group.add(hip);
    add(a.leg,pants,hip,0,-.109,0);
    add(a.shoeGeo,a.shoe,hip,0,-.115,.006);
    add(a.soleGeo,a.sole,hip,0,-.122,.006);
    legs.push(hip);
  }
  return {group,legs};
}
