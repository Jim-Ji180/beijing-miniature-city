// Deep blue / blue-green architectural glazing. The saved CCTV facade close-up
// is the reference for cool glass, restrained sky sheen and legible steelwork.
// A soft angular sky is reflected by PBR normals; no building image is painted
// or projected on a facade. Direct sunlight supplies the directional glint.
const installed=new WeakMap();

function softSky(T,renderer){
 const environmentScene=new T.Scene(),target=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType,colorSpace:T.LinearSRGBColorSpace,generateMipmaps:false});
 const geometry=new T.SphereGeometry(10,24,12),material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,
  vertexShader:'varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec3 skyDirection;void main(){
   vec3 direction=normalize(skyDirection);
   vec3 horizon=vec3(.69,.74,.79),zenith=vec3(.25,.34,.46),ground=vec3(.25,.27,.28);
   vec3 radiance=direction.y>=0.?mix(horizon,zenith,pow(direction.y,.58)):mix(horizon,ground,pow(-direction.y,.55));
   // Broad daylight reflected by the pale studio floor, rather than the old
   // near-black lower hemisphere. Its soft falloff produces a satin glass edge.
   float floorGlow=pow(max(0.,dot(direction,normalize(vec3(-.90,-.25,.25)))),4.);
   radiance+=vec3(.90,.98,1.06)*floorGlow;
   float sunGlow=pow(max(0.,dot(direction,normalize(vec3(-16.,17.,13.)))),12.);
   radiance+=vec3(1.65,1.45,1.21)*sunGlow;
   gl_FragColor=vec4(radiance,1.);
  }`});
 environmentScene.add(new T.Mesh(geometry,material));
 const camera=new T.CubeCamera(.1,20,target),previous={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),tone:renderer.toneMapping,xr:renderer.xr.enabled,shadow:renderer.shadowMap.autoUpdate};
 const generator=new T.PMREMGenerator(renderer);let filtered;
 try{renderer.toneMapping=T.NoToneMapping;renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;camera.update(renderer,environmentScene);filtered=generator.fromCubemap(target.texture);}
 finally{renderer.setRenderTarget(previous.target,previous.face,previous.mip);renderer.toneMapping=previous.tone;renderer.xr.enabled=previous.xr;renderer.shadowMap.autoUpdate=previous.shadow;target.dispose();generator.dispose();geometry.dispose();material.dispose();}
 filtered.texture.name='HDR soft daylight and pale floor for blue-green glass';return filtered;
}

function fallbackCctvGrid(shader){
 shader.vertexShader='varying vec3 vDarkGlassPos;varying vec3 vDarkGlassNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDarkGlassPos=position;vDarkGlassNormal=normal;');
 shader.fragmentShader='varying vec3 vDarkGlassPos;varying vec3 vDarkGlassNormal;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec3 faceN=abs(normalize(vDarkGlassNormal));
  float wall=1.-smoothstep(.6,.92,faceN.y);
  float u=faceN.x>faceN.z?vDarkGlassPos.z:vDarkGlassPos.x;
  vec2 cell=vec2(u/.075,vDarkGlassPos.y/.105);
  vec2 seam=1.-smoothstep(vec2(.014),vec2(.014)+max(fwidth(cell),vec2(.008)),abs(fract(cell+.5)-.5));
  float pane=fract(sin(dot(floor(cell),vec2(127.1,311.7)))*43758.5453);
  diffuseColor.rgb*=1.+(pane-.5)*.035*wall;
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.035,.075,.10),max(seam.x*.12,seam.y*.075)*wall);
 `);
}

export function installBlueGreenGlazing(T,renderer,scene){
 if(installed.has(scene))return installed.get(scene);
 const environmentTarget=softSky(T,renderer),replacements=new Map(),restores=[];
 let meshCount=0;const counts={cctv:0,zun:0};
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const name=mesh.name.replace(/_/g,' '),originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  let changed=false;
  const next=originals.map(original=>{
   if(!original?.isMeshStandardMaterial||original.userData.vehicleFinish)return original;
   if(original.userData.cctvSteel||original.name==='cctv-steel'||/Continuous silver mullions|Crown rim/.test(name))return original;
   const cctv=original.userData.cctvGlass||/^cctv-(glass|planar-glass)$/.test(original.name);
   const zun=/Tower \| curved glazing|Recessed glazed lobby/.test(name);
   if(!cctv&&!zun)return original;
   const kind=cctv?'cctv':'zun';let material=replacements.get(original);
   if(!material){
    material=new T.MeshPhysicalMaterial();
    // Copy Standard fields only, preserving Physical defaults when the source
    // is a MeshStandardMaterial. Keep the existing fine curtain-wall shader.
    T.MeshStandardMaterial.prototype.copy.call(material,original);
    material.onBeforeCompile=original.userData.cctvPlanarReflection?fallbackCctvGrid:original.onBeforeCompile;
    const previousKey=original.customProgramCacheKey?.bind(original);
    material.customProgramCacheKey=()=> (original.userData.cctvPlanarReflection?'clean-cctv-grid':previousKey?.()||'glass')+'-blue-green-glazing-v2';
    material.name=kind+'-blue-green-glazing';
    material.color.set(kind==='cctv'?'#3a4e5b':name.includes('Recessed glazed lobby')?'#43535c':'#455d70');
    material.roughness=kind==='cctv'?.58:.54;
    material.metalness=kind==='cctv'?.18:.16;
    material.clearcoat=.16;material.clearcoatRoughness=.58;
    material.ior=1.5;material.specularIntensity=.88;material.specularColor.set('#d8dde1');
    material.envMap=environmentTarget.texture;material.envMapIntensity=kind==='cctv'?.37:.39;
    material.transmission=0;material.opacity=1;material.transparent=false;
    material.emissive.set('#000000');material.emissiveIntensity=0;
    material.userData={...original.userData,blueGreenGlazing:true};
    material.needsUpdate=true;replacements.set(original,material);counts[kind]++;
   }
   changed=true;return material;
  });
  if(changed){restores.push({mesh,original:mesh.material});mesh.material=Array.isArray(mesh.material)?next:next[0];meshCount++;}
 });
 const stats={finish:'deep blue-green PBR with soft sky and direct-sun clearcoat',materialCount:replacements.size,meshCount,counts};
 scene.userData.blueGreenGlazing=stats;
 const result={stats,dispose(){for(const item of restores)item.mesh.material=item.original;for(const material of replacements.values())material.dispose();environmentTarget.dispose();installed.delete(scene);delete scene.userData.blueGreenGlazing;}};
 installed.set(scene,result);return result;
}
