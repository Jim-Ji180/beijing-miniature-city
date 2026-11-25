import * as T from './vendor/three.module.js';
// Finish for the standalone China Zun mesh. Architectural reference:
// KPF's CITIC Tower photographs: https://www.kpf.com/project/citic-tower-china-zun
// The model's existing geometry provides the continuous fins, floor joints,
// mechanical louvers and the curved, recessed lobby.
export function finishChinaZun(model) {
  const faces=[];
  for(let side=0;side<6;side++){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const q=canvas.getContext('2d'),gradient=q.createLinearGradient(0,0,0,128);
    gradient.addColorStop(0,side===2?'#c4d6eb':'#91b4d5');gradient.addColorStop(.44,'#a4b7ce');gradient.addColorStop(.58,'#bdc3c8');gradient.addColorStop(.69,'#53677f');gradient.addColorStop(1,'#455366');
    q.fillStyle=gradient;q.fillRect(0,0,128,128);
    if(side!==2)for(let k=0;k<10;k++){const y=80+(k*11+side*7)%22;q.fillStyle=k%2?'rgba(32,49,70,.23)':'rgba(174,184,195,.13)';q.fillRect(k*13,y,8+(k%3),128-y)}faces.push(canvas);
  }
  const sky=new T.CubeTexture(faces);sky.colorSpace=T.SRGBColorSpace;sky.needsUpdate=true;
  let lobby;
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const name = mesh.name.replace(/_/g, ' ');
    const material = mesh.material.clone();
    mesh.material = material;
    if (name.includes('Tower | curved glazing')) {
      // Quiet cool-blue glass, visibly distinct from the neighbouring pale offices.
      // Position-based colour is deliberately soft: no photographic card or overlay.
      material.color.set('#5079a9');
      material.envMap=sky;material.envMapIntensity=.72;
      material.roughness = 0.25;
      material.metalness = 0.22;
      material.emissive.set('#647f9e');
      material.emissiveIntensity = 0.025;
      material.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 vZunPos; varying vec3 vZunNormal;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvZunPos = position; vZunNormal = normal;');
        shader.fragmentShader = 'varying vec3 vZunPos; varying vec3 vZunNormal;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float h = clamp(vZunPos.y / 528.0, 0.0, 1.0);
          float reflection = 0.5 + 0.5 * sin(vZunPos.x * 0.095 + vZunPos.z * 0.075 + 0.6);
          float haze = 0.5 + 0.5 * sin(vZunPos.y * 0.018 + vZunPos.x * 0.04);
          vec3 lower = vec3(0.79, 0.87, 1.0);
          vec3 upper = vec3(0.94, 0.98, 1.0);
          diffuseColor.rgb *= mix(lower, upper, smoothstep(0.08, 0.94, h));
          diffuseColor.rgb *= 0.85 + 0.17 * reflection + 0.025 * haze;
          // Fine vertical joints reinforce the existing modelled fins at a distance.
          // Project along the appropriate face; rounded corners blend between them.
          float ax = abs(vZunNormal.x), az = abs(vZunNormal.z);
          vec2 axes = vZunPos.xz / 2.35;
          vec2 footprint = fwidth(axes);
          vec2 seam = abs(fract(axes + .5)-.5);
          vec2 visible = (1.-smoothstep(vec2(.035),vec2(.09)+min(footprint,vec2(.24)),seam)) *
            (1.-smoothstep(vec2(.20),vec2(.66),footprint));
          float lineX = visible.x, lineZ = visible.y;
          float ribs = mix(lineX, lineZ, smoothstep(0.35, 0.65, ax / max(ax + az, 0.001)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.20,.33,.49), ribs*.22);
        `);
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
          #include <roughnessmap_fragment>
          float alongPane=mix(vZunPos.x,vZunPos.z,smoothstep(.38,.62,ax/max(ax+az,.001)));
          vec2 unitPane=floor(vec2(alongPane/2.35,vZunPos.y/7.6));
          float pane=fract(sin(dot(unitPane,vec2(18.273,63.51)))*17441.741);
          float overPixel=1.-smoothstep(.20,.65,fwidth(alongPane/2.35));
          roughnessFactor=clamp(roughnessFactor+(pane-.5)*.045*overPixel,.38,.62);
          diffuseColor.rgb*=1.+(pane-.5)*.065*overPixel;
        `);
      };
      material.customProgramCacheKey = () => 'china-zun-silver-glazing-v6';
    } else if (name.includes('Continuous silver mullions')) {
      material.color.set('#96aec8');material.envMap=sky;material.envMapIntensity=.18;material.metalness=.14;material.roughness=.78;
      mesh.castShadow=false;
      mesh.receiveShadow=false;
    } else if (name.includes('Crown rim')) {
      material.color.set('#aabbd2'); material.envMap=sky;material.envMapIntensity=.46;material.metalness = 0.52; material.roughness = 0.32;
    } else if (name.includes('Horizontal floor seams')) {
      material.color.set('#6983a2'); material.metalness = 0.12; material.roughness = 0.57;
    } else if (name.includes('Mechanical floor louvres')) {
      material.color.set('#567989'); material.metalness = 0.12; material.roughness = 0.55;
    } else if (name.includes('Recessed glazed lobby')) {
      lobby=mesh;
      material.color.set('#567f8c'); material.metalness = 0.15; material.roughness = 0.25;
      material.onBeforeCompile = shader => {
        const varyings='varying vec3 vLobbyPoint; varying vec3 vLobbyNormal;\n';
        shader.vertexShader=varyings+shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\nvLobbyPoint=position; vLobbyNormal=normal;');
        shader.fragmentShader=varyings+shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float side=abs(vLobbyNormal.x) > abs(vLobbyNormal.z) ? vLobbyPoint.z : vLobbyPoint.x;
          vec2 panel=vec2(side/4.,(vLobbyPoint.y-3.1)/5.5);
          vec2 seam=1.-smoothstep(vec2(.018,.028),vec2(.018,.028)+clamp(fwidth(panel),vec2(.012),vec2(.16)),abs(fract(panel+.5)-.5));
          float bay=fract(sin(dot(floor(panel+.5),vec2(38.51,62.43)))*24614.62);
          float reveal=smoothstep(11.,17.,vLobbyPoint.y);
          diffuseColor.rgb*=.82+.22*bay-.24*reveal;
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.12,.17,.19),max(seam.x*.56,seam.y*.49));
        `);
      };
      material.customProgramCacheKey = () => 'china-zun-recessed-lobby-panels-v1';
    } else if (name.includes('Recessed roof')) {
      material.color.set('#a0b7b5'); material.metalness = 0.15; material.roughness = 0.55;
    }
  });
  if(!lobby)return;
  addLobbySill(lobby);
  return addPlazaEntrance(lobby);
}

function isEntranceBay(x,z){
  const nearCenter=Math.min(Math.abs(x),Math.abs(z));
  const atFace=Math.max(Math.abs(x),Math.abs(z));
  return nearCenter<10.67&&atFace>33.89;
}

function addLobbySill(lobby){
  // Follow the authored ground-floor curve so the stone sill tracks the
  // recessed glazing, including the four rounded corners.
  const points=new Map(),source=lobby.geometry.attributes.position;
  for(let i=0;i<source.count;i++){
    if(Math.abs(source.getY(i))>.001)continue;
    const x=source.getX(i),z=source.getZ(i);
    points.set(`${x.toFixed(3)},${z.toFixed(3)}`,[x,z]);
  }
  const outline=[...points.values()].sort((a,b)=>Math.atan2(a[1],a[0])-Math.atan2(b[1],b[0]));
  if(outline.length<3)return;
  const positions=[],values=[];
  function face(a,b,c,d,tone){
    positions.push(...a,...b,...c,...a,...c,...d);
    for(let i=0;i<6;i++)values.push(tone,tone,tone);
  }
  const point=([x,z],y,overhang)=>[x*overhang,y,z*overhang];
  for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length];
    if(isEntranceBay(...a)&&isEntranceBay(...b))continue;
    const tone=.86+.025*Math.sin(Math.floor(i/4)*2.61);
    const bottomA=point(a,1.28,1.023),bottomB=point(b,1.28,1.023);
    const edgeA=point(a,2.65,1.023),edgeB=point(b,2.65,1.023);
    const bevelA=point(a,3.10,1.014),bevelB=point(b,3.10,1.014);
    face(bottomA,edgeA,edgeB,bottomB,tone*.84);
    face(edgeA,bevelA,bevelB,edgeB,tone);
    face(point(a,3.10,.997),point(b,3.10,.997),bevelB,bevelA,tone*1.10);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(values,3));
  geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({color:'#9a9a91',roughness:.83,vertexColors:true});
  const sill=new T.Mesh(geometry,material);
  sill.name='China Zun curved granite lobby sill';
  sill.castShadow=true;
  sill.receiveShadow=true;
  lobby.add(sill);
}

function addPlazaEntrance(lobby){
  // KPF / H.G. Esch's as-built entry shows a rounded metal hood, clear
  // revolving vestibules, tall glass above, and warm ribs seen from outside.
  const geometry=lobby.geometry;
  const positions=geometry.attributes.position,index=geometry.index;
  const remaining=[];
  for(let i=0;i<index.count;i+=3){
    const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
    if([a,b,c].every(v=>isEntranceBay(positions.getX(v),positions.getZ(v))))continue;
    remaining.push(a,b,c);
  }
  geometry.setIndex(remaining);

  const entry=new T.Group();
  entry.name='China Zun plaza entrance';
  entry.position.set(0,1.68,34);
  lobby.add(entry);
  const metal=new T.MeshStandardMaterial({color:'#667681',roughness:.42,metalness:.55});
  const rail=new T.MeshStandardMaterial({color:'#adb6b6',roughness:.34,metalness:.57});
  const flooring=new T.MeshStandardMaterial({color:'#777873',roughness:.59});
  const walls=new T.MeshStandardMaterial({color:'#65717a',roughness:.76,emissive:'#b4a185',emissiveIntensity:.018});
  walls.userData.nightEmission=.19;
  const interior=new T.MeshStandardMaterial({color:'#af9d81',roughness:.66,emissive:'#eac69b',emissiveIntensity:.10});
  interior.userData.nightEmission=.76;
  const glass=new T.MeshStandardMaterial({color:'#79a6bc',roughness:.30,metalness:.10,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide});
  const slimGlass=glass.clone();
  slimGlass.color.set('#a2c5cf');
  slimGlass.opacity=.38;
  function mesh(geo,material,x,y,z,parent=entry){
    const part=new T.Mesh(geo,material);
    part.position.set(x,y,z);
    part.castShadow=!material.transparent;
    part.receiveShadow=true;
    parent.add(part);
    return part;
  }
  function box(w,h,d,material,x,y,z,parent){return mesh(new T.BoxGeometry(w,h,d),material,x,y,z,parent);}

  // The stone threshold shares the elevation of the existing roofed plaza.
  box(21.1,.14,13.3,flooring,0,-.035,-2.85);
  box(21.05,15.3,.32,walls,0,7.67,-9.42);
  for(const side of [-1,1])box(.18,15.3,9.4,walls,side*10.58,7.67,-4.69);
  box(21.02,.08,.13,interior,0,4.90,-9.21);
  box(21.02,.08,.13,interior,0,11.8,-9.21);

  const hood=new T.Shape();
  hood.moveTo(-9.40,0);hood.lineTo(-9.40,3.52);
  hood.quadraticCurveTo(-9.40,4.70,-8.24,4.70);
  hood.lineTo(8.24,4.70);hood.quadraticCurveTo(9.40,4.70,9.40,3.52);
  hood.lineTo(9.40,0);hood.lineTo(8.98,0);hood.lineTo(8.98,3.48);
  hood.quadraticCurveTo(8.98,4.25,8.20,4.25);
  hood.lineTo(-8.20,4.25);hood.quadraticCurveTo(-8.98,4.25,-8.98,3.48);
  hood.lineTo(-8.98,0);hood.closePath();
  mesh(new T.ExtrudeGeometry(hood,{depth:4.5,bevelEnabled:false,curveSegments:10}),metal,0,0,-.72);
  box(16.5,.10,.19,interior,0,4.23,3.42);

  for(const x of [-4.65,4.65]){
    const vestibule=new T.Group();
    vestibule.name='China Zun revolving vestibule';
    vestibule.position.set(x,0,1.15);
    entry.add(vestibule);
    const radius=1.76,height=3.51;
    for(const [y,thickness] of [[.07,.12],[height+.10,.20]])
      mesh(new T.CylinderGeometry(radius+.12,radius+.12,thickness,28),rail,0,y,0,vestibule);
    for(const start of [.19,1.19])
      mesh(new T.CylinderGeometry(radius,radius,height,20,1,true,start*Math.PI,.62*Math.PI),slimGlass,0,height/2,0,vestibule);
    mesh(new T.CylinderGeometry(.065,.065,height,8),rail,0,height/2,0,vestibule);
    for(let i=0;i<3;i++){
      const angle=(.14+i*2/3)*Math.PI;
      const leaf=box(radius-.10,height-.18,.025,slimGlass,Math.sin(angle)*(radius-.10)*.5,height/2,Math.cos(angle)*(radius-.10)*.5,vestibule);
      leaf.rotation.y=angle-Math.PI/2;
      box(.052,height-.12,.052,rail,Math.sin(angle)*(radius-.11),height/2,Math.cos(angle)*(radius-.11),vestibule);
    }
  }
  for(const [x,w] of [[-7.72,2.45],[0,5.55],[7.72,2.45]]){
    box(w,3.55,.035,slimGlass,x,1.79,2.94);
    for(const frameX of [x-w*.49,x,x+w*.49])box(.085,3.60,.12,rail,frameX,1.80,2.98);
    box(w,.09,.12,rail,x,3.58,2.98);
    for(const handleX of [x-.18,x+.18])box(.038,.44,.11,rail,handleX,1.40,3.04);
  }

  box(21.26,10.78,.035,glass,0,10.0,-.07);
  for(const x of [-10.55,-7.9,-5.3,-2.65,0,2.65,5.3,7.9,10.55]){
    box(.065,10.73,.10,metal,x,10.01,-.02);
    box(.20,.12,6.50,interior,x,13.83,-3.33);
  }
  for(const y of [4.64,7.26,9.95,12.66,15.33])box(21.25,.075,.13,metal,0,y,-.025);
  // Fixed glass beyond the metal jambs completes the ground-floor frontage.
  for(const x of [-10.02,10.02])box(1.29,4.63,.035,glass,x,2.32,-.07);

  // KPF's ground-floor plan shows a centered vestibule on each of the four
  // façades. Share the buffers and materials across the rotated assemblies.
  const vertical=new T.Vector3(0,1,0);
  for(const turn of [1,2,3]){
    const angle=turn*Math.PI/2;
    const copy=entry.clone();
    copy.position.applyAxisAngle(vertical,angle);
    copy.rotation.y=angle;
    lobby.add(copy);
  }
  return [interior,walls];
}
