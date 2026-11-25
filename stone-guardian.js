import {GLTFLoader} from './vendor/GLTFLoader.js';
// Chinatown Lion Statue scan by vmccurley, CC BY 4.0.
// Source + modifications: assets/landmarks/guardian-lion-LICENSE.md and CREDITS.html.
const template=(await new GLTFLoader().loadAsync(new URL('./assets/landmarks/guardian-lion.glb',import.meta.url).href)).scene;
export function createStoneGuardian(T,x,z,side=1){
 const group=new T.Group();group.name='scanned-stone-guardian';group.position.set(x,.09,z);group.scale.set(side<0?-.31:.31,.31,.31);
 const model=template.clone(true);model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;});group.add(model);
 group.userData.attribution='Chinatown Lion Statue — vmccurley — CC BY 4.0';return group;
}
