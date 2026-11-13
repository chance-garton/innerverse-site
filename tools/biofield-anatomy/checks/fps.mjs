import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const url of process.argv.slice(2)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const q = await ctx.newPage(); await q.goto(url); await q.waitForFunction(() => window.__bfaReady === true, null, { timeout: 90000 }); await q.waitForTimeout(1500);
  const fps = await q.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else res((n / 5).toFixed(1)); })(); }));
  console.log(url, fps); await ctx.close();
}
await browser.close();
