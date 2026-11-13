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
const FEEL_AZ = [...C.feelings].sort((a, b) => a.name.localeCompare(b.name));
const POS = C.posNames;
const IVORY = '#EFE9DC', WARM = '#E6C98A', PEARL = '#D5D9F2';
// The zodiac body is coloured by element and mode (Chance, 2026-11-13): fire red, earth green, air yellow, water blue;
// mutable signs carry the pure colour, fixed signs the deep one (colour and black), cardinal signs the light one (colour and white).
const ELEMENT = { aries: ['Fire', 'Cardinal'], taurus: ['Earth', 'Fixed'], gemini: ['Air', 'Mutable'], cancer: ['Water', 'Cardinal'], leo: ['Fire', 'Fixed'], virgo: ['Earth', 'Mutable'],
  libra: ['Air', 'Cardinal'], scorpio: ['Water', 'Fixed'], sagittarius: ['Fire', 'Mutable'], capricorn: ['Earth', 'Cardinal'], aquarius: ['Air', 'Fixed'], pisces: ['Water', 'Mutable'] };
const ELEMENT_COLOR = { Fire: { Cardinal: '#ff9186', Mutable: '#ec2c28', Fixed: '#981313' }, Earth: { Cardinal: '#95e49d', Mutable: '#2db64b', Fixed: '#176b2b' },
  Air: { Cardinal: '#fff4a3', Mutable: '#f5d01c', Fixed: '#ab850b' }, Water: { Cardinal: '#96c6ff', Mutable: '#2c78ee', Fixed: '#193c98' } };
const ELEMENT_INK = { Fire: { Cardinal: '#ffa198', Mutable: '#ff6b62', Fixed: '#e0564f' }, Earth: { Cardinal: '#a3e9aa', Mutable: '#58d273', Fixed: '#46b061' },
  Air: { Cardinal: '#fff4a3', Mutable: '#f7d93f', Fixed: '#d6ad2c' }, Water: { Cardinal: '#a4cdff', Mutable: '#62a0ff', Fixed: '#5a82e6' } };   // the same hues, lifted where needed so small text reads on the dark ground
SIGNS.forEach((n) => { const [el, mo] = ELEMENT[n.id]; n.element = el; n.mode = mo; n.zc = ELEMENT_COLOR[el][mo]; n.za = ELEMENT_INK[el][mo]; });
const ZPAINT = ['cancer', 'sagittarius', 'gemini', 'leo', 'virgo', 'libra', 'scorpio', 'capricorn', 'aquarius', 'pisces', 'taurus', 'aries'];   // painting order on the body: broad areas first, so a smaller area sits on top of a larger one
const zodWeights = (id) => ZPAINT.map((z) => (!id || z === id ? 1 : 0.3));
const colorOf = (n, text) => { if (!n) return IVORY; if (n.kind === 'sign') return text ? n.za : n.zc; if (n.kind === 'field') return PEARL; const z = ZONES[n.color]; if (!z) return '#d8cfb8'; return text ? (z.accent || z.color) : (z.dot || z.color); };
const parentOf = (n) => (n.parent && N.get(n.parent)) || null;
const centerOf = (n) => { let p = n; while (p && p.kind !== 'center') p = parentOf(p); return p; };

// ---------- state ----------
const store = { get: (k) => { try { return localStorage.getItem('bfa.' + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('bfa.' + k, v); } catch (e) { /* private mode */ } } };
const S = { view: 'chakra', id: null, pos: null, feeling: null, special: null, age: Math.max(6, Math.min(100, Number(store.get('age')) || 40)), balance: 'balanced' };
const RESUME = location.hash.length > 1 ? null : store.get('last');   // where the last visit ended, offered on the opening panel
const detail = $('#detail'), list = $('#list'), strip = $('#strip'), back = $('#back'), panel = $('#panel'), rail = $('#rail');
let sheet = 'half', swayed = false;

// ---------- scene ----------
let scene; const sceneHooks = {
  freeRect: () => {
    const W = innerWidth, H = innerHeight;
    if (isPhone()) { const top = rail.getBoundingClientRect().bottom; const bottom = Math.min(panel.getBoundingClientRect().top, H) - strip.offsetHeight; return { x0: 0, x1: W, y0: top, y1: Math.max(top + 120, bottom) }; }
    return { x0: rail.getBoundingClientRect().right + 8, x1: panel.getBoundingClientRect().left - 8, y0: 0, y1: H - 62 };
  },
  onReady: () => { document.body.classList.add('ready'); route(true); window.__bfaReady = true; },
  onError: () => { $('#status').textContent = 'The 3D model could not load. Reload the page to try again.'; },
  onPick: pick,
  onFrame: () => { layoutLabels(); showFacing(); },
  hoverable: () => (S.view === 'chakra' || S.view === 'feelings') && !S.special,
  onHover: hover,
  onFps: (f) => { window.__bfaFps = f; },
};
try { scene = createScene($('#stage'), MODEL, sceneHooks, { signs: ZPAINT.map((id) => ({ color: N.get(id).zc, regions: N.get(id).light.regions })) }); }
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
  if (n.kind === 'sign') { f.w *= 1.24; f.h *= 1.24; }
  let az = f.az || 0;
  if (pos) { const backView = Math.abs(az) > 90; az = backView ? (pos.includes('L') ? 148 : pos.includes('R') ? -148 : 180) : POS_AZ[pos] ?? 0; }
  return { frame: f, az };
}
const HOME_FRAME = { y: 0.82, w: 0.95, h: 2.1, tilt: 2 };   // the whole figure with room for the two ends of the current, above the head and below the feet
const homeFrame = () => (isPhone() ? { ...HOME_FRAME, y: 0.83, h: 1.96 } : HOME_FRAME);   // phones keep the figure larger; the two stars sit at the edges of the stage
const FIELD_FRAMES = { home: { y: 0.83, w: 4.5, h: 5.5, tilt: 7 }, edge: { y: 0.83, w: 4.5, h: 5.5, tilt: 7 }, timeline: { y: 0.9, w: 4.5, h: 3.4, tilt: 24 }, adrenal: { y: 1.0, w: 2.7, h: 2.6, tilt: 16 },
  near: { y: 0.86, w: 1.7, h: 2.5, tilt: 4 }, sides: { y: 0.9, w: 2.4, h: 2.9, tilt: 4 }, frontback: { y: 0.9, w: 2.4, h: 2.9, tilt: 6 } };
const SIGN_SIDE = { aries: 'R', taurus: 'L', gemini: 'R', cancer: 'L', leo: 'R', virgo: 'L', libra: 'L', scorpio: 'R', sagittarius: 'R', capricorn: 'L', aquarius: 'R', pisces: 'L' };
const SIGN_AT = { aries: [0, 1.60, 0.13], taurus: [0, 1.415, 0.085], gemini: [0.215, 1.30, 0.03], cancer: [-0.075, 1.19, 0.125], leo: [0.03, 1.275, 0.135], virgo: [0, 1.0, 0.125], libra: [-0.07, 1.05, -0.07],
  scorpio: [0, 0.845, 0.105], sagittarius: [0.14, 0.70, 0.10], capricorn: [-0.142, 0.475, 0.095], aquarius: [0.165, 0.25, 0.07], pisces: [-0.185, 0.03, 0.14] };

// ---------- navigation ----------
function go(next) {
  const prev = { ...S };
  if (next.special === 'feelings') next = { view: 'feelings' };
  Object.assign(S, { id: null, pos: null, feeling: null, special: null }, next);
  if (S.id) {
    const n = N.get(S.id); if (!n) { S.id = null; }
    else if (n.kind === 'field') S.view = 'field'; else if (n.kind === 'sign') S.view = 'zodiac';
    else if (n.kind === 'part') S.view = next.view === 'organs' ? 'organs' : 'chakra'; else S.view = 'chakra';
    if (S.pos && !(n && n.positions.some((p) => p.key === S.pos))) S.pos = null;
  } else if (S.feeling) S.view = 'feelings'; else if (S.special) S.view = next.view || prev.view;
  if (isPhone() && (S.id || S.feeling || S.special) && sheet === 'peek') setSheet('half');
  if (prev.id !== S.id) S.balance = 'balanced';
  hideMenu(); render(); writeHash(); if (S.id || S.feeling) store.set('last', hashOf());
  if (prev.id !== S.id || prev.pos !== S.pos || prev.feeling !== S.feeling || prev.special !== S.special) detail.scrollTop = 0;
}
function hashOf() {
  if (S.feeling) return 'feeling-' + slug(S.feeling);
  if (S.special) return S.special;
  if (S.id) return S.id + (S.pos ? '-pos-' + S.pos.toLowerCase() : '') + (S.view === 'organs' ? '-in-organs' : '');
  return S.view === 'chakra' ? '' : 'view-' + S.view;
}
function writeHash() { const h = hashOf(); if (location.hash.replace(/^#/, '') !== h) { try { history[instantNext || !window.__bfaReady ? 'replaceState' : 'pushState'](null, '', h ? '#' + h : location.pathname + location.search); } catch (e) { /* sandboxed */ } } }
function route(instant) {
  let h = decodeURIComponent(location.hash.replace(/^#/, '')); const next = {};
  if (h.startsWith('feeling-')) { const f = C.feelings.find((x) => slug(x.name) === h.slice(8)); if (f) next.feeling = f.name; }
  else if (h === 'feelings') next.view = 'feelings';
  else if (h === 'about' || h === 'atoz') next.special = h;
  else if (h.startsWith('view-')) next.view = ['chakra', 'field', 'organs', 'zodiac', 'feelings'].includes(h.slice(5)) ? h.slice(5) : 'chakra';
  else if (h) { if (h.endsWith('-in-organs')) { next.view = 'organs'; h = h.slice(0, -10); } const m = h.match(/^(.*?)(?:-pos-([a-z]+))?$/); if (m && N.has(m[1])) { next.id = m[1]; if (m[2]) next.pos = m[2].toUpperCase(); } }
  if (!next.view && !next.id && !next.feeling && !next.special) next.view = 'chakra';
  instantNext = !!instant; go(next); instantNext = false;
}
let instantNext = false;
addEventListener('hashchange', () => { if (location.hash.replace(/^#/, '') !== hashOf()) route(false); });
addEventListener('popstate', () => { if (location.hash.replace(/^#/, '') !== hashOf()) route(false); });

function upTarget() {
  if (S.pos) return { label: N.get(S.id).name, to: { id: S.id, view: S.view } };
  if (S.feeling) return { label: 'All feelings', to: { view: 'feelings' } };
  if (S.special) return { label: 'Back to the map', to: { view: S.view } };
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
  const cur0 = S.id; if (id !== S.id) go({ id });
  deeper(p, N.get(id), cur0 === id);
}
// a small menu at the tap point: the part under the finger and the spot on that side of the center
const menu = $('#pickmenu'); let menuT = 0;
function hideMenu() { if (menu) menu.hidden = true; clearTimeout(menuT); }
function deeper(p, n, already) {
  if (!menu || !n || !p.point) return; const rows = [];
  const parts = []; if (p.arm > 0.3 && N.has('arms')) parts.push(N.get('arms'));
  (p.under || []).forEach((oid) => { const part = partOfOrgan(oid); if (part && !parts.includes(part) && centerOf(part) === (centerOf(n) || n)) parts.push(part); });
  parts.slice(0, 2).forEach((q) => rows.push(`<button class="res" type="button" data-go="${q.id}" style="--c:${colorOf(q)}"><i></i><b>${esc(q.name)}</b><span>Body part</span></button>`));
  const sx = p.point[0] > 0.02 ? 'L' : p.point[0] < -0.02 ? 'R' : '', sz = p.point[2] >= MID ? 'F' : 'B';
  const spot = n.positions.find((q) => q.key === sx + sz) || n.positions.find((q) => q.key === sx) || (sz === 'B' && n.positions.find((q) => q.key === 'B'));
  if (spot && p.arm <= 0.3) rows.push(`<button class="res" type="button" data-go="${n.id}|${spot.key}" style="--c:${colorOf(n)}"><i></i><b>${esc(posTitle(n, spot))}</b><span>${esc(spot.short)}</span></button>`);
  if (!rows.length) return;
  menu.innerHTML = `<div class="rg">${already ? 'Go deeper' : esc(n.name) + ': go deeper'}</div>` + rows.join(''); menu.hidden = false;
  const w = menu.offsetWidth, h = menu.offsetHeight; const top = isPhone() ? rail.getBoundingClientRect().bottom + 6 : 8; const bottom = (isPhone() ? Math.min(panel.getBoundingClientRect().top, innerHeight) : innerHeight) - 8;
  menu.style.transform = `translate3d(${Math.round(Math.max(8, Math.min(innerWidth - w - 8, p.x + 14)))}px,${Math.round(Math.max(top, Math.min(bottom - h, p.y + 14)))}px,0)`;
  clearTimeout(menuT); menuT = setTimeout(hideMenu, 9000);
}
document.addEventListener('pointerdown', (e) => { if (menu && !menu.hidden && !e.target.closest('#pickmenu') && !e.target.closest('#stage')) hideMenu(); });
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
  if (S.special) { scene.setLook({ mode: 'chakra', orbs: 1, aura: 0.5 }); fly(homeFrame(), { az: 0 }); setLabels([], 'anchored'); return; }
  if (!n) {
    if (S.view === 'field') { scene.setLook({ mode: 'chakra', orbs: 0, aura: 0.22 }); fly(FIELD_FRAMES.home, { az: 24 }); labels = fieldLabels(null); layout = 'stacked'; }
    else if (S.view === 'organs') { scene.setLook({ mode: 'organs', orbs: 0, aura: 0.3 }); fly(homeFrame(), { az: 0 }); }
    else if (S.view === 'zodiac') { scene.setLook({ mode: 'zodiac', orbs: 0, aura: 0.1, zodW: zodWeights(null) }); fly(homeFrame(), { az: 0 });
      labels = SIGNS.map((s) => ({ id: s.id, anchor: SIGN_AT[s.id], cls: 'glyph', l1: s.glyph, l2: s.name, color: s.zc, ink: s.za, side: SIGN_SIDE[s.id], go: { id: s.id } })); layout = 'stacked'; }
    else { scene.setLook({ mode: 'chakra', orbs: 1, aura: 0.5 }); fly(homeFrame(), { az: 0 }); if (!swayed && scene.startSway) { swayed = true; scene.startSway(); }
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
    scene.setLook({ mode: 'zodiac', selected: true, regions: L.regions, organs, glow: L.glow, open: hasOrgans ? 0.8 : 0.12, orbs: 0, aura: 0.1, zodW: zodWeights(n.id), hiColor: n.zc });
    fly(frame, { az });
    labels = [{ id: n.id, anchor: SIGN_AT[n.id], cls: 'glyph on', l1: n.glyph, l2: n.rules, color: n.zc, ink: n.za }];
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
const orbAt = (i) => [i === 0 ? 0.105 : 0, i === 0 ? 0.47 : i === 7 ? 1.70 : ZONES[i].y + (i === 6 ? 0.025 : 0), [0.118, 0.115, 0.125, 0.13, 0.135, 0.10, 0.145, 0.03][i]];
function fieldLabels(n) {
  const A = scene.fieldAnchors(); const key = n && n.marker; const byMarker = (m) => FIELD.find((f) => f.marker === m);
  const mk = (id, anchor, l1, l2, marker, side) => ({ id, anchor, l1: isPhone() ? null : l1, l2: isPhone() ? l1 : l2, color: PEARL, side, cls: key ? (marker === key || (key === 'channel' && /star/.test(marker)) ? 'on' : 'dim') : '', go: marker !== key && byMarker(marker) ? { id: byMarker(marker).id } : null });
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
    const el = document.createElement(d.go ? 'button' : 'div'); el.className = 'lab ' + (d.cls || ''); if (d.go) el.type = 'button'; el.style.setProperty('--c', d.color || IVORY); if (d.ink) el.style.setProperty('--ink-c', d.ink);
    el.innerHTML = `<span class="ld"></span><span class="lt">${d.l1 ? `<span class="l1">${esc(d.l1)}</span>` : ''}${d.l2 ? `<span class="l2">${esc(d.l2)}</span>` : ''}</span>`;
    if (d.go) el.addEventListener('click', () => go(d.go));
    labBox.appendChild(el);
    let pin = null, line = null;
    if (!d.nopin) { pin = document.createElement('span'); pin.className = 'pin'; pin.style.setProperty('--c', d.color || IVORY); labBox.appendChild(pin);
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
  const fr = phone ? { x0: 4, x1: W - 4, y0: rail.getBoundingClientRect().bottom + 4, y1: Math.min(panel.getBoundingClientRect().top, H) - strip.offsetHeight - 4 - (labLayout === 'stacked' ? 54 : 0) }
    : { x0: rail.getBoundingClientRect().right + 10, x1: panel.getBoundingClientRect().left - 10, y0: 10, y1: H - 70 };
  const td = scene.targetDepth(); const cx = (fr.x0 + fr.x1) / 2;
  const hideAll = phone && sheet === 'full';
  LABS.forEach((l) => { l.p = scene.project(l.d.anchor); l.far = labLayout === 'anchored' && l.p.depth > td + 0.06; l.hidden = hideAll || l.p.behind || l.p.x < fr.x0 - 40 || l.p.x > fr.x1 + 40 || l.p.y < fr.y0 - 40 || l.p.y > fr.y1 + 40; });
  if (labLayout === 'stacked') {
    const cols = { L: [], R: [] }; let tickFlip = false;
    LABS.forEach((l) => { if (l.hidden) return; if (l.d.cls === 'tick') { l.bx = l.p.x - l.w / 2; l.by = (l.tickUp = !tickFlip) ? l.p.y - l.h - 7 : l.p.y + 7; tickFlip = !tickFlip; return; } cols[l.d.side || (l.p.x < cx ? 'L' : 'R')].push(l); });
    for (const side of ['L', 'R']) {
      const a = cols[side].sort((p, q) => p.p.y - q.p.y); const gap = phone ? 4 : 6; let y = fr.y0;
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
  if (n.kind === 'sign') return `<button class="it ${cls || ''}" type="button" data-go="${n.id}" aria-current="${cur}" style="--c:${n.za}"><span class="gl">${n.glyph}</span><span class="zt"><span class="zn">${esc(n.name)}</span><span class="zs" style="font-size:12px;color:var(--ink-soft)">${esc(n.rules)}</span></span></button>`;
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
    h += `<div class="gh">Whole body</div>` + WHOLE.map((n) => item(n, 'sub')).join('');
  } else if (S.view === 'field') {
    let g = ''; FIELD.forEach((n) => { if (n.group !== g) { g = n.group; h += `<div class="gh">${esc(g)}</div>`; } h += item(n, 'plain'); chips += chip(n, esc(n.name)); });
  } else if (S.view === 'organs') {
    CENTERS.forEach((id) => { const n = N.get(id); h += `<div class="gh" style="color:${colorOf(n, 1)}">${esc(n.name)}</div>` + n.parts.filter((p) => p !== 'legs').map((p) => item(N.get(p), 'sub')).join(''); });
    h += `<div class="gh">Whole body</div>` + WHOLE.map((n) => item(n, 'sub')).join('');
    [...CENTERS.flatMap((id) => N.get(id).parts.filter((p) => p !== 'legs')), ...WHOLE.map((n) => n.id)].forEach((p) => { const n = N.get(p); chips += chip(n, `<i></i>${esc(n.name)}`); });
  } else if (S.view === 'feelings') {
    h = `<div class="gh">Feelings, A to Z</div>` + FEEL_AZ.map((f) => `<button class="it plain" type="button" data-feeling="${esc(f.name)}" aria-current="${S.feeling === f.name}"><span class="zt"><span class="zn">${esc(f.name)}</span></span></button>`).join('');
  } else { SIGNS.forEach((n) => { h += item(n); chips += chip(n, `<em>${n.glyph}</em>${esc(n.name)}`); }); }
  list.innerHTML = h; strip.innerHTML = S.view === 'organs' && !S.feeling && !S.special ? chips : '';
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === S.view)));
  const a = list.querySelector('[aria-current="true"]'); if (a) a.scrollIntoView({ block: 'nearest' });
  const b = strip.querySelector('[aria-current="true"]'); if (b) b.scrollIntoView({ inline: 'center', block: 'nearest' });
}
document.addEventListener('click', (e) => {
  const ln = e.target.closest('a.ln'); if (ln) { e.preventDefault(); const h = decodeURIComponent(ln.getAttribute('href').slice(1));
    if (h.startsWith('feeling-')) { const f = C.feelings.find((x) => slug(x.name) === h.slice(8)); if (f) go({ feeling: f.name }); } else { const n = N.get(h); if (n) go({ id: h, view: n.kind === 'part' && S.view === 'organs' ? 'organs' : undefined }); } return; }
  const g = e.target.closest('[data-go]'); if (g) { const [id, pos] = g.dataset.go.split('|'); go({ id, pos: pos || null, view: g.dataset.view || S.view }); return; }
  const f = e.target.closest('[data-feeling]'); if (f) { go({ feeling: f.dataset.feeling }); return; }
  const v = e.target.closest('[data-setview]'); if (v) { go({ view: v.dataset.setview }); return; }
});
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => go({ view: t.dataset.view })));
$('#b-atoz').addEventListener('click', () => go({ special: 'atoz' }));
$('#matoz').addEventListener('click', () => go({ special: 'atoz' }));
$('#b-about').addEventListener('click', () => go({ special: 'about' }));
$('#b-keys').addEventListener('click', () => toggleKeys());
back.addEventListener('click', () => { const u = upTarget(); if (u) go(u.to); });

// ---------- pathways: every part, center, field topic, sign and feeling named in the wording is a way onward ----------
// The words that become links are the entries' own names (and their plain singular or plural forms), nothing else.
const LINK_STOP = new Set(['loss', 'lack', 'control', 'love', 'joy']);
const TERMS = new Map();
const addTerm = (t, to, pri) => { t = t.trim().toLowerCase(); if (t.length < 3 || LINK_STOP.has(t)) return; const had = TERMS.get(t); if (!had || pri > had.pri) TERMS.set(t, { ...to, pri }); };
const wordForms = (p) => { const out = [p]; const m = p.match(/^(.*) (glands?|nerve)$/); if (m) out.push(m[1], m[1] + 's'); if (/ses$/.test(p)) out.push(p.slice(0, -2)); else if (/[a-rt-z]s$/.test(p) && !/(us|is)$/.test(p)) out.push(p.slice(0, -1)); return out; };
const EXTRA_TERMS = { feet: ['foot'], midback: ['mid back', 'middle back'], sciatic: ['sciatica'], heartorgan: ['physical heart', 'heart organ'], lowback: ['low back'],
  'f-edge': ['edge of the field', 'torus'], 'f-timeline': ['timeline'], 'f-channel': ['central channel', 'midline'], 'f-sunstar': ['sun star'], 'f-earthstar': ['earth star'], 'f-rivers': ['ancestral river', 'ancestral rivers'],
  'f-parents': ['mother zone', 'father zone'], 'f-adrenal': ['adrenal field'], 'f-ditch': ['left-hand ditch'], 'f-drawers': ['file drawer', 'file drawers'] };
C.nodes.forEach((n) => { const to = { id: n.id };
  if (n.kind === 'sign') { TERMS.set(n.name.toLowerCase(), { ...to, pri: 9, cs: true }); return; }   // signs only when written with a capital
  if (n.kind !== 'field' && n.id !== 'heartorgan') { const base = n.name.toLowerCase(); const pri = n.kind === 'center' ? 5 : n.kind === 'stop' ? 4 : 3;
    [base, ...base.split(/,\s*|\s+and\s+/)].forEach((p) => wordForms(p).forEach((w) => addTerm(w, to, pri))); }
  (EXTRA_TERMS[n.id] || []).forEach((t) => addTerm(t, to, 6)); });
C.feelings.forEach((f) => { const to = { feeling: f.name }; [f.name, ...f.name.split(/,\s*|\s+and\s+/)].forEach((p) => addTerm(p, to, 2)); });
const LINK_RE = new RegExp('\\b(' + [...TERMS.keys()].sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'gi');
const keyOf = (to) => (to.feeling ? 'f:' + to.feeling : to.id);
function eachLink(t, fn) { LINK_RE.lastIndex = 0; let m; while ((m = LINK_RE.exec(t))) { const to = TERMS.get(m[0].toLowerCase()); if (!to || (to.cs && !/^[A-Z]/.test(m[0]))) continue; fn(m, to); } }
let LCTX = { self: null, seen: new Set() };   // one link per destination per panel, and never to the page you are on
function linkify(t) { let out = '', last = 0;
  eachLink(t, (m, to) => { const k = keyOf(to); if (k === LCTX.self || LCTX.seen.has(k)) return; LCTX.seen.add(k);
    out += esc(t.slice(last, m.index)) + `<a class="ln" href="#${to.feeling ? 'feeling-' + slug(to.feeling) : to.id}">${esc(m[0])}</a>`; last = m.index + m[0].length; });
  return out + esc(t.slice(last)); }
// plain anatomy words that stand for several parts at once (a pathway offered under the text, never a new meaning)
const CONCEPTS = [[/\bdigest(?:ion|ive|ing)?\b/i, ['stomach', 'smallintestine', 'largeintestine']]];
const textsOf = (n) => [n.summary.t, ...(n.governs ? [n.governs.t] : []), ...n.sections.flatMap((x) => x.blocks.map((b) => b.t)), ...n.sides.flatMap((x) => x.blocks.map((b) => b.t))];
function scan(texts, self) { const out = []; texts.forEach((t) => { eachLink(t, (m, to) => { const k = keyOf(to); if (k !== self && !out.includes(k)) out.push(k); });
  CONCEPTS.forEach(([re, ids]) => { if (re.test(t)) ids.forEach((id) => { if (id !== self && N.has(id) && !out.includes(id)) out.push(id); }); }); }); return out; }
const OUT = new Map(), OUTPOS = new Map(), INB = new Map(), FEEL_AT = new Map();
C.nodes.forEach((n) => { const o = scan(textsOf(n), n.id); OUT.set(n.id, o); n.positions.forEach((p) => OUTPOS.set(n.id + '|' + p.key, scan(p.blocks.map((b) => b.t), n.id)));
  new Set([...o, ...n.positions.flatMap((p) => OUTPOS.get(n.id + '|' + p.key))]).forEach((k) => { if (!INB.has(k)) INB.set(k, []); INB.get(k).push(n.id); }); });
C.feelings.forEach((f) => f.targets.forEach((t) => { if (!FEEL_AT.has(t.node)) FEEL_AT.set(t.node, []); const l = FEEL_AT.get(t.node); if (!l.some((x) => x.name === f.name && x.pos === t.pos)) l.push({ name: f.name, pos: t.pos }); }));
const chipFor = (k) => { if (k.startsWith('f:')) return `<button class="chip gl" type="button" data-feeling="${esc(k.slice(2))}">${esc(k.slice(2))}</button>`;
  const n = N.get(k); return n ? `<button class="chip" style="--zone:${colorOf(n, 1)}" type="button" data-go="${n.id}" data-view="${n.kind === 'part' && S.view === 'organs' ? 'organs' : 'chakra'}">${esc(n.name)}</button>` : ''; };
const chipRow = (title, keys, max = 9) => { keys = keys.filter((k) => k.startsWith('f:') || N.has(k)); if (!keys.length) return '';
  return `<div class="xh">${title}</div><div class="chips" style="margin:0">` + keys.map((k, i) => (i >= max ? chipFor(k).replace('<button ', '<button hidden ') : chipFor(k))).join('') + (keys.length > max ? `<button class="chip gl" type="button" data-more>+${keys.length - max} more</button>` : '') + '</div>'; };
// previous and next: up and down the body for centers, round the ring for everything else
function seqOf() {
  const step = (arr, i, mk, wrap) => { if (arr.length < 2 || i < 0) return null; const a = i > 0 ? arr[i - 1] : wrap ? arr[arr.length - 1] : null, b = i < arr.length - 1 ? arr[i + 1] : wrap ? arr[0] : null; return { prev: a ? mk(a) : null, next: b ? mk(b) : null }; };
  if (S.feeling) return step(FEEL_AZ, FEEL_AZ.findIndex((f) => f.name === S.feeling), (f) => ({ label: f.name, to: { feeling: f.name } }), true);
  const n = S.id && N.get(S.id); if (!n) return null;
  if (S.pos) { const ps = n.positions.map((p) => p.key); return step(ps, ps.indexOf(S.pos), (k) => ({ label: n.positions.find((p) => p.key === k).title, to: { id: n.id, pos: k, view: S.view } }), true); }
  const ids = n.kind === 'center' ? CENTERS : n.kind === 'field' ? FIELD.map((f) => f.id) : n.kind === 'sign' ? SIGNS.map((x) => x.id) : n.parent === 'whole' ? WHOLE.map((x) => x.id) : ((parentOf(n) && parentOf(n).parts) || []);
  return step(ids, ids.indexOf(n.id), (id) => ({ label: N.get(id).name, to: { id, view: S.view } }), n.kind !== 'center' && n.kind !== 'stop');
}
const ARL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', ARR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
function navRow() {
  const q = seqOf(); const n = S.id && N.get(S.id); const words = n && n.kind === 'center' && !S.pos ? ['Above', 'Below'] : ['Previous', 'Next'];
  const b = (x, dir) => { if (!x) return '<span></span>'; const t = x.to; const attr = t.feeling ? `data-feeling="${esc(t.feeling)}"` : `data-go="${t.id}${t.pos ? '|' + t.pos : ''}" data-view="${t.view}"`;
    return `<button class="pn ${dir}" type="button" ${attr}>${dir === 'prev' ? ARL : ''}<span><small>${words[dir === 'prev' ? 0 : 1]}</small>${esc(x.label)}</span>${dir === 'next' ? ARR : ''}</button>`; };
  return (q ? `<div class="pnrow">${b(q.prev, 'prev')}${b(q.next, 'next')}</div>` : '') + `<div class="chips" style="margin:10px 0 0"><button class="chip gl" type="button" data-copy>Copy a link to this page</button></div>`;
}
function explore(n, p) {
  const self = n.id; const shown = new Set([self, ...(p ? [] : [...(n.parts || []), ...(n.signs || []), ...(n.kind === 'sign' ? n.centers : [])])]);
  let named = p ? [...OUTPOS.get(n.id + '|' + p.key), ...scan(n.sides.filter((x) => p.key.includes(x.key)).flatMap((x) => x.blocks.map((b) => b.t)), self)] : [...OUT.get(self)];
  if (!p && (n.kind === 'part' || n.kind === 'stop')) { const c = centerOf(n); if (c && !named.includes(c.id)) named.unshift(c.id); }
  named = named.filter((k, i, a) => !shown.has(k) && a.indexOf(k) === i);
  const feels = (FEEL_AT.get(self) || []).filter((x) => !p || x.pos === p.key).map((x) => 'f:' + x.name).filter((k, i, a) => a.indexOf(k) === i && !named.includes(k));
  const also = p ? [] : (INB.get(self) || []).filter((k) => !shown.has(k) && !named.includes(k));
  const area = n.kind === 'sign' && !p ? [...new Set(Object.keys(n.light.organs || {}).map((o) => partOfOrgan(o)).filter(Boolean).map((q) => q.id))].filter((k) => !named.includes(k)) : [];
  return `<div class="blk xp"><div class="bh"><h3>Keep exploring</h3></div>` + chipRow('Body parts in this area', area) + chipRow('Follow the thread', named) + chipRow('Feelings that may live here', feels, 8) + chipRow('Also mentioned in', also, 6) + navRow() + '</div>';
}
function exploreFeeling(f) {
  const self = 'f:' + f.name; const at = new Set(f.targets.map((t) => t.node));
  const near = C.feelings.filter((g) => g !== f).map((g) => [g, g.targets.filter((t) => at.has(t.node)).length]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 7).map((x) => 'f:' + x[0].name);
  const named = scan(f.targets.map((t) => t.t), self).filter((k) => !at.has(k) && !near.includes(k));
  const also = (INB.get(self) || []).filter((k) => !at.has(k) && !named.includes(k));
  return `<div class="blk xp"><div class="bh"><h3>Keep exploring</h3></div>` + chipRow('Follow the thread', named) + chipRow('Also mentioned in', also, 6) + chipRow('Feelings found in the same places', near) + navRow() + '</div>';
}
function zodiacLegend() {
  const els = ['Fire', 'Earth', 'Air', 'Water'], mos = ['Cardinal', 'Fixed', 'Mutable'];
  let h = `<div class="blk"><div class="bh"><h3>The colors</h3><span>Element by color, mode by shade</span></div><div class="zleg"><span></span>` + mos.map((m) => `<span class="zh">${m}</span>`).join('');
  els.forEach((el) => { h += `<span class="zh el">${el}</span>` + mos.map((m) => { const g = SIGNS.find((x) => x.element === el && x.mode === m); return `<button class="zcell" type="button" data-go="${g.id}" style="--c:${g.zc}"><i></i><span>${esc(g.name)}</span></button>`; }).join(''); });
  return h + `</div><p class="note">Cardinal signs carry the light shade, fixed signs the deep shade, mutable signs the pure color. Leo and Libra sit on the back of the body: turn the figure to see them.</p></div>`;
}
function resumeTitle() {
  let h = RESUME || ''; if (h.startsWith('feeling-')) { const f = C.feelings.find((x) => slug(x.name) === h.slice(8)); return f ? f.name : ''; }
  h = h.replace(/-in-organs$/, ''); const m = h.match(/^(.*?)(?:-pos-([a-z]+))?$/); const n = m && N.get(m[1]); if (!n) return '';
  const p = m[2] && n.positions.find((q) => q.key === m[2].toUpperCase()); return n.name + (p ? ', ' + p.title.toLowerCase() : '');
}
function copyLink(btn) {
  const done = (ok) => { btn.textContent = ok ? 'Link copied' : 'Copy the address from your browser bar'; setTimeout(() => { btn.textContent = 'Copy a link to this page'; }, 2200); };
  try { navigator.clipboard.writeText(location.href).then(() => done(true), () => done(false)); } catch (e) { done(false); }
}
function toggleKeys(show) { const k = $('#keys'); k.hidden = show === undefined ? !k.hidden : !show; }

// ---------- panel ----------
const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const blocks = (bl) => { let h = '', inList = false; bl.forEach((b) => { if (b.li) { if (!inList) { h += '<ul>'; inList = true; } h += `<li>${linkify(b.t)}</li>`; } else { if (inList) { h += '</ul>'; inList = false; } h += `<p>${linkify(b.t)}</p>`; } }); return h + (inList ? '</ul>' : ''); };
const ACC_OPEN = new Map();   // sections the visitor opened or closed stay that way from entry to entry
const acc = (title, inner, open, small, key) => { const k = key || slug(title); const o = ACC_OPEN.has(k) ? ACC_OPEN.get(k) : open; return `<div class="acc" data-open="${o ? 1 : 0}" data-k="${k}"><button type="button" aria-expanded="${!!o}"><span>${esc(title)}${small ? `<small>${esc(small)}</small>` : ''}</span>${CHEV}</button><div class="in txt">${inner}</div></div>`; };
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
  const eyebrow = n.kind === 'center' ? (n.eyebrow || 'Energy center') : n.kind === 'stop' ? n.eyebrow : n.kind === 'part' ? (par ? `Part of the ${par.name.toLowerCase() === 'legs' ? 'legs' : par.name}` : 'Whole body') : n.kind === 'sign' ? `${n.mode} ${n.element.toLowerCase()} sign` : n.group;
  let h = crumbs(n);
  if (n.kind === 'sign') h += `<p class="bigglyph" aria-hidden="true">${n.glyph}</p>`;
  h += `<p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(n.name)}</h2>`;
  if (n.heading) h += `<p class="heading">${esc(n.heading)}</p>`;
  if (n.kind === 'sign') h += `<p class="heading">Rules: ${esc(n.rules.charAt(0).toLowerCase() + n.rules.slice(1))}</p>`;
  if (n.kind === 'field' && n.short) h += `<p class="heading">${esc(n.short)}</p>`;
  h += `<p class="lede">${linkify(n.summary.t)}</p>`;
  if (n.themes.length) { const max = 7; h += `<div class="chips" data-themes>` + n.themes.map((t, i) => `<span class="tag" ${i >= max ? 'hidden' : ''}>${esc(t.t)}</span>`).join('') + (n.themes.length > max ? `<button class="tag more" type="button" data-more>+${n.themes.length - max} more</button>` : '') + '</div>'; }
  if (n.governs) h += `<p class="gov"><b>Governs:</b> ${esc(n.governs.t.charAt(0).toLowerCase() + n.governs.t.slice(1))}</p>`;
  if (n.parts && n.parts.length) h += `<div class="blk ph-only"><div class="bh"><h3>${n.id === 'legs' ? 'Parts of the leg' : 'Parts of this center'}</h3></div><div class="chips" style="margin:0">` + n.parts.map((p) => `<button class="chip" type="button" data-go="${p}">${esc(N.get(p).name)}</button>`).join('') + '</div></div>';
  if (n.marker === 'timeline') h += `<div class="blk"><div class="bh"><h3>Try it with your age</h3></div><div class="age"><input type="range" min="6" max="100" step="1" value="${S.age}" aria-label="Your age, slider"><label>Age <input type="number" inputmode="numeric" min="6" max="100" step="1" value="${S.age}" aria-label="Your age"></label></div><p class="note">The rings mark where each age sits between the skin and the edge of the field.</p></div>`;
  if (n.positions.length) {
    const kind = n.kind === 'part' ? 'Left and right' : 'Around the body';
    h += `<div class="blk"><div class="bh"><h3>${kind}</h3><span>${n.kind === 'part' ? '' : 'Choose a spot, or a label on the model'}</span></div>${compass(n)}</div>`;
  }
  if (n.sides.length) h += `<div class="blk" style="margin-top:14px">` + [...n.sides].sort((a, b) => SIDE_ORDER[a.key] - SIDE_ORDER[b.key]).map((s) => acc(s.title, blocks(s.blocks), false, null, 'side-' + s.key)).join('') + '</div>';
  const sec = Object.fromEntries(n.sections.map((s) => [s.key, s]));
  if (sec.balanced || sec.low) {
    const both = sec.balanced && sec.low; const which = both ? S.balance : sec.balanced ? 'balanced' : 'low';
    h += `<div class="blk"><div class="bh"><h3>How it shows up</h3></div>` + (both ? `<div class="seg" role="tablist"><button type="button" role="tab" data-bal="balanced" aria-selected="${which === 'balanced'}">In balance</button><button type="button" role="tab" data-bal="low" aria-selected="${which === 'low'}">Out of balance</button></div>` : `<p class="note" style="margin:0 0 8px">${esc(sec[which].title)}</p>`) + `<div class="txt" data-balbody>${blocks(sec[which].blocks)}</div></div>`;
  }
  const rest = n.sections.filter((s) => s.key !== 'balanced' && s.key !== 'low');
  if (rest.length) h += `<div class="blk">` + rest.map((s) => acc(s.title, blocks(s.blocks), OPEN_KEYS.has(s.key) || n.kind === 'field' || n.kind === 'sign', SMALL[s.key], s.key)).join('') + '</div>';
  if (n.signs && n.signs.length) h += `<div class="blk"><div class="bh"><h3>In the zodiac</h3></div><div class="chips" style="margin:0">` + n.signs.map((s) => `<button class="chip gl" type="button" data-go="${s}">${N.get(s).glyph} ${esc(N.get(s).name)}</button>`).join('') + '</div></div>';
  if (n.kind === 'sign') h += `<div class="blk"><div class="bh"><h3>Plays through</h3></div><div class="chips" style="margin:0">` + n.centers.map((c) => `<button class="chip" style="--zone:${colorOf(N.get(c), 1)}" type="button" data-go="${c}" data-view="chakra">${esc(N.get(c).name)}</button>`).join('') + `</div></div>`;
  return h + explore(n, null);
}
function renderPos(n, p) {
  let h = crumbs(n, posTitle(n, p));
  h += `<p class="eyebrow">${esc(n.name)}</p><h2 class="sm">${esc(posTitle(n, p))}</h2><p class="heading">${esc(p.short)}</p>`;
  h += `<div class="txt lede">${blocks(p.blocks)}</div>` + sideBoxes(n, p.key);
  const others = n.positions.filter((q) => q.key !== p.key);
  h += `<div class="blk"><div class="bh"><h3>Other spots at the ${esc(n.name.toLowerCase())}</h3></div><div class="chips" style="margin:0">` + others.map((q) => `<button class="chip" type="button" data-go="${n.id}|${q.key}">${esc(q.title)}</button>`).join('') + `<button class="chip gl" type="button" data-go="${n.id}">All of the ${esc(n.name.toLowerCase())}</button></div></div>`;
  return h + explore(n, p);
}
function targetWhere(t, tn, short) {
  if (t.label) return t.label;
  const p = t.pos; if (!p) return short ? '' : tn.name;
  const posName = tn.positions.find((q) => q.key === p); const w = posName ? posName.title : ({ LOW: 'out of balance', HEALTHY: 'in balance' }[p] || POS[p] || p);
  return short ? w : `${tn.name}: ${w.charAt(0).toLowerCase() + w.slice(1)}`;
}
function renderFeeling(f) {
  panel.style.setProperty('--zone', IVORY); document.documentElement.style.setProperty('--zone', IVORY);
  let h = `<div class="crumbs"><button class="crumb" type="button" data-setview="feelings">Feelings</button><span class="sep">/</span><span class="crumb" style="cursor:default;color:var(--ink)">${esc(f.name)}</span></div>`;
  h += `<p class="eyebrow">Feeling</p><h2 class="sm">${esc(f.name)}</h2><p class="lede soft">Where this may live in the body and the field. Choose a spot to read more.</p><div class="blk">`;
  f.targets.forEach((t) => { const tn = N.get(t.node); const hasPos = t.pos && tn.positions.some((p) => p.key === t.pos);
    h += `<button class="tgt" type="button" data-go="${t.node}${hasPos ? '|' + t.pos : ''}" data-view="chakra" style="--c:${colorOf(tn)}"><i></i><span><b>${esc(targetWhere(t, tn))}</b><span>${esc(t.t)}</span></span></button>`; });
  h += `</div><p class="note">${esc(C.info.home.points[3].t)}</p>`;
  return h + exploreFeeling(f);
}
function renderFeelings() {
  panel.style.setProperty('--zone', IVORY); document.documentElement.style.setProperty('--zone', IVORY);
  return `<p class="eyebrow">View</p><h2 class="sm">All feelings</h2><p class="lede soft">Start from what you feel, and see where it may live.</p><div class="blk cols">` +
    [...C.feelings].sort((a, b) => a.name.localeCompare(b.name)).map((f) => `<button class="res" type="button" data-feeling="${esc(f.name)}"><b style="font-size:13.5px;font-weight:500">${esc(f.name)}</b></button>`).join('') + '</div>';
}
const AZ_TYPES = [['all', 'All'], ['Chakra', 'Chakras'], ['Body part', 'Body parts'], ['Field', 'Field'], ['Zodiac', 'Zodiac'], ['Feeling', 'Feelings']];
function azItems() {
  const KIND = { center: 'Chakra', stop: 'Chakra', part: 'Body part', field: 'Field', sign: 'Zodiac' }; const TAG = { center: 'Chakra', stop: 'Part of the leg', part: 'Body part', field: 'Field', sign: 'Zodiac' };
  const lc = (x) => x.charAt(0).toLowerCase() + x.slice(1); const out = [];
  C.nodes.forEach((n) => { out.push({ t: n.name, tag: TAG[n.kind], type: KIND[n.kind], go: n.id, c: colorOf(n) });
    n.positions.forEach((p) => out.push({ t: n.kind === 'part' && !/^(Left|Right) side$/.test(p.title) ? p.title : `${n.name}, ${lc(posTitle(n, p))}`, tag: p.short, type: KIND[n.kind], go: n.id + '|' + p.key, c: colorOf(n) })); });
  C.feelings.forEach((f) => out.push({ t: f.name, tag: 'Feeling', type: 'Feeling', feeling: f.name, c: IVORY }));
  const key = (x) => x.t.replace(/^[^A-Za-z]+/, '').replace(/^The /, '').toLowerCase();
  return out.map((x) => ({ ...x, k: key(x) })).sort((a, b) => a.k.localeCompare(b.k));
}
function renderAtoZ() {
  panel.style.setProperty('--zone', IVORY); document.documentElement.style.setProperty('--zone', IVORY);
  const f = S.az || 'all'; const items = azItems().filter((x) => f === 'all' || x.type === f);
  let h = `<p class="eyebrow">Index</p><h2 class="sm">Biofield A to Z</h2><p class="lede soft">Everything on the map in one list: ${items.length} entries.</p><div class="chips">` + AZ_TYPES.map(([k, l]) => `<button class="quiet" type="button" data-az="${k}" aria-pressed="${f === k}">${l}</button>`).join('') + '</div><div class="blk az">';
  let letter = '';
  items.forEach((x) => { const L = x.k.charAt(0).toUpperCase(); if (L !== letter) { letter = L; h += `<div class="azl">${L}</div>`; }
    h += `<button class="res" type="button" ${x.feeling ? `data-feeling="${esc(x.feeling)}"` : `data-go="${x.go}" data-view="chakra"`} style="--c:${x.c}"><i></i><b>${esc(x.t)}</b><span>${esc(x.tag)}</span></button>`; });
  return h + '</div>';
}
function renderInfo(id) {
  panel.style.setProperty('--zone', IVORY); document.documentElement.style.setProperty('--zone', IVORY);
  const i = C.info[id]; let h = `<p class="eyebrow">${id === 'about' ? 'InnerVerse' : id === 'home' ? 'Interactive map' : 'View'}</p><h2>${esc(i.title)}</h2>`;
  if (i.lede) h += `<p class="lede">${esc(i.lede)}</p>`;
  const pts = i.points.length ? `<div class="blk"><div class="bh"><h3>${id === 'about' ? 'Credit and cautions' : 'How to read the map'}</h3></div><div class="txt"><ul>${i.points.map((p) => `<li>${esc(p.t)}</li>`).join('')}</ul></div></div>` : '';
  if (id !== 'home') h += pts;
  const startRow = (title, ids) => `<div class="blk"><div class="bh"><h3>${title}</h3></div><div class="chips" style="margin:0">` + ids.filter((x) => N.has(x)).map((x) => `<button class="chip" style="--zone:${colorOf(N.get(x), 1)}" type="button" data-go="${x}" data-view="${S.view}">${esc(N.get(x).name)}</button>`).join('') + '</div></div>';
  if (id === 'field' && !isPhone()) h += startRow('Start with', ['f-edge', 'f-timeline', 'f-channel', 'f-sides', 'f-rivers', 'f-parents']);
  if (id === 'organs') h += startRow('Start with', ['liver', 'heartorgan', 'lungs', 'kidneys', 'adrenals', 'brain', 'spine', 'vagus', 'skin']);
  if (id === 'zodiac') h += zodiacLegend();
  if (id === 'about') h += `<div class="blk"><div class="bh"><h3>Explore the map</h3></div><div class="chips" style="margin:0">` + [['chakra', 'Energy centers'], ['feelings', 'Feelings'], ['field', 'The field'], ['organs', 'Body parts'], ['zodiac', 'The zodiac body']].map(([v, l]) => `<button class="chip gl" type="button" data-setview="${v}">${l}</button>`).join('') + `<button class="chip gl" type="button" data-special="atoz">Biofield A to Z</button></div></div>`;
  if (id === 'field' && isPhone()) { let g = ''; FIELD.forEach((f) => { if (f.group !== g) { h += (g ? '</div></div>' : '') + `<div class="blk"><div class="bh"><h3>${esc(f.group)}</h3></div><div class="chips" style="margin:0">`; g = f.group; } h += `<button class="chip gl" type="button" data-go="${f.id}">${esc(f.name)}</button>`; }); h += '</div></div>'; }
  if (id === 'home' && RESUME && resumeTitle()) h += `<div class="blk"><div class="bh"><h3>Pick up where you left off</h3></div><div class="chips" style="margin:0"><a class="chip gl ln-chip" href="#${esc(RESUME)}">${esc(resumeTitle())}</a></div></div>`;
  if (id === 'home') h += `<div class="blk"><div class="bh"><h3>Start here</h3></div><div class="chips" style="margin:0">` + CENTERS.map((c) => `<button class="chip" style="--zone:${colorOf(N.get(c), 1)}" type="button" data-go="${c}">${esc(N.get(c).name)}</button>`).join('') + `</div></div><div class="blk"><div class="bh"><h3>Or start from a feeling</h3></div><div class="chips" style="margin:0">` + ['Anxiety', 'Grief and loss', 'Anger', 'Overwhelm', 'Feeling stuck', 'Burnout and exhaustion'].map((f) => `<button class="chip gl" type="button" data-feeling="${f}">${f}</button>`).join('') + `<button class="chip gl" type="button" id="c-feel">All feelings</button></div></div><div class="blk"><div class="bh"><h3>Or explore the field</h3></div><div class="chips" style="margin:0"><button class="chip gl" type="button" data-go="f-timeline">Find an age in your field</button><button class="chip gl" type="button" data-setview="field">The field around the body</button></div></div>` + pts + `<div class="blk"><div class="chips" style="margin:0"><button class="chip gl" type="button" data-special="atoz">Biofield A to Z</button><button class="chip gl" type="button" data-special="about">About this map</button></div></div>`;
  return h;
}
function renderPanel() {
  const n = S.id && N.get(S.id);
  LCTX = { self: S.feeling ? 'f:' + S.feeling : S.id, seen: new Set() };
  detail.innerHTML = S.feeling ? renderFeeling(C.feelings.find((f) => f.name === S.feeling)) : S.special === 'atoz' ? renderAtoZ() : S.special === 'about' ? renderInfo('about') : n ? renderNode(n)
    : S.view === 'feelings' ? renderFeelings() : renderInfo(S.view === 'chakra' ? 'home' : S.view);
  const u = upTarget(); back.classList.toggle('show', !!u); if (u) back.querySelector('span').textContent = u.label;
}
detail.addEventListener('click', (e) => {
  const a = e.target.closest('.acc>button'); if (a) { const d = a.parentElement; const o = d.dataset.open !== '1'; d.dataset.open = o ? 1 : 0; a.setAttribute('aria-expanded', String(o)); if (d.dataset.k) ACC_OPEN.set(d.dataset.k, o); return; }
  const cp = e.target.closest('[data-copy]'); if (cp) { copyLink(cp); return; }
  const m = e.target.closest('[data-more]'); if (m) { m.parentElement.querySelectorAll('[hidden]').forEach((x) => x.removeAttribute('hidden')); m.remove(); return; }
  const b = e.target.closest('[data-bal]'); if (b) { S.balance = b.dataset.bal; const n = N.get(S.id); const s = n.sections.find((q) => q.key === S.balance); LCTX = { self: S.id, seen: new Set() }; detail.querySelector('[data-balbody]').innerHTML = blocks(s.blocks); detail.querySelectorAll('[data-bal]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); return; }
  const az = e.target.closest('[data-az]'); if (az) { S.az = az.dataset.az; const top = detail.scrollTop; renderPanel(); detail.scrollTop = Math.min(top, 0); return; }
  const sp = e.target.closest('[data-special]'); if (sp) { go({ special: sp.dataset.special }); return; }
  if (e.target.closest('#c-feel')) go({ special: 'feelings' });
});
detail.addEventListener('input', (e) => { if (!e.target.matches('.age input')) return; const v = Math.round(Number(e.target.value)); if (!(v >= 6 && v <= 100)) return;
  S.age = v; store.set('age', String(v)); detail.querySelectorAll('.age input').forEach((i) => { if (i !== e.target) i.value = v; }); scene.setField({ on: true, focus: 'timeline', age: S.age }); setLabels(fieldLabels(N.get(S.id)), 'stacked'); });

function render() { renderList(); renderPanel(); placeChrome(); applyScene(); }

// ---------- pointing at the body, and the view controls under it ----------
const tip = $('#tip'), stageEl = $('#stage');
function hover(h) {
  const cv = stageEl.querySelector('canvas'); if (cv) cv.style.cursor = h ? 'pointer' : 'grab';
  if (!h) { tip.style.display = 'none'; stageEl.classList.remove('hot'); return; }
  let n = N.get(ZONE_NODE[h.zone]); if (!n) return;
  if (n.id === 'legs' && h.point) { const cur = S.id && N.get(S.id); if (cur && (cur.id === 'legs' || cur.parent === 'legs')) { const y = h.point[1]; n = N.get(y < 0.095 ? 'feet' : y < 0.39 ? 'ankles' : y < 0.57 ? 'knees' : 'thighs') || n; } }
  tip.style.setProperty('--c', colorOf(n)); tip.querySelector('b').textContent = n.name; tip.querySelector('span').textContent = n.heading || '';
  tip.style.display = 'flex'; const w = tip.offsetWidth; tip.style.transform = `translate3d(${Math.round(Math.min(innerWidth - w - 8, h.x + 16))}px,${Math.round(Math.max(8, h.y - 44))}px,0)`;
  stageEl.classList.add('hot');
}
const FACE = { front: ['Front view', 'their right is on your left'], back: ['Back view', 'their left is on your left'], left: ['Their left side', ''], right: ['Their right side', ''] };
let faceNow = '';
function showFacing() { if (!scene.facing) return; const f = scene.facing(); if (f === faceNow) return; faceNow = f; const b = $('#c-face'); b.querySelector('b').textContent = isPhone() ? FACE[f][0].replace(' view', '') : FACE[f][0]; b.querySelector('small').textContent = FACE[f][1]; }
$('#c-face').addEventListener('click', () => { scene.turnTo && scene.turnTo(faceNow === 'front' ? 180 : 0); });
$('#c-reset').addEventListener('click', () => { scene.resetView && scene.resetView(); });
$('#c-in').addEventListener('click', () => { scene.zoomBy && scene.zoomBy(0.78); });
$('#c-out').addEventListener('click', () => { scene.zoomBy && scene.zoomBy(1.28); });
['pointerdown', 'wheel'].forEach((ev) => stageEl.addEventListener(ev, () => document.body.classList.add('touched'), { passive: true }));
setTimeout(() => document.body.classList.add('touched'), 14000);

// ---------- phone sheet ----------
const SHEETS = { peek: () => 132, half: () => Math.round(innerHeight * 0.42), full: () => Math.round(innerHeight * 0.86) };
function setSheet(s, noRefit) { sheet = s; document.body.classList.toggle('sheet-full', s === 'full'); panel.style.setProperty('--sheet', SHEETS[s]() + 'px'); placeChrome(); if (!noRefit) setTimeout(() => { scene.refit(false); labDirty = true; }, 340); }
function placeChrome() {
  const ctl = $('#ctl');
  if (!isPhone()) { strip.style.bottom = ''; back.style.bottom = ''; ctl.style.bottom = ''; return; }
  const h = SHEETS[sheet](); strip.style.bottom = h + 'px'; back.style.bottom = (h + strip.offsetHeight + 6) + 'px'; back.style.top = 'auto'; ctl.style.bottom = (h + strip.offsetHeight + 6) + 'px';
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
C.feelings.forEach((f) => INDEX.push({ type: 'feeling', id: f.name, title: f.name, sub: 'Feeling', keys: [f.name, ...f.also].map((k) => k.toLowerCase()), color: IVORY, rank: 2 }));
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
  const recent = () => { try { return JSON.parse(store.get('recent') || '[]').filter((r) => (r.type === 'feeling' ? C.feelings.some((f) => f.name === r.id) : N.has(r.id))); } catch (e) { return []; } };
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  const nearest = (v) => { v = v.trim().toLowerCase(); const lim = v.length <= 4 ? 1 : v.length <= 8 ? 2 : 3;
    return INDEX.map((e) => ({ e, d: Math.min(99, ...e.keys.flatMap((k) => [k, ...k.split(/[\s,/-]+/)]).filter((w) => Math.abs(w.length - v.length) <= lim).map((w) => lev(v, w))) })).filter((x) => x.d <= lim).sort((a, b) => a.d - b.d || b.e.rank - a.e.rank).slice(0, 4).map((x) => x.e); };
  const choose = (r) => { if (r.type === 'atoz') { close(); q.value = ''; q.blur(); go({ special: 'atoz' }); return; }
    store.set('recent', JSON.stringify([{ type: r.type === 'feeling' ? 'feeling' : 'node', id: r.id, pos: r.pos || null, title: r.title, sub: r.type === 'text' ? '' : r.sub, color: r.color }, ...recent().filter((x) => !(x.id === r.id && (x.pos || null) === (r.pos || null)))].slice(0, 5)));
    close(); q.value = ''; q.blur(); if (r.type === 'feeling') go({ feeling: r.id }); else go({ id: r.id, pos: r.pos || null, view: N.get(r.id).kind === 'part' ? 'chakra' : undefined }); };
  const draw = () => {
    const r = search(q.value); let i = 0;
    const sug = (e) => `<button class="res sug" type="button" role="option" data-i="${i++}" style="--c:${e.color || IVORY}"><i></i><b>${esc(e.title)}</b><span>${esc(e.sub || '')}</span></button>`;
    if (!r) {   // nothing typed yet: recent searches and a few feelings to start from
      if (document.activeElement !== q) { box.classList.remove('open'); return; }
      const rec = recent(); const pop = ['Anxiety', 'Grief and loss', 'Anger', 'Overwhelm', 'Feeling stuck', 'Burnout and exhaustion'].filter((f) => C.feelings.some((x) => x.name === f)).map((f) => ({ type: 'feeling', id: f, title: f, sub: 'Feeling', color: IVORY }));
      flat = [...rec, ...pop]; box.innerHTML = (rec.length ? '<div class="rg">Recent</div>' + rec.map(sug).join('') : '') + '<div class="rg">Try a feeling</div>' + pop.map(sug).join(''); box.classList.add('open'); cur = -1; return; }
    flat = [...r.nodes, ...r.feels, ...r.ment];
    if (!flat.length) { const near = nearest(q.value); flat = [...near, { type: 'atoz', title: 'Biofield A to Z', sub: 'Browse everything on the map' }];
      box.innerHTML = '<div class="nores">Nothing on the map matches that yet. Try a body part, an organ or a feeling.</div>' + (near.length ? '<div class="rg">Closest on the map</div>' : '') + flat.map(sug).join(''); box.classList.add('open'); cur = -1; return; }
    const toks = q.value.trim().toLowerCase().split(/\s+/).filter((t) => t.length > 1 && !['amp', 'lt', 'gt', 'quot'].includes(t)).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); const re = toks.length ? new RegExp('(' + toks.join('|') + ')', 'ig') : null; const hi = (t) => (re ? esc(t).replace(re, '<mark>$1</mark>') : esc(t));
    const row = (e) => `<button class="res" type="button" role="option" data-i="${i++}" style="--c:${e.color}"><i></i><b>${hi(e.title)}</b><span>${hi(e.sub || '')}</span></button>`;
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
// keys: / search, up and down for previous and next, left and right to turn the body, Escape to go back, ? for this list
addEventListener('keydown', (e) => {
  const el = document.activeElement; if ((el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); if (isPhone()) document.body.classList.add('searching'); $('#q').focus(); }
  else if (e.key === '?') toggleKeys();
  else if (e.key === 'Escape') { if (!$('#keys').hidden) { toggleKeys(false); return; } if (menu && !menu.hidden) { hideMenu(); return; } const u = upTarget(); if (u) go(u.to); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (scene.turnBy) scene.turnBy(e.key === 'ArrowLeft' ? -30 : 30); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { if (el && el.closest && el.closest('#detail,#results')) return; const q = seqOf(); const t = q && (e.key === 'ArrowUp' ? q.prev : q.next);
    if (t) { e.preventDefault(); go(t.to); } else if (!S.id && !S.feeling && !S.special && S.view === 'chakra') { e.preventDefault(); go({ id: e.key === 'ArrowDown' ? 'crown' : 'legs' }); } }
});
$('#keys').addEventListener('click', () => toggleKeys(false));

$('#cta').textContent = C.cta.label; $('#cta').href = C.cta.url;
renderList(); renderPanel(); placeChrome();
window.__bfa = { go, S, N, C, scene, MODEL, search, labs: () => LABS, OUT, INB, FEEL_AT, TERMS, seqOf };
