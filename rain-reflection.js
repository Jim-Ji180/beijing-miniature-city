// A low-resolution mirror, restricted to wet close-ups. Oblique clipping keeps
// the underside of the diorama out of the reflection.
export function createRainReflection(T,render,water,weather,uniforms) {
  const target=new T.WebGLRenderTarget(2,2,{type:T.HalfFloatType,depthBuffer:true});
  const mirror=new T.PerspectiveCamera();
  const eye=new T.Vector3(),direction=new T.Vector3(),normal=new T.Vector3(0,1,0);
  const up=new T.Vector3(),plane=new T.Plane(),clip=new T.Vector4(),corner=new T.Vector4();
  const bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1);
  uniforms.uReflection.value=target.texture;
  const surface=.044;
  let lastTime=-Infinity,ready=false,active=false;
  function update(scene,camera) {
    if (!water.visible) {
      uniforms.uMirrorReady.value=0;
      active=false;
      return;
    }
    camera.getWorldPosition(eye);
    const fade=1-T.MathUtils.smoothstep(eye.y,6.75,10.85);
    const visible=eye.y>.06&&fade>.001;
    if(!visible){uniforms.uMirrorReady.value=0;active=false;return;}
    const now=performance.now();
    if(active&&now-lastTime<69){uniforms.uMirrorReady.value=ready?fade:0;return;}
    active=true;
    const width=Math.min(760,Math.max(220,Math.round(render.domElement.width*.46)));
    const height=Math.max(1,Math.round(width/camera.aspect));
    if(target.width!==width||target.height!==height){target.setSize(width,height);ready=false;}
    camera.getWorldDirection(direction).reflect(normal);
    up.set(0,1,0).applyQuaternion(camera.quaternion).reflect(normal);
    mirror.position.set(eye.x,surface*2-eye.y,eye.z);
    mirror.up.copy(up);
    mirror.lookAt(direction.add(mirror.position));
    mirror.updateMatrixWorld(true);
    mirror.projectionMatrix.copy(camera.projectionMatrix);
    uniforms.uMirror.value.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
    plane.set(normal,-surface).applyMatrix4(mirror.matrixWorldInverse);
    clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
    const p=mirror.projectionMatrix.elements;
    corner.set((Math.sign(clip.x)+p[8])/p[0],(Math.sign(clip.y)+p[9])/p[5],-1,(1+p[10])/p[14]);
    clip.multiplyScalar(2/clip.dot(corner));
    p[2]=clip.x;p[6]=clip.y;p[10]=clip.z+1-.001;p[14]=clip.w;
    mirror.projectionMatrixInverse.copy(mirror.projectionMatrix).invert();
    const previous=render.getRenderTarget();
    const shadow=render.shadowMap.autoUpdate,shadowDirty=render.shadowMap.needsUpdate,autoClear=render.autoClear;
    try{
      weather.visible=false;
      render.shadowMap.autoUpdate=false;
      render.shadowMap.needsUpdate=false;
      render.autoClear=true;
      render.setRenderTarget(target);
      render.render(scene,mirror);
      ready=true;lastTime=now;
    } finally {
      weather.visible=true;
      render.setRenderTarget(previous);
      render.shadowMap.autoUpdate=shadow;
      render.shadowMap.needsUpdate=shadowDirty;
      render.autoClear=autoClear;
    }
    uniforms.uMirrorReady.value=ready?fade:0;
  }
  return {update,dispose:()=>target.dispose()};
}
