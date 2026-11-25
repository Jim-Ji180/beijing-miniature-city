// Layered joinery and blue/green/gold beam painting reference the real doorway
// recorded in outputs/city-v257-review/reference/gate.jpg; no photo pixels reused.
export function createGateOrnaments(T){
 const wood=new T.MeshStandardMaterial({color:'#7b3028',roughness:.65}),gold=new T.MeshStandardMaterial({color:'#b99b60',roughness:.55,metalness:.12}),stone=new T.MeshStandardMaterial({color:'#b1aa96',roughness:.95});
 const c=document.createElement('canvas');c.width=2048;c.height=128;const q=c.getContext('2d');q.fillStyle='#193d51';q.fillRect(0,0,2048,128);
 q.strokeStyle='#76958b';q.lineWidth=9;q.strokeRect(6,6,2036,116);q.strokeStyle='#c5aa65';q.lineWidth=3;q.strokeRect(18,18,2012,92);
 for(let i=0;i<16;i++){const x=64+i*128;q.strokeStyle='#c5aa65';q.lineWidth=3;q.beginPath();q.moveTo(x-51,64);q.bezierCurveTo(x-23,15,x+23,15,x+51,64);q.bezierCurveTo(x+23,108,x-23,108,x-51,64);q.stroke();q.beginPath();for(let j=0;j<=50;j++){const t=j/50*9,rr=25*(1-j/60),xx=x+Math.cos(t)*rr,yy=64+Math.sin(t)*rr*.68;j?q.lineTo(xx,yy):q.moveTo(xx,yy);}q.stroke();}
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=16;const painted=new T.MeshStandardMaterial({map,roughness:.8});
 return function ornaments(parent,x,z){
  const box=(dx,y,dz,w,h,d,mat)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(x+dx,y,z+dz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
  // A continuous painted lintel framed by raised timber mouldings under the eave.
  box(0,.573,.070,.744,.034,.028,wood);
  const fascia=new T.Mesh(new T.PlaneGeometry(.722,.026),painted);fascia.position.set(x,.573,z+.085);fascia.receiveShadow=true;parent.add(fascia);
  for(const y of [.552,.594])box(0,y,.073,.768,.008,.033,gold);
  for(const sign of [-1,1]){
   // Carved stone surround remains flush to the brick frontage.
   box(sign*.347,.325,.054,.027,.338,.016,stone);
   for(const yy of [.171,.485])box(sign*.347,yy,.063,.043,.016,.024,stone);
   for(let i=0;i<5;i++){const relief=new T.Mesh(new T.TorusGeometry(.007,.0023,6,12),stone);relief.position.set(x+sign*.347,.207+i*.053,z+.066);parent.add(relief);for(let k=0;k<6;k++){const a=k*Math.PI/3,petal=new T.Mesh(new T.SphereGeometry(1,8,6),stone);petal.position.set(x+sign*.347+Math.cos(a)*.004,.207+i*.053+Math.sin(a)*.004,z+.068);petal.scale.set(.0028,.0028,.0014);parent.add(petal);}}
   box(sign*.225,.302,.023,.013,.294,.018,wood);box(sign*.225,.302,.034,.003,.285,.004,gold);
   // Solid carved spandrels (quetì) connect the jambs to the lintel.
   const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(.073,0);sh.bezierCurveTo(.067,-.018,.041,-.009,.034,-.032);sh.bezierCurveTo(.023,-.042,.017,-.035,0,-.062);sh.closePath();
   const bracket=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:.012,bevelEnabled:true,bevelSize:.002,bevelThickness:.001,bevelSegments:2}),wood);bracket.scale.x=-sign;bracket.position.set(x+sign*.216,.44,z+.019);bracket.castShadow=true;parent.add(bracket);
   const curve=new T.CatmullRomCurve3([[0,-.007],[.025,-.014],[.045,-.008],[.060,-.005]].map(([xx,yy])=>new T.Vector3(x+sign*.216-sign*xx,.44+yy,z+.034)));
   parent.add(new T.Mesh(new T.TubeGeometry(curve,18,.0017,6,false),gold));
   // Separate raised panels and fine beading give the two leaves a crafted edge.
   for(const [y,h] of [[.207,.096],[.371,.105]]){
    for(const xx of [-.083,.083])box(sign*.109+xx,y,.001,.004,h,.005,wood);
    for(const yy of [-h/2,h/2])box(sign*.109,y+yy,.001,.169,.004,.005,wood);
   }
  }
 };
}
