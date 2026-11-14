// Interaction and content checks for the Biofield Anatomy viewer. Run with the preview served on 127.0.0.1:8765.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0; const ok = (name, cond, extra = '') => { if (!cond) fails++; console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
async function open(w, h, hash = '') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', hasTouch: w < 500 });
  if (!process.env.GLOW) await ctx.addInitScript(() => { window.__BFA_NOGLOW = true; });   // the glow pass is slow on the software renderer; GLOW=1 runs the checks with it on
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
    if (n.governs) need.push(...(n.governs.items || [n.governs]).map((x) => x.t));   // what a center governs is shown as single items, one button each
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
  return { shown, miss, fl, feelings: C.feelings.length, feelOne: window.__bfa.FEEL_ONE.length, about, dash: /[–—]/.test(JSON.stringify(C)) };
});
ok('every line of wording is on screen in its node', res.miss.length === 0, `${res.shown} lines checked` + (res.miss.length ? '\n     ' + res.miss.slice(0, 12).join('\n     ') : ''));
ok('feelings index lists every feeling, one button each', res.fl === res.feelOne && res.feelOne >= res.feelings, `${res.fl}`);
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
await p.click('#list .it.sub[data-go="lungs"]'); await p.waitForTimeout(300); ok('the rail opens a part of the open center', (await h2(p)) === 'Lungs');
await p.click('.crumb:has-text("Heart")'); await p.waitForTimeout(200); ok('breadcrumb goes back to the center', (await h2(p)) === 'Heart');
await p.click('#detail .pos:has-text("Right back")'); await p.waitForTimeout(200); ok('compass card opens a spot', (await h2(p)) === 'Right back imbalance');
{ const z = await p.evaluate(() => { const pin = getComputedStyle(document.querySelector('#labels .pin')).zIndex, lab = getComputedStyle(document.querySelector('#labels .lab')).zIndex; return Number(pin) < Number(lab); }); ok('dots sit behind labels', z); }
await p.click('#b-atoz'); await p.waitForTimeout(300);
{ const az = await p.evaluate(() => { const { C } = window.__bfa; const want = C.nodes.length + C.nodes.reduce((a, n) => a + n.positions.length, 0) + window.__bfa.FEEL_ONE.length + window.__bfa.POWERS.length; return { want, got: document.querySelectorAll('#detail .az .res').length, title: document.querySelector('#detail h2').textContent }; });
  ok('Biofield A to Z lists every selectable thing', az.title === 'Biofield A to Z' && az.got === az.want, `${az.got} of ${az.want}`); }
await p.click('#detail .az .res:has-text("Sun Star")'); await p.waitForTimeout(300); ok('A to Z entry opens its screen', (await h2(p)) === 'Sun Star');
{ const t = await p.evaluate(() => JSON.stringify(window.__bfa.C).toLowerCase() + document.body.innerText.toLowerCase()); ok('wording changes applied', !t.includes('conceptual map') && !t.includes('four stops') && !t.includes('feelings a to z') && !t.includes('book a biofield tuning session') && t.includes('book a tuning with chance')); }
await p.click('.tab[data-view="zodiac"]'); await p.waitForTimeout(300); ok('zodiac tab', (await h2(p)) === 'The zodiac body' && (await p.locator('#labels .lab').count()) === 12);
await p.click('#labels .lab:has-text("Leo")'); await p.waitForTimeout(300); ok('sign label opens the sign', (await h2(p)) === 'Leo');
await p.click('#detail .chip:text-is("Heart")'); await p.waitForTimeout(300); ok('sign links back to its center in the chakra view', (await h2(p)) === 'Heart' && (await p.getAttribute('.tab[data-view="chakra"]', 'aria-selected')) === 'true');
await p.click('.tab[data-view="field"]'); await p.waitForTimeout(300); ok('field tab', (await h2(p)) === 'Biofield Structures' && (await p.locator('#labels .lab').count()) >= 10);
await p.click('#list .it:has-text("The timeline")'); await p.waitForTimeout(300); await p.fill('.age input[type=range]', '60'); await p.waitForTimeout(200);
ok('timeline age slider relabels the rings', (await p.locator('#labels .lab.tick:has-text("Now, age 60")').count()) === 1 && (await p.locator('#labels .lab.tick:has-text("Birth")').count()) === 1);
await p.click('.tab[data-view="organs"]'); await p.waitForTimeout(300); await p.click('#list .it:has-text("Liver")'); await p.waitForTimeout(300);
ok('organs view opens a part and stays in the organs view', (await h2(p)) === 'Liver' && (await p.getAttribute('.tab[data-view="organs"]', 'aria-selected')) === 'true');
for (const [q, want] of [['liver', 'Liver'], ['anxiety', 'Anxiety'], ['grief', 'Grief'], ['knee', 'Knees'], ['leo', 'Leo'], ['sun star', 'Sun Star'], ['thyroid', 'Thyroid'], ['boundaries', 'Weak boundaries'], ['sciatica', 'Sciatic nerve'], ['mom', 'Mother issues'], ['lower back', 'Lower back and sacrum']]) {
  await p.fill('#q', q); await p.waitForTimeout(120); const first = await p.evaluate(() => [...document.querySelectorAll('#results .res b')].map((b) => b.textContent));
  ok(`search "${q}" finds ${want}`, first.slice(0, 4).includes(want), first.slice(0, 4).join(' / '));
}
await p.fill('#q', 'liver'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); ok('search Enter opens the first result', (await h2(p)) === 'Liver');
const deep = await p.evaluate(() => window.__bfa.C.nodes.find((n) => n.id === 'f-parents').summary.t.split(' ').slice(-9, -7).join(' '));   // two words from inside a paragraph, read at run time
await p.fill('#q', deep); await p.waitForTimeout(150); ok('search reads the full text too', (await p.locator('#results .res').count()) >= 1);
for (const term of ['immune', 'thymus', 'esophagus', 'pelvic floor', 'hypothalamus', 'rectum']) { await p.fill('#q', term); await p.waitForTimeout(100); const n = await p.locator('#results .res:not(.sug)').count(); ok(`cut item "${term}" is nowhere on the map`, n === 0, String(n)); }
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
  // the legs have no orb since the polish round: tapping a thigh opens them
  const xy = await p.evaluate(([yy, zz, xx]) => { const q = window.__bfa.scene.project([xx, yy, zz]); return [q.x, q.y]; }, [y, name === 'Legs' ? 0.118 : z, name === 'Legs' ? 0.105 : 0]);
  await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(200); ok(name === 'Legs' ? 'tapping a thigh opens the Legs' : `tapping the ${name} orb opens it`, (await h2(p)) === name, await h2(p));
}
await p.evaluate(() => window.__bfa.go({ view: 'chakra' })); await p.waitForTimeout(150);
let xy = await p.evaluate(() => { const q = window.__bfa.scene.project([0.07, 1.22, 0.11]); return [q.x, q.y]; }); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(250); ok('tapping the chest opens the heart', (await h2(p)) === 'Heart');
{ const rows = await p.locator('#pickmenu:not([hidden]) .res').count(); ok('tapping the body offers what lies deeper at that point', rows >= 1, String(rows));
  const spot = p.locator('#pickmenu .res[data-go*="|"]').first(); const want = await spot.locator('b').textContent(); await spot.click(); await p.waitForTimeout(300); ok('the deeper menu opens the spot on that side', (await h2(p)) === want, want);
  await p.evaluate(() => window.__bfa.go({ id: 'heart' })); await p.waitForTimeout(400); }
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
ok('phone: no A to Z button; search is one bubble to type in', (await p.locator('#matoz').count()) === 0 && (await p.isVisible('#msearch')) && /Search the map/.test(await p.textContent('#msearch')) && (await p.evaluate(() => document.querySelector('#msearch').getBoundingClientRect().height)) >= 44);
await p.tap('#msearch'); await p.waitForTimeout(250); ok('phone: the search bubble opens the search, ready to type', await p.evaluate(() => document.activeElement === document.querySelector('#q') && document.body.classList.contains('searching'))); await p.keyboard.press('Escape');
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
// a dot never shows through a label, front or back; the far ones are dimmed, never see-through (Chance, 2026-11-14: tried see-through, took it out)
p = await open(1440, 900, '#solar'); await p.waitForFunction(() => document.querySelectorAll('#labels .lab.far').length === 2, null, { timeout: 30000 }).catch(() => {});
const solid = await p.evaluate(() => { const L = [...document.querySelectorAll('#labels .lab')]; const all = L.every((l) => { const c = getComputedStyle(l); const m = c.backgroundColor.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number); return (m.length < 4 || m[3] === 1) && Number(c.opacity) === 1; });
  const far = L.filter((l) => l.classList.contains('far')).map((l) => getComputedStyle(l.querySelector('.lt')).opacity); return { all, far }; });
ok('labels are solid, so dots behind them stay hidden (front and back); the far ones are dimmed to .36', solid.all && solid.far.length === 2 && solid.far.every((o) => o === '0.36'), JSON.stringify(solid)); await p.context().close();
// ---- polish round (2026-11-13): pointing, view controls, history, sizes
p = await open(1440, 900);
ok('view controls show which side faces the viewer', (await p.textContent('#c-face b')) === 'Front view');
await p.click('#c-face'); await p.waitForTimeout(400); ok('turn around flips to the back', (await p.textContent('#c-face b')) === 'Back view');
await p.click('#c-reset'); await p.waitForTimeout(400); ok('reset returns to the front', (await p.textContent('#c-face b')) === 'Front view');
{ const box = await p.locator('#stage').boundingBox(); const f = await p.evaluate(() => { const r = document.querySelector('#rail').getBoundingClientRect(), q = document.querySelector('#panel').getBoundingClientRect(); return (r.right + q.left) / 2; });
  let named = ''; for (const y of [0.30, 0.34, 0.38, 0.26]) { await p.mouse.move(f, box.height * y); await p.waitForTimeout(160); await p.mouse.move(f + 2, box.height * y + 1); await p.waitForTimeout(260); named = await p.evaluate(() => { const t = document.querySelector('#tip'); return getComputedStyle(t).display !== 'none' ? t.querySelector('b').textContent : ''; }); if (named) break; }
  ok('pointing at the body names the center under the pointer', !!named, named); }
await p.click('.it[data-go="heart"]'); await p.waitForTimeout(300); await p.click('.it.sub[data-go="lungs"]'); await p.waitForTimeout(300);
await p.goBack(); await p.waitForTimeout(500); ok('browser Back steps back through the map', (await h2(p)) === 'Heart', await h2(p));
ok('one tab stays lit in A to Z', await (async () => { await p.click('#b-atoz'); await p.waitForTimeout(200); return (await p.locator('.tab[aria-selected="true"]').count()) === 1; })());
const tiny = await p.evaluate(() => { const bad = new Set(); const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let t; while ((t = tw.nextNode())) { if (!t.nodeValue.trim()) continue; const e = t.parentElement; const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).visibility === 'hidden') continue; if (parseFloat(getComputedStyle(e).fontSize) < 12) bad.add((e.className || e.tagName).toString().split(' ')[0]); } return [...bad]; });
ok('no text below 12px (desktop)', tiny.length === 0, tiny.join(', ')); await p.context().close();
p = await open(390, 844, '#heart');
const small = await p.evaluate(() => [...document.querySelectorAll('button,a:not(.ln),[role=tab]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.height < 36; }).map((e) => (e.id ? '#' + e.id : '.' + (e.className || e.tagName).toString().split(' ')[0]) + ' ' + Math.round(e.getBoundingClientRect().height)));
ok('no control under 36px tall on a phone', small.length === 0, [...new Set(small)].join(', ')); await p.context().close();
// ---- round 3 (2026-11-13): no dead ends, Feelings view, zodiac colours, keys, age box, search help
p = await open(1440, 900);
const ends = await p.evaluate(() => {
  const { C, go, N } = window.__bfa; const bad = []; let pages = 0, links = 0;
  const onward = () => [...document.querySelectorAll('#detail .xp [data-go], #detail .xp [data-feeling]')];
  const check = (name) => { pages++; const xp = document.querySelector('#detail .xp'); if (!xp) { bad.push(name + ': no Keep exploring block'); return; } const o = onward(); links += o.length; if (o.length < 3) bad.push(name + ': only ' + o.length + ' ways onward');
    if (!xp.querySelector('[data-copy]')) bad.push(name + ': no copy link');
    document.querySelectorAll('#detail a.ln').forEach((a) => { const h = decodeURIComponent(a.getAttribute('href').slice(1)); const okT = h.startsWith('feeling-') ? C.feelings.some((f) => f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === h.slice(8)) : N.has(h); if (!okT) bad.push(name + ': link to nowhere ' + h); if (h === window.__bfa.S.id) bad.push(name + ': links to itself'); }); };
  for (const n of C.nodes) { go({ id: n.id }); check(n.id); for (const pos of n.positions) { go({ id: n.id, pos: pos.key }); check(n.id + '/' + pos.key); } }
  for (const f of C.feelings) { go({ feeling: f.name }); check('feeling ' + f.name); }
  go({ special: 'about' }); const about = document.querySelectorAll('#detail [data-setview], #detail [data-special]').length;
  const homes = ['chakra', 'feelings', 'field', 'organs', 'zodiac'].map((v) => { go({ view: v }); return v + ':' + document.querySelectorAll('#detail [data-go], #detail [data-feeling], #detail [data-setview]').length; });
  go({ view: 'chakra' }); return { bad, pages, links, about, homes };
});
ok('no dead ends: every entry closes with at least three ways onward and a copy link', ends.bad.length === 0, `${ends.pages} entries, ${ends.links} onward links` + (ends.bad.length ? '\n     ' + ends.bad.slice(0, 10).join('\n     ') : ''));
ok('About and every view opening offer ways in', ends.about >= 5 && ends.homes.every((x) => Number(x.split(':')[1]) >= 4), ends.homes.join(' ') + ' about:' + ends.about);
await p.evaluate(() => window.__bfa.go({ id: 'skin' })); await p.waitForTimeout(300);
{ const chips = await p.evaluate(() => [...document.querySelectorAll('#detail .xp .chip')].map((c) => c.textContent)); ok('skin leads on to the liver and digestion', ['Liver', 'Stomach', 'Small intestine', 'Large intestine', 'Solar Plexus', 'Sacral'].every((x) => chips.includes(x)), chips.join(', ')); }
await p.click('#detail a.ln:has-text("liver")'); await p.waitForTimeout(300); ok('a named part in the text is a link', (await h2(p)) === 'Liver');
await p.click('#detail .acc[data-k="anatomy"]>button'); await p.evaluate(() => window.__bfa.go({ id: 'spleen' })); await p.waitForTimeout(200);
ok('an opened section stays open on the next part', (await p.getAttribute('#detail .acc[data-k="anatomy"]', 'data-open')) === '1');
await p.evaluate(() => window.__bfa.go({ id: 'heart' })); await p.waitForTimeout(300);
ok('Keep exploring is one plain row of pills: no sub-headings, no previous and next buttons', (await p.locator('#detail .xp .chip[data-go], #detail .xp .chip[data-feeling]').count()) >= 3 && (await p.locator('#detail .pn, #detail .xh').count()) === 0);
await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(300); ok('the down arrow opens the center below', (await h2(p)) === 'Solar Plexus', await h2(p));
await p.keyboard.press('ArrowUp'); await p.waitForTimeout(300); ok('the up arrow steps back up the body', (await h2(p)) === 'Heart', await h2(p));
{ const before = await p.textContent('#c-face b'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700); const after = await p.textContent('#c-face b'); ok('left and right arrows turn the body', before !== after, before + ' to ' + after); }
await p.keyboard.press('?'); ok('? shows the keys', await p.isVisible('#keys')); await p.keyboard.press('Escape'); ok('Escape hides them again', !(await p.isVisible('#keys')));
await p.evaluate(() => window.__bfa.go({ view: 'chakra' })); ok('the search box is the first stop for the Tab key', (await p.evaluate(() => { const f = [...document.querySelectorAll('button,input,a[href],[tabindex]')].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }); return f && f.id; })) === 'q');
await p.focus('#q'); await p.waitForTimeout(150);
ok('focusing the empty search offers places to start', (await p.locator('#results.open .res.sug').count()) >= 6);
await p.fill('#q', 'livr'); await p.waitForTimeout(150); ok('a near miss in search offers the closest entry', (await p.locator('#results .res.sug b').allTextContents()).includes('Liver'));
await p.fill('#q', 'zzzzqq'); await p.waitForTimeout(150); ok('no match still offers Biofield A to Z', (await p.locator('#results .res.sug b').allTextContents()).includes('Biofield A to Z'));
await p.fill('#q', ''); await p.keyboard.press('Escape');
ok('Feelings sits in the foot row between Biofield A to Z and About, and is not a tab', (await p.evaluate(() => [...document.querySelectorAll('#railfoot button')].map((b) => b.id).join())) === 'b-atoz,b-feelings,b-about' && (await p.locator('.tab').count()) === 4);
ok('the four tabs sit in one row', (await p.evaluate(() => new Set([...document.querySelectorAll('.tab')].map((t) => Math.round(t.getBoundingClientRect().top))).size)) === 1);
await p.click('#b-feelings'); await p.waitForTimeout(300); ok('the Feelings button opens the feelings index and one tab stays lit', (await h2(p)) === 'All feelings' && (await p.getAttribute('#b-feelings', 'aria-pressed')) === 'true' && (await p.locator('.tab[aria-selected="true"]').count()) === 1 && (await p.locator('#detail [data-feeling]').count()) === (await p.evaluate(() => window.__bfa.FEEL_ONE.length)));
await p.click('#detail [data-feeling="Anger"]'); await p.waitForTimeout(300); ok('a feeling keeps the Feelings button lit and its breadcrumb says Feelings', (await h2(p)) === 'Anger' && (await p.getAttribute('#b-feelings', 'aria-pressed')) === 'true' && (await p.textContent('#detail .crumbs .crumb')) === 'Feelings' && (await p.locator('.tab[aria-selected="true"]').count()) === 1);
await p.click('#back'); await p.waitForTimeout(300); ok('back from a feeling returns to all feelings', (await h2(p)) === 'All feelings');
await p.evaluate(() => window.__bfa.go({ id: 'legs' })); await p.waitForTimeout(300);
ok('the Legs open as four labelled pieces on the model and four cards in the panel', (await p.locator('#labels .lab .l1').allTextContents()).join() === 'Thighs,Knees,Ankles,Feet' && (await p.locator('#detail .compass .pos').count()) === 4);
await p.click('#labels .lab:has-text("Knees")'); await p.waitForTimeout(300); ok('a leg label opens that piece', (await h2(p)) === 'Knees');
await p.evaluate(() => window.__bfa.go({ id: 'legs' })); await p.waitForTimeout(200); await p.click('#detail .compass .pos:has-text("Ankles")'); await p.waitForTimeout(300); ok('a leg card opens that piece', (await h2(p)) === 'Ankles');
await p.click('.tab[data-view="zodiac"]'); await p.waitForTimeout(300);
{ const z = await p.evaluate(() => { const { C } = window.__bfa; const s = Object.fromEntries(C.nodes.filter((n) => n.kind === 'sign').map((n) => [n.id, [n.element, n.mode, n.zc]]));
    const bad = []; const order = [...document.querySelectorAll('#detail .zleg .zcell span')].map((x) => x.textContent).join(); if (order !== 'Aries,Taurus,Gemini,Cancer,Leo,Virgo,Libra,Scorpio,Sagittarius,Capricorn,Aquarius,Pisces') bad.push('legend order ' + order);
    return { bad, n: new Set(Object.values(s).map((x) => x[2])).size, cells: document.querySelectorAll('#detail .zleg .zcell').length }; });
  ok('zodiac: twelve colours in one spectrum, the legend in body order from Aries to Pisces', z.bad.length === 0 && z.n === 12 && z.cells === 12, z.bad.join(', ')); }
await p.click('#detail .zcell:has-text("Leo")'); await p.waitForTimeout(300); ok('the colour legend opens a sign, named by element and mode', (await h2(p)) === 'Leo' && /fixed fire sign/i.test(await p.textContent('#detail .eyebrow')));
await p.evaluate(() => window.__bfa.go({ id: 'f-timeline' })); await p.waitForTimeout(300); await p.fill('.age input[type=number]', '33'); await p.waitForTimeout(250);
ok('the age box drives the slider and the rings', (await p.inputValue('.age input[type=range]')) === '33' && (await p.locator('#labels .lab.tick:has-text("Now, age 33")').count()) === 1);
await p.evaluate(() => window.__bfa.go({ id: 'liver' })); await p.waitForTimeout(200);
await p.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' }); await p.reload(); await p.waitForFunction(() => window.__bfaReady === true, null, { timeout: 90000 }); await p.waitForTimeout(400);
ok('a return visit remembers the age, and the opening panel no longer offers to pick up where it left off', (await p.locator('#detail a.ln-chip').count()) === 0 && !/left off/i.test(await p.textContent('#detail')) && (await p.evaluate(() => window.__bfa.S.age)) === 33);
ok('no console errors in round 3 checks', p.errs.length === 0, p.errs.slice(0, 3).join(' | ')); await p.context().close();
p = await open(390, 844, '#skin'); ok('phone: the parts of a center stay in the panel, where the rail is hidden', await (async () => { await p.evaluate(() => window.__bfa.go({ id: 'heart' })); await p.waitForTimeout(300); return p.isVisible('#detail .ph-only .chip:has-text("Lungs")'); })());
ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); ok('phone: no sideways scroll with the new blocks', ov.sw <= ov.iw, JSON.stringify(ov)); await p.context().close();
// ---- 5b. the last polish round (2026-11-13): chakra column, kidneys, Right / Left, opening panel, one feeling per button, powers and governs as buttons, fonts
p = await open(1440, 900);
{ const col = await p.evaluate(async () => { const { scene, MODEL } = window.__bfa; const pos = scene.orbPos().slice(1); const out = { line: pos.every((q) => q[0] === 0 && Math.abs(q[2] - MODEL.body.mid) < 1e-6), spread: [] };
    for (const az of [0, 50, 90, 140, 180]) { scene.turnTo(az); await new Promise((r) => setTimeout(r, 1300)); const xs = pos.map((q) => scene.project(q).x); out.spread.push(Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10); } scene.turnTo(0); return out; });
  ok('the seven chakra lights sit on the central line and stay in one column from every side', col.line && col.spread.every((s) => s <= 1), JSON.stringify(col)); }
{ const k = await p.evaluate(() => { const o = window.__bfa.MODEL.organs; const d = o.kidney_l.center[1] - o.kidney_r.center[1]; return { d: Math.round(d * 10000) / 10000, ad: o.adrenal_l.min[1] < o.kidney_l.max[1] && o.adrenal_r.min[1] < o.kidney_r.max[1], names: window.__bfa.scene.organs ? Object.keys(window.__bfa.scene.organs).filter((x) => /aura/.test(x)).length : 0 }; });
  ok('kidneys: the left sits only slightly higher than the right, each adrenal still on its kidney', k.d > 0.001 && k.d < 0.006 && k.ad, JSON.stringify(k)); }
for (const id of ['kidneys', 'adrenals']) { await p.evaluate((x) => window.__bfa.go({ id: x }), id); await p.waitForTimeout(250); const cap = (await p.locator('#detail .cap span').allTextContents()).join('/'); ok(`${id}: the side cards read Right and Left, with no "their"`, /^(Right\/Left|Left\/Right)$/.test(cap) && !/\btheir (left|right)\b/i.test(await p.textContent('#detail')), cap); }
{ const more = await p.evaluate(async () => { const { C, go } = window.__bfa; const bad = []; for (const n of C.nodes) { go({ id: n.id }); if (document.querySelector('#detail [data-more]') || document.querySelector('#detail .chips [hidden]') || /\+\d+ more/.test(document.querySelector('#detail').textContent)) bad.push(n.id); }
    for (const f of C.feelings) { go({ feeling: f.name }); if (document.querySelector('#detail [data-more]') || document.querySelector('#detail .chips [hidden]')) bad.push('f:' + f.name); } return bad; });
  ok('nothing is folded behind a "+N more" button on any entry', more.length === 0, more.slice(0, 5).join(', ')); }
await p.evaluate(() => window.__bfa.go({ view: 'chakra' })); await p.waitForTimeout(300);
{ const hm = await p.evaluate(() => { const d = document.querySelector('#detail'); const vis = (el) => !!el && el.getClientRects().length > 0; return { h2: !!d.querySelector('h2'), eye: !!d.querySelector('.eyebrow'), lede: (d.querySelector('.lede') || {}).textContent || '', left: /left off/i.test(d.textContent), atoz: vis(d.querySelector('[data-special="atoz"]')), about: vis(d.querySelector('[data-special="about"]')), fits: d.scrollHeight <= d.clientHeight + 1, rules: d.querySelectorAll('details.rules li').length }; });
  ok('opening panel: no eyebrow, no repeated title, the biofield definition first, no "pick up where you left off", no A to Z or About pills on desktop', !hm.h2 && !hm.eye && /^The biofield is /.test(hm.lede) && /midline\.$/.test(hm.lede) && !hm.left && !hm.atoz && !hm.about && hm.rules === 4, JSON.stringify(hm).slice(0, 300));
  const fit = []; for (const [w, h] of [[1920, 1080], [1920, 940], [1536, 730], [1440, 900], [1366, 640], [1280, 720]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(350); const r = await p.evaluate(() => { const d = document.querySelector('#detail'); return d.scrollHeight <= d.clientHeight + 1; }); if (!r) fit.push(w + 'x' + h); }
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300); ok('opening panel: fits with no scrolling on 16:9 screens from 1920 by 1080 down to 1280 by 720', fit.length === 0, fit.join(', ')); }
{ const f = await p.evaluate(() => { const { C, FEEL_ONE } = window.__bfa; const g = C.feelings.find((x) => x.name === 'Gratitude'); return { joined: FEEL_ONE.filter((o) => /,| and /.test(o.label)).map((o) => o.label), dup: FEEL_ONE.length - new Set(FEEL_ONE.map((o) => o.label)).size, n: FEEL_ONE.length, grat: g ? g.targets.map((t) => t.node).sort().join() : '', old: C.feelings.some((x) => x.name === 'Love, joy and gratitude'), love: (FEEL_ONE.find((o) => o.label === 'Love') || {}).feeling, joy: (FEEL_ONE.find((o) => o.label === 'Joy') || {}).feeling }; });
  ok('feelings: one feeling per button, Love and Joy share a page, Gratitude is its own entry under Heart and Sacral', f.joined.length === 0 && f.dup === 0 && f.grat === 'heart,sacral' && !f.old && f.love === 'Love and joy' && f.joy === 'Love and joy', JSON.stringify(f).slice(0, 300)); }
await p.evaluate(() => window.__bfa.go({ special: 'feelings' })); await p.waitForTimeout(250);
{ const labs = await p.locator('#detail .cols .res b').allTextContents(); ok('the feelings index lists single feelings only, and Obstacles opens the page it shares with Self-sabotage', labs.length === (await p.evaluate(() => window.__bfa.FEEL_ONE.length)) && !labs.some((l) => /,| and /.test(l)) && labs.includes('Obstacles') && labs.includes('Self-sabotage') && labs.includes('Perfectionism') && labs.includes('Inner critic'));
  await p.click('#detail .cols .res:has-text("Obstacles")'); await p.waitForTimeout(250); const a = await h2(p); await p.evaluate(() => window.__bfa.go({ special: 'feelings' })); await p.waitForTimeout(200); await p.click('#detail .cols .res:has-text("Self-sabotage")'); await p.waitForTimeout(250);
  ok('two feelings from one entry open the same shared page', a === 'Self-sabotage and obstacles' && (await h2(p)) === a, a); }
for (const [hash, want] of [['feeling-joy', 'Love and joy'], ['feeling-love-joy-and-gratitude', 'Love and joy'], ['feeling-gratitude', 'Gratitude'], ['feeling-perfectionism', 'Inner critic and perfectionism']]) { await p.evaluate((h) => { location.hash = h; }, hash); await p.waitForTimeout(300); ok(`link #${hash} opens ${want}`, (await h2(p)) === want, await h2(p)); }
await p.evaluate(() => window.__bfa.go({ id: 'sacral' })); await p.waitForTimeout(250); await p.click('#detail .chip.pw:text-is("Gratitude")'); await p.waitForTimeout(250); ok('Gratitude among the sacral powers opens the Gratitude page, which names Sacral and Heart', (await h2(p)) === 'Gratitude' && (await p.locator('#detail .tgt').count()) === 2);
await p.evaluate(() => window.__bfa.go({ id: 'heart' })); await p.waitForTimeout(250);
{ const z = await p.evaluate(() => { const d = document.querySelector('#detail'); const t = [...d.querySelectorAll('.bh h3.zt')]; const zone = getComputedStyle(document.documentElement).getPropertyValue('--zone').trim(); const probe = document.createElement('i'); probe.style.color = zone; d.appendChild(probe); const want = getComputedStyle(probe).color; probe.remove();
    return { titles: t.map((x) => x.textContent).join('|'), col: t.every((x) => getComputedStyle(x).color === want), btn: d.querySelectorAll('button.chip.pw').length, off: d.querySelectorAll('span.chip.pw.off').length, tag: d.querySelectorAll('.tag, .gov').length }; });
  ok('a center shows its powers and what it governs under small titles in its own colour, as buttons', z.titles === 'Emotional and mental powers|Governs in the body' && z.col && z.btn >= 12 && z.tag === 0, JSON.stringify(z)); }
await p.click('#detail .pwb .chip.pw:text-is("Lungs")'); await p.waitForTimeout(250); ok('a governed part opens that part', (await h2(p)) === 'Lungs');
await p.evaluate(() => window.__bfa.go({ id: 'heart' })); await p.waitForTimeout(250); await p.click('#detail .pwb .chip.pw:text-is("Joy")'); await p.waitForTimeout(250); ok('a power that is a feeling opens that feeling', (await h2(p)) === 'Love and joy');
// powers and governed items: every one a button with a page of its own, nothing greyed out, nothing sent to the search box
{ const pw = await p.evaluate(() => { const { C, go, N, POWERS, FEEL_ONE } = window.__bfa; const bad = []; let chips = 0;
    for (const n of C.nodes) { if (!n.themes.length && !n.governs) continue; go({ id: n.id }); const d = document.querySelector('#detail');
      if (d.querySelector('.chip.pw.off') || d.querySelector('[data-find]')) bad.push(n.id + ': a greyed or search chip');
      for (const b of d.querySelectorAll('.pwb button.chip.pw')) { chips++; const f = b.dataset.feeling, g = b.dataset.go; if (f ? !(POWERS.some((x) => x.name === f) || C.feelings.some((x) => x.name === f)) : !N.has(g)) bad.push(n.id + ': ' + b.textContent); }
      if (d.querySelectorAll('.pwb button.chip.pw').length !== n.themes.length + (n.governs ? n.governs.items.length : 0)) bad.push(n.id + ': chip count'); }
    for (const q of POWERS) { go({ feeling: q.name }); const d = document.querySelector('#detail'); const homes = d.querySelectorAll('.chips .chip[data-go]').length;
      if (d.querySelector('h2').textContent !== q.name || !homes || d.querySelectorAll('.tgt').length !== q.targets.length || d.querySelectorAll('.xp .chip').length < 2) bad.push('page ' + q.name);
      if (!/^#(power|body)-/.test(location.hash)) bad.push('hash ' + q.name + ' ' + location.hash);
      if (document.querySelector('#b-feelings').getAttribute('aria-pressed') === 'true') bad.push('feelings button lit on ' + q.name); }
    return { bad, chips, pages: POWERS.length, empty: POWERS.filter((q) => !q.targets.length).map((q) => q.name) }; });
  ok('every power and governed item is a button that opens a page of its own; no chip is greyed out or sent to the search box', pw.bad.length === 0 && pw.chips > 120, `${pw.chips} buttons, ${pw.pages} power and body pages, ${pw.bad.slice(0, 4).join(' | ')}`);
  ok('every power page has lines to read: none is empty', pw.empty.length === 0, pw.empty.join(', ')); }
{ const hz = await p.evaluate(() => { const s = JSON.stringify(window.__bfa.C); return ['carry no', 'For now', 'not as a rule', 'no difference between', 'no sign of its own', 'not meaningless', 'does not name'].filter((x) => s.includes(x)); });
  ok('no wording that makes the map feel incomplete ("for now", "carry no meaning" and the like)', hz.length === 0, hz.join(', ')); }
await p.evaluate(() => window.__bfa.go({ feeling: 'Compassion' })); await p.waitForTimeout(250); ok('Compassion points to the back left of the heart and carries its meaning', (await p.locator('#detail .tgt:has-text("left back")').count()) >= 1 && /to suffer with/i.test(await p.textContent('#detail .pnote')));
await p.evaluate(() => window.__bfa.go({ id: 'sacral' })); await p.waitForTimeout(250); await p.click('#detail .pwb .chip.pw:text-is("Creativity")'); await p.waitForTimeout(300);
{ const c = await p.evaluate(() => { const d = document.querySelector('#detail'); return { h2: d.querySelector('h2').textContent, homes: [...d.querySelectorAll('.chips .chip[data-go]')].map((x) => x.textContent).slice(0, 3).join(), heads: [...d.querySelectorAll('.bh h3')].map((x) => x.textContent).join('|'), where: [...d.querySelectorAll('.tgt b')].map((x) => x.textContent).join('|') }; });
  ok('Creativity has its own page: Sacral, Throat and Third Eye, how it flows and where it gets stuck', c.h2 === 'Creativity' && c.homes === 'Sacral,Throat,Third Eye' && /When it flows\|If it feels stuck or blocked/.test(c.heads) && /Third Eye/.test(c.where) && /Sacral/.test(c.where), JSON.stringify(c).slice(0, 300)); }
await p.click('#detail .tgt:has-text("Left back")'); await p.waitForTimeout(300); ok('a zone on a power page opens that zone', /Sacral|Left back/i.test(await p.textContent('#detail .crumbs')) && (await p.evaluate(() => window.__bfa.S.pos)) === 'LB');
await p.evaluate(() => { location.hash = 'power-creativity'; }); await p.waitForTimeout(300); ok('link #power-creativity opens the Creativity page', (await h2(p)) === 'Creativity');
await p.evaluate(() => window.__bfa.go({ id: 'sacral' })); await p.waitForTimeout(250); await p.click('#detail .pwb .chip.pw:text-is("Lower digestion")'); await p.waitForTimeout(300);
ok('a body function with no part of its own has a body page that leads to its parts', (await h2(p)) === 'Lower digestion' && (await p.locator('#detail .tgt:has-text("Small intestine")').count()) === 1 && (await p.locator('#detail .tgt:has-text("Large intestine")').count()) === 1);
{ const g = await p.evaluate(() => { window.__bfa.go({ id: 'sacral' }); return [...document.querySelectorAll('#detail .pwb')][1].innerText.replace(/\s+/g, ' '); }); ok('the sacral body list is single items, with no long joined phrases', /Reproductive organs/.test(g) && /Small intestine/.test(g) && /Large intestine/.test(g) && /Lower belly/.test(g) && !/including|hara|large and small/.test(g), g.slice(0, 160)); }
await p.fill('#q', 'creativity'); await p.waitForTimeout(150); ok('search finds a power page', (await p.locator('#results .res:has-text("Power")').count()) >= 1); await p.keyboard.press('Escape');
{ const ft = await p.evaluate(async () => { await document.fonts.ready; const ff = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontFamily : ''; }; window.__bfa.go({ id: 'heart' }); return { h1: ff('h1'), h2: ff('#detail h2'), zc: ff('.it .zc'), eb: ff('#detail .eyebrow'), bh: ff('#detail .bh h3'), ls: parseFloat(getComputedStyle(document.querySelector('.it .zc')).letterSpacing) / parseFloat(getComputedStyle(document.querySelector('.it .zc')).fontSize), mark: parseFloat(getComputedStyle(document.querySelector('#brand .eyebrow')).letterSpacing) / parseFloat(getComputedStyle(document.querySelector('#brand .eyebrow')).fontSize) }; });
  ok('fonts: Marcellus for the main heading and the panel titles, Fjalla for the small capital labels, tracked a little tighter than the INNERVERSE mark', /Marcellus/.test(ft.h1) && /Marcellus/.test(ft.h2) && /Fjalla/.test(ft.zc) && /Fjalla/.test(ft.eb) && /Fjalla/.test(ft.bh) && ft.ls < ft.mark && ft.ls > 0.1, JSON.stringify(ft).slice(0, 260)); }
ok('no console errors in the last polish round checks', p.errs.length === 0, p.errs.slice(0, 3).join(' | ')); await p.context().close();
p = await open(390, 844); ok('phone: the opening panel keeps the About pill, where there is no rail foot, and has no A to Z', await p.evaluate(() => { const d = document.querySelector('#detail'); const v = (s) => { const e = d.querySelector(s); return !!e && e.getClientRects().length > 0; }; return !v('[data-special="atoz"]') && v('[data-special="about"]'); })); await p.context().close();
for (const [w, h] of [[395, 745], [390, 664]]) { p = await open(w, h); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const top = document.querySelector('#rail').getBoundingClientRect().bottom; const pt = document.querySelector('#panel').getBoundingClientRect().top; const ys = [...document.querySelectorAll('#labels .lab')].filter((x) => x.getClientRects().length && getComputedStyle(x).opacity !== '0').map((x) => x.getBoundingClientRect()).map((b) => [b.top, b.bottom]).sort((a, b) => a[0] - b[0]); let overlap = 0; for (let i = 1; i < ys.length; i++) overlap = Math.max(overlap, ys[i - 1][1] - ys[i][0]); return { n: ys.length, ok: ys.length === 8 && ys[0][0] >= top && ys[7][1] <= pt && overlap <= 0 }; });
  ok(`short phone screen (${w} by ${h}): all eight center labels sit between the tabs and the sheet, none overlapping`, r.ok, JSON.stringify(r)); await p.context().close(); }
// ---- 5c. the review sitting (2026-11-14): one label per place, moved powers, A to Z, years per foot, drawn glyphs, cut lines, field labels, the phone sheet, the small version
p = await open(1440, 900);
{ const r = await p.evaluate(async () => { const { go, N, POWERS, C } = window.__bfa; const wait = (ms) => new Promise((x) => setTimeout(x, ms)); const out = {};
    const labs = () => [...document.querySelectorAll('#labels .lab')].filter((x) => x.style.display !== 'none').map((x) => x.textContent.trim());
    go({ feeling: 'Intelligence' }); await wait(150); out.intel = labs();
    const dup = []; for (const f of [...POWERS, ...C.feelings]) { go({ feeling: f.name }); await wait(20); const places = new Set(f.targets.map((t) => { const tn = N.get(t.node); const has = t.pos && tn.positions.some((q) => q.key === t.pos); return t.node + '|' + (has || /^[LRB]$/.test(t.pos || '') ? t.pos : ''); }).filter((k) => N.get(k.split('|')[0]).kind !== 'field'));
      const n = document.querySelectorAll('#labels .lab').length; if (n !== places.size) dup.push(`${f.name}: ${n} labels for ${places.size} places`); }
    out.dup = dup;
    const themes = (id) => N.get(id).themes.map((t) => t.t);
    out.honesty = themes('throat').includes('Honesty') && !themes('solar').includes('Honesty') && themes('solar').includes('Integrity') && POWERS.find((x) => x.name === 'Honesty').homes.join() === 'throat';
    out.spirit = themes('crown').includes('Spiritual connection') && !themes('thirdeye').includes('Spiritual connection') && POWERS.find((x) => x.name === 'Spiritual connection').homes.join() === 'crown';
    go({ feeling: 'Spiritual connection' }); await wait(60); out.spiritPage = document.querySelector('#detail').innerText; out.spiritTo = [...document.querySelectorAll('#detail .tgt')].map((b) => b.dataset.go.split('|')[0]);
    go({ special: 'atoz' }); await wait(60); const az = [...document.querySelectorAll('#detail .az .res b')].map((b) => b.textContent); out.azMiss = POWERS.filter((x) => !az.includes(x.name)).map((x) => x.name);
    document.querySelector('[data-az="Power"]').click(); await wait(60); out.azPowers = document.querySelectorAll('#detail .az .res').length; out.powerCount = POWERS.filter((x) => x.type !== 'body').length;
    go({ id: 'f-timeline' }); await wait(80); const num = document.querySelector('.age input[type=number]'); const set = (v) => { num.value = v; num.dispatchEvent(new Event('input', { bubbles: true })); return document.querySelector('[data-ypf]').textContent.replace(/\s+/g, ' ').replace('⁄', '/'); };
    out.ypf = [set(40), set(36), set(45), set(37), set(6)]; set(40); out.ringNote = /The rings mark where each age sits/.test(document.querySelector('#detail').innerText);
    go({ view: 'field' }); await wait(700); out.fieldTitle = document.querySelector('#detail h2').textContent; out.invite = (document.querySelector('#detail .tgt.inv') || {}).textContent || '';
    const cx = (document.querySelector('#rail').getBoundingClientRect().right + document.querySelector('#panel').getBoundingClientRect().left) / 2; const boxes = [...document.querySelectorAll('#labels .lab')].filter((x) => x.style.display !== 'none').map((x) => x.getBoundingClientRect());
    out.sides = [boxes.filter((b) => b.left + b.width / 2 < cx).length, boxes.filter((b) => b.left + b.width / 2 >= cx).length];
    out.overlap = boxes.some((a, i) => boxes.some((b, j) => j > i && a.left < b.right && b.left < a.right && a.top < b.bottom - 1 && b.top < a.bottom - 1));
    document.querySelector('#detail .tgt.inv').click(); await wait(80); out.inviteTo = location.hash;
    go({ view: 'zodiac' }); await wait(200); out.glyphLabs = document.querySelectorAll('#labels .lab.glyph svg.zg').length; out.glyphList = document.querySelectorAll('#list .it svg.zg').length;
    go({ id: 'leo' }); await wait(80); out.glyphBig = !!document.querySelector('#detail .bigglyph svg.zg'); go({ id: 'heart' }); await wait(60); out.glyphChip = document.querySelectorAll('#detail .chip svg.zg').length;
    const all = []; for (const n of C.nodes) { go({ id: n.id }); all.push(document.body.innerText); } for (const f of C.feelings) { go({ feeling: f.name }); all.push(document.body.innerText); } go({ view: 'organs' }); all.push(document.body.innerText); go({ view: 'chakra' }); all.push(document.body.innerText);
    const text = all.join('\n'); out.textGlyph = /[♈-♓]/.test(text); out.cut = ['Drag to turn the body', 'Choose a spot, or a label on the model', 'Every organ and body part on the model', 'may live', 'soft, open heart', 'physically pleasurable'].filter((x) => text.includes(x));
    out.hint = !!document.querySelector('#hint'); go({ feeling: 'Anxiety' }); out.one = document.querySelector('#detail .lede').textContent; go({ feeling: 'Love and joy' }); out.many = document.querySelector('#detail .lede').textContent;
    go({ feeling: 'Gratitude' }); out.grat = document.querySelector('#detail').innerText; go({ id: 'crown' }); out.crownLine = document.querySelector('#detail').textContent.includes('The crown is less defined than other energy centers');
    go({ view: 'chakra' }); return out; });
  ok('a power with no line of its own shows one label on the figure, its center', r.intel.length === 1 && /^crown$/i.test(r.intel[0]), JSON.stringify(r.intel));
  ok('every power, body and feeling page: one label per place on the figure, never two for the same place', r.dup.length === 0, r.dup.slice(0, 6).join(' | '));
  ok('Honesty is a Throat power and is off the Solar Plexus list; Integrity stays at the Solar Plexus', r.honesty);
  ok('Spiritual connection is a Crown power that also leads to the Third Eye', r.spirit && /A power of the Crown\./.test(r.spiritPage) && r.spiritTo.includes('thirdeye') && r.spiritTo.includes('crown'), JSON.stringify(r.spiritTo));
  ok('A to Z lists every power and body page, with a Powers filter', r.azMiss.length === 0 && r.azPowers === r.powerCount && r.powerCount > 50, `${r.azPowers} of ${r.powerCount}; missing ${r.azMiss.slice(0, 5).join(', ')}`);
  ok('years to each foot of the field follow the age as a simple fraction (age over 6)', /About 6 2\/3 years/.test(r.ypf[0]) && /About 6 years/.test(r.ypf[1]) && /About 7 1\/2 years/.test(r.ypf[2]) && /About 6 1\/6 years/.test(r.ypf[3]) && /About 1 year to/.test(r.ypf[4]) && r.ringNote, JSON.stringify(r.ypf));
  ok('the Field view opens as "Biofield Structures" with the invitation to the age timeline', r.fieldTitle === 'Biofield Structures' && /Find your own years in the field\./.test(r.invite) && /calculate the distance of your memories in the biofield\./.test(r.invite) && r.inviteTo === '#f-timeline', r.invite + ' ' + r.inviteTo);
  ok('field labels stand on both sides of the figure, none on another', r.sides[0] >= 3 && r.sides[1] >= 3 && Math.abs(r.sides[0] - r.sides[1]) <= 2 && !r.overlap, JSON.stringify(r.sides));
  ok('zodiac glyphs are drawn, not text symbols: on the model, in the list, on a sign page and on the sign buttons', r.glyphLabs === 12 && r.glyphList === 12 && r.glyphBig && r.glyphChip >= 1 && !r.textGlyph, JSON.stringify([r.glyphLabs, r.glyphList, r.glyphBig, r.glyphChip, r.textGlyph]));
  ok('the cut lines and the replaced wording are gone from every page', r.cut.length === 0 && !r.hint, r.cut.join(' | '));
  ok('a feeling page opens with Chance\'s line, singular or plural as the page needs', r.one === 'Where this emotion tends to show up in the body and biofield. Choose a spot to learn more.' && r.many === 'Where these emotions tend to show up in the body and biofield. Choose a spot to learn more.', r.one + ' / ' + r.many);
  ok('the Gratitude page carries the two reworded lines; the Crown keeps its "less defined" line', /in a strong, courageous heart\./.test(r.grat) && /thankfulness felt as a tingle in the body\./.test(r.grat) && r.crownLine); }
await p.context().close();
p = await open(390, 780, '#heart');
{ const r = await p.evaluate(async () => { const { go } = window.__bfa; const wait = (ms) => new Promise((x) => setTimeout(x, ms)); const out = {}; const panel = document.querySelector('#panel'), back = document.querySelector('#back'), d = document.querySelector('#detail'), cta = document.querySelector('#cta');
    await wait(500); const pr = panel.getBoundingClientRect(), br = back.getBoundingClientRect(); out.backIn = back.parentElement.id === 'sheethead' && br.top >= pr.top && br.bottom <= pr.top + 50 && br.width > 40;
    d.scrollTop = 0; d.dispatchEvent(new Event('scroll')); await wait(400); out.slim = Math.round(cta.getBoundingClientRect().height); d.scrollTop = d.scrollHeight; d.dispatchEvent(new Event('scroll')); await wait(500); out.grown = Math.round(cta.getBoundingClientRect().height);
    go({ special: 'feelings' }); await wait(600); out.full = Math.round(panel.getBoundingClientRect().height / innerHeight * 100); out.backFull = back.getClientRects().length > 0;
    document.querySelector('#detail [data-feeling]').click(); await wait(600); out.after = Math.round(panel.getBoundingClientRect().height / innerHeight * 100); return out; });
  ok('phone: the way back sits inside the sheet header', r.backIn, JSON.stringify(r));
  ok('phone: the booking bar is slim while reading and grows to the full button at the end of an entry', r.slim === 36 && r.grown >= 44, `${r.slim} then ${r.grown}`);
  ok('phone: the feelings index opens at full height with the way back in reach, and the sheet comes down again on a feeling', r.full >= 80 && r.backFull && r.after < 60, `${r.full}% then ${r.after}%`); }
{ // a flick carries the sheet to the next stop even when it has moved less than half the way (events sent from inside the page a few milliseconds apart, so a slow test machine cannot stretch the flick)
  await p.evaluate(() => window.__bfa.go({ id: 'heart' })); await p.waitForTimeout(500);
  const r = await p.evaluate(async () => { const wait = (ms) => new Promise((x) => setTimeout(x, ms)); const g = document.querySelector('#grab'), panel = document.querySelector('#panel'); const b = g.getBoundingClientRect(); const x = b.left + b.width / 2, y = b.top + 16; const before = panel.getBoundingClientRect().height;
    const ev = (type, dy) => g.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: x, clientY: y - dy }));
    const spin = (ms) => { const t = performance.now(); while (performance.now() - t < ms); };   // a pause that does not hand the thread to the slow software renderer
    ev('pointerdown', 0); for (let i = 1; i <= 4; i++) { spin(6); ev('pointermove', i * 38); } spin(3); ev('pointerup', 152); await wait(700); const flick = panel.getBoundingClientRect().height;
    ev('pointerdown', 0); ev('pointermove', -40); await wait(300); ev('pointerup', -40); await wait(700); return { before, flick, slow: panel.getBoundingClientRect().height }; });
  ok('phone: a quick upward flick on the sheet carries it to the next stop; a slow short drag settles on the nearest', r.flick > r.before + 150 && r.slow === r.flick, JSON.stringify(r)); }
await p.context().close();
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true }); await ctx.addInitScript(() => { window.__BFA_NOGLOW = true; }); const q = await ctx.newPage(); await q.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' }); await q.waitForFunction(() => window.__bfaReady === true, null, { timeout: 90000 }); await q.waitForTimeout(2500);
  const at = await q.evaluate(() => { const r = window.__bfa.scene.project([0, 1.25, window.__bfa.MODEL.body.mid + 0.1]); return [r.x, r.y]; }); await q.evaluate(() => { window.__rip = 0; new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('rip')) window.__rip++; }))).observe(document.body, { childList: true }); }); await q.touchscreen.tap(at[0], at[1]); await q.waitForTimeout(1500); const rip = (await q.evaluate(() => window.__rip)) === 1;
  ok('phone: a soft ripple shows where the body was pressed', rip); await ctx.close(); }
{ // the small version for /biofield-tuning
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' }); await ctx.addInitScript(() => { window.__BFA_NOGLOW = true; }); const q = await ctx.newPage(); const errs = []; q.on('pageerror', (e) => errs.push(String(e))); q.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await q.goto('http://127.0.0.1:8765/mini.html', { waitUntil: 'domcontentloaded' }); const early = await q.evaluate(() => ({ pills: document.querySelectorAll('#bfa-mini [data-center]').length, intro: document.querySelector('.bm-intro').textContent.length, poster: !!document.querySelector('.bm-poster'), open: document.querySelector('.bm-open').getAttribute('href') }));
  await q.waitForFunction(() => window.__bfaMiniReady === true, null, { timeout: 120000 }); await q.waitForTimeout(400); await q.click('[data-center="heart"]'); await q.waitForTimeout(200);
  const r = await q.evaluate(() => ({ live: document.querySelector('#bfa-mini').classList.contains('bm-live'), canvas: !!document.querySelector('.bm-canvas canvas'), name: document.querySelector('.bm-card b').textContent, line: document.querySelector('.bm-card span').textContent, hidden: document.querySelector('.bm-card').hidden, open: document.querySelector('.bm-open').getAttribute('href'), pressed: document.querySelector('[data-center="heart"]').getAttribute('aria-pressed'), zoom: window.__bfaMini.scene.controls.enableZoom, touch: document.querySelector('.bm-canvas canvas').style.touchAction }));
  ok('small version: the words, the seven centers, the still image and the button are there before any 3D loads', early.pills === 7 && early.intro > 60 && early.poster && early.open === 'index.html', JSON.stringify(early));
  ok('small version: choosing a center shows its name and one line, and the button opens the full map at that center', r.live && r.canvas && r.name === 'Heart' && r.line.length > 5 && !r.hidden && r.open === 'index.html#heart' && r.pressed === 'true', JSON.stringify(r));
  ok('small version: it never zooms and a finger can still scroll the page over it; no console errors', r.zoom === false && r.touch === 'pan-y' && errs.length === 0, errs.slice(0, 3).join(' | ')); await ctx.close(); }
{ // later the same morning (Chance, 2026-11-14): the legend is "The signs" with each sign's glyph and name; the Legs panel has no "choose one" caption; far labels are plain dimmed labels again (the behind-the-body trial was reverted)
  const q = await open(1440, 900, '#view-zodiac'); await q.waitForTimeout(400);
  const r = await q.evaluate(async () => { const { go } = window.__bfa; const wait = (ms) => new Promise((x) => setTimeout(x, ms)); const out = {};
    out.title = document.querySelector('#detail .zleg').previousElementSibling.querySelector('h3').textContent; out.cells = [...document.querySelectorAll('#detail .zleg .zcell')].map((c) => !!c.querySelector('em svg.zg') && c.querySelector('span').textContent.length > 2 && !c.querySelector('i')).filter(Boolean).length; out.colors = document.querySelector('#detail').innerText.includes('THE COLORS') || document.querySelector('#detail').innerText.includes('The colors');
    go({ id: 'legs' }); await wait(200); out.legs = document.querySelector('#detail').innerText.includes('Choose one');
    go({ id: 'heart' }); await wait(900); out.occ = !!document.querySelector('#occ'); out.far = document.querySelectorAll('#labels .lab.far').length; out.labs = document.querySelectorAll('#labels .lab').length; return out; });
  ok('the zodiac legend is "The signs": twelve cells, each with its drawn glyph and its name', r.title === 'The signs' && r.cells === 12 && !r.colors, JSON.stringify(r));
  ok('the Legs panel has no "choose one" caption', !r.legs);
  ok('far labels are plain dimmed labels, in front of the body as before', !r.occ && r.labs === 4 && r.far === 2, JSON.stringify(r));
  await q.context().close(); }
// ---- 6. frame pacing with motion on (software renderer, so this is only a floor; it says nothing about a real phone)
for (const [w, h, label] of [[1440, 900, 'desktop'], [390, 844, 'phone size']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const q = await ctx.newPage(); await q.goto('http://127.0.0.1:8765/index.html#heart'); await q.waitForFunction(() => window.__bfaReady === true, null, { timeout: 90000 });
  const fps = await q.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(Math.round(n / 4)); })(); }));
  console.log(`info frames per second on the software renderer, ${label}: ${fps}`); await ctx.close();
}
console.log(fails ? `\n${fails} CHECKS FAILED` : '\nall checks passed');
await browser.close(); process.exit(fails ? 1 : 0);
