// Broad green patches and close-up blades follow the supplied park footage.
const applied=new WeakSet();

// Warm, shallow planting strips sit on the park side of the promenade.
// The center approach to the temple remains open from the southern edge.
const foregroundBeds=[
  [-4.62,-1.73,7.02,.201],[-4.56,-1.82,8.15,.190],
  [1.72,3.60,7.03,.206],[4.19,6.13,7.03,.202],
  [1.76,3.58,8.17,.192],[4.24,6.10,8.17,.183],
  [7.33,10.29,7.04,.201],[7.41,10.28,8.15,.194],
].map(([left,right,z,halfDepth])=>[(left+right)/2,z,(right-left)/2,halfDepth]);

function bedDistance(x,z){
  let distance=1;
  for(const [cx,cz,hw,hd] of foregroundBeds){
    const dx=Math.abs(x-cx)-hw+.055,dz=Math.abs(z-cz)-hd+.055;
    const rounded=Math.hypot(Math.max(dx,0),Math.max(dz,0))+Math.min(Math.max(dx,dz),0)-.055;
    distance=Math.min(distance,rounded);
  }
  return distance;
}

const sandBedCode=foregroundBeds.map(([cx,cz,hw,hd])=>
  `bedDist=min(bedDist,turfRoundedBed(vTurf-vec2(${cx.toFixed(3)},${cz.toFixed(3)}),vec2(${hw.toFixed(3)},${hd.toFixed(3)})));`
).join('\n');


function textureTurf(material) {
  if(applied.has(material)) return;
  applied.add(material);
  const original=material.onBeforeCompile;
  material.customProgramCacheKey=()=>'city-turf-v8';
  material.onBeforeCompile=function(shader,renderer){
    original.call(this,shader,renderer);
    shader.vertexShader='varying vec2 vTurf;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vTurf=(modelMatrix*vec4(position,1.)).xz;
    `);
    shader.fragmentShader=`
      varying vec2 vTurf;
      float turfRoundedBed(vec2 p,vec2 boxSize){
        vec2 q=abs(p)-boxSize+vec2(.055);
        return length(max(q,0.))+min(max(q.x,q.y),0.)-.055;
      }
      float turfHash(vec2 p){return fract(sin(dot(p,vec2(23.722,74.173)))*51836.287);}
      float turfNoise(vec2 p){
        vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(turfHash(i),turfHash(i+vec2(1.,0.)),f.x),
          mix(turfHash(i+vec2(0.,1.)),turfHash(i+1.),f.x),f.y);
      }
    `+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      float variation=turfNoise(vTurf*5.3);
      vec2 fine=vTurf*vec2(138.,70.);
      float available=1.-smoothstep(.28,.82,max(length(dFdx(fine)),length(dFdy(fine))));
      float fibers=(turfNoise(fine)-.5)*available;
      float intermediate=turfNoise(vTurf*30.)-.5;
      diffuseColor.rgb*=.965+.077*variation+.038*fibers+.022*intermediate;
      float bedDist=2.;
      if(vTurf.y>6.63){
        ${sandBedCode}
        float blendWidth=clamp(fwidth(vTurf.x)+fwidth(vTurf.y),.002,.024);
        float bed=1.-smoothstep(-blendWidth,blendWidth,bedDist);
        float edging=smoothstep(-.024,-.009,bedDist);
        vec3 decomposedStone=vec3(.398,.300,.180)*(.91+.160*variation+.096*fibers+.053*intermediate);
        vec3 edgingStone=vec3(.538,.426,.281)*(.96+variation*.078);
        diffuseColor.rgb=mix(diffuseColor.rgb,mix(decomposedStone,edgingStone,edging),bed);
      }
    `);
  };
  material.needsUpdate=true;
}

export function applyCityTurf(scene){
  scene.traverse(object=>{
    if(object.userData.cityTurf||object.name.startsWith('north-green-precinct-'))textureTurf(object.material);
  });
}

export function createTurfTufts(T, patches){
  const positions=[],colors=[],palette=['#617b44','#577344','#6e8749','#777f4e','#547047'].map(c=>new T.Color(c));
  let seed=23685;
  const r=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function blade(x,y,z,height,angle,width,color){
    const a=Math.cos(angle),b=Math.sin(angle),lean=height*(.35+r()*.54);
    const point=(rise,offset,bend)=>[x+a*offset-b*bend,y+height*rise,z+b*offset+a*bend];
    const rootL=point(0,-width,0), rootR=point(0,width,0);
    const midL=point(.53,-width*.54,lean*.38),midR=point(.53,width*.54,lean*.38);
    const tip=point(1,0,lean);
    positions.push(...rootL,...rootR,...midL,...rootR,...midR,...midL,...midL,...midR,...tip);
    for(const shade of [.65,.70,.91,.70,.92,.91,.91,.92,1.11])colors.push(color.r*shade,color.g*shade,color.b*shade);
  }
  for(const {x,z,w,d,y,skip} of patches){
    const count=Math.round(w*d*274);
    for(let i=0;i<count;i++){
      const px=x+(r()-.5)*(w-.045),pz=z+(r()-.5)*(d-.045);
      if(skip?.(px,pz)||(pz>6.63&&bedDistance(px,pz)<.014))continue;
      const variation=Math.sin(7.2*px+8.3*pz)*Math.cos(7.5*pz-5.3*px);
      if(r()<(.42-variation*.105))continue;
      const color=palette[Math.floor(r()*palette.length)];
      const size=.005+Math.pow(r(),2)*.013+Math.max(0,variation)*.004;
      for(let j=0;j<3;j++){
        const angle=r()*Math.PI*2,spread=r()*.015;
        blade(px+spread*Math.cos(angle),y,pz+spread*Math.sin(angle),size*(.62+r()*.55),
          angle,.00072+r()*.00105,color);
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  const cover=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1}));
  cover.name='lawn-grass-tufts';
  cover.receiveShadow=true;
  return cover;
}

// Broken soil edges expose the root flare, with leaf litter confined to the planted beds.
export function createRootLitter(T,trees) {
  const cover=new T.Group();cover.name='root flares and leaf litter';
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(96,96);
  let state=21140;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  for(let y=0;y<96;y++)for(let x=0;x<96;x++){
    const u=(x-48)/47,v=(y-48)/47,r=Math.hypot(u,v);
    const edge=.70+.09*Math.sin(Math.atan2(v,u)*5)+.06*Math.cos(Math.atan2(v,u)*9);
    const shade=random(),j=(y*96+x)*4;
    image.data.set([79+35*shade,66+30*shade,40+23*shade,
      Math.round(218*T.MathUtils.clamp((edge-r)*3.8,0,1)*(.82+shade*.18))],j);
  }
  ctx.putImageData(image,0,0);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const plane=new T.PlaneGeometry(1,1);plane.rotateX(-Math.PI/2);
  const soil=new T.InstancedMesh(plane,new T.MeshStandardMaterial({map,transparent:true,opacity:.43,depthWrite:false,roughness:1}),trees.length);
  const leaf=new T.BufferGeometry();
  leaf.setAttribute('position',new T.Float32BufferAttribute([
    -.6,0,0,-.27,0,-.45,.25,.010,-.37,.64,0,0,.24,0,.37,-.27,0,.46,0,.10,0,
  ],3));
  leaf.setIndex([0,6,1,1,6,2,2,6,3,3,6,4,4,6,5,5,6,0]);
  leaf.computeVertexNormals();
  const leaves=new T.InstancedMesh(leaf,new T.MeshStandardMaterial({color:'#fff',roughness:1}),trees.length*8);
  const pose=new T.Object3D(),colors=['#64713e','#56553a','#696e3b','#796644'].map(hex=>new T.Color(hex));
  trees.forEach(({x,z,size},i)=>{
    pose.position.set(x,.076,z);
    pose.rotation.y=random()*Math.PI;
    pose.scale.set(size*.82,1,size*.73);
    pose.updateMatrix();soil.setMatrixAt(i,pose.matrix);
    for(let j=0;j<8;j++){
      const angle=random()*Math.PI*2,dist=size*(.13+random()*.42);
      pose.position.set(x+Math.cos(angle)*dist,.077+j*.000035,z+Math.sin(angle)*dist);
      pose.rotation.y=angle+random();
      pose.scale.set(.010+random()*.014,.009,.007+random()*.008);
      pose.updateMatrix();leaves.setMatrixAt(i*8+j,pose.matrix);
      leaves.setColorAt(i*8+j,colors[Math.floor(random()*colors.length)]);
    }
  });
  soil.receiveShadow=leaves.receiveShadow=true;
  cover.add(soil,leaves);
  return cover;
}

// Low, rooted groups of leathery leaves. Each group has stems from one root
// instead of several cards positioned at different heights above the soil.
const bedResources=new WeakMap();
function plantBedResources(T){
  if(bedResources.has(T))return bedResources.get(T);
  const geometry=new T.BufferGeometry(),positions=[],indices=[],colors=[];
  for(let i=0;i<7;i++){
    const angle=i*2.399963,dx=Math.cos(angle),dz=Math.sin(angle);
    const span=.014+(i%4)*.003,height=.018+(i%3)*.005,width=.0031+(i%4)*.00066;
    const start=positions.length/3;
    for(const [length,up,edge,shade] of [
      [0,0,0,.68],[.32,.55,-.74,.83],[.72,.91,-.88,.93],[1,.89,0,1.06],
      [.75,.91,.82,.96],[.29,.55,.70,.88],[.63,1.02,0,1.02],
    ]){
      positions.push(dx*span*length-dz*width*edge,height*up,dz*span*length+dx*width*edge);
      colors.push(shade,shade,shade);
    }
    for(let j=0;j<6;j++)indices.push(start+j,start+6,start+(j+1)%6);
  }
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({color:'#fff',roughness:.92,side:T.DoubleSide,vertexColors:true});
  const data={geometry,material};
  bedResources.set(T,data);
  return data;
}

export function createPlantedBedFoliage(T,beds){
  const {geometry,material}=plantBedResources(T);
  const planting=[],pose=new T.Object3D(),color=new T.Color();
  for(const {x,z,w,d,y} of beds){
    let state=(Math.floor(13621*x+68101*z)^353191)>>>0;
    const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
    const stride=.035+rand()*.005;
    for(let dx=.026-w*.5;dx<w*.5-.024;dx+=stride)for(let dz=.026-d*.5;dz<d*.5-.022;dz+=stride){
      const patch=.69+.19*Math.sin(dx*22+dz*16)+.09*Math.cos(dx*31-dz*19);
      if(rand()>patch)continue;
      const size=.62+rand()*.68;
      pose.position.set(x+dx+(rand()-.5)*.015,y,z+dz+(rand()-.5)*.015);
      pose.rotation.set(0,rand()*Math.PI*2,0);
      pose.scale.set(size,size*(.82+rand()*.34),size);
      pose.updateMatrix();
      color.setHSL(.211+rand()*.043,.243+rand()*.123,.238+rand()*.114);
      planting.push([pose.matrix.clone(),color.clone()]);
    }
  }
  const foliage=new T.InstancedMesh(geometry,material,planting.length);
  planting.forEach(([matrix,tone],i)=>{foliage.setMatrixAt(i,matrix);foliage.setColorAt(i,tone)});
  foliage.name='low-rooted-bed-foliage';
  foliage.receiveShadow=true;
  foliage.computeBoundingSphere();
  return foliage;
}
