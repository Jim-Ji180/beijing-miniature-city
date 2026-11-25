// The frame advances ahead of the curtain wall, as at Doka's Parkview site.
export function createOfficeConstruction(T, {building, spec, onStart, onFinish}) {
  const sequence = new T.Group();
  sequence.name = 'office-construction';
  sequence.position.copy(building.position);
  sequence.visible = false;
  const frame = new T.Group();
  sequence.add(frame);

  const {w,d,h}=spec;
  const finishedHeight=new T.Box3().setFromObject(building).max.y-building.position.y;
  const podium=Math.min(.37,h*.18);
  const width=w*.91, depth=d*.86, centerZ=-d*.035;
  const floors=Math.floor((h-podium)/.15);
  const floorHeight=(h-podium)/floors;
  const box=new T.BoxGeometry();
  const concrete=new T.MeshStandardMaterial({color:'#bbb6ab',roughness:.94});
  const plywood=new T.MeshStandardMaterial({color:'#918070',roughness:.92});
  const rail=new T.MeshStandardMaterial({color:'#bf984d',roughness:.75});
  const curtainPlane=new T.Plane(new T.Vector3(0,-1,0),building.position.y);
  const floorGroups=[];
  const pieceTransform=new T.Object3D();

  function piece(parent,mat,x,y,z,sx,sy,sz){
    const mesh=new T.Mesh(box,mat);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.castShadow=true;mesh.receiveShadow=true;
    parent.add(mesh);
    return mesh;
  }
  function instances(parent,mat,parts){
    const mesh=new T.InstancedMesh(box,mat,parts.length);
    for(let i=0;i<parts.length;i++){
      const [x,y,z,sx,sy,sz]=parts[i];
      pieceTransform.position.set(x,y,z);
      pieceTransform.scale.set(sx,sy,sz);
      pieceTransform.updateMatrix();
      mesh.setMatrixAt(i,pieceTransform.matrix);
    }
    mesh.castShadow=true;mesh.receiveShadow=true;
    parent.add(mesh);
  }
  const foundation=new T.Group();
  frame.add(foundation);
  piece(foundation,concrete,0,.033,0,w,.066,d);
  instances(foundation,plywood,[
    [-w*.482,.043,0,.018,.073,d],[w*.482,.043,0,.018,.073,d],
    [0,.043,-d*.481,w,.073,.018],[0,.043,d*.481,w,.073,.018],
  ]);

  for(let level=0;level<floors;level++){
    const bottom=level===0?.06:podium+(level-1)*floorHeight;
    const top=podium+level*floorHeight;
    const height=top-bottom;
    const widthAtFloor=level===0?w:width,depthAtFloor=level===0?d:depth;
    const z=level===0?0:centerZ;
    const floor=new T.Group(),columns=new T.Group();
    floor.position.y=bottom;frame.add(floor);floor.add(columns);
    const columnParts=[[0,height/2,z,width*.29,height,depth*.32]];
    for(const x of [-.40,0,.40])for(const side of [-1,1])
      columnParts.push([x*widthAtFloor,height/2,z+side*depthAtFloor*.38,.043,height,.043]);
    instances(columns,concrete,columnParts);
    const deck=new T.Group();
    floor.add(deck);
    piece(deck,concrete,0,-.010,z,widthAtFloor,.026,depthAtFloor);
    // Temporary edge protection remains on the leading slabs until enclosed.
    const railParts=[];
    for(const side of [-1,1]){
      railParts.push([0,.032,z+side*depthAtFloor*.476,widthAtFloor*.94,.006,.006]);
      for(const x of [-.44,0,.44])
        railParts.push([x*widthAtFloor,.017,z+side*depthAtFloor*.476,.006,.039,.006]);
    }
    instances(deck,rail,railParts);
    floorGroups.push({floor,columns,deck,height,top});
  }
  // The final slab sits exactly at the office roof height.
  const roof=piece(frame,concrete,0,h-.012,centerZ,width,.024,depth);
  let elapsed=null, shell=null;
  const shellMaterials=new Map();
  const floorTime=.24, foundationTime=.58, facadeLag=1.24;
  const frameEnd=foundationTime+floors*floorTime;
  const duration=frameEnd+facadeLag+.38;
  const ease=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);

  function showBuiltOffice(){
    sequence.visible=false;
    building.visible=true;
    if(shell)sequence.remove(shell);
  }

  function prepareShell(){
    if(shell)return;
    shell=building.clone(true);
    shell.position.set(0,0,0);
    shell.name='completed-facade-under-installation';
    shell.traverse(object=>{
      if(!object.material)return;
      const cut=original=>{
        if(!shellMaterials.has(original)){
          const material=original.clone();
          material.onBeforeCompile=original.onBeforeCompile;
          material.customProgramCacheKey=original.customProgramCacheKey.bind(original);
          material.clippingPlanes=[...(original.clippingPlanes||[]),curtainPlane];
          material.clipShadows=true;
          shellMaterials.set(original,material);
        }
        return shellMaterials.get(original);
      };
      object.material=Array.isArray(object.material)?object.material.map(cut):cut(object.material);
    });
  }

  function warm(compile){
    prepareShell();
    sequence.add(shell);
    try{return compile(sequence);}
    finally{sequence.remove(shell);}
  }

  function start(){
    prepareShell();
    sequence.add(shell);
    building.visible=false;
    sequence.visible=true;
    elapsed=0;
    draw();
    onStart();
  }

  function draw(){
    const step=(elapsed-foundationTime)/floorTime;
    // Expose one full floor at a time with a short travel for the next panel row.
    const facadeStep=(elapsed-foundationTime-facadeLag)/floorTime;
    let facadeTop=0;
    if(facadeStep>=0){
      const level=Math.min(Math.floor(facadeStep),floors-1);
      const lower=level===0?0:floorGroups[level-1].top;
      facadeTop=T.MathUtils.lerp(lower,floorGroups[level].top,ease(.14,.88,facadeStep-level));
      if(facadeStep>=floors){
        facadeTop=T.MathUtils.lerp(floorGroups.at(-1).top,finishedHeight,ease(0,1.35,facadeStep-floors));
      }
    }
    curtainPlane.constant=building.position.y+facadeTop;
    shell.visible=facadeStep>=0;
    foundation.scale.y=Math.max(.001,ease(0,.46,elapsed));
    foundation.visible=facadeTop<.065;
    for(let i=0;i<floorGroups.length;i++){
      const {floor,columns,deck,height,top}=floorGroups[i];
      const phase=step-i;
      floor.visible=phase>0&&facadeTop<top+.041;
      if(!floor.visible)continue;
      columns.scale.y=Math.max(.001,ease(0,.68,phase));
      deck.visible=phase>.43;
      deck.position.y=height+.039*(1-ease(.43,.98,phase));
    }
    roof.visible=elapsed>=frameEnd&&facadeTop<h;
  }

  function reset(){
    if(elapsed===null)return;
    elapsed=null;
    showBuiltOffice();
    onFinish();
  }
  return {
    group:sequence,start,reset,warm,
    update(dt){
      if(elapsed===null)return;
      elapsed+=dt;
      if(elapsed>=duration)reset();
      else draw();
    },
    state(){return {running:elapsed!==null,progress:elapsed===null?null:elapsed/duration};},
  };
}
