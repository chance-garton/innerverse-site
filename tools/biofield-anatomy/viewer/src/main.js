// Biofield Anatomy 3D: bare viewer (build step 2). Plain Three.js, no engine.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import DATA from './zones.json';

const ZONES = DATA.zones;
const $ = (s) => document.querySelector(s);
const stage = $('#stage');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = () => innerWidth < 760;

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 40);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minDistance = 0.35; controls.maxDistance = 9; controls.minPolarAngle = 0.25; controls.maxPolarAngle = 2.2;
controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.8;

// ---------- shared uniforms ----------
const zoneColors = ZONES.map((z) => new THREE.Color(z.color));
const U = {
  uColors: { value: zoneColors },
  uSel: { value: -1 },        // selected zone index
  uSelAmt: { value: 0 },      // 0..1 eased
  uTime: { value: 0 },
  uXray: { value: 0 },        // 1 when every organ is shown
  uOpen: { value: 1 },        // how far the selected zone's skin opens to show what is inside
};
const ZONE_GLSL = /* glsl */`
  uniform vec3 uColors[8]; uniform float uSel; uniform float uSelAmt; uniform float uTime; uniform float uXray; uniform float uOpen;
  vec3 zoneColor(float zc){
    zc = clamp(zc, 0.0, 6.999); int i = int(floor(zc)); float f = smoothstep(0.18, 0.82, fract(zc));
    vec3 a = uColors[0]; vec3 b = uColors[1];
    for (int k = 0; k < 7; k++) { if (k == i) { a = uColors[k]; b = uColors[k + 1]; } }
    return mix(a, b, f);
  }
  float zoneWeight(float zc){ return (1.0 - smoothstep(0.42, 0.9, abs(zc - uSel))) * step(-0.5, uSel); }
`;
const VERT = /* glsl */`
  varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main(){
    vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vW = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const skinMat = new THREE.ShaderMaterial({
  uniforms: U, vertexShader: VERT, transparent: true, depthWrite: false, side: THREE.FrontSide,
  fragmentShader: /* glsl */`
    ${ZONE_GLSL}
    varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main(){
      float zc = vUv.x * 7.0; vec3 col = zoneColor(zc);
      col = mix(col, vec3(0.62, 0.66, 0.80), vUv.y * 0.55);              // hands fade to a pale neutral
      float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
      float rim = pow(1.0 - ndv, 2.0);
      float w = zoneWeight(zc);
      float breath = 0.5 + 0.5 * sin(uTime * 1.6);
      float open = max(uSelAmt * w * uOpen, uXray * 0.85);                         // where organs are showing
      vec3 c = col * (0.42 + 1.25 * rim);
      c = mix(c, c * 0.42 + vec3(0.03, 0.035, 0.06), uSelAmt * (1.0 - w) * 0.85);   // quiet the rest of the body
      c += col * w * uSelAmt * (0.32 + 0.12 * breath) * (0.45 + rim) * (1.6 - 0.6 * uOpen);
      float a = 0.80 + 0.2 * rim;
      a = mix(a, 0.10 + 0.85 * rim, open);
      gl_FragColor = vec4(c, a);
      #include <colorspace_fragment>
    }`,
});
const prepassMat = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

function organMaterial(zoneIndex, axis, tint = 0) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uOpacity: { value: 0 }, uActive: { value: 0 }, uZone: { value: zoneIndex }, uAxis: { value: axis ? 1 : 0 }, uTint: { value: tint } },
    vertexShader: VERT, transparent: true, depthWrite: true, side: THREE.DoubleSide,
    fragmentShader: /* glsl */`
      ${ZONE_GLSL}
      uniform float uOpacity; uniform float uActive; uniform float uZone; uniform float uAxis; uniform float uTint;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        float zc = mix(uZone, vUv.x * 7.0, uAxis); vec3 col = zoneColor(zc);
        col = uTint > 0.0 ? mix(col, vec3(1.0, 0.97, 0.9), uTint) : col * (1.0 + uTint);
        vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0); vec3 v = normalize(vV);
        float ndv = clamp(dot(n, v), 0.0, 1.0);
        float key = 0.5 + 0.5 * dot(n, normalize(vec3(0.35, 0.6, 0.72)));
        float rim = pow(1.0 - ndv, 2.5);
        float act = mix(uActive, zoneWeight(zc) * uSelAmt, uAxis);
        vec3 quiet = mix(col, vec3(0.55, 0.58, 0.70), 0.72) * (0.22 + 0.5 * key);
        float occ = 0.55 + 0.45 * ndv;
        vec3 lit = col * (0.16 + 0.95 * pow(key, 1.6)) * occ + col * rim * 0.55 + vec3(1.0) * pow(key, 14.0) * 0.10;
        vec3 c = mix(quiet, lit, act);
        gl_FragColor = vec4(c, uOpacity);
        #include <colorspace_fragment>
      }`,
  });
}

// ---------- soft aura behind the body + field shells ----------
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
const aura = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.9),
  new THREE.MeshBasicMaterial({ map: auraTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
aura.position.set(0, 0.86, -0.25); aura.renderOrder = -1; scene.add(aura);

const fieldGroup = new THREE.Group(); fieldGroup.visible = false; scene.add(fieldGroup);
const fieldMats = [];
[0.62, 0.86, 1.1].forEach((r, i) => {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, uFade: { value: 0 }, uLayer: { value: i } }, vertexShader: VERT, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    fragmentShader: /* glsl */`
      ${ZONE_GLSL}
      uniform float uFade; uniform float uLayer; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        float zc = clamp((vW.y - 0.1) / 1.6, 0.0, 1.0) * 7.0; vec3 col = mix(zoneColor(zc), vec3(0.9, 0.86, 0.7), 0.35);
        float rim = pow(1.0 - clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 3.2);
        float shimmer = 0.85 + 0.15 * sin(uTime * 0.7 + vW.y * 5.0 + uLayer * 2.1);
        gl_FragColor = vec4(col * rim * shimmer * (0.55 - 0.12 * uLayer) * uFade, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), m);
  s.scale.set(r, r * 1.28 + 0.2, r * 0.92); s.position.set(0, 0.9, 0); s.renderOrder = 4 + i; fieldGroup.add(s); fieldMats.push(m);
});

// ---------- load model ----------
const TINT = { heart: -0.28, lung_l: 0.16, lung_r: 0.16, liver: -0.22, stomach: 0.12, spleen: -0.3, pancreas: 0.3, gallbladder: 0.45, kidney_l: -0.05, kidney_r: -0.05, adrenal_l: 0.4, adrenal_r: 0.4,
  small_intestine: 0.14, bladder: -0.2, large_intestine: -0.05, hip_l: 0.5, hip_r: 0.5, brain: 0.12, eye_l: 0.3, eye_r: 0.3, pineal: 0.7, pituitary: 0.55, thyroid: -0.1, trachea: 0.35, spine: 0.25 };
const organs = new Map();   // id -> { mesh, zone, opacity, active }
let skin = null;
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const onModel = (gltf) => {
  const root = gltf.scene; scene.add(root);
  const add = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === 'skin') {
      skin = o; o.material = skinMat; o.renderOrder = 2;
      const pre = new THREE.Mesh(o.geometry, prepassMat); pre.renderOrder = 1; add.push([o.parent, pre, o]);
    } else {
      const axis = o.name.startsWith('axis_'); const id = o.name.replace(/^(organ_|axis_)/, '');
      const zone = axis ? -1 : (o.userData.zone ?? -1);
      o.material = organMaterial(zone, axis, TINT[id] ?? 0); o.renderOrder = 0; o.visible = false;
      organs.set(id, { mesh: o, zone, axis, opacity: 0, active: 0 });
    }
  });
  add.forEach(([parent, pre, src]) => { pre.position.copy(src.position); pre.quaternion.copy(src.quaternion); pre.scale.copy(src.scale); parent.add(pre); });
  document.body.classList.add('ready');
  const fromHash = ZONES.find((z) => '#' + z.slug === location.hash);
  select(fromHash ? fromHash.index : -1, true);
  window.__bfaReady = true;
};
const onModelError = (e) => { $('#status').textContent = 'The 3D model could not load. Reload the page to try again.'; console.error(e); };
if (window.__BFA_MODEL_B64) {   // preview build: the model rides along inside a script file
  const bin = atob(window.__BFA_MODEL_B64); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  window.__BFA_MODEL_B64 = null; loader.parse(buf.buffer, '', onModel, onModelError);
} else loader.load('body.glb', onModel, undefined, onModelError);

// ---------- camera choreography ----------
const view = { target: new THREE.Vector3(0, 0.86, 0), az: 0, pol: Math.PI / 2 - 0.035, dist: 4.4 };
let tween = null;
function freeArea() { // the part of the canvas not covered by the panel, as a fraction
  if (isPhone()) { const sheet = $('#panel').getBoundingClientRect(); const h = Math.max(0.3, sheet.top / innerHeight); return { w: 1, h, cx: 0, cy: (1 - h) / 2 }; }
  const pw = $('#panel').getBoundingClientRect().width + 24; const w = 1 - pw / innerWidth; return { w, h: 1, cx: -(1 - w) / 2, cy: 0 };
}
function fitDistance(fw, fh) {
  const fa = freeArea(); const vfov = THREE.MathUtils.degToRad(camera.fov);
  const dV = (fh / 2) / Math.tan(vfov / 2) / fa.h;
  const dH = (fw / 2) / (Math.tan(vfov / 2) * camera.aspect) / fa.w;
  return Math.max(dV, dH) * 1.08;
}
function applyOffset() { // keep the subject centred in the free area
  const fa = freeArea(); const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
  camera.setViewOffset(w, h, -fa.cx * w, fa.cy * h, w, h); camera.updateProjectionMatrix();
}
function setCamera(v) {
  const sp = Math.sin(v.pol);
  camera.position.set(v.target.x + v.dist * sp * Math.sin(v.az), v.target.y + v.dist * Math.cos(v.pol), v.target.z + v.dist * sp * Math.cos(v.az));
  controls.target.copy(v.target); camera.lookAt(v.target);
}
function readCamera() {
  const d = camera.position.clone().sub(controls.target); const s = new THREE.Spherical().setFromVector3(d);
  return { target: controls.target.clone(), az: s.theta, pol: s.phi, dist: s.radius };
}
function flyTo(frame, opts = {}) {
  const from = readCamera();
  const to = { target: new THREE.Vector3(frame.x || 0, frame.y, frame.depth || 0), az: THREE.MathUtils.degToRad(opts.az ?? 0),
    pol: Math.PI / 2 - THREE.MathUtils.degToRad(frame.tilt ?? 2), dist: fitDistance(frame.w, frame.h) };
  let d = to.az - from.az; d = Math.atan2(Math.sin(d), Math.cos(d)); to.az = from.az + d;   // shortest way round
  if (opts.instant || reduceMotion) { setCamera(to); controls.update(); tween = null; return; }
  tween = { from, to, t: 0, dur: opts.dur ?? 1.25 };
}
controls.addEventListener('start', () => { tween = null; });
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------- selection ----------
let selected = -1, showAll = false, fieldOn = false, selTarget = 0, openTarget = 1;
function select(index, instant) {
  selected = index;
  if (index >= 0) U.uSel.value = index;
  selTarget = index >= 0 ? 1 : 0;
  const z = ZONES[index];
  if (z) openTarget = z.organs.length ? 1 : 0.12;
  flyTo(z ? z.frame : DATA.body.frame, { instant });
  document.querySelectorAll('.zone').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === index)));
  renderPanel(z);
  const hash = z ? '#' + z.slug : '';
  if (location.hash !== hash) { try { history.replaceState(null, '', hash || location.pathname + location.search); } catch (e) { /* sandboxed */ } }
  document.documentElement.style.setProperty('--zone', z ? z.color : 'var(--gold)');
  const active = document.querySelector('.zone[aria-pressed="true"]'); if (active && isPhone()) active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}
function focusOrgan(zoneIndex, organ) {
  if (selected !== zoneIndex) select(zoneIndex);
  const s = Math.max(organ.size * 3.0, 0.3);
  flyTo({ x: organ.center[0], y: organ.center[1], depth: organ.center[2], w: s, h: s, tilt: 4 }, { az: organ.center[2] < -0.02 && /kidney|adrenal|hip|spine/.test(organ.id) ? 180 : (organ.center[0] > 0.03 ? 18 : organ.center[0] < -0.03 ? -18 : 0), dur: 1.0 });
}

// ---------- panel ----------
const list = $('#zones');
[...ZONES].reverse().forEach((z) => {
  const b = document.createElement('button'); b.className = 'zone'; b.type = 'button'; b.dataset.i = z.index; b.setAttribute('aria-pressed', 'false');
  b.innerHTML = `<span class="dot" style="--c:${z.color}"></span><span class="zt"><span class="zc">${z.chakra}</span><span class="zn">${z.name}</span></span>`;
  b.addEventListener('click', () => select(selected === z.index ? -1 : z.index));
  list.appendChild(b);
});
function renderPanel(z) {
  const el = $('#detail');
  if (!z) { el.innerHTML = `<p class="hint">Choose a region, or tap the body where you feel it.</p>`; return; }
  const chips = z.organs.map((o, i) => `<button type="button" class="chip" data-o="${i}">${o.label}</button>`).join('');
  el.innerHTML = `<p class="eyebrow">${z.chakra}</p><h2>${z.name}</h2>` +
    (chips ? `<div class="chips" aria-label="Structures in this region">${chips}</div>` : `<p class="hint">This region lights the body itself. No inner structures are modelled here yet.</p>`) +
    `<p class="note">Region text arrives with the content step.</p>`;
  el.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => focusOrgan(z.index, z.organs[Number(c.dataset.o)])));
}
$('#t-organs').addEventListener('click', (e) => { showAll = !showAll; e.currentTarget.setAttribute('aria-pressed', String(showAll)); });
$('#t-field').addEventListener('click', (e) => {
  fieldOn = !fieldOn; e.currentTarget.setAttribute('aria-pressed', String(fieldOn));
  if (fieldOn) { select(-1); flyTo({ y: 0.9, w: 2.5, h: 2.9, tilt: 4, depth: 0 }); } else flyTo(selected >= 0 ? ZONES[selected].frame : DATA.body.frame);
});
$('#t-reset').addEventListener('click', () => select(-1));
addEventListener('hashchange', () => { const z = ZONES.find((q) => '#' + q.slug === location.hash); if ((z ? z.index : -1) !== selected) select(z ? z.index : -1); });

// ---------- tap the body ----------
const ray = new THREE.Raycaster(); let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || !skin) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); const dt = performance.now() - down.t; down = null;
  if (moved > 6 || dt > 500) return;
  const r = renderer.domElement.getBoundingClientRect(); const fa = freeArea();
  const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
  ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
  const hit = ray.intersectObject(skin, false)[0];
  if (!hit || !hit.uv) { if (!fieldOn) select(-1); return; }
  const zi = Math.max(0, Math.min(7, Math.round(hit.uv.x * 7)));
  select(zi === selected ? -1 : zi);
});

// ---------- frame loop ----------
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; applyOffset();
}
new ResizeObserver(() => { resize(); if (!tween) flyTo(fieldOn ? { y: 0.9, w: 2.5, h: 2.9, tilt: 4 } : selected >= 0 ? ZONES[selected].frame : DATA.body.frame, { instant: true }); }).observe(stage);
resize(); setCamera(view);
const fpsEl = $('#fps'); const clock = new THREE.Clock(); let fpsT = 0, fpsN = 0; window.__bfaFps = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); U.uTime.value += dt;
  const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 6);
  U.uSelAmt.value += (selTarget - U.uSelAmt.value) * k;
  U.uXray.value += ((showAll ? 1 : 0) - U.uXray.value) * k;
  U.uOpen.value += (openTarget - U.uOpen.value) * k;
  organs.forEach((o) => {
    const on = o.axis ? (showAll || selected >= 0) : (showAll || o.zone === selected);
    const targetOp = on ? (o.axis ? (showAll ? 0.9 : 0.55) : 1) : 0;
    o.opacity += (targetOp - o.opacity) * k; o.active += ((o.zone === selected || (showAll && selected < 0) ? 1 : 0) - o.active) * k;
    o.mesh.visible = o.opacity > 0.01; o.mesh.material.uniforms.uOpacity.value = o.opacity; o.mesh.material.uniforms.uActive.value = o.active;
  });
  const fTarget = fieldOn ? 1 : 0; let anyField = false;
  fieldMats.forEach((m) => { m.uniforms.uFade.value += (fTarget - m.uniforms.uFade.value) * k; if (m.uniforms.uFade.value > 0.01) anyField = true; });
  fieldGroup.visible = anyField;
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / tween.dur); const e = ease(tween.t), a = tween.from, b = tween.to;
    setCamera({ target: a.target.clone().lerp(b.target, e), az: a.az + (b.az - a.az) * e, pol: a.pol + (b.pol - a.pol) * e, dist: a.dist + (b.dist - a.dist) * e });
    if (tween.t >= 1) tween = null;
  }
  controls.update();
  aura.quaternion.copy(camera.quaternion);
  renderer.render(scene, camera);
  fpsN++; fpsT += dt; if (fpsT >= 0.5) { window.__bfaFps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; fpsEl.textContent = window.__bfaFps + ' fps'; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__bfaProject = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); const r = renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; };
window.__bfa = { select, ZONES, organs, renderer, focusOrgan, flyTo, body: DATA.body };
