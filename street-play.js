const weapons=[
 ['单刀',.65,.32,.055],['手枪',35,.24,.045],['连发枪',35,.105,.038],['重型枪',45,.40,.085]
];
function illustration(i){
 const c=document.createElement('canvas');c.width=200;c.height=90;
 const g=c.getContext('2d');
 function shape(color,points){g.fillStyle=color;g.beginPath();points.forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();g.strokeStyle='#27343c';g.lineWidth=2;g.stroke();}
 if(!i){shape('#becdd1',[[10,43],[126,31],[144,41],[49,52]]);shape('#805b3b',[[127,33],[190,39],[184,54],[128,48]]);}
 else{
 const end=i===1?85:15;
 shape('#526574',[[end,30],[148,28],[160,36],[152,48],[end,45]]);
 shape('#99a8ad',[[end,26],[148,24],[153,30],[end,35]]);
 shape('#474448',[[128,46],[153,44],[174,74],[151,79]]);
 shape('#252d34',[[105,45],[112,45],[115,55],[131,55],[135,62],[111,62]]);
 if(i>1){shape('#65615b',[[151,32],[192,39],[196,59],[173,52],[150,46]]);shape('#4c5359',[[92,44],[111,45],[104,70],[87,65]]);}
 if(i===3)shape('#53606b',[[59,19],[111,18],[110,25],[60,26]]);
 }return c.toDataURL();
}
export function streetPlay(T,scene,camera,stage,nav,onChange,{cityCars,cityPeople,flyover}){
 const hud=document.createElement('div');hud.id='street-combat';document.body.append(hud);
 hud.innerHTML='<div class="reticle"><i></i><i></i><i></i><i></i></div><img class="held-item" alt=""><div class="loadout" aria-label="武器"></div>';
 const style=document.createElement('style');style.textContent=`
 #street-combat{display:none;position:fixed;inset:0;pointer-events:none;z-index:9}
 .street-view-active #street-combat{display:block}.street-view-active #stage,.street-view-active #stage canvas{cursor:none!important}
 .loadout{position:absolute;bottom:62px;left:50%;transform:translateX(-50%);display:flex;gap:3px;pointer-events:auto}
 .loadout button{color:white;background:#283641de;border:1px solid #879097;border-radius:5px;min-width:56px;font:12px system-ui;padding:2px 5px}
 .loadout button[aria-pressed=true]{border-color:#ffcf7f;background:#554631}.loadout img{display:block;width:54px;height:24px}
 .held-item{position:absolute;width:min(34vw,370px);right:3%;bottom:2%;transform:rotate(15deg);filter:drop-shadow(0 2px 3px #0007)}
 .reticle{position:absolute;left:50%;top:50%;width:0;height:0;--gap:4px}.reticle i{position:absolute;background:#adff8b;box-shadow:0 0 1px #162919;width:7px;height:2px}
 .reticle i:nth-child(1){right:var(--gap);top:-1px}.reticle i:nth-child(2){left:var(--gap);top:-1px}.reticle i:nth-child(3),.reticle i:nth-child(4){width:2px;height:7px;left:-1px}.reticle i:nth-child(3){bottom:var(--gap)}.reticle i:nth-child(4){top:var(--gap)}
 .street-view-active #street-help{display:none}@media(max-width:700px){.loadout{bottom:13px;left:auto;right:4px;transform:none}.loadout button{min-width:40px}.loadout img{width:39px}.held-item{bottom:65px}}
 `;document.head.append(style);
 const held=hud.querySelector('img'),bar=hud.querySelector('.loadout'),reticle=hud.querySelector('.reticle'),pictures=weapons.map((_,i)=>illustration(i));
 let slot=1,down=false,delay=0,kick=0,shown=false,bridgeHits=0,audio;
 function select(i){slot=i;held.src=pictures[i];[...bar.children].forEach((b,j)=>b.setAttribute('aria-pressed',String(j===i)));}
 weapons.forEach(([label],i)=>{const b=document.createElement('button');b.innerHTML='<img alt="" src="'+pictures[i]+'">'+(i+1)+' '+label;b.onclick=()=>select(i);bar.append(b);});select(slot);
 const actors=new Map([...cityCars.map(c=>[c.g,'car']),...cityPeople.map(p=>[p.group,'person']),[flyover.group,'bridge']]);
 const effects=[],changed=new Map(),originals=new Map(),ray=new T.Raycaster(),center=new T.Vector2();
 function effect(mesh,velocity,life){mesh.userData.effect=true;scene.add(mesh);effects.push({mesh,velocity,life});}
 function fragments(point,color,r,count){for(let i=0;i<count;i++){const m=new T.Mesh(new T.BoxGeometry(r*.3,r*.21,r*.42),new T.MeshBasicMaterial({color}));m.position.copy(point);effect(m,new T.Vector3(Math.random()-.5,.45+Math.random()*.6,Math.random()-.5),.3+Math.random()*.35);}}
 function hole(hit,r){
  const o=hit.object;
  let data=changed.get(o);
  if(!data){const holes=Array.from({length:24},()=>new T.Vector4(0,0,0,-1));
   const mats=[o.material].flat().map(source=>{const m=source.clone();m.onBeforeCompile=shader=>{
    shader.uniforms.cityHoles={value:holes};
    shader.vertexShader='varying vec3 scarPoint;\n'+shader.vertexShader.replace('#include <project_vertex>',`vec4 scarPos=vec4(transformed,1.);
#ifdef USE_INSTANCING
scarPos=instanceMatrix*scarPos;
#endif
scarPoint=scarPos.xyz;
#include <project_vertex>`);
    shader.fragmentShader='varying vec3 scarPoint;uniform vec4 cityHoles[24];\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
for(int i=0;i<24;i++){vec4 h=cityHoles[i];if(h.w<=0.)continue;float d=distance(scarPoint,h.xyz)/h.w;if(d<.72)discard;if(d<1.)diffuseColor.rgb*=.30;}`);};return m;});
   data={holes,base:o.material,mats,next:0};changed.set(o,data);o.material=Array.isArray(o.material)?mats:mats[0];}
  const local=o.worldToLocal(hit.point.clone()),scale=o.getWorldScale(new T.Vector3());r/=Math.max(.001,(scale.x+scale.y+scale.z)/3);
  const h=data.holes.find(v=>v.w>0&&local.distanceTo(new T.Vector3(v.x,v.y,v.z))<v.w*1.4);
  if(h)h.w+=r*.55;else data.holes[data.next++%24].set(local.x,local.y,local.z,r);
 }
 function sound(){if(!audio||audio.state!=='running')return;const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;osc.type='triangle';osc.frequency.setValueAtTime(slot===0?240:125,t);osc.frequency.exponentialRampToValueAtTime(34,t+.065);gain.gain.setValueAtTime(.12,t);gain.gain.exponentialRampToValueAtTime(.001,t+.07);osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.08);}
 function shoot(){const [,reach,cooldown,r]=weapons[slot];delay=cooldown;kick=1;sound();ray.setFromCamera(center,camera);ray.far=reach;
 const meshes=[];scene.traverseVisible(o=>{if(o.isMesh&&!o.userData.effect&&!o.material?.isShaderMaterial&&o.geometry?.attributes.position)meshes.push(o);});
 const hit=ray.intersectObjects(meshes,false).find(h=>{const d=changed.get(h.object);if(!d)return true;const p=h.object.worldToLocal(h.point.clone());return !d.holes.some(v=>v.w>0&&Math.hypot(v.x-p.x,v.y-p.y,v.z-p.z)<v.w*.72);});
 const end=hit?.point??ray.ray.at(reach,new T.Vector3());
 if(slot){const start=new T.Vector3(.085,-.07,-.19).applyMatrix4(camera.matrixWorld);effect(new T.Line(new T.BufferGeometry().setFromPoints([start,end]),new T.LineBasicMaterial({color:0xffce70})),null,.055);}
 if(!hit)return;let actor=hit.object;while(actor&&!actors.has(actor))actor=actor.parent;
 const type=actors.get(actor);if(actor&&!originals.has(actor))originals.set(actor,{q:actor.quaternion.clone(),y:actor.position.y});
 if(type==='person'){actor.userData.disabled=true;fragments(end,0x943d38,.033,6);}
 else {if(type==='car')actor.userData.disabled=true;if(type==='bridge'&&++bridgeHits>=9)actor.userData.disabled=true;
 if(!hit.object.userData.walkSurface&&hit.object.name!=='qinian-stone-floor')hole(hit,r);
 const color=hit.object.material?.color??0xb9b4a8;fragments(end,color,r,6);}
 onChange();}
 stage.addEventListener('pointerdown',e=>{if(!nav.active||e.button!==0)return;try{audio??=new AudioContext();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}down=true;if(delay<=0)shoot();},true);
 window.addEventListener('pointerup',()=>down=false);window.addEventListener('blur',()=>down=false);
 window.addEventListener('keydown',e=>{if(nav.active&&/^Digit[1-4]$/.test(e.code))select(Number(e.code.slice(-1))-1);});
 return dt=>{
 if(!nav.active&&shown){down=false;bridgeHits=0;for(const [o,d] of changed){o.material=d.base;d.mats.forEach(m=>m.dispose());}changed.clear();for(const [o,v] of originals){o.quaternion.copy(v.q);o.position.y=v.y;delete o.userData.disabled;}originals.clear();for(const e of effects)e.life=0;onChange();}
 shown=nav.active;if(shown){delay-=dt;if(down&&delay<=0)shoot();kick=Math.max(0,kick-dt*8);reticle.style.setProperty('--gap',(4+kick*6)+'px');held.style.transform='translateY('+kick*7+'px) rotate('+(15+kick*5)+'deg)';
 for(const [o,v] of originals)if(o.userData.disabled){const type=actors.get(o);if(type==='bridge')o.scale.y=T.MathUtils.damp(o.scale.y,.045,2,dt);else o.rotation.z=T.MathUtils.damp(o.rotation.z,type==='person'?1.53:.12,7,dt);}}
 if(!shown)flyover.group.scale.y=1;
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.life<=0){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();effects.splice(i,1);}else if(e.velocity){e.velocity.y-=3*dt;e.mesh.position.addScaledVector(e.velocity,dt);e.mesh.rotation.x+=dt*5;}}
 };
}
