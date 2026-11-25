import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const files = {
  sedan:'silver-family-sedan', taxi:'silver-family-sedan', suv:'family-suv',
  'hatchback-sports':'low-poly-hatchback', pickup:'blue-pickup-truck',
  van:'pearl-white-minivan', delivery:'low-poly-delivery-van',
  ambulance:'low-poly-ambulance', police:'police-patrol-car',
};
const loader = new GLTFLoader();
const assets = new Map();
const bodyColors = {
  sedan:'#657785',taxi:'#d8a032',police:'#e1e6e8',van:'#778b96',suv:'#616865',
  'hatchback-sports':'#943f39',pickup:'#42647a',delivery:'#d9dad5',ambulance:'#e8e8e1',
};
// Width, height and overhang treatment are separate from the road length.
const stance = {
  sedan:[.99,.89,.24],taxi:[.98,.94,.20],police:[1,.93,.19],suv:[1,.94,.13],
  'hatchback-sports':[1,.93,.15],pickup:[1,.92,.15],van:[.98,.93,.14],
  delivery:[.97,.86,.15],ambulance:[.98,.98,.10],
};

function shapeBody(T,model,type) {
  const bounds=new T.Box3().setFromObject(model,true);
  const [wide,tall,taper]=stance[type];
  const passenger=['sedan','taxi','police','hatchback-sports'].includes(type);
  const vanBody=['van','delivery','ambulance'].includes(type);
  const matrix=new T.Matrix4(), point=new T.Vector3();
  const center=bounds.getCenter(new T.Vector3());
  const size=bounds.getSize(new T.Vector3());
  model.updateMatrixWorld(true);
  model.traverse(object=>{
    if(!object.isMesh||!object.visible)return;
    for(let parent=object;parent!==model;parent=parent.parent)
      if(/^Wheel_(FL|FR|RL|RR)$/.test(parent.name))return;
    const geometry=object.geometry.clone();
    const vertices=geometry.getAttribute('position');
    matrix.copy(object.matrixWorld).invert();
    for(let i=0;i<vertices.count;i++){
      point.fromBufferAttribute(vertices,i).applyMatrix4(object.matrixWorld);
      const end=(point.z-center.z)/(size.z/2);
      const factor=T.MathUtils.smoothstep(Math.abs(end),.72,1);
      const roof=T.MathUtils.smoothstep((point.y-bounds.min.y)/size.y,.24,1);
      point.x=center.x+(point.x-center.x)*(1-taper*factor);
      point.y=bounds.min.y+(point.y-bounds.min.y)*(1-(1-tall)*roof);
      if(vanBody){
        const nose=T.MathUtils.smoothstep(end,.43,1);
        const belt=T.MathUtils.smoothstep((point.y-bounds.min.y)/size.y,.25,.83);
        point.z-=size.z*nose*belt*.072;
        point.y-=size.y*nose*belt*.10;
      }
      if(passenger){
        const upper=T.MathUtils.smoothstep((point.y-bounds.min.y)/size.y,.33,.82);
        const bonnet=T.MathUtils.smoothstep(end,.43,1);
        point.y-=size.y*bonnet*upper*.17;
        point.z-=size.z*upper*T.MathUtils.lerp(-.019,.040,T.MathUtils.smoothstep(end,-.26,.23));
        point.x=center.x+(point.x-center.x)*(1-upper*.07);
      }
      point.applyMatrix4(matrix);
      vertices.setXYZ(i,point.x,point.y,point.z);
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    object.geometry=geometry;
  });
  model.scale.x=wide;
  model.updateMatrixWorld(true);
}

function fitWheelFaces(T,wheels,type) {
  const alloy=new T.MeshStandardMaterial({color:'#a4acb1',metalness:.5,roughness:.33});
  const dark=new T.MeshStandardMaterial({color:'#333b40',metalness:.32,roughness:.56});
  for(const {object,radius} of wheels) {
    const geometry=object.geometry;
    if(!geometry)continue;
    geometry.computeBoundingBox();
    const {min,max}=geometry.boundingBox;
    const side=Math.sign(object.getWorldPosition(new T.Vector3()).x);
    for(const child of object.children)
      if(/^(Hub|Rim)/i.test(child.name))child.visible=false;
    const x=(side>0?max.x:min.x)+side*.031;
    const rubber=new T.MeshStandardMaterial({color:'#26292b',roughness:.91});
    const shoulder=new T.Mesh(new T.TorusGeometry(radius*.89,radius*.035,7,28),rubber);
    shoulder.rotation.y=Math.PI/2;
    shoulder.position.x=x-side*.043;
    object.add(shoulder);
    const face=new T.Mesh(new T.CircleGeometry(radius*.66,24),dark);
    face.rotation.y=side*Math.PI/2;face.position.x=x;object.add(face);
    const ring=new T.Mesh(new T.TorusGeometry(radius*.625,radius*.024,6,24),alloy);
    ring.rotation.y=side*Math.PI/2;ring.position.x=x+side*.016;object.add(ring);
    const hub=new T.Mesh(new T.CylinderGeometry(radius*.17,radius*.19,.042,10),alloy);
    hub.rotation.z=Math.PI/2;hub.position.x=x+side*.025;object.add(hub);
    const spokes=type==='ambulance'||type==='delivery'?8:5;
    const spokesGeometry=Array.from({length:spokes},(_,i)=>{
      const a=i*Math.PI*2/spokes;
      return new T.BoxGeometry(.025,radius*.41,radius*.074).rotateX(a)
        .translate(x+side*.018,Math.cos(a)*radius*.38,Math.sin(a)*radius*.38);
    });
    object.add(new T.Mesh(mergeGeometries(spokesGeometry),alloy));
    spokesGeometry.forEach(part=>part.dispose());
  }
}

// Project the tapered lens onto the bumper surface. Each edge follows the
// donor shell, including the taper at the front corners.
function fitFrontLights(T,model,type,headlamps){
  const body=model.getObjectByName('Body');
  const ray=new T.Raycaster();
  const axis=new T.Vector3(0,0,-1);
  const origin=new T.Vector3();
  const localHit=new T.Vector3();
  const surfaces=[body,model.getObjectByName('Bumper_Front')].filter(Boolean);
  const bounds=new T.Box3().setFromObject(body,true);
  const width=(bounds.max.x-bounds.min.x)/2;
  const y=type==='police'?2.45:type==='delivery'?3.51:2.50;
  const centerX=width*.64;
  const lens=new T.MeshStandardMaterial({color:'#adc6d2',roughness:.27,metalness:.18,
    emissive:'#a5c6dc',emissiveIntensity:.35});
  const housing=new T.MeshStandardMaterial({color:'#212a31',roughness:.49,side:T.DoubleSide});
  const running=new T.MeshStandardMaterial({color:'#d8e5ec',roughness:.26,
    emissive:'#b9d6ec',emissiveIntensity:.62});
  headlamps.add(running);
  function project(x,y,offset){
    ray.set(origin.set(x,y,bounds.max.z+3),axis);
    const hits=ray.intersectObjects(surfaces,true);
    const front=hits.length?Math.max(...hits.map(hit=>hit.point.z)):bounds.max.z;
    return model.worldToLocal(localHit.set(x,y,front+offset));
  }
  function sample(p,q,t){return new T.Vector2().lerpVectors(p,q,t);
  }
  function patch(points,side,material,offset){
    const contour=points.map(([x,h])=>new T.Vector2(side*(centerX+x),y+h));
    const faces=T.ShapeUtils.triangulateShape(contour,[]);
    const vertices=[];
    const steps=6;
    for(const face of faces){
      const [a,b,c]=face.map(i=>contour[i]);
      const rows=Array.from({length:steps+1},(_,i)=>Array.from({length:steps-i+1},(_,j)=>{
        const point=sample(sample(a,b,i/steps),sample(c,b,i/steps),j/(steps-i||1));
        return project(point.x,point.y,offset).toArray();
      }));
      for(let i=0;i<steps;i++)for(let j=0;j<steps-i;j++){
        vertices.push(...rows[i][j],...rows[i+1][j],...rows[i][j+1]);
        if(j+1<steps-i)vertices.push(...rows[i+1][j],...rows[i+1][j+1],...rows[i][j+1]);
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    g.computeVertexNormals();
    material.side=T.DoubleSide;
    model.add(new T.Mesh(g,material));
  }
  for(const side of [-1,1]){
    patch([[-.95,-.17],[.59,-.26],[.91,.03],[.74,.32],[-.49,.22]],side,housing,.19);
    patch([[-.79,-.10],[.55,-.16],[.77,.07],[.65,.23],[-.46,.14]],side,lens,.221);
    patch([[-.72,.00],[.51,.023],[.70,.145],[.59,.178],[.44,.078],[-.70,.063]],side,running,.249);
  }
}

// Keep the individual lenses, labels and wheels on their original transforms.
function batchVehicleBody(T,model,wheels){
  const wheelRoots=new Set(wheels.map(({object})=>object));
  const groups=new Map();
  const transform=new T.Matrix4();
  model.updateMatrixWorld(true);
  const toModel=model.matrixWorld.clone().invert();
  model.traverseVisible(part=>{
    const {material,geometry}=part;
    if(part.type!=='Mesh'||part.children.length||!material?.isMeshStandardMaterial||
      material.transparent||!material.visible||material.emissive.getHex()!==0||
      material.onBeforeCompile!==T.Material.prototype.onBeforeCompile||
      part.morphTargetInfluences||Object.keys(part.userData).some(key=>key!=='name')||
      geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity) return;
    for(let parent=part;parent!==model;parent=parent.parent){
      if(wheelRoots.has(parent)) return;
    }
    transform.multiplyMatrices(toModel,part.matrixWorld);
    if(transform.determinant()<=0) return;
    const attributes=Object.entries(geometry.attributes).sort(([a],[b])=>a.localeCompare(b));
    if(attributes.some(([,attribute])=>attribute.isInterleavedBufferAttribute)) return;
    const layout=attributes.map(([name,a])=>[name,a.itemSize,a.array.constructor.name,a.normalized,a.gpuType].join(':')).join(',');
    const key=[material.id,part.castShadow,part.receiveShadow,part.renderOrder,
      part.layers.mask,part.frustumCulled,Boolean(geometry.index),layout].join('/');
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(part);
  });

  for(const parts of groups.values()){
    if(parts.length<2) continue;
    const copies=parts.map(part=>part.geometry.clone().applyMatrix4(transform.multiplyMatrices(toModel,part.matrixWorld)));
    const geometry=mergeGeometries(copies);
    for(const copy of copies) copy.dispose();
    if(!geometry) continue;
    const first=parts[0];
    const batch=new T.Mesh(geometry,first.material);
    batch.name='vehicle-body-batch';
    batch.castShadow=first.castShadow;
    batch.receiveShadow=first.receiveShadow;
    batch.renderOrder=first.renderOrder;
    batch.layers.mask=first.layers.mask;
    batch.frustumCulled=first.frustumCulled;
    for(const part of parts) part.removeFromParent();
    model.add(batch);
  }
}

export async function loadStreetVehicle(T,type,signMaterial,environment) {
  const file = files[type];
  if (!assets.has(file)) assets.set(file,loader.loadAsync(
    new URL('./assets/street-vehicles/'+file+'.glb',import.meta.url).href
  ));
  const model=(await assets.get(file)).scene.clone(true);
  shapeBody(T,model,type);
  const wheels=[], headlamps=new Set(), rearLamps=new Set(), warnings=new Map();
  const materials=new Map();
  model.traverse(object=>{
    if (/^Wheel_(FL|FR|RL|RR)$/.test(object.name)) {
      const radius = new T.Box3().setFromObject(object,true).getSize(new T.Vector3()).y / 2;
      wheels.push({object,radius});
    }
    if(type==='police'&&/^(PushBar_|Spotlight|Badge_|Laptop_)/.test(object.name))object.visible=false;
    if(type==='hatchback-sports'&&/^Rack/.test(object.name))object.visible=false;
    if(type==='ambulance'&&/^Stripe_(Teal|Yellow)/.test(object.name))object.visible=false;
    if(['sedan','taxi'].includes(type)&&/^Antenna/.test(object.name))object.visible=false;
    if(type==='delivery'&&object.name==='SidePanel')object.visible=false;
    if(type==='delivery'&&object.name==='Door_Sliding'){
      // The donor model displays the load with its sliding door parked aft.
      const panel=model.getObjectByName('SidePanel');
      if(panel){
        const openDoor=new T.Box3().setFromObject(object,true);
        const shell=new T.Box3().setFromObject(panel,true);
        if(openDoor.getCenter(new T.Vector3()).z<shell.getCenter(new T.Vector3()).z)
          object.position.z+=openDoor.getSize(new T.Vector3()).z*.91;
      }
    }
    if(['sedan','taxi','police','delivery'].includes(type)&&/^Headlight/.test(object.name))
      object.visible=false;
    if(!object.isMesh)return;
    const change=original=>{
      const name=object.name+' '+object.parent?.name;
      const warning=/LightBar_(Blue|Red|Lens)/.test(name)&&/Light(Red|Blue)/.test(original.name);
      const head=/Headlight(?:_[LR]|\.001)?\b/.test(name)||original.name==='Headlight';
      const tail=/Taillight/i.test(name)||['pickup','van'].includes(type)&&original.name==='PaintRed';
      const key=[original.uuid,warning?'warning':head?'head':tail?'tail':
        /Body|Roof|Door_|Mirror_[LR]/.test(name)?name.match(/Door_/)?.[0]??'shell':'trim'].join(':');
      if(materials.has(key))return materials.get(key);
      const mat=original.clone();
      mat.userData.vehicleFinish=true;
      const channel=original.name;
      const sedanPaint=channel==='Metal'&&/\b(Body|Roof|Door_F[LR]|Door_R[LR]|Mirror_[LR])\b/.test(name);
      const donorPaint={suv:'PaintGreen','hatchback-sports':'PaintRed',pickup:'PaintBlue',van:'PaintPearl',
        delivery:'Cream',ambulance:'BodyWhite'}[type];
      const bodyPaint=channel===donorPaint&&/Body|Roof|Door_|Mirror_|Tailgate/.test(name);
      const policePaint=type==='police'&&['PaintBlack','Cream'].includes(channel)&&/Body|Door_|Roof/.test(name);
      if ((type==='sedan'||type==='taxi')&&sedanPaint || policePaint || bodyPaint) {
        mat.color.set(bodyColors[type]);
        mat.roughness=['delivery','ambulance'].includes(type)?.43:.31;
        mat.metalness=['delivery','ambulance'].includes(type)?.06:.18;
        mat.envMap=environment;
        mat.envMapIntensity=type==='taxi'?.44:.50;
      }
      if ((type==='police'&&policePaint||type==='taxi'&&sedanPaint)&&/Door_/.test(name)) {
        // The livery follows the height of the existing door surface.
        mat.onBeforeCompile=shader=>{
          shader.vertexShader='varying float vDoorHeight;\n'+shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nvDoorHeight = (modelMatrix * vec4(position,1.0)).y;');
          shader.fragmentShader='varying float vDoorHeight;\n'+shader.fragmentShader.replace(
            '#include <color_fragment>',
            '#include <color_fragment>\ndiffuseColor.rgb=mix(vec3(.024,.082,.189),diffuseColor.rgb,smoothstep(.145,.153,vDoorHeight));');
        };
        mat.customProgramCacheKey=()=>'fleet-door-livery';
      }
      if(channel.includes('Glass')){
        const furnished=original.transparent&&['sedan','taxi','police','delivery','van'].includes(type);
        const darkTint=channel==='GlassTint'||/Rear|Back/.test(name);
        mat.color.set(darkTint?'#2e414b':furnished?'#455b68':'#3d535e');
        mat.roughness=darkTint?.24:.17;
        mat.metalness=furnished?.05:.13;
        mat.opacity=furnished?(darkTint?.83:.68):1;
        mat.transparent=furnished;
        mat.depthWrite=!furnished;
        mat.envMap=environment;
        mat.envMapIntensity=furnished?.94:.78;
      }
      if(/LightBar_(Blue|Red|Lens)/.test(name)&&/Light(Red|Blue)/.test(channel)){
        mat.color.set(channel==='LightRed'?'#ed4051':'#3984ef');
        mat.emissive.copy(mat.color);
        mat.emissiveIntensity=channel==='LightRed'?2.6:.3;
        warnings.set(mat,channel==='LightRed'?0:1);
      } else if (head){
        mat.emissive.set('#bad8fc');mat.emissiveIntensity=.65;headlamps.add(mat);
      } else if (tail){
        mat.emissive.set('#ea1c37');mat.emissiveIntensity=.30;rearLamps.add(mat);
      }
      materials.set(key,mat);
      return mat;
    };
    object.material=Array.isArray(object.material)?object.material.map(change):change(object.material);
    object.castShadow=Array.isArray(object.material)?object.material.some(mat=>!mat.transparent):!object.material.transparent;
    object.receiveShadow=true;
  });
  if(['sedan','taxi','police','delivery'].includes(type))fitFrontLights(T,model,type,headlamps);
  fitWheelFaces(T,wheels,type);
  if(type==='ambulance'){
    const rear=new T.MeshStandardMaterial({color:'#a12a38',emissive:'#ea1c37',emissiveIntensity:.30,roughness:.4});
    rearLamps.add(rear);
    for(const x of [-3.91,3.91]){
      const lamp=new T.Mesh(new T.BoxGeometry(.44,.79,.20),rear);
      lamp.position.set(x,3.65,-11.62);model.add(lamp);
    }
  }
  const bounds=new T.Box3().setFromObject(model,true);
  function label(text,x,y,z,w,h,turn,fg,bg){
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),signMaterial(text,256,64,fg,bg));
    mesh.position.set(x,y,z);mesh.rotation.y=turn;model.add(mesh);
  }
  if (type==='taxi'){
    const top=new T.Box3().setFromObject(model.getObjectByName('Roof'),true).max.y;
    const light=new T.Mesh(new T.CapsuleGeometry(.32,2.60,5,12),
      new T.MeshStandardMaterial({color:'#f2f8ff',emissive:'#acd4fc',emissiveIntensity:1.25,roughness:.36}));
    light.rotation.z=Math.PI/2;light.position.set(0,top+.32,-.80);model.add(light);
    for(const side of [-1,1])label('出租车Taxi',0,top+.32,-.80+side*.32,2.73,.56,side<0?Math.PI:0,'#eff9ff','#235887');
  }
  if(type==='police')for(const side of [-1,1]){
    const door=new T.Box3().setFromObject(model.getObjectByName(side>0?'Door_FL':'Door_FR'),true);
    const x=side>0?door.max.x:door.min.x;
    label('警察',x+side*.025,2.34,.38,2.35,.72,side*Math.PI/2,'#f6fbff','#214575');
  }
  batchVehicleBody(T,model,wheels);
  return {model,bounds,wheels:wheels.map(({object})=>object),update(distance,stopping,time,night,scale){
    for(const {object,radius} of wheels)object.rotation.x+=distance/(radius*scale);
    for(const mat of headlamps)mat.emissiveIntensity=night?1.34:.54;
    for(const mat of rearLamps)mat.emissiveIntensity=stopping?1.6:night?.65:.30;
    for(const [mat,phase] of warnings)mat.emissiveIntensity=Math.floor(time*2)%2===phase?2.8:.3;
  }};
}
