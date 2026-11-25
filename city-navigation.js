// Street-scale navigation follows the mouse-look / WASD convention of
// https://threejs.org/examples/misc_controls_pointerlock.html .
// Drag-look also works in embedded browsers without Pointer Lock permission.
export function createCityNavigation(T,{camera,scene,stage,finish,dynamicObjects=[],canCross=()=>true,onReturn=()=>{}}){
 let active=false,saved=null,yaw=0,pitch=0,lookDrag=null;
 let jumpHeight=0,jumpVelocity=0,smoothedGround=0,ground=0;
 const keys=new Set(),obstacles=[],floors=[],dynamicRoots=new Set(dynamicObjects);
 const isTurf=o=>o.userData.cityTurf||/^(cctv-lawn-|north-green-precinct-)/.test(o.name);
 const downVector=new T.Vector3(0,-1,0);
 const eye=.25,radius=.045,down=new T.Raycaster(),floorPoint=new T.Vector3(),euler=new T.Euler(0,0,0,'YXZ');
 const button=document.createElement('button');button.id='street-view';button.type='button';button.textContent='进入街道';button.setAttribute('aria-pressed','false');document.querySelector('#tools').prepend(button);
 const help=document.createElement('div');help.id='street-help';help.hidden=true;help.textContent='移动鼠标转头 · WASD 行走 · Shift 快跑 · 空格跳跃 · Esc 返回';document.body.append(help);
 const updateHelp=()=>{help.textContent=innerWidth<701?'拖动转头 · 方向按钮行走 · 返回沙盘退出':'移动鼠标转头 · WASD 行走 · Shift 快跑 · 空格跳跃 · Esc 返回';};updateHelp();window.addEventListener('resize',updateHelp);
 const pad=document.createElement('div');pad.id='street-pad';pad.hidden=true;pad.setAttribute('aria-label','步行方向');
 for(const [code,label,icon] of [['ArrowUp','向前走','↑'],['ArrowLeft','向左走','←'],['ArrowDown','向后走','↓'],['ArrowRight','向右走','→']]){
  const b=document.createElement('button');b.type='button';b.dataset.move=code;b.textContent=icon;b.setAttribute('aria-label',label);
  b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(code);b.setPointerCapture(e.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(code));pad.append(b);
 }document.body.append(pad);
 const box=new T.Box3(),size=new T.Vector3();
 function collect(){
  obstacles.length=0;floors.length=0;scene.updateMatrixWorld(true);
  scene.traverse(o=>{
   if(o.name==="qinian-stone-floor"||o.userData.walkSurface){floors.push(o);return;}
   if(!o.isMesh||o.isInstancedMesh||o.userData.flyoverSpan||(!o.visible&&!o.userData.officeEnvelopeVolume)||(o.material?.transparent&&!isTurf(o))||o.material?.isShaderMaterial)return;
   let tree=false;for(let p=o;p&&p!==scene;p=p.parent)if(p.name==='branching-street-tree'||p.name==='city-pigeon'||dynamicRoots.has(p)){tree=true;break;}if(tree)return;
   if(o.children.length){
    box.setFromObject(o);
   }else{
    if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
    box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
   }
   if(box.isEmpty())return;box.getSize(size);
   if(box.max.y<=.17&&box.max.y>=.035&&box.min.y>=-.06&&size.x>.07&&size.z>.07)floors.push(o);
   if(box.min.y<=.145&&box.max.y>.22&&size.y>.16&&size.x>.06&&size.z>.06)obstacles.push({box:box.clone(),object:o});
  });
 }
 function free(x,z,padding=radius){if(Math.abs(x)>10.72||Math.abs(z)>8.20)return false;return !obstacles.some(({box:b})=>x>b.min.x-padding&&x<b.max.x+padding&&z>b.min.z-padding&&z<b.max.z+padding);}
 function surfaceAt(x,z){
  floorPoint.set(x,(active?ground:.073)+.085,z);down.set(floorPoint,downVector);down.far=2;
  return down.intersectObjects(floors,false)[0];
 }
 function floorAt(x,z){return surfaceAt(x,z)?.point.y??.073;}
 function orientation(){camera.quaternion.setFromEuler(euler.set(pitch,yaw,0));camera.updateMatrixWorld();}
 function enter(point=null,options={}){
  if(active)return false;collect();saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),zoom:camera.zoom,fov:camera.fov,near:camera.near,far:camera.far,ao:finish.uniforms.uAoStrength.value};
  if(options.returnView){const v=options.returnView;saved={...saved,...v,position:v.position.clone(),quaternion:v.quaternion.clone()};}
  let x=point?.x??1.24,z=point?.z??5.8;
  if(options.strict&&(!free(x,z)||(options.from&&!canStep(options.from.x,options.from.z,x-options.from.x,z-options.from.z))))return false;
  if(!free(x,z)){let found=false;for(let ring=1;ring<=20&&!found;ring++)for(let k=0;k<24;k++){const a=k*Math.PI/12,nx=x+Math.cos(a)*ring*.08,nz=z+Math.sin(a)*ring*.08;if(free(nx,nz)){x=nx;z=nz;found=true;break;}}if(!found){x=1.24;z=5.8;}}
  ground=.073;jumpHeight=jumpVelocity=0;active=true;keys.clear();camera.position.set(x,(ground=floorAt(x,z))+eye,z);smoothedGround=ground;camera.zoom=1;camera.near=.02;camera.far=100;camera.fov=options.keepLens?camera.fov:65;finish.uniforms.uAoStrength.value=0;camera.updateProjectionMatrix();yaw=options.direction?Math.atan2(-options.direction.x,-options.direction.z):0;pitch=options.direction?Math.asin(T.MathUtils.clamp(options.direction.y,-1,1)):.035;orientation();
  document.body.classList.add('street-view-active');button.textContent='返回沙盘';button.setAttribute('aria-pressed','true');help.hidden=false;pad.hidden=false;stage.style.cursor='grab';return true;
 }
 function exit(){
  if(!active)return;active=false;if(document.pointerLockElement===stage)document.exitPointerLock();keys.clear();lookDrag=null;document.body.classList.remove('street-view-active');button.textContent='进入街道';button.setAttribute('aria-pressed','false');help.hidden=true;pad.hidden=true;
  camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);camera.zoom=saved.zoom;camera.fov=saved.fov;camera.near=saved.near;camera.far=saved.far;finish.uniforms.uAoStrength.value=saved.ao;camera.updateProjectionMatrix();camera.updateMatrixWorld();onReturn(saved);
 }
 // Wheel-out leaves the walking mode in place; orbit builds its pivot from this
 // live camera rather than restoring the old overview or its old target.
 function leaveForOrbit(){
  if(!active)return null;
  active=false;if(document.pointerLockElement===stage)document.exitPointerLock();keys.clear();lookDrag=null;document.body.classList.remove('street-view-active');button.textContent='进入街道';button.setAttribute('aria-pressed','false');help.hidden=true;pad.hidden=true;stage.style.cursor='grab';
  finish.uniforms.uAoStrength.value=saved.ao;camera.far=saved.far;camera.updateProjectionMatrix();
  return {returnView:saved};
 }
 function lockMouse(){
  if(active && !document.pointerLockElement && matchMedia('(pointer:fine)').matches)
    stage.requestPointerLock?.()?.catch(()=>{});
 }
 button.onclick=()=>{if(active)exit();else if(enter())lockMouse();};
 let locked=false;
 document.addEventListener('pointerlockchange',()=>{
   const next=document.pointerLockElement===stage;
   if(locked&&!next&&active)exit();
   locked=next;
 });
 document.addEventListener('mousemove',e=>{
   if(!active||(!locked&&!stage.contains(e.target)))return;
   if(e.sourceCapabilities?.firesTouchEvents)return;
   yaw-=e.movementX*.0024;
   pitch=T.MathUtils.clamp(pitch-e.movementY*.0024,-1.45,1.45);
   orientation();
 });
 const wallRay=new T.Raycaster();
 function canStep(x,z,dx,dz){
  if(Math.abs(x+dx)>10.72||Math.abs(z+dz)>8.20)return false;
  if(!canCross(x,z,x+dx,z+dz))return false;
  const length=Math.hypot(dx,dz);if(!length)return true;
  const nx=dx/length,nz=dz/length;
  const possible=obstacles.filter(({box:b})=>x+dx>b.min.x-radius-length&&x+dx<b.max.x+radius+length&&z+dz>b.min.z-radius-length&&z+dz<b.max.z+radius+length).map(e=>e.object);
  if(!possible.length)return true;
  for(const y of [camera.position.y-eye+.09,camera.position.y])for(const offset of [-radius,0,radius]){
   wallRay.set(new T.Vector3(x-nz*offset,y,z+nx*offset),new T.Vector3(nx,0,nz));wallRay.far=length+radius;
   if(wallRay.intersectObjects(possible,false).length)return false;
  }return true;
 }
 function move(dx,dz){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.025));for(let i=0;i<steps;i++){if(canStep(camera.position.x,camera.position.z,dx/steps,0))camera.position.x+=dx/steps;if(canStep(camera.position.x,camera.position.z,0,dz/steps))camera.position.z+=dz/steps;}ground=floorAt(camera.position.x,camera.position.z);camera.updateMatrixWorld();}

 function update(dt){if(!active)return;const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),len=Math.hypot(forward,right);if(len){const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?1.3:.60)*Math.min(dt,.05)/len;move((-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed);}
  if(jumpHeight>0||jumpVelocity>0){jumpVelocity-=3.5*dt;jumpHeight=Math.max(0,jumpHeight+jumpVelocity*dt);}
  smoothedGround=T.MathUtils.damp(smoothedGround,ground,22,dt);camera.position.y=smoothedGround+eye+jumpHeight;
  camera.updateMatrixWorld();
 }
 const editable=e=>e.target instanceof Element&&e.target.matches('input,textarea,select,[contenteditable=true]');
 window.addEventListener('keydown',e=>{if(!active||editable(e))return;if(e.code==='Space'){e.preventDefault();if(!e.repeat&&jumpHeight===0)jumpVelocity=1.25;return;}if(e.code==='Escape'){e.preventDefault();exit();return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
 stage.addEventListener('dblclick',e=>{if(active)return;const rect=stage.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);const p=new T.Vector3();if(ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.073),p)&&Math.abs(p.x)<10.7&&Math.abs(p.z)<8.2)enter(p);});
 function pointerDown(e){if(e.pointerType==="mouse"){lockMouse();return;}lookDrag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:e.button===2};stage.setPointerCapture(e.pointerId);stage.style.cursor='grabbing';}
 function pointerMove(e){if(!lookDrag||lookDrag.id!==e.pointerId)return;if(lookDrag.pan){const dx=(e.clientX-lookDrag.x)*.003,dz=(e.clientY-lookDrag.y)*.003;move(-Math.cos(yaw)*dx-Math.sin(yaw)*dz,Math.sin(yaw)*dx-Math.cos(yaw)*dz);lookDrag.x=e.clientX;lookDrag.y=e.clientY;return;}yaw-=(e.clientX-lookDrag.x)*.003;pitch=T.MathUtils.clamp(pitch-(e.clientY-lookDrag.y)*.003,-1.35,1.35);orientation();lookDrag.x=e.clientX;lookDrag.y=e.clientY;}
 function pointerUp(){lookDrag=null;stage.style.cursor='grab';}
 function wheel(e){move(-Math.sin(yaw)*T.MathUtils.clamp(-e.deltaY*.0015,-.2,.2),-Math.cos(yaw)*T.MathUtils.clamp(-e.deltaY*.0015,-.2,.2));}
 function state(){return {mode:active?'street':'orbit',position:camera.position.toArray(),yaw,pitch,eyeHeight:eye,collisionBoxes:obstacles.length,coordinates:'Y up; north is -Z; X east',controls:active?'mouse look; WASD/arrows move; Escape return':'left or middle drag orbits freely; right or Shift+middle drag pan; wheel dolly; ground-level zoom enters street'};}
 return {get active(){return active;},enter,exit,leaveForOrbit,refresh:collect,update,pointerDown,pointerMove,pointerUp,wheel,state};
}
