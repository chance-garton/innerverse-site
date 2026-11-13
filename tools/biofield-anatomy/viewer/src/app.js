// Biofield Anatomy 3D: the page. State, lists, panel, labels in the scene, search. All wording comes from the content file.
import MODEL from './model.json';
import { createScene } from './scene.js';

const C = window.__BFA_CONTENT;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isPhone = () => innerWidth < 1000;
const ZONES = MODEL.zones, MID = MODEL.body.mid;
const N = new Map(C.nodes.map((n) => [n.id, n]));
const CENTERS = ['crown', 'thirdeye', 'throat', 'heart', 'solar', 'sacral', 'root', 'legs'];
const ZONE_NODE = ['legs', 'root', 'sacral', 'solar', 'heart', 'throat', 'thirdeye', 'crown'];
const SIGNS = C.nodes.filter((n) => n.kind === 'sign'); SIGNS.forEach((n) => { n.glyph = n.glyph.replace(/\uFE0F/g, '') + '\uFE0E'; });
const FIELD = C.nodes.filter((n) => n.kind === 'field');
const WHOLE = C.nodes.filter((n) => n.parent === 'whole');
const POS = C.posNames;
const GOLD = '#c9a55c';
const colorOf = (n, text) => { if (!n) return GOLD; if (n.kind === 'sign' || n.kind === 'field') return GOLD; const z = ZONES[n.color]; if (!z) return '#d8cfb8'; return text ? (z.accent || z.color) : (z.dot || z.color); };
const parentOf = (n) => (n.parent && N.get(n.parent)) || null;
const centerOf = (n) => { let p = n; while (p && p.kind !== 'center') p = parentOf(p); return p; };

// ---------- state ----------
const S = { view: 'chakra', id: null, pos: null, feeling: null, special: null, age: 40, balance: 'balanced' };
const detail = $('#detail'), list = $('#list'), strip = $('#strip'), back = $('#back'), panel = $('#panel'), rail = $('#rail');
let sheet = 'half';

// ---------- scene ----------
let scene; const sceneHooks = {
  freeRect: () => {
    const W = innerWidth, H = innerHeight;
    if (isPhone()) { const top = rail.getBoundingClientRect().bottom; const bottom = Math.min(panel.getBoundingClientRect().top, H) - strip.offsetHeight; return { x0: 0, x1: W, y0: top, y1: Math.max(top + 120, bottom) }; }
    return { x0: rail.getBoundingClientRect().right + 8, x1: panel.getBoundingClientRect().left - 8, y0: 0, y1: H };
  },
  onReady: () => { document.body.classList.add('ready'); route(true); window.__bfaReady = true; },
  onError: () => { $('#status').textContent = 'The 3D model could not load. Reload the page to try again.'; },
  onPick: pick,
  onFrame: layoutLabels,
  onFps: (f) => { window.__bfaFps = f; const a = $('#fpsline'); if (a) a.textContent = `This device is drawing ${f} frames per second.`; },
};
try { scene = createScene($('#stage'), MODEL, sceneHooks); }
catch (e) {   // no WebGL on this device: every list, panel and search still works, without the model
  console.warn(e); const no = () => {}; document.body.classList.add('ready', 'nogl');
  $('#status').textContent = 'This device cannot draw the 3D body. The map still works as text.'; $('#status').style.opacity = 1;
  scene = { setLook: no, setField: no, flyTo: no, refit: no, project: () => ({ x: -999, y: -999, depth: 1, behind: true }), targetDepth: () => 1, fieldAnchors: () => new Proxy({}, { get: () => [0, 0, 0] }), ticks: () => [], camera: { matrixWorld: { elements: [0] }, projectionMatrix: { elements: new Array(16).fill(0) } } };
  setTimeout(() => { route(true); window.__bfaReady = true; }, 0);
}

// ---------- geometry helpers ----------
const POS_AZ = { LF: 38, LB: 142, RF: -38, RB: -142, L: 62, R: -62, B: 180, F: 0, C: 0 };
function posAnchor(n, key) {
  const a = n.anchor || { y: (n.frame || frameOf(n)).y, rx: 0.3, rz: 0.2 };
  const sx = key.includes('L') ? 1 : key.includes('R') ? -1 : 0; const sz = key.includes('F') ? 1 : key.includes('B') ? -1 : 0;
  const diag = sx && sz ? 0.78 : 1;
  const zoff = a.rz < 0 ? a.rz : 0;   // a negative rz pins the labels behind the body (parts seen from the back)
  return [sx * a.rx * diag, a.y, MID + (zoff || sz * Math.abs(a.rz) * (sx ? 1 : 1.15))];
}
function organBox(ids) {
  const lo = [9, 9, 9], hi = [-9, -9, -9]; let any = false;
  ids.forEach((id) => { const o = MODEL.organs[id]; if (!o) return; any = true; for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], o.min[i]); hi[i] = Math.max(hi[i], o.max[i]); } });
  return any ? { lo, hi } : null;
}
function frameOf(n) {
  if (n.frame) return n.frame;
  const prim = Object.entries((n.light && n.light.organs) || {}).filter(([, w]) => w >= 1).map(([id]) => id);
  const b = organBox(prim);
  if (b) { const w = Math.max(b.hi[0] - b.lo[0], b.hi[2] - b.lo[2]), h = b.hi[1] - b.lo[1]; const s = Math.max(w * 2.3, h * 1.9, 0.26);
    return { x: 0, y: (b.lo[1] + b.hi[1]) / 2, z: (b.lo[2] + b.hi[2]) / 2, w: s, h: s, az: n.az ?? ((b.lo[0] + b.hi[0]) / 2 > 0.035 ? 22 : (b.lo[0] + b.hi[0]) / 2 < -0.035 ? -22 : 0), tilt: 4 }; }
  return MODEL.body.frame;
}
function viewFrame(n, pos) {
  const f = { ...frameOf(n) };
  if (n.config && n.anchor) { const need = 2.5 * n.anchor.rx + (isPhone() ? 0.1 : 0); f.w = Math.max(f.w, need); if (n.config.length > 2 && !pos && (f.tilt ?? 2) < 10) f.tilt = 11; }
  let az = f.az || 0;
  if (pos) { const backView = Math.abs(az) > 90; az = backView ? (pos.includes('L') ? 148 : pos.includes('R') ? -148 : 180) : POS_AZ[pos] ?? 0; }
  return { frame: f, az };
}
const FIELD_FRAMES = { home: { y: 0.83, w: 4.5, h: 5.5, tilt: 7 }, edge: { y: 0.83, w: 4.5, h: 5.5, tilt: 7 }, timeline: { y: 0.9, w: 4.5, h: 3.4, tilt: 24 }, adrenal: { y: 1.0, w: 2.7, h: 2.6, tilt: 16 },
  near: { y: 0.86, w: 1.7, h: 2.5, tilt: 4 }, sides: { y: 0.9, w: 2.4, h: 2.9, tilt: 4 }, frontback: { y: 0.9, w: 2.4, h: 2.9, tilt: 6 } };
const SIGN_SIDE = { aries: 'R', taurus: 'L', gemini: 'R', cancer: 'L', leo: 'R', virgo: 'L', libra: 'L', scorpio: 'R', sagittarius: 'R', capricorn: 'L', aquarius: 'R', pisces: 'L' };
const SIGN_AT = { aries: [0, 1.60, 0.13], taurus: [0, 1.415, 0.085], gemini: [0.215, 1.30, 0.03], cancer: [-0.075, 1.19, 0.125], leo: [0.03, 1.275, 0.135], virgo: [0, 1.0, 0.125], libra: [-0.07, 1.05, -0.07],
  scorpio: [0, 0.845, 0.105], sagittarius: [0.14, 0.70, 0.10], capricorn: [-0.142, 0.475, 0.095], aquarius: [0.165, 0.25, 0.07], pisces: [-0.185, 0.03, 0.14] };

// ---------- navigation ----------
function go(next) {
  const prev = { ...S };
  Object.assign(S, { id: null, pos: null, feeling: null, special: null }, next);
  if (S.id) {
    const n = N.get(S.id); if (!n) { S.id = null; }
    else if (n.kind === 'field') S.view = 'field'; else if (n.kind === 'sign') S.view = 'zodiac';
    else if (n.kind === 'part') S.view = next.view === 'organs' ? 'organs' : 'chakra'; else S.view = 'chakra';
    if (S.pos && !(n && n.positions.some((p) => p.key === S.pos))) S.pos = null;
  } else if (S.feeling || S.special) S.view = next.view || 'chakra';
  if (isPhone() && (S.id || S.feeling || S.special) && sheet === 'peek') setSheet('half');
  if (prev.id !== S.id) S.balance = 'balanced';
  render(); writeHash();
  if (prev.id !== S.id || prev.pos !== S.pos || prev.feeling !== S.feeling || prev.special !== S.special) detail.scrollTop = 0;
}
function hashOf() {
  if (S.feeling) return 'feeling-' + slug(S.feeling);
  if (S.special) return S.special;
  if (S.id) return S.id + (S.pos ? '-pos-' + S.pos.toLowerCase() : '') + (S.view === 'organs' ? '-in-organs' : '');
  return S.view === 'chakra' ? '' : 'view-' + S.view;
}
function writeHash() { const h = hashOf(); if (location.hash.replace(/^#/, '') !== h) { try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch (e) { /* sandboxed */ } } }
function route(instant) {
  let h = decodeURIComponent(location.hash.replace(/^#/, '')); const next = {};
  if (h.startsWith('feeling-')) { const f = C.feelings.find((x) => slug(x.name) === h.slice(8)); if (f) next.feeling = f.name; }
  else if (h === 'feelings' || h === 'about' || h === 'atoz') next.special = h;
  else if (h.startsWith('view-')) next.view = ['chakra', 'field', 'organs', 'zodiac'].includes(h.slice(5)) ? h.slice(5) : 'chakra';
  else if (h) { if (h.endsWith('-in-organs')) { next.view = 'organs'; h = h.slice(0, -10); } const m = h.match(/^(.*?)(?:-pos-([a-z]+))?$/); if (m && N.has(m[1])) { next.id = m[1]; if (m[2]) next.pos = m[2].toUpperCase(); } }
  if (!next.view && !next.id && !next.feeling && !next.special) next.view = 'chakra';
  instantNext = !!instant; go(next); instantNext = false;
}
let instantNext = false;
addEventListener('hashchange', () => { if (location.hash.replace(/^#/, '') !== hashOf()) route(false); });

function upTarget() {
  if (S.pos) return { label: N.get(S.id).name, to: { id: S.id, view: S.view } };
  if (S.feeling) return { label: 'All feelings', to: { special: 'feelings' } };
  if (S.special) return { label: 'Home', to: { view: 'chakra' } };
  const n = S.id && N.get(S.id); if (!n) return null;
  if (n.kind === 'field') return { label: 'The field', to: { view: 'field' } };
  if (n.kind === 'sign') return { label: 'All signs', to: { view: 'zodiac' } };
  if (S.view === 'organs') return { label: 'All body parts', to: { view: 'organs' } };
  const p = parentOf(n); if (p) return { label: p.name, to: { id: p.id } };
  return { label: 'All centers', to: { view: 'chakra' } };
}

// ---------- picking on the model ----------
function pick(p) {
  if (S.view === 'field') return;
  if (p.type === 'orb') { go({ id: ZONE_NODE[p.index] }); return; }
  if (p.type === 'organ') { const part = partOfOrgan(p.id); if (part && part.id !== S.id) go({ id: part.id, view: S.view }); return; }
  if (p.type !== 'skin') return;
  if (S.view === 'zodiac') { let best = null; for (const s of SIGNS) { const a = SIGN_AT[s.id]; const d = Math.hypot(a[0] - p.point[0], a[1] - p.point[1], (a[2] - p.point[2]) * 0.6); if (!best || d < best.d) best = { d, s }; } if (best && best.s.id !== S.id) go({ id: best.s.id }); return; }
  if (S.view === 'organs') return;
  let id = p.arm > 0.3 ? 'heart' : ZONE_NODE[p.zone];
  if (id === 'legs') { const cur = S.id && N.get(S.id); const inLegs = cur && (cur.id === 'legs' || cur.parent === 'legs'); if (inLegs) { const y = p.point[1]; id = y < 0.095 ? 'feet' : y < 0.39 ? 'ankles' : y < 0.57 ? 'knees' : 'thighs'; } }
  if (id !== S.id) go({ id });
}
const ORGAN_PART = new Map();
C.nodes.filter((n) => n.kind === 'part').forEach((n) => { const prim = Object.entries(n.light.organs || {}).filter(([, w]) => w >= 1).map(([id]) => id); prim.forEach((id) => { const had = ORGAN_PART.get(id); if (!had || prim.length < had.count) ORGAN_PART.set(id, { node: n, count: prim.length }); }); });
const partOfOrgan = (id) => (ORGAN_PART.get(id) || {}).node;

// ---------- the look of the model for the current state ----------
function applyScene() {
  const n = S.id && N.get(S.id); let labels = [], layout = 'anchored';
  scene.setField({ on: S.view === 'field' && !S.feeling && !S.special, focus: n && n.kind === 'field' ? n.marker : null, age: S.age });
  const fly = (frame, o = {}) => scene.flyTo(frame, { ...o, instant: instantNext });
  if (S.feeling) {
    const f = C.feelings.find((x) => x.name === S.feeling); const regions = {}, organs = {}; let ys = [];
    f.targets.forEach((t, i) => { const tn = N.get(t.node); if (!tn || tn.kind === 'field') return;
      for (const [k, w] of Object.entries(tn.light.regions || {})) regions[k] = Math.max(regions[k] || 0, w * 0.9);
      if (tn.kind === 'part') for (const [k, w] of Object.entries(tn.light.organs || {})) organs[k] = Math.max(organs[k] || 0, w);
      const hasPos = t.pos && tn.positions.some((p) => p.key === t.pos); const fr = frameOf(tn);
      const anchor = hasPos ? posAnchor(tn, t.pos) : t.pos && /^[LRB]$/.test(t.pos) ? posAnchor(tn, t.pos) : [(fr.x || 0) + (i % 2 ? -0.02 : 0.02), fr.y, (fr.z ?? MID) + 0.17];
      ys.push(anchor[1]);
      labels.push({ id: 'ft' + i, anchor, to: [anchor[0] * 0.4, anchor[1], MID + (anchor[2] - MID) * 0.4], l1: tn.name, l2: t.label || (hasPos ? tn.positions.find((p) => p.key === t.pos).title : targetWhere(t, tn, true)), color: colorOf(tn), go: { id: t.node, pos: hasPos ? t.pos : null } }); });
    const lo = Math.min(...ys, 0.9), hi = Math.max(...ys, 1.3);
    scene.setLook({ mode: 'chakra', selected: true, regions, organs, open: Object.keys(organs).length ? 0.9 : 0.12, orbs: 0, aura: 0.3 });
    fly({ y: (lo + hi) / 2, w: 1.05, h: Math.max(0.9, hi - lo + 0.55), tilt: 3 }, { az: 0 });
    setLabels(labels, 'anchored'); return;
  }
  if (S.special) { scene.setLook({ mode: 'chakra', orbs: 1, aura: 0.5 }); fly(MODEL.body.frame, { az: 0 }); setLabels([], 'anchored'); return; }
  if (!n) {
    if (S.view === 'field') { scene.setLook({ mode: 'chakra', orbs: 0, aura: 0.22 }); fly(FIELD_FRAMES.home, { az: 24 }); labels = fieldLabels(null); layout = 'stacked'; }
    else if (S.view === 'organs') { scene.setLook({ mode: 'organs', orbs: 0, aura: 0.3 }); fly(MODEL.body.frame, { az: 0 }); }
    else if (S.view === 'zodiac') { scene.setLook({ mode: 'zodiac', orbs: 0, aura: 0.12 }); fly(MODEL.body.frame, { az: 0 });
      labels = SIGNS.map((s) => ({ id: s.id, anchor: SIGN_AT[s.id], cls: 'glyph', l1: s.glyph, l2: s.name, color: GOLD, side: SIGN_SIDE[s.id], go: { id: s.id } })); layout = 'stacked'; }
    else { scene.setLook({ mode: 'chakra', orbs: 1, aura: 0.5 }); fly(MODEL.body.frame, { az: 0 });
      labels = ZONE_NODE.map((id, i) => ({ id, anchor: orbAt(i), l2: N.get(id).name, color: colorOf(N.get(id)), side: 'R', go: { id } })); layout = 'stacked'; }
    setLabels(labels, layout); return;
  }
  if (n.kind === 'field') {
    scene.setLook({ mode: 'chakra', orbs: 0, aura: 0.22 });
    const key = n.marker; const fr = FIELD_FRAMES[key] || (key ? FIELD_FRAMES.near : FIELD_FRAMES.home);
    fly(fr, { az: key === 'frontback' ? 62 : key === 'timeline' ? 30 : key === 'adrenal' ? 26 : key ? 12 : 24 });
    setLabels(fieldLabels(n), 'stacked'); return;
  }
  const L = n.light || {}; const organs = { ...(L.organs || {}) }; const hasOrgans = Object.keys(organs).length > 0;
  const side = S.pos ? (S.pos.includes('L') ? 1 : S.pos.includes('R') ? -1 : 0) : 0; const fb = S.pos ? (S.pos.includes('F') ? 1 : S.pos.includes('B') ? -1 : 0) : 0;
  if (side && n.kind === 'part') for (const id of Object.keys(organs)) { if ((side > 0 && id.endsWith('_r')) || (side < 0 && id.endsWith('_l'))) organs[id] = Math.min(organs[id], 0.3); }
  const { frame, az } = viewFrame(n, S.pos);
  if (n.kind === 'sign') {
    scene.setLook({ mode: 'zodiac', selected: true, regions: L.regions, organs, glow: L.glow, open: hasOrgans ? 0.8 : 0.12, orbs: 0, aura: 0.12 });
    fly(frame, { az });
    labels = [{ id: n.id, anchor: SIGN_AT[n.id], cls: 'glyph on', l1: n.glyph, l2: n.rules, color: GOLD }];
    setLabels(labels, 'stacked'); return;
  }
  const isPart = n.kind === 'part'; const z = n.color;
  const primaryOrgans = Object.values(organs).some((w) => w >= 1);
  scene.setLook({ mode: S.view === 'organs' ? 'organs' : 'chakra', isolate: true, selected: true, regions: L.regions, organs, glow: L.glow, side, fb,
    open: hasOrgans ? 1 : 0.12, ghost: isPart && primaryOrgans ? 1 : 0, orbs: isPart ? 0 : 1, orbSel: isPart ? -1 : ZONES.findIndex((q) => q.slug === (centerOf(n) || n).id), aura: isPart ? 0.2 : 0.42 });
  fly(frame, { az });
  if (n.positions.length) labels = n.positions.map((p) => { const a = posAnchor(n, p.key); return { id: p.key, anchor: a, to: [a[0] * 0.42, a[1], MID + (a[2] - MID) * 0.42], l1: p.title, l2: p.short, color: colorOf(n), cls: S.pos === p.key ? 'on' : S.pos ? 'dim' : '', go: { id: n.id, pos: p.key, view: S.view } }; });
  setLabels(labels, 'anchored');
}
const orbAt = (i) => [0, i === 0 ? 0.47 : i === 7 ? 1.70 : ZONES[i].y + (i === 6 ? 0.025 : 0), [0.075, 0.115, 0.125, 0.13, 0.135, 0.10, 0.145, 0.03][i]];
function fieldLabels(n) {
  const A = scene.fieldAnchors(); const key = n && n.marker; const byMarker = (m) => FIELD.find((f) => f.marker === m);
  const mk = (id, anchor, l1, l2, marker, side) => ({ id, anchor, l1: isPhone() ? null : l1, l2: isPhone() ? l1 : l2, color: GOLD, side, cls: key ? (marker === key || (key === 'channel' && /star/.test(marker)) ? 'on' : 'dim') : '', go: marker !== key && byMarker(marker) ? { id: byMarker(marker).id } : null });
  // label wording comes from the content file (each field topic lists its own marks)
  const MARK = {}; FIELD.forEach((f) => { for (const [k, v] of Object.entries(f.marks || {})) MARK[k] = { marker: f.marker, l1: v[0], l2: v[1] || '' }; });
  const SIDE = { edge: 'L', timeline: 'R', sunstar: 'R', earthstar: 'R', channel: 'L', riverL: 'R', riverR: 'L', mother: 'R', father: 'L', adrenal: 'R', lefthip: 'R', ditch: 'R', left: 'R', right: 'L', front: 'R', back: 'L' };
  const QUIET = { lefthip: 1, ditch: 1, left: 1, right: 1, front: 1, back: 1 };
  const out = Object.keys(SIDE).filter((k) => MARK[k] && (!QUIET[k] || MARK[k].marker === key)).map((k) => mk(k, A[k], MARK[k].l1, MARK[k].l2, MARK[k].marker, SIDE[k]));
  if (key === 'timeline') scene.ticks().forEach((t, i) => out.push({ id: 'tick' + i, anchor: t.pos, cls: 'tick', l2: t.now ? `Now, age ${t.age}` : t.age === 0 ? 'Birth' : `Age ${t.age}`, nopin: true }));
  return key ? out.filter((l) => l.cls !== 'dim' || ['edge', 'timeline', 'sunstar', 'earthstar'].includes(l.id)).filter((l) => !(key === 'timeline' && l.cls === 'dim')) : out;
}

// ---------- labels in the scene ----------
const labBox = $('#labels'), leaders = $('#leaders'); let LABS = [], labLayout = 'anchored', labDirty = true, lastCam = '';
function setLabels(defs, layout) {
  labBox.innerHTML = ''; leaders.innerHTML = ''; labLayout = layout;
  LABS = defs.map((d) => {
    const el = document.createElement(d.go ? 'button' : 'div'); el.className = 'lab ' + (d.cls || ''); if (d.go) el.type = 'button'; el.style.setProperty('--c', d.color || GOLD);
    el.innerHTML = `<span class="ld"></span><span class="lt">${d.l1 ? `<span class="l1">${esc(d.l1)}</span>` : ''}${d.l2 ? `<span class="l2">${esc(d.l2)}</span>` : ''}</span>`;
    if (d.go) el.addEventListener('click', () => go(d.go));
    labBox.appendChild(el);
    let pin = null, line = null;
    if (!d.nopin) { pin = document.createElement('span'); pin.className = 'pin'; pin.style.setProperty('--c', d.color || GOLD); labBox.appendChild(pin);
      line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); leaders.appendChild(line); }
    return { d, el, pin, line, w: 0, h: 0 };
  });
  LABS.forEach((l) => { l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; });
  labDirty = true;
}
function layoutLabels() {
  if (!LABS.length) return;
  const cam = scene.camera; const sig = cam.matrixWorld.elements.map((v) => v.toFixed(4)).join() + cam.projectionMatrix.elements[0].toFixed(4) + cam.projectionMatrix.elements[8].toFixed(4) + innerWidth + 'x' + innerHeight + sheet;
  if (!labDirty && sig === lastCam) return; lastCam = sig; labDirty = false;
  const W = innerWidth, H = innerHeight; const phone = isPhone();
  const fr = phone ? { x0: 4, x1: W - 4, y0: rail.getBoundingClientRect().bottom + 4, y1: Math.min(panel.getBoundingClientRect().top, H) - strip.offsetHeight - 4 }
    : { x0: rail.getBoundingClientRect().right + 10, x1: panel.getBoundingClientRect().left - 10, y0: 10, y1: H - 26 };
  const td = scene.targetDepth(); const cx = (fr.x0 + fr.x1) / 2;
  const hideAll = phone && sheet === 'full';
  LABS.forEach((l) => { l.p = scene.project(l.d.anchor); l.far = labLayout === 'anchored' && l.p.depth > td + 0.06; l.hidden = hideAll || l.p.behind || l.p.x < fr.x0 - 40 || l.p.x > fr.x1 + 40 || l.p.y < fr.y0 - 40 || l.p.y > fr.y1 + 40; });
  if (labLayout === 'stacked') {
    const cols = { L: [], R: [] };
    LABS.forEach((l) => { if (l.hidden) return; if (l.d.cls === 'tick') { l.bx = l.p.x + 6; l.by = l.p.y - l.h / 2; return; } cols[l.d.side || (l.p.x < cx ? 'L' : 'R')].push(l); });
    for (const side of ['L', 'R']) {
      const a = cols[side].sort((p, q) => p.p.y - q.p.y); const gap = 6; let y = fr.y0;
      a.forEach((l) => { l.by = Math.max(l.p.y - l.h / 2, y); y = l.by + l.h + gap; });
      let over = a.length ? a[a.length - 1].by + a[a.length - 1].h - fr.y1 : 0;
      for (let i = a.length - 1; i >= 0 && over > 0; i--) { const l = a[i]; const maxY = (i === a.length - 1 ? fr.y1 : a[i + 1].by - gap) - l.h; if (l.by > maxY) l.by = maxY; }
      a.forEach((l) => { const reach = phone ? 0.36 : 0.30; const want = side === 'L' ? Math.max(fr.x0, cx - (fr.x1 - fr.x0) * reach - l.w) : Math.min(fr.x1 - l.w, cx + (fr.x1 - fr.x0) * reach);
        l.bx = side === 'L' ? Math.min(want, l.p.x - l.w - 18) : Math.max(want, l.p.x + 18); l.bx = Math.max(fr.x0, Math.min(fr.x1 - l.w, l.bx)); l.edge = side === 'L' ? l.bx + l.w : l.bx; });
    }
  } else {
    LABS.forEach((l) => { if (l.hidden) return; const right = l.p.x >= cx; l.bx = right ? l.p.x + 13 : l.p.x - 13 - l.w; l.by = l.p.y - l.h / 2;
      l.bx = Math.max(fr.x0, Math.min(fr.x1 - l.w, l.bx)); l.by = Math.max(fr.y0, Math.min(fr.y1 - l.h, l.by)); });
    // keep anchored labels from sitting on top of each other
    const vis = LABS.filter((l) => !l.hidden).sort((a, b) => a.by - b.by);
    for (let i = 1; i < vis.length; i++) for (let j = 0; j < i; j++) { const a = vis[j], b = vis[i]; if (b.bx < a.bx + a.w + 4 && a.bx < b.bx + b.w + 4 && b.by < a.by + a.h + 4) b.by = Math.min(fr.y1 - b.h, a.by + a.h + 4); }
  }
  LABS.forEach((l) => {
    l.el.style.display = l.hidden ? 'none' : ''; if (l.pin) l.pin.style.display = l.hidden ? 'none' : ''; if (l.line) l.line.style.display = l.hidden ? 'none' : '';
    if (l.hidden) return;
    l.el.style.transform = `translate3d(${Math.round(l.bx)}px,${Math.round(l.by)}px,0)`; l.el.classList.toggle('far', l.far);
    if (l.pin) { l.pin.style.transform = `translate3d(${l.p.x.toFixed(1)}px,${l.p.y.toFixed(1)}px,0)`; l.pin.classList.toggle('far', l.far); }
    if (l.line) {
      let x1, y1, x2, y2;
      if (labLayout === 'stacked') { x1 = l.edge; y1 = l.by + l.h / 2; x2 = l.p.x; y2 = l.p.y; }
      else if (l.d.to) { const t = scene.project(l.d.to); x1 = l.p.x; y1 = l.p.y; x2 = t.x; y2 = t.y; } else { x1 = x2 = l.p.x; y1 = y2 = l.p.y; }
      l.line.setAttribute('x1', x1); l.line.setAttribute('y1', y1); l.line.setAttribute('x2', x2); l.line.setAttribute('y2', y2); l.line.classList.toggle('far', l.far);
    }
  });
}

// ---------- lists (left rail on desktop, chip strip on phones) ----------
function item(n, cls, sub) {
  const cur = S.id === n.id; const c = colorOf(n);
  if (n.kind === 'sign') return `<button class="it ${cls || ''}" type="button" data-go="${n.id}" aria-current="${cur}"><span class="gl">${n.glyph}</span><span class="zt"><span class="zn">${esc(n.name)}</span><span class="zs" style="font-size:12px;color:var(--ink-soft)">${esc(n.rules)}</span></span></button>`;
  if (cls === 'plain') return `<button class="it plain" type="button" data-go="${n.id}" aria-current="${cur}"><span class="zt"><span class="zn">${esc(n.name)}</span>${n.short ? `<span class="zs">${esc(n.short)}</span>` : ''}</span></button>`;
  if (cls === 'sub') return `<button class="it sub" type="button" data-go="${n.id}" aria-current="${cur}" style="--c:${c}"><span class="dot"></span><span class="zt"><span class="zn">${esc(n.name)}</span></span></button>`;
  return `<button class="it" type="button" data-go="${n.id}" aria-current="${cur}" style="--c:${c}"><span class="dot"></span><span class="zt"><span class="zc">${esc(n.name)}</span><span class="zn">${esc(sub || n.heading || '')}</span></span></button>`;
}
function renderList() {
  const cur = S.id && N.get(S.id); let h = '', chips = '';
  const chip = (n, inner) => `<button class="sc" type="button" data-go="${n.id}" aria-current="${S.id === n.id || (cur && centerOf(cur) === n && S.view === 'chakra')}" style="--c:${colorOf(n)}">${inner}</button>`;
  if (S.view === 'chakra') {
    const open = cur && cur.kind !== 'field' && cur.kind !== 'sign' ? (centerOf(cur) || cur).id : null;
    CENTERS.forEach((id) => { const n = N.get(id); h += item(n); if (open === id && n.parts) h += n.parts.map((p) => item(N.get(p), 'sub')).join(''); chips += chip(n, `<i></i>${esc(n.name)}`); });
  } else if (S.view === 'field') {
    let g = ''; FIELD.forEach((n) => { if (n.group !== g) { g = n.group; h += `<div class="gh">${esc(g)}</div>`; } h += item(n, 'plain'); chips += chip(n, esc(n.name)); });
  } else if (S.view === 'organs') {
    CENTERS.forEach((id) => { const n = N.get(id); h += `<div class="gh" style="color:${colorOf(n, 1)}">${esc(n.name)}</div>` + n.parts.filter((p) => p !== 'legs').map((p) => item(N.get(p), 'sub')).join(''); });
    h += `<div class="gh">Whole body</div>` + WHOLE.map((n) => item(n, 'sub')).join('');
    [...CENTERS.flatMap((id) => N.get(id).parts.filter((p) => p !== 'legs')), ...WHOLE.map((n) => n.id)].forEach((p) => { const n = N.get(p); chips += chip(n, `<i></i>${esc(n.name)}`); });
  } else { SIGNS.forEach((n) => { h += item(n); chips += chip(n, `<em>${n.glyph}</em>${esc(n.name)}`); }); }
  list.innerHTML = h; strip.innerHTML = S.view === 'organs' && !S.feeling && !S.special ? chips : '';
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === S.view && !S.feeling && !S.special)));
  const a = list.querySelector('[aria-current="true"]'); if (a) a.scrollIntoView({ block: 'nearest' });
  const b = strip.querySelector('[aria-current="true"]'); if (b) b.scrollIntoView({ inline: 'center', block: 'nearest' });
}
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]'); if (g) { const [id, pos] = g.dataset.go.split('|'); go({ id, pos: pos || null, view: g.dataset.view || S.view }); return; }
  const f = e.target.closest('[data-feeling]'); if (f) { go({ feeling: f.dataset.feeling }); return; }
  const v = e.target.closest('[data-setview]'); if (v) { go({ view: v.dataset.setview }); return; }
});
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => go({ view: t.dataset.view })));
$('#b-atoz').addEventListener('click', () => go({ special: 'atoz' }));
$('#matoz').addEventListener('click', () => go({ special: 'atoz' }));
$('#b-about').addEventListener('click', () => go({ special: 'about' }));
back.addEventListener('click', () => { const u = upTarget(); if (u) go(u.to); });

// ---------- panel ----------
const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const blocks = (bl) => { let h = '', inList = false; bl.forEach((b) => { if (b.li) { if (!inList) { h += '<ul>'; inList = true; } h += `<li>${esc(b.t)}</li>`; } else { if (inList) { h += '</ul>'; inList = false; } h += `<p>${esc(b.t)}</p>`; } }); return h + (inList ? '</ul>' : ''); };
const acc = (title, inner, open, small) => `<div class="acc" data-open="${open ? 1 : 0}"><button type="button" aria-expanded="${!!open}"><span>${esc(title)}${small ? `<small>${esc(small)}</small>` : ''}</span>${CHEV}</button><div class="in txt">${inner}</div></div>`;
const OPEN_KEYS = new Set(['biofield', 'more', 'female', 'male', 'authority', 'work']);
const SMALL = { anatomy: 'General anatomy', struggle: 'General anatomy' };
function crumbs(n, extra) {
  const chain = []; let p = n; while (p) { chain.unshift(p); p = parentOf(p); }
  const root = n.kind === 'field' ? ['The field', 'field'] : n.kind === 'sign' ? ['Zodiac', 'zodiac'] : S.view === 'organs' ? ['Body Parts', 'organs'] : ['Chakras', 'chakra'];
  let h = `<div class="crumbs"><button class="crumb" type="button" data-setview="${root[1]}">${root[0]}</button>`;
  chain.forEach((c, i) => { const last = i === chain.length - 1 && !extra; h += `<span class="sep">/</span>` + (last ? `<span class="crumb" style="cursor:default;color:var(--ink)">${esc(c.name)}</span>` : `<button class="crumb" type="button" data-go="${c.id}">${esc(c.name)}</button>`); });
  if (n.parent === 'whole') h = h.replace('<span class="sep">/</span>', '<span class="sep">/</span><span class="crumb" style="cursor:default">Whole body</span><span class="sep">/</span>');
  if (extra) h += `<span class="sep">/</span><span class="crumb" style="cursor:default;color:var(--ink)">${esc(extra)}</span>`;
  return h + '</div>';
}
function compass(n) {
  const P = Object.fromEntries(n.positions.map((p) => [p.key, p])); const keys = n.config; if (!keys || !keys.length) return '';
  const card = (k, cls) => `<button class="pos ${cls || ''} ${S.pos === k ? 'on' : ''}" type="button" data-go="${n.id}|${k}"><span class="p1">${esc(P[k].title)}</span><span class="p2">${esc(P[k].short)}</span></button>`;
  const flip = Math.abs(frameOf(n).az || n.az || 0) > 90;   // parts shown from behind: their left is on your left
  let h = '<div class="compass">';
  if (n.kind !== 'part') h += `<div class="rowcap lead">${n.tone === 'imbalance' ? 'What stuck energy feels like' : 'What each side carries'}</div>`;
  else h += flip ? '<div class="cap"><span>Their left</span><span>Their right</span></div>' : '<div class="cap"><span>Their right</span><span>Their left</span></div>';
  if (flip) return h + card('L') + card('R') + '</div>';
  if (keys.includes('LF') || keys.includes('RF')) {
    if (keys.includes('LB')) h += '<div class="rowcap">Front</div>';
    h += card('RF') + card('LF');
    if (keys.includes('LB')) h += '<div class="rowcap">Back</div>' + card('RB') + card('LB');
    if (keys.includes('B')) h += card('B', 'wide');
  } else h += card('R') + card('L');
  return h + '</div>';
}
const SIDE_ORDER = { F: 0, B: 1, L: 2, R: 3 };
const posTitle = (n, p) => p.title + (n.tone === 'imbalance' ? ' imbalance' : '');
const sideBoxes = (n, key) => n.sides.filter((s) => !key || key.includes(s.key)).sort((a, b) => (/[LR]/.test(a.key) ? 0 : 1) - (/[LR]/.test(b.key) ? 0 : 1)).map((s) => `<div class="side txt"><h4>${esc(s.title)}</h4>${blocks(s.blocks)}</div>`).join('');
function renderNode(n) {
  const z = colorOf(n, 1); panel.style.setProperty('--zone', z); document.documentElement.style.setProperty('--zone', z);
  if (S.pos) return renderPos(n, n.positions.find((p) => p.key === S.pos));
  const par = parentOf(n);
  const eyebrow = n.kind === 'center' ? (n.eyebrow || 'Energy center') : n.kind === 'stop' ? n.eyebrow : n.kind === 'part' ? (par ? `Part of the ${par.name.toLowerCase() === 'legs' ? 'legs' : par.name}` : 'Whole body') : n.kind === 'sign' ? 'Astrology' : n.group;
  let h = crumbs(n);
  if (n.kind === 'sign') h += `<p class="bigglyph" aria-hidden="true">${n.glyph}</p>`;
  h += `<p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(n.name)}</h2>`;
  if (n.heading) h += `<p class="heading">${esc(n.heading)}</p>`;
  if (n.kind === 'sign') h += `<p class="heading">Rules: ${esc(n.rules.charAt(0).toLowerCase() + n.rules.slice(1))}</p>`;
  if (n.kind === 'field' && n.short) h += `<p class="heading">${esc(n.short)}</p>`;
  h += `<p class="lede">${esc(n.summary.t)}</p>`;
  if (n.themes.length) { const max = 7; h += `<div class="chips" data-themes>` + n.themes.map((t, i) => `<span class="tag" ${i >= max ? 'hidden' : ''}>${esc(t.t)}</span>`).join('') + (n.themes.length > max ? `<button class="tag more" type="button" data-more>+${n.themes.length - max} more</button>` : '') + '</div>'; }
  if (n.governs) h += `<p class="gov"><b>Governs:</b> ${esc(n.governs.t.charAt(0).toLowerCase() + n.governs.t.slice(1))}</p>`;
  if (n.parts && n.parts.length) h += `<div class="blk"><div class="bh"><h3>${n.id === 'legs' ? 'Parts of the leg' : 'Parts of this center'}</h3></div><div class="chips" style="margin:0">` + n.parts.map((p) => `<button class="chip" type="button" data-go="${p}">${esc(N.get(p).name)}</button>`).join('') + '</div></div>';
  if (n.marker === 'timeline') h += `<div class="blk"><div class="bh"><h3>Try it with your age</h3></div><div class="age"><input type="range" min="6" max="100" step="1" value="${S.age}" aria-label="Your age"><output>Age ${S.age}</output></div><p class="note">The rings mark where each age sits between the skin and the edge of the field.</p></div>`;
  if (n.positions.length) {
    const kind = n.kind === 'part' ? 'Left and right' : 'Around the body';
    h += `<div class="blk"><div class="bh"><h3>${kind}</h3><span>${n.kind === 'part' ? '' : 'Choose a spot, or a label on the model'}</span></div>${compass(n)}</div>`;
  }
  if (n.sides.length) h += `<div class="blk" style="margin-top:14px">` + [...n.sides].sort((a, b) => SIDE_ORDER[a.key] - SIDE_ORDER[b.key]).map((s) => acc(s.title, blocks(s.blocks), false)).join('') + '</div>';
  const sec = Object.fromEntries(n.sections.map((s) => [s.key, s]));
  if (sec.balanced || sec.low) {
    const both = sec.balanced && sec.low; const which = both ? S.balance : sec.balanced ? 'balanced' : 'low';
    h += `<div class="blk"><div class="bh"><h3>How it shows up</h3></div>` + (both ? `<div class="seg" role="tablist"><button type="button" role="tab" data-bal="balanced" aria-selected="${which === 'balanced'}">In balance</button><button type="button" role="tab" data-bal="low" aria-selected="${which === 'low'}">Out of balance</button></div>` : `<p class="note" style="margin:0 0 8px">${esc(sec[which].title)}</p>`) + `<div class="txt" data-balbody>${blocks(sec[which].blocks)}</div></div>`;
  }
  const rest = n.sections.filter((s) => s.key !== 'balanced' && s.key !== 'low');
  if (rest.length) h += `<div class="blk">` + rest.map((s) => acc(s.title, blocks(s.blocks), OPEN_KEYS.has(s.key) || n.kind === 'field' || n.kind === 'sign', SMALL[s.key])).join('') + '</div>';
  if (n.signs && n.signs.length) h += `<div class="blk"><div class="bh"><h3>In the zodiac</h3></div><div class="chips" style="margin:0">` + n.signs.map((s) => `<button class="chip gl" type="button" data-go="${s}">${N.get(s).glyph} ${esc(N.get(s).name)}</button>`).join('') + '</div></div>';
  if (n.kind === 'sign') h += `<div class="blk"><div class="bh"><h3>Plays through</h3></div><div class="chips" style="margin:0">` + n.centers.map((c) => `<button class="chip" style="--zone:${colorOf(N.get(c), 1)}" type="button" data-go="${c}" data-view="chakra">${esc(N.get(c).name)}</button>`).join('') + `</div></div>`;
  return h;
}
function renderPos(n, p) {
  let h = crumbs(n, posTitle(n, p));
  h += `<p class="eyebrow">${esc(n.name)}</p><h2 class="sm">${esc(posTitle(n, p))}</h2><p class="heading">${esc(p.short)}</p>`;
  h += `<div class="txt lede">${blocks(p.blocks)}</div>` + sideBoxes(n, p.key);
  const others = n.positions.filter((q) => q.key !== p.key);
  h += `<div class="blk"><div class="bh"><h3>Other spots at the ${esc(n.name.toLowerCase())}</h3></div><div class="chips" style="margin:0">` + others.map((q) => `<button class="chip" type="button" data-go="${n.id}|${q.key}">${esc(q.title)}</button>`).join('') + `<button class="chip gl" type="button" data-go="${n.id}">All of the ${esc(n.name.toLowerCase())}</button></div></div>`;
  return h;
}
function targetWhere(t, tn, short) {
  if (t.label) return t.label;
  const p = t.pos; if (!p) return short ? '' : tn.name;
  const posName = tn.positions.find((q) => q.key === p); const w = posName ? posName.title : ({ LOW: 'out of balance', HEALTHY: 'in balance' }[p] || POS[p] || p);
  return short ? w : `${tn.name}: ${w.charAt(0).toLowerCase() + w.slice(1)}`;
}
function renderFeeling(f) {
  panel.style.setProperty('--zone', GOLD); document.documentElement.style.setProperty('--zone', GOLD);
  let h = `<div class="crumbs"><button class="crumb" type="button" data-setview="chakra">Chakras</button><span class="sep">/</span><button class="crumb" type="button" id="c-feel">Feelings</button></div>`;
  h += `<p class="eyebrow">Feeling</p><h2 class="sm">${esc(f.name)}</h2><p class="lede soft">Where this may live in the body and the field. Choose a spot to read more.</p><div class="blk">`;
  f.targets.forEach((t) => { const tn = N.get(t.node); const hasPos = t.pos && tn.positions.some((p) => p.key === t.pos);
    h += `<button class="tgt" type="button" data-go="${t.node}${hasPos ? '|' + t.pos : ''}" data-view="chakra" style="--c:${colorOf(tn)}"><i></i><span><b>${esc(targetWhere(t, tn))}</b><span>${esc(t.t)}</span></span></button>`; });
  h += `</div><p class="note">${esc(C.info.home.points[3].t)}</p>`;
  return h;
}
function renderFeelings() {
  panel.style.setProperty('--zone', GOLD); document.documentElement.style.setProperty('--zone', GOLD);
  return `<p class="eyebrow">Index</p><h2 class="sm">All feelings</h2><p class="lede soft">Start from what you feel, and see where it may live.</p><div class="blk cols">` +
    [...C.feelings].sort((a, b) => a.name.localeCompare(b.name)).map((f) => `<button class="res" type="button" data-feeling="${esc(f.name)}"><b style="font-size:13.5px;font-weight:500">${esc(f.name)}</b></button>`).join('') + '</div>';
}
const AZ_TYPES = [['all', 'All'], ['Chakra', 'Chakras'], ['Body part', 'Body parts'], ['Field', 'Field'], ['Zodiac', 'Zodiac'], ['Feeling', 'Feelings']];
function azItems() {
  const KIND = { center: 'Chakra', stop: 'Chakra', part: 'Body part', field: 'Field', sign: 'Zodiac' }; const TAG = { center: 'Chakra', stop: 'Part of the leg', part: 'Body part', field: 'Field', sign: 'Zodiac' };
  const lc = (x) => x.charAt(0).toLowerCase() + x.slice(1); const out = [];
  C.nodes.forEach((n) => { out.push({ t: n.name, tag: TAG[n.kind], type: KIND[n.kind], go: n.id, c: colorOf(n) });
    n.positions.forEach((p) => out.push({ t: n.kind === 'part' && !/^(Left|Right) side$/.test(p.title) ? p.title : `${n.name}, ${lc(posTitle(n, p))}`, tag: p.short, type: KIND[n.kind], go: n.id + '|' + p.key, c: colorOf(n) })); });
  C.feelings.forEach((f) => out.push({ t: f.name, tag: 'Feeling', type: 'Feeling', feeling: f.name, c: GOLD }));
  const key = (x) => x.t.replace(/^[^A-Za-z]+/, '').replace(/^The /, '').toLowerCase();
  return out.map((x) => ({ ...x, k: key(x) })).sort((a, b) => a.k.localeCompare(b.k));
}
function renderAtoZ() {
  panel.style.setProperty('--zone', GOLD); document.documentElement.style.setProperty('--zone', GOLD);
  const f = S.az || 'all'; const items = azItems().filter((x) => f === 'all' || x.type === f);
  let h = `<p class="eyebrow">Index</p><h2 class="sm">Biofield A to Z</h2><p class="lede soft">Everything on the map in one list: ${items.length} entries.</p><div class="chips">` + AZ_TYPES.map(([k, l]) => `<button class="quiet" type="button" data-az="${k}" aria-pressed="${f === k}">${l}</button>`).join('') + '</div><div class="blk az">';
  let letter = '';
  items.forEach((x) => { const L = x.k.charAt(0).toUpperCase(); if (L !== letter) { letter = L; h += `<div class="azl">${L}</div>`; }
    h += `<button class="res" type="button" ${x.feeling ? `data-feeling="${esc(x.feeling)}"` : `data-go="${x.go}" data-view="chakra"`} style="--c:${x.c}"><i></i><b>${esc(x.t)}</b><span>${esc(x.tag)}</span></button>`; });
  return h + '</div>';
}
function renderInfo(id) {
  panel.style.setProperty('--zone', GOLD); document.documentElement.style.setProperty('--zone', GOLD);
  const i = C.info[id]; let h = `<p class="eyebrow">${id === 'about' ? 'InnerVerse' : id === 'home' ? 'Interactive map' : 'View'}</p><h2>${esc(i.title)}</h2>`;
  if (i.lede) h += `<p class="lede">${esc(i.lede)}</p>`;
  if (i.points.length) h += `<div class="blk"><div class="bh"><h3>${id === 'about' ? 'Credit and cautions' : 'How to read the map'}</h3></div><div class="txt"><ul>${i.points.map((p) => `<li>${esc(p.t)}</li>`).join('')}</ul></div></div>`;
  if (id === 'about') h += `<p class="note" id="fpsline"></p>`;
  if (id === 'field' && isPhone()) { let g = ''; FIELD.forEach((f) => { if (f.group !== g) { h += (g ? '</div></div>' : '') + `<div class="blk"><div class="bh"><h3>${esc(f.group)}</h3></div><div class="chips" style="margin:0">`; g = f.group; } h += `<button class="chip gl" type="button" data-go="${f.id}">${esc(f.name)}</button>`; }); h += '</div></div>'; }
  if (id === 'home') h += `<div class="blk"><div class="bh"><h3>Start here</h3></div><div class="chips" style="margin:0">` + CENTERS.map((c) => `<button class="chip" style="--zone:${colorOf(N.get(c), 1)}" type="button" data-go="${c}">${esc(N.get(c).name)}</button>`).join('') + `</div></div><div class="blk"><div class="bh"><h3>Or start from a feeling</h3></div><div class="chips" style="margin:0">` + ['Anxiety', 'Grief and loss', 'Anger', 'Overwhelm', 'Feeling stuck', 'Burnout and exhaustion'].map((f) => `<button class="chip gl" type="button" data-feeling="${f}">${f}</button>`).join('') + `<button class="chip gl" type="button" id="c-feel">All feelings</button></div></div><div class="blk"><div class="chips" style="margin:0"><button class="chip gl" type="button" data-special="atoz">Biofield A to Z</button><button class="chip gl" type="button" data-special="about">About this map</button></div></div>`;
  return h;
}
function renderPanel() {
  const n = S.id && N.get(S.id);
  detail.innerHTML = S.feeling ? renderFeeling(C.feelings.find((f) => f.name === S.feeling)) : S.special === 'feelings' ? renderFeelings() : S.special === 'atoz' ? renderAtoZ() : S.special === 'about' ? renderInfo('about') : n ? renderNode(n)
    : renderInfo(S.view === 'chakra' ? 'home' : S.view);
  const u = upTarget(); back.classList.toggle('show', !!u); if (u) back.querySelector('span').textContent = u.label;
}
detail.addEventListener('click', (e) => {
  const a = e.target.closest('.acc>button'); if (a) { const d = a.parentElement; const o = d.dataset.open !== '1'; d.dataset.open = o ? 1 : 0; a.setAttribute('aria-expanded', String(o)); return; }
  const m = e.target.closest('[data-more]'); if (m) { m.parentElement.querySelectorAll('[hidden]').forEach((x) => x.removeAttribute('hidden')); m.remove(); return; }
  const b = e.target.closest('[data-bal]'); if (b) { S.balance = b.dataset.bal; const n = N.get(S.id); const s = n.sections.find((q) => q.key === S.balance); detail.querySelector('[data-balbody]').innerHTML = blocks(s.blocks); detail.querySelectorAll('[data-bal]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); return; }
  const az = e.target.closest('[data-az]'); if (az) { S.az = az.dataset.az; const top = detail.scrollTop; renderPanel(); detail.scrollTop = Math.min(top, 0); return; }
  const sp = e.target.closest('[data-special]'); if (sp) { go({ special: sp.dataset.special }); return; }
  if (e.target.closest('#c-feel')) go({ special: 'feelings' });
});
detail.addEventListener('input', (e) => { if (e.target.matches('.age input')) { S.age = Number(e.target.value); detail.querySelector('.age output').textContent = 'Age ' + S.age; scene.setField({ on: true, focus: 'timeline', age: S.age }); setLabels(fieldLabels(N.get(S.id)), 'stacked'); } });

function render() { renderList(); renderPanel(); placeChrome(); applyScene(); }

// ---------- phone sheet ----------
const SHEETS = { peek: () => 132, half: () => Math.round(innerHeight * 0.42), full: () => Math.round(innerHeight * 0.86) };
function setSheet(s, noRefit) { sheet = s; panel.style.setProperty('--sheet', SHEETS[s]() + 'px'); placeChrome(); if (!noRefit) setTimeout(() => { scene.refit(false); labDirty = true; }, 340); }
function placeChrome() {
  if (!isPhone()) { strip.style.bottom = ''; back.style.bottom = ''; return; }
  const h = SHEETS[sheet](); strip.style.bottom = h + 'px'; back.style.bottom = (h + strip.offsetHeight + 6) + 'px'; back.style.top = 'auto';
}
{
  const grab = $('#grab'); let drag = null;
  grab.addEventListener('pointerdown', (e) => { drag = { y: e.clientY, h: panel.getBoundingClientRect().height, moved: false }; grab.setPointerCapture(e.pointerId); panel.style.transition = 'none'; });
  grab.addEventListener('pointermove', (e) => { if (!drag) return; const dy = drag.y - e.clientY; if (Math.abs(dy) > 5) drag.moved = true; if (drag.moved) panel.style.setProperty('--sheet', Math.max(96, Math.min(innerHeight * 0.9, drag.h + dy)) + 'px'); });
  const end = () => { if (!drag) return; panel.style.transition = ''; const h = panel.getBoundingClientRect().height;
    if (!drag.moved) setSheet(sheet === 'peek' ? 'half' : sheet === 'half' ? 'full' : 'half');
    else { const opts = Object.keys(SHEETS).map((k) => [k, Math.abs(SHEETS[k]() - h)]).sort((a, b) => a[1] - b[1]); setSheet(opts[0][0]); }
    drag = null; };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
  addEventListener('resize', () => { if (isPhone()) setSheet(sheet, true); else panel.style.removeProperty('--sheet'); placeChrome(); labDirty = true; });
  if (isPhone()) setSheet('half', true);
}

// ---------- search ----------
const INDEX = [];
C.nodes.forEach((n) => {
  const par = parentOf(n); const sub = n.kind === 'center' ? n.heading : n.kind === 'stop' ? 'Legs' : n.kind === 'part' ? (par ? par.name : 'Whole body') : n.kind === 'sign' ? 'Zodiac: ' + n.rules.toLowerCase() : 'The field';
  INDEX.push({ type: 'node', id: n.id, title: n.name, sub, keys: [n.name, ...(n.search || []), ...(n.heading ? [n.heading] : [])].map((k) => k.toLowerCase()), color: colorOf(n), rank: n.kind === 'center' ? 3 : n.kind === 'stop' ? 2 : 1 });
});
C.feelings.forEach((f) => INDEX.push({ type: 'feeling', id: f.name, title: f.name, sub: 'Feeling', keys: [f.name, ...f.also].map((k) => k.toLowerCase()), color: GOLD, rank: 2 }));
const TEXTS = [];
C.nodes.forEach((n) => { const add = (t, pos, where) => TEXTS.push({ id: n.id, pos, where, t, low: t.toLowerCase() });
  add(n.summary.t, null, null); n.themes.forEach((t) => add(t.t, null, 'Themes'));
  n.positions.forEach((p) => p.blocks.forEach((b) => add(b.t, p.key, p.title))); n.sides.forEach((s) => s.blocks.forEach((b) => add(b.t, null, s.title))); n.sections.forEach((s) => s.blocks.forEach((b) => add(b.t, null, s.title))); });
function search(q) {
  q = q.trim().toLowerCase(); if (q.length < 2) return null;
  const score = (e) => { let s = 0; for (const k of e.keys) { if (k === q) s = Math.max(s, 100); else if (k.startsWith(q)) s = Math.max(s, 80); else if (k.split(/[\s,/-]+/).some((w) => w.startsWith(q))) s = Math.max(s, 62); else if (q.length > 3 && k.includes(q)) s = Math.max(s, 45); else if (q.length > 4 && q.includes(k) && k.length > 3) s = Math.max(s, 40); } return s ? s + e.rank + (e.keys[0] === q || e.keys[0].startsWith(q) ? 12 : 0) : 0; };
  const hits = INDEX.map((e) => ({ e, s: score(e) })).filter((x) => x.s).sort((a, b) => b.s - a.s);
  const nodes = hits.filter((x) => x.e.type === 'node').slice(0, 7).map((x) => x.e), feels = hits.filter((x) => x.e.type === 'feeling').slice(0, 5).map((x) => x.e);
  const seen = new Set(nodes.map((e) => e.id)); const toks = q.split(/\s+/).filter(Boolean); const ment = [];
  for (const t of TEXTS) { if (ment.length >= 7) break; if (!toks.every((k) => t.low.includes(k))) continue; const key = t.id + '|' + (t.pos || ''); if (seen.has(key) || (seen.has(t.id) && !t.pos)) continue; seen.add(key);
    const i = t.low.indexOf(toks[0]); const a = Math.max(0, i - 28); const n = N.get(t.id);
    ment.push({ type: 'text', id: t.id, pos: t.pos, title: n.name + (t.where ? ', ' + t.where.toLowerCase() : ''), sub: (a ? '…' : '') + t.t.slice(a, a + 74), color: colorOf(n) }); }
  return { nodes, feels, ment };
}
{
  const q = $('#q'), box = $('#results'); let cur = -1, flat = [];
  const close = () => { box.classList.remove('open'); document.body.classList.remove('searching'); cur = -1; };
  const choose = (r) => { close(); q.value = ''; q.blur(); if (r.type === 'feeling') go({ feeling: r.id }); else go({ id: r.id, pos: r.pos || null, view: N.get(r.id).kind === 'part' ? 'chakra' : undefined }); };
  const draw = () => {
    const r = search(q.value); if (!r) { box.classList.remove('open'); return; }
    flat = [...r.nodes, ...r.feels, ...r.ment]; let i = 0;
    const row = (e) => `<button class="res" type="button" role="option" data-i="${i++}" style="--c:${e.color}"><i></i><b>${esc(e.title)}</b><span>${esc(e.sub || '')}</span></button>`;
    box.innerHTML = flat.length ? (r.nodes.length ? '<div class="rg">On the map</div>' + r.nodes.map(row).join('') : '') + (r.feels.length ? '<div class="rg">Feelings</div>' + r.feels.map(row).join('') : '') + (r.ment.length ? '<div class="rg">Mentioned in</div>' + r.ment.map(row).join('') : '')
      : '<div class="nores">Nothing on the map matches that yet. Try a body part, an organ or a feeling.</div>';
    box.classList.add('open'); cur = -1;
  };
  q.addEventListener('input', draw); q.addEventListener('focus', draw);
  q.addEventListener('keydown', (e) => {
    const rows = [...box.querySelectorAll('.res')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!rows.length) return; cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length; rows.forEach((r, i) => r.classList.toggle('cur', i === cur)); rows[cur].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = flat[cur >= 0 ? cur : 0]; if (r) choose(r); }
    else if (e.key === 'Escape') { close(); q.blur(); }
  });
  box.addEventListener('click', (e) => { const r = e.target.closest('.res'); if (r) choose(flat[Number(r.dataset.i)]); });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#searchbox') && !e.target.closest('#msearch')) close(); });
  $('#msearch').addEventListener('click', () => { document.body.classList.add('searching'); q.focus(); });
}
addEventListener('keydown', (e) => { if (e.key === '/' && document.activeElement !== $('#q')) { e.preventDefault(); if (isPhone()) document.body.classList.add('searching'); $('#q').focus(); } else if (e.key === 'Escape' && document.activeElement !== $('#q')) { const u = upTarget(); if (u) go(u.to); } });

$('#cta').textContent = C.cta.label; $('#cta').href = C.cta.url;
renderList(); renderPanel(); placeChrome();
window.__bfa = { go, S, N, C, scene, MODEL, search, labs: () => LABS };
