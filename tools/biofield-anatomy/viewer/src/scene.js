// Biofield Anatomy 3D: the scene. Plain Three.js, no engine. Knows nothing about wording; app.js drives it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// skin regions the app can light, by name (order matters: it is the index into the shader's uReg array)
export const REGIONS = ['feet', 'ankles', 'knees', 'thighs', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'arms', 'shoulders', 'neck', 'lowerface', 'head',
  'topofhead', 'lowpelvis', 'torso', 'lowback', 'midback', 'upperback', 'lowbelly', 'upbelly', 'chest', 'glutes', 'hips', 'ears', 'mouth', 'forehead', 'backofhead', 'whole', 'nose'];
const NREG = REGIONS.length;
const IN = 0.0254, FT = 0.3048;

export function createScene(stage, MODEL, hooks, opts = {}) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ZONES = MODEL.zones; const MID = MODEL.body.mid;   // MID: depth of the body's mid-plane (front is +z)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  let pr = Math.min(devicePixelRatio || 1, 2), slow = 0; renderer.setPixelRatio(pr);
  renderer.setClearColor(0x0b0c13, 1);
  const bgTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const r = g.createRadialGradient(256, 200, 0, 256, 200, 430); r.addColorStop(0, '#171a30'); r.addColorStop(0.5, '#0e1020'); r.addColorStop(0.78, '#0b0c13'); r.addColorStop(1, '#07080d');
    g.fillStyle = r; g.fillRect(0, 0, 512, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = bgTex;
  let composer = null, glowOn = !window.__BFA_NOGLOW, lastInput = 0, hold = 0; const wake = (t = 1.6) => { hold = Math.max(hold, t); };
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
  controls.minDistance = 0.35; controls.maxDistance = 22; controls.minPolarAngle = 0.2; controls.maxPolarAngle = 2.3;
  controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.8; controls.zoomToCursor = true; controls.cursorStyle = 'grab';
  if (opts.embed) { controls.enableZoom = false; controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2 - THREE.MathUtils.degToRad(2); renderer.domElement.style.touchAction = 'pan-y'; }

  // ---------- shared uniforms ----------
  const colors = ZONES.map((z) => new THREE.Color(z.color)); colors.push(new THREE.Color(MODEL.neutral));
  const U = {
    uColors: { value: colors },
    uReg: { value: new Float32Array(NREG) },   // how strongly each skin region is lit
    uSide: { value: 0 },      // 0 both sides, 1 the figure's left only, -1 right only
    uFB: { value: 0 },        // 0 front and back, 1 front only, -1 back only
    uSelAmt: { value: 0 },    // 0..1, eased: something is selected
    uTime: { value: 0 },
    uXray: { value: 0 },      // 1 in the all organs view
    uOpen: { value: 1 },      // how far lit skin opens to show what is inside
    uGhost: { value: 0 },     // 1 when a single inner part is shown: the rest of the body fades right back
    uNeutral: { value: 0 },   // 1 in the zodiac view: no chakra rainbow on the skin
    uHiMix: { value: 0 },     // 1: light with uHiColor in place of the local chakra colour
    uHiColor: { value: new THREE.Color('#f2d28a') },
    uHov: { value: -1 }, uHovAmt: { value: 0 },   // zone under the pointer
    uSeg: { value: 0 },       // 0..1: the legs drawn as separate pieces (thighs, knees, shins and ankles, feet)
    uSegHov: { value: new THREE.Vector3(0, 0, 0) },   // the piece under the pointer: bottom, top, amount
    uLegs: { value: new THREE.Vector2(MODEL.legs.top, MODEL.legs.bottom) },
    uZodAmt: { value: 0 },    // 0..1: the zodiac body, each sign's area in its own colour
    uZodW: { value: new Float32Array(12).fill(1) },
    uZodEdge: { value: opts.zodEdge || 0 },   // 0..1: a fine light line where one sign's area ends
    uZodCol: { value: Array.from({ length: 12 }, (_, i) => new THREE.Color((opts.signs && opts.signs[i] && opts.signs[i].color) || '#888888')) },
  };
  const REACH = 5.5 * FT;                       // where the field edge is drawn (distances come from the reviewed map)
  const BODY_A = 0.20, BODY_B = 0.13, CY = 0.83; // body half width and half depth, and its mid height
  const SUN_Y = MODEL.body.height + 8 * IN, EARTH_Y = -0.22;   // the Sun Star and the Earth Star: the two ends of the central channel
  const ZONE_GLSL = /* glsl */`
    uniform vec3 uColors[9]; uniform float uSelAmt; uniform float uTime; uniform float uXray; uniform float uOpen; uniform float uGhost;
    uniform float uNeutral; uniform float uHiMix; uniform vec3 uHiColor;
    vec3 zoneColor(float zc){
      zc = clamp(zc, 0.0, 6.999); int i = int(floor(zc)); float f = smoothstep(0.02, 0.98, fract(zc));
      vec3 a = uColors[0]; vec3 b = uColors[1];
      for (int k = 0; k < 7; k++) { if (k == i) { a = uColors[k]; b = uColors[k + 1]; } }
      return mix(a, b, f);
    }
  `;
  const VERT = /* glsl */`
    varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main(){
      vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vW = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * mv;
    }`;
  // Region masks: zc is the chakra coordinate painted on the skin (0 legs .. 7 crown), p the world position, arm the arm fade.
  // One GLSL expression per region, in REGIONS order; the selection light and the zodiac colours are both built from them.
  const PRE = /* glsl */`float y = p.y; float ax = abs(p.x); float dz = p.z - ${MID.toFixed(3)};
      float front = S(-0.02, 0.02, dz); float back = 1.0 - front;
      float notArm = 1.0 - S(0.04, 0.14, arm);
      float leg = (1.0 - S(0.80, 0.98, zc)) * notArm;`;
  const MASK = [
    'leg * (1.0 - S(0.075, 0.115, y))',
    'leg * S(0.075, 0.115, y) * (1.0 - S(0.36, 0.42, y))',
    'leg * S(0.36, 0.42, y) * (1.0 - S(0.54, 0.60, y))',
    'S(0.54, 0.60, y) * (1.0 - S(0.80, 1.02, zc)) * notArm',
    'band(zc, 1.0) * notArm * S(0.70, 0.80, y)',
    'band(zc, 2.0) * notArm', 'band(zc, 3.0) * notArm', 'band(zc, 4.0) * notArm', 'band(zc, 5.0)', 'band(zc, 6.0)', 'S(6.3, 6.8, zc)',
    'S(0.04, 0.14, arm)',
    'S(0.07, 0.14, ax) * S(1.17, 1.30, y) * (1.0 - S(1.36, 1.42, y)) * (1.0 - S(0.2, 0.6, arm))',
    '(1.0 - S(0.055, 0.115, ax)) * S(1.33, 1.40, y) * (1.0 - S(1.452, 1.478, y))',
    '(1.0 - S(0.25, 0.6, abs(zc - 5.0))) * S(1.45, 1.475, y)',
    'S(1.452, 1.478, y) * notArm',
    'S(6.3, 6.8, zc)',
    'front * (1.0 - S(0.45, 1.0, length(vec2(p.x / 0.115, (y - 0.845) / 0.09))))',
    'S(1.3, 1.7, zc) * (1.0 - S(4.45, 4.8, zc)) * notArm',
    'band(zc, 2.0) * back * notArm', 'band(zc, 3.0) * back * notArm', 'band(zc, 4.0) * back * notArm * (1.0 - S(0.16, 0.20, ax))',
    'band(zc, 2.0) * front * notArm', 'band(zc, 3.0) * front * notArm', 'band(zc, 4.0) * front * notArm',
    '(1.0 - S(0.25, 0.6, abs(zc - 1.0))) * back * S(0.72, 0.78, y)',
    'band(zc, 1.0) * S(0.075, 0.115, ax) * S(0.74, 0.80, y) * notArm',
    'S(0.058, 0.068, ax) * S(1.465, 1.49, y) * (1.0 - S(1.60, 1.62, y)) * (1.0 - S(0.25, 0.6, abs(zc - 5.0)))',
    '(1.0 - S(0.035, 0.05, ax)) * S(1.462, 1.474, y) * (1.0 - S(1.508, 1.52, y)) * S(0.085, 0.105, p.z)',
    'S(1.565, 1.585, y) * (1.0 - S(1.63, 1.65, y)) * S(0.03, 0.08, p.z)',
    'S(1.49, 1.52, y) * (1.0 - S(1.63, 1.655, y)) * (1.0 - S(-0.03, 0.015, p.z))',
    '1.0',
    '(1.0 - S(0.02, 0.032, ax)) * S(1.50, 1.515, y) * (1.0 - S(1.56, 1.578, y)) * S(0.12, 0.135, p.z)',
  ];
  if (MASK.length !== NREG) throw new Error('region masks out of step with REGIONS');
  const REGION_GLSL = /* glsl */`
    uniform float uReg[${NREG}]; uniform float uSide; uniform float uFB;
    float S(float a, float b, float x){ return smoothstep(a, b, x); }
    float band(float zc, float k){ return 1.0 - S(0.42, 0.9, abs(zc - k)); }
    float regionWeight(float zc, vec3 p, float arm){
      ${PRE}
      float w = 0.0; float wl = 0.0;
      ${[0, 1, 2, 3].map((i) => `if (uReg[${i}] > 0.001) wl += uReg[${i}] * ${MASK[i]};`).join('\n      ')}
      w = max(w, min(wl, 1.0));
      ${MASK.map((m, i) => (i < 4 ? '' : `if (uReg[${i}] > 0.001) w = max(w, uReg[${i}] * ${m});`)).join('\n      ')}
      float sideW = mix(1.0, S(-0.03, 0.03, p.x * uSide), abs(uSide));
      float fbW = mix(1.0, S(-0.035, 0.035, dz * uFB), abs(uFB));
      return w * sideW * fbW;
    }
    // the zodiac body: each sign paints its own regions in its own colour, later signs over earlier ones (broad areas first)
    uniform float uZodAmt; uniform float uZodW[12]; uniform vec3 uZodCol[12]; uniform float uZodEdge;
    vec4 zodiac(float zc, vec3 p, float arm, out float edge){
      ${PRE}
      vec3 c = vec3(0.0); float a = 0.0; float ws = 0.0; edge = 0.0; float wm = 0.0; float wr = 0.0;
      ${(opts.signs || []).slice(0, 12).map((sg, i) => { const ent = Object.entries(sg.regions || {}).filter(([n]) => REGIONS.includes(n)); const mx = Math.max(0.001, ...ent.map(([, w]) => w));
        return `ws = 0.0; wm = 0.0; ${ent.map(([n, w]) => `wr = ${MASK[REGIONS.indexOf(n)]}; ws = max(ws, ${(w / mx).toFixed(3)} * wr); wm = max(wm, wr);`).join(' ')} edge = max(edge * (1.0 - step(0.5, wm)), (1.0 - smoothstep(0.6, 1.7, abs(wm - 0.5) / max(fwidth(wm), 0.0005))) * (0.35 + 0.65 * uZodW[${i}])); ws *= uZodW[${i}]; c = c * (1.0 - ws) + uZodCol[${i}] * ws; a = a * (1.0 - ws) + ws;`; }).join('\n      ')}
      return vec4(c, a);
    }`;

  const skinMat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: VERT, transparent: true, depthWrite: false, side: THREE.FrontSide,
    fragmentShader: /* glsl */`
      ${ZONE_GLSL}
      ${REGION_GLSL}
      uniform vec2 uLegs; uniform float uHov; uniform float uHovAmt; uniform float uSeg; uniform vec3 uSegHov;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        float zc = vUv.x * 7.0; vec3 col = zoneColor(zc);
        // legs: one even gradient by height, root red at the top of the thighs to the deep red at the soles
        float legT = clamp((uLegs.x - vW.y) / (uLegs.x - uLegs.y), 0.0, 1.0);
        vec3 legCol = pow(mix(pow(uColors[1], vec3(1.0 / 2.2)), pow(uColors[0], vec3(1.0 / 2.2)), legT), vec3(2.2));
        col = mix(col, legCol, 1.0 - smoothstep(0.9, 1.0, zc));
        col = mix(col, vec3(0.62, 0.70, 0.78), smoothstep(0.45, 1.0, vUv.y) * 0.42);   // only the hands ease toward a pale neutral
        col = mix(col, vec3(0.30, 0.34, 0.52), uNeutral);
        float zEdge = 0.0; if (uZodAmt > 0.001) { vec4 zo = zodiac(zc, vW, vUv.y, zEdge); col = col * (1.0 - zo.a * uZodAmt) + zo.rgb * uZodAmt; }
        float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
        float rim = pow(1.0 - ndv, 2.0);
        float w = regionWeight(zc, vW, vUv.y);
        float breath = 0.5 + 0.5 * sin(uTime * 1.6);
        vec3 hi = mix(col, uHiColor, uHiMix);
        float open = max(uSelAmt * w * uOpen, uXray * 0.85);
        float key = 0.5 + 0.5 * dot(normalize(vN), normalize(vec3(0.30, 0.55, 0.78)));
        float legMask = (1.0 - smoothstep(0.9, 1.0, zc)) * (1.0 - smoothstep(0.04, 0.14, vUv.y));
        float fill = (0.20 + 0.34 * key + 0.10 * pow(ndv, 3.0)) * mix(1.0, 0.70, legMask * (1.0 - uSelAmt) * (1.0 - uNeutral));   // form light; the legs sit back a little when nothing is chosen
        vec3 c = col * fill + col * rim * 0.92 + mix(col, vec3(1.0, 0.96, 0.9), 0.5) * pow(rim, 3.5) * 0.34;
        float hz = mix(max(zc, 0.0), 4.0, step(0.3, vUv.y)); float hov = uHovAmt * (1.0 - smoothstep(0.42, 0.62, abs(floor(hz + 0.5) - uHov))) * (1.0 - uSelAmt * 0.6);
        c += col * hov * (0.16 + 0.5 * rim) * (1.0 - 0.75 * uSeg);
        if (uSeg > 0.001) {   // each piece of the leg gets a light outline all the way round (the same heights the app uses to tell them apart); the piece under the pointer glows
          float fy = max(fwidth(vW.y), 0.0004);
          float sd = min(min(abs(vW.y - 0.095), abs(vW.y - 0.39)), abs(vW.y - 0.57));
          float cut = 1.0 - smoothstep(0.7, 1.7, sd / fy);                                                // one fine line at each joint (Chance, 2026-11-13: single, not double)
          float top = 1.0 - smoothstep(0.7, 1.7, abs(legMask - 0.5) / max(fwidth(legMask), 0.0005));       // the top of the thigh
          float piece = smoothstep(uSegHov.x - 0.004, uSegHov.x + 0.004, vW.y) * (1.0 - smoothstep(uSegHov.y - 0.004, uSegHov.y + 0.004, vW.y)) * uSegHov.z * legMask;
          vec3 lite = mix(col, vec3(1.0, 0.95, 0.88), 0.74);
          c += lite * uSeg * ((cut * legMask + top) * (0.50 + 0.55 * piece) + pow(rim, 2.4) * legMask * (0.30 + 0.45 * piece));
          c += col * piece * (0.42 + 1.15 * rim) + lite * piece * pow(rim, 3.0) * 0.35;
        }
        float rest = uSelAmt * (1.0 - w);
        vec3 grey = vec3(dot(c, vec3(0.3, 0.5, 0.2)));
        c = mix(c, mix(grey, c, 0.4) * 0.2 + vec3(0.012, 0.014, 0.03), rest * mix(0.95, 0.84, uZodAmt));                 // the rest of the body goes dark
        c = mix(c, hi * (0.5 + 1.1 * rim), w * uSelAmt * uHiMix * 0.85);
        c += hi * w * uSelAmt * (0.17 + 0.05 * breath) * (0.45 + rim) * (1.22 - 0.3 * uOpen);
        c += vec3(1.0, 0.97, 0.90) * zEdge * uZodEdge * uZodAmt * 0.6;
        float a = 0.80 + 0.2 * rim;
        a = mix(a, 0.10 + 0.85 * rim, open);
        a = mix(a, a * 0.78, rest);
        a = mix(a, 0.07 + 0.72 * rim, uGhost * (1.0 - w));
        c = mix(c, c * 0.7, uGhost * (1.0 - w));
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  });
  const prepassMat = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

  function organMaterial(zoneIndex, tint) {
    return new THREE.ShaderMaterial({
      uniforms: { ...U, uOpacity: { value: 0 }, uActive: { value: 0 }, uZone: { value: zoneIndex }, uTint: { value: tint } },
      vertexShader: VERT, transparent: true, depthWrite: true, side: THREE.DoubleSide,
      fragmentShader: /* glsl */`
        ${ZONE_GLSL}
        uniform float uOpacity; uniform float uActive; uniform float uZone; uniform float uTint;
        varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main(){
          vec3 col = uColors[0];
          for (int k = 0; k < 9; k++) { if (float(k) == uZone) col = uColors[k]; }
          col = uTint > 0.0 ? mix(col, vec3(1.0, 0.97, 0.9), uTint) : col * (1.0 + uTint);
          col = mix(col, mix(uHiColor, vec3(1.0, 0.97, 0.92), 0.16), uHiMix);
          vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0); vec3 v = normalize(vV);
          float ndv = clamp(dot(n, v), 0.0, 1.0);
          float key = 0.5 + 0.5 * dot(n, normalize(vec3(0.35, 0.6, 0.72)));
          float rim = pow(1.0 - ndv, 2.5);
          vec3 quiet = mix(col, vec3(0.55, 0.58, 0.70), 0.72) * (0.22 + 0.5 * key);
          float occ = 0.55 + 0.45 * ndv;
          vec3 hv = normalize(normalize(vec3(0.35, 0.6, 0.72)) + v); float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 38.0);
          vec3 deep = col * vec3(0.55, 0.42, 0.50);   // the shadow side leans deeper in hue, so a part has form
          vec3 lit = mix(deep, col, pow(key, 1.5)) * (0.22 + 0.66 * pow(key, 1.4)) * occ + mix(col, vec3(1.0), 0.25) * rim * 0.32 + vec3(1.0, 0.97, 0.92) * spec * 0.22;
          gl_FragColor = vec4(mix(quiet, lit, uActive), uOpacity);
          #include <colorspace_fragment>
        }`,
    });
  }

  // ---------- the aura: the body's own light, spread softly around its outline. The skin is drawn alone into a small buffer,
  // blurred wide, and laid behind the figure. Because it is one blur of one picture, glow never stacks into a brighter patch where
  // an arm passes the torso or one leg the other, and each part of the halo carries the colour of the skin beside it. (The three
  // shell meshes aura_1..3 are still in the model and are simply not drawn; drop them at the next model rebuild.) ----------
  const AURA_GAIN = 0.62, AURA_STEPS = [1, 2, 3.3];
  const aur = { rtA: null, rtB: null, show: 0, on: !window.__BFA_NOAURA };   // __BFA_NOAURA: a switch for measuring what the aura costs
  const fsVert = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const blurMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: fsVert, depthTest: false, depthWrite: false,
    fragmentShader: /* glsl */`uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tex, vUv) * 0.227027;
        c += (texture2D(tex, vUv + dir) + texture2D(tex, vUv - dir)) * 0.1945946; c += (texture2D(tex, vUv + dir * 2.0) + texture2D(tex, vUv - dir * 2.0)) * 0.1216216;
        c += (texture2D(tex, vUv + dir * 3.0) + texture2D(tex, vUv - dir * 3.0)) * 0.054054; c += (texture2D(tex, vUv + dir * 4.0) + texture2D(tex, vUv - dir * 4.0)) * 0.016216;
        gl_FragColor = c; }` });
  const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat); q.frustumCulled = false; fsScene.add(q); }
  const auraQuadMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, uAmt: { value: 0 } }, vertexShader: fsVert, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    fragmentShader: /* glsl */`uniform sampler2D tex; uniform float uAmt; varying vec2 vUv;
      void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb * uAmt, 1.0);
        #include <colorspace_fragment>
      }` });
  const auraQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), auraQuadMat); auraQuad.frustumCulled = false; auraQuad.renderOrder = -0.6; auraQuad.visible = false; scene.add(auraQuad);
  const _cc = new THREE.Color();
  function renderAura() {
    auraQuad.visible = aur.on && !!skin && !!aur.rtA && auraQuadMat.uniforms.uAmt.value > 0.004; if (!auraQuad.visible) return;
    const bg = scene.background, ca = renderer.getClearAlpha(); renderer.getClearColor(_cc); scene.background = null; renderer.setClearColor(0x000000, 1);
    camera.layers.set(1); renderer.setRenderTarget(aur.rtA); renderer.clear(); renderer.render(scene, camera); camera.layers.set(0);
    scene.background = bg; renderer.setClearColor(_cc, ca);
    const w = aur.rtA.width, h = aur.rtA.height;
    for (const st of AURA_STEPS) { blurMat.uniforms.tex.value = aur.rtA.texture; blurMat.uniforms.dir.value.set(st / w, 0); renderer.setRenderTarget(aur.rtB); renderer.render(fsScene, fsCam);
      blurMat.uniforms.tex.value = aur.rtB.texture; blurMat.uniforms.dir.value.set(0, st / h); renderer.setRenderTarget(aur.rtA); renderer.render(fsScene, fsCam); }
    renderer.setRenderTarget(null); auraQuadMat.uniforms.tex.value = aur.rtA.texture;
  }
  // thin parts (nerves) get a soft halo so they never shrink to a hairline
  const HALO = { vagus: 0.0034, sciatic_l: 0.0045, sciatic_r: 0.0045 };
  const haloMat = (zoneIndex, d) => new THREE.ShaderMaterial({
    uniforms: { ...U, uD: { value: d }, uA: { value: 0 }, uZone: { value: zoneIndex } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uD; varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position + normal * uD / length(modelMatrix[0].xyz), 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform vec3 uColors[9]; uniform float uA; uniform float uZone; uniform float uHiMix; uniform vec3 uHiColor; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 col = uColors[0]; for (int k = 0; k < 9; k++) { if (float(k) == uZone) col = uColors[k]; }
        col = mix(mix(col, vec3(1.0, 0.95, 0.9), 0.22), uHiColor, uHiMix);
        float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
        gl_FragColor = vec4(col * (0.25 + 0.75 * pow(ndv, 1.5)) * uA * 0.34, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  // ---------- a faint colour wash far behind the body ----------
  function auraTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
    const lin = g.createLinearGradient(0, 512, 0, 0);
    ZONES.forEach((z, i) => lin.addColorStop(0.08 + 0.84 * (i / 7), z.color));
    g.fillStyle = lin; g.fillRect(0, 0, 256, 512);
    g.globalCompositeOperation = 'destination-in';
    const rad = g.createRadialGradient(128, 256, 10, 128, 256, 250);
    rad.addColorStop(0, 'rgba(0,0,0,0.55)'); rad.addColorStop(0.45, 'rgba(0,0,0,0.22)'); rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(128, 256); g.scale(0.5, 1); g.translate(-128, -256); g.fillStyle = rad; g.fillRect(-256, 0, 768, 512); g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const auraMat = new THREE.MeshBasicMaterial({ map: auraTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.1 });
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.9), auraMat);
  aura.position.set(0, 0.86, MID); aura.renderOrder = -3; auraMat.depthTest = false; scene.add(aura);

  function dotTexture(star) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.14, 'rgba(255,255,255,.9)'); r.addColorStop(0.3, 'rgba(255,255,255,.3)'); r.addColorStop(0.62, 'rgba(255,255,255,.1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    if (!star) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,255,.34)'; g.lineWidth = 1.2; g.beginPath(); g.arc(64, 64, 27, 0, Math.PI * 2); g.stroke(); }
    if (star) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.4;
      [[64, 4, 64, 124], [4, 64, 124, 64]].forEach(([a, b, c2, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); }); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const texDot = dotTexture(false), texStar = dotTexture(true);
  const sprite = (tex, color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); return s; };

  // ---------- backdrop depth: fine dust all around the figure, fixed in the room so it turns with the body ----------
  { const N_DUST = 420; const pos = new Float32Array(N_DUST * 3); let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < N_DUST; i++) { const a = rnd() * Math.PI * 2, u = rnd() * 2 - 1, r = 1.5 + Math.pow(rnd(), 0.7) * 3.6, q = Math.sqrt(1 - u * u); pos[i * 3] = Math.cos(a) * q * r; pos[i * 3 + 1] = 0.9 + u * r * 0.8; pos[i * 3 + 2] = MID + Math.sin(a) * q * r; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(g, new THREE.PointsMaterial({ map: texDot, color: 0xcfd3ee, size: 0.02, sizeAttenuation: true, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending })); dust.renderOrder = -2; scene.add(dust); }

  // ---------- the torus: a faint current around the body, one shape and one scale with the field. Each family of threads is the
  // field shell's own apple profile; the outermost family lies on the field's edge, the next one in is the same shape at 54%, where
  // its two dimples sit exactly on the Sun Star and the Earth Star. Every thread leaves one star through a funnel, rounds the outside
  // and enters the other. It is part of the room, not the screen, so it keeps its place as the body turns. Half the threads carry
  // the descending current down the outside, half the ascending current up. ----------
  const flowU = { uFlowT: { value: 0 }, uFlowA: { value: 0 } };
  const flow = new THREE.Group(); scene.add(flow);
  { const SEG = 220, R0 = BODY_A + REACH, H0 = CY + REACH, STAR = (SUN_Y - EARTH_Y) / 2, CYF = (SUN_Y + EARTH_Y) / 2;
    // [share of the field's size, threads, turn offset, apex stretch]: the inmost family is drawn a little taller so it can still reach the stars
    const FAMILIES = [[0.38, 8, 0.0, 1.24], [0.541, 9, 0.29, 1], [0.76, 10, 0.11, 1], [1.0, 12, 0.4, 1]];
    const P = [], LL = [], EE = [], SD = [], DR = [], RD = []; let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; let line = 0;
    FAMILIES.forEach(([sc, count, off, stretch]) => { const R = R0 * sc, A = Math.max(H0 * sc * stretch, STAR * 1.04), d = 1 - STAR / A;   // d: how deep the funnel must be for the thread to meet the star
      const prof = (i) => { const t = (i / SEG) * Math.PI, sn = Math.sin(t); const g = 1 - Math.pow(1 - Math.exp(-Math.pow(sn / 0.3, 2)), 0.42); return [R * sn, CYF + A * Math.cos(t) * (1 - d * g)]; };
      const pts = []; for (let i = 0; i <= SEG; i++) pts.push(prof(i)); const len = [0]; for (let i = 1; i <= SEG; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); const total = len[SEG];
      for (let k = 0; k < count; k++, line++) { const phi = (k + off) / count * Math.PI * 2; const sd = rnd(), dir = line % 2 ? 1 : -1; const cx = Math.cos(phi), cz = Math.sin(phi);
        for (let i = 0; i < SEG; i++) for (const j of [i, i + 1]) { P.push(cx * pts[j][0], pts[j][1], MID + cz * pts[j][0]); LL.push(dir > 0 ? len[j] : total - len[j]); EE.push(Math.min(len[j], total - len[j])); SD.push(sd); DR.push(dir); RD.push(cx, cz); } } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aLen', new THREE.Float32BufferAttribute(LL, 1)); g.setAttribute('aEnd', new THREE.Float32BufferAttribute(EE, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(SD, 1)); g.setAttribute('aDir', new THREE.Float32BufferAttribute(DR, 1)); g.setAttribute('aRad', new THREE.Float32BufferAttribute(RD, 2));
    const m = new THREE.ShaderMaterial({ uniforms: flowU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`attribute float aLen; attribute float aEnd; attribute float aSeed; attribute float aDir; attribute vec2 aRad; varying float vS; varying float vSeed; varying float vDir; varying float vEnd; varying float vFade;
        void main(){ vS = aLen; vSeed = aSeed; vDir = aDir; vEnd = aEnd;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // threads between the eye and the body step back, and so does anything close to the lens: the current surrounds the figure, it never veils it
          vec2 vd = normalize(cameraPosition.xz - vec2(0.0, ${MID.toFixed(3)}) + vec2(0.0001));
          vFade = (1.0 - 0.82 * smoothstep(0.1, 0.8, dot(aRad, vd))) * smoothstep(0.5, 1.7, -mv.z);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`uniform float uFlowT; uniform float uFlowA; varying float vS; varying float vSeed; varying float vDir; varying float vEnd; varying float vFade;
        void main(){
          float ph = fract(vS * 0.42 - uFlowT * (0.085 + 0.03 * vSeed) + vSeed * 7.0);         // vS is metres along the thread, so every pulse travels at a walking-slow, even pace
          float pulse = pow(ph, 9.0) + 0.4 * pow(fract(ph + 0.43 + 0.2 * vSeed), 16.0);       // a bright head with a tail behind it, travelling the way the current runs
          float ends = 0.14 + 0.86 * smoothstep(0.0, 0.45, vEnd);                              // the threads gather at the two stars without piling into a knot
          vec3 col = vDir > 0.0 ? vec3(0.96, 0.90, 0.78) : vec3(0.72, 0.80, 1.0);              // descending: warm; ascending: cool
          gl_FragColor = vec4(col * (0.0105 + 0.085 * pulse) * ends * vFade * uFlowA, 1.0);
          #include <colorspace_fragment>
        }` });
    const lines = new THREE.LineSegments(g, m); lines.frustumCulled = false; lines.renderOrder = 3; flow.add(lines);
    // the two ends, as pinpoints, and the channel between them where it leaves the body
    const fs = sprite(texDot, new THREE.Color('#fff0c4'), 0.075), fe = sprite(texDot, new THREE.Color('#ffc9a6'), 0.075); fs.position.set(0, SUN_Y, MID); fe.position.set(0, EARTH_Y, MID); fs.renderOrder = fe.renderOrder = 3; flow.add(fs, fe); flow.userData.stars = [fs, fe];
    const ax = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, EARTH_Y, MID), new THREE.Vector3(0, SUN_Y, MID)]), new THREE.LineBasicMaterial({ color: 0xefe9dc, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending })); ax.renderOrder = 3; flow.add(ax); flow.userData.axis = ax; }

  // ---------- chakra lights: inside the body on the central line (x 0, the mid-plane depth) and drawn over it, so they stay in one
  // vertical column however the figure is turned (Chance, 2026-11-13). Tap one to open its center. ----------
  const orbs = ZONES.map((z, i) => {
    const s = sprite(texDot, new THREE.Color(i === 0 ? z.dot : z.color), 0.085);
    s.position.set(0, i === 0 ? 0.47 : i === 7 ? 1.70 : z.y + (i === 6 ? 0.025 : 0), MID); s.renderOrder = 6; s.userData = { amt: 0, sel: 0 };
    scene.add(s); return s;
  });

  // ---------- glow for the reproductive area: a lit zone, no organ meshes ----------
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uGlow: { value: 0 }, uCol: { value: new THREE.Color(ZONES[2].color) } }, vertexShader: VERT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    fragmentShader: /* glsl */`
      uniform float uGlow; uniform vec3 uCol; uniform float uTime; uniform float uHiMix; uniform vec3 uHiColor; varying vec3 vN; varying vec3 vV;
      void main(){ float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
        vec3 c = mix(uCol, uHiColor, uHiMix);
        gl_FragColor = vec4(c * pow(ndv, 2.2) * uGlow * (0.8 + 0.2 * sin(uTime * 1.6)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const reproGlow = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), glowMat);
  reproGlow.scale.set(0.085, 0.062, 0.062); reproGlow.position.set(0, 0.845, 0.05); reproGlow.renderOrder = 0; reproGlow.visible = false; scene.add(reproGlow);

  // ---------- the field: edge, timeline rings, central channel, stars, rivers, parent zones, adrenal field ----------
  const field = new THREE.Group(); field.visible = false; scene.add(field);
  const F = { amt: 0, on: false, focus: null, age: 40, parts: {} };
  const fieldMat = (layer) => new THREE.ShaderMaterial({
    uniforms: { ...U, uFade: { value: 0 }, uLayer: { value: layer } }, vertexShader: VERT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    fragmentShader: /* glsl */`
      ${ZONE_GLSL}
      uniform float uFade; uniform float uLayer; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        float zc = clamp((vW.y + 0.9) / 3.5, 0.0, 1.0) * 7.0; vec3 col = mix(zoneColor(zc), vec3(0.80, 0.85, 1.0), 0.86);   // a cool pearl with a breath of the body's colours
        float rim = pow(1.0 - clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 3.0);
        float shimmer = 0.85 + 0.15 * sin(uTime * 0.6 + vW.y * 2.2 + uLayer * 2.1);
        gl_FragColor = vec4(col * rim * shimmer * (0.30 - 0.10 * uLayer) * uFade, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  {
    // torus-like shell: an apple shape, dimpled where the central channel passes through at the top and bottom
    const R = BODY_A + REACH, H = CY + REACH;
    const prof = (scale) => { const pts = []; for (let i = 0; i <= 64; i++) { const t = (i / 64) * Math.PI; const s = Math.sin(t);
      pts.push(new THREE.Vector2(R * scale * s, H * scale * Math.cos(t) * (1 - 0.24 * Math.exp(-Math.pow(s / 0.3, 2))))); } return pts; };
    F.shells = [1, 0.972].map((sc, i) => { const m = new THREE.Mesh(new THREE.LatheGeometry(prof(sc), 72), fieldMat(i)); m.position.y = CY; m.renderOrder = 4 + i; field.add(m); return m; });
    // timeline rings, drawn at the height of the solar plexus
    F.rings = new THREE.Group(); F.rings.position.y = 1.10; field.add(F.rings);
    // central channel
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1cf, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, depthTest: false }));
    F.sunY = SUN_Y; F.earthY = EARTH_Y;
    ch.scale.y = F.sunY - F.earthY; ch.position.set(0, (F.sunY + F.earthY) / 2, MID); ch.renderOrder = 5; field.add(ch); F.parts.channel = [ch];
    const sun = sprite(texStar, new THREE.Color('#fff0c4'), 0.26); sun.position.set(0, F.sunY, MID); sun.renderOrder = 7; field.add(sun); F.parts.sunstar = [sun];
    const earth = sprite(texStar, new THREE.Color('#ffb38a'), 0.24); earth.position.set(0, F.earthY, MID); earth.renderOrder = 7; field.add(earth); F.parts.earthstar = [earth];
    // ancestral rivers, one each side: soft ribbons that taper to nothing at both ends and always face the viewer (Chance, 2026-11-14)
    const ribbon = (tint, x, y, w, h, phase) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 56), new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uFade: { value: 0 }, uTintC: { value: new THREE.Color(tint) }, uBase: { value: new THREE.Vector3(x, y, MID) }, uW: { value: w }, uH: { value: h }, uPhase: { value: phase } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: /* glsl */`uniform float uTime; uniform float uW; uniform float uH; uniform float uPhase; uniform vec3 uBase; varying vec2 vUv;
        void main(){ vUv = uv;
          float sway = 0.020 * sin(uv.y * 5.5 + uTime * 0.45 + uPhase) + 0.008 * sin(uv.y * 13.0 - uTime * 0.6 + uPhase * 2.0);   // a slow drift along its length
          vec3 c = uBase + vec3(sway, (uv.y - 0.5) * uH, sway * 0.6);
          vec3 toCam = cameraPosition - c; vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x) + vec3(0.00001, 0.0, 0.0));
          float taper = pow(sin(3.14159265 * clamp(uv.y, 0.0, 1.0)), 0.55);
          gl_Position = projectionMatrix * viewMatrix * vec4(c + right * (uv.x - 0.5) * uW * (0.3 + 0.7 * taper), 1.0); }`,
      fragmentShader: /* glsl */`uniform float uFade; uniform vec3 uTintC; uniform float uTime; uniform float uPhase; varying vec2 vUv;
        void main(){ float x = abs(vUv.x - 0.5) * 2.0;
          float across = pow(1.0 - x, 1.7);                                                       // brightest along the middle, nothing at the edges
          float ends = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
          float flow = 0.62 + 0.24 * sin(vUv.y * 11.0 - uTime * 0.8 + uPhase) + 0.14 * sin(vUv.y * 23.0 - uTime * 1.3 + x * 3.0);
          gl_FragColor = vec4(uTintC * across * ends * flow * 0.2 * uFade, 1.0);
          #include <colorspace_fragment>
        }` })); m.frustumCulled = false; m.renderOrder = 5; field.add(m); return m; };
    F.riverX = BODY_A + 10 * IN;
    F.parts.rivers = [[1, '#d9d4ff', 0.0], [-1, '#ffe2a8', 1.7]].map(([sgn, tint, ph]) => ribbon(tint, sgn * F.riverX, 0.9, 0.15, 2.7, ph));
    // mother and father zones: two small fixed discs
    F.zoneX = 0.15 + 10 * IN;
    F.parts.parents = [[1, '#d9d4ff'], [-1, '#ffe2a8']].map(([sgn, tint]) => { const g = new THREE.Group();
      const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.025, 28), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
      puck.rotation.z = Math.PI / 2; g.add(puck); const halo = sprite(texDot, new THREE.Color(tint), 0.16); g.add(halo);
      g.position.set(sgn * F.zoneX, 1.10, MID); g.renderOrder = 6; field.add(g); return g; });
    // edge of the adrenal field
    const ell = (a, b, n = 160) => { const p = []; for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2; p.push(new THREE.Vector3(Math.cos(t) * a, 0, Math.sin(t) * b)); } return new THREE.BufferGeometry().setFromPoints(p); };
    F.ell = ell;
    const ad = new THREE.Line(ell(0.14 + 3 * FT, 0.11 + 3 * FT), new THREE.LineDashedMaterial({ color: 0xf7cf2a, transparent: true, opacity: 0.7, dashSize: 0.06, gapSize: 0.05, depthWrite: false }));
    ad.computeLineDistances(); ad.position.set(0, 1.10, MID); field.add(ad); F.parts.adrenal = [ad];
    // quiet extras that only show when their topic is open
    const hip = sprite(texDot, new THREE.Color('#ff9a7a'), 0.34); hip.position.set(0.36, 0.80, MID); field.add(hip); F.parts.lefthip = [hip];
    const ditch = ribbon('#8fb4ff', 0.30, 1.02, 0.2, 1.15, 0.9); F.parts.ditch = [ditch];
    F.always = ['channel', 'sunstar', 'earthstar', 'rivers', 'parents', 'adrenal']; F.quiet = ['lefthip', 'ditch'];
  }
  function buildRings() {
    while (F.rings.children.length) { const c = F.rings.children.pop(); c.geometry.dispose(); c.material.dispose(); }
    F.ticks = [];
    const age = F.age; const step = age <= 24 ? 4 : age <= 60 ? 10 : 20; const marks = [0];
    for (let a = step; a < age - step * 0.35; a += step) marks.push(a);
    marks.forEach((a) => {
      const f = 1 - a / age;                       // 1 at the edge (birth), 0 at the skin (now)
      const g = F.ell(BODY_A + REACH * f, BODY_B + REACH * f);
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xe9d7a6, transparent: true, opacity: a === 0 ? 0.75 : 0.42, depthWrite: false }));
      l.position.z = MID; F.rings.add(l);
      F.ticks.push({ age: a, pos: [-(BODY_A + REACH * f) * 0.7071, 1.10, MID + (BODY_B + REACH * f) * 0.7071] });
    });
    F.ticks.push({ age, now: true, pos: [-(BODY_A + 0.03) * 0.7071, 1.10, MID + (BODY_B + 0.03) * 0.7071] });
  }
  buildRings();
  const fieldAnchors = () => ({
    edge: [-(BODY_A + REACH) * 0.72, CY + (CY + REACH) * 0.66, MID], timeline: [(BODY_A + REACH * 0.5), 1.10, MID],
    channel: [0, 0.40, MID], sunstar: [0, F.sunY, MID], earthstar: [0, F.earthY, MID],
    riverL: [F.riverX, 1.62, MID], riverR: [-F.riverX, 1.62, MID], mother: [F.zoneX, 1.10, MID], father: [-F.zoneX, 1.10, MID],
    adrenal: [(0.14 + 3 * FT) * 0.7071, 1.10, MID + (0.11 + 3 * FT) * 0.7071], lefthip: [0.36, 0.80, MID], ditch: [0.30, 1.30, MID],
    left: [0.75, 1.9, MID], right: [-0.75, 1.9, MID], front: [0, 1.25, MID + 0.75], back: [0, 1.25, MID - 0.75],
  });

  // ---------- load the model ----------
  const TINT = { heart: -0.34, lung_l: 0.24, lung_r: 0.24, liver: -0.22, stomach: 0.12, spleen: -0.3, pancreas: 0.3, gallbladder: 0.45, kidney_l: -0.05, kidney_r: -0.05, adrenal_l: 0.4, adrenal_r: 0.4,
    small_intestine: 0.14, bladder: -0.2, large_intestine: -0.05, appendix: 0.5, hip_l: 0.3, hip_r: 0.3, brain: 0.12, eye_l: 0.3, eye_r: 0.3, pineal: 0.7, pituitary: 0.55, thyroid: -0.1, trachea: 0.35,
    larynx: 0.2, jaw: 0.45, sinuses: 0.3, diaphragm: -0.12, sciatic_l: 0.55, sciatic_r: 0.55, vagus: 0.1, spine_neck: 0.3, spine_upper: 0.3, spine_mid: 0.3, spine_low: 0.3, spine_tail: 0.3 };
  const organs = new Map();   // id -> { mesh, zone, opacity, active, tOp, tAct }
  let skin = null, ready = false;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const onModel = (gltf) => {
    const root = gltf.scene; scene.add(root); const add = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (/^aura_/.test(o.name)) { o.visible = false; }
      else if (o.name === 'skin') { skin = o; o.material = skinMat; o.renderOrder = 2; o.layers.enable(1); const pre = new THREE.Mesh(o.geometry, prepassMat); pre.renderOrder = 1; pre.layers.enable(1); add.push([o.parent, pre, o]); }
      else { const id = o.name.replace(/^(organ_|axis_)/, ''); const zone = o.userData.zone ?? 8;
        o.material = organMaterial(zone, TINT[id] ?? 0); o.renderOrder = 0; o.visible = false;
        const rec = { mesh: o, zone, opacity: 0, active: 0, tOp: 0, tAct: 0 }; organs.set(id, rec);
        if (HALO[id]) { const hm = new THREE.Mesh(o.geometry, haloMat(zone, HALO[id])); hm.renderOrder = 0.6; hm.visible = false; rec.halo = hm; add.push([o.parent, hm, o]); } }
    });
    add.forEach(([parent, pre, src]) => { pre.position.copy(src.position); pre.quaternion.copy(src.quaternion); pre.scale.copy(src.scale); parent.add(pre); });
    ready = true; hooks.onReady && hooks.onReady();
  };
  const onModelError = (e) => { hooks.onError && hooks.onError(e); console.error(e); };
  if (window.__BFA_MODEL_B64) {   // preview build: the model rides along inside a script file
    const bin = atob(window.__BFA_MODEL_B64); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    window.__BFA_MODEL_B64 = null; loader.parse(buf.buffer, '', onModel, onModelError);
  } else loader.load(window.__BFA_MODEL_URL || 'body.glb', onModel, undefined, onModelError);

  // ---------- camera choreography ----------
  let tween = null, lastFrame = MODEL.body.frame, lastOpts = {}, lastFa = null, paused = false, lastTouch = -1e9;
  const freeArea = () => { const W = renderer.domElement.clientWidth || 1, H = renderer.domElement.clientHeight || 1; const r = hooks.freeRect ? hooks.freeRect() : { x0: 0, y0: 0, x1: W, y1: H };
    return { ...r, W, H, w: Math.max(0.2, (r.x1 - r.x0) / W), h: Math.max(0.2, (r.y1 - r.y0) / H), cx: (r.x0 + r.x1) / 2, cy: (r.y0 + r.y1) / 2 }; };
  function fitDistance(fw, fh) {
    const fa = freeArea(); const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    return Math.max((fh / 2) / t / fa.h, (fw / 2) / (t * camera.aspect) / fa.w) * 1.1;
  }
  function applyOffset() { const fa = freeArea(); lastFa = fa; camera.setViewOffset(fa.W, fa.H, fa.W / 2 - fa.cx, fa.H / 2 - fa.cy, fa.W, fa.H); camera.updateProjectionMatrix(); }
  function setCamera(v) {
    const sp = Math.sin(v.pol);
    camera.position.set(v.target.x + v.dist * sp * Math.sin(v.az), v.target.y + v.dist * Math.cos(v.pol), v.target.z + v.dist * sp * Math.cos(v.az));
    controls.target.copy(v.target); camera.lookAt(v.target);
  }
  function readCamera() { const d = camera.position.clone().sub(controls.target); const s = new THREE.Spherical().setFromVector3(d); return { target: controls.target.clone(), az: s.theta, pol: s.phi, dist: s.radius }; }
  function flyTo(frame, opts = {}) {
    wake(2.2); if (!opts.sway) sway = false;
    lastFrame = frame; lastOpts = { az: opts.az, keepAz: opts.keepAz };
    const from = readCamera();
    const to = { target: new THREE.Vector3(frame.x || 0, frame.y, frame.z ?? MID), az: opts.keepAz ? from.az : THREE.MathUtils.degToRad(opts.az ?? frame.az ?? 0),
      pol: Math.PI / 2 - THREE.MathUtils.degToRad(frame.tilt ?? 2), dist: Math.min(fitDistance(frame.w, frame.h), controls.maxDistance) };
    let d = to.az - from.az; d = Math.atan2(Math.sin(d), Math.cos(d)); to.az = from.az + d;   // shortest way round
    if (opts.instant || reduceMotion) { setCamera(to); controls.update(); tween = null; return; }
    tween = { from, to, t: 0, dur: opts.dur ?? 1.2 };
  }
  controls.addEventListener('start', () => { tween = null; });
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // ---------- look: what is lit ----------
  const look = { regions: new Float32Array(NREG), sel: 0, xray: 0, open: 1, ghost: 0, neutral: 0, himix: 0, glow: 0, side: 0, fb: 0, orbs: 0, orbSel: -1, aura: 0.5, zod: 0, zodW: new Float32Array(12).fill(1), flow: 1, seg: 0, segHov: 0 };
  function setLook(l) {
    wake(2.2);
    look.regions.fill(0);
    for (const [name, w] of Object.entries(l.regions || {})) { const i = REGIONS.indexOf(name); if (i >= 0) look.regions[i] = w; else console.warn('unknown region', name); }
    const lit = l.organs || {};
    organs.forEach((o, id) => {
      const w = lit[id];
      if (l.mode === 'organs' && !l.isolate) { o.tOp = 1; o.tAct = 1; }
      else if (w !== undefined) { o.tOp = w >= 1 ? 1 : Math.max(0.24, w * 1.5); o.tAct = w >= 1 ? 1 : 0; }
      else { o.tOp = 0; o.tAct = 0; }
      // context parts (shown faintly around the chosen one) draw as a thin veil so they never hide it
      const ctx = !(l.mode === 'organs' && !l.isolate) && w !== undefined && w < 1; const m = o.mesh.material;
      if (m.userData.ctx !== ctx) { m.userData.ctx = ctx; m.depthWrite = !ctx; m.side = ctx ? THREE.FrontSide : THREE.DoubleSide; m.needsUpdate = true; o.mesh.renderOrder = ctx ? 0.5 : 0; }
    });
    look.sel = l.selected ? 1 : 0; look.xray = l.mode === 'organs' && !l.isolate ? 1 : 0;
    look.open = l.open ?? 1; look.ghost = l.ghost ?? 0; look.neutral = l.mode === 'zodiac' ? 1 : 0; look.himix = l.mode === 'zodiac' ? 1 : 0;
    look.glow = l.glow ? 1 : 0; U.uSide.value = l.side || 0; U.uFB.value = l.fb || 0;
    look.orbs = l.orbs ?? 0; look.orbSel = l.orbSel ?? -1; look.aura = l.aura ?? 0.5;
    look.zod = l.mode === 'zodiac' ? 1 : 0; for (let i = 0; i < 12; i++) look.zodW[i] = l.zodW ? (l.zodW[i] ?? 0) : 1;
    if (l.hiColor) U.uHiColor.value.set(l.hiColor);
    look.seg = l.seg ? 1 : 0; if (!l.seg) look.segHov = 0;
    glowMat.uniforms.uCol.value.set(ZONES[2].color);
  }
  function setField(f) { wake(2.2); F.on = !!f.on; F.focus = f.focus || null; if (f.age && f.age !== F.age) { F.age = f.age; buildRings(); } }

  // ---------- picking ----------
  const ray = new THREE.Raycaster(); let down = null; let hovZone = -1, hovT = 0, sway = false, swayT = 0;
  const endSway = () => { sway = false; };
  ['pointerdown', 'wheel', 'touchstart'].forEach((ev) => renderer.domElement.addEventListener(ev, () => { endSway(); lastTouch = performance.now(); wake(2.5); }, { passive: true }));
  controls.addEventListener('change', () => wake(1.2));
  renderer.domElement.addEventListener('dblclick', () => { flyTo(lastFrame, lastOpts); });
  renderer.domElement.addEventListener('pointerleave', () => { if (hovZone !== -1) { hovZone = -1; hooks.onHover && hooks.onHover(null); } });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !skin) return; wake(0.8);
    if (e.buttons) { if (hovZone !== -1) { hovZone = -1; hooks.onHover && hooks.onHover(null); } return; }
    const now = performance.now(); if (now - hovT < 70) return; hovT = now;
    const r = renderer.domElement.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)), camera);
    let z = -1, hit = null; const orb = orbs.findIndex((s, i) => { if (i === 0 || s.userData.amt < 0.3) return false; const p = project(s.position.toArray()); return Math.hypot(p.x - e.clientX, p.y - e.clientY) < 22; });
    if (orb > 0) z = orb; else { hit = ray.intersectObject(skin, false)[0]; if (hit && hit.uv) z = hit.uv.y > 0.3 ? 4 : Math.max(0, Math.min(7, Math.round(hit.uv.x * 7))); }
    if (hooks.hoverable && !hooks.hoverable()) z = -1;
    if (z >= 0) U.uHov.value = z;
    if (z !== hovZone || z >= 0) { hovZone = z; hooks.onHover && hooks.onHover(z >= 0 ? { zone: z, x: e.clientX, y: e.clientY, point: hit ? hit.point.toArray() : null } : null); }
  });
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || !skin) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); const dt = performance.now() - down.t; down = null;
    if (moved > 6 || dt > 500) return;
    const r = renderer.domElement.getBoundingClientRect();
    // orbs first: a generous target around each one
    let best = null;
    orbs.forEach((s, i) => { if (i === 0 || s.userData.amt < 0.3) return; const p = project(s.position.toArray()); const d = Math.hypot(p.x - e.clientX, p.y - e.clientY); if (d < 22 && (!best || d < best.d)) best = { d, i }; });
    const at = { x: e.clientX, y: e.clientY, pt: e.pointerType };
    if (best) { hooks.onPick && hooks.onPick({ type: 'orb', index: best.i, ...at }); return; }
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const vis = []; organs.forEach((o, id) => { if (o.opacity > 0.6) { o.mesh.userData.id = id; vis.push(o.mesh); } });
    const oh = vis.length ? ray.intersectObjects(vis, false)[0] : null;
    const sh = ray.intersectObject(skin, false)[0];
    if (oh && sh && (look.xray > 0.5 || look.sel > 0.5)) { hooks.onPick && hooks.onPick({ type: 'organ', id: oh.object.userData.id, zone: sh.uv ? Math.max(0, Math.min(7, Math.round(sh.uv.x * 7))) : -1, ...at }); return; }
    if (sh && sh.uv) { const under = []; const all = []; organs.forEach((o, id) => { o.mesh.userData.id = id; all.push(o.mesh); });
      for (const h of ray.intersectObjects(all, false)) { const id = h.object.userData.id; if (!under.includes(id)) under.push(id); if (under.length >= 4) break; }
      hooks.onPick && hooks.onPick({ type: 'skin', zone: Math.max(0, Math.min(7, Math.round(sh.uv.x * 7))), point: sh.point.toArray(), arm: sh.uv.y, under, ...at }); return; }
    hooks.onPick && hooks.onPick({ type: 'none' });
  });

  // ---------- projection for the labels ----------
  const _v = new THREE.Vector3(), _c = new THREE.Vector3();
  function project(p) {
    _v.set(p[0], p[1], p[2]); _c.copy(_v).applyMatrix4(camera.matrixWorldInverse); const depth = -_c.z;
    _v.project(camera); const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + (_v.x + 1) / 2 * r.width, y: r.top + (1 - _v.y) / 2 * r.height, depth, behind: depth <= 0.05 };
  }
  const targetDepth = () => { _c.copy(controls.target).applyMatrix4(camera.matrixWorldInverse); return -_c.z; };

  // ---------- frame loop ----------
  function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; applyOffset();
    if (!composer && glowOn) { try {
      const rt = new THREE.WebGLRenderTarget(Math.max(1, w * pr), Math.max(1, h * pr), { type: THREE.HalfFloatType, samples: pr >= 2 && pr >= (devicePixelRatio || 1) ? 0 : 4 });   // a screen drawn at its full density needs no extra smoothing; a 3x phone drawn at 2x does, or edges stair-step (seen on Chance's phone, 2026-11-13)
      composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera)); const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.15, 0.9, 0.42); bloom.highPassUniforms.smoothWidth.value = 0.5; composer.addPass(bloom);   // a low, wide glow that eases in: nothing switches on at a hard brightness line composer.addPass(new OutputPass());
    } catch (e) { composer = null; glowOn = false; } }
    if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); }
    { const aw = Math.max(8, Math.round(w / 3)), ah = Math.max(8, Math.round(h / 3));   // the aura buffer follows the page size, not the screen's pixel density, so the halo is as wide on a phone as on a desk
      if (!aur.rtA) { const mk = () => new THREE.WebGLRenderTarget(aw, ah, { type: THREE.HalfFloatType, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }); try { aur.rtA = mk(); aur.rtB = mk(); } catch (e) { aur.on = false; } }
      else { aur.rtA.setSize(aw, ah); aur.rtB.setSize(aw, ah); } }
    wake(); }
  let resizeT = 0;
  const refit = (instant) => { applyOffset(); if (!tween) flyTo(lastFrame, { ...lastOpts, keepAz: true, instant }); };
  new ResizeObserver(() => { resize(); clearTimeout(resizeT); refit(true); }).observe(stage);
  resize(); setCamera({ target: new THREE.Vector3(0, 0.86, MID), az: 0, pol: Math.PI / 2 - 0.035, dist: 4.4 });
  const clock = new THREE.Clock(); let fpsT = 0, fpsN = 0, fps = 0; const fieldMats = () => [...F.shells.map((m) => m.material)];
  let skip = 0;
  function frame() {
    requestAnimationFrame(frame); if (paused) return;
    if (tween) wake(0.6); const resting = hold <= 0 && !reduceMotion;
    if (resting && (skip = (skip + 1) % 2) !== 0) return;     // at rest only the breathing and the slow current are left: half the frames keeps them smooth
    const dt = Math.min(clock.getDelta(), resting ? 0.12 : 0.05); U.uTime.value += dt; hold -= dt; if (!reduceMotion) flowU.uFlowT.value += dt;
    U.uHovAmt.value += ((hovZone >= 0 ? 1 : 0) - U.uHovAmt.value) * Math.min(1, dt * 10);
    if (opts.embed && opts.turn && !tween && !reduceMotion && !down && performance.now() - lastTouch > 5000) { wake(0.3); const c = readCamera(); setCamera({ target: c.target, az: c.az + dt * opts.turn, pol: c.pol, dist: c.dist }); }
    if (sway && !tween && !reduceMotion) { wake(0.3); swayT += dt; const az = 0.16 * Math.sin(swayT * 0.32); const c = readCamera(); setCamera({ target: c.target, az, pol: c.pol, dist: c.dist }); }
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 6);
    const lerp = (a, b) => a + (b - a) * k;
    U.uSelAmt.value = lerp(U.uSelAmt.value, look.sel); U.uXray.value = lerp(U.uXray.value, look.xray); U.uOpen.value = lerp(U.uOpen.value, look.open);
    U.uGhost.value = lerp(U.uGhost.value, look.ghost); U.uNeutral.value = lerp(U.uNeutral.value, look.neutral); U.uHiMix.value = lerp(U.uHiMix.value, look.himix);
    const reg = U.uReg.value; for (let i = 0; i < NREG; i++) reg[i] = lerp(reg[i], look.regions[i]);
    U.uSeg.value = lerp(U.uSeg.value, look.seg); U.uSegHov.value.z = lerp(U.uSegHov.value.z, look.segHov);
    U.uZodAmt.value = lerp(U.uZodAmt.value, look.zod); { const zw = U.uZodW.value; for (let i = 0; i < 12; i++) zw[i] = lerp(zw[i], look.zodW[i]); }
    organs.forEach((o) => { o.opacity = lerp(o.opacity, o.tOp); o.active = lerp(o.active, o.tAct); o.mesh.visible = o.opacity > 0.01; o.mesh.material.uniforms.uOpacity.value = o.opacity; o.mesh.material.uniforms.uActive.value = o.active;
      if (o.halo) { o.halo.visible = o.mesh.visible; o.halo.material.uniforms.uA.value = o.opacity * (0.35 + 0.65 * o.active); } });
    glowMat.uniforms.uGlow.value = lerp(glowMat.uniforms.uGlow.value, look.glow); reproGlow.visible = glowMat.uniforms.uGlow.value > 0.01;
    auraMat.opacity = lerp(auraMat.opacity, look.aura * 0.22); { const sv = Math.min(1, look.aura * 2.2) * (1 - 0.6 * F.amt); aur.show = lerp(aur.show, sv); auraQuadMat.uniforms.uAmt.value = aur.show * AURA_GAIN * (0.94 + 0.06 * Math.sin(U.uTime.value * 0.9)); }
    const camDir = _v.copy(camera.position).sub(controls.target).normalize();
    orbs.forEach((s, i) => { const u = s.userData; if (i === 0) { u.amt = 0; s.visible = false; return; } u.amt = lerp(u.amt, look.orbs); u.sel = lerp(u.sel, look.orbSel === i ? 1 : 0);
      const dimOthers = look.orbSel >= 0 && look.orbSel !== i ? 0.35 : 1; const pulse = 0.9 + 0.1 * Math.sin(U.uTime.value * 1.6 + i * 0.7);
      s.material.opacity = u.amt * dimOthers * (0.75 + 0.25 * u.sel) * pulse; s.scale.setScalar((0.125 + 0.07 * u.sel) * (0.96 + 0.04 * pulse)); s.visible = s.material.opacity > 0.01; });
    // field
    F.amt = lerp(F.amt, F.on ? 1 : 0); field.visible = F.amt > 0.01;
    if (field.visible) {
      const dist = camera.position.distanceTo(controls.target), th = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), fa = lastFa || { w: 1, h: 1 };
      const fit = Math.min(dist * th * fa.h / (CY + REACH), dist * th * camera.aspect * fa.w / (BODY_A + REACH));   // 1: the whole shell just fits the free part of the screen
      const whole = THREE.MathUtils.smoothstep(fit, 0.8, 0.98);
      F.shells.forEach((m) => { m.material.uniforms.uFade.value = F.amt * (F.focus && F.focus !== 'edge' ? 0.45 : 1) * whole; });
      const show = (key) => F.always.includes(key) ? (F.focus && !focusKeys(F.focus).includes(key) ? 0.35 : 1) : (F.focus && focusKeys(F.focus).includes(key) ? 1 : 0);
      for (const [key, list] of Object.entries(F.parts)) { const a = show(key) * F.amt; list.forEach((m) => fadeObj(m, a, key)); }
      const ra = F.amt * (F.focus && F.focus !== 'timeline' ? 0.3 : 1); F.rings.children.forEach((l, i) => { l.material.opacity = (i === 0 ? 0.75 : 0.42) * ra; });
    }
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur); const e = ease(tween.t), a = tween.from, b = tween.to;
      setCamera({ target: a.target.clone().lerp(b.target, e), az: a.az + (b.az - a.az) * e, pol: a.pol + (b.pol - a.pol) * e, dist: a.dist + (b.dist - a.dist) * e });
      if (tween.t >= 1) tween = null;
    }
    controls.update(); aura.quaternion.copy(camera.quaternion);
    { const fa = look.flow * (1 - 0.25 * F.amt) * (1 - 0.45 * U.uSelAmt.value) * (1 - 0.5 * U.uXray.value); flowU.uFlowA.value = lerp(flowU.uFlowA.value, fa);
      flow.userData.stars.forEach((sp) => { sp.material.opacity = 0.34 * flowU.uFlowA.value * (1 - F.amt); }); flow.userData.axis.material.opacity = 0.035 * flowU.uFlowA.value * (1 - F.amt); }
    renderAura();
    if (composer && glowOn) composer.render(); else renderer.render(scene, camera);
    hooks.onFrame && hooks.onFrame();
    if (resting) { fpsN = 0; fpsT = 0; }
    else { fpsN++; fpsT += dt; if (fpsT >= 0.5) { fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; hooks.onFps && hooks.onFps(fps);
      slow = fps < 26 ? slow + 1 : 0;
      if (slow >= 4 && !navigator.webdriver) {            // a struggling device first loses the glow pass, then sharpness
        if (glowOn && composer) { glowOn = false; slow = 0; }
        else if (pr > 1.5) { pr = 1.5; renderer.setPixelRatio(pr); resize(); slow = 0; }
        else if (aur.on) { aur.on = false; slow = 0; }                                   // the aura goes before the last step of sharpness: a soft halo is missed less than a jagged body
        else if (pr > 1 && (devicePixelRatio || 1) < 2.5) { pr = 1; renderer.setPixelRatio(pr); resize(); slow = 0; } } } }   // a 3x phone never drops below 1.5: at 1 its edges stair-step
  }
  const focusKeys = (f) => ({ rivers: ['rivers'], parents: ['parents'], channel: ['channel', 'sunstar', 'earthstar'], sunstar: ['sunstar', 'channel'], earthstar: ['earthstar', 'channel'], adrenal: ['adrenal'], lefthip: ['lefthip'], ditch: ['ditch'], sides: [], frontback: [], timeline: [], edge: [] }[f] || []);
  function fadeObj(m, a, key) {
    m.visible = a > 0.01; if (!m.visible) return;
    m.traverse((o) => {
      const mat = o.material; if (!mat) return;
      if (mat.uniforms && mat.uniforms.uFade) mat.uniforms.uFade.value = a;
      else { if (mat.userData.base === undefined) mat.userData.base = mat.opacity; mat.opacity = mat.userData.base * a; }
    });
  }
  requestAnimationFrame(frame);

  const facing = () => { const a = THREE.MathUtils.euclideanModulo(readCamera().az + Math.PI, Math.PI * 2) - Math.PI; const d = Math.abs(a); return d < Math.PI / 4 ? 'front' : d > Math.PI * 3 / 4 ? 'back' : a > 0 ? 'left' : 'right'; };   // which side of the figure faces the viewer (left: the figure's own left)
  const turnTo = (deg) => { const keep = lastOpts; flyTo(lastFrame, { ...keep, az: deg, keepAz: false, dur: 0.9 }); lastOpts = keep; };   // Reset still returns to the view's own side
  const resetView = () => flyTo(lastFrame, lastOpts);
  const setSegHover = (band) => { if (band) { U.uSegHov.value.x = band[0]; U.uSegHov.value.y = band[1]; look.segHov = 1; } else look.segHov = 0; wake(0.8); };
  const turnBy = (deg) => { const c = readCamera(); const base = tween ? tween.to : c; const to = { ...base, az: base.az + THREE.MathUtils.degToRad(deg) }; sway = false; wake(1);   // presses add up, even mid-turn
    if (reduceMotion) { setCamera(to); controls.update(); tween = null; } else tween = { from: c, to, t: 0, dur: 0.3 }; };
  const zoomBy = (k) => { const c = readCamera(); tween = { from: c, to: { ...c, dist: THREE.MathUtils.clamp(c.dist * k, controls.minDistance, controls.maxDistance) }, t: 0, dur: 0.35 }; wake(1); };
  const startSway = () => { if (!reduceMotion) { sway = true; swayT = 0; } };
  const setPaused = (p) => { paused = !!p; if (!paused) { clock.getDelta(); wake(1); } };
  return { setPaused, orbPos: () => orbs.map((s) => s.position.toArray()), facing, turnTo, turnBy, resetView, setSegHover, zoomBy, startSway, wake, setLook, setField, flyTo, refit, project, targetDepth, fieldAnchors, ticks: () => F.ticks, organs, camera, controls, renderer, isReady: () => ready, fps: () => fps, MID };
}
