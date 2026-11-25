// Free orbit around the model and screen-space pan, with a separate pedestrian mode.
export function createCityOrbitControls(T,{camera,stage,navigation,onChange=()=>{}}){
 const overviewTarget=new T.Vector3(0,1.5,0);
 const target=overviewTarget.clone();
 const screenUp=new T.Vector3(0,1,0);
 const worldUp=new T.Vector3(0,1,0);
 const offset=new T.Vector3();
 const pitchAxis=new T.Vector3(1,0,0);
 const rotation=new T.Quaternion();
 let drag=null,safeOverview=null,streetHandoff=null,flight=null;
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');

 function snapshot(){
  return {
   position:camera.position.clone(),quaternion:camera.quaternion.clone(),
   zoom:camera.zoom,fov:camera.fov,near:camera.near,far:camera.far,target:target.clone(),
  };
 }

 function remember(){
  const upright=offset.copy(screenUp).applyQuaternion(camera.quaternion).dot(worldUp)>.5;
  if(!streetHandoff&&upright&&camera.position.y>8&&camera.fov<32)safeOverview=snapshot();
 }

 function changed(){
  camera.updateMatrixWorld();
  onChange();
 }

 function place(radius){
  offset.set(0,0,radius).applyQuaternion(camera.quaternion);
  camera.position.copy(target).add(offset);
  changed();
 }

 function restore(view){
  target.copy(view.target??overviewTarget);
  camera.position.copy(view.position);
  camera.quaternion.copy(view.quaternion);
  Object.assign(camera,{zoom:view.zoom,fov:view.fov,near:view.near,far:view.far});
  camera.updateProjectionMatrix();
  changed();
 }

 function flyTo(view,immediate=false){
  if(navigation.active){
   navigation.leaveForOrbit();
   offset.set(0,0,2).applyQuaternion(camera.quaternion);
   target.copy(camera.position).sub(offset);
  }
  clearDrag();
  streetHandoff=null;
  const from=snapshot();
  if(immediate||reducedMotion.matches||(
   from.position.distanceToSquared(view.position)<1e-8 &&
   from.target.distanceToSquared(view.target)<1e-8 &&
   from.quaternion.angleTo(view.quaternion)<1e-5 &&
   from.fov===view.fov&&from.zoom===view.zoom&&from.near===view.near&&from.far===view.far
  )){
   flight=null;
   restore(view);
   remember();
   return;
  }
  flight={
   from,view,elapsed:0,
   fromRadius:from.position.distanceTo(from.target),
   toRadius:view.position.distanceTo(view.target),
  };
 }

 function update(dt){
  if(!flight)return;
  if(navigation.active){flight=null;return;}
  const {from,view,fromRadius,toRadius}=flight;
  flight.elapsed+=dt;
  const progress=Math.min(flight.elapsed/.42,1);
  if(progress===1){
   flight=null;
   restore(view);
   remember();
   return;
  }
  const ease=progress*progress*(3-2*progress);
  target.lerpVectors(from.target,view.target,ease);
  camera.quaternion.slerpQuaternions(from.quaternion,view.quaternion,ease);
  for(const key of ['zoom','fov','near','far'])camera[key]=T.MathUtils.lerp(from[key],view[key],ease);
  camera.updateProjectionMatrix();
  place(T.MathUtils.lerp(fromRadius,toRadius,ease));
 }

 function clearDrag(){drag=null;stage.style.cursor='grab';}

 stage.style.touchAction='none';
 stage.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button>2)return;
  if(navigation.active&&event.button===1)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if(navigation.active){navigation.pointerDown(event);return;}
  flight=null;
  remember();
  drag={
   id:event.pointerId,x:event.clientX,y:event.clientY,
   orientation:camera.quaternion.clone(),
   pan:event.button===2||(event.button===1&&event.shiftKey),
  };
  stage.setPointerCapture(event.pointerId);
  stage.style.cursor='grabbing';
 },true);

 stage.addEventListener('pointermove',event=>{
  if(navigation.active){event.stopImmediatePropagation();navigation.pointerMove(event);return;}
  if(!drag||drag.id!==event.pointerId)return;
  event.stopImmediatePropagation();
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(drag.pan&&!dx&&!dy)return;
  const radius=camera.position.distanceTo(target);
  if(streetHandoff)streetHandoff.freeOrbit=true;
  if(drag.pan){
   drag.x=event.clientX;
   drag.y=event.clientY;
   // Translate both the pivot and camera along the visible screen axes.
   const scale=2*radius*Math.tan(T.MathUtils.degToRad(camera.fov)/2)/(stage.clientHeight*camera.zoom);
   offset.set(-dx*scale,dy*scale,0).applyQuaternion(camera.quaternion);
   target.add(offset);
   camera.position.add(offset);
   changed();
  }else{
   // Apply both axes from the gesture start so changing direction mid-drag
   // feels continuous, regardless of how the browser samples pointer moves.
   camera.quaternion.copy(drag.orientation)
    .multiply(rotation.setFromAxisAngle(pitchAxis,-dy*.004))
    .premultiply(rotation.setFromAxisAngle(worldUp,-dx*.006))
    .normalize();
   place(radius);
  }
 },true);

 for(const type of ['pointerup','pointercancel','lostpointercapture']){
  stage.addEventListener(type,event=>{
   if(navigation.active){event.stopImmediatePropagation();navigation.pointerUp();return;}
   if(!drag||drag.id!==event.pointerId)return;
   event.stopImmediatePropagation();
   clearDrag();
  },true);
 }
 stage.addEventListener('contextmenu',event=>event.preventDefault());
 stage.addEventListener('auxclick',event=>{if(event.button===1)event.preventDefault();});

 stage.addEventListener('wheel',event=>{
  event.preventDefault();
  flight=null;
  if(navigation.active){
   if(event.deltaY<=0){navigation.wheel(event);return;}
   const direction=camera.getWorldDirection(new T.Vector3());
   const handoff=navigation.leaveForOrbit();
   if(!handoff)return;
   target.copy(camera.position).addScaledVector(direction,2);
   streetHandoff={baseY:target.y,eyeY:camera.position.y,fov:camera.fov,near:camera.near,freeOrbit:false};
   clearDrag();
  }

  remember();
  const previous=snapshot();
  const radius=T.MathUtils.clamp(
   camera.position.distanceTo(target)*Math.exp(T.MathUtils.clamp(event.deltaY*.0015,-.30,.30)),2,95,
  );
  const direction=camera.getWorldDirection(new T.Vector3());
  const upright=offset.copy(screenUp).applyQuaternion(camera.quaternion).dot(worldUp)>.9;
  const atStreetAngle=upright&&Math.abs(direction.y)<.06;
  camera.zoom=1;
  if(streetHandoff){
   // The initial wheel-out from a pedestrian view keeps the camera above the street.
   // Deliberate orbit or pan releases this temporary height correction.
   if(!streetHandoff.freeOrbit){
    target.y=Math.max(streetHandoff.baseY,streetHandoff.eyeY+radius*direction.y);
   }
   const blend=T.MathUtils.smoothstep(radius,2,24);
   camera.fov=T.MathUtils.lerp(streetHandoff.fov,28,blend);
   camera.near=T.MathUtils.lerp(streetHandoff.near,1,blend);
  }else{
   const blend=upright?(1-T.MathUtils.smoothstep(Math.abs(direction.y),.06,.20))*(1-T.MathUtils.smoothstep(radius,12,24)):0;
   camera.fov=T.MathUtils.lerp(28,65,blend);
   camera.near=T.MathUtils.lerp(1,.02,blend);
  }
  camera.updateProjectionMatrix();
  place(radius);

  const nearStreet=camera.position.y>-.02&&camera.position.y<2;
  const reenter=streetHandoff&&!streetHandoff.freeOrbit
   ? radius<=2.00001&&Math.abs(camera.position.y-streetHandoff.eyeY)<.08
   : atStreetAngle&&nearStreet;
  if(event.deltaY<0&&reenter&&Math.abs(camera.position.x)<10.65&&Math.abs(camera.position.z)<8.12){
   if(navigation.enter(camera.position,{direction,returnView:safeOverview??previous,strict:true,keepLens:true,from:previous.position})){
    streetHandoff=null;
    clearDrag();
   }else restore(previous);
  }
 },{passive:false});

 window.addEventListener('keydown',event=>{
  if(event.code!=='Escape'||navigation.active||!streetHandoff||!safeOverview)return;
  event.preventDefault();
  restore(safeOverview);
  streetHandoff=null;
  clearDrag();
 });

 return {
  target,remember,flyTo,update,
  reset(){flight=null;target.copy(overviewTarget);streetHandoff=null;clearDrag();},
  restoreTarget(view){flight=null;if(view?.target)target.copy(view.target);streetHandoff=null;clearDrag();},
 };
}
