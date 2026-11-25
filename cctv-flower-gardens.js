// Garden shapes reference the CCTV landscape's angular green pockets and
// the user's Jakub frames' restrained, warm flowers over rich green turf.
// All roots are outside the continuous CCTV shell's ground footprint.
export function createCctvFlowerGardens(T){
 const group=new T.Group();group.name='cctv-flower-gardens';
 let seed=481372;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 // The two front lawns stop before the public threshold, leaving the existing
 // x=3.8 axial entrance clear. Rear pockets follow the landscaped perimeter.
 const pockets=[
  [[1.62,-3.18],[3.16,-3.18],[3.08,-3.53],[2.54,-3.88],[1.75,-4.34],[1.62,-4.18]],
  [[4.58,-3.18],[6.02,-3.18],[6.02,-4.80],[5.72,-4.72],[5.13,-3.88],[4.58,-3.30]],
  [[1.62,-7.75],[3.93,-7.75],[3.85,-7.10],[2.75,-6.90],[1.62,-6.25]],
  [[6.18,-7.50],[6.50,-7.50],[6.50,-6.92],[6.36,-6.72],[6.18,-6.92]],
 ];
 const turfCanvas=document.createElement('canvas');turfCanvas.width=turfCanvas.height=256;const q=turfCanvas.getContext('2d');q.fillStyle='#697747';q.fillRect(0,0,256,256);
 for(let k=0;k<24;k++){const x=r()*256,y=r()*256,rr=22+r()*48,g=q.createRadialGradient(x,y,0,x,y,rr);g.addColorStop(0,k%3?'rgba(28,65,33,.12)':'rgba(155,165,77,.12)');g.addColorStop(1,'rgba(70,108,44,0)');q.fillStyle=g;q.fillRect(x-rr,y-rr,rr*2,rr*2)}
 for(let i=0;i<10000;i++){const x=r()*256,y=r()*256;q.strokeStyle=i%2?'rgba(202,209,132,.065)':'rgba(22,55,30,.065)';q.lineWidth=.5;q.beginPath();q.moveTo(x,y);q.lineTo(x+.4+r(),y-1-r()*2);q.stroke()}
 const turfMap=new T.CanvasTexture(turfCanvas);turfMap.colorSpace=T.SRGBColorSpace;turfMap.wrapS=turfMap.wrapT=T.RepeatWrapping;turfMap.anisotropy=8;
 const grassMat=new T.MeshStandardMaterial({map:turfMap,roughness:1,side:T.DoubleSide}),edgeMat=new T.LineBasicMaterial({color:'#849279',transparent:true,opacity:.50});
 function inside(x,z,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
 const groundLoop=[[-2.09,.68],[.67,.68],[.67,-2.10],[1.91,-2.10],[1.91,1.92],[-2.09,1.92]];
 function buildingClear(x,z){const dx=x-3.8,dz=z+5.3,c=Math.cos(-.60),s=Math.sin(-.60),lx=(c*dx-s*dz)/.84,lz=(s*dx+c*dz)/.84;
  if(inside(lx,lz,groundLoop))return false;
  for(let k=0;k<groundLoop.length;k++){const a=groundLoop[k],b=groundLoop[(k+1)%groundLoop.length],vx=b[0]-a[0],vz=b[1]-a[1],t=Math.max(0,Math.min(1,((lx-a[0])*vx+(lz-a[1])*vz)/(vx*vx+vz*vz)));if(Math.hypot(lx-a[0]-vx*t,lz-a[1]-vz*t)<.13)return false;}
  return true;
 }
 function edgeDistance(x,z,p){let d=1e5;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));}return d;}
 const flowers=[],leaves=[],stems=[];
 for(let pi=0;pi<pockets.length;pi++){
  const poly=pockets[pi],shape=new T.Shape(poly.map(([x,z])=>new T.Vector2(x,-z))),geo=new T.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);const uv=geo.attributes.uv,p=geo.attributes.position;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/1.4,p.getZ(i)/1.4);
  const lawn=new T.Mesh(geo,grassMat);lawn.position.y=.087;lawn.receiveShadow=true;lawn.castShadow=false;lawn.name='cctv-lawn-'+pi;group.add(lawn);
  const edge=new T.LineLoop(new T.BufferGeometry().setFromPoints(poly.map(([x,z])=>new T.Vector3(x,.088,z))),edgeMat);group.add(edge);
  const x0=Math.min(...poly.map(p=>p[0])),x1=Math.max(...poly.map(p=>p[0])),z0=Math.min(...poly.map(p=>p[1])),z1=Math.max(...poly.map(p=>p[1]));
  // Group perennials in loose drifts so each pocket has lawn between plantings.
  for(let x=x0+.035;x<x1-.025;x+=.051)for(let z=z0+.035;z<z1-.02;z+=.051){
   const px=x+(r()-.5)*.037,pz=z+(r()-.5)*.037;
   if(!inside(px,pz,poly)||!buildingClear(px,pz))continue;
   const dist=edgeDistance(px,pz,poly);
   const drift=.48+.29*Math.sin(px*9.2+pz*3.2+pi)+.16*Math.sin(pz*12.7-px*9.1+pi*.7);
   if(dist<.018||dist>.098+.14*drift||r()>drift)continue;
   const h=.033+r()*.056,tone=pi%2===0?(r()<.46?0:1):(r()<.63?2:3);
   const a=r()*Math.PI*2,lean=.004+r()*.011;
   const bx=px+Math.cos(a)*lean,bz=pz+Math.sin(a)*lean;
   stems.push([px,pz,bx,bz,h]);
   for(let k=0;k<2+(r()>.68?1:0);k++){
    const dir=a+k*2.4,spread=.004+r()*.009,along=.30+r()*.32;
    leaves.push([px+(bx-px)*along+Math.cos(dir)*spread,pz+(bz-pz)*along+Math.sin(dir)*spread,.087+h*along,dir,.011+r()*.016]);
   }
   flowers.push([bx,bz,.087+h,a,.23+r()*.32,tone]);
  }
 }
 const obj=new T.Object3D(),color=new T.Color(),palette=['#b99858','#d9cba2','#a88689','#8f889f'];
 const stemGeo=new T.CylinderGeometry(.0007,.0014,1,4),stemMat=new T.MeshStandardMaterial({color:'#54773d',roughness:1}),stemMesh=new T.InstancedMesh(stemGeo,stemMat,stems.length);
 const stemDirection=new T.Vector3(),up=new T.Vector3(0,1,0);
 stems.forEach(([x,z,bx,bz,h],i)=>{
  stemDirection.set(bx-x,h,bz-z);
  obj.position.set((x+bx)/2,.087+h/2,(z+bz)/2);
  obj.quaternion.setFromUnitVectors(up,stemDirection.clone().normalize());
  obj.scale.set(1,stemDirection.length(),1);
  obj.updateMatrix();stemMesh.setMatrixAt(i,obj.matrix);
 });stemMesh.castShadow=false;stemMesh.receiveShadow=true;group.add(stemMesh);
 const leafGeo=new T.SphereGeometry(1,7,4),leafMat=new T.MeshStandardMaterial({color:'#4c743b',roughness:1}),leafMesh=new T.InstancedMesh(leafGeo,leafMat,leaves.length);
 leaves.forEach(([x,z,y,a,s],i)=>{obj.position.set(x,y,z);obj.rotation.set(.25,a,.16);obj.scale.set(s*.38,s*.13,s);obj.updateMatrix();leafMesh.setMatrixAt(i,obj.matrix)});leafMesh.castShadow=false;leafMesh.receiveShadow=true;group.add(leafMesh);
 // Six slightly cupped petals are modelled geometry, with a small raised centre.
 const positions=[],colors=[];const push=(x,y,z,center=false)=>{positions.push(x,y,z);colors.push(...(center?[.56,.42,.16]:[1,1,1]));};
 for(let k=0;k<6;k++){const a=k*Math.PI/3,dx=Math.cos(a),dz=Math.sin(a),px=-dz,pz=dx;push(dx*.005,.001,dz*.005);push(dx*.022+px*.010,.004,dz*.022+pz*.010);push(dx*.031,.002,dz*.031);push(dx*.005,.001,dz*.005);push(dx*.031,.002,dz*.031);push(dx*.022-px*.010,.004,dz*.022-pz*.010);}
 for(let k=0;k<8;k++){const a=k*Math.PI/4,b=(k+1)*Math.PI/4;push(0,.006,0,true);push(Math.cos(a)*.007,.003,Math.sin(a)*.007,true);push(Math.cos(b)*.007,.003,Math.sin(b)*.007,true);}
 const flowerGeo=new T.BufferGeometry();flowerGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));flowerGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));flowerGeo.computeVertexNormals();
 const flowerMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,side:T.DoubleSide}),blooms=new T.InstancedMesh(flowerGeo,flowerMat,flowers.length);
 flowers.forEach(([x,z,y,a,s,tone],i)=>{obj.position.set(x,y,z);obj.rotation.set((r()-.5)*.24,a,(r()-.5)*.24);obj.scale.setScalar(s);obj.updateMatrix();blooms.setMatrixAt(i,obj.matrix);color.set(palette[tone]);blooms.setColorAt(i,color)});blooms.castShadow=false;blooms.receiveShadow=true;group.add(blooms);
 group.userData={pockets:pockets.map(p=>p.map(v=>v.slice())),flowerCount:flowers.length,plantCount:stems.length,reference:'cctv-context-reference/landscape.jpg; jakub-reference/v0-0.jpg',entranceClearX:[3.30,4.30],mainThresholdClearZ:[-3.07,-2.69]};
 return group;
}
