// Narrow staggered stone joints follow the scale of the reference pedestrian plaza.
const geometryShader = `
  varying vec2 vWalkPosition;
  float walkHash(vec2 p){return fract(sin(dot(p,vec2(13.8,71.3)))*41713.27);}
`;

export function detailSidewalk(material, axis='x') {
  const previous=material.onBeforeCompile;
  material.customProgramCacheKey=()=>`city-walk-paving-${axis}-v3`;
  material.onBeforeCompile=function(shader,renderer) {
    previous.call(this,shader,renderer);
    shader.vertexShader='varying vec2 vWalkPosition;\n'+shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nvWalkPosition=(modelMatrix*vec4(position,1.)).xz;');
    shader.fragmentShader=geometryShader+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec2 grid=vWalkPosition.${axis==='z'?'yx':'xy'}/vec2(.176,.137);
      grid.x+=mod(floor(grid.y),2.)*.5;
      vec2 f=fract(grid);
      vec2 distanceToEdge=min(f,1.-f);
      vec2 aa=max(fwidth(grid),vec2(.001));
      vec2 seam=1.-smoothstep(vec2(.009),vec2(.010)+aa,distanceToEdge);
      float contrast=1.-smoothstep(.28,1.,max(aa.x,aa.y));
      float grain=walkHash(floor(vWalkPosition*115.));
      float tile=walkHash(floor(grid));
      float edgeLight=1.-smoothstep(.019,.036+max(aa.x,aa.y),min(f.x,f.y));
      float pattern=sin((f.x+.2)*8.+sin(f.y*6.)+tile*7.);
      float detail=1.-smoothstep(.27,.90,max(fwidth(vWalkPosition.x),fwidth(vWalkPosition.y))*115.);
      float roughnessShade=(grain-.5)*.037*detail+pattern*.016;
      vec3 shade=mix(vec3(.986,.965,.924),vec3(1.023,1.007,.974),tile);
      diffuseColor.rgb*=shade*(.955+tile*.078+roughnessShade+edgeLight*.074*contrast
       - max(seam.x*.234,seam.y*.252)*contrast);
    `);
  };
}

export function createPedestrianDetails(T,material) {
  const root=new T.Group();root.name='pedestrian-route-to-temple';
  const box=new T.BoxGeometry();
  const steel=new T.MeshStandardMaterial({color:'#777469',roughness:.86});
  const throat=new T.MeshStandardMaterial({color:'#454847',roughness:1});
  function piece(mat,x,y,z,w,h,d){
    const mesh=new T.Mesh(box,mat);
    mesh.position.set(x,y,z);
    mesh.scale.set(w,h,d);
    mesh.receiveShadow=true;
    root.add(mesh);
  }
  // The perpendicular strip starts at the east sidewalk edge and meets the
  // existing apron by the west stairs. Top heights stay just above adjacent slabs.
  piece(material,1.72,.078,3.5,.61,.010,.29);
  piece(material,1.37,.075,3.5,.17,.009,.31);
  // Narrow metal inlet grilles sit on the curb line clear of the warning pads.
  for(const z of [.94,2.49,4.59]){
    piece(steel,1.068,.071,z,.047,.005,.125);
    piece(throat,1.068,.074,z,.032,.002,.107);
    for(let i=-3;i<=3;i++)piece(steel,1.068,.076,z+i*.013,.033,.002,.004);
  }
  return root;
}
