// Illustration lines come from the current view, including building creases
// and overlaps, so they stay registered as the camera rotates.
export function createCinematicFinish(T, renderer, {samples = 4} = {}) {
  const bufferSize = new T.Vector2();
  renderer.getDrawingBufferSize(bufferSize);
  const target = new T.WebGLRenderTarget(bufferSize.x, bufferSize.y, {
    type: T.HalfFloatType,
    format: T.RGBAFormat,
    colorSpace: T.LinearSRGBColorSpace,
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
    samples,
    resolveDepthBuffer: true,
  });
  target.texture.name = 'CinematicFinish.LinearScene';
  target.texture.generateMipmaps = false;
  target.depthTexture = new T.DepthTexture(bufferSize.x, bufferSize.y, T.UnsignedIntType);
  target.depthTexture.format = T.DepthFormat;
  target.depthTexture.minFilter = T.NearestFilter;
  target.depthTexture.magFilter = T.NearestFilter;
  target.depthTexture.generateMipmaps = false;
  target.depthTexture.name = 'CinematicFinish.SceneDepth';
  // Cloud volumes sample a completed opaque depth buffer in a separate target.
  // Half resolution keeps soft scattering affordable without a depth feedback loop.
  const atmosphereTarget = new T.WebGLRenderTarget(Math.max(1,bufferSize.x>>1),Math.max(1,bufferSize.y>>1), {
    type:T.HalfFloatType,format:T.RGBAFormat,depthBuffer:false,samples:0,
    minFilter:T.LinearFilter,magFilter:T.LinearFilter,colorSpace:T.LinearSRGBColorSpace
  });
  const atmosphereScene=new T.Scene(),atmosphereSize=new T.Vector2(),savedClear=new T.Color();
  const atmosphereView=new T.Matrix4(),atmosphereProjection=new T.Matrix4();
  let atmosphereTime=-Infinity;
  let atmosphereRevision=-1;
  let atmosphere;

  // Keep the miniature foreground clear: daylight contrast belongs to the scene
  // key/fill lights, rather than a contrast filter or a veil over every facade.
  // Public uniforms deliberately expose the small calibration amounts. Values
  // refer to the linear scene, except saturation which follows tone mapping.
  const uniforms = {
    tColor: { value: target.texture },
    tDepth: { value: target.depthTexture },
    tAtmosphere: { value: atmosphereTarget.texture },
    uHasAtmosphere: { value: 0 },
    uResolution: { value: bufferSize.clone() },
    uInverseProjection: { value: new T.Matrix4() },
    uWorldHeight: { value: new T.Vector4() },
    uProjectionScale: { value: 1 },
    uPerspective: { value: 1 },
    uAoWorldRadius: { value: .17 },
    uAoStrength: { value: .43 },
    uAirNear: { value: 32 },
    uAirFar: { value: 76 },
    uAirStrength: { value: .019 },
    uAirColor: { value: new T.Color('#c4c0bb') },
    uWarmHighlights: { value: .25 },
    uGoldFinish: { value: .14 },
    uCoolShadows: { value: .14 },
    uSaturation: { value: .95 },
    uGreenSaturation: { value: .04 },
    uAtlasLight: { value: 1 },
    uQuietContours: { value: 0 },
    uMiniature: { value: 0 },
    uPixelRatio: { value: 1 },
  };

  const material = new T.ShaderMaterial({
    name: 'CinematicFinish',
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
    blending: T.NoBlending,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform sampler2D tAtmosphere;
      uniform float uHasAtmosphere;
      uniform vec2 uResolution;
      uniform mat4 uInverseProjection;
      uniform vec4 uWorldHeight;
      uniform float uProjectionScale;
      uniform float uPerspective;
      uniform float uAoWorldRadius;
      uniform float uAoStrength;
      uniform float uAirNear;
      uniform float uAirFar;
      uniform float uAirStrength;
      uniform vec3 uAirColor;
      uniform float uWarmHighlights;
      uniform float uGoldFinish;
      uniform float uCoolShadows;
      uniform float uSaturation;
      uniform float uGreenSaturation;
      uniform float uAtlasLight;
      uniform float uQuietContours;
      uniform float uMiniature;
      uniform float uPixelRatio;
      varying vec2 vUv;

      vec3 viewPosition(vec2 uv, float depth) {
        vec4 p = uInverseProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
        return p.xyz / p.w;
      }

      float viewDistance(vec2 uv) {
        float depth = texture2D(tDepth, uv).r;
        float ndcZ = depth * 2.0 - 1.0;
        vec4 p = uInverseProjection[2] * ndcZ + uInverseProjection[3];
        return -p.z / p.w;
      }

      float lumaAt(vec2 uv) {
        return dot(texture2D(tColor, uv).rgb, vec3(.2126,.7152,.0722));
      }

      // Protect depth boundaries and material seams from distant detail diffusion.
      float detailEdge(float distance, vec2 offset, float luma, float foliage) {
        vec2 x = vec2(offset.x,0.), y = vec2(0.,offset.y);
        float a = viewDistance(vUv-x), b = viewDistance(vUv+x);
        float c = viewDistance(vUv-y), d = viewDistance(vUv+y);
        float scale = max(.007, distance / (uProjectionScale / uPixelRatio));
        float corner = max(abs(a+b-2.*distance),abs(c+d-2.*distance)) / scale;
        float outerBank = max(max(a,b),max(c,d)) - distance;
        float innerBank = distance - min(min(a,b),min(c,d));
        float jump = max(outerBank,innerBank)/scale;
        float minJump = mix(.70,1.55,foliage);
        float outline = smoothstep(.28,1.42,corner) * smoothstep(minJump,2.80+foliage,outerBank/scale);
        float fold = smoothstep(.22,.95,corner) * (1.-smoothstep(2.35,4.3,jump));
        float crisp = max(outline,fold*mix(.64,.13,foliage));
        float contour = mix(smoothstep(.12,1.25,corner)*.75,crisp,uAtlasLight);
        // Use the darker bank to measure contrast at a material boundary.
        float bright = max(max(lumaAt(vUv-x),lumaAt(vUv+x)),max(lumaAt(vUv-y),lumaAt(vUv+y)));
        float seam = smoothstep(.16, .63, (bright-luma)/max(bright,.12));
        float edge = max(contour,seam*mix(.37,mix(.42,.21,foliage),uAtlasLight));
        // In the close precinct view, protect widely separated surfaces more
        // strongly than shallow trim from the distance filter.
        float separation = smoothstep(.028,.140,outerBank);
        float primary = outline*separation*mix(.78,.67,foliage);
        float detail = max(fold*mix(.16,.06,foliage),seam*mix(.115,.055,foliage));
        return mix(edge,max(primary,detail),uQuietContours*uAtlasLight);
      }

      vec3 illustrateColor(vec3 linearColor) {
        vec3 color = sqrt(max(linearColor,0.));
        const vec3 luminance = vec3(.2126,.7152,.0722);
        float value = dot(color,luminance);
        // Bring blue glazing and foliage out of the toe before applying the
        // bands. Bright roofs already have enough range for a clean edge.
        float midLow = smoothstep(.045,.15,value)*(1.-smoothstep(.35,.69,value));
        float bright = smoothstep(.53,.86,value)*(1.-value);
        float contrast = clamp(value+.081*midLow+.12*bright,0.,1.);
        float level = contrast*7.;
        float bands = (floor(level)+smoothstep(.17,.83,fract(level)))/7.;
        float shaded = mix(contrast,bands,.26);
        color *= (shaded+.027)/(value+.027);
        float coolShadow = smoothstep(.07,.19,value)*(1.-smoothstep(.42,.70,value));
        float neutrality = 1.-smoothstep(.12,.38,max(color.r,max(color.g,color.b))-min(color.r,min(color.g,color.b)));
        color += vec3(-.016,-.003,.023)*coolShadow*neutrality;
        color = clamp(color,0.,1.);
        return color*color;
      }

      // The radius is measured in model units, then projected into pixels. A
      // distance gate rejects remote silhouettes, so this cannot draw outlines
      // or darken a flat road simply because a tower is in front of it.
      float contactOcclusion(vec3 position, vec3 normal, float derivativeSize) {
        if (derivativeSize > uAoWorldRadius * 4.0) return 0.0;
        float projectionDepth = mix(1.0, max(-position.z, 1.0), uPerspective);
        float radius = clamp(uAoWorldRadius * uProjectionScale / projectionDepth, 1.5, 8.0);
        float result = 0.0;
        for (int i = 0; i < 8; i++) {
          float angle = (float(i) + .25) * .78539816339;
          float ring = mod(float(i), 2.0) < .5 ? .65 : 1.0;
          vec2 uv = vUv + vec2(cos(angle), sin(angle)) * radius * ring / uResolution;
          if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) continue;
          float depth = texture2D(tDepth, uv).x;
          if (depth >= .999999) continue;
          vec3 delta = viewPosition(uv, depth) - position;
          float distanceToSample = length(delta);
          float hemisphere = max(dot(normal, delta / max(distanceToSample, .0001)) - .15, 0.0);
          float nearby = 1.0 - smoothstep(uAoWorldRadius * .30, uAoWorldRadius * 2.6, distanceToSample);
          result += hemisphere * nearby;
        }
        return clamp(result * .275, 0.0, .65);
      }

      void main() {
        vec4 source = texture2D(tColor, vUv);
        float depth = texture2D(tDepth, vUv).x;
        float geometry = depth < .999999 ? 1.0 : 0.0;
        vec3 color = source.rgb;
        float lensFalloff = 0.;
        float stone = 0.0;
        float warmStone = 0.0;
        float urbanSurface = 1.;
        // Derivatives stay outside the geometry/background branch, including
        // silhouette pixels whose 2x2 derivative quad overlaps the background.
        vec3 position = viewPosition(vUv, depth);
        vec3 dpdx = dFdx(position), dpdy = dFdy(position);
        if (geometry > .5) {
          vec2 pixel=uPixelRatio/uResolution;
          urbanSurface=smoothstep(-.15,-.04,dot(vec4(position,1.),uWorldHeight));
          float greenDominance=(color.g-max(color.r,color.b))/(color.g+.07);
          float foliage=smoothstep(.13,.32,greenDominance);
          float yFromFocus=abs(vUv.y-.50);
          lensFalloff=uMiniature*smoothstep(.37,.50,yFromFocus);
          vec3 normal = normalize(cross(dpdx, dpdy));
          float occlusion = contactOcclusion(position, normal, max(length(dpdx), length(dpdy)));
          color *= 1.0 - uAoStrength * occlusion;

          float brightest = max(color.r, max(color.g, color.b));
          float darkest = min(color.r, min(color.g, color.b));
          float chroma = (brightest - darkest) / max(brightest, .001);
          // Hue exclusion keeps yellow-lit cream stone eligible even when its
          // linear chroma is high. Protect green foliage, blue glass/tiles and
          // red walls; a generic chroma cutoff incorrectly excluded warm stone.
          vec3 hue = color / max(color.r + color.g + color.b, .001);
          float greenHue = smoothstep(.04, .16, hue.g - max(hue.r, hue.b));
          float blueHue = smoothstep(.04, .14, hue.b - hue.r);
          float redHue = smoothstep(.12, .24, hue.r - hue.g);
          stone = 1.0 - max(greenHue, max(blueHue, redHue));
          warmStone = stone * smoothstep(.04, .18, chroma) * smoothstep(.01, .05, hue.r - hue.b);
          float neutral = 1.0 - smoothstep(.20, .58, chroma);
          float luminance = dot(color, vec3(.2126, .7152, .0722));
          float key = luminance / (luminance + .35);
          float highlights = smoothstep(.45, .78, key) * warmStone;
          float shadows = 1.0 - smoothstep(.25, .60, key);
          color *= mix(vec3(1.0), vec3(1.10, 1.018, .875), highlights * uWarmHighlights);
          color *= mix(vec3(1.0), vec3(.965, .98, 1.12), shadows * uCoolShadows * (.35 + .65 * neutral));
          color += vec3(.006, .008, .016) * shadows * neutral * uCoolShadows;

          float air = smoothstep(uAirNear, max(uAirFar, uAirNear + .01), -position.z) * uAirStrength * mix(1.,.30,uAtlasLight);
          color = mix(color, uAirColor, air);

        }

        // The scene target is linear HDR and never tone mapped by WebGLRenderer.
        // Only this screen pass applies the renderer's selected tone mapping,
        // followed by the single linear-to-output color-space conversion.
        gl_FragColor = vec4(max(color, 0.0), source.a);
        #include <tonemapping_fragment>
        if (geometry > .5) {
          // A restrained display-linear correction survives ACES highlight
          // desaturation. It affects sunlit cream/grey surfaces, not the whole
          // image, and leaves saturated architectural/foliage hues protected.
          float displayLuma = dot(gl_FragColor.rgb, vec3(.2126, .7152, .0722));
          float gold = smoothstep(.30, .64, displayLuma) * warmStone * uGoldFinish * mix(1.,.44,uAtlasLight);
          vec3 golden = gl_FragColor.rgb * vec3(1.16, 1.00, .76);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, golden, gold);
          float nightCool = 1.0 - smoothstep(.14,.38,displayLuma);
          float dayCool = 1.0 - smoothstep(.15,.45,displayLuma);
          float cool = mix(nightCool,dayCool,uAtlasLight)*stone*uCoolShadows;
          vec3 coolShade = gl_FragColor.rgb * mix(vec3(.95,.975,1.15),vec3(.79,.92,1.26),uAtlasLight);
          coolShade += mix(vec3(.003,.006,.015),vec3(.005,.011,.023),uAtlasLight);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, coolShade, cool * .65);
          float luma = dot(gl_FragColor.rgb, vec3(.2126, .7152, .0722));
          float green = smoothstep(.012, .13, gl_FragColor.g - max(gl_FragColor.r, gl_FragColor.b));
          float blue = smoothstep(.025,.17,gl_FragColor.b - gl_FragColor.r);
          float clay = smoothstep(.045,.24,gl_FragColor.r - gl_FragColor.g) *
            smoothstep(.035,.20,gl_FragColor.r - gl_FragColor.b);
          float saturation = uSaturation + green*uGreenSaturation +
            uAtlasLight*(.035 + .06*green + .11*blue + .08*clay);
          gl_FragColor.rgb = clamp(mix(vec3(luma), gl_FragColor.rgb, saturation), 0.0, 1.0);
          float illustration = uAtlasLight*mix(.38,1.,urbanSurface);
          gl_FragColor.rgb = mix(gl_FragColor.rgb,illustrateColor(gl_FragColor.rgb),illustration);
        } else {
          // A solid Color background is a presentation canvas, not lit scenery.
          // Preserve its agreed sRGB appearance instead of tone mapping it.
          gl_FragColor.rgb = source.rgb;
        }
        if (uHasAtmosphere > .5) {
          vec4 scattering=texture2D(tAtmosphere,vUv);
          vec3 combined=color*(1.-clamp(scattering.a,0.,1.))+scattering.rgb;
          // Add the HDR scattering's display contribution while retaining the
          // existing studio backdrop and the calibrated architectural finish.
          #ifdef TONE_MAPPING
            gl_FragColor.rgb+=toneMapping(combined)-toneMapping(color);
          #else
            gl_FragColor.rgb+=combined-color;
          #endif
          gl_FragColor.rgb=max(gl_FragColor.rgb,vec3(0.));
          if(geometry < .5 && scattering.a > .001){
            vec3 cloudColor=scattering.rgb/max(scattering.a,.001);
            #ifdef TONE_MAPPING
              cloudColor=toneMapping(cloudColor);
            #endif
            gl_FragColor.rgb=mix(source.rgb,cloudColor,clamp(scattering.a,0.,1.));
          }
        }
        #include <colorspace_fragment>
      }
    `,
  });

  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const screen = new T.Scene();
  const quad = new T.Mesh(geometry, material);
  quad.frustumCulled = false;
  screen.add(quad);
  const screenCamera = new T.Camera();
  let disposed = false;
  const direction = new T.Vector3();

  // A stationary view can reuse one soft scattering texture for up to 33 ms.
  // Motion, weather controls and resizing fall back to the current depth buffer.
  function renderAtmosphere(camera) {
    const visible=atmosphere && atmosphere.hasVisibleClouds !== false;
    uniforms.uHasAtmosphere.value=visible?1:0;
    if (!visible) {
      atmosphereTime=-Infinity;
      return;
    }
    const now=performance.now();
    const revision=atmosphere.revision ?? 0;
    if (now-atmosphereTime<1000/30 && revision===atmosphereRevision &&
        atmosphereView.equals(camera.matrixWorld) && atmosphereProjection.equals(camera.projectionMatrix)) return;
    renderer.getClearColor(savedClear);
    const alpha=renderer.getClearAlpha();
    try {
      renderer.setRenderTarget(atmosphereTarget);
      renderer.setClearColor(0x000000,0);
      renderer.render(atmosphereScene,camera);
    } finally {
      renderer.setClearColor(savedClear,alpha);
    }
    atmosphereTime=now;
    atmosphereRevision=revision;
    atmosphereView.copy(camera.matrixWorld);
    atmosphereProjection.copy(camera.projectionMatrix);
  }

  return {
    uniforms,
    setAtmosphere(controller) {
      if(atmosphere)atmosphereScene.remove(atmosphere.group);
      atmosphere=controller;atmosphereTime=-Infinity;
      if(controller){atmosphereScene.add(controller.group);atmosphereSize.set(atmosphereTarget.width,atmosphereTarget.height);controller.setSceneDepth(target.depthTexture,atmosphereSize);}
    },
    // Match renderer.setSize(w, h): callers pass CSS pixels, not drawing pixels.
    resize(w, h) {
      if (disposed) return;
      const ratio = renderer.getPixelRatio();
      uniforms.uPixelRatio.value = ratio;
      const width = Math.max(1, Math.round(w * ratio));
      const height = Math.max(1, Math.round(h * ratio));
      target.setSize(width, height);
      atmosphereTarget.setSize(Math.max(1,width>>1),Math.max(1,height>>1));
      atmosphereTime=-Infinity;
      atmosphereSize.set(atmosphereTarget.width,atmosphereTarget.height);
      atmosphere?.setSceneDepth(target.depthTexture,atmosphereSize);
      uniforms.uResolution.value.set(width, height);
    },
    render(scene, camera) {
      if (disposed) return;
      const previousTarget = renderer.getRenderTarget();
      const previousAutoClear = renderer.autoClear;
      const previousXrEnabled = renderer.xr.enabled;
      try {
        renderer.autoClear = true;
        renderer.xr.enabled = false;
        uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse);
        camera.updateMatrixWorld();
        const world=camera.matrixWorld.elements;
        uniforms.uWorldHeight.value.set(world[1],world[5],world[9],world[13]);
        uniforms.uProjectionScale.value = Math.abs(camera.projectionMatrix.elements[5]) * target.height * .5;
        uniforms.uPerspective.value = camera.isOrthographicCamera ? 0 : 1;
        const slope=-camera.getWorldDirection(direction).y;
        uniforms.uMiniature.value=T.MathUtils.smoothstep(slope,.34,.68)*T.MathUtils.smoothstep(camera.position.y,2.7,12)*.32;
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderAtmosphere(camera);
        renderer.setRenderTarget(previousTarget);
        renderer.render(screen, screenCamera);
      } finally {
        renderer.setRenderTarget(previousTarget);
        renderer.autoClear = previousAutoClear;
        renderer.xr.enabled = previousXrEnabled;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      target.dispose();
      atmosphereTarget.dispose();
      material.dispose();
      geometry.dispose();
    },
  };
}
