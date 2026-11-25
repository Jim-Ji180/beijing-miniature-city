// Wall-root chrysanthemums and an original pedal cargo tricycle. Reference:
// https://theheartthrills.com/2013/01/29/tricycle-workhorse-of-china/
// The gate at x=-6.75 and the continuous z=7.81..8.11 footway stay clear.
export function createHutongFrontGarden(T) {
 const g=new T.Group();g.name='hutong-front-flowers-and-pedal-tricycle';
 const mat=(color,roughness=.82,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const steel=mat('#4c6267',.89,.16),rim=mat('#635b4d',.81,.30),rubber=mat('#282622'),saddle=mat('#3e3328'),earth=mat('#695d49'),stone=mat('#ada99a');
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#455b62';ctx.fillRect(0,0,256,128);
 let wearSeed=109;const wearRandom=()=>{wearSeed=(Math.imul(wearSeed,1664525)+1013904223)>>>0;return wearSeed/4294967296;};
 for(let i=0;i<2100;i++){
  const x=wearRandom()*256,y=wearRandom()*128;
  ctx.fillStyle=y<10||y>100||i%11===0?'rgba(103,59,30,.45)':'rgba(143,138,106,.16)';
  ctx.fillRect(x,y,1+wearRandom()*10,1+wearRandom()*3);
 }
 for(let i=0;i<6;i++){
  ctx.strokeStyle='#96764f55';ctx.beginPath();const y=25+wearRandom()*73;
  ctx.moveTo(wearRandom()*80,y);ctx.lineTo(135+wearRandom()*120,y-5+wearRandom()*8);ctx.stroke();
 }
 const patina=new T.CanvasTexture(canvas);patina.colorSpace=T.SRGBColorSpace;patina.anisotropy=4;
 const bed=new T.MeshStandardMaterial({map:patina,roughness:.94,metalness:.12});
 const boxGeo=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,8,6),tubeGeo=new T.CylinderGeometry(1,1,1,7);
 function mesh(parent,geo,m,x,y,z,sx=1,sy=1,sz=1){const q=new T.Mesh(geo,m);q.position.set(x,y,z);q.scale.set(sx,sy,sz);q.castShadow=q.receiveShadow=true;parent.add(q);return q}
 function box(p,x,y,z,w,h,d,m){return mesh(p,boxGeo,m,x,y,z,w,h,d)}
 const vY=new T.Vector3(0,1,0);function rod(p,a,b,r,m){const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);const q=mesh(p,tubeGeo,m,...av.add(bv).multiplyScalar(.5).toArray(),r,delta.length(),r);q.quaternion.setFromUnitVectors(vY,delta.normalize());return q}
 // Thin planted border sits against the exterior wall, before the public footway.
 const edgeZ=7.715;box(g,-8.61,.097,edgeZ,2.64,.018,.115,earth);box(g,-8.61,.106,7.778,2.68,.025,.018,stone);
 const batches=new Map(),obj=new T.Object3D();function instance(key,geo,m,pos,scale,rot=[0,0,0]){let b=batches.get(key);if(!b){b={geo,m,transforms:[]};batches.set(key,b)}obj.position.set(...pos);obj.scale.set(...scale);obj.rotation.set(...rot);obj.updateMatrix();b.transforms.push(obj.matrix.clone())}
 const greens=[mat('#4f7540'),mat('#698643'),mat('#7c9447')],stemMat=mat('#4d713d'),petalMats=[mat('#e6be55'),mat('#e3cda0'),mat('#bf794e'),mat('#d3a0a0')],pollen=mat('#a37532');
 let seed=3209;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<43;i++){
  const x=-9.90+i*.061+(rand()-.5)*.022,z=edgeZ+(rand()-.5)*.056,h=.078+rand()*.084;
  instance('stem',tubeGeo,stemMat,[x,.11+h/2,z],[.0025,h,.0025]);
  for(let j=0;j<4;j++){const side=j%2?1:-1;instance('leaf'+j%3,sphere,greens[j%3],[x+side*.017,.12+h*.37+j*.011,z+(j-1.5)*.008],[.025,.008,.013],[0,rand()*Math.PI,side*.4])}
  const petal=i%13===0?3:i%5===0?2:i%3===0?1:0,flowerY=.11+h;
  for(let j=0;j<8;j++){const a=j*Math.PI/4,r=.016;instance('petal'+petal,sphere,petalMats[petal],[x+Math.cos(a)*r,flowerY,z+Math.sin(a)*r],[.015,.006,.009],[0,-a,0])}
  instance('pollen',sphere,pollen,[x,flowerY+.005,z],[.009,.007,.009]);
 }
 for(const [key,b] of batches){const im=new T.InstancedMesh(b.geo,b.m,b.transforms.length);im.name='wall-flower-'+key;b.transforms.forEach((m,i)=>im.setMatrixAt(i,m));im.castShadow=im.receiveShadow=true;g.add(im)}
 const bike=new T.Group();bike.name='pedal-cargo-tricycle';bike.position.set(-8.58,.09,8.18);bike.scale.setScalar(.52);g.add(bike);
 const wheelGeo=new T.TorusGeometry(.115,.009,7,32),rimGeo=new T.TorusGeometry(.106,.0027,5,32);
 function wheel(x,z){mesh(bike,wheelGeo,rubber,x,.124,z);mesh(bike,rimGeo,rim,x,.13,z);rod(bike,[x,.13,z-.018],[x,.13,z+.018],.013,rim);for(let j=0;j<24;j++){const a=j*Math.PI/12;rod(bike,[x+Math.cos(a+.8)*.013,.13+Math.sin(a+.8)*.013,z+(j%2?.008:-.008)],[x+Math.cos(a)*.106,.13+Math.sin(a)*.106,z],.001,rim)}}
 wheel(-.34,0);wheel(.28,-.18);wheel(.28,.18);
 // Rear axle and load-bearing rails, with the bicycle frame visible between cargo and fork.
 rod(bike,[.28,.13,-.18],[.28,.13,.18],.011,steel);
 for(const z of [-.115,.115]){rod(bike,[-.06,.13,0],[.35,.17,z],.009,steel);rod(bike,[.02,.30,0],[.28,.13,z],.008,steel)}
 const crank=[-.055,.145,0],seat=[.005,.355,0],head=[-.275,.34,0],front=[-.34,.13,0];
 for(const [a,b] of [[crank,seat],[[-.016,.287,0],[-.281,.294,0]],[head,crank],[crank,[.28,.13,0]]])rod(bike,a,b,.007,steel);
 for(const z of [-.021,.021])rod(bike,[-.275,.36,z],[-.34,.13,z],.0065,steel);
 rod(bike,[.005,.30,0],[.005,.392,0],.008,rim);mesh(bike,sphere,saddle,-.004,.403,0,.071,.017,.049);
 rod(bike,[-.275,.34,0],[-.265,.43,0],.007,rim);for(const side of [-1,1]){rod(bike,[-.265,.43,0],[-.251,.449,side*.063],.005,rim);rod(bike,[-.251,.449,side*.063],[-.220,.442,side*.103],.005,rim);}
 for(const side of [-1,1])rod(bike,[-.232,.444,side*.082],[-.214,.439,side*.109],.007,rubber);
 // Open steel cargo bed, top rails and pressed panel ribs; there is no motor.
 box(bike,.285,.238,0,.43,.022,.314,bed);
 for(const z of [-.158,.158]){box(bike,.285,.298,z,.43,.105,.011,bed);rod(bike,[.07,.353,z],[.5,.353,z],.006,steel);for(const x of [.09,.285,.48])box(bike,x,.298,z*1.04,.008,.15,.006,steel)}
 for(const x of [.07,.50]){box(bike,x,.298,0,.011,.105,.314,bed);rod(bike,[x,.353,-.158],[x,.353,.158],.006,steel)}
 for(const z of [-.12,-.06,0,.06,.12])box(bike,.285,.251,z,.40,.006,.002,steel);
 for(const x of [.09,.48])for(const z of [-.166,.166])mesh(bike,sphere,rim,x,.323,z,.004,.004,.003);
 // Functional pedal details: crank arms, chainring, rear sprocket and chain run.
 const ring=new T.TorusGeometry(.035,.0035,5,20);mesh(bike,ring,rim,-.055,.145,.034);mesh(bike,new T.TorusGeometry(.021,.003,5,16),steel,.28,.13,.034);
 rod(bike,[-.055,.178,.034],[.28,.151,.034],.0025,steel);rod(bike,[-.055,.112,.034],[.28,.109,.034],.0025,steel);
 for(const s of [-1,1]){rod(bike,[-.055,.145,s*.038],[-.055+s*.044,.145+s*.021,s*.052],.004,rim);box(bike,-.055+s*.044,.145+s*.021,s*.066,.035,.009,.027,rubber)}
 g.userData={flowerBedBounds:{min:[-9.96,.09,7.65],max:[-7.23,.30,7.79]},tricycleBounds:new T.Box3().setFromObject(bike,true),gateClearance:{x:[-7.14,-6.36],z:[7.59,8.12]},reference:'https://theheartthrills.com/2013/01/29/tricycle-workhorse-of-china/'};
 return g;
}
