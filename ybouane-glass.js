import { LiquidGlass } from './vendor/ybouane/index.js';
const root=document.createElement('div');root.id='glass-root';document.body.append(root);
const backdrop=document.createElement('canvas');backdrop.className='glass-backdrop';backdrop.dataset.dynamic='';root.append(backdrop);
const ctx=backdrop.getContext('2d');
const elements=[...document.querySelectorAll('.parameter-cards .control-card,#tools')];
for(const el of elements){el.classList.add('optical-glass');el.dataset.config=JSON.stringify({cornerRadius:26,zRadius:18,refraction:.69,blurAmount:.8,chromAberration:.04,edgeHighlight:.12,specular:.15,fresnel:1,shadowOpacity:.12,shadowSpread:12,brightness:.025});}
let instance,last=0;
function copy(t){
 const source=document.querySelector('#stage canvas');
 if(source && t-last>33){last=t; if(backdrop.width!==innerWidth||backdrop.height!==innerHeight){backdrop.width=innerWidth;backdrop.height=innerHeight;}ctx.drawImage(source,0,0,backdrop.width,backdrop.height);instance?.markChanged(backdrop);}
 requestAnimationFrame(copy);
}
requestAnimationFrame(copy);
for(const el of elements){const r=el.getBoundingClientRect();el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.width=r.width+'px';root.append(el);}
function layout(){const mobile=innerWidth<700;const w=mobile?Math.min(220,innerWidth-24):224;const gap=12;const cols=mobile?1:2;const heights=[16,16];elements.filter(el=>el.id!=='tools').forEach((el,i)=>{const col=i%cols;el.style.width=w+'px';el.style.left=(mobile?innerWidth-16-w:(col===0?16:innerWidth-16-w))+'px';el.style.top=heights[col]+'px';heights[col]+=el.offsetHeight+gap;});}
layout();window.addEventListener('resize',layout);root.addEventListener('click',()=>requestAnimationFrame(layout));
try{instance=await LiquidGlass.init({root,glassElements:elements});document.documentElement.dataset.glassEngine='ybouane-1.0.3';}catch(e){console.error('LiquidGlass initialization failed',e);root.classList.add('glass-fallback');}
