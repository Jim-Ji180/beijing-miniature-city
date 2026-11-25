// Based on the Temple of Heaven park's close-up of the upper eaves and the
// documented late-Qing repainting. Round medallions, framed panels and fluted
// blue-green borders are separate features. The dragons lift the foreclaw.
// https://www.mct.gov.cn/whzx/whyw/201112/t20111201_708366.htm
// outputs/temple-v256-review/reference/brackets.jpg
export function createQinianBeamPaint(T, { repeat = 6, radius, bandHeight } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.lineCap = ctx.lineJoin = 'round';
  const ink = '#0a2843', navy = '#16486f', ultramarine = '#1b5d8b';
  const blueGreen = '#216477', jade = '#5caaa1', skyBlue = '#72aeb4';
  const bronze = '#8b622f', gold = '#c79b50', leaf = '#edcf83';
  const medallionAspect = radius && bandHeight ? bandHeight * repeat * 6 / (Math.PI * 2 * radius) : .90;
  const medallionSize = Math.min(1, 151 / (90 * medallionAspect));
  const draw = (d, color, width) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(new Path2D(d));
  };
  const fill = (d, color) => {
    ctx.fillStyle = color; ctx.fill(new Path2D(d));
  };
  const glaze = ctx.createLinearGradient(0, 0, 0, 256);
  glaze.addColorStop(0, ink); glaze.addColorStop(.19, navy);
  glaze.addColorStop(.55, blueGreen); glaze.addColorStop(.94, navy);
  ctx.fillStyle = glaze;
  ctx.fillRect(0, 0, 1536, 256);

  function giltStroke(d, width = 3.2) {
    draw(d, ink, width + 3.5);
    draw(d, bronze, width + 1.6);
    draw(d, gold, width);
    draw(d, leaf, width * .32);
  }

  function waveCloud(x, y, s, mirror = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(mirror ? -s : s, s);
    const edge = 'M-26 10C-21 7-14 8-10 3C-4-1-8-8-2-10C3-17 16-14 18-9C23-10 26-3 22 1C22 8 13 10 10 7C7 14-2 13-7 11C-13 17-22 14-26 10Z';
    fill(edge, blueGreen); draw(edge, jade, 1.5);
    draw('M-19 10Q-11 9-6 4M-1 7C-5 0 1-6 8-6Q19-5 15 2Q11 5 7 1', gold, 1.4);
    ctx.restore();
  }

  function pearl(x, y, size) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
    fill('M0-8A8 8 0 1 1-.001-8Z', gold);
    draw('M0-8A8 8 0 1 1-.001-8Z', leaf, 1.3);
    draw('M-13 3Q-20-5-9-13M11-4Q15-17 23-18M4-11Q7-17 4-22M-5 9Q-17 15-23 10', gold, 1.65);
    ctx.restore();
  }

  function dragon() {
    const body = 'M-92 20C-70 68-14 69 14 45C36 26 24 4-8-3C-39-9-48-23-33-45C-18-67 6-59 21-43C32-31 44-19 57-30C64-37 64-48 61-56';
    draw(body, ink, 20); draw(body, bronze, 17); draw(body, gold, 13.5);
    draw(body, leaf, 6);
    // Nested belly scales and dark spine tips stay legible as the band curves.
    for (const [x,y,rotation] of [[-78,40,45],[-66,51,30],[-49,57,14],[-30,59,3],[-12,56,-15],[5,49,-31],[17,38,-52],[20,23,-107],[11,12,-135],[-6,5,-164],[-24,-2,-153],[-36,-11,-123],[-40,-28,-79],[-32,-42,-45],[-17,-52,-16],[1,-52,23],[15,-44,41],[29,-33,38],[44,-26,8],[57,-32,-48]]) {
      ctx.save(); ctx.translate(x,y); ctx.rotate(rotation*Math.PI/180);
      draw('M-3-4Q4 0-3 4M0-6L3-8L5-6', '#80532e', 1.35);
      ctx.restore();
    }
    const tail = 'M-87 23C-102 26-112 19-110 3Q-109-6-101-11C-102 4-94 10-81 15L-88 18Q-101 20-105 13Q-100 24-92 24Z';
    fill(tail, gold); draw(tail, leaf, 1.5);
    const head = 'M53-49C49-55 44-64 49-67L55-65C53-71 58-76 65-75L72-68Q79-72 89-67L88-61L82-60L94-55L90-49L76-52L71-46Q64-42 55-46Z';
    fill(head, gold); draw(head, ink, 2); draw(head, leaf, 1.4);
    draw('M57-70Q50-77 43-73L40-80 M67-71Q74-77 81-80L87-75 M75-60l3-2M84-55q7 2 13 0M61-57q-12 7-15 17M90-51q14 0 21-10M89-60q11 2 16-3', leaf, 2.1);
    draw('M69-63l4 1M80-56l7 1M63-52q3 4 7 1M51-61q5 3 9 0', ink, 1.55);
    // Raised foreleg and a rear claw, outlined in dark blue like the original.
    for (const d of ['M41-26L50-9L66-11L75-22L84-24M75-22L81-15M77-21L90-18M77-22L86-28', 'M-33-17L-57-21L-65-11L-77-10M-65-11L-72-19M-65-11L-73-3M9 48L24 59L42 58L52 49M44 58l9 3M45 57l6-2']) giltStroke(d, 3);
    for (const [x,y,s,m] of [[-86,-44,.88,false],[33,-70,.55,true],[67,8,.94,true],[-60,70,.50,false],[77,40,.70,true]]) waveCloud(x,y,s,m);
    pearl(99, -9, .63);
  }

  function phoenix() {
    // A compact neck/crest and sweeping paired wings leave a smaller body.
    const shape = 'M43-42C37-49 38-60 50-67Q64-76 70-64L85-65L75-59L81-53L67-52C67-40 60-26 52-17C47-9 36 3 32 13C25 29 4 31-15 23Q-36 16-52 30C-53 20-38 9-26 3L5-10Q31-10 40-29Z';
    fill(shape, gold); draw(shape, ink, 2.5); draw(shape, leaf, 1.3);
    const plumage = [
      'M27 6C11 8-10 1-28-18C-42-33-48-52-69-65C-50-64-29-49-18-35C-6-22 9-15 27-17Z',
      'M30 3Q5-13 10-36Q17-48 33-54C19-30 31-15 43-15Z',
      'M2 21C-10 31-34 28-54 43C-67 52-81 59-99 50C-80 48-65 38-55 30C-40 18-30 13-14 10Z',
      'M-8 24C-11 40-44 49-58 59C-71 67-89 70-106 61Q-83 63-69 53C-50 39-37 31-21 22Z',
      'M6 23C10 35 5 45-5 56C-17 67-42 72-65 69Q-30 61-21 46Q-8 32-12 25Z',
      'M4 16C-23 15-45 15-70 4Q-94-7-100-21C-82-8-61-11-43-3Q-25 5-6 7Z',
    ];
    for (const plume of plumage) {
      fill(plume, gold); draw(plume, ink, 2.4); draw(plume, leaf, 1.4);
    }
    for (const d of ['M-58-57Q-46-37-31-29L-18-20Q-9-14 11-10', 'M-66-55Q-59-35-40-22Q-19 1 8 1','M-87-10Q-61 0-37 4L-12 11','M-83 48Q-58 40-45 27Q-33 20-19 18','M-91 64Q-60 58-47 46Q-22 32-17 29','M-50 67Q-17 58-9 43M26 26q8 7 19 3l16-12M57 18l9 3M43 32q7 4 11 0l10-2','M58-69q6-14 16-14M63-65q13-15 24-11M50-67q-3-10 8-14']) draw(d, leaf, 2.1);
    for (const d of ['M-25-23Q-12-8 8-7M-34-25Q-31-14-15-10M14 8q16-1 26-18M58-60l3-1M52-35q6-1 7-7','M-61 46q-6 9-14 11M-71 33q-3 10-14 11']) draw(d, '#8c5d37', 1.2);
    for (const [x,y,s,m] of [[-95,-42,.72,false],[19,-66,.65,true],[75,-25,.65,true],[79,17,.85,true],[54,58,.70,false]]) waveCloud(x,y,s,m);
  }

  function medallion(center, isDragon) {
    ctx.save(); ctx.translate(center,128); ctx.scale(medallionAspect*medallionSize,medallionSize);
    const circle = (r, color, width) => {
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
      if (width) { ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke(); }
      else { ctx.fillStyle=color; ctx.fill(); }
    };
    circle(90, ink); circle(85, jade, 5); circle(79, gold, 2.3);
    circle(75, isDragon ? ultramarine : blueGreen); circle(71, skyBlue, 2);
    ctx.beginPath(); ctx.arc(0,0,70,0,Math.PI*2); ctx.clip();
    ctx.scale(.56,.68);
    if (isDragon) dragon(); else phoenix();
    ctx.restore();
  }

  function rectangularBay(offset, isDragon) {
    ctx.save(); ctx.translate(offset+384,128);
    const outer = 'M-369-97H369V97H-369Z';
    fill(outer, navy); draw(outer, jade, 5);
    const fangxin = 'M-298-85H-135L-110-58L-124-28L-155 0L-124 28L-110 58L-135 85H-298L-271 54L-284 27L-313 0L-284-27L-271-54Z';
    const fieldWidth = 90 * medallionAspect * medallionSize;
    const flankScale = Math.min(1, (369 - fieldWidth - 8) / (369 - 110));
    for (const sign of [-1,1]) {
      ctx.save(); ctx.scale(sign,1);
      ctx.translate(-369,0); ctx.scale(flankScale,1); ctx.translate(369,0);
      fill(fangxin, ultramarine); draw(fangxin, ink, 14); draw(fangxin, jade, 7); draw(fangxin, leaf, 1.7);
      draw('M-269-74H-146L-127-54L-139-30L-176 0L-139 30L-127 54L-146 74H-269L-253 51L-271 23L-295 0L-271-23L-253-51Z', skyBlue, 3.6);
      const bracket = 'M-235-73H-173L-160-57L-182-29L-173 0L-182 30L-160 56L-173 73H-235L-247 59L-226 29L-236 0L-226-29L-247-59Z';
      fill(bracket, blueGreen); draw(bracket, jade, 3);
      for (const shift of [-48,0,48]) {
        waveCloud(-209,shift,.68,shift===0);
        draw(`M-247 ${shift-6}l6 6-6 6-6-6z M-171 ${shift-6}l6 6-6 6-6-6z`, gold, 1.7);
      }
      for (const yy of [-68,-46,-20,20,46,68]) {
        draw(`M-345 ${yy+5}l5-5 5 5-5 5z`, skyBlue, 2);
        draw(`M-325 ${yy+5}h5`, gold, 2);
      }
      ctx.restore();
    }
    ctx.restore();
    medallion(offset+384, isDragon);
  }

  rectangularBay(0, true);
  rectangularBay(768, false);
  for (const y of [7,230]) {
    ctx.fillStyle = blueGreen; ctx.fillRect(0,y,1536,18);
    draw(`M0 ${y}H1536 M0 ${y+18}H1536`, gold, 2.1);
    draw(`M0 ${y+3.5}H1536 M0 ${y+14.5}H1536`, navy, 1.6);
    for (let x=15;x<1536;x+=24) {
      draw(`M${x-4} ${y+9}l4-4 4 4-4 4z`, jade, 1.7);
      draw(`M${x} ${y+8}v2`, leaf, 1.8);
    }
  }
  // Fine irregular grain softens solid blocks and reflects ageing pigment.
  let seed = 63923;
  for (let i=0;i<15000;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const x = seed % 1536, y = (seed >>> 8) % 256;
    ctx.fillStyle = i % 3 ? 'rgba(2,17,25,0.060)' : 'rgba(236,214,166,0.075)';
    ctx.fillRect(x,y,1+(seed%3),1);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = T.RepeatWrapping;
  texture.repeat.set(repeat,1);
  texture.anisotropy = 8;
  const material=new T.MeshStandardMaterial({map:texture,roughness:.84,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.145});
  material.userData.nightEmission=.022;
  return material;
}

export function createQinianPaintedJointRing(T, radius, height, bandHeight) {
  // Real cover strips sit on the divides between contiguous timbers. These
  // remain visible under specular and side lighting even when zoomed in.
  const material=new T.MeshStandardMaterial({color:'#234d66',roughness:.82});
  const ring=new T.InstancedMesh(new T.BoxGeometry(.0054,bandHeight*.81,.0048),material,12);
  ring.name='Qinian painted timber joints';
  ring.receiveShadow=true;
  const strip=new T.Object3D();
  for (let i=0;i<ring.count;i++) {
    const angle=i*Math.PI*2/ring.count;
    strip.position.set(Math.sin(angle)*(radius+.001),height,Math.cos(angle)*(radius+.001));
    strip.rotation.y=angle;
    strip.updateMatrix();
    ring.setMatrixAt(i,strip.matrix);
  }
  ring.instanceMatrix.needsUpdate=true;
  return ring;
}
