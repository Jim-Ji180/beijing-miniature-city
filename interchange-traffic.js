// Animated four-way ramps. Opposite outbound or opposite inbound turns may
// share the reserved junction; conflicting turns wait for it to clear.
const GAP=.78,SPEED=.50,EPS=1e-7;
const instances=new WeakMap();
function init(cars,point){
 const cfg=[{h:false,dir:1,hold:-4.6},{h:false,dir:-1,hold:2.1},{h:true,dir:1,hold:-7.2},{h:true,dir:-1,hold:7.2}];
 const paths=cfg.map((v,r)=>{const arr=[];for(let i=0;i<=600;i++){const p=point(r,i/600),b=arr.at(-1);arr.push({...p,d:b?b.d+Math.hypot(p.x-b.x,p.y-b.y,p.z-b.z):0});}return arr});
 cfg.forEach((v,r)=>{const car=cars.find(c=>!!c.horizontal===v.h&&c.dir===v.dir&&!c._junctionRoute);if(car){car._junctionRoute={r,phase:'source',distance:0,sourceH:v.h,sourceDir:v.dir,sourceLane:car.lane};}});
 const state={cfg,paths,owners:[],nextTicket:1};instances.set(cars,state);return state;
}
function at(path,dist){const end=path.at(-1);if(dist>=end.d){let a=path.at(-2);return {...end,dx:end.x-a.x,dy:end.y-a.y,dz:end.z-a.z}}let lo=0,hi=path.length-1;while(hi-lo>1){let m=(lo+hi)>>1;if(path[m].d<dist)lo=m;else hi=m}let a=path[lo],b=path[hi],u=(dist-a.d)/(b.d-a.d||1);return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,z:a.z+(b.z-a.z)*u,dx:b.x-a.x,dy:b.y-a.y,dz:b.z-a.z}}
function inside(c){return c.horizontal?c.z>-7.05&&c.z<7.05:c.z>-4.45&&c.z<1.95}
export function updateInterchangeTraffic(cars,dt,height,point){
 if(!point)throw Error('interchangeRampPoint required');const state=instances.get(cars)||init(cars,point);const count=Math.max(1,Math.ceil(dt/.025)),stepTime=dt/count;
 for(let it=0;it<count;it++){
  const snapshots=cars.map(c=>({c,z:c.z,dir:c.dir,lane:c.lane,h:!!c.horizontal,phase:c._junctionRoute?.phase}));
  const waiting=cars.filter(c=>c._junctionRoute?.phase==='waiting').sort((a,b)=>a._junctionRoute.ticket-b._junctionRoute.ticket);
  if(!state.owners.length&&waiting.length)state.owners.push(waiting[0]);
  if(state.owners.length===1&&state.owners[0]._junctionRoute.phase==='waiting'){const a=state.owners[0]._junctionRoute.r,partner=waiting.find(c=>c!==state.owners[0]&&((a<2&&c._junctionRoute.r<2)||(a>=2&&c._junctionRoute.r>=2)));if(partner)state.owners.push(partner);}
  const clear=state.owners.length>0&&!snapshots.some(s=>!state.owners.includes(s.c)&&inside(s.c));
  const proposals=snapshots.map(s=>{
   const c=s.c,route=c._junctionRoute,cfg=route&&state.cfg[route.r];let advance=SPEED*stepTime;
   if(route?.phase==='waiting')return {kind:state.owners.includes(c)&&clear?'approach':'hold'};
   if(route?.phase==='ramp')return {kind:'ramp',advance};
   const end=s.h?10.6:8.4,span=end*2;
   for(const other of snapshots){if(other.c===c||other.phase==='ramp'||other.h!==s.h||other.dir!==s.dir||Math.abs(other.lane-s.lane)>.1)continue;const ahead=((other.z-s.z)*s.dir+span)%span;advance=Math.min(advance,Math.max(0,ahead-GAP));}
   if(state.owners.length&&!state.owners.includes(c)){const stop=s.h?(s.dir>0?-7.16:7.16):(s.dir>0?-4.56:2.06),remain=(stop-s.z)*s.dir;if(remain>=0)advance=Math.min(advance,remain);}
   if(route?.phase==='source'){const remain=(cfg.hold-s.z)*s.dir;if(remain>=0&&remain<=advance+EPS)return {kind:'wait',z:cfg.hold};}
   if(route?.phase==='approach'){
    const start=state.paths[route.r][0],startCoord=s.h?start.x:start.z,remain=(startCoord-s.z)*s.dir;
    if(remain>=0&&remain<=advance+EPS)return {kind:'enter',z:startCoord};
   }
   let next=s.z+advance*s.dir;
   if(route?.phase==='destination'&&(next>end||next< -end)){
    const start=route.sourceH?(route.sourceDir>0?-10.6:10.6):(route.sourceDir>0?-8.4:8.4),originSpan=route.sourceH?21.2:16.8;
    const unsafe=snapshots.some(o=>o.c!==c&&o.h===route.sourceH&&o.dir===route.sourceDir&&Math.abs(o.lane-route.sourceLane)<.1&&Math.min(Math.abs(o.z-start),Math.abs(originSpan-Math.abs(o.z-start)))<1.1);
    return unsafe?{kind:'linear',z:s.dir>0?end-EPS:-end+EPS}:{kind:'reenter',z:start};
   }
   if(next>end)next-=span;if(next< -end)next+=span;return {kind:'linear',z:next};
  });
  cars.forEach((c,i)=>{const p=proposals[i],s=c._junctionRoute;
   if(p.kind==='wait'){c.z=p.z;s.phase='waiting';s.ticket=state.nextTicket++}else if(p.kind==='approach'){s.phase='approach'}else if(p.kind==='enter'){c.z=p.z;s.phase='ramp';s.distance=0}else if(p.kind==='ramp'){
    s.distance=Math.min(state.paths[s.r].at(-1).d,s.distance+p.advance);
    if(s.distance>=state.paths[s.r].at(-1).d-EPS){const v=state.paths[s.r].at(-1);if(s.r<2){c.horizontal=true;c.z=v.x;c.lane=v.z;c.dir=s.r===0?-1:1}else{c.horizontal=false;c.z=v.z;c.lane=v.x;c.dir=s.r===2?1:-1}s.phase='destination';state.owners=state.owners.filter(o=>o!==c);}
   }else if(p.kind==='reenter'){c.z=p.z;c.horizontal=s.sourceH;c.dir=s.sourceDir;c.lane=s.sourceLane;s.phase='source'}else if(p.kind==='linear')c.z=p.z;
  });
 }
 for(const c of cars){const s=c._junctionRoute;c.g.rotation.order='YXZ';if(s?.phase==='ramp'){const p=at(state.paths[s.r],s.distance);c.g.position.set(p.x,p.y+.006-.041,p.z);c.g.rotation.set(-Math.atan2(p.dy,Math.hypot(p.dx,p.dz)),Math.atan2(p.dx,p.dz),0,'YXZ')}else if(c.horizontal){c.g.position.set(c.z,0,c.lane);c.g.rotation.set(0,c.dir>0?Math.PI/2:-Math.PI/2,0,'YXZ')}else{const d=(height(c.z+.02)-height(c.z-.02))/.04;c.g.position.set(c.lane,height(c.z)-.041,c.z);c.g.rotation.set(-Math.atan(d*c.dir),c.dir>0?0:Math.PI,0,'YXZ')}}
}
