// Playwright check: node shots.mjs <outdir> <spec...>   spec = name:width:height:zone[:action]
import { chromium } from 'playwright';
const out = process.argv[2]; const specs = process.argv.slice(3);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const s of specs) {
  const [name, w, h, zone, action] = s.split(':');
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:8765/index.html'); 
  await page.waitForFunction(() => window.__bfaReady === true, null, { timeout: 60000 });
  if (zone !== '-1') await page.evaluate((z) => window.__bfa.select(+z, true), zone);
  if (action === 'all') await page.click('#t-organs');
  if (action === 'field') await page.click('#t-field');
  if (action && action.startsWith('organ=')) await page.evaluate(([z, id]) => { const o = window.__bfa.ZONES[+z].organs.find((q) => q.id === id); window.__bfa.focusOrgan(+z, o); }, [zone, action.slice(6)]);
  if (action && action.startsWith('az=')) await page.evaluate(([z, a]) => { const f = +z >= 0 ? window.__bfa.ZONES[+z].frame : window.__bfa.body.frame; window.__bfa.flyTo(f, { az: +a, instant: true }); }, [zone, action.slice(3)]);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name, 'fps', await page.evaluate(() => window.__bfaFps), errs.length ? 'ERRORS ' + errs.join(' | ') : 'ok');
  await ctx.close();
}
await browser.close();
