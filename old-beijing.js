import { addSurfaceFinish } from './street-realism.js?v=1';
// A low-rise hutong quarter. Proportions and construction are informed by the
// Beijing hutong doorway and lane photographs in outputs/beijing-history-reference.
import { createDetailedTree } from './detailed-tree.js?v=20';
import { createDoorwayLettering } from './courtyard-lettering.js?v=1';
import { createStoneGuardian } from './stone-guardian.js?v=2';
import { createGateOrnaments } from './gate-ornament.js?v=1';
import { batchStaticDecoration } from './static-decoration-batches.js?v=1';
export function createOldBeijingCourt(T){
 const g=new T.Group();g.name='old-beijing-hutong-quarter';
 const lettering=createDoorwayLettering(T),gateOrnaments=createGateOrnaments(T);
 const material=(color,other={})=>new T.MeshStandardMaterial({color,roughness:1,...other});
 const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#a3a39b';ctx.fillRect(0,0,512,256);let seed=96127;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let j=0;j<16;j++)for(let i=-1;i<9;i++){const x=i*64+(j%2)*32,y=j*16,v=Math.floor(rand()*16-8);ctx.fillStyle=`rgb(${151+v},${151+v},${145+v})`;ctx.fillRect(x+1,y+1,62,14)}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
 const brick=material('#ffffff',{map:tex}),tile=new T.MeshPhysicalMaterial({color:'#c8944c',roughness:.45,metalness:0,clearcoat:.48,clearcoatRoughness:.38}),roof=material('#555e5c'),wood=material('#863e32'),frame=material('#573b34'),glass=material('#d0c8b6'),stone=material('#b7b6ab'),earth=material('#9e9d91'),treeWood=material('#5f594e'),leaves=material('#718b65'),joint=new T.LineBasicMaterial({color:'#8d9087',transparent:true,opacity:.38});
 const roofColors=['#b78440','#c29047','#b07836','#b98540'].map(color=>new T.MeshPhysicalMaterial({color,roughness:.49,metalness:0,clearcoat:.38,clearcoatRoughness:.43,side:T.DoubleSide}));const plant=material('#879b74');
 const glazeCanvas=document.createElement('canvas');glazeCanvas.width=128;glazeCanvas.height=128;const glazeCtx=glazeCanvas.getContext('2d');glazeCtx.fillStyle='#f3e6ca';glazeCtx.fillRect(0,0,128,128);
 for(let k=0;k<1700;k++){const shade=205+Math.floor(rand()*45);glazeCtx.fillStyle=`rgba(${shade},${shade},${shade},0.22)`;glazeCtx.fillRect(rand()*128,rand()*128,1+rand()*3,1+rand()*2);}
 const glazeMap=new T.CanvasTexture(glazeCanvas);glazeMap.colorSpace=T.SRGBColorSpace;glazeMap.wrapS=glazeMap.wrapT=T.RepeatWrapping;glazeMap.repeat.set(4,2);glazeMap.anisotropy=8;tile.map=glazeMap;roofColors.forEach(m=>m.map=glazeMap);
 const lacquer=new T.MeshStandardMaterial({color:'#773a31',roughness:.57});
 const raisedWood=new T.MeshStandardMaterial({color:'#97594a',roughness:.58});
 brick.bumpMap=tex;brick.bumpScale=.018;
 for(const surface of [tile,...roofColors])addSurfaceFinish(surface,'clay');
 for(const surface of [wood,frame,lacquer,raisedWood])addSurfaceFinish(surface,'timber');
 addSurfaceFinish(brick,'masonry');
 const gilt=new T.MeshStandardMaterial({color:'#b99450',roughness:.42,metalness:.35});
 const glazing=new T.MeshPhysicalMaterial({color:'#41504b',roughness:.32,metalness:.05,clearcoat:.35});
 // Fine timber-grain roughness catches light without adding noisy color stripes.
 const grainCanvas=document.createElement('canvas');grainCanvas.width=128;grainCanvas.height=256;const grainCtx=grainCanvas.getContext('2d');grainCtx.fillStyle='#dedede';grainCtx.fillRect(0,0,128,256);
 for(let k=0;k<180;k++){const shade=170+Math.floor(rand()*65);grainCtx.strokeStyle=`rgba(${shade},${shade},${shade},.3)`;grainCtx.lineWidth=.4+rand()*.7;const gx=rand()*128,gy=rand()*256;grainCtx.beginPath();grainCtx.moveTo(gx,gy);grainCtx.bezierCurveTo(gx+2,gy+12,gx-1,gy+30,gx+1,gy+65);grainCtx.stroke();}
 const grainMap=new T.CanvasTexture(grainCanvas);grainMap.anisotropy=8;lacquer.roughnessMap=grainMap;raisedWood.roughnessMap=grainMap;
 const detailBatches=new Map([[lacquer,[]],[raisedWood,[]],[gilt,[]]]),detailObject=new T.Object3D();
 const roofTiles=[],tileGeo=new T.CylinderGeometry(.0085,.010,1,16),tileObj=new T.Object3D();
 const geo=new T.BoxGeometry(1,1,1);function box(x,y,z,w,h,d,m){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.receiveShadow=true;o.castShadow=true;g.add(o);return o}
 function floor(x,z,w,d,m=stone){let q=box(x,.019,z,w,.136,d,m);q.castShadow=false;return q}
 // Continuous streets: north-south lane and two east-west links to the sidewalk.
 const lines=[];function paver(x,z,w,d){floor(x,z,w,d);for(let xx=x-w/2+.12;xx<x+w/2;xx+=.16)lines.push(new T.Vector3(xx,.089,z-d/2),new T.Vector3(xx,.089,z+d/2));for(let zz=z-d/2+.12;zz<z+d/2;zz+=.16)lines.push(new T.Vector3(x-w/2,.089,zz),new T.Vector3(x+w/2,.089,zz));}
 paver(-5.94,4.48,.32,7.12);paver(-8.13,4.25,4.06,.36);paver(-8.13,7.96,4.06,.30);
 function pitched(x,z,w,d,vertical=false,style=0){const y=.61,r=[.82,.76,.86,.79][style%4];let xl=x-w/2-.035,xr=x+w/2+.035,z0=z-d/2-.035,z1=z+d/2+.035;let pos,idx=[0,1,2,1,3,2,2,3,4,3,5,4];
  if(!vertical)pos=[xl,y,z0,xr,y,z0,xl,r,z,xr,r,z,xl,y,z1,xr,y,z1];else pos=[xl,y,z0,xl,y,z1,x,r,z0,x,r,z1,xr,y,z0,xr,y,z1];
  const b=new T.BufferGeometry();b.setAttribute('position',new T.Float32BufferAttribute(pos,3));b.setIndex(idx);b.computeVertexNormals();const mesh=new T.Mesh(b,roofColors[style%4]);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  const makeTile=(a,b)=>{
   const delta=b.clone().sub(a),length=delta.length(),courses=Math.max(3,Math.ceil(length/.087));
   tileObj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
   for(let course=0;course<courses;course++){
    tileObj.position.copy(a).lerp(b,(course+.5)/courses);
    tileObj.position.y+=course%2===0?.001:.0002;
    tileObj.scale.set(1+(course%3)*.024,length/courses+.005,1+(course%3)*.024);
    tileObj.updateMatrix();roofTiles.push(tileObj.matrix.clone());
   }
  };
  if(!vertical){box(x,r+.008,z,w+.08,.026,.025,tile);for(let xx=xl+.02;xx<xr;xx+=.07)for(const zz of [z0,z1])makeTile(new T.Vector3(xx,r+.01,z),new T.Vector3(xx,y+.01,zz));}else{box(x,r+.008,z,.025,.026,d+.08,tile);for(let zz=z0+.02;zz<z1;zz+=.07)for(const xx of [xl,xr])makeTile(new T.Vector3(x,r+.01,zz),new T.Vector3(xx,y+.01,zz));}
  // Overlapping clay tile courses break each long roof slope into real tiles.
  if(!vertical){for(const side of [-1,1])for(let t=.18;t<1;t+=.18){
   const zz=z+side*(d/2+.035)*t, yy=r+(y-r)*t+.003;
   const seam=box(x,yy,zz,w+.05,.004,.009,tile);seam.rotation.x=-side*Math.atan2(r-y,d/2+.035);
  }}else{for(const side of [-1,1])for(let t=.18;t<1;t+=.18){
   const xx=x+side*(w/2+.035)*t,yy=r+(y-r)*t+.003;
   const seam=box(xx,yy,z,.009,.004,d+.05,tile);seam.rotation.z=side*Math.atan2(r-y,w/2+.035);
  }}
  // Grey-brick ridge and gable verge caps: domestic hard-gable roof detailing.
  const beam=(a,b,width,depth,mat)=>{const v=b.clone().sub(a),o=new T.Mesh(geo,mat);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.set(width,v.length(),depth);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());o.castShadow=true;o.receiveShadow=true;g.add(o);};
  if(!vertical){
   box(x,r+.025,z,w+.07,.045,.047,tile);
   box(x,r+.052,z,w+.085,.012,.059,tile);
   for(const xx of [xl+.025,xr-.025]){
    for(const zz of [z0,z1])beam(new T.Vector3(xx,r+.025,z),new T.Vector3(xx,y+.018,zz),.032,.032,tile);
    box(xx,r+.061,z,.055,.045,.055,tile);
   }
   for(const zz of [z0,z1]){
    box(x,y-.012,zz,w+.065,.025,.022,frame);
    for(let xx=xl+.035;xx<xr;xx+=.07){const disc=new T.Mesh(new T.CylinderGeometry(.013,.013,.012,8),tile);disc.rotation.x=Math.PI/2;disc.position.set(xx,y+.008,zz);g.add(disc);}
   }
  }else{
   box(x,r+.025,z,.047,.045,d+.07,tile);box(x,r+.052,z,.059,.012,d+.085,tile);
   for(const zz of [z0+.025,z1-.025])for(const xx of [xl,xr])beam(new T.Vector3(x,r+.025,zz),new T.Vector3(xx,y+.018,zz),.032,.032,tile);
   for(const xx of [xl,xr])box(xx,y-.012,z,.022,.025,d+.065,frame);
  }
  // Small relief medallions follow the glazed ridge, with a recessed lower band.
  const ridgeLength=vertical?d:w;
  for(let u=-ridgeLength/2+.09;u<ridgeLength/2-.06;u+=.12)for(const face of [-1,1]){
   const medallion=new T.Mesh(new T.TorusGeometry(.012,.003,5,12),tile);
   if(!vertical)medallion.position.set(x+u,r+.025,z+face*.027);
   else {medallion.rotation.y=Math.PI/2;medallion.position.set(x+face*.027,r+.025,z+u);}
   g.add(medallion);
  }
  // Paired compact guardian figures on the gable ridges of the principal halls.
  if(!vertical&&w>2.8&&d>.5)for(const side of [-1,1])for(const slope of [-1,1])for(const t of [.43,.72]){
   const bx=x+side*(w/2-.01),bz=z+slope*(d/2+.035)*t,by=r+(y-r)*t+.025;
   const part=(dx,dy,dz,sx,sy,sz)=>{const m=new T.Mesh(new T.SphereGeometry(1,10,8),tile);m.position.set(bx+dx,by+dy,bz+dz);m.scale.set(sx,sy,sz);m.castShadow=true;g.add(m)};
   part(0,.023,0,.016,.025,.023);part(0,.052,slope*.014,.018,.018,.016);
   for(const leg of [-1,1])part(leg*.011,.01,slope*.019,.005,.016,.006);
   for(const ear of [-1,1])part(ear*.012,.067,slope*.009,.006,.009,.005);
  }
  // Compact glazed ridge ornaments: curved tails, raised heads, paired ends.
  for(const sign of [-1,1]){
   const ornament=new T.Group();ornament.position.set(vertical?x:x+sign*(w/2-.025),r+.065,vertical?z+sign*(d/2-.025):z);ornament.rotation.y=vertical?Math.PI/2:0;ornament.scale.setScalar(.78);
   const bead=(px,py,pz,sx,sy,sz)=>{const m=new T.Mesh(new T.SphereGeometry(1,10,8),tile);m.position.set(px,py,pz);m.scale.set(sx,sy,sz);m.castShadow=true;ornament.add(m)};
   bead(0,.026,0,.032,.043,.029);bead(-sign*.025,.069,0,.034,.026,.028);bead(-sign*.046,.06,0,.018,.013,.023);
   const curve=new T.CatmullRomCurve3([new T.Vector3(sign*.015,.01,0),new T.Vector3(sign*.046,.06,0),new T.Vector3(sign*.044,.12,0),new T.Vector3(sign*.012,.137,0)]);
   const tail=new T.Mesh(new T.TubeGeometry(curve,16,.012,6,false),tile);tail.castShadow=true;ornament.add(tail);
   for(let k=0;k<3;k++)bead(sign*(.023+k*.008),.05+k*.025,0,.017,.01,.033);
   for(const face of [-1,1]){
    const relief=new T.Mesh(new T.TorusGeometry(.022,.004,6,16,Math.PI*1.7),tile);relief.position.set(sign*.012,.05,face*.03);ornament.add(relief);
   }
   g.add(ornament);
  }
}
 // Each room opens toward the inner court; the rear walls remain largely blank.
 function house(x,z,w,d,vertical=false,style=0,face=1,heightScale=1,roofed=true){
  const startChildren=g.children.length,startTiles=roofTiles.length;
  box(x,.600,z,w,.024,d,frame);
  // A rear wall and two gables form a closed building shell; front masonry is
  // built as separate piers, lintel and window-sill walls around actual openings.
  if(!vertical){box(x,.34,z-face*(d/2-.035),w,.50,.07,brick);for(const side of [-1,1])box(x+side*(w/2-.035),.34,z,.07,.50,d,brick)}
  else {box(x-face*(w/2-.035),.34,z,.07,.50,d,brick);for(const side of [-1,1])box(x,.34,z+side*(d/2-.035),w,.50,.07,brick)}
  box(x,.13,z,w+.03,.08,d+.03,stone);if(roofed)pitched(x,z,w,d,vertical,style);
  // Close the pitched gables at the ends of each tiled roof with masonry.
  const ridge=[.82,.76,.86,.79][style%4],verts=[];
  if(!vertical){for(const xx of [x-w/2,x+w/2])verts.push(xx,.59,z-d/2,xx,ridge,z,xx,.59,z+d/2)}
  else {for(const zz of [z-d/2,z+d/2])verts.push(x-w/2,.59,zz,x,ridge,zz,x+w/2,.59,zz)}
  const gg=new T.BufferGeometry();gg.setAttribute('position',new T.Float32BufferAttribute(verts,3));gg.computeVertexNormals();const gm=new T.Mesh(gg,new T.MeshStandardMaterial({color:'#999b93',roughness:1,side:T.DoubleSide}));gm.castShadow=true;
  const cap=(cx,cz,half,alongX)=>{const sh=new T.Shape();sh.moveTo(-half,.585);sh.lineTo(half,.585);sh.lineTo(0,ridge);sh.closePath();const m=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:false}),brick);if(alongX){m.rotation.y=Math.PI/2;m.position.set(cx-.0175,0,cz);}else m.position.set(cx,0,cz-.0175);m.castShadow=true;m.receiveShadow=true;g.add(m);};
  if(vertical){cap(x,z-d/2,w/2,false);cap(x,z+d/2,w/2,false);}else{cap(x-w/2,z,d/2,true);cap(x+w/2,z,d/2,true);}
  const onFace=(u,y,width,height,mat,thick=.016,forward=0)=>{
   if(!vertical)box(x+u*w,y,z+face*(d/2+.012+forward),width,height,thick,mat);
   else box(x+face*(w/2+.012+forward),y,z+u*d,thick,height,width,mat);
  };
  const facadeSpan=vertical?d:w;
  const masonry=(a,b,low,high)=>{if(b>a)onFace((a+b)/2,(low+high)/2,(b-a)*facadeSpan,high-low,brick,.07,-.04)};
  // Reference: red palace joinery with tall leaves, circular flower lattice,
  // separate waist panel and recessed carved skirt; no modern square grid.
  const span=facadeSpan,doorHalf=span>2.8?.09:.12;
  masonry(-.5,.5,.557,.59);
  for(const [a,b] of [[-.5,-.455],[-.19,-doorHalf],[doorHalf,.19],[.455,.5]])masonry(a,b,.17,.557);
  masonry(-.5,-doorHalf,.09,.27);masonry(doorHalf,.5,.09,.27);
  const point=(xx,yy,depth)=>!vertical?new T.Vector3(x+xx,yy,z+face*(d/2+.012+depth)):new T.Vector3(x+face*(w/2+.012+depth),yy,z+xx);
  const stroke=(x1,y1,x2,y2,width=.003,mat=raisedWood,depth=.033)=>{
   const a=point(x1,y1,depth),b=point(x2,y2,depth),v=b.clone().sub(a);
   detailObject.position.copy(a).add(b).multiplyScalar(.5);detailObject.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());detailObject.scale.set(width,v.length(),width);detailObject.updateMatrix();detailBatches.get(mat).push(detailObject.matrix.clone());
  };
  const rect=(cx,cy,ww,hh,mat=raisedWood,depth=.034)=>{const l=cx-ww/2,r=cx+ww/2,lo=cy-hh/2,hi=cy+hh/2;stroke(l,lo,r,lo,.004,mat,depth);stroke(r,lo,r,hi,.004,mat,depth);stroke(r,hi,l,hi,.004,mat,depth);stroke(l,hi,l,lo,.004,mat,depth);};
  const loop=(cx,cy,rx,ry,mat=raisedWood,depth=.033)=>{for(let j=0;j<16;j++){const a=j*Math.PI/8,b=(j+1)*Math.PI/8;stroke(cx+rx*Math.cos(a),cy+ry*Math.sin(a),cx+rx*Math.cos(b),cy+ry*Math.sin(b),.0028,mat,depth);}};
  const lattice=(u,ww,bottom,top)=>{
   const cx=u*span,mid=(bottom+top)/2,hh=top-bottom;
   onFace(u,mid,ww,hh,lacquer,.032);
   onFace(u,mid,ww-.02,hh-.02,glazing,.008,.019);
   rect(cx,mid,ww-.012,hh-.012,raisedWood,.029);
   const cols=Math.max(2,Math.round((ww-.024)/.038)),rows=Math.max(4,Math.round((hh-.024)/.042));
   const cw=(ww-.025)/cols,ch=(hh-.025)/rows;
   // Interlocking rounded cells and diamond bridges, built as raised wood.
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const px=cx-(ww-.025)/2+(col+.5)*cw,py=bottom+.0125+(row+.5)*ch;
    loop(px,py,cw*.47,ch*.47);
    if(row<rows-1&&col<cols-1){
     const qx=px+cw/2,qy=py+ch/2;
     stroke(qx-cw*.23,qy,qx,qy-ch*.23);stroke(qx,qy-ch*.23,qx+cw*.23,qy);stroke(qx+cw*.23,qy,qx,qy+ch*.23);stroke(qx,qy+ch*.23,qx-cw*.23,qy);
     // Four small carved petals bind the neighboring round openings.
     for(const sx of [-1,1])for(const sy of [-1,1])loop(qx+sx*cw*.10,qy+sy*ch*.10,cw*.095,ch*.095,raisedWood,.034);
     stroke(qx,qy-.001,qx,qy+.001,.004,gilt,.036);
    }
   }
   // Modest brass corner plates and a fine inset molding.
   for(const sx of [-1,1])for(const sy of [-1,1]){
    const xx=cx+sx*(ww/2-.008),yy=mid+sy*(hh/2-.009);
    stroke(xx,yy,xx-sx*.014,yy,.003,gilt,.035);stroke(xx,yy,xx,yy-sy*.014,.003,gilt,.035);
   }
  };
  const carvedPanel=(u,ww,cy,hh)=>{
   const cx=u*span;onFace(u,cy,ww,hh,lacquer,.018,.014);rect(cx,cy,ww-.012,hh-.012,raisedWood,.028);rect(cx,cy,ww-.025,hh-.026,raisedWood,.025);
   // Stepped fret carving and a curled crown follow the photographed skirt panels.
   const line=(points,mat=raisedWood,depth=.034)=>{for(let j=1;j<points.length;j++)stroke(points[j-1][0],points[j-1][1],points[j][0],points[j][1],.003,mat,depth);};
   if(hh>.07){
    const rw=ww*.18,rh=hh*.20;
    for(const sign of [-1,1]){
     const q=cx+sign*ww*.19;
     line([[q+sign*rw,cy-rh],[q-sign*rw,cy-rh],[q-sign*rw,cy+rh],[q+sign*rw,cy+rh],[q+sign*rw,cy],[q,cy],[q,cy-rh*.48]]);
     const curve=new T.CatmullRomCurve3([new T.Vector3(cx,cy+rh*1.15,0),new T.Vector3(cx+sign*ww*.1,cy+rh*1.7,0),new T.Vector3(cx+sign*ww*.26,cy+rh*1.4,0),new T.Vector3(cx+sign*ww*.24,cy+rh*.95,0)]);
     line(curve.getPoints(14).map(p=>[p.x,p.y]));
    }
    // Central stem and small bud remain carved wood, not a painted emblem.
    line([[cx,cy-rh],[cx,cy+rh*1.18]]);loop(cx,cy+rh*1.2,.005,.006,raisedWood,.035);
   }else{
    const extent=Math.max(.012,ww/2-.025);
    line([[cx-extent,cy-.003],[cx-extent,cy+.004],[cx+extent,cy+.004],[cx+extent,cy-.003]]);
    for(const sign of [-1,1])loop(cx+sign*extent,cy,.004,.006,raisedWood,.034);
   }

  };
  for(const side of [-1,1]){
   const center=side*.3225,ww=span*.265,count=span>2.8?4:2,leaf=ww/count;
   onFace(center,.268,ww+.025,.022,stone,.045,.009);
   for(let k=0;k<count;k++){
    const u=center+(k-(count-1)/2)*leaf/span;
    lattice(u,leaf-.004,.323,.55);
    carvedPanel(u,leaf-.004,.295,.042);
   }
   onFace(center,.558,ww+.02,.014,lacquer,.035,.006);
  }
  const doorWidth=span*doorHalf*2,count=span>2.8?4:2,leaf=doorWidth/count;
  for(let k=0;k<count;k++){
   const u=(k-(count-1)/2)*leaf/span;
   onFace(u,.355,leaf-.003,.398,lacquer,.03);
   carvedPanel(u,leaf-.012,.222,.116);
   // Waist rail and a separate narrow decorative panel under the lattice.
   carvedPanel(u,leaf-.012,.303,.031);
   lattice(u,leaf-.012,.328,.55);
   onFace(u,.283,leaf-.008,.009,raisedWood,.018,.02);
   // Paired hinge straps sit on the outer stile of each leaf pair.
   const hingeU=u+(k%2===0?-1:1)*(leaf/2-.008)/span;
   for(const yy of [.205,.445]){
    onFace(hingeU,yy,.012,.024,gilt,.004,.034);
    for(const dy of [-.007,.007])stroke(hingeU*span,yy+dy-.001,hingeU*span,yy+dy+.001,.003,lacquer,.038);
   }

  }
  onFace(0,.157,doorWidth+.035,.025,stone,.07,.005);
  for(const sign of [-1,1]){const cx=sign*.022;loop(cx,.302,.009,.012,gilt,.041);onFace(cx/span,.315,.013,.018,gilt,.006,.036);}
  onFace(0,.59,span+.025,.035,frame,.045,.02);
  for(const u of [-.48,-doorHalf-.015,doorHalf+.015,.48])onFace(u,.365,.024,.43,lacquer,.026,.028);
  // The modest southern street range is lower than the principal hall.
  if(heightScale!==1){const parts=g.children.slice(startChildren),grp=new T.Group();for(const part of parts)grp.add(part);grp.scale.y=heightScale;grp.position.y=.08*(1-heightScale);g.add(grp);
   const m=new T.Matrix4().makeScale(1,heightScale,1);m.setPosition(0,.08*(1-heightScale),0);for(let k=startTiles;k<roofTiles.length;k++)roofTiles[k].premultiply(m)}
 }
 function tree(x,z,size){g.add(createDetailedTree(T,x,z,size))}
 function stoneLion(x,z,side=1){g.add(createStoneGuardian(T,x,z,side));}

 function gate(x,z,style=0){
  // Heavy recessed double door inside the existing continuous street-wall plane.
  const face=z+.045;
  for(const sign of [-1,1]){
   box(x+sign*.31,.328,z,.14,.256,.09,brick);box(x+sign*.31,.145,z,.14,.11,.09,stone);
   box(x+sign*.233,.31,z-.008,.028,.37,.07,lacquer);
   box(x+sign*.282,.312,face+.008,.055,.273,.008,lacquer);
   for(const y of [.18,.23,.43])box(x+sign*.282,y,face+.016,.055,.007,.009,raisedWood);
  }
  box(x,.523,z,.76,.134,.09,brick);box(x,.478,face-.018,.60,.065,.035,lacquer);
  box(x,.456,z-.004,.48,.026,.055,frame);
  const metal=material('#756341',{metalness:.65,roughness:.4});
  for(const sign of [-1,1]){
   box(x+sign*.109,.284,z-.019,.214,.34,.028,lacquer);
   for(let k=1;k<4;k++)box(x+sign*.109+(k-2)*.05,.284,z-.004,.0015,.325,.002,frame);
   for(const y of [.133,.434])box(x+sign*.109,y,z-.001,.209,.009,.008,raisedWood);
   const plate=new T.Mesh(new T.CylinderGeometry(.025,.025,.005,8),metal);plate.rotation.x=Math.PI/2;plate.position.set(x+sign*.053,.321,z+.001);g.add(plate);
   const boss=new T.Mesh(new T.SphereGeometry(.015,16,10),metal);boss.scale.z=.45;boss.position.set(x+sign*.053,.321,z+.006);g.add(boss);
   const ring=new T.Mesh(new T.TorusGeometry(.018,.003,8,24),metal);ring.position.set(x+sign*.053,.305,z+.015);g.add(ring);
   for(const yy of [.302,.34])for(const dx of [-.018,.018]){const rivet=new T.Mesh(new T.SphereGeometry(.0025,8,6),metal);rivet.position.set(x+sign*.053+dx,yy,z+.005);g.add(rivet);}
  }
  for(const u of [-.15,-.05,.05,.15]){
   const peg=new T.Mesh(new T.CylinderGeometry(.018,.019,.026,6),lacquer);peg.rotation.x=Math.PI/2;peg.position.set(x+u,.536,face+.003);g.add(peg);
   const rim=new T.Mesh(new T.TorusGeometry(.017,.0017,5,6),gilt);rim.position.set(x+u,.536,face+.017);g.add(rim);
   g.add(lettering.plaque('福',.026,.026,x+u,.536,face+.0185,false,false));
  }
  g.add(lettering.plaque('天增岁月人增寿',.050,.268,x+.282,.312,face+.022,true));
  g.add(lettering.plaque('春满乾坤福满门',.050,.268,x-.282,.312,face+.022,true));
  g.add(lettering.plaque('迎春接福',.398,.044,x,.487,face+.005));
  box(x,.113,z,.48,.035,.09,stone);
  gateOrnaments(g,x,z);
  for(const sign of [-1,1])stoneLion(x+sign*.40,z+.18,sign);
 }

 function wall(x,z,w,d,h=.38,capped=true){
  const top=.09+h; box(x,.09+h/2,z,w,h,d,brick);if(!capped)return;box(x,top+.02,z,w+.04,.045,d+.04,tile);
  // A tiled coping belongs on top of the boundary wall, not a floating slab.
  if(w>d){for(let xx=x-w/2+.035;xx<x+w/2;xx+=.07){const a=new T.Vector3(xx,top+.045,z-(d/2+.025)),b=new T.Vector3(xx,top+.045,z+(d/2+.025));const delta=b.clone().sub(a);tileObj.position.copy(a).add(b).multiplyScalar(.5);tileObj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());tileObj.scale.set(1,delta.length(),1);tileObj.updateMatrix();roofTiles.push(tileObj.matrix.clone());}}
  else {for(let zz=z-d/2+.035;zz<z+d/2;zz+=.07){const a=new T.Vector3(x-(w/2+.025),top+.045,zz),b=new T.Vector3(x+(w/2+.025),top+.045,zz);const delta=b.clone().sub(a);tileObj.position.copy(a).add(b).multiplyScalar(.5);tileObj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());tileObj.scale.set(1,delta.length(),1);tileObj.updateMatrix();roofTiles.push(tileObj.matrix.clone());}}
 }
 function yard(x,z,w,d,i){
  // North main hall, two inward-facing side rooms, south reverse-facing rooms.
  // Offset street gate opens into the forecourt; screen wall shields inner court.
  const north=z-d/2,south=z+d/2,east=x+w/2,west=x-w/2;
  house(x,north+.32,w-(i?.45:.18),i?.52:.58,false,i,1,i?1.04:1.11);
  house(west+.29,z+.05,.48,d-1.60,true,i,1,i?.93:.97);
  house(east-.29,z+.05,.48,d-1.60,true,i,-1,i?.96:.93);
  const southRoomW=w-(i?1.75:1.54); house(west+southRoomW/2+.05,south-.25,southRoomW,.40,false,1,-1,1,false);
  // One unbroken roof and street wall: the gate is a bay, not an added block.
  pitched(x,south-.25,w,.40,false,1);
  box(x,.600,south-.25,w,.024,.40,frame);
  // Close the rear of the gate bay; the doorway is on the street facade.
  const gateBayW=w-southRoomW-.05;
  const bayLeft=east-gateBayW,doorCenter=east-.52;
  for(const [a,b] of [[bayLeft,doorCenter-.23],[doorCenter+.23,east]])if(b>a)box((a+b)/2,.34,south-.415,b-a,.50,.07,brick);
  box(doorCenter,.523,south-.415,.46,.134,.07,brick);
  const gx=east-.52;
  // The exterior wall meets the house and the gate posts exactly.  The side
  // houses themselves form the long middle portions, rather than a second
  // wall pushed through the roofs and eaves.
  const roomEnd=west+southRoomW+.05, gateLeft=gx-.38, gateRight=gx+.38;
  if(gateLeft>roomEnd) box((roomEnd+gateLeft)/2,.34,south-.095,gateLeft-roomEnd,.50,.09,brick);
  if(east>gateRight) box((gateRight+east)/2,.34,south-.095,east-gateRight,.50,.09,brick);
  const wingStart=z+.05-(d-1.60)/2,wingEnd=z+.05+(d-1.60)/2;
  for(const xx of [east-.045,west+.045]){
   wall(xx,(north+wingStart)/2,.09,wingStart-north);
   wall(xx,(wingEnd+south-.095)/2,.09,south-.095-wingEnd,.38,false);
  }
  gate(gx,south-.095,i);
  // Courtyard partition joins the wing walls. Its central opening is the
  // second gate; a short independent screen faces the offset street entry.
  const screenZ=south-.93;
  const leftStart=west+.48, rightEnd=east-.48, innerX=x;
  const half=.42;
  wall((leftStart+innerX-half)/2,screenZ,innerX-half-leftStart,.09,.40);
  wall((innerX+half+rightEnd)/2,screenZ,rightEnd-innerX-half,.09,.40);
  wall(gx,south-.48,.30,.08);
  // A true circular opening through a solid brick panel, not a wooden gateway.
  const panel=new T.Shape();panel.moveTo(-half,.09);panel.lineTo(half,.09);panel.lineTo(half,.79);panel.lineTo(-half,.79);panel.closePath();
  const opening=new T.Path();opening.absarc(0,.405,.31,0,Math.PI*2,true);panel.holes.push(opening);
  const archGeo=new T.ExtrudeGeometry(panel,{depth:.10,bevelEnabled:false,curveSegments:48});
  const arch=new T.Mesh(archGeo,brick);arch.position.set(innerX,0,screenZ-.05);arch.castShadow=true;arch.receiveShadow=true;g.add(arch);
  // Recessed voussoirs continue through the jamb instead of sitting on the face.
  const archRing=new T.BufferGeometry(),positions=[],normals=[],colors=[];
  const color=new T.Color(),inner=.303,outer=.347,reveal=.054;
  const point=(a,r,z)=>[Math.cos(a)*r,Math.sin(a)*r+.405,z];
  const inside=a=>[-Math.cos(a),-Math.sin(a),0];
  const flatFront=[0,0,1],flatBack=[0,0,-1];
  const quad=(points,directions)=>{
   for(const index of [0,1,2,0,2,3]){
    positions.push(...points[index]);normals.push(...directions[index]);colors.push(color.r,color.g,color.b);
   }
  };
  for(let segment=0;segment<96;segment++){
   const a=segment*Math.PI/48,b=(segment+1)*Math.PI/48;
   const shade=.92+((Math.floor(segment/3)*23)%13)/100;
   color.set('#a4a08e').multiplyScalar(shade);
   quad([point(a,inner,reveal),point(a,outer,reveal),point(b,outer,reveal),point(b,inner,reveal)],
    [flatFront,flatFront,flatFront,flatFront]);
   quad([point(b,inner,-reveal),point(b,outer,-reveal),point(a,outer,-reveal),point(a,inner,-reveal)],
    [flatBack,flatBack,flatBack,flatBack]);
   quad([point(a,inner,-reveal),point(a,inner,reveal),point(b,inner,reveal),point(b,inner,-reveal)],
    [inside(a),inside(a),inside(b),inside(b)]);
  }
  archRing.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  archRing.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  archRing.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const rim=new T.Mesh(archRing,new T.MeshStandardMaterial({vertexColors:true,roughness:.94}));
  rim.position.set(innerX,0,screenZ);rim.castShadow=rim.receiveShadow=true;g.add(rim);
  box(innerX,.80,screenZ,.88,.025,.13,tile);
  box(innerX,.821,screenZ,.90,.018,.07,tile);
  // Gate threshold is almost flush with the courtyard paving.
  box(innerX,.094,screenZ,.20,.008,.13,stone);
  // Grey stone paving remains the dominant surface. An unevenly placed
  // planting bed and small clay pots give each court a lived-in character.
  const courtNorth=north+.76,courtSouth=screenZ-.13;
  const mid=(courtNorth+courtSouth)/2;
  const bx=x+(i?.63:-.62), bz=mid+(i?.12:-.14);
  const soil=material('#77766b'), pot=material('#806c5d'), shrub=material('#6b8062');
  box(bx,.102,bz,i?.43:.52,.012,i?.27:.34,stone);
  box(bx,.111,bz,i?.38:.47,.006,i?.22:.29,soil);
  tree(bx,bz,i?.15:.18);
  function flowerpot(px,pz,scale){
   const vessel=new T.Mesh(new T.CylinderGeometry(.055*scale,.04*scale,.12*scale,8),pot);vessel.position.set(px,.15,pz);vessel.castShadow=true;g.add(vessel);
   const bush=new T.Mesh(new T.SphereGeometry(.075*scale,8,6),shrub);bush.position.set(px,.24,pz);bush.scale.y=.7;bush.castShadow=true;g.add(bush);
  }
  if(i){flowerpot(x-1.15,courtNorth+.22,.8)}
  else {flowerpot(x+1.15,courtNorth+.22,.8)}
  // A small stone table and stools sit to one side, clear of the door axis.
  const tableX=x+(i?-.72:.66), tableZ=mid-.03;
  const cylinder=(radius,height,px,py,pz,mat)=>{const m=new T.Mesh(new T.CylinderGeometry(radius,radius,height,12),mat);m.position.set(px,py,pz);m.castShadow=true;m.receiveShadow=true;g.add(m)};
  cylinder(.035,.13,tableX,.16,tableZ,stone);cylinder(.135,.035,tableX,.235,tableZ,stone);
  for(const [dx,dz] of [[-.19,0],[.19,0],[0,.18]]){cylinder(.043,.075,tableX+dx,.13,tableZ+dz,stone);cylinder(.065,.025,tableX+dx,.18,tableZ+dz,stone)}
  // Low planting pot at the wall, avoiding the central passage.
  flowerpot(x+(i?1.15:-1.15),courtNorth+.22,.65);
  // Domestic objects stay beside the wings, leaving the axial walking route clear.
  // The two small arrangements differ, as in the courtyard photographs.
  if(i===0){
   const sx=x-1.15,sz=mid+.25;
   for(const dx of [-.105,.105])for(const dz of [-.07,.07])box(sx+dx,.22,sz+dz,.018,.26,.018,frame);
   for(const yy of [.13,.24,.34])box(sx,yy,sz,.23,.018,.16,wood);
   for(const dx of [-.06,.06]){const vessel=new T.Mesh(new T.CylinderGeometry(.029,.022,.06,8),pot);vessel.position.set(sx+dx,.38,sz);vessel.castShadow=true;g.add(vessel);const plantTop=new T.Mesh(new T.SphereGeometry(.035,8,6),shrub);plantTop.position.set(sx+dx,.425,sz);g.add(plantTop)}
  }else{
   const jx=x+1.13,jz=mid+.23, jarMat=material('#7f7166');
   const jar=new T.Mesh(new T.CylinderGeometry(.075,.09,.15,12),jarMat);jar.position.set(jx,.165,jz);jar.castShadow=true;g.add(jar);
   const rim=new T.Mesh(new T.TorusGeometry(.073,.008,6,12),stone);rim.rotation.x=Math.PI/2;rim.position.set(jx,.244,jz);g.add(rim);
   box(x+.91,.13,mid-.22,.20,.06,.11,stone);
  }
  // Steps run out from the principal hall toward the central path.
  for(let n=0;n<3;n++)box(x,.105+n*.018,north+.66-n*.045,.50,.018,.10,stone);

 }
 // Keep the public paving in place; each compound can be staged independently.
 for(const spec of [[-8.12,2.38,3.78,2.95],[-8.12,6.03,3.78,3.22]]){
  paver(spec[0],spec[1],spec[2]-.10,spec[3]-.10);
 }
 paver(-6.75,4.05,.27,.40);paver(-6.75,7.80,.27,.33);
 // The pale main walk is framed by smaller dark grey courtyard pavers.
 const settBands=[material('#aea99b'),material('#b8b1a1'),material('#a7a394'),material('#b5aea0')];
 for(const [index,[cx,cz,w,d]] of [[-8.12,2.38,3.78,2.95],[-8.12,6.03,3.78,3.22]].entries()){
  const back=cz-d/2+.64,front=cz+d/2-1.02;
  const runs=8;
  for(let i=0;i<runs;i++){
   const len=(front-back)/runs,zz=back+(i+.5)*len;
   const walk=box(cx,.0895,zz,index?.39:.44,.004,len-.003,settBands[(i*3+index)%4]);
   walk.castShadow=false;
  }
  for(const x of [cx-w/2+.46,cx+w/2-.46]){
   const edge=box(x,.0885,(front+back)/2,.045,.003,front-back,settBands[2]);
   edge.castShadow=false;
  }
 }
 const compounds=[];
 for(const [index,spec] of [[-8.12,2.38,3.78,2.95],[-8.12,6.03,3.78,3.22]].entries()){
 const start=g.children.length;
 yard(...spec,index);
 const compound=new T.Group();compound.name='siheyuan-'+(index+1);
 for(const child of g.children.slice(start)){
  if(child.name.startsWith('doorway-lettering-')&&child.material&&!child.material.transparent){
   child.material.color.set('#e5dbd2');child.material.roughness=.97;
  }
  compound.add(child);
 }
 batchStaticDecoration(T,compound);
 // Batch all small joinery details to avoid thousands of extra draw calls.
 for(const [mat,matrices] of detailBatches){if(!matrices.length)continue;const batch=new T.InstancedMesh(geo,mat,matrices.length);matrices.forEach((m,i)=>batch.setMatrixAt(i,m));batch.instanceMatrix.needsUpdate=true;batch.castShadow=true;batch.receiveShadow=true;batch.name='courtyard-carved-joinery';compound.add(batch);matrices.length=0;}
 const roofTileMesh=new T.InstancedMesh(tileGeo,tile,roofTiles.length);roofTiles.forEach((m,i)=>{
   roofTileMesh.setMatrixAt(i,m);
   const value=.74+((i*37)%42)/100;
   roofTileMesh.setColorAt(i,new T.Color().setScalar(value));
 });roofTileMesh.instanceMatrix.needsUpdate=true;roofTileMesh.castShadow=true;roofTileMesh.receiveShadow=true;compound.add(roofTileMesh);roofTiles.length=0;compounds.push(compound);g.add(compound);
 }
 g.userData.compounds=compounds;g.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(lines),joint));return g;
}
