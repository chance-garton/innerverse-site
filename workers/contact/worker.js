// innerverse-contact: receives the site's contact form and emails it to Chance.
// Secrets and vars (set in Cloudflare, never in this repo): RESEND_API_KEY.
// Vars: TO_EMAIL (chance@innerversepodcast.com), FROM_EMAIL (a verified sender on the Resend account),
// ALLOWED_ORIGINS (comma list, the live site and the test address).
const MAX = { name: 120, email: 200, subject: 200, message: 5000 };

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin);
    const cors = okOrigin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    const json = (o, status = 200) => new Response(JSON.stringify(o), {
      status, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors),
    });
    if (req.method === 'OPTIONS') {
      if (!okOrigin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: Object.assign({
        'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400' }, cors) });
    }
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/contact') return json({ error: 'not found' }, 404);
    if (!okOrigin) return json({ error: 'origin' }, 403);
    let d;
    try { d = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    if (d.website) return json({ ok: true }); // hidden field filled: a bot, pretend success
    // At most 5 sends a minute from one address, so a script cannot flood the inbox (2026-11-09).
    // LIMITER is Cloudflare's built-in rate limit binding (limit 5, period 60 seconds).
    const ip = req.headers.get('CF-Connecting-IP') || '';
    if (ip && env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return json({ error: 'too many' }, 429);
    }
    const clean = k => String(d[k] || '').replace(/[\r\n]+/g, k === 'message' ? '\n' : ' ').trim().slice(0, MAX[k]);
    const f = { name: clean('name'), email: clean('email'), subject: clean('subject'), message: clean('message') };
    if (!f.name || !f.message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return json({ error: 'missing fields' }, 400);
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'InnerVerse site <' + env.FROM_EMAIL + '>',
        to: [env.TO_EMAIL],
        reply_to: f.email,
        subject: 'Contact form: ' + (f.subject || 'no subject') + ' (' + f.name + ')',
        text: 'Name: ' + f.name + '\nEmail: ' + f.email + '\nSubject: ' + (f.subject || '') + '\n\n' + f.message + '\n',
      }),
    });
    if (!r.ok) return json({ error: 'send failed' }, 502);
    return json({ ok: true });
  },
};
