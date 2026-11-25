const grainFunctions=`
 varying vec3 vFinishWorld;
 float finishHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+31.32);return fract((p.x+p.y)*p.z);}
 float finishNoise(vec3 p){
   vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
   return mix(mix(mix(finishHash(i),finishHash(i+vec3(1,0,0)),f.x),
      mix(finishHash(i+vec3(0,1,0)),finishHash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(finishHash(i+vec3(0,0,1)),finishHash(i+vec3(1,0,1)),f.x),
      mix(finishHash(i+vec3(0,1,1)),finishHash(i+vec3(1,1,1)),f.x),f.y),f.z);
 }
`;

export function addSurfaceFinish(material,kind) {
  material.customProgramCacheKey=()=>`world-surface-${kind}-v4`;
  const finish=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    finish.call(this,shader,renderer);
    shader.vertexShader='varying vec3 vFinishWorld;\n'+shader.vertexShader.replace('#include <project_vertex>',`
     #include <project_vertex>
     vec4 finishPosition=vec4(transformed,1.);
     #ifdef USE_INSTANCING
       finishPosition=instanceMatrix*finishPosition;
     #endif
     vFinishWorld=(modelMatrix*finishPosition).xyz;
    `);
    const expressions={
      asphalt:`float coarse=finishNoise(p*9.);
        float detail=1.-smoothstep(.30,.95,max(length(dFdx(p.xz)),length(dFdy(p.xz)))*116.);
        float grit=(finishNoise(p*116.)-.5)*detail;
        bool mainCross=abs(p.z+1.15)<.68;
        float junction=1.-smoothstep(.67,1.,max(abs(p.x),abs(p.z+1.15)));
        float sideCenter=p.x<0.?-5.36:6.65;
        bool sideRoad=p.z>-.4&&abs(p.x-sideCenter)<.30;
        float across=mainCross?p.z+1.15:(sideRoad?p.x-sideCenter:p.x);
        float along=mainCross?p.x:p.z;
        float laneWidth=sideRoad?.23:.62;
        float tireTrack=exp(-pow((abs(abs(across)-laneWidth*.5)-laneWidth*.25)/(laneWidth*.14),2.));
        float wear=tireTrack*(.45+.55*finishNoise(vec3(across*35.,0.,along*.51)))*(1.-junction);
        float stain=finishNoise(vec3(across*13.,0.,along*2.8));
        float pavingBoundary=1.-smoothstep(.009,.027,abs(abs(across)-laneWidth*.53));
        float asphaltPatch=smoothstep(.43,.51,finishNoise(vec3(across*4.8,0.,along*.66)));
        diffuseColor.rgb*=.968+.038*coarse+.050*grit+.026*stain-.041*wear-.014*pavingBoundary+.021*asphaltPatch;`,
      paint:`float detail=1.-smoothstep(.28,.94,max(length(dFdx(p.xz)),length(dFdy(p.xz)))*98.);
        float abrasion=finishNoise(p*28.);float grain=finishNoise(p*98.);
        diffuseColor.rgb *= .94+.11*abrasion+(grain-.5)*.085*detail;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.11,.12,.12),smoothstep(.64,.87,abrasion)*(.30+grain*.35)*detail);`,
      curb:`vec3 normalW=normalize(cross(dFdx(p),dFdy(p)));
        bool vertical=abs(normalW.y)<.55;
        bool alongZ=vertical?abs(normalW.x)>.6:(abs(abs(p.x)-1.05)<.025||abs(p.x+5.36)<.075||abs(p.x-6.65)<.075);
        float run=alongZ?p.z:p.x;
        float divided=(run+.369)*3.44;
        float joint=(1.-smoothstep(.005,.012+fwidth(divided),abs(fract(divided)-.5)))*(1.-smoothstep(.32,.70,fwidth(divided)));
        float foot=vertical?1.-smoothstep(.043,.081,p.y):0.;
        float stone=finishNoise(p*86.);
        diffuseColor.rgb*=.95+.08*stone-.17*joint-.11*foot;`,
      clay:`float fine=finishNoise(p*190.);float baking=finishNoise(p*45.);
        float runoff=finishNoise(p*vec3(45.,3.,45.));
        diffuseColor.rgb*= .80+.19*baking+.12*fine+.11*runoff;`,
      'illustrated-clay':`float baking=finishNoise(p*21.);
        diffuseColor.rgb*=.972+.046*baking;`,
      timber:`float grain=finishNoise(p*vec3(94.,10.,64.));
        float touched=exp(-pow((p.y-.33)*13.,2.))*finishNoise(p*vec3(23.,7.,21.));
        diffuseColor.rgb*= .88+.18*grain+.18*touched;`,
      masonry:`float pore=finishNoise(p*138.);float damp=finishNoise(p*vec3(13.,3.,13.))*(1.-smoothstep(.05,.37,p.y));
        diffuseColor.rgb*=.87+.24*pore-.17*damp;`,
    };
    shader.fragmentShader=grainFunctions+shader.fragmentShader.replace('#include <color_fragment>',`
     #include <color_fragment>
     vec3 p=vFinishWorld;
     ${expressions[kind]}
    `);
  };
}

export function createStreetMarkingDetails(T,{flyover=false}={}) {
  const root=new T.Group();
  root.name='boulevard-approach-markings';
  const ivory=new T.MeshStandardMaterial({color:'#e2e0ce',roughness:.95});
  const ochre=new T.MeshStandardMaterial({color:'#c6a766',roughness:.98});
  for(const material of [ivory,ochre])addSurfaceFinish(material,'paint');
  const cream=[],warm=[];
  const elevation=.0431;

  function polygon(points,centerX,centerZ,angle,out=cream){
    const vectors=points.map(([x,z])=>new T.Vector2(x,z));
    const triangles=T.ShapeUtils.triangulateShape(vectors,[]);
    const cos=Math.cos(angle),sin=Math.sin(angle);
    for(const triangle of triangles)for(const i of [...triangle].reverse()){
      const [x,z]=points[i];
      out.push(centerX+x*cos+z*sin,elevation,centerZ-x*sin+z*cos);
    }
  }
  function stripe(x,z,width,length,angle,out){
    polygon([[-width/2,-length/2],[width/2,-length/2],[width/2,length/2],[-width/2,length/2]],x,z,angle,out);
  }
  const arrow=[[-.017,-.216],[.017,-.216],[.017,.068],[.070,.032],[0,.206],[-.070,.032],[-.017,.068]];
  for(const [x,z,angle] of [[-2.24,-.82,Math.PI/2],[2.24,-1.48,-Math.PI/2]])polygon(arrow,x,z,angle);

  if(!flyover){
    for(const [x,z,angle] of [[.51,.99,Math.PI],[-.51,-3.09,0]])polygon(arrow,x,z,angle);
    for(const x of [-.983,.983]){
      stripe(x,-5.55,.016,5.62,0);
      stripe(x,4.54,.016,7.68,0);
    }
    // Short no-passing markings on the two approaches to an at-grade crossing.
    for(const offset of [-.020,.020]){
      stripe(offset,-2.68,.016,.25,0,warm);
      stripe(offset,.36,.016,.32,0,warm);
    }
  }
  for(const z of [-1.761,-.539]){
    const strips=z< -1.15?[[-10.88,-1.92],[1.92,10.88]]:[[-10.88,-5.90],[-4.83,-1.92],[1.92,6.12],[7.14,10.88]];
    for(const [start,end] of strips)stripe((start+end)/2,z,.014,end-start,Math.PI/2);
  }
  for(const [positions,material] of [[cream,ivory],[warm,ochre]]){
    if(!positions.length)continue;
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geo.computeVertexNormals();
    const paint=new T.Mesh(geo,material);
    paint.receiveShadow=true;
    paint.raycast=()=>{};
    root.add(paint);
  }
  return root;
}

export function makeStreetHorizon(T,scene,night) {
  const g=new T.Group();g.name='street-view-distant-urban-context';g.visible=false;scene.add(g);
  const material=new T.MeshBasicMaterial({color:'#a8b8c5'});
  const mesh=new T.InstancedMesh(new T.BoxGeometry(),material,116),obj=new T.Object3D();
  let seed=91927;
  const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<116;i++){
    const a=(i+rnd()*.6)/116*Math.PI*2;
    const radius=37+rnd()*8,h=.6+rnd()*.9+Math.pow(rnd(),4)*2.15;
    obj.position.set(Math.cos(a)*radius,h/2-.23,Math.sin(a)*radius);
    obj.scale.set(.55+rnd()*1.55,h,.55+rnd()*1.3);
    obj.rotation.y=Math.floor(a/1.57)*1.57;
    obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
    mesh.setColorAt(i,new T.Color().setScalar(.84+rnd()*.15));
  }
  g.add(mesh);
  return {update(active){g.visible=active;material.color.set(night()?'#354260':'#a8b8c5');}};
}
