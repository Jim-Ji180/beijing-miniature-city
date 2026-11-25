import { createFormAtlas } from './cloud-form-atlas.js?v=1';

self.onmessage = ({ data: light }) => {
  const atlas = createFormAtlas(light);
  self.postMessage(atlas, [atlas.buffer]);
};
