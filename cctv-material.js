// A single continuous CCTV shell with recessed glazing and raised steel ribbons.
// The glass/steel separation follows the saved Arup facade close-up; all braces
// are clipped to the actual GLB planes, including the roof and cantilever soffit.
function raisedDiagrid(THREE, geometry) {
  const position=geometry.attributes.position,normal=geometry.attributes.normal,index=geometry.index;
  const positions=[],normals=[],pitch=.50,halfWidth=.006;
  const p=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  const faceNormal=new THREE.Vector3(),edge=new THREE.Vector3(),hint=new THREE.Vector3();
  const addTriangle=(a,b,c,n)=>{for(const point of [a,b,c]){positions.push(point.x,point.y,point.z);normals.push(n.x,n.y,n.z)}};
  // Clip the whole steel ribbon, not only its centreline. Its edges therefore
  // stay within the actual wall/roof polygon, even around the large opening.
  const clip=(polygon,gradient,level,keepAbove)=>{
    const output=[];
    for(let j=0;j<polygon.length;j++){
      const a=polygon[j],b=polygon[(j+1)%polygon.length];
      const da=a.dot(gradient)-level,db=b.dot(gradient)-level;
      const insideA=keepAbove?da>=-1e-9:da<=1e-9,insideB=keepAbove?db>=-1e-9:db<=1e-9;
      if(insideA)output.push(a);
      if(insideA!==insideB)output.push(a.clone().lerp(b,da/(da-db)));
    }
    return output.filter((point,j)=>!j||point.distanceToSquared(output[j-1])>1e-14);
  };
  let braceCount=0;
  const count=index?index.count:position.count;
  for(let triangle=0;triangle<count;triangle+=3){
    const ids=[0,1,2].map(j=>index?index.getX(triangle+j):triangle+j);
    for(let j=0;j<3;j++)p[j].fromBufferAttribute(position,ids[j]);
    faceNormal.subVectors(p[1],p[0]).cross(edge.subVectors(p[2],p[0])).normalize();
    if(normal){hint.fromBufferAttribute(normal,ids[0]);if(faceNormal.dot(hint)<0)faceNormal.negate()}
    if(faceNormal.y<-.9&&p.every(point=>point.y<.09))continue;
    const horizontal=Math.abs(faceNormal.y)>.8;
    const gradients=horizontal?
      [new THREE.Vector3(.924,0,.383),new THREE.Vector3(.383,0,-.924)]:
      (Math.abs(faceNormal.x)>Math.abs(faceNormal.z)?
        [new THREE.Vector3(0,.83,1),new THREE.Vector3(0,-.83,1)]:
        [new THREE.Vector3(1,.83,0),new THREE.Vector3(1,-.83,0)]);
    for(let family=0;family<2;family++){
      const gradient=gradients[family],values=p.map(point=>point.dot(gradient));
      const planarGradient=gradient.clone().addScaledVector(faceNormal,-gradient.dot(faceNormal));
      const halfScalar=halfWidth*planarGradient.length();
      const first=Math.ceil((Math.min(...values)-halfScalar)/pitch),last=Math.floor((Math.max(...values)+halfScalar)/pitch);
      for(let line=first;line<=last;line++){
        const level=line*pitch;
        let polygon=clip(p.map(point=>point.clone()),gradient,level-halfScalar,true);
        if(polygon.length<3)continue;
        polygon=clip(polygon,gradient,level+halfScalar,false);
        if(polygon.length<3)continue;
        const low=.0007,high=.009+family*.00025;
        const top=polygon.map(point=>point.clone().addScaledVector(faceNormal,high));
        for(let j=1;j<top.length-1;j++)addTriangle(top[0],top[j],top[j+1],faceNormal);
        for(let j=0;j<polygon.length;j++){
          const next=(j+1)%polygon.length;
          const a=polygon[j].clone().addScaledVector(faceNormal,low),b=polygon[next].clone().addScaledVector(faceNormal,low);
          const sideNormal=new THREE.Vector3().subVectors(b,a).cross(faceNormal).normalize();
          addTriangle(a,b,top[next],sideNormal);addTriangle(a,top[next],top[j],sideNormal);
        }
        braceCount++;
      }
    }
  }
  const result=new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  result.computeBoundingSphere();result.userData.braceCount=braceCount;
  return result;
}

function fallbackEnvironment(THREE){
  const faces=[];
  for(let face=0;face<6;face++){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,128);
    gradient.addColorStop(0,face===2?'#d3dce4':'#aabdd1');
    gradient.addColorStop(.43,'#b7c3d0');gradient.addColorStop(.55,'#bbb8ae');
    gradient.addColorStop(.66,'#5b687b');gradient.addColorStop(1,'#424e60');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    if(face!==2)for(let k=0;k<11;k++){
      const y=77+(k*13+face*7)%25;ctx.fillStyle=k%2?'rgba(28,45,66,.26)':'rgba(174,180,187,.14)';
      ctx.fillRect(k*12,y,8,128-y);
    }
    faces.push(canvas);
  }
  const sky=new THREE.CubeTexture(faces);sky.colorSpace=THREE.SRGBColorSpace;sky.needsUpdate=true;return sky;
}

export function applyCctvMaterial(THREE, model, environment=null) {
  const env=environment||fallbackEnvironment(THREE),glassMaterials=[],steelMaterials=[],shells=[];
  model.traverse(o=>{if(o.isMesh&&!o.userData.cctvRaisedSteel)shells.push(o)});
  let braceCount=0;
  for(const shell of shells){
    shell.castShadow=true;shell.receiveShadow=true;
    const glass=new THREE.MeshPhysicalMaterial({
      name:'cctv-glass',color:'#617b98',roughness:.12,metalness:.61,
      clearcoat:.36,clearcoatRoughness:.095,envMap:env,envMapIntensity:1.42,
      side:THREE.DoubleSide
    });
    glass.userData.cctvGlass=true;
    glass.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vCctvPos; varying vec3 vCctvNormal; varying vec3 vCctvTangent; varying vec3 vCctvBitangent;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vCctvPos=position;vCctvNormal=normal;
        vec3 facadeN=normalize(normal);
        vec3 facadeU=abs(facadeN.y)>.8?vec3(.924,0.,.383):(abs(facadeN.x)>abs(facadeN.z)?vec3(0.,0.,1.):vec3(1.,0.,0.));
        facadeU=normalize(facadeU-facadeN*dot(facadeN,facadeU));
        vCctvTangent=normalize(normalMatrix*facadeU);
        vCctvBitangent=normalize(normalMatrix*cross(facadeN,facadeU));
      `);
      shader.fragmentShader='varying vec3 vCctvPos; varying vec3 vCctvNormal; varying vec3 vCctvTangent; varying vec3 vCctvBitangent;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 nn=abs(normalize(vCctvNormal));
        float wall=1.0-smoothstep(.6,.92,nn.y);
        float u=nn.x>nn.z?vCctvPos.z:vCctvPos.x;
        float su=u/.075,sy=vCctvPos.y/.105;
        float glU=1.-smoothstep(.010,.010+max(fwidth(su),.008),abs(fract(su+.5)-.5));
        float glY=1.-smoothstep(.010,.010+max(fwidth(sy),.008),abs(fract(sy+.5)-.5));
        float pane=fract(sin(dot(floor(vec2(su,sy)),vec2(127.1,311.7)))*43758.5453);
        // Fine curtain-wall joints recede behind the physical steel ribbons.
        diffuseColor.rgb*=1.+(pane-.5)*.045*wall;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.25,.32),max(glU*.14,glY*.085)*wall);
        float ru=.924*vCctvPos.x+.383*vCctvPos.z;
        float rv=.383*vCctvPos.x-.924*vCctvPos.z;
        float roofPane=max(1.-smoothstep(.01,.01+max(fwidth(ru/.105),.01),abs(fract(ru/.105+.5)-.5)),
                           1.-smoothstep(.01,.01+max(fwidth(rv/.105),.01),abs(fract(rv/.105+.5)-.5)));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.23,.29,.36),roofPane*.13*(1.-wall));
      `).replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
        // Slight pane bowing changes the physical reflection normal, never
        // paints a highlight into albedo. Glass and raised steel stay separate.
        vec3 facadeAbs=abs(normalize(vCctvNormal));
        float paneU=facadeAbs.y>.8?(.924*vCctvPos.x+.383*vCctvPos.z):(facadeAbs.x>facadeAbs.z?vCctvPos.z:vCctvPos.x);
        float paneV=facadeAbs.y>.8?(.383*vCctvPos.x-.924*vCctvPos.z):vCctvPos.y;
        vec2 paneCoord=vec2(paneU/.075,paneV/.105);
        float paneRand=fract(sin(dot(floor(paneCoord),vec2(19.37,83.11)))*43758.5453)-.5;
        vec2 panelSlope=vec2(sin(fract(paneCoord.x)*6.283185)*.005+paneRand*.002,
                             sin(fract(paneCoord.y)*6.283185)*.003);
        normal=normalize(normal+normalize(vCctvTangent)*panelSlope.x+normalize(vCctvBitangent)*panelSlope.y);
      `);
    };
    glass.customProgramCacheKey=()=> 'cctv-raised-diagrid-glass-v2';
    shell.material=glass;glassMaterials.push(glass);
    const previous=shell.children.find(child=>child.userData.cctvRaisedSteel);
    if(previous){shell.remove(previous);previous.geometry.dispose();previous.material.dispose()}
    const geometry=raisedDiagrid(THREE,shell.geometry);
    const steel=new THREE.MeshStandardMaterial({
      name:'cctv-steel',color:'#526579',roughness:.29,metalness:.64,
      envMap:env,envMapIntensity:.86,side:THREE.DoubleSide
    });
    steel.userData.cctvSteel=true;steelMaterials.push(steel);
    const ribbons=new THREE.Mesh(geometry,steel);ribbons.name='CCTV continuous facade raised diagrid';
    ribbons.userData.cctvRaisedSteel=true;ribbons.castShadow=true;ribbons.receiveShadow=true;shell.add(ribbons);
    braceCount+=geometry.userData.braceCount;
  }
  model.userData.cctvRaisedBraceCount=braceCount;
  return {
    glassMaterials,steelMaterials,braceCount,
    setEnvironment(next){for(const material of [...glassMaterials,...steelMaterials]){material.envMap=next;material.needsUpdate=true}}
  };
}
