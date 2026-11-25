// Dense office parcels bounded by streets and the three protected landmarks.
// Use a different mix of stone, metal and glass in the adjacent streets.
// The Miami reference informs the asymmetric set-backs and varied podiums.
const districts = [
  {id:'north-west',x0:-10.35,x1:-5.90,z0:-7.85,z1:-2.85,cols:4,rows:4},
  {id:'north-east',x0:7.30,x1:10.35,z0:-7.85,z1:-2.85,cols:3,rows:4},
  {id:'south-west',x0:-10.35,x1:-5.80,z0:.70,z1:6.70,cols:4,rows:5},
  {id:'south-central',x0:-4.85,x1:-1.65,z0:.70,z1:6.70,cols:3,rows:5},
  {id:'south-east',x0:7.20,x1:10.35,z0:.70,z1:6.70,cols:3,rows:5},
];
const unit=(n,k)=>{const v=Math.sin((n+1)*91.17+k*37.83)*43758.5453;return v-Math.floor(v)};
function splitWeights(n,tag,count){const w=Array.from({length:count},(_,i)=>.76+unit(n+i*19,tag)*.48),sum=w.reduce((a,b)=>a+b,0);return w.map(v=>v/sum)}

const [ivory,silver,clay,fins,grid,teal,stone,bronze,navy]=[0,1,2,3,4,5,6,7,8];
const profiles={
 slab:{form:'slab'}, ribbon:{form:'ribbon'}, terrace:{form:'terrace'}, cut:{form:'cut-glass'},
 crescent:{form:'crescent-balconies'},
 loggia:{form:'fin-loggia'}, garden:{form:'garden-podium'},
 angled:{form:'angled-slab'}, zigzag:{form:'zigzag-corner'}, wing:{form:'courtyard-wing'},
 spine:{form:'split-spine'}, gable:{form:'gable-office'}, alternating:{form:'offset-terraces'},
 gallery:{form:'inset-gallery'}, civic:{form:'civic-corner'},
 shoulders:{form:'shouldered-tower'}, slot:{form:'slot-tower'}, colonnade:{form:'colonnade-block'},
 setback:{variant:1}, stepped:{variant:2}, offset:{variant:3}, narrow:{variant:4}, shoulder:{variant:5},
 chamfered:{variant:1,rounded:true}, twin:{variant:2,rounded:true},
 crown:{variant:0,tieredCrown:true},
};
// Store each row in street order with its height, façade family and optional
// palette or orientation. Tall, conspicuous forms are assigned by address.
const streetProfiles={
 'north-east':[
  ['slab',1.38,silver,'ash'], ['shoulder',3.74,ivory,'limestone'], ['shoulders',2.97,grid,'bronze'],
  ['chamfered',2.22,stone,'sand'], ['spine',3.28,grid,'ash'], ['loggia',3.86,fins,'sage',-1],
  ['offset',1.65,clay,'clay'], ['slot',2.79,silver,'limestone'], ['colonnade',2.44,stone,'sand'],
  ['slab',.98,stone,'sand'], ['narrow',2.50,ivory,'ash'], ['garden',1.64,stone,'sage',1],
 ],
 'south-central':[
  ['wing',1.54,ivory,'sand'], ['loggia',2.32,fins,'ash',1], ['crown',3.79,ivory,'limestone'],
  ['garden',1.39,stone,'sage',1], ['stepped',2.09,clay,'clay'], ['gallery',2.73,ivory,'ash'],
  ['cut',3.58,grid,'sage'], ['offset',1.68,ivory,'sand'], ['setback',2.10,silver,'ash'],
  ['chamfered',3.27,ivory,'sand'], ['narrow',1.47,bronze,'bronze'], ['alternating',3.14,silver,'limestone'],
  // Existing teal-window twin tower is the close-up façade comparison target.
  ['twin',null,teal,'teal'], ['zigzag',2.19,stone,'clay'], ['slab',.88,silver,'ash'],
 ],
 'south-east':[
  ['slab',1.15,silver,'ash'], ['stepped',2.58,stone,'sage'], ['angled',3.54,grid,'ash'],
  ['chamfered',1.68,ivory,'limestone'], ['cut',3.53,fins,'steel'], ['shoulder',2.48,clay,'clay'],
  ['gable',1.54,bronze,'clay'], ['stepped',2.90,ivory,'sand'], ['narrow',4.02,stone,'limestone'],
  ['offset',1.49,stone,'sage'], ['twin',3.32,bronze,'bronze'], ['loggia',2.67,grid,'sage',1],
  ['stepped',1.14,clay,'clay'], ['garden',1.30,silver,'sage',1], ['civic',2.10,ivory,'limestone'],
 ],
};

function profileSeed(seed,{form,rounded,tieredCrown}){
 if(form)return seed;
 if(tieredCrown)return Math.max(19,seed-seed%19);
 // The current office creator uses multiples of three for its curved,
 // chamfered and twin forms. Keep the other roof/equipment choices seeded.
 const adjusted=seed-seed%3+(rounded?0:seed%2+1);
 return adjusted%19===0?adjusted+3:adjusted;
}

const officeBlocks=[];
for(let di=0;di<districts.length;di++){
 const d=districts[di],plan=streetProfiles[d.id];if(!plan)continue;const rowWeights=splitWeights(di*101,13,d.rows);let z0=d.z0;
 for(let row=0;row<d.rows;row++){
  const depth=(d.z1-d.z0)*rowWeights[row],cols=splitWeights(di*101+row*37,7,d.cols);let x0=d.x0;
  for(let col=0;col<d.cols;col++){
   const width=(d.x1-d.x0)*cols[col],n=di*100+row*d.cols+col;
   // Preserve the existing building footprints and on-site pedestrian gaps.
   const order=Math.floor(unit(di*731+row*47,19)*3),shape=(col+order)%3;
   const wr=shape===0?.84+unit(n,1)*.07:shape===1?.72+unit(n,1)*.12:.56+unit(n,1)*.12;
   const dr=shape===0?.82+unit(n,2)*.08:shape===1?.71+unit(n,2)*.12:.66+unit(n,2)*.12;
   // Every facade remains at least .06 inside its parcel after offset.
   const w=Math.min(width-.12,width*wr),dd=Math.min(depth-.12,depth*dr);
   const x=x0+width*.5+(unit(n,3)-.5)*Math.max(0,width-w-.12);
   const z=z0+depth*.5+(unit(n,4)-.5)*Math.max(0,depth-dd-.12);
   const [name,height,facade,tone,facing]=plan[row*d.cols+col],profile=profiles[name];
   const originalSeed=1+Math.floor(unit(n,17)*65535);
   const h=height??1.78+unit(n,6)*1.34;
   const seed=height===null?originalSeed:profileSeed(originalSeed,profile);
   officeBlocks.push({x,z,w,d:dd,h,variant:profile.variant??0,seed,form:profile.form,facade,tone,facing,district:d.id});
   x0+=width;
  }
  z0+=depth;
 }
}
// A deliberately composed CBD sample beside China Zun. Rectangles stay within
// north-west, leaving pedestrian gaps instead of filling every parcel cell.
const showcase=[
 [-9.68,-7.18,1.05,.95,2.37,0,fins,'sand'],[-8.10,-7.18,1.65,.90,3.55,1,navy,'steel','terrace'],[-6.65,-7.13,.95,1.00,2.75,2,silver,'ash'],
 [-9.66,-5.60,1.05,1.38,3.65,3,stone,'sage','crescent-balconies',1],[-8.05,-5.50,1.28,1.14,1.72,4,ivory,'limestone','garden-podium',1],[-6.55,-5.60,.85,1.02,3.80,5,navy,'limestone'],
 [-9.45,-3.77,1.48,.92,.78,6,silver,'ash','slab'],[-7.55,-3.77,1.38,.92,2.53,7,bronze,'bronze','ribbon'],[-6.35,-3.77,.56,.72,1.96,8,clay,'clay'],
];
for(const [x,z,w,d,h,design,facade,tone,form,facing] of showcase)officeBlocks.push({x,z,w,d,h,design,form,facing,facade,tone,district:'north-west',showcase:true});
export { officeBlocks, districts };
