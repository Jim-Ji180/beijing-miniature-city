import { addSurfaceFinish } from './street-realism.js?v=1';
import { createPlantedBedFoliage } from './city-turf.js?v=7';
// CCTV landscape study: the paths and low planted pockets are inspired by
// Inside Outside's CCTV landscape; rooftop-garden pattern is an influence,
// not a claim that the pictured garden is at street level.
// Coordinates stay in the strip east of the original building and west of
// the office parcels. Existing tall trees and the main entrance stay clear.
export function createCctvCampus(T){
 const g=new T.Group();g.name='cctv-campus-landscape';
 const material=(color)=>new T.MeshStandardMaterial({color,roughness:1});
 const stone=material('#c1b7a4'),joint=new T.LineBasicMaterial({color:'#9fa69e',transparent:true,opacity:.48}),dark=material('#a28e6a'),border=material('#c8b99f');
 function slab(x,z,w,d,y,mat){const m=new T.Mesh(new T.BoxGeometry(w,.012,d),mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=false;g.add(m)}
 // A flush stone threshold links the broad plaza to the existing axial
 // pedestrian path. It stops before the two pre-existing flower beds and
 // the roadside lawn; no furniture or planting occupies the walking route.
 const plazaEdge=material('#c3c9c3');
 function paving(x,z,w,d){const m=new T.Mesh(new T.PlaneGeometry(w,d),plazaEdge);m.rotation.x=-Math.PI/2;m.position.set(x,.082,z);m.receiveShadow=true;g.add(m)}
 paving(3.80,-3.00,4.44,.14);
 paving(3.80,-2.81,1.10,.24);
 const thresholdJoints=[];
 for(let x=1.68;x<6.02;x+=.16)thresholdJoints.push(new T.Vector3(x,.083,-3.07),new T.Vector3(x,.083,-2.93));
 for(let x=3.33;x<4.34;x+=.16)thresholdJoints.push(new T.Vector3(x,.083,-2.93),new T.Vector3(x,.083,-2.69));
 thresholdJoints.push(new T.Vector3(1.58,.083,-3.07),new T.Vector3(6.02,.083,-3.07));
 g.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(thresholdJoints),joint));
 // A thin continuous garden-side route, linked to the public walk at the south.
 slab(6.99,-5.12,.22,3.76,.082,stone);
 // Shift east at the southern end to avoid the existing sidewalk tree at
 // (6.95, -2.55), then meet the northern edge of the public sidewalk.
 slab(6.99,-3.185,.22,.11,.082,stone);slab(7.08,-3.04,.40,.18,.082,stone);
 slab(7.19,-2.575,.18,.75,.082,stone);
 const lines=[];for(let z=-6.96;z<=-3.26;z+=.16)lines.push(new T.Vector3(6.88,.090,z),new T.Vector3(7.10,.090,z));
 g.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(lines),joint));
 // Low plants remain inside the three frames beside the east-side route.
 const beds=[[-5.86,.42],[-4.58,.38],[-3.36,.31]];
 for(const [z,d] of beds){
  slab(6.62,z,.34,d,.083,border);slab(6.62,z,.30,d-.04,.092,dark);
 }
 g.add(createPlantedBedFoliage(T,beds.map(([z,d])=>({x:6.62,z,w:.29,d:d-.044,y:.098}))));
 return g;
}

// A scaled-down entrance bay on the south-facing plinth observed in the CCTV still.
export function addCctvLobby(T,model) {
  const entrance=new T.Group();entrance.name='CCTV south lobby threshold';
  entrance.position.set(.34,.015,1.911);
  model.traverse(mesh=>{
    if(!mesh.isMesh||!['cctv-glass','cctv-steel'].includes(mesh.material?.name))return;
    const material=mesh.material;
    const preceding=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
    material.customProgramCacheKey=()=>key()+'-recessed-cctv-entry-v1';
    material.onBeforeCompile=function(shader,renderer){
      preceding.call(this,shader,renderer);
      shader.vertexShader='varying vec3 vEntryLocal;\n'+shader.vertexShader.replace(
        '#include <begin_vertex>','#include <begin_vertex>\nvEntryLocal=position;');
      shader.fragmentShader='varying vec3 vEntryLocal;\n'+shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          if(abs(vEntryLocal.x-.34)<.34 && vEntryLocal.y<.292 && vEntryLocal.z>1.68) discard;
        `);
    };
  });
  model.add(entrance);
  const unit=new T.BoxGeometry();
  const mat=(color,roughness=.75,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const stone=mat('#777d80'),dark=mat('#343d43'),metal=mat('#8d9ba0',.49,.30);
  const wall=mat('#b5aaa0'),floor=mat('#767874'),matting=mat('#42494b');
  addSurfaceFinish(stone,'masonry');
  const glazing=new T.MeshPhysicalMaterial({color:'#6e959d',roughness:.26,metalness:.12,
    clearcoat:.43,transparent:true,opacity:.56,depthWrite:false});
  glazing.emissive.set('#d5a36d');
  glazing.emissiveIntensity=0;
  glazing.userData.nightEmission=.67;
  function piece(material,x,y,z,w,h,d) {
    const m=new T.Mesh(unit,material);
    m.position.set(x,y,z);m.scale.set(w,h,d);
    m.castShadow=!material.transparent;m.receiveShadow=true;entrance.add(m);
  }
  // An entrance sill spans the shell edge, then tapers down into the plaza.
  const apron=new T.BufferGeometry();
  apron.setAttribute('position',new T.Float32BufferAttribute([
    -.41,.057,.035, .41,.057,.035, -.41,.011,.38, .41,.011,.38,
  ],3));
  apron.setIndex([0,2,1,1,2,3]);apron.computeVertexNormals();
  const sill=new T.Mesh(apron,stone);sill.receiveShadow=true;entrance.add(sill);
  piece(dark,0,.173,-.343,.715,.287,.025);
  piece(wall,0,.163,-.325,.54,.198,.011);
  piece(floor,0,.037,-.170,.687,.035,.390);
  piece(matting,0,.057,-.095,.39,.005,.083);
  piece(dark,0,.275,-.172,.699,.026,.39);
  piece(metal,0,.322,.063,.82,.021,.246);
  piece(dark,0,.309,.067,.77,.010,.208);
  for(const x of [-.351,.351]){
    piece(stone,x,.151,-.152,.057,.266,.408);
    piece(metal,x,.287,.015,.034,.025,.220);
  }
  for(const x of [-.24,0,.24])piece(metal,x,.302,.064,.010,.008,.209);
  const interiorLight=mat('#e1d9c1');
  for(const x of [-.19,.19])piece(interiorLight,x,.295,.067,.029,.006,.099);
  for(const x of [-.21,-.071,.071,.21]){
    piece(glazing,x,.152,-.141,.131,.205,.009);
  }
  for(const x of [-.277,-.141,0,.141,.277])piece(metal,x,.152,-.133,.008,.217,.014);
  piece(metal,0,.053,-.132,.54,.011,.016);
  piece(metal,0,.259,-.134,.55,.014,.017);
  for(const x of [-.032,.032])piece(metal,x,.148,-.124,.008,.037,.011);
  return glazing;
}
