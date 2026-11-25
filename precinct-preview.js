// Local palette experiment based on the supplied TinyRJ streetscape.
export function createPrecinctPreview(T) {
  const finishes = new WeakMap();
  const ivory = new T.Color('#f3e8cf');
  const navy = new T.Color('#335575');
  const teal = new T.Color('#507e83');
  const hsl={h:0,s:0,l:0};

  function office(building) {
    building.traverse(object=>{
      if(!object.isMesh)return;
      const finish=original=>{
        if(!original?.isMeshStandardMaterial||original.vertexColors)return original;
        if(original.customProgramCacheKey()!=='office-illustration-v1')return original;
        if(finishes.has(original))return finishes.get(original);
        const material=original.clone();
        const baseCompile=original.onBeforeCompile;
        original.color.getHSL(hsl);
        if(hsl.l>.44&&hsl.s<.49)material.color.lerp(ivory,.65);
        if(hsl.s>.24&&hsl.h>.48&&hsl.h<.68){
          material.color.lerp(hsl.h<.56?teal:navy,.59);
        }
        material.roughness=.94;
        material.customProgramCacheKey=()=> 'office-precinct-sample';
        material.onBeforeCompile=function(shader,renderer){
          baseCompile.call(this,shader,renderer);
          shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`
            float sampleAlbedo=max(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),.03);
            float sampleSun=dot(reflectedLight.directDiffuse,vec3(.2126,.7152,.0722))/sampleAlbedo;
            float sampleLit=smoothstep(.34,.65,sampleSun);
            reflectedLight.indirectDiffuse*=mix(vec3(.85,.97,1.16),vec3(1.02,1.0,.98),sampleLit);
            reflectedLight.directDiffuse*=mix(.88,1.03,sampleLit);
            #include <aomap_fragment>
          `);
        };
        finishes.set(original,material);
        return material;
      };
      object.material=Array.isArray(object.material)?object.material.map(finish):finish(object.material);
    });
  }

  function road(material){
    const base=material.onBeforeCompile;
    material.customProgramCacheKey=()=> 'asphalt-precinct-sample';
    material.onBeforeCompile=function(shader,renderer){
      base.call(this,shader,renderer);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
        #include <roughnessmap_fragment>
        float sampleArea=smoothstep(-2.5,.65,vFinishWorld.x)*smoothstep(-3.1,-1.65,vFinishWorld.z);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.119,.124,.132),sampleArea*.89);
      `);
    };
  }

  return {office,road};
}
