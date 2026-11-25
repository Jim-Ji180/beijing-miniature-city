// Procedural cloud volumes and sun-aligned light scattering. Visual references:
// CRI tower above cloud: https://p3crires.cri.cn/photoworkspace/cri/2024/04/16/2024041612315032917.jpg
// Met Office crepuscular rays: https://www.metoffice.gov.uk/api/images/file/crepuscular-rays-around-cumulus-cloud-1366x683.jpg?prefix=images
// No bitmap cloud cards or external model assets are used.
export function createCityCloudAtmosphere(T,sunDirection){
 const group=new T.Group();group.name='Clouds above the Beijing miniature';
 const sunlight=(sunDirection||new T.Vector3(-16,17,13)).clone().normalize();
 const volumes=[],shafts=[],worldInverse=new T.Matrix4(),localLight=new T.Vector3();
 const vertex=`varying vec3 vCloudLocal;
 void main(){vCloudLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
 const fragment=`
 precision highp float;
 varying vec3 vCloudLocal;
 uniform mat4 uCloudInverse;
 uniform vec3 uCloudLight;
 uniform vec3 uCloudScale;
 uniform sampler2D uOpaqueDepth;
 uniform vec2 uViewport;
 uniform mat4 uInverseViewProjection;
 uniform float uUseDepth;
 uniform float uCloudTime;
 uniform float uCloudSeed;
 uniform float uCloudDensity;
 uniform float uCloudBeam;
 float hash3(vec3 p){p=fract(p*.3183099+vec3(.11,.31,.73));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 float noise3(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
 }
 float fbm(vec3 p){return .60*noise3(p)+.28*noise3(p*2.03+vec3(7.3,1.1,4.8))+.12*noise3(p*4.07+vec3(2.7,8.4,3.5));}
 float lobe(vec3 p,vec3 center,vec3 radius){vec3 q=(p-center)/radius;return exp(-dot(q,q)*1.25);}
 float cloudShape(vec3 p){
  // One connected cloud sea with billowing upper surfaces, rather than a row
  // of isolated small puffs. An irregular elliptical footprint fades the edge.
  vec3 q=p+vec3(.025*sin(p.y*7.+p.z*9.+uCloudSeed),
   .055*sin(p.x*10.+p.z*7.+uCloudSeed),.025*sin(p.x*8.-p.y*6.));
  float billows=lobe(q,vec3(-.43,-.10,.035),vec3(.105,.29,.23));
  billows=max(billows,lobe(q,vec3(-.34,.055,-.075),vec3(.115,.34,.235)));
  billows=max(billows,lobe(q,vec3(-.245,.15,.08),vec3(.11,.30,.25)));
  billows=max(billows,lobe(q,vec3(-.15,-.035,-.04),vec3(.125,.34,.24)));
  billows=max(billows,lobe(q,vec3(-.045,.105,.105),vec3(.12,.335,.26)));
  billows=max(billows,lobe(q,vec3(.065,-.06,-.105),vec3(.12,.29,.24)));
  billows=max(billows,lobe(q,vec3(.165,.13,.045),vec3(.125,.35,.25)));
  billows=max(billows,lobe(q,vec3(.27,-.025,.10),vec3(.115,.31,.25)));
  billows=max(billows,lobe(q,vec3(.365,.09,-.05),vec3(.105,.32,.235)));
  billows=max(billows,lobe(q,vec3(.445,-.10,.025),vec3(.09,.25,.22)));
  vec2 footprint=q.xz/vec2(.48,.46);
  float coverage=1.-smoothstep(.66,1.18,dot(footprint,footprint));
  float sheet=exp(-pow((q.y+.13)/.235,2.))*coverage;
  float envelope=max(billows,sheet*.50);
  return envelope;
 }
 float cloudDensity(vec3 p){
  float envelope=cloudShape(p);
  vec3 np=p*vec3(10.,6.4,9.)+vec3(uCloudSeed+uCloudTime*.012,uCloudTime*.004,0.);
  float n=fbm(np);
  float density=smoothstep(0.,.52,envelope-(.15+(1.-n)*.28));
  float edge=smoothstep(0.,.08,.5-max(abs(p.x),max(abs(p.y),abs(p.z))));
  return density*edge*uCloudDensity;
 }
 float beamDensity(vec3 p){
  float height=p.y+.5;
  float radius=mix(.46,.13,height);
  float radial=length(p.xz)/radius;
  float edge=exp(-radial*radial*4.)*(1.-smoothstep(.7,1.4,radial));
  float ends=smoothstep(0.,.62,height)*(1.-smoothstep(.72,1.,height));
  float grain=.81+.19*noise3(vec3(p.xz*10.,p.y*3.+uCloudTime*.01+uCloudSeed));
  return edge*ends*grain*uCloudDensity;
 }
 vec2 intersectBox(vec3 origin,vec3 direction){
  vec3 safe=sign(direction)*max(abs(direction),vec3(.00001));
  safe+=vec3(equal(safe,vec3(0.)))*.00001;
  vec3 a=(-vec3(.5)-origin)/safe,b=(vec3(.5)-origin)/safe;
  vec3 lo=min(a,b),hi=max(a,b);
  return vec2(max(lo.x,max(lo.y,lo.z)),min(hi.x,min(hi.y,hi.z)));
 }
 void main(){
  vec3 origin=(uCloudInverse*vec4(cameraPosition,1.)).xyz;
  vec3 ray=normalize(vCloudLocal-origin);
  vec2 limits=intersectBox(origin,ray);float start=max(limits.x,0.);
  if(uUseDepth>.5){
   vec2 screenUv=gl_FragCoord.xy/uViewport;
   float depth=texture2D(uOpaqueDepth,screenUv).x;
   if(depth<.999999){
    vec4 opaqueWorld=uInverseViewProjection*vec4(screenUv*2.-1.,depth*2.-1.,1.);
    opaqueWorld/=opaqueWorld.w;
    vec3 opaqueLocal=(uCloudInverse*opaqueWorld).xyz;
    limits.y=min(limits.y,dot(opaqueLocal-origin,ray));
   }
  }
  if(limits.y<=start)discard;
  float stepLength=(limits.y-start)/28.;
  float worldStep=length(ray*uCloudScale)*stepLength;
  float jitter=.5;
  float transmittance=1.;vec3 result=vec3(0.);
  bool foundSurface=false;float surfaceDiffuse=.65;
  for(int index=0;index<28;index++){
   vec3 p=origin+ray*(start+(float(index)+jitter)*stepLength);
   float density=uCloudBeam>.5?beamDensity(p):cloudDensity(p);
   if(density>.0002){
    float absorb=1.-exp(-density*worldStep);
    vec3 color;
    if(uCloudBeam>.5){color=vec3(3.8,3.3,2.3);}
    else{
     if(!foundSurface && density>.012){
      float e=.025,shape=cloudShape(p);
      vec3 gradient=vec3(cloudShape(p+vec3(e,0.,0.))-shape,
       cloudShape(p+vec3(0.,e,0.))-shape,cloudShape(p+vec3(0.,0.,e))-shape);
      if(length(gradient)>.00001){
       vec3 surfaceNormal=normalize(-gradient/uCloudScale);
       surfaceDiffuse=max(0.,dot(surfaceNormal,normalize(uCloudLight*uCloudScale)));
      }
      foundSurface=true;
     }
     float shadow=cloudDensity(p+uCloudLight*.08)*.43+cloudDensity(p+uCloudLight*.19)*.28;
     float sunlight=exp(-shadow*3.5);
     float upper=smoothstep(-.32,.35,p.y);
     color=mix(vec3(.26,.36,.52),vec3(1.25,1.20,1.10),.20+.62*surfaceDiffuse)*(.76+.24*sunlight);
     color+=vec3(.13,.10,.055)*pow(max(dot(ray,-uCloudLight),0.),3.)*sunlight;
    }
    result+=transmittance*absorb*color;
    transmittance*=1.-absorb;
    if(transmittance<.035)break;
   }
  }
  float opacity=1.-transmittance;
  if(opacity<.004)discard;
  gl_FragColor=vec4(result/max(opacity,.001),opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
 function volume(position,scale,density,seed,beam=false){
  const material=new T.ShaderMaterial({
   uniforms:{uCloudInverse:{value:new T.Matrix4()},uCloudLight:{value:new T.Vector3()},uCloudScale:{value:new T.Vector3(...scale)},uCloudTime:{value:0},uCloudSeed:{value:seed},uCloudDensity:{value:density},uCloudBeam:{value:beam?1:0},uOpaqueDepth:{value:null},uViewport:{value:new T.Vector2(1,1)},uInverseViewProjection:{value:new T.Matrix4()},uUseDepth:{value:0}},
   vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,
   depthTest:false,side:T.BackSide,blending:beam?T.CustomBlending:T.NormalBlending,
   ...(beam?{blendEquation:T.AddEquation,blendSrc:T.SrcAlphaFactor,blendDst:T.OneFactor,blendEquationAlpha:T.AddEquation,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor}:{})
  });
  const mesh=new T.Mesh(new T.BoxGeometry(1,1,1),material);mesh.name=beam?'Soft sun shaft below cloud gap':'Raymarched drifting cloud';
  mesh.position.set(...position);mesh.scale.set(...scale);mesh.frustumCulled=false;
  mesh.renderOrder=beam?39:40;mesh.userData.cloudBasePosition=mesh.position.clone();
  group.add(mesh);(beam?shafts:volumes).push(mesh);return mesh;
 }
 // A connected bank spans the rear half of the entire miniature. Its lower
 // edge overlaps the skyline; the Zun crown rises above it and the foreground stays open.
 volume([-.70,7.20,-5.3],[25.0,4.1,8.8],.64,2.7);
 volume([-8.3,7.30,-6.0],[10.0,2.7,6.0],.30,8.3);
 volume([7.4,7.50,-6.3],[10.0,2.5,6.0],.32,15.8);
 function shaft(start,length,width,strength,seed){
  const center=new T.Vector3(...start).addScaledVector(sunlight,-length*.5);
  const mesh=volume(center.toArray(),[width,length,width],strength,seed,true);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),sunlight);return mesh;
 }
 shaft([-5.5,7.65,-4.1],9.0,1.40,.065,1.7);
 shaft([-3.0,7.75,-4.6],8.0,1.10,.052,6.3);
 shaft([.7,7.9,-6.7],8.5,1.30,.046,12.6);
 function update(time,camera){
  for(let i=0;i<volumes.length;i++){
   const mesh=volumes[i],base=mesh.userData.cloudBasePosition;
   mesh.position.x=base.x+Math.sin(time*.045+i*1.8)*1.20;
   mesh.position.z=base.z+Math.sin(time*.025+i*1.1)*.45;
   mesh.material.uniforms.uCloudTime.value=time;
  }
  for(const mesh of [...volumes,...shafts]){
   mesh.updateWorldMatrix(true,false);worldInverse.copy(mesh.matrixWorld).invert();
   mesh.material.uniforms.uCloudInverse.value.copy(worldInverse);
   localLight.copy(sunlight).transformDirection(worldInverse);mesh.material.uniforms.uCloudLight.value.copy(localLight);
   mesh.material.uniforms.uCloudTime.value=time;
   if(camera){camera.updateMatrixWorld();mesh.material.uniforms.uInverseViewProjection.value.multiplyMatrices(camera.matrixWorld,camera.projectionMatrixInverse);}
  }
 }
 function setSceneDepth(depthTexture,viewportVector2){
  for(const mesh of [...volumes,...shafts]){
   const uniforms=mesh.material.uniforms;uniforms.uOpaqueDepth.value=depthTexture;
   uniforms.uUseDepth.value=depthTexture?1:0;
   if(viewportVector2)uniforms.uViewport.value.copy(viewportVector2);
  }
 }
 update(0);
 group.userData={reference:'CRI cloud-piercing tower / Met Office crepuscular rays',cloudVolumes:volumes.length,lightShafts:shafts.length};
 return {group,update,setSceneDepth,dispose(){for(const mesh of [...volumes,...shafts]){mesh.geometry.dispose();mesh.material.dispose()}}};
}
