// usage: node shot.mjs <w>x<h> name=hash[,name=hash...]   (hash may be empty); optional env WAIT ms
import { chromium } from 'playwright';
const [size, list] = process.argv.slice(2); const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', hasTouch: w < 500, deviceScaleFactor: 1 });
const page = await ctx.newPage(); const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
let first = true;
for (const item of list.split(',')) {
  const [name, hash = ''] = item.split('=');
  if (first) { await page.goto('http://127.0.0.1:8765/index.html' + (hash ? '#' + hash : ''), { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__bfaReady === true, null, { timeout: 90000 }); first = false; }
  else await page.evaluate((hh) => { location.hash = hh; }, hash);
  await page.waitForTimeout(Number(process.env.WAIT || 900));
  await page.screenshot({ path: `/home/claude/bfa/work/shots/${name}.png` });
}
console.log(errs.length ? errs.slice(0, 12).join('\n') : 'no console errors');
await browser.close();
