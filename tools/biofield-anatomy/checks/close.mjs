// close-up looks: node close.mjs <outdir> name:y:w:h:az ...
import { chromium } from 'playwright';
const out = process.argv[2]; const specs = process.argv.slice(3);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8765/index.html'); await page.waitForFunction(() => window.__bfaReady === true, null, { timeout: 60000 });
for (const s of specs) {
  const [name, y, w, h, az] = s.split(':');
  await page.evaluate(([y, w, h, az]) => window.__bfa.flyTo({ y: +y, w: +w, h: +h, tilt: 2, depth: 0 }, { az: +az, instant: true }), [y, w, h, az]);
  await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/${name}.png` }); console.log(name);
}
await browser.close();
