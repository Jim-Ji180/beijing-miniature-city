const root=document.createElement('aside');root.className='parameter-cards';root.setAttribute('aria-label','场景参数');document.body.append(root);
function card(id,title,nodes){const section=document.createElement('section');section.id=id;section.className='control-card glass-surface';const h=document.createElement('h2');const b=document.createElement('button');b.className='card-disclosure';b.textContent=title;b.setAttribute('aria-expanded','true');const content=document.createElement('div');content.className='parameter-body';content.id=id+'-options';b.setAttribute('aria-controls',content.id);for(const n of nodes)if(n)content.append(n);if(id!=='cloud-card'||matchMedia('(max-width: 1120px)').matches){content.hidden=true;b.setAttribute('aria-expanded','false');}b.onclick=()=>{
 const opening=content.hidden;
 content.hidden=!opening;
 b.setAttribute('aria-expanded',String(opening));
 if(opening&&matchMedia('(max-width: 900px)').matches)
  requestAnimationFrame(()=>section.scrollIntoView({block:'nearest',inline:'nearest'}));
};h.append(b);section.append(h,content);root.append(section);}
const row=id=>document.querySelector('#'+id)?.closest('.range-row,.switch-row,.segmented');
card('cloud-card','云',[row('cloud-amount'),row('cloud-thickness')]);
card('rain-card','雨',[row('rain-amount')]);
card('wind-card','风',[row('wind-amount')]);
card('snow-card','雪',[row('weather-snow')]);
card('rainbow-card','彩虹',[row('weather-rainbow')]);
card('lightning-card','雷电',[row('weather-lightning')]);
card('vehicles-card','交通',[row('traffic-cars'),row('traffic-signals'),row('render-quality')]);
card('sunlight-card','昼夜',[row('day-mode'),document.querySelector('.solar-time'),row('weather-sun')]);
document.querySelectorAll('.weather-column,.city-settings,.control-dock').forEach(el=>el.remove());

const cards=[...root.children];
const left=document.createElement('div'),right=document.createElement('div');left.className='parameter-column left';right.className='parameter-column right';root.append(left,right);cards.forEach((c,i)=>(i%2?right:left).append(c));
