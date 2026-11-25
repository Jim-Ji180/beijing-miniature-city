import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import './courtyard-lettering.js?v=1';

// The South plaque is suspended under the upper eave. The solid blue tablet
// sits inside a fretted gilt frame shaped against the park's close-up photo.
export function addQinianPlaque(T, hall) {
  const group = new T.Group();
  group.name = 'Qinian Hall south plaque';
  group.position.set(0, 1.827, .607);
  hall.add(group);
  const gold = new T.MeshStandardMaterial({ color: '#b89248', metalness: .39, roughness: .55, emissive: '#73551f', emissiveIntensity: .10 });
  const reliefGold = new T.MeshStandardMaterial({ color: '#d9ab58', metalness: .38, roughness: .48, emissive: '#8d631f', emissiveIntensity: .15 });
  const blue = new T.MeshStandardMaterial({ color: '#233a80', roughness: .73, emissive: '#1c2f79', emissiveIntensity: .20 });
  const hanger = new T.MeshStandardMaterial({ color: '#493b31', metalness: .43, roughness: .65 });

  function mount(geometry, material, x = 0, y = 0, z = 0) {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x,y,z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  const frame = new T.Shape();
  frame.moveTo(0,.141);
  frame.bezierCurveTo(.018,.141,.030,.129,.050,.132);
  frame.bezierCurveTo(.066,.132,.082,.124,.098,.130);
  frame.bezierCurveTo(.113,.131,.123,.120,.117,.105);
  frame.bezierCurveTo(.113,.093,.099,.091,.091,.091);
  frame.bezierCurveTo(.088,.067,.101,.047,.091,.031);
  frame.bezierCurveTo(.088,.019,.100,.004,.092,-.015);
  frame.bezierCurveTo(.087,-.037,.101,-.054,.090,-.068);
  frame.bezierCurveTo(.084,-.083,.098,-.102,.087,-.116);
  frame.bezierCurveTo(.081,-.129,.056,-.126,.047,-.124);
  frame.bezierCurveTo(.030,-.122,.020,-.135,0,-.133);
  frame.bezierCurveTo(-.020,-.135,-.030,-.122,-.047,-.124);
  frame.bezierCurveTo(-.056,-.126,-.081,-.129,-.087,-.116);
  frame.bezierCurveTo(-.098,-.102,-.084,-.083,-.090,-.068);
  frame.bezierCurveTo(-.101,-.054,-.087,-.037,-.092,-.015);
  frame.bezierCurveTo(-.100,.004,-.088,.019,-.091,.031);
  frame.bezierCurveTo(-.101,.047,-.088,.067,-.091,.091);
  frame.bezierCurveTo(-.099,.091,-.113,.093,-.117,.105);
  frame.bezierCurveTo(-.123,.120,-.113,.131,-.098,.130);
  frame.bezierCurveTo(-.082,.124,-.066,.132,-.050,.132);
  frame.bezierCurveTo(-.030,.129,-.018,.141,0,.141);
  const inset = new T.Path();
  inset.moveTo(-.061,-.102);
  inset.lineTo(-.061,.088);
  inset.lineTo(.061,.088);
  inset.lineTo(.061,-.102);
  inset.closePath();
  frame.holes.push(inset);

  function opening(x,y,rx,ry,turn) {
    const hole = new T.Path();
    hole.absellipse(x,y,rx,ry,0,Math.PI*2,true,turn);
    frame.holes.push(hole);
  }
  for (const side of [-1,1]) {
    for (let i=0;i<5;i++) {
      opening(side*(.080+(i%2)*.002),-.085+i*.038,.010,.007,-side*(i%2 ? .78 : .38));
    }
    opening(side*.100,.112,.011,.007,side*.55);
    opening(side*.046,.113,.012,.006,side*.25);
  }
  opening(0,.118,.010,.007,0);
  const rim = mount(new T.ExtrudeGeometry(frame,{depth:.008,bevelEnabled:true,bevelSize:.0018,bevelThickness:.0015,bevelSegments:2,curveSegments:10}),gold);
  rim.name = 'Qinian openwork nine-dragon gilt frame';
  const board = mount(new T.BoxGeometry(.124,.194,.014),blue,0,-.007,-.005);
  board.name = 'Qinian blue lacquer tablet';
  for (const side of [-1,1]) {
    mount(new T.BoxGeometry(.010,.048,.013),hanger,side*.055,.146,-.021);
    const strap = mount(new T.BoxGeometry(.010,.032,.010),hanger,side*.055,.125,-.014);
    strap.rotation.x = -.82;
    mount(new T.BoxGeometry(.014,.008,.022),hanger,side*.055,.167,-.022);
  }

  // Each creature is drawn in relief from an S-shaped body, ridged mane,
  // branching claws and a tapering tail. Most of the actual openwork remains open.
  const relief = [];
  function tube(points, radius, size, transform) {
    const curve = new T.CatmullRomCurve3(points.map(([x,y,z=0])=>transform(x,y,z)));
    relief.push(new T.TubeGeometry(curve, size, radius, 5, false));
  }
  const eyeDetails=[];
  function dragon(x,y,scale,angle,mirror) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const p = (u,v,w) => new T.Vector3(x+(mirror*u*c-v*s)*scale,y+(mirror*u*s+v*c)*scale,.010+w*scale);
    tube([[-.50,-.10],[-.38,-.30],[-.16,-.28],[.01,-.10],[-.02,.12],[-.17,.24],[-.08,.40],[.18,.36],[.25,.21],[.40,.22]],scale*.077,26,p);
    tube([[-.47,-.11],[-.49,.05],[-.33,.18],[-.22,.10]],scale*.033,9,p);
    tube([[.14,.35],[.16,.48],[.28,.49]],scale*.038,7,p);
    tube([[.08,.36],[.00,.46],[-.06,.45]],scale*.033,7,p);
    tube([[.23,.23],[.30,.11],[.44,.12]],scale*.040,7,p);
    tube([[.25,.23],[.34,.28],[.46,.32],[.53,.26]],scale*.021,10,p);
    tube([[.24,.18],[.35,.07],[.45,.052],[.49,.087]],scale*.023,10,p);
    tube([[.18,.27],[.12,.19],[.15,.12],[.23,.15]],scale*.030,9,p);
    const eye=new T.SphereGeometry(scale*.037,8,6).scale(1,1,.3);
    const eyeCenter=p(.263,.266,.088);
    eye.translate(eyeCenter.x,eyeCenter.y,eyeCenter.z);
    eyeDetails.push(eye);
    tube([[-.10,-.22],[.10,-.30],[.16,-.44],[.26,-.37]],scale*.041,8,p);
    tube([[-.17,.24],[-.36,.26],[-.37,.39],[-.29,.42]],scale*.036,8,p);
    tube([[.03,-.07],[.24,-.06],[.37,-.18],[.47,-.13]],scale*.032,8,p);
    for(const [u,v] of [[-.25,-.28],[-.13,-.23],[-.036,-.13]]) {
      tube([[u,v],[u+.02,v-.07],[u+.07,v-.095]],scale*.025,5,p);
    }
  }
  dragon(0,.115,.041,0,1);
  for (const side of [-1,1]) {
    dragon(side*.057,.113,.040,side*.17,side);
    dragon(side*.079,.060,.038,side*Math.PI*.49,side);
    dragon(side*.078,.002,.038,side*Math.PI*.49,side);
    dragon(side*.074,-.062,.040,side*Math.PI*.43,side);
  }
  for (const side of [-1,1]) {
    const transform=(x,y)=>new T.Vector3(side*x,y,.010);
    tube([[.014,-.115],[.033,-.119],[.054,-.110],[.069,-.116],[.078,-.105]],.0016,22,transform);
    tube([[.064,-.096],[.064,-.060],[.064,-.010],[.064,.045],[.064,.084],[.054,.092]],.0009,42,transform);
    tube([[.014,.131],[.037,.126],[.063,.127],[.092,.124],[.108,.120]],.00115,20,transform);
    tube([[.016,-.124],[.028,-.121],[.039,-.123],[.058,-.119]],.00085,15,transform);
    for(let i=0;i<5;i++) {
      const y=-.085+i*.038;
      tube([[.068,y-.010],[.077,y-.015],[.089,y-.007],[.088,y+.005]],.00125,11,transform);
      tube([[.065,y+.010],[.075,y+.013],[.084,y+.012],[.087,y+.020]],.00105,12,transform);
      tube([[.071,y-.010],[.073,y-.002],[.079,y+.001],[.081,y-.004]],.00085,9,transform);
    }
    tube([[.081,.092],[.089,.098],[.094,.105],[.102,.103],[.111,.107],[.113,.116]],.0015,19,transform);
    tube([[.020,.114],[.024,.104],[.037,.105],[.048,.099],[.063,.103]],.00115,18,transform);
  }
  const cutRelief=mergeGeometries([...relief,...eyeDetails],false);
  for(const piece of [...relief,...eyeDetails])piece.dispose();
  mount(cutRelief,reliefGold).name = 'Qinian gilded dragon and cloud relief';

  const canvas = document.createElement('canvas');
  canvas.width=320;canvas.height=512;
  const c = canvas.getContext('2d');
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=8;
  function paintTitle() {
    c.clearRect(0,0,320,512);
    c.textAlign='center';
    c.textBaseline='middle';
    c.font='108px CourtyardCalligraphy, "PingFang SC", sans-serif';
    for (const [i,glyph] of [...'祈年殿'].entries()) {
      c.fillStyle='#72501b';c.fillText(glyph,162,117+i*140);
      c.fillStyle='#ebc575';c.fillText(glyph,159,114+i*140);
    }
    texture.needsUpdate=true;
  }
  paintTitle();
  document.fonts.load('108px CourtyardCalligraphy','祈年殿').then(paintTitle);
  const title = mount(new T.PlaneGeometry(.122,.183),new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#e7b952',emissiveIntensity:.25,alphaTest:.12,roughness:.72}),0,-.008,.0025);
  title.castShadow=false;
  return group.children;
}
