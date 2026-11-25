// Approximate soft cloud shadows using the same moving cloud anchors as the sky.
// One shared low resolution texture keeps the lighting cost independent of cloud count.
export function createCloudGroundShade(T) {
  const canvas=document.createElement('canvas');
  canvas.width=128;canvas.height=96;
  const ctx=canvas.getContext('2d');
  const map=new T.CanvasTexture(canvas);
  map.generateMipmaps=false;
  map.minFilter=T.LinearFilter;
  const strength={value:0}, slope={value:new T.Vector2()};
  const materials=new WeakSet();
  let previous=-1;
  function applyTo(material) {
    if(!material?.isMeshStandardMaterial||materials.has(material))return;
    materials.add(material);
    const compile=material.onBeforeCompile;
    const key=material.customProgramCacheKey.bind(material);
    const cacheKey=key();
    material.customProgramCacheKey=()=>cacheKey+'-cloud-field';
    material.onBeforeCompile=function(shader,renderer){
      compile.call(this,shader,renderer);
      shader.uniforms.uCityCloudMap={value:map};
      shader.uniforms.uCityCloudStrength=strength;
      shader.uniforms.uCityCloudSlope=slope;
      shader.vertexShader='uniform vec2 uCityCloudSlope;varying vec2 vCloudGround;\n'+shader.vertexShader.replace('#include <project_vertex>',`
        #include <project_vertex>
        vec4 cloudVertex=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          cloudVertex=instanceMatrix*cloudVertex;
        #endif
        vec3 cloudWorld=(modelMatrix*cloudVertex).xyz;
        vCloudGround=vec2(cloudWorld.x+cloudWorld.y*uCityCloudSlope.x,-cloudWorld.z+cloudWorld.y*uCityCloudSlope.y)/vec2(30.,24.)+.5;
      `);
      shader.fragmentShader='uniform sampler2D uCityCloudMap;uniform float uCityCloudStrength;varying vec2 vCloudGround;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`
        #include <lights_fragment_end>
        float cloudShade=texture2D(uCityCloudMap,vCloudGround).r*uCityCloudStrength;
        reflectedLight.directDiffuse*=1.-cloudShade;
        reflectedLight.directSpecular*=1.-cloudShade*.76;
      `);
    };
    material.needsUpdate=true;
  }
  function apply(root){
    root.traverse(o=>{
      if(!o.isMesh||o.isSkinnedMesh)return;
      if(Array.isArray(o.material))o.material.forEach(applyTo);
      else applyTo(o.material);
    });
  }
  function update(time,clouds,direction,enabled,thickness){
    slope.value.set(-direction.x/direction.y,direction.z/direction.y);
    strength.value=enabled?.27+thickness*.16:0;
    if(!enabled||Math.abs(previous-time)<.12)return;
    previous=time;
    ctx.fillStyle='#000';ctx.fillRect(0,0,128,96);
    for(const {x,z,baseY,radiusX,radiusZ,weight} of clouds){
      if(baseY<1||weight<.02)continue;
      const u=((x-direction.x/direction.y*baseY)/30+.5)*128;
      const v=((z-direction.z/direction.y*baseY)/24+.5)*96;
      const rx=Math.max(1,radiusX/30*128),rz=Math.max(1,radiusZ/24*96);
      ctx.save();ctx.translate(u,v);ctx.scale(rx,rz);
      const soft=ctx.createRadialGradient(0,0,.20,0,0,1.25);
      soft.addColorStop(0,`rgba(255,255,255,${Math.min(.9,weight*.88)})`);
      soft.addColorStop(.64,`rgba(255,255,255,${Math.min(.7,weight*.64)})`);
      soft.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=soft;ctx.fillRect(-1.25,-1.25,2.5,2.5);
      ctx.restore();
    }
    map.needsUpdate=true;
  }
  return {apply,update,invalidate(){previous=-2;}};
}
