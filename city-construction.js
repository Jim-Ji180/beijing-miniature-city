// A single replay clock; the permanent geometry never moves or changes shape.
export function createCityConstruction(T, scene, {setRoofBuilding}) {
  const actors=[];
  const active=new Set();
  const clamp=T.MathUtils.clamp;
  const smooth=t=>t*t*(3-2*t);
  const dummy=new T.Object3D();
  const deckMaterial=new T.MeshStandardMaterial({color:'#a9a398',roughness:.9});
  const deckGeometry=[new T.BoxGeometry(1,1,1),new T.CylinderGeometry(.5,.5,1,32)];
  const objectBounds=new T.Box3();
  const templePhases=[[0,0],[.23,.21],[.54,.53],[1,1]];
  const courtPhases=[[0,0],[.21,.17],[.60,.64],[1,1]];
  let decks=[],elapsed=null,duration=0;

  function register(root,{type,delay,seconds,structure,light}){
    const phases=type==='temple'?templePhases:type==='court'?courtPhases:null;
    actors.push({root,type,delay,seconds,structure,phases,light,intensity:light?.intensity});
    duration=Math.max(duration,delay+seconds);
  }

  function prepare(actor){
    const {root,type}=actor;
    if(actor.structure||actor.parts)return;
    root.updateWorldMatrix(true,true);
    const bounds=new T.Box3().setFromObject(root);
    const low=bounds.min.y,high=bounds.max.y;
    actor.low=low;actor.high=high;
    actor.floorCount=Math.max(4,Math.round((high-low)/.16));
    actor.plane=new T.Plane(new T.Vector3(0,-1,0),low);
    actor.parts=[];actor.profiles=[];
    const materials=new Map();
    function clip(source){
      if(materials.has(source))return materials.get(source);
      const copy=source.clone();
      copy.onBeforeCompile=source.onBeforeCompile;
      copy.customProgramCacheKey=source.customProgramCacheKey.bind(source);
      copy.clippingPlanes=[...(source.clippingPlanes||[]),actor.plane];
      copy.clipShadows=true;
      materials.set(source,copy);
      return copy;
    }
    root.traverse(object=>{
      if(object.material&&!object.userData.officeEnvelopeVolume){
        const original=object.material;
        // Only cull leaves with reliable static bounds. A culled parent would
        // hide its children, and a skinned or morphing mesh can outgrow its box.
        if(object.geometry&&!object.children.length&&!object.isSkinnedMesh&&!object.morphTargetInfluences){
          objectBounds.setFromObject(object);
        }else{
          objectBounds.makeEmpty();
        }
        const bounded=!objectBounds.isEmpty();
        actor.parts.push({
          object,original,clipped:Array.isArray(original)?original.map(clip):clip(original),
          low:bounded?objectBounds.min.y-.003:-Infinity,
          high:bounded?objectBounds.max.y+.003:Infinity,
        });
      }
      if(type!=='office'||object.parent!==root||!object.isMesh||object.isInstancedMesh)return;
      // Lay a temporary deck inside each straight-sided structural mass,
      // never across setbacks, roof equipment or the gap in a twin tower.
      const shape=object.geometry.type==='BoxGeometry'?0:object.geometry.type==='CylinderGeometry'&&object.geometry.parameters.radialSegments===32?1:-1;
      if(shape<0||Math.abs(object.rotation.x)+Math.abs(object.rotation.z)>.001)return;
      const bounds=objectBounds.setFromObject(object);
      const size=bounds.getSize(new T.Vector3());
      if(size.y<.16||Math.min(size.x,size.z)<.21)return;
      const center=object.getWorldPosition(new T.Vector3()),scale=object.getWorldScale(new T.Vector3());
      const dimensions=object.geometry.boundingBox.getSize(new T.Vector3()).multiply(scale);
      actor.profiles.push({shape,center,dimensions,low:bounds.min.y,high:bounds.max.y,angle:root.rotation.y+object.rotation.y});
    });
    actor.reveals=[...actor.parts].sort((a,b)=>a.low-b.low);
    actor.finishes=[...actor.parts].sort((a,b)=>a.high-b.high);
    actor.dynamicMaterials=[...materials].filter(([source])=>source.userData.nightEmission!==undefined||source.isLineBasicMaterial);
  }

  function phase(actor,t){
    if(actor.phases){
      // Let the base, walls and roof each have time to read, with a smooth
      // acceleration and release through every height range.
      const marks=actor.phases;
      for(let i=1;i<marks.length;i++){
        const [b,y]=marks[i];
        if(t>b)continue;
        const [a,x]=marks[i-1],u=(t-a)/(b-a);
        return x+(y-x)*smooth(u);
      }
      return 1;
    }
    const p=smooth(t);
    // Keep the silhouette moving continuously while successive window rows
    // become legible, even on high rises with many closely spaced stories.
    const floors=actor.floorCount;
    const levels=p*floors,whole=Math.floor(levels),fraction=levels-whole;
    return (whole+.76*fraction+.24*smooth(fraction))/floors;
  }

  function attach(actor){
    actor.nextReveal=0;
    actor.nextFinish=0;
    for(const part of actor.parts){
      part.visible=part.object.visible;
      part.object.visible=false;
    }
  }

  function restore(actor){
    actor.root.visible=actor.visible;
    if(actor.light)actor.light.intensity=actor.visible?actor.intensity:0;
    if(actor.structure){actor.structure.reset();return;}
    if(!actor.started)return;
    for(const {object,original,visible} of actor.parts){
      object.material=original;
      object.visible=visible;
    }
  }

  function reset(){
    if(elapsed===null)return;
    elapsed=null;
    for(const actor of active){restore(actor);setRoofBuilding(actor.root,false);}
    active.clear();
    for(const mesh of decks){mesh.count=0;mesh.visible=false;}
  }

  async function warm(compile){
    // Schedule one actor at a time when the browser is idle. Compilation
    // uses the city's light setup without an extra color or shadow render.
    for(const actor of [...actors].sort((a,b)=>a.delay-b.delay)){
      await new Promise(resolve=>{
        if(typeof requestIdleCallback==='function')requestIdleCallback(resolve,{timeout:250});
        else setTimeout(resolve,16);
      });
      if(elapsed!==null)break;
      prepare(actor);
      if(actor.structure){
        await actor.structure.warm(compile);
        continue;
      }
      let ready;
      try{
        for(const {object,clipped} of actor.parts)object.material=clipped;
        ready=compile(actor.root);
      }finally{
        for(const {object,original} of actor.parts)object.material=original;
      }
      await ready;
    }
  }

  function start(){
    reset();
    elapsed=0;
    const reserve=actors.reduce((sum,actor)=>sum+(actor.type==='office'?actor.root.children.length:0),0);
    for(const actor of actors){
      actor.visible=actor.root.visible;
      actor.started=false;actor.structureTime=0;
      actor.root.visible=false;
      if(actor.light)actor.light.intensity=0;
      active.add(actor);
      setRoofBuilding(actor.root,true);
    }
    if(!decks.length){
      decks=deckGeometry.map(geometry=>{
        const mesh=new T.InstancedMesh(geometry,deckMaterial,Math.max(1,reserve));
        mesh.name='temporary-construction-decks';
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
        mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;
        scene.add(mesh);
        return mesh;
      });
    }
    for(const mesh of decks)mesh.visible=true;
  }

  function update(dt){
    if(elapsed===null)return;
    elapsed+=dt;
    if(elapsed>=duration){reset();return;}
    for(const mesh of decks)mesh.count=0;
    for(const actor of active){
      const local=elapsed-actor.delay,t=local/actor.seconds;
      if(t<=0)continue;
      if(t>=1){restore(actor);setRoofBuilding(actor.root,false);active.delete(actor);continue;}
      if(!actor.started){
        prepare(actor);
        actor.started=true;
        if(actor.structure)actor.structure.start();
        else{
          actor.root.visible=actor.visible;
          if(actor.light)actor.light.intensity=actor.visible?actor.intensity:0;
          attach(actor);
        }
      }
      if(actor.structure){
        actor.structure.update(local-actor.structureTime);
        actor.structureTime=local;
        continue;
      }
      const height=T.MathUtils.lerp(actor.low-.001,actor.high+.001,phase(actor,t));
      actor.plane.constant=height;
      for(const [original,clipped] of actor.dynamicMaterials){
        clipped.opacity=original.opacity;
        if(original.userData.nightEmission!==undefined)clipped.emissiveIntensity=original.emissiveIntensity;
      }
      while(actor.nextReveal<actor.reveals.length&&actor.reveals[actor.nextReveal].low<=height){
        const {object,clipped,visible}=actor.reveals[actor.nextReveal++];
        object.material=clipped;
        object.visible=visible;
      }
      while(actor.nextFinish<actor.finishes.length&&actor.finishes[actor.nextFinish].high<=height){
        const {object,original}=actor.finishes[actor.nextFinish++];
        object.material=original;
      }
      for(const profile of actor.profiles){
        const {low,high,center,dimensions,shape,angle}=profile;
        if(height<low+.003||height>=high)continue;
        const mesh=decks[shape];
        const thickness=Math.min(.024,height-low);
        dummy.position.set(center.x,height-thickness*.5-.0002,center.z);
        dummy.rotation.y=angle;
        dummy.scale.set(dimensions.x*.991,thickness,dimensions.z*.991);
        dummy.updateMatrix();
        mesh.setMatrixAt(mesh.count++,dummy.matrix);
      }
    }
    for(const mesh of decks)if(mesh.count)mesh.instanceMatrix.needsUpdate=true;
  }

  return {
    register,warm,start,update,reset,
    get running(){return elapsed!==null;},
    isBuilding(root){for(const actor of active)if(actor.root===root)return true;return false;},
    state(){
      const totals={},complete={};
      for(const actor of actors){
        totals[actor.type]=(totals[actor.type]||0)+1;
        if(!active.has(actor))complete[actor.type]=(complete[actor.type]||0)+1;
      }
      return {running:elapsed!==null,progress:elapsed===null?null:elapsed/duration,totals,complete};
    },
  };
}
