import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';

// Navigation uses individual floors and walls as raycast targets. An
// InstancedMesh is excluded from those checks, so retain that geometry intact.
function usesNavigation(bounds,size,minHeightOffset,maxHeightOffset){
  bounds.getSize(size);
  const spansFloor=bounds.max.y+maxHeightOffset>=.035&&bounds.max.y+minHeightOffset<=.17&&
    bounds.min.y+maxHeightOffset>=-.06&&size.x>.07&&size.z>.07;
  const blocksPath=bounds.min.y+minHeightOffset<=.145&&bounds.max.y+maxHeightOffset>.22&&
    size.y>.16&&size.x>.06&&size.z>.06;
  return spansFloor||blocksPath;
}

// Batch one static group at a time so construction and culling keep working
// at the original group boundaries. Preserve the original UVs and normals.
export function batchStaticDecoration(T,parent,{heightOffset=0}={}){
  const bounds=new T.Box3(),size=new T.Vector3();
  const groups=new Map();
  for(const mesh of parent.children){
    const geometry=mesh.geometry,material=mesh.material;
    if(mesh.type!=='Mesh'||mesh.children.length||!mesh.visible||mesh.name||
      Object.keys(mesh.userData).length||!material?.isMaterial||material.transparent||!material.visible||
      mesh.customDepthMaterial||mesh.customDistanceMaterial||mesh.morphTargetInfluences||
      geometry.type==='LatheGeometry'||geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity)continue;
    const layout=Object.entries(geometry.attributes).sort(([a],[b])=>a.localeCompare(b));
    if(layout.some(([,attribute])=>attribute.isInterleavedBufferAttribute||attribute.isInstancedBufferAttribute))continue;
    if(mesh.matrixAutoUpdate)mesh.updateMatrix();
    if(mesh.matrix.determinant()<=0)continue;
    if(!geometry.boundingBox)geometry.computeBoundingBox();
    bounds.copy(geometry.boundingBox).applyMatrix4(mesh.matrix);
    if(usesNavigation(bounds,size,Math.min(0,heightOffset),Math.max(0,heightOffset)))continue;

    const attributes=layout.map(([name,attribute])=>[name,attribute.itemSize,attribute.normalized,attribute.array.constructor.name,attribute.gpuType].join(':')).join(',');
    const key=[material.id,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder,mesh.layers.mask,mesh.frustumCulled,Boolean(geometry.index),attributes].join('/');
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(mesh);
  }

  const identity=new T.Matrix4();
  for(const parts of groups.values()){
    if(parts.length<3)continue;
    const first=parts[0];
    const sameGeometry=parts.every(part=>part.geometry===first.geometry);
    let geometry=first.geometry;
    if(!sameGeometry){
      const transformed=parts.map(part=>part.geometry.clone().applyMatrix4(part.matrix));
      geometry=mergeGeometries(transformed);
      for(const copy of transformed)copy.dispose();
      if(!geometry)continue;
    }
    const batch=new T.InstancedMesh(geometry,first.material,sameGeometry?parts.length:1);
    if(sameGeometry){
      parts.forEach((part,index)=>batch.setMatrixAt(index,part.matrix));
    }else{
      batch.setMatrixAt(0,identity);
    }
    batch.castShadow=first.castShadow;
    batch.receiveShadow=first.receiveShadow;
    batch.renderOrder=first.renderOrder;
    batch.layers.mask=first.layers.mask;
    batch.frustumCulled=first.frustumCulled;
    batch.instanceMatrix.needsUpdate=true;
    batch.name='static-decoration-batch';
    parent.remove(...parts);
    parent.add(batch);
  }
}
