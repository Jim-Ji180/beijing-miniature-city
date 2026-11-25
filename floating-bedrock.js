import { rockContact } from './floating-ground-rim.js?v=2';

// The inhabited plane stays level. Only the exposed geology breaks and tapers.
export function createFloatingBedrock(THREE, width, depth) {
  const rings = [
    { y: -.86, scale: .999, shiftX: 0, shiftZ: 0, erosion: 0 },
    { y: -1.25, scale: .984, shiftX: -.05, shiftZ: .04, erosion: .24 },
    { y: -1.67, scale: .96, shiftX: -.12, shiftZ: .12, erosion: .37 },
    { y: -2.45, scale: .87, shiftX: -.36, shiftZ: .52, erosion: .86 },
    { y: -3.55, scale: .70, shiftX: -.65, shiftZ: .85, erosion: 1 },
    { y: -4.52, scale: .46, shiftX: -.62, shiftZ: .26, erosion: .84 },
    { y: -5.17, scale: .23, shiftX: -.42, shiftZ: .16, erosion: .64 },
    { y: -5.45, scale: .055, shiftX: -.21, shiftZ: .08, erosion: .23 },
  ];
  const edge = [];
  for (const [a,b] of [
    [[-width/2,-depth/2],[width/2,-depth/2]],
    [[width/2,-depth/2],[width/2,depth/2]],
    [[width/2,depth/2],[-width/2,depth/2]],
    [[-width/2,depth/2],[-width/2,-depth/2]],
  ]) {
    const count = Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.46);
    for (let i=0;i<count;i++) {
      const t=i/count;
      edge.push([THREE.MathUtils.lerp(a[0],b[0],t),THREE.MathUtils.lerp(a[1],b[1],t)]);
    }
  }
  const positions=[], indices=[];
  for (const [row,ring] of rings.entries()) {
    for (const [index,[x,z]] of edge.entries()) {
      const rib = .12*Math.sin(index*1.44+row*.27) + .16*Math.sin(index*.38-row*.94) + .22*Math.sin(index*.23+row*.88+Math.sin(index*.12)*1.5);
      const relief = .24*Math.sin(x*2.6+z*1.8+row*.58) + .12*Math.cos(x*3.1-z*4.4-row*.90);
      const scaled=ring.scale*(1+rib*ring.erosion*.19);
      positions.push(
        x*scaled+ring.shiftX,
        ring.y+relief*ring.erosion+(rockContact(x,z)+.86)*Math.max(0,1-row*.27),
        z*scaled+ring.shiftZ,
      );
    }
  }
  const count=edge.length;
  for (let row=0;row<rings.length-1;row++) for(let i=0;i<count;i++){
    const a=row*count+i,b=row*count+(i+1)%count,c=a+count,d=b+count;
    if((row+i)%2)indices.push(a,b,c,b,d,c);
    else indices.push(a,b,d,a,d,c);
  }
  const bottom=rings.at(-1);
  const cap=positions.length/3;
  positions.push(bottom.shiftX,bottom.y-.17,bottom.shiftZ);
  for(let i=0;i<count;i++){
    const start=(rings.length-1)*count;
    indices.push(cap,start+i,start+(i+1)%count);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material=new THREE.MeshStandardMaterial({color:'#b2a491',roughness:1});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vRock;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRock=position;');
    shader.fragmentShader=`varying vec3 vRock;
      float stoneHash(vec3 p){
        p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);
      }
      float stoneNoise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(stoneHash(i),stoneHash(i+vec3(1,0,0)),f.x),
                       mix(stoneHash(i+vec3(0,1,0)),stoneHash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(stoneHash(i+vec3(0,0,1)),stoneHash(i+vec3(1,0,1)),f.x),
                       mix(stoneHash(i+vec3(0,1,1)),stoneHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
    `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float weathering = stoneNoise(vRock*vec3(2.5,1.2,2.5));
      float chips = stoneNoise(vRock*17.);
      float grain = stoneNoise(vRock*67.);
      float strata = sin(vRock.y*8.5+vRock.x*.18+vRock.z*.25+weathering*2.6);
      vec3 mineral = mix(vec3(.58,.58,.62),vec3(1.13,1.06,.92),weathering);
      float seam = smoothstep(-1.65,-.76,vRock.y+weathering*.16);
      diffuseColor.rgb *= mix(mineral,vec3(.60,.48,.36),seam*.73)*
        (.77+.33*chips+.10*grain+.19*smoothstep(.30,.86,strata));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
      #include <normal_fragment_maps>
      float relief = stoneNoise(vRock * vec3(7.,11.,7.))*.022 + stoneNoise(vRock*25.)*.005;
      vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition);
      vec3 rx=cross(dy,normal),ry=cross(normal,dx);
      float det=dot(dx,rx);
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*rx+dFdy(relief)*ry));
    `);
  };
  const rock=new THREE.Mesh(geometry,material);
  rock.name='Suspended weathered rock beneath Beijing';
  rock.castShadow=true;
  rock.receiveShadow=true;
  return rock;
}
