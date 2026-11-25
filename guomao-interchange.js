// Compact grade-separated bridge inspired by the Guomao interchange in Beijing.
// Reference: outputs/interchange-reference/guomao.jpg (municipal Beijing CBD aerial).
// This compressed flyover has two outgoing ramps and is not the full Guomao network.
export function interchangeHeight(z) {
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
  const up=smooth((z+7.5)/5.1), down=1-smooth((z+.0)/5.1);
  return .043 + .60*Math.min(up,down);
}

// Curve 0 leaves the north half of the elevated road for the westbound ground
// boulevard; curve 1 links the south half with the eastbound ground boulevard.
// A miniature, two-turn interpretation, not Guomao's complete traffic network.
export function interchangeRampPoint(index,t) {
 t=Math.max(0,Math.min(1,t));
 // Complementary on-ramps mirror the two off-ramps around the boulevard.
 // Their travel direction is reversed: ground → bridge.
 if(index>=2){
  const p=interchangeRampPoint(index-2,1-t),z=-2.30-p.z;
  const d=interchangeHeight(z)-interchangeHeight(-2.30-z);
  const a=Math.max(0,Math.min(1,(t-.55)/.25)), blend=a*a*(3-2*a);
  return {x:p.x,y:p.y+d*blend,z};
 }
 const c=index===0 ? [[-.48,-3.2],[-.48,-2.15],[-1.85,-2.1],[-5.6,-1.45]] : [[.48,.72],[.48,.2],[1.85,0],[5.6,-.85]];
 const at=(k,v)=>{const w=1-v;return w*w*w*c[0][k]+3*w*w*v*c[1][k]+3*w*v*v*c[2][k]+v*v*v*c[3][k]};
 const derivative=(k,v)=>{const w=1-v;return 3*w*w*(c[1][k]-c[0][k])+6*w*v*(c[2][k]-c[1][k])+3*v*v*(c[3][k]-c[2][k])};
 const split=.45,land=.80;
 const q=index===0 ? [-3.70,-1.97] : [3.70,-.28];
 function coord(k){
   if(t<=split)return at(k,t);
   const a=at(k,split), v0=derivative(k,split);
   if(t<=land){const u=(t-split)/(land-split),w=1-u,b=a+v0*(land-split)/3,d=q[k],e=k===0?d+(index===0?.30:-.30):d;return w*w*w*a+3*w*w*u*b+3*w*u*u*e+u*u*u*d;}
   const u=(t-land)/(1-land),w=1-u,a0=q[k],d=c[3][k],velocity=k===0?(index===0?-0.30:0.30)*3/(land-split):0,b=a0+velocity*(1-land)/3,e=k===0?d+(index===0?.32:-.32):d;return w*w*w*a0+3*w*w*u*b+3*w*u*u*e+u*u*u*d;
 }
 const x=coord(0),z=coord(1);
 // Remain flush with the through bridge until the entire exit leaves it.
 // Descend outside the cross street, reaching ground before merging.
 let y;if(t<=split)y=interchangeHeight(z);else{const u=Math.min(1,(t-split)/(land-split)),e=u*u*(3-2*u);y=interchangeHeight(at(1,split))*(1-e)+.043*e;}
 return {x,y,z};
}

export function createGuomaoInterchange(THREE, roadMaterial) {
 const group=new THREE.Group(); group.name='guomao-inspired-flyover';
 const sideMat=new THREE.MeshStandardMaterial({color:'#aaa995',roughness:.93});
 const guardMat=new THREE.MeshStandardMaterial({color:'#ded9c5',roughness:.82});
 const supportMat=new THREE.MeshStandardMaterial({color:'#c9c4b2',roughness:.96});
 const lineMat=new THREE.MeshBasicMaterial({color:'#f1eddf',side:THREE.DoubleSide});
 const deckMat=roadMaterial.clone();deckMat.side=THREE.DoubleSide;
 const z0=-7.5,z1=5.1,w=.87,steps=160;
 function strip(x0,x1,yOffset,material,start=z0,end=z1,segments=steps,taper=false){
  const positions=[],uv=[],indices=[];for(let i=0;i<=segments;i++){const z=start+(end-start)*i/segments,y=interchangeHeight(z)+yOffset,mid=(x0+x1)/2,fac=taper?Math.min(1,i/4,(segments-i)/4):1,xa=mid+(x0-mid)*fac,xb=mid+(x1-mid)*fac;positions.push(xa,y,z,xb,y,z);uv.push((xa+10.75)/21.5,(z+8.25)/16.5,(xb+10.75)/21.5,(z+8.25)/16.5);if(i<segments){let a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const m=new THREE.Mesh(geo,material);m.receiveShadow=true;m.castShadow=false;group.add(m);return m;
 }
 // Deck's visible continuous slab and thin concrete sides.
 strip(-w,w,0,deckMat);
 // Cast a shadow only from the elevated span, never from the ground-level approaches.
 const shadowOnly=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:THREE.DoubleSide});
 const spanShadow=strip(-w,w,0,shadowOnly,-3.3,.85,80);spanShadow.castShadow=true;spanShadow.receiveShadow=false;
 for(const x of [-w,w]){const p=[],idx=[];for(let i=0;i<=steps;i++){const z=z0+(z1-z0)*i/steps,y=interchangeHeight(z);p.push(x,y,z,x,Math.max(.043,y-.14),z);if(i<steps && !(x<0&&((z>-2.96&&z< -1.62)||(z>-.70&&z<.66))) && !(x>0&&((z>-.95&&z<.65)||(z>-2.95&&z< -1.42)))){let a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();const m=new THREE.Mesh(geo,sideMat);m.material.side=THREE.DoubleSide;m.castShadow=true;m.receiveShadow=true;group.add(m)}
 // Split lanes and edge stripes follow exactly the same grade as the deck.
 for(let z=z0+.38;z<z1-.2;z+=.70) strip(-.022,.022,.009,lineMat,z,Math.min(z+.32,z1-.1),5);
 strip(-w+.07,-w+.095,.01,lineMat,z0+.12,-2.85,50,true);strip(-w+.07,-w+.095,.01,lineMat,-1.60,-.70,20,true);strip(-w+.07,-w+.095,.01,lineMat,.55,z1-.12,40,true);
 strip(w-.095,w-.07,.01,lineMat,z0+.12,-2.95,35,true);strip(w-.095,w-.07,.01,lineMat,-1.45,-.95,16,true);strip(w-.095,w-.07,.01,lineMat,.65,z1-.12,45,true);
 // Concrete parapets, following each slope; terminate cleanly before touchdown.
 for(const x of [-w+.018,w-.018]){const verts=[],ind=[];for(let i=0;i<=110;i++){let z=z0+.40+(z1-z0-.8)*i/110,y=interchangeHeight(z);let fade=Math.min(1,i/8,(110-i)/8);verts.push(x-.026,y+.01,z,x+.026,y+.01,z,x-.026,y+.01+.095*fade,z,x+.026,y+.01+.095*fade,z);if(i<110 && !(x<0 && ((z>-2.85 && z< -1.60)||(z>-.70&&z<.55))) && !(x>0 && ((z>-.95 && z<.65)||(z>-2.95&&z< -1.45)))){let a=4*i,b=a+4;ind.push(a+2,b+2,a+3,a+3,b+2,b+3,a,b,a+2,a+2,b,b+2,a+1,a+3,b+1,a+3,b+3,b+1)}}let geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(ind);geo.computeVertexNormals();let m=new THREE.Mesh(geo,guardMat);m.castShadow=true;m.receiveShadow=true;group.add(m)}
 // Curving single-lane ramps merge onto the existing east-west surface road.
 for(let r=0;r<4;r++){
  const n=96,positions=[],uv=[],indices=[],left=[],right=[],colors=[];
  for(let i=0;i<=n;i++){
   let t=i/n,p=interchangeRampPoint(r,t),a=interchangeRampPoint(r,Math.max(0,t-.003)),b=interchangeRampPoint(r,Math.min(1,t+.003));
   let dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
   let half=.23;const lx=p.x+nx*half,lz=p.z+nz*half,rx=p.x-nx*half,rz=p.z-nz*half;
   // A real split stays on the deck plane while it overlaps the through road.
   const edgeY=(x,z)=>Math.abs(x)<.87?interchangeHeight(z)+.003:p.y+.003;
   const ly=edgeY(lx,lz),ry=edgeY(rx,rz);left.push({x:lx,y:ly,z:lz});right.push({x:rx,y:ry,z:rz});
   positions.push(lx,ly,lz,rx,ry,rz);
   // At ground contact, fade the road overlay into the shared boulevard.
   // This removes the hard rectangular cap while preserving the same path.
   let gd=r<2?1-t:t, k=Math.max(0,Math.min(1,(gd-.035)/.20));
   let alpha=k*k*(3-2*k);colors.push(1,1,1,alpha,1,1,1,alpha);
   uv.push((p.x+nx*half+10.75)/21.5,(p.z+nz*half+8.25)/16.5,(p.x-nx*half+10.75)/21.5,(p.z-nz*half+8.25)/16.5);
   if(i<n){let a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}
  }
  let geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));geo.setIndex(indices);geo.computeVertexNormals();let rampMat=deckMat.clone();rampMat.vertexColors=true;rampMat.transparent=true;rampMat.depthWrite=false;let m=new THREE.Mesh(geo,rampMat);m.receiveShadow=true;group.add(m);
  const shadowIndices=[];for(let i=0;i<n;i++){if(interchangeRampPoint(r,i/n).y>.40){let a=i*2;shadowIndices.push(a,a+2,a+1,a+1,a+2,a+3)}}
  const shadowGeo=geo.clone();shadowGeo.setIndex(shadowIndices);const rampShadow=new THREE.Mesh(shadowGeo,new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:THREE.DoubleSide}));rampShadow.castShadow=true;group.add(rampShadow);
  // Fine edge stripes follow the ramp; start after the split so they never
  // cross the through lane. Short dashed split marks begin on the main deck.
  function curvedMark(offset,t0,t1,width){
   let nmark=24,verts=[],idx=[];
   for(let i=0;i<=nmark;i++){let t=t0+(t1-t0)*i/nmark,p=interchangeRampPoint(r,t),a=interchangeRampPoint(r,Math.max(0,t-.002)),b=interchangeRampPoint(r,Math.min(1,t+.002));let dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
    let y=p.y+.010;if(Math.abs(p.x)<.88)y=Math.max(y,interchangeHeight(p.z)+.010);
    verts.push(p.x+nx*(offset-width/2),y,p.z+nz*(offset-width/2),p.x+nx*(offset+width/2),y,p.z+nz*(offset+width/2));
    if(i<nmark){let k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3)}}
   let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();let m=new THREE.Mesh(g,lineMat);group.add(m);
  }
  if(r<2){curvedMark(-.17,.47,.78,.018);curvedMark(.17,.47,.78,.018);}else{curvedMark(-.17,.22,.53,.018);curvedMark(.17,.22,.53,.018);}
  
  // Continuous concrete underside gives each ramp a physical slab.
  for(const edge of [left,right]){let v=[],ix=[];for(let i=0;i<=n;i++){let p=edge[i];v.push(p.x,p.y+.005,p.z,p.x,Math.max(.043,p.y-.14),p.z);if(i<n && Math.abs(edge[i].x)>.87 && Math.abs(edge[i+1].x)>.87 && edge[i].y>.070 && edge[i+1].y>.070){let a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();let mat=sideMat.clone();mat.side=THREE.DoubleSide;let e=new THREE.Mesh(g,mat);e.castShadow=true;group.add(e)}
  // Pier supports each bend outside the cross street, where the sidewalk is rerouted.
  {let p=interchangeRampPoint(r,.40),height=p.y-.12;if(height>.08){let pier=new THREE.Mesh(new THREE.BoxGeometry(.12,height,.12),supportMat);pier.position.set(p.x,.05+height/2,p.z);pier.castShadow=true;group.add(pier)}}
  // Low retaining edges taper away at both merge points.
  for(const edge of [left,right]){let v=[],ix=[];for(let i=0;i<=n;i++){let p=edge[i],fade=Math.min(1,Math.max(0,(i-(r<2?44:20))/8),Math.max(0,((r<2?76:52)-i)/9));v.push(p.x,p.y+.007,p.z,p.x,p.y+.007+.065*fade,p.z);if(i<n&&fade>0&&Math.abs(p.x)>.90){let a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();let mat=guardMat.clone();mat.side=THREE.DoubleSide;let e=new THREE.Mesh(g,mat);e.castShadow=true;group.add(e)}
 }
 // Two slim piers lie outside the east-west carriageway, below the bridge.
 for(const z of [-2.38,.10]){let h=interchangeHeight(z)-.105;if(h<=.1)continue;let pier=new THREE.Mesh(new THREE.BoxGeometry(.22,h,.20),supportMat);pier.position.set(0,.05+h/2,z);pier.castShadow=true;pier.receiveShadow=true;group.add(pier);let cap=new THREE.Mesh(new THREE.BoxGeometry(1.22,.07,.22),supportMat);cap.position.set(0,h+.035,z);cap.castShadow=true;group.add(cap)}
 return group;
}
