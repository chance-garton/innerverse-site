// Interaction and content checks for the Biofield Anatomy viewer. Run with the preview served on 127.0.0.1:8765.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0; const ok = (name, cond, extra = '') => { if (!cond) fails++; console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
async function open(w, h, hash = '') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', hasTouch: w < 500 });
  const page = await ctx.newPage(); page.errs = [];
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push(m.text()); }); page.on('pageerror', (e) => page.errs.push(String(e)));
  await page.goto('http://127.0.0.1:8765/index.html' + hash, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__bfaReady === true, null, { timeout: 90000 }); await page.waitForTimeout(500);
  return page;
}
const h2 = (p) => p.evaluate(() => document.querySelector('#detail h2')?.textContent || '');
// ---- 1. every node, every position, every feeling renders, and every line of its wording is on screen
let p = await open(1440, 900);
const res = await p.evaluate(async () => {
  const { C, go, N } = window.__bfa; const norm = (s) => s.replace(/\s+/g, ' ').trim(); const miss = []; let shown = 0;
  const open = () => document.querySelectorAll('#detail .acc').forEach((a) => { a.dataset.open = 1; });
  const text = () => norm(document.querySelector('#detail').innerText.replace(/ /g, ' '));
  for (const n of C.nodes) {
    go({ id: n.id }); open(); document.querySelector('[data-more]')?.click(); let t = text();
    const need = [n.summary.t, ...n.themes.map((x) => x.t), ...n.sides.flatMap((s) => s.blocks.map((b) => b.t)), ...n.sections.filter((s) => s.key !== 'low').flatMap((s) => s.blocks.map((b) => b.t))];
    if (n.governs) need.push(n.governs.t.slice(1));
    for (const x of need) { if (t.toLowerCase().includes(norm(x).toLowerCase())) shown++; else miss.push(n.id + ': ' + x.slice(0, 60)); }
    const low = n.sections.find((s) => s.key === 'low'); if (low) { const b = document.querySelector('[data-bal="low"]'); if (b) b.click(); t = text(); for (const x of low.blocks) { if (t.includes(norm(x.t))) shown++; else miss.push(n.id + ' low: ' + x.t.slice(0, 60)); } }
    for (const pos of n.positions) { go({ id: n.id, pos: pos.key }); t = text(); for (const b of pos.blocks) { if (t.includes(norm(b.t))) shown++; else miss.push(n.id + '/' + pos.key + ': ' + b.t.slice(0, 60)); }
      if (!document.querySelector('#labels .lab.on')) miss.push(n.id + '/' + pos.key + ': no highlighted label on the model'); }
  }
  for (const f of C.feelings) { go({ feeling: f.name }); const t = text(); for (const x of f.targets) { if (t.includes(norm(x.t))) shown++; else miss.push('feeling ' + f.name + ': ' + x.t.slice(0, 60)); }
    if (document.querySelectorAll('#detail .tgt').length !== f.targets.length) miss.push('feeling ' + f.name + ': target count'); }
  go({ special: 'feelings' }); const fl = document.querySelectorAll('#detail [data-feeling]').length;
  go({ special: 'about' }); const about = text();
  go({ view: 'chakra' });
  return { shown, miss, fl, feelings: C.feelings.length, about, dash: /[–—]/.test(JSON.stringify(C)) };
});
ok('every line of wording is on screen in its node', res.miss.length === 0, `${res.shown} lines checked` + (res.miss.length ? '\n     ' + res.miss.slice(0, 12).join('\n     ') : ''));
ok('feelings index lists every feeling', res.fl === res.feelings, `${res.fl}`);
ok('about panel credits Eileen Day McKusick and carries the caution line', /Eileen Day McKusick/.test(res.about) && /contraindicated/.test(res.about));
ok('no em or en dashes in the content', !res.dash);
// ---- 2. the model lights the right things
const lit = await p.evaluate(async () => {
  const { C, go, scene } = window.__bfa; const out = []; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const n of C.nodes.filter((x) => x.kind !== 'field')) {
    go({ id: n.id }); await wait(60);
    const want = Object.entries(n.light.organs || {}).filter(([, w]) => w >= 1).map(([k]) => k).sort().join(); const got = [...scene.organs].filter(([, o]) => o.tAct === 1).map(([k]) => k).sort().join();
    if (want !== got) out.push(`${n.id}: lit ${got} want ${want}`);
    for (const k of Object.keys(n.light.organs || {})) if (!scene.organs.has(k)) out.push(`${n.id}: no mesh ${k}`);
  }
  const used = new Set(C.nodes.flatMap((n) => Object.keys((n.light || {}).organs || {}))); for (const k of scene.organs.keys()) if (!used.has(k)) out.push('mesh never lit by any node: ' + k);
  go({ view: 'organs' }); await wait(60); const all = [...scene.organs].every(([, o]) => o.tOp === 1);
  go({ view: 'chakra' }); await wait(60); const none = [...scene.organs].every(([, o]) => o.tOp === 0);
  return { out, all, none };
});
ok('each center, part and sign lights exactly its own meshes', lit.out.length === 0, lit.out.slice(0, 8).join(' | '));
ok('organs view shows every mesh; chakra home shows none', lit.all && lit.none);
// ---- 3. clicking around: list, tabs, labels, back, breadcrumb, search, deep links
await p.click('#list .it:has-text("Heart")'); await p.waitForTimeout(300); ok('list opens a center', (await h2(p)) === 'Heart');
ok('center shows its four spots on the model', (await p.locator('#labels .lab').count()) === 4);
await p.click('#labels .lab:has-text("Left front")'); await p.waitForTimeout(300); ok('a label on the model opens that spot', (await h2(p)) === 'Left front imbalance' && /heart-pos-lf/.test(p.url()));
await p.click('#back'); await p.waitForTimeout(200); ok('back goes up one level', (await h2(p)) === 'Heart');
await p.click('#detail .chip:has-text("Lungs")'); await p.waitForTimeout(300); ok('part chip opens the part', (await h2(p)) === 'Lungs');
await p.click('.crumb:has-text("Heart")'); await p.waitForTimeout(200); ok('breadcrumb goes back to the center', (await h2(p)) === 'Heart');
await p.click('#detail .pos:has-text("Right back")'); await p.waitForTimeout(200); ok('compass card opens a spot', (await h2(p)) === 'Right back imbalance');
{ const z = await p.evaluate(() => { const pin = getComputedStyle(document.querySelector('#labels .pin')).zIndex, lab = getComputedStyle(document.querySelector('#labels .lab')).zIndex; return Number(pin) < Number(lab); }); ok('dots sit behind labels', z); }
await p.click('#b-atoz'); await p.waitForTimeout(300);
{ const az = await p.evaluate(() => { const { C } = window.__bfa; const want = C.nodes.length + C.nodes.reduce((a, n) => a + n.positions.length, 0) + C.feelings.length; return { want, got: document.querySelectorAll('#detail .az .res').length, title: document.querySelector('#detail h2').textContent }; });
  ok('Biofield A to Z lists every selectable thing', az.title === 'Biofield A to Z' && az.got === az.want, `${az.got} of ${az.want}`); }
await p.click('#detail .az .res:has-text("Sun Star")'); await p.waitForTimeout(300); ok('A to Z entry opens its screen', (await h2(p)) === 'Sun Star');
{ const t = await p.evaluate(() => JSON.stringify(window.__bfa.C).toLowerCase() + document.body.innerText.toLowerCase()); ok('wording changes applied', !t.includes('conceptual map') && !t.includes('four stops') && !t.includes('feelings a to z') && !t.includes('book a biofield tuning session') && t.includes('book a tuning with chance')); }
await p.click('.tab[data-view="zodiac"]'); await p.waitForTimeout(300); ok('zodiac tab', (await h2(p)) === 'The zodiac body' && (await p.locator('#labels .lab').count()) === 12);
await p.click('#labels .lab:has-text("Leo")'); await p.waitForTimeout(300); ok('sign label opens the sign', (await h2(p)) === 'Leo');
await p.click('#detail .chip:has-text("Heart")'); await p.waitForTimeout(300); ok('sign links back to its center in the chakra view', (await h2(p)) === 'Heart' && (await p.getAttribute('.tab[data-view="chakra"]', 'aria-selected')) === 'true');
await p.click('.tab[data-view="field"]'); await p.waitForTimeout(300); ok('field tab', (await h2(p)) === 'The field' && (await p.locator('#labels .lab').count()) >= 10);
await p.click('#list .it:has-text("The timeline")'); await p.waitForTimeout(300); await p.fill('.age input', '60'); await p.waitForTimeout(200);
ok('timeline age slider relabels the rings', (await p.locator('#labels .lab.tick:has-text("Now, age 60")').count()) === 1 && (await p.locator('#labels .lab.tick:has-text("Birth")').count()) === 1);
await p.click('.tab[data-view="organs"]'); await p.waitForTimeout(300); await p.click('#list .it:has-text("Liver")'); await p.waitForTimeout(300);
ok('organs view opens a part and stays in the organs view', (await h2(p)) === 'Liver' && (await p.getAttribute('.tab[data-view="organs"]', 'aria-selected')) === 'true');
for (const [q, want] of [['liver', 'Liver'], ['anxiety', 'Anxiety'], ['grief', 'Grief and loss'], ['knee', 'Knees'], ['leo', 'Leo'], ['sun star', 'Sun Star'], ['thyroid', 'Thyroid'], ['boundaries', 'Weak boundaries'], ['sciatica', 'Sciatic nerve'], ['mom', 'Mother issues'], ['lower back', 'Lower back and sacrum']]) {
  await p.fill('#q', q); await p.waitForTimeout(120); const first = await p.evaluate(() => [...document.querySelectorAll('#results .res b')].map((b) => b.textContent));
  ok(`search "${q}" finds ${want}`, first.slice(0, 4).includes(want), first.slice(0, 4).join(' / '));
}
await p.fill('#q', 'liver'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); ok('search Enter opens the first result', (await h2(p)) === 'Liver');
const deep = await p.evaluate(() => window.__bfa.C.nodes.find((n) => n.id === 'f-parents').summary.t.split(' ').slice(-9, -7).join(' '));   // two words from inside a paragraph, read at run time
await p.fill('#q', deep); await p.waitForTimeout(150); ok('search reads the full text too', (await p.locator('#results .res').count()) >= 1);
for (const term of ['immune', 'thymus', 'esophagus', 'pelvic floor', 'hypothalamus', 'rectum']) { await p.fill('#q', term); await p.waitForTimeout(100); const n = await p.locator('#results .res').count(); ok(`cut item "${term}" is nowhere on the map`, n === 0, String(n)); }
const phrases = await p.evaluate(() => { const t = JSON.stringify(window.__bfa.C).toLowerCase(); return ['worry wheel', 'regret wheel', 'busy body', 'busy mind wheel', 'throat filter', 'immun', 'infection', 'lymph', 'tonsil', 'chinese medicine', 'greener pasture', 'lam', 'vam', 'solfeggio', '963'].filter((x) => new RegExp('\\b' + x).test(t)); });
ok('no cut phrase appears anywhere in the content', phrases.length === 0, phrases.join(', '));
await p.fill('#q', ''); await p.keyboard.press('Escape');
ok('no console errors on desktop', p.errs.length === 0, p.errs.slice(0, 3).join(' | '));
await p.context().close();
p = await open(1440, 900, '#solar-pos-rb'); ok('deep link to a spot', (await h2(p)) === 'Right back imbalance' && (await p.textContent('#detail .eyebrow')) === 'Solar Plexus');
await p.context().close(); p = await open(1440, 900, '#feeling-anger'); ok('deep link to a feeling', (await h2(p)) === 'Anger'); await p.context().close();
// ---- 4. tapping the body
p = await open(1440, 900);
for (const [name, y] of [['Root', 0.86], ['Sacral', 0.965], ['Solar Plexus', 1.10], ['Heart', 1.25], ['Throat', 1.42], ['Third Eye', 1.585], ['Crown', 1.70], ['Legs', 0.47]]) {
  await p.evaluate(() => window.__bfa.go({ view: 'chakra' })); await p.waitForTimeout(150);
  const z = { Root: 0.115, Sacral: 0.125, 'Solar Plexus': 0.13, Heart: 0.135, Throat: 0.10, 'Third Eye': 0.145, Crown: 0.03, Legs: 0.075 }[name];
  const xy = await p.evaluate(([yy, zz]) => { const q = window.__bfa.scene.project([0, yy, zz]); return [q.x, q.y]; }, [y, z]);
  await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(200); ok(`tapping the ${name} orb opens it`, (await h2(p)) === name, await h2(p));
}
await p.evaluate(() => window.__bfa.go({ view: 'chakra' })); await p.waitForTimeout(150);
let xy = await p.evaluate(() => { const q = window.__bfa.scene.project([0.07, 1.22, 0.11]); return [q.x, q.y]; }); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(250); ok('tapping the chest opens the heart', (await h2(p)) === 'Heart');
xy = await p.evaluate(() => { const q = window.__bfa.scene.project([-0.06, 1.25, 0.05]); return [q.x, q.y]; }); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(300); ok('tapping an organ inside an open center opens that part', (await h2(p)) === 'Lungs', await h2(p));
ok('no console errors after tapping', p.errs.length === 0, p.errs.slice(0, 3).join(' | '));
await p.context().close();
// ---- 5. phone
p = await open(390, 844);
ok('phone: no chip strip in the chakra view (the labels on the body do that job)', (await p.locator('#strip .sc').count()) === 0);
await p.tap('#labels .lab:has-text("Heart")'); await p.waitForTimeout(400); ok('phone: a label on the body opens a center', (await h2(p)) === 'Heart');
const tabsFit = await p.evaluate(() => { const t = document.querySelector('#tabs'); return t.scrollWidth <= t.clientWidth + 1 && [...t.children].every((b) => b.scrollWidth <= b.clientWidth + 1); }); ok('phone: all four view tabs fit', tabsFit);
let ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); ok('phone: no sideways scroll', ov.sw <= ov.iw, JSON.stringify(ov));
await p.tap('#grab'); await p.waitForTimeout(500); let sh = await p.evaluate(() => document.querySelector('#panel').getBoundingClientRect().height); ok('phone: tapping the handle grows the sheet', sh > 844 * 0.8, String(Math.round(sh)));
await p.tap('#grab'); await p.waitForTimeout(500); sh = await p.evaluate(() => document.querySelector('#panel').getBoundingClientRect().height); ok('phone: tapping again brings it back', sh < 844 * 0.5, String(Math.round(sh)));
await p.tap('.tab[data-view="organs"]'); await p.waitForTimeout(300); ok('phone: the body parts view keeps its chip strip', (await p.locator('#strip .sc').count()) > 40);
await p.tap('#matoz'); await p.waitForTimeout(300); ok('phone: A to Z button opens the index', (await h2(p)) === 'Biofield A to Z');
await p.tap('#msearch'); await p.fill('#q', 'kidney'); await p.waitForTimeout(200); await p.tap('#results .res'); await p.waitForTimeout(400); ok('phone: search opens a part', (await h2(p)) === 'Kidneys');
const off = await p.evaluate(() => [...document.querySelectorAll('#labels .lab')].filter((l) => l.style.display !== 'none').map((l) => l.getBoundingClientRect()).filter((r) => r.left < -1 || r.right > innerWidth + 1).length); ok('phone: labels stay on screen', off === 0, String(off));
ok('no console errors on phone', p.errs.length === 0, p.errs.slice(0, 3).join(' | '));
await p.context().close();
// ---- 5b. the left rail fits at every desktop width: tabs, search hint, bottom buttons
for (const w of [1000, 1024, 1100, 1280, 1320, 1366, 1440, 1680, 1920]) {
  p = await open(w, 800);
  const fit = await p.evaluate(() => { const bad = []; const over = (el) => el.scrollWidth > el.clientWidth + 1;
    const tabs = document.querySelector('#tabs'); if (over(tabs)) bad.push('tabs row'); [...tabs.children].forEach((b) => { if (over(b)) bad.push('tab ' + b.textContent); const r = b.getBoundingClientRect(), t = tabs.getBoundingClientRect(); if (r.right > t.right + 1) bad.push('tab outside ' + b.textContent); });
    const q = document.querySelector('#q'); const cs = getComputedStyle(q); const cv = document.createElement('canvas').getContext('2d'); cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if (cv.measureText(q.placeholder).width > q.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) bad.push('search hint');
    const foot = document.querySelector('#railfoot'); const fr = foot.getBoundingClientRect(); [...foot.children].forEach((b) => { const r = b.getBoundingClientRect(); if (r.right > fr.right + 1 || over(b)) bad.push('foot ' + b.textContent); });
    if (foot.getBoundingClientRect().height > 60) bad.push('foot wraps');
    if (document.body.innerText.includes(' fps')) bad.push('fps readout');
    return bad; });
  ok(`rail fits at ${w} wide`, fit.length === 0, fit.join(', ')); await p.context().close();
}
// a dot never shows through a label, front or back
p = await open(1440, 900, '#solar');
const solid = await p.evaluate(() => [...document.querySelectorAll('#labels .lab')].every((l) => { const c = getComputedStyle(l); const m = c.backgroundColor.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number); return (m.length < 4 || m[3] === 1) && Number(c.opacity) === 1; }));
ok('labels are solid, so dots behind them stay hidden (front and back)', solid); await p.context().close();
// ---- 6. frame pacing with motion on (software renderer, so this is only a floor; it says nothing about a real phone)
for (const [w, h, label] of [[1440, 900, 'desktop'], [390, 844, 'phone size']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const q = await ctx.newPage(); await q.goto('http://127.0.0.1:8765/index.html#heart'); await q.waitForFunction(() => window.__bfaReady === true, null, { timeout: 90000 });
  const fps = await q.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(Math.round(n / 4)); })(); }));
  console.log(`info frames per second on the software renderer, ${label}: ${fps}`); await ctx.close();
}
console.log(fails ? `\n${fails} CHECKS FAILED` : '\nall checks passed');
await browser.close(); process.exit(fails ? 1 : 0);
