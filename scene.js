import { streetPlay } from './street-play.js?v=2';
import { createPrecinctPreview } from './precinct-preview.js?v=3';
import { createCloudGroundShade } from './cloud-ground-shade.js';
import { addSurfaceFinish, makeStreetHorizon, createStreetMarkingDetails } from './street-realism.js?v=5';
import { createStreetVerges } from './street-verges.js?v=1';
import { createStreetFlyover, flyoverHeight, flyoverSlope } from './street-flyover.js?v=2';
import { detailSidewalk, createPedestrianDetails } from './pedestrian-paving.js?v=3';
import { applyCityTurf, createTurfTufts, createRootLitter, createPlantedBedFoliage } from './city-turf.js?v=8';
import { createFloatingBedrock } from './floating-bedrock.js?v=4';
import { createPigeonFlight } from './city-pigeons.js?v=276';
import * as THREE from './vendor/three.module.js';
import { createCityNavigation } from './city-navigation.js?v=15';
import { createCityOrbitControls } from './city-orbit-controls.js?v=8';
import { createSoilPlinth } from './soil-plinth.js?v=4';
import { createOfficeConstruction } from './office-construction.js?v=4';
import { createCityConstruction } from './city-construction.js?v=7';
import { createOfficeBuilding } from './office-district.js?v=30';
import { createDetailedTree } from './detailed-tree.js?v=20';
import { createDetailedBench, createDetailedBusShelter } from './street-furniture-detail.js?v=6';
import { officeBlocks, districts } from './office-layout.js?v=12';
import { createShowcaseOffice, addShowcaseWalkways } from './office-showcase.js?v=25';
import { createChinaZunPlaza } from './china-zun-plaza.js?v=12';
import { applyCctvMaterial } from './cctv-material.js?v=12';
import { createTemple } from './temple-sample.js?v=23';
import { finishChinaZun } from './china-zun-finish.js?v=11';
import { installBlueGreenGlazing } from './blue-green-glazing.js?v=7';
import { createNaturalCloudBank } from './natural-cloud-bank.js?v=13';
import { defaultSolarTime, sampleSolarTime, solarNightBegins } from './solar-timeline.js?v=1';
import { bindSolarControl } from './solar-control.js?v=2';
import { createWeatherEffects } from './weather-effects.js?v=16';
import { createRainbow } from './rainbow.js?v=3';
import { createRoadLamp, addSignalCamera } from './street-hardware.js?v=1';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { createCityVehicle, vehicleSpecs } from './city-vehicles.js?v=7';
import { createStreetPerson } from './street-person.js?v=2';
import { createCctvFlowerGardens } from './cctv-flower-gardens.js?v=4';
import { createCctvCampus, addCctvLobby } from './cctv-campus.js?v=10';
import { createPrecinctGroundFinish } from './precinct-ground-finish.js?v=3';
import { createCinematicFinish } from './cinematic-finish.js?v=28';
import { createAutumnGroves } from './autumn-groves.js?v=33';
import { createLandmarkLandscapeBalance } from './landmark-landscape-balance.js?v=12';
import { createHutongFrontGarden } from './hutong-front-garden.js?v=2';
import { createHutongEastFlowers } from './hutong-east-flowers.js?v=1';
import { createOldBeijingCourt } from './old-beijing.js?v=40';
const stage=document.querySelector('#stage');
const precinctPreview=new URLSearchParams(location.search).get('preview')==='precinct'
  ?createPrecinctPreview(THREE):null;
// Keep the established city layout and surface noise after removing the
// discarded garden scene that used to advance this sequence at startup.
let seed=2519049565;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}const range=(a,b)=>a+(b-a)*rnd();
const scene=new THREE.Scene();
// Warm map paper and a quiet cool horizon frame the full Beijing island.
const backdropCanvas=document.createElement('canvas');
backdropCanvas.width=640;
backdropCanvas.height=512;
const backdropContext=backdropCanvas.getContext('2d');
const backdropGradient=backdropContext.createLinearGradient(55,0,230,512);
backdropGradient.addColorStop(0,'#b1bbb9');
backdropGradient.addColorStop(.55,'#d9d9ce');
backdropGradient.addColorStop(1,'#eee5d3');
backdropContext.fillStyle=backdropGradient;
backdropContext.fillRect(0,0,640,512);
function skyGlow(x,y,r,color){
  const glow=backdropContext.createRadialGradient(x,y,0,x,y,r);
  glow.addColorStop(0,color);
  glow.addColorStop(1,color.slice(0,7)+'00');
  backdropContext.fillStyle=glow;
  backdropContext.fillRect(0,0,640,512);
}
skyGlow(50,240,285,'#f8ebd363');
skyGlow(615,50,350,'#889d9a32');
const weatherCanvas=backdropCanvas.cloneNode();
const weatherContext=weatherCanvas.getContext('2d');
const studioBackdrop=new THREE.CanvasTexture(weatherCanvas);
const cloudGroundShade=createCloudGroundShade(THREE);

studioBackdrop.colorSpace=THREE.SRGBColorSpace;
scene.background=studioBackdrop;
function skyGradient(stops){
  const canvas=document.createElement('canvas');
  canvas.width=2;
  canvas.height=256;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,0,canvas.height);
  for(const [place,color] of stops)gradient.addColorStop(place,color);
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  return canvas;
}
const nightCanvas=skyGradient([[0,'#132442'],[.56,'#263e59'],[1,'#1d3046']]);
const overcastCanvas=skyGradient([[0,'#8398aa'],[.63,'#b9c6cd'],[1,'#d4d5ce']]);
const dawnCanvas=skyGradient([[0,'#798caf'],[.47,'#cfa6b3'],[.72,'#f3b4a0'],[1,'#f5d8ae']]);
const duskCanvas=skyGradient([[0,'#4c6088'],[.43,'#b27d94'],[.69,'#efa183'],[1,'#f3c995']]);
let previousSkyBlend;
function blendDaySky(softened,twilight,nightMix){
  if(previousSkyBlend?.[0]===softened&&previousSkyBlend[1]===twilight&&previousSkyBlend[2]===nightMix)return;
  previousSkyBlend=[softened,twilight,nightMix];
  weatherContext.globalAlpha=1;
  weatherContext.drawImage(backdropCanvas,0,0);
  for(const [layer,opacity] of [
    [overcastCanvas,softened*.82*(1-nightMix)],
    [nightCanvas,nightMix],
    [twilight<0?dawnCanvas:duskCanvas,Math.abs(twilight)*.80*(1-softened*.67)],
  ]){
    if(opacity===0)continue;
    weatherContext.globalAlpha=opacity;
    weatherContext.drawImage(layer,0,0,weatherCanvas.width,weatherCanvas.height);
  }
  weatherContext.globalAlpha=1;
  studioBackdrop.needsUpdate=true;
}
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:false});}catch(e){document.querySelector('#error').style.display='grid';throw e}stage.appendChild(renderer.domElement);renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;
const cinematicFinish=createCinematicFinish(THREE,renderer,{samples:4});
cinematicFinish.uniforms.uQuietContours.value=precinctPreview?1:0;
const camera=new THREE.PerspectiveCamera(28,innerWidth/innerHeight,1,220);camera.position.set(0,31,29);camera.lookAt(0,0,0);
// Cool sky fill keeps the unlit façades legible under the lower, warmer key.
const skyFill=new THREE.HemisphereLight('#edf3f8','#a9a194',1.62);
const reflectedSky=new THREE.DirectionalLight('#c5dbf3',.87);
reflectedSky.position.set(11,6,-16);
const defaultLighting=sampleSolarTime(defaultSolarTime);
const overcastLight=new THREE.Color('#fff3e2');
const sunlight=new THREE.DirectionalLight(defaultLighting.sunlightColor,defaultLighting.sunlightIntensity);
sunlight.name='Time of day sunlight';
sunlight.position.fromArray(defaultLighting.position);
sunlight.castShadow=true;
sunlight.shadow.mapSize.set(2048,2048);
renderer.shadowMap.autoUpdate=false;
Object.assign(sunlight.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:62});
sunlight.shadow.normalBias=.022;
sunlight.shadow.bias=-.0002;
sunlight.shadow.radius=1.9;
sunlight.shadow.intensity=defaultLighting.shadowIntensity;
scene.add(reflectedSky,skyFill,sunlight);
const moonlight=new THREE.DirectionalLight('#b6d0ff',0);
moonlight.position.set(8,15,-9);
scene.add(moonlight);
const sunDirection=sunlight.position.clone().normalize();
const cloudAtmosphere=createNaturalCloudBank(THREE,sunDirection);
const weatherEffects=createWeatherEffects(THREE,renderer);
const rainbow=createRainbow(THREE);
const weatherPanel=document.querySelector('#weather-panel');
const cloudAmount=document.querySelector('#cloud-amount');
const cloudValue=document.querySelector('#cloud-value');
const cloudThickness=document.querySelector('#cloud-thickness');
const windAmount=document.querySelector('#wind-amount');
const thicknessValue=document.querySelector('#thickness-value');
const windValue=document.querySelector('#wind-value');
const rainAmount=document.querySelector('#rain-amount'),rainValue=document.querySelector('#rain-value');
const snowSwitch=document.querySelector('#weather-snow');
const rainbowSwitch=document.querySelector('#weather-rainbow');
const lightningSwitch=document.querySelector('#weather-lightning');
const sunSwitch=document.querySelector('#weather-sun');
const carsSwitch=document.querySelector('#traffic-cars');
const signalsSwitch=document.querySelector('#traffic-signals');
const dayMode=document.querySelector('#day-mode');
const nightMode=document.querySelector('#night-mode');
const solarTime=document.querySelector('#solar-time');
const solarControl=bindSolarControl(solarTime);
const nightPreset=21*60;
const weatherState={cloudAmount:.32,thickness:.50,wind:.50,rain:false,rainIntensity:0,
  snow:false,rainbow:false,lightning:false,sun:true,night:false,cars:true,signals:true,
  solarMinutes:defaultSolarTime,nightMix:0};
let daytimeSun=sunSwitch.checked;
const weatherRanges=[[cloudAmount,cloudValue],[cloudThickness,thicknessValue],[windAmount,windValue],[rainAmount,rainValue]];
let weatherControlsDirty=false,shadowDirty=true;
function updateWeatherReadout(control,output){
  const value=control.value+'%';
  if(output.value===value&&control.hasAttribute('aria-valuetext'))return;
  output.value=value;
  control.setAttribute('aria-valuetext',value);
  control.style.setProperty('--range-value',value);
}
function applyWeatherControls(){
  weatherControlsDirty=false;
  const previousCloudAmount=weatherState.cloudAmount;
  const previousSun=weatherState.sun;
  const previousMinutes=weatherState.solarMinutes;
  weatherState.cloudAmount=cloudAmount.valueAsNumber/100;
  weatherState.thickness=cloudThickness.valueAsNumber/100;
  weatherState.wind=windAmount.valueAsNumber/100;
  weatherState.rainIntensity=rainAmount.valueAsNumber / 100 * 3;
  weatherState.rain=weatherState.rainIntensity>0;
  weatherState.snow=snowSwitch.checked;
  weatherState.rainbow=rainbowSwitch.checked;
  weatherState.lightning=lightningSwitch.checked;
  const solar=sampleSolarTime(solarTime.valueAsNumber);
  const {nightMix,twilight}=solar;
  weatherState.solarMinutes=solarTime.valueAsNumber;
  weatherState.nightMix=nightMix;
  weatherState.night=weatherState.solarMinutes>=solarNightBegins;
  weatherState.sun=daytimeSun&&solar.sunlightIntensity>0;
  weatherState.cars=carsSwitch.checked;
  weatherState.signals=signalsSwitch.checked;
  dayMode.checked=!weatherState.night;
  nightMode.checked=weatherState.night;
  sunSwitch.disabled=weatherState.night;
  sunSwitch.checked=daytimeSun&&!weatherState.night;
  for(const [control,output] of weatherRanges)updateWeatherReadout(control,output);
  cloudAtmosphere.setAmount(weatherState.cloudAmount);
  cloudAtmosphere.setThickness(weatherState.thickness);
  cloudAtmosphere.setWind(weatherState.wind);
  const storm=THREE.MathUtils.smoothstep(weatherState.rainIntensity,1.05,2.90);
  const overcast=THREE.MathUtils.smoothstep(weatherState.cloudAmount,.52,1)*(.54+.46*weatherState.thickness);
  const softened=Math.max(storm,overcast*.83);
  const bridgeWetness=THREE.MathUtils.smoothstep(weatherState.rainIntensity,0,2.6);
  flyover.deck.material.roughness=THREE.MathUtils.lerp(.97,.52,bridgeWetness);
  flyover.deck.material.color.copy(dryBridgeColor).multiplyScalar(1-.19*bridgeWetness);
  const mix=THREE.MathUtils.lerp;
  const diffuseWeather=softened*(1-nightMix);
  sunlight.position.fromArray(solar.position);
  sunDirection.copy(sunlight.position).normalize();
  sunlight.color.set(solar.sunlightColor).lerp(overcastLight,softened);
  sunlight.intensity=weatherState.sun?solar.sunlightIntensity*mix(1,1.69/5.18,softened):0;
  sunlight.shadow.intensity=mix(solar.shadowIntensity,.51,softened);
  cloudAtmosphere.setTimeLighting(nightMix,sunlight.intensity/defaultLighting.sunlightIntensity,sunlight.color);
  if(previousCloudAmount!==weatherState.cloudAmount||previousSun!==weatherState.sun||previousMinutes!==weatherState.solarMinutes){
    cloudGroundShade.invalidate();
  }
  if(previousSun!==weatherState.sun||previousMinutes!==weatherState.solarMinutes)shadowDirty=true;
  moonlight.intensity=solar.moonIntensity;
  const ambientFromTime=THREE.MathUtils.clamp(Math.max(nightMix,Math.abs(twilight)),0,1);
  skyFill.intensity=daytimeSun?mix(solar.skyIntensity,1.80,diffuseWeather):mix(1.58,solar.skyIntensity,ambientFromTime);
  skyFill.color.set(solar.skyColor);
  skyFill.groundColor.set(solar.groundColor);
  reflectedSky.intensity=daytimeSun?mix(solar.reflectedIntensity,.40,diffuseWeather):.20*(1-nightMix);
  cinematicFinish.uniforms.uWarmHighlights.value=daytimeSun?mix(solar.warmth,.25,softened):.25;
  cinematicFinish.uniforms.uGoldFinish.value=daytimeSun?mix(solar.gold,.14,softened):.14;
  cinematicFinish.uniforms.uAtlasLight.value=(daytimeSun?.98-.53*softened:.54)*(1-nightMix);
  cinematicFinish.uniforms.uAoStrength.value=mix(.25,.43,nightMix);
  blendDaySky(softened,twilight,nightMix);
  document.documentElement.toggleAttribute('data-scene-night',weatherState.night);
  nightRoadGlow.visible=nightMix>.01;
  poolMaterial.uniforms.uNightGlow.value=nightMix;
  for(const [material,day,night] of nightMaterialLevels){
    material.emissiveIntensity=mix(day,night,nightMix);
  }
  for(const car of cityCars)car.g.visible=weatherState.cars;
  for(const lens of signalLenses){
    lens.green.color.set(weatherState.signals?'#50926d':'#354543');
    lens.red.color.set(weatherState.signals?'#ac4439':'#493b39');
    lens.amber.color.set(weatherState.signals?'#d4a251':'#49463c');
  }
  paintTrafficSignals(getTrafficSignalStage(time));
}
function resetWeatherControls(){
  for(const [control] of weatherRanges)control.value=control.defaultValue;
  for(const control of [snowSwitch,rainbowSwitch,lightningSwitch,carsSwitch,signalsSwitch,nightMode,dayMode]){
    control.checked=control.defaultChecked;
  }
  daytimeSun=sunSwitch.defaultChecked;
  solarControl.sync(defaultSolarTime);
  weatherEffects.reset();
  applyWeatherControls();
}
document.addEventListener('input',event=>{
  if(!event.target.closest('.control-card'))return;
  if(event.target===dayMode||event.target===nightMode)return;
  if(event.target===sunSwitch)daytimeSun=sunSwitch.checked;
  const range=weatherRanges.find(([control])=>control===event.target);
  if(range)updateWeatherReadout(...range);
  weatherControlsDirty=true;
});
for(const [preset,minutes] of [[dayMode,defaultSolarTime],[nightMode,nightPreset]]){
  const selectPreset=()=>{
    if(solarTime.valueAsNumber===minutes)return;
    solarControl.sync(minutes);
    weatherControlsDirty=true;
  };
  preset.addEventListener('click',selectPreset);
  preset.addEventListener('input',selectPreset);
}
const updateCloudMass=cloudAtmosphere.update;
cloudAtmosphere.update=(time,viewCamera)=>{
  updateCloudMass(time,viewCamera);
  const activeClouds=cloudAtmosphere.getActiveClouds();
  cloudGroundShade.update(time,activeClouds,sunDirection,weatherState.sun,weatherState.thickness);
  const {flash,flashPosition}=weatherEffects.update(time,weatherState,activeClouds);
  rainbow.update(time,weatherState);
  cloudAtmosphere.setFlash(flashPosition.x,flashPosition.y,flashPosition.z,flash);
};
cloudAtmosphere.group.userData.lightShafts=0;
cinematicFinish.setAtmosphere(cloudAtmosphere);scene.userData.cloudAtmosphere=cloudAtmosphere.group.userData;
function smooth(a,b,t){t=Math.max(0,Math.min(1,(t-a)/(b-a)));return t*t*(3-2*t)}
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(64,64,5,64,64,63);sg.addColorStop(0,'rgba(49,66,27,.42)');sg.addColorStop(.45,'rgba(49,66,27,.22)');sg.addColorStop(1,'rgba(49,66,27,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);const shadowTex=new THREE.CanvasTexture(shadowCanvas);const shadowMat=new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,opacity:.7,side:THREE.DoubleSide});
function tree(x,z,size,pink=false){for(let i=0;i<68;i++)rnd();const g=createDetailedTree(THREE,x,z,size,pink);g.position.y=.072;scene.add(g);return g}
function solid(parent,geo,mat,x,y,z){let m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
// The city remains on its original surface; the continuous cutaway starts below it.
scene.add(createSoilPlinth(THREE,{width:22,depth:17,top:-.052,bottom:-.90}));
scene.add(createFloatingBedrock(THREE,22,17));
scene.add(weatherEffects.group,rainbow.group);

// Watercolour pigment, crayon grain and broken edges, in a restrained city palette.
function paperTexture(base, edge=false){
 const c=document.createElement('canvas');c.width=512;c.height=512;const q=c.getContext('2d');q.fillStyle=base;q.fillRect(0,0,512,512);
 for(let i=0;i<75;i++){let x=rnd()*512,y=rnd()*512,r=range(30,105);const gr=q.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,i%2?'rgba(255,249,224,.17)':'rgba(131,145,103,.09)');gr.addColorStop(1,'rgba(255,255,255,0)');q.fillStyle=gr;q.fillRect(x-r,y-r,r*2,r*2)}
 for(let i=0;i<34000;i++){let x=rnd()*512,y=rnd()*512;q.strokeStyle=i%3?'rgba(255,251,230,.20)':'rgba(100,113,76,.14)';q.lineWidth=range(.35,1.25);q.beginPath();q.moveTo(x,y);q.lineTo(x+range(-1,3),y+range(1,9));q.stroke()}
 if(edge){const img=q.getImageData(0,0,512,512);for(let y=0;y<512;y++)for(let x=0;x<512;x++){const border=Math.min(x,511-x,y,511-y),noise=6+5*Math.sin(x*.08)+4*Math.sin(y*.11);let fade=smooth(noise-6,noise+10,border);if(rnd()>fade)img.data[(y*512+x)*4+3]=0}q.putImageData(img,0,0)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
const cityTexture=paperTexture('#f0e3c8',true);
// Reference: a clean, pale base rather than the earlier watercolour paper edge.
{const c=cityTexture.image.getContext('2d');c.fillStyle='#c3bbb2';c.fillRect(0,0,512,512);cityTexture.needsUpdate=true;}
const cityMat=new THREE.MeshStandardMaterial({map:cityTexture,color:'#ffffff',transparent:true,alphaTest:.18,roughness:1,side:THREE.DoubleSide});
function roadWashTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const q=c.getContext('2d');q.fillStyle='#f7f5eb';q.fillRect(0,0,512,512);
 for(let i=0;i<80;i++){const x=rnd()*512,y=rnd()*512,r=range(6,25),g=q.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%2?'rgba(255,255,246,.10)':'rgba(114,133,123,.06)');g.addColorStop(1,'rgba(255,255,255,0)');q.fillStyle=g;q.fillRect(x-r,y-r,r*2,r*2)}
 for(let i=0;i<14000;i++){const x=rnd()*512,y=rnd()*512;q.strokeStyle=i%2?'rgba(255,255,246,.10)':'rgba(110,127,119,.06)';q.lineWidth=range(.35,1);q.beginPath();q.moveTo(x,y);q.lineTo(x+range(-1,1),y+range(1,5));q.stroke()}
 // Fine, almost uniform asphalt grain, replacing broad crayon streaks.
 let asphaltSeed=9127;for(let i=0;i<7000;i++){asphaltSeed=(asphaltSeed*1664525+1013904223)>>>0;const x=(asphaltSeed>>>16)%512;asphaltSeed=(asphaltSeed*1664525+1013904223)>>>0;const y=(asphaltSeed>>>16)%512;q.fillStyle=i%2?'rgba(255,255,255,.04)':'rgba(80,80,80,.025)';q.fillRect(x,y,1,1)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
const street=new THREE.MeshStandardMaterial({color:'#626979',map:roadWashTexture(),roughness:1});
const lane=new THREE.MeshStandardMaterial({color:'#ebe9df',roughness:.92});
addSurfaceFinish(lane,'paint');
const plazaMat=new THREE.MeshStandardMaterial({color:'#c8c1b4',roughness:1});
const groundSurface=solid(scene,new THREE.BoxGeometry(22,.088,17),cityMat,0,-.006,0);
const blocks=[[-8,-5.4,5,5],[-3.5,-5.4,3,5],[3.8,-5.4,5.4,5],[8.8,-5.4,3.1,5],[-8,3.6,4.82,6.2],[-3.5,3.6,3,6.2],[3.95,3.6,4.7,6.2],[8.8,3.6,3.1,6.2]];
const parcelColors=['#c9c2b3','#d1c6b4','#c6c0b2','#c9c2b3','#d1c6b4','#c9c2b3','#d1c6b4','#c6c0b2'];
for(let i=0;i<blocks.length;i++){const [x,z,w,d]=blocks[i],map=paperTexture(parcelColors[i],true);{const c=map.image.getContext('2d');c.save();c.globalCompositeOperation='destination-over';c.fillStyle=parcelColors[i];c.fillRect(0,0,512,512);c.restore();map.needsUpdate=true;}const material=new THREE.MeshStandardMaterial({map,transparent:true,alphaTest:.18,roughness:1,side:THREE.DoubleSide});const m=solid(scene,new THREE.PlaneGeometry(w,d),material,x,.066,z);m.rotation.x=-Math.PI/2;m.castShadow=false;m.receiveShadow=true}
// Crossing boulevard and smaller side streets, with actual raised geometric lane marks.
// One continuous road surface combines both streets with the rounded returns.
// All vertices share a height and a world-space texture, avoiding square seams.
function cityRoadSurface(){
 const vertices=[],uv=[],indices=[];function vertex(x,z){vertices.push(x,.041,z);uv.push((x+10.75)/21.5,(z+8.25)/16.5);return vertices.length/3-1}
 function rect(x0,z0,x1,z1){const a=vertex(x0,z0),b=vertex(x1,z0),c=vertex(x1,z1),d=vertex(x0,z1);indices.push(a,b,c,a,c,d)}
 rect(-1.05,-8.5,1.05,-1.825);rect(-11,-1.825,11,-.475);rect(-1.05,-.475,1.05,8.5);
 for(const sx of [-1,1])for(const sz of [-1,1]){const r=.72,cx=sx*(1.05+r),cz=-1.15+sz*(.675+r),origin=vertex(sx*1.05,-1.15+sz*.675);let prev=null;for(let i=0;i<=32;i++){const t=Math.PI+i*Math.PI/64,at=vertex(cx+sx*r*Math.cos(t),cz+sz*r*Math.sin(t));if(prev!==null){if(sx*sz>0)indices.push(origin,at,prev);else indices.push(origin,prev,at);};prev=at}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];geo.setIndex(indices);geo.computeVertexNormals();const mat=street.clone();mat.side=THREE.DoubleSide;addSurfaceFinish(mat,'asphalt');precinctPreview?.road(mat);softenMapEdge(mat);const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;scene.add(mesh);weatherEffects.addWetRoad(mesh);
}
cityRoadSurface();
const flyover=createStreetFlyover(THREE,street);
scene.add(flyover.group);
const dryBridgeColor=flyover.deck.material.color.clone();
// Paved sidewalks and curbs run on both sides, with space for the crossings.
const walkMat=new THREE.MeshStandardMaterial({color:'#c7bca7',roughness:.93});
const axialWalkMat=walkMat.clone();
detailSidewalk(walkMat);
detailSidewalk(axialWalkMat,'z');
const curbMat=new THREE.MeshStandardMaterial({color:'#d7cbb2',roughness:1});
// Roads and paving now end cleanly at the edge, as in the supplied video.
function softenMapEdge(mat){}
addSurfaceFinish(curbMat,'curb');
softenMapEdge(street);softenMapEdge(walkMat);softenMapEdge(curbMat);
// Sidewalk is interrupted where local streets meet the boulevard.
for(const [z,parts] of [[-2.015,[[-11,-1.77],[1.77,11]]],[-.285,[[-11,-5.77],[-4.95,-1.77],[1.77,6.24],[7.06,11]]]])for(const [a,b] of parts){const length=b-a,x=(a+b)/2;solid(scene,new THREE.BoxGeometry(length,.035,.38),walkMat,x,.055,z);solid(scene,new THREE.BoxGeometry(length,.045,.035),curbMat,x,.064,z+(z< -1.15?.19:-.19))}
for(const x of [-1.24,1.24])for(const [z,len] of [[-5.5225,5.955],[4.3725,8.255]]){solid(scene,new THREE.BoxGeometry(.38,.035,len),axialWalkMat,x,.055,z);solid(scene,new THREE.BoxGeometry(.035,.045,len),curbMat,x+(x<0?.19:-.19),.064,z)}
// A curb uses the same height and rectangular profile through straights and bends.
function curbCurve(points,y=.064,width=.035,height=.045){
 // One continuous strip rather than overlapping little rectangular segments.
 const vertices=[],indices=[];
 // Keep the top and side normals separate so a smooth bend does not soften the curb profile.
 for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l*width/2,nz=dx/l*width/2;const lx=p.x+nx,lz=p.z+nz,rx=p.x-nx,rz=p.z-nz,center=p.y,top=center+height/2,bottom=center-height/2;vertices.push(lx,top,lz,rx,top,rz,lx,top,lz,lx,bottom,lz,rx,top,rz,rx,bottom,rz)}
 for(let i=0;i<points.length-1;i++){const a=i*6,b=a+6;indices.push(a,b,a+1,a+1,b,b+1,a+3,a+2,b+3,b+3,a+2,b+2,a+4,a+5,b+4,b+4,a+5,b+5)}
 indices.push(0,1,3,1,5,3);const n=(points.length-1)*6;indices.push(n,n+3,n+1,n+1,n+3,n+5);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const m=new THREE.Mesh(geo,curbMat);m.receiveShadow=true;scene.add(m);
}
// Lower the curb only at the two crosswalk landings, tapering to the
// surrounding flat pavement on the same triangulated surface.
function cornerDrop(angle) {
 const crossingA=Math.asin(.315/.72),crossingB=Math.acos(.23/.72);
 const fromCrossing=Math.min(Math.abs(angle-crossingA),Math.abs(angle-crossingB));
 return .027*(1-THREE.MathUtils.smoothstep(fromCrossing,.13,.24));
}
function cornerGrade(radius,angle){
 return .0725-cornerDrop(angle)*THREE.MathUtils.smoothstep(radius,.56,.72);
}
function roundedIntersectionCorner(sx,sz){
 const cx=sx*1.77,cz=-1.15+sz*1.395,steps=64,rings=[.54,.58,.62,.66,.70,.72];
 const verts=[cx,.0725,cz],tri=[],points=[];
 const flip=sx*sz>0;
 const face=(a,b,c)=>{if(flip)tri.push(a,c,b);else tri.push(a,b,c);};
 for(let ring=0;ring<rings.length;ring++){
  const radius=rings[ring];
  for(let i=0;i<=steps;i++){
   const a=i*Math.PI/(2*steps),x=cx-sx*radius*Math.cos(a),z=cz-sz*radius*Math.sin(a);
   verts.push(x,cornerGrade(radius,a),z);
   if(ring===rings.length-1)points.push(new THREE.Vector3(x,.064-cornerDrop(a)*1.30,z));
   if(i===0)continue;
   const b=1+ring*(steps+1)+i;
   if(ring===0)face(0,b-1,b);
   else{
    const a=b-(steps+1);
    face(a-1,b-1,b);face(a-1,b,a);
   }
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geo.setIndex(tri);geo.computeVertexNormals();
 const corner=new THREE.Mesh(geo,walkMat);
 corner.name=`intersection-landing-${sx}-${sz}`;
 corner.receiveShadow=true;scene.add(corner);curbCurve(points);
}
for(const sx of [-1,1])for(const sz of [-1,1])roundedIntersectionCorner(sx,sz);
scene.add(createPedestrianDetails(THREE,walkMat));
const pavementJoint=new THREE.LineBasicMaterial({color:'#a9a18e',transparent:true,opacity:.38});
const joints=[];for(const z of [-2.02,-.28])for(let x=-10.35;x<10.5;x+=.48)if(Math.abs(x)>4.4)joints.push(new THREE.Vector3(x,.075,z-.16),new THREE.Vector3(x,.075,z+.16));
for(const x of [-1.24,1.24])for(let z=-7.8;z<8;z+=.48)if(Math.abs(z+1.15)>1.4)joints.push(new THREE.Vector3(x-.16,.075,z),new THREE.Vector3(x+.16,.075,z));scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(joints),pavementJoint));
for(const z of [-8.27,-7.88,5.85,6.60,7.35,8.10])solid(scene,new THREE.BoxGeometry(.04,.015,.28),lane,0,.047,z);
for(let x=-10.9;x<11;x+=.8)if(Math.abs(x)-.19>1.84)solid(scene,new THREE.BoxGeometry(.38,.015,.045),lane,x,.05,-1.15);
scene.add(createStreetMarkingDetails(THREE,{flyover:true}));
// Narrow tactile guidance is integrated into the straight sidewalk approaches,
// terminating at the lowered corner instead of floating as isolated blocks.
const tactileBase=new THREE.MeshStandardMaterial({color:'#d3c59e',roughness:1});
const tactileRib=new THREE.MeshStandardMaterial({color:'#beb18c',roughness:1});
function tactileApproach(x,z,vertical){
 const base=solid(scene,new THREE.BoxGeometry(vertical?.12:.50,.001,vertical?.50:.12),tactileBase,x,.0731,z);base.castShadow=false;
 for(let i=-1;i<=1;i++){const rib=solid(scene,new THREE.BoxGeometry(vertical?.009:.47,.001,vertical?.47:.009),tactileRib,x+(vertical?i*.032:0),.074,z+(vertical?0:i*.032));rib.castShadow=false;}
}
function tactileTurn(sx,sz){
 const radius=.60,cx=sx*1.77,cz=-1.15+sz*1.395,steps=48;
 // Same .12 width and .0736 top as each straight guide-tile approach.
 function strip(centerRadius,width,y,material,name){
  const vertices=[],indices=[];
  for(let i=0;i<=steps;i++){
   const t=Math.PI+i*Math.PI/(2*steps);
   for(const rad of [centerRadius-width/2,centerRadius+width/2])vertices.push(cx+sx*rad*Math.cos(t),cornerGrade(rad,t-Math.PI)+(y-.0725),cz+sz*rad*Math.sin(t));
   if(i<steps){const k=i*2;if(sx*sz>0)indices.push(k,k+2,k+1,k+1,k+2,k+3);else indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,material);m.name=name;m.receiveShadow=true;m.castShadow=false;scene.add(m);
 }
 strip(radius,.12,.0736,tactileBase,`level-tactile-turn-${sx}-${sz}`);
 // Three continuous concentric ribs meet the three straight raised ribs.
 for(const offset of [-.032,0,.032])strip(radius+offset,.009,.0745,tactileRib,'continuous-tactile-rib');
}
for(const sx of [-1,1])for(const sz of [-1,1]){
 tactileApproach(sx*1.17,sz<0?-2.795:.495,true);
 tactileTurn(sx,sz);
 tactileApproach(sx*2.02,sz<0?-1.945:-.355,false);
}
// Crosswalks connect the footpaths underneath the bridge and across the surface road.
for(const z of [-2.23,-.07]){
 for(let x=-.88;x<.9;x+=.29)solid(scene,new THREE.BoxGeometry(.14,.008,.39),lane,x,.052,z);
}
for(const x of [-1.54,1.54]){
 for(let z=-1.73;z<-.55;z+=.25)solid(scene,new THREE.BoxGeometry(.38,.008,.12),lane,x,.052,z);
 solid(scene,new THREE.BoxGeometry(.045,.008,1.20),lane,x+(x<0?-.27:.27),.052,-1.15);
}
function tower(x,z,w,d,h,mat=0){let g=new THREE.Group();scene.add(g);g.position.set(x,.07,z);solid(g,new THREE.BoxGeometry(w,h,d),blockMats[mat%blockMats.length],0,h/2,0);solid(g,new THREE.BoxGeometry(w+.1,.08,d+.1),pavement,0,.04,0);const linepts=[];for(let y=.3;y<h-.1;y+=.28){linepts.push(new THREE.Vector3(-w/2,y,d/2+.006),new THREE.Vector3(w/2,y,d/2+.006));linepts.push(new THREE.Vector3(w/2+.006,y,-d/2),new THREE.Vector3(w/2+.006,y,d/2))}for(let x=-w/2+.2;x<w/2;x+=.25)linepts.push(new THREE.Vector3(x,.1,d/2+.008),new THREE.Vector3(x,h-.1,d/2+.008));g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linepts),glassLine));return g}
// Mixed-height urban skyline, kept subordinate to the three landmarks.
// Evenly spaced blocks keep every building footprint within its precinct.
// Mixed office and residential buildings with setbacks and irregular courtyard spacing.
// x, z, footprint width, depth, height, model, small rotation.
const urbanBlocks=[
 [-9.35,-6.90,1.20,.80,2.05,'building-n',0],[-7.65,-7.20,.86,.78,3.10,'building-skyscraper-b',.08],[-6.25,-7.00,.82,.70,1.32,'building-e',0],
 [-9.15,-5.25,1.08,.82,1.85,'building-j',0],[-7.45,-5.55,1.05,.78,2.4,'building-skyscraper-c',-.08],[-6.18,-5.24,.78,.68,1.05,'building-d',0],
 [-9.32,-3.82,1.05,.78,1.5,'building-l',0],[-7.8,-3.8,.88,.72,1.32,'building-i',.07],[-6.30,-3.72,.84,.68,1.68,'building-j',0],
 [-2.65,-7.05,.72,.70,1.65,'building-skyscraper-e',0],
 [7.85,-7.08,.94,.78,2.45,'building-skyscraper-a',0],[9.30,-7.0,1.0,.82,2.85,'building-skyscraper-c',-.06],
 [7.8,-5.23,.82,.72,1.25,'building-i',0],[9.32,-5.15,1.04,.84,1.9,'building-n',0],[8.25,-3.65,1.30,.75,1.13,'building-k',0],
 [-9.55,1.58,1.05,.82,1.45,'building-j',0],[-7.55,1.18,1.15,.76,2.1,'building-n',.06],[-6.30,2.15,.74,.70,1.12,'building-d',0],
 [-9.25,4.05,1.15,.78,2.15,'building-l',0],[-7.68,3.75,.86,.72,1.34,'building-j',0],[-6.25,4.17,1.0,.78,2.5,'building-skyscraper-a',0],
 [-9.3,6.47,.93,.78,1.4,'building-i',0],[-7.75,5.83,1.20,.75,1.12,'building-k',0],[-6.32,6.20,.72,.70,1.7,'building-l',-.08],
 [-4.34,1.38,.85,.72,1.6,'building-j',0],[-2.65,1.92,.75,.72,2.05,'building-skyscraper-e',0],[-4.25,4.12,.92,.70,1.12,'building-k',0],[-2.62,3.72,.76,.72,1.5,'building-i',0],[-4.18,6.43,.85,.74,1.85,'building-n',0],[-2.60,5.90,.72,.7,1.18,'building-d',0],
 [7.8,1.45,.88,.76,1.3,'building-l',0],[9.34,1.70,.92,.78,1.85,'building-j',0],[7.9,3.75,.90,.78,2.15,'building-skyscraper-a',0],[9.38,4.10,.80,.70,1.1,'building-d',0],[7.82,6.05,.94,.72,1.48,'building-n',0],[9.35,6.10,.94,.78,1.75,'building-j',0]
];
const loader=new GLTFLoader();
const choices=['building-l','building-skyscraper-a','building-i','building-skyscraper-c','building-j','building-n','building-skyscraper-e','building-f','building-k'];
// Bespoke neighbourhood buildings, based on Beijing housing blocks and CBD facades.
// Grouped repeated geometry makes real window recesses, balconies and roof plant
// readable close-up while keeping draw calls practical for an interactive map.
const cityFacadeMats={
  wall:['#e8c9ad','#e6d6b9','#d6a694','#d7d0b6'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.9})),
  frame:new THREE.MeshStandardMaterial({color:'#eee7d7',roughness:.88}),
  glass:new THREE.MeshStandardMaterial({color:'#acc9c8',roughness:.45,metalness:.12}),
  office:new THREE.MeshStandardMaterial({color:'#94b7bd',roughness:.48,metalness:.12}),
  officeBlue:new THREE.MeshStandardMaterial({color:'#779ca5',roughness:.46,metalness:.12}),
  brick:new THREE.MeshStandardMaterial({color:'#cb9b89',roughness:.9}),
  dark:new THREE.MeshStandardMaterial({color:'#68797a',roughness:.8}),
  roof:new THREE.MeshStandardMaterial({color:'#b4b6a9',roughness:.95}),
  canopy:new THREE.MeshStandardMaterial({color:'#c9b99d',roughness:.95}),
  foliage:new THREE.MeshStandardMaterial({color:'#819b68',roughness:1})
};
// A light paper-fibre wash softens the 3D facade without flattening it into an illustration.
function facadeWash(){
 const c=document.createElement('canvas');c.width=c.height=512;const q=c.getContext('2d');q.fillStyle='#fffdf6';q.fillRect(0,0,512,512);
 for(let i=0;i<55;i++){const x=rnd()*512,y=rnd()*512,r=range(15,48),g=q.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%2?'rgba(228,201,164,.07)':'rgba(255,255,255,.16)');g.addColorStop(1,'rgba(255,255,255,0)');q.fillStyle=g;q.fillRect(x-r,y-r,r*2,r*2)}
 for(let i=0;i<9500;i++){let x=rnd()*512,y=rnd()*512;q.strokeStyle=i%2?'rgba(143,119,91,.04)':'rgba(255,255,255,.18)';q.lineWidth=range(.4,1.2);q.beginPath();q.moveTo(x,y);q.lineTo(x+range(-1.5,1.5),y+range(1,6));q.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
const facadePaper=facadeWash();
// Subtle pigment on the tiled roofs connects the landmark to the paper ground.
for(const m of [...cityFacadeMats.wall,cityFacadeMats.frame,cityFacadeMats.roof,cityFacadeMats.canopy,cityFacadeMats.brick,cityFacadeMats.office,cityFacadeMats.officeBlue])m.map=facadePaper;
const unitBox=new THREE.BoxGeometry(1,1,1);
function instanceParts(group,material,parts){if(!parts.length)return;const mesh=new THREE.InstancedMesh(unitBox,material,parts.length),dummy=new THREE.Object3D();for(let i=0;i<parts.length;i++){const [x,y,z,w,h,d]=parts[i];dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)}mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh)}
function neighbourhoodBuilding(x,z,w,d,h,isOffice,index,angle){
 const g=new THREE.Group();g.position.set(x,.073,z);g.rotation.y=angle;scene.add(g);
 // Reserve room for balconies even when the footprint is rotated.
 w*=.88;d*=.84;const f=cityFacadeMats,kind=isOffice?index%3:index%4;
 // Low, broader apartment blocks break up the taller office silhouettes.
 if(!isOffice&&kind===2){h*=.72;w*=1.10;}
 if(!isOffice&&kind===3){h*=.84;}
 const floors=Math.max(4,Math.round(h/(isOffice?.22:.20)));const floorH=(h-.20)/floors;
 const wall=kind===2&&!isOffice?f.brick:f.wall[index%f.wall.length];
 const officeWall=kind===1?f.officeBlue:f.office;
 if(isOffice&&kind===0){solid(g,new THREE.BoxGeometry(w,h*.72,d),officeWall,0,h*.36,0);solid(g,new THREE.BoxGeometry(w*.82,h*.28-.10,d*.82),officeWall,0,h*.72+(h*.28-.10)/2,0);}
 else solid(g,new THREE.BoxGeometry(w,h-.10,d),isOffice?officeWall:wall,0,(h-.10)/2,0);
 // Distinct massing within the reserved building footprint: a stepped office crown,
 // a narrow residential stairwell, and a low street-facing commercial podium.
 if(isOffice&&kind===0){solid(g,new THREE.BoxGeometry(w*.74,.25,d*.76),officeWall,0,h+.025,0);solid(g,new THREE.BoxGeometry(w*.77,.025,d*.79),f.frame,0,h+.16,0);}
 if(isOffice&&kind===1){solid(g,new THREE.BoxGeometry(w*.085,h*.88,.025),f.frame,-w*.31,h*.46,d/2+.012);solid(g,new THREE.BoxGeometry(w*.055,h*.88,.025),f.frame,w*.30,h*.46,d/2+.012);}
 if(!isOffice&&kind===2){solid(g,new THREE.BoxGeometry(w*.19,h*.88,.035),f.frame,w*.30,h*.45,d/2+.012);}
 if(!isOffice&&kind===3){solid(g,new THREE.BoxGeometry(w*.35,.20,.06),f.canopy,-w*.24,.10,d/2+.025);}
 if(!isOffice&&index%4===0){solid(g,new THREE.BoxGeometry(w*.23,h*.72,d+.035),wall,-w*.33,h*.36,0);}
 if(!isOffice&&index%4===1){solid(g,new THREE.BoxGeometry(w*.18,h*.82,d+.035),f.frame,w*.34,h*.41,0);}
 if(isOffice&&index%2===0){solid(g,new THREE.BoxGeometry(w+.08,.25,d+.08),wall,0,.13,0);}
 if(!isOffice&&index%5===2){solid(g,new THREE.BoxGeometry(w*.32,h*.72,.08),wall,-w*.29,h*.36,-d*.50);}
 if(!isOffice&&index%5===3){solid(g,new THREE.BoxGeometry(w*.20,h*.9,.045),f.frame,w*.29,h*.45,-d*.50);}
 const roofW=isOffice&&kind===0?w*.82:w,roofD=isOffice&&kind===0?d*.82:d;
 solid(g,new THREE.BoxGeometry(roofW+.025,isOffice?.045:.065,roofD+.025),isOffice?f.roof:f.frame,0,h-.035,0);
 if(!isOffice&&kind!==2)solid(g,new THREE.BoxGeometry(w*.72,.035,d*.58),f.roof,0,h+.025,0);
 // Roof parapets, lift bulkhead and rooftop mechanical housings.
 const roofParts=kind===0&&isOffice?[]:[[0,h+.04,-d*.48,w,.045,.018],[0,h+.04,d*.48,w,.045,.018],[-w*.48,h+.04,0,.018,.045,d],[w*.48,h+.04,0,.018,.045,d]];
 if(kind===1||kind===3)roofParts.push([-w*.25,h+.07,-d*.12,w*.17,.09,d*.18]);
 instanceParts(g,f.roof,roofParts);
 const glassParts=[],trimParts=[],balconyParts=[],darkParts=[],railParts=[],equipmentParts=[];
 const bays=Math.max(3,Math.round(w/(isOffice?(kind===2?.15:.22):(kind===2?.18:.25)))),sideBays=Math.max(2,Math.round(d/.25));
 for(let floor=0;floor<floors;floor++){
   const y=.16+(floor+.48)*floorH,wh=floorH*.62;
   const inset=isOffice&&kind===0&&y>h*.72?.82:1,fw=w*inset,fd=d*inset;
   for(const side of [-1,1]){
     for(let col=0;col<bays;col++){
       const xx=-fw*.46+(col+.5)*fw*.92/bays,ww=fw*(isOffice?(kind===2?.85:.70):(kind===2?.56:.57))/bays;
       glassParts.push([xx,y,side*(fd/2+.004),ww,wh,.012]);
       if(!isOffice&&floor>0&&(col+floor+index)%5===0)equipmentParts.push([xx+ww*.34,y-wh*.45,side*(d/2+.035),ww*.24,.035,.05]);
       if(!isOffice&&floor>0&&(kind===2?col%2===0:(col+index)%3!==0)){
         balconyParts.push([xx,y-wh*.48,side*(d/2+.045),ww*1.18,.022,.09]);
         trimParts.push([xx,y-wh*.18,side*(d/2+.087),ww*1.15,.035,.012]);
         for(const q of [-.40,0,.40])railParts.push([xx+q*ww,y-wh*.24,side*(d/2+.088),.008,wh*.38,.008]);
       }
     }
     for(let col=0;col<sideBays;col++){
       const zz=-fd*.46+(col+.5)*fd*.92/sideBays,ww=fd*.67/sideBays;
       glassParts.push([side*(fw/2+.004),y,zz,.012,wh,ww]);
     }
   }
   if(isOffice&&kind!==1){
     trimParts.push([0,y+floorH*.46,fd/2+.012,fw,.012,.02],[0,y+floorH*.46,-fd/2-.012,fw,.012,.02]);
   }
   if(!isOffice&&kind===1&&floor%2===0){trimParts.push([0,y+floorH*.47,d/2+.014,w,.018,.025],[0,y+floorH*.47,-d/2-.014,w,.018,.025]);}
 }
 if(isOffice&&kind===2){for(let n=0;n<=bays;n++){const xx=-w*.5+n*w/bays;trimParts.push([xx,h*.48,d/2+.013,.018,h*.94,.02],[xx,h*.48,-d/2-.013,.018,h*.94,.02])}}
 if(!isOffice){for(let n=0;n<Math.max(1,Math.floor(bays/2));n++){const xx=-w*.32+n*w*.55/Math.max(1,Math.floor(bays/2)-1);darkParts.push([xx,.12,d/2+.015,w*.20,.19,.02])}}
 instanceParts(g,f.glass,glassParts);instanceParts(g,f.frame,trimParts);instanceParts(g,f.frame,balconyParts);instanceParts(g,f.dark,darkParts);instanceParts(g,f.dark,railParts);instanceParts(g,f.roof,equipmentParts);
 // Clearly modelled ground-floor access and a small entrance canopy.
 solid(g,new THREE.BoxGeometry(w*.24,.18,.015),f.dark,0,.10,d/2+.012);
 solid(g,new THREE.BoxGeometry(w*.33,.025,.11),f.canopy,0,.205,d/2+.055);
}
let officeConstruction;
const buildButton=document.querySelector('#build-office');
const cityConstruction=createCityConstruction(THREE,scene,{
  setRoofBuilding:weatherEffects.setRoofBuilding,
});
for(const spec of officeBlocks){
  const building=spec.showcase?createShowcaseOffice(THREE,spec):createOfficeBuilding(THREE,spec);
  if(precinctPreview&&spec.district==='south-east')precinctPreview.office(building);
  building.position.set(spec.x,.073,spec.z);
  scene.add(building);
  weatherEffects.addSnowSurfaces(building);
  if(spec.showcase&&spec.design===5){
    officeConstruction=createOfficeConstruction(THREE,{
      building,spec,
      onStart:()=>{},onFinish:()=>{},
    });
    scene.add(officeConstruction.group);
    cityConstruction.register(building,{type:'office',delay:1.02,seconds:8.0,structure:officeConstruction});
  }else{
    const parcel=spec.z<0?(spec.x<0?0:1):(spec.x<0?2:3);
    const spread=(spec.z<0?(-spec.z-2.85):spec.z-.7)*.32;
    const variation=Math.abs(Math.sin(spec.x*13.4+spec.z*23.7))*.34;
    cityConstruction.register(building,{type:'office',delay:[.10,.65,1.12,1.78][parcel]+spread+variation,seconds:2.6+spec.h*.96});
  }
}
addShowcaseWalkways(THREE,scene);

// Residential compounds use low metal railings; paths remain open at the street entrances.
const compoundFenceMat=new THREE.MeshStandardMaterial({color:'#9a9e8a',roughness:.86,metalness:.08});
// Small framed pedestrian gates belong to each compound, independent of the garage barriers.
const gateMetal=new THREE.MeshStandardMaterial({color:'#687b70',roughness:.75,metalness:.22});
const gateStone=new THREE.MeshStandardMaterial({color:'#d4c6aa',roughness:.94});
const compoundGates=[];
function pedestrianGate(group,x,z,side,gap){
 const leaves=[],width=gap/2-.035,base=.073;
 for(const sign of [-1,1]){
  const hx=x+sign*gap/2;
  solid(group,new THREE.BoxGeometry(.073,.35,.073),gateStone,hx,base+.175,z);
  solid(group,new THREE.BoxGeometry(.088,.022,.088),gateStone,hx,base+.36,z);
  const leaf=new THREE.Group();leaf.position.set(hx,base,z);group.add(leaf);
  const inward=-sign;
  for(const y of [.045,.25])solid(leaf,new THREE.BoxGeometry(width,.018,.018),gateMetal,inward*width/2,y,0);
  for(let i=0;i<=4;i++)solid(leaf,new THREE.BoxGeometry(.014,.205,.014),gateMetal,inward*width*i/4,.147,0);
  leaves.push({leaf,sign});
 }
 compoundGates.push({x,z,side,leaves,angle:.40});
}

function compoundFence(x0,x1,z0,z1,entranceX,entranceSide,garageSide=false){
 const g=new THREE.Group(),parts=[],height=.22,base=.073,gap=.70;
 function run(ax,az,bx,bz){const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);if(len<.05)return;const horizontal=Math.abs(dx)>Math.abs(dz);
  for(const y of [.10,.22])parts.push([(ax+bx)/2,base+y,(az+bz)/2,horizontal?len:.014,.014,horizontal?.014:len]);
  const count=Math.ceil(len/.16);for(let i=0;i<=count;i++){const t=i/count;parts.push([ax+dx*t,base+height/2,az+dz*t,.014,height,.014])}}
 run(x0,z0,x0,z1);run(x1,z0,x1,z1);
 for(const [z,side] of [[z0,'north'],[z1,'south']]){if(entranceSide.includes(side)){run(x0,z,entranceX-gap/2,z);run(entranceX+gap/2,z,x1,z);pedestrianGate(g,entranceX,z,side,gap)}else run(x0,z,x1,z)}
 instanceParts(g,compoundFenceMat,parts);scene.add(g);
}






// Load the previously reviewed standalone China Zun model into the city.
const zunReady=loader.loadAsync('./assets/landmarks/china-zun.glb?v=2').then(({scene:model})=>{
 model.scale.set(7.7/528,8.8/528,7.7/528);model.position.set(-3.8,.07,-4.8);
 for(const material of finishChinaZun(model)??[]){
   const night=material.userData.nightEmission;
   nightMaterialLevels.push([material,material.emissiveIntensity,night]);
   material.emissiveIntensity=THREE.MathUtils.lerp(material.emissiveIntensity,night,weatherState.nightMix);
 }
 scene.add(model);weatherEffects.addSnowSurfaces(model);cityConstruction.register(model,{type:'china-zun',delay:1.85,seconds:8.25});return model;
}).catch(e=>console.error('Unable to load China Zun model',e));
const cctvReady=loader.loadAsync('./assets/landmarks/cctv.glb?v=4').then(({scene:model})=>{
 model.position.set(4.08,.07,-5.48);model.name='CCTV Headquarters';model.rotation.y=-.60;model.scale.setScalar(.84);
 applyCctvMaterial(THREE,model);
 const lobbyGlass=addCctvLobby(THREE,model);
 nightMaterialLevels.push([lobbyGlass,0,lobbyGlass.userData.nightEmission]);
 lobbyGlass.emissiveIntensity=lobbyGlass.userData.nightEmission*weatherState.nightMix;
 scene.add(model);weatherEffects.addSnowSurfaces(model);cityConstruction.register(model,{type:'cctv',delay:2.85,seconds:6.05});return model;
}).catch(e=>console.error('Unable to load CCTV model',e));
Promise.allSettled([zunReady,cctvReady]).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
 installBlueGreenGlazing(THREE,renderer,scene);cloudGroundShade.apply(scene);scene.userData.glassFinishReady=true;
 shadowDirty=true;
 if(cityNavigation.active)cityNavigation.refresh();
 buildButton.disabled=false;
 const warmTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
 cityConstruction.warm(root=>{
   const previousTarget=renderer.getRenderTarget();
   try{
     renderer.setRenderTarget(warmTarget);
     return renderer.compileAsync(root,camera,scene);
   }finally{
     renderer.setRenderTarget(previousTarget);
   }
 }).catch(error=>console.debug('Deferred building preparation:',error.message))
   .finally(()=>warmTarget.dispose());
})));
const templeModel=createTemple(THREE);templeModel.position.set(3.9,.08,3.5);scene.add(templeModel);weatherEffects.addSnowSurfaces(templeModel);
const templeLight=templeModel.userData.entrance.light;
scene.attach(templeLight);
cityConstruction.register(templeModel,{type:'temple',delay:1.15,seconds:5.55,light:templeLight});
// A park around China Zun and green space around the Temple of Heaven.
const parkTexture=paperTexture('#617047',true);
// Fine low-contrast turf grain keeps the lawn green; pale paper marks must not bleach it.
{const q=parkTexture.image.getContext('2d');q.clearRect(0,0,512,512);q.fillStyle='#617047';q.fillRect(0,0,512,512);for(let k=0;k<18;k++){const x=(k*173+57)%512,y=(k*227+103)%512,r=72+(k%5)*18,g=q.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,k%3?'rgba(22,57,32,.16)':'rgba(142,153,68,.13)');g.addColorStop(1,'rgba(50,88,42,0)');q.fillStyle=g;q.fillRect(x-r,y-r,r*2,r*2);}let paintSeed=3241;const paintRnd=()=>{paintSeed=(paintSeed*1664525+1013904223)>>>0;return paintSeed/4294967296};q.save();q.globalCompositeOperation='source-atop';for(let i=0;i<22000;i++){const x=paintRnd()*512,y=paintRnd()*512;q.strokeStyle=i%3===0?'rgba(142,165,78,.11)':i%3===1?'rgba(35,67,31,.13)':'rgba(87,119,48,.10)';q.lineWidth=.4+paintRnd()*.6;q.beginPath();q.moveTo(x,y);q.lineTo(x+paintRnd()*4-2,y-2-paintRnd()*6);q.stroke()}q.restore();q.save();q.globalCompositeOperation='destination-over';q.fillStyle='#617047';q.fillRect(0,0,512,512);q.restore();parkTexture.needsUpdate=true;}
const lawnMat=new THREE.MeshStandardMaterial({map:parkTexture,color:'#d2f1be',transparent:true,alphaTest:.18,roughness:1,side:THREE.DoubleSide});
function lawn(x,z,w,d){const m=solid(scene,new THREE.PlaneGeometry(w,d),lawnMat,x,.071,z);m.userData.cityTurf=true;m.rotation.x=-Math.PI/2;m.castShadow=false;return m}
lawn(3.95,3.55,4.4,5.65);
// A planted edge softens the CCTV plaza and connects it to the surrounding city.
const cctvEastVerge=lawn(6.70,-5.12,.30,3.75);cctvEastVerge.position.y=.086;
// A continuous stone ground unifies the historic parcel with its hutongs.
// The garden strips are laid out below, after the local roads and sidewalks.
const oldQuarterGround=new THREE.Mesh(new THREE.BoxGeometry(4.55,.122,7.85),new THREE.MeshStandardMaterial({color:'#aaa69e',roughness:1,side:THREE.DoubleSide}));
oldQuarterGround.position.set(-8.10,.011,.0+4.45);oldQuarterGround.receiveShadow=true;scene.add(oldQuarterGround);
// Retain the deterministic random sequence previously consumed by four lawn textures.
for(let i=0;i<4*45108;i++)rnd();
const oldBeijingCourt=createOldBeijingCourt(THREE);
scene.add(oldBeijingCourt);
oldBeijingCourt.userData.compounds.forEach((court,index)=>{
  court.userData.isCourtyardRoof=true;
  weatherEffects.addSnowSurfaces(court);
  cityConstruction.register(court,{type:'court',delay:.35+index*.55,seconds:3.45});
});
scene.add(createHutongFrontGarden(THREE));
scene.add(createHutongEastFlowers(THREE));
// Planted strips behind the northern sidewalk, below paths and street furniture.
// Short pedestrian approaches follow the temple and tower forecourts.
const pathMat=new THREE.MeshStandardMaterial({color:'#c9c0af',roughness:1});
// Small street furniture from the same CC0 city kit.
for(const x of [-1.37,1.37])scene.add(createRoadLamp(THREE,x,5.7,x<0?1:-1,0));
for(const [x,z] of [[-1.004,-2.73],[1.004,.44]]){
  const lamp=createRoadLamp(THREE,x,z,x<0?1:-1,0);
  lamp.position.y=flyoverHeight(z)+.103;
  lamp.scale.setScalar(.79);
  lamp.userData.lampSurfaceY=flyoverHeight(z)+.009;
  scene.add(lamp);
}
// Fine pedestrian lanes connect the sidewalks to block interiors and garden paths.
const footpathMat=new THREE.MeshStandardMaterial({color:'#c1ac8d',roughness:1,side:THREE.DoubleSide});
function footpath(points,width,level=.078,material=footpathMat){const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,level,z)));const samples=curve.getPoints(48),v=[],index=[];for(let i=0;i<samples.length;i++){const p=samples[i],a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;v.push(p.x-dz/l*width/2,p.y,p.z+dx/l*width/2,p.x+dz/l*width/2,p.y,p.z-dx/l*width/2);if(i<samples.length-1){let k=i*2;index.push(k,k+2,k+1,k+1,k+2,k+3)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setIndex(index);geo.computeVertexNormals();const m=new THREE.Mesh(geo,material);m.receiveShadow=true;scene.add(m)}
// Curved pedestrian approaches merge into the existing sidewalks.
const cctvApproachMat=new THREE.MeshStandardMaterial({color:'#b2b8b7',roughness:1,side:THREE.DoubleSide});
detailSidewalk(cctvApproachMat,'z');
footpath([[3.36,-3.86],[3.49,-3.64],[3.69,-3.34],[3.8,-3.08],[3.8,-2.72],[3.8,-2.24]],.49,.090,cctvApproachMat);

footpath([[3.9,1.83],[3.9,1.4],[3.9,.72],[3.9,-.12]],.30);
// Connect the temple's southern approach and seating area to the public sidewalk.
// Southern axial walk and its transverse connection are built with stone paving below.






for(const [x,z] of [[-8.7,-2.25],[-5.0,-2.25],[4.9,-2.25],[8.75,-2.25],[-8.7,-.05],[-5,-.05],[5,-.05],[8.75,-.05]])scene.add(createRoadLamp(THREE,x,z,0,z< -1?1:-1));
// Secondary streets and courtyard paving connect residential blocks to the main boulevard.
const secondaryStreet=new THREE.MeshStandardMaterial({color:'#68717a',map:roadWashTexture(),roughness:1});
function localJunction(x){
 // A continuous branch with two circular returns makes a rounded T junction.
 const roadVertices=[],roadUV=[],roadIndices=[];function v(xx,zz){roadVertices.push(xx,.041,zz);roadUV.push((xx+10.75)/21.5,(zz+8.25)/16.5);return roadVertices.length/3-1}
 const a=v(x-.23,-.475),b=v(x+.23,-.475),c=v(x+.23,8.5),d=v(x-.23,8.5);roadIndices.push(a,b,c,a,c,d);
 for(const sx of [-1,1]){const r=.18,cx=x+sx*(.23+r),cz=-.475+r,origin=v(x+sx*.23,-.475),p=[cx,.0725,cz],idx=[],edge=[];let prev=null;for(let i=0;i<=20;i++){const t=Math.PI+i*Math.PI/40,px=cx+sx*r*Math.cos(t),pz=cz+r*Math.sin(t),n=v(px,pz);p.push(px,.0725,pz);edge.push(new THREE.Vector3(px,.064,pz));if(prev!==null)roadIndices.push(origin,prev,n);if(i)idx.push(0,i,i+1);prev=n}
 const cornerGeo=new THREE.BufferGeometry();cornerGeo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));cornerGeo.setIndex(idx);cornerGeo.computeVertexNormals();scene.add(new THREE.Mesh(cornerGeo,new THREE.MeshStandardMaterial({color:'#e2d8c3',roughness:1,side:THREE.DoubleSide})));curbCurve(edge);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(roadVertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(roadUV,2));for(let i=0;i<roadIndices.length;i+=3)[roadIndices[i+1],roadIndices[i+2]]=[roadIndices[i+2],roadIndices[i+1]];geo.setIndex(roadIndices);geo.computeVertexNormals();const material=secondaryStreet.clone();material.side=THREE.DoubleSide;addSurfaceFinish(material,'asphalt');if(x>0)precinctPreview?.road(material);softenMapEdge(material);const road=new THREE.Mesh(geo,material);road.receiveShadow=true;scene.add(road);weatherEffects.addWetRoad(road);
 for(let i=-2;i<=2;i++)solid(scene,new THREE.BoxGeometry(.055,.012,.16),lane,x+i*.08,.055,-.18);
 for(const dx of [-.29,.29]){const segments=[[-.295,8.50]];for(const [start,end] of segments){const len=end-start,center=(start+end)/2;solid(scene,new THREE.BoxGeometry(.12,.035,len),walkMat,x+dx,.055,center);solid(scene,new THREE.BoxGeometry(.035,.045,len),curbMat,x+Math.sign(dx)*.23,.064,center);}}
 for(let z=.35;z<8.4;z+=.76)solid(scene,new THREE.BoxGeometry(.025,.011,.26),lane,x,.055,z);
}
for(const x of [-5.36,6.65])localJunction(x);
// The open strips become landscaped park edges with continuous walking paths.
// The detailed green verges, tree groves and light paving reference the user's video.
const gardenStone=new THREE.MeshStandardMaterial({color:'#c9ad83',roughness:1,side:THREE.DoubleSide});
const lawnTuftPatches=[];
function foregroundGarden(x0,x1,trees,phase,amplitude){
 const x=(x0+x1)/2,w=x1-x0,z=7.59,d=1.53;
 const lawn=solid(scene,new THREE.PlaneGeometry(w,d),lawnMat,x,.074,z);lawn.userData.cityTurf=true;lawn.rotation.x=-Math.PI/2;lawn.castShadow=false;
 // Gently meandering paving connects the sidewalks at both ends of the block.
 const positions=[],indices=[],n=42;
 function mid(t){return z+amplitude*Math.sin(t*Math.PI*2+phase)*Math.sin(t*Math.PI)}
 lawnTuftPatches.push({x,z,w,d,y:.075,skip:(px,pz)=>Math.abs(pz-mid((px-x0)/w))<.18||
   (x0===1.53&&Math.abs(px-3.9)<.19&&pz<7.77)});
 for(let i=0;i<=n;i++){const t=i/n,xx=x0+w*t,zz=mid(t),width=.27+.025*Math.sin(t*Math.PI);positions.push(xx,.088,zz-width/2,xx,.088,zz+width/2);if(i<n){let k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();const path=new THREE.Mesh(geometry,gardenStone);path.receiveShadow=true;scene.add(path);
 const previousSeed=seed;
 for(let i=0;i<trees.length;i++){
  const [tx,tz,size]=trees[i];const t=tree(tx,tz,size);t.scale.y*=1.1;
 }
 seed=previousSeed;
}
foregroundGarden(-4.80,-1.56,[[-4.53,7.10,.16],[-3.67,8.08,.20],[-2.83,7.02,.16],[-2.07,8.05,.17]],.4,.09);
foregroundGarden(1.53,6.30,[[1.92,8.02,.18],[2.85,7.10,.16],[3.64,8.10,.18],[4.72,7.04,.19],[5.68,8.05,.17]],1.3,.23);
foregroundGarden(7.12,10.48,[[7.52,7.11,.19],[8.30,8.03,.16],[9.15,7.02,.18],[10.03,8.07,.16]],2.0,.15);
// The temple's south axial path continues through the park to its winding walk.
{const x=3.9,z0=6.32,z1=7.45;const link=solid(scene,new THREE.BoxGeometry(.28,.009,z1-z0),gardenStone,x,.0845,(z0+z1)/2);link.castShadow=false;}
// Pocket gardens are part of the residential precinct, not scattered decorative dots.
const autumnGroves=createAutumnGroves(THREE,{precinctPreview:!!precinctPreview});
scene.add(autumnGroves);
scene.add(createRootLitter(THREE,autumnGroves.userData.plantedTrees.filter(t=>t.region<4)));
function pocketGarden(x,z,w,d){const ground=solid(scene,new THREE.PlaneGeometry(w,d),lawnMat,x,.079,z);ground.userData.cityTurf=true;ground.rotation.x=-Math.PI/2;const pad=solid(scene,new THREE.BoxGeometry(w*.65,.012,d*.36),footpathMat,x,.089,z);const tiles=[];for(let i=-2;i<=2;i++)tiles.push(new THREE.Vector3(x+i*w*.11,.098,z-d*.18),new THREE.Vector3(x+i*w*.11,.098,z+d*.18));scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tiles),pavementJoint));}

const shelterMat=new THREE.MeshStandardMaterial({color:'#c6c5b8',roughness:.8}),shelterGlass=new THREE.MeshStandardMaterial({color:'#a3bbb6',transparent:true,opacity:.58,roughness:.5});
function busShelter(x,z,side){
 const platform=solid(scene,new THREE.BoxGeometry(.738,.030,.33),walkMat,x,.070,z+side*.063);
 platform.castShadow=false;
 scene.add(createDetailedBusShelter(THREE,x,z,side));
}
// Shared courtyards: soft planting beds, paved entries, trellises and seating.
function plantingBed(x,z,w,d){const m=solid(scene,new THREE.CircleGeometry(1,28),lawnMat,x,.076,z);m.userData.cityTurf=true;m.rotation.x=-Math.PI/2;m.scale.set(w/2,d/2,1)}

const trellisMat=new THREE.MeshStandardMaterial({color:'#b4a68f',roughness:.9});
function trellis(x,z){const g=new THREE.Group();g.position.set(x,.08,z);for(const dx of [-.24,.24])for(const dz of [-.12,.12])solid(g,new THREE.BoxGeometry(.025,.30,.025),trellisMat,dx,.15,dz);for(let i=-3;i<=3;i++)solid(g,new THREE.BoxGeometry(.028,.025,.28),trellisMat,i*.07,.31,0);solid(g,new THREE.BoxGeometry(.52,.02,.035),trellisMat,0,.30,0);scene.add(g)}

// Signal heads include individual lenses; switching is tied to the vehicle phases.
const signalBody=new THREE.MeshStandardMaterial({color:'#505b57',roughness:.8});
const signalLenses=[];
// The lower road retains a signal at each pedestrian crossing.
function trafficSignal(x,z,angle){
 const g=new THREE.Group();g.name='overhead-traffic-signal';g.position.set(x,.08,z);g.rotation.y=angle;scene.add(g);
 const poleMat=new THREE.MeshStandardMaterial({color:'#aeb6aa',roughness:.65,metalness:.18});
 solid(g,new THREE.CylinderGeometry(.026,.04,1.03,10),poleMat,0,.515,0);
 solid(g,new THREE.CylinderGeometry(.06,.07,.065,10),poleMat,0,.032,0);
 const armLength=1.86,headOffset=1.69;
 const arm=solid(g,new THREE.CylinderGeometry(.022,.027,armLength,8),poleMat,armLength/2,1.01,0);arm.rotation.z=Math.PI/2;arm.name='lane-spanning-cantilever';
 // One inbound lane per approach: hang its head over that lane, facing traffic.
 g.userData={armLength,headOffset,laneCenter:z<0?-.85:-1.45};
 addSignalCamera(THREE,g,headOffset);
 const red=new THREE.MeshStandardMaterial({color:'#ac4439',emissive:'#df392c',emissiveIntensity:.1});
 const amber=new THREE.MeshStandardMaterial({color:'#d4a251',emissive:'#db9e29',emissiveIntensity:.05});
 const green=new THREE.MeshStandardMaterial({color:'#50926d',emissive:'#43b66a',emissiveIntensity:.1});
 for(const px of [headOffset]){const head=solid(g,new THREE.BoxGeometry(.12,.25,.09),signalBody,px,.86,0);head.name='inbound-lane-signal-head';for(const [y,m] of [[.94,red],[.86,amber],[.78,green]]){const lens=new THREE.Mesh(new THREE.SphereGeometry(.026,10,7),m);lens.position.set(px,y,.051);g.add(lens);solid(g,new THREE.BoxGeometry(.068,.012,.045),signalBody,px,y+.032,.062)}}
 signalLenses.push({red,amber,green});
}
trafficSignal(-1.77,.24,Math.PI/2);
trafficSignal(1.77,-2.54,-Math.PI/2);
// Landmark surfaces are purpose-designed as paved precincts rather than blank sand.
// The geometry stays at grade; the faint joints and pigment are generated as textures.
function landmarkPaving(x,z,w,d,base,cols,rows,height=.080){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const q=canvas.getContext('2d');
 let n=9137;const random=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296};
 q.fillStyle=base;q.fillRect(0,0,1024,1024);
 for(let i=0;i<160;i++){const px=random()*1024,py=random()*1024,r=25+random()*95;const wash=q.createRadialGradient(px,py,0,px,py,r);wash.addColorStop(0,i%2?'rgba(255,250,224,.09)':'rgba(116,112,91,.045)');wash.addColorStop(1,'rgba(255,255,255,0)');q.fillStyle=wash;q.fillRect(px-r,py-r,2*r,2*r)}
 for(let i=0;i<30000;i++){const px=random()*1024,py=random()*1024;q.fillStyle=i%2?'rgba(255,250,226,.12)':'rgba(102,104,89,.055)';q.fillRect(px,py,1+random()*2,1+random()*3)}
 // Light pigment variations break up the stone without creating a checkerboard.
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=random();if(a<.48){q.fillStyle=a<.20?'rgba(255,248,229,.09)':'rgba(100,114,99,.055)';q.fillRect(col*1024/cols,row*1024/rows,1024/cols,1024/rows)}}
 q.strokeStyle='rgba(107,112,100,.20)';q.lineWidth=1.5;
 for(let i=0;i<=cols;i++){const x=i*1024/cols;q.beginPath();q.moveTo(x,0);q.lineTo(x,1024);q.stroke()}
 for(let i=0;i<=rows;i++){const y=i*1024/rows;q.beginPath();q.moveTo(0,y);q.lineTo(1024,y);q.stroke()}
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({map,roughness:1,side:THREE.DoubleSide}));m.position.set(x,height,z);m.rotation.x=-Math.PI/2;m.receiveShadow=true;scene.add(m);return m;
}
// Tian Tan: square stone courtyard around the circular terrace and a clear central approach.
function templeCourtyard(){
 const c=document.createElement('canvas');c.width=c.height=1024;const q=c.getContext('2d');let state=78021;const r=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};
 q.fillStyle='#ddd7c7';q.fillRect(0,0,1024,1024);
 // Broad translucent washes soften the stone without masking the paving.
 for(let i=0;i<70;i++){const x=r()*1024,y=r()*1024,rad=35+r()*95;const wash=q.createRadialGradient(x,y,0,x,y,rad);wash.addColorStop(0,i%2?'rgba(255,250,230,.08)':'rgba(111,119,105,.045)');wash.addColorStop(1,'rgba(255,255,255,0)');q.fillStyle=wash;q.fillRect(x-rad,y-rad,rad*2,rad*2)}
 const rows=28,cols=28,cw=1024/cols,ch=1024/rows;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const v=r();q.fillStyle=v<.30?'rgba(255,250,231,.055)':v>.73?'rgba(118,126,111,.045)':'rgba(235,225,200,.018)';q.fillRect(col*cw,row*ch,cw,ch)}
 q.strokeStyle='rgba(114,120,110,.16)';q.lineWidth=1.1;for(let i=0;i<=cols;i++){q.beginPath();q.moveTo(i*cw,0);q.lineTo(i*cw,1024);q.stroke()}for(let j=0;j<=rows;j++){q.beginPath();q.moveTo(0,j*ch);q.lineTo(1024,j*ch);q.stroke()}
 for(let i=0;i<18000;i++){const x=r()*1024,y=r()*1024;q.strokeStyle=i%2?'rgba(255,247,224,.08)':'rgba(110,118,102,.035)';q.lineWidth=.5+r();q.beginPath();q.moveTo(x,y);q.lineTo(x+(r()-.5)*5,y+(r()-.5)*8);q.stroke()}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;const m=new THREE.Mesh(new THREE.PlaneGeometry(3.75,3.8),new THREE.MeshStandardMaterial({map,roughness:1,side:THREE.DoubleSide}));m.position.set(3.9,.080,3.5);m.rotation.x=-Math.PI/2;m.receiveShadow=true;scene.add(m);
}
// Office parcels receive continuous softly grained paving, under the building footprints.
{const savedSeed=seed;const tex=paperTexture('#c5bca8',false);seed=savedSeed;const mat=new THREE.MeshStandardMaterial({map:tex,roughness:1,side:THREE.DoubleSide});for(const d of districts){const m=new THREE.Mesh(new THREE.PlaneGeometry(d.x1-d.x0,d.z1-d.z0),mat);m.rotation.x=-Math.PI/2;m.position.set((d.x0+d.x1)/2,.0718,(d.z0+d.z1)/2);m.receiveShadow=true;scene.add(m);}}
templeCourtyard();
// A straight ceremonial approach meets a transverse path leading to both sidewalks.
landmarkPaving(3.86,6.35,4.86,.20,'#ddd7c7',25,1,.082);
landmarkPaving(3.9,5.87,.38,.96,'#ddd7c7',2,5,.083);
// Open east/west steps onto the neighboring footways rather than into disconnected grass.
landmarkPaving(1.7275,3.5,.595,.27,'#c8c0b1',4,2,.084);
landmarkPaving(6.0375,3.5,.525,.24,'#ddd7c7',3,1,.082);
// China Zun: a small pedestrian forecourt sits within the existing green park.
scene.add(createChinaZunPlaza(THREE,createDetailedTree,createDetailedBench));
// CCTV: a restrained, softly colored stone plaza follows the building footprint.
const cctvPrecinctPaving=landmarkPaving(4.09,-5.475,5.18,4.85,'#b2bac0',26,24);cctvPrecinctPaving.userData.cctvPrecinct=true;
scene.add(createCctvCampus(THREE));
const cctvGardens=createCctvFlowerGardens(THREE);cctvGardens.position.set(.28,0,-.18);scene.add(cctvGardens);
scene.add(createLandmarkLandscapeBalance(THREE));
const precinctFinish=createPrecinctGroundFinish(THREE);scene.add(precinctFinish);precinctFinish.applyToExisting(scene);
// Narrow planted beds frame forecourts without obstructing paths or building entrances.
const bedSoil=new THREE.MeshStandardMaterial({color:'#53653a',roughness:1});
const bedEdge=new THREE.MeshStandardMaterial({color:'#c8c8b1',roughness:1});
function forecourtBed(x,z,w,d){
 const bed=solid(scene,new THREE.BoxGeometry(w,.018,d),bedSoil,x,.090,z);bed.castShadow=false;
 for(const dx of [-1,1])solid(scene,new THREE.BoxGeometry(.016,.022,d),bedEdge,x+dx*w/2,.094,z);
 for(const dz of [-1,1])solid(scene,new THREE.BoxGeometry(w,.022,.016),bedEdge,x,.094,z+dz*d/2);
 scene.add(createPlantedBedFoliage(THREE,[{x,z,w,d,y:.099}]));
}
forecourtBed(2.75,-2.82,.72,.18);forecourtBed(5.05,-2.82,1.05,.18);

// Thin stone curbs give the ceremonial square a legible edge, with openings on its axis.
const courtyardEdge=new THREE.MeshStandardMaterial({color:'#c8c8b7',roughness:1});
for(const z of [1.60,5.40])for(const x of [2.79,5.01])solid(scene,new THREE.BoxGeometry(1.50,.018,.025),courtyardEdge,x,.090,z);
// Break the east and west edging at the two stair exits.
for(const x of [2.035,5.765])for(const z of [2.35,4.65])solid(scene,new THREE.BoxGeometry(.025,.018,1.50),courtyardEdge,x,.090,z);
// Ground cover stays in planted areas and leaves the temple approaches clear.
lawnTuftPatches.push({x:3.95,z:3.55,w:4.38,d:5.50,y:.074,skip:(x,z)=>
 (x>1.98&&x<5.82&&z>1.55&&z<5.45)||Math.abs(x-3.9)<.25||Math.abs(z-3.5)<.17||
 (Math.abs(z-5.9)<.12&&[2.62,5.12].some(bx=>Math.abs(x-bx)<.22))});
lawnTuftPatches.push({x:-3.85,z:-4.9,w:2.37,d:3.72,y:.075,skip:(x,z)=>
 (x>-4.62&&x<-2.98&&z>-5.84&&z<-3.52)||Math.abs(x+3.8)<.24});
scene.add(createTurfTufts(THREE,lawnTuftPatches));

// Rows of street trees and irregular garden planting create distinct city districts.
for(const [x,z,size] of [
 [-10.1,-2.56,.29],[-8.1,-2.54,.31],[-5.6,-2.55,.28],[-4.4,-2.55,.28],[-2.25,-2.56,.28],[2.0,-2.55,.28],[6.95,-2.55,.29],[9.05,-2.55,.31],
 [-10.05,.27,.29],[-8.05,.25,.30],[-6.1,.27,.29],[-4.22,.26,.31],[-2.1,.25,.27],[2.05,.25,.27],[7.05,.25,.28],[9.2,.25,.30],
 [-4.75,-6.4,.34],[-3.05,-6.55,.30],[-4.85,-3.72,.30],[-2.86,-3.68,.30],
 [1.95,1.15,.29],[2.6,1.0,.28],[4.8,.8,.30],[5.9,.8,.28],[2.05,6.02,.30],[4.93,6.0,.32],[5.9,5.65,.32],
 [-8.45,1.8,.25],[-8.52,3.05,.24],[-6.85,5.0,.23],[-3.45,2.05,.23],[-3.42,5.7,.24],[8.62,2.55,.23],[8.65,5.8,.23],[-9.96,5.0,.3],[-5.88,5.7,.24],[7.08,5.75,.30],[10.0,3.05,.29],[-8.6,-6.3,.20],[-6.75,-4.55,.21],[-9.98,2.65,.22],[-7.05,5.0,.20],[-3.45,2.85,.20],[-3.45,5.4,.19],[8.7,2.7,.19],[8.75,-6.0,.20]
]){const t=tree(x,z,size);if((x>=-10.35&&x<=-5.8&&z>=.7&&z<=8.3)||(x===-4.75&&z===-6.4)||(x===-3.05&&z===-6.55)||(x===-4.85&&z===-3.72)||(x===-2.86&&z===-3.68)||officeBlocks.some(b=>Math.abs(x-b.x)<b.w/2+.24&&Math.abs(z-b.z)<b.d/2+.24)||(x===2&&z===-2.55)||(x===-2.1&&z===.25)||(x===-2.25&&z===-2.56)||(x===2.05&&z===.25)||(x===1.95&&z===1.15)||(x===2.6&&z===1.0)||(x===4.8&&z===.8)||(x===5.9&&z===.8)||(x===2.05&&z===6.02)||(x===4.93&&z===6.0)||(x===5.9&&z===5.65))scene.remove(t);}
{const priorSeed=seed;for(const z of [-6.45,-5.22,-3.90]){const t=tree(6.70,z,.20);t.scale.x*=.65;}seed=priorSeed;}
// Outer trees frame the historic courtyard while leaving the main axis and both sidewalks clear.
{const priorSeed=seed;for(const [x,z,size,height] of [[1.80,1.42,.19,1.18],[1.82,2.45,.17,1.30],[1.82,4.80,.16,1.18],[5.99,1.51,.17,1.29],[5.98,2.63,.20,1.15],[6.00,4.07,.17,1.24],[5.99,4.88,.21,1.16],[2.53,.92,.18,1.25],[5.21,.95,.21,1.14],[2.10,5.84,.18,1.23],[5.73,5.85,.21,1.16]]){const t=tree(x,z,size);t.scale.x*=.90;t.scale.z*=.90;t.scale.y*=height;}seed=priorSeed;}
function templeBench(x,z){
 const pad=solid(scene,new THREE.BoxGeometry(.422,.014,.222),gardenStone,x,.072,z);
 pad.castShadow=false;
 const bench=createDetailedBench(THREE,x,z);bench.position.y=.079;scene.add(bench);
}
busShelter(-6.8,-2.26,1);busShelter(7.8,-.03,-1);
templeBench(2.62,5.90);templeBench(5.12,5.90);
scene.add(createStreetVerges(THREE));
// Tiny walking figures bring the sidewalks to life without changing interaction controls.
const pedestrianMaterials=['#6c7f84','#b58368','#d4b987','#777d65','#e1dbca'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
const pedestrianSkin=new THREE.MeshStandardMaterial({color:'#e2bd9d',roughness:1});const cityPeople=[];
function pedestrian(x,z,axis,lo,hi,dir,i){const {group,legs}=createStreetPerson(THREE,i);group.position.set(x,.085,z);scene.add(group);cityPeople.push({group,legs,x,z,axis,lo,hi,dir,phase:i*1.7})}
for(let i=0;i<8;i++){let x=i%2?1.16:-1.16,lo=i<4?-7.4:1.35,hi=i<4?-3.65:7.3,z=lo+(hi-lo)*((i%4)+.5)/4;pedestrian(x,z,'z',lo,hi,i%2?1:-1,i)}
for(let i=0;i<8;i++){let z=i%2?-2.04:-.26,lo=i<4?-10.1:4.6,hi=i<4?-4.6:10.1,x=lo+(hi-lo)*((i%4)+.5)/4;pedestrian(x,z,'x',lo,hi,i%2?1:-1,i+8)}
// Residents use their own openings while cars use the separate garage driveways.

// Position each type in traffic from the first frame, including both boulevard directions.
const surfaceStop=1.81;
const stopDistance=({dir,z,length})=>-surfaceStop-z*dir-length/2-.035;
const vehicleShadowMat=shadowMat.clone();
vehicleShadowMat.opacity=.33;
const treadContactMat=new THREE.MeshBasicMaterial({map:shadowTex,color:'#1f2023',transparent:true,
  depthWrite:false,opacity:.77,polygonOffset:true,polygonOffsetFactor:-1});
const treadContactGeometry=new THREE.PlaneGeometry(1,1);
treadContactGeometry.rotateX(-Math.PI/2);
const cityCars=[
  ['suv',-7.35,1], ['ambulance',-4.78,1], ['sedan',1.15,1], ['taxi',5.90,1],
  ['van',-5.53,-1], ['hatchback-sports',1.02,-1], ['pickup',4.25,-1], ['sedan',7.50,-1],
  ['bus',-6.75,1,true], ['taxi',-3.68,1,true], ['suv',3.30,1,true],
  ['police',-7.10,-1,true], ['delivery',4.58,-1,true], ['sedan',8.30,-1,true],
].map(([type,z,dir,horizontal=false])=>{
  const g=new THREE.Group();
  g.name=`vehicle-${type}`;
  scene.add(g);
  const lane=horizontal?-1.15+dir*.33:-dir*.51;
  const car={g,type,z,dir,horizontal,lane,length:vehicleSpecs[type].length};
  positionCityCar(car);
  createCityVehicle(THREE,type).then(({model,width,wheelContacts,update})=>{
    car.updateModel=update;
    g.add(model);
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(width*1.48,car.length*1.13),vehicleShadowMat);
    shadow.rotation.x=-Math.PI/2;
    shadow.position.y=.0034;
    shadow.raycast=()=>{};
    g.add(shadow);
    for(const wheel of wheelContacts){
      const contact=new THREE.Mesh(treadContactGeometry,treadContactMat);
      contact.position.set(wheel.x,.0038,wheel.z);contact.scale.set(wheel.width,1,wheel.depth);
      contact.raycast=()=>{};g.add(contact);
    }
    shadowDirty=true;
  }).catch(error=>console.error(`Unable to load ${type}`,error));
  return car;
});
function positionCityCar(car){
  const {g,horizontal,z,lane,dir}=car;
  g.position.set(horizontal?z:lane,horizontal?.041:flyoverHeight(z),horizontal?lane:z);
  const heading=horizontal?dir*Math.PI/2:dir>0?0:Math.PI;
  const pitch=horizontal?0:-Math.atan(flyoverSlope(z)*dir);
  g.rotation.set(pitch,heading,0,'YXZ');
}
// Painted lane markings lie on the asphalt and must not cast shadows like raised blocks.
scene.traverse(o=>{
  if(!o.isMesh||o.material!==lane)return;
  o.castShadow=false;
  if(o.geometry.type==='BoxGeometry'&&o.parent===scene){
    o.scale.y=.0016/o.geometry.parameters.height;
    o.position.y=.045;
  }
});
function getTrafficSignalStage(elapsed){
  const phase=elapsed%14;
  return phase<8.5?'green':phase<10?'amber':'red';
}

function paintTrafficSignals(color){
  for(const lens of signalLenses){
    lens.green.emissiveIntensity=weatherState.signals?(color==='green'?.9:.025):0;
    lens.red.emissiveIntensity=weatherState.signals?(color==='red'?.9:.025):0;
    lens.amber.emissiveIntensity=weatherState.signals?(color==='amber'?.9:.025):0;
  }
}

function moveCityCars(dt){
  const cars=cityCars.map(car=>({...car,car}));
  const stage=getTrafficSignalStage(time);
  paintTrafficSignals(stage);
  for(const current of cars){
    const {car,horizontal,dir,lane,z}=current;
    if(car.g.userData.disabled||(!horizontal&&flyover.group.userData.disabled)){
      car.speed=0;
      if(!horizontal&&flyover.group.userData.disabled)car.g.position.y=flyoverHeight(z)*flyover.group.scale.y;
      continue;
    }
    const edge=horizontal?11:8.5,span=edge*2;
    let freeDistance=Infinity;
    for(const other of cars){
      if(other===current||other.horizontal!==horizontal||other.dir!==dir||other.lane!==lane)continue;
      const signedGap=(other.z-z)*dir;
      const gap=signedGap>0?signedGap:signedGap+span-current.length;
      const clearance=(current.length+other.length)/2+.26;
      freeDistance=Math.min(freeDistance,Math.max(0,gap-clearance));
    }
    if(horizontal&&weatherState.signals&&stage!=='green'){
      const toStop=stopDistance(current);
      if(toStop>=-1e-8)freeDistance=Math.min(freeDistance,Math.max(0,toStop));
    }
    const cruiseSpeed=vehicleSpecs[car.type].speed;
    const speedLimit=Math.min(cruiseSpeed,Math.sqrt(3.8*freeDistance));
    car.speed=Math.min((car.speed??cruiseSpeed)+dt*1.55,speedLimit);
    const advance=Math.min(car.speed*dt,freeDistance);
    car.updateModel?.(advance,car.speed<.13||car.speed<(current.speed??0)-.015,time,weatherState.night);
    car.z=z+advance*dir;
    if(car.z>edge-car.length/2)car.z-=span-car.length;
    if(car.z< -edge+car.length/2)car.z+=span-car.length;
    positionCityCar(car);
  }
}
function updateCity(dt){for(const p of cityPeople){if(p.group.userData.disabled)continue;p[p.axis]+=dt*.16*p.dir;if(p[p.axis]>p.hi)p[p.axis]=p.lo;if(p[p.axis]<p.lo)p[p.axis]=p.hi;p.group.position.set(p.x,.085,p.z);p.group.rotation.y=p.axis==='x'?(p.dir>0?Math.PI/2:-Math.PI/2):(p.dir>0?0:Math.PI);p.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(time*7+p.phase+i*Math.PI)*.35)}
 for(const gate of compoundGates){
  const near=cityPeople.some(p=>Math.abs(p.x-gate.x)<.28&&Math.abs(p.z-gate.z)<.48);
  const target=near?1.28:.40;gate.angle+=(target-gate.angle)*Math.min(1,dt*3);
  for(const {leaf,sign} of gate.leaves)leaf.rotation.y=sign*(gate.side==='north'?1:-1)*gate.angle;
 }
 moveCityCars(dt);
}


let paused=false,time=0;
const pigeonFlight=createPigeonFlight(THREE,scene);
// Give horizontal paving/garden sheets actual cut edges and a bottom, preserving their top texture.
scene.updateMatrixWorld(true);
const surfaceSupports=[];
scene.traverse(o=>{
 if(!o.isMesh||o.parent!==scene||!o.material?.isMeshStandardMaterial||o.geometry?.type==='BoxGeometry')return;
 const geo=o.geometry,attr=geo?.attributes?.position;if(!attr)return;
 const pts=[];let low=Infinity,high=-Infinity;
 for(let j=0;j<attr.count;j++){const p=new THREE.Vector3().fromBufferAttribute(attr,j).applyMatrix4(o.matrixWorld);pts.push(p);low=Math.min(low,p.y);high=Math.max(high,p.y);}
 if(low<.04||high>.09||high-low>.0001)return;
 const indices=geo.index?Array.from(geo.index.array):pts.map((_,j)=>j),edges=new Map(),v=[];
 const key=p=>`${p.x.toFixed(5)},${p.z.toFixed(5)}`;
 for(let j=0;j<indices.length;j+=3){const ids=indices.slice(j,j+3);for(let k=0;k<3;k++){const a=pts[ids[k]],b=pts[ids[(k+1)%3]],ka=key(a),kb=key(b),id=ka<kb?ka+'|'+kb:kb+'|'+ka;const e=edges.get(id);if(e)e.count++;else edges.set(id,{a,b,count:1});}const [a,b,c]=ids.map(k=>pts[k]);v.push(a.x,-.05,a.z,c.x,-.05,c.z,b.x,-.05,b.z);}
 for(const {a,b,count} of edges.values())if(count===1){v.push(a.x,a.y,a.z,b.x,b.y,b.z,a.x,-.05,a.z,b.x,b.y,b.z,b.x,-.05,b.z,a.x,-.05,a.z);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#bdb49f',roughness:1,side:THREE.DoubleSide}));m.name='solid-ground-edge';m.receiveShadow=true;surfaceSupports.push(m);
});
for(const support of surfaceSupports)scene.add(support);
// Close the underside of raised paving slabs instead of leaving air beneath them.
scene.traverse(o=>{
 if(!o.isMesh||o.geometry?.type!=='BoxGeometry'||o.parent!==scene)return;
 if(Math.abs(o.rotation.x)+Math.abs(o.rotation.z)>.001)return;
 const p=o.geometry.parameters,h=p.height*o.scale.y,w=p.width*o.scale.x,d=p.depth*o.scale.z,top=o.position.y+h/2,bottom=o.position.y-h/2;
 if(top>.035&&top<=.14&&bottom>-.049&&w>=.08&&d>=.08&&Math.max(w,d)>.25&&o.material!==lane){
  o.geometry=o.geometry.clone();const newH=top+.05;o.scale.y*=newH/h;o.position.y=(top-.05)/2;
 }
});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function ray(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera)}
let orbitControls;
const cityNavigation=createCityNavigation(THREE,{camera,scene,stage,finish:cinematicFinish,canCross:(x,z,nx,nz)=>{const c=templeModel.position;const inside=(a,b)=>Math.hypot(a-c.x,b-c.z)<.79;if(inside(x,z)===inside(nx,nz))return true;return nz>c.z&&Math.abs(nx-c.x)<.12&&templeModel.userData.entrance.open;},dynamicObjects:[officeConstruction.group,...cityCars.map(c=>c.g),...cityPeople.map(p=>p.group)],onReturn:view=>orbitControls.restoreTarget(view)});
const updateStreetPlay=streetPlay(THREE,scene,camera,stage,cityNavigation,()=>{shadowDirty=true;},{cityCars,cityPeople,flyover});
const qinianEntrance=templeModel.userData.entrance;
window.addEventListener('keydown',e=>{
 if(cityNavigation.active&&e.code==='KeyE'&&!e.repeat&&Math.hypot(camera.position.x-templeModel.position.x,camera.position.z-templeModel.position.z-.80)<.55)qinianEntrance.toggle();
});
const entrancePlane=new THREE.Plane(new THREE.Vector3(0,0,1),-(templeModel.position.z+.803));
const entranceHit=new THREE.Vector3();
let entrancePress=null;
function hitsQinianDoor(event){
  if(cityConstruction.isBuilding(templeModel))return false;
  ray(event);
  if(raycaster.ray.direction.z>=-.10||!raycaster.ray.intersectPlane(entrancePlane,entranceHit))return false;
  const {x,y}=templeModel.position;
  if(Math.abs(entranceHit.x-x)>.154||entranceHit.y-y<.486||entranceHit.y-y>.883)return false;
  return !raycaster.intersectObjects(templeModel.userData.roofSurfaces,false)
    .some(hit=>hit.point.distanceTo(raycaster.ray.origin)<entranceHit.distanceTo(raycaster.ray.origin)-.024);
}
stage.addEventListener('pointerdown',event=>{
  entrancePress=event.isPrimary&&event.button===0&&hitsQinianDoor(event)
    ? {id:event.pointerId,x:event.clientX,y:event.clientY} : null;
},true);
stage.addEventListener('pointerup',event=>{
  if(entrancePress?.id!==event.pointerId)return;
  const press=entrancePress;entrancePress=null;
  if(Math.hypot(event.clientX-press.x,event.clientY-press.y)<=5&&hitsQinianDoor(event))qinianEntrance.toggle();
},true);
stage.addEventListener('pointercancel',()=>{entrancePress=null;},true);
stage.addEventListener('pointermove',event=>{
  if(event.buttons){
    if(entrancePress?.id===event.pointerId&&Math.hypot(event.clientX-entrancePress.x,event.clientY-entrancePress.y)>5)
      entrancePress=null;
    renderer.domElement.style.cursor='';
    return;
  }
  renderer.domElement.style.cursor=hitsQinianDoor(event)?'pointer':'';
},true);
orbitControls=createCityOrbitControls(THREE,{camera,stage,navigation:cityNavigation});

window.render_game_to_text=()=>JSON.stringify({
  ...cityNavigation.state(),orbitTarget:orbitControls.target.toArray(),
  qinianDoorOpen:qinianEntrance.open,construction:cityConstruction.state(),
  solarMinutes:weatherState.solarMinutes,
  pigeons:pigeonFlight.count,
  traffic:{visible:weatherState.cars,signals:weatherState.signals,
    vehicles:cityCars.map(({type,g,speed})=>({type,x:g.position.x,y:g.position.y,z:g.position.z,speed}))},
});

function notice(text){
  const el=document.querySelector('#status');
  el.textContent=text;el.style.opacity=1;
  clearTimeout(notice.timer);
  notice.timer=setTimeout(()=>el.style.opacity=0,1800);
}
const addPigeonsButton=document.querySelector('#add');
let releaseGeneration=0;
addPigeonsButton.onclick=async()=>{
  const generation=releaseGeneration;
  try{
    await pigeonFlight.release();
  }catch(error){
    if(generation===releaseGeneration)notice('鸽群加载失败，请再试一次');
    console.error('Unable to load the pigeon model',error);
  }
};
document.querySelector('#reset').onclick=()=>{
  releaseGeneration++;
  pigeonFlight.clear();
  cityConstruction.reset();
  qinianEntrance.reset();
  shadowDirty=true;
  resetWeatherControls();
  cityNavigation.exit();
  camera.zoom=1;
  resize(true);
  paused=false;
  updatePause();
  notice('场景已重置');
};
document.querySelector('#center-view').onclick=()=>resize(true,true);
let buildWhilePaused=false;
buildButton.onclick=()=>{
  // A replay can run while the rest of the city stays paused.
  buildWhilePaused=paused;
  if(cityNavigation.active)cityNavigation.refresh();
  cityConstruction.start();
  shadowDirty=true;
};
function togglePause(){
  paused=!paused;
  buildWhilePaused=false;
  updatePause();
}
function updatePause(){const b=document.querySelector('#pause');b.setAttribute('aria-label',paused?'播放动画':'暂停动画');b.title=paused?'播放动画':'暂停动画';b.innerHTML=paused?'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"/></svg>':'<svg viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></svg>'}document.querySelector('#pause').onclick=togglePause;
window.addEventListener('keydown',event=>{
  if(event.code==='Space'&&!cityNavigation.active&&event.target===document.body){event.preventDefault();togglePause();}
});

const quality=document.querySelector('#render-quality');
try { quality.value=localStorage.getItem('beijing-render-quality')||'high'; } catch {}
if(!quality.value)quality.value='high';
quality.onchange=()=>{
  try { localStorage.setItem('beijing-render-quality',quality.value); } catch {}
  resize();
};
let lastCityFrame=-Infinity;
let viewInitialized=false, renderWidth=0, renderHeight=0, renderRatio=0;
function resize(forceView=false,smoothView=false){
  const {clientWidth:width,clientHeight:height}=stage;
  if(!width||!height)return;
  const pixelRatio=Math.min(devicePixelRatio,quality.value==="low"?.75:quality.value==="medium"?1:2);
  if(width!==renderWidth||height!==renderHeight||pixelRatio!==renderRatio){
    renderer.setPixelRatio(pixelRatio);
    renderRatio=pixelRatio;
    renderer.setSize(width,height,false);
    cinematicFinish.resize(width,height);
    renderWidth=width;renderHeight=height;
  }
  const aspect=width/height;
  camera.aspect=aspect;
  if(!forceView&&(cityNavigation.active||viewInitialized)){camera.updateProjectionMatrix();return;}
  viewInitialized=true;
  const fov=precinctPreview?(aspect<1?Math.min(84,33/aspect):33):24;
  const viewWidth=width<=900?29.6:THREE.MathUtils.lerp(39,32.6,THREE.MathUtils.smoothstep(width,860,1440));
  const viewHeight=Math.max(23.4,viewWidth/aspect);
  const distance=viewHeight/(2*Math.tan(THREE.MathUtils.degToRad(fov)/2));
  // A long lens and diagonal viewing angle keep the rooftop plan legible.
  const narrow=width<=700&&aspect<1;
  const target=new THREE.Vector3(0,narrow?-7.2:0,0);
  const position=new THREE.Vector3(-distance*.47,distance*.60,distance*.65);
  if(precinctPreview){
    position.set(10.8,13.4,11.05);
    target.set(narrow?5.0:4.6,narrow?-3.15:.65,narrow?2.9:1.05);
  }
  const matrix=new THREE.Matrix4().lookAt(position,target,camera.up);
  const quaternion=new THREE.Quaternion().setFromRotationMatrix(matrix);
  const view={target,position,quaternion,zoom:1,fov,near:precinctPreview?.08:1,far:220};
  if(!smoothView)orbitControls.reset();
  orbitControls.flyTo(view,!smoothView);
}
new ResizeObserver(()=>resize()).observe(stage);
resize();
// Reuse the existing window meshes and lamp locations for night lighting.
const nightMaterials=new Map();
const nightRoadGlow=new THREE.Group();
nightRoadGlow.name='Night street-lamp pools';
const poolGeometry=new THREE.PlaneGeometry(1,1);
const poolMaterial=new THREE.ShaderMaterial({
  transparent:true,
  depthWrite:false,
  blending:THREE.AdditiveBlending,
  uniforms:{uNightGlow:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uNightGlow;varying vec2 vUv;void main(){
    float falloff=1.-smoothstep(.0,.5,length(vUv-.5));
    gl_FragColor=vec4(.83,.77,.62,falloff*falloff*.23*uNightGlow);
  }`,
});
const lampPosition=new THREE.Vector3();
scene.updateMatrixWorld(true);
scene.traverse(object=>{
  if(object.material?.userData?.nightEmission!==undefined){
    nightMaterials.set(object.material,[object.material.emissiveIntensity,object.material.userData.nightEmission]);
  }
  if(object.name!=='downward-road-lamp-lens')return;
  nightMaterials.set(object.material,[.16,1.45]);
  object.getWorldPosition(lampPosition);
  const pool=new THREE.Mesh(poolGeometry,poolMaterial);
  pool.position.set(lampPosition.x,object.parent.userData.lampSurfaceY??.061,lampPosition.z);
  pool.rotation.x=-Math.PI/2;
  pool.scale.set(.92,.92,1);
  pool.renderOrder=3;
  nightRoadGlow.add(pool);
});
scene.add(nightRoadGlow);
const nightMaterialLevels=[...nightMaterials].map(([material,[day,night]])=>[material,day,night]);
applyWeatherControls();
applyCityTurf(scene);
weatherEffects.finishRoads();
const distantCity=makeStreetHorizon(THREE,scene,()=>weatherState.night);
const clock=new THREE.Clock();
let lastShadowFrame=-Infinity;
renderer.domElement.addEventListener('webglcontextrestored',()=>{
  shadowDirty=true;
  lastShadowFrame=-Infinity;
});
function animate(now=performance.now()){
  requestAnimationFrame(animate);
  if(document.hidden||(quality.value==="low"&&now-lastCityFrame<32))return;
  lastCityFrame=now;
  const frameTime=clock.getDelta(),dt=Math.min(frameTime,.05);
  if(weatherControlsDirty)applyWeatherControls();
  cityNavigation.update(dt);
  updateStreetPlay(dt);
  orbitControls.update(dt);
  if(qinianEntrance.update(dt))shadowDirty=true;
  if((!paused||buildWhilePaused)&&cityConstruction.running){
    cityConstruction.update(Math.min(frameTime,.10));
    shadowDirty=true;
  }
  if(!paused){
    time+=dt;
    updateCity(dt);
    pigeonFlight.update(dt);
    shadowDirty=true;
  }
  cloudAtmosphere.update(time,camera);
  distantCity.update(cityNavigation.active);
  weatherEffects.renderReflections(scene,camera,cityCars);
  // Reuse the light-space shadow map between updates as the camera moves.
  if(weatherState.sun&&shadowDirty&&now-lastShadowFrame>=1000/18){
    renderer.shadowMap.needsUpdate=true;
    shadowDirty=false;
    lastShadowFrame=now;
  }
  cinematicFinish.render(scene,camera);
}
animate();
