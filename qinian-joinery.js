import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';

// The south three bays have four five-rail doors apiece. The other nine bays
// are three-rail windows above a continuous sill wall. Construct the two leaf
// types once and share their geometry in every bay and working hinge.
export function createQinianJoinery(T, {lacquer,redDark,stoneLight}) {
  const redEdge = new T.MeshStandardMaterial({color:'#a14335',roughness:.72});
  const latticeWood = new T.MeshStandardMaterial({color:'#7b382d',roughness:.76});
  const windowBacking = new T.MeshStandardMaterial({color:'#515344',roughness:.87});
  const brass = new T.MeshStandardMaterial({color:'#ad834a',roughness:.46,metalness:.45});
  const masonry = new T.MeshStandardMaterial({color:'#87695b',roughness:.94});
  const doorHeight=.334, windowHeight=.216;

  function cloudReliefTexture(){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;
    const c=canvas.getContext('2d');
    c.lineJoin=c.lineCap='round';
    for(const [color,offset] of [['#643229',1.25],['#965146',-1.10]]){
      c.save();c.translate(0,offset);c.strokeStyle=color;c.lineWidth=2.3;
      c.beginPath();c.moveTo(11,69);c.lineTo(11,25);c.quadraticCurveTo(11,16,21,16);
      c.lineTo(107,16);c.quadraticCurveTo(117,16,117,25);c.lineTo(117,69);c.quadraticCurveTo(117,80,108,80);
      c.lineTo(20,80);c.quadraticCurveTo(11,80,11,69);c.stroke();
      c.beginPath();c.moveTo(31,56);
      c.bezierCurveTo(16,55,22,40,32,39);c.bezierCurveTo(36,27,51,29,57,36);
      c.bezierCurveTo(62,28,71,28,77,36);c.bezierCurveTo(88,32,95,35,97,44);
      c.bezierCurveTo(111,45,105,60,96,59);c.bezierCurveTo(87,68,78,64,77,57);
      c.bezierCurveTo(70,66,62,65,57,59);c.bezierCurveTo(48,65,38,64,31,56);c.stroke();
      for(const side of [-1,1]){
        c.beginPath();c.moveTo(65+side*26,53);c.bezierCurveTo(65+side*35,62,65+side*35,43,65+side*21,47);
        c.quadraticCurveTo(65+side*12,50,65+side*7,55);c.stroke();
      }
      c.restore();
    }
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
    return new T.MeshStandardMaterial({map,alphaTest:.16,roughness:.84});
  }
  const cloudRelief = cloudReliefTexture();

  function latticeLeaf(kind) {
    const door=kind==='door';
    const height=door?doorHeight:windowHeight;
    const batches=new Map();
    function add(material,geometry) {
      if(!batches.has(material))batches.set(material,[]);
      batches.get(material).push(geometry);
    }
    function box(material,x,y,z,w,h,d) {
      add(material,new T.BoxGeometry(w,h,d).translate(x,y,z));
    }
    function bar(x0,y0,x1,y1,depth=.012) {
      const length=Math.hypot(x1-x0,y1-y0);
      const rail=new T.BoxGeometry(length+.0013,.0026,depth);
      rail.rotateZ(Math.atan2(y1-y0,x1-x0));
      rail.translate((x0+x1)/2,(y0+y1)/2,.0005);
      add(latticeWood,rail);
    }
    function grille(y0,y1) {
      const left=-.030,right=.030,pitch=.022;
      for(const slope of [-1,1])for(let offset=y0-.045;offset<=y1+.045;offset+=pitch){
        const entry=Math.max(left,Math.min((y0-offset)/slope,(y1-offset)/slope));
        const exit=Math.min(right,Math.max((y0-offset)/slope,(y1-offset)/slope));
        if(exit-entry>.002)bar(entry,offset+slope*entry,exit,offset+slope*exit);
      }
      for(let y=y0+.012;y<y1-.006;y+=pitch)bar(left,y,right,y,.010);
    }
    const railPositions=door?[.018,.265,.402,.927,.982]:[.024,.153,.975];
    const head=height*(door?.927:.975),lower=height*(door?.402:.153);
    for(const side of [-1,1]) {
      box(lacquer,side*.0345,height/2,0,.006,height,.019);
      box(redEdge,side*.0318,height/2,.0098,.0016,height-.004,.0026);
    }
    for(const fraction of railPositions) {
      box(lacquer,0,fraction*height,0,.071,.008,.019);
      box(redEdge,0,fraction*height+.0026,.010,.069,.0014,.0028);
    }
    box(redDark,0,(head+height)/2,0,.063,height-head-.005,.010);
    grille(lower+.004,head-.003);
    if(!door){
      box(windowBacking,0,(head+lower)/2,-.009,.065,head-lower,.003);
      box(redDark,0,lower*.51,0,.065,lower-.006,.013);
    }else{
      for(const side of [-1,1]){
        const corner=side*.027,y=height*.897;
        box(brass,corner-side*.0033,y,.010,.008,.002,.0018);
        box(brass,corner,y-.003,.010,.0018,.008,.0018);
      }
      for(const [bottom,top] of [[.025,.258],[.272,.395]]){
        const panelY=(bottom+top)/2*height,panelH=(top-bottom)*height-.006;
        box(redDark,0,panelY,0,.062,panelH,.013);
        for(const side of [-1,1]){
          const face= new T.PlaneGeometry(.058,panelH-.002);
          if(side<0)face.rotateY(Math.PI);
          face.translate(0,panelY,side*.0067);
          add(cloudRelief,face);
        }
      }
    }
    const template=new T.Group();
    for(const [material,geometries] of batches){
      const mesh=new T.Mesh(mergeGeometries(geometries,false),material);
      mesh.castShadow=material!==cloudRelief;mesh.receiveShadow=true;template.add(mesh);
      for(const geometry of geometries)geometry.dispose();
    }
    return template;
  }
  const doorTemplate=latticeLeaf('door'), windowTemplate=latticeLeaf('window');
  const windowTransforms=[],transomTransforms=[];
  const boxGeometry=new T.BoxGeometry(1,1,1);
  const ringGeometry=new T.TorusGeometry(.0047,.00125,6,18);
  const escutcheon=new T.CylinderGeometry(.0067,.0067,.002,8).rotateX(Math.PI/2);
  const bossGeometry=new T.SphereGeometry(.00135,8,5);
  function box(parent,material,x,y,z,w,h,d){
    const mesh=new T.Mesh(boxGeometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
    mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const transom=new T.Group();
  transom.name='Qinian square upper transom';
  const transomParts=new Map();
  function transomPiece(material,x,y,z,w,h,d){
    if(!transomParts.has(material))transomParts.set(material,[]);
    transomParts.get(material).push(new T.BoxGeometry(w,h,d).translate(x,y,z));
  }
  transomPiece(lacquer,0,.844,.017,.348,.043,.034);
  transomPiece(redEdge,0,.824,.037,.345,.004,.004);
  for(const x of [-.112,0,.112]){
    transomPiece(redDark,x,.845,.037,.098,.025,.004);
    for(const n of [-1,1])for(const y of [-1,1]){
      transomPiece(brass,x+n*.043-n*.004,.845+y*.010,.040,.012,.0019,.002);
      transomPiece(brass,x+n*.043,.845+y*.010-y*.0029,.040,.0019,.008,.002);
    }
    for(let j=-3;j<=3;j++){
      transomPiece(latticeWood,x+j*.011,.845,.040,.0016,.018,.003);
    }
    for(const y of [-.005,.005])transomPiece(latticeWood,x,.845+y,.041,.080,.0016,.003);
  }
  for(const [material,parts] of transomParts){
    const mesh=new T.Mesh(mergeGeometries(parts,false),material);
    mesh.castShadow=mesh.receiveShadow=true;transom.add(mesh);
    for(const part of parts)part.dispose();
  }
  function addHardware(parent,side){
    for(const face of [-1,1]){
      const x=side*.017,y=.119,z=face*.010;
      const plate=new T.Mesh(escutcheon,brass);plate.position.set(x,y,z);plate.castShadow=true;parent.add(plate);
      const ring=new T.Mesh(ringGeometry,brass);ring.position.set(x,y-.0038,z+face*.002);
      ring.name='qinian-door-ring';ring.castShadow=true;parent.add(ring);
      for(const dx of [-.0047,.0047]){
        const boss=new T.Mesh(bossGeometry,brass);boss.position.set(x+dx,y+.001,z+face*.0018);parent.add(boss);
      }
    }
  }
  function addDoorLeaf(parent,x,y,z,hardwareSide=0){
    const leaf=doorTemplate.clone(true);leaf.name='Qinian five-rail door leaf';leaf.position.set(x,y,z);
    parent.add(leaf);
    if(hardwareSide)addHardware(leaf,hardwareSide);
  }
  const offset=new T.Matrix4();
  function placeTemplate(transforms,bay,x=0,y=0,z=0){
    transforms.push(bay.matrix.clone().multiply(offset.makeTranslation(x,y,z)));
  }
  function finishBays(hall){
    for(const [template,transforms,name] of [
      [windowTemplate,windowTransforms,'Qinian three-rail casements'],
      [transom,transomTransforms,'Qinian square upper transoms'],
    ]){
      if(!transforms.length)continue;
      for(const part of template.children){
        // These bay pieces are fixed above street navigation height. Their
        // original geometry and world transforms can share a single draw.
        part.updateMatrix();
        const batch=new T.InstancedMesh(part.geometry,part.material,transforms.length);
        batch.name=name;
        for(let i=0;i<transforms.length;i++){
          offset.multiplyMatrices(transforms[i],part.matrix);
          batch.setMatrixAt(i,offset);
        }
        batch.castShadow=part.castShadow;
        batch.receiveShadow=part.receiveShadow;
        hall.add(batch);
      }
    }
  }
  function addBay(bay,index){
    const main=index===3, isDoor=Math.abs(index-3)<=1;
    bay.name=isDoor?'Qinian south door bay':'Qinian casement and sill wall bay';
    for(const side of [-1,1]){
      box(bay,lacquer,side*.169,.663,.013,.019,.387,.035);
      box(bay,redDark,side*.163,.667,.031,.004,.374,.004);
    }
    bay.updateMatrix();
    placeTemplate(transomTransforms,bay);
    box(bay,lacquer,0,.866,.014,.352,.014,.036);
    box(bay,redEdge,0,.872,.034,.362,.004,.006);
    if(isDoor){
      box(bay,stoneLight,0,.481,.020,.331,.013,.073);
      if(!main)for(let i=0;i<4;i++)addDoorLeaf(bay,(i-1.5)*.078,.489,.025,i===1?1:i===2?-1:0);
      return;
    }
    box(bay,masonry,0,.529,.002,.338,.112,.036);
    box(bay,stoneLight,0,.477,.017,.346,.014,.053);
    box(bay,redDark,0,.591,.014,.351,.020,.048);
    box(bay,redEdge,0,.603,.018,.341,.005,.043);
    for(let i=0;i<4;i++)placeTemplate(windowTransforms,bay,(i-1.5)*.078,.607,.025);
  }
  return {addBay,addDoorLeaf,finishBays};
}
