/* Super Chat on the website (assets/super-chat.js), 2026-11-09.
   On /episodes/<slug> and /plus/<slug> (posts into that episode's Inner Circle room) and on the home
   page (posts into Inner Circle Chat). Anyone can send one: a signed-in member sends under their chat
   name; a visitor may give a name or stay anonymous, and is shown the Plus+ path while choosing.
   Payment is Stripe's embedded Checkout, served by the innerverse-circle Worker (/api/super/*).
   The public list shows only Super Chats sent from the website, never what members say in the chat.
   Colours and spotlight times match SUP_TIERS in the chat (inner-circle worker/src/app.html). */
(function () {
  'use strict';
  var API = 'https://innerverse-circle.chance-5da.workers.dev';
  var PLUS = { trial: 'https://innerverseplus.memberful.com/checkout?plan=149343', month: 'https://innerverseplus.memberful.com/checkout?plan=149341', year: 'https://innerverseplus.memberful.com/checkout?plan=149342' };
  var TIERS = [[10000, '#E2557A'], [5000, '#EE8A3C'], [2500, '#D8AA3C'], [1000, '#4FBF8A'], [500, '#3FB6C9'], [0, '#5B8FE0']];
  var PRESETS = [500, 1000, 2500, 5000, 10000];

  var path = (window.ivPath ? window.ivPath() : window.location.pathname).replace(/\/+$/, '') || '/';
  var seg = path.split('/').filter(Boolean);
  var page = '', isHome = path === '/' || path === '/home';
  if (isHome) page = 'home';
  else if (seg.length === 2 && /^(episodes|plus)$/i.test(seg[0])) page = 'ep:' + decodeURIComponent(seg[1]).toLowerCase();
  if (!page || !/^(home|ep:[a-z0-9-]{1,140})$/.test(page)) return;

  function tier(c) { for (var i = 0; i < TIERS.length; i++) if (c >= TIERS[i][0]) return TIERS[i][1]; return TIERS[TIERS.length - 1][1]; }
  function money(c) { return '$' + (c % 100 ? (c / 100).toFixed(2) : String(c / 100)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { var m = window.ivMembership; return (m && m.getToken && m.getToken()) || ''; }
  function member() {
    var ent = ''; try { ent = localStorage.getItem('iv_plus_entitled'); } catch (e) {}
    return !!token() && (ent === 'yes' || document.documentElement.classList.contains('iv-plus-member'));
  }
  function memberName() { try { return (localStorage.getItem('iv_plus_name') || '').split(' ')[0]; } catch (e) { return ''; } }
  var COIN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M14.8 9.2c-.5-.9-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2s1.2 1.7 2.8 2.1 2.8.9 2.8 2.1-1.2 2-2.8 2c-1.3 0-2.4-.6-2.9-1.5"></path><path d="M12 6v1.8M12 16.2V18"></path></svg>';

  var CSS = '' +
    '.ivsc{background:var(--card,#151E33);border:1px solid var(--line,rgba(233,238,246,.12));border-radius:14px;padding:22px 24px;margin:22px 0;color:var(--ink,#E9EEF6);font-family:var(--font-sans,Manrope,"Segoe UI",Helvetica,Arial,sans-serif);box-sizing:border-box}' +
    '.ivsc-wrap{max-width:1200px;margin:0 auto;padding:0 20px}' +
    '.ivsc-top{display:flex;align-items:center;gap:16px;flex-wrap:wrap}' +
    '.ivsc-top>div{flex:1;min-width:220px}' +
    '.ivsc-eb{display:block;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--gold-text,#D8AA3C)}' +
    '.ivsc h3{font-family:var(--font-display,Fraunces,Georgia,serif);font-size:24px;font-weight:600;margin:4px 0 6px;color:var(--ink,#E9EEF6);letter-spacing:-.3px}' +
    '.ivsc p{margin:0;color:var(--ink-muted,#9AA6BA);font-size:15px;line-height:1.5}' +
    '.ivsc-go{display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 22px;border-radius:10px;border:0;background:var(--gold,#D8AA3C);color:var(--on-gold,#0A0F1C);font:700 15px/1 var(--font-sans,Manrope,sans-serif);cursor:pointer;white-space:nowrap}' +
    '.ivsc-list{display:flex;flex-direction:column;gap:8px;margin-top:18px}' +
    '.ivsc-item{--sc:#5B8FE0;border-radius:12px;overflow:hidden;border:1px solid color-mix(in srgb,var(--sc) 55%,transparent);background:color-mix(in srgb,var(--sc) 12%,transparent)}' +
    '.ivsc-band{display:flex;align-items:center;gap:8px;padding:7px 12px;background:var(--sc);color:#0A0F1C;font-weight:800;font-size:14px}' +
    '.ivsc-band b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.ivsc-band span{font-weight:900;font-size:16px}' +
    '.ivsc-txt{padding:8px 12px;font-size:14.5px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}' +
    '.ivsc-thx{padding:0 12px 8px;font-size:12.5px;font-weight:700;color:var(--ink-muted,#9AA6BA)}' +
    '.ivsc-thx i{font-style:normal;color:#F2998A}' +
    '.ivsc-more{margin-top:10px;font-size:13px;color:var(--ink-muted,#9AA6BA)}' +
    '.ivsc-more a{color:var(--lapis-lit,#8FB5F0);font-weight:700}' +
    '.ivsc-scrim{position:fixed;inset:0;z-index:100000;background:rgba(5,8,16,.7);display:flex;align-items:flex-end;justify-content:center}' +
    '@media(min-width:700px){.ivsc-scrim{align-items:center}}' +
    '.ivsc-sheet{width:min(480px,100%);max-height:92vh;overflow:auto;background:var(--surface,#111827);color:var(--ink,#E9EEF6);border:1px solid var(--line,rgba(233,238,246,.12));border-radius:18px 18px 0 0;font-family:var(--font-sans,Manrope,sans-serif);box-sizing:border-box}' +
    '@media(min-width:700px){.ivsc-sheet{border-radius:18px}}' +
    '.ivsc-head{display:flex;align-items:center;gap:10px;padding:16px 14px 6px 20px;color:var(--gold,#D8AA3C)}' +
    '.ivsc-head h2{flex:1;margin:0;font-family:var(--font-display,Fraunces,Georgia,serif);font-size:23px;font-weight:600;color:var(--ink,#E9EEF6)}' +
    '.ivsc-x{width:40px;height:40px;border:0;background:transparent;color:var(--ink-muted,#9AA6BA);font-size:26px;line-height:1;cursor:pointer}' +
    '.ivsc-body{padding:6px 20px 20px;display:flex;flex-direction:column;gap:13px}' +
    '.ivsc-body[hidden],.ivsc-cust[hidden],.ivsc-plus[hidden]{display:none}' +
    '.ivsc-amts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}' +
    '.ivsc-amts button{--sc:#5B8FE0;padding:12px 6px;border-radius:12px;border:1px solid color-mix(in srgb,var(--sc) 55%,transparent);background:color-mix(in srgb,var(--sc) 12%,transparent);color:var(--ink,#E9EEF6);font:800 17px/1 var(--font-sans,Manrope,sans-serif);cursor:pointer}' +
    '.ivsc-amts button[aria-pressed=true]{background:var(--sc);color:#0A0F1C}' +
    '.ivsc-cust{display:flex;align-items:center;gap:8px;border:1px solid var(--line,rgba(233,238,246,.12));border-radius:12px;padding:0 12px;height:48px}' +
    '.ivsc-cust span{color:var(--ink-muted,#9AA6BA);font-weight:700}' +
    '.ivsc-cust input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:var(--ink,#E9EEF6);font:700 17px var(--font-sans,Manrope,sans-serif)}' +
    '.ivsc-note{font-size:13px;line-height:1.45;color:var(--ink-muted,#9AA6BA);margin:0}' +
    '.ivsc-lbl{font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-muted,#9AA6BA);margin-bottom:-6px}' +
    '.ivsc-in,.ivsc-ta{width:100%;box-sizing:border-box;border:1px solid var(--line,rgba(233,238,246,.12));border-radius:12px;background:rgba(10,15,28,.35);color:var(--ink,#E9EEF6);padding:11px 12px;font:15px/1.45 var(--font-sans,Manrope,sans-serif)}' +
    '.ivsc-ta{min-height:80px;resize:vertical}' +
    '.ivsc-plus{border:1px solid rgba(216,170,60,.45);background:rgba(216,170,60,.08);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:9px}' +
    '.ivsc-plus b{color:var(--gold-text,#D8AA3C);font-size:14.5px}' +
    '.ivsc-plus p{margin:0;font-size:13.5px;line-height:1.45;color:var(--ink,#E9EEF6)}' +
    '.ivsc-pbtns{display:flex;gap:6px;flex-wrap:wrap}' +
    '.ivsc-pbtns a{flex:1 1 auto;text-align:center;padding:9px 10px;border-radius:9px;border:1px solid rgba(216,170,60,.7);color:var(--ink,#E9EEF6);font-weight:700;font-size:13.5px;text-decoration:none;white-space:nowrap}' +
    '.ivsc-pbtns a:first-child{background:var(--gold,#D8AA3C);color:#0A0F1C;border-color:transparent}' +
    '.ivsc-send{height:50px;border-radius:10px;border:0;background:var(--gold,#D8AA3C);color:#0A0F1C;font:700 15px/1 var(--font-sans,Manrope,sans-serif);cursor:pointer}' +
    '.ivsc-send:disabled{opacity:.5;cursor:default}' +
    '.ivsc-fine{font-size:12px;color:var(--ink-muted,#9AA6BA);line-height:1.45;margin:0}' +
    '.ivsc-pay{min-height:120px;border-radius:12px;overflow:hidden;background:#fff}' +
    '.ivsc-done{text-align:center;padding:10px 0 4px}' +
    '.ivsc-done h3{font-family:var(--font-display,Fraunces,Georgia,serif);font-size:24px;margin:6px 0}';

  function addCss() { if (document.getElementById('ivsc-css')) return; var st = document.createElement('style'); st.id = 'ivsc-css'; st.textContent = CSS; document.head.appendChild(st); }

  function itemHtml(it) {
    var nm = it.name || 'Someone';
    return '<div class="ivsc-item" style="--sc:' + tier(it.amount) + '"><div class="ivsc-band"><b>' + esc(nm) + '</b><span>' + money(it.amount) + '</span></div>' +
      (it.text ? '<div class="ivsc-txt">' + esc(it.text) + '</div>' : '') +
      (it.thanked ? '<div class="ivsc-thx"><i>♥</i> Thanked by Chance</div>' : '') + '</div>';
  }
  var items = [];
  function drawList() {
    var box = document.getElementById('ivsc-list'); if (!box) return;
    box.innerHTML = items.slice(0, 6).map(itemHtml).join('');
  }
  function loadList() {
    fetch(API + '/api/super/list?page=' + encodeURIComponent(page)).then(function (r) { return r.ok ? r.json() : { items: [] }; })
      .then(function (j) { items = j.items || []; drawList(); })['catch'](function () {});
  }

  function cardHtml() {
    var where = isHome ? 'in the Inner Circle chat' : 'here and in this episode’s Inner Circle room';
    return '<div class="ivsc-top"><div><span class="ivsc-eb">Super Chat</span><h3>' + (isHome ? 'Support InnerVerse' : 'Support this episode') + '</h3>' +
      '<p>Send Chance a Super Chat with a message. It shows ' + where + (isHome ? ', and here on the page' : '') + ', and he sees every one.</p></div>' +
      '<button type="button" class="ivsc-go">' + COIN + '<span>Send a Super Chat</span></button></div><div class="ivsc-list" id="ivsc-list"></div>';
  }

  var mounted = false;
  function mountEpisode() {
    var after = document.getElementById('ivml') ? document.querySelector('.ivml-room') || document.getElementById('ivml') : null;
    if (!after) after = document.querySelector('#iv-episode-root .iv-intro-text') || document.querySelector('.blog-item-content .iv-plus-intro') || document.querySelector('.blog-item-content .iv-plus-tuned-row');
    if (!after) return false;
    var card = document.createElement('section'); card.className = 'ivsc'; card.id = 'ivsc'; card.setAttribute('aria-label', 'Super Chat');
    card.innerHTML = cardHtml();
    after.parentElement.insertBefore(card, after.nextSibling);
    return true;
  }
  function mountHome() {
    var plus = document.getElementById('ivh-plus'); if (!plus) return false;
    var sec = document.createElement('section'); sec.className = 'ivh-sec'; sec.setAttribute('aria-label', 'Super Chat');
    sec.innerHTML = '<div class="ivsc-wrap"><div class="ivsc" id="ivsc">' + cardHtml() + '</div></div>';
    plus.parentElement.insertBefore(sec, plus.nextSibling);
    return true;
  }
  function tryMount() {
    if (mounted) return true;
    if (!(isHome ? mountHome() : mountEpisode())) return false;
    mounted = true; addCss();
    document.querySelector('#ivsc .ivsc-go').onclick = openSheet;
    loadList();
    return true;
  }

  // ---- the sheet
  var stripeJs = null;
  function loadStripe() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (stripeJs) return stripeJs;
    stripeJs = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://js.stripe.com/v3/'; s.onload = function () { ok(window.Stripe); }; s.onerror = function () { stripeJs = null; no(new Error('stripe')); }; document.head.appendChild(s); });
    return stripeJs;
  }
  function plusLine(c) {
    if (c >= 10000) return money(c) + ' covers a full year of Plus+ (' + money(10000) + '):';
    if (c >= 1800) return money(c) + ' covers about ' + Math.floor(c / 900) + ' months of Plus+ at $9 a month:';
    if (c >= 900) return money(c) + ' covers a month of Plus+ at $9:';
    return 'Plus+ is $9 a month, or try it free for 7 days:';
  }
  function post(url, body) {
    var h = { 'Content-Type': 'application/json' }; if (member()) h.Authorization = 'Bearer ' + token();
    return fetch(API + url, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }

  function openSheet() {
    var amt = 1000, custom = false, checkout = null, busy = false;
    var isMem = member(), mname = memberName();
    var scrim = document.createElement('div'); scrim.className = 'ivsc-scrim';
    scrim.innerHTML = '<div class="ivsc-sheet" role="dialog" aria-modal="true" aria-label="Super Chat">' +
      '<div class="ivsc-head">' + COIN + '<h2>Super Chat</h2><button type="button" class="ivsc-x" aria-label="Close">×</button></div>' +
      '<div class="ivsc-body" id="ivsc-form">' +
        '<div class="ivsc-amts">' + PRESETS.map(function (c) { return '<button type="button" data-amt="' + c + '" style="--sc:' + tier(c) + '">' + money(c) + '</button>'; }).join('') + '<button type="button" data-amt="custom" style="font-size:14px">Other</button></div>' +
        '<label class="ivsc-cust" hidden><span>$</span><input type="number" inputmode="decimal" min="3" max="500" step="1" placeholder="Any amount from 3 to 500" aria-label="Amount in dollars"></label>' +
        '<textarea class="ivsc-ta" maxlength="300" placeholder="Your message (optional)" aria-label="Your message"></textarea>' +
        (isMem ? '<p class="ivsc-note">Posting as <b>' + esc(mname || 'you') + '</b>, under your Inner Circle name.</p>' :
          '<div class="ivsc-lbl">Your name</div><input class="ivsc-in" maxlength="40" placeholder="Leave blank to send anonymously" aria-label="Your name (optional)" autocomplete="nickname">' +
          '<div class="ivsc-plus"><b>Or put it toward InnerVerse Plus+</b><p><span class="ivsc-pl"></span> full episodes first, the members’ audio feed, and a seat in the Inner Circle chat, where you can talk with Chance and the community anytime.</p>' +
          '<div class="ivsc-pbtns"><a href="' + PLUS.trial + '">Try 7 days free</a><a href="' + PLUS.month + '">$9 a month</a><a href="' + PLUS.year + '">$100 a year</a></div></div>') +
        '<button type="button" class="ivsc-send">Continue</button>' +
        '<p class="ivsc-fine">Paid securely through Stripe. Super Chats are tips to InnerVerse, not tax deductible, and not refundable once posted.</p>' +
      '</div>' +
      '<div class="ivsc-body" id="ivsc-paywrap" hidden><p class="ivsc-note" id="ivsc-paynote"></p><div class="ivsc-pay" id="ivsc-pay"></div></div>' +
    '</div>';
    document.body.appendChild(scrim);
    var $ = function (s) { return scrim.querySelector(s); };
    function close() { try { checkout && checkout.destroy(); } catch (e) {} scrim.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    $('.ivsc-x').onclick = close;
    function draw() {
      [].forEach.call(scrim.querySelectorAll('[data-amt]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.amt === 'custom' ? custom : !custom && Number(b.dataset.amt) === amt)); });
      var ok = amt >= 300 && amt <= 50000;
      $('.ivsc-send').disabled = !ok;
      $('.ivsc-send').textContent = ok ? 'Continue with ' + money(amt) : 'Pick an amount from $3 to $500';
      if ($('.ivsc-pl')) $('.ivsc-pl').textContent = plusLine(ok ? amt : 0);
    }
    [].forEach.call(scrim.querySelectorAll('[data-amt]'), function (b) {
      b.onclick = function () {
        custom = b.dataset.amt === 'custom';
        $('.ivsc-cust').hidden = !custom;
        if (custom) { $('.ivsc-cust input').focus(); amt = Math.round(Number($('.ivsc-cust input').value || 0) * 100); } else amt = Number(b.dataset.amt);
        draw();
      };
    });
    $('.ivsc-cust input').oninput = function () { amt = Math.round(Number(this.value || 0) * 100); draw(); };
    draw();

    function confirmPaid(sid, tries) {
      var n = 0;
      return new Promise(function (done) {
        (function go() {
          post('/api/super/web-confirm', { sid: sid }).then(function (j) {
            if (j && j.ok) return done(true);
            if (++n >= (tries || 8)) return done(false);
            setTimeout(go, 1500);
          })['catch'](function () { if (++n >= (tries || 8)) done(false); else setTimeout(go, 1500); });
        })();
      });
    }
    function finished(okPosted, name, text) {
      try { checkout && checkout.destroy(); } catch (e) {} checkout = null;
      items.unshift({ name: name, amount: amt, text: text, thanked: false }); drawList();
      $('#ivsc-paywrap').innerHTML = '<div class="ivsc-done"><span style="color:var(--gold,#D8AA3C)">' + COIN + '</span><h3>Thank you!</h3><p class="ivsc-note">' +
        (okPosted ? 'Your Super Chat is posted' : 'Your payment went through, and your Super Chat will appear in a moment') +
        (isHome ? ' in the Inner Circle chat.' : ' here and in the episode’s Inner Circle room.') + '</p>' +
        (isMem ? '' : '<div class="ivsc-plus" style="margin-top:14px;text-align:left"><b>Want to join the conversation?</b><p>Plus+ members talk with Chance and the community in the Inner Circle chat.</p><div class="ivsc-pbtns"><a href="' + PLUS.trial + '">Try 7 days free</a><a href="' + PLUS.month + '">$9 a month</a><a href="' + PLUS.year + '">$100 a year</a></div></div>') +
        '<button type="button" class="ivsc-send" style="width:100%;margin-top:14px">Done</button></div>';
      $('#ivsc-paywrap .ivsc-send').onclick = close;
    }
    $('.ivsc-send').onclick = function () {
      if (busy) return; busy = true;
      var btn = this; btn.disabled = true; btn.textContent = 'One moment…';
      var text = $('.ivsc-ta').value.trim();
      var name = isMem ? (mname || 'A member') : ($('.ivsc-in').value.trim());
      post('/api/super/web-start', { amount: amt, text: text, name: isMem ? '' : name, page: page }).then(function (j) {
        busy = false;
        if (!j || !j.sid) { alert((j && j.error) || 'Payment could not start. Please try again.'); draw(); return; }
        $('#ivsc-form').hidden = true; $('#ivsc-paywrap').hidden = false;
        $('#ivsc-paynote').textContent = money(amt) + ' Super Chat' + (name ? ' from ' + name : '') + (text ? ': “' + text.slice(0, 80) + (text.length > 80 ? '…' : '') + '”' : '');
        if (j.fake) { confirmPaid(j.sid, 1).then(function (ok) { finished(ok, name, text); }); return; }
        $('#ivsc-pay').innerHTML = '<p class="ivsc-note" style="padding:30px;text-align:center;color:#555">Loading the payment form…</p>';
        loadStripe().then(function (Stripe) {
          return Stripe(j.publishableKey).initEmbeddedCheckout({
            fetchClientSecret: function () { return Promise.resolve(j.clientSecret); },
            onComplete: function () { $('#ivsc-paynote').textContent = 'Paid. Posting your Super Chat…'; confirmPaid(j.sid).then(function (ok) { finished(ok, name, text); }); }
          });
        }).then(function (c) { checkout = c; $('#ivsc-pay').innerHTML = ''; c.mount('#ivsc-pay'); })
          ['catch'](function () { alert('The payment form did not load. Please try again.'); close(); });
      })['catch'](function () { busy = false; alert('Could not reach InnerVerse. Check your connection.'); draw(); });
    };
  }

  // the episode page and the home page draw themselves after load: wait for the spot, up to 20 seconds
  var tries = 0;
  (function wait() { if (tryMount() || ++tries > 80) return; setTimeout(wait, 250); })();
})();
