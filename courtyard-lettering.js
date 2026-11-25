// Ma Shan Zheng, Google Fonts v18, SIL OFL 1.1. Exact permitted subset + license
// are bundled in assets/lettering. No reference photograph is used as a texture.
const face=new FontFace('CourtyardCalligraphy',`url(${new URL('./assets/lettering/MaShanZheng-GateTemple-subset.ttf',import.meta.url)})`);
await face.load();document.fonts.add(face);
export function createDoorwayLettering(T){
 const textures=new Map();
 function texture(text,vertical=false,paper=true){
  const key=text+vertical+paper;if(textures.has(key))return textures.get(key);
  const canvas=document.createElement('canvas');canvas.width=vertical?384:1024;canvas.height=vertical?2048:256;const c=canvas.getContext('2d');
  if(paper){
   c.fillStyle='#a91f20';c.fillRect(0,0,canvas.width,canvas.height);
   let seed=12682;for(let i=0;i<5500;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%canvas.width;seed=(seed*1664525+1013904223)>>>0;const y=seed%canvas.height;c.fillStyle=i%2?'rgba(246,98,48,.06)':'rgba(75,12,8,.045)';c.fillRect(x,y,1,2);}
   c.strokeStyle='#cba358';c.lineWidth=3;c.strokeRect(12,12,canvas.width-24,canvas.height-24);
  }
  c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ebd397';
  if(vertical){const gap=(canvas.height-144)/text.length;c.font=`${Math.min(280,gap*.9)}px CourtyardCalligraphy`;[...text].forEach((char,i)=>c.fillText(char,canvas.width/2,72+gap*(i+.5)));}
  else{c.font=`${paper?184:216}px CourtyardCalligraphy`;if(paper){[...text].forEach((char,i)=>c.fillText(char,canvas.width*(i+.5)/text.length,canvas.height*.50));}else c.fillText(text,canvas.width/2,canvas.height*.50);}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=16;textures.set(key,map);return map;
 }
 function plaque(text,width,height,x,y,z,vertical=false,paper=true){
  let map;
  if(text==='福'&&!paper){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.font='208px CourtyardCalligraphy';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#edcf81';c.fillText(text,128,132);map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=16;
  }else map=texture(text,vertical,paper);
  const material=new T.MeshStandardMaterial({map,transparent:!paper,alphaTest:paper?0:.03,roughness:.85,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const mesh=new T.Mesh(new T.PlaneGeometry(width,height),material);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.name='doorway-lettering-'+text;return mesh;
 }
 return {plaque};
}
