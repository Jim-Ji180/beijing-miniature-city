// The reference reads as connected foliage masses with small scallops along
// their outline and graphic, cool shadow patches inside the canopy.
const shared = new WeakMap();
const profiles = [
  { name:'spreading deciduous', count:8, spread:.76, skirt:1.16, peak:1.96, pad:.43, depth:.32, tones:['#50893e','#578e40','#4d8740'] },
  { name:'rounded ginkgo', count:7, spread:.63, skirt:1.25, peak:2.16, pad:.37, depth:.37, tones:['#628943','#628e42','#598e43'] },
  { name:'layered evergreen', count:9, spread:.62, skirt:1.16, peak:2.22, pad:.37, depth:.25, tones:['#3d7648','#427c47','#407747'] },
  { name:'slender poplar', count:6, spread:.31, skirt:1.30, peak:2.42, pad:.30, depth:.42, tones:['#4a8544','#528644','#4c7e44'] },
  { name:'open irregular deciduous', count:8, spread:.66, skirt:1.17, peak:2.15, pad:.39, depth:.30, tones:['#578f3c','#4e8d43','#578743'] },
];

function lobedGeometry(T, variant) {
  const geometry = new T.IcosahedronGeometry(1, 3);
  const position = geometry.getAttribute('position');
  const colors = [];
  const phase = variant * 1.817;
  for (let i=0;i<position.count;i++) {
    const x=position.getX(i), y=position.getY(i), z=position.getZ(i);
    const main=Math.sin(x*5.5+y*2.7+phase)*Math.cos(z*6.5-y*4.6+1.3);
    const scallop=Math.sin(x*12.4-y*11.3+z*7.1+phase)*Math.cos(z*13.2+y*8.7);
    const radius=1+.15*main+.055*scallop;
    position.setXYZ(i,x*radius,y*radius,z*radius);
    const upper=T.MathUtils.smoothstep(y+.30*main,-.64,.51);
    colors.push(.69+upper*.30,.78+upper*.22,1.08-upper*.09);
  }
  // Average coincident normals so a lighting band crosses a leaf cluster
  // intact instead of breaking up along its triangle edges.
  const normal=geometry.getAttribute('normal');
  const sums=new Map();
  for(let i=0;i<position.count;i+=3){
    const a=new T.Vector3().fromBufferAttribute(position,i);
    const b=new T.Vector3().fromBufferAttribute(position,i+1);
    const c=new T.Vector3().fromBufferAttribute(position,i+2);
    const face=b.sub(a).cross(c.sub(a));
    for(let corner=i;corner<i+3;corner++){
      const key=position.getX(corner).toFixed(4)+'/'+position.getY(corner).toFixed(4)+'/'+position.getZ(corner).toFixed(4);
      if(!sums.has(key))sums.set(key,{vector:new T.Vector3(),indices:[]});
      const entry=sums.get(key);
      entry.vector.add(face);
      entry.indices.push(corner);
    }
  }
  for(const {vector,indices} of sums.values()){
    vector.normalize();
    for(const index of indices)normal.setXYZ(index,vector.x,vector.y,vector.z);
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.computeBoundingSphere();
  return geometry;
}

function resources(T) {
  if (shared.has(T)) return shared.get(T);
  const wood = new T.CylinderGeometry(.47,1,1,7);
  const bark = new T.MeshStandardMaterial({color:'#624b3b',roughness:1});
  const foliage = new T.MeshToonMaterial({color:'#fff',vertexColors:true});
  foliage.name='Three-band painted foliage';
  foliage.customProgramCacheKey=()=> 'illustrated-canopy-v20';
  foliage.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vCanopyPaint;\n'+shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvCanopyPaint=position;'
    );
    shader.fragmentShader='varying vec3 vCanopyPaint;\n'+shader.fragmentShader.replace(
      '#include <gradientmap_pars_fragment>',
      `float patchPigment(vec3 p) {
        vec3 q=vec3(p.x+p.z*.3,p.y-p.x*.4,p.z+p.y*.3);
        float leaf=sin(q.x*10.+q.y*6.)*sin(q.z*9.-q.y*7.)+cos(q.y*11.+q.z*4.)*.51;
        float broken=cos(q.z*18.+q.x*12.)*sin(q.y*17.-q.x*10.);
        return leaf+broken*.24;
      }
      vec3 getGradientIrradiance(vec3 n, vec3 lightDir) {
        float d=dot(n,lightDir);
        float footprint=max(length(dFdx(vCanopyPaint)),length(dFdy(vCanopyPaint)));
        float leafMark=patchPigment(vCanopyPaint)*(1.-smoothstep(.035,.13,footprint));
        float field=d+leafMark*.135;
        float width=clamp(fwidth(field)*.62,.012,.10);
        float halfTone=smoothstep(.06-width,.06+width,field);
        float fullTone=smoothstep(.48-width,.48+width,field);
        return mix(mix(vec3(.040,.105,.15),vec3(.49,.61,.57),halfTone),vec3(.92),fullTone);
      }`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float leafMark=patchPigment(vCanopyPaint);
      float footprint=max(length(dFdx(vCanopyPaint)),length(dFdy(vCanopyPaint)));
      float terms=1.-smoothstep(.055,.18,footprint);
      float lightInk=smoothstep(.33,.44,leafMark)-smoothstep(.13,.23,-leafMark)*.67;
      diffuseColor.rgb*=1.+lightInk*.095*terms;`
    ).replace(
      '#include <lights_fragment_end>',
      '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= vec3(.66,.79,.96);'
    );
  };
  const lobes=[lobedGeometry(T,0),lobedGeometry(T,1),lobedGeometry(T,2)];
  const result={wood,lobes,bark,foliage};
  shared.set(T,result);
  return result;
}

export function createDetailedTree(T,x,z,size,pink=false){
  const {wood,lobes,bark,foliage}=resources(T);
  const root=new T.Group();
  const vec=(a,b,c)=>new T.Vector3(a,b,c);
  root.name='branching-street-tree';
  root.position.set(x,0,z);
  let seed=(Math.abs(Math.floor(x*18331+z*39119))^0x45fa8c3)>>>0;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const between=(a,b)=>a+(b-a)*random();
  const index=pink?0:Math.floor(random()*profiles.length);
  const profile=profiles[index], spin=random()*Math.PI*2;
  const needle=index===2;
  const polar=(angle,range,height)=>vec(Math.cos(angle)*range,height,Math.sin(angle)*range);
  const throat=polar(spin,.072,profile.skirt*.52);
  const fork=polar(spin,between(.019,.12),profile.skirt*.85);
  const crownTop=polar(spin+.53,between(.04,.19),profile.peak-.08);
  const branches=[[vec(0,0,0),throat,.066],[throat,fork,.049],[fork,crownTop,.032]];
  const pads=[];
  root.scale.set(size*between(1.07,1.21),size*between(1.16,1.34),size*between(1.10,1.25));

  for(let i=0;i<4;i++){
    branches.push([vec(0,.065,0),polar(spin+i*1.56,between(.09,.17),.012),.026]);
  }
  const crownRadius=profile.pad;
  const crownHeight=profile.depth;
  const middle=(profile.skirt+profile.peak)*.5-.09;
  pads.push({
    at:throat.clone().lerp(crownTop,.72),
    width:crownRadius*1.63,height:crownHeight*1.51,light:-.13
  });
  for(let i=0;i<profile.count;i++){
    const tier=i/(profile.count-1), angle=spin+i*2.39996+between(-.22,.22);
    const reach=profile.spread*between(.73,.99)*(needle?1-tier*.58:.83+.18*Math.sin(tier*Math.PI));
    const y=needle?profile.skirt+.12+tier*(profile.peak-profile.skirt)*.82
      :middle+between(-.23,.18)+(tier-.5)*.35;
    const joint=polar(angle,reach*.48,y-between(.15,.28));
    const end=polar(angle,reach,y);
    branches.push([throat.clone().lerp(fork,between(.12,.52)),joint,between(.021,.035)]);
    branches.push([joint,end,between(.010,.019)]);
    pads.push({at:end.clone().add(vec(0,.018,0)),width:crownRadius*between(.77,.98),height:crownHeight*between(.77,1.0),light:between(-.13,-.024)});
    const shoot=polar(angle+between(-.54,.37),reach*between(.61,.89),y+between(.14,.30));
    branches.push([joint,shoot,.010]);
    pads.push({at:shoot,width:crownRadius*between(.55,.76),height:crownHeight*between(.51,.73),light:between(.015,.09)});
    // Smaller bunches overlap the parent on the outer and upper edges.
    // From above the combined silhouette reads as leaves, with no visible
    // gap between them or between the canopy and the lower crown.
    for(let j=0;j<3;j++){
      const turn=angle+(j-1)*between(.27,.46);
      const tip=end.clone().add(polar(turn,crownRadius*between(.48,.69),crownHeight*between(-.18,.67)));
      pads.push({at:tip,width:crownRadius*between(.34,.52),height:crownHeight*between(.36,.58),light:between(-.04,.09)});
    }
  }
  for(let i=0;i<3;i++){
    const at=crownTop.clone().add(polar(spin+i*2.39,between(.06,.23),between(-.10,.07)));
    pads.push({at,width:crownRadius*between(.70,.92),height:crownHeight*between(.68,.99),light:between(.055,.15)});
  }

  const object=new T.Object3D(), up=vec(0,1,0);
  const stems=new T.InstancedMesh(wood,bark,branches.length);
  branches.forEach(([start,end,width],i)=>{
    const direction=end.clone().sub(start);
    object.position.copy(start).lerp(end,.5);
    object.quaternion.setFromUnitVectors(up,direction.clone().normalize());
    object.scale.set(width,direction.length()+.005,width);
    object.updateMatrix();
    stems.setMatrixAt(i,object.matrix);
  });

  const base=new T.Color(pink?'#b99097':profile.tones[Math.floor(random()*profile.tones.length)]);
  const color=new T.Color();
  const crown=new T.InstancedMesh(lobes[index%lobes.length],foliage,pads.length);
  pads.forEach(({at,width,height,light},i)=>{
    object.position.copy(at);
    object.rotation.set(between(-.25,.25),random()*Math.PI*2,between(-.25,.25));
    object.scale.set(width*between(.87,1.14),height,width*between(.89,1.13));
    object.updateMatrix();
    crown.setMatrixAt(i,object.matrix);
    color.copy(base).multiplyScalar(1+light*1.04).offsetHSL(between(-.012,.012),0,0);
    crown.setColorAt(i,color);
  });
  for(const mesh of [stems,crown]){
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    root.add(mesh);
  }
  root.userData.treeProfile=profile.name;
  root.userData.branchSegments=branches.length;
  root.userData.crownInstances=pads.length;
  return root;
}
