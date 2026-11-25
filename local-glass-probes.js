// Local reflection volumes for the curved Zun and four prominent office towers.
// References: saved city-video frame-06 (glazing / stone contrast), and the
// actual neighbouring buildings already modelled in this scene. No painted
// skyline is used. Each target tower is hidden only while its own cube is shot.
const installed=new WeakMap();

function topLevel(object,scene){let owner=object;while(owner.parent&&owner.parent!==scene)owner=owner.parent;return owner;}
function eligible(mesh,material){
 if(!material?.isMeshStandardMaterial||/^cctv-/.test(material.name)||material.userData.cctvGlass||material.userData.cctvSteel)return false;
 const name=mesh.name.replace(/_/g,' ');
 return /Tower \| curved glazing|Recessed glazed lobby/.test(name)||
  (material.envMap&&material.roughness<=.43&&material.metalness<=.40);
}

function parallaxShader(T,material,probePosition,box){
 const previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=function(shader,renderer){
  previousCompile.call(this,shader,renderer);
  Object.assign(shader.uniforms,{
   localProbePosition:{value:probePosition},localProbeBoxMin:{value:box.min},localProbeBoxMax:{value:box.max}
  });
  shader.vertexShader='varying vec3 vLocalProbeWorldPosition;\n'+shader.vertexShader.replace('#include <worldpos_vertex>',
   '#include <worldpos_vertex>\nvLocalProbeWorldPosition=worldPosition.xyz;');
  shader.fragmentShader=`varying vec3 vLocalProbeWorldPosition;
   uniform vec3 localProbePosition;uniform vec3 localProbeBoxMin;uniform vec3 localProbeBoxMax;
   vec3 localProbeDirection(vec3 direction){
    vec3 safeDirection=sign(direction)*max(abs(direction),vec3(.0001));
    safeDirection+=vec3(equal(safeDirection,vec3(0.0)))*.0001;
    vec3 toMin=(localProbeBoxMin-vLocalProbeWorldPosition)/safeDirection;
    vec3 toMax=(localProbeBoxMax-vLocalProbeWorldPosition)/safeDirection;
    vec3 exitDistance=max(toMin,toMax);
    float distanceToBox=max(.001,min(exitDistance.x,min(exitDistance.y,exitDistance.z)));
    return normalize(vLocalProbeWorldPosition+direction*distanceToBox-localProbePosition);
   }\n`+shader.fragmentShader;
  // Replace only the specular sampling direction. Diffuse light, facade
  // colour, modelled mullions, shadows and the visible background stay intact.
  const chunk=T.ShaderChunk.envmap_physical_pars_fragment.replace(
   'vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );',
   'reflectVec=localProbeDirection(reflectVec);\nvec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );');
  shader.fragmentShader=shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',chunk);
 };
 material.customProgramCacheKey=()=>previousKey()+'-local-box-reflection-v1';
}

export function installLocalGlassProbes(T,renderer,scene,options={}){
 if(installed.has(scene))return installed.get(scene);
 scene.updateMatrixWorld(true);
 const owners=new Map();
 scene.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  if(!materials.some(material=>eligible(mesh,material)))return;
  const owner=topLevel(mesh,scene);if(!owner.visible)return;
  let info=owners.get(owner);
  if(!info){const box=new T.Box3().setFromObject(owner),center=box.getCenter(new T.Vector3());info={owner,box,center,meshes:[],score:0,zun:false};owners.set(owner,info);}
  info.meshes.push(mesh);
  if(/Tower \| curved glazing/.test(mesh.name.replace(/_/g,' ')))info.zun=true;
  if(!mesh.isInstancedMesh){
   const size=new T.Box3().setFromObject(mesh).getSize(new T.Vector3());
   if(size.y>.8&&size.y>Math.max(size.x,size.z))info.score+=size.y*(size.x+size.z);
  }
 });
 const candidates=[...owners.values()];
 const selected=[];
 const zun=candidates.find(info=>info.zun);if(zun)selected.push({id:'china-zun',...zun});
 const districts=[
  ['north-west',info=>info.center.x< -5.5&&info.center.z< -2],
  ['north-east',info=>info.center.x>6&&info.center.z< -2],
  ['south-central',info=>info.center.x<0&&info.center.z>0],
  ['south-east',info=>info.center.x>6&&info.center.z>0]
 ];
 for(const [id,test] of districts){const target=candidates.filter(info=>!info.zun&&test(info)&&info.score>0).sort((a,b)=>b.score-a.score)[0];if(target)selected.push({id,...target});}
 const previous={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),toneMapping:renderer.toneMapping,autoClear:renderer.autoClear,xr:renderer.xr.enabled,shadowAutoUpdate:renderer.shadowMap.autoUpdate,shadowNeedsUpdate:renderer.shadowMap.needsUpdate};
 const pmrem=new T.PMREMGenerator(renderer),captures=[],restores=[];
 try{
  renderer.toneMapping=T.NoToneMapping;renderer.autoClear=true;renderer.xr.enabled=false;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
  for(const target of selected){
   const height=target.box.max.y-target.box.min.y;
   const position=target.center.clone();position.y=target.box.min.y+height*.45;
   const cubeTarget=new T.WebGLCubeRenderTarget(options.size||512,{type:T.HalfFloatType,colorSpace:T.LinearSRGBColorSpace,generateMipmaps:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
   const camera=new T.CubeCamera(.06,120,cubeTarget);camera.position.copy(position);
   const wasVisible=target.owner.visible;target.owner.visible=false;
   let filtered;
   try{camera.update(renderer,scene);filtered=pmrem.fromCubemap(cubeTarget.texture);}finally{target.owner.visible=wasVisible;cubeTarget.dispose();}
   filtered.texture.name=target.id+' actual neighbours reflection';
   const margin=target.zun?5.2:2.6;
   const box=new T.Box3(new T.Vector3(position.x-margin,-.12,position.z-margin),new T.Vector3(position.x+margin,Math.max(8.5,target.box.max.y+.5),position.z+margin));
   let materialCount=0;
   for(const mesh of target.meshes){
    const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const next=originals.map(original=>{
     if(!eligible(mesh,original))return original;
     const material=original.clone();material.onBeforeCompile=original.onBeforeCompile;material.customProgramCacheKey=original.customProgramCacheKey;
     material.envMap=filtered.texture;material.envMapIntensity=target.zun?1.24:1.16;
     material.roughness=target.zun?.085:.095;material.metalness=target.zun?.58:.62;
     if(material.emissiveIntensity)material.emissiveIntensity*=.25;
     parallaxShader(T,material,position,box);material.needsUpdate=true;materialCount++;return material;
    });
    restores.push({mesh,original:mesh.material,next});mesh.material=Array.isArray(mesh.material)?next:next[0];
   }
   captures.push({id:target.id,environmentTarget:filtered,materialCount,position:position.toArray(),boxMin:box.min.toArray(),boxMax:box.max.toArray(),owner:target.owner.name||target.owner.uuid});
  }
 }finally{
  renderer.setRenderTarget(previous.target,previous.face,previous.mip);renderer.toneMapping=previous.toneMapping;renderer.autoClear=previous.autoClear;renderer.xr.enabled=previous.xr;renderer.shadowMap.autoUpdate=previous.shadowAutoUpdate;renderer.shadowMap.needsUpdate=previous.shadowNeedsUpdate;pmrem.dispose();
 }
 const stats={source:'target-specific real-neighbour cubemaps with self excluded and box-projected world-position correction',size:options.size||512,probeCount:captures.length,materialCount:captures.reduce((sum,capture)=>sum+capture.materialCount,0),captures:captures.map(({environmentTarget,...rest})=>rest)};
 const result={stats,dispose(){for(const entry of restores){entry.mesh.material=entry.original;for(const material of entry.next)if(!((Array.isArray(entry.original)?entry.original:[entry.original]).includes(material)))material.dispose();}for(const capture of captures)capture.environmentTarget.dispose();installed.delete(scene);delete scene.userData.localGlassProbes;}};
 scene.userData.localGlassProbes=stats;installed.set(scene,result);return result;
}
