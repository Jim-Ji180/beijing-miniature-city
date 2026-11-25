// A connected, three-dimensional cumulus bank built from an implicit surface.
// Visual references actually inspected: cloudbank-review/reference-tower-cloudbank.jpg
// and reference-sunlit-cloud.jpg. No cloud photograph or external model is drawn.
export function createSculptedCloudBank(T,sunDirection){
 const group=new T.Group();group.name='Sculpted three-dimensional cumulus bank';
 const lightDirection=(sunDirection||new T.Vector3(-16,17,13)).clone().normalize();
 // Large overlapping masses establish one cloud; smaller, irregular crests give
 // it a rounded upper silhouette and different depths, rather than a ball row.
 const lobes=[
  [-10.2,6.55,-6.5,2.65,1.08,1.65],[-6.55,6.62,-6.0,2.85,1.00,1.85],
  [-2.85,6.55,-6.3,2.80,1.07,1.75],[.9,6.7,-6.15,2.75,1.12,1.85],
  [4.55,6.65,-6.25,2.75,1.03,1.75],[8.25,6.62,-6.6,2.85,1.00,1.7],
  [10.55,6.5,-6.1,1.70,.95,1.50],
  [-10.5,7.22,-6.1,1.35,1.05,1.25],[-8.55,7.48,-6.7,1.55,1.25,1.35],
  [-7.3,7.08,-4.95,1.40,1.05,1.2],[-5.95,7.38,-6.05,1.40,1.05,1.4],
  [-4.30,7.13,-5.55,1.15,.90,1.05],[-2.65,7.30,-6.6,1.60,1.1,1.35],
  [-.75,7.5,-5.7,1.45,1.15,1.45],[1.05,7.48,-6.7,1.50,1.15,1.2],
  [2.65,7.1,-5.0,1.45,1.00,1.25],[4.65,7.52,-6.2,1.65,1.20,1.4],
  [6.55,7.13,-5.2,1.35,1.05,1.30],[8.1,7.45,-6.8,1.65,1.15,1.30],
  [10.25,7.05,-5.9,1.35,.95,1.2],
  [-11.15,6.1,-5.1,1.20,.78,1.10],[-9.3,6.05,-4.85,1.50,.85,1.15],
  [-5.9,6.15,-4.7,1.35,.82,1.2],[-2.1,6.04,-4.95,1.65,.85,1.15],
  [.85,6.15,-4.75,1.55,.88,1.10],[4.15,6.05,-4.75,1.55,.80,1.15],
  [7.5,6.0,-5.0,1.55,.82,1.15],[10.1,6.02,-4.85,1.35,.78,1.00],
  [-9.8,7.5,-5.25,.76,.72,.70],[-6.8,7.85,-6.15,.85,.68,.78],
  [-1.75,7.93,-5.8,.82,.63,.73],[3.7,7.97,-5.8,.87,.68,.80],
  [7.35,7.95,-6.05,.90,.65,.80]
 ];
 const blend=.42;
 function field(x,y,z){
  // Low-amplitude, smooth domain distortion prevents perfect ellipsoids while
  // keeping the mass coherent and its silhouette stable during slow drifting.
  const px=x+.11*Math.sin(y*3.1+z*1.7),py=y+.10*Math.sin(x*2.5-z*2.1),pz=z+.12*Math.sin(x*2.2+y*2.7);
  let distance=1e5;
  for(let i=0;i<lobes.length;i++){
   const l=lobes[i],a=(px-l[0])/l[3],b=(py-l[1])/l[4],c=(pz-l[2])/l[5];
   const d=(Math.sqrt(a*a+b*b+c*c)-1)*Math.min(l[3],l[4],l[5]);
   const h=Math.max(blend-Math.abs(distance-d),0)/blend;
   distance=Math.min(distance,d)-h*h*blend*.25;
  }
  return distance;
 }
 const bounds={min:[-13.5,4.75,-8.8],max:[13.2,9.15,-3.15]},nx=112,ny=28,nz=36;
 const sx=(bounds.max[0]-bounds.min[0])/nx,sy=(bounds.max[1]-bounds.min[1])/ny,sz=(bounds.max[2]-bounds.min[2])/nz;
 const row=nx+1,slice=row*(ny+1),values=new Float32Array(slice*(nz+1));
 const index=(x,y,z)=>x+row*y+slice*z;
 for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)values[index(x,y,z)]=field(bounds.min[0]+x*sx,bounds.min[1]+y*sy,bounds.min[2]+z*sz);
 const positions=[],normalData=[],triangles=[],edgeCache=new Map();
 const point=id=>{const z=Math.floor(id/slice),rest=id-z*slice,y=Math.floor(rest/row),x=rest-y*row;return [bounds.min[0]+x*sx,bounds.min[1]+y*sy,bounds.min[2]+z*sz]};
 function vertex(ia,ib){
  const key=ia<ib?ia+':'+ib:ib+':'+ia;const found=edgeCache.get(key);if(found!==undefined)return found;
  const a=point(ia),b=point(ib),t=values[ia]/(values[ia]-values[ib]);
  const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t,id=positions.length/3;
  positions.push(x,y,z);const e=.025;
  const gx=field(x+e,y,z)-field(x-e,y,z),gy=field(x,y+e,z)-field(x,y-e,z),gz=field(x,y,z+e)-field(x,y,z-e),length=Math.hypot(gx,gy,gz)||1;
  normalData.push(gx/length,gy/length,gz/length);edgeCache.set(key,id);return id;
 }
 function emit(a,b,c,inside){
  const ai=a*3,bi=b*3,ci=c*3,ab=[positions[bi]-positions[ai],positions[bi+1]-positions[ai+1],positions[bi+2]-positions[ai+2]],ac=[positions[ci]-positions[ai],positions[ci+1]-positions[ai+1],positions[ci+2]-positions[ai+2]];
  const cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
  const outward=cross[0]*(positions[ai]-inside[0])+cross[1]*(positions[ai+1]-inside[1])+cross[2]*(positions[ai+2]-inside[2]);
  if(outward>0)triangles.push(a,b,c);else triangles.push(a,c,b);
 }
 const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const ids=[index(x,y,z),index(x+1,y,z),index(x+1,y+1,z),index(x,y+1,z),index(x,y,z+1),index(x+1,y,z+1),index(x+1,y+1,z+1),index(x,y+1,z+1)];
  let negatives=0;for(const id of ids)if(values[id]<0)negatives++;if(negatives===0||negatives===8)continue;
  for(const tet of tets){
   const q=tet.map(i=>ids[i]),inside=[0,0,0];let count=0;for(const id of q)if(values[id]<0){const p=point(id);inside[0]+=p[0];inside[1]+=p[1];inside[2]+=p[2];count++}
   if(count===0||count===4)continue;for(let j=0;j<3;j++)inside[j]/=count;
   const cuts=[];for(const [a,b] of edges)if((values[q[a]]<0)!==(values[q[b]]<0))cuts.push(vertex(q[a],q[b]));
   if(cuts.length===3){emit(cuts[0],cuts[1],cuts[2],inside);continue}
   const center=[0,0,0];for(const id of cuts)for(let j=0;j<3;j++)center[j]+=positions[id*3+j]/4;
   const first=cuts[0]*3,axis=new T.Vector3(positions[first]-center[0],positions[first+1]-center[1],positions[first+2]-center[2]).normalize();
   const second=cuts[1]*3,third=cuts[2]*3;
   const n=new T.Vector3(positions[second]-positions[first],positions[second+1]-positions[first+1],positions[second+2]-positions[first+2]).cross(new T.Vector3(positions[third]-positions[first],positions[third+1]-positions[first+1],positions[third+2]-positions[first+2])).normalize();
   const tangent=new T.Vector3().crossVectors(n,axis);
   cuts.sort((a,b)=>{const angle=id=>{const j=id*3,p=new T.Vector3(positions[j]-center[0],positions[j+1]-center[1],positions[j+2]-center[2]);return Math.atan2(p.dot(tangent),p.dot(axis))};return angle(a)-angle(b)});
   emit(cuts[0],cuts[1],cuts[2],inside);emit(cuts[0],cuts[2],cuts[3],inside);
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normalData,3));geometry.setIndex(triangles);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const uniforms={opaqueDepth:{value:null},opaqueViewport:{value:new T.Vector2(1,1)},inverseViewProjection:{value:new T.Matrix4()},useOpaqueDepth:{value:0}};
 function finishMaterial(material,fringe=false){
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='varying vec3 cloudWorldPosition;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ncloudWorldPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader='varying vec3 cloudWorldPosition;uniform sampler2D opaqueDepth;uniform vec2 opaqueViewport;uniform mat4 inverseViewProjection;uniform float useOpaqueDepth;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
    if(useOpaqueDepth>.5){
     vec2 screenUv=gl_FragCoord.xy/opaqueViewport;float depth=texture2D(opaqueDepth,screenUv).x;
     if(depth<.999999){vec4 world=inverseViewProjection*vec4(screenUv*2.-1.,depth*2.-1.,1.);world/=world.w;
      if(distance(cameraPosition,cloudWorldPosition)>distance(cameraPosition,world.xyz)+.025)discard;
     }
    }`);
   if(fringe)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.);\n#include <opaque_fragment>');
   else shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=smoothstep(0.,.18,max(dot(normal,normalize(vViewPosition)),0.));\n#include <opaque_fragment>');
  };
  material.customProgramCacheKey=()=>fringe?'sculpted-cloud-fringe-v2':'sculpted-cloud-body-v2';
 }
 const material=new T.MeshStandardMaterial({name:'Cumulus physical surface',color:'#f4f4ef',roughness:1,metalness:0,transparent:true,opacity:.95,depthWrite:true,emissive:'#758b9e',emissiveIntensity:.018});finishMaterial(material);
 const bank=new T.Mesh(geometry,material);bank.name='Continuous implicit cloud surface';bank.castShadow=true;bank.receiveShadow=true;group.add(bank);
 const fringeMaterial=new T.MeshStandardMaterial({name:'Thin airy cloud boundary',color:'#fffefa',roughness:1,transparent:true,opacity:.10,depthWrite:false,emissive:'#ffffff',emissiveIntensity:.50});finishMaterial(fringeMaterial,true);
 const fringe=new T.Mesh(geometry,fringeMaterial);fringe.name='Soft cloud silhouette';fringe.scale.setScalar(1.012);fringe.position.set(0,-6.8*.012,5.8*.012);fringe.renderOrder=1;group.add(fringe);
 const fill=new T.HemisphereLight('#e3edf5','#647b96',1.08);group.add(fill);
 const target=new T.Object3D();target.position.set(0,6.7,-5.8);group.add(target);
 const sun=new T.DirectionalLight('#fff0d9',2.9);sun.position.copy(lightDirection).multiplyScalar(25).add(target.position);sun.target=target;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-17,right:17,top:12,bottom:-12,near:1,far:55});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.radius=3.5;sun.shadow.intensity=.58;group.add(sun);
 function update(time,camera){
  const x=Math.sin(time*.035)*.72,z=Math.sin(time*.021)*.22;bank.position.set(x,0,z);fringe.position.set(x,-6.8*.012,5.8*.012+z);
  if(camera){camera.updateMatrixWorld();uniforms.inverseViewProjection.value.multiplyMatrices(camera.matrixWorld,camera.projectionMatrixInverse)}
 }
 function setSceneDepth(texture,viewport){uniforms.opaqueDepth.value=texture;uniforms.useOpaqueDepth.value=texture?1:0;if(viewport)uniforms.opaqueViewport.value.copy(viewport);}
 group.userData={method:'connected smooth implicit 3D cumulus surface',vertices:positions.length/3,triangles:triangles.length/3,lobes:lobes.length,selfShadow:true,bounds:{min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()},reference:'cloudbank-review/reference-tower-cloudbank.jpg + reference-sunlit-cloud.jpg'};
 return {group,update,setSceneDepth,dispose(){geometry.dispose();material.dispose();fringeMaterial.dispose();sun.shadow.map?.dispose()}};
}
