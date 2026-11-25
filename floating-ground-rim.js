// Undulating soil/rock contact shared by both meshes. The city grade stays flat.
export function rockContact(x,z){
  return -.86+.15*Math.sin(x*.53+z*.88)+.09*Math.sin(x*1.28-z*.72)+.050*Math.cos(x*3.4+z*2.7)+.018*Math.sin(x*7.1-z*5.6);
}
