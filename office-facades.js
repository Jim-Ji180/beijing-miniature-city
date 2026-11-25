// Restrained stone, metal and glazing colours from the Miami and TinyRJ views.
const cache = new WeakMap();
const ivory = '#f3eee0';
const paleStone = '#dcc9a7';
const cream = '#f7f2e5';
const families = [
  { cladding:ivory, rail:cream, glass:'#586870', mullion:'#7c817c', mode:'piers', bay:.139, story:.151, coverage:.61 },
  { cladding:'#dbd9d1', rail:'#ebe7db', glass:'#666762', mullion:'#8b8b7d', mode:'ribbons', bay:.185, story:.129, coverage:.55 },
  { cladding:'#ab6d56', rail:'#e5d8c4', glass:'#5e6762', mullion:'#83857b', mode:'brick', bay:.108, story:.146, coverage:.55 },
  { cladding:'#838779', rail:'#d8dbcc', glass:'#63736a', mullion:'#9baba0', mode:'fins', bay:.139, story:.140, coverage:.94 },
  { cladding:'#827d72', rail:'#dcd2bd', glass:'#605e58', mullion:'#a8a092', mode:'grid', bay:.140, story:.125, coverage:.95 },
  { cladding:ivory, rail:cream, glass:'#557578', mullion:'#819b97', mode:'spandrels', bay:.173, story:.153, coverage:.78 },
  { cladding:paleStone, rail:'#f0dfbf', glass:'#74756a', mullion:'#9c9a86', mode:'ribbons', bay:.147, story:.145, coverage:.45 },
  { cladding:'#806356', rail:'#ddc9a7', glass:'#806e60', mullion:'#bda789', mode:'bronze', bay:.116, story:.127, coverage:.95 },
  { cladding:'#828783', rail:'#d6d8cd', glass:'#53666d', mullion:'#8b999a', mode:'curtain', bay:.121, story:.113, coverage:.95 },
];

// Finish and facade rhythm can vary independently between neighboring buildings.
const tones = {
  limestone: {cladding:'#ded4bf',rail:'#efe8d6',glass:'#65675f',mullion:'#858379'},
  ash: {cladding:'#bebdb5',rail:'#dcdad2',glass:'#52585b',mullion:'#909693'},
  clay: {cladding:'#a56d59',rail:'#dfc7ac',glass:'#625e57',mullion:'#ab9380'},
  sage: {cladding:'#a3ac9a',rail:'#dce0d1',glass:'#526962',mullion:'#8f9d91'},
  sand: {cladding:'#d0b897',rail:'#efdfc2',glass:'#777366',mullion:'#aa9f83'},
  bronze: {cladding:'#927263',rail:'#dec4a2',glass:'#6d5b51',mullion:'#b7a18e'},
  steel: {cladding:'#a4aeb0',rail:'#e2e6df',glass:'#4e6878',mullion:'#879ea9'},
  teal: {cladding:ivory,rail:cream,glass:'#4e777b',mullion:'#7d9694'},
};

export function createOfficePigment(T,color,properties={}) {
  const material = new T.MeshStandardMaterial({color,roughness:.92,...properties});
  material.customProgramCacheKey = () => 'office-illustration-v1';
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `
      #include <lights_fragment_end>
      const vec3 officeLuma = vec3(.2126,.7152,.0722);
      float incident = dot(reflectedLight.directDiffuse,officeLuma) / max(dot(diffuseColor.rgb,officeLuma),.018);
      float face = smoothstep(.19,.31,incident);
      reflectedLight.directDiffuse *= .84+.18*face;
      reflectedLight.indirectDiffuse *= mix(vec3(.96,.98,1.04),vec3(1.04,1.02,.98),face);
      reflectedLight.directSpecular *= .16;
      reflectedLight.indirectSpecular *= .12;
    `);
  };
  return material;
}

function resources(T) {
  if (cache.has(T)) return cache.get(T);
  const result = {
    envelopes:new Map(),
    geometry:new T.BoxGeometry(),
    pane:new T.PlaneGeometry(),
  };
  cache.set(T,result);
  return result;
}

export function officeEnvelope(T,index,tone) {
  const {envelopes} = resources(T);
  const familyIndex=index % families.length;
  const toneKey=Object.hasOwn(tones,tone)?tone:'default';
  const key=familyIndex+'/'+toneKey;
  if(envelopes.has(key))return envelopes.get(key);
  const profile={...families[familyIndex],...tones[toneKey]};
  const surface=color=>createOfficePigment(T,color);
  const glaze=surface(profile.glass);
  glaze.name='Office inset glazing';
  const shade=surface(new T.Color(profile.glass).multiplyScalar(.76));
  const lit=surface(profile.glass);
  lit.emissive.set('#ffcf8f');
  lit.emissiveIntensity=0;
  lit.userData.nightEmission=.83;
  const envelope={
    ...profile,glaze,shade,lit,
    cladding:surface(profile.cladding),
    rail:surface(profile.rail),
    mullion:surface(profile.mullion),
  };
  envelopes.set(key,envelope);
  return envelope;
}

export function addOfficeFacade(T,group,profile,{x,z,w,d,bottom,top,seed,cornerInset=0}) {
  const height = top-bottom;
  const {geometry,pane}=resources(T);
  if(height<=0)return;
  if(height<.16){
    const wall=new T.Mesh(geometry,profile.cladding);
    wall.scale.set(w,height,d);
    wall.position.set(x,(bottom+top)*.5,z);
    wall.castShadow=wall.receiveShadow=true;
    group.add(wall);
    return;
  }
  const { mode, coverage, rail, mullion, shade } = profile;
  const curtain = ['curtain','grid','fins','bronze'].includes(mode);
  const punched = mode==='piers'||mode==='brick';
  const ribbon = mode==='ribbons';
  const floorCount = Math.max(2,Math.round(height/profile.story));
  const floorH = height/floorCount;
  const parts = new Map();
  const windows = new Map();
  const tint = new T.Color();
  const seat=.003;
  const wallDepth=.010;
  const glassInset=.0044;

  function put(material,point,color=null){
    if(!parts.has(material))parts.set(material,[]);
    parts.get(material).push([point,color]);
  }

  function panel(material,axis,sign,u,y,width,tall,depth,offset,color=null) {
    const [center,faceLength,faceDepth] = axis===0 ? [z,w,d] : [x,d,w];
    const out = center+sign*(faceDepth/2+offset);
    // Keep every face component inside its return, including the thin frame.
    const widthWithinFace = faceLength-2*(Math.abs(u)+cornerInset+.008);
    if (widthWithinFace <= .001) return;
    const span = Math.min(width,widthWithinFace);
    const point = axis===0 ? [x+u,y,out,span,tall,depth] : [out,y,z+u,depth,tall,span];
    put(material,point,color);
  }

  // The front/back strips carry the corners; the side strips terminate against
  // them. All four rear faces seat into the cladding and share the same level.
  function perimeterBand(material,y,tall,projection){
    const depth=projection+seat;
    const center=(projection-seat)*.5;
    for(const side of [-1,1]){
      put(material,[x,y,z+side*(d*.5+center),w+2*projection,tall,depth]);
      put(material,[x+side*(w*.5+center),y,z,depth,tall,d-2*seat]);
    }
  }

  function wallStrip(axis,sign,left,right,low,high){
    if(right-left<.00001||high-low<.00001)return;
    const u=(left+right)*.5,y=(low+high)*.5,span=right-left,tall=high-low;
    const at=axis===0?z+sign*(d-wallDepth)*.5:x+sign*(w-wallDepth)*.5;
    const point=axis===0?[x+u,y,at,span,tall,wallDepth]:[at,y,z+u,wallDepth,tall,span];
    put(profile.cladding,point);
  }

  function glaze(material,axis,sign,u,y,width,tall,color){
    if(!windows.has(material))windows.set(material,[]);
    const at=axis===0?z+sign*(d*.5-glassInset):x+sign*(w*.5-glassInset);
    const turn=axis===0?(sign===1?0:Math.PI):sign*Math.PI*.5;
    windows.get(material).push([axis===0?x+u:at,y,axis===0?at:z+u,width,tall,turn,color]);
  }

  const horizontalBelt=!cornerInset&&(ribbon||mode==='spandrels'||mode==='brick');
  if(horizontalBelt){
    for(let floor=0;floor<floorCount;floor++){
      const y=bottom+(floor+.5)*floorH;
      if(ribbon)perimeterBand(rail,y-floorH*coverage*.5-.007,.018,.019);
      else perimeterBand(rail,y-floorH*(mode==='brick'?.38:.37),mode==='brick'?.009:.015,.017);
    }
  }
  if(!cornerInset){
    // Reuse the original envelope for navigation and construction decks.
    const volume=new T.Mesh(geometry,profile.cladding);
    volume.scale.set(w,height,d);
    volume.position.set(x,(bottom+top)*.5,z);
    volume.visible=false;
    volume.userData.officeEnvelopeVolume=true;
    group.add(volume);
    perimeterBand(rail,top-.010,.013,.013);
    put(profile.cladding,[x,bottom+seat*.5,z,w,seat,d]);
    put(profile.cladding,[x,top-seat*.5,z,w,seat,d]);
    const cornerWidth=curtain?Math.min(.033,Math.min(w,d)*.12):.022;
    const cornerFinish=['curtain','grid','brick'].includes(mode)?rail:curtain?mullion:profile.cladding;
    const cornerOut=.010;
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const y=(bottom+top)*.5, outer=(cornerOut-seat)*.5;
      put(cornerFinish,[x+sx*(w*.5+(cornerOut-cornerWidth)*.5),y,z+sz*(d*.5+outer),
        cornerWidth+cornerOut,height-.006,cornerOut+seat]);
      put(cornerFinish,[x+sx*(w*.5+outer),y,z+sz*(d*.5-(cornerWidth+seat)*.5),
        cornerOut+seat,height-.006,cornerWidth-seat]);
    }
  }

  for (const axis of [0,1]) for (const sign of [-1,1]) {
    const length = (axis===0?w:d)-2*cornerInset;
    const count = Math.max(profile.minimumBays??2,Math.round((length-.025)/profile.bay));
    const bay = (length-.021)/count;
    const ribbonHeight = floorH*coverage;

    for (let floor=0; floor<floorCount; floor++) {
      const y = bottom+(floor+.5)*floorH;
      const mechanical = floorCount>=13&&floor===Math.floor(floorCount*.73)&&seed%3===0;
      if (mechanical) {
        wallStrip(axis,sign,-length*.5,length*.5,y-floorH*.5,y+floorH*.5);
        panel(shade,axis,sign,0,y,length*.97,floorH*.62,.013,.004);
        for (let row=-1; row<=1; row++) {
          panel(mullion,axis,sign,0,y+row*floorH*.16,length*.955,.0036,.008,.012);
        }
        continue;
      }

      const opening=ribbon?.978:coverage;
      const paneHeight=curtain?floorH*.935:ribbon?ribbonHeight:floorH*(profile.windowHeight??(mode==='piers'?.72:mode==='brick'?.64:.59));
      const insetY=y-.0009, low=insetY-paneHeight*.5, high=insetY+paneHeight*.5;
      const paneWidth=bay*opening;
      wallStrip(axis,sign,-length*.5,length*.5,y-floorH*.5,low);
      wallStrip(axis,sign,-length*.5,length*.5,high,y+floorH*.5);
      let previous=-length*.5;

      for (let j=0; j<count; j++) {
        const u = (j-(count-1)*.5)*bay;
        const key = (floor*17+j*11+seed*5+axis*29+(sign>0?13:0))%47;
        // Keep panes as stable colour groups across adjacent floors.
        const lighterBay = (curtain || ribbon) && count>3 &&
          Math.floor(floor/5)===seed%3 && j>=1 && j<=Math.ceil(count*.58);
        const brightness = lighterBay ? 1.065 : key%11===0 ? .91 : 1;
        const color = tint.setRGB(brightness,brightness,brightness).clone();
        const glass = key===2||key===37 ? profile.lit : profile.glaze;
        wallStrip(axis,sign,previous,u-paneWidth*.5,low,high);
        glaze(glass,axis,sign,u,insetY,paneWidth,paneHeight,color);
        previous=u+paneWidth*.5;

        if (punched) {
          const sillDepth = mode==='piers' ? .012 : .009;
          panel(rail,axis,sign,u,y-paneHeight*.52,bay*(opening+.13),.0057,sillDepth+.003,sillDepth*.44);
          if (mode==='piers'&&bay>.096) {
            panel(mullion,axis,sign,u,y-.004,.0038,paneHeight-.009,.009,.006);
          }
        }
      }
      wallStrip(axis,sign,previous,length*.5,low,high);

      if (ribbon) {
        for (let j=1; j<count; j++) {
          const u=(j-count*.5)*bay;
          panel(mullion,axis,sign,u,y,.0032,ribbonHeight,.010,.007);
        }
      } else if (curtain) {
        const heavy = floor%6===0&&(mode==='grid'||mode==='bronze'||mode==='curtain');
        panel(heavy?rail:mullion,axis,sign,0,y-floorH*.48,length*.992,heavy?.008:.0037,.012,.008);
      }
    }

    if (curtain) {
      for (let j=0; j<=count; j++) {
        const major = (mode==='bronze'&&j%3===0)||(mode==='fins'&&j%2===0);
        const u = (j-count/2)*bay;
        panel(major?rail:mullion,axis,sign,u,(bottom+top)/2,
          major?(mode==='bronze'?.012:.008):.0038,height-.012,major?.023:.010,major?.012:.007);
      }
    }
    if (mode==='piers') {
      for (let j=0; j<=count; j+=2) {
        const u=(j-count/2)*bay;
        panel(rail,axis,sign,u,(bottom+top)/2,.014,height-.014,.017,.0065);
      }
    }
  }

  const transform = new T.Object3D();
  for (const [material,items] of parts) {
    const mesh = new T.InstancedMesh(geometry,material,items.length);
    mesh.name = 'office-envelope-'+mode;
    items.forEach(([[x,y,z,w,h,d],color],i) => {
      transform.position.set(x,y,z);
      transform.scale.set(w,h,d);
      transform.updateMatrix();
      mesh.setMatrixAt(i,transform.matrix);
      if (color) mesh.setColorAt(i,color);
    });
    mesh.castShadow=material===profile.cladding;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  for(const [material,panes] of windows){
    material.shadowSide=T.DoubleSide;
    const mesh=new T.InstancedMesh(pane,material,panes.length);
    mesh.name='office-recessed-window';
    panes.forEach(([x,y,z,w,h,turn,color],i)=>{
      transform.position.set(x,y,z);
      transform.rotation.y=turn;
      transform.scale.set(w,h,1);
      transform.updateMatrix();
      mesh.setMatrixAt(i,transform.matrix);
      mesh.setColorAt(i,color);
    });
    mesh.castShadow=mesh.receiveShadow=true;
    group.add(mesh);
  }
}
