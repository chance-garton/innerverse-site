// Draw the homepage and the archive in a headless browser and write what the
// scripts drew into the HTML (see build/pages.py). Run after build/build.py:
//   IV_DATA_DIR=../innerverse-data node tools/prerender.js
// The data the scripts fetch from innerverse-data on GitHub is served from the
// local checkout, so the drawn page matches the data this build used.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIST = path.join(__dirname, '..', 'dist');
const DATA = process.env.IV_DATA_DIR || path.join(__dirname, '..', '..', 'innerverse-data');
const BASE = (process.env.IV_BASE || '').replace(/\/$/, '');
const HOST = 'https://iv.local';
const RAW = 'https://raw.githubusercontent.com/chance-garton/innerverse-data/main/';
const PAGES = [
  { file: 'index.html', url: '/', ready: '#ivh-grid .ivh-card:not([href="/episodes"]), #ivh-grid a[href*="/episodes/"]' },
  { file: 'episodes.html', url: '/episodes', ready: '.iva-results .iva-card, .iva-card' },
  { file: 'plus.html', url: '/plus', ready: ['.iva-results .iva-card', '.iv-plus-hero .iv-plus-hero-latest-title'] },
];
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };

function fromDist(p) {
  let rel = decodeURIComponent(p);
  if (BASE && rel.indexOf(BASE) === 0) rel = rel.slice(BASE.length);
  rel = rel.replace(/^\//, '');
  const tries = [rel, rel + '.html', path.join(rel, 'index.html'), 'index.html'];
  for (const t of (rel ? tries.slice(0, 3) : ['index.html'])) {
    const f = path.join(DIST, t);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

(async () => {
  const opts = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {};
  const browser = await chromium.launch(opts);
  let failed = 0;
  for (const pg of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('**/*', async (route) => {
      const u = route.request().url();
      if (u.indexOf(HOST) === 0) {
        const f = fromDist(new URL(u).pathname);
        if (!f) return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
      }
      if (u.indexOf(RAW) === 0) {
        const f = path.join(DATA, u.slice(RAW.length).split('?')[0]);
        if (fs.existsSync(f)) return route.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(f) });
        return route.fulfill({ status: 404, body: '' });
      }
      // Pictures, fonts and anything else outside: not needed to draw the page.
      return route.fulfill({ status: 204, body: '' });
    });
    await page.goto(HOST + BASE + pg.url, { waitUntil: 'domcontentloaded' });
    try {
      for (const sel of [].concat(pg.ready)) await page.waitForSelector(sel, { timeout: 20000 });
    } catch (e) {
      console.error('prerender: ' + pg.file + ' never finished drawing; left as the plain shell. ' + errors.join(' | '));
      failed++;
      await ctx.close();
      continue;
    }
    await page.waitForTimeout(1500);
    const drawn = await page.evaluate(() => {
      const m = document.getElementById('iv-mount');
      // Things that only make sense live: open panels, focus, timers' state.
      m.querySelectorAll('.is-open,.iv-open').forEach((n) => n.classList.remove('is-open', 'iv-open'));
      // The promo box comes and goes with a tick in Airtable; visitors get it from promo.js.
      m.querySelectorAll('.iv-promo-slot,.iv-promo').forEach((n) => n.remove());
      return m.innerHTML;
    });
    const file = path.join(DIST, pg.file);
    let html = fs.readFileSync(file, 'utf8');
    const open = '<div id="iv-mount" data-iv-prerender>';
    const a = html.indexOf(open);
    const b = html.indexOf('</main>', a);
    const shellBlock = html.slice(a, b); // '<div ...>SHELL</div>'
    const shell = shellBlock.slice(open.length, shellBlock.lastIndexOf('</div>'));
    let out = drawn;
    if (BASE) out = out.replace(/(href|src)="\/(?!\/)/g, (m0, attr) => attr + '="' + BASE + '/');
    // Visitors get the shell back before the scripts run, so the live
    // scripts draw on it as they always have. Crawlers read the drawn page.
    const restore = '<template id="iv-mount-shell">' + shell.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '') + '</template>' +
      '<script>(function(){var m=document.getElementById("iv-mount"),t=document.getElementById("iv-mount-shell");if(m&&t)m.innerHTML=t.innerHTML;})();</script>';
    html = html.slice(0, a) + '<div id="iv-mount" data-iv-prerendered>' + out + '</div>' + restore + html.slice(b);
    fs.writeFileSync(file, html);
    const folder = { 'episodes.html': 'episodes', 'plus.html': 'plus' }[pg.file];
    if (folder) fs.writeFileSync(path.join(DIST, folder, 'index.html'), html);
    console.log('prerender: ' + pg.file + ' ' + Math.round(out.length / 1024) + ' KB drawn' + (errors.length ? ' (script errors: ' + errors.join(' | ') + ')' : ''));
    await ctx.close();
  }
  await browser.close();
  // A page left as the shell still works for visitors, so this does not stop the deploy.
  process.exitCode = 0;
  if (failed) console.error('prerender: ' + failed + ' page(s) not drawn');
})();
