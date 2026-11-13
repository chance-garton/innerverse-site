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
    uLegs: { value: new THREE.Vector2(MODEL.legs.top, MODEL.legs.bottom) },
    uZodAmt: { value: 0 },    // 0..1: the zodiac body, each sign's area in its own colour
    uZodW: { value: new Float32Array(12).fill(1) },
    uZodCol: { value: Array.from({ length: 12 }, (_, i) => new THREE.Color((opts.signs && opts.signs[i] && opts.signs[i].color) || '#888888')) },
  };
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
    uniform float uZodAmt; uniform float uZodW[12]; uniform vec3 uZodCol[12];
    vec4 zodiac(float zc, vec3 p, float arm){
      ${PRE}
      vec3 c = vec3(0.0); float a = 0.0; float ws = 0.0;
      ${(opts.signs || []).slice(0, 12).map((sg, i) => { const ent = Object.entries(sg.regions || {}).filter(([n]) => REGIONS.includes(n)); const mx = Math.max(0.001, ...ent.map(([, w]) => w));
        return `ws = 0.0; ${ent.map(([n, w]) => `ws = max(ws, ${(w / mx).toFixed(3)} * ${MASK[REGIONS.indexOf(n)]});`).join(' ')} ws *= uZodW[${i}]; c = c * (1.0 - ws) + uZodCol[${i}] * ws; a = a * (1.0 - ws) + ws;`; }).join('\n      ')}
      return vec4(c, a);
    }`;

  const skinMat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: VERT, transparent: true, depthWrite: false, side: THREE.FrontSide,
    fragmentShader: /* glsl */`
      ${ZONE_GLSL}
      ${REGION_GLSL}
      uniform vec2 uLegs; uniform float uHov; uniform float uHovAmt;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        float zc = vUv.x * 7.0; vec3 col = zoneColor(zc);
        // legs: one even gradient by height, root red at the top of the thighs to the deep red at the soles
        float legT = clamp((uLegs.x - vW.y) / (uLegs.x - uLegs.y), 0.0, 1.0);
        vec3 legCol = pow(mix(pow(uColors[1], vec3(1.0 / 2.2)), pow(uColors[0], vec3(1.0 / 2.2)), legT), vec3(2.2));
        col = mix(col, legCol, 1.0 - smoothstep(0.9, 1.0, zc));
        col = mix(col, vec3(0.62, 0.70, 0.78), smoothstep(0.45, 1.0, vUv.y) * 0.42);   // only the hands ease toward a pale neutral
        col = mix(col, vec3(0.30, 0.34, 0.52), uNeutral);
        if (uZodAmt > 0.001) { vec4 zo = zodiac(zc, vW, vUv.y); col = col * (1.0 - zo.a * uZodAmt) + zo.rgb * uZodAmt; }
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
        c += col * hov * (0.16 + 0.5 * rim);
        float rest = uSelAmt * (1.0 - w);
        vec3 grey = vec3(dot(c, vec3(0.3, 0.5, 0.2)));
        c = mix(c, mix(grey, c, 0.4) * 0.2 + vec3(0.012, 0.014, 0.03), rest * mix(0.95, 0.84, uZodAmt));                 // the rest of the body goes dark
        c = mix(c, hi * (0.5 + 1.1 * rim), w * uSelAmt * uHiMix * 0.85);
        c += hi * w * uSelAmt * (0.17 + 0.05 * breath) * (0.45 + rim) * (1.22 - 0.3 * uOpen);
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

  // ---------- the aura: three smooth shells around the body (meshes aura_1..3 in the model), brightest where they face the eye ----------
  const shells = [];
  const SHELL = { aura_1: [0.20, 2.7], aura_2: [0.105, 2.2], aura_3: [0.055, 1.9] };
  const shellMat = (a, k) => new THREE.ShaderMaterial({
    uniforms: { ...U, uA: { value: a }, uK: { value: k }, uShow: { value: 0 } }, vertexShader: VERT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    fragmentShader: /* glsl */`
      ${ZONE_GLSL}
      uniform float uA; uniform float uK; uniform float uShow; uniform vec2 uLegs; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){ float zc = vUv.x * 7.0; vec3 col = zoneColor(zc);
        float legT = clamp((uLegs.x - vW.y) / (uLegs.x - uLegs.y), 0.0, 1.0);
        col = mix(col, mix(uColors[1], uColors[0], legT), 1.0 - smoothstep(0.9, 1.0, zc));
        col = mix(col, vec3(0.62, 0.70, 0.78), smoothstep(0.45, 1.0, vUv.y) * 0.42);
        col = mix(col, vec3(0.34, 0.38, 0.56), uNeutral);
        float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
        float breath = 0.93 + 0.07 * sin(uTime * 0.9 + vW.y * 2.4);
        float soft = smoothstep(0.0, 0.5, ndv) * (1.0 - 0.55 * smoothstep(0.45, 1.0, vUv.y));   // no hard edge at the silhouette, and the hands stay quiet
        gl_FragColor = vec4(col * pow(ndv, uK) * soft * uA * breath * uShow * (1.0 - 0.7 * uSelAmt) * (1.0 - 0.8 * uGhost) * (1.0 - 0.6 * uXray), 1.0);
        #include <colorspace_fragment>
      }`,
  });
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

  // ---------- the torus: a faint electric current around the body. It is part of the room, not the screen, so it keeps its place
  // as the body turns. Every thread runs between the Sun Star above the head and the Earth Star below the feet: half carry the
  // descending current down the outside, half the ascending current up. ----------
  const flowU = { uFlowT: { value: 0 }, uFlowA: { value: 0 } };
  const flow = new THREE.Group(); scene.add(flow);
  { const SEG = 120, CYF = (SUN_Y + EARTH_Y) / 2, HF = (SUN_Y - EARTH_Y) / 2; const RINGS = [[0.58, 8, 0.0], [0.88, 9, 0.29], [1.2, 10, 0.11]];
    const P = [], UU = [], SD = [], DR = [], RD = []; let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; let line = 0;
    RINGS.forEach(([R, count, off]) => { for (let k = 0; k < count; k++, line++) { const phi = (k + off + (rnd() - 0.5) * 0.3) / count * Math.PI * 2; const sd = rnd(), dir = line % 2 ? 1 : -1; const cx = Math.cos(phi), cz = Math.sin(phi);
      const pt = (i) => { const u = i / SEG, th = u * Math.PI, r = R * Math.pow(Math.sin(th), 1.5); return [cx * r, CYF + HF * Math.cos(th), MID + cz * r, u]; };
      for (let i = 0; i < SEG; i++) { for (const q of [pt(i), pt(i + 1)]) { P.push(q[0], q[1], q[2]); UU.push(q[3]); SD.push(sd); DR.push(dir); RD.push(cx, cz); } } } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(UU, 1)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(SD, 1));
    g.setAttribute('aDir', new THREE.Float32BufferAttribute(DR, 1)); g.setAttribute('aRad', new THREE.Float32BufferAttribute(RD, 2));
    const m = new THREE.ShaderMaterial({ uniforms: flowU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`attribute float aU; attribute float aSeed; attribute float aDir; attribute vec2 aRad; uniform float uFlowT; varying float vS; varying float vSeed; varying float vDir; varying float vU; varying float vFade;
        void main(){ float mid = sin(aU * 3.14159);
          // a small restless waver, the way a current never quite holds still
          float j = sin(aU * 31.0 + uFlowT * 1.7 + aSeed * 40.0) * sin(aU * 73.0 - uFlowT * 2.3 + aSeed * 11.0) + 0.5 * sin(aU * 157.0 + uFlowT * 3.1 + aSeed * 23.0);
          vec3 p = position; p.xz += aRad * j * 0.011 * mid; p.y += j * 0.006 * mid;
          vS = aDir > 0.0 ? aU : 1.0 - aU; vSeed = aSeed; vDir = aDir; vU = aU;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          // threads between the eye and the body step back, and so does anything close to the lens: the current surrounds the figure, it never veils it
          vec2 vd = normalize(cameraPosition.xz - vec2(0.0, ${MID.toFixed(3)}) + vec2(0.0001));
          vFade = (1.0 - 0.82 * smoothstep(0.1, 0.8, dot(aRad, vd))) * smoothstep(0.5, 1.7, -mv.z);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`uniform float uFlowT; uniform float uFlowA; varying float vS; varying float vSeed; varying float vDir; varying float vU; varying float vFade;
        void main(){
          float ph = fract(vS * 1.6 - uFlowT * (0.085 + 0.035 * vSeed) + vSeed * 7.0);
          float pulse = pow(ph, 9.0) + 0.45 * pow(fract(ph + 0.43 + 0.2 * vSeed), 16.0);        // a bright head with a tail behind it, travelling the way the current runs
          float crackle = 0.72 + 0.28 * sin(vS * 190.0 - uFlowT * 5.0 + vSeed * 60.0);
          float ends = 0.16 + 0.84 * smoothstep(0.0, 0.2, vU) * smoothstep(1.0, 0.8, vU);       // the threads gather at the two stars without piling into a knot
          vec3 col = vDir > 0.0 ? vec3(0.96, 0.90, 0.78) : vec3(0.72, 0.80, 1.0);              // descending: warm; ascending: cool
          gl_FragColor = vec4(col * (0.0105 + 0.085 * pulse * crackle) * ends * vFade * uFlowA, 1.0);
          #include <colorspace_fragment>
        }` });
    const lines = new THREE.LineSegments(g, m); lines.frustumCulled = false; lines.renderOrder = 3; flow.add(lines);
    // the two ends, as pinpoints, and the channel between them where it leaves the body
    const fs = sprite(texDot, new THREE.Color('#fff0c4'), 0.075), fe = sprite(texDot, new THREE.Color('#ffc9a6'), 0.075); fs.position.set(0, SUN_Y, MID); fe.position.set(0, EARTH_Y, MID); fs.renderOrder = fe.renderOrder = 3; flow.add(fs, fe); flow.userData.stars = [fs, fe];
    const ax = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, EARTH_Y, MID), new THREE.Vector3(0, SUN_Y, MID)]), new THREE.LineBasicMaterial({ color: 0xefe9dc, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending })); ax.renderOrder = 3; flow.add(ax); flow.userData.axis = ax; }

  // ---------- chakra orbs along the front of the body: tap one to open its center ----------
  const ORB_Z = [0.075, 0.115, 0.125, 0.13, 0.135, 0.10, 0.145, 0.03];
  const orbs = ZONES.map((z, i) => {
    const s = sprite(texDot, new THREE.Color(i === 0 ? z.dot : z.color), 0.085);
    s.position.set(0, i === 0 ? 0.47 : i === 7 ? 1.70 : z.y + (i === 6 ? 0.025 : 0), ORB_Z[i]); s.renderOrder = 6; s.userData = { amt: 0, sel: 0 };
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
  const REACH = 5.5 * FT;                       // where the field edge is drawn (distances come from the reviewed map)
  const BODY_A = 0.20, BODY_B = 0.13, CY = 0.83; // body half width and half depth, and its mid height
  const fieldMat = (layer) => new THREE.ShaderMaterial({
    uniforms: { ...U, uFade: { value: 0 }, uLayer: { value: layer } }, vertexShader: VERT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    fragmentShader: /* glsl */`
      ${ZONE_GLSL}
      uniform float uFade; uniform float uLayer; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        float zc = clamp((vW.y + 0.9) / 3.5, 0.0, 1.0) * 7.0; vec3 col = mix(zoneColor(zc), vec3(0.92, 0.86, 0.70), 0.55);
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
    // ancestral rivers, one each side
    const riverMat = (tint) => new THREE.ShaderMaterial({ uniforms: { ...U, uFade: { value: 0 }, uTintC: { value: new THREE.Color(tint) } }, vertexShader: VERT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      fragmentShader: /* glsl */`uniform float uFade; uniform vec3 uTintC; uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
          float flow = 0.6 + 0.4 * sin(vUv.y * 30.0 - uTime * 1.4); float ends = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
          gl_FragColor = vec4(uTintC * pow(ndv, 2.0) * flow * ends * 0.2 * uFade, 1.0);
          #include <colorspace_fragment>
        }` });
    F.riverX = BODY_A + 10 * IN;
    F.parts.rivers = [[1, '#d9d4ff'], [-1, '#ffe2a8']].map(([sgn, tint]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 20, 1, true), riverMat(tint)); m.position.set(sgn * F.riverX, 0.9, MID); m.renderOrder = 5; field.add(m); return m; });
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
    const ditch = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 20, 1, true), riverMat('#8fb4ff')); ditch.position.set(0.30, 1.02, MID); field.add(ditch); F.parts.ditch = [ditch];
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
      if (SHELL[o.name]) { o.material = shellMat(...SHELL[o.name]); o.renderOrder = -0.5; o.visible = false; shells.push(o); }
      else if (o.name === 'skin') { skin = o; o.material = skinMat; o.renderOrder = 2; const pre = new THREE.Mesh(o.geometry, prepassMat); pre.renderOrder = 1; add.push([o.parent, pre, o]); }
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
  let tween = null, lastFrame = MODEL.body.frame, lastOpts = {};
  const freeArea = () => { const W = renderer.domElement.clientWidth || 1, H = renderer.domElement.clientHeight || 1; const r = hooks.freeRect ? hooks.freeRect() : { x0: 0, y0: 0, x1: W, y1: H };
    return { ...r, W, H, w: Math.max(0.2, (r.x1 - r.x0) / W), h: Math.max(0.2, (r.y1 - r.y0) / H), cx: (r.x0 + r.x1) / 2, cy: (r.y0 + r.y1) / 2 }; };
  function fitDistance(fw, fh) {
    const fa = freeArea(); const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    return Math.max((fh / 2) / t / fa.h, (fw / 2) / (t * camera.aspect) / fa.w) * 1.1;
  }
  function applyOffset() { const fa = freeArea(); camera.setViewOffset(fa.W, fa.H, fa.W / 2 - fa.cx, fa.H / 2 - fa.cy, fa.W, fa.H); camera.updateProjectionMatrix(); }
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
  const look = { regions: new Float32Array(NREG), sel: 0, xray: 0, open: 1, ghost: 0, neutral: 0, himix: 0, glow: 0, side: 0, fb: 0, orbs: 0, orbSel: -1, aura: 0.5, zod: 0, zodW: new Float32Array(12).fill(1), flow: 1 };
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
    glowMat.uniforms.uCol.value.set(ZONES[2].color);
  }
  function setField(f) { wake(2.2); F.on = !!f.on; F.focus = f.focus || null; if (f.age && f.age !== F.age) { F.age = f.age; buildRings(); } }

  // ---------- picking ----------
  const ray = new THREE.Raycaster(); let down = null; let hovZone = -1, hovT = 0, sway = false, swayT = 0;
  const endSway = () => { sway = false; };
  ['pointerdown', 'wheel', 'touchstart'].forEach((ev) => renderer.domElement.addEventListener(ev, () => { endSway(); wake(2.5); }, { passive: true }));
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
    if (best) { hooks.onPick && hooks.onPick({ type: 'orb', index: best.i }); return; }
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const vis = []; organs.forEach((o, id) => { if (o.opacity > 0.6) { o.mesh.userData.id = id; vis.push(o.mesh); } });
    const oh = vis.length ? ray.intersectObjects(vis, false)[0] : null;
    const sh = ray.intersectObject(skin, false)[0];
    if (oh && sh && (look.xray > 0.5 || look.sel > 0.5)) { hooks.onPick && hooks.onPick({ type: 'organ', id: oh.object.userData.id, zone: sh.uv ? Math.max(0, Math.min(7, Math.round(sh.uv.x * 7))) : -1 }); return; }
    if (sh && sh.uv) { const under = []; const all = []; organs.forEach((o, id) => { o.mesh.userData.id = id; all.push(o.mesh); });
      for (const h of ray.intersectObjects(all, false)) { const id = h.object.userData.id; if (!under.includes(id)) under.push(id); if (under.length >= 4) break; }
      hooks.onPick && hooks.onPick({ type: 'skin', zone: Math.max(0, Math.min(7, Math.round(sh.uv.x * 7))), point: sh.point.toArray(), arm: sh.uv.y, under, x: e.clientX, y: e.clientY }); return; }
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
      const rt = new THREE.WebGLRenderTarget(Math.max(1, w * pr), Math.max(1, h * pr), { type: THREE.HalfFloatType, samples: pr >= 2 ? 0 : 4 });   // dense screens need no extra smoothing, and it is the costly part on a phone
      composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera)); const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.15, 0.9, 0.42); bloom.highPassUniforms.smoothWidth.value = 0.5; composer.addPass(bloom);   // a low, wide glow that eases in: nothing switches on at a hard brightness line composer.addPass(new OutputPass());
    } catch (e) { composer = null; glowOn = false; } }
    if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); } wake(); }
  let resizeT = 0;
  const refit = (instant) => { applyOffset(); if (!tween) flyTo(lastFrame, { ...lastOpts, keepAz: true, instant }); };
  new ResizeObserver(() => { resize(); clearTimeout(resizeT); refit(true); }).observe(stage);
  resize(); setCamera({ target: new THREE.Vector3(0, 0.86, MID), az: 0, pol: Math.PI / 2 - 0.035, dist: 4.4 });
  const clock = new THREE.Clock(); let fpsT = 0, fpsN = 0, fps = 0; const fieldMats = () => [...F.shells.map((m) => m.material)];
  let skip = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (tween) wake(0.6); const resting = hold <= 0 && !reduceMotion;
    if (resting && (skip = (skip + 1) % 2) !== 0) return;     // at rest only the breathing and the slow current are left: half the frames keeps them smooth
    const dt = Math.min(clock.getDelta(), resting ? 0.12 : 0.05); U.uTime.value += dt; hold -= dt; if (!reduceMotion) flowU.uFlowT.value += dt;
    U.uHovAmt.value += ((hovZone >= 0 ? 1 : 0) - U.uHovAmt.value) * Math.min(1, dt * 10);
    if (sway && !tween && !reduceMotion) { wake(0.3); swayT += dt; const az = 0.16 * Math.sin(swayT * 0.32); const c = readCamera(); setCamera({ target: c.target, az, pol: c.pol, dist: c.dist }); }
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 6);
    const lerp = (a, b) => a + (b - a) * k;
    U.uSelAmt.value = lerp(U.uSelAmt.value, look.sel); U.uXray.value = lerp(U.uXray.value, look.xray); U.uOpen.value = lerp(U.uOpen.value, look.open);
    U.uGhost.value = lerp(U.uGhost.value, look.ghost); U.uNeutral.value = lerp(U.uNeutral.value, look.neutral); U.uHiMix.value = lerp(U.uHiMix.value, look.himix);
    const reg = U.uReg.value; for (let i = 0; i < NREG; i++) reg[i] = lerp(reg[i], look.regions[i]);
    U.uZodAmt.value = lerp(U.uZodAmt.value, look.zod); { const zw = U.uZodW.value; for (let i = 0; i < 12; i++) zw[i] = lerp(zw[i], look.zodW[i]); }
    organs.forEach((o) => { o.opacity = lerp(o.opacity, o.tOp); o.active = lerp(o.active, o.tAct); o.mesh.visible = o.opacity > 0.01; o.mesh.material.uniforms.uOpacity.value = o.opacity; o.mesh.material.uniforms.uActive.value = o.active;
      if (o.halo) { o.halo.visible = o.mesh.visible; o.halo.material.uniforms.uA.value = o.opacity * (0.35 + 0.65 * o.active); } });
    glowMat.uniforms.uGlow.value = lerp(glowMat.uniforms.uGlow.value, look.glow); reproGlow.visible = glowMat.uniforms.uGlow.value > 0.01;
    auraMat.opacity = lerp(auraMat.opacity, look.aura * 0.22); { const sv = Math.min(1, look.aura * 2) * (1 - 0.75 * F.amt); shells.forEach((m) => { const u = m.material.uniforms.uShow; u.value = lerp(u.value, sv); m.visible = u.value > 0.01; }); }
    const camDir = _v.copy(camera.position).sub(controls.target).normalize(); const facing = THREE.MathUtils.clamp(camDir.z * 1.6 + 0.55, 0.25, 1);
    orbs.forEach((s, i) => { const u = s.userData; if (i === 0) { u.amt = 0; s.visible = false; return; } u.amt = lerp(u.amt, look.orbs); u.sel = lerp(u.sel, look.orbSel === i ? 1 : 0);
      const dimOthers = look.orbSel >= 0 && look.orbSel !== i ? 0.35 : 1; const pulse = 0.9 + 0.1 * Math.sin(U.uTime.value * 1.6 + i * 0.7);
      s.material.opacity = u.amt * facing * dimOthers * (0.75 + 0.25 * u.sel) * pulse; s.scale.setScalar((0.125 + 0.07 * u.sel) * (0.96 + 0.04 * pulse)); s.visible = s.material.opacity > 0.01; });
    // field
    F.amt = lerp(F.amt, F.on ? 1 : 0); field.visible = F.amt > 0.01;
    if (field.visible) {
      F.shells.forEach((m) => { m.material.uniforms.uFade.value = F.amt * (F.focus && F.focus !== 'edge' ? 0.45 : 1); });
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
    { const fa = look.flow * (1 - 0.65 * F.amt) * (1 - 0.45 * U.uSelAmt.value) * (1 - 0.5 * U.uXray.value); flowU.uFlowA.value = lerp(flowU.uFlowA.value, fa);
      flow.userData.stars.forEach((sp) => { sp.material.opacity = 0.34 * flowU.uFlowA.value * (1 - F.amt); }); flow.userData.axis.material.opacity = 0.035 * flowU.uFlowA.value * (1 - F.amt); }
    if (composer && glowOn) composer.render(); else renderer.render(scene, camera);
    hooks.onFrame && hooks.onFrame();
    if (resting) { fpsN = 0; fpsT = 0; }
    else { fpsN++; fpsT += dt; if (fpsT >= 0.5) { fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; hooks.onFps && hooks.onFps(fps);
      slow = fps < 26 ? slow + 1 : 0;
      if (slow >= 4 && !navigator.webdriver) {            // a struggling device first loses the glow pass, then sharpness
        if (glowOn && composer) { glowOn = false; slow = 0; }
        else if (pr > 1) { pr = Math.max(1, pr - 0.5); renderer.setPixelRatio(pr); resize(); slow = 0; } } } }
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
  const turnBy = (deg) => { const c = readCamera(); const base = tween ? tween.to : c; const to = { ...base, az: base.az + THREE.MathUtils.degToRad(deg) }; sway = false; wake(1);   // presses add up, even mid-turn
    if (reduceMotion) { setCamera(to); controls.update(); tween = null; } else tween = { from: c, to, t: 0, dur: 0.3 }; };
  const zoomBy = (k) => { const c = readCamera(); tween = { from: c, to: { ...c, dist: THREE.MathUtils.clamp(c.dist * k, controls.minDistance, controls.maxDistance) }, t: 0, dur: 0.35 }; wake(1); };
  const startSway = () => { if (!reduceMotion) { sway = true; swayT = 0; } };
  return { facing, turnTo, turnBy, resetView, zoomBy, startSway, wake, setLook, setField, flyTo, refit, project, targetDepth, fieldAnchors, ticks: () => F.ticks, organs, camera, controls, renderer, isReady: () => ready, fps: () => fps, MID };
}
