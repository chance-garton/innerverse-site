// Biofield Anatomy 3D: the small version for the /biofield-tuning page (Chance, 2026-11-14). The turning figure with its seven lights;
// choosing a center, on the figure or by its name, shows the center's name and one line, and one button opens the full map.
// The page shows a still image first and loads this file only when the visitor reaches the section. All wording comes from window.__BFA_MINI.
import MODEL from './model.json';
import { createScene } from './scene.js';

const ZONE_NODE = ['legs', 'root', 'sacral', 'solar', 'heart', 'throat', 'thirdeye', 'crown'];
const FRAME = { y: 0.875, w: 0.78, h: 1.86, tilt: 2 };

export function mount(root) {
  const cfg = window.__BFA_MINI; if (!cfg || root.dataset.bfaMounted) return; root.dataset.bfaMounted = '1';
  const by = new Map(cfg.centers.map((c) => [c.id, c])); const stage = root.querySelector('.bm-canvas'), card = root.querySelector('.bm-card'), open = root.querySelector('.bm-open');
  const full = open.getAttribute('href').replace(/#.*$/, ''); let cur = null, scene = null;
  const look = () => { if (!scene) return; const c = cur && by.get(cur);
    if (c) scene.setLook({ mode: 'chakra', isolate: true, selected: true, regions: c.regions, organs: {}, open: 0.12, orbs: 1, orbSel: ZONE_NODE.indexOf(c.id), aura: 0.42 });
    else scene.setLook({ mode: 'chakra', orbs: 1, aura: 0.5 }); };
  const select = (id, toggle) => { cur = toggle && cur === id ? null : id; const c = cur && by.get(cur);
    root.querySelectorAll('[data-center]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.center === cur)));
    card.hidden = !c; if (c) { card.style.setProperty('--c', MODEL.zones[ZONE_NODE.indexOf(c.id)].accent || MODEL.zones[ZONE_NODE.indexOf(c.id)].color); card.querySelector('b').textContent = c.name; card.querySelector('span').textContent = c.line; }
    open.setAttribute('href', full + (c ? '#' + c.id : '')); look(); };
  root.querySelectorAll('[data-center]').forEach((b) => b.addEventListener('click', () => select(b.dataset.center, true)));
  try {
    scene = createScene(stage, MODEL, {
      onReady: () => { scene.flyTo(FRAME, { az: 0, instant: true }); look(); root.classList.add('bm-live'); window.__bfaMiniReady = true; },
      onError: () => root.classList.add('bm-nogl'),
      onPick: (p) => { const id = p.type === 'orb' ? ZONE_NODE[p.index] : p.type === 'skin' ? (p.arm > 0.3 ? 'heart' : ZONE_NODE[p.zone]) : null; if (id) select(id === 'legs' ? 'root' : id, false); },
      hoverable: () => true,
      onHover: (h) => { const cv = stage.querySelector('canvas'); if (cv) cv.style.cursor = h ? 'pointer' : 'grab'; },
    }, { embed: true, turn: 0.2 });
  } catch (e) { root.classList.add('bm-nogl'); return; }   // no WebGL: the still image and the words stay, and every button still works
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => scene.setPaused(!en[0].isIntersecting)).observe(root);   // nothing is drawn while the section is off screen
  window.__bfaMini = { scene, select, state: () => cur };
}
const el = document.getElementById('bfa-mini'); if (el) mount(el);
