import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = '../work/shots';
async function open(w, h, hash = '', reduced = 'reduce') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced, hasTouch: w < 500 });
  const page = await ctx.newPage(); page.errs = [];
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push(m.text()); }); page.on('pageerror', (e) => page.errs.push(String(e)));
  await page.goto('http://127.0.0.1:8765/index.html' + hash, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__bfaReady === true, null, { timeout: 60000 }); await page.waitForTimeout(800);
  return page;
}
const sel = (p) => p.evaluate(() => document.querySelector('.zone[aria-pressed="true"] .zc')?.textContent || 'none');
// 1 deep link
let p = await open(1440, 900, '#solar'); console.log('deep link #solar ->', await sel(p), '| h2:', await p.textContent('#detail h2'));
// 2 tap the body: every zone by clicking the skin at its height (front view, whole body)
await p.context().close(); p = await open(1440, 900);
const pts = await p.evaluate(() => {
  const { ZONES } = window.__bfa; const cam = window.__bfa.renderer; return null; });
const results = [];
for (const [name, y, x] of [['Feet', 0.3, 0.155], ['Root', 0.84, 0.03], ['Sacral', 0.965, 0.03], ['Solar Plexus', 1.10, 0.03], ['Heart', 1.27, 0.03], ['Throat', 1.42, 0.02], ['Third Eye', 1.56, 0.02], ['Crown', 1.64, 0.0]]) {
  await p.evaluate(() => window.__bfa.select(-1, true)); await p.waitForTimeout(250);
  const xy = await p.evaluate(([xx, yy]) => window.__bfaProject(xx, yy, 0.05), [x, y]);
  await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(250);
  results.push(`${name}:${(await sel(p)) === name.toUpperCase() || (await sel(p)) === name ? 'ok' : 'GOT ' + await sel(p)}`);
}
console.log('tap to select ->', results.join('  '));
// 3 every zone button + organ chips
await p.context().close(); p = await open(1440, 900); const zr = [];
for (let i = 0; i < 8; i++) {
  await p.click(`.zone[data-i="${i}"]`); await p.waitForTimeout(700);
  const st = await p.evaluate((i) => { const vis = [...window.__bfa.organs].filter(([k, o]) => o.mesh.visible && !o.axis).map(([k]) => k); const want = window.__bfa.ZONES[i].organs.map((o) => o.id); return { vis: vis.length, want: want.length, match: want.every((w) => vis.includes(w)) && vis.every((v) => want.includes(v)), chips: document.querySelectorAll('.chip').length }; }, i);
  zr.push(`${i}:${st.match && st.chips === st.want ? 'ok' : 'MISMATCH'}(${st.vis})`);
}
console.log('zone buttons show the right organs ->', zr.join(' '));
await p.click('.zone[data-i="3"]'); await p.click('.chip:has-text("Left kidney")'); await p.waitForTimeout(1500); await p.screenshot({ path: out + '/d_kidney.png' });
console.log('errors desktop:', p.errs.length ? p.errs : 'none');
// 4 phone: tap a chip, feet, crown
await p.context().close(); p = await open(390, 844); await p.tap('.zone[data-i="0"]'); await p.waitForTimeout(1200); await p.screenshot({ path: out + '/m_feet.png' });
await p.tap('.zone[data-i="7"]'); await p.waitForTimeout(1200); await p.screenshot({ path: out + '/m_crown.png' });
await p.tap('.zone[data-i="3"]'); await p.waitForTimeout(1200); await p.screenshot({ path: out + '/m_solar.png' });
const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); console.log('phone sideways overflow:', ov.sw > ov.iw ? 'YES' : 'none', '| errors phone:', p.errs.length ? p.errs : 'none');
// 5 frame pacing with motion on (software renderer, so only a floor)
await p.context().close(); p = await open(1440, 900, '', 'no-preference'); await p.click('.zone[data-i="4"]');
const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(Math.round(n / 4)); })(); }));
await p.context().close(); p = await open(390, 844, '', 'no-preference'); await p.tap('.zone[data-i="4"]');
const fpsM = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(Math.round(n / 4)); })(); }));
console.log('frames per second, software rendering: desktop', fps, 'phone size', fpsM);
await browser.close();
