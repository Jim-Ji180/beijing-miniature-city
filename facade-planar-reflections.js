// Projective facade reflections. Mirror-camera / oblique clipping method follows
// Three.js Reflector (MIT): https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Reflector.js
// The original shell triangles and raised steel are retained, with no mirror card.
export function installFacadePlanarReflections(T,renderer,scene,model){
 scene.updateMatrixWorld(true);
 const surfaces=[],shells=[];
 model.traverse(o=>{if(o.isMesh&&o.material?.name==='cctv-glass')shells.push(o)});
 const mirrorCamera=new T.PerspectiveCamera(),eye=new T.Vector3(),direction=new T.Vector3(),up=new T.Vector3();
 const clip=new T.Vector4(),q=new T.Vector4(),worldPlane=new T.Plane();
 const bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
 const size=innerWidth<600?384:768;
 for(const shell of shells){
  const source=shell.geometry.index?shell.geometry.toNonIndexed():shell.geometry.clone();
  const positions=source.attributes.position,normals=source.attributes.normal,groups=new Map();
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3(),edge=new T.Vector3(),hint=new T.Vector3();
  for(let i=0;i<positions.count;i+=3){
   a.fromBufferAttribute(positions,i);b.fromBufferAttribute(positions,i+1);c.fromBufferAttribute(positions,i+2);
   n.subVectors(b,a).cross(edge.subVectors(c,a)).normalize();
   if(normals){hint.fromBufferAttribute(normals,i);if(n.dot(hint)<0)n.negate()}
   const constant=-n.dot(a),key=[...n.toArray(),constant].map(x=>Math.round(x*10000)).join(',');
   let group=groups.get(key);if(!group){group={normal:n.clone(),constant,indices:[],center:new T.Vector3(),count:0};groups.set(key,group)}
   group.indices.push(i,i+1,i+2);group.center.add(a).add(b).add(c);group.count+=3;
  }
  const geometry=source.clone(),indices=[],materials=[];geometry.clearGroups();
  const base=shell.material;
  for(const group of groups.values()){
   const index=materials.length,start=indices.length;indices.push(...group.indices);geometry.addGroup(start,group.indices.length,index);
   if(Math.abs(group.normal.y)>.8){materials.push(base);continue}
   const target=new T.WebGLRenderTarget(size,size,{type:T.HalfFloatType,depthBuffer:true,samples:0});
   target.texture.name='CCTV opposing buildings - live planar capture';target.texture.generateMipmaps=false;
   const material=base.clone();material.name='cctv-planar-glass';material.onBeforeCompile=base.onBeforeCompile;
   material.userData={...base.userData,cctvPlanarReflection:true};
   const uniforms={facadeImage:{value:target.texture},facadeMatrix:{value:new T.Matrix4()},facadeReady:{value:0},facadePixel:{value:1/size}};
   const inherited=material.onBeforeCompile;
   material.onBeforeCompile=shader=>{
    inherited?.(shader);Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='uniform mat4 facadeMatrix;varying vec4 facadeUv;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nfacadeUv=facadeMatrix*vec4(transformed,1.0);');
    shader.fragmentShader='uniform sampler2D facadeImage;uniform float facadeReady;uniform float facadePixel;varying vec4 facadeUv;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',` 
     vec2 reflectedUv=facadeUv.xy/facadeUv.w;
     float valid=step(0.,reflectedUv.x)*step(reflectedUv.x,1.)*step(0.,reflectedUv.y)*step(reflectedUv.y,1.)*step(0.,facadeUv.w);
     vec3 reflected=texture2D(facadeImage,reflectedUv).rgb*.76;
     reflected+=texture2D(facadeImage,reflectedUv+vec2(facadePixel*.65,0.)).rgb*.06;
     reflected+=texture2D(facadeImage,reflectedUv-vec2(facadePixel*.65,0.)).rgb*.06;
     reflected+=texture2D(facadeImage,reflectedUv+vec2(0.,facadePixel*.65)).rgb*.06;
     reflected+=texture2D(facadeImage,reflectedUv-vec2(0.,facadePixel*.65)).rgb*.06;
     float grazing=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);
     outgoingLight=mix(outgoingLight,reflected*vec3(.82,.92,1.02),facadeReady*valid*(.52+.20*grazing));
     #include <opaque_fragment>`);
   };
   material.customProgramCacheKey=()=> 'cctv-projective-glass-v1';materials.push(material);
   surfaces.push({shell,localPlane:new T.Plane(group.normal,group.constant),center:group.center.divideScalar(group.count),target,uniforms,material,lastPosition:new T.Vector3(Infinity,0,0),lastQuaternion:new T.Quaternion(),lastProjection:new T.Matrix4(),lastUpdate:0});
  }
  geometry.setIndex(indices);shell.geometry=geometry;shell.material=materials;source.dispose();
 }
 let busy=false,cursor=0;
 const stats={method:'per-plane mirrored camera with oblique clipping',surfaceCount:surfaces.length,resolution:size,updates:0};
 function update(camera){
  if(busy)return;busy=true;scene.updateMatrixWorld(true);camera.updateMatrixWorld();
  camera.getWorldPosition(eye);camera.getWorldDirection(direction);up.set(0,1,0).applyQuaternion(camera.getWorldQuaternion(new T.Quaternion()));
  const now=performance.now();let refreshed=0;
  const previous={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),xr:renderer.xr.enabled,shadow:renderer.shadowMap.autoUpdate,tone:renderer.toneMapping,autoClear:renderer.autoClear,visible:model.visible};
  try{
   renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.toneMapping=T.NoToneMapping;renderer.autoClear=true;
   for(let step=0;step<surfaces.length;step++){
    const surface=surfaces[(cursor+step)%surfaces.length];worldPlane.copy(surface.localPlane).applyMatrix4(surface.shell.matrixWorld);
    const distance=worldPlane.distanceToPoint(eye);if(distance<=.015)continue;
    const moved=surface.lastPosition.distanceToSquared(eye)>.000001||1-Math.abs(surface.lastQuaternion.dot(camera.quaternion))>.0000001||!surface.lastProjection.equals(camera.projectionMatrix);
    if(!moved&&now-surface.lastUpdate<400)continue;
    if(refreshed>=(innerWidth<600?1:2))break;
    const normal=worldPlane.normal;
    mirrorCamera.position.copy(eye).addScaledVector(normal,-2*distance);
    const mirroredDirection=direction.clone().reflect(normal);
    mirrorCamera.up.copy(up).reflect(normal);mirrorCamera.lookAt(mirrorCamera.position.clone().add(mirroredDirection));
    mirrorCamera.near=camera.near;mirrorCamera.far=camera.far;mirrorCamera.updateMatrixWorld();mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);
    // Projective lookup uses the unclipped projection. The clip changes only Z.
    surface.uniforms.facadeMatrix.value.copy(bias).multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse).multiply(surface.shell.matrixWorld);
    const plane=worldPlane.clone().applyMatrix4(mirrorCamera.matrixWorldInverse);
    clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
    const p=mirrorCamera.projectionMatrix.elements;
    q.set((Math.sign(clip.x)+p[8])/p[0],(Math.sign(clip.y)+p[9])/p[5],-1,(1+p[10])/p[14]);
    clip.multiplyScalar(2/clip.dot(q));p[2]=clip.x;p[6]=clip.y;p[10]=clip.z+1-.001;p[14]=clip.w;
    mirrorCamera.projectionMatrixInverse.copy(mirrorCamera.projectionMatrix).invert();
    model.visible=false;renderer.setRenderTarget(surface.target);renderer.clear();renderer.render(scene,mirrorCamera);
    surface.uniforms.facadeReady.value=1;surface.lastPosition.copy(eye);surface.lastQuaternion.copy(camera.quaternion);surface.lastProjection.copy(camera.projectionMatrix);surface.lastUpdate=now;refreshed++;stats.updates++;
   }
   cursor=(cursor+Math.max(1,refreshed))%Math.max(1,surfaces.length);
  }finally{
   model.visible=previous.visible;renderer.setRenderTarget(previous.target,previous.face,previous.mip);renderer.xr.enabled=previous.xr;renderer.shadowMap.autoUpdate=previous.shadow;renderer.toneMapping=previous.tone;renderer.autoClear=previous.autoClear;busy=false;
  }
 }
 scene.userData.facadePlanarReflections=stats;
 return {update,stats,surfaces,dispose(){for(const s of surfaces){s.target.dispose();s.material.dispose()}delete scene.userData.facadePlanarReflections}};
}
