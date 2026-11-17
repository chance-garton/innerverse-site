// Renders the share picture for /biofield-anatomy from the real viewer: the opening figure with its lights and labels on the right,
// the page's own type on the left. usage: node share.mjs <out.png> [labels|nolabels] [az]
import { chromium } from 'playwright';
const [out, mode = 'labels', az = '0'] = process.argv.slice(2);
const W = 1000, H = 525, K = 2.4;   // laid out at 1000 by 525 and drawn at 2.4x, so the saved picture is 2400 by 1260 (twice 1200 by 630)
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H + 62 }, deviceScaleFactor: K, reducedMotion: 'reduce' });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__bfaReady === true, null, { timeout: 120000 });
await p.addStyleTag({ content: `
  #rail{left:0!important;top:0!important;width:${mode === 'labels' ? 404 : 470}px!important;visibility:hidden!important}
  #panel{left:${W - (mode === 'labels' ? 30 : 0)}px!important;right:auto!important;width:400px!important;visibility:hidden!important}
  #ctl,#strip,#back,#tip,#status,#foot,#results{display:none!important}
  ${mode === 'labels' ? '' : '#labels,#leaders{display:none!important}'}
  .lab{cursor:default}
  #share{position:fixed;left:58px;top:0;height:${H}px;width:400px;display:flex;flex-direction:column;justify-content:center;z-index:9;pointer-events:none}
  #share .eb{font-family:var(--brand);font-size:17px;letter-spacing:.22em;color:var(--ink)}
  #share h1{font-family:var(--display);font-weight:400;font-size:66px;line-height:1.02;letter-spacing:.005em;margin:14px 0 0;color:var(--ink)}
  #share p{font-family:var(--body);font-size:19.5px;line-height:1.42;color:#C9C3B6;margin:20px 0 0;max-width:340px;font-weight:400}
  #share .rule{width:54px;height:1px;background:var(--warm);opacity:.7;margin-top:22px}
` });
await p.evaluate(() => { const d = document.createElement('div'); d.id = 'share'; d.innerHTML = '<div class="eb">INNERVERSE</div><h1>Biofield<br>Anatomy</h1><div class="rule"></div><p>An interactive 3D map of the body, the chakras and the field around you.</p>'; document.body.appendChild(d); });
await p.evaluate(async (deg) => { const s = window.__bfa.scene; window.dispatchEvent(new Event('resize')); s.refit(true); if (Number(deg)) s.turnTo(Number(deg)); await document.fonts.ready; }, az);
await p.waitForTimeout(1500); await p.evaluate(() => window.__bfa.scene.zoomBy(1.07));   // a little air above the Sun Star and below the Earth Star, so a preview that trims the edges keeps both
await p.waitForTimeout(6000);
await p.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } });
await browser.close(); console.log('wrote', out);
